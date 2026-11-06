'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const boot=fs.readFileSync(path.join(__dirname,'../ops/pr-monitor/pr-two-screen-boot.js'),'utf8');
const assets=['pr-timestamp-coverage.css?v=20261104-5',
 'pr-timestamp-coverage.js?v=20261104-5',
 'pr-two-screen.css?v=20261104-4',
 'pr-cohort-wall-clock.js?v=20261104-kpi-p95-3476',
 'pr-two-screen.js?v=20261106-ci-filter-v2',
 'pr-three-kpi-ui.css?v=20261106-wave-kpi1',
 'pr-three-kpi-ui.js?v=20261106-wave-kpi1'];
test('latest production assets and KPI are loaded exactly once',()=>{
 for(const item of assets){
  assert.equal(boot.split(item).length-1,1,item);
 }
 assert.ok(boot.indexOf('pr-two-screen.js')<boot.indexOf('pr-three-kpi-ui.js'));
});
test('wave-effectiveness UI reuses the existing KPI panel and endpoint',()=>{
 const ui=fs.readFileSync(path.join(__dirname,'../ops/pr-monitor/pr-three-kpi-ui.js'),'utf8');
 const css=fs.readFileSync(path.join(__dirname,'../ops/pr-monitor/pr-three-kpi-ui.css'),'utf8');
 assert.match(ui,/renderWaves\(\)/);
 assert.match(ui,/HH_PR_WAVE_EFFECTIVENESS_V1/);
 assert.match(ui,/efficiency=1/);
 assert.match(css,/hh-kpi-wave-grid/);
 assert.doesNotMatch(ui,/workflow_dispatch|setInterval\s*\(/);
});
test('no CI dispatch, cron, paid integration or polling added to boot',()=>{
 assert.doesNotMatch(boot,/workflow_dispatch|setInterval\s*\(|createWorkflowDispatch|https:\/\/api\.github\.com/);
 assert.match(boot,/legacy\.html/);
});
