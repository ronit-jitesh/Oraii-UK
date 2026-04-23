'use client'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/home',     label: 'Home',    emoji: '🏠' },
  { href: '/checkin',  label: 'Check-in',emoji: '✨' },
  { href: '/chat',     label: 'ORAII',   emoji: '💬' },
  { href: '/journal',  label: 'Journal', emoji: '📓' },
  { href: '/mindos',   label: 'Mind',    emoji: '🧠' },
]

const MORE_NAV = [
  { href: '/purpose',      label: 'Purpose' },
  { href: '/safety-plan',  label: 'Safety plan' },
  { href: '/outcomes',     label: 'Progress' },
  { href: '/appointments', label: 'Appointments' },
]

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      {/* Top nav — desktop */}
      <nav className="portal-nav" aria-label="Main navigation">
        <div className="portal-nav-inner">
          <a href="/home" className="portal-wordmark" style={{ display: 'inline-flex', alignItems: 'center' }}>
            <img src="/logoo.png" alt="ORAII home" style={{ height: 36, width: 'auto', objectFit: 'contain' }} />
          </a>
          <div className="portal-nav-links" style={{ display: 'flex' }}>
            {NAV.map(n => (
              <a key={n.href} href={n.href}
                className={`portal-nav-link${pathname === n.href ? ' active' : ''}`}
                aria-current={pathname === n.href ? 'page' : undefined}
              >
                {n.label}
              </a>
            ))}
            {MORE_NAV.map(n => (
              <a key={n.href} href={n.href}
                className={`portal-nav-link${pathname === n.href ? ' active' : ''}`}
                aria-current={pathname === n.href ? 'page' : undefined}
              >
                {n.label}
              </a>
            ))}
          </div>
        </div>
      </nav>

      {/* Content */}
      <main>{children}</main>

      {/* Bottom nav — mobile (5 primary tabs including MindOS) */}
      <nav
        aria-label="Mobile navigation"
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderTop: '0.5px solid var(--border)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          zIndex: 100,
        }}
        className="mobile-bottom-nav"
      >
        <div style={{
          display: 'flex', justifyContent: 'space-around', alignItems: 'center',
          maxWidth: 480, margin: '0 auto',
          height: 60,
        }}>
          {NAV.map(n => {
            const isActive = pathname === n.href
            return (
              <a
                key={n.href}
                href={n.href}
                aria-current={isActive ? 'page' : undefined}
                aria-label={n.label}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  gap: 2, textDecoration: 'none',
                  padding: '4px 0',
                  transition: 'all 0.15s ease',
                }}
              >
                <span style={{
                  fontSize: '1.25rem',
                  filter: isActive ? 'none' : 'grayscale(0.5)',
                  opacity: isActive ? 1 : 0.6,
                  transition: 'all 0.15s ease',
                  transform: isActive ? 'scale(1.1)' : 'none',
                }} aria-hidden="true">
                  {n.emoji}
                </span>
                <span style={{
                  fontSize: '0.6rem',
                  fontWeight: isActive ? 700 : 400,
                  color: isActive ? 'var(--primary)' : 'var(--muted)',
                  letterSpacing: '0.01em',
                }}>
                  {n.label}
                </span>
              </a>
            )
          })}
        </div>
      </nav>

      {/* Spacer for bottom nav */}
      <div className="mobile-nav-spacer" style={{ height: 72 }} />

      <style>{`
        @media (max-width: 768px) {
          .portal-nav-links { display: none !important; }
        }
        @media (min-width: 769px) {
          .mobile-bottom-nav { display: none !important; }
          .mobile-nav-spacer  { display: none !important; }
        }
      `}</style>
    </div>
  )
}
