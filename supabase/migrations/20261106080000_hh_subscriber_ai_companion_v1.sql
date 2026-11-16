-- Separate, opt-in Telegram AI for the EXISTING client notification bot.
-- No accounts, subscriptions, payments, model access or new paid infrastructure.
begin;
create table if not exists app_private.subscriber_ai_sessions (
 id uuid primary key default gen_random_uuid(),
 chat_hash text not null unique check(chat_hash ~ '^[0-9a-f]{64}$'),
 chat_ciphertext text,
 locale text not null check(locale in ('ru','en','es')),
 consent_at timestamptz,
 consent_version text check(consent_version is null or consent_version='hh-subscriber-ai-v1'),
 pending_at timestamptz,
 stopped_at timestamptz,
 last_update_id bigint check(last_update_id is null or last_update_id >= 0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint subscriber_ai_consent_pair check ((consent_at is null)=(consent_version is null))
);
create table if not exists app_private.subscriber_ai_outbox (
 id uuid primary key default gen_random_uuid(),
 session_id uuid not null references app_private.subscriber_ai_sessions(id) on delete cascade,
 update_id bigint not null check(update_id>=0),
 kind text not null check(kind in
  ('open','enable','disable','decline','hello','chat','materials','practice','video','tests','master')),
 payload_ciphertext text not null check(length(payload_ciphertext) between 20 and 24000),
 status text not null default 'pending'
   check(status in ('pending','leased','done','dead','unknown','suppressed')),
 attempts smallint not null default 0 check(attempts between 0 and 5),
 available_at timestamptz not null default now(),
 lease_until timestamptz,
 provider_message_id text check(provider_message_id is null or length(provider_message_id)<=64),
 created_at timestamptz not null default now(),
 unique(session_id,update_id)
);
create index if not exists subscriber_ai_outbox_pending on app_private.subscriber_ai_outbox(available_at,created_at)
 where status='pending';
create index if not exists subscriber_ai_outbox_leased on app_private.subscriber_ai_outbox(lease_until)
 where status='leased';
create index if not exists subscriber_ai_outbox_history on app_private.subscriber_ai_outbox(session_id,created_at desc);

alter table app_private.subscriber_ai_sessions enable row level security;
alter table app_private.subscriber_ai_sessions force row level security;
alter table app_private.subscriber_ai_outbox enable row level security;
alter table app_private.subscriber_ai_outbox force row level security;
revoke all on app_private.subscriber_ai_sessions,app_private.subscriber_ai_outbox
 from public,anon,authenticated,hh_app_inbox,hh_app_backend,hh_crm_backend;
grant select,insert,update,delete on app_private.subscriber_ai_sessions,app_private.subscriber_ai_outbox to hh_app_backend;
create policy hh_subscriber_ai_sessions_server on app_private.subscriber_ai_sessions for all to hh_app_backend
 using(current_setting('hh.subscriber_ai',true)='1')
 with check(current_setting('hh.subscriber_ai',true)='1');
create policy hh_subscriber_ai_outbox_server on app_private.subscriber_ai_outbox for all to hh_app_backend
 using(current_setting('hh.subscriber_ai',true)='1')
 with check(current_setting('hh.subscriber_ai',true)='1');
comment on table app_private.subscriber_ai_sessions is
 'Verified signed client-bot private chat. Separate versioned AI consent; zero free-text history; not an account link.';
comment on table app_private.subscriber_ai_outbox is
 'Encrypted replies; at-most-once uncertain sends; never replays expired leases or private content.';
commit;
