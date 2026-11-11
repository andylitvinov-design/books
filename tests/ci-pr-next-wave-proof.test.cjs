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


test('one owner-authored metadata wake preserves exact repaired SHA and never writes source',async()=>{
 const sha='c'.repeat(40),number=4306,body='NEVER MERGE this controlled source repair';
 const sourcePr={number,state:'open',draft:false,body,user:{login:'andylitvinov-design'},
   base:{ref:'codex/public-book-library'},head:{sha,repo:{full_name:'andylitvinov-design/books'}}};
 const requests=[];
 let pr={...sourcePr};
 const fetchImpl=async(url,args)=>{
  requests.push({url,method:args.method,body:args.body||null});
  assert.equal(args.headers.Authorization,'Bearer test-owner-only-no-access');
  if(url.endsWith('/user'))return {ok:true,json:async()=>({login:'andylitvinov-design'})};
  if(args.method==='PATCH'){
   const changed=JSON.parse(args.body);
   assert.equal(typeof changed.body,'string');
   assert.deepEqual(Object.keys(changed),['body']);
   assert.equal(pr.head.sha,sha);
   pr={...pr,body:changed.body};
  }
  return {ok:true,json:async()=>pr};
 };
 const first=await requestOwnerCoreWake({
  token:'test-owner-only-no-access',prNumber:number,sha,fetchImpl});
 assert.deepEqual(first,{status:'OWNER_METADATA_EDIT_ACCEPTED',
   sourceChanged:false,coreRunVerified:false});
 assert.equal(requests.filter(x=>x.method==='PATCH').length,1);
 assert.equal(requests.filter(x=>x.method==='POST').length,0);
 assert.match(pr.body,/HH_OWNER_POST_REPAIR_CORE_WAKE_V1 pr=4306 sha=/);
 assert.equal(pr.head.sha,sha,'never rewrite source or branch ref');
 const second=await requestOwnerCoreWake({
  token:'test-owner-only-no-access',prNumber:number,sha,fetchImpl});
 assert.equal(second.status,'OWNER_WAKE_ALREADY_REQUESTED');
 assert.equal(requests.filter(x=>x.method==='PATCH').length,1,'never duplicate the same HEAD event');
});
test('owner wake refuses PAT identity mismatch, changed HEAD, foreign PR, draft and bad body',async()=>{
 const sha='c'.repeat(40),n=4306;
 const good={number:n,state:'open',draft:false,body:'NO MERGE',user:{login:'andylitvinov-design'},
  base:{ref:'codex/public-book-library'},head:{sha,repo:{full_name:'andylitvinov-design/books'}}};
 const invalid=[
  {user:{login:'untrusted-user'}},{head:{sha:'f'.repeat(40),repo:{full_name:'andylitvinov-design/books'}}},
  {head:{sha,repo:{full_name:'other/repo'}}},{base:{ref:'main'}},{draft:true},
  {state:'closed'},{body:null},{body:'x'.repeat(50001)}
 ];
 for(const variant of invalid){
  let patches=0;
  const fetchImpl=async(url,args)=>{
   if(args.method==='PATCH')patches++;
   return {ok:true,json:async()=>url.endsWith('/user')?
     {login:'andylitvinov-design'}:{...good,...variant}};
  };
  const r=await requestOwnerCoreWake({token:'safe-test',prNumber:n,sha,fetchImpl});
  assert.equal(r.status,'OWNER_WAKE_PR_HEAD_OR_SCOPE_CHANGED');
  assert.equal(patches,0);
 }
 let calls=0;
 const rejected=await requestOwnerCoreWake({token:'safe-test',prNumber:n,sha,
  fetchImpl:async()=>{calls++;return {ok:true,json:async()=>({login:'other'})}}});
 assert.equal(rejected.status,'OWNER_PAT_IDENTITY_UNVERIFIED');
 assert.equal(calls,1);
 assert.equal((await requestOwnerCoreWake({token:'',prNumber:n,sha})).status,'OWNER_WAKE_INVALID_ARGUMENTS');
 assert.equal((await requestOwnerCoreWake({token:'test',prNumber:n,sha:'wrong'})).status,'OWNER_WAKE_INVALID_ARGUMENTS');
});
test('ambiguous or denied metadata PATCH cannot be counted as real CI',async()=>{
 const sha='a'.repeat(40);
 const pr={number:4306,state:'open',draft:false,body:'safe',user:{login:'andylitvinov-design'},
  base:{ref:'codex/public-book-library'},head:{sha,repo:{full_name:'andylitvinov-design/books'}}};
 let patches=0;
 const fetchImpl=async(url,args)=>{
  if(url.endsWith('/user'))return {ok:true,json:async()=>({login:'andylitvinov-design'})};
  if(args.method==='PATCH'){patches++;return {ok:false,status:403,json:async()=>({message:'secret'})};}
  return {ok:true,json:async()=>pr};
 };
 const result=await requestOwnerCoreWake({token:'test',prNumber:4306,sha,fetchImpl});
 assert.equal(result.status,'OWNER_WAKE_EDIT_NOT_VERIFIED');
 assert.equal(result.coreRunVerified,false);
 assert.equal(patches,1);
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
