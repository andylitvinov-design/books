import 'server-only'
import {transaction} from '../app/database.js'
import {operationHash} from '../app/crypto.js'
import {businessHash} from './messenger-store.js'
import {channelTransportReady,whatsappPilotReady} from './messenger-policy.js'
import {whatsappHumanTakeoverCandidate} from './whatsapp-human-takeover-policy.mjs'
import {PRACTITIONER_ID} from '../../data/app-services.js'

// Called only after the signed Meta webhook and owner-connected CRM receipt.
// A manual owner takeover pauses the WhatsApp Secretary and free-review bot
// until the owner explicitly returns this particular conversation to Ali.
// No raw phone, message, photo, or clinical data reaches this lookup.
export async function whatsappHumanTakeoverActive(event,config,env=process.env){
 if(!whatsappHumanTakeoverCandidate(event,env)||
    !channelTransportReady('whatsapp',env))return false
 if(whatsappPilotReady(env)&&String(event.userId)!==String(env.HH_CRM_MSG_WHATSAPP_PILOT_WA_ID))
   return false
 const business=businessHash('whatsapp',String(event.accountId),config)
 const user=operationHash({scope:'crm-msg-user',provider:'whatsapp',
   accountDigest:business,userId:String(event.userId)},config)
 if(!/^[a-f0-9]{64}$/.test(business)||!/^[a-f0-9]{64}$/.test(user))
   return true // Unknown identity: never speak over a possible human reply.
 try{
   return await transaction(config,null,async db=>{
     const ready=(await db.query(
       "select pg_catalog.to_regprocedure('app_private.crm_msg_human_takeover_active_v1(text,text)') is not null as ready"
     )).rows[0]?.ready===true
     if(!ready)return true
     const state=(await db.query(
       'select app_private.crm_msg_human_takeover_active_v1($1,$2) as active',
       [business,user])).rows[0]
     return typeof state?.active==='boolean'?state.active:true
   },{inbox:true,practitionerId:PRACTITIONER_ID})
 }catch{
   console.error('HH_CRM_WA_HUMAN_TAKEOVER_GATE_UNCONFIRMED')
   return true // Fail closed for automatic replies; CRM intake remains available.
 }
}
