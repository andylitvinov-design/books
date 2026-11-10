'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {requiredOwnerBudget,requireOwnerRateBudget,eligibleWriter,chooseWriterMode,requireScopedJobWriterProbe}=
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
test('scoped Actions job-token is selected on verified repo+budget; role push flag is NOT a job permission',()=>{
 const p=requireScopedJobWriterProbe({ok:true,canPush:false,remaining:18},10);
 assert.deepEqual(p,{mode:'job',repositoryVerified:true,remaining:18,required:10,
   gitDataWriteVerified:false,proofLevel:'REPOSITORY_READ_AND_RATE_NOT_WRITE'});
 assert.equal(p.gitDataWriteVerified,false,'read-only probe must never claim a commit');
 for(const invalid of [null,{ok:false,canPush:true,remaining:5000},
   {ok:true,canPush:false,remaining:9},{ok:true,remaining:null},
   {ok:true,remaining:-1},{ok:true,remaining:'5000'}]){
   assert.throws(()=>requireScopedJobWriterProbe(invalid,10),
     /JOB_TOKEN_REPOSITORY_READ_UNVERIFIED|JOB_TOKEN_RATE_RESERVE_UNVERIFIED/);
 }
 assert.throws(()=>requireScopedJobWriterProbe({ok:true,remaining:5000},18),
   /INVALID_BUDGET/);
});
test('existing issuer remains credential isolated and branch/head guarded',()=>{
 const flow=fs.readFileSync('.github/workflows/hh-pr-repair-worker.yml','utf8');
 assert.match(flow,/HH_AUTOMERGE_TOKEN: \$\{\{ secrets\.HH_AUTOMERGE_TOKEN \}\}/);
 assert.match(flow,/HH_REPAIR_JOB_TOKEN: \$\{\{ github\.token \}\}/);
 const publish=flow.split('\n  publish:\n')[1].split('\n  finalize:\n')[0];
 assert.match(publish,/permissions:\n      contents: write/);
 assert.match(publish,/rateGuard\.requireScopedJobWriterProbe/);
 assert.match(publish,/token=jobToken/);
 assert.doesNotMatch(publish,/ownerToken|mode==='owner'|chooseWriterMode/);
 assert.match(flow,/rateGuard\.requiredOwnerBudget\(files\.length\)/);
 assert.match(flow,/rateGuard\.requireOwnerRateBudget\(response\.headers,minRemaining\)/);
 assert.match(flow,/HH_REPAIR_WRITE_CREDENTIAL /);
 assert.match(fs.readFileSync('scripts/ci-pr-repair-owner-rate.cjs','utf8'),/REPOSITORY_READ_AND_RATE_NOT_WRITE/);
 assert.match(flow,/HH_REPAIR_REMOTE_REF VERIFIED /);
 assert.doesNotMatch(publish,/repository\.permissions\?\.push!==true/);
 assert.doesNotMatch(publish,/HH_AUTOMERGE_TOKEN/);
 assert.match(flow,/force:false/);
 assert.match(flow,/Source branch moved before repair commit/);
 assert.match(flow,/HH_REPAIR_REMOTE_REF_UPDATE_NOT_VERIFIED/);
 assert.doesNotMatch(flow,/remaining<100/);
});
