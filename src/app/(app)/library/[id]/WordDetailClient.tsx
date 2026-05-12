'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { WordEntry, LearningState, SkillScore } from '@/types/database'
import { getPosLabel, getGenderLabel, getAdjectiveForms } from '@/lib/vocab/display'
import { speakWord, speakSentence } from '@/lib/vocab/tts'
import { Volume2, Edit2, Archive, CheckCircle, X, Plus, Trash2 } from 'lucide-react'
import { updateWordEntry, archiveWordEntry, completeIncompleteEntry } from '@/app/actions/library'
import type { WordEntryUpdate } from '@/app/actions/library'
import { getDisplayText } from '@/lib/vocab/display'

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
  new: '新词', learning: '学习中', review: '复习中',
  weak: '薄弱', mastered: '已掌握', incomplete: '不完整',
}

const SKILL_ZH: Record<string, string> = {
  meaning: '词义', reverse: '反向', gender: '阴阳性',
  form: '形式', spelling: '拼写', listening: '听写',
}

export function WordDetailClient({
  entry: initialEntry,
  state,
  skills,
}: {
  entry: WordEntry
  state: LearningState | null
  skills: SkillScore[]
}) {
  const router = useRouter()
  const [entry, setEntry] = useState(initialEntry)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [archiving, setArchiving] = useState(false)
  const [confirmArchive, setConfirmArchive] = useState(false)

  // Edit form state
  const [form, setForm] = useState<WordEntryUpdate>({})

  const statusKey = state?.status ?? 'new'
  const statusStyle = STATUS_COLORS[statusKey] ?? STATUS_COLORS.new
  const isIncomplete = entry.is_incomplete

  function startEdit() {
    setForm({
      word: entry.word,
      display_text: getDisplayText(entry),
      english_primary: entry.english_primary,
      english_alternatives: [...entry.english_alternatives],
      chinese_primary: entry.chinese_primary,
      chinese_alternatives: [...entry.chinese_alternatives],
      ipa: entry.ipa,
      notes: entry.notes,
      examples: entry.examples.map(e => ({ ...e })),
      // grammar
      article_indefinite: entry.article_indefinite,
      article_definite: entry.article_definite,
      gender: entry.gender,
      plural_form: entry.plural_form,
      infinitive: entry.infinitive,
      masculine_singular: entry.masculine_singular,
      feminine_singular: entry.feminine_singular,
      masculine_plural: entry.masculine_plural,
      feminine_plural: entry.feminine_plural,
      same_gender_form: entry.same_gender_form,
      is_invariable: entry.is_invariable,
    })
    setEditing(true)
  }

  function cancelEdit() {
    setEditing(false)
    setForm({})
  }

  async function handleSave() {
    setSaving(true)
    if (isIncomplete) {
      const result = await completeIncompleteEntry(entry.id, form)
      if (result.success) {
        // setEntry(prev => ({ ...prev, ...form, is_incomplete: false, incomplete_reasons: [] }))
        setEntry(prev => ({ ...prev, ...form } as WordEntry))
        setEditing(false)
        router.refresh()
        // router.back()
      }
    } else {
      const result = await updateWordEntry(entry.id, form)
      if (result.success) {
        setEntry(prev => ({ ...prev, ...form } as WordEntry))
        setEditing(false)
        // router.back()
      }
    }
    setSaving(false)
  }

  async function handleArchive() {
    setArchiving(true)
    const result = await archiveWordEntry(entry.id)
    if (result.success) {
      router.refresh()
      router.push('/library')
      router.back()
    }
    setArchiving(false)
  }

  function updateForm(key: keyof WordEntryUpdate, value: unknown) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  // ── Render ────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100%', background: 'var(--bg)' }}>
      <div style={{
        maxWidth: '680px', margin: '0 auto',
        padding: '24px 16px 48px',
        width: '100%', boxSizing: 'border-box',
      }}>

        {/* Back + actions */}
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
        }}>
          <button
            onClick={() => router.back()}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '13px', color: 'var(--muted)',
              display: 'flex', alignItems: 'center', gap: '4px',
              padding: '4px 0',
            }}
          >
            ← 返回词库
          </button>

          {!editing && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={startEdit}
                style={{
                  display: 'flex', alignItems: 'center', gap: '5px',
                  padding: '7px 12px',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  fontSize: '13px', color: 'var(--fg-2)',
                  cursor: 'pointer',
                }}
              >
                <Edit2 size={13} />
                编辑
              </button>
              {!confirmArchive ? (
                <button
                  onClick={() => setConfirmArchive(true)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '5px',
                    padding: '7px 12px',
                    background: 'var(--danger-bg)',
                    border: '1px solid var(--danger)',
                    borderRadius: '10px',
                    fontSize: '13px', color: 'var(--danger)',
                    cursor: 'pointer',
                  }}
                >
                  <Archive size={13} />
                  删除
                </button>
              ) : (
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={handleArchive}
                    disabled={archiving}
                    style={{
                      padding: '7px 12px',
                      background: 'var(--danger)',
                      border: 'none',
                      borderRadius: '10px',
                      fontSize: '13px', color: '#fff',
                      cursor: 'pointer', fontWeight: 600,
                    }}
                  >
                    {archiving ? '删除中...' : '确认删除'}
                  </button>
                  <button
                    onClick={() => setConfirmArchive(false)}
                    style={{
                      padding: '7px 12px',
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: '10px',
                      fontSize: '13px', color: 'var(--muted)',
                      cursor: 'pointer',
                    }}
                  >
                    取消
                  </button>
                </div>
              )}
            </div>
          )}

          {editing && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={cancelEdit}
                style={{
                  padding: '7px 14px',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  fontSize: '13px', color: 'var(--muted)',
                  cursor: 'pointer',
                }}
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  padding: '7px 14px',
                  background: 'var(--accent)', color: 'var(--accent-fg)',
                  border: 'none', borderRadius: '10px',
                  fontSize: '13px', fontWeight: 600,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.6 : 1,
                  display: 'flex', alignItems: 'center', gap: '5px',
                }}
              >
                <CheckCircle size={13} />
                {saving ? '保存中...' : isIncomplete ? '保存并激活' : '保存'}
              </button>
            </div>
          )}
        </div>

        {/* Incomplete warning */}
        {isIncomplete && !editing && (
          <div style={{
            padding: '12px 16px',
            background: 'var(--warning-bg)',
            border: '1px solid var(--warning)',
            borderRadius: '14px',
            marginBottom: '16px',
            fontSize: '13px', color: 'var(--warning)',
            lineHeight: 1.5,
          }}>
            ⚠ 此词条不完整，无法出现在学习/复习中。
            {entry.incomplete_reasons.length > 0 && (
              <ul style={{ marginTop: '6px', paddingLeft: '16px' }}>
                {entry.incomplete_reasons.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            )}
            <button
              onClick={startEdit}
              style={{
                marginTop: '8px', padding: '6px 12px',
                background: 'var(--warning)', color: '#fff',
                border: 'none', borderRadius: '8px',
                fontSize: '12px', fontWeight: 600,
                cursor: 'pointer', display: 'block',
              }}
            >
              立即完善
            </button>
          </div>
        )}

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
            justifyContent: 'space-between', gap: '12px', marginBottom: '10px',
          }}>
            <button
              onClick={() => speakWord(entry)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}
            >
              <span className="font-display" style={{
                fontSize: 'clamp(24px, 5vw, 34px)',
                fontWeight: 700, color: 'var(--fg)', lineHeight: 1.2,
              }}>
                {toDisplayCase(getDisplayText(entry))}
              </span>
              <Volume2 size={16} style={{ color: 'var(--muted)', marginLeft: '8px', verticalAlign: 'middle' }} />
            </button>

            <span style={{
              padding: '4px 12px',
              background: statusStyle.bg,
              border: `1px solid ${statusStyle.color}`,
              borderRadius: '100px',
              fontSize: '12px', fontWeight: 600,
              color: statusStyle.color, flexShrink: 0,
            }}>
              {STATUS_ZH[statusKey] ?? statusKey}
            </span>
          </div>

          <p style={{ fontSize: '13px', color: 'var(--muted)' }}>
            {getPosLabel(entry.part_of_speech, 'zh')}
            {entry.gender ? ` · ${getGenderLabel(entry.gender, 'zh')}` : ''}
            {entry.ipa ? <span style={{ fontFamily: 'monospace' }}> · {entry.ipa}</span> : ''}
          </p>
        </div>

        {/* Meanings */}
        <DetailCard title="释义">
          {editing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* 新增：修改词本身 */}
              <EditField label="法语单词">
                <input
                  value={form.word ?? entry.word}
                  onChange={e => updateForm('word', e.target.value)}
                  style={inputStyle}
                  placeholder={entry.word}
                />
              </EditField>
              <EditField label="显示文本（大写）">
                <input
                  value={form.display_text ?? getDisplayText(entry)}
                  onChange={e => updateForm('display_text', e.target.value.toUpperCase())}
                  style={inputStyle}
                  placeholder={getDisplayText(entry)}
                />
              </EditField>
              <EditField label="英文主释义">
                <input
                  value={form.english_primary ?? ''}
                  onChange={e => updateForm('english_primary', e.target.value)}
                  style={inputStyle}
                />
              </EditField>
              <EditField label="英文补充释义（逗号分隔）">
                <input
                  value={(form.english_alternatives ?? []).join(', ')}
                  onChange={e => updateForm('english_alternatives', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                  style={inputStyle}
                />
              </EditField>
              <EditField label="中文主释义">
                <input
                  value={form.chinese_primary ?? ''}
                  onChange={e => updateForm('chinese_primary', e.target.value)}
                  style={inputStyle}
                />
              </EditField>
              <EditField label="中文补充释义（逗号分隔）">
                <input
                  value={(form.chinese_alternatives ?? []).join(', ')}
                  onChange={e => updateForm('chinese_alternatives', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                  style={inputStyle}
                />
              </EditField>
              <EditField label="IPA">
                <input
                  value={form.ipa ?? ''}
                  onChange={e => updateForm('ipa', e.target.value)}
                  style={inputStyle}
                  placeholder="/a.bi.tyd/"
                />
              </EditField>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
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
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
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
          )}
        </DetailCard>

        {/* Grammar */}
        {(entry.part_of_speech === 'noun' ||
          entry.part_of_speech === 'adjective' ||
          entry.part_of_speech === 'verb') && (
          <DetailCard title="语法">
            {editing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {entry.part_of_speech === 'noun' && (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <EditField label="不定冠词">
                        <select
                          value={form.article_indefinite ?? ''}
                          onChange={e => updateForm('article_indefinite', e.target.value)}
                          style={inputStyle}
                        >
                          <option value="">选择</option>
                          <option value="un">un</option>
                          <option value="une">une</option>
                        </select>
                      </EditField>
                      <EditField label="性别">
                        <select
                          value={form.gender ?? ''}
                          onChange={e => updateForm('gender', e.target.value)}
                          style={inputStyle}
                        >
                          <option value="">选择</option>
                          <option value="masculine">阳性</option>
                          <option value="feminine">阴性</option>
                        </select>
                      </EditField>
                    </div>
                    <EditField label="定冠词">
                      <input
                        value={form.article_definite ?? ''}
                        onChange={e => updateForm('article_definite', e.target.value)}
                        style={inputStyle}
                        placeholder="le / la / l'"
                      />
                    </EditField>
                    <EditField label="复数形式">
                      <input
                        value={form.plural_form ?? ''}
                        onChange={e => updateForm('plural_form', e.target.value)}
                        style={inputStyle}
                      />
                    </EditField>
                  </>
                )}

                {entry.part_of_speech === 'verb' && (
                  <EditField label="不定式">
                    <input
                      value={form.infinitive ?? ''}
                      onChange={e => updateForm('infinitive', e.target.value)}
                      style={inputStyle}
                    />
                  </EditField>
                )}

                {entry.part_of_speech === 'adjective' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    {[
                      { key: 'masculine_singular', label: '阳性单数' },
                      { key: 'feminine_singular', label: '阴性单数' },
                      { key: 'masculine_plural', label: '阳性复数' },
                      { key: 'feminine_plural', label: '阴性复数' },
                    ].map(f => (
                      <EditField key={f.key} label={f.label}>
                        <input
                          value={(form as Record<string, string>)[f.key] ?? ''}
                          onChange={e => updateForm(f.key as keyof WordEntryUpdate, e.target.value)}
                          style={inputStyle}
                        />
                      </EditField>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <>
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
                    {entry.plural_form && <GrammarRow label="复数" value={entry.plural_form} />}
                    {entry.gender && <GrammarRow label="阴阳性" value={getGenderLabel(entry.gender, 'zh')} />}
                  </div>
                )}
                {entry.part_of_speech === 'verb' && (
                  <GrammarRow label="不定式" value={entry.infinitive} />
                )}
                {entry.part_of_speech === 'adjective' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {getAdjectiveForms(entry).map(adjform => (
                      <button
                        key={adjform.label}
                        onClick={() => speakSentence(adjform.text)}
                        style={{
                          textAlign: 'left', padding: '12px 14px',
                          background: 'var(--surface-2)',
                          border: '1px solid var(--border)',
                          borderRadius: '12px', cursor: 'pointer',
                        }}
                      >
                        {/* <p style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '4px' }}>{form.label}</p>
                        <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--fg)' }}>{form.text}</p> */}
                        <p style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '4px' }}>{adjform.label}</p>
                        <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--fg)' }}>{adjform.text}</p>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </DetailCard>
        )}

        {/* Examples */}
        <DetailCard title="例句">
          {editing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {(form.examples ?? []).map((ex, i) => (
                <div
                  key={i}
                  style={{
                    padding: '12px',
                    background: 'var(--surface-2)',
                    borderRadius: '12px',
                    position: 'relative',
                  }}
                >
                  <button
                    onClick={() => {
                      const arr = [...(form.examples ?? [])]
                      arr.splice(i, 1)
                      updateForm('examples', arr)
                    }}
                    style={{
                      position: 'absolute', top: '8px', right: '8px',
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--muted)', padding: '2px',
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingRight: '20px' }}>
                    <input
                      value={ex.fr}
                      onChange={e => {
                        const arr = [...(form.examples ?? [])]
                        arr[i] = { ...arr[i], fr: e.target.value }
                        updateForm('examples', arr)
                      }}
                      placeholder="法语例句"
                      style={{ ...inputStyle, fontSize: '13px' }}
                    />
                    <input
                      value={ex.en}
                      onChange={e => {
                        const arr = [...(form.examples ?? [])]
                        arr[i] = { ...arr[i], en: e.target.value }
                        updateForm('examples', arr)
                      }}
                      placeholder="English translation"
                      style={{ ...inputStyle, fontSize: '13px' }}
                    />
                    <input
                      value={ex.zh}
                      onChange={e => {
                        const arr = [...(form.examples ?? [])]
                        arr[i] = { ...arr[i], zh: e.target.value }
                        updateForm('examples', arr)
                      }}
                      placeholder="中文翻译"
                      style={{ ...inputStyle, fontSize: '13px' }}
                    />
                  </div>
                </div>
              ))}
              <button
                onClick={() => updateForm('examples', [...(form.examples ?? []), { fr: '', en: '', zh: '' }])}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '8px 14px',
                  background: 'var(--surface-2)',
                  border: '1px dashed var(--border)',
                  borderRadius: '10px',
                  fontSize: '13px', color: 'var(--muted)',
                  cursor: 'pointer',
                }}
              >
                <Plus size={13} />
                添加例句
              </button>
            </div>
          ) : entry.examples.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {entry.examples.map((ex, i) => (
                <div key={i}>
                  <button
                    onClick={() => speakSentence(ex.fr)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      padding: 0, textAlign: 'left', display: 'block', width: '100%',
                    }}
                  >
                    <p style={{ fontSize: '15px', fontWeight: 500, color: 'var(--accent)', lineHeight: 1.5, marginBottom: '4px' }}>
                      {ex.fr}
                    </p>
                  </button>
                  <p style={{ fontSize: '13px', color: 'var(--fg-2)', marginBottom: '2px' }}>{ex.en}</p>
                  <p style={{ fontSize: '13px', color: 'var(--muted)' }}>{ex.zh}</p>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: '13px', color: 'var(--muted)' }}>暂无例句</p>
          )}
        </DetailCard>

        {/* Notes */}
        <DetailCard title="备注">
          {editing ? (
            <textarea
              value={form.notes ?? ''}
              onChange={e => updateForm('notes', e.target.value)}
              rows={3}
              placeholder="添加备注..."
              style={{
                ...inputStyle,
                resize: 'vertical',
                width: '100%',
                lineHeight: 1.6,
              }}
            />
          ) : entry.notes ? (
            <p style={{ fontSize: '14px', color: 'var(--fg-2)', lineHeight: 1.6 }}>{entry.notes}</p>
          ) : (
            <p style={{ fontSize: '13px', color: 'var(--muted)' }}>暂无备注</p>
          )}
        </DetailCard>

        {/* Learning progress (view only) */}
        {state && (
          <DetailCard title="学习进度">
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr',
              gap: '10px', marginBottom: skills.length > 0 ? '16px' : 0,
            }}>
              <div style={{ padding: '12px', background: 'var(--surface-2)', borderRadius: '12px' }}>
                <p style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '4px' }}>状态</p>
                <p style={{ fontSize: '14px', fontWeight: 700, color: statusStyle.color }}>
                  {STATUS_ZH[statusKey] ?? statusKey}
                </p>
              </div>
              <div style={{ padding: '12px', background: 'var(--surface-2)', borderRadius: '12px' }}>
                <p style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '4px' }}>等级</p>
                <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--fg)' }}>{state.overall_level} / 5</p>
              </div>
              {state.next_review_at && (
                <div style={{ padding: '12px', background: 'var(--surface-2)', borderRadius: '12px', gridColumn: '1 / -1' }}>
                  <p style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '4px' }}>下次复习</p>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--fg)' }}>{state.next_review_at}</p>
                </div>
              )}
            </div>

            {skills.length > 0 && (
              <div>
                <p style={{
                  fontSize: '11px', fontWeight: 600, color: 'var(--muted)',
                  letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '12px',
                }}>
                  技能
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {skills.map(skill => (
                    <div key={skill.id} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '13px', color: 'var(--fg-2)', width: '48px', flexShrink: 0 }}>
                        {SKILL_ZH[skill.skill_type] ?? skill.skill_type}
                      </span>
                      <div style={{ flex: 1, display: 'flex', gap: '4px' }}>
                        {[1, 2, 3, 4, 5].map(n => (
                          <div key={n} style={{
                            flex: 1, height: '6px', borderRadius: '3px',
                            background: n <= skill.score ? 'var(--accent)' : 'var(--surface-2)',
                          }} />
                        ))}
                      </div>
                      <span style={{ fontSize: '12px', color: 'var(--muted)', width: '24px', textAlign: 'right', flexShrink: 0 }}>
                        {skill.score}/5
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </DetailCard>
        )}

      </div>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  background: 'var(--bg)',
  border: '1.5px solid var(--border)',
  borderRadius: '10px',
  fontSize: '14px',
  color: 'var(--fg)',
  outline: 'none',
  boxSizing: 'border-box',
}

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
        fontSize: '11px', fontWeight: 600, color: 'var(--muted)',
        letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '14px',
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
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 12px',
      background: 'var(--surface-2)',
      borderRadius: '10px',
    }}>
      <p style={{ fontSize: '13px', color: 'var(--muted)' }}>{label}</p>
      <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--fg)' }}>{value}</p>
    </div>
  )
}

function EditField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '6px', fontWeight: 500 }}>
        {label}
      </p>
      {children}
    </div>
  )
}