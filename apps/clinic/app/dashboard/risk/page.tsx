'use client'
import { useState, useEffect } from 'react'
import { createSupabaseClient } from '@oraii/core/auth'
import { saveCssrsAssessment } from '../../../app/actions'

const CSSRS = [
  { id: 'wish_to_be_dead',              section: 'Ideation',  sev: 1, q: 'Wish to be dead',                                              desc: 'Thoughts about a wish to be dead or not alive any more, or wish to fall asleep and not wake up.' },
  { id: 'passive_suicidal_ideation',    section: 'Ideation',  sev: 2, q: 'Non-specific active suicidal thoughts',                        desc: "General non-specific thoughts of wanting to end one's life/suicide, without thoughts of ways to kill oneself." },
  { id: 'ideation_with_method',         section: 'Ideation',  sev: 3, q: 'Active ideation with any methods (not plan)',                  desc: 'Thoughts of suicide and has thought of at least one method. Different from a specific plan.' },
  { id: 'ideation_with_intent_no_plan', section: 'Ideation',  sev: 4, q: 'Active ideation with some intent, without specific plan',      desc: 'Active suicidal thoughts and reports having some intent to act on such thoughts.' },
  { id: 'ideation_with_intent_and_plan',section: 'Ideation',  sev: 5, q: 'Active ideation with specific plan and intent',                desc: 'Thoughts of killing oneself and has worked out or is working out the details of the plan.' },
  { id: 'preparatory_behaviour',        section: 'Behaviour', sev: 6, q: 'Preparatory acts or behaviours',                               desc: 'Acts or preparation towards imminently making a suicide attempt (e.g. collecting pills, researching methods).' },
  { id: 'interrupted_attempt',          section: 'Behaviour', sev: 7, q: 'Interrupted attempt',                                          desc: 'Person was interrupted by an outside circumstance from starting the potentially self-injurious act.' },
]

const RISK = [
  { max: 0, label: 'No risk identified', dbLevel: 'low',      color: '#065F46', bg: '#ECFDF5', border: '#6EE7B7', action: 'Continue standard monitoring. Review at next session.' },
  { max: 2, label: 'Low risk',           dbLevel: 'low',      color: '#1E40AF', bg: '#EFF6FF', border: '#BFDBFE', action: 'Document discussion. Explore protective factors. Review PHQ-9. Safety plan awareness.' },
  { max: 4, label: 'Moderate risk',      dbLevel: 'moderate', color: '#92400E', bg: '#FFFBEB', border: '#FDE68A', action: 'Formal safety plan. Increase session frequency. Notify supervisor. Consider GP referral. Safeguarding check.' },
  { max: 7, label: 'HIGH RISK',          dbLevel: 'high',     color: '#991B1B', bg: '#FEF2F2', border: '#FECACA', action: 'IMMEDIATE ACTION: Crisis intervention. Contact NHS 111 option 2 or 999. Do not leave client alone. MHA 1983 s136 considerations. Notify clinical supervisor immediately.' },
]

function getRisk(maxSev: number) {
  if (maxSev === 0) return RISK[0]
  if (maxSev <= 2)  return RISK[1]
  if (maxSev <= 4)  return RISK[2]
  return RISK[3]
}

interface SafetyPlan { warningSigns: string; copingStrategies: string; socialDistraction: string; crisisContacts: string; meansRestriction: string }
interface Patient { id: string; display_label: string }
interface Session { id: string; session_date: string; note_format: string | null }

function Ico({ d, size = 16, color = 'currentColor' }: { d: string; size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d={d} />
    </svg>
  )
}

export default function RiskPage() {
  const [patients, setPatients]           = useState<Patient[]>([])
  const [sessions, setSessions]           = useState<Session[]>([])
  const [patientId, setPatientId]         = useState('')
  const [sessionId, setSessionId]         = useState('')
  const [responses, setResponses]         = useState<Record<string, boolean>>({})
  const [expanded, setExpanded]           = useState<string | null>(null)
  const [submitted, setSubmitted]         = useState(false)
  const [saving, setSaving]               = useState(false)
  const [saveError, setSaveError]         = useState<string | null>(null)
  const [savedId, setSavedId]             = useState<string | null>(null)
  const [clinicianNotes, setClinicianNotes]               = useState('')
  const [supervisorNotified, setSupervisorNotified]       = useState(false)
  const [supervisorNotifiedAt, setSupervisorNotifiedAt]   = useState<string | null>(null)
  const [safetyPlan, setSafetyPlan]       = useState<SafetyPlan>({ warningSigns: '', copingStrategies: '', socialDistraction: '', crisisContacts: '', meansRestriction: '' })

  // Load consented patients for this therapist only
  const [therapistIdRef, setTherapistIdRef] = useState<string | null>(null)
  useEffect(() => {
    const load = async () => {
      const supabase = createSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.id) return
      const { data: therapist } = await supabase.from('therapists').select('id').eq('auth_user_id', user.id).single()
      if (!therapist?.id) return
      setTherapistIdRef(therapist.id)
      const { data } = await supabase
        .from('patients')
        .select('id, display_label')
        .eq('therapist_id', therapist.id)
        .eq('consent_given', true)
        .order('display_label')
      setPatients(data || [])
    }
    load()
  }, [])

  // Load sessions when patient is selected
  useEffect(() => {
    if (!patientId || !therapistIdRef) { setSessions([]); setSessionId(''); return }
    const loadSessions = async () => {
      const supabase = createSupabaseClient()
      const { data } = await supabase
        .from('sessions')
        .select('id, session_date, note_format')
        .eq('patient_id', patientId)
        .eq('therapist_id', therapistIdRef)
        .order('session_date', { ascending: false })
        .limit(20)
      setSessions(data || [])
      setSessionId('')
    }
    loadSessions()
  }, [patientId, therapistIdRef])

  const endorsed        = CSSRS.filter(i => responses[i.id] === true)
  const maxSev          = endorsed.length > 0 ? Math.max(...endorsed.map(i => i.sev)) : 0
  const risk            = getRisk(maxSev)
  const totalAnswered   = Object.keys(responses).length
  const needsSafetyPlan = maxSev >= 3
  const needsSupervisor = maxSev >= 5
  const sections        = ['Ideation', 'Behaviour'] as const

  const handleSupervisorToggle = () => {
    if (!supervisorNotified) { setSupervisorNotified(true); setSupervisorNotifiedAt(new Date().toISOString()) }
    else { setSupervisorNotified(false); setSupervisorNotifiedAt(null) }
  }

  // GAP 1 + 2 + 3 FIX: uses server action — writes therapist_id, session_id, and audit log
  const handleSave = async () => {
    if (!patientId) { setSaveError('Please select a client before saving.'); return }
    setSaving(true); setSaveError(null)

    const res = await saveCssrsAssessment({
      patientId,
      sessionId:           sessionId || undefined,
      responses,
      riskLevel:           risk.dbLevel,
      clinicianNotes:      clinicianNotes || undefined,
      supervisorNotified,
      supervisorNotifiedAt,
      safetyPlan:          needsSafetyPlan ? safetyPlan : undefined,
    })

    if (res.error) {
      setSaveError(res.error)
    } else {
      setSavedId(res.id || 'saved')
    }
    setSaving(false)
  }

  const reset = () => {
    setResponses({}); setSubmitted(false); setExpanded(null); setPatientId(''); setSessionId('')
    setClinicianNotes(''); setSupervisorNotified(false); setSupervisorNotifiedAt(null)
    setSafetyPlan({ warningSigns: '', copingStrategies: '', socialDistraction: '', crisisContacts: '', meansRestriction: '' })
    setSavedId(null); setSaveError(null)
  }

  return (
    <div style={{ padding: '2rem 2.5rem 3rem', maxWidth: 800 }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontFamily: 'Lora, Georgia, serif', fontSize: '1.5rem', fontWeight: 700, color: '#1A1816', letterSpacing: '-0.02em', marginBottom: 5 }}>Risk Screening</h1>
        <p style={{ color: '#8B8680', fontSize: '0.9rem' }}>Columbia Suicide Severity Rating Scale (C-SSRS) · NICE CG133 · UK adapted</p>
      </div>

      <div style={{ background: '#EFF6FF', border: '0.5px solid #BFDBFE', borderRadius: 14, padding: '14px 18px', marginBottom: '1.5rem', display: 'flex', alignItems: 'flex-start', gap: 12, fontSize: '0.875rem', color: '#1E3A8A', lineHeight: 1.55 }}>
        <Ico d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" size={18} color="#2563EB" />
        <p><strong>Clinical use only:</strong> Complete with your clinical judgement. This tool supports — it does not replace — your professional assessment. Results saved to client record under UK-GDPR Article 9.</p>
      </div>

      {/* Client selector */}
      <div style={{ background: '#fff', border: '0.5px solid #E2DDD5', borderRadius: 16, padding: '18px 20px', marginBottom: '1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
        <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#8B8680', marginBottom: 10 }}>
          Client — required before saving
        </label>
        {patients.length === 0 ? (
          <p style={{ fontSize: '0.875rem', color: '#8B8680' }}>No clients with consent found. Add a client and mark consent collected first.</p>
        ) : (
          <select value={patientId} onChange={e => setPatientId(e.target.value)} disabled={!!savedId}
            style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: `1.5px solid ${patientId ? '#2D6A4F' : '#E2DDD5'}`, fontSize: '0.9rem', fontFamily: 'Inter, system-ui, sans-serif', color: patientId ? '#1A1816' : '#8B8680', background: '#F7F5F0', outline: 'none' }}>
            <option value="">Select client...</option>
            {patients.map(p => <option key={p.id} value={p.id}>{p.display_label}</option>)}
          </select>
        )}
        {patientId && <p style={{ marginTop: 8, fontSize: '0.78rem', color: '#2D6A4F' }}>Assessment will be saved to this client's record with therapist attribution.</p>}

        {/* Session selector */}
        {patientId && (
          <div style={{ marginTop: 14 }}>
            <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#8B8680', marginBottom: 8 }}>
              Link to session (optional)
            </label>
            {sessions.length === 0 ? (
              <p style={{ fontSize: '0.82rem', color: '#B8B3AE' }}>No sessions recorded for this client yet.</p>
            ) : (
              <select value={sessionId} onChange={e => setSessionId(e.target.value)} disabled={!!savedId}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: `1.5px solid ${sessionId ? '#2D6A4F' : '#E2DDD5'}`, fontSize: '0.9rem', fontFamily: 'Inter, system-ui, sans-serif', color: sessionId ? '#1A1816' : '#8B8680', background: '#F7F5F0', outline: 'none' }}>
                <option value="">Standalone assessment (no session)</option>
                {sessions.map(s => (
                  <option key={s.id} value={s.id}>
                    {new Date(s.session_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}{s.note_format ? ` · ${s.note_format}` : ''}
                  </option>
                ))}
              </select>
            )}
            {sessionId && <p style={{ marginTop: 6, fontSize: '0.75rem', color: '#2D6A4F' }}>Assessment will be linked to this session via session_id FK.</p>}
          </div>
        )}
      </div>

      {!submitted ? (
        <div>
          {/* Progress */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: '0.775rem', fontWeight: 600, color: '#4A4744' }}>Progress</span>
              <span style={{ fontSize: '0.775rem', color: '#8B8680' }}>{totalAnswered} / {CSSRS.length} answered</span>
            </div>
            <div style={{ height: 6, background: '#F0EDE6', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 3, background: '#2D6A4F', width: `${(totalAnswered / CSSRS.length) * 100}%`, transition: 'width 0.3s ease' }} />
            </div>
          </div>

          {sections.map(section => (
            <div key={section} style={{ marginBottom: '1.5rem' }}>
              <p style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#8B8680', marginBottom: 10 }}>{section}</p>
              <div style={{ background: '#fff', border: '0.5px solid #E2DDD5', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                {CSSRS.filter(i => i.section === section).map((item, idx, arr) => (
                  <div key={item.id} style={{ borderBottom: idx < arr.length - 1 ? '0.5px solid #F0EDE6' : 'none', padding: '16px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: '#F0EDE6', color: '#8B8680' }}>#{item.sev}</span>
                          <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#1A1816' }}>{item.q}</p>
                        </div>
                        <button onClick={() => setExpanded(expanded === item.id ? null : item.id)}
                          style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#8B8680', fontSize: '0.775rem', fontFamily: 'Inter, system-ui, sans-serif' }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                            style={{ transform: expanded === item.id ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><path d="M19 9l-7 7-7-7"/></svg>
                          {expanded === item.id ? 'Hide detail' : 'Show detail'}
                        </button>
                        {expanded === item.id && (
                          <p style={{ fontSize: '0.85rem', color: '#4A4744', lineHeight: 1.6, marginTop: 10, background: '#F7F5F0', borderRadius: 10, padding: '10px 14px' }}>{item.desc}</p>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 7, flexShrink: 0, marginTop: 2 }}>
                        {(['Yes', 'No'] as const).map(opt => {
                          const isSelected = responses[item.id] === (opt === 'Yes')
                          const isYes = opt === 'Yes'
                          return (
                            <button key={opt} onClick={() => setResponses(prev => ({ ...prev, [item.id]: opt === 'Yes' }))}
                              style={{ padding: '7px 16px', borderRadius: 9, fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'all 0.15s', border: `1.5px solid ${isSelected ? (isYes ? '#FECACA' : '#6EE7B7') : '#E2DDD5'}`, background: isSelected ? (isYes ? '#FEF2F2' : '#ECFDF5') : 'transparent', color: isSelected ? (isYes ? '#991B1B' : '#065F46') : '#8B8680' }}>
                              {opt}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <button onClick={() => setSubmitted(true)} disabled={totalAnswered < CSSRS.length}
            style={{ width: '100%', padding: '15px', background: totalAnswered < CSSRS.length ? '#F0EDE6' : '#2D6A4F', color: totalAnswered < CSSRS.length ? '#8B8680' : '#fff', border: 'none', borderRadius: 14, fontWeight: 700, fontSize: '1rem', cursor: totalAnswered < CSSRS.length ? 'not-allowed' : 'pointer', fontFamily: 'Inter, sans-serif', transition: 'all 0.15s' }}>
            Generate Risk Assessment ({totalAnswered}/{CSSRS.length} answered)
          </button>
        </div>

      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Result card */}
          <div style={{ background: risk.bg, border: `1.5px solid ${risk.border}`, borderRadius: 18, padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: `${risk.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={risk.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={maxSev <= 2 ? 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' : 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'} />
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: risk.color }}>C-SSRS Result</p>
                <p style={{ fontSize: '1.375rem', fontWeight: 800, color: risk.color, lineHeight: 1.2, marginTop: 3 }}>{risk.label}</p>
                {patientId && <p style={{ fontSize: '0.78rem', color: risk.color, opacity: 0.8, marginTop: 4 }}>Client: {patients.find(p => p.id === patientId)?.display_label}</p>}
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <p style={{ fontSize: '0.68rem', color: risk.color, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Max severity</p>
                <p style={{ fontFamily: 'Lora, serif', fontSize: '2rem', fontWeight: 700, color: risk.color, lineHeight: 1 }}>{maxSev > 0 ? `#${maxSev}` : '—'}</p>
              </div>
            </div>
            <div style={{ borderTop: `1px solid ${risk.border}`, paddingTop: 14 }}>
              <p style={{ fontSize: '0.8rem', fontWeight: 700, color: risk.color, marginBottom: 6 }}>Recommended clinical action:</p>
              <p style={{ fontSize: '0.9rem', color: risk.color, lineHeight: 1.6 }}>{risk.action}</p>
            </div>
          </div>

          {/* Endorsed items */}
          {endorsed.length > 0 && (
            <div style={{ background: '#fff', border: '0.5px solid #E2DDD5', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              <div style={{ padding: '11px 18px', background: '#F7F5F0', borderBottom: '0.5px solid #E2DDD5', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: '#8B8680' }}>Endorsed items</div>
              <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {endorsed.map(item => (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: '#FEF2F2', color: '#991B1B' }}>#{item.sev}</span>
                    <span style={{ fontSize: '0.9rem', color: '#1A1816', fontWeight: 500 }}>{item.q}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Supervisor notification */}
          {needsSupervisor && (
            <div style={{ background: '#FFF7ED', border: `1.5px solid ${supervisorNotified ? '#FDE68A' : '#FED7AA'}`, borderRadius: 16, padding: '18px 20px' }}>
              <p style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: '#92400E', marginBottom: 12 }}>Supervisor notification — required at this risk level</p>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: savedId ? 'default' : 'pointer' }}>
                <input type="checkbox" checked={supervisorNotified} onChange={handleSupervisorToggle} disabled={!!savedId}
                  style={{ width: 18, height: 18, marginTop: 2, accentColor: '#D97706' }} />
                <div>
                  <p style={{ fontSize: '0.9rem', fontWeight: 600, color: '#78350F' }}>I have notified my clinical supervisor of this assessment</p>
                  {supervisorNotifiedAt && <p style={{ fontSize: '0.78rem', color: '#92400E', marginTop: 4 }}>Recorded at {new Date(supervisorNotifiedAt).toLocaleString('en-GB')}</p>}
                  {!supervisorNotified && <p style={{ fontSize: '0.78rem', color: '#B45309', marginTop: 4 }}>BACP/UKCP ethical framework requires supervisor notification at high risk.</p>}
                </div>
              </label>
            </div>
          )}

          {/* Safety plan */}
          {needsSafetyPlan && !savedId && (
            <div style={{ background: '#fff', border: '0.5px solid #E2DDD5', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              <div style={{ padding: '14px 20px', background: '#F7F5F0', borderBottom: '0.5px solid #E2DDD5' }}>
                <p style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: '#8B8680' }}>Safety Plan — Stanley-Brown SPI · NICE CG133</p>
                <p style={{ fontSize: '0.8rem', color: '#4A4744', marginTop: 4 }}>Required at moderate risk and above. Complete with the client now.</p>
              </div>
              <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  { key: 'warningSigns',      label: '1. Warning signs',              ph: 'Thoughts, feelings, or behaviours that precede a crisis...' },
                  { key: 'copingStrategies',  label: '2. Internal coping strategies', ph: 'Things I can do on my own to take my mind off the problem...' },
                  { key: 'socialDistraction', label: '3. Social contacts / settings', ph: 'People and settings that provide distraction...' },
                  { key: 'crisisContacts',    label: '4. Crisis contacts',            ph: 'People I can ask for help + Samaritans 116 123, NHS 111 option 2...' },
                  { key: 'meansRestriction',  label: '5. Means restriction',          ph: 'Steps to limit access to lethal means...' },
                ].map(field => (
                  <div key={field.key}>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#4A4744', marginBottom: 6 }}>{field.label}</label>
                    <textarea value={safetyPlan[field.key as keyof SafetyPlan]} onChange={e => setSafetyPlan(prev => ({ ...prev, [field.key]: e.target.value }))}
                      placeholder={field.ph} rows={2}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #E2DDD5', fontSize: '0.875rem', fontFamily: 'Inter, system-ui, sans-serif', color: '#1A1816', background: '#F7F5F0', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Clinician notes */}
          {!savedId && (
            <div style={{ background: '#fff', border: '0.5px solid #E2DDD5', borderRadius: 16, padding: '18px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#8B8680', marginBottom: 10 }}>Clinician notes (optional)</label>
              <textarea value={clinicianNotes} onChange={e => setClinicianNotes(e.target.value)}
                placeholder="Additional clinical observations, context, or rationale..." rows={3}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #E2DDD5', fontSize: '0.875rem', fontFamily: 'Inter, system-ui, sans-serif', color: '#1A1816', background: '#F7F5F0', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
            </div>
          )}

          {/* Save success */}
          {savedId && (
            <div style={{ background: '#ECFDF5', border: '1.5px solid #6EE7B7', borderRadius: 14, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <Ico d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" size={20} color="#065F46" />
              <div>
                <p style={{ fontWeight: 700, color: '#065F46', fontSize: '0.9rem' }}>Assessment saved to client record</p>
                <p style={{ fontSize: '0.78rem', color: '#047857', marginTop: 3 }}>
                  Saved with therapist attribution · {new Date().toLocaleString('en-GB')}
                  {needsSafetyPlan ? ' · Safety plan saved' : ''}
                </p>
              </div>
            </div>
          )}

          {/* Save error */}
          {saveError && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 14, padding: '14px 18px', color: '#991B1B', fontSize: '0.875rem' }}>
              <strong>Error: </strong>{saveError}
            </div>
          )}

          {/* UK crisis resources */}
          <div style={{ background: '#FEF2F2', border: '0.5px solid #FECACA', borderRadius: 16, padding: '16px 20px' }}>
            <p style={{ fontSize: '0.68rem', fontWeight: 700, color: '#991B1B', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>UK Crisis Resources</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {[['Samaritans','116 123','Free · 24/7'],['NHS Mental Health Crisis','111 option 2','24/7'],['Crisis Text Line','Text SHOUT to 85258','Free · 24/7'],['Emergency Services','999','']].map(([name, contact, note]) => (
                <div key={name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.5)' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#B91C1C' }}>{name}</span>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#991B1B' }}>{contact}</span>
                    {note && <span style={{ fontSize: '0.72rem', color: '#F87171', display: 'block' }}>{note}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10 }}>
            {!savedId && (
              <button onClick={handleSave} disabled={saving || !patientId}
                style={{ flex: 1, padding: '14px', background: patientId ? '#2D6A4F' : '#F0EDE6', color: patientId ? '#fff' : '#8B8680', border: 'none', borderRadius: 14, fontWeight: 700, fontSize: '0.95rem', cursor: patientId && !saving ? 'pointer' : 'not-allowed', fontFamily: 'Inter, sans-serif' }}>
                {saving ? 'Saving...' : patientId ? 'Save to client record' : 'Select a client to save'}
              </button>
            )}
            <button onClick={reset}
              style={{ padding: '13px 20px', background: '#F7F5F0', color: '#4A4744', border: '0.5px solid #E2DDD5', borderRadius: 14, fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap' }}>
              {savedId ? 'Start new assessment' : 'Reset'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
