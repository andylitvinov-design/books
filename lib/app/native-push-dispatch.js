import 'server-only'
import {clientMessagePushPayload} from './notification-contract.js'
import {claimNativePushTargets,finishNativePush} from './native-push-repository.js'
import {nativePushReady,sendNativeClientPush} from './native-push-transport.js'

// Called only after a verified master reply has committed. Claiming a unique
// message+device in PostgreSQL is atomic, so POST idempotency cannot send twice.
// Provider acceptance is never presented as a client read receipt.
export async function dispatchNativeClientMessagePush(config,messageId,env=process.env){
  if(!nativePushReady(env,'ios')&&!nativePushReady(env,'android'))
    return {configured:false,claimed:0,accepted:0,unknown:0}
  const targets=await claimNativePushTargets(config,messageId)
  let accepted=0,unknown=0,revoked=0
  const results=await Promise.allSettled(targets.map(async device=>{
    let outcome={state:'unknown',providerStatus:null}
    try{
      // Wrong APNs environment must not be treated as a successful send.
      if(!nativePushReady(env,device.platform) ||
         (device.platform==='ios' &&
           device.environment!==(env.HH_NATIVE_APNS_ENV==='sandbox'?'sandbox':'production'))){
        outcome={state:'rejected',providerStatus:null}
      }else{
        const response=await sendNativeClientPush(device,
          clientMessagePushPayload(device.locale,device.requestId),env)
        outcome={state:response.accepted?'accepted':response.expired?'revoked':'rejected',
          providerStatus:response.status}
      }
    }catch{/* Ambiguous provider failure must not auto-resend. */}
    try{await finishNativePush(config,messageId,device.id,outcome.state,outcome.providerStatus)}
    catch{/* Logging receipts must never expose tokens or private client data. */}
    return outcome
  }))
  for(const result of results){
    if(result.status!=='fulfilled'){unknown++;continue}
    if(result.value.state==='accepted')accepted++
    else if(result.value.state==='revoked')revoked++
    else unknown++
  }
  return {configured:true,claimed:targets.length,accepted,unknown,revoked}
}
