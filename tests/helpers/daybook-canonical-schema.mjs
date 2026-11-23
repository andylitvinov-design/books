import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
export async function initializeCanonicalDaybookSchema(admin){
 if(process.env.VERCEL||process.env.HH_APP_TEST_RUNTIME!=='isolated')throw Error('ISOLATED_DATABASE_REQUIRED')
 const name=(await admin.query('select current_database() as name')).rows[0].name
 assert.ok(['hh_daybook_schema_test','hh_daybook_weekly_test'].includes(name),'refuse unexpected database')
 assert.equal((await admin.query("select to_regnamespace('app') as present")).rows[0].present,null,'refuse occupied database')
 const role=(await admin.query("select rolsuper,rolbypassrls from pg_roles where rolname='hh_app_backend'")).rows[0]
 assert.equal(role?.rolsuper,false);assert.equal(role.rolbypassrls,false)
 await admin.query(`create schema app;create schema app_private;create schema auth;
 create table app.accounts(id uuid primary key,status text not null,onboarding_state text not null);
 create table app.practitioners(id uuid primary key);
 create table auth.sessions(id uuid primary key,user_id uuid);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claims',true)::jsonb->>'sub','')::uuid$$;
 create function app_private.account_active() returns boolean language sql stable as $$select exists(select 1 from app.accounts where id=auth.uid() and status='active' and onboarding_state='active')$$;
 create function app_private.session_active() returns boolean language sql stable as $$select exists(select 1 from auth.sessions where id=(current_setting('request.jwt.claims',true)::jsonb->>'session_id')::uuid and user_id=auth.uid())$$;
 grant usage on schema app,app_private,auth to hh_app_backend;
 grant select,update on app.accounts to hh_app_backend;grant select on auth.sessions to hh_app_backend;`)
 for(const file of [
  '20261023183000_hh_coaching_model_catalog_schema.sql',
  '20261109182406_coaching_session_data_model_r1_20261109.sql',
  '20261109182608_coaching_fix_nullable_provenance_fks_and_indexes_20261109.sql',
  '20261109182815_coaching_voice_profile_catalog_20261109.sql',
  '20261109182832_coaching_voice_reference_and_history_guard_20261109.sql',
  '20261110153139_hh_coaching_plan_account_delete_cascade.sql',
  '20261110153142_hh_coaching_action_erasure.sql',
  '20261122182733_hh_daybook_private_journal_20261122.sql',
  '20261122215422_hh_personal_goal_statuses_20261122.sql',
  '20261122215436_hh_personal_goal_erasure_20261122.sql',
  '20261122215437_hh_daybook_daily_intentions_20261122.sql',
  '20261122215438_hh_personal_action_erasure_20261122.sql',
 ])await admin.query(await readFile(new URL('../../supabase/migrations/'+file,import.meta.url),'utf8'))
}
