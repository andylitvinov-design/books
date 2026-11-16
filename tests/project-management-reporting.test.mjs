import test from 'node:test';
import assert from 'node:assert/strict';
import {projectReports,taskTotals,statusOf,textReport} from '../lib/project-management/reporting.mjs';
const input={coverage:{complete:true},projects:[{id:'p',title:'Parent'}],epics:[{id:'e',project_id:'p',title:'Stage'}],tasks:[{id:'a',epic_id:'e',title:'Real',state:'completed_verified',acceptance:'Proof'},{id:'b',epic_id:'e',title:'Blocked',state:'blocked_external'}],prLinks:[{task_id:'a',pr_number:3830}]};
test('counts and hierarchy are exact',()=>{const r=projectReports(input);assert.equal(r.projects[0].stages[0].subs.length,2);assert.equal(r.totals.total,2);assert.equal(r.totals.verified,1);assert.equal(r.totals.blocked,1);assert.equal(r.totals.withPR,1)});
test('no false completion or unknown percentage',()=>{assert.equal(taskTotals([]).percent,null);assert.equal(statusOf('awaiting_evidence'),'partial');assert.equal(statusOf('blocked_budget'),'blocked')});
test('export is scoped and does not claim LIVE on READY',()=>{const r=projectReports(input,{a:{observedAt:'now',ci:'passed',codeOnProduction:true,functionalAccepted:false}});const p=r.projects[0];assert.match(textReport(p,{complete:r.complete}),/LIVE UNVERIFIED/);assert.match(textReport(p,{taskId:'a'}),/PR #3830/);assert.doesNotMatch(textReport(p,{taskId:'a'}),/Blocked/)});
