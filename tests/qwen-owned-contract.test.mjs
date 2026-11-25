import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewQwenOwnedReply} from '../lib/holistic-support/qwen-reply-gate.mjs';
// Isolated full result-boundary behavior: no real user, network or clinical content.
const acceptNaturalOutput = (text, e)=> e.modelAllowed&& typeof text==='string' && text.length<1200 && !/<[^>]*>|https?:\/\//iu.test(text)?text:null;
const finish = async(e,generator)=>{
 const fallback=e.replyFallback||'RULE_FALLBACK';
 if(!e.modelAllowed || typeof generator!=='function')return {text:fallback,provider:'none',modelUsed:false};
 try{
  const generated=await generator(e.modelRequest);
  const reviewed=e.provider==='owned'?reviewQwenOwnedReply({response:generated,locale:e.locale,role:e.mindRole,
   userMessage:e.modelRequest.messages.at(-1)?.content}):{accepted:true,text:generated};
  const text=reviewed.accepted?acceptNaturalOutput(reviewed.text,e):null;
  if(!text)throw Error('UNSAFE_MODEL_OUTPUT');
  return {text,provider:e.provider,modelUsed:true};
 }catch{return {text:fallback,provider:'none',modelUsed:false};}
};
const envelope=(locale,message,role='coach',provider='owned')=>({modelAllowed:true,locale,mindRole:role,provider,
 replyFallback:'TRUSTED_EXISTING_RULE',modelRequest:{messages:[{role:'user',content:message}]}});
test('unsafe Qwen answer never becomes a visible model answer',async()=>{
 const e=envelope('ru','На этом закончим.');
 const r=await finish(e,async()=> 'Understood. The conversation will now conclude here.');
 assert.equal(r.modelUsed,false);assert.equal(r.provider,'none');assert.equal(r.text,'TRUSTED_EXISTING_RULE');
});
test('Qwen normal English answer passes and changes only presentation',async()=>{
 const e=envelope('en','My goal is to discuss priorities with my team.');
 const r=await finish(e,async()=> 'A first step is to prepare a two-sentence agenda.');
 assert.equal(r.modelUsed,true);assert.equal(r.provider,'owned');
});
test('Qwen internal thought wrapper is removed; HTML and URLs remain blocked',async()=>{
 const e=envelope('en','I need to plan my day.');
 assert.equal((await finish(e,async()=>'<think>\n</think>We can start with your main goal.')).modelUsed,true);
 assert.equal((await finish(e,async()=>'<think>hidden</think>We can start.')).modelUsed,false);
 assert.equal((await finish(e,async()=>'<script>alert(1)</script>')).modelUsed,false);
});
test('browser mode and existing Spanish mode preserve existing validation',async()=>{
 const a=await finish(envelope('en','I want a chat.','secretary','browser'),async()=> 'Hello from browser.');
 assert.equal(a.modelUsed,true);
 const b=await finish(envelope('es','Hola.','coach','owned'),async()=> 'Entendido. Terminamos aquí.');
 assert.equal(b.modelUsed,true);
});
test('disabled or unconsented model is never invoked',async()=>{
 const e=envelope('en','I want to talk.');e.modelAllowed=false;
 const r=await finish(e,async()=>{throw Error('SHOULD_NOT_BE_CALLED');});
 assert.equal(r.modelUsed,false);
});