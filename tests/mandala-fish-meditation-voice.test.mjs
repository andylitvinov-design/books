import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fishStudioConfig,fishStudioLanguages,requestFishStudioAudio,FISH_STUDIO_FREE_END} from '../lib/mandala/voice-studio-fish.mjs';
import {validateStudioRequest} from '../lib/mandala/voice-studio.mjs';
const now=Date.UTC(2026,10,17);
const env={HH_VOICE_STUDIO_FISH_ENABLED:'true',
 HH_VOICE_STUDIO_FISH_OWNER_APPROVED:'true',
 HH_VOICE_STUDIO_FISH_FREE_DATA_APPROVED:'true',
 HH_COACHING_FISH_API_KEY:'test-server-only-fish-token',
 HH_COACHING_FISH_VOICE_EN_ID:'933563129e564b19a115bedd57b7406a',
 HH_COACHING_FISH_VOICE_RU_ID:'bf322df2096a46f18c579d0baa36f41d'};
const source=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
function wav(){
 const b=Buffer.alloc(524);b.write('RIFF',0);b.writeUInt32LE(516,4);b.write('WAVEfmt ',8);
 b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);
 b.writeUInt32LE(24000,24);b.writeUInt32LE(48000,28);b.writeUInt16LE(2,32);
 b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(480,40);return b;
}
test('Fish is off without three independent approvals, licensed references or after the free window',()=>{
 assert.deepEqual(fishStudioLanguages(env,now),['en','ru']);
 assert.equal(fishStudioConfig(env,'ru',now).referenceId,env.HH_COACHING_FISH_VOICE_RU_ID);
 for(const key of ['HH_VOICE_STUDIO_FISH_ENABLED','HH_VOICE_STUDIO_FISH_OWNER_APPROVED',
 'HH_VOICE_STUDIO_FISH_FREE_DATA_APPROVED','HH_COACHING_FISH_API_KEY','HH_COACHING_FISH_VOICE_EN_ID']){
   const copy={...env};delete copy[key];assert.equal(fishStudioConfig(copy,'en',now),null,key);
 }
 assert.equal(fishStudioConfig(env,'es',now),null);
 assert.equal(fishStudioConfig(env,'en',FISH_STUDIO_FREE_END),null);
 assert.equal(fishStudioConfig({...env,HH_COACHING_FISH_VOICE_EN_ID:'random'},'en',now),null);
});
test('explicit Fish selection and consent preserve original validator compatibility',()=>{
 const sample=validateStudioRequest({mode:'sample',voiceId:'mark',language:'ru',provider:'fish'});
 assert.equal(sample.provider,'fish');assert.match(sample.text,/Сделайте мягкий вдох/);
 assert.equal(validateStudioRequest({mode:'sample',voiceId:'mark',language:'en'}).provider,undefined);
 assert.throws(()=>validateStudioRequest({mode:'custom',voiceId:'mark',language:'en',text:'x',provider:'fish',consent:false}));
 assert.throws(()=>validateStudioRequest({mode:'sample',voiceId:'mark',language:'en',provider:'paid'}));
});
test('free header, WAV, 24kHz, gentle prosody and no leaked credential',async()=>{
 let sent;
 const fetchImpl=async(url,options)=>{
   sent={url,headers:options.headers,body:JSON.parse(options.body),cache:options.cache};
   return new Response(wav(),{status:200,headers:{'content-type':'audio/wav'}});
 };
 const audio=await requestFishStudioAudio({vendor:fishStudioConfig(env,'en',now),text:'A gentle moment.',fetchImpl});
 assert.equal(audio.toString('ascii',0,4),'RIFF');
 assert.equal(sent.url,'https://api.fish.audio/v1/tts');
 assert.equal(sent.headers.model,'s2.1-pro-free');
 assert.equal(sent.body.format,'wav');assert.equal(sent.body.sample_rate,24000);
 assert.equal(sent.body.prosody.speed,0.9);assert.equal(sent.cache,'no-store');
 assert.ok(!JSON.stringify(sent.body).includes('test-server-only'));
});
test('invalid model/text/audio, quota and overflow fail closed',async()=>{
 const vendor=fishStudioConfig(env,'en',now);
 await assert.rejects(requestFishStudioAudio({vendor:{...vendor,model:'s2.1-pro'},text:'x',
   fetchImpl:async()=>{throw Error('must not call')}}),/INVALID_CONFIGURATION/);
 await assert.rejects(requestFishStudioAudio({vendor,text:'x'.repeat(651),
   fetchImpl:async()=>{throw Error('must not call')}}),/INVALID_TEXT/);
 await assert.rejects(requestFishStudioAudio({vendor,text:'x',fetchImpl:async()=>
   new Response('quota',{status:429})}),/QUOTA/);
 await assert.rejects(requestFishStudioAudio({vendor,text:'x',fetchImpl:async()=>
   new Response('<html>bad</html>',{headers:{'content-type':'text/html'}})}),/INVALID_AUDIO/);
 await assert.rejects(requestFishStudioAudio({vendor,text:'x',maxBytes:60,fetchImpl:async()=>
   new Response(wav(),{headers:{'content-type':'audio/wav'}})}),/TOO_LARGE/);
});
test('one existing Voice Studio endpoint keeps same-origin, login, quotas and local mix/attach',()=>{
 const api=source('app/api/holistic-support/voice/route.js');
 const ui=source('components/mandala-cloud-voice-studio.tsx');
 for(const s of ['requireSameOrigin','createRequestAuth','voice-studio-fish-free-day',
  'requestFishStudioAudio','X-HH-Voice-Provider', "provider='fish-free'"])
   assert.ok(api.includes(s),s);
 for(const s of ['data-voice-provider-select','data-fish-voice-choice','f.consent',
  'mixVoiceWithNature','onAudioReady','resetAudio()'])assert.ok(ui.includes(s),s);
});
