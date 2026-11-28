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


test('AutoMerge accepts verified independent raster target advances without HEAD sync',async()=>{
 const mock=api('lib/billing/stripe-provider.js');
 const comparison=(filename,overrides={})=>({
  status:'ahead',ahead_by:1,behind_by:0,total_commits:1,
  base_commit:{sha:old},merge_base_commit:{sha:old},
  commits:[{sha:head}],files:[{filename,status:'modified'}],...overrides,
 });
 let count=0;
 mock.rest.repos.compareCommits=async ({base,head:target})=>{
   assert.equal(base,old);assert.equal(target,head);count++;
   return {data:comparison('public/images/new-master.webp')};
 };
 const options={github:mock,owner:'o',repo:'r',pr:{...pr,mergeable:true},verifiedRunBase:old};
 const allowed=await assessBaseFreshness(options);
 assert.equal(allowed.ok,true);
 assert.equal(allowed.reason,'INDEPENDENT_PUBLIC_RASTER_REVALIDATED');
 assert.equal(count,1);
 for(const filename of ['public/images/bad.svg','.github/workflows/core.yml',
   'app/api/checkout/route.ts','supabase/migrations/0001.sql','package-lock.json']){
   mock.rest.repos.compareCommits=async()=>({data:comparison(filename)});
   assert.equal((await assessBaseFreshness(options)).reason,'SENSITIVE_COMPARE_UNSAFE',filename);
 }
 mock.rest.repos.compareCommits=async()=>({data:comparison('public/images/banner.png')});
 assert.equal((await assessBaseFreshness({...options,pr:{...pr,mergeable:null}})).reason,'SENSITIVE_COMPARE_UNSAFE');
 mock.rest.repos.compareCommits=async()=>({data:comparison('public/images/banner.png',{status:'diverged'})});
 assert.equal((await assessBaseFreshness(options)).reason,'SENSITIVE_COMPARE_UNSAFE');
});


test('AutoMerge shares immutable production Specialist non-runtime BASE exceptions',async()=>{
 const diff=(filename,opts={})=>({
   status:'ahead',ahead_by:1,behind_by:0,total_commits:1,
   base_commit:{sha:old},merge_base_commit:{sha:old},
   commits:[{sha:head}],files:[{filename,status:'modified'}],...opts
 });
 const github=api('lib/billing/stripe-provider.js');
 let current=diff('docs/examples/basic-guide.md');
 github.rest.repos.compareCommits=async ({base,target,head:destination})=>{
   assert.equal(base,old);assert.equal(destination,head);
   return {data:current};
 };
 let proofs=0;
 const policy={
   safeDocumentationAdvance:(comparison,expected,live,paths)=>{
     proofs++;
     assert.equal(expected,old);assert.equal(live,head);
     assert.deepEqual(paths,['lib/billing/stripe-provider.js']);
     return comparison.status==='ahead'&&comparison.base_commit.sha===old&&
       comparison.merge_base_commit.sha===old&&comparison.behind_by===0&&
       comparison.commits.length===1&&comparison.commits[0].sha===head&&
       comparison.files.length===1&&
       comparison.files[0].filename==='docs/examples/basic-guide.md'&&
       comparison.files[0].status==='modified';
   },
   safeIndependentCiMaintenanceAdvance:comparison=>comparison.files.length===1&&
     comparison.files[0].filename==='tests/pr-fast-lane.test.mjs'&&
     comparison.status==='ahead'&&comparison.commits.at(-1)?.sha===head,
   verifiedIndependentPublicRasterAdvance:()=>false
 };
 const options={github,owner:'o',repo:'r',pr:{...pr,mergeable:true},
   verifiedRunBase:old,baseAdvancePolicy:policy};
 const docs=await assessBaseFreshness(options);
 assert.equal(docs.ok,true);assert.equal(docs.reason,'INDEPENDENT_DOCS_BASE_REVALIDATED');
 assert.equal(proofs,1);
 current=diff('tests/pr-fast-lane.test.mjs');
 const maintenance=await assessBaseFreshness(options);
 assert.equal(maintenance.reason,'INDEPENDENT_CI_MAINTENANCE_REVALIDATED');
 current=diff('app/api/payment/route.ts');
 const runtime=await assessBaseFreshness(options);
 assert.equal(runtime.ok,false);assert.equal(runtime.reason,'SENSITIVE_COMPARE_UNSAFE');
 current=diff('docs/examples/basic-guide.md',{status:'diverged'});
 assert.equal((await assessBaseFreshness(options)).reason,'SENSITIVE_COMPARE_UNSAFE');
 current=diff('docs/examples/basic-guide.md',{files:[{filename:'docs/examples/basic-guide.md',status:'removed'}]});
 assert.equal((await assessBaseFreshness(options)).reason,'SENSITIVE_COMPARE_UNSAFE');
 assert.equal((await assessBaseFreshness({...options,
   baseAdvancePolicy:{safeDocumentationAdvance:()=>true}})).reason,'TRUSTED_BASE_ADVANCE_POLICY_INCOMPLETE');
 assert.equal((await assessBaseFreshness({...options,
   baseAdvancePolicy:{...policy,safeDocumentationAdvance:()=>{throw Error('bad policy')}}})).reason,
   'SENSITIVE_COMPARE_UNSAFE');
});
test('trusted production-base policy is loaded from the same pinned SHA and missing policy cannot waive a gate',()=>{
 const s=require('node:fs').readFileSync('scripts/ci-pr-base-freshness.cjs','utf8');
 const workflow=require('node:fs').readFileSync('.github/workflows/hh-native-auto-merge.yml','utf8');
 assert.ok(s.includes("path.join(dir,'lib/ci/production-base-impact.mjs')"));
 assert.ok(s.includes("impactUrl.searchParams.set('sha',classifierBase)"));
 assert.ok(s.includes("throw Error('PROTECTED_BASE_ADVANCE_POLICY_UNAVAILABLE')"));
 assert.ok(workflow.includes("'SENSITIVE_COMPARE_UNSAFE'].includes(freshness.reason)"));
 for(const signal of ['INDEPENDENT_DOCS_BASE_REVALIDATED',
   'INDEPENDENT_CI_MAINTENANCE_REVALIDATED',
   'INDEPENDENT_PUBLIC_PRESENTATION_REVALIDATED',
   'DISJOINT_PUBLIC_SOURCE_REVALIDATED',
   'TRUSTED_POLICY_BASE_REVALIDATED',
   'INDEPENDENT_QA_BASE_REVALIDATED',
   'INDEPENDENT_DOMAIN_TEST_BASE_REVALIDATED'])
   assert.ok(workflow.includes('freshness.reason==="'+signal+'"'));
});

test('native AutoMerge reuses independent public-page checks only with trusted policy and true mergeability',async()=>{
 const comparison={status:'ahead',ahead_by:1,behind_by:0,total_commits:1,
   base_commit:{sha:old},merge_base_commit:{sha:old},
   commits:[{sha:head}],files:[{filename:'app/[locale]/about/page.tsx',status:'modified'}]};
 const github=api('lib/billing/stripe-provider.js');
 github.rest.repos.compareCommits=async()=>({data:comparison});
 let proofCalls=0;
 const policy={
   safeDocumentationAdvance:()=>false,
   safeIndependentCiMaintenanceAdvance:()=>false,
   verifiedIndependentPublicRasterAdvance:()=>false,
   safeIndependentPublicPresentationAdvance:(diff,base,live,paths)=>{
     proofCalls++;
     return base===old&&live===head&&paths.length===1&&
       paths[0]==='lib/billing/stripe-provider.js'&&diff.status==='ahead'&&
       diff.base_commit?.sha===old&&diff.merge_base_commit?.sha===old&&
       diff.behind_by===0&&diff.commits?.length===1&&
       diff.commits[0].sha===head&&diff.files?.length===1&&
       diff.files[0].status==='modified'&&
       diff.files[0].filename==='app/[locale]/about/page.tsx';
   },
 };
 const opts={github,owner:'o',repo:'r',pr:{...pr,mergeable:true},
   verifiedRunBase:old,baseAdvancePolicy:policy};
 const accepted=await assessBaseFreshness(opts);
 assert.equal(accepted.ok,true);
 assert.equal(accepted.reason,'INDEPENDENT_PUBLIC_PRESENTATION_REVALIDATED');
 assert.equal(proofCalls,1);
 for(const mergeable of [false,null])
   assert.equal((await assessBaseFreshness({...opts,pr:{...pr,mergeable}})).reason,
     'SENSITIVE_COMPARE_UNSAFE','conflict/unknown mergeability must block reuse');
 assert.equal((await assessBaseFreshness({...opts,baseAdvancePolicy:{
   safeDocumentationAdvance:()=>false,safeIndependentCiMaintenanceAdvance:()=>false,
   verifiedIndependentPublicRasterAdvance:()=>false}})).reason,
   'SENSITIVE_COMPARE_UNSAFE','old protected production without helper stays strict');
 github.rest.repos.compareCommits=async()=>({data:{...comparison,status:'diverged'}});
 assert.equal((await assessBaseFreshness(opts)).reason,'SENSITIVE_COMPARE_UNSAFE');
});

test('native AutoMerge reuses successful Specialist proof on disjoint production product advance',async()=>{
 const changes=['app/[locale]/shamanica/page.tsx','components/unified-mobile-dock.tsx',
   'lib/shamanica-recommendations.mjs','tests/shamanica-mobile.test.mjs'];
 const diff=(paths,other={})=>({status:'ahead',ahead_by:1,behind_by:0,total_commits:1,
   base_commit:{sha:old},merge_base_commit:{sha:old},commits:[{sha:head}],
   files:paths.map(filename=>({filename,status:'modified'})),...other});
 const github=api('lib/billing/stripe-provider.js');
 let active=diff(changes),proofs=0;
 github.rest.repos.compareCommits=async()=>({data:active});
 const helper=(comparison,base,live,paths)=>{
   proofs++;
   return comparison.status==='ahead' && comparison.base_commit?.sha===old &&
     comparison.merge_base_commit?.sha===old && comparison.commits?.at(-1)?.sha===head &&
     base===old&&live===head&&paths.length===1&&
     paths[0]==='lib/billing/stripe-provider.js'&&
     comparison.files.every(file=>changes.includes(file.filename));
 };
 const policy={
   safeDocumentationAdvance:()=>false,
   safeIndependentCiMaintenanceAdvance:()=>false,
   verifiedIndependentPublicRasterAdvance:()=>false,
   safeIndependentPublicPresentationAdvance:()=>false,
   safeDisjointPublicSourceAdvance:helper,
 };
 const args={github,owner:'o',repo:'r',pr:{...pr,mergeable:true},
   verifiedRunBase:old,baseAdvancePolicy:policy};
 const ok=await assessBaseFreshness(args);
 assert.equal(ok.ok,true);
 assert.equal(ok.reason,'DISJOINT_PUBLIC_SOURCE_REVALIDATED');
 assert.equal(proofs,1);
 for(const mergeable of [null,false])
   assert.equal((await assessBaseFreshness({...args,pr:{...pr,mergeable}})).reason,
     'SENSITIVE_COMPARE_UNSAFE','no affirmative mergeability');
 assert.equal((await assessBaseFreshness({...args,baseAdvancePolicy:{
   ...policy,safeDisjointPublicSourceAdvance:undefined}})).reason,
   'SENSITIVE_COMPARE_UNSAFE','no missing-policy authorization');
 active=diff(['app/api/auth/route.js']);
 assert.equal((await assessBaseFreshness(args)).reason,'SENSITIVE_COMPARE_UNSAFE');
 active=diff(changes,{status:'diverged'});
 assert.equal((await assessBaseFreshness(args)).reason,'SENSITIVE_COMPARE_UNSAFE');
});

test('native AutoMerge preserves green Core for deleting or renaming unrelated candidate files',async()=>{
 const verified=(paths)=>({status:'ahead',ahead_by:1,behind_by:0,total_commits:1,
   base_commit:{sha:old},merge_base_commit:{sha:old},
   commits:[{sha:head}],files:paths.map(filename=>({filename,status:'modified'}))});
 const names=[];
 const policy={
   safeDocumentationAdvance:(compare,base,live,paths)=>{
     names.push([...paths]);return base===old&&live===head&&
       compare.status==='ahead'&&compare.files.length===1&&
       compare.files[0].filename==='docs/guides/independent.md'&&
       !paths.includes(compare.files[0].filename);
   },
   safeIndependentCiMaintenanceAdvance:()=>false,
   verifiedIndependentPublicRasterAdvance:()=>false,
   safeIndependentPublicPresentationAdvance:()=>false,
   safeDisjointPublicSourceAdvance:()=>false,
 };
 for(const [filename,status,previous,expected] of [
   ['components/retired-public-widget.tsx','removed',undefined,
     ['components/retired-public-widget.tsx']],
   ['components/mandala-modern-widget.tsx','renamed','components/mandala-legacy-widget.tsx',
     ['components/mandala-modern-widget.tsx','components/mandala-legacy-widget.tsx']],
 ]){
   const github=api(filename,status,previous);
   github.rest.repos.compareCommits=async()=>({data:verified(['docs/guides/independent.md'])});
   const outcome=await assessBaseFreshness({github,owner:'o',repo:'r',
     pr,verifiedRunBase:old,baseAdvancePolicy:policy});
   assert.equal(outcome.ok,true,status+' candidate change must not erase valid Core');
   assert.equal(outcome.reason,'INDEPENDENT_DOCS_BASE_REVALIDATED');
   assert.deepEqual(names.at(-1),expected,'all old/new paths retained for overlap checks');
   github.rest.repos.compareCommits=async()=>({data:verified([filename])});
   assert.equal((await assessBaseFreshness({github,owner:'o',repo:'r',
     pr,verifiedRunBase:old,baseAdvancePolicy:policy})).reason,
     'SENSITIVE_COMPARE_UNSAFE','candidate-target direct overlap still blocks');
 }
 const copied=api('components/mandala-stale.tsx','copied');
 copied.rest.repos.compareCommits=async()=>({data:verified(['docs/guides/independent.md'])});
 assert.match((await assessBaseFreshness({github:copied,owner:'o',repo:'r',
   pr,verifiedRunBase:old,baseAdvancePolicy:policy})).reason,/SENSITIVE_(CI_BASE_STALE|BASE_STALE)/);
});

test('native AutoMerge mirrors Specialist mixed protected-policy plus independent source proof',async()=>{
 const comparison={status:'ahead',ahead_by:2,behind_by:0,total_commits:2,
   base_commit:{sha:old},merge_base_commit:{sha:old},
   commits:[{sha:'d'.repeat(40)},{sha:head}],files:[
     {filename:'scripts/ci-specialist-aggregate.mjs',status:'modified'},
     {filename:'components/shamanica-mobile.tsx',status:'modified'},
   ]};
 const github=api('lib/billing/stripe-provider.js');
 let current=comparison,reads=0;
 github.rest.repos.compareCommits=async()=>({data:current});
 const policy={
   safeDocumentationAdvance:()=>false,
   safeIndependentCiMaintenanceAdvance:()=>false,
   verifiedIndependentPublicRasterAdvance:()=>false,
   safeIndependentPublicPresentationAdvance:()=>false,
   safeDisjointPublicSourceAdvance:()=>false,
   safeTrustedPolicyAdvance:(d,base,live,paths)=>{
     reads++;
     return base===old&&live===head&&paths.length===1&&
       paths[0]==='lib/billing/stripe-provider.js'&&d.status==='ahead'&&
       d.base_commit?.sha===old&&d.merge_base_commit?.sha===old&&
       d.commits?.length===2&&d.commits[1].sha===head&&
       d.files?.length===2&&
       d.files[0].filename==='scripts/ci-specialist-aggregate.mjs'&&
       d.files[1].filename==='components/shamanica-mobile.tsx';
   },
 };
 const options={github,owner:'o',repo:'r',pr:{...pr,mergeable:true},
   verifiedRunBase:old,baseAdvancePolicy:policy};
 const accepted=await assessBaseFreshness(options);
 assert.equal(accepted.ok,true);
 assert.equal(accepted.reason,'TRUSTED_POLICY_BASE_REVALIDATED');
 assert.equal(reads,1,'native merge shares protected Specialist policy function');
 for(const state of [null,false])
   assert.equal((await assessBaseFreshness({...options,
     pr:{...pr,mergeable:state}})).reason,'SENSITIVE_COMPARE_UNSAFE',
     'native ARM requires affirmative mergeability even if Specialist accepted pending');
 current={...comparison,files:[...comparison.files,{filename:'app/api/auth/route.js',status:'modified'}]};
 assert.equal((await assessBaseFreshness(options)).reason,'SENSITIVE_COMPARE_UNSAFE');
 current={...comparison,status:'diverged'};
 assert.equal((await assessBaseFreshness(options)).reason,'SENSITIVE_COMPARE_UNSAFE');
 const absent={...policy,safeTrustedPolicyAdvance:undefined};
 assert.equal((await assessBaseFreshness({...options,baseAdvancePolicy:absent})).reason,
   'SENSITIVE_COMPARE_UNSAFE');
});

test('native AutoMerge accepts only production-proven isolated browser QA base advances',async()=>{
 const file='scripts/verify-unified-six-dock-browser.mjs';
 const diff=(filename,status='modified')=>({
   status:'ahead',ahead_by:1,behind_by:0,total_commits:1,
   base_commit:{sha:old},merge_base_commit:{sha:old},
   commits:[{sha:head}],files:[{filename,status}],
 });
 let proof=diff(file),called=0;
 const github=api('lib/billing/stripe-provider.js');
 github.rest.repos.compareCommits=async()=>({data:proof});
 const policy={
   safeDocumentationAdvance:()=>false,
   safeIndependentCiMaintenanceAdvance:()=>false,
   verifiedIndependentPublicRasterAdvance:()=>false,
   safeIndependentPublicPresentationAdvance:()=>false,
   safeDisjointPublicSourceAdvance:()=>false,
   safeTrustedPolicyAdvance:()=>false,
   safeIndependentQaAdvance:(comparison,base,live,paths)=>{
     called++;
     return base===old&&live===head&&paths.length===1&&
       paths[0]==='lib/billing/stripe-provider.js'&&
       comparison.status==='ahead'&&comparison.base_commit?.sha===old&&
       comparison.merge_base_commit?.sha===old&&comparison.commits?.at(-1)?.sha===head&&
       comparison.files.length===1&&comparison.files[0].filename===file&&
       comparison.files[0].status==='modified';
   },
 };
 const options={github,owner:'o',repo:'r',pr:{...pr,mergeable:true},
   verifiedRunBase:old,baseAdvancePolicy:policy};
 const accepted=await assessBaseFreshness(options);
 assert.equal(accepted.ok,true);
 assert.equal(accepted.reason,'INDEPENDENT_QA_BASE_REVALIDATED');
 assert.equal(called,1);
 for(const mergeable of [false,null])
   assert.equal((await assessBaseFreshness({...options,pr:{...pr,mergeable}})).reason,
     'SENSITIVE_COMPARE_UNSAFE','native merge always requires explicit mergeability');
 for(const bad of [
   'scripts/verify-affirmation-voice-browser.mjs',
   'scripts/verify-admin-auth-browser.mjs',
   '.github/workflows/hh-pr-core-release.yml',
 ]){
   proof=diff(bad);
   assert.equal((await assessBaseFreshness(options)).reason,'SENSITIVE_COMPARE_UNSAFE',bad);
 }
 proof={...diff(file),status:'diverged'};
 assert.equal((await assessBaseFreshness(options)).reason,'SENSITIVE_COMPARE_UNSAFE');
});

test('native merge shares protected cross-domain TEST-only exception only after actual Core success',async()=>{
  const changes=['tests/crm-telegram-cabinet-entry.test.mjs'];
  const compare=paths=>({status:'ahead',ahead_by:1,behind_by:0,total_commits:1,
    base_commit:{sha:old},merge_base_commit:{sha:old},commits:[{sha:head}],
    files:paths.map(filename=>({filename,status:'modified'}))});
  let diff=compare(changes),verified=0;
  const github=api('components/mandala-auto-video-director.tsx');
  github.rest.repos.compareCommits=async()=>({data:diff});
  const policy={
    safeDocumentationAdvance:()=>false,
    safeIndependentCiMaintenanceAdvance:()=>false,
    verifiedIndependentPublicRasterAdvance:()=>false,
    safeIndependentPublicPresentationAdvance:()=>false,
    safeDisjointPublicSourceAdvance:()=>false,
    safeTrustedPolicyAdvance:()=>false,
    safeIndependentQaAdvance:()=>false,
    safeIndependentDomainTestAdvance:(d,base,latest,candidate)=>{
      verified++;
      return d.status==='ahead'&&d.base_commit?.sha===old&&
        d.merge_base_commit?.sha===old&&d.commits?.at(-1)?.sha===head&&
        base===old&&latest===head&&
        candidate.length===1&&candidate[0]==='components/mandala-auto-video-director.tsx'&&
        d.files.length===1&&d.files[0].filename===changes[0]&&
        d.files[0].status==='modified';
    },
  };
  const args={github,owner:'o',repo:'r',
    pr:{...pr,mergeable:true},verifiedRunBase:old,
    decideRoute:()=> 'FULL',baseAdvancePolicy:policy};
  const approved=await assessBaseFreshness(args);
  assert.equal(approved.ok,true);
  assert.equal(approved.reason,'INDEPENDENT_DOMAIN_TEST_BASE_REVALIDATED');
  assert.equal(verified,1);
  for(const mergeable of [null,false])
    assert.equal((await assessBaseFreshness({...args,pr:{...pr,mergeable}})).reason,
      'SENSITIVE_COMPARE_UNSAFE','native merge never guesses conflict freedom');
  assert.equal((await assessBaseFreshness({...args,baseAdvancePolicy:{
    ...policy,safeIndependentDomainTestAdvance:undefined}})).reason,
    'SENSITIVE_COMPARE_UNSAFE','production without helper stays strict');
  diff=compare(['tests/ci-specialist-aggregate.test.mjs']);
  assert.equal((await assessBaseFreshness(args)).reason,'SENSITIVE_COMPARE_UNSAFE');
  diff=compare(changes);diff.status='diverged';
  assert.equal((await assessBaseFreshness(args)).reason,'SENSITIVE_COMPARE_UNSAFE');
});

// A mixed docs+raster protected promotion cannot invalidate previously green
// exact-source checks when the *current protected production* classifier
// explicitly proves every row safe. A controller-only or null-mergeability
// shortcut is forbidden throughout the two-branch rollout.
test('native AutoMerge reuses mixed independent production checks only with protected proof', async () => {
  const github=api('lib/billing/stripe-provider.js');
  const compare={status:'ahead',ahead_by:1,behind_by:0,total_commits:1,
    base_commit:{sha:old},merge_base_commit:{sha:old},
    commits:[{sha:head}],files:[
      {filename:'docs/help/getting-started.md',status:'modified'},
      {filename:'public/images/home/portrait.webp',status:'modified'},
    ]};
  github.rest.repos.compareCommits=async()=>({data:compare});
  const policy={
    safeDocumentationAdvance:()=>false,
    safeIndependentCiMaintenanceAdvance:()=>false,
    verifiedIndependentPublicRasterAdvance:()=>false,
    safeComposedIndependentAdvance:(observed,from,to,paths)=>{
      assert.strictEqual(observed,compare);
      assert.equal(from,old);assert.equal(to,head);
      assert.deepEqual(paths,['lib/billing/stripe-provider.js']);
      return true;
    },
  };
  const options={github,owner:'o',repo:'r',pr:{...pr,mergeable:true},
    verifiedRunBase:old};
  assert.equal((await assessBaseFreshness(options)).reason,'SENSITIVE_COMPARE_UNSAFE',
    'a helper absent from protected production NEVER changes merge policy');
  assert.equal((await assessBaseFreshness({...options,baseAdvancePolicy:policy})).reason,
    'MIXED_INDEPENDENT_BASE_REVALIDATED');
  assert.equal((await assessBaseFreshness({...options,pr:{...pr,mergeable:null},
    baseAdvancePolicy:policy})).reason,'SENSITIVE_COMPARE_UNSAFE',
    'native merge must have affirmative GitHub mergeability');
  assert.equal((await assessBaseFreshness({...options,baseAdvancePolicy:{
    ...policy,safeComposedIndependentAdvance:()=>false,
  }})).reason,'SENSITIVE_COMPARE_UNSAFE');
});

test('native AutoMerge reads completed Core jobs once per event and pins that evidence to run attempt', () => {
  const yaml=require('node:fs').readFileSync(
    '.github/workflows/hh-native-auto-merge.yml','utf8');
  const enable=yaml.split('\n  enable:\n')[1]?.split('\n  failed-core-handoff:\n')[0];
  assert.ok(enable, 'trusted native enable job must exist');
  assert.equal((enable.match(/listJobsForWorkflowRun/g)||[]).length,1,
    'only one exact-run Core job listing, not one on both adjacent steps');
  assert.match(enable,/core\.setOutput\("core_evidence", JSON\.stringify\(/);
  assert.match(enable,/HH_CORE_EVIDENCE: \$\{\{ steps\.ready\.outputs\.core_evidence \}\}/);
  assert.match(enable,/run\.run_attempt!==proof\.run_attempt/);
  assert.match(enable,/run\.status!=="completed"\|\|run\.conclusion!=="success"/);
  assert.match(enable,/j\.run_id!==runId/);
  assert.match(enable,/run,jobs,rows,/,
    'log base fallback gets the single verified exact-Core job proof');
  assert.match(enable,/if\(!passed\("core-lint-types-build"\)\|\|!passed\("hh-merge-check"\)\)/);
});


test('AutoMerge mirrors the already-protected mixed and scoped drift policy on the same exact HEAD',async()=>{
 const live='b'.repeat(40),runBase='a'.repeat(40);
 const candidate='lib/billing/stripe-provider.js';
 const changed=['lib/assist/ali-free-diagnostic.mjs',
   'tests/ci-heavy-impact.test.mjs','docs/guides/editor-progress.md'];
 let comparison={status:'ahead',ahead_by:2,behind_by:0,total_commits:2,
  base_commit:{sha:runBase},merge_base_commit:{sha:runBase},
  commits:[{sha:'c'.repeat(40)},{sha:live}],
  files:changed.map(filename=>({filename,status:'modified'}))};
 const github={rest:{
  repos:{getBranch:async()=>({data:{commit:{sha:live},protected:true}}),
    compareCommits:async params=>{
      assert.equal(params.base,runBase);assert.equal(params.head,live);
      return {data:comparison};
    }},
  pulls:{listFiles:async()=>({data:[{filename:candidate,status:'modified'}]})},
 }};
 const approved={safeDocumentationAdvance:()=>false,
  safeIndependentCiMaintenanceAdvance:()=>false,
  verifiedIndependentPublicRasterAdvance:()=>false,
  safeMixedProtectedAdvance:(delta,base,target,paths)=>{
   assert.equal(base,runBase);assert.equal(target,live);
   assert.deepEqual(paths,[candidate]);
   return delta.status==='ahead'&&delta.merge_base_commit?.sha===runBase&&
      delta.files.length===3&&
      delta.files.every(row=>changed.includes(row.filename)&&row.status==='modified');
  },
 };
 const args={github,owner:'andylitvinov-design',repo:'books',pr:{
  number:5157,changed_files:1,mergeable:true,base:{sha:runBase}
 },verifiedRunBase:runBase,classifierBase:live,
  decideRoute:()=> 'FULL',baseAdvancePolicy:approved};
 const ok=await assess(args);
 assert.equal(ok.ok,true,'same HEAD passed Core and scoped specialist; unrelated target did not invalidate it');
 assert.equal(ok.reason,'MIXED_INDEPENDENT_BASE_REVALIDATED');
 for(const state of [false,null]){
  assert.equal((await assess({...args,pr:{...args.pr,mergeable:state}})).reason,
   'SENSITIVE_COMPARE_UNSAFE','native positive mergeability remains mandatory');
 }
 comparison={...comparison,status:'diverged'};
 assert.equal((await assess(args)).reason,'SENSITIVE_COMPARE_UNSAFE');
 comparison={...comparison,status:'ahead',
  files:[{filename:'app/api/auth/route.ts',status:'modified'}]};
 assert.equal((await assess(args)).reason,'SENSITIVE_COMPARE_UNSAFE');
 comparison={...comparison,files:changed.map(filename=>({filename,status:'modified'}))};
 const absent={...approved,safeMixedProtectedAdvance:undefined};
 assert.equal((await assess({...args,baseAdvancePolicy:absent})).reason,'SENSITIVE_COMPARE_UNSAFE',
  'missing protected helper is HOLD, not a fabricated success');
 const scoped={...approved,safeMixedProtectedAdvance:undefined,
  safeScopedDisjointProductionAdvance:(_delta,base,target,paths)=>
    base===runBase&&target===live&&paths[0]===candidate};
 assert.equal((await assess({...args,baseAdvancePolicy:scoped})).reason,
  'MIXED_INDEPENDENT_BASE_REVALIDATED','earlier shipped scoped proof also reaches native AutoMerge');
});
test('native base revalidation source accepts only helpers pinned to verified production SHA',()=>{
 const src=require('node:fs').readFileSync('scripts/ci-pr-base-freshness.cjs','utf8');
 assert.ok(src.includes("impactUrl.searchParams.set('sha',classifierBase)"));
 assert.ok(src.includes("names.push('safeMixedProtectedAdvance')"));
 assert.ok(src.includes("names.push('safeScopedDisjointProductionAdvance')"));
 assert.ok(src.includes("approved('safeMixedProtectedAdvance')"));
 assert.ok(src.includes("approved('safeScopedDisjointProductionAdvance')"));
});

test('native freshness mirrors the production-owned ordinary-product loose-base proof',async()=>{
 const old='a'.repeat(40),live='b'.repeat(40),candidate='components/ali-audio-call.tsx';
 const valid={status:'ahead',ahead_by:1,behind_by:0,total_commits:1,
  base_commit:{sha:old},merge_base_commit:{sha:old},commits:[{sha:live}],
  files:[{filename:'lib/holistic-support/natural-dialogue.mjs',status:'modified'},
    {filename:'components/mandala-auto-video-director.tsx',status:'modified'}]};
 let delta=valid, helperCalls=0;
 const github={rest:{
  repos:{getBranch:async()=>({data:{commit:{sha:live},protected:true}}),
    compareCommits:async()=>({data:delta})},
  pulls:{listFiles:async()=>({data:[{filename:candidate,status:'modified'}]})},
 }};
 const policy={safeDocumentationAdvance:()=>false,
  safeIndependentCiMaintenanceAdvance:()=>false,
  verifiedIndependentPublicRasterAdvance:()=>false,
  safeNonOverlappingProductAdvance:(comparison,from,to,paths)=>{
   helperCalls++;
   assert.equal(from,old);assert.equal(to,live);assert.deepEqual(paths,[candidate]);
   return comparison===valid;
  }};
 const args={github,owner:'andylitvinov-design',repo:'books',
  pr:{number:5682,changed_files:1,mergeable:true,base:{sha:old}},
  verifiedRunBase:old,classifierBase:live,decideRoute:()=> 'FULL',baseAdvancePolicy:policy};
 assert.deepEqual(await assess(args),{ok:true,reason:'MIXED_INDEPENDENT_BASE_REVALIDATED',base:live});
 assert.equal(helperCalls,1);
 for(const state of [null,false]){
  assert.equal((await assess({...args,pr:{...args.pr,mergeable:state}})).ok,false);
 }
 assert.equal(helperCalls,1,'unknown or conflicting mergeability cannot authorize reuse');
 assert.equal((await assess({...args,baseAdvancePolicy:{...policy,safeNonOverlappingProductAdvance:undefined}})).ok,false);
 assert.equal((await assess({...args,verifiedRunBase:null})).ok,false);
 delta={...valid,status:'diverged'};
 assert.equal((await assess(args)).ok,false);
 const source=require('node:fs').readFileSync('scripts/ci-pr-base-freshness.cjs','utf8');
 assert.ok(source.includes("names.push('safeNonOverlappingProductAdvance')"));
 assert.ok(source.includes("approved('safeNonOverlappingProductAdvance',packageEvidence)"));
});


test('native freshness mirrors all protected independent proofs and supplies exact additive package evidence',async()=>{
 const source='c'.repeat(40), paths=['package.json','package-lock.json','components/my-coach-intro.jsx'];
 const valid={status:'ahead',behind_by:0,base_commit:{sha:old},merge_base_commit:{sha:old},
  files:[{filename:'components/tarot-intro.jsx',status:'modified'}]};
 let sourceAncestor=true, fetched=[], evidence;
 const github={rest:{repos:{
  getBranch:async()=>({data:{commit:{sha:head},protected:true}}),
  compareCommits:async({head:target})=>({data:target===source?
    {...valid,status:sourceAncestor?'ahead':'diverged'}:valid}),
  getContent:async({path,ref})=>{
   fetched.push([path,ref]);const value=JSON.stringify({path,ref});
   return {data:{type:'file',path,sha:'d'.repeat(40),size:Buffer.byteLength(value),
      encoding:'base64',content:Buffer.from(value).toString('base64')}};
  }
 },pulls:{listFiles:async()=>({data:paths.map(filename=>({filename,status:'modified'}))})}}};
 const policy={safeDocumentationAdvance:()=>false,safeIndependentCiMaintenanceAdvance:()=>false,
  verifiedIndependentPublicRasterAdvance:()=>false,
  safeNonOverlappingProductAdvance:(_d,_b,_l,_p,e)=>{evidence=e;return Boolean(e?.baseLock&&e?.currentLock);}};
 const args={github,owner:'o',repo:'r',pr:{...pr,changed_files:3,mergeable:true,head:{sha:source}},
   verifiedRunBase:old,classifierBase:head,decideRoute:()=> 'FULL',baseAdvancePolicy:policy};
 assert.equal((await assess(args)).ok,true);
 assert.equal(fetched.length,4);assert.equal(JSON.parse(evidence.baseLock).ref,old);
 assert.equal(JSON.parse(evidence.currentPackage).ref,source);
 sourceAncestor=false;fetched=[];
 assert.equal((await assess(args)).ok,false);assert.equal(fetched.length,0);
 for(const name of ['safeDetachedCiSourceAdvance','safeUnrelatedPublicLeafAdvance','safeIsolatedFeatureAdvance']){
  const extra={...policy,safeNonOverlappingProductAdvance:()=>false,
    [name]:(_d,b,l,p,positive)=>b===old&&l===head&&p.length===3&&
     (name!=='safeIsolatedFeatureAdvance'||positive===true)};
  assert.equal((await assess({...args,baseAdvancePolicy:extra})).ok,true,name);
  assert.equal((await assess({...args,baseAdvancePolicy:extra,pr:{...args.pr,mergeable:false}})).ok,false,name);
 }
});
