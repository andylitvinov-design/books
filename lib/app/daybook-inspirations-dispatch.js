import 'server-only'
import { transaction } from './database.js'
import { openSealed, operationHash } from './crypto.js'
import { sendDailyInspirationTelegram } from './client-telegram-transport.js'
import { telegramClientSendReady } from './client-telegram-policy.js'
import { daybookSendEnabled, formatDaybookMessage } from '../daybook/inspirations-policy.mjs'

// Called by the pre-existing CRON_SECRET-protected 5-minute recovery job.
// SQL locks each due subscription, reserves exactly one local-day phrase and
// excludes the previous 30 local days. Unknown provider results are never retried.
export async function dispatchDailyInspirations(config, env = process.env, {
  now = () => new Date(), send = sendDailyInspirationTelegram, maxBatch = 12,
} = {}) {
 if (!daybookSendEnabled(env, telegramClientSendReady(env)))
  return {status:'disabled',claimed:0,accepted:0,suppressed:0,unknown:0}
 const when = now()
 const items = await transaction(config,null,async db =>
   (await db.query('select * from app_private.daybook_inspiration_claim_due($1,$2)',
     [when.toISOString(),Math.min(Math.max(maxBatch,1),20)])).rows,{server:true})
 const outcome = {status:'ran',claimed:items.length,accepted:0,suppressed:0,unknown:0}
 for (const item of items) {
  const finish = async (status,id=null) => transaction(config,null,async db =>
    (await db.query('select app_private.daybook_inspiration_finish($1,$2,$3,$4,$5) as ok',
      [item.account_id,item.local_day,item.chat_hash,status,id])).rows[0]?.ok===true,{server:true})
  try {
   const allowed = await transaction(config,null,async db =>
     (await db.query('select app_private.daybook_inspiration_send_allowed($1,$2,$3) as allowed',
       [item.account_id,item.local_day,item.chat_hash])).rows[0]?.allowed===true,{server:true})
   if (!allowed) { await finish('suppressed'); outcome.suppressed++;continue }
   const chat = openSealed(item.chat_ciphertext,
     {accountId:item.account_id,recordId:item.account_id,field:'notification.telegram.chat'},config)
   if (typeof chat?.chatId !== 'string' ||
       !/^[1-9][0-9]{4,19}$/.test(chat.chatId) ||
       operationHash({scope:'hh-client-tg-chat',chatId:chat.chatId},config) !== item.chat_hash) {
    await finish('suppressed');outcome.suppressed++;continue
   }
   const text = formatDaybookMessage(item.phrase_text,item.locale)
   const sent = await send({chatId:chat.chatId,text},env)
   if (await finish('accepted',sent.providerMessageId)) outcome.accepted++
   else outcome.unknown++
  } catch {
   // A request may have reached Telegram before an error/timeout.
   // Reserve this local day and phrase rather than risk a second send.
   await finish('unknown').catch(()=>{})
   outcome.unknown++
  }
 }
 return outcome
}
