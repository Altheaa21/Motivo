'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { WordEntry, LearningState } from '@/types/database'
import { getPosLabel, getGenderLabel } from '@/lib/vocab/display'
import { Upload, Search } from 'lucide-react'
import { getDisplayText } from '@/lib/vocab/display'



type EntryWithState = WordEntry & { learning_states: LearningState[] }

// const router = useRouter()

const STATUS_FILTERS = [
  { value: 'all', label: '全部' },
  { value: 'new', label: '新词' },
  { value: 'learning', label: '学习中' },
  { value: 'review', label: '复习中' },
  { value: 'weak', label: '薄弱' },
  { value: 'mastered', label: '已掌握' },
  { value: 'incomplete', label: '不完整' },
]

const POS_FILTERS = [
  { value: 'all', label: '全部词性' },
  { value: 'noun', label: '名词' },
  { value: 'verb', label: '动词' },
  { value: 'adjective', label: '形容词' },
  { value: 'adverb', label: '副词' },
  { value: 'phrase', label: '短语' },
]

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  new: { bg: '#f5f0e8', color: 'var(--accent)' },
  learning: { bg: '#faf5e8', color: 'var(--warning)' },
  review: { bg: '#eef5f1', color: 'var(--success)' },
  weak: { bg: '#f9efef', color: 'var(--danger)' },
  mastered: { bg: '#f0eefa', color: '#7c6fba' },
  incomplete: { bg: 'var(--surface-2)', color: 'var(--muted)' },
}

const STATUS_ZH: Record<string, string> = {
  new: '新词',
  learning: '学习中',
  review: '复习中',
  weak: '薄弱',
  mastered: '已掌握',
  incomplete: '不完整',
}

export function LibraryClient({ entries }: { entries: EntryWithState[] }) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [posFilter, setPosFilter] = useState('all')

  const filtered = entries.filter(entry => {
    const state = entry.learning_states?.[0]
    const matchSearch =
      !search ||
      entry.word.toLowerCase().includes(search.toLowerCase()) ||
      getDisplayText(entry).toLowerCase().includes(search.toLowerCase()) ||
      entry.english_primary.toLowerCase().includes(search.toLowerCase()) ||
      entry.chinese_primary.includes(search)
    const matchStatus = statusFilter === 'all' || state?.status === statusFilter
    const matchPos = posFilter === 'all' || entry.part_of_speech === posFilter
    return matchSearch && matchStatus && matchPos
  })

  return (
    <div style={{ minHeight: '100%', background: 'var(--bg)' }}>
      <div style={{
        maxWidth: '900px',
        margin: '0 auto',
        padding: '32px 20px 48px',
      }}>

        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: '28px',
          gap: '16px',
        }}>
          <div>
            <h1 className="font-display" style={{
              fontSize: 'clamp(24px, 4vw, 32px)',
              fontWeight: 700,
              color: 'var(--fg)',
              marginBottom: '6px',
            }}>
              词库
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--muted)' }}>
              共 {entries.length} 个词条
            </p>
          </div>
          <button
            onClick={() => router.push('/import')}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '9px 16px',
              background: 'var(--accent)', color: 'var(--accent-fg)',
              border: 'none', borderRadius: '12px',
              fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <Upload size={14} />
            导入单词
          </button>
        </div>

        {/* Practice entry */}
        <button
          onClick={() => router.push('/practice')}
          style={{
            width: '100%', textAlign: 'left',
            padding: '16px 20px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '18px',
            cursor: 'pointer',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex', alignItems: 'center', gap: '14px',
            marginBottom: '20px',
            transition: 'border-color 0.15s ease',
          }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent-light)'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'}
        >
          <div style={{
            width: '40px', height: '40px',
            borderRadius: '10px',
            background: '#f5f0e8',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '20px', flexShrink: 0,
          }}>
            🎯
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--fg)', marginBottom: '2px' }}>
              巩固练习
            </p>
            <p style={{ fontSize: '12px', color: 'var(--muted)' }}>
              从已学词中随机、按弱项练习，不影响复习计划
            </p>
          </div>
          <span style={{ color: 'var(--muted)', fontSize: '16px' }}>→</span>
        </button>

        {/* Search */}
        <div style={{
          position: 'relative',
          marginBottom: '16px',
        }}>
          <Search size={16} style={{
            position: 'absolute', left: '14px', top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--muted)',
            pointerEvents: 'none',
          }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="搜索单词、释义..."
            style={{
              width: '100%',
              padding: '12px 16px 12px 40px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '14px',
              fontSize: '14px',
              color: 'var(--fg)',
              outline: 'none',
              boxShadow: 'var(--shadow-sm)',
            }}
          />
        </div>

        {/* Status filters */}
        <div style={{
          display: 'flex', gap: '8px',
          overflowX: 'auto', paddingBottom: '4px',
          marginBottom: '10px',
        }}>
          {STATUS_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              style={{
                padding: '6px 14px',
                borderRadius: '100px',
                fontSize: '12px', fontWeight: 500,
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                border: `1px solid ${statusFilter === f.value ? 'var(--accent)' : 'var(--border)'}`,
                background: statusFilter === f.value ? 'var(--accent)' : 'var(--surface)',
                color: statusFilter === f.value ? 'var(--accent-fg)' : 'var(--fg-2)',
                transition: 'all 0.15s ease',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* POS filters */}
        <div style={{
          display: 'flex', gap: '8px',
          overflowX: 'auto', paddingBottom: '4px',
          marginBottom: '24px',
        }}>
          {POS_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setPosFilter(f.value)}
              style={{
                padding: '6px 14px',
                borderRadius: '100px',
                fontSize: '12px', fontWeight: 500,
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                border: `1px solid ${posFilter === f.value ? 'var(--fg-2)' : 'var(--border)'}`,
                background: posFilter === f.value ? 'var(--surface-2)' : 'var(--surface)',
                color: posFilter === f.value ? 'var(--fg)' : 'var(--muted)',
                transition: 'all 0.15s ease',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Results count */}
        {(search || statusFilter !== 'all' || posFilter !== 'all') && (
          <p style={{
            fontSize: '12px', color: 'var(--muted)',
            marginBottom: '16px',
          }}>
            找到 {filtered.length} 个词条
          </p>
        )}

        {/* Empty state */}
        {filtered.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '20px',
          }}>
            <p style={{ fontSize: '28px', marginBottom: '16px' }}>🔍</p>
            <h3 style={{
              fontSize: '16px', fontWeight: 600,
              color: 'var(--fg)', marginBottom: '8px',
            }}>
              没有找到词条
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '20px' }}>
              试试调整筛选条件，或导入新的单词。
            </p>
            <button
              onClick={() => router.push('/import')}
              style={{
                padding: '10px 20px',
                background: 'var(--accent)', color: 'var(--accent-fg)',
                border: 'none', borderRadius: '12px',
                fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              }}
            >
              导入单词
            </button>
          </div>
        )}

        {/* Word list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filtered.map(entry => {
            const state = entry.learning_states?.[0]
            const statusKey = state?.status ?? 'new'
            const statusStyle = STATUS_COLORS[statusKey] ?? { bg: 'var(--surface-2)', color: 'var(--muted)' }

            return (
              <button
                key={entry.id}
                onClick={() => router.push(`/library/${entry.id}`)}
                style={{
                  width: '100%', textAlign: 'left',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '16px',
                  padding: '16px 18px',
                  cursor: 'pointer',
                  boxShadow: 'var(--shadow-sm)',
                  transition: 'box-shadow 0.15s ease, border-color 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-md)'
                  ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--border-2)'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-sm)'
                  ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p className="font-display" style={{
                    fontSize: '16px', fontWeight: 700,
                    color: 'var(--fg)', marginBottom: '4px',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {getDisplayText(entry).toLowerCase().replace(/^./, c => c.toUpperCase())}
                  </p>
                  <p style={{
                    fontSize: '12px', color: 'var(--muted)', marginBottom: '6px',
                  }}>
                    {getPosLabel(entry.part_of_speech, 'zh')}
                    {entry.gender ? ` · ${getGenderLabel(entry.gender, 'zh')}` : ''}
                  </p>
                  <p style={{ fontSize: '13px', color: 'var(--fg-2)' }}>
                    {entry.english_primary}
                    <span style={{ color: 'var(--border-2)', margin: '0 6px' }}>·</span>
                    {entry.chinese_primary}
                  </p>
                </div>

                <div style={{
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'flex-end', gap: '6px', flexShrink: 0,
                }}>
                  <span style={{
                    padding: '3px 10px',
                    borderRadius: '100px',
                    fontSize: '11px', fontWeight: 600,
                    background: statusStyle.bg,
                    color: statusStyle.color,
                    whiteSpace: 'nowrap',
                  }}>
                    {STATUS_ZH[statusKey] ?? statusKey}
                  </span>
                  {state && state.overall_level > 0 && (
                    <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                      Lv {state.overall_level}
                    </span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}