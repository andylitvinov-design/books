import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {runInNewContext} from 'node:vm'
import {createHash} from 'node:crypto'
import {authoredFollowupFor} from '../lib/personal-coaching/offline-intelligence.js'
import {isCoachingSafetyConcern} from '../lib/personal-coaching/model-matcher.js'
import {normalizeClientCoachingContext} from '../lib/personal-coaching/client-context.mjs'

const source=readFileSync(new URL('../lib/app/personal-coaching.js',import.meta.url),'utf8')
const server=source.replace(/^import[^\n]*\n/gm,'').replace(/^export /gm,'')
const a={id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'}
const b={id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'}

function fixture(){
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
  transaction,seal:value=>JSON.stringify(value),openSealed:value=>JSON.parse(value),
  AppError:error,onlyKeys:(value,keys)=>{
   if(Object.keys(value).some(key=>!keys.includes(key)))throw error('UNKNOWN_FIELD',400)
  },
  PERSONAL_COACH_VERSION:1,PERSONAL_COACH_TEMPLATE:'hh-personal-coaching-v1',
  personalCoachQuestion:()=>null,TRADITION_COURSES:[],
  traditionCourse:()=>null,traditionEndcaps:()=>[],
  loadSchemeQuestions:async(_db,schemeKey)=>['grow_quick_v1','grow_overload_20_v1'].includes(schemeKey)
   ?{schemeKey,modelKey:'grow_v1',questions:schemeKey==='grow_overload_20_v1'?questions.map(q=>q.id==='action'?{...q,stepKey:'will'}:q):questions,requiredCustomPlan:schemeKey==='grow_overload_20_v1'}:null,
  authoredFollowupFor,isCoachingSafetyConcern,normalizeClientCoachingContext,createHash,
 }
 const factory=runInNewContext('(deps)=>{const {randomUUID,createHash,transaction,seal,openSealed,AppError,onlyKeys,PERSONAL_COACH_VERSION,PERSONAL_COACH_TEMPLATE,personalCoachQuestion,TRADITION_COURSES,traditionCourse,traditionEndcaps,loadSchemeQuestions,authoredFollowupFor,isCoachingSafetyConcern,normalizeClientCoachingContext}=deps;'+server+';return {readPersonalCoaching,savePersonalCoaching}}')
 return {api:factory(deps),store}
}
const start={action:'start',revision:0,schemeKey:'grow_quick_v1',clientQuestion:'How can I plan my new project?'}

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

test('overload pilot rejects jumping ahead but permits editing a previously answered question',async()=>{
 const {api}=fixture()
 let s=await api.savePersonalCoaching({},a,{...start,schemeKey:'grow_overload_20_v1'})
 const id=n=>`10000000-0000-4000-8000-${String(n).padStart(12,'0')}`
 await assert.rejects(()=>api.savePersonalCoaching({},a,{action:'answer',revision:s.revision,questionId:'real',answer:'choice:time'}),err=>err.code==='PERSONAL_COACH_INVALID_TURN_ID')
 await assert.rejects(()=>api.savePersonalCoaching({},a,{action:'answer',revision:s.revision,questionId:'action',answer:'A premature step',turnId:id(1)}),err=>err.code==='PERSONAL_COACH_QUESTION_OUT_OF_ORDER')
 s=await api.savePersonalCoaching({},a,{action:'answer',revision:s.revision,questionId:'real',answer:'choice:time',turnId:id(2)})
 s=await api.savePersonalCoaching({},a,{action:'answer',revision:s.revision,questionId:'options',answer:null,turnId:id(3)})
 s=await api.savePersonalCoaching({},a,{action:'answer',revision:s.revision,questionId:'real',answer:'Updated context',turnId:id(4)})
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
 for(const [n,questionId,answer] of [[1,'real','choice:time'],[2,'options',null],[3,'action','Write a concrete first step'],[4,'review','choice:useful']])
  s=await api.savePersonalCoaching({},a,{action:'answer',revision:s.revision,questionId,answer,turnId:id(n)})
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
 for(const [n,questionId,answer] of [[1,'real','choice:time'],[2,'options',null],[3,'action','short'],[4,'review','choice:useful']])
  s=await api.savePersonalCoaching({},a,{action:'answer',revision:s.revision,questionId,answer,turnId:id(n)})
 await assert.rejects(()=>api.savePersonalCoaching({},a,{action:'complete',revision:s.revision}),err=>err.code==='PERSONAL_COACH_WOOP_PLAN_REQUIRED')
})

test('urgent answer interrupts even when sent for a later valid question',async()=>{
 const {api}=fixture()
 let s=await api.savePersonalCoaching({},a,{...start,schemeKey:'grow_overload_20_v1'})
 s=await api.savePersonalCoaching({},a,{action:'answer',revision:s.revision,questionId:'action',answer:'I want to kill myself',turnId:'10000000-0000-4000-8000-000000000001'})
 assert.equal(s.course.current.status,'safety_hold')
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
