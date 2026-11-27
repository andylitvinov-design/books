import 'server-only'
import {antiStressStorageEnabled,reserveAntiStressRunCredential,beginTrustedAntiStressRun,applyTrustedAntiStressRunEvent,retireAntiStressCredential} from './anti-stress-runs.js'
import {geminiFreeLiveConfig,normalizeGeminiFreeLiveStart,issueGeminiFreeLiveToken} from '../coaching/gemini-live-free.mjs'
import {geminiLiveSocketUrl,geminiLiveSetupMessage} from '../coaching/gemini-live-transport.mjs'
import {bindAntiStressTrustedLiveConnection} from '../coaching/anti-stress-trusted-live-connection.mjs'
import {ANTI_STRESS_SESSION_IDS} from '../coaching/coach-program-mode.mjs'
import {AppError} from '../assessments/contracts.js'
// Internal composition only. Actual same-origin upgrade, entitlement and
// reviewed transcript/Director integration are separate activation gates.
export async function openAntiStressLiveRelay(config,actor,{client,createProviderSocket,selection,body,methodSession=null}){
 if(!antiStressStorageEnabled())throw new AppError('ANTI_STRESS_UNAVAILABLE',503)
 const vendor=geminiFreeLiveConfig(process.env)
 if(!vendor)throw new AppError('ANTI_STRESS_UNAVAILABLE',503)
 if(!ANTI_STRESS_SESSION_IDS.includes(selection?.sessionId)||body?.courseSessionId!==selection.sessionId||typeof createProviderSocket!=='function'||client?.readyState!==1)throw new AppError('ANTI_STRESS_CONFLICT',409)
 // Public normalization still denies therapy selection; the private owner/run
 // selection, not the browser body, supplies the locked program mode.
 const start={...normalizeGeminiFreeLiveStart({...body,courseSessionId:undefined},{methodSession}),courseSessionId:selection.sessionId}
 const lease=await reserveAntiStressRunCredential(config,actor,selection)
 if(client.readyState!==1)throw new AppError('ANTI_STRESS_CONFLICT',409)
 const token=await issueGeminiFreeLiveToken(vendor,start,{antiStressLease:lease,signal:AbortSignal.timeout(12000)})
 if(client.readyState!==1)throw new AppError('ANTI_STRESS_CONFLICT',409)
 const provider=createProviderSocket(geminiLiveSocketUrl(token.token))
 const setup=geminiLiveSetupMessage(token.model,token.voiceName)
 setup.setup.realtimeInputConfig.automaticActivityDetection.silenceDurationMs=1400
 let first=selection.firstProtocolIds!==null&&selection.firstProtocolIds!==undefined
 try{
  return bindAntiStressTrustedLiveConnection({client,provider,lease,coachId:start.personaId,setup,retireLease:binding=>retireAntiStressCredential(config,actor,binding),persist:async event=>{
   if(first){const result=await beginTrustedAntiStressRun(config,actor,{id:lease.run.id,protocolIds:lease.run.protocolIds,entitlement:selection.entitlement,event});first=false;return result}
   return applyTrustedAntiStressRunEvent(config,actor,event)
  }})
 }catch(error){try{provider.close()}catch{};try{client.close()}catch{};throw error}
}
