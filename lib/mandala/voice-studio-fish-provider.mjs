/** Free-only Fish TTS, returning validated WAV for the existing local nature mixer. */
import {readPcmWav} from './wav-pcm-mixer.mjs';
import {FISH_MODEL} from './voice-studio-fish.mjs';
const fail=(code,status)=>Object.assign(new Error(code),{code,status});
const OFFICIAL_PUBLIC_REFERENCES=Object.freeze({
 'fish-igor':'55ece81d65564775ab448bab3b525599',
 'fish-ekaterina':'6d23d3209d6849e0b24ddae6f734afe9',
 'fish-sarah':'933563129e564b19a115bedd57b7406a',
 'fish-jordan':'79d0bd3e4e5444b18f7b6d89b5927bf1',
 'fish-selene':'b347db033a6549378b48d00acb0d06cd',
 // Non-Fish-Official third-party voice is held pending provider's commercial license.
 'fish-calm-meditation':'14c13e72d4644b0dbd2f147df20f6d80',
 'fish-e1':'e517c0350c5043c09112b763a75892be',
 'fish-zorya':'1723d5fc6a4041178bef80a3d9ed4067',
 'fish-sasha':'aeca68fc0f82475eb9d9c0d5b106d8bc',
 'fish-m4':'e293d74f83aa4e8fb97805154819c565',
 'fish-en':'933563129e564b19a115bedd57b7406a',
 'fish-ru':'55ece81d65564775ab448bab3b525599',
});
// Owner sound approval alone does not grant third-party commercial rights.
export const FISH_COMMUNITY_LICENSE_FLAGS=Object.freeze({
 'fish-calm-meditation':'HH_VOICE_STUDIO_FISH_CALM_COMMERCIAL_LICENSE_APPROVED',
 'fish-e1':'HH_VOICE_STUDIO_FISH_E1_COMMERCIAL_LICENSE_APPROVED',
 'fish-zorya':'HH_VOICE_STUDIO_FISH_ZORYA_COMMERCIAL_LICENSE_APPROVED',
 'fish-sasha':'HH_VOICE_STUDIO_FISH_SASHA_COMMERCIAL_LICENSE_APPROVED',
 'fish-m4':'HH_VOICE_STUDIO_FISH_M4_COMMERCIAL_LICENSE_APPROVED',
})
export function approvedFishReference(voiceId,env={}){
 const permission=FISH_COMMUNITY_LICENSE_FLAGS[voiceId]
 if(permission&&env[permission]!=='true')return null
 return Object.hasOwn(OFFICIAL_PUBLIC_REFERENCES,voiceId)?OFFICIAL_PUBLIC_REFERENCES[voiceId]:null
}
export async function requestFishWav({vendor,input,signal,fetchImpl=fetch,maxBytes=8*1024*1024,env={}}){
 const reference=approvedFishReference(input?.voiceId,env);
 if(!vendor||vendor.model!==FISH_MODEL||typeof vendor.key!=='string'||
    !/^[0-9a-f]{32}$/i.test(vendor.referenceId||'')||!reference||vendor.referenceId!==reference||
    input?.provider!=='fish'||!['ru','en'].includes(input?.language)||
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
