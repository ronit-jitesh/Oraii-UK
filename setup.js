#!/usr/bin/env node
// setup.js — ORAII UK complete setup script
// Kills port 3000, applies migration via Supabase REST, starts dev server
// Run: node setup.js

const https  = require('https')
const { execSync, spawn } = require('child_process')

const SUPABASE_URL = 'https://etwlpfigtjnpiftfazig.supabase.co'
const SERVICE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0d2xwZmlndGpucGlmdGZhemlnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTI5MjcwNiwiZXhwIjoyMDkwODY4NzA2fQ.SAidWM0lhJKmr2Z4f12hnke3igitz1lrabhcLVZKVdo'
const ANON_KEY     = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0d2xwZmlndGpucGlmdGZhemlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyOTI3MDYsImV4cCI6MjA5MDg2ODcwNn0.RchRMqSq2WPkLVy6c_IwFOGujZZ-VYpormB5vah2KQQ'

// ── Check table exists via REST HEAD ──────────────────────────
function checkTable(table) {
  return new Promise((resolve) => {
    const req = https.request({
      hostname: 'etwlpfigtjnpiftfazig.supabase.co',
      path: `/rest/v1/${table}?limit=0`,
      method: 'GET',
      headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` },
      timeout: 8000,
    }, (res) => {
      res.resume()
      resolve(res.statusCode)
    })
    req.on('error', () => resolve(0))
    req.on('timeout', () => { req.destroy(); resolve(0) })
    req.end()
  })
}

// ── Execute SQL via Supabase RPC ──────────────────────────────
// We create an exec_sql function first if it doesn't exist
function postJSON(path, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body)
    const req = https.request({
      hostname: 'etwlpfigtjnpiftfazig.supabase.co',
      path,
      method: 'POST',
      headers: {
        'apikey':         SERVICE_KEY,
        'Authorization':  `Bearer ${SERVICE_KEY}`,
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'Prefer':         'return=minimal',
      },
      timeout: 15000,
    }, (res) => {
      let data = ''
      res.on('data', c => data += c)
      res.on('end', () => resolve({ status: res.statusCode, body: data }))
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')) })
    req.write(payload)
    req.end()
  })
}

// ── Main ──────────────────────────────────────────────────────
async function main() {
  console.log('\n╔══════════════════════════════════════╗')
  console.log('║  ORAII UK — Setup & Migration Tool  ║')
  console.log('╚══════════════════════════════════════╝\n')

  // Step 1: Kill port 3000
  console.log('Step 1: Freeing port 3000...')
  try {
    execSync('lsof -ti :3000 | xargs kill -9 2>/dev/null; true', { shell: '/bin/zsh', stdio: 'pipe' })
    console.log('  ✓ Port 3000 freed\n')
  } catch {
    console.log('  ✓ Port 3000 was already free\n')
  }
  await new Promise(r => setTimeout(r, 500))

  // Step 2: Check Supabase connectivity
  console.log('Step 2: Checking Supabase connection...')
  const patientsStatus = await checkTable('patients')
  if (patientsStatus === 0) {
    console.log('  ✗ Cannot reach Supabase — check internet connection')
    process.exit(1)
  }
  console.log(`  ✓ Connected (patients table: HTTP ${patientsStatus})\n`)

  // Step 3: Check which tables exist
  console.log('Step 3: Checking tables...')
  const tableChecks = {
    patients:           await checkTable('patients'),
    sessions:           await checkTable('sessions'),
    clinical_notes:     await checkTable('clinical_notes'),
    outcome_scores:     await checkTable('outcome_scores'),
    appointments:       await checkTable('appointments'),
    safety_plans:       await checkTable('safety_plans'),
    cssrs_assessments:  await checkTable('cssrs_assessments'),
    gp_letters:         await checkTable('gp_letters'),
  }

  for (const [table, status] of Object.entries(tableChecks)) {
    const ok = status === 200 || status === 206
    console.log(`  ${ok ? '✓' : '✗'} ${table} (${status})`)
  }

  const needsCssrs = tableChecks.cssrs_assessments !== 200 && tableChecks.cssrs_assessments !== 206
  const needsGP    = tableChecks.gp_letters !== 200 && tableChecks.gp_letters !== 206

  if (!needsCssrs && !needsGP) {
    console.log('\n  ✓ All required tables exist — no migration needed\n')
  } else {
    console.log(`\n  ⚠ Missing tables: ${[needsCssrs && 'cssrs_assessments', needsGP && 'gp_letters'].filter(Boolean).join(', ')}`)
    console.log('\n  → You need to run the migration SQL in Supabase.\n')
    console.log('  Open this URL in your browser:')
    console.log('  https://supabase.com/dashboard/project/etwlpfigtjnpiftfazig/sql/new\n')
    console.log('  Then paste the SQL from:')
    console.log('  /Users/ronitjitesh/Documents/oraii-uk/infra/supabase/migrations/005_complete_beta_schema.sql\n')
    console.log('  Or paste this directly:\n')
    console.log('─'.repeat(60))
    console.log(MIGRATION_SQL)
    console.log('─'.repeat(60))
  }

  // Step 4: Start dev server
  console.log('\nStep 4: Starting clinic portal on http://localhost:3000 ...\n')
  const dev = spawn('npm', ['run', 'dev:clinic'], {
    cwd: '/Users/ronitjitesh/Documents/oraii-uk',
    stdio: 'inherit',
    shell: true,
  })
  dev.on('error', err => console.error('Failed to start:', err))
}

const MIGRATION_SQL = `
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

SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
`

main().catch(console.error)
