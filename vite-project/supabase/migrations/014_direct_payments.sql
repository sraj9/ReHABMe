-- ============================================================
-- ReHABMe CRM - Migration 014
-- Daily (walk-in) payments: a patient without a package pays per
-- visit, with no invoice behind it, so invoice_id becomes optional.
-- ============================================================

alter table payments alter column invoice_id drop not null;
