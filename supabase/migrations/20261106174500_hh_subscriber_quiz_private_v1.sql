-- One private, consented questionnaire per verified Telegram AI chat.
-- No account linkage or private results leaked into messenger/LLM history.
begin;
create table if not exists app_private.subscriber_quiz_runs (
 id uuid primary key default gen_random_uuid(),
 session_id uuid not null unique
   references app_private.subscriber_ai_sessions(id) on delete cascade,
 definition_id uuid not null,
 instrument_locale text not null check(instrument_locale in ('ru','en','es')),
 status text not null default 'pending' check(status in ('pending','active','completed')),
 revision integer not null default 0 check(revision >= 0),
 progress integer not null default 0 check(progress between 0 and 200),
 answers_ciphertext text not null check(length(answers_ciphertext) between 20 and 60000),
 result_ciphertext text check(result_ciphertext is null or length(result_ciphertext) between 20 and 150000),
 consent_at timestamptz,
 safety_pending boolean not null default false,
 expires_at timestamptz not null default (now()+interval '7 days'),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint hh_subscriber_quiz_consent CHECK
   ((status='pending' and consent_at is null) or
    (status in ('active','completed') and consent_at is not null)),
 constraint hh_subscriber_quiz_expiry CHECK (expires_at > created_at)
);
create index if not exists hh_subscriber_quiz_expiry_idx
 on app_private.subscriber_quiz_runs(expires_at);
alter table app_private.subscriber_quiz_runs enable row level security;
alter table app_private.subscriber_quiz_runs force row level security;
revoke all on app_private.subscriber_quiz_runs
 from public,anon,authenticated,hh_app_inbox,hh_app_backend,hh_crm_backend;
grant select,insert,update,delete on app_private.subscriber_quiz_runs to hh_app_backend;
create policy hh_subscriber_quiz_server on app_private.subscriber_quiz_runs
 for all to hh_app_backend using(current_setting('hh.subscriber_ai',true)='1')
 with check(current_setting('hh.subscriber_ai',true)='1');
comment on table app_private.subscriber_quiz_runs is
 'Private Telegram questionnaire: versioned registered instrument, sealed answers/result, explicit separate consent, no account binding, 7-day expiry. Purged by existing Companion housekeeping and opt-outs.';
commit;
