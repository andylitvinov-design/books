import 'server-only'
import {createHmac} from 'node:crypto'
import { AppError, onlyKeys } from '../assessments/contracts.js'
import { verifyCoachMemoryTicket } from '../coaching/coach-staged-memory-ticket.mjs'
import { coachLiveMemoryNote, coachLiveMemoryScopes } from '../coaching/coach-live-memory-note.mjs'
import { geminiFreeLiveConfig } from '../coaching/gemini-live-free.mjs'
import {clientMemoryEnabled,readClientMemoryConsentForAccount} from './client-memory-store.js'
import { readCoachEntrySources } from './coach-context-snapshot.js'
import { COACH_CONTEXT_TOPIC_KEYS } from '../coaching/coach-staged-memory.mjs'
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
    'topicKey','contextSessionToken','entry'])
  const consent=input.consent
  if(input.shareApproved!==true||!consent||
      typeof consent!=='object'||Array.isArray(consent))
    throw new AppError('MY_COACH_LIVE_CONTEXT_CONSENT_REQUIRED',403)
  onlyKeys(consent,['priorSessions','goals','profile','assessments','axes'])
  if(['priorSessions','goals','profile','assessments','axes'].some(k=>
      typeof consent[k]!=='boolean'))
    throw new AppError('MY_COACH_LIVE_CONTEXT_INVALID',400)
  if(!['identity','personal'].includes(input.stage)||
     !['new','previous','pending'].includes(input.continuity)||
     (input.continuity==='pending'&&input.stage!=='identity')||
     (input.stage==='identity'&&(consent.goals||consent.profile||
       consent.assessments||consent.axes))||
     (consent.axes&&!consent.profile)||
     (!consent.priorSessions&&!consent.goals&&!consent.profile&&
       !consent.assessments))
    throw new AppError('MY_COACH_LIVE_CONTEXT_INVALID',400)
  if(input.entry!==undefined&&(input.entry!==true||input.stage!=='identity'||input.continuity!=='previous'||consent.priorSessions!==true||
     (input.topicKey!==undefined&&!COACH_CONTEXT_TOPIC_KEYS.includes(input.topicKey))))
    throw new AppError('MY_COACH_LIVE_CONTEXT_INVALID',400)
  if(!geminiFreeLiveConfig(env))
    throw new AppError('MY_COACH_GEMINI_LIVE_DISABLED',503)
  const entryConsent=input.entry===true&&clientMemoryEnabled(env)?await readClientMemoryConsentForAccount(config,actor):null
  if(input.entry===true&&entryConsent?.memory_enabled!==true)throw new AppError('MEMORY_CONSENT_REQUIRED',403)
  const priorAllowed=consent.priorSessions===true
  if(!verifyCoachMemoryTicket(input.stageToken,{
    accountId:actor.id,provider:'gemini_free',secret:config.encryptionKey,
    requirePrior:priorAllowed,requireEntry:input.entry===true,consentRevision:entryConsent?.revision,topicKey:input.topicKey,contextSessionToken:input.contextSessionToken
  })) throw new AppError('MY_COACH_MEMORY_STAGE_REQUIRED',409)
  if(input.contextSessionToken!==undefined&&
     ((input.stage!=='personal'&&!(input.entry===true&&input.topicKey))||
      typeof input.contextSessionToken!=='string'||input.contextSessionToken.length>140))
    throw new AppError('MY_COACH_LIVE_CONTEXT_INVALID',400)
  const grant={sessionAccepted:true,providerSharing:true,
    priorSessions:priorAllowed,goals:consent.goals,
    profile:consent.profile,assessments:consent.assessments}
  let prior=null,personal=null
  if(priorAllowed){
    const result=await readStaged(config,actor,{
      stage:'identity',provider:'gemini_free',...(input.entry===true?{entry:true}:{}),
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
  const entrySources=input.entry===true&&input.topicKey
    ?await readCoachEntrySources(config,actor,'gemini_free',env,input):[]
  if(entryConsent&&(await readClientMemoryConsentForAccount(config,actor)).revision!==entryConsent.revision)
    throw new AppError('MEMORY_CONSENT_REQUIRED',403)
  if(entrySources.length)personal={context:{items:entrySources}}
  const goalsAllowed=consent.goals||entrySources.some(item=>item.kind!=='test_results')
  const assessmentsAllowed=consent.assessments||entrySources.some(item=>item.kind==='test_results')
  // The caller NEVER supplies a client profile, fact, test, transcript or
  // prompt. Only records re-read under the signed account/grants can enter.
  const note=coachLiveMemoryNote({
    prior,personal,priorAllowed,continuity:input.continuity,
    goalsAllowed,profileAllowed:consent.profile,
    assessmentsAllowed,axesAllowed:consent.axes,
    topicKey:input.topicKey,entry:input.entry===true
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
      goalsAllowed,profileAllowed:consent.profile,
      assessmentsAllowed,axesAllowed:consent.axes,
      topicKey:input.topicKey
    }):[]}
}
