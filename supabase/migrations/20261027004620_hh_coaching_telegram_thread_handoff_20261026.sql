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
-- Signed webhook can resolve only the already consented thread matching its
-- own resolved owner, business account and hashed Telegram sender. Never read
-- other threads, messages or private content from the guest backend.
grant select (id,owner_id,account_id,user_hash)
  on app.crm_msg_threads to hh_app_inbox;
create policy crm_msg_telegram_handoff_lookup on app.crm_msg_threads
  for select to hh_app_inbox using (
    owner_id::text=current_setting('hh.telegram_handoff_owner',true)
    and account_id::text=current_setting('hh.telegram_handoff_account',true)
    and user_hash=current_setting('hh.telegram_handoff_user',true)
  );
-- The anonymous form route can inspect ONLY the exact consented customer
-- CRM thread from a valid owner-encrypted handoff; all conditions default DENY
-- without the transaction-local GUC values supplied by the server.
grant select (id,owner_id,contact_id,user_hash,suppressed)
  on app.crm_msg_threads to hh_app_backend;
create policy crm_msg_coaching_handoff_read on app.crm_msg_threads
  for select to hh_app_backend
  using (owner_id::text=current_setting('hh.coaching_handoff_owner',true)
    and id::text=current_setting('hh.coaching_handoff_thread',true)
    and user_hash=current_setting('hh.coaching_handoff_user',true)
    and not suppressed);
grant select (id,owner_id,suppressed)
  on app.crm_contacts to hh_app_backend;
create policy crm_contact_coaching_handoff_read on app.crm_contacts
  for select to hh_app_backend
  using (owner_id::text=current_setting('hh.coaching_handoff_owner',true)
    and id::text=current_setting('hh.coaching_handoff_contact',true));
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
