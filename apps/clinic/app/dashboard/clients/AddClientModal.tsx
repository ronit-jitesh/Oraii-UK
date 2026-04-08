'use client'
import { useState } from 'react'
import { createSupabaseClient } from '@oraii/core/auth'

interface Props {
  onClose: () => void
  onAdded: (client: { id: string; name: string; status: string; createdAt: string }) => void
}

export default function AddClientModal({ onClose, onAdded }: Props) {
  const [label, setLabel]     = useState('')
  const [consent, setConsent] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const handleSave = async () => {
    if (!label.trim()) { setError('A client label is required.'); return }
    setSaving(true); setError(null)
    try {
      const supabase = createSupabaseClient()

      // Get current user from the cookie-based session
      const { data: { user }, error: authErr } = await supabase.auth.getUser()
      if (authErr || !user) throw new Error('Not signed in. Please refresh and log in again.')

      // Find this user's therapist row
      const { data: therapist, error: thErr } = await supabase
        .from('therapists')
        .select('id')
        .eq('auth_user_id', user.id)
        .single()

      if (thErr || !therapist?.id) {
        // Auto-create therapist row if missing
        const { data: created, error: createErr } = await supabase
          .from('therapists')
          .insert({
            auth_user_id:        user.id,
            email:               user.email,
            full_name:           user.user_metadata?.full_name || user.email?.split('@')[0] || 'Therapist',
            professional_body:   'BACP',
            registration_number: `AUTO-${user.id.slice(0, 8).toUpperCase()}`,
            specialisms:         [],
          })
          .select('id')
          .single()
        if (createErr || !created?.id) throw new Error('Could not create therapist profile.')
        var therapistId = created.id
      } else {
        var therapistId = therapist.id
      }

      // Insert patient
      const { data: patient, error: pErr } = await supabase
        .from('patients')
        .insert({
          therapist_id:    therapistId,
          display_label:   label.trim(),
          consent_given:   consent,
          consent_date:    consent ? new Date().toISOString() : null,
          consent_version: consent ? 'v1' : null,
        })
        .select('id, display_label, consent_given, created_at')
        .single()

      if (pErr) throw pErr

      onAdded({
        id:        patient.id,
        name:      patient.display_label,
        status:    patient.consent_given ? 'active' : 'pending consent',
        createdAt: patient.created_at,
      })
      onClose()
    } catch (e: any) {
      setError(e?.message || 'Failed to add client.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 20, padding: '28px 28px 24px', width: '100%', maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontFamily: 'Lora, Georgia, serif', fontSize: '1.25rem', fontWeight: 700, color: '#1A1816' }}>Add new client</h2>
            <p style={{ fontSize: '0.8rem', color: '#8B8680', marginTop: 3 }}>Pseudonymous label only — no real names stored</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: '#8B8680' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <div style={{ background: '#EFF6FF', border: '0.5px solid #BFDBFE', borderRadius: 12, padding: '12px 16px', marginBottom: 20, fontSize: '0.82rem', color: '#1E3A8A', lineHeight: 1.55 }}>
          <strong>UK-GDPR:</strong> Use a pseudonymous label (e.g. "Client A"). Never enter the client's real name.
        </div>

        <div style={{ marginBottom: 18 }}>
          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#4A4744', marginBottom: 7 }}>Client label</label>
          <input
            type="text" value={label}
            onChange={e => setLabel(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !saving && handleSave()}
            placeholder="e.g. Client A, Ref-2024-001"
            maxLength={80} autoFocus
            style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: `1.5px solid ${label ? '#2D6A4F' : '#E2DDD5'}`, fontSize: '0.9rem', fontFamily: 'Inter, system-ui, sans-serif', color: '#1A1816', background: '#F7F5F0', outline: 'none', boxSizing: 'border-box' as const }}
          />
        </div>

        <div style={{ background: '#F7F5F0', border: '0.5px solid #E2DDD5', borderRadius: 12, padding: '16px', marginBottom: 20 }}>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer' }}>
            <input
              type="checkbox" checked={consent}
              onChange={e => setConsent(e.target.checked)}
              style={{ width: 18, height: 18, marginTop: 2, accentColor: '#2D6A4F', cursor: 'pointer', flexShrink: 0 }}
            />
            <div>
              <p style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1A1816' }}>Informed consent collected</p>
              <p style={{ fontSize: '0.78rem', color: '#8B8680', marginTop: 5, lineHeight: 1.5 }}>
                Client has been informed about ORAII, data processing, and their UK-GDPR rights.
              </p>
              {consent
                ? <p style={{ fontSize: '0.75rem', color: '#059669', marginTop: 6, fontWeight: 600 }}>✓ Consent date: {new Date().toLocaleDateString('en-GB')}</p>
                : <p style={{ fontSize: '0.75rem', color: '#D97706', marginTop: 6 }}>Without consent, risk screening and outcome scores cannot be saved.</p>
              }
            </div>
          </label>
        </div>

        {error && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '12px 14px', color: '#991B1B', fontSize: '0.875rem', marginBottom: 16 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '12px', background: '#F7F5F0', color: '#4A4744', border: '0.5px solid #E2DDD5', borderRadius: 12, fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'Inter, system-ui, sans-serif' }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving || !label.trim()}
            style={{ flex: 2, padding: '12px', background: label.trim() && !saving ? '#2D6A4F' : '#F0EDE6', color: label.trim() && !saving ? '#fff' : '#8B8680', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: '0.9rem', cursor: label.trim() && !saving ? 'pointer' : 'not-allowed', fontFamily: 'Inter, system-ui, sans-serif' }}>
            {saving ? 'Adding...' : 'Add client'}
          </button>
        </div>
      </div>
    </div>
  )
}
