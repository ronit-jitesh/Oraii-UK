-- ══════════════════════════════════════════════════════════════
-- ORAII UK — Migration 005 + Therapist Seed
-- Paste ALL of this into:
-- https://supabase.com/dashboard/project/etwlpfigtjnpiftfazig/sql/new
-- Click RUN. Takes ~2 seconds.
-- ══════════════════════════════════════════════════════════════

-- 1. C-SSRS assessments table
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
ALTER TABLE cssrs_assessments DISABLE ROW LEVEL SECURITY;

-- 2. GP letters table
CREATE POLICY "therapist_update_own"
  ON therapists FOR UPDATE
  USING (auth.uid() = auth_user_id);

CREATE POLICY "therapist_insert_own"
  ON therapists FOR INSERT
  WITH CHECK (auth.uid() = auth_user_id);

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
ALTER TABLE gp_letters DISABLE ROW LEVEL SECURITY;

-- 3. Add missing columns to existing tables (safe — IF NOT EXISTS)
ALTER TABLE outcome_scores ADD COLUMN IF NOT EXISTS severity TEXT;
ALTER TABLE outcome_scores ADD COLUMN IF NOT EXISTS measure TEXT;
ALTER TABLE clinical_notes ADD COLUMN IF NOT EXISTS therapist_reviewed_at TIMESTAMPTZ;
ALTER TABLE clinical_notes ADD COLUMN IF NOT EXISTS therapist_id UUID;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS consent_version TEXT DEFAULT '1.0';
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS therapist_id UUID;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS session_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS therapist_id UUID;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS location_type TEXT DEFAULT 'in_person';

-- 4. Backfill measure from instrument
UPDATE outcome_scores SET measure = instrument WHERE measure IS NULL AND instrument IS NOT NULL;

-- 5. Insert a default therapist row for beta testing
-- This ensures therapist_id is never null on inserts
INSERT INTO therapists (
  full_name,
  email,
  professional_body,
  registration_number,
  specialisms
)
SELECT
  'Beta Therapist',
  'beta@oraii.co.uk',
  'BACP',
  'BETA-001',
  ARRAY['Anxiety', 'Depression', 'CBT']
WHERE NOT EXISTS (
  SELECT 1 FROM therapists WHERE email = 'beta@oraii.co.uk'
);

-- 3.5 Fix Data Reset Issues for Patients and Appointments
ALTER TABLE patients 
  ADD COLUMN IF NOT EXISTS age SMALLINT,
  ADD COLUMN IF NOT EXISTS gender TEXT,
  ADD COLUMN IF NOT EXISTS primary_complaint TEXT,
  ADD COLUMN IF NOT EXISTS referral_source TEXT;

DO $$
BEGIN
  IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='appointments' AND column_name='scheduled_at') THEN
      ALTER TABLE appointments RENAME COLUMN scheduled_at TO requested_time;
  END IF;

  IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='appointments' AND column_name='notes') THEN
      ALTER TABLE appointments RENAME COLUMN notes TO reason;
  END IF;
END $$;

ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_status_check;
ALTER TABLE appointments ADD CONSTRAINT appointments_status_check 
  CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no_show'));
-- 6. Verify — you should see all tables listed
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
