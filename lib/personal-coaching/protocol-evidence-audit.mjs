// Private, deterministic evidence audit. Not a semantic AI reviewer or clinical assessment.
// Never changes the source protocol, grants progress, sends data or assumes server ACK.
import {coachCourseProtocolRows,coachCourseProtocolSchema} from '../coaching/coach-course-protocol-schema.mjs'
import {checkpointLiveAnswerMismatch} from '../coaching/coach-course-question-binding.mjs'

export function coachProtocolEvidenceAudit(protocol){
 const base={schema:'hh-coach-session-quality-report-v1',kind:'deterministic_evidence_audit',
  semanticReview:'not_performed',empathyReview:'not_performed',personalityReview:'not_performed',
  safetyReview:'not_performed',serverReceiptReview:'not_performed',overallScore:null}
 if(!Array.isArray(protocol?.turns))return {...base,status:'unavailable',reason:'transcript_unavailable',fields:[],counts:null}
 const schema=coachCourseProtocolSchema(protocol.courseSessionId,protocol.locale)
 if(!schema)return {...base,status:'unavailable',reason:'course_schema_unavailable',fields:[],counts:null}
 let rows
 try{rows=coachCourseProtocolRows(protocol.courseSessionId,protocol.turns,protocol.courseFieldReview,protocol.locale)}
 catch{return {...base,status:'unavailable',reason:'invalid_review_evidence',fields:[],counts:null}}
 const fields=rows.map(row=>{
  let status='not_explored'
  const flags=[]
  if(row.status==='skipped_by_client')status='skipped_by_client'
  else if(row.status==='needs_confirmation')status='needs_confirmation'
  else if(row.status==='confirmed'){
   const source=protocol.turns[row.turnIndex]
   if(source?.role!=='user'||source.content.trim()!==row.quote){
    status='needs_confirmation';flags.push('source_mismatch')
   }else if(checkpointLiveAnswerMismatch(row.id,row.quote)){
    status='needs_confirmation';flags.push('possible_cross_field_answer')
   }else if(row.questionTurnIndex!=null&&row.confirmationTurnIndex!=null){
    status='question_bound_reviewed'
   }else{
    status='client_reviewed';flags.push('question_binding_unavailable')
   }
  }
  return {fieldId:row.id,status,sourceTurnIndex:Number.isInteger(row.turnIndex)?row.turnIndex:null,
   questionTurnIndex:Number.isInteger(row.questionTurnIndex)?row.questionTurnIndex:null,
   confirmationTurnIndex:Number.isInteger(row.confirmationTurnIndex)?row.confirmationTurnIndex:null,flags}
 })
 const counts={total:fields.length,questionBound:0,clientReviewed:0,needsConfirmation:0,skipped:0,notExplored:0}
 for(const field of fields){
  const key={question_bound_reviewed:'questionBound',client_reviewed:'clientReviewed',needs_confirmation:'needsConfirmation',skipped_by_client:'skipped',not_explored:'notExplored'}[field.status]
  counts[key]++
 }
 return {...base,status:'audited',fields,counts,
  evidenceCoverage:counts.total?counts.questionBound/counts.total:null}
}
