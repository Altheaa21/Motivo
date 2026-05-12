'use server'

import { createClient } from '@/lib/supabase/server'
import type { WordEntry, SkillType } from '@/types/database'
import type { Question, JudgeResult } from '@/lib/vocab/judge'
import { getApplicableSkills } from '@/lib/vocab/skills'
import { getLocalDateStr } from '@/lib/utils'
import { getDisplayText, cleanWord } from '@/lib/vocab/display'

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5)
}

export interface PracticeQuestion {
  question: Question
  entry: WordEntry
}

// 生成选择题选项
function makeOptions(correct: string, allEntries: WordEntry[], mapper: (e: WordEntry) => string): string[] {
  const distractors = shuffle(allEntries)
    .map(mapper)
    .filter(v => v && v !== correct)
    .slice(0, 3)
  return shuffle([correct, ...distractors]).slice(0, 4)
}

// 给一个词生成一道题（按技能）
// function generateQuestion(
//   entry: WordEntry,
//   skillType: SkillType,
//   allEntries: WordEntry[]
// ): Question | null {
//   const id = crypto.randomUUID()

//   switch (skillType) {
//     case 'meaning':
//       return {
//         id, wordEntryId: entry.id,
//         questionType: 'meaning_choice',
//         skillType: 'meaning',
//         prompt: entry.display_text,
//         expectedAnswer: entry.english_primary,
//         options: makeOptions(entry.english_primary, allEntries, e => e.english_primary),
//         displayText: entry.display_text,
//       }

//     case 'reverse':
//       return {
//         id, wordEntryId: entry.id,
//         questionType: 'reverse_choice',
//         skillType: 'reverse',
//         prompt: `${entry.chinese_primary}`,
//         expectedAnswer: entry.display_text,
//         options: makeOptions(entry.display_text, allEntries, e => e.display_text),
//         displayText: entry.display_text,
//       }

//     case 'gender':
//       if (entry.part_of_speech !== 'noun' || !entry.article_indefinite) return null
//       const wrongArticle = entry.article_indefinite === 'un' ? 'une' : 'un'
//       return {
//         id, wordEntryId: entry.id,
//         questionType: 'gender_quiz',
//         skillType: 'gender',
//         prompt: `Quel est le genre de "${entry.word}" ?`,
//         expectedAnswer: `${entry.article_indefinite} ${entry.word}`,
//         options: shuffle([
//           `${entry.article_indefinite} ${entry.word}`,
//           `${wrongArticle} ${entry.word}`,
//         ]),
//         displayText: entry.display_text,
//       }

//     case 'form':
//       if (entry.part_of_speech !== 'adjective' || !entry.feminine_singular) return null
//       return {
//         id, wordEntryId: entry.id,
//         questionType: 'form_quiz',
//         skillType: 'form',
//         prompt: `Forme féminine de "${entry.masculine_singular}" ?`,
//         expectedAnswer: entry.feminine_singular,
//         options: shuffle([
//           entry.feminine_singular,
//           entry.masculine_singular,
//           entry.feminine_plural ?? entry.feminine_singular + 's',
//           entry.masculine_plural ?? entry.masculine_singular + 's',
//         ]).slice(0, 4),
//         displayText: entry.display_text,
//       }

//     case 'spelling': {
//       const baseWord = entry.word.split('/')[0].trim()
//       const spellTarget = entry.part_of_speech === 'noun' && entry.article_indefinite
//         ? `${entry.article_indefinite} ${baseWord}`
//         : entry.part_of_speech === 'verb'
//         ? entry.infinitive || baseWord
//         : baseWord
//       return {
//         id, wordEntryId: entry.id,
//         questionType: 'spelling',
//         skillType: 'spelling',
//         prompt: `${entry.english_primary} · ${entry.chinese_primary}`,
//         expectedAnswer: spellTarget,
//         displayText: entry.display_text,
//       }
//     }

//     case 'listening': {
//       const baseWord = entry.word.split('/')[0].trim()
//       const listenTarget = entry.part_of_speech === 'noun' && entry.article_indefinite
//         ? `${entry.article_indefinite} ${baseWord}`
//         : entry.part_of_speech === 'verb'
//         ? entry.infinitive || baseWord
//         : baseWord
//       return {
//         id, wordEntryId: entry.id,
//         questionType: 'dictation',
//         skillType: 'listening',
//         prompt: listenTarget,
//         expectedAnswer: listenTarget,
//         displayText: entry.display_text,
//       }
//     }

//     default:
//       return null
//   }
// }
function generateQuestion(
  entry: WordEntry,
  skillType: SkillType,
  allEntries: WordEntry[]
): Question | null {
  const id = crypto.randomUUID()
  const clean = cleanWord(entry.word)

  switch (skillType) {
    case 'meaning':
      return {
        id, wordEntryId: entry.id,
        questionType: 'meaning_choice',
        skillType: 'meaning',
        prompt: getDisplayText(entry),
        expectedAnswer: entry.english_primary,
        options: makeOptions(entry.english_primary, allEntries, e => e.english_primary),
        displayText: getDisplayText(entry),
      }

    case 'reverse':
      return {
        id, wordEntryId: entry.id,
        questionType: 'reverse_choice',
        skillType: 'reverse',
        prompt: entry.chinese_primary,
        expectedAnswer: getDisplayText(entry),
        options: makeOptions(getDisplayText(entry), allEntries, e => getDisplayText(e)),
        displayText: getDisplayText(entry),
      }

    case 'gender': {
      if (entry.part_of_speech !== 'noun' || !entry.article_indefinite) return null
      const wrongArticle = entry.article_indefinite === 'un' ? 'une' : 'un'
      return {
        id, wordEntryId: entry.id,
        questionType: 'gender_quiz',
        skillType: 'gender',
        prompt: `Quel est le genre de "${clean}" ?`,
        expectedAnswer: `${entry.article_indefinite} ${clean}`,
        options: shuffle([
          `${entry.article_indefinite} ${clean}`,
          `${wrongArticle} ${clean}`,
        ]),
        displayText: getDisplayText(entry),
      }
    }

    case 'form': {
      if (entry.part_of_speech !== 'adjective' || !entry.feminine_singular) return null
      return {
        id, wordEntryId: entry.id,
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
        displayText: getDisplayText(entry),
      }
    }

    case 'spelling': {
      const spellTarget = entry.part_of_speech === 'noun' && entry.article_indefinite
        ? `${entry.article_indefinite} ${clean}`
        : entry.part_of_speech === 'verb'
        ? entry.infinitive || clean
        : clean
      return {
        id, wordEntryId: entry.id,
        questionType: 'spelling',
        skillType: 'spelling',
        prompt: `${entry.english_primary} · ${entry.chinese_primary}`,
        expectedAnswer: spellTarget,
        displayText: getDisplayText(entry),
      }
    }

    case 'listening': {
      const listenTarget = entry.part_of_speech === 'noun' && entry.article_indefinite
        ? `${entry.article_indefinite} ${clean}`
        : entry.part_of_speech === 'verb'
        ? entry.infinitive || clean
        : clean
      return {
        id, wordEntryId: entry.id,
        questionType: 'dictation',
        skillType: 'listening',
        prompt: listenTarget,
        expectedAnswer: listenTarget,
        displayText: getDisplayText(entry),
      }
    }

    default:
      return null
  }
}

// 获取可练习词
async function getEligibleEntries(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase
    .from('word_entries')
    .select('*, learning_states!inner(*), skill_scores(*)')
    .eq('user_id', userId)
    .is('archived_at', null)
    .eq('is_incomplete', false)
    .in('learning_states.status', ['learning', 'review', 'weak', 'mastered'])

  return data ?? []
}

// 随机练习
export async function loadRandomPractice(limit = 15): Promise<PracticeQuestion[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const entries = await getEligibleEntries(supabase, user.id)
  if (entries.length === 0) return []

  const allEntries = entries as WordEntry[]
  const shuffled = shuffle(allEntries)
  const selected = shuffled.slice(0, limit)

  const questions: PracticeQuestion[] = []

  for (const entry of selected) {
    const skills = getApplicableSkills(entry.part_of_speech as never)
    const skill = shuffle(skills)[0] as SkillType
    const q = generateQuestion(entry, skill, allEntries)
    if (q) questions.push({ question: q, entry })
  }

  return questions
}

// 薄弱练习
export async function loadWeakPractice(limit = 15): Promise<PracticeQuestion[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const entries = await getEligibleEntries(supabase, user.id)
  if (entries.length === 0) return []

  const allEntries = entries as (WordEntry & {
    learning_states: { status: string }[]
    skill_scores: { skill_type: string; score: number }[]
  })[]

  // 按薄弱程度排序
  const scored = allEntries.map(entry => {
    const status = entry.learning_states?.[0]?.status ?? 'review'
    const scores = entry.skill_scores ?? []
    const avgScore = scores.length > 0
      ? scores.reduce((s, sk) => s + sk.score, 0) / scores.length
      : 3
    const statusWeight = status === 'weak' ? 0 : status === 'learning' ? 1 : 2
    return { entry, avgScore, statusWeight }
  })

  scored.sort((a, b) => {
    if (a.statusWeight !== b.statusWeight) return a.statusWeight - b.statusWeight
    return a.avgScore - b.avgScore
  })

  const selected = scored.slice(0, limit).map(s => s.entry)
  const questions: PracticeQuestion[] = []

  for (const entry of selected) {
    // 找最低分技能
    const scores = (entry.skill_scores ?? []) as { skill_type: string; score: number }[]
    const applicable = getApplicableSkills(entry.part_of_speech as never)
    let weakestSkill: SkillType = applicable[0] as SkillType

    if (scores.length > 0) {
      const sorted = scores
        .filter(s => applicable.includes(s.skill_type as never))
        .sort((a, b) => a.score - b.score)
      if (sorted.length > 0) weakestSkill = sorted[0].skill_type as SkillType
    }

    const q = generateQuestion(entry, weakestSkill, selected as WordEntry[])
    if (q) questions.push({ question: q, entry })
  }

  return questions
}

// 提交 practice 答案
export async function submitPracticeAnswer(
  question: Question,
  userAnswer: string,
  entry: WordEntry,
  judgeResult: JudgeResult
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  // 写入 review_logs
  await supabase.from('review_logs').insert({
    user_id: user.id,
    word_entry_id: entry.id,
    session_type: 'practice',
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

  // 更新 skill_scores
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

  // 答错 → weak + 明天复习
  if (judgeResult.result === 'wrong') {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const d = tomorrow
    const tomorrowStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

    await supabase
      .from('learning_states')
      .update({
        status: 'weak',
        next_review_at: tomorrowStr,
        updated_at: new Date().toISOString(),
      })
      .eq('word_entry_id', entry.id)
      .eq('user_id', user.id)
  }
}

// 获取可练习词数量（用于 Hub 展示）
export async function getPracticeStats() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { total: 0, weak: 0, nouns: 0 }

  const { count: total } = await supabase
    .from('word_entries')
    .select('*, learning_states!inner(*)', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .is('archived_at', null)
    .eq('is_incomplete', false)
    .in('learning_states.status', ['learning', 'review', 'weak', 'mastered'])

  const { count: weak } = await supabase
    .from('learning_states')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('status', 'weak')

  const { count: nouns } = await supabase
    .from('word_entries')
    .select('*, learning_states!inner(*)', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('part_of_speech', 'noun')
    .is('archived_at', null)
    .eq('is_incomplete', false)
    .in('learning_states.status', ['learning', 'review', 'weak', 'mastered'])

  return { total: total ?? 0, weak: weak ?? 0, nouns: nouns ?? 0 }
}