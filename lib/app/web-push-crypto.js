import {createCipheriv,createECDH,hkdfSync,randomBytes} from 'node:crypto'
const bytes=(s,n)=>typeof s==='string' && /^[\w-]+={0,2}$/.test(s) &&
  Buffer.from(s,'base64url').length===n?Buffer.from(s,'base64url'):null
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
