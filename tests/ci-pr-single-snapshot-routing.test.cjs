'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {run,trustedContext}=require('../scripts/ci-pr-queue-dispatcher.cjs');
const SHA='a'.repeat(40);
const root=(labels=[],extra={})=>({
 number:3500,title:'fix: existing production PR',state:'open',draft:false,
 user:{login:'andylitvinov-design'},
 base:{ref:'codex/public-book-library',sha:'b'.repeat(40)},
 head:{ref:'codex/repair-existing',sha:SHA,repo:{full_name:'andylitvinov-design/books'}},
 mergeable:false,mergeable_state:'dirty',labels:labels.map(name=>({name})),...extra
});
const conflictEvent=()=>({repo:{owner:'andylitvinov-design',repo:'books'},
 ref:'refs/heads/codex/public-book-library',eventName:'pull_request_target',runId:244,
 payload:{action:'synchronize',pull_request:{number:3500,state:'open',draft:false,
  base:{ref:'codex/public-book-library'},
  head:{sha:SHA,repo:{full_name:'andylitvinov-design/books'}}}}
});
const manualEvent=()=>({...conflictEvent(),ref:'refs/heads/codex/bootstrap-books',
 eventName:'workflow_dispatch',payload:{inputs:{}}});
const core=()=>({info(){},summary:{addHeading(){return this},addCodeBlock(){return this},async write(){}}});
function fixture(live){
 const reads=[],mutations=[],comments=[],dispatches=[];
 const github={rest:{
  pulls:{
   get:async x=>{reads.push({type:'get',...x});return {data:live};},
   list:async x=>{
    reads.push({type:'list',...x});
    if(!x.head&&!x.base)throw Error('UNSAFE_GLOBAL_PR_INVENTORY');
    return {data:x.base?[]:[live]};
   },
   listFiles:async()=>({data:[]})
  },
  issues:{
   listComments:async()=>({data:comments}),
   addLabels:async x=>{mutations.push({type:'label',...x});
    for(const name of x.labels)if(!live.labels.some(y=>y.name===name))
     live.labels.push({name});
    return {data:[]};},
   createComment:async x=>{mutations.push({type:'comment'});
    comments.push({id:comments.length+1,body:x.body});
    return {data:{id:comments.length}};},
   removeLabel:async x=>{mutations.push({type:'remove',...x});
    live.labels=live.labels.filter(y=>y.name!==x.name);return {};}
  },
  actions:{createWorkflowDispatch:async x=>{dispatches.push(x);return {status:204};}}
 }};
 return {github,reads,mutations,comments,dispatches};
}
test('a real DIRTY event writes one manual Conflict Repair task, not source or CI',async()=>{
 const f=fixture(root());let capacityReads=0;
 const r=await run({github:f.github,core:core(),context:conflictEvent(),
  focusConflictPrNumber:3500,capacityFn:async()=>{capacityReads++;throw Error('unexpected');}});
 assert.equal(r.inventoryScope,'EVENT_SINGLE_CONFLICT_PR');
 assert.equal(r.manualConflictHandoffs,1);assert.equal(r.dispatchAccepted,0);
 assert.equal(f.dispatches.length,0);assert.equal(capacityReads,0);
 assert.equal(f.mutations.filter(m=>m.type==='comment').length,1);
 assert.ok(f.comments[0].body.includes('HH_CONTROL_CONFLICT_HANDOFF_V1 '+SHA));
 assert.ok(f.reads.filter(x=>x.type==='list').every(x=>x.head||x.base));
 assert.ok(f.mutations.some(x=>x.type==='label'&&x.labels.includes('hh:conflict-repair-needed')));
 assert.ok(f.mutations.some(x=>x.type==='label'&&x.labels.includes('hh:repair-manual')));
 const again=await run({github:f.github,core:core(),context:conflictEvent(),
  focusConflictPrNumber:3500});
 assert.equal(again.manualConflictHandoffs,0);
 assert.equal(f.comments.length,1,'no duplicate for same PR/HEAD');
});
test('clean, unknown, held and stale conflict events never enqueue work',async()=>{
 for(const specimen of [
  root([],{mergeable:true,mergeable_state:'clean'}),
  root([],{mergeable:null,mergeable_state:'unknown'}),
  root(['hh:hold']),
  root([],{head:{ref:'codex/repair-existing',sha:'c'.repeat(40),repo:{full_name:'andylitvinov-design/books'}}})
 ]){
  const f=fixture(specimen);
  const r=await run({github:f.github,core:core(),context:conflictEvent(),
   focusConflictPrNumber:3500});
  assert.equal(r.manualConflictHandoffs,0);
  assert.equal(f.mutations.length,0);
  assert.equal(f.dispatches.length,0);
  assert.ok(!f.reads.some(x=>x.type==='list'));
 }
});
test('a single Watchdog inventory can feed the same runner without any full PR list',async()=>{
 const f=fixture(root(['hh:repair-needed'],{mergeable:true,mergeable_state:'clean'}));
 const state=await run({github:f.github,core:core(),context:manualEvent(),
  inventorySnapshot:[f.github.rest ? root(['hh:repair-needed'],{mergeable:true,mergeable_state:'clean'}) : null],
  dryRun:true,capacityFn:async()=>({known:false,reason:'NO_RUNNER_CAPACITY'})});
 assert.equal(state.inventoryScope,'WATCHDOG_SHARED_SNAPSHOT');
 assert.equal(state.discovered,1);
 assert.equal(state.candidates,1);
 assert.equal(f.reads.filter(x=>x.type==='list').length,0);
 assert.equal(f.dispatches.length,0);
});
test('ambiguous shared inventory fails closed before all PR API reads',async()=>{
 const f=fixture(root());const r=await run({github:f.github,core:core(),
  context:manualEvent(),inventorySnapshot:[root(),root()]});
 assert.match(r.reason,/WATCHDOG_SNAPSHOT_UNVERIFIED/);
 assert.equal(f.reads.length,0);assert.equal(f.mutations.length,0);
});
test('an untrusted event/ref cannot route a conflict',async()=>{
 const ctx=conflictEvent();ctx.ref='refs/heads/codex/bootstrap-books';
 assert.equal(trustedContext(ctx),false);
 const f=fixture(root());const r=await run({github:f.github,core:core(),
  context:ctx,focusConflictPrNumber:3500});
 assert.equal(r.reason,'UNTRUSTED_EVENT');assert.equal(f.reads.length,0);
});