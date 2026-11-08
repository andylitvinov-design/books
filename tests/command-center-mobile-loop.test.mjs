import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {suggestCommandTask,ownerTaskActions} from '../lib/command-center/mobile-intake.mjs';
import {classifyCommandSlot} from '../lib/command-center/dispatcher.mjs';
import {changeTaskState,createTask} from '../lib/command-center/store.mjs';

const pr='https://github.com/andylitvinov-design/books/pull/3798';
const issue='https://github.com/andylitvinov-design/books/issues/123';
test('single mobile paste recognizes a trusted PR and issue for a read-only audit',()=>{
  assert.deepEqual(suggestCommandTask('Проверь '+pr),{sourceRef:pr,kind:'repo_pr_audit'});
  assert.deepEqual(suggestCommandTask(issue),{sourceRef:issue,kind:'repo_issue_audit'});
  assert.deepEqual(suggestCommandTask('Check '+pr),{sourceRef:pr,kind:'repo_pr_audit'});
});
test('coding request never silently becomes a diagnostic-only completed task',()=>{
  assert.deepEqual(suggestCommandTask('Исправь баг '+pr),{sourceRef:pr,kind:null});
  assert.deepEqual(suggestCommandTask('Fix it '+pr),{sourceRef:pr,kind:null});
  assert.equal(suggestCommandTask('Fix PR 3798'),null);
  assert.equal(suggestCommandTask('Audit '+pr+' and '+issue),null);
});
test('untrusted task strings cannot turn into arbitrary external fetch destinations',()=>{
  for(const value of ['https://github.com.evil.example/andylitvinov-design/books/pull/1',
    'https://github.com/andylitvinov-design/books/pull/123/commits',
    'https://github.com/andylitvinov-design/books/pull/1?token=a',
    'https://github.com/andylitvinov-design/books/pull/0',
    'https://github.com/other/repo/issues/5',null]){
    assert.equal(suggestCommandTask(value),null);
  }
});
test('owner task controls mirror backend transitions, never rearm exhausted attempts',()=>{
  assert.deepEqual(ownerTaskActions({state:'paused',kind:'repo_pr_audit',auto_allowed:true,attempt_count:1}),
    {pause:false,resume:true,cancel:true});
  assert.equal(ownerTaskActions({state:'paused',kind:'repo_pr_audit',auto_allowed:true,attempt_count:2}).resume,false);
  assert.equal(ownerTaskActions({state:'ready',kind:'repo_issue_audit',auto_allowed:true,attempt_count:0}).pause,true);
  assert.equal(ownerTaskActions({state:'retry_wait',kind:'repo_issue_audit',auto_allowed:true,attempt_count:1}).resume,false);
  assert.equal(ownerTaskActions({state:'blocked_no_runner',kind:'code_change',auto_allowed:false}).cancel,true);
  assert.equal(ownerTaskActions({state:'running',kind:'repo_pr_audit',auto_allowed:true}).cancel,false);
  assert.equal(ownerTaskActions({state:'completed_verified',kind:'repo_pr_audit',auto_allowed:true}).cancel,false);
});
test('a new coding task is kept in the owner queue as blocked without a real coding runtime',async()=>{
  let inserted=null;
  const db={query:async(q,params)=>{
    if(q.includes('INSERT INTO app_private.cc_tasks')){
      inserted=params;return {rows:[{id:'6c2dd64e-285f-45ba-a848-f4b05949d91c',
        title:'Fix video playback',state:params[8],kind:'code_change'}]};
    }
    return {rows:[]};
  }};
  const result=await createTask(db,{kind:'code_change',title:'Fix video playback',
    description:'Restore real browser video playback',projectId:null,
    sourceRef:null,priority:70,autoAllowed:false},'6c2dd64e-285f-45ba-a848-f4b05949d91c');
  assert.equal(result.status,'created');
  assert.equal(result.task.state,'blocked_no_runner');
  assert.equal(inserted[6],false);
});
test('server does not allow a capped task to be put into an unexecutable ready queue',async()=>{
  const taskId='6c2dd64e-285f-45ba-a848-f4b05949d91c',queries=[];
  const db={query:async(q,params)=>{queries.push(q);return {rows:[{id:taskId,kind:'repo_pr_audit',state:'paused',auto_allowed:true,attempt_count:2}]};}};
  const result=await changeTaskState(db,{taskId,to:'ready',requestId:taskId});
  assert.equal(result.status,'transition_denied');
  assert.equal(queries.length,1);
});
test('idle ten-minute slots are not mislabeled as successful agent executions',()=>{
  assert.deepEqual(classifyCommandSlot({status:'no_ready_work'}),{state:'no_change',error:null});
  assert.deepEqual(classifyCommandSlot({status:'budget_paused'}),{state:'no_change',error:'DAILY_LIMIT'});
  assert.deepEqual(classifyCommandSlot({status:'completed_verified'}),{state:'succeeded',error:null});
  assert.deepEqual(classifyCommandSlot({status:'failed'}),{state:'failed',error:'WORKER_FAILED'});
  assert.deepEqual(classifyCommandSlot({status:'invalid_source'}),{state:'failed',error:'INVALID_SOURCE'});
  assert.deepEqual(classifyCommandSlot({status:'unconfirmed'}),{state:'failed',error:'RUN_UNCONFIRMED'});
});
test('mobile code displays truthful status and allows owner to pause/cancel safely',()=>{
  const ui=readFileSync(new URL('../app/admin/command-center/command-center-mobile.jsx',import.meta.url),'utf8');
  const css=readFileSync(new URL('../app/admin/command-center/command-center-mobile.module.css',import.meta.url),'utf8');
  assert.match(ui,/suggestCommandTask\(next\)/);
  assert.match(ui,/ownerTaskActions\(selectedTask\)/);
  assert.match(ui,/confirmCancel===selectedTask\.id/);
  assert.match(ui,/send\('task_pause'/);
  assert.match(ui,/send\('task_cancel'/);
  assert.match(ui,/result\.status==='no_ready_work'/);
  assert.match(ui,/result\.status==='already_exists'/);
  assert.match(css,/\.sheetNotice/);
  assert.match(css,/\.taskControls/);
  assert.doesNotMatch(ui,/markProductionLive|mockRuns/);
});
