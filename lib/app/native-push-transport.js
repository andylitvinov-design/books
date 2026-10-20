import 'server-only'
import {createPrivateKey,createHash,sign} from 'node:crypto'
import {connect as connectHttp2} from 'node:http2'
import {clientMessagePushPayload} from './notification-contract.js'
const encode=value=>Buffer.from(JSON.stringify(value)).toString('base64url')
const tokenPattern=/^[A-Za-z0-9_:.\-]{40,2048}$/
const apnsPattern=/^[0-9a-f]{32,512}$/i
function keyInfo(env,kind){
  if(kind==='ios'){
    const key=env.HH_NATIVE_APNS_PRIVATE_KEY?.replace(/\\n/g,'\n')
    const keyId=env.HH_NATIVE_APNS_KEY_ID,team=env.HH_NATIVE_APNS_TEAM_ID
    let ready=false
    if(/^[A-Z0-9]{10}$/.test(keyId||'')&&/^[A-Z0-9]{10}$/.test(team||'')&&key&&
       ['sandbox','production'].includes(env.HH_NATIVE_APNS_ENV)){
      try{const parsed=createPrivateKey(key);ready=parsed.asymmetricKeyType==='ec'&&
        parsed.asymmetricKeyDetails?.namedCurve==='prime256v1'}catch{}
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
export function nativePushReady(env=process.env,platform){return keyInfo(env,platform).ready}
export function nativeTokenValid(platform,token){
  if(typeof token!=='string')return false
  if(platform==='ios')return token.length%2===0&&apnsPattern.test(token)
  return platform==='android'&&tokenPattern.test(token)
}
function apnsAuth(cfg,at=Date.now()){
  const unsigned=encode({alg:'ES256',kid:cfg.keyId})+'.'+encode({iss:cfg.team,iat:Math.floor(at/1000)})
  return unsigned+'.'+sign('sha256',Buffer.from(unsigned),
    {key:createPrivateKey(cfg.key),dsaEncoding:'ieee-p1363'}).toString('base64url')
}
function sendAPNs(token,payload,env,connect=connectHttp2){
  const cfg=keyInfo(env,'ios')
  if(!cfg.ready||!nativeTokenValid('ios',token))throw new Error('NATIVE_APNS_NOT_READY')
  const host=env.HH_NATIVE_APNS_ENV==='sandbox'?'https://api.sandbox.push.apple.com':'https://api.push.apple.com'
  const body=JSON.stringify({
    aps:{alert:{title:'Holistic House',body:payload.locale==='ru'
      ?'У вас новое личное сообщение. Откройте приложение, чтобы прочитать.'
      :'You have a new private message. Open the app to read it.'}},
    kind:'client-message',requestId:payload.requestId,locale:payload.locale,
  })
  return new Promise((resolve,reject)=>{
    let client,stream,timer,done=false,status=0
    const settle=(error,result)=>{
      if(done)return
      done=true;clearTimeout(timer)
      // close() alone can leave a timed-out HTTP/2 stream alive.
      try{stream?.close()}catch{}
      try{client?.destroy()}catch{}
      if(error)reject(new Error('APNS_DELIVERY_UNAVAILABLE'));else resolve(result)
    }
    try{
      client=connect(host)
      timer=setTimeout(()=>settle(new Error('APNS_TIMEOUT')),8500)
      client.on('error',error=>settle(error))
      stream=client.request({
        ':method':'POST',':path':'/3/device/'+token,
        authorization:'bearer '+apnsAuth(cfg),'apns-topic':'com.holistichouse.app',
        'apns-push-type':'alert','apns-priority':'10',
        'apns-expiration':String(Math.floor(Date.now()/1000)+3600),
        'apns-collapse-id':payload.requestId,'content-type':'application/json',
      })
      stream.on('response',headers=>{status=Number(headers[':status']||0)})
      stream.on('error',error=>settle(error))
      stream.on('data',()=>{})
      stream.on('end',()=>settle(null,{accepted:status===200,expired:status===410,status}))
      stream.end(body)
    }catch(error){settle(error)}
  })
}
let fcmCache=null
async function fcmAccessToken(cfg,fetcher){
  const now=Date.now()
  const identity=createHash('sha256').update(cfg.email+'\n'+cfg.project+'\n'+cfg.key).digest('hex')
  if(fcmCache?.identity===identity&&fcmCache.validUntil>now)return fcmCache.accessToken
  const request=encode({alg:'RS256',typ:'JWT'})+'.'+encode({
    iss:cfg.email,scope:'https://www.googleapis.com/auth/firebase.messaging',
    aud:'https://oauth2.googleapis.com/token',iat:Math.floor(now/1000),exp:Math.floor(now/1000)+3000,
  })
  const assertion=request+'.'+sign('RSA-SHA256',Buffer.from(request),createPrivateKey(cfg.key)).toString('base64url')
  const reply=await fetcher('https://oauth2.googleapis.com/token',{
    method:'POST',redirect:'error',signal:AbortSignal.timeout(8000),
    headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion}),
  })
  if(!reply.ok)throw new Error('FCM_AUTH_UNAVAILABLE')
  const data=await reply.json()
  if(typeof data.access_token!=='string'||!data.access_token||data.access_token.length>4096||
    !Number.isFinite(Number(data.expires_in))||Number(data.expires_in)<120)
    throw new Error('FCM_AUTH_UNAVAILABLE')
  fcmCache={identity,accessToken:data.access_token,
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
      token,notification:{title:'Holistic House',body:payload.locale==='ru'
        ?'У вас новое личное сообщение. Откройте приложение, чтобы прочитать.'
        :'You have a new private message. Open the app to read it.'},
      data:{kind:'client-message',requestId:payload.requestId,locale:payload.locale},
      android:{priority:'HIGH',ttl:'3600s',notification:{channel_id:'hh_private_messages',tag:payload.requestId}},
    }}),
  })
  let expired=false
  if(response.status!==200){
    try{
      const data=await response.json()
      expired=response.status===404&&Array.isArray(data?.error?.details)&&
        data.error.details.some(detail=>detail?.['@type']==='type.googleapis.com/google.firebase.fcm.v1.FcmError'&&
          detail.errorCode==='UNREGISTERED')
    }catch{/* Unknown provider errors must not be mistaken for revoked tokens. */}
  }
  return {accepted:response.status===200,expired,status:response.status}
}
export async function sendNativeClientPush(device,payload,env=process.env,fetcher=fetch,connect=connectHttp2){
  if(payload?.kind!=='client-message')throw new Error('INVALID_NATIVE_MESSAGE')
  const safe=clientMessagePushPayload(payload.locale,payload.requestId)
  if(device.platform==='ios')return sendAPNs(device.token,safe,env,connect)
  if(device.platform==='android')return sendFCM(device.token,safe,env,fetcher)
  throw new Error('INVALID_NATIVE_PLATFORM')
}
