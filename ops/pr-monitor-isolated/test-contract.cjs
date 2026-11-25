'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=__dirname,read=f=>fs.readFileSync(path.join(root,f),'utf8');
const html=read('index.html'),css=read('monitor.css'),js=read('monitor.js'),conf=JSON.parse(read('vercel.json'));
const sandbox={module:{exports:{}},AbortController,setTimeout,clearTimeout};new vm.Script(js).runInNewContext(sandbox);
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
  if(key==='comparison'||key==='funnel'||key==='open')continue; // Two local read-only serverless functions; no public owner API proxy.
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
 assert.match(weekly,/strictSearchCache/);
 assert.doesNotMatch(weekly,/remaining<3/);
});

test('strict weekly production comparison: same Toronto clock, same cohort and additive stages',()=>{
 assert.match(html,/id="stage-ci-diagnostic-rows"/);
 assert.match(html,/смержены в выбранном периоде/);
 assert.match(js,/compareStrictWeekly\(d\?\.strict_weekly,hours\)/);
 assert.match(js,/strict_weekly=1/);
 assert.equal(JSON.parse(read('api/package.json')).type,'commonjs',
  'weekly serverless handler must remain CommonJS under ESM root');
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
 const now=Date.parse('2026-11-16T16:00:00Z');
 const envelope1=core.strictSearchEnvelope(core.strictRanges(1,now)[0]);
 const envelope6=core.strictSearchEnvelope(core.strictRanges(6,now)[0]);
 const envelope24=core.strictSearchEnvelope(core.strictRanges(24,now)[0]);
 assert.equal(envelope1.key,envelope6.key);
 assert.equal(envelope6.key,envelope24.key);
 assert.ok(Date.parse(envelope24.from)<=now-24*3600000);
 assert.ok(Date.parse(envelope24.to)>=now);
 assert.equal(selected.named_ci_jobs.core.measured_prs,0);
 assert.equal(selected.named_ci_jobs.core.p50_minutes,null);
 const keys=['before_unknown','workflow_wait','runner_wait','checks','ci_wave_unknown',
  'ci_other_unknown','after_unknown','no_archive_unknown'];
 const stages=Object.fromEntries(keys.map(key=>[key,{measured_prs:key==='no_archive_unknown'?0:1,
  mean_contribution_minutes:key==='checks'?12:0,p50_measured_minutes:key==='no_archive_unknown'?null:key==='checks'?12:0}]));
 const windowFor=(id,to)=>({id,from:new Date(to-24*3600000).toISOString(),to:new Date(to).toISOString(),
  created_prs:2,merged_prs:1,not_merged_in_window:1,mean_minutes:12,p50_minutes:12,stages,
  named_ci_jobs:Object.fromEntries(['core','specialist','merge_gate'].map(key=>[key,{measured_prs:1,p50_minutes:4,mean_minutes:4}])),
  coverage:{search_complete:true,ci_matched_prs:1,ci_missing_prs:0,ci_invalid_prs:0}});
 const source={schema:'HH_PR_CREATED_MERGED_WEEKLY_V1',base:'codex/public-book-library',
  timezone:'America/Toronto',comparison_basis:'CREATED_AND_MERGED_WITHIN_EACH_MATCHING_WINDOW',period_hours:24,
  periods:[windowFor('current',Date.parse('2026-11-16T16:00:00Z')),
   windowFor('week_ago',Date.parse('2026-11-09T16:00:00Z'))]};
 assert.equal(compareStrictWeekly(source,24).rows.length,8);
 assert.match(js,/NAMED_WEEKLY_CI_JOBS/);
 assert.match(js,/Отдельные CI jobs/);
 source.periods[1].to='2026-11-09T17:00:00Z';
 assert.throws(()=>compareStrictWeekly(source,24),/UNVERIFIED|WINDOW/);
});

test('error-to-GitHub signed funnel appears on the new independent dashboard with stable 10 stages',()=>{
 assert.match(html,/id="error-funnel"/);
 assert.match(html,/id="error-funnel-rows"/);
 assert.match(html,/id="error-funnel-period"/);
 assert.match(html,/value="24"/);
 assert.match(html,/value="168"/);
 assert.match(html,/value="336"/);
 for(const key of ['failed','classified','task','assigned','source_assigned','dispatched','claimed','runner','responded','committed']){
  assert.match(html,new RegExp('id="f-'+key+'"'));
 }
 assert.match(js,/function renderFunnel/);
 assert.match(js,/function funnelMissing/);
 assert.match(js,/funnelSeq/);
 assert.match(html,/Ошибка → Worker/);
 assert.match(js,/URLS\.funnel/);
 assert.doesNotMatch(JSON.stringify(conf.rewrites),/commander-chats|ci_events/);
});
test('funnel local read-only endpoint uses exact GitHub receipts and unknown rather than made-up totals',()=>{
 const source=read('api/ci-error-funnel.js');
 const weekly=read('api/ci-stage-weekly.js');
 assert.match(source,/HH_PR_REPAIR_EVIDENCE_FUNNEL_V1/);
 assert.match(source,/HH_CI_ERROR_TASK_V1/);
 assert.match(source,/HH_PR_TASK_V1/);
 assert.match(source,/HH_PR_REPAIR_OUTCOME_V1/);
 assert.match(source,/HH_PR_STAGE_V1/);
 assert.match(source,/\/git\/commits\//);
 assert.match(source,/source_published/);
 assert.match(source,/comments_read/);
 assert.match(weekly,/module\.exports\._readOnly=\{fetchArchive\}/);
 assert.doesNotMatch(source,/createWorkflow|dispatchEvent|setInterval|git\/refs\/heads|force-push|api\/commander-chats/);
 const {selectCases,inspect,STAGES}=require('./api/ci-error-funnel.js')._test;
 assert.equal(STAGES.length,10);
 const now=Date.parse('2026-11-16T18:00:00Z');
 const incident={pr:12,run_id:123,source_head:'a'.repeat(40),completed_at:'2026-11-16T17:00:00Z',conclusion:'failure',
  jobs:[{name:'core-lint-types-build',conclusion:'failure'}]};
 assert.equal(selectCases([incident],24,now).rows.length,1);
 assert.equal(selectCases([incident],24,now-86400000).rows.length,0);
 const e={pr:12,head:'a'.repeat(40),run:123,at:incident.completed_at,failure_url:'https://github.com/andylitvinov-design/books/actions/runs/123'};
 const unknown=inspect(e,[]);assert.ok(unknown.failed);
 assert.equal(unknown.claimed,null);assert.equal(unknown.committed,null);
});

test('exact PR query is optional and a signed CLAIMED is independent from edited reservations',()=>{
 const {selectCases}=require('./api/ci-error-funnel.js')._test;
 const run={pr:4220,run_id:42871460834,source_head:'d7c31ae1bd66ead236b200f8d0c6353cb633d4b9',
  completed_at:'2026-11-10T18:08:48.000Z',conclusion:'failure',jobs:[{name:'core-lint-types-build',conclusion:'failure'}]};
 const now=Date.parse('2026-11-16T18:00:00Z');
 assert.equal(selectCases([run],168,now,4220).rows.length,1);
 assert.equal(selectCases([run],168,now,4232).rows.length,0);
 assert.match(html,/id="error-funnel-find"/);
 assert.match(html,/id="error-funnel-all"/);
 assert.match(js,/funnelUrl\(funnelAtStart,funnelPRAtStart\)/);
});


test('public funnel distinguishes UNKNOWN and owner review from real classification and AI assignment',()=>{
 const {inspect}=require('./api/ci-error-funnel.js')._test;
 const head='a'.repeat(40),pr=4856,run=44014243574,at='2026-11-17T08:09:00Z';
 const e={pr,head,run,at,failure_url:'https://github.com/andylitvinov-design/books/actions/runs/'+run};
 const item={schema:'HH_CI_ERROR_TASK_V1',event_kind:'CORE_CI_FAILED',
  task_id:'a'.repeat(32),pr_number:pr,head_sha:head,run_id:run,
  category:'UNKNOWN',reason_code:'UNCLASSIFIED_FAILURE',
  executor_kind:'owner_review',executor_id:'github-owner:andylitvinov-design',
  assignment_status:'OWNER_REVIEW_REQUIRED'};
 const signed=record=>({
  id:45,user:{login:'github-actions[bot]',id:41898282,type:'Bot'},
  performed_via_github_app:{id:15368,slug:'github-actions'},
  created_at:at,updated_at:at,
  body:'<!-- HH_CI_ERROR_TASK_V1 '+record.task_id+' -->\n'+'\x60\x60\x60json\n'+JSON.stringify(record)+'\n\x60\x60\x60'
 });
 const unknown=inspect(e,[signed(item)]);
 assert.ok(unknown.task);
 assert.equal(unknown.classified,null,'UNKNOWN is not successful classification');
 assert.equal(unknown.assigned,null,'owner review is not a running AI worker');
 const classified=inspect(e,[signed({...item,category:'BASE_ADVANCED',
  reason_code:'EXPLICIT_BASE_FAILURE'})]);
 assert.ok(classified.classified);
 assert.equal(classified.assigned,null);
 const selected=inspect(e,[signed({...item,category:'SOURCE_CODE',
  reason_code:'SOURCE_BUILD_OR_LINT_FAILURE',executor_kind:'github_actions',
  executor_id:'github-actions:hh-pr-repair-worker.yml',
  assignment_status:'SELECTED_NOT_DISPATCHED'})]);
 assert.ok(selected.classified);
 assert.ok(selected.assigned);
 assert.equal(selected.dispatched,null,'candidate selection is not dispatch acknowledgement');
});


test('same-run signed reclassification is evidence, not worker execution',()=>{
 const {inspect}=require('./api/ci-error-funnel.js')._test;
 const head='a'.repeat(40),pr=4856,run=44014243574,at='2026-11-17T08:09:00Z',id='a'.repeat(32);
 const e={pr,head,run,at,failure_url:'https://github.com/andylitvinov-design/books/actions/runs/'+run};
 const old={schema:'HH_CI_ERROR_TASK_V1',task_id:id,event_kind:'CORE_CI_FAILED',
  pr_number:pr,head_sha:head,run_id:run,category:'UNKNOWN',
  reason_code:'UNCLASSIFIED_FAILURE',executor_kind:'owner_review'};
 const fixed={schema:'HH_CI_ERROR_RECLASSIFICATION_V1',task_id:id,
  pr_number:pr,head_sha:head,run_id:run,previous_category:'UNKNOWN',
  category:'BASE_ADVANCED',reason_code:'EXPLICIT_BASE_FAILURE',
  source_write_authorized:false,execution_authorized:false,executor_kind:'owner_review'};
 const comment=(n,schema,item,time)=>({id:n,created_at:time,updated_at:time,
  user:{login:'github-actions[bot]',id:41898282,type:'Bot'},
  performed_via_github_app:{id:15368,slug:'github-actions'},
  body:'<!-- '+schema+' '+id+' -->\n'+
   '\x60\x60\x60json\n'+JSON.stringify(item)+'\n\x60\x60\x60'});
 const first=comment(1,'HH_CI_ERROR_TASK_V1',old,at);
 const revised=comment(2,'HH_CI_ERROR_RECLASSIFICATION_V1',fixed,'2026-11-17T08:15:00Z');
 const a=inspect(e,[first]);assert.equal(a.classified,null);
 const b=inspect(e,[first,revised]);
 assert.ok(b.classified);assert.match(b.classified.url,/issuecomment-2$/);
 assert.equal(b.assigned,null);assert.equal(b.runner,null);
 assert.equal(inspect(e,[first,comment(3,'HH_CI_ERROR_RECLASSIFICATION_V1',
  {...fixed,head_sha:'b'.repeat(40)},at)]).classified,null);
});

test('bounded signed incident pages cover prior HEADs and keep partial-coverage honest',()=>{
 const {selectCases,EXTRA}=require('./api/ci-error-funnel.js')._test;
 const now=Date.parse('2026-11-17T14:30:00Z');
 const runs=Array.from({length:18},(_,i)=>({
  pr:4500+i,run_id:44000000000+i,source_head:(i+1).toString(16).padStart(40,'a'),
  completed_at:new Date(now-600000-i*1000).toISOString(),conclusion:'failure',
  jobs:[{name:'hh-merge-check',conclusion:'failure'}]
 }));
 const page0=selectCases(runs,24,now,null,0);
 const page1=selectCases(runs,24,now,null,1);
 const page2=selectCases(runs,24,now,null,2);
 assert.equal(page0.all,18);assert.equal(page0.rows.length,8);
 assert.equal(page1.rows.length,8);assert.equal(page2.rows.length,2);
 assert.equal(page0.pages_total,3);
 assert.ok(!page0.rows.some(x=>page1.rows.some(y=>x.pr===y.pr)));
 assert.equal(EXTRA.length,6);
 const r0={...runs[0],pr:4869},r1={...runs[1],pr:4869};
 const historical=selectCases([r0,r1],24,now,4869);
 assert.equal(historical.rows.length,2,'past HEAD model evidence is still browsable');
 assert.notEqual(historical.rows[0].head,historical.rows[1].head);
});
test('PR #4869 style signed model response is visible without inventing a patch, CI or LIVE',()=>{
 const {extra}=require('./api/ci-funnel-extensions.cjs');
 const {trusted,jsonRecords}=require('./api/ci-error-funnel.js')._test;
 const head='e513e1f4d0bebd65bd3b96b602322f2d9a33d125';
 const incident={pr:4869,head,run:44100863020,at:'2026-11-17T14:15:00Z'};
 const task='6a01c387668ec8eb6f58d086bba25f4c',key='ac8fd4a042243e6c601fde1d6fea689e',worker='44101341789';
 const signed=(marker,doc,id,time)=>({
  id,user:{login:'github-actions[bot]',id:41898282,type:'Bot'},
  performed_via_github_app:{id:15368,slug:'github-actions'},
  created_at:time,updated_at:time,
  body:marker+'\n'+'\x60\x60\x60json\n'+JSON.stringify(doc)+'\n\x60\x60\x60'
 });
 const error=signed('<!-- HH_CI_ERROR_TASK_V1 '+task+' -->',{
  schema:'HH_CI_ERROR_TASK_V1',task_id:task,event_kind:'CORE_CI_FAILED',
  pr_number:4869,head_sha:head,run_id:incident.run,category:'TYPESCRIPT',
  reason_code:'FAILED_TYPESCRIPT_STEP',next_action:'VERIFY_SOURCE_SCOPE_AND_CI',
  executor_id:'github-actions:hh-pr-repair-worker.yml'
 },1,'2026-11-17T14:15:20Z');
 const claim=signed('<!-- HH_PR_REPAIR_WORKER_V1 '+head+' -->',{
  schema:'HH_PR_TASK_V1',state:'CLAIMED',worker_started:true,
  task_key:key,error_task_id:task,pr_number:4869,head_sha:head,owner_run_id:worker
 },2,'2026-11-17T14:16:45Z');
 const outcome=signed('<!-- HH_PR_REPAIR_OUTCOME_V1 '+head+' '+worker+' -->',{
  schema:'HH_PR_TASK_V1',state:'SUPERSEDED',
  task_key:key,pr_number:4869,head_sha:head,owner_run_id:worker,
  reason_code:'SOURCE_HEAD_MOVED_BEFORE_PUBLISH',source_published:false,
  ai_execution:{schema:'HH_PR_AI_EXECUTION_EVIDENCE_V1',
   model_request_attempted:true,configured_provider:'openrouter',
   executor_started_at:'2026-11-17T14:18:52Z',
   model_response_confirmed:true,model_response_at:'2026-11-17T14:21:20Z',
   actual_provider:'openrouter',actual_model:'recursive/flint-v1.0:free',
   patch_received:false,patch_verified:false}
 },3,'2026-11-17T14:22:01Z');
 const result=extra(incident,[error,claim,outcome],{runner:{at:'2026-11-17T14:16:47Z'}},[],trusted,jsonRecords);
 assert.ok(result.stages.model_requested);
 assert.ok(result.stages.model_responded);
 assert.equal(result.stages.patch_ready,null);
 assert.equal(result.stages.ci_verified,null);
 assert.equal(result.stages.live_verified,null);
 assert.equal(result.detail.state,'SUPERSEDED');
 assert.equal(result.detail.blocked_reason,'SOURCE_HEAD_MOVED_BEFORE_PUBLISH');
 assert.equal(result.detail.source_sha,null);
 const untrusted=extra(incident,[error,claim,{...outcome,updated_at:'2026-11-17T14:23:00Z'}],
  {runner:{at:'2026-11-17T14:16:47Z'}},[],trusted,jsonRecords);
 assert.equal(untrusted.stages.model_responded,null);
});

test('one PR evidence request uses two same-origin read-only calls with no credentials',async()=>{
 const {parsePublicPrContext,readPublicPrContext}=sandbox.module.exports;
 const pr=4748,HEAD='a'.repeat(40);
 const live={number:pr,state:'open',mergeable:false,mergeable_state:'dirty',
  base:{ref:'codex/public-book-library'},
  head:{sha:HEAD,repo:{full_name:'andylitvinov-design/books'}},
  labels:[{name:'hh:repair-manual'},{name:'hh:conflict-repair-needed'}]};
 const events=[{event:'labeled',created_at:'2026-11-17T09:00:00Z',
  label:{name:'hh:repair-manual'},actor:{login:'github-actions[bot]'}}];
 const trace=[];
 const fetcher=async(url,opt)=>{
  trace.push({url,credentials:opt.credentials,cache:opt.cache});
  return {ok:true,json:async()=>url.includes('/verified-pr-meta/')?live:events};
 };
 const data=await readPublicPrContext(pr,fetcher);
 assert.equal(data.current_reason_code,'MERGE_CONFLICT_DIRTY_NOW');
 assert.equal(data.current_head,HEAD);
 assert.equal(data.historical_cause_verified,false);
 assert.equal(data.observed_events.length,1);
 assert.equal(data.observed_events[0].cause_verified,false);
 assert.equal(trace.length,2);
 assert.deepEqual(trace.map(x=>x.url),[
  '/api/verified-pr-meta/4748','/api/verified-pr-events/4748']);
 assert.ok(trace.every(x=>x.credentials==='omit'&&x.cache==='no-store'));
 assert.ok(!js.includes('api.github.com'),'browser must use same-origin fixed routes');
 assert.equal(parsePublicPrContext(pr,events,live),null,'swapped data is untrusted');
});
test('manual owner hold wins while foreign PR and incomplete evidence fail closed',async()=>{
 const {parsePublicPrContext,readPublicPrContext}=sandbox.module.exports;
 const original={number:4854,state:'open',mergeable:false,mergeable_state:'dirty',
  base:{ref:'codex/public-book-library'},
  head:{sha:'f'.repeat(40),repo:{full_name:'andylitvinov-design/books'}},
  labels:[{name:'hh:hold'},{name:'hh:repair-manual'}]};
 assert.equal(parsePublicPrContext(4854,original,[]).current_reason_code,'EXPLICIT_OWNER_HOLD');
 assert.equal(parsePublicPrContext(4854,{...original,
  head:{...original.head,repo:{full_name:'attacker/books'}}},[]),null);
 assert.equal(parsePublicPrContext(4855,original,[]),null);
 assert.equal(parsePublicPrContext(4854,original,Array(101).fill({})),null);
 const incomplete=parsePublicPrContext(4854,original,Array(100).fill({}));
 assert.equal(incomplete.history_complete,false);assert.equal(incomplete.status,'PARTIAL');
 let called=false;
 assert.equal(await readPublicPrContext(0,async()=>{called=true;}),null);
 assert.equal(called,false);
 assert.equal(await readPublicPrContext(4854,async()=>{throw Error('quota')}),null);
 assert.match(js,/refreshPrContext\(pr,seq\)/);
 assert.match(js,/current_head\.slice\(0,12\)/);
 assert.match(js,/historical_cause_verified:false/);
});

test('atomic release manifest includes every serverless dependency and all matching UI controls',()=>{
 const release=require('./release-integrity.cjs');
 const report=release.auditBundle(root);
 assert.equal(report.schema,'HH_PR_DASHBOARD_ATOMIC_RELEASE_V1');
 assert.equal(report.file_count,9);
 assert.match(report.bundle_sha256,/^[a-f0-9]{64}$/);
 assert.ok(report.files.some(x=>x.path==='api/ci-funnel-extensions.cjs'));
 assert.ok(report.files.every(x=>x.bytes>0));
});
test('post-deploy acceptance refuses old public API or partially uploaded HTML',async()=>{
 const release=require('./release-integrity.cjs');
 const fake=async(url)=>{
  const route=new URL(url).pathname;
  if(route==='/api/ci-error-funnel')return {status:200,redirected:false,
   json:async()=>({schema:'HH_PR_REPAIR_EVIDENCE_FUNNEL_V1',
    stages:[],cohort:{page_size:8,checked_only_public_records:true}})};
  const file=route==='/'?'index.html':route.slice(1);
  return {status:200,redirected:false,
   arrayBuffer:async()=>fs.readFileSync(path.join(root,file))};
 };
 const result=await release.verifyLive({fetchImpl:fake});
 assert.equal(result.verified,false);
 assert.equal(result.reason,'ERROR_FUNNEL_API_OLD_OR_INCOMPLETE');
 const mismatched=await release.verifyLive({fetchImpl:async()=>({
  status:200,redirected:false,arrayBuffer:async()=>Buffer.from('stale')
 })});
 assert.equal(mismatched.verified,false);
 assert.equal(mismatched.reason,'ATOMIC_STATIC_ASSETS_MISMATCH');
 const valid=await release.verifyLive({fetchImpl:async(url)=>{
  const route=new URL(url).pathname;
  if(route==='/api/ci-error-funnel')return {status:200,redirected:false,
   json:async()=>({schema:'HH_PR_REPAIR_EVIDENCE_FUNNEL_V1',
    extended_stages:Array.from({length:6},()=>({key:'unknown',confirmed:0})),
    incidents:[],cohort:{page_size:8,checked_only_public_records:true}})};
  return fake(url);
 }});
 assert.equal(valid.verified,true);
 assert.equal(valid.reason,'ATOMIC_DASHBOARD_BUNDLE_SERVING');
});
test('mixed live HTML and current JS are fail-safe, with ten signed stages still visible',async()=>{
 const source=read('monitor.js');
 assert.match(source,/if\(!extRoot\|\|!detailRoot\|\|!el\('funnel-page'\)\|\|!prev\|\|!next\)/);
 assert.match(source,/if\(el\('funnel-prev'\)\)el\('funnel-prev'\)\.addEventListener/);
 assert.match(source,/if\(el\('funnel-next'\)\)el\('funnel-next'\)\.addEventListener/);
 assert.match(source,/if\(extra\)extra\.textContent/);
 assert.match(source,/if\(!newApi\)extRoot\.append/);
});

test('live open count is independent of stale dispatcher snapshot; zero is a real count only on complete response',()=>{
 const {liveOpenCount}=sandbox.module.exports;
 const {parseCount}=require('./api/pr-open-count.js')._test;
 assert.equal(parseCount({total_count:136,incomplete_results:false}),136);
 assert.equal(parseCount({total_count:0,incomplete_results:false}),0);
 assert.throws(()=>parseCount({total_count:0,incomplete_results:true}));
 assert.throws(()=>parseCount({total_count:0}));
 const at='2026-11-25T12:14:00Z';
 assert.equal(liveOpenCount({schema:SCHEMAS.open,complete:true,open:136,generated_at:at}).open,136);
 assert.throws(()=>liveOpenCount({schema:SCHEMAS.open,complete:false,open:0,generated_at:at}));
 assert.match(js,/\['open',renderOpenCount\]/);
 assert.match(js,/if\(key==='open'\)renderOpenFallback\(\)/);
 assert.ok(html.indexOf('id="k-open"')<html.indexOf('id="k-ci-running"'));
 assert.ok(html.indexOf('id="k-ci-running"')<html.indexOf('id="k-ci-queued"'));
 assert.ok(html.indexOf('id="k-ci-queued"')<html.indexOf('id="chart-flow"'));
 assert.ok(html.indexOf('id="chart-flow"')<html.indexOf('class="period-toolbar"'));
 assert.match(css,/\.metrics\.current-metrics\{grid-template-columns:repeat\(3/);
});
