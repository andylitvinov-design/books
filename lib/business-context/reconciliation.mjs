import {createHash} from 'node:crypto'

const bounded=value=>typeof value==='string'
  ?value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/gu,' ').trim().slice(0,320):''
const key=value=>bounded(value).toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim()
const fingerprint=value=>createHash('sha256').update(value).digest('hex')

/** Deterministic project routing. Ambiguity is always held for review. */
export function classifyBusinessRecord(record={},tenantAllowlist={}){
 const participants=new Set((Array.isArray(record.participants)?record.participants:[])
  .filter(value=>typeof value==='string').map(value=>value.toLocaleLowerCase()))
 const matches=(Array.isArray(tenantAllowlist.projects)?tenantAllowlist.projects:[]).filter(project=>{
  const allowed=Array.isArray(project.participantEmails)?project.participantEmails:[]
  return allowed.some(email=>participants.has(String(email).toLocaleLowerCase()))
 })
 const projectId=matches.length===1&&typeof matches[0].id==='string'?matches[0].id:null
 return {domain:'business',projectId,confidenceEvidence:projectId?'explicit_participant_mapping':'unresolved_project',
  reviewRequired:!projectId}
}

function evidenceSentence(text,matcher){
 return bounded(text).split(/(?<=[.!?])\s+/u).find(line=>matcher.test(line))||''
}

/**
 * Extract only reviewable candidates. Input is data, never an instruction:
 * matching narrows each evidence span so unrelated imperative text is dropped.
 */
export function extractBusinessInsights(record={},classification={}){
 const text=bounded(record.text||record.summary||'')
 const sourceId=bounded(record.id||record.sourceId)
 if(!text||!sourceId)return []
 const rawActionEvidence=evidenceSentence(text,/\b(?:will|to)\s+[a-z][^.!?]{2,}/iu)
 // Keep only the commitment clause, rather than any preceding transcript
 // instruction in the same sentence.
 const actionEvidence=rawActionEvidence.match(/\b([A-Z][\p{L}\s'-]{0,70}\bwill\b[^.!?]*)/u)?.[1]||rawActionEvidence
 const completionEvidence=evidenceSentence(text,/\b(?:completed|finished|done)\s+(?:the\s+)?[^.!?]{2,}/iu)
 const decisionEvidence=evidenceSentence(text,/\b(?:decided|agreed|we will use|we chose)\b/iu)
 const rows=[]
 const append=(kind,evidence)=>{
  if(!evidence)return
  const normalized=key(evidence)
  rows.push({kind,sourceId,sourceSegmentOrTimestamp:record.timestamp||null,
    exactQuoteOrBoundedEvidence:evidence,actorId:null,assigneeId:null,deadlineISO:null,
    projectId:classification.projectId||null,status:'candidate',
    reviewReasons:[...(classification.reviewRequired?['PROJECT_UNRESOLVED']:[]),
      ...(kind==='action'?['ASSIGNEE_UNRESOLVED']:[])],
    fingerprint:fingerprint([sourceId,kind,normalized].join('|'))})
 }
 append('completion_report',completionEvidence)
 append('action',actionEvidence)
 append('decision',decisionEvidence)
 return rows
}

function issueMatch(insight,issues){
 const evidence=key(insight.exactQuoteOrBoundedEvidence)
 const words=evidence.split(' ').filter(word=>word.length>3)
 return (Array.isArray(issues)?issues:[]).find(issue=>{
  const title=key(issue?.title)
  return title&&words.length>1&&words.filter(word=>title.includes(word)).length>=Math.min(2,words.length)
 })||null
}

/** Produces a proposal only; applying a Linear mutation is a separate reviewed operation. */
export function reconcileBusinessInsight(insight={},openIssues=[],tenantAllowlist={}){
 if(!insight.projectId)return {operation:'no_action',reason:'PROJECT_UNRESOLVED',reviewRequired:true}
 const project=(tenantAllowlist.projects||[]).find(item=>item.id===insight.projectId)
 if(!project)return {operation:'no_action',reason:'PROJECT_NOT_ALLOWED',reviewRequired:true}
 const match=issueMatch(insight,openIssues)
 if(insight.kind==='completion_report')return match
  ?{operation:'propose_complete',targetIssueId:match.id,reason:'EXPLICIT_COMPLETION_REPORT',reviewRequired:true}
  :{operation:'no_action',reason:'COMPLETION_TARGET_UNRESOLVED',reviewRequired:true}
 if(insight.kind==='action')return match
  ?{operation:'link_existing',targetIssueId:match.id,reason:'POSSIBLE_DUPLICATE',reviewRequired:true}
  :{operation:'propose_create',reason:'ACTION_CANDIDATE',reviewRequired:true}
 return {operation:'no_action',reason:'NO_MUTABLE_OPERATION',reviewRequired:true}
}

export function materializeProjectContext(projectId,insights=[]){
 const rows=(Array.isArray(insights)?insights:[]).filter(row=>row?.projectId===projectId&&row.status==='reviewed')
 const quote=row=>({sourceId:row.sourceId,evidence:row.exactQuoteOrBoundedEvidence})
 return {projectId,lastConfirmedDecisions:rows.filter(row=>row.kind==='decision').map(quote),
  verifiedStatus:rows.filter(row=>row.kind==='verified_status').map(quote),
  reportedStatus:rows.filter(row=>row.kind==='completion_report').map(quote),
  openCommitments:rows.filter(row=>row.kind==='action').map(quote),
  nextActions:rows.filter(row=>row.kind==='action').map(quote),updatedAt:null,
  sourceRefs:[...new Set(rows.map(row=>row.sourceId))]}
}
