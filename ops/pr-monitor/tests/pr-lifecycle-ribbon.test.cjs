'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {normalize}=require('../pr-lifecycle-ribbon.js');
const d=(offset)=>new Date(Date.parse('2026-11-07T10:00:00Z')+offset*60000).toISOString();
const cp=(key,min)=>({key,at:d(min),evidence:'GITHUB_VERIFIED_EVENT',url:'https://github.com/andylitvinov-design/books/pull/1'});
const report=(checkpoints,failures=0,partial=false)=>({schema:'HH_PR_ATTRIBUTION_V1',failures,
  journey:{checkpoints,green_exact_head:true},source:{history_partial:partial}});
test('six ordered milestone labels, duration only between proven events',()=>{
 const p=normalize(report([cp('source_published',0),cp('first_ci_queued',3),cp('repair_started',8),cp('merge_gate_green',12),cp('merged',14),cp('live_verified',18)],1));
 assert.deepEqual(p.phases.map(x=>x.label),['Commit','CI','Fix','Green','Merge','LIVE']);
 assert.equal(p.phases[0].minutes_to_next,3);assert.equal(p.phases[4].minutes_to_next,4);
});
test('do not substitute PR created_at for absent commit event',()=>{
 const p=normalize(report([cp('created',0),cp('first_ci_queued',2)]));
 assert.equal(p.phases[0].status,'UNKNOWN');assert.equal(p.phases[0].minutes_to_next,null);
});
test('fix N/A for confirmed first-pass without errors and CI-to-green measured',()=>{
 const p=normalize(report([cp('first_ci_queued',2),cp('merge_gate_green',6)]));
 assert.equal(p.phases[2].status,'NOT_APPLICABLE');assert.equal(p.phases[1].minutes_to_next,4);
});
test('partial CI history invalidates stale green',()=>{
 const p=normalize(report([cp('merge_gate_green',4),cp('merged',10)],1,true));
 assert.equal(p.phases[3].status,'HISTORY_PARTIAL');assert.equal(p.phases[3].at,null);
});
test('unproven LIVE remains unknown not zero',()=>{
 const p=normalize(report([cp('merged',15)]));
 assert.equal(p.phases[5].status,'UNKNOWN');assert.equal(p.phases[4].minutes_to_next,null);
});

test('repair commit after first CI must not masquerade as initial commit',()=>{
 const p=normalize(report([cp('first_ci_queued',2),cp('source_published',8),cp('merge_gate_green',9)],1));
 assert.equal(p.phases[0].status,'UNKNOWN');
});

test('old HEAD Green is not approved for current merge',()=>{
 const x=report([cp('merge_gate_green',4),cp('merged',9)]);
 x.journey.green_exact_head=false;
 const p=normalize(x);
 assert.equal(p.phases[3].status,'UNKNOWN');
 assert.equal(p.phases[3].minutes_to_next,null);
});
