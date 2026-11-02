'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {classify,resetAt,createQuotaGuard}=require('../scripts/ci-pr-api-quota.cjs');
test('rate-limit 403 is not an ACL rejection',()=>{
 assert.equal(classify({status:403,message:'Resource not accessible by integration'}),null);
 assert.equal(classify({status:403,message:'API rate limit exceeded'}),'RATE_LIMIT');
 assert.equal(classify({status:403,message:'secondary rate limit'}),'RATE_LIMIT');
 assert.equal(classify({status:429,message:'slow down'}),'RATE_LIMIT');
});
test('Retry-After and primary reset headers are honored',()=>{
 assert.equal(resetAt({response:{headers:{'retry-after':'45'}}},1000),46000);
 assert.equal(resetAt({response:{headers:{'x-ratelimit-reset':'1800000000'}}},1000),1800000000000);
});
test('rate limited operation pauses subsequent reads and writes',async()=>{
 const q=createQuotaGuard({now:()=>1000});
 await assert.rejects(q.limited('first',async()=>{throw {status:403,message:'API rate limit exceeded',
  response:{headers:{'retry-after':'60'}}};}));
 assert.equal(q.state.reason,'GITHUB_RATE_LIMIT');
 assert.equal(q.state.retryAt,new Date(61000).toISOString());
 let calls=0;
 await assert.rejects(q.limited('second',async()=>{calls++;}),/HH_API_PAUSED/);
 assert.equal(calls,0);
});
test('remaining quota reserve pauses without granting any merge approval',async()=>{
 const q=createQuotaGuard({minRemaining:100});
 await q.limited('read',async()=>({headers:{'x-ratelimit-remaining':'99'}}));
 assert.equal(q.state.paused,true);
 assert.equal(q.state.reason,'GITHUB_RATE_RESERVE');
 await assert.rejects(q.limited('write',async()=>{}),/HH_API_PAUSED/);
});
test('normal 403 does not poison the entire cycle',async()=>{
 const q=createQuotaGuard();
 await assert.rejects(q.limited('read',async()=>{throw {status:403,message:'Forbidden'};}));
 assert.equal(q.state.paused,false);
 await q.limited('next',async()=>({data:true}));
 assert.equal(q.state.requests,2);
});
