import test from 'node:test';
import assert from 'node:assert/strict';
import { verify, requiresCurrentProductionBase } from '../scripts/ci-specialist-aggregate.mjs';

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

test('loose base reuse is limited to normal public changes; privacy and policy require current base', () => {
  for (const files of [
    ['components/public-faq.js'], ['app/[locale]/academy/page.tsx'], ['public/images/new-image.webp'], ['docs/guide.md'],
  ]) assert.equal(requiresCurrentProductionBase(files), false, files.join(','));
  for (const files of [
    [], ['scripts/ci-specialist-aggregate.mjs'], ['.github/workflows/hh-pr-core-release.yml'],
    ['package-lock.json'], ['app/api/payment/route.ts'], ['components/app/private-profile.jsx'],
    ['lib/crm/marketing.js'], ['supabase/migrations/001.sql'],
    ['docs/operations/CI_RELEASE_POLICY.md'], ['app/[locale]/about/page.tsx', 'lib/wallet/account.js'],
  ]) assert.equal(requiresCurrentProductionBase(files), true, files.join(','));
});

test('normal exact-HEAD workflow evidence survives an unrelated production advance', async () => {
  const advanced = { ...pr, base: { ...pr.base, sha: 'c'.repeat(40) }, mergeable_state: 'behind' };
  let reads = 0;
  const api = {
    pr: async () => (++reads === 1 ? pr : advanced),
    changed: async () => { throw Error('live changed list must not replace trusted checkout'); },
    runs: async () => [],
    jobs: async () => [],
  };
  const verified = {base:new Map(),current:new Map(),
    changedRows:[{ filename: 'components/public-faq.js', status: 'modified' }] };
  const result = await verify(api,ctx,verified,{maxWaitMs:0});
  assert.equal(reads,2);
  assert.deepEqual(result.expected,[]);
  assert.equal(result.head,head);
  assert.equal(result.base,base);
});

test('sensitive changes still reject advanced bases; draft, conflicts and changed HEAD remain blockers', async () => {
  let live = { ...pr, base: { ...pr.base, sha: 'c'.repeat(40) } };
  const api = {
    pr: async () => live,
    changed: async () => [{ filename: 'app/api/payment/route.ts' }],
    runs: async () => [],
    jobs: async () => [],
  };
  await assert.rejects(() => verify(api,ctx,{base:new Map(),current:new Map()},{maxWaitMs:0}),
    /PR_HEAD_BASE_OR_RELEASE_STATE_CHANGED/);
  live = { ...pr, head: { ...pr.head, sha: 'd'.repeat(40) } };
  await assert.rejects(() => verify(api,ctx,{base:new Map(),current:new Map()},{maxWaitMs:0}),
    /PR_HEAD_BASE_OR_RELEASE_STATE_CHANGED/);
  live = { ...pr, mergeable: false };
  await assert.rejects(() => verify(api,ctx,{base:new Map(),current:new Map()},{maxWaitMs:0}),
    /PR_HEAD_BASE_OR_RELEASE_STATE_CHANGED/);
  live = { ...pr, draft: true };
  await assert.rejects(() => verify(api,ctx,{base:new Map(),current:new Map()},{maxWaitMs:0}),
    /PR_HEAD_BASE_OR_RELEASE_STATE_CHANGED/);
});

test('sensitive PR stays pinned when base advances during specialist execution', async () => {
  let reads=0;
  const advanced={...pr,base:{...pr.base,sha:'c'.repeat(40)}};
  const api={
    pr:async()=> (++reads === 1 ? pr : advanced),
    changed:async()=>[{filename:'lib/crm/a.js'}],
    runs:async()=>[run('completed','success')],
    jobs:async()=>[{name:'mobile',status:'completed',conclusion:'success'}],
  };
  await assert.rejects(()=>verify(api,ctx,sources,{maxWaitMs:0}),/PR_HEAD_BASE_OR_RELEASE_STATE_CHANGED/);
  assert.equal(reads,2);
});
