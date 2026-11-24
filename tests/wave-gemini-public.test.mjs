import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {waveGeminiPublicTopic,waveGeminiPublicEligibility,waveGeminiPublicQuota,waveGeminiPublicReply} from '../lib/holistic-support/wave-gemini-public.mjs';
const env={HH_WAVE_GEMINI_PUBLIC_ENABLED:'true',HH_WAVE_GEMINI_FREE_BILLING_DISABLED_CONFIRMED:'true',HH_MY_COACH_GEMINI_FREE_ENABLED:'true',HH_MY_COACH_GEMINI_FREE_TIER_CONFIRMED:'true',HH_MY_COACH_GEMINI_FREE_DATA_APPROVED:'true',HH_GEMINI_FREE_API_KEY:'AIza'+'X'.repeat(35)};
test('exact public topic, not personal content or money journey',()=>{
 assert.equal(waveGeminiPublicTopic('Что такое коучинг?','ru'),'coaching');
 assert.equal(waveGeminiPublicTopic('What is the GROW model?','en'),'grow');
 assert.equal(waveGeminiPublicTopic('¿Qué es reiki?','es'),'reiki');
 for(const message of ['Деньги','Что такое коучинг? Меня зовут Иван','what is coaching\nprivate','I want to discuss my anxiety','what is coaching for my divorce'])assert.equal(waveGeminiPublicTopic(message,'en'),null);
 assert.equal(waveGeminiPublicTopic('Что такое коучинг? Меня зовут Иван','ru'),null);
});
test('eligibility requires current verified server attestation',()=>{
 const ok={version:1,adultVerified:true,eligibleRegionVerified:true,publicGeminiConsent:true,expiresAtMs:Date.now()+60000};
 assert.equal(waveGeminiPublicEligibility(ok),true);
 for(const o of [null,{...ok,adultVerified:false},{...ok,publicGeminiConsent:false},{...ok,eligibleRegionVerified:false},{...ok,expiresAtMs:1}])assert.equal(waveGeminiPublicEligibility(o),false);
});
test('only public constants sent once, never history or identity',async()=>{
 let calls=0,reserved=0;
 const out=await waveGeminiPublicReply({message:'What is coaching?',locale:'en',eligible:true,env,history:[{text:'PRIVATE_SECRET'}],reserve:async()=>{reserved++},fetcher:async(url,options)=>{
  calls++;assert.match(url,/gemini-3\.1-flash-lite:generateContent$/);
  assert.equal(options.redirect,'error');assert.ok(!options.body.includes('PRIVATE_SECRET'));assert.ok(!options.body.includes('What is coaching?'));
  return {ok:true,json:async()=>({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({reply:'Coaching is a structured conversation that helps clarify goals and consider actions.'})}]}}]})};
 }});
 assert.equal(out?.modelUsed,true);assert.equal(calls,1);assert.equal(reserved,1);
});
test('fail closed for unapproved billing, unknown eligibility, private topics, quota, malformed output',async()=>{
 let calls=0;
 const input={message:'What is coaching?',locale:'en',eligible:true,env,reserve:async()=>{},fetcher:async()=>{calls++;return {status:429,ok:false}}};
 for(const x of [{eligible:false},{env:{...env,HH_WAVE_GEMINI_FREE_BILLING_DISABLED_CONFIRMED:'false'}},{message:'My private history'},{reserve:async()=>{throw Error('quota')}}])assert.equal(await waveGeminiPublicReply({...input,...x}),null);
 assert.equal(calls,0);assert.equal(await waveGeminiPublicReply(input),null);assert.equal(calls,1);
 assert.equal(await waveGeminiPublicReply({...input,fetcher:async()=>({ok:true,json:async()=>({candidates:[{finishReason:'STOP',content:{parts:[{text:'{"reply":"Visit https://example.com for help."}'}]}}]})})}),null);
});
test('share existing Gemini project and account budgets, separate minute guard',()=>{
 const q=waveGeminiPublicQuota('account');
 assert.deepEqual(q.map(x=>x.limit),[30,16,4]);
 assert.equal(q[0].bucket.op,'my-coach-gemini_free-global-day');
 assert.equal(q[1].bucket.actor,'account');
 const route=readFileSync(new URL('../app/api/holistic-agent/turn/route.js',import.meta.url),'utf8');
 assert.ok(route.includes('eligible:waveGeminiPublicEligibility(actor.wavePublicGeminiEligibility)'));
 assert.ok(route.includes('reserve:()=>consumeRateBatch(config,waveGeminiPublicQuota(actor.id))'));
 assert.ok(route.includes('body.selectedGoal==null&&(!stateEvent||stateEvent.type==="ordinary")'));
});
