import 'server-only'
import { randomUUID } from 'node:crypto'
import { transaction } from './database.js'
import { seal, openSealed } from './crypto.js'
import { AppError, onlyKeys } from '../assessments/contracts.js'
import { PERSONAL_COACH_VERSION, PERSONAL_COACH_TEMPLATE, personalCoachQuestion } from '../personal-coaching/questions.js'

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
function newSession(){
  const now=clock()
  return {id:randomUUID(),status:'active',startedAt:now,updatedAt:now,answers:{}}
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
      const deleted=(await db.query(
        'delete from app_private.personal_coaching_sessions where account_id=$1 and revision=$2 returning account_id',
        [actor.id,revision])).rows[0]
      if(!deleted)throw new AppError('PERSONAL_COACH_REVISION_CONFLICT',409)
      return {course:null,revision:0,updatedAt:null,deleted:true}
    }
    const course=decode(row,actor,config)
    if(input.action==='start'){
      course.history=[course.current,...course.history].slice(0,MAX_HISTORY)
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
