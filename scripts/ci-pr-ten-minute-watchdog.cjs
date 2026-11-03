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
// A failing real specialist/browser suite must not be misdiagnosed as an obsolete alias.
const SPECIALIST_LABEL = 'hh:specialist-repair-needed';
const MAX_RELEASE_GATE_LABELS = 2;
const MAX_STALE_GATE_TRIAGE = 2; // Bounded backfill for older BEHIND PR labels.
const CONFLICT_LABEL = 'hh:conflict-repair-needed';
const CI_BOOTSTRAP_LABEL = 'hh:ci-needed';
const MAX_CONFLICT_HANDOFFS = 2;
// Preserve per-repository API quota for event-driven merge / CI workflows.
const MAX_API_CALLS = 65;
const MIN_RATE_REMAINING = 100;
const MAX_LEGACY_PROBES = 3;
const MAX_LEGACY_BOOTSTRAPS = 1;
const MAX_VERIFIED_CI_HINT_CLEARS = 2;
const LEGACY_MARKER = 'HH_PR_10MIN_LEGACY_CORE_BOOTSTRAP_V1';
const MAX_REST_FALLBACK_LOOKUPS = 6; // GraphQL outage: conservative, rotating REST slice.
const {priorityFor,rankedCandidates,isFreeFor,selectNextAvailable} = require('./ci-pr-priority.cjs');
const {wake:notifyControlTower}=require('./ci-pr-control-tower-wakeup.cjs');
const {readCompleteIssueComments,externalOwnerLeaseStatus}=require('./ci-pr-task-state.cjs');
const {hasVerifiedSourceHandoff}=require('./ci-pr-repair-worker.cjs');

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
  // Fast slots are for PRs that are not on hold or already handed to
  // an owner. A separate audit rotation still inventories every PR.
  const ranked=rankedCandidates(prs.filter(pr=>isFreeFor(pr,'inspect')),now);
  const inventory=rankedCandidates(prs,now);
  if(!inventory.length)return [];
  const wake=Number.isSafeInteger(priorityNumber)
    ?inventory.find(pr=>pr.number===priorityNumber):null;
  const top=wake?[wake]:[];
  const chosen=new Set(top.map(pr=>pr.number));
  // Always keep the highest-impact PR visible even while a specific
  // workflow_run wake consumes another fast slot.
  const anchor=ranked.find(pr=>!chosen.has(pr.number));
  if(anchor && top.length<urgentSize){
    top.push(anchor);
    chosen.add(anchor.number);
  }
  // Rotate fast slots within the highest ten-level operational rank.
  // The independent audit ring still prevents starvation of other ranks.
  const rank=anchor?priorityFor(anchor,now).mergeRank:null;
  const peers=ranked.filter(pr=>priorityFor(pr,now).mergeRank===rank &&
    !chosen.has(pr.number));
  const available=urgentSize-top.length;
  if(available>0 && peers.length>available){
    const offset=(Math.floor(now/(10*MINUTE))*available)%peers.length;
    for(let i=0;i<available;i++){
      const pr=peers[(offset+i)%peers.length];
      top.push(pr);
      chosen.add(pr.number);
    }
  }
  for(const pr of ranked){
    if(top.length>=urgentSize)break;
    if(!chosen.has(pr.number)){
      top.push(pr);
      chosen.add(pr.number);
    }
  }
  // Independent full-inventory round-robin. Every open PR is visited
  // within ceil(total / rotatedSize) cycles even when fast slots change.
  const sorted=[...inventory].sort((a,b)=>a.number-b.number);
  const offset=(Math.floor(now/(10*MINUTE))*rotatedSize)%sorted.length;
  const rotating=Array.from({length:Math.min(sorted.length,rotatedSize)},
    (_,i)=>sorted[(offset+i)%sorted.length]);
  const unique=new Map([...top,...rotating].map(pr=>[pr.number,pr]));
  const target=Math.min(sorted.length,urgentSize+rotatedSize);
  // Overlap between fast and rotating slots must not waste API inspection
  // capacity: advance the same fairness cursor to fill unique candidates.
  for(let i=rotating.length;unique.size<target && i<sorted.length;i++){
    const pr=sorted[(offset+i)%sorted.length];
    unique.set(pr.number,pr);
  }
  return [...unique.values()];
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
// A Repair claim is not a new Core build. Reserve one narrow source-repair
// lane while ordinary PR CI is congested, but never flood a saturated runner
// pool or enqueue unlimited workers. The workflow-level lease and three-minute
// cooldown still enforce one active/recent Repair Worker at a time.
function canDispatchRepair(active, queued) {
  return Number.isSafeInteger(active) && Number.isSafeInteger(queued) &&
    active >= 0 && queued >= 0 && active < 18 && queued < 80;
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
  const gateOnly=new Set(['release-ready','hh-specialists-verified','hh-merge-check']);
  const core=byName.get('hh-core-verified');
  const scope=byName.get('classify-change');
  const build=byName.get('core-lint-types-build');
  // Current unified Core has classify-change + core-lint-types-build and
  // hh-merge-check; old Core also emitted a separate hh-core-verified.
  // Its ABSENCE is not a source failure, but a present failed Core is.
  // Only the unified hh-merge-check explicitly identifies the modern
  // workflow. Old release-ready without hh-core-verified is INCOMPLETE, not
  // policy-green. A red present legacy Core must still fail closed.
  const coreVerified=core?.conclusion==='success' ||
    (core===undefined&&byName.has('hh-merge-check'));
  // Modern Core no longer emits classify-change / hh-core-verified.
  // A successful real source build plus both modern gates proves source success.
  const modernCore=scope===undefined && core===undefined &&
    byName.has('hh-merge-check') && byName.has('hh-specialist') &&
    build?.conclusion==='success';
  const sourceGreen=(scope?.conclusion==='success'||modernCore) &&
    (build?.conclusion==='success' || build?.conclusion==='skipped') &&
    coreVerified;
  // Do not consume a deterministic ESLint source-writing slot for a verified
  // specialist/policy failure. Independent Specialist checks still determine
  // whether Product Repair is allowed; no result is treated as merge approval.
  if(sourceGreen&&failed.some(job=>job.name==='hh-specialist') &&
     failed.every(job=>job.name==='hh-specialist'||gateOnly.has(job.name)))
    return 'SPECIALIST_FAILED';
  if(sourceGreen&&failed.every(job=>gateOnly.has(job.name)))
    return 'RELEASE_GATE_ONLY';
  // A failed classify-change is an ancestry/routing preflight, not evidence
  // that a TypeScript/ESLint build even ran. For old PR bases the source job
  // can be skipped and must not reserve the source-coding Repair Worker.
  if(scope?.conclusion==='failure' && build?.conclusion!=='failure')
    return 'CI_PREFLIGHT_OR_ROUTING';
  // Aggregate gates report downstream consequences, not the causal step.
  // Treat setup/checkout failures as environment triage at any age; the
  // separate retry policy still decides whether and when a rerun is safe.
  const aggregate=new Set(['release-ready','hh-specialists-verified','hh-core-verified','hh-specialist']);
  const causal=failed.filter(job=>!aggregate.has(job.name));
  const setupStep=/^(?:set ?up job|run actions\/(?:checkout|setup-node)@|checkout|install dependencies|download|fetch|restore cache|prepare runner)/i;
  if(causal.length && causal.every(job=>{
    if(['timed_out','startup_failure'].includes(job.conclusion))return true;
    const steps=(job.steps||[]).filter(step=>step.conclusion==='failure');
    return steps.length>0 && steps.every(step=>setupStep.test(step.name||''));
  })) return 'CI_INFRA_OR_ENVIRONMENT';
  // A red Specialist/aggregate without a completed source job is insufficient
  // evidence for privileged source repair.
  if(failed.every(job=>job.name==='hh-specialist'||gateOnly.has(job.name)))
    return 'UNVERIFIED';
  if (failed.some(job=>!gateOnly.has(job.name))) return 'SOURCE_OR_PREFLIGHT';
  return 'UNVERIFIED';
}
function latestCompletedFailedGate(checks, name) {
  if (!Array.isArray(checks?.check_runs) || checks.total_count>100) return false;
  const gate=latestByName(checks.check_runs).get(name);
  return gate?.status==='completed' &&
    ['failure','timed_out','startup_failure','cancelled','action_required'].includes(gate.conclusion);
}

function verifiedRedSpecialist(checks) {
  // Never interpret arbitrary app check names as trusted release evidence.
  if (!Array.isArray(checks?.check_runs) || checks.total_count > 100) return false;
  const gate=latestByName(checks.check_runs).get('hh-specialist');
  return gate?.app?.id === 15368 && gate?.status === 'completed' &&
    ['failure','timed_out','startup_failure','cancelled','action_required'].includes(gate.conclusion);
}
const INHERITED_CORE_CHECKS=new Set([
  'hh-core-verified','hh-specialist','hh-specialists-verified',
  'release-ready','hh-merge-check','classify-change','core-lint-types-build'
]);
// A red aggregate alone can mean skipped macOS/optional QA or a changed
// production base, NOT a broken product. Require independent same-HEAD
// failed GitHub Actions evidence before sending work to Product Repair.
function classifyIndependentSpecialistChecks(checks) {
  if(!checks || !Number.isSafeInteger(checks.total_count) ||
     checks.total_count<1 || checks.total_count>100 ||
     !Array.isArray(checks.check_runs) ||
     checks.check_runs.length!==checks.total_count) return 'UNKNOWN';
  const latest=latestByName(checks.check_runs);
  if([...latest.values()].some(check=>check.status!=='completed'))
    return 'UNKNOWN';
  if([...latest.values()].some(check=>
      check.conclusion==='failure' && check.app?.id===15368 &&
      !INHERITED_CORE_CHECKS.has(check.name)))
    return 'PRODUCT_FAILURE';
  return 'POLICY_OR_SKIPPED';
}
function needsFailedCoreCronBackstop(state) {
  // Do not multiply 16-PR scans across every failing Core CI when cron works.
  return state === 'STALE' || state === 'UNOBSERVED';
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
// A queue label is historical metadata, not evidence of missing CI. Once a
// real pull_request Core run is independently bound to this exact PR HEAD,
// retire only the hint after another authoritative live PR read. No checks
// are set, rerun or bypassed by removing the stale queue label.
function canRetireCiHint(pr,fresh){
  return !!(pr&&fresh&&pr.state==='open'&&fresh.state==='open'&&
    !pr.draft&&!fresh.draft&&fresh.number===pr.number&&
    fresh.base?.ref===PROD&&fresh.head?.sha===pr.head?.sha&&
    fresh.head?.ref===pr.head?.ref&&
    fresh.head?.repo?.full_name==='andylitvinov-design/books'&&
    (fresh.labels||[]).some(label=>label.name===CI_BOOTSTRAP_LABEL));
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
  // Complete history is required to avoid duplicating an older receipt.
  // The watchdog's existing API budget and rate reserve bound pagination.
  const comments=await readCompleteIssueComments(github,owner,repo,pr.number,limited);
  if(!comments){log('SKIP repair handoff: incomplete comment history');return false;}
  if(hasVerifiedSourceHandoff(comments,pr.head.sha)) {
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
  // A single exact-HEAD owner state machine for Watchdog and Control Tower.
  // An unknown current owner or unreleased modern active lease stays blocked;
  // archived/quoted lease notes never count as a live source writer.
  return externalOwnerLeaseStatus(comments,headSha,now)!=='FREE';
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
  // Read the complete owner history under the normal API/rate budget.
  // A fixed 300-comment cap falsely blocks mature PRs, and a partial page
  // must never authorize a source-preserving branch update.
  const comments=await readCompleteIssueComments(github,owner,repo,pr.number,limited);
  if(!comments)return false;
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


function assessCronHealth(history,now,graceMinutes) {
  if (!history || !Number.isSafeInteger(history.total_count) ||
      !Array.isArray(history.workflow_runs) || history.total_count<0)
    return {state:'UNKNOWN',last:null};
  if(history.total_count===0)return {state:'UNOBSERVED',last:null};
  const last=history.workflow_runs[0]?.created_at;
  const age=now-Date.parse(last || '');
  if(!Number.isFinite(age)||age< -5*60_000 || age>365*24*60*60_000)
    return {state:'UNKNOWN',last:null};
  return {state:age<=graceMinutes*60_000?'HEALTHY':'STALE',
    last,ageMinutes:Math.max(0,Math.floor(age/60_000))};
}

async function run({github, repairGithub=null, core, context, dryRun=false, hasMergeToken=false, eventFastPath=false, now=Date.now()}) {
  const {owner, repo} = context.repo;
  const log = msg => core.info('HH_10MIN_WATCHDOG: '+msg);
  const {createQuotaGuard}=require('./ci-pr-api-quota.cjs');
  const quota=createQuotaGuard({maxCalls:MAX_API_CALLS,minRemaining:MIN_RATE_REMAINING,
    onPause:state=>log('PAUSE GitHub API '+state.reason+' retryAt='+(state.retryAt||'next cycle'))});
  const budget={get requests(){return quota.state.requests;},
    get remaining(){return quota.state.remaining;},
    get exhausted(){return quota.state.paused;},
    set exhausted(value){quota.state.paused=Boolean(value);},
    get reason(){return quota.state.reason;},
    set reason(value){quota.state.reason=value;}};
  const limited=quota.limited;
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
  // Labels in the complete PR inventory are the durable work queue. Do not
  // require the current Watchdog tick to create a NEW label before waking
  // an idle worker: a previous handoff may have been interrupted.
  const hasLabel=(pr,name)=>(pr.labels||[]).some(l=>l.name===name);
  const ciQueueBacklog=review.filter(p=>isFreeFor(p,'ci')).length;
  const availableRepair=selectNextAvailable(review,'repair',now);
  const repairQueueBacklog=review.filter(p=>isFreeFor(p,'repair') ||
    (isFreeFor(p,'inspect') && hasLabel(p,CONFLICT_LABEL))).length;
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
  // Every failed Core still receives its exact-PR inspection. A wider
  // 16-PR backstop is permitted only when actual scheduled Watchdog runs
  // are stale or absent; healthy cron must not amplify a Core failure storm.
  let failedCoreCronState='NOT_APPLICABLE',cronBackstop=false;
  if(wake && priorityNumber!==null && !eventFastPath && !budget.exhausted) {
    try {
      const {data}=await limited('failed-core-schedule-health',()=>
        github.request('GET /repos/{owner}/{repo}/actions/workflows/{workflow_id}/runs',{
          owner,repo,workflow_id:'hh-pr-ten-minute-watchdog.yml',
          event:'schedule',per_page:1
        }));
      failedCoreCronState=assessCronHealth(data,now,35).state;
      cronBackstop=needsFailedCoreCronBackstop(failedCoreCronState);
      log('FAILED_CORE_CRON_DECISION '+failedCoreCronState+
        ' scan='+(cronBackstop?'ROTATING_BACKSTOP':'EXACT_PR_ONLY'));
    } catch(error) {
      // Unknown schedule evidence is NOT proof that cron stopped.
      failedCoreCronState='UNKNOWN';
      log('FAILED_CORE_CRON_LOOKUP_UNAVAILABLE '+String(error.message||error).slice(0,120));
    }
  }
  const selected = wake
    ? (priorityNumber===null ? [] : cronBackstop
      ? selectCandidates(review,now,12,4,priorityNumber)
      : review.filter(p=>p.number===priorityNumber))
    : selectCandidates(review,now);
  const priorityTop=selected.slice(0,4).map(pr=>{
    const priority=priorityFor(pr,now);
    return '#'+pr.number+' '+priority.tier+'/R'+
      String(priority.mergeRank).padStart(2,'0')+
      '('+priority.score+': '+priority.source+')';
  }).join(' | ');
  const summary = {open:all.length,production:prod.length,eligibleToInspect:review.length,inspected:0,
    priorityTop,priorityAmbiguous:review.filter(pr=>priorityFor(pr,now).conflicted).length,
    repairNext:availableRepair ?
      '#'+availableRepair.number+' '+priorityFor(availableRepair,now).tier+
      ' '+priorityFor(availableRepair,now).direction : 'no eligible source repair',
    greenUnarmed:0,mergeCoordinatorDispatched:0,pendingCi:0,coreFailures:0,
    releaseGateOnly:0,releaseGateQueued:0,specialistFailures:0,specialistQueued:0,
    specialistPolicyHolds:0,specialistEvidenceUnverified:0,
    staleGateReclassified:0,wouldReclassifyStaleGate:0,
    policyRelabeled:0,wouldPolicyRelabel:0,coreFailureUnverified:0,infraOrEnvironment:0,
    ciBootstrapQueued:0,ciWorkerDispatched:0,ciQueueBacklog,
    verifiedCiHintsCleared:0,wouldClearVerifiedCiHints:0,
    mergeConflicts:0,conflictLabelsQueued:0,mergeStateUnknown:0,behindProduction:0,
    staleHead:0,legacyRequiredPending:0,protectionUnverified:0,
    transientCiReruns:0,sourceRepairQueued:0,repairWorkerDispatched:0,repairQueueBacklog,missingCore:0,coreAssociationUnverified:0,blockedByCapacity:false,repairBlockedByCapacity:false,controlTowerWake:'NOT_PROBED',
    activeActions:null,queuedActions:null,legacyCoreProbes:0,legacyCoreBootstraps:0,
     liveBatchUsed:false,liveRestLookups:0,graphqlRemaining:null,
    checkedAt:new Date(now).toISOString(),eventPrNumber:priorityNumber,
    verifiedSourceFailures:0,failedCoreCronState,cronBackstop,
    dryRun,hasMergeToken,apiRequests:0,apiRateLimited:false,apiRemaining:null,apiBudgetReason:null};

  // Reconcile only labels, never substitute evidence or alter protected CI.
  // The exact-HEAD release gates remain red until the real cause is fixed.
  const routeVerifiedSpecialist=async live=>{
    let complete;
    try{
      complete=(await limited('same-head-independent-checks',()=>
        github.rest.checks.listForRef({owner,repo,ref:live.head.sha,
          per_page:100,filter:'latest'}))).data;
    }catch(error){
      summary.specialistEvidenceUnverified++;
      log('#'+live.number+' independent specialist evidence unavailable: '+error.message);
      return 'UNKNOWN';
    }
    const decision=classifyIndependentSpecialistChecks(complete);
    if(decision==='UNKNOWN'){
      summary.specialistEvidenceUnverified++;
      log('#'+live.number+' specialist root not yet complete; no label mutation');
      return decision;
    }
    const product=decision==='PRODUCT_FAILURE';
    const to=product?SPECIALIST_LABEL:RELEASE_GATE_LABEL;
    const from=product?RELEASE_GATE_LABEL:SPECIALIST_LABEL;
    if(product)summary.specialistFailures++;
    else {summary.specialistPolicyHolds++;summary.releaseGateOnly++;}
    const max=product?MAX_RELEASE_GATE_LABELS:MAX_RELEASE_GATE_LABELS;
    const count=product?summary.specialistQueued:summary.releaseGateQueued;
    if(!hasLabel(live,to)&&count>=max)return decision;
    const newly=await ensureQueueLabel(github,owner,repo,live,to,
      product?'Verified independent exact-HEAD specialist failure: fix actual source/browser QA':
      'Specialist aggregate failed without a failed independent QA check; inspect skipped/policy/base cause',
      product?'d93f0b':'fbca04',dryRun,limited,log);
    if(newly){
      if(product)summary.specialistQueued++;
      else summary.releaseGateQueued++;
    }
    if(!hasLabel(live,from))return decision;
    if(dryRun){
      if(product)summary.wouldReclassifyStaleGate++;
      else summary.wouldPolicyRelabel++;
      return decision;
    }
    // Never remove a queue label without reading back a still-open exact HEAD
    // and the replacement label. This is not a CI result or merge permission.
    try {
      const current=(await limited('specialist-relabel-live-recheck',()=>
        github.rest.pulls.get({owner,repo,pull_number:live.number}))).data;
      if(current?.state==='open'&&!current.draft &&
         current.head?.sha===live.head.sha&&current.base?.ref===PROD &&
         hasLabel(current,to)&&hasLabel(current,from)){
        await limited('specialist-retire-stale-classification',()=>
          github.rest.issues.removeLabel({owner,repo,
            issue_number:live.number,name:from}));
        if(product)summary.staleGateReclassified++;
        else summary.policyRelabeled++;
        log((product?'REAL_SPECIALIST_RECLASSIFIED #':
          'SPECIALIST_POLICY_RECLASSIFIED #')+live.number+' '+live.head.sha.slice(0,12));
      }
    }catch(error){
      log('#'+live.number+' old specialist label retained: '+error.message);
    }
    return decision;
  };

  // GitHub can silently omit cron events even when a workflow is ACTIVE and
  // workflow_dispatch succeeds. This is observation only: do not affect the
  // exact-head approval or CI capacity decisions based on scheduler health.
  // Run only for the rare manual/default-branch/scheduled events; probing on
  // every failed-Core callback would amplify Actions/API traffic.
  summary.cronHealth='NOT_PROBED';
  summary.cronLastSeen='NOT_PROBED';
  if(['push','workflow_dispatch','schedule'].includes(context.eventName) && !budget.exhausted){
    const workflows=[
      ['watchdog','hh-pr-ten-minute-watchdog.yml',35],
      ['ci','hh-pr-ci-worker.yml',35],
      ['hourly','hh-pr-full-inventory.yml',100]
    ];
    const states=[],lastSeen=[];
    for(const [key,workflow_id,grace] of workflows){
      try {
        const {data}=await limited('cron-health-'+key,()=>github.request(
          'GET /repos/{owner}/{repo}/actions/workflows/{workflow_id}/runs',{
            owner,repo,workflow_id,event:'schedule',per_page:1
          }));
        const assessment=assessCronHealth(data,now,grace);
        states.push(key+':'+assessment.state);
        lastSeen.push(key+':'+(assessment.last || 'none'));
      } catch(error) {
        states.push(key+':UNKNOWN');
        lastSeen.push(key+':lookup-error');
        log('CRON_HEALTH_LOOKUP_UNAVAILABLE '+key+' '+error.message);
        if(budget.exhausted)break;
      }
    }
    // Source Repair Worker is an addressed dispatch-only executor, not a
    // scheduled monitor. Reporting its old schedule as STALE is misleading.
    // Keep the original position in telemetry for existing dashboards.
    states.splice(2,0,'repair:DISPATCH_ONLY');
    lastSeen.splice(2,0,'repair:NOT_SCHEDULED');
    summary.cronHealth=states.join(' | ');
    summary.cronLastSeen=lastSeen.join(' | ');
    if(states.some(state=>state.includes('UNOBSERVED')||state.includes('STALE')))
      core.warning('HH_CRON_LIVENESS: '+summary.cronHealth+
        '; event-driven PR operations continue; GitHub scheduler registration needs verification');
  }
  // This is a count of workflow runs, not runner jobs. Conservative admission control.
  let active = Infinity, queued = Infinity;
  try {
    const [a,q] = await Promise.all(['in_progress','queued'].map(status =>
      limited('ci-capacity',()=>github.rest.actions.listWorkflowRunsForRepo({owner,repo,status,per_page:1}))));
    active = a.data.total_count;
    queued = q.data.total_count;
  } catch(e) { log('CI capacity unknown; no new retries: '+e.message); }
  // Central dispatcher, when enabled by the trusted workflow, owns handoffs.
  const centralDispatch=process.env.HH_CONTROL_TOWER_ENABLED==='true';
  const ciRoom = canRetryCi(active,queued);
  const repairRoom = canDispatchRepair(active,queued);
  summary.activeActions = Number.isFinite(active) ? active : null;
  summary.queuedActions = Number.isFinite(queued) ? queued : null;
  summary.blockedByCapacity=!ciRoom;
  summary.repairBlockedByCapacity=!repairRoom;
  log(`FULL_INVENTORY open=${all.length}, production=${prod.length}; deep sample=${selected.length}; active=${active} queued=${queued}`);
  let liveBatch=null,staleGateTriageInspected=0;
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
      // Reclassify held PRs only from complete independent same-HEAD QA,
      // including correcting earlier aggregate-only Product Repair labels.
      if ((hasLabel(live,RELEASE_GATE_LABEL)||hasLabel(live,SPECIALIST_LABEL)) &&
          staleGateTriageInspected<MAX_STALE_GATE_TRIAGE && !budget.exhausted) {
        staleGateTriageInspected++;
        try {
          const coreChecks=(await limited('stale-gate-core',()=>
            github.rest.checks.listForRef({owner,repo,ref:pr.head.sha,
              check_name:'hh-core-verified',per_page:100,filter:'latest'}))).data;
          const specialistChecks=(await limited('stale-gate-specialist',()=>
            github.rest.checks.listForRef({owner,repo,ref:pr.head.sha,
              check_name:'hh-specialist',per_page:100,filter:'latest'}))).data;
          if(gateIsGreen(coreChecks)&&verifiedRedSpecialist(specialistChecks))
            await routeVerifiedSpecialist(live);
        }catch(error){
          log('#'+pr.number+' specialist classification deferred: '+String(error.message||error).slice(0,160));
        }
      }
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
    let checks, checkedName=auditedProtection==='hh-merge-check' ?
      'hh-merge-check':'hh-core-verified';
    try {
      // Use the current protected status when known. A single bounded extra
      // unified lookup handles the FIRST post-migration candidate without a
      // new full repository scan or invented green legacy alias.
      checks = (await limited('head-checks',()=>github.rest.checks.listForRef({
        owner,repo,ref:pr.head.sha,check_name:checkedName,per_page:100,filter:'latest'
      }))).data;
      if(!gateIsGreen(checks,checkedName) && !protectionRead){
        const candidate=(await limited('head-unified-probe',()=>github.rest.checks.listForRef({
          owner,repo,ref:pr.head.sha,check_name:'hh-merge-check',per_page:100,filter:'latest'
        }))).data;
        if(gateIsGreen(candidate,'hh-merge-check')){
          checks=candidate;checkedName='hh-merge-check';
        }
      }
    } catch(e) { log(`#${pr.number} checks unavailable: ${e.message}`); continue; }
    if (gateIsGreen(checks,checkedName)) {
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
              ['release-ready','hh-core-verified','hh-merge-check'].includes(required[0]))
            auditedProtection = required[0];
        } catch(e) { log('Production protection unavailable: '+e.message); }
      }
      if (!auditedProtection) { summary.protectionUnverified++; continue; }
      if(auditedProtection==='hh-merge-check' && checkedName!=='hh-merge-check'){
        try{
          const current=(await limited('required-unified-head-check',()=>github.rest.checks.listForRef({
            owner,repo,ref:pr.head.sha,check_name:'hh-merge-check',per_page:100,filter:'latest'
          }))).data;
          if(!gateIsGreen(current,'hh-merge-check')){summary.legacyRequiredPending++;continue;}
        }catch(error){log('Required unified check unavailable: '+error.message);continue;}
      }else if(auditedProtection!=='hh-merge-check' && checkedName!=='hh-core-verified'){
        summary.protectionUnverified++;continue;
      }
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
          if (latestCompletedFailedGate(legacy,'release-ready') && !budget.exhausted) {
            // Check the real delegated job on this same HEAD. Its failure is
            // product QA, NOT a legacy release-ready-only failure or a reason
            // to rerun the entire expensive browser suite unchanged.
            let specialist=null;
            try {
              specialist=(await limited('real-specialist-head-check',()=>
                github.rest.checks.listForRef({owner,repo,ref:pr.head.sha,
                  check_name:'hh-specialist',per_page:100,filter:'latest'}))).data;
            } catch(e) { log('#'+pr.number+' specialist evidence unavailable: '+e.message); }
            if (verifiedRedSpecialist(specialist)) {
              await routeVerifiedSpecialist(live);
            } else if (specialist && summary.releaseGateQueued < MAX_RELEASE_GATE_LABELS &&
                       !budget.exhausted) {
              summary.releaseGateOnly++;
              if (await ensureQueueLabel(github,owner,repo,live,RELEASE_GATE_LABEL,
                'Core passed; required release compatibility status failed without verified specialist failure',
                'fbca04',dryRun,limited,log)) summary.releaseGateQueued++;
            }
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
    // A signed real Core association already exists on this exact source HEAD.
    // Never leave its old hh:ci-needed hint monopolizing the CI queue. A
    // separate live read protects concurrent HEAD/label changes.
    const coreStarted=latest.status==='in_progress'||
      (latest.status==='completed'&&['success','failure','timed_out'].includes(latest.conclusion));
    if(coreStarted&&hasLabel(live,CI_BOOTSTRAP_LABEL)&&
       summary.verifiedCiHintsCleared+summary.wouldClearVerifiedCiHints<
         MAX_VERIFIED_CI_HINT_CLEARS&&!budget.exhausted){
      try{
        const fresh=(await limited('verified-core-ci-hint-recheck',()=>
          github.rest.pulls.get({owner,repo,pull_number:pr.number}))).data;
        if(canRetireCiHint(pr,fresh)){
          if(dryRun)summary.wouldClearVerifiedCiHints++;
          else{
            await limited('retire-verified-core-ci-hint',()=>
              github.rest.issues.removeLabel({owner,repo,
                issue_number:pr.number,name:CI_BOOTSTRAP_LABEL}));
            summary.verifiedCiHintsCleared++;
            log('RETIRED_VERIFIED_CORE_CI_HINT #'+pr.number+
              ' '+pr.head.sha.slice(0,12)+' Core run '+latest.id);
          }
        }
      }catch(error){
        log('#'+pr.number+' verified CI hint cleanup deferred: '+
          String(error.message||error).slice(0,150));
      }
    }
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
      } else if(root==='SPECIALIST_FAILED') {
        await routeVerifiedSpecialist(live);
        log('#'+pr.number+' specialist aggregate failed; independently verified cause decides its queue');
      } else if(root==='CI_PREFLIGHT_OR_ROUTING') {
        summary.infraOrEnvironment++;
        // Keep CI preflight in the existing owner release-gate review lane.
        // A red prerequisite is not permission to edit PR source files.
        if(summary.releaseGateQueued < MAX_RELEASE_GATE_LABELS && !budget.exhausted) {
          if(await ensureQueueLabel(github,owner,repo,live,RELEASE_GATE_LABEL,
            'Core classify-change/ancestry preflight failed; repair CI routing, not PR source',
            'fbca04',dryRun,limited,log)) summary.releaseGateQueued++;
        }
        log('#'+pr.number+' Core preflight/routing failure; no speculative source Repair');
      } else if(root==='CI_INFRA_OR_ENVIRONMENT') {
        summary.infraOrEnvironment++;
        log('#'+pr.number+' setup or infrastructure failure; no speculative source repair');
      } else if(root==='UNVERIFIED') {
        summary.coreFailureUnverified++;
        log('#'+pr.number+' incomplete Core root evidence; refusing source-repair claim');
      } else if(handoffs < MAX_HANDOFFS) {
        summary.verifiedSourceFailures++;
        try { if (await recordRepairHandoff(github,owner,repo,pr,latest,jobs,dryRun,log,limited)) {handoffs++;summary.sourceRepairQueued++;} }
        catch(e){log(`#${pr.number} repair handoff unavailable: status=${e.status || 'unknown'} accepted=${e.response?.headers?.['x-accepted-github-permissions'] || 'not-reported'} ${e.message}`);}
      }
    }
  }
  // Dispatch the no-cost CI worker as soon as a new missing-Core queue item
  // appears. A ten-minute scheduled worker remains the fallback. Never send
  // duplicate dispatches when the worker is already running or very recent.
  if(!centralDispatch && (summary.ciBootstrapQueued || ciQueueBacklog) && ciRoom && hasMergeToken && !budget.exhausted && !dryRun){
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
        log('DISPATCHED bounded CI worker for durable legacy Core queue');
      } else log('CI worker active/recent or API reserve low; schedule will retry');
    }catch(error){log('CI worker dispatch unavailable; schedule fallback: '+error.message);}
  }
  // Repair is a real separate default-branch workflow, not merely a label.
  // Keep its own concurrency/owner/SHA lease; one fast dispatch per new handoff,
  // while the 10-minute Repair Worker schedule handles missed or busy dispatches.
  if (!centralDispatch && (summary.sourceRepairQueued || summary.conflictLabelsQueued || repairQueueBacklog) &&
      hasMergeToken && repairRoom && !budget.exhausted && !dryRun) {
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
            inputs:{pr_number:String(availableRepair?.number || 0),
              expected_sha:availableRepair?.head?.sha || '',dry_run:'false'}
          }));
        summary.repairWorkerDispatched++;
        log('DISPATCHED owner-guarded Repair Worker for source/conflict queue');
      } else log('Repair Worker already active/recent or API reserve low; schedule fallback');
    } catch(error) { log('Repair Worker dispatch unavailable; schedule fallback: '+error.message); }
  }
  // The dispatcher no longer subscribes to every Watchdog completion: most
  // of those runs come from successful Core callbacks and never inspect a PR.
  // Wake the trusted single-writer directly only if the durable queues need it.
  if (centralDispatch && !budget.exhausted) {
    summary.controlTowerWake=await notifyControlTower({github,owner,repo,
      summary,enabled:centralDispatch,hasToken:hasMergeToken,dryRun,
      limited,log,now});
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

module.exports = {classifyIndependentSpecialistChecks,run,selectCandidates,latestByName,gateIsGreen,verifiedRedSpecialist,needsFailedCoreCronBackstop,transientFailure,canRetryCi,canDispatchRepair,classifyMergeState,coreRunForCurrentPR,verifyCoreRunOnExactHead,bootstrapLegacyCore,hasActiveLease,buildLiveBatchQuery,normalizeLiveBatchPR,boundedRestFallback,classifyCoreFailureJobs,latestCompletedFailedGate,recordRepairHandoff,assessCronHealth,canRetireCiHint};
