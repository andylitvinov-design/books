'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {selectCandidates, gateIsGreen, transientFailure, run} = require('../scripts/ci-pr-ten-minute-watchdog.cjs');
const SHA = 'b'.repeat(40);
const NOW = 1800000000000;
const pr = number => ({
  number,updated_at:new Date(NOW+number*1000).toISOString(),draft:false,auto_merge:null,
  base:{ref:'codex/public-book-library'},
  head:{sha:SHA,ref:'test-'+number,repo:{full_name:'andylitvinov-design/books'}}
});
const core = () => ({info:()=>{},summary:{addHeading(){return this},addCodeBlock(){return this},async write(){}}});
const context = {repo:{owner:'andylitvinov-design',repo:'books'}};

test('full pool is covered by rotating slices within six 10-minute checks',()=>{
  const prs=Array.from({length:179},(_,i)=>pr(i+1)), numbers=new Set();
  for(let tick=0;tick<6;tick++) for(const p of selectCandidates(prs,NOW+tick*600000)) numbers.add(p.number);
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
test('retry only first-attempt infrastructure failures after cooldown',()=>{
  const r={status:'completed',run_attempt:1,conclusion:'failure',created_at:new Date(NOW-60*60000).toISOString(),
    updated_at:new Date(NOW-40*60000).toISOString()};
  assert.equal(transientFailure(r,[{conclusion:'failure',steps:[{name:'TypeScript build',conclusion:'failure'}]}],NOW),false);
  assert.equal(transientFailure(r,[{conclusion:'failure',steps:[{name:'Install dependencies',conclusion:'failure'}]}],NOW),true);
  assert.equal(transientFailure({...r,run_attempt:2},[{conclusion:'timed_out'}],NOW),false);
  assert.equal(transientFailure({...r,updated_at:new Date(NOW-5*60000).toISOString()},[{conclusion:'timed_out'}],NOW),false);
});
test('green unarmed PR dispatches existing protected coordinator, not a direct merge',async()=>{
  let dispatched=0;
  const github={rest:{
    pulls:{list:async()=>({data:[pr(99)]})},
    actions:{listWorkflowRunsForRepo:async ({status})=>({data:{total_count:status==='queued'?0:3}})},
    checks:{listForRef:async()=>({data:{total_count:1,check_runs:[{id:1,name:'release-ready',status:'completed',conclusion:'success',app:{id:15368}}]}})}
  },request:async(route)=>{if(route.includes('dispatches')) dispatched++;return {data:{workflow_runs:[]}};}};
  const result=await run({github,core:core(),context,now:NOW,hasMergeToken:true});
  assert.equal(result.greenUnarmed,1);
  assert.equal(result.mergeCoordinatorDispatched,1);
  assert.equal(dispatched,1);
});
test('CI overload blocks retries, but code failures are handed to Repair once',async()=>{
  let reruns=0,comments=0;
  const github={rest:{
    pulls:{list:async()=>({data:[pr(98)]})},
    actions:{
      listWorkflowRunsForRepo:async ({status})=>({data:{total_count:status==='queued'?32:18}}),
      listJobsForWorkflowRun:async()=>({data:{total_count:1,jobs:[{name:'Build',conclusion:'failure',
        steps:[{name:'TypeScript build',conclusion:'failure'}]}]}})
    },
    checks:{listForRef:async()=>({data:{total_count:1,check_runs:[{id:1,name:'release-ready',conclusion:'failure'}]}})},
    issues:{listComments:async()=>({data:[]}),createComment:async()=>{comments++;}}
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
});


test('GraphQL fast inventory covers all production PRs with two pages',async()=>{
  let page=0;
  const source=Array.from({length:101},(_,i)=>({
    number:i+1,isDraft:false,createdAt:'2026-10-31T00:00:00Z',
    updatedAt:'2026-11-01T00:00:00Z',headRefOid:('a'.repeat(39)+(i%10)),
    headRefName:'fix/'+(i+1),headRepository:{nameWithOwner:'andylitvinov-design/books'},
    mergeStateStatus:i===0?'DIRTY':'BLOCKED',
    autoMergeRequest:null,statusCheckRollup:{state:i===0?'FAILURE':'PENDING'}
  }));
  const github={graphql:async(q,args)=>{
    assert.ok(q.includes('statusCheckRollup'));
    const nodes=page++===0?source.slice(0,100):source.slice(100);
    return {repository:{all:{totalCount:105},production:{
      totalCount:101,pageInfo:{hasNextPage:page===1,endCursor:page===1?'next':null},nodes
    }}};
  }};
  const {queryInventory,classifyQuick}=require('../scripts/ci-pr-ten-minute-watchdog.cjs');
  const result=await queryInventory(github,'andylitvinov-design','books');
  assert.equal(page,2);assert.equal(result.open,105);
  assert.equal(result.production.length,101);
  assert.equal(classifyQuick(result.production[0]),'DIRTY');
});
test('shared API budget reserves room for other workflows',async()=>{
  const {reserveApiBudget}=require('../scripts/ci-pr-ten-minute-watchdog.cjs');
  const mock=n=>({rest:{rateLimit:{get:async()=>({data:{resources:{core:{remaining:n}}}})}}});
  assert.equal((await reserveApiBudget(mock(900),()=>{})).deep,22);
  assert.equal((await reserveApiBudget(mock(390),()=>{})).deep,10);
  assert.equal((await reserveApiBudget(mock(340),()=>{})).deep,0);
});
test('merge conflict and outdated base are not source-code repair failures',()=>{
  const {classifyQuick}=require('../scripts/ci-pr-ten-minute-watchdog.cjs');
  assert.equal(classifyQuick({mergeStateStatus:'DIRTY',rollup:'FAILURE'}),'DIRTY');
  assert.equal(classifyQuick({mergeStateStatus:'BEHIND',rollup:'FAILURE'}),'BEHIND');
  assert.equal(classifyQuick({mergeStateStatus:'CLEAN',rollup:'FAILURE'}),'RED');
  assert.equal(classifyQuick({mergeStateStatus:'CLEAN',rollup:'SUCCESS',auto_merge:{enabledAt:'now'}}),'ARMED');
});
test('bulk green PR triggers only existing guarded coordinator without N+1 API',async()=>{
  let deep=0,dispatches=0;
  const graphql=async()=>({repository:{all:{totalCount:1},production:{
    totalCount:1,pageInfo:{hasNextPage:false,endCursor:null},nodes:[{
      number:87,isDraft:false,createdAt:'2026-11-01T00:00:00Z',
      updatedAt:'2026-11-01T00:00:00Z',headRefOid:SHA,headRefName:'fix/87',
      headRepository:{nameWithOwner:'andylitvinov-design/books'},mergeStateStatus:'CLEAN',
      autoMergeRequest:null,statusCheckRollup:{state:'SUCCESS'}
    }]}}});
  const github={graphql,rest:{
    actions:{listWorkflowRunsForRepo:async()=>({data:{total_count:0}})},
    rateLimit:{get:async()=>({data:{resources:{core:{remaining:900}}}})},
    checks:{listForRef:async()=>{deep++;throw Error('unnecessary per-head CI')}}
  },request:async(route)=>{if(route.includes('dispatches'))dispatches++;return {data:{workflow_runs:[]}};}};
  const result=await run({github,core:core(),context,now:NOW,hasMergeToken:true});
  assert.equal(result.inventoryMode,'graphql');
  assert.equal(result.quickGreen,1);
  assert.equal(result.mergeCoordinatorDispatched,1);
  assert.equal(dispatches,1);
  assert.equal(deep,0);
});
test('GraphQL failure falls back to safe REST, without direct merge',async()=>{
  const github={graphql:async()=>{throw Error('GraphQL temporarily unavailable')},rest:{
    pulls:{list:async()=>({data:[]})},
    actions:{listWorkflowRunsForRepo:async()=>({data:{total_count:0}})},
    rateLimit:{get:async()=>({data:{resources:{core:{remaining:850}}}})}
  }};
  const result=await run({github,core:core(),context,now:NOW,hasMergeToken:false});
  assert.equal(result.inventoryMode,'rest-fallback');
  assert.equal(result.open,0);
  assert.equal(result.mergeCoordinatorDispatched,0);
});
