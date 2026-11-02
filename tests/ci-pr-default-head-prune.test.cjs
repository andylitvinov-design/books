'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const { verifyEvent, eligible, prune, TARGET } = require('../scripts/ci-pr-default-head-prune.cjs');

const repo = 'andylitvinov-design/books';
const OLD = 'a'.repeat(40), NEW = 'b'.repeat(40), THIRD = 'c'.repeat(40);
const event = () => ({ action: 'synchronize', before: OLD, after: NEW,
  repository: { full_name: repo }, pull_request: { number: 10,
    base: { ref: TARGET }, head: { ref: 'feat/one', sha: NEW, repo: { full_name: repo } } } });
const pr = () => ({ number: 10, state: 'open', base: { ref: TARGET },
  head: { ref: 'feat/one', sha: NEW, repo: { full_name: repo } } });
const run = (options = {}) => ({ id: 101, status: 'queued', event: 'pull_request',
  head_sha: OLD, head_branch: 'feat/one', head_repository: { full_name: repo },
  pull_requests: [{ number: 10, head: { ref: 'feat/one', sha: NEW }, base: { ref: TARGET } }],
  ...options });

function mock({ candidates = [run()], current = pr(), relation = 'ahead' } = {}) {
  let cancelIds = [], selected = [];
  const github = { rest: {
    pulls: { get: async () => ({ data: current }) },
    repos: { compareCommits: async ({ base, head }) => {
      selected.push([base, head]); return { data: { status: relation, ahead_by: relation === 'ahead' ? 1 : 0 } };
    } },
    actions: {
      listWorkflowRunsForRepo: async ({ status, branch }) => {
        assert.equal(branch, 'feat/one');
        return { data: { workflow_runs: candidates.filter(r => r.status === status) } };
      },
      getWorkflowRun: async ({ run_id }) => ({ data: candidates.find(r => r.id === run_id) }),
      cancelWorkflowRun: async ({ run_id }) => { cancelIds.push(run_id); return { data: {} }; },
    },
  } };
  return { github, cancelIds, selected };
}
test('only same-repository source-advancing synchronize can start privileged cancellation', () => {
  const e = event();
  assert.deepEqual(verifyEvent(e, repo), { number: 10, before: OLD, after: NEW, branch: 'feat/one' });
  for (const bad of [
    { ...e, action: 'opened' }, { ...e, before: NEW }, { ...e, after: OLD },
    { ...e, before: 'invalid' }, { ...e, repository: { full_name: 'other/repo' } },
    { ...e, pull_request: { ...e.pull_request, base: { ref: 'main' } } },
    { ...e, pull_request: { ...e.pull_request, head: { ...e.pull_request.head, repo: { full_name: 'fork/repo' } } } },
  ]) assert.equal(verifyEvent(bad, repo), null);
});
test('only an older exact PR run is eligible; newest HEAD, unrelated and untrusted events are held', () => {
  const ctx = verifyEvent(event(), repo);
  assert.equal(eligible(run(), pr(), ctx, repo), true);
  for (const changed of [
    { head_sha: NEW }, { head_sha: THIRD, pull_requests: [] },
    { status: 'completed' }, { event: 'push' },
    { head_branch: 'feat/two' }, { head_repository: { full_name: 'fork/repo' } },
    { pull_requests: [{ number: 11, head: { ref: 'feat/one', sha: NEW }, base: { ref: TARGET } }] },
  ]) assert.equal(eligible(run(changed), pr(), ctx, repo), false);
});
test('real queued and started ancestor runs are cancelled; latest HEAD remains untouched', async () => {
  const m = mock({ candidates: [run({ id: 101 }), run({ id: 102, status: 'in_progress' }),
    run({ id: 103, head_sha: NEW })] });
  const result = await prune({ github: m.github, event: event(), repository: repo });
  assert.deepEqual(result.cancelled, [101, 102]);
  assert.deepEqual(m.cancelIds, [101, 102]);
  assert.equal(m.selected.every(([a, b]) => b === NEW && a !== NEW), true);
});
test('old event, live SHA changed, diverged history and fork cannot cancel', async () => {
  let m = mock({ current: { ...pr(), head: { ...pr().head, sha: THIRD } } });
  assert.equal((await prune({ github: m.github, event: event(), repository: repo })).status, 'SKIP_SUPERSEDED_EVENT');
  assert.deepEqual(m.cancelIds, []);
  m = mock({ relation: 'diverged' });
  assert.equal((await prune({ github: m.github, event: event(), repository: repo })).status, 'SKIP_UNPROVEN_EVENT_ANCESTRY');
  assert.deepEqual(m.cancelIds, []);
  m = mock();
  assert.equal((await prune({ github: m.github, event: { ...event(), action: 'opened' }, repository: repo })).status, 'SKIP_UNTRUSTED_EVENT');
  assert.deepEqual(m.cancelIds, []);
});
test('dry run reports only and never calls GitHub cancellation', async () => {
  const m = mock();
  const result = await prune({ github: m.github, event: event(), repository: repo, dryRun: true });
  assert.equal(result.status, 'DRY_RUN');
  assert.deepEqual(result.cancelled, [101]);
  assert.deepEqual(m.cancelIds, []);
});
