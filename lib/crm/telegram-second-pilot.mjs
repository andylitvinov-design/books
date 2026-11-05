import { createHmac, timingSafeEqual } from 'node:crypto'
import { channelTransportReady, telegramPilotReady, telegramBotBusinessId } from './messenger-policy.js'

// One invited second private chat, with a short-lived link and one-day pilot
// permission. The link alone never creates a CRM contact or marketing consent.
export const TELEGRAM_SECOND_PILOT_ACCESS_MS = 24 * 60 * 60 * 1000
const INVITE_MINUTES = 15
const OWNER = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const INVITE = /^\/start(?:@[A-Za-z0-9_]{5,32})?\s+hhpilot_(en|ru|es)_([0-9a-z]{4,10})_([A-Za-z0-9_-]{24})$/i

function available(ownerId,config,env) {
  if(!OWNER.test(String(ownerId||'')) || !config?.encryptionKey ||
    !telegramPilotReady(env) || !channelTransportReady('telegram',env))return null
  const businessId=telegramBotBusinessId(env)
  const username=String(env.HH_CRM_MSG_TELEGRAM_USERNAME||'').replace(/^@/,'')
  if(!businessId || !/^[A-Za-z0-9_]{5,32}$/.test(username) || !/bot$/i.test(username))return null
  return {businessId,username}
}
function signature(ownerId,businessId,locale,expiryMinutes,config) {
  return createHmac('sha256',config.encryptionKey)
    .update('hh-tg-second-account-pilot:v1:'+ownerId+':'+businessId+':'+locale+':'+expiryMinutes)
    .digest('base64url').slice(0,24)
}
export function telegramSecondAccountInvite({ownerId,locale='ru',config,env=process.env,now=Date.now()}) {
  const bot=available(ownerId,config,env)
  if(!bot||!['en','ru','es'].includes(locale)||!Number.isFinite(now))return null
  const expiryMinutes=Math.floor(now/60000)+INVITE_MINUTES
  const suffix=locale+'_'+expiryMinutes.toString(36)+'_'+signature(ownerId,bot.businessId,locale,expiryMinutes,config)
  return {url:'https://t.me/'+bot.username+'?start=hhpilot_'+suffix,
    expiresAt:new Date(expiryMinutes*60000).toISOString()}
}
export function verifyTelegramSecondAccountInvite(raw,{ownerId,config,env=process.env,now=Date.now()}) {
  const bot=available(ownerId,config,env)
  const match=INVITE.exec(String(raw||'').trim())
  if(!bot||!match||!Number.isFinite(now))return null
  const locale=match[1].toLowerCase()
  const expiryMinutes=Number.parseInt(match[2],36)
  const currentMinutes=Math.floor(now/60000)
  if(!Number.isSafeInteger(expiryMinutes)||expiryMinutes<=currentMinutes ||
     expiryMinutes>currentMinutes+INVITE_MINUTES)return null
  const expected=signature(ownerId,bot.businessId,locale,expiryMinutes,config)
  const supplied=match[3]
  if(supplied.length!==expected.length ||
     !timingSafeEqual(Buffer.from(supplied,'ascii'),Buffer.from(expected,'ascii')))return null
  return {locale,accessUntil:new Date(now+TELEGRAM_SECOND_PILOT_ACCESS_MS).toISOString()}
}
