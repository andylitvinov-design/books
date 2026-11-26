import {clarityCourseDay,clarityHomeworkRows} from './clarity-course.mjs'
import {coachCourseProtocolRows} from './coach-course-protocol-schema.mjs'
export function clarityCourseResult(protocol,locale='en',{clock=null}={}){
 const day=clarityCourseDay(protocol?.courseSessionId)
 if(!day||protocol.provenance!=='client_reviewed_dialogue'||typeof protocol.id!=='string'||!protocol.savedAt)return null
 const rows=coachCourseProtocolRows(protocol.courseSessionId,protocol.turns,protocol.courseFieldReview,locale)
 return {id:protocol.id,day,savedAt:protocol.savedAt,personaId:protocol.personaId,summary:protocol.clientSummary||'',nextStep:protocol.clientNextStep||'',
 rows:rows.filter(r=>r.status==='confirmed'||r.status==='skipped_by_client').map(r=>({id:r.id,label:r.label,status:r.status,quote:r.status==='confirmed'?r.quote:''})),
 homework:clarityHomeworkRows(protocol,rows,clock)}
}
