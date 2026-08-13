-- ============================================================
-- ReHABMe CRM - Migration 007
-- Enable Realtime change broadcasts for all app tables so open
-- screens refresh automatically when data changes anywhere.
-- ============================================================

do $$
declare
  t text;
begin
  foreach t in array array[
    'patients', 'appointments', 'soap_notes', 'invoices', 'invoice_items',
    'profiles', 'clinic_settings', 'attendance', 'payments', 'expenses',
    'packages', 'patient_sessions'
  ]
  loop
    begin
      execute format('alter publication supabase_realtime add table %I', t);
    exception
      when duplicate_object then null; -- already in the publication
    end;
  end loop;
end $$;
