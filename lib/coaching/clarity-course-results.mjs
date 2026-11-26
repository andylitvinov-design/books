import {clarityCourseDay,clarityHomeworkRows} from './clarity-course.mjs'
import {coachCourseProtocolRows} from './coach-course-protocol-schema.mjs'
// This receipt must come from the authenticated account's persisted course ledger.
export function claritySavedTimingReceipt(protocol,receipt){
 const day=clarityCourseDay(protocol?.courseSessionId)
 return Boolean(day&&typeof protocol.id==='string'&&receipt?.protocolId===protocol.id&&receipt.courseSessionId===protocol.courseSessionId&&receipt.day===day&&receipt.activeSeconds===1200&&receipt.complete===true&&receipt.reviewed===true)
}
export function clarityCourseResult(protocol,locale='en',receipt=null){
 const day=clarityCourseDay(protocol?.courseSessionId)
 if(!day||protocol.provenance!=='client_reviewed_dialogue'||typeof protocol.id!=='string'||!protocol.savedAt)return null
 const rows=coachCourseProtocolRows(protocol.courseSessionId,protocol.turns,protocol.courseFieldReview,locale)
 return {id:protocol.id,day,savedAt:protocol.savedAt,personaId:protocol.personaId,summary:protocol.clientSummary||'',nextStep:protocol.clientNextStep||'',
 rows:rows.filter(r=>r.status==='confirmed'||r.status==='skipped_by_client').map(r=>({id:r.id,label:r.label,status:r.status,quote:r.status==='confirmed'?r.quote:'',coachId:r.coachId??null,visitId:r.visitId??null})),
 homework:claritySavedTimingReceipt(protocol,receipt)?clarityHomeworkRows(protocol,rows):[]}
}
