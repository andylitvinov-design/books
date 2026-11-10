create table if not exists business_brain.commander_execution_runs (
  run_id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  chat_id uuid not null references business_brain.commander_chats(chat_id) on delete cascade,
  task_id uuid references business_brain.commander_tasks(task_id) on delete set null,
  idempotency_key text not null check (char_length(idempotency_key) between 8 and 128),
  request_sha256 text not null check (request_sha256 ~ '^[a-f0-9]{64}$'),
  executor text not null check (executor in ('local','openrouter','codex','chatgpt-work','repair-worker','hermes','manual')),
  status text not null check (status in ('BLOCKED','QUEUED','STARTING','RUNNING','WAITING_FOR_APPROVAL','COMPLETED','FAILED','CANCELLED')),
  reason_code text not null,
  request_payload jsonb not null default '{}'::jsonb check (jsonb_typeof(request_payload)='object' and pg_column_size(request_payload)<=12000),
  receipt jsonb not null default '{}'::jsonb check (jsonb_typeof(receipt)='object' and pg_column_size(receipt)<=12000),
  hermes_job_id text,
  executor_session_id text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id,chat_id,idempotency_key),
  unique(hermes_job_id)
);
create index if not exists commander_execution_runs_chat_id_idx on business_brain.commander_execution_runs(chat_id);
create index if not exists commander_execution_runs_task_id_idx on business_brain.commander_execution_runs(task_id) where task_id is not null;
create index if not exists commander_execution_runs_chat_created_idx on business_brain.commander_execution_runs(owner_id,chat_id,created_at desc);
create index if not exists commander_execution_runs_owner_created_idx on business_brain.commander_execution_runs(owner_id,created_at desc);
alter table business_brain.commander_execution_runs enable row level security;
revoke all on business_brain.commander_execution_runs from public, anon, authenticated;
comment on table business_brain.commander_execution_runs is 'Private owner-scoped execution intent and receipt ledger. BLOCKED is never an execution receipt.';
comment on column business_brain.commander_execution_runs.request_sha256 is 'SHA-256 of normalized owner request; detects idempotency-key reuse with different content.';
comment on column business_brain.commander_execution_runs.receipt is 'Redacted transport receipt only; never store bearer tokens, secrets or raw provider payloads.';
