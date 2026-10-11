-- Inner Growth / My Course: independent, private, consent-led self-help programme.
-- The course reuses app.assessment_results and existing assessment_plans; never duplicates clinical scores.
begin;
create table app_private.growth_courses (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null unique references app.accounts(id) on delete cascade,
  status text not null default 'active' check(status in ('active','paused')),
  stage smallint not null default 1 check(stage between 1 and 4),
  concerns_ciphertext text,
  focus_tags text[] not null default '{}',
  goals text[] not null default '{}',
  duration_days smallint not null default 14 check(duration_days in (14,28)),
  day_completions jsonb not null default '{}'::jsonb check(jsonb_typeof(day_completions)='object'),
  revision integer not null default 0 check(revision>=0),
  consented_at timestamptz not null,
  chosen_at timestamptz,
  started_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(cardinality(focus_tags)<=6 and cardinality(goals)<=3),
  check((stage<4) or (cardinality(goals)>=1 and started_at is not null and chosen_at is not null))
);
create index growth_courses_account_updated on app_private.growth_courses(account_id,updated_at desc);
revoke all on table app_private.growth_courses from public,anon,authenticated,hh_app_inbox;
grant select,insert,update on table app_private.growth_courses to hh_app_backend;
alter table app_private.growth_courses enable row level security;
create policy growth_courses_read on app_private.growth_courses
  for select to hh_app_backend
  using(account_id=(select auth.uid()) and (select app_private.account_active()));
create policy growth_courses_create on app_private.growth_courses
  for insert to hh_app_backend
  with check(account_id=(select auth.uid()) and (select app_private.account_active()));
create policy growth_courses_update on app_private.growth_courses
  for update to hh_app_backend
  using(account_id=(select auth.uid()) and (select app_private.account_active()))
  with check(account_id=(select auth.uid()) and (select app_private.account_active()));
commit;
