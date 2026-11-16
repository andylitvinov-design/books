// Adapts opt-in voice turns to the existing Coaching Brain, never a second AI.
export const VOICE_INPUT_LIMIT = 1200
export const VOICE_REPLY_LIMIT = 900
export const VOICE_HISTORY_LIMIT = 6
export const VOICE_LOCALES = Object.freeze(['en', 'ru', 'es'])
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const controls = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/

export function coachingVoiceEnabled(env = process.env) {
  return env.HH_COACHING_LIVE_VOICE_ENABLED === 'true' &&
    env.HH_COACHING_LIVE_VOICE_APPROVED === 'true' &&
    env.HH_COACHING_BRAIN_ENABLED === 'true'
}

export function spokenLocale(text, preferred = 'en') {
  const fallback = VOICE_LOCALES.includes(preferred) ? preferred : 'en'
  if (/[\u0400-\u052f]/u.test(text)) return 'ru'
  if (/[¿¡ñáéíóúü]/iu.test(text)) return 'es'
  return fallback
}

export function normalizeVoiceTurn(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body) ||
      Object.keys(body).some(k => !['sessionId','locale','message','history','voiceConsent'].includes(k)))
    throw Error('COACHING_VOICE_INVALID_INPUT')
  if (typeof body.sessionId !== 'string' || !uuid.test(body.sessionId) ||
      !VOICE_LOCALES.includes(body.locale) || body.voiceConsent !== true ||
      typeof body.message !== 'string' || body.message.trim().length < 3 ||
      body.message.length > VOICE_INPUT_LIMIT || controls.test(body.message))
    throw Error('COACHING_VOICE_INVALID_INPUT')
  const history = body.history === undefined ? [] : body.history
  if (!Array.isArray(history) || history.length > VOICE_HISTORY_LIMIT ||
      history.some(row => !row || typeof row !== 'object' || Array.isArray(row) ||
        Object.keys(row).some(k => !['role','text'].includes(k)) ||
        !['user','assistant'].includes(row.role) || typeof row.text !== 'string' ||
        row.text.trim().length < 1 || row.text.length > VOICE_REPLY_LIMIT ||
        controls.test(row.text)))
    throw Error('COACHING_VOICE_INVALID_HISTORY')
  return {
    sessionId:body.sessionId, locale:spokenLocale(body.message,body.locale),
    message:body.message.trim(), history:history.map(row=>({
      role:row.role,text:row.text.trim(),
    })),
  }
}

export function toCoachingBrainRequest(input) {
  return {sessionId:input.sessionId,locale:input.locale,consent:true,
    message:input.message,
    turns:input.history.map(row=>({role:row.role,content:row.text}))}
}

export function restrictVoiceOpenRouterPayload(body) {
  // Preserve the existing verified-zero-price contract and never relax it.
  if (!body || typeof body !== 'object' || Array.isArray(body) ||
      typeof body.model !== 'string' || !body.model.endsWith(':free') ||
      body.provider?.allow_fallbacks !== false ||
      body.provider?.max_price?.prompt !== 0 ||
      body.provider?.max_price?.completion !== 0)
    throw Error('COACHING_VOICE_PROVIDER_POLICY_DENIED')
  return {...body,provider:{...body.provider,data_collection:'deny'}}
}

export function voiceReplyFromBrain(result, locale) {
  if (!result || !['ai','offline','safety'].includes(result.mode) ||
      typeof result.reflection !== 'string' || typeof result.question !== 'string')
    throw Error('COACHING_VOICE_BRAIN_REPLY_INVALID')
  const reply=[result.reflection,result.question].filter(Boolean).join(' ').replace(/\s+/g,' ').trim()
  if (!reply) throw Error('COACHING_VOICE_BRAIN_REPLY_INVALID')
  return {reply:reply.slice(0,VOICE_REPLY_LIMIT),locale,
    safety:result.mode==='safety'?'urgent':'clear',
    providerUsed:result.mode==='ai',
    mode:result.mode}
}
