import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { activeLease, analyzeCI, evidenceKey, makeLease, parseLease, productionSpecialists, renderLease, requiredCoreChecks, torontoPrDate, checkCohortDate, summarizePrCohort, routeSweep, assessRequiredGate, refineStaleRoutes, requiredGateApp } from '../lib/ci/pr-sweep-guard.mjs';

const sha = x => x.repeat(40);
const pr = (overrides={}) => ({state:'open',draft:false,head:{sha:sha('a')},base:{sha:sha('b'),ref:'codex/public-book-library'},mergeable:true,mergeable_state:'clean',...overrides});
const check = (name, status='completed', conclusion='success', id=10) => ({name,status,conclusion,head_sha:sha('a'),id,completed_at:`2026-10-29T12:00:${String(id).padStart(2,'0')}Z`});

test('deep stale triage accepts only latest exact-head required-app gate failure',()=>{
  const gate=(id,conclusion,overrides={})=>({id,name:'release-ready',status:'completed',conclusion,head_sha:sha('a'),app:{id:15368},started_at:`2026-10-31T12:00:0${id}Z`,...overrides});
  const assess=(checks,total=checks.length)=>assessRequiredGate({head:sha('a'),appId:15368,checks,total});
  assert.equal(assess([gate(1,'failure')]).state,'FAILED');
  assert.equal(assess([gate(1,'failure'),gate(2,'success')]).state,'SUCCESS');
  assert.equal(assess([gate(2,'failure',{head_sha:sha('b')})]).state,'UNKNOWN');
  assert.equal(assess([gate(1,'failure'),gate(2,'success',{head_sha:sha('b')})]).state,'UNKNOWN');
  assert.equal(assess([gate(2,'failure',{app:{id:8}})]).state,'UNKNOWN');
  assert.equal(assess([gate(2,'failure')],101).state,'UNKNOWN');
  assert.equal(assess([gate(2,null,{status:'in_progress'})]).state,'WAITING');
  assert.equal(assess([gate(1,'failure',{started_at:null}),gate(2,'success')]).state,'UNKNOWN');
  assert.equal(assess([]).state,'UNKNOWN');
});

test('deep triage routes old unknown PRs only with matching-head failure, never invents a root',()=>{
  const now=Date.parse('2026-10-31T12:00:00Z');
  const row=(number,head)=>({number,created_at:'2026-10-29T12:00:00Z',state:'open',draft:false,mergeable:null,mergeable_state:'unknown',head:{sha:head},base:{ref:'codex/public-book-library'}});
  const rows=[row(1,sha('a')),row(2,sha('b')),row(3,sha('c'))];
  const evidence=new Map([[1,{head:sha('a'),state:'FAILED',check_run_id:11,conclusion:'failure'}],
    [2,{head:sha('a'),state:'FAILED',check_run_id:12,conclusion:'failure'}],
    [3,{head:sha('c'),state:'WAITING',check_run_id:13}]]);
  const result=refineStaleRoutes(rows,evidence,now);
  assert.deepEqual(result.stale_root.map(x=>x.number),[1]);
  assert.equal(result.stale_root[0].root_id,null);
  assert.equal(result.stale_root[0].gate.check_run_id,11);
  assert.deepEqual(result.unknown.map(x=>x.number),[2,3]);
});

test('deep triage obtains a pinned release-ready app from effective branch rules',()=>{
  const rule=(checks)=>({type:'required_status_checks',parameters:{required_status_checks:checks}});
  assert.equal(requiredGateApp([rule([{context:'release-ready',integration_id:15368}])]),15368);
  assert.throws(()=>requiredGateApp([]),/REQUIRED_GATE/);
  assert.throws(()=>requiredGateApp([rule([{context:'release-ready'}])]),/REQUIRED_GATE/);
  assert.throws(()=>requiredGateApp([rule([{context:'release-ready',integration_id:15368}]),{type:'required_status_checks',parameters:{}}]),/REQUIRED_GATE/);
  assert.throws(()=>requiredGateApp([rule([{context:'release-ready',integration_id:1},{context:'release-ready',integration_id:2}])]),/REQUIRED_GATE/);
});

test('an explicitly released lease cannot block a new owner until its old expiry',()=>{
  const now=Date.parse('2026-10-31T19:01:00Z');
  const lease=makeLease({owner:'agent-a',head_sha:sha('a'),base_sha:sha('b'),now});
  const comment=(state)=>({id:11,created_at:'2026-10-31T19:01:00Z',body:renderLease({...lease,...state})});
  assert.ok(activeLease([comment({state:'active'})],now));
  assert.equal(activeLease([comment({state:'released_after_atomic_commit',last_action:'release'})],now),null);
  assert.equal(activeLease([comment({last_action:'release'})],now),null);
  assert.ok(activeLease([comment({state:'released_after_atomic_commit',last_action:'heartbeat'})],now));
});

test('route-deep rechecks live heads and never attributes an old failure to a changed PR',()=>{
  const dir=mkdtempSync(join(tmpdir(),'hh-sweep-deep-'));
  try {
    const mock=join(dir,'mock.mjs');
    writeFileSync(mock,`
      let snapshots=0;
      const sha=x=>x.repeat(40);
      globalThis.fetch=async(url,options={})=>{
        const ok=data=>({ok:true,headers:{get:()=>"3000"},json:async()=>data});
        if(url==='https://api.github.com/graphql'){
          if(options.method!=='POST')throw Error('wrong method');
          snapshots++;
          const nodes=[1,2].map(n=>({number:n,createdAt:'2020-01-01T00:00:00Z',isDraft:false,mergeable:'UNKNOWN',mergeStateStatus:'UNKNOWN',baseRefName:'codex/public-book-library',headRefOid:n===1?sha('a'):sha(snapshots===1?'b':'c')}));
          return ok({data:{repository:{pullRequests:{totalCount:2,pageInfo:{hasNextPage:false},nodes}}}});
        }
        if(options.method && options.method!=='GET')throw Error('unexpected write');
        if(url.includes('/rules/branches/'))return ok([{type:'required_status_checks',parameters:{required_status_checks:[{context:'release-ready',integration_id:15368}]}}]);
        const match=url.match(/commits\\/([a-f0-9]{40})\\/check-runs/);
        if(!match)throw Error('unexpected request '+url);
        return ok({total_count:1,check_runs:[{id:11,name:'release-ready',head_sha:match[1],app:{id:15368},status:'completed',conclusion:'failure',started_at:'2026-10-31T12:00:00Z'}]});
      };
    `);
    const child=spawnSync(process.execPath,['--import',mock,'scripts/pr-sweep-guard.mjs','route-deep','andylitvinov-design/books'],{
      cwd:process.cwd(),env:{PATH:process.env.PATH,GH_TOKEN:'synthetic'},encoding:'utf8',timeout:15000,
    });
    assert.equal(child.status,0,child.stderr);
    const result=JSON.parse(child.stdout);
    assert.deepEqual(result.stale_root.map(x=>x.number),[1]);
    assert.deepEqual(result.unknown.map(x=>x.number),[2]);
    assert.equal(result.merge_authorized,false);
    assert.equal(result.root_grouping,'UNCLASSIFIED_REQUIRES_CONFIRMED_REGISTRY_EVIDENCE');
  } finally { rmSync(dir,{recursive:true,force:true}); }
});

test('two-speed routing prioritizes new and old clean PRs without treating unknown as blocked',()=>{
  const now=Date.parse('2026-10-31T12:00:00Z');
  const row=(number,created_at,mergeable_state,draft=false)=>({number,created_at,state:'open',draft,mergeable_state,mergeable:true,base:{ref:'codex/public-book-library'}});
  const result=routeSweep([
    row(1,'2026-10-31T11:00:00Z','blocked'),
    row(2,'2026-10-29T11:00:00Z','clean'),
    row(3,'2026-10-30T11:00:00Z','dirty'),
    row(4,'2026-10-30T11:00:00Z','unknown'),
    row(5,'2026-10-30T12:00:00Z','blocked'),
    row(6,'2026-10-29T11:00:00Z','clean',true),
  ],now);
  assert.deepEqual(result.fast_ready.map(x=>x.number),[1,2]);
  assert.deepEqual(result.stale_root.map(x=>x.number),[3,5,6]);
  assert.deepEqual(result.unknown.map(x=>x.number),[4]);
  assert.equal(result.fast_ready[0].merge_ready,false);
  assert.equal(result.fast_ready[1].merge_ready,true);
});

test('two-speed routing rejects incomplete, duplicate or future evidence',()=>{
  const now=Date.parse('2026-10-31T12:00:00Z');
  const row={number:1,created_at:'2026-10-31T11:00:00Z',state:'open',draft:false,mergeable:true,mergeable_state:'clean',base:{ref:'codex/public-book-library'}};
  assert.throws(()=>routeSweep([row,row],now),/DUPLICATE/);
  assert.throws(()=>routeSweep([{...row,created_at:'2026-11-01T00:00:00Z'}],now),/TIMESTAMP/);
  assert.throws(()=>routeSweep([{...row,draft:null}],now),/INVALID/);
});

test('passes clean current HEAD only when core gate and applicable specialists succeed',()=>{
  const paths=['components/app/app-workspace.jsx'];
  const checks=[check('release-ready'),...productionSpecialists(paths).map(name=>check(name))];
  const result=analyzeCI({pr:pr(),paths,checks});
  assert.equal(result.ci_ready,true);
  assert.deepEqual(result.blockers,[]);
});

test('rejects successful release-ready alongside actual specialist failure (PR #2526 regression)',()=>{
  const result=analyzeCI({pr:pr(),paths:['docs/manual.md'],checks:[check('release-ready'),check('module-routing','completed','failure')]});
  assert.equal(result.ci_ready,false);
  assert.ok(result.blockers.includes('FAILED:module-routing:failure'));
});

test('missing specialist blocks: path-filtered skip is not treated as green',()=>{
  const result=analyzeCI({pr:pr(),paths:['supabase/migrations/20261029.sql'],checks:[check('release-ready')]});
  assert.equal(result.ci_ready,false);
  assert.ok(result.blockers.includes('MISSING:database'));
  assert.ok(result.blockers.includes('MISSING:billing-database'));
  assert.ok(result.blockers.includes('MISSING:interpretation-database'));
  assert.ok(result.blockers.includes('MISSING:verify'));
});

test('draft, changed base, pending, missing core, cancelled and wrong HEAD all block',()=>{
  assert.ok(analyzeCI({pr:pr({draft:true}),paths:['docs/a.md'],checks:[check('release-ready')]}).blockers.includes('PR_IS_DRAFT'));
  assert.ok(analyzeCI({pr:pr({base:{ref:'main',sha:sha('b')}}),paths:['docs/a.md'],checks:[check('release-ready')]}).blockers.includes('NON_PRODUCTION_TARGET'));
  assert.ok(analyzeCI({pr:pr(),paths:['docs/a.md'],checks:[check('release-ready','in_progress',null)]}).blockers.includes('WAITING:release-ready'));
  assert.ok(analyzeCI({pr:pr(),paths:['docs/a.md'],checks:[]}).blockers.includes('MISSING:release-ready'));
  assert.ok(analyzeCI({pr:pr(),paths:['docs/a.md'],checks:[check('release-ready','completed','cancelled')]}).blockers.includes('NOT_SUCCESS:release-ready:cancelled'));
  const wrong={...check('release-ready'),head_sha:sha('c')};
  assert.ok(analyzeCI({pr:pr(),paths:['docs/a.md'],checks:[wrong]}).blockers.includes('WRONG_HEAD:release-ready'));
});

test('duplicate check contexts cannot hide a previous failure from another workflow',()=>{
  const result=analyzeCI({pr:pr(),paths:['docs/a.md'],checks:[check('release-ready','completed','failure',9),check('release-ready','completed','success',10)]});
  assert.equal(result.ci_ready,false);
  assert.ok(result.blockers.includes('AMBIGUOUS_CHECK:release-ready'));
});

test('failed legacy commit status blocks despite core success',()=>{
  const result=analyzeCI({pr:pr(),paths:['docs/a.md'],checks:[check('release-ready')],statuses:[{context:'external-security',state:'failure'}]});
  assert.equal(result.ci_ready,false);
  assert.ok(result.blockers.includes('COMMIT_STATUS:external-security:failure'));
});

test('evidence fingerprint changes on head, base, check result or changed paths',()=>{
  const input={pr:pr(),paths:['docs/a.md'],checks:[check('release-ready')]};
  const k=evidenceKey(input);
  assert.equal(k,evidenceKey(input));
  assert.notEqual(k,evidenceKey({...input,pr:pr({head:{sha:sha('c')}})}));
  assert.notEqual(k,evidenceKey({...input,pr:pr({base:{ref:'codex/public-book-library',sha:sha('d')}})}));
  assert.notEqual(k,evidenceKey({...input,checks:[check('release-ready','completed','failure')]}));
  assert.notEqual(k,evidenceKey({...input,paths:['docs/b.md']}));
  assert.notEqual(k,evidenceKey({...input,statuses:[{context:'external-security',state:'pending'}]}));
});

test('oldest active GitHub comment claim wins, even after HEAD changes',()=>{
  const now=Date.parse('2026-10-29T12:00:00Z');
  const a=makeLease({owner:'work-repair',head_sha:sha('a'),base_sha:sha('b'),now});
  const b=makeLease({owner:'chat-triage',head_sha:sha('c'),base_sha:sha('d'),now:now+2000});
  const comments=[{id:24,body:renderLease(b),created_at:new Date(now+2000).toISOString()}, {id:23,body:renderLease(a),created_at:new Date(now).toISOString()}];
  assert.equal(activeLease(comments,now+3000)?.state.owner,'work-repair');
  assert.equal(activeLease(comments,now+13*60_000),null);
  assert.equal(parseLease('not a claim'),null);
  assert.equal(parseLease(renderLease(a))?.owner,'work-repair');
});

test('specialists include core app, DB, security, payments and OPORA for global changes',()=>{
  const checks=productionSpecialists(['package.json']);
  for(const name of ['unit-build','database','billing-database','interpretation-database','module-routing','verify','public-services','browser (webkit, core)']){
    assert.ok(checks.includes(name),name);
  }
  assert.deepEqual(productionSpecialists(['docs/operations/a.md']),[]);
});

test('bad owner, SHA and oversized leases are rejected',()=>{
  assert.throws(()=>makeLease({owner:'x',head_sha:sha('a'),base_sha:sha('b')}),/INVALID_OWNER/);
  assert.throws(()=>makeLease({owner:'work-owner',head_sha:'bad',base_sha:sha('b')}),/INVALID_SHA/);
  assert.throws(()=>makeLease({owner:'work-owner',head_sha:sha('a'),base_sha:sha('b'),leaseMinutes:300}),/INVALID_LEASE_DURATION/);
});


test('no-job workflow validation failure is not hidden by successful job checks',()=>{
  const result=analyzeCI({
    pr:pr(),paths:['docs/operations/a.md'],checks:[check('release-ready')],
    workflowRuns:[{id:123,event:'push',name:'.github/workflows/broken.yml',head_sha:sha('a'),status:'completed',conclusion:'failure'}],
  });
  assert.equal(result.ci_ready,false);
  assert.ok(result.blockers.includes('FAILED_WORKFLOW:123:failure'));
  assert.ok(analyzeCI({pr:pr(),paths:['docs/a.md'],checks:[check('release-ready')],
    workflowRuns:[{id:124,event:'pull_request',head_sha:sha('a'),status:'queued'}]}).blockers.includes('WAITING_WORKFLOW:124'));
});

test('workflow runs change evidence key; changed workflow and guard require own checks',()=>{
  const input={pr:pr(),paths:['docs/a.md'],checks:[check('release-ready')],workflowRuns:[{id:11,event:'pull_request',head_sha:sha('a'),status:'queued'}]};
  assert.notEqual(evidenceKey(input),evidenceKey({...input,workflowRuns:[{...input.workflowRuns[0],status:'completed',conclusion:'success'}]}));
  const expected=productionSpecialists(['.github/workflows/hh-pr-sweep-guard.yml','lib/ci/pr-sweep-guard.mjs']);
  assert.ok(expected.includes('actionlint-changed'));
  assert.ok(expected.includes('guard-unit'));
  assert.ok(productionSpecialists(['components/app/app-workspace.jsx']).includes('verify'));
  const unverified=analyzeCI({pr:pr(),paths:['docs/a.md'],checks:[{...check('release-ready'),head_sha:null}]});
  assert.ok(unverified.blockers.includes('WRONG_OR_UNKNOWN_HEAD:release-ready'));
});

test('Markdown fenced GitHub lease comments block competing agents correctly', () => {
  const now=Date.parse('2026-10-29T12:00:00Z');
  const claim=makeLease({owner:'work-repair',head_sha:sha('a'),base_sha:sha('b'),now});
  const raw=renderLease(claim);
  const fenced='<!-- HH_PR_SWEEP_LEASE_V1 -->\n' + '```json\n' + JSON.stringify(claim,null,2) + '\n```';
  assert.deepEqual(parseLease(fenced),parseLease(raw));
  const old={id:20,body:fenced,created_at:new Date(now).toISOString()};
  const newer={id:21,body:renderLease({...claim,owner:'merge-sentinel'}),created_at:new Date(now+100).toISOString()};
  assert.equal(activeLease([newer,old],now+1000)?.state.owner,'work-repair');
  assert.equal(activeLease([old],now+13*60_000),null);
});

test('lease parser rejects untrusted prose, missing base SHA and malformed fences',()=>{
  const claim=makeLease({owner:'work-merge',head_sha:sha('a'),base_sha:sha('b')});
  assert.equal(parseLease('<!-- HH_PR_SWEEP_LEASE_V1 -->\n```json\n' + JSON.stringify(claim) + '\n```\nmore prose'),null);
  assert.equal(parseLease('<!-- HH_PR_SWEEP_LEASE_V1 -->\n' + JSON.stringify({...claim,base_sha:undefined})),null);
  assert.equal(parseLease('<!-- HH_PR_SWEEP_LEASE_V1 -->\n```json\nnot json\n```'),null);
});

test('core rollout: manual evidence never masks an installed or proposed core gate',()=>{
  assert.deepEqual(requiredCoreChecks({baseHasCore:true,paths:['docs/a.md']}),['release-ready']);
  assert.deepEqual(requiredCoreChecks({baseHasCore:false,paths:['.github/workflows/hh-pr-core-release.yml']}),['release-ready']);
  assert.deepEqual(requiredCoreChecks({baseHasCore:false,paths:['docs/a.md']}),[]);
  assert.throws(()=>requiredCoreChecks({paths:[]}),/CORE_GATE_STATE_UNKNOWN/);
  // Core absence is not permission to merge. Relevant failed specialist checks still block.
  const r=analyzeCI({pr:pr(),required:[],paths:['components/app/app-workspace.jsx'],
    checks:[check('unit-build','completed','failure'),check('database'),check('verify'),
      check('browser (chromium, core)'),check('browser (webkit, core)')]});
  assert.equal(r.ci_ready,false);
  assert.ok(r.blockers.includes('FAILED:unit-build:failure'));
});

test('core absent and zero exact-head CI evidence cannot report ready',()=>{
  for(const paths of [['docs/manual.md'],['lib/mandala/cinematic-director.mjs'],['lib/ci/pr-sweep-guard.mjs'],['components/app/app-workspace.jsx'],['lib/ci/pr-sweep-guard.mjs','lib/mandala/cinematic-director.mjs']]){
    const result=analyzeCI({pr:pr(),paths,required:requiredCoreChecks({baseHasCore:false,paths})});
    assert.equal(result.ci_ready,false);
    assert.ok(result.blockers.includes('NO_POSITIVE_EXACT_HEAD_CI'));
    assert.ok(!result.blockers.includes('MISSING:release-ready'));
  }
});

test('queued, skipped, failed, cancelled and wrong-head evidence are not positive success',()=>{
  for(const [status,conclusion] of [['queued',null],['completed','skipped'],['completed','failure'],['completed','cancelled']]){
    const result=analyzeCI({pr:pr(),paths:['docs/manual.md'],required:[],checks:[check('other',status,conclusion)]});
    assert.equal(result.ci_ready,false);assert.ok(result.blockers.includes('NO_POSITIVE_EXACT_HEAD_CI'));
  }
  const result=analyzeCI({pr:pr(),paths:['docs/manual.md'],required:[],checks:[{...check('other'),head_sha:sha('c')}]});
  assert.ok(result.blockers.includes('NO_POSITIVE_EXACT_HEAD_CI'));assert.ok(result.blockers.includes('WRONG_HEAD:other'));
});

test('positive evidence uses exact SHA and preserves existing successful contracts',()=>{
  const input={pr:pr(),paths:['docs/manual.md'],required:[]};
  assert.equal(analyzeCI({...input,checks:[check('existing-success')]}).ci_ready,true);
  assert.equal(analyzeCI({...input,workflowRuns:[{id:1,event:'pull_request',head_sha:sha('a'),status:'completed',conclusion:'success'}]}).ci_ready,true);
  assert.equal(analyzeCI({...input,statuses:[{context:'external',state:'success',sha:sha('a')}]}).ci_ready,true);
  for(const extra of [{},{sha:sha('c')}]){
    const result=analyzeCI({...input,statuses:[{context:'external',state:'success',...extra}]});
    assert.equal(result.ci_ready,false);assert.ok(result.blockers.includes('NO_POSITIVE_EXACT_HEAD_CI'));
  }
  const installed=analyzeCI({...input,required:requiredCoreChecks({baseHasCore:true,paths:input.paths}),checks:[check('existing-success')]});
  assert.equal(installed.ci_ready,false);assert.ok(installed.blockers.includes('MISSING:release-ready'));
});


test('current legacy status alone determines positive evidence per context', () => {
  const good = {context:'legacy',state:'success',sha:sha('a')};
  for (const newest of [{...good,sha:sha('c')}, {context:'legacy',state:'success'}, {...good,state:'pending'}, {...good,state:'failure'}, {...good,state:'error'}, {...good,state:'skipped'}, {...good,state:'queued'}, {...good,state:null}]) {
    const result=analyzeCI({pr:pr(),paths:['docs/a.md'],required:[],statuses:[newest,good]});
    assert.equal(result.ci_ready,false);
    assert.ok(result.blockers.includes('NO_POSITIVE_EXACT_HEAD_CI'));
  }
  assert.equal(analyzeCI({pr:pr(),paths:['docs/a.md'],required:[],statuses:[good,{...good,state:'failure'}]}).ci_ready,true);
});
test('malformed status rows are not positive evidence and do not throw', () => {
  for (const statuses of [[null],[undefined],[{}],[{state:'success',sha:sha('a')}],[{context:'legacy',sha:sha('a')}]] ) {
    const result=analyzeCI({pr:pr(),paths:['docs/a.md'],required:[],statuses});
    assert.equal(result.ci_ready,false);
    assert.ok(result.blockers.includes('NO_POSITIVE_EXACT_HEAD_CI'));
  }
});
test('non-success workflow and check evidence cannot satisfy minimum guard', () => {
  for(const status of ['queued','in_progress','completed']) for(const conclusion of ['skipped','failure',null]) {
    for(const kind of ['checks','workflowRuns']) {
      const row=kind==='checks'?check('unrelated',status,conclusion):{id:1,event:'pull_request',head_sha:sha('a'),status,conclusion};
      const result=analyzeCI({pr:pr(),paths:['docs/a.md'],required:[],[kind]:[row]});
      assert.equal(result.ci_ready,false);
      assert.ok(result.blockers.includes('NO_POSITIVE_EXACT_HEAD_CI'));
    }
  }
});
test('malformed check and workflow evidence never enables readiness', () => {
  for (const checks of [[null],[{}],[{name:'other',status:'completed',conclusion:'success'}]]) {
    assert.equal(analyzeCI({pr:pr(),required:[],paths:['docs/a.md'],checks}).ci_ready,false);
  }
  for (const workflowRuns of [[null],[{}],[{event:'pull_request',head_sha:sha('a'),status:'completed',conclusion:'success'}],[{id:1,event:'pull_request',status:'completed',conclusion:'success'}]]) {
    assert.equal(analyzeCI({pr:pr(),required:[],paths:['docs/a.md'],workflowRuns}).ci_ready,false);
  }
  const result=analyzeCI({pr:pr(),required:[],paths:['docs/a.md'],statuses:[{context:'legacy',state:'failure',sha:sha('a')},{context:'legacy',state:'success',sha:sha('a')}]});
  assert.ok(result.blockers.includes('COMMIT_STATUS:legacy:failure'));
});

test('unrelated green core check cannot hide missing high-fanout specialist jobs', () => {
  const cases = [
    ['lib/crm/salesbot-operator.mjs', ['crm','build']],
    ['components/app/my-services-dashboard.jsx', ['signed-in-mock-browser','practice-visual-parity','service-editor']],
    ['components/app/app-workspace.jsx', ['crm','build','signed-in-mock-browser','practice-visual-parity','service-editor','private-progress','notification-build','focused-verification']],
    ['lib/practitioners/conversation-policy.js', ['presentation-contract']],
    ['components/session-audio-recorder.jsx', ['private-audio']],
    ['scripts/verify-practice-visual-browser.mjs', ['practice-visual-parity']],
    ['components/app/simple-service-editor.jsx', ['service-editor']],
    ['lib/app/my-progress.mjs', ['private-progress']],
    ['lib/app/messenger-notification-policy.js', ['notification-build']],
    ['lib/kling-video.mjs', ['kling']],
    ['lib/personal-coaching/session.js', ['focused-verification']],
    ['.github/workflows/hh-crm-source-check.yml', ['crm','build','actionlint-changed']],
    ['.github/workflows/practice-google-browser.yml', ['signed-in-mock-browser','actionlint-changed']],
    ['.github/workflows/practice-visual-services.yml', ['service-editor','actionlint-changed']],
    ['.github/workflows/hh-private-audio-e2e.yml', ['private-audio','actionlint-changed']],
  ];
  for (const [path, names] of cases) {
    const expected = productionSpecialists([path]);
    const result = analyzeCI({pr:pr(),paths:[path],checks:[check('release-ready')]});
    assert.equal(result.ci_ready,false, path);
    for (const name of names) {
      assert.ok(expected.includes(name), path + ' misses ' + name);
      assert.ok(result.blockers.includes('MISSING:' + name), path + ' falsely green without ' + name);
    }
  }
  assert.deepEqual(productionSpecialists(['docs/operations/notes.md']), []);
});

test('high-fanout CRM pass requires both source and build; wrong or failed job never qualifies',()=>{
  const input={pr:pr(),paths:['lib/crm/salesbot-operator.mjs'],checks:[check('release-ready'),check('crm'),check('build')]};
  assert.equal(analyzeCI(input).ci_ready,true);
  for (const broken of [check('build','completed','failure'), check('build','queued',null), {...check('build'),head_sha:sha('f')}]) {
    const out=analyzeCI({...input,checks:[check('release-ready'),check('crm'),broken]});
    assert.equal(out.ci_ready,false);
  }
});

test('Private Audio reuses unconditional production Core TS/build while keeping real audio and push acceptance', () => {
  const read = file => readFileSync(new URL('../.github/workflows/' + file, import.meta.url), 'utf8');
  const source = read('hh-private-audio-e2e.yml');
  const core = read('hh-pr-core-release.yml');
  const prodOnly = "if: ${{ github.event_name != 'pull_request' || github.event.pull_request.base.ref != 'codex/public-book-library' }}";
  for (const [name, command] of [
    ['Full TypeScript (core owns production PR typing)', 'npx --no-install tsc --noEmit --incremental false'],
    ['Production build with app flags absent', 'npm run build'],
  ]) {
    assert.ok(source.includes('- name: ' + name + '\n        ' + prodOnly + '\n        run: ' + command), name + ' must execute on push and delegate only production PR');
  }
  assert.match(core, /^  release-ready:/m);
  assert.match(source, /^  pull_request:/m);
  assert.match(source, /^  push:/m);
  assert.ok(source.includes("github.event.pull_request.draft == false"));
  for (const required of [
    'Expiring admin sessions and pinned SDK refresh regressions',
    'Actual synthetic AAC bytes through owner intent/upload/finalization/guest Range playback and privacy',
    'tests/session-delivery-security.test.mjs',
    'tests/client-session-recorder-auth.test.mjs',
    'tests/session-media-sdk.test.mjs',
    'Fixture lint and private media tests',
  ]) assert.ok(source.includes(required), 'private-owner/media gate removed: ' + required);
  assert.match(source, /cancel-in-progress: \$\{\{ github.event_name == 'pull_request' \}\}/);
  assert.doesNotMatch(source, /continue-on-error:\s*true/);
});

test('Practitioner presentations retain all real contracts on production PRs and full TS/build on feature push', () => {
  const read = file => readFileSync(new URL('../.github/workflows/' + file, import.meta.url), 'utf8');
  const source = read('practitioner-presentations.yml');
  const core = read('hh-pr-core-release.yml');
  const rule = "if: ${{ github.event_name != 'pull_request' || github.event.pull_request.base.ref != 'codex/public-book-library' }}";
  assert.match(source, /^  pull_request:/m);
  assert.match(source, /^  push:/m);
  assert.match(core, /^  release-ready:/m);
  assert.ok(source.includes("'.github/workflows/practitioner-presentations.yml'"));
  for (const [step, command] of [
    ['Full TypeScript (Core owns production PR)', 'npx tsc --noEmit'],
    ['Full Next build (Core owns production PR)', 'npm run build'],
  ]) {
    assert.ok(source.includes('- name: '+step+'\n        '+rule+'\n        run: '+command),
      step+' must retain independent feature push and reuse only Core on production PR');
  }
  for (const item of [
    'tests/practitioner-presentation-video.test.mjs',
    'tests/practitioner-video-materials.test.mjs',
    'tests/practitioner-articles-v4.test.mjs',
    'tests/practitioner-articles-folders.test.mjs',
    'tests/master-network-r2.test.mjs',
    'tests/practice-public-alias.test.mjs',
  ]) assert.ok(source.includes(item), 'Missing actual practitioner contract: '+item);
  assert.ok(source.includes("github.event.pull_request.draft == false"));
  assert.match(source, /cancel-in-progress: \$\{\{ github.event_name == 'pull_request' \}\}/);
  assert.doesNotMatch(source, /continue-on-error:\s*true/);
});

test('Practitioner visual editor skips Draft work, reuses Core TS/Next and retains owner-safe contracts', () => {
  const read = file => readFileSync(new URL('../.github/workflows/' + file, import.meta.url), 'utf8');
  const source = read('practice-visual-services.yml');
  const core = read('hh-pr-core-release.yml');
  const dollar = String.fromCharCode(36);
  const expectedEvents = 'types: [opened, synchronize, reopened, ready_for_review, converted_to_draft]';
  const prGroup = 'group: practice-visual-services-'+dollar+"{{ github.event_name == 'pull_request' && github.event.pull_request.number || github.run_id }}";
  const prCancel = 'cancel-in-progress: '+dollar+"{{ github.event_name == 'pull_request' }}";
  const draftGate = 'if: '+dollar+"{{ github.event_name != 'pull_request' || github.event.pull_request.draft == false }}";
  const coreReuse = 'if: '+dollar+"{{ github.event_name != 'pull_request' || github.event.pull_request.base.ref != 'codex/public-book-library' }}";
  assert.ok(source.includes(expectedEvents), 'Draft→Ready must trigger the full real practice suite');
  assert.match(source, /^    branches: \['codex\/public-book-library'\]/m);
  assert.ok(source.includes(prGroup), 'cancel only superseded commits of the same PR');
  assert.ok(source.includes(prCancel), 'do not cancel unrelated release/manual runs');
  assert.ok(source.includes('  service-editor:\n    '+draftGate+'\n'), 'Draft must not run expensive editor QA');
  assert.ok(source.includes('node-version: 22\n          cache: npm'), 'reuse npm package cache, not node_modules or PHI');
  for (const [step, command] of [
    ['TypeScript', 'npx --no-install tsc --noEmit'],
    ['Production build', 'npm run build'],
  ]) assert.ok(source.includes('- name: '+step+'\n        '+coreReuse+'\n        run: '+command),
    step+' must run outside production-targeted PRs; Core validates exact-HEAD globally');
  for (const contract of [
    'tests/practice-google-return-and-services-v5.test.mjs',
    'tests/practice-public-private-unified.test.mjs',
    'tests/practice-photo-upload.test.mjs',
    'tests/practitioner-preview-auth.test.mjs',
    'tests/remote-support-privacy-contract.test.mjs',
    'tests/remote-energy-support-booking.test.mjs',
    'npx --no-install eslint components/app/simple-service-editor.jsx',
    "'.github/workflows/practice-visual-services.yml'",
  ]) assert.ok(source.includes(contract), 'missing real practice/consent/security gate '+contract);
  assert.match(core, /^  release-ready:/m);
  assert.match(core, /ci-specialist-aggregate\.mjs/);
  assert.doesNotMatch(source, /continue-on-error:\s*true/);
});


test('Pro master workflow delegates duplicate global TS/Next to unconditional exact-head Core', () => {
  const pro = readFileSync(new URL('../.github/workflows/pro-reiki-master-paths.yml', import.meta.url), 'utf8');
  const core = readFileSync(new URL('../.github/workflows/hh-pr-core-release.yml', import.meta.url), 'utf8');
  const reuse = 'if: '+String.fromCharCode(36)+"{{ github.event_name != 'pull_request' || github.event.pull_request.base.ref != 'codex/public-book-library' }}";
  assert.ok(pro.includes('name: Pro Reiki master learning paths'));
  assert.ok(pro.includes("    branches: ['codex/public-book-library']"));
  assert.ok(pro.includes("- 'tests/profi-hub.test.mjs'"));
  assert.ok(pro.includes("- 'tests/pro-master-search-placement.test.mjs'"));
  assert.ok(pro.includes("- '.github/workflows/pro-reiki-master-paths.yml'"));
  assert.ok(pro.includes('node --test tests/profi-hub.test.mjs tests/pro-master-search-placement.test.mjs tests/temple-support-hub.test.mjs'));
  assert.ok(pro.includes('npx --no-install eslint'));
  assert.ok(pro.includes('components/profi-hub.tsx'));
  assert.ok(pro.includes('components/master-network-explorer.tsx'));
  for (const [step,command] of [
    ['Type-check the application','npx --no-install tsc --noEmit'],
    ['Validate the Next.js production build','npm run build'],
  ]) assert.ok(pro.includes('- name: '+step+'\n        '+reuse+'\n        run: '+command),
    'Pro '+step+' must be owned by immutable-base Core on production PRs');
  assert.match(core,/^  release-ready:/m);
  assert.match(core,/run: npm run build/);
  assert.ok(core.includes('ci-specialist-aggregate.mjs'));
  assert.doesNotMatch(pro,/continue-on-error:\s*true/);
});

test('created-PR cohort uses Toronto day boundaries and separates merge from LIVE',()=>{
  const rows=[
    {number:10,state:'closed',created_at:'2026-10-30T04:00:00Z',
      merged_at:'2026-10-30T04:20:00Z',base:{ref:'codex/public-book-library'},title:'ci: scoped fix'},
    {number:11,state:'open',draft:true,created_at:'2026-10-31T03:59:59Z',
      merged_at:null,base:{ref:'codex/public-book-library'},title:'feat: pending'},
    {number:12,state:'closed',created_at:'2026-10-30T12:00:00Z',
      merged_at:null,base:{ref:'codex/public-book-library'},title:'feat: closed'},
    {number:13,state:'closed',created_at:'2026-10-30T16:00:00Z',
      merged_at:'2026-10-30T17:00:00Z',base:{ref:'feat/stack'},title:'feat: staged'},
    {number:14,state:'closed',created_at:'2026-10-30T03:59:59Z',
      merged_at:'2026-10-30T04:01:00Z',base:{ref:'codex/public-book-library'},title:'ci: previous day'},
  ];
  assert.equal(torontoPrDate('2026-10-30T03:59:59Z'),'2026-10-29');
  assert.equal(torontoPrDate('2026-10-31T03:59:59Z'),'2026-10-30');
  const out=summarizePrCohort(rows,'2026-10-30');
  assert.deepEqual([out.created,out.merged,out.open,out.closed_without_merge],[4,2,1,1]);
  assert.deepEqual([out.merged_into_production,out.merged_into_intermediate_branch,out.ci_titled_merges],[1,1,1]);
  assert.equal(out.median_created_to_merge_minutes,40);
  assert.equal(out.draft_open,1);
  assert.equal(out.merge_rate_percent,50);
  assert.equal(out.live_verified_count,null);
  assert.equal(out.green_to_merge_minutes,null);
  assert.equal(out.agent_attribution,'UNVERIFIED_SHARED_GITHUB_ACCOUNT');
  assert.deepEqual(out.open_sample.map(x=>x.number),[11]);
});

test('cohort report rejects fabricated dates, duplicate PRs and false merge receipts',()=>{
  for(const bad of ['2026-02-30','2026-10-32','2026-1-30','tomorrow']) {
    assert.throws(()=>checkCohortDate(bad),/INVALID_COHORT_DATE/);
  }
  const pr={number:7,state:'open',created_at:'2026-10-30T10:00:00Z',title:'test'};
  assert.throws(()=>summarizePrCohort([pr,pr],'2026-10-30'),/DUPLICATE_PR_COHORT_ROW/);
  assert.throws(()=>summarizePrCohort([{...pr,merged_at:'2026-10-30T11:00:00Z'}],'2026-10-30'),/INVALID_PR_MERGE_EVIDENCE/);
  assert.throws(()=>summarizePrCohort([{}],'2026-10-30'),/INVALID_PR_COHORT_ROW/);
  assert.throws(()=>summarizePrCohort([],'2026-10-30'),/PR_COHORT_SOURCE_MISSING/);
  const script=readFileSync(new URL('../scripts/pr-sweep-guard.mjs',import.meta.url),'utf8');
  assert.match(script,/operation === 'daily'/);
  assert.match(script,/PR_COHORT_INCOMPLETE_PAGINATION/);
  assert.match(script,/state=all&sort=created&direction=desc/);
  assert.match(script,/completeness:'PR_CREATED_DAY_EXHAUSTIVE'/);
});
