-- ============================================================
-- ReHABMe CRM - Migration 005
-- Void payments ("wrong entry"): keep the record, exclude it
-- from all totals. Admin-only.
-- ============================================================

alter table payments add column if not exists voided boolean not null default false;
alter table payments add column if not exists voided_at timestamptz;

create policy "Admins can void payments"
  on payments for update
  using (public.is_admin());
