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
const CONFLICT_LABEL = 'hh:conflict-repair-needed';
const MAX_CONFLICT_HANDOFFS = 2;

function selectCandidates(prs, now, rotatedSize = 30, urgentSize = 6) {
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

async function ensureQueueLabel(github, owner, repo, pr, name, description, color, dryRun, log) {
  if ((pr.labels || []).some(label => label.name === name)) return false;
  if (dryRun) return true;
  try {
    try {
      await github.rest.issues.addLabels({owner,repo,issue_number:pr.number,labels:[name]});
    } catch (error) {
      if (error.status !== 404 && error.status !== 422) throw error;
      // If the label doesn't exist yet, create it and retry. Never alter an existing label.
      try {
        await github.rest.issues.createLabel({owner,repo,name,color,description});
      } catch (createError) {
        if (createError.status !== 422) throw createError;
      }
      await github.rest.issues.addLabels({owner,repo,issue_number:pr.number,labels:[name]});
    }
    return true;
  } catch (error) {
    log('#' + pr.number + ' queue label ' + name + ' unavailable: ' + error.message);
    return false;
  }
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
  if (!dryRun) {
    await github.rest.issues.createComment({owner,repo,issue_number:pr.number,body});
    await ensureQueueLabel(github,owner,repo,pr,REPAIR_LABEL,
      'Current PR HEAD needs source-code repair after CI failure','d93f0b',false,log);
  }
  log(`${dryRun ? 'WOULD_QUEUE' : 'QUEUED'} repair handoff (not an AI coding run) for #${pr.number} HEAD ${pr.head.sha.slice(0,12)}`);
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
    mergeConflicts:0,conflictLabelsQueued:0,mergeStateUnknown:0,behindProduction:0,
    staleHead:0,
    transientCiReruns:0,sourceRepairQueued:0,missingCore:0,blockedByCapacity:false,
    activeActions:null,queuedActions:null,checkedAt:new Date(now).toISOString(),
    dryRun,hasMergeToken};
  // This is a count of workflow runs, not runner jobs. Conservative admission control.
  let active = Infinity, queued = Infinity;
  try {
    const [a,q] = await Promise.all(['in_progress','queued'].map(status =>
      github.rest.actions.listWorkflowRunsForRepo({owner,repo,status,per_page:1})));
    active = a.data.total_count;
    queued = q.data.total_count;
  } catch(e) { log('CI capacity unknown; no new retries: '+e.message); }
  const ciRoom = canRetryCi(active,queued);
  summary.activeActions = Number.isFinite(active) ? active : null;
  summary.queuedActions = Number.isFinite(queued) ? queued : null;
  summary.blockedByCapacity=!ciRoom;
  log(`FULL_INVENTORY open=${all.length}, production=${prod.length}; deep sample=${selected.length}; active=${active} queued=${queued}`);
  let handoffs = 0;
  let conflictHandoffs = 0;
  for (const pr of selected) {
    summary.inspected++;
    // GitHub pull-list omits mergeability. Read one live PR to distinguish
    // stale/conflicted/behind HEADs before spending requests on CI history.
    let live;
    try {
      live = (await github.rest.pulls.get({owner,repo,pull_number:pr.number})).data;
    } catch (error) {
      log('#' + pr.number + ' live PR lookup unavailable: ' + error.message);
      continue;
    }
    if (live.state !== 'open' || live.draft || live.base?.ref !== PROD ||
        live.head?.sha !== pr.head.sha || live.head?.repo?.full_name !== owner+'/'+repo) {
      summary.staleHead++;
      continue;
    }
    const mergeState = classifyMergeState(live);
    if (mergeState === 'DIRTY') {
      summary.mergeConflicts++;
      if (conflictHandoffs < MAX_CONFLICT_HANDOFFS) {
        const created = await ensureQueueLabel(github,owner,repo,live,CONFLICT_LABEL,
          'Production merge conflict: repair without bypassing required checks',
          'b60205',dryRun,log);
        if (created) {
          conflictHandoffs++;
          summary.conflictLabelsQueued++;
          log((dryRun ? 'WOULD_QUEUE' : 'QUEUED') +
            ' conflict repair #' + live.number + ' HEAD ' + live.head.sha.slice(0,12));
        }
      }
      continue;
    }
    // GitHub computes mergeability asynchronously. Unknown != missing Core CI.
    if (mergeState === 'UNKNOWN') { summary.mergeStateUnknown++; continue; }
    // Strict production checks cannot merge a branch behind its base. Avoid
    // retriggering CI repeatedly merely to fail production-base freshness.
    if (mergeState === 'BEHIND') { summary.behindProduction++; continue; }
    let checks;
    try {
      // Query the exact release gate only: many specialist checks may exceed
      // GitHub's first-page 100 limit. Full coordinator still validates ALL
      // required checks, rules and leases before native auto-merge.
      checks = (await github.rest.checks.listForRef({owner,repo,ref:pr.head.sha,
        check_name:'release-ready',per_page:100,filter:'latest'})).data;
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

module.exports = {run,selectCandidates,latestByName,gateIsGreen,transientFailure,canRetryCi,classifyMergeState};
