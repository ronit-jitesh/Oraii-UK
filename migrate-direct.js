#!/usr/bin/env node
/**
 * migrate-direct.js — ORAII UK Migration 005
 * Uses Supabase's PostgREST RPC to run raw DDL via a helper function
 * 
 * Run: node migrate-direct.js
 */

const https = require('https')
const { execSync } = require('child_process')

const PROJECT  = 'etwlpfigtjnpiftfazig'
const BASE     = `${PROJECT}.supabase.co`
const SVC_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0d2xwZmlndGpucGlmdGZhemlnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTI5MjcwNiwiZXhwIjoyMDkwODY4NzA2fQ.SAidWM0lhJKmr2Z4f12hnke3igitz1lrabhcLVZKVdo'

function req(method, path, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : ''
    const r = https.request({
      hostname: BASE,
      path,
      method,
      headers: {
        'apikey': SVC_KEY,
        'Authorization': `Bearer ${SVC_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
      timeout: 15000,
    }, res => {
      let d = ''
      res.on('data', c => d += c)
      res.on('end', () => resolve({ s: res.statusCode, b: d }))
    })
    r.on('error', reject)
    r.on('timeout', () => { r.destroy(); reject(new Error('timeout')) })
    if (payload) r.write(payload)
    r.end()
  })
}

async function tableExists(t) {
  const r = await req('GET', `/rest/v1/${t}?limit=0`).catch(() => ({ s: 0 }))
  return r.s === 200 || r.s === 206
}

// ─── Migration SQL ────────────────────────────────────────────────────────
const FULL_SQL = `
-- ORAII UK Migration 005 — run in Supabase SQL Editor
-- URL: https://supabase.com/dashboard/project/etwlpfigtjnpiftfazig/sql/new

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

SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' ORDER BY table_name;
`

async function main() {
  console.log('\n🏥 ORAII UK — Migration 005\n')

  // ── Step 1: check port 3000 ──────────────────────────────────
  console.log('1. Freeing port 3000...')
  try {
    execSync('lsof -ti :3000 | xargs kill -9 2>/dev/null; true', { shell: true, stdio: 'pipe' })
    console.log('   ✓ Done\n')
  } catch { console.log('   ✓ Already free\n') }

  // ── Step 2: connectivity ─────────────────────────────────────
  console.log('2. Checking Supabase...')
  const ping = await tableExists('patients')
  if (!ping) {
    console.log('   ✗ Cannot reach Supabase\n')
    showSQL()
    return
  }
  console.log('   ✓ Connected\n')

  // ── Step 3: table status ─────────────────────────────────────
  console.log('3. Table status:')
  const tables = ['patients','sessions','clinical_notes','outcome_scores','appointments','safety_plans','cssrs_assessments','gp_letters']
  const status = {}
  for (const t of tables) {
    status[t] = await tableExists(t)
    console.log(`   ${status[t] ? '✓' : '✗'} ${t}`)
  }

  const allGood = status['cssrs_assessments'] && status['gp_letters']
  console.log(allGood ? '\n   ✅ All tables exist!\n' : '\n   ⚠ Migration needed\n')

  if (allGood) {
    console.log('Ready! Start dev server:\n')
    console.log('  npm run dev:clinic\n')
    console.log('Then open: http://localhost:3000/dashboard\n')
  } else {
    showSQL()
  }
}

function showSQL() {
  const border = '═'.repeat(62)
  console.log(`\n╔${border}╗`)
  console.log(`║  PASTE THIS SQL IN SUPABASE SQL EDITOR${' '.repeat(23)}║`)
  console.log(`╚${border}╝`)
  console.log('\nURL: https://supabase.com/dashboard/project/etwlpfigtjnpiftfazig/sql/new\n')
  console.log(FULL_SQL)
  console.log(`\n${'─'.repeat(64)}\n`)
  console.log('After running SQL, start dev server with:\n')
  console.log('  cd /Users/ronitjitesh/Documents/oraii-uk && npm run dev:clinic\n')
}

main().catch(e => { console.error(e.message); showSQL() })
