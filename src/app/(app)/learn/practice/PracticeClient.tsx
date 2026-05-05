'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { judgeAnswer } from '@/lib/vocab/judge'
import type { JudgeResult, SessionWord } from '@/lib/vocab/judge'
import { submitAnswer, finalizeWord } from '@/app/actions/practice'
import { EmptyState } from '@/components/study/EmptyState'
import { QuestionUI } from '@/components/study/QuestionUI'

export function PracticeClient({ initialWords }: { initialWords: SessionWord[] }) {
  const router = useRouter()
  const [words, setWords] = useState(initialWords)
  const [wordIndex, setWordIndex] = useState(0)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [feedback, setFeedback] = useState<JudgeResult | null>(null)
  const [done, setDone] = useState(false)
  const [results, setResults] = useState({ passed: 0, failed: 0 })

  const currentWord = words[wordIndex]
  const currentQuestion = currentWord?.questions[questionIndex]

  const totalQuestions = words.reduce((sum, w) => sum + w.questions.length, 0)
  const completedQuestions = words
    .slice(0, wordIndex)
    .reduce((sum, w) => sum + w.questions.length, 0) + questionIndex

  if (words.length === 0) {
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
    if (!currentQuestion || !currentWord) return
    const result = judgeAnswer(currentQuestion, answer, currentWord.entry)
    setFeedback(result)
    await submitAnswer(currentQuestion, answer, currentWord.entry, result)
    setWords(prev => {
      const updated = [...prev]
      const word = { ...updated[wordIndex] }
      word.attemptCount += 1
      if (result.result === 'correct') word.correctCount += 1
      if (result.result === 'wrong') word.wrongCount += 1
      updated[wordIndex] = word
      return updated
    })
  }

  async function handleNext() {
    if (!currentWord) return
    const isLastQuestion = questionIndex >= currentWord.questions.length - 1

    if (isLastQuestion) {
      const word = words[wordIndex]
      const hasGenderCorrect = word.questions.some(q => q.skillType === 'gender') &&
        feedback?.result === 'correct' &&
        currentQuestion?.skillType === 'gender'
      const hasSpellingAttempt = word.questions.some(q => q.questionType === 'spelling')

      const passed = await finalizeWord(
        word.entry,
        word.correctCount,
        word.attemptCount,
        hasGenderCorrect ?? false,
        hasSpellingAttempt
      )

      setResults(prev => ({
        passed: prev.passed + (passed ? 1 : 0),
        failed: prev.failed + (passed ? 0 : 1),
      }))

      if (wordIndex >= words.length - 1) {
        setDone(true)
      } else {
        setWordIndex(i => i + 1)
        setQuestionIndex(0)
      }
    } else {
      setQuestionIndex(i => i + 1)
    }

    setFeedback(null)
  }

  const example = currentWord?.entry.examples?.[0]

  return (
    <QuestionUI
      question={currentQuestion}
      entry={currentWord.entry}
      sessionLabel="新词练习"
      current={completedQuestions + 1}
      total={totalQuestions}
      onSubmit={handleSubmit}
      feedback={feedback}
      onNext={handleNext}
      exampleFr={feedback ? example?.fr : undefined}
      exampleZh={feedback ? example?.zh : undefined}
    />
  )
}