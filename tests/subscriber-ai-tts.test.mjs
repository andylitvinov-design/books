import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {subscriberTtsReady,subscriberTtsCopy,subscriberTtsPhrase,subscriberTtsHash,
 subscriberTtsButtons,synthesizePublicTelegramPhrase,validTelegramOpus,
 wavToTelegramOpus,telegramSendVoice} from '../lib/app/subscriber-ai-tts.mjs';
const ready={HH_SUBSCRIBER_AI_TTS_ENABLED:'true',HH_SUBSCRIBER_AI_TTS_FREE_CONFIRMED:'true',
 HH_SUBSCRIBER_AI_TTS_SCHEMA_READY:'true',HH_VOICE_STUDIO_ENABLED:'true',
 HH_VOICE_STUDIO_FREE_TIER_CONFIRMED:'true',HH_VOICE_STUDIO_GEMINI_API_KEY:'K'.repeat(32)};
const opus=Buffer.concat([Buffer.from('OggS'),Buffer.alloc(34),Buffer.from('OpusHead'),Buffer.alloc(140)]);
test('TTS remains disabled without explicit free attestation and migration',()=>{
 for(const name of Object.keys(ready))assert.equal(subscriberTtsReady({...ready,[name]:''}),false,name);
 assert.equal(subscriberTtsReady(ready),true);
 assert.equal(subscriberTtsPhrase('ru','private'),null);
 for(const locale of ['ru','en','es']){
  assert.ok(subscriberTtsPhrase(locale,'hello'));
  assert.equal(subscriberTtsHash(locale,'hello').length,64);
  assert.match(subscriberTtsCopy(locale,'intro'),/Google Gemini Free/);
  assert.equal(subscriberTtsButtons(locale).inline_keyboard[0][0].callback_data,'hhai:tts-agree');
 }
});
test('Prototype keys are never reviewed phrases or copy strings',async()=>{
 for(const locale of ['ru','en','es']){
  for(const key of ['constructor','__proto__','toString','valueOf','hasOwnProperty']){
   assert.equal(subscriberTtsPhrase(locale,key),null,locale+':'+key);
   assert.equal(subscriberTtsHash(locale,key),null,locale+':'+key);
   assert.equal(typeof subscriberTtsCopy(locale,key),'string',locale+':'+key);
   await assert.rejects(
    ()=>synthesizePublicTelegramPhrase({locale,key,env:ready,
     requestAudio:()=>{throw Error('UNAPPROVED_PROVIDER_CALL');}}),
    /TTS_PHRASE_NOT_APPROVED/,locale+':'+key);
  }
 }
 assert.equal(subscriberTtsPhrase('__proto__','constructor'),null);
 assert.equal(subscriberTtsPhrase('constructor','hello'),null);
});
test('Only prewritten templates can be sent to free Gemini, never private text',async()=>{
 let calls=0;const audio=Buffer.alloc(100,1);
 const result=await synthesizePublicTelegramPhrase({locale:'en',key:'hello',env:ready,
  requestAudio:async request=>{calls++;assert.equal(request.payload.model,'gemini-3.8-flash-lite-tts');
   assert.match(JSON.stringify(request.payload),/Tell me what matters/);return audio;},
  convert:async bytes=>{assert.equal(bytes,audio);return opus;}});
 assert.equal(calls,1);assert.equal(result,opus);
 await assert.rejects(()=>synthesizePublicTelegramPhrase({locale:'en',key:'my-private-therapy',env:ready,
  requestAudio:()=>{calls++;}}),/TTS_PHRASE_NOT_APPROVED/);
 assert.equal(calls,1);
});
test('sendVoice uses real OGG/Opus upload or Telegram file_id, never paid broadcast',async()=>{
 const token='123456:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghi',chatId='1234567';
 let seen=0;const fetcher=async(url,{body})=>{
  seen++;assert.ok(url.endsWith('/sendVoice'));
  assert.equal(body.get('allow_paid_broadcast'),'false');
  assert.equal(body.get('caption'),'Safe hello');
  assert.ok(body.get('voice'));
  return Response.json({ok:true,result:{message_id:42,voice:{file_id:'A'.repeat(25)}}});
 };
 assert.equal(validTelegramOpus(opus),true);
 const a=await telegramSendVoice({token,chatId,voice:opus,caption:'Safe hello',fetcher});
 assert.equal(a.status,'accepted');assert.equal(a.fileId,'A'.repeat(25));
 const b=await telegramSendVoice({token,chatId,voice:'A'.repeat(25),caption:'Safe hello',fetcher});
 assert.equal(b.status,'accepted');assert.equal(seen,2);
 assert.equal((await telegramSendVoice({token,chatId,voice:Buffer.from('not audio'),caption:'Safe hello',fetcher})).status,'rejected');
 assert.equal(seen,2);
});
test('ffmpeg conversion accepts real WAV and generates Opus voice',async()=>{
 // Portable sample WAV header + 0.5s of silence. Tests the real codec when installed.
 const sample=Buffer.alloc(44+24000);sample.write('RIFF',0);sample.writeUInt32LE(sample.length-8,4);
 sample.write('WAVEfmt ',8);sample.writeUInt32LE(16,16);sample.writeUInt16LE(1,20);
 sample.writeUInt16LE(1,22);sample.writeUInt32LE(24000,24);sample.writeUInt32LE(48000,28);
 sample.writeUInt16LE(2,32);sample.writeUInt16LE(16,34);sample.write('data',36);
 sample.writeUInt32LE(24000,40);
 let binary='/usr/bin/ffmpeg';
 try{binary=createRequire(import.meta.url)('ffmpeg-static')||binary;}catch{}
 const result=await wavToTelegramOpus(sample,{binary});
 assert.equal(validTelegramOpus(result),true);
});
