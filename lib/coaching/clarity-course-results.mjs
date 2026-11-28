import {clarityCourseDay,clarityHomeworkRows,clarityHomeworkNotes,validClarityHomeworkAnswer} from './clarity-course.mjs'
import {coachCourseProtocolRows,coachReviewScenarioVersion} from './coach-course-protocol-schema.mjs'
import {clarityMethodOutcome} from './clarity-session-fields.mjs'
import {clarityScenarioEvidenceAllowed} from './clarity-course-scenarios.mjs'
export function clarityCourseResult(protocol,locale='en',{clock=null}={}){
 const day=clarityCourseDay(protocol?.courseSessionId)
 if(!day||protocol.provenance!=='client_reviewed_dialogue'||typeof protocol.id!=='string'||!protocol.savedAt)return null
 const rows=coachCourseProtocolRows(protocol.courseSessionId,protocol.turns,protocol.courseFieldReview,locale,{scenarioVersion:coachReviewScenarioVersion(protocol.courseFieldReview)||protocol.courseScenarioVersion||null})
 return {id:protocol.id,day,savedAt:protocol.savedAt,personaId:protocol.personaId,summary:protocol.clientSummary||'',nextStep:protocol.clientNextStep||'',
 rows:rows.map(r=>({id:r.id,label:r.label,question:r.question,status:r.status,quote:r.status==='confirmed'?r.quote:'',source:r.status==='confirmed'?r.source:null,...(r.archived?{archived:true}:{}),...(r.progressStage?{progressStage:r.progressStage}:{}),...(r.scenarioVersion?{scenarioVersion:r.scenarioVersion,kind:r.kind,priority:r.priority,homeworkEligible:r.homeworkEligible,...(r.requiresConsent?{requiresConsent:r.requiresConsent}:{})}:{}),...(r.methodDecision?{methodDecision:r.methodDecision}:{}),...(r.reviewDecision?{reviewDecision:r.reviewDecision}:{}),...(r.reviewOrigin?{reviewOrigin:r.reviewOrigin}:{}),...(r.coachId?{coachId:r.coachId,visitId:r.visitId}:{}),...(r.requiresSeparateReview?{requiresSeparateReview:true}:{}),...((coachReviewScenarioVersion(protocol.courseFieldReview)||protocol.courseScenarioVersion)&&r.id.startsWith('outer_')?{ratingMode:'current'}:{})})),
 homework:clarityHomeworkRows(protocol,rows,clock)}
}

// Both report and homework derive from the same owner-scoped saved records.
// Independent journal answers are self-reports, not coach confirmations.
// Wait for complete journal pagination before resolving duplicate notes.
export function clarityResultProjection(report,entries,{journalComplete=false}={}){
 const assignments=new Map((report.homework||[]).map(row=>[row.id,row]))
 const rows=(report.rows||[]).map(row=>{
  if(!assignments.has(row.id)||!['not_explored','needs_confirmation'].includes(row.status))return {...row,homeworkState:null}
  if(!journalComplete)return {...row,homeworkState:'unchecked'}
  const notes=clarityHomeworkNotes(entries,report.id,row.id)
  if(notes.length===1)return validClarityHomeworkAnswer(row.id,notes[0].text,{ratingMode:assignments.get(row.id)?.ratingMode})?{...row,status:'self_reported',source:'daybook',quote:notes[0].text,homeworkState:'done'}:{...row,homeworkState:'invalid'}
  return {...row,homeworkState:notes.length>1?'conflict':'pending'}
 })
 const active=rows.filter(row=>!row.archived&&!row.requiresSeparateReview&&(!row.requiresConsent||rows.some(r=>r.id===row.requiresConsent&&r.methodDecision==='accepted'))&&
  (!row.scenarioVersion||clarityScenarioEvidenceAllowed('clarity_day_'+report.day,row.id,id=>rows.find(r=>r.id===id&&r.scenarioVersion===row.scenarioVersion))))
 const assigned=active.filter(row=>row.homeworkState!==null)
 const answered=active.filter(row=>['confirmed','self_reported'].includes(row.status)).length
 const skipped=active.filter(row=>row.status==='skipped_by_client').length
 return {rows,active,assigned,answered,skipped,total:active.length,homeworkTotal:assigned.length,
  methodOutcome:clarityMethodOutcome(report.day,rows),
  homeworkDone:assigned.filter(row=>row.homeworkState==='done').length,
  homeworkRemaining:assigned.filter(row=>row.homeworkState!=='done').length,
  complete:active.length>0&&answered===active.length}
}
