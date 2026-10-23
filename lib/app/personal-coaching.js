import 'server-only'
import { randomUUID } from 'node:crypto'
import { transaction } from './database.js'
import { seal, openSealed } from './crypto.js'
import { AppError, onlyKeys } from '../assessments/contracts.js'
import { PERSONAL_COACH_VERSION, PERSONAL_COACH_TEMPLATE, personalCoachQuestion } from '../personal-coaching/questions.js'
import { traditionCourse, traditionEndcaps } from '../personal-coaching/traditions.js'

const sealContext=actor=>({accountId:actor.id,recordId:actor.id,field:'personal.coaching'})
const clock=()=>new Date().toISOString()
const MAX_HISTORY=8
const MAX_TRADITION_HISTORY=4
function revisionNumber(value){
  if(!Number.isSafeInteger(value)||value<0)throw new AppError('PERSONAL_COACH_REVISION_REQUIRED',400)
  return value
}
async function assertAccount(db,actor){
  const row=(await db.query("select id from app.accounts where id=$1 and status='active' and onboarding_state='active'",[actor.id])).rows[0]
  if(!row)throw new AppError('ACCOUNT_REQUIRED',401)
}
async function readRow(db,actor,lock=false){
  return (await db.query('select payload_ciphertext,revision,updated_at from app_private.personal_coaching_sessions where account_id=$1'+(lock?' for update':''),[actor.id])).rows[0]||null
}
function decode(row,actor,config){
  if(!row)return null
  const value=openSealed(row.payload_ciphertext,sealContext(actor),config)
  if(!value||value.version!==PERSONAL_COACH_VERSION||value.template!==PERSONAL_COACH_TEMPLATE||
     !value.current||!Array.isArray(value.history)||value.history.length>MAX_HISTORY)
    throw new AppError('PERSONAL_COACH_VERSION_UNAVAILABLE',503)
  return value
}
function newSession(){
  const now=clock()
  return {id:randomUUID(),status:'active',startedAt:now,updatedAt:now,answers:{}}
}
export async function readPersonalCoaching(config,actor){
  return transaction(config,actor,async db=>{
    await assertAccount(db,actor)
    const row=await readRow(db,actor)
    const course=decode(row,actor,config)
    return {course:course?.current?.status==='not_started'?null:course,revision:row?.revision||0,updatedAt:row?.updated_at||null}
  })
}
export async function savePersonalCoaching(config,actor,input){
  if(!input||typeof input!=='object'||Array.isArray(input))throw new AppError('PERSONAL_COACH_INVALID_INPUT',400)
  const revision=revisionNumber(input.revision)
  if(typeof input.action!=='string')throw new AppError('PERSONAL_COACH_INVALID_ACTION',400)
  return transaction(config,actor,async db=>{
    await assertAccount(db,actor)
    const row=await readRow(db,actor,true)
    if((row?.revision||0)!==revision)throw new AppError('PERSONAL_COACH_REVISION_CONFLICT',409)
    if(input.action==='start'){
      onlyKeys(input,['action','revision'])
      if(!row){
        const course={version:PERSONAL_COACH_VERSION,template:PERSONAL_COACH_TEMPLATE,current:newSession(),history:[]}
        const saved=(await db.query(
          'insert into app_private.personal_coaching_sessions(account_id,payload_ciphertext,revision) values($1,$2,1) on conflict(account_id) do nothing returning revision,updated_at',
          [actor.id,seal(course,sealContext(actor),config)])).rows[0]
        if(!saved)throw new AppError('PERSONAL_COACH_REVISION_CONFLICT',409)
        return {course,revision:saved.revision,updatedAt:saved.updated_at,saved:true}
      }
      const existing=decode(row,actor,config)
      if(existing.current.status==='active')
        return {course:existing,revision:row.revision,updatedAt:row.updated_at,saved:true}
    }
    if(!row)throw new AppError('PERSONAL_COACH_NOT_STARTED',404)
    if(input.action==='delete'){
      onlyKeys(input,['action','revision','confirmed'])
      if(input.confirmed!==true)throw new AppError('PERSONAL_COACH_CONFIRMATION_REQUIRED',400)
      const preserved=decode(row,actor,config)
      if(Object.keys(preserved.traditionTracks||{}).length){
        preserved.current={status:'not_started',answers:{}}
        preserved.history=[]
        const updated=(await db.query(
          'update app_private.personal_coaching_sessions set payload_ciphertext=$2,revision=revision+1,updated_at=now() where account_id=$1 and revision=$3 returning revision,updated_at',
          [actor.id,seal(preserved,sealContext(actor),config),revision])).rows[0]
        if(!updated)throw new AppError('PERSONAL_COACH_REVISION_CONFLICT',409)
        return {course:null,revision:updated.revision,updatedAt:updated.updated_at,deleted:true}
      }
      const deleted=(await db.query(
        'delete from app_private.personal_coaching_sessions where account_id=$1 and revision=$2 returning account_id',
        [actor.id,revision])).rows[0]
      if(!deleted)throw new AppError('PERSONAL_COACH_REVISION_CONFLICT',409)
      return {course:null,revision:0,updatedAt:null,deleted:true}
    }
    const course=decode(row,actor,config)
    if(input.action==='start'){
      if(course.current.status!=='not_started')course.history=[course.current,...course.history].slice(0,MAX_HISTORY)
      course.current=newSession()
    }else if(input.action==='answer'){
      onlyKeys(input,['action','revision','questionId','answer'])
      const question=personalCoachQuestion(input.questionId)
      if(!question||course.current.status!=='active')throw new AppError('PERSONAL_COACH_QUESTION_UNAVAILABLE',409)
      if(input.answer!==null && (typeof input.answer!=='string'||input.answer.length>1000||
         /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(input.answer)))
        throw new AppError('PERSONAL_COACH_INVALID_ANSWER',400)
      if(input.answer===null && question.required)throw new AppError('PERSONAL_COACH_ANSWER_REQUIRED',400)
      const answer=input.answer===null?null:input.answer.trim()
      if(answer!==null&&answer.length>800)throw new AppError('PERSONAL_COACH_INVALID_ANSWER',400)
      if(question.required&&(!answer||answer.length<3))throw new AppError('PERSONAL_COACH_ANSWER_REQUIRED',400)
      course.current.answers={...course.current.answers,[question.id]:answer}
    }else if(input.action==='complete'){
      onlyKeys(input,['action','revision'])
      if(course.current.status!=='active'||!['topic','first_step'].every(key=>
        typeof course.current.answers[key]==='string'&&course.current.answers[key].length>=3))
        throw new AppError('PERSONAL_COACH_INCOMPLETE',409)
      course.current.status='completed'
      course.current.completedAt=clock()
    }else throw new AppError('PERSONAL_COACH_INVALID_ACTION',400)
    course.current.updatedAt=clock()
    const saved=(await db.query(
      'update app_private.personal_coaching_sessions set payload_ciphertext=$2,revision=revision+1,updated_at=now() where account_id=$1 and revision=$3 returning revision,updated_at',
      [actor.id,seal(course,sealContext(actor),config),revision])).rows[0]
    if(!saved)throw new AppError('PERSONAL_COACH_REVISION_CONFLICT',409)
    return {course,revision:saved.revision,updatedAt:saved.updated_at,saved:true}
  })
}

const COACHING_COURSE_KEY_ERROR='COACHING_COURSE_NOT_FOUND'
function getTradition(template){
  const item=traditionCourse(template)
  if(!item)throw new AppError(COACHING_COURSE_KEY_ERROR,404)
  return item
}
function startEnvelope(){
  return {version:PERSONAL_COACH_VERSION,template:PERSONAL_COACH_TEMPLATE,
    current:{status:'not_started',answers:{}},history:[],traditionTracks:{}}
}
function cleanTraditionAnswer(input,question){
  if(input===null){
    if(question.required)throw new AppError('COACHING_ANSWER_REQUIRED',400)
    return null
  }
  if(!input||typeof input!=='object'||Array.isArray(input))throw new AppError('COACHING_ANSWER_INVALID',400)
  onlyKeys(input,['choiceId','note'])
  const choices=Array.isArray(question.choices)?question.choices:[]
  if(typeof input.choiceId!=='string'||!choices.some(item=>item.id===input.choiceId))
    throw new AppError('COACHING_CHOICE_INVALID',400)
  const note=typeof input.note==='string'?input.note.trim():''
  if((input.note!==undefined&&typeof input.note!=='string')||note.length>500||
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(note))
    throw new AppError('COACHING_ANSWER_INVALID',400)
  return {choiceId:input.choiceId,note}
}
async function readTraditionQuestions(db,course){
  const rows=(await db.query(`
    select st.step_key, st.title_i18n, st.emphasis_i18n,
      q.question_key, q.prompt_i18n, a.choices
    from app_private.coaching_schemes s
    join lateral unnest(s.step_keys) with ordinality as ordered(step_key,ordinal) on true
    join app_private.coaching_steps st
      on st.model_key=s.model_key and st.step_key=ordered.step_key
    join app_private.coaching_questions q
      on q.model_key=st.model_key and q.step_key=st.step_key
    join app_private.coaching_answer_sets a on a.answer_set_key=q.answer_set_key
    where s.scheme_key=$1 and s.model_key=$2 and q.core=true
    order by ordered.ordinal, q.position
  `,[course.schemeKey,course.modelKey])).rows
  if(rows.length!==course.totalScreens-2 || rows.some(row=>
      !Array.isArray(row.choices)||row.choices.length<2 ||
      !['en','ru','es'].every(l=>row.prompt_i18n?.[l]&&row.title_i18n?.[l])))
    throw new AppError('COACHING_COURSE_CONTENT_UNAVAILABLE',503)
  const endcaps=traditionEndcaps(course)
  return [endcaps[0],...rows.map(row=>({
    id:row.question_key,stage:row.step_key,title:row.title_i18n,
    hint:row.emphasis_i18n,question:row.prompt_i18n,choices:row.choices,
    required:false
  })),endcaps[1]]
}
function visibleTradition(envelope,template){
  return envelope?.traditionTracks?.[template]||null
}
export async function readTraditionCoaching(config,actor,template){
  const def=getTradition(template)
  return transaction(config,actor,async db=>{
    await assertAccount(db,actor)
    const questions=await readTraditionQuestions(db,def)
    const row=await readRow(db,actor)
    return {course:visibleTradition(decode(row,actor,config),template),
      questions,definition:def,revision:row?.revision||0,updatedAt:row?.updated_at||null}
  })
}
export async function saveTraditionCoaching(config,actor,template,input){
  const def=getTradition(template)
  if(!input||typeof input!=='object'||Array.isArray(input))throw new AppError('COACHING_ANSWER_INVALID',400)
  const revision=revisionNumber(input.revision)
  if(!['start','answer','complete','delete'].includes(input.action))
    throw new AppError('COACHING_ACTION_INVALID',400)
  return transaction(config,actor,async db=>{
    await assertAccount(db,actor)
    const questions=await readTraditionQuestions(db,def)
    const row=await readRow(db,actor,true)
    if((row?.revision||0)!==revision)throw new AppError('PERSONAL_COACH_REVISION_CONFLICT',409)
    const course=decode(row,actor,config)||startEnvelope()
    if(!course.traditionTracks)course.traditionTracks={}
    const current=visibleTradition(course,template)
    if(input.action==='start'){
      onlyKeys(input,['action','revision'])
      if(current?.current?.status==='active')
        return {course:current,questions,definition:def,revision:row.revision,updatedAt:row.updated_at,saved:true}
      const history=current?.current?[
        current.current,...(current.history||[])
      ].slice(0,MAX_TRADITION_HISTORY):[]
      course.traditionTracks[template]={version:1,template,current:newSession(),history}
    } else if(input.action==='delete'){
      onlyKeys(input,['action','revision','confirmed'])
      if(input.confirmed!==true)throw new AppError('COACHING_CONFIRMATION_REQUIRED',400)
      if(!current) return {course:null,questions,definition:def,revision,updatedAt:row?.updated_at||null,deleted:true}
      delete course.traditionTracks[template]
    } else {
      if(!current||current.current.status!=='active')throw new AppError('COACHING_SESSION_NOT_ACTIVE',409)
      if(input.action==='answer'){
        onlyKeys(input,['action','revision','questionId','answer'])
        const question=questions.find(item=>item.id===input.questionId)
        if(!question)throw new AppError('COACHING_QUESTION_INVALID',400)
        current.current.answers={...current.current.answers,
          [question.id]:cleanTraditionAnswer(input.answer,question)}
      }else{
        onlyKeys(input,['action','revision'])
        const required=questions.filter(item=>item.required)
        if(!required.every(item=>current.current.answers?.[item.id]?.choiceId))
          throw new AppError('COACHING_SESSION_INCOMPLETE',409)
        current.current.status='completed'
        current.current.completedAt=clock()
      }
      current.current.updatedAt=clock()
    }
    let saved
    if(!row){
      saved=(await db.query(
        'insert into app_private.personal_coaching_sessions(account_id,payload_ciphertext,revision) values($1,$2,1) on conflict(account_id) do nothing returning revision,updated_at',
        [actor.id,seal(course,sealContext(actor),config)])).rows[0]
    }else{
      saved=(await db.query(
        'update app_private.personal_coaching_sessions set payload_ciphertext=$2,revision=revision+1,updated_at=now() where account_id=$1 and revision=$3 returning revision,updated_at',
        [actor.id,seal(course,sealContext(actor),config),revision])).rows[0]
    }
    if(!saved)throw new AppError('PERSONAL_COACH_REVISION_CONFLICT',409)
    return {course:visibleTradition(course,template),questions,definition:def,
      revision:saved.revision,updatedAt:saved.updated_at,saved:true,
      ...(input.action==='delete'?{deleted:true}:{})}
  })
}
