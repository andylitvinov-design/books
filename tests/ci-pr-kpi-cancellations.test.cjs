'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {REASONS,classifyRun,collectCancellationEvidence,summarizeCancellationWindow}=
 require('../scripts/ci-pr-kpi-cancellations.cjs');
const NOW=Date.parse('2026-11-03T06:00:00Z');
const A='a'.repeat(40),B='b'.repeat(40),C='c'.repeat(40),D='d'.repeat(40);
const at=m=>new Date(NOW-m*60000).toISOString();
const pr=(head=A,base=C,n=42)=>({number:n,head:{sha:head},base:{sha:base,ref:'codex/public-book-library'}});
const run=(id,conclusion,created=30,updated=10,head=A,base=C)=>({
 id,status:'completed',conclusion,created_at:at(created),updated_at:at(updated),
 run_attempt:1,event:'pull_request',head_sha:head,head_branch:'some-pr',
 path:'.github/workflows/core.yml',pull_requests:[pr(head,base)]});
const outcome=(r,next,states={})=>{
 const runs=next?[r,next]:[r],proofs=Object.fromEntries(runs.filter(x=>x.event==='pull_request')
  .map(x=>[String(x.id),{head:x.pull_requests[0].head.sha,base:x.pull_requests[0].base.sha}]));
 return classifyRun(r,runs,states,proofs);
};
test('six distinct classifications require a newer run on the same PR and workflow',()=>{
 const old=run(11,'cancelled');
 assert.deepEqual(REASONS,['EXPECTED_STALE','CLOSED_UNMERGED','BASE_MOVED','DUPLICATE','SUSPICIOUS_CANCEL','REAL_FAILURE']);
 assert.equal(outcome(old,run(12,'success',20,5,B)).reason,'EXPECTED_STALE');
 assert.equal(outcome(old,run(12,'success',20,5,A,D)).reason,'BASE_MOVED');
 assert.equal(outcome(old,run(12,'success',20,5,A,C)).reason,'DUPLICATE');
 assert.equal(outcome(old,null,{'42':{merged:false,closed_at:at(20)}}).reason,'CLOSED_UNMERGED');
 assert.equal(outcome(old,null,{'42':{merged:false,closed_at:at(5)}}).reason,'SUSPICIOUS_CANCEL');
 assert.equal(outcome(old,null,{'42':{merged:true,closed_at:at(20)}}).reason,'SUSPICIOUS_CANCEL');
 assert.equal(outcome(old,null).reason,'SUSPICIOUS_CANCEL');
 assert.equal(outcome(run(11,'failure'),null).reason,'REAL_FAILURE');
 assert.equal(outcome(run(11,'timed_out'),null).reason,'REAL_FAILURE');
});
test('different workflow, PR or later-than-cancellation runs never certify stale/duplicate',()=>{
 const old=run(11,'cancelled');
 const otherPR={...run(12,'success',20,5,B),pull_requests:[pr(B,C,43)]};
 assert.equal(outcome(old,otherPR).reason,'SUSPICIOUS_CANCEL');
 const otherWorkflow={...run(12,'success',20,5,B),path:'.github/workflows/specialist.yml'};
 assert.equal(outcome(old,otherWorkflow).reason,'SUSPICIOUS_CANCEL');
 assert.equal(outcome(old,run(12,'success',5,2,B)).reason,'SUSPICIOUS_CANCEL');
});
test('push-based supersession requires matching workflow and branch, not arbitrary workflow_run events',()=>{
 const base={...run(4,'cancelled'),event:'push',pull_requests:[],head_branch:'codex/bootstrap-books'};
 const newer={...run(5,'success',20,5,B),event:'push',pull_requests:[],head_branch:'codex/bootstrap-books'};
 assert.equal(outcome(base,newer).reason,'EXPECTED_STALE');
 assert.equal(outcome(base,{...newer,event:'workflow_run'}).reason,'SUSPICIOUS_CANCEL');
});
test('current mutable PR refs never replace immutable historical run HEAD',()=>{
 const old=run(11,'cancelled',30,10,A),newer=run(12,'success',20,5,B);
 // GitHub can retroactively report the newest PR head on both older runs.
 old.pull_requests=[pr(B,D)];newer.pull_requests=[pr(B,D)];
 assert.equal(classifyRun(old,[old,newer],{},{}).reason,'SUSPICIOUS_CANCEL');
 assert.equal(classifyRun(old,[old,newer],{},{
  '11':{head:A,base:null},'12':{head:B,base:null}
 }).reason,'EXPECTED_STALE');
});
test('unverified base changes never become a fabricated BASE_MOVED cause',()=>{
 const old=run(11,'cancelled',30,10,A,C),newer=run(12,'success',20,5,A,D);
 old.pull_requests=[pr(A,D)];newer.pull_requests=[pr(A,D)];
 assert.equal(classifyRun(old,[old,newer],{},{
  '11':{head:A,base:null},'12':{head:A,base:null}
 }).reason,'DUPLICATE');
 // Different immutable execution SHA with no verified base is unknown.
 newer.head_sha=B;
 assert.equal(classifyRun(old,[old,newer],{},{
  '11':{head:A,base:null},'12':{head:A,base:null}
 }).reason,'SUSPICIOUS_CANCEL');
 assert.equal(classifyRun(old,[old,newer],{},{
  '11':{head:A,base:C},'12':{head:A,base:D}
 }).reason,'BASE_MOVED');
});
test('runner-minute sample counts actual job execution, not workflow duration or queue wait',()=>{
 const cancelled=run(11,'cancelled');
 const failed={...run(12,'failure',20,8),path:'.github/workflows/specialist.yml'};
 const source={candidateRunIds:[11,12],workflowRuns:[cancelled,failed],
  verifiedJobRunIds:[11,12],jobs:[
   {id:1,run_id:11,run_attempt:1,conclusion:'cancelled',status:'completed',runner_id:101,runner_name:'GitHub Actions 101',started_at:at(22),completed_at:at(15)},
   {id:2,run_id:11,run_attempt:1,conclusion:'cancelled',status:'completed',
    started_at:null,completed_at:at(15),runner_id:0,runner_name:''},
   {id:3,run_id:12,run_attempt:1,conclusion:'failure',status:'completed',runner_id:102,runner_name:'GitHub Actions 102',started_at:at(17),completed_at:at(12)}]};
 const s=summarizeCancellationWindow({source,now:NOW,windowMs:3600000});
 assert.equal(s.counts.SUSPICIOUS_CANCEL,1);
 assert.equal(s.counts.REAL_FAILURE,1);
 assert.equal(s.runner_minutes_observed.SUSPICIOUS_CANCEL,7);
 assert.equal(s.runner_minutes_observed.REAL_FAILURE,5);
 assert.equal(s.cancelled_runner_minutes_observed,7);
 assert.equal(s.failed_runner_minutes_observed,5);
 assert.equal(s.verified_job_inventories,2);
 assert.equal(s.label,'SAMPLE_NOT_TOTAL');
 assert.equal(s.cancelled_before_runner,0);
});
test('missing job inventory is unknown, while verified queue-only cancellation costs zero runner minutes',()=>{
 const source={candidateRunIds:[11,12],workflowRuns:[run(11,'cancelled'),{...run(12,'cancelled'),path:'.github/workflows/specialist.yml'}],
  verifiedJobRunIds:[11],jobs:[{id:1,run_id:11,status:'completed',conclusion:'cancelled',
   started_at:null,completed_at:at(14),runner_id:0,runner_name:''}]};
 const s=summarizeCancellationWindow({source,now:NOW,windowMs:3600000});
 assert.equal(s.counts.SUSPICIOUS_CANCEL,2);
 assert.equal(s.verified_job_inventories,1);
 assert.equal(s.unverified_job_inventories,1);
 assert.equal(s.cancelled_before_runner,1);
 assert.equal(s.examples.find(x=>x.run_id===12).runner_minutes,null);
 assert.equal(s.cancelled_runner_minutes_observed,0);
});
test('GitHub queued cancellation with started_at but runner_id=0 never consumes runner-minutes',()=>{
 const job={id:9,run_id:11,run_attempt:1,status:'completed',conclusion:'cancelled',
  runner_id:0,runner_name:'',started_at:at(29),completed_at:at(10)};
 const s=summarizeCancellationWindow({source:{workflowRuns:[run(11,'cancelled')],
  candidateRunIds:[11],verifiedJobRunIds:[11],jobs:[job]},now:NOW,windowMs:3600000});
 assert.equal(s.runner_minutes_observed.SUSPICIOUS_CANCEL,0);
 assert.equal(s.cancelled_before_runner,1);
});
test('accounting includes cancelled runs only once even with successor inventory and excludes older window',()=>{
 const first=run(11,'cancelled',130,125),next=run(12,'success',120,110,B);
 const s=summarizeCancellationWindow({source:{candidateRunIds:[11],workflowRuns:[first,next],
  verifiedJobRunIds:[],jobs:[]},now:NOW,windowMs:3600000});
 assert.equal(s.scanned_run_sample,0);
});
test('bounded collector records verified job inventories, prior state and real API evidence',async()=>{
 const cancelled=run(11,'cancelled'),succeed=run(12,'success',20,5,B),failed=run(13,'failure',19,8);
 const h={'x-ratelimit-remaining':'4000'};
 let reads=0;
 const gh={
  rest:{git:{getCommit:async args=>{reads++;return {headers:h,data:{sha:args.commit_sha,parents:[{sha:C}],message:'test'}};}},actions:{
   listWorkflowRunsForRepo:async args=>{
    reads++;const values=args.status==='cancelled'?[cancelled]:args.status==='failure'?[failed]:
     args.status?[ ]:[cancelled,succeed,failed];
    return {headers:h,data:{total_count:values.length,workflow_runs:values}};
   },
   listJobsForWorkflowRun:async args=>{
    reads++;return {headers:h,data:{total_count:args.run_id===11?1:0,
     jobs:args.run_id===11?[{id:100,run_id:11,run_attempt:1,conclusion:'cancelled',
      status:'completed',runner_id:103,runner_name:'GitHub Actions 103',started_at:at(20),completed_at:at(15)}]:[]}};
   }
  }},
  graphql:async()=>({rateLimit:{remaining:3900},repository:{p42:{number:42,merged:false,closedAt:null}}})
 };
 const s=await collectCancellationEvidence({github:gh,owner:'andylitvinov-design',repo:'books',
  since:NOW-86400000,until:NOW,maxRequests:15,minRemaining:100,maxRuns:4});
 assert.equal(s.complete,false);assert.equal(s.candidateRunIds.length,2);
 assert.deepEqual(new Set(s.verifiedJobRunIds),new Set([11,13]));
 assert.equal(s.prStates['42'].merged,false);
 assert.ok(reads>=9);
 const w=summarizeCancellationWindow({source:s,now:NOW,windowMs:3600000});
 assert.equal(w.counts.EXPECTED_STALE,1);assert.equal(w.counts.REAL_FAILURE,1);
 assert.equal(w.runner_minutes_observed.EXPECTED_STALE,5);
});
test('API failure, permissions or budget truncation never claim complete coverage',async()=>{
 const h={'x-ratelimit-remaining':'4000'};
 const gh={rest:{actions:{listWorkflowRunsForRepo:async()=>({headers:h,data:{total_count:1,workflow_runs:[run(11,'cancelled')]}}),
  listJobsForWorkflowRun:async()=>{throw Error('denied');}}}};
 const s=await collectCancellationEvidence({github:gh,owner:'andylitvinov-design',repo:'books',
  since:NOW-3600000,until:NOW,maxRequests:10,minRemaining:100,maxRuns:2});
 assert.equal(s.complete,false);
 assert.equal(s.verifiedJobRunIds.length,0);
 assert.equal(summarizeCancellationWindow({source:s,now:NOW,windowMs:3600000}).unverified_job_inventories,1);
});
