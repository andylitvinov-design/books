import {COACH_CONVERSATION_VOICES} from './conversational-persona.mjs'
import {allowedGeminiCoachVoice} from './gemini-voice-catalog.mjs'

const modes={
  gemini_tts_free:{key:'HH_GEMINI_FREE_API_KEY',flags:[
    'HH_MY_COACH_GEMINI_TTS_FREE_ENABLED','HH_MY_COACH_GEMINI_FREE_TIER_CONFIRMED',
    'HH_MY_COACH_GEMINI_FREE_DATA_APPROVED'],model:'gemini-3.8-flash-lite-tts'},
  gemini_tts_paid:{key:'HH_GEMINI_PAID_API_KEY',flags:[
    'HH_MY_COACH_GEMINI_TTS_PAID_ENABLED','HH_MY_COACH_GEMINI_PAID_PRIVACY_APPROVED',
    'HH_MY_COACH_GEMINI_SPEND_APPROVED'],model:'gemini-3.8-flash-tts'},
}
const keyPattern=/^AIza[A-Za-z0-9_-]{24,}$/
const controls=/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/
const secrets=/(?:sk-or-v1-[A-Za-z0-9_-]{12,}|github_pat_[A-Za-z0-9_]{12,}|-----BEGIN [A-Z ]+PRIVATE KEY-----|Bearer\s+[A-Za-z0-9._-]{24,})/i
export function geminiCoachTtsConfig(env={},provider){
  const mode=modes[provider]
  if(!mode||mode.flags.some(k=>env[k]!=='true'))return null
  const apiKey=env[mode.key]
  const otherKey=provider==='gemini_tts_free'?env.HH_GEMINI_PAID_API_KEY:env.HH_GEMINI_FREE_API_KEY
  if(typeof apiKey!=='string'||!keyPattern.test(apiKey)||apiKey===otherKey)return null
  return {provider,model:mode.model,apiKey}
}
export function normalizeGeminiCoachTtsInput(body){
  if(!body||typeof body!=='object'||Array.isArray(body)||
    Object.keys(body).some(k=>!['provider','locale','personaId','text','voiceName','preview',
      'voiceConsent','cloudVoiceConsent','trainingUseConsent'].includes(k))||
    !modes[body.provider]||!['ru','en','es'].includes(body.locale)||
    !allowedGeminiCoachVoice(body.personaId,body.voiceName)||
    body.voiceConsent!==true||body.cloudVoiceConsent!==true||
    (body.provider==='gemini_tts_free'&&body.trainingUseConsent!==true)||
    (body.preview!==undefined&&body.preview!==true)||
    (body.preview===true&&body.text!==undefined))
    throw Error('GEMINI_COACH_TTS_INVALID')
  const text=body.preview===true?
    COACH_CONVERSATION_VOICES[body.personaId]?.sample?.[body.locale]:body.text?.trim()
  if(typeof text!=='string'||!text||text.length>500||
    new TextEncoder().encode(text).length>1600||controls.test(text)||secrets.test(text))
    throw Error('GEMINI_COACH_TTS_INVALID')
  return {provider:body.provider,locale:body.locale,personaId:body.personaId,
    text,voiceName:body.voiceName,preview:body.preview===true}
}
export async function synthesizeGeminiCoachTts({config,input,signal,fetcher=globalThis.fetch}){
  if(!config||!input||!modes[config.provider]||
    config.model!==modes[config.provider].model||
    !keyPattern.test(config.apiKey||'')||
    !allowedGeminiCoachVoice(input.personaId,input.voiceName))
    throw Error('GEMINI_COACH_TTS_DISABLED')
  const response=await fetcher('https://generativelanguage.googleapis.com/v1beta/interactions',{
    method:'POST',redirect:'error',cache:'no-store',signal,
    headers:{'Content-Type':'application/json','x-goog-api-key':config.apiKey},
    body:JSON.stringify({
      // Interactions API defaults to stored provider requests (Free 1d / Paid 55d).
      // Coach speech is stateless. Explicitly disable provider interaction logs.
      store:false,
      model:config.model,
      input:[{type:'user_input',content:[{type:'text',text:input.text,
        annotations:[{type:'speech_metadata',style:
          input.locale==='ru'?'Natural clear Russian speech, calm conversational pace':
          input.locale==='es'?'Natural clear Spanish speech, calm conversational pace':
          'Natural clear English speech, calm conversational pace'}]}]}],
      response_format:{type:'audio'},
      generation_config:{speech_config:[{voice:input.voiceName}]},
    }),
  })
  if(response?.status===429)throw Error('GEMINI_COACH_TTS_RATE_LIMIT')
  if(!response?.ok)throw Error('GEMINI_COACH_TTS_UNAVAILABLE')
  const reply=await response.json().catch(()=>null)
  const audio=reply?.output_audio?.data||
    reply?.steps?.filter(s=>s?.type==='model_output')?.flatMap(s=>s.content||[])
      ?.filter(c=>c?.type==='audio')?.at(-1)?.data
  if(typeof audio!=='string'||audio.length<80||audio.length>3200000||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(audio))
    throw Error('GEMINI_COACH_TTS_INVALID_AUDIO')
  const wav=Buffer.from(audio,'base64')
  if(wav.length<44||wav.length>2400000||
    wav.toString('ascii',0,4)!=='RIFF'||wav.toString('ascii',8,12)!=='WAVE')
    throw Error('GEMINI_COACH_TTS_INVALID_AUDIO')
  return wav
}
