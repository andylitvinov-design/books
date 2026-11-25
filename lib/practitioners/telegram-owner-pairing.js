import 'server-only'
import {transaction} from '../app/database.js'
import {seal,openSealed} from '../app/crypto.js'
import {PRACTITIONER_ID} from '../../data/app-services.js'
import {discoverOwnerPrivateChat} from './telegram-owner-discovery.mjs'

const CONTEXT={accountId:PRACTITIONER_ID,recordId:PRACTITIONER_ID,field:'telegram_owner_chat'}
const TOKEN=/^\d{6,16}:[A-Za-z0-9_-]{25,}$/
const CHAT=/^\d{1,20}$/
const SAFE_STATUS=new Set([
  'wrong_bot','webhook_active','awaiting_new_start',
  'chat_identity_unverified','telegram_unavailable'
])

async function pairingRow(config){
  return transaction(config,null,async db=>{
    return (await db.query(
      'select chat_ciphertext,status from app_private.telegram_owner_pairings where practitioner_id=$1',
      [PRACTITIONER_ID])).rows[0]||null
  },{server:true})
}
export async function resolvedOwnerTelegramEnv(config,env=process.env){
  if(CHAT.test(env.HH_PRACTICE_TG_CHAT_ID||'')||
    !TOKEN.test(env.HH_PRACTICE_TG_BOT_TOKEN||''))return env
  const found=await pairingRow(config)
  if(!found?.chat_ciphertext)return env
  const verified=openSealed(found.chat_ciphertext,CONTEXT,config)
  if(!verified||!CHAT.test(verified.chatId))return env
  return {...env,HH_PRACTICE_TG_CHAT_ID:verified.chatId}
}
export async function ensureOwnerTelegramPairing(config,{
  env=process.env,fetcher=fetch,now=new Date()
}={}){
  if(!TOKEN.test(env.HH_PRACTICE_TG_BOT_TOKEN||''))return {status:'token_missing'}
  if(CHAT.test(env.HH_PRACTICE_TG_CHAT_ID||''))return {status:'already_configured'}
  const prior=await pairingRow(config)
  if(prior?.chat_ciphertext)return {status:'paired'}
  const found=await discoverOwnerPrivateChat(env,fetcher,now)
  const status=found.status==='verified'?'paired':
    SAFE_STATUS.has(found.status)?found.status:'telegram_unavailable'
  const ciphertext=status==='paired'
    ?seal({chatId:found.chatId},CONTEXT,config):null
  await transaction(config,null,async db=>{
    await db.query(
      'insert into app_private.telegram_owner_pairings '+
      '(practitioner_id,chat_ciphertext,status,checked_at,verified_at) '+
      'values($1,$2,$3,now(),case when $3=\'paired\' then now() else null end) '+
      'on conflict(practitioner_id) do update set '+
      'chat_ciphertext=coalesce(app_private.telegram_owner_pairings.chat_ciphertext,excluded.chat_ciphertext), '+
      'status=case when app_private.telegram_owner_pairings.chat_ciphertext is not null then \'paired\' else excluded.status end, '+
      'checked_at=now(), '+
      'verified_at=coalesce(app_private.telegram_owner_pairings.verified_at,excluded.verified_at)',
      [PRACTITIONER_ID,ciphertext,status])
  },{server:true})
  return {status}
}
