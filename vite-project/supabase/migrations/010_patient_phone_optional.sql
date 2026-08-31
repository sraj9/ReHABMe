-- ============================================================
-- ReHABMe CRM - Migration 010
-- Patient mobile number and date of birth are optional
-- (both can be filled in later via Edit Patient)
-- ============================================================

alter table patients alter column phone drop not null;
alter table patients alter column date_of_birth drop not null;
