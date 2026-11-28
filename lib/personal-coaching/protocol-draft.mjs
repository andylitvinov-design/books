import {normalizeMyCoachProtocol} from './session-protocol.mjs'
import {normalizeCoachCourseSessionId} from '../coaching/coach-course-journey.mjs'
import {coachProfileTrackForCourse} from '../coaching/coach-profile-session-v3.mjs'
import {coachTranscriptQualityExtends} from './protocol-quality.mjs'
import {speechAmendmentsExtend} from './speech-amendments.mjs'
import {recoverPrivateOpeningScope} from './private-draft-resume.mjs'
import {coachOpeningProgress} from '../coaching/coach-opening-protocol.mjs'
import {coachCourseProtocolSchema,normalizeCoachCourseFieldReview} from '../coaching/coach-course-protocol-schema.mjs'
import {checkpointQuestionMatches,checkpointConfirmationMatches} from '../coaching/coach-course-question-binding.mjs'
import {protocolAnswerClass} from '../coaching/coach-protocol-validation-gate.mjs'
import {boundTranscriptReview} from '../coaching/coach-session-stage-view.mjs'

// Only reconstruct exact client-confirmed answers from the consented transcript.
// This is not a trusted provider receipt, course enrollment or final report.
export function deriveCoachDraftReview(protocol,courseSessionId){
 if(!protocol?.opening?.completed||!Array.isArray(protocol.turns)||protocol.courseSessionId!==undefined&&protocol.courseSessionId!==courseSessionId)return null
 const scope=recoverPrivateOpeningScope(protocol)
 if(!scope.matched)return null
 const turns=protocol.turns
 const opening=coachOpeningProgress({...scope,turns:turns.filter(t=>t.role==='user'&&t.unanswered!==true).slice(0,32).map(t=>t.content.slice(0,160)),personaId:protocol.personaId,locale:protocol.locale})
 if(!opening.completed||opening.declined||!['goal','challenge','self_exploration'].includes(opening.answers?.focus?.kind))return null
 const schemas=['en','ru','es'].map(locale=>({locale,schema:coachCourseProtocolSchema(courseSessionId,locale)}))
 if(!schemas[0].schema)return null
 let afterIndex=-1,count=0
 for(let i=0;i<turns.length&&count<opening.consumedTurns;i++)if(turns[i].role==='user'&&turns[i].unanswered!==true){count++;afterIndex=i}
 if(count!==opening.consumedTurns)return null
 const matches=(row,text,quote,echo)=>schemas.some(({locale,schema})=>{
  const field=schema?.checkpoints.find(f=>f.id===row.id)
  return field&&checkpointQuestionMatches(field,locale,text)&&(echo===undefined||checkpointConfirmationMatches(field,text,quote,locale,echo))
 })
 return boundTranscriptReview({courseId:courseSessionId,turns,fields:schemas[0].schema.checkpoints,afterIndex,
  matchQuestion:(row,q)=>matches(row,q),matchEcho:(row,q,quote,echo)=>matches(row,q,quote,echo),
  answerClass:protocolAnswerClass,normalize:normalizeCoachCourseFieldReview})
}
export function normalizeMyCoachDraft(value){
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('MY_COACH_DRAFT_INVALID')
 const {protocol,courseSessionId,privateProfileV3Requested}=value
 if(!protocol||typeof protocol!=='object'||Array.isArray(protocol))throw Error('MY_COACH_DRAFT_INVALID')
 // The dialogue is not a reviewed report. Never store a generated conclusion.
 const clean=normalizeMyCoachProtocol({...protocol,goal:'',clientSummary:'',clientNextStep:'',courseFieldReview:undefined})
 const course=normalizeCoachCourseSessionId(courseSessionId)
 if(clean.courseSessionId!==undefined&&clean.courseSessionId!==course)throw Error('MY_COACH_DRAFT_INVALID')
 // A fresh private entry is only a user preference, never a proof or provider grant.
 if(privateProfileV3Requested!==undefined&&(privateProfileV3Requested!==true||!coachProfileTrackForCourse(course)||clean.profileCheckin?.ratings?.length))throw Error('MY_COACH_DRAFT_INVALID')
 return {courseSessionId:course,
  ...(privateProfileV3Requested===true?{privateProfileV3Requested:true}:{}),
  protocol:{...clean,provenance:'client_autosaved_unreviewed_draft'}}
}
// The greeting picker needs metadata, not private transcript content.
// The full record is read only by the existing revision-bound resume action.
export function coachDraftListSummary(item){
 const {id,revision,updatedAt,courseSessionId,protocol}=item
 return {id,revision,updatedAt,courseSessionId,personaId:protocol.personaId,
  locale:protocol.locale,...(typeof protocol.startedAt==='string'&&Number.isFinite(Date.parse(protocol.startedAt))?{startedAt:protocol.startedAt}:{}),turnCount:protocol.turns.length,durationSeconds:coachDraftElapsedSeconds(protocol.durationSeconds)}
}
// Presentation checkpoint only; never a server voice entitlement or timed-end proof.
export function coachDraftElapsedSeconds(seconds){
 return Number.isInteger(seconds)&&seconds>=0&&seconds<=7200?seconds:null
}
export function coachDraftDurationExtends(previous,next){
 const before=coachDraftElapsedSeconds(previous?.durationSeconds),after=coachDraftElapsedSeconds(next?.durationSeconds)
 return before===null||(after!==null&&after>=before)
}
export function coachDraftMinuteLabel(seconds,locale='en'){
 const n=coachDraftElapsedSeconds(seconds)
 if(n===null)return ({ru:'Время не записано',en:'Time not recorded',es:'Tiempo sin registrar'})[locale]||'Time not recorded'
 const elapsed=Math.floor(n/60)+':'+String(n%60).padStart(2,'0')
 return elapsed+' / 20:00 '+(({ru:'пройдено',en:'elapsed',es:'transcurridos'})[locale]||'elapsed')
}
export function draftTranscriptPrefix(previous,next){
 if(!previous||!next||previous.id!==next.id||previous.personaId!==next.personaId||
    previous.startedAt!==next.startedAt||previous.turns.length>next.turns.length||!speechAmendmentsExtend(previous,next))return false
 return previous.turns.every((turn,i)=>turn.role===next.turns[i]?.role&&turn.content===next.turns[i]?.content&&coachTranscriptQualityExtends(turn,next.turns[i])&&
  (turn.interrupted!==true||next.turns[i]?.interrupted===true)&&
  (turn.unanswered!==true||next.turns[i]?.unanswered===true||
   // A checkpoint's trailing pending turn may become answered only when
   // an actual assistant turn has been appended immediately after it.
   (i===previous.turns.length-1&&next.turns[i+1]?.role==='assistant')))
}
export function validDraftRevision(value){return Number.isInteger(value)&&value>=1&&value<=9999}
// The absence of a revision is a legacy manual save only, never permission
// to bypass a live draft or resurrect a discarded/finalized logical ID.
export function coachDraftReviewDecision(row,revision,existing){
 if(revision!==undefined&&(!Number.isInteger(revision)||revision<0||revision>9999))return 'invalid'
 if(!row)return revision===undefined||revision===0?'new':'conflict'
 if(row.state==='finalized')return existing?'retry':'conflict'
 if(row.state!=='active'||revision===undefined||revision!==row.revision||existing)return 'conflict'
 return 'promote'
}
