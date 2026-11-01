'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const {run}=require('../scripts/ci-pr-kpi-run.cjs');
test('runs bounded read-only collectors and reports partial evidence',async()=>{
 const calls=[];const empty={complete:false,events:[],jobs:[],workflowRuns:[],blockerEvents:[]};
 const deps={collectBacklog:async x=>(calls.push(x),empty),collectReceiptEvents:async x=>(calls.push(x),empty),collectMergeEvents:async x=>(calls.push(x),empty),collectCompletedJobs:async x=>(calls.push(x),empty),collectDispatcherEvents:async x=>(calls.push(x),empty),normalizeCoreEvidence:()=>empty};
 const lines=[];const summary={addHeading(){return this},addCodeBlock(x){lines.push(x);return this},async write(){}};
 const report=await run({github:{},core:{summary,info:x=>lines.push(x)},context:{repo:{owner:'andylitvinov-design',repo:'books'}},now:1800000000000,deps});
 assert.equal(report.schema,'HH_CONTROL_KPI_V1');assert.equal(calls.length,5);assert.ok(calls.every(c=>c.minRemaining===500));assert.equal(report.windows['7d'].current.coverage.live,false);assert.equal(lines.length,2);
});
