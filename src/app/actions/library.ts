'use server'

import { createClient } from '@/lib/supabase/server'
import type { PartOfSpeech } from '@/types/database'
import { getApplicableSkills } from '@/lib/vocab/skills'
import { generateCanonicalKey } from '@/lib/vocab/canonical'

export interface WordEntryUpdate {
  word?: string
  display_text?: string
  english_primary?: string
  english_alternatives?: string[]
  chinese_primary?: string
  chinese_alternatives?: string[]
  ipa?: string
  notes?: string
  tags?: string[]
  examples?: { fr: string; en: string; zh: string }[]
  // noun
  article_indefinite?: string
  article_definite?: string
  gender?: string
  plural_form?: string
  // verb
  infinitive?: string
  // adjective
  masculine_singular?: string
  feminine_singular?: string
  masculine_plural?: string
  feminine_plural?: string
  same_gender_form?: boolean
  // invariable
  is_invariable?: boolean
}

export async function updateWordEntry(id: string, updates: WordEntryUpdate) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  // Regenerate canonical key if word or POS changed
  const { data: existing } = await supabase
    .from('word_entries')
    .select('word, part_of_speech')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!existing) return { success: false, error: 'Word not found' }

  const newWord = updates.word ?? existing.word
  const canonicalKey = generateCanonicalKey(newWord, existing.part_of_speech)

  const { error } = await supabase
    .from('word_entries')
    .update({
      ...updates,
      canonical_key: canonicalKey,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', user.id)

  return { success: !error, error: error?.message }
}

export async function archiveWordEntry(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false }

  const { error } = await supabase
    .from('word_entries')
    .update({
      archived_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', user.id)

  // Also update learning state to archived
  await supabase
    .from('learning_states')
    .update({
      status: 'archived',
      updated_at: new Date().toISOString(),
    })
    .eq('word_entry_id', id)
    .eq('user_id', user.id)

  return { success: !error }
}

export async function completeIncompleteEntry(
  id: string,
  updates: WordEntryUpdate
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { data: existing } = await supabase
    .from('word_entries')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!existing) return { success: false, error: 'Word not found' }

  const newWord = updates.word ?? existing.word
  const canonicalKey = generateCanonicalKey(newWord, existing.part_of_speech)
  const d = new Date()
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

  // Update word entry — mark as complete
  const { error: entryError } = await supabase
    .from('word_entries')
    .update({
      ...updates,
      canonical_key: canonicalKey,
      is_incomplete: false,
      incomplete_reasons: [],
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', user.id)

  if (entryError) return { success: false, error: entryError.message }

  // Update learning state to new
  await supabase
    .from('learning_states')
    .update({
      status: 'new',
      new_training_status: 'not_started',
      show_after: today,
      updated_at: new Date().toISOString(),
    })
    .eq('word_entry_id', id)
    .eq('user_id', user.id)

  // Create skill scores
  const pos = existing.part_of_speech as PartOfSpeech
  const skills = getApplicableSkills(pos)
  const skillRows = skills.map(skill => ({
    user_id: user.id,
    word_entry_id: id,
    skill_type: skill,
    score: 0,
  }))

  await supabase
    .from('skill_scores')
    .upsert(skillRows, { onConflict: 'user_id,word_entry_id,skill_type', ignoreDuplicates: true })

  return { success: true }
}