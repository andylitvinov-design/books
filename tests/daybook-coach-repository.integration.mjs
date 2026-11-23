import test,{before,after} from 'node:test'
import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {readFile} from 'node:fs/promises'
import pg from 'pg'
import {initializeCanonicalDaybookSchema} from './helpers/daybook-canonical-schema.mjs'
import {createDaybookJournalRepository} from '../lib/app/daybook-journal.js'
import {createPersonalGoalRepository} from '../lib/app/daybook-personal-goals.js'
import {createDaybookCoachRepository} from '../lib/app/daybook-coach.js'
import {issueCoachContextSession} from '../lib/app/coach-context-session.js'
import {manageCoachContextConsent,buildCoachContextSnapshot,coachContextConsentOptions} from '../lib/app/coach-context-snapshot.js'
import {appendCoachContextGrant} from '../lib/coaching/context-cloud-grant-writer.mjs'
import {closeDatabase,transaction} from '../lib/app/database.js'
const url=process.env.HH_DAYBOOK_COACH_TEST_DATABASE_URL
if(!url||process.env.VERCEL||process.env.HH_APP_TEST_RUNTIME!=='isolated')throw Error('ISOLATED_DATABASE_REQUIRED')
const parsed=new URL(url)
if(!['postgres:','postgresql:'].includes(parsed.protocol)||parsed.hostname!=='127.0.0.1'||parsed.pathname!=='/hh_daybook_coach_test'||parsed.search||parsed.hash||!['55419','5432'].includes(parsed.port))throw Error('ISOLATED_DATABASE_REQUIRED')
if(parsed.port==='5432'&&(process.env.CI!=='true'||process.env.GITHUB_ACTIONS!=='true'||process.env.NODE_ENV!=='test'||url!=='postgres://postgres:synthetic-ci-admin@127.0.0.1:5432/hh_daybook_coach_test'))throw Error('ISOLATED_DATABASE_REQUIRED')
const admin=new pg.Client({connectionString:url}),config={test:true,databaseUrl:url,encryptionKey:Buffer.alloc(32,7),encryptionKeyId:'synthetic'}
const journal=createDaybookJournalRepository(config),goals=createPersonalGoalRepository(config),handoff=createDaybookCoachRepository(config)
const a={id:randomUUID()},b={id:randomUUID()}
for(const actor of [a,b])actor.claims={sub:actor.id,session_id:randomUUID()}
const env={HH_COACH_CONTEXT_ENABLED:'true',HH_COACH_CONTEXT_GROQ_POLICY:'synthetic',
 HH_COACH_CONTEXT_GROQ_NOTICE_EN:'Synthetic review notice',HH_COACH_CONTEXT_GROQ_NOTICE_RU:'Синтетическое уведомление',HH_COACH_CONTEXT_GROQ_NOTICE_ES:'Aviso sintético'}
const session=issueCoachContextSession(config,a),otherSession=issueCoachContextSession(config,a),bSession=issueCoachContextSession(config,b)
const entry={id:randomUUID(),operationId:randomUUID(),revision:0,text:'I will walk today. Private unrelated detail.',tags:[],kind:'note',locale:'en',timezone:'UTC',localDay:'2026-11-23',goalId:null}
const goal={id:randomUUID(),operationId:randomUUID(),revision:0,areaKey:'body_health',title:'A short daily walk',why:'My reason',obstacles:'Little time',desiredOutcome:'More movement',axes:[],status:'accepted',confirmed:true,targetDate:null,milestones:[],firstStep:'Five minutes',fallbackStep:'One minute'}
const reviewInput={operation:'review',provider:'groq',category:'journal_excerpt',itemId:entry.id,topicKey:'body_health',excerpt:{revision:1,start:0,end:18},contextSessionToken:session.token}
const grantInput=preview=>({...reviewInput,operation:'grant',confirmed:true,sourceRevision:preview.item.sourceRevision,policyVersion:preview.policyVersion,reviewToken:preview.reviewToken})
const snapshot=(actor=a,selected=session,policyVersion=preview.policyVersion)=>buildCoachContextSnapshot(config,actor,{
 role:'coach',provider:'groq',policyVersion,topicKey:'body_health',sessionId:selected.sessionId,sessionOnly:true,includeJournal:true,accountWideOnly:false})
let preview,ticket
before(async()=>{
 await admin.connect();await initializeCanonicalDaybookSchema(admin)
 for(const file of ['20261120190000_hh_context_cloud_grants.sql','20261123023514_hh_daybook_coach_excerpt_consent_20261123.sql'])
  await admin.query(await readFile(new URL('../supabase/migrations/'+file,import.meta.url),'utf8'))
 for(const actor of [a,b]){
  await admin.query("insert into app.accounts values($1,'active','active')",[actor.id])
  await admin.query('insert into auth.sessions values($1,$2)',[actor.claims.session_id,actor.id])
 }
 await journal.save(a,entry);await goals.save(a,goal)
})
after(async()=>{await closeDatabase();await admin.end()})
test('saved journal and accepted canonical goal open only as encrypted locators for one owner and coach',async()=>{
 ticket=await handoff.handle(a,{operation:'issue',kind:'journal',itemId:entry.id,revision:1,coachId:'mira'})
 const resolved=await handoff.handle(a,{operation:'resolve',token:ticket.token,coachId:'mira',contextSessionToken:session.token})
 assert.equal(resolved.source.text,entry.text)
 const goalTicket=await handoff.handle(a,{operation:'issue',kind:'goal',itemId:goal.id,revision:1,coachId:'mira'})
 assert.equal((await handoff.handle(a,{operation:'resolve',token:goalTicket.token,coachId:'mira',contextSessionToken:session.token})).source.text,goal.title)
 const goalReview=await manageCoachContextConsent(config,a,{operation:'review',provider:'groq',category:'goals',itemId:goal.id,topicKey:'body_health',contextSessionToken:session.token},env)
 assert.equal(goalReview.item.text,goal.title)
 assert.equal((await admin.query('select 1 from app_private.context_cloud_grants')).rowCount,0)
})
test('review alone grants nothing; explicit review-bound confirmation stores metadata and projects only the exact excerpt',async()=>{
 preview=await manageCoachContextConsent(config,a,reviewInput,env)
 assert.equal(preview.item.text,'I will walk today.')
 assert.deepEqual((await snapshot()).items,[])
 await manageCoachContextConsent(config,a,grantInput(preview),env)
 assert.deepEqual((await snapshot()).items,[{kind:'journal_excerpt',sourceKind:'selected_daybook_excerpt',text:'I will walk today.'}])
 const raw=(await admin.query('select row_to_json(g)::text as data from app_private.context_cloud_grants g')).rows.map(r=>r.data).join('')
 assert.equal(raw.includes(entry.text),false);assert.equal(raw.includes('I will walk today.'),false)
})
test('second account cannot resolve, review, grant or select the first account source or grant ledger',async()=>{
 await assert.rejects(handoff.handle(b,{operation:'resolve',token:ticket.token,coachId:'mira',contextSessionToken:bSession.token}))
 await assert.rejects(manageCoachContextConsent(config,b,{...reviewInput,contextSessionToken:bSession.token},env),{code:'CONTEXT_ITEM_UNAVAILABLE'})
 await assert.rejects(manageCoachContextConsent(config,b,{...grantInput(preview),contextSessionToken:bSession.token},env))
 assert.deepEqual((await snapshot(b,bSession)).items,[])
 assert.equal(await transaction(config,b,async db=>(await db.query('select 1 from app_private.context_cloud_grants')).rowCount),0)
})
test('account-wide grants, unreviewed ranges, another session, policy change and expired session fail closed',async()=>{
 await assert.rejects(manageCoachContextConsent(config,a,{...reviewInput,contextSessionToken:undefined},env),{code:'CONTEXT_SESSION_INVALID'})
 await assert.rejects(manageCoachContextConsent(config,a,{...grantInput(preview),excerpt:{revision:1,start:1,end:18}},env),{code:'CONTEXT_REVIEW_REQUIRED'})
 await assert.rejects(manageCoachContextConsent(config,a,{...grantInput(preview),contextSessionToken:otherSession.token},env),{code:'CONTEXT_REVIEW_REQUIRED'})
 const expired=issueCoachContextSession(config,a,Date.now()-5*3600000)
 await assert.rejects(manageCoachContextConsent(config,a,{...reviewInput,contextSessionToken:expired.token},env),{code:'CONTEXT_SESSION_INVALID'})
 assert.deepEqual((await snapshot(a,otherSession)).items,[])
 assert.deepEqual((await snapshot(a,session,'changed-policy')).items,[])
})
test('item withdrawal excludes provider context immediately and invalidates the previous review proof even with flags off',async()=>{
 await manageCoachContextConsent(config,a,{operation:'revoke',provider:'groq',category:'journal_excerpt',itemId:entry.id,contextSessionToken:session.token},{})
 assert.deepEqual((await snapshot()).items,[])
 await assert.rejects(manageCoachContextConsent(config,a,grantInput(preview),env),{code:'CONTEXT_REVIEW_REQUIRED'})
 preview=await manageCoachContextConsent(config,a,reviewInput,env)
 await manageCoachContextConsent(config,a,grantInput(preview),env)
 assert.equal((await snapshot()).items.length,1)
})
test('global journal withdrawal removes session permissions and requires a fresh explicit review',async()=>{
 await manageCoachContextConsent(config,a,{operation:'revoke_journal',provider:'groq',category:'journal_excerpt'},{})
 assert.deepEqual((await snapshot()).items,[])
 assert.deepEqual((await coachContextConsentOptions(config,a,env,session.token)).grants.items,[])
 await assert.rejects(manageCoachContextConsent(config,a,grantInput(preview),env),{code:'CONTEXT_REVIEW_REQUIRED'})
 preview=await manageCoachContextConsent(config,a,reviewInput,env)
 await manageCoachContextConsent(config,a,grantInput(preview),env)
 assert.equal((await snapshot()).items.length,1)
})
test('source revision changes and permanent erasure invalidate both selection and provider projection',async()=>{
 await journal.save(a,{...entry,revision:1,operationId:randomUUID(),text:'I will walk today. Revised private detail.'})
 assert.deepEqual((await snapshot()).items,[])
 await assert.rejects(handoff.handle(a,{operation:'resolve',token:ticket.token,coachId:'mira',contextSessionToken:session.token}),{code:'DAYBOOK_COACH_SOURCE_CHANGED'})
 await journal.remove(a,{id:entry.id,revision:2,operationId:randomUUID()})
 assert.deepEqual((await snapshot()).items,[])
 await assert.rejects(manageCoachContextConsent(config,a,{...reviewInput,excerpt:{revision:2,start:0,end:18}},env),{code:'CONTEXT_ITEM_UNAVAILABLE'})
})
test('real backend RLS/append-only privilege and journal session constraints reject broad grants and ledger rewrites',async()=>{
 await assert.rejects(transaction(config,a,db=>appendCoachContextGrant(db,a,{
  provider:'groq',policyVersion:preview.policyVersion,category:'journal_excerpt',itemId:entry.id,sessionId:null,expiresAt:new Date(Date.now()+60000),sourceRevision:preview.item.sourceRevision},'grant',true)),{code:'23514'})
 for(const sql of ['update app_private.context_cloud_grants set decision=\'grant\'','delete from app_private.context_cloud_grants'])
  await assert.rejects(transaction(config,a,db=>db.query(sql)),{code:'42501'})
 assert.equal((await admin.query("select has_table_privilege('anon','app_private.context_cloud_grants','SELECT') as readable")).rows[0].readable,false)
})
test('revoked auth session fails before private reads; real account erasure cascades consent metadata',async()=>{
 await admin.query('delete from auth.sessions where id=$1',[a.claims.session_id])
 await assert.rejects(manageCoachContextConsent(config,a,reviewInput,env),{code:'SIGN_IN_REQUIRED'})
 assert.deepEqual((await snapshot()).items,[])
 await admin.query('delete from app.accounts where id=$1',[a.id])
 assert.equal((await admin.query('select 1 from app_private.context_cloud_grants where account_id=$1',[a.id])).rowCount,0)
})
