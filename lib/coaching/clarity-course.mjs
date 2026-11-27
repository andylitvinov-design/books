import {clarityResumeRunId} from './clarity-resume-scope.mjs'
import {clarityClockTimedEnd} from './clarity-course-clock.mjs'
import {coachCourseProtocolSchema,coachCourseProtocolRows,coachReviewScenarioVersion} from './coach-course-protocol-schema.mjs'
import {clarityRatingDefinition,clarityRatingAnswer,clarityCurrentRating} from './clarity-session-fields.mjs'
import {checkpointAnswerMismatch} from './coach-course-question-binding.mjs'
import {CLARITY_DAY_ONE_VERSION,clarityDayOneGateFields} from './clarity-day-one-scenario.mjs'
import {protocolAnswerClass} from './coach-protocol-validation-gate.mjs'
import {clarityScenarioVersion,clarityVersionedScenario} from './clarity-course-scenarios.mjs'
import {CLARITY_SYLLABUS,clarityLocale,clarityDaybookPath} from '../app/clarity-program.mjs'
export const CLARITY_COURSE_SECONDS=1200
export const CLARITY_COURSE_IDS=Object.freeze(['clarity_day_1','clarity_day_2','clarity_day_3'])
export function clarityDay(value){
 return typeof value==='number'&&Number.isInteger(value)&&value>=1&&value<=3?value:
  typeof value==='string'&&/^[123]$/.test(value)?Number(value):null
}
export const clarityCourseDay=id=>CLARITY_COURSE_IDS.indexOf(id)+1||null
export const clarityCourseId=day=>CLARITY_COURSE_IDS[(clarityDay(day)||0)-1]||null
export const CLARITY_COURSE_GROUP=Object.freeze({id:'clarity-three-day',title:Object.freeze({en:'Clarity & Support · 3 days',ru:'Ясность и поддержка · 3 дня',es:'Claridad y apoyo · 3 días'}),
 sessions:Object.freeze(CLARITY_COURSE_IDS.map((id,i)=>Object.freeze({id,programId:'clarity-three-day',number:i+1,
 title:Object.freeze(Object.fromEntries(['en','ru','es'].map(l=>[l,CLARITY_SYLLABUS[l][i][0]]))),
 description:Object.freeze(Object.fromEntries(['en','ru','es'].map(l=>[l,CLARITY_SYLLABUS[l][i][1]])))})))})
export function clarityCoachHref(href,day,courseRunId=null){
 const n=clarityDay(day)
 if(!n||typeof href!=='string'||!href.startsWith('/')||href.startsWith('//'))return href
 const url=new URL(href,'https://local.invalid')
 if(!/^\/(en|ru|es)\/(my-coach|coaching\/sessions)$/.test(url.pathname))return href
 url.searchParams.set('clarityDay',String(n))
 url.searchParams.delete('courseRunId')
 if(clarityResumeRunId(courseRunId))url.searchParams.set('courseRunId',courseRunId)
 return url.pathname+url.search
}
export function clarityReturnHref(locale,day){
 const base=clarityDaybookPath(clarityLocale(locale)),n=clarityDay(day)
 return n?base+'&clarityDay='+n:base
}
// The exact session schema is the single initial homework question set.
// This annotation is not server-issued timing, entitlement or billing proof.
// Consent and review/control fields are never independent reflection tasks.
const v5HomeworkFields=new Set(clarityDayOneGateFields().filter(row=>row.kind==='text').map(row=>row.id))
const homeworkFields=new Set([...CLARITY_COURSE_IDS.flatMap(id=>coachCourseProtocolSchema(id,'en',{includeLegacy:true}).checkpoints.map(row=>row.id)),...v5HomeworkFields,...CLARITY_COURSE_IDS.slice(1).flatMap(id=>clarityVersionedScenario(id).fields.filter(f=>f.homework===true).map(f=>f.id))])
export function clarityHomeworkEligible(protocol){
 return Boolean(clarityCourseDay(protocol?.courseSessionId))&&protocol.clarityTimeLimitReached===true&&
  protocol.durationSeconds===CLARITY_COURSE_SECONDS&&protocol.opening?.completed===true&&
  protocol.opening?.declined===false&&protocol.opening?.checkmarks?.confirmation===true&&
  typeof protocol.opening?.confirmedQuote==='string'&&Boolean(protocol.opening.confirmedQuote.trim())&&
  Array.isArray(protocol.turns)&&!protocol.turns.some(t=>t.role==='assistant'&&(t.mode==='safety'||t.mode==='boundary'))
}
export function clarityHomeworkCandidates(protocol,rows){
 if(!clarityHomeworkEligible(protocol))return []
 const scenarioVersion=coachReviewScenarioVersion(protocol.courseFieldReview)
 if(scenarioVersion===CLARITY_DAY_ONE_VERSION){
  // Revalidate the review ledger itself: display rows cannot grant consent,
  // reassign a confirmed answer, or turn a refusal into a homework task.
  let verified
  try{verified=coachCourseProtocolRows(protocol.courseSessionId,protocol.turns,protocol.courseFieldReview,protocol.locale)}catch{return []}
  const methodAccepted=verified.some(row=>row.id==='balance_consent'&&row.status==='confirmed'&&row.methodDecision==='accepted')
  const byId=new Map(verified.map(row=>[row.id,row]))
  return (Array.isArray(rows)?rows:[]).filter(row=>{
   const original=byId.get(row.id)
   return v5HomeworkFields.has(row.id)&&original&&['not_explored','needs_confirmation'].includes(original.status)&&
    ['not_explored','needs_confirmation'].includes(row.status)&&(!row.id.startsWith('outer_')||methodAccepted)&&
    typeof row.question==='string'&&row.question.trim()
  }).map(row=>({id:row.id,label:row.label,question:row.question,...(row.id.startsWith('outer_')?{ratingMode:'current'}:{})}))
 }
 if(scenarioVersion&&scenarioVersion===clarityScenarioVersion(protocol.courseSessionId)){
  let verified
  try{verified=coachCourseProtocolRows(protocol.courseSessionId,protocol.turns,protocol.courseFieldReview,protocol.locale)}catch{return []}
  const byId=new Map(verified.map(r=>[r.id,r])),requested=new Set((Array.isArray(rows)?rows:[]).filter(r=>['not_explored','needs_confirmation'].includes(r.status)).map(r=>r.id))
  return verified.filter(r=>r.homeworkEligible===true&&requested.has(r.id)&&['not_explored','needs_confirmation'].includes(r.status)&&
   (!r.requiresConsent||byId.get(r.requiresConsent)?.methodDecision==='accepted')).map(r=>({id:r.id,label:r.label,question:r.question}))
 }
 const allowed=new Set(coachCourseProtocolSchema(protocol.courseSessionId).checkpoints.map(row=>row.id))
 return (Array.isArray(rows)?rows:[]).filter(r=>allowed.has(r.id)&&['not_explored','needs_confirmation'].includes(r.status)&&typeof r.question==='string'&&r.question.trim())
  .map(r=>({id:r.id,label:r.label,question:r.question}))
}
// The local review may propose homework, but only the server-owned clock
// can authorize its projection into the saved Daybook.
export function clarityHomeworkRows(protocol,rows,clock=null){
 return protocol?.clarityHomeworkAccepted===true&&clarityClockTimedEnd(clock,clarityCourseDay(protocol.courseSessionId),protocol.id)?clarityHomeworkCandidates(protocol,rows):[]
}
// Bind one independent journal answer to the exact reviewed report and field.
const homeworkUUID=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export function clarityHomeworkTags(reportId,fieldId){
 if(typeof reportId!=='string'||!homeworkUUID.test(reportId)||!homeworkFields.has(fieldId))return null
 return ['hw:'+reportId.toLowerCase(),'hw-field:'+fieldId]
}
export function clarityHomeworkNotes(entries,reportId,fieldId){
 const tags=clarityHomeworkTags(reportId,fieldId)
 if(!tags)return []
 return (Array.isArray(entries)?entries:[]).filter(e=>e.kind==='note'&&e.goalId===null&&
  Number.isInteger(e.revision)&&e.revision>0&&typeof e.text==='string'&&e.text.trim()&&
  Array.isArray(e.tags)&&tags.every(tag=>e.tags.includes(tag))&&
  e.tags.filter(tag=>typeof tag==='string'&&tag.startsWith('hw:')).length===1&&
  e.tags.filter(tag=>typeof tag==='string'&&tag.startsWith('hw-field:')).length===1)
}
export async function clarityHomeworkEntryId(accountId,reportId,fieldId){
 const tags=clarityHomeworkTags(reportId,fieldId)
 if(!tags||typeof accountId!=='string'||!homeworkUUID.test(accountId))throw Error('INVALID_CLARITY_HOMEWORK')
 const hash=new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256',new TextEncoder().encode(['hh-clarity-homework-v1',accountId.toLowerCase(),...tags].join('|'))))
 hash[6]=(hash[6]&15)|64;hash[8]=(hash[8]&63)|128
 const hex=Array.from(hash.slice(0,16),v=>v.toString(16).padStart(2,'0')).join('')
 return [hex.slice(0,8),hex.slice(8,12),hex.slice(12,16),hex.slice(16,20),hex.slice(20,32)].join('-')
}

// Independent answers require a real response, not merely a non-empty note.
// Old free-text notes remain private and editable if they do not pass.
export function validClarityHomeworkAnswer(fieldId,text,{ratingMode}={}){
 if(!homeworkFields.has(fieldId)||typeof text!=='string')return false
 if(clarityRatingDefinition(fieldId))return Boolean(ratingMode==='current'?clarityCurrentRating(fieldId,text):clarityRatingAnswer(fieldId,text))
 return protocolAnswerClass(text)==='candidate'&&!checkpointAnswerMismatch(fieldId,text)
}
