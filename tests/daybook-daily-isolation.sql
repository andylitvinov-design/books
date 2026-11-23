-- Run only against a disposable DB after fixture + real migration.
do $$begin
 if (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='app_private' and c.relname in ('daybook_daily_intentions','daybook_daily_receipts') and c.relrowsecurity and c.relforcerowsecurity)<>2 then raise exception 'FORCE_RLS_MISSING'; end if;
 if has_table_privilege('anon','app_private.daybook_daily_intentions','SELECT') or
    has_table_privilege('authenticated','app_private.daybook_daily_intentions','SELECT') then raise exception 'PUBLIC_ACCESS';end if;
end$$;
set role hh_app_backend;
select set_config('request.jwt.claims','{"sub":"550e8400-e29b-41d4-a716-446655440000"}',false);
insert into app_private.daybook_daily_intentions(id,account_id,day_key,payload_ciphertext,revision)
 values('550e8400-e29b-41d4-a716-446655440010','550e8400-e29b-41d4-a716-446655440000',repeat('a',64),'synthetic-ciphertext-schema-fixture',1);
insert into app_private.daybook_daily_receipts(account_id,operation_id,intention_id,request_fingerprint,operation,revision)
 values('550e8400-e29b-41d4-a716-446655440000','550e8400-e29b-41d4-a716-446655440020','550e8400-e29b-41d4-a716-446655440010',repeat('b',64),'save',1);
do $$begin
 if (select count(*) from app_private.daybook_daily_intentions)<>1 then raise exception 'OWNER_READ_FAILED';end if;
 begin
  insert into app_private.daybook_daily_intentions(id,account_id,day_key,payload_ciphertext,revision)
   values('550e8400-e29b-41d4-a716-446655440011','550e8400-e29b-41d4-a716-446655440000',repeat('a',64),'duplicate-day',1);
  raise exception 'DUPLICATE_DAY_ACCEPTED';
 exception when unique_violation then null;end;
 begin
  delete from app_private.daybook_daily_receipts;
  raise exception 'RECEIPT_DELETE_ACCEPTED';
 exception when insufficient_privilege then null;end;
end$$;
select set_config('request.jwt.claims','{"sub":"550e8400-e29b-41d4-a716-446655440001"}',false);
do $$begin
 if exists(select 1 from app_private.daybook_daily_intentions) or exists(select 1 from app_private.daybook_daily_receipts) then raise exception 'CROSS_ACCOUNT_READ';end if;
 update app_private.daybook_daily_intentions set revision=2 where id='550e8400-e29b-41d4-a716-446655440010';
 if found then raise exception 'CROSS_ACCOUNT_UPDATE';end if;
 delete from app_private.daybook_daily_intentions where id='550e8400-e29b-41d4-a716-446655440010';
 if found then raise exception 'CROSS_ACCOUNT_DELETE';end if;
 begin
  insert into app_private.daybook_daily_intentions(id,account_id,day_key,payload_ciphertext,revision)
   values('550e8400-e29b-41d4-a716-446655440011','550e8400-e29b-41d4-a716-446655440000',repeat('c',64),'forged-owner',1);
  raise exception 'CROSS_ACCOUNT_INSERT';
 exception when insufficient_privilege then null;end;
end$$;
reset role;
delete from app.accounts where id='550e8400-e29b-41d4-a716-446655440000';
do $$begin
 if exists(select 1 from app_private.daybook_daily_intentions) or exists(select 1 from app_private.daybook_daily_receipts) then raise exception 'ACCOUNT_ERASURE_INCOMPLETE';end if;
end$$;
select 'DAYBOOK_DAILY_SCHEMA_ISOLATION_PASS' as result;
