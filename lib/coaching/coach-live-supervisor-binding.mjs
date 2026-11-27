// Adapter for the CURRENT first-party server-owned thematic draft only.
// The caller must read the authenticated, locked/decrypted draft, never a
// browser-supplied ledger. This is not native audio delivery or AI consent.
import {prepareSupervisorCandidate} from './coach-supervisor.mjs'
import {coachCourseProtocolSchema} from './coach-course-protocol-schema.mjs'
import {checkpointConfirmation} from './coach-course-question-binding.mjs'
const coachingIds=new Set(['clarity_discover','clarity_understand','clarity_support','clarity_direction','goal_result','goal_motivation','goal_plan','goal_resources','goal_obstacles','goal_possibilities','goal_acceleration','goal_integration','life_direction','inner_compass','main_vector','strengths_resources','obstacles_patterns','new_possibilities','actions_steps','integration','business_strategy','business_design','business_transformation','business_execution'])
export function liveSupervisorCandidate(draft,reviewId){
 const protocol=draft?.protocol,state=draft?.courseGate,gate=state?.gate,p=gate?.pending,echo=state?.prompt
 if(!protocol||protocol.provenance!=='client_autosaved_unreviewed_draft'||!coachingIds.has(draft.courseSessionId)||protocol.courseSessionId!==draft.courseSessionId||gate?.sessionId!==protocol.id||gate.courseSessionId!==draft.courseSessionId||state.paused===true||p?.phase!=='awaiting_echo'||echo?.kind!=='confirm'||echo.fieldId!==p.fieldId||echo.questionId!==p.questionId||!Number.isSafeInteger(draft.revision)||draft.revision<1||!Array.isArray(protocol.turns)||!Array.isArray(gate.history))return null
 const sourceId=p.candidate?.sourceId
 if(typeof sourceId!=='string'||!/^t:(0|[1-9]\d*)$/.test(sourceId))return null
 const index=Number(sourceId.slice(2)),qIndex=index-1,turns=protocol.turns
 if(index<1||echo.turnIndex!==index+1||echo.turnIndex!==turns.length-1)return null
 const q=turns[qIndex],a=turns[index],e=turns[echo.turnIndex]
 if(q?.role!=='assistant'||q.interrupted===true||a?.role!=='user'||a.unanswered===true||a.content!==p.candidate.quote||e?.role!=='assistant'||e.interrupted===true||e.content!==echo.text)return null
 const field=coachCourseProtocolSchema(draft.courseSessionId,protocol.locale)?.checkpoints.find(row=>row.id===p.fieldId)
 if(!field||e.content!==checkpointConfirmation(q.content,a.content,protocol.locale)||p.deliveryId!=='display:'+qIndex)return null
 const issue=gate.history.findLast(x=>x.type==='issue'&&x.fieldId===p.fieldId&&x.questionId===p.questionId)
 const delivery=gate.history.findLast(x=>x.type==='delivery'&&x.fieldId===p.fieldId&&x.questionId===p.questionId&&x.deliveryId===p.deliveryId)
 const answer=gate.history.at(-1)
 if(!issue||!delivery||delivery.final!==true||delivery.interrupted===true||answer?.type!=='answer'||answer.fieldId!==p.fieldId||answer.questionId!==p.questionId||answer.deliveryId!==p.deliveryId||answer.turnId!==sourceId||answer.final!==true||answer.text!==a.content)return null
 const input={reviewId,sessionId:protocol.id,questionId:p.questionId,candidateId:p.fieldId+':'+sourceId,turnId:sourceId,revision:draft.revision,locale:protocol.locale,mode:'coaching',fieldId:p.fieldId,question:q.content,quote:a.content,role:'user',final:true,context:[]}
 return prepareSupervisorCandidate(input)?input:null
}
// Only consume a validated advisory on the unchanged pending question. An
// unavailable/stale/other result never advances or blocks the existing gate.
export function liveSupervisorAdvisory(draft,review){
 const input=liveSupervisorCandidate(draft,review?.binding?.reviewId)
 if(!input||review?.status!=='reviewed'||review.authority!=='advisory_only'||['reviewId','sessionId','questionId','candidateId','revision','fieldId'].some(k=>review.binding[k]!==input[k]))return null
 const intent={MATCH:'confirm_literal',PARTIAL:'clarify_missing',MISMATCH:'return_to_field',AMBIGUOUS:'clarify_meaning',CONTRADICTION:'clarify_change'}[review.verdict]
 if(!intent||review.clarificationIntent!==intent||!Array.isArray(review.evidence)||!review.evidence.length||review.evidence.some(e=>e?.turnId!==input.turnId||typeof e.quote!=='string'||!e.quote.trim()||!input.quote.includes(e.quote)))return null
 if(review.verdict==='CONTRADICTION')return null // no earlier context shared
 return {fieldId:input.fieldId,questionId:input.questionId,revision:input.revision,intent,authority:'advisory_only'}
}
