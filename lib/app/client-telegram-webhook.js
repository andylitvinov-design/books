import 'server-only'
import {databasePool} from './database.js'
import {operationHash,seal} from './crypto.js'
import {interpretTelegramClientUpdate,validateTelegramStartToken} from './client-telegram-policy.js'
import {AppError} from '../assessments/contracts.js'
import {validGuestTelegramToken} from './telegram-guest-news-policy.js'
import {confirmGuestNewsFromWebhook,stopGuestNewsFromWebhook} from './telegram-guest-news.js'

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
 // A delayed STOP must still revoke consent after an outage. START tokens
 // remain strictly fresh, and their independent DB challenge expires in 15 min.
 const ageLimit=event.type==='stop'?30*24*60*60*1000:10*60*1000
 if(!Number.isSafeInteger(event.sentAt)||
    Date.now()-event.sentAt*1000>ageLimit ||
    event.sentAt*1000-Date.now()>2*60*1000)return {accepted:true,changed:false}
 const chatHash=operationHash({scope:'hh-client-tg-chat',chatId:event.chatId},config)
 if(event.type==='stop'){
  const changed=await withWebhookRole(config,async db=>(await db.query(
   'select app_private.notification_tg_stop($1) as stopped',[chatHash])).rows[0]?.stopped)
  // STOP also withdraws unrelated public-news opt-in, if present.
  const guest=await stopGuestNewsFromWebhook(config,chatHash)
  return {accepted:true,changed:changed===true||guest===true}
 }
 if(!validateTelegramStartToken(event.token))return {accepted:true,changed:false}
 if(validGuestTelegramToken(event.token)){
  const changed=await confirmGuestNewsFromWebhook(config,event.token,event.chatId,chatHash)
  return {accepted:true,changed}
 }
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
