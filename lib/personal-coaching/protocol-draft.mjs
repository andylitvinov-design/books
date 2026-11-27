import {coachCourseHandoffEligible} from '../coaching/coach-course-continuity.mjs'
import {clarityCourseDay} from '../coaching/clarity-course.mjs'
import {clarityClockResumeTime} from '../coaching/clarity-course-clock.mjs'
import {normalizeMyCoachProtocol} from './session-protocol.mjs'
import {normalizeCoachCourseSessionId} from '../coaching/coach-course-journey.mjs'
import {coachProfileTrackForCourse} from '../coaching/coach-profile-session-v3.mjs'
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
// Match only the requested course on the owner-scoped, decrypted page.
// Cross-coach discovery is limited to the same Clarity day and an eligible persisted gate.
export function coachDraftMatchesResume(item,personaId,courseSessionId=null){
 if(!item?.protocol||typeof personaId!=='string'||!personaId)return false
 if(courseSessionId===null||courseSessionId===undefined)return item.protocol.personaId===personaId
 if(!clarityCourseDay(courseSessionId)||item.courseSessionId!==courseSessionId)return false
 return item.protocol.personaId===personaId||coachCourseHandoffEligible(courseSessionId,item.courseGate)
}
// The greeting picker needs metadata, not private transcript content.
// The full record is read only by the existing revision-bound resume action.
export function coachDraftListSummary(item,clock=null){
 const {id,revision,updatedAt,courseSessionId,protocol}=item
 const clarityTime=clarityClockResumeTime(clock,clarityCourseDay(courseSessionId),protocol.id)
 return {id,revision,updatedAt,courseSessionId,personaId:protocol.personaId,...(clarityTime?{clarityTime}:{}),
  locale:protocol.locale,turnCount:protocol.turns.length,...(coachCourseHandoffEligible(courseSessionId,item.courseGate)?{crossCoach:true,activeCoachId:item.courseGate.activeCoachId||protocol.personaId}:{})}
}
export function draftTranscriptPrefix(previous,next){
 if(!previous||!next||previous.id!==next.id||previous.personaId!==next.personaId||
    previous.startedAt!==next.startedAt||previous.turns.length>next.turns.length)return false
 return previous.turns.every((turn,i)=>turn.role===next.turns[i]?.role&&turn.content===next.turns[i]?.content&&
  turn.coachId===next.turns[i]?.coachId&&turn.visitId===next.turns[i]?.visitId&&turn.authorPersonaId===next.turns[i]?.authorPersonaId&&
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
