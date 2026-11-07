'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {DEFAULT_MODEL,selectedModel,verifyZeroPrice,requestFreePatch}=
  require('../scripts/ci-pr-repair-openrouter-free.cjs');
const entry=(pricing={prompt:'0',completion:'0'})=>({id:DEFAULT_MODEL,pricing,
  architecture:{input_modalities:['text'],output_modalities:['text']}});
const response=(body,status=200)=>({ok:status===200,status,
  text:async()=>JSON.stringify(body)});
function mocked(catalog,completion){
  const calls=[];
  const fetchImpl=async(url,args)=>{
    calls.push({url,...args});
    return calls.length===1?catalog:completion;
  };
  return {calls,fetchImpl};
}
test('model must use exact :free slug; catalog prices and output are verified',()=>{
  assert.equal(selectedModel(DEFAULT_MODEL),DEFAULT_MODEL);
  for(const model of ['openrouter/free','openai/gpt-6','openai/gpt-6:floor',
    'openai/gpt-6:free:paid','',null])
    assert.throws(()=>selectedModel(model),/NOT_EXPLICIT_FREE/);
  assert.deepEqual(verifyZeroPrice({data:[entry()]},DEFAULT_MODEL),
    {model:DEFAULT_MODEL,zeroCost:true});
  for(const pricing of [{prompt:'0',completion:'0.01'},
    {prompt:'0'},{prompt:'0',completion:null},
    {prompt:'0',completion:'0',input_cache_read:'0.02'}])
    assert.throws(()=>verifyZeroPrice({data:[entry(pricing)]},DEFAULT_MODEL));
  assert.throws(()=>verifyZeroPrice({data:[]},DEFAULT_MODEL),/MODEL_NOT_IN_CATALOG/);
  assert.throws(()=>verifyZeroPrice({data:[entry(),entry()]},DEFAULT_MODEL));
  // Real OpenRouter catalog entries need not include endpoints; the GET
  // request filters by chat/completions and the model remains text-only.
  assert.deepEqual(verifyZeroPrice({data:[entry()]},DEFAULT_MODEL),
    {model:DEFAULT_MODEL,zeroCost:true});
  assert.throws(()=>verifyZeroPrice({data:[{...entry(),endpoints:['/api/v1/embeddings']}]},DEFAULT_MODEL),
    /NOT_TEXT_CHAT/);
  assert.throws(()=>verifyZeroPrice({data:[{...entry(),architecture:{input_modalities:['image'],output_modalities:['text']}}]},DEFAULT_MODEL),
    /NOT_TEXT_CHAT/);
});
test('absent key causes no provider requests',async()=>{
  const {calls,fetchImpl}=mocked(response({data:[entry()]}),response({}));
  await assert.rejects(requestFreePatch({prompt:'test',key:'',fetchImpl}),/KEY_NOT_CONFIGURED/);
  assert.equal(calls.length,0);
});
test('only one $0 pinned inference, without fallbacks or write tools',async()=>{
  const patch='diff --git a/components/a.tsx b/components/a.tsx\n';
  const {calls,fetchImpl}=mocked(response({data:[entry()]}),response({
    model:DEFAULT_MODEL,usage:{cost:0},choices:[{message:{content:patch}}]}));
  const text=await requestFreePatch({prompt:'safe public diagnostics',key:'test-key',fetchImpl});
  assert.equal(text,patch);
  assert.equal(calls.length,2);
  assert.equal(calls[0].url,'https://openrouter.ai/api/v1/models?endpoints=%2Fapi%2Fv1%2Fchat%2Fcompletions');
  assert.equal(calls[0].headers.Authorization,undefined);
  const body=JSON.parse(calls[1].body);
  assert.deepEqual(body.provider,{allow_fallbacks:false,max_price:{prompt:0,completion:0},
    data_collection:'deny'});
  assert.equal(body.model,DEFAULT_MODEL);
  assert.equal(body.tools,undefined);
  assert.equal(body.models,undefined);
  assert.equal(calls[1].headers.Authorization,'Bearer test-key');
  assert.doesNotMatch(calls[1].body,/test-key/);
});
test('priced catalog, 429, wrong model, paid usage and invalid reply fail closed',async()=>{
  const cases=[
    [response({data:[entry({prompt:'0.001',completion:'0'})]}),response({}),/PRICE_NOT_ZERO/,1],
    [response({data:[entry()]}),response({},429),/QUOTA_EXHAUSTED/,2],
    [response({data:[entry()]}),response({model:'paid/model',choices:[{message:{content:'patch'}}]}),/MODEL_MISMATCH/,2],
    [response({data:[entry()]}),response({model:DEFAULT_MODEL,usage:{cost:0.01},choices:[{message:{content:'patch'}}]}),/BILLING_NONZERO/,2],
    [response({data:[entry()]}),response({model:DEFAULT_MODEL,usage:{cost:null},choices:[{message:{content:'patch'}}]}),/BILLING_NONZERO/,2],
    [response({data:[entry()]}),response({model:DEFAULT_MODEL,choices:[]}),/PATCH_RESPONSE_INVALID/,2],
  ];
  for(const [catalog,completion,re,expected] of cases){
    const {calls,fetchImpl}=mocked(catalog,completion);
    await assert.rejects(requestFreePatch({prompt:'test',key:'fixture',fetchImpl}),re);
    assert.equal(calls.length,expected);
  }
});
