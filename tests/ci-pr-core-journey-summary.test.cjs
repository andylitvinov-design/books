'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {parse,report,summarizePR}=require('../ops/pr-monitor/api/ci-journey-summary.js')._test;
const NOW=Date.parse('2026-11-04T17:00:00.000Z');
const at=minutes=>new Date(NOW+minutes*60000).toISOString();
const job=(id,start,end)=>({id,queued_at:at(start),started_at:at(start),
  completed_at:at(end),name:'hh-core',conclusion:'success'});
const run=(pr,id,start,end,jobs=[job(id,start,end)])=>({
  pr,run_id:id,attempt:1,queued_at:at(start),completed_at:at(end),
  pr_created_at:at(start-1),merged_at:null,
  source_head:'a'.repeat(40),conclusion:'success',
  jobs,partial_jobs:false,workflow_url:'https://github.com/andylitvinov-design/books/actions/runs/'+id
});
const source=runs=>({runs,comments:1,pagination_partial:false,remaining:55,stale:false,
  fetched_at:at(-1)});
test('parallel jobs count once on real PR wall clock',()=>{
 const observed=summarizePR(12,[run(12,101,-40,-30,
   [job(201,-40,-30),job(202,-37,-32)])]);
 assert.equal(observed.elapsed_ms,600000);
 assert.equal(observed.stages_ms.checks,600000);
 assert.equal(observed.stages_ms.other_unknown,0);
});
test('gap between repeated runs stays unknown but same-HEAD evidence is recorded',()=>{
 const r1=run(13,103,-50,-45),r2=run(13,104,-42,-38);
 const row=summarizePR(13,[r1,r2]);
 assert.equal(row.runs,2);
 assert.equal(row.repeats,1);
 assert.equal(row.stages_ms.between_waves_unknown,180000);
 assert.equal(row.wave_head_evidence.same_head_count,1);
 assert.equal(row.wave_head_evidence.same_head_ms,180000);
 assert.equal(row.wave_head_evidence.new_head_count,0);
 assert.equal(row.wave_head_evidence.new_head_after_success_count,0);
 assert.equal(Object.values(row.stages_ms).reduce((a,b)=>a+b,0),row.elapsed_ms);
});
test('failed Core to next changed HEAD is distinct from a same-HEAD retry',()=>{
 const a={...run(17,207,-50,-45),conclusion:'failure'};
 const b={...run(17,208,-42,-38),source_head:'b'.repeat(40)};
 const row=summarizePR(17,[a,b]);
 assert.equal(row.wave_head_evidence.new_head_count,1);
 assert.equal(row.wave_head_evidence.new_head_ms,180000);
 assert.equal(row.wave_head_evidence.previous_failed_count,1);
 assert.equal(row.wave_head_evidence.previous_failed_ms,180000);
 assert.equal(row.wave_head_evidence.new_head_after_success_count,0);
 assert.equal(row.stages_ms.between_waves_unknown,180000);
 assert.equal(row.stages_ms.checks,540000);
});
test('Core success then changed HEAD flags review, not confirmed unnecessary source update',()=>{
 const a=run(91,901,-50,-45),b={...run(91,902,-42,-38),source_head:'b'.repeat(40)};
 const row=summarizePR(91,[a,b]);
 assert.equal(row.wave_head_evidence.new_head_after_success_count,1);
 assert.equal(row.wave_head_evidence.new_head_after_success_ms,180000);
 assert.equal(row.wave_head_evidence.new_head_count,1);
 assert.equal(row.wave_head_evidence.previous_failed_count,0);
 const cohort=report(source([a,b]),24,NOW);
 assert.equal(cohort.wave_head_evidence.new_head_after_success_count,1);
 assert.equal(cohort.wave_head_evidence.new_head_after_success_ms,180000);
 assert.equal(cohort.wave_head_evidence.total_gap_ms,180000);
 assert.equal(cohort.wave_head_evidence.reconciled,true);
});
test('overlapping Core waves never manufacture idle gap or source-repair time',()=>{
 const a=run(18,210,-50,-40);
 const b={...run(18,211,-45,-35),source_head:'b'.repeat(40)};
 const row=summarizePR(18,[a,b]);
 assert.equal(row.stages_ms.between_waves_unknown,0);
 assert.equal(row.wave_head_evidence.new_head_count,0);
 assert.equal(row.wave_head_evidence.previous_failed_count,0);
 const data=report(source([a,b]),24,NOW);
 assert.equal(data.wave_head_evidence.reconciled,true);
 assert.equal(data.wave_head_evidence.total_gap_ms,0);
});
test('cohort wave-head and idle-time sums reconcile without fabricated causes',()=>{
 const a={...run(19,219,-50,-45),conclusion:'failure'};
 const b={...run(19,220,-42,-38),source_head:'b'.repeat(40)};
 const c=run(20,221,-50,-43),d=run(20,222,-41,-37);
 const reportData=report(source([a,b,c,d]),24,NOW);
 const evidence=reportData.wave_head_evidence;
 assert.equal(evidence.n,2);
 assert.equal(evidence.reconciled,true);
 assert.equal(evidence.total_gap_count,2);
 assert.equal(evidence.transition_counts.new_head,1);
 assert.equal(evidence.transition_counts.same_head,1);
 assert.equal(evidence.after_failed_count,1);
 assert.equal(evidence.total_gap_ms,reportData.stage_breakdown.stage_total_ms.between_waves_unknown);
 assert.equal(evidence.top_delays[0].pr,19);
});
test('per PR mean contributions add up to mean total in same cohort',()=>{
 const obs=report(source([
  run(12,101,-40,-30,[job(201,-40,-30),job(202,-37,-32)]),
  run(13,103,-50,-45),run(13,104,-42,-38)
 ]),24,NOW);
 const x=obs.stage_breakdown;
 assert.equal(x.n,2);
 assert.equal(obs.summary.n,2);
 assert.equal(x.reconciled,true);
 assert.equal(x.observed_elapsed_ms,Object.values(x.stage_total_ms).reduce((a,b)=>a+b,0));
 const sum=Object.values(x.mean_minutes_per_pr).reduce((a,b)=>a+b,0);
 assert.ok(Math.abs(sum-obs.summary.average_minutes)<=0.03);
 assert.ok(x.prs_with_observed_span.between_waves_unknown>=1);
});
test('sample totals cover every PR even when top list truncates at 250',()=>{
 const runs=Array.from({length:251},(_,i)=>run(i+1,i+1000,-40,-30));
 const obs=report(source(runs),24,NOW);
 assert.equal(obs.summary.n,251);
 assert.equal(obs.stage_breakdown.n,251);
 assert.equal(obs.rows.length,250);
 assert.equal(obs.coverage.rows_total,251);
 assert.equal(obs.coverage.rows_returned,250);
 assert.equal(obs.stage_breakdown.total_mean_minutes,10);
 assert.equal(obs.stage_breakdown.mean_minutes_per_pr.checks,10);
});
const B='2026-11-05T16-failure',SRC='a'.repeat(40);
const registration=(id=42068667988)=>({pr:3615,run_id:id,attempt:1,
  source_head:SRC,base:'codex/public-book-library',
  queued_at:'2026-11-05T16:50:57Z',completed_at:'2026-11-05T16:50:57Z',
  pr_created_at:'2026-11-05T16:48:54Z',conclusion:'startup_failure',
  jobs:[],partial_jobs:true,registration_only:true,
  empty_job_reason:'STARTUP_FAILURE_NO_JOBS',
  workflow_url:'https://github.com/andylitvinov-design/books/actions/runs/'+id});
const archiveComment=r=>({user:{login:'github-actions[bot]'},
  body:'<!-- HH_CORE_CI_JOURNEY_SHARD_V1:'+B+' -->\n'+
    JSON.stringify({schema:'HH_CORE_CI_JOURNEY_SHARD_V1',bucket:B,runs:[r]})});
test('jobless Core registration survives archive parse without fabricated jobs',()=>{
 const rec=parse(archiveComment(registration()));
 assert.equal(rec.length,1);
 assert.equal(rec[0].registration_only,true);
 assert.deepEqual(rec[0].jobs,[]);
 assert.equal(rec[0].partial_jobs,true);
 for(const fake of [
  {...registration(),conclusion:'success'},
  {...registration(),partial_jobs:false},
  {...registration(),attempt:2},
  {...registration(),workflow_url:'https://example.com/fake'},
  {...registration(),empty_job_reason:'OTHER'},
  {...registration(),jobs:[{id:88}]}
 ])assert.deepEqual(parse(archiveComment(fake)),[]);
 assert.deepEqual(parse({...archiveComment(registration()),user:{login:'attacker'}}),[]);
});
test('first workflow registration differs from first real job after startup failure',()=>{
 const first=registration(),second={...run(3615,9001,180,186),
   pr_created_at:first.pr_created_at,
   queued_at:'2026-11-05T20:29:20Z',
   completed_at:'2026-11-05T20:34:40Z',
   jobs:[{id:123,queued_at:'2026-11-05T20:29:21Z',
     started_at:'2026-11-05T20:29:30Z',
     completed_at:'2026-11-05T20:34:40Z',
     conclusion:'success',
     url:'https://github.com/andylitvinov-design/books/actions/runs/9001/job/123'}]};
 const row=summarizePR(3615,[first,second]);
 assert.equal(row.first_at,'2026-11-05T16:50:57.000Z');
 assert.equal(row.first_job_started_at,'2026-11-05T20:29:30Z');
 assert.equal(row.jobless_startup_runs,1);
 assert.ok(row.stages_ms.between_waves_unknown>200*60000);
 assert.equal(row.stages_ms.runner_wait,9000);
 assert.ok(row.stages_ms.checks>=5*60000);
 const snapshot=report(source([first,second]),24,Date.parse('2026-11-05T22:00:00Z'));
 assert.equal(snapshot.coverage.jobless_startup_runs,1);
 assert.equal(snapshot.summary.jobless_startup_runs,1);
 assert.equal(snapshot.stage_breakdown.reconciled,true);
});
test('jobless-only PR has coverage but cannot fake zero-minute CI success',()=>{
 const snapshot=report(source([registration()]),24,Date.parse('2026-11-05T22:00:00Z'));
 assert.equal(snapshot.coverage.jobless_startup_only_prs,1);
 assert.equal(snapshot.coverage.jobless_startup_runs,1);
 assert.equal(snapshot.summary.n,0);
 assert.equal(snapshot.summary.average_minutes,null);
 assert.deepEqual(snapshot.rows,[]);
});

test('named Core and Specialist clocks are separate from additive all-jobs time',()=>{
 const named=(id,name,start,end)=>({...job(id,start,end),name});
 const input=run(902,1902,-40,-20,[
   named(2021,'core-lint-types-build',-40,-35),
   named(2022,'hh-specialist',-35,-23),
   named(2023,'hh-merge-check',-23,-22),
   named(2024,'browser',-36,-20)
 ]);
 const row=summarizePR(902,[input]);
 assert.equal(row.stages_ms.checks,20*60000);
 assert.equal(row.job_clock_ms.core,5*60000);
 assert.equal(row.job_clock_ms.specialist,12*60000);
 assert.equal(row.job_clock_ms.merge_gate,60000);
 const data=report(source([input]),24,NOW);
 assert.equal(data.job_clock_summary.clocks.core.mean_minutes,5);
 assert.equal(data.job_clock_summary.clocks.specialist.mean_minutes,12);
 assert.equal(data.job_clock_summary.clocks.merge_gate.mean_minutes,1);
 assert.equal(data.stage_breakdown.reconciled,true);
});
test('overlapping same-name jobs are unioned; missing jobs remain null',()=>{
 const named=(id,start,end)=>({...job(id,start,end),name:'core-lint-types-build'});
 const input=run(903,1903,-30,-20,[named(3001,-30,-23),named(3002,-28,-20)]);
 const row=summarizePR(903,[input]);
 assert.equal(row.job_clock_ms.core,10*60000);
 assert.equal(row.job_clock_ms.specialist,null);
 const reportData=report(source([input]),24,NOW);
 assert.equal(reportData.job_clock_summary.clocks.core.mean_minutes,10);
 assert.equal(reportData.job_clock_summary.clocks.specialist.mean_minutes,null);
 assert.equal(reportData.job_clock_summary.clocks.specialist.measured_prs,0);
});

test('PR drilldown distinguishes current exact-head policy blockers from historical wave causes',()=>{
 const {parsePrBlockerContext,attachWaveBlockerEvidence}=require('../ops/pr-monitor/api/ci-journey-summary.js')._test;
 const pr=4748,first=run(pr,4901,-50,-45),
  next={...run(pr,4902,-42,-38),source_head:'b'.repeat(40)};
 const detail={schema:'HH_CI_WAVE_DETAIL_V1',waves:summarizePR(pr,[first,next]).wave_rows};
 const eventAt=at(-44);
 const events=[{event:'labeled',created_at:eventAt,label:{name:'hh:repair-manual'},
   actor:{login:'github-actions[bot]'}},{event:'labeled',created_at:at(-60),
   label:{name:'hh:hold'},actor:{login:'github-actions[bot]'}}];
 const live={number:pr,state:'open',mergeable:false,mergeable_state:'dirty',
   base:{ref:'codex/public-book-library'},head:{sha:'b'.repeat(40),
    repo:{full_name:'andylitvinov-design/books'}},
   labels:[{name:'hh:repair-manual'},{name:'hh:conflict-repair-needed'}]};
 const c=parsePrBlockerContext(pr,events,live);
 assert.equal(c.status,'VERIFIED');
 assert.equal(c.current_reason_code,'MERGE_CONFLICT_DIRTY_NOW');
 assert.equal(c.current_is_historical_cause,false);
 const annotated=attachWaveBlockerEvidence(detail,c);
 assert.equal(annotated.waves.length,1);
 assert.equal(annotated.waves[0].observed_blocker_events.length,1);
 assert.equal(annotated.waves[0].observed_blocker_events[0].label,'hh:repair-manual');
 assert.equal(annotated.waves[0].cause_verified,false);
 assert.equal(annotated.waves[0].observed_blocker_events[0].cause_verified,false);
});
test('untrusted, oversized, unrelated and incomplete PR evidence cannot become verified causal attribution',()=>{
 const {parsePrBlockerContext,attachWaveBlockerEvidence}=require('../ops/pr-monitor/api/ci-journey-summary.js')._test;
 const live={number:4748,state:'open',mergeable:false,mergeable_state:'dirty',
   base:{ref:'codex/public-book-library'},
   head:{sha:'a'.repeat(40),repo:{full_name:'andylitvinov-design/books'}},
   labels:[{name:'hh:repair-manual'}]};
 const event={event:'labeled',label:{name:'hh:repair-manual'},
   created_at:at(-40),actor:{login:'github-actions[bot]'}};
 assert.equal(parsePrBlockerContext(4749,[event],live).status,'UNVERIFIED');
 assert.equal(parsePrBlockerContext(4748,[event],{...live,
    head:{...live.head,repo:{full_name:'untrusted/repo'}}}).status,'UNVERIFIED');
 assert.equal(parsePrBlockerContext(4748,Array(101).fill(event),live).status,'UNVERIFIED');
 const partial=parsePrBlockerContext(4748,Array(100).fill(event),live);
 assert.equal(partial.status,'PARTIAL');assert.equal(partial.history_complete,false);
 assert.equal(attachWaveBlockerEvidence({waves:[]},{status:'UNAVAILABLE'}).waves.length,0);
});

test('public GitHub on-demand fallback identifies current policy without attributing past CI gaps',async()=>{
 const {parseGithubBlockerContext,readBrowserBlockerContext,attachBrowserBlockerContext}
 =require('../ops/pr-monitor/ci-journey-dashboard.js');
 const pr=4748,time=at(-44),events=[
  {event:'labeled',created_at:time,label:{name:'hh:repair-manual'},
   actor:{login:'github-actions[bot]'}}
 ];
 const live={number:4748,state:'open',mergeable:false,mergeable_state:'dirty',
  head:{sha:'b'.repeat(40),repo:{full_name:'andylitvinov-design/books'}},
  base:{ref:'codex/public-book-library'},
  labels:[{name:'hh:repair-manual'},{name:'hh:conflict-repair-needed'}]};
 const ctx=parseGithubBlockerContext(pr,events,live);
 assert.equal(ctx.current_reason_code,'MERGE_CONFLICT_DIRTY_NOW');
 assert.equal(ctx.current_is_historical_cause,false);
 assert.equal(ctx.observed_events.length,1);
 assert.equal(ctx.observed_events[0].cause_verified,false);
 const fetched=[];
 const fetcher=async url=>{
  fetched.push(url);
  return {ok:true,json:async()=>url.endsWith('/pulls/4748')?live:events};
 };
 const loaded=await readBrowserBlockerContext(pr,fetcher);
 assert.equal(fetched.length,2,'only one pair of bounded reads for opened PR');
 assert.equal(loaded.current_reason_code,'MERGE_CONFLICT_DIRTY_NOW');
 const one=summarizePR(pr,[{...run(pr,4901,-50,-45),conclusion:'failure'},
  {...run(pr,4902,-42,-38),source_head:'b'.repeat(40)}]).wave_rows;
 const detailed=attachBrowserBlockerContext({waves:one},loaded);
 assert.equal(detailed.waves[0].observed_blocker_events.length,1);
 assert.equal(detailed.waves[0].cause_verified,false);
 assert.equal(detailed.blocker_context.current_head,'b'.repeat(40));
});
test('browser fallback refuses foreign PR, stale/unverifiable identity and unavailable API',async()=>{
 const {parseGithubBlockerContext,readBrowserBlockerContext,attachBrowserBlockerContext}
 =require('../ops/pr-monitor/ci-journey-dashboard.js');
 const live={number:4748,state:'open',mergeable:true,mergeable_state:'clean',
  head:{sha:'b'.repeat(40),repo:{full_name:'attacker/books'}},
  base:{ref:'codex/public-book-library'},labels:[]};
 assert.equal(parseGithubBlockerContext(4748,[],live),null);
 assert.equal(parseGithubBlockerContext(4748,Array(101).fill({}),{
  ...live,head:{...live.head,repo:{full_name:'andylitvinov-design/books'}}}),null);
 const ctx=parseGithubBlockerContext(4748,Array(100).fill({}),{
  ...live,head:{...live.head,repo:{full_name:'andylitvinov-design/books'}}});
 assert.equal(ctx.status,'PARTIAL');
 assert.equal(ctx.history_complete,false);
 assert.equal(await readBrowserBlockerContext(4748,async()=>{throw Error('429')}),null);
 assert.equal(await readBrowserBlockerContext(-1,async()=>{throw Error('called')}),null);
 const original={waves:[]};
 assert.equal(attachBrowserBlockerContext(original,null),original);
});
