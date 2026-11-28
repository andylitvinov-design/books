-- Additive, dormant coaching course storage. Runtime activation remains separately gated.
create table app_private.clarity_course_runs (
 account_id uuid not null references app.accounts(id) on delete cascade,
 id uuid not null,
 ordinal integer not null check(ordinal>0),
 access text not null check(access in ('free','paid')),
 revision bigint not null check(revision>=0),
 payload_ciphertext text not null,
 payment_key text unique,
 live_active boolean not null default false,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 primary key(account_id,id),
 unique(account_id,ordinal),
 check ((ordinal=1 and access='free' and payment_key is null and revision>=1) or
        (ordinal>1 and access='paid' and payment_key is not null)),
 check (payment_key is null or payment_key ~ '^[0-9a-f]{64}$')
);
create unique index clarity_one_live_course_per_account on app_private.clarity_course_runs(account_id) where live_active;
create table app_private.clarity_course_run_sessions (
 account_id uuid not null,
 course_run_id uuid not null,
 course_day smallint not null check(course_day between 1 and 3),
 protocol_id uuid not null,
 primary key(account_id,course_run_id,course_day),
 unique(account_id,protocol_id),
 foreign key(account_id,course_run_id) references app_private.clarity_course_runs(account_id,id) on delete cascade
);
alter table app_private.clarity_course_runs enable row level security;
alter table app_private.clarity_course_runs force row level security;
alter table app_private.clarity_course_run_sessions enable row level security;
alter table app_private.clarity_course_run_sessions force row level security;
revoke all on app_private.clarity_course_runs,app_private.clarity_course_run_sessions from public,anon,authenticated;
grant select,insert on app_private.clarity_course_runs,app_private.clarity_course_run_sessions to hh_app_backend;
grant update(revision,payload_ciphertext,live_active,updated_at) on app_private.clarity_course_runs to hh_app_backend;
create policy clarity_run_select on app_private.clarity_course_runs for select to hh_app_backend using(account_id=(select auth.uid()) and (select app_private.account_active()));
create policy clarity_run_insert on app_private.clarity_course_runs for insert to hh_app_backend with check(account_id=(select auth.uid()) and (select app_private.account_active()));
create policy clarity_run_update on app_private.clarity_course_runs for update to hh_app_backend using(account_id=(select auth.uid()) and (select app_private.account_active())) with check(account_id=(select auth.uid()) and (select app_private.account_active()));
create policy clarity_run_session_select on app_private.clarity_course_run_sessions for select to hh_app_backend using(account_id=(select auth.uid()) and (select app_private.account_active()));
create policy clarity_run_session_insert on app_private.clarity_course_run_sessions for insert to hh_app_backend with check(account_id=(select auth.uid()) and (select app_private.account_active()));
-- Immutable identity columns have no UPDATE privilege. Bindings cannot be
-- moved to a different account, course or day. Account deletion cascades.
-- Before activation add existing privacy export/delete integration and test
-- account-close cleanup, concurrency, refunds and legacy data reconciliation.

-- Shared account/day slot; intentionally independent of Clarity run or coach.
-- All free transports must use this same immutable claim before activation.
create table app_private.coaching_free_session_days (
 account_id uuid not null references app.accounts(id) on delete cascade,
 calendar_day date not null,
 protocol_id uuid not null,
 created_at timestamptz not null default now(),
 primary key(account_id,calendar_day)
);
alter table app_private.coaching_free_session_days enable row level security;
alter table app_private.coaching_free_session_days force row level security;
revoke all on app_private.coaching_free_session_days from public,anon,authenticated;
grant select,insert on app_private.coaching_free_session_days to hh_app_backend;
create policy coaching_free_day_select on app_private.coaching_free_session_days for select to hh_app_backend
 using(account_id=(select auth.uid()) and (select app_private.account_active()));
create policy coaching_free_day_insert on app_private.coaching_free_session_days for insert to hh_app_backend
 with check(account_id=(select auth.uid()) and (select app_private.account_active()));
-- No UPDATE or DELETE privilege; account deletion cascades. Backfill existing
-- trusted free-day claims and rehearse cross-account RLS before enabling.

-- One bounded account-wide Clarity credential window, even before enrollment.
-- A lease is not a session, entitlement, consent, or provider observation.
-- Retain ambiguous issuance through the possible expiry. No token is stored.
create table app_private.clarity_live_credential_windows (
 account_id uuid primary key references app.accounts(id) on delete cascade,
 lease_id uuid not null,
 course_run_id uuid not null,
 course_day smallint not null check(course_day between 1 and 3),
 protocol_id uuid not null check(protocol_id<>course_run_id),
 reserved_at_ms bigint not null check(reserved_at_ms>=0),
 possible_expires_at_ms bigint not null,
 provider_closed_at_ms bigint check(provider_closed_at_ms>=reserved_at_ms),
 check(possible_expires_at_ms>reserved_at_ms and possible_expires_at_ms-reserved_at_ms<=1200000)
);
alter table app_private.clarity_live_credential_windows enable row level security;
alter table app_private.clarity_live_credential_windows force row level security;
revoke all on app_private.clarity_live_credential_windows from public,anon,authenticated;
grant select,insert on app_private.clarity_live_credential_windows to hh_app_backend;
grant update(lease_id,course_run_id,course_day,protocol_id,reserved_at_ms,possible_expires_at_ms,provider_closed_at_ms) on app_private.clarity_live_credential_windows to hh_app_backend;
create policy clarity_credential_select on app_private.clarity_live_credential_windows for select to hh_app_backend
 using(account_id=(select auth.uid()) and (select app_private.account_active()));
create policy clarity_credential_insert on app_private.clarity_live_credential_windows for insert to hh_app_backend
 with check(account_id=(select auth.uid()) and (select app_private.account_active()));
create policy clarity_credential_update on app_private.clarity_live_credential_windows for update to hh_app_backend
 using(account_id=(select auth.uid()) and (select app_private.account_active()))
 with check(account_id=(select auth.uid()) and (select app_private.account_active()));
-- No DELETE or account reassignment privilege. Account deletion cascades.
-- A direct Gemini token is not server-observed; retain its maximum possible
-- validity rather than trusting a browser stop. Multiple ordinary direct
-- tokens retain their existing quota policy, but cannot overlap Clarity.
create table app_private.coaching_direct_live_windows (
 account_id uuid primary key references app.accounts(id) on delete cascade,
 possible_expires_at_ms bigint not null check(possible_expires_at_ms>0)
);
alter table app_private.coaching_direct_live_windows enable row level security;
alter table app_private.coaching_direct_live_windows force row level security;
revoke all on app_private.coaching_direct_live_windows from public,anon,authenticated;
grant select,insert on app_private.coaching_direct_live_windows to hh_app_backend;
grant update(possible_expires_at_ms) on app_private.coaching_direct_live_windows to hh_app_backend;
create policy coaching_direct_window_select on app_private.coaching_direct_live_windows for select to hh_app_backend
 using(account_id=(select auth.uid()) and (select app_private.account_active()));
create policy coaching_direct_window_insert on app_private.coaching_direct_live_windows for insert to hh_app_backend
 with check(account_id=(select auth.uid()) and (select app_private.account_active()));
create policy coaching_direct_window_update on app_private.coaching_direct_live_windows for update to hh_app_backend
 using(account_id=(select auth.uid()) and (select app_private.account_active()))
 with check(account_id=(select auth.uid()) and (select app_private.account_active()));
-- Direct-window tracking must be active for the full 21-minute possible
-- lifetime before enabling Clarity. Other providers and shared daily
-- consent/observation still require their own trusted adapter.


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
