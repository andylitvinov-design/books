import 'server-only'
import {clarityRunStorageEnabled,reserveClarityRunCredential,startFirstClarityRun,applyTrustedClarityRunEvent,retireClarityCredential} from './clarity-course-runs.js'
import {clarityCourseEnabled} from './clarity-course-access.js'
import {geminiFreeLiveConfig,normalizeGeminiFreeLiveStart,issueGeminiFreeLiveToken} from '../coaching/gemini-live-free.mjs'
import {geminiLiveSocketUrl,geminiLiveSetupMessage} from '../coaching/gemini-live-transport.mjs'
import {bindClarityTrustedLiveConnection} from '../coaching/clarity-trusted-live-connection.mjs'
import {AppError} from '../assessments/contracts.js'
import {consumeRateBatch} from './database.js'
import {geminiLiveTokenQuota} from '../coaching/gemini-live-quota.mjs'
// Private server relay composition. An authenticated same-origin upgrade
// adapter must supply the owner, server-selected run and actual server-side
// sockets. No public route, token JSON response or raw clock endpoint.
// Keep existing release vetoes: no paid transport or automatic fallback.
export async function openClarityLiveRelay(config,actor,{client,createProviderSocket,segmentDeadlineMs,selection,body,methodSession=null}){
 if(!clarityCourseEnabled()||!clarityRunStorageEnabled())throw new AppError('CLARITY_COURSE_UNAVAILABLE',503)
 const vendor=geminiFreeLiveConfig(process.env)
 if(!vendor)throw new AppError('CLARITY_COURSE_UNAVAILABLE',503)
 const start=normalizeGeminiFreeLiveStart(body,{methodSession})
 if(start.courseSessionId!=='clarity_day_'+selection.day||typeof createProviderSocket!=='function')
  throw new AppError('CLARITY_RUN_CONFLICT',409)
 if(client?.readyState!==1||!Number.isSafeInteger(segmentDeadlineMs)||segmentDeadlineMs<=Date.now()+15000)
  throw new AppError('CLARITY_RUN_CONFLICT',409)
 // The relay must share the existing provider attempt and delivered-token
 // caps; no owner-trial escalation or new budget is inferred from a request.
 const quota=geminiLiveTokenQuota(actor.id)
 await consumeRateBatch(config,quota.attempts)
 const lease=await reserveClarityRunCredential(config,actor,selection)
 if(client.readyState!==1||segmentDeadlineMs<=Date.now()+12000)throw new AppError('CLARITY_RUN_CONFLICT',409)
 const token=await issueGeminiFreeLiveToken(vendor,start,{clarityLease:lease,signal:AbortSignal.timeout(12000)})
 await consumeRateBatch(config,quota.successful)
 // Provider token remains inside the relay. It is never sent to the browser.
 if(client.readyState!==1||segmentDeadlineMs<=Date.now())throw new AppError('CLARITY_RUN_CONFLICT',409)
 const provider=createProviderSocket(geminiLiveSocketUrl(token.token))
 const setup=geminiLiveSetupMessage(token.model,token.voiceName)
 setup.setup.contextWindowCompression={slidingWindow:{}}
 let first=selection.firstProtocolIds!==null&&selection.firstProtocolIds!==undefined
 try{
  return bindClarityTrustedLiveConnection({client,provider,lease,coachId:start.personaId,setup,segmentDeadlineMs,
   retireLease:binding=>retireClarityCredential(config,actor,binding),
   persist:async event=>{
    if(first){
     const result=await startFirstClarityRun(config,actor,{id:lease.run.id,protocolIds:lease.run.protocolIds,event})
     first=false;return result
    }
    return applyTrustedClarityRunEvent(config,actor,event)
   }})
 }catch(error){try{provider.close()}catch{};try{client.close()}catch{};throw error}
}
