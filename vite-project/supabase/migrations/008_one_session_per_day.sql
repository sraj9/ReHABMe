-- ============================================================
-- ReHABMe CRM - Migration 008
-- One session per patient per day (clinic day = Asia/Kolkata)
-- ============================================================

create unique index if not exists uniq_patient_session_per_day
  on patient_sessions (patient_id, ((timezone('Asia/Kolkata', session_at))::date));
