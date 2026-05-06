'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { judgeAnswer } from '@/lib/vocab/judge'
import type { JudgeResult } from '@/lib/vocab/judge'
import { submitReviewAnswer } from '@/app/actions/review'
import type { ReviewSessionItem } from '@/app/actions/review'
import { EmptyState } from '@/components/study/EmptyState'
import { QuestionUI } from '@/components/study/QuestionUI'

export function ReviewClient({
  initialItems,
  accentStrictness = 'lenient',
}: { 
  initialItems: ReviewSessionItem[]
  accentStrictness?: 'lenient' | 'strict'
}) {
  const router = useRouter()
  const [items] = useState(initialItems)
  const [index, setIndex] = useState(0)
  const [feedback, setFeedback] = useState<JudgeResult | null>(null)
  const [done, setDone] = useState(false)
  const [stats, setStats] = useState({ correct: 0, partial: 0, wrong: 0 })

  const current = items[index]
  const total = items.length

  if (items.length === 0) {
    return (
      <EmptyState
        icon="🎉"
        title="今日复习完成"
        subtitle="没有需要复习的单词，休息一下吧。"
        primaryLabel="巩固练习"
        onPrimary={() => router.push('/practice')}
        secondaryLabel="回到今日"
        onSecondary={() => router.push('/today')}
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
            ✓
          </div>
          <h2 style={{
            fontSize: '20px', fontWeight: 700,
            color: 'var(--fg)', marginBottom: '20px',
          }}>
            复习完成
          </h2>

          {/* Stats */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '10px',
            marginBottom: '28px',
          }}>
            {[
              { label: '正确', value: stats.correct, color: 'var(--success)' },
              { label: '部分', value: stats.partial, color: 'var(--warning)' },
              { label: '错误', value: stats.wrong, color: 'var(--danger)' },
            ].map(s => (
              <div key={s.label} style={{
                padding: '12px 8px',
                background: 'var(--surface-2)',
                borderRadius: '12px',
              }}>
                <p style={{
                  fontSize: '24px', fontWeight: 700,
                  color: s.color, lineHeight: 1, marginBottom: '4px',
                }}>
                  {s.value}
                </p>
                <p style={{ fontSize: '11px', color: 'var(--muted)' }}>
                  {s.label}
                </p>
              </div>
            ))}
          </div>

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
        </div>
      </div>
    )
  }

  async function handleSubmit(answer: string) {
    if (!current) return
    // const result = judgeAnswer(current.question, answer, current.entry)
    const result = judgeAnswer(current.question, answer, current.entry, accentStrictness)
    setFeedback(result)
    await submitReviewAnswer(current.question, answer, current.entry, result)
    setStats(prev => ({
      correct: prev.correct + (result.result === 'correct' ? 1 : 0),
      partial: prev.partial + (result.result === 'partial' ? 1 : 0),
      wrong: prev.wrong + (result.result === 'wrong' ? 1 : 0),
    }))
  }

  function handleNext() {
    setFeedback(null)
    if (index >= total - 1) {
      setDone(true)
    } else {
      setIndex(i => i + 1)
    }
  }

  const example = current?.entry.examples?.[0]

  return (
    <QuestionUI
      question={current.question}
      entry={current.entry}
      sessionLabel="复习中"
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