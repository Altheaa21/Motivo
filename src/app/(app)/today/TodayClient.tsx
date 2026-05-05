'use client'

import { useRouter } from 'next/navigation'
import { BookOpen, RotateCcw, Upload, Library, ArrowRight } from 'lucide-react'

interface TodayProps {
  newCount: number
  queuedCount: number
  reviewCount: number
  weakCount: number
  incompleteCount: number
  totalCount: number
  masteredCount: number
  displayName: string
}

export function TodayClient({
  newCount,
  queuedCount,
  reviewCount,
  weakCount,
  incompleteCount,
  totalCount,
  masteredCount,
  displayName,
}: TodayProps) {
  const router = useRouter()

  const greeting = getGreeting()
  const name = displayName.includes('@')
    ? displayName.split('@')[0]
    : displayName || 'toi'

  const subtitle = getSubtitle()

  // Primary CTA: what should the user do first
  const primaryAction =
    reviewCount > 0 ? 'review' :
    newCount > 0 ? 'learn' :
    queuedCount > 0 ? 'practice' : null

  return (
    <div style={{ minHeight: '100%', background: 'var(--bg)' }}>
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '32px 20px 48px' }}>

        {/* ── Hero ─────────────────────────────────────────────── */}
        <section style={{ marginBottom: '40px' }}>
          <p style={{
            fontSize: '12px',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: 'var(--muted)',
            marginBottom: '6px',
            fontWeight: 500,
          }}>
            {greeting}
          </p>
          <h1 className="font-display" style={{
            fontSize: 'clamp(28px, 5vw, 40px)',
            fontWeight: 700,
            color: 'var(--fg)',
            lineHeight: 1.15,
            marginBottom: '10px',
          }}>
            {name.charAt(0).toUpperCase() + name.slice(1)}
          </h1>
          <p style={{ fontSize: '15px', color: 'var(--fg-2)', marginBottom: '16px' }}>
            {subtitle}
          </p>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '100px',
            fontSize: '13px',
            color: 'var(--fg-2)',
          }}>
            <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{totalCount}</span>
            <span>词在词库中</span>
            <span style={{ color: 'var(--border-2)' }}>·</span>
            <span style={{ color: 'var(--sage)', fontWeight: 600 }}>{masteredCount}</span>
            <span>已掌握</span>
          </div>
        </section>

        {/* ── Stats grid ───────────────────────────────────────── */}
        <section style={{ marginBottom: '32px' }}>
          <p style={{
            fontSize: '11px',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--muted)',
            fontWeight: 600,
            marginBottom: '14px',
          }}>
            今日计划
          </p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '12px',
          }}>
            <StatCard
              label="待学新词"
              value={newCount}
              accent="var(--accent)"
              note={newCount > 0 ? '可以开始学习' : '今日已完成'}
              onClick={() => router.push('/learn')}
            />
            <StatCard
              label="待复习"
              value={reviewCount}
              accent="var(--dusty-blue)"
              note={reviewCount > 0 ? '需要复习' : '今日已完成'}
              onClick={() => router.push('/review')}
            />
            <StatCard
              label="待练习"
              value={queuedCount}
              accent="var(--sage)"
              note={queuedCount > 0 ? '已加入队列' : '暂无待练习'}
              onClick={() => router.push('/learn/practice')}
            />
            <StatCard
              label="薄弱词"
              value={weakCount}
              accent="var(--dusty-rose)"
              note={weakCount > 0 ? '需要加强' : '保持良好'}
              onClick={() => router.push('/library?status=weak')}
            />
          </div>
        </section>

        {/* ── Primary CTA ───────────────────────────────────────── */}
        {primaryAction && (
          <section style={{ marginBottom: '32px' }}>
            <PrimaryActionCard
              action={primaryAction}
              reviewCount={reviewCount}
              newCount={newCount}
              queuedCount={queuedCount}
              onReview={() => router.push('/review')}
              onLearn={() => router.push('/learn')}
              onPractice={() => router.push('/learn/practice')}
            />
          </section>
        )}

        {/* ── Action cards ──────────────────────────────────────── */}
        <section style={{ marginBottom: '32px' }}>
          <p style={{
            fontSize: '11px',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--muted)',
            fontWeight: 600,
            marginBottom: '14px',
          }}>
            快速入口
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <ActionCard
              icon={<Upload size={18} />}
              label="导入单词"
              sub="从 AI 生成的 JSON 导入新词汇"
              onClick={() => router.push('/import')}
            />
            <ActionCard
              icon={<Library size={18} />}
              label="查看词库"
              sub={`共 ${totalCount} 个词 · 搜索、筛选、编辑`}
              onClick={() => router.push('/library')}
            />
            {newCount > 0 && (
              <ActionCard
                icon={<BookOpen size={18} />}
                label="学习新词"
                sub={`${newCount} 个新词等待学习`}
                onClick={() => router.push('/learn')}
              />
            )}
          </div>
        </section>

        {/* ── Incomplete warning ────────────────────────────────── */}
        {incompleteCount > 0 && (
          <section>
            <button
              onClick={() => router.push('/library?status=incomplete')}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 18px',
                background: 'var(--warning-bg)',
                border: '1px solid var(--warning)',
                borderRadius: '14px',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <div>
                <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--warning)', marginBottom: '2px' }}>
                  {incompleteCount} 个词条不完整
                </p>
                <p style={{ fontSize: '12px', color: 'var(--fg-2)' }}>
                  缺少必要的语法信息，点击查看
                </p>
              </div>
              <ArrowRight size={16} style={{ color: 'var(--warning)', flexShrink: 0 }} />
            </button>
          </section>
        )}

      </div>
    </div>
  )
}

// ── Stat card ─────────────────────────────────────────────────────

function StatCard({
  label, value, accent, note, onClick,
}: {
  label: string
  value: number
  accent: string
  note: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        padding: '18px 16px',
        textAlign: 'left',
        cursor: 'pointer',
        boxShadow: 'var(--shadow-sm)',
        transition: 'box-shadow 0.15s ease, transform 0.15s ease',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-md)'
        ;(e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-sm)'
        ;(e.currentTarget as HTMLElement).style.transform = 'translateY(0)'
      }}
    >
      <p style={{
        fontSize: '30px',
        fontWeight: 700,
        color: value > 0 ? accent : 'var(--muted)',
        lineHeight: 1,
        marginBottom: '6px',
        fontVariantNumeric: 'tabular-nums',
      }}>
        {value}
      </p>
      <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--fg)', marginBottom: '3px' }}>
        {label}
      </p>
      <p style={{ fontSize: '11px', color: 'var(--muted)' }}>
        {note}
      </p>
    </button>
  )
}

// ── Primary action card ───────────────────────────────────────────

function PrimaryActionCard({
  action, reviewCount, newCount, queuedCount,
  onReview, onLearn, onPractice,
}: {
  action: 'review' | 'learn' | 'practice'
  reviewCount: number
  newCount: number
  queuedCount: number
  onReview: () => void
  onLearn: () => void
  onPractice: () => void
}) {
  const config = {
    review: {
      icon: <RotateCcw size={22} />,
      label: '开始复习',
      sub: `${reviewCount} 个词正在等待复习`,
      onClick: onReview,
    },
    learn: {
      icon: <BookOpen size={22} />,
      label: '开始学习',
      sub: `${newCount} 个新词待学习`,
      onClick: onLearn,
    },
    practice: {
      icon: <BookOpen size={22} />,
      label: '开始练习',
      sub: `${queuedCount} 个词在练习队列中`,
      onClick: onPractice,
    },
  }[action]

  return (
    <button
      onClick={config.onClick}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '20px 22px',
        background: 'var(--accent)',
        border: 'none',
        borderRadius: '18px',
        cursor: 'pointer',
        boxShadow: 'var(--shadow-md)',
        transition: 'opacity 0.15s ease, transform 0.15s ease',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.opacity = '0.92'
        ;(e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.opacity = '1'
        ;(e.currentTarget as HTMLElement).style.transform = 'translateY(0)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{
          width: '42px', height: '42px',
          background: 'rgba(255,255,255,0.2)',
          borderRadius: '12px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--accent-fg)',
          flexShrink: 0,
        }}>
          {config.icon}
        </div>
        <div style={{ textAlign: 'left' }}>
          <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--accent-fg)', marginBottom: '2px' }}>
            {config.label}
          </p>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.75)' }}>
            {config.sub}
          </p>
        </div>
      </div>
      <ArrowRight size={20} style={{ color: 'rgba(255,255,255,0.7)', flexShrink: 0 }} />
    </button>
  )
}

// ── Action card ───────────────────────────────────────────────────

function ActionCard({
  icon, label, sub, onClick,
}: {
  icon: React.ReactNode
  label: string
  sub: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 18px',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '14px',
        cursor: 'pointer',
        boxShadow: 'var(--shadow-sm)',
        transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent-light)'
        ;(e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-md)'
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'
        ;(e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-sm)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{
          width: '38px', height: '38px',
          background: 'var(--surface-2)',
          borderRadius: '10px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--accent)',
          flexShrink: 0,
        }}>
          {icon}
        </div>
        <div style={{ textAlign: 'left' }}>
          <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--fg)', marginBottom: '2px' }}>
            {label}
          </p>
          <p style={{ fontSize: '12px', color: 'var(--muted)' }}>
            {sub}
          </p>
        </div>
      </div>
      <ArrowRight size={16} style={{ color: 'var(--muted)', flexShrink: 0 }} />
    </button>
  )
}

// ── Helpers ───────────────────────────────────────────────────────

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 6) return 'Bonne nuit'
  if (hour < 12) return 'Bonjour'
  if (hour < 18) return 'Bon après-midi'
  return 'Bonsoir'
}

function getSubtitle(): string {
  const hour = new Date().getHours()
  if (hour < 12) return '今天也一起学法语吧 ☕'
  if (hour < 18) return '下午好，继续今天的学习吧'
  return '晚上好，复习一下今天的单词吧'
}