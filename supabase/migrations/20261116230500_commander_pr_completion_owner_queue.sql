-- Agents Commander owner PR Completion queue (existing Supabase project, no new service).
-- API roles receive no direct Data API access. The Edge Function authenticates
-- Supabase owner JWT or exact GitHub Actions OIDC before using server-side postgres.
create table if not exists business_brain.commander_pr_completions (
  request_id uuid primary key,
  owner_id uuid not null,
  chat_id uuid,
  pr_number integer not null check (pr_number between 1 and 99999999),
  requested_head_sha text not null check (requested_head_sha ~ '^[a-f0-9]{40}$'),
  observed_head_sha text,
  state text not null default 'QUEUED'
    check (state in ('QUEUED','LEASED','WATCHING','MERGED','CLOSED_UNMERGED','BLOCKED')),
  reason_code text,
  lease_token uuid,
  lease_until timestamptz,
  first_attempt_at timestamptz,
  dispatch_accepted boolean not null default false,
  observed_merge_sha text,
  merged_at timestamptz,
  last_checked_at timestamptz,
  checked_count integer not null default 0 check (checked_count >= 0),
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint commander_pr_completion_merge_sha_check check (
    observed_merge_sha is null or observed_merge_sha ~ '^[a-f0-9]{40}$'
  )
);
create unique index if not exists commander_pr_completions_active_pr
  on business_brain.commander_pr_completions(owner_id,pr_number)
  where state in ('QUEUED','LEASED','WATCHING');
create index if not exists commander_pr_completions_owner_recent
  on business_brain.commander_pr_completions(owner_id,created_at desc);
create index if not exists commander_pr_completions_watch_due
  on business_brain.commander_pr_completions(state,last_checked_at,created_at)
  where state in ('QUEUED','LEASED','WATCHING');
alter table business_brain.commander_pr_completions enable row level security;
revoke all on business_brain.commander_pr_completions from public,anon,authenticated;
comment on table business_brain.commander_pr_completions is
  'Owner-verified PR-number completion tasks. Source writes require signed GitHub Actions control, never text-model receipts.';
