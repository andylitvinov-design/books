import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import pg from 'pg';

// Synthetic PG17, loopback and one ROLLBACK; never opens a live database.
const expected={CI:'true',HH_APP_TEST_RUNTIME:'isolated',HH_BILLING_TEST_APPLY_PROPOSALS:'synthetic-only'};
function isolated(){
 for(const [k,v] of Object.entries(expected))if(process.env[k]!==v)throw Error('VIDEO_PAID_NOT_ISOLATED');
 if(process.env.VERCEL||process.env.NODE_ENV==='production')throw Error('VIDEO_PAID_PRODUCTION_DENIED');
 const u=new URL(process.env.HH_TEST_ADMIN_DATABASE_URL||'http://invalid');
 if(u.protocol!=='postgres:'||u.hostname!=='127.0.0.1'||u.port!=='5432'||
    u.pathname!=='/hh_app_test'||u.username!=='postgres'||
    u.password!=='synthetic-ci-admin'||u.search||u.hash)throw Error('VIDEO_PAID_WRONG_DATABASE');
 return {host:'127.0.0.1',port:5432,user:'postgres',password:'synthetic-ci-admin',
   database:'hh_app_test',ssl:false,connectionTimeoutMillis:1500,statement_timeout:8000};
}
const config=isolated();
async function migration(path){
 const src=await readFile(new URL('../'+path,import.meta.url),'utf8');
 assert.equal((src.match(/^\s*begin;\s*$/gim)||[]).length,1);
 assert.equal((src.match(/^\s*commit;\s*$/gim)||[]).length,1);
 return src.replace(/^\s*begin;\s*$/im,'').replace(/^\s*commit;\s*$/im,'');
}
const token=id=>JSON.stringify({sub:id,session_id:id,role:'authenticated',exp:Math.floor(Date.now()/1000)+3600});
const pgError=code=>e=>e?.code===code;

test('Video paid hybrid SQL on PG17: actual migration, RLS, existing HeyGen, single shot and exact QA asset', {timeout:90000},async()=>{
 const db=new pg.Client(config);await db.connect();let begun=false;
 try{
  const info=(await db.query("select current_database() as name,current_user as role,current_setting('server_version_num')::int as ver")).rows[0];
  assert.equal(info.name,'hh_app_test');assert.equal(info.role,'postgres');
  assert.ok(info.ver>=170000&&info.ver<180000);
  assert.equal((await db.query("select to_regclass('app.accounts') as t")).rows[0].t,null);
  await db.query('BEGIN');begun=true;
  await db.query([
    'create role anon nologin;create role authenticated nologin;create role service_role nologin;',
    'create schema auth;create table auth.users(id uuid primary key,email text);',
    'create table auth.sessions(id uuid primary key,user_id uuid references auth.users(id));',
    "create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;",
    "create function auth.uid() returns uuid language sql stable as $$ select nullif(auth.jwt()->>'sub','')::uuid $$;",
    'grant usage on schema auth to authenticated;',
    'grant execute on function auth.jwt(),auth.uid() to authenticated;',
  ].join('\n'));
  await db.query(await migration('supabase/migrations/20261002164037_hh_app_r1_foundation.sql'));
  await db.query(await migration('supabase/migrations/20261028161029_hh_account_personal_videos_private_20261028.sql'));
  // The old HeyGen schema was applied to production but its original PR
  // is paused. Recreate the named legacy constraints affected by THIS patch.
  await db.query([
    'create table app_private.video_generation_codes(id uuid primary key);',
    'create table app_private.video_generation_jobs(',
    ' id uuid primary key,code_id uuid not null unique references app_private.video_generation_codes(id),',
    ' owner_id uuid not null references app.accounts(id),',
    " tier text not null constraint video_generation_jobs_tier_check check(tier in ('smart','pro')),",
    " request_hash text not null check(request_hash ~ '^[a-f0-9]{64}$'),",
    " model text not null constraint video_generation_jobs_model_check check(model in ('heygen-video-1','heygen/heygen-video-1')),",
    ' estimate_cents integer not null,limit_cents integer not null,',
    ' external_id text unique constraint video_generation_jobs_external_id_check check(external_id is null or length(external_id) between 8 and 128),',
    " status text not null default 'submitting' constraint video_generation_jobs_status_check check(status in ('submitting','pending','in_progress','completed','failed','cancelled','expired','unknown')),",
    " storage_state text not null default 'none',created_at timestamptz not null default now(),",
    ' updated_at timestamptz not null default now(),completed_at timestamptz);',
    'alter table app_private.video_generation_jobs enable row level security;',
    'alter table app_private.video_generation_jobs force row level security;',
    'revoke all on app_private.video_generation_jobs from public,anon,authenticated,service_role;',
    'grant select,insert,update on app_private.video_generation_jobs to hh_app_backend;',
    'create policy hh_video_jobs_backend_only on app_private.video_generation_jobs for all to hh_app_backend',
    ' using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));',
  ].join('\n'));
  await db.query(await migration('supabase/migrations/20261117120000_hh_video_paid_hybrid_orders_v1.sql'));
  const secure=(await db.query(
    "select relname,relrowsecurity as rls,relforcerowsecurity as forced from pg_class where relnamespace='app_private'::regnamespace and relname in ('video_paid_orders_v1','video_generation_jobs')")).rows;
  assert.equal(secure.length,2);
  assert.ok(secure.every(x=>x.rls&&x.forced));
  const [client,other,admin]=[randomUUID(),randomUUID(),randomUUID()];
  for(const id of [client,other,admin]){
    await db.query('insert into auth.users(id,email) values($1,$2)',[id,id+'@test.invalid']);
    await db.query('insert into auth.sessions(id,user_id) values($1,$1)',[id]);
    await db.query("insert into app.accounts(id,status,onboarding_state) values($1,'active','active')",[id]);
  }
  async function acting(role,id,fn,{moderator=false,orderId='',videoId=''}={}){
    await db.query('SAVEPOINT paidjob');
    try{
      await db.query('SET LOCAL ROLE '+role);
      await db.query("select set_config('request.jwt.claims',$1,true)",[token(id)]);
      await db.query("select set_config('hh.moderator',$1,true)",[moderator?'1':'']);
      await db.query("select set_config('hh.video_paid_qa_order_id',$1,true)",[orderId]);
      await db.query("select set_config('hh.video_paid_qa_video_id',$1,true)",[videoId]);
      const result=await fn();
      await db.query('SET LOCAL ROLE postgres');
      await db.query('RELEASE SAVEPOINT paidjob');
      return result;
    }catch(e){
      await db.query('ROLLBACK TO SAVEPOINT paidjob');
      await db.query('RELEASE SAVEPOINT paidjob');
      throw e;
    }
  }
  const created=await acting('hh_app_backend',client,()=>db.query(
    "insert into app_private.video_paid_orders_v1(account_id,operation_id,tier,theme,locale,aspect_ratio,price_eur_minor,ai_seconds,library_seconds,provider_budget_usd_cents) values($1,$2,'extra','energy','ru','16:9',300,6,24,30) returning *",
    [client,randomUUID()]));
  const order=created.rows[0];
  assert.equal(order.status,'requested');
  assert.equal((await acting('hh_app_backend',other,()=>db.query(
    'select id from app_private.video_paid_orders_v1'))).rows.length,0);
  await assert.rejects(acting('authenticated',client,()=>db.query(
    'select id from app_private.video_paid_orders_v1')),pgError('42501'));
  assert.equal((await acting('hh_app_backend',client,()=>db.query(
    "update app_private.video_paid_orders_v1 set status='cancelled' where id=$1 returning id",[order.id]))).rowCount,0);
  const receipt='a'.repeat(64);
  await acting('hh_app_backend',admin,()=>db.query(
    "update app_private.video_paid_orders_v1 set status='payment_verified',receipt_digest=$2,verified_at=now(),reviewer_id=$3,revision=revision+1 where id=$1",
    [order.id,receipt,admin]),{moderator:true});
  const legacyId=randomUUID();
  await db.query('insert into app_private.video_generation_codes(id) values($1)',[legacyId]);
  const prior=await acting('hh_app_backend',client,()=>db.query(
    "insert into app_private.video_generation_jobs(id,code_id,owner_id,tier,request_hash,model,estimate_cents,limit_cents) values($1,$2,$3,'smart',$4,'heygen-video-1',24,75) returning code_id,paid_order_id",
    [randomUUID(),legacyId,client,'b'.repeat(64)]));
  assert.equal(prior.rows[0].code_id,legacyId);
  assert.equal(prior.rows[0].paid_order_id,null);
  const shot="insert into app_private.video_generation_jobs(id,paid_order_id,shot_index,owner_id,tier,request_hash,model,estimate_cents,limit_cents) values($1,$2,1,$3,'extra',$4,'veo-3.1-lite-generate-001',30,30) returning id";
  await assert.rejects(acting('hh_app_backend',client,()=>db.query(
    shot,[randomUUID(),order.id,client,'c'.repeat(64)])),pgError('42501'));
  assert.equal((await acting('hh_app_backend',admin,()=>db.query(
    shot,[randomUUID(),order.id,client,'c'.repeat(64)]),{moderator:true})).rowCount,1);
  await assert.rejects(acting('hh_app_backend',admin,()=>db.query(
    shot,[randomUUID(),order.id,client,'d'.repeat(64)]),{moderator:true}),pgError('23505'));
  const videoId=randomUUID(),otherVideoId=randomUUID();
  for(const [id,account] of [[videoId,client],[otherVideoId,other]]){
    await acting('hh_app_backend',account,()=>db.query(
      "insert into app_private.personal_videos(id,account_id,theme,scene_id,aspect,duration_seconds,mime,bytes,object_key,status,ready_at) values($1,$2,'energy','quiet-sea','landscape',30,'video/mp4',4096,$3,'ready',now())",
      [id,account,'personal-videos/'+account+'/'+id+'/master.mp4']));
  }
  await acting('hh_app_backend',admin,()=>db.query(
    "update app_private.video_paid_orders_v1 set status='qa_pending' where id=$1",[order.id]),{moderator:true});
  const assets=opts=>acting('hh_app_backend',admin,()=>db.query(
    'select id from app_private.personal_videos order by id'),opts);
  assert.equal((await assets({moderator:true})).rowCount,0);
  assert.deepEqual((await assets({moderator:true,orderId:order.id,videoId})).rows.map(x=>x.id),[videoId]);
  assert.equal((await assets({moderator:true,orderId:order.id,videoId:otherVideoId})).rowCount,0);
  assert.equal((await assets({moderator:true,orderId:randomUUID(),videoId})).rowCount,0);
  await assert.rejects(acting('hh_app_backend',admin,()=>db.query(
    "update app_private.video_paid_orders_v1 set status='delivered' where id=$1",[order.id]),
    {moderator:true}),pgError('23514'));
 }finally{
   if(begun)await db.query('ROLLBACK').catch(()=>{});
   await db.end();
 }
});
