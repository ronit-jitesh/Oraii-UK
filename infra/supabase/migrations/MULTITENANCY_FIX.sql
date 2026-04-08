-- ══════════════════════════════════════════════════════════════
-- ORAII UK — Multi-tenancy fix
-- Paste into: https://supabase.com/dashboard/project/etwlpfigtjnpiftfazig/sql/new
-- ══════════════════════════════════════════════════════════════

-- 1. Add auth_user_id to therapists if it doesn't exist
ALTER TABLE therapists ADD COLUMN IF NOT EXISTS auth_user_id UUID;
ALTER TABLE therapists ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Add unique index so each auth user maps to exactly one therapist row
CREATE UNIQUE INDEX IF NOT EXISTS therapists_auth_user_id_idx
  ON therapists(auth_user_id)
  WHERE auth_user_id IS NOT NULL;

-- 3. Add therapist_id FK to patients (already done in 005 but being safe)
ALTER TABLE patients ADD COLUMN IF NOT EXISTS therapist_id UUID;

-- 4. Create index on patients.therapist_id for fast per-therapist queries
CREATE INDEX IF NOT EXISTS patients_therapist_id_idx ON patients(therapist_id);
CREATE INDEX IF NOT EXISTS sessions_therapist_id_idx ON sessions(therapist_id);
CREATE INDEX IF NOT EXISTS appointments_therapist_id_idx ON appointments(therapist_id);
CREATE INDEX IF NOT EXISTS clinical_notes_therapist_id_idx ON clinical_notes(therapist_id);

-- 5. Wire your existing beta therapist row to your real auth user
--    (run this ONCE — replace the email with your actual login email)
--    After running, every patient you add will be tied to your auth user.
UPDATE therapists
SET auth_user_id = (
  SELECT id FROM auth.users WHERE email = 'beta@oraii.co.uk' LIMIT 1
)
WHERE email = 'beta@oraii.co.uk'
  AND auth_user_id IS NULL;

-- 6. Verify
SELECT id, full_name, email, auth_user_id FROM therapists;
