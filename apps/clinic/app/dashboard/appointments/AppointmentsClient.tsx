'use client'
import { useState } from 'react'
import { saveAppointment } from '../../actions'

interface Appointment { id: string; time: string; reason: string | null; status: string; patientId: string; patientName: string }
interface Patient { id: string; name: string }

const STATUS_MAP: Record<string, { bg: string; color: string; label: string }> = {
  pending:   { bg: '#FEF3C7', color: '#92400E', label: 'Pending' },
  confirmed: { bg: '#D8EDDF', color: '#1B4332', label: 'Confirmed' },
  completed: { bg: '#ECFDF5', color: '#065F46', label: 'Completed' },
  cancelled: { bg: '#FEE2E2', color: '#991B1B', label: 'Cancelled' },
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function fmtDate(iso: string) {
  const d = new Date(iso)
  return {
    day:  d.getDate(),
    mon:  MONTHS[d.getMonth()],
    time: d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
  }
}

function ApptCard({ a }: { a: Appointment }) {
  const s = STATUS_MAP[a.status] || STATUS_MAP.pending
  const { day, mon, time } = fmtDate(a.time)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', background: '#fff', border: '0.5px solid #E2DDD5', borderRadius: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.05)', transition: 'box-shadow 0.2s, transform 0.2s' }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)'; e.currentTarget.style.transform = 'translateY(0)' }}
    >
      <div style={{ width: 54, flexShrink: 0, textAlign: 'center', background: '#F7F5F0', borderRadius: 12, padding: '8px 4px', border: '0.5px solid #E2DDD5' }}>
        <p style={{ fontSize: '0.68rem', fontWeight: 700, color: '#2D6A4F', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{mon}</p>
        <p style={{ fontFamily: 'Lora, serif', fontSize: '1.5rem', fontWeight: 700, color: '#1A1816', lineHeight: 1, margin: '2px 0' }}>{day}</p>
        <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#4A4744' }}>{time}</p>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#1A1816', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.patientName}</p>
        <p style={{ fontSize: '0.825rem', color: '#8B8680', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.reason || 'General session'}</p>
      </div>
      <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '4px 11px', borderRadius: 20, background: s.bg, color: s.color, flexShrink: 0 }}>{s.label}</span>
    </div>
  )
}

export default function AppointmentsClient({ appointments, patients }: { appointments: Appointment[]; patients: Patient[] }) {
  const [showForm, setShowForm]   = useState(false)
  const [patientId, setPatientId] = useState('')
  const [date, setDate]           = useState('')
  const [time, setTime]           = useState('')
  const [reason, setReason]       = useState('')
  const [saving, setSaving]       = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [localAppts, setLocalAppts] = useState<Appointment[]>(appointments)

  const today    = new Date().toISOString().split('T')[0]
  const now      = new Date()
  const upcoming = localAppts.filter(a => new Date(a.time) >= now && a.status !== 'cancelled')
  const past     = localAppts.filter(a => new Date(a.time) < now || a.status === 'cancelled')

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!patientId || !date || !time) return
    setSaving(true); setSaveError(null)

    try {
      const requestedTime = new Date(`${date}T${time}:00`).toISOString()
      const patient = patients.find(p => p.id === patientId)

      // ── Save to Supabase ────────────────────────────────────────────────
      const result = await saveAppointment({
        patientId,
        requestedTime,
        reason: reason || undefined,
      })

      if (result.error) {
        setSaveError(result.error)
        return
      }

      // Add to local list with the real DB id
      setLocalAppts(prev => [{
        id:          result.id || `temp-${Date.now()}`,
        time:        requestedTime,
        reason:      reason || null,
        status:      'pending',
        patientId,
        patientName: patient?.name || 'Unknown',
      }, ...prev])

      setShowForm(false)
      setPatientId(''); setDate(''); setTime(''); setReason('')
    } catch (err: any) {
      setSaveError(err?.message || 'Failed to save. Try again.')
    } finally {
      setSaving(false)
    }
  }

  const inp: React.CSSProperties = {
    width: '100%', padding: '10px 12px', border: '0.5px solid #E2DDD5', borderRadius: 10,
    fontSize: '0.9rem', color: '#1A1816', background: '#F7F5F0', outline: 'none',
    fontFamily: 'Inter, system-ui, sans-serif', transition: 'border-color 0.15s, box-shadow 0.15s',
  }
  const focIn  = (e: any) => { e.target.style.borderColor = '#2D6A4F'; e.target.style.boxShadow = '0 0 0 3px rgba(45,106,79,0.1)' }
  const focOut = (e: any) => { e.target.style.borderColor = '#E2DDD5'; e.target.style.boxShadow = 'none' }

  return (
    <div style={{ padding: '2rem 2.5rem 3rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'Lora, Georgia, serif', fontSize: '1.5rem', fontWeight: 700, color: '#1A1816', letterSpacing: '-0.02em', marginBottom: 5 }}>
            Appointments
          </h1>
          <p style={{ color: '#8B8680', fontSize: '0.9rem' }}>Manage your therapy schedule · Saved to Supabase</p>
        </div>
        <button onClick={() => { setShowForm(!showForm); setSaveError(null) }}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '11px 20px', background: '#2D6A4F', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'Inter, system-ui, sans-serif', transition: 'background 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.background = '#1B4332'}
          onMouseLeave={e => e.currentTarget.style.background = '#2D6A4F'}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4v16m8-8H4"/></svg>
          New appointment
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 12, marginBottom: '1.75rem', flexWrap: 'wrap' }}>
        {[
          { label: 'Upcoming',  value: upcoming.length,                                      color: '#1A1816', bg: '#fff' },
          { label: 'Confirmed', value: upcoming.filter(a => a.status === 'confirmed').length, color: '#1B4332', bg: '#ECFDF5', border: '#6EE7B7' },
          { label: 'Pending',   value: upcoming.filter(a => a.status === 'pending').length,   color: '#92400E', bg: '#FFFBEB', border: '#FDE68A' },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, border: `0.5px solid ${s.border || '#E2DDD5'}`, borderRadius: 14, padding: '14px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ fontFamily: 'Lora, serif', fontSize: '1.75rem', fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#8B8680', textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* New appointment form */}
      {showForm && (
        <div style={{ background: '#fff', border: '0.5px solid #E2DDD5', borderRadius: 18, padding: '24px', marginBottom: '1.75rem', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
          <h3 style={{ fontFamily: 'Lora, Georgia, serif', fontWeight: 700, fontSize: '1.125rem', color: '#1A1816', marginBottom: 18 }}>
            Book new appointment
          </h3>
          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 5, fontSize: '0.68rem', fontWeight: 700, color: '#4A4744', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Client *</label>
              <select required value={patientId} onChange={e => setPatientId(e.target.value)} style={{ ...inp, cursor: 'pointer' }} onFocus={focIn} onBlur={focOut}>
                <option value="">Select client…</option>
                {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 5, fontSize: '0.68rem', fontWeight: 700, color: '#4A4744', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Date *</label>
                <input required type="date" value={date} min={today} onChange={e => setDate(e.target.value)} style={inp} onFocus={focIn} onBlur={focOut} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 5, fontSize: '0.68rem', fontWeight: 700, color: '#4A4744', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Time *</label>
                <input required type="time" value={time} onChange={e => setTime(e.target.value)} style={inp} onFocus={focIn} onBlur={focOut} />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 5, fontSize: '0.68rem', fontWeight: 700, color: '#4A4744', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Reason / notes</label>
              <input type="text" value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. CBT session, initial assessment" style={inp} onFocus={focIn} onBlur={focOut} />
            </div>

            {saveError && (
              <div style={{ background: '#FEF2F2', border: '0.5px solid #FECACA', borderRadius: 10, padding: '10px 14px', fontSize: '0.825rem', color: '#991B1B' }}>
                {saveError}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
              <button type="button" onClick={() => { setShowForm(false); setSaveError(null) }}
                style={{ padding: '10px 20px', border: '0.5px solid #E2DDD5', borderRadius: 10, background: '#fff', color: '#4A4744', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                Cancel
              </button>
              <button type="submit" disabled={saving}
                style={{ padding: '10px 22px', border: 'none', borderRadius: 10, background: saving ? '#F0EDE6' : '#2D6A4F', color: saving ? '#8B8680' : '#fff', fontWeight: 700, fontSize: '0.9rem', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'Inter, sans-serif' }}>
                {saving ? 'Saving to Supabase…' : 'Create appointment'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Upcoming */}
      <div style={{ marginBottom: '2rem' }}>
        <p style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#8B8680', marginBottom: 12 }}>
          Upcoming ({upcoming.length})
        </p>
        {upcoming.length === 0 ? (
          <div style={{ background: '#fff', border: '0.5px dashed #E2DDD5', borderRadius: 14, padding: '2.5rem', textAlign: 'center' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#B8B3AE" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', margin: '0 auto 12px' }}>
              <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
            <p style={{ color: '#8B8680', fontSize: '0.9rem' }}>No upcoming appointments — book one above</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {upcoming.map(a => <ApptCard key={a.id} a={a} />)}
          </div>
        )}
      </div>

      {past.length > 0 && (
        <div>
          <p style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#8B8680', marginBottom: 12 }}>
            Past / cancelled ({past.length})
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, opacity: 0.65 }}>
            {past.slice(0, 10).map(a => <ApptCard key={a.id} a={a} />)}
          </div>
        </div>
      )}
    </div>
  )
}
