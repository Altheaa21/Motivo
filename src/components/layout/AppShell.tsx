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
const MOBILE_TOP_BAR = 52
const BOTTOM_NAV = 56

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { theme, toggle } = useTheme()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
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

  function toggleCollapse() {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem('sidebar-collapsed', String(next))
  }

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + '/')
  }

  const sidebarW = collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_FULL

  return (
    <div style={{ display: 'flex', minHeight: '100dvh' }}>

      {/* Mobile overlay */}
      {mobileOpen && !isDesktop && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 39,
            background: 'rgba(0,0,0,0.35)',
            backdropFilter: 'blur(2px)',
          }}
        />
      )}

      {/* Sidebar */}
      <aside
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          height: '100dvh',
          zIndex: 40,
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--surface)',
          borderRight: '1px solid var(--border)',
          width: isDesktop ? `${sidebarW}px` : `${SIDEBAR_FULL}px`,
          transform: isDesktop
            ? 'translateX(0)'
            : mobileOpen ? 'translateX(0)' : `translateX(-${SIDEBAR_FULL}px)`,
          transition: 'transform 0.25s ease, width 0.25s ease',
          boxShadow: (!isDesktop && mobileOpen) ? 'var(--shadow-lg)' : 'none',
          overflow: 'hidden',
        }}
      >
        {/* Logo row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed && isDesktop ? 'center' : 'space-between',
            padding: '0 16px',
            height: '60px',
            borderBottom: '1px solid var(--border)',
            flexShrink: 0,
          }}
        >
          {(!collapsed || !isDesktop) && (
            <div>
              <p style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                Mon
              </p>
              <h1 className="font-display" style={{ fontSize: '18px', fontWeight: 700, color: 'var(--accent)', lineHeight: 1.2 }}>
                {APP_NAME}
              </h1>
            </div>
          )}

          {/* Desktop collapse button */}
          {isDesktop && (
            <button
              onClick={toggleCollapse}
              style={{
                width: '28px', height: '28px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: '8px',
                background: 'var(--surface-2)',
                color: 'var(--muted)',
                border: 'none',
                cursor: 'pointer',
                flexShrink: 0,
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
                border: 'none',
                cursor: 'pointer',
                background: 'transparent',
              }}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Nav links */}
        <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: '2px', overflowY: 'auto' }}>
          {NAV_ITEMS.map(item => {
            const active = isActive(item.href)
            const Icon = item.icon
            const isCollapsedDesktop = collapsed && isDesktop
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                title={isCollapsedDesktop ? item.label : undefined}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  justifyContent: isCollapsedDesktop ? 'center' : undefined,
                  padding: isCollapsedDesktop ? '10px' : '10px 12px',
                  borderRadius: '12px',
                  fontWeight: 500,
                  fontSize: '14px',
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

        {/* Bottom */}
        <div style={{ padding: '8px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {(() => {
            const isCollapsedDesktop = collapsed && isDesktop
            const settingsActive = isActive('/settings')
            return (
              <>
                <Link
                  href="/settings"
                  onClick={() => setMobileOpen(false)}
                  title={isCollapsedDesktop ? 'Paramètres' : undefined}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    justifyContent: isCollapsedDesktop ? 'center' : undefined,
                    padding: isCollapsedDesktop ? '10px' : '10px 12px',
                    borderRadius: '12px',
                    fontWeight: 500,
                    fontSize: '14px',
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
                  title={isCollapsedDesktop ? (theme === 'light' ? 'Mode sombre' : 'Mode clair') : undefined}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    justifyContent: isCollapsedDesktop ? 'center' : undefined,
                    padding: isCollapsedDesktop ? '10px' : '10px 12px',
                    borderRadius: '12px',
                    fontWeight: 500,
                    fontSize: '14px',
                    color: 'var(--fg-2)',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    width: '100%',
                  }}
                >
                  {theme === 'light' ? <Moon size={18} style={{ flexShrink: 0 }} /> : <Sun size={18} style={{ flexShrink: 0 }} />}
                  {!isCollapsedDesktop && <span>{theme === 'light' ? 'Mode sombre' : 'Mode clair'}</span>}
                </button>
              </>
            )
          })()}
        </div>
      </aside>

      {/* Main */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          marginLeft: isDesktop ? `${sidebarW}px` : 0,
          transition: 'margin-left 0.25s ease',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Mobile top bar */}
        {!isDesktop && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 16px',
              height: `${MOBILE_TOP_BAR}px`,
              background: 'var(--surface)',
              borderBottom: '1px solid var(--border)',
              position: 'sticky',
              top: 0,
              zIndex: 20,
              flexShrink: 0,
            }}
          >
            <button
              onClick={() => setMobileOpen(true)}
              style={{ padding: '6px', color: 'var(--fg-2)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <Menu size={20} />
            </button>

            <span className="font-display" style={{ fontSize: '16px', fontWeight: 700, color: 'var(--accent)' }}>
              {APP_NAME}
            </span>

            <button
              onClick={toggle}
              style={{ padding: '6px', color: 'var(--fg-2)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
          </div>
        )}

        {/* Page */}
        <main
          style={{
            flex: 1,
            paddingBottom: !isDesktop ? `${BOTTOM_NAV + 8}px` : 0,
          }}
        >
          {children}
        </main>
      </div>

      {/* Bottom nav — mobile only */}
      {!isDesktop && (
        <nav
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 30,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-around',
            background: 'var(--surface)',
            borderTop: '1px solid var(--border)',
            height: `calc(${BOTTOM_NAV}px + env(safe-area-inset-bottom))`,
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}
        >
          {NAV_ITEMS.map(item => {
            const active = isActive(item.href)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '3px',
                  padding: '6px 12px',
                  color: active ? 'var(--accent)' : 'var(--muted)',
                  textDecoration: 'none',
                }}
              >
                <Icon size={20} strokeWidth={active ? 2.5 : 2} />
                <span style={{ fontSize: '10px', fontWeight: 500, lineHeight: 1 }}>{item.label}</span>
              </Link>
            )
          })}
        </nav>
      )}
    </div>
  )
}