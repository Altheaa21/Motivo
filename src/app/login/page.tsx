import { LoginForm } from '@/components/auth/LoginForm'

export default function LoginPage() {
  return (
    <div
      className="min-h-dvh flex items-center justify-center p-6"
      style={{ background: 'var(--background)' }}
    >
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <p className="text-xs tracking-[0.3em] uppercase mb-3" style={{ color: 'var(--muted)' }}>
            application privée
          </p>
          <h1 className="text-4xl font-bold tracking-tight" style={{ color: 'var(--accent)' }}>
            Français
          </h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>
            Mon Vocabulaire Personnel
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}