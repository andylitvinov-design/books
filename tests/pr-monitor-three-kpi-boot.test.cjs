'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const boot=fs.readFileSync(path.join(__dirname,'../ops/pr-monitor/pr-two-screen-boot.js'),'utf8');
const assets=['pr-timestamp-coverage.css?v=20261104-5',
 'pr-timestamp-coverage.js?v=20261104-5',
 'pr-two-screen.css?v=20261104-4',
 'pr-cohort-wall-clock.js?v=20261104-kpi-p95-3476',
 'pr-two-screen.js?v=20261107-stage-return-v1',
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
test('Green to Merge outliers use a verified same-cohort sample only',()=>{
 const vm=require('node:vm');
 const source=fs.readFileSync(path.join(__dirname,'../ops/pr-monitor/pr-three-kpi-ui.js'),'utf8');
 const marker=" if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});";
 assert.ok(source.includes(marker));
 const instrumented=source.replace(marker," window.__hhTestLatencyOutlier=latencyOutlier;\n"+marker);
 const sandbox={window:{},document:{readyState:'loading',addEventListener(){}}};
 vm.runInNewContext(instrumented,sandbox);
 const pick=sandbox.window.__hhTestLatencyOutlier;
 const entry={n:4,median_min:1,rows:[
  {pr:11,minutes:1},{pr:12,minutes:.5},{pr:13,minutes:2},{pr:14,minutes:100}]};
 const found=pick(entry);
 assert.equal(found.pr,14);
 assert.equal(found.minutes,100);
 assert.ok(Math.abs(found.meanWithoutOutlier-1.1666666666666667)<1e-6);
 assert.equal(pick({...entry,n:5}),null,'incomplete sample is unknown');
 assert.equal(pick({...entry,rows:entry.rows.map(r=>({...r,minutes:2}))}),null,'no spurious outlier');
});
test('no CI dispatch, cron, paid integration or polling added to boot',()=>{
 assert.doesNotMatch(boot,/workflow_dispatch|setInterval\s*\(|createWorkflowDispatch|https:\/\/api\.github\.com/);
 assert.match(boot,/legacy\.html/);
});

test('restored second slide is after central PR metrics without replacing legacy queue',()=>{
 const ui=fs.readFileSync(path.join(__dirname,'../ops/pr-monitor/pr-two-screen.js'),'utf8');
 assert.match(boot,/data-pr-stage-only src="\/pr-two-screen\.js\?/);
 assert.match(ui,/document\.currentScript\?\.hasAttribute\?\.\("data-pr-stage-only"\)/);
 assert.match(ui,/main\?\.querySelector\('#hh-pr-error-funnel'\)/);
 assert.match(ui,/funnel\.insertAdjacentElement\('afterend',root\)/);
 assert.match(ui,/main\.insertBefore\(root,main\.querySelector\('header\.header'\)\|\|main\.firstChild\)/);
 assert.doesNotMatch(ui,/after\.insertAdjacentElement\('afterend',root\)/);
 assert.match(ui,/root\.append\(two\)/);
 assert.match(ui,/if\(!STAGE_ONLY\)\{[\s\S]*?var graph = document\.getElementById\('hh-pr-trends'\)/);
 assert.match(ui,/if\(!STAGE_ONLY\)void readHistorical\(\)/);
 assert.match(ui,/\['ci_gaps','Между волнами CI'/);
 assert.match(ui,/\['merge_to_live','Merge → LIVE'/);
 assert.doesNotMatch(ui,/workflow_dispatch|setInterval\s*\(/);
});
