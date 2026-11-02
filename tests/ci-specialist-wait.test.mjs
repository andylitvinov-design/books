import test from 'node:test';
import assert from 'node:assert/strict';
import { verify, requiresCurrentProductionBase, classifyPrState, diagnoseAggregateError } from '../scripts/ci-specialist-aggregate.mjs';

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
    ['lib/practitioners/direct-messages.js'], ['lib/practitioners/direct-message-policy.mjs'],
    ['lib/app/learning-journey.mjs'], ['lib/ia/encrypted-store.js'],
    ['lib/assessments/contracts.js'], ['components/direct-message-inbox.jsx'],
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

test('a verified private-message diff rejects a production advance', async () => {
  const advanced = { ...pr, base: { ...pr.base, sha: 'c'.repeat(40) } };
  const api = {pr: async () => advanced, changed: async () => [], runs: async () => [], jobs: async () => []};
  const files = {base:new Map(), current:new Map(),
    changedRows:[{filename:'lib/practitioners/direct-messages.js', status:'modified'}]};
  await assert.rejects(() => verify(api,ctx,files,{maxWaitMs:0}), /PR_HEAD_BASE_OR_RELEASE_STATE_CHANGED/);
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

test('CI distinguishes current HEAD, production advance, merge conflict and draft PR states', () => {
  assert.equal(classifyPrState(pr,ctx,true),null);
  assert.equal(classifyPrState({...pr,draft:true},ctx,true),'PR_DRAFT');
  assert.equal(classifyPrState({...pr,head:{...pr.head,sha:'c'.repeat(40)}},ctx,true),'PR_HEAD_CHANGED');
  assert.equal(classifyPrState({...pr,base:{...pr.base,sha:'d'.repeat(40)}},ctx,true),'PRODUCTION_BASE_CHANGED');
  assert.equal(classifyPrState({...pr,base:{...pr.base,sha:'d'.repeat(40)}},ctx,false),null);
  assert.equal(classifyPrState({...pr,mergeable_state:'dirty'},ctx,true),'MERGE_CONFLICT');
  assert.equal(classifyPrState({...pr,base:{...pr.base,ref:'codex/bootstrap-books'}},ctx,true),'WRONG_PRODUCTION_TARGET');
});

test('CI groups observable dispatch/check symptoms but never treats matching symptoms as proven fixes', () => {
  const missing=diagnoseAggregateError(new Error('SPECIALIST_MISSING_OR_PENDING:NOT_TRIGGERED:'+
    JSON.stringify({missing:['.github/workflows/hh-public-services-production.yml'],pending:[]})));
  assert.equal(missing.category,'WORKFLOW_NOT_TRIGGERED');
  assert.deepEqual(missing.symptomKeys,['missing/.github/workflows/hh-public-services-production.yml']);
  const queued=diagnoseAggregateError(new Error('SPECIALIST_MISSING_OR_PENDING:NOT_STARTED:'+
    JSON.stringify({queued:['.github/workflows/ia-v2.yml:queued']})));
  assert.equal(queued.category,'RUNNER_QUEUE');
  assert.deepEqual(queued.symptomKeys,['queued/.github/workflows/ia-v2.yml']);
  const failed=diagnoseAggregateError(new Error('SPECIALIST_FAILED:'+
    JSON.stringify({failed:['.github/workflows/ia-v2.yml:failure']})));
  assert.equal(failed.category,'SPECIALIST_FAILED');
  assert.deepEqual(failed.symptomKeys,['failed/.github/workflows/ia-v2.yml']);
  assert.equal(diagnoseAggregateError(new Error('ZERO_JOB_WORKFLOW:.github/workflows/ia-v2.yml')).category,'WORKFLOW_JOBLESS');
  assert.equal(diagnoseAggregateError(new Error('PR_HEAD_BASE_OR_RELEASE_STATE_CHANGED:PRODUCTION_BASE_CHANGED')).category,'BASE_ADVANCED');
  assert.equal(diagnoseAggregateError(new Error('PR_HEAD_BASE_OR_RELEASE_STATE_CHANGED:PR_HEAD_CHANGED')).category,'HEAD_ADVANCED');
  assert.equal(diagnoseAggregateError(new Error('UNVERIFIED_MERGE_CHECKOUT')).category,'CHECKOUT_UNVERIFIED');
});
