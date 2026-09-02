-- ============================================================
-- ReHABMe CRM - Migration 012
-- Attendance regularization: staff raise a request for a missed
-- punch in/out; an admin approves or rejects it. Approval writes
-- the attendance record itself (via a security-definer trigger,
-- so staff never get direct write access to other rows).
-- ============================================================

-- A regularized entry has no GPS fix, so location becomes optional
alter table attendance alter column lat drop not null;
alter table attendance alter column lng drop not null;
alter table attendance add column if not exists is_regularized boolean not null default false;

create table if not exists attendance_requests (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid references profiles(id) on delete cascade not null,
  -- set when regularizing the check-out of an existing attendance row
  attendance_id uuid references attendance(id) on delete set null,
  request_date date not null,
  type text not null check (type in ('check_in', 'check_out', 'both')),
  requested_check_in_at timestamptz,
  requested_check_out_at timestamptz,
  reason text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  review_note text,
  reviewed_by uuid references profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_att_req_profile on attendance_requests (profile_id);
create index if not exists idx_att_req_status on attendance_requests (status);

-- One open request per staff member per day
create unique index if not exists uniq_pending_request_per_day
  on attendance_requests (profile_id, request_date)
  where status = 'pending';

create trigger update_attendance_requests_updated_at
  before update on attendance_requests
  for each row execute function update_updated_at();

-- ------------------------------------------------------------
-- Approval applies the request to the attendance table
-- ------------------------------------------------------------
create or replace function apply_attendance_request()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'approved' and old.status is distinct from 'approved' then
    if new.type = 'check_out' and new.attendance_id is not null then
      update attendance
         set check_out_at = new.requested_check_out_at,
             is_regularized = true
       where id = new.attendance_id;
    else
      insert into attendance (profile_id, check_in_at, check_out_at, is_regularized)
      values (new.profile_id, new.requested_check_in_at, new.requested_check_out_at, true);
    end if;
    new.reviewed_at := now();
  elsif new.status = 'rejected' and old.status is distinct from 'rejected' then
    new.reviewed_at := now();
  end if;
  return new;
end;
$$;

create trigger attendance_request_applied
  before update on attendance_requests
  for each row execute function apply_attendance_request();

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------
alter table attendance_requests enable row level security;

create policy "Staff raise own regularization requests"
  on attendance_requests for insert
  with check (
    exists (select 1 from profiles p where p.id = profile_id and p.user_id = auth.uid())
  );

create policy "Staff view own requests; admins view all"
  on attendance_requests for select
  using (
    public.is_admin()
    or exists (select 1 from profiles p where p.id = profile_id and p.user_id = auth.uid())
  );

-- Only admins decide; staff cannot approve their own
create policy "Admins review requests"
  on attendance_requests for update
  using (public.is_admin());

create policy "Staff withdraw own pending request"
  on attendance_requests for delete
  using (
    status = 'pending'
    and exists (select 1 from profiles p where p.id = profile_id and p.user_id = auth.uid())
  );

-- Live updates for the admin queue and the staff member's status
do $$
begin
  execute 'alter publication supabase_realtime add table attendance_requests';
exception when duplicate_object then null;
end $$;
