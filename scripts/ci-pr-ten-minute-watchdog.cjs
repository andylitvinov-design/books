'use strict';

/**
 * Zero-added-service GitHub PR watchdog. Runs only from the trusted default branch.
 * This coordinator never checks out PR code or merges directly. It schedules the
 * existing, guarded full-inventory native auto-merge and retries only transient CI.
 */
const PROD = 'codex/public-book-library';
const DEFAULT = 'codex/bootstrap-books';
const CORE_NAME = 'HH PR core release gate';
const FULL = 'hh-pr-full-inventory.yml';
const MINUTE = 60_000;
const MARKER = 'HH_PR_10MIN_SOURCE_REPAIR_V1';
const MAX_STALE_RUNS = 2;
const MAX_HANDOFFS = 2;
const REPAIR_LABEL = 'hh:repair-needed';
// Core passing while the independent release/specialist gate fails is not
// evidence of a broken TypeScript/build source. Keep it out of source Repair.
const RELEASE_GATE_LABEL = 'hh:release-gate-review';
const MAX_RELEASE_GATE_LABELS = 2;
const CONFLICT_LABEL = 'hh:conflict-repair-needed';
const CI_BOOTSTRAP_LABEL = 'hh:ci-needed';
const MAX_CONFLICT_HANDOFFS = 2;
// Preserve per-repository API quota for event-driven merge / CI workflows.
const MAX_API_CALLS = 65;
const MIN_RATE_REMAINING = 100;
const MAX_LEGACY_PROBES = 3;
const MAX_LEGACY_BOOTSTRAPS = 1;
const LEGACY_MARKER = 'HH_PR_10MIN_LEGACY_CORE_BOOTSTRAP_V1';
const MAX_REST_FALLBACK_LOOKUPS = 6; // GraphQL outage: conservative, rotating REST slice.
const {priorityFor,rankedCandidates} = require('./ci-pr-priority.cjs');

/**
 * One GraphQL read obtains mergeability for all selected PRs instead of one
 * REST GET per PR. This uses the GITHUB_TOKEN GraphQL quota, not the owner PAT.
 * Missing/changed objects never grant authorization: exact HEAD, branch and
 * repository identity must still match the authoritative REST list snapshot.
 */
function buildLiveBatchQuery(prs) {
  if (!Array.isArray(prs) || prs.length > 20) throw Error('Unsafe PR batch size');
  const fields=prs.map(pr=>{
    if (!Number.isSafeInteger(pr.number) || pr.number < 1) throw Error('Unsafe PR number');
    return 'p'+pr.number+':pullRequest(number:'+pr.number+') {'+
      ' number state isDraft mergeable mergeStateStatus baseRefName'+
      ' headRefName headRefOid headRepository { nameWithOwner }'+
      ' autoMergeRequest { enabledAt } }';
  }).join('\n');
  return 'query($owner:String!,$repo:String!){'+
    ' repository(owner:$owner,name:$repo) { '+fields+' }'+
    ' rateLimit { remaining } }';
}

function normalizeLiveBatchPR(node, listed) {
  if (!node || node.number !== listed.number) return null;
  return {
    number:node.number,state:node.state==='OPEN'?'open':'closed',
    draft:node.isDraft,
    base:{ref:node.baseRefName},
    head:{sha:node.headRefOid,ref:node.headRefName,
      repo:{full_name:node.headRepository?.nameWithOwner || null}},
    mergeable:node.mergeable==='MERGEABLE'?true:
      node.mergeable==='CONFLICTING'?false:null,
    mergeable_state:String(node.mergeStateStatus || 'UNKNOWN').toLowerCase(),
    labels:listed.labels || [],updated_at:listed.updated_at,
    auto_merge:node.autoMergeRequest ? {enabled_at:node.autoMergeRequest.enabledAt}:null
  };
}

function boundedRestFallback(selected) {
  // Keep two most recently edited PRs and four rotating ones. Without GraphQL
  // the oldest 180 PRs must still get attention rather than only hot PRs.
  if (selected.length <= MAX_REST_FALLBACK_LOOKUPS) return selected;
  return [...selected.slice(0,2),...selected.slice(4,8)].slice(0,MAX_REST_FALLBACK_LOOKUPS);
}

function selectCandidates(prs,now,rotatedSize=12,urgentSize=4,priorityNumber=null){
  if(!Array.isArray(prs)||!prs.length)return [];
  const ranked=rankedCandidates(prs,now);
  // CI completion wakes that exact PR; the other fast slots serve impact.
  const wake=Number.isSafeInteger(priorityNumber)
    ?ranked.find(pr=>pr.number===priorityNumber):null;
  const top=wake?[wake]:[];
  for(const pr of ranked){
    if(top.length>=urgentSize)break;
    if(!top.some(p=>p.number===pr.number))top.push(pr);
  }
  const fastIDs=new Set(top.map(pr=>pr.number));
  // Twelve rotating non-fast slots guarantee that older P2/P3 make progress.
  const pool=ranked.filter(pr=>!fastIDs.has(pr.number)).sort((a,b)=>a.number-b.number);
  const offset=pool.length?(Math.floor(now/(10*MINUTE))*rotatedSize)%pool.length:0;
  const rotating=Array.from({length:Math.min(pool.length,rotatedSize)},
    (_,i)=>pool[(offset+i)%pool.length]);
  return [...top,...rotating];
}

function latestByName(checks) {
  const map = new Map();
  for (const item of [...checks].sort((a,b) => b.id - a.id)) if (!map.has(item.name)) map.set(item.name, item);
  return map;
}
function gateIsGreen(checks, name = 'hh-core-verified') {
  if (!checks || checks.total_count > 100 || !Array.isArray(checks.check_runs)) return false;
  const entries = latestByName(checks.check_runs);
  const gate = entries.get(name);
  return Boolean(gate && gate.status === 'completed' && gate.conclusion === 'success' &&
    gate.app?.id === 15368 && ![...entries.values()].some(c =>
      c.name !== 'release-ready' &&
      ['failure','cancelled','timed_out','action_required','startup_failure'].includes(c.conclusion)));
}
function classifyMergeState(pr) {
  if (pr?.mergeable === false || pr?.mergeable_state === 'dirty') return 'DIRTY';
  if (pr?.mergeable === null || !pr?.mergeable_state || pr?.mergeable_state === 'unknown')
    return 'UNKNOWN';
  if (pr.mergeable_state === 'behind') return 'BEHIND';
  return pr.mergeable === true ? 'MERGEABLE' : 'UNKNOWN';
}
function canRetryCi(active, queued) {
  // Running and queued runs are different resources; do not conflate them.
  // Allow two bounded retries when both pools are below their independent caps.
  return Number.isSafeInteger(active) && Number.isSafeInteger(queued) &&
    active >= 0 && queued >= 0 && active < 20 && queued < 20;
}
function transientFailure(run, jobs, now) {
  if (!run || run.status !== 'completed' || run.run_attempt !== 1 ||
      now - Date.parse(run.updated_at || run.created_at || 0) < 15 * MINUTE ||
      now - Date.parse(run.created_at || 0) > 30 * 24 * 60 * MINUTE) return false;
  if (['timed_out','startup_failure'].includes(run.conclusion)) return true;
  if (run.conclusion !== 'failure' || !Array.isArray(jobs)) return false;
  const failed = jobs.filter(j => ['failure','timed_out','startup_failure'].includes(j.conclusion));
  return failed.length > 0 && failed.every(job =>
    ['timed_out','startup_failure'].includes(job.conclusion) ||
    job.steps?.some(step => step.conclusion === 'failure' &&
      /^(checkout|set ?up|install dependencies|download|fetch|restore cache|prepare runner)/i.test(step.name || '')));
}

function classifyCoreFailureJobs(jobs) {
  // No complete job evidence => no source-repair claim or gate diagnosis.
  if (!Array.isArray(jobs) || !jobs.length) return 'UNVERIFIED';
  const byName=new Map(jobs.map(job=>[job.name,job]));
  const failed=jobs.filter(job=>['failure','timed_out','startup_failure'].includes(job.conclusion));
  if (!failed.length) return 'UNVERIFIED';
  const gateOnly=new Set(['release-ready','hh-specialists-verified']);
  const core=byName.get('hh-core-verified');
  const scope=byName.get('classify-change');
  const build=byName.get('core-lint-types-build');
  if (failed.every(job=>gateOnly.has(job.name)) &&
      core?.conclusion==='success' &&
      scope?.conclusion==='success' &&
      (build?.conclusion==='success' || build?.conclusion==='skipped'))
    return 'RELEASE_GATE_ONLY';
  if (failed.some(job=>!gateOnly.has(job.name))) return 'SOURCE_OR_PREFLIGHT';
  return 'UNVERIFIED';
}
function latestCompletedFailedGate(checks, name) {
  if (!Array.isArray(checks?.check_runs) || checks.total_count>100) return false;
  const gate=latestByName(checks.check_runs).get(name);
  return gate?.status==='completed' &&
    ['failure','timed_out','startup_failure','cancelled','action_required'].includes(gate.conclusion);
}

async function listOpen(github, owner, repo, limited) {
  const all = [];
  for (let page = 1; page <= 30; page++) {
    const {data} = await limited('list-open',()=>github.rest.pulls.list({owner, repo, state:'open', per_page:100, page}));
    if (!Array.isArray(data)) throw Error('Incomplete open PR page '+page);
    all.push(...data);
    if (data.length < 100) return all;
  }
  throw Error('Open PR inventory exceeded 3000; refusing partial inventory');
}
async function listJobs(github, owner, repo, id, limited) {
  const {data} = await limited('core-jobs',()=>github.rest.actions.listJobsForWorkflowRun({owner, repo, run_id:id, per_page:100, filter:'latest'}));
  return data.total_count <= 100 ? data.jobs : null;
}

async function ensureQueueLabel(github, owner, repo, pr, name, description, color, dryRun, limited, log) {
  if ((pr.labels || []).some(label => label.name === name)) return false;
  if (dryRun) return true;
  try {
    try {
      await limited('queue-label',()=>github.rest.issues.addLabels({
        owner,repo,issue_number:pr.number,labels:[name]}));
    } catch (error) {
      if (error.status !== 404 && error.status !== 422) throw error;
      try {
        await limited('queue-label-create',()=>github.rest.issues.createLabel({
          owner,repo,name,color,description}));
      } catch (createError) {
        if (createError.status !== 422) throw createError;
      }
      await limited('queue-label',()=>github.rest.issues.addLabels({
        owner,repo,issue_number:pr.number,labels:[name]}));
    }
    return true;
  } catch (error) {
    const accepted=error.response?.headers?.['x-accepted-github-permissions'] || 'not-reported';
    log('#' + pr.number + ' queue label ' + name + ' unavailable: status='+
      String(error.status || 'unknown')+' accepted='+accepted+' '+error.message);
    return false;
  }
}

async function recordRepairHandoff(github, owner, repo, pr, run, jobs, dryRun, log, limited) {
  const marker = `<!-- ${MARKER} ${pr.head.sha} -->`;
  // Limit comment pagination. If it cannot be checked completely, do not
  // duplicate a repair claim on an older exact HEAD.
  const comments=[];
  for(let page=1;page<=3;page++){
    const {data}=await limited('repair-comments',()=>github.rest.issues.listComments({
      owner,repo,issue_number:pr.number,per_page:100,page
    }));
    if(!Array.isArray(data)) return false;
    comments.push(...data);
    if(data.length<100) break;
    if(page===3){log('SKIP repair handoff: >300 comments, incomplete history');return false;}
  }
  if(comments.some(c=>(c.body||'').includes(marker))) {
    // If a receipt exists but its queue label failed, retry only the label.
    if((pr.labels || []).some(label=>label.name===REPAIR_LABEL))return false;
    const recovered=await ensureQueueLabel(github,owner,repo,pr,REPAIR_LABEL,
      'Current PR HEAD needs source-code repair after CI failure',
      'd93f0b',dryRun,limited,log);
    if(recovered)log('#'+pr.number+' recovered repair queue label at '+pr.head.sha.slice(0,12));
    return recovered;
  }
  const failed = (jobs || []).filter(j=>j.conclusion === 'failure').map(j=>j.name).slice(0,7);
  const body = `${marker}
**PR Control Tower: требуется исправление исходного кода**

`+
    `Core CI failed on current HEAD \`${pr.head.sha}\` ([run ${run.id}](https://github.com/${owner}/${repo}/actions/runs/${run.id}), attempt ${run.run_attempt}).
`+
    `Failed jobs: ${failed.length ? failed.join(', ') : 'inspect run logs'}.

`+
    `Repair: inspect the exact-HEAD failure, batch source changes, run focused tests and push one verified commit. `+
    `Do not delete required checks or force-merge. This is a handoff to existing Repair workers, `+
    `**not** a claim that source code has already been fixed.
`;
  if (!dryRun) {
    await limited('repair-handoff',()=>github.rest.issues.createComment({owner,repo,issue_number:pr.number,body}));
    const labeled=await ensureQueueLabel(github,owner,repo,pr,REPAIR_LABEL,
      'Current PR HEAD needs source-code repair after CI failure',
      'd93f0b',false,limited,log);
    if(!labeled){
      log('#'+pr.number+' repair receipt saved but queue label NOT confirmed; retry next cycle');
      return false;
    }
  }
  log(`${dryRun ? 'WOULD_QUEUE' : 'QUEUED'} repair handoff (not an AI coding run) for #${pr.number} HEAD ${pr.head.sha.slice(0,12)}`);
  return true;
}

function coreRunForCurrentPR(r,pr) {
  // The run's head_sha can be GitHub's synthetic merge commit, not PR HEAD.
  return r?.name===CORE_NAME && r.head_branch===pr.head.ref &&
    r.event==='pull_request' && (r.pull_requests||[]).some(p=>
      p.number===pr.number && p.head?.sha===pr.head.sha &&
      p.head?.ref===pr.head.ref);
}

function hasActiveLease(comments, headSha, now) {
  for (const comment of comments) {
    const body = comment.body || '';
    if (!body.includes('HH_PR_SWEEP_LEASE_V1')) continue;
    try {
      const start = body.indexOf('{'), end = body.indexOf('}', start);
      if (start < 0 || end < 0) return true; // Unparseable ownership: fail closed.
      const lease = JSON.parse(body.slice(start,end+1));
      if (lease.schema === 'HH_PR_SWEEP_LEASE_V1') {
        if (lease.head_sha === headSha &&
            ['active','claim','heartbeat'].includes(lease.state || lease.last_action)) {
          const expiry = Date.parse(lease.expires_at || '');
          if (!Number.isFinite(expiry) || expiry > now) return true;
        }
        continue;
      }
      // Older Codex leases have no schema and use lease_expires. Only a
      // complete, time-bounded, exact-HEAD legacy record may expire safely.
      const legacy = lease.schema == null &&
        typeof lease.owner === 'string' && lease.owner.trim() &&
        typeof lease.run_id === 'string' && lease.run_id.trim() &&
        /^[a-f0-9]{40}$/i.test(lease.head_sha || '') &&
        Number.isFinite(Date.parse(lease.lease_expires || ''));
      if (!legacy) return true;
      if (lease.head_sha === headSha && Date.parse(lease.lease_expires) > now)
        return true;
    } catch { return true; }
  }
  return false;
}

async function verifyCoreRunOnExactHead({github,owner,repo,pr,run,limited}) {
  if (!coreRunForCurrentPR(run,pr)) return false;
  if (!/^[a-f0-9]{40}$/i.test(run.head_sha || '')) return false;
  if (run.head_sha === pr.head.sha) return true;
  // GitHub pull_request workflows may run on a synthetic merge commit.
  // Their pull_requests[] association can be refreshed to a NEW current HEAD
  // even when the run itself belongs to an older commit. Verify ancestry.
  const {data} = await limited('core-merge-ancestry',()=>github.rest.repos.getCommit({
    owner,repo,ref:run.head_sha}));
  // A GitHub-generated pull_request synthetic merge must have exactly two
  // ordered parents: [current base, this PR's exact HEAD]. A match on the
  // first parent (or an arbitrary ancestor) is not evidence for this PR.
  return Array.isArray(data?.parents) && data.parents.length === 2 &&
    data.parents[1]?.sha === pr.head.sha;
}

async function bootstrapLegacyCore({github, repairGithub, owner, repo, pr, all, now, dryRun, log, limited}) {
  // Historical PRs opened before HH core was introduced can have zero current
  // core runs. A safe base update creates a genuine pull_request.synchronize
  // event (not a synthetic successful check) only for clean, BEHIND branches.
  if (!repairGithub || !/^[a-f0-9]{40}$/.test(pr.head?.sha || '')) return false;
  const updatedAt = Date.parse(pr.updated_at || '');
  if (!Number.isFinite(updatedAt) || now - updatedAt < 4 * 60 * MINUTE) return false;
  if (all.some(other => other.number !== pr.number && other.state === 'open' && other.base?.ref === pr.head.ref)) return false;
  const live = (await limited('legacy-live-pr',()=>github.rest.pulls.get({owner, repo, pull_number:pr.number}))).data;
  if (live.state !== 'open' || live.draft || live.base?.ref !== PROD ||
      live.head?.sha !== pr.head.sha || live.head.repo?.full_name !== owner+'/'+repo ||
      live.mergeable !== true || live.mergeable_state !== 'behind') return false;
  const marker = `<!-- ${LEGACY_MARKER} ${pr.head.sha} -->`;
  const comments=[];
  for(let page=1;page<=3;page++) {
    const {data}=await limited('legacy-ownership',()=>github.rest.issues.listComments({
      owner,repo,issue_number:pr.number,per_page:100,page}));
    if(!Array.isArray(data))return false;
    comments.push(...data);
    if(data.length<100)break;
    if(page===3)return false; // Incomplete lease history, fail closed.
  }
  // Once per PR, not once per HEAD: base updates change the SHA and must
  // never create an endless update/CI loop as production continues moving.
  if (comments.some(c=>(c.body || '').includes(LEGACY_MARKER)) ||
      hasActiveLease(comments,pr.head.sha,now)) return false;
  // Prove this is genuinely a legacy PR with NO Core workflow history.
  // A 'behind' PR that already ran Core must not be rebuilt just for age.
  const {data:history} = await limited('legacy-core-history',()=>github.request(
    'GET /repos/{owner}/{repo}/actions/workflows/{workflow_id}/runs',{
      owner,repo,workflow_id:'hh-pr-core-release.yml',
      branch:pr.head.ref,event:'pull_request',per_page:100
    }));
  if (!history || !Array.isArray(history.workflow_runs) ||
      !Number.isSafeInteger(history.total_count) || history.total_count>100 ||
      history.total_count !== history.workflow_runs.length ||
      history.workflow_runs.some(r=>r.head_branch===pr.head.ref &&
        r.event==='pull_request')) return false;
  if (!dryRun) {
    // Use the existing dedicated repo-scoped token, not GITHUB_TOKEN. The
    // latter would suppress downstream pull_request CI events.
    await limited('legacy-base-update',()=>repairGithub.request('PUT /repos/{owner}/{repo}/pulls/{pull_number}/update-branch',
      {owner,repo,pull_number:pr.number,expected_head_sha:pr.head.sha}));
    try {
      await limited('legacy-receipt',()=>github.rest.issues.createComment({owner,repo,issue_number:pr.number,
        body:`${marker}\nHH watchdog: one source-preserving update from current production was accepted to trigger genuine Core CI on this legacy HEAD. No bypass of required checks; verify the new HEAD and Core CI before merge.`}));
    } catch (error) { log(`#${pr.number} bootstrap was accepted, but receipt comment failed: ${error.message}`); }
  }
  log(`${dryRun?'WOULD_BOOTSTRAP':'BOOTSTRAP_ACCEPTED'} legacy Core PR #${pr.number} HEAD ${pr.head.sha.slice(0,12)}`);
  return true;
}

async function run({github, repairGithub=null, core, context, dryRun=false, hasMergeToken=false, now=Date.now()}) {
  const {owner, repo} = context.repo;
  const log = msg => core.info('HH_10MIN_WATCHDOG: '+msg);
  const budget={requests:0,remaining:null,exhausted:false,reason:null};
  const limited=async(name,operation)=>{
    if(budget.exhausted||budget.requests>=MAX_API_CALLS){
      budget.exhausted=true;
      budget.reason ||= 'LOCAL_REQUEST_BUDGET';
      throw Error('HH_API_BUDGET_EXHAUSTED: '+name);
    }
    budget.requests++;
    try{
      const result=await operation();
      const remaining=result?.headers?.['x-ratelimit-remaining'];
      if(remaining!==undefined&&Number.isFinite(Number(remaining))){
        budget.remaining=Number(remaining);
        if(budget.remaining<MIN_RATE_REMAINING){
          budget.exhausted=true;
          budget.reason='GITHUB_RATE_RESERVE';
          log('PAUSE GitHub API: remaining='+budget.remaining);
        }
      }
      return result;
    }catch(error){
      if(([403,429].includes(error?.status) || error?.status == null || error?.status === 200) &&
         /rate.limit|rate limit|abuse|secondary/i.test(String(error?.message))){
        budget.exhausted=true;
        budget.reason='GITHUB_RATE_LIMIT';
      }
      throw error;
    }
  };
  let all;
  try {
    all=await listOpen(github,owner,repo,limited);
  } catch(error) {
    // Do not fail the scheduled workflow when the GitHub API reserve is low.
    // An incomplete inventory cannot authorize CI, branch updates or merging;
    // report one read-only skipped cycle and let the next cron retry.
    if(!budget.exhausted && !String(error?.message || '').includes('HH_API_BUDGET_EXHAUSTED'))
      throw error;
    const skipped={
      inventoryComplete:false,reason:budget.reason || 'GITHUB_API_RATE_EXHAUSTED',
      apiRequests:budget.requests,apiRemaining:budget.remaining,
      checkedAt:new Date(now).toISOString(),dryRun,hasMergeToken,
      ciRetries:0,branchUpdates:0,mergeDispatches:0
    };
    const report=Object.entries(skipped).map(([key,value])=>key+': '+value).join('\n');
    log('SKIP safely: incomplete PR inventory; ' + report.replaceAll('\n','; '));
    await core.summary.addHeading('HH PR 10-minute watchdog: safe API pause')
      .addCodeBlock(report).write();
    return skipped;
  }
  const prod = all.filter(p=>p.base?.ref===PROD);
  const review = prod.filter(p=>!p.draft && p.head?.repo?.full_name===owner+'/'+repo && /^[a-f0-9]{40}$/.test(p.head?.sha || ''));
  const wake=context.eventName==='workflow_run' &&
    context.payload?.workflow_run?.event==='pull_request' &&
    context.payload.workflow_run.status==='completed'
      ? context.payload.workflow_run : null;
  let priorityNumber=null;
  if(wake){
    const linked=(wake.pull_requests || []).filter(p=>Number.isSafeInteger(p.number));
    const matches=review.filter(p=>p.head.ref===wake.head_branch &&
      (!linked.length || linked.some(item=>item.number===p.number)));
    if(matches.length===1)priorityNumber=matches[0].number;
  }
  const selected = selectCandidates(review,now,12,4,priorityNumber);
  const priorityTop=selected.slice(0,4).map(pr=>{
    const priority=priorityFor(pr,now);
    return '#'+pr.number+' '+priority.tier+'('+priority.score+': '+priority.source+')';
  }).join(' | ');
  const summary = {open:all.length,production:prod.length,eligibleToInspect:review.length,inspected:0,
    priorityTop,priorityAmbiguous:review.filter(pr=>priorityFor(pr,now).conflicted).length,
    greenUnarmed:0,mergeCoordinatorDispatched:0,pendingCi:0,coreFailures:0,
    releaseGateOnly:0,releaseGateQueued:0,coreFailureUnverified:0,
    ciBootstrapQueued:0,ciWorkerDispatched:0,
    mergeConflicts:0,conflictLabelsQueued:0,mergeStateUnknown:0,behindProduction:0,
    staleHead:0,legacyRequiredPending:0,protectionUnverified:0,
    transientCiReruns:0,sourceRepairQueued:0,repairWorkerDispatched:0,missingCore:0,coreAssociationUnverified:0,blockedByCapacity:false,
    activeActions:null,queuedActions:null,legacyCoreProbes:0,legacyCoreBootstraps:0,
     liveBatchUsed:false,liveRestLookups:0,graphqlRemaining:null,
    checkedAt:new Date(now).toISOString(),
    dryRun,hasMergeToken,apiRequests:0,apiRateLimited:false,apiRemaining:null,apiBudgetReason:null};
  // This is a count of workflow runs, not runner jobs. Conservative admission control.
  let active = Infinity, queued = Infinity;
  try {
    const [a,q] = await Promise.all(['in_progress','queued'].map(status =>
      limited('ci-capacity',()=>github.rest.actions.listWorkflowRunsForRepo({owner,repo,status,per_page:1}))));
    active = a.data.total_count;
    queued = q.data.total_count;
  } catch(e) { log('CI capacity unknown; no new retries: '+e.message); }
  const ciRoom = canRetryCi(active,queued);
  summary.activeActions = Number.isFinite(active) ? active : null;
  summary.queuedActions = Number.isFinite(queued) ? queued : null;
  summary.blockedByCapacity=!ciRoom;
  log(`FULL_INVENTORY open=${all.length}, production=${prod.length}; deep sample=${selected.length}; active=${active} queued=${queued}`);
  let liveBatch=null;
  if (!budget.exhausted && typeof github.graphql === 'function' && selected.length) {
    try {
      const response=await limited('live-mergeability-batch',()=>
        github.graphql(buildLiveBatchQuery(selected),{owner,repo}));
      if (!response?.repository) throw Error('GraphQL PR repository response missing');
      summary.liveBatchUsed=true;
      liveBatch=new Map(selected.map(pr=>[
        pr.number, normalizeLiveBatchPR(response.repository['p'+pr.number],pr)
      ]));
      if (Number.isFinite(response?.rateLimit?.remaining)) {
        summary.graphqlRemaining=response.rateLimit.remaining;
        if (summary.graphqlRemaining < MIN_RATE_REMAINING) {
          budget.exhausted=true;
          budget.reason='GRAPHQL_RATE_RESERVE';
          log('PAUSE GraphQL API: remaining='+summary.graphqlRemaining);
        }
      }
    } catch(error) {
      log('Batch mergeability unavailable; bounded REST fallback: '+error.message);
    }
  }
  let handoffs = 0, conflictHandoffs = 0;
  let auditedProtection = null, protectionRead = false;
  for (const pr of (liveBatch ? selected : boundedRestFallback(selected))) {
    if(budget.exhausted) break;
    summary.inspected++;
    // The GraphQL batch provides live mergeability with the exact-HEAD lease
    // below. Only use per-PR REST reads when GraphQL is unavailable.
    let live=liveBatch?.get(pr.number);
    if (!liveBatch) {
      try {
        live = (await limited('live-merge-state',()=>github.rest.pulls.get({
          owner,repo,pull_number:pr.number}))).data;
        summary.liveRestLookups++;
      } catch (error) {
        log('#' + pr.number + ' live PR lookup unavailable: ' + error.message);
        continue;
      }
    }
    if (!live) {summary.staleHead++;continue;}
    if (live.state !== 'open' || live.draft || live.base?.ref !== PROD ||
        live.head?.sha !== pr.head.sha || live.head?.repo?.full_name !== owner+'/'+repo) {
      summary.staleHead++;
      continue;
    }
    const mergeState = classifyMergeState(live);
    if (mergeState === 'DIRTY') {
      summary.mergeConflicts++;
      if (conflictHandoffs < MAX_CONFLICT_HANDOFFS && !budget.exhausted) {
        const created = await ensureQueueLabel(github,owner,repo,live,CONFLICT_LABEL,
          'Production merge conflict: repair without bypassing required checks',
          'b60205',dryRun,limited,log);
        if (created) {
          conflictHandoffs++;
          summary.conflictLabelsQueued++;
          log((dryRun ? 'WOULD_QUEUE' : 'QUEUED') +
            ' conflict repair #' + live.number + ' HEAD ' + live.head.sha.slice(0,12));
        }
      }
      continue;
    }
    // Mergeability is asynchronous, so unknown is NOT missing Core CI.
    if (mergeState === 'UNKNOWN') { summary.mergeStateUnknown++; continue; }
    // Behind-base PRs require a deliberate source-preserving base update.
    // Do not create repetitive CI jobs merely to rediscover outdated HEADs.
    if (mergeState === 'BEHIND') {
      summary.behindProduction++;
      if (hasMergeToken && repairGithub && ciRoom && queued < 8 && !budget.exhausted &&
          summary.legacyCoreBootstraps < MAX_LEGACY_BOOTSTRAPS &&
          summary.legacyCoreProbes < MAX_LEGACY_PROBES) {
        summary.legacyCoreProbes++;
        try {
          if (await bootstrapLegacyCore({github,repairGithub,owner,repo,pr:live,all,now,dryRun,log,limited}))
            summary.legacyCoreBootstraps++;
        } catch(error) { log(`#${pr.number} guarded BEHIND update denied: ${error.message}`); }
      }
      continue;
    }
    let checks;
    try {
      // Query the verified Core gate only: many specialist checks may exceed
      // GitHub's first-page 100 limit. Full coordinator still validates ALL
      // required checks, rules and leases before native auto-merge.
      checks = (await limited('head-checks',()=>github.rest.checks.listForRef({owner,repo,ref:pr.head.sha,
        check_name:'hh-core-verified',per_page:100,filter:'latest'}))).data;
    } catch(e) { log(`#${pr.number} checks unavailable: ${e.message}`); continue; }
    if (gateIsGreen(checks)) {
      // Core success is not enough while legacy branch protection still
      // requires release-ready. Read effective protection once per cycle.
      if (!protectionRead) {
        protectionRead = true;
        try {
          const branch = (await limited('production-protection',()=>github.rest.repos.getBranch({
            owner,repo,branch:PROD
          }))).data;
          const required = branch?.protection?.required_status_checks?.contexts;
          if (branch?.protected && Array.isArray(required) && required.length === 1 &&
              ['release-ready','hh-core-verified'].includes(required[0]))
            auditedProtection = required[0];
        } catch(e) { log('Production protection unavailable: '+e.message); }
      }
      if (!auditedProtection) { summary.protectionUnverified++; continue; }
      if (auditedProtection === 'release-ready') {
        let legacy = null;
        try {
          legacy = (await limited('legacy-required-head-check',()=>github.rest.checks.listForRef({
            owner,repo,ref:pr.head.sha,check_name:'release-ready',
            per_page:100,filter:'latest'
          }))).data;
        } catch(e) { log('#'+pr.number+' required legacy CI unavailable: '+e.message); }
        if (!gateIsGreen(legacy,'release-ready')) {
          summary.legacyRequiredPending++;
          // A known failed legacy gate after green Core is not an instruction
          // to run an AI source repair. Do not label still-pending checks.
          if (latestCompletedFailedGate(legacy,'release-ready') &&
              summary.releaseGateQueued < MAX_RELEASE_GATE_LABELS && !budget.exhausted) {
            summary.releaseGateOnly++;
            if (await ensureQueueLabel(github,owner,repo,live,RELEASE_GATE_LABEL,
              'Core passed; investigate required release gate, base or specialist result',
              'fbca04',dryRun,limited,log)) summary.releaseGateQueued++;
          }
          continue;
        }
      }
      if (!pr.auto_merge) summary.greenUnarmed++;
      continue;
    }
    let runs;
    try {
      // Restrict to Core workflow runs: hundreds of specialist checks can share the same SHA.
      runs = (await limited('core-runs',()=>github.request('GET /repos/{owner}/{repo}/actions/workflows/{workflow_id}/runs',{
        owner,repo,workflow_id:'hh-pr-core-release.yml',branch:pr.head.ref,
        event:'pull_request',per_page:100
      }))).data;
    } catch(e) { log(`#${pr.number} CI run lookup unavailable: ${e.message}`); continue; }
    if ((runs.total_count || 0)>100 || !Array.isArray(runs.workflow_runs)) continue;
    const coreRuns = runs.workflow_runs.filter(r=>coreRunForCurrentPR(r,pr))
      .sort((a,b)=> Date.parse(b.created_at)-Date.parse(a.created_at));
    if (!coreRuns.length) {
      summary.missingCore++;
      // Only PRs with NO historical Core workflow runs can be sent to the
      // one-shot CI worker. Existing red/stale source belongs to Repair.
      if (runs.total_count === 0 && summary.ciBootstrapQueued < 1 && !budget.exhausted) {
        const queued = await ensureQueueLabel(github,owner,repo,live,
          CI_BOOTSTRAP_LABEL,'One-time legacy CI needed; no Core PR history',
          '0e8a16',dryRun,limited,log);
        if (queued) {
          summary.ciBootstrapQueued++;
          log((dryRun?'WOULD_QUEUE':'QUEUED')+
            ' legacy Core CI worker for #'+live.number+' HEAD '+live.head.sha.slice(0,12));
        }
      }
      continue;
    }
    let latest=null;
    // Check at most the three newest candidate runs to stay under API budget.
    for(const candidate of coreRuns.slice(0,3)) {
      try {
        if(await verifyCoreRunOnExactHead({github,owner,repo,pr,run:candidate,limited})){
          latest=candidate;break;
        }
      } catch(error) {
        log('#'+pr.number+' cannot verify CI run '+candidate.id+' ancestry: '+error.message);
        if(budget.exhausted)break;
      }
    }
    if(!latest){summary.coreAssociationUnverified++;continue;}
    if (['queued','in_progress','waiting','requested','pending'].includes(latest.status)) {summary.pendingCi++;continue;}
    if (!['failure','timed_out','startup_failure'].includes(latest.conclusion)) continue;
    summary.coreFailures++;
    // Immediately hand verified source failures to Repair when capacity is idle.
    // A delayed, infrastructure-only retry is still guarded by transientFailure().
    let jobs=null;
    try {jobs=await listJobs(github,owner,repo,latest.id,limited);} catch(e) {log(`#${pr.number} jobs lookup: ${e.message}`);continue;}
    if (ciRoom && summary.transientCiReruns < MAX_STALE_RUNS && transientFailure(latest,jobs,now)) {
      if (!dryRun) {
        try {
          await limited('retry-failed-ci',()=>github.request('POST /repos/{owner}/{repo}/actions/runs/{run_id}/rerun-failed-jobs',{owner,repo,run_id:latest.id}));
        } catch(e) { log(`CI retry #${pr.number} failed: ${e.message}`);continue; }
      }
      summary.transientCiReruns++;
      log(`${dryRun?'WOULD_RERUN':'RERUN'} transient core CI #${pr.number} run=${latest.id} HEAD ${pr.head.sha.slice(0,12)}`);
    } else if (latest.conclusion === 'failure' && latest.run_attempt >= 1) {
      const root=classifyCoreFailureJobs(jobs);
      if(root==='RELEASE_GATE_ONLY') {
        summary.releaseGateOnly++;
        // This may be a production BASE_ADVANCED result or failed specialist
        // aggregation; the exact log must determine which. No source claim.
        if(summary.releaseGateQueued < MAX_RELEASE_GATE_LABELS && !budget.exhausted) {
          if(await ensureQueueLabel(github,owner,repo,live,RELEASE_GATE_LABEL,
            'Core passed; investigate required release gate, base or specialist result',
            'fbca04',dryRun,limited,log)) summary.releaseGateQueued++;
        }
        log('#'+pr.number+' gate-only Core failure; no speculative source repair');
      } else if(root==='UNVERIFIED') {
        summary.coreFailureUnverified++;
        log('#'+pr.number+' incomplete Core root evidence; refusing source-repair claim');
      } else if(handoffs < MAX_HANDOFFS) {
        try { if (await recordRepairHandoff(github,owner,repo,pr,latest,jobs,dryRun,log,limited)) {handoffs++;summary.sourceRepairQueued++;} }
        catch(e){log(`#${pr.number} repair handoff unavailable: status=${e.status || 'unknown'} accepted=${e.response?.headers?.['x-accepted-github-permissions'] || 'not-reported'} ${e.message}`);}
      }
    }
  }
  // Dispatch the no-cost CI worker as soon as a new missing-Core queue item
  // appears. A ten-minute scheduled worker remains the fallback. Never send
  // duplicate dispatches when the worker is already running or very recent.
  if(summary.ciBootstrapQueued && !budget.exhausted && !dryRun){
    try {
      const response=(await limited('ci-worker-recent',()=>github.request(
        'GET /repos/{owner}/{repo}/actions/workflows/{workflow_id}/runs',{
          owner,repo,workflow_id:'hh-pr-ci-worker.yml',per_page:5
        }))).data;
      const previous=response.workflow_runs||[];
      const busy=previous.some(r=>['queued','in_progress','waiting','requested'].includes(r.status));
      const justRan=previous.some(r=>now-Date.parse(r.created_at)<3*MINUTE);
      if(!busy&&!justRan&&!budget.exhausted){
        await limited('dispatch-ci-worker',()=>github.request(
          'POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches',{
            owner,repo,workflow_id:'hh-pr-ci-worker.yml',ref:DEFAULT,
            inputs:{dry_run:'false'}
          }));
        summary.ciWorkerDispatched++;
        log('DISPATCHED bounded CI worker for new legacy Core queue item');
      } else log('CI worker active/recent or API reserve low; schedule will retry');
    }catch(error){log('CI worker dispatch unavailable; schedule fallback: '+error.message);}
  }
  // Repair is a real separate default-branch workflow, not merely a label.
  // Keep its own concurrency/owner/SHA lease; one fast dispatch per new handoff,
  // while the 10-minute Repair Worker schedule handles missed or busy dispatches.
  if ((summary.sourceRepairQueued || summary.conflictLabelsQueued) &&
      hasMergeToken && ciRoom && !budget.exhausted && !dryRun) {
    try {
      const info=(await limited('repair-worker-recent',()=>github.request(
        'GET /repos/{owner}/{repo}/actions/workflows/{workflow_id}/runs',{
          owner,repo,workflow_id:'hh-pr-repair-worker.yml',per_page:5
        }))).data;
      const recent=info.workflow_runs||[];
      const busy=recent.some(r=>['queued','in_progress','waiting','requested'].includes(r.status));
      const justRan=recent.some(r=>now-Date.parse(r.created_at)<3*MINUTE);
      if (!busy && !justRan && !budget.exhausted) {
        await limited('dispatch-repair-worker',()=>github.request(
          'POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches',{
            owner,repo,workflow_id:'hh-pr-repair-worker.yml',ref:DEFAULT,
            inputs:{pr_number:'0',dry_run:'false'}
          }));
        summary.repairWorkerDispatched++;
        log('DISPATCHED owner-guarded Repair Worker for source/conflict queue');
      } else log('Repair Worker already active/recent or API reserve low; schedule fallback');
    } catch(error) { log('Repair Worker dispatch unavailable; schedule fallback: '+error.message); }
  }
  if (summary.greenUnarmed && hasMergeToken) {
    try {
      const info=(await limited('merge-coordinator-runs',()=>github.request('GET /repos/{owner}/{repo}/actions/workflows/{workflow_id}/runs',{
        owner,repo,workflow_id:FULL,per_page:10}))).data;
      const recent=info.workflow_runs || [];
      const busy=recent.some(r=>['queued','in_progress','waiting','requested'].includes(r.status));
      const justRan=recent.some(r=>now-Date.parse(r.created_at)<20*MINUTE);
      if (!busy&&!justRan) {
        if (!dryRun) await limited('dispatch-guarded-merge',()=>github.request('POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches',{
          owner,repo,workflow_id:FULL,ref:DEFAULT}));
        summary.mergeCoordinatorDispatched++;
        log(`${dryRun?'WOULD_DISPATCH':'DISPATCHED'} guarded native merge coordinator for ${summary.greenUnarmed} unarmed-green PR(s)`);
      } else log(`Full merge coordinator already active/recent; no duplicate dispatch`);
    } catch(e) {log('Merge coordinator dispatch unavailable: '+e.message);}
  } else if (summary.greenUnarmed&&!hasMergeToken) log('Green PRs exist, but dedicated HH_AUTOMERGE_TOKEN absent: audit-only to avoid suppressed production events');
  summary.apiRequests=budget.requests;
  summary.apiRateLimited=budget.exhausted;
  summary.apiRemaining=budget.remaining;
  summary.apiBudgetReason=budget.reason;
  const report=Object.entries(summary).map(([key,value])=>`${key}: ${value}`).join('\n');
  log(report.replaceAll('\n','; '));
  await core.summary.addHeading('HH PR 10-minute watchdog').addCodeBlock(report).write();
  return summary;
}

module.exports = {run,selectCandidates,latestByName,gateIsGreen,transientFailure,canRetryCi,classifyMergeState,coreRunForCurrentPR,verifyCoreRunOnExactHead,bootstrapLegacyCore,hasActiveLease,buildLiveBatchQuery,normalizeLiveBatchPR,boundedRestFallback,classifyCoreFailureJobs,latestCompletedFailedGate,recordRepairHandoff};
