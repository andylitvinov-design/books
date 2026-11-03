'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {selectCandidates, gateIsGreen, transientFailure, canRetryCi, canDispatchRepair, classifyMergeState, run, bootstrapLegacyCore, hasActiveLease} = require('../scripts/ci-pr-ten-minute-watchdog.cjs');
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
test('all P1 direction PRs receive fast inspection despite a large low-priority backlog',()=>{
  const prs=Array.from({length:179},(_,i)=>pr(i+1));
  const p0=Array.from({length:14},(_,i)=>i+20);
  for(const number of p0)prs[number-1].title='fix(video): renderer regression';
  const seen=new Set();
  for(let tick=0;tick<6;tick++){
    const picked=selectCandidates(prs,NOW+tick*600000);
    assert.ok(picked.length<=16);
    const high=picked.filter(p=>p.title?.includes('(video)'));
    assert.ok(high.length>=4,'P1 direction backlog must occupy all four fast slots');
    for(const p of high)seen.add(p.number);
  }
  assert.ok(p0.every(n=>seen.has(n)),'all P1 direction PRs must be inspected within six cycles');
});
test('exact Core completion wake does not evict the top P1 direction while preserving fairness',()=>{
  const prs=Array.from({length:179},(_,i)=>pr(i+1));
  prs[69].title='fix(video): customer Create is broken';
  const picked=selectCandidates(prs,NOW,12,4,159);
  assert.equal(picked[0].number,159);
  assert.equal(picked[1].number,70);
  assert.ok(picked.length<=16);
});
test('only trusted green exact-SHA gate can schedule guarded merging',()=>{
  const gate={total_count:1,check_runs:[{id:1,name:'hh-core-verified',status:'completed',conclusion:'success',app:{id:15368}}]};
  assert.equal(gateIsGreen(gate),true);
  assert.equal(gateIsGreen({...gate,check_runs:[{...gate.check_runs[0],app:{id:9}}]}),false);
  assert.equal(gateIsGreen({...gate,total_count:101}),false);
  assert.equal(gateIsGreen({...gate,total_count:2,check_runs:[...gate.check_runs,
    {id:2,name:'release-ready',status:'completed',conclusion:'failure'}]}),true,
    'obsolete optional release-ready does not invalidate verified Core');
  assert.equal(gateIsGreen({...gate,total_count:2,check_runs:[...gate.check_runs,{id:2,name:'browser',conclusion:'failure'}]}),false);
});
test('CI admission uses separate running and queued limits, not their sum',()=>{
  assert.equal(canRetryCi(12,12),true);
  assert.equal(canRetryCi(18,40),false);
  assert.equal(canRetryCi(20,0),false);
  assert.equal(canRetryCi(0,20),false);
  assert.equal(canRetryCi(Infinity,0),false);
});
test('Repair has an independently bounded lane when queued Core CI is saturated',()=>{
  assert.equal(canRetryCi(16,43),false);
  assert.equal(canDispatchRepair(16,43),true);
  assert.equal(canDispatchRepair(17,79),true);
  assert.equal(canDispatchRepair(18,1),false);
  assert.equal(canDispatchRepair(0,80),false);
  assert.equal(canDispatchRepair(Infinity,0),false);
  assert.equal(canDispatchRepair(3,NaN),false);
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
    checks:{listForRef:async(arg)=>{
      if(arg.check_name==='release-ready') return {data:{total_count:1,check_runs:[
        {id:2,name:'release-ready',status:'completed',conclusion:'success',app:{id:15368}}
      ]}};
      targeted=arg.check_name==='hh-core-verified';
      return {data:{total_count:1,check_runs:[
        {id:1,name:'hh-core-verified',status:'completed',conclusion:'success',app:{id:15368}}
      ]}};
    }},
    repos:{getBranch:async()=>({data:{protected:true,protection:{
      required_status_checks:{contexts:['release-ready']}
    }}})}
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
    checks:{listForRef:async()=>({data:{total_count:1,check_runs:[{id:1,name:'hh-core-verified',conclusion:'failure'}]}})},
    repos:{getCommit:async()=>({data:{parents:[{sha:'a'.repeat(40)},{sha:SHA}]}})},
    issues:{listComments:async()=>({data:[]}),createComment:async()=>{comments++;},addLabels:async()=>{labels++;}}
  },paginate:async()=>[],request:async(route,args)=>{
    if(route.includes('rerun-failed-jobs'))reruns++;
    if(args?.workflow_id==='hh-pr-core-release.yml')return {data:{total_count:1,workflow_runs:[{
      id:44,name:'HH PR core release gate',event:'pull_request',head_sha:'c'.repeat(40),head_branch:'test-98',
      pull_requests:[{number:98,head:{sha:SHA,ref:'test-98'}}],
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
  },request:async(route)=>{
    if(route.includes('/runs'))return {data:{workflow_runs:[]}};
    if(route.includes('/dispatches')){dispatched++;return {data:{}};}
    throw Error('unexpected API route '+route);
  }};
  const result=await run({github,core:core(),context,now:NOW,hasMergeToken:true});
  assert.equal(result.mergeConflicts,1);
  assert.equal(result.conflictLabelsQueued,1);
  assert.equal(result.missingCore,0);
  assert.equal(checked,0);
  assert.equal(labels,1);
  assert.equal(dispatched,1);
  assert.equal(result.repairWorkerDispatched,1);
  assert.ok(result.apiRequests<=65);
});
test('Watchdog dispatches one Repair Worker despite a crowded regular CI queue',async()=>{
  let dispatched=0;
  const live={...pr(1992),state:'open',mergeable:false,
    mergeable_state:'dirty',labels:[{name:'hh:conflict-repair-needed'}]};
  const github={rest:{
    pulls:{list:async()=>({data:[live]}),get:async()=>({data:live})},
    actions:{listWorkflowRunsForRepo:async({status})=>
      ({data:{total_count:status==='queued'?43:16}})}
  },request:async(route,args)=>{
    if(route.includes('/dispatches')){
      assert.equal(args.workflow_id,'hh-pr-repair-worker.yml');
      assert.equal(args.inputs.dry_run,'false');
      dispatched++;
    }
    return {data:{workflow_runs:[]}};
  }};
  const result=await run({github,core:core(),context,now:NOW,hasMergeToken:true});
  assert.equal(result.blockedByCapacity,true);
  assert.equal(result.repairBlockedByCapacity,false);
  assert.equal(result.repairQueueBacklog,1);
  assert.equal(result.repairWorkerDispatched,1);
  assert.equal(dispatched,1);
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


test('synthetic pull_request merge SHA is associated with real exact PR HEAD',()=>{
  const {coreRunForCurrentPR}=require('../scripts/ci-pr-ten-minute-watchdog.cjs');
  const current=pr(77);
  const workflowRun={
    name:'HH PR core release gate',event:'pull_request',
    head_sha:'c'.repeat(40),head_branch:'test-77',
    pull_requests:[{number:77,head:{sha:SHA,ref:'test-77'}}]
  };
  assert.equal(coreRunForCurrentPR(workflowRun,current),true);
  assert.equal(workflowRun.head_sha===current.head.sha,false);
});
test('stale or mismatched PR association cannot authorize CI repair',()=>{
  const {coreRunForCurrentPR}=require('../scripts/ci-pr-ten-minute-watchdog.cjs');
  const current=pr(77);
  const baseRun={name:'HH PR core release gate',event:'pull_request',
    head_sha:'c'.repeat(40),head_branch:'test-77'};
  assert.equal(coreRunForCurrentPR({...baseRun,pull_requests:[{number:77,
    head:{sha:'f'.repeat(40),ref:'test-77'}}]},current),false);
  assert.equal(coreRunForCurrentPR({...baseRun,pull_requests:[{number:78,
    head:{sha:SHA,ref:'test-77'}}]},current),false);
  assert.equal(coreRunForCurrentPR({...baseRun,pull_requests:[]},current),false);
});

test('legacy Core bootstrap merges production into a stale BEHIND PR with exact HEAD lease',async()=>{
  const candidate={...pr(1470),updated_at:new Date(NOW-5*60*60000).toISOString()};
  let updateCalls=0,commentCalls=0;
  const live={...candidate,state:'open',mergeable:true,mergeable_state:'behind'};
  const github={rest:{
    pulls:{get:async()=>({data:live})},
    issues:{listComments:async()=>({data:[]}),createComment:async()=>{commentCalls++;}}
  },paginate:async()=>[],request:async()=>({data:{total_count:0,workflow_runs:[]}})};
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
  assert.equal(hasActiveLease([{body:'<!-- HH_PR_SWEEP_LEASE_V1 -->\n'+JSON.stringify({schema:'HH_PR_SWEEP_LEASE_V1',head_sha:SHA,
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
  },paginate:async()=>[],request:async()=>({data:{total_count:0,workflow_runs:[]}})};
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


test('obsolete release-ready recovery is absent while interrupted-core recovery remains fail closed', () => {
  const {readFileSync} = require('node:fs');
  const source=readFileSync('.github/workflows/hh-native-auto-merge.yml','utf8');
  assert.doesNotMatch(source,/^  recover-missing-required-ci:/m);
  assert.match(source,/^  recover-interrupted-core:/m);
  assert.match(source,/^  workflow_run:/m);
  assert.match(source,/^      - 'HH PR core release gate'$/m);
  assert.ok(source.includes('github.rest.actions.reRunWorkflow'));
  assert.ok(source.includes('fresh.run_attempt !== 1'));
  assert.ok(source.includes('event.head_repository?.full_name !== fullRepo'));
  assert.ok(source.includes('github-token: ${{ github.token }}'));
  assert.doesNotMatch(source,/--admin|--force|bypass_rulesets|continue-on-error:/);
});

test('synthetic CI merge SHA is valid only if its commit has current PR HEAD parent',async()=>{
  const {verifyCoreRunOnExactHead}=require('../scripts/ci-pr-ten-minute-watchdog.cjs');
  const candidate=pr(333),run={name:'HH PR core release gate',event:'pull_request',
    head_sha:'c'.repeat(40),head_branch:candidate.head.ref,
    pull_requests:[{number:candidate.number,head:{sha:SHA,ref:candidate.head.ref}}]};
  let requests=0;
  const oldGithub={rest:{repos:{getCommit:async()=>{requests++;return {data:{
    parents:[{sha:'a'.repeat(40)},{sha:'f'.repeat(40)}]}};}}}};
  const limited=async(_,fn)=>fn();
  assert.equal(await verifyCoreRunOnExactHead({github:oldGithub,owner:'andylitvinov-design',
    repo:'books',pr:candidate,run,limited}),false);
  assert.equal(requests,1);
  const newGithub={rest:{repos:{getCommit:async()=>({data:{
    parents:[{sha:'a'.repeat(40)},{sha:SHA}]}})}}};
  assert.equal(await verifyCoreRunOnExactHead({github:newGithub,owner:'andylitvinov-design',
    repo:'books',pr:candidate,run,limited}),true);
  const wrongOrder={rest:{repos:{getCommit:async()=>({data:{
    parents:[{sha:SHA},{sha:'a'.repeat(40)}]}})}}};
  assert.equal(await verifyCoreRunOnExactHead({github:wrongOrder,owner:'andylitvinov-design',
    repo:'books',pr:candidate,run,limited}),false,
    'current source HEAD cannot be the first synthetic merge parent');
  const extraParent={rest:{repos:{getCommit:async()=>({data:{
    parents:[{sha:'a'.repeat(40)},{sha:SHA},{sha:'d'.repeat(40)}]}})}}};
  assert.equal(await verifyCoreRunOnExactHead({github:extraParent,owner:'andylitvinov-design',
    repo:'books',pr:candidate,run,limited}),false,
    'synthetic merge must have exactly two ordered parents');
  assert.equal(await verifyCoreRunOnExactHead({github:{},owner:'andylitvinov-design',
    repo:'books',pr:candidate,run:{...run,head_sha:SHA},limited}),true);
});
test('legacy bootstrap refuses to update a branch that has Core history',async()=>{
  const candidate={...pr(1470),updated_at:new Date(NOW-6*60*60000).toISOString()},
    live={...candidate,state:'open',mergeable:true,mergeable_state:'behind'};
  let writes=0;
  const github={rest:{
    pulls:{get:async()=>({data:live})},
    issues:{listComments:async()=>({data:[]}),createComment:async()=>{writes++;}}
  },request:async()=>({data:{total_count:1,workflow_runs:[{
    name:'HH PR core release gate',event:'pull_request',head_branch:candidate.head.ref
  }]}})};
  const repairGithub={request:async()=>{writes++;return {status:202}}};
  assert.equal(await bootstrapLegacyCore({github,repairGithub,owner:'andylitvinov-design',
    repo:'books',pr:candidate,all:[candidate],now:NOW,dryRun:false,log:()=>{},
    limited:async(_,fn)=>fn()}),false);
  assert.equal(writes,0);
});
test('legacy bootstrap refuses a second update after a prior HEAD receipt',async()=>{
  const candidate={...pr(1470),updated_at:new Date(NOW-8*60*60000).toISOString()},
    live={...candidate,state:'open',mergeable:true,mergeable_state:'behind'};
  let writes=0,historyQueries=0;
  const github={rest:{
    pulls:{get:async()=>({data:live})},
    issues:{listComments:async()=>({data:[{
      body:'<!-- HH_PR_10MIN_LEGACY_CORE_BOOTSTRAP_V1 ' + 'a'.repeat(40) + ' -->'
    }]})}
  },request:async()=>{historyQueries++;return {data:{total_count:0,workflow_runs:[]}}}};
  const repairGithub={request:async()=>{writes++;return {status:202}}};
  assert.equal(await bootstrapLegacyCore({github,repairGithub,owner:'andylitvinov-design',
    repo:'books',pr:candidate,all:[candidate],now:NOW,dryRun:false,log:()=>{},
    limited:async(_,fn)=>fn()}),false);
  assert.equal(historyQueries,0);
  assert.equal(writes,0);
});
test('incomplete Core history fails closed before updating branch',async()=>{
  const candidate={...pr(1470),updated_at:new Date(NOW-8*60*60000).toISOString()},
    live={...candidate,state:'open',mergeable:true,mergeable_state:'behind'};
  let writes=0;
  const github={rest:{
    pulls:{get:async()=>({data:live})},
    issues:{listComments:async()=>({data:[]})}
  },request:async()=>({data:{total_count:123,workflow_runs:[]}})};
  const repairGithub={request:async()=>{writes++;return {status:202}}};
  assert.equal(await bootstrapLegacyCore({github,repairGithub,owner:'andylitvinov-design',
    repo:'books',pr:candidate,all:[candidate],now:NOW,dryRun:false,log:()=>{},
    limited:async(_,fn)=>fn()}),false);
  assert.equal(writes,0);
});

test('API rate reserve discovered mid-pagination safely skips all mutations',async()=>{
  const many=Array.from({length:100},(_,i)=>pr(i+1));
  let ciCalls=0,writes=0;
  const github={rest:{
    pulls:{list:async({page})=>{
      if(page>1)throw Error('must stop before second page');
      return {headers:{'x-ratelimit-remaining':'72'},data:many};
    }},
    actions:{listWorkflowRunsForRepo:async()=>{ciCalls++;throw Error('unwanted capacity call');}},
    issues:{createComment:async()=>{writes++;}}
  },request:async()=>{writes++;}};
  const result=await run({github,core:core(),context,now:NOW,hasMergeToken:true});
  assert.equal(result.inventoryComplete,false);
  assert.equal(result.reason,'GITHUB_RATE_RESERVE');
  assert.equal(result.apiRequests,1);
  assert.equal(result.ciRetries,0);
  assert.equal(result.branchUpdates,0);
  assert.equal(result.mergeDispatches,0);
  assert.equal(ciCalls,0);
  assert.equal(writes,0);
});
test('frequent GitHub reads use isolated native GITHUB_TOKEN',()=>{
  const {readFileSync}=require('node:fs');
  const wf=readFileSync('.github/workflows/hh-pr-ten-minute-watchdog.yml','utf8');
  assert.match(wf,/github-token: \x24\x7b\x7b github\.token \x7d\x7d/);
  assert.match(wf,/HH_AUTOMERGE_TOKEN: \x24\x7b\x7b secrets\.HH_AUTOMERGE_TOKEN \x7d\x7d/);
  assert.match(wf,/Authorization:'Bearer '\+token/);
  assert.doesNotMatch(wf,/github-token: \x24\x7b\x7b secrets\.HH_AUTOMERGE_TOKEN \|\| github\.token/);
});

test('hourly full-inventory reads use per-repo token; owner PAT is reserved for protected merges', () => {
  const {readFileSync} = require('node:fs');
  const {join} = require('node:path');
  const source = readFileSync(join(__dirname,'..','.github','workflows','hh-pr-full-inventory.yml'),'utf8');
  assert.match(source,/^  pull-requests: read$/m);
  assert.ok(source.includes('          github-token: ${{ github.token }}'));
  assert.ok(source.includes('          GH_TOKEN: ${{ secrets.HH_AUTOMERGE_TOKEN || github.token }}'));
  assert.ok(!source.includes('github-token: ${{ secrets.HH_AUTOMERGE_TOKEN'));
  assert.ok(source.includes('if(token&&!apiPaused)'), 'quota pause rejects new merge requests');
  assert.ok(source.includes('selectDeepScan(pending,Date.now())'), 'hourly deep inspection is bounded');
});

test('one GraphQL batch replaces sixteen per-PR REST mergeability reads',async()=>{
  const all=Array.from({length:16},(_,i)=>pr(i+1));
  const live=Object.fromEntries(all.map(p=>['p'+p.number,{
    number:p.number,state:'OPEN',isDraft:false,mergeable:'UNKNOWN',
    mergeStateStatus:'UNKNOWN',baseRefName:'codex/public-book-library',
    headRefName:p.head.ref,headRefOid:p.head.sha,
    headRepository:{nameWithOwner:'andylitvinov-design/books'},autoMergeRequest:null
  }]));
  let gqlCalls=0,restCalls=0,deepChecks=0;
  const github={
    graphql:async(query,variables)=>{
      gqlCalls++;
      assert.equal(variables.repo,'books');
      assert.ok(query.includes('p16:pullRequest(number:16)'));
      return {repository:live,rateLimit:{remaining:900}};
    },
    rest:{
      pulls:{list:async()=>({data:all}),get:async()=>{restCalls++;throw Error('unnecessary REST request');}},
      actions:{listWorkflowRunsForRepo:async()=>({data:{total_count:0}})},
      checks:{listForRef:async()=>{deepChecks++;throw Error('unknown state must skip checks');}}
    }
  };
  const result=await run({github,core:core(),context,now:NOW,dryRun:true});
  assert.equal(gqlCalls,1);
  assert.equal(restCalls,0);
  assert.equal(deepChecks,0);
  assert.equal(result.inspected,16);
  assert.equal(result.mergeStateUnknown,16);
  assert.equal(result.liveBatchUsed,true);
  assert.equal(result.graphqlRemaining,900);
  assert.equal(result.apiRequests,4); // one inventory, two capacity, one GraphQL batch
});

test('stale GraphQL HEAD is never accepted for CI checks, labels or merge dispatch',async()=>{
  let checks=0,labels=0,dispatches=0;
  const p=pr(44);
  const github={
    graphql:async()=>({repository:{p44:{
      number:44,state:'OPEN',isDraft:false,mergeable:'CONFLICTING',
      mergeStateStatus:'DIRTY',baseRefName:'codex/public-book-library',
      headRefName:p.head.ref,headRefOid:'a'.repeat(40),
      headRepository:{nameWithOwner:'andylitvinov-design/books'},autoMergeRequest:null
    }},rateLimit:{remaining:900}}),
    rest:{
      pulls:{list:async()=>({data:[p]})},
      actions:{listWorkflowRunsForRepo:async()=>({data:{total_count:0}})},
      checks:{listForRef:async()=>{checks++;}},
      issues:{addLabels:async()=>{labels++;}}
    },
    request:async()=>{dispatches++;}
  };
  const result=await run({github,core:core(),context,now:NOW,hasMergeToken:true});
  assert.equal(result.staleHead,1);
  assert.equal(result.mergeConflicts,0);
  assert.equal(checks,0);
  assert.equal(labels,0);
  assert.equal(dispatches,0);
});

test('low GraphQL quota safely skips deep inspection and all mutations',async()=>{
  let checks=0;
  const p=pr(45);
  const github={
    graphql:async()=>({repository:{p45:{
      number:45,state:'OPEN',isDraft:false,mergeable:'MERGEABLE',
      mergeStateStatus:'CLEAN',baseRefName:'codex/public-book-library',
      headRefName:p.head.ref,headRefOid:p.head.sha,
      headRepository:{nameWithOwner:'andylitvinov-design/books'},autoMergeRequest:null
    }},rateLimit:{remaining:70}}),
    rest:{
      pulls:{list:async()=>({data:[p]})},
      actions:{listWorkflowRunsForRepo:async()=>({data:{total_count:0}})},
      checks:{listForRef:async()=>{checks++;throw Error('should skip');}}
    }
  };
  const result=await run({github,core:core(),context,now:NOW});
  assert.equal(result.apiRateLimited,true);
  assert.equal(result.apiBudgetReason,'GRAPHQL_RATE_RESERVE');
  assert.equal(result.inspected,0);
  assert.equal(checks,0);
});

test('GraphQL outage falls back to no more than six rotating REST snapshots',async()=>{
  const all=Array.from({length:180},(_,i)=>pr(i+1));
  let restGets=0;
  const github={
    graphql:async()=>{throw Error('temporary GraphQL unavailable');},
    rest:{
      pulls:{
        list:async({page})=>({data:all.slice((page-1)*100,page*100)}),
        get:async({pull_number})=>{restGets++;return {data:{...pr(pull_number),
          state:'open',mergeable:null,mergeable_state:'unknown'}};}
      },
      actions:{listWorkflowRunsForRepo:async()=>({data:{total_count:0}})}
    }
  };
  const result=await run({github,core:core(),context,now:NOW,dryRun:true});
  assert.equal(result.open,180);
  assert.equal(result.liveBatchUsed,false);
  assert.equal(result.liveRestLookups,6);
  assert.equal(restGets,6);
  assert.equal(result.inspected,6);
});

test('one-time admin migration proves merged single gate and preserves BOTH protected controls',()=>{
  const {readFileSync}=require('node:fs');
  const source=readFileSync('.github/workflows/hh-migrate-legacy-core-check.yml','utf8');
  assert.ok(source.includes('  workflow_dispatch:'));
  assert.ok(!source.includes('  push:'));
  assert.ok(!source.includes('  schedule:'));
  assert.ok(source.includes('GH_TOKEN: ' + '$' + '{{ secrets.HH_BRANCH_ADMIN_TOKEN }}'));
  assert.ok(!source.includes('secrets.HH_AUTOMERGE_TOKEN'));
  assert.ok(source.includes('set -euo pipefail'));
  assert.ok(source.includes('HH_BRANCH_ADMIN_TOKEN missing. No branch rule changed.'));
  assert.ok(source.includes("EVIDENCE_PR: " + '$' + "{{ inputs.evidence_pr_number }}"));
  assert.ok(source.includes('repos/$GH_REPO/pulls/$EVIDENCE_PR'));
  assert.ok(source.includes('.merged == true'));
  assert.ok(source.includes('head_sha=$head'));
  assert.ok(source.includes('total_count == (.jobs | length)'));
  for(const gate of ['hh-core-verified','hh-specialist','release-ready','hh-merge-check'])
    assert.ok(source.includes('"'+gate+'"'),gate);
  assert.ok(source.includes('Exact run lacks Core, Specialist, legacy or new verified PASS jobs.'));
  const beforeRules=source.indexOf('gh api "repos/$GH_REPO/rulesets/26269892" > "$temp/rules.json"');
  const putRules=source.indexOf('gh api --method PUT "repos/$GH_REPO/rulesets/26269892"');
  const afterRules=source.indexOf('gh api "repos/$GH_REPO/rulesets/26269892" > "$temp/rules-after.json"');
  const beforeClassic=source.indexOf('gh api "repos/$GH_REPO/branches/codex%2Fpublic-book-library/protection/required_status_checks" > "$temp/classic.json"');
  const patchClassic=source.indexOf('gh api --method PATCH ');
  const afterClassic=source.indexOf('gh api "repos/$GH_REPO/branches/codex%2Fpublic-book-library/protection/required_status_checks" > "$temp/classic-after.json"');
  assert.ok(beforeRules>=0&&beforeRules<putRules&&putRules<afterRules);
  assert.ok(beforeClassic>=0&&beforeClassic<patchClassic&&patchClassic<afterClassic);
  assert.equal((source.match(/^          gh api --method PUT /gm)||[]).length,1);
  assert.equal((source.match(/^          gh api --method PATCH /gm)||[]).length,1);
  assert.ok(source.includes('.enforcement == "active"'));
  assert.ok(source.includes('required_review_thread_resolution == true'));
  assert.ok(source.includes('non_fast_forward'));
  assert.ok(source.includes('deletion'));
  assert.ok(source.includes('Already migrated, both protections verified.'));
  assert.ok(source.includes('["hh-merge-check"]'));
  assert.ok(source.includes('MIGRATED: only hh-merge-check required'));
  assert.ok(!source.includes('base64 --decode | grep -q '));
  assert.ok(!source.includes('gh api --method DELETE '));
});

test('event-driven merge supports legacy, bridge and only approved single required check',()=>{
  const {readFileSync}=require('node:fs');
  const native=readFileSync('.github/workflows/hh-native-auto-merge.yml','utf8');
  const hourly=readFileSync('.github/workflows/hh-pr-full-inventory.yml','utf8');
  assert.ok(native.includes('const allowedRequiredSets = new Map(['));
  assert.ok(native.includes('["release-ready", ["hh-core-verified", "hh-specialist", "release-ready"]]'));
  assert.ok(native.includes('["hh-merge-check", ["hh-merge-check"]]'));
  assert.ok(native.includes('["hh-merge-check,release-ready", ["hh-merge-check", "release-ready"]]'));
  assert.ok(native.includes('const notPassed = need.filter(name => !passed(name))'));
  assert.ok(native.includes('jobPage.total_count !== jobs.length'));
  assert.ok(hourly.includes('const legacyReleaseMandatory=legacy.includes("release-ready")'));
  assert.ok(hourly.includes('LEGACY_REQUIRED_RELEASE_NOT_GREEN'));
  assert.ok(hourly.includes('CORE_NOT_VERIFIED'));
});

test('previously armed green PR remains native-only without direct merge fallback',()=>{
  const native=require('node:fs').readFileSync('.github/workflows/hh-native-auto-merge.yml','utf8');
  const begin=native.indexOf('if [[ "$current_method" == "$HH_EXPECTED_MERGE_METHOD" ]]; then');
  const end=native.indexOf('if [[ "$current_method" != NONE ]]; then',begin);
  assert.ok(begin>=0&&end>begin,'expected already-armed native merge branch');
  const branch=native.slice(begin,end);
  assert.ok(branch.includes('already armed; never issue direct merge'));
  assert.ok(!branch.includes('gh pr merge'));
  assert.ok(!branch.includes('--admin'));
});

test('watchdog directly dispatches one free CI worker for a truly missing Core run',async()=>{
  const candidate=pr(401);
  let queued=0,dispatched=0;
  const github={
    graphql:async()=>({repository:{p401:{
      number:401,state:'OPEN',isDraft:false,mergeable:'MERGEABLE',
      mergeStateStatus:'CLEAN',baseRefName:'codex/public-book-library',
      headRefName:candidate.head.ref,headRefOid:candidate.head.sha,
      headRepository:{nameWithOwner:'andylitvinov-design/books'},
      autoMergeRequest:null
    }},rateLimit:{remaining:4000}}),
    rest:{
      pulls:{list:async()=>({data:[candidate]})},
      actions:{listWorkflowRunsForRepo:async()=>({data:{total_count:0}})},
      checks:{listForRef:async()=>({data:{total_count:0,check_runs:[]}})},
      issues:{addLabels:async()=>{queued++;return {data:[]}}}
    },
    request:async(route,args)=>{
      if(route.includes('dispatches')){
        assert.equal(args.workflow_id,'hh-pr-ci-worker.yml');
        assert.equal(args.inputs.dry_run,'false');
        dispatched++;
        return {data:{}};
      }
      if(args.workflow_id==='hh-pr-core-release.yml')return {data:{total_count:0,workflow_runs:[]}};
      return {data:{workflow_runs:[]}};
    }
  };
  // Only a configured owner token can create genuine PR synchronize CI.
  const r=await run({github,core:core(),context,now:NOW,hasMergeToken:true});
  assert.equal(r.missingCore,1);
  assert.equal(r.ciBootstrapQueued,1);
  assert.equal(r.ciWorkerDispatched,1);
  assert.equal(queued,1);
  assert.equal(dispatched,1);
});
test('watchdog respects existing CI queue label and never repeats dispatch',async()=>{
  const candidate={...pr(402),labels:[{name:'hh:ci-needed'}]};
  const github={
    graphql:async()=>({repository:{p402:{
      number:402,state:'OPEN',isDraft:false,mergeable:'MERGEABLE',
      mergeStateStatus:'CLEAN',baseRefName:'codex/public-book-library',
      headRefName:candidate.head.ref,headRefOid:candidate.head.sha,
      headRepository:{nameWithOwner:'andylitvinov-design/books'},
      autoMergeRequest:null
    }},rateLimit:{remaining:4000}}),
    rest:{
      pulls:{list:async()=>({data:[candidate]})},
      actions:{listWorkflowRunsForRepo:async()=>({data:{total_count:0}})},
      checks:{listForRef:async()=>({data:{total_count:0,check_runs:[]}})}
    },
    request:async(route,args)=>{
      if(route.includes('dispatches'))throw Error('duplicate CI dispatch forbidden');
      if(args.workflow_id==='hh-pr-core-release.yml')return {data:{total_count:0,workflow_runs:[]}};
      return {data:{workflow_runs:[]}};
    }
  };
  const r=await run({github,core:core(),context,now:NOW});
  assert.equal(r.missingCore,1);
  assert.equal(r.ciBootstrapQueued,0);
  assert.equal(r.ciWorkerDispatched,0);
});
test('stale historical Core runs do not enter one-shot CI worker queue',async()=>{
  const candidate=pr(403);
  const github={
    graphql:async()=>({repository:{p403:{
      number:403,state:'OPEN',isDraft:false,mergeable:'MERGEABLE',
      mergeStateStatus:'CLEAN',baseRefName:'codex/public-book-library',
      headRefName:candidate.head.ref,headRefOid:candidate.head.sha,
      headRepository:{nameWithOwner:'andylitvinov-design/books'},
      autoMergeRequest:null
    }},rateLimit:{remaining:4000}}),
    rest:{
      pulls:{list:async()=>({data:[candidate]})},
      actions:{listWorkflowRunsForRepo:async()=>({data:{total_count:0}})},
      checks:{listForRef:async()=>({data:{total_count:0,check_runs:[]}})}
    },
    request:async(route,args)=>{
      if(route.includes('dispatches'))throw Error('unjustified CI dispatch forbidden');
      if(args.workflow_id==='hh-pr-core-release.yml')return {data:{total_count:1,workflow_runs:[{
        id:1,name:'HH PR core release gate',event:'pull_request',
        head_branch:candidate.head.ref,
        pull_requests:[{number:candidate.number,head:{sha:'c'.repeat(40),ref:candidate.head.ref}}]
      }]}};
      return {data:{workflow_runs:[]}};
    }
  };
  const r=await run({github,core:core(),context,now:NOW});
  assert.equal(r.missingCore,1);
  assert.equal(r.ciBootstrapQueued,0);
});

// Core events must enumerate ONLY the trusted required Core workflow;
// older same-HEAD Core runs remain paginated, unrelated PR CI is not a gate.
test('native AutoMerge paginates trusted Core history and preserves exact-head evidence',async()=>{
  const {readFileSync}=require('node:fs');
  const native=readFileSync('.github/workflows/hh-native-auto-merge.yml','utf8');
  const begin=native.indexOf('          script: |\n',native.indexOf('  enable:\n'));
  const end=native.indexOf('      - name: Verify same-run unified gate and current sensitive production base',begin);
  assert.ok(begin>0&&end>begin,'missing trusted preflight');
  const code=native.slice(begin+'          script: |\n'.length,end).split('\n')
    .map(line=>line.startsWith('            ')?line.slice(12):line).join('\n');
  const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
  const preflight=new AsyncFunction('github','core','context',code);
  const full='andylitvinov-design/books', head='a'.repeat(40), base='b'.repeat(40);
  const pr={number:42,state:'open',draft:false,mergeable:true,mergeable_state:'clean',
    base:{ref:'codex/public-book-library',sha:base},
    head:{sha:head,ref:'feature/forty-two',repo:{full_name:full}}};
  const makeRun=(id,conclusion='success',associatedHead=head,associatedBase=base)=>({
    id,name:'HH PR core release gate',workflow_id:1,event:'pull_request',head_branch:pr.head.ref,
    head_sha:'f'.repeat(40),path:'.github/workflows/hh-pr-core-release.yml@refs/pull/42/merge',
    status:'completed',conclusion,created_at:new Date(1800000000000-id*1000).toISOString(),
    pull_requests:[{number:42,head:{ref:pr.head.ref,sha:associatedHead},
      base:{ref:pr.base.ref,sha:associatedBase}}]
  });
  const coreRun=makeRun(1);
  const current=[coreRun,...Array.from({length:99},(_,i)=>makeRun(i+2))];
  const prior=makeRun(200,'success','c'.repeat(40));
  async function decide(pages,totals,{required=['release-ready'],jobs=[
    {name:'hh-core-verified',status:'completed',conclusion:'success'},
    {name:'hh-specialist',status:'completed',conclusion:'success'},
    {name:'release-ready',status:'completed',conclusion:'success'},
  ],eventRunId=null}={}) {
    const calls=[],outputs={},notes=[];
    const gh={rest:{
      pulls:{get:async()=>({data:pr}),list:async()=>({data:[pr]})},
      actions:{
        listWorkflowRuns:async args=>{
          calls.push(args);
          const index=args.page-1;
          return {data:{total_count:totals[index]??totals[0],
            workflow_runs:pages[index]??[]}};
        },
        listJobsForWorkflowRun:async()=>({data:{total_count:jobs.length,jobs}}),
      },
      repos:{getBranch:async()=>({data:{protected:true,protection:{
        required_status_checks:{contexts:required}}}})},
    }};
    const payload=eventRunId===null?{pull_request:pr}:{workflow_run:{
      id:eventRunId,name:'HH PR core release gate',event:'pull_request',conclusion:'success',
      repository:{full_name:full},head_repository:{full_name:full},
      head_branch:pr.head.ref,pull_requests:[{number:42,base:{ref:pr.base.ref}}]
    }};
    const context={repo:{owner:'andylitvinov-design',repo:'books'},
      eventName:eventRunId===null?'pull_request_target':'workflow_run',payload};
    await preflight(gh,{info:message=>notes.push(message),
      setOutput:(key,value)=>outputs[key]=value},context);
    return {ok:outputs.eligible==='true',calls,notes};
  }
  const valid=await decide([current,[prior]],[101,101]);
  assert.equal(valid.ok,true,'second page must complete current Core HEAD evidence');
  assert.deepEqual(valid.calls.map(c=>c.page),[1,2]);
  assert.ok(valid.calls.every(c=>c.workflow_id==='hh-pr-core-release.yml'),
    'never scan optional non-Core PR workflow runs');
  const event=await decide([current,[prior]],[101,101],{eventRunId:coreRun.id});
  assert.equal(event.ok,true,'completed current-HEAD Core event may activate native merge');
  const stale=await decide([current,[prior]],[101,101],{eventRunId:999});
  assert.equal(stale.ok,false,'stale completed Core callbacks cannot arm');
  const movedBase=await decide([[makeRun(1,'success',head,'d'.repeat(40)),...current.slice(1)],[prior]],[101,101]);
  assert.equal(movedBase.ok,true,'non-sensitive base changes defer to independent freshness classifier');
  const noSpecialist=await decide([current,[prior]],[101,101],{jobs:[
    {name:'hh-core-verified',status:'completed',conclusion:'success'},
    {name:'release-ready',status:'completed',conclusion:'success'},
  ]});
  assert.equal(noSpecialist.ok,false,'missing required Specialist never qualifies');
  const single=await decide([current,[prior]],[101,101],{
    required:['hh-merge-check'],
    jobs:[{name:'hh-merge-check',status:'completed',conclusion:'success'}],
  });
  assert.equal(single.ok,true,'single branch-required status still needs real job PASS');
  const redSingle=await decide([current,[prior]],[101,101],{
    required:['hh-merge-check'],
    jobs:[{name:'hh-merge-check',status:'completed',conclusion:'failure'}],
  });
  assert.equal(redSingle.ok,false,'red unified status never arms native merge');
  const newerRed=await decide([[makeRun(0,'failure'),...current.slice(0,99)],[prior]],[101,101]);
  assert.equal(newerRed.ok,false,'newer failed Core blocks an older green Core');
  const incomplete=await decide([current,[]],[102,102]);
  assert.equal(incomplete.ok,false,'incomplete Core pages cannot be considered green');
  const tooMany=await decide([current,current,current],[401,401,401]);
  assert.equal(tooMany.ok,false,'more than 300 same-HEAD Core runs fails closed');
  assert.deepEqual(tooMany.calls.map(c=>c.page),[1,2,3]);
  assert.ok(tooMany.notes.some(line=>line.includes('beyond bounded CI pages')));
});

test('watchdog honors legacy required status and stops spurious dispatch',async()=>{
  async function probe(contexts,legacyConclusion){
    let dispatches=0,legacyReads=0;
    const github={rest:{
      pulls:{list:async()=>({data:[pr(137)]}),get:async()=>({data:{
        ...pr(137),state:'open',mergeable:true,mergeable_state:'clean'
      }})},
      actions:{listWorkflowRunsForRepo:async()=>({data:{total_count:0}})},
      repos:{getBranch:async()=>({data:{protected:true,protection:{
        required_status_checks:{contexts}
      }}})},
      checks:{listForRef:async(args)=>{
        const legacy=args.check_name==='release-ready';
        if(legacy) legacyReads++;
        return {data:{total_count:1,check_runs:[{
          id:legacy?2:1,name:legacy?'release-ready':'hh-core-verified',
          status:'completed',conclusion:legacy?legacyConclusion:'success',app:{id:15368}
        }]}};
      }}
    },request:async(route)=>{
      if(route.includes('dispatches')) dispatches++;
      return {data:{workflow_runs:[]}};
    }};
    const result=await run({github,core:core(),context,now:NOW,hasMergeToken:true});
    return {result,legacyReads,dispatches};
  }
  const red=await probe(['release-ready'],'failure');
  assert.equal(red.result.greenUnarmed,0);
  assert.equal(red.result.legacyRequiredPending,1);
  assert.equal(red.dispatches,0);
  const green=await probe(['release-ready'],'success');
  assert.equal(green.result.greenUnarmed,1);
  assert.equal(green.dispatches,1);
  assert.equal(green.legacyReads,1);
  const migrated=await probe(['hh-core-verified'],'failure');
  assert.equal(migrated.result.greenUnarmed,1);
  assert.equal(migrated.legacyReads,0);
  const ambiguous=await probe(['release-ready','hh-core-verified'],'success');
  assert.equal(ambiguous.result.protectionUnverified,1);
  assert.equal(ambiguous.dispatches,0);
});


test('verified exact-head Core run retires only the matching stale CI queue hint',()=>{
  const {canRetireCiHint}=require('../scripts/ci-pr-ten-minute-watchdog.cjs');
  const original={number:2269,state:'open',draft:false,
    head:{sha:SHA,ref:'ci/legacy-2269'}};
  const fresh={...original,base:{ref:'codex/public-book-library'},
    head:{...original.head,repo:{full_name:'andylitvinov-design/books'}},
    labels:[{name:'hh:ci-needed'}]};
  assert.equal(canRetireCiHint(original,fresh),true);
  assert.equal(canRetireCiHint(original,{...fresh,draft:true}),false);
  assert.equal(canRetireCiHint(original,{...fresh,number:2277}),false);
  assert.equal(canRetireCiHint(original,{...fresh,
    head:{...fresh.head,sha:'c'.repeat(40)}}),false);
  assert.equal(canRetireCiHint(original,{...fresh,
    base:{ref:'codex/bootstrap-books'}}),false);
  assert.equal(canRetireCiHint(original,{...fresh,
    labels:[{name:'hh:repair-needed'}]}),false);
  assert.equal(canRetireCiHint(original,{...fresh,
    head:{...fresh.head,repo:{full_name:'stranger/fork'}}}),false);
});

test('classify-change ancestry failure with skipped source build never dispatches source Repair',()=>{
  const {classifyCoreFailureJobs}=require('../scripts/ci-pr-ten-minute-watchdog.cjs');
  const failure=name=>({name,conclusion:'failure',steps:[{name:'Verify bounded shallow scope ancestry before PR routing',conclusion:'failure'}]});
  // Actual PR #2269 run 41476077857: the source job did NOT execute.
  assert.equal(classifyCoreFailureJobs([
    failure('classify-change'),failure('hh-core-verified'),failure('hh-specialist'),
    {name:'core-lint-types-build',conclusion:'skipped'},failure('release-ready')
  ]),'CI_PREFLIGHT_OR_ROUTING');
  assert.equal(classifyCoreFailureJobs([
    {name:'classify-change',conclusion:'success'},
    {name:'core-lint-types-build',conclusion:'failure',steps:[{name:'TypeScript check',conclusion:'failure'}]},
    failure('release-ready')
  ]),'SOURCE_OR_PREFLIGHT');
});

test('modern Core #3235 BASE_ADVANCED cannot consume Code Repair capacity',()=>{
  const {classifyCoreFailureJobs}=require('../scripts/ci-pr-ten-minute-watchdog.cjs');
  const green=name=>({name,conclusion:'success',status:'completed'});
  const failed=name=>({name,conclusion:'failure',status:'completed'});
  // Actual #3235 completed Core job layout (no legacy classify-change).
  assert.equal(classifyCoreFailureJobs([
    green('core-lint-types-build'),failed('hh-specialist'),failed('hh-merge-check')
  ]),'SPECIALIST_FAILED');
  assert.equal(classifyCoreFailureJobs([
    green('core-lint-types-build'),green('hh-specialist'),failed('hh-merge-check')
  ]),'RELEASE_GATE_ONLY');
  // A genuine failing source job must still be routed to source triage.
  assert.equal(classifyCoreFailureJobs([
    {...failed('core-lint-types-build'),steps:[{name:'TypeScript check',conclusion:'failure'}]},
    failed('hh-specialist'),failed('hh-merge-check')
  ]),'SOURCE_OR_PREFLIGHT');
  // No completed source job is not evidence of a source defect.
  assert.equal(classifyCoreFailureJobs([
    failed('hh-specialist'),failed('hh-merge-check')
  ]),'UNVERIFIED');
  assert.equal(classifyCoreFailureJobs([
    {name:'core-lint-types-build',conclusion:'skipped'},
    failed('hh-specialist'),failed('hh-merge-check')
  ]),'UNVERIFIED');
  assert.equal(classifyCoreFailureJobs([
    green('core-lint-types-build'),failed('hh-specialist')
  ]),'UNVERIFIED');
});

test('PR #3245 CI source-contract failure routes to policy, not product Source Repair',()=>{
  const {classifyCoreFailureJobs,classifyIndependentSpecialistChecks}=
    require('../scripts/ci-pr-ten-minute-watchdog.cjs');
  const failure=(name,steps=[])=>({name,conclusion:'failure',status:'completed',steps});
  const contract={name:'Verify specialist ownership and Messenger isolation on CI-policy changes',
    conclusion:'failure'};
  const jobs=[
    failure('core-lint-types-build',[contract]),failure('hh-specialist'),
    {name:'hh-eslint-repair',conclusion:'success',status:'completed'},
    failure('hh-merge-check'),
  ];
  assert.equal(classifyCoreFailureJobs(jobs),'CI_CONTRACT_OR_POLICY');
  assert.equal(classifyCoreFailureJobs([
    {...jobs[0],steps:[contract,{name:'Lint changed JS/TS sources on PR',conclusion:'failure'}]},
    ...jobs.slice(1),
  ]),'SOURCE_OR_PREFLIGHT','a genuine mixed contract + product source failure remains repairable');
  assert.equal(classifyCoreFailureJobs([
    {...jobs[0],steps:[{name:'TypeScript check',conclusion:'failure'}]},
    ...jobs.slice(1),
  ]),'SOURCE_OR_PREFLIGHT','a true product build failure is not hidden');
  const check=(name,conclusion,id)=>({name,conclusion,id,status:'completed',app:{id:15368}});
  assert.equal(classifyIndependentSpecialistChecks({
    total_count:2,check_runs:[check('guard-unit','failure',1),check('hh-specialist','failure',2)],
  }),'POLICY_OR_SKIPPED','Sweep Guard unit tests are CI policy, not product QA');
  assert.equal(classifyIndependentSpecialistChecks({
    total_count:3,check_runs:[check('guard-unit','failure',1),check('hh-specialist','failure',2),
      check('real-browser-acceptance','failure',3)],
  }),'PRODUCT_FAILURE','a real failed product browser suite is still routed to Product Repair');
});

test('CI contract-only failed Core labels release gate and does not hand off source',async()=>{
  const current={...pr(3245),state:'open',mergeable:true,mergeable_state:'clean',labels:[]};
  let repairComments=0;const labels=[];
  const contractStep={name:'Verify specialist ownership and Messenger isolation on CI-policy changes',
    conclusion:'failure'};
  const github={rest:{
    pulls:{list:async()=>({data:[current]}),get:async()=>({data:current})},
    actions:{
      listWorkflowRunsForRepo:async()=>({data:{total_count:0}}),
      listJobsForWorkflowRun:async()=>({data:{total_count:3,jobs:[
        {name:'core-lint-types-build',conclusion:'failure',steps:[contractStep]},
        {name:'hh-specialist',conclusion:'failure'},
        {name:'hh-merge-check',conclusion:'failure'},
      ]}}),
    },
    checks:{listForRef:async()=>({data:{total_count:0,check_runs:[]}})},
    repos:{getCommit:async()=>({data:{parents:[{sha:'a'.repeat(40)},{sha:SHA}]}})},
    issues:{addLabels:async({labels:added})=>{labels.push(...added);},
      createComment:async()=>{repairComments++;}},
  },request:async(route,args)=>{
    if(args?.workflow_id==='hh-pr-core-release.yml')return {data:{
      total_count:1,workflow_runs:[{
        id:41581262858,name:'HH PR core release gate',event:'pull_request',
        head_sha:'c'.repeat(40),head_branch:current.head.ref,
        pull_requests:[{number:current.number,head:{sha:SHA,ref:current.head.ref}}],
        status:'completed',conclusion:'failure',run_attempt:1,
        created_at:new Date(NOW-60*60000).toISOString(),
        updated_at:new Date(NOW-40*60000).toISOString(),
      }],
    }};
    return {data:{workflow_runs:[]}};
  }};
  const report=await run({github,core:core(),context,now:NOW,hasMergeToken:false});
  assert.equal(report.ciContractFailures,1);
  assert.equal(report.sourceRepairQueued,0);
  assert.equal(report.verifiedSourceFailures,0);
  assert.equal(repairComments,0);
  assert.deepEqual(labels,['hh:release-gate-review']);
});

test('root classifier does not mislabel BASE_ADVANCED-like release failures as source defects',()=>{
  const {classifyCoreFailureJobs,latestCompletedFailedGate}=require('../scripts/ci-pr-ten-minute-watchdog.cjs');
  const success=name=>({name,conclusion:'success',status:'completed'});
  const fail=name=>({name,conclusion:'failure',status:'completed'});
  const good=[success('classify-change'),success('core-lint-types-build'),success('hh-core-verified')];
  assert.equal(classifyCoreFailureJobs([...good,fail('release-ready')]),'RELEASE_GATE_ONLY');
  assert.equal(classifyCoreFailureJobs([...good,fail('release-ready'),fail('hh-specialists-verified')]),'RELEASE_GATE_ONLY');
  assert.equal(classifyCoreFailureJobs([...good,fail('hh-specialist'),fail('release-ready')]),'SPECIALIST_FAILED');
  // Reproduces real run 41465939704 on PR #3121: source jobs green;
  // modern Core no longer emits separate hh-core-verified.
  const unified=[success('classify-change'),success('core-lint-types-build')];
  assert.equal(classifyCoreFailureJobs([...unified,fail('hh-specialist'),
    fail('hh-merge-check')]),'SPECIALIST_FAILED',
    'specialist failure must not reserve ESLint-only Repair Worker');
  assert.equal(classifyCoreFailureJobs([...unified,fail('hh-merge-check')]),
    'RELEASE_GATE_ONLY','policy-only failure is not a source defect');
  assert.equal(classifyCoreFailureJobs([...unified,fail('core-lint-types-build'),
    fail('hh-specialist'),fail('hh-merge-check')]),'SOURCE_OR_PREFLIGHT',
    'a genuinely failed source build must not be hidden');
  assert.equal(classifyCoreFailureJobs([...unified,fail('hh-core-verified'),
    fail('hh-specialist'),fail('hh-merge-check')]),'SOURCE_OR_PREFLIGHT',
    'an explicitly failed legacy Core job blocks specialist-only classification');
  assert.equal(classifyCoreFailureJobs([success('classify-change'),fail('core-lint-types-build'),
    fail('hh-core-verified'),fail('release-ready')]),'SOURCE_OR_PREFLIGHT');
  assert.equal(classifyCoreFailureJobs([...good.slice(0,2),fail('release-ready')]),'UNVERIFIED');
  assert.equal(classifyCoreFailureJobs(null),'UNVERIFIED');
  assert.equal(latestCompletedFailedGate({total_count:1,check_runs:[
    {id:1,name:'release-ready',status:'completed',conclusion:'failure'}
  ]},'release-ready'),true);
  assert.equal(latestCompletedFailedGate({total_count:1,check_runs:[
    {id:1,name:'release-ready',status:'in_progress',conclusion:null}
  ]},'release-ready'),false);
});

test('green Core plus failed mandatory legacy release gate queues one gate-review not code repair',async()=>{
  const source=pr(2508);
  const live={...source,state:'open',mergeable:true,mergeable_state:'clean',labels:[]};
  let labels=0,comments=0;
  const github={rest:{
    pulls:{list:async()=>({data:[source]}),get:async()=>({data:live})},
    actions:{listWorkflowRunsForRepo:async()=>({data:{total_count:0}})},
    checks:{listForRef:async({check_name})=>({data:{
      total_count:1,check_runs:[{id:21,name:check_name,status:'completed',
        conclusion:['hh-core-verified','hh-specialist'].includes(check_name)?'success':'failure',
        app:{id:15368}}]
    }})},
    repos:{getBranch:async()=>({data:{protected:true,protection:{
      required_status_checks:{contexts:['release-ready']}
    }}})},
    issues:{addLabels:async({labels:items})=>{
      assert.deepEqual(items,['hh:release-gate-review']);
      labels++;return {data:[]};
    },createComment:async()=>{comments++;throw Error('wrong handoff');}}
  },request:async()=>{throw Error('no CI or protected merge dispatch necessary');}};
  const result=await run({github,core:core(),context,now:NOW});
  assert.equal(labels,1);
  assert.equal(comments,0);
  assert.equal(result.legacyRequiredPending,1);
  assert.equal(result.releaseGateOnly,1);
  assert.equal(result.releaseGateQueued,1);
  assert.equal(result.sourceRepairQueued,0);
});

test('failed legacy gate still pending is not prematurely labeled as root failure',async()=>{
  const source=pr(2509);
  const live={...source,state:'open',mergeable:true,mergeable_state:'clean',labels:[]};
  let labels=0;
  const github={rest:{
    pulls:{list:async()=>({data:[source]}),get:async()=>({data:live})},
    actions:{listWorkflowRunsForRepo:async()=>({data:{total_count:0}})},
    checks:{listForRef:async({check_name})=>({data:{
      total_count:1,check_runs:[{id:21,name:check_name,
        status:check_name==='hh-core-verified'?'completed':'in_progress',
        conclusion:check_name==='hh-core-verified'?'success':null,
        app:{id:15368}}]
    }})},
    repos:{getBranch:async()=>({data:{protected:true,protection:{
      required_status_checks:{contexts:['release-ready']}
    }}})},
    issues:{addLabels:async()=>{labels++;}}
  },request:async()=>{throw Error('unexpected workflow dispatch');}};
  const result=await run({github,core:core(),context,now:NOW});
  assert.equal(labels,0);
  assert.equal(result.releaseGateOnly,0);
  assert.equal(result.releaseGateQueued,0);
  assert.equal(result.legacyRequiredPending,1);
});

test('a completed Core CI event inspects its exact PR without waiting for rotation',()=>{
  const pool=Array.from({length:170},(_,i)=>pr(i+1));
  const baseline=selectCandidates(pool,NOW);
  const missing=pool.find(item=>!baseline.some(p=>p.number===item.number));
  assert.ok(missing);
  const result=selectCandidates(pool,NOW,12,4,missing.number);
  assert.equal(result.length,baseline.length);
  assert.ok(result.some(item=>item.number===missing.number));
});


test('expired legacy Codex leases release owner capacity, but active and malformed leases remain protected',()=>{
  const body=lease=>'<!-- HH_PR_SWEEP_LEASE_V1 -->\n\`\`\`json\n'+JSON.stringify(lease)+'\n\`\`\`';
  const legacy={owner:'Codex / Video Studio',run_id:'video-2606-20261030',head_sha:SHA,
    last_action:'verify source',lease_expires:new Date(NOW-3600_000).toISOString()};
  assert.equal(hasActiveLease([{body:body(legacy)}],SHA,NOW),false);
  assert.equal(hasActiveLease([{body:body({...legacy,lease_expires:new Date(NOW+3600_000).toISOString()})}],SHA,NOW),true);
  assert.equal(hasActiveLease([{body:body({...legacy,head_sha:'f'.repeat(40),
    lease_expires:new Date(NOW+3600_000).toISOString()})}],SHA,NOW),false);
  assert.equal(hasActiveLease([{body:body({...legacy,lease_expires:'not-a-date'})}],SHA,NOW),true);
  assert.equal(hasActiveLease([{body:body({...legacy,schema:'UNTRUSTED'})}],SHA,NOW),true);
});

test('Watchdog ignores unrelated historic releases and diagnostic mentions, like Control Tower',()=>{
  const old='b'.repeat(40),next='c'.repeat(40);
  const release={user:{login:'andylitvinov-design'},
    body:'<!-- HH_PR_SWEEP_LEASE_V1 -->\n'+JSON.stringify({
      schema:'HH_PR_SWEEP_LEASE_V1',owner:'historic-sweep',
      lease_id:'old-release',state:'released_after_atomic_commit',
      old_head:old,new_head:next})};
  const note={body:'Investigation notes: the HH_PR_SWEEP_LEASE_V1 receipt was from another PR.'};
  const malformed={body:'<!-- HH_PR_SWEEP_LEASE_V1 -->\nnot valid lease JSON'};
  assert.equal(hasActiveLease([release,note],SHA,NOW),false);
  assert.equal(hasActiveLease([malformed],SHA,NOW),true,'unverifiable exact receipt remains guarded');
});

test('Watchdog keeps modern exact-HEAD ownership until a matching actor releases it',()=>{
  const actor={login:'andylitvinov-design'};
  const lease={schema:'HH_PR_SWEEP_LEASE_V1',owner:'source-writer',lease_id:'writer-1',
    head_sha:SHA,state:'active',expires_at:new Date(NOW-60_000).toISOString()};
  const wrap=(doc,user=actor)=>({user,body:'<!-- HH_PR_SWEEP_LEASE_V1 -->\n'+JSON.stringify(doc)});
  assert.equal(hasActiveLease([wrap(lease)],SHA,NOW),true,
    'nominal expiry alone never steals an explicit modern source claim');
  assert.equal(hasActiveLease([wrap(lease),wrap({...lease,state:'released'},
    {login:'other-user'})],SHA,NOW),true,'foreign actor cannot free a writer');
  assert.equal(hasActiveLease([wrap(lease),wrap({...lease,state:'released'})],SHA,NOW),false);
});

test('legacy Core bootstrap checks all comment pages and respects an active claim beyond page three',async()=>{
  const candidate={...pr(1475),updated_at:new Date(NOW-5*60*60000).toISOString()};
  const live={...candidate,state:'open',mergeable:true,mergeable_state:'behind'};
  const notes=Array.from({length:320},(_,i)=>({body:'Non-owner historical note '+i}));
  let pages=0,branchWrites=0;
  const github={rest:{
    pulls:{get:async()=>({data:live})},
    issues:{listComments:async({page})=>{
      pages=Math.max(pages,page);
      return {data:notes.slice((page-1)*100,page*100)};
    },createComment:async()=>{throw Error('dry-run cannot write');}}
  },request:async()=>({data:{total_count:0,workflow_runs:[]}})};
  const repairGithub={request:async()=>{branchWrites++;return {status:202}}};
  const args={github,repairGithub,owner:'andylitvinov-design',repo:'books',
    pr:candidate,all:[candidate],now:NOW,dryRun:true,log:()=>{},limited:async(_,fn)=>fn()};
  assert.equal(await bootstrapLegacyCore(args),true);
  assert.equal(pages,4);
  assert.equal(branchWrites,0);
  notes[310]={body:'<!-- HH_PR_SWEEP_LEASE_V1 -->\n'+JSON.stringify({
    schema:'HH_PR_SWEEP_LEASE_V1',owner:'another-writer',lease_id:'recent',
    head_sha:SHA,state:'active',expires_at:new Date(NOW+600_000).toISOString()}),
    user:{login:'andylitvinov-design'}};
  assert.equal(await bootstrapLegacyCore(args),false);
  assert.equal(branchWrites,0);
});

test('saturated Actions capacity defers new conflict Repair dispatch',async()=>{
  let dispatched=0;
  const live={...pr(1779),state:'open',mergeable:false,mergeable_state:'dirty',labels:[]};
  const github={rest:{
    pulls:{list:async()=>({data:[live]}),get:async()=>({data:live})},
    actions:{listWorkflowRunsForRepo:async ({status})=>({data:{total_count:status==='queued'?25:19}})},
    issues:{addLabels:async()=>({data:[]})}
  },request:async()=>{dispatched++;throw Error('busy CI must not dispatch');}};
  const r=await run({github,core:core(),context,now:NOW,hasMergeToken:true});
  assert.equal(r.conflictLabelsQueued,1);
  assert.equal(r.blockedByCapacity,true);
  assert.equal(r.repairWorkerDispatched,0);
  assert.equal(dispatched,0);
});

test('watchdog retries a missing durable label after the handoff receipt, without duplicate comments',async()=>{
  const {recordRepairHandoff}=require('../scripts/ci-pr-ten-minute-watchdog.cjs');
  const head='a'.repeat(40), marker='<!-- HH_PR_10MIN_SOURCE_REPAIR_V1 '+head+' -->';
  const pr={number:421,head:{sha:head},labels:[]};
  let comments=[{user:{id:41898282,login:'github-actions[bot]',type:'Bot'},performed_via_github_app:{id:15368,slug:'github-actions'},body:marker}],written=0,labeled=0;
  const gh={rest:{issues:{
    listComments:async()=>({data:comments}),
    createComment:async()=>{written++;throw Error('duplicate receipt')},
    addLabels:async({issue_number,labels})=>{assert.equal(issue_number,421);
      assert.deepEqual(labels,['hh:repair-needed']);labeled++;return {data:[]}}
  }}};
  const limited=async(_,fn)=>fn();
  const ok=await recordRepairHandoff(gh,'andylitvinov-design','books',pr,
    {id:11,run_attempt:1},[],false,()=>{},limited);
  assert.equal(ok,true);assert.equal(labeled,1);assert.equal(written,0);
});
test('a comment-only partial handoff cannot claim that Repair Worker was queued',async()=>{
  const {recordRepairHandoff}=require('../scripts/ci-pr-ten-minute-watchdog.cjs');
  const head='b'.repeat(40), pr={number:422,head:{sha:head},labels:[]};
  const comments=[];let written=0,labeled=0,fail=true;
  const gh={rest:{issues:{
    listComments:async()=>({data:comments}),
    createComment:async({body})=>{written++;comments.push({user:{id:41898282,login:'github-actions[bot]',type:'Bot'},performed_via_github_app:{id:15368,slug:'github-actions'},body});return {data:[]}},
    addLabels:async()=>{if(fail)throw Object.assign(Error('Resource not accessible by integration'),{status:403});
      labeled++;return {data:[]}}
  }}};
  const limited=async(_,fn)=>fn(), log=()=>{};
  assert.equal(await recordRepairHandoff(gh,'andylitvinov-design','books',pr,
    {id:33,run_attempt:1},[],false,log,limited),false);
  fail=false;
  assert.equal(await recordRepairHandoff(gh,'andylitvinov-design','books',pr,
    {id:33,run_attempt:1},[],false,log,limited),true);
  assert.equal(written,1);assert.equal(labeled,1);
});

test('failed-Core event prioritizes exact PR and rotates a bounded cron fallback',async()=>{
  const first=pr(401),second=pr(402);
  let graphQLSource='',cronHealthy=true;
  const github={
    graphql:async query=>{
      graphQLSource=query;
      return {repository:{p401:{
        number:401,state:'OPEN',isDraft:false,mergeable:'MERGEABLE',
        mergeStateStatus:'CLEAN',baseRefName:'codex/public-book-library',
        headRefName:first.head.ref,headRefOid:first.head.sha,
        headRepository:{nameWithOwner:'andylitvinov-design/books'},
        autoMergeRequest:null
      },p402:{
        number:402,state:'OPEN',isDraft:false,mergeable:'MERGEABLE',
        mergeStateStatus:'CLEAN',baseRefName:'codex/public-book-library',
        headRefName:second.head.ref,headRefOid:second.head.sha,
        headRepository:{nameWithOwner:'andylitvinov-design/books'},
        autoMergeRequest:null
      }},rateLimit:{remaining:4000}};
    },
    rest:{
      pulls:{list:async()=>({data:[first,second]})},
      actions:{listWorkflowRunsForRepo:async()=>({data:{total_count:0}})},
      checks:{listForRef:async()=>({data:{total_count:0,check_runs:[]}})}
    },
    request:async(route,args)=>{
      if(args.workflow_id==='hh-pr-ten-minute-watchdog.yml')
        return {data:cronHealthy
          ? {total_count:1,workflow_runs:[{created_at:new Date(NOW-2*60000).toISOString()}]}
          : {total_count:0,workflow_runs:[]}};
      return args.workflow_id==='hh-pr-core-release.yml'
        ? {data:{total_count:0,workflow_runs:[]}}
        : {data:{workflow_runs:[]}};
    }
  };
  const wake={...context,eventName:'workflow_run',payload:{workflow_run:{
    event:'pull_request',status:'completed',head_branch:first.head.ref,
    pull_requests:[{number:first.number}]
  }}};
  const healthy=await run({github,context:wake,core:core(),now:NOW,dryRun:true});
  assert.equal(healthy.inspected,1,'healthy cron restricts failed CI to exact PR');
  assert.equal(healthy.cronBackstop,false);
  assert.equal(healthy.missingCore,1);
  assert.match(graphQLSource,/p401:pullRequest/);
  assert.ok(!graphQLSource.includes('p402:pullRequest'));
  cronHealthy=false;
  const stale=await run({github,context:wake,core:core(),now:NOW,dryRun:true});
  assert.equal(stale.inspected,2,'absent cron gets bounded fallback');
  assert.equal(stale.cronBackstop,true);
  assert.equal(stale.missingCore,2);
  assert.match(graphQLSource,/p402:pullRequest/);
});
test('Watchdog isolates per-PR failures from ten-minute periodic concurrency',()=>{
  const fs=require('node:fs');
  const source=fs.readFileSync('.github/workflows/hh-pr-ten-minute-watchdog.yml','utf8');
  assert.ok(source.includes("github.event_name == 'workflow_run' && github.event.workflow_run.head_branch || 'periodic'"));
  assert.ok(source.includes('cancel-in-progress: false'));
});

test('cron health never treats successful manual dispatch as scheduled health',()=>{
  const {assessCronHealth}=require('../scripts/ci-pr-ten-minute-watchdog.cjs');
  assert.deepEqual(assessCronHealth({total_count:0,workflow_runs:[]},NOW,35),
    {state:'UNOBSERVED',last:null});
  const recent=new Date(NOW-8*60000).toISOString();
  const fresh=assessCronHealth({total_count:1,workflow_runs:[{created_at:recent}]},NOW,35);
  assert.equal(fresh.state,'HEALTHY');assert.equal(fresh.ageMinutes,8);
  const late=assessCronHealth({total_count:1,workflow_runs:[
    {created_at:new Date(NOW-40*60000).toISOString()}]},NOW,35);
  assert.equal(late.state,'STALE');
  assert.equal(assessCronHealth(null,NOW,35).state,'UNKNOWN');
  assert.equal(assessCronHealth({total_count:1,workflow_runs:[]},NOW,35).state,'UNKNOWN');
});
test('cron telemetry explicitly differentiates schedule from workflow dispatch',()=>{
  const fs=require('node:fs');
  const source=fs.readFileSync('scripts/ci-pr-ten-minute-watchdog.cjs','utf8');
  assert.ok(source.includes("event:'schedule',per_page:1"));
  assert.ok(source.includes("['push','workflow_dispatch','schedule']"));
  assert.ok(source.includes("summary.cronHealth='NOT_PROBED'"));
  assert.ok(source.includes('HH_CRON_LIVENESS'));
});

test('dispatch-only Repair Worker is never reported as a failed cron',()=>{
  const fs=require('node:fs');
  const worker=fs.readFileSync('.github/workflows/hh-pr-repair-worker.yml','utf8');
  const source=fs.readFileSync('scripts/ci-pr-ten-minute-watchdog.cjs','utf8');
  const trigger=worker.slice(worker.indexOf('\non:\n'),worker.indexOf('\npermissions:\n'));
  assert.ok(trigger.includes('  workflow_dispatch:'));
  assert.ok(!trigger.includes('  schedule:'));
  assert.ok(source.includes("states.splice(2,0,'repair:DISPATCH_ONLY')"));
  assert.ok(source.includes("lastSeen.splice(2,0,'repair:NOT_SCHEDULED')"));
  assert.ok(!source.includes("['repair','hh-pr-repair-worker.yml',35]"));
});

test('highest available direction wins; manually owned PRs do not monopolize fast slots',()=>{
  const prs=Array.from({length:170},(_,i)=>pr(i+1));
  prs[9].title='fix(video): owner has manual merge conflict';
  prs[9].labels=[{name:'hh:repair-manual'}];
  prs[39].title='feat(voice): narrated therapeutic session';
  const choice=selectCandidates(prs,NOW);
  assert.equal(choice[0].number,40,'free P2 must beat held P1');
  let audited=false;
  for(let tick=0;tick<15;tick++)
    if(selectCandidates(prs,NOW+tick*600000).some(p=>p.number===10))audited=true;
  assert.equal(audited,true,'held P1 is still covered by read-only audit rotation');
});


test('interrupted Core recovery allocates a runner only to eligible first-attempt events',()=>{
 const source=require('node:fs').readFileSync('.github/workflows/hh-native-auto-merge.yml','utf8');
 const job=source.split('  recover-interrupted-core:')[1].split('    runs-on:')[0];
 assert.match(job,/github\.event\.workflow_run\.run_attempt == 1/);
 // Only explicit infrastructure interruptions reserve the recovery runner.
 // Generic Core failure may be a source/contract regression and must not
 // spawn another Actions runner before the trusted failure classifier proves it.
 for(const result of ['timed_out','startup_failure']) assert.ok(job.includes(result));
 assert.doesNotMatch(job,/['"](?:cancelled|failure)['"]/,'new-HEAD cancellation and generic failed Core jobs do not reserve recovery runners');
 assert.match(job,/github\.event\.workflow_run\.head_repository\.full_name == github\.repository/);
 assert.match(job,/github\.event\.workflow_run\.status == 'completed'/);
});

test('Core with empty PR links is still the genuine exact-source CI run',()=>{
  const {coreRunForCurrentPR}=require('../scripts/ci-pr-ten-minute-watchdog.cjs');
  const current=pr(77);
  const run={name:'HH PR core release gate',event:'pull_request',
    path:'.github/workflows/hh-pr-core-release.yml@refs/pull/77/merge',
    repository:{full_name:'andylitvinov-design/books'},
    head_repository:{full_name:'andylitvinov-design/books'},
    head_branch:current.head.ref,head_sha:current.head.sha,pull_requests:[]};
  assert.equal(coreRunForCurrentPR(run,current),true);
  assert.equal(coreRunForCurrentPR({...run,head_sha:'a'.repeat(40)},current),false);
  assert.equal(coreRunForCurrentPR({...run,head_repository:{full_name:'other/repo'}},current),false);
  assert.equal(coreRunForCurrentPR({...run,path:'.github/workflows/other.yml'},current),false);
});
test('fresh environment failures are not source-repair diagnoses',()=>{
 const {classifyCoreFailureJobs}=require('../scripts/ci-pr-ten-minute-watchdog.cjs');
 const gate={name:'hh-core-verified',conclusion:'failure'};
 const infra={name:'core-lint-types-build',conclusion:'failure',steps:[{name:'Run actions/checkout@v4',conclusion:'failure'}]};
 const lint={name:'core-lint-types-build',conclusion:'failure',steps:[{name:'Lint changed JS/TS sources on PR',conclusion:'failure'}]};
 assert.equal(classifyCoreFailureJobs([infra,gate]),'CI_INFRA_OR_ENVIRONMENT');
 assert.equal(classifyCoreFailureJobs([lint,gate]),'SOURCE_OR_PREFLIGHT');
 assert.equal(classifyCoreFailureJobs([{...infra,steps:[...infra.steps,...lint.steps]},gate]),'SOURCE_OR_PREFLIGHT');
});

test('fresh checkout failure never queues source repair or an early rerun',async()=>{
 let reruns=0,comments=0,labels=0;
 const github={rest:{
  pulls:{list:async()=>({data:[pr(98)]}),get:async()=>({data:{...pr(98),state:'open',mergeable:true,mergeable_state:'clean'}})},
  actions:{listWorkflowRunsForRepo:async()=>({data:{total_count:0}}),
   listJobsForWorkflowRun:async()=>({data:{total_count:1,jobs:[{name:'core-lint-types-build',conclusion:'failure',steps:[{name:'Run actions/checkout@v4',conclusion:'failure'}]}]}})},
  checks:{listForRef:async()=>({data:{total_count:1,check_runs:[{id:1,name:'hh-core-verified',conclusion:'failure'}]}})},
  repos:{getCommit:async()=>({data:{parents:[{sha:'a'.repeat(40)},{sha:SHA}]}})},
  issues:{listComments:async()=>({data:[]}),createComment:async()=>{comments++},addLabels:async()=>{labels++}}
 },paginate:async()=>[],request:async(route,args)=>{
  if(route.includes('rerun-failed-jobs'))reruns++;
  if(args?.workflow_id==='hh-pr-core-release.yml')return {data:{total_count:1,workflow_runs:[{
   id:44,name:'HH PR core release gate',event:'pull_request',head_sha:'c'.repeat(40),head_branch:'test-98',
   pull_requests:[{number:98,head:{sha:SHA,ref:'test-98'}}],status:'completed',conclusion:'failure',run_attempt:1,
   created_at:new Date(NOW-60000).toISOString(),updated_at:new Date(NOW-60000).toISOString()}]}};
  return {data:{workflow_runs:[]}};
 }};
 const result=await run({github,core:core(),context,now:NOW,hasMergeToken:false});
 assert.equal(result.infraOrEnvironment,1);assert.equal(result.sourceRepairQueued,0);
 assert.equal(reruns,0);assert.equal(comments,0);assert.equal(labels,0);
});

test('watchdog does not accept an outsider marker as a durable source handoff',async()=>{
 const {recordRepairHandoff}=require('../scripts/ci-pr-ten-minute-watchdog.cjs');
 const sha='a'.repeat(40),pr={number:99,head:{sha},labels:[]};let written=0,labeled=0;
 const gh={rest:{issues:{listComments:async()=>({data:[{body:'<!-- HH_PR_10MIN_SOURCE_REPAIR_V1 '+sha+' -->',user:{id:123,login:'outsider',type:'User'}}]}),
  createComment:async()=>{written++},addLabels:async()=>{labeled++}}}};
 assert.equal(await recordRepairHandoff(gh,'andylitvinov-design','books',pr,{id:1,run_attempt:1},[],false,()=>{},async(_,fn)=>fn()),true);
 assert.equal(written,1);assert.equal(labeled,1);
});


test('watchdog finds an existing repair receipt after 300 comments',async()=>{
 const {recordRepairHandoff}=require('../scripts/ci-pr-ten-minute-watchdog.cjs');
 const sha='a'.repeat(40);const pages=[];let written=0;
 const gh={rest:{issues:{listComments:async({page})=>{
  pages.push(page);return {data:page<=3?Array.from({length:100},()=>({body:'old'})):
   [{user:{id:41898282,login:'github-actions[bot]',type:'Bot'},performed_via_github_app:{id:15368,slug:'github-actions'},body:'<!-- HH_PR_10MIN_SOURCE_REPAIR_V1 '+sha+' -->'}]};
 },createComment:async()=>{written++}}}};
 const pr={number:11,head:{sha},labels:[{name:'hh:repair-needed'}]};
 const result=await recordRepairHandoff(gh,'andylitvinov-design','books',pr,{id:1,run_attempt:1},[],false,()=>{},async(_label,fn)=>fn());
 assert.deepEqual(pages,[1,2,3,4]);assert.equal(result,false);assert.equal(written,0);
});

test('live watchdog no longer gates periodic PR discovery on stale unit tests',()=>{
  const fs=require('node:fs');
  const yaml=fs.readFileSync('.github/workflows/hh-pr-ten-minute-watchdog.yml','utf8');
  const reconcile=yaml.split('\n  reactivate-schedules:')[0];
  assert.ok(!reconcile.includes('node --test'),'unit tests cannot block live reconciliation');
  const contract=fs.readFileSync('.github/workflows/hh-pr-watchdog-contract-ci.yml','utf8');
  assert.ok(contract.includes('Watchdog decision contracts'));
  assert.ok(contract.includes('tests/ci-pr-ten-minute-watchdog.test.cjs'));
});


test('behind PR with verified real specialist failure is reclassified without new CI',async()=>{
  const src=pr(771);
  const live={...src,state:'open',mergeable:true,mergeable_state:'behind',
    labels:[{name:'hh:release-gate-review'}]};
  const mutations={add:[],remove:[],retries:0};
  const github={rest:{
    pulls:{list:async()=>({data:[live]}),get:async()=>({data:live})},
    actions:{listWorkflowRunsForRepo:async()=>({data:{total_count:0}})},
    checks:{listForRef:async({check_name})=>({data:check_name
      ? {total_count:1,check_runs:[{
          id:check_name==='hh-specialist'?2:1,name:check_name,
          status:'completed',conclusion:check_name==='hh-specialist'?'failure':'success',
          app:{id:15368}}]}
      : {total_count:3,check_runs:[
          {id:3,name:'hh-core-verified',status:'completed',conclusion:'success',app:{id:15368}},
          {id:4,name:'hh-specialist',status:'completed',conclusion:'failure',app:{id:15368}},
          {id:5,name:'public-services',status:'completed',conclusion:'failure',app:{id:15368}}]}})},
    issues:{
      addLabels:async({labels})=>{mutations.add.push(...labels);live.labels.push({name:labels[0]});return {data:[]};},
      removeLabel:async({name})=>{mutations.remove.push(name);live.labels=live.labels.filter(l=>l.name!==name);return {data:[]};}
    }
  },request:async()=>{mutations.retries++;throw Error('No CI bootstrap or manual rerun');}};
  const result=await run({github,core:core(),context,now:NOW});
  assert.equal(result.behindProduction,1);
  assert.equal(result.specialistFailures,1);
  assert.equal(result.specialistQueued,1);
  assert.equal(result.staleGateReclassified,1);
  assert.deepEqual(mutations.add,['hh:specialist-repair-needed']);
  assert.deepEqual(mutations.remove,['hh:release-gate-review']);
  assert.equal(mutations.retries,0);
});

test('only trusted completed hh-specialist failures qualify for backfill',()=>{
  const {verifiedRedSpecialist,needsFailedCoreCronBackstop}=require('../scripts/ci-pr-ten-minute-watchdog.cjs');
  const evidence=(app,conclusion,status='completed')=>({total_count:1,
    check_runs:[{id:1,name:'hh-specialist',app:{id:app},status,conclusion}]});
  assert.equal(verifiedRedSpecialist(evidence(15368,'failure')),true);
  assert.equal(verifiedRedSpecialist(evidence(15368,'success')),false);
  assert.equal(verifiedRedSpecialist(evidence(444,'failure')),false);
  assert.equal(verifiedRedSpecialist(evidence(15368,'failure','in_progress')),false);
  assert.equal(needsFailedCoreCronBackstop('HEALTHY'),false);
  assert.equal(needsFailedCoreCronBackstop('UNKNOWN'),false);
  assert.equal(needsFailedCoreCronBackstop('STALE'),true);
  assert.equal(needsFailedCoreCronBackstop('UNOBSERVED'),true);
});

test('skipped optional MacOS check does not create a fake Product Repair task',async()=>{
  const src=pr(566);
  const live={...src,state:'open',mergeable:true,mergeable_state:'behind',
    labels:[{name:'hh:release-gate-review'}]};
  const writes={added:[],removed:[]};
  const github={rest:{
    pulls:{list:async()=>({data:[live]}),get:async()=>({data:live})},
    actions:{listWorkflowRunsForRepo:async()=>({data:{total_count:0}})},
    checks:{listForRef:async({check_name})=>({data:check_name?
      {total_count:1,check_runs:[{id:1,name:check_name,status:'completed',
        conclusion:check_name==='hh-specialist'?'failure':'success',app:{id:15368}}]}:
      {total_count:4,check_runs:[
        {id:2,name:'hh-core-verified',status:'completed',conclusion:'success',app:{id:15368}},
        {id:3,name:'hh-specialist',status:'completed',conclusion:'failure',app:{id:15368}},
        {id:4,name:'public-services',status:'completed',conclusion:'success',app:{id:15368}},
        {id:5,name:'voice-webkit-macos',status:'completed',conclusion:'skipped',app:{id:15368}}
      ]}})},
    issues:{addLabels:async({labels})=>{writes.added.push(...labels);return {data:[]}},
      removeLabel:async({name})=>{writes.removed.push(name);return {data:[]}}}
  },request:async()=>({data:{total_count:0,workflow_runs:[]}})};
  const result=await run({github,core:core(),context,now:NOW});
  assert.equal(result.specialistFailures,0);
  assert.equal(result.specialistPolicyHolds,1);
  assert.deepEqual(writes.added,[]);
  assert.deepEqual(writes.removed,[]);
});
test('misrouted policy-only aggregate is restored to gate review on the same HEAD',async()=>{
  const src=pr(567);
  const live={...src,state:'open',mergeable:true,mergeable_state:'behind',
    labels:[{name:'hh:specialist-repair-needed'}]};
  const writes={added:[],removed:[]};
  const github={rest:{
    pulls:{list:async()=>({data:[live]}),get:async()=>({data:live})},
    actions:{listWorkflowRunsForRepo:async()=>({data:{total_count:0}})},
    checks:{listForRef:async({check_name})=>({data:check_name?
      {total_count:1,check_runs:[{id:1,name:check_name,status:'completed',
        conclusion:check_name==='hh-specialist'?'failure':'success',app:{id:15368}}]}:
      {total_count:3,check_runs:[
        {id:2,name:'hh-core-verified',status:'completed',conclusion:'success',app:{id:15368}},
        {id:3,name:'hh-specialist',status:'completed',conclusion:'failure',app:{id:15368}},
        {id:4,name:'voice-webkit-macos',status:'completed',conclusion:'skipped',app:{id:15368}}
      ]}})},
    issues:{addLabels:async({labels})=>{writes.added.push(...labels);live.labels.push({name:labels[0]});return {data:[]}},
      removeLabel:async({name})=>{writes.removed.push(name);live.labels=live.labels.filter(l=>l.name!==name);return {data:[]}}}
  },request:async()=>({data:{total_count:0,workflow_runs:[]}})};
  const result=await run({github,core:core(),context,now:NOW});
  assert.equal(result.specialistPolicyHolds,1);
  assert.equal(result.policyRelabeled,1);
  assert.deepEqual(writes.added,['hh:release-gate-review']);
  assert.deepEqual(writes.removed,['hh:specialist-repair-needed']);
});
test('independent specialist failures require complete trusted same-HEAD evidence',()=>{
  const classify=require('../scripts/ci-pr-ten-minute-watchdog.cjs').classifyIndependentSpecialistChecks;
  const row=(id,name,conclusion,status='completed',app=15368)=>({id,name,conclusion,status,app:{id:app}});
  const rows=[row(1,'hh-core-verified','success'),row(2,'hh-specialist','failure'),
    row(3,'public-services','failure')];
  assert.equal(classify({total_count:3,check_runs:rows}),'PRODUCT_FAILURE');
  assert.equal(classify({total_count:3,check_runs:[rows[0],rows[1],row(3,'voice-webkit-macos','skipped')]}),'POLICY_OR_SKIPPED');
  assert.equal(classify({total_count:3,check_runs:rows.slice(0,2)}),'UNKNOWN');
  assert.equal(classify({total_count:3,check_runs:[rows[0],rows[1],row(3,'public-services',null,'in_progress')]}),'UNKNOWN');
  assert.equal(classify({total_count:3,check_runs:[rows[0],rows[1],row(3,'public-services','failure','completed',999)]}),'POLICY_OR_SKIPPED');
  assert.equal(classify({total_count:101,check_runs:rows}),'UNKNOWN');
});

test('one exact unified Actions status can wake the existing merge coordinator',async()=>{
  let dispatched=0;
  const candidate=pr(99);
  const github={rest:{
    pulls:{list:async()=>({data:[candidate]}),get:async()=>({data:{...candidate,state:'open',mergeable:true,mergeable_state:'clean'}})},
    actions:{listWorkflowRunsForRepo:async({status})=>({data:{total_count:status==='queued'?0:3}})},
    checks:{listForRef:async arg=>({data:{total_count:1,check_runs:[{
      id:2,name:arg.check_name==='hh-merge-check'?'hh-merge-check':'obsolete-check',
      status:'completed',conclusion:'success',app:{id:15368}
    }]}})},
    repos:{getBranch:async()=>({data:{protected:true,protection:{
      required_status_checks:{contexts:['hh-merge-check']}
    }}})}
  },request:async route=>{if(route.includes('dispatches'))dispatched++;return {data:{workflow_runs:[]}};}};
  const result=await run({github,core:core(),context,now:NOW,hasMergeToken:true});
  assert.equal(result.greenUnarmed,1);
  assert.equal(result.mergeCoordinatorDispatched,1);
  assert.equal(dispatched,1);
});



test('production coordinator keeps exact new unified status after protection migration',()=>{
  const {readFileSync}=require('node:fs');
  const hourly=readFileSync('.github/workflows/hh-pr-full-inventory.yml','utf8');
  const watchdog=readFileSync('scripts/ci-pr-ten-minute-watchdog.cjs','utf8');
  assert.ok(hourly.includes('const unifiedRequired=legacy.includes("hh-merge-check")'));
  assert.ok(hourly.includes('UNIFIED_REQUIRED_NOT_GREEN'));
  assert.ok(hourly.includes('LEGACY_REQUIRED_RELEASE_NOT_GREEN'));
  assert.ok(watchdog.includes('required-unified-head-check'));
  assert.ok(watchdog.includes("'hh-merge-check'"));
});

test('watchdog removes CI hint only for a real Core run on the same PR and HEAD',async()=>{
  async function check(runRecord, freshOverride={}) {
    const candidate={...pr(402),state:'open',mergeable:true,mergeable_state:'clean',labels:[{name:'hh:ci-needed'}]};
    let removed=0;
    const github={rest:{
      pulls:{list:async()=>({data:[candidate]}),get:async()=>({data:{...candidate,...freshOverride}})},
      actions:{listWorkflowRunsForRepo:async()=>({data:{total_count:0}})},
      checks:{listForRef:async()=>({data:{total_count:0,check_runs:[]}})},
      issues:{removeLabel:async()=>{removed++;}}
    },request:async(route,args)=>args?.workflow_id==='hh-pr-core-release.yml'
      ? {data:{total_count:1,workflow_runs:[runRecord]}} : {data:{workflow_runs:[]}}};
    await run({github,core:core(),context,now:NOW});
    return removed;
  }
  const matching={id:42,name:'HH PR core release gate',event:'pull_request',head_branch:'test-402',head_sha:SHA,
    pull_requests:[{number:402,head:{sha:SHA,ref:'test-402'}}],status:'in_progress',created_at:new Date(NOW).toISOString()};
  assert.equal(await check(matching),1);
  assert.equal(await check({...matching,status:'queued'}),0);
  assert.equal(await check({...matching,status:'completed',conclusion:'startup_failure'}),0);
  assert.equal(await check({...matching,head_sha:'c'.repeat(40)}),0);
  assert.equal(await check({...matching,pull_requests:[{number:403,head:{sha:SHA,ref:'test-402'}}]}),0);
  assert.equal(await check(matching,{head:{...pr(402).head,sha:'c'.repeat(40)}}),0);
});
