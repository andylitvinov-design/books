// Read-only provider key readiness, temporary operator-only probe.
// Never returns API keys, raw provider objects, account IDs, billing metadata,
// prompts or response content. No generateContent / chat completion request.
import {createHash,timingSafeEqual} from 'node:crypto'
import {GEMINI_MODEL,GEMINI_FREE_FALLBACK_MODEL,chooseFreeMistral,modelSettings} from './council-free-models.mjs'

const EXACT_ORIGIN='https://holistichouse.vercel.app'
const EXACT_PATH='/api/internal/council-provider-readiness'
const PROOF=/^[A-Za-z0-9_-]{64,96}$/
const MAX_TTL=90*60*1000
const errType=code=>code===401||code===403?'unauthorized':
  code===429?'rate_limited':code===404?'not_found':
  code>=500?'provider_error':'http_'+code

export function councilProviderProbeAuthorized(url,env={},now=Date.now()){
  if(env.VERCEL_ENV!=='production'||!Number.isFinite(now))return false
  const expires=Number(env.HH_COUNCIL_PROBE_EXPIRES)
  if(!Number.isSafeInteger(expires)||expires<=now||expires-now>MAX_TTL)return false
  let requested
  try{requested=new URL(url)}catch{return false}
  if(requested.origin!==EXACT_ORIGIN||requested.pathname!==EXACT_PATH||
     requested.hash||requested.searchParams.size!==1||
     !requested.searchParams.has('proof'))return false
  const proof=requested.searchParams.get('proof')
  const expected=env.HH_COUNCIL_PROBE_SECRET
  if(!PROOF.test(proof||'')||!PROOF.test(expected||''))return false
  const digest=v=>createHash('sha256').update(v).digest()
  return timingSafeEqual(digest(proof),digest(expected))
}

export async function inspectGeminiModelAccess(env,fetcher=fetch){
  if(!env.HH_COUNCIL_GEMINI_API_KEY)
    return {keyPresent:false,authenticated:false,modelReady:false,reason:'missing_key'}
  // GET only: Free Tier authentication/model capability, not a real completion.
  // If 3.8 is rejected for model-specific quota/unavailability, discover 3.6.
  for(const model of [GEMINI_MODEL,GEMINI_FREE_FALLBACK_MODEL]){
    try{
      const r=await fetcher(
        'https://generativelanguage.googleapis.com/v1beta/models/'+model,{
          method:'GET',headers:{'x-goog-api-key':env.HH_COUNCIL_GEMINI_API_KEY},
          redirect:'error',cache:'no-store',signal:AbortSignal.timeout(9500)
        })
      if(!r.ok){
        if(model===GEMINI_MODEL&&[404,429,503].includes(r.status))continue
        return {keyPresent:true,authenticated:false,modelReady:false,reason:errType(r.status)}
      }
      const value=await r.json().catch(()=>null)
      const ready=value?.name==='models/'+model&&
        value?.supportedGenerationMethods?.includes('generateContent')===true
      if(ready)return {keyPresent:true,authenticated:true,modelReady:true,
        model,reason:model===GEMINI_MODEL?'valid_model':'valid_fallback_model'}
      if(model===GEMINI_MODEL)continue
      return {keyPresent:true,authenticated:false,modelReady:false,reason:'model_not_confirmed'}
    }catch{
      // Unknown network/timeouts do not authorize a second provider request.
      return {keyPresent:true,authenticated:false,modelReady:false,reason:'network_unavailable'}
    }
  }
  return {keyPresent:true,authenticated:false,modelReady:false,reason:'model_not_confirmed'}
}
async function inspectRouter(env,fetcher){
  if(!env.HH_COUNCIL_OPENROUTER_API_KEY)
    return {keyPresent:false,authenticated:false,freeMistralListed:false,reason:'missing_key'}
  try{
    const [current,catalog]=await Promise.all([
      fetcher('https://openrouter.ai/api/v1/key',{
        method:'GET',headers:{Authorization:'Bearer '+env.HH_COUNCIL_OPENROUTER_API_KEY},
        cache:'no-store',redirect:'error',signal:AbortSignal.timeout(9500)
      }),
      fetcher('https://openrouter.ai/api/v1/models',{
        method:'GET',headers:{accept:'application/json'},
        cache:'no-store',redirect:'error',signal:AbortSignal.timeout(9500)
      })
    ])
    if(!current.ok)return {keyPresent:true,authenticated:false,freeMistralListed:false,reason:errType(current.status)}
    const key=await current.json().catch(()=>null)
    if(!key?.data||typeof key.data!=='object'||Array.isArray(key.data))
      return {keyPresent:true,authenticated:false,freeMistralListed:false,reason:'unverified_key'}
    if(!catalog.ok)return {keyPresent:true,authenticated:true,freeMistralListed:false,reason:'catalog_'+errType(catalog.status)}
    const data=await catalog.json().catch(()=>null)
    const chosen=chooseFreeMistral(data?.data)
    return {keyPresent:true,authenticated:true,freeMistralListed:Boolean(chosen),
      ...(chosen?{model:chosen.id}:{}),
      reason:chosen?'free_model_listed':'no_verified_free_mistral'}
  }catch{return {keyPresent:true,authenticated:false,freeMistralListed:false,reason:'network_unavailable'}}
}

export async function inspectCouncilProviderKeys(env=process.env,fetcher=fetch){
  const [gemini,mistral]=await Promise.all([
    inspectGeminiModelAccess(env,fetcher),inspectRouter(env,fetcher)
  ])
  const flags=modelSettings(env)
  return {
    ok:true,
    method:'read_only_http_get_no_inference_no_telegram_sends',
    gemini:{...gemini,model:gemini.model||GEMINI_MODEL,
      freeTierConfirmed:flags.geminiFreeConfirmed,
      readyForChat:gemini.modelReady&&flags.geminiFreeConfirmed},
    mistral:{...mistral,readyForChat:mistral.authenticated&&mistral.freeMistralListed},
    modelResponseTested:false,
    note:'Key/model metadata only. Actual free model response and Telegram delivery require separate E2E.'
  }
}
