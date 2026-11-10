import {createCipheriv,createDecipheriv,createHash,createHmac,randomBytes,timingSafeEqual} from 'node:crypto'
import {isValidInstagramInsightRange,instagramInsightUnixRange} from './instagram-insights.mjs'

export const META_REQUIRED_SCOPES = Object.freeze([
  'pages_show_list',
  'pages_read_engagement',
  'instagram_basic',
  'instagram_content_publish',
  'instagram_manage_insights',
])
export const META_ACCOUNT_TARGETS = Object.freeze({
  wizards_secrets: Object.freeze({handle:'wizards.secrets',label:'Wizards Secrets',accountRole:'work'}),
  andy_therapist: Object.freeze({handle:'andy.therapist',label:'Andy Therapist',accountRole:'personal'}),
})
// Owner-only setup diagnostic: return configuration NAMES, never credential values.
// A configured app is not proof of Meta consent, identity or publication rights.
export function metaInstagramConfigurationStatus(env=process.env) {
  const required=['META_APP_ID','META_APP_SECRET','META_REDIRECT_URI',
    'META_GRAPH_API_VERSION','META_TOKEN_ENCRYPTION_KEY',
    'PRESCRIPTIONS_KV_REST_API_URL','PRESCRIPTIONS_KV_REST_API_TOKEN']
  const missingSettings=required.filter(key=>typeof env[key]!=='string'||!env[key].trim())
  if(!missingSettings.includes('META_GRAPH_API_VERSION') &&
     !/^v\d+\.\d+$/.test(env.META_GRAPH_API_VERSION))
    missingSettings.push('META_GRAPH_API_VERSION')
  if(!missingSettings.includes('META_REDIRECT_URI')){
    try{
      const redirect=new URL(env.META_REDIRECT_URI)
      if(redirect.protocol!=='https:' && redirect.hostname!=='localhost')
        missingSettings.push('META_REDIRECT_URI')
    }catch{missingSettings.push('META_REDIRECT_URI')}
  }
  if(!missingSettings.includes('PRESCRIPTIONS_KV_REST_API_URL')){
    try {
      const redis=new URL(env.PRESCRIPTIONS_KV_REST_API_URL)
      if(redis.protocol!=='https:'||redis.username||redis.password||redis.search||redis.hash)
        missingSettings.push('PRESCRIPTIONS_KV_REST_API_URL')
    }catch{missingSettings.push('PRESCRIPTIONS_KV_REST_API_URL')}
  }
  return {
    authorizationReady:missingSettings.length===0,
    publishFlagEnabled:env.HH_GROWTH_INSTAGRAM_PUBLISH_ENABLED==='true',
    missingSettings,
  }
}

const REDIS_PREFIX = 'holistic-house:growth-studio:meta-instagram:v1:'
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 60
const STATE_TTL_SECONDS = 10 * 60
const SAFE_PAGE_TASKS = new Set(['CREATE_CONTENT','MANAGE','PROFILE_PLUS_CREATE_CONTENT','PROFILE_PLUS_FULL_CONTROL'])

export class MetaInstagramError extends Error {
  constructor(code='meta_unavailable') { super(code); this.name='MetaInstagramError'; this.code=code }
}
function config(env=process.env) {
  const graphVersion=env.META_GRAPH_API_VERSION
  if (!env.META_APP_ID || !env.META_APP_SECRET || !env.META_REDIRECT_URI ||
      !/^v\d+\.\d+$/.test(graphVersion || '') || !env.META_TOKEN_ENCRYPTION_KEY) {
    throw new MetaInstagramError('meta_not_configured')
  }
  let redirect
  try { redirect=new URL(env.META_REDIRECT_URI) } catch { throw new MetaInstagramError('meta_not_configured') }
  if (redirect.protocol!=='https:' && redirect.hostname!=='localhost') throw new MetaInstagramError('meta_not_configured')
  return {appId:env.META_APP_ID,appSecret:env.META_APP_SECRET,redirectUri:redirect.toString(),
    graphVersion,secret:env.META_TOKEN_ENCRYPTION_KEY}
}
function keyBytes(secret) { return createHash('sha256').update(String(secret)).digest() }
function b64(value) { return Buffer.from(value).toString('base64url') }
function safeEq(a,b) {
  const x=Buffer.from(String(a)),y=Buffer.from(String(b))
  return x.length===y.length && timingSafeEqual(x,y)
}
export function createMetaOAuthState(targetId, {secret=process.env.META_TOKEN_ENCRYPTION_KEY,now=Date.now(),nonce=randomBytes(32).toString('base64url')}={}) {
  if (!META_ACCOUNT_TARGETS[targetId] || !secret) throw new MetaInstagramError('meta_invalid_target')
  const payload=b64(JSON.stringify({targetId,nonce,createdAt:now}))
  const signature=createHmac('sha256',keyBytes(secret)).update(payload).digest('base64url')
  return {state:nonce,cookieValue:payload+'.'+signature}
}
export function verifyMetaOAuthState(cookieValue,state,{secret=process.env.META_TOKEN_ENCRYPTION_KEY,now=Date.now()}={}) {
  if (typeof cookieValue!=='string'||typeof state!=='string'||!secret) return null
  const parts=cookieValue.split('.')
  if(parts.length!==2)return null
  const expected=createHmac('sha256',keyBytes(secret)).update(parts[0]).digest('base64url')
  if(!safeEq(parts[1],expected))return null
  try{
    const payload=JSON.parse(Buffer.from(parts[0],'base64url').toString('utf8'))
    if(payload.nonce!==state||!META_ACCOUNT_TARGETS[payload.targetId]||
       !Number.isFinite(payload.createdAt)||now-payload.createdAt<0||
       now-payload.createdAt>STATE_TTL_SECONDS*1000)return null
    return {targetId:payload.targetId}
  }catch{return null}
}
export function encryptMetaCredentials(value,{secret=process.env.META_TOKEN_ENCRYPTION_KEY,iv=randomBytes(12)}={}) {
  if(!secret)throw new MetaInstagramError('meta_not_configured')
  const cipher=createCipheriv('aes-256-gcm',keyBytes(secret),iv)
  const encrypted=Buffer.concat([cipher.update(JSON.stringify(value),'utf8'),cipher.final()])
  return [b64(iv),b64(cipher.getAuthTag()),b64(encrypted)].join('.')
}
export function decryptMetaCredentials(value,{secret=process.env.META_TOKEN_ENCRYPTION_KEY}={}) {
  if(!secret||typeof value!=='string')throw new MetaInstagramError('meta_credential_unavailable')
  try{
    const [iv,tag,ciphertext,...extra]=value.split('.')
    if(!iv||!tag||!ciphertext||extra.length)throw new Error('format')
    const decipher=createDecipheriv('aes-256-gcm',keyBytes(secret),Buffer.from(iv,'base64url'))
    decipher.setAuthTag(Buffer.from(tag,'base64url'))
    return JSON.parse(Buffer.concat([decipher.update(Buffer.from(ciphertext,'base64url')),decipher.final()]).toString('utf8'))
  }catch{throw new MetaInstagramError('meta_credential_unavailable')}
}
function redisConfig(env=process.env) {
  let url
  try{url=new URL(env.PRESCRIPTIONS_KV_REST_API_URL)}catch{throw new MetaInstagramError('meta_storage_unavailable')}
  const token=env.PRESCRIPTIONS_KV_REST_API_TOKEN
  if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||url.port||!token)throw new MetaInstagramError('meta_storage_unavailable')
  return {url:url.toString().replace(/\/$/,''),token}
}
async function redisCommand(args) {
  const {url,token}=redisConfig()
  const response=await fetch(url,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
    body:JSON.stringify(args),cache:'no-store',credentials:'omit',redirect:'error',signal:AbortSignal.timeout(5000)})
  if(!response.ok)throw new MetaInstagramError('meta_storage_unavailable')
  const body=await response.json()
  if(!body||body.error||!Object.hasOwn(body,'result'))throw new MetaInstagramError('meta_storage_unavailable')
  return body.result
}
export async function saveMetaInstagramCredentials(targetId,record) {
  if(!META_ACCOUNT_TARGETS[targetId])throw new MetaInstagramError('meta_invalid_target')
  const encrypted=encryptMetaCredentials(record)
  const result=await redisCommand(['SET',REDIS_PREFIX+targetId,encrypted,'EX',TOKEN_TTL_SECONDS])
  if(result!=='OK')throw new MetaInstagramError('meta_storage_unavailable')
}
export async function loadMetaInstagramCredentials(targetId) {
  if(!META_ACCOUNT_TARGETS[targetId])throw new MetaInstagramError('meta_invalid_target')
  const encrypted=await redisCommand(['GET',REDIS_PREFIX+targetId])
  return encrypted?decryptMetaCredentials(encrypted):null
}
export async function deleteMetaInstagramCredentials(targetId) {
  if(!META_ACCOUNT_TARGETS[targetId])throw new MetaInstagramError('meta_invalid_target')
  await redisCommand(['DEL',REDIS_PREFIX+targetId])
}
export function buildMetaAuthorizationUrl(targetId,state) {
  const cfg=config()
  if(!META_ACCOUNT_TARGETS[targetId]||typeof state!=='string')throw new MetaInstagramError('meta_invalid_target')
  const url=new URL('https://www.facebook.com/'+cfg.graphVersion+'/dialog/oauth')
  url.searchParams.set('client_id',cfg.appId)
  url.searchParams.set('redirect_uri',cfg.redirectUri)
  url.searchParams.set('response_type','code')
  url.searchParams.set('state',state)
  url.searchParams.set('scope',META_REQUIRED_SCOPES.join(','))
  url.searchParams.set('auth_type','rerequest')
  return url.toString()
}
async function graphGet(path,params,token) {
  const cfg=config()
  const url=new URL('https://graph.facebook.com/'+cfg.graphVersion+'/'+path.replace(/^\//,''))
  for(const [key,value] of Object.entries(params||{}))url.searchParams.set(key,String(value))
  url.searchParams.set('access_token',token)
  url.searchParams.set('appsecret_proof',createHmac('sha256',cfg.appSecret).update(token).digest('hex'))
  const response=await fetch(url,{method:'GET',cache:'no-store',credentials:'omit',redirect:'error',signal:AbortSignal.timeout(10000)})
  const body=await response.json().catch(()=>null)
  if(!response.ok||!body||body.error) {
    const code=body?.error?.code===190?'meta_token_invalid':'meta_graph_error'
    throw new MetaInstagramError(code)
  }
  return body
}
async function graphPost(path,params,token) {
  const cfg=config()
  const url=new URL('https://graph.facebook.com/'+cfg.graphVersion+'/'+path.replace(/^\//,''))
  const body=new URLSearchParams()
  for(const [key,value] of Object.entries(params||{}))body.set(key,String(value))
  body.set('access_token',token)
  body.set('appsecret_proof',createHmac('sha256',cfg.appSecret).update(token).digest('hex'))
  const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body:body.toString(),cache:'no-store',credentials:'omit',redirect:'error',signal:AbortSignal.timeout(15000)})
  const result=await response.json().catch(()=>null)
  if(!response.ok||!result||result.error) {
    const code=result?.error?.code===190?'meta_token_invalid':'meta_graph_error'
    throw new MetaInstagramError(code)
  }
  return result
}

// Server-only capability client. It keeps Page access tokens inside this module;
// callers receive only account metadata and methods, never token values.
export async function createMetaInstagramPublisherClient(targetId) {
  if(!META_ACCOUNT_TARGETS[targetId])throw new MetaInstagramError('meta_invalid_target')
  const status=await verifyMetaInstagramConnection(targetId)
  if(status.connectionState!=='connected')throw new MetaInstagramError('meta_account_not_connected')
  const record=await loadMetaInstagramCredentials(targetId)
  if(!record||record.targetId!==targetId||record.publishingEnabled!==false||
    !record.pageAccessToken||!record.instagramAccountId||
    !record.scopes?.includes('instagram_content_publish')||
    !record.pageTasks?.some(task=>SAFE_PAGE_TASKS.has(task)))
    throw new MetaInstagramError('meta_page_publish_access_missing')
  return Object.freeze({
    targetId,
    username:record.instagramUsername,
    instagramAccountId:record.instagramAccountId,
    instagramAccountType:record.instagramAccountType,
    async getAccountInsights({since,until}) {
      if(!record.scopes?.includes('instagram_manage_insights'))
        throw new MetaInstagramError('meta_insights_permission_missing')
      if(!isValidInstagramInsightRange(since,until))
        throw new MetaInstagramError('meta_insights_invalid_range')
      const metrics='views,reach,accounts_engaged,total_interactions,likes,comments,shares,saves,profile_links_taps,follows_and_unfollows'
      const range=instagramInsightUnixRange(since,until)
      return graphGet(record.instagramAccountId+'/insights',{
        metric:metrics,period:'day',metric_type:'total_value',...range,
      },record.pageAccessToken)
    },
    async listRecentMedia(limit=25) {
      if(!Number.isSafeInteger(limit)||limit<1||limit>50)throw new MetaInstagramError('meta_insights_invalid_limit')
      const result=await graphGet(record.instagramAccountId+'/media',{
        fields:'id,caption,media_type,media_product_type,timestamp,permalink,like_count,comments_count',
        limit,
      },record.pageAccessToken)
      return Array.isArray(result.data)?result.data:[]
    },
    async getMediaInsights(mediaId,mediaProductType='FEED') {
      if(typeof mediaId!=='string'||!/^\d{5,40}$/.test(mediaId))
        throw new MetaInstagramError('meta_invalid_media_id')
      if(!record.scopes?.includes('instagram_manage_insights'))
        throw new MetaInstagramError('meta_insights_permission_missing')
      const metrics=String(mediaProductType).toUpperCase()==='STORY'
        ?'views,reach,replies,shares,total_interactions,navigation'
        :'views,reach,likes,comments,saved,shares,total_interactions'
      return graphGet(mediaId+'/insights',{metric:metrics},record.pageAccessToken)
    },
    async createImageContainer({imageUrl,caption,altText}) {
      const result=await graphPost(record.instagramAccountId+'/media',{
        image_url:imageUrl,caption,alt_text:altText,
      },record.pageAccessToken)
      if(typeof result.id!=='string'||!result.id)throw new MetaInstagramError('meta_media_container_invalid')
      return {id:result.id}
    },
    async getContainerStatus(containerId) {
      if(typeof containerId!=='string'||!/^\d{5,40}$/.test(containerId))throw new MetaInstagramError('meta_invalid_container')
      return graphGet(containerId,{fields:'id,status_code'},record.pageAccessToken)
    },
    async publishContainer(containerId) {
      if(typeof containerId!=='string'||!/^\d{5,40}$/.test(containerId))throw new MetaInstagramError('meta_invalid_container')
      const result=await graphPost(record.instagramAccountId+'/media_publish',{creation_id:containerId},record.pageAccessToken)
      if(typeof result.id!=='string'||!result.id)throw new MetaInstagramError('meta_publish_receipt_missing')
      return {id:result.id}
    },
    async createStoryContainer({imageUrl,videoUrl}) {
      if(record.instagramAccountType!=='BUSINESS')throw new MetaInstagramError('meta_story_business_required')
      if(Boolean(imageUrl)===Boolean(videoUrl))throw new MetaInstagramError('instagram_media_preflight_failed')
      const result=await graphPost(record.instagramAccountId+'/media',{
        media_type:'STORIES',...(imageUrl?{image_url:imageUrl}:{video_url:videoUrl}),
      },record.pageAccessToken)
      if(typeof result.id!=='string'||!/^\d{5,40}$/.test(result.id))
        throw new MetaInstagramError('meta_media_container_invalid')
      return {id:result.id}
    },
    async getPublishedMedia(mediaId) {
      if(typeof mediaId!=='string'||!/^\d{5,40}$/.test(mediaId))throw new MetaInstagramError('meta_invalid_media_id')
      return graphGet(mediaId,{fields:'id,permalink,timestamp,media_type,media_product_type'},record.pageAccessToken)
    },
  })
}

export async function completeMetaInstagramAuthorization({code,targetId}) {
  const cfg=config()
  const target=META_ACCOUNT_TARGETS[targetId]
  if(!target||typeof code!=='string'||code.length>4096)throw new MetaInstagramError('meta_invalid_target')
  const exchange=new URL('https://graph.facebook.com/'+cfg.graphVersion+'/oauth/access_token')
  exchange.searchParams.set('client_id',cfg.appId)
  exchange.searchParams.set('client_secret',cfg.appSecret)
  exchange.searchParams.set('redirect_uri',cfg.redirectUri)
  exchange.searchParams.set('code',code)
  const shortResponse=await fetch(exchange,{cache:'no-store',credentials:'omit',redirect:'error',signal:AbortSignal.timeout(10000)})
  const shortToken=await shortResponse.json().catch(()=>null)
  if(!shortResponse.ok||!shortToken?.access_token)throw new MetaInstagramError('meta_code_exchange_failed')
  const extend=new URL('https://graph.facebook.com/'+cfg.graphVersion+'/oauth/access_token')
  extend.searchParams.set('grant_type','fb_exchange_token')
  extend.searchParams.set('client_id',cfg.appId)
  extend.searchParams.set('client_secret',cfg.appSecret)
  extend.searchParams.set('fb_exchange_token',shortToken.access_token)
  const longResponse=await fetch(extend,{cache:'no-store',credentials:'omit',redirect:'error',signal:AbortSignal.timeout(10000)})
  const longToken=await longResponse.json().catch(()=>null)
  if(!longResponse.ok||!longToken?.access_token)throw new MetaInstagramError('meta_token_exchange_failed')
  const userToken=longToken.access_token
  const [permissions,pages,user]=await Promise.all([
    graphGet('me/permissions',{},userToken),
    graphGet('me/accounts',{fields:'id,name,access_token,tasks,instagram_business_account{id,username,account_type}',limit:100},userToken),
    graphGet('me',{fields:'id,name'},userToken),
  ])
  const granted=new Set((permissions.data||[]).filter(x=>x.status==='granted').map(x=>x.permission))
  const missing=META_REQUIRED_SCOPES.filter(scope=>!granted.has(scope))
  if(missing.length)throw new MetaInstagramError('meta_permissions_missing')
  const matches=(pages.data||[]).filter(page=>
    String(page.instagram_business_account?.username||'').replace(/^@/,'').toLowerCase()===target.handle)
  if(matches.length!==1)throw new MetaInstagramError(matches.length?'meta_account_ambiguous':'meta_target_account_not_found')
  const page=matches[0]
  const tasks=new Set(page.tasks||[])
  if(!page.access_token||![...SAFE_PAGE_TASKS].some(task=>tasks.has(task)))
    throw new MetaInstagramError('meta_page_publish_access_missing')
  const ig=page.instagram_business_account
  const now=new Date().toISOString()
  const record={
    provider:'meta_graph_api',targetId,instagramAccountId:String(ig.id),instagramUsername:ig.username,
    instagramAccountType:ig.account_type||null,pageId:String(page.id),pageName:page.name||null,
    pageTasks:[...tasks],scopes:[...granted],metaUserId:String(user.id),
    userAccessToken:userToken,pageAccessToken:page.access_token,
    expiresAt:longToken.expires_in?new Date(Date.now()+Number(longToken.expires_in)*1000).toISOString():null,
    connectedAt:now,lastVerifiedAt:now,connectionState:'connected',publishingEnabled:false,
  }
  await saveMetaInstagramCredentials(targetId,record)
  return {targetId,handle:ig.username,instagramAccountId:String(ig.id),pageId:String(page.id),pageName:page.name||null,
    scopes:[...granted],pageTasks:[...tasks],expiresAt:record.expiresAt}
}
export async function verifyMetaInstagramConnection(targetId) {
  const record=await loadMetaInstagramCredentials(targetId)
  if(!record)return {targetId,handle:META_ACCOUNT_TARGETS[targetId].handle,connectionState:'pending_authorization',publishingEnabled:false}
  try{
    const [user,permissions,page]=await Promise.all([
      graphGet('me',{fields:'id,name'},record.userAccessToken),
      graphGet('me/permissions',{},record.userAccessToken),
      graphGet(record.pageId,{fields:'id,name,instagram_business_account{id,username,account_type}'},record.pageAccessToken),
    ])
    const granted=new Set((permissions.data||[]).filter(x=>x.status==='granted').map(x=>x.permission))
    if(String(user.id)!==record.metaUserId)throw new MetaInstagramError('meta_identity_mismatch')
    if(META_REQUIRED_SCOPES.some(scope=>!granted.has(scope))) {
      return {...await getMetaInstagramStatus(targetId),connectionState:'permission_limited',publishingEnabled:false}
    }
    const linked=page.instagram_business_account
    if(String(page.id)!==record.pageId||String(linked?.id)!==record.instagramAccountId||
       String(linked?.username||'').replace(/^@/,'').toLowerCase()!==META_ACCOUNT_TARGETS[targetId].handle) {
      return {...await getMetaInstagramStatus(targetId),connectionState:'identity_mismatch',publishingEnabled:false}
    }
    record.lastVerifiedAt=new Date().toISOString()
    await saveMetaInstagramCredentials(targetId,record)
    return getMetaInstagramStatus(targetId)
  }catch(error){
    const safeState=error instanceof MetaInstagramError&&error.code==='meta_token_invalid'
      ?'reauthorization_required':'error'
    return {...await getMetaInstagramStatus(targetId),connectionState:safeState,publishingEnabled:false}
  }
}

export async function getMetaInstagramStatus(targetId) {
  const record=await loadMetaInstagramCredentials(targetId)
  if(!record)return {targetId,handle:META_ACCOUNT_TARGETS[targetId].handle,connectionState:'pending_authorization',publishingEnabled:false}
  return {targetId,handle:record.instagramUsername,instagramAccountId:record.instagramAccountId,pageId:record.pageId,
    pageName:record.pageName,instagramAccountType:record.instagramAccountType||null,scopes:record.scopes,pageTasks:record.pageTasks,expiresAt:record.expiresAt,
    connectionState:record.connectionState,publishingEnabled:false,lastVerifiedAt:record.lastVerifiedAt}
}
