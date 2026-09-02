-- ============================================================
-- ReHABMe CRM - Migration 013
-- Payroll: per-staff salary and expected working hours, plus an
-- admin-managed holiday calendar used to work out expected days.
-- ============================================================

alter table profiles add column if not exists monthly_salary numeric(10, 2);
alter table profiles add column if not exists daily_working_hours numeric(4, 2) not null default 8;

create table if not exists holidays (
  id uuid primary key default uuid_generate_v4(),
  holiday_date date not null unique,
  name text not null,
  /** true for the fixed national holidays seeded below */
  is_national boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_holidays_date on holidays (holiday_date);

alter table holidays enable row level security;

create policy "Authenticated users can view holidays"
  on holidays for select
  using (auth.role() = 'authenticated');

create policy "Admins manage holidays"
  on holidays for all
  using (public.is_admin())
  with check (public.is_admin());

-- India's three fixed-date national holidays. Everything else (Diwali, Holi,
-- Eid, regional days) moves each year, so the admin adds those.
insert into holidays (holiday_date, name, is_national) values
  ('2026-01-26', 'Republic Day', true),
  ('2026-08-15', 'Independence Day', true),
  ('2026-10-02', 'Gandhi Jayanti', true),
  ('2027-01-26', 'Republic Day', true),
  ('2027-08-15', 'Independence Day', true),
  ('2027-10-02', 'Gandhi Jayanti', true)
on conflict (holiday_date) do nothing;

do $$
begin
  execute 'alter publication supabase_realtime add table holidays';
exception when duplicate_object then null;
end $$;
