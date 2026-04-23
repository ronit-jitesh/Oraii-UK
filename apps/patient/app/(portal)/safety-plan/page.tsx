'use client'
import { useState, useEffect } from 'react'
import { getMySafetyPlan, saveSelfSafetyPlan } from '../../actions'

const CRISIS_LINES = [
  { name: 'Samaritans',        contact: '116 123',             note: 'free · 24/7 · confidential', href: 'tel:116123',        color: '#DC2626' },
  { name: 'NHS Mental Health',  contact: '111 option 2',        note: '24/7',                       href: 'tel:111',           color: '#B91C1C' },
  { name: 'Crisis Text Line',   contact: 'Text SHOUT to 85258', note: 'free · 24/7',                href: 'sms:85258?body=SHOUT', color: '#EF4444' },
  { name: 'Emergency Services', contact: '999',                 note: 'immediate danger',            href: 'tel:999',           color: '#991B1B' },
]

const SPI_META = [
  { step: 1, title: 'Warning signs',                    icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',         desc: 'Thoughts, images, feelings or situations that signal a crisis may be coming' },
  { step: 2, title: 'Internal coping strategies',        icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z',               desc: 'Things you can do on your own to take your mind off the crisis' },
  { step: 3, title: 'People and places for distraction', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z', desc: 'Social contacts and places to take your mind off things' },
  { step: 4, title: 'People I can ask for help',         icon: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z',                                                       desc: 'People you trust who can help you stay safe' },
  { step: 5, title: 'Professionals and agencies',        icon: 'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z', desc: 'Your therapist, GP, crisis line, emergency services' },
  { step: 6, title: 'Making my environment safer',       icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', desc: 'Steps to reduce access to means during a crisis' },
]

interface SafetyPlan {
  warning_signs: string[]
  internal_coping_strategies: string[]
  social_contacts_distraction: { name: string; phone?: string }[]
  crisis_contacts: { name: string; phone?: string; relationship?: string }[]
  professional_contacts: { name: string; phone?: string; availability?: string }[]
  means_restriction: string[]
  version: number
  updated_at: string
  self_created?: boolean
}

type StringListField = 'warning_signs' | 'internal_coping_strategies' | 'means_restriction'
type ContactListField = 'social_contacts_distraction' | 'crisis_contacts' | 'professional_contacts'

const EMPTY_PLAN: Omit<SafetyPlan, 'version' | 'updated_at'> = {
  warning_signs: [],
  internal_coping_strategies: [],
  social_contacts_distraction: [],
  crisis_contacts: [],
  professional_contacts: [],
  means_restriction: [],
}

function Ico({ d, size = 16, color = 'currentColor' }: { d: string; size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
}

// String list editor (warning signs, coping strategies, means restriction)
function StringListEditor({ value, onChange, placeholder }: {
  value: string[]
  onChange: (v: string[]) => void
  placeholder: string
}) {
  const [draft, setDraft] = useState('')
  const add = () => {
    const t = draft.trim()
    if (!t) return
    onChange([...value, t])
    setDraft('')
  }
  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
        {value.map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F7F5F0', borderRadius: 10, padding: '6px 10px' }}>
            <span style={{ flex: 1, fontSize: '0.82rem', color: 'var(--text-2)' }}>{item}</span>
            <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, opacity: 0.5 }}>
              <Ico d="M6 18L18 6M6 6l12 12" size={12} color="var(--danger)" />
            </button>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <input type="text" value={draft} onChange={e => setDraft(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), add())}
          placeholder={placeholder} className="p-input"
          style={{ flex: 1, fontSize: '0.82rem', padding: '0.5rem 0.75rem', borderRadius: 10 }}
        />
        <button type="button" onClick={add} disabled={!draft.trim()}
          className="p-btn p-btn-primary" style={{ padding: '0.5rem 0.875rem', borderRadius: 10, fontSize: '0.82rem' }}>
          Add
        </button>
      </div>
    </div>
  )
}

// Contact editor (name + phone)
function ContactEditor({ value, onChange, showRelationship, showAvailability }: {
  value: { name: string; phone?: string; relationship?: string; availability?: string }[]
  onChange: (v: typeof value) => void
  showRelationship?: boolean
  showAvailability?: boolean
}) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [rel, setRel] = useState('')
  const [avail, setAvail] = useState('')

  const add = () => {
    if (!name.trim()) return
    onChange([...value, {
      name: name.trim(),
      phone: phone.trim() || undefined,
      relationship: showRelationship && rel.trim() ? rel.trim() : undefined,
      availability: showAvailability && avail.trim() ? avail.trim() : undefined,
    }])
    setName(''); setPhone(''); setRel(''); setAvail('')
  }

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
        {value.map((contact, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#F7F5F0', borderRadius: 10, padding: '8px 12px' }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)' }}>{contact.name}</p>
              {contact.phone && <p style={{ fontSize: '0.72rem', color: 'var(--primary)' }}>{contact.phone}</p>}
              {contact.relationship && <p style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>{contact.relationship}</p>}
              {contact.availability && <p style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>{contact.availability}</p>}
            </div>
            <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, opacity: 0.5 }}>
              <Ico d="M6 18L18 6M6 6l12 12" size={12} color="var(--danger)" />
            </button>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <input type="text" value={name} onChange={e => setName(e.target.value)}
          placeholder="Name *" className="p-input"
          style={{ fontSize: '0.82rem', padding: '0.5rem 0.75rem', borderRadius: 10 }}
        />
        <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
          placeholder="Phone number" className="p-input"
          style={{ fontSize: '0.82rem', padding: '0.5rem 0.75rem', borderRadius: 10 }}
        />
        {showRelationship && (
          <input type="text" value={rel} onChange={e => setRel(e.target.value)}
            placeholder="Relationship (e.g. friend, sister)" className="p-input"
            style={{ fontSize: '0.82rem', padding: '0.5rem 0.75rem', borderRadius: 10 }}
          />
        )}
        {showAvailability && (
          <input type="text" value={avail} onChange={e => setAvail(e.target.value)}
            placeholder="Availability (e.g. Mon–Fri 9–5)" className="p-input"
            style={{ fontSize: '0.82rem', padding: '0.5rem 0.75rem', borderRadius: 10 }}
          />
        )}
        <button type="button" onClick={add} disabled={!name.trim()}
          className="p-btn p-btn-primary" style={{ padding: '0.5rem', borderRadius: 10, fontSize: '0.82rem' }}>
          Add contact
        </button>
      </div>
    </div>
  )
}

export default function SafetyPlanPage() {
  const [plan, setPlan] = useState<SafetyPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<typeof EMPTY_PLAN>(EMPTY_PLAN)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    getMySafetyPlan().then(data => {
      setPlan(data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const startEdit = () => {
    setDraft(plan ? {
      warning_signs: plan.warning_signs || [],
      internal_coping_strategies: plan.internal_coping_strategies || [],
      social_contacts_distraction: plan.social_contacts_distraction || [],
      crisis_contacts: plan.crisis_contacts || [],
      professional_contacts: plan.professional_contacts || [],
      means_restriction: plan.means_restriction || [],
    } : EMPTY_PLAN)
    setEditing(true)
    setSaved(false)
  }

  const handleSave = async () => {
    setSaving(true)
    const result = await saveSelfSafetyPlan(draft)
    if (!result.error) {
      const fresh = await getMySafetyPlan()
      setPlan(fresh)
      setSaved(true)
      setEditing(false)
      setTimeout(() => setSaved(false), 3000)
    }
    setSaving(false)
  }

  const getPlanData = (step: number) => {
    if (!plan) return []
    switch (step) {
      case 1: return plan.warning_signs || []
      case 2: return plan.internal_coping_strategies || []
      case 3: return plan.social_contacts_distraction || []
      case 4: return plan.crisis_contacts || []
      case 5: return plan.professional_contacts || []
      case 6: return plan.means_restriction || []
      default: return []
    }
  }

  const renderItems = (step: number) => {
    const items = getPlanData(step)
    if (!items || items.length === 0) {
      return (
        <div style={{ background: '#FAFAF8', borderRadius: 12, padding: '14px 16px', border: '1px dashed var(--border)' }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--muted)', fontStyle: 'italic' }}>
            Not filled in yet.{' '}
            <button type="button" onClick={startEdit}
              style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.8rem', textDecoration: 'underline', padding: 0, fontStyle: 'normal' }}>
              Fill in yourself →
            </button>
          </p>
        </div>
      )
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {items.map((item, i) => {
          if (typeof item === 'string') {
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 12px', background: '#F7F5F0', borderRadius: 10 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary)', flexShrink: 0, marginTop: 6 }} />
                <span style={{ fontSize: '0.85rem', color: 'var(--text-2)', lineHeight: 1.5 }}>{item}</span>
              </div>
            )
          }
          const contact = item as { name: string; phone?: string; relationship?: string; availability?: string }
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: '#F7F5F0', borderRadius: 12, border: '0.5px solid var(--border)' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Ico d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" size={16} color="var(--primary)" />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)' }}>{contact.name}</p>
                {contact.phone && (
                  <a href={`tel:${contact.phone.replace(/\s/g, '')}`}
                    style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 500, textDecoration: 'none' }}>
                    {contact.phone}
                  </a>
                )}
                {contact.relationship && <p style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>{contact.relationship}</p>}
                {contact.availability && <p style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>{contact.availability}</p>}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const renderEditField = (step: number) => {
    switch (step) {
      case 1:
        return <StringListEditor value={draft.warning_signs} onChange={v => setDraft(d => ({ ...d, warning_signs: v }))} placeholder="e.g. Racing thoughts, feeling hopeless, withdrawing" />
      case 2:
        return <StringListEditor value={draft.internal_coping_strategies} onChange={v => setDraft(d => ({ ...d, internal_coping_strategies: v }))} placeholder="e.g. Breathing exercises, going for a walk, listening to music" />
      case 3:
        return <ContactEditor value={draft.social_contacts_distraction} onChange={v => setDraft(d => ({ ...d, social_contacts_distraction: v }))} />
      case 4:
        return <ContactEditor value={draft.crisis_contacts} onChange={v => setDraft(d => ({ ...d, crisis_contacts: v }))} showRelationship />
      case 5:
        return <ContactEditor value={draft.professional_contacts} onChange={v => setDraft(d => ({ ...d, professional_contacts: v }))} showAvailability />
      case 6:
        return <StringListEditor value={draft.means_restriction} onChange={v => setDraft(d => ({ ...d, means_restriction: v }))} placeholder="e.g. Removed medication from easy access, asked friend to hold keys" />
      default:
        return null
    }
  }

  return (
    <div className="portal-page">
      {/* Header */}
      <div className="anim-fade-up" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontFamily: 'Lora, Georgia, serif', fontSize: '1.5rem', fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.02em', marginBottom: 4 }}>
              My safety plan
            </h1>
            <p style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>
              {plan?.self_created ? 'Your personal safety plan' : 'Fill this in yourself or complete it with your therapist.'}
            </p>
          </div>
          {!editing && (
            <button type="button" onClick={startEdit}
              className="p-btn p-btn-ghost"
              style={{ fontSize: '0.8rem', padding: '0.5rem 0.875rem', borderRadius: 12, flexShrink: 0 }}>
              {plan ? '✏️ Edit' : '+ Create mine'}
            </button>
          )}
        </div>
        {saved && (
          <div style={{ marginTop: 8, background: 'var(--light)', border: '0.5px solid rgba(45,106,79,0.2)', borderRadius: 10, padding: '6px 12px', fontSize: '0.8rem', color: 'var(--primary-dk)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            ✓ Safety plan saved
          </div>
        )}
      </div>

      {/* Crisis resources — ALWAYS first, ALWAYS visible */}
      <div className="anim-fade-up d1" style={{
        background: 'linear-gradient(135deg, #FEF2F2 0%, #FFF5F5 100%)',
        border: '1px solid rgba(220,38,38,0.2)',
        borderRadius: 20,
        padding: '18px 20px',
        marginBottom: '1.5rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Ico d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" size={16} color="#DC2626" />
          </div>
          <div>
            <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#991B1B' }}>If you are in crisis right now</p>
            <p style={{ fontSize: '0.75rem', color: '#B91C1C' }}>Contact one of these immediately</p>
          </div>
        </div>
        <div style={{ display: 'grid', gap: 8 }}>
          {CRISIS_LINES.map(r => (
            <a key={r.name} href={r.href} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 14px', background: 'rgba(255,255,255,0.8)', borderRadius: 12,
              border: '0.5px solid rgba(220,38,38,0.1)', textDecoration: 'none',
              transition: 'background 0.15s',
            }}>
              <div>
                <p style={{ fontSize: '0.8rem', fontWeight: 700, color: '#991B1B' }}>{r.name}</p>
                {r.note && <p style={{ fontSize: '0.65rem', color: '#EF4444' }}>{r.note}</p>}
              </div>
              <span style={{
                fontSize: '0.85rem', fontWeight: 700, color: '#DC2626',
                padding: '4px 12px', background: '#FEE2E2', borderRadius: 8,
                fontFamily: 'monospace',
              }}>
                {r.contact}
              </span>
            </a>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite', display: 'inline-block', marginRight: 8 }}><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
          Loading your safety plan...
        </div>
      ) : (
        <>
          {/* 6 SPI components */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: '1.5rem' }}>
            {SPI_META.map((c, idx) => (
              <div key={c.step} className={`anim-fade-up d${idx + 2}`} style={{
                background: 'var(--surface)',
                border: '0.5px solid var(--border)',
                borderRadius: 20,
                padding: '18px 20px',
                boxShadow: 'var(--shadow)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: 10,
                    background: 'var(--light)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--primary-dk)' }}>{c.step}</span>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text)' }}>{c.title}</p>
                    <p style={{ fontSize: '0.72rem', color: 'var(--muted)', lineHeight: 1.4 }}>{c.desc}</p>
                  </div>
                </div>
                {editing ? renderEditField(c.step) : renderItems(c.step)}
              </div>
            ))}
          </div>

          {/* Edit mode save/cancel */}
          {editing && (
            <div style={{ display: 'flex', gap: '0.625rem', marginBottom: '1.5rem' }}>
              <button type="button" onClick={() => setEditing(false)} className="p-btn p-btn-ghost" style={{ flex: 1, borderRadius: 14 }}>
                Cancel
              </button>
              <button type="button" onClick={handleSave} disabled={saving} className="p-btn p-btn-primary" style={{ flex: 2, borderRadius: 14, padding: '0.875rem' }}>
                {saving ? 'Saving...' : 'Save safety plan'}
              </button>
            </div>
          )}

          {/* Plan metadata */}
          {plan && !editing && (
            <div className="anim-fade-up d8" style={{ textAlign: 'center', marginBottom: '0.75rem' }}>
              <p style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
                Version {plan.version || 1} · Last updated {new Date(plan.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                {plan.self_created && ' · Created by you'}
              </p>
            </div>
          )}
        </>
      )}

      <p style={{ fontSize: '0.7rem', color: 'var(--border-dk)', textAlign: 'center', marginTop: '1rem', lineHeight: 1.5 }}>
        Based on the Stanley-Brown Safety Planning Intervention (SPI) — evidence-based<br />
        crisis support developed for use alongside professional mental health care.
      </p>
    </div>
  )
}
