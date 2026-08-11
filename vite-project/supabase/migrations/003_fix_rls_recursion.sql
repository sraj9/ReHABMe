-- ============================================================
-- ReHABMe CRM - Migration 003
-- Fix: infinite recursion in profiles RLS policy (42P17)
--
-- "Admins can manage all profiles" checked the caller's role by
-- querying profiles from within a profiles policy — recursive.
-- A SECURITY DEFINER function performs the role check with RLS
-- bypassed, and every admin policy now uses it.
-- ============================================================

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from profiles
    where user_id = auth.uid() and role = 'admin'
  );
$$;

-- Profiles
drop policy if exists "Admins can manage all profiles" on profiles;
create policy "Admins can manage all profiles"
  on profiles for all
  using (public.is_admin());

-- Clinic settings
drop policy if exists "Admins manage clinic settings" on clinic_settings;
create policy "Admins manage clinic settings"
  on clinic_settings for all
  using (public.is_admin());

-- Attendance
drop policy if exists "Admins view all attendance" on attendance;
create policy "Admins view all attendance"
  on attendance for select
  using (public.is_admin());
