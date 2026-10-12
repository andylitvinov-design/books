// Isolated 21-learning-day proposal. Pure data transformations; no I/O or diagnosis.
import { localDateKey, validTimeZone } from './course-progress.js'
import { COURSE_LENGTH_DAYS, COURSE_STRATEGY_VERSION } from './course-21-contract.js'

const TRACKS = new Set(['calm_regulation','inner_support','emotional_flexibility','attention_clarity','connection_boundaries','energy_agency'])
const fail = code => { throw new Error(code) }
const clone = value => structuredClone(value)
const time = value => {const n=Date.parse(value);if(!Number.isFinite(n))fail('INVALID_TIME');return n}
const enumOrNull = (value,values,code) => value==null?null:values.includes(value)?value:fail(code)
const optionalText = value => value==null?'':typeof value==='string'&&value.length<=1000?value:fail('INVALID_PRIVATE_COMMENT')
const score = value => value==null?null:Number.isInteger(value)&&value>=0&&value<=10?value:fail('INVALID_WELLBEING')
function assertState(state) {
  if(state?.version!==COURSE_STRATEGY_VERSION||state.durationDays!==21||!Number.isInteger(state.revision)||state.revision<0||
    !Number.isInteger(state.nextDay)||state.nextDay<1||state.nextDay>22||!validTimeZone(state.timeZone)||
    !Array.isArray(state.topics)||!state.topics.length||state.topics.length>5||state.topics.some(t=>!TRACKS.has(t.track))||
    typeof state.contentVersion!=='string'||!state.contentVersion||!state.checkins||!state.sessions||!['active','paused','finished'].includes(state.status))fail('INVALID_JOURNEY')
}
function mutation(state,expectedRevision,now) {
  assertState(state);if(state.revision!==expectedRevision)fail('STALE_COURSE_REVISION')
  if(time(now)<time(state.updatedAt))fail('NON_MONOTONIC_TIME')
  const next=clone(state);next.revision++;next.updatedAt=now;return next
}
function availableDay(state,now) {
  assertState(state);if(time(now)<time(state.createdAt))fail('INVALID_TIME')
  const today=localDateKey(time(now),state.timeZone)
  const previous=state.sessions[state.nextDay-1]
  return state.status==='active'&&state.nextDay<=21&&(!previous||today>previous.localDate)
}
export function courseWeek(day) {
  if(!Number.isInteger(day)||day<1||day>21)fail('INVALID_LEARNING_DAY')
  return {week:Math.ceil(day/7),phase:day<=7?'awareness-and-support':day<=14?'everyday-application':'independent-practice',review:[7,14,21].includes(day)}
}
export function createCourseJourney({id,choices,consent=false,timeZone,contentVersion,now}={}) {
  time(now)
  if(consent!==true||choices?.confirmed!==true)fail('CONSENT_AND_TOPICS_REQUIRED')
  if(typeof id!=='string'||!id||typeof contentVersion!=='string'||!contentVersion||contentVersion.length>100||!validTimeZone(timeZone))fail('INVALID_JOURNEY_ID_OR_TIMEZONE')
  if(choices.durationDays!==21||!Array.isArray(choices.topics)||!choices.topics.length||choices.topics.length>5||
    new Set(choices.topics.map(t=>t.scaleId)).size!==choices.topics.length||choices.topics.some(t=>!TRACKS.has(t.track)))fail('INVALID_COURSE_TOPICS')
  return {version:COURSE_STRATEGY_VERSION,id,revision:0,durationDays:COURSE_LENGTH_DAYS,
    createdAt:now,updatedAt:now,timeZone,contentVersion,topics:clone(choices.topics),status:'active',nextDay:1,
    checkins:{},sessions:{},preferences:{length:'standard',alternativeRequested:false,stopOffer:false},
    externalTransmission:false,habitGuarantee:false,notificationsEnabled:false}
}
export function journeyStatus(state,now) {
  assertState(state)
  const available=availableDay(state,now),checkin=state.checkins[state.nextDay]
  const status=state.status!=='active'?state.status:!available?'next-local-day':(!checkin||checkin.localDate!==localDateKey(time(now),state.timeZone))?'check-in-required':
    checkin.pauseRequested?'rest-chosen':'lesson-ready'
  return {status,day:state.nextDay<=21?state.nextDay:null,durationDays:21,
    ...(state.nextDay<=21?courseWeek(state.nextDay):{}),
    completedDays:Object.values(state.sessions).filter(s=>s.status==='completed').length,
    skippedDays:Object.values(state.sessions).filter(s=>s.status==='skipped').length,
    resolvedDays:Object.keys(state.sessions).length,
    repeatableDays:Object.values(state.sessions).filter(s=>s.status==='completed').map(s=>s.day),
    catchupDays:Object.values(state.sessions).filter(s=>s.status==='skipped').map(s=>s.day),
    penalty:0,progressReset:false,additionalWorkRequired:false,calendarDeadline:null,
    progressMeaning:'lessons-completed-not-health-improvement',formalAssessment:false}
}
export function checkInBeforeLesson(state,{day,wellbeing=null,energy=null,availableTime='standard',feelingChange=null,skip=false,pauseRequested=false,now,expectedRevision}={}) {
  if(day!==state.nextDay||!availableDay(state,now))fail('DAY_NOT_AVAILABLE')
  if(typeof skip!=='boolean'||typeof pauseRequested!=='boolean'||!['quick','standard'].includes(availableTime))fail('INVALID_CHECKIN')
  const value=score(wellbeing),capacity=enumOrNull(energy,['low','usual','ample'],'INVALID_ENERGY'),change=enumOrNull(feelingChange,['better','same','worse'],'INVALID_FEELING_CHANGE')
  const next=mutation(state,expectedRevision,now)
  next.checkins[day]={day,at:now,localDate:localDateKey(time(now),state.timeZone),skipped:skip,
    wellbeing:skip?null:value,energy:skip?null:capacity,feelingChange:skip?null:change,availableTime,pauseRequested,
    measure:'optional-subjective-checkin',formalAssessment:false}
  return next
}
function validLesson(lesson,track,day) {
  return lesson&&lesson.day===day&&lesson.domain===track&&typeof lesson.id==='string'&&lesson.id&&
    typeof lesson.title==='string'&&lesson.title.trim()&&typeof lesson.aphorism==='string'&&lesson.aphorism.trim()&&
    typeof lesson.ritual==='string'&&lesson.ritual.trim()&&typeof lesson.reflection==='string'&&lesson.reflection.trim()&&
    Array.isArray(lesson.sections)&&['arrive','learn','meditation','ritual','finish'].every(kind=>lesson.sections.some(s=>s.kind===kind&&typeof s.text==='string'&&s.text.trim()))&&
    lesson.accessibility?.eyesOpen===true&&lesson.accessibility?.naturalBreathing===true&&lesson.accessibility?.stopAnytime===true
}
export function contentCoverage21(lessonFor,tracks=[...TRACKS],locale='en') {
  if(!['en','ru'].includes(locale)||!Array.isArray(tracks)||tracks.some(t=>!TRACKS.has(t)))fail('INVALID_CONTENT_REQUEST')
  const seen=new Set(),missing=[],duplicates=[],found=[]
  for(const track of [...new Set(tracks)])for(let day=1;day<=21;day++){
    const lesson=lessonFor(track,day,locale,'standard')
    if(!validLesson(lesson,track,day)){missing.push({track,day});continue}
    if(seen.has(lesson.id))duplicates.push({track,day,id:lesson.id});seen.add(lesson.id);found.push({track,day,id:lesson.id})
  }
  return {complete:missing.length===0&&duplicates.length===0,expected:[...new Set(tracks)].length*21,found:found.length,missing,duplicates}
}
export function dailyLesson(state,{now,locale='en',lessonFor,includeOptional=false,confirmAlternative=false}={}) {
  const view=journeyStatus(state,now)
  if(view.status!=='lesson-ready')return {...view,lesson:null}
  if(!['en','ru'].includes(locale)||typeof lessonFor!=='function')fail('INVALID_CONTENT_REQUEST')
  const tracks=[...new Set(state.topics.map(t=>t.track))],day=state.nextDay,track=tracks[(day-1)%tracks.length]
  const checkin=state.checkins[day]
  const length=state.preferences.length==='quick'||checkin.energy==='low'||checkin.feelingChange==='worse'||checkin.availableTime==='quick'?'quick':'standard'
  if(state.preferences.stopOffer&&!confirmAlternative)return {status:'choose-comfortable-option',lesson:null,canRest:true,canStop:true,automaticIntensityIncrease:false}
  const variant=state.preferences.alternativeRequested?'grounding':length
  const lesson=lessonFor(track,day,locale,variant)
  const priorIds=new Set(Object.values(state.sessions).map(s=>s.lessonId).filter(Boolean))
  if(!validLesson(lesson,track,day)||lesson.version!==state.contentVersion||priorIds.has(lesson.id))return {status:'material-unavailable',day,track,lesson:null}
  // A requested alternative must actually be a prepared alternative, not just a label.
  if(variant==='grounding'&&lesson.variant!=='grounding')return {status:'alternative-unavailable',day,track,lesson:null,canRest:true}
  const relatedScaleIds=state.topics.filter(t=>t.track===track).map(t=>t.scaleId)
  let optional=null
  if(includeOptional&&tracks.length>1){
    const other=tracks[day%tracks.length],candidate=lessonFor(other,day,locale,'quick')
    if(validLesson(candidate,other,day)&&candidate.version===state.contentVersion&&!priorIds.has(candidate.id))optional=candidate
  }
  const repeat=Object.values(state.sessions).filter(s=>s.status==='completed'&&s.lessonId&&s.feedback?.helpfulness==='helpful'&&day-s.day>=3).sort((a,b)=>b.day-a.day)[0]
  return {status:'ready',day,...courseWeek(day),track,relatedScaleIds,lesson,optional,
    repeatSuggestion:repeat?{day:repeat.day,lessonId:repeat.lessonId,optional:true}:null,
    personalization:'prepared-rule-based-content',length:lesson.length??length,automaticIntensityIncrease:false,
    canRest:true,canStop:true,feedbackCanBeSkipped:true,commentsExternalTransmission:false,formalAssessment:false}
}
export function feedbackProposal({helpfulness=null,difficulty=null,comfort=null,comment='',reflectionAnswer=''}={}) {
  const useful=enumOrNull(helpfulness,['helpful','neutral','not-helpful'],'INVALID_HELPFULNESS')
  const hard=enumOrNull(difficulty,['manageable','too-hard'],'INVALID_DIFFICULTY')
  const comfortable=enumOrNull(comfort,['comfortable','neutral','uncomfortable'],'INVALID_COMFORT')
  const text=optionalText(comment),answer=optionalText(reflectionAnswer)
  return {helpfulness:useful,difficulty:hard,comfort:comfortable,comment:text,reflectionAnswer:answer,
    proposal:{length:hard==='too-hard'?'quick':null,alternativeRequested:comfortable==='uncomfortable'||useful==='not-helpful',stopOffer:comfortable==='uncomfortable'},
    commentProcessing:'private-journal-only-not-automatically-interpreted',externalTransmission:false,monitoredForUrgentHelp:false}
}
export function finishCourseDay(state,{day,lessonId=null,status='completed',feedback={},applyFeedback=false,now,expectedRevision,lessonFor,locale='en',confirmAlternative=false}={}) {
  if(typeof applyFeedback!=='boolean'||typeof confirmAlternative!=='boolean')fail('INVALID_FEEDBACK_CONFIRMATION')
  // Repository CAS makes duplicate concurrent clicks idempotent at the HTTP layer.
  if(!['completed','skipped'].includes(status)||day!==state.nextDay||!availableDay(state,now))fail('DAY_NOT_AVAILABLE')
  if(!state.checkins[day]||state.checkins[day].localDate!==localDateKey(time(now),state.timeZone))fail('CHECKIN_OR_EXPLICIT_SKIP_REQUIRED')
  let chosen=null
  if(status==='completed'){
    const current=dailyLesson(state,{now,locale,lessonFor,confirmAlternative})
    if(current.status!=='ready'||current.lesson.id!==lessonId)fail('EXACT_CURRENT_LESSON_REQUIRED')
    chosen=current
  }
  const response=feedbackProposal(feedback),next=mutation(state,expectedRevision,now)
  next.sessions[day]={day,lessonId:chosen?.lesson.id??null,lessonVersion:chosen?.lesson.version??null,lessonVariant:chosen?.lesson.variant??null,track:chosen?.track??null,status,at:now,
    localDate:localDateKey(time(now),state.timeZone),feedback:response,feedbackApplied:applyFeedback===true}
  if(applyFeedback){
    if(response.proposal.length)next.preferences.length=response.proposal.length
    if(response.proposal.alternativeRequested)next.preferences.alternativeRequested=true
    if(response.proposal.stopOffer)next.preferences.stopOffer=true
  }
  next.nextDay++
  if(next.nextDay>21)next.status='finished'
  return next
}
export function setCoursePreferences(state,{length,alternativeRequested,stopOffer,now,expectedRevision}={}) {
  if(!['quick','standard'].includes(length)||typeof alternativeRequested!=='boolean'||typeof stopOffer!=='boolean')fail('INVALID_PREFERENCES')
  const next=mutation(state,expectedRevision,now)
  next.preferences={length,alternativeRequested,stopOffer};return next
}
export function pauseCourseJourney(state,{paused,now,expectedRevision}={}) {
  if(typeof paused!=='boolean'||state.status==='finished')fail('INVALID_PAUSE')
  const next=mutation(state,expectedRevision,now);next.status=paused?'paused':'active';return next
}
export function reviewCourseLesson(state,{day,locale='en',lessonFor}={}) {
  assertState(state)
  if(!state.sessions[day]||!['en','ru'].includes(locale))fail('LESSON_NOT_YET_RELEASED')
  const tracks=[...new Set(state.topics.map(t=>t.track))],track=tracks[(day-1)%tracks.length]
  const session=state.sessions[day],lesson=lessonFor(track,day,locale,session.lessonVariant??'quick')
  const valid=validLesson(lesson,track,day)&&lesson.version===state.contentVersion&&(session.status==='skipped'||(lesson.id===session.lessonId&&lesson.version===session.lessonVersion))
  return {status:valid?'ready':'material-unavailable',lesson:valid?lesson:null,
    mode:state.sessions[day].status==='skipped'?'optional-catchup':'optional-repeat',changesProgress:false}
}
