import 'server-only'
import {transaction,consumeRate} from './database.js'
import {openSealed} from './crypto.js'
import {telegramClientSendReady,telegramOwnerPilotReady} from './client-telegram-policy.js'
import {PRACTITIONER_ID} from '../../data/app-services.js'
import {sendClientTelegramMessage,sendOwnerTelegramEventMessage} from './client-telegram-transport.js'

// Never use a browser-supplied recipient. SQL derives a verified, opt-in
// recipient from a committed participants-only consultation message.
// The unique message claim enforces at-most-once Bot API attempts; uncertain
// provider results never cause automatic retries or duplicate notifications.
export async function dispatchClientTelegramNotification(config,messageId,env=process.env){
 const generalApproved=telegramClientSendReady(env)
 const ownerPilot=telegramOwnerPilotReady(env)
 if(!generalApproved&&!ownerPilot)return {attempted:0,accepted:0,reason:'disabled'}
 // The pilot must never claim a message addressed to a customer or another
 // practitioner. A private definer returns the approved master only when the
 // committed message was authored by the actual assigned client.
 const ownerTarget=!generalApproved ? await transaction(config,null,async db=>(await db.query(
  'select app_private.notification_tg_owner_pilot_target($1,$2) as account_id',
  [messageId,PRACTITIONER_ID])).rows[0]?.account_id,{server:true}) : null
 if(!generalApproved&&!ownerTarget)
  return {attempted:0,accepted:0,reason:'owner_pilot_other_recipient'}
 const items=await transaction(config,null,async db=>(await db.query(
  'select * from app_private.notification_tg_message_claim($1)',[messageId])).rows,
  {server:true})
 if(items.length!==1)return {attempted:0,accepted:0,reason:'no_authorized_target_or_duplicate'}
 const item=items[0]
 async function finish(status,id=null){
  return transaction(config,null,async db=>db.query(
   'select app_private.notification_tg_dispatch_finish($1,$2,$3)',
   [messageId,status,id]),{server:true})
 }
 try{
  if(!generalApproved&&item.target_account_id!==ownerTarget){
   await finish('suppressed')
   return {attempted:0,accepted:0,reason:'owner_pilot_target_changed'}
  }
  // Recheck current opt-in and linked chat immediately before the provider request.
  const allowed=await transaction(config,null,async db=>(await db.query(
   'select app_private.notification_tg_dispatch_allowed($1,$2) as allowed',
   [messageId,item.target_chat_hash])).rows[0]?.allowed,{server:true})
  if(!allowed){await finish('suppressed');return {attempted:0,accepted:0,reason:'revoked'}}
  if(!generalApproved){
   const stillOwner=await transaction(config,null,async db=>(await db.query(
    'select app_private.notification_tg_owner_pilot_target($1,$2) as account_id',
    [messageId,PRACTITIONER_ID])).rows[0]?.account_id,{server:true})
   if(stillOwner!==ownerTarget){
    await finish('suppressed')
    return {attempted:0,accepted:0,reason:'owner_pilot_revoked'}
   }
   await consumeRate(config,{scope:'hh-owner-telegram-live-message',ownerId:ownerTarget},20,3600)
  }
  const chat=openSealed(item.target_ciphertext,
   {accountId:item.target_account_id,recordId:item.target_account_id,
    field:'notification.telegram.chat'},config)
  if(!chat?.chatId||typeof chat.chatId!=='string'){
   await finish('failed')
   return {attempted:0,accepted:0,reason:'invalid_chat'}
  }
  const sent=generalApproved
   ? await sendClientTelegramMessage({
     chatId:chat.chatId,locale:item.target_locale,requestId:item.target_request_id},env)
   : await sendOwnerTelegramEventMessage({
     chatId:chat.chatId,locale:item.target_locale,event:'message'},env)
  await finish('accepted',sent.providerMessageId)
  return {attempted:1,accepted:1}
 }catch(error){
  await finish(error?.code==='RATE_LIMITED'?'suppressed':'failed').catch(()=>{})
  return {attempted:1,accepted:0,
   reason:error?.code==='RATE_LIMITED'?'rate_limited':'provider_unavailable'}
 }
}
