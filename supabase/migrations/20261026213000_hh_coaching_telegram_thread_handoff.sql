-- Additive one-time opaque Telegram -> coaching-form correlation.
-- Existing encrypted public enquiry and CRM thread are the only records.
-- The public visitor has no direct grants, and an app backend must possess
-- the server-authenticated short-lived handoff before using a private session.
begin;
alter table app.public_service_enquiries
  add column if not exists telegram_thread_id uuid
    references app.crm_msg_threads(id) on delete set null;
alter table app.public_service_enquiries
  add column if not exists telegram_handoff_digest text
    check (telegram_handoff_digest is null or telegram_handoff_digest ~ '^[a-f0-9]{64}$');
create unique index if not exists public_service_telegram_handoff_once
  on app.public_service_enquiries(telegram_handoff_digest)
  where telegram_handoff_digest is not null;
create index if not exists public_service_telegram_thread
  on app.public_service_enquiries(telegram_thread_id)
  where telegram_thread_id is not null;
grant select (business_hash,user_hash,stage,consent_at)
  on app_private.crm_tg_diagnostic_sessions to hh_app_backend;
create policy crm_tg_diagnostic_coaching_handoff_read
  on app_private.crm_tg_diagnostic_sessions for select to hh_app_backend
  using (
    business_hash=current_setting('hh.coaching_handoff_business',true)
    and user_hash=current_setting('hh.coaching_handoff_user',true)
    and stage='done' and consent_at is not null
  );
commit;
