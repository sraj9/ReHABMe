-- ============================================================
-- ReHABMe CRM - Migration 006
-- Session packages + one-tap session logging
-- Patients buy packages of N sessions; each visit consumes one.
-- Sessions without a package are walk-ins.
-- ============================================================

create table if not exists packages (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid references patients(id) on delete cascade not null,
  name text not null,
  total_sessions integer not null check (total_sessions > 0),
  price numeric(10, 2) not null default 0,
  invoice_id uuid references invoices(id) on delete set null,
  purchased_at date not null default current_date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_packages_patient on packages (patient_id);

alter table packages enable row level security;

create policy "Authenticated users can view packages"
  on packages for select
  using (auth.role() = 'authenticated');

create policy "Authenticated users can manage packages"
  on packages for insert
  with check (auth.role() = 'authenticated');

create policy "Authenticated users can update packages"
  on packages for update
  using (auth.role() = 'authenticated');

create policy "Admins can delete packages"
  on packages for delete
  using (public.is_admin());

create trigger update_packages_updated_at
  before update on packages
  for each row execute function update_updated_at();

-- ------------------------------------------------------------
-- PATIENT SESSIONS (one row = one visit)
-- ------------------------------------------------------------
create table if not exists patient_sessions (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid references patients(id) on delete cascade not null,
  package_id uuid references packages(id) on delete set null,
  therapist_id uuid references profiles(id) on delete set null,
  session_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_patient_sessions_patient on patient_sessions (patient_id);
create index if not exists idx_patient_sessions_package on patient_sessions (package_id);
create index if not exists idx_patient_sessions_at on patient_sessions (session_at);

alter table patient_sessions enable row level security;

create policy "Authenticated users can view sessions"
  on patient_sessions for select
  using (auth.role() = 'authenticated');

create policy "Authenticated users can log sessions"
  on patient_sessions for insert
  with check (auth.role() = 'authenticated');

create policy "Admins can delete sessions"
  on patient_sessions for delete
  using (public.is_admin());
