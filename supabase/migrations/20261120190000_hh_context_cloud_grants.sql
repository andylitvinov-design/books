-- Consent evidence only. Source values stay in their existing encrypted stores.
create table app_private.context_cloud_grants (
  revision bigint generated always as identity primary key,
  account_id uuid not null references app.accounts(id) on delete cascade,
  purpose text not null check (purpose = 'coaching'),
  role_key text not null check (role_key = 'coach'),
  provider_key text not null check (provider_key in ('groq', 'gemini_free', 'gemini_paid', 'openrouter')),
  policy_version text not null check (char_length(policy_version) between 1 and 80),
  category text not null check (category in ('goals', 'actions', 'reports', 'preferences', 'test_results')),
  item_id uuid,
  scale_key text,
  source_revision text,
  session_id uuid,
  decision text not null check (decision in ('grant', 'revoke')),
  occurred_at timestamptz not null default statement_timestamp(),
  expires_at timestamptz,
  check ((category = 'test_results' and item_id is not null and scale_key is not null
           and scale_key ~ '^trait[.]ipip50[.][a-z_]{1,40}$')
         or (category <> 'test_results' and scale_key is null)),
  check (
    (item_id is not null and decision = 'grant' and source_revision is not null
      and char_length(source_revision) between 1 and 128)
    or ((item_id is null or decision = 'revoke') and source_revision is null)
  ),
  check (expires_at is null or (decision = 'grant' and expires_at > occurred_at))
);

create index context_cloud_grants_owner_scope_idx
  on app_private.context_cloud_grants (account_id, provider_key, category, revision desc);

alter table app_private.context_cloud_grants enable row level security;
revoke all on table app_private.context_cloud_grants from public, anon, authenticated;
grant select, insert on table app_private.context_cloud_grants to hh_app_backend;
grant usage on sequence app_private.context_cloud_grants_revision_seq to hh_app_backend;

create policy context_cloud_grants_owner_select
  on app_private.context_cloud_grants for select to hh_app_backend
  using (account_id = (select auth.uid()) and (select app_private.account_active()));

create policy context_cloud_grants_owner_insert
  on app_private.context_cloud_grants for insert to hh_app_backend
  with check (account_id = (select auth.uid()) and (select app_private.account_active()));
