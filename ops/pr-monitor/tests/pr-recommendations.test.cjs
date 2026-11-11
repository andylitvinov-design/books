'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {derive}=require('../pr-recommendations.js');
const fs=require('node:fs');
const path=require('node:path');
const now=Date.parse('2026-11-09T22:00:00Z');
function sample(overrides={}){
 return {schema:'HH_CONTROL_DISPATCH_METRICS_V1',generated_at:'2026-11-09T21:59:00Z',
  checked_at:'2026-11-09T21:58:00Z',delivery_status:'HANDOFF_BLOCKED',
  counts:{dispatch_requests_accepted:0,worker_dispatches:1,verified_blocked_lower_bound:13},
  watchdog_sample:{scope:'BOUNDED_DEEP_INSPECTION',checked_at:'2026-11-09T21:58:00Z',
   inspected:16,merge_conflicts:13,core_failures:3,specialist_failures:1,specialist_policy_holds:1},
  ...overrides};
}
test('derives five actionable technical recommendations from verified bounded sample',()=>{
 const r=derive(sample(),now);
 assert.equal(r.recommendations.length,5);
 assert.equal(r.recommendations[0].confidence,'CONFIRMED_SAMPLE');
 assert.ok(r.recommendations.every(x=>x.owner&&x.blocker&&x.tests&&x.done));
 assert.match(r.recommendations[0].signal,/13 конфликтов/);
 assert.match(r.recommendations[3].signal,/HTTP accepted: 0/);
 assert.equal(r.freshness,'fresh');
});
test('uses the sample timestamp and marks delayed or stale independently of generated time',()=>{
 const x=sample({watchdog_sample:{...sample().watchdog_sample,checked_at:'2026-11-09T21:10:00Z'}});
 assert.equal(derive(x,now).freshness,'delayed');
 const y=sample({watchdog_sample:{...sample().watchdog_sample,checked_at:'2026-11-09T20:00:00Z'}});
 assert.equal(derive(y,now).freshness,'stale');
});
test('unknown counts remain unknown rather than becoming zero',()=>{
 const x=sample({watchdog_sample:{scope:'BOUNDED_DEEP_INSPECTION',checked_at:'2026-11-09T21:58:00Z'}});
 const r=derive(x,now);
 assert.match(r.recommendations[0].signal,/неизвестно/);
 assert.equal(r.recommendations[0].confidence,'NEEDS_REVALIDATION');
});
test('rejects untrusted source schemas',()=>{
 assert.throws(()=>derive({schema:'other'},now),/INVALID_CONTROL_TOWER_SCHEMA/);
});
test('does not call a future timestamp fresh',()=>{
 const x=sample({watchdog_sample:{...sample().watchdog_sample,checked_at:'2026-11-10T00:00:00Z'}});
 assert.equal(derive(x,now).freshness,'unknown');
 assert.equal(derive(x,now).ageMinutes,null);
});
test('boot injects the recommendations block without starting a polling loop',()=>{
 const boot=fs.readFileSync(path.join(__dirname,'..','pr-two-screen-boot.js'),'utf8');
 const script=fs.readFileSync(path.join(__dirname,'..','pr-recommendations.js'),'utf8');
 assert.ok(boot.includes('pr-recommendations.css'));
 assert.ok(boot.includes('pr-recommendations.js'));
 assert.ok(script.includes("fetch('/api/control-tower-stats'"));
 assert.doesNotMatch(script,/setInterval|setTimeout/);
});
