import 'server-only'
import {randomUUID} from 'node:crypto'
import {requireSameOrigin} from './config.js'
import {createRequestAuth} from './session.js'
import {clarityCourseEnabled} from './clarity-course-access.js'
import {clarityRunStorageEnabled,readClarityRun} from './clarity-course-runs.js'
import {openClarityLiveRelay} from './clarity-live-relay.js'
import {attachClarityRelayEntry} from '../coaching/clarity-relay-entry.mjs'
import {prepareCoachMethodRequest} from '../coaching/method-session-transport.mjs'
import {COACH_SESSION_COOKIE} from '../coaching/session-authority.mjs'
import {AppError} from '../assessments/contracts.js'
import {consumeRate} from './database.js'
// Prepare BEFORE upgrade, on the same-origin /api/app/my-coach path, with
// server-verified cookies. The future Vercel adapter provides actual sockets
// and the upgrade response; do not expose a raw browser clock endpoint.
export async function prepareClarityLiveUpgrade(request,config,{createProviderSocket,segmentDeadlineMs}){
 requireSameOrigin(request,config)
 if(!clarityCourseEnabled()||!clarityRunStorageEnabled())
  throw new AppError('CLARITY_COURSE_UNAVAILABLE',503)
 if(request.headers.get('upgrade')?.toLowerCase()!=='websocket'||typeof createProviderSocket!=='function'||
    !Number.isSafeInteger(segmentDeadlineMs)||segmentDeadlineMs<=Date.now())
  throw new AppError('CLARITY_RELAY_REQUIRED',409)
 // No credential, account or course identifier in the request URL.
 if(new URL(request.url).search)throw new AppError('INVALID_QUERY',400)
 const auth=createRequestAuth(request,config),actor=await auth.verified()
 // Bound authenticated handshake attempts before creating a runtime socket.
 await consumeRate(config,{op:'clarity-live-upgrade',actor:actor.id},12,3600)
 const token=request.cookies.get(COACH_SESSION_COOKIE)?.value
 return {auth,attach:client=>attachClarityRelayEntry(client,{
  owner:actor.id,uuid:randomUUID,readRun:id=>readClarityRun(config,actor,id),
  prepareBody:body=>prepareCoachMethodRequest(body,{token,config,actor}),
  open:({selection,body,methodSession})=>openClarityLiveRelay(config,actor,{client,createProviderSocket,segmentDeadlineMs,selection,body,methodSession})
 })}
}
