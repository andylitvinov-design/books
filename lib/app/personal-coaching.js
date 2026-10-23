import 'server-only'
import { randomUUID } from 'node:crypto'
import { transaction } from './database.js'
import { seal, openSealed } from './crypto.js'
import { AppError, onlyKeys } from '../assessments/contracts.js'
import { PERSONAL_COACH_VERSION, PERSONAL_COACH_TEMPLATE, personalCoachQuestion } from '../personal-coaching/questions.js'
import { loadSchemeQuestions } from './personal-coaching-catalog.js'

const sealContext=actor=>({accountId:actor.id,recordId:actor.id,field:'personal.coaching'})
const clock=()=>new Date().toISOString()
const MAX_HISTORY=8
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
function cleanText(value,max,errorCode,required=true){
  if(typeof value!=='string'||value.length>max*2||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value))
    throw new AppError(errorCode,400)
  const clean=value.trim()
  if(clean.length>max||(required&&clean.length<1))throw new AppError(errorCode,400)
  return clean
}
function newSession(selection=null){
  const now=clock()
  return {id:randomUUID(),status:'active',startedAt:now,updatedAt:now,answers:{},
    ...(selection?{schemeKey:selection.schemeKey,modelKey:selection.modelKey,
      clientQuestion:selection.clientQuestion,selectionVersion:'hh-coaching-selection-v1'}:{})}
}
async function requestedSelection(db,input){
  if(input.schemeKey===undefined && input.clientQuestion===undefined)return null // legacy clients
  const scheme=await loadSchemeQuestions(db,input.schemeKey,{publishedOnly:true})
  if(!scheme)throw new AppError('PERSONAL_COACH_SCHEME_UNAVAILABLE',400)
  const clientQuestion=cleanText(input.clientQuestion,600,'PERSONAL_COACH_INVALID_QUESTION')
  if(clientQuestion.length<8)throw new AppError('PERSONAL_COACH_INVALID_QUESTION',400)
  return {schemeKey:scheme.schemeKey,modelKey:scheme.modelKey,clientQuestion}
}
async function sessionQuestions(db,session){
  if(!session.schemeKey)return null // pre-selection seven-question GROW sessions continue intact
  const scheme=await loadSchemeQuestions(db,session.schemeKey)
  if(!scheme||scheme.modelKey!==session.modelKey||!scheme.questions.length)
    throw new AppError('PERSONAL_COACH_SCHEME_UNAVAILABLE',503)
  return scheme
}
function validateAnswer(question,input){
  if(input.answer!==null && (typeof input.answer!=='string'||input.answer.length>1000||
       /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(input.answer)))
    throw new AppError('PERSONAL_COACH_INVALID_ANSWER',400)
  if(input.answer===null && question.required)throw new AppError('PERSONAL_COACH_ANSWER_REQUIRED',400)
  const answer=input.answer===null?null:input.answer.trim()
  if(answer!==null&&answer.length>800)throw new AppError('PERSONAL_COACH_INVALID_ANSWER',400)
  if(question.required && (!answer || answer.length<(question.type?1:3)))
    throw new AppError('PERSONAL_COACH_ANSWER_REQUIRED',400)
  if(answer?.startsWith('choice:')&&question.type){
    const optionId=answer.slice(7)
    const valid=question.type==='scale_0_10'
      ? /^(?:10|[0-9])$/.test(optionId)
      : Array.isArray(question.choices)&&question.choices.some(option=>option.id===optionId)
    if(!valid)throw new AppError('PERSONAL_COACH_INVALID_CHOICE',400)
  }
  if(answer?.startsWith('choice:')&&!question.type)
    throw new AppError('PERSONAL_COACH_INVALID_CHOICE',400)
  return answer
}
export async function readPersonalCoaching(config,actor){
  return transaction(config,actor,async db=>{
    await assertAccount(db,actor)
    const row=await readRow(db,actor)
    return {course:decode(row,actor,config),revision:row?.revision||0,updatedAt:row?.updated_at||null}
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
      onlyKeys(input,['action','revision','schemeKey','clientQuestion'])
      const existing=row?decode(row,actor,config):null
      if(existing?.current.status==='active')
        return {course:existing,revision:row.revision,updatedAt:row.updated_at,saved:true}
      const selection=await requestedSelection(db,input)
      if(!row){
        const course={version:PERSONAL_COACH_VERSION,template:PERSONAL_COACH_TEMPLATE,
          current:newSession(selection),history:[]}
        const saved=(await db.query(
          'insert into app_private.personal_coaching_sessions(account_id,payload_ciphertext,revision) values($1,$2,1) on conflict(account_id) do nothing returning revision,updated_at',
          [actor.id,seal(course,sealContext(actor),config)])).rows[0]
        if(!saved)throw new AppError('PERSONAL_COACH_REVISION_CONFLICT',409)
        return {course,revision:saved.revision,updatedAt:saved.updated_at,saved:true}
      }
      const course=existing
      course.history=[course.current,...course.history].slice(0,MAX_HISTORY)
      course.current=newSession(selection)
      course.current.updatedAt=clock()
      const saved=(await db.query(
        'update app_private.personal_coaching_sessions set payload_ciphertext=$2,revision=revision+1,updated_at=now() where account_id=$1 and revision=$3 returning revision,updated_at',
        [actor.id,seal(course,sealContext(actor),config),revision])).rows[0]
      if(!saved)throw new AppError('PERSONAL_COACH_REVISION_CONFLICT',409)
      return {course,revision:saved.revision,updatedAt:saved.updated_at,saved:true}
    }
    if(!row)throw new AppError('PERSONAL_COACH_NOT_STARTED',404)
    if(input.action==='delete'){
      onlyKeys(input,['action','revision','confirmed'])
      if(input.confirmed!==true)throw new AppError('PERSONAL_COACH_CONFIRMATION_REQUIRED',400)
      const deleted=(await db.query(
        'delete from app_private.personal_coaching_sessions where account_id=$1 and revision=$2 returning account_id',
        [actor.id,revision])).rows[0]
      if(!deleted)throw new AppError('PERSONAL_COACH_REVISION_CONFLICT',409)
      return {course:null,revision:0,updatedAt:null,deleted:true}
    }
    const course=decode(row,actor,config)
    if(input.action==='answer'){
      onlyKeys(input,['action','revision','questionId','answer'])
      if(course.current.status!=='active')throw new AppError('PERSONAL_COACH_QUESTION_UNAVAILABLE',409)
      const scheme=await sessionQuestions(db,course.current)
      const question=scheme
        ? scheme.questions.find(item=>item.id===input.questionId)
        : personalCoachQuestion(input.questionId)
      if(!question)throw new AppError('PERSONAL_COACH_QUESTION_UNAVAILABLE',409)
      const answer=validateAnswer(question,input)
      // No analytics, CRM, messenger or URL ever receives this answer.
      course.current.answers={...course.current.answers,[question.id]:answer}
    }else if(input.action==='complete'){
      onlyKeys(input,['action','revision'])
      if(course.current.status!=='active')throw new AppError('PERSONAL_COACH_INCOMPLETE',409)
      const scheme=await sessionQuestions(db,course.current)
      const needed=scheme
        ? scheme.questions.filter(q=>q.required).map(q=>q.id)
        : ['topic','first_step']
      if(!needed.every(id=>typeof course.current.answers[id]==='string'&&
        course.current.answers[id].length>=(scheme?1:3)))
        throw new AppError('PERSONAL_COACH_INCOMPLETE',409)
      if(scheme?.requiredCustomPlan){
        const last=scheme.questions.at(-1)
        const written=course.current.answers[last.id]
        if(typeof written!=='string'||written.startsWith('choice:')||written.length<10)
          throw new AppError('PERSONAL_COACH_WOOP_PLAN_REQUIRED',409)
      }
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
