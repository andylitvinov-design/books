// Archive-only semantic review. The server selects a literal reviewed answer;
// no browser-supplied quote, mode, question or score is accepted.
import {coachCourseProtocolRows,coachCourseProtocolSchema} from '../coaching/coach-course-protocol-schema.mjs'
import {prepareSupervisorCandidate,SUPERVISOR_VERSION} from '../coaching/coach-supervisor.mjs'
import {coachProtocolEvidenceAudit} from './protocol-evidence-audit.mjs'
const coachingIds=new Set(['clarity_discover','clarity_understand','clarity_support','clarity_direction','goal_result','goal_motivation','goal_plan','goal_resources','goal_obstacles','goal_possibilities','goal_acceleration','goal_integration','life_direction','inner_compass','main_vector','strengths_resources','obstacles_patterns','new_possibilities','actions_steps','integration','business_strategy','business_design','business_transformation','business_execution'])
export const ARCHIVE_REVIEW_SCOPE='coach_archive_field_semantic_review_v1'
export const ARCHIVE_QUALITY_VERSION='hh-coach-archive-quality-v1'
const verdicts=new Set(['MATCH','PARTIAL','MISMATCH','AMBIGUOUS','CONTRADICTION'])
// Archived question binding is not proof of server delivery. The independent
// assessment is advisory; it never changes the client's reviewed protocol.
export function archivedSupervisorCandidate(protocol,fieldId,reviewId){
 if(protocol?.provenance!=='client_reviewed_dialogue'||!coachingIds.has(protocol.courseSessionId)||!Array.isArray(protocol.turns))return null
 let row
 try{row=coachCourseProtocolRows(protocol.courseSessionId,protocol.turns,protocol.courseFieldReview,protocol.locale).find(r=>r.id===fieldId)}catch{return null}
 if(row?.status!=='confirmed'||row.source!=='client_reviewed_quote'||!Number.isInteger(row.revision)||row.revision<1||!Number.isInteger(row.turnIndex)||!Number.isInteger(row.questionTurnIndex)||!Number.isInteger(row.confirmationTurnIndex)||row.questionTurnIndex!==row.turnIndex-1||row.confirmationTurnIndex!==row.turnIndex+2)return null
 const q=protocol.turns[row.questionTurnIndex],a=protocol.turns[row.turnIndex],c=protocol.turns[row.confirmationTurnIndex]
 if(q?.role!=='assistant'||q.interrupted===true||a?.role!=='user'||a.unanswered===true||a.content?.trim()!==row.quote||c?.role!=='user')return null
 const input={reviewId,sessionId:protocol.id,questionId:'q:'+row.questionTurnIndex,candidateId:fieldId+':'+row.revision,turnId:'t:'+row.turnIndex,revision:row.revision,locale:protocol.locale,mode:'coaching',fieldId,question:q.content,quote:row.quote,role:'user',final:true,context:[]}
 if(!prepareSupervisorCandidate(input))return null
 return {input,source:{protocolId:protocol.id,courseSessionId:protocol.courseSessionId,locale:protocol.locale,fieldId,revision:row.revision,question:q.content,quote:row.quote,confirmation:c.content,questionTurnIndex:row.questionTurnIndex,turnIndex:row.turnIndex,confirmationTurnIndex:row.confirmationTurnIndex}}
}
// The archive report is independent of Session Results and course progress.
// It includes statuses only, not copied quotes, diagnosis or inferred grades.
export function archiveQualityProjection(protocol,reviews=[],enabled=false){
 const audit=coachProtocolEvidenceAudit(protocol)
 const schema=coachCourseProtocolSchema(protocol.courseSessionId,protocol.locale)
 const fields=audit.fields.map(f=>{
  const eligible=Boolean(archivedSupervisorCandidate(protocol,f.fieldId,'preview'))
  const row=reviews.find(r=>r.fieldId===f.fieldId)
  const semanticStatus=row?.state==='reviewed'&&verdicts.has(row.verdict)?row.verdict:row?.state==='revoked'?'revoked':row?.state==='reserved'?'pending':row?.state==='unavailable'?'unavailable':'not_performed'
  return {fieldId:f.fieldId,label:schema?.checkpoints.find(r=>r.id===f.fieldId)?.label||f.fieldId,evidenceStatus:f.status,semanticStatus,eligible,sourceTurnIndex:f.sourceTurnIndex,questionTurnIndex:f.questionTurnIndex,confirmationTurnIndex:f.confirmationTurnIndex,flags:f.flags}
 })
 return {version:ARCHIVE_QUALITY_VERSION,protocolId:protocol.id,source:'saved_client_reviewed_dialogue',reviewEnabled:enabled===true,fields,evidenceCounts:audit.counts,evidenceCoverage:audit.evidenceCoverage??null,semanticReviewed:fields.filter(f=>verdicts.has(f.semanticStatus)).length,semanticEligible:fields.filter(f=>f.eligible).length,qualityScore:null,rubricStatus:'not_assessed',serverReceiptReview:'not_performed',empathyReview:'not_performed',personalityReview:'not_performed',safetyReview:'not_performed',privacyReview:'not_performed'}
}
export function archiveReviewStoredVerdict(candidate,review){
 if(!candidate||review?.version!==SUPERVISOR_VERSION||review.status!=='reviewed'||review.authority!=='advisory_only'||!verdicts.has(review.verdict))return null
 const b=review.binding,p=candidate.input
 if(!b||['reviewId','sessionId','questionId','candidateId','fieldId','revision'].some(k=>b[k]!==p[k]))return null
 if(!Array.isArray(review.evidence)||!review.evidence.length||review.evidence.some(e=>e?.turnId!==p.turnId||typeof e.quote!=='string'||!e.quote.trim()||!p.quote.includes(e.quote)))return null
 // The first archive slice does not transmit earlier context, so a model
 // cannot establish a contradiction with a different prior source.
 if(review.verdict==='CONTRADICTION')return null
 return {version:SUPERVISOR_VERSION,verdict:review.verdict,informationType:review.informationType,reasonCode:review.reasonCode,sourceTurnIndex:candidate.source.turnIndex}
}
