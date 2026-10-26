\set ON_ERROR_STOP on
-- Synthetic Postgres 17 RLS fixture; production records/secrets are never read.
create role hh_app_backend nologin;
create role hh_app_inbox nologin;
create role anon nologin;
create role authenticated nologin;
create schema app;
create schema app_private;
create schema auth;
create function auth.uid() returns uuid language sql stable
as $$select nullif(current_setting('request.jwt.claims',true)::jsonb->>'sub','')::uuid$$;
create function app_private.account_active() returns boolean language sql stable
as $$select auth.uid() is not null$$;
create table app.accounts(id uuid primary key);
create table app.public_service_enquiries(
 id uuid primary key,
 recipient_practitioner_id uuid,
 operation_id uuid not null unique,
 reference_code text not null,
 source_path text not null,
 service_title text not null,
 locale text not null,
 description_ciphertext text default '',
 status text not null default 'requested',
 revision integer not null default 0,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
insert into app.accounts values ('22222222-2222-4222-8222-222222222222'),('33333333-3333-4333-8333-333333333333');
insert into app.public_service_enquiries
(id,operation_id,reference_code,source_path,service_title,locale,created_at)
values
 ('11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','HH-111111111111','/en/services/free-situation-review','Free personal express review','en',now()),
 ('44444444-4444-4444-8444-444444444444','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','HH-444444444444','/en/services/free-situation-review','Free personal express review','en',now()-interval '2 hours'),
 ('55555555-5555-4555-8555-555555555555','cccccccc-cccc-4ccc-8ccc-cccccccccccc','HH-555555555555','/en/services/dao-health-profile','Other review','en',now());
alter table app.public_service_enquiries enable row level security;
alter table app.public_service_enquiries force row level security;
grant usage on schema app,app_private,auth to hh_app_backend;
grant select,update on app.public_service_enquiries to hh_app_backend;
grant select on app.accounts to hh_app_backend;
-- Exercise the migration file, never a rewritten policy fixture.
\i supabase/migrations/20261026133321_hh_free_express_guest_continuation_rls_20261025.sql
do $$ begin
 if has_table_privilege('anon','app_private.free_express_account_links','SELECT')
 or has_table_privilege('authenticated','app_private.free_express_account_links','INSERT')
 then raise exception 'PUBLIC ACCOUNT LINK PRIVILEGE'; end if;
end $$;
set role hh_app_backend;
do $$ begin
 if (select count(*) from app.public_service_enquiries) <> 0
 then raise exception 'UNSCOPED GUEST SELECT'; end if;
end $$;
begin;
select set_config('hh.public_enquiry_continuation','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',true);
do $$ begin
 if (select count(*) from app.public_service_enquiries) <> 0
 then raise exception 'EXPIRED GUEST SELECT'; end if;
end $$;
rollback;
begin;
select set_config('hh.public_enquiry_continuation','cccccccc-cccc-4ccc-8ccc-cccccccccccc',true);
do $$ begin
 if (select count(*) from app.public_service_enquiries) <> 0
 then raise exception 'OTHER SERVICE SELECT'; end if;
end $$;
rollback;
begin;
select set_config('hh.public_enquiry_continuation','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true);
do $$ begin
 if (select count(*) from app.public_service_enquiries) <> 1
 then raise exception 'VALID SINGLE ENQUIRY NOT VISIBLE'; end if;
end $$;
update app.public_service_enquiries
 set revision=revision+1 where operation_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
do $$ begin
 if (select revision from app.public_service_enquiries where
   operation_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') <> 1
 then raise exception 'SCOPED GUEST UPDATE FAILED'; end if;
end $$;
commit;
begin;
select set_config('request.jwt.claims','{"sub":"22222222-2222-4222-8222-222222222222"}',true);
insert into app_private.free_express_account_links(enquiry_id,account_id,reference_code,locale)
 values('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','HH-111111111111','en');
do $$ begin
 if (select count(*) from app_private.free_express_account_links) <> 1
 then raise exception 'ACCOUNT OWNER SAVE FAILED'; end if;
 if (select count(*) from app.public_service_enquiries) <> 1
 then raise exception 'GOOGLE ACCOUNT CANNOT READ ITS OWN REQUEST'; end if;
end $$;
commit;
begin;
select set_config('request.jwt.claims','{"sub":"33333333-3333-4333-8333-333333333333"}',true);
do $$ begin
 if (select count(*) from app_private.free_express_account_links) <> 0
 then raise exception 'WRONG GOOGLE ACCOUNT CAN READ LINK'; end if;
 if (select count(*) from app.public_service_enquiries) <> 0
 then raise exception 'WRONG GOOGLE ACCOUNT CAN READ ENCRYPTED REQUEST'; end if;
end $$;
rollback;
reset role;
select 'FREE_EXPRESS_POSTGRES17_RLS_PASS' as result;
