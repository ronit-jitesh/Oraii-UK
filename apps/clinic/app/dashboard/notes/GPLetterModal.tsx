'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Props {
  note: { id: string; patientName: string; patientId: string; date: string; content: string; format: string }
  onClose: () => void
}

export default function GPLetterModal({ note, onClose }: Props) {
  const [gpName, setGpName]           = useState('')
  const [practice, setPractice]       = useState('')
  const [therapistName, setTherapistName] = useState('')
  const [regBody, setRegBody]         = useState('BACP')
  const [regNo, setRegNo]             = useState('')
  const [riskLevel, setRiskLevel]     = useState<string | null>(null)
  const [phq9, setPhq9]               = useState<number | null>(null)
  const [gad7, setGad7]               = useState<number | null>(null)
  const [copied, setCopied]           = useState(false)
  const [saving, setSaving]           = useState(false)
  const [savedId, setSavedId]         = useState<string | null>(null)

  // Load latest risk + outcome scores for this patient
  useEffect(() => {
    if (!note.patientId) return
    Promise.all([
      supabase.from('cssrs_assessments').select('clinician_risk_level').eq('patient_id', note.patientId).order('assessed_at', { ascending: false }).limit(1).single(),
      supabase.from('outcome_scores').select('instrument, score').eq('patient_id', note.patientId).in('instrument', ['PHQ-9','GAD-7']).order('administered_at', { ascending: false }).limit(4),
    ]).then(([riskRes, scoresRes]) => {
      if (riskRes.data) setRiskLevel(riskRes.data.clinician_risk_level)
      if (scoresRes.data) {
        const phqRow = scoresRes.data.find((s: any) => s.instrument === 'PHQ-9')
        const gadRow = scoresRes.data.find((s: any) => s.instrument === 'GAD-7')
        if (phqRow) setPhq9(phqRow.score)
        if (gadRow) setGad7(gadRow.score)
      }
    })
  }, [note.patientId])

  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  const sessionDate = new Date(note.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  const riskLine = riskLevel
    ? `A recent risk screening using the Columbia Suicide Severity Rating Scale (C-SSRS) on ${sessionDate} indicated a ${riskLevel} risk level. `
    : ''

  const outcomeLine = (phq9 !== null || gad7 !== null)
    ? `Validated outcome measures administered: ${[phq9 !== null ? `PHQ-9 score ${phq9}/27` : null, gad7 !== null ? `GAD-7 score ${gad7}/21` : null].filter(Boolean).join('; ')}. `
    : ''

  const letter = `${today}

Dear ${gpName || 'Dr [GP Name]'},

Re: ${note.patientName} — Therapy update

I am writing to update you regarding the above-named client, whom I have been seeing for individual therapy. I hold this client's consent to contact you.

${riskLine}${outcomeLine}I am writing to ensure continuity of care and to flag any relevant clinical considerations for your records.

If you have any concerns or wish to discuss this client's care, please do not hesitate to contact me.

Yours sincerely,

${therapistName || '[Your Name]'}
${regBody} Registered Therapist — Registration No: ${regNo || '[Reg No]'}
${practice || '[Practice Name]'}`

  const handleCopy = async () => {
    await navigator.clipboard.writeText(letter)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const { data } = await supabase.from('gp_letters').insert({
        patient_id:     note.patientId || null,
        gp_name:        gpName,
        practice_name:  practice,
        letter_content: letter,
      }).select('id').single()
      if (data) setSavedId(data.id)
    } catch { /* gp_letters may not exist yet — ignore */ }
    finally { setSaving(false) }
  }

  const inp: React.CSSProperties = { width: '100%', padding: '9px 12px', border: '0.5px solid #E2DDD5', borderRadius: 9, fontSize: '0.875rem', fontFamily: 'Inter, system-ui, sans-serif', color: '#1A1816', background: '#F7F5F0', outline: 'none', boxSizing: 'border-box' }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 680, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}>

        {/* Modal header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '0.5px solid #F0EDE6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontFamily: 'Lora, Georgia, serif', fontSize: '1.125rem', fontWeight: 700, color: '#1A1816' }}>GP Letter</h2>
            <p style={{ fontSize: '0.78rem', color: '#8B8680', marginTop: 3 }}>For {note.patientName} · {sessionDate}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: '#8B8680' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <div style={{ padding: '20px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, borderBottom: '0.5px solid #F0EDE6' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#8B8680', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>GP name</label>
            <input value={gpName} onChange={e => setGpName(e.target.value)} placeholder="Dr Sarah Smith" style={inp} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#8B8680', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>GP practice</label>
            <input value={practice} onChange={e => setPractice(e.target.value)} placeholder="Highgate Medical Centre" style={inp} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#8B8680', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>Your name</label>
            <input value={therapistName} onChange={e => setTherapistName(e.target.value)} placeholder="Jane Doe" style={inp} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#8B8680', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>Body</label>
              <select value={regBody} onChange={e => setRegBody(e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
                {['BACP','UKCP','BPS','HCPC','OTHER'].map(b => <option key={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#8B8680', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>Reg no.</label>
              <input value={regNo} onChange={e => setRegNo(e.target.value)} placeholder="00123456" style={inp} />
            </div>
          </div>
        </div>

        {/* Auto-populated clinical data */}
        {(riskLevel || phq9 !== null || gad7 !== null) && (
          <div style={{ padding: '12px 24px', background: '#F7F5F0', borderBottom: '0.5px solid #F0EDE6', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <p style={{ fontSize: '0.68rem', fontWeight: 700, color: '#8B8680', textTransform: 'uppercase', letterSpacing: '0.08em', width: '100%' }}>Auto-populated from client record</p>
            {riskLevel && <span style={{ fontSize: '0.78rem', fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: riskLevel === 'high' ? '#FEF2F2' : '#FFFBEB', color: riskLevel === 'high' ? '#991B1B' : '#92400E' }}>C-SSRS: {riskLevel} risk</span>}
            {phq9 !== null && <span style={{ fontSize: '0.78rem', fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: '#EFF6FF', color: '#1E40AF' }}>PHQ-9: {phq9}/27</span>}
            {gad7 !== null && <span style={{ fontSize: '0.78rem', fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: '#EFF6FF', color: '#1E40AF' }}>GAD-7: {gad7}/21</span>}
          </div>
        )}

        {/* Letter preview */}
        <div style={{ padding: '20px 24px' }}>
          <p style={{ fontSize: '0.68rem', fontWeight: 700, color: '#8B8680', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Letter preview — edit directly</p>
          <textarea
            value={letter}
            readOnly
            rows={14}
            style={{ width: '100%', padding: '14px', borderRadius: 12, border: '0.5px solid #E2DDD5', fontSize: '0.82rem', fontFamily: 'Georgia, serif', color: '#1A1816', background: '#FAFAF8', lineHeight: 1.8, resize: 'vertical', boxSizing: 'border-box', outline: 'none' }}
          />
          <p style={{ fontSize: '0.72rem', color: '#B8B3AE', marginTop: 8 }}>Fill in the fields above to update the letter. Copy and paste into your practice system or email client.</p>
        </div>

        {/* Footer actions */}
        <div style={{ padding: '16px 24px', borderTop: '0.5px solid #F0EDE6', display: 'flex', gap: 10 }}>
          {savedId ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#ECFDF5', border: '0.5px solid #6EE7B7', borderRadius: 10 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#065F46" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7"/></svg>
              <span style={{ fontSize: '0.82rem', color: '#065F46', fontWeight: 600 }}>Saved to records</span>
            </div>
          ) : (
            <button onClick={handleSave} disabled={saving}
              style={{ flex: 1, padding: '11px', background: '#F7F5F0', color: '#4A4744', border: '0.5px solid #E2DDD5', borderRadius: 10, fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', fontFamily: 'Inter, system-ui, sans-serif' }}>
              {saving ? 'Saving...' : 'Save to records'}
            </button>
          )}
          <button onClick={handleCopy}
            style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px', background: copied ? '#ECFDF5' : '#2D6A4F', color: copied ? '#065F46' : '#fff', border: copied ? '1px solid #6EE7B7' : 'none', borderRadius: 10, fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', fontFamily: 'Inter, system-ui, sans-serif', transition: 'all 0.2s' }}>
            {copied ? (
              <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7"/></svg>Copied to clipboard</>
            ) : (
              <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>Copy letter</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
