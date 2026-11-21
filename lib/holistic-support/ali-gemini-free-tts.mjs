import {aliPersonaGreeting,isAliPersonaId} from './ali-personas.mjs'

// Four original Ali Messenger presenters; the owner's selected Gemini voices.
// Do not add these to the unrelated private My Coach voice selector.
export const ALI_GEMINI_GREETING_VOICES=Object.freeze({
  alex:Object.freeze({en:'Charon',ru:'Alnilam',es:'Charon'}),
  max:Object.freeze({en:'Orus',ru:'Orus',es:'Orus'}),
  mira:Object.freeze({en:'Gacrux',ru:'Erinome',es:'Gacrux'}),
  sofia:Object.freeze({en:'Sulafat',ru:'Vindemiatrix',es:'Sulafat'})
})
const supportedLocales=new Set(['en','ru','es'])
// Google AI Studio issued AQ. authorization keys after May 2026.
// Keep legacy AIza keys; do not require the separate unmerged My Coach PR.
const keyPattern=/^(?:AIza[A-Za-z0-9_-]{24,}|AQ\.[A-Za-z0-9_-]{50})$/

export function aliGeminiGreetingVoice(personaId,locale){
  return isAliPersonaId(personaId)&&supportedLocales.has(locale)?
    (ALI_GEMINI_GREETING_VOICES[personaId]?.[locale]||null):null
}

// Strictly fixed editorial greetings: no arbitrary, client-supplied or private
// dialogue text is ever accepted by this first-party public audio backend.
export async function synthesizeAliGeminiGreeting({
 config,personaId,locale,text,signal,fetcher=fetch
}={}){
 const voiceName=aliGeminiGreetingVoice(personaId,locale)
 if(config?.provider!=='gemini_tts_free'||
  config.model!=='gemini-3.8-flash-lite-tts'||
  !keyPattern.test(config.apiKey||'')||!voiceName||
  typeof text!=='string'||text!==aliPersonaGreeting(personaId,locale))
  throw Error('ALI_GEMINI_GREETING_INVALID')
 const response=await fetcher('https://generativelanguage.googleapis.com/v1beta/interactions',{
  method:'POST',redirect:'error',cache:'no-store',signal,
  headers:{'Content-Type':'application/json','x-goog-api-key':config.apiKey},
  body:JSON.stringify({
   store:false,model:config.model,
   input:[{type:'user_input',content:[{type:'text',text,
    annotations:[{type:'speech_metadata',style:
      locale==='ru'?'Natural clear Russian speech, warm and attentive':
      locale==='es'?'Natural clear Spanish speech, warm and attentive':
      'Natural clear English speech, warm and attentive'}]}]}],
   response_format:{type:'audio'},
   generation_config:{speech_config:[{voice:voiceName}]}
  })
 })
 if(response?.status===429)throw Error('ALI_GEMINI_GREETING_RATE_LIMIT')
 if(!response?.ok)throw Error('ALI_GEMINI_GREETING_UNAVAILABLE')
 const reply=await response.json().catch(()=>null)
 const base64=reply?.output_audio?.data||
  reply?.steps?.filter(s=>s?.type==='model_output')?.flatMap(s=>s.content||[])
   ?.filter(c=>c?.type==='audio')?.at(-1)?.data
 if(typeof base64!=='string'||base64.length<80||base64.length>3200000||
  !/^[A-Za-z0-9+/]+={0,2}$/.test(base64))
  throw Error('ALI_GEMINI_GREETING_BAD_AUDIO')
 const wav=Buffer.from(base64,'base64')
 if(wav.length<44||wav.length>2400000||
  wav.toString('ascii',0,4)!=='RIFF'||wav.toString('ascii',8,12)!=='WAVE')
  throw Error('ALI_GEMINI_GREETING_BAD_AUDIO')
 return wav
}
