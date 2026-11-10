'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {requiredOwnerBudget,requireOwnerRateBudget,eligibleWriter,eligibleScopedJobWriter,chooseWriterMode,writerOperation,errorKind,allowedPermissions}=
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
 assert.match(flow,/force:false/);
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


test('publisher denies include fixed Git Data operation, not raw provider content',()=>{
 const base='/repos/andylitvinov-design/books';
 const op=writerOperation;
 assert.equal(op('GET',base),'REPOSITORY_READ');
 assert.equal(op('GET',base+'/git/ref/heads/test/pr-repair-safe'),'READ_REF');
 assert.equal(op('PATCH',base+'/git/refs/heads/test/pr-repair-safe'),'UPDATE_REF');
 assert.equal(op('POST',base+'/git/blobs'),'CREATE_BLOB');
 assert.equal(op('POST',base+'/git/trees'),'CREATE_TREE');
 assert.equal(op('POST',base+'/git/commits'),'CREATE_COMMIT');
 assert.equal(op('DELETE',base+'/git/refs/heads/test/pr-repair-safe'),'UNKNOWN');
 assert.equal(op('GET',base+'/git/blobs/secret'),'UNKNOWN');
 assert.equal(op('POST','/repos/other/private/git/blobs'),'OUTSIDE_REPO');
 assert.equal(op('POST',base+'/git/blobs?token=SECRET'),'UNKNOWN');
 assert.equal(op('POST',base+'/git/refs/heads/secret'),'UNKNOWN');
 assert.equal(op('PATCH',base+'/git/refs/heads/%2e%2e'),'UNKNOWN');
 assert.equal(op('',null),'UNKNOWN');
 assert.equal(errorKind(403,'Resource not accessible by integration'),'INTEGRATION_PERMISSION_DENIED');
 assert.equal(errorKind(403,'Resource not accessible by personal access token'),'PERSONAL_TOKEN_PERMISSION_DENIED');
 assert.equal(errorKind(429,'You have exceeded a secondary rate limit'),'PROVIDER_RATE_LIMIT');
 assert.equal(errorKind(403,'SECRET_SOURCE_HERE'),'HTTP_REJECTED');
 assert.equal(errorKind(422,'Resource not accessible by integration'),'HTTP_REJECTED');
 assert.deepEqual(allowedPermissions('contents=write, pull_requests=read; issues=write'),[
  'contents=write','pull_requests=read','issues=write'
 ]);
 assert.deepEqual(allowedPermissions('contents=write,contents=write;creds=SECRET;billing=admin'),['contents=write']);
 assert.deepEqual(allowedPermissions('token=SECRET'),[]);
 assert.deepEqual(allowedPermissions('x'.repeat(1025)),[]);
 assert.deepEqual(allowedPermissions(null),[]);
});

test('trusted publisher emits bounded operation-specific 403 receipts without raw source leakage',()=>{
 const flow=fs.readFileSync('.github/workflows/hh-pr-repair-worker.yml','utf8');
 const pub=flow.split('\n  publish:\n')[1].split('\n  finalize:\n')[0];
 assert.match(pub,/HH_REPAIR_GIT_DATA_DENIED_V1/);
 assert.match(pub,/rateGuard\.writerOperation\(method,path\)/);
 assert.match(pub,/rateGuard\.errorKind\(response\.status/);
 assert.match(pub,/rateGuard\.allowedPermissions/);
 assert.match(pub,/x-accepted-github-permissions/);
 assert.match(pub,/const failure=Error\('HH_REPAIR_GIT_DATA_'\+operation\+'_HTTP_'\+response\.status\)/);
 assert.match(pub,/failure\.status=response\.status/);
 assert.match(pub,/failure\.operation=operation/);
 assert.match(pub,/failure\.kind=receipt\.kind/);
 assert.match(pub,/throw failure/);
 assert.doesNotMatch(pub,/core\.error\([^)]*JSON\.stringify\(data\)/);
 assert.match(pub,/HH_REPAIR_REMOTE_REF VERIFIED /);
 assert.match(pub,/force:false/);
 // Publication authority remains only in the trusted existing publisher.
 assert.match(pub,/permissions:\n      contents: write/);
 const isolated=flow.slice(flow.indexOf('\n  code_fix:\n'),flow.indexOf('\n  publish:\n'));
 assert.doesNotMatch(isolated,/contents: write/);
});
