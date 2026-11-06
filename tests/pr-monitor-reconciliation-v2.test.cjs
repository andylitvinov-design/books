'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../ops/pr-monitor/pr-two-screen.js'),'utf8');
const css=fs.readFileSync(path.join(__dirname,'../ops/pr-monitor/pr-two-screen.css'),'utf8');
const marker="  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true});";
assert.ok(source.includes(marker));
const script=source.replace(marker,
  "  window.__unit={aggregate,duration,queueNumbers,reconcileStagesForSameCohort,SUBSTEPS,AUDIT_STAGES};\n"+marker);
const host={window:{},document:{readyState:'loading',addEventListener(){}}};
vm.runInNewContext(script,host,{filename:'pr-two-screen.js'});
const {aggregate,duration,queueNumbers,reconcileStagesForSameCohort,SUBSTEPS,AUDIT_STAGES}=host.window.__unit;
const keys=['prepare','runner','ci','gate','merge'];
function deep(n,values){
 return {population:{merged:n},
  stages:Object.fromEntries(keys.map((key,i)=>[key,{n,mean:values[i]}]))};
}
test('2.3h stage mean must never appear as additive part of 1.4h cohort mean',()=>{
 const cohort={n:63,mean:84};
 const sample=deep(12,[138,4.9,8.2,1.9,40/60]);
 const value=reconcileStagesForSameCohort(cohort,sample);
 assert.equal(value.ok,false);
 assert.equal(value.reason,'DENOMINATOR_MISMATCH');
});
test('equal n without disjoint additive coverage is also rejected',()=>{
 const result=reconcileStagesForSameCohort({n:12,mean:84},deep(12,[138,5,8,2,1]));
 assert.equal(result.ok,false);
 assert.equal(result.reason,'NON_RECONCILED_STAGE_TOTAL');
});
test('same PR cohort with five disjoint stages reconciles',()=>{
 const data=deep(12,[29,6,42,2,5]);
 const result=reconcileStagesForSameCohort({n:12,mean:84},data);
 assert.equal(result.ok,true);
 assert.equal(result.sum,84);
});
test('monitor labels distinguish non-Draft, CI workflow count and stale Watchdog evidence',()=>{
 const queue=fs.readFileSync(path.join(__dirname,'../ops/pr-monitor/pr-open-queue.js'),'utf8');
 const watchdog=fs.readFileSync(path.join(__dirname,'../ops/pr-monitor/watchdog-control-tower.js'),'utf8');
 assert.match(queue,/Не Draft <b data-hhq="ready">/);
 assert.match(queue,/CI и merge могут быть заблокированы/);
 assert.match(source,/Workflows \(не PR\) · jobs выполняются/);
 assert.match(source,/Workflows \(не PR\) · jobs ожидают/);
 assert.match(watchdog,/info\.dataset\.stale/);
 assert.match(watchdog,/20/);
 const workflow=fs.readFileSync(path.join(__dirname,'../.github/workflows/hh-pr-watchdog-contract-ci.yml'),'utf8');
 for(const name of ['pr-open-queue.js','pr-two-screen.js','watchdog-control-tower.js','pr-monitor-reconciliation-v2.test.cjs'])
  assert.ok(workflow.includes(name),'existing CI must cover '+name);
});
test('queue snapshot handles genuine zero, but refuses missing as zero',()=>{
 const mapped=queueNumbers({counts:{workflows_running:0,workflows_queued:2,jobs_running:1,jobs_queued:4,prs_waiting_ci:3}});
 assert.deepEqual(Array.from(mapped),[3,2,0,4,1]);
 assert.equal(queueNumbers({counts:{status:'unavailable'}}),null);
});
test('each major stage expands into named substeps rather than a descriptive paragraph',()=>{
 for(const key of ['before_unknown','workflow_wait','runner_wait','checks','ci_gaps','after_unknown','no_archive_unknown','merge_to_live']){
   assert.ok(SUBSTEPS[key].length>=2,key);
   assert.ok(SUBSTEPS[key].every(p=>p[0]&&p[1]),key);
 }
 assert.ok(AUDIT_STAGES.some(v=>v[0]==='unattributed'));
 assert.match(source,/buildSubsteps\(spec\[0\],explanation\)/);
 assert.match(source,/auditPR\(p\.number,timeline,action\)/);
});
test('all original monitor sections remain in normal document flow',()=>{
 assert.doesNotMatch(css,/body\.hh2-active:not\(\.hh2-full-open\)/);
 assert.doesNotMatch(source,/classList\.toggle\('hh2-full-open'\)/);
 assert.match(source,/Все остальные разделы/);
});
test('CI reads are bounded to existing endpoints and do not schedule new polling',()=>{
 assert.doesNotMatch(source,/setInterval\s*\(|workflow_dispatch|api\.github\.com/);
 assert.match(source,/fetch\('\/api\/ci-queue-detail'/);
 assert.match(source,/fetch\('\/api\/ci-journey-summary\?hours=72'/);
 assert.match(source,/fetch\('\/api\/pr-attribution\?pr='/);
});

test('the visible PR-to-Merge dashboard uses same-cohort interpolated P50/P95',()=>{
 const t=n=>new Date(Date.UTC(2026,10,4,10,0,0)+n*60000).toISOString();
 const r=aggregate({from:t(0),to:t(100),rows:[
  {number:101,created_at:t(0),merged_at:t(10)},
  {number:102,created_at:t(1),merged_at:t(13)},
  {number:103,created_at:t(2),merged_at:t(22)}
 ]});
 assert.equal(r.n,3);
 assert.equal(r.mean,14);
 assert.equal(r.p50,12);
 assert.equal(r.p95,19.2);
 assert.match(source,/PR → Merge · P95/);
 assert.match(source,/stage_kpis/);
 assert.match(source,/largest_delay/);
 assert.doesNotMatch(source,/setInterval\s*\(/);
});
