-- ══════════════════════════════════════════════════════════════
-- ORAII UK — Simplified Working Schema
-- Run this in Supabase SQL Editor
-- Removes hard auth dependencies so it works during development
-- ══════════════════════════════════════════════════════════════

-- Patients (pseudonymous — no real names)
CREATE TABLE IF NOT EXISTS patients (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id         UUID,
  display_label        TEXT NOT NULL,
  consent_given        BOOLEAN NOT NULL DEFAULT FALSE,
  consent_date         TIMESTAMPTZ,
  consent_version      TEXT DEFAULT '1.0',
  portal_auth_user_id  UUID,
  presenting_problem   TEXT,
  age                  INTEGER,
  gender               TEXT,
  referral_source      TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- Sessions
CREATE TABLE IF NOT EXISTS sessions (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id             UUID,
  patient_id               UUID REFERENCES patients(id) ON DELETE CASCADE,
  session_date             DATE DEFAULT CURRENT_DATE,
  duration_minutes         INTEGER,
  note_format              TEXT DEFAULT 'SOAP',
  audio_consent_given      BOOLEAN NOT NULL DEFAULT FALSE,
  audio_consent_timestamp  TIMESTAMPTZ,
  status                   TEXT NOT NULL DEFAULT 'draft',
  created_at               TIMESTAMPTZ DEFAULT NOW(),
  updated_at               TIMESTAMPTZ DEFAULT NOW()
);

-- Clinical Notes
CREATE TABLE IF NOT EXISTS clinical_notes (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id             UUID REFERENCES sessions(id) ON DELETE CASCADE,
  therapist_id           UUID,
  patient_id             UUID REFERENCES patients(id),
  format                 TEXT NOT NULL DEFAULT 'SOAP',
  content                TEXT NOT NULL,
  ai_generated           BOOLEAN NOT NULL DEFAULT TRUE,
  therapist_reviewed     BOOLEAN NOT NULL DEFAULT FALSE,
  therapist_reviewed_at  TIMESTAMPTZ,
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW()
);

-- Outcome Scores (PHQ-9, GAD-7, CORE-10, WEMWBS)
CREATE TABLE IF NOT EXISTS outcome_scores (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id       UUID REFERENCES patients(id),
  therapist_id     UUID,
  session_id       UUID REFERENCES sessions(id),
  instrument       TEXT NOT NULL,
  score            INTEGER NOT NULL,
  responses        JSONB DEFAULT '{}',
  administered_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Appointments
CREATE TABLE IF NOT EXISTS appointments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id     UUID,
  patient_id       UUID REFERENCES patients(id) ON DELETE CASCADE,
  requested_time   TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 50,
  location_type    TEXT DEFAULT 'in_person',
  status           TEXT DEFAULT 'pending',
  reason           TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Patient Consents (UK-GDPR Article 9)
CREATE TABLE IF NOT EXISTS patient_consents (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id        UUID REFERENCES patients(id) ON DELETE CASCADE UNIQUE,
  treatment         BOOLEAN DEFAULT FALSE,
  data_processing   BOOLEAN DEFAULT FALSE,
  recording         BOOLEAN DEFAULT FALSE,
  ai_processing     BOOLEAN DEFAULT FALSE,
  data_sharing      BOOLEAN DEFAULT FALSE,
  consent_timestamp TIMESTAMPTZ DEFAULT NOW(),
  legal_basis       TEXT DEFAULT 'UK-GDPR Article 9(2)(a)',
  data_retention_years INTEGER DEFAULT 7
);

-- Therapists
CREATE TABLE IF NOT EXISTS therapists (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id        UUID UNIQUE,
  email               TEXT UNIQUE,
  full_name           TEXT NOT NULL,
  professional_body   TEXT DEFAULT 'BACP',
  registration_number TEXT DEFAULT 'PENDING',
  specialisms         TEXT[] DEFAULT '{}',
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Journal Entries (patient portal)
CREATE TABLE IF NOT EXISTS journal_entries (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id         UUID REFERENCES patients(id),
  content            TEXT NOT NULL,
  mood_score         INTEGER CHECK (mood_score BETWEEN 1 AND 10),
  therapist_can_view BOOLEAN DEFAULT FALSE,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

-- Safety Plans
CREATE TABLE IF NOT EXISTS safety_plans (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id                 UUID REFERENCES patients(id),
  therapist_id               UUID,
  warning_signs              TEXT[] DEFAULT '{}',
  internal_coping_strategies TEXT[] DEFAULT '{}',
  social_contacts            JSONB DEFAULT '[]',
  crisis_contacts            JSONB DEFAULT '[]',
  professional_contacts      JSONB DEFAULT '[]',
  created_at                 TIMESTAMPTZ DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ DEFAULT NOW()
);

-- Updated-at trigger
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER set_updated_at_patients
  BEFORE UPDATE ON patients
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE OR REPLACE TRIGGER set_updated_at_sessions
  BEFORE UPDATE ON sessions
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE OR REPLACE TRIGGER set_updated_at_appointments
  BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- Disable RLS on all tables so dev works without auth
ALTER TABLE patients         DISABLE ROW LEVEL SECURITY;
ALTER TABLE sessions         DISABLE ROW LEVEL SECURITY;
ALTER TABLE clinical_notes   DISABLE ROW LEVEL SECURITY;
ALTER TABLE outcome_scores   DISABLE ROW LEVEL SECURITY;
ALTER TABLE appointments     DISABLE ROW LEVEL SECURITY;
ALTER TABLE patient_consents DISABLE ROW LEVEL SECURITY;
ALTER TABLE therapists       DISABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries  DISABLE ROW LEVEL SECURITY;
ALTER TABLE safety_plans     DISABLE ROW LEVEL SECURITY;

-- Verify all tables created
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
