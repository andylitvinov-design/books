'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const {run}=require('../scripts/ci-pr-kpi-run.cjs');
test('runs bounded read-only collectors and reports partial evidence',async()=>{
 const calls=[];const empty={complete:false,events:[],jobs:[],workflowRuns:[],blockerEvents:[]};
 const deps={collectBacklog:async x=>(calls.push(x),empty),collectReceiptEvents:async x=>(calls.push(x),empty),collectMergeEvents:async x=>(calls.push(x),empty),collectCompletedJobs:async x=>(calls.push(x),empty),collectDispatcherEvents:async x=>(calls.push(x),empty),normalizeCoreEvidence:()=>empty};
 const lines=[];const summary={addHeading(){return this},addCodeBlock(x){lines.push(x);return this},async write(){}};
 const report=await run({github:{},core:{summary,info:x=>lines.push(x)},context:{repo:{owner:'andylitvinov-design',repo:'books'}},now:1800000000000,deps});
 assert.equal(report.schema,'HH_CONTROL_KPI_V1');assert.equal(calls.length,7);assert.ok(calls.every(c=>c.minRemaining===500));assert.equal(report.windows['7d'].current.coverage.live,false);assert.equal(lines.length,2);
});
test('hosted KPI probe is restricted to same-repository KPI PRs with read-only permissions',()=>{
 const s=require('node:fs').readFileSync('.github/workflows/hh-pr-watchdog-contract-ci.yml','utf8');
 const start=s.indexOf('      - name: Probe real KPI evidence without write credentials');assert.ok(start>0);
 const step=s.slice(start);assert.match(step,/github\.event_name == 'pull_request'/);
 assert.match(step,/github\.event\.pull_request\.head\.repo\.full_name == github\.repository/);
 assert.match(step,/startsWith\(github\.head_ref, 'codex\/control-tower-kpi-'\)/);
 assert.doesNotMatch(step,/HH_AUTOMERGE_TOKEN|VERCEL_TOKEN/);
});


test('collects both recent complete merges and a longer partial sample',async()=>{
 const NOW=1800000000000,sha='a'.repeat(40),merged='b'.repeat(40);let n=0;
 const event={kind:'merged',at:new Date(NOW-1800000).toISOString(),pr:1,head:sha,mergeSha:merged,production:true};
 const empty={complete:false,events:[],jobs:[],workflowRuns:[],blockerEvents:[]};
 const deps={collectBacklog:async()=>empty,collectReceiptEvents:async()=>empty,
  collectMergeEvents:async args=>(++n<=2?{complete:true,since:args.since,events:[event],reason:'COMPLETE_NON_ATOMIC'}:{complete:false,since:args.since,events:[event],reason:'API_BUDGET'}),
  collectCompletedJobs:async()=>empty,collectDispatcherEvents:async()=>({...empty}),normalizeCoreEvidence:()=>empty};
 const summary={addHeading(){return this},addCodeBlock(){return this},async write(){}};
 const r=await run({github:{},core:{summary,info(){}},context:{repo:{owner:'andylitvinov-design',repo:'books'}},now:NOW,deps});
 assert.equal(r.windows['1h'].current.coverage.merges,true);assert.equal(r.windows['1h'].current.observed.merged,1);
 assert.equal(r.windows['24h'].current.coverage.merges,true);assert.equal(r.sources.merges.segments.length,3);
});
test('later evidence missing from an allegedly complete recent snapshot invalidates coverage',async()=>{
 const NOW=1800000000000,sha='a'.repeat(40),merged='b'.repeat(40);let n=0;
 const event={kind:'merged',at:new Date(NOW-1800000).toISOString(),pr:1,head:sha,mergeSha:merged,production:true};
 const empty={complete:false,events:[],jobs:[],workflowRuns:[],blockerEvents:[]};
 const deps={collectBacklog:async()=>empty,collectReceiptEvents:async()=>empty,
  collectMergeEvents:async args=>(++n===1?{complete:true,since:args.since,events:[]}:{complete:false,since:args.since,events:[event]}),
  collectCompletedJobs:async()=>empty,collectDispatcherEvents:async()=>({...empty}),normalizeCoreEvidence:()=>empty};
 const summary={addHeading(){return this},addCodeBlock(){return this},async write(){}};
 const r=await run({github:{},core:{summary,info(){}},context:{repo:{owner:'andylitvinov-design',repo:'books'}},now:NOW,deps});
 assert.equal(r.windows['1h'].current.coverage.merges,false);assert.equal(r.sources.merges.reason,'MERGE_SNAPSHOTS_DIFFER');
});
