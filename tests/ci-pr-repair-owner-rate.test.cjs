'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {requiredOwnerBudget,requireOwnerRateBudget,eligibleWriter,eligibleJobWriter,chooseWriterMode}=
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
test('trusted scoped Actions token needs repository identity and budget, not user permissions.push',()=>{
 const good=(remaining,canPush)=>({ok:true,canPush,remaining});
 assert.equal(chooseWriterMode({job:good(10,false)},10),'job');
 assert.equal(chooseWriterMode({job:good(17,undefined)},17),'job');
 assert.equal(chooseWriterMode({job:good(30,true)},10),'job');
 assert.equal(eligibleJobWriter(good(10,false),10),true);
 assert.equal(eligibleWriter(good(10,false),10),false,
  'legacy PAT permission test remains strict but cannot classify job token');
 for(const invalid of [null,{ok:false,canPush:true,remaining:999},
   {ok:true,canPush:false,remaining:null},{ok:true,remaining:9},
   {ok:true,remaining:'5000'}]){
  assert.equal(eligibleJobWriter(invalid,10),false);
  assert.throws(()=>chooseWriterMode({job:invalid,owner:good(5000,true)},10),
   /HH_REPAIR_JOB_TOKEN_UNVERIFIED_OR_RATE_LOW/,
   'proven 403 owner token must never be selected as fallback');
 }
 assert.throws(()=>chooseWriterMode({job:good(5000,false)},18),/INVALID_BUDGET/);
});
test('existing issuer remains credential isolated and branch/head guarded',()=>{
 const flow=fs.readFileSync('.github/workflows/hh-pr-repair-worker.yml','utf8');
 assert.match(flow,/HH_REPAIR_JOB_TOKEN: \$\{\{ github\.token \}\}/);
 const publish=flow.split('\n  publish:\n')[1].split('\n  finalize:\n')[0];
 assert.match(publish,/permissions:\n      contents: write/);
 assert.match(publish,/rateGuard\.chooseWriterMode/);
 assert.match(publish,/token=jobToken/);
 assert.doesNotMatch(publish,/token=ownerToken|probe\(ownerToken\)/);
 assert.doesNotMatch(publish,/HH_AUTOMERGE_TOKEN:/);
 assert.match(flow,/rateGuard\.requiredOwnerBudget\(files\.length\)/);
 assert.match(flow,/rateGuard\.requireOwnerRateBudget\(response\.headers,minRemaining\)/);
 assert.match(flow,/HH_REPAIR_WRITE_CREDENTIAL VERIFIED_REPOSITORY_PUSH/);
 assert.match(flow,/HH_REPAIR_JOB_TOKEN_REPOSITORY_UNVERIFIED/);
 assert.doesNotMatch(publish,/repository\.permissions\?\.push!==true/);
 assert.match(flow,/force:false/);
 assert.match(flow,/Source branch moved before repair commit/);
 assert.match(flow,/HH_REPAIR_REMOTE_REF_UPDATE_NOT_VERIFIED/);
 assert.doesNotMatch(flow,/remaining<100/);
});
