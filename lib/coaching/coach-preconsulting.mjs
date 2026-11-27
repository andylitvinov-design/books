/** Preconsulting is a read-only advisory derived from the latest reviewed record.
 * Absence of verified evidence is not absence of a fact; never advance a stage.
 * Only fixed schema identifiers leave this module, not raw transcript excerpts.
 */
import {coachCourseProtocolRows} from './coach-course-protocol-schema.mjs'

export const COACH_PRECONSULTING_GUIDANCE = 'PRECONSULTING: use only authorized reference data. Identify known client-stated facts, what may have changed, explicitly skipped subjects, unverified or missing relevant details and previously agreed steps whose outcome is unknown. After the client chooses continuation and consents to start, use the existing authorized stage to ask ONE useful missing-detail question, not a new intake. Never repeat a known answer unless it needs a brief current confirmation; latest client correction wins. Do not assume an old task is unfinished, infer a diagnosis, or close a stage from old memory. Treat historical checkpoint IDs as advisory, only for the same relevant topic; skipped fields are optional and must not be pressed. Example: if a client already described a concern and its intensity, ask only a relevant missing detail such as onset, frequency or circumstances, not the description or intensity again. Do not turn coaching into medical diagnosis. If no reliable data is available, ask naturally and never claim memory was loaded.'

export function projectCoachPreconsultation(record){
  if(record?.provenance!=='client_reviewed_dialogue')return null
  const known=[],needsReview=[],notRecorded=[],skipped=[]
  // The archive already validates reviews against the client's original turns.
  // Revalidate defensively; legacy or invalid records remain unknown.
  if(record.courseFieldReview){
    try{
      for(const row of coachCourseProtocolRows(record.courseSessionId,record.turns,record.courseFieldReview,'en')){
        if(row.status==='confirmed')known.push(row.id)
        else if(row.status==='skipped_by_client')skipped.push(row.id)
        else if(row.status==='needs_confirmation')needsReview.push(row.id)
        else if(row.status==='not_explored')notRecorded.push(row.id)
      }
    }catch{/* No historical coverage claim for malformed or unavailable review. */}
  }
  const checkStep=typeof record.clientNextStep==='string'&&Boolean(record.clientNextStep.trim())
  if(!known.length&&!needsReview.length&&!notRecorded.length&&!skipped.length&&!checkStep)return null
  return {version:1,course:typeof record.courseSessionId==='string'&&/^[a-z0-9_]{1,60}$/.test(record.courseSessionId)?record.courseSessionId:null,
    known,needsReview,notRecorded,skipped,checkStep}
}

export function formatCoachPreconsultation(value){
  if(value?.version!==1)return ''
  const parts=[]
  if(value.checkStep)parts.push('Check agreed step outcome')
  if(value.course)parts.push('Past course: '+value.course)
  for(const [key,label] of [['needsReview','Review'],['notRecorded','Not verified'],['known','Known'],['skipped','Skipped']]){
    const ids=Array.isArray(value[key])?value[key].filter(id=>typeof id==='string'&&/^[a-z0-9_]{1,40}$/.test(id)).slice(0,3):[]
    if(!ids.length)continue
    const entry=label+': '+ids.join(',')
    if([...parts,entry].join('; ').length<=200)parts.push(entry)
  }
  return parts.join('; ')
}
