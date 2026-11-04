'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {
 isTrustedFailure,validatedJobEvidence,isActualBaseAdvancedLog,
 isVerifiedAdvance,recoverBaseAdvanced
}=require('../scripts/ci-pr-base-advanced-recovery.cjs');
const HEAD='a'.repeat(40),OLD='b'.repeat(40),LIVE='c'.repeat(40);
const REPO='andylitvinov-design/books';
const MARKER=[
 '2026-11-04T20:59:47.4536699Z ##[error]BASE_ADVANCED: PR_HEAD_BASE_OR_RELEASE_STATE_CHANGED:PRODUCTION_BASE_CHANGED',
 '2026-11-04T20:59:47.4547714Z CI_SPECIALIST_FAIL_CLOSED: PR_HEAD_BASE_OR_RELEASE_STATE_CHANGED:PRODUCTION_BASE_CHANGED'
].join('\n');
const jobs=[
 {id:1,name:'core-lint-types-build',status:'completed',conclusion:'success'},
 {id:2,name:'hh-specialist',status:'completed',conclusion:'failure'},
 {id:3,name:'hh-merge-check',status:'completed',conclusion:'failure'}
];
function world(options={}){
 const event={
  id:100,name:'HH PR core release gate',path:'.github/workflows/hh-pr-core-release.yml',
  run_attempt:1,event:'pull_request',status:'completed',conclusion:'failure',
  repository:{full_name:REPO},head_repository:{full_name:REPO},
  head_sha:HEAD,head_branch:'fix/sensitive-crm',
  created_at:'2026-11-04T21:00:00.000Z',
  pull_requests:[{number:3510,base:{ref:'codex/public-book-library',sha:OLD},
    head:{ref:'fix/sensitive-crm',sha:HEAD}}],...options.event
 };
 const context={eventName:'workflow_run',ref:'refs/heads/codex/bootstrap-books',
  repo:{owner:'andylitvinov-design',repo:'books'},payload:{workflow_run:event},
  ...options.context};
 const pr={number:3510,state:'open',draft:false,mergeable:true,mergeable_state:'clean',
  base:{ref:'codex/public-book-library',sha:LIVE},
  head:{ref:'fix/sensitive-crm',sha:HEAD,repo:{full_name:REPO}},
  labels:[],...options.pr};
 let updates=0,reads=0;
 const github={
  rest:{
   actions:{
    getWorkflowRun:async()=>({data:{id:100,run_attempt:1,status:'completed',conclusion:'failure',
     head_sha:HEAD,head_branch:'fix/sensitive-crm',path:'.github/workflows/hh-pr-core-release.yml',
     ...options.run}}),
    listJobsForWorkflowRun:async()=>({data:{total_count:jobs.length,jobs:options.jobs||jobs}})
   },
   pulls:{get:async()=>({data:(reads++,options.prAfter&&reads>=2?options.prAfter:pr)})},
   repos:{
    getBranch:async()=>({data:{protected:true,commit:{sha:LIVE},...options.branch}}),
    compareCommits:async()=>({data:{status:'ahead',ahead_by:1,behind_by:0,
     total_commits:1,commits:[{sha:LIVE}],
     base_commit:{sha:OLD},merge_base_commit:{sha:OLD},...options.compare}})
   },
   issues:{listComments:async()=>({data:options.comments||[]})}
  },
  request:async(path)=>{
   if(path.includes('/logs'))return {data:options.logs??MARKER};
   if(path.startsWith('PUT ')){updates++;return {status:options.updateStatus??202};}
   throw Error('Unexpected test API call '+path);
  }
 };
 return {context,github,updated:()=>updates,reads:()=>reads};
}
const run=w=>recoverBaseAdvanced({context:w.context,github:w.github,
 hasOwnerToken:true,now:Date.parse('2026-11-04T21:02:00Z')});
test('accepts only recent trusted failed Core event on exact default branch',()=>{
 const w=world();
 assert.equal(isTrustedFailure(w.context,Date.parse('2026-11-04T21:02:00Z')),true);
 for(const variant of [
  {ref:'refs/heads/codex/public-book-library'},
  {eventName:'pull_request_target'},
  {payload:{workflow_run:{...w.context.payload.workflow_run,head_sha:'wrong'}}},
  {payload:{workflow_run:{...w.context.payload.workflow_run,conclusion:'success'}}},
  {payload:{workflow_run:{...w.context.payload.workflow_run,repository:{full_name:'other/repo'}}}}
 ])assert.equal(isTrustedFailure({...w.context,...variant},Date.parse('2026-11-04T21:02:00Z')),false);
});
test('exact independent Core + failed specialist and merge evidence is mandatory',()=>{
 assert.equal(validatedJobEvidence({total_count:3,jobs}),2);
 assert.equal(validatedJobEvidence({total_count:4,jobs}),null);
 assert.equal(validatedJobEvidence({total_count:4,jobs:[...jobs,{id:4,name:'browser',conclusion:'failure'}]}),null);
 assert.equal(validatedJobEvidence({total_count:3,jobs:jobs.map(x=>
  x.name==='core-lint-types-build'?{...x,conclusion:'skipped'}:x)}),null);
 assert.equal(validatedJobEvidence({total_count:4,jobs:[...jobs,jobs[1]]}),null);
 assert.equal(isActualBaseAdvancedLog(MARKER),true);
 assert.equal(isActualBaseAdvancedLog(MARKER.replace('BASE_ADVANCED','GENERIC_FAILURE')),false);
 assert.equal(isActualBaseAdvancedLog('CI_SPECIALIST_FAIL_CLOSED: PR_HEAD_BASE_OR_RELEASE_STATE_CHANGED:PRODUCTION_BASE_CHANGED'),false);
});
test('new production must be fully proven descendant, never diverged or incomplete',()=>{
 const d={status:'ahead',ahead_by:1,behind_by:0,total_commits:1,
  base_commit:{sha:OLD},merge_base_commit:{sha:OLD},commits:[{sha:LIVE}]};
 assert.equal(isVerifiedAdvance(d,OLD,LIVE),true);
 for(const bad of [{...d,status:'diverged'},{...d,commits:[]},
  {...d,merge_base_commit:{sha:HEAD}},{...d,ahead_by:101},
  {...d,behind_by:1}]){
  assert.equal(isVerifiedAdvance(bad,OLD,LIVE),false);
 }
});
test('verified failure creates one native non-force base update, never a synthetic PASS',async()=>{
 const w=world();const result=await run(w);
 assert.equal(result.status,'UPDATED');
 assert.equal(result.mergeAuthorized,false);
 assert.equal(w.updated(),1);
});
test('no owner PAT, real Core failure, unverified log or unsupported ancestry never mutates',async()=>{
 for(const cases of [
  {logs:'Real source assertion failed'},
  {jobs:jobs.map(j=>j.name==='core-lint-types-build'?{...j,conclusion:'failure'}:j)},
  {compare:{status:'diverged'}},
  {branch:{protected:false}},
  {pr:{labels:[{name:'hh:hold'}]}},
  {pr:{draft:true}},
  {pr:{mergeable:false,mergeable_state:'dirty'}},
  {event:{head_sha:'d'.repeat(40)}}
 ]){
  const w=world(cases),result=await run(w);
  assert.equal(result.status,'SKIPPED');
  assert.equal(w.updated(),0,JSON.stringify(cases).slice(0,100));
 }
 const w=world();
 const result=await recoverBaseAdvanced({context:w.context,github:w.github,hasOwnerToken:false,
  now:Date.parse('2026-11-04T21:02:00Z')});
 assert.equal(result.reason,'OWNER_TOKEN_REQUIRED_FOR_NEW_CI');
 assert.equal(w.updated(),0);
});
test('changed HEAD under source lease, code review hold or base movement remains blocked',async()=>{
 for(const cases of [
  {prAfter:{...world().context.payload.workflow_run,number:3510,state:'open',draft:false,
    mergeable:true,mergeable_state:'clean',base:{ref:'codex/public-book-library',sha:LIVE},
    head:{ref:'fix/sensitive-crm',sha:'d'.repeat(40),repo:{full_name:REPO}},labels:[]}},
  {comments:[{id:1,body:'<!-- HH_PR_SWEEP_LEASE_V1 -->\n{broken-json'}]},
  {updateStatus:409}
 ]){
  const w=world(cases),r=await run(w);
  assert.equal(r.status,'SKIPPED');
  assert.equal(w.updated()===0||r.reason==='UPDATE_NOT_ACCEPTED',true);
 }
});
