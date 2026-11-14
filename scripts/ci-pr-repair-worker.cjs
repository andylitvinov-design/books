'use strict';

/* Trusted default-branch PR Repair Worker. Never execute PR code with a write token. */
const PROD = 'codex/public-book-library';
const DEFAULT = 'codex/bootstrap-books';
const REPO = 'andylitvinov-design/books';
const SOURCE = 'hh:repair-needed';
const CONFLICT = 'hh:conflict-repair-needed';
const MANUAL = 'hh:repair-manual';
const MARKER = 'HH_PR_REPAIR_WORKER_V1';
const SHA = /^[0-9a-f]{40}$/i;
const PATH = /^(?!\/)(?!.*(?:^|\/)\.)(?!.*\.\.)(?:[\w.-]+\/)*[\w.-]+\.(?:js|jsx|ts|tsx|mjs|cjs)$/;
const MAX_FILES = 8;
const MAX_CANDIDATES = 4;
const MAX_READS = 36;
const RATE_RESERVE = 100;
const {pickQueueCandidates,priorityFor} = require('./ci-pr-priority.cjs');
const {safeSourcePath: safeFreeSourcePath,assessCompleteFreeRepairScope}=require('./ci-pr-repair-free-agent.cjs');
const {taskFor,commentBody,readCompleteIssueComments,externalOwnerLeaseStatus,parseRecords,trustedControlComment,reservationStatus}=require('./ci-pr-task-state.cjs');
const {stageLine}=require('./ci-pr-stage-receipts.cjs');
const {buildTaskOutcome}=require('./ci-pr-task-outcome.cjs');
const {makeWorkerFollowUp}=require('./ci-pr-error-task.cjs');

function validBranch(ref) {
  return typeof ref === 'string' && ref.length <= 160 &&
    /^[A-Za-z0-9][\w./-]*$/.test(ref) && !ref.includes('..') &&
    !ref.includes('//') && !ref.includes('@{') && !ref.endsWith('/') &&
    ref !== PROD && ref !== DEFAULT;
}

// Read-only veto immediately before expensive isolated repair work.
// Not proof of a source fix, claim ownership, or permission to merge.
function currentRepairHead(pr,number,expectedSha){
 return Boolean(Number.isSafeInteger(number)&&number>0&&
  SHA.test(expectedSha||'')&&pr?.number===number&&
  pr.state==='open'&&pr.draft===false&&
  pr.user?.login===REPO.split('/')[0]&&
  pr.base?.ref===PROD&&pr.head?.repo?.full_name===REPO&&
  pr.head?.sha===expectedSha&&validBranch(pr.head?.ref)&&
  Array.isArray(pr.labels)&&!pr.labels.some(label=>
   ['hh:hold','hh:blocked','hh:direction-override:invalid']
    .includes(label?.name)));
}

function eligible(pr, fullRepo) {
  const owner = fullRepo.split('/')[0];
  return !!(pr && pr.state === 'open' && !pr.draft &&
    pr.user?.login === owner && pr.base?.ref === PROD &&
    pr.head?.repo?.full_name === fullRepo &&
    SHA.test(pr.head?.sha || '') && validBranch(pr.head?.ref) &&
    pr.labels?.some(l => [SOURCE, CONFLICT].includes(l.name)) &&
    !pr.labels?.some(l => [MANUAL,'hh:hold','hh:blocked',
      'hh:worker-claimed','hh:direction-override:invalid'].includes(l.name)));
}
function legacyPrepEligible(pr,fullRepo){
 return !!(pr&&pr.state==='open'&&!pr.draft&&
  pr.base?.ref===PROD&&pr.head?.repo?.full_name===fullRepo&&
  pr.user?.login===fullRepo.split('/')[0]&&SHA.test(pr.head?.sha||'')&&
  pr.labels?.some(l=>l.name===MANUAL)&&
  !pr.labels?.some(l=>['hh:hold','hh:blocked','hh:worker-claimed',
    'hh:direction-override:invalid'].includes(l.name)));
}
// A manual label may be retired ONLY for an old worker-generated manual
// outcome, a NEW source HEAD with an actual signed Core failure, clean base,
// a no-sensitive-files allowlist and no independent release gate.
function trustedLegacySourceRetry(pr,comments,changedFiles){
 const sha=pr?.head?.sha;
 if(!SHA.test(sha||'')||!legacyPrepEligible(pr,REPO)||
   pr.mergeable!==true||!['clean','blocked','behind'].includes(pr.mergeable_state)||
   pr.labels?.some(l=>['hh:release-gate-review','hh:specialist-repair-needed',
     CONFLICT].includes(l.name))||
   !pr.labels?.some(l=>l.name===SOURCE)||
   !hasVerifiedSourceHandoff(comments,sha)||
   !verifiedCoreCodeFailure(comments,sha))return false;
 // Check the COMPLETE PR diff, not the first eight filtered code paths.
 // A single hidden protected or sensitive file prohibits automatic promotion.
 const scope=assessCompleteFreeRepairScope(changedFiles);
 if(!scope.allowed||!scope.files.every(safeFreeSourcePath))return false;
 // A manual marker is never implicitly waived. Only a signed worker-issued
 // MANUAL outcome may authorize one subsequent, now-configured model attempt.
 // On the SAME HEAD, only a documented no-model/no-source outcome qualifies.
 const records=parseRecords((comments||[]).filter(trustedControlComment));
 if(!records)return false;
 // Require a real signed older-head MANUAL outcome. Same-head terminal
 // states are already consumed by reservationStatus(); treating a no-model
 // MANUAL on the same HEAD as a fresh retry would bypass that queue fence.
 // Such unresolved work stays in the semantic handoff queue, not a new
 // unreserved model attempt.
 if(!records.some(r=>r.pr_number===pr.number&&r.state==='MANUAL'&&
   SHA.test(r.head_sha||'')&&r.head_sha!==sha))return false;
 // New HEAD must have its OWN verified Core failure and must not already
 // contain a terminal repair outcome or an attempted/uncertain model call.
 return !records.some(r=>r.pr_number===pr.number&&r.head_sha===sha&&(
   ['PREPARED','PUBLISHED','VERIFY_REQUIRED','FAILED','MANUAL',
    'REJECTED','UNCONFIRMED'].includes(r.state)||
   r.source_published===true||
   r.model_run?.model_call_started_at||
   (typeof r.code_job_result==='string'&&
     !['skipped','unknown'].includes(r.code_job_result))||
   ['proposed','ready'].includes(r.code_candidate_status)));
}
function activeSweepLease(comments,sha,now){
 // The trusted Dispatcher and Repair must see the same exact-HEAD owner.
 return externalOwnerLeaseStatus(comments,sha,now)!=='FREE';
}

function repairMode(pr) {
  const labels=new Set((pr?.labels || []).map(l=>l.name));
  const source=labels.has(SOURCE), conflict=labels.has(CONFLICT);
  if(!source && !conflict)return 'not_queued';
  // A label is a historical hint, never proof of a current Git merge conflict.
  if(pr.mergeable===false && pr.mergeable_state==='dirty')return 'conflict';
  if(pr.mergeable===true && ['clean','blocked','behind','unstable'].includes(pr.mergeable_state))
    return source ? 'lint' : 'stale_conflict';
  return 'unverified';
}
function hasVerifiedSourceHandoff(comments, sha) {
  const receipt='<!-- HH_PR_10MIN_SOURCE_REPAIR_V1 '+sha+' -->';
  // Verify the Actions application and exact HEAD, never PR-authored prose.
  // A historical receipt that identifies ONLY Specialist/merge-gate errors
  // must not become authorization to write application source code.
  return Array.isArray(comments) && comments.some(c=>{
    if(c?.user?.id!==41898282||c.user.login!=='github-actions[bot]'||
       c.user.type!=='Bot'||c.performed_via_github_app?.id!==15368||
       c.performed_via_github_app.slug!=='github-actions'||
       typeof c.body!=='string'||!c.body.includes(receipt))return false;
    const failed=/^Failed jobs: ([^\n]+)$/m.exec(c.body);
    return !failed || failed[1].split(',').some(name=>
      name.trim().replace(/\.$/,'')==='core-lint-types-build');
  });
}
// An exact-HEAD, Actions-bot-authenticated Watchdog Core source failure
// bypasses ESLint autofix. Never trust PR text or aggregate gate failures.
function verifiedCoreCodeFailure(comments,sha){
 const marker='<!-- HH_PR_10MIN_SOURCE_REPAIR_V1 '+sha+' -->';
 return Array.isArray(comments)&&comments.some(comment=>{
  if(comment?.user?.id!==41898282||
     comment.user.login!=='github-actions[bot]'||
     comment.user.type!=='Bot'||
     comment.performed_via_github_app?.id!==15368||
     comment.performed_via_github_app?.slug!=='github-actions'||
     typeof comment.body!=='string'||
     !comment.body.startsWith(marker+'\n'))return false;
  const match=/^Failed jobs: ([^\n]+)$/m.exec(comment.body);
  return !!match&&match[1].split(',').some(name=>
   name.trim().replace(/\.$/,'')==='core-lint-types-build');
 });
}
function safeFiles(items) {
  return Array.isArray(items) && items.length < 100 &&
    items.filter(f => ['added','modified'].includes(f.status) &&
      PATH.test(f.filename) && !f.filename.startsWith('tests/') &&
      !f.filename.startsWith('.github/') &&
      !f.filename.includes('/__tests__/')).slice(0, MAX_FILES).map(f => f.filename);
}
// A claimed repair cannot complete green without independently proven source.
// An outdated HEAD is an intentional safe abort, not a failed publication.
function claimedRepairMissingSourceProof(result) {
  return !!result && result.state!=='PREPARED' &&
    result.claim_status === 'claimed' &&
    result.source_published !== true && result.state !== 'SUPERSEDED';
}

function writeOutputs(core, values) {
  for (const [k, v] of Object.entries(values)) core.setOutput(k, String(v));
}
// Always inspect actionable source repairs before manual-conflict claims.
function prioritizedRepairCandidates(source,conflicts,now,max=MAX_CANDIDATES){
  const valid=items=>[...new Map((items||[]).filter(i=>
    i&&i.pull_request&&Number.isSafeInteger(i.number)&&i.number>0 &&
    !(i.labels||[]).some(l=>l.name===MANUAL))
    .map(i=>[i.number,i])).values()];
  const sources=valid(source),ids=new Set(sources.map(i=>i.number));
  const manualConflicts=valid(conflicts).filter(i=>!ids.has(i.number));
  // Actionable source fixes have precedence over conflict-only human handoff.
  const sourceSlots=manualConflicts.length?Math.max(1,max-1):max;
  const count=Math.min(sourceSlots,sources.length);
  const fast=count>1?count-1:0;
  const first=count?pickQueueCandidates(sources,now,count,fast):[];
  const rest=Math.max(0,max-first.length);
  // Manual-only conflicts are rotated fairly; a priority label cannot make
  // the worker auto-resolve an unsafe ours/theirs conflict.
  const offset=manualConflicts.length?(Math.floor(now/600000)*MAX_CANDIDATES)%manualConflicts.length:0;
  const manual=[...manualConflicts.slice(offset),...manualConflicts.slice(0,offset)].slice(0,rest);
  return [...first,...manual];
}

async function claim({github,core,context,number=0,expectedSha='',taskKey='',reservationRunId='',dryRun=false,hasToken=false,hasOpenRouter=false,now=Date.now()}) {
  const {owner,repo} = context.repo, fullRepo = owner + '/' + repo;
  const log = message => core.info('HH_REPAIR: ' + message);
  const skip = reason => { log('SKIP ' + reason); return {status:'skipped',reason}; };
  let reads=0, remaining=null;
  const limited=async(label,fn)=>{
    if(reads>=MAX_READS || (remaining !== null && remaining < RATE_RESERVE))
      throw Error('HH_REPAIR_API_BUDGET_PAUSE:'+label);
    reads++;
    const response=await fn();
    const rate=response?.headers?.['x-ratelimit-remaining'];
    if(rate!==undefined && Number.isFinite(Number(rate)))remaining=Number(rate);
    return response;
  };
  if (fullRepo !== 'andylitvinov-design/books') return skip('WRONG_REPOSITORY');
  // Existing owner token is required later only for source publication.
 // The read-only legacy path can run without this secret.
  if(taskKey && (!/^[a-f0-9]{32}$/i.test(taskKey) || !SHA.test(expectedSha) ||
      !Number.isSafeInteger(number) || number<1 ||
      !/^[1-9][0-9]{0,18}$/.test(reservationRunId) ||
      context.eventName!=='workflow_dispatch'))return skip('INVALID_ADDRESSED_REPAIR_TASK');
  try {
  let candidates = [];
  if(taskKey){
    // Control Tower selected an exact HEAD; a global queue scan here can
    // consume API budget or hide a valid authorized addressed task.
    candidates=[{number}];
  }else{
    // Cron is a source-fix fallback, not a second manual conflict dispatcher.
    // Handed-off DIRTY source conflicts belong to semantic Chat/Codex work.
    const listed=await limited('source-queue',()=>github.rest.issues.listForRepo({
      owner,repo,state:'open',labels:SOURCE,sort:'updated',direction:'asc',per_page:40}));
    if(!Array.isArray(listed?.data))return skip('INCOMPLETE_QUEUE');
    const queued=prioritizedRepairCandidates(listed.data,[],now);
    candidates=Number.isSafeInteger(number)&&number>0
      ?[{number},...queued.filter(x=>x.number!==number)].slice(0,MAX_CANDIDATES)
      :queued;
  }
  for (const item of candidates) {
    const pr = (await limited('live-pr',()=>github.rest.pulls.get({owner,repo,pull_number:item.number}))).data;
    if (!(eligible(pr,fullRepo)||legacyPrepEligible(pr,fullRepo)) ||
        (expectedSha && item.number===number && pr.head.sha !== expectedSha)) continue;
    const task=taskFor(pr,priorityFor(pr,now));
    if(!task || (taskKey&&task.task_key!==taskKey)){
      log('REFUSE_STALE_OR_FOREIGN_TASK #'+pr.number);continue;
    }
    // An open child does not forbid source-preserving parent repair. What is
    // unsafe is an active SQUASH/REBASE auto-merge: the child then loses its
    // ancestry. Require a verified child and Merge Commit or no auto-merge.
    const children = (await limited('stacked-children',()=>github.rest.pulls.list({owner,repo,state:'open',base:pr.head.ref,per_page:2}))).data;
    if (!Array.isArray(children)) continue;
    const stacked=children.some(child=>child?.number!==pr.number &&
      child?.state==='open'&&child?.base?.ref===pr.head.ref);
    if(stacked && pr.auto_merge && pr.auto_merge.merge_method!=='merge'){
      log('SKIP_STACKED_PARENT_UNSAFE_AUTO_MERGE #'+pr.number);
      continue;
    }
    // Incomplete history cannot prove ownership. Bounded pagination avoids
    // indefinitely blocking mature PRs as they pass 100 issue comments.
    const comments = await readCompleteIssueComments(github,owner,repo,pr.number,limited);
    if(!comments)continue;
    const marker='<!-- '+MARKER+' '+pr.head.sha+' -->';
    if(task.lane!=='legacy'&&comments.some(c=>(c.body||'').includes(marker)))continue;
    if(taskKey){
      // Exact signed reservation from the trusted single writer is mandatory.
      // A stale, foreign, unsigned or superseded reservation never claims.
      const signed=parseRecords(comments.filter(trustedControlComment));
      const relevant=signed?.filter(r=>r.task_key===taskKey&&
        r.head_sha===expectedSha&&r.pr_number===number);
      const latest=relevant?.at(-1);
      if(!latest||latest.state!=='RESERVED'||latest.lane!==task.lane||
         latest.owner_run_id!==reservationRunId){
        log('REFUSE_UNSIGNED_OR_SUPERSEDED_RESERVATION #'+pr.number);continue;
      }
      if(activeSweepLease(comments,pr.head.sha,now))continue;
    }else{
      // Periodic work must not race an accepted dispatcher reservation.
      const state=reservationStatus(task,comments,now);
      if(state!=='FREE'){
        log('SKIP_RESERVED_OR_HANDLED #'+pr.number+' '+state);continue;
      }
    }
    const legacy=task.lane==='legacy';
    const mode=legacy?'legacy':repairMode(pr);
    if(mode==='stale_conflict'){
      // A resolved conflict must not consume the manual repair slot forever.
      if(!dryRun){
        const fresh=(await limited('recheck-stale-conflict',()=>github.rest.pulls.get({
          owner,repo,pull_number:pr.number
        }))).data;
        if(fresh.head?.sha===pr.head.sha && repairMode(fresh)==='stale_conflict'){
          try {
            await limited('clear-stale-conflict-label',()=>github.rest.issues.removeLabel({
              owner,repo,issue_number:pr.number,name:CONFLICT
            }));
            log('CLEARED_STALE_CONFLICT_LABEL #' + pr.number + ' HEAD=' + pr.head.sha);
          } catch(error){log('Stale conflict label removal failed: '+error.message);}
        }
      }
      continue;
    }
    if(mode==='unverified' || mode==='not_queued')continue;
    const conflict=mode==='conflict';
    if(conflict&&!taskKey&&number===0){
      log('SKIP_CRON_MANUAL_CONFLICT #'+pr.number);continue;
    }
    // A source label from an older HEAD is not permission to edit new code.
    // The trusted Watchdog must have diagnosed this exact HEAD as source-red.
    if(!legacy&&!conflict && (!hasVerifiedSourceHandoff(comments,pr.head.sha)||
        !verifiedCoreCodeFailure(comments,pr.head.sha))){
      log('SKIP_SOURCE_WITHOUT_VERIFIED_FAILED_CORE_BUILD #' + pr.number);
      continue;
    }
    let files = [], changedFiles = [];
    if (!conflict) {
      changedFiles = (await limited('changed-files',()=>github.rest.pulls.listFiles({owner,repo,pull_number:pr.number,per_page:100,page:1}))).data;
      files = safeFiles(changedFiles);
      if (!files || (files.length === 0 && !legacy)) continue;
    }
    if (remaining !== null && remaining < RATE_RESERVE) return skip('GITHUB_API_RESERVE');
    if (dryRun) {
      log('WOULD_CLAIM #' + pr.number + ' owner=' + pr.user.login + ' SHA=' + pr.head.sha);
      return {status:'dry_run',number:pr.number,sha:pr.head.sha,files};
    }
    const safeRetry=legacy&&hasToken&&hasOpenRouter&&
      trustedLegacySourceRetry(pr,comments,changedFiles);
    if(safeRetry)files=assessCompleteFreeRepairScope(changedFiles).files;
    const strategy=legacy?(safeRetry?'code':'legacy'):
      !conflict&&verifiedCoreCodeFailure(comments,pr.head.sha)?'code':'lint';
    if(!legacy&&!hasToken)return skip('HH_AUTOMERGE_TOKEN_MISSING');
    // A reservation was verified above, but another owner or a new HEAD can
    // arrive while we inspect files. Re-read immediately before CLAIMED.
    // Only addressed tasks pay the additional complete-history read.
    const current=(await limited('claim-prewrite-head',()=>github.rest.pulls.get({
      owner,repo,pull_number:pr.number
    }))).data;
    if(!current||current.state!=='open'||current.draft||
       current.head?.sha!==pr.head.sha||current.head?.ref!==pr.head.ref||
       current.base?.ref!==pr.base.ref||current.base?.sha!==pr.base?.sha||
       !(eligible(current,fullRepo)||legacyPrepEligible(current,fullRepo))||
       taskFor(current,priorityFor(current,now))?.task_key!==task.task_key){
      log('SKIP_HEAD_OR_TASK_CHANGED_BEFORE_CLAIM #'+pr.number);
      continue;
    }
    if(taskKey){
      const latestComments=await readCompleteIssueComments(github,owner,repo,pr.number,limited);
      const signed=latestComments&&parseRecords(latestComments.filter(trustedControlComment));
      const latest=signed?.filter(r=>r.task_key===taskKey&&
        r.head_sha===expectedSha&&r.pr_number===number).at(-1);
      if(!latest||latest.state!=='RESERVED'||latest.lane!==task.lane||
         latest.owner_run_id!==reservationRunId||
         reservationStatus(task,latestComments,now)!=='RESERVED_REQUIRES_REVIEW'||
         activeSweepLease(latestComments,pr.head.sha,now)){
        log('SKIP_OWNER_OR_RESERVATION_CHANGED_BEFORE_CLAIM #'+pr.number);
        continue;
      }
    }
    // Persist the addressed task acknowledgement on the exact source HEAD.
    // CLAIMED is evidence of ownership, never evidence of a published fix.
    const trustedReservation=taskKey?
      parseRecords(comments.filter(trustedControlComment))?.filter(r=>
        r.task_key===taskKey&&r.head_sha===pr.head.sha&&
        r.state==='RESERVED'&&r.owner_run_id===reservationRunId).at(-1):null;
    const receipt=trustedReservation?{...task,
      ...(trustedReservation.error_task_id?
        {error_task_id:trustedReservation.error_task_id}:{}),
      ...(trustedReservation.assigned_executor_id?
        {assigned_executor_id:trustedReservation.assigned_executor_id}:{}),
      assignment_status:'WORKER_CLAIMED'}:task;
    const workerRunUrl=Number.isSafeInteger(context.runId)?
      'https://github.com/'+fullRepo+'/actions/runs/'+context.runId:null;
    const claimedReceipt=receipt?commentBody({...receipt,state:'CLAIMED',
      owner_run_id:String(context.runId||'unknown'),run_url:workerRunUrl,
      executor_run_id:String(context.runId||'unknown'),
      worker_started:true,source_published:false,
      promoted_from_legacy:safeRetry,
      outcome:'CLAIM_ONLY_NO_SOURCE_WRITE'}):'';
    const claimStage=Number.isSafeInteger(context.runId)&&receipt?.task_key?
      stageLine({stage:'claimed',pr_number:pr.number,head_sha:pr.head.sha,
        run_id:context.runId,task_key:receipt.task_key,
        at:new Date().toISOString(),source:'repair_worker_claim'}):'';
    await github.rest.issues.createComment({owner,repo,issue_number:pr.number,body:
      marker + '\n**HH Repair Worker claimed this HEAD.**\n' +
      'Owner: @' + pr.user.login + '; strategy: ' + (legacy?(safeRetry?'legacy/safe-source-repair':'legacy/cloud-preflight'):
       conflict?'conflict/manual':strategy==='code'?'verified Core/TypeScript code repair':'targeted ESLint autofix') +
      '. The worker does not bypass checks or overwrite another source branch.' +
      (claimedReceipt?'\n'+claimedReceipt:'')+(claimStage?'\n'+claimStage:'')});
    try { await github.rest.issues.addAssignees({owner,repo,issue_number:pr.number,assignees:[pr.user.login]}); }
    catch (error) { log('Could not assign owner to #' + pr.number + ': ' + error.message); }
    if (conflict) {
      await github.rest.issues.createComment({owner,repo,issue_number:pr.number,body:
        'HH Repair Worker: true merge conflict detected. No safe deterministic resolution; '+
        '@' + pr.user.login + ' must resolve the conflicting source semantics or use an approved coding agent. '+
        'No force-push or automatic ours/theirs resolution performed.'+
        (receipt?'\n'+commentBody({...receipt,state:'MANUAL',
          outcome:'CONFLICT_REQUIRES_OWNER',owner_run_id:String(context.runId||'unknown'),
          run_url:workerRunUrl}):'')});
      // A claimed conflict is not a source-fixable queue item. Preserve a
      // visible owner blocker but release its repair labels so idle slots are
      // spent on work that CAN be fixed. A future changed HEAD can be requeued.
      await github.rest.issues.addLabels({owner,repo,issue_number:pr.number,labels:[MANUAL]});
      for(const name of [SOURCE,CONFLICT]){
        if(!pr.labels.some(l=>l.name===name))continue;
        try {await github.rest.issues.removeLabel({owner,repo,issue_number:pr.number,name});}
        catch(error){if(error.status!==404)log('Manual conflict queue cleanup #'+pr.number+' '+name+': '+error.message);}
      }
      log('MANUAL_CONFLICT #' + pr.number+' queued as owner action, auto-queue released');
      return {status:'manual_conflict',number:pr.number,sha:pr.head.sha};
    }
    writeOutputs(core,{strategy,pr_number:pr.number,sha:pr.head.sha,branch:pr.head.ref,
      files_json:JSON.stringify(files),task_key:receipt?.task_key||''});
    log('CLAIMED #' + pr.number + ' priority=' + priorityFor(pr,now).tier + ' owner=' + pr.user.login + ' SHA=' + pr.head.sha);
    return {status:'claimed',number:pr.number,sha:pr.head.sha,files,strategy};
  }
  return skip('NO_UNCLAIMED_OWNER_PR');
  } catch(error) {
    if (String(error.message).startsWith('HH_REPAIR_API_BUDGET_PAUSE:'))
      return skip('GITHUB_API_BUDGET_PAUSE');
    throw error;
  }
}
function validCandidate(candidate, sha) {
  return !!(candidate && candidate.head_sha === sha &&
    (!candidate.repair_kind || ['lint','codex','free_ai','budgeted_ai'].includes(candidate.repair_kind)) &&
    Array.isArray(candidate.files) &&
    candidate.files.length <= MAX_FILES && candidate.files.every(f=>
      f && typeof f.path === 'string' && PATH.test(f.path) &&
      SHA.test(f.original_sha || '') &&
      typeof f.base64 === 'string' && f.base64.length <= 200_000 &&
      /^[A-Za-z0-9+/]*={0,2}$/.test(f.base64)));
}
async function publish({github,core,context,prNumber,expectedSha,candidate,writer=null}) {
  const {owner,repo} = context.repo, fullRepo=owner+'/'+repo;
  if (fullRepo !== 'andylitvinov-design/books' || !Number.isSafeInteger(prNumber) || prNumber<1 ||
      !SHA.test(expectedSha || '') || !validCandidate(candidate,expectedSha))
    throw Error('HH_REPAIR_PUBLISH_INVALID_CANDIDATE');
  const pr=(await github.rest.pulls.get({owner,repo,pull_number:prNumber})).data;
  const legacy=legacyPrepEligible(pr,fullRepo);
  if (!eligible(pr,fullRepo) && !legacy)
    throw Error('HH_REPAIR_PUBLISH_STALE_OR_UNAUTHORIZED');
  // An owner edit may move the PR after the isolated patch was computed.
  // This is a safe cancellation, not a source failure or publish success.
  if (pr.head.sha !== expectedSha)
    throw Error('HH_REPAIR_PUBLISH_STALE_HEAD');
  const receipt=taskFor(pr,priorityFor(pr,Date.now()));
  const workerRunUrl=Number.isSafeInteger(context.runId)?
    'https://github.com/'+fullRepo+'/actions/runs/'+context.runId:null;
  const files = (await github.rest.pulls.listFiles({owner,repo,pull_number:prNumber,per_page:100,page:1})).data;
  const allowed = safeFiles(files);
  if (!allowed || candidate.files.some(f => !allowed.includes(f.path) ||
       (['free_ai','budgeted_ai'].includes(candidate.repair_kind) && !safeFreeSourcePath(f.path))) ||
      new Set(candidate.files.map(f=>f.path)).size !== candidate.files.length)
    throw Error('HH_REPAIR_PUBLISH_UNSAFE_PATH');
  const verified = [];
  for (const f of candidate.files) {
    const data = (await github.rest.repos.getContent({owner,repo,path:f.path,ref:expectedSha})).data;
    const content = Buffer.from(f.base64,'base64');
    if (data.type !== 'file' || data.sha !== f.original_sha ||
        content.length > 150_000 || content.includes(0) ||
        Buffer.from(content.toString('utf8'),'utf8').compare(content) !== 0)
      throw Error('HH_REPAIR_PUBLISH_BLOB_MISMATCH');
    verified.push({path:f.path,content:f.base64});
  }
  if (!verified.length) {
    try {
      await github.rest.issues.addLabels({owner,repo,issue_number:prNumber,labels:[MANUAL]});
    } catch(error) {
      if (![404,422].includes(error.status)) throw error;
      try {
        await github.rest.issues.createLabel({owner,repo,name:MANUAL,color:'d93f0b',
          description:'Repair Worker attempted; source fix needs owner or coding agent'});
      } catch(createError) {
        if(createError.status!==422)throw createError;
      }
      await github.rest.issues.addLabels({owner,repo,issue_number:prNumber,labels:[MANUAL]});
    }
    await github.rest.issues.createComment({owner,repo,issue_number:prNumber,body:
      'HH Repair Worker: no safe validated source change was produced '+
      'for HEAD ' + expectedSha + '. Owner action required: diagnose the failed Core/TypeScript build and '+
      'apply a tested source fix. No checks were bypassed.'+
      (receipt?'\n'+commentBody({...receipt,state:'MANUAL',
        outcome:'NO_VERIFIED_SOURCE_CHANGE',owner_run_id:String(context.runId||'unknown'),
        run_url:workerRunUrl}):'')});
    // An actionable source queue must not endlessly cycle once a verified
    // deterministic repair attempt concludes that human/AI coding is required.
    try {await github.rest.issues.removeLabel({owner,repo,issue_number:prNumber,name:SOURCE});}
    catch(error){if(error.status!==404)core.info('Manual source queue cleanup #'+prNumber+': '+error.message);}
    return {status:'manual_required',number:prNumber};
  }
  // Fix jobs run in isolation. Another Work/Codex writer can take this
  // PR after the initial claim; re-read ALL lease pages immediately before
  // source publication, for every repair lane, not just the legacy retry.
  // Incomplete or malformed ownership history never authorizes a write.
  let leasePages=0;
  const comments=await readCompleteIssueComments(github,owner,repo,prNumber,
    async (_n,request)=>{
      if(++leasePages>10)throw Error('HH_REPAIR_PUBLISH_LEASE_HISTORY_BUDGET');
      return request();
    });
  const writerLeaseFree=Array.isArray(comments) &&
    !activeSweepLease(comments,expectedSha,Date.now());
  if(!writerLeaseFree && !legacy)
    throw Error('HH_REPAIR_PUBLISH_OWNER_LEASE_CHANGED_OR_UNVERIFIED');
  if(legacy){
    // Original signed exact-run legacy authorization stays mandatory.
    const receipts=parseRecords((comments||[]).filter(trustedControlComment));
    if(!writerLeaseFree||!trustedLegacySourceRetry(pr,comments,files)||
       !receipts?.some(r=>r.lane==='legacy'&&r.state==='CLAIMED'&&
        r.head_sha===expectedSha&&r.owner_run_id===String(context.runId))||
       candidate.files.some(f=>!safeFreeSourcePath(f.path)))
      throw Error('HH_REPAIR_LEGACY_MANUAL_NOT_AUTHORIZED');
  }
  if (!writer) throw Error('HH_REPAIR_PUBLISH_OWNER_TOKEN_REQUIRED');
  const parent = (await github.rest.git.getCommit({owner,repo,commit_sha:expectedSha})).data;
  if (!SHA.test(parent.tree?.sha || '')) throw Error('HH_REPAIR_PUBLISH_MISSING_PARENT_TREE');
  const created = await writer.commit({owner,repo,branch:pr.head.ref,expectedSha,
    treeSha:parent.tree.sha,files:verified,number:prNumber});
  if (!SHA.test(created?.sha || '') || created.sha===expectedSha)
    throw Error('HH_REPAIR_PUBLISH_NOT_COMMITTED');
  // A writer API response is not a published PR SHA. Read the remote ref
  // back and prove the exact expected parent before emitting PUBLISHED.
  // The terminal finalizer independently checks the live PR HEAD again.
  const remote=(await github.rest.git.getRef({
    owner,repo,ref:'heads/'+pr.head.ref
  })).data;
  if(remote?.ref!=='refs/heads/'+pr.head.ref ||
     remote?.object?.sha!==created.sha)
    throw Error('HH_REPAIR_PUBLISH_REMOTE_REF_UNVERIFIED');
  const committed=(await github.rest.git.getCommit({
    owner,repo,commit_sha:created.sha
  })).data;
  if(!Array.isArray(committed?.parents)||committed.parents.length!==1||
     committed.parents[0]?.sha!==expectedSha)
    throw Error('HH_REPAIR_PUBLISH_PARENT_UNVERIFIED');
  const repairKind=candidate.repair_kind==='free_ai'?'free_ai':
     candidate.repair_kind==='budgeted_ai'?'budgeted_ai':
     candidate.repair_kind==='codex'?'codex':'lint';
  const publishedStage=Number.isSafeInteger(context.runId)&&receipt?.task_key?
    stageLine({stage:'source_published',pr_number:prNumber,head_sha:expectedSha,
      run_id:context.runId,task_key:receipt.task_key,source:'verified_git_ref',
      new_sha:created.sha,at:new Date().toISOString()}):'';
  await github.rest.issues.createComment({owner,repo,issue_number:prNumber,body:
    'HH Repair Worker: committed verified '+(repairKind==='free_ai'?'free-model source repair':repairKind==='budgeted_ai'?'budgeted Qwen source repair':repairKind==='codex'?'legacy source repair':'targeted ESLint autofix')+' ' + created.sha +
    ' for previous HEAD ' + expectedSha + '. Genuine PR synchronize should trigger Core CI; '+
    'AutoMerge is allowed only after exact-HEAD required checks pass.'+
    (receipt?'\n'+commentBody({...receipt,state:'PUBLISHED',
      outcome:'VERIFIED_SOURCE_COMMIT',repair_kind:repairKind,new_sha:created.sha,
      commit_url:'https://github.com/'+fullRepo+'/commit/'+created.sha,
      owner_run_id:String(context.runId||'unknown'),run_url:workerRunUrl}):'')+(publishedStage?'\n'+publishedStage:'')});
  try { await github.rest.issues.removeLabel({owner,repo,issue_number:prNumber,name:SOURCE}); }
  catch (e) { core.info('HH_REPAIR: fix pushed; queue label remains: '+e.message); }
  if(legacy){
    // Only a verified source patch on the NEW remote HEAD can retire a
    // worker-generated manual marker; remaining independent gates stay.
    const updated=(await github.rest.pulls.get({owner,repo,pull_number:prNumber})).data;
    if(updated?.head?.sha===created.sha&&updated.state==='open'&&
       updated.labels?.some(l=>l.name===MANUAL)){
      try{await github.rest.issues.removeLabel({
        owner,repo,issue_number:prNumber,name:MANUAL});
      }catch(e){core.info('HH_REPAIR: manual flag still held: '+e.message);}
    }
  }
  return {status:'committed',number:prNumber,sha:created.sha};
}
/**
 * A failed isolated fix job has never published source. Close the silent
 * CLAIMED gap: record a real terminal source-failure receipt and enqueue the
 * existing owner/Codex manual lane, but only for the same authenticated run
 * and unchanged source HEAD. This is NOT evidence of a completed fix.
 */
async function finalizeFailedFix({github,core,context,prNumber,expectedSha,now=Date.now()}){
 const {owner,repo}=context.repo, fullRepo=owner+'/'+repo;
 const skip=reason=>({status:'skipped',reason,source_published:false});
 if(fullRepo!=='andylitvinov-design/books' ||
   !Number.isSafeInteger(prNumber)||prNumber<1 ||
   !SHA.test(expectedSha||'')||!Number.isSafeInteger(context.runId))
  return skip('INVALID_FIX_FAILURE_CONTEXT');
 const pr=(await github.rest.pulls.get({owner,repo,pull_number:prNumber})).data;
 if(!eligible(pr,fullRepo) || pr.head?.sha!==expectedSha ||
    repairMode(pr)!=='lint')return skip('SOURCE_CHANGED_OR_NOT_ACTIONABLE');
 let reads=0,comments;
 try{
  comments=await readCompleteIssueComments(github,owner,repo,prNumber,async(_,fn)=>{
   if(++reads>MAX_READS)throw Error('FIX_FAILURE_HISTORY_BUDGET');
   return fn();
  });
 }catch(error){core?.info?.('HH_REPAIR_FAILURE_HISTORY '+error.message);return skip('OWNER_HISTORY_UNAVAILABLE');}
 if(!comments)return skip('OWNER_HISTORY_INCOMPLETE');
 const owned=comments.some(c=>{
  if(!trustedControlComment(c)||
     !String(c.body||'').includes('<!-- '+MARKER+' '+expectedSha+' -->'))return false;
  const records=parseRecords([c]);
  return records?.some(r=>r.head_sha===expectedSha &&
   r.pr_number===prNumber && r.owner_run_id===String(context.runId) &&
   r.state==='CLAIMED');
 });
 if(!owned)return skip('TRUSTED_EXACT_RUN_CLAIM_MISSING');
 if(externalOwnerLeaseStatus(comments,expectedSha,now)!=='FREE')
  return skip('OTHER_SOURCE_OWNER_LEASE');
 const existing=parseRecords(comments);
 if(!existing)return skip('MALFORMED_TASK_HISTORY');
 if(existing.some(r=>r.pr_number===prNumber && r.head_sha===expectedSha &&
    ['PUBLISHED','REPAIRED','DONE','MANUAL'].includes(r.state)))
  return skip('ALREADY_TERMINAL');
 const receipt=taskFor(pr,priorityFor(pr,now));
 if(!receipt)return skip('TASK_NO_LONGER_ACTIONABLE');
 try{
  await github.rest.issues.addLabels({owner,repo,issue_number:prNumber,labels:[MANUAL]});
 }catch(error){
  if(error.status!==422&&error.status!==404)throw error;
  try{
   await github.rest.issues.createLabel({owner,repo,name:MANUAL,color:'d93f0b',
    description:'Source repair failed; owner or coding agent must inspect'});
  }catch(createError){if(createError.status!==422)throw createError;}
  await github.rest.issues.addLabels({owner,repo,issue_number:prNumber,labels:[MANUAL]});
 }
 const runUrl='https://github.com/'+fullRepo+'/actions/runs/'+context.runId;
 await github.rest.issues.createComment({owner,repo,issue_number:prNumber,body:
  'HH Repair Worker: isolated source-fix job failed for exact HEAD '+expectedSha+
  '. No source commit was published. Inspect failing runner steps and apply a tested fix; '+
  'this task is now in the owner/Codex manual repair lane. Run: '+runUrl+
  '\n'+commentBody({...receipt,state:'MANUAL',outcome:'FIX_JOB_FAILED_NO_SOURCE_COMMIT',
   owner_run_id:String(context.runId),run_url:runUrl,source_published:false})});
 try{
  await github.rest.issues.removeLabel({owner,repo,issue_number:prNumber,name:SOURCE});
 }catch(error){if(error.status!==404)core?.info?.('HH_REPAIR_FAILURE_QUEUE_CLEANUP: '+error.message);}
 return {status:'manual_required',number:prNumber,sha:expectedSha,
  outcome:'FIX_JOB_FAILED_NO_SOURCE_COMMIT',source_published:false};
}
const SAFE_NO_CLAIM_REASONS=new Set([
 'NO_UNCLAIMED_OWNER_PR','INCOMPLETE_QUEUE','GITHUB_API_BUDGET_PAUSE','GITHUB_API_RESERVE'
]);
// Shallow Git checkouts cannot establish ancestry. Accept only bounded
// counts from the trusted legacy runner, never source/merge authorization.
function parseLegacySnapshotSummary(value){
  if(typeof value!=='string'||!/^[1-8](?:,[0-8]){5}$/.test(value))return null;
  const [paths,identical,divergent,onlyLegacy,onlyProduction,unknown]=
    value.split(',').map(Number);
  if(identical+divergent+onlyLegacy+onlyProduction+unknown!==paths)return null;
  return {schema:'HH_LEGACY_BLOB_COUNTS_V1',paths,
    counts:{identical,divergent,only_legacy:onlyLegacy,
      only_production:onlyProduction,unknown},
    ancestry_verified:false,source_write_authorized:false,merge_authorized:false};
}

// Machine-readable delivery outcome is not a second merge/repair authority.
// Green workflow / PREPARED cannot imply a published source commit.
function sourceDeliveryStatus({state,sourcePublished,codeAvailable}) {
  if(state==='PUBLISHED'&&sourcePublished===true)
    return {delivery_status:'SOURCE_PUBLISHED_CI_UNVERIFIED',
      next_action:'VERIFY_EXACT_HEAD_REQUIRED_CI'};
  if(state==='PREPARED')
    return {delivery_status:'READ_ONLY_PREFLIGHT_NO_SOURCE',
      next_action:'ASSIGN_SEMANTIC_SOURCE_REPAIR_AGENT'};
  if(state==='SUPERSEDED')
    return {delivery_status:'SUPERSEDED_NO_SOURCE',
      next_action:'REINSPECT_NEW_HEAD_AND_OWNER'};
  if(state==='VERIFY_REQUIRED')
    return {delivery_status:'SOURCE_COMMIT_UNVERIFIED',
      next_action:'VERIFY_SOURCE_COMMIT_AND_PR_HEAD'};
  if(state==='MANUAL'&&codeAvailable!==true)
    return {delivery_status:'NO_FREE_CODE_EXECUTOR_NO_SOURCE',
      next_action:'HANDOFF_EXISTING_SOURCE_OWNER'};
  if(state==='MANUAL')
    return {delivery_status:'SOURCE_CODING_MANUAL_NO_SOURCE',
      next_action:'HANDOFF_EXISTING_SOURCE_OWNER'};
  if(state==='REJECTED')
    return {delivery_status:'CLAIM_REJECTED_NO_SOURCE',
      next_action:'VERIFY_CLAIM_PERMISSION_AND_LEASE'};
  if(state==='NO_CLAIM_RETRYABLE')
    return {delivery_status:'CLAIM_RETRY_PENDING_NO_SOURCE',
      next_action:'WAIT_SIGNED_RESERVATION_RETRY'};
  return {delivery_status:'NO_VERIFIED_SOURCE_COMMIT',
    next_action:'DIAGNOSE_EXACT_HEAD_FAILED_STEP'};
}

// The free model job is untrusted. Preserve a fixed, bounded receipt only;
// never persist provider-controlled response keys, source text or reasoning.
function normalizedOpenRouterResponseShape(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||
   value.schema!=='HH_OPENROUTER_RESPONSE_SHAPE_V1')return null;
 const integer=key=>Number.isSafeInteger(value[key])&&value[key]>=0&&value[key]<=100;
 if(!['stop','length','max_tokens','max_output_tokens','content_filter','refusal',
   'tool_calls','function_call','error','other'].includes(value.finish_reason)||
   !['null','undefined','string','array','object','number','boolean'].includes(value.content_type)||
   !integer('choices_count')||!integer('content_parts')||!integer('text_parts')||
   value.text_parts>value.content_parts||
   (value.content_type!=='array'&&(value.content_parts!==0||value.text_parts!==0))||
   typeof value.reasoning_present!=='boolean'||
   typeof value.tool_calls_present!=='boolean')return null;
 return {schema:'HH_OPENROUTER_RESPONSE_SHAPE_V1',
   choices_count:value.choices_count,finish_reason:value.finish_reason,
   content_type:value.content_type,content_parts:value.content_parts,
   text_parts:value.text_parts,reasoning_present:value.reasoning_present,
   tool_calls_present:value.tool_calls_present};
}
function normalizeModelAudit(raw,{number,expectedSha,runId,runAttempt,taskKey}={}){
 let v=raw;if(typeof raw==='string'){if(raw.length>8000)return null;try{v=JSON.parse(raw);}catch{return null;}}
 if(!v||typeof v!=='object'||Array.isArray(v)||v.schema!=='HH_FREE_AI_MODEL_RUN_V1'||v.pr_number!==number||
 v.source_head!==expectedSha||v.executor_type!=='free_ci_patch_proposer'||!['openrouter','opencode'].includes(v.provider)||
 (Number.isSafeInteger(Number(runId))&&Number(runId)>0&&String(v.run_id)!==String(runId))||
 (Number.isSafeInteger(Number(runAttempt))&&Number(runAttempt)>0&&v.run_attempt!==Number(runAttempt))||
 !Number.isInteger(v.attempt_count)||v.attempt_count<0||v.attempt_count>1||typeof v.started_at!=='string'||
 !Number.isFinite(Date.parse(v.started_at))||typeof v.result!=='string'||!/^[A-Z0-9_]{3,60}$/.test(v.result))return null;
 const model=typeof v.model==='string'?v.model:null;
 if(model&&!(v.provider==='openrouter'?/^[A-Za-z0-9][A-Za-z0-9_.-]*\/[A-Za-z0-9][A-Za-z0-9_.-]*:free$/.test(model):
 /^opencode\/[A-Za-z0-9][A-Za-z0-9_.-]*-free$/.test(model)))return null;
 if(v.attempt_count===1&&(!model||typeof v.model_call_started_at!=='string'||!Number.isFinite(Date.parse(v.model_call_started_at))))return null;
 // Untrusted free-model job metadata is audit-only, never publication authority.
 // A forged, cross-task or partial prompt receipt is excluded fail-closed.
 const prompt=v.prompt_receipt;
 const delivery=v.prompt_delivery_status;
 if(prompt!=null){
  if(!prompt||prompt.schema!=='HH_PR_PROMPT_RECEIPT_V1'||
     !/^[a-f0-9]{32}$/i.test(prompt.prompt_id||'')||
     !/^[a-f0-9]{32}$/i.test(prompt.task_key||'')||
     prompt.task_key!==taskKey||
     prompt.template_version!=='HH_PR_FREE_REPAIR_PROMPT_V1'||
     prompt.ruleset_version!==require('./ci-pr-error-rules.v1.json').version||
     !/^[a-f0-9]{64}$/i.test(prompt.context_hash||'')||
     !/^[a-f0-9]{64}$/i.test(prompt.prompt_sha256||'')||
     typeof v.prompt_prepared_at!=='string'||
     !Number.isFinite(Date.parse(v.prompt_prepared_at))||
     !['PREPARED','ATTEMPTED_UNCONFIRMED','RESPONSE_OBSERVED'].includes(delivery)||
     (delivery!=='PREPARED'&&v.attempt_count!==1)||
     (delivery==='RESPONSE_OBSERVED'&&
       (!v.response_received_at||!Number.isFinite(Date.parse(v.response_received_at))))||
     (delivery==='PREPARED'&&v.attempt_count!==0))return null;
 }else if(delivery&&delivery!=='NOT_PREPARED')return null;
 const failure=typeof v.failure_reason==='string'&&/^FREE_AI_[A-Z0-9_:-]{4,120}$/.test(v.failure_reason)?v.failure_reason:null;
 return {schema:v.schema,provider:v.provider,model,model_version:typeof v.model_version==='string'?v.model_version.slice(0,120):null,
 catalog_model_created:Number.isSafeInteger(v.catalog_model_created)?v.catalog_model_created:null,executor_type:v.executor_type,
 pr_number:number,source_head:expectedSha,run_id:/^[0-9]{1,24}$/.test(String(v.run_id||''))?String(v.run_id):null,
 run_attempt:Number.isInteger(v.run_attempt)&&v.run_attempt>0?v.run_attempt:null,started_at:v.started_at,
 model_call_started_at:v.model_call_started_at||null,response_received_at:v.response_received_at||null,
 attempt_count:v.attempt_count,result:v.result,failure_reason:failure,patch_present:v.patch_present===true,
 candidate_paths:Array.isArray(v.candidate_paths)?v.candidate_paths.slice(0,8):[],
 verification_result:typeof v.verification_result==='string'?v.verification_result.slice(0,80):'NOT_REPORTED',
 prompt_receipt:prompt?{schema:prompt.schema,prompt_id:prompt.prompt_id,
   task_key:prompt.task_key,template_version:prompt.template_version,
   ruleset_version:prompt.ruleset_version,context_hash:prompt.context_hash,
   prompt_sha256:prompt.prompt_sha256}:null,
 prompt_prepared_at:prompt?v.prompt_prepared_at:null,
 prompt_delivery_status:prompt?delivery:'NOT_RECORDED',
 response_shape:v.provider==='openrouter'?
   normalizedOpenRouterResponseShape(v.response_shape):null};
}

async function finalize({github,core,context,number=0,expectedSha='',taskKey='',
  claimStatus='',claimReason='',claimResult='',fixResult='',strategy='lint',
  codeAvailable=false,codeResult='',codeStatus='',codeDetail='',
  codeVerifyResult='',codeVerifyStatus='',codeVerifyDetail='',publishResult='',
  publishStatus='',publishSha='',candidateStatus='',candidateDetail='',
  candidateSnapshot='',modelAuditRaw='',modelAuditRunAttempt=0,paidStatus='',dryRun=false}) {
  const {owner,repo}=context.repo || {},fullRepo=owner+'/'+repo;
  const skip=reason=>{core.info('HH_REPAIR_OUTCOME SKIP '+reason);return {status:'skipped',reason};};
  if(dryRun || fullRepo!=='andylitvinov-design/books')return skip('AUDIT_OR_FOREIGN_REPO');
  if(!Number.isSafeInteger(number)||number<1||!SHA.test(expectedSha)||
     !/^[a-f0-9]{32}$/i.test(taskKey))return skip('NO_VALID_ADDRESSED_TASK');
  const pr=(await github.rest.pulls.get({owner,repo,pull_number:number})).data;
  if(pr?.user?.login!==owner || pr?.head?.repo?.full_name!==fullRepo)
    return skip('PR_OWNER_NOT_VERIFIED');
  const sameHead=pr.head.sha===expectedSha;
  let state='FAILED',reason='NO_SOURCE_COMMIT',sourcePublished=false,newSha=null;
  if(publishStatus==='committed'){
    if(!SHA.test(publishSha)){
      reason='PUBLISH_REPORTED_INVALID_COMMIT_SHA';
    }else{
      const commit=(await github.rest.git.getCommit({owner,repo,commit_sha:publishSha})).data;
      const parentVerified=Array.isArray(commit?.parents)&&
        commit.parents.some(p=>p.sha===expectedSha);
      newSha=publishSha;
      if(!parentVerified)reason='PUBLISHED_COMMIT_PARENT_UNVERIFIED';
      else if(pr.head.sha!==publishSha){
        state='VERIFY_REQUIRED';reason='SOURCE_COMMIT_EXISTS_BUT_HEAD_MOVED';
      }else{
        state='PUBLISHED';reason='SOURCE_COMMIT_VERIFIED_ON_PR_HEAD';sourcePublished=true;
      }
    }
  }else if(!sameHead){
    state='SUPERSEDED';reason='SOURCE_HEAD_MOVED_BEFORE_PUBLISH';
  }else if(claimStatus==='manual_conflict'){
    state='MANUAL';reason='CONFLICT_REQUIRES_SOURCE_RESOLUTION';
  }else if(claimResult!=='success'){
    state='FAILED';reason='CLAIM_JOB_'+String(claimResult||'UNKNOWN').toUpperCase();
  }else if(claimStatus!=='claimed'){
    state='REJECTED';reason=String(claimReason||'CLAIM_REFUSED').replace(/[^A-Z0-9_]/gi,'_').slice(0,100);
   }else if(strategy==='legacy'&&fixResult==='success'&&candidateStatus==='prepared'){
    state='PREPARED';reason='LEGACY_CLOUD_PREFLIGHT_NO_SOURCE_WRITE';
  }else if(strategy==='legacy'){
    state='FAILED';reason='LEGACY_PREFLIGHT_INCOMPLETE';
  }else if((strategy==='lint'||strategy==='code')&&fixResult!=='success'){
    state=strategy==='code'?'MANUAL':'FAILED';
    reason=(strategy==='code'?'DETERMINISTIC_REPAIR_JOB_':'FIX_JOB_')+
      String(fixResult||'UNKNOWN').toUpperCase();
  }else if((strategy==='lint'||strategy==='code')&&
    candidateStatus==='ready'&&codeVerifyStatus==='ready'&&
    codeVerifyResult==='success'&&publishResult==='failure'){
    // A verified deterministic patch exists; the source publisher failed.
    // A skipped optional free-model step is NOT the causal failure.
    state='FAILED';reason='SOURCE_PUBLISH_JOB_FAILURE';
  }else if(strategy==='code'&&paidStatus==='blocked'&&!codeAvailable){
    state='MANUAL';reason='BUDGETED_AI_NOT_AVAILABLE_OR_POLICY_BLOCKED';
  }else if(strategy==='code'&&paidStatus==='proposed'&&
    codeVerifyStatus!=='ready'){
    state='MANUAL';reason='BUDGETED_AI_CANDIDATE_NOT_VERIFIED';
  }else if(strategy==='code'&&paidStatus==='proposed'&&
    codeVerifyStatus==='ready'){
    state='FAILED';reason='BUDGETED_AI_VERIFIED_BUT_NOT_PUBLISHED';
  }else if(strategy==='code'&&!codeAvailable){
    state='MANUAL';reason='FREE_AI_EXECUTOR_NOT_CONFIGURED';
  }else if(strategy==='code'&&codeResult==='skipped'){
    reason='FREE_AI_JOB_NOT_STARTED_NO_SOURCE_COMMIT';
  }else if((strategy==='code'||candidateStatus==='manual_required')&&codeVerifyStatus==='ready'){
    // A tested free-model candidate existed, but no source commit was proven.
    reason='FREE_AI_VERIFIED_BUT_NOT_PUBLISHED_'+String(publishResult||'UNKNOWN').toUpperCase();
  }else if((strategy==='code'||candidateStatus==='manual_required')&&codeAvailable&&codeResult==='failure'){
    reason='FREE_AI_JOB_FAILED_NO_SOURCE_COMMIT';
  }else if((strategy==='code'||candidateStatus==='manual_required')&&codeAvailable&&codeStatus==='proposed'&&
      codeVerifyResult!=='success'){
    reason='FREE_AI_VERIFIER_JOB_FAILED_NO_SOURCE_COMMIT';
  }else if(publishStatus==='manual_required' || candidateStatus==='manual_required' || strategy==='code'){
    state='MANUAL';
    reason=!codeAvailable?'FREE_AI_EXECUTOR_NOT_CONFIGURED':
      codeVerifyStatus==='manual_required'?'FREE_AI_CANDIDATE_REJECTED':
      'FREE_AI_NO_VERIFIED_SOURCE_CHANGE';
  }else if(publishResult!=='success'){
    reason='PUBLISH_JOB_'+String(publishResult||'UNKNOWN').toUpperCase();
  }else{
    reason='PUBLISH_RETURNED_NO_VERIFIED_SOURCE_COMMIT';
  }
  const runId=String(context.runId||'unknown');
  const marker='<!-- HH_PR_REPAIR_OUTCOME_V1 '+expectedSha+' '+runId+' -->';
  let reads=0;
  const comments=await readCompleteIssueComments(github,owner,repo,number,async(label,fn)=>{
    if(++reads>36)throw Error('HH_REPAIR_OUTCOME_HISTORY_BUDGET_EXCEEDED');
    return fn();
  });
  if(!comments)throw Error('HH_REPAIR_OUTCOME_HISTORY_UNVERIFIED');
  if(comments.some(c=>String(c.body||'').includes(marker)&&trustedControlComment(c)))
    return {status:'already_finalized',number,expected_sha:expectedSha};
  // An addressed worker that refused BEFORE claiming may be retried without
  // touching source, but only after proving the exact dispatcher reservation.
  let retryAfter=null,reservationRunId=null;
  const suppliedRun=String(context.payload?.inputs?.reservation_run_id||'');
  if(sameHead&&claimResult==='success'&&claimStatus==='skipped'&&
     fixResult==='skipped'&&publishResult==='skipped'&&!publishStatus&&
     SAFE_NO_CLAIM_REASONS.has(claimReason)&&/^\d+$/.test(suppliedRun)){
    const signed=comments.filter(trustedControlComment);
    const records=signed.flatMap(comment=>parseRecords([comment])||[]);
    const reserved=records.some(x=>x.task_key===taskKey&&x.head_sha===expectedSha&&
      x.pr_number===number&&x.state==='RESERVED'&&x.owner_run_id===suppliedRun);
    const claimed=comments.some(c=>String(c.body||'').includes(
      '<!-- '+MARKER+' '+expectedSha+' -->'));
    const prior=records.filter(x=>x.task_key===taskKey&&x.head_sha===expectedSha&&
      x.state==='NO_CLAIM_RETRYABLE').length;
    if(reserved&&!claimed&&prior<2){
      state='NO_CLAIM_RETRYABLE';
      retryAfter=new Date(Date.now()+15*60_000).toISOString();
      reservationRunId=suppliedRun;
    }else if(reserved&&prior>=2){
      state='REJECTED';reason='NO_CLAIM_RETRY_BUDGET_EXHAUSTED';
    }else core.warning('HH_REPAIR_RETRY_PROOF_MISSING '+
      (claimed?'SOURCE_CLAIM_PRESENT':'RESERVATION_NOT_VERIFIED'));
  }
  let failedStep=null,repairStartedAt=null,patchVerifiedAt=null;
  // Proof is the actual fix-step start time from this trusted workflow run,
  // not dispatcher reservation, task claim, or later finalizer execution.
  if(Number.isSafeInteger(context.runId)&&
     (['FAILED','REJECTED'].includes(state)||claimStatus==='claimed')){
    try{
      const jobs=(await github.rest.actions.listJobsForWorkflowRun({
        owner,repo,run_id:Number(context.runId),per_page:100})).data?.jobs||[];
      if(['FAILED','REJECTED'].includes(state)){
        // Prefer the failed isolated code job to a later failing publisher:
        // publisher failure is an expected consequence, not the causal defect.
        const failed=(strategy==='code'&&codeResult==='failure'?
          jobs.find(j=>j.name==='code_fix'&&j.conclusion==='failure'):null)||
          jobs.find(j=>j.conclusion==='failure');
        failedStep=failed?.steps?.find(x=>x.conclusion==='failure')?.name||
          failed?.name||null;
      }
      if(claimStatus==='claimed'){
        const runAttempt=Number(process.env.GITHUB_RUN_ATTEMPT||'0');
        const fix=Number.isSafeInteger(runAttempt)&&runAttempt>0?jobs.find(j=>
          j.name==='fix'&&j.run_attempt===runAttempt&&Array.isArray(j.steps)):null;
        const step=fix?.steps.find(x=>
          (x.name==='Apply trusted TypeScript type-only import codemods'||
           x.name==='Try targeted ESLint autofix and write bounded patch candidate')&&
          typeof x.started_at==='string'&&Number.isFinite(Date.parse(x.started_at)));
        if(step&&Date.parse(step.started_at)<=Date.now()+60000)
          repairStartedAt=new Date(step.started_at).toISOString();
      // The already-fetched job page provides completion of successful fix
      // verification. A worker claim or an AI proposal is not a ready patch.
      // Attempts must match the current GitHub workflow execution exactly.
      if(claimStatus==='claimed'){
        const branch=candidateStatus==='ready'&&fixResult==='success'?'fix':
          codeVerifyStatus==='ready'&&codeVerifyResult==='success'?'code_verify':null;
        const phaseName=branch==='fix'?'Try targeted ESLint autofix and write bounded patch candidate':
          'Independently verify exact SHA, direct tests, lint, TS and diff';
        const verifiedJob=branch&&Number.isSafeInteger(runAttempt)&&runAttempt>0?jobs.find(j=>
          j.name===branch&&j.run_attempt===runAttempt&&j.conclusion==='success'&&Array.isArray(j.steps)):null;
        const verificationStep=verifiedJob?.steps.find(s=>s.name===phaseName&&
          s.conclusion==='success'&&typeof s.completed_at==='string'&&
          typeof s.started_at==='string'&&Date.parse(s.started_at)<=Date.parse(s.completed_at));
        const finished=Date.parse(verificationStep?.completed_at||'');
        if(Number.isFinite(finished)&&
           (!repairStartedAt||finished>=Date.parse(repairStartedAt))&&
           finished<=Date.now()+60000)
          patchVerifiedAt=new Date(finished).toISOString();
      }
      }
    }catch(error){core.info('HH_REPAIR_OUTCOME_JOB_DIAGNOSTICS_UNAVAILABLE '+error.message);}
  }
  // This diagnostic never implies a source write; the existing reason_code
  // stays backward-compatible with Monitor and Repair Observer consumers.
  const validCandidateDetails=new Set(['NO_AUTOFIXABLE_ESLINT_CHANGE',
    'ESLINT_SCOPE_NOT_CONFIGURED','ESLINT_REMAINING_ERRORS',
    'UNSAFE_SCOPED_DIFF','SCOPED_TESTS_NOT_GREEN','VERIFIED_SOURCE_PATCH']);
  const agentDetail=[codeVerifyDetail,codeDetail].find(x=>typeof x==='string' &&
    /^(?:CODEX_|FREE_AI_)/.test(x) && /^[A-Z0-9_:.-]{5,120}$/.test(x));
  const allowedLegacyDetails=new Set([
    'GIT_TREE_CONFLICT','GIT_TREE_MERGES_WITHOUT_CONFLICT',
    'SHALLOW_ANCESTRY_UNAVAILABLE','PRODUCTION_FETCH_UNAVAILABLE',
    'MERGE_TREE_NOT_VERIFIED'
  ]);
  // Exact trusted workflow step failed before any model inference.
  // A previous deterministic lint result must not replace its true cause
  // with NO_AUTOFIXABLE_ESLINT_CHANGE or suggest an AI-provider problem.
  const unsafeScopeFailure=state==='FAILED'&&strategy==='code'&&
    codeResult==='failure'&&
    failedStep==='Fail early on unsupported or sensitive free-model source scope';
  const detailCode=unsafeScopeFailure?'FREE_AI_UNSAFE_SOURCE_SCOPE':
    state==='PREPARED'&&strategy==='legacy'?
      (allowedLegacyDetails.has(candidateDetail)?candidateDetail:'PREFLIGHT_DETAIL_UNVERIFIED'):
    state==='MANUAL'||state==='FAILED'?
      agentDetail||(validCandidateDetails.has(candidateDetail)?candidateDetail:null):null;
  const delivery=sourceDeliveryStatus({state,sourcePublished,
    codeAvailable:codeAvailable||paidStatus==='proposed'});
  const modelAudit=normalizeModelAudit(modelAuditRaw,{number,expectedSha,
    runId:context.runId,runAttempt:modelAuditRunAttempt,taskKey});
  const modelRun=modelAudit?{...modelAudit,patch_present:codeStatus==='proposed'||modelAudit.patch_present,
   verification_result:codeVerifyStatus==='ready'&&codeVerifyResult==='success'?'PASSED':
    codeVerifyStatus==='manual_required'?'REJECTED':codeVerifyStatus||'NOT_RUN',
   published_commit_sha:sourcePublished?newSha:null}:null;
  const claimedLegacy=comments.some(c=>trustedControlComment(c)&&
    parseRecords([c])?.some(r=>r.lane==='legacy'&&r.state==='CLAIMED'&&
      r.task_key===taskKey&&r.pr_number===number&&r.head_sha===expectedSha&&
      r.owner_run_id===runId));
  const result={schema:'HH_PR_TASK_V1',task_key:taskKey,pr_number:number,
    ...delivery,verified_source_fix:state==='PUBLISHED'&&sourcePublished===true,
    head_sha:expectedSha,lane:claimedLegacy||strategy==='legacy'?'legacy':'repair',
    promoted_from_legacy:claimedLegacy&&strategy==='code',
    state,reason_code:reason,strategy,
    source_published:sourcePublished,new_sha:newSha,failed_step:failedStep,
    detail_code:detailCode,
    legacy_snapshot_summary:state==='PREPARED'&&strategy==='legacy'&&
      detailCode==='SHALLOW_ANCESTRY_UNAVAILABLE'?
      parseLegacySnapshotSummary(candidateSnapshot):null,
    repair_kind:publishStatus==='committed'&&candidateStatus!=='ready'?
      (paidStatus==='proposed'?'budgeted_ai':'free_ai'):
      publishStatus==='committed'?'lint':null,
    code_agent_configured:codeAvailable||paidStatus==='proposed',
    code_provider:modelRun?.provider||(paidStatus==='proposed'?'openrouter_budgeted':null),
    code_model:modelRun?.model||(paidStatus==='proposed'?'qwen/qwen3-coder-next':null),
    code_model_version:modelRun?.model_version||null,
    model_run:modelRun,code_job_result:codeResult||'skipped',
    code_candidate_status:paidStatus==='proposed'?'proposed':codeStatus||'skipped',
    code_verify_result:codeVerifyResult||'skipped',
    code_verify_status:codeVerifyStatus||'skipped',
    claim_status:claimStatus||'unknown',claim_result:claimResult||'unknown',
    reservation_run_id:reservationRunId,retry_after:retryAfter,
    created_at:new Date().toISOString(),fix_result:fixResult||'unknown',
    publish_result:publishResult||'unknown',publish_status:publishStatus||'unknown',
    owner_run_id:runId,run_url:'https://github.com/'+fullRepo+'/actions/runs/'+runId};
  if(Number.isSafeInteger(context.runId)&&context.runId>0){
  result.outcome=buildTaskOutcome({task_key:taskKey,pr_number:number,
    head_sha:expectedSha,new_sha:newSha,state,reason_code:reason,
    source_published:sourcePublished,head_matches:state==='PUBLISHED'&&pr.head?.sha===newSha,
    claim_status:claimStatus,retry_after:retryAfter,owner_run_id:runId,
    now:result.created_at});
  }

  // A failed Worker forms a secondary strategy/task in this SAME signed
  // finalizer receipt. It cannot rerun an unchanged HEAD or authorize a write.
  if((['FAILED','MANUAL','REJECTED','VERIFY_REQUIRED'].includes(state)||
      (state==='PREPARED'&&strategy==='legacy'&&sameHead&&claimStatus==='claimed'))&&
     Number.isSafeInteger(context.runId)&&context.runId>0){
    try{
      result.follow_up_task=makeWorkerFollowUp({
        pr_number:number,head_sha:expectedSha,task_key:taskKey,
        owner_run_id:runId,state:state==='PREPARED'?'MANUAL':state,
        reason_code:state==='PREPARED'?'LEGACY_SEMANTIC_REVIEW_REQUIRED':reason,
        detail_code:/^[A-Z0-9_]{3,120}$/.test(detailCode||'')?detailCode:null,
        now:Date.parse(result.created_at)});
    }catch(error){
      core.warning('HH_REPAIR_FOLLOWUP_TASK_UNAVAILABLE '+
        String(error.message||error).slice(0,90));
    }
  }
  // A legacy preflight is a diagnostic, not an executor ACK. Persist the
  // next semantic repair task in this SAME authenticated outcome comment.
  // The :10 router and :40 developer reconcile it via the existing #1419
  // incident ledger; none of these fields assert a model call or code write.
  if(state==='PREPARED'&&strategy==='legacy'&&sameHead&&
     claimStatus==='claimed'){
    const next=result.follow_up_task;
    if(!next||next.event_kind!=='REPAIR_WORKER_FAILED'||
       next.parent_task_key!==taskKey||next.head_sha!==expectedSha||
       next.pr_number!==number||next.delivery_status!=='CREATED_NOT_EXECUTED')
      throw Error('HH_LEGACY_SEMANTIC_QUEUE_RECEIPT_MISSING');
    result.semantic_queue={
      schema:'HH_SEMANTIC_REPAIR_QUEUE_V1',task_id:next.task_id,
      parent_task_key:taskKey,pr_number:number,head_sha:expectedSha,
      source_worker_run_id:String(runId),state:'QUEUED_NOT_ACCEPTED',
      assigned_executor_id:null,executor_accepted_at:null,
      model_call_started_at:null,patch_verified_at:null,
      source_published:false,new_sha:null,
      responsible_role:next.responsible_role,
      reason_code:next.reason_code,next_action:next.next_action,
      created_at:result.created_at,next_check_at:next.next_check_at,
      lease_required:true,source_write_authorized:false
    };
  }
  // Learning is strictly advisory: only the already verified remote source
  // commit earns a case. The SAME existing finalizer comment carries it.
  // No additional GitHub write, provider call, CI run or source permission.
  try {
    const {buildPublishedCase}=require('./ci-pr-repair-learning.cjs');
    const observed=buildPublishedCase(result);
    if(observed)result.learning_case=observed;
  }catch(error){
    core?.warning?.('HH_REPAIR_LEARNING_UNAVAILABLE '+
      String(error?.message||'unknown').slice(0,80));
  }
  const repairStage=repairStartedAt&&claimStatus==='claimed'?
    stageLine({stage:'repair_started',pr_number:number,head_sha:expectedSha,
      run_id:context.runId,task_key:taskKey,at:repairStartedAt,
      source:'github_actions_fix_step'}):'';
  const verifiedPatchStage=patchVerifiedAt&&claimStatus==='claimed'&&
    Number.isSafeInteger(context.runId)&&context.runId>0?
    stageLine({stage:'patch_verified',pr_number:number,head_sha:expectedSha,
      run_id:context.runId,task_key:taskKey,at:patchVerifiedAt,
      source:'github_actions_patch_verification_step'}):'';
  await github.rest.issues.createComment({owner,repo,issue_number:number,
    body:marker+'\n'+commentBody(result)+(repairStage?'\n'+repairStage:'')+
      (verifiedPatchStage?'\n'+verifiedPatchStage:'')});
  // No destructive operation, source overwrite, force push or CI bypass.
  // An attempted failed source fix needs a coding agent; retire its queue
  // label only when the original HEAD is still current and owner-verified.
  if((state==='FAILED'||(state==='MANUAL'&&
      (candidateStatus==='manual_required'||strategy==='code')&&publishResult==='skipped'))&&
      claimStatus==='claimed'&&sameHead){
    // Only the authenticated exact-run CLAIMED receipt may elevate the
    // same source HEAD to manual coding. A copied/foreign receipt cannot.
    const claimedBySameRun=comments.some(comment=>
      trustedControlComment(comment)&&
      String(comment.body||'').includes('<!-- '+MARKER+' '+expectedSha+' -->')&&
      parseRecords([comment])?.some(record=>record.state==='CLAIMED'&&
        record.owner_run_id===runId&&record.head_sha===expectedSha&&
        record.pr_number===number&&record.task_key===taskKey));
    const leaseFree=externalOwnerLeaseStatus(comments,expectedSha,Date.now())==='FREE';
    if(!claimedBySameRun||!leaseFree){
      core.warning('HH_REPAIR_OUTCOME_MANUAL_QUEUE_NOT_VERIFIED '+(claimedBySameRun?'OWNER_LEASE_ACTIVE':'CLAIM_PROOF_MISSING'));
    }else{
    const fresh=(await github.rest.pulls.get({owner,repo,pull_number:number})).data;
    if(fresh?.head?.sha===expectedSha&&fresh?.state==='open'&&
       fresh.labels?.some(l=>l.name===SOURCE)){
      await github.rest.issues.addLabels({owner,repo,issue_number:number,labels:[MANUAL]});
      try{await github.rest.issues.removeLabel({owner,repo,issue_number:number,name:SOURCE});}
      catch(error){if(error.status!==404)core.warning('HH_REPAIR_OUTCOME_LABEL_RELEASE '+error.message);}
    }
    }
  }
  core.info('HH_REPAIR_OUTCOME '+JSON.stringify(result));
  // A zero-error read-only preparation must NOT look like a completed repair
  // to Workflow/Optimizer consumers; the existing job itself remains green.
  if(result.verified_source_fix!==true)
    core.warning('HH_REPAIR_NOT_PUBLISHED '+result.delivery_status+
      ' reason='+reason+' next='+result.next_action);
  await core.summary.addHeading('HH Repair Worker — verified final outcome')
    .addCodeBlock(JSON.stringify(result,null,2)).write();
  return result;
}

module.exports={claim,publish,finalize,sourceDeliveryStatus,finalizeFailedFix,prioritizedRepairCandidates,currentRepairHead,eligible,legacyPrepEligible,trustedLegacySourceRetry,validBranch,safeFiles,validCandidate,activeSweepLease,repairMode,hasVerifiedSourceHandoff,verifiedCoreCodeFailure,claimedRepairMissingSourceProof,parseLegacySnapshotSummary,normalizeModelAudit,PROD,SOURCE,CONFLICT,MARKER};
