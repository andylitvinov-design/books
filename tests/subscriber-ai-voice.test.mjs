import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {parseSubscriberAiUpdate} from '../lib/app/subscriber-ai-policy.mjs'
import {subscriberVoiceReady,subscriberVoiceReplyAllowed,validSubscriberVoiceMeta,transcribeSubscriberVoice,voiceCopy,
  voiceDisclosureButtons} from '../lib/app/subscriber-ai-voice.mjs'
const now=1762400000000,seconds=now/1000
const voice={file_id:'AbCdEfGhIjKlMnOpQrStUvWxYz1234567890',
 file_size:160,duration:5,mime_type:'audio/ogg'}
const update=(message,at=now)=>({update_id:101,
 message:{date:Math.floor(at/1000),chat:{id:12345,type:'private'},
  from:{id:12345,language_code:'ru',is_bot:false},...message}})
const parsed=value=>parseSubscriberAiUpdate(value,'andydotbot',now)
test('Telegram private voice is admitted without hijacking global STOP and client Reply',()=>{
 const admitted=parsed(update({voice}))
 assert.equal(admitted?.action,'voice')
 assert.equal(admitted.voice.bytes,160)
 assert.equal(validSubscriberVoiceMeta({fileId:voice.file_id,bytes:160,seconds:5,mime:'audio/ogg'}),true)
 assert.equal(parsed(update({text:'/voice'}))?.action,'voice-open')
 assert.equal(parsed(update({text:'/voice_off'}))?.action,'voice-disable')
 assert.equal(parsed(update({text:'/stop'})),null)
 assert.equal(parsed(update({voice,reply_to_message:{message_id:1}})),null)
 assert.equal(parsed(update({voice,forward_origin:{type:'user'}})),null)
 assert.equal(parsed(update({voice:{...voice,file_size:2000001}})),null)
 assert.equal(parsed(update({voice:{...voice,mime_type:'audio/mp3'}})),null)
 assert.equal(parsed(update({voice:{...voice,duration:61}})),null)
})
test('voice consent must be separately accepted by a matching Telegram bot callback',()=>{
 const callback={update_id:102,callback_query:{id:'callback-1',data:'hhai:voice-agree',
  from:{id:12345},message:{date:seconds,chat:{id:12345,type:'private'},
   from:{is_bot:true,username:'andydotbot'}}}}
 assert.equal(parsed(callback)?.action,'voice-enable')
 assert.equal(parsed({...callback,callback_query:{...callback.callback_query,from:{id:999}}}),null)
 assert.equal(parsed({...callback,callback_query:{...callback.callback_query,data:'hhai:voice-off'}})?.action,'voice-disable')
})
test('STT Free Tier is OFF by default and localized privacy notice is explicit',()=>{
 assert.equal(subscriberVoiceReady({}),false)
 assert.equal(subscriberVoiceReady({HH_SUBSCRIBER_AI_STT_ENABLED:'true',
  HH_SUBSCRIBER_AI_STT_GEMINI_KEY:'x'.repeat(30)}),false)
 for(const locale of ['ru','en','es']){
  assert.ok(voiceCopy(locale,'intro').length>150)
  assert.match(voiceCopy(locale,'intro'),/Gemini/)
  assert.match(voiceCopy(locale,'intro'),/voice_off/)
  assert.equal(voiceDisclosureButtons(locale).inline_keyboard[0][0].callback_data,
   'hhai:voice-agree')
 }
})
const token='12345678:abcdefghijklmnopqrstuvwxyz12345678'
const key='test-only-not-a-real-key-xxxxxxxxxxxxxxxx'
const note={fileId:voice.file_id,bytes:160,seconds:5,mime:'audio/ogg',locale:'ru'}
const audio=Buffer.alloc(160)
audio.write('OggS',0,'ascii')
audio.write('OpusHead',40,'ascii')
test('mocked Telegram download to Gemini STT returns the transcript with no paid fallback',async()=>{
 const called=[]
 const fetcher=async(url,options)=>{
  called.push({url,options})
  if(url.endsWith('/getFile'))
   return Response.json({ok:true,result:{file_path:'voice/file_22.oga',file_size:160}})
  if(url.includes('/file/bot'))return new Response(audio)
  assert.match(url,/gemini-2\.5-flash-lite:generateContent/)
  assert.equal(options.headers['x-goog-api-key'],key)
  assert.equal(JSON.parse(options.body).contents[0].parts[1].inline_data.mime_type,'audio/ogg')
  return Response.json({candidates:[{content:{parts:[{text:'Привет, нужна медитация.'}]}}]})
 }
 assert.equal(await transcribeSubscriberVoice(note,{token,key,fetcher}),
  'Привет, нужна медитация.')
 assert.equal(called.length,3)
})
test('bad path and invalid OGG are rejected before external transcription',async()=>{
 for(const bad of ['voice/../file','voice//file','https://another.site/file']){
  let calls=0
  await assert.rejects(()=>transcribeSubscriberVoice(note,{token,key,fetcher:async()=>{
   calls++;return Response.json({ok:true,result:{file_path:bad,file_size:160}})
  }}),/VOICE_TRANSCRIPTION_UNAVAILABLE/)
  assert.equal(calls,1)
 }
 let count=0
 await assert.rejects(()=>transcribeSubscriberVoice(note,{token,key,fetcher:async url=>{
  count++
  if(url.endsWith('/getFile'))return Response.json({ok:true,result:{file_path:'voice/file.oga',file_size:160}})
  return new Response(Buffer.from('OggS'.padEnd(160,' ')))
 }}),/VOICE_TRANSCRIPTION_UNAVAILABLE/)
 assert.equal(count,2)
})
test('source enforces consent before download and again before reply, with STOP revocation',()=>{
 const source=readFileSync(new URL('../lib/app/subscriber-ai-telegram.js',import.meta.url),'utf8')
 for(const required of ['voice_consent_at=null','voice_pending_at=null',
  'kind=\'voice\'','subscriberVoiceReady(env)','transcribeSubscriberVoice',
  'resolveOneVoice','hh-subscriber-stt-global'])
  assert.ok(source.includes(required),required)
 const sql=readFileSync(new URL('../supabase/migrations/20261106120000_hh_subscriber_ai_voice_consent.sql',import.meta.url),'utf8')
 assert.match(sql,/voice_consent_at timestamptz/)
 assert.match(sql,/subscriber_ai_outbox_kind_check/)
})

test('voice-derived response obeys speech revocation until final Telegram send',()=>{
 const env={HH_SUBSCRIBER_AI_STT_ENABLED:'true',HH_SUBSCRIBER_AI_STT_FREE_CONFIRMED:'true',
  HH_SUBSCRIBER_AI_VOICE_SCHEMA_READY:'true',HH_SUBSCRIBER_AI_STT_GEMINI_KEY:'x'.repeat(32)}
 const ok={consent_at:new Date(),voice_consent_at:new Date(),stopped_at:null}
 assert.equal(subscriberVoiceReplyAllowed('voice_reply',ok,env),true)
 assert.equal(subscriberVoiceReplyAllowed('voice_reply',{...ok,voice_consent_at:null},env),false)
 assert.equal(subscriberVoiceReplyAllowed('voice_reply',{...ok,consent_at:null},env),false)
 assert.equal(subscriberVoiceReplyAllowed('voice_reply',{...ok,stopped_at:new Date()},env),false)
 assert.equal(subscriberVoiceReplyAllowed('voice_reply',ok,{...env,HH_SUBSCRIBER_AI_STT_ENABLED:'false'}),false)
 assert.equal(subscriberVoiceReplyAllowed('voice_reply',ok,{...env,HH_SUBSCRIBER_AI_VOICE_SCHEMA_READY:'false'}),false)
 assert.equal(subscriberVoiceReplyAllowed('chat',{...ok,voice_consent_at:null},env),true)
 const worker=readFileSync(new URL('../lib/app/subscriber-ai-telegram.js',import.meta.url),'utf8')
 const sql=readFileSync(new URL('../supabase/migrations/20261106151500_hh_subscriber_ai_voice_reply_revocation.sql',import.meta.url),'utf8')
 assert.match(worker,/kind in \('voice','voice_reply'\)/)
 assert.match(worker,/set kind='voice_reply'/)
 assert.match(worker,/subscriberVoiceReplyAllowed\(j.kind,s,env\)/)
 assert.match(sql,/voice_reply/)
})
