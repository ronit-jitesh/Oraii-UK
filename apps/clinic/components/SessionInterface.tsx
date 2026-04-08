'use client'
import { useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import Recorder from './Recorder'

interface Props { patientId: string; patientName: string; sessionNumber: number }

function SessionTimer() {
  const [elapsed, setElapsed] = useState(0)
  const [running, setRunning] = useState(true)
  const startRef = useRef(Date.now())
  const pausedRef = useRef(0)

  useEffect(() => {
    if (!running) return
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current + pausedRef.current) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [running])

  const toggle = () => {
    if (running) {
      pausedRef.current += Date.now() - startRef.current
      setRunning(false)
    } else {
      startRef.current = Date.now()
      setRunning(true)
    }
  }

  const h = Math.floor(elapsed / 3600)
  const m = Math.floor((elapsed % 3600) / 60)
  const s = elapsed % 60
  const display = h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`

  const isOvertime = elapsed >= 50 * 60 // 50 min session standard

  return (
    <button onClick={toggle} title={running ? 'Pause timer' : 'Resume timer'}
      style={{
        display: 'flex', alignItems: 'center', gap: 7,
        padding: '5px 12px', borderRadius: 8, cursor: 'pointer',
        border: `1px solid ${isOvertime ? '#FECACA' : '#E2DDD5'}`,
        background: isOvertime ? '#FEF2F2' : '#F7F5F0',
        fontFamily: 'monospace', fontSize: '0.85rem', fontWeight: 700,
        color: isOvertime ? '#DC2626' : '#4A4744',
        transition: 'all 0.15s',
      }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        {running
          ? <><line x1="10" y1="4" x2="10" y2="20"/><line x1="14" y1="4" x2="14" y2="20"/></>
          : <polygon points="5,3 19,12 5,21" fill="currentColor" stroke="none" />}
      </svg>
      {display}
      {isOvertime && <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#DC2626' }}>OVERTIME</span>}
    </button>
  )
}

/* Brand mark — uses logoo.png */
function BrandMark() {
  return (
    <img src="/logoo.png" alt="ORAII" style={{ height: 26, width: 'auto', display: 'block' }} />
  )
}

export default function SessionInterface({ patientId, patientName, sessionNumber }: Props) {
  const router = useRouter()

  return (
    <main style={{ minHeight: '100vh', background: '#F7F5F0', display: 'flex', flexDirection: 'column' }}>

      {/* ── Session header ── */}
      <div style={{
        background: '#fff',
        borderBottom: '0.5px solid #E2DDD5',
        padding: '0 24px',
        height: 58,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Back button */}
          <button
            onClick={() => router.push('/dashboard')}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              color: '#8B8680', fontSize: '0.825rem', fontWeight: 500,
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'Inter, system-ui, sans-serif',
              padding: '6px 10px', borderRadius: 8, transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#F7F5F0'; e.currentTarget.style.color = '#4A4744' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#8B8680' }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back
          </button>

          {/* Divider */}
          <div style={{ width: 1, height: 22, background: '#E2DDD5' }} />

          {/* Brand mark */}
          <BrandMark />

          {/* Divider */}
          <div style={{ width: 1, height: 22, background: '#E2DDD5' }} />

          {/* Patient info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 9, background: '#D8EDDF',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'Lora, Georgia, serif',
              fontSize: '0.9375rem', fontWeight: 700, color: '#2D6A4F',
            }}>
              {(patientName || 'C')[0].toUpperCase()}
            </div>
            <div>
              <p style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1A1816', lineHeight: 1.2 }}>
                {patientName}
              </p>
              <p style={{ fontSize: '0.7rem', color: '#8B8680' }}>Session {sessionNumber}</p>
            </div>
          </div>
        </div>

        {/* Right: timer + badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <SessionTimer />
          <span style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: '0.75rem', fontWeight: 700,
            padding: '5px 12px', borderRadius: 8,
            color: '#2D6A4F', background: '#D8EDDF',
          }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#40916C', display: 'inline-block', animation: 'pulse 2s ease infinite' }} />
            Active Session
          </span>
          <span style={{
            fontSize: '0.65rem', fontWeight: 600,
            padding: '4px 10px', borderRadius: 7,
            color: '#8B8680', background: '#F0EDE6',
            border: '0.5px solid #E2DDD5',
          }}>
            UK-GDPR
          </span>
        </div>
      </div>

      {/* Recorder */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <Recorder patientId={patientId} patientName={patientName} sessionNumber={sessionNumber} />
      </div>
    </main>
  )
}
