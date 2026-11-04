'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {buildReport}=require('../scripts/ci-pr-kpi-report.cjs');
const NOW=Date.parse('2026-11-01T23:00:00Z'),SHA='a'.repeat(40),MERGE='b'.repeat(40);
const event=(minutes,pr)=>({kind:'merged',at:new Date(NOW-minutes*60000).toISOString(),pr,head:SHA,mergeSha:MERGE,production:true});
const data=()=>({now:NOW,backlog:{complete:true,counts:{open:3,actionable:null}},receipts:{complete:false,events:[]},
 merges:{complete:true,since:NOW-15*86400000,events:[event(30,1),event(90,2)]},actions:{complete:false,jobs:[],workflowRuns:[]},
 dispatch:{complete:false,events:[],blockerEvents:[]},ci:{complete:false,events:[]}});
test('builds separate current and previous windows with comparable covered trends',()=>{
 const r=buildReport(data());assert.equal(r.schema,'HH_CONTROL_KPI_V1');
 assert.equal(r.windows['1h'].current.observed.merged,1);assert.equal(r.windows['1h'].previous.observed.merged,1);
 assert.equal(r.windows['1h'].trend.production_merges,0);
 assert.equal(r.windows['1h'].current.kpi.merge_to_live,null);assert.equal(r.backlog.counts.actionable,null);
});
test('unknown evidence never turns into a covered zero or invented trend',()=>{
 const input=data();input.merges.complete=false;
 const r=buildReport(input);assert.equal(r.windows['1h'].trend.production_merges,null);
 assert.equal(r.windows['1h'].current.coverage.merges,false);assert.equal(r.windows['1h'].current.kpi.repair_conversion,null);
 assert.equal(r.windows['7d'].current.kpi.merge_to_live,null);
});
test('blocker counts are attributed to their actual window and labeled as sample if incomplete',()=>{
 const input=data();input.dispatch.blockerEvents=[{at:new Date(NOW-20*60000).toISOString(),blocked:{OWNER_LEASE_ACTIVE:2}},{at:new Date(NOW-90*60000).toISOString(),blocked:{SOURCE_PROOF_MISSING:1}}];
 const r=buildReport(input);assert.equal(r.windows['1h'].blockers.label,'SAMPLE_NOT_TOTAL');
 assert.equal(r.windows['1h'].blockers.current.OWNER_LEASE_ACTIVE,2);
 assert.equal(r.windows['1h'].blockers.previous.SOURCE_PROOF_MISSING,1);
});

test('adjacent reporting windows do not double-count boundary events',()=>{
 const input=data();input.merges.events=[event(60,3)];
 const r=buildReport(input);assert.equal(r.windows['1h'].current.observed.merged,0);
 assert.equal(r.windows['1h'].previous.observed.merged,1);
});


test('coverage never extends before the collector lookback',()=>{
 const input=data();input.merges.since=NOW-2*3600000;
 const r=buildReport(input);assert.equal(r.windows['1h'].current.coverage.merges,true);
 assert.equal(r.windows['7d'].current.coverage.merges,false);
 assert.equal(r.windows['7d'].trend.production_merges,null);
});
test('a complete short source covers only windows inside its own lookback',()=>{
 const input=data();input.merges.complete=false;input.merges.segments=[{complete:true,since:NOW-2*3600000}];
 const r=buildReport(input);
 assert.equal(r.windows['1h'].current.coverage.merges,true);
 assert.equal(r.windows['1h'].previous.coverage.merges,true);
 assert.equal(r.windows['24h'].current.coverage.merges,false);
 assert.equal(r.windows['7d'].trend.production_merges,null);
});
test('complete receipt records are distinct from complete task history',()=>{
 const input=data();input.receipts={complete:false,events:[],segments:[{complete:true,since:NOW-2*3600000}]};
 const r=buildReport(input);
 assert.equal(r.windows['1h'].current.coverage.receipt_records,true);
 assert.equal(r.windows['1h'].current.coverage.tasks,false);
 assert.equal(r.windows['24h'].current.coverage.receipt_records,false);
});

test('six cancellation reasons and runner-cost sample are visible without claiming a verified total',()=>{
 const input=data(),job={id:21,run_id:7,status:'completed',conclusion:'cancelled',run_attempt:1,runner_id:101,runner_name:'GitHub Actions 101',
  started_at:new Date(NOW-15*60000).toISOString(),completed_at:new Date(NOW-10*60000).toISOString()};
 const canceled={id:7,status:'completed',conclusion:'cancelled',run_attempt:1,event:'pull_request',
  path:'.github/workflows/core.yml',created_at:new Date(NOW-20*60000).toISOString(),
  updated_at:new Date(NOW-5*60000).toISOString(),
  pull_requests:[]};
 input.cancellations={complete:false,reason:'BOUNDED_SAMPLE',reads:4,workflowRuns:[canceled],
  candidateRunIds:[7],verifiedJobRunIds:[7],jobs:[job]};
 const report=buildReport(input);
 const current=report.windows['1h'].cancellation_reasons.current;
 assert.equal(report.sources.cancellations.complete,false);
 assert.equal(current.counts.SUSPICIOUS_CANCEL,1);
 assert.equal(current.cancelled_runner_minutes_observed,5);
 assert.equal(current.runner_minutes_observed.REAL_FAILURE,0);
 assert.equal(current.label,'SAMPLE_NOT_TOTAL');
});

test('created-at PR cohort is partitioned from existing merge+Actions evidence without new API reads',()=>{
 const input=data(),when=mins=>new Date(NOW-mins*60000).toISOString();
 const p1={kind:'merged',at:when(10),pr:1,head:SHA,mergeSha:MERGE,production:true,
  created_at:when(40),head_ref:'feature/1'};
 const p2={kind:'merged',at:when(8),pr:2,head:SHA,mergeSha:MERGE,production:true,
  created_at:when(70),head_ref:'feature/2'};
 input.merges.events=[p1,p2];
 input.actions.workflowRuns=[{
  id:900,name:'HH PR core release gate',event:'pull_request',run_attempt:1,
  path:'.github/workflows/hh-pr-core-release.yml@refs/pull/1/merge',
  repository:{full_name:'andylitvinov-design/books'},head_repository:{full_name:'andylitvinov-design/books'},
  head_branch:'feature/1',head_sha:SHA,status:'completed',conclusion:'success',created_at:when(30),
  pull_requests:[{number:1,head:{sha:SHA},base:{ref:'codex/public-book-library'}}]
 }];
 const job=(id,name,q,s,e)=>({id,run_id:900,run_attempt:1,name,status:'completed',conclusion:'success',
  created_at:when(q),started_at:when(s),completed_at:when(e)});
 input.actions.jobs=[job(31,'core-lint-types-build',30,29,26),
  job(32,'hh-specialist',30,29,23),job(33,'hh-merge-check',22,21,19)];
 const report=buildReport(input),cohort=report.windows['1h'].created_to_merged;
 // PR 2 created before the 1h window, and must not contaminate this cohort.
 assert.equal(cohort.cohort.merged,1);
 assert.equal(cohort.cohort.verified,1);
 assert.equal(cohort.total.mean,30);
 assert.equal(cohort.reconstruction.reconciled,true);
 assert.equal(cohort.unknown_contribution_mean_minutes,0);
 const longer=report.windows['12h'].created_to_merged;
 assert.equal(longer.cohort.merged,2);
 assert.equal(longer.cohort.verified,1);
 assert.ok(longer.unknown_contribution_mean_minutes>0);
 assert.equal(longer.reconstruction.reconciled,true);
 assert.equal(longer.coverage.label,'SAMPLE_NOT_TOTAL');
});
test('created cohort metadata missing remains unknown rather than a zero-duration fake',()=>{
 const result=buildReport(data()).windows['1h'].created_to_merged;
 assert.equal(result.cohort.merged,0);assert.equal(result.total.mean,null);
 assert.equal(result.rows_returned,0);
});

test('report exposes observed LIVE receipts without calling unknown PRs live or pretending full coverage',()=>{
 const input=data();
 input.receipts={complete:false,since:NOW-48*3600000,events:[{kind:'live_verified',
  at:new Date(NOW-15*60000).toISOString(),pr:1,head:MERGE,
  mergeSha:MERGE,production:true,aliasVerified:true,smokeVerified:true}]};
 const r=buildReport(input);
 assert.equal(r.live_receipts_observed.n,1);
 assert.equal(r.live_receipts_observed.scope,'VERIFIED_RECEIPTS_ONLY_NOT_ALL_PRODUCTION_PR');
 assert.equal(r.windows['1h'].current.coverage.live,false);
 assert.equal(r.windows['1h'].current.kpi.merge_to_live,null);
 assert.equal(r.windows['1h'].current.phase_minutes.stages.merged_to_live_verified.n,1);
});

test('same-cohort KPI report retains authenticated merge-to-LIVE and P95',()=>{
 const input=data(),at=m=>new Date(NOW-m*60000).toISOString();
 input.merges.events=[{kind:'merged',at:at(7),pr:77,head:SHA,mergeSha:MERGE,
  created_at:at(40),head_ref:'feature/77',production:true}];
 input.receipts.events=[{kind:'live_verified',pr:77,head:MERGE,mergeSha:MERGE,
  production:true,aliasVerified:true,smokeVerified:true,at:at(5)}];
 const x=buildReport(input).windows['1h'].created_to_merged;
 assert.equal(x.cohort.merged,1);
 assert.equal(x.total.p50,33);assert.equal(x.total.p95,33);
 assert.equal(x.receipt_substages.merged_to_live_verified.mean,2);
 assert.equal(x.receipt_substages.merged_to_live_verified.cohort_prs,1);
 assert.equal(x.receipt_substages.merged_to_live_verified.coverage_pct,100);
 assert.equal(x.bottleneck.status,'NO_VERIFIED_GATE');
});
