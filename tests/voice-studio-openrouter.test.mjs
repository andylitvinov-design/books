import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  voiceStudioReady,voiceStudioOpenRouterKey,voiceStudioProviders,
  validateStudioRequest,buildOpenRouterStudioPayload,
} from '../lib/mandala/voice-studio.mjs';
import {requestOpenRouterStudioAudio} from '../lib/mandala/voice-studio-openrouter-provider.mjs';
const code=expected=>error=>error.code===expected;
const payload=buildOpenRouterStudioPayload(validateStudioRequest({
  mode:'sample',voiceId:'maya',language:'en',
}));
test('only explicitly authorized operator-funded backup activates, not existing text key',()=>{
  const env={HH_VOICE_STUDIO_ENABLED:'true',
    HH_COUNCIL_OPENROUTER_API_KEY:'already-existing-secret'};
  assert.equal(voiceStudioOpenRouterKey(env),null);
  assert.equal(voiceStudioReady(env),false);
  const partially={...env,HH_VOICE_STUDIO_OPENROUTER_ENABLED:'true',
    HH_VOICE_STUDIO_USE_EXISTING_OPENROUTER_KEY:'true'};
  assert.equal(voiceStudioOpenRouterKey(partially),null);
  const approved={...partially,HH_VOICE_STUDIO_PAID_BACKUP_APPROVED:'true'};
  assert.equal(voiceStudioOpenRouterKey(approved),'already-existing-secret');
  assert.deepEqual(voiceStudioProviders(approved),{gemini:false,openrouter:true});
  assert.equal(voiceStudioReady(approved),true);
  assert.equal(voiceStudioOpenRouterKey({...approved,HH_VOICE_STUDIO_ENABLED:'false'}),null);
  assert.equal(voiceStudioOpenRouterKey({...approved,HH_VOICE_STUDIO_OPENROUTER_ENABLED:'false'}),null);
  assert.equal(voiceStudioOpenRouterKey({...approved,
    HH_VOICE_STUDIO_OPENROUTER_API_KEY:'dedicated-provider-secret'}),'dedicated-provider-secret');
});
test('fixed xAI route reads only validated public text and 5 allowed voices',()=>{
  assert.deepEqual(payload,{model:'x-ai/grok-voice-tts-1.0',voice:'eve',
    input:'Notice how the surface beneath you offers support. There is nothing you need to change right now. Allow a quiet moment, and imagine gentle daylight ahead.',
    response_format:'pcm'});
  assert.throws(()=>buildOpenRouterStudioPayload({text:'hello',voice:{id:'unknown'}}));
});
test('OpenRouter PCM16 becomes valid WAV compatible with local mixer',async()=>{
  const pcm=Buffer.alloc(24000);pcm.writeInt16LE(12000,6);
  let request;
  const result=await requestOpenRouterStudioAudio({key:'provider-secret',payload,
    fetchImpl:async(url,options)=>{
      request={url,options};
      return new Response(pcm,{headers:{'content-type':'audio/pcm; rate=24000; channels=1'}});
    }});
  assert.equal(request.url,'https://openrouter.ai/api/v1/audio/speech');
  assert.equal(request.options.headers.Authorization,'Bearer provider-secret');
  assert.deepEqual(JSON.parse(request.options.body),payload);
  assert.equal(result.subarray(0,4).toString(),'RIFF');
  assert.equal(result.readUInt32LE(24),24000);
  assert.equal(readFileSync(new URL('../lib/mandala/voice-studio.mjs',import.meta.url),'utf8').includes('OPENROUTER_VOICE_IDS'),false);
  assert.deepEqual(result.subarray(44),pcm);
});
test('invalid audio, wrong header, billing exhaustion and requests fail closed',async()=>{
  const run=(fetchImpl,extra={})=>requestOpenRouterStudioAudio({key:'secret',payload,fetchImpl,maxBytes:1024,...extra});
  await assert.rejects(run(async()=>new Response('',{status:429})),code('TTS_BACKUP_QUOTA_EXHAUSTED'));
  await assert.rejects(run(async()=>new Response('',{status:402})),code('TTS_BACKUP_QUOTA_EXHAUSTED'));
  await assert.rejects(run(async()=>new Response('',{status:500})),code('TTS_BACKUP_UNAVAILABLE'));
  await assert.rejects(run(async()=>new Response('mp3',{headers:{'content-type':'audio/mpeg'}})),code('TTS_BACKUP_INVALID_AUDIO'));
  await assert.rejects(run(async()=>new Response(Buffer.alloc(480),{headers:{'content-type':'audio/pcm; rate=16000'}})),code('TTS_BACKUP_INVALID_AUDIO'));
  await assert.rejects(run(async()=>new Response(Buffer.alloc(481),{headers:{'content-type':'audio/pcm'}})),code('TTS_BACKUP_INVALID_AUDIO'));
  await assert.rejects(run(async()=>new Response(Buffer.alloc(1200),{headers:{'content-type':'audio/pcm'}})),code('TTS_RESPONSE_TOO_LARGE'));
  await assert.rejects(run(async()=>{throw Error('offline')}),code('TTS_BACKUP_UNAVAILABLE'));
  await assert.rejects(run(async()=>new Response(Buffer.alloc(480),{headers:{'content-type':'audio/pcm'}}),{key:''}),code('TTS_BACKUP_NOT_CONFIGURED'));
  await assert.rejects(run(async()=>new Response(Buffer.alloc(480),{headers:{'content-type':'audio/pcm'}}),{payload:{...payload,model:'openrouter/free'}}),code('TTS_BACKUP_INVALID_REQUEST'));
});
test('existing POST preserves origin/auth/privacy checks and caps billable backup calls',()=>{
  const route=readFileSync(new URL('../app/api/holistic-support/voice/route.js',import.meta.url),'utf8');
  assert.match(route,/requireSameOrigin\(request,config\)/);
  assert.match(route,/auth.verified\(\)/);
  assert.match(route,/voice-studio-openrouter-paid-day/);
  assert.match(route,/,20,86400\)/);
  assert.match(route,/X-HH-Voice-Provider/);
  assert.doesNotMatch(route,/process.env.HH_COUNCIL_OPENROUTER_API_KEY/);
});
