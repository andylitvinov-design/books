import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {runInNewContext} from 'node:vm'
import {TRADITION_COURSES,traditionCourse,traditionEndcaps} from '../lib/personal-coaching/traditions.js'

const source=readFileSync(new URL('../lib/app/personal-coaching.js',import.meta.url),'utf8')
const server=source.replace(/^import[^\n]*\n/gm,'').replace(/^export /gm,'')
const actorA={id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'}
const actorB={id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'}

function fixture(){
 const store=new Map()
 const failures=[]
 const choices=traditionEndcaps(TRADITION_COURSES[0])[0].choices
 const labels={en:'A goal question',ru:'Вопрос о цели',es:'Pregunta sobre meta'}
 const titles={en:'Step',ru:'Этап',es:'Etapa'}
 const sets=new Map(TRADITION_COURSES.map(c=>[c.schemeKey,
   Array.from({length:c.totalScreens-2},(_,i)=>({
     step_key:'stage_'+(i+1),title_i18n:titles,emphasis_i18n:labels,
     question_key:'item_'+(i+1),prompt_i18n:labels,choices
   }))
 ]))
 let count=0
 const transaction=async(_config,actor,fn)=>fn({
   query:async(sql,params=[])=>{
     if(sql.includes('select id from app.accounts'))return {rows:[{id:actor.id}]}
     if(sql.includes('select payload_ciphertext,revision,updated_at from app_private.personal_coaching_sessions')){
       const row=store.get(params[0]);return {rows:row?[{...row}]:[]}
     }
     if(sql.includes('select st.step_key')&&sql.includes('app_private.coaching_schemes')){
       return {rows:sets.get(params[0])||[]}
     }
     if(sql.includes('insert into app_private.personal_coaching_sessions')){
       if(store.has(params[0]))return {rows:[]}
       const row={payload_ciphertext:params[1],revision:1,updated_at:new Date().toISOString()}
       store.set(params[0],row);return {rows:[{revision:row.revision,updated_at:row.updated_at}]}
     }
     if(sql.includes('update app_private.personal_coaching_sessions')){
       const row=store.get(params[0])
       if(!row||row.revision!==params[2])return {rows:[]}
       row.payload_ciphertext=params[1];row.revision++;row.updated_at=new Date().toISOString()
       return {rows:[{revision:row.revision,updated_at:row.updated_at}]}
     }
     if(sql.includes('delete from app_private.personal_coaching_sessions')){
       const row=store.get(params[0])
       if(!row||row.revision!==params[1])return {rows:[]}
       store.delete(params[0]);return {rows:[{account_id:params[0]}]}
     }
     failures.push(sql);throw new Error('Unrecognized SQL')
   }
 })
 function makeError(code,status){return Object.assign(new Error(code),{code,status})}
 const deps={
   randomUUID:()=>String(++count).padStart(36,'0'),
   transaction,
   seal:value=>JSON.stringify(value),
   openSealed:value=>JSON.parse(value),
   AppError:makeError,
   onlyKeys:(obj,keys)=>{if(Object.keys(obj).some(key=>!keys.includes(key)))throw makeError('UNRECOGNIZED_FIELD',400)},
   PERSONAL_COACH_VERSION:1,
   PERSONAL_COACH_TEMPLATE:'hh-personal-coaching-v1',
   personalCoachQuestion:id=>['topic','outcome','reality','obstacle','options','first_step','when'].includes(id)
     ? {id,required:['topic','first_step'].includes(id)}:null,
   traditionCourse,traditionEndcaps,TRADITION_COURSES
 }
 const compiled=runInNewContext('(deps)=>{const {randomUUID,transaction,seal,openSealed,AppError,onlyKeys,PERSONAL_COACH_VERSION,PERSONAL_COACH_TEMPLATE,personalCoachQuestion,traditionCourse,traditionEndcaps,TRADITION_COURSES}=deps;'+server+';return {readPersonalCoaching,savePersonalCoaching,readTraditionCoaching,saveTraditionCoaching,readTraditionCoachingSummaries}}')
 return {actions:compiled(deps),store,failures}
}

test('Egyptian and Greek survive cross-course save, reload and GROW deletion; no second table',async()=>{
 const {actions,store,failures}=fixture()
 const config={}
 const e='hh-egyptian-goal-planning-v1',g='hh-greek-goal-planning-v1'
 let start=await actions.readTraditionCoaching(config,actorA,e)
 assert.equal(start.questions.length,11)
 assert.equal(start.course,null)
 let egypt=await actions.saveTraditionCoaching(config,actorA,e,{action:'start',revision:0})
 assert.equal(egypt.revision,1)
 egypt=await actions.saveTraditionCoaching(config,actorA,e,{action:'answer',revision:egypt.revision,
   questionId:'goal',answer:{choiceId:'personal',note:'A private goal'}})
 assert.equal((await actions.readTraditionCoaching(config,actorA,e)).course.current.answers.goal.note,'A private goal')
 await assert.rejects(()=>actions.saveTraditionCoaching(config,actorA,e,{action:'answer',revision:1,
   questionId:'goal',answer:{choiceId:'personal',note:'stale'}}),err=>err.code==='PERSONAL_COACH_REVISION_CONFLICT')
 let greek=await actions.saveTraditionCoaching(config,actorA,g,{action:'start',revision:egypt.revision})
 assert.equal(greek.questions.length,10)
 greek=await actions.saveTraditionCoaching(config,actorA,g,{action:'answer',revision:greek.revision,
   questionId:'goal',answer:{choiceId:'personal',note:''}})
 greek=await actions.saveTraditionCoaching(config,actorA,g,{action:'answer',revision:greek.revision,
   questionId:'action_24h',answer:{choiceId:'message',note:'Tomorrow'}})
 greek=await actions.saveTraditionCoaching(config,actorA,g,{action:'complete',revision:greek.revision})
 assert.equal(greek.course.current.status,'completed')
 assert.equal((await actions.readTraditionCoaching(config,actorA,e)).course.current.answers.goal.note,'A private goal')
 assert.equal((await actions.readTraditionCoaching(config,actorB,g)).course,null)
 let grow=await actions.savePersonalCoaching(config,actorA,{action:'start',revision:greek.revision})
 assert.equal(grow.course.current.status,'active')
 grow=await actions.savePersonalCoaching(config,actorA,{action:'delete',revision:grow.revision,confirmed:true})
 assert.equal(grow.course,null)
 assert.equal((await actions.readPersonalCoaching(config,actorA)).course,null)
 assert.equal((await actions.readTraditionCoaching(config,actorA,e)).course.current.answers.goal.note,'A private goal')
 const summary=await actions.readTraditionCoachingSummaries(config,actorA)
 assert.equal(summary.courses.length,2)
 assert.equal(summary.courses.find(c=>c.template===g).status,'completed')
 assert.equal(summary.courses.find(c=>c.template===g).completed,10)
 assert.equal(summary.courses.find(c=>c.template===e).completed,1)
 assert.equal('answers' in summary.courses[0],false)
 assert.equal(store.size,1,'one owner-encrypted record')
 assert.equal(failures.length,0)
})
test('rejects invented choices and excessive notes; deleting Greek keeps Egyptian and GROW',async()=>{
 const {actions}=fixture()
 const config={},e='hh-egyptian-goal-planning-v1',g='hh-greek-goal-planning-v1'
 let e0=await actions.saveTraditionCoaching(config,actorA,e,{action:'start',revision:0})
 let g0=await actions.saveTraditionCoaching(config,actorA,g,{action:'start',revision:e0.revision})
 await assert.rejects(()=>actions.saveTraditionCoaching(config,actorA,g,{action:'answer',revision:g0.revision,
   questionId:'goal',answer:{choiceId:'forged',note:''}}),err=>err.code==='COACHING_CHOICE_INVALID')
 await assert.rejects(()=>actions.saveTraditionCoaching(config,actorA,g,{action:'answer',revision:g0.revision,
   questionId:'goal',answer:{choiceId:'personal',note:'x'.repeat(501)}}),err=>err.code==='COACHING_ANSWER_INVALID')
 await assert.rejects(()=>actions.saveTraditionCoaching(config,actorA,g,{action:'complete',revision:g0.revision}),
   err=>err.code==='COACHING_SESSION_INCOMPLETE')
 let del=await actions.saveTraditionCoaching(config,actorA,g,{action:'delete',revision:g0.revision,confirmed:true})
 assert.equal(del.course,null)
 assert.equal((await actions.readTraditionCoaching(config,actorA,e)).course.current.status,'active')
 await assert.rejects(()=>actions.readTraditionCoaching(config,actorA,'unknown'),err=>err.code==='COACHING_COURSE_NOT_FOUND')
})

test('selected request topic is owner scoped, and sexual subject requires adult confirmation',async()=>{
 const {actions,store}=fixture()
 const config={},template='hh-egyptian-goal-planning-v1'
 await assert.rejects(()=>actions.saveTraditionCoaching(config,actorA,template,{
   action:'start',revision:0,clientTopic:'unknown-model-topic'
 }),err=>err.code==='PERSONAL_COACH_INVALID_TOPIC')
 await assert.rejects(()=>actions.saveTraditionCoaching(config,actorA,template,{
   action:'start',revision:0,clientTopic:'sexuality'
 }),err=>err.code==='PERSONAL_COACH_ADULT_CONFIRMATION_REQUIRED')
 assert.equal(store.size,0,'invalid topic and missing adult opt-in create no private rows')
 const value=await actions.saveTraditionCoaching(config,actorA,template,{
   action:'start',revision:0,clientTopic:'love'
 })
 assert.equal(value.course.current.clientTopic,'love')
 const resumed=await actions.readTraditionCoaching(config,actorA,template)
 assert.equal(resumed.course.current.clientTopic,'love','round-trip retained in owner ciphertext')
 assert.equal((await actions.readTraditionCoaching(config,actorB,template)).course,null)
 const resumedAgain=await actions.saveTraditionCoaching(config,actorA,template,{
   action:'start',revision:value.revision,clientTopic:'money'
 })
 assert.equal(resumedAgain.course.current.clientTopic,'love','resume never silently overwrites the selected topic')
})

test('symbolic post-orientation answers and next step can be text-only, encrypted per owner',async()=>{
  const {actions}=fixture(),template='hh-egyptian-goal-planning-v1',config={}
  let r=await actions.saveTraditionCoaching(config,actorA,template,{action:'start',revision:0})
  await assert.rejects(()=>actions.saveTraditionCoaching(config,actorA,template,{
    action:'answer',revision:r.revision,questionId:'goal',answer:{choiceId:'',note:'My own goal'}
  }),e=>e.code==='COACHING_CHOICE_INVALID')
  r=await actions.saveTraditionCoaching(config,actorA,template,{action:'answer',revision:r.revision,
    questionId:'goal',answer:{choiceId:'personal',note:'I want clarity'}})
  await assert.rejects(()=>actions.saveTraditionCoaching(config,actorA,template,{
    action:'answer',revision:r.revision,questionId:'item_1',answer:{choiceId:'',note:'No'}
  }),e=>e.code==='COACHING_CHOICE_INVALID')
  r=await actions.saveTraditionCoaching(config,actorA,template,{action:'answer',revision:r.revision,
    questionId:'item_1',answer:{choiceId:'',note:'I notice this change when I slow down.'}})
  r=await actions.saveTraditionCoaching(config,actorA,template,{action:'answer',revision:r.revision,
    questionId:'action_24h',answer:{choiceId:'',note:'Write down my first small action.'}})
  const saved=await actions.readTraditionCoaching(config,actorA,template)
  assert.equal(saved.course.current.answers.item_1.choiceId,'')
  assert.match(saved.course.current.answers.item_1.note,/when I slow down/)
  assert.equal((await actions.readTraditionCoaching(config,actorB,template)).course,null)
  r=await actions.saveTraditionCoaching(config,actorA,template,{action:'complete',revision:r.revision})
  assert.equal(r.course.current.status,'completed')
  assert.match(r.course.current.answers.action_24h.note,/Write down/)
})
