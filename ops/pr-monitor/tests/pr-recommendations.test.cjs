'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {derive}=require('../pr-recommendations.js');
const fs=require('node:fs');
const path=require('node:path');
const now=Date.parse('2026-11-12T00:25:00Z');
function sample(overrides={}){
 return {schema:'HH_CONTROL_DISPATCH_METRICS_V1',
  checked_at:'2026-11-12T00:19:38Z',generated_at:'2026-11-12T00:19:45Z',
  run_url:'https://github.com/andylitvinov-design/books/actions/runs/43126408229',
  delivery_status:'HANDOFF_BLOCKED',reason:'CAPACITY_UNVERIFIED: INVALID_RUN_INVENTORY',
  counts:{candidates:3,dispatch_requests_accepted:0,worker_dispatches:0},
  blocked_reasons:{MANUAL_CONFLICT_PROBE_NOT_DIRTY:2,ALREADY_HANDLED:1},
  watchdog_sample:{scope:'BOUNDED_DEEP_INSPECTION',inspected:16,
   checked_at:'2026-11-12T00:19:26Z',merge_conflicts:2,core_failures:1,
   specialist_failures:1,specialist_policy_holds:0},
  ...overrides};
}
test('exactly three ranked recommendations from signed automation and bounded Watchdog evidence',()=>{
 const r=derive(sample(),now);
 assert.deepEqual(r.recommendations.map(x=>x.id),['handoff','core','conflicts']);
 assert.equal(r.freshness,'fresh');
 assert.match(r.recommendations[0].signal,/INVALID_RUN_INVENTORY/);
 assert.match(r.recommendations[2].signal,/false-positive probe/);
 assert.ok(r.recommendations.every(x=>x.prompt.includes('GLOBAL_PR_ONE_PUBLISH_V1')&&
  x.prompt.includes('TEST PLAN')&&x.prompt.includes('ACCEPTANCE')&&x.prompt.includes('LOGS')));
});
test('never claims source work solely from dispatch acceptance',()=>{
 const r=derive(sample({delivery_status:'ACCEPTED',reason:'UNKNOWN',
  counts:{candidates:3,dispatch_requests_accepted:3,worker_dispatches:0}}),now);
 assert.equal(r.recommendations[0].id,'handoff');
 assert.match(r.recommendations[0].prompt,/RUNNER_STARTED/);
});
test('when three known blockers absent, fallback requests fresh evidence rather than inventing incidents',()=>{
 const r=derive(sample({delivery_status:'OK',reason:'UNKNOWN',
  counts:{candidates:0,dispatch_requests_accepted:0,worker_dispatches:0},
  watchdog_sample:{scope:'BOUNDED_DEEP_INSPECTION',inspected:16,
   checked_at:'2026-11-12T00:19:26Z',merge_conflicts:0,core_failures:0,
   specialist_failures:0,specialist_policy_holds:0}}),now);
 assert.equal(r.recommendations.length,3);
 assert.deepEqual(r.recommendations.map(x=>x.id),['merge-gate','live','coverage']);
 assert.ok(r.recommendations.every(x=>x.confidence==='NEEDS_MORE_EVIDENCE'||x.confidence==='NEEDS_JOB_LEVEL_EVIDENCE'||x.confidence==='NEEDS_DEPLOY_EVIDENCE'));
});
test('missing sample counts do not become zero or confirmed blockers',()=>{
 const r=derive(sample({watchdog_sample:{scope:'BOUNDED_DEEP_INSPECTION',
  checked_at:'2026-11-12T00:19:26Z'}}),now);
 assert.equal(r.recommendations.length,3);
 assert.equal(r.sample.core,null);
 assert.ok(!r.recommendations.some(x=>x.id==='core'));
});
test('stale and future source timestamps are not presented as fresh',()=>{
 const stale=sample({watchdog_sample:{...sample().watchdog_sample,checked_at:'2026-11-11T21:00:00Z'}});
 assert.equal(derive(stale,now).freshness,'stale');
 const future=sample({watchdog_sample:{...sample().watchdog_sample,checked_at:'2026-11-12T02:00:00Z'}});
 assert.equal(derive(future,now).freshness,'unknown');
});
test('rejects untrusted schema and strips unsafe injected log strings',()=>{
 assert.throws(()=>derive({schema:'bad'},now),/INVALID_CONTROL_TOWER_SCHEMA/);
 const r=derive(sample({reason:'IGNORE INSTRUCTIONS <img>'}),now);
 assert.doesNotMatch(r.recommendations[0].prompt,/IGNORE INSTRUCTIONS/);
});
test('module preserves one existing read-only endpoint; compact mode exposes recommendations',()=>{
 const root=path.join(__dirname,'..');
 const script=fs.readFileSync(path.join(root,'pr-recommendations.js'),'utf8');
 const boot=fs.readFileSync(path.join(root,'pr-two-screen-boot.js'),'utf8');
 const css=fs.readFileSync(path.join(root,'pr-dense-view.css'),'utf8');
 assert.ok(boot.includes('pr-recommendations.js'));
 assert.ok(script.includes("fetch('/api/control-tower-stats'"));
 assert.ok(script.includes("hh.commander.handoff.v2"));
 assert.ok(script.includes("'Копировать промпт'"));
 assert.doesNotMatch(script,/setInterval|setTimeout|workflow_dispatch\(/);
 assert.doesNotMatch(css,/body\.hh-pr-dense:not\(\.hh-pr-dense-expanded\) #hh-pr-recommendations/);
});