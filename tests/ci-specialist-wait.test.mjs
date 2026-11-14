import test from 'node:test';
import assert from 'node:assert/strict';
import { verify, requiresCurrentProductionBase, classifyPrState, diagnoseAggregateError } from '../scripts/ci-specialist-aggregate.mjs';
import { inspectJobs, trustedRequiredJobs, inspectWorkflowRuns } from '../lib/ci/specialist-aggregate.mjs';

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
    assert.ok(ms > 0 && ms <= 30_000, 'bounded polling');
    elapsed += ms;
  };
  const result = await verify(api, ctx, sources, { now: () => elapsed, sleep });
  assert.ok(elapsed >= 4*60_000, 'must not accept before a real completed check');
  assert.ok(elapsed < 6*60_000, 'registered queued check eventually finishes within the bounded grace');
  assert.ok(polls > 5);
  assert.equal(jobsRead, 1);
  assert.equal(result.executed.length, 1);
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
      assert.ok(ms > 0 && ms <= 30_000);
      elapsed += ms;
    },
  });
  assert.ok(elapsed >= 20 * 60_000, 'queue alone is never passing CI');
  assert.ok(elapsed < 35 * 60_000, 'completion stays within global budget');
  assert.ok(polls > 30);
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
    sleep: async ms => { assert.ok(ms > 0 && ms <= 30_000); elapsed += ms; },
  }), /SPECIALIST_MISSING_OR_PENDING:NOT_STARTED/);
  assert.equal(elapsed, 10 * 60_000, 'default queue budget is shorter than running timeout');
  assert.ok(reads > 10, 'checks are polled, never silently waived');
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
    assert.ok(ms > 0 && ms <= 30_000, 'bounded polling');
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
  ]) assert.equal(requiresCurrentProductionBase(files), false, files.join(','));
  for (const files of [
    [], ['scripts/ci-specialist-aggregate.mjs'], ['.github/workflows/hh-pr-core-release.yml'],
    ['scripts/verify-affirmation-voice-browser.mjs'],
    ['package-lock.json'], ['app/api/payment/route.ts'], ['components/app/private-profile.jsx'],
    ['scripts/verify-payment-browser.mjs'], ['scripts/new-auth-guard.mjs'],
    ['scripts/benchmarking/first-video-live-export.mjs'],
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

test('sensitive pending Specialist stops within one 90s probe after a real production-base change', async () => {
  let elapsed=0, prReads=0, targetReads=0, workflowReads=0;
  const currentBase='c'.repeat(40);
  const files={...sources, changedRows:[{filename:'lib/crm/a.js',status:'M'}]};
  const api={
    pr:async()=>{prReads++;return pr;},
    target:async()=>{targetReads++;return elapsed>=60_000?currentBase:base;},
    runs:async()=>{workflowReads++;return [run('in_progress',null)];},
    jobs:async()=>{throw Error('pending workflow must never count as green');},
  };
  await assert.rejects(()=>verify(api,ctx,files,{
    now:()=>elapsed, sleep:async ms=>{assert.ok(ms>0&&ms<=30_000);elapsed+=ms;},
    maxWaitMs:35*60_000,pollMs:30_000,
  }),/PR_HEAD_BASE_OR_RELEASE_STATE_CHANGED:PRODUCTION_BASE_CHANGED/);
  assert.ok(elapsed>=90_000&&elapsed<=120_000,'stop long before a 35-minute Specialist timeout');
  assert.ok(prReads>=2&&targetReads>=2,'verify live PR identity and protected target again');
  assert.ok(workflowReads<=4,'do not poll stale workflows until the long deadline');
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


test('real sensitive Specialist accepts only mergeable, proved unrelated public raster target advances', async () => {
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
    jobs:async()=>[{name:'mobile',status:'completed',conclusion:'success'}],
  };
  const pinned={...sources,changedRows:[{filename:'lib/crm/a.js',status:'modified'}]};
  const accepted=await verify(api,ctx,pinned,{maxWaitMs:0});
  assert.equal(accepted.head,head);
  current={...current,mergeable:false,mergeable_state:'dirty'};
  await assert.rejects(()=>verify(api,ctx,pinned,{maxWaitMs:0}),/MERGE_CONFLICT/);
  current={...current,mergeable:null,mergeable_state:'unknown'};
  await assert.rejects(()=>verify(api,ctx,pinned,{maxWaitMs:0}),/PRODUCTION_BASE_CHANGED/);
  current={...current,mergeable:true,mergeable_state:'behind'};
  compare=completeCompare('app/api/payment/route.ts');
  await assert.rejects(()=>verify(api,ctx,pinned,{maxWaitMs:0}),/PRODUCTION_BASE_CHANGED/);
});
