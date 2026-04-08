'use client'
import { useState } from 'react'
import { generateClinicalNote, saveSession, saveTranscriptRiskFlags } from '../app/actions'

type NoteFormat = 'soap' | 'dap' | 'birp' | 'girp'

// GAP 4: alerts prop added so transcript risk flags can be persisted on save
interface Props {
  transcript:    string
  patientId?:    string
  patientName?:  string
  alerts?:       Array<{ id: string; label: string; severity: number; triggered?: boolean }>
}

const FORMATS: { value: NoteFormat; label: string; desc: string }[] = [
  { value: 'soap', label: 'SOAP', desc: 'Subjective · Objective · Assessment · Plan' },
  { value: 'dap',  label: 'DAP',  desc: 'Data · Assessment · Plan' },
  { value: 'birp', label: 'BIRP', desc: 'Behaviour · Intervention · Response · Plan' },
  { value: 'girp', label: 'GIRP', desc: 'Goal · Intervention · Response · Plan' },
]

const RISK_STYLES: Record<string, { bg: string; tx: string; label: string }> = {
  none:     { bg: '#ECFDF5', tx: '#065F46', label: 'No risk identified' },
  low:      { bg: '#EFF6FF', tx: '#1E40AF', label: 'Low risk' },
  moderate: { bg: '#FFFBEB', tx: '#92400E', label: 'Moderate risk' },
  high:     { bg: '#FFF7ED', tx: '#9A3412', label: 'High risk' },
  critical: { bg: '#FEF2F2', tx: '#991B1B', label: 'CRITICAL — immediate action' },
}

function Spinner() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
      <path d="M21 12a9 9 0 11-6.219-8.56" />
    </svg>
  )
}

function formatAsText(data: any, fmt: NoteFormat) {
  if (fmt === 'soap' && data.soapNote) {
    const n = data.soapNote
    return `S — Subjective\n${n.subjective}\n\nO — Objective\n${n.objective}\n\nA — Assessment\n${n.assessment}\n\nP — Plan\n${n.plan}`
  }
  if (fmt === 'dap' && data.dapNote) {
    const n = data.dapNote
    return `D — Data\n${n.data}\n\nA — Assessment\n${n.assessment}\n\nP — Plan\n${n.plan}`
  }
  if (fmt === 'birp' && data.birpNote) {
    const n = data.birpNote
    return `B — Behaviour\n${n.behaviour}\n\nI — Intervention\n${n.intervention}\n\nR — Response\n${n.response}\n\nP — Plan\n${n.plan}`
  }
  if (fmt === 'girp' && data.girpNote) {
    const n = data.girpNote
    return `G — Goal\n${n.goal}\n\nI — Intervention\n${n.intervention}\n\nR — Response\n${n.response}\n\nP — Plan\n${n.plan}`
  }
  return JSON.stringify(data, null, 2)
}

function NoteBody({ data, fmt }: { data: any; fmt: NoteFormat }) {
  const sections: { label: string; content: string }[] = []
  if (fmt === 'soap' && data.soapNote) {
    const n = data.soapNote
    sections.push(
      { label: 'S — Subjective', content: n.subjective },
      { label: 'O — Objective',  content: n.objective },
      { label: 'A — Assessment', content: n.assessment },
      { label: 'P — Plan',       content: n.plan },
    )
  } else if (fmt === 'dap' && data.dapNote) {
    const n = data.dapNote
    sections.push({ label: 'D — Data', content: n.data }, { label: 'A — Assessment', content: n.assessment }, { label: 'P — Plan', content: n.plan })
  } else if (fmt === 'birp' && data.birpNote) {
    const n = data.birpNote
    sections.push({ label: 'B — Behaviour', content: n.behaviour }, { label: 'I — Intervention', content: n.intervention }, { label: 'R — Response', content: n.response }, { label: 'P — Plan', content: n.plan })
  } else if (fmt === 'girp' && data.girpNote) {
    const n = data.girpNote
    sections.push({ label: 'G — Goal', content: n.goal }, { label: 'I — Intervention', content: n.intervention }, { label: 'R — Response', content: n.response }, { label: 'P — Plan', content: n.plan })
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {sections.map(s => (
        <div key={s.label}>
          <p style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#2D6A4F', marginBottom: 5 }}>{s.label}</p>
          <p style={{ fontSize: '0.875rem', color: '#1A1A1A', lineHeight: 1.65 }}>{s.content}</p>
        </div>
      ))}
    </div>
  )
}

export default function NoteGenerator({ transcript, patientId, patientName, alerts = [] }: Props) {
  const [format, setFormat]   = useState<NoteFormat>('soap')
  const [note, setNote]       = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [copied, setCopied]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [saving, setSaving]   = useState(false)
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState('')

  const generate = async () => {
    if (!transcript || transcript.length < 10) { setError('No transcript yet. Start a session or run demo first.'); return }
    setLoading(true); setError(null); setNote(null); setSaved(false)
    const res = await generateClinicalNote(transcript, format)
    setLoading(false)
    if (res.error) { setError(res.error) } else { setNote(res.data); setEditText(formatAsText(res.data, format)) }
  }

  const copy = async () => {
    await navigator.clipboard.writeText(editing ? editText : formatAsText(note, format))
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  // GAP 4 FIX: after saving session, persist transcript risk flags with the session_id
  const save = async () => {
    if (!patientId || !note) return
    setSaving(true)
    const res = await saveSession({
      patientId,
      transcript,
      note:      editing ? editText : formatAsText(note, format),
      format,
      riskLevel: note.riskAssessment?.level,
    })
    if (res.error) {
      setError(res.error)
    } else {
      setSaved(true)
      // If there were live C-SSRS flags in the transcript, persist them now linked to this session
      if (res.sessionId && alerts.length > 0) {
        const triggeredAlerts = alerts.filter(a => !('dismissed' in a && (a as any).dismissed))
        if (triggeredAlerts.length > 0) {
          const maxSev = Math.max(...triggeredAlerts.map(a => a.severity || 0))
          const riskLevel = maxSev === 0 ? 'none' : maxSev <= 2 ? 'low' : maxSev <= 4 ? 'moderate' : 'high'
          await saveTranscriptRiskFlags({
            sessionId:   res.sessionId,
            patientId,
            flags:       triggeredAlerts.map(a => ({ ...a, triggered: true })),
            maxSeverity: maxSev,
            riskLevel,
          })
        }
      }
    }
    setSaving(false)
  }

  const risk = note?.riskAssessment
  const riskStyle = risk ? (RISK_STYLES[risk.level] || RISK_STYLES.none) : null
  const btnBase: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 9, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', border: 'none', fontFamily: 'DM Sans, system-ui, sans-serif', transition: 'all 0.15s' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 style={{ fontFamily: 'Lora, Georgia, serif', fontWeight: 700, fontSize: '0.9375rem', color: '#1A1A1A' }}>Note Generator</h3>
        </div>
        {note && (
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={copy} style={{ ...btnBase, background: '#F7F5F0', color: '#6B7280', border: '1px solid #E2DDD5' }}>
              {copied ? '✓ Copied' : 'Copy'}
            </button>
            <button onClick={() => { setEditing(!editing); if (!editing) setEditText(formatAsText(note, format)) }}
              style={{ ...btnBase, background: editing ? '#D8EDDF' : '#F7F5F0', color: editing ? '#1B4332' : '#6B7280', border: `1px solid ${editing ? '#74C69D' : '#E2DDD5'}` }}>
              {editing ? 'Preview' : 'Edit'}
            </button>
          </div>
        )}
      </div>

      {/* Format selector */}
      <div style={{ display: 'flex', gap: 6 }}>
        {FORMATS.map(f => (
          <button key={f.value} onClick={() => { setFormat(f.value); setNote(null); setSaved(false) }}
            style={{ flex: 1, padding: '8px 4px', borderRadius: 10, fontSize: '0.75rem', fontWeight: format === f.value ? 700 : 500, cursor: 'pointer', fontFamily: 'Inter, sans-serif', border: `1.5px solid ${format === f.value ? '#2D6A4F' : '#E2DDD5'}`, background: format === f.value ? '#EEF7F1' : 'transparent', color: format === f.value ? '#2D6A4F' : '#8B8680', transition: 'all 0.15s', textAlign: 'center' }}>
            {f.label}
            <span style={{ display: 'block', fontSize: '0.6rem', color: format === f.value ? '#40916C' : '#B8B3AE', marginTop: 2 }}>{f.desc}</span>
          </button>
        ))}
      </div>

      {/* Generate button */}
      {!note && (
        <button onClick={generate} disabled={loading}
          style={{ ...btnBase, width: '100%', justifyContent: 'center', padding: '12px', background: loading ? '#F0EDE6' : '#2D6A4F', color: loading ? '#8B8680' : '#fff', fontSize: '0.9rem', borderRadius: 12 }}>
          {loading ? <><Spinner /> Generating {format.toUpperCase()} note…</> : <>Generate {format.toUpperCase()} note</>}
        </button>
      )}

      {error && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 14px', color: '#991B1B', fontSize: '0.825rem' }}>
          {error}
        </div>
      )}

      {/* Note display */}
      {note && (
        <div style={{ background: '#fff', border: '0.5px solid #E2DDD5', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          <div style={{ padding: '14px 18px', borderBottom: '0.5px solid #F0EDE6', background: '#F7F5F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: '#8B8680' }}>{format.toUpperCase()} Note</span>
            <span style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: 10, background: '#EDE9FE', color: '#4C1D95', fontWeight: 600 }}>AI generated</span>
          </div>
          <div style={{ padding: '16px 18px' }}>
            {editing ? (
              <textarea value={editText} onChange={e => setEditText(e.target.value)} rows={14}
                style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1.5px solid #2D6A4F', fontSize: '0.825rem', fontFamily: 'Inter, system-ui, sans-serif', color: '#1A1816', background: '#F7F5F0', outline: 'none', resize: 'vertical', lineHeight: 1.6, boxSizing: 'border-box' }} />
            ) : (
              <NoteBody data={note} fmt={format} />
            )}
          </div>
        </div>
      )}

      {/* Risk assessment */}
      {riskStyle && risk && (
        <div style={{ background: riskStyle.bg, border: `0.5px solid ${riskStyle.tx}30`, borderRadius: 12, padding: '12px 16px' }}>
          <p style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: riskStyle.tx, marginBottom: 4 }}>AI risk screening</p>
          <p style={{ fontSize: '0.9rem', fontWeight: 700, color: riskStyle.tx }}>{riskStyle.label}</p>
          {risk.factors?.length > 0 && (
            <p style={{ fontSize: '0.8rem', color: riskStyle.tx, opacity: 0.8, marginTop: 4 }}>Factors: {risk.factors.join(', ')}</p>
          )}
          {(risk.suicidalIdeation || risk.selfHarm) && (
            <p style={{ fontSize: '0.78rem', color: '#991B1B', fontWeight: 600, marginTop: 6 }}>⚠ Conduct full C-SSRS assessment immediately</p>
          )}
        </div>
      )}

      {/* Save / saved */}
      {note && !saved && patientId && (
        <button onClick={save} disabled={saving}
          style={{ ...btnBase, width: '100%', justifyContent: 'center', padding: '12px', background: saving ? '#F0EDE6' : '#1B4332', color: saving ? '#8B8680' : '#fff', fontSize: '0.9rem', borderRadius: 12 }}>
          {saving ? <><Spinner /> Saving…</> : '✓ Save to client record'}
        </button>
      )}

      {saved && (
        <div style={{ background: '#ECFDF5', border: '1px solid #6EE7B7', borderRadius: 12, padding: '12px 16px', fontSize: '0.875rem', color: '#065F46', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#065F46" strokeWidth="2"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          Note saved · Audit trail written{alerts.length > 0 ? ' · Risk flags persisted' : ''}
        </div>
      )}

      {note && !patientId && (
        <div style={{ background: '#FFFBEB', border: '0.5px solid #FDE68A', borderRadius: 10, padding: '10px 14px', fontSize: '0.8rem', color: '#92400E' }}>
          Select a client from the session list to save this note to their record.
        </div>
      )}
    </div>
  )
}
