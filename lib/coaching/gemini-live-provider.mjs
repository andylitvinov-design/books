/** Gemini Live is a separately consented future transport for My Coach.
 * The expensive/free-data-use API must not silently replace owner-approved Groq.
 * Real client sessions are blocked until a Director-authoritative voice bridge,
 * provider privacy, cost, and hardware acceptance have all been approved. */
const models=new Set(['gemini-3.1-flash-live-preview','gemini-3.8-live'])
const key=/^AIza[A-Za-z0-9_-]{24,}$/
export const GEMINI_COACH_DEFAULT_MODEL='gemini-3.8-live'

export function geminiCoachLiveConfig(env={}){
  if(env.HH_MY_COACH_GEMINI_LIVE_ENABLED!=='true' ||
    env.HH_MY_COACH_GEMINI_PAID_PRIVACY_APPROVED!=='true' ||
    env.HH_MY_COACH_GEMINI_SPEND_APPROVED!=='true' ||
    env.HH_MY_COACH_GEMINI_DIRECTOR_BRIDGE_VERIFIED!=='true')return null
  const apiKey=env.HH_GEMINI_API_KEY
  const selected=env.HH_MY_COACH_GEMINI_MODEL||GEMINI_COACH_DEFAULT_MODEL
  if(typeof apiKey!=='string'||!key.test(apiKey)||!models.has(selected))return null
  return {provider:'gemini_live',model:selected,apiKey}
}

/** A narrowly scoped model-locked, one-use browser token. Never use a permanent
 * API key in client code. This helper is not an activation endpoint; it must
 * only be invoked by a separately authenticated, consented, rate-limited route
 * after the clinical/privacy review and real Coach Director bridge exist. */
export async function createGeminiCoachEphemeralToken(config,{
  fetcher=globalThis.fetch,now=Date.now(),signal
}={}){
  if(config?.provider!=='gemini_live'||!models.has(config.model)||
    typeof config.apiKey!=='string'||!key.test(config.apiKey))
    throw Error('GEMINI_COACH_NOT_CONFIGURED')
  const expires=new Date(now+25*60*1000).toISOString()
  const newSessionExpires=new Date(now+60*1000).toISOString()
  const response=await fetcher('https://generativelanguage.googleapis.com/v1beta/auth_tokens',{
    method:'POST',redirect:'error',cache:'no-store',signal,
    headers:{'Content-Type':'application/json','x-goog-api-key':config.apiKey},
    body:JSON.stringify({uses:1,expireTime:expires,newSessionExpireTime:newSessionExpires,
      liveConnectConstraints:{
        model:'models/'+config.model,
        config:{sessionResumption:{},responseModalities:['AUDIO'],
          contextWindowCompression:{slidingWindow:{}}}
      }}),
  })
  if(!response?.ok)throw Error('GEMINI_COACH_TOKEN_UNAVAILABLE')
  const reply=await response.json().catch(()=>null)
  if(typeof reply?.name!=='string'||reply.name.length<16||reply.name.length>8192)
    throw Error('GEMINI_COACH_TOKEN_INVALID')
  return {token:reply.name,model:config.model,expiresAt:expires}
}

/** Explicit deterministic picker, never a client-provided model ID or API key.
 * Gemini remains unavailable until ALL independently approved gates are true. */
export function resolveCoachVoiceEngine(choice,{geminiLiveEnabled=false}={}){
  if(choice==='gemini'&&geminiLiveEnabled===true)return 'gemini'
  return 'groq'
}
