'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {analyzeRepairCycles}=require('../pr-repair-cycle-model.cjs');
const A='a'.repeat(40),B='b'.repeat(40),BASE='c'.repeat(40);
const at=v=>'2026-11-06T'+v+':00Z';
const repository='andylitvinov-design/books';
const pr={number:99,created_at:at('10:00'),
  base:{ref:'codex/public-book-library'},head:{sha:B,ref:'feature/99'}};
const run=(id,sha,atTime,conclusion,number=99)=>({
  id,run_attempt:1,event:'pull_request',name:'HH PR core release gate',
  path:'.github/workflows/hh-pr-core-release.yml',head_sha:sha,status:'completed',
  conclusion,created_at:at(atTime),repository:{full_name:repository},
  head_repository:{full_name:repository},
  pull_requests:[{number,base:{ref:'codex/public-book-library'},
    head:{ref:'feature/99',sha}}]
});
const failed=run(800,A,'10:01','failure'),passed=run(801,B,'10:35','success');
const jobs=[{id:8001,run_id:800,run_attempt:1,status:'completed',name:'core-lint-types-build',
  conclusion:'failure',completed_at:at('10:10'),
  steps:[{name:'TypeScript',conclusion:'failure'}]},
  {id:8011,run_id:801,run_attempt:1,status:'completed',name:'core-lint-types-build',
   conclusion:'success',created_at:at('10:36'),started_at:at('10:40'),
   completed_at:at('10:55')}];
const comments=[
  {id:700,created_at:at('10:16'),updated_at:at('10:16'),
   body:'<!-- HH_PR_SWEEP_LEASE_V1 -->\n'+JSON.stringify({
    schema:'HH_PR_SWEEP_LEASE_V1',owner:'ci-agent',head_sha:A,
    base_sha:BASE,expires_at:at('11:00'),last_action:'claimed'})},
  {id:701,created_at:at('10:20'),updated_at:at('10:20'),
   body:'<!-- HH_PR_REPAIR_STARTED_V1 -->\n'+JSON.stringify({
    schema:'HH_PR_REPAIR_STARTED_V1',action:'repair_started',
    failed_run_id:800,failed_head_sha:A,owner:'ci-agent'})}
];
const timeline=[{event:'committed',sha:A,created_at:at('10:00')},
  {event:'committed',sha:B,created_at:at('10:30')}];
const opts={pr,runs:[failed,passed],jobs,comments,timeline,
 commentsComplete:true,runHistoryComplete:true};
test('six intervals are evidenced without attributing unknown agent work',()=>{
  const data=analyzeRepairCycles(opts);
  assert.equal(data.schema,'HH_PR_REPAIR_CYCLE_V1');
  assert.equal(data.source,'EXISTING_GITHUB_READS_NO_NEW_CALLS');
  assert.equal(data.observed_failed_heads,1);
  const c=data.cycles[0],dur=c.durations_minutes;
  assert.deepEqual([dur.failure_to_claim,dur.claim_to_repair,
    dur.repair_to_commit_event,dur.commit_event_to_ci,
    dur.ci_to_job_created,dur.job_created_to_runner],[6,4,10,5,1,4]);
  assert.equal(c.failed_job.step,'TypeScript');
  assert.equal(c.failed_job.root_cause_verified,false);
  assert.equal(c.timestamps.local_edit_started_at,null);
  assert.equal(c.timestamps.new_head_push_at,null);
  assert.equal(dur.local_edit_work,null);
  assert.equal(c.evidence.agent_received_task_verified,false);
  assert.equal(c.owner_claimed,'ci-agent');
  assert.equal(c.next_head,B);
});
test('edited leases, truncated timeline, missing markers must never become zero',()=>{
  const changed={...comments[0],updated_at:at('10:22')};
  const partial=analyzeRepairCycles({...opts,comments:[changed],
    timeline:Array(100).fill(timeline[1])}).cycles[0];
  assert.equal(partial.timestamps.owner_claimed_at,null);
  assert.equal(partial.timestamps.repair_declared_at,null);
  assert.equal(partial.timestamps.new_head_commit_event_at,null);
  assert.equal(partial.durations_minutes.failure_to_claim,null);
  assert.equal(partial.durations_minutes.commit_event_to_ci,null);
  assert.equal(partial.evidence.comments_complete,true);
  assert.equal(partial.evidence.timeline_complete,false);
  const partialComments=analyzeRepairCycles({...opts,commentsComplete:false}).cycles[0];
  assert.equal(partialComments.evidence.claim_immutable,false);
});
test('exact PR/head and complete failed-job identity are mandatory',()=>{
  assert.equal(analyzeRepairCycles({...opts,runs:[failed,run(801,B,'10:35','success',100)]})
    .cycles[0].next_head,null);
  assert.equal(analyzeRepairCycles({...opts,runs:[run(800,A,'10:01','failure',111),passed]})
    .observed_failed_heads,0);
  assert.equal(analyzeRepairCycles({...opts,jobs:[jobs[1]]}).observed_failed_heads,0);
  assert.throws(()=>analyzeRepairCycles({...opts,pr:{...pr,base:{ref:'main'}}}),
    /REPAIR_CYCLE_PR_UNVERIFIED/);
});
test('parallel next-head CI jobs are measured once by earliest actual start',()=>{
  const extra={id:8012,run_id:801,run_attempt:1,status:'completed',name:'hh-specialist',
    conclusion:'success',created_at:at('10:36'),started_at:at('10:45'),
    completed_at:at('10:54')};
  const c=analyzeRepairCycles({...opts,jobs:[...jobs,extra]}).cycles[0];
  assert.equal(c.durations_minutes.job_created_to_runner,4);
});

test('later workflow attempts ignore failures and runner jobs from previous attempts',()=>{
  const failedSecond={...failed,run_attempt:2};
  const passedSecond={...passed,run_attempt:2};
  const earlierFailure={...jobs[0],id:8999,run_attempt:1,completed_at:at('10:08')};
  const earlierRunner={...jobs[1],id:8998,run_attempt:1,
    created_at:at('10:35'),started_at:at('10:35')};
  const currentFailure={...jobs[0],run_attempt:2};
  const currentRunner={...jobs[1],run_attempt:2};
  const c=analyzeRepairCycles({...opts,runs:[failedSecond,passedSecond],
    jobs:[earlierFailure,currentFailure,earlierRunner,currentRunner]}).cycles[0];
  assert.equal(c.failed_job.id,8001);
  assert.equal(c.timestamps.ci_failed_at,at('10:10').replace('Z','.000Z'));
  assert.equal(c.timestamps.first_job_created_at,at('10:36').replace('Z','.000Z'));
  assert.equal(c.durations_minutes.failure_to_claim,6);
  assert.equal(c.durations_minutes.job_created_to_runner,4);
});
test('unknown run/job attempt is not enough to infer repair cycle',()=>{
  const missingRun={...failed,run_attempt:null};
  assert.equal(analyzeRepairCycles({...opts,runs:[missingRun,passed]})
    .observed_failed_heads,0);
  const missingJob={...jobs[0],run_attempt:null};
  assert.equal(analyzeRepairCycles({...opts,jobs:[missingJob,jobs[1]]})
    .observed_failed_heads,0);
});
