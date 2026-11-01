import {readFileSync} from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {parseVideoChatAiInput,generateVideoChatAiQuestion} from '../lib/mandala/video-chat-ai.mjs';

const payload={locale:'ru',consent:true,goal:'Я хочу создать видео о любви',step:'mood',
 draft:{mood:null,aspect:'portrait',duration:30,music:null,phrases:null}};
test('server contract requires explicit consent and bounded allowlisted fields',()=>{
 assert.equal(parseVideoChatAiInput({...payload,consent:false}),null);
 assert.equal(parseVideoChatAiInput({...payload,extra:'unexpected'}),null);
 assert.equal(parseVideoChatAiInput({...payload,goal:'x'.repeat(161)}),null);
 assert.equal(parseVideoChatAiInput({...payload,draft:{...payload.draft,music:'paid'} }),null);
 assert.equal(parseVideoChatAiInput(payload).step,'mood');
});
test('without provider confirmation no external AI call is made',async()=>{
 let called=false;
 const result=await generateVideoChatAiQuestion(parseVideoChatAiInput(payload),{},async()=>{called=true;});
 assert.equal(result.error,'VIDEO_CHAT_FREE_AI_DISABLED');
 assert.equal(called,false);
});
test('confirmed free Gemini returns only a short question, no settings writes',async()=>{
 let request;
 const env={HH_COUNCIL_GEMINI_API_KEY:'demo_key_secret_string',HH_FIRST_VIDEO_GEMINI_FREE_CONFIRMED:'true'};
 const response=await generateVideoChatAiQuestion(parseVideoChatAiInput(payload),env,async(url,options)=>{
   request={url,options};return {ok:true,text:async()=>JSON.stringify({candidates:[{content:{parts:[{text:'Хочется нежного спокойного видео или более динамичного движения?'}]}}]})};
 });
 assert.equal(response.provider,'gemini_free');
 assert.match(response.reply,/нежного/iu);
 assert.match(request.url,/generativelanguage\.googleapis\.com/);
 const wire=JSON.parse(request.options.body);
 assert.equal(JSON.parse(wire.contents[0].parts[0].text).goal,payload.goal);
 assert.equal(JSON.stringify(wire).includes('photo'),false);
});
test('unsafe or invented links from model are ignored; no fake success',async()=>{
 const env={HH_COUNCIL_GEMINI_API_KEY:'demo_key_secret_string',HH_FIRST_VIDEO_GEMINI_FREE_CONFIRMED:'true'};
 const response=await generateVideoChatAiQuestion(parseVideoChatAiInput(payload),env,async()=>({ok:true,
    text:async()=>JSON.stringify({candidates:[{content:{parts:[{text:'https://external.example/private'}]}}]})}));
 assert.equal(response.error,'VIDEO_CHAT_AI_UNAVAILABLE');
});
test('chat question HTTP route enforces explicit user consent and shared free quota',()=>{
  const route=readFileSync(new URL('../app/api/holistic-support/video-director-chat/route.js',import.meta.url),'utf8');
  assert.match(route,/requireSameOrigin\(request,config\)/);
  assert.match(route,/readBody\(request,2000\)/);
  assert.match(route,/parseVideoChatAiInput\(/);
  assert.match(route,/HH_FIRST_VIDEO_AI_ENABLED/);
  assert.match(route,/consumeRate\(config,\{op:'video-chat-free-global-day'\},60,86400\)/);
  assert.match(route,/consumeRate\(config,\{op:'video-chat-free-global-minute'\},10,60\)/);
  assert.match(route,/PRIVATE_HEADERS/);
  assert.match(route,/changesApplied:false/);
  assert.match(route,/externalVideoGenerated:false/);
  assert.doesNotMatch(route,/console\.(?:log|warn|error)|wallet|creditDebit|paidRender/i);
});
