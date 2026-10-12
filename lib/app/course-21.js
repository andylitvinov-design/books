import 'server-only'
import {randomUUID,timingSafeEqual} from 'node:crypto'
import {transaction} from './database.js'
import {seal,openSealed,operationHash} from './crypto.js'
import {AppError,onlyKeys,requireUUID} from '../assessments/contracts.js'
import {previewR3Course21,activateR3Course21,COURSE_21_CONSENT_VERSION} from '../inner-growth/course-21-r3-bridge.js'
import {COURSE_STRATEGY_VERSION} from '../inner-growth/course-21-contract.js'
import {courseProfile} from '../inner-growth/course-21-evidence.js'
import {courseInterpretationFromResult} from '../inner-growth/course-interpretation-adapter.js'
import {journeyStatus,dailyLesson,checkInBeforeLesson,finishCourseDay,pauseCourseJourney,setCoursePreferences,reviewCourseLesson} from '../inner-growth/course-progression-21.js'
import {lessonFor21,courseOutline21,COURSE_CONTENT_21_VERSION} from '../inner-growth/lesson-library-21.js'
import {courseCompletion21,saveCourseContinuation} from '../inner-growth/course-completion-21.js'
import {courseReassessment21} from '../inner-growth/course-reassessment-21.js'
import {previewPersonalR3Course21,activatePersonalR3Course21,PERSONAL_COURSE_CONSENT_VERSION,personalRuntimeFromState,storePersonalRuntime,personalCourseOutline} from '../inner-growth/course-personal-r3-bridge-v2.js'
import {personalCourseProfileV2} from '../inner-growth/course-personal-profile-v2.js'
import {createPersonalCourseRuntimeAdapter,PERSONAL_COURSE_RUNTIME_VERSION} from '../inner-growth/course-personal-runtime-v2.js'
import {encodeCourseState,decodeCourseState} from './course-state-codec.js'
import {createCourseGoalObservationSnapshot,recordCourseGoalObservations,buildCourseGoalWeeklyReports} from '../inner-growth/course-goal-observations.js'
import {localDateKey} from '../inner-growth/course-progress.js'

const fail=(code,status=400)=>{throw new AppError(code,status)}
const iso=value=>value instanceof Date?value.toISOString():value
const sameInstant=(left,right)=>{
 const a=iso(left),b=iso(right),millis=Date.parse(a)
 if(!Number.isFinite(millis)||millis!==Date.parse(b))return false
 const remainder=value=>(String(value).match(/\.(\d{1,6})(?:Z|[+-]\d{2}:\d{2})$/)?.[1]||'').padEnd(6,'0').slice(3)
 return remainder(a)===remainder(b)
}
const context=(actor,id)=>({accountId:actor.id,recordId:id,field:'course.daily_state'})
const fields={
 activate:['consent','consentVersion','expectedSourceRevision','activationToken','selectedR3ScaleKeys','timeZone','loadMinutes','weeklyAccents'],
 'check-in':['wellbeing','energy','feelingChange','availableTime','skip','pauseRequested'],
 'finish-day':['day','lessonId','status','feedback','applyFeedback','savePrivateText','confirmAlternative','expectedPlanRevision','choice','targetScaleId','goalObservations'],
 pause:[],resume:[],preferences:['length','alternativeRequested','stopOffer'],
 continuation:['practiceDays','pace','consent'],
 'revise-plan':['selectedR3ScaleKeys','loadMinutes','weeklyAccents','contentLocale','consent','expectedPlanRevision'],
}
function translatedError(error){
 if(error instanceof AppError)return error
 const code=/^[A-Z][A-Z_]{3,70}$/.test(error?.message||'')?error.message:'COURSE_UNAVAILABLE'
 return new AppError(code,['COURSE_UNAVAILABLE','COURSE_STATE_UNAVAILABLE'].includes(code)?503:/REQUIRED|REMAIN|UNAVAILABLE|NOT_AVAILABLE|STALE|CHANGED/.test(code)?409:400)
}
function unpack(row,actor,config){
 const state=decodeCourseState(openSealed(row.state_ciphertext,context(actor,row.id),config))
 if(state?.modelVersion!==COURSE_STRATEGY_VERSION||row.model_version!==state.modelVersion||row.duration_days!==21||
  state.source?.accountId!==actor.id||state.source?.courseId!==row.course_id||state.source?.courseRevision!==row.source_revision||
  state.consent?.version!==(state.personal?PERSONAL_COURSE_CONSENT_VERSION:COURSE_21_CONSENT_VERSION)||!sameInstant(state.consent?.at,row.consented_at)||
  state.journey?.id!==row.id||state.journey?.durationDays!==21||state.journey?.revision!==row.revision||
  state.journey?.contentVersion!==row.content_version||state.journey?.status!==row.status||
  !Array.isArray(state.operations))fail('COURSE_STATE_UNAVAILABLE',503)
 if(state.personal&&(state.personal.version!==PERSONAL_COURSE_RUNTIME_VERSION||state.personal.registry?.contentVersion!==row.content_version||state.personal.plan?.durationDays!==21||!Array.isArray(state.personal.plan?.slots)||state.personal.plan.slots.length!==21))fail('COURSE_STATE_UNAVAILABLE',503)
 return state
}
const tokenMaterial=(preview,locale,issuedAt)=>({audience:'r3-course-21-activation',locale,issuedAt,
 source:preview.source,profile:preview.profile,contentVersion:preview.contentVersion??COURSE_CONTENT_21_VERSION,consentVersion:preview.consentVersion,registry:preview.registry??null})
function issueToken(preview,locale,timestamp,config){
 const issuedAt=Date.parse(timestamp)
 return String(issuedAt)+'.'+operationHash(tokenMaterial(preview,locale,issuedAt),config)
}
function verifyToken(token,preview,locale,timestamp,config){
 if(typeof token!=='string'||!/^\d{13}\.[a-f0-9]{64}$/.test(token))fail('COURSE_PREVIEW_CHANGED',409)
 const [time,hash]=token.split('.'),issuedAt=Number(time),age=Date.parse(timestamp)-issuedAt
 if(age<0||age>10*60*1000||!timingSafeEqual(Buffer.from(hash,'hex'),Buffer.from(operationHash(tokenMaterial(preview,locale,issuedAt),config),'hex')))fail('COURSE_PREVIEW_CHANGED',409)
}
// The released DB interpretation loader is a mandatory activation dependency.
// Injection here supports isolated tests; there is no static interpretation fallback.
export function createCourse21Repository(config,{runTransaction=transaction,loadReports=null,personalRegistry=null,requirePersonalRegistry=false,
 now=()=>new Date().toISOString(),makeId=randomUUID,enabled=config.course21Enabled===true}={}){
 const personalAdapter=createPersonalCourseRuntimeAdapter(personalRegistry)
 async function account(db,actor,lock=false){
  requireUUID(actor?.id)
  if(actor.claims?.sub!==actor.id)fail('SIGN_IN_REQUIRED',401)
  const row=(await db.query('select id,status,onboarding_state,timezone from app.accounts where id=$1'+(lock?' for update':''),[actor.id])).rows[0]
  if(!row||row.status!=='active'||row.onboarding_state!=='active')fail('ACCOUNT_UNAVAILABLE',403)
 }
 async function ownedResults(db,actor,{definitionIds=[],resultIds=[],allowContentOutage=false}={}){
  const byIds=resultIds.length>0
  const rows=(await db.query(byIds?
   'select id,provenance,dimensions,measurement_at from app.assessment_results where account_id=$1 and id=any($2::uuid[])':
   `select distinct on (source_version_id) id,provenance,dimensions,measurement_at from app.assessment_results
    where account_id=$1 and source_version_id=any($2::uuid[]) order by source_version_id,measurement_at desc,id desc`,
   [actor.id,byIds?resultIds:definitionIds])).rows
  const owned=rows.map(r=>({...r.provenance,id:r.id,accountId:actor.id,status:'completed',dimensions:r.dimensions,measurementAt:iso(r.measurement_at)}))
  if(typeof loadReports!=='function')return owned
  const original=structuredClone(owned)
  // Optional enrichment must not roll back already-authorized daily progress.
  // A PostgreSQL loader error aborts the transaction unless a savepoint is used.
  if(allowContentOutage)await db.query('savepoint course21_content')
  let attached
  try{attached=await loadReports(db,owned)}catch(error){
   if(!allowContentOutage)throw error
   await db.query('rollback to savepoint course21_content')
   await db.query('release savepoint course21_content')
   const code=String(error?.code||error?.message||'')
   if(error instanceof AppError||/^(?:23|28)|^42501$|SIGN_IN|ACCOUNT|DENIED|AUTH|INTEGRITY|HASH|IDENTITY|PROVENANCE|INVALID/.test(code))throw error
   return original // Complete owned score rows, explicitly without interpretations.
  }
  if(allowContentOutage)await db.query('release savepoint course21_content')
  // Tampering is an integrity failure, never treated as an optional outage.
  if(!Array.isArray(attached)||attached.length!==original.length)fail('COURSE_INTERPRETATIONS_UNAVAILABLE',503)
  return attached.map((r,i)=>{
   const {interpretations,...actual}=r
   if(operationHash(actual,config)!==operationHash(original[i],config))fail('COURSE_INTERPRETATIONS_UNAVAILABLE',503)
   return {...original[i],interpretations}
  })
 }
 async function sourcePreview(db,actor,locale,timestamp,lock=false){
  const course=(await db.query('select id,account_id,stage,revision,test_keys,focus_tags from app_private.growth_courses where account_id=$1'+(lock?' for update':''),[actor.id])).rows[0]
  if(!course)fail('COURSE_NOT_STARTED',404)
  const plan=(await db.query("select id,revision,definition_ids from app_private.assessment_plans where account_id=$1 and status in ('active','completed') order by updated_at desc,id desc limit 1"+(lock?' for share':''),[actor.id])).rows[0]
  const results=await ownedResults(db,actor,{definitionIds:plan?.definition_ids||[]})
  const preview=(personalRegistry?previewPersonalR3Course21:previewR3Course21)({registry:personalRegistry,ownerId:actor.id,course:{id:course.id,accountId:course.account_id,stage:course.stage,revision:course.revision,testKeys:course.test_keys,focusTags:course.focus_tags||[]},
   planDefinitionIds:plan?.definition_ids||[],results,locale,now:timestamp})
  preview.source.plan={id:plan?.id??null,revision:plan?.revision??null}
  return preview
 }
 function personalProfile(state,owned,ownerId,locale,timestamp){
  const pinned=owned.map(result=>{
   const interpretations={}
   for(const lang of ['en','ru']){
    const report=courseInterpretationFromResult(result,lang),expected=state.source.bindings.find(binding=>binding.resultId===result.id)?.interpretations?.[lang]
    if(expected&&report?.revision===expected.revision&&report?.contentHash===expected.contentHash)interpretations[lang]=result.interpretations[lang]
   }
   return {...result,interpretations}
  })
  return personalCourseProfileV2({selection:{confirmed:true,selected:state.source.selectedForms},ownerId,results:pinned,locale,now:timestamp,registry:personalRegistry,focusTopicIds:state.source.confirmedFocusTopicIds??[]})
 }
 async function view(db,actor,row,locale,{reviewDay=null,confirmAlternative=false,choice=null,targetScaleId=null}={}){
  if(!row)return {available:true,enrollmentReady:typeof loadReports==='function'&&(!requirePersonalRegistry||Boolean(personalRegistry)),
   reason:typeof loadReports!=='function'?'COURSE_INTERPRETATIONS_RELEASE_PENDING':requirePersonalRegistry&&!personalRegistry?'COURSE_REVIEWED_MATERIAL_UNAVAILABLE':null,course:null,outline:courseOutline21(locale)}
  const state=unpack(row,actor,config),timestamp=now()
  const owned=await ownedResults(db,actor,{resultIds:state.source.bindings.map(b=>b.resultId),allowContentOutage:true})
  const profile=state.personal?personalProfile(state,owned,actor.id,locale,timestamp):courseProfile({selection:{confirmed:true,selected:state.source.selectedForms},ownerId:actor.id,results:owned,locale,now:timestamp,
   interpretationFor:(result,lang)=>{
    const report=courseInterpretationFromResult(result,lang),binding=state.source.bindings.find(b=>b.resultId===result.id)
    const expected=binding?.interpretations?.[lang]
    return expected&&report?.revision===expected.revision&&report?.contentHash===expected.contentHash?report:null
   }})
  const runtime=personalRuntimeFromState(state)
  const completion=runtime?personalAdapter.completion(runtime,{uiLocale:locale}):courseCompletion21(state.journey,{locale,lessonFor:lessonFor21})
  const latest=completion?await ownedResults(db,actor,{definitionIds:state.source.selectedForms.map(f=>f.definitionId),allowContentOutage:true}):[]
  const reassessment=completion?courseReassessment21({state,ownerId:actor.id,initialResults:owned,latestResults:latest,locale,now:timestamp}):null
  const checkin=state.journey.checkins[state.journey.nextDay]
  const currentCheckin=checkin?.localDate===localDateKey(Date.parse(timestamp),state.journey.timeZone)?checkin:null
  const today={...journeyStatus(state.journey,timestamp),...(runtime?personalAdapter.dailyLesson(runtime,{now:timestamp,uiLocale:locale,confirmAlternative,choice,targetScaleId}):dailyLesson(state.journey,{now:timestamp,locale,lessonFor:lessonFor21,confirmAlternative})),checkin:currentCheckin,localDate:localDateKey(Date.parse(timestamp),state.journey.timeZone)}
  if(runtime)today.goalObservationSnapshot=today.status==='ready'&&Array.isArray(state.personal.goalStatements)?createCourseGoalObservationSnapshot({day:today.day,slot:today.slot,statements:state.personal.goalStatements}):null
  return {available:true,outline:runtime?personalCourseOutline(runtime,locale):courseOutline21(locale,state.journey),personalPlan:runtime?{revision:runtime.plan.revision,contentLocale:runtime.plan.uiLocale,loadMinutes:runtime.plan.loadMinutes,weeklyAccents:runtime.plan.weeklyAccents,selectedScaleIds:runtime.plan.selectedScaleIds,topicOrder:runtime.plan.topicOrder,coverage:runtime.plan.coverage}:null,course:{id:row.id,sourceCourseId:row.course_id,revision:row.revision,status:row.status,
   durationDays:21,modelVersion:row.model_version,contentVersion:row.content_version,consentedAt:iso(row.consented_at),
   personalization:runtime?'exact-reviewed-scale-objective-practice':null,choices:state.choices,selectedR3ScaleKeys:state.selectedR3ScaleKeys,timeZone:state.journey.timeZone},profile,
   today,weeklyReports:state.personal?.weeklyReports??[],
   reviewLesson:reviewDay===null?null:runtime?personalAdapter.reviewLesson(runtime,{day:reviewDay,uiLocale:locale}):reviewCourseLesson(state.journey,{day:reviewDay,locale,lessonFor:lessonFor21}),
   history:Object.values(state.journey.sessions).map(session=>({...Object.fromEntries(['day','status','at','localDate','track','lessonId','lessonVersion','lessonVariant','feedback','feedbackApplied','goalObservations','planRevision','practiceId','skillId'].filter(key=>Object.hasOwn(session,key)).map(key=>[key,session[key]])),checkin:state.journey.checkins[session.day]??null})),preferences:state.journey.preferences,completion,reassessment,
   privateTextProcessing:'private-journal-only-not-automatically-interpreted'}
 }
 return {
  async preview(actor,locale='en'){
   if(!['en','ru'].includes(locale))fail('UNSUPPORTED_LOCALE')
   if(!enabled)return {available:false,reason:'COURSE_RELEASE_PENDING',profile:null}
   if(typeof loadReports!=='function')return {available:false,reason:'COURSE_INTERPRETATIONS_RELEASE_PENDING',profile:null}
   if(requirePersonalRegistry&&!personalRegistry)return {available:false,reason:'COURSE_REVIEWED_MATERIAL_UNAVAILABLE',profile:null}
   try{return await runTransaction(config,actor,async db=>{
    await account(db,actor);const timestamp=now(),preview=await sourcePreview(db,actor,locale,timestamp)
    return {available:true,...preview,activationToken:preview.status==='ready-to-review'?issueToken(preview,locale,timestamp,config):null}
   })}catch(e){throw translatedError(e)}
  },
  async read(actor,locale='en',options={}){
   if(!['en','ru'].includes(locale))fail('UNSUPPORTED_LOCALE')
   if(!enabled)return {available:false,reason:'COURSE_RELEASE_PENDING',course:null}
   try{return await runTransaction(config,actor,async db=>{
    await account(db,actor)
    const row=(await db.query('select * from app_private.growth_course_daily_21 where account_id=$1',[actor.id])).rows[0]
    return view(db,actor,row,locale,options)
   })}catch(e){throw translatedError(e)}
  },
  async exportData(actor){
   try{return await runTransaction(config,actor,async db=>{
    await account(db,actor)
    const schema=(await db.query("select to_regclass('app_private.growth_course_daily_21') as relation")).rows[0]
    if(schema?.relation===null)return null
    if(!schema?.relation)fail('COURSE_STATE_UNAVAILABLE',503)
    const row=(await db.query('select * from app_private.growth_course_daily_21 where account_id=$1',[actor.id])).rows[0]
    if(!row)return null
    const state=structuredClone(unpack(row,actor,config));delete state.operations;delete state.activationOperation
    return {id:row.id,accountId:actor.id,sourceCourseId:row.course_id,revision:row.revision,status:row.status,
     consentedAt:iso(row.consented_at),createdAt:iso(row.created_at),updatedAt:iso(row.updated_at),...state}
   })}catch(e){throw translatedError(e)}
  },
  async command(actor,body,locale='en'){
   if(!enabled)fail('COURSE_RELEASE_PENDING',503)
   if(!['en','ru'].includes(locale))fail('UNSUPPORTED_LOCALE')
   if(!Object.hasOwn(fields,body?.action))fail('INVALID_COURSE_ACTION')
   onlyKeys(body,['action','operationId','expectedRevision',...fields[body.action]]);requireUUID(body.operationId)
   try{return await runTransaction(config,actor,async db=>{
    await account(db,actor,true);const timestamp=now(),hash=operationHash({locale,body},config)
    let row=(await db.query('select * from app_private.growth_course_daily_21 where account_id=$1 for update',[actor.id])).rows[0]
    let state=row?unpack(row,actor,config):null
    const prior=state?.activationOperation?.id===body.operationId?state.activationOperation:state?.operations.find(op=>op.id===body.operationId)
    if(prior){if(prior.hash!==hash)fail('OPERATION_ID_REUSED',409);return view(db,actor,row,locale)}
    if(body.action==='activate'){
     if(row)fail('COURSE_ALREADY_STARTED',409)
     if(typeof loadReports!=='function')fail('COURSE_INTERPRETATIONS_RELEASE_PENDING',503)
     if(requirePersonalRegistry&&!personalRegistry)fail('COURSE_REVIEWED_MATERIAL_UNAVAILABLE',503)
     if(body.consent!==true)fail('NEW_COURSE_CONSENT_REQUIRED')
     const preview=await sourcePreview(db,actor,locale,timestamp,true)
     verifyToken(body.activationToken,preview,locale,timestamp,config)
     if(!personalRegistry&&(['loadMinutes','weeklyAccents'].some(key=>Object.hasOwn(body,key))))fail('INVALID_COURSE_ACTION')
     const id=makeId(),active=(personalRegistry?activatePersonalR3Course21:activateR3Course21)({registry:personalRegistry,loadMinutes:body.loadMinutes,weeklyAccents:body.weeklyAccents,preview,ownerId:actor.id,expectedCourseRevision:body.expectedSourceRevision,
      selectedR3ScaleKeys:body.selectedR3ScaleKeys,consent:body.consent,consentVersion:body.consentVersion,timeZone:body.timeZone,id,now:timestamp})
     state={modelVersion:COURSE_STRATEGY_VERSION,...active,operations:[],activationOperation:{id:body.operationId,hash}}
     if(state.personal){state.personal.goalStatements=Array.isArray(personalRegistry.goalStatements)?structuredClone(personalRegistry.goalStatements):null;state.personal.weeklyReports=[]}
     row=(await db.query(`insert into app_private.growth_course_daily_21
      (id,account_id,course_id,source_revision,model_version,content_version,duration_days,revision,status,state_ciphertext,consented_at)
      values($1,$2,$3,$4,$5,$6,21,0,'active',$7,$8) returning *`,
      [id,actor.id,active.source.courseId,active.source.courseRevision,COURSE_STRATEGY_VERSION,active.journey.contentVersion,seal(state.personal?encodeCourseState(state):state,context(actor,id),config),timestamp])).rows[0]
     return view(db,actor,row,locale)
    }
    if(!row)fail('COURSE_NOT_STARTED',404)
    if(!Number.isInteger(body.expectedRevision)||body.expectedRevision!==row.revision)fail('REVISION_CONFLICT',409)
    if(state.personal){
     let runtime=personalRuntimeFromState(state)
     const options={...body,now:timestamp,expectedRevision:state.journey.revision,uiLocale:locale}
     switch(body.action){
      case 'check-in':runtime=personalAdapter.checkIn(runtime,{...options,day:state.journey.nextDay});break
      case 'finish-day':{
       const feedback=body.feedback??{};onlyKeys(feedback,['helpfulness','difficulty','comfort','comment','reflectionAnswer'])
       if(typeof body.savePrivateText!=='boolean'||((feedback.comment||feedback.reflectionAnswer)&&body.savePrivateText!==true))fail('PRIVATE_TEXT_CONSENT_REQUIRED')
       runtime=personalAdapter.finishDay(runtime,{...options,feedback})
       const session=runtime.journey.sessions[body.day]
       if(session.status==='skipped'){
        if(body.goalObservations!==undefined&&(!Array.isArray(body.goalObservations)||body.goalObservations.length))fail('SKIPPED_LESSON_HAS_NO_GOAL_RATINGS')
       }else{
        const snapshot=Array.isArray(state.personal.goalStatements)?createCourseGoalObservationSnapshot({day:body.day,slot:session.slot,statements:state.personal.goalStatements}):null
        const saved=recordCourseGoalObservations({snapshot,choices:body.goalObservations??[],observedAt:session.at,localDate:session.localDate})
        if(saved)session.goalObservations=saved
       }
       if([7,14,21].includes(body.day)){
        const reports=buildCourseGoalWeeklyReports({sessions:runtime.journey.sessions,resolvedThroughDay:body.day})
        const previous=state.personal.weeklyReports??[]
        state.personal.weeklyReports=[...previous,...reports.filter(report=>!previous.some(saved=>saved.checkpointDay===report.checkpointDay))]
       }
       break
      }
      case 'pause':case 'resume':runtime=personalAdapter.pause(runtime,{...options,paused:body.action==='pause'});break
      case 'preferences':runtime=personalAdapter.setPreferences(runtime,options);break
      case 'continuation':runtime=personalAdapter.saveContinuation(runtime,options);break
      case 'revise-plan':{
       if(body.consent!==true)fail('EXPLICIT_REVISION_CONSENT_REQUIRED')
       if(body.loadMinutes!==undefined&&![2,5].includes(body.loadMinutes))fail('INVALID_CHOSEN_LOAD')
       const contentLocale=body.contentLocale??runtime.plan.uiLocale
       const owned=await ownedResults(db,actor,{resultIds:state.source.bindings.map(binding=>binding.resultId)})
       const profile=personalProfile(state,owned,actor.id,contentLocale,timestamp)
       if(profile.status!=='ready-to-review')fail('PERSONAL_PROFILE_UNAVAILABLE',409)
       if(!Array.isArray(body.selectedR3ScaleKeys)||new Set(body.selectedR3ScaleKeys).size!==body.selectedR3ScaleKeys.length)fail('INVALID_R3_SCALE_SELECTION')
       const selectedScaleIds=body.selectedR3ScaleKeys.map(key=>profile.rows.find(row=>row.r3ScaleKey===key&&row.canChoosePractice)?.id||fail('UNKNOWN_R3_SCALE'))
       runtime=personalAdapter.revise(runtime,{...options,fromDay:state.journey.nextDay,scales:profile.evidence.scales,selectedScaleIds,uiLocale:contentLocale})
       state.selectedR3ScaleKeys=[...body.selectedR3ScaleKeys]
       state.choices={confirmed:true,durationDays:21,scaleIds:[...selectedScaleIds],topics:runtime.plan.selectedScales.map(row=>({scaleId:row.scaleId,track:row.topicId}))}
       break
      }
     }
     state=storePersonalRuntime(state,runtime)
    }else{
    if(body.action==='revise-plan'||['expectedPlanRevision','choice','targetScaleId','goalObservations'].some(key=>Object.hasOwn(body,key)))fail('INVALID_COURSE_ACTION')
    switch(body.action){
     case 'check-in':state.journey=checkInBeforeLesson(state.journey,{...body,day:state.journey.nextDay,now:timestamp,expectedRevision:state.journey.revision});break
     case 'finish-day':{
      const feedback=body.feedback??{};onlyKeys(feedback,['helpfulness','difficulty','comfort','comment','reflectionAnswer'])
      if(typeof body.savePrivateText!=='boolean'||((feedback.comment||feedback.reflectionAnswer)&&body.savePrivateText!==true))fail('PRIVATE_TEXT_CONSENT_REQUIRED')
      state.journey=finishCourseDay(state.journey,{...body,feedback,now:timestamp,expectedRevision:state.journey.revision,lessonFor:lessonFor21,locale});break
     }
     case 'pause':case 'resume':state.journey=pauseCourseJourney(state.journey,{paused:body.action==='pause',now:timestamp,expectedRevision:state.journey.revision});break
     case 'preferences':state.journey=setCoursePreferences(state.journey,{...body,now:timestamp,expectedRevision:state.journey.revision});break
     case 'continuation':state.journey=saveCourseContinuation(state.journey,{...body,now:timestamp,expectedRevision:state.journey.revision,locale,lessonFor:lessonFor21});break
    }
    }
    state.operations=[...state.operations,{id:body.operationId,hash}].slice(-50)
    row=(await db.query(`update app_private.growth_course_daily_21 set state_ciphertext=$3,status=$4,revision=revision+1,updated_at=$5
     where id=$1 and account_id=$2 and revision=$6 returning *`,
     [row.id,actor.id,seal(state.personal?encodeCourseState(state):state,context(actor,row.id),config),state.journey.status,timestamp,row.revision])).rows[0]
    if(!row)fail('REVISION_CONFLICT',409)
    return view(db,actor,row,locale,{confirmAlternative:body.confirmAlternative===true})
   })}catch(e){throw translatedError(e)}
  },
 }
}
