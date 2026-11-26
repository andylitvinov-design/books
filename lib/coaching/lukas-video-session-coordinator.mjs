import {randomUUID} from 'node:crypto'
import {resolveLukasVideoAccess} from './lukas-video-auth.mjs'
import {verifiedSimliContract,mintReservedSimliToken,providerSettlementEvidence,fetchSimliHistory,SIMLI_TOKEN_TTL_SECONDS} from './lukas-simli-lifecycle.mjs'
import {readSimliChannel} from './lukas-simli-readiness.mjs'

const deny=code=>({allowed:false,code})
const whole=x=>Number.isSafeInteger(x)&&x>=0
const uuid=x=>typeof x==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(x)
/** Browser supplies only intention and versioned consent, never account/limit/receipt. */
export function parseLukasVideoAction(body){
  if(!body||typeof body!=='object'||Array.isArray(body))return null
  const keys=Object.keys(body)
  if(body.action==='start'&&keys.length===3&&keys.every(k=>['action','nonSensitiveConsent','privacyConsentVersion'].includes(k))&&body.nonSensitiveConsent===true&&body.privacyConsentVersion==='lukas-video-v1')return {action:'start'}
  if(body.action==='end'&&keys.length===2&&keys.every(k=>['action','sessionId'].includes(k))&&uuid(body.sessionId))return {action:'end',sessionId:body.sessionId}
  return null
}
/**
 * Server-only orchestration. The production route must inject the existing
 * verified auth, account gate, rate limit, global reservation and a trusted
 * provider contract/cycle reader. There is deliberately no env-only bypass.
 * Failure after reservation leaves it held; no token retry or paid fallback.
 */
export async function startLukasVideoSession({body,auth,ownerEmailAllowed,ownerPractitionerActive,accountEligible,consumeAttempt,readProviderState,reserve,beginMint,markUncertain,mint=mintReservedSimliToken,now=()=>Math.floor(Date.now()/1000),newId=randomUUID}){
  if(parseLukasVideoAction(body)?.action!=='start')return deny('INVALID_REQUEST')
  const access=await resolveLukasVideoAccess(auth,{ownerEmailAllowed,ownerPractitionerActive})
  if(!access)return deny('AUTH_REQUIRED')
  if(await accountEligible(access)!==true)return deny('CONSENT_REQUIRED')
  await consumeAttempt(access.actor)
  const state=await readProviderState()
  const time=now()
  if(!state||!verifiedSimliContract(state.contract,time)||!whole(state.providerRemaining)||!whole(state.cycleEndSeconds)||!whole(state.monthEndSeconds)||
    state.freeOnly!==true||state.providerCycleVerified!==true||state.channelActiveCount!==0||typeof state.providerCycle!=='string'||!state.providerCycle)
    return deny(state?.channelActiveCount>0?'BUSY':'UNAVAILABLE')
  const sessionId=newId(),issueDeadlineSeconds=time+30
  if(!uuid(sessionId))throw Error('INVALID_RESERVATION')
  // Reserve the full media budget plus overhead, and leave enough time for a
  // late token connection. The store also checks cycle boundaries atomically.
  const availableWindow=Math.min(state.cycleEndSeconds,state.monthEndSeconds,state.contract.validUntilSeconds)-issueDeadlineSeconds-SIMLI_TOKEN_TTL_SECONDS
  if(availableWindow<=0)return deny('UNAVAILABLE')
  const reservation=await reserve({access,sessionId,providerState:state,issueDeadlineSeconds,availableWindow})
  if(!reservation?.allowed)return deny(reservation?.code||'UNAVAILABLE')
  try{
    // Token grant must never escape the reservation or be issued twice.
    if(reservation.sessionId!==sessionId||!whole(reservation.videoSeconds)||reservation.videoSeconds<1||!whole(reservation.providerReserved)||reservation.providerReserved>availableWindow||reservation.providerReserved<reservation.videoSeconds)throw Error('INVALID_RESERVATION')
    if(typeof beginMint!=='function'||await beginMint({access,sessionId,issueDeadlineSeconds})!==true)throw Error('MINT_NOT_AUTHORIZED')
    const token=await mint({reservation,contract:state.contract,nowSeconds:now(),apiKey:state.apiKey,cycleEndSeconds:state.cycleEndSeconds,monthEndSeconds:state.monthEndSeconds,issueDeadlineSeconds})
    if(token?.provider!=='simli'||token.target!=='chatbot'||typeof token.sessionToken!=='string'||!token.sessionToken||token.maxVideoSeconds!==reservation.videoSeconds||!whole(token.latestPossibleEndSeconds))throw Error('INVALID_PROVIDER_TOKEN')
    // Store the token safety deadline with the lease before returning any token.
    // The adapter must persist this deadline even if the HTTP reply is lost.
    await markUncertain({access,sessionId,latestPossibleEndSeconds:token.latestPossibleEndSeconds,tokenIssued:true})
    return {allowed:true,sessionId,provider:'simli',target:'chatbot',sessionToken:token.sessionToken,maxVideoSeconds:token.maxVideoSeconds,ownerExempt:access.ownerExempt}
  }catch(error){
    // Once a reservation exists, assume the provider call may have succeeded.
    // If persistence fails, the original reserved row still blocks new starts.
    try{await markUncertain({access,sessionId,latestPossibleEndSeconds:issueDeadlineSeconds+SIMLI_TOKEN_TTL_SECONDS+reservation.providerReserved,tokenIssued:false})}catch{}
    return deny(error?.message==='BUSY'?'BUSY':'UNAVAILABLE')
  }
}
/** No client timestamps or duration; only matching vendor history can settle. */
export async function endLukasVideoSession({body,auth,ownerEmailAllowed,ownerPractitionerActive,consumeAttempt,readOwnReservation,readProviderState,markUncertain,reconcile,readHistory=fetchSimliHistory,readChannel=readSimliChannel,now=()=>Math.floor(Date.now()/1000)}){
  const action=parseLukasVideoAction(body)
  if(action?.action!=='end')return deny('INVALID_REQUEST')
  const access=await resolveLukasVideoAccess(auth,{ownerEmailAllowed,ownerPractitionerActive})
  if(!access)return deny('AUTH_REQUIRED')
  await consumeAttempt(access.actor)
  const reservation=await readOwnReservation({access,sessionId:action.sessionId})
  if(!reservation||reservation.sessionId!==action.sessionId)return deny('NOT_FOUND')
  if(reservation.state==='settled')return {allowed:true,state:'settled',videoCharged:reservation.videoCharged,providerCharged:reservation.providerCharged}
  await markUncertain({access,sessionId:action.sessionId})
  const time=now(),state=await readProviderState()
  if(!verifiedSimliContract(state?.contract,time)||!whole(reservation.latestPossibleEndSeconds)||time<reservation.latestPossibleEndSeconds)return {allowed:true,state:'uncertain'}
  try{
    const channel=await readChannel({apiKey:state.apiKey})
    if(channel.activeCount!==0)return {allowed:true,state:'uncertain'}
    const rows=await readHistory({apiKey:state.apiKey,fromSeconds:reservation.createdAtSeconds,toSeconds:time})
    const receipt=providerSettlementEvidence({reservation,contract:state.contract,nowSeconds:time,rows,activeCount:channel.activeCount})
    if(!receipt)return {allowed:true,state:'uncertain'}
    const settled=await reconcile({access,sessionId:action.sessionId,receipt})
    return {allowed:true,state:settled.state,...(settled.state==='settled'?{videoCharged:settled.videoCharged,providerCharged:settled.providerCharged}: {})}
  }catch{return {allowed:true,state:'uncertain'}}
}
