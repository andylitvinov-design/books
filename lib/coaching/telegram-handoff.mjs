// Short-lived, opaque, single-use continuation from the customer's private
// Telegram conversation to a separately consented first-party coaching form.
// No Telegram IDs, name, answers or health data are readable from the URL.
import { createHmac, createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
const ID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i
const LOCALES=new Set(['en','ru','es'])
const TOPICS=new Set(['business','wellbeing','relationships','other'])
const AAD=Buffer.from('hh:telegram-coaching-handoff:1')
const MAX_AGE=60*60*1000
function keyOf(config){
  if(!Buffer.isBuffer(config?.encryptionKey)||config.encryptionKey.length!==32)
    throw new Error('HANDOFF_CONFIGURATION_UNAVAILABLE')
  return createHmac('sha256',config.encryptionKey).update(AAD).digest()
}
function valid(value){return !!value&&ID.test(value.ownerId)&&ID.test(value.threadId)&&
  LOCALES.has(value.locale)&&TOPICS.has(value.topic)&&
  typeof value.nonce==='string'&&/^[a-f0-9]{32}$/.test(value.nonce)&&
  Number.isSafeInteger(value.expires)}
export function issueTelegramCoachingHandoff({ownerId,threadId,locale,topic},config,now=Date.now()){
  const value={ownerId,threadId,locale,topic,nonce:randomBytes(16).toString('hex'),
    expires:now+MAX_AGE}
  if(!valid(value))throw new Error('INVALID_TELEGRAM_HANDOFF')
  const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',keyOf(config),iv)
  cipher.setAAD(AAD)
  const data=Buffer.concat([cipher.update(JSON.stringify(value),'utf8'),cipher.final()])
  return 'h1.'+Buffer.concat([iv,cipher.getAuthTag(),data]).toString('base64url')
}
export function verifyTelegramCoachingHandoff(raw,config,now=Date.now()){
  if(typeof raw!=='string'||!/^h1\.[A-Za-z0-9_-]{75,800}$/.test(raw))return null
  try{
    const bytes=Buffer.from(raw.slice(3),'base64url')
    if(bytes.length<30||bytes.length>700)return null
    const cipher=createDecipheriv('aes-256-gcm',keyOf(config),bytes.subarray(0,12))
    cipher.setAAD(AAD);cipher.setAuthTag(bytes.subarray(12,28))
    const data=JSON.parse(Buffer.concat([
      cipher.update(bytes.subarray(28)),cipher.final()]).toString('utf8'))
    if(!valid(data)||data.expires<now||data.expires>now+MAX_AGE)return null
    if(Object.keys(data).sort().join(',')!=='expires,locale,nonce,ownerId,threadId,topic')
      return null
    return {...data,digest:createHmac('sha256',config.encryptionKey)
      .update('coaching-handoff:'+data.nonce).digest('hex')}
  }catch{return null}
}
