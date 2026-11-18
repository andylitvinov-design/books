/** Client-safe Fish pilot contract. No secret or voice model IDs appear in browser. */
import {VOICE_STUDIO_MAX_CHARS,VOICE_STUDIO_SAMPLE} from './voice-studio.mjs';
export const FISH_MODEL='s2.1-pro-free';
export const FISH_FREE_END=Date.parse('2026-12-01T00:00:00Z');
export const FISH_VOICES=Object.freeze([
 {id:'fish-ru',language:'ru',name:{ru:'Русский · Fish',en:'Russian · Fish',es:'Ruso · Fish'}},
 {id:'fish-en',language:'en',name:{ru:'Английский · Fish',en:'English · Fish',es:'Inglés · Fish'}},
]);
const ID=/^[0-9a-f]{32}$/i;
export function fishConfig(env={},language,now=Date.now()){
 if(!['en','ru'].includes(language)||!Number.isFinite(now)||now>=FISH_FREE_END||
    env.HH_VOICE_STUDIO_FISH_ENABLED!=='true'||
    env.HH_VOICE_STUDIO_FISH_FREE_TIER_CONFIRMED!=='true'||
    env.HH_VOICE_STUDIO_FISH_FREE_DATA_APPROVED!=='true'||
    env.HH_VOICE_STUDIO_FISH_VOICE_RIGHTS_APPROVED!=='true')return null;
 const approvedReuse=env.HH_VOICE_STUDIO_FISH_USE_COACHING_KEY==='true';
 const dedicated=String(env.HH_VOICE_STUDIO_FISH_API_KEY||'').trim();
 const key=dedicated.length>12?dedicated:approvedReuse?String(env.HH_COACHING_FISH_API_KEY||'').trim():'';
 const customId=String(env[language==='ru'?'HH_VOICE_STUDIO_FISH_VOICE_RU_ID':'HH_VOICE_STUDIO_FISH_VOICE_EN_ID']||'').trim();
 const reusedId=approvedReuse?String(env[language==='ru'?'HH_COACHING_FISH_VOICE_RU_ID':'HH_COACHING_FISH_VOICE_EN_ID']||'').trim():'';
 const referenceId=customId||reusedId;
 return key.length>12&&ID.test(referenceId)?{key,referenceId,model:FISH_MODEL}:null;
}
export const fishLanguages=(env,now)=>['ru','en'].filter(l=>Boolean(fishConfig(env,l,now)));
export function validateFishRequest(body){
 if(!body||typeof body!=='object'||Array.isArray(body)||
   Object.keys(body).some(k=>!['provider','mode','voiceId','language','text','consent'].includes(k))||
   body.provider!=='fish'||!['sample','short_text','custom'].includes(body.mode)||
   body.voiceId!=='fish-'+body.language||!['ru','en'].includes(body.language))
   throw Error('FISH_INVALID_REQUEST');
 if(body.mode==='sample'){
   if('text' in body||'consent' in body)throw Error('FISH_SAMPLE_FIXED_ONLY');
   return {provider:'fish',mode:body.mode,voiceId:body.voiceId,language:body.language,
     text:VOICE_STUDIO_SAMPLE[body.language]};
 }
 if(body.consent!==true||typeof body.text!=='string')throw Error('FISH_CONSENT_REQUIRED');
 const text=body.text.trim();
 if(!text||[...text].length>VOICE_STUDIO_MAX_CHARS||
   new TextEncoder().encode(text).length>2400||/[<>\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(text))
   throw Error('FISH_INVALID_TEXT');
 return {provider:'fish',mode:body.mode,voiceId:body.voiceId,language:body.language,text};
}
