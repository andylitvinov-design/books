'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
test('skip skipped and cancelled Watchdog callbacks before reserving any runner',()=>{
  const workflow=require('node:fs').readFileSync('.github/workflows/hh-pr-queue-dispatcher.yml','utf8');
  assert.match(workflow,/workflow_run\.conclusion != 'cancelled'/);
  assert.match(workflow,/workflow_run\.conclusion != 'skipped'/);
  assert.match(workflow,/github\.event_name != 'workflow_run'/);
  assert.match(workflow,/group: hh-control-tower-single-writer/);
  assert.match(workflow,/cancel-in-progress: false/);
});
const {taskFor,validPR,laneOf,reservation,commentBody,reservationStatus}=require('../scripts/ci-pr-task-state.cjs');
const {computeCapacity,admission}=require('../scripts/ci-pr-capacity.cjs');
const {trustedContext,planCandidates,run}=require('../scripts/ci-pr-queue-dispatcher.cjs');
const SHA='a'.repeat(40),NOW=Date.parse('2026-11-01T20:00:00Z');
const context={repo:{owner:'andylitvinov-design',repo:'books'},
 ref:'refs/heads/codex/bootstrap-books',eventName:'workflow_dispatch',runId:42,payload:{inputs:{}}};
const pr=(number,lane='repair',extra={})=>({number,title:number===1?'fix(video): broken rendering':'feat(tests): updates',
 state:'open',draft:false,user:{login:'andylitvinov-design'},
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
 const calls={dispatched:[],reserved:[],read:[]};
 const github={rest:{pulls:{
  list:async({page})=>({data:page===1?items:[],headers:{'x-ratelimit-remaining':'2500'}}),
  get:async({pull_number})=>({data:live||items.find(x=>x.number===pull_number)})
 },issues:{
  listComments:async({issue_number})=>({data:comments[issue_number]||[]}),
  createComment:async arg=>{calls.reserved.push(arg);return {data:{id:5}};}
 },actions:{createWorkflowDispatch:async arg=>{calls.dispatched.push(arg);return {status:204};}}},
 request:async()=>({data:{workflow_runs:recent}})};
 return {github,calls,capacityFn:async()=>cap(active,queued)};
}
const proof=(sha=SHA)=>({body:'<!-- HH_PR_10MIN_SOURCE_REPAIR_V1 '+sha+' -->'});
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
});
test('capacity counts actual jobs and enforces separate lane caps',()=>{
 assert.equal(admission('repair',cap(16,43)),'ADMIT');
 assert.equal(admission('ci',cap(16,43)),'CI_QUEUE_BUSY');
 assert.equal(admission('repair',cap(18,43)),'REPAIR_QUEUE_BUSY');
 assert.equal(admission('repair',computeCapacity([{name:'HH PR source Repair Worker'}],[],[])),'WORKER_BUSY');
 assert.equal(admission('repair',{known:false}),'CAPACITY_UNKNOWN');
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
test('real conflict requires a fresh dirty merge state',async()=>{
 const plain=pr(9,'conflict');const f=fixture([plain],{});
 let r=await run({github:f.github,core:core(),context,now:NOW,capacityFn:f.capacityFn});
 assert.equal(r.dispatchAccepted,0);
 const dirty=pr(9,'conflict',{mergeable:false,mergeable_state:'dirty'});
 const g=fixture([dirty],{});
 r=await run({github:g.github,core:core(),context,now:NOW,capacityFn:g.capacityFn});
 assert.equal(r.dispatchAccepted,1);
});