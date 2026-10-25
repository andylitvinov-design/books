// Private PG17 synthetic security test. Enforced guard prevents any production DB DDL.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import pg from 'pg'

const url = process.env.HH_TEST_ADMIN_DATABASE_URL || ''
const isolated = process.env.CI === 'true'
  && process.env.HH_APP_TEST_RUNTIME === 'isolated'
  && process.env.HH_FREE_EXPRESS_TEST_APPLY_PROPOSALS === 'synthetic-only'
  && !process.env.VERCEL && url
  && ['127.0.0.1','localhost'].includes(new URL(url).hostname)
  && new URL(url).pathname === '/hh_app_test'
const read = file => readFileSync(new URL('../supabase/migrations/' + file, import.meta.url),'utf8')
const old = '20261019152000_hh_public_service_enquiries_secure.sql'
const next = '20261025191500_hh_free_express_guest_continuation_rls.sql'
const practitionerId = '246aa1a3-a371-5a83-9f4b-cd23ff027a76'
const actorA = '10000000-0000-4000-8000-000000000001'
const actorB = '10000000-0000-4000-8000-000000000002'
const enquiryId = '10000000-0000-4000-8000-000000000010'
const operationId = '20000000-0000-4000-8000-000000000010'

if (!isolated) {
  test('guest continuation RLS must run only in disposable CI PostgreSQL', {skip:true},()=>{})
} else {
  test('PG17 permits HMAC-verified backend operation only; enforces read/update, account RLS, guest expiry', async () => {
    const db = new pg.Client({connectionString:url})
    await db.connect()
    try {
      await db.query('BEGIN')
      await db.query(`
        create role anon nologin; create role authenticated nologin;
        create role hh_app_backend nologin; create role hh_app_inbox nologin;
        create schema app; create schema app_private; create schema auth;
        grant usage on schema app,app_private,auth to hh_app_backend;
        create table app.accounts (id uuid primary key,status text not null);
        create table app.practitioners (
          id uuid primary key, trusted_auth_user_id uuid,
          active boolean not null, status text not null, public_profile jsonb not null
        );
        insert into app.accounts (id,status) values
          ('${actorA}','active'),('${actorB}','active');
        insert into app.practitioners values
          ('${practitionerId}','${actorA}',true,'approved','{"title":"Synthetic"}');
        grant select on app.accounts,app.practitioners to hh_app_backend;
        create function auth.uid() returns uuid language sql stable
          as $$ select (nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid $$;
        create function app_private.account_active() returns boolean language sql stable
          as $$ select exists(select 1 from app.accounts where id=auth.uid() and status='active') $$;
        grant execute on function auth.uid(),app_private.account_active() to hh_app_backend;
      `)
      await db.query(read(old))
      await db.query(read(next))
      const rls = await db.query("select relrowsecurity,relforcerowsecurity from pg_class where oid='app.public_service_enquiries'::regclass")
      assert.equal(rls.rows[0].relrowsecurity,true)
      assert.equal(rls.rows[0].relforcerowsecurity,true)
      await db.query(`
        insert into app.public_service_enquiries
          (id,recipient_practitioner_id,service_title,source_path,locale,reference_code,
           description_ciphertext,contact_ciphertext,operation_id,operation_hash)
        values ('${enquiryId}','${practitionerId}','Free personal express review',
           '/en/services/free-situation-review','en','HH-A1B2C3D4E5F6',
           repeat('Z',90),'contact encrypted', '${operationId}',repeat('b',64))
      `)
      await db.query('SET LOCAL ROLE hh_app_backend')
      assert.equal((await db.query('select count(*)::int as count from app.public_service_enquiries')).rows[0].count,0)
      await db.query("select set_config('hh.public_enquiry_continuation',$1,true)",[operationId])
      assert.equal((await db.query('select count(*)::int as count from app.public_service_enquiries')).rows[0].count,1)
      assert.equal((await db.query(
        "update app.public_service_enquiries set description_ciphertext=repeat('A',96),revision=revision+1 where id=$1 returning revision",
        [enquiryId])).rows[0].revision,1)
      await db.query("select set_config('hh.public_enquiry_continuation',$1,true)",['20000000-0000-4000-8000-000000000020'])
      assert.equal((await db.query('select count(*)::int as count from app.public_service_enquiries')).rows[0].count,0)
      assert.equal((await db.query(
        "update app.public_service_enquiries set revision=revision+1 where id=$1",[enquiryId])).rowCount,0)
      // Account association is private and never grants an anonymous read.
      await db.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:actorA})])
      await db.query(`
        insert into app_private.free_express_account_links
          (enquiry_id,account_id,reference_code,locale)
        values ($1,$2,'HH-A1B2C3D4E5F6','en')
      `,[enquiryId,actorA])
      assert.equal((await db.query('select count(*)::int as count from app_private.free_express_account_links')).rows[0].count,1)
      await db.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:actorB})])
      assert.equal((await db.query('select count(*)::int as count from app_private.free_express_account_links')).rows[0].count,0)
      await db.query('SAVEPOINT wrong_account')
      await assert.rejects(db.query(`
        insert into app_private.free_express_account_links
          (enquiry_id,account_id,reference_code,locale)
        values ('10000000-0000-4000-8000-000000000011','${actorA}','HH-B1B2C3D4E5F6','en')
      `))
      await db.query('ROLLBACK TO SAVEPOINT wrong_account')
      await db.query('RESET ROLE')
      await db.query('SAVEPOINT public_read')
      await db.query('SET LOCAL ROLE anon')
      await assert.rejects(db.query('select * from app.public_service_enquiries'),{code:'42501'})
      await db.query('ROLLBACK TO SAVEPOINT public_read')
      await db.query('SAVEPOINT authenticated_read')
      await db.query('SET LOCAL ROLE authenticated')
      await assert.rejects(db.query('select * from app_private.free_express_account_links'),{code:'42501'})
      await db.query('ROLLBACK TO SAVEPOINT authenticated_read')
    } finally {
      await db.query('ROLLBACK').catch(()=>{})
      await db.end()
    }
  })
}
