'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {computeCapacity,admission,snapshot}=require('../scripts/ci-pr-capacity.cjs');
const {run}=require('../scripts/ci-pr-ci-worker.cjs');
const CORE='HH PR core release gate';
const active=n=>Array.from({length:n},(_,i)=>({name:'unrelated '+i,id:i+1}));
const makeCore=()=>({info(){},summary:{addHeading(){return this},addCodeBlock(){return this},async write(){}}});

test('mandatory queued Core reserves runners against optional CI but not independent repair',()=>{
 const c=computeCapacity(active(8),[{name:CORE}],[]);
 assert.equal(c.coreQueuedRuns,1);
 assert.equal(admission('ci',c),'CORE_PRIORITY_PENDING');
 assert.equal(admission('repair',c),'ADMIT');
 const idle=computeCapacity(active(1),[{name:CORE}],[]);
 assert.equal(admission('ci',idle),'ADMIT'); // Do not idle free runners unnecessarily.
});

test('queued Core job inside running workflow is attributed to Core, not every workflow',()=>{
 const c=computeCapacity(active(8),[],[
  {status:'queued',workflow_name:CORE},
  {status:'in_progress',workflow_name:'Another specialist'},
  {status:'completed',workflow_name:CORE}
 ]);
 assert.equal(c.coreQueuedJobs,1);
 assert.equal(admission('ci',c),'CORE_PRIORITY_PENDING');
 assert.equal(c.runningJobs,1);
 assert.equal(c.queuedJobs,1);
 const unrelated=computeCapacity(active(8),[],[{status:'queued',workflow_name:'Another specialist'}]);
 assert.equal(unrelated.coreQueuedJobs,0);
 assert.equal(admission('ci',unrelated),'ADMIT');
});

test('snapshot derives job origin from the GitHub run, fails closed on missing data',async()=>{
 const gh={rest:{actions:{
  listWorkflowRunsForRepo:async({status})=>({data:{
   total_count:status==='queued'?0:1,
   workflow_runs:status==='queued'?[]:[{id:43,name:CORE}]
  }}),
  listJobsForWorkflowRun:async()=>({data:{total_count:2,jobs:[{status:'queued'},{status:'completed'}]}})
 }}};
 const s=await snapshot(gh,'andylitvinov-design','books');
 assert.equal(s.known,true);
 assert.equal(s.coreQueuedRuns,0);
 assert.equal(s.coreQueuedJobs,1);
 assert.equal(admission('ci',{...s,activeRuns:8}),'CORE_PRIORITY_PENDING');
});

test('scheduled independent CI worker refuses bootstrap while Core workflow is queued',async()=>{
 let issued=0;
 const gh={rest:{actions:{listWorkflowRunsForRepo:async({status})=>({data:{total_count:status==='queued'?2:8}})},
  issues:{listForRepo:async()=>{issued++;return {data:[]}}}},
  request:async(path,opts)=>({data:{total_count:opts.status==='queued'?1:0,workflow_runs:[]}})
 };
 const s=await run({github:gh,core:makeCore(),context:{repo:{owner:'andylitvinov-design',repo:'books'}},dryRun:true});
 assert.equal(s.reason,'CORE_PRIORITY_PENDING');
 assert.equal(issued,0);
 assert.equal(s.started,0);
});

test('scheduled CI worker fails closed when Core queued inventory is incomplete',async()=>{
 let issued=0;
 const gh={rest:{actions:{listWorkflowRunsForRepo:async({status})=>({data:{total_count:status==='queued'?2:8}})},
  issues:{listForRepo:async()=>{issued++;return {data:[]}}}},request:async()=>({data:{}})};
 const s=await run({github:gh,core:makeCore(),context:{repo:{owner:'andylitvinov-design',repo:'books'}},dryRun:true});
 assert.equal(s.reason,'CORE_QUEUE_UNVERIFIED');
 assert.equal(issued,0);
});
