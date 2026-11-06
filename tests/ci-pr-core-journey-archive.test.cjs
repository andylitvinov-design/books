'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {archive,fromEvent,parseShard,formatShard,getJobs}=require('../scripts/ci-pr-core-journey-archive.cjs');
const sha='a'.repeat(40),time='2026-11-04T14:20:00Z';
const event={id:123,run_attempt:1,name:'HH PR core release gate',event:'pull_request',
 status:'completed',conclusion:'success',created_at:time,updated_at:'2026-11-04T14:26:00Z',
 repository:{full_name:'andylitvinov-design/books'},head_repository:{full_name:'andylitvinov-design/books'},
 head_branch:'fix/timeline',pull_requests:[{number:3420,base:{ref:'codex/public-book-library'},
 head:{sha,ref:'fix/timeline'}}]};
test('reject ambiguous or wrong-source run',()=>{
 assert.equal(fromEvent({...event,pull_requests:[]}),null);
 assert.equal(fromEvent({...event,pull_requests:[...event.pull_requests,{...event.pull_requests[0],number:3421}]}),null);
 assert.equal(fromEvent({...event,head_branch:'other'}),null);
 assert.equal(fromEvent(event).source_head,sha);
});
test('shards are bounded and isolated',()=>{
 const src=formatShard('2026-11-04T14',[{run_id:1,attempt:1}]);
 assert.deepEqual(parseShard(src,'2026-11-04T14').runs,[{run_id:1,attempt:1}]);
 assert.equal(parseShard(src,'2026-11-04T16'),null);
 assert.throws(()=>formatShard('2026-11-04T14',[{text:'x'.repeat(59000)}]),/SIZE/);
});
test('missing jobs never become a fabricated last CI',()=>{
 const good={id:1234,name:'hh-core',created_at:'2026-11-04T14:20:12Z',
   started_at:'2026-11-04T14:20:20Z',completed_at:'2026-11-04T14:25:00Z',conclusion:'success'};
 const d=getJobs({data:{jobs:[good,{...good,id:1235,started_at:null}],total_count:2}},
    {run_id:123,queued_at:time});
 assert.equal(d.jobs.length,1);assert.equal(d.partial_jobs,true);
 assert.throws(()=>getJobs({data:{jobs:[],total_count:2}},
    {run_id:123,queued_at:time}),/INCOMPLETE/);
});
test('archive updates same run idempotently',async()=>{
 let body='',n=0;
 const github={rest:{
   actions:{listJobsForWorkflowRun:async()=>({data:{jobs:[{id:55,name:'hh-core',
     created_at:'2026-11-04T14:20:03Z',started_at:'2026-11-04T14:20:06Z',
     completed_at:'2026-11-04T14:24:00Z',conclusion:'success'}],total_count:1}})},
   pulls:{get:async()=>({data:{created_at:'2026-11-04T14:19:00Z',
     base:{ref:'codex/public-book-library'},head:{sha,ref:'fix/timeline',
     repo:{full_name:'andylitvinov-design/books'}},merged_at:null}})},
   issues:{
     listComments:async()=>({data:n?[{id:777,body}]:[],headers:{'x-ratelimit-remaining':'500'}}),
     createComment:async x=>{n++;body=x.body;},updateComment:async x=>{n++;body=x.body;}
   }
 }};
 const context={repo:{owner:'andylitvinov-design',repo:'books'},ref:'refs/heads/codex/bootstrap-books',
   eventName:'workflow_run',payload:{workflow_run:event}};
 assert.equal((await archive({github,context})).status,'ARCHIVED');
 assert.equal((await archive({github,context})).status,'ARCHIVED');
 assert.equal(parseShard(body,'2026-11-04T14-success').runs.length,1);
});
test('quota reserve prevents writes',async()=>{
 let writes=0;
 const github={rest:{
   actions:{listJobsForWorkflowRun:async()=>({data:{jobs:[{id:55,created_at:time,
     started_at:time,completed_at:'2026-11-04T14:25:00Z'}],total_count:1}})},
   pulls:{get:async()=>({data:{created_at:'2026-11-04T14:19:00Z',
     base:{ref:'codex/public-book-library'},head:{sha,ref:'fix/timeline',
       repo:{full_name:'andylitvinov-design/books'}}}})},
   issues:{listComments:async()=>({data:[],headers:{'x-ratelimit-remaining':'40'}}),
     createComment:async()=>{writes++;}}
 }};
 const context={repo:{owner:'andylitvinov-design',repo:'books'},ref:'refs/heads/codex/bootstrap-books',
   eventName:'workflow_run',payload:{workflow_run:event}};
 assert.equal((await archive({github,context})).status,'RATE_RESERVE');
 assert.equal(writes,0);
});
test('jobless startup is archived only as registration, never fabricated runner evidence',()=>{
 const failed=fromEvent({...event,conclusion:'startup_failure'});
 const data=getJobs({data:{jobs:[],total_count:0}},
   {...failed,updated_at:'2026-11-04T14:20:00Z'});
 assert.equal(data.registration_only,true);
 assert.equal(data.empty_job_reason,'STARTUP_FAILURE_NO_JOBS');
 assert.deepEqual(data.jobs,[]);
 assert.equal(data.completed_at,'2026-11-04T14:20:00.000Z');
 assert.throws(()=>getJobs({data:{jobs:[],total_count:0}},failed),/NO_CONFIRMED_JOBS/);
 assert.throws(()=>getJobs({data:{jobs:[],total_count:0}},
   {...failed,conclusion:'failure',updated_at:'2026-11-04T14:20:00Z'}),/NO_CONFIRMED_JOBS/);
});
test('archive verifies exact source SHA before saving a jobless startup event',async()=>{
 const initial={...event,
   path:'.github/workflows/hh-pr-core-release.yml@refs/heads/codex/public-book-library',
   head_sha:sha,conclusion:'startup_failure',pull_requests:[]};
 let writes=0,body='';
 const candidate={number:3420,created_at:'2026-11-04T14:19:00Z',
   state:'open',draft:false,base:{ref:'codex/public-book-library',sha:'b'.repeat(40)},
   head:{sha,ref:'fix/timeline',repo:{full_name:'andylitvinov-design/books'}}};
 const github={rest:{
   actions:{listJobsForWorkflowRun:async()=>({data:{total_count:0,jobs:[]}})},
   pulls:{list:async()=>({data:[candidate]}),get:async()=>({data:{
     ...candidate,merged_at:null}})},
   issues:{listComments:async()=>({data:[],headers:{'x-ratelimit-remaining':'500'}}),
     createComment:async x=>{writes++;body=x.body;}}
 }};
 const context={repo:{owner:'andylitvinov-design',repo:'books'},
   ref:'refs/heads/codex/bootstrap-books',eventName:'workflow_run',
   payload:{workflow_run:initial}};
 assert.equal((await archive({github,context})).status,'ARCHIVED');
 assert.equal(writes,1);
 const rows=parseShard(body,'2026-11-04T14-failure').runs;
 assert.equal(rows.length,1);
 assert.equal(rows[0].registration_only,true);
 assert.equal(rows[0].source_head,sha);
 assert.deepEqual(rows[0].jobs,[]);
 candidate.head.sha='c'.repeat(40);
 assert.equal((await archive({github,context})).status,'UNVERIFIED_PR_ASSOCIATION');
 assert.equal(writes,1);
});
test('cancelled workflow with real jobs is distinct from jobless startup',()=>{
 assert.equal(fromEvent({...event,conclusion:'cancelled'}).conclusion,'cancelled');
 assert.throws(()=>getJobs({data:{total_count:0,jobs:[]}},
   {queued_at:time,conclusion:'cancelled',updated_at:time}),/NO_CONFIRMED_JOBS/);
});
