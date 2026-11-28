// Private immutable client-result document, never a substitute for source or clock proof.
import {goalRunResultBinding,GOAL_RUN_TOPICS} from './goal-course-runs.mjs'
import {goalSessionScenario} from './goal-session-scenarios.mjs'
import {coachCourseProtocolRows} from './coach-course-protocol-schema.mjs'
export const GOAL_RESULT_DOCUMENT_VERSION='hh-goal-result-v1'
const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(v)
const hash=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v)
const iso=v=>typeof v==='string'&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString()===v
const invalid=()=>{throw Error('GOAL_RESULT_INVALID')}
const langs=['en','ru','es']
export function createGoalResultDocument(run,day,protocol,{id,sourceHash,createdAt}={}){
 const binding=goalRunResultBinding(run,day,protocol)
 const locale=langs.includes(protocol.locale)?protocol.locale:'en',scenario=goalSessionScenario(binding.courseSessionId)
 if(!scenario)invalid()
 const rows=coachCourseProtocolRows(binding.courseSessionId,protocol.turns,protocol.courseFieldReview,locale)
 const answers=rows.filter(r=>!r.archived).map(r=>{
  const verified=r.status==='confirmed'&&r.source==='client_reviewed_quote'&&typeof r.quote==='string'&&r.quote.trim()&&Number.isInteger(r.turnIndex)&&r.turnIndex>=0
  return {fieldId:r.id,label:r.label,status:verified?'confirmed':r.status==='skipped_by_client'?'skipped':'missing',answer:verified?r.quote:null,sourceTurnIndex:verified?r.turnIndex:null}
 })
 return validateGoalResultDocument({version:GOAL_RESULT_DOCUMENT_VERSION,id,revision:1,...binding,locale,title:scenario.resultTitle[locale],sourceHash,sourceSavedAt:protocol.savedAt,createdAt,answers})
}
export function validateGoalResultDocument(doc){
 if(!doc||doc.version!==GOAL_RESULT_DOCUMENT_VERSION||!uuid(doc.id)||!uuid(doc.courseRunId)||!uuid(doc.goalId)||!uuid(doc.protocolId)||doc.id===doc.protocolId||doc.id===doc.courseRunId||
  doc.revision!==1||!Number.isInteger(doc.day)||doc.day<1||doc.day>8||doc.courseSessionId!==GOAL_RUN_TOPICS[doc.day-1]||!langs.includes(doc.locale)||
  !hash(doc.sourceHash)||!iso(doc.sourceSavedAt)||!iso(doc.createdAt)||Date.parse(doc.createdAt)<Date.parse(doc.sourceSavedAt)||typeof doc.title!=='string'||!doc.title.trim()||
  !Array.isArray(doc.answers)||!doc.answers.length||doc.answers.length>100)invalid()
 const ids=new Set()
 for(const row of doc.answers){
  if(!row||typeof row.fieldId!=='string'||!row.fieldId||ids.has(row.fieldId)||typeof row.label!=='string'||!row.label.trim()||!['confirmed','missing','skipped'].includes(row.status))invalid()
  ids.add(row.fieldId)
  if(row.status==='confirmed'){
   if(typeof row.answer!=='string'||!row.answer.trim()||row.answer.length>1200||!Number.isInteger(row.sourceTurnIndex)||row.sourceTurnIndex<0)invalid()
  }else if(row.answer!==null||row.sourceTurnIndex!==null)invalid()
 }
 return doc
}
