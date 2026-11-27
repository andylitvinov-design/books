import {clarityCourseDay} from './clarity-course.mjs'
import {coachCourseProtocolRows,coachReviewScenarioVersion} from './coach-course-protocol-schema.mjs'
import {clarityScenarioVersion} from './clarity-course-scenarios.mjs'
// The full dialogue is read only after a separate explicit open action.
// A reviewed archive is not an authoritative course completion or medical record.
export function clarityProtocolView(protocol,day){
 if(!protocol||protocol.provenance!=='client_reviewed_dialogue'||clarityCourseDay(protocol.courseSessionId)!==day||
  !Array.isArray(protocol.turns)||typeof protocol.id!=='string')return null
 return {id:protocol.id,day,personaId:protocol.personaId,savedAt:protocol.savedAt,
  turns:protocol.turns.map(t=>({role:t.role,content:t.content,
   ...(t.role==='assistant'?{personaId:t.authorPersonaId||protocol.personaId}:{}),
   ...(t.interrupted===true?{interrupted:true}:{}),...(t.unanswered===true?{unanswered:true}:{})}))}
}

// Saved draft and final review are separate states. A server-owned gate may
// already contain durable confirmed answers even before the final review.
// Do not copy a draft's client-supplied review or generated summary.
export function claritySessionProtocol(record,day,locale='en',{draftReview=null,scenarioVersion=null,updatedAt=null}={}){
 if(!record||clarityCourseDay(record.courseSessionId)!==day||typeof record.id!=='string'||!Array.isArray(record.turns))return null
 const reviewed=record.provenance==='client_reviewed_dialogue'
 if(!reviewed&&record.provenance!=='client_autosaved_unreviewed_draft')return null
 const review=reviewed?record.courseFieldReview:draftReview
 const version=reviewed?coachReviewScenarioVersion(review):scenarioVersion
 if(version&&version!==clarityScenarioVersion(record.courseSessionId))return null
 if(!reviewed&&coachReviewScenarioVersion(review)!==version)return null
 const rows=coachCourseProtocolRows(record.courseSessionId,record.turns,review,locale,{scenarioVersion:version})
 return {id:record.id,day,reviewed,updatedAt:reviewed?record.savedAt:updatedAt,
  rows:rows.map(row=>{
   const confirmed=row.status==='confirmed'
   const candidate=row.status==='needs_confirmation'&&row.source==='visible_prompt_candidate'
   return {id:row.id,label:row.label,question:row.question,status:row.status,
    quote:confirmed||candidate?row.quote:'',source:confirmed||candidate?row.source:null,
    ...(row.archived?{archived:true}:{}),...(row.progressStage?{progressStage:row.progressStage}:{}),...(row.scenarioVersion?{scenarioVersion:row.scenarioVersion}:{}),...(row.methodDecision?{methodDecision:row.methodDecision}:{}),
    ...(row.reviewDecision?{reviewDecision:row.reviewDecision}:{}),
    ...(confirmed&&row.coachId?{coachId:row.coachId,visitId:row.visitId}:{}),
    ...((confirmed||candidate)&&Number.isInteger(row.turnIndex)?{turnIndex:row.turnIndex}:{})}
  })}
}
export function clarityDraftLog(record,day,updatedAt){
 if(record?.provenance!=='client_autosaved_unreviewed_draft')return null
 // Keep the existing literal log projection, but label it explicitly as a draft.
 const log=clarityProtocolView({...record,provenance:'client_reviewed_dialogue',savedAt:updatedAt},day)
 return log?{...log,reviewed:false}:null
}
