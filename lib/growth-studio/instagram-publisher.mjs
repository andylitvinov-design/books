// Server-only Instagram image Feed adapter. OAuth and credentials are owned by
// the existing Meta Graph integration in meta-instagram.mjs; no second token store.
import {createMetaInstagramPublisherClient,META_ACCOUNT_TARGETS,MetaInstagramError} from './meta-instagram.mjs'
import {normalizePublicSource,publicCampaignLink,GROWTH_BRANDS} from './model.mjs'

const fail=code=>{throw new MetaInstagramError(code)}
export function isInstagramPublisherEnabled(environment=process.env){
  return environment.HH_GROWTH_INSTAGRAM_PUBLISH_ENABLED==='true'
}
async function ensurePublicJpeg(url,fetchFn){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000)
  try{
    const response=await fetchFn(url,{method:'HEAD',redirect:'error',cache:'no-store',
      credentials:'omit',signal:controller.signal})
    const type=(response.headers.get('content-type')||'').split(';')[0].trim().toLowerCase()
    if(!response.ok||type!=='image/jpeg')fail('instagram_media_preflight_failed')
    const length=Number(response.headers.get('content-length')||0)
    if(length&&length>8*1024*1024)fail('instagram_media_preflight_failed')
  }catch(error){
    if(error instanceof MetaInstagramError)throw error
    fail('instagram_media_preflight_failed')
  }finally{clearTimeout(timer)}
}
export async function publishApprovedInstagramImage({
  post,expectedRevision,confirmed=false,environment=process.env,
  providerClient,fetchFn=fetch,
}={}){
  if(typeof window!=='undefined')fail('meta_server_only')
  if(!isInstagramPublisherEnabled(environment))fail('instagram_publishing_disabled')
  if(confirmed!==true||!post||post.status!=='approved'||
    !Number.isSafeInteger(expectedRevision)||post.revision!==expectedRevision||
    post.channel!=='instagram'||typeof post.socialAccountId!=='string'||
    !post.socialAccountId||!post.caption?.trim())fail('instagram_invalid_approved_post')
  if(!META_ACCOUNT_TARGETS[post.socialAccountId]||!GROWTH_BRANDS[post.brand])
    fail('instagram_invalid_approved_post')
  let mediaUrl,caption
  try{
    mediaUrl=normalizePublicSource(post.mediaUrl,post.brand)
    caption=[post.caption,publicCampaignLink(post)].filter(Boolean).join('\n\n')
  }catch{fail('instagram_media_preflight_failed')}
  if(!/\.jpe?g$/i.test(new URL(mediaUrl).pathname)||!String(post.mediaAlt||'').trim()||
    [...caption].length>2200)fail('instagram_media_preflight_failed')
  if(!/^v\d+\.\d+$/.test(environment.META_GRAPH_API_VERSION||''))fail('instagram_publishing_disabled')
  const client=providerClient||await createMetaInstagramPublisherClient(post.socialAccountId)
  if(client?.targetId!==post.socialAccountId||
    client?.username?.toLowerCase()!==META_ACCOUNT_TARGETS[post.socialAccountId].handle||
    typeof client?.createImageContainer!=='function'||
    typeof client?.getContainerStatus!=='function'||
    typeof client?.publishContainer!=='function'||
    typeof client?.getPublishedMedia!=='function')
    fail('instagram_account_not_connected')
  await ensurePublicJpeg(mediaUrl,fetchFn)
  // One create-container call only. If its outcome is ambiguous, no automatic retry.
  let container
  try{container=await client.createImageContainer({imageUrl:mediaUrl,caption,altText:post.mediaAlt})}
  catch{return {state:'delivery_unknown',accountId:post.socialAccountId}}
  if(typeof container?.id!=='string'||!container.id)return {state:'delivery_unknown',accountId:post.socialAccountId}
  let processing
  try{processing=await client.getContainerStatus(container.id)}
  catch{return {state:'provider_processing',containerId:container.id,accountId:post.socialAccountId}}
  if(processing?.status_code!=='FINISHED')
    return {state:'provider_processing',containerId:container.id,providerStatus:processing?.status_code||'unknown',accountId:post.socialAccountId}
  let receipt
  try{receipt=await client.publishContainer(container.id)}
  catch{return {state:'delivery_unknown',containerId:container.id,accountId:post.socialAccountId}}
  if(typeof receipt?.id!=='string'||!receipt.id)
    return {state:'delivery_unknown',containerId:container.id,accountId:post.socialAccountId}
  let readback
  try{readback=await client.getPublishedMedia(receipt.id)}
  catch{return {state:'delivery_unknown',containerId:container.id,providerPostId:receipt.id,accountId:post.socialAccountId}}
  const validPermalink=typeof readback?.permalink==='string'&&
    /^https:\/\/www\.instagram\.com\/(?:p|reel)\/[A-Za-z0-9_-]+\/?$/.test(readback.permalink)
  if(String(readback?.id)!==receipt.id||!validPermalink)
    return {state:'delivery_unknown',containerId:container.id,providerPostId:receipt.id,accountId:post.socialAccountId}
  const providerTimestamp=typeof readback.timestamp==='string'?Date.parse(readback.timestamp):NaN
  if(!Number.isFinite(providerTimestamp))
    return {state:'delivery_unknown',containerId:container.id,providerPostId:receipt.id,accountId:post.socialAccountId}
  const publishedAt=new Date(providerTimestamp).toISOString()
  return {
    state:'published',provider:'meta_graph_api',accountId:post.socialAccountId,
    providerPostId:receipt.id,permalink:readback.permalink,
    publishedAt,
    mediaType:typeof readback.media_type==='string'?readback.media_type:'IMAGE',
    containerId:container.id,contentRevision:post.revision,
  }
}


// The existing authorized Meta account client is shared by Feed and Stories.
// Story text, links and CTA must already be baked into the public media asset.
async function ensurePublicStoryMedia(url,fetchFn){
  const ext=new URL(url).pathname.toLowerCase()
  const video=ext.endsWith('.mp4')
  if(!video&&!/\.jpe?g$/.test(ext))fail('instagram_media_preflight_failed')
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000)
  try{
    const response=await fetchFn(url,{method:'HEAD',redirect:'error',cache:'no-store',
      credentials:'omit',signal:controller.signal})
    const type=(response.headers.get('content-type')||'').split(';')[0].trim().toLowerCase()
    const length=Number(response.headers.get('content-length')||0)
    if(!response.ok||type!==(video?'video/mp4':'image/jpeg')||
      (length&&(!Number.isSafeInteger(length)||length>(video?100:8)*1024*1024)))
      fail('instagram_media_preflight_failed')
  }catch(error){
    if(error instanceof MetaInstagramError)throw error
    fail('instagram_media_preflight_failed')
  }finally{clearTimeout(timer)}
  return video
}

export async function publishApprovedInstagramStory({
  post,expectedRevision,confirmed=false,environment=process.env,
  providerClient,fetchFn=fetch,resumeContainerId=null,
}={}){
  if(typeof window!=='undefined')fail('meta_server_only')
  if(!isInstagramPublisherEnabled(environment))fail('instagram_publishing_disabled')
  if(confirmed!==true||!post||
    !(resumeContainerId?post.status==='delivery_unknown':post.status==='approved')||
    !Number.isSafeInteger(expectedRevision)||post.revision!==expectedRevision||
    post.channel!=='instagram'||post.placement!=='story'||
    !post.socialAccountId||!post.caption?.trim()||
    !META_ACCOUNT_TARGETS[post.socialAccountId]||!GROWTH_BRANDS[post.brand])
    fail('instagram_invalid_approved_post')
  if(resumeContainerId&&!/^\d{5,40}$/.test(resumeContainerId))
    fail('instagram_invalid_approved_post')
  let mediaUrl
  try{mediaUrl=normalizePublicSource(post.mediaUrl,post.brand)}
  catch{fail('instagram_media_preflight_failed')}
  if(!mediaUrl||!post.mediaAlt?.trim()||!/^v\d+\.\d+$/.test(environment.META_GRAPH_API_VERSION||''))
    fail('instagram_media_preflight_failed')
  const client=providerClient||await createMetaInstagramPublisherClient(post.socialAccountId)
  if(client?.targetId!==post.socialAccountId||
    client?.username?.toLowerCase()!==META_ACCOUNT_TARGETS[post.socialAccountId].handle||
    client?.instagramAccountType!=='BUSINESS'||
    typeof client?.createStoryContainer!=='function'||
    typeof client?.getContainerStatus!=='function'||
    typeof client?.publishContainer!=='function'||
    typeof client?.getPublishedMedia!=='function')
    fail(client?.instagramAccountType!=='BUSINESS'?'meta_story_business_required':'instagram_account_not_connected')
  const video=await ensurePublicStoryMedia(mediaUrl,fetchFn)
  // Resume is owner-invoked against a saved, known container: never re-upload.
  let container
  if(resumeContainerId)container={id:resumeContainerId}
  else {
    try{container=await client.createStoryContainer(video?{videoUrl:mediaUrl}:{imageUrl:mediaUrl})}
    catch{return {state:'delivery_unknown',accountId:post.socialAccountId}}
  }
  if(!/^\d{5,40}$/.test(container?.id||''))
    return {state:'delivery_unknown',accountId:post.socialAccountId}
  let processing
  try{processing=await client.getContainerStatus(container.id)}
  catch{return {state:'provider_processing',containerId:container.id,accountId:post.socialAccountId}}
  if(processing?.status_code!=='FINISHED')
    return {state:processing?.status_code==='ERROR'?'provider_error':'provider_processing',
      containerId:container.id,providerStatus:processing?.status_code||'unknown',
      accountId:post.socialAccountId}
  let receipt
  try{receipt=await client.publishContainer(container.id)}
  catch{return {state:'delivery_unknown',containerId:container.id,accountId:post.socialAccountId}}
  if(typeof receipt?.id!=='string'||!/^\d{5,40}$/.test(receipt.id))
    return {state:'delivery_unknown',containerId:container.id,accountId:post.socialAccountId}
  let readback
  try{readback=await client.getPublishedMedia(receipt.id)}
  catch{return {state:'delivery_unknown',containerId:container.id,providerPostId:receipt.id,accountId:post.socialAccountId}}
  const timestamp=Date.parse(readback?.timestamp||'')
  if(String(readback?.id)!==receipt.id||readback?.media_product_type!=='STORY'||
    !Number.isFinite(timestamp))
    return {state:'delivery_unknown',containerId:container.id,providerPostId:receipt.id,accountId:post.socialAccountId}
  const url=readback?.permalink
  const safeUrl=typeof url==='string'&&
    /^https:\/\/www\.instagram\.com\/stories\/[a-z0-9._]+\/\d+\/?(?:\?.*)?$/i.test(url)?url:null
  return {state:'published',provider:'meta_graph_api',accountId:post.socialAccountId,
    providerPostId:receipt.id,permalink:safeUrl,
    publishedAt:new Date(timestamp).toISOString(),
    mediaType:typeof readback.media_type==='string'?readback.media_type:(video?'VIDEO':'IMAGE'),
    mediaProductType:'STORY',containerId:container.id,contentRevision:post.revision}
}
