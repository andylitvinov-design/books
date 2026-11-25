import test,{before,after} from 'node:test'
import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {readFile} from 'node:fs/promises'
import pg from 'pg'
import {createPersonalGoalRepository} from '../lib/app/daybook-personal-goals.js'
import {closeDatabase,transaction} from '../lib/app/database.js'
import {assertCoachingGoalNotErased} from '../lib/app/coaching-goal-erasure.js'
import {createPersonalGoalHandler} from '../lib/app/daybook-personal-goal-handler.mjs'
import {VECTOR_SPHERES,VECTOR_AXES,VECTOR_SELECTION_LEGACY_VERSION,emptyVectorSelectionDraft,vectorSelectionGoalDraft} from '../lib/app/daybook-vector-selection.mjs'
const url=process.env.HH_GOAL_TEST_DATABASE_URL
if(!url||process.env.VERCEL||process.env.HH_APP_TEST_RUNTIME!=='isolated')throw new Error('ISOLATED_DATABASE_REQUIRED')
const parsed=new URL(url)
if(parsed.hostname!=='127.0.0.1'||parsed.pathname!=='/hh_personal_goal_test')throw new Error('ISOLATED_DATABASE_REQUIRED')
const admin=new pg.Client({connectionString:url}),config={test:true,databaseUrl:url,encryptionKey:Buffer.alloc(32,3),encryptionKeyId:'synthetic'}
const repo=createPersonalGoalRepository(config),a={id:randomUUID(),claims:{}},b={id:randomUUID(),claims:{}}
for(const actor of [a,b])actor.claims={sub:actor.id,session_id:randomUUID()}
const draft=(changes={})=>({id:randomUUID(),operationId:randomUUID(),revision:0,areaKey:'meaning_purpose',title:'Synthetic title',why:'Synthetic reason',obstacles:'Limited synthetic time',desiredOutcome:'A draft manuscript',axes:['self-realization'],status:'active',confirmed:true,targetDate:null,milestones:[],firstStep:'Write 15 minutes',fallbackStep:'Write one line',...changes})
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
 create table app_private.coaching_action_items(id uuid primary key,goal_id uuid references app_private.coaching_goals(id) on delete cascade,account_id uuid,source_report_id uuid,source_action_key text);
 create table app_private.coaching_life_plan_changes(id uuid primary key,plan_id uuid,account_id uuid,entity_kind text,entity_id uuid,from_revision integer,to_revision integer,change_kind text,snapshot_ciphertext text,changed_by text,actor_account_id uuid,created_at timestamptz default now());
 grant usage on schema app,auth,app_private to hh_app_backend;
 grant select,update on app.accounts to hh_app_backend;grant select on auth.sessions to hh_app_backend;
 grant select,insert,update on app_private.coaching_life_plans,app_private.coaching_life_plan_areas,app_private.coaching_goals to hh_app_backend;
 grant select,insert on app_private.coaching_life_plan_changes to hh_app_backend;`)
 for(const table of ['coaching_life_plans','coaching_life_plan_areas','coaching_goals','coaching_life_plan_changes'])await admin.query(`alter table app_private.${table} enable row level security;alter table app_private.${table} force row level security;create policy owner on app_private.${table} for all to hh_app_backend using(account_id=auth.uid() and app_private.account_active()) with check(account_id=auth.uid() and app_private.account_active())`)
 for(const actor of [a,b]){await admin.query("insert into app.accounts values($1,'active','active')",[actor.id]);await admin.query('insert into auth.sessions values($1,$2)',[actor.claims.session_id,actor.id])}
 await admin.query(await readFile(new URL('../supabase/migrations/20261122215422_hh_personal_goal_statuses_20261122.sql',import.meta.url),'utf8'))
 await admin.query(await readFile(new URL('../supabase/migrations/20261110153142_hh_coaching_action_erasure.sql',import.meta.url),'utf8'))
 await admin.query(await readFile(new URL('../supabase/migrations/20261122215436_hh_personal_goal_erasure_20261122.sql',import.meta.url),'utf8'))
})
after(async()=>{await closeDatabase();await admin.end()})
test('creates canonical goal and encrypted audit details, reads back and retries without duplicates',async()=>{
 const input=draft(),saved=await repo.save(a,input)
 assert.equal(saved.goal.why,input.why);assert.equal(saved.goal.obstacles,input.obstacles);assert.equal(saved.goal.revision,1)
 assert.deepEqual((await repo.read(a,input.id)).goal,saved.goal)
 assert.equal((await repo.save(a,input)).replayed,true)
 const raw=(await admin.query('select g.title_ciphertext,c.snapshot_ciphertext from app_private.coaching_goals g join app_private.coaching_life_plan_changes c on c.entity_id=g.id where g.id=$1',[input.id])).rows
 assert.equal(raw.length,1);assert.equal(JSON.stringify(raw).includes(input.title),false);assert.equal(JSON.stringify(raw).includes(input.why),false);assert.equal(JSON.stringify(raw).includes(input.obstacles),false)
 await assert.rejects(repo.save(a,{...input,title:'changed retry'}),{code:'GOAL_IDEMPOTENCY_CONFLICT'})
})
test('concurrent edits have one winner; stale request cannot report new content as saved',async()=>{
 const input=draft();await repo.save(a,input)
 const results=await Promise.allSettled([1,2].map(n=>repo.save(a,{...input,operationId:randomUUID(),revision:1,title:'edit '+n})))
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1)
 assert.equal(results.find(r=>r.status==='rejected').reason.code,'GOAL_REVISION_CONFLICT')
 await assert.rejects(repo.save(a,input),{code:'GOAL_REVISION_ADVANCED'})
})
test('owner isolation and explicit completion hold through real transactions',async()=>{
 const input=draft();await repo.save(a,input)
 await assert.rejects(repo.read(b,input.id),{code:'NOT_FOUND'})
 await assert.rejects(repo.save(b,{...input,revision:1,operationId:randomUUID()}),{code:'GOAL_REVISION_CONFLICT'})
 await assert.rejects(repo.save(a,{...input,revision:1,operationId:randomUUID(),status:'completed',confirmed:false}),{code:'GOAL_CONFIRMATION_REQUIRED'})
 assert.equal((await repo.save(a,{...input,revision:1,operationId:randomUUID(),status:'completed'})).goal.status,'completed')
})
test('expanded statuses and deadline persist through canonical table and validated audit',async()=>{
 const input=draft({status:'accepted',targetDate:'2028-02-29'})
 const first=await repo.save(a,input);assert.equal(first.goal.status,'accepted');assert.equal(first.goal.targetDate,'2028-02-29')
 const next=await repo.save(a,{...input,revision:1,operationId:randomUUID(),status:'deferred'})
 assert.equal(next.goal.status,'deferred')
 await assert.rejects(admin.query("update app_private.coaching_goals set status='ai_completed' where id=$1",[input.id]),{code:'23514'})
})
test('goal erasure is owner-only, revision checked, retryable and blocks resurrection',async()=>{
 const input=draft();await repo.save(a,input)
 const actionId=randomUUID(),reportId=randomUUID()
 await admin.query('insert into app_private.coaching_action_items values($1,$2,$3,$4,$5)',[actionId,input.id,a.id,reportId,'synthetic-action'])
 const removal={id:input.id,revision:1,operationId:randomUUID(),confirmed:true}
 await assert.rejects(repo.remove(b,removal))
 await assert.rejects(repo.remove(a,{...removal,revision:2}))
 assert.equal((await repo.remove(a,removal)).deleted,true)
 assert.equal((await repo.remove(a,removal)).deleted,true)
 await assert.rejects(repo.read(a,input.id),{code:'NOT_FOUND'})
 await assert.rejects(repo.save(a,input),{code:'GOAL_ERASED'})
 assert.equal((await admin.query("select 1 from app_private.coaching_life_plan_changes where entity_kind='goal' and entity_id=$1",[input.id])).rowCount,0)
 const receipt=(await admin.query('select * from app_private.coaching_erased_goal_receipts where account_id=$1 and goal_id=$2',[a.id,input.id])).rows[0]
 assert.ok(receipt);assert.equal(JSON.stringify(receipt).includes(input.title),false)
 assert.equal((await admin.query('select 1 from app_private.coaching_action_items where id=$1',[actionId])).rowCount,0)
 assert.equal((await admin.query('select 1 from app_private.coaching_erased_action_receipts where account_id=$1',[a.id])).rowCount,1)
 await assert.rejects(transaction(config,a,db=>assertCoachingGoalNotErased(db,a,input.id)),{code:'COACHING_PLAN_GOAL_DELETED'})
 await transaction(config,b,db=>assertCoachingGoalNotErased(db,b,input.id))
})
test('legacy goal without extended snapshot stays readable and can be explicitly edited',async()=>{
 const input=draft({targetDate:'2028-02-29'});await repo.save(a,input)
 await admin.query("delete from app_private.coaching_life_plan_changes where account_id=$1 and entity_kind='goal' and entity_id=$2",[a.id,input.id])
 const legacy=await repo.read(a,input.id)
 assert.equal(legacy.goal.title,input.title);assert.equal(legacy.goal.details,null)
 assert.equal(legacy.goal.targetDate,'2028-02-29')
 const edited=await repo.save(a,{...input,operationId:randomUUID(),revision:1,why:'New owner-authored details'})
 assert.equal(edited.goal.why,'New owner-authored details');assert.equal(edited.goal.revision,2)
})
test('canonical deadline drift cannot be reported as the encrypted saved revision',async()=>{
 const input=draft({targetDate:'2028-02-29'});await repo.save(a,input)
 await admin.query("update app_private.coaching_goals set target_date='2028-03-01' where id=$1",[input.id])
 await assert.rejects(repo.read(a,input.id),{code:'PRIVATE_DATA_UNAVAILABLE'})
})
test('actual Request handler round-trips create/read/edit/delete through real repository and PostgreSQL',async()=>{
 const handler=actor=>createPersonalGoalHandler({getConfig:()=>config,origin:()=>{},sameOrigin:()=>{},auth:()=>({verified:async()=>actor,apply:r=>r}),rate:async()=>{},repository:createPersonalGoalRepository})
 const request=(actor,method,body,query='')=>new Request('http://127.0.0.1/api/app/personal-goals'+query,{method,headers:{'x-hh-account-id':actor.id,'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})})
 const input=draft(),run=handler(a)
 const created=await run(request(a,'POST',input));assert.equal(created.status,200)
 assert.equal((await created.json()).goal.why,input.why)
 const read=await run(request(a,'GET',null,'?id='+input.id));assert.equal(read.status,200)
 assert.equal((await read.json()).goal.revision,1)
 const foreign=await handler(b)(request(b,'GET',null,'?id='+input.id));assert.equal(foreign.status,404)
 const edited=await run(request(a,'PATCH',{...input,operationId:randomUUID(),revision:1,title:'HTTP edit'}));assert.equal(edited.status,200)
 const stale=await run(request(a,'DELETE',{id:input.id,operationId:randomUUID(),revision:1,confirmed:true}));assert.equal(stale.status,409)
 const deleted=await run(request(a,'DELETE',{id:input.id,operationId:randomUUID(),revision:2,confirmed:true}));assert.equal(deleted.status,200)
 assert.equal((await deleted.json()).deleted,true)
 assert.equal((await run(request(a,'GET',null,'?id='+input.id))).status,404)
})

test('stage-zero goal and complete 4+8 origin persist atomically, replay once and survive legacy edits',async()=>{
 const selection=emptyVectorSelectionDraft(randomUUID(),VECTOR_SELECTION_LEGACY_VERSION)
 for(const [track,items] of [['spheres',VECTOR_SPHERES],['axes',VECTOR_AXES]])for(const item of items)selection[track][item.id]={current:'0',desired:'8'}
 Object.assign(selection,{sphereId:'work',axisId:'freedom',statement:'Synthetic stage-zero income direction',why:'Synthetic values'})
 const input={...vectorSelectionGoalDraft(selection,'2026-11-23T23:00:00.000Z'),operationId:randomUUID()}
 const results=await Promise.all([repo.save(a,input),repo.save(a,input)])
 assert.equal(results.filter(result=>result.replayed).length,1)
 const reopened=createPersonalGoalRepository(config),saved=(await reopened.read(a,input.id)).goal
 assert.equal(saved.title,selection.statement);assert.deepEqual(saved.vectorSelection,input.vectorSelection)
 assert.equal(saved.vectorSelection.spheres.body.current,0);assert.equal(saved.revision,1)
 const raw=(await admin.query("select g.title_ciphertext,c.snapshot_ciphertext from app_private.coaching_goals g join app_private.coaching_life_plan_changes c on c.entity_id=g.id where g.account_id=$1 and g.id=$2",[a.id,input.id])).rows
 assert.equal(raw.length,1);assert.equal(JSON.stringify(raw).includes(selection.statement),false)
 assert.equal(JSON.stringify(raw).includes('hh-daybook-vector-selection-v1'),false)
 await assert.rejects(reopened.read(b,input.id),{code:'NOT_FOUND'})
 const legacyEdit={...input,revision:1,operationId:randomUUID(),title:'Synthetic refined goal'};delete legacyEdit.vectorSelection
 const edited=await repo.save(a,legacyEdit)
 assert.deepEqual(edited.goal.vectorSelection,saved.vectorSelection);assert.equal(edited.goal.title,legacyEdit.title)
 assert.equal((await repo.save(a,legacyEdit)).replayed,true)
 assert.deepEqual((await reopened.read(a,input.id)).goal.vectorSelection,saved.vectorSelection)
 await assert.rejects(repo.save(a,{...input,revision:2,operationId:randomUUID(),vectorSelection:{...input.vectorSelection,axisId:'love'}}),{code:'GOAL_VECTOR_ORIGIN_IMMUTABLE'})
 assert.equal((await reopened.read(a,input.id)).goal.revision,2)
 const invalid={...input,id:randomUUID(),operationId:randomUUID(),vectorSelection:{...input.vectorSelection,spheres:{}}}
 await assert.rejects(repo.save(a,invalid),{code:'INVALID_GOAL_VECTOR'})
 assert.equal((await admin.query('select 1 from app_private.coaching_goals where id=$1',[invalid.id])).rowCount,0)
})
