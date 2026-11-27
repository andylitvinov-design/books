import 'server-only'
import {antiStressStorageEnabled,reserveAntiStressRunCredential,beginTrustedAntiStressRun,applyTrustedAntiStressRunEvent,retireAntiStressCredential,appendTrustedAntiStressObservation} from './anti-stress-runs.js'
import {geminiFreeLiveConfig,normalizeGeminiFreeLiveStart,issueGeminiFreeLiveToken} from '../coaching/gemini-live-free.mjs'
import {geminiLiveSocketUrl,geminiLiveSetupMessage} from '../coaching/gemini-live-transport.mjs'
import {bindAntiStressTrustedLiveConnection} from '../coaching/anti-stress-trusted-live-connection.mjs'
import {ANTI_STRESS_SESSION_IDS} from '../coaching/coach-program-mode.mjs'
import {lockedCoachSessionVoice} from '../coaching/gemini-voice-catalog.mjs'
import {readApprovedCrossModeReference} from './anti-stress-private-memory.js'
import {AppError} from '../assessments/contracts.js'
import {consumeRateBatch} from './database.js'
import {geminiLiveTokenQuota} from '../coaching/gemini-live-quota.mjs'
import {canFitNewLogicalSession} from '../coaching/relay-session-capacity.mjs'
import {ANTI_STRESS_LOGICAL_SESSION_MS} from '../coaching/anti-stress-clock.mjs'
// Internal composition only. Actual same-origin upgrade, entitlement and
// reviewed transcript/Director integration are separate activation gates.
export async function openAntiStressLiveRelay(config,actor,{client,createProviderSocket,segmentDeadlineMs,selection,body,methodSession=null,storageConsent=false,memorySelection=null}){
 if(!antiStressStorageEnabled())throw new AppError('ANTI_STRESS_UNAVAILABLE',503)
 const vendor=geminiFreeLiveConfig(process.env)
 if(!vendor)throw new AppError('ANTI_STRESS_UNAVAILABLE',503)
 if(!ANTI_STRESS_SESSION_IDS.includes(selection?.sessionId)||body?.courseSessionId!==selection.sessionId||typeof createProviderSocket!=='function'||client?.readyState!==1||!Number.isSafeInteger(segmentDeadlineMs)||segmentDeadlineMs<=Date.now()+15000)throw new AppError('ANTI_STRESS_CONFLICT',409)
 // Public normalization still denies therapy selection; the private owner/run
 // selection, not the browser body, supplies the locked program mode.
 const approved=lockedCoachSessionVoice(body.personaId,body.locale)
 if(!approved||body.voiceName!==approved)throw new AppError('ANTI_STRESS_CONFLICT',409)
 const start={...normalizeGeminiFreeLiveStart({...body,courseSessionId:undefined},{methodSession}),courseSessionId:selection.sessionId}
 // Same global/actor provider budgets as Coaching. No owner-trial escalation.
 const readReference=memorySelection?()=>readApprovedCrossModeReference(config,actor,selection.protocolId,memorySelection,start.locale):null
 // Reject a stale choice before spending a token; re-read again after the
 // actual Play/consent receipt and immediately before upstream disclosure.
 if(readReference)await readReference()
 const quota=geminiLiveTokenQuota(actor.id)
 // A new course may not start when even the full existing hourly quota
 // cannot accommodate one logical session. Never increase token allowances.
 if(selection.firstProtocolIds!=null&&!canFitNewLogicalSession({remainingMs:ANTI_STRESS_LOGICAL_SESSION_MS,segmentMs:segmentDeadlineMs-Date.now(),quota}))throw new AppError('ANTI_STRESS_UNAVAILABLE',503)
 await consumeRateBatch(config,quota.attempts)
 const lease=await reserveAntiStressRunCredential(config,actor,selection)
 if(client.readyState!==1||segmentDeadlineMs<=Date.now()+12000)throw new AppError('ANTI_STRESS_CONFLICT',409)
 const token=await issueGeminiFreeLiveToken(vendor,start,{antiStressLease:lease,signal:AbortSignal.timeout(12000)})
 await consumeRateBatch(config,quota.successful)
 if(client.readyState!==1||segmentDeadlineMs<=Date.now())throw new AppError('ANTI_STRESS_CONFLICT',409)
 // Mirror the approved Therapy VAD/voice setup; token remains server-side.
 const setup=geminiLiveSetupMessage(token.model,token.voiceName,'therapy')
 const provider=createProviderSocket(geminiLiveSocketUrl(token.token))
 let first=selection.firstProtocolIds!==null&&selection.firstProtocolIds!==undefined
 let reviewRevision=lease.reviewRevision
 const permission=storageConsent===true?{accountId:actor.id,courseRunId:lease.run.id,protocolId:lease.protocolId,verified:true,decision:'accepted'}:null
 try{
  return bindAntiStressTrustedLiveConnection({client,provider,lease,coachId:start.personaId,setup,segmentDeadlineMs,readReference,retireLease:binding=>retireAntiStressCredential(config,actor,binding),
   persistTurn:permission?async event=>{
    const result=await appendTrustedAntiStressObservation(config,actor,{...event,expectedRevision:reviewRevision},permission,{locale:start.locale})
    if(![reviewRevision+1,reviewRevision+2].includes(result?.reviewRevision))throw new AppError('ANTI_STRESS_CONFLICT',409)
    reviewRevision=result.reviewRevision
   }:null,persist:async event=>{
   if(first){const result=await beginTrustedAntiStressRun(config,actor,{id:lease.run.id,protocolIds:lease.run.protocolIds,entitlement:selection.entitlement,event});first=false;return result}
   return applyTrustedAntiStressRunEvent(config,actor,event)
  }})
 }catch(error){try{provider.close()}catch{};try{client.close()}catch{};throw error}
}
