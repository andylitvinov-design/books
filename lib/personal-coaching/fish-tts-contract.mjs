// Pure policy for optional bilingual Fish Audio speech in existing private Coaching Live Voice.
// No secrets, provider calls, session content, or persistence in this module.
export const FISH_TTS_MAX_CHARS = 900
export const FISH_TTS_MAX_UTF8_BYTES = 3000
export const FISH_TTS_LOCALES = Object.freeze(['en','ru'])
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const VOICE_ID = /^[0-9a-f]{32}$/i
const CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/

// Billing and vendor-data transfer require separate, explicit owner approval.
// API key and TWO consented/original voice references must exist server-side.
export function fishTtsConfig(env=process.env,locale='en') {
  if (!FISH_TTS_LOCALES.includes(locale) ||
      env.HH_COACHING_LIVE_VOICE_ENABLED !== 'true' ||
      env.HH_COACHING_LIVE_VOICE_APPROVED !== 'true' ||
      env.HH_COACHING_FISH_TTS_ENABLED !== 'true' ||
      env.HH_COACHING_FISH_TTS_APPROVED !== 'true') return null
  const key=String(env.HH_COACHING_FISH_API_KEY||'').trim()
  const en=String(env.HH_COACHING_FISH_VOICE_EN_ID||'').trim()
  const ru=String(env.HH_COACHING_FISH_VOICE_RU_ID||'').trim()
  if (!key || !VOICE_ID.test(en) || !VOICE_ID.test(ru)) return null
  const model=env.HH_COACHING_FISH_MODEL==='s2.1-pro'?'s2.1-pro':'s2.1-pro-free'
  // Fish's free tier may use request text for model improvement. A separate
  // privacy approval is mandatory before sending any real coaching dialogue.
  if(model==='s2.1-pro-free' && env.HH_COACHING_FISH_FREE_CLIENT_DATA_APPROVED!=='true')return null
  return {key,referenceId:locale==='ru'?ru:en,model}
}

export function normalizeFishTtsInput(body) {
  if (!body || typeof body!=='object' || Array.isArray(body) ||
      Object.keys(body).some(key=>!['sessionId','locale','text','voiceConsent','cloudVoiceConsent'].includes(key)) ||
      typeof body.sessionId!=='string' || !UUID.test(body.sessionId) ||
      !FISH_TTS_LOCALES.includes(body.locale) ||
      body.voiceConsent!==true || body.cloudVoiceConsent!==true ||
      typeof body.text!=='string') throw Error('COACHING_FISH_TTS_INVALID')
  const text=body.text.trim()
  if(!text || text.length>FISH_TTS_MAX_CHARS ||
      new TextEncoder().encode(text).byteLength>FISH_TTS_MAX_UTF8_BYTES ||
      CONTROL.test(text)) throw Error('COACHING_FISH_TTS_INVALID')
  return {sessionId:body.sessionId,locale:body.locale,text}
}
