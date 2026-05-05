import type { WordEntry, SkillType, QuestionType } from '@/types/database'
import { normalizeAnswer, differsByAccentOnly } from '@/lib/vocab/normalize'

export interface Question {
  id: string
  wordEntryId: string
  questionType: QuestionType
  skillType: SkillType
  prompt: string
  expectedAnswer: string
  options?: string[]
  displayText: string
}

export interface SessionWord {
  entry: WordEntry
  questions: Question[]
  attemptCount: number
  correctCount: number
  wrongCount: number
  passed: boolean | null
}

export interface JudgeResult {
  result: 'correct' | 'partial' | 'wrong'
  feedback: string
  skillUpdates: { skillType: SkillType; delta: number }[]
}

export function judgeAnswer(
  question: Question,
  userAnswer: string,
  entry: WordEntry,
  accentStrictness: 'lenient' | 'strict' = 'lenient'
): JudgeResult {
  const normalized = normalizeAnswer(userAnswer)
  const expected = normalizeAnswer(question.expectedAnswer)

  if (
    question.questionType === 'meaning_choice' ||
    question.questionType === 'reverse_choice' ||
    question.questionType === 'gender_quiz' ||
    question.questionType === 'form_quiz'
  ) {
    if (normalized === expected) {
      return {
        result: 'correct',
        feedback: '正确！',
        skillUpdates: [{ skillType: question.skillType, delta: 1 }],
      }
    }
    return {
      result: 'wrong',
      feedback: `错误。正确答案：${question.expectedAnswer}`,
      skillUpdates: [{ skillType: question.skillType, delta: -1 }],
    }
  }

  if (normalized === expected) {
    const updates: JudgeResult['skillUpdates'] = [{ skillType: 'spelling', delta: 1 }]
    if (entry.part_of_speech === 'noun') {
      updates.push({ skillType: 'gender', delta: 1 })
    }
    return { result: 'correct', feedback: '正确！', skillUpdates: updates }
  }

  if (entry.part_of_speech === 'noun' && entry.article_indefinite) {
    const withoutArticle = normalizeAnswer(entry.word)
    if (normalized === withoutArticle) {
      return {
        result: 'partial',
        feedback: `缺少冠词：${question.expectedAnswer}`,
        skillUpdates: [],
      }
    }
    const wrongArticle = entry.article_indefinite === 'un' ? 'une' : 'un'
    if (normalized === `${wrongArticle} ${normalizeAnswer(entry.word)}`) {
      return {
        result: 'partial',
        feedback: `冠词错误。正确答案：${question.expectedAnswer}`,
        skillUpdates: [{ skillType: 'gender', delta: -1 }],
      }
    }
    if (entry.article_definite && normalized.includes(normalizeAnswer(entry.word))) {
      return {
        result: 'partial',
        feedback: `请使用不定冠词：${question.expectedAnswer}`,
        skillUpdates: [],
      }
    }
  }

  if (accentStrictness === 'lenient' && differsByAccentOnly(normalized, expected)) {
    return {
      result: 'partial',
      feedback: `注意重音：${question.expectedAnswer}`,
      skillUpdates: [],
    }
  }

  return {
    result: 'wrong',
    feedback: `错误。正确答案：${question.expectedAnswer}`,
    skillUpdates: [{ skillType: question.skillType, delta: -1 }],
  }
}