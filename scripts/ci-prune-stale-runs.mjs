// Trusted production-branch cleanup; never execute code from a PR HEAD.
import { readFileSync, appendFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const TARGET = 'codex/public-book-library';
const int = (v) => Number.isSafeInteger(Number(v)) && Number(v) > 0 ? Number(v) : null;

export function context(env, event) {
  if (!env.GITHUB_TOKEN || !/^[-\w.]+\/[-\w.]+$/.test(env.GITHUB_REPOSITORY || '')) throw Error('Invalid Actions identity');
  if (env.GITHUB_EVENT_NAME === 'push' && env.GITHUB_REF === 'refs/heads/' + TARGET &&
      event?.ref === 'refs/heads/' + TARGET && event?.repository?.full_name === env.GITHUB_REPOSITORY) {
    return { repo: env.GITHUB_REPOSITORY, target: TARGET, number: null };
  }
  const pr = event?.pull_request;
  // PR-target jobs execute trusted default/base code, NEVER PR HEAD code.
  const trustedRunnerRef = env.GITHUB_REF === 'refs/heads/' + TARGET ||
    env.GITHUB_REF === 'refs/heads/codex/bootstrap-books';
  const trustedPR = env.GITHUB_EVENT_NAME === 'pull_request_target' && trustedRunnerRef &&
    event?.repository?.full_name === env.GITHUB_REPOSITORY &&
    pr?.base?.ref === TARGET && pr?.head?.repo?.full_name === env.GITHUB_REPOSITORY &&
    Number.isSafeInteger(pr?.number) && pr.number > 0 && sha40(pr?.head?.sha);
  if (trustedPR && event.action === 'closed' && pr.state === 'closed') {
    return { repo: env.GITHUB_REPOSITORY, target: TARGET, number: pr.number,
      closedHeadSha: pr.head.sha };
  }
  if (trustedPR && event.action === 'synchronize' &&
      sha40(event.before) && sha40(event.after) &&
      event.before !== event.after && event.after === pr.head.sha) {
    return { repo: env.GITHUB_REPOSITORY, target: TARGET, number: pr.number, headSha: event.after };
  }
  throw Error('Not a trusted production push, PR synchronize, or PR close event');
}

const sha40 = value => typeof value === 'string' && /^[a-f0-9]{40}$/i.test(value);
const CORE_FORCE_PATH = '.github/workflows/hh-pr-core-release.yml';
// Only browser-focused workflow execution is interruptible after a runner starts.
// For closed-unmerged PRs, keep the separately proven exact-SHA cleanup policy.
const IN_PROGRESS_BROWSER_WORKFLOWS = new Set([
  '.github/workflows/ia-v2.yml',
  '.github/workflows/site-video-browser.yml',
  '.github/workflows/hh-app-browser.yml',
  '.github/workflows/hh-app-r1.yml',
  '.github/workflows/hh-messages-wellness-browser.yml',
  '.github/workflows/practice-visual-browser.yml',
]);
const isRunningBrowserWorkflow = value => typeof value === 'string' &&
  [...IN_PROGRESS_BROWSER_WORKFLOWS].some(file =>
    value === file || value.startsWith(file + '@refs/'));
const CORE_FORCE_JOBS = new Set(['classify-change', 'core-lint-types-build', 'hh-core-verified',
  'hh-specialist', 'hh-merge-check', 'hh-eslint-repair', 'release-ready']);

// Only a long-abandoned run from a separately proved merged PR can be
// cancelled after GitHub reports it as still in_progress. Open PRs and
// current HEADs keep the original strict cleanup policy.
const MERGED_ORPHAN_RUNNING_GRACE_MS = 6 * 60 * 60_000;
const historicalOrphanStatus = (run, now = Date.now()) => {
  if (run?.status === 'queued') return true;
  if (run?.status !== 'in_progress') return false;
  const createdAt = Date.parse(run.created_at || '');
  return Number.isFinite(createdAt) && Number.isFinite(now) &&
    now >= createdAt + MERGED_ORPHAN_RUNNING_GRACE_MS;
};

// GitHub may erase workflow_runs[].pull_requests after PR closure.
// A trusted production-push janitor can also prove historical ancestry through
// GitHub's commit-to-PR association API, an exact merged PR and Compare API.
// Never infer an obsolete run from its branch name, age or status alone.
export function closedEvidence(run, pr) {
  if (pr?.state !== 'closed' || !Array.isArray(run?.pull_requests) ||
      run.pull_requests.length > 1 || run.head_sha !== pr.head?.sha) return false;
  const created = Date.parse(run.created_at || '');
  const opened = Date.parse(pr.created_at || '');
  const closed = Date.parse(pr.closed_at || '');
  if (![created, opened, closed].every(Number.isFinite) ||
      created < opened || created > closed) return false;
  if (run.pull_requests.length === 0) return true;
  const linked = run.pull_requests[0];
  return linked?.number === pr.number && linked?.base?.ref === TARGET &&
    linked?.head?.ref === pr.head.ref && linked?.head?.sha === run.head_sha;
}


/**
 * Production-push-only proof for orphaned queued checks and abandoned running
 * checks from already merged PRs (running requires a separate six-hour grace).
 * A unique GitHub commit->PR association is mandatory; ancestry is *separately*
 * proved via Compare before cancellation. Never cover open or unmerged PRs.
 */
export function orphanClosedEvidence(run, pr, ctx, linked) {
  if (!ctx || ctx.number || ctx.headSha || ctx.closedHeadSha ||
      !run || run.event !== 'pull_request' || !historicalOrphanStatus(run) ||
      !Array.isArray(run.pull_requests) || run.pull_requests.length !== 0 ||
      !Number.isSafeInteger(Number(run.id)) || Number(run.id) < 1 ||
      !pr || pr.state !== 'closed' || !pr.merged_at ||
      !Number.isSafeInteger(pr.number) || pr.number < 1 ||
      pr.base?.ref !== TARGET || run.head_repository?.full_name !== ctx.repo ||
      pr.head?.repo?.full_name !== ctx.repo || run.head_branch !== pr.head.ref ||
      !sha40(run.head_sha) || !sha40(pr.head.sha) || run.head_sha === pr.head.sha ||
      !linked || linked.number !== pr.number || linked.state !== 'closed' ||
      !linked.merged_at || linked.base?.ref !== TARGET ||
      linked.head?.repo?.full_name !== ctx.repo ||
      linked.head?.ref !== pr.head.ref || linked.head?.sha !== pr.head.sha ||
      linked.merged_at !== pr.merged_at) return false;
  const created = Date.parse(run.created_at || '');
  const opened = Date.parse(pr.created_at || '');
  const closed = Date.parse(pr.closed_at || '');
  const merged = Date.parse(pr.merged_at || '');
  return [created, opened, closed, merged].every(Number.isFinite) &&
    created >= opened && created <= closed && merged <= closed &&
    merged >= opened;
}

export function eligible(run, pr, ctx) {
  if (!run || run.event !== 'pull_request' ||
      (run.status !== 'queued' && run.status !== 'in_progress') ||
      (run.status === 'in_progress' && !(ctx.headSha || ctx.closedHeadSha)) ||
      !pr || !Number.isSafeInteger(pr.number) || pr.number < 1 ||
      (ctx.number && pr.number !== ctx.number) ||
      pr.base?.ref !== TARGET || run.head_repository?.full_name !== ctx.repo ||
      pr.head?.repo?.full_name !== ctx.repo || run.head_branch !== pr.head?.ref ||
      !sha40(run.head_sha) || !sha40(pr.head?.sha)) return false;
  if (pr.state === 'closed') {
    return !ctx.headSha && (!ctx.number || (Boolean(ctx.closedHeadSha) && ctx.closedHeadSha === pr.head.sha)) &&
      closedEvidence(run, pr);
  }
  if (pr.state !== 'open' || ctx.closedHeadSha ||
      !Array.isArray(run.pull_requests) || run.pull_requests.length !== 1) return false;
  // A stale open PR may cancel in-progress browser jobs only, never Core,
  // Specialist, Repair or unrelated checks. Closed-PR cleanup remains separate.
  if (run.status === 'in_progress' && !isRunningBrowserWorkflow(run.path)) return false;
  const linked = run.pull_requests[0];
  if (linked?.number !== pr.number || linked?.base?.ref !== TARGET ||
      linked?.head?.ref !== run.head_branch || !sha40(linked?.head?.sha)) return false;
  // Open PR HEADs must still be ancestor-proven separately, never guessed.
  return (!ctx.headSha || pr.head.sha === ctx.headSha) && run.head_sha !== pr.head.sha;
}

export async function prune(api, ctx, { limit = 300, dryRun = false,
  sleep = ms => new Promise(resolve => setTimeout(resolve, ms)), settleMs = 30_000 } = {}) {
  const max = Math.min(500, int(limit) || 300);
  const current = ctx.number ? await api.pr(ctx.number) : null;
  const found = [];
  let truncated = false;
  // Targeted events preserve their existing policy. A production push also
  // scans abandoned in-progress PR runs first, but only after independent
  // merged-PR association, ancestry and age proofs (no running open-PR jobs).
  const filters = (ctx.headSha || ctx.closedHeadSha)
    ? ['queued', 'in_progress'] : ['in_progress', 'queued'];
  for (const status of filters) {
    for (let page = 1; page <= 10; page++) {
      const res = await api.list(page, current?.head?.ref, status);
      if (!Array.isArray(res.workflow_runs)) throw Error('Unexpected GitHub runs response');
      found.push(...res.workflow_runs);
      if (res.workflow_runs.length < 100) break;
      if (page === 10) truncated = true;
    }
  }
  const cache = new Map(current ? [[ctx.number, current]] : []);
  let closedScanPartial = false;
  const recentClosed = new Map();
  // Production pushes sweep orphaned queued runs from recently closed PRs,
  // including those that were closed before this event handler was installed.
  if (!ctx.number && typeof api.commitPulls !== 'function' &&
      typeof api.closed === 'function' &&
      found.some(run => run.event === 'pull_request' && run.status === 'queued' &&
        Array.isArray(run.pull_requests) && run.pull_requests.length === 0)) {
    try {
      const earliest = Date.now() - 7 * 24 * 60 * 60_000;
      for (let page = 1; page <= 3; page++) {
        const rows = await api.closed(page);
        if (!Array.isArray(rows)) throw Error('Invalid closed-PR response');
        for (const pr of rows) {
          const closed = Date.parse(pr.closed_at || '');
          if (pr.state !== 'closed' || !Number.isFinite(closed) || closed < earliest ||
              pr.base?.ref !== TARGET || pr.head?.repo?.full_name !== ctx.repo ||
              !sha40(pr.head?.sha)) continue;
          const key = pr.head.ref + ':' + pr.head.sha;
          if (!recentClosed.has(key)) recentClosed.set(key, []);
          recentClosed.get(key).push(pr);
        }
        if (rows.length < 100) break;
        if (page === 3) closedScanPartial = true;
      }
    } catch { closedScanPartial = true; }
  }
  const summary = { scanned: found.length, candidates: 0, closedCandidates: 0,
    cancelled: [], cancelledRunning: [], forced: [], confirmed: [], dryRun: [], errors: [], jobless409: [],
    staleRunningMetadata: [],
    partial: truncated || closedScanPartial };
  const accepted = new Map();
  const baseWorkflows = new Map();
  // Exact SHA is immutable. Cache verified commit associations across queued
  // checks; bound unique API lookups per production push to prevent CI bursts.
  const commitAssociations = new Map();
  let orphanLookups = 0, orphanAncestors = 0;
  const seen = new Set();
  for (const run of found) {
    if (summary.cancelled.length + summary.dryRun.length >= max) { summary.partial = true; break; }
    if (seen.has(run.id)) continue;
    seen.add(run.id);
    if (run.event !== 'pull_request' ||
        (run.status !== 'queued' && run.status !== 'in_progress') ||
        (run.status === 'in_progress' && !(ctx.headSha || ctx.closedHeadSha) &&
          !historicalOrphanStatus(run)) ||
        !int(run.id) || !Array.isArray(run.pull_requests) || run.pull_requests.length > 1) continue;
    let n, association = null;
    if (ctx.number) {
      n = ctx.number;
    } else if (run.pull_requests.length === 1) {
      n = int(run.pull_requests[0].number);
    } else {
      const matches = (recentClosed.get(run.head_branch + ':' + run.head_sha) || [])
        .filter(pr => eligible(run, pr, ctx));
      if (matches.length === 1) {
        n = matches[0].number;
      } else if (matches.length > 1) {
        summary.partial = true;
        continue;
      } else if (typeof api.commitPulls === 'function' && sha40(run.head_sha)) {
        if (!commitAssociations.has(run.head_sha)) {
          if (orphanLookups >= 36) { summary.partial = true; continue; }
          orphanLookups++;
          try {
            const result = await api.commitPulls(run.head_sha);
            commitAssociations.set(run.head_sha, Array.isArray(result) ? result : null);
          } catch { summary.partial = true; commitAssociations.set(run.head_sha, null); }
        }
        const result = commitAssociations.get(run.head_sha);
        if (!Array.isArray(result) || result.length !== 1) {
          if (!Array.isArray(result) || (result && result.length > 1)) summary.partial = true;
          continue;
        }
        association = result[0];
        n = int(association?.number);
      } else {
        continue;
      }
    }
    if (!n) continue;
    let pr = cache.get(n);
    if (!pr) { pr = await api.pr(n); cache.set(n, pr); }
    const historical = Boolean(association) && orphanClosedEvidence(run, pr, ctx, association);
    if (!eligible(run, pr, ctx) && !historical) continue;
    summary.candidates++;
    if (pr.state === 'closed') summary.closedCandidates++;
    // Re-read both objects before POST; exact SHA, state, branch and association
    // remain immutable. Historical orphans also require real ancestry proof.
    const [freshRun, freshPR] = await Promise.all([api.run(run.id), api.pr(n)]);
    const freshEligible = historical
      ? orphanClosedEvidence(freshRun, freshPR, ctx, association)
      : eligible(freshRun, freshPR, ctx);
    if (!freshEligible || freshRun.status !== run.status ||
        freshRun.head_sha !== run.head_sha || freshRun.path !== run.path) continue;
    if (freshPR.state === 'open' || historical) {
      let relation;
      try { relation = await api.compare(freshRun.head_sha, freshPR.head.sha); }
      catch { summary.partial = true; continue; }
      if (relation?.status !== 'ahead' || !Number.isSafeInteger(relation.ahead_by) || relation.ahead_by < 1 ||
          !Number.isSafeInteger(relation.behind_by ?? 0) || (relation.behind_by ?? 0) !== 0) continue;
    }
    // Re-read after the compare: a queued check must never become a running or
    // current check between proof and cancellation.
    const [verifiedRun, verifiedPR] = await Promise.all([api.run(run.id), api.pr(n)]);
    const lastEligible = historical
      ? orphanClosedEvidence(verifiedRun, verifiedPR, ctx, association)
      : eligible(verifiedRun, verifiedPR, ctx);
    if (!lastEligible || verifiedRun.status !== freshRun.status ||
        verifiedRun.head_sha !== freshRun.head_sha ||
        verifiedRun.path !== freshRun.path || verifiedPR.head.sha !== freshPR.head.sha) continue;
    if (historical) orphanAncestors++;
    // GitHub sometimes marks a run in_progress for days even though EVERY
    // actual job has completed. Cancel returns 409; this is an API ghost,
    // not active runner capacity. Require complete live job evidence before
    // acting on an old, merged PR's allegedly running workflow.
    if (historical && verifiedRun.status === 'in_progress') {
      let page;
      try { page = await api.jobs(run.id); } catch { summary.partial = true; continue; }
      if (!Number.isSafeInteger(page?.total_count) || page.total_count < 1 ||
          page.total_count > 100 || !Array.isArray(page.jobs) ||
          page.jobs.length !== page.total_count) {
        summary.partial = true;
        continue;
      }
      if (page.jobs.every(job => job?.status === 'completed')) {
        summary.staleRunningMetadata.push({id:run.id,
          reason:'RUN_IN_PROGRESS_ALL_JOBS_COMPLETED',
          url:'https://github.com/' + ctx.repo + '/actions/runs/' + run.id});
        summary.partial = true; // Never count this as successfully cancelled.
        continue;
      }
      // Unknown/unindexed terminal states must also never authorize cancel.
      if (!page.jobs.some(job => ['queued','in_progress','waiting','pending','requested'].includes(job?.status))) {
        summary.partial = true;
        continue;
      }
    }
    if (dryRun) { summary.dryRun.push(run.id); continue; }
    try {
      await api.cancel(run.id);
      summary.cancelled.push(run.id);
      if (verifiedRun.status === 'in_progress') summary.cancelledRunning.push(run.id);
      accepted.set(run.id, {number:n, head:freshRun.head_sha, path:verifiedRun.path});
    }
    catch (e) {
      // Another janitor may have cancelled the same run between GET and POST.
      const after = await api.run(run.id).catch(() => null);
      if (after?.status === freshRun.status) {
        const message = String(e.message || e).slice(0, 100);
        // GitHub can retain a queued, jobless run and reject both cancellation
        // endpoints with HTTP 409. This is NOT a real runner wait or success.
        // Record exact evidence without retry/force-cancel or failing protected CI.
        if (after.status === 'queued' && /HTTP 409\b/.test(message)) {
          const jobs = await api.jobs(run.id).catch(() => null);
          if (jobs?.total_count === 0 && Array.isArray(jobs.jobs) && jobs.jobs.length === 0) {
            summary.jobless409.push({ id: run.id, reason: 'GITHUB_QUEUED_ZERO_JOBS_CANCEL_409',
              url: 'https://github.com/' + ctx.repo + '/actions/runs/' + run.id });
            summary.partial = true;
            continue;
          }
        }
        // Jobs can finish between the preflight and POST. A real GitHub 409
        // with an immutable run status and complete terminal job listing is
        // another metadata ghost, never grounds for force cancellation.
        if (after.status === 'in_progress' && /HTTP 409\b/.test(message)) {
          const page = await api.jobs(run.id).catch(() => null);
          if (Number.isSafeInteger(page?.total_count) && page.total_count > 0 &&
              page.total_count <= 100 && Array.isArray(page.jobs) &&
              page.jobs.length === page.total_count &&
              page.jobs.every(job => job?.status === 'completed')) {
            summary.staleRunningMetadata.push({id:run.id,
              reason:'GITHUB_IN_PROGRESS_TERMINAL_JOBS_CANCEL_409',
              url:'https://github.com/' + ctx.repo + '/actions/runs/' + run.id});
            summary.partial = true;
            continue;
          }
        }
        summary.errors.push({ id: run.id, status: message });
      }
    }
  }
  // A normal cancel can leave always() jobs queued and block the next SHA.
  // Wait once for the batch, then force only still-queued, proven-stale runs
  // with complete job evidence and no running job. Never force dry runs.
  if ([...accepted.values()].some(item => item.path === CORE_FORCE_PATH) && typeof api.forceCancel === 'function') {
    await sleep(Math.max(0, Math.min(30_000, Number(settleMs) || 0)));
  }
  // POST accepted != confirmed cancelled. Read back the actual conclusion.
  for (const id of summary.cancelled) {
    try {
      let checked = await api.run(id);
      const previous = accepted.get(id);
      if (checked?.status === 'queued' && checked.path === CORE_FORCE_PATH && previous && typeof api.forceCancel === 'function') {
        const currentPR = await api.pr(previous.number);
        const jobPage = await api.jobs(id);
        const complete = Array.isArray(jobPage?.jobs) && jobPage.jobs.length > 0 &&
          Number.isSafeInteger(jobPage.total_count) && jobPage.total_count === jobPage.jobs.length &&
          jobPage.total_count <= 100 && jobPage.jobs.every(job => CORE_FORCE_JOBS.has(job.name) &&
            (job.status === 'completed' || job.status === 'queued'));
        if (complete && eligible(checked, currentPR, ctx) && checked.head_sha === previous.head &&
            sha40(currentPR.base?.sha)) {
          // A PR may edit the workflow itself. Force is permitted only when
          // that run's workflow is byte-identical to its trusted current base.
          const [runWorkflow, baseWorkflow] = await Promise.all([
            api.workflowBlob(checked.head_sha),
            baseWorkflows.has(currentPR.base.sha) ? baseWorkflows.get(currentPR.base.sha) : api.workflowBlob(currentPR.base.sha),
          ]);
          baseWorkflows.set(currentPR.base.sha, baseWorkflow);
          if (runWorkflow?.type !== 'file' || baseWorkflow?.type !== 'file' ||
              !sha40(runWorkflow.sha) || runWorkflow.sha !== baseWorkflow.sha) continue;
          let obsolete = currentPR.state === 'closed';
          if (!obsolete) {
            const relation = await api.compare(checked.head_sha, currentPR.head.sha);
            obsolete = relation?.status === 'ahead' &&
              Number.isSafeInteger(relation.ahead_by) && relation.ahead_by > 0;
          }
          if (obsolete) {
            const [lastRun, lastPR] = await Promise.all([api.run(id), api.pr(previous.number)]);
            if (eligible(lastRun, lastPR, ctx) && lastRun.path === CORE_FORCE_PATH && lastRun.head_sha === checked.head_sha &&
                lastPR.head.sha === currentPR.head.sha && lastPR.base?.sha === currentPR.base.sha) {
              try {
                await api.forceCancel(id);
                summary.forced.push(id);
                checked = await api.run(id);
              } catch (error) {
                checked = await api.run(id);
                if (checked?.status !== 'completed' || checked.conclusion !== 'cancelled') throw error;
              }
            }
          }
        }
      }
      if (checked?.status === 'completed' && checked.conclusion === 'cancelled') summary.confirmed.push(id);
    } catch (e) { summary.errors.push({ id, status: 'readback: ' + String(e.message || e).slice(0, 80) }); }
  }
  summary.orphanLookups = orphanLookups;
  summary.orphanAncestorCandidates = orphanAncestors;
  return summary;
}

const millis = (a, b) => {
  const x = Date.parse(a || ''), y = Date.parse(b || '');
  return Number.isFinite(x) && Number.isFinite(y) && y >= x ? y - x : null;
};
const percentile = (xs, p) => xs.length ? [...xs].sort((a, b) => a - b)[Math.ceil(xs.length * p) - 1] : null;

// Real execution time comes from job started_at/completed_at, NOT run wall duration or billing.
export function summarizeJobs(lists, now = Date.now()) {
  const waits = [], queued = [];
  let runnerMs = 0, completedJobs = 0, sampledJobs = 0, queuedJobs = 0;
  for (const list of lists) for (const job of list) {
    sampledJobs++;
    const wait = millis(job.created_at, job.started_at);
    if (wait !== null) waits.push(wait);
    const run = millis(job.started_at, job.completed_at);
    if (run !== null) { runnerMs += run; completedJobs++; }
    if (job.status === 'queued' && !job.started_at) {
      queuedJobs++;
      const age = millis(job.created_at, new Date(now).toISOString());
      if (age !== null) queued.push(age);
    }
  }
  return { runnerMs, completedJobs, sampledJobs, queuedJobs,
    waitSamples: waits.length, waitP50Ms: percentile(waits, 0.5),
    waitP95Ms: percentile(waits, 0.95), queuedAgeP95Ms: percentile(queued, 0.95) };
}

export async function observeCI(api, { windowMinutes = 60, sampleRuns = 20, now = Date.now() } = {}) {
  const since = new Date(now - windowMinutes * 60000).toISOString().replace(/\.\d{3}Z$/, 'Z');
  const runs = [];
  let truncated = false;
  for (let page = 1; page <= 10; page++) {
    const response = await api.recent(page, since);
    if (!Array.isArray(response.workflow_runs)) throw Error('Invalid CI API response');
    runs.push(...response.workflow_runs);
    if (response.total_count > 1000) truncated = true;
    if (response.workflow_runs.length < 100) break;
    if (page === 10) truncated = true;
  }
  const lists = [];
  let jobErrors = 0, incompleteJobs = 0;
  for (const run of runs.filter(r => r.event === 'pull_request' && int(r.id)).slice(0, Math.min(30, sampleRuns))) {
    try {
      const response = await api.jobs(run.id);
      if (!Array.isArray(response.jobs)) throw Error('Invalid jobs');
      lists.push(response.jobs);
      if (response.total_count > 100) incompleteJobs++;
    } catch { jobErrors++; }
  }
  return { windowMinutes, newChecks: runs.length,
    queuedChecks: runs.filter(r => r.status === 'queued').length,
    runningChecks: runs.filter(r => r.status === 'in_progress').length,
    truncated, sampledRuns: lists.length, jobErrors, incompleteJobs,
    ...summarizeJobs(lists, now) };
}

export function client(repo, token, transport = fetch,
  wait = ms => new Promise(resolve => setTimeout(resolve, ms))) {
  const prefix = 'https://api.github.com/repos/' + repo;
  async function call(path, method = 'GET') {
    // GitHub occasionally returns HTTP 503 for live PR GET, even when
    // exact HEAD is valid. Limited retries cannot weaken any PR proof.
    const prRead = method === 'GET' && /^\/pulls\/[1-9]\d*$/.test(path);
    const attempts = prRead ? 3 : 1;
    for (let attempt = 0; attempt < attempts; attempt++) {
      const resp = await transport(prefix + path, { method, headers: {
        Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28',
      } });
      if (resp.ok) return method === 'POST' ? true : resp.json();
      if (prRead && [502, 503, 504].includes(resp.status) && attempt < attempts - 1) {
        await wait(attempt === 0 ? 250 : 750);
        continue;
      }
      throw Error('GitHub ' + method + ' ' + path.split('?')[0] + ': HTTP ' + resp.status);
    }
    throw Error('GitHub PR read exhausted without successful readback');
  }

  return {
    pr: (n) => call('/pulls/' + n),
    closed: page => call('/pulls?' + new URLSearchParams({state:'closed',sort:'updated',direction:'desc',per_page:'100',page:String(page)})),
    run: (id) => call('/actions/runs/' + id),
    cancel: (id) => call('/actions/runs/' + id + '/cancel', 'POST'),
    forceCancel: (id) => call('/actions/runs/' + id + '/force-cancel', 'POST'),
    workflowBlob: (ref) => call('/contents/' + CORE_FORCE_PATH + '?' + new URLSearchParams({ref})),
    compare: (base, head) => call('/compare/' + base + '...' + head),
    // Only unique, merged PR association is accepted as orphan cleanup proof.
    commitPulls: sha => {
      if (!sha40(sha)) throw Error('Invalid commit association SHA');
      return call('/commits/' + sha + '/pulls?per_page=10');
    },
    recent: (page, since) => call('/actions/runs?' + new URLSearchParams({ event: 'pull_request', created: '>=' + since, per_page: '100', page: String(page) })),
    jobs: id => call('/actions/runs/' + id + '/jobs?per_page=100&page=1'),
    list: (page, branch, status = 'queued') => {
      if (!['queued', 'in_progress'].includes(status)) throw Error('Invalid run status');
      const query = new URLSearchParams({ status, event: 'pull_request', per_page: '100', page: String(page) });
      if (branch) query.set('branch', branch); // Performance filter; PR association is verified separately.
      return call('/actions/runs?' + query);
    },
  };
}

async function main() {
  const env = process.env;
  const ctx = context(env, JSON.parse(readFileSync(env.GITHUB_EVENT_PATH, 'utf8')));
  const s = await prune(client(ctx.repo, env.GITHUB_TOKEN), ctx, {
    limit: env.HH_CI_PRUNE_LIMIT, dryRun: env.HH_CI_PRUNE_DRY_RUN === 'true',
  });
  let m = null, metricError = null;
  if (!ctx.headSha && !ctx.closedHeadSha) {
    try {
      m = await observeCI(client(ctx.repo, env.GITHUB_TOKEN), {
        windowMinutes: int(env.HH_CI_WINDOW_MINUTES) || 60,
        sampleRuns: int(env.HH_CI_JOB_SAMPLE) || 20,
      });
    } catch (e) { metricError = String(e.message || e).slice(0, 150); }
  }
  const fmt = ms => ms == null ? 'n/a' : (ms / 60000).toFixed(2) + ' min';
  const msg = (ctx.closedHeadSha ? 'CI closed-PR cleanup: ' : ctx.headSha ? 'CI targeted stale-HEAD prune: ' : 'CI merged-PR orphan prune: ') +
    'scanned=' + s.scanned + ' eligible=' + s.candidates + ' closed_PR_eligible=' + s.closedCandidates +
    ' cancelled=' + s.cancelled.length + ' old_running_cancelled=' + s.cancelledRunning.length + ' dry_run=' + s.dryRun.length +
    ' orphan_proofs=' + s.orphanAncestorCandidates + ' orphan_lookups=' + s.orphanLookups +
    ' jobless_409=' + s.jobless409.length + ' running_metadata_ghosts=' + s.staleRunningMetadata.length + ' errors=' + s.errors.length +
    '\nCancellation accepted IDs: ' + (s.cancelled.join(',') || 'none') +
    '\nGitHub queued/jobless 409 (unresolved, not cancelled): ' +
    (s.jobless409.slice(0, 8).map(x => x.url).join(', ') || 'none') + '\n' +
    'GitHub in-progress runs with all jobs terminal (unresolved): ' +
    (s.staleRunningMetadata.slice(0, 8).map(x => x.url).join(', ') || 'none') + '\n' +
    '\n## CI queue monitoring\n\n| Metric | Observation |\n| --- | --- |\n' +
    '| New PR workflow checks (last 60 min) | ' + (m ? m.newChecks + (m.truncated ? ' (PARTIAL)' : '') : 'n/a') + ' |\n' +
    '| Queued / running checks (last 60 min) | ' + (m ? m.queuedChecks + ' / ' + m.runningChecks : 'n/a') + ' |\n' +
    '| Superseded: cancel accepted / forced / confirmed | ' + s.cancelled.length + ' / ' + s.forced.length + ' / ' + s.confirmed.length + ' |\n' +
    '| Job/runner start wait p50 / p95 (sample) | ' + (m ? fmt(m.waitP50Ms) + ' / ' + fmt(m.waitP95Ms) + ' (n=' + m.waitSamples + ')' : 'n/a') + ' |\n' +
    '| Pending jobs; p95 queued age (sample) | ' + (m ? m.queuedJobs + '; ' + fmt(m.queuedAgeP95Ms) : 'n/a') + ' |\n' +
    '| Actual completed job execution (sample) | ' + (m ? fmt(m.runnerMs) + ' across ' + m.completedJobs + ' jobs / ' + m.sampledRuns + ' runs' : 'n/a') + ' |\n' +
    '| Coverage | ' + (s.partial ? 'Queue scan limited; ' : '') + (m ? 'job fetch errors ' + m.jobErrors + ', partial job pages ' + m.incompleteJobs : 'metrics unavailable') + ' |\n\n' +
    'POST accepted is not a confirmed cancelled conclusion. Job start wait may include dependencies/concurrency; it does not prove runner shortage. Sampled job execution is not GitHub billing or summed workflow wall time.\n' +
    (metricError ? 'Metrics error: ' + metricError + '\n' : '');
  console.log(msg);
  console.log('HH_CI_QUEUE_METRICS ' + JSON.stringify({ at: new Date().toISOString(), scanned: s.scanned,
    candidates: s.candidates, closedCandidates: s.closedCandidates, orphanLookups: s.orphanLookups,
    orphanAncestorCandidates: s.orphanAncestorCandidates,
    cancelAccepted: s.cancelled.length, forceAccepted: s.forced.length, cancelConfirmed: s.confirmed.length,
    partial: s.partial, errors: s.errors.length, jobless409: s.jobless409.length,
    runningMetadataGhosts: s.staleRunningMetadata.length,
    jobless409RunIds: s.jobless409.slice(0, 8).map(x => x.id), snapshot: m, metricError }));
  if (env.GITHUB_STEP_SUMMARY) appendFileSync(env.GITHUB_STEP_SUMMARY, msg);
  if (s.errors.length) { console.error(s.errors); process.exitCode = 1; }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch(e => { console.error(String(e.message || e)); process.exitCode = 1; });
}
