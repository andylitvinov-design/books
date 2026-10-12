-- LOCAL PROPOSAL ONLY. Live application and table grants need separate approval.
-- Accounts are bound to auth.users by the existing verified actor contract.
-- The accepted R3 intake and all legacy 14-day cycles remain unchanged.
begin;
create table app_private.growth_course_daily_21 (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null unique references app.accounts(id) on delete cascade,
  course_id uuid not null,
  source_revision integer not null check(source_revision>=0),
  model_version text not null check(model_version='hh-course-strategy-21-v1'),
  content_version text not null check(char_length(content_version) between 1 and 100),
  duration_days smallint not null default 21 check(duration_days=21),
  revision integer not null default 0 check(revision>=0),
  status text not null default 'active' check(status in ('active','paused','finished')),
  state_ciphertext text not null check(octet_length(state_ciphertext) between 20 and 524288),
  consented_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key(course_id,account_id) references app_private.growth_courses(id,account_id) on delete cascade
);
revoke all on table app_private.growth_course_daily_21 from public,anon,authenticated,hh_app_inbox,hh_app_backend;
-- Only mutable progress columns can be updated; ownership/version/consent are fixed.
-- This new persistent table access is NOT authorized for live application here.
grant select,insert on table app_private.growth_course_daily_21 to hh_app_backend;
grant update(state_ciphertext,status,revision,updated_at) on table app_private.growth_course_daily_21 to hh_app_backend;
alter table app_private.growth_course_daily_21 enable row level security;
alter table app_private.growth_course_daily_21 force row level security;
create policy growth_course_daily_21_read on app_private.growth_course_daily_21
  for select to hh_app_backend using(account_id=(select auth.uid()) and (select app_private.account_active()));
create policy growth_course_daily_21_create on app_private.growth_course_daily_21
  for insert to hh_app_backend with check(account_id=(select auth.uid()) and (select app_private.account_active()));
create policy growth_course_daily_21_update on app_private.growth_course_daily_21
  for update to hh_app_backend using(account_id=(select auth.uid()) and (select app_private.account_active()))
  with check(account_id=(select auth.uid()) and (select app_private.account_active()));
commit;
