-- ══════════════════════════════════════════════════════════════
-- ORAII UK — Migration 005: Complete Beta Schema
-- Run in Supabase SQL Editor (dashboard.supabase.com)
-- This is idempotent — safe to run multiple times
-- ══════════════════════════════════════════════════════════════

-- ── 1. C-SSRS Assessments (new table) ────────────────────────
CREATE TABLE IF NOT EXISTS cssrs_assessments (
  id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id                      UUID REFERENCES patients(id),
  therapist_id                    UUID,
  session_id                      UUID REFERENCES sessions(id),
  -- Ideation items
  wish_to_be_dead                 BOOLEAN DEFAULT FALSE,
  passive_suicidal_ideation       BOOLEAN DEFAULT FALSE,
  active_suicidal_ideation        BOOLEAN DEFAULT FALSE,
  ideation_with_method            BOOLEAN DEFAULT FALSE,
  ideation_with_intent_no_plan    BOOLEAN DEFAULT FALSE,
  ideation_with_intent_and_plan   BOOLEAN DEFAULT FALSE,
  -- Behaviour items
  preparatory_behaviour           BOOLEAN DEFAULT FALSE,
  aborted_attempt                 BOOLEAN DEFAULT FALSE,
  interrupted_attempt             BOOLEAN DEFAULT FALSE,
  actual_attempt                  BOOLEAN DEFAULT FALSE,
  -- Clinician fields (never AI-populated)
  clinician_risk_level            TEXT CHECK (clinician_risk_level IN ('low','moderate','high','imminent')),
  clinician_notes                 TEXT,
  supervisor_notified             BOOLEAN DEFAULT FALSE,
  supervisor_notified_at          TIMESTAMPTZ,
  ai_screening_flags              JSONB DEFAULT '[]',
  assessed_at                     TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. GP Letters (new table) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS gp_letters (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      UUID REFERENCES patients(id),
  therapist_id    UUID,
  gp_name         TEXT,
  practice_name   TEXT,
  letter_content  TEXT NOT NULL,
  generated_at    TIMESTAMPTZ DEFAULT NOW(),
  sent_at         TIMESTAMPTZ
);

-- ── 3. outcome_scores: add severity + measure alias ───────────
ALTER TABLE outcome_scores
  ADD COLUMN IF NOT EXISTS severity TEXT,
  ADD COLUMN IF NOT EXISTS measure  TEXT;

-- Backfill measure from instrument
UPDATE outcome_scores SET measure = instrument WHERE measure IS NULL AND instrument IS NOT NULL;

-- ── 4. clinical_notes: add therapist_reviewed_at if missing ──
ALTER TABLE clinical_notes
  ADD COLUMN IF NOT EXISTS therapist_reviewed_at TIMESTAMPTZ;

-- ── 5. patients: add missing fields ──────────────────────────
ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS consent_version TEXT DEFAULT '1.0';

-- ── 6. Disable RLS on new tables (dev mode) ──────────────────
ALTER TABLE cssrs_assessments DISABLE ROW LEVEL SECURITY;
ALTER TABLE gp_letters        DISABLE ROW LEVEL SECURITY;

-- ── 7. Verify ────────────────────────────────────────────────
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
