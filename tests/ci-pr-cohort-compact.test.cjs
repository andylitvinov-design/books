'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {WINDOWS,analyze}=require('../scripts/ci-pr-three-cohorts.cjs');
const {renderCompact}=require('../scripts/ci-pr-cohort-compact.cjs');
const repo='andylitvinov-design/books';
function fixture(){
 const created='2026-11-03T13:00:00Z',closed='2026-11-03T13:31:00Z';
 const pr={number:3288,title:'source repair / CI',created_at:created,closed_at:closed,merged_at:null,
  base:{ref:'codex/public-book-library'},head:{sha:'a'.repeat(40),ref:'branch'}};
 return analyze({prs:[pr],intervals:[{pr:3288,phase:'ci_initial_execution',start:'2026-11-03T13:10:00Z',end:'2026-11-03T13:11:00Z',source:'github_actions_job',url:`https://github.com/${repo}/actions/runs/123/job/456`,head_sha:'a'.repeat(40)}],source:{closed_complete:true},windows:WINDOWS});
}
test('compact issue renders stage drilldown, timestamps, source link and longest PR',()=>{
 const body=renderCompact(fixture(),{runId:123});
 assert.match(body,/<details><summary>ci initial execution: 1 PR/);
 assert.match(body,/2026-11-03T13:10:00/);
 assert.match(body,/actions\/runs\/123\/job\/456/);
 assert.match(body,/<details><summary>#3288: 31 min/);
 assert.match(body,/pr-three-cohort-evidence/);
 assert.ok(body.length<60000);
});
test('compact issue distinguishes missing measurements and never invents zero CI minutes',()=>{
 const body=renderCompact(fixture(),{runId:123});
 assert.match(body,/<details><summary>source repair: 0 PR/);
 assert.match(body,/missing coverage, not 0 minutes/);
 assert.match(body,/unknown: 1 PR/);
});
test('invalid report identity or run cannot overwrite public monitor',()=>{
 assert.throws(()=>renderCompact({}, {runId:123}),/INVALID/);
 assert.throws(()=>renderCompact(fixture(),{runId:0}),/INVALID/);
 assert.throws(()=>renderCompact(fixture(),{runId:1,maxPerStage:1000}),/INVALID/);
});