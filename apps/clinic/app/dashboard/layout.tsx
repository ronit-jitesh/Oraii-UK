'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { createSupabaseClient } from '@oraii/core/auth'

const NAV = [
  {
    section: 'Clinical',
    items: [
      { href: '/dashboard',              label: 'Overview',       icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
      { href: '/dashboard/queue',        label: 'Triage queue',   icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
      { href: '/dashboard/clients',      label: 'Clients',        icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
      { href: '/dashboard/sessions',     label: 'Sessions',       icon: 'M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z' },
      { href: '/dashboard/notes',        label: 'Notes',          icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    ],
  },
  {
    section: 'Assessment',
    items: [
      { href: '/dashboard/risk',         label: 'Risk screening', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
      { href: '/dashboard/outcomes',     label: 'Outcome scores', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    ],
  },
  {
    section: 'Practice',
    items: [
      { href: '/dashboard/appointments', label: 'Appointments',   icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    ],
  },
  {
    section: 'Governance',
    items: [
      { href: '/dashboard/audit',        label: 'Audit log',      icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
    ],
  },
]

const SB = 256

const PAGE_LABELS: Record<string, string> = {
  '/dashboard':              'Overview',
  '/dashboard/queue':        'Triage Queue',
  '/dashboard/clients':      'Clients',
  '/dashboard/sessions':     'Sessions',
  '/dashboard/notes':        'Clinical Notes',
  '/dashboard/risk':         'Risk Screening',
  '/dashboard/outcomes':     'Outcome Scores',
  '/dashboard/appointments': 'Appointments',
  '/dashboard/audit':        'Audit Log',
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router   = useRouter()
  const [email, setEmail] = useState<string | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    // Get user email from Supabase session
    const supabase = createSupabaseClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      setEmail(session?.user?.email ?? null)
    }).catch(() => {
      // Fallback: try localStorage
      try {
        const key = Object.keys(localStorage).find(k => k.includes('supabase') && k.includes('session'))
        if (key) {
          const s = JSON.parse(localStorage.getItem(key) || '{}')
          setEmail(s?.user?.email || null)
        }
      } catch { /* ignore */ }
    })
  }, [])

  const pageLabel = PAGE_LABELS[pathname] || ''
  const initials  = email ? email.charAt(0).toUpperCase() : '?'

  const handleLogout = async () => {
    try {
      const supabase = createSupabaseClient()
      await supabase.auth.signOut()
      localStorage.clear()
    } catch { /* ignore */ }
    // Clear the activity cookie by navigating to login with a hard reload
    window.location.href = '/login'
  }

  // Close mobile sidebar on route change
  useEffect(() => { setMobileOpen(false) }, [pathname])

  // Track mobile breakpoint
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    setIsMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => { setIsMobile(e.matches); if (!e.matches) setMobileOpen(false) }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>

      {/* ═══ MOBILE OVERLAY ═══ */}
      {mobileOpen && (
        <div onClick={() => setMobileOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 55, transition: 'opacity 0.2s' }} />
      )}

      {/* ═══ SIDEBAR ═══ */}
      <aside style={{
        width: SB, minHeight: '100vh',
        background: '#0E0D0C',
        display: 'flex', flexDirection: 'column',
        position: 'fixed', top: 0, left: 0, zIndex: 60,
        borderRight: '0.5px solid rgba(255,255,255,0.06)',
        transition: 'transform 0.25s ease',
        transform: isMobile && !mobileOpen ? 'translateX(-100%)' : 'translateX(0)',
      }}>

        {/* Logo */}
        <div style={{ padding: '16px 18px 12px', borderBottom: '0.5px solid rgba(255,255,255,0.07)' }}>
          <img src="/logoo.png" alt="ORAII" style={{ width: '100%', maxWidth: 160, height: 'auto', display: 'block', filter: 'brightness(1.15) contrast(1.05)' }} />
          <p style={{ marginTop: 6, fontSize: '0.575rem', fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)' }}>
            Clinical · United Kingdom
          </p>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '6px 10px', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          {NAV.map((group) => (
            <div key={group.section} style={{ marginBottom: 4 }}>
              <p style={{ fontSize: '0.575rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', padding: '12px 8px 4px' }}>
                {group.section}
              </p>
              {group.items.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
                return (
                  <Link key={item.href} href={item.href}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '9px 10px', borderRadius: 9, marginBottom: 2,
                      fontSize: '0.845rem', fontWeight: isActive ? 600 : 400,
                      letterSpacing: '0.01em',
                      color: isActive ? '#74C69D' : 'rgba(255,255,255,0.52)',
                      background: isActive ? 'rgba(116,198,157,0.12)' : 'transparent',
                      textDecoration: 'none', transition: 'all 0.14s ease', position: 'relative',
                    }}
                    onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.82)' } }}
                    onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.52)' } }}
                  >
                    {isActive && <span style={{ position: 'absolute', left: 0, top: '20%', bottom: '20%', width: 3, background: '#74C69D', borderRadius: '0 3px 3px 0' }} />}
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: isActive ? 1 : 0.6 }}>
                      <path d={item.icon} />
                    </svg>
                    {item.label}
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div style={{ padding: '10px 16px 18px', borderTop: '0.5px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column', gap: 7 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#74C69D', display: 'inline-block', flexShrink: 0 }} />
            <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.22)', fontWeight: 500 }}>UK-GDPR · DPA 2018</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'inline-block', flexShrink: 0 }} />
            <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.22)', fontWeight: 500 }}>eu-west-2 London</span>
          </div>
        </div>
      </aside>

      {/* ═══ MAIN CONTENT ═══ */}
      <div style={{ marginLeft: isMobile ? 0 : SB, flex: 1, minHeight: '100vh', background: '#F7F5F0', display: 'flex', flexDirection: 'column' }}>

        {/* Top header */}
        <header style={{
          height: 52, background: '#fff', borderBottom: '0.5px solid #E2DDD5',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 1.25rem', position: 'sticky', top: 0, zIndex: 40,
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Mobile hamburger */}
            {isMobile && (
              <button onClick={() => setMobileOpen(!mobileOpen)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 8, border: '0.5px solid #E2DDD5', background: '#F7F5F0', cursor: 'pointer' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4A4744" strokeWidth="2" strokeLinecap="round"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
              </button>
            )}
            {!isMobile && (
              <>
                <img src="/logoo.png" alt="ORAII" style={{ height: 26, width: 'auto' }} />
                <div style={{ width: 1, height: 20, background: '#E2DDD5' }} />
              </>
            )}
            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1A1816' }}>{pageLabel}</p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {email && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 12px', borderRadius: 20, background: '#F7F5F0', border: '0.5px solid #E2DDD5' }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#D8EDDF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700, color: '#2D6A4F' }}>
                  {initials}
                </div>
                <span style={{ fontSize: '0.8rem', color: '#4A4744', fontWeight: 500, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {email}
                </span>
              </div>
            )}
            <button
              onClick={handleLogout}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 12px', borderRadius: 8,
                background: 'transparent', border: '0.5px solid #E2DDD5',
                fontSize: '0.8rem', fontWeight: 500, color: '#8B8680',
                cursor: 'pointer', transition: 'all 0.15s',
                fontFamily: 'Inter, system-ui, sans-serif',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = '#DC2626'; e.currentTarget.style.borderColor = '#FECACA'; e.currentTarget.style.background = '#FEF2F2' }}
              onMouseLeave={e => { e.currentTarget.style.color = '#8B8680'; e.currentTarget.style.borderColor = '#E2DDD5'; e.currentTarget.style.background = 'transparent' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
              </svg>
              Sign out
            </button>
          </div>
        </header>

        <main style={{ flex: 1 }}>
          {children}
        </main>
      </div>
    </div>
  )
}
