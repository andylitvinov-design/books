import 'server-only'
import {createRequestAuth} from '../app/session.js'
import {transaction} from '../app/database.js'
import {PRACTITIONER_ID} from '../../data/app-services.js'

export const OWNER_STATS_SKIP_COOKIE = 'hh_public_stats_owner_skip'
export function applyOwnerStatsSkip(response) {
  response.cookies.set(OWNER_STATS_SKIP_COOKIE,'1',{
    path:'/',httpOnly:true,secure:process.env.NODE_ENV==='production',
    sameSite:'lax',maxAge:31536000
  })
  return response
}
// Only the authenticated owner can automatically exclude every device.
// A persistent per-browser exclusion covers signed-out visits after verification,
// and visitors may opt out manually. Do not use IP address fingerprinting.
export async function publicStatsExclusion(request,config) {
  if (request.cookies.get('hh_public_stats_skip')?.value === '1' ||
      request.cookies.get(OWNER_STATS_SKIP_COOKIE)?.value === '1')
    return {exclude:true,verifiedOwner:false}
  if (!request.cookies.getAll().some(cookie=>cookie.name.startsWith('hh-app-auth')))
    return {exclude:false,verifiedOwner:false}
  try {
    const actor=await createRequestAuth(request,config).verified()
    const owned=await transaction(config,actor,async db=>
      (await db.query('select 1 from app.practitioners where id=$1 and trusted_auth_user_id=$2 limit 1',
        [PRACTITIONER_ID,actor.id])).rowCount===1)
    return {exclude:owned,verifiedOwner:owned}
  } catch {
    return {exclude:false,verifiedOwner:false}
  }
}
