#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────
// ORAII UK — Demo seed script
// ─────────────────────────────────────────────────────────────
// Seeds a clean, demo-ready dataset for the SuSA submission video.
// Creates one demo therapist + five pseudonymous patients with a
// realistic spread of outcome scores, a safety plan, and one open
// red-severity triage flag so the queue looks active on camera.
//
// Run from the monorepo root (Node 20+):
//   node --env-file=apps/clinic/.env.local infra/scripts/seed-demo.mjs
//
// Requires:
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY   (service role bypasses RLS — keep secret)
//
// Idempotency: re-running deletes all rows owned by the demo therapist
// and recreates them. Safe to run repeatedly. NEVER point at production.
// ─────────────────────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

// Manual .env loader — no dotenv dependency required.
// Looks for apps/clinic/.env.local relative to this script location,
// then merges keys into process.env (without overwriting anything
// already set, so node --env-file= or shell exports still win).
const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dirname, '../../apps/clinic/.env.local')
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq < 0) continue
    const key = trimmed.slice(0, eq).trim()
    let val = trimmed.slice(eq + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (!(key in process.env)) process.env[key] = val
  }
}

const SUPA_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE   = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPA_URL || !SERVICE) {
  console.error('[seed] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}
if (!SUPA_URL.includes('.supabase.co')) {
  console.error('[seed] Refusing — URL does not look like a Supabase project URL')
  process.exit(1)
}

const sb = createClient(SUPA_URL, SERVICE, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ── Demo data ────────────────────────────────────────────────
const DEMO_EMAIL = 'demo.therapist@oraii.uk'
const DEMO_PASSWORD = 'OraiiDemoPwd2026!'
const DEMO_THERAPIST = {
  email:               DEMO_EMAIL,
  full_name:           'Dr. Avery Bennett',
  professional_body:   'BACP',
  registration_number: 'BACP-DEMO-0001',
  specialisms:         ['Anxiety', 'Depression', 'Trauma'],
}

// Pseudonymous labels — never real names. UK-GDPR.
const PATIENTS = [
  { display_label: 'Client A', age: 34, gender: 'Female', primary_complaint: 'Generalised anxiety',
    phq9_scores: [11, 14, 17, 22], gad7_scores: [10, 13, 16] },
  { display_label: 'Client B', age: 28, gender: 'Male',   primary_complaint: 'Post-traumatic stress',
    phq9_scores: [8, 9, 7], gad7_scores: [12, 11, 9] },
  { display_label: 'Client C', age: 41, gender: 'Female', primary_complaint: 'Depression with sleep disturbance',
    phq9_scores: [16, 13, 10, 8], gad7_scores: [9, 7, 6] },
  { display_label: 'Client D', age: 22, gender: 'Non-binary', primary_complaint: 'Social anxiety',
    phq9_scores: [6, 5], gad7_scores: [13, 11] },
  { display_label: 'Client E', age: 55, gender: 'Male',   primary_complaint: 'Bereavement-related low mood',
    phq9_scores: [12, 14], gad7_scores: [8, 10] },
]

// ── Helpers ──────────────────────────────────────────────────
function severityFor(measure, score) {
  if (measure === 'PHQ-9') {
    if (score >= 20) return 'severe'
    if (score >= 15) return 'moderately severe'
    if (score >= 10) return 'moderate'
    if (score >= 5)  return 'mild'
    return 'minimal'
  }
  if (measure === 'GAD-7') {
    if (score >= 15) return 'severe'
    if (score >= 10) return 'moderate'
    if (score >= 5)  return 'mild'
    return 'minimal'
  }
  return 'unknown'
}

function daysAgo(days) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

// ── Step 1 — auth user + therapist row ───────────────────────
async function ensureDemoTherapist() {
  // Create or fetch the auth user
  const { data: existing } = await sb.auth.admin.listUsers()
  let authUser = existing?.users?.find(u => u.email === DEMO_EMAIL)

  if (!authUser) {
    const { data, error } = await sb.auth.admin.createUser({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      email_confirm: true,
    })
    if (error) throw error
    authUser = data.user
    console.log(`[seed] Created auth user ${DEMO_EMAIL}`)
  } else {
    console.log(`[seed] Reusing existing auth user ${DEMO_EMAIL}`)
  }

  // Wipe any prior demo therapist data so we re-seed cleanly
  const { data: priorTherapist } = await sb
    .from('therapists')
    .select('id')
    .eq('email', DEMO_EMAIL)
    .maybeSingle()

  if (priorTherapist?.id) {
    console.log('[seed] Wiping prior demo dataset…')
    // FK cascades on patients → sessions/assessments etc.
    await sb.from('triage_flags').delete().eq('therapist_id', priorTherapist.id)
    await sb.from('outcome_scores').delete().eq('therapist_id', priorTherapist.id)
    await sb.from('safety_plans').delete().eq('therapist_id', priorTherapist.id)
    await sb.from('cssrs_assessments').delete().eq('therapist_id', priorTherapist.id)
    await sb.from('sessions').delete().eq('therapist_id', priorTherapist.id)
    await sb.from('patients').delete().eq('therapist_id', priorTherapist.id)
    await sb.from('therapists').delete().eq('id', priorTherapist.id)
  }

  // Insert fresh
  const { data: th, error: thErr } = await sb
    .from('therapists')
    .insert({ ...DEMO_THERAPIST, auth_user_id: authUser.id })
    .select('id')
    .single()
  if (thErr) throw thErr
  console.log(`[seed] Created therapist row ${th.id}`)
  return th.id
}

// ── Step 2 — patients + outcome history ──────────────────────
async function seedPatients(therapistId) {
  const created = []

  for (const p of PATIENTS) {
    const { data: pt, error } = await sb
      .from('patients')
      .insert({
        therapist_id:      therapistId,
        display_label:     p.display_label,
        age:               p.age,
        gender:            p.gender,
        primary_complaint: p.primary_complaint,
        consent_given:     true,
        consent_date:      daysAgo(60),
      })
      .select('id, display_label')
      .single()
    if (error) throw error
    created.push({ ...pt, plan: p })
    console.log(`[seed]   patient ${pt.display_label} → ${pt.id}`)

    // Outcome history — schema uses administered_at + instrument (alias of measure)
    const phq9Rows = p.phq9_scores.map((score, i) => ({
      patient_id:      pt.id,
      therapist_id:    therapistId,
      instrument:      'PHQ-9',
      measure:         'PHQ-9',
      score,
      severity:        severityFor('PHQ-9', score),
      administered_at: daysAgo((p.phq9_scores.length - i) * 14),
      self_administered: true,
    }))
    const gad7Rows = p.gad7_scores.map((score, i) => ({
      patient_id:      pt.id,
      therapist_id:    therapistId,
      instrument:      'GAD-7',
      measure:         'GAD-7',
      score,
      severity:        severityFor('GAD-7', score),
      administered_at: daysAgo((p.gad7_scores.length - i) * 14),
      self_administered: true,
    }))
    const { error: outcomeErr } = await sb.from('outcome_scores').insert([...phq9Rows, ...gad7Rows])
    if (outcomeErr) throw new Error(`outcome_scores insert failed for ${pt.display_label}: ${outcomeErr.message}`)
  }

  return created
}

// ── Step 2b — audit log entries ──────────────────────────────
async function seedAuditLog(therapistId, patients) {
  const rows = []

  for (const p of patients) {
    const plan = p.plan
    // Patient created + consent granted (60 days ago)
    rows.push({
      therapist_id:  therapistId,
      patient_id:    p.id,
      action:        'CREATE_PATIENT',
      resource_type: 'patient',
      resource_id:   p.id,
      metadata:      { label: p.display_label, consent_given: true },
      created_at:    daysAgo(60),
    })
    rows.push({
      therapist_id:  therapistId,
      patient_id:    p.id,
      action:        'CONSENT_GRANTED',
      resource_type: 'patient',
      resource_id:   p.id,
      metadata:      { consent_given: true, label: p.display_label },
      created_at:    daysAgo(60),
    })

    // Outcome score entries — PHQ-9
    plan.phq9_scores.forEach((score, i) => {
      rows.push({
        therapist_id:  therapistId,
        patient_id:    p.id,
        action:        'SAVE_OUTCOME_SCORE',
        resource_type: 'outcome_score',
        resource_id:   null,
        metadata:      { instrument: 'PHQ-9', score, severity: severityFor('PHQ-9', score), label: p.display_label },
        created_at:    daysAgo((plan.phq9_scores.length - i) * 14),
      })
    })

    // Outcome score entries — GAD-7
    plan.gad7_scores.forEach((score, i) => {
      rows.push({
        therapist_id:  therapistId,
        patient_id:    p.id,
        action:        'SAVE_OUTCOME_SCORE',
        resource_type: 'outcome_score',
        resource_id:   null,
        metadata:      { instrument: 'GAD-7', score, severity: severityFor('GAD-7', score), label: p.display_label },
        created_at:    daysAgo((plan.gad7_scores.length - i) * 14),
      })
    })
  }

  // AI risk flag for Client A
  const clientA = patients.find(p => p.display_label === 'Client A')
  if (clientA) {
    rows.push({
      therapist_id:  therapistId,
      patient_id:    clientA.id,
      action:        'AI_RISK_FLAG',
      resource_type: 'triage_flag',
      resource_id:   null,
      metadata:      { risk_level: 'red', instrument: 'PHQ-9', score: 22, label: 'Client A' },
      created_at:    daysAgo(0),
    })
  }

  // Insert in batches of 20
  for (let i = 0; i < rows.length; i += 20) {
    const { error } = await sb.from('audit_log').insert(rows.slice(i, i + 20))
    if (error) throw new Error(`audit_log insert failed: ${error.message}`)
  }
  console.log(`[seed] ${rows.length} audit log entries written`)
}

// ── Step 3 — safety plan on Client A ─────────────────────────
async function seedSafetyPlan(therapistId, patients) {
  const clientA = patients.find(p => p.display_label === 'Client A')
  if (!clientA) return
  const { error } = await sb.from('safety_plans').insert({
    patient_id:                 clientA.id,
    therapist_id:               therapistId,
    warning_signs:              ['Racing thoughts late at night', 'Withdrawing from friends'],
    internal_coping_strategies: ['10-minute walk', 'Box breathing', 'Listen to calming music'],
    social_contacts:            [{ name: 'Sister', phone: '07*** *** ***' }],
    crisis_contacts:            [
      { name: 'Samaritans', phone: '116 123' },
      { name: 'NHS 111 — press 2', phone: '111' },
      { name: 'Shout', phone: 'Text SHOUT to 85258' },
    ],
    professional_contacts:      [{ name: 'GP — Dr Patel', phone: '01*** *** ***' }],
  })
  if (error) throw new Error(`safety_plans insert failed: ${error.message}`)
  console.log('[seed] Safety plan created for Client A')
}

// ── Step 4 — open red triage flag on Client A ────────────────
async function seedTriageFlag(therapistId, patients) {
  const clientA = patients.find(p => p.display_label === 'Client A')
  if (!clientA) return
  const { error } = await sb.from('triage_flags').insert({
    patient_id:     clientA.id,
    therapist_id:   therapistId,
    severity:       'red',
    flag_type:      'phq9_severe',
    summary:        'PHQ-9 severe depression · score 22/27',
    trigger_source: 'outcome_scores',
    trigger_data:   { measure: 'PHQ-9', score: 22 },
    status:         'open',
  })
  if (error) throw new Error(`triage_flags insert failed: ${error.message}`)
  console.log('[seed] Open red triage flag created for Client A')
}

// ── Run ──────────────────────────────────────────────────────
async function main() {
  const therapistId = await ensureDemoTherapist()
  const patients    = await seedPatients(therapistId)
  await seedAuditLog(therapistId, patients)
  await seedSafetyPlan(therapistId, patients)
  await seedTriageFlag(therapistId, patients)

  console.log('\n[seed] ─────────────────────────────────────────')
  console.log('[seed] Demo seed complete.')
  console.log(`[seed] Login:    ${DEMO_EMAIL}`)
  console.log(`[seed] Password: ${DEMO_PASSWORD}`)
  console.log('[seed] ─────────────────────────────────────────\n')
}

main().catch(err => {
  console.error('[seed] FAILED:', err)
  process.exit(1)
})
