-- 2026-10-17: Principles of Energywork independent Academy learner progress.
-- Additive only: no changes to OPORA, tests, billing, clients or public media.
-- User reflection data is AES-256-GCM encrypted by the existing app server,
-- using the row UUID as AAD. Anonymous and Data API clients have no grants.
begin;
create table app_private.academy_course_progress (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references app.accounts(id) on delete cascade,
  course_key text not null default 'academy-energywork-principles'
    check (course_key = 'academy-energywork-principles'),
  course_version text not null default '2026-10-17.p0'
    check (course_version = '2026-10-17.p0'),
  slide_id text not null default 'welcome-01'
    check (slide_id ~ '^[a-z][a-z0-9-]{1,48}$'),
  path_id text check (path_id in ('yggdrasil','tantra','kundalini')),
  answers_ciphertext text,
  revision integer not null default 0 check (revision >= 0),
  status text not null default 'active' check (status in ('active','completed')),
  consented_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (account_id,course_key),
  constraint academy_progress_completed_consistency
    check (status='active' or (status='completed' and completed_at is not null))
);
create index academy_course_progress_updated_idx on
  app_private.academy_course_progress(account_id,updated_at desc);
alter table app_private.academy_course_progress enable row level security;
alter table app_private.academy_course_progress force row level security;
revoke all on app_private.academy_course_progress from
  public, anon, authenticated, hh_app_inbox;
do $revoke_service$ begin
  if exists(select 1 from pg_roles where rolname='service_role') then
    execute 'revoke all on app_private.academy_course_progress from service_role';
  end if;
end $revoke_service$;
grant select,insert,delete on app_private.academy_course_progress to hh_app_backend;
grant update (slide_id,path_id,answers_ciphertext,revision,status,completed_at,updated_at)
  on app_private.academy_course_progress to hh_app_backend;
create policy academy_course_progress_select on app_private.academy_course_progress
  for select to hh_app_backend
  using (account_id=(select auth.uid()) and (select app_private.account_active()));
create policy academy_course_progress_insert on app_private.academy_course_progress
  for insert to hh_app_backend
  with check (account_id=(select auth.uid()) and (select app_private.account_active()));
create policy academy_course_progress_update on app_private.academy_course_progress
  for update to hh_app_backend
  using (account_id=(select auth.uid()) and (select app_private.account_active()))
  with check (account_id=(select auth.uid()) and (select app_private.account_active()));
create policy academy_course_progress_delete on app_private.academy_course_progress
  for delete to hh_app_backend
  using (account_id=(select auth.uid()) and (select app_private.account_active()));
commit;
