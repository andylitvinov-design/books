'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs');
const {run}=require('../scripts/ci-pr-queue-dispatcher.cjs');
const SHA='a'.repeat(40);
const pr=()=>({number:3405,title:'fix: trusted source',state:'open',draft:false,
 user:{login:'andylitvinov-design'},base:{ref:'codex/public-book-library'},
 head:{ref:'codex/pr3405',sha:SHA,repo:{full_name:'andylitvinov-design/books'}},
 labels:[{name:'hh:repair-needed'}],mergeable:true,mergeable_state:'clean'});
const context={repo:{owner:'andylitvinov-design',repo:'books'},
 ref:'refs/heads/codex/bootstrap-books',eventName:'schedule',
 payload:{},runId:93005};
const core=()=>({info(){},summary:{addHeading(){return this},addCodeBlock(){return this},async write(){}}});
test('scheduled dispatcher consumes Watchdog snapshot and never lists global open PRs',async()=>{
 const reads=[];const current=pr();
 const github={rest:{
  pulls:{
   list:async args=>{reads.push(args);throw Error('DO_NOT_LIST_GLOBAL_PRS_AGAIN');},
   get:async()=>({data:current})
  },
  issues:{listComments:async()=>({data:[]})}
 }};
 const r=await run({github,core:core(),context,
  inventorySnapshot:[current],capacityFn:async()=>({known:false,reason:'NO_CAPACITY'}),dryRun:true});
 assert.equal(r.inventoryScope,'WATCHDOG_SHARED_SNAPSHOT');
 assert.equal(r.discovered,1);
 assert.equal(r.candidates,1);
 assert.equal(reads.length,0,'no open PR inventory query');
 assert.equal(r.dispatchAccepted,0);
});
test('invalid shared inventory fails closed before any GitHub PR list',async()=>{
 let requested=0;const github={rest:{pulls:{list:async()=>{requested++;}}}};
 const r=await run({github,core:core(),context,inventorySnapshot:[pr(),pr()],dryRun:true});
 assert.match(r.reason,/WATCHDOG_SNAPSHOT_UNVERIFIED/);
 assert.equal(requested,0);
});
test('shared inventory cannot be supplied by untrusted PR source events',async()=>{
 const injected={...context,eventName:'pull_request_target',
  ref:'refs/heads/codex/bootstrap-books',
  payload:{action:'opened',pull_request:{...pr(),
    number:3405,base:{ref:'codex/public-book-library'}}}};
 const r=await run({github:{rest:{}},core:core(),context:injected,
  inventorySnapshot:[pr()],dryRun:true});
 assert.equal(r.reason,'CONFLICT_EVENT_REQUIRES_SNAPSHOT');
});
test('only one scheduled Watchdog writer and no second hourly Control Tower scan',()=>{
 const w=fs.readFileSync('.github/workflows/hh-pr-ten-minute-watchdog.yml','utf8');
 const c=fs.readFileSync('.github/workflows/hh-pr-queue-dispatcher.yml','utf8');
 const watcher=fs.readFileSync('scripts/ci-pr-ten-minute-watchdog.cjs','utf8');
 assert.match(w,/group: hh-control-tower-single-writer/);
 assert.match(w,/directHandoffLocal:true/);
 assert.match(w,/inventorySnapshot:report\.prInventorySnapshot/);
 assert.match(watcher,/Object\.defineProperty\(summary,'prInventorySnapshot'/);
 assert.match(watcher,/!directHandoffLocal && !budget\.exhausted/);
 const handoff=w.split('  direct-handoff:\n')[1]?.split('\n    runs-on:')[0];
 assert.ok(handoff,'worker-completion direct handoff remains');
 assert.doesNotMatch(handoff,/github\.event_name == 'schedule'/);
 assert.ok(w.includes("cron: '6,16,26,36,46,56 * * * *'"),
  'existing bounded Watchdog schedule remains as a fallback');
 assert.doesNotMatch(c,/^  schedule:/m,'hourly duplicate Control Tower observer removed');
 assert.match(w,/  conflict-event-handoff:/,'existing conflict event route preserved');
});
