-- Private, versioned 4-sector development goals for My Profile & Reports.
-- Goal values contain only voluntary 0..100 positions; encrypted by the app.
-- Assessment results remain exclusively in their existing verified tables.
begin;
create table if not exists app_private.development_goals (
  account_id uuid primary key references app.accounts(id) on delete cascade,
  targets_ciphertext text not null,
  revision integer not null default 1 check (revision > 0),
  updated_at timestamptz not null default now()
);
alter table app_private.development_goals enable row level security;
revoke all on table app_private.development_goals from public, anon, authenticated;
grant select, insert, update on table app_private.development_goals to hh_app_backend;
do $policies$
begin
  if not exists (select 1 from pg_policies where schemaname='app_private' and tablename='development_goals' and policyname='development_goals_owner_select') then
    create policy development_goals_owner_select on app_private.development_goals
      for select to hh_app_backend
      using (account_id = (select auth.uid()) and (select app_private.account_active()));
  end if;
  if not exists (select 1 from pg_policies where schemaname='app_private' and tablename='development_goals' and policyname='development_goals_owner_insert') then
    create policy development_goals_owner_insert on app_private.development_goals
      for insert to hh_app_backend
      with check (account_id = (select auth.uid()) and (select app_private.account_active()));
  end if;
  if not exists (select 1 from pg_policies where schemaname='app_private' and tablename='development_goals' and policyname='development_goals_owner_update') then
    create policy development_goals_owner_update on app_private.development_goals
      for update to hh_app_backend
      using (account_id = (select auth.uid()) and (select app_private.account_active()))
      with check (account_id = (select auth.uid()) and (select app_private.account_active()));
  end if;
end;
$policies$;
commit;
