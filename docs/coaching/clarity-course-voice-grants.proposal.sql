-- Review and register this proposal through the authorized migration workflow
-- BEFORE enabling HH_CLARITY_FREE_COURSE_ENABLED. Not applied by this PR.
create table app_private.clarity_course_voice_grants (
 account_id uuid not null references app.accounts(id) on delete cascade,
 course_day smallint not null check(course_day between 1 and 3),
 lease_id uuid not null,
 state text not null check(state in ('pending','issued')),
 lease_until timestamptz not null,
 issued_at timestamptz,
 clock_revision bigint not null default 0 check(clock_revision>=0),
 clock_ciphertext text,
 check((clock_revision=0 and clock_ciphertext is null) or (course_day=1 and clock_revision>0 and clock_ciphertext is not null)),
 primary key(account_id,course_day),
 check((state='pending' and issued_at is null) or (state='issued' and issued_at is not null))
);
alter table app_private.clarity_course_voice_grants enable row level security;
alter table app_private.clarity_course_voice_grants force row level security;
revoke all on app_private.clarity_course_voice_grants from public,anon,authenticated;
grant select,insert,delete on app_private.clarity_course_voice_grants to hh_app_backend;
grant update(lease_id,state,lease_until,issued_at,clock_revision,clock_ciphertext) on app_private.clarity_course_voice_grants to hh_app_backend;
create policy clarity_grant_select on app_private.clarity_course_voice_grants for select to hh_app_backend
 using(account_id=(select auth.uid()) and (select app_private.account_active()));
create policy clarity_grant_insert on app_private.clarity_course_voice_grants for insert to hh_app_backend
 with check(account_id=(select auth.uid()) and (select app_private.account_active()) and state='pending' and clock_revision=0 and clock_ciphertext is null);
create policy clarity_grant_update on app_private.clarity_course_voice_grants for update to hh_app_backend
 using(account_id=(select auth.uid()) and (select app_private.account_active()) and (state='pending' or (course_day=1 and state='issued')))
 with check(account_id=(select auth.uid()) and (select app_private.account_active()));
create policy clarity_grant_delete on app_private.clarity_course_voice_grants for delete to hh_app_backend
 using(account_id=(select auth.uid()) and (select app_private.account_active()) and state='pending');

-- An issued legacy lease is immutable; only the anchor clock may be advanced.
create function app_private.clarity_grant_clock_guard() returns trigger language plpgsql set search_path = pg_catalog as $$
begin
 if old.state='issued' and (new.state is distinct from old.state or new.lease_id is distinct from old.lease_id or new.lease_until is distinct from old.lease_until or new.issued_at is distinct from old.issued_at) then raise exception 'issued clarity lease is immutable'; end if;
 if new.clock_revision is distinct from old.clock_revision or new.clock_ciphertext is distinct from old.clock_ciphertext then
  if old.course_day<>1 or old.state<>'issued' or new.clock_revision<>old.clock_revision+1 or new.clock_ciphertext is null then raise exception 'invalid clarity clock update'; end if;
 end if;
 return new;
end;
$$;
create trigger clarity_grant_clock_guard before update on app_private.clarity_course_voice_grants for each row execute function app_private.clarity_grant_clock_guard();
