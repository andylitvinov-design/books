import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {runInNewContext} from 'node:vm'
import {buildCoachingReportV2Draft} from '../lib/personal-coaching/report-v2.js'
import {AppError,onlyKeys,requireUUID} from '../lib/assessments/contracts.js'
import {parsePrTrigger,matchesTrigger} from '../lib/ci/specialist-aggregate.mjs'
import {decideHeavyImpact} from '../scripts/ci-heavy-impact.mjs'

const A='10000000-0000-4000-8000-000000000001',B='10000000-0000-4000-8000-000000000002'
const SID='20000000-0000-4000-8000-000000000001'
const questions=[{id:'goal',stepKey:'goal'},{id:'reality',stepKey:'reality'},{id:'action',stepKey:'action'}]
function fixture(){
 const session={id:SID,status:'completed',schemeKey:'grow_overload_20_v1',modelKey:'grow_v1',answers:{goal:'Rest more',reality:'Too many deadlines',action:'Take a short walk'},reflections:{}}
 const records=new Map([[A,{course:{current:session,history:[]},revision:4,updatedAt:'2026-11-09'}],[B,{course:null,revision:0,updatedAt:null}]])
 const source=readFileSync(new URL('../lib/app/coaching-report-v2.js',import.meta.url),'utf8').replace(/^import[^\n]*\n/gm,'').replace(/^export /gm,'')
 const factory=runInNewContext('(deps)=>{const {readPersonalCoaching,readPersonalCoachingInTransaction,transaction,loadSchemeQuestions,buildCoachingReportV2Draft,PERSONAL_COACH_QUESTIONS,AppError,onlyKeys,requireUUID}=deps;'+source+';return readCoachingReportDraft}')
 const calls=[]
 const deps={readPersonalCoaching:async(_config,actor)=>records.get(actor.id),readPersonalCoachingInTransaction:async(db,_config,actor)=>{calls.push(['session',db]);return records.get(actor.id)},
  transaction:async(_config,_actor,fn)=>fn({}),loadSchemeQuestions:async db=>{calls.push(['catalog',db]);return {schemeKey:'grow_overload_20_v1',modelKey:'grow_v1',questions}},
  buildCoachingReportV2Draft,PERSONAL_COACH_QUESTIONS:questions,AppError,onlyKeys,requireUUID}
 return {read:factory(deps),records,session,deps,calls}
}
const input={sessionId:SID,revision:4,locale:'en'}

test('draft is built only from the authenticated owner saved session and revision',async()=>{
 const {read}=fixture()
 const result=await read({}, {id:A}, input)
 assert.equal(Object.hasOwn(result,'sourceSession'),false)
 assert.equal(result.report.sessionId,SID)
 assert.equal(result.report.generation.sourceRevision,4)
 assert.equal(result.report.outcome.clientFocus.text,'Rest more')
 await assert.rejects(()=>read({}, {id:B},{...input,revision:0}),err=>err.code==='COACHING_REPORT_SESSION_NOT_FOUND')
 await assert.rejects(()=>read({}, {id:A},{...input,revision:3}),err=>err.code==='PERSONAL_COACH_REVISION_CONFLICT')
 await assert.rejects(()=>read({}, {id:A},{...input,answers:{goal:'forged'}}),err=>err.code==='UNKNOWN_FIELD')
})

test('locked report generation reads both the source and catalog through its existing transaction',async()=>{
 const {read,calls}=fixture(),db={marker:'locked transaction'}
 const result=await read({}, {id:A},input,db)
 assert.equal(result.report.sessionId,SID)
 assert.deepEqual(calls,[['session',db],['catalog',db]])
})

test('held, missing, ambiguous and catalog-mismatched sessions never generate a draft',async()=>{
 const {read,records,session,deps}=fixture()
 session.status='safety_hold'
 await assert.rejects(()=>read({}, {id:A},input),err=>err.code==='PERSONAL_COACH_SAFETY_HOLD')
 session.status='active'
 await assert.rejects(()=>read({}, {id:A},input),err=>err.code==='COACHING_REPORT_SESSION_NOT_FOUND')
 session.status='completed'
 records.get(A).course.history=[session]
 await assert.rejects(()=>read({}, {id:A},input),err=>err.code==='COACHING_REPORT_SESSION_UNAVAILABLE')
 records.get(A).course.history=[]
 deps.loadSchemeQuestions=async()=>null
 const source=readFileSync(new URL('../lib/app/coaching-report-v2.js',import.meta.url),'utf8').replace(/^import[^\n]*\n/gm,'').replace(/^export /gm,'')
 const changed=runInNewContext('(deps)=>{const {readPersonalCoaching,readPersonalCoachingInTransaction,transaction,loadSchemeQuestions,buildCoachingReportV2Draft,PERSONAL_COACH_QUESTIONS,AppError,onlyKeys,requireUUID}=deps;'+source+';return readCoachingReportDraft}')(deps)
 await assert.rejects(()=>changed({}, {id:A},input),err=>err.code==='COACHING_REPORT_CATALOG_UNAVAILABLE')
})

test('historical completed session is owner-scoped and incomplete or forged sources are rejected',async()=>{
 const {read,records,session}=fixture()
 const other='20000000-0000-4000-8000-000000000002'
 records.get(A).course={current:{id:other,status:'active',answers:{}},history:[session]}
 assert.equal((await read({}, {id:A},input)).report.sessionId,SID)
 await assert.rejects(()=>read({}, {id:A},{...input,locale:'invalid'}),err=>err.code==='COACHING_REPORT_LOCALE_INVALID')
 await assert.rejects(()=>read({}, {id:A},{...input,sessionId:'not-a-uuid'}),err=>err.code==='INVALID_ID')
 await assert.rejects(()=>read({}, {id:A},{...input,report:{review:{status:'confirmed'}}}),err=>err.code==='UNKNOWN_FIELD')
})

test('preview route uses the existing authenticated same-origin and private response boundary',()=>{
 const route=readFileSync(new URL('../app/api/app/[...path]/route.js',import.meta.url),'utf8')
 assert.match(route,/if \(method !== 'GET' && method !== 'HEAD'\) requireSameOrigin\(request, config\)/)
 assert.match(route,/NextResponse\.json\(data, \{ status, headers: PRIVATE_HEADERS \}\)/)
 const section=route.slice(route.indexOf("if (joined === 'personal-coaching-report')"),route.indexOf("if (joined === 'tradition-coaching-summary')"))
 assert.match(section,/x-hh-account-id/)
 assert.match(section,/method === 'POST'/)
 assert.match(section,/readCoachingReportDraft\(config,actor,await readBody\(request,2048\)\)/)
 assert.doesNotMatch(section,/method === 'GET'/)
})

test('report source and tests route to existing coaching and database gates',()=>{
 const workflow=readFileSync(new URL('../.github/workflows/hh-personal-coaching-session.yml',import.meta.url),'utf8')
 const trigger=parsePrTrigger(workflow,'hh-personal-coaching-session.yml')
 for(const filename of ['lib/app/coaching-report-v2.js','lib/app/coaching-report-store.js','supabase/migrations/20261110153118_hh_coaching_report_storage_v1.sql','tests/coaching-report-source.test.mjs','tests/coaching-report-v2.test.mjs']){
  assert.equal(matchesTrigger(trigger,[filename],'codex/public-book-library'),true,filename)
  assert.equal(decideHeavyImpact('app-r1',[{filename,status:'modified'}]).database,true,filename)
 }
 for(const filename of ['components/coaching-report-preview.jsx','components/coaching-report-preview.module.css','lib/personal-coaching/report-preview.mjs','tests/coaching-report-preview.test.mjs'])
  assert.equal(matchesTrigger(trigger,[filename],'codex/public-book-library'),true,filename)
})
