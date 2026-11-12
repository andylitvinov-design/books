import test from 'node:test';
import assert from 'node:assert/strict';
import {GEMINI_CLASSIFIER_FREE_MODEL,verifiedGeminiClassifierFreeGate,shouldTryGeminiFallback,classifyGeminiFreePublicMetadata}
 from '../lib/automations/gemini-classifier-free.mjs';
const ID='726e9610-8e79-4ff1-b463-32953ea7bc27';
const rows=[{candidate_id:ID,title:'Peaceful sunset ocean waves',category:'stress-anxiety',source_query:'slow ocean waves',mime:'video/webm'}];
const env={HH_FIRST_VIDEO_GEMINI_FREE_CONFIRMED:'true',HH_COUNCIL_GEMINI_API_KEY:'fake_key_for_unit_tests_only'};
const results={results:[{id:ID,goals:['stress'],confidence:'medium',summary:'Calm ocean landscape metadata.',warnings:[]}]};
const success={ok:true,async json(){return{modelVersion:GEMINI_CLASSIFIER_FREE_MODEL,usageMetadata:{totalTokenCount:120},
 candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(results)}]}}]}}};
test('requires owner-confirmed existing Free Tier, even with a present API key',()=>{
 assert.equal(verifiedGeminiClassifierFreeGate({HH_COUNCIL_GEMINI_API_KEY:env.HH_COUNCIL_GEMINI_API_KEY}),false);
 assert.equal(verifiedGeminiClassifierFreeGate({...env,HH_FIRST_VIDEO_GEMINI_FREE_CONFIRMED:'false'}),false);
 assert.equal(verifiedGeminiClassifierFreeGate(env),true);
});
test('missing attestation cannot make even one request',async()=>{
 let requests=0;const r=await classifyGeminiFreePublicMetadata(rows,{env:{HH_COUNCIL_GEMINI_API_KEY:env.HH_COUNCIL_GEMINI_API_KEY},fetcher:()=>{requests++}});
 assert.equal(r.status,'disabled');assert.equal(requests,0);assert.equal(r.apiCalls,0);
});
test('one exact-model JSON response can classify untrusted public metadata without rights approval',async()=>{
 let requests=0;
 const r=await classifyGeminiFreePublicMetadata(rows,{env,fetcher:async(url,opt)=>{
   requests++;
   assert.equal(url,'https://generativelanguage.googleapis.com/v1beta/models/'+GEMINI_CLASSIFIER_FREE_MODEL+':generateContent');
   assert.equal(opt.method,'POST');assert.equal(opt.redirect,'error');
   const sent=JSON.parse(opt.body);
   assert.equal(sent.generationConfig.responseMimeType,'application/json');
   assert.equal(sent.contents[0].parts[0].text.includes(ID),true);
   assert.equal(sent.contents[0].parts[0].text.includes('research_only'),true);
   assert.equal(sent.systemInstruction.parts[0].text.includes('rights approvals'),true);
   return success;
 }});
 assert.equal(requests,1);assert.equal(r.status,'ok');assert.equal(r.priceVerified,false);
 assert.equal(r.freeTierAttested,true);assert.equal(r.model,GEMINI_CLASSIFIER_FREE_MODEL);
 assert.equal(r.results[0].candidateId,ID);assert.equal(r.results[0].reviewRequired,true);
});
test('an explicit quota error pauses rather than retrying or switching to paid',async()=>{
 let calls=0;const r=await classifyGeminiFreePublicMetadata(rows,{env,fetcher:async()=>{calls++;return{ok:false,status:429}}});
 assert.equal(r.status,'quota_paused');assert.equal(r.reason,'GEMINI_FREE_QUOTA_429');assert.equal(calls,1);
});
test('model mismatch and missing usage proof reject a seemingly successful response',async()=>{
 for(const mismatch of [
 {modelVersion:'gemini-3.5-flash',usageMetadata:{totalTokenCount:10},candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(results)}]}}]},
 {modelVersion:GEMINI_CLASSIFIER_FREE_MODEL,candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(results)}]}}]},
 ]){
  const r=await classifyGeminiFreePublicMetadata(rows,{env,fetcher:async()=>({ok:true,json:async()=>mismatch})});
  assert.equal(r.status,'failed');assert.equal(r.apiCalls,1);
 }
});
test('unknown candidate and attempted instruction injection cannot add any annotation',async()=>{
 const bad={...results,results:[{...results.results[0],id:'a0f067df-e947-4b8e-a37b-0a0d88d872ae'}]};
 const r=await classifyGeminiFreePublicMetadata(rows,{env,fetcher:async()=>({ok:true,json:async()=>({
  modelVersion:GEMINI_CLASSIFIER_FREE_MODEL,usageMetadata:{totalTokenCount:50},
  candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(bad)}]}}],
 })})});
 assert.equal(r.status,'failed');assert.equal(r.reason,'GEMINI_OUTPUT_INVALID');
});
test('ambiguous network error cannot trigger a second request',async()=>{
 let calls=0;const r=await classifyGeminiFreePublicMetadata(rows,{env,fetcher:()=>{calls++;throw Error('timeout')}});
 assert.equal(r.status,'failed');assert.equal(calls,1);
});

test('exact rejected OpenRouter 429 is the only legal reason to try Gemini',()=>{
 assert.equal(shouldTryGeminiFallback({status:'quota_paused',reason:'MODEL_HTTP_429'},env),true);
 for(const result of [
   {status:'quota_paused',reason:'MODEL_HTTP_402'},
   {status:'failed',reason:'MODEL_HTTP_429'},
   {status:'quota_paused',reason:'PROVIDER_NETWORK_TIMEOUT'},
   {status:'ok',reason:'MODEL_HTTP_429'},null,{},
 ])assert.equal(shouldTryGeminiFallback(result,env),false);
 assert.equal(shouldTryGeminiFallback({status:'quota_paused',reason:'MODEL_HTTP_429'},{}),false);
});
