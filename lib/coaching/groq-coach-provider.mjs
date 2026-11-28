// Groq is a temporary reasoning provider for the existing My Coach experience.
// It is OFF unless the owner has separately confirmed free-tier billing and
// account-level Zero Data Retention; a generic Groq transcription key is not consent.
// No new database, client-visible key, transcript retention or background calls.
export const GROQ_COACH_MODEL = 'openai/gpt-oss-120b'
const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_KEY = /^gsk_[A-Za-z0-9_-]{20,}$/

// GPT-OSS 120B supports Groq Strict Structured Outputs. A fixed schema
// prevents malformed/extra fields without any second paid-capable model call.
// Optional client choices are represented as empty strings, never invented.
const COACH_RESPONSE_FORMAT = Object.freeze({
  type:'json_schema',
  json_schema:{
    name:'hh_coach_turn_v3',strict:true,
    schema:{
      type:'object',
      properties:{
        message:{type:'string',description:'Natural response to the latest client turn, 12–700 characters; at most one relevant question.'},
        planSuggestion:{type:'string',description:'Client-owned, evidenced optional action; empty string if no action was explicitly proposed.'},
        evidenceQuote:{type:'string',description:'Exact client wording supporting planSuggestion; empty string if no evidenced action.'},
        clientEvidence:{type:'object',description:'At most ONE soft semantic hint from the LATEST user text. This never establishes consent or action.',properties:{
          kind:{type:'string',enum:['none','goal_focus','desired_outcome','concrete_example','constraint','internal_obstacle','past_exception','existing_strength','positive_experience']},
          quote:{type:'string',description:'Exact substring of the latest client statement (10–180 characters), or empty with kind none.'},
        },required:['kind','quote'],additionalProperties:false},
      },
      required:['message','planSuggestion','evidenceQuote','clientEvidence'],
      additionalProperties:false,
    },
  },
})

export function coachingGroqConfig(env = {}) {
  if (env.HH_COACHING_GROQ_ENABLED !== 'true' ||
      env.HH_COACHING_GROQ_ZDR_CONFIRMED !== 'true' ||
      env.HH_COACHING_GROQ_FREE_TIER_CONFIRMED !== 'true') return null
  const apiKey = env.HH_FIRST_VIDEO_GROQ_API_KEY
  if (typeof apiKey !== 'string' || !GROQ_KEY.test(apiKey)) return null
  return {provider:'groq', apiKey, preferredModel:GROQ_COACH_MODEL}
}

// Reserve more expensive high reasoning for an explicit substantial request.
// The synthetic probe always uses low; earlier instructions never select effort.
export function coachGroqReasoningEffort(messages,probe=false,voiceMode=false) {
  if(probe)return 'low'
  const latest=Array.isArray(messages)?[...messages].reverse().find(m=>m?.role==='user')?.content?.trim():''
  if(typeof latest!=='string'||!latest)return 'medium'
  if(/^(?:hi|hello|hey|thanks?|thank you|ok(?:ay)?|yes|no|привет|здравствуй(?:те)?|спасибо|да|нет|ага|хорошо|hola|gracias|sí|si)[!?.…\s]*$/iu.test(latest))return 'low'
  // Distress, fear, diagnoses and inferred emotions must not trigger high usage.
  const asksToCompare=/(?:\b(?:compare|weigh|evaluate|analy[sz]e|pros and cons|trade[ -]?offs|choose between)\b|сравн(?:и|ить|им)|проанализир(?:уй|овать)|взвес(?:им|ить)|помоги выбрать|разбер(?:и|ём) варианты|compara|analiza|evalúa|evaluar|elegir entre|pros y contras)/iu.test(latest)
  const declinesComparison=/(?:\b(?:don't|do not|no need to)\s+(?:compare|analy[sz]e|evaluate)\b|не\s+(?:нужно|надо|хочу)\s+(?:сравнив|сравнивать|анализировать)|no\s+(?:quiero|necesito)\s+(?:comparar|analizar))/iu.test(latest)
  if(voiceMode){
    // One structured model call, same Director validation. Deepen only on
    // substantive spoken questions; no automatic slow high reasoning.
    // Ordinary descriptive turns do not require hidden deliberation merely
    // because the client used a complete sentence. Preserve deeper reasoning
    // for explicit analysis requests and genuinely extended narratives.
    const substantive=latest.length>=260||
      /(?:\bwhy\b|how come|help me understand|go deeper|почему|помоги понять|разобраться глубже|проанализируй|как это связано|por qué|profundizar)/iu.test(latest)
    return substantive||(asksToCompare&&!declinesComparison)?'medium':'low'
  }
  return asksToCompare&&!declinesComparison&&latest.length>=70?'high':'medium'
}

// The persona + scenario are assembled on the server. Keep the previous
// client-message bound while allowing the longest registered coach instruction.
export function validGroqCoachingMessages(messages) {
  return Array.isArray(messages) && messages.length > 0 && messages.length <= 16 &&
    messages.every(m => ['system','user','assistant'].includes(m?.role) &&
      typeof m.content === 'string' && m.content.length <= (m.role === 'system' ? 40_000 : 12_000)) &&
    messages.reduce((length, message) => length + message.content.length, 0) <= 60_000
}

export async function verifiedGroqCoachingReply(config, {messages, probe = false, voiceMode = false}, fetcher = globalThis.fetch, signal) {
  if (config?.provider !== 'groq' || config.preferredModel !== GROQ_COACH_MODEL ||
      typeof config.apiKey !== 'string' || !GROQ_KEY.test(config.apiKey) ||
      !validGroqCoachingMessages(messages))
    throw Error('GROQ_COACH_REQUEST_INVALID')

  const effort=coachGroqReasoningEffort(messages,probe,voiceMode)
  const payload = {
    model:GROQ_COACH_MODEL, messages, stream:false,
    include_reasoning:false, reasoning_effort:effort,
    // Reasoning tokens also count toward this cap. The old 64-token probe
    // could truncate a hidden low-effort analysis before the synthetic OK.
    temperature:probe?0.1:0.6, max_completion_tokens:probe?512:voiceMode?1450:1800,
    ...(probe ? {} : {response_format:COACH_RESPONSE_FORMAT}),
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
  return {provider:'groq', model:GROQ_COACH_MODEL, text:answer, reasoningEffort:effort}
}
