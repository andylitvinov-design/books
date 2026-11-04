'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {run,trustedEvent}=require('../scripts/ci-pr-direction-event-label.cjs');
const SHA='a'.repeat(40),OTHER='b'.repeat(40);
const base='codex/public-book-library';
const pr=(labels=[],extra={})=>({
 number:3510,title:'fix(ci): protect immediate PR stage timestamps',
 state:'open',draft:false,
 base:{ref:base},
 head:{ref:'fix/pr-stage-3510',sha:SHA,repo:{full_name:'andylitvinov-design/books'}},
 labels:labels.map(name=>({name})),...extra
});
const context=()=>({
 repo:{owner:'andylitvinov-design',repo:'books'},
 eventName:'pull_request_target',ref:'refs/heads/'+base,
 payload:{action:'opened',pull_request:pr()}
});
function fixture(initial=pr()){
 let live=initial,reads=0,writes=[];
 const github={rest:{pulls:{get:async()=>{
   reads++;return {data:live};
  }},issues:{addLabels:async args=>{
   writes.push(args);
   live={...live,labels:[...live.labels,...args.labels.map(name=>({name}))]};
   return {data:{}};
  }}}};
 return {github,writes,get reads(){return reads;}};
}
test('only signed same-repository production pull-request events are eligible',()=>{
 assert.equal(trustedEvent(context()),true);
 for(const edit of [
  c=>c.eventName='push',
  c=>c.ref='refs/heads/codex/bootstrap-books',
  c=>c.payload.action='labeled',
  c=>c.payload.pull_request.head.repo.full_name='outside/books',
  c=>c.payload.pull_request.base.ref='codex/bootstrap-books',
  c=>c.payload.pull_request.number=0,
  c=>c.payload.pull_request.head.sha='invalid'
 ]){const c=context();edit(c);assert.equal(trustedEvent(c),false);}
});
test('one existing production event seeds four informational labels with one write',async()=>{
 const f=fixture();
 const c=context();
 const first=await run({github:f.github,context:c});
 assert.equal(first.status,'SEEDED');
 assert.deepEqual(first.added,['hh:direction:platform','hh:priority:1',
  'hh:merge-priority:01','hh:merge-stage:inspect']);
 assert.equal(f.reads,1);
 assert.equal(f.writes.length,1);
 assert.deepEqual(f.writes[0].labels,first.added);
 const again=await run({github:f.github,context:c});
 assert.equal(again.status,'ALREADY_CLASSIFIED');
 assert.equal(f.writes.length,1,'repeated event must never rerun CI or relabel');
});
test('stale HEAD, merged PR, foreign source and unrelated branch do not write',async()=>{
 for(const live of [
  pr([],{head:{...pr().head,sha:OTHER}}),
  pr([],{state:'closed'}),
  pr([],{base:{ref:'codex/bootstrap-books'}}),
  pr([],{head:{...pr().head,repo:{full_name:'external/books'}}})
 ]){
  const f=fixture(live);
  const result=await run({github:f.github,context:context()});
  assert.equal(result.status,'STALE_OR_CLOSED');
  assert.equal(f.writes.length,0);
 }
});
test('never duplicate an existing contradictory stage or owner classification',async()=>{
 const f=fixture(pr(['hh:merge-stage:repair','hh:worker-claimed']));
 const r=await run({github:f.github,context:context()});
 assert.equal(r.status,'DEFER_TO_DIRECTION_WATCHER');
 assert.equal(f.writes.length,0);
});
test('dry run is read-only and missing labels are not synthetic timestamps',async()=>{
 const f=fixture();
 const r=await run({github:f.github,context:context(),dryRun:true});
 assert.equal(r.status,'WOULD_SEED');
 assert.equal(f.writes.length,0);
 assert.equal(Object.hasOwn(r,'at'),false);
});
test('existing watchdog event job seeds without another job or scheduled workflow',()=>{
 const fs=require('node:fs');
 const y=fs.readFileSync('.github/workflows/hh-pr-ten-minute-watchdog.yml','utf8');
 assert.match(y,/conflict-event-handoff:/);
 assert.match(y,/ci-pr-direction-event-label\.cjs/);
 assert.match(y,/await seedDirection\(\{github,context\}\)/);
});
