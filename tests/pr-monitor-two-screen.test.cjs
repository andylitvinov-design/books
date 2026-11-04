'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const app=fs.readFileSync(path.join(__dirname,'../ops/pr-monitor/pr-two-screen.js'),'utf8');
const marker="  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true});";
assert.ok(app.includes(marker),'Test must instrument the active browser bundle');
const instrumented=app.replace(marker,"  window.__hhTests={aggregate:aggregate,duration:duration};\n"+marker);
const context={window:{},document:{readyState:'loading',addEventListener(){}}};
vm.runInNewContext(instrumented,context,{filename:'pr-two-screen.js'});
const {aggregate,duration}=context.window.__hhTests;

function row(number,created,merged){
 return {number,created_at:'2026-11-03T'+created+':00Z',
   merged_at:merged?'2026-11-03T'+merged+':00Z':null};
}
test('only PRs created and merged inside identical 24-hour windows count',()=>{
 const window={id:'last_day',from:'2026-11-03T00:00:00Z',to:'2026-11-04T00:00:00Z',
  complete:true,rows:[row(1,'01:00','01:10'),row(2,'02:00','02:30'),row(3,'03:00',null),
   {number:4,created_at:'2026-11-02T23:00:00Z',merged_at:'2026-11-03T01:00:00Z'},
   {number:5,created_at:'2026-11-03T23:59:00Z',merged_at:'2026-11-04T00:10:00Z'}]};
 const result=aggregate(window);
 assert.equal(result.n,2);assert.equal(result.mean,20);
 assert.equal(result.median,20);assert.equal(result.p90,28);
 assert.deepEqual(Array.from(result.rows,r=>r.number),[2,1]);
});
test('unknown evidence is not reported as a zero-duration observation',()=>{
 assert.equal(aggregate({from:'2026-11-03T00:00:00Z',to:'2026-11-04T00:00:00Z',
  rows:[row(1,'01:00',null)]}).mean,null);
 assert.equal(duration(null),'—');
 assert.equal(duration(-5),'—');
 assert.equal(duration(0),'0 сек');
});
test('no automatic CI reruns, new scheduled polling or GitHub client calls',()=>{
 assert.doesNotMatch(app,/workflow_dispatch|setInterval\s*\(|api\.github\.com/);
 assert.match(app,/IntersectionObserver/);
 assert.match(app,/hh-pr-trends/);
 assert.match(app,/pr-three-cohorts-snapshot\.json/);
});
