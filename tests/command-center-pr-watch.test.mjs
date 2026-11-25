import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PR_WATCH_MAX_ACTIVE,PR_WATCH_PER_TICK,PR_WATCH_INTERVAL_MINUTES,
 classifyPrWatchProof,setCommandPrWatch,claimCommandPrWatches,settleCommandPrWatch,
 checkCommandPrWatches} from '../lib/command-center/pr-watch.mjs';
import {inspectCommandTaskDelivery} from '../lib/command-center/release-proof.mjs';

const id='e6179c60-7255-48dc-9a53-8a6f284ef715';
const head='a'.repeat(40);
const github='https://github.com/andylitvinov-design/books/pull/3860';
const proof=(overrides={})=>({prNumber:3860,prState:'open',ci:'unknown',
 targetBranch:'codex/public-book-library',codeOnProduction:false,...overrides});
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('truthful statuses differentiate repair, green, merge and actual code-on-production evidence',()=>{
 assert.equal(classifyPrWatchProof(proof()),'in_progress');
 assert.equal(classifyPrWatchProof(proof({ci:'pending'})),'ci_running');
 assert.equal(classifyPrWatchProof(proof({ci:'failed'})),'needs_fix');
 assert.equal(classifyPrWatchProof(proof({ci:'passed'})),'ready_for_merge');
 assert.equal(classifyPrWatchProof(proof({prState:'closed'})),'closed_without_merge');
 assert.equal(classifyPrWatchProof(proof({prState:'merged'})),'merged_waiting_live');
 assert.equal(classifyPrWatchProof(proof({prState:'merged',codeOnProduction:true})),'on_live_unverified');
 assert.equal(classifyPrWatchProof(proof({prState:'merged',targetBranch:'codex/bootstrap-books',codeOnProduction:true})),'merged_control');
 assert.equal(classifyPrWatchProof(null),'unknown');
 assert.equal(classifyPrWatchProof(proof({prState:'unknown',ci:'passed'})),'unknown');
});
test('15 minute cooldown is bounded and reuses at most two checks per existing background tick',()=>{
 assert.equal(PR_WATCH_INTERVAL_MINUTES,15);
 assert.equal(PR_WATCH_PER_TICK,2);
 assert.equal(PR_WATCH_MAX_ACTIVE,3);
 const watcher=read('lib/command-center/pr-watch.mjs');
 const dispatcher=read('lib/command-center/dispatcher.mjs');
 assert.match(watcher,/next_check_at=now\(\)\+interval '15 minutes'/);
 assert.match(watcher,/FOR UPDATE OF w SKIP LOCKED/);
 assert.match(watcher,/last_checked_at<now\(\)-interval '60 seconds'/);
 assert.match(dispatcher,/checkCommandPrWatches\(\{config,transaction,fetcher,env\}\)/);
 assert.match(dispatcher,/claimSchedulerSlot\(db,slotUtc\)/);
 assert.doesNotMatch(dispatcher,/setInterval|new Worker\(/);
});
test('owner cannot track a non-PR task or exceed active capacity',async()=>{
 const logs=[],db={query:async(q,params=[])=>{
  logs.push({q,params});
  if(q.includes('SELECT t.id,t.kind,t.state'))return {rows:[{id,kind:'code_change',
    state:'planned',source_ref:github,linked_pr:3860}]};
  if(q.includes('SELECT enabled,pr_number,stage'))return {rows:[]};
  if(q.includes('SELECT count(*)::int AS n'))return {rows:[{n:3}]};
  return {rows:[]};
 }};
 assert.equal((await setCommandPrWatch(db,{taskId:'invalid',enabled:true})).status,'invalid_control');
 assert.equal((await setCommandPrWatch(db,{taskId:id,enabled:true})).status,'capacity_reached');
 assert.ok(logs.some(x=>x.q.includes('pg_advisory_xact_lock')));
 assert.ok(logs.every(x=>!x.q.includes('UPDATE app_private.cc_tasks')));
 const noPr={query:async(q)=>q.includes('SELECT t.id,t.kind,t.state')?{rows:[{id,state:'planned',source_ref:null,linked_pr:null}]}:{rows:[]}};
 assert.equal((await setCommandPrWatch(noPr,{taskId:id,enabled:true})).status,'pr_link_required');
});
test('on-demand refresh is row-leased and owner-scoped, never triggers a code writer',async()=>{
 const queries=[],db={query:async(q,params=[])=>{
  queries.push({q,params});return {rows:[]};
 }};
 assert.deepEqual(await claimCommandPrWatches(db,{taskId:id,limit:1}),[]);
 const statement=queries[0];
 assert.ok(statement.q.includes('t.state<>\x27canceled\x27'));
 assert.ok(statement.q.includes('w.task_id=$1::uuid'));
 assert.equal(statement.params[0],id);
 assert.equal(statement.params[1],1);
 assert.equal(await claimCommandPrWatches(db,{taskId:'bad'}).then(x=>x.length),0);
 assert.doesNotMatch(JSON.stringify(queries),/workflow_dispatch|merge_pull_request/);
});
test('status transitions are persisted as append-only history with bounded evidence, not LIVE task states',async()=>{
 const calls=[],db={query:async(q,params=[])=>{
  calls.push({q,params});
  if(q.startsWith('SELECT stage,proof,pr_number'))return {rows:[{stage:'ci_running',proof:{headSha:head,ci:'pending'},pr_number:3860}]};
  return {rows:[]};
 }};
 const r=await settleCommandPrWatch(db,{task_id:id,pr_number:3860,generation:7},
  proof({headSha:head,ci:'failed',nextAction:'repair_checks'}));
 assert.equal(r.stage,'needs_fix');
 const save=calls.find(x=>x.q.startsWith('UPDATE app_private.cc_pr_watch SET'));
 const info=JSON.parse(save.params[4]);
 assert.equal(info.ci,'failed');assert.equal(info.functionalAccepted,false);
 assert.equal(info.codeOnProduction,false);
 assert.ok(calls.some(x=>x.q.includes('INSERT INTO app_private.cc_pr_watch_events')));
 assert.ok(calls.every(x=>!x.q.includes('UPDATE app_private.cc_tasks')));
});
test('control branch can be observed but cannot be labeled production LIVE',async()=>{
 const pr={html_url:github,number:3860,state:'closed',merged_at:'2026-11-07T18:08:00Z',
  merge_commit_sha:'b'.repeat(40),head:{sha:head,repo:{full_name:'andylitvinov-design/books'}},
  base:{ref:'codex/bootstrap-books'},changed_files:0};
 const checks={total_count:3,check_runs:['core-lint-types-build','hh-specialist','hh-merge-check']
   .map(name=>({name,head_sha:head,status:'completed',conclusion:'success',completed_at:'2026-11-07T18:07:00Z'}))};
 const fetcher=async url=>{
  const obj=url.endsWith('/pulls/3860')?pr:checks;
  return {ok:true,headers:{get:()=>null},text:async()=>JSON.stringify(obj)};
 };
 const env={VERCEL_ENV:'production',VERCEL_GIT_COMMIT_REF:'codex/public-book-library',VERCEL_GIT_COMMIT_SHA:'b'.repeat(40)};
 const guarded=await inspectCommandTaskDelivery(github,{fetcher,env,includeFiles:false,allowControlBranch:true});
 assert.equal(guarded.proof.prState,'merged');
 assert.equal(guarded.proof.targetBranch,'codex/bootstrap-books');
 assert.equal(guarded.proof.codeOnProduction,false);
 assert.equal(classifyPrWatchProof(guarded.proof),'merged_control');
 const denied=await inspectCommandTaskDelivery(github,{fetcher,env,includeFiles:false});
 assert.equal(denied.proof.prState,'unknown');
});
test('owner API and mobile Agents panel share the same authenticated entrypoint',()=>{
 const api=read('app/api/admin/command-center/route.js');
 const parent=read('app/admin/command-center/command-center-mobile.jsx');
 const ui=read('app/admin/command-center/command-center-pr-watch.jsx');
 const migration=read('supabase/migrations/20261107191000_hh_command_center_pr_watcher_v1.sql');
 assert.match(api,/ownerMaterialRequest/);
 assert.match(api,/CROSS_ORIGIN_DENIED/);
 assert.match(api,/watch_set/);assert.match(api,/watch_check/);
 assert.match(parent,/tab==='agents'/);
 assert.match(parent,/CommandCenterPrWatch/);
 assert.match(ui,/onCheck\?\.\(w\.task_id\)/);
 assert.match(ui,/stage_needs_fix:'Требует исправления CI'/);
 assert.match(ui,/stage_on_live_unverified:'Код на LIVE · нужна проверка функции'/);
 assert.match(migration,/FORCE ROW LEVEL SECURITY/);
 assert.match(migration,/REVOKE ALL ON app_private\.cc_pr_watch/);
 assert.doesNotMatch(migration,/GRANT\s+.*\s+TO\s+anon\b/i);
 assert.doesNotMatch(api,/merge_pull_request|create_commit|workflow_dispatch/);
});
test('scheduled monitor is read-only even when GitHub fails or DB race loses its lease',async()=>{
 const queries=[];
 const db={query:async(q,params=[])=>{
  queries.push({q,params});
  if(q.startsWith('WITH due AS'))return {rows:[{task_id:id,pr_number:3860,generation:1}]};
  if(q.startsWith('SELECT stage,proof,pr_number'))return {rows:[]}; // different worker owns it now
  return {rows:[]};
 }};
 const transaction=async(_config,_actor,fn)=>fn(db);
 const r=await checkCommandPrWatches({config:{},transaction,taskId:id,limit:1,
  fetcher:async()=>({ok:false}),env:{VERCEL_ENV:'production'}});
 assert.equal(r.status,'partial_unconfirmed');
 assert.equal(r.checked,0);
 assert.ok(queries.every(x=>!x.q.includes('UPDATE app_private.cc_tasks')));
});
