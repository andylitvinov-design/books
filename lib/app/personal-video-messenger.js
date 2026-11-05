import 'server-only'
import {AppError} from '../assessments/contracts.js'
import {transaction} from './database.js'
import {openSealed,operationHash} from './crypto.js'
import {createPrivateStorageClient} from '../clients/session-delivery-storage.js'
import {personalVideoCloudEnabled} from './personal-videos.js'
import {createMessengerNotificationRepository} from './messenger-notification-repository.js'
import {MESSENGER_CONTACT_NOTICE_VERSION} from './messenger-notification-policy.js'
import {telegramClientLinkReady,telegramPersonalVideoSendReady,telegramClientBotMode} from './client-telegram-policy.js'

const BUCKET='hh-client-private-media'
const MAX_BYTES=12_000_000
const CONSENT='hh-video-telegram-delivery-v1'
const CHAT=/^[1-9][0-9]{4,19}$/
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i

// Feature flags are separate from the existing customer message-alert permission.
export function videoTelegramAvailable(env=process.env){
 return telegramPersonalVideoSendReady(env)
}
function activeBotToken(env=process.env){
 const mode=telegramClientBotMode(env)
 return mode==='dedicated'?env.HH_CLIENT_TG_BOT_TOKEN:
   mode==='shared_practice'?env.HH_PRACTICE_TG_BOT_TOKEN:null
}
function linkedPreferences(link,pref){
 return Boolean(link&&pref?.automatic===true&&pref.chat_hash===link.chat_hash&&
  String(pref.link_verified_at)===String(link.verified_at))
}
const sealContext=accountId=>({accountId,recordId:accountId,field:'notification.telegram.chat'})

export async function videoDeliveryState(config,actor){
 const {link,pref}=await transaction(config,actor,async db=>{
  const link=(await db.query(
   'select chat_hash,verified_at from app_private.notification_telegram_links where account_id=$1',
   [actor.id])).rows[0]||null
  const pref=(await db.query(
   'select automatic,chat_hash,link_verified_at from app_private.personal_video_telegram_preferences where account_id=$1',
   [actor.id])).rows[0]||null
  return {link,pref}
 })
 return {cloudAvailable:personalVideoCloudEnabled(),
  telegram:{linkAvailable:telegramClientLinkReady(),linked:Boolean(link),
   sendingAvailable:videoTelegramAvailable(),automatic:linkedPreferences(link,pref),
   consentSaved:pref?.automatic===true},
  whatsapp:{manualShare:true,automatic:false}}
}

// Reuse the already verified one-use /start bot challenge; do not infer a
// Telegram destination from an OAuth login, username or phone number.
export async function beginVideoTelegramLink(config,actor,locale){
 if(!['en','ru','es'].includes(locale))throw new AppError('INVALID_LOCALE',400)
 if(!telegramClientLinkReady())throw new AppError('TELEGRAM_NOT_CONFIGURED',503)
 const repo=createMessengerNotificationRepository(config)
 // A video-only /start must NOT import the generic notification defaults
 // (messages/booking/reports/courses true). Preserve only actually saved
 // notification preferences; otherwise enroll with every alert topic OFF.
 const stored=await transaction(config,actor,async db=>(await db.query(
  "select topics from app_private.notification_messenger_requests where account_id=$1 and channel='telegram'",
  [actor.id])).rows[0])
 const topics=stored?.topics||{
  messages:false,booking:false,reports:false,courses:false,news:false
 }
 const result=await repo.mutate(actor,{
  action:'begin_telegram',channel:'telegram',locale,
  noticeVersion:MESSENGER_CONTACT_NOTICE_VERSION,permissionAccepted:true,
  topics
 })
 return {linkUrl:result.linkUrl,telegram:{linked:false},expiresIn:900}
}

export async function setVideoTelegramAutomatic(config,actor,{enabled,consent}={}){
 if(typeof enabled!=='boolean'||(enabled&&consent!==true))throw new AppError('CONSENT_REQUIRED',403)
 if(enabled&&!videoTelegramAvailable())throw new AppError('FEATURE_UNAVAILABLE',503)
 await transaction(config,actor,async db=>{
  const link=(await db.query(
   'select chat_hash,verified_at from app_private.notification_telegram_links where account_id=$1',
   [actor.id])).rows[0]
  if(enabled&&!link)throw new AppError('TELEGRAM_NOT_LINKED',409)
  if(!enabled){
   await db.query('update app_private.personal_video_telegram_preferences set automatic=false,updated_at=now() where account_id=$1',
    [actor.id])
   return
  }
  await db.query(`insert into app_private.personal_video_telegram_preferences
   (account_id,automatic,chat_hash,link_verified_at,consent_version,consented_at)
   values($1,true,$2,$3,$4,now())
   on conflict(account_id) do update set automatic=true,chat_hash=excluded.chat_hash,
    link_verified_at=excluded.link_verified_at,consent_version=excluded.consent_version,
    consented_at=now(),updated_at=now()`,
   [actor.id,link.chat_hash,link.verified_at,CONSENT])
 })
 return videoDeliveryState(config,actor)
}

async function finish(config,actor,id,status,providerId=null){
 await transaction(config,actor,db=>db.query(`update app_private.personal_video_telegram_dispatch
  set status=$3,provider_message_id=$4,updated_at=now()
  where video_id=$1 and account_id=$2 and status='claimed'`,
  [id,actor.id,status,providerId]))
}

async function sendTelegramVideo({chatId,blob,locale},env=process.env){
 const token=activeBotToken(env)
 if(!videoTelegramAvailable(env)||!token)throw new AppError('TELEGRAM_NOT_CONFIGURED',503)
 if(typeof chatId!=='string'||!CHAT.test(chatId))throw new AppError('TELEGRAM_INVALID_CHAT',409)
 const form=new FormData()
 form.set('chat_id',chatId)
 form.set('supports_streaming','true')
 form.set('allow_paid_broadcast','false')
 form.set('caption',locale==='ru'?'Ваше личное видео Holistic House':
   locale==='es'?'Tu vídeo privado de Holistic House':'Your private Holistic House video')
 form.set('video',blob,'holistic-house-video.mp4')
 let response,payload
 try{
  response=await fetch('https://api.telegram.org/bot'+encodeURIComponent(token)+'/sendVideo',{
   method:'POST',body:form,redirect:'error',cache:'no-store',
   signal:AbortSignal.timeout(40000)})
  payload=await response.json()
 }catch{throw new AppError('PROVIDER_STATUS_UNKNOWN',503)}
 if(!response.ok||payload?.ok!==true||!Number.isSafeInteger(payload?.result?.message_id))
  throw new AppError('TELEGRAM_PROVIDER_REJECTED',503)
 return String(payload.result.message_id)
}

// Claim the video and recipient in the owner-RLS transaction. An unknown
// provider outcome MUST NOT be retried automatically or sent twice.
export async function deliverPersonalVideoTelegram(config,actor,videoId,{automatic=false,consent=false,locale='en'}={}){
 if(!videoTelegramAvailable())throw new AppError('FEATURE_UNAVAILABLE',503)
 if(typeof videoId!=='string'||!UUID.test(videoId))throw new AppError('NOT_FOUND',404)
 if(typeof automatic!=='boolean'||typeof consent!=='boolean'||!['en','ru','es'].includes(locale))
  throw new AppError('INVALID_DELIVERY_REQUEST',400)
 if(!automatic&&!consent)throw new AppError('CONSENT_REQUIRED',403)
 const claimed=await transaction(config,actor,async db=>{
  const row=(await db.query(`select v.id,v.object_key,v.bytes,v.mime,
   l.chat_hash,l.chat_ciphertext,l.verified_at,p.automatic,p.chat_hash as preference_chat_hash,
   p.link_verified_at
   from app_private.personal_videos v
   join app_private.notification_telegram_links l on l.account_id=v.account_id
   left join app_private.personal_video_telegram_preferences p on p.account_id=v.account_id
   where v.id=$1 and v.account_id=$2 and v.status='ready'
     and v.mime='video/mp4' and v.bytes between 1024 and $3`,
   [videoId,actor.id,MAX_BYTES])).rows[0]
  if(!row)throw new AppError('VIDEO_NOT_READY_OR_TELEGRAM_NOT_LINKED',409)
  if(automatic&&!linkedPreferences({chat_hash:row.chat_hash,verified_at:row.verified_at},
    {automatic:row.automatic,chat_hash:row.preference_chat_hash,link_verified_at:row.link_verified_at}))
   throw new AppError('CONSENT_REQUIRED',403)
  const result=await db.query(`insert into app_private.personal_video_telegram_dispatch
   (video_id,account_id,chat_hash,link_verified_at,mode,status,consent_version)
   values($1,$2,$3,$4,$5,'claimed',$6)
   on conflict(video_id) do nothing returning video_id`,
   [videoId,actor.id,row.chat_hash,row.verified_at,automatic?'automatic':'manual',CONSENT])
  if(!result.rowCount){
   const existing=(await db.query('select status from app_private.personal_video_telegram_dispatch where video_id=$1 and account_id=$2',
    [videoId,actor.id])).rows[0]
   return {duplicate:true,status:existing?.status||'unknown'}
  }
  return {duplicate:false,...row}
 })
 if(claimed.duplicate)return {status:claimed.status,duplicate:true}
 try{
  // Recheck immediately before external transmission; a /stop or relink
  // revokes the destination. Account ownership and ready state are required.
  const allowed=await transaction(config,actor,async db=>(await db.query(`select exists(
   select 1 from app_private.personal_video_telegram_dispatch d
   join app_private.personal_videos v on v.id=d.video_id and v.account_id=d.account_id
   join app_private.notification_telegram_links l on l.account_id=d.account_id
   left join app_private.personal_video_telegram_preferences p on p.account_id=d.account_id
   where d.video_id=$1 and d.account_id=$2 and d.status='claimed'
     and v.status='ready' and l.chat_hash=d.chat_hash
     and l.verified_at=d.link_verified_at
     and (d.mode='manual' or (p.automatic=true and p.chat_hash=l.chat_hash
          and p.link_verified_at=l.verified_at))
  ) as allowed`,[videoId,actor.id])).rows[0]?.allowed)
  if(!allowed){await finish(config,actor,videoId,'suppressed');return {status:'suppressed'}}
  const recipient=openSealed(claimed.chat_ciphertext,sealContext(actor.id),config)?.chatId
  if(typeof recipient!=='string'||!CHAT.test(recipient)||
   operationHash({scope:'hh-client-tg-chat',chatId:recipient},config)!==claimed.chat_hash)
   throw new AppError('TELEGRAM_INVALID_CHAT',409)
  const {data,error}=await createPrivateStorageClient(config).storage.from(BUCKET).download(claimed.object_key)
  if(error||!data||data.size!==Number(claimed.bytes)||data.size>MAX_BYTES||data.size<1024)
   throw new AppError('VIDEO_STORAGE_UNAVAILABLE',503)
  const header=new Uint8Array(await data.slice(0,12).arrayBuffer())
  if(header.length<12||String.fromCharCode(...header.slice(4,8))!=='ftyp')
   throw new AppError('MEDIA_TYPE_NOT_ALLOWED',415)
  // Confirm the owner still wants this send after private storage download.
  // The user may revoke consent, unlink the bot or delete the MP4 in transit.
  const stillAllowed=await transaction(config,actor,async db=>(await db.query(`select exists(
   select 1 from app_private.personal_video_telegram_dispatch d
   join app_private.personal_videos v on v.id=d.video_id and v.account_id=d.account_id
   join app_private.notification_telegram_links l on l.account_id=d.account_id
   left join app_private.personal_video_telegram_preferences p on p.account_id=d.account_id
   where d.video_id=$1 and d.account_id=$2 and d.status='claimed'
     and v.status='ready' and l.chat_hash=d.chat_hash
     and l.verified_at=d.link_verified_at
     and (d.mode='manual' or (p.automatic=true and p.chat_hash=l.chat_hash
          and p.link_verified_at=l.verified_at))
  ) as allowed`,[videoId,actor.id])).rows[0]?.allowed)
  if(!stillAllowed){await finish(config,actor,videoId,'suppressed');return {status:'suppressed'}}
  const providerId=await sendTelegramVideo({chatId:recipient,blob:data,locale})
  await finish(config,actor,videoId,'accepted',providerId)
  return {status:'accepted',duplicate:false}
 }catch{
  // Uncertain provider timeout: no retries; do not expose a destination or
  // file URL to the caller and never log personal content.
  await finish(config,actor,videoId,'failed').catch(()=>{})
  return {status:'unknown',duplicate:false}
 }
}
