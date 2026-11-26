import {clarityCourseDay} from './clarity-course.mjs'
// The full dialogue is read only after a separate explicit open action.
// A reviewed archive is not an authoritative course completion or medical record.
export function clarityProtocolView(protocol,day){
 if(!protocol||protocol.provenance!=='client_reviewed_dialogue'||clarityCourseDay(protocol.courseSessionId)!==day||
  !Array.isArray(protocol.turns)||typeof protocol.id!=='string')return null
 return {id:protocol.id,day,personaId:protocol.personaId,savedAt:protocol.savedAt,
  turns:protocol.turns.map(t=>({role:t.role,content:t.content,
   ...(t.role==='assistant'?{personaId:t.coachId||protocol.personaId}:{}),
   ...(t.interrupted===true?{interrupted:true}:{}),...(t.unanswered===true?{unanswered:true}:{})}))}
}
