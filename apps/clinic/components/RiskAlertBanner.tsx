'use client'
import { useState } from 'react'
import type { RiskAlert } from './riskDetection'

const LEVEL = {
  critical: { bg: '#FEF2F2', border: '#FECACA', tx: '#991B1B', badge: '#DC2626', badgeTx: '#FEF2F2', label: 'CRITICAL' },
  high:     { bg: '#FFF7ED', border: '#FED7AA', tx: '#9A3412', badge: '#EA580C', badgeTx: '#FFF7ED', label: 'HIGH' },
  moderate: { bg: '#FFFBEB', border: '#FDE68A', tx: '#92400E', badge: '#D97706', badgeTx: '#FFFBEB', label: 'MODERATE' },
  low:      { bg: '#F0F9FF', border: '#BAE6FD', tx: '#0C4A6E', badge: '#0284C7', badgeTx: '#F0F9FF', label: 'LOW' },
}

interface Props { alerts: RiskAlert[]; onDismiss: (id: string) => void }

export default function RiskAlertBanner({ alerts, onDismiss }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const active = alerts.filter(a => !a.dismissed)
  if (active.length === 0) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <p style={{ fontSize: '0.625rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        Risk Alerts · {active.length} active
      </p>
      {active.map(alert => {
        const s = LEVEL[alert.level]
        const isExp = expanded === alert.id
        return (
          <div key={alert.id} style={{ borderRadius: 12, border: `1px solid ${s.border}`, background: s.bg, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px' }}>
              {/* Triangle icon */}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={s.badge} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}>
                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  <span style={{ fontSize: '0.6rem', fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: s.badge, color: s.badgeTx }}>{s.label}</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: s.tx }}>{alert.category}</span>
                </div>
                <p style={{ fontSize: '0.75rem', fontStyle: 'italic', color: s.tx, opacity: 0.85 }}>"{alert.phrase}"</p>
              </div>
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                <button onClick={() => setExpanded(isExp ? null : alert.id)} style={{ padding: 4, cursor: 'pointer', background: 'none', border: 'none', borderRadius: 6 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={s.tx} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d={isExp ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
                  </svg>
                </button>
                <button onClick={() => onDismiss(alert.id)} style={{ padding: 4, cursor: 'pointer', background: 'none', border: 'none', borderRadius: 6 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={s.tx} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            {isExp && (
              <div style={{ padding: '8px 12px 12px', borderTop: `1px solid ${s.border}` }}>
                <p style={{ fontSize: '0.75rem', color: s.tx, lineHeight: 1.6 }}>
                  <strong>Clinical action: </strong>{alert.recommendation}
                </p>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
