import {coachCourseHandoffEligible} from '../coaching/coach-course-continuity.mjs'
import {clarityCourseDay} from '../coaching/clarity-course.mjs'
import {clarityClockResumeTime} from '../coaching/clarity-course-clock.mjs'
import {normalizeMyCoachProtocol} from './session-protocol.mjs'
import {normalizeCoachCourseSessionId} from '../coaching/coach-course-journey.mjs'
import {coachProfileTrackForCourse} from '../coaching/coach-profile-session-v3.mjs'
import {coachTranscriptQualityExtends} from './protocol-quality.mjs'
import {recoverPrivateOpeningScope} from './private-draft-resume.mjs'
import {coachOpeningProgress} from '../coaching/coach-opening-protocol.mjs'
import {coachCourseProtocolSchema,normalizeCoachCourseFieldReview,COACH_COURSE_FIELD_REVIEW_VERSION} from '../coaching/coach-course-protocol-schema.mjs'
import {checkpointQuestionMatches,checkpointConfirmationMatches} from '../coaching/coach-course-question-binding.mjs'
import {protocolAnswerClass} from '../coaching/coach-protocol-validation-gate.mjs'
// Reconstruct only explicitly affirmed, question-bound answers from the saved
// dialogue of legacy thematic sessions. This is NOT a versioned Director
// receipt or a final report. Later unfinished questions cannot erase a
// previously confirmed answer. Clarity uses its own encrypted gate ledger.
export function deriveCoachDraftReview(protocol,courseSessionId){
 if(!protocol?.opening?.completed||clarityCourseDay(courseSessionId)||!Array.isArray(protocol.turns))return null
 const scope=recoverPrivateOpeningScope(protocol)
 if(!scope.matched)return null
 const turns=protocol.turns,opening=coachOpeningProgress({...scope,turns:turns.filter(t=>t.role==='user'&&t.unanswered!==true).slice(0,32).map(t=>t.content.slice(0,160)),personaId:protocol.personaId,locale:protocol.locale})
 if(!opening.completed||opening.declined||opening.answers?.focus?.kind==='profile')return null
 const schemas=['en','ru','es'].map(locale=>({locale,schema:coachCourseProtocolSchema(courseSessionId,locale)}))
 if(!schemas[0].schema)return null
 let openingEnd=-1,count=0
 for(let i=0;i<turns.length&&count<opening.consumedTurns;i++){
  if(turns[i].role==='user'&&turns[i].unanswered!==true){count++;openingEnd=i}
 }
 if(count!==opening.consumedTurns)return null
 let review=null
 for(let q=openingEnd+1;q+3<turns.length;q++){
  const [question,answer,echo,confirm]=turns.slice(q,q+4)
  if(question.role!=='assistant'||question.interrupted||answer.role!=='user'||answer.unanswered||answer.interim||protocolAnswerClass(answer.content)!=='candidate'||echo.role!=='assistant'||echo.interrupted||confirm.role!=='user'||confirm.unanswered||confirm.interim||protocolAnswerClass(confirm.content)!=='affirm')continue
  const quote=answer.content.trim(),matches=new Set()
  for(const {locale,schema} of schemas)for(const field of schema?.checkpoints||[]){
   if(checkpointQuestionMatches(field,locale,question.content)&&checkpointConfirmationMatches(field,question.content,quote,locale,echo.content))matches.add(field.id)
  }
  if(matches.size!==1)continue
  const fieldId=[...matches][0],events=review?.events||[]
  if(events.length>=64)break
  try{review=normalizeCoachCourseFieldReview({version:COACH_COURSE_FIELD_REVIEW_VERSION,courseSessionId,events:[...events,{fieldId,status:'confirmed',turnIndex:q+1,quote,revision:events.length+1,binding:{questionTurnIndex:q,confirmationTurnIndex:q+3}}]},courseSessionId,turns)}catch{/* Invalid or unrelated answer remains open. */}
 }
 return review
}
export function normalizeMyCoachDraft(value){
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('MY_COACH_DRAFT_INVALID')
 const {protocol,courseSessionId,privateProfileV3Requested}=value
 if(!protocol||typeof protocol!=='object'||Array.isArray(protocol))throw Error('MY_COACH_DRAFT_INVALID')
 // The dialogue is not a reviewed report. Never store a generated conclusion.
 const clean=normalizeMyCoachProtocol({...protocol,goal:'',clientSummary:'',clientNextStep:'',courseFieldReview:undefined,clarityTimeLimitReached:undefined,clarityHomeworkAccepted:undefined})
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
export function coachDraftListSummary(item,clock=null,binding=null){
 const {id,revision,updatedAt,courseSessionId,protocol}=item
 const clarityTime=binding?binding.clarityTime:clarityClockResumeTime(clock,clarityCourseDay(courseSessionId),protocol.id)
 return {id,revision,updatedAt,courseSessionId,personaId:protocol.personaId,...(binding?{courseRunId:binding.courseRunId,courseOrdinal:binding.courseOrdinal}:{}),...(clarityTime?{clarityTime}:{}),
  locale:protocol.locale,turnCount:protocol.turns.length,...(!clarityCourseDay(courseSessionId)?{durationSeconds:coachDraftElapsedSeconds(protocol.durationSeconds)}:{}),...(coachCourseHandoffEligible(courseSessionId,item.courseGate)?{crossCoach:true,activeCoachId:item.courseGate.activeCoachId||protocol.personaId}:{})}
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
    previous.startedAt!==next.startedAt||previous.turns.length>next.turns.length)return false
 return previous.turns.every((turn,i)=>turn.role===next.turns[i]?.role&&turn.content===next.turns[i]?.content&&coachTranscriptQualityExtends(turn,next.turns[i])&&
  (turn.coachId===undefined||turn.coachId===next.turns[i]?.coachId)&&turn.visitId===next.turns[i]?.visitId&&turn.authorPersonaId===next.turns[i]?.authorPersonaId&&
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
