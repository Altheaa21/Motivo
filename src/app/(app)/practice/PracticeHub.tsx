'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Shuffle, Target, PenLine, CircleDot,
  Headphones, ArrowLeftRight, BookOpen,
} from 'lucide-react'
import { PracticeSession } from './PracticeSession'

type PracticeMode = 'random' | 'weak'

interface Stats {
  total: number
  weak: number
  nouns: number
}

const MODES = [
  {
    id: 'random' as PracticeMode,
    icon: <Shuffle size={20} />,
    label: '随机练习',
    desc: '从已学词中随机抽 15 题，适合碎片时间。',
    color: 'var(--accent)',
    bg: '#f5f0e8',
  },
  {
    id: 'weak' as PracticeMode,
    icon: <Target size={20} />,
    label: '薄弱练习',
    desc: '优先练薄弱词和低分技能，适合补弱点。',
    color: 'var(--danger)',
    bg: 'var(--danger-bg)',
  },
]

export function PracticeHub({ stats }: { stats: Stats }) {
  const router = useRouter()
  const [activeMode, setActiveMode] = useState<PracticeMode | null>(null)

  if (activeMode) {
    return (
      <PracticeSession
        mode={activeMode}
        onExit={() => setActiveMode(null)}
      />
    )
  }

  const hasWords = stats.total > 0

  return (
    <div style={{ minHeight: '100%', background: 'var(--bg)' }}>
      <div style={{
        maxWidth: '680px', margin: '0 auto',
        padding: '24px 16px 48px',
        width: '100%', boxSizing: 'border-box',
      }}>

        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1 className="font-display" style={{
            fontSize: 'clamp(24px, 4vw, 32px)',
            fontWeight: 700, color: 'var(--fg)', marginBottom: '6px',
          }}>
            巩固练习
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--muted)' }}>
            主动练习已学词，不会打乱正式复习计划。
          </p>
        </div>

        {!hasWords ? (
          // Empty state
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '20px',
            padding: '48px 24px',
            textAlign: 'center',
            boxShadow: 'var(--shadow-sm)',
          }}>
            <p style={{ fontSize: '32px', marginBottom: '16px' }}>📚</p>
            <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--fg)', marginBottom: '8px' }}>
              还没有可练习的词
            </p>
            <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '24px', lineHeight: 1.6 }}>
              完成新词训练后，词会进入巩固练习。
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                onClick={() => router.push('/learn')}
                style={{
                  padding: '10px 20px',
                  background: 'var(--accent)', color: 'var(--accent-fg)',
                  border: 'none', borderRadius: '12px',
                  fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                }}
              >
                去学习新词
              </button>
              <button
                onClick={() => router.push('/import')}
                style={{
                  padding: '10px 20px',
                  background: 'var(--surface-2)', color: 'var(--fg-2)',
                  border: '1px solid var(--border)', borderRadius: '12px',
                  fontSize: '14px', cursor: 'pointer',
                }}
              >
                导入单词
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Stats bar */}
            <div style={{
              display: 'flex', gap: '10px',
              marginBottom: '28px',
            }}>
              {[
                { label: '可练习', value: stats.total, color: 'var(--accent)' },
                { label: '薄弱词', value: stats.weak, color: 'var(--danger)' },
                { label: '名词', value: stats.nouns, color: 'var(--dusty-blue)' },
              ].map(s => (
                <div key={s.label} style={{
                  flex: 1, padding: '12px',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '14px',
                  textAlign: 'center',
                  boxShadow: 'var(--shadow-sm)',
                }}>
                  <p style={{
                    fontSize: '22px', fontWeight: 700,
                    color: s.color, lineHeight: 1, marginBottom: '4px',
                  }}>
                    {s.value}
                  </p>
                  <p style={{ fontSize: '11px', color: 'var(--muted)' }}>{s.label}</p>
                </div>
              ))}
            </div>

            {/* Daily practice */}
            <div style={{ marginBottom: '28px' }}>
              <p style={{
                fontSize: '11px', fontWeight: 600,
                color: 'var(--muted)', letterSpacing: '0.1em',
                textTransform: 'uppercase', marginBottom: '12px',
              }}>
                日常练习
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {MODES.map(mode => (
                  <button
                    key={mode.id}
                    onClick={() => setActiveMode(mode.id)}
                    style={{
                      width: '100%', textAlign: 'left',
                      padding: '18px 20px',
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: '18px',
                      cursor: 'pointer',
                      boxShadow: 'var(--shadow-sm)',
                      display: 'flex', alignItems: 'center', gap: '16px',
                      transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = mode.color
                      ;(e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-md)'
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'
                      ;(e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-sm)'
                    }}
                  >
                    <div style={{
                      width: '44px', height: '44px',
                      borderRadius: '12px',
                      background: mode.bg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: mode.color, flexShrink: 0,
                    }}>
                      {mode.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        fontSize: '15px', fontWeight: 600,
                        color: 'var(--fg)', marginBottom: '3px',
                      }}>
                        {mode.label}
                      </p>
                      <p style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.4 }}>
                        {mode.desc}
                      </p>
                    </div>
                    <span style={{ color: 'var(--muted)', fontSize: '18px', flexShrink: 0 }}>→</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Coming soon skills */}
            <div>
              <p style={{
                fontSize: '11px', fontWeight: 600,
                color: 'var(--muted)', letterSpacing: '0.1em',
                textTransform: 'uppercase', marginBottom: '12px',
              }}>
                按技能练习 <span style={{ fontSize: '10px', fontWeight: 400 }}>（即将推出）</span>
              </p>
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr',
                gap: '10px',
              }}>
                {[
                  { icon: <PenLine size={16} />, label: '拼写练习' },
                  { icon: <CircleDot size={16} />, label: '性别练习' },
                  { icon: <Headphones size={16} />, label: '听写练习' },
                  { icon: <ArrowLeftRight size={16} />, label: '中译法' },
                  { icon: <BookOpen size={16} />, label: '法译中' },
                ].map(item => (
                  <div
                    key={item.label}
                    style={{
                      padding: '14px 16px',
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: '14px',
                      opacity: 0.5,
                      display: 'flex', alignItems: 'center', gap: '10px',
                    }}
                  >
                    <span style={{ color: 'var(--muted)' }}>{item.icon}</span>
                    <p style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 500 }}>
                      {item.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}