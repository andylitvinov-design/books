/**
 * Replay -> archive adapter for the existing encrypted My Coach protocol.
 * The caller MUST obtain the question/event ledger and transcript from the
 * authenticated server, not a JSON body. This is not itself an auth boundary.
 * Archived source indices refer to the canonical transcript, including
 * assistant utterances. A current-session quote never stands for a prior score.
 */
import {createCoachProfileSessionV3,replayCoachProfileSessionV3,coachProfileSnapshotV3,
 COACH_PROFILE_SESSION_V3,coachProfileTrackForCourse} from './coach-profile-session-v3.mjs'
export const COACH_PROFILE_ARCHIVE_V3='hh-coach-profile-archive-v3'
const invalid=()=>{throw Error('COACH_PROFILE_ARCHIVE_INVALID')}
const plain=v=>v!==null&&typeof v==='object'&&!Array.isArray(v)
const id=/^[a-z0-9][a-z0-9._:-]{0,95}$/iu
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu
const text=v=>typeof v==='string'?v.trim():''
const timestamp=v=>typeof v==='string'&&Number.isFinite(Date.parse(v))?new Date(v).toISOString():null
const maxTurns=160
export function coachProfileTranscriptPrefix(turns,count){
 if(!Array.isArray(turns)||!Number.isInteger(count)||count<1||count>maxTurns||count>turns.length)invalid()
 let chars=0
 const rows=turns.slice(0,count).map(turn=>{
  if(!plain(turn)||!['user','assistant'].includes(turn.role)||!text(turn.content)||turn.content.length>1200)invalid()
  chars+=turn.content.length
  return {role:turn.role,content:text(turn.content)}
 })
 if(chars>70000)invalid()
 return rows
}
/** Never fabricate a transcript timestamp or derive source IDs from text. */
export function buildCoachProfileArchiveV3({sessionId,courseSessionId,locale,approvedBaseline=[],events,transcript}={}){
 if(!Array.isArray(events)||events.length>maxTurns||!Array.isArray(transcript)||!transcript.length||transcript.length>maxTurns)invalid()
 const prefix=coachProfileTranscriptPrefix(transcript,transcript.length)
 const byId=new Map()
 transcript.forEach((row,index)=>{
  if(typeof row.id!=='string'||!id.test(row.id)||byId.has(row.id))invalid()
  byId.set(row.id,{row,index})
 })
 const bindings=[]
 let previousIndex=-1,closed=false
 for(const event of events){
  if(closed)invalid()
  if(event?.kind==='close'){closed=true;continue}
  if(event?.kind==='correction'||event?.kind==='prioritize')continue // both must be authorized by the server caller; replay validates state and revision
  if(event?.kind!=='answer'||!plain(event.turn)||!plain(event.question))invalid()
  const {turn,question,questionTurnId}=event
  const entry=byId.get(turn.id),issued=byId.get(questionTurnId)
  // Do not bind a numerical answer to a question merely inferred from the reducer.
  // The actual, finalized Director-issued assistant prompt must precede it.
  if(!issued||!entry||issued.index<=previousIndex||issued.index>=entry.index||
    issued.row.role!=='assistant'||issued.row.final!==true||issued.row.interim===true||issued.row.interrupted===true||
    issued.row.questionId!==question.id||text(issued.row.content)!==text(question.text)||
    !timestamp(issued.row.recordedAt)||Date.parse(issued.row.recordedAt)>Date.parse(turn.recordedAt))invalid()
  if(!entry||entry.index<=previousIndex||entry.row.role!=='user'||entry.row.final!==true||
    entry.row.interim===true||entry.row.questionId!==question.id||turn.questionId!==question.id||
    prefix[entry.index].content!==text(turn.content)||!timestamp(turn.recordedAt)||
    timestamp(entry.row.recordedAt)!==timestamp(turn.recordedAt))invalid()
  previousIndex=entry.index
  bindings.push({sourceTurnId:turn.id,turnIndex:entry.index,questionId:question.id,
   questionTurnId,questionTurnIndex:issued.index,questionText:text(question.text)})
 }
 if(!bindings.length)invalid()
 const initial=createCoachProfileSessionV3({sessionId,courseSessionId,locale,approvedBaseline})
 const state=replayCoachProfileSessionV3(initial,events)
 const snapshot=coachProfileSnapshotV3(state)
 return {version:COACH_PROFILE_ARCHIVE_V3,sessionId:snapshot.sessionId,courseSessionId,
  locale:state.locale,track:snapshot.track,transcriptLength:prefix.length,snapshot,bindings}
}
/** Recheck source positions/roles/quotes against the reviewed protocol. A
 * signed server receipt must ALSO be verified before any write: shape and
 * transcript matching alone are not proof of an authorized server replay.
 */
export function validateCoachProfileArchiveV3(block,protocol){
 if(!plain(block)||block.version!==COACH_PROFILE_ARCHIVE_V3||!uuid.test(block.sessionId||'')||
    !plain(protocol)||block.sessionId.toLowerCase()!==String(protocol.id||'').toLowerCase()||
    block.courseSessionId!==protocol.courseSessionId||block.locale!==protocol.locale||
    block.track!==coachProfileTrackForCourse(block.courseSessionId)||!block.track||
    !plain(block.snapshot)||block.snapshot.version!==COACH_PROFILE_SESSION_V3||
    block.snapshot.sessionId!==block.sessionId||block.snapshot.courseSessionId!==block.courseSessionId||
    block.snapshot.track!==block.track||!Number.isInteger(block.snapshot.revision)||
    block.snapshot.revision<1||block.snapshot.revision>320||
    !['complete','partial'].includes(block.snapshot.status)||typeof block.snapshot.closed!=='boolean'||
    !Array.isArray(block.snapshot.ratings)||
    block.snapshot.ratings.length!==8||!Array.isArray(block.snapshot.corrections)||
    block.snapshot.corrections.length>maxTurns||!Array.isArray(block.bindings)||
    !block.bindings.length||block.bindings.length>maxTurns)invalid()
 const prefix=coachProfileTranscriptPrefix(protocol.turns,block.transcriptLength)
 const bindings=new Map(),questionTurns=new Set()
 let last=-1
 for(const source of block.bindings){
  if(!plain(source)||!id.test(source.sourceTurnId||'')||bindings.has(source.sourceTurnId)||
    !Number.isInteger(source.turnIndex)||source.turnIndex<=last||source.turnIndex>=prefix.length||
    prefix[source.turnIndex].role!=='user'||!id.test(source.questionTurnId||'')||
    questionTurns.has(source.questionTurnId)||source.questionTurnId===source.sourceTurnId||
    !Number.isInteger(source.questionTurnIndex)||source.questionTurnIndex<=last||source.questionTurnIndex>=source.turnIndex||
    prefix[source.questionTurnIndex].role!=='assistant'||protocol.turns[source.questionTurnIndex].interrupted===true||!text(source.questionText)||
    prefix[source.questionTurnIndex].content!==source.questionText||typeof source.questionId!=='string'||
    !source.questionId.startsWith(block.sessionId+':'+block.track+':'))invalid()
  last=source.turnIndex;bindings.set(source.sourceTurnId,source);questionTurns.add(source.questionTurnId)
 }
 function verifySource(source){
  if(source===null)return
  if(!plain(source)||!timestamp(source.recordedAt))invalid()
  if(source.kind==='client_answer'){
   const binding=bindings.get(source.sourceTurnId)
   if(!binding||binding.questionId!==source.questionId||prefix[binding.turnIndex].content!==text(source.quote))invalid()
  }else if(!['client_reviewed_dialogue','owner_saved_profile'].includes(source.kind)||
    source.sourceTurnId!==undefined||source.questionId!==undefined||source.quote!==undefined)invalid()
 }
 const statuses=new Set(['confirmed','needs_confirmation','not_explored','skipped_by_client'])
 function field(value){
  if(!plain(value)||!statuses.has(value.status)||
    (value.status==='confirmed'?(!Number.isInteger(value.value)||value.value<0||value.value>10):value.value!==null)||
    (value.status==='not_explored'?value.source!==null:value.source===null))invalid()
  verifySource(value.source)
 }
 const expected=createCoachProfileSessionV3({sessionId:block.sessionId,courseSessionId:block.courseSessionId,locale:block.locale})
 const axes=Object.keys(expected.rows)
 block.snapshot.ratings.forEach((rating,index)=>{
  if(!plain(rating)||rating.axis!==axes[index])invalid()
  field(rating.current);field(rating.desired)
 })
 const priority=block.snapshot.priority
 if(!plain(priority)||!statuses.has(priority.status)||!Array.isArray(priority.axisIds)||
   priority.axisIds.length>(block.track==='inner'?1:2)||new Set(priority.axisIds).size!==priority.axisIds.length||
   priority.axisIds.some(axis=>!axes.includes(axis))||
   (priority.status==='confirmed'?priority.axisIds.length<1:priority.axisIds.length!==0))invalid()
 verifySource(priority.source)
 for(const correction of block.snapshot.corrections){
  if(!plain(correction)||!axes.includes(correction.axis)||!['current','desired'].includes(correction.slot))invalid()
  field(correction.previous);verifySource(correction.replacedBy)
 }
 return {block,prefix}
}

/** Only one versioned track is allowed in any reviewed protocol. The proof is
 * opaque to the client; validate the signed receipt again on every write.
 * Never use this browser-compatible shape check as an authorization decision.
 */
export const COACH_PROFILE_ARCHIVE_FIELDS=Object.freeze(['lifeBalanceCheckin','meaningAxesCheckin'])
export function coachProfileArchiveEnvelope(protocol){
 const fields=COACH_PROFILE_ARCHIVE_FIELDS.filter(key=>protocol?.[key]!==undefined)
 if(!fields.length)return null
 if(fields.length!==1||protocol.profileCheckin!==undefined)invalid()
 const key=fields[0],value=protocol[key]
 if(!plain(value)||Object.keys(value).length!==2||
    !Object.hasOwn(value,'block')||!Object.hasOwn(value,'receipt')||
    typeof value.receipt!=='string'||!/^[0-9a-f]{64}$/.test(value.receipt)||
    JSON.stringify(value).length>90000)invalid()
 const expected=key==='lifeBalanceCheckin'?'outer':'inner'
 if(value.block?.track!==expected)invalid()
 validateCoachProfileArchiveV3(value.block,protocol)
 return {key,value}
}
/** A previously acknowledged structured snapshot cannot silently disappear,
 * regress or be replaced by a different result at the same revision.
 * The server verifies the receipt independently before invoking this guard.
 */
export function coachProfileArchiveExtends(previous,next){
 const old=coachProfileArchiveEnvelope(previous),fresh=coachProfileArchiveEnvelope(next)
 if(!old)return true
 if(!fresh||old.key!==fresh.key)return false
 const a=old.value.block,b=fresh.value.block
 if(b.sessionId!==a.sessionId||b.courseSessionId!==a.courseSessionId||b.locale!==a.locale||
    b.snapshot.revision<a.snapshot.revision||b.transcriptLength<a.transcriptLength)return false
 if(a.snapshot.closed||b.snapshot.revision===a.snapshot.revision)return old.value.receipt===fresh.value.receipt
 return true
}
