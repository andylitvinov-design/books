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

const {buildTaskOutcome}=require('../scripts/ci-pr-task-outcome.cjs');
const modern=i=>{
 const record={schema:'HH_PR_TASK_V1',pr_number:PR,task_key:String(i).repeat(32),
  head_sha:String.fromCharCode(96+i).repeat(40),
  new_sha:String.fromCharCode(97+i).repeat(40),state:'PUBLISHED',
  reason_code:'SOURCE_COMMIT_VERIFIED_ON_PR_HEAD',
  source_published:true,verified_source_fix:true,owner_run_id:String(100+i)};
 return {...record,outcome:buildTaskOutcome({...record,head_matches:true,
  now:'2026-11-25T12:00:00Z',claim_status:'claimed'})};
};
test('publisher and modern signed finalizer receipts count the same patch once and allow the next safe attempt',()=>{
 const first=modern(1),second=modern(2),third=modern(3);
 const pair=[pub(1),doc(first,11)];
 assert.equal(sourceRepairBudget(pair,{prNumber:PR}).count,1);
 assert.equal(sourceRepairBudget(pair,{prNumber:PR}).nextAttempt,2);
 assert.equal(sourceRepairBudget([...pair,doc(second,12)],{prNumber:PR}).nextAttempt,3);
 const result=sourceRepairBudget([...pair,doc(second,12),doc(third,13)],{prNumber:PR});
 assert.equal(result.status,'EXHAUSTED');
 assert.equal(result.count,3);
 assert.equal(sourceRepairBudget([doc(first,11)],{prNumber:PR}).nextAttempt,2);
});
test('a contradictory or fabricated structured finalizer outcome fails closed',()=>{
 const r=modern(1);
 for(const bad of [
  {...r,source_published:false},
  {...r,verified_source_fix:false},
  {...r,outcome:{...r.outcome,new_sha:'f'.repeat(40)}},
  {...r,outcome:{...r.outcome,head_sha:'f'.repeat(40)}},
  {...r,outcome:{...r.outcome,task_key:'f'.repeat(32)}},
  {...r,outcome:{...r.outcome,owner_run_id:'999'}},
  {...r,outcome:{...r.outcome,pr_number:PR+1}},
  {...r,outcome:{...r.outcome,verified_source:false}}
 ]){
  assert.equal(sourceRepairBudget([pub(1),doc(bad,11)],{prNumber:PR}).status,
   'UNVERIFIED_PUBLISHED_RECEIPT');
 }
 const conflict={...modern(2),new_sha:r.new_sha,outcome:'VERIFIED_SOURCE_COMMIT'};
 assert.equal(sourceRepairBudget([doc(r,11),doc(conflict,12)],{prNumber:PR}).status,
   'UNVERIFIED_PUBLISHED_RECEIPT');
});
