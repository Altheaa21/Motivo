'use client'

import { useRouter } from 'next/navigation'
import type { WordEntry, LearningState, SkillScore } from '@/types/database'
import { getPosLabel, getGenderLabel, getAdjectiveForms } from '@/lib/vocab/display'
import { speakWord, speakSentence } from '@/lib/vocab/tts'
import { Volume2 } from 'lucide-react'

function toDisplayCase(str: string): string {
  return str.toLowerCase().replace(/^./, c => c.toUpperCase())
}

const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  new: { color: 'var(--accent)', bg: '#f5f0e8' },
  learning: { color: 'var(--warning)', bg: 'var(--warning-bg)' },
  review: { color: 'var(--success)', bg: 'var(--success-bg)' },
  weak: { color: 'var(--danger)', bg: 'var(--danger-bg)' },
  mastered: { color: '#7c6fba', bg: '#f0eefa' },
  incomplete: { color: 'var(--muted)', bg: 'var(--surface-2)' },
}

const STATUS_ZH: Record<string, string> = {
  new: '新词',
  learning: '学习中',
  review: '复习中',
  weak: '薄弱',
  mastered: '已掌握',
  incomplete: '不完整',
}

const SKILL_ZH: Record<string, string> = {
  meaning: '词义',
  reverse: '反向',
  gender: '阴阳性',
  form: '形式',
  spelling: '拼写',
  listening: '听写',
}

export function WordDetailClient({
  entry,
  state,
  skills,
}: {
  entry: WordEntry
  state: LearningState | null
  skills: SkillScore[]
}) {
  const router = useRouter()
  const statusKey = state?.status ?? 'new'
  const statusStyle = STATUS_COLORS[statusKey] ?? STATUS_COLORS.new

  return (
    <div style={{ minHeight: '100%', background: 'var(--bg)' }}>
      <div style={{
        maxWidth: '680px',
        margin: '0 auto',
        padding: '24px 16px 48px',
        width: '100%',
        boxSizing: 'border-box',
      }}>

        {/* Back */}
        <button
          onClick={() => router.back()}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '13px', color: 'var(--muted)',
            padding: '4px 0', marginBottom: '20px',
          }}
        >
          ← 返回词库
        </button>

        {/* Header card */}
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '24px',
          padding: '28px 24px',
          marginBottom: '14px',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <div style={{
            display: 'flex', alignItems: 'flex-start',
            justifyContent: 'space-between', gap: '12px',
            marginBottom: '10px',
          }}>
            <button
              onClick={() => speakWord(entry)}
              style={{
                background: 'none', border: 'none',
                cursor: 'pointer', padding: 0, textAlign: 'left',
                display: 'flex', alignItems: 'center', gap: '8px',
              }}
            >
              <span className="font-display" style={{
                fontSize: 'clamp(24px, 5vw, 34px)',
                fontWeight: 700, color: 'var(--fg)', lineHeight: 1.2,
              }}>
                {toDisplayCase(entry.display_text)}
              </span>
              <Volume2 size={16} style={{ color: 'var(--muted)', flexShrink: 0, marginTop: '4px' }} />
            </button>

            <span style={{
              padding: '4px 12px',
              background: statusStyle.bg,
              border: `1px solid ${statusStyle.color}`,
              borderRadius: '100px',
              fontSize: '12px', fontWeight: 600,
              color: statusStyle.color,
              flexShrink: 0, whiteSpace: 'nowrap',
            }}>
              {STATUS_ZH[statusKey] ?? statusKey}
            </span>
          </div>

          <p style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.5 }}>
            {getPosLabel(entry.part_of_speech, 'zh')}
            {entry.gender ? ` · ${getGenderLabel(entry.gender, 'zh')}` : ''}
            {entry.ipa ? (
              <span style={{ fontFamily: 'monospace', marginLeft: '4px' }}>
                · {entry.ipa}
              </span>
            ) : ''}
          </p>
        </div>

        {/* Meanings */}
        <DetailCard title="释义">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: '10px',
            }}>
              <span style={{ fontSize: '16px', flexShrink: 0 }}>🇬🇧</span>
              <div>
                <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--fg)' }}>
                  {entry.english_primary}
                </p>
                {entry.english_alternatives.length > 0 && (
                  <p style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '2px' }}>
                    {entry.english_alternatives.join(' · ')}
                  </p>
                )}
              </div>
            </div>
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: '10px',
            }}>
              <span style={{ fontSize: '16px', flexShrink: 0 }}>🇨🇳</span>
              <div>
                <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--fg)' }}>
                  {entry.chinese_primary}
                </p>
                {entry.chinese_alternatives.length > 0 && (
                  <p style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '2px' }}>
                    {entry.chinese_alternatives.join(' · ')}
                  </p>
                )}
              </div>
            </div>
          </div>
        </DetailCard>

        {/* Grammar */}
        {(entry.part_of_speech === 'noun' ||
          entry.part_of_speech === 'adjective' ||
          entry.part_of_speech === 'verb') && (
          <DetailCard title="语法">
            {entry.part_of_speech === 'noun' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {entry.article_indefinite && (
                  <GrammarRow label="不定冠词" value={`${entry.article_indefinite} ${entry.word}`} />
                )}
                {entry.article_definite && (
                  <GrammarRow
                    label="定冠词"
                    value={`${entry.article_definite}${entry.article_definite.endsWith("'") ? '' : ' '}${entry.word}`}
                  />
                )}
                {entry.plural_form && (
                  <GrammarRow label="复数" value={entry.plural_form} />
                )}
                {entry.gender && (
                  <GrammarRow label="阴阳性" value={getGenderLabel(entry.gender, 'zh')} />
                )}
              </div>
            )}

            {entry.part_of_speech === 'verb' && (
              <GrammarRow label="不定式" value={entry.infinitive} />
            )}

            {entry.part_of_speech === 'adjective' && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px',
              }}>
                {getAdjectiveForms(entry).map(form => (
                  <button
                    key={form.label}
                    onClick={() => speakSentence(form.text)}
                    style={{
                      textAlign: 'left',
                      padding: '12px 14px',
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      transition: 'border-color 0.15s ease',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent-light)'
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'
                    }}
                  >
                    <p style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '4px' }}>
                      {form.label}
                    </p>
                    <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--fg)' }}>
                      {form.text}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </DetailCard>
        )}

        {/* Examples */}
        {entry.examples.length > 0 && (
          <DetailCard title="例句">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {entry.examples.map((ex, i) => (
                <div key={i}>
                  <button
                    onClick={() => speakSentence(ex.fr)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      padding: 0, textAlign: 'left', display: 'block',
                      width: '100%',
                    }}
                  >
                    <p style={{
                      fontSize: '15px', fontWeight: 500,
                      color: 'var(--accent)', lineHeight: 1.5,
                      marginBottom: '4px',
                    }}>
                      {ex.fr}
                    </p>
                  </button>
                  <p style={{ fontSize: '13px', color: 'var(--fg-2)', marginBottom: '2px' }}>
                    {ex.en}
                  </p>
                  <p style={{ fontSize: '13px', color: 'var(--muted)' }}>
                    {ex.zh}
                  </p>
                </div>
              ))}
            </div>
          </DetailCard>
        )}

        {/* Learning progress */}
        {state && (
          <DetailCard title="学习进度">
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr',
              gap: '10px', marginBottom: skills.length > 0 ? '16px' : 0,
            }}>
              <div style={{
                padding: '12px',
                background: 'var(--surface-2)',
                borderRadius: '12px',
              }}>
                <p style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '4px' }}>状态</p>
                <p style={{
                  fontSize: '14px', fontWeight: 700,
                  color: statusStyle.color,
                }}>
                  {STATUS_ZH[statusKey] ?? statusKey}
                </p>
              </div>
              <div style={{
                padding: '12px',
                background: 'var(--surface-2)',
                borderRadius: '12px',
              }}>
                <p style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '4px' }}>等级</p>
                <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--fg)' }}>
                  {state.overall_level} / 5
                </p>
              </div>
              {state.next_review_at && (
                <div style={{
                  padding: '12px',
                  background: 'var(--surface-2)',
                  borderRadius: '12px',
                  gridColumn: '1 / -1',
                }}>
                  <p style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '4px' }}>下次复习</p>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--fg)' }}>
                    {state.next_review_at}
                  </p>
                </div>
              )}
            </div>

            {skills.length > 0 && (
              <div>
                <p style={{
                  fontSize: '11px', fontWeight: 600,
                  color: 'var(--muted)', letterSpacing: '0.08em',
                  textTransform: 'uppercase', marginBottom: '12px',
                }}>
                  技能
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {skills.map(skill => (
                    <div key={skill.id} style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                    }}>
                      <span style={{
                        fontSize: '13px', color: 'var(--fg-2)',
                        width: '48px', flexShrink: 0,
                      }}>
                        {SKILL_ZH[skill.skill_type] ?? skill.skill_type}
                      </span>
                      <div style={{
                        flex: 1, display: 'flex', gap: '4px',
                      }}>
                        {[1, 2, 3, 4, 5].map(n => (
                          <div
                            key={n}
                            style={{
                              flex: 1, height: '6px', borderRadius: '3px',
                              background: n <= skill.score
                                ? 'var(--accent)'
                                : 'var(--surface-2)',
                              transition: 'background 0.2s ease',
                            }}
                          />
                        ))}
                      </div>
                      <span style={{
                        fontSize: '12px', color: 'var(--muted)',
                        width: '24px', textAlign: 'right', flexShrink: 0,
                      }}>
                        {skill.score}/5
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </DetailCard>
        )}

        {/* Notes */}
        {entry.notes && (
          <DetailCard title="备注">
            <p style={{ fontSize: '14px', color: 'var(--fg-2)', lineHeight: 1.6 }}>
              {entry.notes}
            </p>
          </DetailCard>
        )}

      </div>
    </div>
  )
}

// ── Reusable components ───────────────────────────────────────────

function DetailCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: '20px',
      padding: '20px 22px',
      marginBottom: '14px',
      boxShadow: 'var(--shadow-sm)',
    }}>
      <p style={{
        fontSize: '11px', fontWeight: 600,
        color: 'var(--muted)', letterSpacing: '0.1em',
        textTransform: 'uppercase', marginBottom: '14px',
      }}>
        {title}
      </p>
      {children}
    </div>
  )
}

function GrammarRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      justifyContent: 'space-between',
      padding: '10px 12px',
      background: 'var(--surface-2)',
      borderRadius: '10px',
    }}>
      <p style={{ fontSize: '13px', color: 'var(--muted)' }}>{label}</p>
      <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--fg)' }}>{value}</p>
    </div>
  )
}