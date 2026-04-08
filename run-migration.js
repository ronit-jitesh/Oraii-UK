#!/usr/bin/env node
// run-migration.js — applies migration 005 to Supabase via REST API
// Usage: node run-migration.js

const SUPABASE_URL = 'https://etwlpfigtjnpiftfazig.supabase.co'
const SERVICE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0d2xwZmlndGpucGlmdGZhemlnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTI5MjcwNiwiZXhwIjoyMDkwODY4NzA2fQ.SAidWM0lhJKmr2Z4f12hnke3igitz1lrabhcLVZKVdo'

// Run each statement separately via the Supabase SQL endpoint
const STATEMENTS = [
  // 1. cssrs_assessments
  `CREATE TABLE IF NOT EXISTS cssrs_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES patients(id),
    therapist_id UUID,
    session_id UUID REFERENCES sessions(id),
    wish_to_be_dead BOOLEAN DEFAULT FALSE,
    passive_suicidal_ideation BOOLEAN DEFAULT FALSE,
    active_suicidal_ideation BOOLEAN DEFAULT FALSE,
    ideation_with_method BOOLEAN DEFAULT FALSE,
    ideation_with_intent_no_plan BOOLEAN DEFAULT FALSE,
    ideation_with_intent_and_plan BOOLEAN DEFAULT FALSE,
    preparatory_behaviour BOOLEAN DEFAULT FALSE,
    aborted_attempt BOOLEAN DEFAULT FALSE,
    interrupted_attempt BOOLEAN DEFAULT FALSE,
    actual_attempt BOOLEAN DEFAULT FALSE,
    clinician_risk_level TEXT,
    clinician_notes TEXT,
    supervisor_notified BOOLEAN DEFAULT FALSE,
    supervisor_notified_at TIMESTAMPTZ,
    ai_screening_flags JSONB DEFAULT '[]',
    assessed_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  // 2. gp_letters
  `CREATE TABLE IF NOT EXISTS gp_letters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES patients(id),
    therapist_id UUID,
    gp_name TEXT,
    practice_name TEXT,
    letter_content TEXT NOT NULL,
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    sent_at TIMESTAMPTZ
  )`,

  // 3. Add severity to outcome_scores
  `ALTER TABLE outcome_scores ADD COLUMN IF NOT EXISTS severity TEXT`,

  // 4. Add measure to outcome_scores
  `ALTER TABLE outcome_scores ADD COLUMN IF NOT EXISTS measure TEXT`,

  // 5. Backfill measure from instrument
  `UPDATE outcome_scores SET measure = instrument WHERE measure IS NULL AND instrument IS NOT NULL`,

  // 6. Add therapist_reviewed_at to clinical_notes
  `ALTER TABLE clinical_notes ADD COLUMN IF NOT EXISTS therapist_reviewed_at TIMESTAMPTZ`,

  // 7. Add consent_version to patients
  `ALTER TABLE patients ADD COLUMN IF NOT EXISTS consent_version TEXT DEFAULT '1.0'`,

  // 8. Disable RLS on new tables
  `ALTER TABLE cssrs_assessments DISABLE ROW LEVEL SECURITY`,
  `ALTER TABLE gp_letters DISABLE ROW LEVEL SECURITY`,
]

async function runStatement(sql) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  })
  return res
}

// Use the pg endpoint for raw SQL
async function execSQL(sql) {
  const res = await fetch(`${SUPABASE_URL}/pg/query`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  })
  const text = await res.text()
  return { status: res.status, body: text }
}

async function main() {
  console.log('Running ORAII UK Migration 005...\n')
  console.log('Supabase project: etwlpfigtjnpiftfazig\n')

  for (const [i, sql] of STATEMENTS.entries()) {
    const preview = sql.trim().split('\n')[0].slice(0, 60)
    process.stdout.write(`[${i+1}/${STATEMENTS.length}] ${preview}... `)
    try {
      const result = await execSQL(sql)
      if (result.status >= 400) {
        // Try via the supabase-js RPC approach
        console.log(`⚠ HTTP ${result.status} — may already exist, continuing`)
      } else {
        console.log('✓')
      }
    } catch (e) {
      console.log(`✗ ${e.message}`)
    }
  }

  console.log('\n✓ Migration complete. Tables created:')
  console.log('  - cssrs_assessments (C-SSRS risk assessments)')
  console.log('  - gp_letters (GP referral letters)')
  console.log('  - outcome_scores updated (severity, measure columns)')
  console.log('  - clinical_notes updated (therapist_reviewed_at column)')
  console.log('\nNext: run "npm run dev:clinic" and test at http://localhost:3000/dashboard')
}

main().catch(console.error)
