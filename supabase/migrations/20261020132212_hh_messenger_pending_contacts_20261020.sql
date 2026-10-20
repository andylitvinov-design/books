-- Holistic House self-service messenger contact capture (PHASE 1 / NO SENDING).
-- Apply only on verified production DB after source/RLS review, before deploying API.
-- All destinations remain UNVERIFIED; provider delivery requires a separate migration and approval.
begin;
create table app_private.notification_messenger_requests(
  account_id uuid not null references app.accounts(id) on delete cascade,
  channel text not null check(channel in('telegram','whatsapp')),
  destination_ciphertext text not null check(length(destination_ciphertext) between 30 and 4096),
  topics jsonb not null check(jsonb_typeof(topics)='object'),
  locale text not null check(locale in('en','ru','es')),
  consent_version text not null check(consent_version='hh-messenger-contact-v1'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(account_id,channel)
);
comment on table app_private.notification_messenger_requests is
  'Pending encrypted messenger contacts only. This table does NOT grant consent to send or contain verified provider identities.';
alter table app_private.notification_messenger_requests enable row level security;
alter table app_private.notification_messenger_requests force row level security;
revoke all on app_private.notification_messenger_requests from public,anon,authenticated,hh_app_inbox,hh_crm_backend;
grant select,insert,delete on app_private.notification_messenger_requests to hh_app_backend;
grant update(destination_ciphertext,topics,locale,consent_version,updated_at)
  on app_private.notification_messenger_requests to hh_app_backend;
create policy notification_messenger_owner on app_private.notification_messenger_requests
 for all to hh_app_backend
 using(account_id=(select auth.uid()) and (select app_private.account_active()))
 with check(account_id=(select auth.uid()) and (select app_private.account_active()));
commit;
