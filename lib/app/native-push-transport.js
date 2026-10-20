import 'server-only'
import {createPrivateKey,sign} from 'node:crypto'
import {connect as connectHttp2} from 'node:http2'
const encode=value=>Buffer.from(JSON.stringify(value)).toString('base64url')
const tokenPattern=/^[A-Za-z0-9_:.\-]{40,2048}$/
const apnsPattern=/^[0-9a-f]{32,512}$/i
function keyInfo(env,kind){
  if(kind==='ios'){
    const key=env.HH_NATIVE_APNS_PRIVATE_KEY?.replace(/\\n/g,'\n')
    const keyId=env.HH_NATIVE_APNS_KEY_ID,team=env.HH_NATIVE_APNS_TEAM_ID
    let ready=false
    if(/^[A-Z0-9]{10}$/.test(keyId||'')&&/^[A-Z0-9]{10}$/.test(team||'')&&key){
      try{ready=createPrivateKey(key).asymmetricKeyType==='ec'}catch{}
    }
    return {ready,kind,key,keyId,team}
  }
  if(kind==='android'){
    const key=env.HH_FCM_PRIVATE_KEY?.replace(/\\n/g,'\n')
    const project=env.HH_FCM_PROJECT_ID,email=env.HH_FCM_CLIENT_EMAIL
    let ready=false
    if(/^[a-z][a-z0-9-]{4,70}$/.test(project||'')&&
       /^[a-z0-9_.-]+@[a-z0-9.-]+\.iam\.gserviceaccount\.com$/.test(email||'')&&key){
      try{ready=createPrivateKey(key).asymmetricKeyType==='rsa'}catch{}
    }
    return {ready,kind,key,email,project}
  }
  return {ready:false,kind}
}
export function nativePushReady(env=process.env,platform){
  return keyInfo(env,platform).ready
}
export function nativeTokenValid(platform,token){
  return typeof token==='string' && (platform==='ios'?apnsPattern:platform==='android'?tokenPattern:/^$/).test(token)
}
function apnsAuth(cfg,at=Date.now()){
  const header=encode({alg:'ES256',kid:cfg.keyId})
  const payload=encode({iss:cfg.team,iat:Math.floor(at/1000)})
  const unsigned=header+'.'+payload
  return unsigned+'.'+sign('sha256',Buffer.from(unsigned),
    {key:createPrivateKey(cfg.key),dsaEncoding:'ieee-p1363'}).toString('base64url')
}
function sendAPNs(token,payload,env){
  const cfg=keyInfo(env,'ios')
  if(!cfg.ready||!nativeTokenValid('ios',token))throw new Error('NATIVE_APNS_NOT_READY')
  const sandbox=env.HH_NATIVE_APNS_ENV==='sandbox'
  const host=sandbox?'https://api.sandbox.push.apple.com':'https://api.push.apple.com'
  const body=JSON.stringify({
    aps:{alert:{title:'Holistic House',body:payload.locale==='ru'
      ?'У вас новое личное сообщение. Откройте приложение, чтобы прочитать.'
      :'You have a new private message. Open the app to read it.'}},
    kind:'client-message',requestId:payload.requestId,locale:payload.locale,
  })
  return new Promise((resolve,reject)=>{
    const client=connectHttp2(host)
    let status=0,done=false
    const settle=(error,result)=>{
      if(done)return
      done=true;client.close()
      if(error)reject(error);else resolve(result)
    }
    client.setTimeout(8500,()=>settle(new Error('APNS_TIMEOUT')))
    client.on('error',settle)
    const stream=client.request({
      ':method':'POST',':path':'/3/device/'+token,
      authorization:'bearer '+apnsAuth(cfg),
      'apns-topic':'com.holistichouse.app',
      'apns-push-type':'alert','apns-priority':'5',
      'apns-expiration':String(Math.floor(Date.now()/1000)+3600),
      'apns-collapse-id':payload.requestId,
      'content-type':'application/json',
    })
    stream.on('response',headers=>{status=Number(headers[':status']||0)})
    stream.on('error',settle)
    stream.on('data',()=>{}) // No provider body or token ever logged.
    stream.on('end',()=>settle(null,{accepted:status===200,
      expired:status===410, status}))
    stream.end(body)
  })
}
let fcmCache=null
async function fcmAccessToken(cfg,fetcher){
  const now=Date.now()
  if(fcmCache?.email===cfg.email&&fcmCache.validUntil>now) return fcmCache.accessToken
  const request=encode({alg:'RS256',typ:'JWT'})+'.'+encode({
    iss:cfg.email,
    scope:'https://www.googleapis.com/auth/firebase.messaging',
    aud:'https://oauth2.googleapis.com/token',
    iat:Math.floor(now/1000),exp:Math.floor(now/1000)+3000,
  })
  const assertion=request+'.'+sign('RSA-SHA256',Buffer.from(request),createPrivateKey(cfg.key)).toString('base64url')
  const reply=await fetcher('https://oauth2.googleapis.com/token',{
    method:'POST',redirect:'error',signal:AbortSignal.timeout(8000),
    headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion}),
  })
  if(!reply.ok)throw new Error('FCM_AUTH_UNAVAILABLE')
  const data=await reply.json()
  if(typeof data.access_token!=='string'||data.access_token.length>4096||
    !Number.isFinite(Number(data.expires_in))||Number(data.expires_in)<120)
    throw new Error('FCM_AUTH_UNAVAILABLE')
  fcmCache={email:cfg.email,accessToken:data.access_token,
    validUntil:now+Math.min(2400000,Number(data.expires_in)*1000-90000)}
  return data.access_token
}
async function sendFCM(token,payload,env,fetcher=fetch){
  const cfg=keyInfo(env,'android')
  if(!cfg.ready||!nativeTokenValid('android',token))throw new Error('NATIVE_FCM_NOT_READY')
  const access=await fcmAccessToken(cfg,fetcher)
  const response=await fetcher('https://fcm.googleapis.com/v1/projects/'+cfg.project+'/messages:send',{
    method:'POST',redirect:'error',signal:AbortSignal.timeout(8000),
    headers:{'Authorization':'Bearer '+access,'Content-Type':'application/json'},
    body:JSON.stringify({message:{
      token,
      notification:{title:'Holistic House',body:payload.locale==='ru'
        ?'У вас новое личное сообщение. Откройте приложение, чтобы прочитать.'
        :'You have a new private message. Open the app to read it.'},
      data:{kind:'client-message',requestId:payload.requestId,locale:payload.locale},
      android:{priority:'NORMAL',ttl:'3600s',
        notification:{channel_id:'hh_private_messages',tag:payload.requestId}},
    }}),
  })
  // Only FCM's UNREGISTERED response/revoked registration is a definite invalid token.
  return {accepted:response.status===200,expired:response.status===404||response.status===410,
    status:response.status}
}
export async function sendNativeClientPush(device,payload,env=process.env,fetcher=fetch){
  if(device.platform==='ios')return sendAPNs(device.token,payload,env)
  if(device.platform==='android')return sendFCM(device.token,payload,env,fetcher)
  throw new Error('INVALID_NATIVE_PLATFORM')
}
