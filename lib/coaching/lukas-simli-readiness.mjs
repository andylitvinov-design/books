/** Read-only Simli adapter. Server-only: key must never be sent to the browser.
 * Official API: /ratelimiter/sessions and /history/sessions.
 * Neither zero active sessions nor an empty history proves an issued token expired.
 * No token mint, no automatic retry, no assumption about billing/clock units.
 */
const API='https://api.simli.ai'
const uuid=x=>typeof x==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(x)
const nonnegative=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0
const whole=x=>Number.isSafeInteger(x)&&x>=0
export function reservationAggregator(sessionId){
  if(!uuid(sessionId))throw Error('INVALID_RESERVATION')
  return `hh-lukas-${sessionId.toLowerCase()}`
}
async function read(path,{apiKey,fetcher=fetch,timeoutMs=5000}={}){
  if(typeof apiKey!=='string'||!apiKey.trim()||!whole(timeoutMs)||timeoutMs<1||timeoutMs>10000)throw Error('PROVIDER_UNAVAILABLE')
  try{
    const response=await fetcher(API+path,{method:'GET',headers:{'x-simli-api-key':apiKey,accept:'application/json'},cache:'no-store',redirect:'error',signal:AbortSignal.timeout(timeoutMs)})
    if(!response.ok)throw Error('PROVIDER_UNAVAILABLE')
    return await response.json()
  }catch{throw Error('PROVIDER_UNAVAILABLE')}
}
export async function readSimliChannel(options){
  const data=await read('/ratelimiter/sessions',options)
  if(!whole(data?.currentUsage))throw Error('PROVIDER_UNAVAILABLE')
  return {activeCount:data.currentUsage,busy:data.currentUsage>0}
}
/** Returns only a minimal matching record for an INTERNAL reservation UUID.
 * An absent row, duplicate aggregator, or malformed history is not a receipt.
 * Raw usage stays internal and is not yet a verified charge in seconds.
 */
export async function readSimliReservationHistory(sessionId,options){
  const aggregator=reservationAggregator(sessionId)
  const data=await read('/history/sessions',options)
  if(!Array.isArray(data?.sessions))throw Error('PROVIDER_UNAVAILABLE')
  const matches=data.sessions.filter(x=>x?.sessionAggregator===aggregator)
  if(matches.length!==1)return null
  const r=matches[0]
  if(!uuid(r.id)||!nonnegative(r.sessionTotalTime)||!nonnegative(r.startTime)||!nonnegative(r.endTime)||r.endTime<=r.startTime||typeof r.endReason!=='string'||!r.endReason.trim()||typeof r.face_id!=='string'||!r.face_id.trim())return null
  return {aggregator,providerSessionId:r.id,rawDuration:r.sessionTotalTime,rawStart:r.startTime,rawEnd:r.endTime,faceId:r.face_id,endReason:r.endReason,verified:false}
}
/** UX projection. A positive provider busy observation is useful immediately;
 * a zero observation is not sufficient authorization to open another call.
 * Caller must independently validate database lease, entitlement, quota, and privacy.
 */
export function videoAvailability({googleVerified=false,ownerExempt=false,personalRemaining,launchApproved=false,ledgerVerified=false,ledgerBusy,providerActiveCount,providerBudgetVerified=false,providerRemaining}={}){
  if(googleVerified!==true)return {code:'AUTH_REQUIRED'}
  if(ownerExempt!==true&&(!whole(personalRemaining)||personalRemaining>300))return {code:'UNAVAILABLE'}
  if(ownerExempt!==true&&personalRemaining===0)return {code:'PERSONAL_QUOTA_EXHAUSTED',remainingSeconds:0}
  if(ownerExempt===true)personalRemaining=null
  if(launchApproved!==true||ledgerVerified!==true||typeof ledgerBusy!=='boolean')return {code:'UNAVAILABLE',remainingSeconds:personalRemaining}
  if(ledgerBusy||whole(providerActiveCount)&&providerActiveCount>0)return {code:'BUSY',remainingSeconds:personalRemaining}
  if(providerActiveCount!==0||providerBudgetVerified!==true||!whole(providerRemaining))return {code:'UNAVAILABLE',remainingSeconds:personalRemaining}
  if(providerRemaining===0)return {code:'GLOBAL_QUOTA_EXHAUSTED',remainingSeconds:personalRemaining}
  return {code:'AVAILABLE',remainingSeconds:personalRemaining}
}
