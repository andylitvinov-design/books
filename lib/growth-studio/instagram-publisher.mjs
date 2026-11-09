// Server-only official Meta Graph publishing adapter. OAuth and credentials remain
// owned by the single existing meta-instagram integration.
import {createMetaInstagramPublisherClient,META_ACCOUNT_TARGETS,MetaInstagramError} from './meta-instagram.mjs'
import {normalizePublicSource,publicCampaignLink,GROWTH_BRANDS} from './model.mjs'

const fail=code=>{throw new MetaInstagramError(code)}
export function isInstagramPublisherEnabled(environment=process.env){
  return environment.HH_GROWTH_INSTAGRAM_PUBLISH_ENABLED==='true'
}
const extension=url=>new URL(url).pathname.toLowerCase().split('.').pop()||''
const kindOf=url=>['jpg','jpeg','png'].includes(extension(url))?'image':
  ['mp4','mov'].includes(extension(url))?'video':'unsupported'
async function ensurePublicMedia(url,kind,fetchFn){
  const imageTypes=new Set(['jpg','jpeg','png'])
  const expected=imageTypes.has(extension(url))
    ?(extension(url)==='png'?'image/png':'image/jpeg')
    :(extension(url)==='mov'?'video/quicktime':'video/mp4')
  const maxBytes=imageTypes.has(extension(url))?8*1024*1024:1024*1024*1024
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000)
  try{
    const response=await fetchFn(url,{method:'HEAD',redirect:'error',cache:'no-store',
      credentials:'omit',signal:controller.signal})
    const type=(response.headers.get('content-type')||'').split(';')[0].trim().toLowerCase()
    const length=Number(response.headers.get('content-length')||0)
    if(!response.ok||type!==expected||(length&&length>maxBytes))fail('instagram_media_preflight_failed')
  }catch(error){
    if(error instanceof MetaInstagramError)throw error
    fail('instagram_media_preflight_failed')
  }finally{clearTimeout(timer)}
}
const validId=value=>typeof value==='string'&&/^\d{5,40}$/.test(value)
function validPermalink(value,format){
  if(typeof value!=='string')return false
  if(format==='story')return /^https:\/\/www\.instagram\.com\/stories\/[A-Za-z0-9._-]+\/\d+\/?$/.test(value)
  if(format==='reel')return /^https:\/\/www\.instagram\.com\/reel\/[A-Za-z0-9_-]+\/?$/.test(value)
  return /^https:\/\/www\.instagram\.com\/p\/[A-Za-z0-9_-]+\/?$/.test(value)
}
async function finishAndVerify({client,containerId,accountId,format,contentRevision,now=new Date()}){
  let processing
  try{processing=await client.getContainerStatus(containerId)}
  catch{return {state:'provider_processing',containerId,accountId}}
  if(processing?.status_code!=='FINISHED')
    return {state:'provider_processing',containerId,providerStatus:processing?.status_code||'unknown',accountId}
  let receipt
  try{receipt=await client.publishContainer(containerId)}
  catch{return {state:'delivery_unknown',containerId,accountId}}
  if(!validId(receipt?.id))return {state:'delivery_unknown',containerId,accountId}
  let readback
  try{readback=await client.getPublishedMedia(receipt.id)}
  catch{return {state:'delivery_unknown',containerId,providerPostId:receipt.id,accountId}}
  const providerTimestamp=typeof readback?.timestamp==='string'?Date.parse(readback.timestamp):NaN
  if(String(readback?.id)!==receipt.id||!validPermalink(readback?.permalink,format)||!Number.isFinite(providerTimestamp))
    return {state:'delivery_unknown',containerId,providerPostId:receipt.id,accountId}
  return {
    state:'published',provider:'meta_graph_api',accountId,providerPostId:receipt.id,
    permalink:readback.permalink,publishedAt:new Date(providerTimestamp).toISOString(),
    mediaType:typeof readback.media_product_type==='string'?readback.media_product_type:
      (typeof readback.media_type==='string'?readback.media_type:'UNKNOWN'),
    containerId,contentRevision,
  }
}
export async function publishApprovedInstagramMedia({
  post,expectedRevision,confirmed=false,environment=process.env,providerClient,fetchFn=fetch,now=new Date(),
}={}){
  if(typeof window!=='undefined')fail('meta_server_only')
  if(!isInstagramPublisherEnabled(environment))fail('instagram_publishing_disabled')
  if(confirmed!==true||!post||post.status!=='approved'||
    !Number.isSafeInteger(expectedRevision)||post.revision!==expectedRevision||
    post.channel!=='instagram'||typeof post.socialAccountId!=='string'||!post.socialAccountId)
    fail('instagram_invalid_approved_post')
  if(!META_ACCOUNT_TARGETS[post.socialAccountId]||!GROWTH_BRANDS[post.brand])
    fail('instagram_invalid_approved_post')
  const format=post.instagramFormat||'feed'
  if(!['feed','reel','story','carousel'].includes(format))fail('instagram_invalid_approved_post')
  if(format==='story' ? Boolean(String(post.caption||'').trim()) : !String(post.caption||'').trim())
    fail('instagram_invalid_approved_post')
  let caption=''
  try{caption=format==='story'?'':[post.caption,publicCampaignLink(post)].filter(Boolean).join('\n\n')}
  catch{fail('instagram_media_preflight_failed')}
  if([...caption].length>2200)fail('instagram_media_preflight_failed')
  if(!/^v\d+\.\d+$/.test(environment.META_GRAPH_API_VERSION||''))fail('instagram_publishing_disabled')
  let mediaUrl=''
  let carouselItems=[]
  try{
    if(format==='carousel'){
      if(!Array.isArray(post.carouselItems)||post.carouselItems.length<2||post.carouselItems.length>10)
        fail('instagram_media_preflight_failed')
      carouselItems=post.carouselItems.map(item=>({
        url:normalizePublicSource(item.mediaUrl,post.brand),kind:kindOf(normalizePublicSource(item.mediaUrl,post.brand)),
      }))
      if(carouselItems.some(item=>item.kind==='unsupported'))fail('instagram_media_preflight_failed')
    }else{
      mediaUrl=normalizePublicSource(post.mediaUrl,post.brand)
      const kind=kindOf(mediaUrl)
      if(kind==='unsupported')fail('instagram_media_preflight_failed')
      if(format==='feed'&&(kind!=='image'||!/^jpe?g$/i.test(extension(mediaUrl))||!String(post.mediaAlt||'').trim()))
        fail('instagram_media_preflight_failed')
      if(format==='reel'&&kind!=='video')fail('instagram_media_preflight_failed')
      if(format==='story'&&kind==='unsupported')fail('instagram_media_preflight_failed')
    }
  }catch(error){
    if(error instanceof MetaInstagramError)throw error
    fail('instagram_media_preflight_failed')
  }
  const client=providerClient||await createMetaInstagramPublisherClient(post.socialAccountId)
  if(client?.targetId!==post.socialAccountId||
    client?.username?.toLowerCase()!==META_ACCOUNT_TARGETS[post.socialAccountId].handle||
    typeof client?.getContainerStatus!=='function'||
    typeof client?.publishContainer!=='function'||
    typeof client?.getPublishedMedia!=='function')
    fail('instagram_account_not_connected')
  // Preflight every public asset before making the first Meta container request.
  if(format==='carousel'){
    for(const item of carouselItems)await ensurePublicMedia(item.url,item.kind,fetchFn)
  }else await ensurePublicMedia(mediaUrl,kindOf(mediaUrl),fetchFn)
  if(format==='feed'){
    if(typeof client.createImageContainer!=='function')fail('instagram_account_not_connected')
    let container
    try{container=await client.createImageContainer({imageUrl:mediaUrl,caption,altText:post.mediaAlt})}
    catch{return {state:'delivery_unknown',accountId:post.socialAccountId}}
    if(!validId(container?.id))return {state:'delivery_unknown',accountId:post.socialAccountId}
    return finishAndVerify({client,containerId:container.id,accountId:post.socialAccountId,format,contentRevision:post.revision,now})
  }
  if(format==='reel'){
    if(typeof client.createReelContainer!=='function')fail('instagram_account_not_connected')
    let container
    try{container=await client.createReelContainer({videoUrl:mediaUrl,caption,shareToFeed:true})}
    catch{return {state:'delivery_unknown',accountId:post.socialAccountId}}
    if(!validId(container?.id))return {state:'delivery_unknown',accountId:post.socialAccountId}
    return finishAndVerify({client,containerId:container.id,accountId:post.socialAccountId,format,contentRevision:post.revision,now})
  }
  if(format==='story'){
    if(typeof client.createStoryContainer!=='function')fail('instagram_account_not_connected')
    let container
    try{container=await client.createStoryContainer({mediaUrl,mediaKind:kindOf(mediaUrl)})}
    catch(error){
      if(error?.code==='meta_story_requires_business_account')throw error
      return {state:'delivery_unknown',accountId:post.socialAccountId}
    }
    if(!validId(container?.id))return {state:'delivery_unknown',accountId:post.socialAccountId}
    return finishAndVerify({client,containerId:container.id,accountId:post.socialAccountId,format,contentRevision:post.revision,now})
  }
  if(typeof client.createCarouselItemContainer!=='function'||typeof client.createCarouselContainer!=='function')
    fail('instagram_account_not_connected')
  const childIds=[]
  for(const item of carouselItems){
    try{
      const child=await client.createCarouselItemContainer({mediaUrl:item.url,mediaKind:item.kind})
      if(!validId(child?.id))return {state:'delivery_unknown',accountId:post.socialAccountId,childContainerIds:childIds}
      childIds.push(child.id)
      const status=await client.getContainerStatus(child.id)
      if(status?.status_code!=='FINISHED')
        return {state:'provider_processing',accountId:post.socialAccountId,containerId:child.id,
          providerStatus:status?.status_code||'unknown',childContainerIds:childIds}
    }catch{
      return {state:'delivery_unknown',accountId:post.socialAccountId,childContainerIds:childIds}
    }
  }
  let parent
  try{parent=await client.createCarouselContainer({children:childIds,caption})}
  catch{return {state:'delivery_unknown',accountId:post.socialAccountId,childContainerIds:childIds}}
  if(!validId(parent?.id))return {state:'delivery_unknown',accountId:post.socialAccountId,childContainerIds:childIds}
  const result=await finishAndVerify({client,containerId:parent.id,accountId:post.socialAccountId,
    format:'feed',contentRevision:post.revision,now})
  return {...result,containerId:parent.id,childContainerIds:childIds,mediaType:result.state==='published'?'CAROUSEL':result.mediaType}
}
// Backward-compatible export name for existing tests/callers.
export const publishApprovedInstagramImage=publishApprovedInstagramMedia
