'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {requiredOwnerBudget,requireOwnerRateBudget}=
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
test('existing issuer remains credential isolated and branch/head guarded',()=>{
 const flow=fs.readFileSync('.github/workflows/hh-pr-repair-worker.yml','utf8');
 assert.match(flow,/HH_REPAIR_JOB_TOKEN: \$\{\{ github\.token \}\}/);
 assert.match(flow,/rateGuard\.requiredOwnerBudget\(files\.length\)/);
 assert.match(flow,/rateGuard\.requireOwnerRateBudget\(response\.headers,minRemaining\)/);
 assert.match(flow,/HH_REPAIR_WRITE_CREDENTIAL VERIFIED_REPOSITORY_PUSH/);
 assert.match(flow,/repository\.permissions\?\.push!==true/);
 assert.match(flow,/force:false/);
 assert.match(flow,/Source branch moved before repair commit/);
 assert.match(flow,/HH_REPAIR_REMOTE_REF_UPDATE_NOT_VERIFIED/);
 assert.doesNotMatch(flow,/remaining<100/);
});

test('only trusted publisher job can write source; job token is guarded and CI wake remains',()=>{
 const workflow=fs.readFileSync('.github/workflows/hh-pr-repair-worker.yml','utf8');
 const segment=(name,next)=>{
  const start=workflow.indexOf('\n  '+name+':\n');
  const end=next?workflow.indexOf('\n  '+next+':\n',start+1):workflow.length;
  assert.ok(start>=0&&end>start,'trusted job segment '+name);
  return workflow.slice(start,end);
 };
 for(const [name,next] of [['claim','fix'],['fix','code_fix'],
  ['code_fix','code_verify'],['code_verify','publish']]){
  const untrusted=segment(name,next);
  assert.doesNotMatch(untrusted,/^\s+contents: write\s*$/m);
  assert.doesNotMatch(untrusted,/HH_REPAIR_JOB_TOKEN:|HH_AUTOMERGE_TOKEN:/);
 }
 const publisher=segment('publish','finalize');
 assert.match(publisher,/permissions:\n      contents: write\n      actions: write/);
 assert.match(publisher,/HH_REPAIR_JOB_TOKEN: \$\{\{ github\.token \}\}/);
 assert.doesNotMatch(publisher,/HH_AUTOMERGE_TOKEN:/);
 assert.match(publisher,/rateGuard\.requiredOwnerBudget\(files\.length\)/);
 assert.match(publisher,/repository\.permissions\?\.push!==true/);
 assert.match(publisher,/Source branch moved before repair commit/);
 assert.match(publisher,/force:false/);
 assert.match(publisher,/HH_REPAIR_REMOTE_REF_UPDATE_NOT_VERIFIED/);
 assert.match(publisher,/Verify and recover the next exact-HEAD Core CI wave/);
 assert.match(publisher,/HH_NEXT_CI_FALLBACK_DISPATCHED/);
 assert.match(publisher,/HH_REPAIR_SOURCE_NOT_PUBLISHED/);
});
