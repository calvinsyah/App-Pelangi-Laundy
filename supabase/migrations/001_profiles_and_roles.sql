-- 001_profiles_and_roles.sql
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nama text not null,
  role text not null check (role in ('admin', 'user')),
  created_at timestamptz default now()
);

-- 002_audit_log.sql
create table if not exists audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references profiles(id),
  aksi text not null,               -- 'DELETE', 'UPDATE', dll.
  tabel text not null,
  row_id text,
  nilai_sebelum jsonb,
  nilai_sesudah jsonb,
  created_at timestamptz default now()
);
