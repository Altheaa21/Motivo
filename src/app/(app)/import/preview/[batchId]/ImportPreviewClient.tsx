'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { applyImport } from '@/app/actions/import'
import type { ItemAction } from '@/app/actions/import'
import type { ImportBatch, ImportItem } from '@/types/database'
import { CheckCircle, AlertTriangle, Info, XCircle, AlertCircle } from 'lucide-react'

const STATUS_CONFIG: Record<string, {
  label: string
  color: string
  bg: string
  border: string
  icon: React.ReactNode
}> = {
  new: {
    label: '新词',
    color: 'var(--accent)',
    bg: '#f5f0e8',
    border: 'var(--accent-light)',
    icon: <CheckCircle size={13} />,
  },
  exact_duplicate: {
    label: '完全重复',
    color: 'var(--muted)',
    bg: 'var(--surface-2)',
    border: 'var(--border)',
    icon: <Info size={13} />,
  },
  possible_duplicate: {
    label: '可能重复',
    color: 'var(--warning)',
    bg: 'var(--warning-bg)',
    border: 'var(--warning)',
    icon: <AlertCircle size={13} />,
  },
  conflict: {
    label: '冲突',
    color: 'var(--danger)',
    bg: 'var(--danger-bg)',
    border: 'var(--danger)',
    icon: <XCircle size={13} />,
  },
  incomplete: {
    label: '不完整',
    color: 'var(--dusty-blue)',
    bg: '#eef2f7',
    border: 'var(--dusty-blue)',
    icon: <AlertTriangle size={13} />,
  },
}

const ACTION_OPTIONS: Record<string, { value: string; label: string }[]> = {
  new: [
    { value: 'add', label: '添加' },
    { value: 'skip', label: '跳过' },
  ],
  exact_duplicate: [
    { value: 'skip', label: '跳过' },
    { value: 'merge', label: '合并' },
    { value: 'add_as_new', label: '另存新词' },
  ],
  possible_duplicate: [
    { value: 'merge', label: '合并' },
    { value: 'add_as_new', label: '另存新词' },
    { value: 'skip', label: '跳过' },
  ],
  conflict: [
    { value: 'add_as_new', label: '另存新词' },
    { value: 'skip', label: '跳过' },
  ],
  incomplete: [
    { value: 'import_as_incomplete', label: '导入（不完整）' },
    { value: 'skip', label: '跳过' },
  ],
}

export function ImportPreviewClient({
  batch,
  items,
}: {
  batch: ImportBatch
  items: ImportItem[]
}) {
  const router = useRouter()
  const [actions, setActions] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    for (const item of items) {
      init[item.id] = item.recommended_action === 'manual_review'
        ? 'skip'
        : item.recommended_action === 'import_as_incomplete'
        ? 'import_as_incomplete'
        : item.recommended_action
    }
    return init
  })
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [result, setResult] = useState<{
    addedCount: number
    mergedCount: number
    skippedCount: number
  } | null>(null)

  const hasConflicts = items.some(i => i.detected_status === 'conflict')

  function applySafeRecommendations() {
    const updated: Record<string, string> = {}
    for (const item of items) {
      if (item.detected_status === 'conflict') {
        updated[item.id] = actions[item.id]
      } else if (item.recommended_action === 'manual_review') {
        updated[item.id] = 'skip'
      } else if (item.recommended_action === 'import_as_incomplete') {
        updated[item.id] = 'import_as_incomplete'
      } else {
        updated[item.id] = item.recommended_action
      }
    }
    setActions(updated)
  }

  async function handleApply() {
    setLoading(true)
    const itemActions: ItemAction[] = items.map(item => ({
      itemId: item.id,
      action: actions[item.id] as ItemAction['action'],
    }))
    const res = await applyImport(batch.id, itemActions)
    if (res.success) {
      setResult({
        addedCount: res.addedCount ?? 0,
        mergedCount: res.mergedCount ?? 0,
        skippedCount: res.skippedCount ?? 0,
      })
      setDone(true)
    }
    setLoading(false)
  }

  // ── Done state ────────────────────────────────────────────────
  if (done && result) {
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
            background: 'var(--success-bg)',
            borderRadius: '20px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px', fontSize: '28px',
          }}>
            ✓
          </div>
          <h2 className="font-display" style={{
            fontSize: '22px', fontWeight: 700,
            color: 'var(--fg)', marginBottom: '16px',
          }}>
            导入完成
          </h2>

          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '10px', marginBottom: '28px',
          }}>
            {[
              { label: '已添加', value: result.addedCount, color: 'var(--success)' },
              { label: '已合并', value: result.mergedCount, color: 'var(--accent)' },
              { label: '已跳过', value: result.skippedCount, color: 'var(--muted)' },
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
              onClick={() => router.push('/learn')}
              style={{
                width: '100%', padding: '13px',
                background: 'var(--accent)', color: 'var(--accent-fg)',
                border: 'none', borderRadius: '14px',
                fontSize: '14px', fontWeight: 600, cursor: 'pointer',
              }}
            >
              去学习新词
            </button>
            <button
              onClick={() => router.push('/today')}
              style={{
                width: '100%', padding: '13px',
                background: 'transparent', color: 'var(--muted)',
                border: 'none', borderRadius: '14px',
                fontSize: '14px', cursor: 'pointer',
              }}
            >
              回到今日
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Preview ───────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100%', background: 'var(--bg)' }}>
      <div style={{
        maxWidth: '760px', margin: '0 auto',
        padding: '24px 16px 48px',
        width: '100%', boxSizing: 'border-box',
      }}>

        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <h1 className="font-display" style={{
            fontSize: 'clamp(22px, 4vw, 30px)',
            fontWeight: 700, color: 'var(--fg)', marginBottom: '8px',
          }}>
            导入预览
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--muted)' }}>
            确认每个词条的处理方式，然后完成导入。
          </p>
        </div>

        {/* Summary card */}
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '20px', padding: '20px 22px',
          marginBottom: '16px', boxShadow: 'var(--shadow-sm)',
        }}>
          <p style={{
            fontSize: '12px', fontWeight: 600,
            color: 'var(--muted)', letterSpacing: '0.08em',
            textTransform: 'uppercase', marginBottom: '14px',
          }}>
            总览
          </p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))',
            gap: '10px',
          }}>
            {[
              { label: '总计', value: batch.total_entries, color: 'var(--fg)' },
              { label: '新词', value: batch.new_count, color: 'var(--accent)' },
              { label: '完全重复', value: batch.exact_duplicate_count, color: 'var(--muted)' },
              { label: '可能重复', value: batch.possible_duplicate_count, color: 'var(--warning)' },
              { label: '冲突', value: batch.conflict_count, color: 'var(--danger)' },
              { label: '不完整', value: batch.incomplete_count, color: 'var(--dusty-blue)' },
            ].map(s => (
              <div key={s.label} style={{
                padding: '10px 8px',
                background: 'var(--surface-2)',
                borderRadius: '12px', textAlign: 'center',
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
        </div>

        {/* Conflict warning */}
        {hasConflicts && (
          <div style={{
            padding: '12px 16px',
            background: 'var(--danger-bg)',
            border: '1px solid var(--danger)',
            borderRadius: '14px',
            marginBottom: '16px',
            display: 'flex', alignItems: 'center', gap: '10px',
            fontSize: '13px', color: 'var(--danger)',
          }}>
            <XCircle size={16} style={{ flexShrink: 0 }} />
            {batch.conflict_count} 个冲突需要手动处理，无法自动应用。
          </div>
        )}

        {/* Action buttons */}
        <div style={{
          display: 'flex', gap: '10px',
          marginBottom: '24px', flexWrap: 'wrap',
        }}>
          <button
            onClick={applySafeRecommendations}
            style={{
              flex: 1, minWidth: '140px', padding: '12px 16px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '14px',
              fontSize: '13px', fontWeight: 600,
              color: 'var(--fg)', cursor: 'pointer',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            应用安全建议
          </button>
          <button
            onClick={() => router.push('/import')}
            style={{
              padding: '12px 20px',
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: '14px',
              fontSize: '13px', color: 'var(--muted)', cursor: 'pointer',
            }}
          >
            取消
          </button>
        </div>

        {/* Item list */}
        <div style={{
          display: 'flex', flexDirection: 'column', gap: '12px',
          marginBottom: '24px',
        }}>
          {items.map(item => {
            const raw = item.raw_entry as Record<string, unknown>
            const english = raw.english as Record<string, unknown>
            const chinese = raw.chinese as Record<string, unknown>
            const statusCfg = STATUS_CONFIG[item.detected_status] ?? STATUS_CONFIG.new
            const availableActions = ACTION_OPTIONS[item.detected_status] ?? [
              { value: 'skip', label: '跳过' },
            ]
            const currentAction = actions[item.id]

            return (
              <div
                key={item.id}
                style={{
                  background: 'var(--surface)',
                  border: `1px solid var(--border)`,
                  borderRadius: '18px',
                  padding: '18px 20px',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                {/* Status badge + POS */}
                <div style={{
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '12px',
                }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '5px',
                    padding: '4px 10px',
                    background: statusCfg.bg,
                    border: `1px solid ${statusCfg.border}`,
                    borderRadius: '100px',
                    fontSize: '11px', fontWeight: 600,
                    color: statusCfg.color,
                  }}>
                    {statusCfg.icon}
                    {statusCfg.label}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                    {raw.partOfSpeech as string}
                  </span>
                </div>

                {/* Word */}
                <p className="font-display" style={{
                  fontSize: '18px', fontWeight: 700,
                  color: 'var(--fg)', marginBottom: '4px',
                }}>
                  {(raw.displayText as string)?.toLowerCase().replace(/^./, c => c.toUpperCase())}
                </p>
                <p style={{ fontSize: '13px', color: 'var(--fg-2)', marginBottom: '12px' }}>
                  {english?.primary as string}
                  <span style={{ color: 'var(--border-2)', margin: '0 6px' }}>·</span>
                  {chinese?.primary as string}
                </p>

                {/* Issues */}
                {item.issues && (item.issues as string[]).length > 0 && (
                  <div style={{
                    padding: '10px 12px',
                    background: 'var(--warning-bg)',
                    border: '1px solid var(--warning)',
                    borderRadius: '10px',
                    marginBottom: '12px',
                  }}>
                    {(item.issues as string[]).map((issue, i) => (
                      <p key={i} style={{
                        fontSize: '12px', color: 'var(--warning)',
                        lineHeight: 1.5,
                      }}>
                        {issue}
                      </p>
                    ))}
                  </div>
                )}

                {/* Action selector */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {availableActions.map(act => (
                    <button
                      key={act.value}
                      onClick={() => setActions(prev => ({ ...prev, [item.id]: act.value }))}
                      style={{
                        padding: '7px 14px',
                        borderRadius: '10px',
                        fontSize: '13px', fontWeight: 500,
                        cursor: 'pointer',
                        border: `1.5px solid ${currentAction === act.value ? 'var(--accent)' : 'var(--border)'}`,
                        background: currentAction === act.value ? 'var(--accent)' : 'var(--surface-2)',
                        color: currentAction === act.value ? 'var(--accent-fg)' : 'var(--fg-2)',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {act.label}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* Confirm button */}
        <button
          onClick={handleApply}
          disabled={loading}
          style={{
            width: '100%', padding: '15px',
            background: 'var(--accent)', color: 'var(--accent-fg)',
            border: 'none', borderRadius: '16px',
            fontSize: '15px', fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
            boxShadow: 'var(--shadow-sm)',
            transition: 'opacity 0.15s ease',
          }}
        >
          {loading ? '导入中...' : '确认导入'}
        </button>
      </div>
    </div>
  )
}