import 'server-only'
import { AppError, onlyKeys } from '../assessments/contracts.js'
import { verifyCoachMemoryTicket } from '../coaching/coach-staged-memory-ticket.mjs'
import { geminiFreeLiveConfig } from '../coaching/gemini-live-free.mjs'

// Unpaid Gemini must not receive saved personal or confidential information.
// This authenticated compatibility endpoint is deliberately empty. Keep the
// same-origin owner preview/Director, the Live microphone and its quotas apart.
export async function readMyCoachLiveContext(config, actor, input, env=process.env){
  if(!actor?.id||!config?.encryptionKey||!input||
     typeof input!=='object'||Array.isArray(input))
    throw new AppError('MY_COACH_LIVE_CONTEXT_INVALID',400)
  onlyKeys(input,['stage','stageToken','shareApproved','consent','continuity',
    'topicKey','contextSessionToken'])
  const consent=input.consent
  if(input.shareApproved!==true||!consent||
      typeof consent!=='object'||Array.isArray(consent))
    throw new AppError('MY_COACH_LIVE_CONTEXT_CONSENT_REQUIRED',403)
  onlyKeys(consent,['priorSessions','goals','profile','assessments','axes'])
  if(['priorSessions','goals','profile','assessments','axes'].some(k=>
      typeof consent[k]!=='boolean'))
    throw new AppError('MY_COACH_LIVE_CONTEXT_INVALID',400)
  if(!['identity','personal'].includes(input.stage)||
     !['new','previous'].includes(input.continuity)||
     (input.stage==='identity'&&(consent.goals||consent.profile||
       consent.assessments||consent.axes))||
     (consent.axes&&!consent.profile)||
     (!consent.priorSessions&&!consent.goals&&!consent.profile&&
       !consent.assessments))
    throw new AppError('MY_COACH_LIVE_CONTEXT_INVALID',400)
  if(!geminiFreeLiveConfig(env))
    throw new AppError('MY_COACH_GEMINI_LIVE_DISABLED',503)
  const priorAllowed=consent.priorSessions===true
  if(!verifyCoachMemoryTicket(input.stageToken,{
    accountId:actor.id,provider:'gemini_free',secret:config.encryptionKey,
    requirePrior:priorAllowed
  })) throw new AppError('MY_COACH_MEMORY_STAGE_REQUIRED',409)
  if(input.contextSessionToken!==undefined&&
     (input.stage!=='personal'||typeof input.contextSessionToken!=='string'))
    throw new AppError('MY_COACH_LIVE_CONTEXT_INVALID',400)
  // Browser bundles from previous releases may still probe this endpoint.
  // Never look up, decrypt or return any owner archive for this transport.
  return {schema:'HH_MY_COACH_LIVE_CONTEXT_V1',available:false,note:'',scopes:[]}
}
