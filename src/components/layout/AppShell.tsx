'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from './ThemeProvider'
import {
  Sun, Moon, Settings, Menu, X, ChevronLeft, ChevronRight,
  BookOpen, RotateCcw, Library, Upload, LayoutDashboard
} from 'lucide-react'

const NAV_ITEMS = [
  { href: '/today', label: "Aujourd'hui", icon: LayoutDashboard },
  { href: '/learn', label: 'Apprendre', icon: BookOpen },
  { href: '/review', label: 'Réviser', icon: RotateCcw },
  { href: '/library', label: 'Mots', icon: Library },
  { href: '/import', label: 'Importer', icon: Upload },
] as const

const APP_NAME = 'Motivo'
const SIDEBAR_FULL = 220
const SIDEBAR_COLLAPSED = 64

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { theme, toggle } = useTheme()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const mq = window.matchMedia('(min-width: 768px)')
    setIsDesktop(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    const stored = localStorage.getItem('sidebar-collapsed')
    if (stored === 'true') setCollapsed(true)
  }, [])

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  function toggleCollapse() {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem('sidebar-collapsed', String(next))
  }

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + '/')
  }

  const sidebarW = isDesktop
    ? (collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_FULL)
    : SIDEBAR_FULL

  // Prevent layout flash before mount
  if (!mounted) {
    return (
      <div style={{ minHeight: '100dvh', background: 'var(--bg)' }}>
        {children}
      </div>
    )
  }

  return (
    <div className="app-root">

      {/* Mobile sidebar overlay */}
      {mobileOpen && !isDesktop && (
        <div
          className="sidebar-overlay"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`app-sidebar ${mobileOpen ? 'sidebar-open' : ''}`}
        style={{
          width: `${sidebarW}px`,
        }}
      >
        {/* Logo row */}
        <div
          className="sidebar-logo-row"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed && isDesktop ? 'center' : 'space-between',
            padding: `0 16px 16px`,
            paddingTop: `max(20px, var(--safe-top))`,
            borderBottom: '1px solid var(--border)',
            flexShrink: 0,
          }}
        >
          {(!collapsed || !isDesktop) && (
            <div>
              <p style={{
                fontSize: '10px', letterSpacing: '0.2em',
                textTransform: 'uppercase', color: 'var(--muted)',
              }}>
                Mon
              </p>
              <h1 className="font-display" style={{
                fontSize: '18px', fontWeight: 700,
                color: 'var(--accent)', lineHeight: 1.2,
              }}>
                {APP_NAME}
              </h1>
            </div>
          )}

          {/* Desktop collapse toggle */}
          {isDesktop && (
            <button
              onClick={toggleCollapse}
              style={{
                width: '28px', height: '28px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: '8px',
                background: 'var(--surface-2)',
                color: 'var(--muted)',
                border: 'none', cursor: 'pointer', flexShrink: 0,
              }}
            >
              {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>
          )}

          {/* Mobile close button */}
          {!isDesktop && (
            <button
              onClick={() => setMobileOpen(false)}
              style={{
                width: '28px', height: '28px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: '8px',
                color: 'var(--muted)',
                border: 'none', cursor: 'pointer',
                background: 'transparent',
              }}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Nav links */}
        <nav style={{
          flex: 1, padding: '12px 8px',
          display: 'flex', flexDirection: 'column', gap: '2px',
          overflowY: 'auto',
        }}>
          {NAV_ITEMS.map(item => {
            const active = isActive(item.href)
            const Icon = item.icon
            const isCollapsedDesktop = collapsed && isDesktop
            return (
              <Link
                key={item.href}
                href={item.href}
                title={isCollapsedDesktop ? item.label : undefined}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  justifyContent: isCollapsedDesktop ? 'center' : undefined,
                  padding: isCollapsedDesktop ? '10px' : '10px 12px',
                  borderRadius: '12px',
                  fontWeight: 500, fontSize: '14px',
                  background: active ? 'var(--accent)' : 'transparent',
                  color: active ? 'var(--accent-fg)' : 'var(--fg-2)',
                  textDecoration: 'none',
                }}
              >
                <Icon size={18} strokeWidth={active ? 2.5 : 2} style={{ flexShrink: 0 }} />
                {!isCollapsedDesktop && <span>{item.label}</span>}
              </Link>
            )
          })}
        </nav>

        {/* Bottom items */}
        <div style={{
          padding: '8px',
          paddingBottom: `max(16px, var(--safe-bottom))`,
          borderTop: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column', gap: '2px',
        }}>
          {(() => {
            const isCollapsedDesktop = collapsed && isDesktop
            const settingsActive = isActive('/settings')
            return (
              <>
                <Link
                  href="/settings"
                  title={isCollapsedDesktop ? 'Paramètres' : undefined}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    justifyContent: isCollapsedDesktop ? 'center' : undefined,
                    padding: isCollapsedDesktop ? '10px' : '10px 12px',
                    borderRadius: '12px',
                    fontWeight: 500, fontSize: '14px',
                    background: settingsActive ? 'var(--accent)' : 'transparent',
                    color: settingsActive ? 'var(--accent-fg)' : 'var(--fg-2)',
                    textDecoration: 'none',
                  }}
                >
                  <Settings size={18} style={{ flexShrink: 0 }} />
                  {!isCollapsedDesktop && <span>Paramètres</span>}
                </Link>

                <button
                  onClick={toggle}
                  title={isCollapsedDesktop
                    ? (theme === 'light' ? 'Mode sombre' : 'Mode clair')
                    : undefined}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    justifyContent: isCollapsedDesktop ? 'center' : undefined,
                    padding: isCollapsedDesktop ? '10px' : '10px 12px',
                    borderRadius: '12px',
                    fontWeight: 500, fontSize: '14px',
                    color: 'var(--fg-2)',
                    background: 'transparent', border: 'none',
                    cursor: 'pointer', width: '100%',
                  }}
                >
                  {theme === 'light'
                    ? <Moon size={18} style={{ flexShrink: 0 }} />
                    : <Sun size={18} style={{ flexShrink: 0 }} />
                  }
                  {!isCollapsedDesktop && (
                    <span>{theme === 'light' ? 'Mode sombre' : 'Mode clair'}</span>
                  )}
                </button>
              </>
            )
          })()}
        </div>
      </aside>

      {/* Main content */}
      <div
        className="app-main"
        style={{
          marginLeft: isDesktop ? `${sidebarW}px` : 0,
          transition: 'margin-left 0.25s ease',
        }}
      >
        {/* Mobile top bar */}
        {!isDesktop && (
          <div className="mobile-topbar">
            <button
              onClick={() => setMobileOpen(true)}
              style={{
                padding: '6px', color: 'var(--fg-2)',
                background: 'none', border: 'none', cursor: 'pointer',
                flexShrink: 0,
              }}
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>

            <span className="font-display" style={{
              fontSize: '16px', fontWeight: 700, color: 'var(--accent)',
            }}>
              {APP_NAME}
            </span>

            <button
              onClick={toggle}
              style={{
                padding: '6px', color: 'var(--fg-2)',
                background: 'none', border: 'none', cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
          </div>
        )}

        {/* Page */}
        <main style={{
          flex: 1,
          width: '100%',
          maxWidth: '100%',
          overflowX: 'hidden',
          boxSizing: 'border-box',
        }}>
          {children}
        </main>
      </div>

      {/* Bottom nav — mobile only */}
      {!isDesktop && (
        <nav className="bottom-nav">
          {NAV_ITEMS.map(item => {
            const active = isActive(item.href)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className="bottom-nav-item"
                style={{ color: active ? 'var(--accent)' : 'var(--muted)' }}
              >
                <Icon size={20} strokeWidth={active ? 2.5 : 2} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>
      )}
    </div>
  )
}