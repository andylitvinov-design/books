'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
test('Control Tower skips canceled/skipped callbacks while preserving separate PR contract lane',()=>{
 const s=require('node:fs').readFileSync('.github/workflows/hh-pr-queue-dispatcher.yml','utf8');
 assert.ok(s.includes("github.event.workflow_run.conclusion != 'cancelled'"));
 assert.ok(s.includes("github.event.workflow_run.conclusion != 'skipped'"));
 assert.ok(s.includes("github.event_name != 'workflow_run'"));
 assert.ok(s.includes("group: hh-control-contract-"));
 assert.ok(s.includes("group: hh-control-tower-single-writer"));
});
const {taskFor,validPR,laneOf,reservation,commentBody,reservationStatus,externalOwnerLeaseStatus}=require('../scripts/ci-pr-task-state.cjs');
const {computeCapacity,admission,snapshot}=require('../scripts/ci-pr-capacity.cjs');
const {trustedContext,planCandidates,run,workerBusyOrCooling}=require('../scripts/ci-pr-queue-dispatcher.cjs');
const SHA='a'.repeat(40),NOW=Date.parse('2026-11-01T20:00:00Z');
const context={repo:{owner:'andylitvinov-design',repo:'books'},
 ref:'refs/heads/codex/bootstrap-books',eventName:'workflow_dispatch',runId:42,payload:{inputs:{}}};
const pr=(number,lane='repair',extra={})=>({number,title:number===1?'fix(video): broken rendering':'feat(tests): updates',
 state:'open',draft:false,mergeable:true,mergeable_state:'clean',user:{login:'andylitvinov-design'},
 base:{ref:'codex/public-book-library'},
 head:{ref:'branch-'+number,sha:SHA,repo:{full_name:'andylitvinov-design/books'}},
 labels:[{name:lane==='repair'?'hh:repair-needed':lane==='ci'?'hh:ci-needed':'hh:conflict-repair-needed'}],
 ...extra});
const cap=(active=0,queued=0)=>computeCapacity(
 Array.from({length:active},(_,i)=>({name:'Some core check '+i})),
 Array.from({length:queued},(_,i)=>({name:'Some queued check '+i})),
 [{status:'in_progress'}]);
const core=()=>({info(){},summary:{addHeading(){return this},addCodeBlock(){return this},async write(){}}});
function fixture(items,{comments={},active=0,queued=0,recent=[],live=null}={}){
 const calls={dispatched:[],reserved:[],read:[],removed:[],labels:[]};
 const github={rest:{pulls:{
  list:async({page})=>({data:page===1?items:[],headers:{'x-ratelimit-remaining':'2500'}}),
  get:async({pull_number})=>({data:live||items.find(x=>x.number===pull_number)}),
  listFiles:async()=>({data:[{filename:'src/a.js',status:'modified'}]})
 },issues:{
  listComments:async({issue_number})=>({data:comments[issue_number]||[]}),
  createComment:async arg=>{calls.reserved.push(arg);return {data:{id:5}};},
  addLabels:async arg=>{calls.labels.push(arg);return {data:{}};},
  removeLabel:async arg=>{calls.removed.push(arg);return {data:{}};}
 },actions:{createWorkflowDispatch:async arg=>{calls.dispatched.push(arg);return {status:204};}}},
 request:async()=>({data:{workflow_runs:recent}})};
 return {github,calls,capacityFn:async()=>cap(active,queued)};
}
const proof=(sha=SHA)=>({user:{id:41898282,login:'github-actions[bot]',type:'Bot'},performed_via_github_app:{id:15368,slug:'github-actions'},body:'<!-- HH_PR_10MIN_SOURCE_REPAIR_V1 '+sha+' -->'});
test('task identity includes PR, exact HEAD and lane; manual holds are excluded',()=>{
 const a=pr(1);assert.equal(validPR(a),true);assert.equal(laneOf(a),'repair');
 const x=taskFor(a,{tier:'P1',direction:'video'});
 assert.equal(x.task_key.length,32);
 assert.notEqual(taskFor({...a,number:2},{tier:'P1'}).task_key,x.task_key);
 assert.notEqual(taskFor(pr(1,'ci'),{tier:'P1'}).task_key,x.task_key);
 assert.equal(laneOf(pr(1,'repair',{labels:[{name:'hh:repair-needed'},{name:'hh:hold'}]})),null);
});
test('receipt uses exact task id and never reassigns an old claimed SHA',()=>{
 const t=taskFor(pr(1),{tier:'P1'}),c=commentBody(reservation(t,NOW,1));
 assert.equal(reservationStatus(t,[{body:c}],NOW+1900000),'RESERVED_REQUIRES_REVIEW');
 assert.equal(reservationStatus(t,[{body:'<!-- HH_PR_REPAIR_WORKER_V1 '+SHA+' -->'}],NOW),'ALREADY_HANDLED');
 assert.equal(reservationStatus(t,[{body:'<!-- HH_PR_TASK_V1 -->\n```json\nmalformed\n```'}],NOW),'UNVERIFIED_HISTORY');
 assert.equal(reservationStatus(t,[],NOW),'FREE');
 assert.equal(reservationStatus(t,[{body:commentBody({...t,state:'CLAIMED'})}],NOW),'CLAIMED_AWAITING_OUTCOME');
 for(const state of ['FAILED','REJECTED','SUPERSEDED','VERIFY_REQUIRED','PUBLISHED'])
  assert.equal(reservationStatus(t,[{body:commentBody({...t,state})}],NOW),'ALREADY_HANDLED');
});
test('capacity counts actual jobs and enforces separate lane caps',()=>{
 assert.equal(admission('repair',cap(16,43)),'ADMIT');
 assert.equal(admission('ci',cap(15,0)),'ADMIT','spare optional CI slots can be used');
 assert.equal(admission('ci',cap(16,0)),'CI_QUEUE_BUSY','reserve capacity for required Core');
 assert.equal(admission('ci',cap(16,43)),'CI_QUEUE_BUSY');
 assert.equal(admission('repair',cap(18,43)),'ADMIT');
 assert.equal(admission('repair',cap(23,43)),'ADMIT');
 assert.equal(admission('repair',cap(24,43)),'RUNNERS_SATURATED');
 assert.equal(admission('repair',cap(18,60)),'ADMIT',
  'single short source worker may use bounded overflow without multiplying optional CI');
 assert.equal(admission('repair',cap(18,72)),'RUNNERS_SATURATED');
 assert.equal(admission('ci',cap(18,43)),'CI_QUEUE_BUSY');
 assert.equal(admission('repair',computeCapacity([{name:'HH PR source Repair Worker'}],[],[])),'WORKER_BUSY');
 assert.equal(admission('repair',{known:false}),'CAPACITY_UNKNOWN');
});

test('Core backpressure still protects mandatory CI when Repair gets bounded headroom',()=>{
 const x=cap(12,64);
 assert.equal(admission('repair',x),'ADMIT');
 assert.equal(admission('ci',x),'RUNNERS_SATURATED');
 assert.equal(admission('conflict',x),'RUNNERS_SATURATED');
 const manyCore=computeCapacity(
  Array.from({length:12},(_,i)=>({name:'misc runner '+i})),
  Array.from({length:64},(_,i)=>({name:i<21?'HH PR core release gate':'HH native auto-merge'})),[]);
 assert.equal(admission('repair',manyCore),'CORE_PRIORITY_PENDING');
 assert.equal(admission('ci',manyCore),'RUNNERS_SATURATED');
});
test('queue above optional cap is still completely verified before one Repair admission',async()=>{
 const queued=Array.from({length:64},(_,i)=>({name:'HH native auto-merge',id:i+1}));
 const api={rest:{actions:{
  listWorkflowRunsForRepo:async({status})=>({data:status==='queued'?
    {total_count:queued.length,workflow_runs:queued}:
    {total_count:0,workflow_runs:[]}}),
  listJobsForWorkflowRun:async()=>{throw Error('No active jobs to read');}
 }}};
 const state=await snapshot(api,'andylitvinov-design','books');
 assert.equal(state.known,true);
 assert.equal(state.queuedRuns,64);
 assert.equal(admission('repair',state),'ADMIT');
 assert.equal(admission('ci',state),'RUNNERS_SATURATED');
});
test('repair still fails closed when runner jobs or its own worker are saturated',()=>{
 const unrelated=Array.from({length:18},(_,i)=>({name:'Other workflow '+i}));
 const jobs=Array.from({length:38},()=>({status:'in_progress'}));
 assert.equal(admission('repair',computeCapacity(unrelated,[],jobs)),'JOBS_SATURATED');
 assert.equal(admission('repair',computeCapacity(
  [{name:'HH PR source Repair Worker'},...unrelated],[],[]
 )),'WORKER_BUSY');
 assert.equal(admission('conflict',cap(18,43)),'ADMIT');
});

test('only trusted default-branch repository and known workflow callbacks are handled',()=>{
 assert.equal(trustedContext(context),true);
 assert.equal(trustedContext({...context,ref:'refs/heads/codex/public-book-library'}),false);
 assert.equal(trustedContext({...context,eventName:'workflow_run',payload:{workflow_run:{name:'unrelated',status:'completed',repository:{full_name:'andylitvinov-design/books'}}}}),false);
});
test('single-writer dispatcher reserves before sending an exact-head repair',async()=>{
 const f=fixture([pr(1)],{comments:{1:[proof()]}});
 const result=await run({github:f.github,core:core(),context,now:NOW,capacityFn:f.capacityFn});
 assert.equal(result.dispatchAccepted,1);assert.equal(f.calls.dispatched.length,1);
 assert.equal(f.calls.reserved.length,1);
 assert.equal(f.calls.dispatched[0].inputs.pr_number,'1');
 assert.equal(f.calls.dispatched[0].inputs.expected_sha,SHA);
 assert.equal(f.calls.dispatched[0].inputs.task_key.length,32);
 assert.equal(f.calls.dispatched[0].inputs.reservation_run_id,'42');
});
test('source repair lane cannot starve behind sixteen higher-ranked conflicts',()=>{
 const conflicts=Array.from({length:23},(_,i)=>pr(i+100,'conflict',{
  title:'fix(video): merge conflict '+i,mergeable:false,mergeable_state:'dirty'
 }));
 const source=pr(2629,'repair',{title:'feat(voice): current verified source defect'});
 const tasks=planCandidates([...conflicts,source],NOW);
 assert.equal(tasks.length,16);
 assert.equal(tasks[0].pr_number,2629);
 assert.equal(tasks[0].lane,'repair');
 assert.ok(tasks.some(x=>x.lane==='conflict'));
});
test('dispatcher gives the source worker the slot before a higher-ranked conflict-only PR',async()=>{
 const conflicts=Array.from({length:23},(_,i)=>pr(i+100,'conflict',{
  title:'fix(video): merge conflict '+i,mergeable:false,mergeable_state:'dirty'
 }));
 const source=pr(2629,'repair',{title:'feat(voice): current source defect'});
 const f=fixture([...conflicts,source],{comments:{2629:[proof()]}});
 const result=await run({github:f.github,core:core(),context,now:NOW,capacityFn:f.capacityFn});
 assert.equal(result.dispatchAccepted,1);
 assert.equal(f.calls.dispatched[0].workflow_id,'hh-pr-repair-worker.yml');
 assert.equal(f.calls.dispatched[0].inputs.pr_number,'2629');
 assert.equal(result.workerRuns[0].lane,'repair');
});
test('CI candidate is inspected even when P1 conflict list fills the rotation',()=>{
 const conflicts=Array.from({length:25},(_,i)=>pr(i+100,'conflict',{
  title:'fix(video): conflict '+i,mergeable:false,mergeable_state:'dirty'
 }));
 const candidate=pr(4000,'ci',{title:'feat(tests): bounded CI bootstrap'});
 const chosen=planCandidates([...conflicts,candidate],NOW);
 assert.equal(chosen.length,16);
 assert.ok(chosen.some(x=>x.pr_number===4000&&x.lane==='ci'));
});
test('P1 source-system conflicts hold fast slots without starving the rotating manual queue',()=>{
 const urgent=pr(9001,'conflict',{
  title:'fix(ci): critical Repair Worker conflict',mergeable:false,mergeable_state:'dirty'
 });
 const lower=Array.from({length:25},(_,i)=>pr(5000+i,'conflict',{
  title:'style: minor visual edit '+i,mergeable:false,mergeable_state:'dirty'
 }));
 const seen=new Set();
 for(let tick=0;tick<10;tick++){
  const chosen=planCandidates([...lower,urgent],NOW+tick*600000);
  assert.equal(chosen.length,6);
  assert.equal(chosen[0].pr_number,9001,'highest-ranked conflict must be inspected');
  for(const item of chosen.slice(2))seen.add(item.pr_number);
 }
 assert.ok(seen.size>=20,'rotating slots must continue inspecting non-P1 conflicts');
});

test('more than 100 comments still preserve exact-head source proof',async()=>{
 const f=fixture([pr(1)]);
 let pages=[];
 f.github.rest.issues.listComments=async({page,per_page})=>{
  pages.push(page);assert.equal(per_page,100);
  return {data:page===1?Array.from({length:100},()=>({body:'historical note'})):[proof()]};
 };
 const result=await run({github:f.github,core:core(),context,now:NOW,capacityFn:f.capacityFn});
 assert.deepEqual(pages,[1,2]);
 assert.equal(result.dispatchAccepted,1);
});
test('more than 300 comments are fully read before exact-head dispatch',async()=>{
 const f=fixture([pr(1)]);const pages=[];
 f.github.rest.issues.listComments=async({page})=>{
  pages.push(page);return {data:page<=3?Array.from({length:100},()=>({body:'older note'})):[proof()]};
 };
 const result=await run({github:f.github,core:core(),context,now:NOW,capacityFn:f.capacityFn});
 assert.deepEqual(pages,[1,2,3,4]);assert.equal(result.dispatchAccepted,1);
});
test('comment history API budget exhaustion fails closed without a dispatch',async()=>{
 const f=fixture([pr(1)]);
 f.github.rest.issues.listComments=async()=>({data:Array.from({length:100},()=>({body:'older note'}))});
 const result=await run({github:f.github,core:core(),context,now:NOW,capacityFn:f.capacityFn});
 assert.equal(result.dispatchAccepted,0);assert.equal(f.calls.dispatched.length,0);
});
test('duplicate task reservation suppresses repeated dispatch',async()=>{
 const t=taskFor(pr(1),{tier:'P1'}),body=commentBody(reservation(t,NOW,1));
 const f=fixture([pr(1)],{comments:{1:[proof(),{body}]}});
 const r=await run({github:f.github,core:core(),context,now:NOW,capacityFn:f.capacityFn});
 assert.equal(r.dispatchAccepted,0);assert.equal(f.calls.dispatched.length,0);
 assert.equal(r.blocked.RESERVED_REQUIRES_REVIEW,1);
});
test('stale PR SHA, missing source proof and manual hold cannot cause writes',async()=>{
 const changed=pr(1,'repair',{head:{ref:'branch-1',sha:'b'.repeat(40),repo:{full_name:'andylitvinov-design/books'}}});
 for(const opts of [{live:changed,comments:{1:[proof()]}},{comments:{1:[]}},{comments:{1:[proof()]},held:true}]){
  const item=opts.held?pr(1,'repair',{labels:[{name:'hh:repair-needed'},{name:'hh:hold'}]}):pr(1);
  const f=fixture([item],opts);const r=await run({github:f.github,core:core(),context,now:NOW,capacityFn:f.capacityFn});
  assert.equal(r.dispatchAccepted,0);assert.equal(f.calls.dispatched.length,0);
 }
});
test('the dispatcher never starts an empty worker when no candidate can act',async()=>{
 const f=fixture([pr(2,'repair',{labels:[{name:'hh:repair-manual'},{name:'hh:repair-needed'}]})]);
 const r=await run({github:f.github,core:core(),context,now:NOW,capacityFn:f.capacityFn});
 assert.equal(r.reason,'NO_ACTIONABLE_PR');assert.equal(f.calls.dispatched.length,0);
});
test('dry run records possible work but performs no reservation or dispatch',async()=>{
 const f=fixture([pr(1)],{comments:{1:[proof()]}});
 const r=await run({github:f.github,core:core(),context,now:NOW,dryRun:true,capacityFn:f.capacityFn});
 assert.equal(r.wouldDispatch,1);assert.equal(f.calls.reserved.length,0);assert.equal(f.calls.dispatched.length,0);
});
test('source repair is allowed during ordinary CI overload but CI bootstrap is not',async()=>{
 const f=fixture([pr(1),pr(2,'ci')],{comments:{1:[proof()]},active:16,queued:43});
 const r=await run({github:f.github,core:core(),context,now:NOW,capacityFn:f.capacityFn});
 assert.equal(r.dispatchAccepted,1);assert.equal(f.calls.dispatched[0].workflow_id,'hh-pr-repair-worker.yml');
 assert.equal(r.blocked.CI_QUEUE_BUSY,1);
});
test('deduplicates a worker lane within one cycle and refuses a stacked parent',async()=>{
 const f=fixture([pr(1),pr(2)],{comments:{1:[proof()],2:[proof()]}});
 const r=await run({github:f.github,core:core(),context,now:NOW,capacityFn:f.capacityFn});
 assert.equal(r.dispatchAccepted,1);
 const child=pr(3,'repair',{base:{ref:'branch-1'}});
 const x=fixture([pr(1),child],{comments:{1:[proof()]}});
 const y=await run({github:x.github,core:core(),context,now:NOW,capacityFn:x.capacityFn});
 assert.equal(y.dispatchAccepted,0);
});
test('resolved conflict label is cleared after two consistent SHA/base reads',async()=>{
 const baseSha='b'.repeat(40),clean=pr(92,'conflict',{
  mergeable:true,mergeable_state:'clean',
  base:{ref:'codex/public-book-library',sha:baseSha}});
 const f=fixture([clean]);
 const result=await run({github:f.github,core:core(),context,now:NOW,
  capacityFn:f.capacityFn});
 assert.equal(result.dispatchAccepted,0);
 assert.equal(result.staleConflictCleared,1);
 assert.equal(f.calls.removed.length,1);
 assert.equal(f.calls.removed[0].issue_number,92);
 assert.equal(f.calls.removed[0].name,'hh:conflict-repair-needed');
});
test('rechecked moving head/base cannot delete a conflict label',async()=>{
 const baseSha='b'.repeat(40),original=pr(92,'conflict',{
  mergeable:true,mergeable_state:'clean',
  base:{ref:'codex/public-book-library',sha:baseSha}});
 for(const changed of [
  {...original,head:{...original.head,sha:'c'.repeat(40)}},
  {...original,base:{...original.base,sha:'d'.repeat(40)}},
  {...original,mergeable:null,mergeable_state:'unknown'}
 ]){
  const f=fixture([original]);let calls=0;
  f.github.rest.pulls.get=async()=>({data:++calls===1?original:changed});
  const result=await run({github:f.github,core:core(),context,now:NOW,
   capacityFn:f.capacityFn});
  assert.equal(result.staleConflictCleared,0);
  assert.equal(f.calls.removed.length,0);
 }
});
test('unknown conflict status or active owner lease is never cleared',async()=>{
 const clean=pr(92,'conflict',{mergeable:true,mergeable_state:'blocked',
  base:{ref:'codex/public-book-library',sha:'b'.repeat(40)}});
 const lease={schema:'HH_PR_SWEEP_LEASE_V1',head_sha:SHA,
  state:'active',expires_at:new Date(NOW+3600_000).toISOString()};
 const f=fixture([clean],{comments:{92:[{body:
  '<!-- HH_PR_SWEEP_LEASE_V1 -->\n'+JSON.stringify(lease)}]}});
 const r=await run({github:f.github,core:core(),context,now:NOW,
  capacityFn:f.capacityFn});
 assert.equal(r.staleConflictCleared,0);
 assert.equal(f.calls.removed.length,0);
 const unknown=fixture([pr(92,'conflict',{mergeable:null,
  mergeable_state:'unknown'})]);
 const q=await run({github:unknown.github,core:core(),context,now:NOW,
  capacityFn:unknown.capacityFn});
 assert.equal(q.staleConflictCleared,0);
 assert.equal(unknown.calls.removed.length,0);
});
test('stale conflict cleanup dry-run never changes PR labels',async()=>{
 const clean=pr(92,'conflict',{mergeable:true,mergeable_state:'clean',
  base:{ref:'codex/public-book-library',sha:'b'.repeat(40)}});
 const f=fixture([clean]);
 const r=await run({github:f.github,core:core(),context,now:NOW,
  dryRun:true,capacityFn:f.capacityFn});
 assert.equal(r.wouldClearStaleConflict,1);
 assert.equal(r.staleConflictCleared,0);
 assert.equal(f.calls.removed.length,0);
});
test('completed audit-only push does not consume a Repair Worker cooldown',()=>{
 const audit={event:'push',status:'completed',conclusion:'success',
  created_at:new Date(NOW-2000).toISOString(),
  updated_at:new Date(NOW-1000).toISOString()};
 assert.equal(workerBusyOrCooling([audit],NOW),false);
 assert.equal(workerBusyOrCooling([{...audit,status:'in_progress'}],NOW),true);
 assert.equal(workerBusyOrCooling(null,NOW),true);
});
test('real worker success has short grace, failure has longer backoff',()=>{
 const run=(secondsAgo,conclusion='success')=>({
  event:'workflow_dispatch',status:'completed',conclusion,
  updated_at:new Date(NOW-secondsAgo*1000).toISOString()});
 assert.equal(workerBusyOrCooling([run(10)],NOW),true);
 assert.equal(workerBusyOrCooling([run(40)],NOW),false);
 assert.equal(workerBusyOrCooling([run(100,'failure')],NOW),true);
 assert.equal(workerBusyOrCooling([run(140,'failure')],NOW),false);
 assert.equal(workerBusyOrCooling([run(140,'failure'),run(10)],NOW),true);
 assert.equal(workerBusyOrCooling([{event:'workflow_dispatch',status:'completed',
  conclusion:'success',updated_at:'invalid'}],NOW),true);
});
test('completed push audit cannot starve a ready source-repair dispatch',async()=>{
 const audit={event:'push',status:'completed',conclusion:'success',
  created_at:new Date(NOW-5000).toISOString(),
  updated_at:new Date(NOW-2000).toISOString()};
 const f=fixture([pr(1)],{comments:{1:[proof()]},recent:[audit]});
 const r=await run({github:f.github,core:core(),context,now:NOW,
  capacityFn:f.capacityFn});
 assert.equal(r.dispatchAccepted,1);
 assert.equal(f.calls.dispatched[0].inputs.pr_number,'1');
 assert.equal(r.blocked.WORKER_BUSY_OR_COOLDOWN||0,0);
});
test('running audit or recent real completion still blocks source dispatch',async()=>{
 for(const recent of [
  [{event:'push',status:'in_progress',created_at:new Date(NOW-5000).toISOString()}],
  [{event:'workflow_dispatch',status:'completed',conclusion:'success',
    updated_at:new Date(NOW-10000).toISOString()}]
 ]){
  const f=fixture([pr(1)],{comments:{1:[proof()]},recent});
  const r=await run({github:f.github,core:core(),context,now:NOW,
   capacityFn:f.capacityFn});
  assert.equal(r.dispatchAccepted,0);
  assert.equal(r.blocked.WORKER_BUSY_OR_COOLDOWN,1);
 }
});
test('real conflict requires a fresh dirty merge state',async()=>{
 const plain=pr(9,'conflict');const f=fixture([plain],{});
 let r=await run({github:f.github,core:core(),context,now:NOW,capacityFn:f.capacityFn});
 assert.equal(r.dispatchAccepted,0);
 const dirty=pr(9,'conflict',{mergeable:false,mergeable_state:'dirty'});
 const g=fixture([dirty],{});
 r=await run({github:g.github,core:core(),context,now:NOW,capacityFn:g.capacityFn});
 assert.equal(r.dispatchAccepted,0);
 assert.equal(r.manualConflictHandoffs,1);
 assert.equal(g.calls.dispatched.length,0,'DIRTY does not waste an ESLint runner');
 assert.ok(g.calls.reserved[0].body.includes('HH_CONTROL_CONFLICT_HANDOFF_V1 '+SHA));
 assert.equal(r.conflictQueueReleased,1);
 assert.ok(g.calls.labels.some(x=>x.issue_number===9&&x.labels.includes('hh:repair-manual')));
 assert.ok(g.calls.removed.some(x=>x.issue_number===9&&x.name==='hh:conflict-repair-needed'));
});


test('GitHub in-progress list count race is retried before scheduling',async()=>{
 let activeReads=0,queuedReads=0,jobReads=0;
 const github={rest:{actions:{
  listWorkflowRunsForRepo:async({status})=>{
   if(status==='in_progress'){
    activeReads++;
    return {data:{total_count:2,workflow_runs:activeReads===1?
      [{id:1,name:'Core CI'}]:[{id:1,name:'Core CI'},{id:2,name:'Other CI'}]}};
   }
   queuedReads++;
   return {data:{total_count:0,workflow_runs:[]}};
  },
  listJobsForWorkflowRun:async({run_id})=>{
   jobReads++;return {data:{total_count:1,jobs:[{id:run_id,status:'in_progress'}]}};
  }
 }}};
 const state=await snapshot(github,'andylitvinov-design','books');
 assert.equal(state.known,true);
 assert.equal(state.activeRuns,2);
 assert.equal(state.runningJobs,2);
 assert.equal(activeReads,2);
 assert.equal(queuedReads,2);
 assert.equal(jobReads,2);
});

test('persistently inconsistent inventory fails closed',async()=>{
 let jobReads=0;
 const github={rest:{actions:{
  listWorkflowRunsForRepo:async({status})=>({data:status==='in_progress'?
    {total_count:4,workflow_runs:[{id:1}]}:{total_count:0,workflow_runs:[]}}),
  listJobsForWorkflowRun:async()=>{jobReads++;return {data:{total_count:0,jobs:[]}};}
 }}};
 const state=await snapshot(github,'andylitvinov-design','books');
 assert.equal(state.known,false);
 assert.equal(state.reason,'INCONSISTENT_RUN_INVENTORY');
 assert.equal(jobReads,0);
});

test('saturated run count stops before job reads',async()=>{
 let jobs=0;
 const github={rest:{actions:{
  listWorkflowRunsForRepo:async({status})=>({data:status==='in_progress'?
   {total_count:24,workflow_runs:[]}:{total_count:0,workflow_runs:[]}}),
  listJobsForWorkflowRun:async()=>{jobs++;return {data:{total_count:0,jobs:[]}};}
 }}};
 const state=await snapshot(github,'andylitvinov-design','books');
 assert.equal(state.known,false);
 assert.equal(state.reason,'RUN_CAPACITY_SATURATED');
 assert.equal(jobs,0);
});

test('incomplete job inventory stops without dispatch',async()=>{
 const github={rest:{actions:{
  listWorkflowRunsForRepo:async({status})=>({data:status==='in_progress'?
    {total_count:1,workflow_runs:[{id:1,name:'Core'}]}:{total_count:0,workflow_runs:[]}}),
  listJobsForWorkflowRun:async()=>({data:{total_count:2,jobs:[{id:1,status:'in_progress'}]}})
 }}};
 const state=await snapshot(github,'andylitvinov-design','books');
 assert.equal(state.known,false);
 assert.equal(state.reason,'INCOMPLETE_JOB_INVENTORY');
});


test('PR contract CI has its own lease, separate from live queue dispatch',()=>{
 const wf=require('node:fs').readFileSync('.github/workflows/hh-pr-queue-dispatcher.yml','utf8');
 assert.ok(wf.includes('hh-control-contract-'));
 assert.ok(wf.includes('hh-control-tower-single-writer'));
 assert.ok(wf.includes('cancel-in-progress: false'));
});


test('persistent small GitHub count discrepancy admits bounded Repair but not CI',async()=>{
 let activeReads=0;
 const github={rest:{actions:{
  listWorkflowRunsForRepo:async({status})=>{
   if(status==='in_progress'){activeReads++;return {data:{total_count:2,
     workflow_runs:[{id:1,name:'Core CI'}]}};}
   return {data:{total_count:0,workflow_runs:[]}};
  },
  listJobsForWorkflowRun:async()=>({data:{total_count:1,jobs:[{id:10,status:'in_progress'}]}})
 }}};
 const state=await snapshot(github,'andylitvinov-design','books');
 assert.equal(activeReads,2);
 assert.equal(state.known,true);
 assert.equal(state.inventoryConfidence,'BOUNDED_PARTIAL');
 assert.equal(state.unknownActiveRuns,1);
 assert.equal(state.conservativeJobPressure,9);
 assert.equal(admission('repair',state),'ADMIT');
 assert.equal(admission('ci',state),'PARTIAL_CAPACITY_CI_BLOCKED');
});

test('unrelated legacy key-value lease does not obscure current HEAD ownership',()=>{
 const old='b'.repeat(40),next='c'.repeat(40);
 const legacy={user:{login:'owner'},body:`HH_PR_SWEEP_LEASE_V1\nlease_id=old\nstatus=RELEASED\nowner=owner\nold_head=${old}\nnew_head=${next}`};
 assert.equal(externalOwnerLeaseStatus([legacy],SHA,NOW),'FREE');
 assert.equal(externalOwnerLeaseStatus([legacy],old,NOW),'OWNER_LEASE_UNVERIFIED');
 assert.equal(externalOwnerLeaseStatus([{...legacy,body:legacy.body.replace(next,'invalid')}],SHA,NOW),'OWNER_LEASE_UNVERIFIED');
});

test('JSON legacy old_head/new_head receipts only affect their own heads',()=>{
 const old='b'.repeat(40),next='c'.repeat(40);
 const doc={schema:'HH_PR_SWEEP_LEASE_V1',lease_id:'a',owner:'owner',state:'released_after_atomic_commit',old_head:old,new_head:next};
 const receipt={user:{login:'owner'},body:'HH_PR_SWEEP_LEASE_V1\n```json\n'+JSON.stringify(doc)+'\n```'};
 assert.equal(externalOwnerLeaseStatus([receipt],SHA,NOW),'FREE');
 const active={...receipt,body:'HH_PR_SWEEP_LEASE_V1\n```json\n'+JSON.stringify({...doc,state:'active',head_sha:old})+'\n```'};
 assert.equal(externalOwnerLeaseStatus([active,receipt],old,NOW),'FREE');
});

test('narrative mention of a sweep lease is not a lease receipt',()=>{
 const task=taskFor(pr(1),{tier:'P1'});
 const note={body:'Conflict investigator reports no active \`HH_PR_SWEEP_LEASE_V1\` claim; this is only a handoff.'};
 assert.equal(externalOwnerLeaseStatus([note],SHA,NOW),'FREE');
 assert.equal(reservationStatus(task,[note],NOW),'FREE');
 const malformed={body:'<!-- HH_PR_SWEEP_LEASE_V1 --> not JSON'};
 assert.equal(externalOwnerLeaseStatus([malformed],SHA,NOW),'OWNER_LEASE_UNVERIFIED');
});

test('completed historical lease formats do not strand an unrelated exact HEAD',()=>{
 const old='b'.repeat(40),next='c'.repeat(40);
 const historicYaml={user:{login:'andylitvinov-design'},
  body:'<!-- HH_PR_SWEEP_LEASE_V1 -->\nstate: released_after_atomic_commit\nowner: old-codex\nlease_id: old-1\nprevious_head_sha: '+old+'\nhead_sha: '+next+'\n'};
 const historicJson={user:{login:'andylitvinov-design'},body:
  '<!-- HH_PR_SWEEP_LEASE_V1 -->\n'+JSON.stringify({
   schema:'HH_PR_SWEEP_LEASE_V1',owner:'old-codex',lease_id:'old-2',
   state:'released_after_atomic_commit',old_head_sha:old,new_head_sha:next})};
 const shortRelease={user:{login:'andylitvinov-design'},body:
  '<!-- HH_PR_SWEEP_LEASE_V1 -->\n'+JSON.stringify({
   schema:'HH_PR_SWEEP_LEASE_V1',owner:'old-codex',
   state:'released_after_atomic_commit',previous_head_sha:old,
   head_sha:'ccccccccc'})};
 const history=[historicYaml,historicJson,shortRelease];
 assert.equal(externalOwnerLeaseStatus(history,SHA,NOW),'FREE');
 assert.equal(reservationStatus(taskFor(pr(1),{tier:'P1'}),history,NOW),'FREE');
 assert.equal(externalOwnerLeaseStatus([historicYaml],old,NOW),'OWNER_LEASE_UNVERIFIED');
 assert.equal(externalOwnerLeaseStatus([shortRelease],next,NOW),'OWNER_LEASE_UNVERIFIED',
  'matching abbreviated HEAD must not unlock a possible active writer');
 assert.equal(externalOwnerLeaseStatus([{
  body:'<!-- HH_PR_SWEEP_LEASE_V1 -->\nstate: released\nprevious_head_sha: '+old+'\nhead_sha: invalid'
 }],SHA,NOW),'OWNER_LEASE_UNVERIFIED');
});

test('CI capacity is rechecked once when the first inventory is partial',async()=>{
 const f=fixture([pr(8,'ci')]);let reads=0;
 const partial={...cap(),inventoryConfidence:'BOUNDED_PARTIAL',unknownActiveRuns:1};
 const result=await run({github:f.github,core:core(),context,now:NOW,dryRun:true,
  capacityFn:async()=>{reads++;return reads===1?partial:cap();}});
 assert.equal(reads,2);
 assert.equal(result.wouldDispatch,1);
});
test('CI remains blocked when the capacity recheck is unavailable or partial',async()=>{
 for(const unavailable of [false,true]){
  const f=fixture([pr(8,'ci')]);let reads=0;
  const partial={...cap(),inventoryConfidence:'BOUNDED_PARTIAL',unknownActiveRuns:1};
  const result=await run({github:f.github,core:core(),context,now:NOW,dryRun:true,
   capacityFn:async()=>{reads++;if(reads===2&&unavailable)throw Error('unavailable');return partial;}});
  assert.equal(reads,2);assert.equal(result.wouldDispatch,0);
  assert.equal(f.calls.dispatched.length,0);
 }
});

test('unknown runner reserve blocks Repair under conservative job pressure',()=>{
 const state={...cap(10,0),inventoryConfidence:'BOUNDED_PARTIAL',unknownActiveRuns:2,
   runningJobs:23,queuedJobs:1};
 assert.equal(admission('repair',state),'JOBS_SATURATED');
});
const {wakeDirectionWatcher,DIRECTION_IDLE_MS}=require('../scripts/ci-pr-queue-dispatcher.cjs');
const callback={...context,eventName:'workflow_run',payload:{workflow_run:{
 name:'HH PR source Repair Worker',status:'completed',conclusion:'success',
 repository:{full_name:'andylitvinov-design/books'}
}}};
function wakeFixture(items=[],opts={}){
 const calls={list:[],dispatch:[]};
 const github={rest:{actions:{
  listWorkflowRuns:async arg=>{
   calls.list.push(arg);
   if(opts.failHistory)throw Error('GitHub read denied');
   if(arg.status==='in_progress'||arg.status==='queued'){
    return {data:{total_count:opts.activeStatus===arg.status?1:0,workflow_runs:[]}};
   }
   return {data:{total_count:opts.total??items.length,workflow_runs:items}};
  },
  createWorkflowDispatch:async arg=>{
   calls.dispatch.push(arg);
   if(opts.failDispatch)throw Error('Denied 403');
   return {status:204};
  }
 }}};
 return {github,calls};
}
test('event completion wakes trusted Direction Watcher exactly once after 11-minute idle',async()=>{
 const f=wakeFixture([{created_at:new Date(NOW-DIRECTION_IDLE_MS-1000).toISOString(),
   status:'completed'}]);
 const result=await wakeDirectionWatcher({github:f.github,core:core(),context:callback,now:NOW});
 assert.equal(result.decision,'EVENT_WAKE_ACCEPTED');
 assert.equal(result.dispatchAccepted,true);
 assert.equal(f.calls.dispatch.length,1);
 assert.deepEqual(f.calls.dispatch[0],{
  owner:'andylitvinov-design',repo:'books',
  workflow_id:'hh-pr-direction-watcher.yml',ref:'codex/bootstrap-books',
  inputs:{dry_run:'false',batch:'0'}
 });
 assert.deepEqual(f.calls.list.map(x=>x.status||'recent'),
  ['recent','in_progress','queued']);
});
test('event wake skips recent or already queued watcher and issues no dispatch',async()=>{
 for(const [items,opts,reason] of [
  [[{created_at:new Date(NOW-5*60000).toISOString(),status:'completed'}],{},'RECENT_RUN'],
  [[{created_at:new Date(NOW-DIRECTION_IDLE_MS-100).toISOString(),status:'queued'}],{},'WATCHER_ALREADY_RUNNING'],
  [[{created_at:new Date(NOW-DIRECTION_IDLE_MS-100).toISOString(),status:'completed'}],
   {activeStatus:'queued'},'WATCHER_ALREADY_RUNNING']
 ]){
  const f=wakeFixture(items,opts);
  const actual=await wakeDirectionWatcher({github:f.github,core:core(),context:callback,now:NOW});
  assert.equal(actual.decision,reason);
  assert.equal(f.calls.dispatch.length,0);
 }
});
test('event wake fails closed on missing/inconsistent status or API rejection',async()=>{
 for(const [items,opts,reason] of [
  [[{created_at:'',status:'completed'}],{},'UNKNOWN_RUN_STATE'],
  [[{created_at:new Date(NOW-720000).toISOString(),status:'completed'}],
   {total:0},'INCOMPLETE_HISTORY'],
  [[],{failHistory:true},'HISTORY_UNAVAILABLE'],
  [[],{failDispatch:true},'DISPATCH_UNAVAILABLE']
 ]){
  const f=wakeFixture(items,opts);
  const actual=await wakeDirectionWatcher({github:f.github,core:core(),context:callback,now:NOW});
  assert.equal(actual.decision,reason);
  assert.equal(actual.dispatchAccepted,false);
 }
});
test('event wake never acts during dry-run, push or untrusted workflow_run',async()=>{
 for(const [ctx,dryRun] of [
  [callback,true],
  [context,false],
  [{...callback,ref:'refs/heads/codex/public-book-library'},false],
  [{...callback,payload:{workflow_run:{name:'foreign action',
   status:'completed',repository:{full_name:'andylitvinov-design/books'}}}},false]
 ]){
  const f=wakeFixture([]);
  const result=await wakeDirectionWatcher({github:f.github,core:core(),context:ctx,
    dryRun,now:NOW});
  assert.equal(result.decision,'NOT_ELIGIBLE');
  assert.equal(f.calls.list.length,0);
  assert.equal(f.calls.dispatch.length,0);
 }
});


test('Watchdog wakes the dispatcher only for durable work, not every completed Core callback',()=>{
 const fs=require('node:fs');
 const workflow=fs.readFileSync('.github/workflows/hh-pr-queue-dispatcher.yml','utf8');
 assert.ok(!workflow.includes("      - 'HH PR 10-minute watchdog'"));
 assert.ok(workflow.includes("      - 'HH PR source Repair Worker'"));
 assert.ok(workflow.includes("      - 'HH zero-cost PR CI worker'"));
 const coordinator=fs.readFileSync('scripts/ci-pr-ten-minute-watchdog.cjs','utf8');
 assert.ok(coordinator.includes('notifyControlTower({github,owner,repo'));
 assert.ok(coordinator.includes('summary.controlTowerWake='));
});

test('expired active foreign lease cannot be stolen by a second worker',()=>{
 const task=taskFor(pr(1),{tier:'P1'});
 const active={schema:'HH_PR_SWEEP_LEASE_V1',head_sha:SHA,state:'active',
  expires_at:new Date(NOW-60_000).toISOString()};
 const old={owner:'Codex / video',run_id:'historical',head_sha:SHA,
  last_action:'verify',lease_expires:new Date(NOW-60_000).toISOString()};
 assert.equal(reservationStatus(task,[{body:'<!-- HH_PR_SWEEP_LEASE_V1 -->\n'+
  JSON.stringify(active)}],NOW),'OWNER_LEASE_ACTIVE');
 assert.equal(reservationStatus(task,[{body:'<!-- HH_PR_SWEEP_LEASE_V1 -->\n'+
  JSON.stringify(old)}],NOW),'FREE');
});

test('forged source receipt cannot reserve or dispatch a source task',async()=>{
 const f=fixture([pr(1)],{comments:{1:[{...proof(),user:{id:123,login:'outsider',type:'User'}}]}});
 const r=await run({github:f.github,core:core(),context,now:NOW,capacityFn:f.capacityFn});
 assert.equal(r.dispatchAccepted,0);assert.equal(f.calls.reserved.length,0);
});

test('exact-HEAD conflict receipt is idempotent and does not block a source worker',async()=>{
 const dirty=pr(88,'conflict',{mergeable:false,mergeable_state:'dirty'});
 const source=pr(89,'repair',{title:'fix(video): actionable source'});
 const f=fixture([dirty,source],{comments:{89:[proof()]}});
 const result=await run({github:f.github,core:core(),context,now:NOW,capacityFn:f.capacityFn});
 assert.equal(result.dispatchAccepted,1);
 assert.equal(result.manualConflictHandoffs,1);
 assert.equal(f.calls.dispatched.length,1);
 assert.equal(f.calls.dispatched[0].inputs.pr_number,'89');
 const same=fixture([dirty],{comments:{88:[{
  body:'<!-- HH_CONTROL_CONFLICT_HANDOFF_V1 '+SHA+' -->'
 }]}});
 const second=await run({github:same.github,core:core(),context,now:NOW,
  capacityFn:same.capacityFn});
 assert.equal(second.manualConflictHandoffs,0);
 assert.equal(second.conflictQueueReleased,1,'previously handed-off conflict is cleaned up without reposting');
 assert.equal(same.calls.reserved.length,0);
 assert.equal(same.calls.dispatched.length,0);
});

test('explicit same-owner release frees modern exact-head owner without time expiry',()=>{
 const task=taskFor(pr(1),{tier:'P1'});
 const actor={login:'andylitvinov-design'};
 const lease={schema:'HH_PR_SWEEP_LEASE_V1',owner:'chat-video',lease_id:'lease-17',
  head_sha:SHA,state:'active',expires_at:new Date(NOW-5_000).toISOString()};
 const release={...lease,state:'released',released_at:new Date(NOW+1_000).toISOString()};
 const body=x=>'<!-- HH_PR_SWEEP_LEASE_V1 -->\n'+JSON.stringify(x);
 const events=[{id:100,user:actor,body:body(lease)},
  {id:101,user:actor,body:body(release)}];
 assert.equal(externalOwnerLeaseStatus(events,SHA,NOW),'FREE');
 assert.equal(reservationStatus(task,events,NOW),'FREE');
 assert.equal(reservationStatus(task,events.slice(0,1),NOW),'OWNER_LEASE_ACTIVE');
});
test('foreign actors, other lease IDs and fresh heartbeats cannot free source',()=>{
 const task=taskFor(pr(1),{tier:'P1'});
 const actor={login:'andylitvinov-design'},stranger={login:'other-user'};
 const base={schema:'HH_PR_SWEEP_LEASE_V1',owner:'chat-voice',lease_id:'real-lease',
  head_sha:SHA,state:'active',expires_at:new Date(NOW-1_000).toISOString()};
 const wrap=(lease,user=actor)=>({user,body:'<!-- HH_PR_SWEEP_LEASE_V1 -->\n'+
  JSON.stringify(lease)});
 const release={...base,state:'released'};
 for(const wrong of [
  wrap(release,stranger),
  wrap({...release,owner:'other-owner'}),
  wrap({...release,lease_id:'other-lease'})
 ]){
  assert.equal(reservationStatus(task,[wrap(base),wrong],NOW),'OWNER_LEASE_ACTIVE');
 }
 const events=[wrap(base),wrap(release),
  wrap({...base,state:'heartbeat',expires_at:new Date(NOW+60_000).toISOString()})];
 assert.equal(externalOwnerLeaseStatus(events,SHA,NOW),'OWNER_LEASE_ACTIVE');
 assert.equal(externalOwnerLeaseStatus([...events,wrap(release)],SHA,NOW),'FREE');
});
test('independent active leases cannot be revoked by a release for another lease',()=>{
 const actor={login:'andylitvinov-design'};
 const base={schema:'HH_PR_SWEEP_LEASE_V1',owner:'editor',head_sha:SHA,
  state:'active',expires_at:new Date(NOW+10000).toISOString()};
 const wrap=l=>({user:actor,body:'<!-- HH_PR_SWEEP_LEASE_V1 -->\n'+JSON.stringify(l)});
 const records=[wrap({...base,lease_id:'a'}),wrap({...base,lease_id:'b'}),
  wrap({...base,lease_id:'a',state:'released'})];
 assert.equal(externalOwnerLeaseStatus(records,SHA,NOW),'OWNER_LEASE_ACTIVE');
 records.push(wrap({...base,lease_id:'b',state:'released'}));
 assert.equal(externalOwnerLeaseStatus(records,SHA,NOW),'FREE');
});
test('release may identify original HEAD using previous_head_sha, not a changed source HEAD',()=>{
 const actor={login:'andylitvinov-design'};
 const base={schema:'HH_PR_SWEEP_LEASE_V1',owner:'editor',
  head_sha:SHA,lease_id:'lease-previous',state:'active',
  expires_at:new Date(NOW-30000).toISOString()};
 const released={...base,head_sha:'b'.repeat(40),previous_head_sha:SHA,state:'released'};
 const wrap=v=>({user:actor,body:'<!-- HH_PR_SWEEP_LEASE_V1 -->\n'+JSON.stringify(v)});
 assert.equal(externalOwnerLeaseStatus([wrap(base),wrap(released)],SHA,NOW),'FREE');
 assert.equal(externalOwnerLeaseStatus([wrap(base),wrap(released)],'b'.repeat(40),NOW),'FREE');
});
test('malformed release histories remain fail-closed for all workflows',()=>{
 const t=taskFor(pr(1),{tier:'P1'});
 const bad=[{body:'<!-- HH_PR_SWEEP_LEASE_V1 --> not JSON'}];
 assert.equal(externalOwnerLeaseStatus(bad,SHA,NOW),'OWNER_LEASE_UNVERIFIED');
 assert.equal(reservationStatus(t,bad,NOW),'OWNER_LEASE_UNVERIFIED');
});

test('live dispatcher runs syntax only; full contract stays a PR-only job',()=>{
 const yml=require('node:fs').readFileSync('.github/workflows/hh-pr-queue-dispatcher.yml','utf8');
 const jobs=yml.split('\n  dispatch:\n');
 assert.equal(jobs.length,2);
 assert.ok(jobs[0].includes('tests/ci-pr-control-tower.test.cjs'));
 assert.ok(!jobs[1].includes('node --test '));
 assert.ok(jobs[1].includes('node --check scripts/ci-pr-queue-dispatcher.cjs'));
 assert.ok(yml.includes('  checks: read\n'));
});
test('unproven source label with exact-HEAD red product QA moves to specialist queue, never a worker',async()=>{
 const source=pr(120,'repair',{mergeable:true,mergeable_state:'behind'});
 const f=fixture([source],{comments:{120:[]}});
 const changed=[];
 const withLabel={...source,labels:[...source.labels]};
 f.github.rest.checks={listForRef:async({ref})=>{
  assert.equal(ref,SHA);
  return {data:{total_count:3,check_runs:[
   {id:1,name:'hh-core-verified',status:'completed',conclusion:'success',app:{id:15368}},
   {id:2,name:'hh-specialist',status:'completed',conclusion:'failure',app:{id:15368}},
   {id:3,name:'voice-webkit-macos',status:'completed',conclusion:'failure',app:{id:15368}}
  ]}};
 }};
 f.github.rest.issues.addLabels=async({labels})=>{changed.push(['add',labels[0]]);
  withLabel.labels.push({name:labels[0]});};
 f.github.rest.issues.removeLabel=async({name})=>{changed.push(['remove',name]);};
 f.github.rest.pulls.get=async()=>({data:withLabel});
 const result=await run({github:f.github,core:core(),context,now:NOW,capacityFn:f.capacityFn});
 assert.equal(result.specialistReclassified,1);
 assert.equal(result.dispatchAccepted,0);
 assert.deepEqual(changed,[['add','hh:specialist-repair-needed'],['remove','hh:repair-needed']]);
 assert.equal(f.calls.dispatched.length,0);
});
test('no exact-head independent QA or live HEAD change never releases source-repair label',async()=>{
 for(const mode of ['all-green','incomplete','moved','untrusted']){
  const source=pr(121,'repair',{mergeable:true,mergeable_state:'behind'});
  const f=fixture([source],{comments:{121:[]}});
  let writes=0;
  f.github.rest.checks={listForRef:async()=>({data:{total_count:mode==='incomplete'?4:3,check_runs:[
   {id:1,name:'hh-core-verified',status:'completed',conclusion:'success',app:{id:15368}},
   {id:2,name:'hh-specialist',status:'completed',conclusion:'failure',app:{id:15368}},
   {id:3,name:'guard-unit',status:'completed',conclusion:mode==='all-green'?'success':'failure',
    app:{id:mode==='untrusted'?900:15368}}
  ]}})};
  f.github.rest.issues.addLabels=async()=>{writes++;};
  f.github.rest.issues.removeLabel=async()=>{writes++;};
  if(mode==='moved')f.github.rest.pulls.get=async()=>({data:{...source,
   head:{...source.head,sha:'b'.repeat(40)}}});
  await run({github:f.github,core:core(),context,now:NOW,capacityFn:f.capacityFn});
  if(mode==='moved')assert.equal(writes,0);
  else assert.equal(writes,0);
  assert.equal(f.calls.dispatched.length,0);
 }
});
test('dry run reports potential specialist reroute without label mutation',async()=>{
 const source=pr(122,'repair',{mergeable:true,mergeable_state:'behind'});
 const f=fixture([source],{comments:{122:[]}});
 f.github.rest.checks={listForRef:async()=>({data:{total_count:3,check_runs:[
 {id:1,name:'hh-core-verified',status:'completed',conclusion:'success',app:{id:15368}},
 {id:2,name:'hh-specialist',status:'completed',conclusion:'failure',app:{id:15368}},
 {id:3,name:'public-services',status:'completed',conclusion:'failure',app:{id:15368}}
 ]}})};
 const r=await run({github:f.github,core:core(),context,now:NOW,dryRun:true,
  capacityFn:f.capacityFn});
 assert.equal(r.wouldSpecialistReclassify,1);
 assert.equal(r.specialistReclassified,0);
 assert.equal(f.calls.reserved.length,0);
 assert.equal(f.calls.dispatched.length,0);
});

// Preserve #3014 source preflight and fairness scenarios.
test('source dispatch requires verified current mergeability before reservation',async()=>{
 for(const state of [{mergeable:null,mergeable_state:'unknown'},
  {mergeable:true,mergeable_state:'unknown'}, {mergeable:false,mergeable_state:'blocked'}]){
  const f=fixture([pr(99,'repair',state)],{comments:{99:[proof()]}});
  const result=await run({github:f.github,core:core(),context,now:NOW,capacityFn:f.capacityFn});
  assert.equal(result.dispatchAccepted,0);assert.equal(f.calls.reserved.length,0);
  assert.equal(f.calls.dispatched.length,0);
 }
});

test('source dispatch requires a complete nonempty worker-safe changed-file scope',async()=>{
 for(const files of [[],[{filename:'tests/only.test.js',status:'modified'}],
   Array.from({length:100},(_,i)=>({filename:'src/'+i+'.js',status:'modified'}))]){
  const f=fixture([pr(77)],{comments:{77:[proof()]}});
  f.github.rest.pulls.listFiles=async()=>({data:files});
  const result=await run({github:f.github,core:core(),context,now:NOW,capacityFn:f.capacityFn});
  assert.equal(result.dispatchAccepted,0);assert.equal(f.calls.reserved.length,0);
 }
});

test('a blocked first source does not give the shared worker to conflict before another source',async()=>{
 const first=pr(1,'repair',{title:'fix(video): verified source'}),second=pr(2,'repair',{title:'fix(video): verified source'});
 const conflict=pr(100,'conflict',{title:'fix(video): conflict',mergeable:false,mergeable_state:'dirty'});
 const f=fixture([first,second,conflict],{comments:{2:[proof()]}});
 const result=await run({github:f.github,core:core(),context,now:NOW,capacityFn:f.capacityFn});
 assert.equal(result.workerRuns[0]?.lane,'repair');assert.equal(result.workerRuns[0]?.pr_number,2);
});
test('conflict triage has a bounded fairness turn under continuous source backlog',()=>{
 const sources=Array.from({length:25},(_,i)=>pr(i+1,'repair'));
 const conflict=pr(100,'conflict',{mergeable:false,mergeable_state:'dirty'});
 const ordinary=planCandidates([...sources,conflict],NOW);
 const fairness=planCandidates([...sources,conflict],NOW+5*600000);
 assert.ok(ordinary.findIndex(x=>x.lane==='conflict')>ordinary.findIndex(x=>x.lane==='repair'));
 assert.ok(fairness.findIndex(x=>x.lane==='conflict')<fairness.findIndex(x=>x.lane==='repair'));
});
test('rotation eventually inspects every source in a large sustained backlog',()=>{
 const sources=Array.from({length:143},(_,i)=>pr(i+1,'repair',{title:'fix: source'}));
 const conflict=pr(999,'conflict',{mergeable:false,mergeable_state:'dirty'});
 const seen=new Set();for(let turn=0;turn<84;turn++)for(const task of planCandidates([...sources,conflict],NOW+turn*600000))if(task.lane==='repair')seen.add(task.pr_number);
 assert.equal(seen.size,sources.length);
});

test('runner-capacity outage does not block a verified metadata-only DIRTY handoff',async()=>{
 const dirty=pr(88,'conflict',{mergeable:false,mergeable_state:'dirty'});
 const f=fixture([dirty]);
 const r=await run({github:f.github,core:core(),context,now:NOW,
  capacityFn:async()=>({known:false,reason:'RUN_CAPACITY_SATURATED'})});
 assert.equal(r.manualConflictHandoffs,1);
 assert.equal(r.dispatchAccepted,0);
 assert.equal(r.reason,'CONFLICT_HANDOFF_ACCEPTED');
 assert.equal(f.calls.dispatched.length,0);
 assert.equal(f.calls.reserved.length,1);
});
test('dual-labelled DIRTY does not take the source Repair Worker',async()=>{
 const dirty=pr(77,'repair',{mergeable:false,mergeable_state:'dirty',
  labels:[{name:'hh:repair-needed'},{name:'hh:conflict-repair-needed'}]});
 const f=fixture([dirty]);
 const r=await run({github:f.github,core:core(),context,now:NOW,
  capacityFn:async()=>{throw Error('Capacity unavailable')}});
 assert.equal(r.manualConflictHandoffs,1);
 assert.equal(r.dispatchAccepted,0);
 assert.equal(f.calls.dispatched.length,0);
});
test('unknown capacity continues to reject normal source writes',async()=>{
 const f=fixture([pr(77)],{comments:{77:[proof()]}});
 const r=await run({github:f.github,core:core(),context,now:NOW,
  capacityFn:async()=>({known:false,reason:'RUN_CAPACITY_SATURATED'})});
 assert.equal(r.dispatchAccepted,0);
 assert.equal(r.blocked.CAPACITY_UNVERIFIED,1);
 assert.equal(f.calls.dispatched.length,0);
});
test('duplicate exact-HEAD conflict handoff remains idempotent with no runners',async()=>{
 const dirty=pr(88,'conflict',{mergeable:false,mergeable_state:'dirty'});
 const marker='<!-- HH_CONTROL_CONFLICT_HANDOFF_V1 '+SHA+' -->';
 const f=fixture([dirty],{comments:{88:[{body:marker}]}});
 const r=await run({github:f.github,core:core(),context,now:NOW,
  capacityFn:async()=>({known:false,reason:'RUN_CAPACITY_SATURATED'})});
 assert.equal(r.manualConflictHandoffs,0);
 assert.equal(r.blocked.CONFLICT_ALREADY_HANDED_OFF,1);
 assert.equal(f.calls.reserved.length,0);
});

test('conflict-only queue rotates six exact-head inspections instead of repeating sixteen handoffs',()=>{
 const conflicts=Array.from({length:47},(_,i)=>pr(i+500,'conflict',{
  title:'fix(video): actual DIRTY merge conflict '+i,mergeable:false,mergeable_state:'dirty'
 }));
 const first=planCandidates(conflicts,NOW);
 const next=planCandidates(conflicts,NOW+600000);
 assert.equal(first.length,6);
 assert.equal(next.length,6);
 assert.ok(first.every(t=>t.lane==='conflict'));
 assert.equal(first[0].pr_number,next[0].pr_number,'P1 fast slot remains visible');
 assert.equal(first[1].pr_number,next[1].pr_number,'second high-priority fast slot remains visible');
 assert.equal(new Set([...first,...next].map(t=>t.pr_number)).size,10,
  'four rotating slots must cover eight different PRs over two cycles');
});
test('a denied dispatch only unlocks after an authenticated exact-task backoff receipt',()=>{
 const task=taskFor(pr(1),{tier:'P1'}),hold=reservation(task,NOW,123);
 const denied={...hold,state:'DISPATCH_REJECTED',
  created_at:new Date(NOW+1000).toISOString(),
  outcome:'DEFINITIVELY_NOT_ACCEPTED',http_status:422,
  retry_after:new Date(NOW+600000).toISOString()};
 const held={body:commentBody(hold)};
 const signed={...proof(),body:commentBody(denied)};
 assert.equal(reservationStatus(task,[held,signed],NOW+60_000),'DISPATCH_RETRY_BACKOFF');
 assert.equal(reservationStatus(task,[held,signed],NOW+600_001),'FREE');
 assert.equal(reservationStatus(task,[held,{body:commentBody(denied)}],NOW+600_001),
  'RESERVED_REQUIRES_REVIEW','a forged comment cannot release the single writer');
 assert.equal(reservationStatus(task,[held,{...signed,
  body:commentBody({...denied,http_status:503})}],NOW+600_001),
  'RESERVED_REQUIRES_REVIEW','ambiguous server errors never unlock');
 assert.equal(reservationStatus(task,[held,{...signed,
  body:commentBody({...denied,owner_run_id:'another-run'})}],NOW+600_001),
  'RESERVED_REQUIRES_REVIEW','foreign tasks cannot unlock');
});
test('definitive 422 dispatch denial records a retryable receipt without claiming source success',async()=>{
 const f=fixture([pr(1)],{comments:{1:[proof()]}});
 f.github.rest.actions.createWorkflowDispatch=async()=>{const error=Error('not accepted');error.status=422;throw error};
 const r=await run({github:f.github,core:core(),context,now:NOW,capacityFn:f.capacityFn});
 assert.equal(r.dispatchAccepted,0);
 assert.equal(r.repairDispatchAccepted,0);
 assert.equal(r.definitiveDispatchRejections,1);
 assert.equal(f.calls.reserved.length,2);
 assert.ok(f.calls.reserved[1].body.includes('"state":"DISPATCH_REJECTED"'));
 assert.ok(f.calls.reserved[1].body.includes('"http_status":422'));
});
test('ambiguous failed dispatch retains the safety reservation for manual reconciliation',async()=>{
 const f=fixture([pr(1)],{comments:{1:[proof()]}});
 f.github.rest.actions.createWorkflowDispatch=async()=>{const error=Error('timeout');error.status=503;throw error};
 const r=await run({github:f.github,core:core(),context,now:NOW,capacityFn:f.capacityFn});
 assert.equal(r.dispatchAccepted,0);
 assert.equal(r.definitiveDispatchRejections,0);
 assert.equal(f.calls.reserved.length,1);
});

test('source receives first scheduling priority and DIRTY cleanup does not reserve Repair',async()=>{
 const dirty=pr(77,'conflict',{mergeable:false,mergeable_state:'dirty'});
 const clean=pr(78,'repair');
 const f=fixture([dirty,clean],{comments:{78:[proof()]}});
 const result=await run({github:f.github,core:core(),context,now:NOW,capacityFn:f.capacityFn});
 assert.equal(result.dispatchAccepted,1);
 assert.equal(result.conflictQueueReleased,1);
 assert.equal(f.calls.dispatched.length,1);
 assert.equal(f.calls.dispatched[0].inputs.pr_number,'78');
 assert.ok(f.calls.labels.some(x=>x.issue_number===77&&x.labels.includes('hh:repair-manual')));
});

test('orphaned accepted Repair handoff receives one terminal diagnostic, not a replay',async()=>{
 const item=pr(70),task=taskFor(item,{tier:'P1'});
 const created=NOW-61*60_000;
 const reserved={body:commentBody(reservation(task,created,25)),
  created_at:new Date(created).toISOString()};
 const f=fixture([item],{comments:{70:[proof(),reserved]},recent:[]});
 const result=await run({github:f.github,core:core(),context,now:NOW,capacityFn:f.capacityFn});
 assert.equal(result.dispatchAccepted,0);
 assert.equal(result.unconfirmedHandoffs,1);
 assert.ok(f.calls.reserved.some(x=>x.body.includes('HH_CONTROL_HANDOFF_UNCONFIRMED_V1')));
 assert.ok(f.calls.reserved.some(x=>x.body.includes('NO_VERIFIED_WORKER_OUTCOME_AFTER_60_MINUTES')));
 assert.ok(f.calls.labels.some(x=>x.issue_number===70&&x.labels.includes('hh:repair-manual')));
 assert.ok(f.calls.removed.some(x=>x.issue_number===70&&x.name==='hh:repair-needed'));
});
test('orphan reconciliation does not interrupt an active Repair Worker',async()=>{
 const item=pr(70),task=taskFor(item,{tier:'P1'});
 const created=NOW-61*60_000;
 const reserved={body:commentBody(reservation(task,created,25)),
  created_at:new Date(created).toISOString()};
 const f=fixture([item],{comments:{70:[proof(),reserved]},
  recent:[{status:'in_progress',event:'workflow_dispatch'}]});
 const result=await run({github:f.github,core:core(),context,now:NOW,capacityFn:f.capacityFn});
 assert.equal(result.unconfirmedHandoffs,0);
 assert.equal(f.calls.reserved.length,0);
 assert.equal(f.calls.labels.length,0);
});


test('signed preclaim refusal frees exact reservation only after backoff and no owner lease',()=>{
 const t=taskFor(pr(1),{tier:'P1'}),hold=reservation(t,NOW,42);
 const signed=x=>({...proof(),body:commentBody(x)});
 const retry={...t,state:'NO_CLAIM_RETRYABLE',head_sha:SHA,
  reservation_run_id:'42',owner_run_id:'9001',claim_status:'skipped',
  claim_result:'success',reason_code:'NO_UNCLAIMED_OWNER_PR',
  source_published:false,created_at:new Date(NOW+1000).toISOString(),
  retry_after:new Date(NOW+900000).toISOString()};
 const held=signed(hold),result=signed(retry);
 assert.equal(reservationStatus(t,[held,result],NOW+100000),'NO_CLAIM_RETRY_BACKOFF');
 assert.equal(reservationStatus(t,[held,result],NOW+900001),'FREE');
 assert.equal(reservationStatus(t,[held,{body:commentBody(retry)}],NOW+900001),
  'RESERVED_REQUIRES_REVIEW','unsigned refusal never frees a source reservation');
 assert.equal(reservationStatus(t,[held,signed({...retry,reservation_run_id:'99'})],NOW+900001),
  'RESERVED_REQUIRES_REVIEW');
 assert.equal(reservationStatus(t,[held,signed({...retry,source_published:true})],NOW+900001),
  'RESERVED_REQUIRES_REVIEW');
 assert.equal(reservationStatus(t,[held,result,{
  body:'<!-- HH_PR_SWEEP_LEASE_V1 -->\n'+JSON.stringify({
   owner:'another-coder',run_id:'active',head_sha:SHA,state:'active',
   schema:'HH_PR_SWEEP_LEASE_V1',lease_id:'L'})
 }],NOW+900001),'OWNER_LEASE_ACTIVE');
 assert.equal(reservationStatus(t,[held,result,{
  body:'<!-- HH_PR_REPAIR_WORKER_V1 '+SHA+' -->'
 }],NOW+900001),'ALREADY_HANDLED');
});
test('Control Tower summary names PRs behind lease and handoff blockers',async()=>{
 const conflicts=Array.from({length:14},(_,i)=>pr(i+900,'conflict',{
  mergeable:false,mergeable_state:'dirty'}));
 const f=fixture(conflicts);
 const x=await run({github:f.github,core:core(),context,now:NOW,capacityFn:f.capacityFn});
 const examples=x.blockerExamples.CONFLICT_HANDOFF_LIMIT||[];
 assert.ok(examples.length>0&&examples.length<=3);
 assert.ok(examples.every(y=>Number.isSafeInteger(y.pr_number)&&y.head_sha===SHA.slice(0,12)));
 assert.equal(x.dispatchAccepted,0,'conflict-only queue does not impersonate source repair');
});


test('verified old single-head Work release cannot block unrelated new source work',()=>{
 const old='b'.repeat(40),newer='c'.repeat(40);
 const build=fields=>({user:{login:'andylitvinov-design'},
  body:'<!-- HH_PR_SWEEP_LEASE_V1 -->\n'+fields.join('\n')});
 const common=['owner: work-repair-2607-alchemy-formats','lease_id: old-repair-lease',
  'state: released_without_write','released_at: 2026-10-31T07:22:00Z'];
 const single=build([...common,'head_sha: '+old]);
 const alternate=build([...common,'lease_head_sha: '+old,
  'observed_new_head_sha: '+newer]);
 const t=taskFor(pr(1),{tier:'P1'});
 assert.equal(externalOwnerLeaseStatus([single,alternate],SHA,NOW),'FREE');
 assert.equal(reservationStatus(t,[single,alternate],NOW),'FREE');
 assert.equal(externalOwnerLeaseStatus([single],old,NOW),'OWNER_LEASE_UNVERIFIED',
  'the same exact HEAD still requires an authenticated release/claim');
 assert.equal(externalOwnerLeaseStatus([build([...common,'head_sha: invalid'])],SHA,NOW),
  'OWNER_LEASE_UNVERIFIED','bad source SHA cannot release ownership');
 assert.equal(externalOwnerLeaseStatus([build([...common,'head_sha: '+old,
  'head_sha: '+newer])],SHA,NOW),'OWNER_LEASE_UNVERIFIED',
  'duplicate source refs must fail closed');
 assert.equal(externalOwnerLeaseStatus([build([...common.filter(x=>!x.startsWith('released_at:')),
  'head_sha: '+old])],SHA,NOW),'OWNER_LEASE_UNVERIFIED',
  'absence of release time is not a verified terminal receipt');
 const active={user:{login:'andylitvinov-design'},
  body:'<!-- HH_PR_SWEEP_LEASE_V1 -->\n'+JSON.stringify({
   schema:'HH_PR_SWEEP_LEASE_V1',lease_id:'current',
   owner:'active-editor',state:'active',head_sha:SHA})};
 assert.equal(externalOwnerLeaseStatus([single,alternate,active],SHA,NOW),
  'OWNER_LEASE_ACTIVE','unrelated legacy releases never remove modern active ownership');
});
test('Control Tower expires old pre-lease-id claims without stealing real owners',async()=>{
 const actor={login:'andylitvinov-design'},wrap=x=>({
  user:actor,body:'<!-- HH_PR_SWEEP_LEASE_V1 -->\n'+JSON.stringify(x)
 });
 const legacy={schema:'HH_PR_SWEEP_LEASE_V1',owner:'old-chat',head_sha:SHA,
  last_action:'claimed',expires_at:new Date(NOW-60000).toISOString()};
 assert.equal(externalOwnerLeaseStatus([wrap(legacy)],SHA,NOW),'FREE');
 assert.equal(externalOwnerLeaseStatus([wrap(legacy)],SHA,NOW-120000),'OWNER_LEASE_ACTIVE');
 assert.equal(externalOwnerLeaseStatus([wrap({...legacy,last_action:'heartbeat'})],SHA,NOW),'FREE');
 assert.equal(externalOwnerLeaseStatus([wrap({...legacy,expires_at:undefined})],SHA,NOW),
  'OWNER_LEASE_UNVERIFIED','no deadline cannot be silently ignored');
 assert.equal(externalOwnerLeaseStatus([wrap({...legacy,state:'active'})],SHA,NOW),
  'OWNER_LEASE_ACTIVE','modern active lease cannot expire without release');
 assert.equal(externalOwnerLeaseStatus([wrap({...legacy,lease_id:'L',state:'claimed'})],SHA,NOW),
  'OWNER_LEASE_ACTIVE','modern lease ID always protects its current writer');
 const f=fixture([pr(1)],{comments:{1:[proof(),wrap(legacy)]}});
 const r=await run({github:f.github,core:core(),context,now:NOW,capacityFn:f.capacityFn});
 assert.equal(r.dispatchAccepted,1,'valid source worker is admitted after old claim expires');
});
test('malformed unrelated historic JSON does not freeze the next HEAD',()=>{
 const wrap=x=>({body:'<!-- HH_PR_SWEEP_LEASE_V1 -->\n'+x});
 const old='b'.repeat(40);
 assert.equal(externalOwnerLeaseStatus([wrap('{"head_sha":"'+old+'","state":')],SHA,NOW),'FREE');
 assert.equal(externalOwnerLeaseStatus([wrap('{"head_sha":"'+SHA+'","state":')],SHA,NOW),
  'OWNER_LEASE_UNVERIFIED');
 assert.equal(externalOwnerLeaseStatus([wrap('not JSON')],SHA,NOW),'OWNER_LEASE_UNVERIFIED');
});
test('old Codex claim with no run id must carry a verifiable expiry',()=>{
 const legacy={owner:'Codex',head_sha:SHA,last_action:'heartbeat',
  lease_expires:new Date(NOW-30000).toISOString()};
 const comment={body:'<!-- HH_PR_SWEEP_LEASE_V1 -->\n'+JSON.stringify(legacy)};
 assert.equal(externalOwnerLeaseStatus([comment],SHA,NOW),'FREE');
 assert.equal(externalOwnerLeaseStatus([comment],SHA,NOW-60000),'OWNER_LEASE_ACTIVE');
 assert.equal(externalOwnerLeaseStatus([{body:'<!-- HH_PR_SWEEP_LEASE_V1 -->\n'+
  JSON.stringify({...legacy,lease_expires:undefined})}],SHA,NOW),'OWNER_LEASE_UNVERIFIED');
});
test('an expired legacy claim cannot delete another owner active state',()=>{
 const actor={login:'andylitvinov-design'},wrap=x=>({user:actor,
  body:'<!-- HH_PR_SWEEP_LEASE_V1 -->\n'+JSON.stringify(x)});
 const active={schema:'HH_PR_SWEEP_LEASE_V1',owner:'same-owner',head_sha:SHA,
  state:'active',expires_at:new Date(NOW-90000).toISOString()};
 const old={schema:'HH_PR_SWEEP_LEASE_V1',owner:'same-owner',head_sha:SHA,
  last_action:'claimed',expires_at:new Date(NOW-90000).toISOString()};
 assert.equal(externalOwnerLeaseStatus([wrap(active),wrap(old)],SHA,NOW),
  'OWNER_LEASE_ACTIVE');
});

test('old denied CI bootstrap reconciliation is isolated from dispatch and fail-closed',()=>{
 const s=require('node:fs').readFileSync('scripts/ci-pr-queue-dispatcher.cjs','utf8');
 const workflow=require('node:fs').readFileSync('.github/workflows/hh-pr-queue-dispatcher.yml','utf8');
 assert.ok(s.includes("reconcileLegacyCiDenial({"));
 assert.ok(s.includes("summary.legacyCiRecovery="));
 assert.ok(s.includes("dryRun,limited"));
 assert.ok(workflow.includes('tests/ci-pr-control-tower.test.cjs') &&
  workflow.includes('tests/ci-pr-ci-legacy-recovery.test.cjs'));
 assert.ok(workflow.includes("node --check scripts/ci-pr-ci-legacy-recovery.cjs"));
});


test('complete historical previous_head/new_head releases never poison a newer unrelated HEAD',()=>{
 const old='b'.repeat(40),next='c'.repeat(40);
 const doc={schema:'HH_PR_SWEEP_LEASE_V1',owner:'chat-audio',
   state:'released_after_concurrent_equivalent_fix',previous_head:old,new_head:next,
   released_at:'2026-11-02T16:15:00Z'};
 const actor={login:'andylitvinov-design'};
 const wrap=x=>({user:actor,body:'<!-- HH_PR_SWEEP_LEASE_V1 -->\\n'+JSON.stringify(x)});
 assert.equal(externalOwnerLeaseStatus([wrap(doc)],SHA,NOW),'FREE');
 assert.equal(externalOwnerLeaseStatus([wrap({...doc,new_head:'invalid'})],SHA,NOW),
   'OWNER_LEASE_UNVERIFIED','incomplete historical release remains untrusted');
 const live={schema:'HH_PR_SWEEP_LEASE_V1',owner:'another-agent',lease_id:'real-owner',
   state:'active',head_sha:SHA,expires_at:'2026-11-02T10:00:00Z'};
 assert.equal(externalOwnerLeaseStatus([wrap(live),wrap(doc)],SHA,NOW),
   'OWNER_LEASE_ACTIVE','unrelated release must not clear a modern active writer');
});

test('completed transition snapshots cannot reserve a worker slot',()=>{
 const stale=computeCapacity([{name:'HH PR source Repair Worker',status:'completed'}],
   [{name:'HH PR core release gate',status:'completed'}],[]);
 assert.equal(stale.activeWorker['HH PR source Repair Worker'],0);
 assert.equal(stale.coreQueuedRuns,0);
 assert.equal(admission('repair',stale),'ADMIT');
 const live=computeCapacity([{name:'HH PR source Repair Worker',status:'in_progress'}],[],[]);
 assert.equal(admission('repair',live),'WORKER_BUSY');
});

test('real workers run addressed dispatches rather than competing cron and push audits',()=>{
 const fs=require('node:fs');
 for(const path of ['.github/workflows/hh-pr-repair-worker.yml',
                     '.github/workflows/hh-pr-ci-worker.yml']){
  const content=fs.readFileSync(path,'utf8');
  const triggers=content.slice(content.indexOf('\\non:\\n'),content.indexOf('\\npermissions:\\n'));
  assert.match(triggers,/workflow_dispatch:/);
  assert.doesNotMatch(triggers,/\\n  schedule:/);
  assert.doesNotMatch(triggers,/\\n  push:/);
  assert.match(content,/cancel-in-progress: false/);
 }
});

