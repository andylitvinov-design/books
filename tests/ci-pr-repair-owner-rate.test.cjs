'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {requiredOwnerBudget,requireOwnerRateBudget,eligibleWriter,chooseWriterMode}=
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
test('only authenticated scoped Actions job token may publish; user push flag is not its scope oracle',()=>{
 const job=remaining=>({ok:true,canPush:false,remaining});
 assert.equal(chooseWriterMode({job:job(10),owner:{ok:true,canPush:true,remaining:5000}},10),'job');
 assert.equal(chooseWriterMode({job:job(18)},17),'job');
 for(const noJob of [null,{ok:false,remaining:5000},{ok:true,remaining:null},
    {ok:true,remaining:9},{ok:true,remaining:NaN}]){
  assert.equal(eligibleWriter(noJob,10),false);
  assert.throws(()=>chooseWriterMode({job:noJob,owner:{ok:true,canPush:true,remaining:5000}},10),
    /NO_VERIFIED_SCOPED_JOB_CREDENTIAL_OR_RATE/);
 }
 assert.throws(()=>chooseWriterMode({job:job(5000)},18),/INVALID_BUDGET/);
});
test('existing issuer remains credential isolated and branch/head guarded',()=>{
 const flow=fs.readFileSync('.github/workflows/hh-pr-repair-worker.yml','utf8');
 const publish=flow.split('\n  publish:\n')[1].split('\n  finalize:\n')[0];
 assert.doesNotMatch(publish,/HH_AUTOMERGE_TOKEN:|process\.env\.HH_AUTOMERGE_TOKEN/);
 assert.match(publish,/HH_REPAIR_JOB_TOKEN: \$\{\{ github\.token \}\}/);
 assert.match(flow,/HH_REPAIR_JOB_TOKEN: \$\{\{ github\.token \}\}/);
 assert.match(publish,/permissions:\n      contents: write/);
 assert.match(publish,/rateGuard\.chooseWriterMode/);
 assert.match(publish,/const token=jobToken/);
 assert.match(publish,/rateGuard\.chooseWriterMode\(\{job:jobProbe\},required\)/);
 assert.doesNotMatch(publish,/await probe\(ownerToken\)|mode==='job'\?jobToken:ownerToken/);
 assert.match(flow,/rateGuard\.requiredOwnerBudget\(files\.length\)/);
 assert.match(flow,/rateGuard\.requireOwnerRateBudget\(response\.headers,minRemaining\)/);
 assert.match(flow,/HH_REPAIR_WRITE_CREDENTIAL AUTHENTICATED_REPOSITORY_SCOPED/);
 assert.doesNotMatch(publish,/repository\.permissions\?\.push!==true/);
 assert.match(publish,/HH_REPAIR_JOB_TOKEN_REPOSITORY_MISMATCH/);
 assert.match(flow,/force:false/);
 assert.match(flow,/Source branch moved before repair commit/);
 assert.match(flow,/HH_REPAIR_REMOTE_REF_UPDATE_NOT_VERIFIED/);
 assert.doesNotMatch(flow,/remaining<100/);
});
