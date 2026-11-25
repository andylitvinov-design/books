// Read-only assisted posting, never provider publishing or a verified delivery receipt.
// Reuse the existing public brand URL and account allowlists, not a new token store.
import {normalizePublicSource} from './model.mjs'
import {GROWTH_INSTAGRAM_ACCOUNT_TARGETS} from './instagram-accounts.mjs'

export function getInstagramManualHandoff(post){
  if(!post||post.channel!=='instagram'||!['approved','planned_manual'].includes(post.status))
    return null
  const account=GROWTH_INSTAGRAM_ACCOUNT_TARGETS.find(item=>item.id===post.socialAccountId)
  if(!account||!['feed','story','reel'].includes(post.placement))return null
  let mediaUrl
  try{mediaUrl=normalizePublicSource(post.mediaUrl||'',post.brand)}
  catch{return null}
  if(!mediaUrl)return null
  const path=new URL(mediaUrl).pathname.toLowerCase()
  // Manual handoff is assisted only: it never verifies Instagram publication.
  if(!/\.(?:jpe?g|png|mp4)$/.test(path)||
    (post.placement==='feed'&&path.endsWith('.mp4'))||
    (post.placement==='reel'&&!path.endsWith('.mp4')))return null
  return Object.freeze({accountId:account.id,accountLabel:account.label,
    placement:post.placement,mediaUrl})
}
