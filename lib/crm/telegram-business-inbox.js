import 'server-only'
import {randomUUID} from 'node:crypto'
import {webhookTransaction} from './messenger-webhook.js'
import {businessHash,providerMessageHash} from './messenger-store.js'
import {channelTransportReady,telegramBusinessTransportReady,telegramBotBusinessId} from './messenger-policy.js'
import {telegramBusinessLeadCandidate} from './telegram-lead-capture-policy.mjs'
import {telegramBusinessWelcomeClick} from './telegram-business-welcome-menu.mjs'
import {assertHolisticBusinessConnection} from './messenger-provider.js'
import {seal,operationHash} from '../app/crypto.js'
import {PRACTITIONER_ID} from '../../data/app-services.js'
import {AppError} from '../assessments/contracts.js'

// One signed bot webhook and account; Business identities have a different
// HMAC scope from ordinary Telegram bot chats. Never merge their threads by
// numeric Telegram ID. The Business connection is kept only in AES-GCM.
function botDigest(config,env){
 const id=telegramBotBusinessId(env)
 return id?businessHash('telegram',id,config):null
}
function businessUserHash(accountDigest,userId,config){
 return operationHash({scope:'crm-msg-telegram-business-peer',accountDigest,
   userId:String(userId)},config)
}
// Called only with the private numeric peer from the verified Telegram OIDC
// identity. Match the identical CRM HMAC used by signed Business webhooks.
export function verifiedBusinessThreadProof(peer,config){
 const digest=botDigest(config,process.env)
 return digest?{accountHash:digest,userHash:businessUserHash(digest,peer,config)}:null
}
async function humanActive(db,accountDigest,userHash){
 const ready=(await db.query(
   "select pg_catalog.to_regprocedure('app_private.crm_msg_human_reply_recent(text,text)') is not null as ready"
 )).rows[0]?.ready===true
 if(!ready)return false
 return (await db.query(
   'select app_private.crm_msg_human_reply_recent($1,$2) as active',
   [accountDigest,userHash])).rows[0]?.active===true
}
function businessLocale(text){
 return /[\u0400-\u04ff]/u.test(text)?'ru':
   /[¡¿áéíóúñ]/iu.test(text)?'es':'en'
}
// Return a neutral CRM receipt before explicit human takeover. Sensitive
// customer text/media never enter the generic Business inbox unsolicited.
// When the owner has sent an ACCEPTED manual reply within 48 hours, later
// customer text can be saved encrypted for that owner (not sent to an AI).
export async function captureTelegramBusinessInbox(update,config,verifiedLead=null,env=process.env){
 if(env.HH_CRM_TG_CHAT_AUTOMATION_ENABLED!=='true'||
    !telegramBusinessTransportReady(env))return {matched:false}
 const click=telegramBusinessWelcomeClick(update,telegramBotBusinessId(env))
 const event=telegramBusinessLeadCandidate(update)||click
 if(!event)return {matched:false}
 const digest=botDigest(config,env)
 if(!digest)return {matched:false}
 const alreadyVerified=verifiedLead?.connectionId===event.connectionId&&
   verifiedLead?.chatId===event.chatId&&verifiedLead?.unavailable!==true
 if(!alreadyVerified){
   try{await assertHolisticBusinessConnection({
     connectionId:event.connectionId,to:event.chatId},env)}
   catch(error){
     if(error?.code==='ACCOUNT_CHANGED'||error?.code==='INVALID_MESSAGE')
       return {matched:false}
     throw error
   }
 }
 return webhookTransaction(config,async db=>{
   const account=(await db.query(
     'select owner_id,account_id from app_private.crm_msg_resolve($1,$2)',
     ['telegram',digest])).rows[0]
   if(!account?.owner_id)return {matched:false,unavailable:true}
   // crm_msg_resolve (private SECURITY DEFINER) already proves that the
   // Telegram CRM account belongs to an ACTIVE owner. The signed inbox
   // hh_app_inbox role can read its allowlisted practitioner projection, but
   // intentionally cannot SELECT app.accounts directly (SQLSTATE 42501).
   // The hh_app_inbox practitioner RLS policy also requires the *fixed*
   // trusted practitioner context. Only set it after an official current
   // Telegram Business connection/owner verification and CRM bot resolve.
   await db.query("select pg_catalog.set_config('hh.practitioner_id',$1,true)",
     [String(PRACTITIONER_ID)])
   const owner=(await db.query(
     'select p.trusted_auth_user_id as id from app.practitioners p '+
     "where p.id=$1 and p.active and p.status in ('approved','submitted','changes_requested') "+
     "and p.public_profile<>'{}'::jsonb",
     [PRACTITIONER_ID])).rows[0]?.id
   if(!owner||owner!==account.owner_id)
     throw new AppError('TELEGRAM_CRM_OWNER_UNCONFIRMED',503)
   const userHash=businessUserHash(digest,event.chatId,config)
   const manual=await humanActive(db,digest,userHash)
   const peer=operationHash({scope:'hh-telegram-business-peer',id:event.chatId},config)
   // Match the separately verified and idempotent neutral Business lead RPC.
   const contactHash=operationHash({scope:'crm-tg-business-peer',owner,peer},config)
   const contactId=randomUUID(),messageId=randomUUID()
   const from=click?update.callback_query.from:(update.business_message?.from||{})
   const name=[from.first_name,from.last_name].filter(x=>typeof x==='string')
     .join(' ').replace(/[\u0000-\u001f]/g,' ').trim().slice(0,80)||
     'Telegram Business visitor'
   const idContext={accountId:owner,recordId:account.account_id,field:'crm.msgidentity'}
   const displayContext={accountId:owner,recordId:account.account_id,field:'crm.msgdisplay'}
   const identity=seal({externalId:event.chatId,transport:'telegram_business',
     businessConnectionId:event.connectionId},idContext,config)
   const display=seal({name},displayContext,config)
   const contact=seal({displayName:name,email:'',phone:''},
     {accountId:owner,recordId:contactId,field:'crm.contact'},config)
   const text=click?'Telegram Business menu selected: '+click.topic:manual&&event.text.trim()
     ?event.text.trim().slice(0,800)
     :event.text.trim()?'Telegram Business message received':
       'Telegram Business media received'
   const message=seal({text,businessConnectionId:event.connectionId},
     {accountId:owner,recordId:messageId,field:'crm.msgbody'},config)
   const msgHash=providerMessageHash('telegram',
     click?'business-callback:'+click.callbackId:'business:'+event.chatId+':'+event.messageId,config)
   const eventHash=operationHash({scope:'crm-msg-event',provider:'telegram',
     accountDigest:digest,eventId:'tg-business:'+event.updateId},config)
   const when=click?new Date():new Date(update.business_message.date*1000)
   if(!Number.isFinite(when.getTime()))return {matched:false}
   const row=(await db.query(
     'select app_private.crm_msg_ingest($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) as saved',
     ['telegram',digest,userHash,identity,display,contactId,contact,contactHash,
       click?.locale||businessLocale(event.text),messageId,message,msgHash,eventHash,
       when.toISOString(),false])).rows[0]
   return {matched:true,recorded:row?.saved===true,humanActive:manual,
     accountHash:digest,userHash,providerHash:msgHash}
 })
}
export async function setTelegramBusinessReplyState(config,inbox,state,context={}){
 if(!inbox?.matched||!inbox.recorded||
    !['processed','send_pending','provider_accepted','delivery_unknown','failed'].includes(state))return false
 return webhookTransaction(config,async db=>(await db.query(
   'select app_private.crm_msg_business_reply_state($1,$2,$3,$4,$5,$6,$7,$8) as saved',
   [inbox.accountHash,inbox.userHash,inbox.providerHash,state,
     context.serviceKey||null,context.offerId||null,context.sourcePath||null,
     context.dialogueStage||null])).rows[0]?.saved===true)
}
// Bot and Business use the SAME owner-side handoff proof, but distinct HMAC
// user hashes. No manually accepted CRM reply = no automatic AI pause.
export async function telegramBotHumanTakeover(event,config,env=process.env){
 if(event?.type!=='incoming'||event.callbackId||
   !/^\d{1,25}$/.test(String(event.userId||''))||
   !channelTransportReady('telegram',env))return false
 const digest=botDigest(config,env)
 if(!digest)return false
 const userHash=operationHash({scope:'crm-msg-user',provider:'telegram',
   accountDigest:digest,userId:String(event.userId)},config)
 return webhookTransaction(config,db=>humanActive(db,digest,userHash))
}
