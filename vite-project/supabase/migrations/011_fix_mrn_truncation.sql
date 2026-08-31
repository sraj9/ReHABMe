-- ============================================================
-- ReHABMe CRM - Migration 011
-- Fix duplicate MRNs: lpad(nextval, 3) TRUNCATES once the
-- sequence passes 999 (1015 -> '101'), so every new patient
-- collided with an existing MRN. Use the sequence value as-is.
-- ============================================================

create or replace function generate_mrn()
returns trigger language plpgsql as $$
begin
  if new.mrn is null or new.mrn = '' then
    new.mrn := 'MRN-' || to_char(now(), 'YYYY') || '-' || nextval('mrn_seq')::text;
  end if;
  return new;
end;
$$;
