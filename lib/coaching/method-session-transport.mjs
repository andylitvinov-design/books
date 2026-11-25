/** Optional server-owned method handshake. Existing clients remain compatible.
 * No transcripts, model calls, storage or new provider. Never trust client history
 * as authoritative milestones. The verified actor owns the encrypted cookie.
 */
import {resolveCoachMethodId} from './persona-registry.mjs'
import {normalizeGenerativeCoachInput} from './generative-persona.mjs'
import {newCoachSession,openCoachSession,advanceCoachSession} from './session-authority.mjs'

export function startCoachMethodSession(body,{token,config,actor,now=Date.now()}){
  if(!body||typeof body!=='object'||Array.isArray(body)||
    Object.keys(body).some(key=>!['personaId','methodId'].includes(key))||
    typeof body.methodId!=='string'||!body.methodId||
    resolveCoachMethodId(body.personaId,body.methodId)!==body.methodId)
    throw Error('COACH_SESSION_INPUT_INVALID')
  const prior=openCoachSession(token,config,actor,body.personaId,now)
  if(prior&&prior.methodId!==body.methodId)throw Error('COACH_SESSION_METHOD_CONFLICT')
  return prior||newCoachSession(actor,body.personaId,now,body.methodId)
}

export function prepareCoachMethodTurn(body,{token,config,actor,now=Date.now()}){
  if(!body||typeof body!=='object'||Array.isArray(body)||!Object.hasOwn(body,'methodId'))
    return {body,progress:null}
  const {methodId,...legacyBody}=body
  if(typeof methodId!=='string'||!methodId||resolveCoachMethodId(body.personaId,methodId)!==methodId)
    throw Error('COACH_SESSION_INPUT_INVALID')
  const session=openCoachSession(token,config,actor,body.personaId,now)
  if(!session)throw Error('COACH_SESSION_REQUIRED')
  if(session.methodId!==methodId)throw Error('COACH_SESSION_METHOD_CONFLICT')
  // Run the existing strict consent, language, secret and transcript validators
  // before deriving any evidence from the current client statement.
  const {input}=normalizeGenerativeCoachInput(legacyBody)
  const progress=advanceCoachSession(session,{message:input.message,locale:input.locale},now)
  return {body:legacyBody,progress}
}

export function coachMethodAuthorityInput(input,progress){
  if(!progress)return input
  // Keep the established active-foreground timebox. Cookie wall time is expiry
  // only, not permission to end a paused coaching conversation.
  return {...input,authoritativeMethodId:progress.session.methodId,
    authoritativeEvidence:progress.authoritativeEvidence,
    authoritativeNoAdvice:progress.authoritativeNoAdvice,
    sessionTurnCount:progress.session.turnCount}
}
