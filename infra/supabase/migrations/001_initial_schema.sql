-- ══════════════════════════════════════════════════════════════
-- ORAII UK — Initial Schema
-- Supabase project region: eu-west-2 (London)
-- UK-GDPR: all patient identifiers are pseudonymous UUIDs
-- Real patient names are NEVER stored in this database
-- ══════════════════════════════════════════════════════════════

-- ── Therapists ──────────────────────────────────────────────
CREATE TABLE therapists (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id        UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email               TEXT NOT NULL UNIQUE,
  full_name           TEXT NOT NULL,
  professional_body   TEXT NOT NULL CHECK (professional_body IN ('BACP','UKCP','BPS','HCPC','OTHER')),
  registration_number TEXT NOT NULL,
  specialisms         TEXT[] DEFAULT '{}',
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE therapists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "therapist_read_own"
  ON therapists FOR SELECT
  USING (auth.uid() = auth_user_id);

CREATE POLICY "therapist_update_own"
  ON therapists FOR UPDATE
  USING (auth.uid() = auth_user_id);

CREATE POLICY "therapist_insert_own"
  ON therapists FOR INSERT
  WITH CHECK (auth.uid() = auth_user_id);

-- ── Patients (pseudonymous) ──────────────────────────────────
-- No real names. No NHS numbers. UUID only.
-- Therapist links this UUID to their practice records outside ORAII.
CREATE TABLE patients (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id         UUID NOT NULL REFERENCES therapists(id) ON DELETE CASCADE,
  display_label        TEXT NOT NULL,  -- e.g. "Client A" — NOT a real name
  age                  SMALLINT,
  gender               TEXT,
  primary_complaint    TEXT,
  referral_source      TEXT,
  consent_given        BOOLEAN NOT NULL DEFAULT FALSE,
  consent_date         TIMESTAMPTZ,
  consent_version      TEXT,
  portal_auth_user_id  UUID UNIQUE REFERENCES auth.users(id),  -- null until patient activates portal
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "therapist_manage_own_patients"
  ON patients FOR ALL
  USING (
    therapist_id IN (
      SELECT id FROM therapists WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "patient_read_own_record"
  ON patients FOR SELECT
  USING (portal_auth_user_id = auth.uid());

-- ── Sessions ─────────────────────────────────────────────────
CREATE TABLE sessions (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id             UUID NOT NULL REFERENCES therapists(id) ON DELETE CASCADE,
  patient_id               UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  session_date             DATE NOT NULL,
  duration_minutes         INTEGER,
  note_format              TEXT CHECK (note_format IN ('SOAP','DAP','GIRP','BIRP')),
  audio_consent_given      BOOLEAN NOT NULL DEFAULT FALSE,
  audio_consent_timestamp  TIMESTAMPTZ,
  status                   TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','complete','archived')),
  created_at               TIMESTAMPTZ DEFAULT NOW(),
  updated_at               TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "therapist_manage_own_sessions"
  ON sessions FOR ALL
  USING (
    therapist_id IN (
      SELECT id FROM therapists WHERE auth_user_id = auth.uid()
    )
  );

-- ── Clinical Notes ────────────────────────────────────────────
CREATE TABLE clinical_notes (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id             UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  therapist_id           UUID NOT NULL REFERENCES therapists(id),
  patient_id             UUID NOT NULL REFERENCES patients(id),
  format                 TEXT NOT NULL CHECK (format IN ('SOAP','DAP','GIRP','BIRP')),
  content                TEXT NOT NULL,
  ai_generated           BOOLEAN NOT NULL DEFAULT TRUE,
  flagged_concerns       TEXT[] DEFAULT '{}',  -- safeguarding, risk, mandatory reporting
  therapist_reviewed     BOOLEAN NOT NULL DEFAULT FALSE,
  therapist_reviewed_at  TIMESTAMPTZ,
  version                INTEGER NOT NULL DEFAULT 1,
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE clinical_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "therapist_manage_own_notes"
  ON clinical_notes FOR ALL
  USING (
    therapist_id IN (
      SELECT id FROM therapists WHERE auth_user_id = auth.uid()
    )
  );

-- ── C-SSRS Assessments ───────────────────────────────────────
-- Clinician-administered scoring support only.
-- Risk level is ALWAYS entered by the therapist — never auto-populated by AI.
CREATE TABLE cssrs_assessments (
  id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id                      UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  patient_id                      UUID NOT NULL REFERENCES patients(id),
  therapist_id                    UUID NOT NULL REFERENCES therapists(id),
  -- Ideation
  wish_to_be_dead                 BOOLEAN DEFAULT FALSE,
  passive_suicidal_ideation       BOOLEAN DEFAULT FALSE,
  active_suicidal_ideation        BOOLEAN DEFAULT FALSE,
  ideation_with_method            BOOLEAN DEFAULT FALSE,
  ideation_with_intent_no_plan    BOOLEAN DEFAULT FALSE,
  ideation_with_intent_and_plan   BOOLEAN DEFAULT FALSE,
  -- Behaviour
  preparatory_behaviour           BOOLEAN DEFAULT FALSE,
  aborted_attempt                 BOOLEAN DEFAULT FALSE,
  interrupted_attempt             BOOLEAN DEFAULT FALSE,
  actual_attempt                  BOOLEAN DEFAULT FALSE,
  -- Clinician determination — never auto-populated
  clinician_risk_level            TEXT CHECK (clinician_risk_level IN ('low','moderate','high','imminent')),
  clinician_notes                 TEXT,
  ai_screening_flags              JSONB DEFAULT '[]',  -- raw output from screenTranscriptForCSSRS
  assessed_at                     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE cssrs_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "therapist_manage_cssrs"
  ON cssrs_assessments FOR ALL
  USING (
    therapist_id IN (
      SELECT id FROM therapists WHERE auth_user_id = auth.uid()
    )
  );

-- ── Outcome Scores ────────────────────────────────────────────
-- PHQ-9, GAD-7, DASS-21, CORE-10
-- CORE-10 is the UK standard for NHS Talking Therapies
CREATE TABLE outcome_scores (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id    UUID NOT NULL REFERENCES patients(id),
  therapist_id  UUID NOT NULL REFERENCES therapists(id),
  session_id    UUID REFERENCES sessions(id),
  measure       TEXT NOT NULL CHECK (measure IN ('PHQ-9','GAD-7','DASS-21','CORE-10')),
  score         INTEGER NOT NULL,
  severity      TEXT,
  completed_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE outcome_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "therapist_manage_scores"
  ON outcome_scores FOR ALL
  USING (
    therapist_id IN (
      SELECT id FROM therapists WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "patient_read_own_scores"
  ON outcome_scores FOR SELECT
  USING (
    patient_id IN (
      SELECT id FROM patients WHERE portal_auth_user_id = auth.uid()
    )
  );

-- ── Safety Plans (Stanley-Brown SPI — 6 components) ──────────
CREATE TABLE safety_plans (
  id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id                      UUID NOT NULL REFERENCES patients(id),
  therapist_id                    UUID NOT NULL REFERENCES therapists(id),
  warning_signs                   TEXT[] DEFAULT '{}',
  internal_coping_strategies      TEXT[] DEFAULT '{}',
  social_contacts_distraction     JSONB DEFAULT '[]',
  crisis_contacts                 JSONB DEFAULT '[]',
  professional_contacts           JSONB DEFAULT '[]',
  means_restriction               TEXT[] DEFAULT '{}',
  version                         INTEGER NOT NULL DEFAULT 1,
  created_at                      TIMESTAMPTZ DEFAULT NOW(),
  updated_at                      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE safety_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "therapist_manage_safety_plans"
  ON safety_plans FOR ALL
  USING (
    therapist_id IN (
      SELECT id FROM therapists WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "patient_read_own_safety_plan"
  ON safety_plans FOR SELECT
  USING (
    patient_id IN (
      SELECT id FROM patients WHERE portal_auth_user_id = auth.uid()
    )
  );

-- ── Journal Entries (patient portal) ─────────────────────────
-- Patient controls whether therapist can view each entry
CREATE TABLE journal_entries (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id           UUID NOT NULL REFERENCES patients(id),
  content              TEXT NOT NULL,
  mood_score           INTEGER CHECK (mood_score BETWEEN 1 AND 10),
  therapist_can_view   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "patient_manage_own_journal"
  ON journal_entries FOR ALL
  USING (
    patient_id IN (
      SELECT id FROM patients WHERE portal_auth_user_id = auth.uid()
    )
  );

CREATE POLICY "therapist_view_shared_journal"
  ON journal_entries FOR SELECT
  USING (
    therapist_can_view = TRUE
    AND patient_id IN (
      SELECT id FROM patients
      WHERE therapist_id IN (
        SELECT id FROM therapists WHERE auth_user_id = auth.uid()
      )
    )
  );

-- ── Appointments ──────────────────────────────────────────────
CREATE TABLE appointments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id    UUID NOT NULL REFERENCES therapists(id) ON DELETE CASCADE,
  patient_id      UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  requested_time  TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 50,
  location_type   TEXT NOT NULL CHECK (location_type IN ('in_person','video','phone')),
  status          TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending','confirmed','cancelled','completed','no_show')),
  reason          TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "therapist_manage_appointments"
  ON appointments FOR ALL
  USING (
    therapist_id IN (
      SELECT id FROM therapists WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "patient_read_own_appointments"
  ON appointments FOR SELECT
  USING (
    patient_id IN (
      SELECT id FROM patients WHERE portal_auth_user_id = auth.uid()
    )
  );

-- ── Audit Log (UK-GDPR Article 30 — Records of Processing) ───
-- Insert-only. Never updated or deleted.
CREATE TABLE audit_log (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_type     TEXT NOT NULL CHECK (actor_type IN ('therapist','patient','system')),
  actor_id_hash  TEXT NOT NULL,  -- SHA-256 hash — never cleartext
  action         TEXT NOT NULL,
  resource_type  TEXT NOT NULL,
  resource_id    UUID,
  ip_hash        TEXT,           -- hashed IP address
  metadata       JSONB DEFAULT '{}',
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "system_insert_audit"
  ON audit_log FOR INSERT
  WITH CHECK (TRUE);

-- No SELECT, UPDATE, DELETE policies on audit_log — append-only

-- ── Updated-at triggers ───────────────────────────────────────
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_therapists
  BEFORE UPDATE ON therapists
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_patients
  BEFORE UPDATE ON patients
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_sessions
  BEFORE UPDATE ON sessions
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_notes
  BEFORE UPDATE ON clinical_notes
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_safety_plans
  BEFORE UPDATE ON safety_plans
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_appointments
  BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
