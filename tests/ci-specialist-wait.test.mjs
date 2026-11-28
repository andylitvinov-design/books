import test from 'node:test';
import assert from 'node:assert/strict';
import { verify, requiresCurrentProductionBase, classifyPrState, diagnoseAggregateError, awaitPositiveMergeability, verifiedPriorSpecialistEvidence, reusePriorSpecialistState } from '../scripts/ci-specialist-aggregate.mjs';
import { createRequire } from 'node:module';
import { verifyStableProtectedBase, observeProtectedBaseDrift, independentPackageOnlyAdvisories, verifiedCoachDispatcherIsolation, independentDispatcherAdvisories, provenNonApplicableWorkflows } from '../scripts/ci-specialist-aggregate.mjs';
import { inspectJobs, trustedRequiredJobs, inspectWorkflowRuns } from '../lib/ci/specialist-aggregate.mjs';
import { safeComposedIndependentAdvance, safeIsolatedFeatureAdvance, safeUnrelatedPublicLeafAdvance, safeIndependentRouterPolicyAdvance, safeMixedProtectedAdvance, safeDetachedCiSourceAdvance, safeStandaloneVideoAfterSpecialistScopeAdvance, safeNonOverlappingProductAdvance, safeIndependentMixedCandidateAdvance, normalizeIdenticalProtectedOverlap } from '../lib/ci/production-base-impact.mjs';

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


test('a registered specialist can remain queued beyond three minutes and must subsequently PASS', async () => {
  let elapsed = 0, jobsRead = 0, polls = 0;
  const api = {
    pr: async () => pr,
    changed: async () => [{ filename: 'lib/crm/a.js' }],
    runs: async () => {
      polls++;
      if (elapsed < 4*60_000) return [run('queued', null)];
      if (elapsed < 4*60_000 + 30_000) return [run('in_progress', null)];
      return [run('completed', 'success')];
    },
    jobs: async () => {
      jobsRead++;
      return [{ name: 'mobile', status: 'completed', conclusion: 'success' }];
    },
  };
  const sleep = async ms => {
    assert.ok(ms > 0 && ms <= 60_000, 'bounded polling');
    elapsed += ms;
  };
  const result = await verify(api, ctx, sources, { now: () => elapsed, sleep });
  assert.ok(elapsed >= 4*60_000, 'must not accept before a real completed check');
  assert.ok(elapsed < 6*60_000, 'registered queued check eventually finishes within the bounded grace');
  assert.ok(polls > 5);
  assert.equal(jobsRead, 1);
  assert.equal(result.executed.length, 1);
});

test('default hh-merge-check halves redundant multi-specialist polling without skipping exact-head jobs', async () => {
  const second = '.github/workflows/video-qa.yml';
  const files = { base: new Map([[path,yaml],[second,yaml]]),
    current: new Map([[path,yaml],[second,yaml]]),
    changedRows: [{filename:'lib/crm/a.js',status:'M'}] };
  const a = run('in_progress',null);
  const b = {...a,id:152,path:second};
  let elapsed = 0, reads = 0, jobs = 0;
  const api = {
    pr: async () => pr,
    target: async () => base,
    runs: async () => {
      reads++;
      return elapsed >= 240_000
        ? [{...a,status:'completed',conclusion:'success'},
          {...b,status:'completed',conclusion:'success'}]
        : [a,b];
    },
    jobs: async () => { jobs++; return [{name:'test',status:'completed',conclusion:'success'}]; },
  };
  const result = await verify(api,ctx,files,{maxWaitMs:10*60_000,now:()=>elapsed,
    sleep:async ms=>{assert.ok(ms>0&&ms<=60_000);elapsed+=ms;}});
  assert.equal(elapsed,240_000);
  assert.equal(reads,5,'five indexed HEAD reads vs nine at the old 30-second cadence');
  assert.equal(jobs,2,'both actual specialist jobs are still independently checked');
  assert.equal(result.executed.length,2);
});

test('running required sibling does not falsely exhaust queue grace while another Specialist awaits a runner',async()=>{
  const second='.github/workflows/video-qa.yml';
  const files={base:new Map([[path,yaml],[second,yaml]]),
    current:new Map([[path,yaml],[second,yaml]]),
    changedRows:[{filename:'lib/crm/a.js',status:'M'}]};
  const queued=run('queued',null);
  const active={...queued,id:152,path:second};
  let elapsed=0,reads=0,jobs=0;
  const api={
    pr:async()=>pr,target:async()=>base,
    runs:async()=>{
      reads++;
      const first=elapsed<15*60_000?queued:
        {...queued,status:elapsed<16*60_000?'in_progress':'completed',
          conclusion:elapsed<16*60_000?null:'success'};
      const sibling=elapsed<12*60_000?
        {...active,status:'in_progress',conclusion:null}:
        {...active,status:'completed',conclusion:'success'};
      return [first,sibling];
    },
    jobs:async()=>{jobs++;return [{name:'test',status:'completed',conclusion:'success'}];},
  };
  const accepted=await verify(api,ctx,files,{maxWaitMs:25*60_000,
    now:()=>elapsed,sleep:async ms=>{assert.ok(ms>0&&ms<=60_000);elapsed+=ms;}});
  assert.equal(elapsed,16*60_000,'still waits for actual completed proof');
  assert.equal(accepted.executed.length,2,'no skipped Specialist evidence');
  assert.equal(jobs,2);
  assert.ok(reads<30,'no extra burst polling');
});

test('required queued plus running siblings still time out globally, never count as PASS',async()=>{
  const second='.github/workflows/video-qa.yml';
  const files={base:new Map([[path,yaml],[second,yaml]]),
    current:new Map([[path,yaml],[second,yaml]]),
    changedRows:[{filename:'lib/crm/a.js',status:'M'}]};
  const queued=run('queued',null),running={...queued,id:152,path:second,status:'in_progress'};
  let elapsed=0;
  const api={pr:async()=>pr,target:async()=>base,runs:async()=>[queued,running],
    jobs:async()=>{throw Error('never accept queued or running as green');}};
  await assert.rejects(()=>verify(api,ctx,files,{maxWaitMs:12*60_000,
    now:()=>elapsed,sleep:async ms=>{assert.ok(ms>0&&ms<=60_000);elapsed+=ms;}}),
    /SPECIALIST_MISSING_OR_PENDING:RUNNING_TIMEOUT/);
  assert.equal(elapsed,12*60_000,'global deadline still caps all queue/sibling waits');
});

test('an explicitly extended queue budget permits a proven 20-minute hosted runner wait', async () => {
  let elapsed = 0, polls = 0, readJobs = 0;
  const api = {
    pr: async () => pr,
    changed: async () => [{filename: 'lib/crm/a.js'}],
    runs: async () => {
      polls++;
      if (elapsed < 19 * 60_000) return [run('queued', null)];
      if (elapsed < 20 * 60_000) return [run('in_progress', null)];
      return [run('completed', 'success')];
    },
    jobs: async () => {
      readJobs++;
      return [{name:'mobile',status:'completed',conclusion:'success'}];
    },
  };
  const result = await verify(api, ctx, sources, {
    queuedGraceMs: 25*60_000,
    now: () => elapsed,
    sleep: async ms => {
      assert.ok(ms > 0 && ms <= 60_000);
      elapsed += ms;
    },
  });
  assert.ok(elapsed >= 20 * 60_000, 'queue alone is never passing CI');
  assert.ok(elapsed < 35 * 60_000, 'completion stays within global budget');
  assert.equal(polls, 21, 'one read per minute over 20 minutes, not 41 reads every 30 seconds');
  assert.equal(readJobs, 1);
  assert.equal(result.executed.length, 1);
});

test('unresolved queued dependency stops at the shorter ten-minute default, not thirty-five', async () => {
  let elapsed = 0, reads = 0;
  const api = {
    pr: async () => pr,
    changed: async () => [{filename: 'lib/crm/a.js'}],
    runs: async () => { reads++; return [run('queued', null)]; },
    jobs: async () => { throw Error('queued workflow must never be accepted as success'); },
  };
  await assert.rejects(() => verify(api, ctx, sources, {
    now: () => elapsed,
    sleep: async ms => { assert.ok(ms > 0 && ms <= 60_000); elapsed += ms; },
  }), /SPECIALIST_MISSING_OR_PENDING:NOT_STARTED/);
  assert.equal(elapsed, 10 * 60_000, 'default queue budget is shorter than running timeout');
  assert.equal(reads, 11, 'one read per minute over ten minutes; never waive queued CI');
  assert.equal(diagnoseAggregateError(
    new Error('SPECIALIST_MISSING_OR_PENDING:NOT_STARTED:'+JSON.stringify({queued:[path+':queued']}))
  ).category, 'RUNNER_QUEUE');
});

test('registered queue still fails closed after a bounded startup budget', async () => {
  let elapsed = 0;
  const api = {
    pr: async () => pr,
    changed: async () => [{ filename: 'lib/crm/a.js' }],
    runs: async () => [run('queued', null)],
    jobs: async () => { throw Error('unstarted specialist cannot supply successful jobs'); },
  };
  const sleep = async ms => {
    assert.ok(ms > 0 && ms <= 60_000, 'bounded polling');
    elapsed += ms;
  };
  await assert.rejects(
    () => verify(api, ctx, sources, {
      now: () => elapsed, sleep, maxWaitMs: 35*60_000,
      queuedGraceMs: 5*60_000, pollMs: 30_000,
    }),
    /SPECIALIST_MISSING_OR_PENDING:NOT_STARTED/,
  );
  assert.equal(elapsed, 5*60_000);
});

test('loose base reuse is limited to normal public changes; privacy and policy require current base', () => {
  for (const files of [
    ['components/public-faq.js'], ['app/[locale]/academy/page.tsx'], ['public/images/new-image.webp'], ['docs/guide.md'],
    ['components/video-editor.tsx','scripts/verify-video-editor-browser.mjs'],
    ['scripts/benchmarking/video-timing.mjs'],
    ['components/mandala-free-video-studio.tsx','scripts/verify-holistic-mandala-browser.mjs'],
    ['scripts/verify-affirmation-voice-browser.mjs'],
    ['scripts/benchmarking/first-video-live-export.mjs'],
  ]) assert.equal(requiresCurrentProductionBase(files), false, files.join(','));
  for (const files of [
    [], ['scripts/ci-specialist-aggregate.mjs'], ['.github/workflows/hh-pr-core-release.yml'],
    ['package-lock.json'], ['app/api/payment/route.ts'], ['components/app/private-profile.jsx'],
    ['scripts/verify-payment-browser.mjs'], ['scripts/new-auth-guard.mjs'],
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


test('trusted static BASE jobs cannot be replaced by an unrelated green job', () => {
  const workflow = [
    'jobs:', '  guard-unit:',
    '    if: $' + "{{ github.event_name != 'pull_request' || github.event.pull_request.draft == false }}",
    '    runs-on: ubuntu-slim',
    '  renamed:', '    name: exact-contract-verifier', '    runs-on: ubuntu-latest',
    '  optional:', '    if: $' + "{{ github.event_name == 'workflow_dispatch' }}",
    '    runs-on: ubuntu-latest',
    '  matrix:', '    strategy:', '      matrix:', '        browser: [webkit, chromium]',
    '    runs-on: ubuntu-latest',
  ].join('\n');
  const required = trustedRequiredJobs(workflow);
  assert.deepEqual(required,['guard-unit','exact-contract-verifier']);
  const done = name => ({name,status:'completed',conclusion:'success'});
  assert.throws(()=>inspectJobs([done('unrelated')],path,[],required),/MISSING_REQUIRED_SPECIALIST_JOB/);
  assert.equal(inspectJobs([done('guard-unit'),done('exact-contract-verifier')],path,[],required),2);
});

test('wait only for missing jobs while independent completed Specialist jobs remain green',async()=>{
  const another='.github/workflows/mobile-extra.yml';
  const files={base:new Map([[path,yaml],[another,yaml]]),
    current:new Map([[path,yaml],[another,yaml]]),
    changedRows:[{filename:'lib/crm/a.js',status:'modified'}]};
  const a=run('completed','success'),b={...a,id:152,path:another};
  let elapsed=0,first=0,second=0,allRunReads=0;
  const done=[{name:'test',status:'completed',conclusion:'success'}];
  const api={pr:async()=>pr,target:async()=>base,
    runs:async()=>{allRunReads++;return [a,b];},
    jobs:async id=>id===151?(first++,done):((second++ === 0)?[]:done)};
  const result=await verify(api,ctx,files,{maxWaitMs:20_000,jobGraceMs:15_000,
    now:()=>elapsed,sleep:async ms=>{assert.ok(ms>0&&ms<=5_000);elapsed+=ms;},pollMs:1_000});
  assert.deepEqual(result.expected,[another,path].sort());
  assert.equal(first,1);assert.equal(second,2);assert.equal(allRunReads,1);
  assert.equal(result.executed.length,2);
});

test('missing required job fails closed after a bounded jobs-API grace',async()=>{
  let elapsed=0,reads=0;
  const files={...sources,changedRows:[{filename:'lib/crm/a.js',status:'modified'}]};
  const api={pr:async()=>pr,target:async()=>base,runs:async()=>[run('completed','success')],
    jobs:async()=>{reads++;return [{name:'unrelated',status:'completed',conclusion:'success'}];}};
  await assert.rejects(()=>verify(api,ctx,files,{maxWaitMs:5_000,jobGraceMs:1_200,
    now:()=>elapsed,sleep:async ms=>{elapsed+=ms;},pollMs:1_000}),/MISSING_REQUIRED_SPECIALIST_JOB/);
  assert.equal(elapsed,1_200);assert.equal(reads,3);
  assert.equal(diagnoseAggregateError(new Error('MISSING_REQUIRED_SPECIALIST_JOB:'+path+':test')).category,'REQUIRED_JOB_MISSING');
});

test('dependency phase classification preserves terminal cancellation without inventing a test failure', () => {
  const expected = [path];
  const from = (status, conclusion) => inspectWorkflowRuns({
    expected, pr, runs: [run(status, conclusion)],
  });
  for (const status of ['queued', 'requested', 'waiting', 'pending']) {
    const state = from(status, null);
    assert.deepEqual(state.queued, [path + ':' + status]);
    assert.deepEqual(state.running, []);
    assert.deepEqual(state.failed, []);
  }
  assert.deepEqual(from('in_progress', null).running, [path + ':in_progress']);
  assert.deepEqual(from('completed', 'failure').failed, [path + ':failure']);
  assert.deepEqual(from('completed', 'cancelled').cancelled, [path + ':cancelled']);
  assert.deepEqual(from('completed', 'timed_out').interrupted, [path + ':timed_out']);
  assert.deepEqual(from('completed', 'skipped').notExecuted, [path + ':skipped']);
  assert.deepEqual(from('completed', null).uncertain, [path + ':conclusion-unknown']);
  assert.equal(from('completed', 'success').passed.length, 1);
});

test('cancelled, skipped and infrastructure-interrupted specialists block immediately with accurate reasons', async () => {
  const clock = { maxWaitMs: 600_000, now: () => 0, sleep: async () => {
    throw Error('Terminal dependency must not enter a polling loop');
  } };
  const api = {
    pr: async () => pr, changed: async () => [{filename:'lib/crm/a.js'}],
    jobs: async () => { throw Error('Terminal dependency has no green jobs'); },
  };
  for (const [conclusion, category] of [
    ['cancelled', 'SPECIALIST_DEPENDENCY_CANCELLED'],
    ['skipped', 'SPECIALIST_DEPENDENCY_NOT_EXECUTED'],
    ['startup_failure', 'SPECIALIST_DEPENDENCY_INTERRUPTED'],
    ['failure', 'SPECIALIST_FAILED'],
  ]) {
    api.runs = async () => [run('completed', conclusion)];
    await assert.rejects(() => verify(api, ctx, sources, clock), new RegExp(category));
    assert.equal(diagnoseAggregateError(new Error(category + ':' +
      JSON.stringify({cancelled:[path + ':' + conclusion]}))).category,
      category === 'SPECIALIST_FAILED' ? 'SPECIALIST_FAILED' : category.slice('SPECIALIST_'.length));
  }
});

test('completed with unknown conclusion is retried briefly, not falsely marked source failure', async () => {
  let elapsed = 0;
  const api = {
    pr: async () => pr, changed: async () => [{filename:'lib/crm/a.js'}],
    runs: async () => [run('completed', null)],
    jobs: async () => { throw Error('Incomplete run cannot supply verified jobs'); },
  };
  await assert.rejects(() => verify(api, ctx, sources, {
    maxWaitMs: 120_000, now: () => elapsed, pollMs: 1000,
    sleep: async ms => { elapsed += ms; },
  }), /SPECIALIST_DEPENDENCY_INCOMPLETE/);
  assert.equal(elapsed, 30_000, 'ambiguous GitHub result has an independent thirty-second cap');
});

test('completed workflow with an unfinished jobs API never masquerades as a failed source test', async () => {
  let elapsed = 0;
  const api = {
    pr: async () => pr, changed: async () => [{filename:'lib/crm/a.js'}],
    runs: async () => [run('completed','success')],
    jobs: async () => [{name:'mobile',status:'in_progress',conclusion:null}],
  };
  await assert.rejects(() => verify(api, ctx, sources, {
    maxWaitMs: 15_000, jobGraceMs: 1500, pollMs: 500,
    now: () => elapsed, sleep: async ms => { elapsed += ms; },
  }), /SPECIALIST_DEPENDENCY_JOB_PENDING_TIMEOUT/);
  assert.equal(elapsed, 1500);
});

test('sensitive pending specialist keeps its HEAD and fails on genuine runner timeout, not BASE drift', async()=>{
  let elapsed=0,prReads=0,targetReads=0,workflowReads=0;
  const currentBase='c'.repeat(40);
  const sourcesPinned={...sources,changedRows:[{filename:'lib/crm/a.js',status:'M'}]};
  const api={
    pr:async()=>{prReads++;return pr;},
    target:async()=>{targetReads++;return elapsed>=60_000?currentBase:base;},
    runs:async()=>{workflowReads++;return [run('in_progress',null)];},
    jobs:async()=>{throw Error('running specialist is not successful job evidence');},
  };
  await assert.rejects(()=>verify(api,ctx,sourcesPinned,{
    now:()=>elapsed,sleep:async ms=>{assert.ok(ms>0&&ms<=30_000);elapsed+=ms;},
    maxWaitMs:120_000,pollMs:30_000,
  }),/SPECIALIST_MISSING_OR_PENDING:RUNNING_TIMEOUT/);
  assert.ok(elapsed>=120_000&&elapsed<=120_000,
    'preserve running specialist until its bounded deadline, never issue early base rejection');
  assert.equal(prReads,1,'read exact-HEAD PR at start; do not rebase midflight');
  assert.equal(targetReads,0,'no moving-target base check while a real specialist is active');
  assert.ok(workflowReads>=4&&workflowReads<=6,'bounded polling, no repeated CI dispatch');
});

test('ordinary public Specialist does not add live-base polling or skip applicable checks',async()=>{
  let elapsed=0, prReads=0, targetReads=0, jobsRead=0;
  const publicYaml=yaml.replace('lib/crm/**','components/**');
  const files={base:new Map([[path,publicYaml]]),
    current:new Map([[path,publicYaml]]),
    changedRows:[{filename:'components/public-faq.js',status:'M'}]};
  const api={
    pr:async()=>{prReads++;return pr;},
    target:async()=>{targetReads++;return 'c'.repeat(40);},
    runs:async()=>[elapsed<4*60_000?run('in_progress',null):run('completed','success')],
    jobs:async()=>{jobsRead++;return [{name:'test',status:'completed',conclusion:'success'}];},
  };
  const passed=await verify(api,ctx,files,{
    now:()=>elapsed,sleep:async ms=>{elapsed+=ms;},maxWaitMs:10*60_000,
  });
  assert.equal(passed.executed.length,1,'still require the completed real Specialist job');
  assert.ok(elapsed>=4*60_000);
  assert.equal(prReads,2,'ordinary public PR keeps original start/end liveness reads');
  assert.equal(targetReads,0,'unrelated production changes need no extra sensitive BASE probes');
  assert.equal(jobsRead,1);
});

test('one final running Specialist uses bounded fast polling and still requires successful jobs',async()=>{
  const second='.github/workflows/video-qa.yml';
  const files={base:new Map([[path,yaml],[second,yaml]]),
    current:new Map([[path,yaml],[second,yaml]]),
    changedRows:[{filename:'lib/crm/a.js',status:'M'}]};
  let elapsed=0,reads=0;const sleeps=[];
  const done={...run('completed','success'),id:151,path};
  const pending={...run('in_progress',null),id:152,path:second};
  const api={pr:async()=>pr,target:async()=>base,
    runs:async()=>{reads++;return [done,elapsed>=17_000?{...pending,status:'completed',conclusion:'success'}:pending];},
    jobs:async()=>[{name:'test',status:'completed',conclusion:'success'}]};
  const result=await verify(api,ctx,files,{now:()=>elapsed,
    maxWaitMs:120_000,pollMs:30_000,
    sleep:async ms=>{sleeps.push(ms);elapsed+=ms;}});
  assert.equal(result.executed.length,2,'fast polling is not a passing test');
  assert.deepEqual(sleeps,[10_000,10_000]);
  assert.equal(elapsed,20_000,'no extra full thirty-second wait');
  assert.equal(reads,3);
});

test('final-wave fast poll expires after 90 seconds then returns to low-API cadence',async()=>{
  const second='.github/workflows/video-qa.yml';
  const files={base:new Map([[path,yaml],[second,yaml]]),
    current:new Map([[path,yaml],[second,yaml]]),
    changedRows:[{filename:'lib/crm/a.js',status:'M'}]};
  let elapsed=0;const sleeps=[];
  const done={...run('completed','success'),id:151,path};
  const pending={...run('in_progress',null),id:152,path:second};
  const api={pr:async()=>pr,target:async()=>base,
    runs:async()=>[done,elapsed>=120_000?{...pending,status:'completed',conclusion:'success'}:pending],
    jobs:async()=>[{name:'test',status:'completed',conclusion:'success'}]};
  const result=await verify(api,ctx,files,{now:()=>elapsed,
    maxWaitMs:180_000,pollMs:30_000,
    sleep:async ms=>{assert.ok(ms>0&&ms<=30_000);sleeps.push(ms);elapsed+=ms;}});
  assert.equal(result.executed.length,2);
  assert.deepEqual(sleeps.slice(0,9),Array(9).fill(10_000));
  assert.equal(sleeps[9],30_000,'normal poll resumes after the final fast budget');
  assert.equal(elapsed,120_000);
});

test('multiple in-progress Specialist workflows keep normal thirty-second polling',async()=>{
  const second='.github/workflows/video-qa.yml';
  const files={base:new Map([[path,yaml],[second,yaml]]),
    current:new Map([[path,yaml],[second,yaml]]),
    changedRows:[{filename:'lib/crm/a.js',status:'M'}]};
  let elapsed=0;const sleeps=[];
  const a={...run('in_progress',null),id:151,path};
  const b={...run('in_progress',null),id:152,path:second};
  const api={pr:async()=>pr,target:async()=>base,
    runs:async()=>elapsed>=60_000
      ? [{...a,status:'completed',conclusion:'success'},{...b,status:'completed',conclusion:'success'}]
      : [a,b],
    jobs:async()=>[{name:'test',status:'completed',conclusion:'success'}]};
  const result=await verify(api,ctx,files,{now:()=>elapsed,
    maxWaitMs:120_000,pollMs:30_000,
    sleep:async ms=>{sleeps.push(ms);elapsed+=ms;}});
  assert.equal(result.executed.length,2);
  assert.deepEqual(sleeps,[30_000,30_000]);
});


test('real sensitive Specialist accepts independent raster drift while GitHub recomputes mergeability', async () => {
  const updated='c'.repeat(40);
  let current={...pr,mergeable:true,mergeable_state:'behind',
    base:{...pr.base,sha:updated}};
  const completeCompare=(filename='public/images/new-editor-banner.webp')=>({
    status:'ahead',ahead_by:1,behind_by:0,total_commits:1,
    base_commit:{sha:base},merge_base_commit:{sha:base},
    commits:[{sha:updated}],files:[{filename,status:'modified'}],
  });
  let compare=completeCompare();
  const api={
    pr:async()=>current,target:async()=>updated,compare:async()=>compare,
    changed:async()=>{throw Error('must retain trusted tested checkout rows');},
    runs:async()=>[run('completed','success')],
    jobs:async()=>[{name:'test',status:'completed',conclusion:'success'}],
  };
  const pinned={...sources,changedRows:[{filename:'lib/crm/a.js',status:'modified'}]};
  const accepted=await verify(api,ctx,pinned,{maxWaitMs:0});
  assert.equal(accepted.head,head);
  current={...current,mergeable:false,mergeable_state:'dirty'};
  await assert.rejects(()=>verify(api,ctx,pinned,{maxWaitMs:0}),/MERGE_CONFLICT/);
  current={...current,mergeable:null,mergeable_state:'unknown'};
  assert.equal((await verify(api,ctx,pinned,{maxWaitMs:0})).head,head,
    'pending GitHub mergeability is not a conflict; native merge still requires positive proof');
  current={...current,mergeable:true,mergeable_state:'behind'};
  compare=completeCompare('app/api/payment/route.ts');
  await assert.rejects(()=>verify(api,ctx,pinned,{maxWaitMs:0}),/PRODUCTION_BASE_CHANGED/);
});

test('composed independent BASE advance reuses the same HEAD only with complete protected row proofs', () => {
  const tested = 'c'.repeat(40), live = 'd'.repeat(40);
  const candidate = ['lib/crm/private-inbox.js'];
  const change = (paths) => ({
    status: 'ahead', ahead_by: 1, behind_by: 0, total_commits: 1,
    base_commit: { sha: tested }, merge_base_commit: { sha: tested },
    commits: [{ sha: live }],
    files: paths.map(filename => ({ filename, status: 'modified' })),
  });
  const good = change(['docs/help/getting-started.md', 'public/images/home/portrait.webp']);
  assert.equal(safeComposedIndependentAdvance(good, tested, live, candidate), true,
    'independent documentation + raster reuses real existing Core evidence');
  assert.equal(safeComposedIndependentAdvance(change([
    'docs/help/getting-started.md', 'tests/academy-module.test.mjs',
  ]), tested, live, candidate), true, 'unrelated domain tests remain independent');
  for (const blocked of [
    ['docs/help/getting-started.md', 'lib/crm/private-inbox.js'],
    ['docs/help/getting-started.md', '.github/workflows/hh-pr-core-release.yml'],
    ['docs/help/getting-started.md', 'lib/ci/specialist-aggregate.mjs'],
    ['docs/help/getting-started.md', 'app/api/auth/route.ts'],
    ['docs/help/getting-started.md', 'tests/ci-specialist-wait.test.mjs'],
  ]) {
    assert.equal(safeComposedIndependentAdvance(change(blocked), tested, live, candidate), false,
      'source overlap, protected release policy, shared security and sensitive code never pass: ' + blocked);
  }
  assert.equal(safeComposedIndependentAdvance({ ...good,
    files: [...good.files, { ...good.files[0] }] }, tested, live, candidate), false);
  assert.equal(safeComposedIndependentAdvance({ ...good,
    files: [{ ...good.files[0], status: 'renamed', previous_filename: 'docs/old.md' }, good.files[1]] },
    tested, live, candidate), false);
  assert.equal(safeComposedIndependentAdvance({ ...good, commits: [] }, tested, live, candidate), false);
  assert.equal(safeComposedIndependentAdvance({ ...good, status: 'diverged' }, tested, live, candidate), false);
  assert.equal(safeComposedIndependentAdvance({ ...good, files: [good.files[0]] }, tested, live, candidate), false,
    'single-category proof cannot substitute a complete-list check');
  assert.equal(safeComposedIndependentAdvance(good, tested, live, []), false);
});


test('#5093: protected BASE drift must not trigger auto-sync before required macOS movie test completes',async()=>{
 const workflow='.github/workflows/holistic-support-mandala.yml';
 const mediaYaml="on:\n  pull_request:\n    branches: ['codex/public-book-library']\n    paths:\n      - 'components/mandala-**'\n      - 'scripts/benchmarking/first-video-live-export.mjs'\njobs:\n  voice-webkit-macos:\n    runs-on: macos-15\n";
 const files={base:new Map([[workflow,mediaYaml]]),
  current:new Map([[workflow,mediaYaml]]),
  changedRows:[
   {filename:'components/mandala-free-video-studio.tsx',status:'M'},
   {filename:'scripts/benchmarking/first-video-live-export.mjs',status:'M'},
   // This separate regression deliberately exercises a SENSITIVE source:
   // ordinary video/QA files now treat unrelated target drift as advisory.
   {filename:'app/api/holistic-support/voice/route.js',status:'M'},
  ]};
 const latest='c'.repeat(40),ctx2={...ctx};
 const mediaPr={...pr,mergeable:true,mergeable_state:'behind',
  base:{...pr.base,sha:latest}};
 const checkedRun=(status,conclusion)=>({...run(status,conclusion),
  path:workflow,id:981,head_branch:pr.head.ref});
 let elapsed=0,polls=0,jobReads=0,baseReads=0,compares=0;
 const api={
  pr:async()=>mediaPr,target:async()=>{assert.equal(jobReads,1,'no final target authorization before Mac evidence');baseReads++;return latest;},
  compare:async()=>{compares++;return {
    status:'ahead',ahead_by:1,behind_by:0,total_commits:1,
    base_commit:{sha:base},merge_base_commit:{sha:base},
    commits:[{sha:latest}],
    files:[{filename:'app/api/auth/route.ts',status:'modified'}]
  };},
  runs:async()=>{polls++;return [polls===1?
    checkedRun('in_progress',null):checkedRun('completed','success')];},
  jobs:async()=>{jobReads++;return [{name:'voice-webkit-macos',
    status:'completed',conclusion:'success'}];},
 };
 await assert.rejects(()=>verify(api,ctx2,files,{
  maxWaitMs:120_000,pollMs:100,now:()=>elapsed,
  sleep:async ms=>{elapsed+=ms;},
 }),/PRODUCTION_BASE_CHANGED/);
 assert.equal(polls,2,'the real Mac specialist must finish before BASE is considered stale');
 assert.equal(jobReads,1,'successful exact-run macOS job evidence is independently read');
 assert.equal(compares,1,'only final protected BASE comparison can trigger auto-sync');
 assert.equal(baseReads,2,'two final target reads bracket the same proof after Mac completes');
 let redPolls=0,redBaseReads=0;
 await assert.rejects(()=>verify({...api,
  target:async()=>{redBaseReads++;return latest;},
  compare:async()=>{throw Error('a failed Mac must not be masked by BASE drift');},
  runs:async()=>{redPolls++;return [redPolls===1?
    checkedRun('in_progress',null):checkedRun('completed','failure')];}
 },ctx2,files,{maxWaitMs:120_000,pollMs:100,now:()=>elapsed,
  sleep:async ms=>{elapsed+=ms;},
 }),/SPECIALIST_FAILED/);
 assert.equal(redPolls,2,'must retain exact-HEAD failed-media evidence');
 assert.equal(redBaseReads,0,'never source-sync over a genuine macOS movie failure');
});


test('ordinary 20-file video/MP4 acceptance does not require a moving production BASE',()=>{
 const files=[
  'components/mandala-automatic-storyboard.tsx',
  'components/mandala-free-video-studio.tsx',
  'components/mandala-video-mobile.module.css',
  'lib/mandala/recording-codecs.d.mts',
  'lib/mandala/recording-codecs.mjs',
  'lib/mandala/webcodecs-mp4-export.ts',
  'scripts/benchmarking/complete-three-step-goals-quiz.mjs',
  'scripts/benchmarking/first-video-live-export.mjs',
  'scripts/benchmarking/real-guest-video-file.mjs',
  'scripts/benchmarking/verify-five-scene-stories-browser.mjs',
  'scripts/benchmarking/verify-original-motion-export.mjs',
  'scripts/verify-affirmation-voice-browser.mjs',
  'tests/mandala-automatic-storyboard-tab.test.mjs',
  'tests/mandala-express-one-click.test.mjs',
  'tests/mandala-free-video.test.mjs',
  'tests/mandala-native-audio-files.test.mjs',
  'tests/mandala-video-concept.test.mjs',
  'tests/mandala-webcodecs-mp4.test.mjs',
  'tests/mandala-workspace-tabs.test.mjs',
  'tests/video-director-chat-live-acceptance.test.mjs',
 ];
 assert.equal(requiresCurrentProductionBase(files),false,
   'a public 20-file video editor should preserve exact-HEAD Core/WebKit evidence');
 for(const sensitive of [
  'app/api/holistic-support/voice/route.js',
  'app/api/auth/route.ts',
  'lib/app/practitioner-access.js',
  'lib/mandala/private-client-session.mjs',
  'scripts/ci-specialist-aggregate.mjs',
  '.github/workflows/hh-pr-core-release.yml',
  'tests/ci-specialist-aggregate.test.mjs',
  'tests/privacy-consent.test.mjs',
  'tests/payment-checkout.test.mjs',
  'scripts/verify-auth-browser.mjs',
  'scripts/benchmarking/payment-export.mjs',
  'package-lock.json',
 ])assert.equal(requiresCurrentProductionBase([...files,sensitive]),true,
   'real security, release, privacy or paid source stays current-base strict: '+sensitive);
 assert.equal(requiresCurrentProductionBase([]),true);
});


test('#5160 accepts new independent namespaced source after production moves, never critical changes',async()=>{
  const live='c'.repeat(40), candidate=[
    'components/astral-chat-panel.tsx',
    'lib/astral-dialogue.mjs',
  ];
  const rows=[
    {filename:'components/solstice-signal.tsx',status:'modified'},
    {filename:'lib/solstice-calendar.mjs',status:'added'},
  ];
  const diff=(files=rows,overrides={})=>({
    status:'ahead',ahead_by:1,behind_by:0,total_commits:1,
    base_commit:{sha:base},merge_base_commit:{sha:base},
    commits:[{sha:live}],files,...overrides,
  });
  const safe=(files=rows,paths=candidate,mergeable=true,overrides={})=>
    safeIsolatedFeatureAdvance(diff(files,overrides),base,live,paths,mergeable);
  assert.equal(requiresCurrentProductionBase(candidate),true,
    'a public chat file remains sensitive to unrelated base movement in the old policy');
  assert.equal(safe(),true,
    'new independent namespaces should preserve real green exact-HEAD checks');
  for(const invalid of [
    'components/astral-card.tsx', // same namespace as candidate
    'components/lunar-chat-banner.tsx', // same assistant family despite different namespace
    'components/shared-button.tsx',
    'components/sitewide-alert.tsx',
    'lib/security/identity.mjs',
    'app/api/payments/route.ts',
    'lib/solstice-client-session.mjs',
    '.github/workflows/hh-pr-core-release.yml',
    'lib/ci/production-base-impact.mjs',
    'package-lock.json',
    'tests/ci-specialist-wait.test.mjs',
  ])assert.equal(safe([rows[0],{filename:invalid,status:'modified'}]),false,
    'same family, common code, private data, CI policy and dependencies must block: '+invalid);
  for(const blocked of [
    [{filename:rows[0].filename,status:'deleted'}],
    [{filename:rows[0].filename,status:'renamed',previous_filename:'components/old.tsx'}],
    [rows[0],rows[0]],
  ])assert.equal(safe(blocked),false,'deleted/renamed/duplicate compare files cannot authorize a merge');
  for(const bad of [
    {status:'diverged'},{behind_by:1},{commits:[]},
    {merge_base_commit:{sha:'d'.repeat(40)}},
    {files:[]},{total_commits:2},{ahead_by:2},
  ])assert.equal(safe(rows,candidate,true,bad),false,
    'unverifiable or incomplete protected history is not independently safe');
  assert.equal(safe(rows,candidate,false),false,'GitHub merge conflict must block');
  assert.equal(safe(rows,candidate,null),false,'unknown mergeability must not pass');
  assert.equal(safe(rows,['components/sitewide-alert.tsx']),false,'candidate shared root stays strict');
  assert.equal(safe(rows,['app/api/auth/route.ts']),false,'candidate critical source stays strict');
  assert.equal(safe(rows,['components/solstice-navbar.tsx']),false,'same namespace is not independent');
  const source={base:new Map(),current:new Map(),
    changedRows:candidate.map(filename=>({filename,status:'M'}))};
  let compared=0,targetReads=0;
  const active={...pr,mergeable:true,base:{...pr.base,sha:live}};
  const api={pr:async()=>active,target:async()=>{targetReads++;return live;},
    compare:async()=>{compared++;return diff();},
    runs:async()=>[],jobs:async()=>[]};
  const verified=await verify(api,ctx,source,{maxWaitMs:0});
  assert.equal(verified.head,head);
  assert.equal(compared,1,'one verified source and target comparison, not a new CI wave');
  assert.ok(targetReads>=1,'actual protected production ref was inspected');
  await assert.rejects(()=>verify({...api,pr:async()=>({...active,mergeable:false,mergeable_state:'dirty'})},
    ctx,source,{maxWaitMs:0}),/MERGE_CONFLICT/);
});

test('independent owner CI test addition does not invalidate an unrelated protected release',async()=>{
  const latest='c'.repeat(40);
  const owner={filename:'.github/workflows/hh-crm-source-check.yml',
    status:'modified',additions:2,deletions:0,changes:2,
    patch:"@@ -142,6 +142,8 @@ jobs:\n+      - name: Incident regression - Telegram Business and Shamanica requests\n+        run: node --test tests/crm-telegram-shamanica-course-intake.test.mjs\n"};
  const target=[owner,
    {filename:'app/api/app/crm/messenger/webhook/[provider]/route.js',status:'modified'},
    {filename:'lib/crm/telegram-secretary-service.js',status:'modified'},
    {filename:'tests/crm-telegram-shamanica-course-intake.test.mjs',status:'added'}];
  const diff=(files=target,extra={})=>({status:'ahead',ahead_by:1,behind_by:0,total_commits:1,
    base_commit:{sha:base},merge_base_commit:{sha:base},
    commits:[{sha:latest}],files,...extra});
  const media=['components/mandala-video-mobile.module.css','tests/mandala-free-video.test.mjs'];
  assert.equal(safeMixedProtectedAdvance(diff(),base,latest,media),true);
  assert.equal(safeMixedProtectedAdvance(diff(),base,latest,
    ['components/ali-secretary-widget.tsx']),false,'the same assistant family must never skip its owner');
  for(const changed of [
    {...owner,patch:owner.patch.replace('node --test','npm run')},
    {...owner,patch:owner.patch.replace('tests/crm-','tests/ci-')},
    {...owner,additions:3,changes:3},
    {...owner,deletions:1,changes:3},
    {filename:'.github/workflows/hh-pr-core-release.yml',status:'modified'},
    {filename:'package-lock.json',status:'modified'},
    {filename:'lib/ci/production-base-impact.mjs',status:'modified'},
    {filename:'app/api/auth/route.ts',status:'modified'},
  ])assert.equal(safeMixedProtectedAdvance(diff([changed]),base,latest,media),false,
    'never waive altered gates, shared dependencies, auth or shell: '+changed.filename);
  for(const bad of [{status:'diverged'},{behind_by:1},{commits:[]},
    {files:[owner,owner]},{files:[]},{files:[{...owner,status:'renamed'}]}])
    assert.equal(safeMixedProtectedAdvance(diff(target,bad),base,latest,media),false);
  const shamanica=['components/shamanica-profile-card.tsx'];
  assert.equal(requiresCurrentProductionBase(shamanica),true);
  const api={pr:async()=>({...pr,mergeable:true,base:{...pr.base,sha:latest}}),
    target:async()=>latest,compare:async()=>diff(),runs:async()=>[],jobs:async()=>[]};
  assert.equal((await verify(api,ctx,{base:new Map(),current:new Map(),
    changedRows:shamanica.map(filename=>({filename,status:'M'}))},{maxWaitMs:0})).head,head);
});

test('detached CI specialist policy reuses only unrelated protected product source',async()=>{
  const latest='c'.repeat(40);
  const candidate=['lib/ci/production-base-impact.mjs','tests/ci-specialist-wait.test.mjs'];
  const target=[
    {filename:'components/mandala-video-idea-goal.tsx',status:'modified'},
    {filename:'components/shamanica-mobile.tsx',status:'modified'},
    {filename:'lib/crm/telegram-secretary-service.js',status:'modified'},
    {filename:'tests/crm-telegram-shamanica-course-intake.test.mjs',status:'added'},
  ];
  const diff=(files=target,extra={})=>({status:'ahead',ahead_by:1,behind_by:0,total_commits:1,
    base_commit:{sha:base},merge_base_commit:{sha:base},
    commits:[{sha:latest}],files,...extra});
  assert.equal(safeDetachedCiSourceAdvance(diff(),base,latest,candidate),true);
  for(const blocked of [
    '.github/workflows/hh-crm-source-check.yml',
    '.github/workflows/hh-pr-core-release.yml','lib/ci/specialist-aggregate.mjs',
    'components/shared/nav.tsx','app/api/auth/route.ts','lib/security/permissions.mjs',
    'package-lock.json','supabase/migrations/seed.sql',
  ])assert.equal(safeDetachedCiSourceAdvance(diff([
    ...target,{filename:blocked,status:'modified'}]),base,latest,candidate),false,blocked);
  for(const unsafeCandidate of [
    ['tests/ci-specialist-wait.test.mjs'],
    [...candidate,'.github/workflows/hh-pr-core-release.yml'],
    [...candidate,'components/mandala-free-video-studio.tsx'],
  ])assert.equal(safeDetachedCiSourceAdvance(diff(),base,latest,unsafeCandidate),false);
  for(const invalid of [
    {status:'diverged'},{commits:[]},{behind_by:1},{files:[]},
    {files:[target[0],target[0]]},{files:[{...target[0],status:'deleted'}]},
  ])assert.equal(safeDetachedCiSourceAdvance(diff(target,invalid),base,latest,candidate),false);
  const active={...pr,mergeable:true,base:{...pr.base,sha:latest}};
  const api={pr:async()=>active,target:async()=>latest,compare:async()=>diff(),
    runs:async()=>[],jobs:async()=>[]};
  assert.equal((await verify(api,ctx,{base:new Map(),current:new Map(),
    changedRows:candidate.map(filename=>({filename,status:'M'}))},{maxWaitMs:0})).head,head);
  await assert.rejects(()=>verify({...api,pr:async()=>({...active,mergeable:false,mergeable_state:'dirty'})},ctx,
    {base:new Map(),current:new Map(),changedRows:candidate.map(filename=>({filename,status:'M'}))},
    {maxWaitMs:0}),/MERGE_CONFLICT/);
});

test('all required specialists finish before BASE_ADVANCED; not only macOS (#5199/#5208)',async()=>{
  const drift='c'.repeat(40);
  const sources={base:new Map([[path,yaml]]),current:new Map([[path,yaml]]),
    changedRows:[{filename:'lib/crm/a.js',status:'M'}]};
  const live={...pr,mergeable:true,base:{...pr.base,sha:drift}};
  const diff={status:'ahead',ahead_by:1,behind_by:0,total_commits:1,
    base_commit:{sha:base},merge_base_commit:{sha:base},
    commits:[{sha:drift}],files:[{filename:'app/api/auth/route.ts',status:'modified'}]};
  let polls=0,baseReads=0,compares=0,jobReads=0,elapsed=0;
  const api={pr:async()=>live,target:async()=>{baseReads++;return drift;},
    compare:async()=>{compares++;return diff;},
    runs:async()=>[++polls===1?run('in_progress',null):run('completed','success')],
    jobs:async()=>{jobReads++;return [{name:'test',status:'completed',conclusion:'success'}];}};
  await assert.rejects(()=>verify(api,ctx,sources,{maxWaitMs:120_000,pollMs:100,
    now:()=>elapsed,sleep:async ms=>{elapsed+=ms;}}),/PRODUCTION_BASE_CHANGED/);
  assert.equal(polls,2,'the actual specialist should finish before base reconciliation');
  assert.equal(jobReads,1,'read the exact-HEAD completed specialist job');
  assert.equal(baseReads,2,'final target proof is bracketed by two reads, not an early rejection');
  assert.equal(compares,1,'do not repeatedly compare moving production during CI');
  let redPolls=0,redBaseReads=0;
  await assert.rejects(()=>verify({...api,
    target:async()=>{redBaseReads++;return drift;},
    compare:async()=>{throw Error('must not hide real failed specialist');},
    runs:async()=>[++redPolls===1?run('in_progress',null):run('completed','failure')]
  },ctx,sources,{maxWaitMs:120_000,pollMs:100,
    now:()=>elapsed,sleep:async ms=>{elapsed+=ms;}}),/SPECIALIST_FAILED/);
  assert.equal(redPolls,2);
  assert.equal(redBaseReads,0,'a failed specialist is reported before stale-base recovery');
  let noSpecialistReads=0;
  await assert.rejects(()=>verify({...api,
    runs:async()=>{noSpecialistReads++;return [];}
  },ctx,{base:new Map(),current:new Map(),
    changedRows:[{filename:'lib/crm/a.js',status:'M'}]},{maxWaitMs:0}),
    /PRODUCTION_BASE_CHANGED/);
  assert.equal(noSpecialistReads,0,'no required specialist means base is checked early');
});

test('Light v2 router policy survives independently protected CRM and video base advances',()=>{
 const base='a'.repeat(40), live='b'.repeat(40);
 const proposed=['scripts/ci-quick-route.mjs','tests/ci-quick-route.test.mjs',
   'docs/operations/MERGE_CHECK_LIGHT_V2_20261120.md'];
 const target=[
   '.github/workflows/hh-crm-source-check.yml',
   'app/api/app/crm/messenger/webhook/[provider]/route.js',
   'lib/crm/telegram-secretary-service.js',
   'tests/crm-telegram-shamanica-course-intake.test.mjs',
   'components/mandala-video-idea-goal.tsx',
   'lib/mandala/video-personal-goal-composer.mjs',
 ];
 const diff=(filenames=target,override={})=>({
   status:'ahead',ahead_by:1,behind_by:0,total_commits:1,
   base_commit:{sha:base},merge_base_commit:{sha:base},
   commits:[{sha:live}],
   files:filenames.map(filename=>({filename,status:'modified'})),
   ...override,
 });
 assert.equal(safeIndependentRouterPolicyAdvance(diff(),base,live,proposed),true);
 assert.equal(safeMixedProtectedAdvance(diff(),base,live,proposed),true,
   'do not restart unchanged successful Core solely because another protected product PR shipped');
 for (const path of [
   'scripts/ci-quick-route.mjs',
   '.github/workflows/hh-pr-core-release.yml',
   '.github/workflows/hh-native-auto-merge.yml',
   '.github/workflows/holistic-support-mandala.yml',
   'lib/ci/specialist-aggregate.mjs',
   'tests/ci-heavy-impact.test.mjs',
   'package-lock.json','next.config.ts',
   'supabase/migrations/20261120_private.sql',
   'app/api/auth/login/route.js',
   'lib/billing/checkout.js',
   'components/ui/global-nav.tsx',
 ]) assert.equal(safeIndependentRouterPolicyAdvance(diff([path]),base,live,proposed),false,path);
 for (const invalid of [
   {status:'diverged'}, {behind_by:1}, {total_commits:2}, {commits:[]},
   {merge_base_commit:{sha:'c'.repeat(40)}},
   {files:[{filename:target[0],status:'renamed',previous_filename:'old.yml'}]},
   {files:[{filename:target[0],status:'deleted'}]},
   {files:[{filename:target[0],status:'modified'},{filename:target[0],status:'modified'}]},
   {files:[]},
 ]) assert.equal(safeIndependentRouterPolicyAdvance(diff(target,invalid),
   base,live,proposed),false,'no unverifiable or incomplete production delta');
 assert.equal(safeIndependentRouterPolicyAdvance(diff(),base,live,
   [...proposed,'components/mandala-free-video-studio.tsx']),false,
   'mixed application changes must keep strict production checks');
 assert.equal(safeIndependentRouterPolicyAdvance(diff(),base,live,
   ['lib/ci/specialist-aggregate.mjs']),false,
   'not a general permission to bypass other sensitive CI policy changes');
});


test('unrelated public page-only protected advances do not invalidate a private exact-HEAD suite', () => {
  const old = 'c'.repeat(40), newer = 'd'.repeat(40);
  const candidate = ['app/api/app/ali-greeting/route.ts'];
  const delta = files => ({
    status: 'ahead', ahead_by: 1, behind_by: 0, total_commits: 1,
    base_commit: {sha:old}, merge_base_commit: {sha:old},
    commits: [{sha:newer}],
    files: files.map(filename => ({filename,status:'modified'})),
  });
  const publicOnly = delta([
    'app/[locale]/shamanica/results/page.tsx',
    'app/[locale]/practice/page.jsx',
    'public/images/holistic-house/shamanic-approved-room.webp',
    'docs/design/SHAMANIC_APPROVED.md',
  ]);
  assert.equal(safeUnrelatedPublicLeafAdvance(publicOnly,old,newer,candidate),true);
  for (const path of [
    'app/api/app/crm/messenger/route.js',
    'app/[locale]/app/messages/page.tsx',
    'app/[locale]/ali-greeting/page.tsx',
    'app/unified-mobile-dock.css',
    'app/[locale]/layout.tsx',
    'components/shared/site-nav.tsx',
    'lib/shared/authorization.ts',
    'components/app/messages-orders-clients.jsx',
    'lib/ci/specialist-aggregate.mjs',
    '.github/workflows/ia-v2.yml',
    'package.json',
    'supabase/migrations/20261121120000_crm.sql',
  ]) {
    assert.equal(safeUnrelatedPublicLeafAdvance(delta([path]),old,newer,candidate),false,path);
  }
  assert.equal(safeUnrelatedPublicLeafAdvance(delta([candidate[0]]),old,newer,candidate),false);
  assert.equal(safeUnrelatedPublicLeafAdvance({...publicOnly,status:'diverged'},old,newer,candidate),false);
  assert.equal(safeUnrelatedPublicLeafAdvance({...publicOnly,commits:[]},old,newer,candidate),false);
  assert.equal(safeUnrelatedPublicLeafAdvance({...publicOnly,files:[
    {...publicOnly.files[0],status:'renamed',previous_filename:'app/old/page.tsx'}]},old,newer,candidate),false);
  assert.equal(safeUnrelatedPublicLeafAdvance(publicOnly,old,newer,['package.json']),false);
});


test('specialist leaf-trigger scope can reuse exact-HEAD green checks over two independently protected video content promotions', () => {
  const base = 'a'.repeat(40), live = 'b'.repeat(40);
  const candidate = [
    '.github/workflows/hh-course-presets.yml',
    '.github/workflows/hh-interpretation-database.yml',
    '.github/workflows/hh-personal-coaching-session.yml',
    '.github/workflows/hh-private-audio-e2e.yml',
    '.github/workflows/hh-profile-axis-matching.yml',
    '.github/workflows/practice-google-browser.yml',
    '.github/workflows/practice-visual-services.yml',
    'tests/ci-workflow-globs.test.mjs',
  ];
  const video = [
    'data/video-catalog/meaning-axis-energy-phrases-512-v1.json',
    'docs/videos/ENERGY_SUPPORT_PHRASES_512_20261122.md',
    'tests/meaning-axis-energy-phrases-style-512.test.mjs',
    'components/mandala-auto-video-director.tsx',
    'components/mandala-free-video-studio.tsx',
    'tests/mandala-auto-video-director-ui.test.mjs',
    'tests/mandala-mobile-video-design.test.mjs',
  ];
  const diff = (filenames=video, overrides={})=>({
    status:'ahead',ahead_by:2,behind_by:0,total_commits:2,
    base_commit:{sha:base},merge_base_commit:{sha:base},
    commits:[{sha:'c'.repeat(40)},{sha:live}],
    files:filenames.map(filename=>({filename,status:'modified'})),
    ...overrides,
  });
  const check = (delta,candidates=candidate) =>
    safeStandaloneVideoAfterSpecialistScopeAdvance(delta,base,live,candidates);
  assert.equal(check(diff()),true);
  assert.equal(safeMixedProtectedAdvance(diff(),base,live,candidate),true);
  // This exception must NOT apply to any changed Core, other specialist,
  // security, privacy, payment, configuration or shared runtime source.
  for (const unsafe of [
    '.github/workflows/hh-pr-core-release.yml',
    '.github/workflows/holistic-support-mandala.yml',
    '.github/workflows/hh-pr-sweep-guard.yml',
    'lib/ci/specialist-aggregate.mjs',
    'tests/ci-specialist-aggregate.test.mjs',
    'app/api/app/live-photos/route.js',
    'app/api/auth/route.ts',
    'components/app/my-page-client.jsx',
    'lib/security/permissions.mjs',
    'lib/billing/checkout.js',
    'supabase/migrations/20261122_private.sql',
    'package-lock.json',
    'next.config.ts',
    'middleware.ts',
  ]) assert.equal(check(diff([...video,unsafe])),false,unsafe);
  for (const proposed of [
    candidate.slice(1),
    [...candidate,'.github/workflows/hh-pr-core-release.yml'],
    [...candidate,'components/mandala-free-video-studio.tsx'],
    ['tests/ci-workflow-globs.test.mjs'],
  ]) assert.equal(check(diff(),proposed),false,'must preserve exact specialist cohort');
  for (const invalid of [
    {status:'diverged'}, {behind_by:1}, {total_commits:3},
    {commits:[]}, {merge_base_commit:{sha:'d'.repeat(40)}},
    {files:[]},
    {files:[{filename:video[0],status:'deleted'}]},
    {files:[{filename:video[0],status:'renamed',previous_filename:'old.json'}]},
    {files:[{filename:video[0],status:'modified'},{filename:video[0],status:'modified'}]},
  ]) assert.equal(check(diff(video,invalid)),false,'must reject incomplete or ambiguous protected Compare');
});

test('pending mergeability refresh is bounded, exact-head and fail-closed',async()=>{
  const target='c'.repeat(40);
  const pending={...pr,base:{...pr.base,sha:target},mergeable:null};
  const good={...pending,mergeable:true};
  let reads=0,waits=[];
  const api={pr:async()=>++reads===1?pending:good,target:async()=>target};
  assert.equal(await awaitPositiveMergeability(api,ctx,target,async ms=>{waits.push(ms);}),good);
  assert.deepEqual(waits,[1000,2000]);
  waits=[];
  assert.equal(await awaitPositiveMergeability({...api,pr:async()=>pending},ctx,target,async ms=>{waits.push(ms);}),null);
  assert.deepEqual(waits,[1000,2000,4000]);
  assert.equal(await awaitPositiveMergeability({...api,pr:async()=>good,target:async()=>base},ctx,target,async()=>{}),null);
  assert.equal(await awaitPositiveMergeability({...api,pr:async()=>({...good,base:{...good.base,sha:base}})},ctx,target,async()=>{}),null);
  for(const [next,error] of [
    [{...good,mergeable:false},/MERGE_CONFLICT/],
    [{...good,head:{...good.head,sha:target}},/PR_HEAD_CHANGED/],
    [{...good,draft:true},/PR_DRAFT/],
  ]) await assert.rejects(()=>awaitPositiveMergeability({...api,pr:async()=>next},ctx,target,async()=>{}),error);
});

test('positive-only detached CI proof refreshes transient null without rerun, but unsafe changes stay blocked',async()=>{
  const latest='c'.repeat(40);
  const candidate=['lib/ci/production-base-impact.mjs','tests/ci-specialist-wait.test.mjs'];
  const target=[
    {filename:'components/mandala-video-idea-goal.tsx',status:'modified'},
    {filename:'components/shamanica-mobile.tsx',status:'modified'},
    {filename:'lib/crm/telegram-secretary-service.js',status:'modified'},
    {filename:'tests/crm-telegram-shamanica-course-intake.test.mjs',status:'added'},
  ];
  const diff=(rows=target)=>({status:'ahead',ahead_by:1,behind_by:0,total_commits:1,
    base_commit:{sha:base},merge_base_commit:{sha:base},
    commits:[{sha:latest}],files:rows});
  const pending={...pr,mergeable:null,base:{...pr.base,sha:latest}};
  const good={...pending,mergeable:true};
  let ready=false, waits=[];
  const api={pr:async()=>ready?good:pending,target:async()=>latest,compare:async()=>diff(),
    runs:async()=>[],jobs:async()=>[]};
  const files={base:new Map(),current:new Map(),
    changedRows:candidate.map(filename=>({filename,status:'M'}))};
  assert.equal((await verify(api,ctx,files,{maxWaitMs:10000,sleep:async ms=>{waits.push(ms);ready=true;}})).head,head);
  assert.deepEqual(waits,[1000]);
  ready=false;waits=[];
  await assert.rejects(()=>verify({...api,compare:async()=>diff([...target,{filename:'package-lock.json',status:'modified'}])},
    ctx,files,{maxWaitMs:10000,sleep:async ms=>{waits.push(ms);}}),/PRODUCTION_BASE_CHANGED/);
  assert.deepEqual(waits,[]);
});

test('owner loose-base policy: actual #5682 protected delta does not discard successful exact-HEAD checks', async () => {
  const tested = '76633ffe2a215d4e1e9919a632edb1a20f88d079', target = 'bda9ed625796e4fb3cca1c3b0d014f6fb90025b0';
  const candidates = [
  "app/api/holistic-agent/lukas-owner-check/route.js",
  "components/ali-audio-call.module.css",
  "components/ali-audio-call.tsx",
  "components/ali-lukas-video.jsx",
  "components/app/messenger-ai-landing.module.css",
  "components/app/messenger-ai-landing.tsx",
  "components/holistic-agent-chat.module.css",
  "components/holistic-agent-chat.tsx",
  "components/voice-companion-controls.tsx",
  "docs/coaching/LUKAS_VISIBLE_ENTRY_FIX_20261126.md",
  "lib/coaching/lukas-owner-check.mjs",
  "lib/voice-companion/browser-voice.d.mts",
  "lib/voice-companion/browser-voice.mjs",
  "tests/ali-chat-live-voice-mic.test.mjs",
  "tests/lukas-owner-check.test.mjs",
  "tests/voice-companion-browser.test.mjs",
  "tests/voice-companion-integration.test.mjs"
];
  const targetRows = [
  {
    "filename": "app/admin/learning/page.jsx",
    "status": "modified"
  },
  {
    "filename": "components/mandala-auto-video-director.module.css",
    "status": "modified"
  },
  {
    "filename": "components/mandala-auto-video-director.tsx",
    "status": "modified"
  },
  {
    "filename": "lib/crm/telegram-wave-local-reply.mjs",
    "status": "modified"
  },
  {
    "filename": "lib/holistic-support/ali-dialogue-quality.mjs",
    "status": "added"
  },
  {
    "filename": "lib/holistic-support/natural-dialogue.mjs",
    "status": "modified"
  },
  {
    "filename": "lib/holistic-support/wave-native-router.mjs",
    "status": "modified"
  },
  {
    "filename": "lib/mandala/category-video-storyboard.d.mts",
    "status": "modified"
  },
  {
    "filename": "lib/mandala/category-video-storyboard.mjs",
    "status": "modified"
  },
  {
    "filename": "lib/mandala/mytube-personal-video-brief.d.mts",
    "status": "added"
  },
  {
    "filename": "lib/mandala/mytube-personal-video-brief.mjs",
    "status": "added"
  },
  {
    "filename": "lib/mandala/prompt-shot-director.mjs",
    "status": "modified"
  },
  {
    "filename": "lib/mandala/video-emotional-scene-plan.d.mts",
    "status": "modified"
  },
  {
    "filename": "lib/mandala/video-emotional-scene-plan.mjs",
    "status": "modified"
  },
  {
    "filename": "tests/mytube-personal-video-brief-integration.test.mjs",
    "status": "added"
  },
  {
    "filename": "tests/mytube-plot-montage.test.mjs",
    "status": "modified"
  },
  {
    "filename": "tests/natural-dialogue.test.mjs",
    "status": "modified"
  }
];
  const delta = {status:'ahead',ahead_by:2,behind_by:0,total_commits:2,
    base_commit:{sha:tested},merge_base_commit:{sha:tested},
    commits:[{sha:'9dadc41800381d2442e7f5df62c78547c0a4f62b'},{sha:target}],files:targetRows};
  assert.equal(safeNonOverlappingProductAdvance(delta,tested,target,candidates),true);
  for (const filename of [candidates[0],'package-lock.json','lib/auth/permissions.mjs',
      'lib/ci/production-base-impact.mjs','supabase/migrations/private.sql',
      'components/shared/nav.tsx','app/api/example/route.js','app/[locale]/layout.tsx','unknown.txt']) {
    assert.equal(safeNonOverlappingProductAdvance({...delta,files:[...targetRows,{filename,status:'modified'}]},tested,target,candidates),false,filename);
  }
  for (const invalid of [{status:'diverged'},{behind_by:1},{commits:[]},
    {files:[{filename:targetRows[0].filename,status:'renamed',previous_filename:'old.js'}]},
    {files:[{filename:targetRows[0].filename,status:'removed'}]},
    {files:[targetRows[0],targetRows[0]]},
    {files:Array.from({length:300},(_,i)=>({filename:'components/test-'+i+'.tsx',status:'added'}))}]) {
    assert.equal(safeNonOverlappingProductAdvance({...delta,...invalid},tested,target,candidates),false);
  }
  assert.equal(safeNonOverlappingProductAdvance(delta,tested,target,[...candidates,'package-lock.json']),false);
  const exact = {...pr,mergeable:true,base:{...pr.base,sha:target}};
  const candidateSources = {base:new Map(),current:new Map(),changedRows:candidates.map(filename=>({filename,status:'M'}))};
  const args = {...ctx,base:tested};
  const api = {pr:async()=>exact,target:async()=>target,compare:async()=>delta,runs:async()=>[],jobs:async()=>[]};
  assert.equal((await verify(api,args,candidateSources,{maxWaitMs:0})).head,head);
  await assert.rejects(()=>verify({...api,pr:async()=>({...exact,mergeable:false})},args,candidateSources,{maxWaitMs:0}),/MERGE_CONFLICT/);
  await assert.rejects(()=>verify({...api,pr:async()=>({...exact,mergeable:null})},args,candidateSources,{maxWaitMs:0}),/PRODUCTION_BASE_CHANGED/);
  await assert.rejects(()=>verify({...api,pr:async()=>({...exact,head:{...exact.head,sha:target}})},args,candidateSources,{maxWaitMs:0}),/PR_HEAD_CHANGED/);
});


test('reviewed public readiness delta preserves unrelated exact-HEAD CI including additive server deps',()=>{
 const old="bd14ab3837799aa2188ce8158d77b11c672bc003",live="86a1145511fbfba7cf9a0896de760b9d82c89f96";
 const delta={
  "status": "ahead",
  "ahead_by": 1,
  "behind_by": 0,
  "total_commits": 1,
  "base_commit": {
    "sha": "bd14ab3837799aa2188ce8158d77b11c672bc003"
  },
  "merge_base_commit": {
    "sha": "bd14ab3837799aa2188ce8158d77b11c672bc003"
  },
  "commits": [
    {
      "sha": "86a1145511fbfba7cf9a0896de760b9d82c89f96"
    }
  ],
  "files": [
    {
      "filename": "components/shamanica-business-content.tsx",
      "status": "modified",
      "additions": 2,
      "deletions": 1,
      "changes": 3,
      "patch": "@@ -178,7 +178,8 @@ export function ShamanicaBusinessContent({locale}:{locale:PublicLocale}){\n   const index=BUSINESS_SERVICES.indexOf(id);\n   return t.services[index>=0?index:0];\n  };\n- return <div className={styles.root} data-shamanica-business>\n+ // Mark this client component only after its DOM ref has committed (not during SSR).\n+ return <div className={styles.root} data-shamanica-business ref={node=>{if(node)node.dataset.businessHydrated=\"true\";}}>\n   <details className={styles.quizDrawer} data-business-extras><summary>{locale===\"ru\"?\"Подобрать решение · 3 вопроса\":locale===\"es\"?\"Encontrar solución · 3 preguntas\":\"Find my approach · 3 questions\"}<ArrowRight size={17} aria-hidden=\"true\"/></summary>\n   <section id=\"business-quiz\" className={styles.quiz} data-business-quiz data-quiz-step={step+1} aria-labelledby=\"business-quiz-heading\">\n    <div className={styles.quizTop}>"
    },
    {
      "filename": "scripts/verify-public-services-production.mjs",
      "status": "modified",
      "additions": 4,
      "deletions": 2,
      "changes": 6,
      "patch": "@@ -137,6 +137,9 @@ try {\n   await page.goto(origin+\"/\"+locale+\"/shamanica/business\",{waitUntil:\"domcontentloaded\",timeout:75000});\n   const section=page.locator(\"[data-shamanica-business]\");\n   await visible(section);\n+  // The native disclosure can open before React hydration and be reset when\n+  // the client subtree commits. Wait for this component, not router internals.\n+  await expect(section).toHaveAttribute(\"data-business-hydrated\",\"true\",{timeout:30000});\n   await expect(page.locator(\"[data-sitewide-antistress-banner]\")).toHaveCount(0);\n   await expect(page.locator(\"[data-hh-ihelp-trigger]:visible\")).toHaveCount(0);\n   await expect(page.locator(\"[data-shamanica-ihelp-trigger]\")).toBeVisible();\n@@ -195,8 +198,7 @@ try {\n   assert.ok(m.dockTop>=0&&m.dockBottom<=m.viewportHeight+2,\n     \"Business fixed dock must remain inside viewport \"+locale+\"/\"+width+\" \"+JSON.stringify(m));\n   if(locale===\"ru\"&&width===390)await page.screenshot({path:output+\"/shamanica-business-ru-390.png\",fullPage:false});\n-  await expect.poll(()=>page.evaluate(()=>history.pushState.toString().includes(\"__NA\")),\n-   {timeout:30000,message:\"Business quiz hydration\"}).toBe(true);\n+  await expect(shelves.locator('[data-business-shelf=\"express\"]')).toBeVisible();\n   await shelves.locator('[data-business-shelf=\"express\"]').click();\n   await expect(shelves).toHaveAttribute(\"data-expanded\",\"true\");\n   await expect(shelves.locator('[data-business-second-level=\"express\"] [data-business-subservice]')).toHaveCount(5);"
    }
  ]
};
 const clone=x=>JSON.parse(JSON.stringify(x));
 const paths=['components/my-coach-live-dialogue.jsx','supabase/migrations/coaching.sql','.github/workflows/hh-personal-coaching-session.yml','package.json','package-lock.json','tests/coach-new.test.mjs'];
 const a={name:'hh',dependencies:{react:'19.0.0'},scripts:{'test:app':'node --conditions=react-server --test tests/coach-old.integration.mjs && npm run test:monetization'}};
 const b=clone(a);b.dependencies.ws='8.23.0';b.scripts['test:app']=b.scripts['test:app'].replace(' &&',' tests/coach-new.test.mjs &&');
 const l={lockfileVersion:3,packages:{'':{dependencies:a.dependencies},'node_modules/react':{version:'19.0.0',integrity:'sha512-fixture'}}};
 const m=clone(l);m.packages[''].dependencies=b.dependencies;m.packages['node_modules/ws']={version:'8.23.0',integrity:'sha512-fixture'};
 const proof={basePackage:JSON.stringify(a),currentPackage:JSON.stringify(b),baseLock:JSON.stringify(l),currentLock:JSON.stringify(m)};
 const accept=(d=delta,p=paths,e=proof)=>safeNonOverlappingProductAdvance(d,old,live,p,e);
 assert.equal(accept(),true);
 assert.equal(accept(delta,['components/another-feature.jsx'],{}),true);
 assert.equal(accept(delta,paths,{}),false);
 for(const p of ['components/shamanica-business-content.tsx','components/mandatory-messenger-actions.tsx','app/[locale]/layout.tsx','lib/ci/production-base-impact.mjs','.github/workflows/hh-pr-core-release.yml'])assert.equal(accept(delta,[...paths,p]),false,p);
 for(const altered of [{...delta,commits:[]},{...delta,status:'diverged'},{...delta,files:[delta.files[0]]},{...delta,files:[...delta.files,{filename:'lib/auth/session.js',status:'modified'}]},{...delta,files:[{...delta.files[0],patch:delta.files[0].patch+'\\n+ unknown()'},delta.files[1]]},{...delta,files:[{...delta.files[0],status:'renamed'},delta.files[1]]}])assert.equal(accept(altered),false);
 const upgraded=clone(m);upgraded.packages['node_modules/react'].version='20.0.0';assert.equal(accept(delta,paths,{...proof,currentLock:JSON.stringify(upgraded)}),false);
 const bad=clone(b);bad.scripts['test:app']=bad.scripts['test:app'].split(' &&')[0];assert.equal(accept(delta,paths,{...proof,currentPackage:JSON.stringify(bad)}),false);
 const injected=clone(b);injected.scripts.prebuild='echo bypass';assert.equal(accept(delta,paths,{...proof,currentPackage:JSON.stringify(injected)}),false);
});


test('mixed tested candidate: independent protected domain is not stale just because PR has API, migration or feature workflow', async () => {
  const target='d'.repeat(40);
  const candidate=['app/api/app/clarity-course/route.js','components/my-coach-live-dialogue.jsx',
    'supabase/migrations/coaching.sql','.github/workflows/hh-personal-coaching-session.yml'];
  const rows=['components/shamanica-business-content.tsx','components/tarot-deck.jsx',
    'tests/shamanica-business.test.mjs'].map(filename=>({filename,status:'modified'}));
  const delta={status:'ahead',ahead_by:3,behind_by:0,total_commits:3,
    base_commit:{sha:base},merge_base_commit:{sha:base},
    commits:[{sha:'e'.repeat(40)},{sha:'f'.repeat(40)},{sha:target}],files:rows};
  const yes=(d=delta,p=candidate,e)=>safeIndependentMixedCandidateAdvance(d,base,target,p,e);
  assert.equal(yes(),true);
  assert.equal(yes(delta,[...candidate,'components/shamanica-intro.jsx']),false);
  assert.equal(yes(delta,[...candidate,'package-lock.json']),false);
  assert.equal(yes(delta,[...candidate,'lib/ci/production-base-impact.mjs']),false);
  for (const filename of [candidate[0],'components/my-coach-intro.jsx','lib/auth/permissions.mjs',
    'lib/app/generic.js','app/api/other/route.js','components/shared/toolbar.jsx',
    '.github/workflows/hh-pr-core-release.yml','package.json','unknown.txt']) {
    assert.equal(yes({...delta,files:[...rows,{filename,status:'modified'}]}),false,filename);
  }
  for(const invalid of [{commits:[]},{status:'diverged'},{files:[...rows,rows[0]]},
    {files:[{...rows[0],status:'renamed',previous_filename:'old.jsx'}]},
    {files:[{...rows[0],status:'removed'}]}]) assert.equal(yes({...delta,...invalid}),false);
  // The actual final Specialist verifier reuses exact-HEAD evidence, never a
  // changed HEAD or an explicit GitHub conflict.
  const exact={...pr,mergeable:true,base:{...pr.base,sha:target}};
  const files={base:new Map(),current:new Map(),changedRows:candidate.map(filename=>({filename,status:'M'}))};
  const api={pr:async()=>exact,target:async()=>target,compare:async()=>delta,runs:async()=>[],jobs:async()=>[]};
  assert.equal((await verify(api,ctx,files,{maxWaitMs:0})).head,head);
  await assert.rejects(()=>verify({...api,pr:async()=>({...exact,mergeable:false})},ctx,files,{maxWaitMs:0}),/MERGE_CONFLICT/);
  await assert.rejects(()=>verify({...api,pr:async()=>({...exact,head:{...exact.head,sha:target}})},ctx,files,{maxWaitMs:0}),/PR_HEAD_CHANGED/);
});


test('same regular protected blob is not a conflicting change; unknown or different evidence stays strict',async()=>{
  const target='d'.repeat(40),blob='e'.repeat(40),name='lib/site-videos/model.js';
  const row={filename:name,status:'modified',sha:blob};
  const delta={status:'ahead',ahead_by:1,behind_by:0,total_commits:1,
    base_commit:{sha:base},merge_base_commit:{sha:base},commits:[{sha:target}],files:[row]};
  const entry={type:'blob',mode:'100644',sha:blob};
  const rows=[{filename:name,status:'M'}];
  const normalize=(d=delta,c=rows,a=entry,b=entry)=>normalizeIdenticalProtectedOverlap(d,base,target,c,async()=>a,async()=>b);
  assert.deepEqual((await normalize()).identical,[name]);
  assert.deepEqual((await normalize()).compare.files,[]);
  const other={filename:'components/unrelated-page.jsx',status:'modified'};
  assert.deepEqual((await normalize({...delta,files:[row,other]})).compare.files,[other]);
  for(const result of [
    await normalize(delta,rows,{...entry,sha:'f'.repeat(40)}),
    await normalize(delta,rows,entry,{...entry,mode:'100755'}),
    await normalize(delta,rows,entry,null),
    await normalize({...delta,commits:[]}),
    await normalize({...delta,files:[row,row]}),
    await normalize({...delta,files:[{...row,status:'renamed',previous_filename:'old.js'}]}),
    await normalize({...delta,files:[{...row,filename:'package-lock.json'}]},[{filename:'package-lock.json',status:'M'}]),
    await normalize({...delta,files:[{...row,filename:'lib/ci/production-base-impact.mjs'}]},[{filename:'lib/ci/production-base-impact.mjs',status:'M'}]),
  ]) assert.deepEqual(result.identical,[]);
  const exact={...pr,mergeable:true,base:{...pr.base,sha:target}};
  const files={base:new Map(),current:new Map(),changedRows:[...rows,{filename:'app/api/app/my-coach/turn/route.js',status:'M'}]};
  const api={pr:async()=>exact,target:async()=>target,compare:async()=>delta,
    entry:async()=>entry,runs:async()=>[],jobs:async()=>[]};
  // An unchanged HEAD may keep its real specialist evidence, not fabricate new tests.
  assert.equal((await verify(api,ctx,files,{maxWaitMs:0,readTestedEntry:async()=>entry})).head,head);
  await assert.rejects(()=>verify({...api,entry:async()=>({...entry,mode:'100755'})},ctx,files,{maxWaitMs:0,readTestedEntry:async()=>entry}),/PRODUCTION_BASE_CHANGED/);
  await assert.rejects(()=>verify({...api,pr:async()=>({...exact,mergeable:false})},ctx,files,{maxWaitMs:0,readTestedEntry:async()=>entry}),/MERGE_CONFLICT/);
});


test('prior unified gate reuses every proved same-tree Specialist, not stale or red evidence',async()=>{
 const old='d'.repeat(40),oldMerge='e'.repeat(40),merge='f'.repeat(40),sourceTree='1'.repeat(40),mergeTree='2'.repeat(40);
 const gatePath='.github/workflows/hh-pr-core-release.yml', second='.github/workflows/other.yml';
 const context={...ctx,previousHead:old,merge};
 const source={base:new Map([[gatePath,'trusted'],[path,yaml],[second,yaml]]),
   current:new Map([[gatePath,'trusted'],[path,yaml],[second,yaml]])};
 const commits={
  [head]:{sha:head,tree:{sha:sourceTree}},[old]:{sha:old,tree:{sha:sourceTree}},
  [merge]:{sha:merge,tree:{sha:mergeTree},parents:[{sha:base},{sha:head}]},
  [oldMerge]:{sha:oldMerge,tree:{sha:mergeTree},parents:[{sha:base},{sha:old}]}
 };
 const oldRun={...run('completed','success'),id:321,head_sha:old,path:gatePath};
 const step=name=>({name,status:'completed',conclusion:'success'});
 const job=(id,name,steps)=>({id,name,run_id:321,status:'completed',conclusion:'success',steps:steps.map(step)});
 const jobs=[job(1,'core-lint-types-build',['Verify bounded shallow scope ancestry before PR routing']),
  job(2,'hh-merge-check',['Pin exact production base for shallow checkout','Validate exact-head risk and required specialist workflows','Confirm one-runner Core and independent specialist release evidence'])];
 const checkout='[command]/usr/bin/git log -1 --format=%H';
 const coreLog=[checkout,oldMerge,'HH_CORE_BUILD_IDENTITY_V1 27 321 1 '+oldMerge+' '+old+' '+base].join('\n');
 const gateLog=[checkout,oldMerge,'Specialist CI aggregate for PR #27 head='+old+' event_base='+base+' tested_base='+base,
  'Verified applicable workflows: 2','- '+path+' (2 executed jobs; run 11)','- '+second+' (1 executed jobs; run 12)'].join('\n');
 const specialists=[{...oldRun,id:11,path},{...oldRun,id:12,path:second}];
 const api={commit:async sha=>commits[sha],runs:async()=>specialists,runsForWorkflow:async()=>[oldRun],
  attemptJobs:async()=>jobs,jobLog:async id=>id===1?coreLog:gateLog};
 const check=(a=api,f=source)=>verifiedPriorSpecialistEvidence(a,context,pr,f,[path,second]);
 const proof=await check();assert.equal(proof.size,2);
 assert.equal(proof.get(path).run_id,11);
 assert.equal(proof.get(path).prior_run_attempt,1);
 for(const state of ['failure','cancelled','in_progress']){
  const changed={...specialists[0],id:13,status:state==='in_progress'?'in_progress':'completed',
   conclusion:state==='in_progress'?null:state};
  const partial=await check({...api,runs:async()=>[...specialists,changed]});
  assert.equal(partial.has(path),false,state);
  assert.equal(partial.has(second),true,state);
 }
 assert.equal((await check({...api,runs:async()=>[{...specialists[0],conclusion:'failure'},specialists[1]]})).has(path),false);
 assert.equal((await check({...api,runs:async()=>{throw Error('API unavailable')}})).size,0);
 assert.equal((await check({...api,commit:async sha=>sha===old?{...commits[sha],tree:{sha:'3'.repeat(40)}}:commits[sha]})).size,0);
 assert.equal((await check({...api,commit:async sha=>sha===oldMerge?{...commits[sha],tree:{sha:'3'.repeat(40)}}:commits[sha]})).size,0);
 assert.equal((await check({...api,runsForWorkflow:async()=>[{...oldRun,conclusion:'failure'}]})).size,0);
 assert.equal((await check({...api,attemptJobs:async()=>[jobs[0],{...jobs[1],conclusion:'failure'}]})).size,0);
 assert.equal((await check({...api,jobLog:async id=>id===1?coreLog:gateLog.replace('Verified applicable workflows: 2','Verified applicable workflows: 3')})).size,0);
 assert.equal((await check({...api,jobLog:async id=>id===1?coreLog:gateLog.replace(oldMerge,merge)})).size,0);
 assert.equal((await check(api,{...source,current:new Map([[gatePath,'candidate'],[path,yaml],[second,yaml]])})).size,0);
 const waiting={missing:[path],queued:[second+':queued'],pending:[second+':queued'],running:[],failed:[]};
 const result=reusePriorSpecialistState(waiting,proof);
 assert.deepEqual(result.missing,[]);assert.deepEqual(result.pending,[]);assert.equal(result.reused.length,2);
 const red=reusePriorSpecialistState({...waiting,missing:[],queued:[],pending:[second+':in_progress'],running:[second+':in_progress'],failed:[path+':failure']},proof);
 assert.deepEqual(red.failed,[path+':failure']);assert.equal(red.reused.length,0);assert.equal(red.pending.length,1);
});

test('universal moving-base proof treats feature-owned CI regressions as local, not global release policy',()=>{
  const target='d'.repeat(40);
  const candidate=['components/my-coach-live-dialogue.jsx','app/api/app/clarity-course/route.js',
    'tests/ci-coaching-rls-guard.test.mjs','.github/workflows/hh-personal-coaching-session.yml'];
  const rows=['components/shamanica-business-content.tsx','components/tarot-deck.jsx',
    'lib/ci/pr-loss-metrics.mjs'].map(filename=>({filename,status:'modified'}));
  const delta={status:'ahead',ahead_by:2,behind_by:0,total_commits:2,base_commit:{sha:base},
    merge_base_commit:{sha:base},commits:[{sha:'e'.repeat(40)},{sha:target}],files:rows};
  const accept=(d=delta,p=candidate)=>safeNonOverlappingProductAdvance(d,base,target,p);
  assert.equal(accept(),true);
  // A different, newly named feature is also accepted without a PR ID or exact patch.
  assert.equal(accept({...delta,files:[{filename:'components/ornithology-detail.jsx',status:'modified'}]}),true);
  for(const path of ['tests/ci-global-regression.test.mjs','tests/ci-coaching-release-policy.test.mjs',
    'tests/ci-shamanica-rls-guard.test.mjs','scripts/ci-coaching-rls-guard.mjs','lib/ci/production-base-impact.mjs',
    '.github/workflows/hh-pr-core-release.yml']) assert.equal(accept(delta,[...candidate,path]),false,path);
  for(const path of [candidate[0],'components/my-coach-summary.jsx','app/[locale]/layout.tsx',
    'lib/auth/permissions.mjs','package.json','supabase/migrations/private.sql',
    '.github/workflows/hh-pr-core-release.yml','lib/ci/production-base-impact.mjs']) {
    assert.equal(accept({...delta,files:[...rows,{filename:path,status:'modified'}]}),false,path);
  }
  assert.equal(accept({...delta,commits:[]}),false);
  assert.equal(accept({...delta,files:[...rows,rows[0]]}),false);
  assert.equal(accept({...delta,files:[{...rows[0],status:'renamed',previous_filename:'old.jsx'}]}),false);
});

test('final base race retries freshness only, never real source failure or stable rejected delta',async()=>{
 const one='d'.repeat(40),two='e'.repeat(40);
 const live={...pr,mergeable:true};
 const bad=()=>Error('PR_HEAD_BASE_OR_RELEASE_STATE_CHANGED:PRODUCTION_BASE_CHANGED');
 let calls=[], reads=[one,two,two,two],refresh=0;
 const api={target:async()=>reads.shift(),pr:async()=>{refresh++;return live;}};
 assert.equal(await verifyStableProtectedBase(api,ctx,async(p,retry,target)=>{
   calls.push(target);if(target===one)throw bad();
 },live,async()=>{}),two);
 assert.deepEqual(calls,[one,two]);assert.equal(refresh,1);
 reads=[one,one];calls=[];
 await assert.rejects(()=>verifyStableProtectedBase(api,ctx,async(p,r,target)=>{calls.push(target);throw bad();},live,async()=>{}),/PRODUCTION_BASE_CHANGED/);
 assert.deepEqual(calls,[one]);
 reads=[one,two];calls=[];
 await assert.rejects(()=>verifyStableProtectedBase(api,ctx,async()=>{throw Error('SPECIALIST_FAILED');},live,async()=>{}),/SPECIALIST_FAILED/);
 assert.deepEqual(reads,[two]);
 reads=[one,two];await assert.rejects(()=>verifyStableProtectedBase({...api,pr:async()=>({...live,head:{...live.head,sha:two}})},ctx,async()=>{},live,async()=>{}),/PR_HEAD_CHANGED/);
 reads=[one,two,one,two,one,two,one,two];let attempts=0;
 await assert.rejects(()=>verifyStableProtectedBase(api,ctx,async()=>{attempts++;},live,async()=>{}),/PRODUCTION_BASE_CHANGED/);
 assert.equal(attempts,4);
 let comparisons=0;
 const preview={target:async()=>two,compare:async()=>{comparisons++;return {status:'ahead',ahead_by:2,files:[{filename:'lib/coaching/x.mjs'}]};}};
 assert.equal(await observeProtectedBaseDrift(preview,ctx,['lib/coaching/x.mjs'],base),two);
 assert.equal(await observeProtectedBaseDrift(preview,ctx,['lib/coaching/x.mjs'],two),two);
 assert.equal(comparisons,1);
 assert.equal(await observeProtectedBaseDrift({...preview,compare:async()=>{throw Error('unavailable');}},ctx,[],base),base);
});

test('root-only optional product workflows are advisory only for verified isolated server dependency additions',async()=>{
 const names=['hh-static-image-cost-guard','opora-module-ci','hh-owner-telegram-video','hh-live-audio-ci','holistic-house-native'].map(n=>'.github/workflows/'+n+'.yml');
 const security='.github/workflows/hh-billing-isolated.yml';
 const basePackage={name:'hh',dependencies:{react:'19.0.0'},scripts:{'test:app':'node --conditions=react-server --test tests/coach-old.test.mjs'}};
 const currentPackage=JSON.parse(JSON.stringify(basePackage));currentPackage.dependencies.ws='8.23.0';
 const baseLock={lockfileVersion:3,packages:{'':{dependencies:basePackage.dependencies},'node_modules/react':{version:'19.0.0',integrity:'sha512-old'}}};
 const currentLock=JSON.parse(JSON.stringify(baseLock));currentLock.packages[''].dependencies=currentPackage.dependencies;
 currentLock.packages['node_modules/ws']={version:'8.23.0',integrity:'sha512-new',resolved:'https://registry.npmjs.org/ws/-/ws-8.23.0.tgz'};
 const ownerYaml=n=>"on:\n  pull_request:\n    paths:\n      - 'package-lock.json'\n      - 'lib/"+n+"/**'\njobs:\n  test:\n    runs-on: ubuntu-latest\n";
 const source=new Map([...names,security].map((n,i)=>[n,ownerYaml(i===1?'opora':'owner-'+i)]));
 const paths=['package.json','package-lock.json','lib/coaching/clarity-course.mjs'];
 const files={base:source,current:new Map(source),changedRows:paths.map(filename=>({filename,status:'M'})),
   basePackage:JSON.stringify(basePackage),currentPackage:JSON.stringify(currentPackage),baseLock:JSON.stringify(baseLock),currentLock:JSON.stringify(currentLock)};
 const expect=[...names,security];
 const proof=(f=files,p=paths)=>[...independentPackageOnlyAdvisories(f,p,expect)];
 assert.deepEqual(proof(),names);
 assert.deepEqual(proof(files,[...paths,'lib/opora/course.mjs']),names.filter(n=>n!==names[1]));
 assert.deepEqual(proof(files,[...paths,'next.config.ts']),[]);
 assert.deepEqual(proof(files,[...paths,'scripts/ci-freshness.mjs']),[]);
 assert.deepEqual(proof({...files,current:new Map([...source,[names[0],source.get(names[0])+'# changed']])}),names.slice(1));
 assert.deepEqual(proof({...files,baseLock:null}),[]);
 const altered=JSON.parse(files.currentLock);altered.packages['node_modules/react'].version='20.0.0';
 assert.deepEqual(proof({...files,currentLock:JSON.stringify(altered)}),[]);
 const installer=JSON.parse(files.currentLock);installer.packages['node_modules/ws'].hasInstallScript=true;
 assert.deepEqual(proof({...files,currentLock:JSON.stringify(installer)}),[]);
 const peerOld=JSON.parse(files.baseLock),peerNew=JSON.parse(files.currentLock);
 peerOld.packages['node_modules/react'].peerDependencies={ws:'*'};peerNew.packages['node_modules/react'].peerDependencies={ws:'*'};
 assert.deepEqual(proof({...files,baseLock:JSON.stringify(peerOld),currentLock:JSON.stringify(peerNew)}),[]);
 const candidateRun=(filename,id,conclusion)=>({...run('completed',conclusion),path:filename,id});
 const api={pr:async()=>({...pr,mergeable:true}),target:async()=>base,
   runs:async()=>[...names.map((n,i)=>candidateRun(n,10+i,'failure')),candidateRun(security,30,'success')],
   jobs:async()=>[{name:'test',status:'completed',conclusion:'success'}]};
 const good=await verify(api,ctx,files,{maxWaitMs:0});
 assert.deepEqual(good.expected,[security]);assert.equal(good.executed.length,1);
 assert.deepEqual(good.advisory.packageOnly,[...names].sort());
 await assert.rejects(()=>verify({...api,runs:async()=>[candidateRun(security,30,'failure')]},ctx,files,{maxWaitMs:0}),/SPECIALIST_FAILED/);
});

test('route-local coach source proof retains all shared statements and new import usage boundaries',()=>{
 const ts=createRequire(new URL('../lib/ci/fast-ui-parser/package.json',import.meta.url))('typescript');
 const original=[
  "import {sharedAuth} from '@/lib/app/session.js'",
  "async function handle(joined) {",
  "  await sharedAuth()",
  "  if (joined === 'my-coach/stream') { return 'old'; }",
  "  if (joined === 'my-coach/live-token') { return 'old'; }",
  "  if (joined === 'services/cart') { return 'cart'; }",
  "}", ""
 ].join('\n');
 const proposed="import {clarityCourseDay} from '@/lib/coaching/clarity-course.mjs'\n"+
   original.replace("return 'old';","return clarityCourseDay('day');").replace("return 'old';","return 'token';");
 const proof=(value=proposed)=>verifiedCoachDispatcherIsolation(original,value,ts);
 assert.equal(proof(),true);
 for(const bad of [
  proposed.replace('await sharedAuth()','await sharedAuth(false)'),
  proposed.replace("return 'cart';","return clarityCourseDay('day');"),
  proposed.replace("joined === 'my-coach/stream'","joined === 'services/stream'"),
  proposed.replace("return 'cart';","return 'new-cart';"),
  proposed.replace("@/lib/coaching/clarity-course.mjs","@/lib/app/session.js"),
  proposed.replace('await sharedAuth()','await sharedAuth(); clarityCourseDay()'),
  proposed.replace("return clarityCourseDay('day');","return 'unused';"),
  proposed.replace("if (joined === 'services/cart')","if (joined === 'my-coach/extra') {return 1;} if (joined === 'services/cart')"),
  proposed+"function broken( {"
 ])assert.equal(proof(bad),false,bad);
 const shared='app/api/app/[...path]/route.js',other='.github/workflows/practice-visual-services.yml';
 const mandatory=['hh-personal-coaching-session','hh-app-r1','ia-v2'].map(n=>'.github/workflows/'+n+'.yml');
 const yaml="on:\n  pull_request:\n    paths:\n      - 'app/api/app/*/route.js'\n      - 'components/practice-*'\n";
 const files={base:new Map([[other,yaml]]),current:new Map([[other,yaml]]),testedMergeSha:'d'.repeat(40)};
 const rows=[{filename:shared,status:'M'},{filename:'app/api/app/clarity-course/route.js',status:'A'}];
 const verifyScope=(r=rows,owners=[other,...mandatory],f=files)=>[...independentDispatcherAdvisories(f,r,owners,
   side=>side==='base'?original:proposed,ts)];
 assert.deepEqual(verifyScope(),[other]);
 assert.deepEqual(verifyScope([...rows,{filename:'components/practice-editor.jsx',status:'M'}]),[]);
 assert.deepEqual(verifyScope([...rows,{filename:'lib/app/session.js',status:'M'}]),[]);
 assert.deepEqual(verifyScope(rows,[other,...mandatory.slice(1)]),[]);
 assert.deepEqual(verifyScope(rows,[other,...mandatory],{...files,testedMergeSha:null}),[]);
 assert.deepEqual(verifyScope(rows,[other,...mandatory],{...files,current:new Map([[other,yaml+'# changed']])}),[]);
});
test('known untouched nonapplicable workflow with orphan run is advisory; unknown and required runs remain blockers',async()=>{
 const other='.github/workflows/non-applicable.yml';
 const extraYaml="on:\n  pull_request:\n    paths:\n      - 'lib/elsewhere/**'\n";
 const files={base:new Map([[path,yaml],[other,extraYaml]]),current:new Map([[path,yaml],[other,extraYaml]]),
   changedRows:[{filename:'lib/crm/a.js',status:'M'}]};
 const make=(filename,id,conclusion,pull_requests)=>({...run('completed',conclusion),path:filename,id,pull_requests});
 const normal=run('completed','success'),orphan=make(other,82,'failure',[]);
 const api={pr:async()=>({...pr,mergeable:true}),target:async()=>base,runs:async()=>[normal,orphan],
   jobs:async()=>[{name:'test',status:'completed',conclusion:'success'}]};
 assert.deepEqual([...provenNonApplicableWorkflows(files,['lib/crm/a.js'],[path])],[other]);
 const good=await verify(api,ctx,files,{maxWaitMs:0});
 assert.deepEqual(good.expected,[path]);assert.ok(good.advisory.nonApplicable.includes(other+':failure'));
 await assert.rejects(()=>verify({...api,runs:async()=>[normal,make('.github/workflows/unknown.yml',83,'failure',[])]},ctx,files,{maxWaitMs:0}),/SPECIALIST_FAILED/);
 await assert.rejects(()=>verify({...api,runs:async()=>[normal,make(path,84,'failure',[])]},ctx,files,{maxWaitMs:0}),/SPECIALIST_FAILED/);
});
