-- ============================================================
-- ReHABMe CRM - Supabase PostgreSQL Schema
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES (Staff)
-- ============================================================
create table if not exists profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  full_name text not null,
  email text not null unique,
  role text not null default 'therapist' check (role in ('admin', 'therapist')),
  phone text,
  specialty text,
  avatar_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS
alter table profiles enable row level security;

create policy "Profiles are viewable by authenticated users"
  on profiles for select
  using (auth.role() = 'authenticated');

create policy "Users can update their own profile"
  on profiles for update
  using (auth.uid() = user_id);

create policy "Admins can manage all profiles"
  on profiles for all
  using (
    exists (
      select 1 from profiles
      where user_id = auth.uid() and role = 'admin'
    )
  );

-- ============================================================
-- PATIENTS
-- ============================================================
create table if not exists patients (
  id uuid primary key default uuid_generate_v4(),
  mrn text not null unique,
  full_name text not null,
  date_of_birth date not null,
  gender text not null check (gender in ('male', 'female', 'other', 'prefer_not_to_say')),
  phone text not null,
  email text,
  address text,
  city text,
  state text,
  zip text,
  emergency_contact_name text,
  emergency_contact_phone text,
  insurance_provider text,
  insurance_policy_number text,
  insurance_group_number text,
  referring_physician text,
  primary_diagnosis text,
  medical_history text,
  allergies text,
  medications text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-generate MRN
create sequence if not exists mrn_seq start 1000;

create or replace function generate_mrn()
returns trigger language plpgsql as $$
begin
  if new.mrn is null or new.mrn = '' then
    new.mrn := 'MRN-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('mrn_seq')::text, 3, '0');
  end if;
  return new;
end;
$$;

create trigger set_mrn
  before insert on patients
  for each row execute function generate_mrn();

-- RLS
alter table patients enable row level security;

create policy "Authenticated users can view patients"
  on patients for select
  using (auth.role() = 'authenticated');

create policy "Authenticated users can insert patients"
  on patients for insert
  with check (auth.role() = 'authenticated');

create policy "Authenticated users can update patients"
  on patients for update
  using (auth.role() = 'authenticated');

-- ============================================================
-- APPOINTMENTS
-- ============================================================
create table if not exists appointments (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid references patients(id) on delete cascade not null,
  therapist_id uuid references profiles(id) on delete set null,
  appointment_date date not null,
  appointment_time time not null,
  duration_minutes integer not null default 60 check (duration_minutes > 0),
  type text not null check (type in ('initial_assessment', 'follow_up', 'physiotherapy', 'occupational_therapy', 'speech_therapy', 'hydrotherapy')),
  status text not null default 'scheduled' check (status in ('scheduled', 'completed', 'cancelled', 'no-show')),
  reason text,
  notes text,
  room text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index for common queries
create index if not exists idx_appointments_date on appointments(appointment_date);
create index if not exists idx_appointments_patient on appointments(patient_id);
create index if not exists idx_appointments_therapist on appointments(therapist_id);
create index if not exists idx_appointments_status on appointments(status);

-- RLS
alter table appointments enable row level security;

create policy "Authenticated users can view appointments"
  on appointments for select
  using (auth.role() = 'authenticated');

create policy "Authenticated users can manage appointments"
  on appointments for all
  using (auth.role() = 'authenticated');

-- ============================================================
-- SOAP NOTES
-- ============================================================
create table if not exists soap_notes (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid references patients(id) on delete cascade not null,
  appointment_id uuid references appointments(id) on delete set null,
  therapist_id uuid references profiles(id) on delete set null not null,
  session_date date not null,
  subjective text not null,
  objective text not null,
  assessment text not null,
  plan text not null,
  pain_scale integer check (pain_scale >= 0 and pain_scale <= 10),
  functional_goals text,
  next_session_plan text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index
create index if not exists idx_soap_notes_patient on soap_notes(patient_id);
create index if not exists idx_soap_notes_therapist on soap_notes(therapist_id);
create index if not exists idx_soap_notes_date on soap_notes(session_date);

-- RLS
alter table soap_notes enable row level security;

create policy "Authenticated users can view soap notes"
  on soap_notes for select
  using (auth.role() = 'authenticated');

create policy "Therapists can manage their notes"
  on soap_notes for all
  using (auth.role() = 'authenticated');

-- ============================================================
-- INVOICES
-- ============================================================
create sequence if not exists invoice_seq start 1;

create table if not exists invoices (
  id uuid primary key default uuid_generate_v4(),
  invoice_number text not null unique,
  patient_id uuid references patients(id) on delete cascade not null,
  appointment_id uuid references appointments(id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'sent', 'paid', 'overdue')),
  issue_date date not null default current_date,
  due_date date not null,
  paid_date date,
  subtotal numeric(10, 2) not null default 0,
  tax_rate numeric(5, 2) not null default 0,
  tax_amount numeric(10, 2) not null default 0,
  discount_amount numeric(10, 2) not null default 0,
  total_amount numeric(10, 2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-generate invoice number
create or replace function generate_invoice_number()
returns trigger language plpgsql as $$
begin
  if new.invoice_number is null or new.invoice_number = '' then
    new.invoice_number := 'INV-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('invoice_seq')::text, 3, '0');
  end if;
  return new;
end;
$$;

create trigger set_invoice_number
  before insert on invoices
  for each row execute function generate_invoice_number();

-- RLS
alter table invoices enable row level security;

create policy "Authenticated users can view invoices"
  on invoices for select
  using (auth.role() = 'authenticated');

create policy "Authenticated users can manage invoices"
  on invoices for all
  using (auth.role() = 'authenticated');

-- ============================================================
-- INVOICE ITEMS
-- ============================================================
create table if not exists invoice_items (
  id uuid primary key default uuid_generate_v4(),
  invoice_id uuid references invoices(id) on delete cascade not null,
  description text not null,
  quantity integer not null default 1 check (quantity > 0),
  unit_price numeric(10, 2) not null default 0,
  total numeric(10, 2) generated always as (quantity * unit_price) stored
);

-- Index
create index if not exists idx_invoice_items_invoice on invoice_items(invoice_id);

-- RLS
alter table invoice_items enable row level security;

create policy "Authenticated users can manage invoice items"
  on invoice_items for all
  using (auth.role() = 'authenticated');

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger update_profiles_updated_at before update on profiles for each row execute function update_updated_at();
create trigger update_patients_updated_at before update on patients for each row execute function update_updated_at();
create trigger update_appointments_updated_at before update on appointments for each row execute function update_updated_at();
create trigger update_soap_notes_updated_at before update on soap_notes for each row execute function update_updated_at();
create trigger update_invoices_updated_at before update on invoices for each row execute function update_updated_at();

-- ============================================================
-- INVOICE TOTAL RECALCULATION FUNCTION
-- ============================================================
create or replace function recalculate_invoice_totals(p_invoice_id uuid)
returns void language plpgsql as $$
declare
  v_subtotal numeric;
  v_tax_rate numeric;
  v_discount numeric;
begin
  select coalesce(sum(total), 0) into v_subtotal
  from invoice_items
  where invoice_id = p_invoice_id;

  select tax_rate, discount_amount into v_tax_rate, v_discount
  from invoices
  where id = p_invoice_id;

  update invoices
  set
    subtotal = v_subtotal,
    tax_amount = round(v_subtotal * v_tax_rate / 100, 2),
    total_amount = round(v_subtotal + (v_subtotal * v_tax_rate / 100) - v_discount, 2)
  where id = p_invoice_id;
end;
$$;

-- Trigger to recalculate on item insert/update/delete
create or replace function trigger_recalculate_invoice()
returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    perform recalculate_invoice_totals(old.invoice_id);
  else
    perform recalculate_invoice_totals(new.invoice_id);
  end if;
  return null;
end;
$$;

create trigger recalculate_invoice_on_item_change
  after insert or update or delete on invoice_items
  for each row execute function trigger_recalculate_invoice();
