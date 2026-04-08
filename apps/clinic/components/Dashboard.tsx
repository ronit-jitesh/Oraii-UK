'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createPatient, getPatients } from '../app/actions'

interface Patient {
  id: string; name: string; age?: number
  primary_complaint?: string; status?: string | null
}
interface Appointment {
  id: string; requested_time: string
  patients?: { name: string } | null
  reason?: string | null; status: string
}
interface Props {
  initialPatients: Patient[]
  stats: {
    totalPatients: number
    sessionsToday: number
    upcomingAppointments?: Appointment[]
    recentRiskAlerts?: number
  }
  therapistName?: string
}

function Ico({ d, size = 16, color }: { d: string; size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color || 'currentColor'} strokeWidth="1.75"
      strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d={d} />
    </svg>
  )
}

const I = {
  users:   'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
  cal:     'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  mic:     'M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z',
  user:    'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  plus:    'M12 4v16m8-8H4',
  arrow:   'M13 7l5 5m0 0l-5 5m5-5H6',
  check:   'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  warn:    'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
  refresh: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
  clock:   'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  search:  'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
  down:    'M19 9l-7 7-7-7',
  eye:     'M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z',
  eyeOff:  'M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21',
  spin:    'M21 12a9 9 0 11-6.219-8.56',
  activity:'M22 12h-4l-3 9L9 3l-3 9H2',
}

const PALETTE = [
  { bg: '#D8EDDF', text: '#1B4332' }, { bg: '#DBEAFE', text: '#1E3A8A' },
  { bg: '#EDE9FE', text: '#4C1D95' }, { bg: '#FCE7F3', text: '#831843' },
  { bg: '#FEF3C7', text: '#78350F' }, { bg: '#D1FAE5', text: '#064E3B' },
]
const av = (n: string) => PALETTE[(n || 'A').charCodeAt(0) % 6]

const inp: React.CSSProperties = {
  width: '100%', padding: '9px 12px',
  border: '0.5px solid #E2DDD5', borderRadius: 10,
  fontSize: '0.875rem', fontFamily: 'Inter, system-ui, sans-serif',
  color: '#1A1816', background: '#F7F5F0', outline: 'none',
  transition: 'border-color 0.15s, box-shadow 0.15s',
}
const focIn  = (e: any) => { e.target.style.borderColor = '#2D6A4F'; e.target.style.boxShadow = '0 0 0 3px rgba(45,106,79,0.1)' }
const focOut = (e: any) => { e.target.style.borderColor = '#E2DDD5'; e.target.style.boxShadow = 'none' }

export default function Dashboard({ initialPatients, stats, therapistName }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<'returning' | 'new'>('new')
  const [selected, setSelected] = useState<Patient | null>(null)
  const [patients, setPatients] = useState<Patient[]>(initialPatients)
  const [q, setQ] = useState('')
  const [isPending, startTransition] = useTransition()
  const [showDischarged, setShowDischarged] = useState(false)
  const [extended, setExtended] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [complaint, setComplaint] = useState('')
  const [gender, setGender] = useState('')
  const [referral, setReferral] = useState('')

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const filtered = patients.filter(p => (p.name || '').toLowerCase().includes(q.toLowerCase()))

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    startTransition(async () => {
      const res = await createPatient({
        name, age: age ? parseInt(age) : undefined,
        primaryComplaint: complaint, gender: gender || undefined,
        referralSource: referral || undefined,
      })
      if (res.success && res.patient) {
        const p: Patient = {
          id: res.patient.id, name: res.patient.name || name,
          age: res.patient.age, primary_complaint: res.patient.primary_complaint,
        }
        setPatients([p, ...patients])
        setSelected(p)
        setName(''); setAge(''); setComplaint(''); setGender(''); setReferral('')
        setTab('returning')
        router.refresh()
      } else {
        setFormError(res.error || 'Failed to add client')
      }
    })
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F7F5F0' }}>

      {/* ── Hero banner ── */}
      <div style={{
        background: 'linear-gradient(135deg, #EEF7F1 0%, #F0EDE6 60%, #D8EDDF 100%)',
        borderBottom: '0.5px solid #E2DDD5',
        padding: '2rem 2.5rem 5.5rem',
      }}>
        <div style={{ marginBottom: '1.25rem' }}>
          <h1 style={{
            fontFamily: 'Lora, Georgia, serif',
            fontSize: '1.625rem', fontWeight: 700,
            color: '#1A1816', letterSpacing: '-0.02em', marginBottom: 4,
          }}>
            {greeting}{therapistName ? `, ${therapistName.split(' ')[0]}` : ''}
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#8B8680' }}>
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* Compliance badges */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          {['UK-GDPR · DPA 2018', 'NICE CG133', 'MHA 1983', 'BACP / UKCP'].map(b => (
            <span key={b} style={{
              background: 'rgba(255,255,255,0.7)', border: '0.5px solid #E2DDD5',
              color: '#8B8680', fontSize: '0.62rem', fontWeight: 600,
              padding: '3px 10px', borderRadius: 20, letterSpacing: '0.04em',
            }}>{b}</span>
          ))}
        </div>

        {/* Stat cards */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {[
            { icon: I.cal,   val: stats.sessionsToday, label: 'Sessions today' },
            { icon: I.users, val: stats.totalPatients,  label: 'Total clients' },
          ].map(s => (
            <div key={s.label} style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '14px 20px', background: '#fff',
              border: '0.5px solid #E2DDD5', borderRadius: 14,
              boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: 10,
                background: '#D8EDDF',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Ico d={s.icon} size={18} color="#2D6A4F" />
              </div>
              <div>
                <div style={{ fontFamily: 'Lora, Georgia, serif', fontSize: '1.875rem', fontWeight: 700, color: '#1A1816', lineHeight: 1 }}>
                  {s.val}
                </div>
                <div style={{ fontSize: '0.68rem', fontWeight: 600, color: '#8B8680', textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 3 }}>
                  {s.label}
                </div>
              </div>
            </div>
          ))}
          {(stats.recentRiskAlerts ?? 0) > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '14px 20px', background: '#FFFBEB',
              border: '0.5px solid #FDE68A', borderRadius: 14,
            }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Ico d={I.warn} size={18} color="#D97706" />
              </div>
              <div>
                <div style={{ fontFamily: 'Lora, serif', fontSize: '1.875rem', fontWeight: 700, color: '#D97706', lineHeight: 1 }}>
                  {stats.recentRiskAlerts}
                </div>
                <div style={{ fontSize: '0.68rem', fontWeight: 600, color: '#92400E', textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 3 }}>
                  Risk alerts
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Main grid — pulled up over banner ── */}
      <div style={{ padding: '0 2.5rem 3rem', marginTop: -60 }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 360px',
          gap: 18,
          maxWidth: 1080,
        }}>

          {/* ── Client Roster ── */}
          <div style={{
            background: '#fff',
            border: '0.5px solid #E2DDD5',
            borderRadius: 18,
            boxShadow: '0 4px 20px rgba(0,0,0,0.07)',
            display: 'flex', flexDirection: 'column',
            minHeight: 500, overflow: 'hidden',
          }}>
            {/* Header */}
            <div style={{
              padding: '14px 20px',
              borderBottom: '0.5px solid #F0EDE6',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Ico d={I.users} size={15} color="#8B8680" />
                <span style={{ fontWeight: 600, fontSize: '0.9375rem', color: '#1A1816' }}>Client Roster</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  onClick={() => { setShowDischarged(!showDischarged); startTransition(async () => { const r = await getPatients(); if (r.success) setPatients(r.patients as any) }) }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px',
                    borderRadius: 8, fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer',
                    border: 'none', background: showDischarged ? '#D8EDDF' : 'transparent',
                    color: showDischarged ? '#2D6A4F' : '#8B8680', transition: 'all 0.15s',
                  }}>
                  <Ico d={showDischarged ? I.eye : I.eyeOff} size={12} />
                  {showDischarged ? 'All' : 'Active'}
                </button>
                <span style={{ color: '#2D6A4F', background: '#D8EDDF', fontSize: '0.68rem', fontWeight: 700, padding: '3px 11px', borderRadius: 20 }}>
                  {patients.length} client{patients.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            {/* Search */}
            {patients.length > 0 && (
              <div style={{ padding: '12px 16px 6px' }}>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                    <Ico d={I.search} size={14} color="#B8B3AE" />
                  </div>
                  <input type="text" placeholder="Search clients…" value={q}
                    onChange={e => setQ(e.target.value)}
                    style={{ ...inp, paddingLeft: 34, background: '#F7F5F0' }}
                    onFocus={focIn} onBlur={focOut} />
                </div>
              </div>
            )}

            {/* List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '6px 12px 14px' }}>
              {filtered.length === 0 ? (
                <div style={{ height: '100%', minHeight: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '2rem', gap: 10 }}>
                  <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#F0EDE6', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '0.5px solid #E2DDD5' }}>
                    <Ico d={I.users} size={22} color="#B8B3AE" />
                  </div>
                  <p style={{ fontWeight: 600, fontSize: '0.9375rem', color: '#1A1816' }}>No clients yet</p>
                  <p style={{ fontSize: '0.825rem', color: '#8B8680', maxWidth: 240, lineHeight: 1.5 }}>
                    Add your first client using the intake form
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {filtered.map(p => {
                    const isSelected = selected?.id === p.id
                    const ac = av(p.name || 'A')
                    return (
                      <button key={p.id}
                        onClick={() => { setSelected(p); setTab('returning') }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '11px 14px', borderRadius: 12,
                          textAlign: 'left', cursor: 'pointer', width: '100%',
                          border: `0.5px solid ${isSelected ? '#2D6A4F40' : 'transparent'}`,
                          background: isSelected ? '#EEF7F1' : 'transparent',
                          transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#F7F5F0' }}
                        onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
                      >
                        <div style={{
                          width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 700, fontSize: '0.9375rem',
                          background: isSelected ? '#2D6A4F' : ac.bg,
                          color: isSelected ? '#fff' : ac.text,
                          transition: 'all 0.15s',
                          fontFamily: 'Lora, Georgia, serif',
                        }}>
                          {(p.name || 'A')[0].toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontWeight: 600, fontSize: '0.9rem', color: '#1A1816', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {p.name}
                          </p>
                          <p style={{ fontSize: '0.775rem', color: '#8B8680', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>
                            {p.primary_complaint || 'No presenting problem recorded'}
                          </p>
                        </div>
                        {p.status === 'pending' && (
                          <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: '#FEF3C7', color: '#92400E', flexShrink: 0 }}>
                            pending
                          </span>
                        )}
                        {isSelected && <Ico d={I.check} size={16} color="#2D6A4F" />}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── Right column ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Intake / Returning card */}
            <div style={{
              background: '#fff', border: '0.5px solid #E2DDD5',
              borderRadius: 18, boxShadow: '0 4px 20px rgba(0,0,0,0.07)',
              overflow: 'hidden', display: 'flex', flexDirection: 'column',
            }}>
              {/* Tabs */}
              <div style={{ display: 'flex', borderBottom: '0.5px solid #F0EDE6' }}>
                {([['returning', 'Returning', I.refresh], ['new', 'New Intake', I.plus]] as const).map(([t, label, icon]) => (
                  <button key={t} onClick={() => setTab(t as any)}
                    style={{
                      flex: 1, padding: '12px 0',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                      fontWeight: 600, fontSize: '0.8125rem', letterSpacing: '0.02em',
                      cursor: 'pointer', border: 'none', background: 'transparent',
                      color: tab === t ? '#2D6A4F' : '#8B8680',
                      position: 'relative', transition: 'color 0.15s',
                    }}>
                    <Ico d={icon} size={13} />
                    {label}
                    {tab === t && <div style={{ position: 'absolute', bottom: 0, left: 20, right: 20, height: 2, borderRadius: 2, background: '#2D6A4F' }} />}
                  </button>
                ))}
              </div>

              <div style={{ padding: '16px 18px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                {tab === 'returning' ? (
                  selected ? (
                    <div style={{ background: '#EEF7F1', border: '0.5px solid #74C69D40', borderRadius: 14, padding: '22px 20px', textAlign: 'center' }}>
                      <div style={{
                        width: 56, height: 56, borderRadius: 16, background: '#2D6A4F',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px',
                        fontFamily: 'Lora, serif', fontSize: '1.375rem', fontWeight: 700, color: '#fff',
                      }}>
                        {(selected.name || 'A')[0].toUpperCase()}
                      </div>
                      <p style={{ fontWeight: 700, fontSize: '1.0625rem', color: '#1A1816' }}>{selected.name}</p>
                      <p style={{ fontSize: '0.8rem', color: '#40916C', fontWeight: 500, marginTop: 4 }}>Ready for session</p>
                      {selected.primary_complaint && (
                        <p style={{ fontSize: '0.8rem', fontStyle: 'italic', color: '#4A4744', marginTop: 10, lineHeight: 1.5 }}>
                          &ldquo;{selected.primary_complaint}&rdquo;
                        </p>
                      )}
                    </div>
                  ) : (
                    <div style={{ flex: 1, minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#F0EDE6', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', border: '0.5px solid #E2DDD5' }}>
                          <Ico d={I.user} size={22} color="#B8B3AE" />
                        </div>
                        <p style={{ fontSize: '0.85rem', color: '#8B8680', lineHeight: 1.55 }}>
                          Select a client from the roster to begin their session
                        </p>
                      </div>
                    </div>
                  )
                ) : (
                  <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                    {formError && (
                      <div style={{ background: '#FEF2F2', border: '0.5px solid #FECACA', color: '#DC2626', borderRadius: 10, padding: '9px 13px', fontSize: '0.825rem', fontWeight: 500 }}>
                        {formError}
                      </div>
                    )}
                    <div>
                      <label style={{ display: 'block', marginBottom: 5, fontSize: '0.68rem', fontWeight: 700, color: '#4A4744', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Client name *</label>
                      <input required type="text" placeholder="Full name" value={name} onChange={e => setName(e.target.value)} style={inp} onFocus={focIn} onBlur={focOut} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: 5, fontSize: '0.68rem', fontWeight: 700, color: '#4A4744', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Age</label>
                        <input type="number" placeholder="Age" value={age} onChange={e => setAge(e.target.value)} style={inp} onFocus={focIn} onBlur={focOut} />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: 5, fontSize: '0.68rem', fontWeight: 700, color: '#4A4744', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Gender</label>
                        <select value={gender} onChange={e => setGender(e.target.value)} style={{ ...inp, cursor: 'pointer' }} onFocus={focIn} onBlur={focOut}>
                          <option value="">Select</option>
                          <option>Male</option><option>Female</option><option>Non-binary</option><option>Prefer not to say</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: 5, fontSize: '0.68rem', fontWeight: 700, color: '#4A4744', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Presenting problem</label>
                      <textarea placeholder="Describe the presenting problem…" value={complaint} onChange={e => setComplaint(e.target.value)} rows={2} style={{ ...inp, resize: 'none' }} onFocus={focIn} onBlur={focOut} />
                    </div>
                    <button type="button" onClick={() => setExtended(!extended)}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 10px', borderRadius: 9, border: '0.5px solid #E2DDD5', background: '#F7F5F0', cursor: 'pointer', width: '100%' }}>
                      <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#4A4744', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Extended intake</span>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8B8680" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: extended ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                        <path d={I.down} />
                      </svg>
                    </button>
                    {extended && (
                      <div style={{ background: '#F7F5F0', border: '0.5px solid #E2DDD5', borderRadius: 10, padding: '12px' }}>
                        <label style={{ display: 'block', marginBottom: 5, fontSize: '0.68rem', fontWeight: 700, color: '#4A4744', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Referral source</label>
                        <input type="text" placeholder="e.g. GP, self-referred, IAPT" value={referral} onChange={e => setReferral(e.target.value)} style={inp} onFocus={focIn} onBlur={focOut} />
                      </div>
                    )}
                    <button type="submit" disabled={isPending || !name}
                      style={{
                        marginTop: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        padding: '11px', borderRadius: 12, border: 'none', fontWeight: 700, fontSize: '0.9rem',
                        cursor: isPending || !name ? 'not-allowed' : 'pointer',
                        background: isPending || !name ? '#E2DDD5' : '#2D6A4F',
                        color: isPending || !name ? '#8B8680' : '#fff',
                        transition: 'all 0.15s', fontFamily: 'Inter, system-ui, sans-serif',
                      }}>
                      <Ico d={isPending ? I.spin : I.plus} size={15} color={isPending || !name ? '#8B8680' : '#fff'} />
                      {isPending ? 'Adding…' : 'Add client'}
                    </button>
                  </form>
                )}
              </div>
            </div>

            {/* Start Session CTA */}
            <button
              onClick={() => selected && router.push(`/session/${selected.id}`)}
              disabled={!selected}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                padding: '15px', borderRadius: 14,
                border: selected ? 'none' : '0.5px solid #E2DDD5',
                fontWeight: 700, fontSize: '1rem',
                cursor: selected ? 'pointer' : 'not-allowed',
                background: selected ? '#2D6A4F' : '#fff',
                color: selected ? '#fff' : '#B8B3AE',
                boxShadow: selected ? '0 4px 18px rgba(45,106,79,0.28)' : 'none',
                transition: 'all 0.2s', fontFamily: 'Inter, system-ui, sans-serif',
              }}
              onMouseEnter={e => { if (selected) { e.currentTarget.style.background = '#1B4332'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(45,106,79,0.35)' } }}
              onMouseLeave={e => { if (selected) { e.currentTarget.style.background = '#2D6A4F'; e.currentTarget.style.boxShadow = '0 4px 18px rgba(45,106,79,0.28)' } }}
            >
              <Ico d={I.mic} size={18} color={selected ? '#fff' : '#B8B3AE'} />
              Start Session
              <Ico d={I.arrow} size={16} color={selected ? '#fff' : '#B8B3AE'} />
            </button>
            <p style={{ textAlign: 'center', marginTop: -6, fontSize: '0.775rem', color: '#8B8680' }}>
              {selected ? `Starting session for ${selected.name}` : 'Select or add a client first'}
            </p>

            {/* Action Centre */}
            <div style={{ background: '#fff', border: '0.5px solid #E2DDD5', borderRadius: 18, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              <div style={{ padding: '11px 18px', borderBottom: '0.5px solid #F0EDE6', background: '#F7F5F0', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Ico d={I.activity} size={13} color="#2D6A4F" />
                <span style={{ fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#4A4744' }}>
                  Action Centre
                </span>
              </div>
              <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {/* Risk status */}
                {(stats.recentRiskAlerts ?? 0) > 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px', borderRadius: 12, background: '#FEF2F2', border: '0.5px solid #FED7D7' }}>
                    <div style={{ width: 34, height: 34, borderRadius: 9, background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Ico d={I.warn} size={15} color="#DC2626" />
                    </div>
                    <div>
                      <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#DC2626', letterSpacing: '0.04em' }}>Risk alerts</p>
                      <p style={{ fontSize: '0.825rem', fontWeight: 500, color: '#9B2C2C', marginTop: 1 }}>
                        {stats.recentRiskAlerts} case{(stats.recentRiskAlerts ?? 0) > 1 ? 's' : ''} flagged
                      </p>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px', borderRadius: 12, background: '#F7F5F0', border: '0.5px solid #F0EDE6' }}>
                    <div style={{ width: 34, height: 34, borderRadius: 9, background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Ico d={I.check} size={15} color="#059669" />
                    </div>
                    <div>
                      <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#059669', letterSpacing: '0.04em' }}>All clear</p>
                      <p style={{ fontSize: '0.8rem', color: '#8B8680', marginTop: 1 }}>No acute risks this week</p>
                    </div>
                  </div>
                )}

                {/* Schedule */}
                <div>
                  <p style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#B8B3AE', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Ico d={I.clock} size={11} color="#B8B3AE" />
                    Today&apos;s schedule
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {stats.upcomingAppointments && stats.upcomingAppointments.length > 0 ? (
                      stats.upcomingAppointments.map(apt => (
                        <div key={apt.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: '#F7F5F0', border: '0.5px solid #F0EDE6' }}>
                          <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '5px 8px', borderRadius: 8, color: '#2D6A4F', background: '#fff', border: '0.5px solid #E2DDD5', whiteSpace: 'nowrap' }}>
                            {new Date(apt.requested_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1A1816', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {apt.patients?.name || 'Unknown client'}
                            </p>
                            <p style={{ fontSize: '0.75rem', color: '#8B8680', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{apt.reason || 'General session'}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div style={{ padding: '18px 0', textAlign: 'center', borderRadius: 12, background: '#F7F5F0', border: '0.5px dashed #E2DDD5' }}>
                        <Ico d={I.cal} size={20} color="#B8B3AE" />
                        <p style={{ fontSize: '0.8rem', color: '#8B8680', marginTop: 7 }}>No appointments today</p>
                      </div>
                    )}
                    <Link href="/dashboard/appointments" style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      padding: '10px', borderRadius: 12, textDecoration: 'none',
                      fontSize: '0.825rem', fontWeight: 600, color: '#2D6A4F',
                      background: '#D8EDDF', border: '0.5px solid #74C69D30',
                    }}>
                      <Ico d={I.cal} size={13} color="#2D6A4F" />
                      Appointment manager
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
