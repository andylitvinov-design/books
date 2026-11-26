import {reserveLukasVideo,reconcileLukasVideo} from './lukas-video-quota-store.mjs'
const lock='select pg_advisory_xact_lock(740125, 5638)'
const uuid=x=>typeof x==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(x)
const safe=(access,sessionId)=>access?.googleVerified===true&&uuid(access.actor?.id)&&uuid(sessionId)
/** Bind the coordinator to the existing server transaction and the proposed
 * migration. No browser can call these adapters directly. A start marks its
 * one-time mint attempt atomically, before the provider receives a request. */
export function createLukasSessionDb({transaction,config}){
 async function owned(access,sessionId,fn){
   if(!safe(access,sessionId))throw Error('AUTH_REQUIRED')
   return transaction(config,access.actor,async db=>{await db.query(lock);return fn(db)})
 }
 return {
   reserve:({access,sessionId,providerState,issueDeadlineSeconds,availableWindow})=>reserveLukasVideo({transaction,config,actor:access.actor,googleVerified:access.googleVerified,ownerExempt:access.ownerExempt===true,sessionId,providerCycle:providerState.providerCycle,
     providerEvidence:{verified:providerState.providerCycleVerified===true,cycle:providerState.providerCycle,observedAtSeconds:providerState.observedAtSeconds,cycleEndSeconds:providerState.cycleEndSeconds,remainingSeconds:providerState.providerRemaining},
     flags:{enabled:providerState.freeOnly===true,privacyApproved:providerState.contract?.privacyApproved===true,hardStopVerified:providerState.contract?.freeHardStopVerified===true,sharedLedgerVerified:providerState.contract?.sharedStartsVerified===true},overheadSeconds:providerState.overheadSeconds,issueDeadlineSeconds,availableWindow}),
   beginMint:({access,sessionId,issueDeadlineSeconds})=>owned(access,sessionId,async db=>{
     const r=await db.query(`update app_private.lukas_video_reservations set mint_attempted_at=clock_timestamp(),state='uncertain' where session_id=$1 and actor_id=$2 and state='reserved' and mint_attempted_at is null and issue_deadline=to_timestamp($3) and issue_deadline>clock_timestamp() returning session_id`,[sessionId,access.actor.id,issueDeadlineSeconds])
     return r.rows[0]?.session_id===sessionId
   }),
   markUncertain:({access,sessionId})=>owned(access,sessionId,async db=>{
     // Keep the original conservative deadline and any mint evidence intact.
     await db.query(`update app_private.lukas_video_reservations set state='uncertain' where session_id=$1 and actor_id=$2 and state in ('reserved','uncertain')`,[sessionId,access.actor.id])
   }),
   readOwnReservation:({access,sessionId})=>owned(access,sessionId,async db=>{
     const r=(await db.query(`select session_id,state,video_reserved,provider_reserved,video_charged,provider_charged,floor(extract(epoch from created_at))::bigint as created_seconds,floor(extract(epoch from latest_possible_end))::bigint as latest_seconds,mint_attempted_at is not null as mint_attempted from app_private.lukas_video_reservations where session_id=$1 and actor_id=$2`,[sessionId,access.actor.id])).rows[0]
     if(!r)return null
     return {sessionId:r.session_id,state:r.state,videoSeconds:r.video_reserved,providerReserved:r.provider_reserved,videoCharged:r.video_charged,providerCharged:r.provider_charged,createdAtSeconds:Number(r.created_seconds),latestPossibleEndSeconds:r.latest_seconds==null?null:Number(r.latest_seconds),mintAttempted:r.mint_attempted===true}
   }),
   reconcile:({access,sessionId,receipt})=>{if(!safe(access,sessionId))throw Error('AUTH_REQUIRED');return reconcileLukasVideo({transaction,config,actor:access.actor,sessionId,receipt})}
 }
}
