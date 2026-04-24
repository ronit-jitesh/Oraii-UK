import { createServerClient, getTherapistId } from '../../../../utils/supabase/server'
import ClientProfile from './ClientProfile'
import { notFound } from 'next/navigation'
import { listTriageFlags } from '../../../actions'

export default async function ClientProfilePage({ params }: { params: { id: string } }) {
  const sb          = await createServerClient()
  const therapistId = await getTherapistId(sb)

  // Fetch patient — and verify it belongs to THIS therapist
  // If therapist_id doesn't match, treat as not found (ownership check)
  const patientQuery = sb
    .from('patients')
    .select('id, display_label, consent_given, consent_date, created_at')
    .eq('id', params.id)

  // Enforce ownership — therapist can only view their own clients
  const { data: patient } = therapistId
    ? await patientQuery.eq('therapist_id', therapistId).single()
    : await patientQuery.single()

  if (!patient) notFound()

  const triageRes = await listTriageFlags({ includeResolved: true, patientId: params.id })

  const [riskRes, outcomeRes, sessionRes, safetyRes] = await Promise.all([
    sb.from('cssrs_assessments')
      .select('id, assessed_at, clinician_risk_level, clinician_notes, supervisor_notified, supervisor_notified_at, wish_to_be_dead, passive_suicidal_ideation, ideation_with_method, ideation_with_intent_no_plan, ideation_with_intent_and_plan, preparatory_behaviour, interrupted_attempt')
      .eq('patient_id', params.id)
      .order('assessed_at', { ascending: false })
      .limit(20),

    sb.from('outcome_scores')
      .select('id, instrument, score, severity, administered_at')
      .eq('patient_id', params.id)
      .order('administered_at', { ascending: true })
      .limit(30),

    sb.from('sessions')
      .select('id, session_date, status, note_format, duration_minutes')
      .eq('patient_id', params.id)
      .order('session_date', { ascending: false })
      .limit(10),

    sb.from('safety_plans')
      .select('id, created_at, warning_signs, internal_coping_strategies, crisis_contacts')
      .eq('patient_id', params.id)
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const outcomeHistory = (outcomeRes.data || []).map((o: any) => ({
    id:           o.id,
    measure:      o.instrument || o.measure || 'PHQ-9',
    score:        o.score,
    severity:     o.severity,
    completed_at: o.administered_at || o.completed_at,
  }))

  const safetyPlans = (safetyRes.data || []).map((sp: any, i: number) => ({
    ...sp,
    version: sp.version || (i + 1),
  }))

  return (
    <ClientProfile
      patient={patient}
      riskHistory={riskRes.data || []}
      outcomeHistory={outcomeHistory}
      sessions={sessionRes.data || []}
      safetyPlans={safetyPlans}
      triageFlags={triageRes.flags}
    />
  )
}
