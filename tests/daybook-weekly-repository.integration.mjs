import test,{before,after} from 'node:test'
import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {readFile} from 'node:fs/promises'
import pg from 'pg'
import {initializeCanonicalDaybookSchema} from './helpers/daybook-canonical-schema.mjs'
import {createWeeklyReviewRepository} from '../lib/app/daybook-weekly.js'
import {createPersonalGoalRepository} from '../lib/app/daybook-personal-goals.js'
import {createPersonalActionRepository} from '../lib/app/daybook-personal-actions.js'
import {createDailyIntentionRepository} from '../lib/app/daybook-daily.js'
import {createDaybookJournalRepository} from '../lib/app/daybook-journal.js'
import {closeDatabase,transaction} from '../lib/app/database.js'
const url=process.env.HH_WEEKLY_TEST_DATABASE_URL
if(!url||process.env.VERCEL||process.env.HH_APP_TEST_RUNTIME!=='isolated')throw Error('ISOLATED_DATABASE_REQUIRED')
const parsed=new URL(url)
if(!['postgres:','postgresql:'].includes(parsed.protocol)||parsed.hostname!=='127.0.0.1'||parsed.pathname!=='/hh_daybook_weekly_test'||parsed.search||parsed.hash||!['55419','5432'].includes(parsed.port))throw Error('ISOLATED_DATABASE_REQUIRED')
if(parsed.port==='5432'&&(process.env.CI!=='true'||process.env.GITHUB_ACTIONS!=='true'||process.env.NODE_ENV!=='test'||url!=='postgres://postgres:synthetic-ci-admin@127.0.0.1:5432/hh_daybook_weekly_test'))throw Error('ISOLATED_DATABASE_REQUIRED')
const admin=new pg.Client({connectionString:url}),config={test:true,databaseUrl:url,encryptionKey:Buffer.alloc(32,5),encryptionKeyId:'synthetic'}
const repo=createWeeklyReviewRepository(config),goals=createPersonalGoalRepository(config),actions=createPersonalActionRepository(config),daily=createDailyIntentionRepository(config),journal=createDaybookJournalRepository(config)
const a={id:randomUUID()},b={id:randomUUID()};for(const actor of [a,b])actor.claims={sub:actor.id,session_id:randomUUID()}
const goal={id:randomUUID(),operationId:randomUUID(),revision:0,areaKey:'meaning_purpose',title:'Synthetic weekly goal',why:'My reason',obstacles:'Low energy',desiredOutcome:'A manuscript',axes:[],status:'accepted',confirmed:true,targetDate:null,milestones:[],firstStep:'15 minutes',fallbackStep:'One line'}
const step={id:randomUUID(),goalId:goal.id,operationId:randomUUID(),revision:0,description:'Synthetic weekly step',timing:'',trigger:'',obstacle:'',fallback:'',feasibilityScore:null,dueAt:null,status:'accepted',confirmed:true}
const day={id:randomUUID(),operationId:randomUUID(),revision:0,localDay:'2026-11-16',timezone:'America/Toronto',weeklyGoalId:goal.id,actionIds:[step.id],carriedActionIds:[],carryFromDay:null,confirmed:true}
const entry={id:randomUUID(),operationId:randomUUID(),revision:0,text:'Synthetic private source entry',tags:[],kind:'note',locale:'en',timezone:'America/Toronto',localDay:'2026-11-17',goalId:goal.id}
const previewInput={weekStart:'2026-11-16',timezone:'America/Toronto',dayIds:null,journalIds:[entry.id],nextGoalId:goal.id}
const draft=(preview,extra={})=>({id:randomUUID(),operationId:randomUUID(),revision:0,weekStart:preview.weekStart,timezone:preview.timezone,sourceDays:preview.sourceDays,sourceJournal:preview.sourceJournal,sourceActions:preview.sourceActions,nextGoalId:preview.nextGoalId,wins:'Synthetic private weekly win',learning:'What helped',obstacles:'Low energy',adjustment:'A smaller step',nextWeekFocus:'Continue gently',confirmed:true,...extra})
before(async()=>{
 await admin.connect();await initializeCanonicalDaybookSchema(admin)
 await admin.query(await readFile(new URL('../supabase/migrations/20261123002551_hh_daybook_weekly_reviews_20261123.sql',import.meta.url),'utf8'))
 for(const actor of [a,b]){await admin.query("insert into app.accounts values($1,'active','active')",[actor.id]);await admin.query('insert into auth.sessions values($1,$2)',[actor.claims.session_id,actor.id])}
 await goals.save(a,goal);await actions.save(a,step);await daily.save(a,day);await journal.save(a,entry)
})
after(async()=>{await closeDatabase();await admin.end()})
let initial,saved
test('preview reads only the owner week and explicitly selected sources without copying private wording',async()=>{
 const preview=await repo.preview(a,previewInput)
 assert.equal(preview.sourceDays.length,1);assert.equal(preview.sourceJournal.length,1);assert.equal(preview.sourceActions.length,1)
 assert.equal(preview.sources.summary.plannedActions,1)
 assert.equal(JSON.stringify(preview).includes(entry.text),false);assert.equal(JSON.stringify(preview).includes(step.description),false)
 const empty=await repo.preview(a,{...previewInput,weekStart:'2026-11-23',journalIds:[],nextGoalId:null})
 assert.equal(empty.sources.summary.plannedActions,0)
 await assert.rejects(repo.preview(a,{...previewInput,weekStart:'2026-11-23'}))
})
test('review saves encrypted content with independent readback, idempotency and one review per week',async()=>{
 initial=draft(await repo.preview(a,previewInput));saved=await repo.save(a,initial)
 assert.equal(saved.review.revision,1);assert.deepEqual((await repo.read(a,initial.id)).review,saved.review)
 assert.equal((await repo.save(a,initial)).replayed,true)
 await assert.rejects(repo.save(a,{...initial,wins:'Changed retry'}),{code:'WEEKLY_IDEMPOTENCY_CONFLICT'})
 const raw=(await admin.query('select payload_ciphertext from app_private.daybook_weekly_reviews where id=$1',[initial.id])).rows[0]
 assert.equal(raw.payload_ciphertext.includes(initial.wins),false)
 await assert.rejects(repo.save(a,{...initial,id:randomUUID(),operationId:randomUUID()}),{code:'WEEKLY_REVISION_CONFLICT'})
})
test('changed journal/day/action sources require a refreshed confirmed preview',async()=>{
 const preview=await repo.preview(a,previewInput)
 await journal.save(a,{...entry,revision:1,operationId:randomUUID(),text:'Updated source'})
 await assert.rejects(repo.save(a,draft(preview,{id:initial.id,revision:1})),{code:'WEEKLY_SOURCE_CHANGED'})
 const refreshed=await repo.preview(a,previewInput)
 await actions.save(a,{...step,revision:1,operationId:randomUUID(),status:'completed'})
 await assert.rejects(repo.save(a,draft(refreshed,{id:initial.id,revision:1})),{code:'WEEKLY_SOURCE_CHANGED'})
 const current=await repo.preview(a,previewInput)
 assert.equal(current.sources.summary.completed,1)
})
test('CAS edits have one winner and advanced receipts cannot acknowledge stale content',async()=>{
 const input=draft(await repo.preview(a,previewInput),{id:initial.id,revision:1})
 const results=await Promise.allSettled([repo.save(a,input),repo.save(a,{...input,operationId:randomUUID(),wins:'Other device'})])
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1)
 assert.equal(results.find(r=>r.status==='rejected').reason.code,'WEEKLY_REVISION_CONFLICT')
 await assert.rejects(repo.save(a,initial),{code:'WEEKLY_REVISION_ADVANCED'})
})
test('saved progress is a frozen as-of snapshot when the canonical step is later reopened',async()=>{
 const before=(await repo.read(a,initial.id)).review
 assert.equal(before.sources.summary.completed,1)
 await actions.save(a,{...step,revision:2,operationId:randomUUID(),status:'active'})
 assert.deepEqual((await repo.read(a,initial.id)).review,before)
 assert.equal((await repo.preview(a,previewInput)).sources.summary.open,1)
 const list=await repo.list(a,{limit:1});assert.equal(list.reviews[0].id,initial.id)
 assert.equal((await repo.byWeek(a,'2026-11-16')).review.id,initial.id)
})
test('second account cannot read, update, delete or attach private sources',async()=>{
 await assert.rejects(repo.read(b,initial.id),{code:'NOT_FOUND'})
 assert.deepEqual(await repo.list(b,{}),{reviews:[],nextCursor:null})
 await assert.rejects(repo.preview(b,previewInput))
 await assert.rejects(repo.remove(b,{id:initial.id,revision:2,operationId:randomUUID(),confirmed:true}))
 assert.equal(await transaction(config,b,async db=>(await db.query('select 1 from app_private.daybook_weekly_reviews')).rowCount),0)
})
test('confirmed revision-bound erasure retries safely, blocks resurrection and preserves source data',async()=>{
 const deletion={id:initial.id,revision:2,operationId:randomUUID(),confirmed:true}
 await assert.rejects(repo.remove(a,{...deletion,revision:1}),{code:'WEEKLY_REVISION_CONFLICT'})
 await repo.remove(a,deletion);assert.equal((await repo.remove(a,deletion)).replayed,true)
 await assert.rejects(repo.read(a,initial.id),{code:'NOT_FOUND'})
 await assert.rejects(repo.save(a,initial),{code:'WEEKLY_REVIEW_DELETED'})
 assert.equal((await journal.read(a,entry.id)).entry.text,'Updated source')
 assert.equal((await daily.read(a,day.id)).intention.id,day.id)
})
test('maximum escaped reflections save through real ciphertext constraints without truncation',async()=>{
 const preview=await repo.preview(a,{...previewInput,weekStart:'2026-11-23',journalIds:[],nextGoalId:null})
 const input=draft(preview,Object.fromEntries(['wins','learning','obstacles','adjustment','nextWeekFocus'].map(key=>[key,'\u0001'.repeat(2000)])))
 const result=await repo.save(a,input)
 assert.equal(result.review.wins,input.wins)
 const size=(await admin.query('select octet_length(payload_ciphertext) as size from app_private.daybook_weekly_reviews where id=$1',[input.id])).rows[0].size
 assert.ok(size>65536&&size<=131072)
 assert.equal((await repo.read(a,input.id)).review.nextWeekFocus,input.nextWeekFocus)
})
test('revoked sessions fail and real account cascade removes weekly content and metadata receipts',async()=>{
 const input=draft(await repo.preview(a,previewInput));await repo.save(a,input)
 await admin.query('delete from auth.sessions where id=$1',[a.claims.session_id])
 await assert.rejects(repo.read(a,input.id),{code:'SIGN_IN_REQUIRED'})
 await admin.query('delete from app.accounts where id=$1',[a.id])
 for(const table of ['daybook_weekly_reviews','daybook_weekly_receipts'])assert.equal((await admin.query('select 1 from app_private.'+table+' where account_id=$1',[a.id])).rowCount,0)
})
