'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {joblessStartupReference,selectJoblessStartupRerun}=require('../scripts/ci-pr-jobless-startup.cjs');
const a='a'.repeat(40),b='b'.repeat(40);
const event={name:'HH PR core release gate',path:'.github/workflows/hh-pr-core-release.yml@refs/heads/codex/public-book-library',event:'pull_request',status:'completed',conclusion:'startup_failure',run_attempt:1,id:42068667988,repository:{full_name:'andylitvinov-design/books'},head_repository:{full_name:'andylitvinov-design/books'},head_sha:a,head_branch:'feature/safe',created_at:'2026-11-05T16:50:57Z',pull_requests:[]};
const pr={number:3615,created_at:'2026-11-05T16:48:54Z',state:'open',draft:false,base:{ref:'codex/public-book-library',sha:b},head:{ref:'feature/safe',sha:a,repo:{full_name:'andylitvinov-design/books'}}};
test('jobless GitHub startup event can be recovered only by a unique exact source PR',()=>{
 assert.deepEqual(joblessStartupReference(event,[pr]),{number:3615,base:{ref:pr.base.ref,sha:b},head:{ref:'feature/safe',sha:a}});
 for(const bad of [
  [pr,{...pr,number:9000}],[],[{...pr,draft:true}],
  [{...pr,state:'closed'}],[{...pr,head:{...pr.head,sha:b}}],
  [{...pr,head:{...pr.head,ref:'feature/other'}}],
  [{...pr,head:{...pr.head,repo:{full_name:'other/repo'}}}],
  [{...pr,base:{...pr.base,ref:'main'}}],
  [{...pr,created_at:'2026-11-05T17:00:00Z'}]
 ])assert.equal(joblessStartupReference(event,bad),null);
 for(const bad of [
  {...event,event:'workflow_dispatch'},{...event,conclusion:'failure'},
  {...event,run_attempt:2},{...event,pull_requests:[{number:3615}]},
  {...event,head_sha:b},{...event,head_branch:'feature/wrong'},
  {...event,repository:{full_name:'attacker/repo'}},
  {...event,head_repository:{full_name:'attacker/repo'}},
  {...event,path:'.github/workflows/other.yml'},
  {...event,created_at:'garbage'}
 ])assert.equal(joblessStartupReference(bad,[pr]),null);
});
test('only zero-job first-attempt startup can retry whole workflow',()=>{
 assert.deepEqual(selectJoblessStartupRerun(event,{total_count:0,jobs:[]}),
   {action:'rerun_workflow',reason:'FIRST_ATTEMPT_STARTUP_NO_JOBS'});
 for(const bad of [
  {total_count:1,jobs:[]},{total_count:0,jobs:[{id:1}]},
  {jobs:[]},{total_count:1,jobs:[{id:1}]}
 ])assert.equal(selectJoblessStartupRerun(event,bad).action,'hold');
 for(const bad of [{...event,conclusion:'failure'},
   {...event,conclusion:'cancelled'},{...event,run_attempt:2},
   {...event,status:'in_progress'}])
  assert.equal(selectJoblessStartupRerun(bad,{total_count:0,jobs:[]}).action,'hold');
});
