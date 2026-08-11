-- ============================================================
-- ReHABMe CRM - Migration 002
-- Staff invites via WhatsApp, optional email, attendance
-- Run this in the Supabase SQL Editor (after schema.sql).
-- ============================================================

-- ------------------------------------------------------------
-- PROFILES: email becomes optional, phone becomes the primary
-- staff identifier, first-login password change flag
-- ------------------------------------------------------------
alter table profiles alter column email drop not null;
alter table profiles add column if not exists must_change_password boolean not null default false;

-- Phone uniqueness (nulls allowed for pre-existing rows)
create unique index if not exists profiles_phone_key on profiles (phone) where phone is not null;

-- ------------------------------------------------------------
-- CLINIC SETTINGS (single row, admin-managed)
-- Holds clinic info and the WhatsApp Business Cloud API config.
-- The access token is only readable by admins (RLS) and used
-- server-side by the staff-admin edge function.
-- ------------------------------------------------------------
create table if not exists clinic_settings (
  id integer primary key default 1 check (id = 1),
  clinic_name text not null default 'ReHABMe Rehabilitation and Physiotherapy Center',
  clinic_phone text,
  clinic_email text,
  clinic_address text,
  business_hours text,
  tax_id text,
  whatsapp_phone_number_id text,
  whatsapp_access_token text,
  whatsapp_template_invite text not null default 'staff_invite',
  updated_at timestamptz not null default now()
);

insert into clinic_settings (id) values (1) on conflict (id) do nothing;

alter table clinic_settings enable row level security;

create policy "Admins manage clinic settings"
  on clinic_settings for all
  using (
    exists (
      select 1 from profiles
      where user_id = auth.uid() and role = 'admin'
    )
  );

create trigger update_clinic_settings_updated_at
  before update on clinic_settings
  for each row execute function update_updated_at();

-- ------------------------------------------------------------
-- ATTENDANCE (GPS check-in / check-out)
-- ------------------------------------------------------------
create table if not exists attendance (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid references profiles(id) on delete cascade not null,
  check_in_at timestamptz not null default now(),
  check_out_at timestamptz,
  lat double precision not null,
  lng double precision not null,
  accuracy_m double precision,
  check_out_lat double precision,
  check_out_lng double precision,
  created_at timestamptz not null default now()
);

create index if not exists idx_attendance_profile on attendance (profile_id);
create index if not exists idx_attendance_check_in on attendance (check_in_at);

alter table attendance enable row level security;

create policy "Staff insert own attendance"
  on attendance for insert
  with check (
    exists (
      select 1 from profiles p
      where p.id = profile_id and p.user_id = auth.uid()
    )
  );

create policy "Staff update own attendance"
  on attendance for update
  using (
    exists (
      select 1 from profiles p
      where p.id = profile_id and p.user_id = auth.uid()
    )
  );

create policy "Staff view own attendance"
  on attendance for select
  using (
    exists (
      select 1 from profiles p
      where p.id = profile_id and p.user_id = auth.uid()
    )
  );

create policy "Admins view all attendance"
  on attendance for select
  using (
    exists (
      select 1 from profiles
      where user_id = auth.uid() and role = 'admin'
    )
  );
