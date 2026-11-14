import 'server-only'
import {resolveWisdomRequest} from './coaching-wisdom.js'
import {createHash} from 'node:crypto'
import {AppError} from '../assessments/contracts.js'
import {readPersonalCoaching} from './personal-coaching.js'
import {coachingModelConfig, verifiedFreeReply} from '../agent-director/commander-owned-runtime.mjs'
import {coachingGroqConfig, verifiedGroqCoachingReply} from '../coaching/groq-coach-provider.mjs'
import {normalizeGenerativeCoachInput} from '../coaching/generative-persona.mjs'
import {conversationalCoachMessages,parseConversationalCoachReply} from '../coaching/conversational-persona.mjs'
import {
  normalizeCoachingBrainInput, coachingBrainSafety, classifyCoachingResistance,
  coachingBrainBoundary, selectCoachingBrainMethod, coachingBrainStage,
  coachingBrainMessages, parseCoachingBrainReply, offlineCoachingBrainReply,
  normalizeCoachingBrainProbeInput, isCoachingBrainProbeReply,
} from '../personal-coaching/coaching-brain.mjs'


function coachingProviders(env, personaMode=false) {
  // Groq is enabled only for persona My Coach: Personal Coaching retains its
  // separate previously consented OpenRouter provider and contract.
  const groq=personaMode?coachingGroqConfig(env):null
  const openrouter=coachingModelConfig(env)
  return [groq,openrouter].filter(Boolean)
}

async function coachingProviderReply(provider,messages,fetcher,signal,{probe=false}={}) {
  if(provider.provider==='groq')
    return verifiedGroqCoachingReply(provider,{messages,probe},fetcher,signal)
  return verifiedFreeReply(provider,{messages,privacyMode:'zdr'},fetcher,signal)
}

function coachingProviderFailure(error) {
  return {
    GROQ_COACH_RATE_LIMIT:'rate_limited',
    GROQ_COACH_AUTH_FAILURE:'server_not_configured',
    GROQ_COACH_RESPONSE_INVALID:'response_unverified',
    GROQ_COACH_REQUEST_INVALID:'response_unverified',
    OWNED_MODEL_NO_VERIFIED_ZDR_FREE_MODELS:'privacy_model_unavailable',
    OWNED_MODEL_NOT_FREE_IN_CATALOG:'privacy_model_unavailable',
    OWNED_MODEL_FREE_RATE_LIMIT:'rate_limited',
    RATE_LIMITED:'rate_limited',
    OWNED_MODEL_OPENROUTER_KEY_REJECTED:'server_not_configured',
    OWNED_MODEL_COST_UNVERIFIED:'cost_unverified',
    OWNED_MODEL_BILLABLE_RESPONSE_HOLD:'cost_unverified',
    OWNED_MODEL_PRIVACY_POLICY_INVALID:'privacy_model_unavailable',
    COACHING_BRAIN_RESPONSE_INVALID:'response_unverified',
  }[error?.message]||'model_unavailable'
}

// Uses the EXISTING authenticated app and account, and verified no-charge
// inference gateways. No transcripts or AI responses are persisted.
export async function personalCoachingBrainTurn(config,actor,body,{
  env=process.env,fetcher=globalThis.fetch,signal,reserveModelCall,
}={}){
  let input
  try { input=normalizeCoachingBrainInput(body) }
  catch(error){
    throw new AppError(error?.message==='COACHING_BRAIN_SENSITIVE_CONTENT'
      ?'COACHING_BRAIN_SENSITIVE_CONTENT':'COACHING_BRAIN_INPUT_INVALID',400)
  }
  const current=(await readPersonalCoaching(config,actor))?.course?.current
  if(!current||current.id!==input.sessionId)
    throw new AppError('PERSONAL_COACH_NOT_STARTED',404)
  if(current.status!=='active')
    throw new AppError('PERSONAL_COACH_INCOMPLETE',409)
  return runCoachingBrainTurn(input,{env,fetcher,signal,reserveModelCall,
    wisdomLookup:()=>resolveWisdomRequest(config,actor,input)})
}

// The primary My Coach dialogue has no saved Personal Coaching session and
// requires a separately authenticated, account-rate-limited server route.
// Persona settings are allowlisted editorial policies, never client prompts.
export async function myCoachGenerativeTurn(body,{env=process.env,fetcher=globalThis.fetch,signal,reserveModelCall,config,actor}={}) {
  let parsed
  try { parsed=normalizeGenerativeCoachInput(body) }
  catch(error) {
    throw new AppError(error?.message==='COACHING_BRAIN_SENSITIVE_CONTENT'
      ?'COACHING_BRAIN_SENSITIVE_CONTENT':'COACHING_BRAIN_INPUT_INVALID',400)
  }
  const result=await runCoachingBrainTurn(parsed.input,{env,fetcher,signal,reserveModelCall,
    wisdomLookup:config&&actor?()=>resolveWisdomRequest(config,actor,parsed.input):null},parsed.persona)
  return {...result,personaId:parsed.persona.personaId}
}

async function runCoachingBrainTurn(input,{env,fetcher,signal,reserveModelCall,wisdomLookup},persona=null) {
  const interruption=coachingBrainSafety(input)
  if(interruption)return interruption
  const resistance=classifyCoachingResistance(input)
  const boundary=coachingBrainBoundary(input,resistance)
  if(boundary)return boundary
  // A wisdom request must be explicit. Safety and stop/skip boundaries win.
  // Retrieval never sends user messages to a provider and consumes no model credit.
  if(typeof wisdomLookup==='function'){
    const wisdom=await wisdomLookup()
    if(wisdom)return wisdom
  }
  const method=selectCoachingBrainMethod(input)
  const stage=coachingBrainStage(input)
  // A separate explicit coaching gate prevents Agent Director enabling from
  // silently transmitting any client coaching text to its model provider.
  // Do not transmit personal coaching text unless the independent owner gate
  // and the existing free-only gateway are both configured.
  const offline=(offlineReason)=>({
    ...offlineCoachingBrainReply(input,method,stage,resistance),offlineReason,
  })
  if(env.HH_COACHING_BRAIN_ENABLED!=='true')return offline('feature_disabled')
  const providers=coachingProviders(env,Boolean(persona))
  if(!providers.length)return offline('server_not_configured')
  const timeout=AbortSignal.timeout(18000)
  const boundedSignal=signal?AbortSignal.any([signal,timeout]):timeout
  // Both providers receive the SAME reviewed method/persona instructions;
  // no client-controlled model selection or duplicate client database.
  const messages=persona
    ? conversationalCoachMessages(input,persona,method,stage,resistance)
    : coachingBrainMessages(input,method,stage,resistance)
  let lastError=null
  for(const provider of providers){
    try {
      // Existing shared DB-backed budget charges every actual provider call.
      if(typeof reserveModelCall==='function')await reserveModelCall()
      const reply=await coachingProviderReply(provider,messages,fetcher,boundedSignal)
      return persona
        ? parseConversationalCoachReply(reply.text,input,method,stage)
        : parseCoachingBrainReply(reply.text,input,method,stage)
    }catch(error){
      // No private content, provider errors or keys appear in logs/responses.
      // The second provider is only the explicitly consented FREE ZDR fallback.
      lastError=error
      if(error?.message==='RATE_LIMITED')break
    }
  }
  // Existing authored coaching question remains safe when both clouds fail.
  return offline(coachingProviderFailure(lastError))
}

 
// A short-lived best-effort cache saves the daily quota from repeated opens.
// Keyed by a one-way credential fingerprint, never by a raw key or client text.
const verifiedProbeCache=new Map()
const VERIFIED_PROBE_TTL_MS=60_000

// Client-triggered synthetic readiness check: no client text, transcript,
// saved answers, plans or other identifiers sent to the external provider.
export async function personalCoachingBrainProbe(config,actor,body,{
  env=process.env,fetcher=globalThis.fetch,signal,reserveModelCall,
}={}) {
  let input
  try { input=normalizeCoachingBrainProbeInput(body) }
  catch { throw new AppError('COACHING_BRAIN_PROBE_INVALID',400) }
  const current=(await readPersonalCoaching(config,actor))?.course?.current
  if(!current || current.id!==input.sessionId)
    throw new AppError('PERSONAL_COACH_NOT_STARTED',404)
  if(current.status!=='active')
    throw new AppError('PERSONAL_COACH_INCOMPLETE',409)
  return runCoachingBrainProbe({env,fetcher,signal,reserveModelCall})
}

// Signed-in public My Coach probe. It sends a synthetic "OK" only: never
// personal messages or transcript. Used before enabling the primary composer.
export async function myCoachGenerativeProbe({env=process.env,fetcher=globalThis.fetch,signal,reserveModelCall}={}){
  return runCoachingBrainProbe({env,fetcher,signal,reserveModelCall,personaMode:true})
}

async function runCoachingBrainProbe({env,fetcher,signal,reserveModelCall,personaMode=false}){
  const unavailable=reason=>({schema:'HH_COACHING_BRAIN_PROBE_V1',status:'unavailable',reason})
  if(env.HH_COACHING_BRAIN_ENABLED!=='true')return unavailable('feature_disabled')
  const providers=coachingProviders(env,personaMode)
  if(!providers.length)return unavailable('server_not_configured')
  // Cache is synthetic-only and short-lived. Never key on client text.
  const allowCache=env===process.env&&fetcher===globalThis.fetch
  const fingerprint=allowCache?createHash('sha256').update(providers
    .map(p=>p.apiKey+'|'+(p.preferredModel||'')).join('|')).digest('hex'):null
  const cached=fingerprint?verifiedProbeCache.get(fingerprint):null
  if(cached&&cached.expires>Date.now())return cached.result
  let lastError=null
  for(const provider of providers){
    try {
      if(typeof reserveModelCall==='function')await reserveModelCall()
      const timeout=AbortSignal.timeout(12000)
      const boundedSignal=signal?AbortSignal.any([signal,timeout]):timeout
      const reply=await coachingProviderReply(provider,[
        {role:'system',content:'This is a synthetic connectivity check. Answer exactly OK in uppercase. No other text.'},
        {role:'user',content:'Reply OK.'},
      ],fetcher,boundedSignal,{probe:true})
      if(!isCoachingBrainProbeReply(reply.text))throw Error('COACHING_BRAIN_RESPONSE_INVALID')
      const verified={schema:'HH_COACHING_BRAIN_PROBE_V1',status:'verified',
        model:reply.model,
        privacyRouting:provider.provider==='groq'?'account_zdr_owner_confirmed':'zdr',
        cost:provider.provider==='groq'?'owner_confirmed_free_tier':'zero_verified'}
      if(fingerprint){
        if(verifiedProbeCache.size>12)verifiedProbeCache.clear()
        verifiedProbeCache.set(fingerprint,{result:verified,expires:Date.now()+VERIFIED_PROBE_TTL_MS})
      }
      return verified
    }catch(error){
      lastError=error
      if(error?.message==='RATE_LIMITED')break
    }
  }
  return unavailable(coachingProviderFailure(lastError))
}
