'use strict';
/**
 * Recover a legacy failed CI bootstrap without pretending an empty commit was
 * source repair. Must run only inside the trusted default-branch Control Tower.
 * A failed workflow and old reservation NEVER expire merely by elapsed time.
 */
const {taskFor,parseRecords,readCompleteIssueComments,externalOwnerLeaseStatus,
  reservationStatus,commentBody,trustedControlComment}=require('./ci-pr-task-state.cjs');
const {priorityFor}=require('./ci-pr-priority.cjs');
const REPO='andylitvinov-design/books', PROD='codex/public-book-library';
const DEFAULT='codex/bootstrap-books', WORKFLOW='hh-pr-ci-worker.yml';
const ATTEMPTED='hh:ci-bootstrap-attempted',QUEUE='hh:ci-needed';
const SHA=/^[a-f0-9]{40}$/i, RUN_ID=/^[1-9][0-9]{0,18}$/;
const DENIED='HH_CI_BOOTSTRAP_TOKEN_DENIED_V1';
const TERMINAL='NO_CLAIM_RETRYABLE';
const ACTIVE=['queued','in_progress'];
function candidate(pr){
  const labels=new Set((pr?.labels||[]).map(x=>x.name));
  return pr?.state==='open'&&!pr.draft&&pr.base?.ref===PROD&&
    pr.head?.repo?.full_name===REPO&&pr.user?.login==='andylitvinov-design'&&
    SHA.test(pr.head?.sha||'')&&labels.has(QUEUE)&&labels.has(ATTEMPTED)&&
    !['hh:hold','hh:blocked','hh:worker-claimed','hh:repair-manual'].some(x=>labels.has(x));
}
function mergeabilityVerified(pr){
  return pr?.mergeable===true&&['clean','blocked'].includes(pr?.mergeable_state);
}
function taskForAttempt(pr,now){
  const labels=pr.labels.filter(x=>x.name!==ATTEMPTED);
  return taskFor({...pr,labels},priorityFor({...pr,labels},now));
}
function signedTaskEvents(comments,task){
  const rows=[];
  for(const comment of comments){
    if(!trustedControlComment(comment))continue;
    const parsed=parseRecords([comment]);
    if(!parsed)return null;
    for(const r of parsed)if(r.task_key===task.task_key&&r.head_sha===task.head_sha)
      rows.push({id:comment.id,record:r});
  }
  if(rows.some(x=>!Number.isSafeInteger(x.id)))return null;
  return rows.sort((a,b)=>a.id-b.id);
}
function denialReceipt(comments,sha,minAt){
  const tag='<!-- '+DENIED+' '+sha+' -->';
  const matches=comments.filter(c=>trustedControlComment(c)&&
    String(c.body||'').startsWith(tag));
  if(matches.length!==1)return null;
  const c=matches[0];
  const m=String(c.body||'').match(
    /Actions run: https:\/\/github\.com\/andylitvinov-design\/books\/actions\/runs\/([1-9][0-9]{0,18})(?:\s|$)/
  );
  if(!m||!String(c.body||'').includes('No source commit or Core check was created.'))return null;
  const at=Date.parse(c.created_at||'');
  if(!Number.isFinite(at)||at<minAt)return null;
  return {runId:Number(m[1]),createdAt:at};
}
async function run({github,context,prs,now=Date.now(),dryRun=false,
  limited=async(_,fn)=>fn()}={}){
  const result={schema:'HH_LEGACY_CI_DENIAL_RECONCILE_V1',status:'NONE',
    checked:0,pr_number:null,sourceChanged:false,receiptWritten:false,
    attemptLabelCleared:false,reason:'NO_CANDIDATE'};
  const stop=reason=>{result.reason=reason;return result;};
  if(context?.repo?.owner+'/'+context?.repo?.repo!==REPO||
    context?.ref!=='refs/heads/'+DEFAULT||!['schedule','workflow_dispatch','workflow_run'].includes(context?.eventName))
    return stop('UNTRUSTED_CONTEXT');
  if(!Number.isFinite(now)||!Array.isArray(prs))return stop('INVENTORY_UNVERIFIED');
  const {owner,repo}=context.repo;
  const target=prs.find(candidate);
  if(!target)return result;
  result.checked=1;result.pr_number=target.number;
  if(!RUN_ID.test(String(context.runId||'')))return stop('RUN_ID_UNVERIFIED');
  const task=taskForAttempt(target,now);
  if(!task||task.lane!=='ci')return stop('TASK_UNVERIFIED');
  // The protected default worker must already contain the no-commit PAT
  // metadata wake. Without this, removing ATTEMPTED would restart the OLD
  // source-preserving empty-commit bootstrap. Never do that.
  let worker;
  try{
    const file=(await limited('trusted-worker-source',()=>github.rest.repos.getContent({
      owner,repo,path:'.github/workflows/'+WORKFLOW,ref:DEFAULT
    }))).data;
    if(file?.type!=='file'||file.encoding!=='base64'||typeof file.content!=='string')
      return stop('WORKER_SOURCE_UNVERIFIED');
    worker=Buffer.from(file.content,'base64').toString('utf8');
  }catch{return stop('WORKER_SOURCE_UNAVAILABLE');}
  if(!worker.includes('ci-pr-core-metadata-wake.cjs')||
     worker.includes('sourceGit.bootstrap')||worker.includes("'/git/commits'")||
     worker.includes("'/git/refs'"))
    return stop('WAITING_FOR_NO_COMMIT_WORKER');
  let pr;
  try{pr=(await limited('live-pr',()=>github.rest.pulls.get({
    owner,repo,pull_number:target.number}))).data;}
  catch{return stop('PR_READ_UNAVAILABLE');}
  if(!candidate(pr)||!mergeabilityVerified(pr)||
    pr.head?.sha!==target.head.sha)return stop('HEAD_OR_QUEUE_CHANGED');
  let comments;
  const read=()=>readCompleteIssueComments(github,owner,repo,pr.number,limited);
  try{comments=await read();}catch{return stop('HISTORY_UNAVAILABLE');}
  if(!comments||!parseRecords(comments))return stop('HISTORY_UNVERIFIED');
  const events=signedTaskEvents(comments,task);
  if(!events?.length)return stop('SIGNED_RESERVATION_MISSING');
  const latest=events.at(-1).record;
  let recoveryAlreadySigned=latest.state===TERMINAL;
  if(!recoveryAlreadySigned&&latest.state!=='RESERVED')
    return stop('OWNER_STATE_NOT_RECOVERABLE');
  if(events.some(x=>['CLAIMED','PUBLISHED','REPAIRED','DONE','FAILED',
    'UNCONFIRMED','CI_WAKE_REQUESTED'].includes(x.record.state)))
    return stop('OTHER_WORKER_CLAIM_OR_FINAL');
  const reservation=events.filter(x=>x.record.state==='RESERVED').at(-1)?.record;
  if(!reservation||!RUN_ID.test(String(reservation.owner_run_id||'')))
    return stop('RESERVATION_ID_UNVERIFIED');
  const reservedAt=Date.parse(reservation.created_at||'');
  if(!Number.isFinite(reservedAt)||now-reservedAt<40*60000)
    return stop('RESERVATION_COOLDOWN_OR_CLOCK');
  if(recoveryAlreadySigned){
    if(latest.reservation_run_id!==reservation.owner_run_id||
      latest.claim_status!=='skipped'||latest.claim_result!=='success'||
      latest.source_published!==false)
      return stop('EXISTING_RECOVERY_UNVERIFIED');
  }else if(reservationStatus(task,comments,now)!=='RESERVED_REQUIRES_REVIEW'){
    return stop('RESERVATION_STATUS_CHANGED');
  }
  // Never recover a head already claimed by a source-writing Repair Worker.
  if(comments.some(c=>String(c.body||'').includes(
    'HH_PR_REPAIR_WORKER_V1 '+task.head_sha)))
    return stop('SOURCE_REPAIR_CLAIMED');
  const denied=denialReceipt(comments,task.head_sha,reservedAt);
  if(!denied)return stop('TRUSTED_TOKEN_DENIAL_MISSING');
  let runState;
  try{
    runState=(await limited('failed-ci-run',()=>github.rest.actions.getWorkflowRun({
      owner,repo,run_id:denied.runId}))).data;
  }catch{return stop('FAILED_RUN_UNAVAILABLE');}
  if(runState?.id!==denied.runId||runState?.name!=='HH zero-cost PR CI worker'||
     runState?.repository?.full_name!==REPO||runState?.event!=='workflow_dispatch'||
     runState?.head_branch!==DEFAULT||runState?.status!=='completed'||
     runState?.conclusion!=='failure'||runState?.actor?.login!=='github-actions[bot]'||
     Date.parse(runState?.created_at||'')<reservedAt)
    return stop('FAILED_RUN_NOT_AUTHENTICATED');
  if(externalOwnerLeaseStatus(comments,task.head_sha,now)!=='FREE')
    return stop('ACTIVE_OR_UNVERIFIED_OWNER_LEASE');
  // A running/queued worker can still write the same HEAD. Demand complete
  // status-specific lists rather than assuming that "no rows" means idle.
  try{
    for(const status of ACTIVE){
      const data=(await limited('worker-'+status,()=>github.rest.actions.listWorkflowRuns({
        owner,repo,workflow_id:WORKFLOW,status,per_page:1}))).data;
      if(!Array.isArray(data?.workflow_runs)||data?.total_count!==0)
        return stop('WORKER_ACTIVE_OR_UNVERIFIED');
    }
  }catch{return stop('WORKER_HISTORY_UNAVAILABLE');}
  if(dryRun){result.status='WOULD_RECOVER';return stop('DRY_RUN');}
  // Fresh exact-head/base/labels read before each privileged mutation.
  const recheck=async()=>{
    const current=(await limited('head-recheck',()=>github.rest.pulls.get({
      owner,repo,pull_number:pr.number}))).data;
    return candidate(current)&&mergeabilityVerified(current)&&
      current.head.sha===task.head_sha&&
      current.base.ref===PROD;
  };
  try{if(!await recheck())return stop('HEAD_RECHECK_FAILED');}
  catch{return stop('HEAD_RECHECK_UNAVAILABLE');}
  if(!recoveryAlreadySigned){
    try{
      const newest=await read();
      const nowSigned=signedTaskEvents(newest||[],task);
      if(!nowSigned||nowSigned.at(-1)?.record?.state!=='RESERVED'||
         nowSigned.at(-1).record.owner_run_id!==reservation.owner_run_id)
        return stop('RESERVATION_CHANGED_BEFORE_WRITE');
      const receipt={...task,state:TERMINAL,created_at:new Date(now).toISOString(),
        retry_after:new Date(now+2*60000).toISOString(),
        claim_status:'skipped',claim_result:'success',source_published:false,
        reservation_run_id:reservation.owner_run_id,
        owner_run_id:String(context.runId),
        reason_code:'VERIFIED_PRIOR_TOKEN_DENIAL_NO_SOURCE_COMMIT',
        failed_worker_run_id:String(denied.runId)};
      await limited('signed-no-claim-receipt',()=>github.rest.issues.createComment({
        owner,repo,issue_number:pr.number,body:commentBody(receipt)
      }));
      result.receiptWritten=true;
      // A returned HTTP success is not yet an authenticated completion.
      // Read it back as the GitHub Actions app, on the exact task and HEAD.
      const observed=await read();
      const proof=signedTaskEvents(observed||[],task);
      if(!proof||proof.at(-1)?.record?.state!==TERMINAL||
         proof.at(-1).record.reservation_run_id!==reservation.owner_run_id||
         reservationStatus(task,observed,now)!=='NO_CLAIM_RETRY_BACKOFF')
        return stop('SIGNED_RECOVERY_RECEIPT_UNVERIFIED');
    }catch{return stop('RECOVERY_RECEIPT_WRITE_FAILED');}
  }
  // This label is removed ONLY after the signed receipt was written and the
  // same exact-head PR is still eligible. Crash after receipt stays resumable.
  try{
    if(!await recheck())return stop('HEAD_CHANGED_AFTER_RECEIPT');
    await limited('clear-failed-attempt-label',()=>github.rest.issues.removeLabel({
      owner,repo,issue_number:pr.number,name:ATTEMPTED
    }));
    // A successful HTTP response is not yet proof that the queue label
    // disappeared. Verify exact source HEAD and absence of the attempt flag.
    const after=(await limited('attempt-label-readback',()=>github.rest.pulls.get({
      owner,repo,pull_number:pr.number}))).data;
    if(after?.head?.sha!==task.head_sha||
       after?.labels?.some(x=>x.name===ATTEMPTED))
      return stop('ATTEMPT_LABEL_CLEAR_UNVERIFIED');
    result.attemptLabelCleared=true;
    result.status='RECOVERED_QUEUE_BACKOFF';
    return stop('SIGNED_NO_CLAIM_AND_ATTEMPT_CLEARED');
  }catch{return stop('ATTEMPT_LABEL_CLEAR_UNVERIFIED');}
}
module.exports={run,candidate,taskForAttempt,signedTaskEvents,denialReceipt};
