'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {requiredOwnerBudget,requireOwnerRateBudget,eligibleWriter,eligibleScopedJobWriter,chooseWriterMode}=
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
test('existing issuer remains credential isolated and branch/head guarded',()=>{
 const flow=fs.readFileSync('.github/workflows/hh-pr-repair-worker.yml','utf8');
 assert.match(flow,/HH_AUTOMERGE_TOKEN: \$\{\{ secrets\.HH_AUTOMERGE_TOKEN \}\}/);
 assert.match(flow,/HH_REPAIR_JOB_TOKEN: \$\{\{ github\.token \}\}/);
 const publish=flow.split('\n  publish:\n')[1].split('\n  finalize:\n')[0];
 assert.match(publish,/permissions:\n      contents: write/);
 assert.match(publish,/rateGuard\.chooseWriterMode/);
 assert.match(publish,/mode==='job'\?jobToken:ownerToken/);
 assert.match(flow,/rateGuard\.requiredOwnerBudget\(files\.length\)/);
 assert.match(flow,/rateGuard\.requireOwnerRateBudget\(response\.headers,minRemaining\)/);
 assert.match(flow,/HH_REPAIR_WRITE_CREDENTIAL VERIFIED_REPOSITORY_IDENTITY_RATE/);
 assert.match(flow,/mode==='owner'&&repository\.permissions\?\.push!==true/);
 assert.match(flow,/verifiedAtomicCommitRequest/);
 assert.doesNotMatch(flow,/await call\('PATCH',base\+'\/git\/refs\/heads/);
 assert.match(flow,/Source branch moved before repair commit/);
 assert.match(flow,/HH_REPAIR_REMOTE_REF_UPDATE_NOT_VERIFIED/);
 assert.doesNotMatch(flow,/remaining<100/);
});

test('scoped Actions publisher tolerates absent push field only with trusted write job',()=>{
 const job={ok:true,canPush:false,remaining:100};
 const owner={ok:true,canPush:true,remaining:4000};
 assert.equal(eligibleWriter(job,10),false);
 assert.equal(eligibleScopedJobWriter(job,10),false);
 assert.equal(eligibleScopedJobWriter(job,10,true),true);
 assert.equal(chooseWriterMode({job,owner},10),'owner');
 assert.equal(chooseWriterMode({job,owner},10,{writeJobAuthorized:true}),'job');
 assert.equal(chooseWriterMode({job:{...job,remaining:9},owner},10,{writeJobAuthorized:true}),'owner');
 for(const bad of [{ok:false,canPush:false,remaining:100},{ok:true,canPush:false,remaining:null},
  {ok:true,canPush:false,remaining:9}]){
  assert.equal(eligibleScopedJobWriter(bad,10,true),false);
  assert.throws(()=>chooseWriterMode({job:bad,owner:null},10,{writeJobAuthorized:true}),
    /NO_VERIFIED_WRITER/);
 }
 const flow=fs.readFileSync('.github/workflows/hh-pr-repair-worker.yml','utf8');
 const publisher=flow.split('\n  publish:\n')[1].split('\n  finalize:\n')[0];
 assert.match(publisher,/permissions:\n      contents: write/);
 assert.match(publisher,/writeJobAuthorized=context\.repo\.owner/);
 assert.match(publisher,/context\.ref==='refs\/heads\/codex\/bootstrap-books'/);
 assert.match(publisher,/github\.token/);
 assert.match(publisher,/HH_REPAIR_REMOTE_REF_UPDATE_NOT_VERIFIED/);
});
