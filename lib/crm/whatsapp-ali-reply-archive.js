import 'server-only'
import {randomUUID} from 'node:crypto'
import {transaction} from '../app/database.js'
import {seal,operationHash} from '../app/crypto.js'
import {businessHash,providerMessageHash} from './messenger-store.js'
import {channelTransportReady,whatsappPilotReady} from './messenger-policy.js'
import {whatsappAliReplyArchiveCandidate} from './whatsapp-ali-reply-archive-policy.mjs'
import {PRACTITIONER_ID} from '../../data/app-services.js'

// Runs only AFTER a signed, customer-initiated WhatsApp event led to an
// accepted Meta Cloud API response. Only the owner-inbox DB role may archive.
// The RPC independently re-checks explicit private-session consent, STOP,
// enabled WhatsApp account, verified CRM thread and no human takeover.
// A failed archival operation must never result in a SECOND provider send.
export async function archiveWhatsAppAliAcceptedReply(event,config,text,providerId,env=process.env){
 if(!whatsappAliReplyArchiveCandidate(event,text,providerId,env)||
    !channelTransportReady('whatsapp',env))return false
 if(whatsappPilotReady(env)&&String(event.userId)!==String(env.HH_CRM_MSG_WHATSAPP_PILOT_WA_ID))
   return false
 const accountDigest=businessHash('whatsapp',String(event.accountId),config)
 const userHash=operationHash({scope:'crm-msg-user',provider:'whatsapp',
   accountDigest,userId:String(event.userId)},config)
 const providerHash=providerMessageHash('whatsapp',String(providerId),config)
 if(![accountDigest,userHash,providerHash].every(x=>/^[a-f0-9]{64}$/.test(String(x))))
   return false
 return transaction(config,null,async db=>{
   // The private resolver accepts only an enabled, active, connected owner.
   const connected=(await db.query(
     'select owner_id,account_id from app_private.crm_msg_resolve($1,$2)',
     ['whatsapp',accountDigest])).rows[0]
   if(!connected?.owner_id||!connected?.account_id)return false
   const id=randomUUID()
   const body=seal({text,sender:'Ali'},
     {accountId:connected.owner_id,recordId:id,field:'crm.msgbody'},config)
   const ready=(await db.query(
     "select pg_catalog.to_regprocedure('app_private.crm_msg_wa_archive_ali_reply_v1(text,text,uuid,text,text)') is not null as ready"
   )).rows[0]?.ready===true
   if(!ready)return false
   const result=(await db.query(
     'select app_private.crm_msg_wa_archive_ali_reply_v1($1,$2,$3,$4,$5) as saved',
     [accountDigest,userHash,id,body,providerHash])).rows[0]
   return result?.saved===true
 },{inbox:true,practitionerId:PRACTITIONER_ID})
}
