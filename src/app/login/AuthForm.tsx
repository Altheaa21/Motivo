'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff } from 'lucide-react'

type Mode = 'login' | 'register'

export function AuthForm() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setInfo('')

    if (mode === 'register') {
      if (password.length < 6) {
        setError('密码至少需要 6 位字符。')
        return
      }
      if (password !== confirmPassword) {
        setError('两次输入的密码不一致，请重新确认。')
        return
      }
    }

    setLoading(true)
    const supabase = createClient()

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError('邮箱或密码错误，请重试。')
        setLoading(false)
        return
      }
      router.push('/today')
      router.refresh()
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) {
        if (error.message.includes('already registered')) {
          setError('该邮箱已注册，请直接登录。')
        } else {
          setError(error.message)
        }
        setLoading(false)
        return
      }
      // Try auto login
      const { error: loginError } = await supabase.auth.signInWithPassword({ email, password })
      if (loginError) {
        // Email confirmation required
        setInfo('注册成功！请前往邮箱点击验证链接后再登录。')
        setMode('login')
        setPassword('')
        setConfirmPassword('')
        setLoading(false)
        return
      }
      router.push('/today')
      router.refresh()
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '13px 16px',
    background: 'var(--surface)',
    border: '1.5px solid var(--border)',
    borderRadius: '14px',
    fontSize: '15px',
    color: 'var(--fg)',
    outline: 'none',
    transition: 'border-color 0.15s ease',
    boxSizing: 'border-box',
  }

  function onFocus(e: React.FocusEvent<HTMLInputElement>) {
    e.target.style.borderColor = 'var(--accent)'
  }
  function onBlur(e: React.FocusEvent<HTMLInputElement>) {
    e.target.style.borderColor = 'var(--border)'
  }

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: '24px',
      padding: '32px 28px',
      boxShadow: 'var(--shadow-md)',
    }}>

      {/* Mode tabs */}
      <div style={{
        display: 'flex',
        background: 'var(--surface-2)',
        borderRadius: '12px',
        padding: '4px',
        marginBottom: '28px',
        gap: '4px',
      }}>
        {(['login', 'register'] as Mode[]).map(m => (
          <button
            key={m}
            onClick={() => {
              setMode(m)
              setError('')
              setInfo('')
              setConfirmPassword('')
            }}
            style={{
              flex: 1, padding: '9px',
              borderRadius: '9px', border: 'none',
              fontSize: '14px', fontWeight: 600,
              cursor: 'pointer',
              background: mode === m ? 'var(--surface)' : 'transparent',
              color: mode === m ? 'var(--fg)' : 'var(--muted)',
              boxShadow: mode === m ? 'var(--shadow-sm)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            {m === 'login' ? '登录' : '注册'}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

          {/* Email */}
          <div>
            <label style={{
              display: 'block', fontSize: '12px', fontWeight: 600,
              color: 'var(--muted)', letterSpacing: '0.05em',
              textTransform: 'uppercase', marginBottom: '8px',
            }}>
              邮箱
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="votre@email.com"
              style={inputStyle}
              onFocus={onFocus}
              onBlur={onBlur}
            />
          </div>

          {/* Password */}
          <div>
            <label style={{
              display: 'block', fontSize: '12px', fontWeight: 600,
              color: 'var(--muted)', letterSpacing: '0.05em',
              textTransform: 'uppercase', marginBottom: '8px',
            }}>
              密码
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                style={{ ...inputStyle, paddingRight: '48px' }}
                onFocus={onFocus}
                onBlur={onBlur}
              />
              <button
                type="button"
                onClick={() => setShowPassword(s => !s)}
                style={{
                  position: 'absolute', right: '14px', top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none', border: 'none',
                  cursor: 'pointer', color: 'var(--muted)',
                  padding: '4px', display: 'flex', alignItems: 'center',
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Confirm password (register only) */}
          {mode === 'register' && (
            <div>
              <label style={{
                display: 'block', fontSize: '12px', fontWeight: 600,
                color: 'var(--muted)', letterSpacing: '0.05em',
                textTransform: 'uppercase', marginBottom: '8px',
              }}>
                确认密码
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  style={{
                    ...inputStyle,
                    paddingRight: '48px',
                    borderColor: confirmPassword && confirmPassword !== password
                      ? 'var(--danger)'
                      : 'var(--border)',
                  }}
                  onFocus={onFocus}
                  onBlur={onBlur}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(s => !s)}
                  style={{
                    position: 'absolute', right: '14px', top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none', border: 'none',
                    cursor: 'pointer', color: 'var(--muted)',
                    padding: '4px', display: 'flex', alignItems: 'center',
                  }}
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {confirmPassword && confirmPassword !== password && (
                <p style={{ fontSize: '12px', color: 'var(--danger)', marginTop: '6px' }}>
                  两次密码不一致
                </p>
              )}
            </div>
          )}

          {/* Register note */}
          {mode === 'register' && (
            <div style={{
              padding: '12px 14px',
              background: 'var(--warning-bg)',
              border: '1px solid var(--warning)',
              borderRadius: '10px',
              fontSize: '13px',
              color: 'var(--warning)',
              lineHeight: 1.5,
            }}>
              注册后需前往邮箱点击验证链接，验证后方可登录。
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{
              padding: '12px 14px',
              background: 'var(--danger-bg)',
              border: '1px solid var(--danger)',
              borderRadius: '10px',
              fontSize: '13px',
              color: 'var(--danger)',
            }}>
              {error}
            </div>
          )}

          {/* Info */}
          {info && (
            <div style={{
              padding: '12px 14px',
              background: 'var(--success-bg)',
              border: '1px solid var(--success)',
              borderRadius: '10px',
              fontSize: '13px',
              color: 'var(--success)',
              lineHeight: 1.5,
            }}>
              {info}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '14px',
              background: 'var(--accent)', color: 'var(--accent-fg)',
              border: 'none', borderRadius: '14px',
              fontSize: '15px', fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              marginTop: '4px',
              transition: 'opacity 0.15s ease',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            {loading
              ? (mode === 'login' ? '登录中...' : '注册中...')
              : (mode === 'login' ? 'Se connecter' : "S'inscrire")
            }
          </button>

        </div>
      </form>

      <p style={{
        textAlign: 'center', fontSize: '12px',
        color: 'var(--muted)', marginTop: '20px', lineHeight: 1.6,
      }}>
        {mode === 'login' ? '这是一个私人应用。' : '注册即可开始你的法语词汇学习。'}
      </p>
    </div>
  )
}