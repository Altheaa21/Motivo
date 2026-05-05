'use server'

import { createClient } from '@/lib/supabase/server'

export async function getSettings() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('app_settings')
    .select('*')
    .eq('user_id', user.id)
    .single()

  return data
}

export async function updateSettings(updates: {
  daily_new_word_limit?: number
  daily_review_limit?: number
  tts_language?: string
  tts_rate?: number
  tts_enabled?: boolean
  accent_strictness?: 'lenient' | 'strict'
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false }

  const { error } = await supabase
    .from('app_settings')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('user_id', user.id)

  return { success: !error }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
}

export async function exportFullBackup() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [
    { data: wordEntries },
    { data: learningStates },
    { data: skillScores },
    { data: reviewLogs },
    { data: importBatches },
    { data: importItems },
    { data: appSettings },
    { data: profile },
  ] = await Promise.all([
    supabase.from('word_entries').select('*').eq('user_id', user.id),
    supabase.from('learning_states').select('*').eq('user_id', user.id),
    supabase.from('skill_scores').select('*').eq('user_id', user.id),
    supabase.from('review_logs').select('*').eq('user_id', user.id),
    supabase.from('import_batches').select('*').eq('user_id', user.id),
    supabase.from('import_items').select('*').eq('user_id', user.id),
    supabase.from('app_settings').select('*').eq('user_id', user.id).single(),
    supabase.from('profiles').select('email').eq('id', user.id).single(),
  ])

  return {
    backupVersion: '1.0',
    app: 'french-vocabulary-app',
    language: 'fr',
    exportedAt: new Date().toISOString(),
    user: { email: profile?.email ?? '' },
    data: {
      word_entries: wordEntries ?? [],
      learning_states: learningStates ?? [],
      skill_scores: skillScores ?? [],
      review_logs: reviewLogs ?? [],
      import_batches: importBatches ?? [],
      import_items: importItems ?? [],
      app_settings: appSettings ?? {},
    },
  }
}

export async function exportVocabularyOnly() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: entries } = await supabase
    .from('word_entries')
    .select('*')
    .eq('user_id', user.id)
    .is('archived_at', null)
    .order('created_at')

  if (!entries) return null

  // Convert to Import JSON Schema v1 format
  const importEntries = entries.map(e => {
    const base = {
      word: e.word,
      displayText: e.display_text,
      partOfSpeech: e.part_of_speech,
      english: {
        primary: e.english_primary,
        alternatives: e.english_alternatives ?? [],
      },
      chinese: {
        primary: e.chinese_primary,
        alternatives: e.chinese_alternatives ?? [],
      },
      ipa: e.ipa ?? '',
      notes: e.notes ?? '',
      tags: e.tags ?? [],
      examples: e.examples ?? [],
    }

    if (e.part_of_speech === 'noun') {
      return {
        ...base,
        articleIndefinite: e.article_indefinite,
        articleDefinite: e.article_definite,
        gender: e.gender,
        pluralForm: e.plural_form,
      }
    }
    if (e.part_of_speech === 'verb') {
      return { ...base, infinitive: e.infinitive }
    }
    if (e.part_of_speech === 'adjective') {
      return {
        ...base,
        forms: {
          masculineSingular: e.masculine_singular,
          feminineSingular: e.feminine_singular,
          masculinePlural: e.masculine_plural,
          femininePlural: e.feminine_plural,
          sameGenderForm: e.same_gender_form,
        },
      }
    }
    if (['adverb', 'preposition', 'conjunction'].includes(e.part_of_speech)) {
      return { ...base, isInvariable: e.is_invariable }
    }
    return base
  })

  return {
    exportVersion: '1.0',
    type: 'vocabulary_export',
    language: 'fr',
    exportedAt: new Date().toISOString(),
    entries: importEntries,
  }
}