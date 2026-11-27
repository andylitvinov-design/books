// Private domain contract. Events and settled payment receipts originate in
// authenticated server adapters, never in browser JSON or a provider token mint.
import {createClarityCourseClock,advanceClarityCourseClock,validateClarityCourseClock,clarityClockSummary,clarityClockResumeTime} from './clarity-course-clock.mjs'
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
export const isClarityRunId=v=>typeof v==='string'&&UUID.test(v)
const fail=(code='CLARITY_RUN_INVALID')=>{throw Error(code)}
const ms=v=>Number.isSafeInteger(v)&&v>=0&&v<=8640000000000000
export function createClarityRun({id,ordinal,access,protocolIds,createdAt,clock}){
 const run={version:1,id,ordinal,access,createdAt,protocolIds,clock:clock??createClarityCourseClock({dailyPolicy:access})}
 return validateClarityRun(run)
}
export function validateClarityRun(run){
 if(!run||run.version!==1||!isClarityRunId(run.id)||!Number.isSafeInteger(run.ordinal)||run.ordinal<1||
  !['free','paid'].includes(run.access)||(run.ordinal===1)!==(run.access==='free')||!ms(run.createdAt)||
  !Array.isArray(run.protocolIds)||run.protocolIds.length!==3||run.protocolIds.some(id=>!isClarityRunId(id)||id===run.id)||new Set(run.protocolIds).size!==3)fail()
 validateClarityCourseClock(run.clock)
 if((run.clock.dailyPolicy==='paid')!==(run.access==='paid'))fail()
 for(const d of run.clock.days){
  if(d.protocolId!==null&&d.protocolId!==run.protocolIds[d.day-1])fail()
  if(d.segments.some(s=>s.startedAt<run.createdAt))fail()
 }
 return run
}
export function advanceClarityRun(run,event){
 validateClarityRun(run)
 if(!event||event.courseRunId!==run.id||![1,2,3].includes(event.day)||event.protocolId!==run.protocolIds[event.day-1]||event.atMs<run.createdAt)fail('CLARITY_RUN_CONFLICT')
 return validateClarityRun({...run,clock:advanceClarityCourseClock(run.clock,event)})
}
export function beginFreeClarityRun(input,event){
 // Free enrollment and first consent/connection event must commit together.
 // A greeting, workbook click, token mint or unauthorized begin creates no run.
 if(input.access!=='free'||input.ordinal!==1||event?.type!=='begin'||event.day!==1)fail()
 return advanceClarityRun(createClarityRun(input),event)
}
export function clarityRunSummary(run){
 validateClarityRun(run)
 const summary=clarityClockSummary(run.clock)
 return {id:run.id,ordinal:run.ordinal,access:run.access,createdAt:new Date(run.createdAt).toISOString(),
  status:summary.complete?'completed':summary.totalElapsedMs===0&&summary.days.every(d=>d.status==='not_started')?'ready':'in_progress',
  revision:summary.revision,currentDay:summary.currentDay,totalElapsedMs:summary.totalElapsedMs,
  days:summary.days.map(d=>({...d,protocolId:run.protocolIds[d.day-1]}))}
}
export function clarityRunScopeTag(id){
 if(!isClarityRunId(id))fail()
 return 'cr:'+id // 39 chars; existing journal contract allows 40.
}
export function clarityRunNotes(entries,id=null){
 const tag=id===null?null:clarityRunScopeTag(id)
 return (Array.isArray(entries)?entries:[]).filter(entry=>{
  if(!Array.isArray(entry?.tags))return false
  const scopes=entry.tags.filter(t=>typeof t==='string'&&t.startsWith('cr:'))
  return tag===null?scopes.length===0:scopes.length===1&&scopes[0]===tag
 })
}
export function clarityRunProtocolId(run,day){
 validateClarityRun(run)
 if(![1,2,3].includes(day))fail()
 return run.protocolIds[day-1]
}

// Immutable run/day association is authoritative, even before its first
// connected begin. A bound day with no clock evidence never falls back to
// another course's elapsed time.
export function clarityRunResumeMetadata(run,day,protocolId){
 if(clarityRunProtocolId(run,day)!==protocolId)fail('CLARITY_RUN_CONFLICT')
 return {courseRunId:run.id,courseOrdinal:run.ordinal,day,clarityTime:clarityClockResumeTime(run.clock,day,protocolId)}
}
export function clarityRunTranscript(protocol,day,run,updatedAt){
 const id=clarityRunProtocolId(run,day)
 if(!protocol||protocol.id!==id||protocol.courseSessionId!=='clarity_day_'+day||
  !['client_reviewed_dialogue','client_autosaved_unreviewed_draft'].includes(protocol.provenance)||!Array.isArray(protocol.turns))return null
 return {courseRunId:run.id,id,day,reviewed:protocol.provenance==='client_reviewed_dialogue',updatedAt,
  turns:protocol.turns.map(t=>({role:t.role,content:t.content,...(t.role==='assistant'?{personaId:t.authorPersonaId||protocol.personaId}:{}),
   ...(t.visitId?{visitId:t.visitId}:{}),...(t.interrupted?{interrupted:true}:{}),...(t.unanswered?{unanswered:true}:{})}))}
}
