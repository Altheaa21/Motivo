'use client'

import { useRouter } from 'next/navigation'
import type { WordEntry, LearningState, SkillScore } from '@/types/database'
import { getPosLabel, getGenderLabel, getAdjectiveForms } from '@/lib/vocab/display'
import { speakWord, speakSentence } from '@/lib/vocab/tts'

const STATUS_COLORS: Record<string, string> = {
  new: 'var(--accent)',
  learning: 'var(--warning)',
  review: 'var(--success)',
  weak: 'var(--danger)',
  mastered: '#a78bfa',
  incomplete: 'var(--muted)',
}

const STATUS_ZH: Record<string, string> = {
  new: '新词',
  learning: '学习中',
  review: '复习',
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
  const statusColor = STATUS_COLORS[state?.status ?? 'new'] ?? 'var(--muted)'

  return (
    <div className="p-4 max-w-2xl mx-auto">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="text-sm mb-4 flex items-center gap-1"
        style={{ color: 'var(--muted)' }}
      >
        ← 返回
      </button>

      {/* Header */}
      <div className="rounded-lg p-4 mb-4" style={{ background: 'var(--surface)' }}>
        <div className="flex items-start justify-between gap-2 mb-1">
          <button
            onClick={() => speakWord(entry)}
            className="text-2xl font-bold text-left hover:opacity-80 transition-opacity"
          >
            {entry.display_text}
          </button>
          <span
            className="text-xs px-2 py-1 rounded-full shrink-0 mt-1"
            style={{ background: statusColor + '22', color: statusColor }}
          >
            {STATUS_ZH[state?.status ?? 'new'] ?? state?.status}
          </span>
        </div>

        <p className="text-sm mb-1" style={{ color: 'var(--muted)' }}>
          {getPosLabel(entry.part_of_speech, 'zh')}
          {entry.gender ? ` · ${getGenderLabel(entry.gender, 'zh')}` : ''}
          {entry.ipa ? ` · ${entry.ipa}` : ''}
        </p>
      </div>

      {/* Meanings */}
      <div className="rounded-lg p-4 mb-4" style={{ background: 'var(--surface)' }}>
        <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--muted)' }}>
          释义
        </p>
        <div className="space-y-1">
          <p className="text-sm">🇬🇧 {entry.english_primary}
            {entry.english_alternatives.length > 0 && (
              <span style={{ color: 'var(--muted)' }}> · {entry.english_alternatives.join(', ')}</span>
            )}
          </p>
          <p className="text-sm">🇨🇳 {entry.chinese_primary}
            {entry.chinese_alternatives.length > 0 && (
              <span style={{ color: 'var(--muted)' }}> · {entry.chinese_alternatives.join(', ')}</span>
            )}
          </p>
        </div>
      </div>

      {/* Grammar */}
      {(entry.part_of_speech === 'noun' || entry.part_of_speech === 'adjective' || entry.part_of_speech === 'verb') && (
        <div className="rounded-lg p-4 mb-4" style={{ background: 'var(--surface)' }}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--muted)' }}>
            语法
          </p>

          {entry.part_of_speech === 'noun' && (
            <div className="space-y-1 text-sm">
              {entry.article_indefinite && (
                <p>不定冠词：<strong>{entry.article_indefinite} {entry.word}</strong></p>
              )}
              {entry.article_definite && (
                <p>定冠词：<strong>{entry.article_definite}{entry.article_definite.endsWith("'") ? '' : ' '}{entry.word}</strong></p>
              )}
              {entry.plural_form && (
                <p>复数：<strong>{entry.plural_form}</strong></p>
              )}
              {entry.gender && (
                <p>阴阳性：<strong>{getGenderLabel(entry.gender, 'zh')}</strong></p>
              )}
            </div>
          )}

          {entry.part_of_speech === 'verb' && (
            <p className="text-sm">不定式：<strong>{entry.infinitive}</strong></p>
          )}

          {entry.part_of_speech === 'adjective' && (
            <div className="grid grid-cols-2 gap-2 text-sm">
              {getAdjectiveForms(entry).map(form => (
                <button
                  key={form.label}
                  onClick={() => speakSentence(form.text)}
                  className="text-left p-2 rounded hover:opacity-80 transition-opacity"
                  style={{ background: 'var(--surface-2)' }}
                >
                  <span className="text-xs block" style={{ color: 'var(--muted)' }}>{form.label}</span>
                  <strong>{form.text}</strong>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Examples */}
      {entry.examples.length > 0 && (
        <div className="rounded-lg p-4 mb-4" style={{ background: 'var(--surface)' }}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--muted)' }}>
            例句
          </p>
          <div className="space-y-3">
            {entry.examples.map((ex, i) => (
              <div key={i}>
                <button
                  onClick={() => speakSentence(ex.fr)}
                  className="text-sm font-medium text-left hover:opacity-80 transition-opacity block"
                  style={{ color: 'var(--accent)' }}
                >
                  {ex.fr}
                </button>
                <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{ex.en}</p>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>{ex.zh}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Learning status */}
      {state && (
        <div className="rounded-lg p-4 mb-4" style={{ background: 'var(--surface)' }}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--muted)' }}>
            学习进度
          </p>
          <div className="space-y-1 text-sm">
            <p>状态：<strong style={{ color: statusColor }}>{STATUS_ZH[state.status] ?? state.status}</strong></p>
            <p>等级：<strong>{state.overall_level}</strong></p>
            {state.next_review_at && (
              <p>下次复习：<strong>{state.next_review_at}</strong></p>
            )}
          </div>

          {skills.length > 0 && (
            <div className="mt-3">
              <p className="text-xs mb-2" style={{ color: 'var(--muted)' }}>技能</p>
              <div className="space-y-1.5">
                {skills.map(skill => (
                  <div key={skill.id} className="flex items-center gap-2">
                    <span className="text-xs w-12" style={{ color: 'var(--muted)' }}>
                      {SKILL_ZH[skill.skill_type] ?? skill.skill_type}
                    </span>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map(n => (
                        <div
                          key={n}
                          className="w-4 h-1.5 rounded-full"
                          style={{
                            background: n <= skill.score ? 'var(--accent)' : 'var(--surface-2)',
                          }}
                        />
                      ))}
                    </div>
                    <span className="text-xs" style={{ color: 'var(--muted)' }}>
                      {skill.score}/5
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Notes */}
      {entry.notes && (
        <div className="rounded-lg p-4 mb-4" style={{ background: 'var(--surface)' }}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--muted)' }}>
            备注
          </p>
          <p className="text-sm">{entry.notes}</p>
        </div>
      )}
    </div>
  )
}