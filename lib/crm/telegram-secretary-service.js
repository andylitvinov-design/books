import 'server-only'
import {transaction} from '../app/database.js'
import {operationHash} from '../app/crypto.js'
import {webhookTransaction} from './messenger-webhook.js'
import {telegramBusinessClientChoice} from '../assist/telegram-business-request.mjs'
import {channelTransportReady} from './messenger-policy.js'
import {assertHolisticBusinessConnection} from './messenger-provider.js'
import {telegramBusinessMessageFromUpdate} from '../assist/telegram-business-request.mjs'
import {detectConversationLocale} from '../holistic-support/conversation-locale.mjs'
import {classifyTelegramSecretaryQuery,composeTelegramSecretaryAnswer} from './telegram-secretary-offers.mjs'
import {mindRoleInstruction} from '../holistic-support/mind-role-router.mjs'
import {generateOwnedOllama} from '../holistic-support/owned-ollama.mjs'
import {reviewQwenOwnedReply} from '../holistic-support/qwen-reply-gate.mjs'


const STOP_TABLE='app_private.crm_tg_business_secretary_optouts'
const LOCK_PREFIX='hh-tg-business-service-session:'
function sessionHashes(event,config){
 const business=operationHash({scope:'hh-tg-business-connection',id:event.connectionId},config)
 const user=operationHash({scope:'hh-tg-business-user',business,id:event.chatId},config)
 return {business,user,lock:LOCK_PREFIX+business+':'+user}
}
/**
 * Signed webhook gate BEFORE either the existing service-order intake or
 * the Secretary replies. STOP is durable even if no service request exists.
 * A stopped chat cannot restart itself by repeating the same site link.
 */
export async function gateTelegramBusinessSecretaryOptOut(update,config,env=process.env){
 if(env.HH_CRM_TG_CHAT_AUTOMATION_ENABLED!=='true')return {blocked:false}
 const event=telegramBusinessMessageFromUpdate(update)
 if(!event)return {blocked:false}
 const keys=sessionHashes(event,config)
 const wantsStop=telegramBusinessClientChoice(event.text)?.kind==='stop'
 return webhookTransaction(config,async db=>{
   await db.query('select pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended($1,0))',[keys.lock])
   const row=(await db.query('select stopped_at from '+STOP_TABLE+
     ' where business_hash=$1 and user_hash=$2',[keys.business,keys.user])).rows[0]
   if(row)return {blocked:true}
   if(wantsStop){
     await db.query('insert into '+STOP_TABLE+
       ' (business_hash,user_hash) values($1,$2) on conflict do nothing',
       [keys.business,keys.user])
   }
   return {blocked:false,justStopped:wantsStop}
 })
}
async function secretaryStopped(event,config){
 const keys=sessionHashes(event,config)
 return webhookTransaction(config,async db=>{
   const row=(await db.query('select stopped_at from '+STOP_TABLE+
     ' where business_hash=$1 and user_hash=$2',[keys.business,keys.user])).rows[0]
   return Boolean(row)
 })
}

/**
 * One source-bounded Secretary/Consultant Mind on the EXISTING signed Business
 * webhook. Never accept arbitrary text as a model prompt, service order,
 * permission, CRM lead or product link. The connected user still owns the chat.
 */
export async function processTelegramBusinessSecretary(update,config,env=process.env){
 if(env.HH_CRM_TG_CHAT_AUTOMATION_ENABLED!=='true'||
    !channelTransportReady('telegram',env))return {handled:false}
 const event=telegramBusinessMessageFromUpdate(update)
 if(!event||event.request)return {handled:false}
 const locale=detectConversationLocale(event.text,'en')
 const query=classifyTelegramSecretaryQuery(event.text,locale)
 if(!query)return {handled:false}
 // Check official Telegram ownership and can_reply before DB reads or any send.
 // Chat IDs, raw message text and private data are not logged or stored.
 try{await assertHolisticBusinessConnection({connectionId:event.connectionId,to:event.chatId},env)}
 catch{return {handled:true}}
 let services=[]
 if(query.kind!=='safety'){
  try{
   services=await transaction(config,null,async db=>{
    const r=await db.query(
      'select s.id::text,s.slug,s.active,s.status,s.offering_type,s.category,'+
      ' s.pricing_mode,s.confirmed_price::text,s.currency,s.localized_copy,'+
      ' p.slug as practitioner_slug,p.active as practitioner_active,'+
      ' p.status as practitioner_status from app.service_offerings s'+
      ' join app.practitioners p on p.id=s.practitioner_id'+
      " where s.active and s.status='published' and"+
      " p.active and p.status='approved' and p.public_profile<>'{}'::jsonb"+
      ' order by s.created_at desc,s.id limit 50')
    return Array.isArray(r.rows)?r.rows:[]
   },{server:true})
  }catch{
   // A failed DB read can never cause unverified service listings to appear.
   // Already checked public index links may still be shown as sections.
   services=[]
  }
 }
 const planned=composeTelegramSecretaryAnswer(query,services)
 if(!planned?.handled||!planned.text)return {handled:true}
 // Recheck STOP after any source read/model operation. A late unsubscribe
 // must not lead to a delayed answer from this request.
 if(await secretaryStopped(event,config))return {handled:true}
 // The SAME owned Qwen used elsewhere on Holistic House may optionally
 // improve a short catalogue introduction after an explicit /ai query.
 // Nothing from the customer's raw text or identity is supplied to the model:
 // only checked public resource titles and coarse purpose labels. Fail closed
 // to the already reviewed deterministic reply on any model/output problem.
 if(query.kind==='catalog'&&/^\/ai(?:\s|$)/i.test(event.text.trim())&&
    env.HH_TG_SECRETARY_OWNED_ENABLED==='true'&&env.HH_AGENT_OWNED_ENABLED==='true'&&
    /^qwen[0-9.:_-]*/i.test(String(env.HH_AGENT_OLLAMA_MODEL||''))&&
    env.HH_AGENT_OLLAMA_ENDPOINT&&env.HH_AGENT_OLLAMA_TOKEN){
   try{
    const titles=planned.buttons.map(b=>b.text).join('; ').slice(0,200)
    const response=await generateOwnedOllama({messages:[
      {role:'system',content:mindRoleInstruction('secretary')+
        ' Use only supplied verified public titles. Output ONE friendly sentence in the requested language, no links, prices, personal advice, claims of booking or other actions.'},
      {role:'user',content:'Language: '+query.locale+
        '. Purpose: '+query.focus+'. Published titles: '+titles},
    ]},{
      endpoint:env.HH_AGENT_OLLAMA_ENDPOINT,
      model:env.HH_AGENT_OLLAMA_MODEL,
      bearerToken:env.HH_AGENT_OLLAMA_TOKEN,
      production:env.NODE_ENV==='production',
      signal:AbortSignal.timeout(5000),
    })
    const checked=reviewQwenOwnedReply({response,locale:query.locale,
      role:'secretary',userMessage:'show published resources'})
    if(checked.accepted&&typeof checked.text==='string'&&
      checked.text.length<=160&&!/https?:|€|\$|\b\d{2,}\b|[<>]/.test(checked.text)){
      const combined=checked.text+'\n'+planned.text
      if(combined.length<=600){planned.text=combined;planned.modelUsed=true}
    }
   }catch{/* Availability/cost/consent proof never falls back to a paid model. */}
 }
 return {handled:true,connectionId:event.connectionId,to:event.chatId,
    messageId:event.messageId,updateId:event.updateId,reply:planned.text,
    buttons:planned.buttons,locale:query.locale,kind:planned.kind}
}
