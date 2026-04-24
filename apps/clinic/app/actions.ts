'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '../utils/supabase/server'

function getSvc() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function getAuthUser() {
  try {
    const sb = await createServerClient()
    const { data: { user } } = await sb.auth.getUser()
    return user ?? null
  } catch { return null }
}

export async function getOrCreateTherapistId(): Promise<string | null> {
  const user = await getAuthUser()
  if (!user) return null
  const svc = getSvc()
  const { data: existing } = await svc.from('therapists').select('id').eq('auth_user_id', user.id).single()
  if (existing?.id) return existing.id
  const { data: created } = await svc.from('therapists').insert({
    auth_user_id: user.id, email: user.email,
    full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Therapist',
    professional_body: 'BACP', registration_number: `AUTO-${user.id.slice(0,8).toUpperCase()}`, specialisms: [],
  }).select('id').single()
  return created?.id ?? null
}

// ── GAP 2: Audit log — UK-GDPR Article 30 ────────────────────────────────
// Writes a record of every clinical action to audit_log.
// Never throws — audit failure must not block clinical workflow.
export async function writeAuditLog(entry: {
  action: string          // e.g. 'CREATE_PATIENT', 'VIEW_NOTES', 'SAVE_CSSRS'
  resourceType: string    // e.g. 'patient', 'session', 'cssrs_assessment'
  resourceId?: string     // UUID of the affected record
  patientId?: string
  sessionId?: string
  metadata?: Record<string, any>
}) {
  try {
    const svc         = getSvc()
    const therapistId = await getOrCreateTherapistId()
    if (!therapistId) return  // unauthenticated — nothing to log

    await svc.from('audit_log').insert({
      therapist_id:  therapistId,
      patient_id:    entry.patientId   || null,
      action:        entry.action,
      resource_type: entry.resourceType,
      resource_id:   entry.resourceId  || null,
      metadata:      { ...(entry.metadata || {}), ...(entry.sessionId ? { session_id: entry.sessionId } : {}) },
    })
  } catch (e) {
    // Audit failure must never surface to the user or block clinical work
    console.error('[audit]', e instanceof Error ? e.message : e)
  }
}

// ── Update patient consent ────────────────────────────────────────────────
export async function updatePatientConsent(patientId: string, consentGiven: boolean) {
  try {
    const therapistId = await getOrCreateTherapistId()
    if (!therapistId) return { error: 'Not authenticated' }
    const svc = getSvc()
    const { data: patient } = await svc.from('patients').select('id, therapist_id').eq('id', patientId).single()
    if (!patient) return { error: 'Patient not found' }
    if (patient.therapist_id !== therapistId) return { error: 'Not authorised' }
    const { error } = await svc.from('patients').update({
      consent_given:   consentGiven,
      consent_date:    consentGiven ? new Date().toISOString() : null,
      consent_version: consentGiven ? 'v1' : null,
    }).eq('id', patientId)
    if (error) return { error: error.message }

    // Audit
    await writeAuditLog({
      action: consentGiven ? 'CONSENT_GRANTED' : 'CONSENT_WITHDRAWN',
      resourceType: 'patient', resourceId: patientId, patientId,
      metadata: { consent_given: consentGiven },
    })

    revalidatePath(`/dashboard/clients/${patientId}`)
    revalidatePath('/dashboard/clients')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (e) {
    return { error: `Failed: ${e instanceof Error ? e.message : String(e)}` }
  }
}

// ── Create patient ────────────────────────────────────────────────────────
export async function createPatient(input: {
  name: string; age?: number; primaryComplaint?: string
  gender?: string; referralSource?: string; consentGiven?: boolean
}) {
  try {
    const therapistId = await getOrCreateTherapistId()
    if (!therapistId) return { error: 'Auth session missing. Please refresh and try again.' }
    const svc = getSvc()
    const { data: patient, error } = await svc.from('patients').insert({
      display_label:      input.name,
      therapist_id:       therapistId,
      primary_complaint:  input.primaryComplaint || null,
      age:                input.age    || null,
      gender:             input.gender || null,
      referral_source:    input.referralSource || null,
      consent_given:      input.consentGiven ?? false,
      consent_date:       input.consentGiven ? new Date().toISOString() : null,
      consent_version:    input.consentGiven ? 'v1' : null,
    }).select('id, display_label, primary_complaint, age, gender, consent_given, created_at').single()
    if (error) return { error: error.message }

    // Audit
    await writeAuditLog({
      action: 'CREATE_PATIENT', resourceType: 'patient',
      resourceId: patient.id, patientId: patient.id,
      metadata: { label: input.name, consent_given: input.consentGiven ?? false },
    })

    revalidatePath('/dashboard')
    revalidatePath('/dashboard/clients')
    return { success: true, patient: { id: patient.id, name: patient.display_label, age: patient.age, primary_complaint: patient.primary_complaint, consentGiven: patient.consent_given } }
  } catch (e) {
    return { error: `Failed: ${e instanceof Error ? e.message : String(e)}` }
  }
}

export async function getPatients() {
  try {
    const therapistId = await getOrCreateTherapistId()
    if (!therapistId) return { error: 'Not authenticated', patients: [] }
    const svc = getSvc()
    const { data, error } = await svc.from('patients')
      .select('id, display_label, primary_complaint, age, gender, consent_given, created_at')
      .eq('therapist_id', therapistId).order('created_at', { ascending: false })
    if (error) return { error: error.message, patients: [] }

    // Audit view
    await writeAuditLog({ action: 'LIST_PATIENTS', resourceType: 'patient' })

    return { success: true, patients: (data || []).map((p: any) => ({ id: p.id, name: p.display_label, age: p.age, gender: p.gender, primary_complaint: p.primary_complaint, status: p.consent_given ? 'active' : 'pending' })) }
  } catch (e) {
    return { error: `Failed: ${e instanceof Error ? e.message : String(e)}`, patients: [] }
  }
}

import OpenAI from 'openai'
export type NoteFormat = 'soap' | 'dap' | 'birp' | 'girp'

const UK_SYSTEM_PROMPT = `You are a Clinical Documentation Assistant for a UK-registered therapist (BACP/UKCP/BPS/HCPC). Use British English. SPEAKER IDENTIFICATION: THERAPIST opens/closes session, asks clinical questions. CLIENT describes personal experiences. UK STANDARDS: NICE CG90/CG133 · SNOMED CT · MHA 1983 · Samaritans 116 123, NHS 111 option 2. OUTPUT: Valid JSON only.`

const DEMO_SOAP = {
  soapNote: { subjective: "Client reports persistent anxiety and low mood. Waking at 4am with racing heart. Expresses hopelessness. Denies suicidal ideation.", objective: "Presented appropriately. Affect subdued but reactive. Speech coherent. No psychotic features. Eye contact maintained.", assessment: "Anxiety disorder (SNOMED CT: 197480006) with comorbid low mood. Sleep-anxiety cycle. No acute safety risk.", plan: "1. Grounding techniques introduced. 2. GP referral discussed. 3. PHQ-9 next session. 4. Safety plan reviewed — Samaritans 116 123. 5. CBT reframing. Review in one week." },
  dapNote: null, birpNote: null, girpNote: null,
  roleAnalysis: { speaker0Role: "Therapist", speaker1Role: "Client", reasoning: "Speaker 0 leads clinical questioning.", confidenceScore: 0.97 },
  entities: { symptoms: ["Anxiety","Low mood","Early morning waking","Hopelessness"], medications: [], diagnoses: ["Anxiety disorder"], snomedCodes: [{ code: "197480006", display: "Anxiety disorder" }] },
  severity_score: 5,
  riskAssessment: { level: "low", factors: ["Hopelessness","Sleep disruption"], recommendations: ["Safety plan reviewed","GP referral","Weekly PHQ-9"], suicidalIdeation: false, selfHarm: false, substanceUse: false, safeguardingConcern: false }
}

export async function generateClinicalNote(transcript: string, format: NoteFormat = 'soap') {
  if (!transcript || transcript.length < 10) return { error: 'Transcript too short.' }
  if (process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.startsWith('your')) {
    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
      const res = await openai.chat.completions.create({
        model: 'gpt-4o', max_tokens: 2500, temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: UK_SYSTEM_PROMPT }, 
          { role: 'user', content: `Generate a UK ${format.toUpperCase()} clinical note based on the transcript.
CRITICAL: You MUST return a JSON object with a single root key matching the format requested (e.g. "soapNote", "dapNote", "birpNote", or "girpNote").
Example SOAP structure:
{
  "soapNote": {
    "subjective": "...",
    "objective": "...",
    "assessment": "...",
    "plan": "..."
  },
  "riskAssessment": { "level": "low", "factors": [], "suicidalIdeation": false, "selfHarm": false }
}

Transcript:
${transcript}` }
        ],
      })
      return { success: true, data: JSON.parse(res.choices[0]?.message?.content || '{}'), format }
    } catch (e) { console.error('[note] OpenAI:', e instanceof Error ? e.message : e) }
  }
  return { success: true, data: DEMO_SOAP, format, isDemo: true }
}

// ── Save session + note ───────────────────────────────────────────────────
export async function saveSession(data: {
  patientId: string; transcript: string; note: string
  format: NoteFormat; riskLevel?: string; durationMinutes?: number
}) {
  try {
    const svc = getSvc()
    const therapistId = await getOrCreateTherapistId()
    if (!therapistId) return { error: 'Not authenticated' }

    const { data: session, error: sErr } = await svc.from('sessions').insert({
      patient_id:              data.patientId,
      therapist_id:            therapistId,
      note_format:             data.format.toUpperCase(),
      status:                  'complete',
      duration_minutes:        data.durationMinutes || null,
      audio_consent_given:     true,
      audio_consent_timestamp: new Date().toISOString(),
      session_date:            new Date().toISOString().split('T')[0],
    }).select().single()
    if (sErr) return { error: sErr.message }

    await svc.from('clinical_notes').insert({
      session_id:         session.id,
      patient_id:         data.patientId,
      therapist_id:       therapistId,
      format:             data.format.toUpperCase(),
      content:            data.note,
      ai_generated:       true,
      therapist_reviewed: false,
    })

    // Audit
    await writeAuditLog({
      action: 'SAVE_SESSION', resourceType: 'session',
      resourceId: session.id, patientId: data.patientId, sessionId: session.id,
      metadata: { format: data.format, duration: data.durationMinutes },
    })

    revalidatePath('/dashboard')
    return { success: true, sessionId: session.id }
  } catch (e) { return { error: `Failed: ${e instanceof Error ? e.message : String(e)}` } }
}

// ── GAP 1: Save C-SSRS — now includes therapist_id + session_id ──────────
export async function saveCssrsAssessment(data: {
  patientId: string
  sessionId?: string        // GAP 3: session linkage
  responses: Record<string, boolean>
  riskLevel: string
  clinicianNotes?: string
  supervisorNotified: boolean
  supervisorNotifiedAt?: string | null
  safetyPlan?: {
    warningSigns: string; copingStrategies: string
    socialDistraction: string; crisisContacts: string; meansRestriction: string
  }
}) {
  try {
    const svc         = getSvc()
    const therapistId = await getOrCreateTherapistId()
    if (!therapistId) return { error: 'Not authenticated' }

    const { data: saved, error } = await svc.from('cssrs_assessments').insert({
      patient_id:                    data.patientId,
      therapist_id:                  therapistId,          // GAP 1 FIX
      session_id:                    data.sessionId || null, // GAP 3 FIX
      wish_to_be_dead:               !!data.responses['wish_to_be_dead'],
      passive_suicidal_ideation:     !!data.responses['passive_suicidal_ideation'],
      active_suicidal_ideation:      false,
      ideation_with_method:          !!data.responses['ideation_with_method'],
      ideation_with_intent_no_plan:  !!data.responses['ideation_with_intent_no_plan'],
      ideation_with_intent_and_plan: !!data.responses['ideation_with_intent_and_plan'],
      preparatory_behaviour:         !!data.responses['preparatory_behaviour'],
      aborted_attempt:               false,
      interrupted_attempt:           !!data.responses['interrupted_attempt'],
      actual_attempt:                false,
      clinician_risk_level:          data.riskLevel,
      clinician_notes:               data.clinicianNotes || null,
      supervisor_notified:           data.supervisorNotified,
      supervisor_notified_at:        data.supervisorNotifiedAt || null,
      ai_screening_flags:            [],
    }).select('id').single()

    if (error) return { error: error.message }

    // Save safety plan if provided
    if (data.safetyPlan && (data.safetyPlan.warningSigns || data.safetyPlan.copingStrategies || data.safetyPlan.crisisContacts)) {
      await svc.from('safety_plans').insert({
        patient_id:                 data.patientId,
        therapist_id:               therapistId,
        warning_signs:              data.safetyPlan.warningSigns    ? [data.safetyPlan.warningSigns]     : [],
        internal_coping_strategies: data.safetyPlan.copingStrategies ? [data.safetyPlan.copingStrategies] : [],
        social_contacts:            data.safetyPlan.socialDistraction ? [{ note: data.safetyPlan.socialDistraction }] : [],
        crisis_contacts:            data.safetyPlan.crisisContacts   ? [{ note: data.safetyPlan.crisisContacts }]    : [],
        professional_contacts:      [],
      })
    }

    // Audit
    await writeAuditLog({
      action: 'SAVE_CSSRS', resourceType: 'cssrs_assessment',
      resourceId: saved.id, patientId: data.patientId, sessionId: data.sessionId,
      metadata: { risk_level: data.riskLevel, supervisor_notified: data.supervisorNotified },
    })

    return { success: true, id: saved.id }
  } catch (e) { return { error: `Failed: ${e instanceof Error ? e.message : String(e)}` } }
}

// ── GAP 9: Save real-time transcript risk flags ───────────────────────────
// Called when session ends if C-SSRS flags were detected in the transcript.
export async function saveTranscriptRiskFlags(data: {
  sessionId: string
  patientId: string
  flags: Array<{ id: string; q: string; sev: number; matched: string[] }>
  maxSeverity: number
  riskLevel: string
}) {
  try {
    const svc         = getSvc()
    const therapistId = await getOrCreateTherapistId()
    if (!therapistId) return { error: 'Not authenticated' }

    const { error } = await svc.from('transcript_risk_flags').insert({
      session_id:   data.sessionId,
      patient_id:   data.patientId,
      therapist_id: therapistId,
      flags:        data.flags,
      max_severity: data.maxSeverity,
      risk_level:   data.riskLevel,
    })

    if (error) return { error: error.message }

    // Audit
    await writeAuditLog({
      action: 'AI_RISK_FLAG', resourceType: 'transcript_risk_flag',
      patientId: data.patientId, sessionId: data.sessionId,
      metadata: { max_severity: data.maxSeverity, risk_level: data.riskLevel, flag_count: data.flags.length },
    })

    return { success: true }
  } catch (e) { return { error: `Failed: ${e instanceof Error ? e.message : String(e)}` } }
}

export async function saveAppointment(data: { patientId: string; requestedTime: string; reason?: string }) {
  try {
    const svc = getSvc()
    const therapistId = await getOrCreateTherapistId()
    if (!therapistId) return { error: 'Not authenticated' }
    const { data: appt, error } = await svc.from('appointments').insert({
      patient_id:       data.patientId,
      therapist_id:     therapistId,
      requested_time:   data.requestedTime,
      reason:           data.reason || null,
      status:           'pending',
      duration_minutes: 50,
      location_type:    'in_person',
    }).select('id').single()
    if (error) return { error: error.message }

    await writeAuditLog({
      action: 'BOOK_APPOINTMENT', resourceType: 'appointment',
      resourceId: appt.id, patientId: data.patientId,
    })

    revalidatePath('/dashboard/appointments')
    return { success: true, id: appt.id }
  } catch (e) { return { error: `Failed: ${e instanceof Error ? e.message : String(e)}` } }
}

export async function saveOutcomeScore(data: {
  patientId: string; instrument: string; score: number; responses?: Record<string, number>
}) {
  try {
    const svc = getSvc()
    const therapistId = await getOrCreateTherapistId()
    const { data: saved, error } = await svc.from('outcome_scores').insert({
      patient_id:      data.patientId,
      therapist_id:    therapistId,
      instrument:      data.instrument,
      score:           data.score,
      responses:       data.responses || {},
      administered_at: new Date().toISOString(),
    }).select('id').single()
    if (error) return { error: error.message }

    await writeAuditLog({
      action: 'SAVE_OUTCOME_SCORE', resourceType: 'outcome_score',
      resourceId: saved.id, patientId: data.patientId,
      metadata: { instrument: data.instrument, score: data.score },
    })

    return { success: true }
  } catch (e) { return { error: `Failed: ${e instanceof Error ? e.message : String(e)}` } }
}

export async function savePatientConsent(data: {
  patientId: string; treatment: boolean; dataProcessing: boolean
  recording: boolean; aiProcessing: boolean; dataSharing: boolean
}) {
  try {
    const svc = getSvc()
    await svc.from('patient_consents').upsert({
      patient_id:           data.patientId,
      treatment:            data.treatment,
      data_processing:      data.dataProcessing,
      recording:            data.recording,
      ai_processing:        data.aiProcessing,
      data_sharing:         data.dataSharing,
      consent_timestamp:    new Date().toISOString(),
      legal_basis:          'UK-GDPR Article 9(2)(a)',
      data_retention_years: 7,
    }, { onConflict: 'patient_id' })

    await writeAuditLog({
      action: 'SAVE_GRANULAR_CONSENT', resourceType: 'patient_consent',
      patientId: data.patientId,
      metadata: { treatment: data.treatment, recording: data.recording, ai_processing: data.aiProcessing },
    })

    return { success: true }
  } catch (e) { return { error: `Failed: ${e instanceof Error ? e.message : String(e)}` } }
}

// ═════════════════════════════════════════════════════════════════════
// TRIAGE QUEUE — the clinician's red/amber/green feed of patient events
// ═════════════════════════════════════════════════════════════════════

export interface TriageFlagRow {
  id: string
  patient_id: string
  therapist_id: string
  severity: 'red' | 'amber' | 'green'
  flag_type: string
  trigger_source: string
  source_id: string | null
  summary: string
  trigger_data: Record<string, unknown>
  status: 'open' | 'acknowledged' | 'resolved'
  acknowledged_at: string | null
  resolved_at: string | null
  resolution_note: string | null
  created_at: string
  patient_label: string
}

/**
 * List triage flags for the signed-in therapist.
 * Default: open + acknowledged, sorted red > amber > green, newest first.
 */
export async function listTriageFlags(filter: {
  includeResolved?: boolean
  patientId?: string
} = {}): Promise<{ flags: TriageFlagRow[]; counts: { red: number; amber: number; green: number; total: number } }> {
  try {
    const therapistId = await getOrCreateTherapistId()
    if (!therapistId) return { flags: [], counts: { red: 0, amber: 0, green: 0, total: 0 } }
    const svc = getSvc()

    let q = svc
      .from('triage_flags')
      .select('id, patient_id, therapist_id, severity, flag_type, trigger_source, source_id, summary, trigger_data, status, acknowledged_at, resolved_at, resolution_note, created_at, patients!inner(display_label)')
      .eq('therapist_id', therapistId)

    if (!filter.includeResolved) q = q.neq('status', 'resolved')
    if (filter.patientId)        q = q.eq('patient_id', filter.patientId)

    const { data, error } = await q.order('created_at', { ascending: false })
    if (error) return { flags: [], counts: { red: 0, amber: 0, green: 0, total: 0 } }

    const rows: TriageFlagRow[] = (data || []).map((r: unknown) => {
      const row = r as Record<string, unknown>
      const patient = row.patients as { display_label?: string } | null
      return {
        id:              String(row.id),
        patient_id:      String(row.patient_id),
        therapist_id:    String(row.therapist_id),
        severity:        row.severity as 'red' | 'amber' | 'green',
        flag_type:       String(row.flag_type),
        trigger_source:  String(row.trigger_source),
        source_id:       (row.source_id as string | null) ?? null,
        summary:         String(row.summary),
        trigger_data:    (row.trigger_data as Record<string, unknown>) ?? {},
        status:          row.status as 'open' | 'acknowledged' | 'resolved',
        acknowledged_at: (row.acknowledged_at as string | null) ?? null,
        resolved_at:     (row.resolved_at as string | null) ?? null,
        resolution_note: (row.resolution_note as string | null) ?? null,
        created_at:      String(row.created_at),
        patient_label:   patient?.display_label || 'Patient',
      }
    })

    // Client-side severity sort (Supabase can't sort by enum rank easily)
    const rank = (s: string) => (s === 'red' ? 0 : s === 'amber' ? 1 : 2)
    rows.sort((a, b) => rank(a.severity) - rank(b.severity) || b.created_at.localeCompare(a.created_at))

    const counts = {
      red:   rows.filter(r => r.severity === 'red'   && r.status !== 'resolved').length,
      amber: rows.filter(r => r.severity === 'amber' && r.status !== 'resolved').length,
      green: rows.filter(r => r.severity === 'green' && r.status !== 'resolved').length,
      total: rows.filter(r => r.status !== 'resolved').length,
    }

    return { flags: rows, counts }
  } catch (e) {
    console.error('[listTriageFlags]', e)
    return { flags: [], counts: { red: 0, amber: 0, green: 0, total: 0 } }
  }
}

/**
 * Mark a flag as acknowledged (clinician has seen it).
 * The flag remains in the queue but gets a muted style.
 */
export async function acknowledgeTriageFlag(flagId: string): Promise<{ success?: true; error?: string }> {
  try {
    const therapistId = await getOrCreateTherapistId()
    if (!therapistId) return { error: 'Not authenticated' }
    const svc = getSvc()

    const { error } = await svc
      .from('triage_flags')
      .update({
        status: 'acknowledged',
        acknowledged_at: new Date().toISOString(),
        acknowledged_by: therapistId,
      })
      .eq('id', flagId)
      .eq('therapist_id', therapistId)

    if (error) return { error: error.message }

    await writeAuditLog({
      action: 'ACKNOWLEDGE_TRIAGE_FLAG',
      resourceType: 'triage_flag',
      resourceId: flagId,
    })

    revalidatePath('/dashboard/queue')
    return { success: true }
  } catch (e) {
    return { error: `Failed: ${e instanceof Error ? e.message : String(e)}` }
  }
}

/**
 * Resolve a flag — clinician has taken action. Optional note for audit trail.
 */
export async function resolveTriageFlag(flagId: string, note?: string): Promise<{ success?: true; error?: string }> {
  try {
    const therapistId = await getOrCreateTherapistId()
    if (!therapistId) return { error: 'Not authenticated' }
    const svc = getSvc()

    const { error } = await svc
      .from('triage_flags')
      .update({
        status: 'resolved',
        resolved_at: new Date().toISOString(),
        resolved_by: therapistId,
        resolution_note: note?.trim() || null,
      })
      .eq('id', flagId)
      .eq('therapist_id', therapistId)

    if (error) return { error: error.message }

    await writeAuditLog({
      action: 'RESOLVE_TRIAGE_FLAG',
      resourceType: 'triage_flag',
      resourceId: flagId,
      metadata: { note: note?.slice(0, 200) },
    })

    revalidatePath('/dashboard/queue')
    return { success: true }
  } catch (e) {
    return { error: `Failed: ${e instanceof Error ? e.message : String(e)}` }
  }
}

/**
 * Manually create a flag from the clinician side (e.g. after reading
 * a journal entry or receiving an out-of-band patient message).
 */
export async function createManualTriageFlag(input: {
  patientId: string
  severity: 'red' | 'amber' | 'green'
  summary: string
}): Promise<{ success?: true; error?: string; id?: string }> {
  try {
    const therapistId = await getOrCreateTherapistId()
    if (!therapistId) return { error: 'Not authenticated' }
    const svc = getSvc()

    // Verify therapist owns this patient
    const { data: patient } = await svc
      .from('patients')
      .select('id, therapist_id')
      .eq('id', input.patientId)
      .single()
    if (!patient) return { error: 'Patient not found' }
    if (patient.therapist_id !== therapistId) return { error: 'Not authorised' }

    const { data, error } = await svc
      .from('triage_flags')
      .insert({
        patient_id:     input.patientId,
        therapist_id:   therapistId,
        severity:       input.severity,
        flag_type:      'manual',
        summary:        input.summary.slice(0, 240),
        trigger_source: 'manual',
        trigger_data:   {},
        status:         'open',
      })
      .select('id')
      .single()

    if (error) return { error: error.message }

    await writeAuditLog({
      action: 'CREATE_MANUAL_TRIAGE_FLAG',
      resourceType: 'triage_flag',
      resourceId: data?.id,
      patientId: input.patientId,
      metadata: { severity: input.severity },
    })

    revalidatePath('/dashboard/queue')
    return { success: true, id: data?.id }
  } catch (e) {
    return { error: `Failed: ${e instanceof Error ? e.message : String(e)}` }
  }
}

