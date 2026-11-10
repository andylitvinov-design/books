'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {requiredOwnerBudget,requireOwnerRateBudget,eligibleWriter,chooseWriterMode,requireScopedJobWriter}=
 require('../scripts/ci-pr-repair-owner-rate.cjs');
const hdr=value=>({get:name=>{
 assert.equal(name,'x-ratelimit-remaining');return value;
}});
test('publisher reserves exact transaction calls plus margin, not arbitrary 100',()=>{
 assert.equal(requiredOwnerBudget(1),10);
 assert.equal(requiredOwnerBudget(8),17);
 for(const n of [0,-1,9,1.2,NaN,'1',null])
  assert.throws(()=>requiredOwnerBudget(n),/INVALID_SOURCE_SCOPE/);
 assert.deepEqual(requireOwnerRateBudget(hdr('10'),requiredOwnerBudget(1)),
  {remaining:10,required:10,source:'GITHUB_AUTHENTICATED_RESPONSE_HEADER'});
 assert.deepEqual(requireOwnerRateBudget(hdr('17'),requiredOwnerBudget(8)),
  {remaining:17,required:17,source:'GITHUB_AUTHENTICATED_RESPONSE_HEADER'});
});
test('actual low, missing or invalid rate header fails closed before any write',()=>{
 for(const value of ['0','9','-1','','unknown',null,undefined,'10.1'])
  assert.throws(()=>requireOwnerRateBudget(hdr(value),10),/RATE_RESERVE_LOW|RATE_NOT_VERIFIED/);
 for(const n of [0,9,18,NaN])assert.throws(
  ()=>requireOwnerRateBudget(hdr('100'),n),/INVALID_BUDGET/);
 assert.throws(()=>requireOwnerRateBudget(null,10),/RATE_NOT_VERIFIED/);
});
test('job-scoped GitHub token is preferred only with verified repository write and rate budget',()=>{
 const good=remaining=>({ok:true,canPush:true,remaining});
 assert.equal(chooseWriterMode({job:good(10),owner:good(5000)},10),'job');
 assert.equal(chooseWriterMode({job:good(18),owner:good(5000)},17),'job');
 assert.equal(chooseWriterMode({job:good(9),owner:good(5000)},10),'owner');
 assert.equal(chooseWriterMode({job:null,owner:good(10)},10),'owner');
 for(const invalid of [null,{ok:true,canPush:false,remaining:999},
   {ok:false,canPush:true,remaining:999},{ok:true,canPush:true,remaining:null}]){
  assert.equal(eligibleWriter(invalid,10),false);
  assert.throws(()=>chooseWriterMode({job:invalid,owner:invalid},10),
   /NO_VERIFIED_WRITER/);
 }
 assert.throws(()=>chooseWriterMode({job:good(5000)},18),/INVALID_BUDGET/);
});
test('publisher remains credential isolated and branch/head guarded',()=>{
 const flow=fs.readFileSync('.github/workflows/hh-pr-repair-worker.yml','utf8');
 const pub=flow.split('\n  publish:\n')[1].split('\n  finalize:\n')[0];
 assert.match(pub,/permissions:\n      contents: write/);
 assert.match(pub,/HH_REPAIR_JOB_TOKEN: \$\{\{ github\.token \}\}/);
 assert.match(pub,/rateGuard\.requireScopedJobWriter/);
 assert.match(pub,/token=jobToken/);
 assert.doesNotMatch(pub,/HH_AUTOMERGE_TOKEN|ownerToken/);
 assert.match(pub,/HH_REPAIR_WRITER_SCOPED_JOB_METADATA_OK/);
 assert.match(pub,/HH_REPAIR_WRITER_REPOSITORY_IDENTITY_MISMATCH/);
 assert.match(pub,/rateGuard\.requiredOwnerBudget\(files\.length\)/);
 assert.match(pub,/rateGuard\.requireOwnerRateBudget\(response\.headers,minRemaining\)/);
 assert.match(pub,/force:false/);
 assert.match(pub,/Source branch moved before repair commit/);
 assert.match(pub,/HH_REPAIR_REMOTE_REF_UPDATE_NOT_VERIFIED/);
 assert.match(pub,/Verify and recover the next exact-HEAD Core CI wave/);
});
test('scoped Actions credential selection uses trusted workflow and API quota, not misleading push metadata',()=>{
 const identity={repository:'andylitvinov-design/books',
  ref:'refs/heads/codex/bootstrap-books',eventName:'workflow_dispatch'};
 assert.equal(requireScopedJobWriter({identity,required:10,
  probe:{ok:true,remaining:10,canPush:false}}),'job');
 assert.equal(requireScopedJobWriter({identity,required:17,
  probe:{ok:true,remaining:17}}),'job');
 for(const invalid of [null,{}, {ok:false,remaining:900},
   {ok:true,remaining:NaN},{ok:true,remaining:undefined},{ok:true,remaining:9},
   {ok:true,remaining:10.5}]){
   assert.throws(()=>requireScopedJobWriter({identity,required:10,probe:invalid}),
    /API_PROOF_OR_RATE_MISSING/);
 }
});
test('foreign, untrusted or pull_request context cannot publish even with enough quota',()=>{
 const probe={ok:true,remaining:800};
 const identity={repository:'andylitvinov-design/books',
  ref:'refs/heads/codex/bootstrap-books',eventName:'workflow_dispatch'};
 for(const bad of [
  {...identity,repository:'other/repo'},
  {...identity,ref:'refs/heads/test/canary'},
  {...identity,eventName:'pull_request'},
  {...identity,eventName:'workflow_run'},null,{}]){
   assert.throws(()=>requireScopedJobWriter({probe,required:10,identity:bad}),
    /UNTRUSTED_WORKFLOW_CONTEXT/);
 }
 for(const required of [0,9,18,-1,'10',10.5]){
  assert.throws(()=>requireScopedJobWriter({probe,required,identity}),
   /INVALID_BUDGET/);
 }
});
