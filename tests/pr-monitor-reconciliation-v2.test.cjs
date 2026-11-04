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
