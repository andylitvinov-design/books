import 'server-only'
import {randomUUID} from 'node:crypto'
import {transaction} from '../app/database.js'
import {getAppConfig} from '../app/config.js'
import {operationHash,seal} from '../app/crypto.js'
import {businessHash,providerMessageHash} from './messenger-store.js'
import {channelTransportReady,telegramBotBusinessId} from './messenger-policy.js'
import {PRACTITIONER_ID} from '../../data/app-services.js'
import {AppError} from '../assessments/contracts.js'

// One canonical, signed Telegram Bot chat. Never map by a display name,
// phone, username, or unverified Telegram Business chat ID.
export function telegramBotKeys(config,user,env=process.env){
 const bot=telegramBotBusinessId(env)
 if(!/^[0-9]{5,25}$/.test(String(bot||''))||
   !/^[0-9]{1,25}$/.test(String(user||'')))return null
 const business=businessHash('telegram',bot,config)
 const peer=operationHash({scope:'crm-msg-user',provider:'telegram',
   accountDigest:business,userId:String(user)},config)
 return {business,user:peer}
}
const EMPTY=Object.freeze({manual:false,shared:false,shouldPrompt:false,ownerId:null})
export async function telegramBotChatMode(config,keys,action='peek'){
 if(!keys||!/^[0-9a-f]{64}$/.test(keys.business)||
   !/^[0-9a-f]{64}$/.test(keys.user))return EMPTY
 if(!['peek','share_on','share_off','nudge'].includes(action))throw new AppError('INVALID_ACTION',400)
 try{
  return await transaction(config,null,async db=>{
   const ready=(await db.query(
    "select pg_catalog.to_regprocedure('app_private.crm_msg_bot_chat_mode_v1(text,text,text)') is not null as ready"
   )).rows[0]?.ready===true
   if(!ready)return EMPTY
   const r=(await db.query(
    'select is_manual,is_shared,should_prompt,owner_id from app_private.crm_msg_bot_chat_mode_v1($1,$2,$3)',
    [keys.business,keys.user,action])).rows[0]
   return {manual:r?.is_manual===true,shared:r?.is_shared===true,
     shouldPrompt:r?.should_prompt===true,ownerId:r?.owner_id||null}
  },{inbox:true,practitionerId:PRACTITIONER_ID})
 }catch{
  console.error('HH_CRM_BOT_CHAT_STATE_UNCONFIRMED')
  return EMPTY
 }
}
// Prevent an old V3 after() completion from speaking over a personal reply.
// Isolated source tests without live CRM credentials remain provider-only.
export async function guardTelegramBotAutoReply(to,env=process.env){
 if(env.VERCEL_ENV!=='production'||!env.HH_APP_DATABASE_URL||
   !channelTransportReady('telegram',env))return
 const config=getAppConfig(env),keys=telegramBotKeys(config,to,env)
 const mode=await telegramBotChatMode(config,keys)
 if(mode.manual)throw new AppError('HUMAN_TAKEOVER_ACTIVE',409)
}
export async function archiveTelegramBotAcceptedReply({to,text,providerId},env=process.env){
 if(env.VERCEL_ENV!=='production'||!env.HH_APP_DATABASE_URL||
   !channelTransportReady('telegram',env)||
   typeof text!=='string'||!text.trim()||
   !/^[0-9]{1,25}$/.test(String(providerId||'')))return false
 const config=getAppConfig(env),keys=telegramBotKeys(config,to,env)
 const mode=await telegramBotChatMode(config,keys)
 if(!mode.shared||mode.manual||!mode.ownerId)return false
 const id=randomUUID()
 const cipher=seal({text,sender:'bot'},
   {accountId:mode.ownerId,recordId:id,field:'crm.msgbody'},config)
 const hashedProviderId=providerMessageHash('telegram',providerId,config)
 return transaction(config,null,async db=>{
  const ready=(await db.query(
   "select pg_catalog.to_regprocedure('app_private.crm_msg_bot_archive_reply_v1(text,text,uuid,text,text)') is not null as ready"
  )).rows[0]?.ready===true
  if(!ready)return false
  const row=(await db.query(
   'select app_private.crm_msg_bot_archive_reply_v1($1,$2,$3,$4,$5) as saved',
   [keys.business,keys.user,id,cipher,hashedProviderId])).rows[0]
  return row?.saved===true
 },{inbox:true,practitionerId:PRACTITIONER_ID})
}
