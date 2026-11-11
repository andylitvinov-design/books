'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');
const {assessBaseFreshness:assess}=require('../scripts/ci-pr-base-freshness.cjs');
const classify=rows=>rows.some(r=>r.status!=='M'||/^(?:\.github\/|scripts\/ci-|lib\/billing\/|package-lock\.json|misc\/)/.test(r.filename))?'FULL':'CORE';
async function assessBaseFreshness(args){const branch=(await args.github.rest.repos.getBranch()).data;return assess({classifierBase:branch.commit.sha,decideRoute:classify,...args});}
const old='a'.repeat(40),head='b'.repeat(40);const pr={number:2868,base:{sha:old},changed_files:1};
const api=(path,status='modified',previous)=>({rest:{repos:{getBranch:async()=>({data:{commit:{sha:head}}})},pulls:{listFiles:async()=>({data:[{filename:path,status,...(previous?{previous_filename:previous}:{})}]})}}});
test('sensitive CI changes require CI against current production base',async()=>{
 assert.equal((await assessBaseFreshness({github:api('.github/workflows/gate.yml'),owner:'o',repo:'r',pr})).reason,'SENSITIVE_BASE_STALE');
});

test('current exact Core run base beats stale PR metadata without rerunning source tests',async()=>{
 const result=await assessBaseFreshness({
  github:api('.github/workflows/gate.yml'),owner:'o',repo:'r',pr,
  verifiedRunBase:head,
 });
 assert.equal(result.ok,true);
 assert.equal(result.reason,'SENSITIVE_BASE_VERIFIED');
});

test('only immutable isolated CI policy can reuse completed Core across narrow public-media source advance',async()=>{
 const files=['components/mandala-free-video-studio.tsx',
  'lib/mandala/free-film-source-loader.mjs',
  'tests/free-film-source-loader.test.mjs',
  'docs/MYTUBE_CAPCUT_TECHNOLOGY_PARITY_2026-11-04.md'];
 const diff=paths=>({
  status:'ahead',ahead_by:1,behind_by:0,total_commits:1,
  base_commit:{sha:old},merge_base_commit:{sha:old},
  commits:[{sha:head}],
  files:paths.map(filename=>({filename,status:'modified'})),
 });
 const github=api('scripts/ci-specialist-aggregate.mjs');
 let calls=0;
 github.rest.repos.compareCommits=async args=>{
  calls++;assert.equal(args.base,old);assert.equal(args.head,head);
  return {data:diff(files)};
 };
 const checked=await assessBaseFreshness({
  github,owner:'o',repo:'r',pr,verifiedRunBase:old,
 });
 assert.equal(checked.ok,true);
 assert.equal(checked.reason,'ISOLATED_CI_PUBLIC_MEDIA_REVALIDATED');
 assert.equal(calls,1,'one targeted read-only compare, no source rerun');
 for(const path of [
  '.github/workflows/core.yml','app/api/auth/route.ts',
  'lib/ci/specialist-aggregate.mjs','package-lock.json',
  'components/mandala-private-token.tsx',
  'lib/mandala/payment-provider.mjs'
 ]){
  github.rest.repos.compareCommits=async()=>({data:diff([path])});
  const bad=await assessBaseFreshness({github,owner:'o',repo:'r',pr,verifiedRunBase:old});
  assert.equal(bad.reason,'SENSITIVE_COMPARE_UNSAFE',path);
 }
 github.rest.repos.compareCommits=async()=>({data:{...diff(files),status:'diverged'}});
 assert.equal((await assessBaseFreshness({github,owner:'o',repo:'r',pr,verifiedRunBase:old})).ok,false);
});

test('ordinary documentation can stay behind without needless branch sync',async()=>{
 assert.equal((await assessBaseFreshness({github:api('docs/help.md'),owner:'o',repo:'r',pr})).ok,true);
});
test('renamed sensitive files and incomplete inventories fail closed',async()=>{
 assert.equal((await assessBaseFreshness({github:api('docs/moved.md','renamed','scripts/ci-check.cjs'),owner:'o',repo:'r',pr})).ok,false);
 assert.equal((await assessBaseFreshness({github:api('docs/readme.md'),owner:'o',repo:'r',pr:{...pr,changed_files:2}})).reason,'FILES_INCOMPLETE');
});
test('a current PR base cannot substitute for the base of the CI run',async()=>{
 const currentPr={...pr,base:{sha:head}};
 assert.equal((await assessBaseFreshness({github:api('.github/workflows/gate.yml'),owner:'o',repo:'r',pr:currentPr,verifiedRunBase:old})).reason,'SENSITIVE_CI_BASE_STALE');
 assert.equal((await assessBaseFreshness({github:api('.github/workflows/gate.yml'),owner:'o',repo:'r',pr:currentPr})).reason,'SENSITIVE_CI_BASE_UNVERIFIED');
});
test('accepts CI base only from the matching Core run and suite',()=>{
 const {coreRunBase}=require('../scripts/ci-pr-base-freshness.cjs');
 const p={...pr,head:{ref:'fix',sha:'c'.repeat(40)}};
 const run={id:4,event:'pull_request',name:'HH PR core release gate',path:'.github/workflows/hh-pr-core-release.yml',status:'completed',conclusion:'success',check_suite_id:55,repository:{full_name:'o/r'},head_repository:{full_name:'o/r'},head_branch:'fix',pull_requests:[{number:p.number,head:{sha:p.head.sha,ref:'fix'},base:{ref:'codex/public-book-library',sha:old}}]};
 assert.equal(coreRunBase(run,p,'o/r',55),old);
 assert.equal(coreRunBase({...run,check_suite_id:56},p,'o/r',55),null);
 assert.equal(coreRunBase({...run,pull_requests:[]},p,'o/r',55),null);
});
test('hourly verifier rejects external or malformed CI job URLs',async()=>{
 const {coreRunBaseForCheck}=require('../scripts/ci-pr-base-freshness.cjs');let called=0;
 const github={rest:{actions:{getWorkflowRun:async()=>{called++;throw Error('unexpected')}}}};
 assert.equal(await coreRunBaseForCheck({github,owner:'o',repo:'r',pr,check:{details_url:'https://attacker.test/o/r/actions/runs/42/job/5',check_suite:{id:55}}}),null);
 assert.equal(called,0);
});
test('hourly verifier binds the Core job to its original run',async()=>{
 const {coreRunBaseForCheck}=require('../scripts/ci-pr-base-freshness.cjs');
 const p={...pr,head:{ref:'fix',sha:'c'.repeat(40)}};
 const run={id:42,event:'pull_request',name:'HH PR core release gate',path:'.github/workflows/hh-pr-core-release.yml',status:'completed',conclusion:'success',check_suite_id:55,repository:{full_name:'o/r'},head_repository:{full_name:'o/r'},head_branch:'fix',pull_requests:[{number:p.number,head:{sha:p.head.sha,ref:'fix'},base:{ref:'codex/public-book-library',sha:old}}]};
 const github={rest:{actions:{getWorkflowRun:async()=>({data:run}),getJobForWorkflowRun:async()=>({data:{id:5,run_id:42,name:'hh-merge-check',status:'completed',conclusion:'success',check_run_url:'https://api.github.com/repos/o/r/check-runs/5'}})}}};
 assert.equal(await coreRunBaseForCheck({github,owner:'o',repo:'r',pr:p,check:{id:5,name:'hh-merge-check',app:{id:15368,slug:'github-actions'},details_url:'https://github.com/o/r/actions/runs/42/job/5',check_suite:{id:55}}}),old);
});
test('the observed #2868 CI base predates current production',async()=>{
 const p={number:2868,base:{sha:'66f05429167887a7171cd7086a0138fa0b654c80'},changed_files:8};
 const github={rest:{repos:{getBranch:async()=>({data:{commit:{sha:'4be387c4453f140e99e9654db660a9067c00cfa8'}}})},pulls:{listFiles:async()=>({data:['.github/workflows/hh-ci-stale-run-prune.yml','.github/workflows/hh-pr-sweep-guard.yml','lib/ci/pr-sweep-guard.mjs','lib/ci/required-gate-policy.mjs','scripts/pr-sweep-guard.mjs','tests/ci-heavy-draft-policy.test.mjs','tests/pr-sweep-guard.test.mjs','tests/required-gate-policy.test.mjs'].map(filename=>({filename,status:'modified'}))})}}};
 assert.equal((await assessBaseFreshness({github,owner:'andylitvinov-design',repo:'books',pr:p,verifiedRunBase:p.base.sha})).reason,'SENSITIVE_BASE_STALE');
});
test('unknown code and authentication dependencies are never assumed safe',async()=>{
 for(const path of ['misc/card.tsx','lib/billing/stripe-provider.js','package-lock.json']){
  const result=await assessBaseFreshness({github:api(path),owner:'o',repo:'r',pr});
  assert.equal(result.reason,'SENSITIVE_BASE_STALE',path);
 }
});
test('uses the production-pinned classifier without blocking ordinary code solely for being behind',async()=>{
 let seen;
 const decideRoute=rows=>(seen=rows,'CORE');
 const result=await assessBaseFreshness({github:api('components/card.tsx'),owner:'o',repo:'r',pr,classifierBase:head,decideRoute});
 assert.equal(result.ok,true);assert.equal(seen[0].status,'M');
 const changed=await assessBaseFreshness({github:api('components/card.tsx'),owner:'o',repo:'r',pr,classifierBase:old,decideRoute});
 assert.equal(changed.reason,'CLASSIFIER_BASE_STALE');
});
test('a production base that moves during classification fails closed',async()=>{
 let calls=0;const github=api('docs/help.md');
 github.rest.repos.getBranch=async()=>({data:{commit:{sha:++calls===1?head:old}}});
 const result=await assess({github,owner:'o',repo:'r',pr,classifierBase:head,decideRoute:()=> 'CORE'});
 assert.equal(result.reason,'BASE_MOVED_DURING_CHECK');
});

test('hourly coordinator recovers trusted Core base if GH drops PR association',async()=>{
 const {coreRunBaseForCheck}=require('../scripts/ci-pr-base-freshness.cjs');
 const base='9e84af6e730328ab34099f97b98cb14211bc08af';
 const head='e165aeb024da0d08d8631768bf6494e31d9d737e';
 const p={number:4303,head:{ref:'codex/reasoning-mind-20261110',sha:head}};
 const run={id:42922287638,event:'pull_request',name:'HH PR core release gate',
   path:'.github/workflows/hh-pr-core-release.yml',
   status:'completed',conclusion:'success',check_suite_id:116243651946,
   head_sha:head,head_branch:p.head.ref,
   repository:{full_name:'andylitvinov-design/books'},
   head_repository:{full_name:'andylitvinov-design/books'},pull_requests:[]};
 const check={id:12345,name:'hh-merge-check',app:{id:15368,slug:'github-actions'},
   details_url:'https://github.com/andylitvinov-design/books/actions/runs/42922287638/job/99',
   check_suite:{id:116243651946}};
 const jobs=[
  {id:1,run_id:run.id,name:'core-lint-types-build',status:'completed',conclusion:'success',
   steps:[{name:'Verify bounded shallow scope ancestry before PR routing',
    status:'completed',conclusion:'success'}]},
  {id:2,run_id:run.id,name:'hh-specialist',status:'completed',conclusion:'success'},
  {id:99,run_id:run.id,name:'hh-merge-check',status:'completed',conclusion:'success'}
 ];
 const logs='2026-11-10T23:19:40.0000000Z Verify bounded shallow scope ancestry before PR routing\n'+
  '2026-11-10T23:19:47.4471074Z   HH_TESTED_BASE_VERIFIED: '+base+'\n';
 let logCalls=0,jobPages=0;
 const github={rest:{actions:{
  getJobForWorkflowRun:async()=>({data:{id:99,run_id:run.id,name:'hh-merge-check',
   status:'completed',conclusion:'success',
   check_run_url:'https://api.github.com/repos/andylitvinov-design/books/check-runs/12345'}}),
  getWorkflowRun:async()=>({data:run}),
  listJobsForWorkflowRun:async()=>{jobPages++;return {data:{total_count:jobs.length,jobs}};}
 }}};
 const fetcher=async()=>{logCalls++;return {ok:true,
   headers:{get:()=>String(logs.length)},text:async()=>logs};};
 const args={github,owner:'andylitvinov-design',repo:'books',pr:p,
   check,rows:[{status:'M',filename:'lib/ai/reasoning-mind.ts'}],
   token:'test-only-token',fetcher};
 assert.equal(await coreRunBaseForCheck(args),base);
 assert.equal(jobPages,1);
 assert.equal(logCalls,1);
 // Changed workflow paths and forged/partial evidence can NEVER verify a base.
 assert.equal(await coreRunBaseForCheck({...args,
  rows:[{status:'M',filename:'.github/workflows/hh-pr-core-release.yml'}]}),null);
 assert.equal(await coreRunBaseForCheck({...args,token:null}),null);
 assert.equal(await coreRunBaseForCheck({...args,
  pr:{...p,head:{...p.head,sha:'f'.repeat(40)}}}),null);
 assert.equal(await coreRunBaseForCheck({...args,
  check:{...check,app:{id:11,slug:'untrusted'}}}),null);
 assert.equal(await coreRunBaseForCheck({...args,github:{rest:{actions:{
  ...github.rest.actions,listJobsForWorkflowRun:async()=>({data:{total_count:4,jobs}})
 }}}}),null);
 assert.equal(logCalls,1,'no unauthorised runner-log read');
});
test('hourly Core-base fallback uses existing GitHub token and no scheduled work',()=>{
 const hourly=require('node:fs').readFileSync('.github/workflows/hh-pr-full-inventory.yml','utf8');
 assert.match(hourly,/HH_CORE_BASE_TOKEN: \$\{\{ github\.token \}\}/);
 assert.equal((hourly.match(/verifiedRunBase:rows=>baseEvidence\.coreRunBaseForCheck/g)||[]).length,2);
 assert.equal((hourly.match(/token:process\.env\.HH_CORE_BASE_TOKEN/g)||[]).length,2);
});
