import 'server-only'
import {transaction} from './database.js'
import {openSealed} from './crypto.js'
import {telegramClientSendReady} from './client-telegram-policy.js'
import {sendClientTelegramReportNotice} from './client-telegram-transport.js'

// The report is already committed and published before this runs. All routing,
// consent, live state and one-shot claims are derived by privileged SQL. No
// recipient, report contents, contact or URL is accepted from the browser.
export async function dispatchExpressReportTelegramNotice(config,reportId,env=process.env){
  if(!telegramClientSendReady(env))
    return {attempted:0,accepted:0,reason:'channel_not_approved'}
  const target=await transaction(config,null,async db=>
    (await db.query('SELECT * FROM app_private.express_report_tg_claim($1)',[reportId])).rows[0],
    {server:true})
  if(!target)return {attempted:0,accepted:0,reason:'no_opt_in_or_already_claimed'}
  async function finish(status,providerId=null){
    return transaction(config,null,async db=>db.query(
      'SELECT app_private.express_report_tg_finish($1,$2,$3)',
      [reportId,status,providerId]),{server:true})
  }
  try{
    const allowed=await transaction(config,null,async db=>
      (await db.query('SELECT app_private.express_report_tg_allowed($1,$2) AS permitted',
        [reportId,target.target_chat_hash])).rows[0]?.permitted,{server:true})
    if(!allowed){
      await finish('suppressed')
      return {attempted:0,accepted:0,reason:'revoked'}
    }
    const chat=openSealed(target.target_ciphertext,{
      accountId:target.target_account_id,recordId:target.target_account_id,
      field:'notification.telegram.chat',
    },config)
    if(!chat?.chatId||typeof chat.chatId!=='string'){
      await finish('failed')
      return {attempted:0,accepted:0,reason:'invalid_chat'}
    }
    const delivery=await sendClientTelegramReportNotice({
      chatId:chat.chatId,locale:target.target_locale,
    },env)
    await finish('accepted',delivery.providerMessageId)
    // Accepted by Bot API is NOT device delivery or read confirmation.
    return {attempted:1,accepted:1}
  }catch{
    await finish('failed').catch(()=>{})
    return {attempted:1,accepted:0,reason:'provider_unconfirmed'}
  }
}
