'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {DEFAULT_MODEL,MODEL_PROFILES,chooseVerifiedFreeModel,selectedModel,verifyZeroPrice,responseShape,safeResponseDiagnostics,extractAssistantText,requestFreePatch}=
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
  assert.equal(body.n,1,'exactly one completion choice is requested');
  assert.equal(body.tools,undefined);
  assert.equal(body.models,undefined);
  assert.equal(calls[1].headers.Authorization,'Bearer test-key');
  assert.doesNotMatch(calls[1].body,/test-key/);
});
test('priced catalog, 429, wrong model, paid usage and invalid reply fail closed',async()=>{
  const cases=[
    [response({data:[entry({prompt:'0.001',completion:'0'})]}),response({}),/NO_VERIFIED_FREE_MODEL/,1],
    [response({data:[entry()]}),response({},429),/QUOTA_EXHAUSTED/,2],
    [response({data:[entry()]}),response({model:'paid/model',choices:[{message:{content:'patch'}}]}),/MODEL_MISMATCH/,2],
    [response({data:[entry()]}),response({model:DEFAULT_MODEL,usage:{cost:0.01},choices:[{message:{content:'patch'}}]}),/BILLING_NONZERO/,2],
    [response({data:[entry()]}),response({model:DEFAULT_MODEL,usage:{cost:null},choices:[{message:{content:'patch'}}]}),/BILLING_UNVERIFIED/,2],
    [response({data:[entry()]}),response({model:DEFAULT_MODEL,usage:{cost:0},choices:[]}),/RESPONSE_CHOICE_COUNT_INVALID/,2],
  ];
  for(const [catalog,completion,re,expected] of cases){
    const {calls,fetchImpl}=mocked(catalog,completion);
    await assert.rejects(requestFreePatch({prompt:'test',key:'fixture',fetchImpl}),re);
    assert.equal(calls.length,expected);
  }
});


test('named free coding routes prioritize specialization, not catalog usage popularity',()=>{
 assert.equal(DEFAULT_MODEL,'cohere/north-mini-code:free');
 assert.deepEqual(MODEL_PROFILES.repair.slice(0,3),
  ['recursive/flint-v1.0:free','nvidia/nemotron-3-ultra-550b-a55b:free',
   'cohere/north-mini-code:free']);
 assert.equal(MODEL_PROFILES.architecture[0],'nvidia/nemotron-3-ultra-550b-a55b:free');
 assert.equal(MODEL_PROFILES.visual[0],'nvidia/nemotron-3.5-super-vl:free');
 assert.ok(Object.values(MODEL_PROFILES).every(profile=>profile.every(
   candidate=>selectedModel(candidate)===candidate)));
});
test('one preflight catalog selects next verified free code model; one inference, zero billing',async()=>{
 const second=MODEL_PROFILES.repair[1],picked=[];
 const calls=[];
 const fetchImpl=async(url,args)=>{
  calls.push({url,args});
  if(calls.length===1)return response({data:[
   entry({prompt:'0.01',completion:'0'}),
   {...entry(),id:second}
  ]});
  return response({model:second,usage:{cost:0},choices:[{message:{content:'diff --git a/a b/a'}}]});
 };
 const patch=await requestFreePatch({prompt:'public technical context',key:'fixture',
  fetchImpl,onVerifiedModel:item=>picked.push(item)});
 assert.match(patch,/diff --git/);
 assert.equal(calls.length,2);
 assert.deepEqual(picked,[{model:second,zeroCost:true,role:'repair',selection:'ranked_catalog',
   provider:'openrouter',model_version:null,catalog_created:null}]);
 const body=JSON.parse(calls[1].args.body);
 assert.equal(body.model,second);
 assert.deepEqual(body.usage,{include:true});
 assert.equal(body.models,undefined);
 assert.equal(body.tools,undefined);
 assert.equal(body.provider.allow_fallbacks,false);
});
test('explicit pin cannot silently fallback and unknown roles fail before inference',async()=>{
 const candidate=MODEL_PROFILES.repair[0],calls=[];
 const onlyFallback=response({data:[{...entry(),id:MODEL_PROFILES.repair[1]}]});
 const fetchImpl=async(url)=>{
  calls.push(url);return onlyFallback;
 };
 await assert.rejects(requestFreePatch({prompt:'p',key:'fixture',model:candidate,fetchImpl}),
   /MODEL_NOT_IN_CATALOG/);
 assert.equal(calls.length,1);
 assert.throws(()=>chooseVerifiedFreeModel({data:[]},{role:'not-a-role'}),/ROLE_UNKNOWN/);
 await assert.rejects(requestFreePatch({prompt:'p',key:'fixture',model:'not-free',fetchImpl}),
   /MODEL_NOT_EXPLICIT_FREE/);
 assert.equal(calls.length,1);
});
test('429 and missing or nonzero real response cost stop without retry',async()=>{
 const model=MODEL_PROFILES.repair[0],catalog=response({data:[{...entry(),id:model}]});
 for(const result of [
  response({},429),
  response({model,usage:{},choices:[{message:{content:'patch'}}]}),
  response({model,usage:{cost:0.01},choices:[{message:{content:'patch'}}]})
 ]){
  let count=0;
  const fetchImpl=async()=>++count===1?catalog:result;
  await assert.rejects(requestFreePatch({prompt:'p',key:'fixture',fetchImpl}),
   /QUOTA_EXHAUSTED|BILLING_UNVERIFIED|BILLING_NONZERO/);
  assert.equal(count,2,'no LLM fallback or paid retry after attempted inference');
 }
});


test('one rejected provider HTTP response remains classified without retry or leaking body',async()=>{
 const model=MODEL_PROFILES.repair[0],catalog=response({data:[{...entry(),id:model}]});
 for(const status of [400,401,402,403,404,422,500,503]){
  let count=0;
  const fetchImpl=async()=>++count===1?catalog:response({secret:'PRIVATE_PROVIDER_BODY'},status);
  await assert.rejects(requestFreePatch({prompt:'safe-source',key:'fixture',fetchImpl}),
   new RegExp('FREE_AI_OPENROUTER_HTTP_'+status));
  assert.equal(count,2,'one catalog read and one attempted free inference; no retries');
 }
});
test('repair picks catalog-confirmed free Flint before rejected Nvidia, still caps pricing at zero',async()=>{
 const names=MODEL_PROFILES.repair;
 assert.equal(names[0],'recursive/flint-v1.0:free');
 const catalog={data:[
  {...entry(),id:names[1]},
  {...entry(),id:names[0]}
 ]};
 assert.equal(chooseVerifiedFreeModel(catalog,{role:'repair',model:'auto'}).model,names[0]);
 const priced={data:[{...entry({prompt:'0.1',completion:'0'}),id:names[0]},
   {...entry(),id:names[1]}]};
 assert.equal(chooseVerifiedFreeModel(priced,{role:'repair',model:'auto'}).model,names[1],
  'only verified zero-price choices can be selected before inference');
});
test('structured OpenRouter text blocks normalize to a bounded patch while unsupported blocks fail closed',()=>{
 const blocks=[
  {type:'text',text:'diff --git a/a.js b/a.js\n'},
  {type:'output_text',text:'@@ -1 +1 @@\n-old\n+new'}
 ];
 assert.equal(extractAssistantText(blocks),
  'diff --git a/a.js b/a.js\n\n@@ -1 +1 @@\n-old\n+new');
 assert.equal(extractAssistantText('plain patch'),'plain patch');
 assert.throws(()=>extractAssistantText([{type:'refusal',text:'declined'}]),/MODEL_REFUSED/);
 assert.throws(()=>extractAssistantText([{type:'image_url',image_url:{}}]),/PATCH_RESPONSE_INVALID/);
 assert.throws(()=>extractAssistantText([{type:'text',text:'  '}]),/PATCH_RESPONSE_EMPTY/);
 assert.throws(()=>extractAssistantText('x'.repeat(40001)),/PATCH_RESPONSE_TOO_LARGE/);
});

test('one zero-cost OpenRouter inference accepts structured text and rejects truncated/tool output',async()=>{
 const catalog=response({data:[entry()]});
 const structured=response({model:DEFAULT_MODEL,usage:{cost:0},
  choices:[{finish_reason:'stop',message:{role:'assistant',content:[
   {type:'text',text:'diff --git a/a.js b/a.js\n'},
   {type:'text',text:'@@ -1 +1 @@\n-old\n+new'}
  ]}}]});
 let count=0;
 const fetchImpl=async()=>++count===1?catalog:structured;
 const patch=await requestFreePatch({prompt:'safe bounded repair',key:'fixture',fetchImpl});
 assert.equal(patch,'diff --git a/a.js b/a.js\n\n@@ -1 +1 @@\n-old\n+new');
 assert.equal(count,2,'catalog plus exactly one inference request');
 for(const choice of [
  {finish_reason:'length',message:{role:'assistant',content:'partial'}},
  {finish_reason:'tool_calls',message:{role:'assistant',content:null,tool_calls:[{id:'x'}]}}
 ]){
  let calls=0;
  const fetch=async()=>++calls===1?catalog:response({model:DEFAULT_MODEL,usage:{cost:0},choices:[choice]});
  await assert.rejects(requestFreePatch({prompt:'p',key:'fixture',fetchImpl:fetch}),
   /TRUNCATED|TOOL_CALL_NOT_ALLOWED/);
  assert.equal(calls,2,'never retries a refused or unsupported completion');
 }
});


test('refusal metadata, mixed text/non-text content and tool finish reasons fail closed',()=>{
 assert.throws(()=>extractAssistantText([
  {type:'text',text:'diff --git a/a.js b/a.js\\n'},
  {type:'image_url',image_url:{url:'https://example.invalid/image'}}
 ]),/PATCH_RESPONSE_INVALID/);
});

test('provider error envelopes are classified before missing model or billing metadata',async()=>{
 let count=0;
 const fetchImpl=async()=>++count===1
  ? response({data:[entry()]})
  : response({error:{message:'provider unavailable'}});
 await assert.rejects(requestFreePatch({prompt:'p',key:'fixture',fetchImpl}),
  /FREE_AI_OPENROUTER_PROVIDER_ERROR/);
 assert.equal(count,2,'exactly one inference attempt, no paid or alternate-model retry');
});

test('completion refusal and tool-routing finish reasons are never treated as text patches',async()=>{
 const catalog=response({data:[entry()]});
 for(const choice of [
  {finish_reason:'stop',message:{role:'assistant',refusal:'cannot comply',content:'NO_SAFE_PATCH'}},
  {finish_reason:'tool_calls',message:{role:'assistant',content:'diff --git a/a.js b/a.js'}},
  {finish_reason:'function_call',message:{role:'assistant',content:'diff --git a/a.js b/a.js'}}
 ]){
  let calls=0;
  const fetchImpl=async()=>++calls===1?catalog:response({
   model:DEFAULT_MODEL,usage:{cost:0},choices:[choice]
  });
  await assert.rejects(requestFreePatch({prompt:'p',key:'fixture',fetchImpl}),
   /MODEL_REFUSED|TOOL_CALL_NOT_ALLOWED/);
  assert.equal(calls,2,'no retry after an unsupported completion');
 }
});


test('response diagnostics expose shape only, without prompt, completion or source values',()=>{
 const completion={id:'opaque',model:DEFAULT_MODEL,usage:{cost:0},
  choices:[{finish_reason:'stop',message:{role:'assistant',content:null}}]};
 const shape=responseShape(completion);
 assert.deepEqual(shape.top_level_keys,['choices','id','model','usage']);
 assert.equal(shape.choices_count,1);
 assert.equal(shape.finish_reason,'stop');
 assert.deepEqual(shape.message_keys,['content','role']);
 assert.equal(shape.content_type,'null');
 assert.equal(Object.hasOwn(shape,'content'),false);
 assert.equal(Object.hasOwn(shape,'prompt'),false);
});

test('single structured text object is normalized while unsupported block objects fail closed',()=>{
 assert.equal(extractAssistantText({type:'text',text:'diff --git a/a.js b/a.js'}),
  'diff --git a/a.js b/a.js');
 assert.throws(()=>extractAssistantText({type:'image',url:'redacted'}),
  /PATCH_RESPONSE_INVALID/);
});

test('verified model receipt precedes inference and malformed replies get precise failure reasons',async()=>{
 const catalog=response({data:[{...entry(),created:1794260000,version:'catalog-v1'}]});
 const events=[];let calls=0;
 const fetchImpl=async()=>{if(++calls===1)return catalog;events.push('inference');
  return response({model:DEFAULT_MODEL,usage:{cost:0},choices:[{finish_reason:'stop',message:{role:'assistant',content:'patch'}}]});};
 assert.equal(await requestFreePatch({prompt:'p',key:'fixture',fetchImpl,onVerifiedModel:r=>events.push(r)}),'patch');
 assert.equal(events[0].model,DEFAULT_MODEL);assert.equal(events[0].provider,'openrouter');
 assert.equal(events[0].model_version,'catalog-v1');assert.equal(events[0].catalog_created,1794260000);
 assert.equal(events[1],'inference');
 for(const [body,reason] of [
  [{model:DEFAULT_MODEL,usage:{cost:0},choices:[]},/CHOICE_COUNT_INVALID/],
  [{model:DEFAULT_MODEL,usage:{cost:0},choices:[{message:null}]},/MESSAGE_INVALID/],
  [{model:DEFAULT_MODEL,usage:{cost:0},choices:[{finish_reason:'max_tokens',message:{content:'partial'}}]},/TRUNCATED/],
  [{model:DEFAULT_MODEL,usage:{cost:0},choices:[{finish_reason:'content_filter',message:{content:''}}]},/MODEL_REFUSED/],
  [{model:DEFAULT_MODEL,usage:{cost:0},choices:[{finish_reason:'tool_calls',message:{tool_calls:[{}]}}]},/TOOL_CALL_NOT_ALLOWED/]
 ]){let n=0;const fetch=async()=>++n===1?catalog:response(body);
  await assert.rejects(requestFreePatch({prompt:'p',key:'fixture',fetchImpl:fetch}),reason);assert.equal(n,2);}
});


test('reasoning blocks are excluded while actual patch text remains usable',()=>{
 const patch='diff --git a/a.js b/a.js\n@@ -1 +1 @@\n-old\n+new';
 assert.equal(extractAssistantText([
  {type:'reasoning',text:'internal reasoning must not become a patch'},
  {type:'text',text:patch}
 ]),patch);
 assert.throws(()=>extractAssistantText([
  {type:'reasoning',text:'reasoning only'}
 ]),/REASONING_ONLY/);
 assert.throws(()=>extractAssistantText([
  {type:'image_url',image_url:{url:'https://invalid.example/image'}}
 ]),/PATCH_RESPONSE_INVALID/);
});


test('repair uses one text-only free request and makes the patch contract explicit',async()=>{
 const catalog=response({data:[entry()]});
 const patch='diff --git a/components/a.tsx b/components/a.tsx\n'+
  '--- a/components/a.tsx\n+++ b/components/a.tsx\n@@ -1 +1 @@\n-old\n+new\n';
 const {calls,fetchImpl}=mocked(catalog,response({
  model:DEFAULT_MODEL,usage:{cost:0},choices:[{finish_reason:'stop',message:{role:'assistant',content:patch}}]
 }));
 const text=await requestFreePatch({prompt:'safe-source-only',key:'fixture',fetchImpl});
 assert.equal(text,patch);
 assert.equal(calls.length,2,'no hidden model retries');
 const payload=JSON.parse(calls[1].body);
 assert.deepEqual(payload.modalities,['text']);
 assert.equal(payload.reasoning,undefined,
   'never force reasoning:false for mandatory-reasoning free models');
 assert.equal(payload.messages[0].role,'system');
 assert.match(payload.messages[0].content,/unified git diff/);
 assert.equal(payload.messages[1].content,'safe-source-only');
 assert.equal(payload.models,undefined);
 assert.equal(payload.tools,undefined);
 assert.equal(payload.provider.allow_fallbacks,false);
 assert.equal(payload.provider.max_price.prompt,0);
 assert.equal(payload.provider.max_price.completion,0);
 const {validatePatch}=require('../scripts/ci-pr-repair-free-agent.cjs');
 assert.equal(validatePatch(text,{files:['components/a.tsx']}),patch);
 assert.throws(()=>validatePatch('The fix is to change something',{files:['components/a.tsx']}),
   /FREE_AI_/);
});

test('mandatory-reasoning free Flint gets one compatible zero-price request, no paid retry',async()=>{
 const model='recursive/flint-v1.0:free',calls=[];
 const catalog=response({data:[{...entry(),id:model}]});
 const patch='diff --git a/components/a.tsx b/components/a.tsx\n';
 const fetchImpl=async(url,args)=>{
  calls.push({url,...args});
  return calls.length===1?catalog:response({model,usage:{cost:0},
   choices:[{finish_reason:'stop',message:{role:'assistant',content:patch,
     reasoning:'private reasoning must never become a patch'}}]});
 };
 const actual=await requestFreePatch({prompt:'public exact-head source',key:'fixture',fetchImpl});
 assert.equal(actual,patch);
 assert.equal(calls.length,2,'one catalog read + exactly one model request');
 const request=JSON.parse(calls[1].body);
 assert.equal(request.model,model);
 assert.equal(request.reasoning,undefined);
 assert.deepEqual(request.modalities,['text']);
 assert.equal(request.max_tokens,5500);
 assert.equal(request.n,1);
 assert.equal(request.stream,false);
 assert.equal(request.tools,undefined);
 assert.equal(request.provider.allow_fallbacks,false);
 assert.deepEqual(request.provider.max_price,{prompt:0,completion:0});
 assert.equal(request.provider.data_collection,'deny');
});

test('provider text-value envelopes work without treating reasoning as source',()=>{
 const patch='diff --git a/components/a.tsx b/components/a.tsx';
 assert.equal(extractAssistantText({type:'output_text',text:{value:patch}}),patch);
 assert.equal(extractAssistantText([
  {type:'reasoning_details',text:'private reasoning must not become patch'},
  {type:'output_text',text:{value:patch}}
 ]),patch);
 assert.throws(()=>extractAssistantText(null),/PATCH_RESPONSE_NULL/);
 assert.throws(()=>extractAssistantText(null,{hasReasoning:true}),/REASONING_ONLY/);
 assert.throws(()=>extractAssistantText([{type:'reasoning',text:'private chain'}]),/REASONING_ONLY/);
 assert.throws(()=>extractAssistantText([{type:'tool_result',text:patch}]),/PATCH_RESPONSE_INVALID/);
 assert.throws(()=>extractAssistantText({type:'output_text',text:{unexpected:patch}}),/PATCH_RESPONSE_INVALID/);
});

test('one failing OpenRouter response persists only redacted shape and exact failure class',async()=>{
 const catalog=response({data:[entry()]});
 for(const [message,reason] of [
  [{role:'assistant',content:null,reasoning:'SECRET_PRIVATE_REASONING'},/REASONING_ONLY/],
  [{role:'assistant',content:null},/PATCH_RESPONSE_NULL/],
  [{role:'assistant',content:[{type:'output_text',text:'  '}]},/PATCH_RESPONSE_EMPTY/]
 ]){
  const shapes=[];
  const {calls,fetchImpl}=mocked(catalog,response({model:DEFAULT_MODEL,
   usage:{cost:0},choices:[{finish_reason:'stop',message}]}));
  await assert.rejects(requestFreePatch({prompt:'secret source here',key:'secret-token',
    fetchImpl,onResponseShape:shape=>shapes.push(shape)}),reason);
  assert.equal(calls.length,2,'invalid output must not cause extra inference');
  assert.equal(shapes.length,1);
  assert.equal(shapes[0].schema,'HH_OPENROUTER_RESPONSE_SHAPE_V1');
  const serialized=JSON.stringify(shapes[0]);
  assert.doesNotMatch(serialized,/SECRET_PRIVATE_REASONING|secret source here|secret-token/);
  assert.equal(Object.hasOwn(shapes[0],'content'),false);
  assert.equal(Object.hasOwn(shapes[0],'prompt'),false);
 }
});

test('bounded response diagnostics contain only response categories and no provider keys',()=>{
 const sample={sensitive_source_snippet:'SECRET_TEXT',choices:[{finish_reason:'untrusted SECRET',
  message:{role:'assistant',content:[{type:'reasoning',text:'SECRET_CHAIN'},
   {type:'output_text',text:{value:'SECRET_SOURCE'}}],reasoning:'SECRET_REASON',
   tool_calls:[]}}]};
 const shape=safeResponseDiagnostics(sample);
 assert.deepEqual(shape,{
  schema:'HH_OPENROUTER_RESPONSE_SHAPE_V1',choices_count:1,finish_reason:'other',
  content_type:'array',content_parts:2,text_parts:1,
  reasoning_present:true,tool_calls_present:false
 });
 assert.doesNotMatch(JSON.stringify(shape),/SECRET_TEXT|SECRET_CHAIN|SECRET_SOURCE|SECRET_REASON/);
});


test('explicit $0 free router uses proven portable request and independently proves actual model',async()=>{
 const {FREE_ROUTER_MODEL}=require('../scripts/ci-pr-repair-openrouter-free.cjs');
 const patch='diff --git a/components/a.tsx b/components/a.tsx\n';
 const {calls,fetchImpl}=mocked(response({data:[entry()]}),response({
  model:DEFAULT_MODEL,usage:{cost:0,is_byok:false,cost_details:{upstream_inference_cost:0}},
  choices:[{finish_reason:'stop',message:{role:'assistant',content:patch}}]}));
 const selected=[];
 assert.equal(await requestFreePatch({prompt:'one safe line',key:'fixture',
  model:FREE_ROUTER_MODEL,fetchImpl,onVerifiedModel:x=>selected.push(x)}),patch);
 assert.equal(calls.length,2,'never fan out inference calls');
 assert.equal(selected.length,1);
 assert.equal(selected[0].model,FREE_ROUTER_MODEL);
 assert.equal(selected[0].zeroCost,true);
 const req=JSON.parse(calls[1].body);
 assert.equal(req.model,FREE_ROUTER_MODEL);
 assert.equal(req.max_tokens,2200);
 for(const field of ['modalities','reasoning','n','tools','models'])
  assert.equal(req[field],undefined,'router must use portable text chat');
 assert.deepEqual(req.provider,{allow_fallbacks:false,
  max_price:{prompt:0,completion:0},data_collection:'deny'});
 assert.deepEqual(req.usage,{include:true});
 assert.equal(calls[1].headers.Authorization,'Bearer fixture');
 assert.doesNotMatch(calls[1].body,/fixture/);
});

test('free router rejects unknown, paid or mismatched runtime models and billing',async()=>{
 const {FREE_ROUTER_MODEL}=require('../scripts/ci-pr-repair-openrouter-free.cjs');
 const catalog=response({data:[entry()]});
 for(const completion of [
  {model:'openai/gpt-6',usage:{cost:0},choices:[{message:{content:'patch'}}]},
  {model:'openrouter/free',usage:{cost:0},choices:[{message:{content:'patch'}}]},
  {model:DEFAULT_MODEL,usage:{cost:0.01},choices:[{message:{content:'patch'}}]},
  {model:DEFAULT_MODEL,usage:{},choices:[{message:{content:'patch'}}]},
  {model:DEFAULT_MODEL,usage:{cost:0,is_byok:true},choices:[{message:{content:'patch'}}]}
 ]){
  let calls=0;
  const fetchImpl=async()=>++calls===1?catalog:response(completion);
  await assert.rejects(requestFreePatch({prompt:'p',key:'fixture',
   model:FREE_ROUTER_MODEL,fetchImpl}),/FREE_ROUTER_MODEL_UNVERIFIED|BILLING_NONZERO|BILLING_UNVERIFIED/);
  assert.equal(calls,2,'no retry after a failed actual-model or price proof');
 }
 let calls=0;
 const fetchImpl=async()=>{calls++;return response({data:[]});};
 await assert.rejects(requestFreePatch({prompt:'p',key:'fixture',model:FREE_ROUTER_MODEL,
  fetchImpl}),/NO_VERIFIED_FREE_MODEL/);
 assert.equal(calls,1,'no inference when free catalog preflight is empty');
});

test('router HTTP 400 is diagnosed precisely and never falls back to a paid model',async()=>{
 const {FREE_ROUTER_MODEL}=require('../scripts/ci-pr-repair-openrouter-free.cjs');
 let calls=0;
 const fetchImpl=async()=>++calls===1
  ?response({data:[entry()]})
  :response({private:'provider body must not leak'},400);
 await assert.rejects(requestFreePatch({prompt:'p',key:'fixture',
  model:FREE_ROUTER_MODEL,fetchImpl}),/FREE_AI_OPENROUTER_HTTP_400/);
 assert.equal(calls,2);
});
