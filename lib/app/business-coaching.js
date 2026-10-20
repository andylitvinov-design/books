import 'server-only'
import { randomUUID } from 'node:crypto'
import { transaction } from './database.js'
import { seal, openSealed } from './crypto.js'
import { AppError, onlyKeys } from '../assessments/contracts.js'
import { BUSINESS_COURSE_VERSION, BUSINESS_SNAPSHOT_VERSION, BUSINESS_TRACKS, BUSINESS_METRICS, BUSINESS_QUESTIONS } from '../business-coaching/program.js'

const allQuestions=new Set(BUSINESS_QUESTIONS.map(q=>q.id))
const allMetrics=new Map(BUSINESS_METRICS.map(m=>[m.id,m]))
const trackIds=new Set(BUSINESS_TRACKS.map(t=>t.id))
const context=actor=>({accountId:actor.id,recordId:actor.id,field:'business.coaching'})
const today=()=>new Date().toISOString().slice(0,10)
const isoNow=()=>new Date().toISOString()
function text(value,max=500,{required=false}={}) {
  if(typeof value!=='string'||value.length>max*2) throw new AppError('INVALID_BUSINESS_INPUT',400)
  const cleaned=value.trim()
  if(cleaned.length>max||(required&&cleaned.length<4))throw new AppError('INVALID_BUSINESS_INPUT',400)
  return cleaned
}
function numRevision(value) {
  if(!Number.isSafeInteger(value)||value<0)throw new AppError('BUSINESS_REVISION_REQUIRED',400)
  return value
}
function validDate(value) {
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)||
      new Date(value+'T00:00:00.000Z').toISOString().slice(0,10)!==value)
    throw new AppError('INVALID_BUSINESS_PERIOD',400)
  return value
}
function surveyAnswers(value) {
  if(!value||typeof value!=='object'||Array.isArray(value))throw new AppError('INVALID_BUSINESS_SURVEY',400)
  if(Object.keys(value).length>BUSINESS_QUESTIONS.length)throw new AppError('INVALID_BUSINESS_SURVEY',400)
  const answers={}
  for(const [key,v] of Object.entries(value)){
    if(!allQuestions.has(key)||!Number.isInteger(v)||v<0||v>4)throw new AppError('INVALID_BUSINESS_SURVEY',400)
    answers[key]=v
  }
  return answers
}
function newGoal(input) {
  onlyKeys(input,['action','revision','consent','track','primaryGoal','supportingGoal','habit','metric','target','currency','answers'])
  if(!trackIds.has(input.track)||input.consent!==true)throw new AppError('BUSINESS_CONSENT_REQUIRED',400)
  if(input.metric!=null&&!allMetrics.has(input.metric))throw new AppError('INVALID_BUSINESS_METRIC',400)
  const target=input.target===null||input.target===undefined?null:Number(input.target)
  if(target!==null&&(!Number.isFinite(target)||target<0||target>1e12))throw new AppError('INVALID_BUSINESS_TARGET',400)
  const currency=input.currency==null?'CAD':text(input.currency,3)
  if(!/^[A-Z]{3}$/.test(currency))throw new AppError('INVALID_BUSINESS_CURRENCY',400)
  return {
    track:input.track,
    primaryGoal:text(input.primaryGoal,240,{required:true}),
    supportingGoal:text(input.supportingGoal||'',180),
    habit:text(input.habit||'',180),
    metric:input.metric||null,
    target, currency,
  }
}
async function assertActive(db,actor) {
  const row=(await db.query("select id from app.accounts where id=$1 and status='active' and onboarding_state='active'",[actor.id])).rows[0]
  if(!row)throw new AppError('ACCOUNT_REQUIRED',401)
}
async function loadRow(db,actor,lock=false) {
  return (await db.query('select payload_ciphertext,revision,updated_at from app_private.business_coaching_programs where account_id=$1'+(lock?' for update':''),[actor.id])).rows[0]||null
}
function decode(row,actor,config) {
  if(!row)return null
  const course=openSealed(row.payload_ciphertext,context(actor),config)
  if(!course||course.version!==BUSINESS_COURSE_VERSION||course.template!=='hh-business-90-v1')
    throw new AppError('BUSINESS_VERSION_UNAVAILABLE',503)
  return course
}
export async function readBusinessCoaching(config,actor) {
  return transaction(config,actor,async db=>{
    await assertActive(db,actor)
    const row=await loadRow(db,actor)
    return { course:decode(row,actor,config),revision:row?.revision||0,updatedAt:row?.updated_at||null }
  })
}
export async function saveBusinessCoaching(config,actor,input) {
  if(!input||typeof input!=='object'||Array.isArray(input))throw new AppError('INVALID_BUSINESS_INPUT',400)
  const revision=numRevision(input.revision)
  if(typeof input.action!=='string')throw new AppError('INVALID_BUSINESS_ACTION',400)
  return transaction(config,actor,async db=>{
    await assertActive(db,actor)
    const row=await loadRow(db,actor,true)
    if((row?.revision||0)!==revision)throw new AppError('BUSINESS_REVISION_CONFLICT',409)
    if(input.action==='start'){
      if(row||revision!==0)throw new AppError('BUSINESS_ALREADY_STARTED',409)
      const goal=newGoal(input)
      const answers=surveyAnswers(input.answers||{})
      const now=isoNow()
      const course={
        version:BUSINESS_COURSE_VERSION, template:'hh-business-90-v1',
        locale:'en', status:'active', startedAt:now, updatedAt:now,
        track:goal.track, goal, originalGoal:{...goal}, goalHistory:[],
        surveys:Object.keys(answers).length?[{version:BUSINESS_SNAPSHOT_VERSION,recordedAt:now,referenceDays:14,answers}]:[],
        days:{}, metrics:[],reviews:{},
      }
      const result=(await db.query(
        'insert into app_private.business_coaching_programs(account_id,payload_ciphertext,revision) values($1,$2,1) on conflict(account_id) do nothing returning revision,updated_at',
        [actor.id,seal(course,context(actor),config)])).rows[0]
      if(!result)throw new AppError('BUSINESS_REVISION_CONFLICT',409)
      return {course,revision:result.revision,updatedAt:result.updated_at,saved:true}
    }
    if(!row)throw new AppError('BUSINESS_NOT_STARTED',404)
    const course=decode(row,actor,config)
    if(input.action==='day'){
      onlyKeys(input,['action','revision','day','done','note'])
      if(course.status!=='active'||!Number.isInteger(input.day)||input.day<1||input.day>90||
         typeof input.done!=='boolean')throw new AppError('INVALID_BUSINESS_DAY',400)
      course.days={...course.days,[input.day]:{done:input.done,note:text(input.note||'',900),updatedAt:isoNow()}}
    }else if(input.action==='weekly-review'){
      onlyKeys(input,['action','revision','week','note'])
      if(course.status!=='active'||!Number.isInteger(input.week)||input.week<1||input.week>13)
        throw new AppError('INVALID_BUSINESS_WEEK',400)
      course.reviews={...course.reviews,[input.week]:{note:text(input.note||'',1500),updatedAt:isoNow()}}
    }else if(input.action==='metric'){
      onlyKeys(input,['action','revision','metric','value','from','to','currency'])
      const def=allMetrics.get(input.metric)
      const from=validDate(input.from),to=validDate(input.to)
      const value=Number(input.value)
      const days=(Date.parse(to)-Date.parse(from))/86400000
      if(!def||course.metrics.length>=160||!Number.isFinite(value)||value<0||value>1e12||
        from>to||to>today()||days>366||(def.unit==='count'&&!Number.isInteger(value)))
        throw new AppError('INVALID_BUSINESS_METRIC',400)
      const currency=def.unit==='money'?text(input.currency||course.goal.currency,3):null
      if(currency&&!/^[A-Z]{3}$/.test(currency))throw new AppError('INVALID_BUSINESS_CURRENCY',400)
      course.metrics=[...course.metrics,{id:randomUUID(),metric:def.id,value,from,to,unit:def.unit,currency,recordedAt:isoNow()}]
    }else if(input.action==='survey'){
      onlyKeys(input,['action','revision','answers'])
      if(course.status==='completed'||course.surveys.length>=8)throw new AppError('BUSINESS_SURVEY_UNAVAILABLE',409)
      const answers=surveyAnswers(input.answers)
      if(Object.keys(answers).length<6)throw new AppError('BUSINESS_SURVEY_INCOMPLETE',400)
      const last=course.surveys.at(-1)
      if(last&&Date.now()-Date.parse(last.recordedAt)<21*86400000)
        throw new AppError('BUSINESS_SURVEY_NOT_DUE',409)
      course.surveys=[...course.surveys,{version:BUSINESS_SNAPSHOT_VERSION,recordedAt:isoNow(),referenceDays:14,answers}]
    }else if(input.action==='goal'){
      onlyKeys(input,['action','revision','primaryGoal','supportingGoal','habit','metric','target','currency'])
      if(course.status==='completed'||course.goalHistory.length>=24)throw new AppError('BUSINESS_GOAL_UNAVAILABLE',409)
      const revised=newGoal({...input,track:course.track,consent:true})
      course.goalHistory=[...course.goalHistory,{...course.goal,updatedAt:isoNow()}]
      course.goal=revised
    }else if(['pause','resume','complete'].includes(input.action)){
      onlyKeys(input,['action','revision'])
      if(input.action==='pause'&&course.status==='active')course.status='paused'
      else if(input.action==='resume'&&course.status==='paused')course.status='active'
      else if(input.action==='complete'&&['active','paused'].includes(course.status)) {
        course.status='completed'
        course.completedAt=isoNow()
      }else throw new AppError('BUSINESS_STATUS_CONFLICT',409)
    }else throw new AppError('INVALID_BUSINESS_ACTION',400)
    course.updatedAt=isoNow()
    const updated=(await db.query(
      'update app_private.business_coaching_programs set payload_ciphertext=$2,revision=revision+1,updated_at=now() where account_id=$1 and revision=$3 returning revision,updated_at',
      [actor.id,seal(course,context(actor),config),revision])).rows[0]
    if(!updated)throw new AppError('BUSINESS_REVISION_CONFLICT',409)
    return {course,revision:updated.revision,updatedAt:updated.updated_at,saved:true}
  })
}
