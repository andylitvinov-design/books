import 'server-only'
import {randomUUID} from 'node:crypto'
import {transaction} from '../app/database.js'
import {PRACTITIONER_ID} from '../../data/app-services.js'
import {resolvedOwnerTelegramEnv} from './telegram-owner-pairing.js'
import {ownerBotCredentials,verifyOwnerTelegram,sendOwnerDocument} from './telegram-hub.mjs'

// This is a one-time consented OWNER test, not a daily report. Its independent
// journal guarantees a browser refresh or double tap never repeats the send.
async function record(config){
  return transaction(config,null,async db=>(await db.query(
    'select status,test_status,(test_sent_at is not null) as test_accepted '+ 
    'from app_private.telegram_owner_pairings where practitioner_id=$1',
    [PRACTITIONER_ID]
  )).rows[0]||null,{server:true})
}
async function latestCouncilReceipt(config){
  return transaction(config,null,async db=>{
    return (await db.query(
      "select report_day::text as day,status,model_outcomes "+
      "from app_private.council_telegram_deliveries "+
      "order by report_day desc limit 1"
    )).rows[0]||null
  },{server:true})
}
export async function ownerTelegramSetupStatus(config,env=process.env){
  const [data,council]=await Promise.all([record(config),latestCouncilReceipt(config)])
  return {
    council:council?{
      date:council.day,status:council.status,
      gemini:council.model_outcomes?.gemini||'unavailable',
      mistral:council.model_outcomes?.mistral||'unavailable',
    }:null,
    token_saved:Boolean(env.HH_PRACTICE_TG_BOT_TOKEN),
    telegram_enabled:env.HH_PRACTICE_TG_ENABLED==='true',
    pairing:data?.status||'not_started',
    test:data?.test_status||'not_sent',
    test_accepted:data?.test_accepted===true,
  }
}
async function claimTest(config){
  const claimId=randomUUID()
  return transaction(config,null,async db=>{
    const got=await db.query(
      "update app_private.telegram_owner_pairings "+
      "set test_status='sending',test_claim_token=$2,test_claimed_at=now(),"+
      "test_attempts=test_attempts+1 "+
      "where practitioner_id=$1 and status='paired' "+
      "and chat_ciphertext is not null and test_status is null "+
      "returning test_claim_token",
      [PRACTITIONER_ID,claimId]
    )
    return got.rowCount===1?claimId:null
  },{server:true})
}
async function recordTestResult(config,claimId,accepted){
  return transaction(config,null,async db=>{
    const updated=await db.query(
      'update app_private.telegram_owner_pairings set '+
      "test_status=$3,test_sent_at=case when $3='accepted' then now() else null end "+
      "where practitioner_id=$1 and test_claim_token=$2 and test_status='sending' "+
      'returning test_claim_token',
      [PRACTITIONER_ID,claimId,accepted?'accepted':'uncertain']
    )
    return updated.rowCount===1
  },{server:true})
}
export async function sendOwnerTelegramTest(config,{env=process.env,fetcher=fetch}={}){
  if(env.HH_PRACTICE_TG_ENABLED!=='true')return {status:'sender_disabled'}
  const current=await ownerTelegramSetupStatus(config,env)
  if(current.pairing!=='paired')return {status:'not_paired'}
  if(current.test==='accepted')return {status:'already_accepted'}
  if(current.test!=='not_sent')return {status:'uncertain_previously_attempted'}

  const effective=await resolvedOwnerTelegramEnv(config,env)
  if(!ownerBotCredentials(effective))return {status:'not_paired'}
  // Verify both *real* private chat and exact BotFather username before claim.
  let identity
  try{identity=await verifyOwnerTelegram(effective,fetcher)}
  catch{return {status:'identity_unavailable'}}
  if(!identity.verified)return {status:'identity_mismatch'}

  const claimed=await claimTest(config)
  if(!claimed)return {status:'already_started'}
  try{
    await sendOwnerDocument({
      mode:'report',
      title:'Проверка подключения · Holistic House',
      markdown:'# Holistic House — проверка Telegram\n\n'+
        '✅ Бот @Andydotbot связан с личным чатом @AndyTherapist.\n\n'+
        'Это одно тестовое сообщение. Ежедневные отчёты и статистика '+
        'отправляются отдельно по расписанию, если доступны реальные данные.\n'+
        'Никаких клиентских записей и результатов тестирования во вложении нет.\n',
      sources:['Holistic House owner-only pairing'],
    },effective,fetcher)
    if(!await recordTestResult(config,claimed,true))
      return {status:'delivery_unconfirmed'}
    return {status:'accepted'}
  }catch{
    // An unknown Bot API network outcome might already have delivered.
    // Never auto-retry and accidentally send a duplicate test message.
    await recordTestResult(config,claimed,false).catch(()=>{})
    return {status:'delivery_unconfirmed'}
  }
}
