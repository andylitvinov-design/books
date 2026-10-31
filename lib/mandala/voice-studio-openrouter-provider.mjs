/**
 * Isolated alternate TTS provider. xAI through OpenRouter, never OpenRouter text model.
 * The route has the user-consent, origin, authentication and durable paid-call quotas.
 * API: headerless PCM16 24 kHz mono -> validated WAV compatible with our movie exporter.
 */
import {readPcmWav} from './wav-pcm-mixer.mjs';
import {VOICE_STUDIO_OPENROUTER_MODEL,VOICE_STUDIO_MAX_CHARS} from './voice-studio.mjs';
const fail=(code,status)=>Object.assign(new Error(code),{code,status});
export async function requestOpenRouterStudioAudio({
  key,payload,signal,fetchImpl=fetch,maxBytes=8*1024*1024,
}){
  if(typeof key!=='string'||!key.trim())throw fail('TTS_BACKUP_NOT_CONFIGURED',503);
  if(payload?.model!==VOICE_STUDIO_OPENROUTER_MODEL || payload?.response_format!=='pcm' ||
     !['rex','sal','leo','ara','eve'].includes(payload?.voice) ||
     typeof payload?.input!=='string' || !payload.input.trim() ||
     [...payload.input].length>VOICE_STUDIO_MAX_CHARS)throw fail('TTS_BACKUP_INVALID_REQUEST',503);
  let response;
  try{
    response=await fetchImpl('https://openrouter.ai/api/v1/audio/speech',{
      method:'POST',signal,cache:'no-store',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+key,
        'HTTP-Referer':'https://holistichouse.vercel.app','X-Title':'Holistic House'},
      body:JSON.stringify(payload),
    });
  }catch{throw fail('TTS_BACKUP_UNAVAILABLE',503);}
  if(response.status===402||response.status===429)throw fail('TTS_BACKUP_QUOTA_EXHAUSTED',429);
  if(!response.ok)throw fail('TTS_BACKUP_UNAVAILABLE',503);
  const type=(response.headers.get('content-type')||'').toLowerCase();
  if(!/^audio\/(?:pcm|l16)(?:\s*;|$)/.test(type) ||
    (/rate\s*=/.test(type)&&!/rate\s*=\s*24000(?:\D|$)/.test(type)) ||
    (/channels\s*=/.test(type)&&!/channels\s*=\s*1(?:\D|$)/.test(type)))
    throw fail('TTS_BACKUP_INVALID_AUDIO',502);
  const reader=response.body?.getReader();
  if(!reader)throw fail('TTS_BACKUP_INVALID_AUDIO',502);
  const chunks=[];let size=0;
  try{
    for(;;){
      const {done,value}=await reader.read();if(done)break;
      size+=value.byteLength;
      if(size>maxBytes-44){await reader.cancel();throw fail('TTS_RESPONSE_TOO_LARGE',502);}
      chunks.push(Buffer.from(value));
    }
  }catch(error){
    if(error?.code==='TTS_RESPONSE_TOO_LARGE')throw error;
    throw fail('TTS_BACKUP_UNAVAILABLE',503);
  }
  if(size<480||size%2)throw fail('TTS_BACKUP_INVALID_AUDIO',502);
  const pcm=Buffer.concat(chunks), wav=Buffer.alloc(44+size);
  wav.write('RIFF',0);wav.writeUInt32LE(36+size,4);
  wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);
  wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);
  wav.writeUInt32LE(24000,24);wav.writeUInt32LE(48000,28);
  wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);
  wav.write('data',36);wav.writeUInt32LE(size,40);
  pcm.copy(wav,44);
  try{readPcmWav(wav.buffer.slice(wav.byteOffset,wav.byteOffset+wav.length));}
  catch{throw fail('TTS_BACKUP_INVALID_AUDIO',502);}
  return wav;
}
