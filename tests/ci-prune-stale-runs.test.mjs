import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { context, eligible, prune, observeCI, summarizeJobs, client, TARGET } from '../scripts/ci-prune-stale-runs.mjs';

const repo = 'andylitvinov-design/books';
const ctx = { repo, target: TARGET, number: 5 };
const OLD = 'a'.repeat(40), NEW = 'b'.repeat(40), MERGE = 'c'.repeat(40);
const pr = (x = {}) => ({ number: 5, state: 'open', base: { ref: TARGET }, head: { ref: 'feat/one', sha: NEW, repo: { full_name: repo } }, ...x });
const run = (x = {}) => ({ id: 100, event: 'pull_request', status: 'queued', head_sha: MERGE, head_branch: 'feat/one', head_repository: { full_name: repo }, pull_requests: [{ number: 5, base: { ref: TARGET }, head: { ref: 'feat/one', sha: OLD } }], ...x });

test('only a verified production push can start a privileged cleanup', () => {
  const env = { GITHUB_TOKEN: 'fake', GITHUB_REPOSITORY: repo,
    GITHUB_EVENT_NAME: 'push', GITHUB_REF: 'refs/heads/' + TARGET };
  const event = { ref: 'refs/heads/' + TARGET, repository: { full_name: repo } };
  assert.deepEqual(context(env, event), { repo, target: TARGET, number: null });
  assert.throws(() => context({ ...env, GITHUB_EVENT_NAME: 'pull_request_target' }, event));
  assert.throws(() => context({ ...env, GITHUB_EVENT_NAME: 'pull_request' }, event));
  assert.throws(() => context({ ...env, GITHUB_REF: 'refs/heads/main' }, event));
  assert.throws(() => context(env, { ...event, repository: { full_name: 'wrong/repo' } }));
});

test('never cancel new SHA, production push, running jobs, unrelated or ambiguous PRs', () => {
  assert.equal(eligible(run(), pr(), ctx), true);
  for (const data of [
    { pull_requests: [{ number: 5, base: { ref: TARGET }, head: { ref: 'feat/one', sha: NEW } }] }, { event: 'push' }, { event: 'workflow_dispatch' }, { event: 'merge_group' },
    { status: 'in_progress' }, { status: 'waiting' }, { head_repository: { full_name: 'fork/repo' } },
    { pull_requests: [] }, { head_branch: 'other' },
  ]) assert.equal(eligible(run(data), pr(), ctx), false, JSON.stringify(data));
  assert.equal(eligible(run(), pr({ base: { ref: 'main' } }), ctx), false);
  assert.equal(eligible(run(), pr({ state: 'closed' }), ctx), false);
  assert.equal(eligible(run({ head_sha: 'new' }), pr({ state: 'closed' }), ctx), false);
});

test('re-read exact live run and PR before cancellation; cap and dry-run', async () => {
  const cancelled = [];
  const api = { pr: async () => pr(), run: async () => run(), cancel: async id => cancelled.push(id),
    list: async () => ({ workflow_runs: [run(), run({ id: 101, pull_requests: [{ number: 5, base: { ref: TARGET }, head: { ref: 'feat/one', sha: NEW } }] }), run({ id: 102 })] }) };
  const dry = await prune(api, ctx, { limit: 2, dryRun: true });
  assert.deepEqual(dry.dryRun, [100, 102]); assert.deepEqual(cancelled, []);
  const result = await prune(api, ctx, { limit: 1 });
  assert.deepEqual(result.cancelled, [100]); assert.deepEqual(cancelled, [100]);
  api.run = async () => run({ status: 'in_progress' });
  assert.deepEqual((await prune(api, ctx)).cancelled, []);
  api.run = async () => run(); let count = 0;
  api.pr = async () => (++count > 1 ? pr({ head: { ...pr().head, sha: OLD } }) : pr());
  assert.deepEqual((await prune(api, ctx)).cancelled, []);
});

test('HTTP API uses queued PR filter and POST for cancellation', async () => {
  const calls = [];
  const http = async (url, options) => { calls.push([url, options.method]); return { ok: true, json: async () => ({ workflow_runs: [] }) }; };
  const api = client(repo, 'fake', http);
  await api.list(1, 'feat/one'); await api.pr(5); await api.run(100); await api.cancel(100);
  assert.match(calls[0][0], /status=queued/); assert.match(calls[0][0], /branch=feat%2Fone/);
  assert.match(calls[3][0], /\/actions\/runs\/100\/cancel/); assert.equal(calls[3][1], 'POST');
});

test('elevated GitHub token only used for trusted production checkout, not PR HEAD', () => {
  const yaml = readFileSync('.github/workflows/hh-ci-stale-run-prune.yml', 'utf8');
  assert.doesNotMatch(yaml, /pull_request_target:/);
  assert.match(yaml, /permissions: \{\}/);
  assert.match(yaml, /actions: write/);
  assert.match(yaml, /pull-requests: read/);
  assert.match(yaml, /ref: \$\{\{ github.sha \}\}/);
  assert.match(yaml, /^  pull_request:/m);
  assert.match(yaml, /if: github\.event_name == 'pull_request'/);
  assert.match(yaml, /github\.event_name == 'push'/);
});

test('cleanup concurrency isolates PRs and never cancels production push runs', () => {
  const yaml = readFileSync('.github/workflows/hh-ci-stale-run-prune.yml', 'utf8');
  assert.ok(yaml.includes("group: hh-ci-prune-${{ github.event_name == 'push' && 'production' || github.event.pull_request.number }}"));
  assert.ok(yaml.includes('cancel-in-progress: false'));
  assert.match(yaml, /HH_CI_PRUNE_LIMIT: '300'/);
});


test('synthetic merge SHA does not determine PR freshness; missing linked SHA fails closed', () => {
  assert.equal(eligible(run({ head_sha: NEW }), pr(), ctx), true);
  const linked = sha => ({ number: 5, base: { ref: TARGET }, head: { ref: 'feat/one', sha } });
  assert.equal(eligible(run({ pull_requests: [linked(NEW)] }), pr(), ctx), false);
  assert.equal(eligible(run({ pull_requests: [linked(undefined)] }), pr(), ctx), false);
  assert.equal(eligible(run({ pull_requests: [linked('bad')] }), pr(), ctx), false);
});

test('batch cancels >20 stale queued runs while respecting configured limit and readback', async () => {
  const cancelled = [];
  const runs = Array.from({ length: 65 }, (_, i) => run({ id: 1000 + i }));
  const api = { list: async () => ({ workflow_runs: runs }), pr: async () => pr(),
    run: async id => runs.find(item => item.id === id), cancel: async id => cancelled.push(id) };
  const s = await prune(api, ctx, { limit: 35 });
  assert.equal(s.cancelled.length, 35);
  assert.equal(s.confirmed.length, 0);
  assert.equal(new Set(cancelled).size, 35);
});

test('runner waiting and runtime are derived from job timestamps only', () => {
  const stats = summarizeJobs([[
    { status: 'completed', created_at: '2026-11-01T00:00:00Z', started_at: '2026-11-01T00:02:00Z', completed_at: '2026-11-01T00:07:00Z' },
    { status: 'completed', created_at: '2026-11-01T00:00:00Z', started_at: '2026-11-01T00:04:00Z', completed_at: '2026-11-01T00:08:00Z' },
    { status: 'queued', created_at: '2026-11-01T00:08:00Z' },
  ]], Date.parse('2026-11-01T00:10:00Z'));
  assert.equal(stats.waitP50Ms, 120000);
  assert.equal(stats.waitP95Ms, 240000);
  assert.equal(stats.runnerMs, 540000);
  assert.equal(stats.queuedJobs, 1);
});

test('metrics monitor counts new checks separately from jobs actually running', async () => {
  const api = { recent: async () => ({ workflow_runs: [
    { id: 1, event: 'pull_request', status: 'queued' },
    { id: 2, event: 'pull_request', status: 'completed' },
  ] }), jobs: async id => ({ jobs: id === 1 ? [] : [{ status: 'completed',
    created_at: '2026-11-01T00:00:00Z', started_at: '2026-11-01T00:01:00Z',
    completed_at: '2026-11-01T00:06:00Z' }] }) };
  const m = await observeCI(api, { now: Date.parse('2026-11-01T00:10:00Z'), sampleRuns: 2 });
  assert.equal(m.newChecks, 2);
  assert.equal(m.queuedChecks, 1);
  assert.equal(m.runnerMs, 300000);
  assert.equal(m.sampledRuns, 2);
});
