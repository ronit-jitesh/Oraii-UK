import { createServerClient, getTherapistId } from '../../utils/supabase/server'
import Dashboard from '../../components/Dashboard'

async function getData() {
  const supabase    = await createServerClient()
  const therapistId = await getTherapistId(supabase)

  // ── Patients — only columns that ACTUALLY EXIST in the schema ──
  const patientQuery = supabase
    .from('patients')
    .select('id, display_label, primary_complaint, referral_source, age, gender, consent_given, created_at')
    .order('created_at', { ascending: false })

  const { data: patients, error: patErr } = therapistId
    ? await patientQuery.eq('therapist_id', therapistId)
    : await patientQuery

  if (patErr) console.error('[dashboard] patients error:', patErr.message)

  // ── Sessions today ──
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date(todayStart.getTime() + 86400000)

  const sessionQuery = supabase
    .from('sessions')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', todayStart.toISOString())

  const { count: sessionsToday } = therapistId
    ? await sessionQuery.eq('therapist_id', therapistId)
    : await sessionQuery

  // ── Appointments today ──
  const apptQuery = supabase
    .from('appointments')
    .select('id, requested_time, reason, status')
    .gte('requested_time', todayStart.toISOString())
    .lt('requested_time', todayEnd.toISOString())
    .order('requested_time', { ascending: true })
    .limit(5)

  const { data: appointments } = therapistId
    ? await apptQuery.eq('therapist_id', therapistId)
    : await apptQuery

  // ── Risk alerts (last 7 days) ──
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString()
  const riskQuery = supabase
    .from('cssrs_assessments')
    .select('*', { count: 'exact', head: true })
    .in('clinician_risk_level', ['moderate', 'high', 'imminent'])
    .gte('assessed_at', sevenDaysAgo)

  const { count: riskAlerts } = therapistId
    ? await riskQuery.eq('therapist_id', therapistId)
    : await riskQuery

  // ── Map to component shape ──
  const mappedPatients = (patients || []).map((p: any) => ({
    id:                p.id,
    name:              p.display_label || 'Unnamed client',
    age:               p.age,
    gender:            p.gender,
    primary_complaint: p.primary_complaint || '',
    referral_source:   p.referral_source || '',
    status:            p.consent_given ? 'active' : 'pending',
  }))

  const mappedAppointments = (appointments || []).map((a: any) => ({
    id:             a.id,
    requested_time: a.requested_time,
    reason:         a.reason,
    status:         a.status,
    patients:       null,
  }))

  return {
    patients:      mappedPatients,
    therapistId,
    therapistName: undefined as string | undefined,
    stats: {
      totalPatients:        mappedPatients.length,
      sessionsToday:        sessionsToday || 0,
      upcomingAppointments: mappedAppointments,
      recentRiskAlerts:     riskAlerts || 0,
    },
  }
}

export default async function DashboardPage() {
  let data
  try {
    data = await getData()
  } catch (e) {
    console.error('[DashboardPage] error:', e)
    data = {
      patients:      [],
      therapistId:   null,
      therapistName: undefined,
      stats: { totalPatients: 0, sessionsToday: 0, upcomingAppointments: [], recentRiskAlerts: 0 },
    }
  }
  return (
    <Dashboard
      initialPatients={data.patients}
      stats={data.stats}
      therapistName={data.therapistName}
    />
  )
}
