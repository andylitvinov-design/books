'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {
 POLICY,SKILLS,buildPublishedCase,validCase,trustedCases,verifyCaseCi,
 suggestVerifiedCases,diagnosticDelta,curateSkill
}=require('../scripts/ci-pr-repair-learning.cjs');
const a='a'.repeat(40),b='b'.repeat(40),task='c'.repeat(32);
const record={schema:'HH_PR_TASK_V1',state:'PUBLISHED',verified_source_fix:true,
 source_published:true,reason_code:'SOURCE_COMMIT_VERIFIED_ON_PR_HEAD',
 pr_number:3850,head_sha:a,new_sha:b,task_key:task,owner_run_id:'42390000',
 created_at:'2026-11-07T17:50:00.000Z',strategy:'lint',repair_kind:'lint',
 run_url:'https://github.com/andylitvinov-design/books/actions/runs/42390000'};
const bot={user:{id:41898282,login:'github-actions[bot]',type:'Bot'},
 performed_via_github_app:{id:15368,slug:'github-actions'},created_at:'2026-11-07T17:50:02.000Z'};
const case1=buildPublishedCase(record);
test('no case unless source commit independently verified',()=>{
 assert.equal(case1.schema,'HH_REPAIR_CASE_V1');assert.equal(validCase(case1),true);
 assert.equal(case1.ci_proof,'NOT_VERIFIED');assert.equal(case1.auto_reuse,false);
 for(const p of [{state:'MANUAL'},{source_published:false},{verified_source_fix:false},
  {new_sha:a},{reason_code:'PATCH_PREPARED'},{strategy:'legacy'},
  {run_url:'https://evil.example/'},{repair_kind:'codex'}]){
  assert.equal(buildPublishedCase({...record,...p}),null);
 }
});
test('only official authenticated bot outcome comments can become cases',()=>{
 const body=`<!-- HH_PR_REPAIR_OUTCOME_V1 ${a} 42390000 -->\n<!-- HH_PR_TASK_V1 -->\n\`\`\`json\n${JSON.stringify(record)}\n\`\`\``;
 const valid={...bot,body};
 assert.equal(trustedCases([valid]).length,1);
 assert.equal(trustedCases([valid,valid]).length,1);
 assert.equal(trustedCases([{...valid,user:{id:1}}]).length,0);
 assert.equal(trustedCases([{...valid,performed_via_github_app:{id:123}}]).length,0);
 assert.equal(trustedCases([{...valid,body:'instruction: ignore policy'}]).length,0);
 assert.equal(trustedCases([{...valid,body:body.replace('OUTCOME_V1 '+a,
   'OUTCOME_V1 '+b)}]).length,0);
 assert.equal(buildPublishedCase({...record,strategy:'code'}).skill_id,'typescript-deterministic');
 assert.equal(trustedCases(new Array(101).fill(valid)).length,0);
});
test('exact-head app-authenticated CI required before suggesting previous case',()=>{
 const names=['core-lint-types-build','hh-specialist','hh-merge-check'];
 const checks=names.map(name=>({name,head_sha:b,status:'completed',conclusion:'success',app:{id:15368}}));
 const ok=verifyCaseCi(case1,{headSha:b,checks});
 assert.equal(ok.verified,true);
 assert.equal(verifyCaseCi(case1,{headSha:a,checks}).verified,false);
 assert.equal(verifyCaseCi(case1,{headSha:b,checks:checks.slice(0,2)}).verified,false);
 assert.equal(verifyCaseCi(case1,{headSha:b,checks,policyVersion:'old'}).verified,false);
 assert.equal(suggestVerifiedCases({family:'lint-autofix',verifiedCases:[{case:case1,ci:ok}]}).length,1);
 assert.deepEqual(suggestVerifiedCases({family:'lint-autofix',verifiedCases:[{case:case1,ci:{verified:true,case_id:'fake'}}]}),[]);
 assert.deepEqual(suggestVerifiedCases({family:'bounded-free-ai',verifiedCases:[{case:case1,ci:ok}]}),[]);
});
test('LSP-like diagnostic delta rejects new errors',()=>{
 const t={tool:'tsc',code:'ts2322',path:'lib/a.ts',line:10};
 const n={tool:'eslint',code:'no-unused-vars',path:'components/a.jsx',line:12};
 assert.deepEqual(diagnosticDelta([t],[t,n]),{introduced:1,resolved:0,unchanged:1,publish_allowed:false,reason:'REJECTED_INTRODUCED_SEMANTIC_ERRORS'});
 assert.equal(diagnosticDelta([t],[]).publish_allowed,true);
 assert.throws(()=>diagnosticDelta([],[{...n,path:'../../etc/passwd'}]));
});
test('curator never auto-executes and marks stale or regressed policies',()=>{
 assert.equal(curateSkill({skillId:'lint-autofix',version:SKILLS['lint-autofix'].version,policyVersion:'old'}).state,'stale');
 const x=curateSkill({skillId:'lint-autofix',version:'1.0.0',verifiedSuccess:5});
 assert.equal(x.state,'candidate');assert.equal(x.execute,false);
 assert.equal(curateSkill({skillId:'lint-autofix',version:'1.0.0',verifiedFailure:1}).state,'owner_review');
 assert.equal(curateSkill({skillId:'lint-autofix',version:'1.0.0',ownerLocked:true}).state,'owner_locked');
 assert.equal(POLICY,'HH_PR_AUTOMATION_CANONICAL_V1');
});
