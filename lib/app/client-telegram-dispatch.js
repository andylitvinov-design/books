import 'server-only'
import {transaction} from './database.js'
import {openSealed} from './crypto.js'
import {telegramClientSendReady} from './client-telegram-policy.js'
import {sendClientTelegramMessage} from './client-telegram-transport.js'

// Never use a browser-supplied recipient. SQL derives a verified, opt-in
// recipient from a committed participants-only consultation message.
// The unique message claim enforces at-most-once Bot API attempts; uncertain
// provider results never cause automatic retries or duplicate notifications.
export async function dispatchClientTelegramNotification(config,messageId,env=process.env){
 if(!telegramClientSendReady(env))return {attempted:0,accepted:0,reason:'disabled'}
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
  // Recheck current opt-in and linked chat immediately before the provider request.
  const allowed=await transaction(config,null,async db=>(await db.query(
   'select app_private.notification_tg_dispatch_allowed($1,$2) as allowed',
   [messageId,item.target_chat_hash])).rows[0]?.allowed,{server:true})
  if(!allowed){await finish('suppressed');return {attempted:0,accepted:0,reason:'revoked'}}
  const chat=openSealed(item.target_ciphertext,
   {accountId:item.target_account_id,recordId:item.target_account_id,
    field:'notification.telegram.chat'},config)
  if(!chat?.chatId||typeof chat.chatId!=='string'){
   await finish('failed')
   return {attempted:0,accepted:0,reason:'invalid_chat'}
  }
  const sent=await sendClientTelegramMessage({
   chatId:chat.chatId,locale:item.target_locale,requestId:item.target_request_id},env)
  await finish('accepted',sent.providerMessageId)
  return {attempted:1,accepted:1}
 }catch{
  await finish('failed').catch(()=>{})
  return {attempted:1,accepted:0,reason:'provider_unavailable'}
 }
}
