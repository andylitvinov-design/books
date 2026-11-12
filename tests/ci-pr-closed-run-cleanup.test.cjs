'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {trustedEvent,closedProductionPR,eligible,cleanup} = require('../scripts/ci-pr-closed-run-cleanup.cjs');
const repo = 'andylitvinov-design/books';
const SHA = 'a'.repeat(40), OLD = 'b'.repeat(40);
const at = '2026-11-03T05:21:31Z', earlier = '2026-11-03T05:15:19Z';
function pr(extra = {}) {
  return {number:3247,state:'closed',merged:false,merged_at:null,closed_at:at,
    base:{ref:'codex/public-book-library',repo:{full_name:repo,id:1}},
    head:{ref:'feat/closed',sha:SHA,repo:{full_name:repo,id:1}},...extra};
}
function run(id,extra = {}) {
  return {id,event:'pull_request',status:'queued',run_attempt:1,
    created_at:earlier,head_sha:SHA,head_branch:'feat/closed',
    repository:{full_name:repo},head_repository:{full_name:repo},
    pull_requests:[{number:3247,base:{ref:'codex/public-book-library',repo:{id:1}},
      head:{ref:'feat/closed',repo:{id:1},sha:SHA}}],...extra};
}
const context = {eventName:'pull_request_target',repo:{owner:'andylitvinov-design',repo:'books'},
  payload:{action:'closed',number:3247,repository:{full_name:repo},pull_request:pr()}};
function fakeApi(items, {initialPR = pr(),freshPR = initialPR,unique = true,changing = null,ancestryStatus = 'ahead'} = {}) {
  const calls = {cancel:[],runs:[],prs:0,listed:[],branch:0,compare:[]};
  const api = {rest:{pulls:{
    get:async()=>{calls.prs++;return{data:changing?.(calls.prs) || (calls.prs===1?initialPR:freshPR)};},
    },actions:{}}};
  api.rest.pulls.list = async()=> {calls.branch++;return{data:unique?[initialPR]:[initialPR,pr({number:3248})]};};
  api.rest.repos={compareCommits:async({base,head})=>{
    calls.compare.push({base,head});
    return {data:{status:ancestryStatus,ahead_by:1,behind_by:0,
      base_commit:{sha:base},merge_base_commit:{sha:base}}};
  }};
  api.rest.actions.listWorkflowRunsForRepo = async({status,event,branch,page})=>{
    calls.listed.push({status,event,branch,page});
    return {data:{total_count:items.filter(i=>i.status===status).length,
      workflow_runs:items.filter(i=>i.status===status)}};
  };
  api.rest.actions.getWorkflowRun = async({run_id})=>{calls.runs.push(run_id);return {data:items.find(x=>x.id===run_id)}};
  api.rest.actions.cancelWorkflowRun = async({run_id})=>{calls.cancel.push(run_id);return {status:202};};
  return {github:api,calls};
}

test('requires genuine closed production PR and rejects inconsistent or untrusted events',()=>{
  assert.equal(trustedEvent(context).number,3247);
  assert.equal(closedProductionPR(pr(),3247,SHA),true);
  assert.equal(closedProductionPR(pr({merged:true}),3247,SHA),false);
  assert.equal(closedProductionPR(pr({state:'open'}),3247,SHA),false);
  assert.equal(closedProductionPR(pr({base:{ref:'codex/bootstrap-books',repo:{full_name:repo}}}),3247,SHA),false);
  assert.throws(()=>trustedEvent({...context,payload:{...context.payload,action:'synchronize'}}),/UNTRUSTED/);
  assert.throws(()=>trustedEvent({...context,payload:{...context.payload,number:999}}),/UNTRUSTED/);
  assert.throws(()=>trustedEvent({...context,payload:{...context.payload,pull_request:pr({
    head:{ref:'outside',sha:SHA,repo:{full_name:'outsider/fork'}}})}}),/UNTRUSTED/);
  assert.throws(()=>trustedEvent({...context,repo:{owner:'other',repo:'books'}}),/UNTRUSTED/);
});

test('cancels queued and in-progress runs tied to only the closed PR',async()=>{
  const items=[run(100),run(101,{status:'in_progress'}),
    run(102,{event:'push',pull_requests:[]}),
    run(103,{event:'workflow_dispatch',pull_requests:[]}),
    run(104,{run_attempt:2}),
    run(105,{pull_requests:[{number:3257,base:{ref:'codex/public-book-library'},head:{ref:'feat/closed'}}]}),
    run(106,{head_branch:'codex/public-book-library'}),
    run(107,{created_at:'2026-11-03T05:23:00Z'})];
  const {github,calls}=fakeApi(items);
  const result=await cleanup({github,context});
  assert.deepEqual(calls.cancel,[100,101]);
  assert.deepEqual(result.accepted,[100,101]);
  assert.deepEqual(result.confirmed,[]);
  assert.equal(result.skipped,6);
  assert.equal(calls.listed.length,2);
  assert.deepEqual(new Set(calls.listed.map(x=>x.status)),new Set(['queued','in_progress']));
  assert.ok(calls.listed.every(x=>x.event==='pull_request'&&x.branch==='feat/closed'));
});

test('empty GitHub pull_requests is cancellable only with exact SHA and unique branch',async()=>{
  const one=run(201,{pull_requests:[]});
  const two=run(202,{pull_requests:[],head_sha:OLD});
  const ok=fakeApi([one,two]);
  const r1=await cleanup({github:ok.github,context});
  assert.deepEqual(ok.calls.cancel,[201]);
  assert.equal(r1.scanned,2);
  assert.equal(ok.calls.branch,1);
  const ambiguous=fakeApi([one],{unique:false});
  const r2=await cleanup({github:ambiguous.github,context});
  assert.deepEqual(ambiguous.calls.cancel,[]);
  assert.equal(r2.eligible,0);
});

test('another PR association, another repository and manual reruns stay untouched',()=>{
  const current=pr();
  assert.equal(eligible(run(1),current,false),true);
  assert.equal(eligible(run(2,{pull_requests:[]}),current,true),true);
  assert.equal(eligible(run(3,{pull_requests:[]}),current,false),false);
  assert.equal(eligible(run(4,{pull_requests:[{number:3247,base:{ref:'codex/public-book-library'},head:{ref:'feat/closed'}},{number:3248}]}),current,true),false);
  assert.equal(eligible(run(5,{head_repository:{full_name:'other/repo'}}),current,true),false);
  assert.equal(eligible(run(6,{run_attempt:3}),current,true),false);
  assert.equal(eligible(run(7,{event:'workflow_dispatch'}),current,true),false);
  assert.equal(eligible(run(8,{status:'completed'}),current,true),false);
  assert.equal(eligible(run(9,{status:'waiting'}),current,true),false);
});

test('reopen or change PR SHA during readback prevents any cancellation',async()=>{
  const item=run(301);
  const x=fakeApi([item],{changing:n=>n===1?pr():pr({state:'open'})});
  const result=await cleanup({github:x.github,context});
  assert.equal(result.eligible,0);
  assert.deepEqual(x.calls.cancel,[]);
  const y=fakeApi([item],{changing:n=>n===1?pr():pr({head:{ref:'feat/closed',sha:OLD,repo:{full_name:repo,id:1}}})});
  await cleanup({github:y.github,context});
  assert.deepEqual(y.calls.cancel,[]);
});

test('manual dispatch defaults to dry-run and can preview a closed PR',async()=>{
  const manual={eventName:'workflow_dispatch',ref:'refs/heads/codex/bootstrap-books',
    repo:context.repo,payload:{inputs:{pr_number:'3247'}}};
  assert.equal(trustedEvent(manual).dryRun,true);
  const {github,calls}=fakeApi([run(401)]);
  const result=await cleanup({github,context:manual});
  assert.deepEqual(result.wouldCancel,[401]);
  assert.deepEqual(calls.cancel,[]);
  assert.throws(()=>trustedEvent({...manual,ref:'refs/heads/codex/public-book-library'}),/UNTRUSTED/);
  assert.throws(()=>trustedEvent({...manual,payload:{inputs:{pr_number:'oops'}}}),/INVALID/);
});

test('closed merged PR cleans only associated obsolete first-attempt PR checks',async()=>{
  const merged=pr({merged:true,merged_at:at});
  const runs=[run(501),run(502,{status:'in_progress'}),
    run(503,{event:'push',pull_requests:[]}),run(504,{run_attempt:2}),
    run(505,{pull_requests:[{number:9999}]}),
    run(506,{created_at:'2026-11-03T05:22:00Z'})];
  const {github,calls}=fakeApi(runs,{initialPR:merged,freshPR:merged});
  const mergedEvent={...context,payload:{...context.payload,pull_request:merged}};
  const result=await cleanup({github,context:mergedEvent});
  assert.deepEqual(calls.cancel,[501,502]);
  assert.equal(result.eligible,2);
  assert.equal(result.accepted.length,2);
  assert.equal(result.confirmed.length,0);
});

test('contradictory merged records or merge-state change during readback never cancel',async()=>{
  const absent=pr({merged:true,merged_at:null});
  assert.equal(closedProductionPR(absent,3247,SHA),false);
  assert.throws(()=>trustedEvent({...context,payload:{...context.payload,pull_request:absent}}),
    /UNTRUSTED_CLOSED_PR_EVENT/);
  const future=pr({merged:true,merged_at:'2026-11-03T06:21:31Z'});
  assert.equal(closedProductionPR(future,3247,SHA),false);
  const merged=pr({merged:true,merged_at:at});
  const {github,calls}=fakeApi([run(510)],{initialPR:merged,freshPR:pr()});
  const mergedEvent={...context,payload:{...context.payload,pull_request:merged}};
  const result=await cleanup({github,context:mergedEvent});
  assert.equal(result.eligible,0);
  assert.deepEqual(calls.cancel,[]);
});

test('merged legacy HEAD with empty GitHub association needs verified SHA ancestry',async()=>{
  const merged=pr({merged:true,merged_at:at});
  const mergedEvent={...context,payload:{...context.payload,pull_request:merged}};
  const stale=run(601,{head_sha:OLD,pull_requests:[]});
  const ok=fakeApi([stale],{initialPR:merged,freshPR:merged});
  const result=await cleanup({github:ok.github,context:mergedEvent});
  assert.deepEqual(ok.calls.cancel,[601]);
  assert.equal(ok.calls.compare.length,1);
  assert.equal(result.ancestry_proved,1);
  const different=fakeApi([stale],{initialPR:merged,freshPR:merged,unique:false});
  const ignored=await cleanup({github:different.github,context:mergedEvent});
  assert.deepEqual(different.calls.cancel,[]);
  assert.equal(different.calls.compare.length,0);
  const diverged=fakeApi([stale],{initialPR:merged,freshPR:merged,ancestryStatus:'diverged'});
  const refused=await cleanup({github:diverged.github,context:mergedEvent});
  assert.deepEqual(diverged.calls.cancel,[]);
  assert.equal(refused.ancestry_proved,0);
});

test('workflow lives on default; no PR HEAD checkout, no cron, least privileges',()=>{
  const {readFileSync} = require('node:fs');
  const workflow=readFileSync('.github/workflows/hh-pr-closed-run-cleanup.yml','utf8');
  assert.match(workflow,/pull_request_target:\s*\n\s*types: \[closed\]/);
  assert.ok(!workflow.includes('github.event.pull_request.merged == false'));
  assert.ok(workflow.includes("github.event.pull_request.base.ref == 'codex/public-book-library'"));
  assert.ok(workflow.includes('ref: codex/bootstrap-books'));
  assert.ok(workflow.includes('persist-credentials: false'));
  assert.ok(workflow.includes('actions: write'));
  assert.ok(!workflow.includes('ref: ' + '$' + '{{ github.event.pull_request.head.sha }}'));
  assert.ok(!workflow.includes('  schedule:'));
});
