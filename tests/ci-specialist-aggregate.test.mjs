import assert from 'node:assert/strict';
import test from 'node:test';
import { readdirSync, readFileSync } from 'node:fs';
import {
  TARGET, parsePrTrigger, matchesTrigger, classifyPackageImpact, expectedWorkflows, resolveExpectedSpecialists, inspectWorkflowRuns,
  inspectJobs, validateParameters,
} from '../lib/ci/specialist-aggregate.mjs';
import { verify, githubReader } from '../scripts/ci-specialist-aggregate.mjs';

const repo='andylitvinov-design/books', SHA='a'.repeat(40), BASE='b'.repeat(40);
const pr=()=>({number:27,state:'open',draft:false,head:{sha:SHA,ref:'feat/test',repo:{full_name:repo}},base:{sha:BASE,ref:TARGET,repo:{full_name:repo}}});
const path='.github/workflows/messenger.yml';
const yaml="on:\n  pull_request:\n    branches: ['codex/public-book-library']\n    paths:\n      - 'lib/crm/**'\n      - '!lib/crm/private/**'\n      - 'lib/crm/private/approved.mjs'\n  push:\n    branches: [main]\npermissions:\n  contents: read\njobs:\n  test:\n    runs-on: ubuntu-24.04\n";
const run=(overrides={})=>({id:151,workflow_id:30,path,head_sha:SHA,head_branch:'feat/test',event:'pull_request',status:'completed',conclusion:'success',run_attempt:1,head_repository:{full_name:repo},pull_requests:[{number:27,head:{sha:SHA},base:{ref:TARGET}}],...overrides});

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

test('failed jobless push on current HEAD blocks even when specialist PR check passed',()=>{
  const state=inspectWorkflowRuns({expected:[path],pr:pr(),runs:[run(),run({event:'push',id:300,status:'completed',conclusion:'failure'})]});
  assert.deepEqual(state.pushFailures,['300:failure']);
  assert.equal(state.passed.length,1);
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
  assert.ok(names.length <= 90, 'Workflow budget exceeded: reuse an existing domain suite or explicitly review the budget in a CI architecture PR');
  const protectedChecks = ['hh-pr-core-release.yml', 'hh-actionlint.yml', 'hh-pr-sweep-guard.yml',
    'hh-billing-isolated.yml', 'hh-app-r1.yml', 'hh-app-browser.yml', 'ia-v2.yml',
    'hh-interpretation-database.yml', 'hh-ci-stale-run-prune.yml', 'ga4-safety-hold.yml',
    'holistic-house-native.yml', 'native-ci.yml'];
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
      patterns:["'components/app/test-explorer-visual.jsx'","'components/app/app-workspace.jsx'","'components/app/portrait-test-quick-actions.jsx'","'components/app/portrait-test-quick-actions.module.css'","'lib/profile/portrait-test-suggestions.js'","'tests/portrait-report-actions.test.mjs'","'tests/portrait-sector-take-test.test.mjs'","'components/app/test-explorer.module.css'","'lib/assessments/portrait-sectors.js'","'tests/portrait-sectors.test.mjs'","'tests/portrait-rays-responsive.test.mjs'","'tests/portrait-one-screen-mobile.test.mjs'","'scripts/verify-app-r1.mjs'","'.github/workflows/hh-portrait-sectors.yml'"],
      contracts:['tests/portrait-sectors.test.mjs','tests/portrait-rays-responsive.test.mjs','tests/portrait-ray-labels.test.mjs','tests/psych-portrait.test.mjs','tests/portrait-report-actions.test.mjs','tests/portrait-sector-take-test.test.mjs','tests/portrait-one-screen-mobile.test.mjs','tests/axis-offer-matcher.test.mjs'],
    },{
      from:'cabinet-today-ci.yml',into:'hh-cabinet-journey.yml',
      patterns:["'components/app/cabinet-today.*'","'components/app/app-workspace.jsx'","'lib/app/cabinet-today.mjs'","'tests/cabinet-today.test.mjs'","'.github/workflows/cabinet-today-ci.yml'"],
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
