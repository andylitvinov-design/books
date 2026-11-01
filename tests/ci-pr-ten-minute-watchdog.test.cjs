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
    checks:{listForRef:async(arg)=>{targeted=arg.check_name==='hh-core-verified';return {data:{total_count:1,check_runs:[{id:1,name:'hh-core-verified',status:'completed',conclusion:'success',app:{id:15368}}]}};}}
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
  assert.ok(source.includes('if(token)'));
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

test('legacy branch-check migration remains a single valid fail-closed step',()=>{
  const {readFileSync}=require('node:fs');
  const source=readFileSync('.github/workflows/hh-migrate-legacy-core-check.yml','utf8');
  assert.equal((source.match(/^          gh api "repos\/\$GH_REPO\/rulesets\/26269892"/gm)||[]).length,1);
  assert.equal((source.match(/^          gh api --method PATCH /gm)||[]).length,1);
  assert.ok(source.includes("base64 --decode | grep '^    name: hh-core-verified$' >/dev/null || {"));
  assert.ok(!source.includes("base64 --decode | grep -q "));
  assert.ok(source.includes('"strict":false,"contexts":[],"checks"'));
});

test('event-driven merge and inventory respect legacy protection until admin migration',()=>{
  const {readFileSync}=require('node:fs');
  const native=readFileSync('.github/workflows/hh-native-auto-merge.yml','utf8');
  const hourly=readFileSync('.github/workflows/hh-pr-full-inventory.yml','utf8');
  assert.ok(native.includes('const oldRequired = Array.isArray(required) && required.includes("release-ready")'));
  assert.ok(native.includes('job.name === "release-ready" && job.status === "completed"'));
  assert.ok(native.includes('job.name === "hh-core-verified"'));
  assert.ok(hourly.includes('const legacyReleaseMandatory=legacy.includes("release-ready")'));
  assert.ok(hourly.includes('LEGACY_REQUIRED_RELEASE_NOT_GREEN'));
  assert.ok(hourly.includes('CORE_NOT_VERIFIED'));
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
  const r=await run({github,core:core(),context,now:NOW,hasMergeToken:false});
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


test('watchdog queues one missing-Core PR and immediately dispatches bounded CI worker',async()=>{
  const base=pr(2498);
  const live={...base,state:'open',mergeable:true,mergeable_state:'clean',labels:[]};
  let labels=0,dispatches=0,coreQueries=0;
  const github={rest:{
    pulls:{list:async()=>({data:[base]}),get:async()=>({data:live})},
    checks:{listForRef:async()=>({data:{total_count:0,check_runs:[]}})},
    actions:{listWorkflowRunsForRepo:async()=>({data:{total_count:0}})},
    issues:{addLabels:async()=>{labels++;return {data:[]};}}
  },request:async(route,args)=>{
    if(args?.workflow_id==='hh-pr-core-release.yml'){
      coreQueries++;return {data:{total_count:0,workflow_runs:[]}};
    }
    if(args?.workflow_id==='hh-pr-ci-worker.yml'&&route.includes('dispatches')){
      assert.equal(args.inputs.dry_run,'false');
      dispatches++;return {status:204,data:{}};
    }
    if(args?.workflow_id==='hh-pr-ci-worker.yml')return {data:{workflow_runs:[]}};
    throw Error('Unexpected API route '+route);
  }};
  const result=await run({github,core:core(),context,now:NOW,hasMergeToken:true});
  assert.equal(coreQueries,1);
  assert.equal(labels,1);
  assert.equal(dispatches,1);
  assert.equal(result.missingCore,1);
  assert.equal(result.ciBootstrapQueued,1);
  assert.equal(result.ciWorkerDispatched,1);
  assert.equal(result.mergeCoordinatorDispatched,0);
});

test('watchdog never redispatches a CI worker for already-queued PR',async()=>{
  const base=pr(2499);
  const live={...base,state:'open',mergeable:true,mergeable_state:'clean',
    labels:[{name:'hh:ci-needed'}]};
  let labels=0,dispatches=0;
  const github={rest:{
    pulls:{list:async()=>({data:[base]}),get:async()=>({data:live})},
    checks:{listForRef:async()=>({data:{total_count:0,check_runs:[]}})},
    actions:{listWorkflowRunsForRepo:async()=>({data:{total_count:0}})},
    issues:{addLabels:async()=>{labels++;}}
  },request:async(route,args)=>{
    if(args?.workflow_id==='hh-pr-core-release.yml')return {data:{total_count:0,workflow_runs:[]}};
    if(route.includes('dispatches'))dispatches++;
    return {data:{workflow_runs:[]}};
  }};
  const result=await run({github,core:core(),context,now:NOW});
  assert.equal(result.missingCore,1);
  assert.equal(result.ciBootstrapQueued,0);
  assert.equal(result.ciWorkerDispatched,0);
  assert.equal(labels,0);
  assert.equal(dispatches,0);
});
