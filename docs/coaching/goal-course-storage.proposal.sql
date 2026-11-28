-- PROPOSAL ONLY: existing private database; no migration registration.
-- Activate only after shared entitlement/transport and privacy lifecycle tests.
create table app_private.goal_course_runs (
 account_id uuid not null references app.accounts(id) on delete cascade,
 id uuid not null, goal_id uuid not null, entitlement_id uuid not null unique,
 revision bigint not null check(revision>=0), payload_ciphertext text not null,
 created_at timestamptz not null default now(), primary key(account_id,id)
);
create table app_private.goal_course_run_sessions (
 account_id uuid not null, course_run_id uuid not null,
 course_day smallint not null check(course_day between 1 and 8), protocol_id uuid not null,
 primary key(account_id,course_run_id,course_day), unique(account_id,protocol_id),
 unique(account_id,course_run_id,course_day,protocol_id),
 foreign key(account_id,course_run_id) references app_private.goal_course_runs(account_id,id) on delete cascade
);
create table app_private.goal_course_result_records (
 account_id uuid not null, id uuid not null, course_run_id uuid not null,
 course_day smallint not null, protocol_id uuid not null,
 revision bigint not null check(revision=1),
 source_hash text not null check(source_hash ~ '^[a-f0-9]{64}$'), payload_ciphertext text not null,
 created_at timestamptz not null default now(), primary key(account_id,id),
 unique(account_id,course_run_id,course_day),
 foreign key(account_id,course_run_id,course_day,protocol_id)
 references app_private.goal_course_run_sessions(account_id,course_run_id,course_day,protocol_id) on delete cascade,
 foreign key(account_id,protocol_id)
 references app_private.my_coach_protocol_records(account_id,protocol_id) on delete cascade
);
alter table app_private.goal_course_runs enable row level security;
alter table app_private.goal_course_runs force row level security;
revoke all on app_private.goal_course_runs from public,anon,authenticated;
grant select,insert on app_private.goal_course_runs to hh_app_backend;
create policy goal_course_runs_select on app_private.goal_course_runs for select to hh_app_backend using(account_id=(select auth.uid()) and (select app_private.account_active()));
create policy goal_course_runs_insert on app_private.goal_course_runs for insert to hh_app_backend with check(account_id=(select auth.uid()) and (select app_private.account_active()));
alter table app_private.goal_course_run_sessions enable row level security;
alter table app_private.goal_course_run_sessions force row level security;
revoke all on app_private.goal_course_run_sessions from public,anon,authenticated;
grant select,insert on app_private.goal_course_run_sessions to hh_app_backend;
create policy goal_course_run_sessions_select on app_private.goal_course_run_sessions for select to hh_app_backend using(account_id=(select auth.uid()) and (select app_private.account_active()));
create policy goal_course_run_sessions_insert on app_private.goal_course_run_sessions for insert to hh_app_backend with check(account_id=(select auth.uid()) and (select app_private.account_active()));
alter table app_private.goal_course_result_records enable row level security;
alter table app_private.goal_course_result_records force row level security;
revoke all on app_private.goal_course_result_records from public,anon,authenticated;
grant select,insert on app_private.goal_course_result_records to hh_app_backend;
create policy goal_course_result_records_select on app_private.goal_course_result_records for select to hh_app_backend using(account_id=(select auth.uid()) and (select app_private.account_active()));
create policy goal_course_result_records_insert on app_private.goal_course_result_records for insert to hh_app_backend with check(account_id=(select auth.uid()) and (select app_private.account_active()));
grant update(revision,payload_ciphertext) on app_private.goal_course_runs to hh_app_backend;
create policy goal_course_runs_update on app_private.goal_course_runs for update to hh_app_backend
 using(account_id=(select auth.uid()) and (select app_private.account_active()))
 with check(account_id=(select auth.uid()) and (select app_private.account_active()));
-- Immutable v1 snapshot; explicit reviewed correction revisions and early
-- voluntary closure remain separate activation requirements.
