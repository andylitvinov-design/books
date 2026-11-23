// Full canonical coaching DDL on a new disposable database; auth/account fixtures are synthetic.
import test,{before,after} from 'node:test'
import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {initializeCanonicalDaybookSchema} from './helpers/daybook-canonical-schema.mjs'
import pg from 'pg'
import {createPersonalGoalRepository} from '../lib/app/daybook-personal-goals.js'
import {createPersonalActionRepository} from '../lib/app/daybook-personal-actions.js'
import {createDailyIntentionRepository} from '../lib/app/daybook-daily.js'
import {createDaybookJournalRepository} from '../lib/app/daybook-journal.js'
import {readCoachingLifePlan,exportCoachingLifePlan} from '../lib/app/coaching-life-plan.js'
import {closeDatabase,transaction} from '../lib/app/database.js'
const url=process.env.HH_DAYBOOK_SCHEMA_TEST_DATABASE_URL
if(!url||process.env.VERCEL||process.env.HH_APP_TEST_RUNTIME!=='isolated')throw Error('ISOLATED_DATABASE_REQUIRED')
const parsed=new URL(url)
if(!['postgres:','postgresql:'].includes(parsed.protocol)||parsed.hostname!=='127.0.0.1'||parsed.pathname!=='/hh_daybook_schema_test'||parsed.search||parsed.hash||!['55419','5432'].includes(parsed.port))throw Error('ISOLATED_DATABASE_REQUIRED')
if(parsed.port==='5432'&&(process.env.CI!=='true'||process.env.GITHUB_ACTIONS!=='true'||process.env.NODE_ENV!=='test'||url!=='postgres://postgres:synthetic-ci-admin@127.0.0.1:5432/hh_daybook_schema_test'))throw Error('ISOLATED_DATABASE_REQUIRED')
const admin=new pg.Client({connectionString:url}),config={test:true,databaseUrl:url,encryptionKey:Buffer.alloc(32,4),encryptionKeyId:'synthetic'}
const goals=createPersonalGoalRepository(config),actions=createPersonalActionRepository(config),daily=createDailyIntentionRepository(config),journal=createDaybookJournalRepository(config)
const a={id:randomUUID()},b={id:randomUUID()}
for(const actor of [a,b])actor.claims={sub:actor.id,session_id:randomUUID()}
const goalDraft=(changes={})=>({id:randomUUID(),operationId:randomUUID(),revision:0,areaKey:'meaning_purpose',title:'Synthetic canonical goal',why:'Synthetic reason',obstacles:'Synthetic lack of time',desiredOutcome:'A manuscript',axes:['self-realization'],status:'accepted',confirmed:true,targetDate:'2026-12-15',milestones:[],firstStep:'Write for 15 minutes',fallbackStep:'Write one line',...changes})
const actionDraft=(goalId,changes={})=>({id:randomUUID(),goalId,operationId:randomUUID(),revision:0,description:'Synthetic canonical step',timing:'After breakfast',trigger:'Open notebook',obstacle:'Low energy',fallback:'One line',feasibilityScore:7,dueAt:null,status:'accepted',confirmed:true,...changes})
before(async()=>{
 await admin.connect()
 await initializeCanonicalDaybookSchema(admin)
 for(const actor of [a,b]){await admin.query("insert into app.accounts values($1,'active','active')",[actor.id]);await admin.query('insert into auth.sessions values($1,$2)',[actor.claims.session_id,actor.id])}
})
after(async()=>{await closeDatabase();await admin.end()})
let goal,step,intention,entry
test('canonical DDL accepts full goal/action CRUD and preserves encrypted personal wording',async()=>{
 goal=goalDraft();step=actionDraft(goal.id)
 assert.equal((await goals.save(a,goal)).goal.obstacles,goal.obstacles)
 assert.equal((await actions.save(a,step)).action.description,step.description)
 assert.equal((await goals.read(a,goal.id)).goal.targetDate,'2026-12-15')
 assert.equal((await admin.query('select description_ciphertext from app_private.coaching_action_items where id=$1',[step.id])).rows[0].description_ciphertext.includes(step.description),false)
})
test('existing canonical Life Plan reader and export include the new owner-authored records',async()=>{
 const plan=await readCoachingLifePlan(config,a,{locale:'en'})
 assert.equal(plan.goals.find(x=>x.id===goal.id).title,goal.title)
 assert.equal(plan.actions.find(x=>x.id===step.id).obstacle,step.obstacle)
 const exported=await exportCoachingLifePlan(config,a)
 assert.equal(exported.goals.length,1);assert.equal(exported.actions.length,1)
 assert.equal(JSON.stringify(exported).includes(goal.obstacles),true)
})
test('same canonical goal and step participate in encrypted Today and goal-linked journal records',async()=>{
 intention={id:randomUUID(),operationId:randomUUID(),revision:0,localDay:'2026-11-22',timezone:'America/Toronto',weeklyGoalId:goal.id,actionIds:[step.id],carriedActionIds:[],carryFromDay:null,confirmed:true}
 entry={id:randomUUID(),operationId:randomUUID(),revision:0,text:'Synthetic reflection',tags:[],kind:'note',locale:'en',timezone:'America/Toronto',localDay:'2026-11-22',goalId:goal.id}
 await daily.save(a,intention);await journal.save(a,entry)
 assert.deepEqual((await daily.byDay(a,intention.localDay)).intention.actionIds,[step.id])
 assert.equal((await journal.read(a,entry.id)).entry.goalId,goal.id)
})
test('real canonical RLS and grants deny the second account and direct public access',async()=>{
 for(const [repo,id] of [[goals,goal.id],[actions,step.id],[daily,intention.id],[journal,entry.id]])await assert.rejects(repo.read(b,id),{code:'NOT_FOUND'})
 for(const table of ['coaching_goals','coaching_action_items','coaching_life_plan_changes'])assert.equal(await transaction(config,b,async db=>(await db.query('select 1 from app_private.'+table)).rowCount),0)
 const grants=(await admin.query("select has_table_privilege('anon','app_private.coaching_goals','select') as anon,has_table_privilege('authenticated','app_private.daybook_daily_intentions','select') as authenticated")).rows[0]
 assert.equal(grants.anon,false);assert.equal(grants.authenticated,false)
})
test('completion retains saved-day history without completing the parent or mutating earlier choices',async()=>{
 await actions.save(a,{...step,revision:1,operationId:randomUUID(),status:'completed'})
 assert.equal((await goals.read(a,goal.id)).goal.status,'accepted')
 assert.deepEqual((await daily.read(a,intention.id)).intention.actionIds,[step.id])
 await assert.rejects(daily.save(a,{...intention,id:randomUUID(),operationId:randomUUID(),localDay:'2026-11-23'}),{code:'DAYBOOK_ACTION_UNAVAILABLE'})
})
test('real goal erasure removes action ciphertext/audit, blocks resurrection and preserves unrelated private records',async()=>{
 await goals.remove(a,{id:goal.id,revision:1,operationId:randomUUID(),confirmed:true})
 await assert.rejects(goals.save(a,{...goal,operationId:randomUUID()}),{code:'GOAL_ERASED'})
 await assert.rejects(actions.save(a,{...step,operationId:randomUUID()}),{code:'ACTION_ERASED'})
 assert.equal((await admin.query('select 1 from app_private.coaching_life_plan_changes where account_id=$1',[a.id])).rowCount,0)
 assert.equal((await journal.read(a,entry.id)).entry.text,entry.text)
 assert.equal((await daily.read(a,intention.id)).intention.weeklyGoalId,goal.id)
})
test('revoked and inactive accounts fail closed under canonical policies',async()=>{
 await admin.query("update app.accounts set status='suspended' where id=$1",[b.id])
 await assert.rejects(goals.save(b,goalDraft()),{code:'ACCOUNT_REQUIRED'})
 await admin.query('delete from auth.sessions where id=$1',[a.claims.session_id])
 await assert.rejects(journal.read(a,entry.id),{code:'SIGN_IN_REQUIRED'})
})
test('actual canonical cascades erase all remaining owner data and non-content receipts',async()=>{
 await admin.query('delete from app.accounts where id=$1',[a.id])
 for(const table of ['coaching_life_plans','coaching_life_plan_areas','coaching_goals','coaching_action_items','coaching_life_plan_changes','coaching_erased_action_receipts','coaching_erased_goal_receipts','daybook_entries','daybook_daily_intentions','daybook_daily_receipts'])assert.equal((await admin.query('select 1 from app_private.'+table+' where account_id=$1',[a.id])).rowCount,0,table)
})
