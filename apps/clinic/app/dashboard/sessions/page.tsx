import { createServerClient, getTherapistId } from '../../../utils/supabase/server'
import SessionsTable from './SessionsTable'

export default async function SessionsPage() {
  let sessions: any[] = []
  try {
    const supabase    = await createServerClient()
    const therapistId = await getTherapistId(supabase)

    const query = supabase
      .from('sessions')
      .select('id, created_at, status, note_format, duration_minutes, patient_id, patients(display_label)')
      .order('created_at', { ascending: false })
      .limit(50)

    const { data } = therapistId
      ? await query.eq('therapist_id', therapistId)
      : await query

    sessions = (data || []).map((s: any) => ({
      id:          s.id,
      date:        s.created_at,
      status:      s.status,
      format:      s.note_format,
      duration:    s.duration_minutes,
      patientName: s.patients?.display_label || 'Unknown client',
    }))
  } catch { /* tables may not exist yet */ }

  return (
    <div style={{ padding: '2rem 2.5rem 3rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontFamily: 'Lora, Georgia, serif', fontSize: '1.5rem', fontWeight: 700, color: '#1A1816', letterSpacing: '-0.02em', marginBottom: 5 }}>
          Sessions
        </h1>
        <p style={{ color: '#8B8680', fontSize: '0.9rem' }}>Your completed therapy sessions</p>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: '1.75rem', flexWrap: 'wrap' }}>
        {[
          { label: 'Total sessions', value: sessions.length },
          { label: 'Completed',      value: sessions.filter(s => s.status === 'complete').length },
          { label: 'This month',     value: sessions.filter(s => new Date(s.date).getMonth() === new Date().getMonth()).length },
        ].map(stat => (
          <div key={stat.label} style={{ background: '#fff', border: '0.5px solid #E2DDD5', borderRadius: 14, padding: '14px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ fontFamily: 'Lora, Georgia, serif', fontSize: '1.75rem', fontWeight: 700, color: '#1A1816', lineHeight: 1 }}>
              {stat.value}
            </div>
            <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#8B8680', textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 4 }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      <SessionsTable sessions={sessions} />
    </div>
  )
}
