-- PROPOSAL ONLY. Do not apply until the shared Clarity quota/lease, privacy
-- lifecycle and provider evidence adapters are reviewed and tested together.
create table app_private.anti_stress_runs (
 account_id uuid not null references app.accounts(id) on delete cascade,
 id uuid not null,
 revision bigint not null check(revision>=1),
 payload_ciphertext text not null,
 live_active boolean not null default false,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 primary key(account_id,id)
);
create unique index anti_stress_one_live_run on app_private.anti_stress_runs(account_id) where live_active;
create table app_private.anti_stress_sessions (
 account_id uuid not null,
 course_run_id uuid not null,
 session_number smallint not null check(session_number between 1 and 3),
 protocol_id uuid not null,
 review_revision bigint not null default 0 check(review_revision>=0),
 ledger_ciphertext text,
 log_ciphertext text,
 primary key(account_id,course_run_id,session_number),
 unique(account_id,protocol_id),
 foreign key(account_id,course_run_id) references app_private.anti_stress_runs(account_id,id) on delete cascade
);
alter table app_private.anti_stress_runs enable row level security;
alter table app_private.anti_stress_runs force row level security;
alter table app_private.anti_stress_sessions enable row level security;
alter table app_private.anti_stress_sessions force row level security;
revoke all on app_private.anti_stress_runs,app_private.anti_stress_sessions from public,anon,authenticated;
grant select,insert on app_private.anti_stress_runs,app_private.anti_stress_sessions to hh_app_backend;
grant update(revision,payload_ciphertext,live_active,updated_at) on app_private.anti_stress_runs to hh_app_backend;
-- PROPOSED only: verify trusted runtime, privacy lifecycle and RLS before applying.
grant update(review_revision,ledger_ciphertext,log_ciphertext) on app_private.anti_stress_sessions to hh_app_backend;
create policy anti_stress_run_select on app_private.anti_stress_runs for select to hh_app_backend using(account_id=(select auth.uid()) and (select app_private.account_active()));
create policy anti_stress_run_insert on app_private.anti_stress_runs for insert to hh_app_backend with check(account_id=(select auth.uid()) and (select app_private.account_active()));
create policy anti_stress_run_update on app_private.anti_stress_runs for update to hh_app_backend using(account_id=(select auth.uid()) and (select app_private.account_active())) with check(account_id=(select auth.uid()) and (select app_private.account_active()));
create policy anti_stress_session_select on app_private.anti_stress_sessions for select to hh_app_backend using(account_id=(select auth.uid()) and (select app_private.account_active()));
create policy anti_stress_session_insert on app_private.anti_stress_sessions for insert to hh_app_backend with check(account_id=(select auth.uid()) and (select app_private.account_active()));
-- No cross-program concurrency assumption: add shared owner lease to all
-- transports and confirm global free-day claims, RLS, account export/deletion.

create policy anti_stress_session_update on app_private.anti_stress_sessions for update to hh_app_backend using(account_id=(select auth.uid()) and (select app_private.account_active())) with check(account_id=(select auth.uid()) and (select app_private.account_active()));
