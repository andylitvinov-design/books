import {COACH_CONVERSATION_VOICES} from './conversational-persona.mjs'
import {allowedGeminiCoachVoice} from './gemini-voice-catalog.mjs'
import {validGeminiCoachApiKey} from './gemini-coach-text.mjs'

const modes={
  gemini_tts_free:{key:'HH_GEMINI_FREE_API_KEY',flags:[
    'HH_MY_COACH_GEMINI_TTS_FREE_ENABLED','HH_MY_COACH_GEMINI_FREE_TIER_CONFIRMED',
    'HH_MY_COACH_GEMINI_FREE_DATA_APPROVED'],model:'gemini-3.8-flash-lite-tts'},
  gemini_tts_paid:{key:'HH_GEMINI_PAID_API_KEY',flags:[
    'HH_MY_COACH_GEMINI_TTS_PAID_ENABLED','HH_MY_COACH_GEMINI_PAID_PRIVACY_APPROVED',
    'HH_MY_COACH_GEMINI_SPEND_APPROVED'],model:'gemini-3.8-flash-tts'},
}
const controls=/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/
const secrets=/(?:sk-or-v1-[A-Za-z0-9_-]{12,}|github_pat_[A-Za-z0-9_]{12,}|-----BEGIN [A-Z ]+PRIVATE KEY-----|Bearer\s+[A-Za-z0-9._-]{24,})/i
export function geminiCoachTtsConfig(env={},provider){
  const mode=modes[provider]
  if(!mode||mode.flags.some(k=>env[k]!=='true'))return null
  const apiKey=env[mode.key]
  const otherKey=provider==='gemini_tts_free'?env.HH_GEMINI_PAID_API_KEY:env.HH_GEMINI_FREE_API_KEY
  if(!validGeminiCoachApiKey(apiKey)||apiKey===otherKey)return null
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
// Strictly validate the unary Gemini RIFF/WAV contract before returning audio to Safari.
function validCoachWav(wav){
  if(!Buffer.isBuffer(wav)||wav.length<46||wav.length>2400000||
    wav.toString('ascii',0,4)!=='RIFF'||wav.toString('ascii',8,12)!=='WAVE'||
    wav.readUInt32LE(4)+8!==wav.length)return false
  let offset=12,fmt=false,data=false
  while(offset+8<=wav.length){
    const name=wav.toString('ascii',offset,offset+4)
    const length=wav.readUInt32LE(offset+4)
    const start=offset+8, end=start+length
    if(end>wav.length)return false
    if(name==='fmt '){
      if(fmt||length<16||wav.readUInt16LE(start)!==1||
        wav.readUInt16LE(start+2)!==1||wav.readUInt32LE(start+4)!==24000||
        wav.readUInt32LE(start+8)!==48000||wav.readUInt16LE(start+12)!==2||
        wav.readUInt16LE(start+14)!==16)return false
      fmt=true
    }
    if(name==='data'){
      if(!fmt||data||length<2||length%2!==0)return false
      data=true
    }
    offset=end+(length%2)
  }
  return offset===wav.length&&fmt&&data
}

export async function synthesizeGeminiCoachTts({config,input,signal,fetcher=globalThis.fetch}){
  if(!config||!input||!modes[config.provider]||
    config.model!==modes[config.provider].model||
    !validGeminiCoachApiKey(config.apiKey)||
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
      // Unary TTS returns a complete RIFF/WAV. Use only Google-documented
      // single-speaker speech fields: the language is inferred from the text.
      // Unknown language/max_output_tokens keys can reject an otherwise valid
      // Free audio request before it returns any sound.
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
  if(!validCoachWav(wav))throw Error('GEMINI_COACH_TTS_INVALID_AUDIO')
  return wav
}
