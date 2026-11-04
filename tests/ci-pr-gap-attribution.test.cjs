'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {explainPrClock,GAP_CATEGORIES}=require('../scripts/ci-pr-gap-attribution.cjs');
const REPO='https://github.com/andylitvinov-design/books';
const t=n=>`2026-11-03T13:${String(n).padStart(2,'0')}:00Z`;
const p={number:123,created_at:t(0),closed_at:t(40)};
const interval=(phase,a,b,url=`${REPO}/actions/runs/55/job/77`)=>({phase,start:t(a),end:t(b),url});
const ev=(kind,at,extra={})=>({pr:123,kind,at:t(at),source:'github_actions_run',url:`${REPO}/actions/runs/55`,...extra});
test('opaque life remains 40 minutes with cause unknown; no invented waiting',()=>{
 const r=explainPrClock({pr:p,segments:[interval('unknown',0,40)]});
 assert.equal(r.verified_cause_minutes,0);assert.equal(r.context_gap_minutes,40);
 assert.equal(r.segments.length,1);assert.equal(r.segments[0].phase,'no_matching_events');
 assert.equal(r.segments[0].causal,false);
});
test('observed first CI, queue, execution and green produce precise nonoverlapping stages',()=>{
 const a=explainPrClock({pr:p,segments:[interval('unknown',0,10),interval('runner_queue',10,15),interval('ci_initial_execution',15,20),interval('unknown',20,40)],
  observations:[ev('ci_queued',10),ev('ci_started',15),ev('ci_green',20)]});
 assert.equal(a.verified_cause_minutes,10);assert.equal(a.context_gap_minutes,30);
 assert.deepEqual(a.segments.map(s=>s.phase),['before_first_ci_observation','runner_queue','ci_initial_execution','after_green_ci_before_close']);
 assert.equal(a.segments[3].causal,false);assert.equal(a.explanation_minutes,40);
});
test('red CI → next action and source event produce separate observable gaps',()=>{
 const a=explainPrClock({pr:p,segments:[interval('unknown',0,40)],observations:[ev('ci_queued',4),ev('ci_failed',20),ev('source_published',31)]});
 assert.deepEqual(a.segments.map(s=>s.phase),[
 'before_first_ci_observation','between_checks_and_next_event','post_failed_ci_before_next_event','after_source_change_before_ci']);
 assert.equal(a.segments.reduce((n,s)=>n+s.minutes,0),40);
 assert.equal(a.segments[2].minutes,11);
});
test('historical review events split absent CI evidence without fabricating CI jobs',()=>{
 const a=explainPrClock({pr:p,segments:[interval('unknown',0,40)],observations:[ev('review_requested',12,{source:'github_issue_timeline',url:`${REPO}/pull/123`})]});
 assert.equal(a.verified_cause_minutes,0);assert.equal(a.context_gap_minutes,40);
 assert.deepEqual(a.segments.map(s=>s.phase),['between_lifecycle_events','after_review_requested']);
});
test('foreign and out-of-interval events are rejected; unknown stays transparent',()=>{
 const a=explainPrClock({pr:p,segments:[interval('unknown',0,40)],observations:[ev('ci_queued',10,{url:'https://evil.example/a'}),ev('ci_green',45),ev('source_commit',15,{head_sha:'bad'})]});
 assert.equal(a.observations.length,0);assert.equal(a.segments.length,1);
 assert.equal(a.segments[0].phase,'no_matching_events');
});
test('throws if input stage partition is corrupt rather than showing false breakdown',()=>{
 assert.throws(()=>explainPrClock({pr:p,segments:[interval('unknown',0,20),interval('unknown',21,40)]}),/PARTITION_GAPS/);
 assert.throws(()=>explainPrClock({pr:p,segments:[interval('unknown',0,24),interval('unknown',20,40)]}),/PARTITION_OVERLAP/);
});
test('categories are stable and cannot mask provenance as verified cause',()=>{
 assert.ok(GAP_CATEGORIES.includes('no_matching_events'));
 const x=explainPrClock({pr:p,segments:[interval('unknown',0,40)],observations:[ev('ci_failed',8)]});
 assert.equal(x.known_cause_pct,0);assert.ok(x.observed_gap_categories.post_failed_ci_before_next_event>0);
});