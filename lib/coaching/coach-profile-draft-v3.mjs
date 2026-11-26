/** Private typed profile continuation in the existing My Coach draft.
 * Input is a locked/decrypted server record, never caller-authored history.
 * Existing opening is a workflow gate, not a signed identity/consent claim.
 * Only answers tied to a server-issued prompt are measured. No provider call.
 */
import {coachProfileTrackForCourse,createCoachProfileSessionV3,replayCoachProfileSessionV3} from './coach-profile-session-v3.mjs'
import {startCoachProfileDirectorV3,confirmCoachProfilePromptV3,answerCoachProfileDirectorV3,
 prioritizeCoachProfileDirectorV3,correctCoachProfileDirectorV3,closeCoachProfileDirectorV3} from './coach-profile-director-v3.mjs'
import {recoverPrivateOpeningScope} from '../personal-coaching/private-draft-resume.mjs'
const invalid=()=>{throw Error('COACH_PROFILE_DRAFT_INVALID')}
const shapes=Object.freeze({
 'profile-start':['action','id','revision','consent'],
 'profile-answer':['action','id','revision','consent','questionId','questionTurnId','content'],
 'profile-priority':['action','id','revision','consent'],
 'profile-correct':['action','id','revision','consent','axis','slot'],
 'profile-close':['action','id','revision','consent']
})
export function coachProfileDraftRequestV3(input){
 if(!input||typeof input!=='object'||Array.isArray(input)||!Object.hasOwn(shapes,input.action)||
    Object.keys(input).length!==shapes[input.action].length||
    shapes[input.action].some(k=>!Object.hasOwn(input,k))||
    input.consent!==true||typeof input.id!=='string'||!Number.isInteger(input.revision)||
    input.revision<1||input.revision>=9999)invalid()
 if(input.action==='profile-answer'&&(typeof input.questionId!=='string'||input.questionId.length>200||
    typeof input.questionTurnId!=='string'||input.questionTurnId.length>96||
    typeof input.content!=='string'||!input.content.trim()||input.content.length>1200))invalid()
 if(input.action==='profile-correct'&&(typeof input.axis!=='string'||!['current','desired'].includes(input.slot)))invalid()
 return input
}
export const coachProfileDraftActiveV3=value=>Boolean(value?.profileDirectorV3&&value.profileDirectorV3.ledger.events.at(-1)?.kind!=='close')
export function coachProfileDraftViewV3(value){
 const state=value?.profileDirectorV3
 if(!state)return null
 const {ledger}=state,pending=ledger.pending
 const progress=replayCoachProfileSessionV3(createCoachProfileSessionV3(ledger),ledger.events)
 return {track:coachProfileTrackForCourse(ledger.courseSessionId),
  closed:progress.closed,canPrioritize:Boolean(!progress.closed&&!progress.correction&&!progress.priorityPhase&&pending&&pending.question.slot!=='priority'),
  pending:pending?{id:pending.question.id,turnId:pending.questionTurnId,
    text:pending.question.text,axis:pending.question.axis,slot:pending.question.slot}:null}
}
/** The owner replies through a typed input bound to the issued question and
 * attempt. This does NOT claim an audio prompt was heard. Voice transport
 * must separately confirm delivery before using the Director adapter.
 */
export function coachProfileDraftTransitionV3(value,input,serverNow){
 coachProfileDraftRequestV3(input)
 const old=value?.protocol
 if(!old||input.id!==old.id||input.revision!==value.revision||
    !Array.isArray(old.turns)||!old.turns.length||
    !coachProfileTrackForCourse(value.courseSessionId)||
    old.courseSessionId!==value.courseSessionId)invalid()
 let state=value.profileDirectorV3,ledger
 if(input.action==='profile-start'){
  if(state||old.lifeBalanceCheckin||old.meaningAxesCheckin||
     old.profileCheckin?.ratings?.length||
     old.opening?.completed!==true||old.opening?.declined===true||
     old.opening?.focus!=='profile'||!recoverPrivateOpeningScope(old).matched)invalid()
  // Do not invent timestamps or source IDs for the preceding local dialogue.
  ledger=startCoachProfileDirectorV3({sessionId:old.id,courseSessionId:value.courseSessionId,locale:old.locale},serverNow)
  state={prefixLength:old.turns.length,ledger}
 }else{
  if(!state||!coachProfileDraftActiveV3(value))invalid()
  const prior=state.ledger
  if(prior.sessionId!==old.id||prior.courseSessionId!==value.courseSessionId||
     prior.locale!==old.locale||!Number.isInteger(state.prefixLength)||state.prefixLength<1||
     state.prefixLength+prior.transcript.length!==old.turns.length)invalid()
  const pending=prior.pending,revision=pending?.question.revision??
    prior.events.length
  if(input.action==='profile-answer'){
   if(!pending||pending.question.id!==input.questionId||pending.questionTurnId!==input.questionTurnId)invalid()
   const delivered=confirmCoachProfilePromptV3(prior,{expectedRevision:revision,
    questionTurnId:pending.questionTurnId,content:pending.question.text},serverNow)
   ledger=answerCoachProfileDirectorV3(delivered,{expectedRevision:revision,
    questionId:pending.question.id,content:input.content},serverNow)
  }else if(input.action==='profile-priority')ledger=prioritizeCoachProfileDirectorV3(prior,revision,serverNow)
  else if(input.action==='profile-correct')ledger=correctCoachProfileDirectorV3(prior,revision,input.axis,input.slot,serverNow)
  else ledger=closeCoachProfileDirectorV3(prior,revision)
  state={prefixLength:state.prefixLength,ledger}
 }
 const prefix=old.turns.slice(0,state.prefixLength)
 const tail=ledger.transcript.map(row=>({role:row.role,content:row.content,
  ...(row.interrupted===true?{interrupted:true}:{}),
  ...(row.role==='assistant'?{mode:'offline'}:{})}))
 const turns=[...prefix,...tail].map((row,index,all)=>{
  // The last unanswered client turn can cease being last after a new reply.
  if(row.unanswered===true&&index<all.length-1){const {unanswered,...rest}=row;return rest}
  return row
 })
 if(turns.length>160)invalid()
 const {profileCheckin:legacy,lifeBalanceCheckin:outer,meaningAxesCheckin:inner,...base}=old
 const protocol={...base,courseSessionId:value.courseSessionId,turnLayout:'chronological',completedAt:serverNow,turns}
 const serverLedger=ledger.events.some(event=>event.kind==='answer')?
  {...ledger,acknowledgedPrefix:prefix}:null
 return {protocol,profileDirectorV3:state,serverLedger}
}
