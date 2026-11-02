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
