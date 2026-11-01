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
const MAX_DEEP = 22;
const API_RESERVE = 350;
const MAX_HISTORY = 30;

function selectCandidates(prs, now, rotatedSize = 36, urgentSize = 8) {
  const sorted = [...prs].sort((a, b) => a.number - b.number);
  if (!sorted.length) return [];
  const offset = (Math.floor(now / (10 * MINUTE)) * rotatedSize) % sorted.length;
  const rotated = Array.from({length: Math.min(sorted.length, rotatedSize)}, (_, i) => sorted[(offset + i) % sorted.length]);
  const recent = [...prs].sort((a,b) => Date.parse(b.updated_at || 0) - Date.parse(a.updated_at || 0)).slice(0, urgentSize);
  return [...new Map([...recent, ...rotated].map(p => [p.number, p])).values()];
}

function latestByName(checks) {
  const map = new Map();
  for (const item of [...checks].sort((a,b) => b.id - a.id)) if (!map.has(item.name)) map.set(item.name, item);
  return map;
}
function gateIsGreen(checks) {
  if (!checks || checks.total_count > 100 || !Array.isArray(checks.check_runs)) return false;
  const entries = latestByName(checks.check_runs);
  const gate = entries.get('release-ready');
  return Boolean(gate && gate.status === 'completed' && gate.conclusion === 'success' &&
    gate.app?.id === 15368 && ![...entries.values()].some(c =>
      ['failure','cancelled','timed_out','action_required','startup_failure'].includes(c.conclusion)));
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


/**
 * One GraphQL page per 100 production PRs exposes their latest aggregate CI
 * status and merge blockers. Merge rights remain in the existing guard.
 */
async function queryInventory(github, owner, repo) {
  if (typeof github.graphql !== 'function') throw Error('graphql-unavailable');
  const query =
    'query($owner:String!,$repo:String!,$cursor:String) {' +
    ' repository(owner:$owner,name:$repo) {' +
    ' all:pullRequests(states:OPEN,first:1){totalCount}' +
    ' production:pullRequests(states:OPEN,baseRefName:"codex/public-book-library",' +
    ' first:100,after:$cursor,orderBy:{field:UPDATED_AT,direction:DESC}) {' +
    ' totalCount pageInfo{hasNextPage endCursor}' +
    ' nodes { number isDraft createdAt updatedAt headRefOid headRefName' +
    ' headRepository{nameWithOwner} mergeStateStatus' +
    ' autoMergeRequest{enabledAt} statusCheckRollup{state} } } } }';
  const rows=[];
  let cursor=null,total=null,allTotal=null,seen=0;
  for(let page=0;page<MAX_HISTORY;page++){
    const result=await github.graphql(query,{owner,repo,cursor});
    const data=result?.repository,prs=data?.production;
    if(!prs||!Array.isArray(prs.nodes)||!Number.isInteger(prs.totalCount)||
        !Number.isInteger(data.all?.totalCount)) throw Error('graphql-incomplete');
    if(total!==null&&(total!==prs.totalCount||allTotal!==data.all.totalCount))
      throw Error('graphql-inventory-changed');
    total=prs.totalCount;allTotal=data.all.totalCount;seen+=prs.nodes.length;
    for(const p of prs.nodes){
      if(!Number.isInteger(p.number)||!/^[a-f0-9]{40}$/i.test(p.headRefOid||''))
        continue;
      rows.push({number:p.number,draft:p.isDraft,created_at:p.createdAt,
        updated_at:p.updatedAt,auto_merge:p.autoMergeRequest,
        mergeStateStatus:p.mergeStateStatus,rollup:p.statusCheckRollup?.state||'EXPECTED',
        head:{sha:p.headRefOid,ref:p.headRefName,
          repo:{full_name:p.headRepository?.nameWithOwner}},base:{ref:PROD}});
    }
    if(!prs.pageInfo?.hasNextPage){
      if(seen!==total)throw Error('graphql-pagination-incomplete');
      return {open:allTotal,production:rows};
    }
    if(!prs.pageInfo.endCursor||prs.pageInfo.endCursor===cursor)
      throw Error('graphql-pagination-cursor');
    cursor=prs.pageInfo.endCursor;
  }
  throw Error('graphql-pagination-bound');
}
function classifyQuick(pr){
  if(pr.mergeStateStatus==='DIRTY')return 'DIRTY';
  if(pr.mergeStateStatus==='BEHIND')return 'BEHIND';
  if(pr.rollup==='FAILURE'||pr.rollup==='ERROR')return 'RED';
  if(pr.rollup==='SUCCESS')return pr.auto_merge?'ARMED':'GREEN_UNARMED';
  if(pr.rollup==='PENDING')return 'PENDING';
  return 'MISSING';
}
async function reserveApiBudget(github,log){
  try{
    const result=await github.rest.rateLimit.get();
    const remaining=result.data.resources?.core?.remaining;
    if(!Number.isSafeInteger(remaining))throw Error('missing-core-rate');
    return {remaining,deep:Math.max(0,Math.min(MAX_DEEP,Math.floor((remaining-API_RESERVE)/4)))};
  }catch(e){
    log('API budget unavailable, deep limit 8: '+e.message);
    return {remaining:null,deep:8};
  }
}

async function listOpen(github, owner, repo) {
  const all = [];
  for (let page = 1; page <= 30; page++) {
    const {data} = await github.rest.pulls.list({owner, repo, state:'open', per_page:100, page});
    if (!Array.isArray(data)) throw Error('Incomplete open PR page '+page);
    all.push(...data);
    if (data.length < 100) return all;
  }
  throw Error('Open PR inventory exceeded 3000; refusing partial inventory');
}
async function listJobs(github, owner, repo, id) {
  const {data} = await github.rest.actions.listJobsForWorkflowRun({owner, repo, run_id:id, per_page:100, filter:'latest'});
  return data.total_count <= 100 ? data.jobs : null;
}

async function recordRepairHandoff(github, owner, repo, pr, run, jobs, dryRun, log) {
  const marker = `<!-- ${MARKER} ${pr.head.sha} -->`;
  const comments = await github.paginate(github.rest.issues.listComments, {owner,repo,issue_number:pr.number,per_page:100});
  if (comments.length > 1000 || comments.some(c => (c.body || '').includes(marker))) return false;
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
  if (!dryRun) await github.rest.issues.createComment({owner,repo,issue_number:pr.number,body});
  log(`${dryRun ? 'WOULD_QUEUE' : 'QUEUED'} source repair for #${pr.number} HEAD ${pr.head.sha.slice(0,12)}`);
  return true;
}

async function run({github, core, context, dryRun=false, hasMergeToken=false, now=Date.now()}) {
  const {owner, repo} = context.repo;
  const log = msg => core.info('HH_10MIN_WATCHDOG: '+msg);
  const all = await listOpen(github,owner,repo);
  const prod = all.filter(p=>p.base?.ref===PROD);
  const review = prod.filter(p=>!p.draft && p.head?.repo?.full_name===owner+'/'+repo && /^[a-f0-9]{40}$/.test(p.head?.sha || ''));
  const selected = selectCandidates(review,now);
  const summary = {open:all.length,production:prod.length,eligibleToInspect:review.length,inspected:0,
    greenUnarmed:0,mergeCoordinatorDispatched:0,pendingCi:0,coreFailures:0,
    transientCiReruns:0,sourceRepairQueued:0,missingCore:0,blockedByCapacity:false,
    dryRun,hasMergeToken};
  // This is a count of workflow runs, not runner jobs. Conservative admission control.
  let active = Infinity, queued = Infinity;
  try {
    const [a,q] = await Promise.all(['in_progress','queued'].map(status =>
      github.rest.actions.listWorkflowRunsForRepo({owner,repo,status,per_page:1})));
    active = a.data.total_count;
    queued = q.data.total_count;
  } catch(e) { log('CI capacity unknown; no new retries: '+e.message); }
  const ciRoom = Number.isFinite(active) && Number.isFinite(queued) && active+queued < 20;
  summary.blockedByCapacity=!ciRoom;
  log(`FULL_INVENTORY open=${all.length}, production=${prod.length}; deep sample=${selected.length}; active=${active} queued=${queued}`);
  let handoffs = 0;
  for (const pr of selected) {
    summary.inspected++;
    let checks;
    try {
      checks = (await github.rest.checks.listForRef({owner,repo,ref:pr.head.sha,per_page:100,filter:'latest'})).data;
    } catch(e) { log(`#${pr.number} checks unavailable: ${e.message}`); continue; }
    if (gateIsGreen(checks)) {
      if (!pr.auto_merge) summary.greenUnarmed++;
      continue;
    }
    let runs;
    try {
      // Restrict to the release gate: hundreds of specialist checks can share the same SHA.
      runs = (await github.request('GET /repos/{owner}/{repo}/actions/workflows/{workflow_id}/runs',{
        owner,repo,workflow_id:'hh-pr-core-release.yml',head_sha:pr.head.sha,
        event:'pull_request',per_page:100
      })).data;
    } catch(e) { log(`#${pr.number} CI run lookup unavailable: ${e.message}`); continue; }
    if ((runs.total_count || 0)>100 || !Array.isArray(runs.workflow_runs)) continue;
    const coreRuns = runs.workflow_runs.filter(r=> r.name===CORE_NAME && r.head_sha===pr.head.sha &&
      r.head_branch===pr.head.ref && r.event==='pull_request')
      .sort((a,b)=> Date.parse(b.created_at)-Date.parse(a.created_at));
    const latest=coreRuns[0];
    if (!latest) {summary.missingCore++;continue;}
    if (['queued','in_progress','waiting','requested','pending'].includes(latest.status)) {summary.pendingCi++;continue;}
    if (!['failure','timed_out','startup_failure'].includes(latest.conclusion)) continue;
    summary.coreFailures++;
    if (now-Date.parse(latest.updated_at || latest.created_at) < 15*MINUTE) continue;
    let jobs=null;
    try {jobs=await listJobs(github,owner,repo,latest.id);} catch(e) {log(`#${pr.number} jobs lookup: ${e.message}`);continue;}
    if (ciRoom && summary.transientCiReruns < MAX_STALE_RUNS && transientFailure(latest,jobs,now)) {
      if (!dryRun) {
        try {
          await github.request('POST /repos/{owner}/{repo}/actions/runs/{run_id}/rerun-failed-jobs',{owner,repo,run_id:latest.id});
        } catch(e) { log(`CI retry #${pr.number} failed: ${e.message}`);continue; }
      }
      summary.transientCiReruns++;
      log(`${dryRun?'WOULD_RERUN':'RERUN'} transient core CI #${pr.number} run=${latest.id} HEAD ${pr.head.sha.slice(0,12)}`);
    } else if (handoffs < MAX_HANDOFFS && latest.conclusion === 'failure' && latest.run_attempt >= 1) {
      try { if (await recordRepairHandoff(github,owner,repo,pr,latest,jobs,dryRun,log)) {handoffs++;summary.sourceRepairQueued++;} }
      catch(e){log(`#${pr.number} repair handoff unavailable: ${e.message}`);}
    }
  }
  if (summary.greenUnarmed && hasMergeToken) {
    try {
      const info=(await github.request('GET /repos/{owner}/{repo}/actions/workflows/{workflow_id}/runs',{
        owner,repo,workflow_id:FULL,per_page:10})).data;
      const recent=info.workflow_runs || [];
      const busy=recent.some(r=>['queued','in_progress','waiting','requested'].includes(r.status));
      const justRan=recent.some(r=>now-Date.parse(r.created_at)<20*MINUTE);
      if (!busy&&!justRan) {
        if (!dryRun) await github.request('POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches',{
          owner,repo,workflow_id:FULL,ref:DEFAULT});
        summary.mergeCoordinatorDispatched++;
        log(`${dryRun?'WOULD_DISPATCH':'DISPATCHED'} guarded native merge coordinator for ${summary.greenUnarmed} unarmed-green PR(s)`);
      } else log(`Full merge coordinator already active/recent; no duplicate dispatch`);
    } catch(e) {log('Merge coordinator dispatch unavailable: '+e.message);}
  } else if (summary.greenUnarmed&&!hasMergeToken) log('Green PRs exist, but dedicated HH_AUTOMERGE_TOKEN absent: audit-only to avoid suppressed production events');
  const report=Object.entries(summary).map(([key,value])=>`${key}: ${value}`).join('\n');
  log(report.replaceAll('\n','; '));
  await core.summary.addHeading('HH PR 10-minute watchdog').addCodeBlock(report).write();
  return summary;
}

module.exports = {run,selectCandidates,latestByName,gateIsGreen,transientFailure,queryInventory,classifyQuick,reserveApiBudget};
