'use server'

import { createClient } from '@/lib/supabase/server'
import { parseImportJson, validateAndNormalizeAll } from '@/lib/import/validate'
import { classifyAll, summarizeClassification } from '@/lib/import/classify'
import type { ClassifiedEntry } from '@/lib/import/classify'
import type { WordEntry } from '@/types/database'
import { generateCanonicalKey } from '@/lib/vocab/canonical'
import { getApplicableSkills } from '@/lib/vocab/skills'

// ── Step 1: Parse + classify (no DB write yet) ────────────────────

export async function previewImport(rawJson: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  // Parse
  const parseResult = parseImportJson(rawJson)
  if (!parseResult.success || !parseResult.data) {
    return { success: false, error: parseResult.error }
  }

  // Validate + normalize
  const { normalized } = validateAndNormalizeAll(parseResult.data)

  // Fetch existing entries for duplicate detection
  const { data: existingEntries, error: fetchError } = await supabase
    .from('word_entries')
    .select('*')
    .eq('user_id', user.id)
    .is('archived_at', null)

  if (fetchError) {
    return { success: false, error: 'Failed to fetch existing vocabulary.' }
  }

  // Classify
  const classified = classifyAll(normalized, (existingEntries ?? []) as WordEntry[])
  const summary = summarizeClassification(classified)

  // Create import_batch
  const { data: batch, error: batchError } = await supabase
    .from('import_batches')
    .insert({
      user_id: user.id,
      schema_version: parseResult.data.schemaVersion,
      language: parseResult.data.language,
      source_type: 'paste_json',
      source_title: parseResult.data.source?.title ?? '',
      source_notes: parseResult.data.source?.notes ?? '',
      raw_json_snapshot: parseResult.data,
      total_entries: summary.total,
      new_count: summary.newCount,
      exact_duplicate_count: summary.exactDuplicateCount,
      possible_duplicate_count: summary.possibleDuplicateCount,
      conflict_count: summary.conflictCount,
      incomplete_count: summary.incompleteCount,
      status: 'preview',
    })
    .select()
    .single()

  if (batchError || !batch) {
    return { success: false, error: 'Failed to create import batch.' }
  }

  // Create import_items
  const items = classified.map(c => ({
    user_id: user.id,
    import_batch_id: batch.id,
    raw_entry: c.normalized.raw,
    normalized_entry: {
      word: c.normalized.word,
      displayText: c.normalized.displayText,
      partOfSpeech: c.normalized.partOfSpeech,
      englishPrimary: c.normalized.englishPrimary,
      chinesePrimary: c.normalized.chinesePrimary,
      canonicalKey: c.normalized.canonicalKey,
    },
    detected_status: c.detectedStatus,
    matched_word_entry_id: c.matchedWordEntry?.id ?? null,
    recommended_action: c.recommendedAction,
    issues: c.issues,
  }))

  const { error: itemsError } = await supabase
    .from('import_items')
    .insert(items)

  if (itemsError) {
    return { success: false, error: 'Failed to create import items.' }
  }

  return {
    success: true,
    batchId: batch.id,
    summary,
  }
}

// ── Step 2: Apply import actions ──────────────────────────────────

export interface ItemAction {
  itemId: string
  action: 'add' | 'skip' | 'merge' | 'add_as_new' | 'import_as_incomplete'
}

export async function applyImport(batchId: string, actions: ItemAction[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  // Fetch items
  const { data: items, error: itemsError } = await supabase
    .from('import_items')
    .select('*')
    .eq('import_batch_id', batchId)
    .eq('user_id', user.id)

  if (itemsError || !items) {
    return { success: false, error: 'Failed to fetch import items.' }
  }

  const actionMap = new Map(actions.map(a => [a.itemId, a.action]))

  let addedCount = 0
  let mergedCount = 0
  let skippedCount = 0

  for (const item of items) {
    const action = actionMap.get(item.id) ?? item.recommended_action
    const rawEntry = item.raw_entry as Record<string, unknown>
    const english = rawEntry.english as Record<string, unknown>
    const chinese = rawEntry.chinese as Record<string, unknown>

    if (action === 'skip') {
      await supabase
        .from('import_items')
        .update({ final_action: 'skipped', resolved_at: new Date().toISOString() })
        .eq('id', item.id)
      skippedCount++
      continue
    }

    if (action === 'merge' && item.matched_word_entry_id) {
      await mergeEntry(supabase, item.matched_word_entry_id, rawEntry)
      await supabase
        .from('import_items')
        .update({
          final_action: 'merged',
          merged_into_word_entry_id: item.matched_word_entry_id,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', item.id)
      mergedCount++
      continue
    }

    // add / add_as_new / import_as_incomplete
    const isIncomplete = action === 'import_as_incomplete'
    const pos = rawEntry.partOfSpeech as string
    const word = rawEntry.word as string
    const canonicalKey = generateCanonicalKey(word, pos)

    const wordEntryData = buildWordEntryData(user.id, rawEntry, english, chinese, canonicalKey, isIncomplete)

    const { data: newEntry, error: entryError } = await supabase
      .from('word_entries')
      .insert(wordEntryData)
      .select()
      .single()

    if (entryError || !newEntry) {
      console.error('Failed to insert word entry:', entryError)
      continue
    }

    // Create learning_state
    await supabase.from('learning_states').insert({
      user_id: user.id,
      word_entry_id: newEntry.id,
      status: isIncomplete ? 'incomplete' : 'new',
      new_training_status: 'not_started',
      show_after: new Date().toISOString().split('T')[0],
      overall_level: 0,
    })

    // Create skill_scores (only if not incomplete)
    if (!isIncomplete) {
      const skills = getApplicableSkills(pos as import('@/types/database').PartOfSpeech)
      const skillRows = skills.map(skill => ({
        user_id: user.id,
        word_entry_id: newEntry.id,
        skill_type: skill,
        score: 0,
      }))
      await supabase.from('skill_scores').insert(skillRows)
    }

    await supabase
      .from('import_items')
      .update({
        final_action: isIncomplete ? 'imported_as_incomplete' : 'added',
        created_word_entry_id: newEntry.id,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', item.id)

    addedCount++
  }

  // Mark batch complete
  await supabase
    .from('import_batches')
    .update({
      status: 'completed',
      added_count: addedCount,
      merged_count: mergedCount,
      skipped_count: skippedCount,
      completed_at: new Date().toISOString(),
    })
    .eq('id', batchId)

  return { success: true, addedCount, mergedCount, skippedCount }
}

// ── Helpers ───────────────────────────────────────────────────────

function buildWordEntryData(
  userId: string,
  rawEntry: Record<string, unknown>,
  english: Record<string, unknown>,
  chinese: Record<string, unknown>,
  canonicalKey: string,
  isIncomplete: boolean
) {
  const pos = rawEntry.partOfSpeech as string
  const forms = rawEntry.forms as Record<string, unknown> | undefined

  return {
    user_id: userId,
    word: rawEntry.word as string,
    display_text: rawEntry.displayText as string,
    part_of_speech: pos,
    english_primary: english.primary as string,
    english_alternatives: (english.alternatives as string[]) ?? [],
    chinese_primary: chinese.primary as string,
    chinese_alternatives: (chinese.alternatives as string[]) ?? [],
    ipa: (rawEntry.ipa as string) ?? '',
    notes: (rawEntry.notes as string) ?? '',
    tags: (rawEntry.tags as string[]) ?? [],
    examples: (rawEntry.examples as object[]) ?? [],
    // noun
    article_indefinite: (rawEntry.articleIndefinite as string) ?? '',
    article_definite: (rawEntry.articleDefinite as string) ?? '',
    gender: (rawEntry.gender as string) ?? '',
    plural_form: (rawEntry.pluralForm as string) ?? '',
    // verb
    infinitive: (rawEntry.infinitive as string) ?? '',
    // adjective
    masculine_singular: (forms?.masculineSingular as string) ?? '',
    feminine_singular: (forms?.feminineSingular as string) ?? '',
    masculine_plural: (forms?.masculinePlural as string) ?? '',
    feminine_plural: (forms?.femininePlural as string) ?? '',
    same_gender_form: (forms?.sameGenderForm as boolean) ?? false,
    // invariable
    is_invariable: (rawEntry.isInvariable as boolean) ?? false,
    canonical_key: canonicalKey,
    is_incomplete: isIncomplete,
    incomplete_reasons: isIncomplete
      ? ((rawEntry._incompleteReasons as string[]) ?? [])
      : [],
  }
}

async function mergeEntry(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  existingId: string,
  rawEntry: Record<string, unknown>
) {
  const english = rawEntry.english as Record<string, unknown>
  const chinese = rawEntry.chinese as Record<string, unknown>

  const { data: existing } = await supabase
    .from('word_entries')
    .select('*')
    .eq('id', existingId)
    .single()

  if (!existing) return

  const updates: Record<string, unknown> = {}

  // Auto-fill empty fields
  if (!existing.ipa && rawEntry.ipa) updates.ipa = rawEntry.ipa
  if (!existing.notes && rawEntry.notes) updates.notes = rawEntry.notes

  // Merge arrays
  const newAltEn = (english.alternatives as string[]) ?? []
  const mergedAltEn = Array.from(new Set([...existing.english_alternatives, ...newAltEn]))
  if (mergedAltEn.length > existing.english_alternatives.length) {
    updates.english_alternatives = mergedAltEn
  }

  const newAltZh = (chinese.alternatives as string[]) ?? []
  const mergedAltZh = Array.from(new Set([...existing.chinese_alternatives, ...newAltZh]))
  if (mergedAltZh.length > existing.chinese_alternatives.length) {
    updates.chinese_alternatives = mergedAltZh
  }

  // Merge examples (dedupe by fr sentence)
  const newExamples = (rawEntry.examples as Array<{ fr: string }>) ?? []
  const existingFr = new Set(existing.examples.map((e: { fr: string }) => e.fr))
  const newUniqueExamples = newExamples.filter(e => !existingFr.has(e.fr))
  if (newUniqueExamples.length > 0) {
    updates.examples = [...existing.examples, ...newUniqueExamples]
  }

  if (Object.keys(updates).length > 0) {
    updates.updated_at = new Date().toISOString()
    await supabase.from('word_entries').update(updates).eq('id', existingId)
  }
}