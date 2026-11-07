'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {verifyZeroPrice,requestFreePatch,selectedModel,DEFAULT_MODEL}=require('../scripts/ci-pr-repair-openrouter-free.cjs');
const catalog={data:[{id:DEFAULT_MODEL,pricing:{prompt:'0',completion:'0',request:'0'},endpoints:['/api/v1/chat/completions'],architecture:{output_modalities:['text']}}]};
const response=x=>({ok:true,status:200,text:async()=>JSON.stringify(x)});
test('only explicit :free exact catalog price zero',()=>{
 assert.equal(verifyZeroPrice(catalog,DEFAULT_MODEL).zeroCost,true);
 assert.throws(()=>selectedModel('paid/model'),/NOT_EXPLICIT_FREE/);
 assert.throws(()=>verifyZeroPrice({data:[{...catalog.data[0],pricing:{prompt:'0',completion:'0.001'}}]},DEFAULT_MODEL),/PRICE_NOT_ZERO/);
 assert.throws(()=>verifyZeroPrice({data:[{...catalog.data[0],pricing:{prompt:'0',completion:'0',request:'unknown'}}]},DEFAULT_MODEL),/PRICE_UNKNOWN/);
});
test('exactly one zero-priced completion, no fallback',async()=>{
 const calls=[];
 const patch=await requestFreePatch({key:'fake',prompt:'patch',fetchImpl:async(url,opt)=>{calls.push({url,opt});return response(calls.length===1?catalog:{model:DEFAULT_MODEL,choices:[{message:{content:'diff --git a/x b/x'}}],usage:{cost:0}})}});
 assert.equal(patch,'diff --git a/x b/x');
 assert.equal(calls.length,2);
 const body=JSON.parse(calls[1].opt.body);
 assert.equal(body.provider.allow_fallbacks,false);
 assert.deepEqual(body.provider.max_price,{prompt:0,completion:0});
});
test('reject billed response and never retry',async()=>{
 let n=0;
 await assert.rejects(requestFreePatch({key:'fake',prompt:'patch',fetchImpl:async()=>response(++n===1?catalog:{model:DEFAULT_MODEL,choices:[{message:{content:'patch'}}],usage:{cost:1}})}),/BILLING_NONZERO/);
 assert.equal(n,2);
});
