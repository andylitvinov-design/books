// Deliberately MINIMAL SYNTHETIC prerequisite model, not production-schema parity.
// Does NOT import/strip/run docs/crm/proposed-crm-schema.sql or its approval sentinel.
// Applies the exact three public-enquiry/CRM INSERT migrations unchanged below.
import {readFile} from 'node:fs/promises'
import {assertTelegramIsolationServer} from './telegram-service-isolation-guard.mjs'
import {A,B,PA,PB,OA,OB} from './telegram-service-runtime.mjs'
export const LEGACY='246aa1a3-a371-5a83-9f4b-cd23ff027a76'
export async function setupTelegramPolicyFixture(db) {
 const row=(await db.query(`select current_database() as database,inet_server_addr()::text as address,
  inet_server_port() as port,current_setting('server_version_num') as version,current_user as login,
  (select rolsuper from pg_roles where rolname=current_user) as superuser,
  (exists(select 1 from pg_namespace where nspname !~ '^pg_' and nspname not in ('public','information_schema'))
   or exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname !~ '^pg_' and n.nspname <> 'information_schema')
   or exists(select 1 from pg_roles where rolname !~ '^pg_' and rolname <> 'postgres')) as occupied`)).rows[0]
 assertTelegramIsolationServer(row)
 await db.query(`create role anon nologin;create role authenticated nologin;create role service_role nologin;
  create role hh_app_backend nologin nosuperuser nobypassrls;
  create role hh_app_inbox nologin nosuperuser nobypassrls;
  create role hh_crm_backend nologin nosuperuser nobypassrls;
  create role hh_app_ci_login login noinherit nosuperuser nobypassrls password 'synthetic-ci-only';
  grant hh_app_backend,hh_app_inbox,hh_crm_backend to hh_app_ci_login;
  create schema app;create schema app_private;create schema auth;
  grant usage on schema app,app_private,auth to hh_app_backend,hh_app_inbox,hh_crm_backend;
  create function auth.uid() returns uuid language sql stable as $$
   select (nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid $$;
 `)
 await db.query(`create table app.accounts(id uuid primary key,active boolean not null default true);
  create function app_private.account_active() returns boolean language sql stable security definer set search_path='' as $$
   select exists(select 1 from app.accounts where id=auth.uid() and active) $$;
  create table app.practitioners(id uuid primary key,trusted_auth_user_id uuid references app.accounts(id),
   slug text not null,active boolean not null default true,status text not null default 'approved',public_profile jsonb not null);
  create table app.service_offerings(id uuid primary key,practitioner_id uuid not null references app.practitioners(id),
   slug text not null,active boolean not null default true,status text not null default 'published',
   localized_copy jsonb not null,discovery_metadata jsonb not null default '{}');
  alter table app.practitioners enable row level security;alter table app.practitioners force row level security;
  alter table app.service_offerings enable row level security;alter table app.service_offerings force row level security;
  grant select on app.practitioners,app.service_offerings to hh_app_backend;
  create policy synthetic_catalog_practitioners on app.practitioners for select to hh_app_backend using(true);
  create policy synthetic_catalog_offerings on app.service_offerings for select to hh_app_backend using(true);
  create table app.crm_contacts(id uuid primary key,owner_id uuid not null references app.accounts(id),contact_ciphertext text not null,
   email_hash text not null,phone_hash text,locale text not null,lifecycle text not null,source text not null,
   email_verified boolean not null default false,suppressed boolean not null default false,revision integer not null default 0,
   created_at timestamptz not null default now(),unique(owner_id,email_hash));
  alter table app.crm_contacts enable row level security;alter table app.crm_contacts force row level security;
  grant select on app.crm_contacts to hh_crm_backend;
  create policy synthetic_crm_owner_read on app.crm_contacts for select to hh_crm_backend
   using(owner_id=auth.uid() and app_private.account_active());
  create table app_private.crm_tg_diagnostic_sessions(business_hash text,user_hash text,primary key(business_hash,user_hash));
  alter table app_private.crm_tg_diagnostic_sessions enable row level security;
  alter table app_private.crm_tg_diagnostic_sessions force row level security;`)
 for(const name of [
  '20261019152000_hh_public_service_enquiries_secure.sql',
  '20261020165000_hh_public_service_crm_contact_intake_20261020.sql',
  '20261026223912_hh_telegram_any_practitioner_service_enquiries_20261026.sql',
 ])await db.query(await readFile(new URL('../../supabase/migrations/'+name,import.meta.url),'utf8'))
 for(const id of [A,B])await db.query('insert into app.accounts(id) values($1)',[id])
 for(const [id,owner] of [[PA,A],[PB,B],[LEGACY,A]])await db.query(
  "insert into app.practitioners(id,trusted_auth_user_id,slug,public_profile) values($1,$2,$3,$4)",
  [id,owner,'synthetic-'+id,{displayName:'Synthetic practitioner'}])
 for(const [id,practitioner] of [[OA,PA],[OB,PB]])await db.query(
  'insert into app.service_offerings(id,practitioner_id,slug,localized_copy) values($1,$2,$3,$4)',
  [id,practitioner,'synthetic-'+id,{en:{title:'Verified synthetic service'}}])
}
