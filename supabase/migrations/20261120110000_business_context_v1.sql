-- Context Mind v2 business operations only. Personal coaching, psychological
-- records and their grants never enter these tables.
begin;

create table if not exists app_private.business_context_connections (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references app.accounts(id) on delete cascade,
  provider text not null check (provider in ('fireflies','plaud_import','linear')),
  purpose text not null default 'business_meeting_context' check (purpose='business_meeting_context'),
  credential_ref text, -- opaque server-side secret reference, never a token
  scopes jsonb not null default '[]'::jsonb check (jsonb_typeof(scopes)='array'),
  grant_version integer not null default 1 check (grant_version>0),
  consented_at timestamptz not null default now(),
  revoked_at timestamptz,
  cursor_value text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(account_id,provider,purpose)
);

create table if not exists app_private.business_source_records (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references app.accounts(id) on delete cascade,
  connection_id uuid not null references app_private.business_context_connections(id) on delete cascade,
  provider text not null check (provider in ('fireflies','plaud_import')),
  provider_record_id text not null check (char_length(provider_record_id) between 1 and 512),
  revision_hash text not null check (revision_hash ~ '^[a-f0-9]{64}$'),
  occurred_at timestamptz,
  source_url text,
  payload_ciphertext text not null,
  created_at timestamptz not null default now(),
  unique (account_id, provider, provider_record_id, revision_hash)
);

create table if not exists app_private.business_call_insights (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references app.accounts(id) on delete cascade,
  source_record_id uuid not null references app_private.business_source_records(id) on delete cascade,
  project_ref text,
  kind text not null check (kind in ('decision','action','completion_report','blocker','followup')),
  evidence_ciphertext text not null,
  evidence_hash text not null check (evidence_hash ~ '^[a-f0-9]{64}$'),
  status text not null default 'candidate' check (status in ('candidate','reviewed','rejected','superseded','deleted')),
  review_reasons jsonb not null default '[]'::jsonb check (jsonb_typeof(review_reasons)='array'),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create table if not exists app_private.business_task_proposals (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references app.accounts(id) on delete cascade,
  insight_id uuid not null references app_private.business_call_insights(id) on delete cascade,
  project_ref text not null,
  operation text not null check (operation in ('link_existing','propose_create','propose_update','propose_complete','no_action')),
  target_issue_id text,
  idempotency_key text not null check (char_length(idempotency_key) between 32 and 128),
  status text not null default 'needs_review' check (status in ('needs_review','approved','rejected','applied','failed')),
  apply_result_ciphertext text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  applied_at timestamptz,
  unique (account_id, idempotency_key)
);

create table if not exists app_private.business_project_context (
  project_ref text not null,
  account_id uuid not null references app.accounts(id) on delete cascade,
  version integer not null default 1 check (version>0),
  context_ciphertext text not null,
  source_refs jsonb not null default '[]'::jsonb check (jsonb_typeof(source_refs)='array'),
  updated_at timestamptz not null default now(),
  primary key(project_ref,account_id)
);

create table if not exists app_private.business_context_sync_runs (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references app.accounts(id) on delete cascade,
  connection_id uuid not null references app_private.business_context_connections(id) on delete cascade,
  status text not null check (status in ('running','succeeded','partial','failed')),
  seen_count integer not null default 0 check (seen_count>=0),
  ingested_count integer not null default 0 check (ingested_count>=0),
  skipped_count integer not null default 0 check (skipped_count>=0),
  failed_count integer not null default 0 check (failed_count>=0),
  cursor_after text,
  error_code text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

grant select,insert,update,delete on
 app_private.business_context_connections,app_private.business_source_records,
 app_private.business_call_insights,app_private.business_task_proposals,
 app_private.business_project_context,app_private.business_context_sync_runs
to hh_app_backend;

do $$
declare t text;
begin
 foreach t in array array['business_context_connections','business_source_records','business_call_insights','business_task_proposals','business_project_context','business_context_sync_runs'] loop
  execute format('alter table app_private.%I enable row level security',t);
  execute format('create policy %I on app_private.%I for select to hh_app_backend using (account_id=(select auth.uid()) and (select app_private.account_active()))',t||'_owner_select',t);
  execute format('create policy %I on app_private.%I for insert to hh_app_backend with check (account_id=(select auth.uid()) and (select app_private.account_active()))',t||'_owner_insert',t);
  execute format('create policy %I on app_private.%I for update to hh_app_backend using (account_id=(select auth.uid()) and (select app_private.account_active())) with check (account_id=(select auth.uid()) and (select app_private.account_active()))',t||'_owner_update',t);
  execute format('create policy %I on app_private.%I for delete to hh_app_backend using (account_id=(select auth.uid()) and (select app_private.account_active()))',t||'_owner_delete',t);
 end loop;
end $$;
commit;
