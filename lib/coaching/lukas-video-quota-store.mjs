import {planVideoStart,settleVideoReservation} from './lukas-video-quota.mjs'
/** Adapter to existing lib/app/database.js transaction(config,actor,fn).
 * Never expose these functions as unauthenticated endpoints. Actor and verified
 * provider evidence must come from trusted server integrations, not request JSON.
 * Every avatar (including owner/coach) must share this lock before activation.
 */
const LOCK_SQL="select pg_advisory_xact_lock(740125, 5638)"
const validId=x=>typeof x==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(x)
export async function reserveLukasVideo({transaction,config,actor,googleVerified,ownerExempt=false,sessionId,providerCycle,providerEvidence,flags,overheadSeconds}) {
 if(!actor||!validId(actor.id)||googleVerified!==true)return {allowed:false,code:'AUTH_REQUIRED'}
 if(!validId(sessionId)||typeof providerCycle!=='string'||!providerCycle||providerCycle.length>100||!providerEvidence||providerEvidence.verified!==true)return {allowed:false,code:'UNAVAILABLE'}
 return transaction(config,actor,async db=>{
   await db.query(LOCK_SQL)
   const clock=(await db.query(`with c as (select clock_timestamp() as ts)
     select to_char(ts at time zone 'America/Toronto','YYYY-MM') as month_key,
     greatest(0, floor(extract(epoch from (((date_trunc('month',ts at time zone 'America/Toronto') + interval '1 month') at time zone 'America/Toronto') - ts))))::int as seconds_left,
     floor(extract(epoch from ts))::bigint as now_seconds from c`)).rows[0]
   // Reject stale, mismatched or missing provider evidence after the DB lock.
   const nowSeconds=Number(clock.now_seconds)
   if(providerEvidence.cycle!==providerCycle||!Number.isSafeInteger(providerEvidence.observedAtSeconds)||!Number.isSafeInteger(nowSeconds)||providerEvidence.observedAtSeconds>nowSeconds||nowSeconds-providerEvidence.observedAtSeconds>30||!Number.isSafeInteger(providerEvidence.cycleEndSeconds))return {allowed:false,code:'UNAVAILABLE'}
   // An unresolved reservation blocks every new provider session, across months.
   const summary=(await db.query(`select
     coalesce(sum(case when actor_id=$1 and month_key=$2 and kind='customer' then case when state='settled' then video_charged else video_reserved end else 0 end),0)::int as personal_used,
     coalesce(sum(case when provider_cycle=$3 and kind='customer' then case when state='settled' then provider_charged else provider_reserved end else 0 end),0)::int as customer_used,
     coalesce(sum(case when provider_cycle=$3 then case when state='settled' then provider_charged else provider_reserved end else 0 end),0)::int as total_used,
     coalesce(bool_or(state in ('reserved','uncertain')),false) as busy,
     coalesce(bool_or(overrun),false) as overrun
     from app_private.lukas_video_reservations`,[actor.id,clock.month_key,providerCycle])).rows[0]
   const plan=planVideoStart({...flags,googleVerified,ownerExempt,providerCycleVerified:providerEvidence.verified===true&&summary.overrun===false,busy:summary.busy,personalUsed:summary.personal_used,customerUsed:summary.customer_used,totalUsed:summary.total_used,providerRemaining:providerEvidence.remainingSeconds,secondsToMonthEnd:clock.seconds_left,secondsToCycleEnd:Math.max(0,providerEvidence.cycleEndSeconds-nowSeconds),overheadSeconds})
   if(!plan.allowed)return plan
   const duplicate=(await db.query(`select 1 from app_private.lukas_video_reservations where session_id=$1`,[sessionId])).rows[0]
   if(duplicate)return {allowed:false,code:'UNAVAILABLE'}
   await db.query(`insert into app_private.lukas_video_reservations(session_id,actor_id,month_key,provider_cycle,kind,state,video_reserved,provider_reserved) values($1,$2,$3,$4,$5,'reserved',$6,$7)`,[sessionId,actor.id,clock.month_key,providerCycle,ownerExempt===true?'owner':'customer',plan.videoSeconds,plan.providerReserved])
   return {...plan,sessionId,month:clock.month_key}
 })
}
/** Trusted provider reconciliation only; the browser stop action is not a receipt.
 * For disconnects, leave the reservation uncertain until provider end is proved.
 * A trusted server reconciler must cover logout/deleted accounts separately.
 */
export async function reconcileLukasVideo({transaction,config,actor,sessionId,receipt}) {
 if(!actor||!validId(actor.id)||!validId(sessionId))throw Error('AUTH_REQUIRED')
 return transaction(config,actor,async db=>{
   await db.query(LOCK_SQL)
   const row=(await db.query(`select * from app_private.lukas_video_reservations where session_id=$1 and actor_id=$2 for update`,[sessionId,actor.id])).rows[0]
   if(!row)throw Error('NOT_FOUND')
   if(row.state==='settled')return {state:'settled',videoCharged:row.video_charged,providerCharged:row.provider_charged,overrun:row.overrun}
   const next=settleVideoReservation({sessionId:row.session_id,state:row.state,videoSeconds:row.video_reserved,providerReserved:row.provider_reserved},receipt)
   if(next.state==='uncertain'){
     await db.query(`update app_private.lukas_video_reservations set state='uncertain' where session_id=$1`,[sessionId]);return {state:'uncertain'}
   }
   await db.query(`update app_private.lukas_video_reservations set state='settled',video_charged=$2,provider_charged=$3,overrun=$4,settled_at=now() where session_id=$1`,[sessionId,next.videoCharged,next.providerCharged,next.overrun])
   return {state:'settled',videoCharged:next.videoCharged,providerCharged:next.providerCharged,overrun:next.overrun}
 })
}
