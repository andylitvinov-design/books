'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {collectCompletedJobs}=require('../scripts/ci-pr-kpi-actions.cjs');
const NOW=Date.parse('2026-11-01T23:00:00Z'),AT='2026-11-01T22:30:00Z',END='2026-11-01T22:35:00Z';
const run={id:7,status:'completed',conclusion:'success',created_at:AT,repository:{full_name:'andylitvinov-design/books'}};
const job={id:9,run_id:7,name:'Core',status:'completed',conclusion:'success',created_at:AT,started_at:AT,completed_at:END};
const headers={'x-ratelimit-remaining':'4000'};
function fixture({missing=false,duplicate=false,active=false,jobFailure=false}={}){
 const github={rest:{repos:{get:async()=>({headers,data:{full_name:'andylitvinov-design/books',created_at:'2026-11-01T22:00:00Z'}})},actions:{listWorkflowRunsForRepo:async()=>({headers,data:{total_count:1,workflow_runs:[active?{...run,status:'in_progress'}:run]}}),
  listJobsForWorkflowRun:async()=>{if(jobFailure)throw Error('denied');return {headers,data:{total_count:missing?2:duplicate?2:1,jobs:duplicate?[job,job]:[job]}}}}}};
 return github;
}
test('collects actual completed jobs and preserves job timestamps',async()=>{
 const result=await collectCompletedJobs({github:fixture(),owner:'andylitvinov-design',repo:'books',since:NOW-3600000,until:NOW});
 assert.equal(result.complete,true);assert.equal(result.jobs.length,1);assert.equal(result.jobs[0].completed_at,END);
});
test('incomplete, duplicate, active and inaccessible job inventories cannot claim full coverage',async()=>{
 for(const options of [{missing:true},{duplicate:true},{active:true},{jobFailure:true}]){
  const result=await collectCompletedJobs({github:fixture(options),owner:'andylitvinov-design',repo:'books',since:NOW-3600000,until:NOW});
  assert.equal(result.complete,false);
 }
});
test('unverified rate budget and exhausted request cap fail closed',async()=>{
 const gh=fixture();gh.rest.actions.listWorkflowRunsForRepo=async()=>({data:{total_count:1,workflow_runs:[run]}});
 assert.equal((await collectCompletedJobs({github:gh,owner:'andylitvinov-design',repo:'books',since:NOW-3600000,until:NOW})).complete,false);
 assert.equal((await collectCompletedJobs({github:fixture(),owner:'andylitvinov-design',repo:'books',since:NOW-3600000,until:NOW,maxRequests:1})).complete,false);
});


test('a created-time slice does not claim complete job history for an older repository',async()=>{
 const gh=fixture();gh.rest.repos.get=async()=>({headers,data:{full_name:'andylitvinov-design/books',created_at:'2020-01-01T00:00:00Z'}});
 const result=await collectCompletedJobs({github:gh,owner:'andylitvinov-design',repo:'books',since:NOW-3600000,until:NOW});
 assert.equal(result.complete,false);assert.equal(result.reason,'HISTORICAL_RUNS_UNVERIFIED');
});

test('out-of-range runs and malformed job timing do not produce complete cost data',async()=>{
 const gh=fixture();gh.rest.actions.listWorkflowRunsForRepo=async()=>({headers,data:{total_count:1,workflow_runs:[{...run,created_at:'2026-10-31T22:30:00Z'}]}});
 assert.equal((await collectCompletedJobs({github:gh,owner:'andylitvinov-design',repo:'books',since:NOW-3600000,until:NOW})).complete,false);
 const bad=fixture();bad.rest.actions.listJobsForWorkflowRun=async()=>({headers,data:{total_count:1,jobs:[{...job,started_at:END,completed_at:AT}]}});
 assert.equal((await collectCompletedJobs({github:bad,owner:'andylitvinov-design',repo:'books',since:NOW-3600000,until:NOW})).complete,false);
});
test('splits a busy time range before the GitHub 1000-run ceiling',async()=>{
 const gh=fixture();let calls=0;
 gh.rest.actions.listWorkflowRunsForRepo=async({created})=>{
  calls++;const [a,b]=created.split('..').map(Date.parse);
  if(b-a>1800000)return {headers,data:{total_count:2500,workflow_runs:Array(100).fill(run)}};
  const inside=Date.parse(AT)>=a&&Date.parse(AT)<=b;
  return {headers,data:{total_count:inside?1:0,workflow_runs:inside?[run]:[]}};
 };
 const result=await collectCompletedJobs({github:gh,owner:'andylitvinov-design',repo:'books',since:NOW-3600000,until:NOW});
 assert.equal(result.complete,true);assert.equal(result.jobs.length,1);assert.ok(calls>=3);
});
