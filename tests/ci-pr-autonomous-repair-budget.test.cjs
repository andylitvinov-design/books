'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {sourceRepairBudget}=require('../scripts/ci-pr-autonomous-repair-budget.cjs');
const PR=4925,SHA='a'.repeat(40);
const doc=(rec,id)=>({id,user:{id:41898282,login:'github-actions[bot]',type:'Bot'},
 performed_via_github_app:{id:15368,slug:'github-actions'},
 body:'<!-- HH_PR_TASK_V1 -->\n'+String.fromCharCode(96).repeat(3)+'json\n'+JSON.stringify(rec)+'\n'+String.fromCharCode(96).repeat(3)});
const pub=i=>doc({schema:'HH_PR_TASK_V1',pr_number:PR,task_key:String(i).repeat(32),
 head_sha:String.fromCharCode(96+i).repeat(40),
 new_sha:String.fromCharCode(97+i).repeat(40),state:'PUBLISHED',
 outcome:'VERIFIED_SOURCE_COMMIT',source_published:false},i);
test('three signed published commits bound any fourth automatic patch',()=>{
 const recs=[pub(1),pub(2),pub(3)];
 assert.equal(sourceRepairBudget([],{prNumber:PR}).nextAttempt,1);
 assert.equal(sourceRepairBudget(recs.slice(0,1),{prNumber:PR}).nextAttempt,2);
 assert.equal(sourceRepairBudget(recs.slice(0,2),{prNumber:PR}).nextAttempt,3);
 const result=sourceRepairBudget(recs,{prNumber:PR});
 assert.equal(result.status,'EXHAUSTED');
 assert.equal(result.count,3);
 assert.equal(result.nextAttempt,null);
 assert.equal(sourceRepairBudget([...recs,recs[2]],{prNumber:PR}).count,3);
});
test('foreign or malformed receipt does not bypass source-write safety',()=>{
 const one=pub(1),foreign={...pub(2),user:{id:1,login:'outsider',type:'User'}};
 assert.equal(sourceRepairBudget([one,foreign],{prNumber:PR}).count,1);
 assert.equal(sourceRepairBudget([one],{prNumber:4883}).count,0);
 const bad=doc({schema:'HH_PR_TASK_V1',pr_number:PR,task_key:'f'.repeat(32),
  head_sha:SHA,new_sha:SHA,state:'PUBLISHED',outcome:'VERIFIED_SOURCE_COMMIT'},5);
 assert.equal(sourceRepairBudget([bad],{prNumber:PR}).status,'UNVERIFIED_PUBLISHED_RECEIPT');
 assert.equal(sourceRepairBudget(null,{prNumber:PR}).status,'UNVERIFIED_HISTORY');
});
test('dispatcher persists signed attempt and exact-head terminal owner escalation',()=>{
 const source=fs.readFileSync('scripts/ci-pr-queue-dispatcher.cjs','utf8');
 assert.match(source,/sourceRepairBudget\(comments,\{prNumber:task\.pr_number\}\)/);
 assert.match(source,/AUTONOMOUS_SOURCE_PATCH_LIMIT_REACHED/);
 assert.match(source,/autonomous_source_patch_attempt:repairBudget\.nextAttempt/);
 assert.match(source,/HH_AUTONOMOUS_SOURCE_BUDGET_V1/);
 assert.match(source,/SOURCE_BUDGET_HEAD_MOVED/);
 assert.match(source,/labels:\['hh:repair-manual'\]/);
});
