import test,{before,after} from 'node:test'
import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {readFile} from 'node:fs/promises'
import pg from 'pg'
import {createDailyIntentionRepository} from '../lib/app/daybook-daily.js'
import {createDailyIntentionHandler} from '../lib/app/daybook-daily-handler.mjs'
import {collectDailyExport} from '../lib/app/daybook-daily-export.mjs'
import {closeDatabase} from '../lib/app/database.js'
const url=process.env.HH_DAILY_TEST_DATABASE_URL
if(!url||process.env.VERCEL||process.env.HH_APP_TEST_RUNTIME!=='isolated')throw new Error('ISOLATED_DATABASE_REQUIRED')
const parsed=new URL(url)
if(parsed.hostname!=='127.0.0.1'||parsed.pathname!=='/hh_daybook_daily_repo_test')throw new Error('ISOLATED_DATABASE_REQUIRED')
const admin=new pg.Client({connectionString:url}),config={test:true,databaseUrl:url,encryptionKey:Buffer.alloc(32,7),encryptionKeyId:'synthetic'}
const repo=createDailyIntentionRepository(config),a={id:randomUUID()},b={id:randomUUID()},goal=randomUUID(),action=randomUUID(),fresh=randomUUID()
for(const actor of [a,b])actor.claims={sub:actor.id,session_id:randomUUID()}
const draft=(changes={})=>({id:randomUUID(),operationId:randomUUID(),revision:0,localDay:'2026-11-22',timezone:'America/Toronto',weeklyGoalId:goal,actionIds:[action],carriedActionIds:[],carryFromDay:null,confirmed:true,...changes})
before(async()=>{
 await admin.connect()
 await admin.query(`create schema app;create schema app_private;create schema auth;
 create table app.accounts(id uuid primary key,status text,onboarding_state text);
 create table auth.sessions(id uuid primary key,user_id uuid);
 create function auth.uid() returns uuid language sql stable as $$select (current_setting('request.jwt.claims',true)::jsonb->>'sub')::uuid$$;
 create function app_private.account_active() returns boolean language sql stable as $$select exists(select 1 from app.accounts where id=auth.uid() and status='active')$$;
 create function app_private.session_active() returns boolean language sql stable as $$select exists(select 1 from auth.sessions where id=(current_setting('request.jwt.claims',true)::jsonb->>'session_id')::uuid and user_id=auth.uid())$$;
 create table app_private.coaching_goals(id uuid primary key,account_id uuid,status text);
 create table app_private.coaching_action_items(id uuid primary key,goal_id uuid,account_id uuid,status text,client_confirmed_at timestamptz);
 grant usage on schema app,auth,app_private to hh_app_backend;
 grant select,update on app.accounts to hh_app_backend;grant select on auth.sessions to hh_app_backend;
 grant select,update on app_private.coaching_goals,app_private.coaching_action_items to hh_app_backend;`)
 for(const table of ['coaching_goals','coaching_action_items'])await admin.query(`alter table app_private.${table} enable row level security;alter table app_private.${table} force row level security;create policy owner on app_private.${table} for all to hh_app_backend using(account_id=auth.uid()) with check(account_id=auth.uid())`)
 for(const actor of [a,b]){await admin.query("insert into app.accounts values($1,'active','active')",[actor.id]);await admin.query('insert into auth.sessions values($1,$2)',[actor.claims.session_id,actor.id])}
 await admin.query("insert into app_private.coaching_goals values($1,$2,'active')",[goal,a.id])
 for(const id of [action,fresh])await admin.query("insert into app_private.coaching_action_items values($1,$2,$3,'active',now())",[id,goal,a.id])
 await admin.query(await readFile(new URL('../supabase/migrations/20261122215437_hh_daybook_daily_intentions_20261122.sql',import.meta.url),'utf8'))
})
after(async()=>{await closeDatabase();await admin.end()})
let initial
test('daily save/read/day lookup encrypt all choices and retry without duplicate writes',async()=>{
 initial=draft();const result=await repo.save(a,initial)
 assert.equal(result.intention.revision,1);assert.deepEqual((await repo.read(a,initial.id)).intention,result.intention)
 assert.deepEqual((await repo.byDay(a,initial.localDay)).intention,result.intention)
 assert.equal((await repo.save(a,initial)).replayed,true)
 // UTC created_at metadata may coincide with the selected local calendar day.
 // Inspect the private selection payload/index, not that public-shaped timestamp.
 const raw=JSON.stringify((await admin.query('select payload_ciphertext,day_key from app_private.daybook_daily_intentions')).rows)
 assert.equal(raw.includes(initial.localDay),false);assert.equal(raw.includes(action),false)
 await assert.rejects(repo.save(a,{...initial,timezone:'UTC'}),{code:'DAYBOOK_IDEMPOTENCY_CONFLICT'})
 await assert.rejects(repo.save(a,draft()),{code:'DAYBOOK_REVISION_CONFLICT'})
})
test('parallel edits have one winner and stale original operation cannot report newer content',async()=>{
 const results=await Promise.allSettled([null,goal].map(weeklyGoalId=>repo.save(a,{...initial,operationId:randomUUID(),revision:1,weeklyGoalId})))
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1)
 assert.equal(results.find(r=>r.status==='rejected').reason.code,'DAYBOOK_REVISION_CONFLICT')
 await assert.rejects(repo.save(a,initial),{code:'DAYBOOK_REVISION_ADVANCED'})
})
test('other account cannot read, overwrite or select foreign canonical work',async()=>{
 await assert.rejects(repo.read(b,initial.id),{code:'NOT_FOUND'});assert.equal((await repo.byDay(b,initial.localDay)).intention,null)
 await assert.rejects(repo.save(b,{...initial,revision:2,operationId:randomUUID()}))
 await assert.rejects(repo.save(b,draft({localDay:'2026-11-23'})),{code:'DAYBOOK_GOAL_UNAVAILABLE'})
})
test('carryover binds to the persisted source day and supports fresh priorities alongside carried work',async()=>{
 const target=draft({localDay:'2026-11-23',actionIds:[action,fresh],carriedActionIds:[action],carryFromDay:initial.localDay})
 const result=await repo.save(a,target);assert.deepEqual(result.intention.actionIds,[action,fresh])
 assert.equal((await repo.byDay(a,initial.localDay)).intention.localDay,initial.localDay)
 await assert.rejects(repo.save(a,draft({localDay:'2026-11-24',actionIds:[fresh],carriedActionIds:[fresh],carryFromDay:initial.localDay})),{code:'DAYBOOK_CARRYOVER_UNAVAILABLE'})
 await admin.query("update app_private.coaching_action_items set status='completed' where id=$1",[action])
 await assert.rejects(repo.save(a,draft({localDay:'2026-11-25',carriedActionIds:[action],carryFromDay:initial.localDay})),{code:'DAYBOOK_ACTION_UNAVAILABLE'})
 assert.equal((await repo.save(a,{...target,operationId:randomUUID(),revision:1})).intention.revision,2)
})
test('revision-bound delete is retryable, removes payload and prevents delayed save resurrection',async()=>{
 const input=draft({localDay:'2026-11-26',actionIds:[]});await repo.save(a,input)
 const removal={id:input.id,revision:1,operationId:randomUUID(),confirmed:true}
 await assert.rejects(repo.remove(a,{...removal,revision:2}),{code:'DAYBOOK_REVISION_CONFLICT'})
 assert.equal((await repo.remove(a,removal)).deleted,true);assert.equal((await repo.remove(a,removal)).replayed,true)
 await assert.rejects(repo.read(a,input.id),{code:'NOT_FOUND'});await assert.rejects(repo.save(a,input),{code:'DAYBOOK_INTENTION_DELETED'})
 assert.equal((await repo.byDay(a,input.localDay)).intention,null)
})
test('actual Request handler completes owner-scoped daily CRUD through repository and PostgreSQL',async()=>{
 const handler=actor=>createDailyIntentionHandler({getConfig:()=>config,origin:()=>{},sameOrigin:()=>{},auth:()=>({verified:async()=>actor,apply:r=>r}),rate:async()=>{},repository:createDailyIntentionRepository})
 const request=(actor,method,body,query='')=>new Request('http://127.0.0.1/api/app/daybook-daily'+query,{method,headers:{'x-hh-account-id':actor.id,'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})})
 const input=draft({localDay:'2026-11-27',actionIds:[]}),run=handler(a)
 const created=await run(request(a,'POST',input));assert.equal(created.status,200);assert.equal((await created.json()).intention.revision,1)
 const read=await run(request(a,'GET',null,'?id='+input.id));assert.equal(read.status,200);assert.equal((await read.json()).intention.localDay,input.localDay)
 assert.equal((await (await run(request(a,'GET',null,'?day='+input.localDay))).json()).intention.id,input.id)
 assert.equal((await handler(b)(request(b,'GET',null,'?id='+input.id))).status,404)
 const edit=await run(request(a,'PATCH',{...input,operationId:randomUUID(),revision:1,weeklyGoalId:null}));assert.equal(edit.status,200)
 assert.equal((await edit.json()).intention.weeklyGoalId,null)
 const removal={id:input.id,operationId:randomUUID(),revision:2,confirmed:true}
 assert.equal((await run(request(a,'DELETE',{...removal,revision:1}))).status,409)
 assert.equal((await run(request(a,'DELETE',removal))).status,200)
 assert.equal((await run(request(a,'GET',null,'?id='+input.id))).status,404)
 assert.equal((await (await run(request(a,'GET',null,'?day='+input.localDay))).json()).intention,null)
})
test('owner export pages include every remaining encrypted daily record without leaking cursor ownership',async()=>{
 const page=await repo.list(a,{limit:1});assert.equal(page.intentions.length,1);assert.ok(page.nextCursor)
 const last=await repo.list(a,{limit:1,before:page.nextCursor});assert.equal(last.intentions.length,1);assert.equal(last.nextCursor,null)
 assert.notEqual(page.intentions[0].id,last.intentions[0].id)
 assert.deepEqual([page.intentions[0].localDay,last.intentions[0].localDay].sort(),['2026-11-22','2026-11-23'])
 assert.deepEqual(await repo.list(b,{}),{intentions:[],nextCursor:null})
 await assert.rejects(repo.list(b,{before:page.nextCursor}),{code:'DAYBOOK_CURSOR_UNAVAILABLE'})
 const handler=createDailyIntentionHandler({getConfig:()=>config,origin:()=>{},sameOrigin:()=>{},auth:()=>({verified:async()=>a,apply:r=>r}),rate:async()=>{},repository:createDailyIntentionRepository})
 const exported=await collectDailyExport(async(path,body,method,options)=>{
  assert.equal(options.accountId,a.id);assert.equal(method,'GET')
  if(path.startsWith('coaching-life-plan'))return {goals:[{id:goal,title:'Current synthetic goal'}],actions:[{id:action,goalId:goal,description:'Current synthetic step'},{id:fresh,goalId:goal,description:'Current second step'}]}
  const response=await handler(new Request('https://synthetic.test/api/app/'+path.replace('limit=50','limit=1'),{headers:{'x-hh-account-id':a.id}}))
  assert.equal(response.status,200);return response.json()
 },a.id,()=>true,'en')
 assert.equal(exported.intentions.length,2)
 assert.deepEqual(exported.intentions.map(row=>row.localDay).sort(),['2026-11-22','2026-11-23'])
 assert.equal(exported.referenceContext.goals[0].title,'Current synthetic goal')

})
test('revoked sessions cannot read daily records and account erasure removes ciphertext and receipts',async()=>{
 await admin.query('delete from auth.sessions where user_id=$1',[a.id]);await assert.rejects(repo.read(a,initial.id),{code:'SIGN_IN_REQUIRED'})
 await admin.query('delete from app.accounts where id=$1',[a.id])
 assert.equal((await admin.query('select 1 from app_private.daybook_daily_intentions where account_id=$1',[a.id])).rowCount,0)
 assert.equal((await admin.query('select 1 from app_private.daybook_daily_receipts where account_id=$1',[a.id])).rowCount,0)
})
