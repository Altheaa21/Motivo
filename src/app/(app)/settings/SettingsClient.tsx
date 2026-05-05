'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateSettings, signOut, exportFullBackup, exportVocabularyOnly } from '@/app/actions/settings'
import type { AppSettings } from '@/types/database'
import { buildAiImportPrompt } from '@/lib/ai-import-prompt'
import {
  Download,
  LogOut,
  Save,
  User,
  BookOpen,
  Volume2,
  Type,
  Clipboard,
  Sparkles,
} from 'lucide-react'

function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

interface SettingsClientProps {
  settings: AppSettings | null
  profile: { email: string; display_name: string } | null
}

export function SettingsClient({ settings, profile }: SettingsClientProps) {
  const router = useRouter()
  const [s, setS] = useState(settings)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [exportingFull, setExportingFull] = useState(false)
  const [exportingVocab, setExportingVocab] = useState(false)
  const [copiedPrompt, setCopiedPrompt] = useState(false)

  async function handleSave() {
    if (!s) return

    setSaving(true)

    await updateSettings({
      daily_new_word_limit: s.daily_new_word_limit,
      daily_review_limit: s.daily_review_limit,
      tts_language: s.tts_language,
      tts_rate: s.tts_rate,
      tts_enabled: s.tts_enabled,
      accent_strictness: s.accent_strictness,
    })

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function handleSignOut() {
    await signOut()
    router.push('/login')
    router.refresh()
  }

  async function handleExportFull() {
    setExportingFull(true)
    const data = await exportFullBackup()
    if (data) downloadJson(data, `french-vocab-full-backup-${todayStr()}.json`)
    setExportingFull(false)
  }

  async function handleExportVocab() {
    setExportingVocab(true)
    const data = await exportVocabularyOnly()
    if (data) downloadJson(data, `french-vocab-words-${todayStr()}.json`)
    setExportingVocab(false)
  }

  async function handleCopyPrompt() {
    try {
      await navigator.clipboard.writeText(buildAiImportPrompt())
      setCopiedPrompt(true)
      setTimeout(() => setCopiedPrompt(false), 2000)
    } catch (error) {
      console.error('Failed to copy AI import prompt:', error)
      alert('复制失败，请检查浏览器权限。')
    }
  }

  function update(key: keyof AppSettings, value: unknown) {
    setS(prev => (prev ? { ...prev, [key]: value } : prev))
  }

  return (
    <div style={{ minHeight: '100%', background: 'var(--bg)' }}>
      <div
        style={{
          maxWidth: '680px',
          margin: '0 auto',
          padding: '32px 20px 48px',
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1
            className="font-display"
            style={{
              fontSize: 'clamp(24px, 4vw, 32px)',
              fontWeight: 700,
              color: 'var(--fg)',
              marginBottom: '6px',
            }}
          >
            设置
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--muted)' }}>
            管理学习节奏、语音偏好和数据备份。
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Account */}
          {/* Account */}
          <SectionCard icon={<User size={16} />} title="账号">
            <DisplayNameEditor
              initialName={profile?.display_name ?? ''}
              email={profile?.email ?? ''}
            />
          </SectionCard>
          
          {/* <SectionCard icon={<User size={16} />} title="账号">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <p style={{ fontSize: '14px', color: 'var(--fg)', fontWeight: 500 }}>
                  {profile?.display_name || '—'}
                </p>
                <p style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '2px' }}>
                  {profile?.email}
                </p>
              </div>

              <div
                style={{
                  padding: '4px 10px',
                  background: 'var(--success-bg)',
                  border: '1px solid var(--success)',
                  borderRadius: '100px',
                  fontSize: '11px',
                  fontWeight: 500,
                  color: 'var(--success)',
                }}
              >
                已同步
              </div>
            </div>
          </SectionCard> */}

          {/* Daily limits */}
          <SectionCard icon={<BookOpen size={16} />} title="每日限额">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <SliderRow
                label="每日新词上限"
                value={s?.daily_new_word_limit ?? 10}
                min={5}
                max={50}
                step={5}
                onChange={v => update('daily_new_word_limit', v)}
              />

              <SliderRow
                label="每日复习上限"
                value={s?.daily_review_limit ?? 30}
                min={10}
                max={100}
                step={10}
                onChange={v => update('daily_review_limit', v)}
              />
            </div>
          </SectionCard>

          {/* TTS */}
          <SectionCard icon={<Volume2 size={16} />} title="语音设置">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Enable toggle */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <p style={{ fontSize: '14px', color: 'var(--fg)' }}>启用语音</p>

                <button
                  onClick={() => update('tts_enabled', !s?.tts_enabled)}
                  style={{
                    width: '44px',
                    height: '24px',
                    borderRadius: '100px',
                    background: s?.tts_enabled ? 'var(--accent)' : 'var(--border)',
                    border: 'none',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'background 0.2s ease',
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      top: '3px',
                      left: s?.tts_enabled ? '22px' : '3px',
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      background: '#fff',
                      transition: 'left 0.2s ease',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                    }}
                  />
                </button>
              </div>

              {/* Language */}
              <div>
                <p
                  style={{
                    fontSize: '12px',
                    color: 'var(--muted)',
                    marginBottom: '8px',
                    fontWeight: 500,
                  }}
                >
                  语音语言
                </p>

                <div style={{ display: 'flex', gap: '8px' }}>
                  {[
                    { value: 'fr-FR', label: '法语（法国）' },
                    { value: 'fr-CA', label: '法语（加拿大）' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => update('tts_language', opt.value)}
                      style={{
                        flex: 1,
                        padding: '9px 12px',
                        borderRadius: '10px',
                        border: `1.5px solid ${
                          s?.tts_language === opt.value ? 'var(--accent)' : 'var(--border)'
                        }`,
                        background:
                          s?.tts_language === opt.value ? 'var(--surface-2)' : 'var(--surface)',
                        fontSize: '13px',
                        fontWeight: s?.tts_language === opt.value ? 600 : 400,
                        color: s?.tts_language === opt.value ? 'var(--fg)' : 'var(--muted)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Rate */}
              <SliderRow
                label={`语速：${s?.tts_rate ?? 0.9}`}
                value={s?.tts_rate ?? 0.9}
                min={0.5}
                max={1.5}
                step={0.1}
                onChange={v => update('tts_rate', v)}
              />
            </div>
          </SectionCard>

          {/* Accent */}
          <SectionCard icon={<Type size={16} />} title="重音严格度">
            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
              {[
                { value: 'lenient', label: '宽松（推荐）' },
                { value: 'strict', label: '严格' },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => update('accent_strictness', opt.value)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '12px',
                    border: `1.5px solid ${
                      s?.accent_strictness === opt.value ? 'var(--accent)' : 'var(--border)'
                    }`,
                    background:
                      s?.accent_strictness === opt.value ? 'var(--accent)' : 'var(--surface)',
                    fontSize: '13px',
                    fontWeight: 600,
                    color:
                      s?.accent_strictness === opt.value ? 'var(--accent-fg)' : 'var(--muted)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <p style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.5 }}>
              宽松模式下，缺少重音符号会算部分正确而非错误。
            </p>
          </SectionCard>

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              width: '100%',
              padding: '14px',
              background: 'var(--accent)',
              color: 'var(--accent-fg)',
              border: 'none',
              borderRadius: '14px',
              fontSize: '15px',
              fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.6 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: 'var(--shadow-sm)',
              transition: 'opacity 0.15s ease',
            }}
          >
            <Save size={16} />
            {saved ? '已保存 ✓' : saving ? '保存中...' : '保存设置'}
          </button>

          {/* Backup */}
          <SectionCard icon={<Download size={16} />} title="备份与导出">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <ExportButton
                label="导出完整备份 JSON"
                sub="包含所有词条、学习记录、复习历史"
                loading={exportingFull}
                onClick={handleExportFull}
              />

              <ExportButton
                label="导出词汇 JSON"
                sub="仅包含词汇内容，可重新通过 Import Preview 导入"
                loading={exportingVocab}
                onClick={handleExportVocab}
              />
            </div>
          </SectionCard>

          {/* AI Prompt */}
          <SectionCard icon={<Sparkles size={16} />} title="AI 导入 Prompt">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p
                style={{
                  fontSize: '13px',
                  color: 'var(--muted)',
                  lineHeight: 1.6,
                }}
              >
                复制用于生成 Import JSON Schema v1 的固定 prompt。日期会自动使用今天，复制后可以直接发给 AI。
              </p>

              <button
                onClick={handleCopyPrompt}
                type="button"
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  background: copiedPrompt ? 'var(--success-bg)' : 'var(--surface-2)',
                  color: copiedPrompt ? 'var(--success)' : 'var(--fg)',
                  border: `1px solid ${copiedPrompt ? 'var(--success)' : 'var(--border)'}`,
                  borderRadius: '14px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.15s ease',
                }}
              >
                <Clipboard size={15} />
                {copiedPrompt ? '已复制 ✓' : '复制 AI Prompt'}
              </button>

              <p
                style={{
                  fontSize: '12px',
                  color: 'var(--muted)',
                  lineHeight: 1.5,
                }}
              >
                用法：把课堂笔记或照片发给 AI，并附上这段 prompt。AI 会输出可导入的 JSON。
              </p>
            </div>
          </SectionCard>

          {/* Sign out */}
          <button
            onClick={handleSignOut}
            style={{
              width: '100%',
              padding: '13px',
              background: 'var(--danger-bg)',
              color: 'var(--danger)',
              border: '1px solid var(--danger)',
              borderRadius: '14px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <LogOut size={15} />
            退出登录
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Reusable components ───────────────────────────────────────────

function SectionCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}) {
  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '20px',
        padding: '20px 22px',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '16px',
        }}
      >
        <span style={{ color: 'var(--accent)' }}>{icon}</span>
        <p
          style={{
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--fg)',
            letterSpacing: '0.03em',
          }}
        >
          {title}
        </p>
      </div>

      {children}
    </div>
  )
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
}) {
  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '8px',
        }}
      >
        <p style={{ fontSize: '13px', color: 'var(--fg)' }}>{label}</p>
        <span
          style={{
            fontSize: '13px',
            fontWeight: 700,
            color: 'var(--accent)',
            minWidth: '32px',
            textAlign: 'right',
          }}
        >
          {value}
        </span>
      </div>

      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: '100%' }}
      />
    </div>
  )
}

function ExportButton({
  label,
  sub,
  loading,
  onClick,
}: {
  label: string
  sub: string
  loading: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        width: '100%',
        textAlign: 'left',
        padding: '14px 16px',
        background: 'var(--surface-2)',
        border: '1px solid var(--border)',
        borderRadius: '14px',
        cursor: loading ? 'not-allowed' : 'pointer',
        opacity: loading ? 0.6 : 1,
        transition: 'opacity 0.15s ease, border-color 0.15s ease',
      }}
      onMouseEnter={e => {
        if (!loading) {
          ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--accent-light)'
        }
      }}
      onMouseLeave={e => {
        ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'
      }}
    >
      <p
        style={{
          fontSize: '14px',
          fontWeight: 600,
          color: 'var(--fg)',
          marginBottom: '3px',
        }}
      >
        {loading ? '导出中...' : label}
      </p>

      <p style={{ fontSize: '12px', color: 'var(--muted)' }}>{sub}</p>
    </button>
  )
}

function DisplayNameEditor({
  initialName, email,
}: {
  initialName: string
  email: string
}) {
  const [name, setName] = useState(initialName)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    setSaving(true)
    const supabase = (await import('@/lib/supabase/client')).createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase
        .from('profiles')
        .update({ display_name: name, updated_at: new Date().toISOString() })
        .eq('id', user.id)
    }
    setSaving(false)
    setSaved(true)
    setEditing(false)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: '12px',
      }}>
        <div>
          <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '2px' }}>
            用户名
          </p>
          {editing ? (
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
              style={{
                padding: '7px 12px',
                background: 'var(--surface-2)',
                border: '1.5px solid var(--accent)',
                borderRadius: '10px',
                fontSize: '14px',
                color: 'var(--fg)',
                outline: 'none',
                minWidth: '160px',
              }}
            />
          ) : (
            <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--fg)' }}>
              {name || '—'}
              {saved && (
                <span style={{ fontSize: '12px', color: 'var(--success)', marginLeft: '8px' }}>
                  已保存 ✓
                </span>
              )}
            </p>
          )}
        </div>

        {editing ? (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => { setEditing(false); setName(initialName) }}
              style={{
                padding: '7px 14px',
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                fontSize: '13px', color: 'var(--muted)',
                cursor: 'pointer',
              }}
            >
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                padding: '7px 14px',
                background: 'var(--accent)', color: 'var(--accent-fg)',
                border: 'none', borderRadius: '10px',
                fontSize: '13px', fontWeight: 600,
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditing(true)}
            style={{
              padding: '7px 14px',
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              fontSize: '13px', color: 'var(--fg-2)',
              cursor: 'pointer',
            }}
          >
            编辑
          </button>
        )}
      </div>

      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div>
          <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '2px' }}>
            邮箱
          </p>
          <p style={{ fontSize: '14px', color: 'var(--fg-2)' }}>{email}</p>
        </div>
        <div style={{
          padding: '4px 10px',
          background: 'var(--success-bg)',
          border: '1px solid var(--success)',
          borderRadius: '100px',
          fontSize: '11px', fontWeight: 500,
          color: 'var(--success)',
        }}>
          已同步
        </div>
      </div>
    </div>
  )
}