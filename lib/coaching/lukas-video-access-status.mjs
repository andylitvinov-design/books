import {resolveLukasVideoAccess} from './lukas-video-auth.mjs'
import {VIDEO_LIMITS} from './lukas-video-quota.mjs'

/** Read-only, own-account entitlement/status. This is not a mint authorization.
 * A missing ledger or unverified provider must never imply available minutes.
 */
export async function readLukasVideoAccessStatus({auth,config,transaction,ownerEmailAllowed,ownerPractitionerActive}) {
  const access=await resolveLukasVideoAccess(auth,{ownerEmailAllowed,ownerPractitionerActive})
  if(!access)return {code:'AUTH_REQUIRED',eligible:false,videoAvailable:false}
  return transaction(config,access.actor,async db=>{
    const account=(await db.query("select status,onboarding_state from app.accounts where id=$1",[access.actor.id])).rows[0]
    if(!account||account.status!=='active')return {code:'AUTH_REQUIRED',eligible:false,videoAvailable:false}
    if(!access.ownerExempt&&account.onboarding_state!=='active')return {code:'CONSENT_REQUIRED',eligible:false,videoAvailable:false}
    const entitlement={eligible:true,videoAvailable:false,ownerExempt:access.ownerExempt,personalLimitSeconds:access.ownerExempt?null:VIDEO_LIMITS.personal,remainingSeconds:null,voiceAlternative:true,resetTimezone:'America/Toronto'}
    const ledger=(await db.query("select to_regclass('app_private.lukas_video_reservations') as ledger")).rows[0]?.ledger
    if(!ledger)return {...entitlement,code:'UNAVAILABLE'}
    const summary=(await db.query(`select coalesce(sum(case when actor_id=$1 and kind='customer' and month_key=to_char(now() at time zone 'America/Toronto','YYYY-MM') then case when state='settled' then video_charged else video_reserved end else 0 end),0)::int as personal_used, coalesce(bool_or(state in ('reserved','uncertain')),false) as busy from app_private.lukas_video_reservations`,[access.actor.id])).rows[0]
    if(!summary||!Number.isSafeInteger(summary.personal_used)||summary.personal_used<0||typeof summary.busy!=='boolean')return {...entitlement,code:'UNAVAILABLE'}
    const remainingSeconds=access.ownerExempt?null:Math.max(0,VIDEO_LIMITS.personal-summary.personal_used)
    return {...entitlement,remainingSeconds,code:remainingSeconds===0?'PERSONAL_QUOTA_EXHAUSTED':summary.busy?'BUSY':'UNAVAILABLE'}
  })
}
