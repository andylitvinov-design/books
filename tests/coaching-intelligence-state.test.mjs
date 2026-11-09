import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {runInNewContext} from 'node:vm'
import {authoredFollowupFor,contextualCoachingFollowup} from '../lib/personal-coaching/offline-intelligence.js'

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
  loadSchemeQuestions:async(_db,schemeKey)=>schemeKey==='grow_quick_v1'
   ?{schemeKey,modelKey:'grow_v1',questions,requiredCustomPlan:false}:null,
  authoredFollowupFor,contextualCoachingFollowup,
 }
 const factory=runInNewContext('(deps)=>{const {randomUUID,transaction,seal,openSealed,AppError,onlyKeys,PERSONAL_COACH_VERSION,PERSONAL_COACH_TEMPLATE,personalCoachQuestion,TRADITION_COURSES,traditionCourse,traditionEndcaps,loadSchemeQuestions,authoredFollowupFor,contextualCoachingFollowup}=deps;'+server+';return {readPersonalCoaching,savePersonalCoaching}}')
 return {api:factory(deps),store}
}
const start={action:'start',revision:0,schemeKey:'grow_quick_v1',clientQuestion:'How can I plan my new project?'}

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


test('v2 contextual key must match actual saved selected answer, preserving v1 tabs',async()=>{
 const {api}=fixture()
 let s=await api.savePersonalCoaching({},a,start)
 s=await api.savePersonalCoaching({},a,{action:'answer',revision:s.revision,questionId:'real',answer:'choice:time'})
 await assert.rejects(()=>api.savePersonalCoaching({},a,{
   action:'reflection',revision:s.revision,questionId:'real',
   followupKey:'reality_confidence_v2',note:'Forged choice',
 }),err=>err.code==='PERSONAL_COACH_REFLECTION_UNAVAILABLE')
 s=await api.savePersonalCoaching({},a,{action:'reflection',revision:s.revision,
   questionId:'real',followupKey:'reality_time_v2',note:'Time tends to be tight before work'})
 assert.equal(s.course.current.reflections.real.key,'reality_time_v2')
 assert.equal((await api.readPersonalCoaching({},a)).course.current.reflections.real.text,'Time tends to be tight before work')
})


test('editing a source answer invalidates downstream combination notes, not other answers',async()=>{
 const {api}=fixture()
 let s=await api.savePersonalCoaching({},a,start)
 s=await api.savePersonalCoaching({},a,{action:'answer',revision:s.revision,questionId:'real',answer:'choice:time'})
 s=await api.savePersonalCoaching({},a,{action:'answer',revision:s.revision,questionId:'options',answer:'choice:try'})
 s=await api.savePersonalCoaching({},a,{action:'reflection',revision:s.revision,
   questionId:'options',followupKey:'options_time_v2',note:'Five-minute trial'})
 assert.equal(s.course.current.reflections.options.key,'options_time_v2')
 const oldOptions=s.course.current.answers.options
 s=await api.savePersonalCoaching({},a,{action:'answer',revision:s.revision,
   questionId:'real',answer:'The issue is something different'})
 assert.equal(s.course.current.reflections.options,undefined)
 assert.equal(s.course.current.answers.options,oldOptions,'keep answers; only dependent reflections are dropped')
})
