'use server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '../utils/supabase/server'
import {
  classifyPHQ9,
  classifyGAD7,
  classifyTextForRisk,
  createTriageFlag,
  type TriageTriggerSource,
} from '@oraii/core/triage'

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

/**
 * resolvePatientId — returns patient record ID.
 * For anonymous users, auto-creates a patient record if none exists.
 */
async function resolvePatientId(): Promise<string | null> {
  const user = await getAuthUser()
  if (!user) return null
  const svc = getSvc()

  // Check for existing patient record
  const { data: existing } = await svc
    .from('patients')
    .select('id')
    .eq('portal_auth_user_id', user.id)
    .single()

  if (existing?.id) return existing.id

  // Auto-create patient record for anonymous/new users
  const nickname = user.user_metadata?.nickname || 'Guest'
  // Read consent from user metadata — set explicitly during welcome/register flow
  const consentGiven = user.user_metadata?.consent_given === true
  const consentVersion = user.user_metadata?.consent_version || '1.0.0'

  const { data: newPatient, error: createErr } = await svc
    .from('patients')
    .insert({
      portal_auth_user_id: user.id,
      display_label: nickname,
      consent_given: consentGiven,
      consent_version: consentGiven ? consentVersion : null,
      // No therapist_id — independent user
    })
    .select('id')
    .single()

  if (createErr) {
    console.error('[resolvePatientId] Auto-create failed:', createErr.message)
    return null
  }

  return newPatient?.id ?? null
}

/**
 * Get the user's nickname from auth metadata
 */
async function getNickname(): Promise<string> {
  const user = await getAuthUser()
  return user?.user_metadata?.nickname || 'there'
}

/**
 * Resolve the patient's therapist_id (null if patient is independent).
 * Used for triage-flag creation — we only raise flags for patients
 * who are linked to a clinician.
 */
async function resolvePatientTherapistId(
  patientId: string,
): Promise<string | null> {
  const svc = getSvc()
  const { data } = await svc
    .from('patients')
    .select('therapist_id')
    .eq('id', patientId)
    .single()
  return data?.therapist_id ?? null
}

/**
 * Attempt to raise a triage flag for a clinically significant event.
 * Silently no-ops if the patient has no linked therapist (independent user).
 * This never throws — flag failures must not block the patient's own write.
 */
async function tryRaiseTriageFlag(opts: {
  patientId: string
  verdict: ReturnType<typeof classifyPHQ9> | ReturnType<typeof classifyGAD7> | ReturnType<typeof classifyTextForRisk>
  triggerSource: TriageTriggerSource
  sourceId?: string | null
  triggerData?: Record<string, unknown>
}): Promise<void> {
  try {
    if (!opts.verdict) return
    const therapistId = await resolvePatientTherapistId(opts.patientId)
    if (!therapistId) return
    const svc = getSvc()
    await createTriageFlag(svc as unknown as Parameters<typeof createTriageFlag>[0], {
      patientId:     opts.patientId,
      therapistId,
      verdict:       opts.verdict,
      triggerSource: opts.triggerSource,
      sourceId:      opts.sourceId ?? null,
      triggerData:   opts.triggerData ?? {},
    })
  } catch (err) {
    console.error('[tryRaiseTriageFlag] suppressed:', err)
  }
}

// ── Profile ─────────────────────────────────────────────────────────────
export async function getMyProfile() {
  const user = await getAuthUser()
  if (!user) return null
  const svc = getSvc()
  const { data } = await svc
    .from('patients')
    .select('id, display_label, consent_given, consent_version, created_at')
    .eq('portal_auth_user_id', user.id)
    .single()
  return data
}

export async function getMyTherapist() {
  const patientId = await resolvePatientId()
  if (!patientId) return null
  const svc = getSvc()
  const { data: patient } = await svc
    .from('patients')
    .select('therapist_id')
    .eq('id', patientId)
    .single()
  if (!patient?.therapist_id) return null
  const { data: therapist } = await svc
    .from('therapists')
    .select('id, full_name, email')
    .eq('id', patient.therapist_id)
    .single()
  return therapist
}

// ── Safety Plan ─────────────────────────────────────────────────────────
export async function getMySafetyPlan() {
  const patientId = await resolvePatientId()
  if (!patientId) return null
  const svc = getSvc()
  const { data } = await svc
    .from('safety_plans')
    .select('*')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  return data
}

// ── Outcomes ────────────────────────────────────────────────────────────
export async function getMyOutcomes() {
  const patientId = await resolvePatientId()
  if (!patientId) return []
  const svc = getSvc()
  const { data } = await svc
    .from('outcome_scores')
    .select('id, measure, score, severity, completed_at')
    .eq('patient_id', patientId)
    .order('completed_at', { ascending: true })
  return data || []
}

// ── Self-administered outcome scores (PHQ-2, GAD-2, WHO-5) ─────────────
export async function saveSelfOutcomeScore(input: {
  measure: string
  score: number
  severity: string
  responses: Record<string, number>
}) {
  const patientId = await resolvePatientId()
  if (!patientId) return { error: 'Not authenticated' }
  const svc = getSvc()
  const { data, error } = await svc.from('outcome_scores').insert({
    patient_id: patientId,
    measure: input.measure,
    score: input.score,
    severity: input.severity,
    responses: input.responses,
    completed_at: new Date().toISOString(),
    self_administered: true,
  }).select('id').single()

  if (error) return { error: error.message }

  await writePatientAuditLog({
    action: 'SELF_OUTCOME_SCORE',
    resourceType: 'outcome_score',
    resourceId: data?.id,
    patientId,
    metadata: { measure: input.measure, score: input.score },
  })

  // ── Triage flag generation ─────────────────────────────────────
  // Classify the score against clinical thresholds. If the verdict
  // warrants a flag (amber/red), raise it against the linked therapist.
  // Independent patients with no therapist are silently skipped.
  let verdict: ReturnType<typeof classifyPHQ9> | ReturnType<typeof classifyGAD7> | null = null
  if (input.measure === 'PHQ-9') {
    // Q9 key may be 'q9', '9', or the ninth response — try a few shapes
    const q9 =
      typeof input.responses?.['q9'] === 'number' ? input.responses['q9']
      : typeof input.responses?.['9'] === 'number' ? input.responses['9']
      : undefined
    verdict = classifyPHQ9(input.score, q9)
  } else if (input.measure === 'GAD-7') {
    verdict = classifyGAD7(input.score)
  }

  if (verdict) {
    await tryRaiseTriageFlag({
      patientId,
      verdict,
      triggerSource: 'outcome_scores',
      sourceId:      data?.id,
      triggerData:   { measure: input.measure, score: input.score, severity: input.severity },
    })
  }

  return { success: true, id: data?.id, flagged: !!verdict }
}

// ── Appointments ────────────────────────────────────────────────────────
export async function getMyAppointments() {
  const patientId = await resolvePatientId()
  if (!patientId) return []
  const svc = getSvc()
  const { data } = await svc
    .from('appointments')
    .select('id, requested_time, duration_minutes, location_type, status, reason, created_at')
    .eq('patient_id', patientId)
    .order('requested_time', { ascending: false })
  return data || []
}

export async function requestAppointment(input: {
  preferredTime: string
  locationType: string
  reason?: string
}) {
  const patientId = await resolvePatientId()
  if (!patientId) return { error: 'Not authenticated' }

  const svc = getSvc()
  const { data: patient } = await svc
    .from('patients')
    .select('therapist_id')
    .eq('id', patientId)
    .single()
  if (!patient?.therapist_id) return { error: 'No therapist linked — connect with a therapist first' }

  const { error } = await svc.from('appointments').insert({
    patient_id:       patientId,
    therapist_id:     patient.therapist_id,
    requested_time:   input.preferredTime,
    location_type:    input.locationType || 'video',
    status:           'pending',
    reason:           input.reason || null,
    duration_minutes: 50,
  })

  if (error) return { error: error.message }

  await writePatientAuditLog({
    action: 'REQUEST_APPOINTMENT',
    resourceType: 'appointment',
    patientId,
  })

  return { success: true }
}

// ── Journal ─────────────────────────────────────────────────────────────
export async function getMyJournalEntries() {
  const patientId = await resolvePatientId()
  if (!patientId) return []
  const svc = getSvc()
  const { data } = await svc
    .from('journal_entries')
    .select('id, content, mood_score, therapist_can_view, created_at')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false })
    .limit(50)
  return data || []
}

export async function saveJournalEntry(input: {
  content: string
  moodScore: number
  therapistCanView: boolean
  emotions?: string[]
  activities?: string[]
}) {
  const patientId = await resolvePatientId()
  if (!patientId) return { error: 'Not authenticated' }
  const svc = getSvc()
  const { data, error } = await svc.from('journal_entries').insert({
    patient_id:         patientId,
    content:            input.content,
    mood_score:         input.moodScore,
    therapist_can_view: input.therapistCanView,
    emotions:           input.emotions || null,
    activities:         input.activities || null,
  }).select('id').single()

  if (error) return { error: error.message }

  await writePatientAuditLog({
    action: 'SAVE_JOURNAL',
    resourceType: 'journal_entry',
    resourceId: data?.id,
    patientId,
    metadata: { mood_score: input.moodScore, shared: input.therapistCanView },
  })

  return { success: true, id: data?.id }
}

export async function deleteJournalEntry(entryId: string) {
  const patientId = await resolvePatientId()
  if (!patientId) return { error: 'Not authenticated' }
  const svc = getSvc()
  const { data: entry } = await svc
    .from('journal_entries')
    .select('patient_id')
    .eq('id', entryId)
    .single()
  if (!entry || entry.patient_id !== patientId) return { error: 'Not authorised' }

  const { error } = await svc.from('journal_entries').delete().eq('id', entryId)
  if (error) return { error: error.message }
  return { success: true }
}

// ── Mood (quick save from home) ─────────────────────────────────────────
export async function saveMoodEntry(score: number, emotions?: string[], activities?: string[]) {
  const patientId = await resolvePatientId()
  if (!patientId) return { error: 'Not authenticated' }
  const svc = getSvc()
  const { error } = await svc.from('journal_entries').insert({
    patient_id:         patientId,
    content:            '',
    mood_score:         score,
    therapist_can_view: false,
    emotions:           emotions || null,
    activities:         activities || null,
  })
  if (error) return { error: error.message }
  return { success: true }
}

// ── Daily Check-in (extended mood entry) ────────────────────────────────
export async function saveCheckin(input: {
  moodScore: number
  energyLevel: number
  emotions: string[]
  activities: string[]
  journalText?: string
  sleepHours?: number
}) {
  const patientId = await resolvePatientId()
  if (!patientId) return { error: 'Not authenticated' }
  const svc = getSvc()

  const { data, error } = await svc.from('journal_entries').insert({
    patient_id:         patientId,
    content:            input.journalText || '',
    mood_score:         input.moodScore,
    energy_level:       input.energyLevel,
    emotions:           input.emotions,
    activities:         input.activities,
    sleep_hours:        input.sleepHours || null,
    therapist_can_view: false,
    entry_type:         'checkin',
  }).select('id').single()

  if (error) return { error: error.message }

  // Update streak
  await updateStreak(patientId)

  await writePatientAuditLog({
    action: 'DAILY_CHECKIN',
    resourceType: 'journal_entry',
    resourceId: data?.id,
    patientId,
    metadata: { mood_score: input.moodScore, energy: input.energyLevel },
  })

  return { success: true, id: data?.id }
}

// ── Streaks ─────────────────────────────────────────────────────────────
async function updateStreak(patientId: string) {
  const svc = getSvc()
  const today = new Date().toISOString().split('T')[0]

  // Get latest check-in dates
  const { data: entries } = await svc
    .from('journal_entries')
    .select('created_at')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false })
    .limit(60)

  if (!entries || entries.length === 0) return

  // Calculate streak
  const dates = [...new Set(entries.map(e => e.created_at.split('T')[0]))].sort().reverse()
  let streak = 1
  for (let i = 1; i < dates.length; i++) {
    const d1 = new Date(dates[i - 1])
    const d2 = new Date(dates[i])
    const diff = Math.round((d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24))
    if (diff === 1) streak++
    else break
  }

  // Update patient metadata (using display_label's metadata or a separate field)
  // For now, store in journal_entries metadata
  return streak
}

export async function getStreakData() {
  const patientId = await resolvePatientId()
  if (!patientId) return { current: 0, longest: 0, totalCheckins: 0 }
  const svc = getSvc()

  const { data: entries } = await svc
    .from('journal_entries')
    .select('created_at')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false })
    .limit(365)

  if (!entries || entries.length === 0) return { current: 0, longest: 0, totalCheckins: entries?.length || 0 }

  const dates = [...new Set(entries.map(e => e.created_at.split('T')[0]))].sort().reverse()
  let currentStreak = 1
  for (let i = 1; i < dates.length; i++) {
    const d1 = new Date(dates[i - 1])
    const d2 = new Date(dates[i])
    const diff = Math.round((d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24))
    if (diff === 1) currentStreak++
    else break
  }

  // Check if streak includes today
  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  if (dates[0] !== today && dates[0] !== yesterday) {
    currentStreak = 0
  }

  // Calculate longest streak
  let longest = 1
  let tempStreak = 1
  for (let i = 1; i < dates.length; i++) {
    const d1 = new Date(dates[i - 1])
    const d2 = new Date(dates[i])
    const diff = Math.round((d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24))
    if (diff === 1) {
      tempStreak++
      longest = Math.max(longest, tempStreak)
    } else {
      tempStreak = 1
    }
  }

  return { current: currentStreak, longest, totalCheckins: entries.length }
}

// ── Purpose Tracker ─────────────────────────────────────────────────────
export async function getMyPurposes() {
  const patientId = await resolvePatientId()
  if (!patientId) return []
  const svc = getSvc()

  // Store purposes in a JSONB field on the patient or a dedicated table
  // For now, use journal_entries with entry_type = 'purpose'
  const { data } = await svc
    .from('journal_entries')
    .select('id, content, mood_score, created_at')
    .eq('patient_id', patientId)
    .eq('entry_type', 'purpose')
    .order('created_at', { ascending: false })
  return data || []
}

export async function savePurpose(input: {
  title: string
  description: string
  category: string
  alignmentScore: number
}) {
  const patientId = await resolvePatientId()
  if (!patientId) return { error: 'Not authenticated' }
  const svc = getSvc()

  const { data, error } = await svc.from('journal_entries').insert({
    patient_id: patientId,
    content: JSON.stringify({
      title: input.title,
      description: input.description,
      category: input.category,
      alignmentScore: input.alignmentScore,
    }),
    mood_score: input.alignmentScore,
    entry_type: 'purpose',
    therapist_can_view: false,
  }).select('id').single()

  if (error) return { error: error.message }
  return { success: true, id: data?.id }
}

// ── Safety Plan (self-guided) ───────────────────────────────────────────
export async function saveSelfSafetyPlan(plan: {
  warning_signs: string[]
  internal_coping_strategies: string[]
  social_contacts_distraction: { name: string; phone?: string }[]
  crisis_contacts: { name: string; phone?: string; relationship?: string }[]
  professional_contacts: { name: string; phone?: string; availability?: string }[]
  means_restriction: string[]
}) {
  const patientId = await resolvePatientId()
  if (!patientId) return { error: 'Not authenticated' }
  const svc = getSvc()

  // Check for existing plan
  const { data: existing } = await svc
    .from('safety_plans')
    .select('id, version')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  const now = new Date().toISOString()

  if (existing?.id) {
    const { error } = await svc
      .from('safety_plans')
      .update({
        ...plan,
        version: (existing.version || 1) + 1,
        updated_at: now,
        self_created: true,
      })
      .eq('id', existing.id)
    if (error) return { error: error.message }
  } else {
    const { error } = await svc.from('safety_plans').insert({
      patient_id: patientId,
      ...plan,
      version: 1,
      updated_at: now,
      self_created: true,
    })
    if (error) return { error: error.message }
  }

  await writePatientAuditLog({
    action: 'SAVE_SELF_SAFETY_PLAN',
    resourceType: 'safety_plan',
    patientId,
  })

  return { success: true }
}

// ── Mood Insights ───────────────────────────────────────────────────────
export async function getMoodInsights(days: number = 30) {
  const patientId = await resolvePatientId()
  if (!patientId) return null
  const svc = getSvc()

  const since = new Date(Date.now() - days * 86400000).toISOString()
  const { data: entries } = await svc
    .from('journal_entries')
    .select('mood_score, energy_level, emotions, activities, created_at')
    .eq('patient_id', patientId)
    .gte('created_at', since)
    .not('mood_score', 'is', null)
    .order('created_at', { ascending: true })

  if (!entries || entries.length === 0) return null

  const avgMood = entries.reduce((sum, e) => sum + (e.mood_score || 0), 0) / entries.length
  const moodTrend = entries.length >= 3
    ? entries.slice(-3).reduce((s, e) => s + (e.mood_score || 0), 0) / 3 -
      entries.slice(0, 3).reduce((s, e) => s + (e.mood_score || 0), 0) / 3
    : 0

  // Count emotions
  const emotionCounts: Record<string, number> = {}
  entries.forEach(e => {
    const emos = Array.isArray(e.emotions) ? e.emotions : []
    emos.forEach((em: string) => {
      emotionCounts[em] = (emotionCounts[em] || 0) + 1
    })
  })

  const topEmotions = Object.entries(emotionCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([emotion, count]) => ({ emotion, count }))

  // Activity-mood correlations
  const activityMoods: Record<string, number[]> = {}
  entries.forEach(e => {
    const acts = Array.isArray(e.activities) ? e.activities : []
    acts.forEach((act: string) => {
      if (!activityMoods[act]) activityMoods[act] = []
      activityMoods[act].push(e.mood_score || 5)
    })
  })

  const activityCorrelations = Object.entries(activityMoods)
    .filter(([, moods]) => moods.length >= 2)
    .map(([activity, moods]) => ({
      activity,
      avgMood: Number((moods.reduce((a, b) => a + b, 0) / moods.length).toFixed(1)),
      count: moods.length,
    }))
    .sort((a, b) => b.avgMood - a.avgMood)

  return {
    totalEntries: entries.length,
    avgMood: Number(avgMood.toFixed(1)),
    moodTrend: Number(moodTrend.toFixed(1)),
    topEmotions,
    activityCorrelations,
    entries: entries.map(e => ({
      mood: e.mood_score,
      energy: e.energy_level,
      date: e.created_at,
    })),
  }
}

// ── Home Dashboard Data ─────────────────────────────────────────────────
export async function getDashboardData() {
  const user = await getAuthUser()
  if (!user) return null

  const patientId = await resolvePatientId()
  if (!patientId) return null

  const svc = getSvc()
  const nickname = user.user_metadata?.nickname || 'there'
  const isAnonymous = user.is_anonymous || user.user_metadata?.is_anonymous || false

  const [
    { data: patient },
    { data: nextAppt },
    { data: latestScore },
    { data: safetyPlan },
    { data: recentMoods },
  ] = await Promise.all([
    svc.from('patients').select('display_label, therapist_id').eq('id', patientId).single(),
    svc.from('appointments')
      .select('requested_time, status, location_type')
      .eq('patient_id', patientId)
      .in('status', ['pending', 'confirmed'])
      .gte('requested_time', new Date().toISOString())
      .order('requested_time', { ascending: true })
      .limit(1)
      .single(),
    svc.from('outcome_scores')
      .select('measure, score, severity, completed_at')
      .eq('patient_id', patientId)
      .order('completed_at', { ascending: false })
      .limit(1)
      .single(),
    svc.from('safety_plans')
      .select('id')
      .eq('patient_id', patientId)
      .limit(1)
      .single(),
    svc.from('journal_entries')
      .select('mood_score, created_at')
      .eq('patient_id', patientId)
      .not('mood_score', 'is', null)
      .order('created_at', { ascending: false })
      .limit(7),
  ])

  // Resolve therapist name if linked
  let therapistName: string | null = null
  if (patient?.therapist_id) {
    const { data: therapist } = await svc
      .from('therapists')
      .select('full_name')
      .eq('id', patient.therapist_id)
      .single()
    therapistName = therapist?.full_name || null
  }

  // Get streak data
  const streak = await getStreakData()

  // Get mood insights (last 14 days for dashboard)
  const insights = await getMoodInsights(14)

  return {
    displayLabel: nickname || patient?.display_label || 'there',
    therapistName,
    isAnonymous,
    hasTherapist: !!patient?.therapist_id,
    nextAppointment: nextAppt || null,
    latestScore: latestScore || null,
    hasSafetyPlan: !!safetyPlan,
    recentMoods: recentMoods || [],
    streak,
    insights,
  }
}

// ── Invite Code Redemption ──────────────────────────────────────────────
export async function redeemInviteCode(code: string) {
  const user = await getAuthUser()
  if (!user) return { error: 'Not authenticated' }

  const svc = getSvc()

  // Check if user already linked to a therapist
  const { data: existing } = await svc
    .from('patients')
    .select('id, therapist_id')
    .eq('portal_auth_user_id', user.id)
    .single()

  if (existing?.therapist_id) return { error: 'Already linked to a therapist' }

  // Find the invite code
  const { data: invite } = await svc
    .from('invite_codes')
    .select('id, patient_id, therapist_id, expires_at, used_at')
    .eq('code', code.trim().toUpperCase())
    .single()

  if (!invite) return { error: 'Invalid invite code' }
  if (invite.used_at) return { error: 'This code has already been used' }
  if (new Date(invite.expires_at) < new Date()) return { error: 'This code has expired' }

  if (existing) {
    // User already has a patient record (from anonymous flow) — link therapist
    const { error: linkErr } = await svc
      .from('patients')
      .update({ therapist_id: invite.therapist_id })
      .eq('id', existing.id)

    if (linkErr) return { error: linkErr.message }
  } else {
    // Link patient record from invite
    const { error: linkErr } = await svc
      .from('patients')
      .update({ portal_auth_user_id: user.id })
      .eq('id', invite.patient_id)

    if (linkErr) return { error: linkErr.message }
  }

  // Mark code as used
  await svc
    .from('invite_codes')
    .update({ used_at: new Date().toISOString() })
    .eq('id', invite.id)

  return { success: true }
}

// ── Link Identity (anonymous → permanent) ───────────────────────────────
export async function checkIsAnonymous() {
  const user = await getAuthUser()
  if (!user) return { isAnonymous: false }
  return {
    isAnonymous: user.is_anonymous || user.user_metadata?.is_anonymous || false,
    nickname: user.user_metadata?.nickname || null,
    email: user.email || null,
  }
}

// ── MindOS Progress ────────────────────────────────────────────────
export async function getMindOSProgress() {
  const patientId = await resolvePatientId()
  if (!patientId) return { sessions: [], totalMinutes: 0, totalXP: 0, level: 1 }
  const svc = getSvc()

  const { data } = await svc
    .from('journal_entries')
    .select('id, content, mood_score, created_at')
    .eq('patient_id', patientId)
    .eq('entry_type', 'mindos')
    .order('created_at', { ascending: false })

  const sessions = (data || []).map(e => {
    try { return { ...JSON.parse(e.content || '{}'), id: e.id, created_at: e.created_at } }
    catch { return null }
  }).filter(Boolean)

  const totalMinutes = sessions.reduce((s: number, e: any) => s + (e.duration || 0), 0)
  const totalXP = sessions.reduce((s: number, e: any) => s + (e.xp || 0), 0)
  const level = Math.floor(totalXP / 100) + 1

  return { sessions, totalMinutes, totalXP, level }
}

export async function saveMindOSSession(input: {
  sessionId: string
  title: string
  duration: number
  xp: number
  category: string
}) {
  const patientId = await resolvePatientId()
  if (!patientId) return { error: 'Not authenticated' }
  const svc = getSvc()

  const { data, error } = await svc.from('journal_entries').insert({
    patient_id: patientId,
    content: JSON.stringify({
      sessionId: input.sessionId,
      title: input.title,
      duration: input.duration,
      xp: input.xp,
      category: input.category,
    }),
    mood_score: null,
    entry_type: 'mindos',
    therapist_can_view: false,
  }).select('id').single()

  if (error) return { error: error.message }

  await writePatientAuditLog({
    action: 'MINDOS_SESSION',
    resourceType: 'journal_entry',
    resourceId: data?.id,
    patientId,
    metadata: { sessionId: input.sessionId, duration: input.duration, xp: input.xp },
  })

  return { success: true, id: data?.id }
}

// ── Anonymous User Creation (service-role bypass) ───────────────────
export async function createAnonymousUser(nickname: string, consentGiven = false) {
  const svc = getSvc()
  const id = crypto.randomUUID()
  const email = `anon-${id}@anonymous.oraii.local`
  const password = crypto.randomUUID() + crypto.randomUUID()

  const { data, error } = await svc.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      nickname: nickname.trim() || 'Guest',
      is_anonymous: true,
      onboarded_at: new Date().toISOString(),
      consent_given: consentGiven,
      consent_version: consentGiven ? '1.0.0' : null,
      consent_at: consentGiven ? new Date().toISOString() : null,
    },
  })

  if (error) return { error: error.message }

  return { email, password, userId: data.user.id }
}

// ── Chat Session Persistence ────────────────────────────────────────────
export async function saveChatSession(messages: { role: string; content: string }[]) {
  const patientId = await resolvePatientId()
  if (!patientId) return { error: 'Not authenticated' }
  const svc = getSvc()

  // Upsert today's chat session (one per day, replaced on each save)
  const today = new Date().toISOString().split('T')[0]!

  // Find today's chat session entry
  const { data: existing } = await svc
    .from('journal_entries')
    .select('id')
    .eq('patient_id', patientId)
    .eq('entry_type', 'chat_session')
    .gte('created_at', today + 'T00:00:00.000Z')
    .lt('created_at', today + 'T23:59:59.999Z')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  const payload = {
    patient_id: patientId,
    content: JSON.stringify(messages),
    mood_score: null,
    entry_type: 'chat_session',
    therapist_can_view: false,
  }

  let sessionId: string | null = null
  if (existing?.id) {
    sessionId = existing.id
    const { error } = await svc
      .from('journal_entries')
      .update({ content: JSON.stringify(messages) })
      .eq('id', existing.id)
    if (error) return { error: error.message }
  } else {
    const { data: inserted, error } = await svc
      .from('journal_entries')
      .insert(payload)
      .select('id')
      .single()
    if (error) return { error: error.message }
    sessionId = inserted?.id ?? null
  }

  // ── Chat-risk keyword scan ────────────────────────────────────
  // Scan only the LAST user message — flagging every historical
  // message would spam the clinician queue. The verdict surfaces
  // the first matching keyword.
  const lastUser = [...messages].reverse().find(m => m.role === 'user')
  if (lastUser?.content) {
    const verdict = classifyTextForRisk(lastUser.content)
    if (verdict) {
      await tryRaiseTriageFlag({
        patientId,
        verdict,
        triggerSource: 'chat_session',
        sourceId:      sessionId,
        triggerData:   { excerpt: lastUser.content.slice(0, 200) },
      })
    }
  }

  return { success: true }
}

export async function getLastChatSession(): Promise<{ role: string; content: string }[]> {
  const patientId = await resolvePatientId()
  if (!patientId) return []
  const svc = getSvc()

  // Load the most recent chat session (last 7 days)
  const since = new Date(Date.now() - 7 * 86400000).toISOString()
  const { data } = await svc
    .from('journal_entries')
    .select('content, created_at')
    .eq('patient_id', patientId)
    .eq('entry_type', 'chat_session')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!data?.content) return []
  try {
    const parsed = JSON.parse(data.content)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

// ── Audit Log ───────────────────────────────────────────────────────────
async function writePatientAuditLog(entry: {
  action: string
  resourceType: string
  resourceId?: string
  patientId?: string
  metadata?: Record<string, any>
}) {
  try {
    const svc = getSvc()
    await svc.from('audit_log').insert({
      patient_id:    entry.patientId || null,
      action:        entry.action,
      resource_type: entry.resourceType,
      resource_id:   entry.resourceId || null,
      metadata:      { ...(entry.metadata || {}), portal: 'patient' },
    })
  } catch (e) {
    console.error('[patient-audit]', e instanceof Error ? e.message : e)
  }
}
