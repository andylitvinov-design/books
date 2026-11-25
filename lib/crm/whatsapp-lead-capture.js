import 'server-only'
import {webhookTransaction,ingestMessengerEventInTransaction,ingestMessengerUpdate} from './messenger-webhook.js'
import {businessHash} from './messenger-store.js'
import {operationHash} from '../app/crypto.js'
import {channelTransportReady,whatsappPilotReady} from './messenger-policy.js'
import {whatsappCrmInboundCandidate} from './whatsapp-lead-capture-policy.mjs'
import {AppError} from '../assessments/contracts.js'

/** Only called after verified Meta X-Hub-Signature-256, for one enabled,
 * owner-connected WhatsApp Cloud API phone number. A first contact is not
 * a booking, a diagnostic consent or marketing permission. */
export async function captureWhatsAppFirstContact(event,config,env=process.env){
  if(!whatsappCrmInboundCandidate(event,env))return {handled:false,created:false}
  if(!channelTransportReady('whatsapp',env))return {handled:false,created:false}
  if(whatsappPilotReady(env)&&String(event.userId)!==String(env.HH_CRM_MSG_WHATSAPP_PILOT_WA_ID))
    return {handled:false,created:false}
  const digest=businessHash('whatsapp',String(event.accountId),config)
  return webhookTransaction(config,async db=>{
    const connected=(await db.query(
      'select owner_id,account_id from app_private.crm_msg_resolve($1,$2)',
      ['whatsapp',digest])).rows[0]
    if(!connected?.owner_id||!connected?.account_id)
      throw new AppError('WHATSAPP_CRM_ACCOUNT_UNCONFIRMED',503)
    // Respect previously committed STOP even if an older Meta message is
    // replayed later. This is the same serialized lock as diagnostic intake.
    const userHash=operationHash({scope:'crm-msg-user',provider:'whatsapp',
      accountDigest:digest,userId:String(event.userId)},config)
    await db.query('select pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended($1,0))',
      [digest+':'+userHash])
    const stopped=(await db.query(
      "select 1 from app_private.crm_wa_diagnostic_sessions "+
      "where business_hash=$1 and user_hash=$2 and stage='stopped' limit 1",
      [digest,userHash])).rows[0]
    if(stopped)return {handled:true,created:false,suppressed:true}
    // hh_app_inbox cannot INSERT directly into contacts or opportunities.
    // The existing owner-scoped, role-granted SECURITY DEFINER operation
    // atomically creates contact, thread and encrypted neutral first receipt.
    // Deterministic IDs dedupe Meta's retries, never the customer's later text.
    const created=await ingestMessengerEventInTransaction(db,'whatsapp',{
      ...event,
      eventId:'wa:first-contact:'+event.userId,
      messageId:'wa:first-contact:'+event.userId,
      body:'WhatsApp conversation started',
      rawText:'',photoFileId:null,whatsappPhotoMediaId:null,
      stop:false,
    },config,digest)
    return {handled:true,created}
  })
}
/** Record exactly one neutral fallback for each inbound provider message.
 * Consent-gated diagnostic writes use the original provider event ID.
 * If already stored, crm_msg_ingest's event ledger makes this a no-op. */
export async function recordWhatsAppInboundReceipt(event,config,env=process.env){
  if(!whatsappCrmInboundCandidate(event,env)||
    !channelTransportReady('whatsapp',env))return {recorded:false}
  if(whatsappPilotReady(env)&&String(event.userId)!==String(env.HH_CRM_MSG_WHATSAPP_PILOT_WA_ID))
    return {recorded:false}
  const recorded=await ingestMessengerUpdate('whatsapp',{
    ...event,body:'WhatsApp message received',rawText:'',
    photoFileId:null,whatsappPhotoMediaId:null,
    whatsappPhotoPurpose:null,stop:false,
  },config,env)
  return {recorded:recorded===true}
}
