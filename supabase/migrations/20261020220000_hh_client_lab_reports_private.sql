-- Private, client-controlled laboratory report data. Never store source files or unreviewed OCR.
-- App backend seals the structured payload with account+record associated authenticated encryption.
begin;
create table if not exists app_private.lab_reports (
  id uuid primary key,
  account_id uuid not null references app.accounts(id) on delete cascade,
  payload_ciphertext text not null,
  created_at timestamptz not null default now(),
  constraint lab_reports_payload_length check (length(payload_ciphertext) between 32 and 65000)
);
create index if not exists lab_reports_owner_created_idx on app_private.lab_reports(account_id,created_at desc);
alter table app_private.lab_reports enable row level security;
alter table app_private.lab_reports force row level security;
revoke all on app_private.lab_reports from public, anon, authenticated;
grant select, insert, delete on app_private.lab_reports to hh_app_backend;
create policy lab_reports_owner_select on app_private.lab_reports for select to hh_app_backend
  using (account_id=(select auth.uid()) and (select app_private.account_active()));
create policy lab_reports_owner_insert on app_private.lab_reports for insert to hh_app_backend
  with check (account_id=(select auth.uid()) and (select app_private.account_active()));
create policy lab_reports_owner_delete on app_private.lab_reports for delete to hh_app_backend
  using (account_id=(select auth.uid()) and (select app_private.account_active()));
commit;
