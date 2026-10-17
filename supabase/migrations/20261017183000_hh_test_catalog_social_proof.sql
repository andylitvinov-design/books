-- Test catalog social proof: aggregated starts/completions and one voluntary rating per tester/test.
-- Counts are anonymous aggregates; raw questionnaire answers never enter these tables.
begin;

create table if not exists app_private.test_catalog_activity (
  definition_key text primary key,
  starts bigint not null default 0 check (starts >= 0),
  completions bigint not null default 0 check (completions >= 0),
  updated_at timestamptz not null default now()
);
alter table app_private.test_catalog_activity enable row level security;
revoke all on app_private.test_catalog_activity from public, anon, authenticated, hh_app_backend, hh_app_inbox;

-- Keep the historical aggregate when a user deletes an account or a temporary
-- guest session expires; it contains no user/session identifiers.
-- Lock writers during the one-time backfill so no starts/completions are missed.
lock table app.assessment_runs, app.assessment_results,
  app_private.guest_runs, app_private.guest_results in share row exclusive mode;
insert into app_private.test_catalog_activity(definition_key, starts, completions)
select v.definition_key, sum(activity.started)::bigint, sum(activity.completed)::bigint
from (
  select assessment_version_id as version_id, 1::bigint as started, 0::bigint as completed
    from app.assessment_runs
  union all
  select assessment_version_id, 1::bigint, 0::bigint
    from app_private.guest_runs
  union all
  select source_version_id, 0::bigint, 1::bigint
    from app.assessment_results
  union all
  select source_version_id, 0::bigint, 1::bigint
    from app_private.guest_results
) activity
join app.assessment_versions v on v.id = activity.version_id
group by v.definition_key
on conflict (definition_key) do update
set starts = excluded.starts,
    completions = excluded.completions,
    updated_at = now();

create function app_private.record_test_catalog_activity()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  key text;
  started bigint := 0;
  finished bigint := 0;
begin
  if tg_argv[0] = 'start' then
    select v.definition_key into key from app.assessment_versions v
    where v.id = new.assessment_version_id;
    started := 1;
  else
    select v.definition_key into key from app.assessment_versions v
    where v.id = new.source_version_id;
    finished := 1;
  end if;
  if key is not null then
    insert into app_private.test_catalog_activity(definition_key,starts,completions)
    values(key,started,finished)
    on conflict(definition_key) do update
    set starts = app_private.test_catalog_activity.starts + excluded.starts,
        completions = app_private.test_catalog_activity.completions + excluded.completions,
        updated_at = now();
  end if;
  return new;
end $$;
revoke all on function app_private.record_test_catalog_activity() from public, anon, authenticated;

create trigger test_catalog_account_start after insert on app.assessment_runs
for each row execute function app_private.record_test_catalog_activity('start');
create trigger test_catalog_guest_start after insert on app_private.guest_runs
for each row execute function app_private.record_test_catalog_activity('start');
create trigger test_catalog_account_finish after insert on app.assessment_results
for each row execute function app_private.record_test_catalog_activity('complete');
create trigger test_catalog_guest_finish after insert on app_private.guest_results
for each row execute function app_private.record_test_catalog_activity('complete');

create table if not exists app_private.test_catalog_ratings (
  id uuid primary key default gen_random_uuid(),
  definition_key text not null check(definition_key ~ '^[a-z0-9][a-z0-9-]{0,99}$'),
  account_id uuid references app.accounts(id) on delete cascade,
  guest_session_id uuid references app_private.guest_sessions(id) on delete cascade,
  rating smallint not null check(rating between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint test_catalog_ratings_one_identity check (
    (account_id is null) <> (guest_session_id is null)
  ),
  unique(account_id, definition_key),
  unique(guest_session_id, definition_key)
);
create index if not exists test_catalog_ratings_key_idx
  on app_private.test_catalog_ratings(definition_key);
alter table app_private.test_catalog_ratings enable row level security;
alter table app_private.test_catalog_ratings force row level security;
revoke all on app_private.test_catalog_ratings from public, anon, authenticated, hh_app_inbox;
grant select,insert on app_private.test_catalog_ratings to hh_app_backend;
grant update(rating,updated_at) on app_private.test_catalog_ratings to hh_app_backend;
create policy test_catalog_ratings_read on app_private.test_catalog_ratings for select to hh_app_backend
using (
  (account_id = (select auth.uid()) and (select app_private.account_active()))
  or
  (guest_session_id::text = current_setting('hh.verified_test_rating_guest', true))
);
create policy test_catalog_ratings_write on app_private.test_catalog_ratings for insert to hh_app_backend
with check (
  (account_id = (select auth.uid()) and (select app_private.account_active()))
  or
  (guest_session_id::text = current_setting('hh.verified_test_rating_guest', true))
);
create policy test_catalog_ratings_edit on app_private.test_catalog_ratings for update to hh_app_backend
using (
  (account_id = (select auth.uid()) and (select app_private.account_active()))
  or
  (guest_session_id::text = current_setting('hh.verified_test_rating_guest', true))
)
with check (
  (account_id = (select auth.uid()) and (select app_private.account_active()))
  or
  (guest_session_id::text = current_setting('hh.verified_test_rating_guest', true))
);

-- Public projection ONLY: no identities, answers, sessions, dates or free text.
-- Read through the backend-only function, not direct client table grants.
create function app_private.test_catalog_public_stats()
returns table (
  definition_key text,
  starts bigint,
  completions bigint,
  rating_count bigint,
  average_rating numeric
)
language sql stable security definer set search_path = '' as $$
  select a.definition_key, a.starts, a.completions,
    count(r.id)::bigint as rating_count,
    round(avg(r.rating::numeric), 1) as average_rating
  from app_private.test_catalog_activity a
  left join app_private.test_catalog_ratings r on r.definition_key = a.definition_key
  group by a.definition_key, a.starts, a.completions
$$;
revoke all on function app_private.test_catalog_public_stats() from public, anon, authenticated, hh_app_inbox;
grant execute on function app_private.test_catalog_public_stats() to hh_app_backend;
commit;
