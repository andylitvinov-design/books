import test from 'node:test'
import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {readFile} from 'node:fs/promises'
import pg from 'pg'

// Explicit loopback-only test. A single outer transaction ROLLBACK guarantees
// that existing billing suites still receive an EMPTY PostgreSQL 17 fixture.
const requiredEnv={
  CI:'true',HH_APP_TEST_RUNTIME:'isolated',HH_BILLING_TEST_APPLY_PROPOSALS:'synthetic-only',
}
function connection(){
  for(const [key,value] of Object.entries(requiredEnv))
    if(process.env[key]!==value)throw Error('VIDEO_CREDIT_TEST_NOT_ISOLATED')
  if(process.env.VERCEL||process.env.NODE_ENV==='production')
    throw Error('VIDEO_CREDIT_TEST_NOT_ISOLATED')
  const u=new URL(process.env.HH_TEST_ADMIN_DATABASE_URL||'http://invalid')
  if(u.protocol!=='postgres:'||u.hostname!=='127.0.0.1'||(u.port&&u.port!=='5432')||
     u.pathname!=='/hh_app_test'||u.username!=='postgres'||
     u.password!=='synthetic-ci-admin'||u.search||u.hash)
    throw Error('VIDEO_CREDIT_TEST_WRONG_DB')
  return {host:'127.0.0.1',port:5432,user:'postgres',password:'synthetic-ci-admin',
    database:'hh_app_test',ssl:false,connectionTimeoutMillis:1500,statement_timeout:8000}
}
const config=connection()
const {Client}=pg
const claims=id=>({sub:id,session_id:id,role:'authenticated',exp:Math.floor(Date.now()/1000)+3600})
const codeIs=code=>error=>error?.code===code

test('video credits: genuine PG17 grants, FORCE RLS, idempotency, monthly reset and immutable charges',
  {timeout:90000},async()=>{
  const db=new Client(config)
  await db.connect()
  let begun=false
  try{
    const identity=(await db.query('select current_database() as db,current_user as role,current_setting(\'server_version_num\')::int as ver')).rows[0]
    assert.equal(identity.db,'hh_app_test');assert.equal(identity.role,'postgres')
    assert.ok(identity.ver>=170000&&identity.ver<180000)
    assert.equal((await db.query("select to_regclass('app.accounts') as t")).rows[0].t,null,
      'Reject a shared/nonempty fixture')
    await db.query('BEGIN');begun=true
    await db.query(`create role anon nologin;create role authenticated nologin;
      create role service_role nologin;create schema auth;
      create table auth.users(id uuid primary key,email text);
      create table auth.sessions(id uuid primary key,user_id uuid references auth.users(id));
      create function auth.jwt() returns jsonb language sql stable as $$
        select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
      create function auth.uid() returns uuid language sql stable as $$
        select nullif(auth.jwt()->>'sub','')::uuid $$;
      grant usage on schema auth to authenticated;
      grant execute on function auth.jwt(),auth.uid() to authenticated;`)
    const foundation=await readFile(new URL('../supabase/migrations/20261002164037_hh_app_r1_foundation.sql',import.meta.url),'utf8')
    assert.equal((foundation.match(/\bbegin;/gi)||[]).length,1)
    assert.equal((foundation.match(/\bcommit;/gi)||[]).length,1)
    // Remove ONLY the original transaction envelope; test controls rollback.
    const schema=foundation.replace(/\bbegin;\s*/i,'').replace(/\bcommit;\s*$/i,'')
    await db.query(schema)
    const credits=await readFile(new URL('../supabase/migrations/20261106064000_hh_video_credits_initial_monthly.sql',import.meta.url),'utf8')
    await db.query(credits)
    const owner=randomUUID(),stranger=randomUUID(),op=randomUUID()
    for(const id of [owner,stranger]){
      await db.query('insert into auth.users(id,email) values($1,$2)',[id,id+'@example.invalid'])
      await db.query('insert into auth.sessions(id,user_id) values($1,$1)',[id])
      await db.query("insert into app.accounts(id,status,onboarding_state) values($1,'active','active')",[id])
    }
    // RLS checks execute as the ACTUAL application role, not as postgres.
    async function as(role,id,fn){
      assert.ok(['hh_app_backend','anon','authenticated'].includes(role))
      await db.query('SAVEPOINT credit_role')
      try{
        await db.query('SET LOCAL ROLE '+role)
        await db.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify(claims(id))])
        const value=await fn()
        await db.query('SET LOCAL ROLE postgres')
        await db.query('RELEASE SAVEPOINT credit_role')
        return value
      }catch(error){
        await db.query('ROLLBACK TO SAVEPOINT credit_role')
        await db.query('RELEASE SAVEPOINT credit_role')
        throw error
      }
    }
    const columns=(await db.query(`select c.relrowsecurity as rls,c.relforcerowsecurity as force
      from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='app_private' and c.relname in
      ('video_credit_grants','video_credit_charges')`)).rows
    assert.equal(columns.length,2)
    assert.ok(columns.every(row=>row.rls&&row.force))
    await assert.rejects(as('authenticated',owner,()=>db.query(
      'select * from app_private.video_credit_grants')),codeIs('42501'))
    await assert.rejects(as('anon',owner,()=>db.query(
      'select * from app_private.video_credit_charges')),codeIs('42501'))
    const starter=await as('hh_app_backend',owner,()=>db.query(
      "insert into app_private.video_credit_grants(account_id,grant_key,kind,credits) values($1,'starter','starter',1300) returning credits",[owner]))
    assert.equal(starter.rows[0].credits,1300)
    // First calendar month: no extra 300. Must not leak a double first grant.
    const monthSQL=`insert into app_private.video_credit_grants
      (account_id,grant_key,kind,period_start,credits)
      values($1,'monthly:'||to_char(date_trunc('month',timezone('UTC',now())),'YYYY-MM'),
        'monthly',date_trunc('month',timezone('UTC',now()))::date,300)`
    await assert.rejects(as('hh_app_backend',owner,()=>db.query(monthSQL,[owner])),codeIs('23514'))
    await assert.rejects(as('hh_app_backend',owner,()=>db.query(
      "insert into app_private.video_credit_grants(account_id,grant_key,kind,credits) values($1,'starter','starter',1300)",
      [owner])),codeIs('23505'))
    // An established account from a prior UTC month gets exactly one 300 grant.
    await db.query(`insert into app_private.video_credit_grants
      (account_id,grant_key,kind,credits,created_at)
      values($1,'starter','starter',1300,date_trunc('month',now())-interval '1 day')`,[stranger])
    await as('hh_app_backend',stranger,()=>db.query(monthSQL,[stranger]))
    assert.equal((await as('hh_app_backend',stranger,()=>db.query(
      'select credits from app_private.video_credit_grants where account_id=$1 and kind=\'monthly\'',[stranger]))).rows[0].credits,300)
    assert.equal((await as('hh_app_backend',owner,()=>db.query(
      'select count(*)::int as n from app_private.video_credit_grants'))).rows[0].n,1)
    const held=await as('hh_app_backend',owner,()=>db.query(`insert into app_private.video_credit_charges
      (account_id,operation_id,credits,monthly_used,starter_used)
      values($1,$2,10,0,10) returning status`,[owner,op]))
    assert.equal(held.rows[0].status,'held')
    await assert.rejects(as('hh_app_backend',owner,()=>db.query(`insert into app_private.video_credit_charges
      (account_id,operation_id,credits,monthly_used,starter_used)
      values($1,$2,10,0,10)`,[owner,op])),codeIs('23505'))
    assert.equal((await as('hh_app_backend',stranger,()=>db.query(
      'select count(*)::int as n from app_private.video_credit_charges'))).rows[0].n,0)
    const complete=await as('hh_app_backend',owner,()=>db.query(`update app_private.video_credit_charges
      set status='completed',artifact_bytes=2048,updated_at=now()
      where account_id=$1 and operation_id=$2 returning status,artifact_bytes`,[owner,op]))
    assert.equal(complete.rows[0].status,'completed')
    assert.equal(complete.rows[0].artifact_bytes,2048)
    const after=await as('hh_app_backend',owner,()=>db.query(`update app_private.video_credit_charges
      set status='released',artifact_bytes=null,updated_at=now()
      where account_id=$1 and operation_id=$2 returning status`,[owner,op]))
    assert.equal(after.rowCount,0,'completed credit cannot be refunded or edited')
    await assert.rejects(as('hh_app_backend',owner,()=>db.query(
      "delete from app_private.video_credit_charges where operation_id=$1",[op])),codeIs('42501'))
    // An explicit account deletion must still cascade the private credit
    // history. Blocking data erasure with an immutable DELETE trigger is a bug.
    await db.query('delete from app.accounts where id=$1',[owner])
    assert.equal((await db.query(
      'select count(*)::int as n from app_private.video_credit_charges where account_id=$1',[owner]
    )).rows[0].n,0)
    assert.equal((await db.query(
      'select count(*)::int as n from app_private.video_credit_grants where account_id=$1',[owner]
    )).rows[0].n,0)
  } finally {
    if(begun)await db.query('ROLLBACK').catch(()=>{})
    await db.end()
  }
})
