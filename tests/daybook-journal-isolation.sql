-- Run only against an EMPTY disposable local database, never a connected project.
\set ON_ERROR_STOP on
create role anon;
create role authenticated;
create role hh_app_backend;
create schema app;
create schema app_private;
create schema auth;
create table app.accounts(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.account_id',true),'')::uuid $$;
create function app_private.account_active() returns boolean language sql stable as $$ select current_setting('test.active',true)='true' $$;
grant usage on schema app_private,auth to hh_app_backend;
\ir ../supabase/migrations/20261122210000_hh_daybook_journal.sql
insert into app.accounts values ('550e8400-e29b-41d4-a716-446655440001'),('550e8400-e29b-41d4-a716-446655440002');
set role hh_app_backend;
set test.active='true';
set test.account_id='550e8400-e29b-41d4-a716-446655440001';
insert into app_private.daybook_entries(id,account_id,payload_ciphertext,revision) values ('550e8400-e29b-41d4-a716-446655440003',auth.uid(),'synthetic-ciphertext',1);
insert into app_private.daybook_entry_receipts(account_id,operation_id,entry_id,request_fingerprint,operation,revision) values (auth.uid(),'550e8400-e29b-41d4-a716-446655440004','550e8400-e29b-41d4-a716-446655440003',repeat('a',64),'save',1);
do $$ begin
 if (select count(*) from app_private.daybook_entries)<>1 then raise exception 'owner read failed'; end if;
 begin
  update app_private.daybook_entries set account_id='550e8400-e29b-41d4-a716-446655440002';
  raise exception 'ownership reassignment allowed';
 exception when insufficient_privilege then null; end;
end $$;
set test.account_id='550e8400-e29b-41d4-a716-446655440002';
do $$ declare n integer; begin
 if exists(select 1 from app_private.daybook_entries) or exists(select 1 from app_private.daybook_entry_receipts) then raise exception 'cross-account read'; end if;
 update app_private.daybook_entries set payload_ciphertext='attacker'; get diagnostics n=row_count;
 if n<>0 then raise exception 'cross-account update'; end if;
 delete from app_private.daybook_entries; get diagnostics n=row_count;
 if n<>0 then raise exception 'cross-account delete'; end if;
 begin
  insert into app_private.daybook_entries values ('550e8400-e29b-41d4-a716-446655440005','550e8400-e29b-41d4-a716-446655440001','attacker',1,now(),now());
  raise exception 'cross-account insert';
 exception when insufficient_privilege then null; end;
end $$;
set test.account_id='550e8400-e29b-41d4-a716-446655440001';
do $$ declare n integer; begin
 update app_private.daybook_entries set revision=revision+1 where revision=1; get diagnostics n=row_count;
 if n<>1 then raise exception 'revision update failed'; end if;
 update app_private.daybook_entries set revision=revision+1 where revision=1; get diagnostics n=row_count;
 if n<>0 then raise exception 'stale revision accepted'; end if;
end $$;
set test.active='false';
do $$ begin
 if exists(select 1 from app_private.daybook_entries) then raise exception 'revoked account read'; end if;
end $$;
set test.active='true';
delete from app_private.daybook_entries;
do $$ begin
 if exists(select 1 from app_private.daybook_entries) then raise exception 'delete retained ciphertext'; end if;
 if (select count(*) from app_private.daybook_entry_receipts)<>1 then raise exception 'delete lost retry metadata'; end if;
end $$;
reset role;
do $$ begin
 if exists(select 1 from pg_class where oid in ('app_private.daybook_entries'::regclass,'app_private.daybook_entry_receipts'::regclass) and (not relrowsecurity or not relforcerowsecurity)) then raise exception 'RLS not forced'; end if;
 if has_table_privilege('anon','app_private.daybook_entries','SELECT') or has_table_privilege('authenticated','app_private.daybook_entries','SELECT') then raise exception 'public private-table grants'; end if;
end $$;
select 'DAYBOOK_JOURNAL_ISOLATION_PASS' as result;
