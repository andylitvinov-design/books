import 'server-only'
import {AppError} from '../assessments/contracts.js'
import {readPersonalCoaching} from './personal-coaching.js'
import {ownedModelConfig, verifiedFreeReply} from '../agent-director/commander-owned-runtime.mjs'
import {normalizeGenerativeCoachInput} from '../coaching/generative-persona.mjs'
import {
  normalizeCoachingBrainInput, coachingBrainSafety, classifyCoachingResistance,
  coachingBrainBoundary, selectCoachingBrainMethod, coachingBrainStage,
  coachingBrainMessages, parseCoachingBrainReply, offlineCoachingBrainReply,
  normalizeCoachingBrainProbeInput, isCoachingBrainProbeReply,
} from '../personal-coaching/coaching-brain.mjs'

// Uses the EXISTING authenticated app account and the existing verified :free
// OpenRouter text gateway. No transcripts or AI responses are persisted.
export async function personalCoachingBrainTurn(config,actor,body,{
  env=process.env,fetcher=globalThis.fetch,signal,
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
  return runCoachingBrainTurn(input,{env,fetcher,signal})
}

// The primary My Coach dialogue has no saved Personal Coaching session and
// requires a separately authenticated, account-rate-limited server route.
// Persona settings are allowlisted editorial policies, never client prompts.
export async function myCoachGenerativeTurn(body,{env=process.env,fetcher=globalThis.fetch,signal}={}) {
  let parsed
  try { parsed=normalizeGenerativeCoachInput(body) }
  catch(error) {
    throw new AppError(error?.message==='COACHING_BRAIN_SENSITIVE_CONTENT'
      ?'COACHING_BRAIN_SENSITIVE_CONTENT':'COACHING_BRAIN_INPUT_INVALID',400)
  }
  const result=await runCoachingBrainTurn(parsed.input,{env,fetcher,signal},parsed.persona)
  return {...result,personaId:parsed.persona.personaId}
}

async function runCoachingBrainTurn(input,{env,fetcher,signal},persona=null) {
  const interruption=coachingBrainSafety(input)
  if(interruption)return interruption
  const resistance=classifyCoachingResistance(input)
  const boundary=coachingBrainBoundary(input,resistance)
  if(boundary)return boundary
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
  const provider=ownedModelConfig(env)
  if(!provider)return offline('server_not_configured')
  try{
    const timeout=AbortSignal.timeout(18000)
    const boundedSignal=signal?AbortSignal.any([signal,timeout]):timeout
    const messages=coachingBrainMessages(input,method,stage,resistance)
    if(persona) messages.splice(1,0,{role:'system',content:persona.systemInstructions})
    const reply=await verifiedFreeReply(provider,{
      messages,
      privacyMode:'zdr',
    },fetcher,boundedSignal)
    return parseCoachingBrainReply(reply.text,input,method,stage)
  }catch(error){
    // No client text, private data, keys or raw provider errors are logged or
    // returned. These are bounded, code-only diagnostics for the UI.
    const reason={
      OWNED_MODEL_NO_VERIFIED_ZDR_FREE_MODELS:'privacy_model_unavailable',
      OWNED_MODEL_NOT_FREE_IN_CATALOG:'privacy_model_unavailable',
      OWNED_MODEL_FREE_RATE_LIMIT:'rate_limited',
      OWNED_MODEL_OPENROUTER_KEY_REJECTED:'server_not_configured',
      OWNED_MODEL_COST_UNVERIFIED:'cost_unverified',
      OWNED_MODEL_BILLABLE_RESPONSE_HOLD:'cost_unverified',
      OWNED_MODEL_PRIVACY_POLICY_INVALID:'privacy_model_unavailable',
      COACHING_BRAIN_RESPONSE_INVALID:'response_unverified',
    }[error?.message]||'model_unavailable'
    // Existing private session data is never modified by a failed AI turn.
    return offline(reason)
  }
}

 
// Client-triggered synthetic readiness check: no client text, transcript,
// saved answers, plans or other identifiers sent to the external provider.
export async function personalCoachingBrainProbe(config,actor,body,{
  env=process.env,fetcher=globalThis.fetch,signal,
}={}) {
  let input
  try { input=normalizeCoachingBrainProbeInput(body) }
  catch { throw new AppError('COACHING_BRAIN_PROBE_INVALID',400) }
  const current=(await readPersonalCoaching(config,actor))?.course?.current
  if(!current || current.id!==input.sessionId)
    throw new AppError('PERSONAL_COACH_NOT_STARTED',404)
  if(current.status!=='active')
    throw new AppError('PERSONAL_COACH_INCOMPLETE',409)
  return runCoachingBrainProbe({env,fetcher,signal})
}

// Signed-in public My Coach probe. It sends a synthetic "OK" only: never
// personal messages or transcript. Used before enabling the primary composer.
export async function myCoachGenerativeProbe({env=process.env,fetcher=globalThis.fetch,signal}={}){
  return runCoachingBrainProbe({env,fetcher,signal})
}

async function runCoachingBrainProbe({env,fetcher,signal}){
  const unavailable=reason=>({schema:'HH_COACHING_BRAIN_PROBE_V1',status:'unavailable',reason})
  if(env.HH_COACHING_BRAIN_ENABLED!=='true')return unavailable('feature_disabled')
  const provider=ownedModelConfig(env)
  if(!provider)return unavailable('server_not_configured')
  try {
    const timeout=AbortSignal.timeout(12000)
    const boundedSignal=signal?AbortSignal.any([signal,timeout]):timeout
    const reply=await verifiedFreeReply(provider,{
      privacyMode:'zdr',
      messages:[
        {role:'system',content:'This is a synthetic connectivity check. Answer exactly OK in uppercase. No other text.'},
        {role:'user',content:'Reply OK.'},
      ],
    },fetcher,boundedSignal)
    if(!isCoachingBrainProbeReply(reply.text))return unavailable('response_unverified')
    return {schema:'HH_COACHING_BRAIN_PROBE_V1',status:'verified',
      model:reply.model,privacyRouting:'zdr',cost:'zero_verified'}
  }catch(error) {
    const reason={
      OWNED_MODEL_NO_VERIFIED_ZDR_FREE_MODELS:'privacy_model_unavailable',
      OWNED_MODEL_NOT_FREE_IN_CATALOG:'privacy_model_unavailable',
      OWNED_MODEL_FREE_RATE_LIMIT:'rate_limited',
      OWNED_MODEL_OPENROUTER_KEY_REJECTED:'server_not_configured',
      OWNED_MODEL_COST_UNVERIFIED:'cost_unverified',
      OWNED_MODEL_BILLABLE_RESPONSE_HOLD:'cost_unverified',
      OWNED_MODEL_PRIVACY_POLICY_INVALID:'privacy_model_unavailable',
    }[error?.message]||'model_unavailable'
    return unavailable(reason)
  }
}
