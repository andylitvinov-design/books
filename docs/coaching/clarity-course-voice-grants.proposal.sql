-- Proposal only; replace the unactivated original single-window proposal.
-- Review, register and test via the authorized migration workflow before enabling.
create table app_private.clarity_course_voice_grants (
 account_id uuid not null references app.accounts(id) on delete cascade,
 course_day smallint not null check(course_day between 1 and 3),
 protocol_id uuid not null,
 state text not null check(state in ('idle','pending','issued')),
 lease_id uuid,
 lease_until timestamptz,
 issued_at timestamptz,
 active_ms integer not null default 0 check(active_ms between 0 and 1200000),
 clock_lease_id uuid,
 clock_coach text check(clock_coach in ('mira','max','sofia','alex','merlin','harry','genie','caesar')),
 clock_until timestamptz,
 clock_at timestamptz,
 primary key(account_id,course_day),
 unique(account_id,protocol_id),
 check((state='idle' and lease_id is null and lease_until is null and issued_at is null) or
       (state='pending' and lease_id is not null and lease_until is not null and issued_at is null) or
       (state='issued' and lease_id is not null and lease_until is not null and issued_at is not null)),
 check((clock_lease_id is null and clock_coach is null and clock_until is null and clock_at is null) or
       (clock_lease_id is not null and clock_coach is not null and clock_until is not null))
);
alter table app_private.clarity_course_voice_grants enable row level security;
alter table app_private.clarity_course_voice_grants force row level security;
revoke all on app_private.clarity_course_voice_grants from public,anon,authenticated;
grant select,insert on app_private.clarity_course_voice_grants to hh_app_backend;
grant update(lease_id,state,lease_until,issued_at,active_ms,clock_lease_id,clock_coach,clock_until,clock_at) on app_private.clarity_course_voice_grants to hh_app_backend;
create policy clarity_grant_select on app_private.clarity_course_voice_grants for select to hh_app_backend
 using(account_id=(select auth.uid()) and (select app_private.account_active()));
create policy clarity_grant_insert on app_private.clarity_course_voice_grants for insert to hh_app_backend
 with check(account_id=(select auth.uid()) and (select app_private.account_active()) and state='idle' and active_ms=0);
create policy clarity_grant_update on app_private.clarity_course_voice_grants for update to hh_app_backend
 using(account_id=(select auth.uid()) and (select app_private.account_active()))
 with check(account_id=(select auth.uid()) and (select app_private.account_active()));
