'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {confirmRepairRunner,verifiedRunnerReceipt}=require('../scripts/ci-pr-runner-evidence.cjs');
const {taskFor}=require('../scripts/ci-pr-task-state.cjs');
const {priorityFor}=require('../scripts/ci-pr-priority.cjs');
const SHA='a'.repeat(40),NUMBER=3257,RUN=41600000000;
const context={repo:{owner:'andylitvinov-design',repo:'books'},
 eventName:'workflow_dispatch',runId:RUN};
function pr(){
 return {number:NUMBER,state:'open',draft:false,user:{login:'andylitvinov-design'},
 base:{ref:'codex/public-book-library'},
 head:{sha:SHA,ref:'feat/runner',repo:{full_name:'andylitvinov-design/books'}},
 labels:[{name:'hh:repair-needed'}]};
}
function fixture(changes={}){
 const calls=[],source=pr(),task=taskFor(source,priorityFor(source,Date.now()));
 const run={id:RUN,name:'HH PR source Repair Worker',event:'workflow_dispatch',
  head_branch:'codex/bootstrap-books',status:'in_progress',...changes.run};
 const job={id:125000000001,run_id:RUN,name:'claim',status:'in_progress',
  runner_id:10001,runner_name:'GitHub Actions 10001',
  started_at:'2026-11-03T12:00:00Z',...changes.job};
 const github={rest:{
  actions:{getWorkflowRun:async()=>({data:run}),
   listJobsForWorkflowRun:async()=>({data:{total_count:1,jobs:[job]}})},
  pulls:{get:async()=>({data:{...source,...changes.pr}})},
  issues:{createComment:async item=>{calls.push(item);return {data:{id:4}};}}
 }};
 return {github,calls,task};
}
test('a real hosted job with matching dispatch, task and live SHA yields durable runner evidence',async()=>{
 const f=fixture();
 const result=await confirmRepairRunner({github:f.github,context,number:NUMBER,expectedSha:SHA,
  taskKey:f.task.task_key});
 assert.equal(result.status,'RUNNER_CONFIRMED');
 assert.equal(result.runner.job_id,125000000001);
 assert.equal(f.calls.length,1);
 assert.match(f.calls[0].body,/RUNNER_STARTED/);
 assert.match(f.calls[0].body,/NOT a source fix/);
 const bot={user:{id:41898282,login:'github-actions[bot]',type:'Bot'},
  performed_via_github_app:{id:15368,slug:'github-actions'},body:f.calls[0].body};
 assert.equal(verifiedRunnerReceipt([bot],f.task).runner.job_id,125000000001);
 assert.equal(verifiedRunnerReceipt([{...bot,user:{id:100,login:'other',type:'User'}}],f.task),null);
});
test('204 dispatch without actual assigned runner is never execution proof',async()=>{
 for(const job of [{runner_id:null},{runner_name:''},{status:'queued'},{started_at:null}]){
  const f=fixture({job});
  const out=await confirmRepairRunner({github:f.github,context,number:NUMBER,expectedSha:SHA,
    taskKey:f.task.task_key});
  assert.equal(out.status,'RUNNER_UNVERIFIED');assert.equal(f.calls.length,0);
 }
});
test('untrusted run, changed PR head or wrong task never publishes runner receipt',async()=>{
 for(const changes of [{run:{name:'other'}},{run:{event:'push'}},
  {pr:{head:{sha:'b'.repeat(40),ref:'feat/runner',repo:{full_name:'andylitvinov-design/books'}}}}]){
  const f=fixture(changes);
  const out=await confirmRepairRunner({github:f.github,context,number:NUMBER,expectedSha:SHA,
    taskKey:f.task.task_key});
  assert.equal(out.status,'RUNNER_UNVERIFIED');assert.equal(f.calls.length,0);
 }
 const f=fixture();
 const out=await confirmRepairRunner({github:f.github,context,number:NUMBER,expectedSha:SHA,
  taskKey:'f'.repeat(32)});
 assert.equal(out.status,'RUNNER_UNVERIFIED');assert.equal(f.calls.length,0);
});


test('old manually held legacy preflight confirms real runner without granting source publication',async()=>{
 const f=fixture();
 const old={...pr(),mergeable:null,mergeable_state:'unknown',
  labels:[{name:'hh:repair-manual'},{name:'hh:conflict-repair-needed'}]};
 const legacy=taskFor(old,priorityFor(old,Date.now()));
 assert.equal(legacy.lane,'legacy');
 f.github.rest.pulls.get=async()=>({data:old});
 const good=await confirmRepairRunner({github:f.github,context,number:NUMBER,
  expectedSha:SHA,taskKey:legacy.task_key});
 assert.equal(good.status,'RUNNER_CONFIRMED');
 assert.equal(f.calls.length,1);
 assert.match(f.calls[0].body,/RUNNER_STARTED/);
 assert.match(f.calls[0].body,/NOT a source fix/);
 const bot={user:{id:41898282,login:'github-actions[bot]',type:'Bot'},
  performed_via_github_app:{id:15368,slug:'github-actions'},body:f.calls[0].body};
 assert.equal(verifiedRunnerReceipt([bot],legacy).runner.run_id,RUN);
 assert.equal(verifiedRunnerReceipt([bot],f.task),null,
  'source repair identity must not match the legacy task');
 const wrong=await confirmRepairRunner({github:f.github,context,number:NUMBER,
  expectedSha:SHA,taskKey:f.task.task_key});
 assert.equal(wrong.status,'RUNNER_UNVERIFIED');
 assert.equal(f.calls.length,1);
});
