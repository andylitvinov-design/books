import {normalizeMyCoachProtocol} from './session-protocol.mjs'
import {normalizeCoachCourseSessionId} from '../coaching/coach-course-journey.mjs'
import {isMyCoachProtocolId} from './protocol-archive.mjs'
export const MY_COACH_DRAFT_PROVENANCE='client_unreviewed_draft'
const invalid=()=>{throw Error('MY_COACH_DRAFT_INVALID')}
const plain=v=>v&&typeof v==='object'&&!Array.isArray(v)
export function draftRevision(value){
 if(!Number.isSafeInteger(value)||value<0||value>2147483646)invalid()
 return value
}
// Archive validation provides the bounded, chronological and evidence-checked
// text schema. A checkpoint is never a reviewed report or a provider grant.
export function normalizeMyCoachDraft(input){
 if(!plain(input)||!plain(input.protocol)||!['active','ended'].includes(input.status))invalid()
 const {completedAt,provenance,...protocol}=normalizeMyCoachProtocol(input.protocol)
 if(!protocol.turns.some(row=>row.role==='user'))invalid()
 return {version:1,...protocol,checkpointAt:completedAt,
  courseSessionId:normalizeCoachCourseSessionId(input.courseSessionId),
  status:input.status,provenance:MY_COACH_DRAFT_PROVENANCE}
}
export function sameDraft(a,b){
 return Boolean(a&&b&&JSON.stringify(a)===JSON.stringify(b))
}
export function draftWriteDecision(existing,expected,payload){
 draftRevision(expected)
 if(!existing)return expected===0?'insert':'conflict'
 if(existing.deleted===true)return 'conflict'
 if(existing.revision===expected+1&&sameDraft(existing.payload,payload))return 'retry'
 if(existing.revision!==expected)return 'conflict'
 if(existing.payload?.id!==payload.id||existing.payload?.personaId!==payload.personaId||
    existing.payload?.startedAt!==payload.startedAt)return 'conflict'
 return sameDraft(existing.payload,payload)?'retry':'update'
}
export function validDraftId(id){return isMyCoachProtocolId(id)}
