import 'server-only'
import {randomUUID} from 'node:crypto'
import {requireSameOrigin} from './config.js'
import {createRequestAuth} from './session.js'
import {antiStressStorageEnabled,readAntiStressRunForRelay} from './anti-stress-runs.js'
import {openAntiStressLiveRelay} from './anti-stress-live-relay.js'
import {attachAntiStressRelayEntry} from '../coaching/anti-stress-relay-entry.mjs'
import {prepareCoachMethodRequest} from '../coaching/method-session-transport.mjs'
import {COACH_SESSION_COOKIE} from '../coaching/session-authority.mjs'
import {AppError} from '../assessments/contracts.js'
import {consumeRate} from './database.js'
// A previously verified persisted FREE run may resume; new enrollment and
// paid access require the still-pending product/settlement policy. Neither
// a browser flag nor an environment variable can manufacture entitlement.
async function resolveExistingTherapyAccess({owner,runId,existingRun}){
 if(!existingRun||existingRun.id!==runId||existingRun.access!=='free')throw new AppError('ANTI_STRESS_ENTITLEMENT_REQUIRED',403)
 return {accountId:owner,courseRunId:runId,programId:'anti-stress-three-session',verified:true,access:'free'}
}
export async function prepareAntiStressLiveUpgrade(request,config,{createProviderSocket,segmentDeadlineMs}){
 requireSameOrigin(request,config)
 if(!antiStressStorageEnabled())throw new AppError('ANTI_STRESS_UNAVAILABLE',503)
 if(request.headers.get('upgrade')?.toLowerCase()!=='websocket'||typeof createProviderSocket!=='function'||!Number.isSafeInteger(segmentDeadlineMs)||segmentDeadlineMs<=Date.now())throw new AppError('ANTI_STRESS_RELAY_REQUIRED',409)
 if(new URL(request.url).search)throw new AppError('INVALID_QUERY',400)
 const auth=createRequestAuth(request,config),actor=await auth.verified()
 await consumeRate(config,{op:'anti-stress-live-upgrade',actor:actor.id},12,3600)
 const token=request.cookies.get(COACH_SESSION_COOKIE)?.value
 return {auth,attach:client=>attachAntiStressRelayEntry(client,{owner:actor.id,uuid:randomUUID,
  readRun:id=>readAntiStressRunForRelay(config,actor,id),resolveEntitlement:resolveExistingTherapyAccess,
  prepareBody:body=>prepareCoachMethodRequest(body,{token,config,actor}),
  open:({selection,body,methodSession})=>openAntiStressLiveRelay(config,actor,{client,createProviderSocket,segmentDeadlineMs,selection,body,methodSession})
 })}
}
