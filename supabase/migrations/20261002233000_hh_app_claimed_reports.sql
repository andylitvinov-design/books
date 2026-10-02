-- Holistic House R1.1: claim one explicitly shared legacy report into one self-service account.
-- The bearer share remains in encrypted legacy storage; this table stores only the claimed account copy.
begin;

create table app.account_reports(
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references app.accounts(id) on delete cascade,
  source_assessment_id uuid not null unique,
  source_revision integer not null check(source_revision > 0),
  payload_ciphertext text not null,
  claimed_at timestamptz not null default now(),
  unique(account_id, source_assessment_id)
);

create index account_reports_account_time on app.account_reports(account_id, claimed_at desc);

alter table app.account_reports enable row level security;
revoke all on app.account_reports from public, anon, authenticated;
grant select on app.account_reports to authenticated, hh_app_backend;
grant insert on app.account_reports to hh_app_backend;

create policy own_account_reports_read on app.account_reports
for select to authenticated, hh_app_backend
using(account_id=(select auth.uid()) and (select app_private.account_active()));

create policy own_account_reports_create on app.account_reports
for insert to hh_app_backend
with check(account_id=(select auth.uid()) and (select app_private.account_active()));

create function app_private.immutable_account_report() returns trigger
language plpgsql set search_path='' as $$
begin
  raise exception 'IMMUTABLE_ACCOUNT_REPORT';
end $$;

create trigger immutable_account_report
before update on app.account_reports
for each row execute function app_private.immutable_account_report();

revoke all on function app_private.immutable_account_report() from public, anon, authenticated;

commit;
