import {validateCoachingReportV2} from './report-v2.js'

// Caller must supply a freshly rebuilt server-owned draft and server time.
// This produces a reviewed value; it does not itself authorize or persist it.
export function reviewCoachingReportDraft(draft,choices,confirmedAt){
  const invalid=()=>{throw new Error('COACHING_REPORT_REVIEW_INVALID')}
  if(!validateCoachingReportV2(draft).valid||draft.status!=='draft'||draft.review?.status!=='awaiting_client'||
    !Array.isArray(choices)||choices.length!==draft.actionCandidates.length||
    typeof confirmedAt!=='string'||!Number.isFinite(Date.parse(confirmedAt))||new Date(confirmedAt).toISOString()!==confirmedAt)invalid()
  const byId=new Map()
  for(const choice of choices){
    if(!choice||typeof choice!=='object'||Array.isArray(choice)||Object.keys(choice).length!==2||
      typeof choice.candidateId!=='string'||!['accepted','deferred','declined'].includes(choice.status)||byId.has(choice.candidateId))invalid()
    byId.set(choice.candidateId,choice.status)
  }
  const reviewed=structuredClone(draft)
  reviewed.actionCandidates=reviewed.actionCandidates.map(candidate=>{
    const status=byId.get(candidate.candidateId)
    if(!status||candidate.origin!=='client_selected')invalid()
    if(status==='accepted'){
      const evidenceId='review:accept:'+candidate.candidateId
      if(reviewed.evidence.some(item=>item.evidenceId===evidenceId))invalid()
      reviewed.evidence.push({evidenceId,kind:'client_action_acceptance',questionId:null,role:'action_acceptance',value:candidate.text,source:'client_report_review',capturedAt:confirmedAt})
      return {...candidate,status,acceptedAt:confirmedAt,sourceEvidenceIds:[...candidate.sourceEvidenceIds,evidenceId]}
    }
    return {...candidate,status,acceptedAt:null}
  })
  reviewed.status='reviewed'
  reviewed.review={status:'confirmed',confirmedAt,actionDecisions:choices.map(choice=>({...choice}))}
  if(!validateCoachingReportV2(reviewed).valid)invalid()
  return reviewed
}
