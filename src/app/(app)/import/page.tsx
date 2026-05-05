'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { previewImport } from '@/app/actions/import'
import { buildAiImportPrompt } from '@/lib/ai-import-prompt'
import { CheckCircle, Clipboard, Sparkles } from 'lucide-react'

const PLACEHOLDER = `{
  "schemaVersion": "1.0",
  "language": "fr",
  "source": {
    "type": "manual_ai_extraction",
    "title": "French vocabulary import",
    "createdAt": "2026-05-04",
    "notes": ""
  },
  "entries": []
}`

const STEPS = [
  '粘贴 AI 生成的 JSON',
  '系统检查格式与完整性',
  '进入导入预览页面',
  '处理重复词 / 冲突 / 不完整词条',
  '确认后写入词库',
]

export default function ImportPage() {
  const router = useRouter()
  const [json, setJson] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [copiedPrompt, setCopiedPrompt] = useState(false)

  async function handlePreview() {
    if (!json.trim()) {
      setError('请先粘贴 JSON 内容。')
      return
    }

    setError('')
    setLoading(true)

    const result = await previewImport(json)

    if (!result.success) {
      setError(result.error ?? '未知错误')
      setLoading(false)
      return
    }

    router.push(`/import/preview/${result.batchId}`)
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

  return (
    <div style={{ minHeight: '100%', background: 'var(--bg)' }}>
      <div
        style={{
          maxWidth: '800px',
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
              marginBottom: '8px',
            }}
          >
            导入单词
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: 1.6 }}>
            从 AI 生成的 JSON 导入你的课堂生词。导入前会先进入预览，不会直接写入词库。
          </p>
        </div>

        {/* Main layout */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) 280px',
            gap: '20px',
            alignItems: 'start',
          }}
          className="import-grid"
        >
          {/* Left: textarea card */}
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '20px',
              padding: '24px',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <p
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--fg)',
                marginBottom: '12px',
                letterSpacing: '0.03em',
              }}
            >
              粘贴 JSON
            </p>

            <textarea
              value={json}
              onChange={e => {
                setJson(e.target.value)
                setError('')
              }}
              placeholder={PLACEHOLDER}
              rows={16}
              style={{
                width: '100%',
                padding: '14px 16px',
                background: 'var(--bg)',
                border: `1.5px solid ${error ? 'var(--danger)' : 'var(--border)'}`,
                borderRadius: '14px',
                fontSize: '13px',
                fontFamily: 'monospace',
                color: 'var(--fg)',
                outline: 'none',
                resize: 'vertical',
                lineHeight: 1.6,
                transition: 'border-color 0.15s ease',
              }}
            />

            {error && (
              <div
                style={{
                  marginTop: '10px',
                  padding: '12px 14px',
                  background: 'var(--danger-bg)',
                  border: '1px solid var(--danger)',
                  borderRadius: '10px',
                  fontSize: '13px',
                  color: 'var(--danger)',
                }}
              >
                {error}
              </div>
            )}

            <button
              onClick={handlePreview}
              disabled={loading || !json.trim()}
              style={{
                width: '100%',
                marginTop: '16px',
                padding: '14px',
                background: 'var(--accent)',
                color: 'var(--accent-fg)',
                border: 'none',
                borderRadius: '14px',
                fontSize: '15px',
                fontWeight: 600,
                cursor: loading || !json.trim() ? 'not-allowed' : 'pointer',
                opacity: !json.trim() ? 0.45 : 1,
                transition: 'opacity 0.15s ease',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              {loading ? '分析中...' : '预览导入'}
            </button>
          </div>

          {/* Right: guide + prompt cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Guide card */}
            <div
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '20px',
                padding: '24px',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <p
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--fg)',
                  marginBottom: '16px',
                }}
              >
                导入流程
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {STEPS.map((step, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                    }}
                  >
                    <div
                      style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        background: 'var(--surface-2)',
                        border: '1px solid var(--border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px',
                        fontWeight: 700,
                        color: 'var(--accent)',
                        flexShrink: 0,
                        marginTop: '1px',
                      }}
                    >
                      {i + 1}
                    </div>
                    <p style={{ fontSize: '13px', color: 'var(--fg-2)', lineHeight: 1.5 }}>
                      {step}
                    </p>
                  </div>
                ))}
              </div>

              <div
                style={{
                  marginTop: '20px',
                  padding: '12px 14px',
                  background: 'var(--surface-2)',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                }}
              >
                <CheckCircle
                  size={15}
                  style={{ color: 'var(--success)', flexShrink: 0, marginTop: '1px' }}
                />
                <p style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.5 }}>
                  JSON 不会直接写入词库，导入前你可以先检查每个词条。
                </p>
              </div>
            </div>

            {/* AI prompt card */}
            <div
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '20px',
                padding: '20px',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '10px',
                }}
              >
                <Sparkles size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                <p
                  style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: 'var(--fg)',
                  }}
                >
                  AI Prompt
                </p>
              </div>

              <p
                style={{
                  fontSize: '12px',
                  color: 'var(--muted)',
                  lineHeight: 1.6,
                  marginBottom: '14px',
                }}
              >
                复制固定 prompt 给 AI，日期会自动替换成今天。适合搭配课堂笔记或照片使用。
              </p>

              <button
                onClick={handleCopyPrompt}
                type="button"
                style={{
                  width: '100%',
                  padding: '12px',
                  background: copiedPrompt ? 'var(--success-bg)' : 'var(--surface-2)',
                  color: copiedPrompt ? 'var(--success)' : 'var(--fg)',
                  border: `1px solid ${copiedPrompt ? 'var(--success)' : 'var(--border)'}`,
                  borderRadius: '12px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.15s ease',
                }}
              >
                <Clipboard size={14} />
                {copiedPrompt ? '已复制 ✓' : '复制 AI Prompt'}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile: stack guide below textarea */}
        <style>{`
          @media (max-width: 640px) {
            .import-grid {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>
      </div>
    </div>
  )
}