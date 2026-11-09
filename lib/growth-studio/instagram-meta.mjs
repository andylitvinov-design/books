// Official Instagram API with Instagram Login primitives.
// Server only. No credential is returned to client code or logs.
import {
  createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual,
} from 'node:crypto'
import {GROWTH_INSTAGRAM_ACCOUNT_TARGETS} from './instagram-accounts.mjs'

export const INSTAGRAM_LOGIN_SCOPES=Object.freeze([
  'instagram_business_basic',
  'instagram_business_content_publish',
])
export const INSTAGRAM_OAUTH_CALLBACK_PATH='/api/admin/growth-studio/instagram/callback'
const ACCOUNT_IDS=new Set(GROWTH_INSTAGRAM_ACCOUNT_TARGETS.map(account=>account.id))
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export class InstagramMetaError extends Error {
  constructor(code){super(code);this.name='InstagramMetaError';this.code=code}
}
const fail=code=>{throw new InstagramMetaError(code)}
const clean=value=>typeof value==='string'&&value.trim()&&!/[\r\n\0]/.test(value)?value.trim():''
function validHttpsUrl(value){
  try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password&&!url.port&&!url.search&&!url.hash?url:null}catch{return null}
}
export function readInstagramMetaConfiguration(environment=process.env){
  if(typeof window!=='undefined')throw new InstagramMetaError('server_only')
  const clientId=clean(environment.HH_GROWTH_INSTAGRAM_LOGIN_CLIENT_ID)
  const clientSecret=clean(environment.HH_GROWTH_INSTAGRAM_LOGIN_CLIENT_SECRET)
  const redirectUri=clean(environment.HH_GROWTH_INSTAGRAM_REDIRECT_URI)
  const stateSecret=clean(environment.HH_GROWTH_INSTAGRAM_OAUTH_STATE_SECRET)
  const encryptionKey=clean(environment.HH_GROWTH_INSTAGRAM_TOKEN_ENCRYPTION_KEY)
  const redirect=validHttpsUrl(redirectUri)
  const site=validHttpsUrl(clean(environment.NEXT_PUBLIC_SITE_URL)||'https://holistichouse.vercel.app')
  const key=Buffer.from(encryptionKey,'base64')
  const ready=Boolean(clientId&&clientSecret&&redirect&&site&&
    redirect.origin===site.origin&&redirect.pathname===INSTAGRAM_OAUTH_CALLBACK_PATH&&
    stateSecret.length>=32&&key.length===32)
  return {
    ready,
    publishEnabled:false, // A worker and receipt/reconciliation path have not shipped.
    clientId:ready?clientId:'',
    clientSecret:ready?clientSecret:'',
    redirectUri:ready?redirect.toString():'',
    stateSecret:ready?stateSecret:'',
    encryptionKey:ready?encryptionKey:'',
    missing:[
      !clientId?'HH_GROWTH_INSTAGRAM_LOGIN_CLIENT_ID':null,
      !clientSecret?'HH_GROWTH_INSTAGRAM_LOGIN_CLIENT_SECRET':null,
      !redirect?'HH_GROWTH_INSTAGRAM_REDIRECT_URI':null,
      (!redirect||!site||redirect.origin!==site.origin||redirect.pathname!==INSTAGRAM_OAUTH_CALLBACK_PATH)?'redirect_uri_mismatch':null,
      stateSecret.length<32?'HH_GROWTH_INSTAGRAM_OAUTH_STATE_SECRET':null,
      key.length!==32?'HH_GROWTH_INSTAGRAM_TOKEN_ENCRYPTION_KEY':null,
    ].filter(Boolean),
  }
}
export function createInstagramOAuthState({accountId,nonce,issuedAt=Date.now()},secret){
  if(!ACCOUNT_IDS.has(accountId)||!UUID.test(nonce)||!Number.isSafeInteger(issuedAt)||
    typeof secret!=='string'||secret.length<32)fail('invalid_oauth_state')
  const payload=Buffer.from(JSON.stringify({v:1,accountId,nonce,issuedAt})).toString('base64url')
  const signature=createHmac('sha256',secret).update(payload).digest('base64url')
  return payload+'.'+signature
}
export function verifyInstagramOAuthState(state,secret,{now=Date.now(),maxAgeMs=10*60*1000}={}){
  if(typeof state!=='string'||state.length>1200||typeof secret!=='string'||secret.length<32)fail('invalid_oauth_state')
  const [payload,signature,...rest]=state.split('.')
  if(!payload||!signature||rest.length)fail('invalid_oauth_state')
  const expected=createHmac('sha256',secret).update(payload).digest()
  let supplied
  try{supplied=Buffer.from(signature,'base64url')}catch{fail('invalid_oauth_state')}
  if(supplied.length!==expected.length||!timingSafeEqual(supplied,expected))fail('invalid_oauth_state')
  let value
  try{value=JSON.parse(Buffer.from(payload,'base64url').toString('utf8'))}catch{fail('invalid_oauth_state')}
  if(value?.v!==1||!ACCOUNT_IDS.has(value.accountId)||!UUID.test(value.nonce)||
    !Number.isSafeInteger(value.issuedAt)||value.issuedAt>now+30_000||now-value.issuedAt>maxAgeMs)
    fail('invalid_oauth_state')
  return {accountId:value.accountId,nonce:value.nonce,issuedAt:value.issuedAt}
}
export function buildInstagramLoginUrl({accountId,state,configuration}){
  if(!configuration?.ready||!ACCOUNT_IDS.has(accountId)||typeof state!=='string'||!state)
    fail('instagram_oauth_unavailable')
  const url=new URL('https://www.instagram.com/oauth/authorize')
  url.searchParams.set('client_id',configuration.clientId)
  url.searchParams.set('redirect_uri',configuration.redirectUri)
  url.searchParams.set('response_type','code')
  url.searchParams.set('scope',INSTAGRAM_LOGIN_SCOPES.join(','))
  url.searchParams.set('state',state)
  return url.toString()
}
async function requestJson(url,options={},fetchFn=fetch){
  const controller=new AbortController()
  const timer=setTimeout(()=>controller.abort(),12_000)
  try{
    const response=await fetchFn(url,{...options,redirect:'error',cache:'no-store',
      credentials:'omit',signal:controller.signal})
    const body=await response.json().catch(()=>null)
    if(!response.ok||!body||typeof body!=='object'||body.error)fail('instagram_provider_request_failed')
    return body
  }catch(error){
    if(error instanceof InstagramMetaError)throw error
    fail('instagram_provider_unavailable')
  }finally{clearTimeout(timer)}
}
function oneTokenResult(body){
  if(Array.isArray(body.data)){
    if(body.data.length!==1)fail('instagram_token_response_invalid')
    return body.data[0]
  }
  return body
}
function grantedPermissions(raw){
  const source=Array.isArray(raw)?raw:typeof raw==='string'?raw.split(','):[]
  return source.map(item=>typeof item==='string'?item:
    (typeof item?.permission==='string'?item.permission:typeof item?.name==='string'?item.name:''))
    .filter(Boolean)
}
export async function exchangeInstagramAuthorizationCode({code,configuration,fetchFn=fetch}){
  if(!configuration?.ready||!clean(code))fail('instagram_oauth_unavailable')
  const form=new URLSearchParams({
    client_id:configuration.clientId,
    client_secret:configuration.clientSecret,
    grant_type:'authorization_code',
    redirect_uri:configuration.redirectUri,
    code:code.trim(),
  })
  const shortBody=await requestJson('https://api.instagram.com/oauth/access_token',{
    method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body:form.toString(),
  },fetchFn)
  const short=oneTokenResult(shortBody)
  const shortToken=clean(short?.access_token)
  const userId=String(short?.user_id??short?.id??'')
  const permissions=grantedPermissions(short?.permissions??short?.scope??shortBody?.permissions)
  if(!shortToken||!userId)fail('instagram_token_response_invalid')
  const missing=INSTAGRAM_LOGIN_SCOPES.filter(scope=>!permissions.includes(scope))
  if(missing.length)fail('instagram_permissions_missing')
  const exchangeUrl=new URL('https://graph.instagram.com/access_token')
  exchangeUrl.searchParams.set('grant_type','ig_exchange_token')
  exchangeUrl.searchParams.set('client_secret',configuration.clientSecret)
  exchangeUrl.searchParams.set('access_token',shortToken)
  const longBody=await requestJson(exchangeUrl.toString(),{method:'GET'},fetchFn)
  const long=oneTokenResult(longBody)
  const accessToken=clean(long?.access_token)
  const expiresIn=Number(long?.expires_in)
  if(!accessToken||!Number.isSafeInteger(expiresIn)||expiresIn<60)fail('instagram_long_lived_token_invalid')
  const profileUrl=new URL('https://graph.instagram.com/me')
  profileUrl.searchParams.set('fields','user_id,username')
  const profile=await requestJson(profileUrl.toString(),{
    method:'GET',headers:{Authorization:'Bearer '+accessToken},
  },fetchFn)
  const providerAccountId=String(profile?.user_id??profile?.id??'')
  const username=clean(profile?.username)?.replace(/^@/,'').toLowerCase()
  if(!providerAccountId||!username||providerAccountId!==userId)fail('instagram_identity_unverified')
  return {
    providerAccountId,username,permissions,
    accessToken,expiresAt:new Date(Date.now()+expiresIn*1000).toISOString(),
    tokenType:clean(long?.token_type)||'bearer',
  }
}
export function encryptInstagramAccessToken(token,keyBase64){
  if(typeof token!=='string'||token.length<20||/[\r\n]/.test(token))fail('invalid_instagram_credential')
  const key=Buffer.from(String(keyBase64||''),'base64')
  if(key.length!==32)fail('instagram_encryption_unavailable')
  const iv=randomBytes(12)
  const cipher=createCipheriv('aes-256-gcm',key,iv)
  const ciphertext=Buffer.concat([cipher.update(token,'utf8'),cipher.final()])
  return {v:1,alg:'A256GCM',iv:iv.toString('base64url'),
    ciphertext:ciphertext.toString('base64url'),tag:cipher.getAuthTag().toString('base64url')}
}
export function decryptInstagramAccessToken(envelope,keyBase64){
  const key=Buffer.from(String(keyBase64||''),'base64')
  if(key.length!==32||!envelope||envelope.v!==1||envelope.alg!=='A256GCM')fail('instagram_credential_unavailable')
  try{
    const decipher=createDecipheriv('aes-256-gcm',key,Buffer.from(envelope.iv,'base64url'))
    decipher.setAuthTag(Buffer.from(envelope.tag,'base64url'))
    return Buffer.concat([
      decipher.update(Buffer.from(envelope.ciphertext,'base64url')),decipher.final(),
    ]).toString('utf8')
  }catch{fail('instagram_credential_unavailable')}
}
