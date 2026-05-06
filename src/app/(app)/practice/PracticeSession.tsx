'use client'

import { useState, useEffect } from 'react'
import { judgeAnswer } from '@/lib/vocab/judge'
import type { JudgeResult } from '@/lib/vocab/judge'
import { loadRandomPractice, loadWeakPractice, submitPracticeAnswer } from '@/app/actions/practice-session'
import type { PracticeQuestion } from '@/app/actions/practice-session'
import { QuestionUI } from '@/components/study/QuestionUI'
import { createClient } from '@/lib/supabase/client'

type PracticeMode = 'random' | 'weak'

const MODE_LABELS: Record<PracticeMode, string> = {
  random: '随机练习',
  weak: '薄弱练习',
}

export function PracticeSession({
  mode,
  onExit,
  accentStrictness = 'lenient',
}: {
  mode: PracticeMode
  onExit: () => void
  accentStrictness?: 'lenient' | 'strict'
}) {
  const [questions, setQuestions] = useState<PracticeQuestion[]>([])
  const [index, setIndex] = useState(0)
  const [feedback, setFeedback] = useState<JudgeResult | null>(null)
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ correct: 0, partial: 0, wrong: 0 })

  useEffect(() => {
    loadQuestions()
    loadAccentSetting()
  }, [])

  const [strictness, setStrictness] = useState<'lenient' | 'strict'>(accentStrictness)

  async function loadAccentSetting() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('app_settings')
      .select('accent_strictness')
      .eq('user_id', user.id)
      .single()
    if (data?.accent_strictness) {
      setStrictness(data.accent_strictness as 'lenient' | 'strict')
    }
  }

  async function loadQuestions() {
    setLoading(true)
    const qs = mode === 'random'
      ? await loadRandomPractice(15)
      : await loadWeakPractice(15)
    setQuestions(qs)
    setLoading(false)
  }

  async function handleAgain() {
    setIndex(0)
    setFeedback(null)
    setDone(false)
    setStats({ correct: 0, partial: 0, wrong: 0 })
    await loadQuestions()
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100%', background: 'var(--bg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <p style={{ fontSize: '14px', color: 'var(--muted)' }}>加载题目中...</p>
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div style={{
        minHeight: '100%', background: 'var(--bg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '40px 20px',
      }}>
        <div style={{
          maxWidth: '400px', width: '100%',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '24px', padding: '48px 32px',
          textAlign: 'center', boxShadow: 'var(--shadow-md)',
        }}>
          <p style={{ fontSize: '32px', marginBottom: '16px' }}>📭</p>
          <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--fg)', marginBottom: '8px' }}>
            暂时没有可练习的词
          </p>
          <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '24px', lineHeight: 1.6 }}>
            {mode === 'weak' ? '没有薄弱词，表现很好！' : '请先完成新词训练。'}
          </p>
          <button
            onClick={onExit}
            style={{
              padding: '11px 24px',
              background: 'var(--accent)', color: 'var(--accent-fg)',
              border: 'none', borderRadius: '12px',
              fontSize: '14px', fontWeight: 600, cursor: 'pointer',
            }}
          >
            返回
          </button>
        </div>
      </div>
    )
  }

  if (done) {
    return (
      <div style={{
        minHeight: '100%', background: 'var(--bg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '40px 20px',
      }}>
        <div style={{
          maxWidth: '400px', width: '100%',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '24px', padding: '48px 36px',
          textAlign: 'center', boxShadow: 'var(--shadow-md)',
        }}>
          <div style={{
            width: '64px', height: '64px',
            background: 'var(--surface-2)',
            borderRadius: '20px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px', fontSize: '28px',
          }}>
            ✓
          </div>
          <h2 style={{
            fontSize: '20px', fontWeight: 700,
            color: 'var(--fg)', marginBottom: '6px',
          }}>
            练习完成
          </h2>
          <p style={{
            fontSize: '13px', color: 'var(--muted)',
            marginBottom: '24px',
          }}>
            {MODE_LABELS[mode]}
          </p>

          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '10px', marginBottom: '28px',
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
                <p style={{ fontSize: '11px', color: 'var(--muted)' }}>{s.label}</p>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              onClick={handleAgain}
              style={{
                width: '100%', padding: '13px',
                background: 'var(--accent)', color: 'var(--accent-fg)',
                border: 'none', borderRadius: '14px',
                fontSize: '14px', fontWeight: 600, cursor: 'pointer',
              }}
            >
              再练一组
            </button>
            <button
              onClick={onExit}
              style={{
                width: '100%', padding: '13px',
                background: 'transparent', color: 'var(--muted)',
                border: 'none', borderRadius: '14px',
                fontSize: '14px', cursor: 'pointer',
              }}
            >
              返回练习中心
            </button>
          </div>
        </div>
      </div>
    )
  }

  const current = questions[index]

  async function handleSubmit(answer: string) {
    if (!current) return
    const result = judgeAnswer(current.question, answer, current.entry, strictness)
    setFeedback(result)
    await submitPracticeAnswer(current.question, answer, current.entry, result)
    setStats(prev => ({
      correct: prev.correct + (result.result === 'correct' ? 1 : 0),
      partial: prev.partial + (result.result === 'partial' ? 1 : 0),
      wrong: prev.wrong + (result.result === 'wrong' ? 1 : 0),
    }))
  }

  function handleNext() {
    setFeedback(null)
    if (index >= questions.length - 1) {
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
      sessionLabel={MODE_LABELS[mode]}
      current={index + 1}
      total={questions.length}
      onSubmit={handleSubmit}
      feedback={feedback}
      onNext={handleNext}
      exampleFr={feedback ? example?.fr : undefined}
      exampleZh={feedback ? example?.zh : undefined}
    />
  )
}