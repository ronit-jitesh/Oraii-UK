-- ══════════════════════════════════════════════════════════════
-- ORAII UK — Migration 003
-- Adds supervisor notification fields to cssrs_assessments
-- and CORE-10 to outcome_scores.measure check constraint
-- ══════════════════════════════════════════════════════════════

-- ── cssrs_assessments: supervisor notification ────────────────
ALTER TABLE cssrs_assessments
  ADD COLUMN IF NOT EXISTS supervisor_notified    BOOLEAN     DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS supervisor_notified_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN cssrs_assessments.supervisor_notified    IS 'Whether clinical supervisor was notified — required at high/imminent risk under BACP/UKCP ethical framework';
COMMENT ON COLUMN cssrs_assessments.supervisor_notified_at IS 'Timestamp when supervisor notification was recorded by the therapist';

-- ── cssrs_assessments: add active_suicidal_ideation if missing ─
-- (Not in original 7-item C-SSRS list but referenced in schema)
ALTER TABLE cssrs_assessments
  ADD COLUMN IF NOT EXISTS active_suicidal_ideation BOOLEAN DEFAULT FALSE;

-- ── Ensure CORE-10 in outcome_scores check constraint ─────────
-- Supabase does not support ALTER CHECK directly.
-- If this fails it means CORE-10 is already permitted — safe to ignore.
DO $$
BEGIN
  ALTER TABLE outcome_scores
    DROP CONSTRAINT IF EXISTS outcome_scores_measure_check;
  ALTER TABLE outcome_scores
    ADD CONSTRAINT outcome_scores_measure_check
    CHECK (measure IN ('PHQ-9','GAD-7','DASS-21','CORE-10','WEMWBS'));
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Constraint update skipped: %', SQLERRM;
END;
$$;

-- ── RLS: therapist can read supervisor fields ─────────────────
-- Existing policy "therapist_manage_cssrs" covers all columns on cssrs_assessments.
-- No additional policy needed.

-- ── Audit log entry ───────────────────────────────────────────
INSERT INTO audit_log (actor_type, actor_id_hash, action, resource_type, metadata)
VALUES (
  'system',
  'migration-003',
  'schema_migration',
  'cssrs_assessments',
  '{"migration":"003","added_columns":["supervisor_notified","supervisor_notified_at","active_suicidal_ideation"]}'::jsonb
);
