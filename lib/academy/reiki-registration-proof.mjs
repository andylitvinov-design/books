import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

export const REIKI_REGISTRATION_NOTICE = 'reiki-crm-registration-v1'
export const REIKI_RETRY_COOKIE = 'hh-reiki-registration-retry'
export const REIKI_JOIN_TTL = 15 * 60
export const REIKI_RETRY_TTL = 7 * 24 * 60 * 60
const locales = new Set(['en','ru','es'])
const noncePattern = /^[a-f0-9]{32}$/
const normalize = email => typeof email === 'string' ? email.trim().toLowerCase() : ''

function sign(config, fields) {
  return createHmac('sha256',config.encryptionKey).update(JSON.stringify(['hh-reiki-registration-v1',...fields])).digest('hex')
}
function matches(left,right) {
  return typeof left==='string' && /^[a-f0-9]{64}$/.test(left) &&
    timingSafeEqual(Buffer.from(left,'hex'),Buffer.from(right,'hex'))
}
function readProof(value,now,ttl) {
  if(typeof value!=='string'||value.length>160)return null
  const [version,locale,stamp,signature,...extra]=value.split('.')
  const time=Number(stamp)
  if(extra.length||version!=='v1'||!locales.has(locale)||!/^\d{13}$/.test(stamp||'')||
    !Number.isSafeInteger(time)||time>now+10000||now-time>ttl*1000)return null
  return {locale,time,signature}
}
export function reikiJoinCookieName(nonce) {
  return noncePattern.test(nonce||'') ? 'hh-reiki-registration-'+nonce : null
}
export function createReikiJoinIntent(locale,config,now=Date.now()) {
  if(!locales.has(locale))throw new Error('INVALID_REIKI_REGISTRATION_LOCALE')
  const nonce=randomBytes(16).toString('hex')
  return {nonce,cookieName:reikiJoinCookieName(nonce),value:['v1',locale,now,sign(config,['start',nonce,locale,now])].join('.')}
}
export function verifyReikiJoinIntent(nonce,value,config,now=Date.now()) {
  if(!reikiJoinCookieName(nonce))return null
  const proof=readProof(value,now,REIKI_JOIN_TTL)
  if(!proof||!matches(proof.signature,sign(config,['start',nonce,proof.locale,proof.time])))return null
  return proof.locale
}
export function verifiedReikiGoogleEmail(actor,identities) {
  const email=normalize(actor?.email)
  if(!email||email.length>254||!email.includes('@')||!Array.isArray(identities))return null
  const match=identities.find(identity=>identity?.provider==='google' &&
    identity.identity_data?.email_verified===true && normalize(identity.identity_data.email)===email)
  return match ? email : null
}
export function createReikiRetryProof(actor,locale,config,now=Date.now()) {
  if(!locales.has(locale)||!actor?.id||!normalize(actor.email))throw new Error('INVALID_REIKI_RETRY')
  return ['v1',locale,now,sign(config,['retry',actor.id,normalize(actor.email),locale,now])].join('.')
}
export function verifyReikiRetryProof(actor,value,config,now=Date.now()) {
  if(!actor?.id||!normalize(actor.email))return null
  const proof=readProof(value,now,REIKI_RETRY_TTL)
  if(!proof||!matches(proof.signature,sign(config,['retry',actor.id,normalize(actor.email),proof.locale,proof.time])))return null
  return proof.locale
}
