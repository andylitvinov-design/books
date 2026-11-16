import 'server-only'
import { randomUUID, createHash } from 'node:crypto'
import { transaction } from './database.js'
import { seal, openSealed } from './crypto.js'
import { AppError, onlyKeys } from '../assessments/contracts.js'
import { PERSONAL_COACH_VERSION, PERSONAL_COACH_TEMPLATE, personalCoachQuestion } from '../personal-coaching/questions.js'
import { TRADITION_COURSES, traditionCourse, traditionEndcaps } from '../personal-coaching/traditions.js'
import { loadSchemeQuestions } from './personal-coaching-catalog.js'
import { authoredFollowupFor } from '../personal-coaching/offline-intelligence.js'
import { isCoachingSafetyConcern } from '../personal-coaching/model-matcher.js'
import { normalizeClientCoachingContext } from '../personal-coaching/client-context.mjs'
import {isGrowClarityQuestion,normalizeGrowPlanExtras} from '../personal-coaching/grow-20.mjs'

const sealContext=actor=>({accountId:actor.id,recordId:actor.id,field:'personal.coaching'})
const clock=()=>new Date().toISOString()
const MAX_HISTORY=8
// The combined ciphertext shares GROW's 120 KB account row; bound both ancient tracks.
const MAX_TRADITION_HISTORY=2
const COACHING_TOPIC_KEYS=new Set(['love','relationships','money','business','career','wellbeing','sexuality','growth','other'])
function validatedCoachingTopic(value){
  if(value===undefined)return null // Existing encrypted sessions are backward compatible.
  if(typeof value!=='string'||!COACHING_TOPIC_KEYS.has(value))
    throw new AppError('PERSONAL_COACH_INVALID_TOPIC',400)
  return value
}
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
     !value.current||typeof value.current!=='object'||Array.isArray(value.current)||
     !Array.isArray(value.history)||value.history.length>MAX_HISTORY)
    throw new AppError('PERSONAL_COACH_VERSION_UNAVAILABLE',503)
  const current=value.current
  if(current.dialogueProtocol!==undefined){
    const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)
    const pending=current.pendingFollowup
    if(current.dialogueProtocol!==1||current.schemeKey!=='grow_overload_20_v1'||
      !['active','paused','completed','safety_hold'].includes(current.status)||
      !object(current.answers)||!object(current.reflections)||
      (pending!==undefined&&(!object(pending)||Object.keys(pending).length!==2||
        typeof pending.questionId!=='string'||!pending.questionId||pending.questionId.length>160||
        typeof pending.key!=='string'||!pending.key||pending.key.length>160||
        !Object.prototype.hasOwnProperty.call(current.answers,pending.questionId)||
        !['active','paused'].includes(current.status))))
      throw new AppError('PERSONAL_COACH_VERSION_UNAVAILABLE',503)
  }else if(current.pendingFollowup!==undefined)throw new AppError('PERSONAL_COACH_VERSION_UNAVAILABLE',503)
  return value
}
function cleanText(value,max,errorCode,required=true){
  if(typeof value!=='string'||value.length>max*2||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value))
    throw new AppError(errorCode,400)
  const clean=value.trim()
  if(clean.length>max||(required&&clean.length<1))throw new AppError(errorCode,400)
  return clean
}
function newSession(selection=null,topic=null,clientContext=null){
  const now=clock()
  const clientTopic=selection?.clientTopic||topic
  return {id:randomUUID(),status:selection&&isCoachingSafetyConcern(selection.clientQuestion)?'safety_hold':'active',startedAt:now,updatedAt:now,answers:{},reflections:{},
    ...(selection?.schemeKey==='grow_overload_20_v1'?{dialogueProtocol:1}:{}),
    ...(clientTopic?{clientTopic}:{}),
    ...((clientContext||selection?.clientContext)?{clientContext:clientContext||selection.clientContext}:{}),
    ...(selection?{schemeKey:selection.schemeKey,modelKey:selection.modelKey,
      clientQuestion:selection.clientQuestion,selectionVersion:'hh-coaching-selection-v1'}:{})}
}
async function requestedSelection(db,input){
  if(input.schemeKey===undefined && input.clientQuestion===undefined)return null // legacy clients
  const scheme=await loadSchemeQuestions(db,input.schemeKey,{publishedOnly:true})
  if(!scheme)throw new AppError('PERSONAL_COACH_SCHEME_UNAVAILABLE',400)
  const clientTopic=validatedCoachingTopic(input.clientTopic)
  // Adult intimacy or a sexuality-focused request requires explicit opt-in; no birthdate stored.
  if((scheme.modelKey==='tantric_intimacy_v1'||scheme.topicTags?.includes('sexuality')||clientTopic==='sexuality')&&input.adultConfirmed!==true)
    throw new AppError('PERSONAL_COACH_ADULT_CONFIRMATION_REQUIRED',400)
  const clientQuestion=cleanText(input.clientQuestion,600,'PERSONAL_COACH_INVALID_QUESTION')
  if(clientQuestion.length<8)throw new AppError('PERSONAL_COACH_INVALID_QUESTION',400)
  let clientContext=null
  if(input.clientContext!==undefined){
    try {
      if(input.clientContext?.reviewStatus!=='client_confirmed')throw new Error('COACHING_CONTEXT_CONFIRMATION_REQUIRED')
      clientContext=normalizeClientCoachingContext(input.clientContext,{clientConfirmed:true})
    } catch(error) {
      throw new AppError(error?.message?.startsWith('COACHING_CONTEXT_')?error.message:'PERSONAL_COACH_CONTEXT_INVALID',400)
    }
  }
  return {schemeKey:scheme.schemeKey,modelKey:scheme.modelKey,clientQuestion,clientTopic,clientContext}
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
  if(isGrowClarityQuestion(question.id)&&answer!==null&&!/^(?:10|[0-9]|choice:(?:10|[0-9]))$/.test(answer))
    throw new AppError('PERSONAL_COACH_INVALID_CHOICE',400)
  return answer
}
export async function readPersonalCoachingInTransaction(db,config,actor){
  await assertAccount(db,actor)
  const row=await readRow(db,actor)
  const course=decode(row,actor,config)
  return {course:course?.current?.status==='not_started'?null:course,revision:row?.revision||0,updatedAt:row?.updated_at||null}
}
export async function readPersonalCoaching(config,actor){
  return transaction(config,actor,db=>readPersonalCoachingInTransaction(db,config,actor))
}
async function persistStartedSession(db,actor,config,row,existing,selected,turnId,turnDigest){
  const course={...existing,history:[...(existing.current.status!=='not_started'?[existing.current]:[]),...(existing.history||[])].slice(0,MAX_HISTORY),
    current:newSession(selected)}
  if(turnDigest)course.current.answerTurns=[{id:turnId,digest:turnDigest}]
  const saved=(await db.query(
    'update app_private.personal_coaching_sessions set payload_ciphertext=$2,revision=revision+1,updated_at=now() where account_id=$1 and revision=$3 returning revision,updated_at',
    [actor.id,seal(course,sealContext(actor),config),row.revision])).rows[0]
  if(!saved)throw new AppError('PERSONAL_COACH_REVISION_CONFLICT',409)
  return {course,revision:saved.revision,updatedAt:saved.updated_at,saved:true}
}

export async function savePersonalCoaching(config,actor,input){
  if(!input||typeof input!=='object'||Array.isArray(input))throw new AppError('PERSONAL_COACH_INVALID_INPUT',400)
  const revision=revisionNumber(input.revision)
  if(typeof input.action!=='string')throw new AppError('PERSONAL_COACH_INVALID_ACTION',400)
  return transaction(config,actor,async db=>{
    await assertAccount(db,actor)
    const row=await readRow(db,actor,true)
    let turnDigest=null
    if(['start','answer','reflection','skip_followup','complete','finish_without_plan','pause','resume','plan'].includes(input.action) && input.turnId!==undefined){
      const allowed=input.action==='start'?['action','revision','schemeKey','clientQuestion','clientTopic','adultConfirmed','clientContext','turnId']:
        input.action==='plan'?['action','revision','goal','obstacle','actionText','when','confidence','feasibilityReview','fallback','nextActions','turnId']:
        input.action==='answer'?['action','revision','questionId','answer','edit','turnId']:
        input.action==='reflection'?['action','revision','questionId','followupKey','note','turnId']:
        input.action==='skip_followup'?['action','revision','questionId','followupKey','turnId']:
        ['action','revision','turnId']
      onlyKeys(input,allowed)
      if(typeof input.turnId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.turnId))
        throw new AppError('PERSONAL_COACH_INVALID_TURN_ID',400)
      if((input.action==='answer'&&(typeof input.questionId!=='string'||(input.answer!==null&&typeof input.answer!=='string')))||
         (input.action==='reflection'&&[input.questionId,input.followupKey,input.note].some(value=>typeof value!=='string'))||
         (input.action==='skip_followup'&&[input.questionId,input.followupKey].some(value=>typeof value!=='string')))
        throw new AppError('PERSONAL_COACH_INVALID_INPUT',400)
      const payload=input.action==='start'?[input.action,revision,...['schemeKey','clientQuestion','clientTopic','adultConfirmed','clientContext'].map(key=>[key,Object.prototype.hasOwnProperty.call(input,key),input[key]])]:
        input.action==='plan'?[input.action,revision,...['goal','obstacle','actionText','when','confidence',...['feasibilityReview','fallback','nextActions'].filter(key=>Object.prototype.hasOwnProperty.call(input,key))].map(key=>[key,Object.prototype.hasOwnProperty.call(input,key),input[key]])]:
        input.action==='answer'?[revision,input.questionId,input.answer,...(Object.prototype.hasOwnProperty.call(input,'edit')?[['edit',input.edit]]:[])]:
        input.action==='reflection'?[input.action,revision,input.questionId,input.followupKey,input.note]:[input.action,revision]
      if(input.action==='skip_followup')payload.push(input.questionId,input.followupKey)
      turnDigest=createHash('sha256').update(JSON.stringify(payload)).digest('hex')
      const prior=row&&decode(row,actor,config)?.current?.answerTurns?.find(turn=>turn.id===input.turnId)
      if(prior){
        if(prior.digest!==turnDigest)throw new AppError('PERSONAL_COACH_TURN_ID_REUSED',409)
        return {course:decode(row,actor,config),revision:row.revision,updatedAt:row.updated_at,saved:true}
      }
    }
    if((row?.revision||0)!==revision)throw new AppError('PERSONAL_COACH_REVISION_CONFLICT',409)
    let selected=null
    if(input.action==='start'){
      onlyKeys(input,['action','revision','schemeKey','clientQuestion','clientTopic','adultConfirmed','clientContext','turnId'])
      if(!row){
        selected=await requestedSelection(db,input)
        const course={version:PERSONAL_COACH_VERSION,template:PERSONAL_COACH_TEMPLATE,current:newSession(selected),history:[]}
        if(turnDigest)course.current.answerTurns=[{id:input.turnId,digest:turnDigest}]
        const saved=(await db.query(
          'insert into app_private.personal_coaching_sessions(account_id,payload_ciphertext,revision) values($1,$2,1) on conflict(account_id) do nothing returning revision,updated_at',
          [actor.id,seal(course,sealContext(actor),config)])).rows[0]
        if(!saved)throw new AppError('PERSONAL_COACH_REVISION_CONFLICT',409)
        return {course,revision:saved.revision,updatedAt:saved.updated_at,saved:true}
      }
      const existing=decode(row,actor,config)
      if(existing.current.status==='safety_hold')throw new AppError('PERSONAL_COACH_SAFETY_HOLD',409)
      if(['active','paused'].includes(existing.current.status))
        return {course:existing,revision:row.revision,updatedAt:row.updated_at,saved:true}
      selected=await requestedSelection(db,input)
      return await persistStartedSession(db,actor,config,row,existing,selected,input.turnId,turnDigest)
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
    if(course.current.status==='safety_hold')throw new AppError('PERSONAL_COACH_SAFETY_HOLD',409)
    if(input.action==='start'){
      if(course.current.status!=='not_started')course.history=[course.current,...course.history].slice(0,MAX_HISTORY)
      course.current=newSession(selected)
    }else if(input.action==='pause'||input.action==='resume'){
      onlyKeys(input,['action','revision','turnId'])
      if(course.current.schemeKey!=='grow_overload_20_v1'||!turnDigest||
        course.current.status!==(input.action==='pause'?'active':'paused'))
        throw new AppError('PERSONAL_COACH_TRANSITION_UNAVAILABLE',409)
      course.current.status=input.action==='pause'?'paused':'active'
    }else if(input.action==='answer'){
      onlyKeys(input,['action','revision','questionId','answer','edit','turnId'])
      if(input.edit!==undefined&&input.edit!==true)throw new AppError('PERSONAL_COACH_INVALID_INPUT',400)
      if(course.current.status!=='active')throw new AppError('PERSONAL_COACH_QUESTION_UNAVAILABLE',409)
      const scheme=await sessionQuestions(db,course.current)
      const question=scheme
        ? scheme.questions.find(item=>item.id===input.questionId)
        : personalCoachQuestion(input.questionId)
      if(!question)throw new AppError('PERSONAL_COACH_QUESTION_UNAVAILABLE',409)
      const answer=validateAnswer(question,input)
      if(course.current.schemeKey==='grow_overload_20_v1'&&!turnDigest&&!isCoachingSafetyConcern(answer))
        throw new AppError('PERSONAL_COACH_INVALID_TURN_ID',400)
      if(course.current.schemeKey==='grow_overload_20_v1' && !isCoachingSafetyConcern(answer)){
        if(course.current.dialogueProtocol===1&&course.current.pendingFollowup&&
          !(input.edit===true&&input.questionId===course.current.pendingFollowup.questionId))
          throw new AppError('PERSONAL_COACH_FOLLOWUP_PENDING',409)
        const firstPending=scheme.questions.findIndex(item=>!Object.prototype.hasOwnProperty.call(course.current.answers,item.id))
        const requestedIndex=scheme.questions.findIndex(item=>item.id===question.id)
        if(firstPending!==-1 && requestedIndex>firstPending)
          throw new AppError('PERSONAL_COACH_QUESTION_OUT_OF_ORDER',409)
        const previouslyAnswered=Object.prototype.hasOwnProperty.call(course.current.answers,question.id)
        if(previouslyAnswered&&input.edit!==true)throw new AppError('PERSONAL_COACH_EXPLICIT_EDIT_REQUIRED',409)
        if(!previouslyAnswered&&input.edit===true)throw new AppError('PERSONAL_COACH_EDIT_UNAVAILABLE',409)
      }
      // No analytics, CRM, messenger or URL ever receives this answer.
      // A changed answer invalidates only its own optional follow-up, not other steps.
      if(course.current.answers[question.id]!==answer&&course.current.reflections?.[question.id]){
        delete course.current.reflections[question.id]
      }
      course.current.answers={...course.current.answers,[question.id]:answer}
      if(course.current.dialogueProtocol===1){
        delete course.current.pendingFollowup
        const at=scheme.questions.findIndex(item=>item.id===question.id)
        const followup=at<scheme.questions.length-1?authoredFollowupFor(question,answer,course.current.reflections):null
        if(followup)course.current.pendingFollowup={questionId:question.id,key:followup.key}
      }
      if(turnDigest)course.current.answerTurns=[...(course.current.answerTurns||[]),{id:input.turnId,digest:turnDigest}].slice(-32)
      if(answer&&isCoachingSafetyConcern(answer)){course.current.status='safety_hold';delete course.current.pendingFollowup}
    }else if(input.action==='reflection'){
      onlyKeys(input,['action','revision','questionId','followupKey','note','turnId'])
      if(course.current.status!=='active')throw new AppError('PERSONAL_COACH_QUESTION_UNAVAILABLE',409)
      const scheme=await sessionQuestions(db,course.current)
      const question=scheme
        ? scheme.questions.find(item=>item.id===input.questionId)
        : personalCoachQuestion(input.questionId)
      if(!question)throw new AppError('PERSONAL_COACH_QUESTION_UNAVAILABLE',409)
      const original=course.current.answers[question.id]
      const permitted=authoredFollowupFor(question,original,course.current.reflections)
      if(!permitted||input.followupKey!==permitted.key)
        throw new AppError('PERSONAL_COACH_REFLECTION_UNAVAILABLE',409)
      if(course.current.dialogueProtocol===1&&
        (course.current.pendingFollowup?.questionId!==input.questionId||course.current.pendingFollowup?.key!==input.followupKey))
        throw new AppError('PERSONAL_COACH_REFLECTION_UNAVAILABLE',409)
      const note=cleanText(input.note,500,'PERSONAL_COACH_REFLECTION_INVALID')
      if(note.length<3)throw new AppError('PERSONAL_COACH_REFLECTION_INVALID',400)
      // User-authored only; no AI processing and no separate public table.
      course.current.reflections={...course.current.reflections,
        [question.id]:{key:permitted.key,stage:permitted.stage,text:note}}
      delete course.current.pendingFollowup
      if(isCoachingSafetyConcern(note))course.current.status='safety_hold'
    }else if(input.action==='skip_followup'){
      onlyKeys(input,['action','revision','questionId','followupKey','turnId'])
      if(course.current.status!=='active'||course.current.dialogueProtocol!==1||!turnDigest||
        course.current.pendingFollowup?.questionId!==input.questionId||course.current.pendingFollowup?.key!==input.followupKey)
        throw new AppError('PERSONAL_COACH_REFLECTION_UNAVAILABLE',409)
      delete course.current.pendingFollowup
    }else if(input.action==='finish_without_plan'){
      onlyKeys(input,['action','revision','turnId'])
      if(course.current.status!=='active'||course.current.schemeKey!=='grow_overload_20_v1')
        throw new AppError('PERSONAL_COACH_INCOMPLETE',409)
      course.current.status='completed'
      delete course.current.pendingFollowup
      course.current.outcome='reflection_only'
      course.current.completedAt=clock()
    }else if(input.action==='brain-decision'){
      onlyKeys(input,['action','revision','sessionId','actionText'])
      if(course.current.status!=='active'||course.current.id!==input.sessionId)
        throw new AppError('PERSONAL_COACH_INCOMPLETE',409)
      const actionText=cleanText(input.actionText,300,'PERSONAL_COACH_PLAN_INVALID')
      if(actionText.length<3||actionText.startsWith('choice:'))
        throw new AppError('PERSONAL_COACH_PLAN_INVALID',400)
      // Explicit client confirmation, not a model-generated commitment.
      // Retain only the chosen step inside the existing encrypted session.
      course.current.brainDecision={actionText,confirmedAt:clock()}
    }else if(input.action==='plan'){
      onlyKeys(input,['action','revision','goal','obstacle','actionText','when','confidence','feasibilityReview','fallback','nextActions','turnId'])
      if(course.current.status!=='completed')throw new AppError('PERSONAL_COACH_INCOMPLETE',409)
      const growPilot=course.current.schemeKey==='grow_overload_20_v1'
      if(!growPilot&&(input.fallback!==undefined||input.nextActions!==undefined))
        throw new AppError('PERSONAL_COACH_PLAN_INVALID',400)
      const extras=growPilot?normalizeGrowPlanExtras(input):null
      if(growPilot&&!extras)throw new AppError('PERSONAL_COACH_PLAN_INVALID',400)
      if(input.confidence!==null&&
        (!Number.isInteger(input.confidence)||input.confidence<0||input.confidence>10))
        throw new AppError('PERSONAL_COACH_PLAN_INVALID',400)
      const actionText=cleanText(input.actionText,300,'PERSONAL_COACH_PLAN_INVALID',false)
      const plan={
        goal:cleanText(input.goal,300,'PERSONAL_COACH_PLAN_INVALID',false),
        obstacle:cleanText(input.obstacle,300,'PERSONAL_COACH_PLAN_INVALID',false),
        actionText,
        when:cleanText(input.when,120,'PERSONAL_COACH_PLAN_INVALID',false),
        confidence:input.confidence,approvedAt:clock(),
        ...(extras||{}),
      }
      if([plan.goal,plan.obstacle,plan.actionText,plan.when,plan.fallback,
        ...(plan.nextActions||[]).flatMap(item=>[item.text,item.when])].some(isCoachingSafetyConcern))
        course.current.status='safety_hold'
      else{
        if(actionText.length<3||actionText.startsWith('choice:'))throw new AppError('PERSONAL_COACH_PLAN_INVALID',400)
        const needsReview=course.current.schemeKey==='grow_overload_20_v1'&&Number.isInteger(input.confidence)&&input.confidence<7
        if(input.feasibilityReview!==undefined&&(!needsReview||!['considered','keep'].includes(input.feasibilityReview)))
          throw new AppError('PERSONAL_COACH_PLAN_INVALID',400)
        if(needsReview&&turnDigest&&!input.feasibilityReview)throw new AppError('PERSONAL_COACH_FEASIBILITY_REVIEW_REQUIRED',409)
        if(input.feasibilityReview)plan.feasibilityReview=input.feasibilityReview
        course.current.actionPlan=plan
      }
    }else if(input.action==='complete'){
      onlyKeys(input,['action','revision','turnId'])
      if(course.current.status!=='active')throw new AppError('PERSONAL_COACH_INCOMPLETE',409)
      if(course.current.dialogueProtocol===1&&course.current.pendingFollowup)throw new AppError('PERSONAL_COACH_FOLLOWUP_PENDING',409)
      const scheme=await sessionQuestions(db,course.current)
      const needed=scheme
        ? scheme.questions.filter(q=>q.required).map(q=>q.id)
        : ['topic','first_step']
      if(!needed.every(id=>typeof course.current.answers[id]==='string'&&
        course.current.answers[id].length>=(scheme?1:3)))
        throw new AppError('PERSONAL_COACH_INCOMPLETE',409)
      if(scheme?.requiredCustomPlan){
        const planQuestion=scheme.schemeKey==='grow_overload_20_v1'
          ?scheme.questions.find(q=>q.stepKey==='will'):scheme.questions.at(-1)
        const written=planQuestion&&course.current.answers[planQuestion.id]
        if(typeof written!=='string'||written.startsWith('choice:')||written.length<10)
          throw new AppError('PERSONAL_COACH_WOOP_PLAN_REQUIRED',409)
      }
      course.current.status='completed'
      course.current.completedAt=clock()
    }else throw new AppError('PERSONAL_COACH_INVALID_ACTION',400)
    course.current.updatedAt=clock()
    if(turnDigest&&input.action!=='answer')course.current.answerTurns=[...(course.current.answerTurns||[]),{id:input.turnId,digest:turnDigest}].slice(-32)
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
  if(typeof input.choiceId!=='string'||
    (input.choiceId!==''&&!choices.some(item=>item.id===input.choiceId)))
    throw new AppError('COACHING_CHOICE_INVALID',400)
  const note=typeof input.note==='string'?input.note.trim():''
  if((input.note!==undefined&&typeof input.note!=='string')||note.length>500||
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(note))
    throw new AppError('COACHING_ANSWER_INVALID',400)
  // Only the opening topic requires a predefined category. Every later question
  // accepts at least three characters of personal writing. Legacy choices stay valid.
  if(!input.choiceId&&(question.id==='goal'||note.length<3))
    throw new AppError('COACHING_CHOICE_INVALID',400)
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
      onlyKeys(input,['action','revision','clientTopic','adultConfirmed'])
      if(current?.current?.status==='active')
        return {course:current,questions,definition:def,revision:row.revision,updatedAt:row.updated_at,saved:true}
      const history=current?.current?[
        current.current,...(current.history||[])
      ].slice(0,MAX_TRADITION_HISTORY):[]
      const clientTopic=validatedCoachingTopic(input.clientTopic)
      if(clientTopic==='sexuality'&&input.adultConfirmed!==true)
        throw new AppError('PERSONAL_COACH_ADULT_CONFIRMATION_REQUIRED',400)
      course.traditionTracks[template]={version:1,template,current:newSession(null,clientTopic),history}
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
        if(!required.every(item=>{
          const answer=current.current.answers?.[item.id]
          return Boolean(answer?.choiceId)||(item.id==='action_24h'&&
            typeof answer?.note==='string'&&answer.note.trim().length>=3)
        }))throw new AppError('COACHING_SESSION_INCOMPLETE',409)
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

/**
 * Owner-only minimal progress for My Courses. Read the same encrypted account
 * record once; do not send notes, transcripts or even choice IDs to dashboard.
 */
export async function readTraditionCoachingSummaries(config,actor){
  return transaction(config,actor,async db=>{
    await assertAccount(db,actor)
    const row=await readRow(db,actor)
    const envelope=decode(row,actor,config)
    return {courses:TRADITION_COURSES.map(def=>{
      const current=envelope?.traditionTracks?.[def.template]?.current
      const saved=current?.answers&&typeof current.answers==='object'
        ? Object.keys(current.answers).length : 0
      const status=current?.status==='completed'?'completed':current?.status==='active'?'active':'not_started'
      return {template:def.template,status,completed:status==='completed'
        ? def.totalScreens : Math.min(saved,def.totalScreens),total:def.totalScreens}
    })}
  })
}
