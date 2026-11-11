import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {runInNewContext} from 'node:vm'
import {createHash,randomBytes} from 'node:crypto'
import {seal as actualSeal,openSealed as actualOpenSealed} from '../lib/app/crypto.js'
import {authoredFollowupFor} from '../lib/personal-coaching/offline-intelligence.js'
import {isCoachingSafetyConcern} from '../lib/personal-coaching/model-matcher.js'
import {normalizeClientCoachingContext} from '../lib/personal-coaching/client-context.mjs'
import {isGrowClarityQuestion,normalizeGrowPlanExtras} from '../lib/personal-coaching/grow-20.mjs'

const source=readFileSync(new URL('../lib/app/personal-coaching.js',import.meta.url),'utf8')
const server=source.replace(/^import[^\n]*\n/gm,'').replace(/^export /gm,'')
const a={id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'}
const b={id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'}

function fixture({secure=false}={}){
 const store=new Map()
 const questions=[
  {id:'real',stepKey:'reality',type:'single_choice',required:false,choices:[{id:'time'}]},
  {id:'options',stepKey:'options',type:'single_choice',required:false,choices:[{id:'try'}]},
  {id:'action',stepKey:'action',type:'text',required:true},
  {id:'review',stepKey:'review',type:'single_choice',required:false,choices:[{id:'useful'}]},
 ]
 let counter=0
 function error(code,status){return Object.assign(new Error(code),{code,status})}
 const transaction=async(_config,actor,fn)=>fn({query:async(sql,params=[])=>{
  if(sql.includes('select id from app.accounts'))return {rows:[{id:actor.id}]}
  if(sql.includes('select payload_ciphertext,revision,updated_at from app_private.personal_coaching_sessions')){
   const row=store.get(params[0]);return {rows:row?[{...row}]:[]}
  }
  if(sql.includes('insert into app_private.personal_coaching_sessions')){
   if(store.has(params[0]))return {rows:[]}
   const row={payload_ciphertext:params[1],revision:1,updated_at:'2026-10-24'}
   store.set(params[0],row);return {rows:[{revision:row.revision,updated_at:row.updated_at}]}
  }
  if(sql.includes('update app_private.personal_coaching_sessions')){
   const row=store.get(params[0])
   if(!row||row.revision!==params[2])return {rows:[]}
   row.payload_ciphertext=params[1];row.revision++;row.updated_at='2026-10-24'
   return {rows:[{revision:row.revision,updated_at:row.updated_at}]}
  }
  if(sql.includes('delete from app_private.personal_coaching_sessions')){
   if(!store.has(params[0])||store.get(params[0]).revision!==params[1])return {rows:[]}
   store.delete(params[0]);return {rows:[{account_id:params[0]}]}
  }
  throw new Error('Unexpected SQL '+sql.slice(0,120))
 }})
 const deps={
  randomUUID:()=>String(++counter).padStart(36,'0'),
  transaction,seal:secure?actualSeal:value=>JSON.stringify(value),openSealed:secure?actualOpenSealed:value=>JSON.parse(value),
  AppError:error,onlyKeys:(value,keys)=>{
   if(Object.keys(value).some(key=>!keys.includes(key)))throw error('UNKNOWN_FIELD',400)
  },
  PERSONAL_COACH_VERSION:1,PERSONAL_COACH_TEMPLATE:'hh-personal-coaching-v1',
  personalCoachQuestion:()=>null,TRADITION_COURSES:[],
  traditionCourse:()=>null,traditionEndcaps:()=>[],
  loadSchemeQuestions:async(_db,schemeKey)=>['grow_quick_v1','grow_overload_20_v1'].includes(schemeKey)
   ?{schemeKey,modelKey:'grow_v1',questions:schemeKey==='grow_overload_20_v1'?questions.map(q=>q.id==='action'?{...q,stepKey:'will'}:q):questions,requiredCustomPlan:schemeKey==='grow_overload_20_v1'}:null,
  authoredFollowupFor,isCoachingSafetyConcern,normalizeClientCoachingContext,isGrowClarityQuestion,normalizeGrowPlanExtras,createHash,
 }
 const factory=runInNewContext('(deps)=>{const {randomUUID,createHash,transaction,seal,openSealed,AppError,onlyKeys,PERSONAL_COACH_VERSION,PERSONAL_COACH_TEMPLATE,personalCoachQuestion,TRADITION_COURSES,traditionCourse,traditionEndcaps,loadSchemeQuestions,authoredFollowupFor,isCoachingSafetyConcern,normalizeClientCoachingContext,isGrowClarityQuestion,normalizeGrowPlanExtras}=deps;'+server+';return {readPersonalCoaching,savePersonalCoaching}}')
 return {api:factory(deps),store}
}
const start={action:'start',revision:0,schemeKey:'grow_quick_v1',clientQuestion:'How can I plan my new project?'}

test('tampered ciphertext and cross-account ciphertext fail closed without replacing data',async()=>{
 const {api,store}=fixture({secure:true})
 const config={encryptionKey:randomBytes(32),encryptionKeyId:'test-v1'}
 const s=await api.savePersonalCoaching(config,a,start)
 const original=store.get(a.id).payload_ciphertext
 store.set(b.id,{...store.get(a.id)})
 await assert.rejects(()=>api.readPersonalCoaching(config,b),err=>err.code==='PRIVATE_DATA_UNAVAILABLE')
 const envelope=JSON.parse(original)
 envelope.tag=Buffer.alloc(16).toString('base64')
 const tampered=JSON.stringify(envelope)
 store.get(a.id).payload_ciphertext=tampered
 await assert.rejects(()=>api.readPersonalCoaching(config,a),err=>err.code==='PRIVATE_DATA_UNAVAILABLE')
 await assert.rejects(()=>api.savePersonalCoaching(config,a,{action:'delete',revision:s.revision,confirmed:true}),err=>err.code==='PRIVATE_DATA_UNAVAILABLE')
 assert.equal(store.get(a.id).payload_ciphertext,tampered)
 assert.equal(store.get(a.id).revision,s.revision)
})
async function skipPilotFollowup(api,s,n){
 const followup=s.course.current.pendingFollowup
 if(!followup)return s
 return api.savePersonalCoaching({},a,{action:'skip_followup',revision:s.revision,questionId:followup.questionId,followupKey:followup.key,turnId:`70000000-0000-4000-8000-${String(n).padStart(12,'0')}`})
}

test('unknown pilot dialogue protocols fail closed without changing encrypted state',async()=>{
 const {api,store}=fixture()
 const s=await api.savePersonalCoaching({},a,{...start,schemeKey:'grow_overload_20_v1'})
 const row=store.get(a.id),course=JSON.parse(row.payload_ciphertext)
 course.current.dialogueProtocol=2
 row.payload_ciphertext=JSON.stringify(course)
 const original=row.payload_ciphertext
 await assert.rejects(()=>api.readPersonalCoaching({},a),err=>err.code==='PERSONAL_COACH_VERSION_UNAVAILABLE')
 await assert.rejects(()=>api.savePersonalCoaching({},a,{action:'finish_without_plan',revision:s.revision}),err=>err.code==='PERSONAL_COACH_VERSION_UNAVAILABLE')
 assert.equal(row.payload_ciphertext,original)
 assert.equal(row.revision,s.revision)
})

test('malformed or impossible pending follow-up state is never silently bypassed',async()=>{
 for(const pending of [{questionId:'',key:'reality_text_v1'},{questionId:'real',key:42},['real'],{questionId:'real',key:'reality_text_v1',extra:true}]){
  const {api,store}=fixture()
  await api.savePersonalCoaching({},a,{...start,schemeKey:'grow_overload_20_v1'})
  const row=store.get(a.id),course=JSON.parse(row.payload_ciphertext)
  course.current.pendingFollowup=pending
  row.payload_ciphertext=JSON.stringify(course)
  await assert.rejects(()=>api.readPersonalCoaching({},a),err=>err.code==='PERSONAL_COACH_VERSION_UNAVAILABLE')
 }
 const {api,store}=fixture()
 await api.savePersonalCoaching({},a,{...start,schemeKey:'grow_overload_20_v1'})
 const row=store.get(a.id),course=JSON.parse(row.payload_ciphertext)
 course.current.status='completed'
 course.current.pendingFollowup={questionId:'real',key:'reality_choice_v1'}
 row.payload_ciphertext=JSON.stringify(course)
 await assert.rejects(()=>api.readPersonalCoaching({},a),err=>err.code==='PERSONAL_COACH_VERSION_UNAVAILABLE')
})

test('pilot persists the active follow-up until it is answered or explicitly skipped',async()=>{
 const {api}=fixture()
 let s=await api.savePersonalCoaching({},a,{...start,schemeKey:'grow_overload_20_v1'})
 s=await api.savePersonalCoaching({},a,{action:'answer',revision:s.revision,questionId:'real',answer:'choice:time',turnId:'60000000-0000-4000-8000-000000000001'})
 assert.equal(s.course.current.dialogueProtocol,1)
 assert.equal(s.course.current.pendingFollowup.questionId,'real')
 assert.equal((await api.readPersonalCoaching({},a)).course.current.pendingFollowup.key,'reality_choice_v1')
 await assert.rejects(()=>api.savePersonalCoaching({},a,{action:'answer',revision:s.revision,questionId:'options',answer:'choice:try',turnId:'60000000-0000-4000-8000-000000000002'}),err=>err.code==='PERSONAL_COACH_FOLLOWUP_PENDING')
 const skip={action:'skip_followup',revision:s.revision,questionId:'real',followupKey:'reality_choice_v1',turnId:'60000000-0000-4000-8000-000000000003'}
 s=await api.savePersonalCoaching({},a,skip)
 assert.equal(s.course.current.pendingFollowup,undefined)
 assert.equal((await api.savePersonalCoaching({},a,skip)).revision,s.revision)
 s=await api.savePersonalCoaching({},a,{action:'answer',revision:s.revision,questionId:'options',answer:'choice:try',turnId:'60000000-0000-4000-8000-000000000004'})
 assert.equal(s.course.current.pendingFollowup.questionId,'options')
})

test('pilot follow-up survives pause and is cleared by a saved reflection',async()=>{
 const {api}=fixture()
 let s=await api.savePersonalCoaching({},a,{...start,schemeKey:'grow_overload_20_v1'})
 s=await api.savePersonalCoaching({},a,{action:'answer',revision:s.revision,questionId:'real',answer:'choice:time',turnId:'60000000-0000-4000-8000-000000000005'})
 s=await api.savePersonalCoaching({},a,{action:'pause',revision:s.revision,turnId:'60000000-0000-4000-8000-000000000006'})
 s=await api.savePersonalCoaching({},a,{action:'resume',revision:s.revision,turnId:'60000000-0000-4000-8000-000000000007'})
 assert.equal(s.course.current.pendingFollowup.questionId,'real')
 s=await api.savePersonalCoaching({},a,{action:'reflection',revision:s.revision,questionId:'real',followupKey:'reality_choice_v1',note:'A personal observation',turnId:'60000000-0000-4000-8000-000000000008'})
 assert.equal(s.course.current.pendingFollowup,undefined)
 assert.equal(s.course.current.reflections.real.text,'A personal observation')
})

test('replayed follow-up acknowledgement returns the latest server phase',async()=>{
 const {api}=fixture()
 let s=await api.savePersonalCoaching({},a,{...start,schemeKey:'grow_overload_20_v1'})
 s=await api.savePersonalCoaching({},a,{action:'answer',revision:s.revision,questionId:'real',answer:'choice:time',turnId:'80000000-0000-4000-8000-000000000001'})
 const reflection={action:'reflection',revision:s.revision,questionId:'real',followupKey:'reality_choice_v1',note:'A personal observation',turnId:'80000000-0000-4000-8000-000000000002'}
 s=await api.savePersonalCoaching({},a,reflection)
 s=await api.savePersonalCoaching({},a,{action:'answer',revision:s.revision,questionId:'options',answer:'choice:try',turnId:'80000000-0000-4000-8000-000000000003'})
 const replay=await api.savePersonalCoaching({},a,reflection)
 assert.equal(replay.revision,s.revision)
 assert.equal(replay.course.current.pendingFollowup.questionId,'options')
})

test('pending follow-up cannot be skipped with a forged key and urgent answers take precedence',async()=>{
 const {api}=fixture()
 let s=await api.savePersonalCoaching({},a,{...start,schemeKey:'grow_overload_20_v1'})
 s=await api.savePersonalCoaching({},a,{action:'answer',revision:s.revision,questionId:'real',answer:'choice:time',turnId:'60000000-0000-4000-8000-000000000009'})
 await assert.rejects(()=>api.savePersonalCoaching({},a,{action:'skip_followup',revision:s.revision,questionId:'real',followupKey:'forged',turnId:'60000000-0000-4000-8000-000000000010'}),err=>err.code==='PERSONAL_COACH_REFLECTION_UNAVAILABLE')
 s=await api.savePersonalCoaching({},a,{action:'answer',revision:s.revision,questionId:'action',answer:'suicidio'})
 assert.equal(s.course.current.status,'safety_hold')
 assert.equal(s.course.current.pendingFollowup,undefined)
})

test('client can finish for reflection while a follow-up is pending',async()=>{
 const {api}=fixture()
 let s=await api.savePersonalCoaching({},a,{...start,schemeKey:'grow_overload_20_v1'})
 s=await api.savePersonalCoaching({},a,{action:'answer',revision:s.revision,questionId:'real',answer:'choice:time',turnId:'60000000-0000-4000-8000-000000000013'})
 s=await api.savePersonalCoaching({},a,{action:'finish_without_plan',revision:s.revision,turnId:'60000000-0000-4000-8000-000000000014'})
 assert.equal(s.course.current.status,'completed')
 assert.equal(s.course.current.outcome,'reflection_only')
 assert.equal(s.course.current.pendingFollowup,undefined)
 assert.equal(s.course.current.answers.real,'choice:time')
})

test('existing pilot sessions without the new protocol retain their legacy progression',async()=>{
 const {api,store}=fixture()
 let s=await api.savePersonalCoaching({},a,{...start,schemeKey:'grow_overload_20_v1'})
 const row=store.get(a.id),course=JSON.parse(row.payload_ciphertext)
 delete course.current.dialogueProtocol
 row.payload_ciphertext=JSON.stringify(course)
 s=await api.savePersonalCoaching({},a,{action:'answer',revision:s.revision,questionId:'real',answer:'choice:time',turnId:'60000000-0000-4000-8000-000000000011'})
 assert.equal(s.course.current.pendingFollowup,undefined)
 s=await api.savePersonalCoaching({},a,{action:'answer',revision:s.revision,questionId:'options',answer:'choice:try',turnId:'60000000-0000-4000-8000-000000000012'})
 assert.equal(s.course.current.answers.options,'choice:try')
})

test('pilot persists a reviewed low-confidence plan and idempotently rejects altered review',async()=>{
 const {api}=fixture()
 let s=await api.savePersonalCoaching({},a,{...start,schemeKey:'grow_overload_20_v1'})
 s=await api.savePersonalCoaching({},a,{action:'finish_without_plan',revision:s.revision})
 const request={action:'plan',revision:s.revision,goal:'Rest',obstacle:'Time',actionText:'Take a short walk',when:'Tomorrow',confidence:3,turnId:'50000000-0000-4000-8000-000000000001'}
 await assert.rejects(()=>api.savePersonalCoaching({},a,request),err=>err.code==='PERSONAL_COACH_FEASIBILITY_REVIEW_REQUIRED')
 await assert.rejects(()=>api.savePersonalCoaching({},a,{...request,feasibilityReview:'fabricated'}),err=>err.code==='PERSONAL_COACH_PLAN_INVALID')
 const chosen={...request,feasibilityReview:'considered'}
 const saved=await api.savePersonalCoaching({},a,chosen)
 assert.equal(saved.course.current.actionPlan.feasibilityReview,'considered')
 assert.equal((await api.readPersonalCoaching({},a)).course.current.actionPlan.feasibilityReview,'considered')
 assert.equal((await api.savePersonalCoaching({},a,chosen)).revision,saved.revision)
 await assert.rejects(()=>api.savePersonalCoaching({},a,{...chosen,feasibilityReview:'keep'}),err=>err.code==='PERSONAL_COACH_TURN_ID_REUSED')
})

test('legacy plans remain valid and urgent content bypasses missing review',async()=>{
 const {api}=fixture()
 let s=await api.savePersonalCoaching({},a,{...start,schemeKey:'grow_overload_20_v1'})
 s=await api.savePersonalCoaching({},a,{action:'finish_without_plan',revision:s.revision})
 const plan={action:'plan',revision:s.revision,goal:'Rest',obstacle:'Time',actionText:'Take a short walk',when:'Tomorrow',confidence:2}
 s=await api.savePersonalCoaching({},a,plan)
 assert.equal(s.course.current.actionPlan.feasibilityReview,undefined)
 s=await api.savePersonalCoaching({},a,{...plan,revision:s.revision,goal:'I want to kill myself',turnId:'50000000-0000-4000-8000-000000000002'})
 assert.equal(s.course.current.status,'safety_hold')
})

test('lost pilot plan acknowledgement is idempotent and a reused ID cannot alter it',async()=>{
 const {api}=fixture()
 let s=await api.savePersonalCoaching({},a,{...start,schemeKey:'grow_overload_20_v1'})
 s=await api.savePersonalCoaching({},a,{action:'finish_without_plan',revision:s.revision})
 const request={action:'plan',revision:s.revision,goal:'Rest',obstacle:'Time',actionText:'Take a short walk',when:'Tomorrow',confidence:7,turnId:'40000000-0000-4000-8000-000000000001'}
 const first=await api.savePersonalCoaching({},a,request)
 const retry=await api.savePersonalCoaching({},a,request)
 assert.equal(retry.revision,first.revision)
 assert.equal(retry.course.current.actionPlan.actionText,'Take a short walk')
 await assert.rejects(()=>api.savePersonalCoaching({},a,{...request,actionText:'A different action'}),err=>err.code==='PERSONAL_COACH_TURN_ID_REUSED')
})

test('urgent content in any plan field enters a persistent safety hold without approving a plan',async()=>{
 for(const field of ['goal','obstacle','actionText','when']){
  const {api}=fixture()
  let s=await api.savePersonalCoaching({},a,{...start,schemeKey:'grow_overload_20_v1'})
  s=await api.savePersonalCoaching({},a,{action:'finish_without_plan',revision:s.revision})
  const request={action:'plan',revision:s.revision,goal:'Rest',obstacle:'Time',actionText:'Take a short walk',when:'Tomorrow',confidence:7,turnId:'40000000-0000-4000-8000-000000000002',[field]:'I want to kill myself'}
  const held=await api.savePersonalCoaching({},a,request)
  assert.equal(held.course.current.status,'safety_hold',field)
  assert.equal(held.course.current.actionPlan,undefined,field)
  assert.equal((await api.readPersonalCoaching({},a)).course.current.status,'safety_hold')
  assert.equal((await api.savePersonalCoaching({},a,request)).revision,held.revision)
 }
})

test('urgent plan content enters safety hold even without a proposed action',async()=>{
 const {api}=fixture()
 let s=await api.savePersonalCoaching({},a,{...start,schemeKey:'grow_overload_20_v1'})
 s=await api.savePersonalCoaching({},a,{action:'finish_without_plan',revision:s.revision})
 s=await api.savePersonalCoaching({},a,{action:'plan',revision:s.revision,goal:'I want to kill myself',obstacle:'',actionText:'',when:'',confidence:null,turnId:'40000000-0000-4000-8000-000000000003'})
 assert.equal(s.course.current.status,'safety_hold')
 assert.equal(s.course.current.actionPlan,undefined)
})

test('lost pilot start acknowledgement can be retried without a second session',async()=>{
 const {api}=fixture()
 const request={...start,schemeKey:'grow_overload_20_v1',turnId:'30000000-0000-4000-8000-000000000001'}
 const first=await api.savePersonalCoaching({},a,request)
 const retry=await api.savePersonalCoaching({},a,request)
 assert.equal(retry.revision,first.revision)
 assert.equal(retry.course.current.id,first.course.current.id)
 assert.equal(retry.course.history.length,0)
 await assert.rejects(()=>api.savePersonalCoaching({},a,{...request,clientQuestion:'A different coaching question'}),err=>err.code==='PERSONAL_COACH_TURN_ID_REUSED')
 assert.equal((await api.readPersonalCoaching({},b)).course,null)
})

test('lost acknowledgement of a safety-held pilot start returns the same hold',async()=>{
 const {api}=fixture()
 const request={...start,schemeKey:'grow_overload_20_v1',clientQuestion:'I want to kill myself',turnId:'30000000-0000-4000-8000-000000000002'}
 const first=await api.savePersonalCoaching({},a,request)
 const retry=await api.savePersonalCoaching({},a,request)
 assert.equal(first.course.current.status,'safety_hold')
 assert.equal(retry.course.current.id,first.course.current.id)
 assert.equal(retry.course.current.status,'safety_hold')
})

test('retrying a new pilot after completion does not duplicate history',async()=>{
 const {api}=fixture()
 let s=await api.savePersonalCoaching({},a,{...start,schemeKey:'grow_overload_20_v1'})
 const previous=s.course.current.id
 s=await api.savePersonalCoaching({},a,{action:'finish_without_plan',revision:s.revision})
 const request={...start,schemeKey:'grow_overload_20_v1',revision:s.revision,turnId:'30000000-0000-4000-8000-000000000003'}
 const first=await api.savePersonalCoaching({},a,request)
 const retry=await api.savePersonalCoaching({},a,request)
 assert.equal(retry.course.current.id,first.course.current.id)
 assert.equal(retry.course.history.length,1)
 assert.equal(retry.course.history[0].id,previous)
 assert.equal(retry.revision,first.revision)
})

test('pilot pause survives reload and retries, preserves answers and requires explicit resume',async()=>{
 const {api}=fixture()
 const id=n=>`20000000-0000-4000-8000-${String(n).padStart(12,'0')}`
 let s=await api.savePersonalCoaching({},a,{...start,schemeKey:'grow_overload_20_v1'})
 s=await api.savePersonalCoaching({},a,{action:'answer',revision:s.revision,questionId:'real',answer:'choice:time',turnId:id(1)})
 const pause={action:'pause',revision:s.revision,turnId:id(2)}
 s=await api.savePersonalCoaching({},a,pause)
 assert.equal(s.course.current.status,'paused')
 assert.equal((await api.savePersonalCoaching({},a,pause)).revision,s.revision)
 const loaded=await api.readPersonalCoaching({},a)
 assert.equal(loaded.course.current.answers.real,'choice:time')
 await assert.rejects(()=>api.savePersonalCoaching({},a,{action:'answer',revision:s.revision,questionId:'options',answer:'choice:try',turnId:id(3)}),err=>err.code==='PERSONAL_COACH_QUESTION_UNAVAILABLE')
 const started=await api.savePersonalCoaching({},a,{...start,schemeKey:'grow_overload_20_v1',revision:s.revision})
 assert.equal(started.course.current.status,'paused')
 const resume={action:'resume',revision:s.revision,turnId:id(4)}
 s=await api.savePersonalCoaching({},a,resume)
 assert.equal(s.course.current.status,'active')
 assert.equal(s.course.current.answers.real,'choice:time')
 assert.equal((await api.savePersonalCoaching({},a,resume)).revision,s.revision)
 await assert.rejects(()=>api.savePersonalCoaching({},a,{...resume,action:'pause'}),err=>err.code==='PERSONAL_COACH_TURN_ID_REUSED')
 await assert.rejects(()=>api.savePersonalCoaching({},a,{action:'pause',revision:s.revision-1,turnId:id(5)}),err=>err.code==='PERSONAL_COACH_REVISION_CONFLICT')
})

test('pause and resume cannot bypass safety hold or operate on another account',async()=>{
 const {api}=fixture()
 let s=await api.savePersonalCoaching({},a,{...start,schemeKey:'grow_overload_20_v1'})
 s=await api.savePersonalCoaching({},a,{action:'answer',revision:s.revision,questionId:'real',answer:'I want to kill myself'})
 for(const action of ['pause','resume']){
  await assert.rejects(()=>api.savePersonalCoaching({},a,{action,revision:s.revision,turnId:'20000000-0000-4000-8000-000000000006'}),err=>err.code==='PERSONAL_COACH_SAFETY_HOLD')
  await assert.rejects(()=>api.savePersonalCoaching({},b,{action,revision:0,turnId:'20000000-0000-4000-8000-000000000007'}),err=>err.code==='PERSONAL_COACH_NOT_STARTED')
 }
})

test('reviewed continuity and safety hold coexist without accepting unreviewed context',async()=>{
 const {api}=fixture()
 const draft={version:1,reviewStatus:'needs_review',active_goals:[{text:'Protect personal time'}]}
 await assert.rejects(()=>api.savePersonalCoaching({},a,{...start,clientContext:draft}),err=>err.code==='COACHING_CONTEXT_CONFIRMATION_REQUIRED')
 const reviewed={...draft,reviewStatus:'client_confirmed'}
 let s=await api.savePersonalCoaching({},a,{...start,clientContext:reviewed})
 assert.equal(s.course.current.clientContext.active_goals[0].text,'Protect personal time')
 assert.equal((await api.readPersonalCoaching({},b)).course,null)
 s=await api.savePersonalCoaching({},a,{action:'answer',revision:s.revision,questionId:'real',answer:'I want to kill myself'})
 assert.equal(s.course.current.status,'safety_hold')
 assert.equal((await api.readPersonalCoaching({},a)).course.current.clientContext.reviewStatus,'client_confirmed')
 await assert.rejects(()=>api.savePersonalCoaching({},a,{...start,revision:s.revision,clientContext:reviewed}),err=>err.code==='PERSONAL_COACH_SAFETY_HOLD')
})

test('urgent answer persists a safety hold across reload and prevents further coaching',async()=>{
 const {api}=fixture()
 let s=await api.savePersonalCoaching({},a,start)
 s=await api.savePersonalCoaching({},a,{action:'answer',revision:s.revision,questionId:'real',answer:'I want to kill myself'})
 assert.equal(s.course.current.status,'safety_hold')
 assert.equal((await api.readPersonalCoaching({},a)).course.current.status,'safety_hold')
 await assert.rejects(()=>api.savePersonalCoaching({},a,{action:'answer',revision:s.revision,questionId:'options',answer:'choice:try'}),err=>err.code==='PERSONAL_COACH_SAFETY_HOLD')
 await assert.rejects(()=>api.savePersonalCoaching({},a,{action:'complete',revision:s.revision}),err=>err.code==='PERSONAL_COACH_SAFETY_HOLD')
 await assert.rejects(()=>api.savePersonalCoaching({},a,{...start,revision:s.revision}),err=>err.code==='PERSONAL_COACH_SAFETY_HOLD')
})

test('safety screening covers the full answer and initial question',async()=>{
 const {api}=fixture()
 let s=await api.savePersonalCoaching({},a,start)
 s=await api.savePersonalCoaching({},a,{action:'answer',revision:s.revision,questionId:'real',answer:'a'.repeat(610)+' I want to kill myself'})
 assert.equal(s.course.current.status,'safety_hold')
 const other=fixture()
 const first=await other.api.savePersonalCoaching({},a,{...start,clientQuestion:'I want to kill myself'})
 assert.equal(first.course.current.status,'safety_hold')
})

test('urgent authored reflection enters the same hold; explicit deletion remains possible',async()=>{
 const {api}=fixture()
 let s=await api.savePersonalCoaching({},a,start)
 s=await api.savePersonalCoaching({},a,{action:'answer',revision:s.revision,questionId:'real',answer:'choice:time'})
 s=await api.savePersonalCoaching({},a,{action:'reflection',revision:s.revision,questionId:'real',followupKey:'reality_choice_v1',note:'Я хочу покончить с собой'})
 assert.equal(s.course.current.status,'safety_hold')
 await assert.rejects(()=>api.savePersonalCoaching({},a,{action:'finish_without_plan',revision:s.revision}),err=>err.code==='PERSONAL_COACH_SAFETY_HOLD')
 s=await api.savePersonalCoaching({},a,{action:'delete',revision:s.revision,confirmed:true})
 assert.equal(s.course,null)
})

test('user may finish the overload pilot without inventing a plan',async()=>{
 const {api}=fixture()
 let s=await api.savePersonalCoaching({},a,{...start,schemeKey:'grow_overload_20_v1'})
 s=await api.savePersonalCoaching({},a,{action:'finish_without_plan',revision:s.revision})
 assert.equal(s.course.current.status,'completed')
 assert.equal(s.course.current.outcome,'reflection_only')
 assert.equal(s.course.current.actionPlan,undefined)
})

test('overload pilot rejects jumping ahead and requires explicit intent to edit an earlier answer',async()=>{
 const {api}=fixture()
 let s=await api.savePersonalCoaching({},a,{...start,schemeKey:'grow_overload_20_v1'})
 const id=n=>`10000000-0000-4000-8000-${String(n).padStart(12,'0')}`
 await assert.rejects(()=>api.savePersonalCoaching({},a,{action:'answer',revision:s.revision,questionId:'real',answer:'choice:time'}),err=>err.code==='PERSONAL_COACH_INVALID_TURN_ID')
 await assert.rejects(()=>api.savePersonalCoaching({},a,{action:'answer',revision:s.revision,questionId:'action',answer:'A premature step',turnId:id(1)}),err=>err.code==='PERSONAL_COACH_QUESTION_OUT_OF_ORDER')
 s=await api.savePersonalCoaching({},a,{action:'answer',revision:s.revision,questionId:'real',answer:'choice:time',turnId:id(2)})
 s=await skipPilotFollowup(api,s,1)
 s=await api.savePersonalCoaching({},a,{action:'answer',revision:s.revision,questionId:'options',answer:null,turnId:id(3)})
 await assert.rejects(()=>api.savePersonalCoaching({},a,{action:'answer',revision:s.revision,questionId:'real',answer:'Updated context',turnId:id(4)}),err=>err.code==='PERSONAL_COACH_EXPLICIT_EDIT_REQUIRED')
 await assert.rejects(()=>api.savePersonalCoaching({},a,{action:'answer',revision:s.revision,questionId:'action',answer:'A chosen step',edit:true,turnId:id(6)}),err=>err.code==='PERSONAL_COACH_EDIT_UNAVAILABLE')
 const edit={action:'answer',revision:s.revision,questionId:'real',answer:'Updated context',edit:true,turnId:id(4)}
 s=await api.savePersonalCoaching({},a,edit)
 assert.equal((await api.savePersonalCoaching({},a,edit)).revision,s.revision)
 await assert.rejects(()=>api.savePersonalCoaching({},a,{...edit,edit:false}),err=>err.code==='PERSONAL_COACH_TURN_ID_REUSED')
 s=await skipPilotFollowup(api,s,2)
 s=await api.savePersonalCoaching({},a,{action:'answer',revision:s.revision,questionId:'action',answer:'A chosen step',turnId:id(5)})
 assert.equal(s.course.current.answers.action,'A chosen step')
})

test('duplicate answer turn returns the committed revision and rejects reuse with different content',async()=>{
 const {api}=fixture()
 let s=await api.savePersonalCoaching({},a,{...start,schemeKey:'grow_overload_20_v1'})
 const turn={action:'answer',revision:s.revision,questionId:'real',answer:'choice:time',turnId:'10000000-0000-4000-8000-000000000001'}
 s=await api.savePersonalCoaching({},a,turn)
 const replay=await api.savePersonalCoaching({},a,turn)
 assert.equal(replay.revision,s.revision)
 assert.equal(replay.course.current.answers.real,'choice:time')
 await assert.rejects(()=>api.savePersonalCoaching({},a,{...turn,answer:'changed'}),err=>err.code==='PERSONAL_COACH_TURN_ID_REUSED')
 await assert.rejects(()=>api.savePersonalCoaching({},b,turn),err=>err.code==='PERSONAL_COACH_REVISION_CONFLICT')
})

test('pilot validates written action at will and permits the review rating at the end',async()=>{
 const {api}=fixture()
 let s=await api.savePersonalCoaching({},a,{...start,schemeKey:'grow_overload_20_v1'})
 const id=n=>`20000000-0000-4000-8000-${String(n).padStart(12,'0')}`
 for(const [n,questionId,answer] of [[1,'real','choice:time'],[2,'options',null],[3,'action','Write a concrete first step'],[4,'review','choice:useful']]){
  s=await api.savePersonalCoaching({},a,{action:'answer',revision:s.revision,questionId,answer,turnId:id(n)})
  s=await skipPilotFollowup(api,s,n)
 }
 s=await api.savePersonalCoaching({},a,{action:'complete',revision:s.revision})
 assert.equal(s.course.current.status,'completed')
 assert.equal(s.course.current.answers.review,'choice:useful')
})

test('a lost completion acknowledgement can be retried without another revision',async()=>{
 const {api}=fixture()
 let s=await api.savePersonalCoaching({},a,{...start,schemeKey:'grow_overload_20_v1'})
 const turn={action:'finish_without_plan',revision:s.revision,turnId:'40000000-0000-4000-8000-000000000001'}
 s=await api.savePersonalCoaching({},a,turn)
 const replay=await api.savePersonalCoaching({},a,turn)
 assert.equal(replay.revision,s.revision)
 assert.equal(replay.course.current.outcome,'reflection_only')
 await assert.rejects(()=>api.savePersonalCoaching({},a,{...turn,action:'complete'}),err=>err.code==='PERSONAL_COACH_TURN_ID_REUSED')
})

test('a lost reflection acknowledgement is idempotent and cannot change its content',async()=>{
 const {api}=fixture()
 let s=await api.savePersonalCoaching({},a,start)
 s=await api.savePersonalCoaching({},a,{action:'answer',revision:s.revision,questionId:'real',answer:'choice:time'})
 const turn={action:'reflection',revision:s.revision,questionId:'real',followupKey:'reality_choice_v1',note:'A careful reflection',turnId:'50000000-0000-4000-8000-000000000001'}
 s=await api.savePersonalCoaching({},a,turn)
 const replay=await api.savePersonalCoaching({},a,turn)
 assert.equal(replay.revision,s.revision)
 assert.equal(replay.course.current.reflections.real.text,'A careful reflection')
 await assert.rejects(()=>api.savePersonalCoaching({},a,{...turn,note:'Changed reflection'}),err=>err.code==='PERSONAL_COACH_TURN_ID_REUSED')
})

test('pilot cannot substitute a rating for an unwritten action',async()=>{
 const {api}=fixture()
 let s=await api.savePersonalCoaching({},a,{...start,schemeKey:'grow_overload_20_v1'})
 const id=n=>`30000000-0000-4000-8000-${String(n).padStart(12,'0')}`
 for(const [n,questionId,answer] of [[1,'real','choice:time'],[2,'options',null],[3,'action','short'],[4,'review','choice:useful']]){
  s=await api.savePersonalCoaching({},a,{action:'answer',revision:s.revision,questionId,answer,turnId:id(n)})
  s=await skipPilotFollowup(api,s,n)
 }
 await assert.rejects(()=>api.savePersonalCoaching({},a,{action:'complete',revision:s.revision}),err=>err.code==='PERSONAL_COACH_WOOP_PLAN_REQUIRED')
})

test('urgent answer interrupts even when sent for a later valid question',async()=>{
 const {api}=fixture()
 let s=await api.savePersonalCoaching({},a,{...start,schemeKey:'grow_overload_20_v1'})
 s=await api.savePersonalCoaching({},a,{action:'answer',revision:s.revision,questionId:'action',answer:'I want to kill myself',turnId:'10000000-0000-4000-8000-000000000001'})
 assert.equal(s.course.current.status,'safety_hold')
})

test('short recognized urgent text interrupts a later written-plan question',async()=>{
 const {api}=fixture()
 let s=await api.savePersonalCoaching({},a,{...start,schemeKey:'grow_overload_20_v1'})
 s=await api.savePersonalCoaching({},a,{action:'answer',revision:s.revision,questionId:'action',answer:'suicidio'})
 assert.equal(s.course.current.status,'safety_hold')
 assert.equal((await api.readPersonalCoaching({},a)).course.current.status,'safety_hold')
})

test('actual server-state code validates and persists chosen authored reflection, rejects forged key and duplicate stage',async()=>{
 const {api}=fixture()
 let s=await api.savePersonalCoaching({},a,start)
 s=await api.savePersonalCoaching({},a,{action:'answer',revision:s.revision,questionId:'real',answer:'choice:time'})
 await assert.rejects(()=>api.savePersonalCoaching({},a,{action:'reflection',revision:s.revision,
  questionId:'real',followupKey:'options_choice_v1',note:'My own clarification'}),
  err=>err.code==='PERSONAL_COACH_REFLECTION_UNAVAILABLE')
 s=await api.savePersonalCoaching({},a,{action:'reflection',revision:s.revision,
  questionId:'real',followupKey:'reality_choice_v1',note:'I can make time on Friday.'})
 assert.equal(s.course.current.reflections.real.text,'I can make time on Friday.')
 await assert.rejects(()=>api.savePersonalCoaching({},a,{action:'reflection',revision:s.revision,
  questionId:'real',followupKey:'reality_choice_v1',note:'Duplicate'}),
  err=>err.code==='PERSONAL_COACH_REFLECTION_UNAVAILABLE')
 const bResult=await api.readPersonalCoaching({},b)
 assert.equal(bResult.course,null)
 assert.equal((await api.readPersonalCoaching({},a)).course.current.reflections.real.text,'I can make time on Friday.')
})

test('editing prior answer invalidates stale reflection; optimistic concurrency stops conflicts',async()=>{
 const {api}=fixture()
 let s=await api.savePersonalCoaching({},a,start)
 s=await api.savePersonalCoaching({},a,{action:'answer',revision:s.revision,questionId:'real',answer:'choice:time'})
 s=await api.savePersonalCoaching({},a,{action:'reflection',revision:s.revision,questionId:'real',
  followupKey:'reality_choice_v1',note:'A concrete example'})
 await assert.rejects(()=>api.savePersonalCoaching({},a,{action:'answer',revision:s.revision-1,
  questionId:'real',answer:'I have a plan'}),err=>err.code==='PERSONAL_COACH_REVISION_CONFLICT')
 s=await api.savePersonalCoaching({},a,{action:'answer',revision:s.revision,questionId:'real',answer:'A different context'})
 assert.equal(s.course.current.reflections.real,undefined)
 assert.equal(s.course.current.answers.real,'A different context')
})

test('user-confirmed plan is impossible before completion, validated after, preserved in prior history',async()=>{
 const {api,store}=fixture()
 let s=await api.savePersonalCoaching({},a,start)
 const fields={goal:'Launch a project',obstacle:'Not enough time',actionText:'Write a one-page brief',
   when:'Friday',confidence:7}
 await assert.rejects(()=>api.savePersonalCoaching({},a,{action:'plan',revision:s.revision,...fields}),
   err=>err.code==='PERSONAL_COACH_INCOMPLETE')
 s=await api.savePersonalCoaching({},a,{action:'answer',revision:s.revision,questionId:'action',answer:'Write a brief'})
 s=await api.savePersonalCoaching({},a,{action:'complete',revision:s.revision})
 assert.equal(s.course.current.status,'completed')
 await assert.rejects(()=>api.savePersonalCoaching({},a,{action:'plan',revision:s.revision,...fields,confidence:11}),
   err=>err.code==='PERSONAL_COACH_PLAN_INVALID')
 await assert.rejects(()=>api.savePersonalCoaching({},a,{action:'plan',revision:s.revision,...fields,actionText:'choice:wrong'}),
   err=>err.code==='PERSONAL_COACH_PLAN_INVALID')
 s=await api.savePersonalCoaching({},a,{action:'plan',revision:s.revision,...fields})
 assert.equal(s.course.current.actionPlan.actionText,'Write a one-page brief')
 assert.equal(s.course.current.actionPlan.confidence,7)
 assert.equal((await api.readPersonalCoaching({},a)).course.current.actionPlan.goal,'Launch a project')
 const revision=s.revision
 s=await api.savePersonalCoaching({},a,{action:'start',revision,schemeKey:'grow_quick_v1',clientQuestion:'My next coaching session question'})
 assert.equal(s.course.history.length,1)
 assert.equal(s.course.history[0].actionPlan.actionText,'Write a one-page brief')
 assert.equal(s.course.current.actionPlan,undefined)
 assert.equal(store.size,1)
 await assert.rejects(()=>api.savePersonalCoaching({},b,{action:'plan',revision:s.revision,...fields}),
   err=>err.code==='PERSONAL_COACH_REVISION_CONFLICT')
})
