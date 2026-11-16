-- Isolated PostgreSQL 17 contract smoke for the gated Telegram→CRM questionnaire.
-- Synthetic UUIDs/hashes only. This runs on a disposable GitHub Actions service,
-- NEVER against the live Holistic House database.
\set ON_ERROR_STOP on

create role anon nologin;
create role authenticated nologin;
create role service_role nologin;
create role hh_app_backend nologin;
create role hh_crm_backend nologin;
create role hh_app_inbox nologin;
create schema app;
create schema app_private;
grant usage on schema app_private to hh_app_inbox;

create table app.accounts (
  id uuid primary key,
  status text not null default 'active'
);
create table app.crm_msg_accounts (
  id uuid primary key,
  owner_id uuid not null references app.accounts(id),
  channel text not null,
  enabled boolean not null default true,
  external_hash text not null
);
create table app.crm_contacts (
  id uuid primary key,
  owner_id uuid not null references app.accounts(id),
  suppressed boolean not null default false,
  lifecycle text not null default 'lead'
);
create table app.crm_msg_threads (
  id uuid primary key,
  owner_id uuid not null references app.accounts(id),
  account_id uuid not null references app.crm_msg_accounts(id),
  contact_id uuid not null references app.crm_contacts(id),
  user_hash text not null,
  suppressed boolean not null default false
);
create table app.crm_msg_events (
  account_id uuid not null references app.crm_msg_accounts(id),
  event_hash text not null,
  primary key (account_id,event_hash)
);
create table app.crm_msg_items (
  id uuid primary key,
  owner_id uuid not null references app.accounts(id),
  thread_id uuid not null references app.crm_msg_threads(id),
  provider_hash text not null,
  direction text not null,
  status text not null
);

-- Same FORCE RLS posture as the current owner-only CRM schema, including no
-- direct permissions for anonymous clients or for the narrowly scoped role.
do $$
declare row record;
begin
  for row in
    select tablename from pg_tables where schemaname='app'
      and tablename in ('accounts','crm_msg_accounts','crm_contacts',
        'crm_msg_threads','crm_msg_events','crm_msg_items')
  loop
    execute format('alter table app.%I enable row level security',row.tablename);
    execute format('alter table app.%I force row level security',row.tablename);
  end loop;
end;
$$;

insert into app.accounts(id,status) values
('11111111-1111-4111-8111-111111111111','active');
insert into app.crm_msg_accounts(id,owner_id,channel,enabled,external_hash) values
('22222222-2222-4222-8222-222222222222',
 '11111111-1111-4111-8111-111111111111','telegram',true,repeat('a',64));
insert into app.crm_contacts(id,owner_id,lifecycle) values
('33333333-3333-4333-8333-333333333333',
 '11111111-1111-4111-8111-111111111111','lead');
insert into app.crm_msg_threads(id,owner_id,account_id,contact_id,user_hash) values
('44444444-4444-4444-8444-444444444444',
 '11111111-1111-4111-8111-111111111111',
 '22222222-2222-4222-8222-222222222222',
 '33333333-3333-4333-8333-333333333333',repeat('b',64));

-- This file has its own BEGIN/COMMIT. DDL compilation and its restricted
-- execute grants are tested on a clean postgres:17 instance.
\ir ../supabase/migrations/20261026201600_hh_crm_tg_existing_thread_intake.sql

do $$
begin
  if has_function_privilege('anon',
    'app_private.crm_tg_existing_thread(text,text)','EXECUTE')
    or has_function_privilege('authenticated',
    'app_private.crm_tg_existing_thread(text,text)','EXECUTE')
    or has_function_privilege('service_role',
    'app_private.crm_tg_existing_thread(text,text)','EXECUTE')
    or has_function_privilege('anon',
    'app_private.crm_tg_questionnaire_seen(text,text,text[],text[])','EXECUTE')
    or has_function_privilege('authenticated',
    'app_private.crm_tg_questionnaire_seen(text,text,text[],text[])','EXECUTE')
    or has_function_privilege('service_role',
    'app_private.crm_tg_questionnaire_seen(text,text,text[],text[])','EXECUTE')
  then raise exception 'Public or service role can execute a private CRM definer'; end if;
  if not has_function_privilege('hh_app_inbox',
    'app_private.crm_tg_existing_thread(text,text)','EXECUTE')
    or not has_function_privilege('hh_app_inbox',
    'app_private.crm_tg_questionnaire_seen(text,text,text[],text[])','EXECUTE')
  then raise exception 'Narrow server inbox role is missing function permission'; end if;
  if has_table_privilege('hh_app_inbox','app.crm_msg_items','SELECT')
    or has_table_privilege('anon','app.crm_msg_items','SELECT')
  then raise exception 'Raw encrypted messages became directly readable'; end if;
end;
$$;

set role hh_app_inbox;
do $$
begin
  if not app_private.crm_tg_existing_thread(repeat('a',64),repeat('b',64))
    then raise exception 'Existing consented CRM thread was not found'; end if;
  if app_private.crm_tg_existing_thread(repeat('a',64),repeat('c',64))
    or app_private.crm_tg_existing_thread(repeat('d',64),repeat('b',64))
    or app_private.crm_tg_existing_thread('invalid',repeat('b',64))
    then raise exception 'Another Telegram identity incorrectly reused the CRM thread'; end if;
  if app_private.crm_tg_questionnaire_seen(repeat('a',64),repeat('b',64),
    array[repeat('c',64)],array[repeat('e',64)])
    then raise exception 'Missing stored questionnaire was incorrectly acknowledged'; end if;
end;
$$;
reset role;

insert into app.crm_msg_events(account_id,event_hash) values
('22222222-2222-4222-8222-222222222222',repeat('e',64)),
('22222222-2222-4222-8222-222222222222',repeat('f',64));
insert into app.crm_msg_items(id,owner_id,thread_id,provider_hash,direction,status) values
('55555555-5555-4555-8555-555555555555',
 '11111111-1111-4111-8111-111111111111',
 '44444444-4444-4444-8444-444444444444',repeat('c',64),'in','received'),
('66666666-6666-4666-8666-666666666666',
 '11111111-1111-4111-8111-111111111111',
 '44444444-4444-4444-8444-444444444444',repeat('d',64),'in','received');

set role hh_app_inbox;
do $$
begin
  if not app_private.crm_tg_questionnaire_seen(repeat('a',64),repeat('b',64),
    array[repeat('c',64),repeat('d',64)],array[repeat('e',64),repeat('f',64)])
    then raise exception 'Stored two-part same-thread questionnaire was not acknowledged'; end if;
  if app_private.crm_tg_questionnaire_seen(repeat('a',64),repeat('b',64),
    array[repeat('c',64),repeat('d',64)],array[repeat('e',64),repeat('0',64)])
    or app_private.crm_tg_questionnaire_seen(repeat('a',64),repeat('b',64),
    array[repeat('c',64),repeat('c',64)],array[repeat('e',64),repeat('f',64)])
    or app_private.crm_tg_questionnaire_seen(repeat('a',64),repeat('c',64),
    array[repeat('c',64)],array[repeat('e',64)])
    then raise exception 'Tampered, duplicated or foreign receipt was accepted'; end if;
end;
$$;
reset role;

update app.crm_msg_threads set suppressed=true;
set role hh_app_inbox;
do $$
begin
  if app_private.crm_tg_existing_thread(repeat('a',64),repeat('b',64))
    or app_private.crm_tg_questionnaire_seen(repeat('a',64),repeat('b',64),
       array[repeat('c',64)],array[repeat('e',64)])
    then raise exception 'STOP/suppressed CRM thread accepted a questionnaire'; end if;
end;
$$;
reset role;

do $$
begin
  if (select count(*) from app.crm_contacts)<>1
    or (select count(*) from app.crm_msg_threads)<>1
    then raise exception 'Smoke test unexpectedly created a duplicate contact or thread'; end if;
end;
$$;
select 'HH TG COACHING PG17 / RLS / replay / STOP: PASS' as result;
