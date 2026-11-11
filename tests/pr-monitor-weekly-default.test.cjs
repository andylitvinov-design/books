'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'../ops/pr-monitor',p),'utf8');
const kpi=require('../ops/pr-monitor/pr-three-kpi-model.cjs');
test('Commander root opens PR monitor and briefing remains available',()=>{
 assert.match(read('index.html'),/http-equiv="refresh" content="0;url=\/pr-monitor\.html"/);
 assert.match(read('briefing.html'),/data-view="home"/);
 assert.match(read('project-management-nav.js'),/home:'\/briefing\.html'/);
});
test('three KPI panel is before the original monitoring queue',()=>{
 const ui=read('pr-three-kpi-ui.js');
 assert.match(ui,/querySelector\('main\.wrap'\)/);
 assert.match(ui,/anchor\.insertAdjacentElement\('afterend',box\)/);
 assert.match(ui,/report\.windows\?\.week_ago/);
 assert.match(ui,/periods\?\.week_ago/);
 assert.doesNotMatch(ui,/two_weeks_ago|Пред\. 24 ч/);
});
test('missing weekly Core CI archive stays unknown',()=>{
 const t=Date.parse('2026-11-11T13:00:00Z');
 const report=kpi.report([],t);
 assert.equal(report.weekly_coverage.status,'NO_ARCHIVED_CORE_COVERAGE');
 assert.equal(report.weekly_coverage.missing_is_not_zero,true);
 assert.equal(report.windows.week_ago.ci_first_pass.percent_observed,null);
});
test('no additional polling or workflow dispatch',()=>{
 for(const f of ['pr-three-kpi-ui.js','pr-wave-effectiveness-model.cjs','pr-three-kpi-model.cjs'])
  assert.doesNotMatch(read(f),/setInterval\s*\(|workflow_dispatch|createWorkflowDispatch/);
});
