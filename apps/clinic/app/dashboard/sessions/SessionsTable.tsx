'use client'
import Link from 'next/link'

interface Session {
  id: string; date: string; status: string
  format: string | null; duration: number | null; patientName: string
}

const FORMAT_COLOR: Record<string, { bg: string; color: string }> = {
  SOAP:  { bg: '#D8EDDF', color: '#1B4332' },
  DAP:   { bg: '#DBEAFE', color: '#1E3A8A' },
  GIRP:  { bg: '#EDE9FE', color: '#4C1D95' },
  BIRP:  { bg: '#FCE7F3', color: '#831843' },
}

export default function SessionsTable({ sessions }: { sessions: Session[] }) {
  if (sessions.length === 0) {
    return (
      <div style={{
        background: '#fff', border: '0.5px solid #E2DDD5',
        borderRadius: 18, padding: '4rem', textAlign: 'center',
        boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: '#F0EDE6', display: 'flex', alignItems: 'center',
          justifyContent: 'center', margin: '0 auto 16px',
          border: '0.5px solid #E2DDD5',
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
            stroke="#B8B3AE" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        </div>
        <p style={{ fontWeight: 700, fontSize: '1rem', color: '#1A1816', marginBottom: 6 }}>No sessions yet</p>
        <p style={{ color: '#8B8680', fontSize: '0.875rem', marginBottom: 20 }}>
          Sessions appear here after you record and save them
        </p>
        <Link href="/dashboard" style={{
          display: 'inline-block',
          background: '#2D6A4F', color: '#fff',
          borderRadius: 10, padding: '11px 24px',
          fontWeight: 700, fontSize: '0.9rem', textDecoration: 'none',
        }}>
          Go to dashboard
        </Link>
      </div>
    )
  }

  return (
    <div style={{
      background: '#fff', border: '0.5px solid #E2DDD5',
      borderRadius: 18, overflow: 'hidden',
      boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
    }}>
      {/* Table header */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1.5fr 100px 100px 110px',
        padding: '10px 20px',
        background: '#F7F5F0',
        borderBottom: '0.5px solid #E2DDD5',
        gap: 10,
      }}>
        {['Client', 'Date', 'Format', 'Duration', 'Status'].map(h => (
          <div key={h} style={{
            fontSize: '0.65rem', fontWeight: 700,
            color: '#8B8680', textTransform: 'uppercase', letterSpacing: '0.09em',
          }}>
            {h}
          </div>
        ))}
      </div>

      {/* Rows */}
      {sessions.map((s, i) => {
        const fc = FORMAT_COLOR[s.format || ''] || { bg: '#F0EDE6', color: '#4A4744' }
        return (
          <div
            key={s.id}
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1.5fr 100px 100px 110px',
              padding: '14px 20px',
              borderBottom: i < sessions.length - 1 ? '0.5px solid #F0EDE6' : 'none',
              alignItems: 'center', gap: 10,
              transition: 'background 0.12s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#FAFAF8'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            {/* Client */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                background: '#D8EDDF', color: '#1B4332',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: '0.875rem',
              }}>
                {(s.patientName || 'A')[0].toUpperCase()}
              </div>
              <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#1A1816' }}>
                {s.patientName}
              </span>
            </div>

            {/* Date */}
            <span style={{ fontSize: '0.875rem', color: '#4A4744' }}>
              {new Date(s.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>

            {/* Format badge */}
            <span style={{
              display: 'inline-flex', alignItems: 'center',
              fontSize: '0.68rem', fontWeight: 700,
              padding: '3px 10px', borderRadius: 20,
              background: fc.bg, color: fc.color,
            }}>
              {s.format || 'SOAP'}
            </span>

            {/* Duration */}
            <span style={{ fontSize: '0.875rem', color: '#8B8680' }}>
              {s.duration ? `${s.duration} min` : '—'}
            </span>

            {/* Status badge */}
            <span style={{
              display: 'inline-flex', alignItems: 'center',
              fontSize: '0.68rem', fontWeight: 700,
              padding: '3px 10px', borderRadius: 20,
              background: s.status === 'complete' ? '#ECFDF5' : '#FEF3C7',
              color: s.status === 'complete' ? '#065F46' : '#92400E',
            }}>
              {s.status}
            </span>
          </div>
        )
      })}
    </div>
  )
}
