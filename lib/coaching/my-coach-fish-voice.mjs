// One optional cloud speech provider for the FIRST-PARTY My Coach conversation.
// Never use unlicensed community/film/dubbing voice IDs. Fish chooses a generic
// built-in voice when reference_id is omitted. Never silently switch to paid TTS.
export const MY_COACH_TTS_LOCALES=Object.freeze(['en','ru','es'])
export const MY_COACH_TTS_MAX_CHARS=900
export const MY_COACH_TTS_MAX_BYTES=3000
const controls=/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/
const secrets=/(?:sk-or-v1-[A-Za-z0-9_-]{12,}|github_pat_[A-Za-z0-9_]{12,}|-----BEGIN [A-Z ]+PRIVATE KEY-----|Bearer\s+[A-Za-z0-9._-]{24,})/i

export function myCoachFishConfig(env=process.env,now=Date.now()){
  // Fail closed when the currently published free offer ends.
  if(now>=Date.parse('2026-12-01T00:00:00.000Z'))return null
  if(env.HH_MY_COACH_FISH_TTS_ENABLED!=='true'||
     env.HH_MY_COACH_FISH_TTS_APPROVED!=='true'||
     env.HH_MY_COACH_FISH_FREE_DATA_ACKNOWLEDGED!=='true')
    return null
  const key=String(env.HH_COACHING_FISH_API_KEY||'').trim()
  if(!key)return null
  return {key,model:'s2.1-pro-free'}
}

export function normalizeMyCoachFishRequest(body){
  if(!body||typeof body!=='object'||Array.isArray(body)||
     Object.keys(body).some(k=>!['locale','text','voiceConsent','cloudVoiceConsent','trainingUseConsent'].includes(k))||
     !MY_COACH_TTS_LOCALES.includes(body.locale)||
     body.voiceConsent!==true||body.cloudVoiceConsent!==true||body.trainingUseConsent!==true||
     typeof body.text!=='string')throw Error('MY_COACH_FISH_TTS_INVALID')
  const text=body.text.trim()
  if(!text||text.length>MY_COACH_TTS_MAX_CHARS||
     new TextEncoder().encode(text).byteLength>MY_COACH_TTS_MAX_BYTES||
     controls.test(text)||secrets.test(text))
    throw Error('MY_COACH_FISH_TTS_INVALID')
  return {locale:body.locale,text}
}
