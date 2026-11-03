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
function signed(state,at=new Date(NOW-30*60000).toISOString()){
 return {id:9,user:bot,performed_via_github_app:app,body:commentBody({...task,
  state,created_at:at,observed_at:at})};
}
function coreRun(changes={}){
 return {id:41570000000,name:'HH PR core release gate',event:'pull_request',
  status:'completed',conclusion:'failure',path:'.github/workflows/hh-pr-core-release.yml@refs/pull/2169/merge',
  repository:{full_name:REPO},head_branch:task.head_ref,
  head_sha:'b'.repeat(40),created_at:new Date(NOW-10*60000).toISOString(),
  pull_requests:[{number:2169,head:{sha:SHA},base:{ref:task.base_ref}}],...changes};
}
function fixture({history={total_count:0,workflow_runs:[]},comments=[signed()],live=pr}={}){
 const calls={comment:[],labels:[],removed:[],history:[]};
 const github={rest:{
  pulls:{get:async()=>({data:live})},
  issues:{createComment:async arg=>{calls.comment.push(arg);return {data:{id:11}};},
   addLabels:async arg=>{calls.labels.push(arg);return {data:{}};},
   removeLabel:async arg=>{calls.removed.push(arg);return {data:{}};}}
 },request:async(route,args)=>{calls.history.push({route,args});return {data:history};}};
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
 assert.equal((await incomplete.run()).state,'CI_WAKE_CORE_ASSOCIATION_UNVERIFIED');
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
