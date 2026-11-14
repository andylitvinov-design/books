import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validWaveTelegramVoiceMeta,waveTelegramVoiceReady,waveTelegramVoiceCopy,
  transcribeWaveTelegramVoice} from '../lib/crm/telegram-wave-voice.mjs';
import {v3Context,v3ButtonsFor,V3_LABELS} from '../lib/crm/telegram-ai-diagnostic-v3.mjs';
import {telegramInlineCallbackSelection,telegramInlineButtonForText}
  from '../lib/crm/telegram-inline-buttons.mjs';
const source=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const note={fileId:'abcdefghijklmnopqrstuvwxyz123456',bytes:300,seconds:3,mime:'audio/ogg'};
const token='1234567:abcdefghijklmnopqrstuvwxyz1234567890',key='a'.repeat(32);
test('native private bot voice metadata is forwarded, not fabricated as text',()=>{
 const parser=source('lib/crm/messenger-webhook.js');
 assert.match(parser,/const voiceNote=message\.voice/);
 assert.match(parser,/!message\.forward_origin/);
 assert.match(parser,/rawText:message\.text \? text : '',voiceNote/);
 const route=source('app/api/app/crm/messenger/webhook/[provider]/route.js');
 assert.match(route,/finishTelegramWaveVoiceV3\(config,aiIntake\.generate\)/);
 assert.match(route,/if\(event\.voiceNote\)continue/);
});
test('voice input metadata and external free-provider authorization are bounded',()=>{
 assert.equal(validWaveTelegramVoiceMeta(note),true);
 for(const n of [{...note,seconds:61},{...note,bytes:2000001},
   {...note,mime:'audio/mp3'},{...note,fileId:'bad'}])
   assert.equal(validWaveTelegramVoiceMeta(n),false);
 assert.equal(waveTelegramVoiceReady({}),false);
 assert.equal(waveTelegramVoiceReady({HH_AUDIO_STT_FREE_CONFIRMED:'true',
   HH_FIRST_VIDEO_GROQ_FREE_CONFIRMED:'true'}),false);
 assert.equal(waveTelegramVoiceReady({HH_AUDIO_STT_FREE_CONFIRMED:'true',
   HH_FIRST_VIDEO_GROQ_FREE_CONFIRMED:'true',
   HH_FIRST_VIDEO_GROQ_API_KEY:key}),true);
});
test('private encrypted V3 context keeps voice origin and separate consent',()=>{
 const original={conversationKind:'general',voiceConsentAt:'2026-11-14T12:00:00.000Z',
   turns:[{role:'user',text:'Поговорим'}],
   pending:{id:42,kind:'question',text:'',queuedAt:1234,voice:true}};
 const stored=v3Context(original);
 assert.equal(stored.voiceConsentAt,original.voiceConsentAt);
 assert.equal(stored.pending.voice,true);
 assert.equal(v3Context({...original,voiceConsentAt:'invalid'}).voiceConsentAt,undefined);
 assert.equal(v3Context({...original,pending:{...original.pending,voice:false}}).pending.voice,undefined);
});
test('voice consent is a separate explicit Telegram inline action',()=>{
 for(const locale of ['ru','en','es']){
   assert.match(waveTelegramVoiceCopy(locale,'intro'),/Groq/);
   assert.match(waveTelegramVoiceCopy(locale,'intro'),/voice_off/);
   const buttons=v3ButtonsFor(locale,'voice_consent');
   assert.equal(buttons.length,1);
   assert.equal(buttons[0][0],V3_LABELS[locale].voiceagree);
   const button=telegramInlineButtonForText(buttons[0][0],locale);
   const action=telegramInlineCallbackSelection(button.callback_data);
   assert.equal(action.inlineAction,'v3:voiceagree');
 }
});
test('V3 blocks STT until consent and quotas, then uses the SAME Wave reply',()=>{
 const service=source('lib/crm/telegram-ai-diagnostic-v3-service.js');
 for(const expression of ['voiceConsentValid(ctx)','validWaveTelegramVoiceMeta(event.voiceNote)',
   "v3ButtonsFor(lang,'voice_consent')",'consumeRate(config', 
   'transcribeWaveTelegramVoice(job.voiceNote','finishTelegramAiV3(config,job,env)',
   'if(ctx.pending.voice&&(!voiceConsentValid(ctx)||!waveTelegramVoiceReady(env)))return null',
   "pending:voiceOff&&ctx.pending?.voice?null:ctx.pending"])
   assert.ok(service.includes(expression),expression);
 assert.match(service,/voiceOriginNotInDB|voice:true/);
 assert.match(service,/HH_FIRST_VIDEO_GROQ_API_KEY/);
});
test('mocked Telegram OGG download to Groq STT produces transcript',async()=>{
 const audio=Buffer.alloc(300);audio.write('OggS',0,'ascii');audio.write('OpusHead',30,'ascii');
 const calls=[];
 const fetcher=async(url,options)=>{
   calls.push(url);
   if(url.endsWith('/getFile'))
     return Response.json({ok:true,result:{file_path:'voice/recording.oga',file_size:300}});
   if(url.includes('/file/bot'))return new Response(audio);
   assert.equal(options.body.get('model'),'whisper-large-v3-turbo');
   assert.equal(options.body.get('language'),'ru');
   return Response.json({text:'Мне важно понять деньги.'});
 };
 assert.equal(await transcribeWaveTelegramVoice(note,{token,key,locale:'ru',fetcher}),
  'Мне важно понять деньги.');
 assert.equal(calls.length,3);
});
test('malicious Telegram download path never reaches audio or external STT',async()=>{
 let calls=0;
 await assert.rejects(()=>transcribeWaveTelegramVoice(note,{token,key,fetcher:async()=>{
   calls++;return Response.json({ok:true,result:{file_path:'voice/../../private',file_size:300}})
 }}),/WAVE_VOICE_STT_UNAVAILABLE/);
 assert.equal(calls,1);
});
test('invalid OGG never reaches external STT',async()=>{
 let calls=0;
 await assert.rejects(()=>transcribeWaveTelegramVoice(note,{token,key,fetcher:async url=>{
   calls++;
   return url.endsWith('/getFile')
     ?Response.json({ok:true,result:{file_path:'voice/f.oga',file_size:300}})
     :new Response(Buffer.alloc(300));
 }}),/WAVE_VOICE_STT_UNAVAILABLE/);
 assert.equal(calls,2);
});
