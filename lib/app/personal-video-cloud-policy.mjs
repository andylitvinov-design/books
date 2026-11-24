const ACCOUNT_ID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function videoPilotIncludes(configured,accountId){
  if(typeof accountId!=='string'||!ACCOUNT_ID.test(accountId)||typeof configured!=='string')
    return false
  const accountIds=configured.split(',').map(id=>id.trim().toLowerCase())
  return accountIds.length<=2&&accountIds.every(id=>ACCOUNT_ID.test(id))&&
    accountIds.includes(accountId.toLowerCase())
}

// Private files are stored directly in Supabase, not on the hosting platform.
// The verified server session, upload consent and database/storage quotas are
// enforced at every request in the existing personal-videos routes.
export function personalVideoCloudEnabled(actor){
  return typeof actor?.id==='string' && ACCOUNT_ID.test(actor.id)
}
