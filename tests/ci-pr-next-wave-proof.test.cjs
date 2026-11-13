'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {isExactHeadCoreRun,findExactHeadCoreRun,coreExecutionState,requestOwnerCoreWake}=require('../scripts/ci-pr-next-wave-proof.cjs');

const sha='a'.repeat(40),prNumber=4242,branch='fix/verified-next-wave';
const identity={prNumber,branch,sha,baseRef:'codex/public-book-library',
 publishedAt:Date.parse('2026-11-09T14:00:00Z')};
function run(overrides={}) {
 return {id:123,name:'HH PR core release gate',
  path:'.github/workflows/hh-pr-core-release.yml@refs/pull/4242/merge',
  event:'pull_request',status:'queued',created_at:'2026-11-09T14:00:01Z',
  head_branch:branch,head_sha:'b'.repeat(40),
  repository:{full_name:'andylitvinov-design/books'},
  head_repository:{full_name:'andylitvinov-design/books'},
  pull_requests:[{number:prNumber,head:{sha},base:{ref:'codex/public-book-library'}}],
  ...overrides};
}

test('accepts a newly created exact PR Core run even when Actions uses a synthetic merge SHA',()=>{
 assert.equal(isExactHeadCoreRun(run(),identity),true);
 assert.equal(findExactHeadCoreRun([run()],identity).id,123);
});
test('GitHub action_required with zero jobs is not a verified new-HEAD Core wave',()=>{
 const blocked=run({status:'completed',conclusion:'action_required',actor:{login:'github-actions[bot]'}});
 assert.equal(isExactHeadCoreRun(blocked,identity),false);
 assert.equal(findExactHeadCoreRun([blocked],identity),null);
 const started=run({id:124,status:'in_progress',conclusion:null});
 assert.equal(findExactHeadCoreRun([blocked,started],identity)?.id,124,
   'a pending/real Core outranks an approval-only placeholder');
 for(const denied of ['action_required','cancelled','skipped','stale','startup_failure','neutral',null])
   assert.equal(isExactHeadCoreRun(run({status:'completed',conclusion:denied}),identity),false);
 for(const executed of ['success','failure','timed_out'])
   assert.equal(isExactHeadCoreRun(run({status:'completed',conclusion:executed}),identity),true);
});
test('rejects stale, wrong-PR, wrong-HEAD, wrong-branch and foreign workflow runs',()=>{
 const cases=[
  {pull_requests:[{number:prNumber,head:{sha:'c'.repeat(40)},base:{ref:identity.baseRef}}]},
  {pull_requests:[{number:99,head:{sha},base:{ref:identity.baseRef}}]},
  {pull_requests:[{number:prNumber,head:{sha},base:{ref:'main'}}]},
  {head_branch:'fix/another'},
  {name:'Other workflow'},
  {path:'.github/workflows/untrusted.yml@refs/pull/1/merge'},
  {event:'push'},
  {status:'skipped'},
  {repository:{full_name:'foreign/books'}},
  {head_repository:{full_name:'foreign/books'}},
  {created_at:'2026-11-09T13:59:00Z'},
  {pull_requests:[]}
 ];
 for(const override of cases)assert.equal(isExactHeadCoreRun(run(override),identity),false,JSON.stringify(override));
});
test('requires complete trusted PR association and a valid source identity',()=>{
 assert.equal(isExactHeadCoreRun(run({pull_requests:null}),identity),false);
 assert.equal(isExactHeadCoreRun(run(),{...identity,sha:'bad'}),false);
 assert.equal(isExactHeadCoreRun(run(),{...identity,prNumber:0}),false);
 assert.equal(findExactHeadCoreRun({},identity),null);
});


test('signed owner Ready wake runs only for proven jobless current-HEAD Core and preserves source',async()=>{
 const sha='c'.repeat(40),number=4306,body='approved repair source';
 const pr={number,state:'open',draft:false,body,node_id:'PR_test4306',
  mergeable:true,mergeable_state:'clean',auto_merge:null,
  user:{login:'andylitvinov-design'},base:{ref:'codex/public-book-library'},
  head:{sha,ref:'fix/repair-4306',repo:{full_name:'andylitvinov-design/books'}}};
 let draft=false;const calls=[],comments=[];
 const fetchImpl=async(url,args)=>{
  calls.push({url,method:args.method});
  const path=new URL(url).pathname;
  if(path==='/user')return {ok:true,json:async()=>({login:'andylitvinov-design'})};
  if(path.endsWith('/pulls/4306'))return {ok:true,json:async()=>({...pr,draft})};
  if(path.endsWith('/issues/4306/comments')){
   if(args.method==='POST'){
    const receipt={id:77,body:JSON.parse(args.body).body,user:{login:'andylitvinov-design'}};
    comments.push(receipt);return {ok:true,json:async()=>receipt};
   }
   return {ok:true,json:async()=>comments};
  }
  if(path.endsWith('/workflows/hh-pr-core-release.yml/runs'))
   return {ok:true,json:async()=>({total_count:1,workflow_runs:[{
    id:44,event:'pull_request',head_branch:'fix/repair-4306',head_sha:sha,
    status:'completed',conclusion:'action_required',pull_requests:[]}]})};
  if(path.endsWith('/actions/runs/44/jobs'))
   return {ok:true,json:async()=>({total_count:0,jobs:[]})};
  if(path==='/graphql'){
   const request=JSON.parse(args.body);
   const action=request.query.includes('convertPullRequestToDraft')?
    'convertPullRequestToDraft':'markPullRequestReadyForReview';
   draft=action==='convertPullRequestToDraft';
   return {ok:true,json:async()=>({data:{[action]:{
    pullRequest:{id:'PR_test4306',isDraft:draft}}}})};
  }
  throw Error('unexpected owner endpoint: '+url);
 };
 const call=()=>requestOwnerCoreWake({token:'test-owner-token',prNumber:number,sha,fetchImpl});
 const first=await call();
 assert.deepEqual(first,{status:'OWNER_READY_EVENT_REQUESTED',
   sourceChanged:false,coreRunVerified:false});
 assert.equal(pr.body,body);
 assert.equal(pr.head.sha,sha);
 assert.equal(draft,false);
 assert.equal(calls.filter(c=>c.method==='PATCH').length,0);
 assert.equal(calls.filter(c=>c.url.endsWith('/graphql')).length,2);
 assert.equal(comments.length,1);
 assert.match(comments[0].body,/HH_OWNER_POST_REPAIR_CORE_READY_V2 pr=4306 sha=/);
 assert.equal((await call()).status,'OWNER_READY_ALREADY_REQUESTED');
 assert.equal(calls.filter(c=>c.url.endsWith('/graphql')).length,2,
   'no repeated Ready wave for identical SHA');
});
test('owner recovery refuses wrong identity, changed HEAD, Draft and missing zero-job proof',async()=>{
 const sha='c'.repeat(40),n=4306;
 const good={number:n,state:'open',draft:false,body:'approved',node_id:'PR_test4306',
  mergeable:true,mergeable_state:'clean',user:{login:'andylitvinov-design'},
  base:{ref:'codex/public-book-library'},
  head:{sha,ref:'fix/repair-4306',repo:{full_name:'andylitvinov-design/books'}}};
 for(const bad of [
  {user:{login:'foreign'}},{state:'closed'},{draft:true},{body:null},
  {head:{sha:'b'.repeat(40),ref:'fix/repair-4306',repo:{full_name:'andylitvinov-design/books'}}},
  {head:{sha,ref:'fix/repair-4306',repo:{full_name:'foreign/books'}}},
  {base:{ref:'main'}},{mergeable_state:'dirty'}
 ]){
  let posts=0;
  const fetchImpl=async(url,args)=>{
   if(args.method==='POST')posts++;
   return {ok:true,json:async()=>url.endsWith('/user')?
    {login:'andylitvinov-design'}:{...good,...bad}};
  };
  assert.equal((await requestOwnerCoreWake({token:'owner',prNumber:n,sha,fetchImpl})).status,
   'OWNER_WAKE_PR_HEAD_OR_SCOPE_CHANGED');
  assert.equal(posts,0);
 }
 const probe=(conclusion,jobsCount=0,runStatus='completed')=>{
  let posts=0;
  const fetchImpl=async(url,args)=>{
   if(args.method==='POST')posts++;
   const path=new URL(url).pathname;
   if(path==='/user')return {ok:true,json:async()=>({login:'andylitvinov-design'})};
   if(path.endsWith('/pulls/4306'))return {ok:true,json:async()=>good};
   if(path.endsWith('/issues/4306/comments'))return {ok:true,json:async()=>[]};
   if(path.endsWith('/workflows/hh-pr-core-release.yml/runs'))
    return {ok:true,json:async()=>({total_count:1,workflow_runs:[{
     id:44,event:'pull_request',head_sha:sha,head_branch:good.head.ref,
     status:runStatus,conclusion,pull_requests:[]}]})};
   if(path.endsWith('/actions/runs/44/jobs'))
    return {ok:true,json:async()=>({total_count:jobsCount,
     jobs:jobsCount?[{id:45}]:[]})};
   throw Error('unexpected '+url);
  };
  return {execute:()=>requestOwnerCoreWake({token:'owner',prNumber:n,sha,fetchImpl}),
   get writes(){return posts}};
 };
 for(const conclusion of ['success','failure','timed_out']){
  const f=probe(conclusion);
  assert.equal((await f.execute()).status,'OWNER_READY_EXISTING_CORE_NOT_RETRYABLE');
  assert.equal(f.writes,0);
 }
 const waiting=probe(null,0,'in_progress');
 assert.equal((await waiting.execute()).status,'OWNER_READY_CORE_ALREADY_ACTIVE');
 assert.equal(waiting.writes,0);
 const notJobless=probe('action_required',1);
 assert.equal((await notJobless.execute()).status,'OWNER_READY_ZERO_JOB_PROOF_MISSING');
 assert.equal(notJobless.writes,0);
 assert.equal((await requestOwnerCoreWake({token:'owner',prNumber:n,sha,
  fetchImpl:async()=>({ok:true,json:async()=>({login:'other'})})})).status,
  'OWNER_PAT_IDENTITY_UNVERIFIED');
 assert.equal((await requestOwnerCoreWake({token:'',prNumber:n,sha})).status,
  'OWNER_WAKE_INVALID_ARGUMENTS');
});
test('actual next-head Core requires a GitHub runner, not queued, skipped or action_required records',()=>{
 const started={id:77,name:'core-lint-types-build',status:'in_progress',
   started_at:'2026-11-11T00:17:00Z',runner_name:'GitHub Actions 1000190034'};
 assert.equal(coreExecutionState(run({status:'completed',conclusion:'action_required'}),[]),'UNVERIFIED');
 assert.equal(coreExecutionState(run({status:'queued'}),[]),'QUEUED');
 assert.equal(coreExecutionState(run({status:'in_progress'}),[{...started,status:'queued'}]),'QUEUED');
 assert.equal(coreExecutionState(run({status:'in_progress'}),[started]),'RUNNING');
 assert.equal(coreExecutionState(run({status:'in_progress'}),[{...started,runner_name:''}]),'UNVERIFIED');
 assert.equal(coreExecutionState(run({status:'completed',conclusion:'success'}),
   [{...started,status:'completed',conclusion:'success'}]),'CONFIRMED');
 assert.equal(coreExecutionState(run({status:'completed',conclusion:'failure'}),
   [{...started,status:'completed',conclusion:'failure'}]),'CONFIRMED',
   'a real red Core is executed evidence, NOT green');
 for(const denied of ['action_required','cancelled','skipped','startup_failure','neutral'])
  assert.equal(coreExecutionState(run({status:'completed',conclusion:denied}),
    [{...started,status:'completed',conclusion:'success'}]),'UNVERIFIED');
 assert.equal(coreExecutionState(run({status:'completed',conclusion:'success'}),[]),'UNVERIFIED');
 assert.equal(coreExecutionState(run({status:'completed',conclusion:'success'}),
   [{...started,status:'completed',conclusion:'skipped'}]),'UNVERIFIED');
 assert.equal(coreExecutionState(run({status:'completed',conclusion:'success'}),
   [{...started,status:'completed',conclusion:'success'},started]),'UNVERIFIED');
 assert.equal(coreExecutionState(run({status:'in_progress'}),null),'UNVERIFIED');
});


test('protected publisher wakes owner-authored Core once and cannot invent or bypass CI',()=>{
 const fs=require('node:fs');
 const wf=fs.readFileSync('.github/workflows/hh-pr-repair-worker.yml','utf8');
 const pub=wf.split('\n  publish:\n')[1].split('\n  finalize:\n')[0];
 assert.match(pub,/Verify and recover the next exact-HEAD Core CI wave/);
 assert.match(pub,/HH_NEXT_CI_OWNER_READY_WAKE/);
 assert.match(pub,/proof\.requestOwnerCoreWake/);
 assert.match(pub,/proof\.coreExecutionState/);
 assert.match(pub,/if\(outcome\.state==='PENDING'\)/);
 assert.match(pub,/if\(outcome\.state==='QUEUED'\|\|outcome\.state==='RUNNING'\)/);
 assert.match(pub,/HH_NEXT_CI_NOT_CONFIRMED/);
 assert.match(pub,/HH_NEXT_CI_FALLBACK_DISPATCHED/);
 assert.match(pub,/HH_REPAIR_REMOTE_REF VERIFIED/);
 assert.match(pub,/HH_AUTOMERGE_TOKEN: \$\{\{ secrets\.HH_AUTOMERGE_TOKEN \}\}/);
 assert.match(pub,/HH_PUBLISHED_SHA: \$\{\{ steps\.publish_source\.outputs\.publish_sha \}\}/);
 assert.match(pub,/publishedAt:firstSeen/);
 assert.match(pub,/needs\.code_verify\.result == 'success'/);
 for(const job of ['fix','code_fix','code_verify']){
  const part=wf.split('\n  '+job+':\n')[1]?.split(/\n  [a-z_]+:\n/)[0];
  assert.ok(part,'isolated '+job+' job exists');
  assert.doesNotMatch(part,/HH_AUTOMERGE_TOKEN|HH_REPAIR_JOB_TOKEN|contents: write/);
 }
 assert.doesNotMatch(pub,/--unidiff-zero|force:true|paid.fallback/i);
});
