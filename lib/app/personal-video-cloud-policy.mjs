const ACCOUNT_ID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function videoPilotIncludes(configured,accountId){
  if(typeof accountId!=='string'||!ACCOUNT_ID.test(accountId)||typeof configured!=='string')
    return false
  const accountIds=configured.split(',').map(id=>id.trim().toLowerCase())
  return accountIds.length<=2&&accountIds.every(id=>ACCOUNT_ID.test(id))&&
    accountIds.includes(accountId.toLowerCase())
}

export function personalVideoCloudEnabled(actor,env=process.env){
  if(env.HH_PERSONAL_VIDEO_CLOUD_SAVE_ENABLED!=='true'||
    typeof actor?.id!=='string'||!ACCOUNT_ID.test(actor.id))return false
  const configured=env.HH_PERSONAL_VIDEO_CLOUD_SAVE_PILOT_ACCOUNT_IDS
  // Production must not accidentally turn a two-account pilot into a global
  // rollout just because the pilot allowlist was omitted. An explicitly
  // configured list always restricts access; only separate owner approval
  // permits a global Production Cloud Save release.
  if(configured!==undefined)return videoPilotIncludes(configured,actor.id)
  return env.VERCEL_ENV!=='production'||
    env.HH_PERSONAL_VIDEO_CLOUD_GLOBAL_APPROVED==='true'
}
