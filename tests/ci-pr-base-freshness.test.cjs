'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');
const {assessBaseFreshness}=require('../scripts/ci-pr-base-freshness.cjs');
const old='a'.repeat(40),head='b'.repeat(40);const pr={number:2868,base:{sha:old},changed_files:1};
const api=(path,status='modified',previous)=>({rest:{repos:{getBranch:async()=>({data:{commit:{sha:head}}})},pulls:{listFiles:async()=>({data:[{filename:path,status,...(previous?{previous_filename:previous}:{})}]})}}});
test('sensitive CI changes require CI against current production base',async()=>{
 assert.equal((await assessBaseFreshness({github:api('.github/workflows/gate.yml'),owner:'o',repo:'r',pr})).reason,'SENSITIVE_BASE_STALE');
});
test('ordinary changes can stay behind without needless branch sync',async()=>{
 assert.equal((await assessBaseFreshness({github:api('components/card.tsx'),owner:'o',repo:'r',pr})).ok,true);
});
test('renamed sensitive files and incomplete inventories fail closed',async()=>{
 assert.equal((await assessBaseFreshness({github:api('docs/moved.md','renamed','scripts/ci-check.cjs'),owner:'o',repo:'r',pr})).ok,false);
 assert.equal((await assessBaseFreshness({github:api('docs/readme.md'),owner:'o',repo:'r',pr:{...pr,changed_files:2}})).reason,'FILES_INCOMPLETE');
});
test('a current PR base cannot substitute for the base of the CI run',async()=>{
 const currentPr={...pr,base:{sha:head}};
 assert.equal((await assessBaseFreshness({github:api('.github/workflows/gate.yml'),owner:'o',repo:'r',pr:currentPr,verifiedRunBase:old})).reason,'SENSITIVE_CI_BASE_STALE');
 assert.equal((await assessBaseFreshness({github:api('.github/workflows/gate.yml'),owner:'o',repo:'r',pr:currentPr})).reason,'SENSITIVE_CI_BASE_UNVERIFIED');
});
test('accepts CI base only from the matching Core run and suite',()=>{
 const {coreRunBase}=require('../scripts/ci-pr-base-freshness.cjs');
 const p={...pr,head:{ref:'fix',sha:'c'.repeat(40)}};
 const run={id:4,event:'pull_request',name:'HH PR core release gate',path:'.github/workflows/hh-pr-core-release.yml',status:'completed',conclusion:'success',check_suite_id:55,repository:{full_name:'o/r'},head_repository:{full_name:'o/r'},head_branch:'fix',pull_requests:[{number:p.number,head:{sha:p.head.sha,ref:'fix'},base:{ref:'codex/public-book-library',sha:old}}]};
 assert.equal(coreRunBase(run,p,'o/r',55),old);
 assert.equal(coreRunBase({...run,check_suite_id:56},p,'o/r',55),null);
 assert.equal(coreRunBase({...run,pull_requests:[]},p,'o/r',55),null);
});
test('hourly verifier rejects external or malformed CI job URLs',async()=>{
 const {coreRunBaseForCheck}=require('../scripts/ci-pr-base-freshness.cjs');let called=0;
 const github={rest:{actions:{getWorkflowRun:async()=>{called++;throw Error('unexpected')}}}};
 assert.equal(await coreRunBaseForCheck({github,owner:'o',repo:'r',pr,check:{details_url:'https://attacker.test/o/r/actions/runs/42/job/5',check_suite:{id:55}}}),null);
 assert.equal(called,0);
});
test('hourly verifier binds the Core job to its original run',async()=>{
 const {coreRunBaseForCheck}=require('../scripts/ci-pr-base-freshness.cjs');
 const p={...pr,head:{ref:'fix',sha:'c'.repeat(40)}};
 const run={id:42,event:'pull_request',name:'HH PR core release gate',path:'.github/workflows/hh-pr-core-release.yml',status:'completed',conclusion:'success',check_suite_id:55,repository:{full_name:'o/r'},head_repository:{full_name:'o/r'},head_branch:'fix',pull_requests:[{number:p.number,head:{sha:p.head.sha,ref:'fix'},base:{ref:'codex/public-book-library',sha:old}}]};
 const github={rest:{actions:{getWorkflowRun:async()=>({data:run}),getJobForWorkflowRun:async()=>({data:{id:5,run_id:42,name:'hh-core-verified',status:'completed',conclusion:'success',check_run_url:'https://api.github.com/repos/o/r/check-runs/5'}})}}};
 assert.equal(await coreRunBaseForCheck({github,owner:'o',repo:'r',pr:p,check:{id:5,details_url:'https://github.com/o/r/actions/runs/42/job/5',check_suite:{id:55}}}),old);
});
test('the observed #2868 CI base predates current production',async()=>{
 const p={number:2868,base:{sha:'66f05429167887a7171cd7086a0138fa0b654c80'},changed_files:8};
 const github={rest:{repos:{getBranch:async()=>({data:{commit:{sha:'4be387c4453f140e99e9654db660a9067c00cfa8'}}})},pulls:{listFiles:async()=>({data:['.github/workflows/hh-ci-stale-run-prune.yml','.github/workflows/hh-pr-sweep-guard.yml','lib/ci/pr-sweep-guard.mjs','lib/ci/required-gate-policy.mjs','scripts/pr-sweep-guard.mjs','tests/ci-heavy-draft-policy.test.mjs','tests/pr-sweep-guard.test.mjs','tests/required-gate-policy.test.mjs'].map(filename=>({filename,status:'modified'}))})}}};
 assert.equal((await assessBaseFreshness({github,owner:'andylitvinov-design',repo:'books',pr:p,verifiedRunBase:p.base.sha})).reason,'SENSITIVE_BASE_STALE');
});
