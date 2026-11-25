/** Optional server-owned method handshake. Existing clients remain compatible.
 * No transcripts, model calls, storage or new provider. Never trust client history
 * as authoritative milestones. The verified actor owns the encrypted cookie.
 */
import {resolveCoachMethodId} from './persona-registry.mjs'
import {normalizeGenerativeCoachInput} from './generative-persona.mjs'
import {newCoachSession,openCoachSession,advanceCoachSession,validCoachClientSessionId} from './session-authority.mjs'

export function startCoachMethodSession(body,{token,config,actor,now=Date.now()}){
  if(!body||typeof body!=='object'||Array.isArray(body)||
    Object.keys(body).some(key=>!['personaId','methodId','methodSessionId'].includes(key))||
    (body.methodSessionId!==undefined&&!validCoachClientSessionId(body.methodSessionId))||
    typeof body.methodId!=='string'||!body.methodId||
    resolveCoachMethodId(body.personaId,body.methodId)!==body.methodId)
    throw Error('COACH_SESSION_INPUT_INVALID')
  const prior=openCoachSession(token,config,actor,body.personaId,now)
  // The same logical start is idempotent; deliberate new sessions replace old browser cookies.
  const same=prior&&prior.clientSessionId===body.methodSessionId
  if(same&&prior.methodId!==body.methodId)throw Error('COACH_SESSION_METHOD_CONFLICT')
  return same?prior:newCoachSession(actor,body.personaId,now,body.methodId,body.methodSessionId??null)
}

export function prepareCoachMethodRequest(body,{token,config,actor,now=Date.now()}){
  if(!body||typeof body!=='object'||Array.isArray(body))return {body,session:null}
  const session=openCoachSession(token,config,actor,body.personaId,now)
  if(!Object.hasOwn(body,'methodId')){
    // Cached clients remain compatible. An explicit logical ID without its method is rejected.
    if(Object.hasOwn(body,'methodSessionId')||(session&&!session.clientSessionId))
      throw Error('COACH_SESSION_METHOD_CONFLICT')
    return {body,session:null}
  }
  const {methodId,methodSessionId,...legacyBody}=body
  if(typeof methodId!=='string'||!methodId||resolveCoachMethodId(body.personaId,methodId)!==methodId)
    throw Error('COACH_SESSION_INPUT_INVALID')
  if(!session)throw Error('COACH_SESSION_REQUIRED')
  if(session.methodId!==methodId||session.clientSessionId!==methodSessionId)
    throw Error('COACH_SESSION_METHOD_CONFLICT')
  return {body:legacyBody,session}
}

export function prepareCoachMethodTurn(body,context){
  const prepared=prepareCoachMethodRequest(body,context)
  if(!prepared.session)return {body:prepared.body,progress:null}
  // Validate consent, language and transcript before deriving evidence.
  const {input}=normalizeGenerativeCoachInput(prepared.body)
  const progress=advanceCoachSession(prepared.session,{message:input.message,locale:input.locale},context.now??Date.now())
  return {body:prepared.body,progress}
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
