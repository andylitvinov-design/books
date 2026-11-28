import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {needsFullSiteVideoBrowser,classifyExactSiteVideo,exactCoreBuildIdentity,exactCoreIdentityLog,verifiedCompletedCoreBuild,verifiedEquivalentPriorCoreBuild} from '../scripts/ci-site-video-scope.mjs';

const one=filename=>[{filename,status:'modified'}];
test('reviewed public-display changes can defer repeated Chromium and Redis E2E',()=>{
  for(const name of ['components/personal-testimonials.tsx',
      'components/site-navigation.tsx','app/[locale]/about/page.tsx',
      'data/about-es.ts','public/images/holistic-house/video-posters/poster.webp',
      '.github/workflows/site-video-browser.yml']){
    assert.equal(needsFullSiteVideoBrowser(one(name)),false,name);
  }
});
test('auth, owner video, API, private UI, unknown and status changes retain full real E2E',()=>{
  for(const name of ['lib/app/session.js','app/api/app/practitioner/open/route.js',
      'app/admin/videos/page.tsx','lib/site-videos/repository.js','components/site-video-manager.tsx',
      'scripts/verify-site-video-admin-browser.mjs','app/es/services/page.tsx','middleware.ts']){
    assert.equal(needsFullSiteVideoBrowser(one(name)),true,name);
  }
  assert.equal(needsFullSiteVideoBrowser(null),true);
  assert.equal(needsFullSiteVideoBrowser([]),true);
  assert.equal(needsFullSiteVideoBrowser([{filename:'components/personal-testimonials.tsx',status:'added'}]),true);
  assert.equal(needsFullSiteVideoBrowser([one('data/about-es.ts')[0],one('lib/app/session.js')[0]]),true);
});
test('manual or production and unverifiable tested merge never defer coverage',()=>{
  assert.equal(classifyExactSiteVideo({GITHUB_EVENT_NAME:'workflow_dispatch'}).full,true);
  assert.equal(classifyExactSiteVideo({GITHUB_EVENT_NAME:'push'}).full,true);
  assert.equal(classifyExactSiteVideo({GITHUB_EVENT_NAME:'pull_request',HH_HEAD_SHA:''}).full,true);
  assert.equal(classifyExactSiteVideo({
    GITHUB_EVENT_NAME:'pull_request',HH_HEAD_SHA:'a'.repeat(40),GITHUB_SHA:'b'.repeat(40)
  },()=>{throw Error('shallow clone');}).full,true);
});
test('exact synthetic HEAD parent determines the scoped path set, not GitHub PR metadata',()=>{
  const head='a'.repeat(40),merge='b'.repeat(40),base='c'.repeat(40);
  const z=String.fromCharCode(0),calls=[];
  const git=(_bin,args)=>{
    calls.push(args);
    if(args[0]==='rev-parse')return ({HEAD:merge,'HEAD^1':base,'HEAD^2':head})[args[1]]+'\n';
    if(args[0]==='diff')return 'M'+z+'components/personal-testimonials.tsx'+z;
    throw Error('Unknown git command');
  };
  const scoped=classifyExactSiteVideo({GITHUB_EVENT_NAME:'pull_request',HH_HEAD_SHA:head,GITHUB_SHA:merge},git);
  assert.deepEqual(scoped,{full:false,reason:'REVIEWED_PUBLIC_DISPLAY_ONLY'});
  assert.deepEqual(calls.find(x=>x[0]==='diff'),
    ['diff','--no-renames','--name-status','-z',base,'HEAD']);
});
test('same existing jobs retain protected browser QA on sensitive PR and manual events',()=>{
  const y=readFileSync(new URL('../.github/workflows/site-video-browser.yml',import.meta.url),'utf8');
  assert.match(y,/workflow_dispatch:/);
  assert.match(y,/node scripts\/ci-site-video-scope\.mjs/g);
  assert.match(y,/postgres:17-alpine/);
  assert.match(y,/redis:7-alpine/);
  assert.match(y,/node scripts\/verify-site-video-admin-browser\.mjs/);
  assert.match(y,/node scripts\/verify-site-video-browser\.mjs/);
  for(const step of ['Build actual application with locked production dependencies',
    'Install pinned Chromium and Redis client for authenticated E2E']){
    assert.ok(y.includes('- name: '+step+"\n        if: github.event_name != 'pull_request' || steps.impact.outputs.full == 'true'"),step);
  }
  assert.doesNotMatch(y,/continue-on-error:\s*true/);
});

test('About testimonial gallery retains the real browser suite and original source contracts',()=>{
  const y=readFileSync(new URL('../.github/workflows/site-video-browser.yml',import.meta.url),'utf8');
  for(const path of ['components/about-testimonial-gallery.tsx','components/about-testimonial-gallery.module.css','tests/about-testimonial-languages.test.mjs']){
    assert.ok(y.includes("'"+path+"'"),path+' must trigger the established suite');
    assert.equal(needsFullSiteVideoBrowser(one(path)),true,path+' is not a reviewed display-only skip');
  }
  assert.match(y,/node --test[^\n]*tests\/about-testimonial-languages\.test\.mjs/);
  assert.match(y,/npx[^\n]*eslint[^\n]*components\/about-testimonial-gallery\.tsx/);
  assert.match(y,/node scripts\/verify-site-video-browser\.mjs/);
});


test('strict coach-only dispatcher diff avoids unrelated Site Video Next/WebKit work',()=>{
  const head='a'.repeat(40),merge='b'.repeat(40),base='c'.repeat(40);
  const before="import {myCoachGenerativeTurn} from '@/lib/app/coaching-brain'\nconst authGuard = true;\n    // Signed-in, stateless dialogue for the selected My Coach persona. Client\n    if (joined === 'my-coach/turn') { return json(myCoachGenerativeTurn()); }\n    // A synthetic preflight proves verified ZDR free-model access before any\nconst unrelated = true;\n";
  const after="import {myCoachGenerativeTurn,myCoachGenerativeStreamTurn} from '@/lib/app/coaching-brain'\nconst authGuard = true;\n    // Signed-in, stateless dialogue for the selected My Coach persona. Client\n    if (joined === 'my-coach/stream') { return new Response('ok'); }\n    if (joined === 'my-coach/turn') { return json(myCoachGenerativeTurn()); }\n    // A synthetic preflight proves verified ZDR free-model access before any\nconst unrelated = true;\n";
  const z=String.fromCharCode(0),record=[];
  const git=(_binary,args)=>{
    record.push(args);
    if(args[0]==='rev-parse')return ({HEAD:merge,'HEAD^1':base,'HEAD^2':head})[args[1]]+'\n';
    if(args[0]==='diff')return 'M'+z+'app/api/app/[...path]/route.js'+z+'A'+z+'lib/coaching/gemini-voice-catalog.mjs'+z;
    if(args[0]==='show')return args[1].startsWith(base+':')?before:after;
    throw Error('unexpected git command');
  };
  const args={GITHUB_EVENT_NAME:'pull_request',HH_HEAD_SHA:head,GITHUB_SHA:merge};
  assert.deepEqual(classifyExactSiteVideo(args,git),{full:false,reason:'EXACT_MY_COACH_ONLY_SHARED_API'});
  const tampered=(_binary,x)=>x[0]==='show' && x[1]==='HEAD:app/api/app/[...path]/route.js'
    ? after.replace('const unrelated = true;', 'const unrelated = false;') : git(_binary,x);
  assert.equal(classifyExactSiteVideo(args,tampered).full,true,'shared non-Coach auth/runtime changes retain full browser');
  assert.ok(record.some(args=>args[0]==='show'&&args[1]===base+':app/api/app/[...path]/route.js'));
});

// All source/contract files in the CI fan-out fix, without any application
// change, must not trigger the full Site Video Next/Redis/WebKit matrix.
test('exact CI routing-only edits retain source tests without unrelated runtime browser work',()=>{
 const paths=["scripts/ci-site-video-scope.mjs","tests/ci-site-video-scope.test.mjs","lib/ci/coach-only-impact.mjs","tests/ci-coach-only-impact.test.mjs","tests/ci-pr-selective-workflows.test.mjs","tests/pr-fast-lane.test.mjs","docs/operations/CI_RELEASE_POLICY.md",".github/workflows/hh-pr-core-release.yml",".github/workflows/site-video-browser.yml",".github/workflows/hh-profile-axis-matching.yml",".github/workflows/practice-google-browser.yml",".github/workflows/hh-private-audio-e2e.yml",".github/workflows/hh-personal-coaching-session.yml"];
 const rows=paths.map(filename=>({filename,status:'modified'}));
 assert.equal(needsFullSiteVideoBrowser(rows),false);
 for (const filename of ['app/api/app/[...path]/route.js','app/api/app/my-coach/engines/route.js','app/admin/videos/page.tsx','lib/app/session.js','lib/site-videos/repository.js','app/api/payments/route.js','middleware.ts','package-lock.json','supabase/migrations/20261128_auth.sql','tests/unknown.test.mjs','.github/workflows/unknown.yml'])
   assert.equal(needsFullSiteVideoBrowser([...rows,...one(filename)]),true,filename);
 for(const status of ['added','removed','renamed'])
   assert.equal(needsFullSiteVideoBrowser([{filename:'lib/ci/coach-only-impact.mjs',status}]),true,status);
 assert.equal(needsFullSiteVideoBrowser([{...rows[0],previous_filename:'lib/app/session.js'}]),true);
 assert.equal(needsFullSiteVideoBrowser([rows[0],rows[0]]),true);
 const head='a'.repeat(40),merge='b'.repeat(40),base='c'.repeat(40),z=String.fromCharCode(0);
 const git=(_bin,args)=>args[0]==='rev-parse'?({HEAD:merge,'HEAD^1':base,'HEAD^2':head})[args[1]]+'\n':args[0]==='diff'?rows.flatMap(row=>['M',row.filename]).join(z)+z:(()=>{throw Error('unexpected command')})();
 assert.deepEqual(classifyExactSiteVideo({GITHUB_EVENT_NAME:'pull_request',HH_HEAD_SHA:head,GITHUB_SHA:merge},git),{full:false,reason:'EXACT_CI_ROUTING_POLICY_ONLY'});
});


const coreHead='a'.repeat(40),coreMerge='b'.repeat(40),coreBase='c'.repeat(40);
const coreRepo='andylitvinov-design/books',corePath='.github/workflows/hh-pr-core-release.yml';
const coreBuild='Exact proposed release production build and TypeScript check';
const coreAncestry='Verify bounded shallow scope ancestry before PR routing';
const coreEnv={GITHUB_EVENT_NAME:'pull_request',GITHUB_BASE_REF:'codex/public-book-library',
 GITHUB_REPOSITORY:coreRepo,HH_PR_NUMBER:'5701',GITHUB_SHA:coreMerge,HH_HEAD_SHA:coreHead,HH_EVENT_BASE_SHA:coreBase};
const coreIdentity={repo:coreRepo,pr:5701,merge:coreMerge,head:coreHead,base:coreBase};
const trustedCore='HH_CORE_BUILD_IDENTITY_V1\n'+coreBuild+'\nrun: npm run build -- --no-lint';
function mockCoreGit(overrides={}){
 return (_bin,args)=>{
  if(args[0]==='rev-parse')return ({HEAD:coreMerge,'HEAD^1':coreBase,'HEAD^2':coreHead,...overrides.revs})[args[1]];
  if(args[0]==='show'&&args[1]===coreBase+':'+corePath)return overrides.basePolicy??trustedCore;
  if(args[0]==='show'&&args[1]==='HEAD:'+corePath)return overrides.headPolicy??trustedCore;
  if(args[0]==='show'&&args[1]==='HEAD:package.json')return JSON.stringify(overrides.manifest??{scripts:{build:'next build',prebuild:'node scripts/prepare.mjs'}});
  throw Error('unexpected git command');
 };
}
test('Core reuse requires exact merge parents and unchanged trusted production workflow',()=>{
 assert.deepEqual(exactCoreBuildIdentity(coreEnv,mockCoreGit()),coreIdentity);
 for(const env of [{...coreEnv,GITHUB_EVENT_NAME:'push'},{...coreEnv,GITHUB_EVENT_NAME:'workflow_dispatch'},
   {...coreEnv,GITHUB_BASE_REF:'other'},{...coreEnv,HH_PR_NUMBER:''},{...coreEnv,HH_EVENT_BASE_SHA:'d'.repeat(40)},
   {...coreEnv,HH_HEAD_SHA:'d'.repeat(40)},{...coreEnv,GITHUB_SHA:'d'.repeat(40)}])
  assert.equal(exactCoreBuildIdentity(env,mockCoreGit()),null);
 for(const overrides of [{headPolicy:trustedCore+'\nchanged'},{basePolicy:'old policy'},{manifest:{scripts:{build:'echo success',prebuild:'true'}}},{manifest:{scripts:{build:'next build'}}}])
  assert.equal(exactCoreBuildIdentity(coreEnv,mockCoreGit(overrides)),null);
 assert.equal(exactCoreBuildIdentity(coreEnv,()=>{throw Error('missing history')}),null);
});
const coreRun={id:101,run_attempt:2,event:'pull_request',head_sha:coreHead,head_repository:{full_name:coreRepo},path:corePath,status:'in_progress'};
const coreJob={id:201,run_id:101,name:'core-lint-types-build',status:'completed',conclusion:'success',
 steps:[{name:coreBuild,status:'completed',conclusion:'success'},{name:coreAncestry,status:'completed',conclusion:'success'}]};
const marker='HH_CORE_BUILD_IDENTITY_V1 5701 101 2 '+coreMerge+' '+coreHead+' '+coreBase;
const checkout='[command]/usr/bin/git log -1 --format=%H';
const readiness='##[group]Run node scripts/ci-pr-readiness.mjs';
const coreLog=[checkout,coreMerge,marker,readiness].map(line=>'2026-11-28T13:00:00.0000000Z '+line).join('\n');
function mockCoreRead({run=coreRun,job=coreJob,log=coreLog,total=1}={}){
 return (endpoint,raw)=>{
  if(endpoint.includes('/workflows/'))return {workflow_runs:[run]};
  if(endpoint.includes('/attempts/2/jobs'))return {total_count:total,jobs:[job]};
  if(endpoint.endsWith('/jobs/201/logs')&&raw)return log;
  throw Error('unexpected API endpoint');
 };
}
test('reuse completed real Core build without waiting for its specialist-dependent final gate',()=>{
 assert.deepEqual(verifiedCompletedCoreBuild(coreIdentity,mockCoreRead()),{runId:101,attempt:2,jobId:201});
 assert.equal(exactCoreIdentityLog(coreLog,coreIdentity,coreRun),true);
});
test('reuse fails closed for queued, failed, skipped, wrong attempt, incomplete or unavailable evidence',()=>{
 for(const job of [{...coreJob,status:'in_progress'},{...coreJob,conclusion:'failure'},
   {...coreJob,steps:[coreJob.steps[1]]},{...coreJob,steps:[{...coreJob.steps[0],conclusion:'skipped'},coreJob.steps[1]]},
   {...coreJob,steps:[coreJob.steps[0],{...coreJob.steps[1],conclusion:'failure'}]},
   {...coreJob,run_id:102}])
  assert.equal(verifiedCompletedCoreBuild(coreIdentity,mockCoreRead({job})),null);
 for(const run of [{...coreRun,head_sha:'d'.repeat(40)},{...coreRun,event:'push'},{...coreRun,path:'other.yml'},
   {...coreRun,head_repository:{full_name:'other/fork'}},{...coreRun,run_attempt:1}])
  assert.equal(verifiedCompletedCoreBuild(coreIdentity,mockCoreRead({run})),null);
 for(const log of [marker,coreLog.replace(coreMerge,'d'.repeat(40)),coreLog.replace('101 2','101 1'),
   coreLog+'\n'+marker,[checkout,coreMerge,readiness,marker].join('\n'),
   coreLog.replace(marker,'printf '+marker)])
  assert.equal(verifiedCompletedCoreBuild(coreIdentity,mockCoreRead({log})),null);
 assert.equal(verifiedCompletedCoreBuild(coreIdentity,mockCoreRead({total:2})),null);
 assert.equal(verifiedCompletedCoreBuild(coreIdentity,()=>{throw Error('API unavailable')}),null);
});
test('workflow retains prebuild, independent build fallback and real browser coverage',()=>{
 const y=readFileSync(new URL('../.github/workflows/site-video-browser.yml',import.meta.url),'utf8');
 assert.match(y,/--core-plan/);
 assert.match(y,/--core-proof/);
 assert.match(y,/npm run prebuild/);
 assert.match(y,/npm run build -- --no-lint/);
 assert.match(y,/node scripts\/verify-site-video-browser\.mjs/);
 assert.match(y,/node scripts\/verify-site-video-admin-browser\.mjs/);
 assert.ok(y.indexOf('Resolve exact successful Core build or run independent fallback')>y.indexOf('Exercise editor against isolated Redis'));
 const core=readFileSync(new URL('../.github/workflows/hh-pr-core-release.yml',import.meta.url),'utf8');
 assert.match(core,/HH_CORE_BUILD_IDENTITY_V1/);
 assert.doesNotMatch(core,/npm run lint -- --concurrency/);
 assert.match(core,/npm run lint\s*\n\s*elif/);
 assert.match(core,/run: npm run build -- --no-lint/);
});


test('new HEAD with identical source and proposed merge tree reuses only a real completed Core build',()=>{
 const oldHead='d'.repeat(40),oldMerge='e'.repeat(40),sourceTree='1'.repeat(40),mergeTree='2'.repeat(40);
 const identity=coreIdentity;
 const run={...coreRun,head_sha:oldHead,repository:{full_name:coreRepo}};
 const oldLog=[checkout,oldMerge,'HH_CORE_BUILD_IDENTITY_V1 5701 101 2 '+oldMerge+' '+oldHead+' '+coreBase,readiness].join('\n');
 const commits={
  [coreHead]:{sha:coreHead,tree:{sha:sourceTree}},
  [oldHead]:{sha:oldHead,tree:{sha:sourceTree}},
  [coreMerge]:{sha:coreMerge,tree:{sha:mergeTree},parents:[{sha:coreBase},{sha:coreHead}]},
  [oldMerge]:{sha:oldMerge,tree:{sha:mergeTree},parents:[{sha:coreBase},{sha:oldHead}]},
 };
 const read=({patch={},job=coreJob,log=oldLog,runs=[run]}={})=>(endpoint,raw)=>{
  if(endpoint.includes('/git/commits/')){const sha=endpoint.split('/').at(-1);return {...commits[sha],...patch[sha]};}
  if(endpoint.includes('/workflows/'))return {workflow_runs:runs};
  if(endpoint.includes('/attempts/2/jobs'))return {total_count:1,jobs:[job]};
  if(endpoint.endsWith('/jobs/201/logs')&&raw)return log;
  throw Error('unexpected API endpoint');
 };
 assert.deepEqual(verifiedEquivalentPriorCoreBuild(identity,oldHead,read()),{
  runId:101,attempt:2,jobId:201,previousHead:oldHead,mergeTree});
 for(const patch of [
  {[oldHead]:{tree:{sha:'3'.repeat(40)}}},
  {[oldMerge]:{tree:{sha:'3'.repeat(40)}}},
  {[oldMerge]:{parents:[{sha:'3'.repeat(40)},{sha:oldHead}]}},
  {[coreMerge]:{parents:[{sha:coreBase},{sha:oldHead}]}},
 ])assert.equal(verifiedEquivalentPriorCoreBuild(identity,oldHead,read({patch})),null);
 for(const job of [{...coreJob,conclusion:'failure'},{...coreJob,status:'in_progress'},
  {...coreJob,steps:[{...coreJob.steps[0],conclusion:'skipped'},coreJob.steps[1]]}])
  assert.equal(verifiedEquivalentPriorCoreBuild(identity,oldHead,read({job})),null);
 assert.equal(verifiedEquivalentPriorCoreBuild(identity,oldHead,read({log:oldLog.replace('5701','9999')})),null);
 assert.equal(verifiedEquivalentPriorCoreBuild(identity,oldHead,read({runs:[run,{...run,id:102}]})),null);
 assert.equal(verifiedEquivalentPriorCoreBuild(identity,oldHead,read({runs:[{...run,repository:{full_name:'other/repo'}}]})),null);
 assert.equal(verifiedEquivalentPriorCoreBuild(identity,coreHead,read()),null);
 assert.equal(verifiedEquivalentPriorCoreBuild(identity,oldHead,()=>{throw Error('API denied')}),null);
});

test('Core reuses identical prior content only through the protected reader, otherwise runs real build',()=>{
 const core=readFileSync(new URL('../.github/workflows/hh-pr-core-release.yml',import.meta.url),'utf8');
 assert.match(core,/git show "\$tested_base:scripts\/ci-site-video-scope\.mjs"/);
 assert.match(core,/--previous-core-proof/);
 assert.match(core,/steps\.reuse_build\.outputs\.reused != 'true'/);
 assert.match(core,/run: npm run build -- --no-lint/);
 assert.ok(core.includes('Confirm one-runner Core and independent specialist release evidence'));
});
