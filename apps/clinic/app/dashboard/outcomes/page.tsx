'use client'
import { useState, useEffect } from 'react'
import { createSupabaseClient } from '@oraii/core/auth'
import { saveOutcomeScore } from '../../../app/actions'

const PHQ9 = {
  id: 'PHQ9', dbName: 'PHQ-9', fullName: 'Patient Health Questionnaire-9', maxScore: 27,
  desc: 'NICE-recommended depression screening. Score ≥10 indicates moderate-severe depression.',
  questions: [
    'Little interest or pleasure in doing things',
    'Feeling down, depressed, or hopeless',
    'Trouble falling or staying asleep, or sleeping too much',
    'Feeling tired or having little energy',
    'Poor appetite or overeating',
    'Feeling bad about yourself — or that you are a failure',
    'Trouble concentrating on things',
    'Moving or speaking so slowly that other people could have noticed (or being fidgety or restless)',
    'Thoughts that you would be better off dead, or thoughts of hurting yourself',
  ],
  options: ['Not at all', 'Several days', 'More than half the days', 'Nearly every day'],
  bands: [
    { max: 4,  label: 'Minimal',           color: '#065F46', bg: '#ECFDF5', border: '#6EE7B7' },
    { max: 9,  label: 'Mild',              color: '#1E40AF', bg: '#EFF6FF', border: '#BFDBFE' },
    { max: 14, label: 'Moderate',          color: '#92400E', bg: '#FFFBEB', border: '#FDE68A' },
    { max: 19, label: 'Moderately severe', color: '#C2410C', bg: '#FFF7ED', border: '#FDBA74' },
    { max: 27, label: 'Severe',            color: '#991B1B', bg: '#FEF2F2', border: '#FECACA' },
  ],
}
const GAD7 = {
  id: 'GAD7', dbName: 'GAD-7', fullName: 'Generalised Anxiety Disorder-7', maxScore: 21,
  desc: 'Validated anxiety screening tool. Score ≥8 indicates significant anxiety.',
  questions: [
    'Feeling nervous, anxious, or on edge',
    'Not being able to stop or control worrying',
    'Worrying too much about different things',
    'Trouble relaxing',
    'Being so restless that it is hard to sit still',
    'Becoming easily annoyed or irritable',
    'Feeling afraid as if something awful might happen',
  ],
  options: ['Not at all', 'Several days', 'More than half the days', 'Nearly every day'],
  bands: [
    { max: 4,  label: 'Minimal anxiety',  color: '#065F46', bg: '#ECFDF5', border: '#6EE7B7' },
    { max: 9,  label: 'Mild anxiety',     color: '#1E40AF', bg: '#EFF6FF', border: '#BFDBFE' },
    { max: 14, label: 'Moderate anxiety', color: '#92400E', bg: '#FFFBEB', border: '#FDE68A' },
    { max: 21, label: 'Severe anxiety',   color: '#991B1B', bg: '#FEF2F2', border: '#FECACA' },
  ],
}
const INSTRUMENTS = [PHQ9, GAD7]
function getBand(score: number, bands: typeof PHQ9['bands']) { return bands.find(b => score <= b.max) || bands[bands.length - 1] }

interface Patient { id: string; display_label: string }

export default function OutcomesPage() {
  const [selected, setSelected]   = useState('PHQ9')
  const [responses, setResponses] = useState<number[]>([])
  const [submitted, setSubmitted] = useState(false)
  const [patients, setPatients]   = useState<Patient[]>([])
  const [patientId, setPatientId] = useState('')
  const [saving, setSaving]       = useState(false)
  const [savedId, setSavedId]     = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  // ── Load patients for THIS therapist only ──────────────────────────────
  useEffect(() => {
    const load = async () => {
      const supabase = createSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.id) return

      const { data: therapist } = await supabase
        .from('therapists').select('id').eq('auth_user_id', user.id).single()
      if (!therapist?.id) return

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

  const inst          = INSTRUMENTS.find(i => i.id === selected)!
  const score         = responses.reduce((a, b) => (b !== undefined ? a + b : a), 0)
  const allAnswered   = responses.length === inst.questions.length && responses.every(r => r !== undefined)
  const band          = submitted ? getBand(score, inst.bands) : null
  const answeredCount = responses.filter(r => r !== undefined).length

  const switchInst = (id: string) => { setSelected(id); setResponses([]); setSubmitted(false); setSavedId(null); setSaveError(null) }
  const reset      = () => { setResponses([]); setSubmitted(false); setSavedId(null); setSaveError(null) }
  const setResponse = (qi: number, val: number) => { const u = [...responses]; u[qi] = val; setResponses(u) }

  const handleSave = async () => {
    if (!patientId) { setSaveError('Select a client before saving.'); return }
    setSaving(true); setSaveError(null)
    try {
      const res = await saveOutcomeScore({
        patientId,
        instrument: inst.dbName,
        score,
        responses: responses.reduce((acc, v, i) => ({ ...acc, [`q${i+1}`]: v }), {}),
      })
      if (res.error) throw new Error(res.error)
      setSavedId('saved-' + Date.now())
    } catch (e: any) { setSaveError(e?.message || 'Save failed.') }
    finally { setSaving(false) }
  }

  return (
    <div style={{ padding: '2rem 2.5rem 3rem', maxWidth: 820 }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontFamily: 'Lora, Georgia, serif', fontSize: '1.5rem', fontWeight: 700, color: '#1A1816', letterSpacing: '-0.02em', marginBottom: 5 }}>Outcome Scores</h1>
        <p style={{ color: '#8B8680', fontSize: '0.9rem' }}>PHQ-9 · GAD-7 · NICE-recommended validated measures · Saved to client record</p>
      </div>

      {/* Instrument tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: '1.5rem', background: '#F7F5F0', border: '0.5px solid #E2DDD5', borderRadius: 14, padding: 4 }}>
        {INSTRUMENTS.map(i => (
          <button key={i.id} onClick={() => switchInst(i.id)}
            style={{ flex: 1, padding: '10px 0', borderRadius: 11, fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif', border: 'none', transition: 'all 0.2s', background: selected === i.id ? '#fff' : 'transparent', color: selected === i.id ? '#2D6A4F' : '#8B8680', boxShadow: selected === i.id ? '0 1px 4px rgba(0,0,0,0.08)' : 'none' }}>
            {i.dbName}
            <span style={{ display: 'block', fontSize: '0.68rem', fontWeight: 500, marginTop: 1, color: selected === i.id ? '#40916C' : '#B8B3AE' }}>{i.fullName}</span>
          </button>
        ))}
      </div>

      {/* Client selector */}
      <div style={{ background: '#fff', border: '0.5px solid #E2DDD5', borderRadius: 14, padding: '16px 18px', marginBottom: '1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#8B8680', marginBottom: 9 }}>Client — required to save</label>
        {patients.length === 0 ? (
          <p style={{ fontSize: '0.875rem', color: '#8B8680' }}>No clients with consent found. Add a client first.</p>
        ) : (
          <select value={patientId} onChange={e => setPatientId(e.target.value)} disabled={!!savedId}
            style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: `1.5px solid ${patientId ? '#2D6A4F' : '#E2DDD5'}`, fontSize: '0.9rem', fontFamily: 'Inter, system-ui, sans-serif', color: patientId ? '#1A1816' : '#8B8680', background: '#F7F5F0', outline: 'none' }}>
            <option value="">Select client...</option>
            {patients.map(p => <option key={p.id} value={p.id}>{p.display_label}</option>)}
          </select>
        )}
      </div>

      <div style={{ background: '#F0EDE6', border: '0.5px solid #E2DDD5', borderRadius: 12, padding: '12px 16px', marginBottom: '1.5rem', fontSize: '0.875rem', color: '#4A4744', lineHeight: 1.55 }}>{inst.desc}</div>

      {!submitted ? (
        <div>
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
              <span style={{ fontSize: '0.775rem', fontWeight: 600, color: '#4A4744' }}>Questions</span>
              <span style={{ fontSize: '0.775rem', color: '#8B8680' }}>{answeredCount}/{inst.questions.length}</span>
            </div>
            <div style={{ height: 5, background: '#F0EDE6', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 3, background: '#2D6A4F', width: `${(answeredCount / inst.questions.length) * 100}%`, transition: 'width 0.3s ease' }} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: '1.5rem' }}>
            {inst.questions.map((q, qi) => {
              const isSafety   = inst.id === 'PHQ9' && qi === 8
              const isAnswered = responses[qi] !== undefined
              return (
                <div key={qi} style={{ background: isSafety && (responses[qi] ?? 0) > 0 ? '#FFF5F5' : '#fff', border: `0.5px solid ${isSafety && (responses[qi] ?? 0) > 0 ? '#FECACA' : isAnswered ? '#D8EDDF' : '#E2DDD5'}`, borderRadius: 14, padding: '16px 20px', transition: 'all 0.15s' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 12 }}>
                    <div>
                      <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#B8B3AE', marginRight: 8 }}>Q{qi + 1}</span>
                      <span style={{ fontSize: '0.9375rem', color: isSafety ? '#991B1B' : '#1A1816', fontWeight: isSafety ? 600 : 400 }}>{q}</span>
                      {isSafety && <p style={{ fontSize: '0.75rem', color: '#DC2626', marginTop: 4 }}>Safety item — conduct C-SSRS if endorsed.</p>}
                    </div>
                    {isAnswered && (
                      <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#D8EDDF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="2.5"><path d="M5 13l4 4L19 7"/></svg>
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                    {inst.options.map((opt, oi) => {
                      const isSel = responses[qi] === oi
                      return (
                        <button key={oi} onClick={() => setResponse(qi, oi)}
                          style={{ padding: '9px 6px', borderRadius: 10, fontSize: '0.78rem', fontWeight: isSel ? 700 : 500, textAlign: 'center', lineHeight: 1.3, cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'all 0.15s', border: `1.5px solid ${isSel ? '#2D6A4F' : '#E2DDD5'}`, background: isSel ? '#2D6A4F' : '#F7F5F0', color: isSel ? '#fff' : '#4A4744' }}>
                          <span style={{ display: 'block', fontSize: '0.65rem', opacity: 0.7, marginBottom: 2 }}>{oi}</span>
                          {opt}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          <button onClick={() => setSubmitted(true)} disabled={!allAnswered}
            style={{ width: '100%', padding: '15px', background: !allAnswered ? '#F0EDE6' : '#2D6A4F', color: !allAnswered ? '#8B8680' : '#fff', border: 'none', borderRadius: 14, fontWeight: 700, fontSize: '1rem', cursor: !allAnswered ? 'not-allowed' : 'pointer', fontFamily: 'Inter, sans-serif' }}>
            Calculate Score ({answeredCount}/{inst.questions.length} answered)
          </button>
        </div>

      ) : band && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: band.bg, border: `1.5px solid ${band.border}`, borderRadius: 18, padding: '28px', textAlign: 'center' }}>
            <p style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: band.color, marginBottom: 8 }}>{inst.dbName} Score</p>
            <div style={{ fontFamily: 'Lora, Georgia, serif', fontSize: '4rem', fontWeight: 700, color: band.color, lineHeight: 1, marginBottom: 8 }}>{score}</div>
            <p style={{ fontSize: '1.125rem', fontWeight: 700, color: band.color }}>{band.label}</p>
            {patientId && <p style={{ fontSize: '0.78rem', color: band.color, opacity: 0.75, marginTop: 6 }}>Client: {patients.find(p => p.id === patientId)?.display_label}</p>}
            <div style={{ marginTop: 16, background: `${band.color}20`, borderRadius: 4, height: 8, overflow: 'hidden' }}>
              <div style={{ height: '100%', background: band.color, borderRadius: 4, width: `${(score / inst.maxScore) * 100}%`, transition: 'width 0.4s' }} />
            </div>
          </div>

          {inst.id === 'PHQ9' && (responses[8] ?? 0) > 0 && (
            <div style={{ background: '#FEF2F2', border: '1.5px solid #FECACA', borderRadius: 14, padding: '16px 20px' }}>
              <p style={{ fontWeight: 700, color: '#991B1B', marginBottom: 8 }}>Positive response on item 9 — Immediate safety screening required</p>
              <p style={{ fontSize: '0.875rem', color: '#B91C1C', lineHeight: 1.6 }}>Conduct full C-SSRS assessment. Document. Review safety plan. Contact Samaritans 116 123 or NHS 111 if acute risk.</p>
            </div>
          )}

          {savedId ? (
            <div style={{ background: '#ECFDF5', border: '1.5px solid #6EE7B7', borderRadius: 14, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#065F46" strokeWidth="1.75"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              <div>
                <p style={{ fontWeight: 700, color: '#065F46', fontSize: '0.9rem' }}>Score saved to client record</p>
                <p style={{ fontSize: '0.78rem', color: '#047857' }}>{new Date().toLocaleString('en-GB')}</p>
              </div>
            </div>
          ) : (
            <button onClick={handleSave} disabled={saving || !patientId}
              style={{ width: '100%', padding: '14px', background: patientId ? '#2D6A4F' : '#F0EDE6', color: patientId ? '#fff' : '#8B8680', border: 'none', borderRadius: 14, fontWeight: 700, fontSize: '0.95rem', cursor: patientId && !saving ? 'pointer' : 'not-allowed', fontFamily: 'Inter, sans-serif' }}>
              {saving ? 'Saving...' : patientId ? 'Save to client record' : 'Select a client to save'}
            </button>
          )}

          {saveError && <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, padding: '12px 16px', color: '#991B1B', fontSize: '0.875rem' }}><strong>Error: </strong>{saveError}</div>}

          <button onClick={reset} style={{ width: '100%', padding: '13px', background: '#F7F5F0', color: '#4A4744', border: '0.5px solid #E2DDD5', borderRadius: 14, fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
            Administer again
          </button>
        </div>
      )}
    </div>
  )
}
