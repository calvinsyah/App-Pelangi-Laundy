-- supabase/seed.sql
-- Seed data untuk local development dan testing CI/CD (E2E)

-- Insert test admin user
-- ID: 00000000-0000-0000-0000-000000000000
-- Password: testpassword123
INSERT INTO auth.users (
  id, 
  instance_id, 
  email, 
  encrypted_password, 
  email_confirmed_at, 
  raw_app_meta_data, 
  raw_user_meta_data, 
  created_at, 
  updated_at, 
  role, 
  confirmation_token, 
  email_change, 
  email_change_token_new, 
  recovery_token
) 
VALUES (
  '00000000-0000-0000-0000-000000000000', 
  '00000000-0000-0000-0000-000000000000', 
  'admin@local.dev', 
  crypt('testpassword123', gen_salt('bf')), 
  now(), 
  '{"provider":"email","providers":["email"]}', 
  '{"role":"admin"}', 
  now(), 
  now(), 
  'authenticated', 
  '', 
  '', 
  '', 
  ''
) ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at) 
VALUES (
  gen_random_uuid(), 
  '00000000-0000-0000-0000-000000000000', 
  '{"sub":"00000000-0000-0000-0000-000000000000","email":"admin@local.dev"}', 
  'email', 
  now(), 
  now(), 
  now()
);

-- Insert profil ke tabel public
INSERT INTO public.profiles (id, nama, role, created_at) 
VALUES (
  '00000000-0000-0000-0000-000000000000', 
  'Admin E2E Test', 
  'admin', 
  now()
) ON CONFLICT (id) DO NOTHING;
