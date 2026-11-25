import 'server-only'
import {createHmac} from 'node:crypto'
import { AppError, onlyKeys } from '../assessments/contracts.js'
import { verifyCoachMemoryTicket } from '../coaching/coach-staged-memory-ticket.mjs'
import { coachLiveMemoryNote, coachLiveMemoryScopes } from '../coaching/coach-live-memory-note.mjs'
import { geminiFreeLiveConfig } from '../coaching/gemini-live-free.mjs'
import { readMyCoachStagedMemory } from './my-coach-staged-memory.js'

// An explicit, one-time, signed-in request for already reviewed data. Unlike
// an owner-only profile preview this endpoint is invoked ONLY after the user
// checks the separate "share with Gemini" controls. It rechecks current DB
// per-item/provider/source-revision grants immediately before sending.
export async function readMyCoachLiveContext(config, actor, input, env=process.env, {
  readStaged=readMyCoachStagedMemory,
}={}){
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
  const grant={sessionAccepted:true,providerSharing:true,
    priorSessions:priorAllowed,goals:consent.goals,
    profile:consent.profile,assessments:consent.assessments}
  let prior=null,personal=null
  if(priorAllowed){
    const result=await readStaged(config,actor,{
      stage:'identity',provider:'gemini_free',
      consent:{sessionAccepted:true,providerSharing:true,priorSessions:true}
    },env)
    prior=result?.prior||null
  }
  if(input.stage==='personal'){
    personal=await readStaged(config,actor,{
      stage:'personal',provider:'gemini_free',consent:grant,
      topicKey:input.topicKey,stageToken:input.stageToken,
      ...(input.contextSessionToken?{contextSessionToken:input.contextSessionToken}:{})
    },env)
  }
  // The caller NEVER supplies a client profile, fact, test, transcript or
  // prompt. Only records re-read under the signed account/grants can enter.
  const note=coachLiveMemoryNote({
    prior,personal,priorAllowed,continuity:input.continuity,
    goalsAllowed:consent.goals,profileAllowed:consent.profile,
    assessmentsAllowed:consent.assessments,axesAllowed:consent.axes,
    topicKey:input.topicKey
  })
  // Stable, signed fingerprint for read-only in-call freshness checks.
  // The browser retains ONLY the opaque digest after the approved packet
  // has been sent. This cannot reveal the client record or API secret.
  const fingerprint=note?createHmac('sha256',config.encryptionKey)
    .update(JSON.stringify(['HH_MY_COACH_LIVE_CONTEXT_FINGERPRINT_V1',
      actor.id,'gemini_free',input.stage,input.topicKey||'',input.continuity,
      consent,note])).digest('hex'):''
  return {schema:'HH_MY_COACH_LIVE_CONTEXT_V1',available:Boolean(note),
    note,fingerprint,scopes:note?coachLiveMemoryScopes({
      priorAllowed,continuity:input.continuity,
      goalsAllowed:consent.goals,profileAllowed:consent.profile,
      assessmentsAllowed:consent.assessments,axesAllowed:consent.axes,
      topicKey:input.topicKey
    }):[]}
}
