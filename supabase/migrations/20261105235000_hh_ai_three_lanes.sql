-- Holistic House three-lane Telegram work queue. Private, encrypted, opt-in.
-- No provider accounts, paid APIs, public grants or scheduler are created.
begin;
create table if not exists app_private.ai_telegram_threads (
  id uuid primary key default gen_random_uuid(),
  chat_hash text not null unique check(chat_hash ~ '^[0-9a-f]{64}$'),
  chat_ciphertext text,
  locale text not null check(locale in ('ru','en','es')),
  consent_at timestamptz,
  stopped_at timestamptz,
  awaiting_video_goal boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists app_private.ai_work_jobs (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references app_private.ai_telegram_threads(id) on delete cascade,
  lane text not null check(lane in ('message','video','delivery')),
  status text not null default 'pending'
    check(status in ('pending','leased','done','dead','unknown','suppressed')),
  dedupe_hash text not null unique check(dedupe_hash ~ '^[0-9a-f]{64}$'),
  payload_ciphertext text not null check(length(payload_ciphertext) between 20 and 16000),
  attempts smallint not null default 0 check(attempts between 0 and 5),
  available_at timestamptz not null default now(),
  lease_until timestamptz,
  lease_token uuid,
  provider_message_id text check(provider_message_id is null or length(provider_message_id)<=64),
  error_code text check(error_code is null or error_code ~ '^[A-Z_]{3,48}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists hh_ai_work_pending_idx on app_private.ai_work_jobs(lane,available_at,created_at)
  where status='pending';
create index if not exists hh_ai_work_leased_idx on app_private.ai_work_jobs(lane,lease_until)
  where status='leased';
create index if not exists hh_ai_work_thread_idx on app_private.ai_work_jobs(thread_id,created_at);
create table if not exists app_private.ai_conversation_turns (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references app_private.ai_telegram_threads(id) on delete cascade,
  inbound_job_id uuid not null unique references app_private.ai_work_jobs(id) on delete cascade,
  question_ciphertext text not null,
  answer_ciphertext text not null,
  created_at timestamptz not null default now()
);
create index if not exists hh_ai_turns_thread_idx on app_private.ai_conversation_turns(thread_id,created_at desc);

alter table app_private.ai_telegram_threads enable row level security;
alter table app_private.ai_telegram_threads force row level security;
alter table app_private.ai_work_jobs enable row level security;
alter table app_private.ai_work_jobs force row level security;
alter table app_private.ai_conversation_turns enable row level security;
alter table app_private.ai_conversation_turns force row level security;
revoke all on app_private.ai_telegram_threads,app_private.ai_work_jobs,
  app_private.ai_conversation_turns from public,anon,authenticated,hh_crm_backend,hh_app_backend,hh_app_inbox;
grant select,insert,update,delete on app_private.ai_telegram_threads,app_private.ai_work_jobs,
  app_private.ai_conversation_turns to hh_app_inbox;
-- The server sets this local flag ONLY after a signed Telegram webhook or CRON_SECRET.
-- Public Data API roles have no access to these relations.
create policy hh_ai_threads_server on app_private.ai_telegram_threads for all to hh_app_inbox
  using(current_setting('hh.ai_queue',true)='1') with check(current_setting('hh.ai_queue',true)='1');
create policy hh_ai_jobs_server on app_private.ai_work_jobs for all to hh_app_inbox
  using(current_setting('hh.ai_queue',true)='1') with check(current_setting('hh.ai_queue',true)='1');
create policy hh_ai_turns_server on app_private.ai_conversation_turns for all to hh_app_inbox
  using(current_setting('hh.ai_queue',true)='1') with check(current_setting('hh.ai_queue',true)='1');
comment on table app_private.ai_telegram_threads is 'Signed webhook only; encrypted Telegram destination and explicit consent. STOP erases content.';
comment on table app_private.ai_work_jobs is 'Independent message, video and delivery lanes; delivery timeouts are UNKNOWN and never auto-retried.';
comment on table app_private.ai_conversation_turns is 'Encrypted opt-in question/answer evidence for owner quality review. No client data in server logs.';
commit;