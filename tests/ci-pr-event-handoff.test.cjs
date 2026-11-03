'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {confirmedCoreEvent,run}=require('../scripts/ci-pr-event-handoff.cjs');
const event=()=>({
 repo:{owner:'andylitvinov-design',repo:'books'},
 ref:'refs/heads/codex/bootstrap-books',eventName:'workflow_run',
 payload:{workflow_run:{
  id:100,run_attempt:1,name:'HH PR core release gate',
  path:'.github/workflows/hh-pr-core-release.yml@refs/pull/1/merge',
  head_sha:'b'.repeat(40),head_branch:'codex/pr-source',
  event:'pull_request',status:'completed',conclusion:'failure',
  repository:{full_name:'andylitvinov-design/books'},
  head_repository:{full_name:'andylitvinov-design/books'},
  pull_requests:[{number:3162}]
 }}
});
test('only a trusted completed failed Core event can wake source repair',()=>{
 const good=event();
 assert.equal(confirmedCoreEvent(good),true);
 for(const fields of [
  {name:'Other workflow'},{status:'in_progress'},{conclusion:'success'},
  {path:'.github/workflows/untrusted.yml'},{event:'push'},
  {head_sha:'not-a-sha'},{run_attempt:0},
  {head_repository:{full_name:'outsider/books'}}
 ]){
  const bad=event();Object.assign(bad.payload.workflow_run,fields);
  assert.equal(confirmedCoreEvent(bad),false,JSON.stringify(fields));
 }
 const other=event();other.ref='refs/heads/untrusted';
 assert.equal(confirmedCoreEvent(other),false);
});
test('event verifies causal source failure, then dispatches only verified PR in one call',async()=>{
 const calls=[];
 const evidence={eventPrNumber:3162,verifiedSourceFailures:1,conflictLabelsQueued:0};
 const result=await run({context:event(),github:{},core:{},
  reconcileRun:async args=>{calls.push(['reconcile',args]);return evidence;},
  dispatchRun:async args=>{calls.push(['dispatch',args]);return {dispatchAccepted:1,reason:'DISPATCH_ACCEPTED'};}
 });
 assert.equal(result.outcome,'DISPATCH_ACCEPTED');
 assert.equal(result.dispatchAccepted,1);
 assert.equal(calls.length,2);
 assert.equal(calls[0][1].eventFastPath,true);
 assert.equal(calls[0][1].hasMergeToken,false);
 assert.equal(calls[1][1].focusPrNumber,3162);
});
test('no speculative dispatch for policy, incomplete evidence or stale association',async()=>{
 for(const evidence of [
  {eventPrNumber:3162,coreFailures:1,releaseGateOnly:1},
  {eventPrNumber:3162,coreFailureUnverified:1},
  {eventPrNumber:null,verifiedSourceFailures:1},
  {eventPrNumber:3162,verifiedSourceFailures:1,apiRateLimited:true}
 ]){
  let dispatched=0;
  const r=await run({context:event(),github:{},core:{},
   reconcileRun:async()=>evidence,
   dispatchRun:async()=>{dispatched++;return {dispatchAccepted:1};}});
  assert.equal(dispatched,0);
  assert.notEqual(r.outcome,'DISPATCH_ACCEPTED');
 }
});
test('cron remains a real independent backstop; Core event uses same writer lease',()=>{
 const yaml=fs.readFileSync('.github/workflows/hh-pr-ten-minute-watchdog.yml','utf8');
 const contract=fs.readFileSync('.github/workflows/hh-pr-watchdog-contract-ci.yml','utf8');
 assert.match(yaml,/cron: '6,16,26,36,46,56 \* \* \* \*'/);
 assert.match(yaml,/  failed-core-event-handoff:/);
 assert.match(yaml,/HH_CORE_EVENT_HANDOFF/);
 assert.match(yaml,/group: hh-control-tower-single-writer/);
 assert.match(yaml,/  direct-handoff:/);
 assert.match(yaml,/needs: reconcile/);
 assert.match(contract,/node --test .*ci-pr-event-handoff\.test\.cjs/);
});

test('failed Core event reads only its exact live source branch, not all open PR pages',async()=>{
 const {eventOnlyPR}=require('../scripts/ci-pr-ten-minute-watchdog.cjs');
 const head='a'.repeat(40);
 const source={number:3162,state:'open',draft:false,
  base:{ref:'codex/public-book-library'},
  head:{ref:'codex/pr-source',sha:head,repo:{full_name:'andylitvinov-design/books'}},
  labels:[]};
 const calls=[];
 const context=event();
 const github={rest:{pulls:{list:async args=>{
   calls.push(args);
   return {data:[source]};
 }}}};
 const limited=async(_label,fn)=>fn();
 const candidates=await eventOnlyPR(github,'andylitvinov-design','books',limited,context);
 assert.deepEqual(candidates,[source]);
 assert.equal(calls.length,1);
 assert.equal(calls[0].head,'andylitvinov-design:codex/pr-source');
 assert.equal(calls[0].state,'open');
 assert.equal(calls[0].per_page,100);
 assert.equal(calls[0].page,undefined);
 // Empty GitHub PR associations are legitimate if source branch is unique.
 const missingLinks=event();missingLinks.payload.workflow_run.pull_requests=[];
 assert.deepEqual(await eventOnlyPR(github,'andylitvinov-design','books',limited,missingLinks),[source]);
});
test('ambiguous, stale or foreign failed-Core callbacks never authorize targeted Repair',async()=>{
 const {eventOnlyPR}=require('../scripts/ci-pr-ten-minute-watchdog.cjs');
 const source={number:3162,state:'open',draft:false,
  base:{ref:'codex/public-book-library'},
  head:{ref:'codex/pr-source',sha:'a'.repeat(40),
    repo:{full_name:'andylitvinov-design/books'}},labels:[]};
 const limited=async(_label,fn)=>fn();
 const get=rows=>({rest:{pulls:{list:async()=>({data:rows})}}});
 const run=ctx=>eventOnlyPR(get([source]),'andylitvinov-design','books',limited,ctx);
 assert.equal(await eventOnlyPR(get([source,{...source,number:3300}]),
   'andylitvinov-design','books',limited,event()),null);
 assert.equal(await eventOnlyPR(get([]),'andylitvinov-design','books',limited,event()),null);
 const wrongLink=event();wrongLink.payload.workflow_run.pull_requests=[{number:999}];
 assert.equal(await run(wrongLink),null);
 const wrongRepo=event();wrongRepo.payload.workflow_run.head_repository.full_name='external/books';
 assert.equal(await run(wrongRepo),null);
 assert.equal(await eventOnlyPR(get([{...source,draft:true}]),
   'andylitvinov-design','books',limited,event()),null);
 assert.equal(await eventOnlyPR(get([{...source,base:{ref:'codex/bootstrap-books'}}]),
   'andylitvinov-design','books',limited,event()),null);
});
test('fast failed-Core handoff cannot wake the full Control Tower as a second hop',()=>{
 const source=fs.readFileSync('scripts/ci-pr-ten-minute-watchdog.cjs','utf8');
 assert.ok(source.includes("if (centralDispatch && !eventFastPath && !budget.exhausted)"));
 assert.ok(source.includes("inventoryScope:eventFastPath?'VERIFIED_SINGLE_CORE_EVENT_PR'"));
});
