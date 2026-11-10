import 'server-only'
import {randomBytes} from 'node:crypto'
import {transaction} from './database.js'
import {seal,openSealed,operationHash} from './crypto.js'
import {AppError} from '../assessments/contracts.js'
import {telegramClientLinkReady,telegramClientSendReady,telegramClientStartLink} from './client-telegram-policy.js'
import {verifyClientBot} from './client-telegram-transport.js'
import {telegramBotBusinessId,telegramPublicDiagnosticReady,channelTransportReady} from '../crm/messenger-policy.js'
import {businessHash} from '../crm/messenger-store.js'
import {
 MESSENGER_NOTIFICATION_CHANNELS,DEFAULT_MESSENGER_TOPICS,
 validateMessengerNotificationInput,maskMessengerDestination,
 normalizeMessengerTopics,
} from './messenger-notification-policy.js'

// This repository ONLY stores unverified preferences. It never delivers or links a Telegram chat ID.
const verifiedChatContext=accountId=>({accountId,recordId:accountId,field:'notification.telegram.chat'})
const crmBotAvailable=()=>telegramPublicDiagnosticReady()&&channelTransportReady('telegram')&&!!telegramBotBusinessId()
// Migration may be rolling out while this app version is already serving.
// Fail closed for optional CRM identity linking; keep verified notification chats intact.
const crmIdentitySchemaReady=async db=>{
 const row=(await db.query(
   "select pg_catalog.to_regclass('app_private.crm_google_telegram_links') is not null as table_ready, "+
   "pg_catalog.to_regprocedure('app_private.crm_google_link_verified_self(text,text,text)') is not null as function_ready"
 )).rows[0]
 return row?.table_ready===true&&row.function_ready===true
}
const encryptionContext=(accountId,channel)=>({
 accountId,recordId:accountId,field:'notification.'+channel,
})
async function ensureAccount(db,accountId,lock=false){
 const row=(await db.query('select status,onboarding_state from app.accounts where id=$1'+
   (lock?' for update':''),[accountId])).rows[0]
 if(row?.status!=='active'||row.onboarding_state!=='active')
   throw new AppError('ACCOUNT_UNAVAILABLE',403)
}
function stateFromRows(rows,links,actor,config,env){
 const channels=Object.fromEntries(MESSENGER_NOTIFICATION_CHANNELS.map(channel=>[channel,{
   status:'not_connected',destinationHint:'',topics:{...DEFAULT_MESSENGER_TOPICS},
 }]))
 for(const row of rows){
   if(!MESSENGER_NOTIFICATION_CHANNELS.includes(row.channel))continue
   const contact=openSealed(row.destination_ciphertext,encryptionContext(actor.id,row.channel),config)
   channels[row.channel]={
     status:'pending',destinationHint:row.channel==='telegram'&&contact?.destination==='@PendingLink'
       ?'Telegram bot':maskMessengerDestination(row.channel,contact?.destination),
     topics:normalizeMessengerTopics(row.topics),
     updatedAt:row.updated_at,
   }
 }
 if(links.length){
   channels.telegram={...channels.telegram,status:'connected',
     destinationHint:'Telegram verified',verifiedAt:links[0].verified_at}
 }
 return {channels,sendingEnabled:telegramClientSendReady(env),
   verificationAvailable:telegramClientLinkReady(env),
   phase:'verified_linking'}
}
export function createMessengerNotificationRepository(config){
 const state=async actor=>transaction(config,actor,async db=>{
   await ensureAccount(db,actor.id)
   const rows=(await db.query('select channel,destination_ciphertext,topics,updated_at '+
     'from app_private.notification_messenger_requests where account_id=$1 order by channel',
     [actor.id])).rows
   const links=(await db.query('select verified_at,chat_hash from app_private.notification_telegram_links '+
     'where account_id=$1',[actor.id])).rows
   const crmReady=crmBotAvailable()&&await crmIdentitySchemaReady(db)
   const botHash=crmReady?businessHash('telegram',telegramBotBusinessId(),config):null
   const crmLinked=crmReady&&links.length>0&&(await db.query(
     'select 1 from app_private.crm_google_telegram_links where account_id=$1 and chat_hash=$2 and crm_bot_hash=$3 limit 1',
     [actor.id,links[0].chat_hash,botHash])).rowCount>0
   return {...stateFromRows(rows,links,actor,config,process.env),
     crmLinkAvailable:crmReady,crmLinked:Boolean(crmLinked)}
 })
 const mutate=async(actor,raw)=>{
   let input
   try{input=validateMessengerNotificationInput(raw)}
   catch{throw new AppError('INVALID_MESSENGER_NOTIFICATION_REQUEST',400)}
   if(input.action==='link_crm'){
     if(!crmBotAvailable())throw new AppError('CRM_TELEGRAM_NOT_AVAILABLE',503)
     const botHash=businessHash('telegram',telegramBotBusinessId(),config)
     await transaction(config,actor,async db=>{
       await ensureAccount(db,actor.id,true)
       if(!(await crmIdentitySchemaReady(db)))throw new AppError('CRM_LINK_NOT_READY',503)
       const verified=(await db.query(
         'select chat_hash,chat_ciphertext from app_private.notification_telegram_links where account_id=$1 for update',
         [actor.id])).rows[0]
       if(!verified)throw new AppError('TELEGRAM_NOT_VERIFIED',409)
       const chatId=openSealed(verified.chat_ciphertext,verifiedChatContext(actor.id),config)?.chatId
       if(!/^[1-9][0-9]{4,19}$/.test(String(chatId||''))||
         operationHash({scope:'hh-client-tg-chat',chatId:String(chatId)},config)!==verified.chat_hash)
         throw new AppError('TELEGRAM_IDENTITY_INVALID',409)
       const userHash=operationHash({scope:'crm-msg-user',provider:'telegram',
         accountDigest:botHash,userId:String(chatId)},config)
       const claimed=(await db.query(
         'select app_private.crm_google_link_verified_self($1,$2,$3) as linked',
         [verified.chat_hash,botHash,userHash])).rows[0]
       if(claimed?.linked!==true)throw new AppError('CRM_IDENTITY_LINK_CONFLICT',409)
     })
     return state(actor)
   }
   if(input.action==='unlink_crm'){
     await transaction(config,actor,async db=>{
       await ensureAccount(db,actor.id,true)
       if(await crmIdentitySchemaReady(db))
         await db.query('delete from app_private.crm_google_telegram_links where account_id=$1',[actor.id])
     })
     return state(actor)
   }
   if(input.action==='begin_telegram'){
     if(!telegramClientLinkReady())throw new AppError('TELEGRAM_NOT_CONFIGURED',503)
     // Prevent a wrong bot username from receiving a sensitive linking challenge.
     await verifyClientBot(process.env,{requireWebhook:true})
     const token=randomBytes(24).toString('base64url')
     const linkUrl=telegramClientStartLink(token)
     const hash=operationHash({scope:'hh-client-telegram-link',token},config)
     await transaction(config,actor,async db=>{
       await ensureAccount(db,actor.id,true)
       const placeholder=seal({destination:'@PendingLink'},
         encryptionContext(actor.id,'telegram'),config)
       await db.query(`insert into app_private.notification_messenger_requests
         (account_id,channel,destination_ciphertext,topics,locale,consent_version)
         values($1,'telegram',$2,$3::jsonb,$4,$5)
         on conflict(account_id,channel) do update set
         topics=excluded.topics,locale=excluded.locale,
         consent_version=excluded.consent_version,updated_at=now()`,
         [actor.id,placeholder,JSON.stringify(input.topics),input.locale,input.noticeVersion])
       // Do not revoke an already verified link on an unconfirmed reconnect.
       // The one-time challenge merely stages a replacement. The verified
       // Telegram webhook atomically swaps the recipient after /start succeeds.
       // Explicit Disconnect or Telegram /stop remains the revocation path.
       await db.query(`insert into app_private.notification_telegram_challenges(account_id,token_hash,expires_at)
         values($1,$2,now()+interval '15 minutes') on conflict(account_id)
         do update set token_hash=excluded.token_hash,expires_at=excluded.expires_at,created_at=now()`,
         [actor.id,hash])
     })
     const result=await state(actor)
     return {...result,linkUrl}
   }
   await transaction(config,actor,async db=>{
     await ensureAccount(db,actor.id,true)
     if(input.action==='remove'){
       if(input.channel==='telegram'){
         await db.query('delete from app_private.notification_telegram_links where account_id=$1',[actor.id])
         await db.query('delete from app_private.notification_telegram_challenges where account_id=$1',[actor.id])
       }
       await db.query('delete from app_private.notification_messenger_requests '+
         'where account_id=$1 and channel=$2',[actor.id,input.channel])
       return
     }
     if(input.action==='preferences'){
       const result=await db.query('update app_private.notification_messenger_requests '+
         'set topics=$3::jsonb,locale=$4,consent_version=$5,updated_at=now() '+
         'where account_id=$1 and channel=$2',
         [actor.id,input.channel,JSON.stringify(input.topics),input.locale,input.noticeVersion])
       if(!result.rowCount)throw new AppError('CONTACT_NOT_REGISTERED',404)
       return
     }
     if(input.channel==='telegram'){
       // An unverified username must never revoke a working verified chat.
       // Only a new verified /start, explicit Disconnect or /stop may change it.
       await db.query('delete from app_private.notification_telegram_challenges where account_id=$1',[actor.id])
     }
     const encrypted=seal({destination:input.destination},
       encryptionContext(actor.id,input.channel),config)
     await db.query('insert into app_private.notification_messenger_requests '+
       '(account_id,channel,destination_ciphertext,topics,locale,consent_version) '+
       'values($1,$2,$3,$4::jsonb,$5,$6) '+
       'on conflict(account_id,channel) do update set '+
       'destination_ciphertext=excluded.destination_ciphertext,topics=excluded.topics,'+
       'locale=excluded.locale,consent_version=excluded.consent_version,updated_at=now()',
       [actor.id,input.channel,encrypted,JSON.stringify(input.topics),input.locale,input.noticeVersion])
   })
   return state(actor)
 }
 return {state,mutate}
}
