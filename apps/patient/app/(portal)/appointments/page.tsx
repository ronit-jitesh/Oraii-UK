'use client'
import { useState, useEffect } from 'react'
import { getMyAppointments, requestAppointment, getMyTherapist } from '../../actions'

interface Appointment {
  id: string
  requested_time: string
  duration_minutes: number
  location_type: string
  status: string
  reason: string | null
  created_at: string
}

function Ico({ d, size = 16, color = 'currentColor' }: { d: string; size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
}

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  pending:   { label: 'Pending',   color: '#92400E', bg: '#FFFBEB', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
  confirmed: { label: 'Confirmed', color: '#065F46', bg: '#ECFDF5', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
  completed: { label: 'Completed', color: '#8B8680', bg: '#F0EDE6', icon: 'M5 13l4 4L19 7' },
  cancelled: { label: 'Cancelled', color: '#DC2626', bg: '#FEF2F2', icon: 'M6 18L18 6M6 6l12 12' },
  no_show:   { label: 'Missed',    color: '#DC2626', bg: '#FEF2F2', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
}

const LOC_LABELS: Record<string, { label: string; icon: string }> = {
  video:     { label: 'Video call',  icon: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z' },
  in_person: { label: 'In person',   icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
  phone:     { label: 'Phone call',  icon: 'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z' },
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [showRequest, setShowRequest] = useState(false)
  const [therapistName, setTherapistName] = useState<string | null>(null)
  const [form, setForm] = useState({ date: '', time: '', locationType: 'video', reason: '' })
  const [submitting, setSubmitting] = useState(false)
  const [submitMsg, setSubmitMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    Promise.all([
      getMyAppointments(),
      getMyTherapist(),
    ]).then(([appts, therapist]) => {
      setAppointments(appts || [])
      setTherapistName(therapist?.full_name || null)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const now = new Date()
  const upcoming = appointments.filter(a => new Date(a.requested_time) >= now && ['pending', 'confirmed'].includes(a.status))
  const past = appointments.filter(a => !upcoming.includes(a))

  const handleSubmit = async () => {
    if (!form.date || !form.time) return
    setSubmitting(true)
    setSubmitMsg(null)
    const preferredTime = new Date(`${form.date}T${form.time}`).toISOString()
    const result = await requestAppointment({
      preferredTime,
      locationType: form.locationType,
      reason: form.reason || undefined,
    })
    setSubmitting(false)
    if (result.error) {
      setSubmitMsg({ type: 'error', text: result.error })
    } else {
      setSubmitMsg({ type: 'success', text: 'Request sent! Your therapist will confirm.' })
      setShowRequest(false)
      setForm({ date: '', time: '', locationType: 'video', reason: '' })
      // Reload appointments
      const appts = await getMyAppointments()
      setAppointments(appts || [])
    }
  }

  const renderApptCard = (a: Appointment, idx: number) => {
    const dt = new Date(a.requested_time)
    const cfg = (STATUS_CFG[a.status] || STATUS_CFG.pending) as { label: string; color: string; bg: string; icon: string }
    const loc = (LOC_LABELS[a.location_type] || LOC_LABELS.video) as { label: string; icon: string }

    return (
      <div key={a.id} className={`anim-fade-up d${idx + 2}`} style={{
        background: 'var(--surface)',
        border: '0.5px solid var(--border)',
        borderRadius: 18,
        padding: '16px 20px',
        boxShadow: 'var(--shadow)',
        display: 'flex', alignItems: 'center', gap: 16,
      }}>
        {/* Date block */}
        <div style={{
          width: 56, height: 62, borderRadius: 14,
          background: a.status === 'confirmed' ? 'var(--light)' : '#F0EDE6',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: '1.25rem', fontWeight: 800, color: a.status === 'confirmed' ? 'var(--primary-dk)' : 'var(--text-2)', lineHeight: 1 }}>
            {dt.getDate()}
          </span>
          <span style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {dt.toLocaleDateString('en-GB', { month: 'short' })}
          </span>
        </div>

        {/* Details */}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <p style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text)' }}>
              {dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
            </p>
            <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>{a.duration_minutes} min</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              fontSize: '0.68rem', fontWeight: 600, padding: '2px 8px', borderRadius: 6,
              background: cfg.bg, color: cfg.color,
            }}>
              <Ico d={cfg.icon} size={10} color={cfg.color} />
              {cfg.label}
            </span>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              fontSize: '0.68rem', fontWeight: 500, padding: '2px 8px', borderRadius: 6,
              background: '#F0EDE6', color: 'var(--text-2)',
            }}>
              <Ico d={loc.icon} size={10} color="var(--text-2)" />
              {loc.label}
            </span>
          </div>
          {a.reason && <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 4 }}>{a.reason}</p>}
        </div>
      </div>
    )
  }

  return (
    <div className="portal-page">
      {/* Header */}
      <div className="anim-fade-up" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontFamily: 'Lora, Georgia, serif', fontSize: '1.5rem', fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.02em', marginBottom: 4 }}>
            Appointments
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>
            Your therapy sessions{therapistName ? ` with ${therapistName}` : ''}.
          </p>
        </div>
        <button
          onClick={() => { setShowRequest(!showRequest); setSubmitMsg(null) }}
          className="p-btn p-btn-primary"
          style={{ fontSize: '0.8rem', padding: '8px 16px', borderRadius: 12 }}
        >
          <Ico d="M12 4v16m8-8H4" size={14} color="#fff" />
          Request
        </button>
      </div>

      {/* Success/error message */}
      {submitMsg && (
        <div className="anim-fade-up" style={{
          padding: '12px 16px', borderRadius: 14, marginBottom: '1rem',
          background: submitMsg.type === 'success' ? '#ECFDF5' : '#FEF2F2',
          border: `0.5px solid ${submitMsg.type === 'success' ? 'rgba(45,106,79,0.2)' : 'rgba(220,38,38,0.2)'}`,
          fontSize: '0.82rem', color: submitMsg.type === 'success' ? '#065F46' : '#991B1B',
          fontWeight: 500,
        }}>
          {submitMsg.text}
        </div>
      )}

      {/* Request form */}
      {showRequest && (
        <div className="anim-fade-up" style={{
          background: 'var(--surface)', border: '0.5px solid var(--border)',
          borderRadius: 20, padding: '20px', marginBottom: '1.5rem',
          boxShadow: 'var(--shadow-md)',
        }}>
          <p style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>
            Request an appointment
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Preferred date</label>
              <input type="date" className="p-input" value={form.date}
                onChange={e => setForm({ ...form, date: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
                style={{ fontSize: '0.85rem' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Preferred time</label>
              <input type="time" className="p-input" value={form.time}
                onChange={e => setForm({ ...form, time: e.target.value })}
                style={{ fontSize: '0.85rem' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Session type</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['video', 'in_person', 'phone'] as const).map(t => {
                const loc = LOC_LABELS[t]!
                const active = form.locationType === t
                return (
                  <button key={t} onClick={() => setForm({ ...form, locationType: t })}
                    style={{
                      flex: 1, padding: '10px', borderRadius: 12, cursor: 'pointer',
                      border: `1.5px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
                      background: active ? 'var(--light)' : 'transparent',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                      transition: 'all 0.15s',
                    }}
                  >
                    <Ico d={loc.icon} size={18} color={active ? 'var(--primary)' : 'var(--muted)'} />
                    <span style={{ fontSize: '0.72rem', fontWeight: active ? 600 : 400, color: active ? 'var(--primary-dk)' : 'var(--muted)' }}>
                      {loc.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Reason (optional)</label>
            <textarea className="p-input" rows={2} value={form.reason}
              onChange={e => setForm({ ...form, reason: e.target.value })}
              placeholder="e.g. Follow-up session, discuss medication review..."
              style={{ fontSize: '0.85rem' }}
            />
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="p-btn p-btn-primary" onClick={handleSubmit}
              disabled={!form.date || !form.time || submitting}
              style={{ flex: 1, borderRadius: 12 }}
            >
              {submitting ? 'Sending...' : 'Send request'}
            </button>
            <button className="p-btn p-btn-ghost" onClick={() => setShowRequest(false)}
              style={{ borderRadius: 12 }}
            >
              Cancel
            </button>
          </div>

          <p style={{ fontSize: '0.68rem', color: 'var(--muted)', marginTop: 10, lineHeight: 1.5 }}>
            This sends a request to your therapist. They will confirm the time and it will appear in your upcoming appointments.
          </p>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite', display: 'inline-block', marginRight: 8 }}><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
          Loading appointments...
        </div>
      ) : appointments.length === 0 && !showRequest ? (
        <div className="anim-fade-up d2" style={{
          background: 'var(--surface)', border: '1px dashed var(--border)',
          borderRadius: 20, padding: '3rem 2rem', textAlign: 'center',
        }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: '#F0EDE6', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <Ico d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" size={22} color="var(--muted)" />
          </div>
          <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>No appointments yet</p>
          <p style={{ fontSize: '0.8rem', color: 'var(--muted)', lineHeight: 1.5 }}>
            Your therapist will schedule sessions, or you can<br />
            request an appointment using the button above.
          </p>
        </div>
      ) : (
        <>
          {/* Upcoming */}
          {upcoming.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--muted)', marginBottom: 10 }}>
                Upcoming
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {upcoming.map((a, i) => renderApptCard(a, i))}
              </div>
            </div>
          )}

          {/* Past */}
          {past.length > 0 && (
            <div>
              <p style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--muted)', marginBottom: 10 }}>
                Past
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {past.map((a, i) => renderApptCard(a, i + upcoming.length))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Contact note */}
      <div className="anim-fade-up d6" style={{
        marginTop: '1.5rem', background: 'var(--light)', borderRadius: 16,
        padding: '14px 18px',
      }}>
        <p style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--primary-dk)', marginBottom: 4 }}>
          Need to contact your therapist?
        </p>
        <p style={{ fontSize: '0.75rem', color: 'var(--primary)', lineHeight: 1.5 }}>
          Use the contact details your therapist provided when you started working together.
          ORAII does not handle direct messaging between you and your therapist.
        </p>
      </div>
    </div>
  )
}
