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
const {taskFor,commentBody,readCompleteIssueComments}=require('./ci-pr-task-state.cjs');

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
    !pr.labels?.some(l => l.name===MANUAL || l.name==='hh:hold'));
}
function activeSweepLease(comments, sha, now) {
  for (const c of comments) {
    if (!(c.body || '').includes('HH_PR_SWEEP_LEASE_V1')) continue;
    const start=(c.body || '').indexOf('{');
    const end=(c.body || '').indexOf('}',start);
    if (start<0 || end<0) return true;
    try {
      const lease = JSON.parse(c.body.slice(start,end+1));
      if (lease.schema === 'HH_PR_SWEEP_LEASE_V1') {
        if (lease.head_sha === sha &&
            ['active','claim','heartbeat'].includes(lease.state || lease.last_action)) {
          // A worker can remain active after its TTL expires. Never
          // overwrite that worker's source just because the clock advanced.
          return true;
        }
        continue;
      }
      // Historical Codex lease comments use lease_expires without schema.
      // Unknown/malformed ownership always blocks; proven expired leases do not.
      const legacy=lease.schema == null &&
        typeof lease.owner === 'string' && lease.owner.trim() &&
        typeof lease.run_id === 'string' && lease.run_id.trim() &&
        SHA.test(lease.head_sha || '') &&
        Number.isFinite(Date.parse(lease.lease_expires || ''));
      if (!legacy) return true;
      if (lease.head_sha === sha && Date.parse(lease.lease_expires) > now)
        return true;
    } catch { return true; }
  }
  return false;
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

async function claim({github,core,context,number=0,expectedSha='',taskKey='',dryRun=false,hasToken=false,now=Date.now()}) {
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
      !Number.isSafeInteger(number) || number<1))return skip('INVALID_ADDRESSED_REPAIR_TASK');
  try {
  let candidates = [];
  // Watchdog explicitly targets the highest-priority eligible PR. If its
  // exact HEAD is already leased, conflicted or stale, fall through to the
  // next direction-ranked queue candidate in the SAME worker cycle.
  const found = await Promise.all([SOURCE,CONFLICT].map(labels =>
    limited('repair-queue',()=>github.rest.issues.listForRepo({owner,repo,state:'open',labels,
      sort:'updated',direction:'asc',per_page:40}))));
  if (found.some(r => !Array.isArray(r.data))) return skip('INCOMPLETE_QUEUE');
  const queued=prioritizedRepairCandidates(found[0].data,found[1].data,now);
  if(taskKey)candidates=[{number}];
  else if (Number.isSafeInteger(number) && number > 0)
    candidates=[{number},...queued.filter(x=>x.number!==number)].slice(0,MAX_CANDIDATES);
  else candidates=queued;
  for (const item of candidates) {
    const pr = (await limited('live-pr',()=>github.rest.pulls.get({owner,repo,pull_number:item.number}))).data;
    if (!eligible(pr,fullRepo) ||
        (expectedSha && item.number===number && pr.head.sha !== expectedSha)) continue;
    if(taskKey && taskFor(pr,priorityFor(pr,now))?.task_key!==taskKey){
      log('REFUSE_STALE_OR_FOREIGN_TASK #'+pr.number);continue;
    }
    // If the branch is a parent of another open PR, never modify its history.
    const children = (await limited('stacked-children',()=>github.rest.pulls.list({owner,repo,state:'open',base:pr.head.ref,per_page:1}))).data;
    if (!Array.isArray(children) || children.length) continue;
    // Incomplete history cannot prove ownership. Bounded pagination avoids
    // indefinitely blocking mature PRs as they pass 100 issue comments.
    const comments = await readCompleteIssueComments(github,owner,repo,pr.number,limited);
    if (!comments) continue;
    const marker = '<!-- ' + MARKER + ' ' + pr.head.sha + ' -->';
    if (comments.some(c => (c.body || '').includes(marker)) ||
        activeSweepLease(comments,pr.head.sha,now)) continue;
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
    // Persist the addressed task acknowledgement on the exact source HEAD.
    // CLAIMED is evidence of ownership, never evidence of a published fix.
    const receipt=taskFor(pr,priorityFor(pr,now));
    const workerRunUrl=Number.isSafeInteger(context.runId)?
      'https://github.com/'+fullRepo+'/actions/runs/'+context.runId:null;
    const claimedReceipt=receipt?commentBody({...receipt,state:'CLAIMED',
      owner_run_id:String(context.runId||'unknown'),run_url:workerRunUrl,
      outcome:'CLAIM_ONLY_NO_SOURCE_WRITE'}):'';
    await github.rest.issues.createComment({owner,repo,issue_number:pr.number,body:
      marker + '\n**HH Repair Worker claimed this HEAD.**\n' +
      'Owner: @' + pr.user.login + '; strategy: ' + (conflict?'conflict/manual':'targeted ESLint autofix') +
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
    writeOutputs(core,{strategy:'lint',pr_number:pr.number,sha:pr.head.sha,branch:pr.head.ref,
      files_json:JSON.stringify(files)});
    log('CLAIMED #' + pr.number + ' priority=' + priorityFor(pr,now).tier + ' owner=' + pr.user.login + ' SHA=' + pr.head.sha);
    return {status:'claimed',number:pr.number,sha:pr.head.sha,files};
  }
  return skip('NO_UNCLAIMED_OWNER_PR');
  } catch(error) {
    if (String(error.message).startsWith('HH_REPAIR_API_BUDGET_PAUSE:'))
      return skip('GITHUB_API_BUDGET_PAUSE');
    throw error;
  }
}
function validCandidate(candidate, sha) {
  return !!(candidate && candidate.head_sha === sha && Array.isArray(candidate.files) &&
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
      'HH Repair Worker: ran targeted ESLint autofix, but no safe validated source change was produced '+
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
  await github.rest.issues.createComment({owner,repo,issue_number:prNumber,body:
    'HH Repair Worker: committed targeted ESLint autofix ' + created.sha +
    ' for previous HEAD ' + expectedSha + '. Genuine PR synchronize should trigger Core CI; '+
    'AutoMerge is allowed only after exact-HEAD required checks pass.'+
    (receipt?'\n'+commentBody({...receipt,state:'PUBLISHED',
      outcome:'VERIFIED_SOURCE_COMMIT',new_sha:created.sha,
      commit_url:'https://github.com/'+fullRepo+'/commit/'+created.sha,
      owner_run_id:String(context.runId||'unknown'),run_url:workerRunUrl}):'')});
  try { await github.rest.issues.removeLabel({owner,repo,issue_number:prNumber,name:SOURCE}); }
  catch (e) { core.info('HH_REPAIR: fix pushed; queue label remains: '+e.message); }
  return {status:'committed',number:prNumber,sha:created.sha};
}
module.exports={claim,publish,prioritizedRepairCandidates,eligible,validBranch,safeFiles,validCandidate,activeSweepLease,repairMode,hasVerifiedSourceHandoff,PROD,SOURCE,CONFLICT,MARKER};
