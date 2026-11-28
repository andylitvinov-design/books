-- PROPOSAL ONLY: register using the existing migration workflow and test on an isolated database first.
-- No transcripts, provider tokens, names or symptoms are stored in this ledger.
create table app_private.clarity_course_clocks (
 account_id uuid not null references app.accounts(id) on delete cascade,
 course_day smallint not null check(course_day between 1 and 3),
 protocol_id uuid not null,
 clock_state jsonb not null,
 updated_at timestamptz not null default now(),
 primary key(account_id,course_day),
 unique(account_id,protocol_id),
 check(jsonb_typeof(clock_state)='object'),
 check((clock_state->>'version')::int=1),
 check((clock_state->>'day')::int=course_day),
 check((clock_state->>'protocolId')::uuid=protocol_id),
 check((clock_state->>'activeMs')::bigint between 0 and 1200000),
 check((clock_state->>'revision')::bigint>=0),
 check(clock_state->>'phase' in ('awaiting_consent','running','paused','review','closed'))
);
alter table app_private.clarity_course_clocks enable row level security;
alter table app_private.clarity_course_clocks force row level security;
revoke all on app_private.clarity_course_clocks from public,anon,authenticated;
grant select,insert on app_private.clarity_course_clocks to hh_app_backend;
grant update(clock_state,updated_at) on app_private.clarity_course_clocks to hh_app_backend;
create policy clarity_clock_select on app_private.clarity_course_clocks for select to hh_app_backend
 using(account_id=(select auth.uid()) and (select app_private.account_active()));
create policy clarity_clock_insert on app_private.clarity_course_clocks for insert to hh_app_backend
 with check(account_id=(select auth.uid()) and (select app_private.account_active()));
create policy clarity_clock_update on app_private.clarity_course_clocks for update to hh_app_backend
 using(account_id=(select auth.uid()) and (select app_private.account_active()))
 with check(account_id=(select auth.uid()) and (select app_private.account_active()));
