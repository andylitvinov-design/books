import 'server-only'
import {databasePool} from './database.js'
import {operationHash,seal} from './crypto.js'
import {interpretTelegramClientUpdate,validateTelegramStartToken,
  telegramClientReplyRelayReady,telegramClientBotUsername} from './client-telegram-policy.js'
import {validateMessageText} from '../crm/messenger-policy.js'
import {assertNoRelayContacts} from '../practitioners/relay-privacy.mjs'
import {AppError} from '../assessments/contracts.js'

const chatContext=accountId=>({accountId,recordId:accountId,field:'notification.telegram.chat'})
async function withWebhookRole(config,action){
 const db=await databasePool(config).connect()
 try{
  await db.query('begin')
  const role=(await db.query('select rolsuper,rolbypassrls from pg_roles where rolname=current_user')).rows[0]
  if(!config.test&&(role?.rolsuper||role?.rolbypassrls))
   throw new AppError('DATABASE_ROLE_UNSAFE',503)
  await db.query('set local role hh_app_inbox')
  const data=await action(db)
  await db.query('commit')
  return data
 }catch(error){
  await db.query('rollback').catch(()=>{})
  throw error
 }finally{db.release()}
}
export async function receiveClientTelegramWebhook(config,update){
 const event=interpretTelegramClientUpdate(update)
 if(!event)return {accepted:true,changed:false}
 // Avoid processing ancient webhook replay, even with the right secret.
 if(!Number.isSafeInteger(event.sentAt)||
    Date.now()-event.sentAt*1000>10*60*1000 ||
    event.sentAt*1000-Date.now()>2*60*1000)return {accepted:true,changed:false}
 const chatHash=operationHash({scope:'hh-client-tg-chat',chatId:event.chatId},config)
 if(event.type==='stop'){
  const changed=await withWebhookRole(config,async db=>(await db.query(
   'select app_private.notification_tg_stop($1) as stopped',[chatHash])).rows[0]?.stopped)
  return {accepted:true,changed:changed===true}
 }
 if(event.type==='reply'){
  // No unsolicited bot forwarding: the owner must explicitly enable the
  // verified provider pilot after a signed webhook and physical-device E2E.
  const bot=telegramClientBotUsername()
  if(!telegramClientReplyRelayReady()||!bot||
     bot.toLowerCase()!==event.replyToBotUsername.toLowerCase())
    return {accepted:true,changed:false}
  let body
  try{body=validateMessageText(event.text);assertNoRelayContacts(body)}
  catch{return {accepted:true,changed:false}}
  // Stable idempotency key for this provider update and verified chat,
  // never the untrusted reply text or client-supplied consultation UUID.
  const digest=operationHash({scope:'hh-client-tg-reply-event',
    chatHash,updateId:event.updateId},config)
  const id=digest.slice(0,8)+'-'+digest.slice(8,12)+'-4'+digest.slice(13,16)+
   '-8'+digest.slice(17,20)+'-'+digest.slice(20,32)
  const changed=await withWebhookRole(config,async db=>{
   const targets=(await db.query(
    'select * from app_private.notification_tg_reply_target($1,$2)',
    [chatHash,event.replyToMessageId])).rows
   if(targets.length!==1)return false
   const target=targets[0]
   const ciphertext=seal({text:body},{accountId:target.account_id,
     recordId:id,field:'practice.request.message'},config)
   return (await db.query(
    'select app_private.notification_tg_reply_commit($1,$2,$3,$4,$5,$6) as saved',
    [chatHash,event.replyToMessageId,target.request_id,target.account_id,id,ciphertext]
   )).rows[0]?.saved===true
  })
  return {accepted:true,changed,relayMessageId:changed?id:null}
 }
 if(!validateTelegramStartToken(event.token))return {accepted:true,changed:false}
 const tokenHash=operationHash({scope:'hh-client-telegram-link',token:event.token},config)
 const changed=await withWebhookRole(config,async db=>{
  const record=(await db.query(
   'select app_private.notification_tg_token_owner($1) as account_id',[tokenHash])).rows[0]
  if(!record?.account_id)return false
  const cipher=seal({chatId:event.chatId},chatContext(record.account_id),config)
  const claim=await db.query('select app_private.notification_tg_consume($1,$2,$3,$4) as linked',
   [tokenHash,record.account_id,chatHash,cipher])
  return claim.rows[0]?.linked===true
 })
 return {accepted:true,changed}
}
