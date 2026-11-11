// Native Facebook Page text/link publisher. This is NOT a Metricool proxy.
// Only an authenticated owner action can invoke it, after a deliberate confirmation.
// The shared Meta OAuth client owns all Page tokens; none reach browser code.
import {createMetaFacebookPagePublisherClient,META_ACCOUNT_TARGETS,MetaInstagramError}
  from './meta-instagram.mjs'
import {publicCampaignLink,GROWTH_BRANDS} from './model.mjs'

const fail=code=>{throw new MetaInstagramError(code)}
const numeric=/^\d{5,40}$/
const pagePostId=/^(\d{5,40})_(\d{5,40})$/
export const isFacebookPublisherEnabled=(env=process.env)=>
  env.HH_GROWTH_FACEBOOK_PUBLISH_ENABLED==='true'

export function facebookPagePostPayload(post){
  if(!post || post.channel!=='facebook' || post.placement!=='feed' ||
     post.status!=='approved' || !post.socialAccountId ||
     !META_ACCOUNT_TARGETS[post.socialAccountId] ||
     !GROWTH_BRANDS[post.brand] || !String(post.caption||'').trim())
    fail('facebook_invalid_approved_post')
  // Media upload, Reels, personal profiles and Groups are intentionally NOT
  // sent through a text endpoint; they need their own reviewed adapters.
  if(post.mediaUrl)fail('facebook_media_not_supported')
  if([...post.caption].length>3500)fail('facebook_invalid_approved_post')
  let link
  try{link=publicCampaignLink(post)}
  catch{fail('facebook_invalid_approved_post')}
  return {message:post.caption.trim(),...(link?{link}:{})}
}

function pagePermalink(input){
  if(input===null||input===undefined||input==='')return null
  if(typeof input!=='string')return null
  try{
    const url=new URL(input)
    if(url.protocol!=='https:' || url.username || url.password || url.port ||
       url.hash || !['facebook.com','www.facebook.com','m.facebook.com'].includes(url.hostname) ||
       !/^\/[a-z0-9._~/%?&=+-]+$/i.test(url.pathname+url.search))return null
    return url.href
  }catch{return null}
}

export async function publishApprovedFacebookPagePost({
  post,expectedRevision,confirmed=false,environment=process.env,providerClient,
}={}){
  if(typeof window!=='undefined')fail('meta_server_only')
  if(!isFacebookPublisherEnabled(environment))fail('facebook_publishing_disabled')
  if(confirmed!==true||!post||post.status!=='approved'||
     !Number.isSafeInteger(expectedRevision)||expectedRevision!==post.revision)
    fail('facebook_invalid_approved_post')
  const payload=facebookPagePostPayload(post)
  const client=providerClient||await createMetaFacebookPagePublisherClient(post.socialAccountId)
  if(client?.targetId!==post.socialAccountId ||
     String(client?.instagramUsername||'').toLowerCase()!==META_ACCOUNT_TARGETS[post.socialAccountId].handle ||
     !numeric.test(String(client?.pageId||'')) ||
     typeof client?.createPageFeedPost!=='function' ||
     typeof client?.getPagePost!=='function')
    fail('facebook_account_not_connected')

  let receipt
  try{receipt=await client.createPageFeedPost(payload)}
  catch{return {state:'delivery_unknown',accountId:post.socialAccountId}}
  const id=String(receipt?.id||'')
  const parts=pagePostId.exec(id)
  if(!parts || parts[1]!==String(client.pageId))
    return {state:'delivery_unknown',accountId:post.socialAccountId,providerPostId:id||null}
  let readback
  try{readback=await client.getPagePost(id)}
  catch{return {state:'delivery_unknown',accountId:post.socialAccountId,providerPostId:id}}
  const time=Date.parse(readback?.created_time||'')
  if(String(readback?.id)!==id || readback?.is_published!==true ||
     !Number.isFinite(time))
    return {state:'delivery_unknown',accountId:post.socialAccountId,providerPostId:id}
  return {
    state:'published',provider:'meta_graph_api',accountId:post.socialAccountId,
    pageId:String(client.pageId),providerPostId:id,
    mediaProductType:'PAGE_POST',permalink:pagePermalink(readback.permalink_url),
    publishedAt:new Date(time).toISOString(),contentRevision:post.revision,
  }
}
