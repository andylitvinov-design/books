'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const api = require('../ops/pr-monitor/api/ci-journey-summary.js')._test;

function iso(ms){return new Date(ms).toISOString();}
function makeRun(pr,runId,queuedAt,head,conclusion){
  const queued=Date.parse(queuedAt);
  const started=queued+30_000;
  const completed=queued+4*60_000;
  const jobCompleted=queued+3*60_000;
  const url='https://github.com/andylitvinov-design/books/actions/runs/'+runId;
  return {
    pr,run_id:runId,attempt:1,base:'codex/public-book-library',
    source_head:head.repeat(40).slice(0,40),queued_at:iso(queued),
    completed_at:iso(completed),pr_created_at:iso(queued-60*60_000),
    conclusion,workflow_url:url,partial_jobs:false,
    jobs:[{id:runId+1000,name:'core-lint-types-build',queued_at:iso(queued),
      started_at:iso(started),completed_at:iso(jobCompleted),url:url+'/job/'+(runId+1000)}]
  };
}

test('CI wave comparison uses three equal 24-hour windows and counts only runs queued in each window',()=>{
  const now=Date.parse('2026-11-09T12:00:00.000Z');
  const runs=[];
  const offsets=[0,168,336];
  offsets.forEach((offset,index)=>{
    const start=now-(offset+24)*60*60_000+60*60_000;
    const first=makeRun(700+index*10,900+index*10,iso(start),'a','failure');
    const secondQueued=Date.parse(first.completed_at)+15*60_000;
    const second=makeRun(700+index*10,901+index*10,iso(secondQueued),'b','success');
    runs.push(first,second);
  });
  const store={runs,comments:3,pages:1,pagination_partial:false,remaining:100,
    fetched_at:iso(now),stale:false};
  const result=api.comparePeriods(store,24,now);
  assert.equal(result.schema,'HH_CI_JOURNEY_PERIOD_COMPARISON_V1');
  assert.equal(result.comparison_basis,'SAME_DURATION_WINDOW_SHIFTED_BY_7D_AND_14D');
  assert.deepEqual(result.periods.map(p=>p.id),['current','week_ago','two_weeks_ago']);
  for(const period of result.periods){
    assert.equal(period.period.duration_hours,24);
    assert.equal(period.wave_summary.observed_prs,1);
    assert.equal(period.wave_summary.ci_runs,2);
    assert.equal(period.wave_summary.repeat_waves,1);
    assert.equal(period.wave_summary.intervals,1);
    assert.equal(period.wave_summary.new_head,1);
    assert.equal(period.wave_summary.same_head,0);
    assert.equal(period.wave_summary.unverified_head,0);
    assert.equal(period.wave_summary.after_failed,1);
    assert.equal(period.wave_summary.after_success,0);
    assert.equal(period.wave_summary.gap_total_minutes,15);
    assert.equal(period.wave_summary.gap_mean_minutes_per_pr,15);
    assert.equal(period.wave_summary.gap_p50_minutes,15);
    assert.equal(period.wave_summary.gap_p95_minutes,15);
  }
  assert.equal(Date.parse(result.periods[0].period.from)-Date.parse(result.periods[1].period.from),7*24*60*60_000);
  assert.equal(Date.parse(result.periods[1].period.from)-Date.parse(result.periods[2].period.from),7*24*60*60_000);
});

test('a wave queued outside the selected window is not counted as a wave in that period',()=>{
  const now=Date.parse('2026-11-09T12:00:00.000Z');
  const start=now-23*60*60_000;
  const prior=makeRun(811,1001,iso(start-2*60*60_000),'a','failure');
  const inWindow=makeRun(811,1002,iso(start+15*60_000),'b','success');
  const store={runs:[prior,inWindow],comments:1,pages:1,pagination_partial:false,
    remaining:100,fetched_at:iso(now),stale:false};
  const current=api.report(store,24,now,0);
  assert.equal(current.wave_summary.ci_runs,1);
  assert.equal(current.wave_summary.repeat_waves,1);
  assert.equal(current.wave_summary.intervals,1);
  assert.equal(current.wave_summary.gap_mean_minutes_per_pr,75,
    'only the 75 minutes overlapping the selected 24-hour window are attributed to this period');
  assert.equal(current.wave_summary.gap_total_minutes,75);
  assert.equal(current.wave_summary.clipped_at_window_start,1);
  const detail=api.waveDetail(store,811,24,now);
  assert.equal(detail.waves[0].duration_ms,131*60_000,
    'per-PR drilldown retains the full observed gap; only period aggregates are clipped');
  assert.equal(detail.waves[0].clipped_at_window_start,undefined);
});


test('failed workflow gap is classified by the actual failed required job',()=>{
  const now=Date.parse('2026-11-09T12:00:00.000Z');
  const start=now-23*60*60_000;
  const prior=makeRun(812,1101,iso(start+60*60_000),'a','failure');
  prior.jobs=[
    {...prior.jobs[0],conclusion:'success'},
    {id:1102,name:'hh-specialist',queued_at:prior.queued_at,
      started_at:prior.queued_at,completed_at:prior.completed_at,conclusion:'failure'},
    {id:1103,name:'hh-merge-check',queued_at:prior.queued_at,
      started_at:prior.queued_at,completed_at:prior.completed_at,conclusion:'failure'}
  ];
  const next=makeRun(812,1104,iso(Date.parse(prior.completed_at)+10*60_000),'b','success');
  const coreFailed=makeRun(813,1201,iso(start+90*60_000),'c','failure');
  coreFailed.jobs=[{...coreFailed.jobs[0],conclusion:'failure'}];
  const coreNext=makeRun(813,1202,iso(Date.parse(coreFailed.completed_at)+5*60_000),'d','success');
  const store={runs:[prior,next,coreFailed,coreNext],comments:2,pages:1,
    pagination_partial:false,remaining:100,fetched_at:iso(now),stale:false};
  const current=api.report(store,24,now);
  assert.equal(current.wave_summary.after_workflow_failure,2);
  assert.equal(current.wave_summary.after_failed,2,'legacy field remains backward compatible');
  assert.equal(current.wave_summary.after_core_failure,1);
  assert.equal(current.wave_summary.after_specialist_failure,1);
  assert.equal(current.wave_summary.after_merge_gate_failure,1);
});

test('mobile monitor keeps main stage on Created→Merged cohort and labels diagnostic archive cohort separately',()=>{
  const fs=require('node:fs'),path=require('node:path');
  const source=fs.readFileSync(path.join(__dirname,'../ops/pr-monitor/pr-two-screen.js'),'utf8');
  assert.ok(source.includes('Do not overwrite stages.ci_gaps.current'));
  assert.match(source,/Основное значение выше рассчитано по той же Created→Merged когорте/);
  assert.match(source,/После failed Core job/);
  assert.match(source,/После failed Specialist job/);
  assert.match(source,/После failed Merge Gate/);
  assert.ok(!source.includes("s.current.textContent=typeof v==='number'?duration(v):'—'"));
});
