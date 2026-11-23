/** Pure, fail-closed proof chain for an owner-requested PR repair.
 * Signed GitHub Actions issue-comment receipts are untrusted until the
 * identity, reserved watchdog run, exact task key/head and worker lineage
 * all match. No source body, instructions or tokens are copied to the owner.
 */
const REPO='andylitvinov-design/books';
const SHA=/^[a-f0-9]{40}$/i;
const TASK_KEY=/^[a-f0-9]{32}$/i;
const BOT_APP=15368;
const VALID_STATUS=new Set(['RUNNER_CONFIRMED_NO_SOURCE','SOURCE_COMMIT_UNCONFIRMED',
  'SOURCE_COMMIT_VERIFIED','WORKER_CLAIMED','SIGNED_RESERVATION_ONLY',
  'READ_ONLY_PREFLIGHT_NO_SOURCE','UNCONFIRMED']);
const isId=x=>Number.isSafeInteger(x)&&x>0;
const sameSha=(a,b)=>typeof a==='string'&&typeof b==='string'&&a.toLowerCase()===b.toLowerCase();
const justReason=s=>typeof s==='string'&&/^[A-Z0-9_]{1,100}$/.test(s)?s:null;

function trustedRecord(comment){
 if(comment?.user?.login!=='github-actions[bot]'||
    comment?.user?.type!=='Bot'||comment?.performed_via_github_app?.id!==BOT_APP||
    typeof comment.body!=='string'||comment.body.length>16000)return null;
 const body=comment.body;
 if(body.split('<!-- HH_PR_TASK_V1 -->').length!==2)return null;
 const match=/<!-- HH_PR_TASK_V1 -->\s*```json\s*(\{[\s\S]{1,8000}?\})\s*```/.exec(body);
 if(!match)return null;
 try{
  const data=JSON.parse(match[1]);
  return data&&typeof data==='object'&&!Array.isArray(data)&&data.schema==='HH_PR_TASK_V1'?
   {data,at:Date.parse(comment.created_at||'')}:null;
 }catch{return null;}
}
function common(row,prNumber,headSha){
 return row?.pr_number===prNumber&&TASK_KEY.test(row?.task_key||'')&&
   sameSha(row?.head_sha,headSha);
}
function runId(x){const n=Number(x);return typeof x==='string'&&/^[1-9]\d{0,17}$/.test(x)&&isId(n)?n:null;}
function output(status,detail={}){
 if(!VALID_STATUS.has(status))throw Error('INVALID_PM_RECEIPT_STATUS');
 return {status,workerRun:null,workerUrl:null,commitSha:null,commitUrl:null,
  codingAgentVerified:false,sourcePublished:false,reason:null,...detail};
}
/** pr metadata must be a fresh, canonical, linked PR response.
 * All comments must be one complete bounded page (checked by caller).
 * Commit parents are independently fetched only for a signed PUBLISHED claim.
 */
export function verifyPmSourceReceipts({comments,pr,watchdogRunId,requestId,
  expectedHeadSha,requestedAt,commit=null}={}){
 const prNumber=pr?.number,ts=Date.parse(requestedAt||'');
 if(!isId(prNumber)||prNumber>99999999||
  pr?.head?.repo?.full_name!==REPO||pr?.base?.ref!=='codex/public-book-library'||
  !SHA.test(expectedHeadSha||'')||!SHA.test(pr?.head?.sha||'')||
  !isId(watchdogRunId)||!Number.isFinite(ts)||!Array.isArray(comments)||comments.length>100||
  !/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(requestId||''))
  return output('UNCONFIRMED',{reason:'INCOMPLETE_OR_INVALID_CONTEXT'});
 const rows=comments.map(trustedRecord).filter(Boolean).filter(x=>
   Number.isFinite(x.at)&&x.at>=ts-2000).map(x=>x.data)
   .filter(x=>common(x,prNumber,expectedHeadSha));
 const reservations=rows.filter(x=>x.state==='RESERVED'&&
   runId(x.owner_run_id)===watchdogRunId);
 if(reservations.length!==1)return output('UNCONFIRMED',{reason:'SIGNED_PM_RESERVATION_NOT_FOUND'});
 const taskKey=reservations[0].task_key;
 const claimed=rows.filter(x=>x.state==='CLAIMED'&&x.task_key===taskKey&&
   runId(x.owner_run_id)!==null);
 if(claimed.length!==1)return output('SIGNED_RESERVATION_ONLY');
 const workerRun=runId(claimed[0].owner_run_id);
 const workerUrl=`https://github.com/${REPO}/actions/runs/${workerRun}`;
 const base={workerRun,workerUrl};
 const runners=rows.filter(x=>x.state==='RUNNER_STARTED'&&x.task_key===taskKey&&
   runId(x.owner_run_id)===workerRun&&
   x.source_published===false&&
   x.outcome==='VERIFIED_REAL_RUNNER_NOT_SOURCE_FIX'&&
   x.runner?.run_id===workerRun&&isId(x.runner?.job_id)&&
   isId(x.runner?.runner_id)&&typeof x.runner?.runner_name==='string'&&
   x.runner.runner_name.length>0&&Number.isFinite(Date.parse(x.runner.started_at||'')));
 if(runners.length!==1)return output('WORKER_CLAIMED',base);
 const terminal=rows.filter(x=>x.task_key===taskKey&&
   runId(x.owner_run_id)===workerRun&&
   ['PREPARED','PUBLISHED','MANUAL','FAILED','VERIFY_REQUIRED'].includes(x.state));
 const publications=terminal.filter(x=>x.state==='PUBLISHED'&&
   x.source_published===true&&x.outcome==='VERIFIED_SOURCE_COMMIT'&&
   SHA.test(x.new_sha||'')&&
   x.commit_url===`https://github.com/${REPO}/commit/${x.new_sha}`);
 if(publications.length===1){
  const record=publications[0],newSha=record.new_sha;
  const verified=pr.head.sha.toLowerCase()===newSha.toLowerCase()&&
    sameSha(commit?.sha,newSha)&&Array.isArray(commit?.parents)&&
    commit.parents.some(p=>sameSha(p?.sha,expectedHeadSha));
  if(!verified)return output('SOURCE_COMMIT_UNCONFIRMED',{...base,reason:'NEW_SHA_NOT_INDEPENDENTLY_VERIFIED'});
  return output('SOURCE_COMMIT_VERIFIED',{...base,commitSha:newSha.toLowerCase(),
   commitUrl:`https://github.com/${REPO}/commit/${newSha.toLowerCase()}`,
   sourcePublished:true});
 }
 // A signed nonpublication is a meaningful, honest terminal result.
 const noSource=terminal.filter(x=>x.source_published===false&&
   ['PREPARED','MANUAL','FAILED','VERIFY_REQUIRED'].includes(x.state));
 if(noSource.length===1)return output('READ_ONLY_PREFLIGHT_NO_SOURCE',{
  ...base,reason:justReason(noSource[0].reason_code)||'NO_SOURCE_RECEIPT'});
 return output('RUNNER_CONFIRMED_NO_SOURCE',base);
}
/** Only a signed full-lineage PUBLISHED record can request a commit readback.
 * The caller independently verifies commit SHA + parent before upgrading.
 */
export function signedCandidateSha({comments,pr,watchdogRunId,requestId,expectedHeadSha,requestedAt}={}){
 const result=verifyPmSourceReceipts({comments,pr,watchdogRunId,requestId,expectedHeadSha,requestedAt});
 if(result.status!=='SOURCE_COMMIT_UNCONFIRMED')return null;
 const records=comments.map(trustedRecord).filter(Boolean).map(x=>x.data);
 const claim=records.find(x=>x.state==='CLAIMED'&&
   common(x,pr.number,expectedHeadSha)&&runId(x.owner_run_id)===result.workerRun);
 if(!claim)return null;
 const pubs=records.filter(x=>x.state==='PUBLISHED'&&
   common(x,pr.number,expectedHeadSha)&&x.task_key===claim.task_key&&
   runId(x.owner_run_id)===result.workerRun&&x.source_published===true&&
   x.outcome==='VERIFIED_SOURCE_COMMIT'&&SHA.test(x.new_sha||''));
 if(pubs.length!==1)return null;
 const candidate=pubs[0].new_sha.toLowerCase();
 return sameSha(pr.head?.sha,candidate)?candidate:null;
}
