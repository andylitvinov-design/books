import 'server-only'
import {AppError} from '../assessments/contracts.js'
import {readPersonalCoaching} from './personal-coaching.js'
import {ownedModelConfig, verifiedFreeReply} from '../agent-director/commander-owned-runtime.mjs'
import {
  normalizeCoachingBrainInput, coachingBrainSafety, selectCoachingBrainMethod,
  coachingBrainStage, coachingBrainMessages, parseCoachingBrainReply,
  offlineCoachingBrainReply,
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
  const interruption=coachingBrainSafety(input)
  if(interruption)return interruption
  const method=selectCoachingBrainMethod(input)
  const stage=coachingBrainStage(input)
  // A separate explicit coaching gate prevents Agent Director enabling from
  // silently transmitting any client coaching text to its model provider.
  const provider=env.HH_COACHING_BRAIN_ENABLED==='true'?ownedModelConfig(env):null
  if(!provider)return offlineCoachingBrainReply(input,method,stage)
  try{
    const timeout=AbortSignal.timeout(18000)
    const boundedSignal=signal?AbortSignal.any([signal,timeout]):timeout
    const reply=await verifiedFreeReply(provider,{
      messages:coachingBrainMessages(input,method,stage),
    },fetcher,boundedSignal)
    return parseCoachingBrainReply(reply.text,input,method,stage)
  }catch{
    // An upstream timeout, nonzero/unverified cost, unavailable free model,
    // non-JSON answer, or client disconnect never falsifies a valid AI reply.
    // Client's existing encrypted answers remain untouched.
    return offlineCoachingBrainReply(input,method,stage)
  }
}
