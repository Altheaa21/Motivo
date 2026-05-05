import { AuthForm } from './AuthForm'

export default function LoginPage() {
  return (
    <div style={{
      minHeight: '100dvh',
      background: 'var(--bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 20px',
      paddingTop: 'max(24px, var(--safe-top))',
      paddingBottom: 'max(24px, var(--safe-bottom))',
    }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <p style={{
            fontSize: '11px',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: 'var(--muted)',
            marginBottom: '8px',
            fontWeight: 500,
          }}>
            Mon
          </p>
          <h1 className="font-display" style={{
            fontSize: '42px',
            fontWeight: 700,
            color: 'var(--accent)',
            lineHeight: 1,
            marginBottom: '8px',
          }}>
            Motivo
          </h1>
          <p style={{
            fontSize: '14px',
            color: 'var(--muted)',
          }}>
            Mon Vocabulaire Personnel
          </p>
        </div>

        <AuthForm />

      </div>
    </div>
  )
}