import { createServerClient, getTherapistId } from '../../../utils/supabase/server'
import NoteCard from './NoteCard'

export default async function NotesPage() {
  let notes: any[] = []
  try {
    const supabase    = await createServerClient()
    const therapistId = await getTherapistId(supabase)

    const query = supabase
      .from('clinical_notes')
      .select('id, created_at, format, content, ai_generated, therapist_reviewed, patient_id, patients(display_label)')
      .order('created_at', { ascending: false })
      .limit(50)

    const { data } = therapistId
      ? await query.eq('therapist_id', therapistId)
      : await query

    notes = (data || []).map((n: any) => ({
      id:          n.id,
      date:        n.created_at,
      format:      n.format,
      content:     n.content,
      aiGenerated: n.ai_generated,
      reviewed:    n.therapist_reviewed,
      patientName: n.patients?.display_label || 'Unknown client',
      patientId:   n.patient_id,
    }))
  } catch { /* tables may not exist yet */ }

  const pending  = notes.filter(n => n.aiGenerated && !n.reviewed)
  const approved = notes.filter(n => n.reviewed)

  return (
    <div style={{ padding: '2rem 2.5rem 3rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontFamily: 'Lora, Georgia, serif', fontSize: '1.5rem', fontWeight: 700, color: '#1A1816', letterSpacing: '-0.02em', marginBottom: 5 }}>
          Clinical Notes
        </h1>
        <p style={{ color: '#8B8680', fontSize: '0.9rem' }}>AI-generated drafts — review, edit, and approve before treating as clinical records</p>
      </div>

      <div style={{ background: '#FFFBEB', border: '0.5px solid rgba(217,119,6,0.25)', borderRadius: 14, padding: '14px 18px', marginBottom: '1.75rem', display: 'flex', alignItems: 'flex-start', gap: 12, fontSize: '0.875rem', color: '#78350F', lineHeight: 1.55 }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
          <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <p><strong>Clinical governance:</strong> All AI-generated notes must be reviewed, edited if needed, and approved by you before treating as clinical records.</p>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: '1.75rem', flexWrap: 'wrap' }}>
        {[
          { label: 'Total notes',     value: notes.length,   color: '#1A1816', bg: '#fff',    border: '#E2DDD5' },
          { label: 'Awaiting review', value: pending.length, color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
          { label: 'Approved',        value: approved.length,color: '#059669', bg: '#ECFDF5', border: '#6EE7B7' },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, border: `0.5px solid ${s.border}`, borderRadius: 14, padding: '14px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ fontFamily: 'Lora, Georgia, serif', fontSize: '1.75rem', fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#8B8680', textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {notes.length === 0 ? (
        <div style={{ background: '#fff', border: '0.5px solid #E2DDD5', borderRadius: 18, padding: '4rem', textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#F0EDE6', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', border: '0.5px solid #E2DDD5' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#B8B3AE" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p style={{ fontWeight: 700, fontSize: '1rem', color: '#1A1816', marginBottom: 6 }}>No notes yet</p>
          <p style={{ color: '#8B8680', fontSize: '0.875rem' }}>Notes are generated and saved during sessions</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {notes.map(note => <NoteCard key={note.id} note={note} />)}
        </div>
      )}
    </div>
  )
}
