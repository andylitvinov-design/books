import 'server-only'
import {randomUUID} from 'node:crypto'
import {transaction,consumeRate} from './database.js'
import {operationHash,seal,openSealed} from './crypto.js'
import {PRACTITIONER_ID} from '../../data/app-services.js'
import {telegramClientBotMode,telegramClientBotUsername,
 telegramClientLinkReady,interpretTelegramClientUpdate} from './client-telegram-policy.js'
import {resolvedOwnerTelegramEnv} from '../practitioners/telegram-owner-pairing.js'
import {ownerBotCredentials} from '../practitioners/telegram-hub.mjs'
import {parseSubscriberAiUpdate,subscriberAiEnabled,subscriberAiResponse,
 SUBSCRIBER_AI_CONSENT_VERSION} from './subscriber-ai-policy.mjs'
import {subscriberVoiceReady,subscriberVoiceReplyAllowed,transcribeSubscriberVoice,voiceCopy,voiceDisclosureButtons} from './subscriber-ai-voice.mjs'
import {handleSubscriberQuiz,subscriberQuizSchemaEnabled,pruneSubscriberQuizRuns} from './subscriber-quiz-telegram.js'
import {quizCopy} from './subscriber-quiz-policy.mjs'

const SESSIONS='app_private.subscriber_ai_sessions'
const OUTBOX='app_private.subscriber_ai_outbox'
const TTL_MS=15*60*1000
const ctx=(id,field)=>({accountId:PRACTITIONER_ID,recordId:id,field:'subscriber_ai.'+field})
const schemaReady=(env)=>env.HH_SUBSCRIBER_AI_SCHEMA_READY==='true'&&telegramClientLinkReady(env)
function clientBot(env){
 const mode=telegramClientBotMode(env)
 const token=mode==='dedicated'?env.HH_CLIENT_TG_BOT_TOKEN:mode==='shared_practice'?env.HH_PRACTICE_TG_BOT_TOKEN:null
 const username=telegramClientBotUsername(env)
 const id=typeof token==='string'?token.match(/^(\d{6,16}):[A-Za-z0-9_-]{25,}$/)?.[1]:null
 if(!id||!username)return null
 return {id,username,token,mode}
}
const identity=(config,bot,chatId)=>operationHash({scope:'hh-subscriber-ai-chat-v1',botId:bot.id,chatId},config)
async function aiTx(config,action){
 return transaction(config,null,async db=>{
  await db.query("select set_config('hh.subscriber_ai','1',true)")
  return action(db)
 },{server:true})
}
// Never authorize owner AI commands for subscribers on the shared practice bot.
async function isOwnerChat(config,bot,chatId,env){
 if(bot.mode!=='shared_practice')return false
 const paired=await resolvedOwnerTelegramEnv(config,env)
 const credentials=ownerBotCredentials(paired)
 const owner=String(credentials?.chat||'')
 // A missing verified owner binding is a configuration failure, not permission to use owner context.
 if(!/^\d{5,20}$/.test(owner))throw Error('SUBSCRIBER_AI_OWNER_PAIRING_MISSING')
 return owner===chatId
}
async function writeResponse(db,config,session,updateId,kind,response){
 const id=randomUUID()
 const payload=seal(response,ctx(id,'outbox'),config)
 await db.query(`insert into ${OUTBOX}(id,session_id,update_id,kind,payload_ciphertext)
  values($1,$2,$3,$4,$5) on conflict(session_id,update_id) do nothing`,
  [id,session.id,updateId,kind,payload])
}
async function purgeQuiz(db,sessionId){
  // Opt-outs still purge data if the feature flag was switched OFF after launch.
  const available=(await db.query("select to_regclass('app_private.subscriber_quiz_runs') as quiz_table")).rows[0]?.quiz_table
  if(available)await db.query('delete from app_private.subscriber_quiz_runs where session_id=$1',[sessionId])
}
async function revokeChat(config,bot,chatId){
 const chatHash=identity(config,bot,chatId)
 return aiTx(config,async db=>{
  const session=(await db.query(`select id from ${SESSIONS} where chat_hash=$1 for update`,[chatHash])).rows[0]
  if(!session)return false
  await purgeQuiz(db,session.id)
  await db.query(`update ${OUTBOX} set status='suppressed',updated_at=now()
    where session_id=$1 and status in ('pending','leased')`,[session.id])
  await db.query(`update ${SESSIONS} set consent_at=null,consent_version=null,pending_at=null,
    stopped_at=now(),chat_ciphertext=null,voice_consent_at=null,
    voice_pending_at=null,updated_at=now() where id=$1`,[session.id])
  return true
 })
}
/** Invoked solely after the existing signed client-bot webhook and owner branches. */
export async function receiveSubscriberAiTelegramUpdate(config,update,env=process.env){
 if(!schemaReady(env))return {handled:false}
 const bot=clientBot(env)
 if(!bot)return {handled:false}
 const old=interpretTelegramClientUpdate(update)
 if(old?.type==='stop'){
  await revokeChat(config,bot,old.chatId)
  // Existing global /stop must still revoke ordinary Telegram materials/notifications.
  return {handled:false}
 }
 if(!subscriberAiEnabled(env))return {handled:false}
 const event=parseSubscriberAiUpdate(update,bot.username)
 if(!event)return {handled:false}
 if(await isOwnerChat(config,bot,event.chatId,env))return {handled:false}
 const chatHash=identity(config,bot,event.chatId)
 return aiTx(config,async db=>{
  await db.query('select pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended($1,0))',
    ['hh-subscriber-ai:'+chatHash])
  let session=(await db.query(`select * from ${SESSIONS} where chat_hash=$1 for update`,[chatHash])).rows[0]
  // Before opt-in, no arbitrary free text, content or private link is retained.
  if(!session&&!['open','disable','tests'].includes(event.action))return {handled:false}
  if(!session){
   const id=randomUUID()
   await db.query(`insert into ${SESSIONS}(id,chat_hash,chat_ciphertext,locale,pending_at)
      values($1,$2,$3,$4,now())`,[id,chatHash,seal({chatId:event.chatId},ctx(id,'chat'),config),event.locale])
   session={id,locale:event.locale,pending_at:new Date(),consent_at:null,
     consent_version:null,last_update_id:null,stopped_at:null}
  }
  // Exact-bot/chat dedup also prevents out-of-order callbacks reactivating a stopped session.
  if(session.last_update_id!==null&&event.updateId<=Number(session.last_update_id))
    return {handled:true,duplicate:true,callbackId:event.callbackId}
  if((event.action==='chat'||event.action.startsWith('voice'))&&!session.consent_at)
    return {handled:false}
  if(!session.consent_at&&!['open','enable','decline','disable','quiz-off','tests'].includes(event.action))
    return {handled:false}
  let action=event.action
  // Explicit /tests also reaches a fresh user: request AI consent instead of silence.
  if(action==='tests'&&!session.consent_at)action='open'
  if(action==='open' && session.consent_at &&
     session.consent_version===SUBSCRIBER_AI_CONSENT_VERSION)action='hello'
  const pendingAge=session.pending_at?Date.now()-new Date(session.pending_at).getTime():Infinity
  if(action==='enable' && (pendingAge<0||pendingAge>TTL_MS))action='open'
  if(action==='enable' && session.stopped_at && !session.pending_at)action='open'
  if(action==='decline'&&!session.pending_at)return {handled:true,callbackId:event.callbackId}

  if(action==='quiz-off'){
   await purgeQuiz(db,session.id)
   await db.query(`update ${SESSIONS} set last_update_id=$2,updated_at=now() where id=$1`,[session.id,event.updateId])
   if(session.consent_at)await writeResponse(db,config,session,event.updateId,'tests',
     {text:quizCopy(event.locale).deleted})
   return {handled:true,queued:Boolean(session.consent_at),callbackId:event.callbackId}
  }
  if(action==='tests'||action==='quiz'){
   if(!session.consent_at||session.consent_version!==SUBSCRIBER_AI_CONSENT_VERSION)return {handled:false}
   // One large legitimate 115-question questionnaire must remain possible, but
   // an abusive callback loop must not become an unbounded Telegram send queue.
   const total=Number((await db.query(`select count(*)::int as n from ${OUTBOX}
     where session_id=$1 and created_at>now()-interval '24 hours'`,[session.id])).rows[0]?.n||0)
   if(total>=260)return {handled:true,limited:true,callbackId:event.callbackId}
   const reply=subscriberQuizSchemaEnabled(env)
     ?await handleSubscriberQuiz(db,config,session,event,event.locale)
     :subscriberAiResponse('tests',event.locale)
   await db.query(`update ${SESSIONS} set last_update_id=$2,updated_at=now() where id=$1`,[session.id,event.updateId])
   await writeResponse(db,config,session,event.updateId,'tests',reply)
   return {handled:true,queued:true,callbackId:event.callbackId}
  }
  if(action.startsWith('voice')){
   // User must already have AI-chat consent; voice needs a second independent,
   // revocable permission. Unconsented audio file IDs are NEVER queued.
   const voiceSchema=env.HH_SUBSCRIBER_AI_VOICE_SCHEMA_READY==='true'
   const ready=voiceSchema&&subscriberVoiceReady(env)
   let kind='chat',reply
   if(action==='voice-disable'&&voiceSchema){
    await db.query(`update ${SESSIONS} set voice_consent_at=null,
      voice_pending_at=null,last_update_id=$2,updated_at=now() where id=$1`,
      [session.id,event.updateId])
    await db.query(`update ${OUTBOX} set status='suppressed',updated_at=now()
      where session_id=$1 and kind in ('voice','voice_reply') and status in ('pending','leased')`,[session.id])
    reply={text:voiceCopy(session.locale,'disabled')}
   }else if(!ready){
    await db.query(`update ${SESSIONS} set last_update_id=$2,updated_at=now() where id=$1`,
      [session.id,event.updateId])
    reply={text:voiceCopy(session.locale,'unavailable')}
   }else if(action==='voice-open'){
    await db.query(`update ${SESSIONS} set voice_pending_at=now(),
      last_update_id=$2,updated_at=now() where id=$1`,[session.id,event.updateId])
    reply={text:voiceCopy(session.locale,'intro'),
      keyboard:voiceDisclosureButtons(session.locale)}
   }else if(action==='voice-enable'){
    const age=session.voice_pending_at?
      Date.now()-new Date(session.voice_pending_at).getTime():Infinity
    if(age>=0&&age<=TTL_MS&&!session.stopped_at){
     await db.query(`update ${SESSIONS} set voice_consent_at=now(),
       voice_pending_at=null,last_update_id=$2,updated_at=now() where id=$1`,
       [session.id,event.updateId])
     reply={text:voiceCopy(session.locale,'enabled')}
    }else{
     await db.query(`update ${SESSIONS} set voice_pending_at=now(),
       last_update_id=$2,updated_at=now() where id=$1`,[session.id,event.updateId])
     reply={text:voiceCopy(session.locale,'intro'),
       keyboard:voiceDisclosureButtons(session.locale)}
    }
   }else if(action==='voice'){
    await db.query(`update ${SESSIONS} set last_update_id=$2,updated_at=now()
      where id=$1`,[session.id,event.updateId])
    if(session.voice_consent_at){
     kind='voice'
     reply={fileId:event.voice.fileId,bytes:event.voice.bytes,
       seconds:event.voice.seconds,mime:'audio/ogg',locale:session.locale}
    }else reply={text:voiceCopy(session.locale,'first')}
   }
   await writeResponse(db,config,session,event.updateId,kind,reply)
   return {handled:true,queued:true,callbackId:event.callbackId}
  }
  if(action==='open'){
   await db.query(`update ${SESSIONS} set pending_at=now(),locale=$2,
     stopped_at=null,chat_ciphertext=$3,updated_at=now(),last_update_id=$4 where id=$1`,
    [session.id,event.locale,seal({chatId:event.chatId},ctx(session.id,'chat'),config),event.updateId])
  }else if(action==='enable'){
   await db.query(`update ${SESSIONS} set consent_at=now(),consent_version=$2,
     pending_at=null,stopped_at=null,updated_at=now(),last_update_id=$3 where id=$1`,
    [session.id,SUBSCRIBER_AI_CONSENT_VERSION,event.updateId])
  }else if(action==='disable'||action==='decline'){
   await purgeQuiz(db,session.id)
   await db.query(`update ${OUTBOX} set status='suppressed',updated_at=now()
     where session_id=$1 and status in ('pending','leased')`,[session.id])
   await db.query(`update ${SESSIONS} set consent_at=null,consent_version=null,
     pending_at=null,voice_consent_at=null,voice_pending_at=null,
     updated_at=now(),last_update_id=$2 where id=$1`,[session.id,event.updateId])
  }else{
   await db.query(`update ${SESSIONS} set updated_at=now(),last_update_id=$2 where id=$1`,
     [session.id,event.updateId])
  }
  if(action==='chat'){
   const count=Number((await db.query(`select count(*)::int as n from ${OUTBOX}
     where session_id=$1 and created_at>now()-interval '24 hours'`,[session.id])).rows[0]?.n||0)
   if(count>=50)return {handled:true,limited:true,callbackId:event.callbackId}
  }
  await writeResponse(db,config,session,event.updateId,action,subscriberAiResponse(action,event.locale,event.text))
  return {handled:true,queued:true,callbackId:event.callbackId}
 })
}

async function providerCall(token,method,body){
 try{
  const response=await fetch('https://api.telegram.org/bot'+encodeURIComponent(token)+'/'+method,{
   method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),
   redirect:'error',cache:'no-store',signal:AbortSignal.timeout(8500)})
  const payload=await response.json()
  if(response.status===429)return {status:'rate',after:Math.min(120,Math.max(1,Number(payload?.parameters?.retry_after)||5))}
  if(response.ok&&payload?.ok===true&&Number.isSafeInteger(payload?.result?.message_id))
   return {status:'accepted',id:String(payload.result.message_id)}
  return {status:response.status>=400&&response.status<500?'rejected':'unknown'}
 }catch{return {status:'unknown'}}
}

/** Acknowledge only a verified callback from our own client bot. No chat data in logs. */
export async function answerSubscriberAiCallback(callbackId,env=process.env){
 const bot=clientBot(env)
 if(!bot||!subscriberAiEnabled(env)||typeof callbackId!=='string'||callbackId.length>128)return
 try{
  await fetch('https://api.telegram.org/bot'+encodeURIComponent(bot.token)+'/answerCallbackQuery',{
   method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify({callback_query_id:callbackId,cache_time:0}),
   cache:'no-store',redirect:'error',signal:AbortSignal.timeout(3000)})
 }catch{}
}

async function claimOne(config){
 return aiTx(config,async db=>{
  // An uncertain Telegram send MUST NOT be automatically resent after a crash.
  await db.query(`update ${OUTBOX} set status='unknown',updated_at=now()
    where status='leased' and lease_until<now()`)
  const job=(await db.query(`with candidate as (
     select id from ${OUTBOX} where status='pending' and available_at<=now()
     order by created_at,id for update skip locked limit 1)
    update ${OUTBOX} o set status='leased',lease_until=now()+interval '90 seconds',
      attempts=attempts+1,updated_at=now() from candidate
    where o.id=candidate.id returning o.id,o.kind`,[])).rows[0]
  return job?{id:job.id,kind:job.kind}:null
 })
}

async function resolveOneVoice(config,id,bot,env=process.env){
 // Consent is examined BEFORE every external request. No DB locks are held
 // across the Telegram download or Gemini free-tier transcription.
 const prior=await aiTx(config,async db=>{
  const target=(await db.query(`select session_id from ${OUTBOX} where id=$1`,[id])).rows[0]
  if(!target)return null
  const session=(await db.query(`select * from ${SESSIONS} where id=$1 for update`,
    [target.session_id])).rows[0]
  const job=(await db.query(`select * from ${OUTBOX}
    where id=$1 and kind='voice' and status='leased' for update`,[id])).rows[0]
  if(!job)return null
  if(!subscriberVoiceReady(env)||env.HH_SUBSCRIBER_AI_VOICE_SCHEMA_READY!=='true'||
     !session?.consent_at||session.stopped_at||!session.voice_consent_at){
   await db.query(`update ${OUTBOX} set status='suppressed',updated_at=now() where id=$1`,[id])
   return null
  }
  const voice=openSealed(job.payload_ciphertext,ctx(job.id,'outbox'),config)
  return {sessionId:session.id,locale:session.locale,voice}
 })
 if(!prior)return 'suppressed'
 let answer
 try{
  await consumeRate(config,{op:'hh-subscriber-stt-global'},30,86400)
  await consumeRate(config,{op:'hh-subscriber-stt-chat',id:prior.sessionId},8,86400)
  const recognized=await transcribeSubscriberVoice(prior.voice,{
   token:bot.token,key:env.HH_SUBSCRIBER_AI_STT_GEMINI_KEY})
  const reviewed=subscriberAiResponse('chat',prior.locale,recognized)
  answer={...reviewed,text:voiceCopy(prior.locale,'heard')+': «'+recognized+'»\n\n'+reviewed.text}
 }catch{
  answer={text:voiceCopy(prior.locale,'failed')}
 }
 return aiTx(config,async db=>{
  const session=(await db.query(`select * from ${SESSIONS} where id=$1 for update`,
    [prior.sessionId])).rows[0]
  const job=(await db.query(`select * from ${OUTBOX}
    where id=$1 and kind='voice' and status='leased' for update`,[id])).rows[0]
  if(!job||!session?.consent_at||session.stopped_at||!session.voice_consent_at||
     !subscriberVoiceReady(env)){
   if(job)await db.query(`update ${OUTBOX} set status='suppressed',
    updated_at=now() where id=$1`,[id])
   return 'suppressed'
  }
  await db.query(`update ${OUTBOX} set kind='voice_reply',payload_ciphertext=$2,
    status='pending',available_at=now(),lease_until=null,updated_at=now()
    where id=$1 and status='leased' and kind='voice'`,
    [id,seal(answer,ctx(id,'outbox'),config)])
  return 'ready'
 })
}

async function sendOne(config,id,bot,env=process.env){
 return aiTx(config,async db=>{
  // Use the SAME lock order as /stop and /ai_off: session before outbox.
  const target=(await db.query(`select session_id from ${OUTBOX} where id=$1`,[id])).rows[0]
  if(!target)return 'skip'
  const s=(await db.query(`select * from ${SESSIONS} where id=$1 for update`,[target.session_id])).rows[0]
  const j=(await db.query(`select * from ${OUTBOX} where id=$1 and status='leased' for update`,[id])).rows[0]
  if(!j)return 'skip'
  const eligible=Boolean(s&&!s.stopped_at && (
    (s.consent_at&&s.consent_version===SUBSCRIBER_AI_CONSENT_VERSION &&
      !['open','decline','disable'].includes(j.kind)) ||
    (!s.consent_at&&s.pending_at&&j.kind==='open') ||
    (!s.consent_at&&!s.pending_at&&['disable','decline'].includes(j.kind))
  )) && subscriberVoiceReplyAllowed(j.kind,s,env)
  if(!eligible||!s.chat_ciphertext){
   await db.query(`update ${OUTBOX} set status='suppressed',updated_at=now() where id=$1`,[id])
   return 'suppressed'
  }
  const chatId=String(openSealed(s.chat_ciphertext,ctx(s.id,'chat'),config)?.chatId||'')
  if(!/^\d{5,20}$/.test(chatId)){
   await db.query(`update ${OUTBOX} set status='dead',updated_at=now() where id=$1`,[id])
   return 'dead'
  }
  const reply=openSealed(j.payload_ciphertext,ctx(j.id,'outbox'),config)
  if(typeof reply?.text!=='string'||reply.text.length>3900){
   await db.query(`update ${OUTBOX} set status='dead',updated_at=now() where id=$1`,[id])
   return 'dead'
  }
  // No paid Telegram broadcast or content delivery. A public, rules-only answer.
  const response=await providerCall(bot.token,'sendMessage',{
   chat_id:chatId,text:reply.text,allow_paid_broadcast:false,
   link_preview_options:{is_disabled:true},
   ...(reply.keyboard?{reply_markup:reply.keyboard}:{})})
  const status=response.status==='accepted'?'done':response.status==='rejected'?'dead':
    response.status==='rate'&&j.attempts<4?'pending':'unknown'
  await db.query(`update ${OUTBOX} set status=$2,provider_message_id=$3,
    available_at=case when $2='pending' then now()+($4*interval '1 second') else available_at end,
    lease_until=null,updated_at=now() where id=$1`,
    [id,status,response.id||null,response.after||0])
  return status
 })
}
export async function drainSubscriberAiOutbox(config,env=process.env,{limit=2}={}){
 if(!subscriberAiEnabled(env)||!schemaReady(env))return {status:'disabled'}
 const bot=clientBot(env)
 if(!bot)return {status:'disabled'}
 const result={status:'processed',count:0,unknown:0}
 for(let n=0;n<Math.min(3,Math.max(0,limit));n++){
  const job=await claimOne(config)
  if(!job)break
  const status=job.kind==='voice'
    ?await resolveOneVoice(config,job.id,bot,env)
    :await sendOne(config,job.id,bot,env)
  result.count++
  if(status==='unknown')result.unknown++
 }
 return result
}
export async function pruneSubscriberAiState(config,env=process.env){
 if(!schemaReady(env))return {purged:false}
 return aiTx(config,async db=>{
  await db.query(`delete from ${OUTBOX} where id in (
   select id from ${OUTBOX} where created_at<now()-interval '30 days'
   order by created_at,id limit 100 for update skip locked)`) 
  const quizExists=(await db.query("select to_regclass('app_private.subscriber_quiz_runs') as quiz_table")).rows[0]?.quiz_table
  if(quizExists)await pruneSubscriberQuizRuns(db)
  await db.query(`delete from ${SESSIONS} where id in (
   select id from ${SESSIONS} where
    (consent_at is null and updated_at<now()-interval '7 days') or
    (updated_at<now()-interval '90 days')
   order by updated_at,id limit 100 for update skip locked)`) 
  return {purged:true}
 })
}
