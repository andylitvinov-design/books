'use strict';
/* Existing trusted Watchdog runner only. No new cron, CI workflow, source
 * writer, model, branch update or paid provider. OIDC → private Supabase queue.
 * One request per invocation; every state is backed by real GitHub readback. */
const ENDPOINT='https://shervdixkaxurnaecioe.supabase.co/functions/v1/agent-commander-pr-completion-v1';
const REPO='andylitvinov-design/books',BASE='codex/public-book-library';
const SHA=/^[a-f0-9]{40}$/i,UUID=/^[a-f0-9-]{36}$/i;
const VALID_STATES=new Set(['WATCHING','BLOCKED','MERGED','CLOSED_UNMERGED']);
// Human/security holds are durable. An existing writer's claim is transient.
const HOLDS=new Set(['hh:hold','hh:blocked','hh:repair-manual']);
const {eligibleMachineTruncation}=require('./ci-pr-manual-resume.cjs');
const {readCompleteIssueComments}=require('./ci-pr-task-state.cjs');
// The default-branch Watchdog already wakes on these completed worker runs.
// Only its signed, same-repository worker-completion callback may claim ONE
// pending private owner request. No extra workflow, cron or source permission.
function trustedWorkerWake(context){
 const r=context?.payload?.workflow_run;
 return context?.eventName==='workflow_run'&&
  context.repo?.owner+'/'+context.repo?.repo===REPO&&
  context.ref==='refs/heads/codex/bootstrap-books'&&
  r?.status==='completed'&&r.repository?.full_name===REPO&&
  (!r.head_repository?.full_name||r.head_repository.full_name===REPO)&&
  r.head_branch==='codex/bootstrap-books'&&
  !['cancelled','skipped'].includes(r.conclusion)&&
  ((r.name==='HH PR source Repair Worker'&&r.event==='workflow_dispatch')||
   (r.name==='HH zero-cost PR CI worker'&&
    ['workflow_dispatch','schedule'].includes(r.event)));
}
// Protected default-branch push is already a Watchdog event: no new cron.
function trustedControlPush(context){
 const p=context?.payload;
 return context?.eventName==='push'&&
  context.repo?.owner+'/'+context.repo?.repo===REPO&&
  context.ref==='refs/heads/codex/bootstrap-books'&&
  p?.deleted!==true&&p?.repository?.full_name===REPO&&
  SHA.test(p?.after||'')&&context.sha===p.after;
}
function readback(pr,number,{terminalReadbackOnly=false}={}){
 if(!pr||pr.number!==number||pr.head?.repo?.full_name!==REPO||
  pr.base?.repo?.full_name!==REPO||!SHA.test(pr.head?.sha||''))
  return {status:'BLOCKED',reasonCode:'PR_IDENTITY_UNVERIFIED',
   headSha:SHA.test(pr?.head?.sha||'')?pr.head.sha:null};
 // Historical control-branch requests may ONLY be reconciled to a GitHub
 // terminal state. They never become eligible for source write or dispatch.
 const terminalControl=terminalReadbackOnly&&pr.state==='closed'&&
  pr.base?.ref==='codex/bootstrap-books';
 if(pr.base?.ref!==BASE&&!terminalControl)
  return {status:'BLOCKED',reasonCode:'PR_IDENTITY_UNVERIFIED',headSha:pr.head.sha};
 if(pr.state==='closed'){
  return pr.merged===true&&SHA.test(pr.merge_commit_sha||'')&&
   Number.isFinite(Date.parse(pr.merged_at||''))?
   {status:'MERGED',reasonCode:'GITHUB_MERGE_VERIFIED',headSha:pr.head.sha}:
   {status:'CLOSED_UNMERGED',reasonCode:'GITHUB_CLOSED_NO_MERGE',headSha:pr.head.sha};
 }
 if(pr.state!=='open'||pr.draft===true)
  return {status:'BLOCKED',reasonCode:'PR_NOT_READY',headSha:pr.head.sha};
 const labels=new Set((pr.labels||[]).map(l=>l.name).filter(Boolean));
 for(const hold of HOLDS)if(labels.has(hold))
  return {status:'BLOCKED',reasonCode:'EXISTING_HOLD_NO_OVERRIDE',headSha:pr.head.sha};
 // The signed global worker owns this PR until its claim is released.
 // Do not poison the owner's durable blockedRecheckOnly fence merely
 // because the existing worker is active. Keep monitoring this intent.
 if(labels.has('hh:worker-claimed'))
  return {status:'WATCHING',reasonCode:'OWNER_REPAIR_DIRECT_WORKER_BUSY',
   headSha:pr.head.sha,eligibleForFirstRepair:false};
 if(pr.mergeable===false&&pr.mergeable_state==='dirty')
  return {status:'BLOCKED',reasonCode:'MERGE_CONFLICT_REQUIRES_SEMANTIC_REPAIR',headSha:pr.head.sha};
 return {status:'WATCHING',reasonCode:'AWAIT_EXISTING_CORE_AND_AUTO_MERGE',
  headSha:pr.head.sha,eligibleForFirstRepair:pr.mergeable===true&&labels.has('hh:repair-needed')};
}
async function send(action,fields,token,fetcher){
 const response=await fetcher(ENDPOINT,{method:'POST',cache:'no-store',redirect:'error',
  signal:AbortSignal.timeout(12000),
  headers:{Authorization:'Bearer '+token,'Content-Type':'application/json',Accept:'application/json'},
  body:JSON.stringify({action,...fields})});
 if(response?.status!==200)throw Error('OWNER_PR_EDGE_HTTP_'+String(response?.status||'UNKNOWN'));
 const raw=await response.text();
 if(typeof raw!=='string'||raw.length>16000)throw Error('OWNER_PR_EDGE_RESPONSE_OVERSIZED');
 const data=JSON.parse(raw);
 if(data?.schema!=='HH_COMMANDER_PR_COMPLETION_V1')throw Error('OWNER_PR_EDGE_SCHEMA_MISMATCH');
 return data;
}
async function run({github,core,context,ownerToken='',fetcher=global.fetch,
 dispatch=undefined}={}){
 if(context?.repo?.owner+'/'+context?.repo?.repo!==REPO||
  context?.ref!=='refs/heads/codex/bootstrap-books'||
  !(['schedule','workflow_dispatch'].includes(context.eventName)||trustedWorkerWake(context)||trustedControlPush(context))||
  (context.eventName==='workflow_dispatch'&&String(context.payload?.inputs?.dry_run||'false')==='true'))
  return {status:'SKIPPED_UNTRUSTED'};
 const token=await core.getIDToken('hh-commander-pr');
 if(typeof token!=='string'||token.length<100)return {status:'OIDC_UNAVAILABLE'};
 let next;
 try{next=await send('next',{},token,fetcher);}
 catch(error){core.warning('HH_PR_COMPLETION_CLAIM_'+String(error.message).slice(0,90));return {status:'PRIVATE_QUEUE_UNAVAILABLE'}}
 const task=next.item;
 if(!task)return {status:'NO_PENDING'};
 if(!UUID.test(task.requestId||'')||!UUID.test(task.leaseToken||'')||
  !Number.isSafeInteger(task.prNumber)||task.prNumber<1||task.prNumber>99999999||
  !SHA.test(task.requestedHeadSha||'')||typeof task.dispatchEligibleOnce!=='boolean')
  throw Error('SIGNED_QUEUE_TASK_INVALID');
 let decision={status:'BLOCKED',reasonCode:'PR_GITHUB_READ_UNAVAILABLE',
  headSha:task.requestedHeadSha},dispatchAccepted=false,noDispatchVerified=false;
 try{
  const response=await github.rest.pulls.get({owner:'andylitvinov-design',repo:'books',pull_number:task.prNumber});
  const pr=response?.data;
  decision=readback(pr,task.prNumber,{terminalReadbackOnly:task.blockedRecheckOnly===true});
  // Historical BLOCKED owner tasks are READ-ONLY forever. A resolved
  // semantic merge conflict may return to WATCHING after TWO exact-source
  // GitHub PR reads. It must NEVER grant a new writer, even if the HEAD moves
  // or the old hh:repair-needed hint remains on the branch.
  if(task.blockedRecheckOnly===true&&
     !['MERGED','CLOSED_UNMERGED'].includes(decision.status)){
   const conflictReason=['MERGE_CONFLICT_REQUIRES_SEMANTIC_REPAIR',
    'MERGE_CONFLICT_RESOLVED_WATCH_ONLY'].includes(task.previousReasonCode);
   let recovered=false;
   if(conflictReason&&decision.status==='WATCHING'&&pr?.state==='open'&&
      pr.draft!==true&&pr.mergeable===true&&
      ['clean','blocked','behind'].includes(pr.mergeable_state)&&
      SHA.test(pr.base?.sha||'')&&SHA.test(pr.head?.sha||'')){
    try{
     const live=(await github.rest.pulls.get({
      owner:'andylitvinov-design',repo:'books',pull_number:task.prNumber})).data;
     const verified=readback(live,task.prNumber);
     recovered=verified.status==='WATCHING'&&live.state==='open'&&
      live.draft!==true&&live.mergeable===true&&
      ['clean','blocked','behind'].includes(live.mergeable_state)&&
      live.head.sha===pr.head.sha&&
      live.head?.ref===pr.head?.ref&&
      live.base?.sha===pr.base.sha&&
      live.base?.ref==='codex/public-book-library'&&
      // The original owner's intent is retained for observation only.
      task.dispatchEligibleOnce===false;
    }catch{
     recovered=false; // GitHub outage or changed PR cannot reopen a hold.
    }
   }
   decision=recovered?
    {status:'WATCHING',reasonCode:'MERGE_CONFLICT_RESOLVED_WATCH_ONLY',
     headSha:pr.head.sha,eligibleForFirstRepair:false}:
    {status:'BLOCKED',headSha:task.requestedHeadSha,
     reasonCode:/^[A-Z0-9_]{3,90}$/.test(task.previousReasonCode||'')?
      task.previousReasonCode:'PR_BLOCKED_RECHECK_UNCHANGED'};
  }
  // The owner has explicitly sent a NEW authenticated PR command. Only an
  // Actions-bot-proven, finished zero-price model truncation can request ONE
  // additional isolated legacy-code run. Keep hh:repair-manual in place until
  // a new verified source commit is published (the worker removes it then).
  if(decision.reasonCode==='EXISTING_HOLD_NO_OVERRIDE'&&
     pr.head?.sha===task.requestedHeadSha){
   let pages=0;
   const history=await readCompleteIssueComments(github,'andylitvinov-design','books',
     task.prNumber,async(_label,fn)=>{
      if(++pages>8)throw Error('OWNER_RETRY_HISTORY_LIMIT');
      return fn();
     });
   if(eligibleMachineTruncation(pr,history)){
    decision={status:'WATCHING',reasonCode:'OWNER_SIGNED_TRUNCATION_RETRY_ELIGIBLE',
      headSha:pr.head.sha,eligibleForFirstRepair:true,machineRetry:true};
   }
  }
  // Do not consume the signed, one-shot OIDC dispatch fence while the
  // exact-HEAD Core failure receipt is pending or incomplete. The existing
  // Watchdog will retry this WATCHING request without extra CI or a new cron.
  // Explicit signed truncation retries retain their separate safe proof.
  if(task.dispatchEligibleOnce&&decision.eligibleForFirstRepair&&
     !decision.machineRetry&&decision.headSha===task.requestedHeadSha){
   const proof=await require('./ci-pr-owner-source-proof.cjs')
     .signedCoreSourceProof(github,task.prNumber,task.requestedHeadSha);
   if(proof.verified!==true){
    decision.eligibleForFirstRepair=false;
    decision.reasonCode=proof.reasonCode;
   }
  }
  // Only a first dispatch per owner intent. Never enqueue another Core wave.
  // Source writing still requires signed exact-HEAD failed Core proof,
  // worker reservation and all merge gates. A private signed OIDC owner task
  // may reach the same-run queue without a second, PAT-denied dispatch.
  if(task.dispatchEligibleOnce&&decision.eligibleForFirstRepair&&
    decision.headSha===task.requestedHeadSha){
   // Atomic Supabase CAS is committed BEFORE remote workflow_dispatch.
   // Watching a PR before CI fails never consumes this one-shot fence.
   const arm=await send('arm_dispatch',{requestId:task.requestId,
    leaseToken:task.leaseToken},token,fetcher);
   if(arm.armed!==true){
    decision.reasonCode='PR_REPAIR_DISPATCH_ALREADY_RESERVED';
   }else{
    const ownerProof={source:'OIDC_SIGNED_QUEUE',prNumber:task.prNumber,
      expectedSha:task.requestedHeadSha,requestId:task.requestId,
      leaseToken:task.leaseToken};
    // Legacy/manual recovery must go directly to the same signed
    // single-writer queue, not to the older public-inbox gate which rejects
    // all manual labels. The dispatcher and worker reverify the full proof.
    const invoke=dispatch||(decision.machineRetry?
      async(_g,cmd,opts)=>require('./ci-pr-pm-agent-inbox.cjs')
        .dispatchOwnerQueue(github,core,context,{
          pr:cmd.pr,sha:task.requestedHeadSha,ownerProof:opts.ownerProof}):
      require('./ci-pr-pm-agent-inbox.cjs').dispatchLive);
    const result=await invoke(github,{pr:task.prNumber},{ownerToken,fetcher,ownerProof});
    dispatchAccepted=result?.dispatched===true;
    // Re-arm only when the trusted dispatcher proves no source was dispatched.
    // Unknown acknowledgment, reserved or claimed work never grant a retry.
    const safeDeferral=new Set([
     'OWNER_REPAIR_DIRECT_CAPACITY_UNVERIFIED','OWNER_REPAIR_DIRECT_CAPACITY_UNKNOWN',
     'OWNER_REPAIR_DIRECT_GHOST_WORKER_BUSY','OWNER_REPAIR_DIRECT_WORKER_BUSY',
     'OWNER_REPAIR_DIRECT_RUNNERS_SATURATED','OWNER_REPAIR_DIRECT_JOBS_SATURATED',
     'OWNER_REPAIR_DIRECT_CORE_PRIORITY_PENDING'
    ]);
    noDispatchVerified=result?.dispatched===false&&safeDeferral.has(result?.reason||'');
    if(dispatchAccepted)decision.reasonCode='OWNER_DISPATCH_ACCEPTED_NOT_MODEL_OR_COMMIT';
    else if(typeof result?.reason==='string'){
     decision.reasonCode=/^[A-Z0-9_]{3,90}$/.test(result.reason)?
       result.reason:'REPAIR_DISPATCH_NOT_VERIFIED';
     // Capacity pressure is a real waiting state, not an owner denial.
     // The global signed queue can still repair this exact PR on a later
     // available slot; never claim a worker/source commit from WATCHING.
     const retryable=new Set([
      'OWNER_REPAIR_DIRECT_GHOST_WORKER_BUSY',
      'OWNER_REPAIR_DIRECT_WORKER_BUSY',
      'OWNER_REPAIR_DIRECT_RUNNERS_SATURATED',
      'OWNER_REPAIR_DIRECT_JOBS_SATURATED',
      'OWNER_REPAIR_DIRECT_CAPACITY_UNKNOWN',
       'OWNER_REPAIR_DIRECT_CAPACITY_UNVERIFIED',
       'OWNER_REPAIR_DIRECT_CORE_PRIORITY_PENDING',
      'OWNER_REPAIR_DIRECT_NO_SAFE_DISPATCH',
      'OWNER_REPAIR_DIRECT_RESERVED_REQUIRES_REVIEW',
      'OWNER_REPAIR_DIRECT_CLAIMED_AWAITING_OUTCOME'
     ]);
     if(!retryable.has(decision.reasonCode)&&
        /^(?:OWNER_REPAIR_|REPAIR_NOT_|SIGNED_|SOURCE_|PR_NOT_)/.test(decision.reasonCode))
      decision.status='BLOCKED';
    }
   }
  }
 }catch(error){
  core.warning('HH_PR_COMPLETION_SOURCE_READ_'+String(error.message||'').slice(0,90));
  decision={status:task.blockedRecheckOnly===true?'BLOCKED':'WATCHING',
   reasonCode:task.blockedRecheckOnly===true&&
    /^[A-Z0-9_]{3,90}$/.test(task.previousReasonCode||'')?
     task.previousReasonCode:'GITHUB_READ_TRANSIENT_UNVERIFIED',
   headSha:task.requestedHeadSha};
 }
 // Unsupported base/foreign PRs must produce a durable BLOCKED receipt,
 // rather than strand the signed 4-minute lease without a finish call.
 if(decision.status==='BLOCKED'&&!SHA.test(decision.headSha||''))
  decision.headSha=task.requestedHeadSha;
 if(!VALID_STATES.has(decision.status)||!SHA.test(decision.headSha||''))
  throw Error('OWNER_PR_DECISION_INVALID');
 let final;
 try{
  final=await send('finish',{
   requestId:task.requestId,leaseToken:task.leaseToken,
   status:decision.status,headSha:decision.headSha,
   reasonCode:decision.reasonCode,workflowRunId:context.runId,
   blockedRecheckOnly:task.blockedRecheckOnly===true,
   dispatchAccepted,noDispatchVerified},token,fetcher);
 }catch(error){
  core.warning('HH_PR_COMPLETION_FINISH_'+String(error.message).slice(0,100));
  return {status:'FINISH_UNCONFIRMED',prNumber:task.prNumber,
   dispatchAccepted,claimed:true,merged:false,liveVerified:false};
 }
 if(final?.accepted!==true||final.item?.prNumber!==task.prNumber)
  return {status:'FINISH_UNVERIFIED',prNumber:task.prNumber};
 const report={status:final.item.status,prNumber:task.prNumber,
  reasonCode:final.item.reasonCode,dispatchAccepted,
  merged:final.item.status==='MERGED',mergeSha:final.item.mergeSha||null,
  liveVerified:false,sourceWriteVerified:false};
 core.info('HH_OWNER_PR_COMPLETION '+JSON.stringify(report));
 return report;
}
// Process at most four distinct owner requests per existing signed runner.
// An idle queue ends immediately. No new CI run or workflow dispatch is created.
async function drain(options={},maxItems=4){
 if(!Number.isSafeInteger(maxItems)||maxItems<1||maxItems>4)
  throw Error('OWNER_QUEUE_DRAIN_LIMIT_INVALID');
 const outcomes=[],seen=new Set();
 for(let i=0;i<maxItems;i++){
  const result=await run(options);
  outcomes.push(result);
  if(result?.prNumber!=null){
   if(seen.has(result.prNumber)){
    options.core?.warning?.('HH_OWNER_QUEUE_DUPLICATE_CLAIM_GUARD');
    break;
   }
   seen.add(result.prNumber);
  }
  if(!['WATCHING','BLOCKED','MERGED','CLOSED_UNMERGED'].includes(result?.status))
   break;
 }
 return {schema:'HH_OWNER_QUEUE_DRAIN_V1',processed:seen.size,
  status:outcomes.at(-1)?.status||'NO_RESULT',
  items:outcomes.map(x=>({prNumber:x.prNumber||null,status:x.status,
   reasonCode:x.reasonCode||null,dispatchAccepted:x.dispatchAccepted===true}))};
}
module.exports={readback,run,drain,send,ENDPOINT,trustedWorkerWake,
 trustedControlPush};
