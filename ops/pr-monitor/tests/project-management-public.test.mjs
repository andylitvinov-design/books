import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const base=new URL('../',import.meta.url);
const file=p=>readFileSync(new URL(p,base),'utf8');
const data=JSON.parse(file('project-management-public.json'));
const js=file('project-management-public.js'),html=file('project-management-public.html'),nav=file('project-management-nav.js');
test('exactly two public concepts and 63 stable subtasks',()=>{
 assert.equal(data.schema,'HH_PM_PUBLIC_V1');
 assert.equal(data.projects.length,2);assert.deepEqual(data.projects.map(p=>p.stages.reduce((n,s)=>n+s.tasks.length,0)),[39,24]);
 assert.deepEqual(data.projects.map(p=>p.stages.length),[7,3]);
 for(const p of data.projects)for(const s of p.stages)for(const t of s.tasks){
  assert.match(t.id,/^[A-Z][0-9]{2}$/);assert.ok(['verified','partial','planned','blocked'].includes(t.status));
  assert.ok(t.prs.every(n=>Number.isInteger(n)&&n>0));assert.ok(t.title.length>8);
 }
});
test('no private identifiers or cross-origin login in public asset',()=>{
 const raw=file('project-management-public.json');
 assert.doesNotMatch(raw,/cc_pm_|owner_id|selected_option|auth_token|secret|user_id|access_token|email|acceptance|description/);
 assert.match(nav,/project-management-public\.html/);
 assert.doesNotMatch(nav,/holistichouse\.vercel\.app\/admin/);
 assert.doesNotMatch(html,/accounts\.google|holistichouse\.vercel\.app\/admin/);
 assert.doesNotMatch(js,/workflow_dispatch|service_role|authorization|setInterval\(/i);
});
test('on-demand GitHub readback only, CSP-compatible static assets and export',()=>{
 assert.match(js,/api\.github\.com/);assert.match(js,/HHPMProof/);assert.match(js,/URL\.createObjectURL/);
 assert.match(html,/project-management-public\.js/);assert.match(html,/project-management-public\.css/);
 assert.doesNotMatch(html,/<script(?![^>]*src=)[^>]*>/);
});

test('future task additions do not freeze the public viewer at a hardcoded 63',()=>{
 assert.doesNotMatch(js,/return count===63/);
 assert.match(js,/count>200/);
 assert.match(html,/id="pm-projects"/);
 assert.match(html,/id="pm-query"/);
 assert.match(html,/id="pm-status-filter"/);
 assert.match(html,/project-management-proof\.js/);
});

test('public CI check uses a shared exact-HEAD evidence helper',()=>{
 const proof=file('project-management-proof.js');
 assert.match(js,/HHPMProof/);
 assert.match(proof,/hh-merge-check/);
 assert.match(proof,/PARTIAL_CHECKRUN_COVERAGE/);
 assert.match(proof,/LIVE не подтверждён/);
 assert.doesNotMatch(js,/setInterval\(/);
});

test('exact-HEAD PR and gate evidence are separate from functional LIVE',async()=>{
 const {createRequire}=await import('node:module');
 const require=createRequire(import.meta.url);
 const {evaluatePR}=require('../project-management-proof.js');
 const head='a'.repeat(40),stale='b'.repeat(40);
 const pr={number:3831,head:{sha:head},base:{repo:{full_name:'andylitvinov-design/books'}},
   state:'closed',merged_at:'2026-11-07T15:37:02Z',draft:false};
 const gate=(sha,status,conclusion)=>({total_count:1,check_runs:[{name:'hh-merge-check',
   head_sha:sha,status,conclusion,completed_at:'2026-11-07T15:36:00Z'}]});
 const ok=evaluatePR(pr,gate(head,'completed','success'));
 assert.equal(ok.pr,'merged');assert.equal(ok.ci,'pass');
 assert.equal(ok.live,'unknown');assert.match(ok.label,/LIVE не подтверждён/);
 assert.equal(evaluatePR(pr,gate(stale,'completed','success')).ci,'unknown');
 assert.equal(evaluatePR(pr,gate(head,'completed','failure')).ci,'fail');
 assert.equal(evaluatePR(pr,gate(head,'in_progress',null)).ci,'pending');
 assert.equal(evaluatePR(pr,{total_count:101,check_runs:[]}).reason,'PARTIAL_CHECKRUN_COVERAGE');
 assert.equal(evaluatePR({...pr,head:{sha:'bad'}},null).pr,'unknown');
});

test('initial mobile view opens the first task stage before secondary GitHub inventory',()=>{
 assert.ok(html.indexOf('id="pm-root"')<html.indexOf('id="hh-pr-task-tree"'));
 assert.match(html,/<details class="pm-filter-panel">/);
 assert.match(html,/<details class="pm-live-panel">/);
 assert.match(html,/<h1>Задачи и PR<\/h1>/);
 assert.match(js,/projectCard\(p,i===0\)/);
 assert.match(js,/details\.open=!!first/);
 assert.match(js,/inspectStage\(root\.querySelector\('\.pm-stage\[open\]'\)\)/);
});
test('inline PR indicators are evidence-bound and task selection triggers bounded readback',()=>{
 assert.match(js,/pm-pr-inline/);assert.match(js,/pm-pr-pill/);
 assert.match(js,/badge\.dataset\.prNumber=String\(p\)/);
 assert.match(js,/HHPMProof\?\.evaluatePR/);
 assert.match(js,/pm-pr-unknown/);
 assert.match(js,/checking = new Map\(\)/);
 assert.match(js,/if\(seen\.size>6\)break/);
 assert.doesNotMatch(js,/setInterval\(|workflow_dispatch|service_role|Authorization:/i);
});
