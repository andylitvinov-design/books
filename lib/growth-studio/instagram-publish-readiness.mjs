// Client-safe, read-only evaluation of the already owner-verified Meta status.
// No credentials or provider calls are ever made in this helper.
import {GROWTH_INSTAGRAM_ACCOUNT_TARGETS} from './instagram-accounts.mjs'

export function instagramPublishReadiness(snapshot,targetId,placement='feed'){
  const target=GROWTH_INSTAGRAM_ACCOUNT_TARGETS.find(item=>item.id===targetId)
  if(!target)return {ready:false,reason:'instagram_account_not_connected'}
  if(snapshot?.configuration?.authorizationReady!==true)
    return {ready:false,reason:'meta_not_configured'}
  const account=Array.isArray(snapshot.accounts)
    ?snapshot.accounts.find(item=>item?.targetId===targetId):null
  if(account?.connectionState!=='connected'||
     String(account?.handle||'').replace(/^@/,'').toLowerCase()!==target.label.slice(1).toLowerCase())
    return {ready:false,reason:'instagram_account_not_connected'}
  if(placement==='story'&&account.instagramAccountType!=='BUSINESS')
    return {ready:false,reason:'meta_story_business_required'}
  if(snapshot.configuration.publishFlagEnabled!==true)
    return {ready:false,reason:'instagram_publishing_disabled'}
  return {ready:true,reason:null}
}
