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
 assert.match(js,/api\.github\.com/);assert.match(js,/hh-merge-check/);assert.match(js,/URL\.createObjectURL/);
 assert.match(html,/project-management-public\.js/);assert.match(html,/project-management-public\.css/);
 assert.doesNotMatch(html,/<script(?![^>]*src=)[^>]*>/);
});
