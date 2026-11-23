import {getCoachPersona} from './persona-registry.mjs'

// One optional cloud speech provider for the FIRST-PARTY My Coach conversation.
// Never use unlicensed community/film/dubbing voice IDs. Fish chooses a generic
// built-in voice when reference_id is omitted. Never silently switch to paid TTS.
// Stable public Fish Voice Library example IDs (not film/celebrity clones).
// Mira uses Sarah, the expressly showcased female Fish developer voice.
// Other fictional personas use distinct public library examples where known.
// All genders are explicit; never silently use the provider's male default.
// Source: fish.audio/developers; runware.ai/docs/models/fish-audio-s2-1-pro.
export const MY_COACH_FISH_VOICES=Object.freeze({
  mira:'933563129e564b19a115bedd57b7406a', // Sarah · female
  max:'79d0bd3e4e5444b18f7b6d89b5927bf1', // Jordan · energetic
  sofia:'e3cd384158934cc9a01029cd7d278634', // Laura · female
  alex:'bf322df2096a46f18c579d0baa36f41d', // Adrian · steady
  merlin:'536d3a5e000945adb7038665781a4aca', // Ethan · interim public library male; not an actor
  harry:'79d0bd3e4e5444b18f7b6d89b5927bf1', // Jordan · interim public library male; not an actor
  genie:'79d0bd3e4e5444b18f7b6d89b5927bf1', // Jordan · generic library voice; not a film imitation
  lea:'b347db033a6549378b48d00acb0d06cd', // Selene · female calm
  noah:'536d3a5e000945adb7038665781a4aca', // Ethan · upbeat
  iris:'9a9cf47702da476aa4629e2506d4a857', // Hannah · female
  ray:'79d0bd3e4e5444b18f7b6d89b5927bf1', // Jordan · playful pacing
})
// Owner rejected earlier too-young Arisha and soft Sasha voice. Only reviewed
// adult professional Russian female candidate; do NOT enable for a commercial
// site until the owner's Fish library usage rights are confirmed. The known
// English Sarah voice stays as the safe default until that server-side gate.
export const MIRA_RU_FISH_VOICE_CANDIDATE='a2e5329824cf499bb23f05d3df98a983' // mur · adult clear and professional RU
export function myCoachFishVoice(personaId,locale='en',env=process.env){
  if(typeof personaId!=='string'||!Object.hasOwn(MY_COACH_FISH_VOICES,personaId))return null
  if(personaId==='mira'&&locale==='ru'&&
     env.HH_MY_COACH_MIRA_RU_VOICE_RIGHTS_APPROVED==='true')
    return MIRA_RU_FISH_VOICE_CANDIDATE
  return MY_COACH_FISH_VOICES[personaId]
}
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
     // Replay and microphone sessions both send the public selected personaId.
     // Validate (but never forward) that ID; reject every other unknown field.
     Object.keys(body).some(k=>!['locale','text','personaId','voiceConsent','cloudVoiceConsent','trainingUseConsent'].includes(k))||
     (body.personaId!==undefined&&!getCoachPersona(body.personaId))||
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
