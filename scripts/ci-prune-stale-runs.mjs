// Trusted production-branch cleanup; never execute code from a PR HEAD.
import { readFileSync, appendFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const TARGET = 'codex/public-book-library';
const int = (v) => Number.isSafeInteger(Number(v)) && Number(v) > 0 ? Number(v) : null;

export function context(env, event) {
  if (!env.GITHUB_TOKEN || !/^[-\w.]+\/[-\w.]+$/.test(env.GITHUB_REPOSITORY || '')) throw Error('Invalid Actions identity');
  const base = { repo: env.GITHUB_REPOSITORY, target: TARGET, number: null };
  if (env.GITHUB_EVENT_NAME === 'push') {
    if (env.GITHUB_REF !== 'refs/heads/' + TARGET || event?.ref !== 'refs/heads/' + TARGET) throw Error('Not production push');
    return base;
  }
  if (env.GITHUB_EVENT_NAME !== 'pull_request_target' || event?.repository?.full_name !== base.repo ||
      event?.pull_request?.base?.ref !== TARGET || !['synchronize', 'closed', 'reopened'].includes(event?.action) ||
      !int(event?.pull_request?.number)) throw Error('Not an authorized PR event');
  return { ...base, number: event.pull_request.number };
}

export function eligible(run, pr, ctx) {
  if (!run || run.event !== 'pull_request' || run.status !== 'queued' ||
      run.pull_requests?.length !== 1 || run.pull_requests[0]?.number !== pr?.number ||
      (ctx.number && pr.number !== ctx.number) ||
      run.pull_requests[0]?.base?.ref !== TARGET || pr.base?.ref !== TARGET ||
      run.head_repository?.full_name !== ctx.repo || pr.head?.repo?.full_name !== ctx.repo ||
      run.head_branch !== pr.head?.ref || run.pull_requests[0]?.head?.ref !== run.head_branch ||
      !run.head_sha || !pr.head?.sha) return false;
  return pr.state === 'closed' || (pr.state === 'open' && run.head_sha !== pr.head.sha);
}

export async function prune(api, ctx, { limit = 20, dryRun = false } = {}) {
  const max = Math.min(20, int(limit) || 20);
  const current = ctx.number ? await api.pr(ctx.number) : null;
  const found = [];
  for (let page = 1; page <= 6; page++) {
    const res = await api.list(page, current?.head?.ref);
    if (!Array.isArray(res.workflow_runs)) throw Error('Unexpected GitHub runs response');
    found.push(...res.workflow_runs);
    if (res.workflow_runs.length < 100) break;
  }
  const cache = new Map(current ? [[ctx.number, current]] : []);
  const summary = { scanned: found.length, candidates: 0, cancelled: [], dryRun: [], errors: [] };
  for (const run of found) {
    if (summary.cancelled.length + summary.dryRun.length >= max) break;
    if (run.event !== 'pull_request' || run.status !== 'queued' || run.pull_requests?.length !== 1 || !int(run.id)) continue;
    const n = int(run.pull_requests[0].number);
    if (!n || (ctx.number && n !== ctx.number)) continue;
    let pr = cache.get(n);
    if (!pr) { pr = await api.pr(n); cache.set(n, pr); }
    if (!eligible(run, pr, ctx)) continue;
    summary.candidates++;
    // Read BOTH objects again before POST: a queued run may have started and a PR HEAD may have moved.
    const [freshRun, freshPR] = await Promise.all([api.run(run.id), api.pr(n)]);
    if (!eligible(freshRun, freshPR, ctx)) continue;
    if (dryRun) { summary.dryRun.push(run.id); continue; }
    try { await api.cancel(run.id); summary.cancelled.push(run.id); }
    catch (e) {
      // Another janitor may have cancelled the same run between GET and POST.
      const after = await api.run(run.id).catch(() => null);
      if (after?.status === 'queued') summary.errors.push({ id: run.id, status: String(e.message || e).slice(0, 100) });
    }
  }
  return summary;
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
  const msg = 'CI queued-only prune: scanned=' + s.scanned + ' eligible=' + s.candidates +
    ' cancelled=' + s.cancelled.length + ' dry_run=' + s.dryRun.length + ' errors=' + s.errors.length +
    '\nCancelled IDs: ' + (s.cancelled.join(',') || 'none') + '\n';
  console.log(msg);
  if (env.GITHUB_STEP_SUMMARY) appendFileSync(env.GITHUB_STEP_SUMMARY, msg);
  if (s.errors.length) { console.error(s.errors); process.exitCode = 1; }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch(e => { console.error(String(e.message || e)); process.exitCode = 1; });
}
