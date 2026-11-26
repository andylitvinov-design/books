-- Review and register this proposal through the authorized migration workflow
-- BEFORE enabling HH_CLARITY_FREE_COURSE_ENABLED. Not applied by this PR.
create table app_private.clarity_course_voice_grants (
 account_id uuid not null references app.accounts(id) on delete cascade,
 course_day smallint not null check(course_day between 1 and 3),
 lease_id uuid not null,
 state text not null check(state in ('pending','issued')),
 lease_until timestamptz not null,
 issued_at timestamptz,
 primary key(account_id,course_day),
 check((state='pending' and issued_at is null) or (state='issued' and issued_at is not null))
);
alter table app_private.clarity_course_voice_grants enable row level security;
alter table app_private.clarity_course_voice_grants force row level security;
revoke all on app_private.clarity_course_voice_grants from public,anon,authenticated;
grant select,insert,delete on app_private.clarity_course_voice_grants to hh_app_backend;
grant update(lease_id,state,lease_until,issued_at) on app_private.clarity_course_voice_grants to hh_app_backend;
create policy clarity_grant_select on app_private.clarity_course_voice_grants for select to hh_app_backend
 using(account_id=(select auth.uid()) and (select app_private.account_active()));
create policy clarity_grant_insert on app_private.clarity_course_voice_grants for insert to hh_app_backend
 with check(account_id=(select auth.uid()) and (select app_private.account_active()) and state='pending');
create policy clarity_grant_update on app_private.clarity_course_voice_grants for update to hh_app_backend
 using(account_id=(select auth.uid()) and (select app_private.account_active()) and state='pending')
 with check(account_id=(select auth.uid()) and (select app_private.account_active()));
create policy clarity_grant_delete on app_private.clarity_course_voice_grants for delete to hh_app_backend
 using(account_id=(select auth.uid()) and (select app_private.account_active()) and state='pending');
