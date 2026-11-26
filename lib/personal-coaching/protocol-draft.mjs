import {clarityCourseDay} from '../coaching/clarity-course.mjs'
import {clarityReviewExtends} from '../coaching/clarity-continuity.mjs'
import {normalizeMyCoachProtocol} from './session-protocol.mjs'
import {normalizeCoachCourseSessionId} from '../coaching/coach-course-journey.mjs'
import {coachProfileTrackForCourse} from '../coaching/coach-profile-session-v3.mjs'
export function normalizeMyCoachDraft(value){
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('MY_COACH_DRAFT_INVALID')
 const {protocol,courseSessionId,privateProfileV3Requested}=value
 if(!protocol||typeof protocol!=='object'||Array.isArray(protocol))throw Error('MY_COACH_DRAFT_INVALID')
 // The dialogue is not a reviewed report. Never store a generated conclusion.
 const clean=normalizeMyCoachProtocol({...protocol,goal:'',clientSummary:'',clientNextStep:'',courseFieldReview:clarityCourseDay(courseSessionId)?protocol.courseFieldReview:undefined})
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
  locale:protocol.locale,turnCount:protocol.turns.length}
}
export function draftTranscriptPrefix(previous,next){
 if(!previous||!next||previous.id!==next.id||previous.personaId!==next.personaId||
    previous.startedAt!==next.startedAt||previous.turns.length>next.turns.length)return false
 if(clarityCourseDay(previous.courseSessionId)&&((next.durationSeconds??0)<(previous.durationSeconds??0)||!clarityReviewExtends(previous.courseFieldReview,next.courseFieldReview)))return false
 return previous.turns.every((turn,i)=>turn.role===next.turns[i]?.role&&turn.content===next.turns[i]?.content&&turn.coachId===next.turns[i]?.coachId&&turn.visitId===next.turns[i]?.visitId&&
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
