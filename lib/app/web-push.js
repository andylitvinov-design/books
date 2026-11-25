import 'server-only'
import {createECDH,createPrivateKey,sign} from 'node:crypto'
import {encryptedPushBody} from './web-push-crypto.js'
import {trustedPushEndpoint} from './notification-contract.js'
const b64=x=>Buffer.from(x).toString('base64url')
const bytes=(s,n)=>typeof s==='string' && /^[\w-]+={0,2}$/.test(s) &&
  Buffer.from(s,'base64url').length===n?Buffer.from(s,'base64url'):null
export function pushConfig(env=process.env) {
  const pub=bytes(env.HH_PUSH_PUBLIC_KEY,65),priv=bytes(env.HH_PUSH_PRIVATE_KEY,32)
  let supported=false
  if(pub?.[0]===4 && priv &&
    /^mailto:[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env.HH_PUSH_SUBJECT||'')) {
    try {const check=createECDH('prime256v1');check.setPrivateKey(priv)
      supported=check.getPublicKey().equals(pub)
    } catch {supported=false}
  }
  return {supported,publicKey:supported?env.HH_PUSH_PUBLIC_KEY:null}
}
function authorization(url,env) {
  const pub=bytes(env.HH_PUSH_PUBLIC_KEY,65),priv=bytes(env.HH_PUSH_PRIVATE_KEY,32)
  const key=createPrivateKey({key:{kty:'EC',crv:'P-256',x:b64(pub.subarray(1,33)),
    y:b64(pub.subarray(33)),d:b64(priv)},format:'jwk'})
  const token=b64(JSON.stringify({typ:'JWT',alg:'ES256'}))+'.'+
    b64(JSON.stringify({aud:new URL(url).origin,exp:Math.floor(Date.now()/1000)+3600,
      sub:env.HH_PUSH_SUBJECT}))
  return 'vapid t='+token+'.'+b64(sign('sha256',Buffer.from(token),
    {key,dsaEncoding:'ieee-p1363'}))+', k='+env.HH_PUSH_PUBLIC_KEY
}
export async function sendWebPush(sub,payload,env=process.env) {
  if(!pushConfig(env).supported||!trustedPushEndpoint(sub.endpoint))
    throw new Error('PUSH_NOT_CONFIGURED')
  const response=await fetch(sub.endpoint,{method:'POST',redirect:'error',
    signal:AbortSignal.timeout(8000),body:encryptedPushBody(sub,payload),
    headers:{Authorization:authorization(sub.endpoint,env),
      'Content-Encoding':'aes128gcm','Content-Type':'application/octet-stream',
      TTL:'3600',Urgency:'normal'}})
  return {accepted:[201,202].includes(response.status),expired:[404,410].includes(response.status)}
}
