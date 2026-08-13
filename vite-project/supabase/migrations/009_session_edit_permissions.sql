-- ============================================================
-- ReHABMe CRM - Migration 009
-- Session editing permissions:
--   * admins can modify and delete any session
--   * the staff member who logged a session can undo (delete) it
--     within 1 minute of logging
-- ============================================================

-- Who logged the session (auth user id) — used for the undo window
alter table patient_sessions
  add column if not exists created_by uuid default auth.uid();

create policy "Admins can update sessions"
  on patient_sessions for update
  using (public.is_admin());

drop policy if exists "Admins can delete sessions" on patient_sessions;

create policy "Admins can delete sessions; creators can undo within 1 minute"
  on patient_sessions for delete
  using (
    public.is_admin()
    or (created_by = auth.uid() and created_at > now() - interval '1 minute')
  );
