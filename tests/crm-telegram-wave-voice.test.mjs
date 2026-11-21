import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {validWaveTelegramVoiceMeta,waveTelegramVoiceReady,waveTelegramVoiceCopy,
  transcribeWaveTelegramVoice} from '../lib/crm/telegram-wave-voice.mjs';
import {v3Context,v3ButtonsFor,v3VoiceOfferValid,V3_LABELS} from '../lib/crm/telegram-ai-diagnostic-v3.mjs';
import {telegramInlineCallbackSelection,telegramInlineButtonForText}
  from '../lib/crm/telegram-inline-buttons.mjs';
const source=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const note={fileId:'abcdefghijklmnopqrstuvwxyz123456',bytes:300,seconds:3,mime:'audio/ogg'};
const token='1234567:abcdefghijklmnopqrstuvwxyz1234567890',key='a'.repeat(32);
test('native private bot voice metadata is forwarded, not fabricated as text',()=>{
 const parser=source('lib/crm/messenger-webhook.js');
 assert.match(parser,/const isTelegramVoice=Boolean\(message\.voice\)/);
 assert.match(parser,/const voiceNote=isTelegramVoice&&!message\.forward_origin/);
 assert.match(parser,/rawText:message\.text \? text : '',voiceNote,isTelegramVoice/);
 assert.match(parser,/!message\.forward_origin/);
 assert.match(parser,/rawText:message\.text \? text : '',voiceNote/);
 const route=source('app/api/app/crm/messenger/webhook/[provider]/route.js');
 assert.match(route,/finishTelegramWaveVoiceV3\(config,aiIntake\.generate\)/);
 // Already-published protected Ali clarification flow archives a neutral media
 // receipt, not a fabricated voice transcript or unverified audio bytes.
 assert.match(route,/const archived=await ingestMessengerUpdate\(provider,event,config\)/);
 assert.match(route,/const mediaKind=event\.isTelegramVoice\?'voice':/);
 assert.match(route,/composeTelegramSecretaryClarification\(raw,locale,\{mediaKind\}\)/);
 assert.match(route,/if\(aiIntake\.generate\.voiceNote\)/);
 assert.match(route,/await deliverTelegramWaveVoiceV3\(config,aiIntake\.generate/);
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


test('official voice consent callback is fresh, message-bound and revoked/expired buttons fail closed',()=>{
 const at=Date.parse('2026-11-14T12:00:00.000Z')
 const fresh={voiceOfferUpdateId:42,voiceOfferMessageId:117,
   voiceOfferAt:new Date(at).toISOString()}
 assert.equal(v3VoiceOfferValid(fresh,117,at+3000),true)
 for(const [state,id,now] of [
   [fresh,118,at+3000],
   [fresh,117,at+5*60*1000+1],
   [fresh,117,at-1],
   [{...fresh,voiceOfferMessageId:null},117,at+3000],
   [{...fresh,voiceOfferAt:null},117,at+3000],
   [{...fresh,voiceOfferUpdateId:null},117,at+3000],
 ]) assert.equal(v3VoiceOfferValid(state,id,now),false)
 const stored=v3Context({turns:[],pending:null,summary:null,...fresh,
   voiceDeliveryPendingId:42})
 assert.equal(v3VoiceOfferValid(stored,117,at+3000),true)
 assert.equal(stored.voiceDeliveryPendingId,42)
 assert.equal(v3Context({...stored,voiceOfferMessageId:null}).voiceOfferMessageId,undefined)
})

test('voice offer only binds after a provider-confirmed official message; never replay stale callback',()=>{
 const service=source('lib/crm/telegram-ai-diagnostic-v3-service.js')
 const route=source('app/api/app/crm/messenger/webhook/[provider]/route.js')
 assert.match(service,/export async function bindTelegramWaveVoiceOffer\(/)
 assert.match(service,/v3VoiceOfferValid\(ctx,event\.callbackMessageId\)/)
 assert.match(service,/voiceOfferMessageId:null/)
 assert.match(service,/voiceOfferUpdateId:null,voiceOfferAt:null,voiceOfferMessageId:null/)
 assert.match(service,/voiceOfferMessageId:messageId/)
 assert.match(service,/Date\.now\(\)-at>5\*60\*1000/)
 assert.match(route,/if\(aiIntake\.voiceOffer\)await bindTelegramWaveVoiceOffer\(/)
 assert.match(route,/delivered\.providerId/)
})

test('voice final answer and failure reply cannot outrun committed STOP or voice-off',()=>{
 const service=source('lib/crm/telegram-ai-diagnostic-v3-service.js')
 const route=source('app/api/app/crm/messenger/webhook/[provider]/route.js')
 const deliver=service.slice(service.indexOf('export async function deliverTelegramWaveVoiceV3('))
 const guard=deliver.indexOf('if(!voiceConsentValid(ctx)||ctx.voiceDeliveryPendingId!==job.updateId)')
 const sender=deliver.indexOf('await send({to:reply.to')
 assert.ok(guard>=0&&sender>guard,'check persisted consent and one-shot voice marker before send')
 assert.match(deliver,/pg_advisory_xact_lock/)
 assert.match(deliver,/await readRow\(/)
 assert.match(deliver,/voiceDeliveryPendingId:null/)
 assert.match(deliver,/HH_TG_VOICE_FINAL_SEND_UNCONFIRMED/)
 assert.match(service,/voiceDeliveryPendingId:ctx\.pending\.voice===true\?job\.updateId:null/)
 assert.match(service,/voiceDeliveryPendingId:job\.updateId/)
 assert.match(route,/await deliverTelegramWaveVoiceV3\(config,aiIntake\.generate/)
 assert.doesNotMatch(route,/if\(ready\?\.reply\)await sendTelegramDiagnosticPrompt/)
})

test('all native Telegram voice updates keep neutral CRM receipts; invalid forwarded audio has no transcript',()=>{
 const parser=source('lib/crm/messenger-webhook.js')
 const route=source('app/api/app/crm/messenger/webhook/[provider]/route.js')
 assert.match(parser,/const isTelegramVoice=Boolean\(message\.voice\)/)
 assert.match(parser,/voiceNote=isTelegramVoice&&!message\.forward_origin&&!message\.is_automatic_forward/)
 assert.match(parser,/rawText:message\.text \? text : '',voiceNote,isTelegramVoice/)
 // A signed message without text has a neutral placeholder only. Forwarded
 // voice is not eligible as a transcript or silently treated as voice consent.
 assert.match(parser,/const text=safeString\(message\.text\|\|'\[Non-text message\]',1200\)/)
 assert.match(parser,/rawText:message\.text \? text : '',voiceNote,isTelegramVoice/)
 assert.match(parser,/text:safeString\(event\.body,1200\)\|\|'\[Non-text message\]'/)
 assert.match(route,/await ingestMessengerUpdate\(provider,event,config\)/)
 assert.match(route,/const mediaKind=event\.isTelegramVoice\?'voice':/)
 assert.match(route,/composeTelegramSecretaryClarification\(raw,locale,\{mediaKind\}\)/)
})


test('final single-attempt voice delivery is serialized, idempotent, STOP and revocation aware',async()=>{
 const content=source('lib/crm/telegram-ai-diagnostic-v3-service.js')
 const at=content.indexOf('export async function deliverTelegramWaveVoiceV3(')
 assert.ok(at>0,'final voice delivery function exists')
 const events=[]
 const state={voiceConsentAt:new Date().toISOString(),voiceDeliveryPendingId:88}
 let stopped=false
 const row=()=>({flow_version:3,stage:stopped?'stopped':'interview',
   ai_consent_at:state.voiceConsentAt,ai_context_id:'context'})
 const env={
   supported:()=>true,
   webhookTransaction:async(_config,work)=>{
     events.push('begin')
     const result=await work({query:async()=>{events.push('sessionLock')}})
     events.push('commit')
     return result
   },
   readRow:async()=>{events.push('readLockedRow');return row()},
   openContext:()=>({...state}),
   voiceConsentValid:ctx=>Boolean(ctx.voiceConsentAt),
   updateRow:async()=>{events.push('consumeOneShot');state.voiceDeliveryPendingId=null},
   encryptContext:()=> 'sealed',
   console:{error:()=>events.push('providerUnconfirmed')},
 }
 const deliver=vm.runInNewContext(
   content.slice(at).replace(/^export /,'')+';deliverTelegramWaveVoiceV3',env)
 const job={business:'b',user:'u',voiceNote:{fileId:'only-backend'},
   contextId:'context',ownerId:'owner',updateId:88}
 const reply={to:'private',reply:'Wave reply',locale:'ru',keyboard:[]}
 let sends=0
 const sender=async args=>{sends++;events.push('singleSend');assert.equal(args.text,'Wave reply')}
 assert.equal(await deliver({},job,reply,sender,{}),true)
 assert.equal(sends,1)
 assert.ok(events.indexOf('sessionLock')>=0&&events.indexOf('sessionLock')<events.indexOf('singleSend'))
 assert.ok(events.indexOf('consumeOneShot')<events.indexOf('singleSend'))
 assert.ok(events.indexOf('singleSend')<events.indexOf('commit'),
   'provider send finishes while STOP-serializing transaction is still open')
 assert.equal(await deliver({},job,reply,sender,{}),false,'consumed reply never resends')
 assert.equal(sends,1)
 state.voiceDeliveryPendingId=88;state.voiceConsentAt=null
 assert.equal(await deliver({},job,reply,sender,{}),false,'revoke blocks audio reply')
 assert.equal(sends,1)
 state.voiceConsentAt=new Date().toISOString();stopped=true
 assert.equal(await deliver({},job,reply,sender,{}),false,'committed STOP blocks audio reply')
 assert.equal(sends,1)
 stopped=false
 assert.equal(await deliver({},job,reply,async()=>{throw Error('uncertain')},{}),false,
   'unknown Telegram status is a single consumed attempt')
 assert.equal(state.voiceDeliveryPendingId,null)
})
