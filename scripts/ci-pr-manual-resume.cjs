'use strict';
// A NEW signed owner command may fund one extra zero-price attempt after a
// conclusively finished machine-only model truncation. It is not permission
// to bypass a real owner/security hold, a live source writer or branch rules.
const {parseRecords,trustedControlComment}=require('./ci-pr-task-state.cjs');
const SHA=/^[a-f0-9]{40}$/i,UUID=/^[a-f0-9-]{36}$/i;
const REPO='andylitvinov-design/books',PROD='codex/public-book-library';
function eligibleMachineTruncation(pr,comments){
 if(!pr||pr.state!=='open'||pr.draft||pr.user?.login!=='andylitvinov-design'||
    pr.base?.ref!==PROD||pr.head?.repo?.full_name!==REPO||
    !SHA.test(pr.head?.sha||'')||pr.mergeable!==true||
    !['clean','blocked','behind'].includes(pr.mergeable_state)||
    !Array.isArray(comments))return false;
 const labels=new Set((pr.labels||[]).map(l=>l.name));
 if(!labels.has('hh:repair-manual')||!labels.has('hh:repair-needed')||
    ['hh:hold','hh:blocked','hh:worker-claimed','hh:direction-override:invalid',
     'hh:release-gate-review','hh:specialist-repair-needed',
     'hh:conflict-repair-needed'].some(x=>labels.has(x)))return false;
 const records=parseRecords(comments.filter(trustedControlComment));
 if(!records)return false;
 return records.some(r=>r.pr_number===pr.number&&r.head_sha===pr.head.sha&&
   r.lane==='repair'&&r.state==='MANUAL'&&
   r.source_published===false&&r.new_sha==null&&
   r.detail_code==='FREE_AI_OPENROUTER_PATCH_RESPONSE_TRUNCATED'&&
   r.ai_execution?.model_response_confirmed===true&&
   r.ai_execution?.patch_received===false&&
   r.ai_execution?.source_published_sha==null&&
   r.model_run?.model_call_started_at&&
   r.model_run?.response_shape?.finish_reason==='length'&&
   r.model_run?.patch_present===false);
}
function signedOwnerResume(pr,comments){
 if(!eligibleMachineTruncation(pr,comments))return false;
 const records=parseRecords(comments.filter(trustedControlComment));
 const approved=records.filter(r=>r.pr_number===pr.number&&
   r.head_sha===pr.head.sha&&r.lane==='legacy'&&r.state==='RESERVED'&&
   r.owner_retry_kind==='TRUNCATED_FREE_MODEL'&&
   r.owner_retry_source==='OIDC_SIGNED_QUEUE'&&
   UUID.test(r.owner_retry_request_id||'')&&
   /^[1-9][0-9]{0,18}$/.test(String(r.owner_run_id||'')));
 // Exactly one signed owner grant per machine-held HEAD. Future failures
 // remain held, not silently retried with a new model/CI wave.
 return approved.length===1;
}
module.exports={eligibleMachineTruncation,signedOwnerResume};
