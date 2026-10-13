import test from 'node:test'
import assert from 'node:assert/strict'
import {createDecipheriv,createECDH,hkdfSync,randomBytes} from 'node:crypto'
import {encryptedPushBody} from '../lib/app/web-push-crypto.js'
import {coursePushPayload} from '../lib/app/notification-contract.js'
test('RFC8291 ciphertext decrypts on the browser subscription key',()=>{
  const user=createECDH('prime256v1');user.generateKeys()
  const auth=randomBytes(16),payload=coursePushPayload('ru')
  const encrypted=encryptedPushBody({
    p256dh:user.getPublicKey().toString('base64url'),auth:auth.toString('base64url')
  },payload)
  const salt=encrypted.subarray(0,16),size=encrypted.readUInt32BE(16),idlen=encrypted[20]
  assert.equal(size,4096);assert.equal(idlen,65)
  const serverPublic=encrypted.subarray(21,21+idlen)
  const keyInfo=Buffer.concat([Buffer.from('WebPush: info\0'),user.getPublicKey(),serverPublic])
  const ikm=Buffer.from(hkdfSync('sha256',user.computeSecret(serverPublic),auth,keyInfo,32))
  const key=Buffer.from(hkdfSync('sha256',ikm,salt,Buffer.from('Content-Encoding: aes128gcm\0'),16))
  const nonce=Buffer.from(hkdfSync('sha256',ikm,salt,Buffer.from('Content-Encoding: nonce\0'),12))
  const cipherText=encrypted.subarray(21+idlen)
  const decipher=createDecipheriv('aes-128-gcm',key,nonce)
  decipher.setAuthTag(cipherText.subarray(-16))
  const clear=Buffer.concat([decipher.update(cipherText.subarray(0,-16)),decipher.final()])
  assert.equal(clear.at(-1),2)
  assert.deepEqual(JSON.parse(clear.subarray(0,-1).toString()),payload)
})
