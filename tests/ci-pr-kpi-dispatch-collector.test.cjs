'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {collectDispatcherEvents}=require('../scripts/ci-pr-kpi-dispatch-collector.cjs');
const {taskFor}=require('../scripts/ci-pr-task-state.cjs');
const SHA='a'.repeat(40),AT='2026-11-01T22:30:00Z';
const pr={number:7,state:'open',draft:false,user:{login:'andylitvinov-design'},base:{ref:'codex/public-book-library'},head:{sha:SHA,ref:'fix/example',repo:{full_name:'andylitvinov-design/books'}},labels:[{name:'hh:repair-needed'}]};
const task=taskFor(pr,{tier:'P1',direction:'other'});
const run={id:15,name:'HH PR Control Tower queue dispatcher',event:'workflow_dispatch',head_branch:'codex/bootstrap-books',status:'completed',conclusion:'success',run_attempt:1,created_at:'2026-11-01T22:29:00Z',updated_at:'2026-11-01T22:31:00Z',repository:{full_name:'andylitvinov-design/books'}};
const job={id:31,run_id:15,run_attempt:1,name:'dispatch',status:'completed',conclusion:'success'};
const summary={schema:'HH_CONTROL_DISPATCH_V1',checkedAt:AT,dryRun:false,dispatchAccepted:1,blocked:{OWNER_LEASE_ACTIVE:2},workerRuns:[{task_key:task.task_key,pr_number:7,head_sha:SHA,lane:'repair',outcome:'DISPATCH_ACCEPTED'}]};
const text='2026-11-01T22:30:01Z HH_CONTROL_TOWER: '+JSON.stringify(summary)+'\n';
const fixture=(data=text)=>({rest:{rateLimit:{get:async()=>({data:{rate:{remaining:4000}}})}},request:async()=>({data})});
test('reads bounded trusted dispatcher logs and records accepted tasks',async()=>{
 const r=await collectDispatcherEvents({github:fixture(),owner:'andylitvinov-design',repo:'books',runs:[run],jobs:[job],runsComplete:true,jobsComplete:true});
 assert.equal(r.complete,true);assert.equal(r.events.length,1);assert.equal(r.blocked.OWNER_LEASE_ACTIVE,2);
 assert.equal(r.blockerEvents[0].at,AT);
});
test('incomplete inventories, missing logs and low rate reserve stay partial',async()=>{
 const args={owner:'andylitvinov-design',repo:'books',runs:[run],jobs:[job],runsComplete:true,jobsComplete:true};
 assert.equal((await collectDispatcherEvents({...args,github:fixture(),jobsComplete:false})).complete,false);
 assert.equal((await collectDispatcherEvents({...args,github:fixture('no summary')})).complete,false);
 const low=fixture();low.rest.rateLimit.get=async()=>({data:{rate:{remaining:99}}});
 assert.equal((await collectDispatcherEvents({...args,github:low})).complete,false);
});
test('a failed or ambiguous dispatcher job cannot be treated as zero dispatches',async()=>{
 const args={owner:'andylitvinov-design',repo:'books',runs:[run],jobs:[job],runsComplete:true,jobsComplete:true,github:fixture()};
 assert.equal((await collectDispatcherEvents({...args,runs:[{...run,conclusion:'failure'}]})).complete,false);
 assert.equal((await collectDispatcherEvents({...args,jobs:[job,job]})).complete,false);
});

test('a re-run without every attempt log is explicitly partial',async()=>{
 const args={owner:'andylitvinov-design',repo:'books',runs:[{...run,run_attempt:2}],jobs:[{...job,run_attempt:2}],runsComplete:true,jobsComplete:true,github:fixture()};
 assert.equal((await collectDispatcherEvents(args)).complete,false);
});
