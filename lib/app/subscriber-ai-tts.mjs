// Telegram outgoing narration. Only reviewed PUBLIC phrases may reach Gemini Free.
// Never pass user turns, profile, history, health content, STT transcripts or chat ids.
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {voiceStudioKey,findStudioVoice,buildStudioPayload} from '../mandala/voice-studio.mjs';
import {requestStudioAudio} from '../mandala/voice-studio-provider.mjs';

const PHRASES=Object.freeze({
 ru:Object.freeze({hello:'Я здесь! Напишите, что сейчас для вас актуально, или выберите действие.'}),
 en:Object.freeze({hello:'I am here! Tell me what matters to you or choose an action.'}),
 es:Object.freeze({hello:'¡Estoy aquí! Cuéntame qué necesitas o elige una opción.'}),
});
const COPY={
 ru:{intro:'Исходящие голосовые ответы — отдельная функция. Google Gemini Free может использовать отправленный текст для улучшения сервисов. В Google отправляются ТОЛЬКО общие заготовленные фразы, не ваша переписка, тесты или личные сведения. Включить? Отключить: /speak_off.',
  enabled:'Разрешена озвучка общих фраз. Личные ответы остаются текстом. /speak_off — отключить.',
  disabled:'Исходящая озвучка отключена; AI и подписка работают как прежде.',
  unavailable:'Бесплатная исходящая озвучка сейчас недоступна. Я отвечу текстом.',
  allow:'Включить общие фразы',decline:'Не сейчас'},
 en:{intro:'Outgoing voice is separate. Google Gemini Free may use submitted text to improve services. ONLY prewritten public phrases are sent; no private chat, results or health details. Enable? /speak_off disables.',
  enabled:'Public-phrase voice is enabled. Private replies remain text. /speak_off disables.',
  disabled:'Outgoing voice is off. AI chat and subscriptions still work.',
  unavailable:'Free outgoing voice is currently unavailable. I will reply in text.',
  allow:'Enable public voice',decline:'Not now'},
 es:{intro:'La voz saliente es independiente. Google Gemini Free puede usar el texto enviado para mejorar servicios. Solo enviamos frases públicas preparadas, nunca charlas o datos privados. ¿Activar? /speak_off desactiva.',
  enabled:'Voz para frases públicas activada. Las respuestas personales siguen en texto. /speak_off desactiva.',
  disabled:'Voz saliente desactivada; chat y suscripción siguen activos.',
  unavailable:'La voz gratuita no está disponible. Responderé por texto.',
  allow:'Activar voz pública',decline:'Ahora no'},
};
export function subscriberTtsCopy(locale,key){
 const entries=typeof locale==='string'&&Object.hasOwn(COPY,locale)?COPY[locale]:COPY.en;
 return typeof key==='string'&&Object.hasOwn(entries,key)?entries[key]:COPY.en.unavailable;
}
export function subscriberTtsButtons(locale){return {inline_keyboard:[[
 {text:subscriberTtsCopy(locale,'allow'),callback_data:'hhai:tts-agree'},
 {text:subscriberTtsCopy(locale,'decline'),callback_data:'hhai:tts-off'},
]]};}
export function subscriberTtsPhrase(locale,key){
 const phrases=typeof locale==='string'&&Object.hasOwn(PHRASES,locale)?PHRASES[locale]:null;
 // An object prototype property is NEVER an approved phrase.
 return phrases&&typeof key==='string'&&Object.hasOwn(phrases,key)?phrases[key]:null;
}
export function subscriberTtsHash(locale,key){
 const phrase=subscriberTtsPhrase(locale,key);
 return phrase?createHash('sha256').update('hh-ai-tts:v1|'+locale+'|'+phrase).digest('hex'):null;
}
export function subscriberTtsReady(env=process.env){
 return env.HH_SUBSCRIBER_AI_TTS_ENABLED==='true' &&
  env.HH_SUBSCRIBER_AI_TTS_FREE_CONFIRMED==='true' &&
  env.HH_SUBSCRIBER_AI_TTS_SCHEMA_READY==='true' && Boolean(voiceStudioKey(env));
}
function isOggOpus(bytes){
 return Buffer.isBuffer(bytes)&&bytes.length>80&&bytes.length<=2_000_000&&
  bytes.subarray(0,4).toString('ascii')==='OggS'&&
  bytes.subarray(0,128).includes(Buffer.from('OpusHead'));
}
export const validTelegramOpus=isOggOpus;
export async function wavToTelegramOpus(wav,{binary,timeoutMs=7500}={}){
 if(!Buffer.isBuffer(wav)||wav.length<100||wav.length>2_000_000||
   wav.subarray(0,4).toString('ascii')!=='RIFF'||
   wav.subarray(8,12).toString('ascii')!=='WAVE')throw Error('TTS_INVALID_WAV');
 const executable=binary||createRequire(import.meta.url)('ffmpeg-static');
 if(typeof executable!=='string'||!executable)throw Error('TTS_OPUS_ENCODER_UNAVAILABLE');
 return new Promise((resolve,reject)=>{
  let total=0,settled=false;const chunks=[];
  const child=spawn(executable,['-hide_banner','-loglevel','error','-nostdin',
   '-f','wav','-i','pipe:0','-vn','-ac','1','-ar','24000','-c:a','libopus',
   '-b:a','32k','-application','voip','-f','ogg','pipe:1'],
   {stdio:['pipe','pipe','ignore']});
  const finish=(error,buffer)=>{if(settled)return;settled=true;clearTimeout(timer);
    if(error)reject(error);else resolve(buffer);};
  const timer=setTimeout(()=>{child.kill('SIGKILL');finish(Error('TTS_OPUS_TIMEOUT'));},
   Math.min(9000,Math.max(1000,timeoutMs)));
  child.on('error',()=>finish(Error('TTS_OPUS_ENCODER_UNAVAILABLE')));
  child.stdout.on('data',part=>{
   total+=part.length;
   if(total>2_000_000){child.kill('SIGKILL');finish(Error('TTS_OPUS_TOO_LARGE'));return;}
   chunks.push(part);
  });
  child.on('close',code=>{
   const bytes=Buffer.concat(chunks);
   if(code!==0||!isOggOpus(bytes))finish(Error('TTS_OPUS_INVALID'));
   else finish(null,bytes);
  });
  child.stdin.on('error',()=>{});child.stdin.end(wav);
 });
}
export async function synthesizePublicTelegramPhrase({locale,key,env=process.env,
  requestAudio=requestStudioAudio,convert=wavToTelegramOpus}={}){
 if(!subscriberTtsReady(env))throw Error('TTS_FREE_NOT_CONFIRMED');
 const phrase=subscriberTtsPhrase(locale,key);
 if(!phrase)throw Error('TTS_PHRASE_NOT_APPROVED');
 const apiKey=voiceStudioKey(env),voice=findStudioVoice('maya');
 const wav=await requestAudio({key:apiKey,
  payload:buildStudioPayload({mode:'sample',language:locale,text:phrase,voice}),
  signal:AbortSignal.timeout(11000),maxBytes:2_000_000});
 const opus=await convert(wav);
 if(!isOggOpus(opus))throw Error('TTS_OPUS_INVALID');
 return opus;
}
// Bot API voice accepts an OGG/Opus upload or a cached bot-specific file_id.
export async function telegramSendVoice({token,chatId,voice,caption,fetcher=fetch}){
 if(!/^\d{6,16}:[A-Za-z0-9_-]{25,}$/.test(token||'')||
   !/^\d{5,20}$/.test(String(chatId||''))||
   typeof caption!=='string'||caption.length>900||
   !(typeof voice==='string'&&/^[A-Za-z0-9_-]{20,}$/.test(voice)||isOggOpus(voice)))
  return {status:'rejected'};
 const body=new FormData();body.append('chat_id',String(chatId));
 body.append('allow_paid_broadcast','false');body.append('caption',caption);
 if(typeof voice==='string')body.append('voice',voice);
 else body.append('voice',new Blob([new Uint8Array(voice)],{type:'audio/ogg'}),'hh-voice.ogg');
 try{
  const response=await fetcher('https://api.telegram.org/bot'+token+'/sendVoice',{
   method:'POST',body,cache:'no-store',redirect:'error',signal:AbortSignal.timeout(7000)});
  const payload=await response.json();
  if(response.status===429)return {status:'rate',after:Math.min(120,Math.max(1,Number(payload?.parameters?.retry_after)||5))};
  if(response.ok&&payload?.ok===true&&Number.isSafeInteger(payload?.result?.message_id)){
   const fileId=payload.result?.voice?.file_id;
   return {status:'accepted',id:String(payload.result.message_id),
    fileId:typeof fileId==='string'&&/^[A-Za-z0-9_-]{20,}$/.test(fileId)?fileId:null};
  }
  return {status:response.status>=400&&response.status<500?'rejected':'unknown'};
 }catch{return {status:'unknown'};}
}
