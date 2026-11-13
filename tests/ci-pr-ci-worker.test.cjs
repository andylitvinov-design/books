'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {run,validPR,validBranch,capacityAllows,ATTEMPTED,QUEUED}=require('../scripts/ci-pr-ci-worker.cjs');
const SHA='a'.repeat(40);
const repo='andylitvinov-design/books';
const now=Date.parse('2026-11-01T16:00:00Z');
const context={repo:{owner:'andylitvinov-design',repo:'books'}};
const core=()=>({info:()=>{},summary:{addHeading(){return this},addCodeBlock(){return this},async write(){}}});
const makePR=(number=10,options={})=>({
  number,state:'open',draft:false,created_at:'2026-10-20T00:00:00Z',
  mergeable:true,mergeable_state:'clean',
  base:{ref:'codex/public-book-library'},
  head:{sha:SHA,ref:'legacy-'+number,repo:{full_name:repo}},
  labels:[{name:QUEUED}],...options
});
function fixture(options={}){
  const p=options.pr||makePR();
  const items=options.items||[{number:p.number,pull_request:{url:'https://api.github.com/test'}}];
  const logs={gets:0,labels:0,remove:0,source:0,runs:0,children:0,claims:0,receipts:[]};
  let latest=p;
  const github={rest:{
    actions:{listWorkflowRunsForRepo:async ({status})=>({data:{
      total_count:status==='queued'?(options.queued??0):(options.active??0)
    }})},
    issues:{
      listForRepo:async()=>({data:items}),
      addLabels:async()=>{logs.labels++;if(options.claimError)throw Object.assign(Error('claim'),{status:403});latest={...latest,labels:[...(latest.labels||[]),{name:ATTEMPTED}]};return {data:[]}},
      removeLabel:async()=>{logs.remove++;return {data:[]}},
      createComment:async arg=>{logs.receipts.push(arg);return {data:{id:123}}}
    },
    pulls:{
      get:async()=>{logs.gets++;return {data:(options.changedOnRefresh&&logs.gets>1)||
        (options.changedAfterBootstrap&&logs.source>0)?
        {...latest,head:{...latest.head,sha:'f'.repeat(40)}}:latest};},
      list:async()=>{logs.children++;return {data:options.children||[]};}
    }
  },request:async(route)=>{logs.runs++;if(!route.includes('workflows'))throw Error('unexpected request');
    return {data:{total_count:options.coreHistory??0,
      workflow_runs:options.coreHistory?[{id:44}]:[]}};}};
  const sourceGit={bootstrap:async()=>{logs.source++;return {sha:'c'.repeat(40)};}};
  return {github,sourceGit,logs};
}
test('only clean same-repo production PR may bootstrap',()=>{
  assert.equal(validPR(makePR(),repo),true);
  assert.equal(validPR(makePR(5,{draft:true}),repo),false);
  assert.equal(validPR(makePR(5,{mergeable_state:'dirty'}),repo),false);
  assert.equal(validPR(makePR(5,{mergeable_state:'behind'}),repo),false);
  assert.equal(validPR(makePR(5,{labels:[{name:ATTEMPTED}]}),repo),false);
  assert.equal(validPR(makePR(5,{base:{ref:'codex/bootstrap-books'}}),repo),false);
});
test('malformed branch names and over-capacity are rejected',()=>{
  assert.equal(validBranch('codex/fix-123'),true);
  for(const x of ['../test','bad//branch','bad@{ref}','/leading','a'.repeat(161),''])assert.equal(validBranch(x),false);
  assert.equal(capacityAllows(11,5),true);
  assert.equal(capacityAllows(12,0),true);
  assert.equal(capacityAllows(15,0),true);
  assert.equal(capacityAllows(16,0),false);
  assert.equal(capacityAllows(0,6),false);
  assert.equal(capacityAllows(NaN,0),false);
});
test('dry-run sees eligible legacy PR without touching labels or branch',async()=>{
  const f=fixture();
  const r=await run({github:f.github,core:core(),context,sourceGit:f.sourceGit,now,dryRun:true});
  assert.equal(r.eligible,1);
  assert.equal(r.wouldStart,1);
  assert.equal(r.started,0);
  assert.equal(f.logs.labels,0);
  assert.equal(f.logs.source,0);
  assert.ok(r.apiRequests<=28);
});
test('real worker starts exactly one genuine PR synchronize, never merges',async()=>{
  const f=fixture({items:[{number:10,pull_request:{}},{number:11,pull_request:{}}]});
  const r=await run({github:f.github,core:core(),context,sourceGit:f.sourceGit,now});
  assert.equal(r.started,1);
  assert.equal(f.logs.labels,1);
  assert.equal(f.logs.source,1);
  assert.equal(f.logs.remove,1);
  assert.equal(r.examined,1);
});
test('without existing dedicated source token no mutation occurs',async()=>{
  const f=fixture();
  const r=await run({github:f.github,core:core(),context,now});
  assert.equal(r.started,0);
  assert.equal(r.reason,'HH_AUTOMERGE_TOKEN_REQUIRED');
  assert.equal(f.logs.labels,0);
  assert.equal(f.logs.source,0);
});
test('historical Core PR run means NEVER create a new source commit',async()=>{
  const f=fixture({coreHistory:1});
  const r=await run({github:f.github,core:core(),context,sourceGit:f.sourceGit,now});
  assert.equal(r.started,0);
  assert.equal(f.logs.labels,0);
  assert.equal(f.logs.source,0);
});
test('stacked PR parent is never modified by bootstrap worker',async()=>{
  const f=fixture({children:[{number:222}]});
  const r=await run({github:f.github,core:core(),context,sourceGit:f.sourceGit,now});
  assert.equal(r.started,0);
  assert.equal(f.logs.source,0);
});
test('busy CI queue prevents all PR updates and queries',async()=>{
  const f=fixture({active:16,queued:2});
  const r=await run({github:f.github,core:core(),context,sourceGit:f.sourceGit,now});
  assert.equal(r.reason,'CI_QUEUE_BUSY');
  assert.equal(f.logs.gets,0);
  assert.equal(f.logs.source,0);
});
test('changed HEAD after lease fails closed without source mutation',async()=>{
  const f=fixture({changedOnRefresh:true});
  const r=await run({github:f.github,core:core(),context,sourceGit:f.sourceGit,now});
  assert.equal(r.started,0);
  assert.equal(r.reason,'PR_CHANGED_AFTER_CLAIM');
  assert.equal(f.logs.labels,1);
  assert.equal(f.logs.source,0);
});
test('a prior attempt label cannot trigger another commit',async()=>{
  const f=fixture({pr:makePR(10,{labels:[{name:QUEUED},{name:ATTEMPTED}]})});
  const r=await run({github:f.github,core:core(),context,sourceGit:f.sourceGit,now});
  assert.equal(r.started,0);
  assert.equal(f.logs.source,0);
});
test('REST rate reserve stops cycle safely before any branch modification',async()=>{
  const f=fixture();
  f.github.rest.actions.listWorkflowRunsForRepo=async()=>({
    headers:{'x-ratelimit-remaining':'72'},data:{total_count:0}});
  const r=await run({github:f.github,core:core(),context,sourceGit:f.sourceGit,now});
  assert.equal(r.apiPause,true);
  assert.equal(r.reason,'GITHUB_API_RESERVE');
  assert.equal(f.logs.gets,0);
  assert.equal(f.logs.source,0);
});
test('owner token exception does not create a duplicate commit',async()=>{
  const f=fixture();
  f.sourceGit.bootstrap=async()=>{throw Object.assign(Error('HTTP 403: token lacks Contents write'),{status:403});};
  const r=await run({github:f.github,core:core(),context,sourceGit:f.sourceGit,now});
  assert.equal(r.started,0);
  assert.equal(r.failed,1);
  assert.equal(f.logs.labels,1);
});


test('owner-token HTTP 403 produces a verified failure receipt, never successful bootstrap',async()=>{
 const f=fixture();
 f.sourceGit.bootstrap=async()=>{f.logs.source++;throw Object.assign(
  Error('Dedicated owner token HTTP 403: Resource not accessible by personal access token'),
  {status:403});};
 const result=await run({github:f.github,core:core(),context:{...context,runId:777},sourceGit:f.sourceGit,now});
 assert.equal(result.started,0);
 assert.equal(result.failed,1);
 assert.equal(result.terminalFailure,true);
 assert.equal(result.reason,'OWNER_SOURCE_TOKEN_PERMISSION_DENIED');
 assert.equal(result.sourceRefUnchanged,true);
 assert.equal(result.diagnosticReceiptWritten,true);
 assert.equal(f.logs.labels,1);
 assert.equal(f.logs.receipts.length,1);
 assert.equal(f.logs.receipts[0].issue_number,10);
 assert.match(f.logs.receipts[0].body,/HH_CI_BOOTSTRAP_TOKEN_DENIED_V1/);
 assert.match(f.logs.receipts[0].body,/No source commit or Core check was created/);
});
test('denied token with changed source head never asserts no code was written',async()=>{
 const f=fixture({changedAfterBootstrap:true});
 f.sourceGit.bootstrap=async()=>{f.logs.source++;throw Object.assign(
  Error('Dedicated owner token HTTP 403: Resource not accessible by personal access token'),
  {status:403});};
 const result=await run({github:f.github,core:core(),context,sourceGit:f.sourceGit,now});
 assert.equal(result.started,0);
 assert.equal(result.terminalFailure,true);
 assert.equal(result.sourceRefUnchanged,false);
 assert.equal(result.diagnosticReceiptWritten,false);
 assert.equal(f.logs.receipts.length,0);
});
test('GitHub worker marks a definitively denied token as a failed job',()=>{
 const workflow=require('node:fs').readFileSync('.github/workflows/hh-pr-ci-worker.yml','utf8');
 assert.ok(workflow.includes('if(result.terminalFailure)'));
 assert.ok(workflow.includes('core.setFailed'));
});

test('pre-claimed queue items do not starve fresh PRs',async()=>{
  const f=fixture({items:[
    {number:99,pull_request:{},labels:[{name:ATTEMPTED},{name:QUEUED}]},
    {number:10,pull_request:{},labels:[{name:QUEUED}]}
  ]});
  const r=await run({github:f.github,core:core(),context,sourceGit:f.sourceGit,now});
  assert.equal(r.started,1);
  assert.equal(r.examined,1);
  assert.equal(f.logs.source,1);
});
test('issue-to-PR mismatch is ignored before any source mutation',async()=>{
  const f=fixture({items:[{number:99,pull_request:{},labels:[{name:QUEUED}]}]});
  const r=await run({github:f.github,core:core(),context,sourceGit:f.sourceGit,now});
  assert.equal(r.started,0);
  assert.equal(f.logs.labels,0);
  assert.equal(f.logs.source,0);
});

// A missing Core check can make an otherwise mergeable PR status 'blocked'.
test('legacy zero-Core bootstrap accepts a mergeable PR blocked only by checks',()=>{
  assert.equal(validPR(makePR(43,{mergeable_state:'blocked'}),repo),true);
  assert.equal(validPR(makePR(43,{mergeable_state:'dirty'}),repo),false);
  assert.equal(validPR(makePR(43,{mergeable:false,mergeable_state:'blocked'}),repo),false);
});

test('CI Worker workflow accepts the exact Control Tower reservation identity',()=>{
 const fs=require('node:fs');
 const yaml=fs.readFileSync('.github/workflows/hh-pr-ci-worker.yml','utf8');
 const inputs=yaml.split('  workflow_dispatch:\n')[1]?.split('\n  push:')[0];
 assert.ok(inputs,'CI Worker dispatch inputs must be defined');
 for(const key of ['pr_number','expected_sha','task_key','reservation_run_id']){
  assert.ok(inputs.split('\n').includes('      '+key+':'),key+' must be declared');
 }
 assert.ok(inputs.includes("      reservation_run_id:\n        description: 'Authenticated dispatcher reservation run ID; exact HEAD, bot identity and task key required'\n        type: string\n        default: ''"));
 const dispatcher=fs.readFileSync('scripts/ci-pr-queue-dispatcher.cjs','utf8');
 assert.ok(dispatcher.includes("reservation_run_id:String(context.runId||'')"));
});


// A real schedule event should not waste its CI Worker runner as dry-run:
// route only authenticated, eligible queue labels through the existing writer.
const {run:runCiScheduleBackstop}=require('../scripts/ci-pr-schedule-fallback.cjs');
const scheduledContext={repo:{owner:'andylitvinov-design',repo:'books'},
  ref:'refs/heads/codex/bootstrap-books',eventName:'schedule'};
function scheduledFixture(items={},history=[]){
 const calls=[];
 const github={rest:{issues:{listForRepo:async args=>{
   calls.push({type:'labels',label:args.labels});
   return {data:items[args.labels]||[]};
 }}},request:async(route,args)=>{
   calls.push({type:'request',route,args});
   if(route.startsWith('GET '))return {data:{workflow_runs:history}};
   if(route.startsWith('POST '))return {status:204};
   throw Error('Unexpected request');
 }};
 return {github,calls};
}
const queuedCi=[{state:'open',pull_request:{url:'https://api.github.com/repos/andylitvinov-design/books/pulls/17'},
 labels:[{name:'hh:ci-needed'}]}];
test('scheduled CI Worker wakes Control Tower once for verified queued PR labels',async()=>{
 const f=scheduledFixture({'hh:ci-needed':queuedCi},[
  {id:9,status:'completed',created_at:'2026-11-02T17:00:00Z'}
 ]);
 const result=await runCiScheduleBackstop({github:f.github,context:scheduledContext,
  hasToken:true,now:Date.parse('2026-11-02T18:00:00Z')});
 assert.equal(result.status,'DISPATCH_ACCEPTED');
 assert.equal(result.queueObserved,true);
 assert.equal(result.sourceChanged,false);
 assert.equal(f.calls.filter(c=>c.type==='request'&&c.route.startsWith('POST ')).length,1);
 assert.equal(f.calls.find(c=>c.type==='request'&&c.route.startsWith('POST ')).args.workflow_id,
  'hh-pr-queue-dispatcher.yml');
});
test('scheduled fallback skips held/no-op/untrusted and never writes source',async()=>{
 const f=scheduledFixture({'hh:ci-needed':[
  {state:'open',pull_request:{},labels:[{name:'hh:ci-needed'},{name:'hh:hold'}]},
  {state:'open',labels:[{name:'hh:ci-needed'}]}
 ],'hh:repair-needed':[]});
 const none=await runCiScheduleBackstop({github:f.github,context:scheduledContext,hasToken:true});
 assert.equal(none.status,'NO_ACTIONABLE_LABELS');
 assert.equal(none.labelsChecked,2);
 for(const other of [
  {...scheduledContext,eventName:'push'},
  {...scheduledContext,ref:'refs/heads/codex/public-book-library'},
  {...scheduledContext,repo:{owner:'untrusted',repo:'books'}}
 ]){
  const out=await runCiScheduleBackstop({github:f.github,context:other,hasToken:true});
  assert.equal(out.status,'UNTRUSTED_EVENT');
 }
 const noToken=await runCiScheduleBackstop({github:f.github,context:scheduledContext,
  hasToken:false});
 assert.equal(noToken.status,'OWNER_TOKEN_MISSING');
 assert.equal(f.calls.filter(c=>c.type==='request').length,0);
});
test('scheduled fallback respects busy dispatcher and fails closed on missing queue data',async()=>{
 const f=scheduledFixture({'hh:ci-needed':queuedCi},[
  {id:8,status:'in_progress',created_at:'2026-11-02T18:00:00Z'}
 ]);
 const busy=await runCiScheduleBackstop({github:f.github,context:scheduledContext,
  hasToken:true,now:Date.parse('2026-11-02T18:01:00Z')});
 assert.equal(busy.status,'BUSY_OR_COOLDOWN');
 assert.equal(f.calls.filter(c=>c.type==='request'&&c.route.startsWith('POST ')).length,0);
 const unknown={rest:{issues:{listForRepo:async()=>({data:null})}}};
 const failed=await runCiScheduleBackstop({github:unknown,context:scheduledContext,
  hasToken:true});
 assert.equal(failed.status,'QUEUE_UNVERIFIED');
});
test('CI Worker schedule calls trusted backstop before addressed metadata wake',()=>{
 const yaml=require('node:fs').readFileSync('.github/workflows/hh-pr-ci-worker.yml','utf8');
 const fallback=yaml.indexOf("context.eventName==='schedule'");
 const address=yaml.indexOf('const tokenProbeRequested=');
 assert.ok(fallback>0&&address>fallback);
 assert.ok(yaml.includes('HH_CI_SCHEDULE_FALLBACK'));
 assert.ok(yaml.includes('node --check scripts/ci-pr-schedule-fallback.cjs'));
});

test('scheduled CI Worker is a twice-hourly backup, not an extra ten-minute PR scan',()=>{
 const yaml=require('node:fs').readFileSync('.github/workflows/hh-pr-ci-worker.yml','utf8');
 assert.ok(yaml.includes("cron: '3,33 * * * *'"));
 assert.ok(!yaml.includes("cron: '3,13,23,33,43,53 * * * *'"));
 assert.match(yaml,/context\.eventName==='schedule'/);
 assert.match(yaml,/scripts\/ci-pr-schedule-fallback\.cjs/);
 assert.match(yaml,/reservation_run_id/);
});
