import { ReactNode } from 'react'

interface EmptyStateProps {
  icon: string
  title: string
  subtitle: string
  primaryLabel: string
  onPrimary: () => void
  secondaryLabel?: string
  onSecondary?: () => void
}

export function EmptyState({
  icon, title, subtitle,
  primaryLabel, onPrimary,
  secondaryLabel, onSecondary,
}: EmptyStateProps) {
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
          {icon}
        </div>

        <h2 style={{
          fontSize: '20px', fontWeight: 700,
          color: 'var(--fg)', marginBottom: '10px',
        }}>
          {title}
        </h2>
        <p style={{
          fontSize: '14px', color: 'var(--muted)',
          lineHeight: 1.6, marginBottom: '28px',
        }}>
          {subtitle}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button onClick={onPrimary} style={{
            width: '100%', padding: '13px',
            background: 'var(--accent)', color: 'var(--accent-fg)',
            border: 'none', borderRadius: '14px',
            fontSize: '14px', fontWeight: 600, cursor: 'pointer',
          }}>
            {primaryLabel}
          </button>
          {secondaryLabel && onSecondary && (
            <button onClick={onSecondary} style={{
              width: '100%', padding: '13px',
              background: 'transparent', color: 'var(--muted)',
              border: 'none', borderRadius: '14px',
              fontSize: '14px', cursor: 'pointer',
            }}>
              {secondaryLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}