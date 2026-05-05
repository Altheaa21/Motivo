'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { applyImport } from '@/app/actions/import'
import type { ItemAction } from '@/app/actions/import'
import type { ImportBatch, ImportItem } from '@/types/database'

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  new: { label: 'New', color: 'var(--success)' },
  exact_duplicate: { label: 'Exact Duplicate', color: 'var(--muted)' },
  possible_duplicate: { label: 'Possible Duplicate', color: 'var(--warning)' },
  conflict: { label: 'Conflict', color: 'var(--danger)' },
  incomplete: { label: 'Incomplete', color: 'var(--accent)' },
}

const ACTION_OPTIONS: Record<string, string[]> = {
  new: ['add', 'skip'],
  exact_duplicate: ['skip', 'merge', 'add_as_new'],
  possible_duplicate: ['merge', 'add_as_new', 'skip'],
  conflict: ['add_as_new', 'skip'],
  incomplete: ['import_as_incomplete', 'skip'],
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
  const [result, setResult] = useState<{ addedCount: number; mergedCount: number; skippedCount: number } | null>(null)

  const hasConflicts = items.some(i => i.detected_status === 'conflict')

  async function handleApply() {
    setLoading(true)
    const itemActions: ItemAction[] = items.map(item => ({
      itemId: item.id,
      action: actions[item.id] as ItemAction['action'],
    }))

    const res = await applyImport(batch.id, itemActions)
    if (res.success) {
      setResult({ addedCount: res.addedCount ?? 0, mergedCount: res.mergedCount ?? 0, skippedCount: res.skippedCount ?? 0 })
      setDone(true)
    }
    setLoading(false)
  }

  function applySafeRecommendations() {
    const updated: Record<string, string> = {}
    for (const item of items) {
      if (item.detected_status === 'conflict') {
        updated[item.id] = actions[item.id] // keep current
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

  if (done && result) {
    return (
      <div className="p-6 max-w-lg mx-auto text-center">
        <div className="text-4xl mb-4">✓</div>
        <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--accent)' }}>
          Import Complete
        </h2>
        <p className="text-sm mb-1" style={{ color: 'var(--muted)' }}>
          Added: {result.addedCount} · Merged: {result.mergedCount} · Skipped: {result.skippedCount}
        </p>
        <button
          onClick={() => router.push('/today')}
          className="mt-6 px-6 py-3 rounded-lg font-semibold text-sm"
          style={{ background: 'var(--accent)', color: '#0f0f1a' }}
        >
          Back to Today
        </button>
      </div>
    )
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="text-xl font-bold mb-1" style={{ color: 'var(--accent)' }}>
        Import Preview
      </h1>

      {/* Summary */}
      <div className="rounded-lg p-3 mb-4 text-sm space-y-1" style={{ background: 'var(--surface)' }}>
        <div>Total: <strong>{batch.total_entries}</strong></div>
        <div style={{ color: 'var(--success)' }}>New: {batch.new_count}</div>
        <div style={{ color: 'var(--muted)' }}>Exact duplicates: {batch.exact_duplicate_count}</div>
        <div style={{ color: 'var(--warning)' }}>Possible duplicates: {batch.possible_duplicate_count}</div>
        <div style={{ color: 'var(--danger)' }}>Conflicts: {batch.conflict_count}</div>
        <div style={{ color: 'var(--accent)' }}>Incomplete: {batch.incomplete_count}</div>
      </div>

      {hasConflicts && (
        <p className="text-sm mb-3" style={{ color: 'var(--danger)' }}>
          ⚠ {batch.conflict_count} conflict(s) require manual review.
        </p>
      )}

      <div className="flex gap-2 mb-6">
        <button
          onClick={applySafeRecommendations}
          className="flex-1 py-2 rounded-lg text-sm font-medium"
          style={{ background: 'var(--surface-2)', color: 'var(--foreground)' }}
        >
          Apply Safe Recommendations
        </button>
        <button
          onClick={() => router.push('/import')}
          className="px-4 py-2 rounded-lg text-sm"
          style={{ background: 'var(--surface)', color: 'var(--muted)' }}
        >
          Cancel
        </button>
      </div>

      {/* Item list */}
      <div className="space-y-3 mb-6">
        {items.map(item => {
          const raw = item.raw_entry as Record<string, unknown>
          const english = raw.english as Record<string, unknown>
          const chinese = raw.chinese as Record<string, unknown>
          const statusInfo = STATUS_LABELS[item.detected_status] ?? { label: item.detected_status, color: 'var(--muted)' }
          const availableActions = ACTION_OPTIONS[item.detected_status] ?? ['skip']

          return (
            <div
              key={item.id}
              className="rounded-lg p-3"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded"
                  style={{ background: statusInfo.color + '22', color: statusInfo.color }}
                >
                  {statusInfo.label}
                </span>
                <span className="text-xs" style={{ color: 'var(--muted)' }}>
                  {raw.partOfSpeech as string}
                </span>
              </div>

              <p className="font-bold text-sm mb-0.5">{raw.displayText as string}</p>
              <p className="text-xs mb-1" style={{ color: 'var(--muted)' }}>
                {english?.primary as string} · {chinese?.primary as string}
              </p>

              {item.issues && (item.issues as string[]).length > 0 && (
                <div className="mb-2">
                  {(item.issues as string[]).map((issue, i) => (
                    <p key={i} className="text-xs" style={{ color: 'var(--warning)' }}>
                      ⚠ {issue}
                    </p>
                  ))}
                </div>
              )}

              {/* Action selector */}
              <div className="flex gap-1 flex-wrap mt-2">
                {availableActions.map(act => (
                  <button
                    key={act}
                    onClick={() => setActions(prev => ({ ...prev, [item.id]: act }))}
                    className="text-xs px-2 py-1 rounded transition-all"
                    style={{
                      background: actions[item.id] === act ? 'var(--accent)' : 'var(--surface-2)',
                      color: actions[item.id] === act ? '#0f0f1a' : 'var(--muted)',
                    }}
                  >
                    {act.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <button
        onClick={handleApply}
        disabled={loading}
        className="w-full py-3 rounded-lg font-semibold text-sm disabled:opacity-50"
        style={{ background: 'var(--accent)', color: '#0f0f1a' }}
      >
        {loading ? 'Importing...' : 'Confirm Import'}
      </button>
    </div>
  )
}
