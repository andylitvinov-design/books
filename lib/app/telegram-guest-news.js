import 'server-only'
import {randomBytes} from 'node:crypto'
import {transaction,consumeRate} from './database.js'
import {seal,operationHash} from './crypto.js'
import {AppError} from '../assessments/contracts.js'
import {PRACTITIONER_ID} from '../../data/app-services.js'
import {telegramClientLinkReady,telegramClientBotUsername} from './client-telegram-policy.js'
import {verifyClientBot} from './client-telegram-transport.js'
import {TG_GUEST_NEWS_CONSENT,validGuestTelegramToken,
 validateGuestNewsOptIn} from './telegram-guest-news-policy.js'

const guestContext=id=>({accountId:PRACTITIONER_ID,recordId:id,
 field:'notification.telegram.guest'})
const tokenHash=(config,token)=>operationHash({scope:'hh-telegram-guest-news-v1',token},config)

/** A guest must positively opt into general educational news. No CRM contact
 * is created, and no welcome, marketing or provider message is sent here.
 */
export async function createGuestNewsLink(config,input,ipBucket,env=process.env){
 let data
 try{data=validateGuestNewsOptIn(input)}
 catch{throw new AppError('GUEST_NEWS_OPT_IN_REQUIRED',400)}
 if(!telegramClientLinkReady(env))throw new AppError('TELEGRAM_NOT_CONFIGURED',503)
 // Hard global ceiling, plus transient keyed per-IP bucket; rate limits are
 // checked before expensive getMe/getWebhookInfo and any database insert.
 await consumeRate(config,{scope:'hh-tg-guest-news-global'},100,3600)
 await consumeRate(config,{scope:'hh-tg-guest-news-ip',ipBucket},4,900)
 await verifyClientBot(env,{requireWebhook:true})
 const token='g_'+randomBytes(22).toString('base64url')
 if(!validGuestTelegramToken(token))throw new AppError('GUEST_NEWS_UNAVAILABLE',503)
 const hash=tokenHash(config,token)
 await transaction(config,null,async db=>{
   // Retain short-lived consent requests at most 48h beyond expiration. A
   // completed subscriber has no FK to requests and is not removed here.
   await db.query(`delete from app_private.notification_telegram_guest_requests
      where id in (select id from app_private.notification_telegram_guest_requests
       where expires_at<now()-interval '48 hours' order by expires_at limit 50)`)
   await db.query(`delete from app_private.notification_telegram_guest_links
      where id in (select id from app_private.notification_telegram_guest_links
       where consent_expires_at<now() order by consent_expires_at limit 50)`)
   await db.query(`insert into app_private.notification_telegram_guest_requests
      (token_hash,locale,consent_version,expires_at)
      values($1,$2,$3,now()+interval '15 minutes')`,
      [hash,data.locale,TG_GUEST_NEWS_CONSENT])
 },{server:true})
 return {token,status:'pending',linkUrl:'https://t.me/'+telegramClientBotUsername(env)+
  '?start='+token}
}
export async function guestNewsStatus(config,token){
 if(!validGuestTelegramToken(token))return 'not_requested'
 const hash=tokenHash(config,token)
 return transaction(config,null,async db=>{
  const row=(await db.query(`select r.id,r.expires_at,r.verified_at,r.stopped_at,
    exists(select 1 from app_private.notification_telegram_guest_links l
       where l.id=r.id and l.chat_hash=r.chat_hash
       and l.consent_version='hh-tg-guest-news-v1'
       and l.consent_expires_at>now()) as linked
    from app_private.notification_telegram_guest_requests r
    where r.token_hash=$1 limit 1`,[hash])).rows[0]
  if(!row)return 'not_requested'
  if(row.stopped_at)return 'stopped'
  if(row.verified_at)return row.linked?'verified':'expired'
  if(new Date(row.expires_at).getTime()<=Date.now())return 'expired'
  return 'pending'
 },{server:true})
}
/** Invoked only after the secret-header-verified Telegram private-chat
 * webhook. Token is one use, with 15-minute expiry and row-level locking.
 */
export async function confirmGuestNewsFromWebhook(config,token,chatId,chatHash){
 if(!validGuestTelegramToken(token)||!/^[1-9][0-9]{4,19}$/.test(chatId)||
    !/^[a-f0-9]{64}$/.test(chatHash))return false
 const hash=tokenHash(config,token)
 return transaction(config,null,async db=>{
  const row=(await db.query(`select id,locale
    from app_private.notification_telegram_guest_requests
    where token_hash=$1 and consent_version=$2
    and expires_at>now() and verified_at is null and stopped_at is null
    for update`,[hash,TG_GUEST_NEWS_CONSENT])).rows[0]
  if(!row)return false
  const encrypted=seal({chatId},guestContext(row.id),config)
  await db.query(`insert into app_private.notification_telegram_guest_links
    (id,chat_hash,chat_ciphertext,locale,consent_version)
    values($1,$2,$3,$4,$5)
    on conflict(chat_hash) do update set
     id=excluded.id,chat_ciphertext=excluded.chat_ciphertext,
     locale=excluded.locale,consent_version=excluded.consent_version,
     verified_at=now(),updated_at=now(),
     consent_expires_at=now()+interval '365 days'`,
    [row.id,chatHash,encrypted,row.locale,TG_GUEST_NEWS_CONSENT])
  await db.query(`update app_private.notification_telegram_guest_requests
    set chat_hash=$2,verified_at=now()
    where id=$1 and verified_at is null`,[row.id,chatHash])
  return true
 },{server:true})
}
/** /stop removes all guest news delivery consent; no sender ever receives the
 * guest's chat ID, and the same token cannot be replayed for a new signup.
 */
export async function stopGuestNewsFromWebhook(config,chatHash){
 if(typeof chatHash!=='string'||!/^[a-f0-9]{64}$/.test(chatHash))return false
 return transaction(config,null,async db=>{
  await db.query(`update app_private.notification_telegram_guest_requests
    set stopped_at=now() where chat_hash=$1 and stopped_at is null`,[chatHash])
  const result=await db.query(
   'delete from app_private.notification_telegram_guest_links where chat_hash=$1',
   [chatHash])
  return result.rowCount>0
 },{server:true})
}
