import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fishConfig,fishLanguages,validateFishRequest,FISH_MODEL,FISH_FREE_END,FISH_PUBLIC_VOICES} from '../lib/mandala/voice-studio-fish.mjs';
import {requestFishWav,approvedFishReference} from '../lib/mandala/voice-studio-fish-provider.mjs';
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

test('Fish in Therapy Voice accepts explicitly consented affirmations without a paid fallback',()=>{
 const phrase={provider:'fish',mode:'affirmations',voiceId:'fish-en',language:'en',text:'I feel calm.',consent:true};
 assert.deepEqual(validateFishRequest(phrase),{provider:'fish',mode:'affirmations',voiceId:'fish-en',language:'en',text:'I feel calm.'});
 assert.throws(()=>validateFishRequest({...phrase,consent:false}));
 assert.throws(()=>validateFishRequest({...phrase,voiceId:'fish-ru'}));
 assert.throws(()=>validateFishRequest({...phrase,text:'x'.repeat(651)}));
 const ui=readFileSync(new URL('../components/mandala-affirmation-voice.tsx',import.meta.url),'utf8');
 for(const q of ['FISH_PUBLIC_VOICES.filter(v=>v.purpose===fishPurpose).map(v=><div','data-video-affirmation-voice-card={v.id}',
  'data-video-affirmation-voice-preview={v.id}','fishAvailableLanguages.includes(v.language)',
  'provider:"fish",mode:"sample"','provider:"fish",mode:"affirmations"',
  'voiceGender==="fish"?f.consent','onAttach({file,speechFile',
  'reply.headers.get("X-HH-Voice-Provider")==="fish"'])assert.ok(ui.includes(q),q);
 assert.doesNotMatch(ui,/api\.fish\.audio\/v1\/tts|HH_COACHING_FISH_API_KEY/);
});

test('approved Fish voices are grouped exactly as owner-selected coaching/meditation',()=>{
 assert.deepEqual(FISH_PUBLIC_VOICES.filter(v=>v.purpose==='coaching').map(v=>v.id),
  ['fish-igor','fish-ekaterina','fish-sarah','fish-jordan']);
 assert.deepEqual(FISH_PUBLIC_VOICES.filter(v=>v.purpose==='meditation').map(v=>v.id),
  ['fish-selene','fish-calm-meditation','fish-e1','fish-zorya','fish-sasha','fish-m4']);
 assert.equal(FISH_PUBLIC_VOICES.filter(v=>v.language==='ru'&&v.purpose==='meditation').length,3);
 assert.equal(approvedFishReference('fish-igor'), '55ece81d65564775ab448bab3b525599');
 assert.equal(approvedFishReference('fish-ekaterina'), '6d23d3209d6849e0b24ddae6f734afe9');
 assert.equal(approvedFishReference('fish-sarah'), '933563129e564b19a115bedd57b7406a');
 assert.equal(approvedFishReference('fish-jordan'), '79d0bd3e4e5444b18f7b6d89b5927bf1');
 assert.equal(approvedFishReference('fish-selene'), 'b347db033a6549378b48d00acb0d06cd');
 // Legacy RU reference pointed to English Adrian: never use it for a Russian voice.
 assert.notEqual(approvedFishReference('fish-ru'), env.HH_COACHING_FISH_VOICE_RU_ID);
 assert.equal(approvedFishReference('fish-ru'),approvedFishReference('fish-igor'));
 assert.equal(approvedFishReference('fish-calm-meditation'),null,
  'third-party voice needs a verified provider commercial license');
 assert.equal(approvedFishReference('fish-calm-meditation',{
  HH_VOICE_STUDIO_FISH_CALM_COMMERCIAL_LICENSE_APPROVED:'true'}),'14c13e72d4644b0dbd2f147df20f6d80');
});
test('real Fish voice select binds the exact public reference ID, free-only and without retry',async()=>{
 const input=validateFishRequest({provider:'fish',mode:'sample',voiceId:'fish-igor',language:'ru'});
 const vendor={...fishConfig(env,'ru',date),referenceId:approvedFishReference(input.voiceId)};
 let called=0;
 const data=await requestFishWav({vendor,input,fetchImpl:async(url,options)=>{
  called++;
  assert.equal(options.headers.model,'s2.1-pro-free');
  assert.equal(JSON.parse(options.body).reference_id,'55ece81d65564775ab448bab3b525599');
  return new Response(wav(),{headers:{'Content-Type':'audio/wav'}});
 }});
 assert.equal(called,1);
 assert.equal(data.toString('ascii',0,4),'RIFF');
 await assert.rejects(requestFishWav({vendor:{...vendor,referenceId:env.HH_COACHING_FISH_VOICE_RU_ID},
   input,fetchImpl:async()=>{throw Error('SHOULD_NOT_CONTACT_VENDOR');}}),/FISH_INVALID_REQUEST/);
 const calm=validateFishRequest({provider:'fish',mode:'sample',voiceId:'fish-calm-meditation',language:'en'});
 await assert.rejects(requestFishWav({vendor:{...vendor,referenceId:'14c13e72d4644b0dbd2f147df20f6d80'},
   input:calm,fetchImpl:async()=>{throw Error('NO_LICENSE');}}),/FISH_INVALID_REQUEST/);
});
test('purpose filter lives in the original Therapy phrase screen; no new pages',()=>{
 const source=readFileSync(new URL('../components/mandala-affirmation-voice.tsx',import.meta.url),'utf8');
 const css=readFileSync(new URL('../components/mandala-affirmation-voice.module.css',import.meta.url),'utf8');
 const route=readFileSync(new URL('../app/api/holistic-support/voice/route.js',import.meta.url),'utf8');
 for(const marker of ['data-fish-voice-purpose','data-fish-purpose={purpose}',
  'fishPurpose','Fish (10)','FISH_PUBLIC_VOICES.filter(v=>v.purpose===fishPurpose)',
  'Boolean(v.requiresProviderLicense&&!fishLicensedIds.includes(v.id))','provider:"fish",mode:"sample"',
  'provider:"fish",mode:"affirmations"'])assert.ok(source.includes(marker),marker);
 assert.ok(css.includes('scroll-snap-type:x proximity'));
 assert.ok(route.includes('approvedFishReference(validated.voiceId,process.env)'));
 assert.ok(route.includes('FISH_VOICE_LICENSE_REQUIRED'));
});
