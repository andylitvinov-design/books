'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {parseDispatcherLog}=require('../scripts/ci-pr-kpi-dispatch.cjs');
const {taskFor}=require('../scripts/ci-pr-task-state.cjs');
const SHA='a'.repeat(40),AT='2026-11-01T22:30:00Z';
const pr={number:7,state:'open',draft:false,user:{login:'andylitvinov-design'},base:{ref:'codex/public-book-library'},head:{sha:SHA,ref:'fix/example',repo:{full_name:'andylitvinov-design/books'}},labels:[{name:'hh:repair-needed'}]};
const task=taskFor(pr,{tier:'P1',direction:'other'});
const run={id:15,name:'HH PR Control Tower queue dispatcher',event:'workflow_dispatch',head_branch:'codex/bootstrap-books',status:'completed',conclusion:'success',created_at:'2026-11-01T22:29:00Z',updated_at:'2026-11-01T22:31:00Z',repository:{full_name:'andylitvinov-design/books'}};
const summary={schema:'HH_CONTROL_DISPATCH_V1',checkedAt:AT,dryRun:false,dispatchAccepted:1,blocked:{OWNER_LEASE_ACTIVE:2},workerRuns:[{task_key:task.task_key,pr_number:7,head_sha:SHA,lane:'repair',outcome:'DISPATCH_ACCEPTED'}]};
const log=x=>'2026-11-01T22:30:01Z HH_CONTROL_TOWER: '+JSON.stringify(x)+'\n';
test('accepts one same-repo trusted dispatcher summary with exact task identity',()=>{
 const r=parseDispatcherLog(run,log(summary));assert.equal(r.complete,true);assert.equal(r.events.length,1);
 assert.equal(r.events[0].kind,'dispatched');assert.equal(r.events[0].at,AT);assert.equal(r.blocked.OWNER_LEASE_ACTIVE,2);
});
test('missing, inconsistent, duplicate, dry-run and foreign log evidence cannot count as dispatch',()=>{
 for(const [r,t] of [[run,'no summary'],[run,log({...summary,dispatchAccepted:0})],
  [run,log({...summary,workerRuns:[{...summary.workerRuns[0],task_key:'f'.repeat(32)}]})],
  [run,log(summary)+log(summary)],[{...run,repository:{full_name:'other/repo'}},log(summary)]])
  assert.equal(parseDispatcherLog(r,t).complete,false);
 const dry=parseDispatcherLog(run,log({...summary,dryRun:true,dispatchAccepted:0,workerRuns:[]}));
 assert.equal(dry.complete,true);assert.equal(dry.events.length,0);
});
test('accepts the recorded dispatcher summary without inventing dispatches',()=>{
 const actualRun={...run,id:41359744944,created_at:'2026-11-01T22:58:10Z',updated_at:'2026-11-01T22:58:53Z'};
 const actualSummary={schema:'HH_CONTROL_DISPATCH_V1',checkedAt:'2026-11-01T22:58:38.287Z',dryRun:false,
  discovered:190,production:176,actionable:18,candidates:16,inspected:16,dispatchAccepted:0,wouldDispatch:0,
  blocked:{SOURCE_PROOF_MISSING:2,OWNER_LEASE_ACTIVE:1,CONFLICT_NOT_VERIFIED:11,RESERVED_REQUIRES_REVIEW:1,ALREADY_HANDLED:1},workerRuns:[]};
 const parsed=parseDispatcherLog(actualRun,'2026-11-01T22:58:50.4403387Z HH_CONTROL_TOWER: '+JSON.stringify(actualSummary));
 assert.equal(parsed.complete,true);assert.equal(parsed.events.length,0);assert.equal(parsed.blocked.CONFLICT_NOT_VERIFIED,11);
});
