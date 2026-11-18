/** Free-only Fish TTS, returning validated WAV for the existing local nature mixer. */
import {readPcmWav} from './wav-pcm-mixer.mjs';
import {FISH_MODEL} from './voice-studio-fish.mjs';
const fail=(code,status)=>Object.assign(new Error(code),{code,status});
export async function requestFishWav({vendor,input,signal,fetchImpl=fetch,maxBytes=8*1024*1024}){
 if(!vendor||vendor.model!==FISH_MODEL||typeof vendor.key!=='string'||
    !/^[0-9a-f]{32}$/i.test(vendor.referenceId||'')||
    input?.provider!=='fish'||input?.voiceId!=='fish-'+input?.language||
    typeof input?.text!=='string'||[...input.text].length>650)
   throw fail('FISH_INVALID_REQUEST',503);
 let response;
 try{
   response=await fetchImpl('https://api.fish.audio/v1/tts',{
     method:'POST',signal,cache:'no-store',
     headers:{Authorization:'Bearer '+vendor.key,'Content-Type':'application/json',
       Accept:'audio/wav',model:FISH_MODEL},
     body:JSON.stringify({text:input.text,reference_id:vendor.referenceId,
       language:input.language,format:'wav',sample_rate:24000,latency:'normal',
       prosody:{speed:0.86,volume:0,normalize_loudness:true}}),
   });
 }catch{throw fail('FISH_UNAVAILABLE',503);}
 if(response.status===402||response.status===429)throw fail('FISH_FREE_QUOTA',429);
 if(!response.ok)throw fail('FISH_UNAVAILABLE',503);
 const type=(response.headers.get('content-type')||'').toLowerCase();
 if(type&&!/^(?:audio\/(?:wav|x-wav|wave)|application\/octet-stream)(?:;|$)/.test(type))
   throw fail('FISH_INVALID_AUDIO',502);
 const reader=response.body?.getReader();if(!reader)throw fail('FISH_INVALID_AUDIO',502);
 const chunks=[];let length=0;
 try{
   for(;;){
     const {done,value}=await reader.read();if(done)break;
     length+=value.byteLength;
     if(length>maxBytes){await reader.cancel();throw fail('FISH_AUDIO_TOO_LARGE',502);}
     chunks.push(Buffer.from(value));
   }
 }catch(error){if(error?.code==='FISH_AUDIO_TOO_LARGE')throw error;throw fail('FISH_UNAVAILABLE',503);}
 if(length<48)throw fail('FISH_INVALID_AUDIO',502);
 const wav=Buffer.concat(chunks);
 try{
   const pcm=readPcmWav(wav.buffer.slice(wav.byteOffset,wav.byteOffset+wav.length));
   if(pcm.rate!==24000)throw Error('INVALID_RATE');
 }catch{throw fail('FISH_INVALID_AUDIO',502);}
 return wav;
}
