create table if not exists business_brain.commander_ci_event_inbox (
  ci_event_id uuid primary key default gen_random_uuid(),
  repository text not null check (repository = 'andylitvinov-design/books'),
  workflow_name text not null,
  workflow_path text not null check (workflow_path = '.github/workflows/hh-pr-core-release.yml'),
  workflow_run_id bigint not null check (workflow_run_id > 0),
  run_attempt integer not null check (run_attempt > 0),
  workflow_run_head_sha text not null check (workflow_run_head_sha ~ '^[a-f0-9]{40}$'),
  head_branch text not null,
  pr_number integer not null check (pr_number > 0),
  base_ref text not null check (base_ref = 'codex/public-book-library'),
  base_sha text check (base_sha is null or base_sha ~ '^[a-f0-9]{40}$'),
  head_ref text not null,
  head_sha text not null check (head_sha ~ '^[a-f0-9]{40}$'),
  conclusion text not null check (conclusion in ('failure','timed_out','startup_failure')),
  category text not null check (category in ('TYPESCRIPT','TEST_FAILURE','SECURITY','INFRASTRUCTURE','MERGE_CONFLICT','BASE_ADVANCED','UNKNOWN')),
  failed_jobs jsonb not null default '[]'::jsonb check (jsonb_typeof(failed_jobs)='array'),
  failed_steps jsonb not null default '[]'::jsonb check (jsonb_typeof(failed_steps)='array'),
  run_url text not null,
  source_run_created_at timestamptz,
  oidc_workflow_ref text not null,
  association_status text not null default 'UNMATCHED',
  associated_task_id uuid references business_brain.commander_tasks(task_id) on delete set null,
  associated_owner_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(repository,workflow_run_id,run_attempt,pr_number,head_sha)
);

create index if not exists commander_ci_event_inbox_pr_created_idx
  on business_brain.commander_ci_event_inbox(pr_number,created_at desc);
create index if not exists commander_ci_event_inbox_owner_created_idx
  on business_brain.commander_ci_event_inbox(associated_owner_id,created_at desc)
  where associated_owner_id is not null;

alter table business_brain.commander_ci_event_inbox enable row level security;
revoke all on business_brain.commander_ci_event_inbox from public, anon, authenticated;
