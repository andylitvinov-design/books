'use strict';

// Default-branch-only controller. It never reads or executes PR HEAD code.
const REPOSITORY = 'andylitvinov-design/books';
const PRODUCTION = 'codex/public-book-library';
const CONTROL = 'codex/bootstrap-books';
const ACTIVE = new Set(['queued', 'in_progress']);
const SHA40 = /^[0-9a-f]{40}$/i;
const MAX_RUNS_PER_PR = 150;

function trustedEvent(context) {
  if (!context || (context.repo?.owner + '/' + context.repo?.repo) !== REPOSITORY) {
    throw Error('UNTRUSTED_REPOSITORY');
  }
  if (context.eventName === 'pull_request_target') {
    const event = context.payload;
    const pr = event?.pull_request;
    if (event?.action !== 'closed' || event?.number !== pr?.number ||
        event?.repository?.full_name !== REPOSITORY || !Number.isSafeInteger(pr?.number) ||
        pr.number <= 0 || pr.state !== 'closed' || pr.merged !== false ||
        pr.base?.ref !== PRODUCTION || pr.base?.repo?.full_name !== REPOSITORY ||
        pr.head?.repo?.full_name !== REPOSITORY || !SHA40.test(pr.head?.sha || '')) {
      throw Error('UNTRUSTED_CLOSED_PR_EVENT');
    }
    return {number: pr.number, headSha: pr.head.sha, dryRun: false};
  }
  if (context.eventName === 'workflow_dispatch' &&
      context.ref === 'refs/heads/' + CONTROL) {
    const raw = String(context.payload?.inputs?.pr_number || '');
    const number = /^[1-9][0-9]{0,7}$/.test(raw) ? Number(raw) : NaN;
    if (!Number.isSafeInteger(number) || number <= 0) throw Error('INVALID_MANUAL_PR_NUMBER');
    // Dispatch is opt-in; dry-run is the safe default even for missing inputs.
    const dryRun = String(context.payload?.inputs?.dry_run ?? 'true') !== 'false';
    return {number, headSha: null, dryRun};
  }
  throw Error('UNTRUSTED_TRIGGER');
}

function closedProductionPR(pr, number, expectedHead = null) {
  if (!pr || pr.number !== number || pr.state !== 'closed' ||
      pr.merged !== false || pr.merged_at != null ||
      pr.base?.ref !== PRODUCTION || pr.base?.repo?.full_name !== REPOSITORY ||
      pr.head?.repo?.full_name !== REPOSITORY ||
      !pr.head?.ref || pr.head.ref === PRODUCTION || pr.head.ref === CONTROL ||
      !SHA40.test(pr.head.sha || '') ||
      (expectedHead && pr.head.sha !== expectedHead)) return false;
  const closedMs = Date.parse(pr.closed_at || '');
  return Number.isFinite(closedMs) && closedMs > 0;
}

function sameClosedPR(a, b) {
  return a?.number === b?.number && a?.state === 'closed' && b?.state === 'closed' &&
    a?.merged === false && b?.merged === false &&
    a?.base?.ref === b?.base?.ref && a?.head?.ref === b?.head?.ref &&
    a?.head?.sha === b?.head?.sha && a?.closed_at === b?.closed_at;
}

function eligible(run, pr, uniqueBranch) {
  if (!run || !Number.isSafeInteger(run.id) || run.id <= 0 ||
      run.event !== 'pull_request' || !ACTIVE.has(run.status) ||
      // A manually re-run pull_request workflow still has event=pull_request.
      // Keep human acceptance re-runs (attempt > 1) untouched.
      run.run_attempt !== 1 ||
      run.repository?.full_name !== REPOSITORY ||
      run.head_repository?.full_name !== REPOSITORY ||
      run.head_branch !== pr.head.ref || !SHA40.test(run.head_sha || '')) return false;
  const created = Date.parse(run.created_at || '');
  const closed = Date.parse(pr.closed_at || '');
  if (!Number.isFinite(created) || !Number.isFinite(closed) || created > closed) return false;
  // GitHub may clear pull_requests after a PR closes; the fallback requires
  // BOTH the immutable exact SHA and unique branch ownership across all PRs.
  if (!Array.isArray(run.pull_requests)) return false;
  if (run.pull_requests.length === 0) {
    return uniqueBranch === true && run.head_sha === pr.head.sha;
  }
  if (run.pull_requests.length !== 1) return false;
  const association = run.pull_requests[0];
  return association.number === pr.number && association.base?.ref === PRODUCTION &&
    association.head?.ref === pr.head.ref &&
    (association.head?.repo?.id == null || association.head.repo.id === pr.head.repo.id) &&
    (association.base?.repo?.id == null || association.base.repo.id === pr.base.repo.id);
}

async function listCandidates(github, owner, repo, headBranch) {
  const collected = new Map();
  let truncated = false;
  for (const status of ACTIVE) {
    for (let page = 1; page <= 5; page++) {
      const response = (await github.rest.actions.listWorkflowRunsForRepo({
        owner, repo, branch: headBranch, status, event: 'pull_request',
        per_page: 100, page,
      })).data;
      if (!Array.isArray(response.workflow_runs) ||
          !Number.isSafeInteger(response.total_count)) throw Error('INCOMPLETE_RUN_PAGE');
      for (const run of response.workflow_runs) collected.set(run.id, run);
      if (response.workflow_runs.length < 100) break;
      if (page === 5) truncated = true;
    }
  }
  return {runs: [...collected.values()].sort((a,b) => a.id - b.id), truncated};
}

async function uniquePRHeadBranch(github, owner, repo, pr) {
  const response = (await github.rest.pulls.list({
    owner, repo, head: owner + ':' + pr.head.ref, state: 'all', per_page: 100, page: 1,
  })).data;
  // Reject incomplete inventory, reused branches, cross-base or parallel PRs.
  return Array.isArray(response) && response.length === 1 &&
    response[0]?.number === pr.number &&
    response[0]?.head?.repo?.full_name === REPOSITORY &&
    response[0]?.head?.sha === pr.head.sha;
}

async function cleanup({github, context, core = {info(){}}, dryRun, maxCancels = MAX_RUNS_PER_PR} = {}) {
  const event = trustedEvent(context);
  if (dryRun !== undefined && event.dryRun === false && dryRun === true) {
    // Unit-test / operator preview can only make the event less mutating.
    event.dryRun = true;
  }
  const {owner, repo} = context.repo;
  const pr = (await github.rest.pulls.get({owner,repo,pull_number:event.number})).data;
  if (!closedProductionPR(pr, event.number, event.headSha)) {
    return {pr:event.number, reason:'NO_LONGER_CLOSED_UNMERGED_PRODUCTION_PR',
      dryRun:event.dryRun, scanned:0, eligible:0, accepted:[], confirmed:[], skipped:0, errors:[], partial:false};
  }
  const {runs, truncated} = await listCandidates(github, owner, repo, pr.head.ref);
  const summary = {pr:event.number, reason:'COMPLETE', dryRun:event.dryRun,
    scanned:runs.length, eligible:0, accepted:[], confirmed:[],
    wouldCancel:[], skipped:0, errors:[], partial:truncated};
  const missingAssociation = runs.some(r => Array.isArray(r.pull_requests) && r.pull_requests.length === 0);
  let uniqueBranch = false;
  if (missingAssociation) {
    try { uniqueBranch = await uniquePRHeadBranch(github, owner, repo, pr); }
    catch(error) { summary.partial = true; core.info('HH_CLOSED_PR_BRANCH_PROOF_UNAVAILABLE '+String(error)); }
  }
  const limit = Math.max(1, Math.min(MAX_RUNS_PER_PR, Number(maxCancels) || MAX_RUNS_PER_PR));
  for (const item of runs) {
    if (summary.accepted.length + summary.wouldCancel.length >= limit) { summary.partial = true; break; }
    if (!eligible(item,pr,uniqueBranch)) { summary.skipped++; continue; }
    // Re-read both resources immediately before ANY write. Reopened, merged,
    // rewritten or independently re-run PRs must retain their checks.
    const [runResponse, prResponse] = await Promise.all([
      github.rest.actions.getWorkflowRun({owner,repo,run_id:item.id}),
      github.rest.pulls.get({owner,repo,pull_number:event.number}),
    ]);
    const liveRun = runResponse.data, livePR = prResponse.data;
    if (!closedProductionPR(livePR, event.number, event.headSha) ||
        !sameClosedPR(pr,livePR) ||
        !eligible(liveRun,livePR,uniqueBranch) ||
        liveRun.head_sha !== item.head_sha) { summary.skipped++; continue; }
    summary.eligible++;
    if (event.dryRun) {summary.wouldCancel.push(item.id);continue;}
    try {
      await github.rest.actions.cancelWorkflowRun({owner,repo,run_id:item.id});
      summary.accepted.push(item.id);
      // POST accepted != terminal cancelled. Never force-cancel.
      const verified = (await github.rest.actions.getWorkflowRun({owner,repo,run_id:item.id})).data;
      if (verified.status === 'completed' && verified.conclusion === 'cancelled') {
        summary.confirmed.push(item.id);
      }
    } catch(error) {
      let finished = false;
      try {finished=(await github.rest.actions.getWorkflowRun({owner,repo,run_id:item.id})).data.status==='completed';}
      catch {}
      if (!finished) summary.errors.push({id:item.id, message:String(error.message||error).slice(0,140)});
    }
  }
  core.info('HH_CLOSED_PR_CLEANUP '+JSON.stringify(summary));
  return summary;
}

module.exports = {REPOSITORY,PRODUCTION,CONTROL,trustedEvent,closedProductionPR,
  sameClosedPR,eligible,listCandidates,uniquePRHeadBranch,cleanup};
