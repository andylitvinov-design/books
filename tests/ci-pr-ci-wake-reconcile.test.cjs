'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {receiptState,provenCoreRun,reconcileCiWake}=require('../scripts/ci-pr-ci-wake-reconcile.cjs');
const {taskFor,commentBody,reservationStatus}=require('../scripts/ci-pr-task-state.cjs');
const NOW=Date.parse('2026-11-03T03:00:00Z'),SHA='a'.repeat(40),REPO='andylitvinov-design/books';
const pr={number:2169,state:'open',draft:false,user:{login:'andylitvinov-design'},
 base:{ref:'codex/public-book-library'},head:{ref:'fix/ci-2169',sha:SHA,
 repo:{full_name:REPO}},labels:[{name:'hh:ci-needed'}]};
const task=taskFor(pr,{tier:'P3'});
const bot={id:41898282,login:'github-actions[bot]',type:'Bot'};
const app={id:15368,slug:'github-actions'};
function signed(state='CI_WAKE_REQUESTED',at=new Date(NOW-30*60000).toISOString()){
 return {id:9,user:bot,performed_via_github_app:app,body:commentBody({...task,
  state,created_at:at,observed_at:at})};
}
function coreRun(changes={}){
 return {id:41570000000,name:'HH PR core release gate',event:'pull_request',
  status:'completed',conclusion:'failure',path:'.github/workflows/hh-pr-core-release.yml@refs/pull/2169/merge',
  repository:{full_name:REPO},head_repository:{full_name:REPO},
  head_branch:task.head_ref,
  head_sha:'b'.repeat(40),created_at:new Date(NOW-10*60000).toISOString(),
  pull_requests:[{number:2169,head:{sha:SHA},base:{ref:task.base_ref}}],...changes};
}
function fixture({history={total_count:0,workflow_runs:[]},comments=[signed()],live=pr,
 mergeParents=[{sha:'c'.repeat(40)},{sha:SHA}],
 jobs=[{id:125,name:'core-lint-types-build',status:'completed',conclusion:'failure',
    started_at:new Date(NOW-9*60000).toISOString(),
    runner_name:'GitHub Actions 125'}]}={}){
 const calls={comment:[],labels:[],removed:[],history:[],jobs:[]};
 const github={rest:{
  pulls:{get:async()=>({data:live})},
  actions:{listJobsForWorkflowRun:async arg=>{
    calls.jobs.push(arg);return {data:{total_count:jobs.length,jobs}};
  }},
  issues:{createComment:async arg=>{calls.comment.push(arg);return {data:{id:11}};},
   addLabels:async arg=>{calls.labels.push(arg);return {data:{}};},
   removeLabel:async arg=>{calls.removed.push(arg);return {data:{}};}}
 },request:async(route,args)=>{
  calls.history.push({route,args});
  if(route.includes('/git/commits/'))return {data:{parents:mergeParents}};
  return {data:history};
 }};
 const limited=async(_,fn)=>fn();
 const run=(opts={})=>reconcileCiWake({task,comments,now:NOW,dryRun:false,
   github,owner:'andylitvinov-design',repo:'books',limited,...opts});
 return {run,calls};
}
test('accepted CI wake remains pending, not ALREADY_HANDLED or real Core proof',()=>{
 const comments=[signed()];
 assert.equal(reservationStatus(task,comments,NOW),'CI_WAKE_AWAITING_CORE');
 assert.equal(receiptState(task,comments).status,'AWAITING_CORE');
});
test('authenticated exact-head PR Core event is proven despite synthetic merge SHA',async()=>{
 const f=fixture({history:{total_count:1,workflow_runs:[coreRun()]}});
 const r=await f.run();
 assert.equal(r.state,'CI_CORE_CONFIRMED');
 assert.equal(r.coreRunId,41570000000);
 assert.equal(r.receiptWritten,true);
 assert.equal(r.hintCleared,true);
 assert.equal(r.manualFlagged,false);
 assert.equal(f.calls.removed.length,1);
 assert.equal(f.calls.labels.length,0);
 assert.match(f.calls.comment[0].body,/"state":"CI_CORE_CONFIRMED"/);
});
test('synthetic Core commit is rejected when current source is not its second parent',async()=>{
 const linked=coreRun();
 const f=fixture({history:{total_count:1,workflow_runs:[linked]},
   mergeParents:[{sha:SHA},{sha:'c'.repeat(40)}]});
 const r=await f.run();
 assert.equal(r.state,'CORE_SYNTHETIC_PARENT_UNVERIFIED');
 assert.equal(f.calls.removed.length,0);
 assert.equal(f.calls.comment.length,0);
});
test('same source branch, PR number only, or synthetic merge SHA cannot prove Core association',async()=>{
 for(const wrong of [
   {pull_requests:[]},
   {pull_requests:[{number:2169,head:{sha:'c'.repeat(40)},base:{ref:task.base_ref}}]},
   {pull_requests:[{number:99,head:{sha:SHA},base:{ref:task.base_ref}}]},
   {path:'.github/workflows/unrelated.yml'},
   {created_at:new Date(NOW-50*60000).toISOString()}
 ]){
   assert.equal(provenCoreRun(coreRun(wrong),task,NOW-30*60000),false);
   const f=fixture({history:{total_count:1,workflow_runs:[coreRun(wrong)]}});
   const r=await f.run();
   assert.equal(r.state,'CI_WAKE_CORE_ASSOCIATION_UNVERIFIED');
   assert.equal(f.calls.comment.length,0);
   assert.equal(f.calls.removed.length,0);
 }
});
test('real GitHub Core with empty pull_requests is verified by the exact source SHA and runner',async()=>{
 const f=fixture({history:{total_count:1,workflow_runs:[coreRun({
  head_sha:SHA,pull_requests:[]
 })]}});
 const r=await f.run();
 assert.equal(r.state,'CI_CORE_CONFIRMED');
 assert.equal(r.coreJobId,125);
 assert.equal(f.calls.jobs.length,1);
 assert.equal(f.calls.removed.length,1);
 assert.match(f.calls.comment[0].body,/"core_job_id":125/);
});
test('Core workflow queued or waiting for a runner is not reported executed',async()=>{
 for(const state of ['queued','in_progress']){
  const run=coreRun({head_sha:SHA,pull_requests:[],status:state,conclusion:null});
  const waitingJob={id:125,name:'core-lint-types-build',status:'queued',conclusion:null,
    started_at:null,runner_name:null};
  const f=fixture({history:{total_count:1,workflow_runs:[run]},jobs:[waitingJob]});
  const r=await f.run();
  assert.equal(r.state,state==='queued'?'CI_CORE_QUEUED':'CI_CORE_WAITING_RUNNER');
  assert.equal(r.receiptWritten,false);
  assert.equal(f.calls.removed.length,0);
 }
});
test('Core runner in progress remains pending, not completed',async()=>{
 const running=coreRun({head_sha:SHA,pull_requests:[],status:'in_progress',conclusion:null});
 const job={id:125,name:'core-lint-types-build',status:'in_progress',conclusion:null,
    started_at:new Date(NOW-4*60000).toISOString(),runner_name:'GitHub Actions 125'};
 const f=fixture({history:{total_count:1,workflow_runs:[running]},jobs:[job]});
 const r=await f.run();
 assert.equal(r.state,'CI_CORE_RUNNING');
 assert.equal(r.receiptWritten,false);
 assert.equal(f.calls.removed.length,0);
});
test('completed workflow with skipped job or missing runner cannot be confirmed',async()=>{
 for(const job of [
  {id:125,name:'core-lint-types-build',status:'completed',conclusion:'skipped',
    started_at:null,runner_name:null},
  {id:125,name:'core-lint-types-build',status:'completed',conclusion:'success',
    started_at:new Date(NOW-3*60000).toISOString(),runner_name:null},
  {id:125,name:'other-job',status:'completed',conclusion:'success',
    started_at:new Date(NOW-3*60000).toISOString(),runner_name:'GitHub Actions 125'}
 ]){
  const f=fixture({history:{total_count:1,workflow_runs:[coreRun({head_sha:SHA,pull_requests:[]} )]},jobs:[job]});
  const r=await f.run();
  assert.notEqual(r.state,'CI_CORE_CONFIRMED');
  assert.equal(f.calls.removed.length,0);
 }
});
test('old branch history before wake is excluded from lookup, not a forever blocker',async()=>{
 const f=fixture();
 const r=await f.run();
 assert.equal(r.state,'CI_WAKE_UNDELIVERED');
 const params=f.calls.history[0].args;
 assert.equal(params.per_page,100);
 assert.match(params.created,/^>=20/);
});
test('cancelled Core is not completed Core, even when GitHub says completed',async()=>{
 const cancelled=coreRun({head_sha:SHA,pull_requests:[],conclusion:'cancelled'});
 const f=fixture({history:{total_count:1,workflow_runs:[cancelled]}});
 const r=await f.run();
 assert.equal(r.state,'CI_WAKE_UNDELIVERED');
 assert.equal(r.coreRunId,41570000000);
 assert.match(f.calls.comment[0].body,/CORE_WORKFLOW_INTERRUPTED_BEFORE_PROOF/);
 assert.equal(f.calls.labels.length,1);
});
test('incomplete time-bounded history is not accepted as absence',async()=>{
 const f=fixture({history:{total_count:2,workflow_runs:[]}});
 const r=await f.run();
 assert.equal(r.state,'CORE_HISTORY_UNVERIFIED');
 assert.equal(f.calls.comment.length,0);
 assert.equal(f.calls.removed.length,0);
});
test('genuine zero-Core history after 20 minutes escalates once without new dispatch',async()=>{
 const f=fixture();
 const r=await f.run();
 assert.equal(r.state,'CI_WAKE_UNDELIVERED');
 assert.equal(r.receiptWritten,true);
 assert.equal(r.manualFlagged,true);
 assert.equal(r.hintCleared,true);
 assert.deepEqual(f.calls.labels[0].labels,['hh:ci-wake-unverified']);
 assert.equal(f.calls.removed[0].name,'hh:ci-needed');
 assert.match(f.calls.comment[0].body,/"state":"CI_WAKE_UNDELIVERED"/);
 assert.equal(f.calls.history.length,1);
});
test('pending less than 20 minutes cannot be escalated or re-dispatched',async()=>{
 const f=fixture({comments:[signed('CI_WAKE_REQUESTED',new Date(NOW-5*60000).toISOString())]});
 const r=await f.run();
 assert.equal(r.state,'CI_WAKE_AWAITING_CORE');
 assert.equal(f.calls.comment.length,0);
 assert.equal(f.calls.labels.length,0);
 assert.equal(f.calls.removed.length,0);
});
test('dry run produces no writes even when Core is proven',async()=>{
 const f=fixture({history:{total_count:1,workflow_runs:[coreRun()]}});
 const r=await f.run({dryRun:true});
 assert.equal(r.state,'CI_CORE_CONFIRMED');
 assert.equal(r.receiptWritten,false);
 assert.equal(f.calls.comment.length,0);
 assert.equal(f.calls.removed.length,0);
});
test('forged wake and incomplete Core history both fail closed',async()=>{
 const forged={...signed(),user:{id:3,login:'other',type:'User'}};
 const f=fixture({comments:[forged]});
 assert.equal((await f.run()).state,'NO_SIGNED_WAKE');
 assert.equal(f.calls.history.length,0);
 const incomplete=fixture({history:{total_count:2,workflow_runs:[]}});
 assert.equal((await incomplete.run()).state,'CORE_HISTORY_UNVERIFIED');
 assert.equal(incomplete.calls.comment.length,0);
});
test('changed source HEAD cannot retire queue or record false confirmation',async()=>{
 const f=fixture({history:{total_count:1,workflow_runs:[coreRun()]},
  live:{...pr,head:{...pr.head,sha:'b'.repeat(40)}}});
 assert.equal((await f.run()).state,'CI_WAKE_HEAD_OR_QUEUE_CHANGED');
 assert.equal(f.calls.comment.length,0);
 assert.equal(f.calls.removed.length,0);
});
test('previous signed confirmation cleans stale queue hint without duplicate receipt',async()=>{
 const f=fixture({comments:[signed(),signed('CI_CORE_CONFIRMED')]});
 const r=await f.run();
 assert.equal(r.state,'CONFIRMED');
 assert.equal(r.hintCleared,true);
 assert.equal(f.calls.comment.length,0);
 assert.equal(f.calls.history.length,0);
});

test('manual hold remains a cleanup-only CI lane, not a renewed dispatch permit',()=>{
 const held={...pr,labels:[{name:'hh:ci-needed'},{name:'hh:ci-wake-unverified'}]};
 const lease=taskFor(held,{tier:'P3'});
 assert.equal(lease?.lane,'ci');
 assert.equal(reservationStatus(lease,[signed('CI_WAKE_UNDELIVERED')],NOW),'CI_WAKE_OUTCOME_RECORDED');
 assert.equal(taskFor({...held,labels:[{name:'hh:ci-wake-unverified'}]},{tier:'P3'}),null);
});
test('previous undelivered signed receipt retries only label cleanup',async()=>{
 const f=fixture({comments:[signed(),signed('CI_WAKE_UNDELIVERED')]});
 const r=await f.run();
 assert.equal(r.state,'CI_WAKE_UNDELIVERED');
 assert.equal(r.receiptWritten,false);
 assert.equal(r.manualFlagged,true);
 assert.equal(r.hintCleared,true);
 assert.equal(f.calls.comment.length,0);
 assert.equal(f.calls.history.length,0);
});
