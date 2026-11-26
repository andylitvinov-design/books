import {reservationAggregator,readSimliChannel} from './lukas-simli-readiness.mjs'

// Documented token lifetime, NOT a guarantee that a token is single-use.
// https://docs.simli.com/api-reference/endpoint/webrtc/startAudioToVideoSession
export const SIMLI_TOKEN_TTL_SECONDS=300
export const SIMLI_LUKAS_FACE='a36d66df-a23d-4569-996b-d0e990019857'
const whole=x=>Number.isSafeInteger(x)&&x>=0
const number=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0
const uuid=x=>typeof x==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(x)
const providerError=()=>Error('PROVIDER_UNAVAILABLE')
const api='https://api.simli.ai'

// All inputs here must be produced by server-owned integrations. Never accept
// a capability, clock, reservation or receipt from the request body.
export function verifiedSimliContract(evidence,nowSeconds){
  return Boolean(evidence&&whole(nowSeconds)&&whole(evidence.validUntilSeconds)&&
    evidence.validUntilSeconds>nowSeconds&&
    evidence.customerUseApproved===true&&evidence.privacyApproved===true&&
    evidence.freeHardStopVerified===true&&evidence.singleUseVerified===true&&
    evidence.accountHistoryComplete===true&&evidence.billingSecondsVerified===true&&
    evidence.durationSecondsVerified===true&&evidence.finalHistoryVerified===true&&
    evidence.sharedStartsVerified===true&&evidence.tokenTtlSeconds===SIMLI_TOKEN_TTL_SECONDS)
}
export function simliTokenRequest(reservation){
  if(!reservation||reservation.allowed!==true||!uuid(reservation.sessionId)||
     !whole(reservation.videoSeconds)||reservation.videoSeconds<1||reservation.videoSeconds>3000||
     !whole(reservation.providerReserved)||reservation.providerReserved<reservation.videoSeconds||reservation.providerReserved>3000)
    throw Error('INVALID_RESERVATION')
  return {faceId:SIMLI_LUKAS_FACE,apiVersion:'v2',sessionAggregator:reservationAggregator(reservation.sessionId),
    maxSessionLength:reservation.videoSeconds,maxIdleTime:Math.min(30,reservation.videoSeconds),handleSilence:true,audioInputFormat:'pcm16'}
}
export async function mintReservedSimliToken({reservation,contract,nowSeconds,apiKey,fetcher=fetch,cycleEndSeconds,monthEndSeconds,issueDeadlineSeconds}){
  if(!verifiedSimliContract(contract,nowSeconds)||typeof apiKey!=='string'||!apiKey.trim()||
    !whole(issueDeadlineSeconds)||issueDeadlineSeconds<nowSeconds||issueDeadlineSeconds>nowSeconds+30||
    !whole(cycleEndSeconds)||!whole(monthEndSeconds))throw providerError()
  const body=simliTokenRequest(reservation)
  // A token can connect late. Reserve a window that covers mint latency,
  // five-minute token validity, full video duration and overhead before rollover.
  const latestEnd=issueDeadlineSeconds+SIMLI_TOKEN_TTL_SECONDS+reservation.providerReserved
  if(latestEnd>Math.min(cycleEndSeconds,monthEndSeconds,contract.validUntilSeconds))throw providerError()
  // A provider observation is an additional check, not the global DB lock.
  const channel=await readSimliChannel({apiKey,fetcher,timeoutMs:5000})
  if(channel.activeCount!==0)throw Error('BUSY')
  const response=await fetcher(api+'/compose/token',{method:'POST',headers:{'x-simli-api-key':apiKey,'Content-Type':'application/json'},body:JSON.stringify(body),cache:'no-store',redirect:'error',signal:AbortSignal.timeout(15000)})
  if(!response.ok)throw providerError()
  const data=await response.json()
  if(typeof data?.session_token!=='string'||!data.session_token.trim()||data.session_token.length>16384)throw providerError()
  // No retry on ambiguity: coordinator retains the lease until reconciliation.
  return {sessionToken:data.session_token,target:'chatbot',provider:'simli',maxVideoSeconds:reservation.videoSeconds,latestPossibleEndSeconds:latestEnd}
}

// Explicit window: the vendor defaults history to one week. Never silently
// estimate a monthly balance using that default window.
export async function fetchSimliHistory({apiKey,fromSeconds,toSeconds,fetcher=fetch}){
  if(typeof apiKey!=='string'||!apiKey.trim()||!whole(fromSeconds)||!whole(toSeconds)||fromSeconds>=toSeconds||toSeconds-fromSeconds>32*86400)throw providerError()
  const response=await fetcher(api+'/history/sessions?'+new URLSearchParams({startTime:String(fromSeconds),endTime:String(toSeconds)}),{
    method:'GET',headers:{'x-simli-api-key':apiKey,accept:'application/json'},cache:'no-store',redirect:'error',signal:AbortSignal.timeout(10000)})
  if(!response.ok)throw providerError()
  const data=await response.json()
  if(!Array.isArray(data?.sessions)||data.sessions.length>10000)throw providerError()
  return data.sessions
}

// estimatedCost.simliBilledSeconds is explicitly estimated; it is not accepted
// as verified final billing unless the provider has confirmed its semantics.
// Never turn a zero active count or a missing/duplicate history row into a refund.
export function providerSettlementEvidence({reservation,contract,nowSeconds,rows,activeCount}){
  if(!verifiedSimliContract(contract,nowSeconds)||!reservation||!uuid(reservation.sessionId)||!whole(reservation.createdAtSeconds)||
    !whole(reservation.latestPossibleEndSeconds)||!whole(reservation.videoSeconds)||!whole(reservation.providerReserved)||
    reservation.latestPossibleEndSeconds<reservation.createdAtSeconds+SIMLI_TOKEN_TTL_SECONDS+reservation.providerReserved||
    nowSeconds<reservation.latestPossibleEndSeconds||activeCount!==0||!Array.isArray(rows))return null
  const matches=rows.filter(r=>r?.sessionAggregator===reservationAggregator(reservation.sessionId))
  // Detect token reuse/duplicate records and hold the lease for operator review.
  if(matches.length!==1)return null
  const r=matches[0]
  if(!uuid(r.id)||r.face_id!==SIMLI_LUKAS_FACE||typeof r.endReason!=='string'||!r.endReason.trim()||
    !number(r.startTime)||!number(r.endTime)||r.startTime<reservation.createdAtSeconds||r.endTime<=r.startTime||r.endTime>nowSeconds||
    !number(r.sessionTotalTime)||!number(r.estimatedCost?.simliBilledSeconds))return null
  const videoSeconds=Math.ceil(r.sessionTotalTime),providerSeconds=Math.max(videoSeconds,Math.ceil(r.estimatedCost.simliBilledSeconds))
  if(!whole(videoSeconds)||!whole(providerSeconds))return null
  return {sessionId:reservation.sessionId,verified:true,ended:true,videoSeconds,providerSeconds}
}
