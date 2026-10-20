import 'server-only'
import {transaction} from './database.js'
import {seal,openSealed} from './crypto.js'
import {AppError} from '../assessments/contracts.js'
import {
 MESSENGER_NOTIFICATION_CHANNELS,DEFAULT_MESSENGER_TOPICS,
 validateMessengerNotificationInput,maskMessengerDestination,
 normalizeMessengerTopics,
} from './messenger-notification-policy.js'

// This repository ONLY stores unverified preferences. It never delivers or links a Telegram chat ID.
const encryptionContext=(accountId,channel)=>({
 accountId,recordId:accountId,field:'notification.'+channel,
})
async function ensureAccount(db,accountId,lock=false){
 const row=(await db.query('select status,onboarding_state from app.accounts where id=$1'+
   (lock?' for update':''),[accountId])).rows[0]
 if(row?.status!=='active'||row.onboarding_state!=='active')
   throw new AppError('ACCOUNT_UNAVAILABLE',403)
}
function stateFromRows(rows,actor,config){
 const channels=Object.fromEntries(MESSENGER_NOTIFICATION_CHANNELS.map(channel=>[channel,{
   status:'not_connected',destinationHint:'',topics:{...DEFAULT_MESSENGER_TOPICS},
 }]))
 for(const row of rows){
   if(!MESSENGER_NOTIFICATION_CHANNELS.includes(row.channel))continue
   const contact=openSealed(row.destination_ciphertext,encryptionContext(actor.id,row.channel),config)
   channels[row.channel]={
     status:'pending',destinationHint:maskMessengerDestination(row.channel,contact?.destination),
     topics:normalizeMessengerTopics(row.topics),
     updatedAt:row.updated_at,
   }
 }
 return {channels,sendingEnabled:false,verificationAvailable:false,
   phase:'contact_capture'}
}
export function createMessengerNotificationRepository(config){
 const state=async actor=>transaction(config,actor,async db=>{
   await ensureAccount(db,actor.id)
   const rows=(await db.query('select channel,destination_ciphertext,topics,updated_at '+
     'from app_private.notification_messenger_requests where account_id=$1 order by channel',
     [actor.id])).rows
   return stateFromRows(rows,actor,config)
 })
 const mutate=async(actor,raw)=>{
   let input
   try{input=validateMessengerNotificationInput(raw)}
   catch{throw new AppError('INVALID_MESSENGER_NOTIFICATION_REQUEST',400)}
   await transaction(config,actor,async db=>{
     await ensureAccount(db,actor.id,true)
     if(input.action==='remove'){
       await db.query('delete from app_private.notification_messenger_requests '+
         'where account_id=$1 and channel=$2',[actor.id,input.channel])
       return
     }
     if(input.action==='preferences'){
       const result=await db.query('update app_private.notification_messenger_requests '+
         'set topics=$3::jsonb,locale=$4,consent_version=$5,updated_at=now() '+
         'where account_id=$1 and channel=$2',
         [actor.id,input.channel,JSON.stringify(input.topics),input.locale,input.noticeVersion])
       if(!result.rowCount)throw new AppError('CONTACT_NOT_REGISTERED',404)
       return
     }
     const encrypted=seal({destination:input.destination},
       encryptionContext(actor.id,input.channel),config)
     await db.query('insert into app_private.notification_messenger_requests '+
       '(account_id,channel,destination_ciphertext,topics,locale,consent_version) '+
       'values($1,$2,$3,$4::jsonb,$5,$6) '+
       'on conflict(account_id,channel) do update set '+
       'destination_ciphertext=excluded.destination_ciphertext,topics=excluded.topics,'+
       'locale=excluded.locale,consent_version=excluded.consent_version,updated_at=now()',
       [actor.id,input.channel,encrypted,JSON.stringify(input.topics),input.locale,input.noticeVersion])
   })
   return state(actor)
 }
 return {state,mutate}
}
