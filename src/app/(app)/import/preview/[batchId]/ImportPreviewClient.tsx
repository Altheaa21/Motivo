'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { applyImport } from '@/app/actions/import'
import type { ItemAction } from '@/app/actions/import'
import type { ImportBatch, ImportItem } from '@/types/database'
import { CheckCircle, AlertTriangle, Info, XCircle, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'

function str(v: unknown): string {
  return (v as string) ?? ''
}

const STATUS_CONFIG: Record<string, {
  label: string; color: string; bg: string; border: string; icon: React.ReactNode
}> = {
  new: { label: '新词', color: 'var(--accent)', bg: '#f5f0e8', border: 'var(--accent-light)', icon: <CheckCircle size={13} /> },
  exact_duplicate: { label: '完全重复', color: 'var(--muted)', bg: 'var(--surface-2)', border: 'var(--border)', icon: <Info size={13} /> },
  possible_duplicate: { label: '可能重复', color: 'var(--warning)', bg: 'var(--warning-bg)', border: 'var(--warning)', icon: <AlertCircle size={13} /> },
  conflict: { label: '冲突', color: 'var(--danger)', bg: 'var(--danger-bg)', border: 'var(--danger)', icon: <XCircle size={13} /> },
  incomplete: { label: '不完整', color: 'var(--dusty-blue)', bg: '#eef2f7', border: 'var(--dusty-blue)', icon: <AlertTriangle size={13} /> },
}

const ACTION_OPTIONS: Record<string, { value: string; label: string }[]> = {
  new: [{ value: 'add', label: '添加' }, { value: 'skip', label: '跳过' }],
  exact_duplicate: [{ value: 'skip', label: '跳过' }, { value: 'merge', label: '合并' }, { value: 'add_as_new', label: '另存新词' }],
  possible_duplicate: [{ value: 'merge', label: '合并' }, { value: 'add_as_new', label: '另存新词' }, { value: 'skip', label: '跳过' }],
  conflict: [{ value: 'add_as_new', label: '另存新词' }, { value: 'skip', label: '跳过' }],
  incomplete: [{ value: 'import_as_incomplete', label: '导入（不完整）' }, { value: 'skip', label: '跳过' }],
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '7px 10px',
  background: 'var(--bg)',
  border: '1.5px solid var(--border)',
  borderRadius: '8px',
  fontSize: '13px', color: 'var(--fg)',
  outline: 'none', boxSizing: 'border-box',
}

// 可编辑的字段列表（从 raw_entry 里读取和修改）
interface EditableFields {
  displayText: string
  word: string
  englishPrimary: string
  chinesePrimary: string
  ipa: string
  notes: string
  // noun
  articleIndefinite: string
  articleDefinite: string
  gender: string
  pluralForm: string
  // verb
  infinitive: string
  // adjective
  masculineSingular: string
  feminineSingular: string
  masculinePlural: string
  femininePlural: string
}

function extractEditable(raw: Record<string, unknown>): EditableFields {
  const english = raw.english as Record<string, unknown> ?? {}
  const chinese = raw.chinese as Record<string, unknown> ?? {}
  const forms = raw.forms as Record<string, unknown> ?? {}
  return {
    displayText: (raw.displayText as string) ?? '',
    word: (raw.word as string) ?? '',
    englishPrimary: (english.primary as string) ?? '',
    chinesePrimary: (chinese.primary as string) ?? '',
    ipa: (raw.ipa as string) ?? '',
    notes: (raw.notes as string) ?? '',
    articleIndefinite: (raw.articleIndefinite as string) ?? '',
    articleDefinite: (raw.articleDefinite as string) ?? '',
    gender: (raw.gender as string) ?? '',
    pluralForm: (raw.pluralForm as string) ?? '',
    infinitive: (raw.infinitive as string) ?? '',
    masculineSingular: (forms.masculineSingular as string) ?? (raw.masculineSingular as string) ?? '',
    feminineSingular: (forms.feminineSingular as string) ?? (raw.feminineSingular as string) ?? '',
    masculinePlural: (forms.masculinePlural as string) ?? (raw.masculinePlural as string) ?? '',
    femininePlural: (forms.femininePlural as string) ?? (raw.femininePlural as string) ?? '',
  }
}

function mergeEditable(raw: Record<string, unknown>, edits: EditableFields): Record<string, unknown> {
  const updated = { ...raw }
  updated.displayText = edits.displayText
  updated.word = edits.word
  updated.ipa = edits.ipa
  updated.notes = edits.notes
  updated.english = { ...(raw.english as Record<string, unknown> ?? {}), primary: edits.englishPrimary }
  updated.chinese = { ...(raw.chinese as Record<string, unknown> ?? {}), primary: edits.chinesePrimary }

  const pos = raw.partOfSpeech as string
  if (pos === 'noun') {
    updated.articleIndefinite = edits.articleIndefinite
    updated.articleDefinite = edits.articleDefinite
    updated.gender = edits.gender
    updated.pluralForm = edits.pluralForm
  }
  if (pos === 'verb') {
    updated.infinitive = edits.infinitive
  }
  if (pos === 'adjective') {
    updated.forms = {
      ...(raw.forms as Record<string, unknown> ?? {}),
      masculineSingular: edits.masculineSingular,
      feminineSingular: edits.feminineSingular,
      masculinePlural: edits.masculinePlural,
      femininePlural: edits.femininePlural,
    }
  }
  return updated
}

export function ImportPreviewClient({
  batch,
  items: initialItems,
}: {
  batch: ImportBatch
  items: ImportItem[]
}) {
  const router = useRouter()
  const [items, setItems] = useState(initialItems)
  const [actions, setActions] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    for (const item of initialItems) {
      init[item.id] = item.recommended_action === 'manual_review' ? 'skip'
        : item.recommended_action === 'import_as_incomplete' ? 'import_as_incomplete'
        : item.recommended_action
    }
    return init
  })
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [editing, setEditing] = useState<Record<string, boolean>>({})
  const [editForms, setEditForms] = useState<Record<string, EditableFields>>({})
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [result, setResult] = useState<{ addedCount: number; mergedCount: number; skippedCount: number } | null>(null)

  const hasConflicts = items.some(i => i.detected_status === 'conflict')

  function toggleExpand(id: string) {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }))
  }

  function startEdit(item: ImportItem) {
    const raw = item.raw_entry as Record<string, unknown>
    setEditForms(prev => ({ ...prev, [item.id]: extractEditable(raw) }))
    setEditing(prev => ({ ...prev, [item.id]: true }))
    setExpanded(prev => ({ ...prev, [item.id]: true }))
  }

  function cancelEdit(id: string) {
    setEditing(prev => ({ ...prev, [id]: false }))
  }

  function saveEdit(item: ImportItem) {
    const edits = editForms[item.id]
    if (!edits) return
    const raw = item.raw_entry as Record<string, unknown>
    const updated = mergeEditable(raw, edits)
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, raw_entry: updated } : i))
    setEditing(prev => ({ ...prev, [item.id]: false }))
  }

  function updateEditForm(id: string, key: keyof EditableFields, value: string) {
    setEditForms(prev => ({ ...prev, [id]: { ...prev[id], [key]: value } }))
  }

  function applySafeRecommendations() {
    const updated: Record<string, string> = {}
    for (const item of items) {
      if (item.detected_status === 'conflict') updated[item.id] = actions[item.id]
      else if (item.recommended_action === 'manual_review') updated[item.id] = 'skip'
      else if (item.recommended_action === 'import_as_incomplete') updated[item.id] = 'import_as_incomplete'
      else updated[item.id] = item.recommended_action
    }
    setActions(updated)
  }

  async function handleApply() {
    setLoading(true)
    const itemActions: ItemAction[] = items.map(item => ({
      itemId: item.id,
      action: actions[item.id] as ItemAction['action'],
      rawEntry: item.raw_entry,
    }))
    const res = await applyImport(batch.id, itemActions)
    if (res.success) {
      setResult({ addedCount: res.addedCount ?? 0, mergedCount: res.mergedCount ?? 0, skippedCount: res.skippedCount ?? 0 })
      setDone(true)
    }
    setLoading(false)
  }

  // ── Done ──────────────────────────────────────────────────────
  if (done && result) {
    return (
      <div style={{ minHeight: '100%', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
        <div style={{ maxWidth: '400px', width: '100%', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '24px', padding: '48px 36px', textAlign: 'center', boxShadow: 'var(--shadow-md)' }}>
          <div style={{ width: '64px', height: '64px', background: 'var(--success-bg)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: '28px' }}>✓</div>
          <h2 className="font-display" style={{ fontSize: '22px', fontWeight: 700, color: 'var(--fg)', marginBottom: '16px' }}>导入完成</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '28px' }}>
            {[
              { label: '已添加', value: result.addedCount, color: 'var(--success)' },
              { label: '已合并', value: result.mergedCount, color: 'var(--accent)' },
              { label: '已跳过', value: result.skippedCount, color: 'var(--muted)' },
            ].map(s => (
              <div key={s.label} style={{ padding: '12px 8px', background: 'var(--surface-2)', borderRadius: '12px' }}>
                <p style={{ fontSize: '24px', fontWeight: 700, color: s.color, lineHeight: 1, marginBottom: '4px' }}>{s.value}</p>
                <p style={{ fontSize: '11px', color: 'var(--muted)' }}>{s.label}</p>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button onClick={() => router.push('/learn')} style={{ width: '100%', padding: '13px', background: 'var(--accent)', color: 'var(--accent-fg)', border: 'none', borderRadius: '14px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>去学习新词</button>
            <button onClick={() => router.push('/today')} style={{ width: '100%', padding: '13px', background: 'transparent', color: 'var(--muted)', border: 'none', borderRadius: '14px', fontSize: '14px', cursor: 'pointer' }}>回到今日</button>
          </div>
        </div>
      </div>
    )
  }

  // ── Preview ───────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100%', background: 'var(--bg)' }}>
      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '24px 16px 48px', width: '100%', boxSizing: 'border-box' }}>

        <div style={{ marginBottom: '24px' }}>
          <h1 className="font-display" style={{ fontSize: 'clamp(22px, 4vw, 30px)', fontWeight: 700, color: 'var(--fg)', marginBottom: '8px' }}>导入预览</h1>
          <p style={{ fontSize: '14px', color: 'var(--muted)' }}>确认每个词条的处理方式，可以展开查看详情或编辑内容。</p>
        </div>

        {/* Summary */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '20px', padding: '20px 22px', marginBottom: '16px', boxShadow: 'var(--shadow-sm)' }}>
          <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '14px' }}>总览</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: '10px' }}>
            {[
              { label: '总计', value: batch.total_entries, color: 'var(--fg)' },
              { label: '新词', value: batch.new_count, color: 'var(--accent)' },
              { label: '完全重复', value: batch.exact_duplicate_count, color: 'var(--muted)' },
              { label: '可能重复', value: batch.possible_duplicate_count, color: 'var(--warning)' },
              { label: '冲突', value: batch.conflict_count, color: 'var(--danger)' },
              { label: '不完整', value: batch.incomplete_count, color: 'var(--dusty-blue)' },
            ].map(s => (
              <div key={s.label} style={{ padding: '10px 8px', background: 'var(--surface-2)', borderRadius: '12px', textAlign: 'center' }}>
                <p style={{ fontSize: '22px', fontWeight: 700, color: s.color, lineHeight: 1, marginBottom: '4px' }}>{s.value}</p>
                <p style={{ fontSize: '11px', color: 'var(--muted)' }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {hasConflicts && (
          <div style={{ padding: '12px 16px', background: 'var(--danger-bg)', border: '1px solid var(--danger)', borderRadius: '14px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--danger)' }}>
            <XCircle size={16} style={{ flexShrink: 0 }} />
            {batch.conflict_count} 个冲突需要手动处理。
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', flexWrap: 'wrap' }}>
          <button onClick={applySafeRecommendations} style={{ flex: 1, minWidth: '140px', padding: '12px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', fontSize: '13px', fontWeight: 600, color: 'var(--fg)', cursor: 'pointer', boxShadow: 'var(--shadow-sm)' }}>
            应用安全建议
          </button>
          <button onClick={() => router.push('/import')} style={{ padding: '12px 20px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '14px', fontSize: '13px', color: 'var(--muted)', cursor: 'pointer' }}>
            取消
          </button>
        </div>

        {/* Item list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
          {items.map(item => {
            const raw = item.raw_entry as Record<string, unknown>
            const english = raw.english as Record<string, unknown> ?? {}
            const chinese = raw.chinese as Record<string, unknown> ?? {}
            const forms = raw.forms as Record<string, unknown> ?? {}
            const pos = raw.partOfSpeech as string
            const statusCfg = STATUS_CONFIG[item.detected_status] ?? STATUS_CONFIG.new
            const availableActions = ACTION_OPTIONS[item.detected_status] ?? [{ value: 'skip', label: '跳过' }]
            const currentAction = actions[item.id]
            const isExpanded = expanded[item.id]
            const isEditing = editing[item.id]
            const editForm = editForms[item.id]

            return (
              <div key={item.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '18px', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>

                {/* Card header — always visible */}
                <div style={{ padding: '16px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 10px', background: statusCfg.bg, border: `1px solid ${statusCfg.border}`, borderRadius: '100px', fontSize: '11px', fontWeight: 600, color: statusCfg.color }}>
                      {statusCfg.icon}{statusCfg.label}
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--muted)' }}>{pos}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '10px' }}>
                    <div style={{ minWidth: 0 }}>
                      <p className="font-display" style={{ fontSize: '17px', fontWeight: 700, color: 'var(--fg)', marginBottom: '3px' }}>
                        {(raw.displayText as string)?.toLowerCase().replace(/^./, c => c.toUpperCase())}
                      </p>
                      <p style={{ fontSize: '13px', color: 'var(--fg-2)' }}>
                        {english.primary as string}
                        <span style={{ color: 'var(--border-2)', margin: '0 6px' }}>·</span>
                        {chinese.primary as string}
                      </p>
                    </div>
                    <button
                      onClick={() => toggleExpand(item.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: '4px', flexShrink: 0, display: 'flex', alignItems: 'center' }}
                    >
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>

                  {/* Issues */}
                  {item.issues && (item.issues as string[]).length > 0 && (
                    <div style={{ padding: '8px 12px', background: 'var(--warning-bg)', border: '1px solid var(--warning)', borderRadius: '10px', marginBottom: '10px' }}>
                      {(item.issues as string[]).map((issue, i) => (
                        <p key={i} style={{ fontSize: '12px', color: 'var(--warning)', lineHeight: 1.5 }}>{issue}</p>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {availableActions.map(act => (
                      <button
                        key={act.value}
                        onClick={() => setActions(prev => ({ ...prev, [item.id]: act.value }))}
                        style={{ padding: '6px 12px', borderRadius: '10px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', border: `1.5px solid ${currentAction === act.value ? 'var(--accent)' : 'var(--border)'}`, background: currentAction === act.value ? 'var(--accent)' : 'var(--surface-2)', color: currentAction === act.value ? 'var(--accent-fg)' : 'var(--fg-2)', transition: 'all 0.15s ease' }}
                      >
                        {act.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid var(--border)', padding: '16px 18px', background: 'var(--surface-2)' }}>
                    {isEditing && editForm ? (
                      // ── Edit mode ──────────────────────────────
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px' }}>编辑词条</p>

                        <EditRow label="法语单词（裸词）">
                          <input value={editForm.word} onChange={e => updateEditForm(item.id, 'word', e.target.value)} style={inputStyle} />
                        </EditRow>
                        <EditRow label="显示文本">
                          <input value={editForm.displayText} onChange={e => updateEditForm(item.id, 'displayText', e.target.value.toUpperCase())} style={inputStyle} />
                        </EditRow>
                        <EditRow label="英文释义">
                          <input value={editForm.englishPrimary} onChange={e => updateEditForm(item.id, 'englishPrimary', e.target.value)} style={inputStyle} />
                        </EditRow>
                        <EditRow label="中文释义">
                          <input value={editForm.chinesePrimary} onChange={e => updateEditForm(item.id, 'chinesePrimary', e.target.value)} style={inputStyle} />
                        </EditRow>
                        <EditRow label="IPA">
                          <input value={editForm.ipa} onChange={e => updateEditForm(item.id, 'ipa', e.target.value)} style={inputStyle} placeholder="/a.bi.tyd/" />
                        </EditRow>

                        {pos === 'noun' && (
                          <>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                              <EditRow label="不定冠词">
                                <select value={editForm.articleIndefinite} onChange={e => updateEditForm(item.id, 'articleIndefinite', e.target.value)} style={inputStyle}>
                                  <option value="">选择</option>
                                  <option value="un">un</option>
                                  <option value="une">une</option>
                                </select>
                              </EditRow>
                              <EditRow label="性别">
                                <select value={editForm.gender} onChange={e => updateEditForm(item.id, 'gender', e.target.value)} style={inputStyle}>
                                  <option value="">选择</option>
                                  <option value="masculine">阳性</option>
                                  <option value="feminine">阴性</option>
                                </select>
                              </EditRow>
                            </div>
                            <EditRow label="定冠词">
                              <input value={editForm.articleDefinite} onChange={e => updateEditForm(item.id, 'articleDefinite', e.target.value)} style={inputStyle} placeholder="le / la / l'" />
                            </EditRow>
                            <EditRow label="复数">
                              <input value={editForm.pluralForm} onChange={e => updateEditForm(item.id, 'pluralForm', e.target.value)} style={inputStyle} />
                            </EditRow>
                          </>
                        )}

                        {pos === 'verb' && (
                          <EditRow label="不定式">
                            <input value={editForm.infinitive} onChange={e => updateEditForm(item.id, 'infinitive', e.target.value)} style={inputStyle} />
                          </EditRow>
                        )}

                        {pos === 'adjective' && (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            {([
                              { key: 'masculineSingular', label: '阳性单数' },
                              { key: 'feminineSingular', label: '阴性单数' },
                              { key: 'masculinePlural', label: '阳性复数' },
                              { key: 'femininePlural', label: '阴性复数' },
                            ] as { key: keyof EditableFields; label: string }[]).map(f => (
                              <EditRow key={f.key} label={f.label}>
                                <input value={editForm[f.key]} onChange={e => updateEditForm(item.id, f.key, e.target.value)} style={inputStyle} />
                              </EditRow>
                            ))}
                          </div>
                        )}

                        <EditRow label="备注">
                          <input value={editForm.notes} onChange={e => updateEditForm(item.id, 'notes', e.target.value)} style={inputStyle} />
                        </EditRow>

                        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                          <button onClick={() => saveEdit(item)} style={{ flex: 1, padding: '8px', background: 'var(--accent)', color: 'var(--accent-fg)', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                            保存
                          </button>
                          <button onClick={() => cancelEdit(item.id)} style={{ padding: '8px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', fontSize: '13px', color: 'var(--muted)', cursor: 'pointer' }}>
                            取消
                          </button>
                        </div>
                      </div>
                    ) : (
                      // ── View mode ──────────────────────────────
                      <div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                          {!!raw.ipa && <DetailRow label="IPA" value={raw.ipa as string} />}
                          {pos === 'noun' && (
                            <>
                              {raw.articleIndefinite && <DetailRow label="不定冠词" value={`${raw.articleIndefinite} ${raw.word}`} />}
                              {raw.articleDefinite && <DetailRow label="定冠词" value={`${raw.articleDefinite}${(raw.articleDefinite as string).endsWith("'") ? '' : ' '}${raw.word}`} />}
                              {raw.gender && <DetailRow label="性别" value={raw.gender === 'masculine' ? '阳性' : '阴性'} />}
                              {raw.pluralForm && <DetailRow label="复数" value={raw.pluralForm as string} />}
                            </>
                          )}
                          {pos === 'verb' && !!raw.infinitive && (
                            <DetailRow label="不定式" value={raw.infinitive as string} />
                          )}
                          {pos === 'adjective' && Object.keys(forms).length > 0 && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                              {[
                                { label: '阳性单数', key: 'masculineSingular' },
                                { label: '阴性单数', key: 'feminineSingular' },
                                { label: '阳性复数', key: 'masculinePlural' },
                                { label: '阴性复数', key: 'femininePlural' },
                              ].map(f => forms[f.key] ? (
                                <div key={f.key} style={{ padding: '8px 10px', background: 'var(--surface)', borderRadius: '8px' }}>
                                  <p style={{ fontSize: '10px', color: 'var(--muted)', marginBottom: '2px' }}>{f.label}</p>
                                  <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--fg)' }}>{forms[f.key] as string}</p>
                                </div>
                              ) : null)}
                            </div>
                          )}
                          {!!raw.notes && <DetailRow label="备注" value={raw.notes as string} />}
                          {Array.isArray(raw.examples) && (raw.examples as { fr: string; en: string; zh: string }[]).length > 0 && (
                            <div style={{ marginTop: '4px' }}>
                              <p style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '6px', fontWeight: 500 }}>例句</p>
                              {(raw.examples as { fr: string; en: string; zh: string }[]).map((ex, i) => (
                                <div key={i} style={{ padding: '8px 10px', background: 'var(--surface)', borderRadius: '8px', marginBottom: '6px' }}>
                                  <p style={{ fontSize: '13px', color: 'var(--accent)', fontWeight: 500, marginBottom: '2px' }}>{ex.fr}</p>
                                  <p style={{ fontSize: '12px', color: 'var(--fg-2)', marginBottom: '1px' }}>{ex.en}</p>
                                  <p style={{ fontSize: '12px', color: 'var(--muted)' }}>{ex.zh}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => startEdit(item)}
                          style={{ padding: '7px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', fontSize: '12px', color: 'var(--fg-2)', cursor: 'pointer' }}
                        >
                          编辑此词条
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <button
          onClick={handleApply}
          disabled={loading}
          style={{ width: '100%', padding: '15px', background: 'var(--accent)', color: 'var(--accent-fg)', border: 'none', borderRadius: '16px', fontSize: '15px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, boxShadow: 'var(--shadow-sm)', transition: 'opacity 0.15s ease' }}
        >
          {loading ? '导入中...' : '确认导入'}
        </button>
      </div>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 10px', background: 'var(--surface)', borderRadius: '8px' }}>
      <p style={{ fontSize: '12px', color: 'var(--muted)' }}>{label}</p>
      <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--fg)' }}>{value}</p>
    </div>
  )
}

function EditRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '4px', fontWeight: 500 }}>{label}</p>
      {children}
    </div>
  )
}