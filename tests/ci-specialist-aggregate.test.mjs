import { safeDocumentationAdvance } from '../lib/ci/production-base-impact.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import { readdirSync, readFileSync } from 'node:fs';
import {
  TARGET, parsePrTrigger, matchesTrigger, classifyPackageImpact, expectedWorkflows, resolveExpectedSpecialists, APPROVED_SPECIALIST_REPLACEMENTS, inspectWorkflowRuns, concurrencyOnlyAdvisory, isConcurrencyAdvisoryRun,
  inspectJobs, trustedConditionalJobs, validateParameters,
} from '../lib/ci/specialist-aggregate.mjs';
import { verify, githubReader, optionalMandalaMacosSkip } from '../scripts/ci-specialist-aggregate.mjs';

const repo='andylitvinov-design/books', SHA='a'.repeat(40), BASE='b'.repeat(40);
const pr=()=>({number:27,state:'open',draft:false,head:{sha:SHA,ref:'feat/test',repo:{full_name:repo}},base:{sha:BASE,ref:TARGET,repo:{full_name:repo}}});
const path='.github/workflows/messenger.yml';
const yaml="on:\n  pull_request:\n    branches: ['codex/public-book-library']\n    paths:\n      - 'lib/crm/**'\n      - '!lib/crm/private/**'\n      - 'lib/crm/private/approved.mjs'\n  push:\n    branches: [main]\npermissions:\n  contents: read\njobs:\n  test:\n    runs-on: ubuntu-24.04\n";
const run=(overrides={})=>({id:151,workflow_id:30,path,head_sha:SHA,head_branch:'feat/test',event:'pull_request',status:'completed',conclusion:'success',run_attempt:1,head_repository:{full_name:repo},pull_requests:[{number:27,head:{sha:SHA},base:{ref:TARGET}}],...overrides});

test('only verified concurrency-only edits can avoid unrelated specialists',()=>{
 const file='.github/workflows/example.yml';
 const old="on:\n  pull_request:\n    paths: ['.github/workflows/example.yml', 'app/api/**']\nconcurrency:\n  group: example-${{ github.ref }}\n  cancel-in-progress: true\njobs:\n  test:\n    runs-on: ubuntu-latest\n";
 const condition="github.event_name == 'pull_request' && github.event.action == 'synchronize' && github.event.before != github.event.after";
 const next=old.replace('  group: example-${{ github.ref }}\n  cancel-in-progress: true',
  "  group: example-${{ "+condition+" && format('pr-{0}', github.event.pull_request.number) || format('run-{0}', github.run_id) }}\n  cancel-in-progress: ${{ "+condition+" }}");
 const base=new Map([[file,old]]), current=new Map([[file,next]]);
 const call=(changedRows,head=current)=>concurrencyOnlyAdvisory({base,current:head,changedRows,expected:[file]});
 assert.deepEqual([...call([{filename:file,status:'M'}])],[file]);
 assert.deepEqual([...call([{filename:file,status:'modified'},{filename:'tests/ci-head-cancellation.test.mjs',status:'modified'}])],[file]);
 for(const extra of ['app/api/payments/route.js','app/page.tsx','scripts/unknown.mjs','tests/unknown.test.mjs'])
  assert.deepEqual([...call([{filename:file,status:'M'},{filename:extra,status:'M'}])],[]);
 for(const status of ['A','D','T','renamed']) assert.deepEqual([...call([{filename:file,status}])],[]);
 for(const unsafe of [next.replace('runs-on: ubuntu-latest','runs-on: self-hosted'),next.replace('github.event.before != github.event.after','true'),next.replace('example-${{','other-${{'),next+'concurrency:\n'])
  assert.deepEqual([...call([{filename:file,status:'M'}],new Map([[file,unsafe]]))],[]);
 const collision=new Map([[file,next],['.github/workflows/other.yml',old]]);
 assert.deepEqual([...call([{filename:file,status:'M'}],collision)],[]);
 for(const prefix of ['example-pr-','example-run-','exam']) {
  const competing=old.replace('example-${{ github.ref }}',prefix+'${{ github.ref }}');
  assert.deepEqual([...call([{filename:file,status:'M'}],new Map([[file,next],['.github/workflows/other.yml',competing]]))],[]);
 }
 const relevantOld=old.replace("'app/api/**'", "'tests/ci-head-cancellation.test.mjs'");
 const relevantNext=next.replace("'app/api/**'", "'tests/ci-head-cancellation.test.mjs'");
 assert.deepEqual([...concurrencyOnlyAdvisory({base:new Map([[file,relevantOld]]),current:new Map([[file,relevantNext]]),
  changedRows:[{filename:file,status:'M'},{filename:'tests/ci-head-cancellation.test.mjs',status:'M'}],expected:[file]})],[]);
});

test('concurrency advisory never hides push, orphan, wrong-head or unrelated runs',()=>{
 const paths=new Set([path]);
 assert.equal(isConcurrencyAdvisoryRun(run(),pr(),paths),true);
 for(const variant of [run({event:'push'}),run({head_sha:'c'.repeat(40)}),run({head_repository:{full_name:'other/repo'}}),run({pull_requests:[]}),run({path:'.github/workflows/other.yml'})])
  assert.equal(isConcurrencyAdvisoryRun(variant,pr(),paths),false);
});

test('trusted exact-merge concurrency scope ignores only its associated PR run',async()=>{
 const file='.github/workflows/example.yml';
 const syntax='.github/workflows/hh-actionlint.yml';
 const old="on:\n  pull_request:\n    branches: ['codex/public-book-library']\n    paths: ['.github/workflows/example.yml']\nconcurrency:\n  group: example-${{ github.ref }}\n  cancel-in-progress: true\njobs:\n  test:\n    runs-on: ubuntu-latest\n";
 const syntaxYaml="on:\n  pull_request:\n    branches: ['codex/public-book-library']\n    paths: ['.github/workflows/**']\njobs:\n  syntax:\n    runs-on: ubuntu-latest\n";
 const condition="github.event_name == 'pull_request' && github.event.action == 'synchronize' && github.event.before != github.event.after";
 const next=old.replace('  group: example-${{ github.ref }}\n  cancel-in-progress: true',"  group: example-${{ "+condition+" && format('pr-{0}', github.event.pull_request.number) || format('run-{0}', github.run_id) }}\n  cancel-in-progress: ${{ "+condition+" }}");
 const files={base:new Map([[file,old],[syntax,syntaxYaml]]),current:new Map([[file,next],[syntax,syntaxYaml]]),changedRows:[{filename:file,status:'M'}]};
 const ctx={repo,number:27,head:SHA,base:BASE};
 const failed=run({path:file,conclusion:'failure'});
 const syntaxRun=run({id:153,path:syntax});
 const api={pr:async()=>pr(),runs:async()=>[failed,syntaxRun],jobs:async()=>[{name:'actionlint-changed',status:'completed',conclusion:'success'}]};
 const result=await verify(api,ctx,files,{maxWaitMs:0});
 assert.deepEqual(result.expected,[syntax]);
 assert.deepEqual(result.advisory.concurrencyOnly,[file]);
 api.runs=async()=>[failed,syntaxRun,run({id:152,path:file,event:'push',conclusion:'failure'})];
 await assert.rejects(()=>verify(api,ctx,files,{maxWaitMs:0}),/SPECIALIST_FAILED/);
 api.runs=async()=>[syntaxRun,run({path:file,conclusion:'failure',pull_requests:[]})];
 await assert.rejects(()=>verify(api,ctx,files,{maxWaitMs:0}),/SPECIALIST_FAILED/);
 const modifiedSyntax={...files,current:new Map([[file,next],[syntax,syntaxYaml+'# changed']])};
 api.runs=async()=>[failed,syntaxRun];
 await assert.rejects(()=>verify(api,ctx,modifiedSyntax,{maxWaitMs:0}),/SPECIALIST_FAILED/);
});

test('scope reads GitHub path filters and ordered negative/reincluded patterns',()=>{
  const trigger=parsePrTrigger(yaml,path);
  assert.equal(matchesTrigger(trigger,['lib/crm/lead.js']),true);
  assert.equal(matchesTrigger(trigger,['lib/crm/private/secret.mjs']),false);
  assert.equal(matchesTrigger(trigger,['lib/crm/private/approved.mjs']),true);
  assert.equal(matchesTrigger(trigger,['lib/audio/track.mjs']),false);
  assert.equal(matchesTrigger(trigger,['docs/readme.md']),false);
  assert.equal(matchesTrigger({...trigger,branches:['main']},['lib/crm/a']),false);
});

test('parser handles inline, quoted values, paths-ignore, unrelated and non-PR events',()=>{
  assert.equal(parsePrTrigger('on: [push, workflow_dispatch]\njobs:\n  x:'),null);
  assert.ok(parsePrTrigger('on: [push, pull_request]'));
  assert.equal(parsePrTrigger('on:\n  push:\n    branches: [main]\njobs:\n  x:'),null);
  const ignored=parsePrTrigger('on:\n  pull_request:\n    paths-ignore:\n      - "docs/**"\n');
  assert.equal(matchesTrigger(ignored,['docs/manual.md']),false);
  assert.equal(matchesTrigger(ignored,['docs/manual.md','lib/a.js']),true);
  const closed=parsePrTrigger('on:\n  pull_request:\n    types: [closed]\n');
  assert.equal(matchesTrigger(closed,['lib/a.js']),false);
});

test('malformed trigger definitions fail closed instead of being treated as unrelated',()=>{
  for(const text of [
    'name: broken\njobs:\n  x:',
    'on:\n  pull_request:\n    paths: []\n',
    'on:\n  pull_request: {paths: [lib/**]}\n',
    'on:\n  pull_request:\n    paths:\n      - lib/**\n    paths-ignore:\n      - docs/**\n',
  ]) assert.throws(()=>parsePrTrigger(text),/MISSING_ON|EMPTY_FILTER|UNSUPPORTED|CONFLICTING/);
});

test('union of baseline and PR proposal prevents removing a required workflow to bypass checks',()=>{
  const old=new Map([[path,yaml]]);
  const disabled=new Map([[path,'on:\n  workflow_dispatch:\njobs:\n  test:\n    runs-on: ubuntu-24.04\n']]);
  assert.deepEqual(expectedWorkflows({base:old,current:disabled,changed:['lib/crm/a.js']}),[path]);
  assert.deepEqual(expectedWorkflows({base:disabled,current:old,changed:['lib/crm/a.js']}),[path]);
  assert.deepEqual(expectedWorkflows({base:old,current:old,changed:['lib/audio/a.js']}),[]);
});

test('workflow status needs live matching PR HEAD, path, associated PR and latest attempt',()=>{
  const input={expected:[path],pr:pr()};
  assert.deepEqual(inspectWorkflowRuns({...input,runs:[]}).missing,[path]);
  assert.deepEqual(inspectWorkflowRuns({...input,runs:[run({head_sha:'c'.repeat(40)})]}).missing,[path]);
  assert.deepEqual(inspectWorkflowRuns({...input,runs:[run({pull_requests:[]})]}).missing,[path]);
  assert.deepEqual(inspectWorkflowRuns({...input,runs:[run({status:'in_progress',conclusion:null})]}).pending,[path+':in_progress']);
  assert.deepEqual(inspectWorkflowRuns({...input,runs:[run({id:150}),run({id:151,status:'completed',conclusion:'failure'})]}).failed,[path+':failure']);
  assert.equal(inspectWorkflowRuns({...input,runs:[run({id:150,conclusion:'failure'}),run()]}).passed.length,1);
});

test('immutable run SHA survives GitHub rewriting associated PR head on subsequent pushes',()=>{
  const associated = run({pull_requests:[{number:27,base:{ref:TARGET},head:{sha:'c'.repeat(40)}}]});
  const input = {expected:[path],pr:pr()};
  assert.equal(inspectWorkflowRuns({...input,runs:[associated]}).passed.length,1);
  const wrongBranch=run({head_branch:'unrelated',pull_requests:associated.pull_requests});
  assert.deepEqual(inspectWorkflowRuns({...input,runs:[wrongBranch]}).missing,[path]);
  const wrongRepo=run({head_repository:{full_name:'other/repo'},pull_requests:associated.pull_requests});
  assert.deepEqual(inspectWorkflowRuns({...input,runs:[wrongRepo]}).missing,[path]);
  const wrongNumber=run({pull_requests:[{number:999,base:{ref:TARGET},head:{sha:'c'.repeat(40)}}]});
  assert.deepEqual(inspectWorkflowRuns({...input,runs:[wrongNumber]}).missing,[path]);
  const wrongTarget=run({pull_requests:[{number:27,base:{ref:'other'},head:{sha:'c'.repeat(40)}}]});
  assert.deepEqual(inspectWorkflowRuns({...input,runs:[wrongTarget]}).missing,[path]);
});

test('failed jobless push on current HEAD blocks even when specialist PR check passed',()=>{
  const state=inspectWorkflowRuns({expected:[path],pr:pr(),runs:[run(),run({event:'push',id:300,status:'completed',conclusion:'failure'})]});
  assert.deepEqual(state.pushFailures,['300:failure']);
  assert.equal(state.passed.length,1);
});

test('general conditional jobs may skip only when BASE explicitly makes them optional',()=>{
  const yaml = "on:\n  pull_request:\n    branches: ['codex/public-book-library']\njobs:\n  build:\n    runs-on: ubuntu-latest\n  optional:\n    if: ${{ github.event_name == 'workflow_dispatch' }}\n    runs-on: macos-latest\n  final:\n    if: always()\n    runs-on: ubuntu-latest\n";
  assert.deepEqual(trustedConditionalJobs(yaml),['optional']);
  const pair=[{name:'build',status:'completed',conclusion:'success'},
    {name:'optional',status:'completed',conclusion:'skipped'}];
  assert.equal(inspectJobs(pair,'.github/workflows/any-owner.yml',trustedConditionalJobs(yaml)),1);
  assert.throws(()=>inspectJobs(pair,'.github/workflows/any-owner.yml'),/UNSUCCESSFUL/);
  assert.throws(()=>inspectJobs([{...pair[0],conclusion:'skipped'},pair[1]],'.github/workflows/any-owner.yml',
    trustedConditionalJobs(yaml)),/UNSUCCESSFUL/);
  assert.throws(()=>inspectJobs([pair[0],pair[1],
    {name:'final',status:'completed',conclusion:'skipped'}],'.github/workflows/any-owner.yml',
    trustedConditionalJobs(yaml)),/UNSUCCESSFUL/);
  assert.throws(()=>inspectJobs([pair[1]],'.github/workflows/any-owner.yml',
    trustedConditionalJobs(yaml)),/NO_EXECUTED_REQUIRED/);
  assert.deepEqual(trustedConditionalJobs('jobs:\\n  build:\\n    if: true\\n'),[]);
});
test('only definitively PR-inapplicable BASE jobs can be skipped',()=>{
  const build=guard=>[
    'jobs:','  required:','    runs-on: ubuntu-latest',
    '  optional:','    if: '+guard,'    runs-on: ubuntu-latest',''
  ].join('\n');
  for(const guard of [
    "github.event_name == 'workflow_dispatch'",
    "${{ github.event_name != 'pull_request' }}",
    "${{ github.event_name == 'schedule' && github.ref == 'refs/heads/main' }}",
  ]) assert.deepEqual(trustedConditionalJobs(build(guard)),['optional'],
    'provably non-PR job must not block '+guard);
  for(const guard of [
    "${{ github.event_name == 'pull_request' && github.event.pull_request.draft == false }}",
    "${{ github.event_name == 'workflow_dispatch' || github.event_name == 'pull_request' }}",
    "${{ github.event_name != 'pull_request' || always() }}",
    "${{ success() && github.ref == 'refs/heads/main' }}",
    "${{ !cancelled() }}",
    "${{ startsWith(github.head_ref, 'feat/') }}",
    "${{ always() }}",
    'true','false',
  ]) assert.deepEqual(trustedConditionalJobs(build(guard)),[],
    'conditional job may actually be required on a PR: '+guard);
  const readyJob=[
    {name:'required',status:'completed',conclusion:'success'},
    {name:'optional',status:'completed',conclusion:'skipped'},
  ];
  assert.throws(()=>inspectJobs(readyJob,'.github/workflows/owner.yml',
    trustedConditionalJobs(build("${{ github.event_name == 'pull_request' && github.event.pull_request.draft == false }}"))),
    /UNSUCCESSFUL_SPECIALIST_JOB/);
  assert.equal(inspectJobs(readyJob,'.github/workflows/owner.yml',
    trustedConditionalJobs(build("${{ github.event_name == 'workflow_dispatch' }}"))),1);
});

test('zero jobs, skipped, cancelled and pending jobs cannot pass as completed evidence',()=>{
  assert.throws(()=>inspectJobs([],path),/ZERO_JOB/);
  for(const conclusion of ['skipped','cancelled','failure',null]) {
    assert.throws(()=>inspectJobs([{name:'test',status:'completed',conclusion}],path),/UNSUCCESSFUL/);
  }
  assert.equal(inspectJobs([{name:'first',status:'completed',conclusion:'success'}],path),1);
});

test('end-to-end pure verifier succeeds only after scoped job completion and fresh PR readback',async()=>{
  const sources={base:new Map([[path,yaml]]),current:new Map([[path,yaml]])};
  const ctx={repo,number:27,head:SHA,base:BASE};
  const api={
    pr:async()=>pr(), changed:async()=>[{filename:'lib/crm/a.js'}],
    runs:async()=>[run()],
    jobs:async()=>[{name:'specialist',status:'completed',conclusion:'success'}],
  };
  const good=await verify(api,ctx,sources,{maxWaitMs:0});
  assert.deepEqual(good.expected,[path]);
  assert.deepEqual(good.executed.map(x=>x.jobs),[1]);
  api.jobs=async()=>[];
  await assert.rejects(()=>verify(api,ctx,sources,{maxWaitMs:0}),/ZERO_JOB/);
  api.pr=async()=>({...pr(),draft:true});
  await assert.rejects(()=>verify(api,ctx,sources,{maxWaitMs:0}),/PR_HEAD_BASE_OR_RELEASE_STATE_CHANGED/);
});

test('only BASE/HEAD-applicable PR specialists gate release; unrelated reds are advisory',async()=>{
  const extra='.github/workflows/non-applicable.yml';
  const extraYaml="on:\n  pull_request:\n    paths:\n      - 'lib/audio/**'\n";
  const sources={
    base:new Map([[path,yaml],[extra,extraYaml]]),
    current:new Map([[path,yaml],[extra,extraYaml]]),
  };
  const ctx={repo,number:27,head:SHA,base:BASE};
  const api={
    pr:async()=>pr(),
    changed:async()=>[{filename:'lib/crm/a.js'}],
    runs:async()=>[
      run(),
      run({path:extra,id:752,conclusion:'failure'}),
    ],
    jobs:async()=>[{name:'specialist',status:'completed',conclusion:'success'}],
  };
  const good=await verify(api,ctx,sources,{maxWaitMs:0});
  assert.deepEqual(good.expected,[path]);
  assert.deepEqual(good.advisory.nonApplicable,[extra+':failure']);
  // An unassociated exact-head failure has unknown coverage and must block.
  api.runs=async()=>[run(),run({event:'push',id:753,conclusion:'failure'})];
  await assert.rejects(()=>verify(api,ctx,sources,{maxWaitMs:0}),/SPECIALIST_FAILED:.*push/);
  api.runs=async()=>[run(),run({path:extra,id:754,pull_requests:[],conclusion:'failure'})];
  await assert.rejects(()=>verify(api,ctx,sources,{maxWaitMs:0}),/SPECIALIST_FAILED:.*orphan/);
  api.runs=async()=>[run(),run({path:extra,id:758,status:'in_progress',conclusion:null})];
  assert.deepEqual((await verify(api,ctx,sources,{maxWaitMs:0})).expected,[path]);

  // A workflow absent from BOTH trusted manifests may not be waived.
  // An actual expected specialist failure also remains a hard blocker.
  api.runs=async()=>[run(),run({path:'.github/workflows/unknown.yml',id:760,conclusion:'failure'})];
  await assert.rejects(()=>verify(api,ctx,sources,{maxWaitMs:0}),/SPECIALIST_FAILED:.*unregistered/);
  api.runs=async()=>[run({conclusion:'failure'})];
  await assert.rejects(()=>verify(api,ctx,sources,{maxWaitMs:0}),/SPECIALIST_FAILED/);
});

test('read-only GitHub API adapter paginates files and runs without writing',async()=>{
  const requests=[];
  const transport=async(url,options)=>{requests.push({url,method:options.method||'GET',auth:options.headers.Authorization});
    if(url.includes('/files?')) return {ok:true,json:async()=>[{filename:'lib/crm/a.js'}]};
    if(url.includes('/jobs?')) return {ok:true,json:async()=>({jobs:[{name:'test',status:'completed',conclusion:'success'}]})};
    if(url.includes('/actions/runs?'))return {ok:true,json:async()=>({workflow_runs:[run()]})};
    return {ok:true,json:async()=>pr()};
  };
  const api=githubReader(repo,'fake',transport);
  assert.equal((await api.pr(27)).number,27);
  assert.equal((await api.changed(27))[0].filename,'lib/crm/a.js');
  assert.equal((await api.runs(SHA)).length,1);
  assert.equal((await api.jobs(151)).length,1);
  assert.ok(requests.every(x=>x.method==='GET' && x.auth==='Bearer fake'));
});

test('untrusted/malformed input context is rejected',()=>{
  assert.throws(()=>validateParameters({GITHUB_REPOSITORY:repo,GITHUB_TOKEN:'x',HH_PR_NUMBER:'0',HH_HEAD_SHA:SHA,HH_BASE_SHA:BASE}),/INVALID/);
  assert.deepEqual(validateParameters({GITHUB_REPOSITORY:repo,GITHUB_TOKEN:'x',HH_PR_NUMBER:'27',HH_HEAD_SHA:SHA,HH_BASE_SHA:BASE}),{repo,number:27,head:SHA,base:BASE,token:'x'});
});

test('production workflow directory can be parsed without silently ignoring unknown trigger syntax',()=>{
  const names=readdirSync('.github/workflows').filter(x=>/\.ya?ml$/.test(x));
  assert.ok(names.length >= 25, 'Unexpectedly empty workflow catalog; review approved migrations');
  // 2 Nov 2026 reviewed CI architecture: one scoped language-agent suite was
  // added to the previous 94-workflow production catalog. Preserve the exact
  // ceiling (95), require its dedicated domain tests, and reject future growth.
  assert.ok(names.length <= 95, 'Workflow budget exceeded: reuse an existing domain suite or explicitly review the budget in a CI architecture PR');
  if(names.length > 94){
    assert.ok(names.includes('hh-language-agent.yml'),'Only the reviewed Language Agent may use the 95th workflow slot');
    const language=readFileSync('.github/workflows/hh-language-agent.yml','utf8');
    assert.match(language,/language-contract:/,'Language Agent must retain focused privacy contracts');
    assert.match(language,/typed-ui:/,'Language Agent must retain independent TypeScript check');
    assert.match(language,/holistic-language-agent\\.test\\.mjs/,'Language Agent must retain privacy tests');
    assert.match(language,/npm ci --ignore-scripts/,'Language Agent must retain a pinned dependency install');
  }
  const protectedChecks = ['hh-pr-core-release.yml', 'hh-actionlint.yml', 'hh-pr-sweep-guard.yml',
    'hh-billing-isolated.yml', 'hh-app-r1.yml', 'hh-app-browser.yml', 'ia-v2.yml',
    'hh-interpretation-database.yml', 'hh-ci-stale-run-prune.yml', 'ga4-safety-hold.yml',
    'holistic-house-native.yml'];
  assert.ok(!names.includes('native-ci.yml'), 'Retired duplicate Native CI must not return');
  for(const critical of protectedChecks) assert.ok(names.includes(critical), 'Missing critical workflow: '+critical);
  for(const name of names) {
    const file='.github/workflows/'+name;
    assert.doesNotThrow(()=>parsePrTrigger(readFileSync(file,'utf8'),file),name);
  }
});

test('unexpected real PR failures and unassociated jobless PR runs are never ignored',()=>{
  const other='.github/workflows/unmapped.yml';
  const unrelated=run({path:other,id:752,status:'completed',conclusion:'failure'});
  const state=inspectWorkflowRuns({expected:[path],pr:pr(),runs:[run(),unrelated]});
  assert.deepEqual(state.observedUnrelated,[other+':failure']);
  const missingAssociation=run({id:753,path:other,pull_requests:[],conclusion:'failure'});
  const orphans=inspectWorkflowRuns({expected:[path],pr:pr(),runs:[run(),missingAssociation]});
  assert.deepEqual(orphans.orphanFailures,['753:failure']);
  assert.deepEqual(inspectWorkflowRuns({expected:[path],pr:pr(),runs:[run(),run({path:'.github/workflows/hh-pr-core-release.yml',status:'in_progress',conclusion:null})]}).observedUnrelated,[]);
});


test('reviewed specialist migration delegates only when the BASE-approved replacement already runs unchanged', async () => {
  const old='.github/workflows/hh-crm-event-channels.yml';
  const replacement='.github/workflows/hh-event-referral-contract.yml';
  const oldYaml="on:\n  pull_request:\n    branches: [codex/public-book-library]\n    paths:\n      - 'lib/crm/marketing.js'\n      - '.github/workflows/hh-crm-event-channels.yml'\n";
  const newYaml="on:\n  pull_request:\n    paths:\n      - 'lib/crm/marketing.js'\n      - '.github/workflows/hh-crm-event-channels.yml'\n";
  const base=new Map([[old,oldYaml],[replacement,newYaml]]);
  const current=new Map([[replacement,newYaml]]);
  const changed=['.github/workflows/hh-crm-event-channels.yml'];
  const baselineExpected=expectedWorkflows({base,current,changed});
  assert.deepEqual(baselineExpected,[old,replacement]);
  const prepared=resolveExpectedSpecialists({base,current,changed,expected:baselineExpected});
  assert.deepEqual(prepared.expected,[replacement]);
  assert.deepEqual(prepared.delegated,[{retired:old,replacement}]);
  assert.deepEqual(resolveExpectedSpecialists({base,current:new Map(base),changed,expected:baselineExpected}).expected,[old,replacement]);
  const ctx={repo,number:27,head:SHA,base:BASE};
  const replacementRun=run({id:303,path:replacement});
  const api={
    pr:async()=>pr(),changed:async()=>changed.map(filename=>({filename})),
    runs:async()=>[replacementRun],
    jobs:async()=>[{name:'tracked-handoff-regression',status:'completed',conclusion:'success'}],
  };
  assert.deepEqual((await verify(api,ctx,{base,current},{maxWaitMs:0})).delegated,prepared.delegated);
  api.jobs=async()=>[];
  await assert.rejects(()=>verify(api,ctx,{base,current},{maxWaitMs:0}),/ZERO_JOB/);
  api.jobs=async()=>[{name:'tracked-handoff-regression',status:'completed',conclusion:'failure'}];
  await assert.rejects(()=>verify(api,ctx,{base,current},{maxWaitMs:0}),/UNSUCCESSFUL/);
  api.jobs=async()=>[{name:'tracked-handoff-regression',status:'completed',conclusion:'success'}];
  api.runs=async()=>[replacementRun,{...replacementRun,id:304,path:old,conclusion:'failure'}];
  await assert.rejects(()=>verify(api,ctx,{base,current},{maxWaitMs:0}),/SPECIALIST_FAILED/);
  for (const invalid of [
    new Map([[replacement,newYaml+'\n# altered in PR']]),
    new Map([[replacement,'on:\n  pull_request:\n    paths:\n      - lib/unrelated/**\n']]),
    new Map(),
  ]) assert.throws(()=>resolveExpectedSpecialists({base,current:invalid,changed,expected:baselineExpected}),/UNTRUSTED_SPECIALIST_REPLACEMENT/);
  const wrongHead=run({id:303,path:replacement,head_sha:'c'.repeat(40)});
  api.runs=async()=>[wrongHead];
  await assert.rejects(()=>verify(api,ctx,{base,current},{maxWaitMs:0}),/SPECIALIST_MISSING_OR_PENDING/);
});

test('approved migration destinations contain the exact retired scope and the original evidence tests',()=>{
  const mappings=[
    {
      from:'hh-crm-event-channels.yml',into:'hh-event-referral-contract.yml',
      patterns:["'lib/crm/marketing.js'","'components/app/crm-marketing.jsx'","'lib/organic-event-referrals.js'","'supabase/migrations/*hh_crm_event_channel_sources*.sql'","'tests/crm-event-channel-attribution.test.mjs'","'.github/workflows/hh-crm-event-channels.yml'"],
      contracts:['tests/crm-event-channel-attribution.test.mjs','tests/crm-marketing.test.mjs','tests/organic-event-referrals.test.mjs','tests/gbp-v3-toronto.test.mjs','npx tsc --noEmit'],
    },{
      from:'psychometric-research-catalogue.yml',into:'hh-assessment-quality.yml',
      patterns:["'data/assessments/research-directory-2026/**'","'lib/assessments/research-directory-2026.js'","'lib/assessments/psychometric-validity-2026.js'","'components/app/research-directory.*'","'components/app/test-explorer.jsx'","'tests/psychometric-validity-directory.test.mjs'","'.github/workflows/psychometric-research-catalogue.yml'"],
      contracts:['tests/psychometric-validity-directory.test.mjs','tests/public-test-match-paging.test.mjs','tests/assessment-methodology.test.mjs','tests/test-kinds-catalog-audit.test.mjs','scripts/audit-psychometric-quality-2026.mjs','researchEditionReferences','nonOverlappingResearchReferences'],
    
    },{
      from:'hh-benchmark-free-test-pilot.yml',into:'hh-benchmark-program.yml',
      patterns:['"components/free-entry-landing.tsx"','"components/free-entry-landing.module.css"','"tests/benchmark-free-tests-first-pilot.test.mjs"','".github/workflows/hh-benchmark-free-test-pilot.yml"'],
      contracts:['tests/benchmark-free-tests-first-pilot.test.mjs','tests/free-review-conversion.test.mjs','tests/benchmark-reference-matrix.test.mjs','scripts/benchmarking/plan.mjs'],
    },{
      from:'hh-portrait-sectors.yml',into:'hh-profile-axis-matching.yml',
      patterns:["'components/app/test-explorer-visual.jsx'","'components/app/portrait-test-quick-actions.jsx'","'components/app/portrait-test-quick-actions.module.css'","'lib/profile/portrait-test-suggestions.js'","'tests/portrait-report-actions.test.mjs'","'tests/portrait-sector-take-test.test.mjs'","'components/app/test-explorer.module.css'","'lib/assessments/portrait-sectors.js'","'tests/portrait-sectors.test.mjs'","'tests/portrait-rays-responsive.test.mjs'","'tests/portrait-one-screen-mobile.test.mjs'","'scripts/verify-app-r1.mjs'","'.github/workflows/hh-portrait-sectors.yml'"],
      contracts:['tests/portrait-sectors.test.mjs','tests/portrait-rays-responsive.test.mjs','tests/portrait-ray-labels.test.mjs','tests/psych-portrait.test.mjs','tests/portrait-report-actions.test.mjs','tests/portrait-sector-take-test.test.mjs','tests/portrait-one-screen-mobile.test.mjs','tests/axis-offer-matcher.test.mjs'],
    },{
      from:'cabinet-today-ci.yml',into:'hh-cabinet-journey.yml',
      patterns:["'components/app/cabinet-today.*'","'lib/app/cabinet-today.mjs'","'tests/cabinet-today.test.mjs'","'.github/workflows/cabinet-today-ci.yml'"],
      contracts:['tests/cabinet-today.test.mjs','tests/cabinet-learning-journey.test.mjs','components/app/cabinet-today.jsx','npx --no-install tsc --noEmit'],
    },
  ];
  for(const item of mappings) {
    const successor=readFileSync('.github/workflows/'+item.into,'utf8');
    const trigger=parsePrTrigger(successor,item.into);
    assert.ok(trigger);
    for(const pattern of item.patterns) assert.ok(successor.includes('      - '+pattern), item.into+' missing '+pattern);
    for(const test of item.contracts) assert.ok(successor.includes(test),item.into+' missing '+test);
    if (['hh-crm-event-channels.yml','psychometric-research-catalogue.yml','hh-benchmark-free-test-pilot.yml'].includes(item.from)) {
      assert.ok(successor.includes('push:'),item.into+' must preserve original production push verification');
    }
    assert.ok(!successor.includes('continue-on-error: true'),item.into+' must fail closed');
  }
});

test('all workflow deletions, even push-only and files excluded from original PR trigger, require an approved replacement',()=>{
  const unrelated='.github/workflows/private-push-only-publisher.yml';
  const pushOnly='on:\n  push:\n    branches: [codex/public-book-library]\njobs:\n  publish:\n    runs-on: ubuntu-24.04\n';
  const base=new Map([[unrelated,pushOnly]]);
  const current=new Map();
  const changed=[unrelated];
  const expected=expectedWorkflows({base,current,changed});
  assert.deepEqual(expected,[], 'Push-only workflow is intentionally absent from PR specialist discovery');
  assert.throws(()=>resolveExpectedSpecialists({base,current,changed,expected}),
    /UNAPPROVED_WORKFLOW_DELETION:.*private-push-only-publisher/);
  const old='.github/workflows/unknown-pr-source.yml';
  const prs="on:\n  pull_request:\n    paths:\n      - 'lib/other/**'\n";
  const basemap=new Map([[old,prs]]);
  const changed2=[old];
  const expected2=expectedWorkflows({base:basemap,current:new Map(),changed:changed2});
  assert.deepEqual(expected2,[], 'Old PR filter may not watch its own YAML');
  assert.throws(()=>resolveExpectedSpecialists({base:basemap,current:new Map(),changed:changed2,expected:expected2}),
    /UNAPPROVED_WORKFLOW_DELETION:.*unknown-pr-source/);
});

test('manual-only YAML workflow and .yaml extension cannot be removed without BASE-approved migration',()=>{
  const old='.github/workflows/manual-private-publication.yaml';
  const source='on:\n  workflow_dispatch:\njobs:\n  private-action:\n    runs-on: ubuntu-24.04\n';
  const base=new Map([[old,source]]);
  const proposed=new Map();
  const changed=[old];
  const expected=expectedWorkflows({base,current:proposed,changed});
  assert.deepEqual(expected,[], 'A manual-only workflow never appears in a PR-run inventory');
  assert.throws(()=>resolveExpectedSpecialists({base,current:proposed,changed,expected}),
    /UNAPPROVED_WORKFLOW_DELETION:.*manual-private-publication\.yaml/);
});

test('approved removed YAML still requires unchanged successful successor coverage even when retired PR path filter excludes its own file',()=>{
  const old='.github/workflows/hh-crm-event-channels.yml';
  const successor='.github/workflows/hh-event-referral-contract.yml';
  const oldYaml="on:\n  pull_request:\n    paths:\n      - 'lib/crm/**'\n";
  const successorYaml="on:\n  pull_request:\n    paths:\n      - '.github/workflows/hh-crm-event-channels.yml'\n      - 'lib/crm/**'\n";
  const base=new Map([[old,oldYaml],[successor,successorYaml]]);
  const current=new Map([[successor,successorYaml]]);
  const changed=[old];
  const expected=expectedWorkflows({base,current,changed});
  assert.deepEqual(expected,[successor], 'Old PR workflow never triggered, successor does');
  const reviewed=resolveExpectedSpecialists({base,current,changed,expected});
  assert.deepEqual(reviewed.expected,[successor]);
  assert.deepEqual(reviewed.delegated,[{retired:old,replacement:successor}]);
  const unexpected='.github/workflows/arbitrary-hidden-security.yml';
  const withUnexpected=new Map([...base,[unexpected,"on: [push]\n"]]);
  assert.throws(()=>resolveExpectedSpecialists({base:withUnexpected,current,changed:[old,unexpected],
    expected:expectedWorkflows({base:withUnexpected,current,changed:[old,unexpected]})}),/UNAPPROVED_WORKFLOW_DELETION/);
});

test('wave 3 reviewed About video successor preserves all original PR paths and contracts',()=>{
  const required = [
    {into:'site-video-browser.yml', patterns:["'components/psychic-alchemy-intro-video*'","'app/**/about/page.tsx'","'tests/psychic-alchemy-intro-video.test.mjs'","'lib/site-videos/**'","'components/site-video-*'","'components/page-video.tsx'","'app/admin/videos/**'","'app/site-video*.css'","'tests/site-video*.mjs'","'middleware.ts'","'.github/workflows/holistic-about-video-check.yml'"], contracts:['tests/psychic-alchemy-intro-video.test.mjs','tests/site-videos.test.mjs','tests/site-video-defaults.test.mjs','components/site-video-manager.tsx','npx tsc --noEmit','node scripts/verify-site-video-browser.mjs']},
  ];
  for (const entry of required) {
    const s=readFileSync('.github/workflows/'+entry.into,'utf8');
    const trigger=parsePrTrigger(s,entry.into);
    assert.ok(trigger,'Missing PR trigger '+entry.into);
    for(const pattern of entry.patterns) assert.ok(s.includes('      - '+pattern),entry.into+' missing original path '+pattern);
    for(const contract of entry.contracts) assert.ok(s.includes(contract),entry.into+' missing original contract '+contract);
    assert.ok(s.includes('if [[ "$GITHUB_EVENT_NAME" != "pull_request" || "${GITHUB_BASE_REF:-}" != "codex/public-book-library" ]]; then'),
      'Production video PR reuses Core TypeScript; push/manual retains standalone typecheck');
    assert.ok(!s.includes('continue-on-error: true'),entry.into+' must fail closed');
  }
});


test('package and lockfile routing is exact-base scoped, with unknown changes full-scope', () => {
  const before={name:'books',type:'module',dependencies:{next:'15.0.0'},scripts:{
    'test:monetization':'node --test tests/paypal-personal-payments.test.mjs tests/billing-isolation.test.mjs',
    build:'next build',
  }};
  const after=structuredClone(before);
  after.scripts['test:monetization']=after.scripts['test:monetization'].replace(
    'tests/paypal-personal-payments.test.mjs',
    'tests/paypal-personal-payments.test.mjs tests/wallet-topups.test.mjs',
  );
  const original=JSON.stringify(before), proposed=JSON.stringify(after);
  const changed=['package.json','tests/wallet-topups.test.mjs','lib/wallet/service.js'];
  const impact=classifyPackageImpact({changed,basePackage:original,currentPackage:proposed});
  assert.deepEqual(impact,{mode:'scoped',reason:'ADDITIVE_WALLET_MONETIZATION_TEST',
    workflows:['.github/workflows/hh-billing-isolated.yml']});
  const owner='.github/workflows/hh-billing-isolated.yml';
  const ocean='.github/workflows/holistic-house-ocean-audio.yml';
  const opora='.github/workflows/opora-module-ci.yml';
  const app='.github/workflows/hh-app-r1.yml';
  const workflow=paths=>"on:\n  pull_request:\n    paths:\n"+paths.map(x=>"      - '"+x+"'\n").join('');
  const sources=new Map([
    [owner,workflow(['package.json','lib/billing/**'])],
    [ocean,workflow(['package.json','lib/audio/**'])],
    [opora,workflow(['package.json','data/opora/**'])],
    [app,workflow(['app/api/app/**','lib/app/**'])],
  ]);
  const base=new Map(sources), current=new Map(sources);
  const selected=expectedWorkflows({base,current,changed,packageImpact:impact});
  assert.deepEqual(selected,[owner], 'unrelated package-triggered suites are not REQUIRED by safe script-only update');
  const ownerMissed = new Map(sources);
  ownerMissed.set(owner,workflow(['lib/billing/**']));
  assert.throws(()=>expectedWorkflows({base,current:ownerMissed,changed,packageImpact:impact}),
    /PACKAGE_ROUTE_OWNER_NOT_TRIGGERED/,
    'Candidate path filters cannot silently drop the mandatory Billing specialist');
  assert.throws(()=>expectedWorkflows({base:ownerMissed,current,changed,packageImpact:impact}),
    /PACKAGE_ROUTE_OWNER_NOT_TRIGGERED/,
    'Immutable baseline must also trigger the approved scoped owner');
  assert.deepEqual(expectedWorkflows({base,current,changed}),[owner,ocean,opora],
    'until trusted classifier is deployed, the original full trigger scope remains intact');
  const dependencies=structuredClone(after);
  dependencies.dependencies.next='16.0.0';
  const unsafe=classifyPackageImpact({changed,basePackage:original,currentPackage:JSON.stringify(dependencies)});
  assert.equal(unsafe.mode,'full');
  assert.deepEqual(expectedWorkflows({base,current,changed,packageImpact:unsafe}),[owner,ocean,opora]);
  const lockImpact=classifyPackageImpact({changed:['package-lock.json'],basePackage:original,currentPackage:proposed});
  assert.equal(lockImpact.mode,'full');
  assert.deepEqual(expectedWorkflows({base,current,changed:['package-lock.json'],packageImpact:lockImpact}),
    [owner,ocean,opora], 'unknown transitive lockfile changes fail closed');
  const deleted=structuredClone(after);
  deleted.scripts['test:monetization']='echo success';
  assert.equal(classifyPackageImpact({changed,basePackage:original,currentPackage:JSON.stringify(deleted)}).mode,'full');
  assert.equal(classifyPackageImpact({changed:[...changed,'package-lock.json'],
    basePackage:original,currentPackage:proposed}).mode,'full');
  assert.equal(classifyPackageImpact({changed,basePackage:original,currentPackage:'{broken'}).mode,'full');
  assert.throws(()=>expectedWorkflows({base,current:new Map([...current].filter(([name])=>name!==owner)),
    changed,packageImpact:impact}),/PACKAGE_ROUTE_OWNER_UNAVAILABLE/);
});

test('pinned parser manifests are CI-scoped but all other dependency changes remain full-scope',()=>{
  const read=(filePaths)=>"on:\n  pull_request:\n    paths:\n"+filePaths.map(path=>"      - '"+path+"'\n").join('');
  const billing='.github/workflows/hh-billing-isolated.yml';
  const app='.github/workflows/hh-app-r1.yml';
  const guard='.github/workflows/hh-pr-sweep-guard.yml';
  const source=new Map([
    [billing,read(['package.json','package-lock.json','lib/billing/**'])],
    [app,read(['package.json','package-lock.json','lib/app/**'])],
    [guard,read(['lib/ci/fast-ui-parser/**','lib/ci/specialist-aggregate.mjs'])],
  ]);
  const pinned=[
    'lib/ci/fast-ui-parser/package.json',
    'lib/ci/fast-ui-parser/package-lock.json',
  ];
  const impact=classifyPackageImpact({changed:pinned,basePackage:'{}',currentPackage:'{}'});
  assert.deepEqual(impact,{mode:'none',reason:'ISOLATED_CI_PARSER_MANIFESTS',workflows:[]});
  assert.deepEqual(expectedWorkflows({base:source,current:source,changed:pinned,packageImpact:impact}),
    [guard], 'isolated static CI parser must not require unrelated DB, billing or App R1');
  const mixed=[...pinned,'lib/billing/checkout.js'];
  assert.deepEqual(expectedWorkflows({base:source,current:source,changed:mixed,
    packageImpact:classifyPackageImpact({changed:mixed})}),[billing,guard],
    'a real billing source must still require billing acceptance');
  for(const unsafe of [
    ['package-lock.json',...pinned],
    ['package.json',...pinned],
    ['lib/other/package-lock.json',...pinned],
    ['lib/other/package.json',...pinned],
  ]) {
    const outcome=classifyPackageImpact({changed:unsafe,basePackage:'{}',currentPackage:'{}'});
    assert.equal(outcome.mode,'full','unknown and root dependencies must stay full scope: '+unsafe.join(','));
    const required=expectedWorkflows({base:source,current:source,changed:unsafe,packageImpact:outcome});
    assert.ok(required.includes(billing) && required.includes(app) && required.includes(guard),
      'root/unknown manifest change must retain application specialists');
  }
});

test('Video Studio-only edits run dedicated Mandala real-media acceptance without unrelated Public Services suites',()=>{
  const services='.github/workflows/hh-public-services-production.yml';
  const mandala='.github/workflows/holistic-support-mandala.yml';
  const publicTrigger=parsePrTrigger(readFileSync(services,'utf8'),services);
  const mandalaTrigger=parsePrTrigger(readFileSync(mandala,'utf8'),mandala);
  const videoOnly=[
    'components/mandala-free-video-studio.tsx',
    'components/mandala-video-mobile.module.css',
    'components/mandala-cinematic-director.tsx',
    'components/mandala-cinematic-director.module.css',
    'scripts/verify-holistic-mandala-browser.mjs',
    'tests/mandala-mobile-video-design.test.mjs',
  ];
  assert.equal(matchesTrigger(publicTrigger,videoOnly),false,
    'Public Services must not spend 20 minutes on pure Video Studio changes');
  assert.equal(matchesTrigger(mandalaTrigger,videoOnly),true,
    'Real media browser acceptance is required for video changes');
  assert.equal(matchesTrigger(publicTrigger,['components/holistic-support-mobile.tsx']),true,
    'actual support/service features still require Public Services');
  assert.equal(matchesTrigger(publicTrigger,['components/mandala-free-video-studio.tsx','components/holistic-support-mobile.tsx']),true,
    'mixed public-service changes never evade the service gate');
});

test('fast routing is limited to known public presentation assets and mixed risk is strict', async () => {
  const { classifyReleaseRisk } = await import('../lib/ci/specialist-aggregate.mjs');
  assert.equal(classifyReleaseRisk(['public/images/hero.webp', 'app/[locale]/about/page.module.css']), 'FAST');
  for (const changed of [[], ['app/globals.css', 'supabase/migrations/001.sql'], ['app/api/payment/route.ts'], ['.github/workflows/hh-pr-core-release.yml'], ['lib/unknown.js'], ['app/auth/login.css']]) {
    assert.equal(classifyReleaseRisk(changed), 'STRICT');
  }
});

test('FAST verifies exact HEAD and old names in renames', async () => {
  const ctx={repo,number:27,head:SHA,base:BASE};
  const sources={base:new Map(),current:new Map()};
  let reads=0;
  const api={pr:async()=>{reads++; return pr();}, changed:async()=>[{filename:'app/[locale]/about/page.module.css',status:'modified'}], runs:async()=>[]};
  const result=await verify(api,ctx,sources, {maxWaitMs:0,readSource:()=>'.card { color: red; }'});
  assert.equal(result.risk,'FAST');
  assert.equal(reads,2);
  api.changed=async()=>[{filename:'app/globals.css',previous_filename:'app/api/payment/route.ts'}];
  assert.equal((await verify(api,ctx,sources, {maxWaitMs:0})).risk,'STRICT');
  api.changed=async()=>[{filename:'app/globals.css',status:'renamed'}];
  await assert.rejects(()=>verify(api,ctx,sources, {maxWaitMs:0}),/PR_CHANGED_FILES/);
});

test('presentation changes cannot bypass an applicable private app browser workflow', async () => {
  const browser='.github/workflows/hh-app-browser.yml';
  const workflow=readFileSync(browser,'utf8');
  const sources={base:new Map([[browser,workflow]]),current:new Map([[browser,workflow]])};
  const ctx={repo,number:27,head:SHA,base:BASE};
  const api={pr:async()=>pr(),changed:async()=>[{filename:'components/app/my-progress.module.css'}],runs:async()=>[],jobs:async()=>[{name:'browser',status:'completed',conclusion:'success'}]};
  await assert.rejects(()=>verify(api,ctx,sources,{maxWaitMs:0}),/SPECIALIST_MISSING_OR_PENDING/);
  api.runs=async()=>[run({path:browser,conclusion:'failure'})];
  await assert.rejects(()=>verify(api,ctx,sources,{maxWaitMs:0}),/SPECIALIST_FAILED/);
  api.runs=async()=>[run({path:browser})];
  assert.deepEqual((await verify(api,ctx,sources,{maxWaitMs:0})).expected,[browser]);
});

test('FAST includes dynamic Next.js presentation paths but sensitive or mixed changes remain STRICT', async () => {
  const {classifyReleaseRisk} = await import('../lib/ci/specialist-aggregate.mjs');
  assert.equal(classifyReleaseRisk(['app/[locale]/about/page.module.css']), 'FAST');
  assert.equal(classifyReleaseRisk(['app/[locale]/academy/[[...slug]]/page.module.css']), 'FAST');
  assert.equal(classifyReleaseRisk(['app/[locale]/auth/page.css']), 'STRICT');
  assert.equal(classifyReleaseRisk(['app/../auth/page.css']), 'STRICT');
  assert.equal(classifyReleaseRisk(['app/[locale]/about/page.css','app/api/payment/route.ts']), 'STRICT');
});

test('service and checkout presentation changes keep consent and payment checks', async () => {
  const {classifyReleaseRisk}=await import('../lib/ci/specialist-aggregate.mjs');
  for (const file of [
    'components/commerce/service-cart.module.css',
    'components/taoist-talisman-cart.module.css',
    'components/holistic-support-mobile.module.css',
    'app/[locale]/services/free-situation-review/review.module.css',
    'app/[locale]/holistic-support/holistic-support.module.css',
  ]) assert.equal(classifyReleaseRisk([file]),'STRICT',file);
  assert.equal(classifyReleaseRisk(['app/[locale]/about/page.module.css']),'FAST');
});

test('global CSS affecting the privacy consent banner is strict', async()=>{
  const {classifyReleaseRisk}=await import('../lib/ci/specialist-aggregate.mjs');
  assert.match(readFileSync('app/globals.css','utf8'),/\.analytics-consent/);
  assert.equal(classifyReleaseRisk(['app/globals.css']),'STRICT');
  const security='.github/workflows/release-reaudit.yml';
  const workflow=readFileSync(security,'utf8');
  const sources={base:new Map([[security,workflow]]),current:new Map([[security,workflow]])};
  const api={pr:async()=>pr(),changed:async()=>[{filename:'app/globals.css'}],runs:async()=>[]};
  await assert.rejects(()=>verify(api,{repo,number:27,head:SHA,base:BASE},sources,{maxWaitMs:0}),/SPECIALIST_MISSING_OR_PENDING/);
});

test('checkout CSS blocks on missing billing workflow even when the filename is presentation-only',async()=>{
  const billing='.github/workflows/hh-billing-isolated.yml';
  const workflow=readFileSync(billing,'utf8');
  const sources={base:new Map([[billing,workflow]]),current:new Map([[billing,workflow]])};
  const ctx={repo,number:27,head:SHA,base:BASE};
  const api={pr:async()=>pr(),changed:async()=>[{filename:'components/commerce/service-cart.module.css'}],runs:async()=>[]};
  await assert.rejects(()=>verify(api,ctx,sources,{maxWaitMs:0}),/SPECIALIST_MISSING_OR_PENDING/);
});

test('Google claim CSS requires the CRM auth and claim workflow',async()=>{
  const {classifyReleaseRisk}=await import('../lib/ci/specialist-aggregate.mjs');
  const css='components/free-express-google-claim.module.css';
  const crm='.github/workflows/hh-crm-source-check.yml';
  const workflow=readFileSync(crm,'utf8');
  const sources={base:new Map([[crm,workflow]]),current:new Map([[crm,workflow]])};
  assert.equal(classifyReleaseRisk([css]),'STRICT');
  assert.deepEqual(expectedWorkflows({...sources,changed:[css]}),[crm]);
  const api={pr:async()=>pr(),changed:async()=>[{filename:css}],runs:async()=>[]};
  await assert.rejects(()=>verify(api,{repo,number:27,head:SHA,base:BASE},sources,{maxWaitMs:0}),/SPECIALIST_MISSING_OR_PENDING/);
});

test('private cabinet presentation routes stay STRICT while public styles stay FAST', async () => {
  const {classifyReleaseRisk} = await import('../lib/ci/specialist-aggregate.mjs');
  assert.equal(classifyReleaseRisk(['components/app/crm-messenger.module.css']), 'STRICT');
  assert.equal(classifyReleaseRisk(['app/[locale]/app/messages/messages-page.css']), 'STRICT');
  assert.equal(classifyReleaseRisk(['app/[locale]/client/client-teal.css']), 'STRICT');
  assert.equal(classifyReleaseRisk(['app/[locale]/about/page.module.css']), 'FAST');
});

test('public FAST CSS cannot skip a broadly triggered specialist without a trusted exemption', async () => {
  const broad='.github/workflows/diagnostic.yml';
  const sources={base:new Map([[broad,'on: [pull_request]\n']]),current:new Map([[broad,'on: [pull_request]\n']])};
  const ctx={repo,number:27,head:SHA,base:BASE};
  const api={pr:async()=>pr(),changed:async()=>[{filename:'app/[locale]/about/page.module.css',status:'modified'}],runs:async()=>[]};
  await assert.rejects(()=>verify(api,ctx,sources,{maxWaitMs:0,readSource:()=>'.card { color:red; }'}),/SPECIALIST_MISSING_OR_PENDING/);
});

test('client progress owner is complete before the trusted second-phase deletion', () => {
  const old='.github/workflows/hh-client-report-progress.yml';
  const owner='.github/workflows/hh-reports-development-program.yml';
  assert.equal(APPROVED_SPECIALIST_REPLACEMENTS[old],owner);
  const source=readFileSync(owner,'utf8');
  for (const required of [
    "      - 'lib/clients/session-delivery-service.js'",
    "      - 'lib/documents/report-progress.js'",
    "      - 'components/prescription-document.jsx'",
    "      - 'components/admin-session-studio.jsx'",
    "      - 'tests/client-report-before-after-rings.test.mjs'",
    "      - 'tests/report-progress-before-after.test.mjs'",
    "      - 'tests/session-publication-review.test.mjs'",
    "      - '.github/workflows/hh-client-report-progress.yml'",
    'tests/report-progress-before-after.test.mjs tests/client-report-before-after-rings.test.mjs tests/session-publication-review.test.mjs',
    'node --conditions=react-server --test',
    'npm run build',
    '  workflow_dispatch:',
  ]) assert.ok(source.includes(required), 'Replacement lost original evidence or trigger: ' + required);
  assert.ok(source.includes("branches: ['codex/reports-development-program-20261017', 'codex/public-book-library']"), 'Post-merge report verification remains');
  const oldSource="on:\n  pull_request:\n    branches: [codex/public-book-library]\n    paths:\n      - '.github/workflows/hh-client-report-progress.yml'\n";
  const base=new Map([[old,oldSource],[owner,source]]);
  const current=new Map([[owner,source]]);
  const changed=[old];
  const expected=expectedWorkflows({base,current,changed});
  assert.deepEqual(expected,[old,owner]);
  assert.deepEqual(resolveExpectedSpecialists({base,current,changed,expected}),{
    expected:[owner],delegated:[{retired:old,replacement:owner}],
  });
  assert.throws(()=>resolveExpectedSpecialists({
    base,current:new Map([[owner,source+'\n# untrusted owner update']]),changed,expected,
  }),/UNTRUSTED_SPECIALIST_REPLACEMENT/);
});

test('PR cleanup specialist accepts only its successful policy and intentionally skipped push-only job', () => {
  const name = '.github/workflows/hh-ci-stale-run-prune.yml';
  const policy = { name: 'policy', status: 'completed', conclusion: 'success' };
  const pushOnly = { name: 'prune', status: 'completed', conclusion: 'skipped' };
  assert.equal(inspectJobs([policy, pushOnly], name), 2);
  for (const jobs of [
    [pushOnly], [policy], [policy, { ...pushOnly, conclusion: 'failure' }],
    [{ ...policy, conclusion: 'skipped' }, pushOnly],
    [policy, pushOnly, { name: 'unexpected', status: 'completed', conclusion: 'skipped' }],
  ]) assert.throws(() => inspectJobs(jobs, name));
  assert.throws(() => inspectJobs([policy, pushOnly], '.github/workflows/other.yml'));
});

test('Toronto browser owner retains BASE-trusted retirement mapping after deletion', () => {
  const oldName='.github/workflows/hh-public-journey-toronto-wave2.yml';
  const replacement='.github/workflows/hh-public-journey-wave1.yml';
  assert.equal(APPROVED_SPECIALIST_REPLACEMENTS[oldName],replacement);
  assert.equal(readdirSync('.github/workflows').includes('hh-public-journey-toronto-wave2.yml'), false, 'Old Toronto workflow must be absent');
  const old="on:\n  pull_request:\n    branches: [codex/public-book-library]\n    paths:\n      - '.github/workflows/hh-public-journey-toronto-wave2.yml'\n";
  const source=readFileSync(replacement,'utf8');
  for (const expected of [
    'node scripts/verify-public-pathway-mobile.mjs',
    'node scripts/verify-public-pathway-toronto-mobile.mjs',
    'tests/public-pathway-migration.test.mjs',
    'tests/public-pathway-toronto.test.mjs',
    'Build exact candidate once for both real-browser suites',
    'playwright install --with-deps chromium webkit',
    'Whole-project TypeScript outside protected production PRs',
    'HH_RUN_WAVE1',
    'HH_RUN_WAVE2',
  ]) assert.ok(source.includes(expected), 'Consolidated successor lost original acceptance: '+expected);
  // Production no longer routes deletions for an already retired YAML file.
  // Reconstruct the historical trusted successor only for the synthetic
  // BASE-migration proof; never require that obsolete trigger in live CI.
  assert.ok(!source.includes("'.github/workflows/hh-public-journey-toronto-wave2.yml'"));
  const historicalSource = source.replace(
    "      - '.github/workflows/hh-public-journey-wave1.yml'",
    "      - '.github/workflows/hh-public-journey-toronto-wave2.yml'\n      - '.github/workflows/hh-public-journey-wave1.yml'",
  );
  assert.notEqual(historicalSource,source);
  const base=new Map([[oldName,old],[replacement,historicalSource]]);
  const changed=[oldName];
  const current=new Map([[replacement,historicalSource]]);
  const expected=expectedWorkflows({base,current,changed});
  assert.ok(expected.includes(oldName), 'Old workflow still expected from immutable base');
  assert.ok(expected.includes(replacement), 'Verified owner must actually trigger on old YAML deletion');
  assert.deepEqual(resolveExpectedSpecialists({base,current,changed,expected}).delegated,[
    {retired:oldName,replacement},
  ]);
  assert.throws(()=>resolveExpectedSpecialists({base,current:new Map([[replacement,historicalSource+'\\n# tampered']]),changed,expected}),
    /UNTRUSTED_SPECIALIST_REPLACEMENT/, 'Modified successor must never approve retirement');
});

test('public FAST CSS cannot skip an explicitly applicable specialist', async () => {
  const owner = '.github/workflows/public-owner.yml';
  const workflow = "on:\n  pull_request:\n    paths:\n      - 'app/[[]locale[]]/about/**'\n";
  const sources = { base: new Map([[owner, workflow]]), current: new Map([[owner, workflow]]) };
  const ctx = { repo, number: 27, head: SHA, base: BASE };
  const api = { pr: async () => pr(), changed: async () => [{ filename: 'app/[locale]/about/page.module.css' }], runs: async () => [] };
  await assert.rejects(() => verify(api, ctx, sources, { maxWaitMs: 0 }), /SPECIALIST_MISSING_OR_PENDING/);
});

test('base advances fail closed while matching tested checkout retains HEAD checks', async () => {
  const ctx = { repo, number: 27, head: SHA, base: BASE };
  const sources = { base: new Map([[path, yaml]]), current: new Map([[path, yaml]]),
    changedRows: [{ filename: 'lib/crm/a.js', status: 'modified' }] };
  const currentPr = () => ({ ...pr(), base: { ...pr().base, sha: 'c'.repeat(40) } });
  const api = { pr: async () => currentPr(), changed: async () => { throw Error('live diff must not replace tested checkout'); },
    runs: async () => [run()], jobs: async () => [{ name: 'specialist', status: 'completed', conclusion: 'success' }] };
  await assert.rejects(() => verify(api, ctx, sources, { maxWaitMs: 0 }), /PR_HEAD_BASE_OR_RELEASE_STATE_CHANGED/);
  api.pr = async () => pr();
  assert.deepEqual((await verify(api, ctx, sources, { maxWaitMs: 0 })).expected, [path]);
  let reads = 0;
  api.pr = async () => (++reads === 1 ? pr() : currentPr());
  await assert.rejects(() => verify(api, ctx, sources, { maxWaitMs: 0 }), /PR_HEAD_BASE_OR_RELEASE_STATE_CHANGED/, 'base may not advance during specialist aggregation');
  api.pr = async () => currentPr();
  const legacySources = { base: sources.base, current: sources.current };
  await assert.rejects(() => verify(api, ctx, legacySources, { maxWaitMs: 0 }), /PR_HEAD_BASE_OR_RELEASE_STATE_CHANGED/);
  api.pr = async () => ({ ...currentPr(), head: { ...currentPr().head, sha: 'd'.repeat(40) } });
  await assert.rejects(() => verify(api, ctx, sources, { maxWaitMs: 0 }), /PR_HEAD_BASE_OR_RELEASE_STATE_CHANGED/);
  api.pr = async () => ({ ...currentPr(), base: { ...currentPr().base, ref: 'other' } });
  await assert.rejects(() => verify(api, ctx, sources, { maxWaitMs: 0 }), /PR_HEAD_BASE_OR_RELEASE_STATE_CHANGED/);
});

function virtualSpecialistClock() {
  let elapsed = 0;
  const waits = [];
  return {
    now: () => elapsed,
    sleep: async millis => {
      assert.ok(millis > 0 && millis <= 30_000, 'poll is bounded');
      elapsed += millis;
      waits.push(millis);
    },
    elapsed: () => elapsed,
    waits,
  };
}

test('absent required workflow fails in one minute even while another specialist is running', async () => {
  const second = '.github/workflows/another-required.yml';
  const workflows = new Map([[path, yaml], [second, yaml]]);
  const clock = virtualSpecialistClock();
  const ctx = { repo, number: 27, head: SHA, base: BASE };
  const api = {
    pr: async () => pr(),
    changed: async () => [{ filename: 'lib/crm/a.js' }],
    runs: async () => [run({ status: 'in_progress', conclusion: null })],
    jobs: async () => { throw Error('pending jobs must not be accepted'); },
  };
  await assert.rejects(
    () => verify(api, ctx, { base: workflows, current: workflows },
      { maxWaitMs: 35*60_000, missingGraceMs: 60_000, pollMs: 20_000, ...clock }),
    error => /SPECIALIST_MISSING_OR_PENDING:NOT_TRIGGERED/.test(error.message) && error.message.includes(second)
  );
  assert.equal(clock.elapsed(), 60_000);
});

test('late discovery then queue then real completion is accepted with successful jobs', async () => {
  const clock = virtualSpecialistClock();
  let polls = 0;
  const api = {
    pr: async () => pr(),
    changed: async () => [{ filename: 'lib/crm/a.js' }],
    runs: async () => {
      polls++;
      if (polls <= 2) return [];
      if (polls <= 4) return [run({ status: 'queued', conclusion: null })];
      if (polls <= 6) return [run({ status: 'in_progress', conclusion: null })];
      return [run()];
    },
    jobs: async () => [{ name: 'specialist', status: 'completed', conclusion: 'success' }],
  };
  const result = await verify(api, { repo, number: 27, head: SHA, base: BASE },
    { base: new Map([[path, yaml]]), current: new Map([[path, yaml]]) },
    { maxWaitMs: 35*60_000, pollMs: 10_000, ...clock });
  assert.equal(result.executed.length, 1);
  assert.equal(polls, 7);
  assert.ok(clock.elapsed() < 60_000 + 180_000);
});

test('registered but never started queued specialist fails promptly and cannot merge', async () => {
  const clock = virtualSpecialistClock();
  const api = {
    pr: async () => pr(),
    changed: async () => [{ filename: 'lib/crm/a.js' }],
    runs: async () => [run({ status: 'queued', conclusion: null })],
  };
  await assert.rejects(() => verify(api, { repo, number: 27, head: SHA, base: BASE },
    { base: new Map([[path, yaml]]), current: new Map([[path, yaml]]) },
    { maxWaitMs: 35*60_000, queuedGraceMs: 180_000, pollMs: 20_000, ...clock }),
  /SPECIALIST_MISSING_OR_PENDING:NOT_STARTED/);
  assert.equal(clock.elapsed(), 180_000);
});

test('actually running specialist can finish past discovery and queue deadlines', async () => {
  const clock = virtualSpecialistClock();
  const api = {
    pr: async () => pr(),
    changed: async () => [{ filename: 'lib/crm/a.js' }],
    runs: async () => [clock.elapsed() >= 220_000 ? run() : run({ status: 'in_progress', conclusion: null })],
    jobs: async () => [{ name: 'specialist', status: 'completed', conclusion: 'success' }],
  };
  const result = await verify(api, { repo, number: 27, head: SHA, base: BASE },
    { base: new Map([[path, yaml]]), current: new Map([[path, yaml]]) },
    { maxWaitMs: 35*60_000, pollMs: 20_000, ...clock });
  assert.equal(result.executed.length, 1);
  assert.ok(clock.elapsed() >= 220_000);
});

test('unfinished running specialist times out and failed/cancelled runs never pass', async () => {
  const clock = virtualSpecialistClock();
  const api = {
    pr: async () => pr(),
    changed: async () => [{ filename: 'lib/crm/a.js' }],
    runs: async () => [run({ status: 'in_progress', conclusion: null })],
  };
  const sources = { base: new Map([[path, yaml]]), current: new Map([[path, yaml]]) };
  const ctx = { repo, number: 27, head: SHA, base: BASE };
  await assert.rejects(() => verify(api, ctx, sources,
    { maxWaitMs: 200_000, pollMs: 20_000, ...clock }), /SPECIALIST_MISSING_OR_PENDING:RUNNING_TIMEOUT/);
  assert.equal(clock.elapsed(), 200_000);
  for (const conclusion of ['failure', 'cancelled', 'skipped', 'timed_out']) {
    api.runs = async () => [run({ status: 'completed', conclusion })];
    await assert.rejects(() => verify(api, ctx, sources, { maxWaitMs: 0, ...clock }), /SPECIALIST_FAILED/);
  }
});

test('FAST public CSS does not wait for unchanged unrelated browsers; changed and security workflows stay mandatory',async()=>{
  const diagnostic='.github/workflows/hh-public-services-production.yml';
  const workflow='on: [pull_request]\n';
  const sources={base:new Map([[diagnostic,workflow]]),current:new Map([[diagnostic,workflow]])};
  const ctx={repo,number:27,head:SHA,base:BASE};
  const api={pr:async()=>pr(),changed:async()=>[{filename:'app/[locale]/about/page.module.css',status:'modified'}],runs:async()=>[run({path:diagnostic,conclusion:'failure'})]};
  const options={maxWaitMs:0,readSource:()=>'.card { color:red; }'};
  const good=await verify(api,ctx,sources,options);
  assert.equal(good.risk,'FAST');
  assert.deepEqual(good.expected,[]);
  assert.ok(good.advisory.nonApplicable.some(x=>x.includes(diagnostic)));
  const changedWorkflow={base:new Map([[diagnostic,workflow]]),current:new Map([[diagnostic,workflow+'# changed\n']])};
  await assert.rejects(()=>verify(api,ctx,changedWorkflow,options),/SPECIALIST_FAILED/);
  const billing='.github/workflows/hh-billing-isolated.yml';
  const security={base:new Map([[billing,workflow]]),current:new Map([[billing,workflow]])};
  api.runs=async()=>[run({path:billing,conclusion:'failure'})];
  await assert.rejects(()=>verify(api,ctx,security,options),/SPECIALIST_FAILED/);
  api.changed=async()=>[{filename:'app/api/auth/route.ts',status:'modified'}];
  api.runs=async()=>[run({path:diagnostic,conclusion:'failure'})];
  await assert.rejects(()=>verify(api,ctx,sources,options),/SPECIALIST_FAILED/);
});

test('installation guidance and consent surfaces cannot be FAST CSS',async()=>{
  const {classifyReleaseRisk}=await import('../lib/ci/specialist-aggregate.mjs');
  for(const f of ['app/[locale]/install/install.module.css','app/[locale]/contact/page.module.css','app/[locale]/events/[eventId]/event-detail.module.css']) {
    assert.equal(classifyReleaseRisk([f]),'STRICT',f);
  }
  assert.equal(classifyReleaseRisk(['app/[locale]/about/page.module.css']),'FAST');
  assert.equal(classifyReleaseRisk(['app/[locale]/about/page.css']),'STRICT');
});

test('Native installer successor claims old native triggers before retiring duplicate macOS/Android CI', () => {
  const old='.github/workflows/native-ci.yml';
  const replacement='.github/workflows/holistic-house-native.yml';
  assert.equal(APPROVED_SPECIALIST_REPLACEMENTS[old], replacement);
  const source=readFileSync(replacement,'utf8');
  for(const required of ["'capacitor.config.json'","'components/native-**'",
    "'package.json'","'package-lock.json'","'.github/workflows/native-ci.yml'",
    'node --test tests/holistic-house-native-build.test.mjs',
    'npm run native:check',
    'tests/native-private-message-push.test.mjs',
    'workflow_dispatch:',"branches: ['codex/public-book-library']"]) {
    assert.ok(source.includes(required), 'native successor missing coverage '+required);
  }
  assert.ok(source.includes("  native-current-contracts:"), 'source contracts owner missing');
  assert.match(source, /^  android-test-installer:/m);
  assert.match(source, /^  ios-simulator:/m);
  assert.ok(!source.includes('continue-on-error: true'), 'do not hide errors');
  // Specialist aggregator requires successful PR jobs; a deliberately
  // lightweight delegation step keeps both jobs green without running builds.
  const android=source.slice(source.indexOf('  android-test-installer:'),source.indexOf('  ios-simulator:'));
  const ios=source.slice(source.indexOf('  ios-simulator:'));
  for (const section of [android,ios]) {
    assert.ok(section.includes("if: ${{ github.event_name != 'pull_request' || github.event.pull_request.draft == false }}"));
    const entries=section.split('\n      - ').slice(1);
    assert.ok(entries.length >= 17, 'expected full set of native steps');
    assert.ok(entries[0].includes('Verify delegated lightweight PR native coverage'));
    for (const entry of entries.slice(1)) {
      const condition = entry.match(/^\s*if:\s*(.+)$/m)?.[1].trim();
      assert.ok([
        "${{ github.event_name != 'pull_request' }}",
        "${{ always() && github.event_name != 'pull_request' }}",
        "${{ github.event_name == 'workflow_dispatch' }}",
      ].includes(condition),
        'native build step must never execute on ordinary PR: '+entry.slice(0,110));
    }
  }
});


test('stage 2 retiring duplicate native CI routes to the immutable-base successor',()=>{
  const retired='.github/workflows/native-ci.yml';
  const successor='.github/workflows/holistic-house-native.yml';
  assert.ok(!readdirSync('.github/workflows').includes('native-ci.yml'),
    'the duplicate native macOS/Android workflow is gone');
  const original="on:\n  pull_request:\n    paths:\n      - '.github/workflows/native-ci.yml'\n";
  const currentSource=readFileSync(successor,'utf8');
  // Simulate a trusted production BASE that still has native-ci.yml and
  // the identical already-shipped Holistic House Native successor.
  const base=new Map([[retired,original],[successor,currentSource]]);
  const current=new Map([[successor,currentSource]]);
  const changed=[retired];
  const expected=expectedWorkflows({base,current,changed});
  assert.deepEqual(expected,[successor,retired].sort());
  assert.deepEqual(resolveExpectedSpecialists({base,current,changed,expected}),{
    expected:[successor],
    delegated:[{retired,replacement:successor}],
  });
});

test('Tantra Photo Cards has an approved BASE-trusted Reiki owner for phase-2 retirement',()=>{
  const old='.github/workflows/hh-tantra-photo-levels.yml';
  const successor='.github/workflows/hh-reiki-all-slides-browser.yml';
  assert.equal(APPROVED_SPECIALIST_REPLACEMENTS[old],successor);
  const owner=readFileSync(successor,'utf8');
  for(const path of ['components/tantra-reiki-journey.tsx','components/tantra-reiki-story.tsx',
    'components/academy-record-page.tsx','app/academy.css',
    'tests/tantra-reiki-compact-fullwidth.test.mjs',
    'tests/tantra-reiki-photo-levels.browser.mjs',
    'tests/tantra-reiki-teacher-compact.test.mjs',
    '.github/workflows/hh-tantra-photo-levels.yml']){
    assert.ok(owner.includes("      - '"+path+"'"),'Reiki owner missing original trigger '+path);
  }
  for(const original of ['tests/tantra-reiki-photographic-landing.test.mjs',
    'tests/tantra-reiki-level-one-focus.test.mjs','tests/tantra-reiki-mobile-chapters.test.mjs',
    'npx --no-install eslint components/tantra-reiki-journey.tsx']){
    assert.ok(owner.includes(original),'Reiki owner missing test '+original);
  }
  const legacy="on:\n  pull_request:\n    branches: ['codex/public-book-library']\n    paths:\n      - '.github/workflows/hh-tantra-photo-levels.yml'\n";
  const trusted=new Map([[old,legacy],[successor,owner]]);
  const proposed=new Map([[successor,owner]]);
  const changed=[old];
  const expected=expectedWorkflows({base:trusted,current:proposed,changed});
  assert.deepEqual(expected,[successor,old].sort());
  assert.deepEqual(resolveExpectedSpecialists({base:trusted,current:proposed,changed,expected}).delegated,
    [{retired:old,replacement:successor}]);
  assert.throws(()=>resolveExpectedSpecialists({base:trusted,current:new Map([[successor,owner+'\n# changed in retirement']]),changed,expected}),
    /UNTRUSTED_SPECIALIST_REPLACEMENT/);
});


// Exact-Merge specialist discovery is the single source of truth for PR impact.
// Shared auth/DB/checkout remain owned by Core, IA, App Browser and Billing.
test('Messenger-only PRs skip unrelated specialist workflow dispatch without skipping safety and E2E', () => {
  const root = '.github/workflows/';
  const all = new Map(readdirSync(root).filter(f => /\.ya?ml$/.test(f)).map(f =>
    [root + f, readFileSync(root + f, 'utf8')]));
  const changed = [
    'components/app/messages-simple-inbox.jsx',
    'components/app/messages-orders-clients.module.css',
    'components/app/messages-hub.jsx',
    'app/api/app/direct-messages/route.js',
    'lib/app/direct-message-push.js',
    'tests/messages-inbox-unified.test.mjs',
  ];
  const applicable = expectedWorkflows({base: all, current: all, changed});
  const present = name => applicable.includes(root + name + '.yml');
  for (const specialistName of [
    'hh-course-presets','practice-visual-browser','practice-visual-services',
    'hh-public-services-production','site-video-browser','hh-personal-coaching-session',
    'hh-interpretation-database','hh-my-progress-release','hh-public-test-collections',
    'hh-portrait-mobile-browser','hh-profile-axis-matching','hh-cabinet-journey',
  ]) assert.equal(present(specialistName), false, 'Messenger must not dispatch ' + specialistName);
  for (const owner of [
    'hh-app-r1','hh-app-browser','ia-v2','hh-crm-source-check',
    'hh-messenger-mobile-release','hh-messages-wellness-v2','hh-messages-wellness-browser',
  ]) assert.equal(present(owner), true, 'Messenger needs ' + owner);
  const core = parsePrTrigger(all.get(root + 'hh-pr-core-release.yml'));
  assert.ok(matchesTrigger(core, changed), 'Core remains unconditionally required');

  // Unlike a direct Messenger route, the shared API dispatcher must retain
  // all product/security owners of its exact source.
  const shared = expectedWorkflows({base: all, current: all, changed:[
    'app/api/app/[...path]/route.js',
  ]});
  for (const owner of [
    'hh-course-presets','hh-cabinet-journey','hh-public-services-production',
    'site-video-browser','hh-personal-coaching-session','hh-interpretation-database',
    'practice-visual-browser','practice-visual-services','ia-v2','hh-app-r1','hh-app-browser',
  ]) assert.ok(shared.includes(root + owner + '.yml'), 'Shared API router must retain ' + owner);

  // Shared router scope must not drag Messenger's separate API paths into
  // Course, Editor and Video suites, even though a one-segment glob is used.
  for (const isolated of [
    'app/api/app/direct-messages/route.js',
    'app/api/app/practitioner-client-messages/route.js',
    'app/api/app/notification-channels/route.js',
  ]) {
    const scoped = expectedWorkflows({base:all,current:all,changed:[isolated]});
    for (const unrelated of [
      'hh-course-presets','hh-cabinet-journey','hh-public-services-production',
      'site-video-browser','hh-personal-coaching-session','hh-interpretation-database',
      'practice-visual-browser','practice-visual-services',
    ]) assert.ok(!scoped.includes(root + unrelated + '.yml'),
      isolated + ' must not dispatch ' + unrelated);
  }

  const changedShell = ['components/app/app-workspace.jsx'];
  const shellRuns = expectedWorkflows({base: all, current: all, changed:changedShell});
  for (const owner of ['hh-app-r1','hh-app-browser','ia-v2']) {
    assert.ok(shellRuns.includes(root + owner + '.yml'), 'Shared shell stays covered by ' + owner);
  }
  for (const unrelated of ['hh-course-presets','practice-visual-browser','practice-visual-services',
    'hh-my-progress-release','hh-public-test-collections','hh-cabinet-journey']) {
    assert.ok(!shellRuns.includes(root + unrelated + '.yml'), 'Shared shell should not fan out ' + unrelated);
  }

  const sensitive = expectedWorkflows({base: all, current: all, changed:[
    'app/api/payments/checkout/route.js',
    'supabase/migrations/20261101_app_private_message_policy.sql',
  ]});
  for (const owner of ['hh-billing-isolated','ia-v2','hh-app-r1','hh-app-browser']) {
    assert.ok(sensitive.includes(root + owner + '.yml'), 'Sensitive change must retain ' + owner);
  }
  // Each specialist still owns actual edits to its own module.
  for (const [owner, file] of [
    ['hh-course-presets','components/app/my-course.jsx'],
    ['practice-visual-browser','components/practice-showcase.jsx'],
    ['practice-visual-services','components/app/simple-service-editor.jsx'],
    ['site-video-browser','components/site-video-manager.tsx'],
    ['hh-public-services-production','components/contact-channel-chooser.tsx'],
    ['hh-interpretation-database','lib/interpretation/engine.js'],
    ['hh-cabinet-journey','components/app/cabinet-today.jsx'],
  ]) assert.ok(matchesTrigger(parsePrTrigger(all.get(root + owner + '.yml')), [file]),
    'Own-module change must retain specialist ' + owner);
});


test('production-base drift is allowed only for complete, verified independent documentation changes', () => {
  const base = 'a'.repeat(40), live = 'b'.repeat(40), other = 'c'.repeat(40);
  const compare = files => ({
    status:'ahead', ahead_by:2, behind_by:0, total_commits:2,
    base_commit:{sha:base}, merge_base_commit:{sha:base},
    commits:[{sha:other},{sha:live}], files:files.map(filename=>({filename,status:'modified'})),
  });
  assert.equal(safeDocumentationAdvance(compare(['docs/guides/intro.md']),base,live,['app/api/voice/route.ts']),true);
  const forbidden = [
    'docs/operations/CI_RELEASE_POLICY.md','docs/security/overview.md','docs/billing/overview.md',
    'docs/guides/secret-rotation.md','.github/workflows/core.yml','components/mandala.tsx',
    'package-lock.json','docs/../api.md',
  ];
  for (const filename of forbidden) {
    assert.equal(safeDocumentationAdvance(compare([filename]),base,live,['app/api/voice/route.ts']),false,filename);
  }
  assert.equal(safeDocumentationAdvance(compare(['docs/guides/intro.md']),base,live,['docs/guides/intro.md']),false);
  assert.equal(safeDocumentationAdvance({...compare(['docs/x.md']),status:'diverged'},base,live,[]),false);
  assert.equal(safeDocumentationAdvance({...compare(['docs/x.md']),merge_base_commit:{sha:other}},base,live,[]),false);
  assert.equal(safeDocumentationAdvance({...compare(['docs/x.md']),commits:[{sha:other},{sha:other}]},base,live,[]),false);
  assert.equal(safeDocumentationAdvance({...compare(['docs/x.md']),commits:[{sha:live}]},base,live,[]),false);
  assert.equal(safeDocumentationAdvance({...compare(['docs/x.md']),total_commits:3},base,live,[]),false);
  assert.equal(safeDocumentationAdvance({...compare(['docs/x.md']),behind_by:1},base,live,[]),false);
  assert.equal(safeDocumentationAdvance({...compare(['docs/x.md']),ahead_by:100,total_commits:100,commits:Array(100).fill({sha:live})},base,live,[]),false);
  assert.equal(safeDocumentationAdvance({...compare(['docs/x.md']),files:Array(100).fill({filename:'docs/x.md',status:'modified'})},base,live,[]),false);
  assert.equal(safeDocumentationAdvance(compare(['docs/x.md']),base,base,[]),false);
  assert.equal(safeDocumentationAdvance({...compare(['docs/x.md']),files:[{filename:'docs/x.md',status:'removed'}]},base,live,[]),false);
});

test('Only BASE-guarded optional Mandala macOS skip is neutral; real failures stay blocking', () => {
  const path = '.github/workflows/holistic-support-mandala.yml';
  const workflow = "on:\n  pull_request:\n    paths: ['components/mandala-*']\njobs:\n  focused-unit-types-build:\n    runs-on: ubuntu-latest\n  voice-webkit-macos:\n    if: ${{ github.event_name == 'pull_request' && github.event.pull_request.draft == false && (startsWith(github.head_ref, 'codex/voice-studio-') || startsWith(github.head_ref, 'fix/video-')) }}\n    runs-on: macos-15\n";
  const files = {base:new Map([[path,workflow]]),current:new Map([[path,workflow]])};
  const ui = ['components/mandala-free-video-studio.tsx','scripts/verify-holistic-mandala-browser.mjs'];
  assert.equal(optionalMandalaMacosSkip(files,'codex/perf-video-studio-lazy-panels-20261101',ui),true);
  assert.equal(optionalMandalaMacosSkip(files,'codex/hypno-third-workspace-owner-v2-20261101',ui),true);
  assert.equal(optionalMandalaMacosSkip(files,'fix/video-studio-restore-approved-mobile-20261101',ui),false);
  assert.equal(optionalMandalaMacosSkip(files,'codex/perf-video-studio-lazy-panels-20261101',['scripts/verify-affirmation-voice-browser.mjs']),false);
  // A route/glob-only Mandala change is NOT a change to the BASE macOS job.
  const updatedPaths = workflow.replace("paths: ['components/mandala-*']",
    "paths: ['components/mandala-*', 'tests/video-chat-*.test.mjs']");
  assert.equal(optionalMandalaMacosSkip(
    {...files,current:new Map([[path,updatedPaths]])},
    'codex/ci-general-release-fastlane-20261101',[path,'tests/ci-specialist-aggregate.test.mjs']),true);
  // PR-authored edits to macOS conditions or platform cannot self-certify.
  for (const changedJob of [
    updatedPaths.replace('runs-on: macos-15','runs-on: macos-14'),
    updatedPaths.replace("startsWith(github.head_ref, 'fix/video-')",
      "startsWith(github.head_ref, 'ci/')"),
    updatedPaths.replace('  voice-webkit-macos:', '  voice-webkit-macos:\n    timeout-minutes: 1'),
  ]) assert.equal(optionalMandalaMacosSkip(
    {...files,current:new Map([[path,changedJob]])},
    'codex/ci-general-release-fastlane-20261101',[path]),false);
  for(const critical of [
    'lib/mandala/recording-codecs.mjs',
    'lib/mandala/webcodecs-mp4-export.ts',
    'lib/mandala/audio-render.mjs',
    'app/api/holistic-support/voice/route.js',
  ]) assert.equal(optionalMandalaMacosSkip(
    {...files,current:new Map([[path,updatedPaths]])},
    'codex/ci-general-release-fastlane-20261101',[path,critical]),false);
  assert.equal(optionalMandalaMacosSkip(
    {...files,current:new Map([[path,updatedPaths]])},
    'fix/video-source-clock-parity-20261101',[path]),false);
  assert.equal(optionalMandalaMacosSkip({...files,current:new Map([[path,workflow+'# modified']])},'codex/perf-video-studio-lazy-panels-20261101',ui),false);
  const jobs = [{name:'focused-unit-types-build',status:'completed',conclusion:'success'},
    {name:'voice-webkit-macos',status:'completed',conclusion:'skipped'}];
  assert.throws(()=>inspectJobs(jobs,path),/UNSUCCESSFUL_SPECIALIST_JOB/);
  assert.equal(inspectJobs(jobs,path,['voice-webkit-macos']),1);
  assert.throws(()=>inspectJobs([{...jobs[0],conclusion:'skipped'},jobs[1]],path,['voice-webkit-macos']),/UNSUCCESSFUL_SPECIALIST_JOB/);
  assert.throws(()=>inspectJobs([{...jobs[0],conclusion:'failure'},jobs[1]],path,['voice-webkit-macos']),/UNSUCCESSFUL_SPECIALIST_JOB/);
});

test('VideoProjectV2 source changes require real macOS WebKit acceptance on video feature PRs', () => {
  const path = '.github/workflows/holistic-support-mandala.yml';
  const actual = readFileSync(path, 'utf8');
  const guard = actual.match(/^  voice-webkit-macos:\n    if: \$\{\{ (.+) \}\}$/m)?.[1];
  assert.ok(guard, 'Real macOS WebKit job guard must remain intact');
  assert.ok(guard.includes("startsWith(github.head_ref, 'feat/video-')"),
    'Video feature branches must route into genuine macOS encoded movie acceptance');
  assert.ok(guard.includes("github.event.pull_request.draft == false"));
  assert.match(actual,/voice-webkit-macos:[\s\S]*?runs-on: macos-15/);
  assert.match(actual,/HH_LIVE_VIDEO_ENGINE=webkit/);
  assert.match(actual,/scripts\/benchmarking\/first-video-live-export\.mjs/);
  const changed = [
    'lib/mandala/render-plan-v2.mjs',
    'lib/mandala/video-project-v2.mjs',
    'lib/mandala/video-executable-director.mjs',
    'tests/render-plan-v2.test.mjs',
    'tests/video-project-v2.test.mjs',
    path,
  ];
  const files = {base:new Map([[path,actual]]),current:new Map([[path,actual]])};
  assert.equal(optionalMandalaMacosSkip(
    files,'feat/video-studio-project-renderplan-v2-20261102',changed),false,
    'A video render plan must not be incorrectly excused from real WebKit acceptance');
});

test('signed APK code routes through Native without dragging unrelated public services browsers',()=>{
  const services='.github/workflows/hh-public-services-production.yml';
  const native='.github/workflows/holistic-house-native.yml';
  const svcTrigger=parsePrTrigger(readFileSync(services,'utf8'),services);
  const nativeTrigger=parsePrTrigger(readFileSync(native,'utf8'),native);
  const testPath='tests/holistic-house-play-release.test.mjs';
  const actualApkPrFiles=[
    testPath,
    '.github/workflows/holistic-house-native.yml',
    '.github/workflows/holistic-house-play-aab.yml',
    'scripts/prepare-holistic-house-play-release.mjs',
    'scripts/verify-hh-direct-apk-candidate.mjs'
  ];
  assert.equal(matchesTrigger(svcTrigger,[testPath]),false,
    'Signing-only unit test must not invoke unrelated Services browser matrix');
  assert.equal(matchesTrigger(svcTrigger,actualApkPrFiles),false,
    'APK pipeline must not trigger public checkout and Alchemy browser suites');
  assert.equal(matchesTrigger(nativeTrigger,actualApkPrFiles),true,
    'The existing native workflow change retains its full Native security owner');
  for(const path of [
    'components/holistic-support-mobile.tsx',
    'components/commerce/personal-cart.module.css',
    'components/contact-channel-chooser.tsx',
    'app/api/payments/route.ts',
    'app/api/app/[...path]/route.js',
  ]){
    assert.equal(matchesTrigger(svcTrigger,[path]),true,
      'Real public-service and sensitive changes remain browser protected: '+path);
    assert.equal(matchesTrigger(svcTrigger,[...actualApkPrFiles,path]),true,
      'APK mixed with a public-service change must retain full browser QA: '+path);
  }
  const sources=new Map([[services,readFileSync(services,'utf8')],[native,readFileSync(native,'utf8')]]);
  const owners=expectedWorkflows({base:sources,current:sources,changed:actualApkPrFiles});
  assert.ok(owners.includes(native),'Native owner must remain mandatory');
  assert.ok(!owners.includes(services),'Services browser must not be required for standalone APK');
});

test('Mandala macOS branch-gated skip is wired into exact-head specialist verify without weakening true failures', async () => {
  const mandalaPath = '.github/workflows/holistic-support-mandala.yml';
  const mandala = [
    'on:',
    '  pull_request:',
    "    branches: ['codex/public-book-library']",
    "    paths: ['tests/ci-*', 'lib/mandala/**']",
    'jobs:',
    '  focused-unit-types-build:',
    '    runs-on: ubuntu-latest',
    '  voice-webkit-macos:',
    "    if: \${{ github.event_name == 'pull_request' && github.event.pull_request.draft == false && (startsWith(github.head_ref, 'codex/voice-studio-') || startsWith(github.head_ref, 'fix/video-')) }}",
    '    runs-on: macos-15',
    '',
  ].join('\n');
  const focused = {name:'focused-unit-types-build',status:'completed',conclusion:'success'};
  const mac = {name:'voice-webkit-macos',status:'completed',conclusion:'skipped'};
  const ctx = {repo,number:27,head:SHA,base:BASE};
  const check = ({branch='ci/retire-old-status',changed=['tests/ci-specialist-aggregate.test.mjs'],
     candidate=mandala,jobRows=[focused,mac]}={}) => {
    const p = pr();
    p.head.ref = branch;
    const api = {
      pr: async () => p,
      runs: async () => [run({path:mandalaPath,head_branch:branch})],
      jobs: async () => jobRows,
    };
    const files = {
      base:new Map([[mandalaPath,mandala]]),
      current:new Map([[mandalaPath,candidate]]),
      changedRows:changed.map(filename => ({filename,status:'modified'})),
    };
    return verify(api,ctx,files,{maxWaitMs:0});
  };
  const safe = await check();
  assert.deepEqual(safe.executed.map(row => row.jobs),[1],
    'BASE-validated branch-excluded macOS may skip while focused Linux passes');
  for (const scenario of [
    {branch:'fix/video-encoder-change'},
    {changed:['tests/ci-specialist-aggregate.test.mjs','lib/mandala/webcodecs-mp4-export.ts']},
    {candidate:mandala.replace('runs-on: macos-15','runs-on: macos-14')},
    {candidate:mandala.replace("startsWith(github.head_ref, 'fix/video-')","startsWith(github.head_ref, 'ci/')")},
    {jobRows:[{...focused,conclusion:'failure'},mac]},
    {jobRows:[focused,{...mac,conclusion:'failure'}]},
  ]) await assert.rejects(check(scenario),/UNSUCCESSFUL_SPECIALIST_JOB/,
    'all untrusted or failed jobs remain release-blocking');
});
