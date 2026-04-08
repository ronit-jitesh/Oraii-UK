#!/usr/bin/env node
// migrate.js — applies ORAII UK migration 005 using Supabase Management API
// The Management API supports raw SQL execution unlike the REST API
// Run: node migrate.js

const https = require('https')

const PROJECT_REF = 'etwlpfigtjnpiftfazig'
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0d2xwZmlndGpucGlmdGZhemlnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTI5MjcwNiwiZXhwIjoyMDkwODY4NzA2fQ.SAidWM0lhJKmr2Z4f12hnke3igitz1lrabhcLVZKVdo'

function post(hostname, path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const payload = typeof body === 'string' ? body : JSON.stringify(body)
    const req = https.request({
      hostname,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        ...headers,
      },
      timeout: 20000,
    }, res => {
      let data = ''
      res.on('data', c => data += c)
      res.on('end', () => resolve({ status: res.statusCode, body: data }))
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')) })
    req.write(payload)
    req.end()
  })
}

function get(hostname, path, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request({ hostname, path, method: 'GET', headers, timeout: 10000 }, res => {
      let data = ''
      res.on('data', c => data += c)
      res.on('end', () => resolve({ status: res.statusCode, body: data }))
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')) })
    req.end()
  })
}

// ── SQL statements to run ─────────────────────────────────────
const SQL_STEPS = [
  {
    name: 'Create cssrs_assessments',
    sql: `CREATE TABLE IF NOT EXISTS cssrs_assessments (
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
);`,
  },
  {
    name: 'Create gp_letters',
    sql: `CREATE TABLE IF NOT EXISTS gp_letters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id),
  therapist_id UUID,
  gp_name TEXT,
  practice_name TEXT,
  letter_content TEXT NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ
);`,
  },
  {
    name: 'Add severity to outcome_scores',
    sql: `ALTER TABLE outcome_scores ADD COLUMN IF NOT EXISTS severity TEXT;`,
  },
  {
    name: 'Add measure to outcome_scores',
    sql: `ALTER TABLE outcome_scores ADD COLUMN IF NOT EXISTS measure TEXT;`,
  },
  {
    name: 'Backfill measure from instrument',
    sql: `UPDATE outcome_scores SET measure = instrument WHERE measure IS NULL AND instrument IS NOT NULL;`,
  },
  {
    name: 'Add therapist_reviewed_at to clinical_notes',
    sql: `ALTER TABLE clinical_notes ADD COLUMN IF NOT EXISTS therapist_reviewed_at TIMESTAMPTZ;`,
  },
  {
    name: 'Add consent_version to patients',
    sql: `ALTER TABLE patients ADD COLUMN IF NOT EXISTS consent_version TEXT DEFAULT '1.0';`,
  },
  {
    name: 'Disable RLS on cssrs_assessments',
    sql: `ALTER TABLE cssrs_assessments DISABLE ROW LEVEL SECURITY;`,
  },
  {
    name: 'Disable RLS on gp_letters',
    sql: `ALTER TABLE gp_letters DISABLE ROW LEVEL SECURITY;`,
  },
]

async function execViaManagementAPI(sql) {
  // Supabase Management API: POST /v1/projects/{ref}/database/query
  return post(
    'api.supabase.com',
    `/v1/projects/${PROJECT_REF}/database/query`,
    { query: sql },
    { 'Authorization': `Bearer ${SERVICE_KEY}` }
  )
}

async function execViaPgRest(sql) {
  // Try via the db-connect edge function if available
  return post(
    `${PROJECT_REF}.supabase.co`,
    '/functions/v1/exec-sql',
    { sql },
    {
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'apikey': SERVICE_KEY,
    }
  )
}

async function checkTableExists(table) {
  const r = await get(
    `${PROJECT_REF}.supabase.co`,
    `/rest/v1/${table}?limit=0`,
    { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` }
  )
  return r.status === 200 || r.status === 206
}

async function main() {
  console.log('\n╔══════════════════════════════════════════╗')
  console.log('║  ORAII UK Migration 005 — Direct Apply  ║')
  console.log('╚══════════════════════════════════════════╝\n')

  // Check connectivity first
  console.log('Checking Supabase connectivity...')
  const connCheck = await get(
    `${PROJECT_REF}.supabase.co`,
    '/rest/v1/patients?limit=0',
    { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` }
  ).catch(() => ({ status: 0 }))

  if (connCheck.status === 0) {
    console.log('✗ Cannot reach Supabase — no internet from this terminal?\n')
    printManualSQL()
    return
  }
  console.log(`✓ Connected to Supabase (HTTP ${connCheck.status})\n`)

  // Check existing tables
  console.log('Table status:')
  const cssrsExists = await checkTableExists('cssrs_assessments')
  const gpExists    = await checkTableExists('gp_letters')
  console.log(`  cssrs_assessments: ${cssrsExists ? '✓ exists' : '✗ missing'}`)
  console.log(`  gp_letters:        ${gpExists    ? '✓ exists' : '✗ missing'}\n`)

  if (cssrsExists && gpExists) {
    console.log('✓ All tables already exist — migration complete!\n')
    return
  }

  // Try Management API
  console.log('Applying migration via Management API...')
  let apiWorked = false

  for (const step of SQL_STEPS) {
    process.stdout.write(`  ${step.name}... `)
    try {
      const r = await execViaManagementAPI(step.sql)
      if (r.status >= 200 && r.status < 300) {
        console.log('✓')
        apiWorked = true
      } else if (r.status === 401 || r.status === 403) {
        console.log(`⚠ Auth error (${r.status}) — Management API needs personal access token`)
        break
      } else {
        const err = (() => { try { return JSON.parse(r.body) } catch { return { message: r.body.slice(0, 100) } } })()
        console.log(`⚠ ${r.status}: ${err.message || r.body.slice(0, 60)}`)
      }
    } catch (e) {
      console.log(`✗ ${e.message}`)
      break
    }
  }

  if (!apiWorked) {
    console.log('\n⚠ Management API not accessible from this context.')
    printManualSQL()
  } else {
    // Verify
    const cssrsNow = await checkTableExists('cssrs_assessments')
    const gpNow    = await checkTableExists('gp_letters')
    if (cssrsNow && gpNow) {
      console.log('\n✅ Migration applied successfully!')
      console.log('   cssrs_assessments ✓')
      console.log('   gp_letters ✓\n')
    } else {
      console.log('\n⚠ Some tables still missing — run manual SQL below')
      printManualSQL()
    }
  }
}

function printManualSQL() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('MANUAL STEP: Copy this URL and run the SQL below')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`\nURL: https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new\n`)
  console.log('SQL to paste:\n')
  console.log(SQL_STEPS.map(s => s.sql).join('\n\n'))
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
}

main().catch(console.error)
