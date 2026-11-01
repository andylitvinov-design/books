// Trusted production-branch cleanup; never execute code from a PR HEAD.
import { readFileSync, appendFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const TARGET = 'codex/public-book-library';
const int = (v) => Number.isSafeInteger(Number(v)) && Number(v) > 0 ? Number(v) : null;

export function context(env, event) {
  if (!env.GITHUB_TOKEN || !/^[-\w.]+\/[-\w.]+$/.test(env.GITHUB_REPOSITORY || '')) throw Error('Invalid Actions identity');
  if (env.GITHUB_EVENT_NAME !== 'push' || env.GITHUB_REF !== 'refs/heads/' + TARGET ||
      event?.ref !== 'refs/heads/' + TARGET || event?.repository?.full_name !== env.GITHUB_REPOSITORY) {
    throw Error('Not the verified production push event');
  }
  return { repo: env.GITHUB_REPOSITORY, target: TARGET, number: null };
}

const sha40 = value => typeof value === 'string' && /^[a-f0-9]{40}$/i.test(value);

export function eligible(run, pr, ctx) {
  if (!run || run.event !== 'pull_request' || run.status !== 'queued' ||
      run.pull_requests?.length !== 1 || run.pull_requests[0]?.number !== pr?.number ||
      (ctx.number && pr.number !== ctx.number) ||
      run.pull_requests[0]?.base?.ref !== TARGET || pr.base?.ref !== TARGET ||
      run.head_repository?.full_name !== ctx.repo || pr.head?.repo?.full_name !== ctx.repo ||
      run.head_branch !== pr.head?.ref || run.pull_requests[0]?.head?.ref !== run.head_branch ||
      !sha40(run.head_sha) || !sha40(run.pull_requests[0]?.head?.sha) || !sha40(pr.head?.sha)) return false;
  // GitHub PR run.head_sha can be a synthetic merge SHA, not the actual PR head.
  return pr.state === 'open' && run.pull_requests[0].head.sha.toLowerCase() !== pr.head.sha.toLowerCase();
}

export async function prune(api, ctx, { limit = 300, dryRun = false } = {}) {
  const max = Math.min(500, int(limit) || 300);
  const current = ctx.number ? await api.pr(ctx.number) : null;
  const found = [];
  for (let page = 1; page <= 10; page++) {
    const res = await api.list(page, current?.head?.ref);
    if (!Array.isArray(res.workflow_runs)) throw Error('Unexpected GitHub runs response');
    found.push(...res.workflow_runs);
    if (res.workflow_runs.length < 100) break;
  }
  const cache = new Map(current ? [[ctx.number, current]] : []);
  const summary = { scanned: found.length, candidates: 0, cancelled: [], confirmed: [], dryRun: [], errors: [], partial: found.length === 1000 };
  const seen = new Set();
  for (const run of found) {
    if (summary.cancelled.length + summary.dryRun.length >= max) { summary.partial = true; break; }
    if (seen.has(run.id)) continue;
    seen.add(run.id);
    if (run.event !== 'pull_request' || run.status !== 'queued' || run.pull_requests?.length !== 1 || !int(run.id)) continue;
    const n = int(run.pull_requests[0].number);
    if (!n || (ctx.number && n !== ctx.number)) continue;
    let pr = cache.get(n);
    if (!pr) { pr = await api.pr(n); cache.set(n, pr); }
    if (!eligible(run, pr, ctx)) continue;
    summary.candidates++;
    // Read BOTH objects again before POST: a queued run may have started and a PR HEAD may have moved.
    const [freshRun, freshPR] = await Promise.all([api.run(run.id), api.pr(n)]);
    if (!eligible(freshRun, freshPR, ctx) ||
        freshRun.pull_requests[0].head.sha.toLowerCase() !== run.pull_requests[0].head.sha.toLowerCase()) continue;
    if (dryRun) { summary.dryRun.push(run.id); continue; }
    try { await api.cancel(run.id); summary.cancelled.push(run.id); }
    catch (e) {
      // Another janitor may have cancelled the same run between GET and POST.
      const after = await api.run(run.id).catch(() => null);
      if (after?.status === 'queued') summary.errors.push({ id: run.id, status: String(e.message || e).slice(0, 100) });
    }
  }
  // POST accepted != confirmed cancelled. Read back the actual conclusion.
  for (const id of summary.cancelled) {
    try {
      const checked = await api.run(id);
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
    recent: (page, since) => call('/actions/runs?' + new URLSearchParams({ event: 'pull_request', created: '>=' + since, per_page: '100', page: String(page) })),
    jobs: id => call('/actions/runs/' + id + '/jobs?per_page=100&page=1'),
    list: (page, branch) => {
      const query = new URLSearchParams({ status: 'queued', event: 'pull_request', per_page: '100', page: String(page) });
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
  try {
    m = await observeCI(client(ctx.repo, env.GITHUB_TOKEN), {
      windowMinutes: int(env.HH_CI_WINDOW_MINUTES) || 60,
      sampleRuns: int(env.HH_CI_JOB_SAMPLE) || 20,
    });
  } catch (e) { metricError = String(e.message || e).slice(0, 150); }
  const fmt = ms => ms == null ? 'n/a' : (ms / 60000).toFixed(2) + ' min';
  const msg = 'CI queued-only prune: scanned=' + s.scanned + ' eligible=' + s.candidates +
    ' cancelled=' + s.cancelled.length + ' dry_run=' + s.dryRun.length + ' errors=' + s.errors.length +
    '\nCancellation accepted IDs: ' + (s.cancelled.join(',') || 'none') + '\n' +
    '\n## CI queue monitoring\n\n| Metric | Observation |\n| --- | --- |\n' +
    '| New PR workflow checks (last 60 min) | ' + (m ? m.newChecks + (m.truncated ? ' (PARTIAL)' : '') : 'n/a') + ' |\n' +
    '| Queued / running checks (last 60 min) | ' + (m ? m.queuedChecks + ' / ' + m.runningChecks : 'n/a') + ' |\n' +
    '| Superseded: cancel accepted / confirmed | ' + s.cancelled.length + ' / ' + s.confirmed.length + ' |\n' +
    '| Job/runner start wait p50 / p95 (sample) | ' + (m ? fmt(m.waitP50Ms) + ' / ' + fmt(m.waitP95Ms) + ' (n=' + m.waitSamples + ')' : 'n/a') + ' |\n' +
    '| Pending jobs; p95 queued age (sample) | ' + (m ? m.queuedJobs + '; ' + fmt(m.queuedAgeP95Ms) : 'n/a') + ' |\n' +
    '| Actual completed job execution (sample) | ' + (m ? fmt(m.runnerMs) + ' across ' + m.completedJobs + ' jobs / ' + m.sampledRuns + ' runs' : 'n/a') + ' |\n' +
    '| Coverage | ' + (s.partial ? 'Queue scan limited; ' : '') + (m ? 'job fetch errors ' + m.jobErrors + ', partial job pages ' + m.incompleteJobs : 'metrics unavailable') + ' |\n\n' +
    'POST accepted is not a confirmed cancelled conclusion. Job start wait may include dependencies/concurrency; it does not prove runner shortage. Sampled job execution is not GitHub billing or summed workflow wall time.\n' +
    (metricError ? 'Metrics error: ' + metricError + '\n' : '');
  console.log(msg);
  console.log('HH_CI_QUEUE_METRICS ' + JSON.stringify({ at: new Date().toISOString(), scanned: s.scanned,
    candidates: s.candidates, cancelAccepted: s.cancelled.length, cancelConfirmed: s.confirmed.length,
    partial: s.partial, errors: s.errors.length, snapshot: m, metricError }));
  if (env.GITHUB_STEP_SUMMARY) appendFileSync(env.GITHUB_STEP_SUMMARY, msg);
  if (s.errors.length) { console.error(s.errors); process.exitCode = 1; }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch(e => { console.error(String(e.message || e)); process.exitCode = 1; });
}
