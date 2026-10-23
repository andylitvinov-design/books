-- Holistic House · Personal Coaching Session v1.
-- Independently stored from legacy 90-day business programme. No destructive changes.
-- All reflections are account-scoped and AES-GCM encrypted by the Node backend.
begin;
create table if not exists app_private.personal_coaching_sessions (
  account_id uuid primary key references app.accounts(id) on delete cascade,
  payload_ciphertext text not null check(char_length(payload_ciphertext) between 40 and 120000),
  revision integer not null default 1 check(revision>0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table app_private.personal_coaching_sessions enable row level security;
revoke all on table app_private.personal_coaching_sessions from public,anon,authenticated;
grant select,insert,update,delete on app_private.personal_coaching_sessions to hh_app_backend;
create policy personal_coaching_owner_select on app_private.personal_coaching_sessions
 for select to hh_app_backend
 using(account_id=(select auth.uid()) and (select app_private.account_active()));
create policy personal_coaching_owner_insert on app_private.personal_coaching_sessions
 for insert to hh_app_backend
 with check(account_id=(select auth.uid()) and (select app_private.account_active()));
create policy personal_coaching_owner_update on app_private.personal_coaching_sessions
 for update to hh_app_backend
 using(account_id=(select auth.uid()) and (select app_private.account_active()))
 with check(account_id=(select auth.uid()) and (select app_private.account_active()));
create policy personal_coaching_owner_delete on app_private.personal_coaching_sessions
 for delete to hh_app_backend
 using(account_id=(select auth.uid()) and (select app_private.account_active()));
commit;
