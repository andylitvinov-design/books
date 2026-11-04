'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {run}=require('../scripts/ci-pr-queue-dispatcher.cjs');
const SHA='a'.repeat(40);
const pr=(labels=['hh:repair-needed'])=>({
 number:3162,title:'fix(video): scoped event routing',state:'open',draft:false,
 user:{login:'andylitvinov-design'},
 base:{ref:'codex/public-book-library',sha:'b'.repeat(40)},
 head:{ref:'codex/pr-source',sha:SHA,repo:{full_name:'andylitvinov-design/books'}},
 mergeable:true,mergeable_state:'clean',labels:labels.map(name=>({name}))
});
const event=()=>({repo:{owner:'andylitvinov-design',repo:'books'},
 ref:'refs/heads/codex/bootstrap-books',eventName:'workflow_run',runId:991,
 payload:{workflow_run:{name:'HH PR core release gate',event:'pull_request',
  status:'completed',conclusion:'failure',head_branch:'codex/pr-source',
  repository:{full_name:'andylitvinov-design/books'},
  head_repository:{full_name:'andylitvinov-design/books'},
  pull_requests:[{number:3162}]}}});
const core={info(){},summary:{addHeading(){return this},addCodeBlock(){return this},async write(){}}};
function fixture(current,otherHead=null){
 const reads=[],dispatches=[];
 const github={rest:{
  pulls:{
   list:async args=>{
    reads.push(args);
    if(!args.head&&!args.base)throw Error('UNSAFE_GLOBAL_INVENTORY_READ');
    if(args.base)return {data:[]};
    return {data:otherHead?[current,otherHead]:[current]};
   },
   get:async()=>({data:current}),
   listFiles:async()=>({data:[]})
  },
  issues:{listComments:async()=>({data:[]}),createComment:async()=>({data:{id:1}})},
  actions:{createWorkflowDispatch:async args=>{dispatches.push(args);return {status:204}}},
  checks:{listForRef:async()=>({data:{check_runs:[],total_count:0}})}
 }};
 return {github,reads,dispatches};
}
test('Core event reuses the producer snapshot; only dependent/head index queries are permitted',async()=>{
 const current=pr(),f=fixture(current);
 const r=await run({github:f.github,core,context:event(),focusPrNumber:3162,
  focusPrSnapshot:current,capacityFn:async()=>({known:false,reason:'TEST'}),dryRun:true});
 assert.equal(r.eventFocused,true);
 assert.equal(r.inventoryScope,'EVENT_SINGLE_PR');
 assert.equal(r.discovered,1);
 assert.equal(f.reads.length,2);
 assert.ok(f.reads.every(x=>x.head||x.base));
 assert.equal(r.reason?.startsWith('INVENTORY_UNVERIFIED'),false);
 assert.equal(f.dispatches.length,0);
});
test('old producer fallback performs one exact branch lookup, never scans all PRs',async()=>{
 const current=pr(),f=fixture(current);
 await run({github:f.github,core,context:event(),focusPrNumber:3162,
  capacityFn:async()=>({known:false,reason:'TEST'}),dryRun:true});
 assert.ok(f.reads.length>=1);
 assert.ok(f.reads.every(x=>x.head||x.base));
 assert.equal(f.reads[0].head,'andylitvinov-design:codex/pr-source');
 assert.equal(f.reads[0].per_page,2);
});
test('mismatched producer snapshot fails closed before any GitHub inventory reads',async()=>{
 const current=pr(),f=fixture(current);
 const r=await run({github:f.github,core,context:event(),focusPrNumber:3162,
  focusPrSnapshot:{...current,number:777},dryRun:false});
 assert.equal(r.reason,'INVENTORY_UNVERIFIED: EVENT_SNAPSHOT_MISMATCH');
 assert.equal(f.reads.length,0);
 assert.equal(f.dispatches.length,0);
});
test('shared exact source branch is never claimed from a one-PR snapshot',async()=>{
 const current=pr(),other={...pr(),number:999},f=fixture(current,other);
 const r=await run({github:f.github,core,context:event(),focusPrNumber:3162,
  focusPrSnapshot:current,capacityFn:async()=>({known:true,activeWorker:{},
   activeRuns:0,queuedRuns:0,runningJobs:0,queuedJobs:0,inventoryConfidence:'VERIFIED'}),
  dryRun:false});
 assert.ok((r.blocked.SHARED_HEAD_BRANCH||0)>0);
 assert.equal(f.dispatches.length,0);
 assert.ok(f.reads.every(x=>x.head||x.base));
});
