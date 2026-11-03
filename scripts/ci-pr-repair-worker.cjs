'use strict';

/* Trusted default-branch PR Repair Worker. Never execute PR code with a write token. */
const PROD = 'codex/public-book-library';
const DEFAULT = 'codex/bootstrap-books';
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
const {taskFor,commentBody,readCompleteIssueComments,externalOwnerLeaseStatus,parseRecords,trustedControlComment,reservationStatus}=require('./ci-pr-task-state.cjs');

function validBranch(ref) {
  return typeof ref === 'string' && ref.length <= 160 &&
    /^[A-Za-z0-9][\w./-]*$/.test(ref) && !ref.includes('..') &&
    !ref.includes('//') && !ref.includes('@{') && !ref.endsWith('/') &&
    ref !== PROD && ref !== DEFAULT;
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
  // The marker is public text and can be copied into an issue comment.
  // Only the GitHub Actions app identity can establish this handoff.
  return Array.isArray(comments) && comments.some(c=>
    c?.user?.id===41898282 && c.user.login==='github-actions[bot]' &&
    c.user.type==='Bot' && c.performed_via_github_app?.id===15368 &&
    c.performed_via_github_app.slug==='github-actions' &&
    typeof c.body==='string' && c.body.includes(receipt));
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
   ['core-lint-types-build','hh-core-verified'].includes(name.trim().replace(/\.$/,'')));
 });
}
function safeFiles(items) {
  return Array.isArray(items) && items.length < 100 &&
    items.filter(f => ['added','modified'].includes(f.status) &&
      PATH.test(f.filename) && !f.filename.startsWith('tests/') &&
      !f.filename.startsWith('.github/') &&
      !f.filename.includes('/__tests__/')).slice(0, MAX_FILES).map(f => f.filename);
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

async function claim({github,core,context,number=0,expectedSha='',taskKey='',reservationRunId='',dryRun=false,hasToken=false,now=Date.now()}) {
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
  if (!dryRun && !hasToken) return skip('HH_AUTOMERGE_TOKEN_MISSING');
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
    if (!eligible(pr,fullRepo) ||
        (expectedSha && item.number===number && pr.head.sha !== expectedSha)) continue;
    const task=taskFor(pr,priorityFor(pr,now));
    if(!task || (taskKey&&task.task_key!==taskKey)){
      log('REFUSE_STALE_OR_FOREIGN_TASK #'+pr.number);continue;
    }
    // If the branch is a parent of another open PR, never modify its history.
    const children = (await limited('stacked-children',()=>github.rest.pulls.list({owner,repo,state:'open',base:pr.head.ref,per_page:1}))).data;
    if (!Array.isArray(children) || children.length) continue;
    // Incomplete history cannot prove ownership. Bounded pagination avoids
    // indefinitely blocking mature PRs as they pass 100 issue comments.
    const comments = await readCompleteIssueComments(github,owner,repo,pr.number,limited);
    if(!comments)continue;
    const marker='<!-- '+MARKER+' '+pr.head.sha+' -->';
    if(comments.some(c=>(c.body||'').includes(marker)))continue;
    if(taskKey){
      // Exact signed reservation from the trusted single writer is mandatory.
      // A stale, foreign, unsigned or superseded reservation never claims.
      const signed=parseRecords(comments.filter(trustedControlComment));
      const relevant=signed?.filter(r=>r.task_key===taskKey&&
        r.head_sha===expectedSha&&r.pr_number===number);
      const latest=relevant?.at(-1);
      if(!latest||latest.state!=='RESERVED'||latest.lane!=='repair'||
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
    const mode=repairMode(pr);
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
    if(!conflict && !hasVerifiedSourceHandoff(comments,pr.head.sha)){
      log('SKIP_SOURCE_WITHOUT_EXACT_HEAD_REPAIR_RECEIPT #' + pr.number);
      continue;
    }
    let files = [];
    if (!conflict) {
      const response = (await limited('changed-files',()=>github.rest.pulls.listFiles({owner,repo,pull_number:pr.number,per_page:100,page:1}))).data;
      files = safeFiles(response);
      if (!files || files.length === 0) continue;
    }
    if (remaining !== null && remaining < RATE_RESERVE) return skip('GITHUB_API_RESERVE');
    if (dryRun) {
      log('WOULD_CLAIM #' + pr.number + ' owner=' + pr.user.login + ' SHA=' + pr.head.sha);
      return {status:'dry_run',number:pr.number,sha:pr.head.sha,files};
    }
    const strategy=!conflict&&verifiedCoreCodeFailure(comments,pr.head.sha)?'code':'lint';
    // Persist the addressed task acknowledgement on the exact source HEAD.
    // CLAIMED is evidence of ownership, never evidence of a published fix.
    const receipt=task;
    const workerRunUrl=Number.isSafeInteger(context.runId)?
      'https://github.com/'+fullRepo+'/actions/runs/'+context.runId:null;
    const claimedReceipt=receipt?commentBody({...receipt,state:'CLAIMED',
      owner_run_id:String(context.runId||'unknown'),run_url:workerRunUrl,
      outcome:'CLAIM_ONLY_NO_SOURCE_WRITE'}):'';
    await github.rest.issues.createComment({owner,repo,issue_number:pr.number,body:
      marker + '\n**HH Repair Worker claimed this HEAD.**\n' +
      'Owner: @' + pr.user.login + '; strategy: ' + (conflict?'conflict/manual':strategy==='code'?'verified Core/TypeScript code repair':'targeted ESLint autofix') +
      '. The worker does not bypass checks or overwrite another source branch.' +
      (claimedReceipt?'\n'+claimedReceipt:'')});
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
    (!candidate.repair_kind || ['lint','codex'].includes(candidate.repair_kind)) &&
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
  if (!eligible(pr,fullRepo))
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
  if (!allowed || candidate.files.some(f => !allowed.includes(f.path)) ||
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
  if (!writer) throw Error('HH_REPAIR_PUBLISH_OWNER_TOKEN_REQUIRED');
  const parent = (await github.rest.git.getCommit({owner,repo,commit_sha:expectedSha})).data;
  if (!SHA.test(parent.tree?.sha || '')) throw Error('HH_REPAIR_PUBLISH_MISSING_PARENT_TREE');
  const created = await writer.commit({owner,repo,branch:pr.head.ref,expectedSha,
    treeSha:parent.tree.sha,files:verified,number:prNumber});
  if (!SHA.test(created?.sha || '') || created.sha===expectedSha)
    throw Error('HH_REPAIR_PUBLISH_NOT_COMMITTED');
  const repairKind=candidate.repair_kind==='codex'?'codex':'lint';
  await github.rest.issues.createComment({owner,repo,issue_number:prNumber,body:
    'HH Repair Worker: committed verified '+(repairKind==='codex'?'Codex source repair':'targeted ESLint autofix')+' ' + created.sha +
    ' for previous HEAD ' + expectedSha + '. Genuine PR synchronize should trigger Core CI; '+
    'AutoMerge is allowed only after exact-HEAD required checks pass.'+
    (receipt?'\n'+commentBody({...receipt,state:'PUBLISHED',
      outcome:'VERIFIED_SOURCE_COMMIT',repair_kind:repairKind,new_sha:created.sha,
      commit_url:'https://github.com/'+fullRepo+'/commit/'+created.sha,
      owner_run_id:String(context.runId||'unknown'),run_url:workerRunUrl}):'')});
  try { await github.rest.issues.removeLabel({owner,repo,issue_number:prNumber,name:SOURCE}); }
  catch (e) { core.info('HH_REPAIR: fix pushed; queue label remains: '+e.message); }
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
async function finalize({github,core,context,number=0,expectedSha='',taskKey='',
  claimStatus='',claimReason='',claimResult='',fixResult='',strategy='lint',
  codeAvailable=false,codeResult='',codeStatus='',codeDetail='',
  codeVerifyResult='',codeVerifyStatus='',codeVerifyDetail='',publishResult='',
  publishStatus='',publishSha='',candidateStatus='',candidateDetail='',dryRun=false}) {
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
  }else if(strategy==='lint'&&fixResult!=='success'){
    reason='FIX_JOB_'+String(fixResult||'UNKNOWN').toUpperCase();
  }else if(strategy==='code'&&!codeAvailable){
    state='MANUAL';reason='FREE_AI_EXECUTOR_NOT_CONFIGURED';
  }else if(strategy==='code'&&codeResult==='skipped'){
    reason='CODEX_JOB_NOT_STARTED_NO_SOURCE_COMMIT';
  }else if((strategy==='code'||candidateStatus==='manual_required')&&codeVerifyStatus==='ready'){
    // A tested Codex candidate existed, but no source commit was proven.
    reason='CODEX_VERIFIED_BUT_NOT_PUBLISHED_'+String(publishResult||'UNKNOWN').toUpperCase();
  }else if((strategy==='code'||candidateStatus==='manual_required')&&codeAvailable&&codeResult==='failure'){
    reason='CODEX_JOB_FAILED_NO_SOURCE_COMMIT';
  }else if((strategy==='code'||candidateStatus==='manual_required')&&codeAvailable&&codeStatus==='proposed'&&
      codeVerifyResult!=='success'){
    reason='CODEX_VERIFIER_JOB_FAILED_NO_SOURCE_COMMIT';
  }else if(publishStatus==='manual_required' || candidateStatus==='manual_required' || strategy==='code'){
    state='MANUAL';
    reason=!codeAvailable?'FREE_AI_EXECUTOR_NOT_CONFIGURED':
      codeVerifyStatus==='manual_required'?'CODEX_CANDIDATE_REJECTED':
      'CODEX_NO_VERIFIED_SOURCE_CHANGE';
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
  let failedStep=null;
  if(['FAILED','REJECTED'].includes(state)){
    try{
      const jobs=(await github.rest.actions.listJobsForWorkflowRun({
        owner,repo,run_id:Number(context.runId),per_page:100})).data?.jobs||[];
      const failed=jobs.find(j=>j.conclusion==='failure');
      failedStep=failed?.steps?.find(s=>s.conclusion==='failure')?.name||
        failed?.name||null;
    }catch(error){core.info('HH_REPAIR_OUTCOME_JOB_DIAGNOSTICS_UNAVAILABLE '+error.message);}
  }
  // This diagnostic never implies a source write; the existing reason_code
  // stays backward-compatible with Monitor and Repair Observer consumers.
  const validCandidateDetails=new Set(['NO_AUTOFIXABLE_ESLINT_CHANGE',
    'ESLINT_SCOPE_NOT_CONFIGURED','ESLINT_REMAINING_ERRORS',
    'UNSAFE_SCOPED_DIFF','SCOPED_TESTS_NOT_GREEN','VERIFIED_SOURCE_PATCH']);
  const agentDetail=[codeVerifyDetail,codeDetail].find(x=>typeof x==='string' &&
    x.startsWith('CODEX_') && /^[A-Z0-9_:.-]{5,120}$/.test(x));
  const detailCode=state==='MANUAL'||state==='FAILED'?
    agentDetail||(validCandidateDetails.has(candidateDetail)?candidateDetail:null):null;
  const result={schema:'HH_PR_TASK_V1',task_key:taskKey,pr_number:number,
    head_sha:expectedSha,lane:'repair',state,reason_code:reason,strategy,
    source_published:sourcePublished,new_sha:newSha,failed_step:failedStep,
    detail_code:detailCode,
    repair_kind:publishStatus==='committed'&&candidateStatus!=='ready'?'codex':
      publishStatus==='committed'?'lint':null,
    code_agent_configured:codeAvailable,code_job_result:codeResult||'skipped',
    code_candidate_status:codeStatus||'skipped',
    code_verify_result:codeVerifyResult||'skipped',
    code_verify_status:codeVerifyStatus||'skipped',
    claim_status:claimStatus||'unknown',claim_result:claimResult||'unknown',
    reservation_run_id:reservationRunId,retry_after:retryAfter,
    created_at:new Date().toISOString(),fix_result:fixResult||'unknown',
    publish_result:publishResult||'unknown',publish_status:publishStatus||'unknown',
    owner_run_id:runId,run_url:'https://github.com/'+fullRepo+'/actions/runs/'+runId};
  await github.rest.issues.createComment({owner,repo,issue_number:number,
    body:marker+'\n'+commentBody(result)});
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
  await core.summary.addHeading('HH Repair Worker — verified final outcome')
    .addCodeBlock(JSON.stringify(result,null,2)).write();
  return result;
}

module.exports={claim,publish,finalize,finalizeFailedFix,prioritizedRepairCandidates,eligible,validBranch,safeFiles,validCandidate,activeSweepLease,repairMode,hasVerifiedSourceHandoff,verifiedCoreCodeFailure,PROD,SOURCE,CONFLICT,MARKER};
