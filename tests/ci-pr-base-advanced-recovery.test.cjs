'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {
 isTrustedFailure,validatedJobEvidence,isActualBaseAdvancedLog,
 isVerifiedAdvance,classifyRecentBaseSyncs,ownerProtectedUpdate,recoverBaseAdvanced
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
  labels:[],body:'Existing customer PR body',commits:1,...options.pr};
 let updates=0,reads=0;
 const github={
  rest:{
   actions:{
    getWorkflowRun:async()=>{if(options.read403)throw Object.assign(Error('read denied'),{status:403});return {data:{id:100,run_attempt:1,status:'completed',conclusion:'failure',
     head_sha:HEAD,head_branch:'fix/sensitive-crm',path:'.github/workflows/hh-pr-core-release.yml',
     ...options.run}};},
    listJobsForWorkflowRun:async()=>({data:{total_count:jobs.length,jobs:options.jobs||jobs}})
   },
   pulls:{
    get:async()=>({data:(reads++,options.prAfter&&reads>=2?options.prAfter:pr)}),
    listCommits:async()=>({data:options.commitList??[]})
   },
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
   if(path.startsWith('PUT '))throw Error('Owner source write must not use read-only GitHub client');
   throw Error('Unexpected test API call '+path);
  }
 };
 const ownerCalls=[];
 const fetcher=async(url,request)=>{
  const path=new URL(url).pathname;
  ownerCalls.push({method:request.method,path,usesExpectedHead:request.body?.includes('expected_head_sha')||false});
  const response=(status,data)=>({ok:status>=200&&status<300,status,json:async()=>data});
  if(path==='/user')return response(200,{login:options.ownerLogin||'andylitvinov-design'});
  if(path==='/repos/andylitvinov-design/books/pulls/3510'&&request.method==='GET')
   return response(200,{...pr,...options.ownerPr});
  if(path==='/repos/andylitvinov-design/books/pulls/3510/update-branch'&&request.method==='PUT'){
   updates++;return response(options.updateStatus??202,{message:'mock update accepted'});
  }
  throw Error('Unexpected owner-only GitHub API route: '+request.method+' '+path);
 };
 return {context,github,fetcher,updated:()=>updates,reads:()=>reads,ownerCalls:()=>ownerCalls};
}
const run=w=>recoverBaseAdvanced({context:w.context,github:w.github,
 hasOwnerToken:true,ownerToken:'TEST_OWNER_TOKEN_NOT_SECRET',fetcher:w.fetcher,
 now:Date.parse('2026-11-04T21:02:00Z')});
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
  assert.equal(w.updated()===0||r.reason==='OWNER_BRANCH_UPDATE_HTTP_409',true);
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

test('owner-only write proves trusted PAT identity and keeps Actions reads on GITHUB_TOKEN',async()=>{
 const w=world();
 const result=await run(w);
 assert.equal(result.status,'UPDATED');
 const calls=w.ownerCalls();
 assert.deepEqual(calls.map(x=>x.method),['GET','GET','PUT']);
 assert.ok(calls.every(x=>!x.path.includes('/actions/')&&!x.path.includes('/logs')));
 assert.equal(calls[2].usesExpectedHead,true);
 assert.equal(w.updated(),1);
});

test('owner PAT HTTP 403 cannot be confused with a successful BASE update or a failed Core test',async()=>{
 const w=world({updateStatus:403}),result=await run(w);
 assert.equal(result.status,'SKIPPED');
 assert.equal(result.reason,'OWNER_BRANCH_UPDATE_HTTP_403');
 assert.equal(result.mergeAuthorized,false);
 assert.equal(w.updated(),1,'only the verified one-shot PUT was attempted');
});

test('changed owner-view source HEAD or identity blocks update without consuming a CI wave',async()=>{
 for(const options of [
  {ownerLogin:'not-owner'},
  {ownerPr:{head:{ref:'fix/sensitive-crm',sha:'f'.repeat(40),repo:{full_name:REPO}}}},
  {ownerPr:{draft:true}},
  {ownerPr:{body:'changed by another owner'}},
 ]){
  const w=world(options),result=await run(w);
  assert.equal(result.status,'SKIPPED',JSON.stringify(options));
  assert.equal(w.updated(),0);
  assert.equal(result.reason,options.ownerLogin?'OWNER_TOKEN_IDENTITY_MISMATCH':'OWNER_PAT_PR_CHANGED');
 }
});

test('GITHUB_TOKEN read-only API 403 remains distinct from owner source-write denial',async()=>{
 const w=world({read403:true}),result=await run(w);
 assert.equal(result.status,'SKIPPED');
 assert.equal(result.reason,'READ_GITHUB_API_403');
 assert.equal(w.ownerCalls().length,0,'owner PAT must not be used to read workflow history');
 assert.equal(w.updated(),0);
});

test('owner mutation helper rejects incomplete identity without attempting protected write',async()=>{
 const answer=await ownerProtectedUpdate({
  ownerToken:'test',number:3510,head:HEAD,source:'fix/sensitive-crm',body:'body',
  fetcher:async()=>({ok:false,status:403,json:async()=>({})})
 });
 assert.deepEqual(answer,{ok:false,reason:'OWNER_IDENTITY_HTTP_403'});
});


test('real GitHub HEAD-anchored base-merge history counts only bounded repeated production syncs',()=>{
 const now=Date.parse('2026-11-04T21:30:00Z'),head=HEAD;
 const c=(sha,message,date,parents=2)=>({
  sha,parents:Array.from({length:parents},()=>({sha:'d'.repeat(40)})),
  commit:{message,committer:{date}}
 });
 const rows=[
  c('e'.repeat(40),'feat(video): fix actual application bug','2026-11-04T21:10:00Z',1),
  c('f'.repeat(40),"Merge branch 'codex/public-book-library' into fix/foo",'2026-11-04T21:12:00Z'),
  c(head,"Merge branch 'codex/public-book-library' into fix/foo",'2026-11-04T21:18:00Z')
 ];
 const burst=classifyRecentBaseSyncs(rows,head,now);
 assert.equal(burst.verified,true);assert.equal(burst.hold,true);assert.equal(burst.count,2);
 assert.match(burst.retryAt,/2026-11-04T22:42:00/);

 const four=[...rows.slice(0,2),c('1'.repeat(40),
  "Merge branch 'codex/public-book-library' into fix/foo",'2026-11-04T21:23:00Z'),
  c(head,"Merge branch 'codex/public-book-library' into fix/foo",'2026-11-04T21:27:00Z')];
 assert.equal(classifyRecentBaseSyncs(four,head,now).count,3);
 assert.match(classifyRecentBaseSyncs(four,head,now).retryAt,/2026-11-04T22:53:00/,
  'retry deadline must clear enough merges to fall BELOW threshold, not just the oldest');

 const realFix=[...rows.slice(0,2),{...rows[2],commit:{...rows[2].commit,message:'fix: actual failing source code'}}];
 assert.equal(classifyRecentBaseSyncs(realFix,head,now).hold,false);
 assert.equal(classifyRecentBaseSyncs([...rows.slice(0,2),{...rows[2],sha:'1'.repeat(40)}],head,now).verified,false);
 assert.equal(classifyRecentBaseSyncs(rows,head,now+92*60_000).hold,false,
  'a quiet period expires the burst, without declaring old Core green');
});
test('confirmed BASE_ADVANCED with repeated recent base merges must not write another CI HEAD',async()=>{
 const item=(sha,date)=>({sha,parents:[{sha:OLD},{sha:HEAD}],
  commit:{message:"Merge branch 'codex/public-book-library' into fix/sensitive-crm",committer:{date}}});
 const w=world({pr:{commits:3},commitList:[
  {sha:'d'.repeat(40),parents:[{sha:OLD}],commit:{message:'source',committer:{date:'2026-11-04T21:00:00Z'}}},
  item('e'.repeat(40),'2026-11-04T21:00:40Z'),
  item(HEAD,'2026-11-04T21:01:20Z')
 ]});
 const res=await run(w);
 assert.equal(res.status,'SKIPPED');assert.equal(res.reason,'BASE_SYNC_REPEAT_BURST_HOLD');
 assert.equal(res.recentSyncs,2);assert.match(res.retryAt,/2026-11-04T22:30:40/);
 assert.equal(res.mergeAuthorized,false);assert.equal(w.updated(),0);
});
test('incomplete/unverified BASE history cannot silently authorize another source update',async()=>{
 for(const opts of [
  {pr:{commits:3},commitList:[]},
  {pr:{commits:3},commitList:[{sha:HEAD}]},
  {pr:{commits:0}}
 ]){
  const w=world(opts),res=await run(w);
  assert.equal(res.status,'SKIPPED');assert.equal(w.updated(),0);
  assert.match(res.reason,/BASE_SYNC_HISTORY/);
 }
});
