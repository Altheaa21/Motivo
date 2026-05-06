'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { judgeAnswer } from '@/lib/vocab/judge'
import type { JudgeResult, SessionWord, Question } from '@/lib/vocab/judge'
import { submitAnswer, finalizeWord } from '@/app/actions/practice'
import { EmptyState } from '@/components/study/EmptyState'
import { QuestionUI } from '@/components/study/QuestionUI'
import type { WordEntry } from '@/types/database'

// 打平的题目，带词信息
interface FlatQuestion {
  question: Question
  word: SessionWord
  wordId: string
  isSpelling: boolean
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5)
}

// 把所有词的题目打平并混合，spelling 统一放最后
function flattenQuestions(words: SessionWord[]): FlatQuestion[] {
  const nonSpelling: FlatQuestion[] = []
  const spelling: FlatQuestion[] = []

  for (const word of words) {
    for (const question of word.questions) {
      const flat: FlatQuestion = {
        question,
        word,
        wordId: word.entry.id,
        isSpelling: question.questionType === 'spelling' || question.questionType === 'dictation',
      }
      if (flat.isSpelling) {
        spelling.push(flat)
      } else {
        nonSpelling.push(flat)
      }
    }
  }

  return [...shuffle(nonSpelling), ...shuffle(spelling)]
}

export function PracticeClient({
  initialWords,
  accentStrictness = 'lenient',
}: {
  initialWords: SessionWord[]
  accentStrictness?: 'lenient' | 'strict'
}) {
  const router = useRouter()

  // 打平题目列表，只计算一次
  const flatQuestions = useMemo(() => flattenQuestions(initialWords), [])

  const [index, setIndex] = useState(0)
  const [feedback, setFeedback] = useState<JudgeResult | null>(null)
  const [done, setDone] = useState(false)
  const [results, setResults] = useState({ passed: 0, failed: 0 })

  // 跟踪每个词的答题状态
  const [wordStats, setWordStats] = useState<Record<string, {
    attemptCount: number
    correctCount: number
    wrongCount: number
    genderCorrect: boolean
    spellingAttempted: boolean
    finalized: boolean
  }>>(() => {
    const init: Record<string, {
      attemptCount: number
      correctCount: number
      wrongCount: number
      genderCorrect: boolean
      spellingAttempted: boolean
      finalized: boolean
    }> = {}
    for (const w of initialWords) {
      init[w.entry.id] = {
        attemptCount: 0,
        correctCount: 0,
        wrongCount: 0,
        genderCorrect: false,
        spellingAttempted: false,
        finalized: false,
      }
    }
    return init
  })

  const current = flatQuestions[index]
  const total = flatQuestions.length

  if (initialWords.length === 0) {
    return (
      <EmptyState
        icon="📭"
        title="没有待练习的单词"
        subtitle="先去学习页面把单词加入练习队列。"
        primaryLabel="去学习"
        onPrimary={() => router.push('/learn')}
      />
    )
  }

  if (done) {
    return (
      <div style={{
        minHeight: '100%',
        background: 'var(--bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
      }}>
        <div style={{
          maxWidth: '400px',
          width: '100%',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '24px',
          padding: '48px 36px',
          textAlign: 'center',
          boxShadow: 'var(--shadow-md)',
        }}>
          <div style={{
            width: '64px', height: '64px',
            background: 'var(--surface-2)',
            borderRadius: '20px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px',
            fontSize: '28px',
          }}>
            🎉
          </div>
          <h2 style={{
            fontSize: '20px', fontWeight: 700,
            color: 'var(--fg)', marginBottom: '20px',
          }}>
            练习完成
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '10px',
            marginBottom: '28px',
          }}>
            {[
              { label: '通过', value: results.passed, color: 'var(--success)' },
              { label: '需继续练习', value: results.failed, color: 'var(--warning)' },
            ].map(s => (
              <div key={s.label} style={{
                padding: '16px 8px',
                background: 'var(--surface-2)',
                borderRadius: '12px',
              }}>
                <p style={{
                  fontSize: '28px', fontWeight: 700,
                  color: s.color, lineHeight: 1, marginBottom: '6px',
                }}>
                  {s.value}
                </p>
                <p style={{ fontSize: '12px', color: 'var(--muted)' }}>
                  {s.label}
                </p>
              </div>
            ))}
          </div>

          <p style={{
            fontSize: '12px', color: 'var(--muted)',
            lineHeight: 1.6, marginBottom: '24px',
          }}>
            通过的词明天开始进入复习。
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              onClick={() => router.push('/today')}
              style={{
                width: '100%', padding: '13px',
                background: 'var(--accent)', color: 'var(--accent-fg)',
                border: 'none', borderRadius: '14px',
                fontSize: '14px', fontWeight: 600, cursor: 'pointer',
              }}
            >
              回到今日
            </button>
            <button
              onClick={() => router.push('/review')}
              style={{
                width: '100%', padding: '13px',
                background: 'transparent', color: 'var(--muted)',
                border: 'none', borderRadius: '14px',
                fontSize: '14px', cursor: 'pointer',
              }}
            >
              开始复习
            </button>
          </div>
        </div>
      </div>
    )
  }

  async function handleSubmit(answer: string) {
    if (!current) return
    const result = judgeAnswer(current.question, answer, current.word.entry, accentStrictness)
    setFeedback(result)

    await submitAnswer(current.question, answer, current.word.entry, result)

    // 更新该词的答题统计
    setWordStats(prev => {
      const s = { ...prev[current.wordId] }
      s.attemptCount += 1
      if (result.result === 'correct') s.correctCount += 1
      if (result.result === 'wrong') s.wrongCount += 1
      if (current.question.skillType === 'gender' && result.result === 'correct') {
        s.genderCorrect = true
      }
      if (current.isSpelling) {
        s.spellingAttempted = true
      }
      return { ...prev, [current.wordId]: s }
    })
  }

  async function handleNext() {
    const isLastQuestion = index >= total - 1

    // 检查当前题目所属的词是否所有题都答完了，如果是则 finalize
    if (current) {
      const wordId = current.wordId
      const remainingForWord = flatQuestions
        .slice(index + 1)
        .filter(q => q.wordId === wordId)

      if (remainingForWord.length === 0) {
        // 这个词的所有题都答完了
        const stats = wordStats[wordId]
        if (stats && !stats.finalized) {
          const passed = await finalizeWord(
            current.word.entry,
            stats.correctCount,
            stats.attemptCount,
            stats.genderCorrect,
            stats.spellingAttempted
          )
          setWordStats(prev => ({
            ...prev,
            [wordId]: { ...prev[wordId], finalized: true }
          }))
          setResults(prev => ({
            passed: prev.passed + (passed ? 1 : 0),
            failed: prev.failed + (passed ? 0 : 1),
          }))
        }
      }
    }

    setFeedback(null)

    if (isLastQuestion) {
      setDone(true)
    } else {
      setIndex(i => i + 1)
    }
  }

  const example = current?.word.entry.examples?.[0]

  return (
    <QuestionUI
      question={current.question}
      entry={current.word.entry}
      sessionLabel="新词练习"
      current={index + 1}
      total={total}
      onSubmit={handleSubmit}
      feedback={feedback}
      onNext={handleNext}
      exampleFr={feedback ? example?.fr : undefined}
      exampleZh={feedback ? example?.zh : undefined}
    />
  )
}