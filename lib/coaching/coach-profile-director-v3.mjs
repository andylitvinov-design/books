/** First-party profile step adapter for the existing authenticated Director.
 * This is not an API or a second coach engine. The caller must load the
 * acknowledged server-owned ledger under the existing per-session CAS lock,
 * verify owner/consent/opening completion and supply the server clock.
 * Never accept a browser-supplied ledger, baseline, role, source ID or timestamp.
 */
import {createCoachProfileSessionV3,replayCoachProfileSessionV3,coachProfileQuestionV3,
 applyCoachProfileAnswerV3,requestCoachProfilePriorityV3,requestCoachProfileCorrectionV3,
 closeCoachProfileSessionV3} from './coach-profile-session-v3.mjs'
import {buildCoachProfileArchiveV3} from './coach-profile-archive-v3.mjs'
const invalid=()=>{throw Error('COACH_PROFILE_DIRECTOR_INVALID')}
const stamp=v=>{if(typeof v!=='string'||!Number.isFinite(Date.parse(v)))invalid();return new Date(v).toISOString()}
const clone=v=>JSON.parse(JSON.stringify(v))
const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v)}return v}
const last=v=>v.transcript.at(-1)
function stateOf(ledger){
 if(!ledger||!Array.isArray(ledger.events)||!Array.isArray(ledger.transcript)||
  ledger.events.length>160||ledger.transcript.length>160)invalid()
 return replayCoachProfileSessionV3(createCoachProfileSessionV3(ledger),ledger.events)
}
function append(ledger,row){
 if(ledger.transcript.length>=160||ledger.transcript.some(v=>v.id===row.id)||
    (last(ledger)&&Date.parse(row.recordedAt)<Date.parse(last(ledger).recordedAt)))invalid()
 ledger.transcript.push(row)
}
function issue(ledger,state,now){
 const question=coachProfileQuestionV3(state)
 ledger.pending=null
 if(!question)return
 // Issuance is not delivery. Do not invent a spoken/displayed turn.
 ledger.pending={question,questionTurnId:'hh-profile-q-'+state.revision+'-'+ledger.transcript.length,
   issuedAt:now,delivered:false}
}
/** Invoke only after existing Director and consent gates authorize profile entry.
 * Prefix is the real server transcript (not reconstructed from model text).
 * No existing prefix row may be assigned a new timestamp or ID.
 */
export function startCoachProfileDirectorV3({sessionId,courseSessionId,locale,approvedBaseline=[],serverTranscript=[]},serverNow){
 const initial=createCoachProfileSessionV3({sessionId,courseSessionId,locale,approvedBaseline})
 if(!Array.isArray(serverTranscript)||serverTranscript.length>=160)invalid()
 const ledger={sessionId:initial.sessionId,courseSessionId,locale:initial.locale,
  approvedBaseline:clone(approvedBaseline),events:[],transcript:[],pending:null}
 for(const row of serverTranscript){
  if(!row||typeof row.id!=='string'||!row.id||!['assistant','user'].includes(row.role)||
     row.final!==true||row.interim===true||typeof row.content!=='string'||!row.content.trim()||row.content.length>1200)invalid()
  append(ledger,{...clone(row),recordedAt:stamp(row.recordedAt)})
 }
 issue(ledger,initial,stamp(serverNow))
 return freeze(ledger)
}
function checked(ledger,expectedRevision){
 const state=stateOf(ledger)
 if(state.closed||expectedRevision!==state.revision)invalid()
 return state
}
/** Trusted transport completion only, under the same acknowledged session
 * lock. A browser's proposed transcript is not delivery evidence. For a
 * voice interruption preserve the observed partial text, invalidate its
 * attempt ID and require a fresh delivery before accepting any rating.
 */
export function confirmCoachProfilePromptV3(ledger,{expectedRevision,questionTurnId,content,interrupted=false},serverNow){
 const state=checked(ledger,expectedRevision),pending=ledger.pending
 if(!pending||pending.delivered||pending.questionTurnId!==questionTurnId||
    pending.question.id!==coachProfileQuestionV3(state)?.id||
    typeof content!=='string'||!content.trim()||content.length>1200||
    typeof interrupted!=='boolean'||(!interrupted&&content.trim()!==pending.question.text))invalid()
 const now=stamp(serverNow)
 if(Date.parse(now)<Date.parse(pending.issuedAt))invalid()
 const next=clone(ledger)
 append(next,{id:pending.questionTurnId,role:'assistant',content:content.trim(),
  final:true,questionId:pending.question.id,recordedAt:now,...(interrupted?{interrupted:true}:{})})
 if(interrupted)issue(next,state,now)
 else next.pending.delivered=true
 return freeze(next)
}
/** The request contains only the current explicit question ID and actual
 * finalized user words. Server supplies revision, ID, role and received time.
 * Stale or repeated turn IDs cannot move the current acknowledged ledger.
 */
export function answerCoachProfileDirectorV3(ledger,{expectedRevision,questionId,content},serverNow){
 const state=checked(ledger,expectedRevision),pending=ledger.pending
 const expected=coachProfileQuestionV3(state)
 if(!pending||!pending.delivered||!expected||pending.question.id!==expected.id||questionId!==expected.id||
    last(ledger)?.id!==pending.questionTurnId||last(ledger)?.interrupted===true||
    typeof content!=='string'||!content.trim()||content.length>1200)invalid()
 const next=clone(ledger),now=stamp(serverNow)
 const turn={id:'hh-profile-u-'+state.revision,role:'user',content:content.trim(),
  final:true,questionId,recordedAt:now}
 const advanced=applyCoachProfileAnswerV3(state,pending.question,turn)
 append(next,turn)
 next.events.push({kind:'answer',question:pending.question,questionTurnId:pending.questionTurnId,turn})
 issue(next,advanced,now)
 return freeze(next)
}
/** The existing Director authorizes this transition only after a client
 * request or the agreed timebox. Caller must not map arbitrary client JSON
 * straight to this helper. Preserve an unanswered previous question.
 */
export function prioritizeCoachProfileDirectorV3(ledger,expectedRevision,serverNow){
 const state=checked(ledger,expectedRevision),next=clone(ledger)
 const advanced=requestCoachProfilePriorityV3(state)
 next.events.push({kind:'prioritize'})
 issue(next,advanced,stamp(serverNow))
 return freeze(next)
}
export function correctCoachProfileDirectorV3(ledger,expectedRevision,axis,slot,serverNow){
 const state=checked(ledger,expectedRevision),next=clone(ledger)
 const advanced=requestCoachProfileCorrectionV3(state,axis,slot)
 next.events.push({kind:'correction',axis,slot})
 issue(next,advanced,stamp(serverNow))
 return freeze(next)
}
export function closeCoachProfileDirectorV3(ledger,expectedRevision){
 const state=checked(ledger,expectedRevision),next=clone(ledger)
 closeCoachProfileSessionV3(state)
 next.events.push({kind:'close'});next.pending=null
 return freeze(next)
}
/** Only the server ledger may reach the existing HMAC receipt issuer. A
 * no-answer visit never produces a measured profile or a fabricated result.
 */
export function coachProfileDirectorArchiveV3(ledger){
 return buildCoachProfileArchiveV3(ledger)
}
