import {parseCaesarVideoAction,startCaesarVideoSession,endCaesarVideoSession} from './lukas-video-session-coordinator.mjs'

// Server-only composition for the existing authenticated app route. The
// provider-state reader must be independently verified, never a request field
// or a feature-flag-only approximation. Without it the service cannot mint.
const statuses={INVALID_REQUEST:400,AUTH_REQUIRED:401,CONSENT_REQUIRED:403,BUSY:409,PERSONAL_QUOTA_EXHAUSTED:409,GLOBAL_QUOTA_EXHAUSTED:409,UNAVAILABLE:503,NOT_FOUND:404}
const result=(body,status=200)=>({status,body})
const denial=(code,noAllocation=false)=>result({allowed:false,code,...(noAllocation?{allocation:'none'}:{})},statuses[code]||503)

export function createCaesarVideoService({auth,config,transaction,consumeRate,sessionDb,ownerEmailAllowed,ownerPractitionerActive,readProviderState,mint,readHistory,readChannel,now,newId}){
  async function accountEligible(access){
    return transaction(config,access.actor,async db=>{
      const row=(await db.query('select status,onboarding_state from app.accounts where id=$1',[access.actor.id])).rows[0]
      return row?.status==='active'&&(access.ownerExempt===true||row.onboarding_state==='active')
    })
  }
  async function consumeAttempt(actor){
    await consumeRate(config,{op:'caesar-video-attempt-actor-minute',actor:actor.id},3,60)
    await consumeRate(config,{op:'caesar-video-attempt-global-minute'},12,60)
  }
  return async function handle(body){
    const action=parseCaesarVideoAction(body)
    if(!action)return denial('INVALID_REQUEST',true)
    if(typeof readProviderState!=='function'||!sessionDb)return denial('UNAVAILABLE',true)
    let reservationAttempted=false,eligibleActor=null
    try{
      const deps={body,auth,ownerEmailAllowed,ownerPractitionerActive,consumeAttempt,now,newId,mint,readHistory,readChannel,
        accountEligible:async access=>{const eligible=await accountEligible(access);if(eligible)eligibleActor=access.actor;return eligible},
        readProviderState:async()=>{
          if(action.action==='start'){
            if(!eligibleActor)return null
            const ready=await transaction(config,eligibleActor,async db=>Boolean((await db.query("select to_regclass('app_private.lukas_video_reservations') as ledger")).rows[0]?.ledger))
            if(!ready)return null
          }
          return readProviderState()
        },
        reserve:async options=>{
          reservationAttempted=true
          const reservation=await sessionDb.reserve(options)
          if(reservation?.allowed===false)reservationAttempted=false
          return reservation
        },
        beginMint:options=>sessionDb.beginMint(options),markUncertain:options=>sessionDb.markUncertain(options),
        readOwnReservation:options=>sessionDb.readOwnReservation(options),reconcile:options=>sessionDb.reconcile(options)}
      const value=action.action==='start'?await startCaesarVideoSession(deps):await endCaesarVideoSession(deps)
      if(value?.allowed===true)return result(value)
      // A provider refusal or lost response after reservation is NOT proof of
      // no allocation, even if the public code is UNAVAILABLE. Keep the lease.
      const code=reservationAttempted?'UNAVAILABLE':Object.hasOwn(statuses,value?.code)?value.code:'UNAVAILABLE'
      return denial(code,action.action==='start'&&!reservationAttempted)
    }catch{
      return denial('UNAVAILABLE',action.action==='start'&&!reservationAttempted)
    }
  }
}
