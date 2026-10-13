import 'server-only'
import {createCipheriv,createECDH,createPrivateKey,hkdfSync,randomBytes,sign} from 'node:crypto'
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
export function encryptedPushBody(sub,payload) {
  const receiver=bytes(sub.p256dh,65),auth=bytes(sub.auth,16)
  if(!receiver||receiver[0]!==4||!auth)throw new Error('INVALID_PUSH_KEYS')
  const sender=createECDH('prime256v1');sender.generateKeys()
  const senderPublic=sender.getPublicKey()
  const secret=sender.computeSecret(receiver)
  const info=Buffer.concat([Buffer.from('WebPush: info\0'),receiver,senderPublic])
  const ikm=Buffer.from(hkdfSync('sha256',secret,auth,info,32))
  const salt=randomBytes(16)
  const key=Buffer.from(hkdfSync('sha256',ikm,salt,Buffer.from('Content-Encoding: aes128gcm\0'),16))
  const nonce=Buffer.from(hkdfSync('sha256',ikm,salt,Buffer.from('Content-Encoding: nonce\0'),12))
  const message=Buffer.from(JSON.stringify(payload),'utf8')
  if(message.length>2200)throw new Error('PUSH_TOO_LONG')
  const cipher=createCipheriv('aes-128-gcm',key,nonce)
  const encrypted=Buffer.concat([cipher.update(Buffer.concat([message,Buffer.from([2])])),
    cipher.final(),cipher.getAuthTag()])
  const header=Buffer.alloc(21);salt.copy(header);header.writeUInt32BE(4096,16)
  header[20]=senderPublic.length
  return Buffer.concat([header,senderPublic,encrypted])
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
