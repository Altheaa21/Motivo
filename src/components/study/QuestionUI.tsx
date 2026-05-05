'use client'

import { useState, useRef } from 'react'
import { Volume2, Play, RotateCcw } from 'lucide-react'
import type { Question, JudgeResult } from '@/lib/vocab/judge'
import type { WordEntry } from '@/types/database'
import { speakWord } from '@/lib/vocab/tts'

function toDisplayCase(str: string): string {
  return str.toLowerCase().replace(/^./, c => c.toUpperCase())
}

interface QuestionUIProps {
  question: Question
  entry: WordEntry
  sessionLabel: string       // "新词练习" or "复习中"
  current: number
  total: number
  onSubmit: (answer: string) => void
  feedback: JudgeResult | null
  onNext: () => void
  exampleFr?: string
  exampleZh?: string
}

const QUESTION_TYPE_LABELS: Record<string, string> = {
  meaning_choice: '选择题 · 词义',
  reverse_choice: '选择题 · 反向',
  gender_quiz: '选择题 · 阴阳性',
  form_quiz: '选择题 · 变位',
  spelling: '拼写题',
  dictation: '听写题',
}

export function QuestionUI({
  question, entry, sessionLabel,
  current, total,
  onSubmit, feedback, onNext,
  exampleFr, exampleZh,
}: QuestionUIProps) {
  const [selected, setSelected] = useState<string>('')
  const [typed, setTyped] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const isChoice = ['meaning_choice', 'reverse_choice', 'gender_quiz', 'form_quiz']
    .includes(question.questionType)
  const isDictation = question.questionType === 'dictation'
  const submitted = !!feedback

  function handleSubmit() {
    const answer = isChoice ? selected : typed
    if (!answer) return
    onSubmit(answer)
  }

  function handleNext() {
    setSelected('')
    setTyped('')
    onNext()
  }

  function handleChoiceClick(option: string) {
    if (submitted) return
    setSelected(option)
  }

  return (
    <div style={{
      minHeight: '100%',
      background: 'var(--bg)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        maxWidth: '680px',
        width: '100%',
        margin: '0 auto',
        padding: '24px 20px 32px',
      }}>

        {/* Progress header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '12px',
        }}>
          <div>
            <p style={{
              fontSize: '12px', color: 'var(--muted)',
              letterSpacing: '0.05em', marginBottom: '2px',
            }}>
              {sessionLabel}
            </p>
            <p style={{
              fontSize: '20px', fontWeight: 700,
              color: 'var(--fg)', lineHeight: 1,
            }}>
              {current}
              <span style={{ fontSize: '14px', color: 'var(--muted)', fontWeight: 400 }}>
                {' '}/ {total}
              </span>
            </p>
          </div>
          <span style={{
            fontSize: '12px', fontWeight: 500,
            color: 'var(--muted)',
            padding: '5px 12px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '100px',
          }}>
            {QUESTION_TYPE_LABELS[question.questionType] ?? question.questionType}
          </span>
        </div>

        {/* Progress bar */}
        <div style={{
          height: '3px', background: 'var(--border)',
          borderRadius: '2px', marginBottom: '28px', overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${((current - 1) / total) * 100}%`,
            background: 'var(--accent)',
            borderRadius: '2px',
            transition: 'width 0.3s ease',
          }} />
        </div>

        {/* Question card */}
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '24px',
          padding: '32px 28px',
          marginBottom: '20px',
          boxShadow: 'var(--shadow-sm)',
        }}>
          {isDictation ? (
            // Dictation: play buttons
            <div>
              <p style={{
                fontSize: '13px', color: 'var(--muted)',
                marginBottom: '20px', letterSpacing: '0.03em',
              }}>
                听音频，输入你听到的内容
              </p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => speakWord(entry)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '10px 20px',
                    background: 'var(--accent)', color: 'var(--accent-fg)',
                    border: 'none', borderRadius: '12px',
                    fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  <Play size={15} />
                  播放
                </button>
                <button
                  onClick={() => speakWord(entry)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '10px 20px',
                    background: 'var(--surface-2)', color: 'var(--fg-2)',
                    border: '1px solid var(--border)', borderRadius: '12px',
                    fontSize: '14px', cursor: 'pointer',
                  }}
                >
                  <RotateCcw size={14} />
                  重播
                </button>
              </div>
            </div>
          ) : (
            // Normal prompt
            <div>
              <p style={{
                fontSize: '13px', color: 'var(--muted)',
                marginBottom: '14px', letterSpacing: '0.03em',
              }}>
                {isChoice
                  ? question.questionType === 'reverse_choice'
                    ? '选择对应的法语单词'
                    : question.questionType === 'gender_quiz'
                    ? '选择正确的冠词'
                    : question.questionType === 'form_quiz'
                    ? '选择正确的变位形式'
                    : '选择正确的意思'
                  : '写出这个单词的法语'
                }
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="font-display" style={{
                  fontSize: 'clamp(22px, 4vw, 32px)',
                  fontWeight: 700,
                  color: 'var(--fg)',
                  lineHeight: 1.2,
                  letterSpacing: '-0.01em',
                }}>
                  {toDisplayCase(question.prompt)}
                </span>
                {(question.questionType === 'meaning_choice' ||
                  question.questionType === 'gender_quiz') && (
                  <button
                    onClick={() => speakWord(entry)}
                    style={{
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      padding: '6px',
                      cursor: 'pointer',
                      display: 'flex', alignItems: 'center',
                      color: 'var(--muted)',
                      flexShrink: 0,
                    }}
                  >
                    <Volume2 size={15} />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Answer area */}
        <div style={{ marginBottom: '20px' }}>
          {isChoice && question.options ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {question.options.map((option, idx) => {
                const isSelected = selected === option
                const isCorrect = submitted && option === question.expectedAnswer
                const isWrong = submitted && isSelected && option !== question.expectedAnswer

                return (
                  <button
                    key={option}
                    onClick={() => handleChoiceClick(option)}
                    style={{
                      width: '100%',
                      padding: '14px 18px',
                      textAlign: 'left',
                      background: isCorrect
                        ? 'var(--success-bg)'
                        : isWrong
                        ? 'var(--danger-bg)'
                        : isSelected
                        ? 'var(--surface-2)'
                        : 'var(--surface)',
                      border: `1.5px solid ${
                        isCorrect ? 'var(--success)'
                        : isWrong ? 'var(--danger)'
                        : isSelected ? 'var(--accent)'
                        : 'var(--border)'
                      }`,
                      borderRadius: '14px',
                      fontSize: '14px',
                      fontWeight: isSelected ? 600 : 400,
                      color: isCorrect
                        ? 'var(--success)'
                        : isWrong
                        ? 'var(--danger)'
                        : 'var(--fg)',
                      cursor: submitted ? 'default' : 'pointer',
                      boxShadow: isSelected && !submitted ? 'var(--shadow-sm)' : 'none',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                    }}
                  >
                    <span style={{
                      width: '24px', height: '24px',
                      borderRadius: '8px',
                      background: isCorrect
                        ? 'var(--success)'
                        : isWrong
                        ? 'var(--danger)'
                        : isSelected
                        ? 'var(--accent)'
                        : 'var(--surface-2)',
                      color: (isCorrect || isWrong || isSelected) ? '#fff' : 'var(--muted)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '12px', fontWeight: 700,
                      flexShrink: 0,
                      transition: 'all 0.15s ease',
                    }}>
                      {['A','B','C','D'][idx]}
                    </span>
                    {toDisplayCase(option)}
                  </button>
                )
              })}
            </div>
          ) : (
            // Typed input
            <input
              ref={inputRef}
              type="text"
              value={typed}
              onChange={e => setTyped(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !submitted && typed && handleSubmit()}
              disabled={submitted}
              placeholder="输入法语..."
              autoFocus
              style={{
                width: '100%',
                padding: '16px 20px',
                background: 'var(--surface)',
                border: `1.5px solid ${
                  submitted
                    ? feedback?.result === 'correct' ? 'var(--success)'
                      : feedback?.result === 'partial' ? 'var(--warning)'
                      : 'var(--danger)'
                    : 'var(--border)'
                }`,
                borderRadius: '14px',
                fontSize: '16px',
                color: 'var(--fg)',
                outline: 'none',
                boxShadow: 'var(--shadow-sm)',
                transition: 'border-color 0.15s ease',
                fontFamily: 'inherit',
              }}
            />
          )}
        </div>

        {/* Feedback */}
        {submitted && feedback && (
          <div style={{
            padding: '14px 18px',
            background: feedback.result === 'correct'
              ? 'var(--success-bg)'
              : feedback.result === 'partial'
              ? 'var(--warning-bg)'
              : 'var(--danger-bg)',
            border: `1px solid ${
              feedback.result === 'correct' ? 'var(--success)'
              : feedback.result === 'partial' ? 'var(--warning)'
              : 'var(--danger)'
            }`,
            borderRadius: '14px',
            marginBottom: '16px',
          }}>
            <p style={{
              fontSize: '14px', fontWeight: 600,
              color: feedback.result === 'correct' ? 'var(--success)'
                : feedback.result === 'partial' ? 'var(--warning)'
                : 'var(--danger)',
              marginBottom: exampleFr ? '10px' : 0,
            }}>
              {feedback.feedback}
            </p>
            {exampleFr && (
              <div style={{ paddingTop: '10px', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                <p style={{ fontSize: '13px', color: 'var(--fg-2)', fontStyle: 'italic' }}>
                  {exampleFr}
                </p>
                {exampleZh && (
                  <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '3px' }}>
                    {exampleZh}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* CTA */}
        <div style={{ marginTop: 'auto' }}>
          {!submitted ? (
            <button
              onClick={handleSubmit}
              disabled={isChoice ? !selected : !typed}
              style={{
                width: '100%',
                padding: '16px',
                background: 'var(--accent)',
                color: 'var(--accent-fg)',
                border: 'none',
                borderRadius: '16px',
                fontSize: '15px',
                fontWeight: 600,
                cursor: (isChoice ? !selected : !typed) ? 'not-allowed' : 'pointer',
                opacity: (isChoice ? !selected : !typed) ? 0.45 : 1,
                transition: 'opacity 0.15s ease',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              提交
            </button>
          ) : (
            <button
              onClick={handleNext}
              style={{
                width: '100%',
                padding: '16px',
                background: 'var(--accent)',
                color: 'var(--accent-fg)',
                border: 'none',
                borderRadius: '16px',
                fontSize: '15px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              继续 →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}