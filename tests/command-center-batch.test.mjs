import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CC_MAX_SELECTED,validateCommandBatchIds,isReadyForSafeAudit,prepareCommandHandoff} from '../lib/command-center/batch-selection.mjs';
import {executeOneCommandTask} from '../lib/command-center/dispatcher.mjs';
import {claimNextCommandTask} from '../lib/command-center/store.mjs';
const id='e6179c60-7255-48dc-9a53-8a6f284ef715',id2='f2768f26-f356-429a-8ab9-3135bd633027';
const source='https://github.com/andylitvinov-design/books/pull/3857';
const task={id,kind:'repo_pr_audit',auto_allowed:true,state:'ready',attempt_count:0,
 title:'Read actual PR checks',description:'Inspect independently verified GitHub metadata',source_ref:source};
test('maximum three unique UUIDs; invalid selection never becomes a read operation',()=>{
 assert.equal(CC_MAX_SELECTED,3);
 assert.deepEqual(validateCommandBatchIds([id,id2]),[id,id2]);
 for(const value of [[],[id,id],[id,'bad'],[id,id2,id,id2],null,'abc'])assert.equal(validateCommandBatchIds(value),null);
});
test('only ready safe read-only audits qualify for automatic selection',()=>{
 assert.equal(isReadyForSafeAudit(task),true);
 assert.equal(isReadyForSafeAudit({...task,kind:'code_change'}),false);
 assert.equal(isReadyForSafeAudit({...task,auto_allowed:false}),false);
 assert.equal(isReadyForSafeAudit({...task,state:'blocked_no_runner'}),false);
 assert.equal(isReadyForSafeAudit({...task,attempt_count:2}),false);
 assert.equal(isReadyForSafeAudit({...task,source_ref:'https://example.com/?token=123'}),false);
 assert.equal(isReadyForSafeAudit({...task,state:'retry_wait',attempt_count:1}),true);
});
test('manual ChatGPT handoff is prepared, bounded and never launches an agent',()=>{
 const result=prepareCommandHandoff([task,{...task,id:id2,title:'Fix code',kind:'code_change',auto_allowed:false,source_ref:null}],{locale:'ru'});
 assert.match(result,/NOT EXECUTION PROOF/);
 assert.match(result,/manual/i);
 assert.match(result,/GLOBAL_PR_ONE_PUBLISH_V1/);
 assert.match(result,/andylitvinov-design\/books/);
 assert.doesNotMatch(result,/Bearer |API_KEY=|workflow_dispatch/);
 assert.equal(prepareCommandHandoff([task,task]),null);
 assert.equal(prepareCommandHandoff([]),null);
 assert.equal(prepareCommandHandoff([task,{...task,id:'invalid'}]),null);
});
test('selected ID filters locked SQL claim and does not weaken the scheduler',async()=>{
 const queries=[];
 const db={query:async(q,params=[])=>{
  queries.push({q,params});
  if(q.includes("FROM app_private.cc_settings"))return {rows:[{enabled:true,max_runs_per_day:12}]};
  if(q.includes("count(*)::int AS n FROM app_private.cc_runs"))return {rows:[{n:0}]};
  if(q.includes('FROM app_private.cc_tasks t'))return {rows:[]};
  return {rows:[]};
 }};
 assert.equal((await claimNextCommandTask(db,{taskId:id})).status,'no_eligible_task');
 const selection=queries.find(x=>x.q.includes('SKIP LOCKED'));
 assert.ok(selection.q.includes('t.id=$2::uuid'));
 assert.deepEqual(selection.params,[2,id]);
 assert.ok(selection.q.includes('cc_task_dependencies'));
 assert.equal((await claimNextCommandTask(db)).status,'no_ready_work');
 assert.ok(queries.find(x=>x.q.includes('SKIP LOCKED')&&x.params[1]===null));
 assert.equal((await claimNextCommandTask(db,{taskId:'bad'})).status,'invalid_task_id');
});
test('one explicit audit creates an actual verified DB receipt, never LIVE',async()=>{
 const log=[],runId='9086e8ed-734f-4f59-8ee2-70b75ea3ed2f';
 const db={query:async(q,params=[])=>{
  log.push({q,params});
  if(q.includes('FROM app_private.cc_settings'))return {rows:[{enabled:true,max_runs_per_day:12}]};
  if(q.includes('count(*)::int AS n FROM app_private.cc_runs'))return {rows:[{n:0}]};
  if(q.includes('FROM app_private.cc_tasks t'))return {rows:[{id,kind:'repo_pr_audit',source_ref:source,auto_allowed:true,attempt_count:0,generation:0,state:'ready'}]};
  if(q.includes('INSERT INTO app_private.cc_runs'))return {rows:[{id:runId,lease_until:'2026-11-07T19:00:00Z'}]};
  if(q.includes('SELECT id,task_id,generation FROM app_private.cc_runs'))return {rows:[{id:runId,task_id:id,generation:1}]};
  if(q.includes('SELECT current_run_id,generation,state,attempt_count FROM app_private.cc_tasks'))return {rows:[{current_run_id:runId,generation:1,state:'running',attempt_count:1}]};
  return {rows:[]};
 }};
 const fetcher=async(url,opts)=>{
  assert.equal(opts.method,'GET');assert.equal(opts.redirect,'error');
  assert.equal(url,'https://api.github.com/repos/andylitvinov-design/books/pulls/3857');
  const evidence={html_url:source,number:3857,state:'open',head:{sha:'a'.repeat(40)},base:{ref:'codex/public-book-library'},draft:false};
  return {ok:true,headers:{get:()=>null},text:async()=>JSON.stringify(evidence)};
 };
 const result=await executeOneCommandTask({config:{},transaction:async(_config,_actor,fn)=>fn(db),fetcher,taskId:id});
 assert.equal(result.status,'completed_verified');
 assert.equal(result.taskId,id);assert.equal(result.worker,'github-public-reader');assert.equal(result.live,false);
 assert.ok(log.some(x=>x.q.includes('INSERT INTO app_private.cc_evidence')));
 assert.ok(log.some(x=>x.q.includes("state='completed_verified'")));
 assert.ok(log.every(x=>!x.q.includes("state='completed_live'")));
});
test('owner-only batch action cannot dispatch arbitrary code or unattended paid agents',()=>{
 const api=readFileSync(new URL('../app/api/admin/command-center/route.js',import.meta.url),'utf8');
 const ui=readFileSync(new URL('../app/admin/command-center/command-center-batch.jsx',import.meta.url),'utf8');
 const parent=readFileSync(new URL('../app/admin/command-center/command-center-mobile.jsx',import.meta.url),'utf8');
 assert.match(api,/run_selected_safe/);
 assert.match(api,/validateCommandBatchIds/);
 assert.match(api,/ownerMaterialRequest/);
 assert.match(api,/CROSS_ORIGIN_DENIED/);
 assert.match(api,/RUNTIME_NOT_APPROVED/);
 assert.match(ui,/isReadyForSafeAudit/);
 assert.match(ui,/executor==='github-public-reader'/);
 assert.match(ui,/chatgpt-work/);
 assert.match(ui,/Codex CLI.*notConnected/);
 assert.match(parent,/onRun=\{taskIds=>send\('run_selected_safe',\{taskIds\}\)\}/);
 assert.doesNotMatch(api,/merge_pull_request|workflow_dispatch|GEMINI_API_KEY/);
});
