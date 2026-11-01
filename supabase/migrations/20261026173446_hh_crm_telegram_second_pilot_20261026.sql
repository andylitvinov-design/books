-- Second-account private Telegram pilot (no public bot activation).
-- HMAC-authenticated invitations can authorize one additional chat for 24h.
-- No raw Telegram chat ID, photograph, message or medical record stored.
begin;

alter table app_private.crm_tg_diagnostic_sessions
  add column if not exists pilot_access_until timestamptz;

grant select on app_private.crm_tg_diagnostic_sessions to hh_crm_backend;

create policy crm_tg_diagnostic_owner_read on app_private.crm_tg_diagnostic_sessions
  for select to hh_crm_backend
  using (
    (select app_private.account_active()) and
    exists (
      select 1 from app.crm_msg_accounts a
      where a.channel='telegram' and a.enabled
        and a.external_hash=business_hash
        and a.owner_id=(select auth.uid())
    )
  );

comment on column app_private.crm_tg_diagnostic_sessions.pilot_access_until is
  'One invited Telegram test chat for 24 hours, no public sends; keyed identity only.';

commit;
