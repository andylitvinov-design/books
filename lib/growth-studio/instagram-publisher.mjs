// Explicit Instagram image Feed publisher adapter. Server only.
// This is not a scheduler and is not called by the UI yet. It remains disabled unless
// an owner later commissions credentials and a protected queue/approval worker.
import {decryptInstagramAccessToken,InstagramMetaError} from './instagram-meta.mjs'
import {createGrowthInstagramAccountStore} from './instagram-account-store.mjs'
import {normalizePublicSource} from './model.mjs'
import {GROWTH_BRANDS} from './model.mjs'

const fail=code=>{throw new InstagramMetaError(code)}
function graphVersion(environment){
 const value=environment.HH_GROWTH_INSTAGRAM_GRAPH_API_VERSION
 return typeof value==='string'&&/^v\d{2}\.\d$/.test(value)?value:''
}
async function readJson(response){
 const value=await response.json().catch(()=>null)
 if(!response.ok||!value||typeof value!=='object'||value.error)fail('instagram_provider_unavailable')
 return value
}
async function apiRequest(url,{method='GET',token,body,fetchFn=fetch}={}){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15_000)
 try{
  const headers={Authorization:'Bearer '+token}
  if(body)headers['Content-Type']='application/x-www-form-urlencoded'
  return await fetchFn(url,{method,headers,body:body?.toString(),redirect:'error',
    cache:'no-store',credentials:'omit',signal:controller.signal})
 }catch{fail('instagram_delivery_unknown')}
 finally{clearTimeout(timer)}
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
  if(error instanceof InstagramMetaError)throw error
  fail('instagram_media_preflight_failed')
 }finally{clearTimeout(timer)}
}
export function isInstagramPublisherEnabled(environment=process.env){
 return environment.HH_GROWTH_INSTAGRAM_PUBLISH_ENABLED==='true'
}
export async function publishApprovedInstagramImage({
 post,expectedRevision,confirmed=false,environment=process.env,accountStore,
 fetchFn=fetch,now=new Date(),
}={}){
 if(typeof window!=='undefined')fail('server_only')
 if(!isInstagramPublisherEnabled(environment))fail('instagram_publishing_disabled')
 if(confirmed!==true||!post||post.status!=='approved'||
   !Number.isSafeInteger(expectedRevision)||post.revision!==expectedRevision||
   post.channel!=='instagram'||typeof post.socialAccountId!=='string'||
   !post.socialAccountId||!post.caption?.trim())fail('instagram_invalid_approved_post')
 const brandBase=GROWTH_BRANDS[post.brand]
 if(!brandBase)fail('instagram_invalid_approved_post')
 let mediaUrl
 try{mediaUrl=normalizePublicSource(post.mediaUrl,post.brand)}catch{fail('instagram_media_preflight_failed')}
 const mediaPath=new URL(mediaUrl).pathname
 if(!/\.jpe?g$/i.test(mediaPath)||!String(post.mediaAlt||'').trim())fail('instagram_media_preflight_failed')
 if([...post.caption].length>2200)fail('instagram_invalid_approved_post')
 const version=graphVersion(environment)
 const configKey=environment.HH_GROWTH_INSTAGRAM_TOKEN_ENCRYPTION_KEY
 if(!version||!configKey)fail('instagram_publishing_disabled')
 const store=accountStore||createGrowthInstagramAccountStore({environment,fetchFn})
 if(!store)fail('instagram_account_not_connected')
 let connection
 try{connection=await store.getProviderConnection(post.socialAccountId)}catch{fail('instagram_account_not_connected')}
 const identity=connection?.identity
 if(!identity||identity.connectionState!=='connected'||
   identity.username!==post.socialAccountId.replaceAll('_','.')||
   !identity.permissions?.includes('instagram_business_basic')||
   !identity.permissions?.includes('instagram_business_content_publish'))
   fail('instagram_account_not_connected')
 if(Date.parse(identity.expiresAt)<=now.getTime()+5*60_000)fail('instagram_token_expired')
 const token=decryptInstagramAccessToken(connection.envelope,configKey)
 await ensurePublicJpeg(mediaUrl,fetchFn)
 const base='https://graph.instagram.com/'+version
 const containerBody=new URLSearchParams({
   image_url:mediaUrl,
   caption:post.caption,
   alt_text:post.mediaAlt,
 })
 // Creating a media container does not publish. A network timeout here is still
 // reconciled as unknown by the caller; never retry this adapter blindly.
 const containerResponse=await apiRequest(base+'/'+encodeURIComponent(identity.providerAccountId)+'/media',{
   method:'POST',token,body:containerBody,fetchFn,
 })
 const container=await readJson(containerResponse)
 if(typeof container.id!=='string'||!container.id)fail('instagram_delivery_unknown')
 const statusUrl=new URL(base+'/'+encodeURIComponent(container.id))
 statusUrl.searchParams.set('fields','status_code')
 const status=await readJson(await apiRequest(statusUrl.toString(),{token,fetchFn}))
 if(status.status_code!=='FINISHED')return {state:'provider_processing',containerId:container.id}
 const publishBody=new URLSearchParams({creation_id:container.id})
 let publishResult
 try{
  publishResult=await readJson(await apiRequest(base+'/'+encodeURIComponent(identity.providerAccountId)+'/media_publish',{
   method:'POST',token,body:publishBody,fetchFn,
  }))
 }catch{return {state:'delivery_unknown',containerId:container.id}}
 if(typeof publishResult.id!=='string'||!publishResult.id)return {state:'delivery_unknown',containerId:container.id}
 const readbackUrl=new URL(base+'/'+encodeURIComponent(publishResult.id))
 readbackUrl.searchParams.set('fields','id,permalink,timestamp,media_type')
 let readback
 try{readback=await readJson(await apiRequest(readbackUrl.toString(),{token,fetchFn}))}
 catch{return {state:'delivery_unknown',containerId:container.id,providerPostId:publishResult.id}}
 if(readback.id!==publishResult.id||typeof readback.permalink!=='string'||
   !/^https:\/\/www\.instagram\.com\/(?:p|reel)\/[A-Za-z0-9_-]+\/?$/.test(readback.permalink))
   return {state:'delivery_unknown',containerId:container.id,providerPostId:publishResult.id}
 return {
   state:'published',
   provider:'instagram',
   accountId:post.socialAccountId,
   providerPostId:readback.id,
   permalink:readback.permalink,
   publishedAt:typeof readback.timestamp==='string'?readback.timestamp:null,
   mediaType:typeof readback.media_type==='string'?readback.media_type:'IMAGE',
   containerId:container.id,
   contentRevision:post.revision,
 }
}
