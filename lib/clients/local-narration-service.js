import 'server-only'
import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'
import { AppError } from '../assessments/contracts.js'
import { seal, openSealed } from '../app/crypto.js'
import { getPrescriptionStore } from '../prescriptions/store.js'
import { splitApprovedAnalysis } from './report-narration-model.js'
import { authorizedNarrationAnalysis, currentApprovedAnalysisForWorker } from './report-narration-access.js'
import { narrationVersionKey, queuedNarrationJob, publicNarrationStatus } from './local-narration-queue.mjs'
import { createLocalNarrationStore } from './local-narration-redis.js'
import { createLocalVoiceUpload, verifyLocalVoiceUpload, readPrivateLocalVoice, discardLocalVoiceUpload } from './local-narration-media.js'

const notAvailable=()=>new AppError('LOCAL_NARRATION_NOT_READY',503)
const denied=()=>new AppError('LOCAL_NARRATION_UNAVAILABLE',404)
const workerDenied=()=>new AppError('LOCAL_NARRATION_UNAUTHORIZED',403)
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex')
const context=id=>({accountId:id,recordId:id,field:'narration'})

// A revoked report is a permanent security failure, not a transient TTS error.
const revokedSource = error => [401,403,404,409].includes(error?.status)

export function localNarrationEnabled(env=process.env) {
  return env.HH_LOCAL_NARRATION_ENABLED==='true' &&
    env.HH_LOCAL_NARRATION_OWNER_APPROVED==='true' &&
    // Remains shut even if credentials are configured before Mac/phone QA.
    env.HH_LOCAL_NARRATION_END_TO_END_VERIFIED==='true' &&
    typeof env.HH_LOCAL_NARRATION_WORKER_TOKEN==='string' &&
    env.HH_LOCAL_NARRATION_WORKER_TOKEN.length>=40
}
function active(env=process.env) {
  if(!localNarrationEnabled(env))throw notAvailable()
}
function workerToken(request,env=process.env) {
  active(env)
  const actual=request.headers.get('authorization')||''
  const expected='Bearer '+env.HH_LOCAL_NARRATION_WORKER_TOKEN
  const a=Buffer.from(actual),b=Buffer.from(expected)
  if(a.length!==b.length||!timingSafeEqual(a,b))throw workerDenied()
  // A worker sends the bearer header, never browser cookies or an Origin.
  if(request.headers.has('origin'))throw workerDenied()
}
/** Authenticate the private Mac before parsing any request body. */
export function requireLocalWorker(request) { workerToken(request) }

function queueStore() {
  const store=createLocalNarrationStore()
  if(!store)throw notAvailable()
  return store
}
function sourceId(body) {
  return hash(['andrey-voice-source',body.scope,body.selector||'',body.sessionId||'',body.id||''])
}
async function currentSource(request,body,config) {
  const store=getPrescriptionStore()
  if(!store?.consumeAccessAttempt)throw notAvailable()
  const {analysis,principal,lineage}=await authorizedNarrationAnalysis(request,body,config,store)
  const parts=splitApprovedAnalysis(analysis)
  if(!parts.length||body.part>=parts.length)throw denied()
  const {queueKey,version}=narrationVersionKey({
    scope:body.scope,sourceId:sourceId(body),locale:body.locale,
    part:body.part,approvedText:parts[body.part],key:config.encryptionKey,
  })
  return {parts,principal,lineage,queueKey,version,text:parts[body.part],store}
}
export function audioUrlForRequest(body) {
  const query=new URLSearchParams({
    scope:body.scope,locale:body.locale,part:String(body.part),
    ...(body.selector?{selector:body.selector}:{}),
    ...(body.sessionId?{sessionId:body.sessionId}:{}),
    ...(body.id?{id:body.id}:{}),
  })
  return '/api/report-narration/local/audio?'+query
}
export async function enqueueLocalNarration(config,request,body) {
  active()
  const source=await currentSource(request,body,config)
  const storage=queueStore()
  let job=await storage.get(source.queueKey)
  if(!job) {
    // The Mac may be offline for days; cost is still zero. Limit new jobs per
    // verified viewer and prevent user-triggered filling of a shared free KV.
    const actorKey=hash(['andrey-voice-daily',...source.principal])
    if(!await source.store.consumeAccessAttempt(actorKey,12,86400))
      throw new AppError('LOCAL_NARRATION_LIMIT',429)
    const model=queuedNarrationJob({queueKey:source.queueKey,version:source.version,
      locale:body.locale,part:body.part,now:Date.now()})
    const encryptedPayload=seal({text:source.text,lineage:source.lineage},context(model.id),config)
    job=await storage.ensure({...model,encryptedPayload})
  }
  if(job.version!==source.version)throw denied()
  const status=publicNarrationStatus(job)
  return {...status,parts:source.parts.length,
    ...(status.status==='ready'?{audioUrl:audioUrlForRequest(body)}:{}),
    ...(['queued','processing'].includes(status.status)?{retryAfterSeconds:15}:{}),
  }
}

export async function authorizedLocalNarrationAudio(config,request,body,range=null) {
  active()
  const source=await currentSource(request,body,config)
  const job=await queueStore().get(source.queueKey)
  if(!job||job.version!==source.version||job.status!=='ready'||!job.audio)
    throw denied()
  return readPrivateLocalVoice(config,{
    objectKey:job.audio.assetPath,mime:job.audio.mime,
    bytes:job.audio.bytes,range,
  })
}

export async function claimLocalNarration(config,request) {
  workerToken(request)
  const store=queueStore()
  const leaseId=randomUUID()
  const uuidId=randomUUID()
  const objectKey='narration/'+uuidId+'/'+randomBytes(32).toString('hex')+'.mp3'
  const job=await store.claim({now:Date.now(),leaseId,leaseMs:1200000,objectKey})
  if(!job)return {job:null}
  try {
    const snapshot=openSealed(job.encryptedPayload,context(job.id),config)
    if(typeof snapshot?.text!=='string'||!snapshot.text.trim()||snapshot.text.length>3000)throw denied()
    // The client may revoke access or the report may change while Mac is off.
    // Verify the CURRENT approved source again before exposing any text to the worker.
    const current=await currentApprovedAnalysisForWorker(config,getPrescriptionStore(),snapshot.lineage,job.locale)
    const parts=splitApprovedAnalysis(current)
    if(parts[job.part]!==snapshot.text)throw denied()
    const uploadUrl=await createLocalVoiceUpload(config,objectKey)
    return {job:{id:job.id,leaseId,language:job.locale,text:snapshot.text,uploadUrl}}
  }catch(error){
    if(revokedSource(error))
      await store.cancelStale({job,leaseId}).catch(()=>{})
    else
      await store.fail({job,leaseId,now:Date.now()}).catch(()=>{})
    throw notAvailable()
  }
}

export async function finalizeLocalNarration(config,request,body) {
  workerToken(request)
  if(!body||Object.keys(body).sort().join('|')!=='bytes|id|leaseId|mime|sha256'||
    !uuid.test(body.id||'')||!uuid.test(body.leaseId||'')||
    body.mime!=='audio/mpeg'||!Number.isSafeInteger(body.bytes)||
    body.bytes<128||body.bytes>3000000||!/^[a-f0-9]{64}$/.test(body.sha256||''))
    throw denied()
  const store=queueStore()
  const job=await store.byId(body.id)
  const now=Date.now()
  if(!job||job.status!=='leased'||job.leaseId!==body.leaseId||
    job.leaseExpiresAt<=now||!job.objectKey)throw denied()
  // The approved version or viewer session may have been revoked while
  // the Mac was busy generating the audio. Never finalize it in that case.
  try {
    const snapshot=openSealed(job.encryptedPayload,context(job.id),config)
    const fresh=await currentApprovedAnalysisForWorker(config,getPrescriptionStore(),snapshot.lineage,job.locale)
    const parts=splitApprovedAnalysis(fresh)
    if(parts[job.part]!==snapshot.text)throw denied()
  }catch(error){
    if(revokedSource(error)) {
      const canceled=await store.cancelStale({job,leaseId:body.leaseId}).catch(()=>false)
      if(canceled)await discardLocalVoiceUpload(config,job.objectKey).catch(()=>{})
    }
    throw denied()
  }
  await verifyLocalVoiceUpload(config,{objectKey:job.objectKey,
    mime:body.mime,bytes:body.bytes,sha256:body.sha256})
  const done=await store.complete({job,leaseId:body.leaseId,now:Date.now(),
    mime:body.mime,bytes:body.bytes,sha256:body.sha256})
  if(!done||done.status!=='ready')throw denied()
  return {status:'ready'}
}

export async function failLocalNarration(config,request,body) {
  workerToken(request)
  if(!body||Object.keys(body).sort().join('|')!=='id|leaseId'||
    !uuid.test(body.id||'')||!uuid.test(body.leaseId||''))throw denied()
  const store=queueStore()
  const job=await store.byId(body.id)
  if(!job||job.leaseId!==body.leaseId)throw denied()
  const next=await store.fail({job,leaseId:body.leaseId,now:Date.now()})
  if(!next)throw denied()
  // Failed conversion or a lost response must not leave orphaned private MP3s.
  if(job.objectKey)await discardLocalVoiceUpload(config,job.objectKey).catch(()=>{})
  return {status:next.status}
}
