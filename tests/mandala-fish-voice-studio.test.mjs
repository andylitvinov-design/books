import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fishConfig,fishLanguages,validateFishRequest,FISH_MODEL,FISH_FREE_END} from '../lib/mandala/voice-studio-fish.mjs';
import {requestFishWav} from '../lib/mandala/voice-studio-fish-provider.mjs';
const env={
 HH_VOICE_STUDIO_FISH_ENABLED:'true',HH_VOICE_STUDIO_FISH_FREE_TIER_CONFIRMED:'true',
 HH_VOICE_STUDIO_FISH_FREE_DATA_APPROVED:'true',HH_VOICE_STUDIO_FISH_VOICE_RIGHTS_APPROVED:'true',
 HH_VOICE_STUDIO_FISH_USE_COACHING_KEY:'true',HH_COACHING_FISH_API_KEY:'test-key-not-a-secret',
 HH_COACHING_FISH_VOICE_EN_ID:'933563129e564b19a115bedd57b7406a',
 HH_COACHING_FISH_VOICE_RU_ID:'bf322df2096a46f18c579d0baa36f41d',
},date=Date.parse('2026-11-18T00:00:00Z');
function wav(){
 const b=Buffer.alloc(44+960);
 b.write('RIFF',0);b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);
 b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);
 b.writeUInt32LE(24000,24);b.writeUInt32LE(48000,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);
 b.write('data',36);b.writeUInt32LE(960,40);
 for(let i=44;i<b.length;i+=2)b.writeInt16LE(i%4?1000:-1000,i);
 return b;
}
test('Fish free only: separate approval, licensed references, expiry and no paid fallback',()=>{
 assert.equal(FISH_MODEL,'s2.1-pro-free');
 assert.deepEqual(fishLanguages(env,date),['ru','en']);
 for(const flag of ['HH_VOICE_STUDIO_FISH_ENABLED','HH_VOICE_STUDIO_FISH_FREE_TIER_CONFIRMED',
  'HH_VOICE_STUDIO_FISH_FREE_DATA_APPROVED','HH_VOICE_STUDIO_FISH_VOICE_RIGHTS_APPROVED',
  'HH_VOICE_STUDIO_FISH_USE_COACHING_KEY'])
   assert.equal(fishConfig({...env,[flag]:undefined},'ru',date),null,flag);
 assert.equal(fishConfig(env,'ru',FISH_FREE_END),null);
 assert.equal(fishConfig(env,'es',date),null);
 assert.equal(fishConfig({...env,HH_COACHING_FISH_VOICE_RU_ID:'bad'},'ru',date),null);
 assert.equal(fishConfig({...env,HH_COACHING_FISH_MODEL:'s2.1-pro'},'ru',date).model,FISH_MODEL);
});
test('Samples use approved static phrases; custom user text requires consent and exact language',()=>{
 const sample={provider:'fish',mode:'sample',voiceId:'fish-ru',language:'ru'};
 assert.match(validateFishRequest(sample).text,/вдох/u);
 assert.throws(()=>validateFishRequest({...sample,text:'PII'}));
 assert.throws(()=>validateFishRequest({...sample,voiceId:'fish-en'}));
 const own={...sample,mode:'custom',text:'Спокойно вдохните и расслабьтесь.',consent:true};
 assert.equal(validateFishRequest(own).text,own.text);
 const paragraph={...own,text:'Почувствуйте опору.\n\nСделайте мягкий вдох.'};
 assert.equal(validateFishRequest(paragraph).text,paragraph.text,'real meditation paragraphs must be narratable');
 for(const change of [{consent:false},{text:'A'.repeat(651)},{text:'<b>'},{text:'\u0000'},
  {language:'es',voiceId:'fish-es'},{provider:'studio'},{extra:1}])
   assert.throws(()=>validateFishRequest({...own,...change}));
});
test('Fish sends exactly free WAV request with gentle speed, rejects billable and invalid audio',async()=>{
 const input=validateFishRequest({provider:'fish',mode:'sample',voiceId:'fish-en',language:'en'});
 const vendor=fishConfig(env,'en',date);let calls=0;
 const got=await requestFishWav({vendor,input,fetchImpl:async(url,init)=>{
   calls++;assert.equal(url,'https://api.fish.audio/v1/tts');
   assert.equal(init.headers.model,'s2.1-pro-free');
   const body=JSON.parse(init.body);
   assert.equal(body.format,'wav');assert.equal(body.sample_rate,24000);
   assert.equal(body.prosody.speed,0.86);assert.equal(body.reference_id,vendor.referenceId);
   return new Response(wav(),{headers:{'Content-Type':'audio/wav'}});
 }});
 assert.equal(calls,1);assert.equal(got.toString('ascii',0,4),'RIFF');
 for(const status of [402,429,503]){
   let n=0;
   await assert.rejects(requestFishWav({vendor,input,fetchImpl:async()=>{
     n++;return new Response('No',{status});
   }}));assert.equal(n,1,'never retry with a paid model');
 }
 await assert.rejects(requestFishWav({vendor,input,maxBytes:150,
  fetchImpl:async()=>new Response(wav(),{headers:{'Content-Type':'audio/wav'}})}),/FISH_AUDIO_TOO_LARGE/);
 await assert.rejects(requestFishWav({vendor,input,
  fetchImpl:async()=>new Response('<html>bad</html>',{headers:{'Content-Type':'text/html'}})}),/FISH_INVALID_AUDIO/);
});
test('Existing auth/rate/consent, browser-only audio mix, and video attachment stay in place',()=>{
 const src=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
 const route=src('app/api/holistic-support/voice/route.js');
 const ui=src('components/mandala-cloud-voice-studio.tsx');
 for(const marker of ['requireSameOrigin','auth.verified()','consumeRate','fishConfig','validateFishRequest','requestFishWav',
  'X-HH-Voice-Provider'])assert.ok(route.includes(marker),marker);
 for(const marker of ['data-voice-provider="fish"','fishLanguages','mixVoiceWithNature',
  'onAudioReady','data-voice-studio-generate'])assert.ok(ui.includes(marker),marker);
 assert.doesNotMatch(ui,/HH_COACHING_FISH_API_KEY|api\.fish\.audio\/v1\/tts/u);
});
