-- Preparation only: no route or UI enables durable intelligence feedback.
-- The server must encrypt payloads and require a separate explicit save consent.
-- Retention is until the owner deletes the record or the account is deleted.
begin;
-- The non-content revision prevents a delayed pre-revocation write from restoring data.
create table app_private.intelligence_feedback_state (
  account_id uuid primary key references app.accounts(id) on delete cascade,
  revision bigint not null default 0 check(revision between 0 and 9007199254740991)
);
alter table app_private.intelligence_feedback_state enable row level security;
alter table app_private.intelligence_feedback_state force row level security;
revoke all on app_private.intelligence_feedback_state from public,anon,authenticated,hh_app_backend,hh_app_inbox;
grant select,insert,update on app_private.intelligence_feedback_state to hh_app_backend;
create policy intelligence_state_owner_select on app_private.intelligence_feedback_state
  for select to hh_app_backend using(account_id=(select auth.uid()) and (select app_private.account_active()));
create policy intelligence_state_owner_insert on app_private.intelligence_feedback_state
  for insert to hh_app_backend with check(account_id=(select auth.uid()) and (select app_private.account_active()));
create policy intelligence_state_owner_update on app_private.intelligence_feedback_state
  for update to hh_app_backend using(account_id=(select auth.uid()) and (select app_private.account_active()))
  with check(account_id=(select auth.uid()) and (select app_private.account_active()));
create table app_private.intelligence_feedback_memory (
  account_id uuid not null references app.accounts(id) on delete cascade,
  operation_id uuid not null,
  consent_version text not null check(consent_version='intelligence-feedback-v1'),
  payload_ciphertext text not null check(char_length(payload_ciphertext) between 40 and 12000)
    check((jsonb_typeof(payload_ciphertext::jsonb)='object' and
      payload_ciphertext::jsonb->>'v'='1' and
      jsonb_typeof(payload_ciphertext::jsonb->'iv')='string' and
      jsonb_typeof(payload_ciphertext::jsonb->'tag')='string' and
      jsonb_typeof(payload_ciphertext::jsonb->'kid')='string' and
      jsonb_typeof(payload_ciphertext::jsonb->'data')='string') is true),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(account_id,operation_id)
);
alter table app_private.intelligence_feedback_memory enable row level security;
alter table app_private.intelligence_feedback_memory force row level security;
revoke all on app_private.intelligence_feedback_memory from public,anon,authenticated,hh_app_backend,hh_app_inbox;
grant select,insert,update,delete on app_private.intelligence_feedback_memory to hh_app_backend;
create policy intelligence_memory_owner_select on app_private.intelligence_feedback_memory
  for select to hh_app_backend using(account_id=(select auth.uid()) and (select app_private.account_active()));
create policy intelligence_memory_owner_insert on app_private.intelligence_feedback_memory
  for insert to hh_app_backend with check(account_id=(select auth.uid()) and (select app_private.account_active()));
create policy intelligence_memory_owner_update on app_private.intelligence_feedback_memory
  for update to hh_app_backend using(account_id=(select auth.uid()) and (select app_private.account_active()))
  with check(account_id=(select auth.uid()) and (select app_private.account_active()));
create policy intelligence_memory_owner_delete on app_private.intelligence_feedback_memory
  for delete to hh_app_backend using(account_id=(select auth.uid()) and (select app_private.account_active()));
commit;
