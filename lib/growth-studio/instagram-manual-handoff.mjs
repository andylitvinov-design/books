// Read-only assisted posting, never provider publishing or a verified delivery receipt.
// Reuse the existing public brand URL and account allowlists, not a new token store.
import {normalizePublicSource} from './model.mjs'
import {GROWTH_INSTAGRAM_ACCOUNT_TARGETS} from './instagram-accounts.mjs'

export function getInstagramManualHandoff(post){
  if(!post||post.channel!=='instagram'||!['approved','planned_manual'].includes(post.status))
    return null
  const account=GROWTH_INSTAGRAM_ACCOUNT_TARGETS.find(item=>item.id===post.socialAccountId)
  if(!account||!['feed','story'].includes(post.placement))return null
  let mediaUrl
  try{mediaUrl=normalizePublicSource(post.mediaUrl||'',post.brand)}
  catch{return null}
  if(!mediaUrl)return null
  const path=new URL(mediaUrl).pathname.toLowerCase()
  // Native Instagram handoff accepts JPEG/PNG photos and MP4 videos. Feed videos
  // are not supported by this old Feed editor; owner must choose Story for MP4.
  if(!/\.(?:jpe?g|png|mp4)$/.test(path)||
    (post.placement==='feed'&&path.endsWith('.mp4')))return null
  return Object.freeze({accountId:account.id,accountLabel:account.label,
    placement:post.placement,mediaUrl})
}
