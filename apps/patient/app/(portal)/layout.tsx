'use client'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/home',         label: 'Home' },
  { href: '/chat',         label: 'Daji' },
  { href: '/journal',      label: 'Journal' },
  { href: '/mindos',       label: 'MindOS' },
  { href: '/safety-plan',  label: 'Safety plan' },
  { href: '/outcomes',     label: 'Progress' },
]

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <nav className="portal-nav">
        <div className="portal-nav-inner">
          <a href="/home" className="portal-wordmark">ORAII</a>
          <div className="portal-nav-links">
            {NAV.map(n => (
              <a
                key={n.href}
                href={n.href}
                className={`portal-nav-link${pathname === n.href ? ' active' : ''}`}
              >
                {n.label}
              </a>
            ))}
          </div>
        </div>
      </nav>
      {children}
    </div>
  )
}
