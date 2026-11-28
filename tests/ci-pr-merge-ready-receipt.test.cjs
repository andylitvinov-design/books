'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {parseReceipt,readMergeReadyReceipt}=require('../scripts/ci-pr-merge-ready-receipt.cjs');
const a='a'.repeat(40),b='b'.repeat(40),c='c'.repeat(40),d='d'.repeat(40),e='e'.repeat(40);
const owner='andylitvinov-design',repo='books',full=owner+'/'+repo,prod='codex/public-book-library';
const receipt={version:1,repository:full,pr:5701,head:a,tested_base:b,tested_merge:c,verified_base:d,run_id:123,run_attempt:2};
const line='CI_MERGE_READY_V1:'+JSON.stringify(receipt);
function fixture(){
 const pr={number:5701,state:'open',draft:false,mergeable:true,mergeable_state:'clean',head:{sha:a,ref:'feature',repo:{full_name:full}},base:{ref:prod,sha:d}};
 const run={id:123,run_attempt:2,event:'pull_request',status:'completed',conclusion:'success',name:'HH PR core release gate',path:'.github/workflows/hh-pr-core-release.yml',repository:{full_name:full},head_repository:{full_name:full},head_sha:a,head_branch:'feature',pull_requests:[{number:5701,head:{sha:a,ref:'feature'},base:{ref:prod}}]};
 const steps=['Validate exact-head risk and required specialist workflows','Confirm one-runner Core and independent specialist release evidence'].map(name=>({name,status:'completed',conclusion:'success'}));
 const jobs=[{id:11,run_id:123,name:'core-lint-types-build',status:'completed',conclusion:'success'},{id:12,run_id:123,name:'hh-merge-check',status:'completed',conclusion:'success',steps}];
 const github={request:async()=>({data:line}),rest:{repos:{
  getBranch:async()=>({data:{protected:true,commit:{sha:d}}}),
  getCommit:async()=>({data:{sha:c,parents:[{sha:b},{sha:a}]}}),
  compareCommits:async()=>({data:{status:'ahead',behind_by:0,base_commit:{sha:b},merge_base_commit:{sha:b}}}),
  getContent:async({path})=>({data:{type:'file',path,sha:e,encoding:'base64',content:Buffer.from('CI_MERGE_READY_V1:').toString('base64')}})
 },actions:{getWorkflowRun:async()=>({data:run})}}};
 return {github,owner,repo,pr,run,jobs};
}
test('only a single bounded versioned receipt parses',()=>{
 assert.deepEqual(parseReceipt('2026-11-28T12:00:00.000Z '+line),receipt);
 assert.equal(parseReceipt(line+'\n'+line),null);
 assert.equal(parseReceipt('echo '+line),null);
 assert.equal(parseReceipt('CI_MERGE_READY_V1:'+JSON.stringify({...receipt,extra:true})),null);
});
test('authentic exact-run receipt replaces base reclassification',async()=>{
 assert.deepEqual(await readMergeReadyReceipt(fixture()),{ok:true,reason:'UNIFIED_GATE_RECEIPT_REUSED',base:d});
});
test('stale base, HEAD, workflow bytes, attempt, red job, bad ancestry or missing marker falls back',async()=>{
 const variants=[
  f=>{f.github.rest.repos.getBranch=async()=>({data:{protected:true,commit:{sha:e}}})},
  f=>{f.pr.head.sha=e},
  f=>{f.jobs[1].steps[0].conclusion='skipped'},
  f=>{f.jobs[1].conclusion='failure'},
  f=>{f.github.rest.repos.getCommit=async()=>({data:{sha:c,parents:[{sha:b},{sha:e}]}})},
  f=>{f.github.rest.repos.compareCommits=async()=>({data:{status:'diverged',behind_by:1}})},
  f=>{f.github.rest.actions.getWorkflowRun=async()=>({data:{...f.run,run_attempt:3}})},
  f=>{const old=f.github.rest.repos.getContent;f.github.rest.repos.getContent=async x=>{const r=await old(x);if(x.ref===c)r.data.sha=a;return r}},
  f=>{f.github.request=async()=>({data:''})},
  f=>{f.github.rest.repos.getContent=async({path})=>({data:{type:'file',path,sha:e,encoding:'base64',content:'b2xk'}})},
  f=>{let count=0;f.github.rest.repos.getBranch=async()=>({data:{protected:true,commit:{sha:++count===1?d:e}}})}
 ];
 for(const mutate of variants){const f=fixture();mutate(f);assert.equal(await readMergeReadyReceipt(f),null)}
});
