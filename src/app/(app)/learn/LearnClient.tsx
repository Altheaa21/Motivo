'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { WordEntry, LearningState } from '@/types/database'
import { getPosLabel, getGenderLabel } from '@/lib/vocab/display'
import { speakWord, speakSentence } from '@/lib/vocab/tts'
import { postponeWord, queueWord } from '@/app/actions/learn'
import { ArrowLeft, ArrowRight, Volume2, Clock } from 'lucide-react'

type EntryWithState = WordEntry & { learning_states: LearningState[] }

function toDisplayCase(str: string): string {
  return str.toLowerCase().replace(/^./, c => c.toUpperCase())
}

export function LearnClient({
  entries,
  initialQueuedCount,
}: {
  entries: EntryWithState[]
  initialQueuedCount: number
}) {
  const router = useRouter()
  const [allCards] = useState(entries)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [queuedCount, setQueuedCount] = useState(initialQueuedCount)
  const [dragX, setDragX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const removedIds = useRef<Set<string>>(new Set())
  const postponedIds = useRef<Set<string>>(new Set())
  const [, forceUpdate] = useState(0)

  const dragStartX = useRef(0)
  const cardRef = useRef<HTMLDivElement>(null)

  const activeCards = allCards.filter(c => !removedIds.current.has(c.id))
  const current = activeCards[currentIndex % Math.max(activeCards.length, 1)]
  const total = activeCards.length

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 1800)
  }

  const handleQueue = useCallback(async () => {
    if (!current) return
    await queueWord(current.id)
    removedIds.current.add(current.id)
    postponedIds.current.delete(current.id)
    setQueuedCount(q => q + 1)
    setFlipped(false)
    const newActive = allCards.filter(c => !removedIds.current.has(c.id))
    if (newActive.length > 0) {
      setCurrentIndex(i => i % newActive.length)
    }
    forceUpdate(n => n + 1)
    showToast('已加入练习')
  }, [current, allCards])

  const handlePostpone = useCallback(async () => {
    if (!current) return
    if (!postponedIds.current.has(current.id)) {
      await postponeWord(current.id)
      postponedIds.current.add(current.id)
      showToast('已安排明天再看')
    }
    setFlipped(false)
    const newActive = allCards.filter(c => !removedIds.current.has(c.id))
    setCurrentIndex(i => (i + 1) % Math.max(newActive.length, 1))
    forceUpdate(n => n + 1)
  }, [current, allCards])

  function handlePrev() {
    setFlipped(false)
    setCurrentIndex(i => (i - 1 + total) % total)
  }

  function handleNext() {
    setFlipped(false)
    setCurrentIndex(i => (i + 1) % total)
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (['INPUT', 'TEXTAREA'].includes(tag)) return
      if ((e.target as HTMLElement).isContentEditable) return
      if (e.key === 'ArrowLeft') handlePostpone()
      if (e.key === 'ArrowRight') handleQueue()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handlePostpone, handleQueue])

  function onPointerDown(e: React.PointerEvent) {
    dragStartX.current = e.clientX
    setIsDragging(true)
    cardRef.current?.setPointerCapture(e.pointerId)
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!isDragging) return
    setDragX(e.clientX - dragStartX.current)
  }

  async function onPointerUp() {
    setIsDragging(false)
    const threshold = 80
    if (dragX > threshold) await handleQueue()
    else if (dragX < -threshold) await handlePostpone()
    setDragX(0)
  }

  function handleCardTap() {
    if (Math.abs(dragX) > 8) return
    setFlipped(f => !f)
  }

  // ── Empty state ───────────────────────────────────────────────
  if (total === 0) {
    return (
      <div style={{
        minHeight: '100%',
        background: 'var(--bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
      }}>
        <div style={{
          maxWidth: '400px',
          width: '100%',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '24px',
          padding: '48px 36px',
          textAlign: 'center',
          boxShadow: 'var(--shadow-md)',
        }}>
          <div style={{
            width: '64px', height: '64px',
            background: 'var(--surface-2)',
            borderRadius: '20px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px',
            fontSize: '28px',
          }}>
            {queuedCount > 0 ? '✓' : '📭'}
          </div>

          <h2 style={{
            fontSize: '20px', fontWeight: 700,
            color: 'var(--fg)', marginBottom: '10px',
          }}>
            {queuedCount > 0 ? '单词已加入练习队列' : '没有新单词'}
          </h2>
          <p style={{
            fontSize: '14px', color: 'var(--muted)',
            lineHeight: 1.6, marginBottom: '28px',
          }}>
            {queuedCount > 0
              ? `${queuedCount} 个词等待练习`
              : '今天没有待学习的新单词。'}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {queuedCount > 0 && (
              <button
                onClick={() => router.push('/learn/practice')}
                style={{
                  width: '100%', padding: '13px',
                  background: 'var(--accent)', color: 'var(--accent-fg)',
                  border: 'none', borderRadius: '14px',
                  fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                }}
              >
                开始练习 {queuedCount} 个词
              </button>
            )}
            <button
              onClick={() => router.push('/import')}
              style={{
                width: '100%', padding: '13px',
                background: queuedCount > 0 ? 'var(--surface-2)' : 'var(--accent)',
                color: queuedCount > 0 ? 'var(--fg-2)' : 'var(--accent-fg)',
                border: `1px solid ${queuedCount > 0 ? 'var(--border)' : 'transparent'}`,
                borderRadius: '14px',
                fontSize: '14px', fontWeight: 600, cursor: 'pointer',
              }}
            >
              导入单词
            </button>
            <button
              onClick={() => router.push('/library')}
              style={{
                width: '100%', padding: '13px',
                background: 'transparent', color: 'var(--muted)',
                border: 'none', borderRadius: '14px',
                fontSize: '14px', cursor: 'pointer',
              }}
            >
              查看词库
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Card view ─────────────────────────────────────────────────
  const swipeLeft = dragX < -40
  const swipeRight = dragX > 40
  const cardRotation = dragX * 0.04
  const cardOpacity = Math.max(0.7, 1 - Math.abs(dragX) / 280)
  const isPostponed = current && postponedIds.current.has(current.id)

  return (
    <div style={{
      minHeight: '100%',
      background: 'var(--bg)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '80px', left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--fg)', color: 'var(--bg)',
          padding: '8px 18px', borderRadius: '100px',
          fontSize: '13px', fontWeight: 500,
          zIndex: 100, pointerEvents: 'none', whiteSpace: 'nowrap',
        }}>
          {toast}
        </div>
      )}

      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        maxWidth: '640px',
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
              letterSpacing: '0.05em',
            }}>
              新词学习
            </p>
            <p style={{
              fontSize: '20px', fontWeight: 700,
              color: 'var(--fg)', lineHeight: 1,
            }}>
              {(currentIndex % total) + 1}
              <span style={{ fontSize: '14px', color: 'var(--muted)', fontWeight: 400 }}>
                {' '}/ {total}
              </span>
            </p>
          </div>

          {queuedCount > 0 && (
            <button
              onClick={() => router.push('/learn/practice')}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '7px 14px',
                background: 'var(--accent)', color: 'var(--accent-fg)',
                border: 'none', borderRadius: '100px',
                fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              }}
            >
              练习 {queuedCount} 个词 →
            </button>
          )}
        </div>

        {/* Progress bar */}
        <div style={{
          height: '3px', background: 'var(--border)',
          borderRadius: '2px', marginBottom: '28px', overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${(removedIds.current.size / Math.max(allCards.length, 1)) * 100}%`,
            background: 'var(--accent)',
            borderRadius: '2px',
            transition: 'width 0.3s ease',
          }} />
        </div>

        {/* Swipe hints */}
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          marginBottom: '12px', padding: '0 4px',
        }}>
          <span style={{
            fontSize: '12px', fontWeight: 500,
            color: swipeLeft ? 'var(--warning)' : 'var(--border-2)',
            transition: 'color 0.15s ease',
            display: 'flex', alignItems: 'center', gap: '4px',
          }}>
            <ArrowLeft size={12} /> 明天再看
          </span>
          <span style={{
            fontSize: '12px', fontWeight: 500,
            color: swipeRight ? 'var(--sage)' : 'var(--border-2)',
            transition: 'color 0.15s ease',
            display: 'flex', alignItems: 'center', gap: '4px',
          }}>
            加入练习 <ArrowRight size={12} />
          </span>
        </div>

        {/* Card */}
        <div
          ref={cardRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onClick={handleCardTap}
          style={{
            flex: 1,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '24px',
            boxShadow: 'var(--shadow-md)',
            padding: '32px 28px',
            cursor: 'grab',
            userSelect: 'none',
            transform: `translateX(${dragX}px) rotate(${cardRotation}deg)`,
            opacity: cardOpacity,
            transition: isDragging ? 'none' : 'transform 0.3s ease, opacity 0.3s ease',
            touchAction: 'none',
            minHeight: '320px',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            outline: swipeRight
              ? '2px solid var(--sage)'
              : swipeLeft
              ? '2px solid var(--warning)'
              : '2px solid transparent',
          }}
        >
          {/* Postponed tag */}
          {isPostponed && (
            <div style={{
              position: 'absolute',
              top: '16px', right: '16px',
              display: 'flex', alignItems: 'center', gap: '4px',
              padding: '4px 10px',
              background: 'var(--warning-bg)',
              border: '1px solid var(--warning)',
              borderRadius: '100px',
              fontSize: '11px', fontWeight: 500,
              color: 'var(--warning)',
            }}>
              <Clock size={11} />
              明天再看
            </div>
          )}

          {!flipped
            ? <BriefContent entry={current} />
            : <DetailContent entry={current} />
          }
        </div>

        {/* Bottom buttons */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
          marginTop: '20px',
        }}>
          <button
            onClick={handlePrev}
            style={{
              padding: '14px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              fontSize: '14px', fontWeight: 500,
              color: 'var(--fg-2)',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: '6px',
            }}
          >
            <ArrowLeft size={15} />
            上一个
          </button>
          <button
            onClick={handleNext}
            style={{
              padding: '14px',
              background: 'var(--accent)',
              border: 'none',
              borderRadius: '16px',
              fontSize: '14px', fontWeight: 600,
              color: 'var(--accent-fg)',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: '6px',
            }}
          >
            下一个
            <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Brief ─────────────────────────────────────────────────────────

function BriefContent({ entry }: { entry: EntryWithState }) {
  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      gap: '16px',
    }}>
      <button
        onClick={e => { e.stopPropagation(); speakWord(entry) }}
        style={{
          background: 'none', border: 'none',
          cursor: 'pointer', padding: '4px 8px', borderRadius: '8px',
        }}
      >
        <span className="font-display" style={{
          fontSize: 'clamp(26px, 5vw, 36px)',
          fontWeight: 700, color: 'var(--fg)',
          lineHeight: 1.2, letterSpacing: '-0.01em',
        }}>
          {toDisplayCase(entry.display_text)}
        </span>
        <Volume2 size={14} style={{
          color: 'var(--muted)', marginLeft: '8px', verticalAlign: 'middle',
        }} />
      </button>

      <p style={{
        fontSize: '13px', color: 'var(--muted)',
        fontWeight: 500, letterSpacing: '0.03em',
      }}>
        {getPosLabel(entry.part_of_speech, 'zh')}
        {entry.gender ? ` · ${getGenderLabel(entry.gender, 'zh')}` : ''}
      </p>

      <div style={{
        padding: '16px 24px',
        background: 'var(--surface-2)',
        borderRadius: '14px',
        width: '100%', maxWidth: '320px',
      }}>
        <p style={{
          fontSize: '17px', fontWeight: 600,
          color: 'var(--fg)', marginBottom: '6px',
        }}>
          {entry.english_primary}
        </p>
        <p style={{ fontSize: '16px', color: 'var(--fg-2)' }}>
          {entry.chinese_primary}
        </p>
      </div>
    </div>
  )
}

// ── Detail ────────────────────────────────────────────────────────

function DetailContent({ entry }: { entry: EntryWithState }) {
  return (
    <div style={{
      flex: 1, display: 'flex',
      flexDirection: 'column', gap: '18px', overflowY: 'auto',
    }}>
      <div>
        <button
          onClick={e => { e.stopPropagation(); speakWord(entry) }}
          style={{
            background: 'none', border: 'none',
            cursor: 'pointer', padding: 0, textAlign: 'left',
          }}
        >
          <span className="font-display" style={{
            fontSize: 'clamp(20px, 4vw, 28px)',
            fontWeight: 700, color: 'var(--fg)', lineHeight: 1.2,
          }}>
            {toDisplayCase(entry.display_text)}
          </span>
          <Volume2 size={13} style={{
            color: 'var(--muted)', marginLeft: '7px', verticalAlign: 'middle',
          }} />
        </button>
        <p style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '5px' }}>
          {getPosLabel(entry.part_of_speech, 'zh')}
          {entry.gender ? ` · ${getGenderLabel(entry.gender, 'zh')}` : ''}
          {entry.ipa ? ` · ${entry.ipa}` : ''}
        </p>
      </div>

      {entry.part_of_speech === 'noun' && entry.article_indefinite && (
        <DetailSection label="语法">
          <p style={{ fontSize: '14px', color: 'var(--fg-2)' }}>
            {entry.article_indefinite} {entry.word}
            {entry.article_definite
              ? <span style={{ color: 'var(--muted)' }}>
                  {' '}· {entry.article_definite}{entry.article_definite.endsWith("'") ? '' : ' '}{entry.word}
                </span>
              : ''}
            {entry.plural_form
              ? <span style={{ color: 'var(--muted)' }}> · 复数: {entry.plural_form}</span>
              : ''}
          </p>
        </DetailSection>
      )}

      {entry.part_of_speech === 'adjective' && entry.masculine_singular && (
        <DetailSection label="变位">
          <p style={{ fontSize: '14px', color: 'var(--fg-2)' }}>
            {entry.masculine_singular} / {entry.feminine_singular}
            {entry.masculine_plural
              ? <span style={{ color: 'var(--muted)' }}>
                  {' '}· {entry.masculine_plural} / {entry.feminine_plural}
                </span>
              : ''}
          </p>
        </DetailSection>
      )}

      <DetailSection label="释义">
        <p style={{ fontSize: '14px', color: 'var(--fg)', marginBottom: '5px' }}>
          🇬🇧 {entry.english_primary}
          {entry.english_alternatives.length > 0 && (
            <span style={{ color: 'var(--muted)' }}>
              {' '}· {entry.english_alternatives.join(', ')}
            </span>
          )}
        </p>
        <p style={{ fontSize: '14px', color: 'var(--fg)' }}>
          🇨🇳 {entry.chinese_primary}
          {entry.chinese_alternatives.length > 0 && (
            <span style={{ color: 'var(--muted)' }}>
              {' '}· {entry.chinese_alternatives.join(', ')}
            </span>
          )}
        </p>
      </DetailSection>

      {entry.examples.length > 0 && (
        <DetailSection label="例句">
          {entry.examples.slice(0, 2).map((ex, i) => (
            <div key={i} style={{
              marginBottom: i < entry.examples.length - 1 ? '10px' : 0,
            }}>
              <button
                onClick={e => { e.stopPropagation(); speakSentence(ex.fr) }}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: 0, textAlign: 'left', display: 'block',
                  fontSize: '14px', fontWeight: 500,
                  color: 'var(--accent)', lineHeight: 1.5, marginBottom: '3px',
                }}
              >
                {ex.fr}
              </button>
              <p style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.5 }}>
                {ex.zh}
              </p>
            </div>
          ))}
        </DetailSection>
      )}
    </div>
  )
}

function DetailSection({
  label, children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <p style={{
        fontSize: '10px', fontWeight: 600,
        letterSpacing: '0.12em', textTransform: 'uppercase',
        color: 'var(--muted)', marginBottom: '7px',
      }}>
        {label}
      </p>
      {children}
    </div>
  )
}