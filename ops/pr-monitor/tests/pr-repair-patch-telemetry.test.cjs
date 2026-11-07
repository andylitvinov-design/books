'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {stageLine,parseComment,validate}=require('../../../scripts/ci-pr-stage-receipts.cjs');
const head='a'.repeat(40),newHead='b'.repeat(40),task='c'.repeat(32);
const now='2026-11-07T12:27:00Z';
const bot={id:41898282,login:'github-actions[bot]',type:'Bot'};
const auth={id:15368,slug:'github-actions'};
const body={stage:'patch_verified',pr_number:77,head_sha:head,
  run_id:12345,task_key:task,at:now,source:'github_actions_patch_verification_step'};

test('patch_verified is exact-run task-bound, never a generic guessed edit timestamp',()=>{
 assert.equal(validate(body),true);
 const marker=stageLine(body);
 assert.match(marker,/HH_PR_STAGE_V1/);
 const row={id:20,created_at:'2026-11-07T12:29:00Z',user:bot,
   performed_via_github_app:auth,body:marker};
 assert.equal(parseComment(row,{number:77,head}).length,1);
 assert.equal(parseComment(row,{number:78}).length,0);
 assert.equal(parseComment({...row,user:{...bot,id:999}},{number:77}).length,0);
 assert.equal(parseComment({...row,performed_via_github_app:{...auth,id:999}},{number:77}).length,0);
});
test('missing task, invalid source, wrong-new-SHA, forged future time rejected',()=>{
 for(const bad of [{task_key:null},{source:'actor_claim'},
  {new_sha:newHead},{at:'2026-11-07T12:27:00+01:00'}])
   assert.equal(validate({...body,...bad}),false,JSON.stringify(bad));
 const row={created_at:'2026-11-07T12:00:00Z',user:bot,
   performed_via_github_app:auth,body:stageLine(body)};
 assert.equal(parseComment(row,{number:77}).length,0);
});
