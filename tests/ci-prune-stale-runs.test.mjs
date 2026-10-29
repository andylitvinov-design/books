import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { context, eligible, prune, client, TARGET } from '../scripts/ci-prune-stale-runs.mjs';

const repo = 'andylitvinov-design/books';
const ctx = { repo, target: TARGET, number: 5 };
const pr = (x = {}) => ({ number: 5, state: 'open', base: { ref: TARGET }, head: { ref: 'feat/one', sha: 'new', repo: { full_name: repo } }, ...x });
const run = (x = {}) => ({ id: 100, event: 'pull_request', status: 'queued', head_sha: 'old', head_branch: 'feat/one', head_repository: { full_name: repo }, pull_requests: [{ number: 5, base: { ref: TARGET }, head: { ref: 'feat/one' } }], ...x });

test('production-only events and verified PR number', () => {
  const e = { GITHUB_TOKEN: 'fake', GITHUB_REPOSITORY: repo, GITHUB_EVENT_NAME: 'pull_request_target' };
  assert.deepEqual(context(e, { repository: { full_name: repo }, action: 'synchronize', pull_request: { number: 5, base: { ref: TARGET } } }), ctx);
  assert.throws(() => context({ ...e, GITHUB_EVENT_NAME: 'pull_request' }, {}));
  assert.throws(() => context(e, { repository: { full_name: repo }, action: 'opened', pull_request: { number: 5, base: { ref: TARGET } } }));
  assert.deepEqual(context({ ...e, GITHUB_EVENT_NAME: 'push', GITHUB_REF: 'refs/heads/' + TARGET }, { ref: 'refs/heads/' + TARGET }), { ...ctx, number: null });
  assert.throws(() => context({ ...e, GITHUB_EVENT_NAME: 'push', GITHUB_REF: 'refs/heads/main' }, { ref: 'refs/heads/main' }));
});

test('never cancel new SHA, production push, running jobs, unrelated or ambiguous PRs', () => {
  assert.equal(eligible(run(), pr(), ctx), true);
  for (const data of [
    { head_sha: 'new' }, { event: 'push' }, { event: 'workflow_dispatch' }, { event: 'merge_group' },
    { status: 'in_progress' }, { status: 'waiting' }, { head_repository: { full_name: 'fork/repo' } },
    { pull_requests: [] }, { head_branch: 'other' },
  ]) assert.equal(eligible(run(data), pr(), ctx), false, JSON.stringify(data));
  assert.equal(eligible(run(), pr({ base: { ref: 'main' } }), ctx), false);
  assert.equal(eligible(run(), pr({ state: 'closed' }), ctx), true);
  assert.equal(eligible(run({ head_sha: 'new' }), pr({ state: 'closed' }), ctx), true);
});

test('re-read exact live run and PR before cancellation; cap and dry-run', async () => {
  const cancelled = [];
  const api = { pr: async () => pr(), run: async () => run(), cancel: async id => cancelled.push(id),
    list: async () => ({ workflow_runs: [run(), run({ id: 101, head_sha: 'new' }), run({ id: 102 })] }) };
  const dry = await prune(api, ctx, { limit: 2, dryRun: true });
  assert.deepEqual(dry.dryRun, [100, 102]); assert.deepEqual(cancelled, []);
  const result = await prune(api, ctx, { limit: 1 });
  assert.deepEqual(result.cancelled, [100]); assert.deepEqual(cancelled, [100]);
  api.run = async () => run({ status: 'in_progress' });
  assert.deepEqual((await prune(api, ctx)).cancelled, []);
  api.run = async () => run(); let count = 0;
  api.pr = async () => (++count > 1 ? pr({ head: { ...pr().head, sha: 'old' } }) : pr());
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
  assert.match(yaml, /pull_request_target:/);
  assert.match(yaml, /permissions: \{\}/);
  assert.match(yaml, /actions: write/);
  assert.match(yaml, /pull-requests: read/);
  assert.match(yaml, /ref: codex\/public-book-library/);
  assert.match(yaml, /^  pull_request:/m);
  assert.match(yaml, /if: github\.event_name == 'pull_request'/);
  assert.match(yaml, /github\.event_name != 'pull_request'/);
});
