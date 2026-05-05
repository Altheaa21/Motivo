'use server'

import { createClient } from '@/lib/supabase/server'
import type { WordEntry, SkillType, PartOfSpeech } from '@/types/database'
import { getApplicableSkills } from '@/lib/vocab/skills'
import type { Question, SessionWord, JudgeResult } from '@/lib/vocab/judge'

// export type { Question, SessionWord, JudgeResult }

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5)
}

function generateQuestionsForWord(
  entry: WordEntry,
  allEntries: WordEntry[]
): Question[] {
  const pos = entry.part_of_speech as PartOfSpeech
  const questions: Question[] = []

  const meaningDistractors = allEntries
    .filter(e => e.id !== entry.id && e.part_of_speech === pos)
    .slice(0, 3)
    .map(e => e.english_primary)

  questions.push({
    id: crypto.randomUUID(),
    wordEntryId: entry.id,
    questionType: 'meaning_choice',
    skillType: 'meaning',
    prompt: entry.display_text,
    expectedAnswer: entry.english_primary,
    options: shuffle([entry.english_primary, ...meaningDistractors]).slice(0, 4),
    displayText: entry.display_text,
  })

  const reverseDistractors = allEntries
    .filter(e => e.id !== entry.id && e.part_of_speech === pos)
    .slice(0, 3)
    .map(e => e.display_text)

  questions.push({
    id: crypto.randomUUID(),
    wordEntryId: entry.id,
    questionType: 'reverse_choice',
    skillType: 'reverse',
    prompt: entry.english_primary,
    expectedAnswer: entry.display_text,
    options: shuffle([entry.display_text, ...reverseDistractors]).slice(0, 4),
    displayText: entry.display_text,
  })

  if (pos === 'noun' && entry.article_indefinite) {
    const wrongArticle = entry.article_indefinite === 'un' ? 'une' : 'un'
    questions.push({
      id: crypto.randomUUID(),
      wordEntryId: entry.id,
      questionType: 'gender_quiz',
      skillType: 'gender',
      prompt: `Quel est le genre de "${entry.word}" ?`,
      expectedAnswer: `${entry.article_indefinite} ${entry.word}`,
      options: shuffle([
        `${entry.article_indefinite} ${entry.word}`,
        `${wrongArticle} ${entry.word}`,
      ]),
      displayText: entry.display_text,
    })
  }

  if (pos === 'adjective' && entry.feminine_singular && !entry.same_gender_form) {
    questions.push({
      id: crypto.randomUUID(),
      wordEntryId: entry.id,
      questionType: 'form_quiz',
      skillType: 'form',
      prompt: `Forme féminine de "${entry.masculine_singular}" ?`,
      expectedAnswer: entry.feminine_singular,
      options: shuffle([
        entry.feminine_singular,
        entry.masculine_singular,
        entry.feminine_plural ?? entry.feminine_singular + 's',
        entry.masculine_plural ?? entry.masculine_singular + 's',
      ]).slice(0, 4),
      displayText: entry.display_text,
    })
  }

  const spellTarget = pos === 'noun' && entry.article_indefinite
    ? `${entry.article_indefinite} ${entry.word}`
    : pos === 'verb'
    ? entry.infinitive || entry.word
    : entry.word

  questions.push({
    id: crypto.randomUUID(),
    wordEntryId: entry.id,
    questionType: 'spelling',
    skillType: 'spelling',
    prompt: `${entry.english_primary} · ${entry.chinese_primary}`,
    expectedAnswer: spellTarget,
    displayText: entry.display_text,
  })

  return questions
}

export async function loadPracticeSession() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, words: [] as SessionWord[] }

  const { data: queuedStates } = await supabase
    .from('learning_states')
    .select('word_entry_id')
    .eq('user_id', user.id)
    .in('new_training_status', ['queued', 'in_progress'])

  if (!queuedStates || queuedStates.length === 0) {
    return { success: true, words: [] as SessionWord[] }
  }

  const wordIds = queuedStates.map(s => s.word_entry_id)

  const { data: entries } = await supabase
    .from('word_entries')
    .select('*')
    .in('id', wordIds)
    .eq('user_id', user.id)

  if (!entries) return { success: true, words: [] as SessionWord[] }

  const { data: allEntries } = await supabase
    .from('word_entries')
    .select('*')
    .eq('user_id', user.id)
    .is('archived_at', null)

  await supabase
    .from('learning_states')
    .update({ new_training_status: 'in_progress', updated_at: new Date().toISOString() })
    .in('word_entry_id', wordIds)
    .eq('user_id', user.id)

  const words: SessionWord[] = entries.map(entry => ({
    entry,
    questions: generateQuestionsForWord(entry, allEntries ?? []),
    attemptCount: 0,
    correctCount: 0,
    wrongCount: 0,
    passed: null,
  }))

  return { success: true, words }
}

export async function submitAnswer(
  question: Question,
  userAnswer: string,
  entry: WordEntry,
  judgeResult: JudgeResult
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from('review_logs').insert({
    user_id: user.id,
    word_entry_id: entry.id,
    session_type: 'new_practice',
    question_type: question.questionType,
    skill_type: question.skillType,
    prompt: question.prompt,
    expected_answer: question.expectedAnswer,
    user_answer: userAnswer,
    options: question.options ?? [],
    result: judgeResult.result,
    was_correct: judgeResult.result === 'correct',
    was_partial: judgeResult.result === 'partial',
  })

  for (const update of judgeResult.skillUpdates) {
    const { data: existing } = await supabase
      .from('skill_scores')
      .select('*')
      .eq('word_entry_id', entry.id)
      .eq('skill_type', update.skillType)
      .eq('user_id', user.id)
      .single()

    if (existing) {
      const newScore = Math.min(5, Math.max(0, existing.score + update.delta))
      await supabase
        .from('skill_scores')
        .update({
          score: newScore,
          correct_count: update.delta > 0 ? existing.correct_count + 1 : existing.correct_count,
          wrong_count: update.delta < 0 ? existing.wrong_count + 1 : existing.wrong_count,
          last_practiced_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
    }
  }

  const { data: state } = await supabase
    .from('learning_states')
    .select('*')
    .eq('word_entry_id', entry.id)
    .eq('user_id', user.id)
    .single()

  if (state) {
    await supabase
      .from('learning_states')
      .update({
        new_training_attempt_count: state.new_training_attempt_count + 1,
        new_training_correct_count:
          judgeResult.result === 'correct'
            ? state.new_training_correct_count + 1
            : state.new_training_correct_count,
        new_training_wrong_count:
          judgeResult.result === 'wrong'
            ? state.new_training_wrong_count + 1
            : state.new_training_wrong_count,
        updated_at: new Date().toISOString(),
      })
      .eq('id', state.id)
  }
}

export async function finalizeWord(
  entry: WordEntry,
  correctCount: number,
  attemptCount: number,
  hasGenderCorrect: boolean,
  hasSpellingAttempt: boolean
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const correctRate = attemptCount > 0 ? correctCount / attemptCount : 0
  const pos = entry.part_of_speech as PartOfSpeech

  let passed = false
  if (pos === 'noun') {
    passed = attemptCount >= 4 && correctRate >= 0.7 && hasGenderCorrect && hasSpellingAttempt
  } else if (pos === 'adjective') {
    passed = attemptCount >= 4 && correctRate >= 0.7 && hasSpellingAttempt
  } else {
    passed = attemptCount >= 3 && correctRate >= 0.7 && hasSpellingAttempt
  }

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]

  if (passed) {
    await supabase
      .from('learning_states')
      .update({
        status: 'review',
        new_training_status: 'completed',
        overall_level: 0,
        next_review_at: tomorrowStr,
        last_reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('word_entry_id', entry.id)
      .eq('user_id', user.id)
  } else {
    await supabase
      .from('learning_states')
      .update({
        status: 'learning',
        new_training_status: 'needs_more_practice',
        show_after: tomorrowStr,
        updated_at: new Date().toISOString(),
      })
      .eq('word_entry_id', entry.id)
      .eq('user_id', user.id)
  }

  return passed
}