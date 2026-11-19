import 'server-only'
import {transaction} from '../app/database.js'
import {PRACTITIONER_ID} from '../../data/app-services.js'

// Runs only for first-party, signature-verified Bot messages. Never takes raw
// customer text, photo or provider ID; separate from the Business account.
export async function telegramHumanTakeoverActive(config,keys){
 if(!/^[a-f0-9]{64}$/.test(String(keys?.business||''))||
    !/^[a-f0-9]{64}$/.test(String(keys?.user||'')))return false
 try{
   return await transaction(config,null,async db=>{
     const ready=(await db.query(
       "select pg_catalog.to_regprocedure('app_private.crm_msg_human_takeover_active_v1(text,text)') is not null as ready"
     )).rows[0]?.ready===true
     if(!ready)return false
     const row=(await db.query(
       'select app_private.crm_msg_human_takeover_active_v1($1,$2) as active',
       [keys.business,keys.user])).rows[0]
     return row?.active===true
   },{inbox:true,practitionerId:PRACTITIONER_ID})
 }catch{
   console.error('HH_CRM_HUMAN_TAKEOVER_GATE_UNCONFIRMED')
   return false
 }
}
