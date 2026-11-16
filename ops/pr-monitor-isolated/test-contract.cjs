'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=__dirname,read=f=>fs.readFileSync(path.join(root,f),'utf8');
const html=read('index.html'),css=read('monitor.css'),js=read('monitor.js'),conf=JSON.parse(read('vercel.json'));
const sandbox={module:{exports:{}}};new vm.Script(js).runInNewContext(sandbox);
const {activity,speed,compactRecords,strictCohort,compareCIHistory,compareStrictWeekly,delay,SCHEMAS,URLS}=sandbox.module.exports;
test('one static CSS + one deferred JS; all eight main sections exist',()=>{
 assert.equal((html.match(/<script /g)||[]).length,1);
 assert.equal((html.match(/rel="stylesheet"/g)||[]).length,1);
 assert.match(html,/<script src="\/monitor\.js" defer>/);
 for(const id of ['overview','graphs','stages','ci','queue','prs','repair','issues'])assert.ok(html.includes('id="'+id+'"'),id);
 assert.match(html,/holistic-house-agents-director\.vercel\.app/);
 assert.ok(css.length>6500);assert.match(css,/@media\(max-width:750px\)/);
});
test('strict public read-only origin and 10 explicit API allowlist rewrites',()=>{
 assert.equal(conf.rewrites.length,10);
 for(const [key,url]of Object.entries(URLS)){
  if(key==='comparison')continue; // Local read-only function; no proxy rewrite.
  const route=conf.rewrites.find(x=>x.source===url.split('?')[0]);
  assert.ok(route,key);
  assert.equal(route.destination,'https://holistic-house-pr-monitor.vercel.app'+route.source);
 }
 assert.ok(!conf.rewrites.some(x=>x.source.includes('(.*)')));
 const csp=conf.headers[0].headers.find(x=>x.key==='Content-Security-Policy').value;
 assert.match(csp,/script-src 'self'/);assert.doesNotMatch(csp,/unsafe-inline/);
});
test('no client direct GitHub API calls, MutationObserver, infinite refresh loops or secrets',()=>{
 assert.doesNotMatch(js,/MutationObserver|setInterval\s*\(|api\.github\.com|raw\.githubusercontent\.com|process\.env|localStorage/);
 assert.doesNotMatch(js,/\.innerHTML\s*=/);
 assert.match(js,/AbortController/);
});
test('PR and CI activity is evidence-backed and incomplete CI stays unknown',()=>{
 const bins=Array.from({length:6},(_,i)=>({start:'2026-11-12T0'+i+':00:00Z',created:i+1,merged:i}));
 const source={schema:SCHEMAS.flow,pr:{schema:'HH_PR_ACTIVITY_CONSISTENT_V1',intervals:{hour:bins},recent:{created:3,merged:1},coverage:{complete:true},stale:false},counts:{hour:[1,2,3,4,5,6]},coverage:{counts_complete:true}};
 const one=activity(source);assert.equal(one.rows.length,6);assert.equal(one.ci,6);
 source.coverage.counts_complete=false;
 assert.equal(activity(source).ci,null);
 assert.equal(activity(source).rows[5].ci,null);
 source.schema='WRONG';
 assert.throws(()=>activity(source));
});
test('PR → Merge latency never treats absent P50 as zero',()=>{
 const source={schema:SCHEMAS.speed,period_hours:24,buckets:Array.from({length:6},(_,i)=>({start:'2026-11-12T0'+i+':00:00Z',count:i,total:{n:i,median_minutes:i?i*2:null}}))};
 const row=speed(source);assert.equal(row[0].median,null);assert.equal(row[3].median,6);
 source.buckets[0].count=-1;assert.throws(()=>speed(source));assert.equal(delay(null),'—');
});
test('compact per-PR list bounds untrusted data and keeps actual GitHub SHAs',()=>{
 const make=(i)=>[i,'a'.repeat(40),1,1791000000,1791000000+i,0,0,0,0,0,0,0,0,0,0,0];
 const source={schema:SCHEMAS.queue,pr_timestamps:{records:JSON.stringify([make(12),make(22)])}};
 const a=compactRecords(source);assert.equal(a.length,2);assert.equal(a[0].number,22);assert.equal(a[0].sha,'aaaaaaaaaa');
 source.pr_timestamps.records='INVALID JSON';assert.equal(compactRecords(source).length,0);
});

test('PR to Merge mean and median are populated from the strict created-and-merged cohort',()=>{
 assert.match(js,/put\('k-median'/);
 assert.match(js,/strictCohort\(strictRaw,strictArch,strictHours\)/);
 assert.match(js,/put\('k-median-note'/);
});

test('production cohort and data freshness are explicit and comparable',()=>{
 assert.match(URLS.stages,/hours=24&scope=production/);
 assert.match(html,/<span>Открытых PR<\/span>/);assert.match(html,/id="k-open-note"/);
 assert.match(html,/Production PR → Merge · P50/);
 assert.match(js,/d\.selection\?\.scope!=='production'/);
 assert.match(js,/среднее /);
 assert.match(js,/Есть устаревший источник/);
 assert.match(js,/Самый ранний срез/);
});

test('strict cohort: identical production time window, no old merges, additive CI stages',()=>{
 const source={schema:SCHEMAS.cohort,generated_at:'2026-11-13T20:00:00Z',
  cohort_max_hours:48,coverage:{complete:true},rows:[
   {number:1,base:'codex/public-book-library',created_at:'2026-11-13T19:00:00Z',merged_at:'2026-11-13T19:10:00Z'},
   {number:2,base:'codex/public-book-library',created_at:'2026-11-13T18:00:00Z',merged_at:'2026-11-13T19:10:00Z'},
   {number:3,base:'codex/public-book-library',created_at:'2026-11-13T19:00:00Z',merged_at:null},
   {number:4,base:'codex/bootstrap-books',created_at:'2026-11-13T19:00:00Z',merged_at:'2026-11-13T19:05:00Z'}
 ]};
 const archive={schema:SCHEMAS.archive,coverage:{history_complete:false},rows:[
  {pr:1,first_at:'2026-11-13T19:01:00Z',last_at:'2026-11-13T19:09:00Z',
   stages_ms:{workflow_wait:60000,runner_wait:60000,checks:240000,between_waves_unknown:120000,other_unknown:0},
   runs:2,repeats:1,partial:true}
 ]};
 const one=strictCohort(source,archive,1);
 assert.equal(one.n,1);assert.equal(one.created_prs,2);assert.equal(one.mean_minutes,10);
 assert.equal(one.coverage.ci_window_prs,1);assert.equal(one.coverage.partial_ci_history_prs,1);
 assert.equal(one.buckets.reduce((s,b)=>s+b.count,0),1);
 assert.ok(Math.abs(one.stage_keys.reduce((s,k)=>s+one.stages[k].contribution_mean_minutes,0)-10)<1e-8);
 assert.equal(strictCohort(source,archive,6).n,2);
 assert.throws(()=>strictCohort(source,archive,72),/NOT_COVERED/);
 source.coverage.complete=false;assert.throws(()=>strictCohort(source,archive,1),/INCOMPLETE/);
});
test('one header mean and P50 share strict cohort; missing archive is not zero',()=>{
 assert.match(html,/id="strict-mean"/);
 assert.match(html,/id="strict-stage-rows"/);
 assert.match(js,/strictHours=hours;renderStrictCohort\(\)/);
 assert.match(js,/renderStrictCohort/);
 assert.match(js,/if\(key!=='cohort'\)fn\(data\)/);
 assert.match(js,/d\?\.schema!==SCHEMAS\.stages/);
});

test('preserve independently published LIVE operational top counters while adding strict cohort',()=>{
 for(const id of ['k-ci-running','k-ci-queued','k-created-note','k-merged-note','k-open-note','strict-n'])
  assert.ok(html.includes('id="'+id+'"'),id);
 assert.match(html,/data-period="24" aria-pressed="true"/);
 assert.match(js,/function renderCILive/);assert.match(js,/function renderPeriod/);
 assert.match(js,/strictHours=hours;renderStrictCohort/);
 assert.match(js,/URLS\.period\+'\?hours='/);
 assert.match(js,/URLS\.cohort/);
 assert.match(js,/strictCohort\(strictRaw,strictArch,strictHours\)/);
});

test('weekly CI stage durations use exactly equal periods, 168h apart, without inventing absent samples',()=>{
 const mk=(id,offset,hasSample)=>({
  id,offset_hours:offset,
  period:{duration_hours:6,from:new Date(Date.parse('2026-11-16T10:00:00Z')-offset*3600000-6*3600000).toISOString(),
   to:new Date(Date.parse('2026-11-16T10:00:00Z')-offset*3600000).toISOString()},
  summary:{n:2,median_minutes:15},
  stage_breakdown:{schema:'HH_CI_JOURNEY_CONTRIBUTIONS_V1',n:2,
   mean_minutes_per_pr:{workflow_wait:4,runner_wait:7,checks:8},
   prs_with_observed_span:{workflow_wait:hasSample?2:0,runner_wait:2,checks:2}},
  job_clock_summary:{schema:'HH_CI_NAMED_JOB_CLOCK_V1',clocks:{
   core:{measured_prs:2,p50_minutes:5},specialist:{measured_prs:0,p50_minutes:null}}},
  coverage:{rows_total:2}
 });
 const d={schema:SCHEMAS.comparison,comparison_basis:'SAME_DURATION_WINDOW_SHIFTED_BY_7D_AND_14D',
  period_hours:6,periods:[mk('current',0,true),mk('week_ago',168,false)]};
 const x=compareCIHistory(d,6);assert.equal(x.hours,6);
 const workflow=x.rows.find(x=>x.key==='workflow_wait');assert.equal(workflow.current.value,4);
 assert.equal(workflow.week.value,null);assert.equal(workflow.week.n,0);
 assert.equal(x.rows.find(x=>x.key==='specialist').week.value,null);
 assert.match(html,/id="stage-comparison-rows"/);
 assert.match(js,/refreshStageWindows\(hours,stageSeq\)/);
 assert.match(js,/renderStages\(d,atStart\)/);
 d.periods[1].period.to='2026-11-16T10:00:00Z';
 assert.throws(()=>compareCIHistory(d,6),/MISMATCH|UNVERIFIED/);
 d.periods[1]=mk('week_ago',168,true);d.period_hours=24;
 assert.throws(()=>compareCIHistory(d,6),/SCHEMA/);
});

test('local same-origin weekly CI function is deployed, read-only and backed by archive receipts',()=>{
 const weekly=read('api/ci-stage-weekly.js');
 assert.equal(URLS.comparison,'/api/ci-stage-weekly');
 assert.match(weekly,/HH_CI_JOURNEY_PERIOD_COMPARISON_V1/);
 assert.match(weekly,/HH_CORE_CI_JOURNEY_SHARD_V1/);
 assert.match(weekly,/const force=false/);
 assert.doesNotMatch(weekly,/setInterval|createWorkflow|dispatch|writeFile/);
});

test('strict weekly production comparison: same Toronto clock, same cohort and additive stages',()=>{
 assert.match(html,/id="stage-ci-diagnostic-rows"/);
 assert.match(html,/смержены в выбранном периоде/);
 assert.match(js,/compareStrictWeekly\(d\?\.strict_weekly,hours\)/);
 assert.match(js,/strict_weekly=1/);
 const core=require('./api/ci-stage-weekly.js')._test;
 const utc=Date.parse('2026-11-02T17:00:00Z');
 assert.equal(new Date(core.torontoWeekAgo(utc)).toISOString(),'2026-10-26T16:00:00.000Z');
 const selected=core.strictWeeklyWindow({complete:true,search_n:3,rows:[
  {pr:1,created:Date.parse('2026-11-16T14:00:00Z'),merged:Date.parse('2026-11-16T14:12:00Z')},
  {pr:2,created:Date.parse('2026-11-16T14:04:00Z'),merged:null},
  {pr:3,created:Date.parse('2026-11-16T14:40:00Z'),merged:Date.parse('2026-11-16T17:00:00Z')}
 ]},{runs:[]},{id:'current',from:'2026-11-16T13:00:00Z',to:'2026-11-16T16:00:00Z'});
 assert.equal(selected.created_prs,3);assert.equal(selected.merged_prs,1);
 assert.equal(selected.mean_minutes,12);
 assert.equal(selected.stages.no_archive_unknown.mean_contribution_minutes,12);
 assert.equal(selected.stages.runner_wait.measured_prs,0);
 assert.equal(selected.coverage.ci_missing_prs,1);
 const keys=['before_unknown','workflow_wait','runner_wait','checks','ci_wave_unknown',
  'ci_other_unknown','after_unknown','no_archive_unknown'];
 const stages=Object.fromEntries(keys.map(key=>[key,{measured_prs:key==='no_archive_unknown'?0:1,
  mean_contribution_minutes:key==='checks'?12:0,p50_measured_minutes:key==='no_archive_unknown'?null:key==='checks'?12:0}]));
 const windowFor=(id,to)=>({id,from:new Date(to-24*3600000).toISOString(),to:new Date(to).toISOString(),
  created_prs:2,merged_prs:1,not_merged_in_window:1,mean_minutes:12,p50_minutes:12,stages,
  coverage:{search_complete:true,ci_matched_prs:1,ci_missing_prs:0,ci_invalid_prs:0}});
 const source={schema:'HH_PR_CREATED_MERGED_WEEKLY_V1',base:'codex/public-book-library',
  timezone:'America/Toronto',comparison_basis:'CREATED_AND_MERGED_WITHIN_EACH_MATCHING_WINDOW',period_hours:24,
  periods:[windowFor('current',Date.parse('2026-11-16T16:00:00Z')),
   windowFor('week_ago',Date.parse('2026-11-09T16:00:00Z'))]};
 assert.equal(compareStrictWeekly(source,24).rows.length,8);
 source.periods[1].to='2026-11-09T17:00:00Z';
 assert.throws(()=>compareStrictWeekly(source,24),/UNVERIFIED|WINDOW/);
});
