// SECURITY CRITICAL: this test may apply DDL ONLY in the explicitly isolated
// and disposable CI Postgres database; NEVER in a Vercel or production process.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const url = process.env.HH_TEST_ADMIN_DATABASE_URL || ''
let isolated = false
try {
  const parsed = new URL(url)
  isolated = process.env.CI === 'true' && process.env.HH_APP_TEST_RUNTIME === 'isolated' &&
    process.env.HH_CLIENT_MEMORY_TEST_APPLY_PROPOSALS === 'synthetic-only' &&
    !process.env.VERCEL && ['127.0.0.1','localhost'].includes(parsed.hostname) &&
    parsed.pathname === '/hh_client_memory_test'
} catch {}
const A='10000000-0000-4000-8000-000000000001'
const B='10000000-0000-4000-8000-000000000002'
const M1='10000000-0000-4000-8000-000000000003'
const M2='10000000-0000-4000-8000-000000000004'
const REQ='20000000-0000-4000-8000-000000000001'
const REC='30000000-0000-4000-8000-000000000001'
const SHARE='40000000-0000-4000-8000-000000000001'
const TASK='50000000-0000-4000-8000-000000000001'
const op=n=>`60000000-0000-4000-8000-${String(n).padStart(12,'0')}`

if(!isolated){
  test('client memory PostgreSQL owner/master isolation requires isolated loopback DB', {skip:true},()=>{})
} else {
  test('actual PostgreSQL RLS: 2 owners, 2 masters, share revocation, tasks',async()=>{
    const {default:pg}=await import('pg')
    const db = new pg.Client({connectionString:url})
    await db.connect()
    try {
      const has = await db.query("select to_regclass('app.accounts') as present")
      if(has.rows[0]?.present)throw Error('Refuse to modify nonempty database')
      await db.query(`
        -- Reuse cluster-wide CI roles if the existing app database suite ran
        -- earlier in this SAME isolated PostgreSQL service.
        do $roles$ begin
          if not exists(select 1 from pg_roles where rolname='anon') then
            create role anon nologin;
          end if;
          if not exists(select 1 from pg_roles where rolname='authenticated') then
            create role authenticated nologin;
          end if;
          if not exists(select 1 from pg_roles where rolname='hh_app_backend') then
            create role hh_app_backend nologin;
          end if;
          if not exists(select 1 from pg_roles where rolname='hh_app_inbox') then
            create role hh_app_inbox nologin;
          end if;
        end $roles$;
        create schema auth; create schema app; create schema app_private;
        create function auth.uid() returns uuid language sql stable as
          $$ select nullif((coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb->>'sub'),'')::uuid $$;
        create table app.accounts (id uuid primary key,status text not null,onboarding_state text not null);
        create table app.practitioners(id uuid primary key,trusted_auth_user_id uuid not null,
           active boolean not null,status text not null,public_profile jsonb not null default '{}'::jsonb);
        create table app.consultation_requests(id uuid primary key, account_id uuid not null references app.accounts(id),
           recipient_practitioner_id uuid not null references app.practitioners(id),status text not null);
        create function app_private.account_active() returns boolean language sql stable security invoker as
          $$ select exists(select 1 from app.accounts where id=auth.uid() and status='active' and onboarding_state='active') $$;
        insert into app.accounts values
          ('${A}','active','active'),('${B}','active','active'),
          ('${M1}','active','active'),('${M2}','active','active');
        insert into app.practitioners values
          ('70000000-0000-4000-8000-000000000001','${M1}',true,'approved','{"name":"Synthetic M1"}'),
          ('70000000-0000-4000-8000-000000000002','${M2}',true,'approved','{"name":"Synthetic M2"}');
        insert into app.consultation_requests values
          ('${REQ}','${A}','70000000-0000-4000-8000-000000000001','requested');
        grant usage on schema auth,app,app_private to hh_app_backend;
        grant execute on function auth.uid(),app_private.account_active() to hh_app_backend;
        grant select on app.accounts,app.practitioners,app.consultation_requests to hh_app_backend;
        alter table app.accounts enable row level security; alter table app.accounts force row level security;
        create policy accounts_sel on app.accounts for select to hh_app_backend using(id=auth.uid());
        alter table app.practitioners enable row level security; alter table app.practitioners force row level security;
        create policy practitioner_sel on app.practitioners for select to hh_app_backend
          using(active AND status='approved' AND (public_profile<>'{}'::jsonb OR trusted_auth_user_id=auth.uid()));
        alter table app.consultation_requests enable row level security;
        alter table app.consultation_requests force row level security;
        create policy request_sel on app.consultation_requests for select to hh_app_backend using(
          account_id=auth.uid() OR EXISTS(SELECT 1 FROM app.practitioners p
          WHERE p.id=recipient_practitioner_id AND p.trusted_auth_user_id=auth.uid() AND p.active AND p.status='approved'));
      `)
      // Real SQL executes BEGIN/COMMIT. This test owns its disposable DB.
      const source = await readFile(new URL('../supabase/migrations/20261106203000_hh_client_memory_care_journey_v1.sql',import.meta.url),'utf8')
      await db.query(source)
      const force = await db.query(`select relname,relrowsecurity,relforcerowsecurity from pg_class
        where oid in ('app_private.client_ai_memory_settings'::regclass,
        'app_private.client_ai_memory_items'::regclass,
        'app_private.client_ai_memory_shares'::regclass,
        'app_private.client_care_tasks'::regclass,
        'app_private.client_care_task_events'::regclass,
        'app_private.client_ai_memory_audit'::regclass)`)
      assert.equal(force.rowCount,6)
      assert.ok(force.rows.every(r=>r.relrowsecurity&&r.relforcerowsecurity))
      const as = async(actor,fn)=>{
        await db.query('begin')
        try {
          await db.query('set local role hh_app_backend')
          await db.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:actor})])
          const val=await fn(db)
          await db.query('commit')
          return val
        }catch(e){await db.query('rollback').catch(()=>{});throw e}
      }
      await as(A,db=>db.query(`insert into app_private.client_ai_memory_settings
        (account_id,memory_enabled,master_sharing_enabled) values($1,true,true)`,[A]))
      await as(A,db=>db.query(`insert into app_private.client_ai_memory_items
        (id,account_id,category,scope,payload_ciphertext,source_kind,confidence,
         confirmed_at,expires_at,operation_id)
        values($1,$2,'goal','coaching',$3,'client_explicit','client_confirmed',now(),now()+interval '30 days',$4)`,
        [REC,A,'x'.repeat(100),op(1)]))
      assert.equal((await as(B,db=>db.query('select count(*)::int n from app_private.client_ai_memory_items'))).rows[0].n,0)
      // A direct callable helper must never reveal another account's item.
      assert.equal((await as(A,db=>db.query(
        'select app_private.client_ai_share_item_valid($1,$2) allowed',
        [A,REC]))).rows[0].allowed,true)
      assert.equal((await as(B,db=>db.query(
        'select app_private.client_ai_share_item_valid($1,$2) allowed',
        [A,REC]))).rows[0].allowed,false)
      await as(A,db=>db.query(`insert into app_private.client_ai_memory_shares
        (id,account_id,memory_item_id,consultation_request_id,practitioner_account_id,
          scope,consent_version,operation_id,expires_at)
        values($1,$2,$3,$4,$5,'view_one_item','client-ai-share-v2',$6,now()+interval '7 days')`,
        [SHARE,A,REC,REQ,M1,op(2)]))
      assert.equal((await as(M1,db=>db.query('select count(*)::int n from app_private.client_ai_memory_items'))).rows[0].n,1)
      assert.equal((await as(M2,db=>db.query('select count(*)::int n from app_private.client_ai_memory_items'))).rows[0].n,0)
      await as(A,db=>db.query('update app_private.client_ai_memory_settings set memory_enabled=false where account_id=$1',[A]))
      assert.equal((await as(M1,db=>db.query('select count(*)::int n from app_private.client_ai_memory_items'))).rows[0].n,0)
      const share = await as(A,db=>db.query('select revoked_at from app_private.client_ai_memory_shares where id=$1',[SHARE]))
      assert.ok(share.rows[0].revoked_at)
      await as(M1,db=>db.query(`insert into app_private.client_care_tasks
        (id,client_account_id,practitioner_account_id,consultation_request_id,origin,
          task_type,payload_ciphertext,status,operation_id)
        values($1,$2,$3,$4,'master_assignment','practice',$5,'offered',$6)`,[TASK,A,M1,REQ,'x'.repeat(100),op(3)]))
      assert.equal((await as(A,db=>db.query('select count(*)::int n from app_private.client_care_tasks'))).rows[0].n,1)
      assert.equal((await as(M2,db=>db.query('select count(*)::int n from app_private.client_care_tasks'))).rows[0].n,0)
      await as(A,db=>db.query("update app_private.client_care_tasks set status='accepted',revision=revision+1 where id=$1",[TASK]))
      await as(A,db=>db.query("update app_private.client_care_tasks set status='self_reported',revision=revision+1 where id=$1",[TASK]))
      // Client cannot mark their own report as master-reviewed.
      await assert.rejects(()=>as(A,db=>db.query(
        "update app_private.client_care_tasks set status='reviewed',revision=revision+1 where id=$1",[TASK])))
      // A different, active master must neither see nor review this client's task.
      assert.equal((await as(M2,db=>db.query(
        "update app_private.client_care_tasks set status='reviewed',revision=revision+1 where id=$1",[TASK]))).rowCount,0)
      await as(M1,db=>db.query("update app_private.client_care_tasks set status='reviewed',revision=revision+1 where id=$1",[TASK]))
      const status=await as(A,db=>db.query('select status,revision from app_private.client_care_tasks where id=$1',[TASK]))
      assert.deepEqual(status.rows[0],{status:'reviewed',revision:3})
      assert.equal((await as(M2,db=>db.query('select count(*)::int n from app_private.client_ai_memory_settings'))).rows[0].n,0)

      // Sensitive items require a separate consent; a second master cannot be
      // substituted into a valid owner's share request.
      await assert.rejects(()=>as(A,db=>db.query(`insert into app_private.client_ai_memory_items
        (id,account_id,category,scope,privacy_class,payload_ciphertext,source_kind,confidence,
         confirmed_at,expires_at,operation_id)
        values('30000000-0000-4000-8000-000000000002',$1,'goal','coaching','sensitive',$2,
          'client_explicit','client_confirmed',now(),now()+interval '30 days',$3)`,
        [A,'y'.repeat(100),op(4)])))
      await assert.rejects(()=>as(A,db=>db.query(`insert into app_private.client_ai_memory_shares
        (id,account_id,memory_item_id,consultation_request_id,practitioner_account_id,
          scope,consent_version,operation_id,expires_at)
        values('40000000-0000-4000-8000-000000000002',$1,$2,$3,$4,
          'view_one_item','client-ai-share-v2',$5,now()+interval '7 days')`,
        [A,REC,REQ,M2,op(5)])))

      // Re-enabling sharing and then deleting settings must revoke every live grant.
      await as(A,db=>db.query(`update app_private.client_ai_memory_settings
        set memory_enabled=true,master_sharing_enabled=true where account_id=$1`,[A]))
      await as(A,db=>db.query(`insert into app_private.client_ai_memory_shares
        (id,account_id,memory_item_id,consultation_request_id,practitioner_account_id,
          scope,consent_version,operation_id,expires_at)
        values('40000000-0000-4000-8000-000000000003',$1,$2,$3,$4,
          'view_one_item','client-ai-share-v2',$5,now()+interval '7 days')`,
        [A,REC,REQ,M1,op(6)]))
      await as(A,db=>db.query('delete from app_private.client_ai_memory_settings where account_id=$1',[A]))
      const deletedSettingsShare=await as(A,db=>db.query(
        "select revoked_at from app_private.client_ai_memory_shares where id='40000000-0000-4000-8000-000000000003'"))
      assert.ok(deletedSettingsShare.rows[0].revoked_at)

      // Neither anon nor authenticated can directly read these private tables.
      for(const role of ['anon','authenticated']){
        await db.query('begin')
        try{
          await db.query(`set local role ${role}`)
          await assert.rejects(()=>db.query('select * from app_private.client_ai_memory_items'))
        }finally{await db.query('rollback')}
      }
    }finally { await db.end() }
  })
}
