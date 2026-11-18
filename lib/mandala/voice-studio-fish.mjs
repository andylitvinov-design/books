/** Free-only, server-only Fish S2.1 Pro narration for existing Video Studio.
 * Reuse of coaching voice references requires a SEPARATE owner opt-in.
 * Stop after the provider's published free window: 2026-11-30 UTC.
 */
import {readPcmWav} from './wav-pcm-mixer.mjs';
import {VOICE_STUDIO_MAX_CHARS} from './voice-studio.mjs';
export const FISH_STUDIO_FREE_MODEL='s2.1-pro-free';
export const FISH_STUDIO_FREE_END=Date.UTC(2026,11,1);
const MODEL_ID=/^[a-f0-9]{32}$/i;
const CONTROL=/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u;
const fail=(code,status=503)=>Object.assign(new Error(code),{code,status});

export function fishStudioConfig(env={},language='en',now=Date.now()){
  if(!['en','ru'].includes(language)||!Number.isFinite(now)||now>=FISH_STUDIO_FREE_END||
    env.HH_VOICE_STUDIO_FISH_ENABLED!=='true'||
    env.HH_VOICE_STUDIO_FISH_OWNER_APPROVED!=='true'||
    env.HH_VOICE_STUDIO_FISH_FREE_DATA_APPROVED!=='true')return null;
  const key=env.HH_COACHING_FISH_API_KEY;
  const referenceId=env['HH_COACHING_FISH_VOICE_'+language.toUpperCase()+'_ID'];
  if(typeof key!=='string'||key.trim().length<12||
    typeof referenceId!=='string'||!MODEL_ID.test(referenceId))return null;
  return {key:key.trim(),referenceId,model:FISH_STUDIO_FREE_MODEL};
}
export function fishStudioLanguages(env={},now=Date.now()){
  return ['en','ru'].filter(lang=>Boolean(fishStudioConfig(env,lang,now)));
}
export async function requestFishStudioAudio({vendor,text,signal,fetchImpl=fetch,maxBytes=8*1024*1024}){
  if(vendor?.model!==FISH_STUDIO_FREE_MODEL||typeof vendor.key!=='string'||
    typeof vendor.referenceId!=='string'||!MODEL_ID.test(vendor.referenceId))
    throw fail('TTS_FISH_INVALID_CONFIGURATION');
  if(typeof text!=='string'||!text.trim()||[...text].length>VOICE_STUDIO_MAX_CHARS||
    new TextEncoder().encode(text).byteLength>2400||CONTROL.test(text))
    throw fail('TTS_FISH_INVALID_TEXT',400);
  let response;
  try{
    response=await fetchImpl('https://api.fish.audio/v1/tts',{
      method:'POST',signal,cache:'no-store',
      headers:{'Authorization':'Bearer '+vendor.key,'Content-Type':'application/json',
        'Accept':'audio/wav','model':FISH_STUDIO_FREE_MODEL},
      body:JSON.stringify({text,reference_id:vendor.referenceId,format:'wav',
        sample_rate:24000,normalize:true,latency:'normal',
        condition_on_previous_chunks:true,
        prosody:{speed:0.9,volume:0,normalize_loudness:true}}),
    });
  }catch{throw fail('TTS_FISH_UNAVAILABLE');}
  if(response.status===402||response.status===429)throw fail('TTS_FREE_QUOTA_EXHAUSTED',429);
  if(!response.ok||!response.body)throw fail('TTS_FISH_UNAVAILABLE');
  const type=(response.headers.get('content-type')||'').toLowerCase();
  if(!/^(?:audio\/(?:wav|x-wav|wave)|application\/octet-stream)(?:\s*;|$)/u.test(type))
    throw fail('TTS_FISH_INVALID_AUDIO',502);
  const reader=response.body.getReader();
  let total=0;const chunks=[];
  try{
    for(;;){
      const {done,value}=await reader.read();
      if(done)break;
      total+=value.byteLength;
      if(total>maxBytes){await reader.cancel();throw fail('TTS_FISH_AUDIO_TOO_LARGE',502);}
      chunks.push(Buffer.from(value));
    }
  }catch(error){
    if(error?.code==='TTS_FISH_AUDIO_TOO_LARGE')throw error;
    throw fail('TTS_FISH_UNAVAILABLE');
  }
  if(total<48)throw fail('TTS_FISH_INVALID_AUDIO',502);
  const wav=Buffer.concat(chunks);
  try{readPcmWav(wav.buffer.slice(wav.byteOffset,wav.byteOffset+wav.byteLength));}
  catch{throw fail('TTS_FISH_INVALID_AUDIO',502);}
  return wav;
}
