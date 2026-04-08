// utils/audit.ts
// UK-GDPR Article 30 — Records of Processing Activities
// Every read/write of clinical data must be logged here.
// Called from server actions only — never from client components.

import { createClient } from '@supabase/supabase-js'

function getSvc() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export type AuditAction =
  | 'patient.created'
  | 'patient.viewed'
  | 'patient.consent_updated'
  | 'session.created'
  | 'session.viewed'
  | 'clinical_note.created'
  | 'clinical_note.approved'
  | 'clinical_note.edited'
  | 'cssrs.created'
  | 'cssrs.viewed'
  | 'outcome_score.created'
  | 'outcome_score.viewed'
  | 'safety_plan.created'
  | 'appointment.created'
  | 'gp_letter.created'
  | 'transcript_risk_flag.created'

export async function auditLog(params: {
  therapistId: string | null
  patientId?:  string | null
  action:      AuditAction
  resourceType: string
  resourceId?:  string | null
  metadata?:    Record<string, any>
}) {
  try {
    const svc = getSvc()
    await svc.from('audit_log').insert({
      therapist_id:  params.therapistId,
      patient_id:    params.patientId   || null,
      action:        params.action,
      resource_type: params.resourceType,
      resource_id:   params.resourceId  || null,
      metadata:      params.metadata    || {},
      created_at:    new Date().toISOString(),
    })
  } catch (e) {
    // Audit log failure must never break the main flow
    console.error('[audit] failed to write log:', e instanceof Error ? e.message : e)
  }
}
