// A short-lived same-browser guest capability for ONE encrypted website
// enquiry. Never put the bearer in a URL, analytics, localStorage, or JSON.
// Pure crypto only: external provider access is intentionally absent.
import {createHmac,timingSafeEqual} from 'node:crypto'
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const PREFIX='hh-guest-chat-'
const MAX_AGE=7*24*60*60*1000
const CLOCK_SKEW=5*60*1000
const B64=/^[A-Za-z0-9_-]{50,400}$/

function key(config){
  if(!Buffer.isBuffer(config?.encryptionKey)||config.encryptionKey.length!==32)
    throw new Error('GUEST_CHAT_KEY_UNAVAILABLE')
  return createHmac('sha256',config.encryptionKey).update('holistic-house:public-enquiry-guest-chat:v1').digest()
}
function sign(encoded,config){
  return createHmac('sha256',key(config)).update('g1.'+encoded).digest('base64url')
}
export function guestChatCookieName(id){
  if(!UUID.test(String(id||'')))throw new Error('INVALID_GUEST_CHAT_ID')
  return PREFIX+id.toLowerCase()
}
export function issueGuestEnquiryCapability({enquiryId,operationId,createdAt},config,now=Date.now()){
  if(!UUID.test(String(enquiryId||''))||!UUID.test(String(operationId||'')))
    throw new Error('INVALID_GUEST_CHAT_ID')
  const created=Date.parse(createdAt)
  if(!Number.isFinite(created)||created>now+CLOCK_SKEW||created<now-MAX_AGE)
    throw new Error('INVALID_GUEST_CHAT_TIME')
  const expires=created+MAX_AGE
  if(expires<=now)throw new Error('GUEST_CHAT_EXPIRED')
  const payload=Buffer.from(JSON.stringify({
    enquiryId:enquiryId.toLowerCase(),operationId:operationId.toLowerCase(),expires,
  })).toString('base64url')
  return {token:'g1.'+payload+'.'+sign(payload,config),
    maxAge:Math.max(1,Math.floor((expires-now)/1000))}
}
export function verifyGuestEnquiryCapability(raw,enquiryId,config,now=Date.now()){
  if(!UUID.test(String(enquiryId||''))||typeof raw!=='string'||raw.length>520)
    return null
  const parts=raw.split('.')
  if(parts.length!==3||parts[0]!=='g1'||!B64.test(parts[1])||
     !/^[A-Za-z0-9_-]{43}$/.test(parts[2]))return null
  let expected
  try{expected=sign(parts[1],config)}catch{return null}
  const a=Buffer.from(expected),b=Buffer.from(parts[2])
  if(a.length!==b.length||!timingSafeEqual(a,b))return null
  try{
    const payload=JSON.parse(Buffer.from(parts[1],'base64url').toString('utf8'))
    if(!payload||typeof payload!=='object'||Array.isArray(payload)||
       Object.keys(payload).sort().join(',')!=='enquiryId,expires,operationId'||
       !UUID.test(payload.enquiryId)||!UUID.test(payload.operationId)||
       payload.enquiryId!==enquiryId.toLowerCase()||
       !Number.isSafeInteger(payload.expires)||
       payload.expires<=now||payload.expires>now+MAX_AGE+CLOCK_SKEW)return null
    return {enquiryId:payload.enquiryId,operationId:payload.operationId,expires:payload.expires}
  }catch{return null}
}
