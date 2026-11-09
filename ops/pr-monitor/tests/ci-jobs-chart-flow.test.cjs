'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {readFileSync}=require('node:fs'),{createRequire}=require('node:module');
const requireFromHere=createRequire(__filename);
const {number,evidence,workflowDisplay}=require('../ci-jobs-bridge.js');
const src=n=>readFileSync(requireFromHere.resolve('../'+n),'utf8');
const NOW=Date.parse('2026-11-08T06:10:00.000Z');
function sample(opts={}){
 return {schema:'HH_CI_VERIFIED_LOAD_V2',observed_at:new Date(NOW).toISOString(),
   coverage:{complete:false,checked_ci_runs:7,known_ci_runs:11,...opts.coverage},
   ci:{running_jobs:4,queued_jobs:1,...opts.ci}};
}
test('both CI jobs labels use bounded verified job evidence, not workflow statuses',()=>{
 const r=evidence(sample(),NOW);
 assert.equal(r.running,'≥4');
 assert.equal(r.waiting,'≥1');
 assert.match(r.note,/7 из 11/);
 assert.equal(evidence(sample({coverage:{complete:true}}),NOW).running,'4');
 assert.equal(evidence(sample({coverage:{complete:true},ci:{queued_jobs:0}}),NOW).waiting,'0');
 assert.equal(number(0,false),'—');
 assert.equal(number(-1,false),'—');
});
test('workflow counters are explicit and different from CI job counters',()=>{
 const x=workflowDisplay('1','5',3);
 assert.equal(x.queuedLabel,'Workflows ожидают');
 assert.equal(x.runningLabel,'Workflows выполняются');
 assert.match(x.note,/5 выполняются · 1 ожидают/);
 assert.match(x.note,/зависших CI workflows: 3/);
 assert.match(x.note,/не число jobs/);
 const js=src('ci-jobs-bridge.js');
 assert.match(js,/CI jobs выполняются/);
 assert.match(js,/Workflows выполняются/);
 assert.match(js,/quick-explanation/);
});
test('stale or structurally unverified CI evidence must not be shown as jobs',()=>{
 assert.equal(evidence(sample(),NOW+181000),null);
 assert.equal(evidence(sample({coverage:{checked_ci_runs:12}}),NOW),null);
 assert.equal(evidence(sample({ci:{running_jobs:null}}),NOW),null);
 assert.equal(evidence({schema:'HH_PR_CI_QUEUE_DETAIL_V1'},NOW),null);
});
test('client bridges existing job cards with a single on-demand GET and no CI dispatch',()=>{
 const js=src('ci-jobs-bridge.js'),boot=src('pr-two-screen-boot.js');
 assert.match(js,/\/api\/ci-verified-load/);
 assert.match(js,/hh:ci-verified-updated/);
 assert.match(js,/Jobs идут/);assert.match(js,/Jobs ждут/);
 assert.match(js,/\.hh2-ci-card/);
 assert.doesNotMatch(js,/setInterval|workflow_dispatch|method:'POST'/);
 assert.match(boot,/ci-jobs-bridge\.js/);
 assert.match(boot,/20261109-workflow-labels-v1/);
 assert.doesNotMatch(boot,/ci-verified-panel\.js/);
});
test('PR chart flows with document, no nested chart scroll or viewport height cap',()=>{
 const css=src('pr-two-screen.css');
 assert.match(css,/body\.hh2-active \.hh2-screen\{height:auto!important/);
 assert.match(css,/\.hh2-chart-slot,body\.hh2-active \.hh2-chart-slot\{height:auto!important/);
 assert.match(css,/overflow:visible!important/);
 assert.match(css,/\.hh2-chart-slot #hh-pr-trends/);
});
