import 'server-only'
import {AppError} from '../assessments/contracts.js'
import {openSealed,operationHash} from './crypto.js'
import {coachCourseProtocolRows} from '../coaching/coach-course-protocol-schema.mjs'
import {coachProtocolEvidenceVeto} from '../coaching/coach-protocol-relevance.mjs'
import {projectOwnerReviewedEvidence} from '../coaching/coach-personal-memory.mjs'

// Owner-only source projection. A fingerprint binds exact reviewed evidence;
// it is not a consent token or authorization to disclose it.
export function ownerMemoryFingerprint(config,accountId,item){
 return operationHash({purpose:'owner-reviewed-memory-source-v1',accountId,
   source:item.source,value:item.value,sessionEndedAt:item.sessionEndedAt,
   observedAt:item.observedAt??null},config)
}
export function projectOwnerMemoryArchiveRow(config,actor,row){
 if(row?.account_id!==actor.id)throw new AppError('MY_COACH_MEMORY_UNAVAILABLE',503)
 if(row.schema_version!==1||!row.protocol_ciphertext)throw Error('unsupported')
 const id=String(row.protocol_id).toLowerCase()
 const protocol=openSealed(row.protocol_ciphertext,{accountId:actor.id,recordId:id,field:'my_coach.protocol'},config)
 if(protocol?.id?.toLowerCase()!==id||protocol?.provenance!=='client_reviewed_dialogue')throw Error('invalid')
 if(!protocol.courseFieldReview)return {supported:false,items:[]}
 const verified=coachCourseProtocolRows(protocol.courseSessionId,protocol.turns,protocol.courseFieldReview,
  ['ru','en','es'].includes(protocol.locale)?protocol.locale:'en')
 if(!verified.length)return {supported:false,items:[]}
 return projectOwnerReviewedEvidence({accountId:actor.id,protocol,
  reviewRows:verified.filter(row=>!coachProtocolEvidenceVeto(row.quote||'',{historicalReview:true}))},actor.id)
}
