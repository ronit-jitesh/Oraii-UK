#!/usr/bin/env node
// apply-migration.js — applies migration 005 to Supabase
// Uses the correct Supabase Management API (not REST pg endpoint)
// Usage: node apply-migration.js

const https = require('https')

const SUPABASE_URL  = 'https://etwlpfigtjnpiftfazig.supabase.co'
const SERVICE_KEY   = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0d2xwZmlndGpucGlmdGZhemlnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTI5MjcwNiwiZXhwIjoyMDkwODY4NzA2fQ.SAidWM0lhJKmr2Z4f12hnke3igitz1lrabhcLVZKVdo'
const PROJECT_REF   = 'etwlpfigtjnpiftfazig'

// Run SQL via Supabase's RPC exec mechanism
// We call a Postgres function that wraps DDL — this avoids needing the Management API
async function runSQL(sql) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query: sql })
    const url  = new URL(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`)

    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'apikey':        SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type':  'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => resolve({ status: res.statusCode, body: data }))
    })
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

// Alternative: use Supabase's direct table API to check what exists
async function checkTable(tableName) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: new URL(SUPABASE_URL).hostname,
      path: `/rest/v1/${tableName}?limit=0`,
      method: 'GET',
      headers: {
        'apikey':        SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
      },
    }
    const req = https.request(options, (res) => {
      res.on('data', () => {})
      res.on('end', () => resolve(res.statusCode))
    })
    req.on('error', reject)
    req.end()
  })
}

// Use Supabase's postgres endpoint via the correct path
async function execSQL(sql) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query: sql })
    const options = {
      hostname: `${PROJECT_REF}.supabase.co`,
      path: '/rest/v1/rpc/query',
      method: 'POST',
      headers: {
        'apikey':         SERVICE_KEY,
        'Authorization':  `Bearer ${SERVICE_KEY}`,
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(body),
        'Prefer':         'return=minimal',
      },
    }
    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => resolve({ status: res.statusCode, body: data }))
    })
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

async function main() {
  console.log('ORAII UK — Migration 005 Checker\n')
  console.log('Checking which tables already exist...\n')

  const tables = ['patients', 'sessions', 'clinical_notes', 'outcome_scores', 'appointments', 'safety_plans', 'cssrs_assessments', 'gp_letters']

  const existing = []
  const missing  = []

  for (const t of tables) {
    const status = await checkTable(t)
    if (status === 200 || status === 206) {
      existing.push(t)
      console.log(`  ✓ ${t}`)
    } else if (status === 406 || status === 200) {
      existing.push(t)
      console.log(`  ✓ ${t}`)
    } else {
      missing.push(t)
      console.log(`  ✗ ${t} (status: ${status} — needs creating)`)
    }
  }

  console.log('\n─────────────────────────────────────────')
  console.log(`\nExisting: ${existing.join(', ') || 'none'}`)
  console.log(`Missing:  ${missing.join(', ') || 'none — all tables exist!'}`)

  if (missing.length === 0) {
    console.log('\n✓ All tables exist. Migration not needed.')
    console.log('\nIf cssrs_assessments is missing columns (supervisor_notified, etc.),')
    console.log('paste the SQL below into the Supabase SQL Editor:\n')
    console.log('https://supabase.com/dashboard/project/etwlpfigtjnpiftfazig/sql/new\n')
  } else {
    console.log('\n⚠ Some tables are missing. You need to run the migration SQL.')
    console.log('\nOpen this URL and paste the SQL from the file shown:')
    console.log('https://supabase.com/dashboard/project/etwlpfigtjnpiftfazig/sql/new')
    console.log('\nFile: /Users/ronitjitesh/Documents/oraii-uk/infra/supabase/migrations/005_complete_beta_schema.sql\n')
  }

  console.log('\n─────────────────────────────────────────')
  console.log('\nSQL to paste in Supabase SQL Editor:\n')
  console.log(`-- Run this in: https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new`)
  console.log(`
CREATE TABLE IF NOT EXISTS cssrs_assessments (
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
);

CREATE TABLE IF NOT EXISTS gp_letters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id),
  therapist_id UUID,
  gp_name TEXT,
  practice_name TEXT,
  letter_content TEXT NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ
);

ALTER TABLE outcome_scores ADD COLUMN IF NOT EXISTS severity TEXT;
ALTER TABLE outcome_scores ADD COLUMN IF NOT EXISTS measure TEXT;
UPDATE outcome_scores SET measure = instrument WHERE measure IS NULL AND instrument IS NOT NULL;
ALTER TABLE clinical_notes ADD COLUMN IF NOT EXISTS therapist_reviewed_at TIMESTAMPTZ;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS consent_version TEXT DEFAULT '1.0';
ALTER TABLE cssrs_assessments DISABLE ROW LEVEL SECURITY;
ALTER TABLE gp_letters DISABLE ROW LEVEL SECURITY;

-- Verify
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
`)
}

main().catch(console.error)
