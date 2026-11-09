// Server-only Redis storage for Instagram account metadata and encrypted OAuth tokens.
// Tokens are never returned by listAccounts and never stored in the client-visible registry.
import {GROWTH_INSTAGRAM_ACCOUNT_TARGETS} from './instagram-accounts.mjs'

const META_KEY='holistic-house:growth-studio:instagram:accounts:v1'
const OAUTH_STATE_PREFIX='holistic-house:growth-studio:instagram:oauth-state:v1:'
const CREDENTIAL_PREFIX='holistic-house:growth-studio:instagram:credential:v1:'
const ACCOUNT_IDS=new Set(GROWTH_INSTAGRAM_ACCOUNT_TARGETS.map(account=>account.id))
const TIMEOUT_MS=5000
const ATOMIC_SAVE=[
  "redis.call('HSET',KEYS[1],ARGV[1],ARGV[2])",
  "redis.call('SET',KEYS[2],ARGV[3])",
  "return 1",
].join('\n')
const CONSUME_STATE=[
  "local value=redis.call('GET',KEYS[1])",
  "if value then redis.call('DEL',KEYS[1]) end",
  "return value",
].join('\n')
const DISCONNECT=[
  "redis.call('HDEL',KEYS[1],ARGV[1])",
  "redis.call('DEL',KEYS[2])",
  "return 1",
].join('\n')
const error=()=>new Error('instagram_store_unavailable')
function validUrl(value){
  if(typeof value!=='string'||/[\s\\]/.test(value))return null
  try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&!u.search&&!u.hash?u.toString().replace(/\/$/,''):null}catch{return null}
}
function metadata(value,accountId){
  if(typeof value!=='string'||value.length>3000)throw error()
  let item
  try{item=JSON.parse(value)}catch{throw error()}
  if(!item||item.accountId!==accountId||!ACCOUNT_IDS.has(accountId)||
    typeof item.providerAccountId!=='string'||!item.providerAccountId||
    typeof item.username!=='string'||!Number.isFinite(Date.parse(item.lastVerifiedAt))||
    !Array.isArray(item.permissions)||!item.permissions.every(x=>typeof x==='string')||
    !Number.isFinite(Date.parse(item.expiresAt)))throw error()
  return item
}
function makeStore(command){
  return {
    async createOAuthState(nonce,state){
      if(typeof nonce!=='string'||!/^[0-9a-f-]{36}$/i.test(nonce)||
        typeof state!=='string'||state.length>1200)throw error()
      const result=await command(['SET',OAUTH_STATE_PREFIX+nonce,state,'EX',600,'NX'])
      if(result!=='OK')throw error()
      return true
    },
    async consumeOAuthState(nonce){
      if(typeof nonce!=='string'||!/^[0-9a-f-]{36}$/i.test(nonce))throw error()
      const result=await command(['EVAL',CONSUME_STATE,1,OAUTH_STATE_PREFIX+nonce])
      return typeof result==='string'?result:null
    },
    async saveConnected({accountId,providerAccountId,username,permissions,expiresAt,encryptedCredential}){
      if(!ACCOUNT_IDS.has(accountId)||typeof providerAccountId!=='string'||!providerAccountId||
        typeof username!=='string'||username!==GROWTH_INSTAGRAM_ACCOUNT_TARGETS.find(x=>x.id===accountId)?.label.slice(1)||
        !Array.isArray(permissions)||!permissions.includes('instagram_business_basic')||
        !permissions.includes('instagram_business_content_publish')||
        !Number.isFinite(Date.parse(expiresAt))||!encryptedCredential||encryptedCredential.alg!=='A256GCM')
        throw new Error('instagram_identity_unverified')
      const lastVerifiedAt=new Date().toISOString()
      const item={accountId,providerAccountId,username,permissions,
        expiresAt,lastVerifiedAt,connectionState:'connected'}
      const result=await command(['EVAL',ATOMIC_SAVE,2,META_KEY,CREDENTIAL_PREFIX+accountId,
        accountId,JSON.stringify(item),JSON.stringify(encryptedCredential)])
      if(result!==1&&result!=='1')throw error()
      return item
    },
    async listAccounts(){
      const raw=await command(['HGETALL',META_KEY])
      if(!raw||typeof raw!=='object')throw error()
      const entries=Array.isArray(raw)?(()=>{const a=[];for(let i=0;i<raw.length;i+=2)a.push([raw[i],raw[i+1]]);return a})():Object.entries(raw)
      const saved=new Map(entries.map(([id,value])=>[id,metadata(value,id)]))
      return GROWTH_INSTAGRAM_ACCOUNT_TARGETS.map(target=>{
        const stored=saved.get(target.id)
        return {
          id:target.id,label:target.label,network:'instagram',
          connectionState:stored?'connected':'pending_authorization',
          username:stored?.username||target.label.slice(1),
          lastVerifiedAt:stored?.lastVerifiedAt||null,
          expiresAt:stored?.expiresAt||null,
          permissions:stored?.permissions||[],
          publishingEnabled:false,
        }
      })
    },
    async getCredentialEnvelope(accountId){
      if(!ACCOUNT_IDS.has(accountId))throw error()
      const raw=await command(['GET',CREDENTIAL_PREFIX+accountId])
      if(typeof raw!=='string'||raw.length>12000)throw error()
      try{const value=JSON.parse(raw);if(value?.alg!=='A256GCM'||value.v!==1)throw error();return value}catch{throw error()}
    },
    // Server-only provider identity + encrypted token envelope for publisher adapters.
    // Never return this object from a server action or client-facing endpoint.
    async getProviderConnection(accountId){
      if(!ACCOUNT_IDS.has(accountId))throw error()
      const raw=await command(['HGET',META_KEY,accountId])
      if(typeof raw!=='string')throw error()
      const identity=metadata(raw,accountId)
      const envelope=await this.getCredentialEnvelope(accountId)
      return {identity,envelope}
    },
    async disconnect(accountId){
      if(!ACCOUNT_IDS.has(accountId))throw error()
      const result=await command(['EVAL',DISCONNECT,2,META_KEY,CREDENTIAL_PREFIX+accountId,accountId])
      if(result!==1&&result!=='1')throw error()
      return true
    },
  }
}
export function createGrowthInstagramAccountStore({environment=process.env,fetchFn=fetch}={}){
  if(typeof window!=='undefined')return null
  const url=validUrl(environment.PRESCRIPTIONS_KV_REST_API_URL)
  const token=environment.PRESCRIPTIONS_KV_REST_API_TOKEN
  if(!url||typeof token!=='string'||!token.trim()||/[\r\n]/.test(token))return null
  return makeStore(async args=>{
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),TIMEOUT_MS)
    try{
      const response=await fetchFn(url,{method:'POST',headers:{
        Authorization:'Bearer '+token,'Content-Type':'application/json',
      },body:JSON.stringify(args),cache:'no-store',credentials:'omit',redirect:'error',signal:controller.signal})
      if(!response.ok)throw error()
      const body=await response.json()
      if(!body||typeof body!=='object'||body.error||!Object.hasOwn(body,'result'))throw error()
      return body.result
    }catch{throw error()}finally{clearTimeout(timer)}
  })
}
