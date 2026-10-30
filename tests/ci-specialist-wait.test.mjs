import test from 'node:test';
import assert from 'node:assert/strict';
import { verify } from '../scripts/ci-specialist-aggregate.mjs';

const repo = 'andylitvinov-design/books', head = 'a'.repeat(40), base = 'b'.repeat(40);
const path = '.github/workflows/mobile.yml';
const pr = { number: 27, state: 'open', draft: false,
  head: { sha: head, ref: 'feat/test', repo: { full_name: repo } },
  base: { sha: base, ref: 'codex/public-book-library', repo: { full_name: repo } } };
const run = (status, conclusion) => ({ id: 151, workflow_id: 30, path, head_sha: head,
  head_branch: 'feat/test', event: 'pull_request', status, conclusion, run_attempt: 1,
  head_repository: { full_name: repo }, pull_requests: [{ number: 27, head: { sha: head }, base: { ref: 'codex/public-book-library' } }] });
const yaml = "on:\n  pull_request:\n    branches: ['codex/public-book-library']\n    paths:\n      - 'lib/crm/**'\njobs:\n  test:\n    runs-on: ubuntu-24.04\n";
const sources = { base: new Map([[path, yaml]]), current: new Map([[path, yaml]]) };
const ctx = { repo, number: 27, head, base };

test('waits for a running exact-head specialist and still fails on an unsuccessful result', async () => {
  let polls = 0;
  const api = { pr: async () => pr, changed: async () => [{ filename: 'lib/crm/a.js' }],
    runs: async () => [++polls === 1 ? run('in_progress', null) : run('completed', 'success')],
    jobs: async () => [{ name: 'mobile', status: 'completed', conclusion: 'success' }] };
  const result = await verify(api, ctx, sources, { maxWaitMs: 1000, pollMs: 100 });
  assert.equal(polls, 2);
  assert.equal(result.executed.length, 1);
  api.runs = async () => [run('completed', 'failure')];
  await assert.rejects(() => verify(api, ctx, sources, { maxWaitMs: 1000, pollMs: 100 }), /SPECIALIST_FAILED/);
  api.runs = async () => [run('in_progress', null)];
  await assert.rejects(() => verify(api, ctx, sources, { maxWaitMs: 0 }), /SPECIALIST_MISSING_OR_PENDING/);
});
