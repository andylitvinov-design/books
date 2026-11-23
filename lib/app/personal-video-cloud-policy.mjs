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
  // An omitted scope preserves the existing feature flag behavior. An
  // explicitly configured pilot, including a blank list, is restricted.
  return configured===undefined||videoPilotIncludes(configured,actor.id)
}
