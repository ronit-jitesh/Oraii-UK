'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { updatePatientConsent } from '../../../../app/actions'

// ── Types ──────────────────────────────────────────────────────────────────
interface Patient {
  id: string; display_label: string
  consent_given: boolean; consent_date: string | null; created_at: string
}
interface RiskRow {
  id: string; assessed_at: string; clinician_risk_level: string | null
  clinician_notes: string | null; supervisor_notified: boolean; supervisor_notified_at: string | null
  wish_to_be_dead: boolean; passive_suicidal_ideation: boolean; ideation_with_method: boolean
  ideation_with_intent_no_plan: boolean; ideation_with_intent_and_plan: boolean
  preparatory_behaviour: boolean; interrupted_attempt: boolean
}
interface OutcomeRow { id: string; measure: string; score: number; severity: string | null; completed_at: string }
interface SessionRow { id: string; session_date: string; status: string; note_format: string | null; duration_minutes: number | null }
interface SafetyRow { id: string; version: number; created_at: string; warning_signs: string[]; internal_coping_strategies: string[]; crisis_contacts: any[] }
interface TriageFlag {
  id: string; severity: 'red' | 'amber' | 'green'; flag_type: string; trigger_source: string
  summary: string; status: 'open' | 'acknowledged' | 'resolved'; created_at: string
  resolved_at: string | null; resolution_note: string | null
}
interface Props { patient: Patient; riskHistory: RiskRow[]; outcomeHistory: OutcomeRow[]; sessions: SessionRow[]; safetyPlans: SafetyRow[]; triageFlags?: TriageFlag[] }

const RISK_CFG: Record<string, { color: string; bg: string; border: string; label: string }> = {
  low:      { color: '#1E40AF', bg: '#EFF6FF', border: '#BFDBFE', label: 'Low' },
  moderate: { color: '#92400E', bg: '#FFFBEB', border: '#FDE68A', label: 'Moderate' },
  high:     { color: '#991B1B', bg: '#FEF2F2', border: '#FECACA', label: 'HIGH' },
  imminent: { color: '#7F1D1D', bg: '#FEF2F2', border: '#FECACA', label: 'IMMINENT' },
}
const MEASURE_CFG: Record<string, { max: number; bands: [number, string, string][] }> = {
  'PHQ-9':  { max: 27, bands: [[4,'Minimal','#065F46'],[9,'Mild','#1E40AF'],[14,'Moderate','#92400E'],[19,'Mod-severe','#C2410C'],[27,'Severe','#991B1B']] },
  'GAD-7':  { max: 21, bands: [[4,'Minimal','#065F46'],[9,'Mild','#1E40AF'],[14,'Moderate','#92400E'],[21,'Severe','#991B1B']] },
  'CORE-10':{ max: 40, bands: [[10,'Low','#065F46'],[15,'Low-mod','#1E40AF'],[21,'Moderate','#92400E'],[40,'High','#991B1B']] },
}
function getBandColor(m: string, s: number) { const cfg = MEASURE_CFG[m]; if (!cfg) return '#8B8680'; const b = cfg.bands.find(([max]) => s <= max) ?? cfg.bands[cfg.bands.length - 1]; return b?.[2] ?? '#8B8680' }
function getBandLabel(m: string, s: number) { const cfg = MEASURE_CFG[m]; if (!cfg) return ''; const b = cfg.bands.find(([max]) => s <= max) ?? cfg.bands[cfg.bands.length - 1]; return b?.[1] ?? '' }

function Ico({ d, size = 16, color = 'currentColor' }: { d: string; size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d={d} /></svg>
}
function SectionHeader({ icon, title, count }: { icon: string; title: string; count?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
      <Ico d={icon} size={15} color="#8B8680" />
      <p style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#8B8680' }}>{title}</p>
      {count !== undefined && <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '1px 7px', borderRadius: 10, background: '#F0EDE6', color: '#8B8680' }}>{count}</span>}
    </div>
  )
}
function OutcomeSparkline({ data, measure }: { data: OutcomeRow[]; measure: string }) {
  const filtered = data.filter(d => d.measure === measure).slice(-8)
  if (filtered.length < 2) return null
  const max = MEASURE_CFG[measure]?.max || 27; const W = 120; const H = 32; const bw = W / filtered.length - 2
  return (
    <svg width={W} height={H} style={{ overflow: 'visible' }}>
      {filtered.map((d, i) => { const h = Math.max(3, (d.score / max) * H); return <rect key={d.id} x={i * (bw + 2)} y={H - h} width={bw} height={h} rx="2" fill={getBandColor(measure, d.score)} opacity={0.7} /> })}
    </svg>
  )
}

export default function ClientProfile({ patient, riskHistory, outcomeHistory, sessions, safetyPlans, triageFlags = [] }: Props) {
  const openFlags = triageFlags.filter(f => f.status !== 'resolved')
  const openRedCount   = openFlags.filter(f => f.severity === 'red').length
  const openAmberCount = openFlags.filter(f => f.severity === 'amber').length
  const router = useRouter()
  const [tab, setTab] = useState<'overview' | 'risk' | 'outcomes' | 'sessions' | 'safety' | 'flags'>('overview')
  // ── Consent state — local optimistic update ──
  const [consentGiven, setConsentGiven]   = useState(patient.consent_given)
  const [consentDate, setConsentDate]     = useState(patient.consent_date)
  const [consentSaving, setConsentSaving] = useState(false)
  const [consentError, setConsentError]   = useState<string | null>(null)
  const [consentSaved, setConsentSaved]   = useState(false)

  const handleConsentToggle = async (newValue: boolean) => {
    setConsentSaving(true); setConsentError(null); setConsentSaved(false)
    const res = await updatePatientConsent(patient.id, newValue)
    if (res.error) {
      setConsentError(res.error)
    } else {
      setConsentGiven(newValue)
      setConsentDate(newValue ? new Date().toISOString() : null)
      setConsentSaved(true)
      setTimeout(() => setConsentSaved(false), 3000)
    }
    setConsentSaving(false)
  }

  const latestRisk = riskHistory[0]
  const riskCfg    = latestRisk?.clinician_risk_level ? RISK_CFG[latestRisk.clinician_risk_level] : null
  const phq9Latest = [...outcomeHistory].reverse().find(o => o.measure === 'PHQ-9')
  const gad7Latest = [...outcomeHistory].reverse().find(o => o.measure === 'GAD-7')
  const PALETTE    = [{ bg: '#D8EDDF', text: '#1B4332' }, { bg: '#DBEAFE', text: '#1E3A8A' }, { bg: '#EDE9FE', text: '#4C1D95' }, { bg: '#FCE7F3', text: '#831843' }, { bg: '#FEF3C7', text: '#78350F' }]
  const ac         = PALETTE[(patient.display_label || 'A').charCodeAt(0) % 5] ?? PALETTE[0]!

  return (
    <div style={{ padding: '2rem 2.5rem 3rem', maxWidth: 900 }}>
      <button onClick={() => router.push('/dashboard/clients')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#8B8680', fontSize: '0.825rem', padding: 0, marginBottom: '1.5rem', fontFamily: 'Inter, system-ui, sans-serif' }}>
        <Ico d="M19 12H5M12 5l-7 7 7 7" size={14} /> All clients
      </button>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18, marginBottom: '1.75rem' }}>
        <div style={{ width: 60, height: 60, borderRadius: 18, background: ac.bg, color: ac.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Lora, Georgia, serif', fontSize: '1.5rem', fontWeight: 700, flexShrink: 0 }}>
          {(patient.display_label || 'A')[0]?.toUpperCase() ?? 'A'}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <h1 style={{ fontFamily: 'Lora, Georgia, serif', fontSize: '1.5rem', fontWeight: 700, color: '#1A1816', letterSpacing: '-0.02em' }}>{patient.display_label}</h1>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: consentGiven ? '#D8EDDF' : '#FEF3C7', color: consentGiven ? '#1B4332' : '#92400E' }}>
              {consentGiven ? 'Consent recorded' : 'Pending consent'}
            </span>
            {riskCfg && <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: riskCfg.bg, color: riskCfg.color, border: `0.5px solid ${riskCfg.border}` }}>Last risk: {riskCfg.label}</span>}
          </div>
          <p style={{ color: '#8B8680', fontSize: '0.875rem', marginTop: 5 }}>
            Added {new Date(patient.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            {consentDate && ` · Consent ${new Date(consentDate).toLocaleDateString('en-GB')}`}
          </p>
        </div>
        <button onClick={() => router.push(`/session/${patient.id}`)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 20px', background: '#2D6A4F', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', fontFamily: 'Inter, system-ui, sans-serif', flexShrink: 0 }}>
          <Ico d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" size={14} color="#fff" /> Start session
        </button>
      </div>

      {/* Open flags banner */}
      {(openRedCount > 0 || openAmberCount > 0) && (
        <div
          onClick={() => setTab('flags')}
          style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 16px', marginBottom: 14, borderRadius: 12,
            background: openRedCount > 0 ? '#FEF2F2' : '#FFFBEB',
            border: `0.5px solid ${openRedCount > 0 ? '#FECACA' : '#FDE68A'}`,
            borderLeft: `3px solid ${openRedCount > 0 ? '#DC2626' : '#F59E0B'}`,
            cursor: 'pointer',
          }}
        >
          <span style={{ fontSize: '1.15rem' }}>{openRedCount > 0 ? '🚩' : '⚠️'}</span>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '0.875rem', fontWeight: 700, color: openRedCount > 0 ? '#B91C1C' : '#92400E', margin: 0 }}>
              {openRedCount > 0 && `${openRedCount} urgent flag${openRedCount > 1 ? 's' : ''}`}
              {openRedCount > 0 && openAmberCount > 0 && ' · '}
              {openAmberCount > 0 && `${openAmberCount} review flag${openAmberCount > 1 ? 's' : ''}`}
            </p>
            <p style={{ fontSize: '0.78rem', color: openRedCount > 0 ? '#991B1B' : '#78350F', margin: '2px 0 0' }}>
              Raised by patient activity — click to review and resolve.
            </p>
          </div>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: openRedCount > 0 ? '#B91C1C' : '#92400E' }}>Open →</span>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: '1.75rem', background: '#F7F5F0', border: '0.5px solid #E2DDD5', borderRadius: 14, padding: 4 }}>
        {[{ id: 'overview', label: 'Overview' }, { id: 'flags', label: `Flags (${openFlags.length})` }, { id: 'risk', label: `Risk (${riskHistory.length})` }, { id: 'outcomes', label: `Scores (${outcomeHistory.length})` }, { id: 'sessions', label: `Sessions (${sessions.length})` }, { id: 'safety', label: `Safety plans (${safetyPlans.length})` }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)} style={{ flex: 1, padding: '9px 4px', borderRadius: 11, fontSize: '0.82rem', fontWeight: tab === t.id ? 700 : 500, cursor: 'pointer', fontFamily: 'Inter, sans-serif', border: 'none', transition: 'all 0.15s', background: tab === t.id ? '#fff' : 'transparent', color: tab === t.id ? '#2D6A4F' : '#8B8680', boxShadow: tab === t.id ? '0 1px 4px rgba(0,0,0,0.08)' : 'none' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {tab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

          {/* ── CONSENT CARD — full width, top of grid ── */}
          <div style={{ gridColumn: '1 / -1', background: consentGiven ? '#F0FDF4' : '#FFFBEB', border: `1.5px solid ${consentGiven ? '#6EE7B7' : '#FDE68A'}`, borderRadius: 16, padding: '20px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: consentGiven ? '#D1FAE5' : '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Ico d={consentGiven ? 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' : 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'} size={18} color={consentGiven ? '#059669' : '#D97706'} />
                  </div>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: '0.9375rem', color: consentGiven ? '#065F46' : '#78350F' }}>
                      {consentGiven ? 'Informed consent collected' : 'Consent not yet collected'}
                    </p>
                    <p style={{ fontSize: '0.78rem', color: consentGiven ? '#047857' : '#92400E', marginTop: 2 }}>
                      {consentGiven
                        ? `Recorded ${consentDate ? new Date(consentDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : ''} · UK-GDPR Article 9(2)(a)`
                        : 'Required before risk screening and outcome scores can be saved · UK-GDPR Article 9'}
                    </p>
                  </div>
                </div>
                {!consentGiven && (
                  <p style={{ fontSize: '0.82rem', color: '#92400E', lineHeight: 1.55, background: '#FEF3C7', borderRadius: 8, padding: '10px 14px' }}>
                    Before recording clinical data, the client must be informed about: how their data is processed, their right to withdraw consent, data retention (7 years), and that AI tools assist (but do not replace) clinical decision-making. Verbal consent is sufficient — note the date below.
                  </p>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
                {/* ── CONSENT TOGGLE BUTTON ── */}
                <button
                  onClick={() => handleConsentToggle(!consentGiven)}
                  disabled={consentSaving}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 12, fontWeight: 700, fontSize: '0.875rem', cursor: consentSaving ? 'wait' : 'pointer', fontFamily: 'Inter, system-ui, sans-serif', border: 'none', transition: 'all 0.15s', background: consentGiven ? '#FEF2F2' : '#2D6A4F', color: consentGiven ? '#991B1B' : '#fff' }}>
                  {consentSaving ? (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
                      Saving...
                    </>
                  ) : consentGiven ? (
                    <><Ico d="M6 18L18 6M6 6l12 12" size={14} color="#991B1B" /> Withdraw consent</>
                  ) : (
                    <><Ico d="M5 13l4 4L19 7" size={14} color="#fff" /> Mark consent collected</>
                  )}
                </button>
                {consentSaved && <p style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600 }}>✓ Saved</p>}
                {consentError && <p style={{ fontSize: '0.75rem', color: '#DC2626' }}>{consentError}</p>}
              </div>
            </div>
          </div>

          {/* Last risk assessment */}
          <div style={{ background: '#fff', border: `0.5px solid ${riskCfg ? riskCfg.border : '#E2DDD5'}`, borderRadius: 16, padding: '18px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            <SectionHeader icon="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" title="Last C-SSRS" />
            {latestRisk ? (
              <div>
                <span style={{ fontFamily: 'Lora, serif', fontSize: '1.5rem', fontWeight: 700, color: riskCfg?.color || '#1A1816' }}>{riskCfg?.label || latestRisk.clinician_risk_level}</span>
                <p style={{ fontSize: '0.78rem', color: '#8B8680', marginTop: 4 }}>{new Date(latestRisk.assessed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                {latestRisk.supervisor_notified && <p style={{ fontSize: '0.75rem', color: '#059669', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}><Ico d="M5 13l4 4L19 7" size={12} color="#059669" /> Supervisor notified</p>}
                <button onClick={() => setTab('risk')} style={{ marginTop: 10, fontSize: '0.78rem', color: '#2D6A4F', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 600 }}>View full history →</button>
              </div>
            ) : <p style={{ fontSize: '0.875rem', color: '#8B8680' }}>No C-SSRS assessments yet</p>}
          </div>

          {/* Outcome scores */}
          <div style={{ background: '#fff', border: '0.5px solid #E2DDD5', borderRadius: 16, padding: '18px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            <SectionHeader icon="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" title="Outcome scores" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[{ label: 'PHQ-9', latest: phq9Latest }, { label: 'GAD-7', latest: gad7Latest }].map(({ label, latest }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#4A4744' }}>{label}</span>
                    <OutcomeSparkline data={outcomeHistory} measure={label} />
                  </div>
                  {latest ? (
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontFamily: 'Lora, serif', fontSize: '1.25rem', fontWeight: 700, color: getBandColor(label, latest.score) }}>{latest.score}</span>
                      <span style={{ fontSize: '0.68rem', color: '#8B8680', display: 'block' }}>{getBandLabel(label, latest.score)}</span>
                    </div>
                  ) : <span style={{ fontSize: '0.78rem', color: '#B8B3AE' }}>No scores</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Sessions summary */}
          <div style={{ background: '#fff', border: '0.5px solid #E2DDD5', borderRadius: 16, padding: '18px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            <SectionHeader icon="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" title="Sessions" count={sessions.length} />
            {sessions.length > 0 ? sessions.slice(0, 3).map(s => (
              <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, borderBottom: '0.5px solid #F0EDE6', marginBottom: 8 }}>
                <span style={{ fontSize: '0.875rem', color: '#1A1816' }}>{new Date(s.session_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  {s.note_format && <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: '#D8EDDF', color: '#1B4332' }}>{s.note_format}</span>}
                  <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: s.status === 'complete' ? '#ECFDF5' : '#FEF3C7', color: s.status === 'complete' ? '#065F46' : '#92400E' }}>{s.status}</span>
                </div>
              </div>
            )) : <p style={{ fontSize: '0.875rem', color: '#8B8680' }}>No sessions recorded</p>}
          </div>

          {/* Governance */}
          <div style={{ background: '#fff', border: '0.5px solid #E2DDD5', borderRadius: 16, padding: '18px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            <SectionHeader icon="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" title="Governance" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[['Data residency', 'eu-west-2 London'], ['Legal basis', 'GDPR Art 9(2)(a)'], ['Retention', '7 years'], ['Safety plans', `${safetyPlans.length} on record`]].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.82rem', color: '#8B8680' }}>{k}</span>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#1A1816' }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── RISK TAB ── */}
      {tab === 'risk' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {riskHistory.length === 0 ? (
            <div style={{ background: '#fff', border: '0.5px solid #E2DDD5', borderRadius: 16, padding: '3rem', textAlign: 'center' }}>
              <p style={{ color: '#8B8680', fontSize: '0.9rem' }}>No C-SSRS assessments on record.</p>
              <button onClick={() => router.push('/dashboard/risk')} style={{ marginTop: 14, padding: '10px 20px', background: '#2D6A4F', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, system-ui, sans-serif' }}>Conduct C-SSRS assessment</button>
            </div>
          ) : riskHistory.map((r, i) => {
            const rc = r.clinician_risk_level ? (RISK_CFG[r.clinician_risk_level] || RISK_CFG.low) : RISK_CFG.low
            const endorsed = [r.wish_to_be_dead && 'Wish to be dead', r.passive_suicidal_ideation && 'Passive ideation', r.ideation_with_method && 'Ideation with method', r.ideation_with_intent_no_plan && 'Intent (no plan)', r.ideation_with_intent_and_plan && 'Intent with plan', r.preparatory_behaviour && 'Preparatory behaviour', r.interrupted_attempt && 'Interrupted attempt'].filter(Boolean)
            return (
              <div key={r.id} style={{ background: rc.bg, border: `0.5px solid ${rc.border}`, borderRadius: 16, padding: '18px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontFamily: 'Lora, serif', fontSize: '1.25rem', fontWeight: 700, color: rc.color }}>{rc.label}</span>
                      {i === 0 && <span style={{ fontSize: '0.6rem', fontWeight: 700, padding: '2px 7px', borderRadius: 10, background: rc.color, color: '#fff' }}>Latest</span>}
                    </div>
                    <p style={{ fontSize: '0.78rem', color: rc.color, opacity: 0.75, marginTop: 2 }}>{new Date(r.assessed_at).toLocaleString('en-GB')}</p>
                  </div>
                  {r.supervisor_notified && <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#059669' }}><Ico d="M5 13l4 4L19 7" size={11} color="#059669" /> Supervisor notified</span>}
                </div>
                {endorsed.length > 0 && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>{endorsed.map((e, j) => <span key={j} style={{ fontSize: '0.68rem', fontWeight: 600, padding: '2px 8px', borderRadius: 8, background: '#FEF2F2', color: '#991B1B' }}>{e}</span>)}</div>}
                {r.clinician_notes && <p style={{ fontSize: '0.82rem', color: rc.color, lineHeight: 1.55, background: `${rc.border}40`, borderRadius: 8, padding: '8px 12px' }}>{r.clinician_notes}</p>}
              </div>
            )
          })}
        </div>
      )}

      {/* ── OUTCOMES TAB ── */}
      {tab === 'outcomes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {(['PHQ-9', 'GAD-7'] as const).map(measure => {
            const rows = outcomeHistory.filter(o => o.measure === measure)
            if (!rows.length) return <div key={measure} style={{ background: '#fff', border: '0.5px solid #E2DDD5', borderRadius: 14, padding: '16px 20px' }}><p style={{ fontWeight: 700, color: '#1A1816', marginBottom: 4 }}>{measure}</p><p style={{ fontSize: '0.82rem', color: '#8B8680' }}>No scores recorded.</p></div>
            const latest = rows[rows.length - 1]; const cfg = MEASURE_CFG[measure]

            // ── Expanded trend chart ──
            const CW = 700; const CH = 180; const PL = 40; const PR = 16; const PT = 16; const PB = 36
            const plotW = CW - PL - PR; const plotH = CH - PT - PB
            const maxScore = cfg.max
            const points = rows.map((r, i) => ({
              x: PL + (rows.length > 1 ? (i / (rows.length - 1)) * plotW : plotW / 2),
              y: PT + plotH - (r.score / maxScore) * plotH,
              score: r.score,
              date: new Date(r.completed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
              fullDate: new Date(r.completed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
              color: getBandColor(measure, r.score),
              band: getBandLabel(measure, r.score),
            }))
            const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')

            return (
              <div key={measure} style={{ background: '#fff', border: '0.5px solid #E2DDD5', borderRadius: 16, padding: '18px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div><p style={{ fontWeight: 700, color: '#1A1816' }}>{measure}</p><p style={{ fontSize: '0.775rem', color: '#8B8680' }}>{rows.length} administrations</p></div>
                  <div style={{ textAlign: 'right' }}><span style={{ fontFamily: 'Lora, serif', fontSize: '2rem', fontWeight: 700, color: getBandColor(measure, latest.score) }}>{latest.score}</span><p style={{ fontSize: '0.72rem', color: '#8B8680' }}>{getBandLabel(measure, latest.score)} · Latest</p></div>
                </div>

                {/* Progress bar */}
                <div style={{ height: 6, background: '#F0EDE6', borderRadius: 3, overflow: 'hidden', marginBottom: 18 }}><div style={{ height: '100%', borderRadius: 3, background: getBandColor(measure, latest.score), width: `${(latest.score / cfg.max) * 100}%` }} /></div>

                {/* ── SVG Trend Chart with band colours ── */}
                <div style={{ background: '#FAFAF8', border: '0.5px solid #F0EDE6', borderRadius: 14, padding: '12px 8px 4px', marginBottom: 16 }}>
                  <svg width="100%" viewBox={`0 0 ${CW} ${CH}`} style={{ display: 'block' }}>
                    {/* Band background fills */}
                    {cfg.bands.map((band, bi) => {
                      const prevMax = bi > 0 ? cfg.bands[bi - 1][0] : 0
                      const bandTop = PT + plotH - ((band[0] as number) / maxScore) * plotH
                      const bandBot = PT + plotH - ((prevMax as number) / maxScore) * plotH
                      return (
                        <rect key={bi} x={PL} y={bandTop} width={plotW} height={bandBot - bandTop}
                          fill={band[2] as string} opacity={0.06} />
                      )
                    })}

                    {/* Band threshold lines + labels */}
                    {cfg.bands.slice(0, -1).map((band, bi) => {
                      const y = PT + plotH - ((band[0] as number) / maxScore) * plotH
                      return (
                        <g key={bi}>
                          <line x1={PL} y1={y} x2={PL + plotW} y2={y} stroke={band[2] as string} strokeWidth="0.5" strokeDasharray="4 3" opacity={0.5} />
                          <text x={PL - 4} y={y + 3} textAnchor="end" fontSize="9" fill="#B8B3AE" fontFamily="Inter, sans-serif">{band[0]}</text>
                        </g>
                      )
                    })}

                    {/* Y-axis labels: 0 and max */}
                    <text x={PL - 4} y={PT + plotH + 3} textAnchor="end" fontSize="9" fill="#B8B3AE" fontFamily="Inter, sans-serif">0</text>
                    <text x={PL - 4} y={PT + 3} textAnchor="end" fontSize="9" fill="#B8B3AE" fontFamily="Inter, sans-serif">{maxScore}</text>

                    {/* Line + area fill */}
                    {points.length > 1 && (
                      <>
                        <path d={`${linePath} L${points[points.length-1].x},${PT + plotH} L${points[0].x},${PT + plotH} Z`}
                          fill={getBandColor(measure, latest.score)} opacity={0.08} />
                        <path d={linePath} fill="none" stroke={getBandColor(measure, latest.score)} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      </>
                    )}

                    {/* Data points with score labels */}
                    {points.map((p, i) => (
                      <g key={i}>
                        <circle cx={p.x} cy={p.y} r={5} fill="#fff" stroke={p.color} strokeWidth="2.5" />
                        <text x={p.x} y={p.y - 10} textAnchor="middle" fontSize="10" fontWeight="700" fill={p.color} fontFamily="Inter, sans-serif">{p.score}</text>
                        {/* X-axis date labels */}
                        <text x={p.x} y={CH - 6} textAnchor="middle" fontSize="8.5" fill="#8B8680" fontFamily="Inter, sans-serif"
                          transform={rows.length > 6 ? `rotate(-30, ${p.x}, ${CH - 6})` : ''}>{p.date}</text>
                      </g>
                    ))}
                  </svg>

                  {/* Band legend */}
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'center', padding: '8px 0 4px', flexWrap: 'wrap' }}>
                    {cfg.bands.map((band, bi) => (
                      <div key={bi} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ width: 8, height: 8, borderRadius: 2, background: band[2] as string, display: 'inline-block' }} />
                        <span style={{ fontSize: '0.65rem', color: '#8B8680', fontWeight: 500 }}>≤{band[0]} {band[1]}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Score history list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {rows.slice().reverse().map((r, i) => {
                    const prev = rows.slice().reverse()[i - 1]; const diff = prev ? r.score - prev.score : 0
                    return (
                      <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: 8, background: '#F7F5F0' }}>
                        <span style={{ fontSize: '0.78rem', color: '#8B8680' }}>{new Date(r.completed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          {i > 0 && diff !== 0 && <span style={{ fontSize: '0.72rem', color: diff > 0 ? '#991B1B' : '#059669' }}>{diff > 0 ? '↑' : '↓'}{Math.abs(diff)}</span>}
                          <span style={{ fontWeight: 700, color: getBandColor(measure, r.score) }}>{r.score}</span>
                          <span style={{ fontSize: '0.65rem', padding: '2px 7px', borderRadius: 8, background: '#E8E4DC', color: '#4A4744' }}>{getBandLabel(measure, r.score)}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── SESSIONS TAB ── */}
      {tab === 'sessions' && (
        <div style={{ background: '#fff', border: '0.5px solid #E2DDD5', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          {!sessions.length ? (
            <div style={{ padding: '3rem', textAlign: 'center' }}><p style={{ color: '#8B8680' }}>No sessions recorded for this client.</p></div>
          ) : sessions.map((s, i) => (
            <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: i < sessions.length - 1 ? '0.5px solid #F0EDE6' : 'none' }}>
              <div><p style={{ fontWeight: 600, color: '#1A1816' }}>{new Date(s.session_date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}</p>{s.duration_minutes && <p style={{ fontSize: '0.78rem', color: '#8B8680' }}>{s.duration_minutes} min</p>}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {s.note_format && <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: '#D8EDDF', color: '#1B4332' }}>{s.note_format}</span>}
                <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: s.status === 'complete' ? '#ECFDF5' : '#FEF3C7', color: s.status === 'complete' ? '#065F46' : '#92400E' }}>{s.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── SAFETY PLANS TAB ── */}
      {tab === 'safety' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {!safetyPlans.length ? (
            <div style={{ background: '#fff', border: '0.5px solid #E2DDD5', borderRadius: 16, padding: '3rem', textAlign: 'center' }}><p style={{ color: '#8B8680' }}>No safety plans on record. Safety plans are created during C-SSRS assessments at moderate risk and above.</p></div>
          ) : safetyPlans.map(sp => (
            <div key={sp.id} style={{ background: '#fff', border: '0.5px solid #E2DDD5', borderRadius: 16, padding: '18px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
                <p style={{ fontWeight: 700, color: '#1A1816' }}>Safety Plan v{sp.version}</p>
                <p style={{ fontSize: '0.78rem', color: '#8B8680' }}>{new Date(sp.created_at).toLocaleDateString('en-GB')}</p>
              </div>
              {sp.warning_signs?.length > 0 && <div style={{ marginBottom: 10 }}><p style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', color: '#8B8680', marginBottom: 5 }}>Warning signs</p>{sp.warning_signs.map((w, i) => <p key={i} style={{ fontSize: '0.875rem', color: '#1A1816', lineHeight: 1.55 }}>{w}</p>)}</div>}
              {sp.internal_coping_strategies?.length > 0 && <div style={{ marginBottom: 10 }}><p style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', color: '#8B8680', marginBottom: 5 }}>Coping strategies</p>{sp.internal_coping_strategies.map((w, i) => <p key={i} style={{ fontSize: '0.875rem', color: '#1A1816' }}>{w}</p>)}</div>}
              {sp.crisis_contacts?.length > 0 && <div><p style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', color: '#8B8680', marginBottom: 5 }}>Crisis contacts</p>{sp.crisis_contacts.map((c: any, i: number) => <p key={i} style={{ fontSize: '0.875rem', color: '#1A1816' }}>{c.note || JSON.stringify(c)}</p>)}</div>}
            </div>
          ))}
        </div>
      )}

      {/* ── FLAGS TAB ── */}
      {tab === 'flags' && (
        <FlagsPanel flags={triageFlags} patientId={patient.id} />
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════
// Triage flags sub-panel
// ══════════════════════════════════════════════════════════════════════

const FLAG_SEV_CFG: Record<string, { bg: string; border: string; text: string; dot: string; label: string }> = {
  red:   { bg: '#FEF2F2', border: '#FECACA', text: '#B91C1C', dot: '#DC2626', label: 'Urgent' },
  amber: { bg: '#FFFBEB', border: '#FDE68A', text: '#92400E', dot: '#F59E0B', label: 'Review' },
  green: { bg: '#F0FDF4', border: '#BBF7D0', text: '#166534', dot: '#22C55E', label: 'Stable' },
}

function FlagsPanel({ flags }: { flags: TriageFlag[]; patientId: string }) {
  const open     = flags.filter(f => f.status !== 'resolved')
  const resolved = flags.filter(f => f.status === 'resolved')

  if (flags.length === 0) {
    return (
      <div style={{ background: '#fff', border: '0.5px solid #E2DDD5', borderRadius: 16, padding: '3rem', textAlign: 'center' }}>
        <p style={{ color: '#8B8680' }}>No triage flags recorded for this client.</p>
        <p style={{ color: '#8B8680', fontSize: '0.8rem', marginTop: 6 }}>
          Flags appear here when the client&apos;s self-assessments, chat messages, or safety events cross clinical thresholds.
        </p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {open.length > 0 && (
        <section>
          <p style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', color: '#8B8680', letterSpacing: '0.06em', marginBottom: 8 }}>
            Open · {open.length}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {open.map(f => <FlagRow key={f.id} flag={f} />)}
          </div>
        </section>
      )}
      {resolved.length > 0 && (
        <section>
          <p style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', color: '#8B8680', letterSpacing: '0.06em', marginBottom: 8 }}>
            Resolved · {resolved.length}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {resolved.map(f => <FlagRow key={f.id} flag={f} />)}
          </div>
        </section>
      )}
    </div>
  )
}

function FlagRow({ flag }: { flag: TriageFlag }) {
  const c = FLAG_SEV_CFG[flag.severity] ?? FLAG_SEV_CFG.amber!
  const isResolved = flag.status === 'resolved'
  return (
    <div style={{
      background: '#fff',
      border: `0.5px solid ${isResolved ? '#E2DDD5' : c.border}`,
      borderLeft: isResolved ? '0.5px solid #E2DDD5' : `3px solid ${c.dot}`,
      borderRadius: 10, padding: '12px 16px', opacity: isResolved ? 0.65 : 1,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '2px 8px', borderRadius: 20,
          background: c.bg, color: c.text, border: `0.5px solid ${c.border}`,
          fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase',
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.dot }} />
          {c.label}
        </span>
        <span style={{ fontSize: '0.75rem', color: '#8B8680' }}>
          {new Date(flag.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
          {' · '}{flag.trigger_source.replace('_', ' ')}
        </span>
        {flag.status === 'acknowledged' && (
          <span style={{ fontSize: '0.65rem', fontWeight: 600, color: '#6F6A64', padding: '2px 7px', borderRadius: 10, background: '#F3F1EC', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Acknowledged
          </span>
        )}
      </div>
      <p style={{ marginTop: 5, fontSize: '0.875rem', color: '#3A3633', lineHeight: 1.5 }}>{flag.summary}</p>
      {flag.resolution_note && (
        <p style={{ marginTop: 6, padding: '6px 10px', background: '#F0FDF4', border: '0.5px solid #BBF7D0', borderRadius: 6, fontSize: '0.78rem', color: '#166534', fontStyle: 'italic' }}>
          {flag.resolution_note}
        </p>
      )}
    </div>
  )
}
