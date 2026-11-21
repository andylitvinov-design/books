import 'server-only'
import {transaction} from '../app/database.js'
import {operationHash} from '../app/crypto.js'
import {businessHash} from './messenger-store.js'
import {webhookTransaction} from './messenger-webhook.js'
import {channelTransportReady,whatsappPilotReady} from './messenger-policy.js'
import {whatsappIntakeReady,whatsappIntakeLocale} from './whatsapp-intake.mjs'
import {whatsappSecretaryQuery,whatsappSecretaryPublicAnswer} from './whatsapp-secretary-catalog.mjs'

// Only customer-requested answers about verified public resources. The
// existing signed inbound Meta webhook, opt-out and intake take precedence.
export async function processWhatsAppSecretary(event,config,env=process.env){
 if(env.HH_CRM_WA_SECRETARY_ENABLED!=='true'||
    event?.type!=='incoming'||!whatsappIntakeReady(env)||
    !channelTransportReady('whatsapp',env))return {handled:false}
 if(String(event.accountId)!==String(env.HH_CRM_MSG_WHATSAPP_PHONE_ID)||
    !/^[1-9][0-9]{7,14}$/.test(String(event.userId||''))||
    !/^wa:[A-Za-z0-9._:=+/-]{10,256}$/.test(String(event.eventId||''))||
    !Number.isFinite(event.sentAt)||Math.abs(Date.now()-event.sentAt)>10*60*1000)
    return {handled:true}
 if(whatsappPilotReady(env)&&String(event.userId)!==env.HH_CRM_MSG_WHATSAPP_PILOT_WA_ID)
    return {handled:true}
 const locale=whatsappIntakeLocale(String(event.rawText||''),event.diagnosticLocale)
 const query=whatsappSecretaryQuery(String(event.rawText||''),locale)
 if(!query)return {handled:false}
 const business=businessHash('whatsapp',String(event.accountId),config)
 const user=operationHash({scope:'crm-msg-user',provider:'whatsapp',
   accountDigest:business,userId:String(event.userId)},config)
 const message=operationHash({scope:'crm-wa-diagnostic-event',
   userHash:user,eventId:event.eventId},config)
 const gate=await webhookTransaction(config,async db=>{
   const account=(await db.query(
     'select owner_id,account_id from app_private.crm_msg_resolve($1,$2)',
     ['whatsapp',business])).rows[0]
   if(!account)return 'blocked'
   await db.query('select pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended($1,0))',
      [business+':'+user])
   const session=(await db.query(
     'select stage from app_private.crm_wa_diagnostic_sessions '+
     'where business_hash=$1 and user_hash=$2 for update',[business,user])).rows[0]
   if(session?.stage==='stopped')return 'blocked'
   // FAQ cannot take a client's reply from an active private consented intake.
   if(session?.stage&&session.stage!=='done')return 'intake'
   const claim=(await db.query('insert into app_private.crm_wa_diagnostic_receipts '+
     '(business_hash,user_hash,message_hash) values($1,$2,$3) '+
     'on conflict(business_hash,user_hash,message_hash) do nothing returning message_hash',
     [business,user,message])).rows[0]
   return claim?'answer':'blocked'
 })
 if(gate==='intake')return {handled:false}
 if(gate!=='answer')return {handled:true}
 let services=[]
 if(query.kind!=='safety'&&query.kind!=='welcome'&&query.kind!=='clarify_unknown'){
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
  }catch{/* No invented offers or private customer data in fallback. */}
 }
 const answer=whatsappSecretaryPublicAnswer(query,services)
 return {handled:true,to:String(event.userId),locale,reply:answer?.text||null}
}
