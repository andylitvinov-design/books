'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {isRateLimitError,retryAt,selectDeepScan}=require('../scripts/ci-pr-api-budget.cjs');
test('rate-limit 403 and 429 do not mask permission denials',()=>{
 assert.equal(isRateLimitError({status:403,message:'API rate limit exceeded'}),true);
 assert.equal(isRateLimitError({status:429,message:'secondary rate limit'}),true);
 assert.equal(isRateLimitError({status:403,message:'Resource not accessible by integration'}),false);
 assert.equal(isRateLimitError({status:403,response:{headers:{'x-ratelimit-remaining':'0'}}}),true);
 assert.equal(isRateLimitError({status:500,message:'rate limit exceeded'}),false);
});
test('quota recovery respects retry-after and reset headers',()=>{
 const now=1700000000000;
 assert.equal(retryAt({response:{headers:{'x-ratelimit-reset':String(now/1000+200)}}},now),new Date(now+210000).toISOString());
 assert.equal(retryAt({response:{headers:{'retry-after':'100'}}},now),new Date(now+100000).toISOString());
});
test('hourly fallback rotates all PRs while keeping 12 recent fast',()=>{
 const list=Array.from({length:180},(_,i)=>({number:i+1,updated_at:new Date(i*1000).toISOString()}));
 const seen=new Set(),start=200*3600000;
 for(let h=0;h<9;h++){
  const batch=selectDeepScan(list,start+h*3600000);
  assert.equal(batch.length,36);
  assert.equal(new Set(batch.map(x=>x.number)).size,36);
  for(const x of batch)seen.add(x.number);
  for(let i=169;i<=180;i++)assert.ok(batch.some(x=>x.number===i));
 }
 assert.equal(seen.size,180);
});
test('short and empty inventories are complete',()=>{
 assert.deepEqual(selectDeepScan([],0),[]);
 assert.equal(selectDeepScan([{number:1},{number:2}],0).length,2);
 assert.throws(()=>selectDeepScan([],0,{limit:0}),/Invalid/);
});
