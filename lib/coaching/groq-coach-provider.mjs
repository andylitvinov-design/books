// Groq is a temporary reasoning provider for the existing My Coach experience.
// It is OFF unless the owner has separately confirmed free-tier billing and
// account-level Zero Data Retention; a generic Groq transcription key is not consent.
// No new database, client-visible key, transcript retention or background calls.
export const GROQ_COACH_MODEL = 'openai/gpt-oss-120b'
const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_KEY = /^gsk_[A-Za-z0-9_-]{20,}$/

export function coachingGroqConfig(env = {}) {
  if (env.HH_COACHING_GROQ_ENABLED !== 'true' ||
      env.HH_COACHING_GROQ_ZDR_CONFIRMED !== 'true' ||
      env.HH_COACHING_GROQ_FREE_TIER_CONFIRMED !== 'true') return null
  const apiKey = env.HH_FIRST_VIDEO_GROQ_API_KEY
  if (typeof apiKey !== 'string' || !GROQ_KEY.test(apiKey)) return null
  return {provider:'groq', apiKey, preferredModel:GROQ_COACH_MODEL}
}

export async function verifiedGroqCoachingReply(config, {messages, probe = false}, fetcher = globalThis.fetch, signal) {
  if (config?.provider !== 'groq' || config.preferredModel !== GROQ_COACH_MODEL ||
      typeof config.apiKey !== 'string' || !GROQ_KEY.test(config.apiKey) ||
      !Array.isArray(messages) || !messages.length || messages.length > 16 ||
      messages.some(m => !['system','user','assistant'].includes(m?.role) ||
        typeof m.content !== 'string' || m.content.length > 12000))
    throw Error('GROQ_COACH_REQUEST_INVALID')

  const payload = {
    model:GROQ_COACH_MODEL, messages, stream:false,
    include_reasoning:false, reasoning_effort:probe?'low':'medium',
    temperature:probe?0.1:0.45, max_completion_tokens:probe?64:1800,
    ...(probe ? {} : {response_format:{type:'json_object'}}),
  }
  let response
  try {
    response = await fetcher(GROQ_ENDPOINT, {
      method:'POST', redirect:'error', cache:'no-store', signal,
      headers:{'Content-Type':'application/json', Authorization:'Bearer '+config.apiKey},
      body:JSON.stringify(payload),
    })
  } catch { throw Error('GROQ_COACH_UNAVAILABLE') }
  if (response?.status === 429) throw Error('GROQ_COACH_RATE_LIMIT')
  if (response?.status === 401 || response?.status === 403) throw Error('GROQ_COACH_AUTH_FAILURE')
  if (!response?.ok || typeof response.text !== 'function') throw Error('GROQ_COACH_UNAVAILABLE')
  let raw
  try { raw = await response.text() } catch { throw Error('GROQ_COACH_UNAVAILABLE') }
  if (typeof raw !== 'string' || raw.length > 120000) throw Error('GROQ_COACH_RESPONSE_INVALID')
  let data
  try { data = JSON.parse(raw) } catch { throw Error('GROQ_COACH_RESPONSE_INVALID') }
  const choice = data?.choices?.[0]
  const answer = choice?.message?.content
  if (data?.model !== GROQ_COACH_MODEL || choice?.finish_reason !== 'stop' ||
      choice.message?.tool_calls?.length || typeof answer !== 'string' ||
      answer.trim().length < 2 || answer.length > 3600)
    throw Error('GROQ_COACH_RESPONSE_INVALID')
  return {provider:'groq', model:GROQ_COACH_MODEL, text:answer}
}
