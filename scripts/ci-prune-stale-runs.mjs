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
  // PR target workflow must execute BASE-owned script, never untrusted PR code.
  // GitHub executes pull_request_target on the repository default ref even
  // for PRs whose BASE is the protected nondefault production branch.
  // Trust only those two known refs; the payload still proves exact PR,
  // repository, base, same-repo HEAD and immutable synchronize before/after.
  const trustedRunnerRef = env.GITHUB_REF === 'refs/heads/' + TARGET ||
    env.GITHUB_REF === 'refs/heads/codex/bootstrap-books';
  if (env.GITHUB_EVENT_NAME === 'pull_request_target' && trustedRunnerRef &&
      event?.action === 'synchronize' && event?.repository?.full_name === env.GITHUB_REPOSITORY &&
      pr?.base?.ref === TARGET && pr?.head?.repo?.full_name === env.GITHUB_REPOSITORY &&
      Number.isSafeInteger(pr?.number) && pr.number > 0 &&
      /^[a-f0-9]{40}$/i.test(event.before || '') && /^[a-f0-9]{40}$/i.test(event.after || '') &&
      event.before !== event.after && event.after === pr.head.sha) {
    return { repo: env.GITHUB_REPOSITORY, target: TARGET, number: pr.number, headSha: event.after };
  }
  throw Error('Not a trusted production push or verified same-repo synchronize');
}

const sha40 = value => typeof value === 'string' && /^[a-f0-9]{40}$/i.test(value);
const CORE_FORCE_PATH = '.github/workflows/hh-pr-core-release.yml';
// Only browser-focused workflows may be interrupted after a runner started.
// A stale source SHA alone does not authorize cancelling an active Core,
// Specialist, Repair, merge, or independent non-browser verification.
const IN_PROGRESS_BROWSER_WORKFLOWS = new Set([
  '.github/workflows/ia-v2.yml',
  '.github/workflows/site-video-browser.yml',
  '.github/workflows/hh-app-browser.yml',
  '.github/workflows/hh-app-r1.yml',
  '.github/workflows/hh-messages-wellness-browser.yml',
  '.github/workflows/practice-visual-browser.yml',
]);
const isRunningBrowserWorkflow = path => typeof path === 'string' &&
  [...IN_PROGRESS_BROWSER_WORKFLOWS].some(file =>
    path === file || path.startsWith(file + '@refs/'));
const CORE_FORCE_JOBS = new Set(['classify-change', 'core-lint-types-build', 'hh-core-verified',
  'hh-specialist', 'hh-merge-check', 'release-ready']);

export function eligible(run, pr, ctx) {
  if (!run || run.event !== 'pull_request' ||
      (run.status !== 'queued' && !(ctx.headSha && run.status === 'in_progress')) ||
      (run.status === 'in_progress' && !isRunningBrowserWorkflow(run.path)) ||
      run.pull_requests?.length !== 1 || run.pull_requests[0]?.number !== pr?.number ||
      (ctx.number && pr.number !== ctx.number) ||
      run.pull_requests[0]?.base?.ref !== TARGET || pr.base?.ref !== TARGET ||
      run.head_repository?.full_name !== ctx.repo || pr.head?.repo?.full_name !== ctx.repo ||
      run.head_branch !== pr.head?.ref || run.pull_requests[0]?.head?.ref !== run.head_branch ||
      !sha40(run.head_sha) || !sha40(run.pull_requests[0]?.head?.sha) || !sha40(pr.head?.sha)) return false;
  // The association can report today's PR head, not the run's original head.
  // A different run SHA is only a candidate: ancestry is proved before cancel.
  return pr.state === 'open' && (!ctx.headSha || pr.head.sha === ctx.headSha) &&
    run.head_sha.toLowerCase() !== pr.head.sha.toLowerCase();
}

export async function prune(api, ctx, { limit = 300, dryRun = false,
  sleep = ms => new Promise(resolve => setTimeout(resolve, ms)), settleMs = 30_000 } = {}) {
  const max = Math.min(500, int(limit) || 300);
  const current = ctx.number ? await api.pr(ctx.number) : null;
  const found = [];
  let truncated = false;
  // The event handler may cancel an already-running old HEAD; production push
  // cleanup remains queued-only. Current HEAD is guarded by an exact event lease.
  const filters = ctx.headSha ? ['queued', 'in_progress'] : ['queued'];
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
  const summary = { scanned: found.length, candidates: 0, cancelled: [], forced: [], confirmed: [], dryRun: [], errors: [], partial: truncated };
  const accepted = new Map();
  const baseWorkflows = new Map();
  const seen = new Set();
  for (const run of found) {
    if (summary.cancelled.length + summary.dryRun.length >= max) { summary.partial = true; break; }
    if (seen.has(run.id)) continue;
    seen.add(run.id);
    if (run.event !== 'pull_request' || (run.status !== 'queued' && !(ctx.headSha && run.status === 'in_progress')) ||
        run.pull_requests?.length !== 1 || !int(run.id)) continue;
    const n = int(run.pull_requests[0].number);
    if (!n || (ctx.number && n !== ctx.number)) continue;
    let pr = cache.get(n);
    if (!pr) { pr = await api.pr(n); cache.set(n, pr); }
    if (!eligible(run, pr, ctx)) continue;
    summary.candidates++;
    // Read BOTH objects again before POST: a queued run may have started and a PR HEAD may have moved.
    const [freshRun, freshPR] = await Promise.all([api.run(run.id), api.pr(n)]);
    if (!eligible(freshRun, freshPR, ctx) || freshRun.head_sha !== run.head_sha) continue;
    // Only an ancestor of the live branch HEAD is provably obsolete. Synthetic
    // merge commits and rewritten histories are held unless ancestry proves it.
    let relation;
    try { relation = await api.compare(freshRun.head_sha, freshPR.head.sha); }
    catch { summary.partial = true; continue; }
    if (relation?.status !== 'ahead' || !Number.isSafeInteger(relation.ahead_by) || relation.ahead_by < 1) continue;
    // Re-read after the network compare: neither a new HEAD nor a started job
    // may be acted on using stale evidence.
    const [verifiedRun, verifiedPR] = await Promise.all([api.run(run.id), api.pr(n)]);
    if (!eligible(verifiedRun, verifiedPR, ctx) || verifiedRun.head_sha !== freshRun.head_sha ||
        verifiedPR.head.sha !== freshPR.head.sha) continue;
    if (dryRun) { summary.dryRun.push(run.id); continue; }
    try { await api.cancel(run.id); summary.cancelled.push(run.id); accepted.set(run.id, {number:n, head:freshRun.head_sha, path:verifiedRun.path}); }
    catch (e) {
      // Another janitor may have cancelled the same run between GET and POST.
      const after = await api.run(run.id).catch(() => null);
      if (after?.status === freshRun.status) summary.errors.push({ id: run.id, status: String(e.message || e).slice(0, 100) });
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
          const relation = await api.compare(checked.head_sha, currentPR.head.sha);
          if (relation?.status === 'ahead' && Number.isSafeInteger(relation.ahead_by) && relation.ahead_by > 0) {
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

export function client(repo, token, transport = fetch) {
  const prefix = 'https://api.github.com/repos/' + repo;
  async function call(path, method = 'GET') {
    const resp = await transport(prefix + path, { method, headers: {
      Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28',
    } });
    if (!resp.ok) throw Error('GitHub ' + method + ' ' + path.split('?')[0] + ': HTTP ' + resp.status);
    return method === 'POST' ? true : resp.json();
  }
  return {
    pr: (n) => call('/pulls/' + n),
    run: (id) => call('/actions/runs/' + id),
    cancel: (id) => call('/actions/runs/' + id + '/cancel', 'POST'),
    forceCancel: (id) => call('/actions/runs/' + id + '/force-cancel', 'POST'),
    workflowBlob: (ref) => call('/contents/' + CORE_FORCE_PATH + '?' + new URLSearchParams({ref})),
    compare: (base, head) => call('/compare/' + base + '...' + head),
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
  if (!ctx.headSha) {
    try {
      m = await observeCI(client(ctx.repo, env.GITHUB_TOKEN), {
        windowMinutes: int(env.HH_CI_WINDOW_MINUTES) || 60,
        sampleRuns: int(env.HH_CI_JOB_SAMPLE) || 20,
      });
    } catch (e) { metricError = String(e.message || e).slice(0, 150); }
  }
  const fmt = ms => ms == null ? 'n/a' : (ms / 60000).toFixed(2) + ' min';
  const msg = (ctx.headSha ? 'CI targeted stale-HEAD prune: ' : 'CI queued-only prune: ') +
    'scanned=' + s.scanned + ' eligible=' + s.candidates +
    ' cancelled=' + s.cancelled.length + ' dry_run=' + s.dryRun.length + ' errors=' + s.errors.length +
    '\nCancellation accepted IDs: ' + (s.cancelled.join(',') || 'none') + '\n' +
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
    candidates: s.candidates, cancelAccepted: s.cancelled.length, forceAccepted: s.forced.length, cancelConfirmed: s.confirmed.length,
    partial: s.partial, errors: s.errors.length, snapshot: m, metricError }));
  if (env.GITHUB_STEP_SUMMARY) appendFileSync(env.GITHUB_STEP_SUMMARY, msg);
  if (s.errors.length) { console.error(s.errors); process.exitCode = 1; }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch(e => { console.error(String(e.message || e)); process.exitCode = 1; });
}
