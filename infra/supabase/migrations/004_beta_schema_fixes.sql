-- ══════════════════════════════════════════════════════════════
-- ORAII UK — Migration 004
-- Adds consent_version column; ensures all beta-required
-- columns exist without breaking existing data
-- ══════════════════════════════════════════════════════════════

-- patients: consent_version already exists in 001 schema — confirm
ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS consent_version TEXT DEFAULT 'v1';

-- outcome_scores: ensure WEMWBS is in the measure check
DO $$
BEGIN
  ALTER TABLE outcome_scores DROP CONSTRAINT IF EXISTS outcome_scores_measure_check;
  ALTER TABLE outcome_scores ADD CONSTRAINT outcome_scores_measure_check
    CHECK (measure IN ('PHQ-9','GAD-7','DASS-21','CORE-10','WEMWBS'));
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Constraint update: %', SQLERRM;
END;
$$;

-- sessions: add therapist_id if missing (some early inserts may not have it)
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS therapist_id UUID REFERENCES therapists(id);

-- Audit
INSERT INTO audit_log (actor_type, actor_id_hash, action, resource_type, metadata)
VALUES ('system','migration-004','schema_migration','multiple','{"migration":"004"}');
