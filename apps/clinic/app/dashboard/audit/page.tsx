'use client'
import { useState, useEffect } from 'react'
import { createSupabaseClient } from '@oraii/core/auth'

interface AuditEntry {
  id: string
  action: string
  resource_type: string
  resource_id: string | null
  patient_id: string | null
  session_id: string | null
  metadata: Record<string, any>
  created_at: string
}

const ACTION_CFG: Record<string, { color: string; bg: string; icon: string }> = {
  CREATE_PATIENT:       { color: '#1B4332', bg: '#D8EDDF', icon: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z' },
  CONSENT_GRANTED:      { color: '#065F46', bg: '#ECFDF5', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
  CONSENT_WITHDRAWN:    { color: '#991B1B', bg: '#FEF2F2', icon: 'M20.618 5.984A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016zM12 9v2m0 4h.01' },
  SAVE_SESSION:         { color: '#1E3A8A', bg: '#DBEAFE', icon: 'M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z' },
  SAVE_CSSRS:           { color: '#92400E', bg: '#FFFBEB', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
  SAVE_OUTCOME_SCORE:   { color: '#4C1D95', bg: '#EDE9FE', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  BOOK_APPOINTMENT:     { color: '#0E7490', bg: '#ECFEFF', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  LIST_PATIENTS:        { color: '#8B8680', bg: '#F0EDE6', icon: 'M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z' },
  AI_RISK_FLAG:         { color: '#DC2626', bg: '#FEE2E2', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
  SAVE_GRANULAR_CONSENT:{ color: '#065F46', bg: '#D1FAE5', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
}

const DEFAULT_CFG = { color: '#4A4744', bg: '#F0EDE6', icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' }

function Ico({ d, size = 16, color = 'currentColor' }: { d: string; size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d={d} /></svg>
}

function formatAction(action: string) {
  return action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export default function AuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState<string>('all')
  const [page, setPage]       = useState(0)
  const PAGE_SIZE = 50

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const supabase = createSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.id) { setLoading(false); return }
      const { data: therapist } = await supabase.from('therapists').select('id').eq('auth_user_id', user.id).single()
      if (!therapist?.id) { setLoading(false); return }

      let query = supabase
        .from('audit_log')
        .select('id, action, resource_type, resource_id, patient_id, session_id, metadata, created_at')
        .eq('therapist_id', therapist.id)
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

      if (filter !== 'all') {
        query = query.eq('action', filter)
      }

      const { data } = await query
      setEntries(data || [])
      setLoading(false)
    }
    load()
  }, [filter, page])

  const actions = ['all', ...Object.keys(ACTION_CFG)]

  return (
    <div style={{ padding: '2rem 2.5rem 3rem', maxWidth: 960 }}>
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontFamily: 'Lora, Georgia, serif', fontSize: '1.5rem', fontWeight: 700, color: '#1A1816', letterSpacing: '-0.02em', marginBottom: 5 }}>
          Audit Log
        </h1>
        <p style={{ color: '#8B8680', fontSize: '0.9rem' }}>UK-GDPR Article 30 — Records of Processing Activities · Insert-only · Tamper-evident</p>
      </div>

      {/* Info banner */}
      <div style={{ background: '#EFF6FF', border: '0.5px solid #BFDBFE', borderRadius: 14, padding: '14px 18px', marginBottom: '1.5rem', display: 'flex', alignItems: 'flex-start', gap: 12, fontSize: '0.875rem', color: '#1E3A8A', lineHeight: 1.55 }}>
        <Ico d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" size={18} color="#2563EB" />
        <p>Every clinical action is logged automatically. This log is append-only and cannot be edited or deleted, ensuring compliance with UK-GDPR and DPA 2018.</p>
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        {actions.map(a => {
          const isActive = filter === a
          const cfg = a === 'all' ? DEFAULT_CFG : (ACTION_CFG[a] || DEFAULT_CFG)
          return (
            <button key={a} onClick={() => { setFilter(a); setPage(0) }}
              style={{
                padding: '6px 12px', borderRadius: 10, fontSize: '0.75rem', fontWeight: 600,
                cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'all 0.15s',
                border: `1px solid ${isActive ? cfg.color : '#E2DDD5'}`,
                background: isActive ? cfg.bg : 'transparent',
                color: isActive ? cfg.color : '#8B8680',
              }}>
              {a === 'all' ? 'All actions' : formatAction(a)}
            </button>
          )
        })}
      </div>

      {/* Log entries */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#8B8680' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite', display: 'inline-block', marginRight: 8 }}><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
          Loading audit log...
        </div>
      ) : entries.length === 0 ? (
        <div style={{ background: '#fff', border: '0.5px dashed #E2DDD5', borderRadius: 16, padding: '3rem', textAlign: 'center' }}>
          <Ico d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" size={28} color="#B8B3AE" />
          <p style={{ color: '#8B8680', fontSize: '0.9rem', marginTop: 12 }}>No audit entries found{filter !== 'all' ? ` for "${formatAction(filter)}"` : ''}.</p>
        </div>
      ) : (
        <div style={{ background: '#fff', border: '0.5px solid #E2DDD5', borderRadius: 18, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          {/* Table header */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 120px 180px', padding: '10px 20px', background: '#F7F5F0', borderBottom: '0.5px solid #E2DDD5', gap: 12 }}>
            {['Action', 'Resource', 'Details', 'Timestamp'].map(h => (
              <span key={h} style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#8B8680' }}>{h}</span>
            ))}
          </div>

          {/* Rows */}
          {entries.map((entry, i) => {
            const cfg = ACTION_CFG[entry.action] || DEFAULT_CFG
            const meta = entry.metadata || {}
            const details: string[] = []
            if (meta.risk_level) details.push(`Risk: ${meta.risk_level}`)
            if (meta.instrument) details.push(meta.instrument)
            if (meta.score !== undefined) details.push(`Score: ${meta.score}`)
            if (meta.format) details.push(meta.format.toUpperCase())
            if (meta.consent_given !== undefined) details.push(meta.consent_given ? 'Granted' : 'Withdrawn')
            if (meta.label) details.push(meta.label)

            return (
              <div key={entry.id} style={{
                display: 'grid', gridTemplateColumns: '1fr 140px 120px 180px',
                padding: '13px 20px', gap: 12, alignItems: 'center',
                borderBottom: i < entries.length - 1 ? '0.5px solid #F0EDE6' : 'none',
                transition: 'background 0.1s',
              }}
                onMouseEnter={e => e.currentTarget.style.background = '#FAFAF8'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                {/* Action */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Ico d={cfg.icon} size={14} color={cfg.color} />
                  </div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: cfg.color }}>{formatAction(entry.action)}</span>
                </div>

                {/* Resource */}
                <span style={{ fontSize: '0.78rem', color: '#4A4744' }}>
                  {entry.resource_type.replace(/_/g, ' ')}
                  {entry.resource_id && <span style={{ display: 'block', fontSize: '0.65rem', color: '#B8B3AE', fontFamily: 'monospace' }}>{entry.resource_id.slice(0, 8)}…</span>}
                </span>

                {/* Details */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {details.map((d, j) => (
                    <span key={j} style={{ fontSize: '0.65rem', fontWeight: 600, padding: '2px 7px', borderRadius: 6, background: '#F0EDE6', color: '#4A4744' }}>{d}</span>
                  ))}
                </div>

                {/* Timestamp */}
                <span style={{ fontSize: '0.78rem', color: '#8B8680', fontFamily: 'monospace' }}>
                  {new Date(entry.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
        <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}
          style={{ padding: '8px 16px', borderRadius: 10, border: '0.5px solid #E2DDD5', background: page === 0 ? '#F7F5F0' : '#fff', color: page === 0 ? '#B8B3AE' : '#4A4744', fontSize: '0.85rem', fontWeight: 600, cursor: page === 0 ? 'default' : 'pointer', fontFamily: 'Inter, sans-serif' }}>
          ← Previous
        </button>
        <span style={{ fontSize: '0.78rem', color: '#8B8680' }}>Page {page + 1} · {entries.length} entries</span>
        <button onClick={() => setPage(page + 1)} disabled={entries.length < PAGE_SIZE}
          style={{ padding: '8px 16px', borderRadius: 10, border: '0.5px solid #E2DDD5', background: entries.length < PAGE_SIZE ? '#F7F5F0' : '#fff', color: entries.length < PAGE_SIZE ? '#B8B3AE' : '#4A4744', fontSize: '0.85rem', fontWeight: 600, cursor: entries.length < PAGE_SIZE ? 'default' : 'pointer', fontFamily: 'Inter, sans-serif' }}>
          Next →
        </button>
      </div>
    </div>
  )
}
