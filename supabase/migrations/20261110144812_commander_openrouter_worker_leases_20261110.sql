alter table business_brain.commander_execution_runs
  add column if not exists worker_attempt_count integer not null default 0,
  add column if not exists worker_lease_token uuid,
  add column if not exists worker_lease_expires_at timestamptz,
  add column if not exists worker_checkpoint jsonb not null default '{}'::jsonb,
  add column if not exists worker_next_attempt_at timestamptz not null default now(),
  add column if not exists worker_last_error_code text,
  add column if not exists actual_model_id text,
  add column if not exists cost_usd numeric(18,10);

alter table business_brain.commander_execution_runs
  drop constraint if exists commander_execution_runs_worker_attempt_count_check,
  add constraint commander_execution_runs_worker_attempt_count_check
    check (worker_attempt_count >= 0 and worker_attempt_count <= 20),
  drop constraint if exists commander_execution_runs_worker_checkpoint_check,
  add constraint commander_execution_runs_worker_checkpoint_check
    check (jsonb_typeof(worker_checkpoint) = 'object' and pg_column_size(worker_checkpoint) <= 24000),
  drop constraint if exists commander_execution_runs_worker_last_error_check,
  add constraint commander_execution_runs_worker_last_error_check
    check (worker_last_error_code is null or length(worker_last_error_code) <= 120),
  drop constraint if exists commander_execution_runs_actual_model_id_check,
  add constraint commander_execution_runs_actual_model_id_check
    check (actual_model_id is null or length(actual_model_id) <= 180),
  drop constraint if exists commander_execution_runs_cost_nonnegative_check,
  add constraint commander_execution_runs_cost_nonnegative_check
    check (cost_usd is null or cost_usd >= 0);

create index if not exists commander_execution_runs_worker_queue_idx
  on business_brain.commander_execution_runs (worker_next_attempt_at, created_at)
  where status = 'QUEUED';

create index if not exists commander_execution_runs_worker_lease_idx
  on business_brain.commander_execution_runs (worker_lease_expires_at)
  where worker_lease_token is not null;

comment on column business_brain.commander_execution_runs.worker_checkpoint is
  'Durable bounded OpenRouter worker checkpoint; never contains credentials or raw provider secrets.';
comment on column business_brain.commander_execution_runs.worker_lease_token is
  'Fencing token for one active worker claim. A stale worker cannot commit after lease replacement.';
