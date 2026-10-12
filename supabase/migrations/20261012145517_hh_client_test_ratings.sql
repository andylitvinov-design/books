-- Pending migration: client usefulness ratings. Apply only after explicit review.
-- The private source table is never exposed through the Supabase Data API.
begin;
create table app_private.test_ratings (
  account_id uuid not null references app.accounts(id) on delete cascade,
  definition_key text not null,
  source_version_id uuid not null references app.assessment_versions(id),
  source_result_id uuid not null,
  stars smallint check (stars between 1 and 5),
  revision integer not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (account_id, definition_key),
  foreign key (source_result_id, account_id) references app.assessment_results(id, account_id) on delete cascade
);
create index test_ratings_version on app_private.test_ratings(source_version_id);
alter table app_private.test_ratings enable row level security;
revoke all on app_private.test_ratings from public, anon, authenticated, hh_app_inbox;
grant select, insert, update on app_private.test_ratings to hh_app_backend;
create policy own_test_ratings_read on app_private.test_ratings for select to hh_app_backend
using (account_id = (select auth.uid()) and (select app_private.account_active()));
create policy own_test_ratings_create on app_private.test_ratings for insert to hh_app_backend
with check (
  account_id = (select auth.uid()) and (select app_private.account_active()) and
  exists (select 1 from app.assessment_results r
    join app.assessment_runs run on run.id = r.run_id and run.account_id = r.account_id
    join app.assessment_versions v on v.id = r.source_version_id
    where r.id = test_ratings.source_result_id and r.account_id = test_ratings.account_id
      and r.source_version_id = test_ratings.source_version_id
      and v.definition_key = test_ratings.definition_key and run.status = 'completed')
);
create policy own_test_ratings_edit on app_private.test_ratings for update to hh_app_backend
using (account_id = (select auth.uid()) and (select app_private.account_active()))
with check (
  account_id = (select auth.uid()) and (select app_private.account_active()) and
  exists (select 1 from app.assessment_results r
    join app.assessment_runs run on run.id = r.run_id and run.account_id = r.account_id
    join app.assessment_versions v on v.id = r.source_version_id
    where r.id = test_ratings.source_result_id and r.account_id = test_ratings.account_id
      and r.source_version_id = test_ratings.source_version_id
      and v.definition_key = test_ratings.definition_key and run.status = 'completed')
);
-- Deliberate, narrow aggregate-only exception to owner RLS. No parameters, dynamic
-- SQL, names, account/result IDs, answers, dimensions or individual votes returned.
-- Private schema + explicit EXECUTE revocation: never a public PostgREST RPC.
create function app_private.test_rating_summaries()
returns table(definition_id uuid, rating_count bigint, rating_sum bigint)
language sql stable security definer set search_path = '' as $$
  select r.source_version_id, count(*), sum(r.stars)::bigint
  from app_private.test_ratings r join app.accounts a on a.id = r.account_id
  where a.status = 'active' and r.stars is not null
  group by r.source_version_id
$$;
revoke all on function app_private.test_rating_summaries() from public, anon, authenticated, hh_app_inbox;
grant execute on function app_private.test_rating_summaries() to hh_app_backend;
commit;
