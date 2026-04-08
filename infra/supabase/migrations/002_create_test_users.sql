-- ══════════════════════════════════════════════════════════════
-- ORAII UK — Create test accounts
-- Paste this ENTIRE file into Supabase SQL Editor and Run
-- ══════════════════════════════════════════════════════════════

-- 1. Create therapist auth user (clinic portal)
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role,
  aud
)
VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'ronitjitesh@gmail.com',
  crypt('OraiiUK2026!', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  jsonb_build_object('provider', 'email', 'providers', array['email']),
  jsonb_build_object('portal', 'clinic', 'full_name', 'Ronit Jitesh'),
  false,
  'authenticated',
  'authenticated'
);

-- 2. Create identity for therapist
INSERT INTO auth.identities (
  id,
  user_id,
  provider_id,
  provider,
  identity_data,
  created_at,
  updated_at,
  last_sign_in_at
)
SELECT
  gen_random_uuid(),
  u.id,
  u.email,
  'email',
  jsonb_build_object('sub', u.id::text, 'email', u.email),
  NOW(),
  NOW(),
  NOW()
FROM auth.users u
WHERE u.email = 'ronitjitesh@gmail.com';

-- 3. Create patient auth user (patient portal)
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role,
  aud
)
VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'patient.test@oraii.co.uk',
  crypt('OraiiPatient2026!', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  jsonb_build_object('provider', 'email', 'providers', array['email']),
  jsonb_build_object('portal', 'patient'),
  false,
  'authenticated',
  'authenticated'
);

-- 4. Create identity for patient
INSERT INTO auth.identities (
  id,
  user_id,
  provider_id,
  provider,
  identity_data,
  created_at,
  updated_at,
  last_sign_in_at
)
SELECT
  gen_random_uuid(),
  u.id,
  u.email,
  'email',
  jsonb_build_object('sub', u.id::text, 'email', u.email),
  NOW(),
  NOW(),
  NOW()
FROM auth.users u
WHERE u.email = 'patient.test@oraii.co.uk';

-- 5. Create therapist profile row
INSERT INTO therapists (
  auth_user_id,
  email,
  full_name,
  professional_body,
  registration_number,
  specialisms
)
SELECT
  u.id,
  u.email,
  'Ronit Jitesh',
  'BACP',
  'TEST-001',
  ARRAY['anxiety', 'depression', 'CBT']
FROM auth.users u
WHERE u.email = 'ronitjitesh@gmail.com';

-- 6. Create test patient linked to therapist
INSERT INTO patients (
  therapist_id,
  display_label,
  consent_given,
  consent_date,
  consent_version,
  portal_auth_user_id
)
SELECT
  t.id,
  'Test Patient A',
  true,
  NOW(),
  '1.0.0',
  u.id
FROM therapists t
CROSS JOIN auth.users u
WHERE t.email = 'ronitjitesh@gmail.com'
  AND u.email = 'patient.test@oraii.co.uk';

-- 7. Verify everything was created
SELECT 'auth.users' AS table_name, email, created_at FROM auth.users
WHERE email IN ('ronitjitesh@gmail.com', 'patient.test@oraii.co.uk')
UNION ALL
SELECT 'therapists', email, created_at FROM therapists
WHERE email = 'ronitjitesh@gmail.com'
UNION ALL
SELECT 'patients', display_label, created_at FROM patients
WHERE display_label = 'Test Patient A';
