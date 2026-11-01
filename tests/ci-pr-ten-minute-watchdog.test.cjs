'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {selectCandidates, gateIsGreen, transientFailure, canRetryCi, classifyMergeState, run, bootstrapLegacyCore, hasActiveLease} = require('../scripts/ci-pr-ten-minute-watchdog.cjs');
const SHA = 'b'.repeat(40);
const NOW = 1800000000000;
const pr = number => ({
  number,updated_at:new Date(NOW+number*1000).toISOString(),draft:false,auto_merge:null,
  base:{ref:'codex/public-book-library'},
  head:{sha:SHA,ref:'test-'+number,repo:{full_name:'andylitvinov-design/books'}}
});
const core = () => ({info:()=>{},summary:{addHeading(){return this},addCodeBlock(){return this},async write(){}}});
const context = {repo:{owner:'andylitvinov-design',repo:'books'}};

test('full pool is covered by rotating slices within sixteen 10-minute checks',()=>{
  const prs=Array.from({length:179},(_,i)=>pr(i+1)), numbers=new Set();
  for(let tick=0;tick<16;tick++) for(const p of selectCandidates(prs,NOW+tick*600000)) numbers.add(p.number);
  assert.equal(numbers.size,179);
  assert.ok(selectCandidates(prs,NOW).some(p=>p.number===179));
});
test('only trusted green exact-SHA gate can schedule guarded merging',()=>{
  const gate={total_count:1,check_runs:[{id:1,name:'release-ready',status:'completed',conclusion:'success',app:{id:15368}}]};
  assert.equal(gateIsGreen(gate),true);
  assert.equal(gateIsGreen({...gate,check_runs:[{...gate.check_runs[0],app:{id:9}}]}),false);
  assert.equal(gateIsGreen({...gate,total_count:101}),false);
  assert.equal(gateIsGreen({...gate,total_count:2,check_runs:[...gate.check_runs,{id:2,name:'browser',conclusion:'failure'}]}),false);
});
test('CI admission uses separate running and queued limits, not their sum',()=>{
  assert.equal(canRetryCi(12,12),true);
  assert.equal(canRetryCi(18,40),false);
  assert.equal(canRetryCi(20,0),false);
  assert.equal(canRetryCi(0,20),false);
  assert.equal(canRetryCi(Infinity,0),false);
});
test('merge state classifier distinguishes dirty, unknown and behind',()=>{
  assert.equal(classifyMergeState({mergeable:false,mergeable_state:'dirty'}),'DIRTY');
  assert.equal(classifyMergeState({mergeable:null,mergeable_state:'unknown'}),'UNKNOWN');
  assert.equal(classifyMergeState({mergeable:true,mergeable_state:'behind'}),'BEHIND');
  assert.equal(classifyMergeState({mergeable:true,mergeable_state:'clean'}),'MERGEABLE');
});
test('retry only first-attempt infrastructure failures after cooldown',()=>{
  const r={status:'completed',run_attempt:1,conclusion:'failure',created_at:new Date(NOW-60*60000).toISOString(),
    updated_at:new Date(NOW-40*60000).toISOString()};
  assert.equal(transientFailure(r,[{conclusion:'failure',steps:[{name:'TypeScript build',conclusion:'failure'}]}],NOW),false);
  assert.equal(transientFailure(r,[{conclusion:'failure',steps:[{name:'Install dependencies',conclusion:'failure'}]}],NOW),true);
  assert.equal(transientFailure({...r,run_attempt:2},[{conclusion:'timed_out'}],NOW),false);
  assert.equal(transientFailure({...r,updated_at:new Date(NOW-5*60000).toISOString()},[{conclusion:'timed_out'}],NOW),false);
});
test('green unarmed PR dispatches existing protected coordinator, not a direct merge',async()=>{
  let dispatched=0, targeted=false;
  const github={rest:{
    pulls:{list:async()=>({data:[pr(99)]}),get:async()=>({data:{...pr(99),state:'open',mergeable:true,mergeable_state:'clean'}})},
    actions:{listWorkflowRunsForRepo:async ({status})=>({data:{total_count:status==='queued'?0:3}})},
    checks:{listForRef:async(arg)=>{targeted=arg.check_name==='release-ready';return {data:{total_count:1,check_runs:[{id:1,name:'release-ready',status:'completed',conclusion:'success',app:{id:15368}}]}};}}
  },request:async(route)=>{if(route.includes('dispatches')) dispatched++;return {data:{workflow_runs:[]}};}};
  const result=await run({github,core:core(),context,now:NOW,hasMergeToken:true});
  assert.equal(result.greenUnarmed,1);
  assert.equal(result.mergeCoordinatorDispatched,1);
  assert.equal(dispatched,1);
  assert.equal(targeted,true);
});
test('CI overload blocks retries, but code failures are handed to Repair once',async()=>{
  let reruns=0,comments=0,labels=0;
  const github={rest:{
    pulls:{list:async()=>({data:[pr(98)]}),get:async()=>({data:{...pr(98),state:'open',mergeable:true,mergeable_state:'clean'}})},
    actions:{
      listWorkflowRunsForRepo:async ({status})=>({data:{total_count:status==='queued'?32:18}}),
      listJobsForWorkflowRun:async()=>({data:{total_count:1,jobs:[{name:'Build',conclusion:'failure',
        steps:[{name:'TypeScript build',conclusion:'failure'}]}]}})
    },
    checks:{listForRef:async()=>({data:{total_count:1,check_runs:[{id:1,name:'release-ready',conclusion:'failure'}]}})},
    issues:{listComments:async()=>({data:[]}),createComment:async()=>{comments++;},addLabels:async()=>{labels++;}}
  },paginate:async()=>[],request:async(route,args)=>{
    if(route.includes('rerun-failed-jobs'))reruns++;
    if(args?.workflow_id==='hh-pr-core-release.yml')return {data:{total_count:1,workflow_runs:[{
      id:44,name:'HH PR core release gate',event:'pull_request',head_sha:SHA,head_branch:'test-98',
      status:'completed',conclusion:'failure',run_attempt:1,
      created_at:new Date(NOW-60*60000).toISOString(),updated_at:new Date(NOW-40*60000).toISOString()}]}};
    return {data:{workflow_runs:[]}};
  }};
  const result=await run({github,core:core(),context,now:NOW,hasMergeToken:false});
  assert.equal(result.blockedByCapacity,true);
  assert.equal(result.transientCiReruns,0);
  assert.equal(reruns,0);
  assert.equal(comments,1);
  assert.equal(labels,1);
  assert.equal(result.activeActions,18);
  assert.equal(result.queuedActions,32);
});

test('rate-reserve stops deep checks and no merge dispatch is sent',async()=>{
  let checks=0;
  const github={rest:{
    pulls:{list:async()=>({headers:{'x-ratelimit-remaining':'0'},data:[pr(66)]})},
    actions:{listWorkflowRunsForRepo:async()=>{throw Error('capacity must be skipped');}},
    checks:{listForRef:async()=>{checks++;throw Error('checks must be skipped');}}
  }};
  const result=await run({github,core:core(),context,now:NOW,hasMergeToken:true});
  assert.equal(result.apiRateLimited,true);
  assert.equal(result.apiBudgetReason,'GITHUB_RATE_RESERVE');
  assert.equal(result.apiRequests,1);
  assert.equal(result.inspected,0);
  assert.equal(checks,0);
  assert.equal(result.mergeCoordinatorDispatched,0);
});
test('bounded rotation inventories all open PRs while limiting detailed calls',async()=>{
  const all=Array.from({length:179},(_,i)=>pr(i+1));
  const github={rest:{
    pulls:{list:async({page})=>({data:all.slice((page-1)*100,page*100)}),
      get:async({pull_number})=>({data:{...pr(pull_number),state:'open',mergeable:true,mergeable_state:'clean'}})},
    actions:{listWorkflowRunsForRepo:async()=>({data:{total_count:0}})},
    checks:{listForRef:async()=>({data:{total_count:0,check_runs:[]}})}
  },request:async()=>({data:{total_count:0,workflow_runs:[]}})};
  const result=await run({github,core:core(),context,now:NOW,hasMergeToken:false,dryRun:true});
  assert.equal(result.open,179);
  assert.ok(result.inspected<=16);
  assert.ok(result.apiRequests<=65);
});

test('real DIRTY PR enters conflict queue without consuming Core CI requests',async()=>{
  let checked=0,labels=0,dispatched=0;
  const live={...pr(1469),state:'open',mergeable:false,mergeable_state:'dirty',labels:[]};
  const github={rest:{
    pulls:{list:async()=>({data:[live]}),get:async()=>({data:live})},
    actions:{listWorkflowRunsForRepo:async()=>({data:{total_count:0}})},
    checks:{listForRef:async()=>{checked++;throw Error('dirty PR must bypass CI');}},
    issues:{addLabels:async()=>{labels++;}}
  },request:async()=>{dispatched++;throw Error('unexpected API call')}};
  const result=await run({github,core:core(),context,now:NOW,hasMergeToken:true});
  assert.equal(result.mergeConflicts,1);
  assert.equal(result.conflictLabelsQueued,1);
  assert.equal(result.missingCore,0);
  assert.equal(checked,0);
  assert.equal(labels,1);
  assert.equal(dispatched,0);
  assert.ok(result.apiRequests<=65);
});
test('unknown mergeability is not treated as missing Core CI',async()=>{
  let checks=0;
  const live={...pr(1538),state:'open',mergeable:null,mergeable_state:'unknown'};
  const github={rest:{
    pulls:{list:async()=>({data:[live]}),get:async()=>({data:live})},
    actions:{listWorkflowRunsForRepo:async()=>({data:{total_count:0}})},
    checks:{listForRef:async()=>{checks++;return {data:{}};}}
  },request:async()=>{throw Error('unexpected API call')}};
  const result=await run({github,core:core(),context,now:NOW,hasMergeToken:false});
  assert.equal(result.mergeStateUnknown,1);
  assert.equal(result.missingCore,0);
  assert.equal(checks,0);
});
test('behind branch is reported without spawning redundant CI jobs',async()=>{
  let checks=0;
  const live={...pr(1624),state:'open',mergeable:true,mergeable_state:'behind'};
  const github={rest:{
    pulls:{list:async()=>({data:[live]}),get:async()=>({data:live})},
    actions:{listWorkflowRunsForRepo:async()=>({data:{total_count:0}})},
    checks:{listForRef:async()=>{checks++;return {data:{}};}}
  },request:async()=>{throw Error('unexpected API call')}};
  const result=await run({github,core:core(),context,now:NOW,hasMergeToken:false});
  assert.equal(result.behindProduction,1);
  assert.equal(result.missingCore,0);
  assert.equal(checks,0);
});
test('already-labeled conflict is not written again',async()=>{
  let labels=0;
  const live={...pr(1469),state:'open',mergeable:false,mergeable_state:'dirty',
    labels:[{name:'hh:conflict-repair-needed'}]};
  const github={rest:{
    pulls:{list:async()=>({data:[live]}),get:async()=>({data:live})},
    actions:{listWorkflowRunsForRepo:async()=>({data:{total_count:0}})},
    issues:{addLabels:async()=>{labels++;}}
  },request:async()=>{throw Error('unexpected API call')}};
  const result=await run({github,core:core(),context,now:NOW,hasMergeToken:false});
  assert.equal(result.mergeConflicts,1);
  assert.equal(result.conflictLabelsQueued,0);
  assert.equal(labels,0);
});

test('legacy Core bootstrap merges production into a stale BEHIND PR with exact HEAD lease',async()=>{
  const candidate={...pr(1470),updated_at:new Date(NOW-5*60*60000).toISOString()};
  let updateCalls=0,commentCalls=0;
  const live={...candidate,state:'open',mergeable:true,mergeable_state:'behind'};
  const github={rest:{
    pulls:{get:async()=>({data:live})},
    issues:{listComments:async()=>({data:[]}),createComment:async()=>{commentCalls++;}}
  },paginate:async()=>[]};
  const repairGithub={request:async (route,args)=>{
    assert.equal(route.includes('/update-branch'),true);
    assert.equal(args.expected_head_sha,SHA);
    updateCalls++;
    return {status:202,data:{message:'Updating pull request branch'}};
  }};
  const ok=await bootstrapLegacyCore({github,repairGithub,owner:'andylitvinov-design',repo:'books',
    pr:candidate,all:[candidate],now:NOW,dryRun:false,log:()=>{},limited:async(n,fn)=>fn()});
  assert.equal(ok,true);
  assert.equal(updateCalls,1);
  assert.equal(commentCalls,1);
});
test('legacy bootstrap does not modify active, stacked or conflicted PRs',async()=>{
  const candidate={...pr(1470),state:'open',updated_at:new Date(NOW-6*60*60000).toISOString()};
  let writes=0;
  const live={...candidate,mergeable:true,mergeable_state:'behind'};
  const github={rest:{
    pulls:{get:async()=>({data:live})},
    issues:{listComments:async()=>({data:[]})}
  },paginate:async()=>[]};
  const repairGithub={request:async()=>{writes++;}};
  const args={github,repairGithub,owner:'andylitvinov-design',repo:'books',
    pr:candidate,all:[candidate],now:NOW,dryRun:false,log:()=>{},limited:async(n,fn)=>fn()};
  assert.equal(await bootstrapLegacyCore({...args,all:[candidate,{number:999,state:'open',base:{ref:candidate.head.ref}}]}),false);
  assert.equal(await bootstrapLegacyCore({...args,github:{...github,rest:{
    ...github.rest,pulls:{get:async()=>({data:{...live,mergeable_state:'dirty'}})}
  }}}),false);
  assert.equal(hasActiveLease([{body:JSON.stringify({schema:'HH_PR_SWEEP_LEASE_V1',head_sha:SHA,
    state:'active',expires_at:new Date(NOW+60000).toISOString()})}],SHA,NOW),true);
  assert.equal(hasActiveLease([{body:'HH_PR_SWEEP_LEASE_V1 {bad}'}],SHA,NOW),true);
  assert.equal(writes,0);
});
test('legacy bootstrap dry-run never mutates branches or comments',async()=>{
  const candidate={...pr(1600),updated_at:new Date(NOW-24*60*60000).toISOString()};
  let writes=0;
  const github={rest:{
    pulls:{get:async()=>({data:{...candidate,state:'open',mergeable:true,mergeable_state:'behind'}})},
    issues:{listComments:async()=>({data:[]}),createComment:async()=>{writes++;}}
  },paginate:async()=>[]};
  const repairGithub={request:async()=>{writes++;}};
  const ok=await bootstrapLegacyCore({github,repairGithub,owner:'andylitvinov-design',repo:'books',
    pr:candidate,all:[candidate],now:NOW,dryRun:true,log:()=>{},limited:async(n,fn)=>fn()});
  assert.equal(ok,true);
  assert.equal(writes,0);
});

test('scheduled coordinator repairs the missing-Core legacy category at bounded capacity',async()=>{
  const old={...pr(1801),state:'open',updated_at:new Date(NOW-9*60*60000).toISOString()};
  let updates=0,comments=0;
  const github={rest:{
    pulls:{list:async()=>({data:[old]}),get:async()=>({data:{...old,mergeable:true,mergeable_state:'behind'}})},
    checks:{listForRef:async()=>({data:{total_count:0,check_runs:[]}})},
    actions:{listWorkflowRunsForRepo:async ({status})=>({data:{total_count:status==='queued'?0:3}})},
    issues:{listComments:async()=>({data:[]}),createComment:async()=>{comments++;}}
  },paginate:async()=>[],request:async(route,args)=>{
    if(args?.workflow_id==='hh-pr-core-release.yml')return {data:{total_count:0,workflow_runs:[]}};
    return {data:{workflow_runs:[]}};
  }};
  const repairGithub={request:async()=>{updates++;return {status:202}}};
  const result=await run({github,repairGithub,hasMergeToken:true,core:core(),context,now:NOW});
  assert.equal(result.behindProduction,1);
  assert.equal(result.missingCore,0);
  assert.equal(result.legacyCoreProbes,1);
  assert.equal(result.legacyCoreBootstraps,1);
  assert.equal(updates,1);
  assert.equal(comments,1);
});
