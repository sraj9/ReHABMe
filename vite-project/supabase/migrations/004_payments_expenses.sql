-- ============================================================
-- ReHABMe CRM - Migration 004
-- Payments register (partial payments per invoice) + expenses book
-- ============================================================

-- ------------------------------------------------------------
-- PAYMENTS
-- ------------------------------------------------------------
create table if not exists payments (
  id uuid primary key default uuid_generate_v4(),
  invoice_id uuid references invoices(id) on delete cascade not null,
  patient_id uuid references patients(id) on delete cascade not null,
  amount numeric(10, 2) not null check (amount > 0),
  method text not null check (method in ('cash', 'upi', 'card', 'bank_transfer', 'other')),
  paid_at date not null default current_date,
  notes text,
  received_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_payments_invoice on payments (invoice_id);
create index if not exists idx_payments_patient on payments (patient_id);
create index if not exists idx_payments_paid_at on payments (paid_at);

alter table payments enable row level security;

create policy "Authenticated users can view payments"
  on payments for select
  using (auth.role() = 'authenticated');

create policy "Authenticated users can record payments"
  on payments for insert
  with check (auth.role() = 'authenticated');

create policy "Admins can delete payments"
  on payments for delete
  using (public.is_admin());

-- ------------------------------------------------------------
-- EXPENSES (admin-only book)
-- ------------------------------------------------------------
create table if not exists expenses (
  id uuid primary key default uuid_generate_v4(),
  category text not null check (category in ('rent', 'salaries', 'equipment', 'supplies', 'utilities', 'maintenance', 'other')),
  description text not null,
  amount numeric(10, 2) not null check (amount > 0),
  expense_date date not null default current_date,
  recorded_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_expenses_date on expenses (expense_date);

alter table expenses enable row level security;

create policy "Admins manage expenses"
  on expenses for all
  using (public.is_admin());

create trigger update_expenses_updated_at
  before update on expenses
  for each row execute function update_updated_at();
