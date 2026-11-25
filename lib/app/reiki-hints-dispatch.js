import 'server-only'
import {transaction} from './database.js'
import {openSealed,operationHash} from './crypto.js'
import {reikiHintsDeliveryReady} from './reiki-hints-repository.js'
import {sendReikiHintsTelegramMessage} from './client-telegram-transport.js'

export async function dispatchReikiHints(config,env=process.env){
 const summary={enabled:reikiHintsDeliveryReady(env),claimed:0,accepted:0,unknown:0,suppressed:0}
 if(!summary.enabled)return summary
 const server={server:true}
 // One extra bounded candidate per existing five-minute tick; no new cron.
 const candidates=await transaction(config,null,async db=>(await db.query('select * from app_private.reiki_hints_due($1)',[1])).rows,server)
 for(const {account_id:accountId,local_day:localDay} of candidates){
  let claimed=false
  try{
   claimed=await transaction(config,null,async db=>(await db.query('select app_private.reiki_hints_claim($1,$2::date) as ok',[accountId,localDay])).rows[0]?.ok===true,server)
   if(!claimed)continue
   summary.claimed++
   const status=await transaction(config,null,async db=>{
    const row=(await db.query('select * from app_private.reiki_hints_ready($1,$2::date)',[accountId,localDay])).rows[0]
    let result='suppressed',receipt=null
    if(row){
     result='unknown'
     try{
      const chat=openSealed(row.chat_ciphertext,{accountId,recordId:accountId,field:'notification.telegram.chat'},config)
      const chatId=String(chat?.chatId||'')
      if(!/^[1-9][0-9]{4,19}$/.test(chatId)||operationHash({scope:'hh-client-tg-chat',chatId},config)!==row.chat_hash)throw Error('REIKI_HINTS_CHAT_INVALID')
      const sent=await sendReikiHintsTelegramMessage({chatId,day:row.slot,locale:row.locale},env)
      if(sent?.accepted){result='accepted';receipt=sent.providerMessageId}
     }catch{/* Never retry an ambiguous provider outcome. */}
    }
    await db.query('select app_private.reiki_hints_finish($1,$2::date,$3,$4)',[accountId,localDay,result,receipt])
    return result
   },server)
   summary[status]++
  }catch{if(claimed)summary.unknown++}
 }
 return summary
}
