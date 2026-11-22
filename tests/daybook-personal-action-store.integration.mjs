import test,{before,after} from 'node:test'
import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {readFile} from 'node:fs/promises'
import pg from 'pg'
import {createPersonalActionRepository} from '../lib/app/daybook-personal-actions.js'
import {createDailyIntentionRepository} from '../lib/app/daybook-daily.js'
import {createPersonalActionHandler} from '../lib/app/daybook-personal-action-handler.mjs'
import {closeDatabase,transaction} from '../lib/app/database.js'
const url=process.env.HH_ACTION_TEST_DATABASE_URL
if(!url||process.env.VERCEL||process.env.HH_APP_TEST_RUNTIME!=='isolated')throw new Error('ISOLATED_DATABASE_REQUIRED')
const parsed=new URL(url)
if(parsed.hostname!=='127.0.0.1'||parsed.pathname!=='/hh_personal_action_test')throw new Error('ISOLATED_DATABASE_REQUIRED')
const admin=new pg.Client({connectionString:url}),config={test:true,databaseUrl:url,encryptionKey:Buffer.alloc(32,3),encryptionKeyId:'synthetic'}
const repo=createPersonalActionRepository(config),a={id:randomUUID(),claims:{}},b={id:randomUUID(),claims:{}}
for(const actor of [a,b])actor.claims={sub:actor.id,session_id:randomUUID()}
const goal=randomUUID(),foreignGoal=randomUUID()
const draft=(changes={})=>({id:randomUUID(),goalId:goal,operationId:randomUUID(),revision:0,description:'Synthetic private step',timing:'After breakfast',trigger:'Open notebook',obstacle:'Low energy',fallback:'One line',feasibilityScore:7,dueAt:'2026-11-23T14:00:00.000Z',status:'accepted',confirmed:true,...changes})
before(async()=>{
 await admin.connect()
 await admin.query(`create schema app;create schema app_private;create schema auth;
 create table app.accounts(id uuid primary key,status text,onboarding_state text);
 create table auth.sessions(id uuid primary key,user_id uuid);
 create function auth.uid() returns uuid language sql stable as $$select (current_setting('request.jwt.claims',true)::jsonb->>'sub')::uuid$$;
 create function app_private.account_active() returns boolean language sql stable as $$select exists(select 1 from app.accounts where id=auth.uid() and status='active')$$;
 create function app_private.session_active() returns boolean language sql stable as $$select exists(select 1 from auth.sessions where id=(current_setting('request.jwt.claims',true)::jsonb->>'session_id')::uuid and user_id=auth.uid())$$;
 create table app_private.coaching_life_plans(id uuid primary key default gen_random_uuid(),account_id uuid unique references app.accounts(id),plan_version integer default 1,status text default 'active');
 create table app_private.coaching_life_plan_areas(id uuid primary key default gen_random_uuid(),plan_id uuid,account_id uuid,area_key text,unique(plan_id,area_key));
 create table app_private.coaching_goals(id uuid primary key,area_id uuid,account_id uuid,title_ciphertext text,desired_outcome_ciphertext text,status text check(status in ('proposed','active','paused','completed','cancelled')),target_date date,revision integer,idempotency_key uuid,created_at timestamptz default now(),updated_at timestamptz default now());
 create table app_private.coaching_action_items(id uuid primary key,goal_id uuid references app_private.coaching_goals(id) on delete cascade,account_id uuid,source_session_id uuid,source_report_id uuid,source_action_key text,description_ciphertext text not null,timing_ciphertext text,trigger_ciphertext text,obstacle_ciphertext text,fallback_ciphertext text,feasibility_score smallint check(feasibility_score between 0 and 10),status text check(status in ('proposed','accepted','deferred','declined','active','completed','cancelled')),client_confirmed_at timestamptz,due_at timestamptz,completed_at timestamptz,revision integer not null,created_at timestamptz default now(),updated_at timestamptz default now(),check(status not in ('accepted','active','completed') or client_confirmed_at is not null),check(status<>'completed' or completed_at is not null));
 create table app_private.coaching_life_plan_changes(id uuid primary key,plan_id uuid,account_id uuid,entity_kind text,entity_id uuid,from_revision integer,to_revision integer,change_kind text,snapshot_ciphertext text,changed_by text,actor_account_id uuid,created_at timestamptz default now());
 grant usage on schema app,auth,app_private to hh_app_backend;
 grant select,update on app.accounts to hh_app_backend;grant select on auth.sessions to hh_app_backend;
 grant select,insert,update on app_private.coaching_life_plans,app_private.coaching_life_plan_areas,app_private.coaching_goals,app_private.coaching_action_items to hh_app_backend;
 grant select,insert on app_private.coaching_life_plan_changes to hh_app_backend;`)
 for(const table of ['coaching_life_plans','coaching_life_plan_areas','coaching_goals','coaching_action_items','coaching_life_plan_changes'])await admin.query(`alter table app_private.${table} enable row level security;alter table app_private.${table} force row level security;create policy owner on app_private.${table} for all to hh_app_backend using(account_id=auth.uid() and app_private.account_active()) with check(account_id=auth.uid() and app_private.account_active())`)
 for(const actor of [a,b]){await admin.query("insert into app.accounts values($1,'active','active')",[actor.id]);await admin.query('insert into auth.sessions values($1,$2)',[actor.claims.session_id,actor.id])}
 await admin.query(await readFile(new URL('../supabase/migrations/20261122215422_hh_personal_goal_statuses_20261122.sql',import.meta.url),'utf8'))
 await admin.query(await readFile(new URL('../supabase/migrations/20261110153142_hh_coaching_action_erasure.sql',import.meta.url),'utf8'))
 await admin.query(await readFile(new URL('../supabase/migrations/20261122215438_hh_personal_action_erasure_20261122.sql',import.meta.url),'utf8'))
 await admin.query(await readFile(new URL('../supabase/migrations/20261122215437_hh_daybook_daily_intentions_20261122.sql',import.meta.url),'utf8'))
 for(const [actor,id] of [[a,goal],[b,foreignGoal]]){
  const plan=(await admin.query('insert into app_private.coaching_life_plans(account_id) values($1) returning id',[actor.id])).rows[0].id
  const area=(await admin.query("insert into app_private.coaching_life_plan_areas(plan_id,account_id,area_key) values($1,$2,'meaning_purpose') returning id",[plan,actor.id])).rows[0].id
  await admin.query("insert into app_private.coaching_goals(id,area_id,account_id,title_ciphertext,status,revision,idempotency_key) values($1,$2,$3,'unused','active',1,$1)",[id,area,actor.id])
 }
})
after(async()=>{await closeDatabase();await admin.end()})
test('canonical actions encrypt planning fields and return independently readable owner content',async()=>{
 const input=draft(),saved=await repo.save(a,input)
 assert.equal(saved.action.revision,1);assert.deepEqual((await repo.read(a,input.id)).action,saved.action)
 assert.equal(saved.action.description,input.description);assert.equal(saved.action.obstacle,input.obstacle)
 const row=(await admin.query('select * from app_private.coaching_action_items where id=$1',[input.id])).rows[0]
 assert.equal(row.source_report_id,null);assert.equal(row.source_session_id,null)
 for(const field of ['description','timing','trigger','obstacle','fallback'])assert.equal(row[field+'_ciphertext'].includes(input[field]),false)
 assert.equal((await admin.query("select snapshot_ciphertext from app_private.coaching_life_plan_changes where entity_id=$1",[input.id])).rows[0].snapshot_ciphertext.includes(input.description),false)
})
test('committed response retry is idempotent, changed reuse and old revisions fail',async()=>{
 const input=draft();await repo.save(a,input);assert.equal((await repo.save(a,input)).replayed,true)
 await assert.rejects(repo.save(a,{...input,description:'different'}),{code:'ACTION_IDEMPOTENCY_CONFLICT'})
 await repo.save(a,{...input,operationId:randomUUID(),revision:1,status:'active'})
 await assert.rejects(repo.save(a,input),{code:'ACTION_REVISION_ADVANCED'})
 const other=draft();await repo.save(a,other)
 await assert.rejects(repo.save(a,{...input,operationId:other.operationId}),{code:'ACTION_IDEMPOTENCY_CONFLICT'})
})
test('concurrent edits have one winner and cannot change parent goal or forge confirmation',async()=>{
 const input=draft();await repo.save(a,input)
 const results=await Promise.allSettled(['first','second'].map(description=>repo.save(a,{...input,operationId:randomUUID(),revision:1,description})))
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1)
 assert.equal(results.find(r=>r.status==='rejected').reason.code,'ACTION_REVISION_CONFLICT')
 await assert.rejects(repo.save(a,{...input,operationId:randomUUID(),revision:2,goalId:foreignGoal}),{code:'ACTION_GOAL_IMMUTABLE'})
 await assert.rejects(repo.save(a,{...input,operationId:randomUUID(),revision:2,status:'completed',confirmed:false}),{code:'ACTION_CONFIRMATION_REQUIRED'})
})
test('accounts cannot read, edit, erase or attach actions to another owner goal',async()=>{
 const input=draft();await repo.save(a,input)
 await assert.rejects(repo.read(b,input.id),{code:'NOT_FOUND'})
 await assert.rejects(repo.save(b,{...input,operationId:randomUUID(),revision:1}),{code:'ACTION_REVISION_CONFLICT'})
 await assert.rejects(repo.save(b,draft()),{code:'ACTION_GOAL_UNAVAILABLE'})
 await assert.rejects(repo.remove(b,{id:input.id,operationId:randomUUID(),revision:1,confirmed:true}),{code:'NOT_FOUND'})
 assert.equal((await repo.read(a,input.id)).action.revision,1)
 assert.equal(await transaction(config,b,async db=>(await db.query('select 1 from app_private.coaching_action_items where id=$1',[input.id])).rowCount),0)
})
test('completion and reopening are explicit; proposed steps and inactive goals are not silently accepted',async()=>{
 const input=draft();const first=await repo.save(a,input)
 const done=await repo.save(a,{...input,operationId:randomUUID(),revision:1,status:'completed'})
 assert.ok(done.action.completedAt);assert.equal(done.action.clientConfirmedAt,first.action.clientConfirmedAt)
 assert.equal((await admin.query('select status from app_private.coaching_goals where id=$1',[goal])).rows[0].status,'active')
 const reopened=await repo.save(a,{...input,operationId:randomUUID(),revision:2,status:'active'})
 assert.equal(reopened.action.completedAt,null)
 const proposal=draft({status:'proposed',confirmed:false});await repo.save(a,proposal)
 await assert.rejects(repo.save(a,{...proposal,operationId:randomUUID(),revision:1,status:'completed',confirmed:true}),{code:'INVALID_ACTION_TRANSITION'})
 await admin.query("update app_private.coaching_goals set status='paused' where id=$1",[goal])
 await assert.rejects(repo.save(a,draft()),{code:'ACTION_GOAL_UNAVAILABLE'})
 await admin.query("update app_private.coaching_goals set status='active' where id=$1",[goal])
})
test('a client-authored accepted step can be planned today; completing it retains history without silent carryover',async()=>{
 const input=draft();await repo.save(a,input)
 const daily=createDailyIntentionRepository(config)
 const intention={id:randomUUID(),operationId:randomUUID(),revision:0,localDay:'2026-11-22',timezone:'America/Toronto',weeklyGoalId:goal,actionIds:[input.id],carriedActionIds:[],carryFromDay:null,confirmed:true}
 await daily.save(a,intention)
 await repo.save(a,{...input,operationId:randomUUID(),revision:1,status:'completed'})
 const updated=await daily.save(a,{...intention,operationId:randomUUID(),revision:1})
 assert.deepEqual(updated.intention.actionIds,[input.id])
 await assert.rejects(daily.save(a,{...intention,id:randomUUID(),operationId:randomUUID(),localDay:'2026-11-23'}))
 assert.equal((await repo.read(a,input.id)).action.status,'completed')
})
test('actual Request handler and repository support readback edit erase and owner isolation',async()=>{
 const handle=createPersonalActionHandler({getConfig:()=>config,origin:()=>{},sameOrigin:()=>{},auth:request=>({verified:async()=>request.headers.get('x-hh-account-id')===b.id?b:a,apply:r=>r}),rate:async()=>{},repository:()=>repo})
 const request=(actor,method,body,query='')=>new Request('https://synthetic.test/api/app/personal-actions'+query,{method,headers:{'x-hh-account-id':actor.id,'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})})
 const input=draft();const saved=await handle(request(a,'POST',input));assert.equal(saved.status,200)
 const read=await handle(request(a,'GET',null,'?id='+input.id));assert.equal((await read.json()).action.description,input.description)
 assert.match(read.headers.get('cache-control'),/no-store/)
 assert.equal((await handle(request(b,'GET',null,'?id='+input.id))).status,404)
 assert.equal((await handle(request(a,'PATCH',{...input,revision:1,operationId:randomUUID(),status:'completed'}))).status,200)
 assert.equal((await handle(request(a,'DELETE',{id:input.id,revision:2,operationId:randomUUID(),confirmed:true}))).status,200)
 assert.equal((await handle(request(a,'GET',null,'?id='+input.id))).status,404)
})
test('revision-bound erasure removes ciphertext history and delayed writes cannot resurrect a manual step',async()=>{
 const input=draft();await repo.save(a,input)
 const deletion={id:input.id,revision:1,operationId:randomUUID(),confirmed:true}
 await assert.rejects(repo.remove(a,{...deletion,revision:2}),{code:'ACTION_REVISION_CONFLICT'})
 assert.equal((await repo.remove(a,deletion)).deleted,true)
 assert.equal((await repo.remove(a,deletion)).deleted,true)
 await assert.rejects(repo.read(a,input.id),{code:'NOT_FOUND'})
 assert.equal((await admin.query('select 1 from app_private.coaching_life_plan_changes where entity_id=$1',[input.id])).rowCount,0)
 for(const revision of [0,1])await assert.rejects(repo.save(a,{...input,operationId:randomUUID(),revision}),{code:'ACTION_ERASED'})
})
test('editing imported actions preserves provenance; erasure still prevents report reimport',async()=>{
 const input=draft();await repo.save(a,input)
 const reportId=randomUUID();await admin.query("update app_private.coaching_action_items set source_report_id=$2,source_action_key='synthetic-import' where id=$1",[input.id,reportId])
 const edited=await repo.save(a,{...input,revision:1,operationId:randomUUID(),description:'Client edited wording'})
 assert.equal(edited.action.sourceReportId,reportId)
 await repo.remove(a,{id:input.id,revision:2,operationId:randomUUID(),confirmed:true})
 assert.equal((await admin.query('select 1 from app_private.coaching_erased_action_receipts where account_id=$1',[a.id])).rowCount,4)
})
test('revoked sessions cannot save and account erasure cascades opaque tombstones',async()=>{
 await admin.query('delete from auth.sessions where id=$1',[a.claims.session_id])
 await assert.rejects(repo.save(a,draft()),{code:'SIGN_IN_REQUIRED'})
 // Clear fixture-only dependent tables before testing the production receipt FK.
 for(const table of ['coaching_life_plan_changes','coaching_action_items','coaching_goals','coaching_life_plan_areas','coaching_life_plans'])await admin.query('delete from app_private.'+table+' where account_id=$1',[a.id])
 await admin.query('delete from app.accounts where id=$1',[a.id])
 assert.equal((await admin.query('select 1 from app_private.coaching_erased_action_receipts where account_id=$1',[a.id])).rowCount,0)
})
