import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { context, eligible, prune, observeCI, summarizeJobs, client, TARGET } from '../scripts/ci-prune-stale-runs.mjs';

const repo = 'andylitvinov-design/books';
const ctx = { repo, target: TARGET, number: 5 };
const OLD = 'a'.repeat(40), NEW = 'b'.repeat(40), MERGE = 'c'.repeat(40), BASE = 'd'.repeat(40);
const pr = (x = {}) => ({ number: 5, state: 'open', base: { ref: TARGET, sha: BASE }, head: { ref: 'feat/one', sha: NEW, repo: { full_name: repo } }, ...x });
const run = (x = {}) => ({ id: 100, path: '.github/workflows/hh-pr-core-release.yml', event: 'pull_request', status: 'queued', head_sha: OLD, head_branch: 'feat/one', head_repository: { full_name: repo }, pull_requests: [{ number: 5, base: { ref: TARGET }, head: { ref: 'feat/one', sha: OLD } }], ...x });

test('force-cancel only after a normal cancellation remains queued and stale evidence is rechecked', async () => {
  const actions = [];
  let finished = false;
  const api = {
    list: async () => ({workflow_runs: [run()]}), pr: async () => pr(),
    run: async () => finished ? run({status:'completed', conclusion:'cancelled'}) : run(),
    compare: async () => ({status:'ahead', ahead_by:1}),
    workflowBlob: async () => ({type:'file',sha:BASE}),
    jobs: async () => ({total_count:1,jobs:[{name:'release-ready',status:'queued'}]}),
    cancel: async id => actions.push(['cancel', id]),
    forceCancel: async id => { actions.push(['force', id]); finished = true; },
  };
  const result = await prune(api,ctx,{sleep:async()=>{}, settleMs:0});
  assert.deepEqual(actions,[['cancel',100],['force',100]]);
  assert.deepEqual(result.forced,[100]);
  assert.deepEqual(result.confirmed,[100]);
});

test('normal cancellation completing during the wait does not force-cancel', async () => {
  let cancelled = false, forced = 0;
  const api = { list: async () => ({workflow_runs:[run()]}), pr: async () => pr(),
    run: async () => cancelled ? run({status:'completed', conclusion:'cancelled'}) : run(),
    compare: async () => ({status:'ahead',ahead_by:1}), workflowBlob: async () => ({type:'file',sha:BASE}), jobs: async () => ({total_count:1,jobs:[{name:'release-ready',status:'queued'}]}),
    cancel: async () => {cancelled = true;}, forceCancel: async () => {forced++;} };
  const result = await prune(api,ctx,{sleep:async()=>{},settleMs:0});
  assert.equal(forced,0);
  assert.deepEqual(result.confirmed,[100]);
});

test('other workflows do not incur the Core force-cancel wait', async () => {
  let slept = 0;
  const other = run({path:'.github/workflows/other.yml'});
  const api = {list: async () => ({workflow_runs:[other]}), pr: async () => pr(),
    run: async () => other, compare: async () => ({status:'ahead',ahead_by:1}),
    cancel: async () => {}, forceCancel: async () => {throw Error('must not force other workflows');}};
  const result = await prune(api,ctx,{sleep:async()=>{slept++;},settleMs:0});
  assert.equal(slept,0);
  assert.deepEqual(result.forced,[]);
});

test('dry-run never sleeps or invokes either cancellation endpoint', async () => {
  const api = {list: async () => ({workflow_runs:[run()]}), pr: async () => pr(),
    run: async () => run(), compare: async () => ({status:'ahead',ahead_by:1}),
    cancel: async () => {throw Error('unexpected cancel');},
    forceCancel: async () => {throw Error('unexpected force');}};
  const result = await prune(api,ctx,{dryRun:true,sleep:async()=>{throw Error('unexpected sleep');}});
  assert.deepEqual(result.dryRun,[100]);
  assert.deepEqual(result.cancelled,[]);
  assert.deepEqual(result.forced,[]);
});

test('a competing cancellation completing before force does not produce a false error', async () => {
  let finished = false;
  const api = { list: async () => ({workflow_runs:[run()]}), pr: async () => pr(),
    run: async () => finished ? run({status:'completed', conclusion:'cancelled'}) : run(),
    compare: async () => ({status:'ahead',ahead_by:1}), workflowBlob: async () => ({type:'file',sha:BASE}), jobs: async () => ({total_count:1,jobs:[{name:'release-ready',status:'queued'}]}),
    cancel: async () => {}, forceCancel: async () => {finished=true; throw Error('HTTP 409');} };
  const result = await prune(api,ctx,{sleep:async()=>{},settleMs:0});
  assert.deepEqual(result.errors,[]);
  assert.deepEqual(result.confirmed,[100]);
});

test('never force a started, current or unverifiable run after cancellation', async () => {
  for (const mode of ['started','current','compare-error','running-job','incomplete-jobs','unknown-job','other-workflow','changed-workflow','missing-base','base-moved','blob-error']) {
    let afterCancel = false, forced = 0, afterReads = 0;
    const api = {
      list: async () => ({workflow_runs: [run(mode === 'other-workflow' ? {path:'.github/workflows/other.yml'} : {})]}),
      pr: async () => afterCancel && mode === 'current' ? pr({head:{...pr().head,sha:OLD}}) :
        afterCancel && mode === 'missing-base' ? pr({base:{ref:TARGET}}) :
        afterCancel && mode === 'base-moved' && ++afterReads > 1 ? pr({base:{ref:TARGET,sha:MERGE}}) : pr(),
      run: async () => afterCancel && mode === 'started' ? run({status:'in_progress'}) : run(mode === 'other-workflow' ? {path:'.github/workflows/other.yml'} : {}),
      compare: async () => { if (afterCancel && mode === 'compare-error') throw Error('unavailable'); return {status:'ahead',ahead_by:1}; },
      workflowBlob: async ref => { if (mode === 'blob-error') throw Error('unavailable'); return {type:'file',sha:mode === 'changed-workflow' && ref === OLD ? NEW : BASE}; },
      jobs: async () => mode === 'running-job' ? ({total_count:1,jobs:[{name:'release-ready',status:'in_progress'}]}) :
        mode === 'incomplete-jobs' ? ({total_count:2,jobs:[{name:'release-ready',status:'queued'}]}) :
        ({total_count:1,jobs:[{name:mode === 'unknown-job' ? 'unknown-cleanup' : 'release-ready',status:'queued'}]}),
      cancel: async () => {afterCancel = true;},
      forceCancel: async () => {forced++;},
    };
    const result = await prune(api,ctx,{sleep:async()=>{},settleMs:0});
    assert.equal(forced,0,mode);
    assert.deepEqual(result.forced,[],mode);
  }
});

test('a live-updated PR association is pruned only with proven old run ancestry', async () => {
  const linkedCurrent = [{ number: 5, base: { ref: TARGET }, head: { ref: 'feat/one', sha: NEW } }];
  const stale = run({ head_sha: OLD, pull_requests: linkedCurrent });
  const cancelled = [];
  const api = { list: async () => ({ workflow_runs: [stale] }), pr: async () => pr(),
    run: async () => stale, compare: async () => ({ status: 'ahead', ahead_by: 1 }),
    cancel: async id => cancelled.push(id) };
  assert.deepEqual((await prune(api, ctx)).cancelled, [100]);
  assert.deepEqual(cancelled, [100]);
  cancelled.length = 0;
  api.compare = async () => ({ status: 'diverged', ahead_by: 2 });
  assert.deepEqual((await prune(api, ctx)).cancelled, []);
  assert.deepEqual(cancelled, []);
  api.compare = async () => { throw Error('compare unavailable'); };
  const unknown = await prune(api, ctx);
  assert.deepEqual(unknown.cancelled, []);
  assert.equal(unknown.partial, true);
  api.run = async () => ({ ...stale, head_sha: NEW });
  api.compare = async () => ({ status: 'ahead', ahead_by: 1 });
  assert.deepEqual((await prune(api, ctx)).cancelled, []);
  api.run = async () => stale;
  let reads = 0;
  api.pr = async () => (++reads > 2 ? pr({ head: { ...pr().head, sha: MERGE } }) : pr());
  assert.deepEqual((await prune(api, ctx)).cancelled, []);
  assert.deepEqual(cancelled, []);
});

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
    { head_sha: NEW }, { event: 'push' }, { event: 'workflow_dispatch' }, { event: 'merge_group' },
    { status: 'in_progress' }, { status: 'waiting' }, { head_repository: { full_name: 'fork/repo' } },
    { pull_requests: [] }, { head_branch: 'other' },
  ]) assert.equal(eligible(run(data), pr(), ctx), false, JSON.stringify(data));
  assert.equal(eligible(run(), pr({ base: { ref: 'main' } }), ctx), false);
  assert.equal(eligible(run(), pr({ state: 'closed' }), ctx), false);
  assert.equal(eligible(run({ head_sha: 'new' }), pr({ state: 'closed' }), ctx), false);
});

test('re-read exact live run and PR before cancellation; cap and dry-run', async () => {
  const cancelled = [];
  const api = { pr: async () => pr(), run: async () => run(), compare: async () => ({ status: 'ahead', ahead_by: 1 }), cancel: async id => cancelled.push(id),
    list: async () => ({ workflow_runs: [run(), run({ id: 101, head_sha: NEW, pull_requests: [{ number: 5, base: { ref: TARGET }, head: { ref: 'feat/one', sha: NEW } }] }), run({ id: 102 })] }) };
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
  await api.list(1, 'feat/one'); await api.pr(5); await api.run(100); await api.cancel(100); await api.compare(OLD, NEW); await api.forceCancel(100); await api.workflowBlob(OLD);
  assert.match(calls[0][0], /status=queued/); assert.match(calls[0][0], /branch=feat%2Fone/);
  assert.match(calls[3][0], /\/actions\/runs\/100\/cancel/); assert.equal(calls[3][1], 'POST');
  assert.ok(calls[4][0].endsWith('/compare/' + OLD + '...' + NEW)); assert.equal(calls[4][1], 'GET');
  assert.match(calls[5][0], /\/actions\/runs\/100\/force-cancel/); assert.equal(calls[5][1], 'POST');
  assert.ok(calls[6][0].includes('/contents/.github/workflows/hh-pr-core-release.yml?ref=' + OLD)); assert.equal(calls[6][1], 'GET');
});

test('trusted PR-target janitor is separate from strict two-job read-only PR specialist',()=>{
  const original=readFileSync('.github/workflows/hh-ci-stale-run-prune.yml','utf8');
  const target=readFileSync('.github/workflows/hh-native-auto-merge.yml','utf8');
  assert.ok(original.includes('  pull_request:'));
  assert.ok(original.includes("if: github.event_name == 'pull_request'"));
  assert.ok(original.includes("github.event_name == 'push'"));
  assert.ok(!original.includes('  pull_request_target:'));
  assert.ok(!original.includes('  prune-head:'));
  assert.ok(target.includes('  pull_request_target:'));
  assert.ok(target.includes('types: [opened, reopened, ready_for_review, synchronize]'));
  assert.ok(target.includes("github.event.action != 'synchronize'"), 'auto-merge must not arm before green Core');
  assert.ok(target.includes('  prune-head:'));
  assert.ok(target.includes('      actions: write'));
  assert.ok(target.includes('actions: write'));
  assert.ok(target.includes('pull-requests: read'));
  assert.ok(target.includes('ref: codex/public-book-library'));
  assert.ok(target.includes('persist-credentials: false'));
  assert.ok(!target.includes("ref: ${{ github.event.pull_request.head.sha"));
  assert.ok(!target.includes('  pull_request:'));
});
test('PR-target cancellation is isolated from two-job PR specialist and production push',()=>{
  const source=readFileSync('.github/workflows/hh-ci-stale-run-prune.yml','utf8');
  const target=readFileSync('.github/workflows/hh-native-auto-merge.yml','utf8');
  assert.ok(source.includes("group: hh-ci-prune-${{ github.event_name == 'push' && 'production' || format('{0}-pr-{1}', github.event_name, github.event.pull_request.number) }}"));
  assert.ok(source.includes("cancel-in-progress: false"));
  assert.ok(source.includes("github.event_name == 'push' && 'production'"));
  assert.match(source,/HH_CI_PRUNE_LIMIT: '300'/);
  assert.ok(target.includes("group: hh-ci-prune-head-${{ github.event.pull_request.number || github.run_id }}"));
  assert.ok(target.includes("cancel-in-progress: true"));
  assert.ok(target.includes("HH_CI_PRUNE_LIMIT: '60'"));
});
test('different run SHA is only an ancestry candidate; missing linked SHA fails closed', () => {
  assert.equal(eligible(run({ head_sha: NEW }), pr(), ctx), false);
  const linked = sha => ({ number: 5, base: { ref: TARGET }, head: { ref: 'feat/one', sha } });
  assert.equal(eligible(run({ pull_requests: [linked(NEW)] }), pr(), ctx), true);
  assert.equal(eligible(run({ pull_requests: [linked(undefined)] }), pr(), ctx), false);
  assert.equal(eligible(run({ pull_requests: [linked('bad')] }), pr(), ctx), false);
});

test('batch cancels >20 stale queued runs while respecting configured limit and readback', async () => {
  const cancelled = [];
  const runs = Array.from({ length: 65 }, (_, i) => run({ id: 1000 + i }));
  const api = { list: async () => ({ workflow_runs: runs }), pr: async () => pr(),
    run: async id => runs.find(item => item.id === id), compare: async () => ({ status: 'ahead', ahead_by: 1 }), cancel: async id => cancelled.push(id) };
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

test('optional conflict grouping cannot falsely fail a successful protected CI prune',()=>{
 const yaml=readFileSync('.github/workflows/hh-ci-stale-run-prune.yml','utf8');
 const marker='- name: Group unresolved PR merge-conflict candidates (read-only)';
 const idx=yaml.indexOf(marker);
 assert.ok(idx>0);
 const prune=yaml.slice(0,idx);
 const diag=yaml.slice(idx);
 assert.match(prune,/node scripts\/ci-prune-stale-runs\.mjs/);
 assert.doesNotMatch(prune,/continue-on-error: true/);
 assert.match(diag,/id: conflict_diagnostic/);
 assert.match(diag,/continue-on-error: true/);
 assert.match(diag,/timeout-minutes: 2/);
 assert.match(diag,/steps\.conflict_diagnostic\.outcome == 'failure'/);
 assert.match(diag,/Conflict grouping: PARTIAL/);
 assert.ok(!yaml.includes('  pull_request_target:'));
 assert.ok(readFileSync('.github/workflows/hh-native-auto-merge.yml','utf8').includes('  pull_request_target:'));
});

test('a trusted PR synchronize must match exact previous and new same-repo HEADs', () => {
  const env = { GITHUB_TOKEN: 'fake', GITHUB_REPOSITORY: repo,
    GITHUB_EVENT_NAME: 'pull_request_target', GITHUB_REF: 'refs/heads/' + TARGET };
  const e = { action: 'synchronize', before: OLD, after: NEW,
    repository: { full_name: repo }, pull_request: { number: 5, base: { ref: TARGET },
      head: { sha: NEW, repo: { full_name: repo } } } };
  assert.deepEqual(context(env, e), { repo, target: TARGET, number: 5, headSha: NEW });
  // pull_request_target uses the repository default ref, even though the PR
  // targets the separate production branch. This must remain accepted.
  assert.deepEqual(context({ ...env, GITHUB_REF: 'refs/heads/codex/bootstrap-books' }, e),
    { repo, target: TARGET, number: 5, headSha: NEW });
  assert.throws(() => context({ ...env, GITHUB_REF: 'refs/heads/unrelated' }, e));
  for (const bad of [
    { ...e, action: 'opened' }, { ...e, before: NEW },
    { ...e, after: OLD }, { ...e, after: 'bad' },
    { ...e, pull_request: { ...e.pull_request, head: { sha: OLD, repo: { full_name: repo } } } },
    { ...e, pull_request: { ...e.pull_request, head: { sha: NEW, repo: { full_name: 'fork/repo' } } } },
    { ...e, pull_request: { ...e.pull_request, base: { ref: 'main' } } },
  ]) assert.throws(() => context(env, bad));
  assert.throws(() => context({ ...env, GITHUB_REF: 'refs/heads/main' }, e));
});

test('stale running non-browser checks remain untouched, while only known browser workflow paths qualify', async () => {
  const live = { ...ctx, headSha: NEW };
  for (const path of [
    '.github/workflows/hh-pr-core-release.yml',
    '.github/workflows/hh-pr-repair-worker.yml',
    '.github/workflows/unrecognized-browser.yml',
    '.github/workflows/site-video-browser.yml@malformed',
  ]) assert.equal(eligible(run({status:'in_progress', path}), pr(), live), false, path);
  const browser = run({status:'in_progress', path:'.github/workflows/site-video-browser.yml@refs/pull/5/merge'});
  assert.equal(eligible(browser, pr(), live), true);
  assert.equal(eligible(browser, pr(), ctx), false);
  const cancelled = [];
  const api = {
    list: async (page, branch, status) => ({workflow_runs: status === 'in_progress' ?
      [run({id:401,status:'in_progress'}), run({id:402,status:'in_progress',path:'.github/workflows/hh-pr-repair-worker.yml'})] : []}),
    pr:async()=>pr(), run:async id=>run({id,status:'in_progress'}),
    compare:async()=>({status:'ahead',ahead_by:1}),
    cancel:async id=>cancelled.push(id),
  };
  assert.deepEqual((await prune(api,live,{sleep:async()=>{},settleMs:0})).cancelled, []);
  assert.deepEqual(cancelled, []);
});

test('only a verified PR synchronize cancels an already-running ancestor HEAD, never forces it', async () => {
  const ctx = { repo, target: TARGET, number: 5, headSha: NEW };
  const active = run({ id: 301, status: 'in_progress', path: '.github/workflows/site-video-browser.yml@refs/pull/5/merge' });
  const accepted = [];
  let completed = false;
  const api = {
    list: async (page, branch, status) => {
      assert.equal(branch, 'feat/one');
      return { workflow_runs: status === 'in_progress' ? [active] : [] };
    },
    pr: async () => pr(),
    run: async () => completed ? { ...active, status: 'completed', conclusion: 'cancelled' } : active,
    compare: async () => ({ status: 'ahead', ahead_by: 1 }),
    cancel: async id => { accepted.push(id); completed = true; },
    forceCancel: async () => { throw Error('Never force started runs'); },
  };
  assert.equal(eligible(active, pr(), ctx), true);
  assert.equal(eligible(active, pr(), { repo, target: TARGET, number: 5 }), false);
  const result = await prune(api, ctx, { sleep: async () => {}, settleMs: 0 });
  assert.deepEqual(accepted, [301]);
  assert.deepEqual(result.cancelled, [301]);
  assert.deepEqual(result.confirmed, [301]);
  assert.deepEqual(result.forced, []);
});

test('a moved head or non-ancestor history blocks cancellation even during synchronize', async () => {
  const ctx = { repo, target: TARGET, number: 5, headSha: NEW };
  const active = run({ id: 302, status: 'in_progress', path: '.github/workflows/site-video-browser.yml' });
  let cancelled = 0;
  const api = {
    list: async (page, branch, status) => ({ workflow_runs: status === 'in_progress' ? [active] : [] }),
    pr: async () => pr({ head: { ...pr().head, sha: MERGE } }),
    run: async () => active,
    compare: async () => ({ status: 'ahead', ahead_by: 1 }),
    cancel: async () => { cancelled++; },
  };
  assert.deepEqual((await prune(api, ctx)).cancelled, []);
  api.pr = async () => pr();
  api.compare = async () => ({ status: 'diverged', ahead_by: 1 });
  assert.deepEqual((await prune(api, ctx)).cancelled, []);
  api.compare = async () => { throw Error('Compare unavailable'); };
  assert.deepEqual((await prune(api, ctx)).cancelled, []);
  assert.equal(cancelled, 0);
});

test('trusted cleanup cannot load PR HEAD and strict CI-only change still runs Core contracts',()=>{
  const source=readFileSync('.github/workflows/hh-native-auto-merge.yml','utf8');
  const core=readFileSync('.github/workflows/hh-pr-core-release.yml','utf8');
  assert.ok(source.includes('pull_request_target:'));
  assert.ok(source.includes('types: [opened, reopened, ready_for_review, synchronize]'));
  assert.ok(source.includes('ref: codex/public-book-library'));
  assert.ok(source.includes("cancel-in-progress: true"));
  assert.ok(!source.includes("ref: ${{ github.event.pull_request.head.sha"));
  assert.ok(core.includes('scripts/ci-prune-stale-runs.mjs|'));
  assert.ok(core.includes('tests/ci-prune-stale-runs.test.mjs|'));
});
test('Core concurrency is stable for a PR, isolated for manual and merge_group', () => {
  const source = readFileSync('.github/workflows/hh-pr-core-release.yml', 'utf8');
  assert.ok(source.includes('group: hh-pr-core-' +
    "${{ github.event_name == 'pull_request' && github.run_attempt == 1 && format('pr-{0}', github.event.pull_request.number) || format('run-{0}', github.run_id) }}"));
  assert.ok(!source.includes('github.event.pull_request.head.sha || github.sha'));
  assert.ok(source.includes("cancel-in-progress: ${{ github.event_name == 'pull_request' && github.run_attempt == 1 && github.event.action == 'synchronize' }}"));
  assert.ok(!source.includes('github.event.before != github.event.after'),
    'a new synchronize event is itself sufficient to cancel the prior first attempt within the PR-scoped group');
});
