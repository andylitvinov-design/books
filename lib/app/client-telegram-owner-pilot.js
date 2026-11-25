import 'server-only'
import {transaction,consumeRate} from './database.js'
import {openSealed} from './crypto.js'
import {AppError} from '../assessments/contracts.js'
import {telegramClientLinkReady} from './client-telegram-policy.js'
import {verifyClientBot,sendOwnerTelegramTestMessage} from './client-telegram-transport.js'

/**
 * One manually requested test to the signed-in owner's OWN verified Telegram.
 * Does not require or change HH_CLIENT_TG_SEND_APPROVED, does not enroll anyone,
 * cannot address a browser-selected chat ID and cannot send to CRM contacts.
 */
export async function sendOwnerTelegramPilot(config,actor,env=process.env){
 if(!telegramClientLinkReady(env))
   throw new AppError('TELEGRAM_NOT_CONFIGURED',503)
 await verifyClientBot(env,{requireWebhook:true})
 const target=await transaction(config,actor,async db=>{
   const result=await db.query(`
     select l.chat_hash,l.chat_ciphertext,n.locale
     from app_private.notification_telegram_links l
     join app_private.notification_messenger_requests n
       on n.account_id=l.account_id and n.channel='telegram'
     join app.accounts account on account.id=l.account_id
     where l.account_id=$1
       and l.consent_version='hh-tg-message-alerts-v1'
       and n.consent_version='hh-messenger-contact-v1'
       and n.topics->>'messages'='true'
       and account.status='active' and account.onboarding_state='active'
     limit 1`,[actor.id])
   return result.rows[0]||null
 })
 if(!target)throw new AppError('TELEGRAM_OWNER_NOT_LINKED',409)
 const info=openSealed(target.chat_ciphertext,
   {accountId:actor.id,recordId:actor.id,field:'notification.telegram.chat'},config)
 if(typeof info?.chatId!=='string'||!/^[1-9][0-9]{4,19}$/.test(info.chatId))
   throw new AppError('TELEGRAM_INVALID_CHAT',409)
 // At most one manual test per ten minutes, even on an uncertain provider response.
 await consumeRate(config,{scope:'hh-client-telegram-owner-test',ownerId:actor.id},1,600)
 // The owner might have pressed /stop or disconnected while the provider was checked.
 const linked=await transaction(config,actor,async db=>(await db.query(`
   select exists(
     select 1 from app_private.notification_telegram_links l
     join app_private.notification_messenger_requests n
       on n.account_id=l.account_id and n.channel='telegram'
     where l.account_id=$1 and l.chat_hash=$2
       and l.consent_version='hh-tg-message-alerts-v1'
       and n.consent_version='hh-messenger-contact-v1'
       and n.topics->>'messages'='true'
   ) as permitted`,[actor.id,target.chat_hash])).rows[0]?.permitted)
 if(linked!==true)throw new AppError('TELEGRAM_OWNER_NOT_LINKED',409)
 const result=await sendOwnerTelegramTestMessage({
   chatId:info.chatId,locale:target.locale,
 },env)
 // Bot API acceptance is NOT proof of recipient delivery or read.
 return {providerAccepted:result.accepted===true,status:'accepted'}
}
