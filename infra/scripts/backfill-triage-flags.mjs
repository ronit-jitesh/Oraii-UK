#!/usr/bin/env node
/**
 * Backfill triage flags — ONE consolidated flag per patient based on
 * their LATEST PHQ-9 + GAD-7 scores.  Removes old per-score flags
 * first, then creates a single summary flag per patient.
 *
 * Usage:  node infra/scripts/backfill-triage-flags.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dirname, '../../.env.local')
for (const line of readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.match(/^([^#=]+)=(.*)$/)
  if (m) process.env[m[1].trim()] = m[2].trim()
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) { console.error('Missing SUPABASE env vars'); process.exit(1) }
const sb = createClient(url, key)

// ── Severity bands ────────────────────────────────────────────────
function phq9Band(score) {
  if (score >= 20) return 'Severe'
  if (score >= 15) return 'Moderately severe'
  if (score >= 10) return 'Moderate'
  if (score >= 5)  return 'Mild'
  return 'Minimal'
}
function gad7Band(score) {
  if (score >= 15) return 'Severe'
  if (score >= 10) return 'Moderate'
  if (score >= 5)  return 'Mild'
  return 'Minimal'
}

function classifyOverall(phq9Score, gad7Score, phq9Q9) {
  // Q9 self-harm ideation always red
  if (typeof phq9Q9 === 'number' && phq9Q9 >= 1) {
    return {
      severity: 'red',
      flagType: 'phq9_q9_positive',
      summary: `PHQ-9 Q9 positive (self-harm ideation) · PHQ-9 ${phq9Score ?? '—'} (${phq9Score != null ? phq9Band(phq9Score) : '—'}) · GAD-7 ${gad7Score ?? '—'} (${gad7Score != null ? gad7Band(gad7Score) : '—'})`,
    }
  }

  const maxScore = Math.max(phq9Score ?? 0, gad7Score ?? 0)

  // Red: PHQ-9 ≥ 20 or GAD-7 ≥ 15
  if ((phq9Score ?? 0) >= 20 || (gad7Score ?? 0) >= 15) {
    return {
      severity: 'red',
      flagType: (phq9Score ?? 0) >= 20 ? 'phq9_severe' : 'gad7_severe',
      summary: `PHQ-9 ${phq9Score ?? '—'} (${phq9Score != null ? phq9Band(phq9Score) : '—'}) · GAD-7 ${gad7Score ?? '—'} (${gad7Score != null ? gad7Band(gad7Score) : '—'})`,
    }
  }

  // Amber: PHQ-9 ≥ 10 or GAD-7 ≥ 10
  if ((phq9Score ?? 0) >= 10 || (gad7Score ?? 0) >= 10) {
    return {
      severity: 'amber',
      flagType: (phq9Score ?? 0) >= (gad7Score ?? 0) ? 'phq9_high' : 'gad7_high',
      summary: `PHQ-9 ${phq9Score ?? '—'} (${phq9Score != null ? phq9Band(phq9Score) : '—'}) · GAD-7 ${gad7Score ?? '—'} (${gad7Score != null ? gad7Band(gad7Score) : '—'})`,
    }
  }

  // Green: all scored patients
  return {
    severity: 'green',
    flagType: 'phq9_high', // generic
    summary: `PHQ-9 ${phq9Score ?? '—'} (${phq9Score != null ? phq9Band(phq9Score) : '—'}) · GAD-7 ${gad7Score ?? '—'} (${gad7Score != null ? gad7Band(gad7Score) : '—'})`,
  }
}

async function main() {
  // 1. Delete ALL existing outcome_scores-triggered flags (the old per-score ones)
  const { error: delErr } = await sb
    .from('triage_flags')
    .delete()
    .eq('trigger_source', 'outcome_scores')
  if (delErr) console.error('Warning: delete old flags failed:', delErr.message)
  else console.log('✓ Cleaned up old per-score triage flags')

  // 2. Fetch all outcome scores
  const { data: scores, error: scErr } = await sb
    .from('outcome_scores')
    .select('id, patient_id, therapist_id, instrument, score, responses, administered_at')
    .order('administered_at', { ascending: true })
  if (scErr) { console.error('Failed to fetch outcome_scores:', scErr.message); process.exit(1) }
  console.log(`Found ${scores.length} outcome score(s)`)

  // 3. Group by patient, find LATEST PHQ-9 and LATEST GAD-7 per patient
  const patientMap = new Map()  // patient_id -> { phq9, gad7, therapistId }

  for (const s of scores) {
    if (!patientMap.has(s.patient_id)) {
      patientMap.set(s.patient_id, { phq9: null, gad7: null, therapistId: s.therapist_id })
    }
    const entry = patientMap.get(s.patient_id)
    if (!entry.therapistId) entry.therapistId = s.therapist_id

    const inst = (s.instrument || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
    if (inst === 'PHQ9') {
      // Keep the latest (scores are ordered by administered_at ascending)
      entry.phq9 = { score: s.score, q9: s.responses?.q9 ?? s.responses?.['9'] ?? undefined, id: s.id }
    } else if (inst === 'GAD7') {
      entry.gad7 = { score: s.score, id: s.id }
    }
  }

  // 4. For any patient without a therapist_id on scores, look it up
  for (const [patientId, entry] of patientMap) {
    if (!entry.therapistId) {
      const { data: patient } = await sb.from('patients').select('therapist_id').eq('id', patientId).single()
      entry.therapistId = patient?.therapist_id
    }
  }

  // 5. Create ONE consolidated flag per patient
  let created = 0, skipped = 0

  for (const [patientId, entry] of patientMap) {
    if (!entry.therapistId) { skipped++; continue }

    const phq9Score = entry.phq9?.score ?? null
    const gad7Score = entry.gad7?.score ?? null
    const q9 = entry.phq9?.q9

    const verdict = classifyOverall(phq9Score, gad7Score, q9)

    const { error: insertErr } = await sb.from('triage_flags').insert({
      patient_id:     patientId,
      therapist_id:   entry.therapistId,
      severity:       verdict.severity,
      flag_type:      verdict.flagType,
      summary:        verdict.summary,
      trigger_source: 'outcome_scores',
      source_id:      null,  // consolidated — no single source
      trigger_data:   { phq9: phq9Score, gad7: gad7Score, consolidated: true },
      status:         'open',
    })

    if (insertErr) {
      console.error(`  ✗ Flag for patient ${patientId} failed:`, insertErr.message)
    } else {
      console.log(`  ✓ ${verdict.severity.toUpperCase().padEnd(5)} ${verdict.summary}`)
      created++
    }
  }

  console.log(`\nDone. Created: ${created} consolidated flags | Skipped (no therapist): ${skipped}`)
}

main().catch(e => { console.error(e); process.exit(1) })
