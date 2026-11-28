-- Run only inside the disposable, empty CI container. Synthetic accounts only.
\set ON_ERROR_STOP on
do $$ begin
 if current_database()<>'hh_anti_stress_test' or to_regnamespace('app') is not null then
  raise exception 'Not a fresh isolated therapy test database';
 end if;
end $$;
create role anon nologin;
create role authenticated nologin;
create role hh_app_backend nologin nobypassrls;
create schema auth;
create schema app;
create schema app_private;
create function auth.uid() returns uuid language sql stable as
 $$ select nullif(current_setting('request.jwt.claims',true)::jsonb->>'sub','')::uuid $$;
create table app.accounts(id uuid primary key,status text not null);
create function app_private.account_active() returns boolean language sql stable as
 $$ select exists(select 1 from app.accounts where id=auth.uid() and status='active') $$;
grant usage on schema auth,app,app_private to hh_app_backend;
grant select on app.accounts to hh_app_backend;
grant execute on function auth.uid(),app_private.account_active() to hh_app_backend;
insert into app.accounts values
 ('10000000-0000-4000-8000-000000000001','active'),
 ('10000000-0000-4000-8000-000000000002','active');
\ir ../docs/coaching/clarity-course-runs.proposal.sql
\ir ../docs/coaching/anti-stress-runs.proposal.sql
do $$ begin
 if exists(select 1 from pg_class where oid in ('app_private.anti_stress_runs'::regclass,'app_private.anti_stress_sessions'::regclass) and (not relrowsecurity or not relforcerowsecurity)) then raise exception 'RLS not forced'; end if;
 if has_table_privilege('authenticated','app_private.anti_stress_sessions','SELECT') or has_table_privilege('anon','app_private.anti_stress_runs','SELECT') then raise exception 'Public role has access'; end if;
end $$;
set role hh_app_backend;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001"}',false);
insert into app_private.anti_stress_runs(account_id,id,revision,payload_ciphertext,live_active)
 values(auth.uid(),'20000000-0000-4000-8000-000000000001',1,'synthetic ciphertext',true);
insert into app_private.anti_stress_sessions(account_id,course_run_id,session_number,protocol_id)
 values(auth.uid(),'20000000-0000-4000-8000-000000000001',1,'30000000-0000-4000-8000-000000000001');
do $$ begin
 begin
  update app_private.anti_stress_sessions set last_reviewed_at_ms=1000;
  raise exception 'Review timestamp without review accepted';
 exception when check_violation then null; end;
 begin
  update app_private.anti_stress_sessions set review_revision=1;
  raise exception 'Missing ciphertext accepted';
 exception when check_violation then null; end;
 begin
  update app_private.anti_stress_sessions set protocol_id='30000000-0000-4000-8000-000000000002';
  raise exception 'Protocol identity mutable';
 exception when insufficient_privilege then null; end;
 begin
  insert into app_private.anti_stress_runs(account_id,id,revision,payload_ciphertext,live_active)
   values(auth.uid(),'20000000-0000-4000-8000-000000000002',1,'synthetic ciphertext',true);
  raise exception 'Two active therapy runs';
 exception when unique_violation then null; end;
end $$;
update app_private.anti_stress_sessions set review_revision=1,ledger_ciphertext='synthetic ledger',log_ciphertext='synthetic log',last_reviewed_at_ms=1000 where session_number=1;
do $$ begin
 if not exists(select 1 from app_private.anti_stress_sessions where account_id=auth.uid() and last_reviewed_at_ms=1000) then raise exception 'Owner review timestamp missing'; end if;
 begin
  update app_private.anti_stress_sessions set last_reviewed_at_ms=-1;
  raise exception 'Negative review timestamp accepted';
 exception when check_violation then null; end;
end $$;
update app_private.anti_stress_sessions set meditation_revision=1,meditation_ciphertext='synthetic meditation' where session_number=1;
insert into app_private.coaching_free_session_days(account_id,calendar_day,protocol_id)
 values(auth.uid(),'2026-11-27','30000000-0000-4000-8000-000000000001');
do $$ begin
 begin
  insert into app_private.coaching_free_session_days(account_id,calendar_day,protocol_id)
   values(auth.uid(),'2026-11-27','30000000-0000-4000-8000-000000000003');
  raise exception 'Second free slot accepted';
 exception when unique_violation then null; end;
end $$;
-- Shared account reservation excludes both course types, with 15/20-minute caps.
insert into app_private.clarity_live_credential_windows(account_id,lease_id,course_run_id,course_day,protocol_id,reserved_at_ms,possible_expires_at_ms,program_kind)
 values(auth.uid(),'40000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',1,'30000000-0000-4000-8000-000000000001',1000,901000,'therapy');
do $$ declare n integer; begin
 begin
  update app_private.clarity_live_credential_windows set possible_expires_at_ms=901001;
  raise exception 'Therapy credential over fifteen minutes';
 exception when check_violation then null; end;
 insert into app_private.clarity_live_credential_windows(account_id,lease_id,course_run_id,course_day,protocol_id,reserved_at_ms,possible_expires_at_ms,program_kind)
 values(auth.uid(),'40000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002',1,'30000000-0000-4000-8000-000000000003',2000,1202000,'clarity')
 on conflict(account_id) do update set lease_id=excluded.lease_id,course_run_id=excluded.course_run_id,course_day=excluded.course_day,protocol_id=excluded.protocol_id,reserved_at_ms=excluded.reserved_at_ms,possible_expires_at_ms=excluded.possible_expires_at_ms,program_kind=excluded.program_kind where clarity_live_credential_windows.possible_expires_at_ms<=excluded.reserved_at_ms;
 get diagnostics n=row_count;
 if n<>0 then raise exception 'Overlapping Clarity credential accepted'; end if;
end $$;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000002"}',false);
do $$ declare n integer; begin
 if exists(select 1 from app_private.anti_stress_runs) or exists(select 1 from app_private.anti_stress_sessions) or exists(select 1 from app_private.coaching_free_session_days) or exists(select 1 from app_private.clarity_live_credential_windows) then raise exception 'Cross-account disclosure'; end if;
 update app_private.anti_stress_sessions set meditation_ciphertext='other account';
 get diagnostics n=row_count;
 if n<>0 then raise exception 'Cross-account update'; end if;
 begin
  insert into app_private.anti_stress_sessions(account_id,course_run_id,session_number,protocol_id)
   values(auth.uid(),'20000000-0000-4000-8000-000000000001',2,'30000000-0000-4000-8000-000000000002');
  raise exception 'Cross-account foreign key';
 exception when foreign_key_violation then null; end;
 begin
  insert into app_private.anti_stress_runs(account_id,id,revision,payload_ciphertext)
   values('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000003',1,'synthetic ciphertext');
  raise exception 'Cross-account insert';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
update app.accounts set status='inactive' where id='10000000-0000-4000-8000-000000000001';
set role hh_app_backend;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001"}',false);
do $$ begin
 if exists(select 1 from app_private.anti_stress_sessions) or exists(select 1 from app_private.anti_stress_runs) then raise exception 'Inactive account access'; end if;
end $$;
reset role;
delete from app.accounts where id='10000000-0000-4000-8000-000000000001';
do $$ begin
 if exists(select 1 from app_private.anti_stress_runs) or exists(select 1 from app_private.anti_stress_sessions) or exists(select 1 from app_private.coaching_free_session_days) or exists(select 1 from app_private.clarity_live_credential_windows) then raise exception 'Account deletion did not cascade'; end if;
end $$;
select 'ANTI_STRESS_RLS_SYNTHETIC_PASS' as result;
