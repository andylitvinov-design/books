import 'server-only'
import {randomBytes} from 'node:crypto'
import {transaction} from './database.js'
import {seal,openSealed,operationHash} from './crypto.js'
import {AppError} from '../assessments/contracts.js'
import {telegramClientLinkReady,telegramClientSendReady} from './client-telegram-policy.js'
import {verifyClientBot} from './client-telegram-transport.js'
import {
 MESSENGER_NOTIFICATION_CHANNELS,DEFAULT_MESSENGER_TOPICS,
 validateMessengerNotificationInput,maskMessengerDestination,
 normalizeMessengerTopics,
} from './messenger-notification-policy.js'

// This repository ONLY stores unverified preferences. It never delivers or links a Telegram chat ID.
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
     status:'pending',destinationHint:maskMessengerDestination(row.channel,contact?.destination),
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
   const links=(await db.query('select verified_at from app_private.notification_telegram_links '+
     'where account_id=$1',[actor.id])).rows
   return stateFromRows(rows,links,actor,config,process.env)
 })
 const mutate=async(actor,raw)=>{
   let input
   try{input=validateMessengerNotificationInput(raw)}
   catch{throw new AppError('INVALID_MESSENGER_NOTIFICATION_REQUEST',400)}
   if(input.action==='begin_telegram'){
     if(!telegramClientLinkReady())throw new AppError('TELEGRAM_NOT_CONFIGURED',503)
     // Prevent a wrong bot username from receiving a sensitive linking challenge.
     await verifyClientBot()
     const token=randomBytes(24).toString('base64url')
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
       // Creating a new pairing invalidates any previous recipient immediately.
       await db.query('delete from app_private.notification_telegram_links where account_id=$1',[actor.id])
       await db.query(`insert into app_private.notification_telegram_challenges(account_id,token_hash,expires_at)
         values($1,$2,now()+interval '15 minutes') on conflict(account_id)
         do update set token_hash=excluded.token_hash,expires_at=excluded.expires_at,created_at=now()`,
         [actor.id,hash])
     })
     const result=await state(actor)
     return {...result,linkUrl:'https://t.me/'+process.env.HH_CLIENT_TG_BOT_USERNAME+'?start='+token}
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
       // Saving a new typed username never verifies or retains an old Telegram chat.
       await db.query('delete from app_private.notification_telegram_links where account_id=$1',[actor.id])
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
