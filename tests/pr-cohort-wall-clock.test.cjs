'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const M=require('../ops/pr-monitor/pr-cohort-wall-clock.js');
const iso=n=>new Date(Date.UTC(2026,10,4,10,0,0)+n*60000).toISOString();
const cohort={n:3,from:iso(0),to:iso(120),mean:14,rows:[
 {number:1,created_at:iso(0),merged_at:iso(20)},
 {number:2,created_at:iso(10),merged_at:iso(22)},
 {number:3,created_at:iso(30),merged_at:iso(40)}
]};
const archive={schema:'HH_CI_FIRST_LAST_ARCHIVE_V1',rows:[
 {pr:1,first_at:iso(5),last_at:iso(13),partial:true,runs:2,
  stages_ms:{workflow_wait:60000,runner_wait:120000,checks:240000,between_waves_unknown:60000,other_unknown:0}},
 {pr:3,first_at:iso(31),last_at:iso(38),partial:false,runs:1,
  stages_ms:{workflow_wait:0,runner_wait:60000,checks:360000,between_waves_unknown:0,other_unknown:0}}
]};
test('same N, exact wall-clock partition includes absent-CI PR in unknown',()=>{
 const model=M.calculate(cohort,archive);
 assert.equal(model.N,3);assert.equal(model.coverage.ci_window_prs,2);
 assert.equal(model.coverage.no_ci_receipt_prs,1);
 assert.equal(model.coverage.partial_archive_prs,1);
 assert.equal(model.overall_mean_minutes,14);
 assert.equal(model.reconciled,true);assert.equal(model.total_mean_matches_original,true);
 assert.equal(Object.values(model.stage_totals_ms).reduce((a,b)=>a+b,0),42*60000);
 assert.equal(model.stage_mean_minutes.checks,10/3);
 assert.equal(model.stage_mean_minutes.runner_wait,1);
 assert.equal(model.stage_mean_minutes.no_archive_unknown,4);
 assert.equal(model.stage_mean_minutes.before_unknown,2);
 assert.equal(model.stage_mean_minutes.after_unknown,3);
});
test('all absent records show unknown total, not fake zero seconds in steps',()=>{
 const model=M.calculate(cohort,{rows:[]});
 assert.equal(model.coverage.ci_window_prs,0);
 assert.equal(model.stage_mean_minutes.checks,null);
 assert.equal(model.stage_mean_minutes.runner_wait,null);
 assert.equal(model.stage_mean_minutes.no_archive_unknown,14);
 assert.equal(model.reconciled,true);
});
test('overlapping/inconsistent CI proof is rejected, never double counted',()=>{
 const corrupt=structuredClone(archive);
 corrupt.rows[0].stages_ms.checks+=60000;
 const model=M.calculate(cohort,corrupt);
 assert.equal(model.coverage.rejected_ci_rows,1);
 assert.equal(model.coverage.ci_window_prs,1);
 assert.equal(model.overall_mean_minutes,14);
 assert.equal(model.reconciled,true);
});
test('CI window outside created→merged is rejected',()=>{
 const corrupt=structuredClone(archive);corrupt.rows[0].first_at=iso(-1);
 const model=M.calculate(cohort,corrupt);
 assert.equal(model.coverage.rejected_ci_rows,1);
 assert.equal(model.stage_mean_minutes.no_archive_unknown,32/3);
});
test('duplicates cannot inflate evidence',()=>{
 const corrupt=structuredClone(archive);corrupt.rows.push(structuredClone(corrupt.rows[0]));
 const model=M.calculate(cohort,corrupt);
 assert.equal(model.coverage.rejected_ci_rows,1);assert.equal(model.coverage.ci_window_prs,1);
});
test('no hidden conversion of unknown to zero and no I/O',()=>{
 assert.equal(M.calculate({n:0,rows:[]},{rows:[]}),null);
 const s=require('node:fs').readFileSync(require('node:path').join(__dirname,'../ops/pr-monitor/pr-cohort-wall-clock.js'),'utf8');
 assert.doesNotMatch(s,/fetch\s*\(|setInterval\s*\(|workflow_dispatch/);
});
