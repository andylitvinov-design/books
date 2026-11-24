// One explicit Gemini request per coaching turn. Free/Paid keys never overlap.
export const GEMINI_COACH_TEXT_MODELS=Object.freeze({
  gemini_free:'gemini-3.1-flash-lite',gemini_paid:'gemini-3.8-flash',
})
// New Google AI Studio keys issued since May 2026 use a 53-character AQ.
// authorization credential; keep legacy restricted AIza keys too.
export function validGeminiCoachApiKey(value){
  return typeof value==='string'&&(
    /^AIza[A-Za-z0-9_-]{24,}$/.test(value)||
    /^AQ\.[A-Za-z0-9_-]{50}$/.test(value))
}
const gates={
  gemini_free:{key:'HH_GEMINI_FREE_API_KEY',flags:[
    'HH_MY_COACH_GEMINI_FREE_ENABLED','HH_MY_COACH_GEMINI_FREE_TIER_CONFIRMED',
    'HH_MY_COACH_GEMINI_FREE_DATA_APPROVED']},
  gemini_paid:{key:'HH_GEMINI_PAID_API_KEY',flags:[
    'HH_MY_COACH_GEMINI_PAID_ENABLED','HH_MY_COACH_GEMINI_PAID_PRIVACY_APPROVED',
    'HH_MY_COACH_GEMINI_SPEND_APPROVED']},
}
export function geminiCoachTextConfig(env={},mode){
  const gate=gates[mode]
  if(!gate||gate.flags.some(name=>env[name]!=='true'))return null
  const apiKey=env[gate.key]
  const otherKey=mode==='gemini_free'?env.HH_GEMINI_PAID_API_KEY:env.HH_GEMINI_FREE_API_KEY
  if(!validGeminiCoachApiKey(apiKey)||apiKey===otherKey)return null
  return {provider:mode,model:GEMINI_COACH_TEXT_MODELS[mode],apiKey}
}
export async function verifiedGeminiCoachingReply(config,{messages},fetcher=globalThis.fetch,signal){
  if(!config||GEMINI_COACH_TEXT_MODELS[config.provider]!==config.model||
    !validGeminiCoachApiKey(config.apiKey)||
    !Array.isArray(messages)||messages.length<2||messages.length>16||
    messages.at(-1)?.role!=='user'||!messages.some(m=>m.role==='system')||
    messages.some(m=>!['system','user','assistant'].includes(m?.role)||
      typeof m.content!=='string'||!m.content||m.content.length>11000))
    throw Error('GEMINI_COACH_REQUEST_INVALID')
  const system=messages.filter(m=>m.role==='system').map(m=>m.content).join('\n\n')
  if(system.length>20000)throw Error('GEMINI_COACH_REQUEST_INVALID')
  const contents=messages.filter(m=>m.role!=='system').map(m=>({
    role:m.role==='assistant'?'model':'user',parts:[{text:m.content}],
  }))
  let response
  try{
    response=await fetcher('https://generativelanguage.googleapis.com/v1beta/models/'+config.model+':generateContent',{
      method:'POST',redirect:'error',cache:'no-store',signal,
      headers:{'Content-Type':'application/json','x-goog-api-key':config.apiKey},
      body:JSON.stringify({systemInstruction:{parts:[{text:system}]},contents,
        generationConfig:{responseMimeType:'application/json',maxOutputTokens:1100}}),
    })
  }catch{throw Error('GEMINI_COACH_UNAVAILABLE')}
  if(response?.status===429)throw Error('GEMINI_COACH_RATE_LIMIT')
  if(response?.status===401||response?.status===403)throw Error('GEMINI_COACH_AUTH_FAILURE')
  if(!response?.ok)throw Error('GEMINI_COACH_UNAVAILABLE')
  const data=await response.json().catch(()=>null)
  const candidate=data?.candidates?.[0]
  const reply=candidate?.content?.parts?.map(p=>p?.text||'').join('')
  if(candidate?.finishReason!=='STOP'||typeof reply!=='string'||reply.length<10||reply.length>5000)
    throw Error('GEMINI_COACH_RESPONSE_INVALID')
  try{JSON.parse(reply)}catch{throw Error('GEMINI_COACH_RESPONSE_INVALID')}
  return {provider:config.provider,model:config.model,text:reply}
}
