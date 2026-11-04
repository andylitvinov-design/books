'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {analyzePrTimeline,compareCreatedMergedCohorts,STAGES}=require('../scripts/ci-pr-timeline-audit.cjs');
const A='a'.repeat(40), B='b'.repeat(40),C='c'.repeat(40),T='f'.repeat(32);
const base='codex/public-book-library';
const plus=m=>new Date(Date.parse('2026-11-04T10:00:00Z')+60000*m).toISOString();
const pr={number:3390,merged:true,base:{ref:base},head:{sha:B},created_at:plus(0),merged_at:plus(90),closed_at:plus(90)};
const makeRun=(id,head,created,attempt=1)=>({id,run_attempt:attempt,name:'HH PR core release gate',
  event:'pull_request',path:'.github/workflows/hh-pr-core-release.yml@refs/pull/3390/merge',
  repository:{full_name:'andylitvinov-design/books'},head_repository:{full_name:'andylitvinov-design/books'},
  head_sha:head,head_branch:'feature/speed',
  pull_requests:[{number:3390,base:{ref:base,sha:C},head:{ref:'feature/speed',sha:head}}],
  created_at:plus(created),status:'completed',conclusion:'success'});
const makeJob=(id,run,attempt,name,c,s,e,conclusion='success')=>({
  id,run_id:run,run_attempt:attempt,name,created_at:plus(c),started_at:plus(s),completed_at:plus(e),
  status:'completed',conclusion});
const runs=[makeRun(100,A,10),makeRun(101,B,54)];
runs[0].conclusion='failure';
const jobs=[
  makeJob(1,100,1,'core-lint-types-build',10,15,25,'failure'),
  makeJob(2,100,1,'hh-specialist',10,15,23,'success'),
  makeJob(3,100,1,'hh-merge-check',25,26,28,'skipped'),
  makeJob(4,101,1,'core-lint-types-build',54,60,68,'success'),
  makeJob(5,101,1,'hh-specialist',54,60,70,'success'),
  makeJob(6,101,1,'hh-merge-check',70,72,75,'success')
];
const stage=(s,min,head=A)=>({kind:'stage',stage:s,pr:3390,head,at:plus(min),task:T,
  newHead:s==='source_published'?B:undefined,verified:true,
  source:'github_actions_fix_step',runId:42000+min,url:`https://github.com/andylitvinov-design/books/actions/runs/${42000+min}`});
const repair=[stage('repair_started',33),stage('source_published',45)];

test('end-to-end wall clock: separate first CI, queue, jobs, repair, rerun, merge, unknown',()=>{
  const r=analyzePrTimeline({pr,runs,jobs,events:repair,now:Date.parse(plus(100))});
  assert.equal(r.elapsed_minutes,90);
  assert.equal(r.stage_totals_minutes.created_to_first_ci,10);
  assert.equal(r.stage_totals_minutes.runner_wait,5);
  assert.equal(r.stage_totals_minutes.checks,12); // 15..25 + 26..28, job idle gap stays unknown
  assert.equal(r.stage_totals_minutes.repair_after_failure,12);
  assert.equal(r.stage_totals_minutes.repeat_ci,19); // 54..60 queue + 60..70 + 72..75 checks
  assert.equal(r.stage_totals_minutes.waiting_merge,15);
  assert.equal(r.stage_totals_minutes.unattributed,17);
  assert.equal(r.reason_unproven_minutes,42); // unknown 17 + before first Core 10 + green→merge 15
  assert.equal(r.reason_unproven_ms,r.stage_totals_ms.unattributed+
    r.stage_totals_ms.created_to_first_ci+r.stage_totals_ms.waiting_merge);
  assert.equal(r.reason_provenance,'TIME_BOUNDED_NOT_ROOT_CAUSE_VERIFIED');
  assert.equal(r.repeated_attempts,1);
  assert.equal(r.failures,1);
  assert.equal(r.attempt_details[1].queue_minutes,6);
  assert(r.intervals.some(x=>x.stage==='unattributed'));
  assert(r.chronology.some(x=>x.kind==='ci_failed'&&x.url.endsWith('/job/1')));
  assert(r.intervals.every(x=>typeof x.start_at==='string' && typeof x.end_at==='string'&&
    x.duration_ms>=0 && x.reason && (x.evidence_url===null || x.evidence_url.includes('github.com'))));
  assert.equal(Object.values(r.stage_totals_ms).reduce((a,b)=>a+b,0),r.elapsed_ms);
});

test('unverified receipts, forged foreign URLs and different PR/HEAD do not attribute repair',()=>{
  const other=repair.map(e=>({...e,verified:false}));
  other.push({...repair[0],pr:999,verified:true},{...repair[1],head:C,verified:true});
  const r=analyzePrTimeline({pr,runs,jobs,events:other,now:Date.parse(plus(100))});
  assert.equal(r.stage_totals_minutes.repair_after_failure,0);
  assert.equal(r.stage_totals_minutes.unattributed,29);
});

test('unknown is retained, never turned into zero or forced CI without jobs',()=>{
  const r=analyzePrTimeline({pr,runs:[],jobs:[],events:[],now:Date.parse(plus(100))});
  assert.equal(r.stage_totals_minutes.unattributed,90);
  assert.equal(r.confirmed_attempts,0);
  assert.equal(r.stage_totals_minutes.checks,0);
  assert.equal(r.stage_totals_minutes.waiting_merge,0);
});

test('conflict time requires exact authenticated claim/source publication',()=>{
  const events=[{kind:'claimed',lane:'conflict',task:T,pr:3390,head:B,at:plus(78),verified:true,runId:800},
    {kind:'source_committed',lane:'conflict',task:T,pr:3390,head:B,at:plus(82),newHead:C,verified:true,runId:801}];
  const r=analyzePrTimeline({pr,runs:[],jobs:[],events,now:Date.parse(plus(100))});
  assert.equal(r.stage_totals_minutes.conflict_resolution,4);
  assert.equal(r.stage_totals_minutes.unattributed,86);
});

test('competing buckets are explicitly unattributed rather than double counted',()=>{
  const e=[stage('repair_started',26),stage('source_published',29)];
  const r=analyzePrTimeline({pr,runs,jobs,events:e,now:Date.parse(plus(100))});
  assert(r.intervals.some(x=>x.substage==='ambiguous_overlap'));
  assert.equal(Object.values(r.stage_totals_ms).reduce((a,b)=>a+b,0),r.elapsed_ms);
});

test('the first accepted run without jobs cannot turn the next CI into a first run',()=>{
  const r=analyzePrTimeline({pr,runs,jobs:jobs.slice(3),now:Date.parse(plus(100))});
  assert.equal(r.stage_totals_minutes.checks,0);
  assert.equal(r.stage_totals_minutes.repeat_ci,19);
  assert.equal(r.repeated_attempts,1);
});

test('cohorts include ONLY PRs created AND merged within each exact day, no open or cross-day PRs',()=>{
  const result=compareCreatedMergedCohorts({prs:[pr,{...pr,number:3391,merged:false,merged_at:null}],
    runs,jobs,events:repair,periods:[
      {label:'today',start:plus(0),end:plus(1440)},
      {label:'last_week',start:'2026-10-28T00:00:00Z',end:'2026-10-29T00:00:00Z'}],
    now:Date.parse('2026-11-05T12:00:00Z')});
  assert.equal(result.periods[0].sample_prs,1);
  assert.equal(result.periods[1].sample_prs,0);
  assert.equal(result.periods[1].average_total_minutes,null);
  assert.equal(result.periods[0].average_total_minutes,90);
  assert.deepEqual(Object.keys(result.periods[0].averages_minutes),STAGES);
});

test('open and closed-without-merge remain distinct from merged',()=>{
  const now=Date.parse(plus(50));
  const open=analyzePrTimeline({pr:{number:3390,base:{ref:base},head:{sha:A},created_at:plus(0),merged_at:null,closed_at:null,merged:false},now});
  assert.equal(open.state,'open');assert.equal(open.elapsed_minutes,50);
  const closed=analyzePrTimeline({pr:{number:3390,base:{ref:base},head:{sha:A},created_at:plus(0),closed_at:plus(40),merged_at:null,merged:false},now});
  assert.equal(closed.state,'closed_without_merge');
  assert.equal(closed.stage_totals_minutes.waiting_merge,0);
});

test('reject other branch and unverifiable timestamps',()=>{
  assert.throws(()=>analyzePrTimeline({pr:{...pr,base:{ref:'codex/bootstrap-books'}}}),/INVALID_PRODUCTION_PR/);
  assert.throws(()=>analyzePrTimeline({pr:{...pr,merged_at:plus(-1)}}),/INVALID_PRODUCTION_PR/);
});


test('native partial rerun proves green from latest successful required checks on unchanged HEAD',()=>{
 const rerun=makeRun(101,B,54,2);
 const list=[
  makeJob(11,101,1,'core-lint-types-build',54,60,61,'success'),
  makeJob(12,101,1,'hh-specialist',54,62,68,'failure'),
  makeJob(13,101,1,'hh-merge-check',68,69,70,'failure'),
  makeJob(14,101,2,'hh-specialist',74,75,77,'success'),
  makeJob(15,101,2,'hh-merge-check',79,80,82,'success')
 ];
 const audit=analyzePrTimeline({pr,runs:[rerun],jobs:list,now:Date.parse(plus(100))});
 assert.equal(audit.stage_totals_minutes.waiting_merge,8);
 assert(audit.chronology.some(e=>e.kind==='ci_green'&&e.proof==='cumulative_rerun'));
 assert(audit.intervals.some(x=>x.stage==='waiting_merge'&&x.evidence_urls.some(u=>u.endsWith('/job/15'))));
 const broken=analyzePrTimeline({pr,runs:[rerun],jobs:list.map(j=>j.id===15?{...j,conclusion:'failure'}:j),now:Date.parse(plus(100))});
 assert.equal(broken.stage_totals_minutes.waiting_merge,0);
});

test('incomplete workflow inventory never claims created → the real first CI',()=>{
  const r=analyzePrTimeline({pr,runs,jobs,events:repair,now:Date.parse(plus(100)),runInventoryComplete:false});
  assert.equal(r.stage_totals_minutes.created_to_first_ci,0);
  assert(r.stage_totals_minutes.unattributed>=27);
});
