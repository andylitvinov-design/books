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
    getCommit:async()=>({data:options.mergeCommit||{sha:'f'.repeat(40),parents:[]}}),
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

test('synthetic Core merge SHA proves source HEAD and historical tested BASE before sync',async()=>{
 const template=world().context.payload.workflow_run;
 const synthetic='d'.repeat(40);
 const w=world({
  event:{head_sha:synthetic,pull_requests:[{...template.pull_requests[0],
   base:{ref:'codex/public-book-library',sha:LIVE}}]},
  run:{head_sha:synthetic},
  mergeCommit:{sha:synthetic,parents:[{sha:OLD},{sha:HEAD}]}
 });
 const r=await run(w);
 assert.equal(r.status,'UPDATED');
 assert.equal(w.updated(),1,'one native update for exact PR source SHA');
});

test('stale manual source-repair marker does not block exact BASE_ADVANCED recovery, but a live lease still does',async()=>{
 const manual=world({pr:{labels:[{name:'hh:repair-manual'}]}});
 const manualResult=await run(manual);
 assert.equal(manualResult.status,'UPDATED');
 assert.equal(manual.updated(),1);
 const activeLease={schema:'HH_PR_SWEEP_LEASE_V1',owner:'another-source-writer',
  lease_id:'active-lease-3948',head_sha:HEAD,state:'claim',
  created_at:'2026-11-04T21:00:00.000Z',expires_at:'2026-11-04T21:10:00.000Z'};
 const held=world({pr:{labels:[{name:'hh:repair-manual'}]},
  comments:[{id:9001,user:{login:'another-owner'},body:
   '<!-- HH_PR_SWEEP_LEASE_V1 -->\n```json\n'+
   JSON.stringify(activeLease)+'\n```'}]});
 const heldResult=await run(held);
 assert.equal(heldResult.status,'SKIPPED');
 assert.equal(heldResult.reason,'ACTIVE_OR_UNVERIFIED_SOURCE_LEASE');
 assert.equal(held.updated(),0);
});

test('synthetic Core association rejects any missing or false merge-parent evidence',async()=>{
 const synthetic='d'.repeat(40);
 for(const bad of [
  {sha:synthetic,parents:[]},
  {sha:synthetic,parents:[{sha:OLD},{sha:'e'.repeat(40)}]},
  {sha:'f'.repeat(40),parents:[{sha:OLD},{sha:HEAD}]},
  {sha:synthetic,parents:[{sha:OLD}]}
 ]){
  const w=world({event:{head_sha:synthetic},run:{head_sha:synthetic},mergeCommit:bad});
  const r=await run(w);
  assert.equal(r.reason,'RUN_MERGE_PARENTS_UNVERIFIED');
  assert.equal(w.updated(),0);
 }
});
test('synthetic Core source lease is checked on PR SHA, never synthetic merge SHA',async()=>{
 const synthetic='d'.repeat(40);
 const lease={user:{login:'existing-source-writer'},body:
  '<!-- HH_PR_SWEEP_LEASE_V1 -->\n'+JSON.stringify({
   schema:'HH_PR_SWEEP_LEASE_V1',owner:'active-writer',
   lease_id:'w1',head_sha:HEAD,state:'active'
  })};
 const w=world({event:{head_sha:synthetic},run:{head_sha:synthetic},
  mergeCommit:{sha:synthetic,parents:[{sha:OLD},{sha:HEAD}]},
  comments:[lease]});
 const r=await run(w);
 assert.equal(r.reason,'ACTIVE_OR_UNVERIFIED_SOURCE_LEASE');
 assert.equal(w.updated(),0);
});
test('every independent failed-Core intake and writer checkout pins the triggering control SHA',()=>{
 const wf=require('node:fs').readFileSync('.github/workflows/hh-pr-direct-core-failure.yml','utf8');
 const checkouts=[...wf.matchAll(/uses: actions\/checkout@v4([\s\S]{0,220})/g)];
 assert.equal(checkouts.length,3,'independent intake, serialized failed-Core writer and success-side wakeup each checkout once');
 for(const checkout of checkouts){
  assert.match(checkout[1],/ref: \$\{\{ github\.sha \}\}/,
   'each workflow job stays on the exact control SHA that received the event');
  assert.match(checkout[1],/persist-credentials: false/);
 }
 assert.doesNotMatch(wf,/ref: codex\/bootstrap-books/);
});
