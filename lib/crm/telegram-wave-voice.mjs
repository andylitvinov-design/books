/**
 * Native Telegram voice notes for the existing, signed CRM Wave bot.
 * Opt-in consent and quota enforcement live in the V3 service; this helper
 * never downloads audio before its caller verifies both conditions.
 * Reuse the already consent-gated, free-attested Groq Whisper integration.
 */
export const TELEGRAM_WAVE_VOICE_MAX_BYTES = 2_000_000;
export const TELEGRAM_WAVE_VOICE_MAX_SECONDS = 60;
const TRANSCRIPTION_URL='https://api.groq.com/openai/v1/audio/transcriptions';
const BOT_TOKEN=/^\d{5,25}:[A-Za-z0-9_-]{20,}$/;
const fail=()=>Object.assign(new Error('WAVE_VOICE_STT_UNAVAILABLE'),{code:'WAVE_VOICE_STT_UNAVAILABLE'});

export function waveTelegramVoiceReady(env=process.env){
  return env.HH_AUDIO_STT_FREE_CONFIRMED==='true' &&
    env.HH_FIRST_VIDEO_GROQ_FREE_CONFIRMED==='true' &&
    typeof env.HH_FIRST_VIDEO_GROQ_API_KEY==='string' &&
    env.HH_FIRST_VIDEO_GROQ_API_KEY.length>=20;
}
export function validWaveTelegramVoiceMeta(note){
  return note && /^[A-Za-z0-9_-]{20,512}$/.test(String(note.fileId||'')) &&
    Number.isSafeInteger(note.bytes) && note.bytes>=100 &&
    note.bytes<=TELEGRAM_WAVE_VOICE_MAX_BYTES &&
    Number.isSafeInteger(note.seconds) && note.seconds>=0 &&
    note.seconds<=TELEGRAM_WAVE_VOICE_MAX_SECONDS &&
    (note.mime==='audio/ogg'||note.mime==null);
}
const localeLabels={
  ru:{
    intro:'Чтобы я понимал голосовые сообщения, разрешите распознавание аудио через Groq Whisper (внешний сервис). Голос будет отправлен в Groq для транскрипции; не присылайте медицинские документы и личные секреты. До 60 секунд на сообщение. Можно отключить: /voice_off.',
    enabled:'🎤 Голосовой ввод включён. Отправьте голосовое сообщение — я отвечу, как на текст. Отключить: /voice_off.',
    disabled:'🎤 Распознавание голоса выключено. Текстовый диалог продолжает работать.',
    unavailable:'Сейчас бесплатное распознавание голоса недоступно. Напишите, пожалуйста, текстом.',
    invalid:'Голосовое сообщение должно быть в формате Telegram, до 60 секунд и 2 МБ. Попробуйте более короткую запись.',
    failed:'Не удалось распознать голос. Попробуйте другую запись или напишите текстом.',
    heard:'Я услышал',agree:'Разрешить голос',decline:'Не сейчас',
  },
  en:{
    intro:'To understand voice notes, I need your consent to send audio to Groq Whisper for transcription. Groq is an external provider; do not share medical records or private secrets. Maximum 60 seconds per note. You can disable with /voice_off.',
    enabled:'🎤 Voice input is on. Send a voice note and I will respond like a text message. Disable: /voice_off.',
    disabled:'🎤 Voice recognition is off. Text chat still works.',
    unavailable:'Free voice transcription is unavailable right now. Please type your message.',
    invalid:'Please use a Telegram voice note under 60 seconds and 2 MB.',
    failed:'I could not transcribe the recording. Try again or send a text message.',
    heard:'I heard',agree:'Allow voice',decline:'Not now',
  },
  es:{
    intro:'Para entender las notas de voz necesito tu permiso para enviar el audio a Groq Whisper, un servicio externo de transcripción. No compartas informes médicos ni secretos. Máximo 60 segundos. Desactivar: /voice_off.',
    enabled:'🎤 Entrada de voz activada. Envíame una nota y responderé como a un mensaje escrito. Desactivar: /voice_off.',
    disabled:'🎤 Reconocimiento de voz desactivado. El chat de texto sigue activo.',
    unavailable:'El reconocimiento gratuito de voz no está disponible ahora. Escribe tu mensaje.',
    invalid:'Envía una nota de voz de Telegram de hasta 60 segundos y 2 MB.',
    failed:'No pude transcribir la grabación. Inténtalo de nuevo o escribe el mensaje.',
    heard:'He oído',agree:'Permitir voz',decline:'Ahora no',
  }
};
export const waveTelegramVoiceCopy=(locale,key)=>(localeLabels[locale]||localeLabels.en)[key];

async function readBoundedAudio(response){
  if(!response?.ok||!response.body||
     Number(response.headers.get('content-length')||0)>TELEGRAM_WAVE_VOICE_MAX_BYTES)
    throw fail();
  let size=0;const parts=[];
  const reader=response.body.getReader();
  try{
    while(true){
      const {done,value}=await reader.read();
      if(done)break;
      size+=value.byteLength;
      if(size>TELEGRAM_WAVE_VOICE_MAX_BYTES)throw fail();
      parts.push(Buffer.from(value));
    }
  }catch(error){await reader.cancel().catch(()=>{});throw error}
  if(size<100)throw fail();
  const data=Buffer.concat(parts,size);
  if(data.toString('ascii',0,4)!=='OggS'||
     !data.subarray(0,Math.min(4096,data.length)).includes(Buffer.from('OpusHead')))
    throw fail();
  return data;
}
/** The caller must verify persisted voice consent and a shared free quota first. */
export async function transcribeWaveTelegramVoice(note,{token,key,locale='ru',fetcher=fetch}={}){
  if(!validWaveTelegramVoiceMeta(note)||!BOT_TOKEN.test(String(token||''))||
     typeof key!=='string'||key.length<20)throw fail();
  const metaResponse=await fetcher('https://api.telegram.org/bot'+token+'/getFile',{
    method:'POST',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(9000),
    headers:{'Content-Type':'application/json'},body:JSON.stringify({file_id:note.fileId}),
  });
  if(!metaResponse.ok)throw fail();
  const meta=await metaResponse.json(),remote=meta?.result;
  const path=String(remote?.file_path||'');
  if(meta?.ok!==true||!/^voice\/[A-Za-z0-9_./-]{1,180}$/.test(path)||
     path.includes('..')||path.includes('//')||path.includes('\\')||
     Number(remote?.file_size||0)>TELEGRAM_WAVE_VOICE_MAX_BYTES)throw fail();
  const audio=await readBoundedAudio(await fetcher(
    'https://api.telegram.org/file/bot'+token+'/'+path,{
      method:'GET',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(12000),
    }));
  const form=new FormData();
  form.set('file',new Blob([audio],{type:'audio/ogg'}),'telegram-voice.ogg');
  form.set('model','whisper-large-v3-turbo');
  form.set('response_format','json');
  if(['ru','en','es'].includes(locale))form.set('language',locale);
  const provider=await fetcher(TRANSCRIPTION_URL,{
    method:'POST',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(18000),
    headers:{Authorization:'Bearer '+key},body:form,
  });
  if(!provider.ok)throw fail();
  const result=await provider.json();
  const transcript=typeof result?.text==='string'
    ?result.text.replace(/[\u0000-\u001f\u007f]/gu,' ').replace(/\s+/gu,' ').trim():'';
  if(transcript.length<2||transcript.length>1200)throw fail();
  return transcript;
}
