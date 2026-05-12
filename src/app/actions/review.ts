'use server'

import { createClient } from '@/lib/supabase/server'
import type { WordEntry, SkillScore, SkillType, PartOfSpeech } from '@/types/database'
import { getApplicableSkills } from '@/lib/vocab/skills'
import type { Question } from '@/lib/vocab/judge'
import type { JudgeResult } from '@/lib/vocab/judge'
import { getDisplayText, cleanWord } from '@/lib/vocab/display'

// ── Weighted random skill selection ──────────────────────────────

function selectSkillWeighted(skills: SkillScore[], applicableSkills: SkillType[]): SkillType {
  const eligible = skills.filter(s => applicableSkills.includes(s.skill_type))

  if (eligible.length === 0) return applicableSkills[0]

  const weights = eligible.map(s => 6 - s.score) // score 0→weight 6, score 5→weight 1
  const total = weights.reduce((a, b) => a + b, 0)
  let rand = Math.random() * total

  for (let i = 0; i < eligible.length; i++) {
    rand -= weights[i]
    if (rand <= 0) return eligible[i].skill_type
  }

  return eligible[eligible.length - 1].skill_type
}

// ── Generate one question for a word ─────────────────────────────

function generateReviewQuestion(
  entry: WordEntry,
  skillType: SkillType,
  allEntries: WordEntry[]
): Question {
  const pos = entry.part_of_speech as PartOfSpeech
  const clean = cleanWord(entry.word)
  const displayText = getDisplayText(entry)

  function shuffle<T>(arr: T[]): T[] {
    return [...arr].sort(() => Math.random() - 0.5)
  }

  function getDistractors(map: (e: WordEntry) => string): string[] {
    const same = allEntries.filter(e => e.id !== entry.id && e.part_of_speech === pos).map(map)
    const any = allEntries.filter(e => e.id !== entry.id).map(map)
    return shuffle([...same, ...any.filter(d => !same.includes(d))]).slice(0, 3)
  }

  switch (skillType) {
    case 'meaning': {
      const distractors = getDistractors(e => e.english_primary)
      return {
        id: crypto.randomUUID(),
        wordEntryId: entry.id,
        questionType: 'meaning_choice',
        skillType: 'meaning',
        prompt: displayText,
        expectedAnswer: entry.english_primary,
        options: shuffle([entry.english_primary, ...distractors]).slice(0, 4),
        displayText,
      }
    }

    case 'reverse': {
      const distractors = getDistractors(e => getDisplayText(e))
      return {
        id: crypto.randomUUID(),
        wordEntryId: entry.id,
        questionType: 'reverse_choice',
        skillType: 'reverse',
        prompt: entry.chinese_primary,
        expectedAnswer: displayText,
        options: shuffle([displayText, ...distractors]).slice(0, 4),
        displayText,
      }
    }

    case 'gender': {
      const wrongArticle = entry.article_indefinite === 'un' ? 'une' : 'un'
      return {
        id: crypto.randomUUID(),
        wordEntryId: entry.id,
        questionType: 'gender_quiz',
        skillType: 'gender',
        prompt: `Quel est le genre de "${clean}" ?`,
        expectedAnswer: `${entry.article_indefinite} ${clean}`,
        options: shuffle([
          `${entry.article_indefinite} ${clean}`,
          `${wrongArticle} ${clean}`,
        ]),
        displayText,
      }
    }

    case 'form': {
      return {
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
        displayText,
      }
    }

    case 'spelling': {
      const spellTarget = pos === 'noun' && entry.article_indefinite
        ? `${entry.article_indefinite} ${clean}`
        : pos === 'verb'
        ? entry.infinitive || clean
        : clean
      return {
        id: crypto.randomUUID(),
        wordEntryId: entry.id,
        questionType: 'spelling',
        skillType: 'spelling',
        prompt: `${entry.english_primary} · ${entry.chinese_primary}`,
        expectedAnswer: spellTarget,
        displayText,
      }
    }

    case 'listening': {
      const listenTarget = pos === 'noun' && entry.article_indefinite
        ? `${entry.article_indefinite} ${clean}`
        : pos === 'verb'
        ? entry.infinitive || clean
        : clean
      return {
        id: crypto.randomUUID(),
        wordEntryId: entry.id,
        questionType: 'dictation',
        skillType: 'listening',
        prompt: listenTarget,
        expectedAnswer: listenTarget,
        displayText,
      }
    }

    default:
      return {
        id: crypto.randomUUID(),
        wordEntryId: entry.id,
        questionType: 'meaning_choice',
        skillType: 'meaning',
        prompt: displayText,
        expectedAnswer: entry.english_primary,
        displayText,
      }
  }
}

// ── Review session item ───────────────────────────────────────────

export interface ReviewSessionItem {
  entry: WordEntry
  question: Question
  skillScores: SkillScore[]
}

// ── Load review session ───────────────────────────────────────────

export async function loadReviewSession() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, items: [] as ReviewSessionItem[] }

  const d = new Date()
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

  // Fetch settings for daily limit
  const { data: settings } = await supabase
    .from('app_settings')
    .select('daily_review_limit')
    .eq('user_id', user.id)
    .single()

  const limit = settings?.daily_review_limit ?? 30

  // Fetch due words: weak first, then review, then mastered
  const { data: states } = await supabase
    .from('learning_states')
    .select('*')
    .eq('user_id', user.id)
    .in('status', ['weak', 'review', 'mastered'])
    .lte('next_review_at', today)
    .order('status') // weak < review < mastered alphabetically doesn't work perfectly
    .limit(limit * 2)

  if (!states || states.length === 0) {
    return { success: true, items: [] as ReviewSessionItem[] }
  }

  // Sort: weak → review → mastered
  const statusOrder: Record<string, number> = { weak: 0, review: 1, mastered: 2 }
  const sorted = [...states].sort((a, b) => {
    const orderDiff = (statusOrder[a.status] ?? 1) - (statusOrder[b.status] ?? 1)
    if (orderDiff !== 0) return orderDiff
    return (a.next_review_at ?? '').localeCompare(b.next_review_at ?? '')
  }).slice(0, limit)

  const wordIds = sorted.map(s => s.word_entry_id)

  // Fetch word entries
  const { data: entries } = await supabase
    .from('word_entries')
    .select('*')
    .in('id', wordIds)
    .eq('user_id', user.id)

  // Fetch skill scores
  const { data: allSkills } = await supabase
    .from('skill_scores')
    .select('*')
    .in('word_entry_id', wordIds)
    .eq('user_id', user.id)

  // Fetch all entries for distractors
  const { data: allEntries } = await supabase
    .from('word_entries')
    .select('*')
    .eq('user_id', user.id)
    .is('archived_at', null)

  if (!entries) return { success: true, items: [] as ReviewSessionItem[] }

  const entryMap = new Map(entries.map(e => [e.id, e]))
  const skillMap = new Map<string, SkillScore[]>()
  for (const skill of allSkills ?? []) {
    if (!skillMap.has(skill.word_entry_id)) skillMap.set(skill.word_entry_id, [])
    skillMap.get(skill.word_entry_id)!.push(skill)
  }

  const items: ReviewSessionItem[] = sorted
    .map(state => {
      const entry = entryMap.get(state.word_entry_id)
      if (!entry) return null

      const skills = skillMap.get(entry.id) ?? []
      const applicable = getApplicableSkills(entry.part_of_speech as PartOfSpeech)
      const selectedSkill = selectSkillWeighted(skills, applicable)
      const question = generateReviewQuestion(entry, selectedSkill, allEntries ?? [])

      return { entry, question, skillScores: skills }
    })
    .filter(Boolean) as ReviewSessionItem[]

  return { success: true, items }
}

// ── Submit review answer ──────────────────────────────────────────
export async function submitReviewAnswer(
  question: Question,
  userAnswer: string,
  entry: WordEntry,
  judgeResult: JudgeResult
) {
  // judgeResult 已经是判断好的结果，直接写入即可
  // 重音严格度在客户端调用 judgeAnswer 时传入
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from('review_logs').insert({
    user_id: user.id,
    word_entry_id: entry.id,
    session_type: 'review',
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

  await updateLearningStateAfterReview(entry.id, user.id, judgeResult.result, supabase)
}
// export async function submitReviewAnswer(
//   question: Question,
//   userAnswer: string,
//   entry: WordEntry,
//   judgeResult: JudgeResult
// ) {
//   const supabase = await createClient()
//   const { data: { user } } = await supabase.auth.getUser()
//   if (!user) return

//   // Write review log
//   await supabase.from('review_logs').insert({
//     user_id: user.id,
//     word_entry_id: entry.id,
//     session_type: 'review',
//     question_type: question.questionType,
//     skill_type: question.skillType,
//     prompt: question.prompt,
//     expected_answer: question.expectedAnswer,
//     user_answer: userAnswer,
//     options: question.options ?? [],
//     result: judgeResult.result,
//     was_correct: judgeResult.result === 'correct',
//     was_partial: judgeResult.result === 'partial',
//   })

//   // Update skill scores
//   for (const update of judgeResult.skillUpdates) {
//     const { data: existing } = await supabase
//       .from('skill_scores')
//       .select('*')
//       .eq('word_entry_id', entry.id)
//       .eq('skill_type', update.skillType)
//       .eq('user_id', user.id)
//       .single()

//     if (existing) {
//       const newScore = Math.min(5, Math.max(0, existing.score + update.delta))
//       await supabase
//         .from('skill_scores')
//         .update({
//           score: newScore,
//           correct_count: update.delta > 0 ? existing.correct_count + 1 : existing.correct_count,
//           wrong_count: update.delta < 0 ? existing.wrong_count + 1 : existing.wrong_count,
//           last_practiced_at: new Date().toISOString(),
//           updated_at: new Date().toISOString(),
//         })
//         .eq('id', existing.id)
//     }
//   }

//   // Update learning state
//   await updateLearningStateAfterReview(entry.id, user.id, judgeResult.result, supabase)
// }

// ── Update learning state ─────────────────────────────────────────

const REVIEW_INTERVALS: Record<number, number> = {
  0: 1, 1: 2, 2: 4, 3: 7, 4: 14, 5: 30,
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function updateLearningStateAfterReview(
  wordEntryId: string,
  userId: string,
  result: 'correct' | 'partial' | 'wrong',
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any
) {
  const { data: state } = await supabase
    .from('learning_states')
    .select('*')
    .eq('word_entry_id', wordEntryId)
    .eq('user_id', userId)
    .single()

  if (!state) return

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]

  // Fetch recent review logs to detect consecutive wrongs
  const { data: recentLogs } = await supabase
    .from('review_logs')
    .select('result')
    .eq('word_entry_id', wordEntryId)
    .eq('user_id', userId)
    .eq('session_type', 'review')
    .order('created_at', { ascending: false })
    .limit(3)

  const consecutiveWrongs = (() => {
    let count = 0
    for (const log of recentLogs ?? []) {
      if (log.result === 'wrong') count++
      else break
    }
    return count
  })()

  if (result === 'correct') {
    const newLevel = Math.min(5, state.overall_level + 1)
    const intervalDays = REVIEW_INTERVALS[newLevel] ?? 1
    const nextReview = new Date()
    nextReview.setDate(nextReview.getDate() + intervalDays)

    // Check mastered condition
    const { data: skills } = await supabase
      .from('skill_scores')
      .select('score')
      .eq('word_entry_id', wordEntryId)
      .eq('user_id', userId)

    const allSkillsStrong = skills?.every((s: SkillScore) => s.score >= 4) ?? false
    const newStatus = newLevel >= 5 && allSkillsStrong ? 'mastered' :
      state.status === 'weak' ? 'review' : state.status

    await supabase
      .from('learning_states')
      .update({
        overall_level: newLevel,
        status: newStatus,
        next_review_at: nextReview.toISOString().split('T')[0],
        last_reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', state.id)

  } else if (result === 'wrong') {
    const newLevel = Math.max(0, state.overall_level - 1)

    // Become weak if 2 consecutive wrongs
    const newStatus = consecutiveWrongs >= 1 ? 'weak' :
      state.status === 'mastered' ? 'review' : state.status

    await supabase
      .from('learning_states')
      .update({
        overall_level: newLevel,
        status: newStatus,
        next_review_at: tomorrowStr,
        last_reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', state.id)

  } else {
    // Partial: level unchanged, review tomorrow
    await supabase
      .from('learning_states')
      .update({
        next_review_at: tomorrowStr,
        last_reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', state.id)
  }
}