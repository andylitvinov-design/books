import 'server-only'
import {randomUUID} from 'node:crypto'
import {transaction} from './database.js'
import {seal,openSealed,operationHash} from './crypto.js'
import {PRACTITIONER_ID} from '../../data/app-services.js'
import {businessHash} from '../crm/messenger-store.js'
import {telegramBotBusinessId} from '../crm/messenger-policy.js'
import {aiCopy,telegramAiIntent,classifyTelegramUpdate,replyForClient} from '../crm/telegram-ai-lanes.mjs'
import {verifyAiVideoBoundAccount,currentAiVideoAccount,aiQueueClientBotIdentityReady} from './telegram-ai-account-boundary.js'
import {validTelegramVideoAudioMeta} from '../crm/telegram-ai-audio.mjs'
import {markVideoEffectDelivered} from '../crm/telegram-video-effect.mjs'
import {aiPersonalVideoMasterKey} from '../crm/telegram-ai-master-key.mjs'
import {feedbackForActiveVideoState} from '../crm/telegram-video-feedback-gate.mjs'

const TABLE='app_private.ai_work_jobs'
const CHATS='app_private.ai_telegram_threads'
const jobContext=id=>({accountId:PRACTITIONER_ID,recordId:id,field:'ai.job'})
const chatContext=id=>({accountId:PRACTITIONER_ID,recordId:id,field:'ai.chat'})
export const aiQueueEnabled=(env=process.env)=>env.HH_AI_TELEGRAM_QUEUE_ENABLED==='true'&&
 env.HH_CRM_MSG_PRODUCTION_APPROVED==='true'&&env.HH_CRM_MSG_TELEGRAM_ENABLED==='true'&&
 env.VERCEL_ENV!=='preview'&&aiQueueClientBotIdentityReady(env)
async function aiTx(config,action){
 return transaction(config,null,async db=>{
  await db.query("select set_config('hh.ai_queue','1',true)")
  return action(db)
 },{inbox:true,practitionerId:PRACTITIONER_ID})
}
async function enqueue(db,config,{threadId,lane,source,payload}){
 const id=randomUUID(),dedupe=operationHash({scope:'hh-ai-job-v1',source,lane},config)
 await db.query(`insert into ${TABLE}(id,thread_id,lane,dedupe_hash,payload_ciphertext)
 values($1,$2,$3,$4,$5) on conflict(dedupe_hash) do nothing`,
 [id,threadId,lane,dedupe,seal(payload,jobContext(id),config)])
 return id
}
const localeFromEvent=event=>event.language?.startsWith('ru')?'ru':
 event.language?.startsWith('es')?'es':'en'

/** Called ONLY by the signed, verified client Telegram webhook. */
export async function receiveTelegramAiUpdate(config,event,env=process.env){
 if(!aiQueueEnabled(env)||!classifyTelegramUpdate(event)||
   !(event.clientVideoIntent===true||event.feedbackOnly===true||event.stop===true))return {handled:false}
 const raw=event.rawText.trim()
 if(/^\/start\s+hhreview_/iu.test(raw)||event.inlineAction)return {handled:false}
 const bot=telegramBotBusinessId(env)
 if(!/^\d{5,25}$/.test(String(bot)))return {handled:false}
 const user=String(event.userId)
 const chatHash=operationHash({scope:'hh-ai-telegram-chat',bot,user},config)
 const crmHash=operationHash({scope:'crm-msg-user',provider:'telegram',
   accountDigest:businessHash('telegram',bot,config),userId:user},config)
 const businessDigest=businessHash('telegram',bot,config)
 return aiTx(config,async db=>{
  await db.query('select pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended($1,0))',
    ['hh-ai-chat:'+chatHash])
  let thread=(await db.query(`select * from ${CHATS} where chat_hash=$1 for update`,[chatHash])).rows[0]
  // Forwarded audio can initiate an AI-video plan only when the sender has
  // an existing verified first-party account AND versioned automatic-video
  // opt-in. Unconsented audio is not retained: return the neutral onboarding
  // prompt and require re-forwarding after separate chat consent.
  // Ordinary direct /voice and active diagnostics are not hijacked.
  let activeVideoMediaSession=false
  if(event.audio){
   if(!validTelegramVideoAudioMeta(event.audio)||thread?.stopped_at)
    return {handled:false}
   const account=await currentAiVideoAccount(db,config,user,env)
   if(!account)return {handled:false}
   if(thread?.consent_at){
    if(!thread.chat_ciphertext)return {handled:false}
    const saved=openSealed(thread.chat_ciphertext,chatContext(thread.id),config)
    if(String(saved?.chatId||'')!==user||
       (thread.account_id&&thread.account_id!==account))
      return {handled:false}
    activeVideoMediaSession=thread.awaiting_video_goal===true||
      saved?.pendingPlan?.expiresAt>Date.now()
   }
   if(!activeVideoMediaSession&&!event.audio.forwarded)return {handled:false}
  }
  // Bare 0..10/reaction/watched requires a CURRENT private account, matching
  // Telegram chat identity, versioned video delivery consent and an effect phase.
  if(event.feedbackOnly===true){
   if(!thread?.consent_at||thread.stopped_at||!thread.account_id||
      !thread.video_chat_hash||!thread.chat_ciphertext)return {handled:false}
   const saved=openSealed(thread.chat_ciphertext,chatContext(thread.id),config)
   if(String(saved?.chatId||'')!==user||
      !(await verifyAiVideoBoundAccount(db,config,thread,user,env))||
      !feedbackForActiveVideoState(saved,raw))return {handled:false}
  }
  // Explicitly switching to AI/video is required while a diagnostic is open.
  // A plain /start must continue the existing six-step diagnostic, not hijack it.
  const explicit=event.audio?activeVideoMediaSession:/^(?:\/hhvideo(?:\s|$)|\/hhvideo_(?:agree|confirm|cancel)(?:\s|$))/iu.test(raw)||event.feedbackOnly===true
  const diagnostic=(await db.query(`select stage from app_private.crm_tg_diagnostic_sessions
     where business_hash=$1 and user_hash=$2`,[businessDigest,crmHash])).rows[0]
  const intent=event.audio?{kind:'video_audio'}:
    event.feedbackOnly===true?{kind:'message',text:raw}:
    telegramAiIntent(raw,thread?.awaiting_video_goal===true)
  if(diagnostic&&!['stopped','done'].includes(diagnostic.stage)&&!explicit&&intent.kind!=='stop')
   return {handled:false}
  if(intent.kind==='diagnostic')return {handled:false}
  if(intent.kind==='stop'){
   if(!thread)return {handled:false}
   await db.query(`delete from ${TABLE} where thread_id=$1`,[thread.id])
   await db.query(`delete from app_private.ai_conversation_turns where thread_id=$1`,[thread.id])
   await db.query(`update ${CHATS} set chat_ciphertext=null,consent_at=null,
     stopped_at=now(),awaiting_video_goal=false,account_id=null,video_chat_hash=null,updated_at=now() where id=$1`,[thread.id])
   // Also pass /stop to the established diagnostic/CRM suppression flow.
   return {handled:false,stopped:true}
  }
  if(!thread){
   const id=randomUUID()
   await db.query(`insert into ${CHATS}(id,chat_hash,chat_ciphertext,locale) values($1,$2,$3,$4)`,
    [id,chatHash,seal({chatId:user},chatContext(id),config),localeFromEvent(event)])
   thread={id,locale:localeFromEvent(event),consent_at:null,stopped_at:null,awaiting_video_goal:false}
  }
  if(thread.stopped_at && intent.kind!=='hello' && intent.kind!=='agree')return {handled:true,stopped:true}
  if(thread.stopped_at && intent.kind==='hello'){
    await db.query(`update ${CHATS} set chat_ciphertext=$2,stopped_at=null,
      consent_at=null,updated_at=now() where id=$1`,
      [thread.id,seal({chatId:user},chatContext(thread.id),config)])
    thread={...thread,stopped_at:null,consent_at:null}
  }
  const already=(await db.query(`select 1 from ${TABLE} where dedupe_hash=$1`,
    [operationHash({scope:'hh-ai-job-v1',source:'in:'+event.eventId,lane:'message'},config)])).rowCount>0
  if(already)return {handled:true,duplicate:true}
  // No client prose, health or diagnostic data is retained before consent.
  if(intent.kind==='agree'){
   await db.query(`update ${CHATS} set consent_at=now(),stopped_at=null,
     chat_ciphertext=$2,updated_at=now() where id=$1`,
     [thread.id,seal({chatId:user},chatContext(thread.id),config)])
   await enqueue(db,config,{threadId:thread.id,lane:'delivery',source:'welcome:'+event.eventId,
     payload:{type:'text',text:aiCopy(thread.locale,
     /^\/hhvideo_agree$/i.test(raw)?'videoReady':'ready')}})
   return {handled:true,consented:true}
  }
  if(!thread.consent_at){
   // One onboarding reply/hour; no raw inbound text is stored.
   const recent=(await db.query(`select 1 from ${TABLE} where thread_id=$1 and lane='delivery'
    and created_at>now()-interval '1 hour' limit 1`,[thread.id])).rowCount>0
   if(!recent)await enqueue(db,config,{threadId:thread.id,lane:'delivery',source:'hello:'+event.eventId,
    payload:{type:'text',text:aiCopy(thread.locale,
      ['video','video_prompt','video_audio'].includes(intent.kind)?'videoConsent':'hello'),
      onboarding:true}})
   return {handled:true,consentRequired:true}
  }
  if(thread.stopped_at)return {handled:true,stopped:true}
  const daily=Number((await db.query(`select count(*)::int n from ${TABLE}
    where thread_id=$1 and lane='message' and created_at>now()-interval '24 hours'`,
    [thread.id])).rows[0]?.n||0)
  if(daily>=50)return {handled:true,limited:true}
  const input= event.audio?{kind:'video_audio',text:'',audio:event.audio}:
    intent.kind==='hello'?{kind:'hello',text:''}:
    intent.kind==='video_prompt'?{kind:'video_prompt',text:raw}:
    intent.kind==='video'?{kind:'video',text:raw,goal:intent.goal}:
    {kind:'message',text:raw}
  // Arm the temporary video session as soon as the signed request enters
  // the queue. A subsequent forwarded audio must not be lost while the first
  // asynchronous message job is still selecting approved scenes.
  if(intent.kind==='video_prompt'||intent.kind==='video')
   await db.query(`update ${CHATS} set awaiting_video_goal=true,
      updated_at=now() where id=$1`,[thread.id])
  await enqueue(db,config,{threadId:thread.id,lane:'message',source:'in:'+event.eventId,
    payload:input})
  return {handled:true,queued:true}
 })
}

/** Atomic SKIP LOCKED claim; delivery expiration becomes UNKNOWN, never a duplicate send. */
export async function claimAiJob(config,lane,{limit=1,leaseSeconds=360}={}){
 if(!['message','video','delivery'].includes(lane))throw Error('AI_LANE_INVALID')
 const cap=lane==='message'?8:lane==='video'?1:3
 return aiTx(config,async db=>{
  await db.query('select pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended($1,0))',
   ['hh-ai-lane:'+lane])
  await db.query(`update ${TABLE} set status='unknown',updated_at=now(),error_code='LEASE_EXPIRED'
    where lane='delivery' and status='leased' and lease_until<now()`)
  await db.query(`update ${TABLE} set status='pending',available_at=now(),updated_at=now()
    where lane=$1 and lane<>'delivery' and status='leased' and lease_until<now() and attempts<3`,[lane])
  await db.query(`update ${TABLE} set status='dead',error_code='RETRY_EXHAUSTED',updated_at=now()
    where lane=$1 and lane<>'delivery' and status='leased' and lease_until<now() and attempts>=3`,[lane])
  const running=Number((await db.query(`select count(*)::int n from ${TABLE}
   where lane=$1 and status='leased' and lease_until>now()`,[lane])).rows[0]?.n||0)
  if(running>=cap || limit<1)return null
  const token=randomUUID()
  const row=(await db.query(`with candidate as (
   select j.id from ${TABLE} j join ${CHATS} t on t.id=j.thread_id
   where j.lane=$1 and j.status='pending' and j.available_at<=now()
     and t.stopped_at is null
     and (j.lane='delivery' or t.consent_at is not null)
     and not exists(select 1 from ${TABLE} older where older.thread_id=j.thread_id
       and older.lane=j.lane and older.status='leased' and older.lease_until>now())
    and (j.lane<>'delivery' or not exists(select 1 from ${TABLE} sent
       where sent.thread_id=j.thread_id and sent.lane='delivery'
       and sent.status='done' and sent.updated_at>now()-interval '1 second'))
    and (j.lane<>'message' or not exists(select 1 from ${TABLE} earlier
       where earlier.thread_id=j.thread_id and earlier.lane='message'
       and earlier.status in ('pending','leased') and
       (earlier.created_at,earlier.id)<(j.created_at,j.id)))
    and (j.lane<>'delivery' or not exists(select 1 from ${TABLE} sent
       where sent.thread_id=j.thread_id and sent.lane='delivery'
       and sent.status='done' and sent.updated_at>now()-interval '1 second'))
    and (j.lane<>'message' or not exists(select 1 from ${TABLE} earlier
       where earlier.thread_id=j.thread_id and earlier.lane='message'
       and earlier.status in ('pending','leased') and
       (earlier.created_at,earlier.id)<(j.created_at,j.id)))
   order by j.created_at,j.id for update of j skip locked limit 1
  ) update ${TABLE} j set status='leased',attempts=attempts+1,
   lease_until=now()+($2*interval '1 second'),lease_token=$3,updated_at=now()
   from candidate where j.id=candidate.id
   returning j.id,j.thread_id,j.lane,j.payload_ciphertext,j.lease_token,j.attempts`,
   [lane,leaseSeconds,token])).rows[0]
  if(!row)return null
  return {...row,payload:openSealed(row.payload_ciphertext,jobContext(row.id),config)}
 })
}
async function setJobState(db,job,state,code=null,providerId=null){
 const {rowCount}=await db.query(`update ${TABLE} set status=$3,lease_until=null,
  error_code=$4,provider_message_id=$5,updated_at=now()
  where id=$1 and lease_token=$2 and status='leased' and lease_until>now()`,
 [job.id,job.lease_token,state,code,providerId])
 return rowCount===1
}
export async function processAiMessage(config,job,{env=process.env}={}){
 const data=job.payload
 return aiTx(config,async db=>{
  // Leased message must still be current BEFORE committing a reply or state.
  const leased=(await db.query(`select id from ${TABLE}
    where id=$1 and lease_token=$2 and status='leased' and lease_until>now()
    for update`,[job.id,job.lease_token])).rowCount===1
  if(!leased)return {status:'stale'}
  const thread=(await db.query(`select * from ${CHATS} where id=$1 for update`,
    [job.thread_id])).rows[0]
  if(!thread?.consent_at||thread.stopped_at){
   await setJobState(db,job,'suppressed')
   return {status:'suppressed'}
  }
  // Video plan, explicit owner approval and the optional seven-point survey
  // share one encrypted per-chat state and never bypass the linked-account gate.
  const {handleAiVideoFlow}=await import('./telegram-ai-video-flow.js')
  const flow=await handleAiVideoFlow({
    config,db,thread,data:{...data,inboundJobId:job.id},env,
    enqueue:args=>enqueue(db,config,args),
    unseal:t=>openSealed(t.chat_ciphertext,chatContext(t.id),config),
    save:(t,value)=>db.query(`update ${CHATS} set chat_ciphertext=$2,updated_at=now()
      where id=$1 and stopped_at is null`,
      [t.id,seal(value,chatContext(t.id),config)])
  })
  let answer=flow?.answer||aiCopy(thread.locale,'support')
  const keyboard=flow?.keyboard||null
  const videoBound=flow?.videoBound===true
  if(!flow){
    if(data.kind==='hello')answer=aiCopy(thread.locale,'ready')
    else if(data.kind==='video_prompt')answer=aiCopy(thread.locale,'videoPrompt')
    else answer=replyForClient(String(data.text||''),thread.locale)
  }
  const turnId=randomUUID()
  await db.query(`insert into app_private.ai_conversation_turns
    (id,thread_id,inbound_job_id,question_ciphertext,answer_ciphertext)
    values($1,$2,$3,$4,$5) on conflict(inbound_job_id) do nothing`,
    [turnId,thread.id,job.id,seal({text:data.text||data.goal||''},
     {accountId:PRACTITIONER_ID,recordId:turnId,field:'ai.question'},config),
     seal({text:answer},{accountId:PRACTITIONER_ID,recordId:turnId,field:'ai.answer'},config)])
  await enqueue(db,config,{threadId:thread.id,lane:'delivery',source:'reply:'+job.id,
   payload:{type:'text',text:answer,keyboard,videoBound}})
  await setJobState(db,job,'done')
  return {status:'done'}
 })
}
// Account-owned reservation is required BEFORE running FFmpeg or writing a
// cloud object. If consent/lease/link expires, no object is created.
export async function reserveAiVideoUpload(config,job){
 return aiTx(config,async db=>{
  const row=(await db.query(
   'select app_private.ai_video_reserve_upload($1,$2) as ready',
   [job.id,job.lease_token])).rows[0]
  return row?.ready===true
 })
}
// Only the existing signed daily housekeeping may claim expired, uncommitted
// storage uploads. The private function checks live masters and dispatches
// under row lock; STOP/deleting the source conversation does not erase intent.
export async function claimAiVideoOrphans(config,limit=5){
 if(!Number.isInteger(limit)||limit<1||limit>5)throw Error('AI_ORPHAN_LIMIT_INVALID')
 return aiTx(config,async db=>{
  const ready=(await db.query(
   "select to_regprocedure('app_private.ai_video_claim_expired_orphans(integer)') is not null as ready"
  )).rows[0]?.ready===true
  if(!ready)return []
  return (await db.query(
   'select * from app_private.ai_video_claim_expired_orphans($1)',[limit])).rows
 })
}
export async function finishAiVideoOrphan(config,jobId,token){
 return aiTx(config,async db=>(await db.query(
  'select app_private.ai_video_finish_orphan_cleanup($1,$2) as done',
  [jobId,token])).rows[0]?.done===true)
}
export async function completeAiVideo(config,job,{provider,key,bytes}){
 let expectedKey
 try{expectedKey=aiPersonalVideoMasterKey(job.payload?.accountId,job.id)}
 catch{throw Error('AI_VIDEO_RESULT_INVALID')}
 if(provider!=='supabase'||key!==expectedKey||
  !Number.isSafeInteger(bytes)||bytes<1024||bytes>12_000_000)
  throw Error('AI_VIDEO_RESULT_INVALID')
 return aiTx(config,async db=>{
  const thread=(await db.query(`select * from ${CHATS} where id=$1 for update`,
    [job.thread_id])).rows[0]
  const chat=thread?.chat_ciphertext?openSealed(thread.chat_ciphertext,chatContext(thread.id),config):null
  if(!thread?.consent_at||thread.stopped_at||!chat?.chatId||
    !(await verifyAiVideoBoundAccount(db,config,thread,chat.chatId))||
    job.payload?.accountId!==thread.account_id||
    job.payload?.clientChatHash!==thread.video_chat_hash){
   await setJobState(db,job,'suppressed')
   return {status:'suppressed'}
  }
  // One private SQL function re-verifies the active video lease, actual
  // account, linked Telegram chat, versioned automatic opt-in, personal-video
  // quotas and uploaded PRIVATE master. It commits one permanent master plus
  // one unique at-most-once Telegram dispatch receipt in this transaction.
  const recorded=(await db.query(
   'select app_private.ai_video_commit_personal_master($1,$2,$3,$4,$5) as recorded',
   [job.id,job.lease_token,bytes,job.payload?.sceneIds?.[0],job.payload?.durationSeconds])).rows[0]?.recorded
  if(recorded!==true)throw Error('AI_VIDEO_PERSONAL_MASTER_NOT_AUTHORIZED')
  // Do not enqueue a video if its lease expired after the real MP4 upload.
  if(!await setJobState(db,job,'done'))
   throw Error('AI_VIDEO_MASTER_LEASE_CHANGED')
  await enqueue(db,config,{threadId:job.thread_id,lane:'delivery',
    source:'video-output:'+job.id,
    payload:{type:'video',provider,key,bytes,videoJobId:job.id,
      accountId:thread.account_id,videoBound:true}})
  return {status:'done'}
 })
}
export async function failAiJob(config,job,{code='PROCESSING_FAILED',definite=false,retryAfter=null}={}){
 return aiTx(config,async db=>{
  const exhausted=job.attempts>=3
  const retry=!definite&&job.lane!=='delivery'&&!exhausted
  if(retry){
   await db.query(`update ${TABLE} set status='pending',available_at=now()+($3*interval '1 second'),
    lease_until=null,error_code=$4,updated_at=now() where id=$1 and lease_token=$2 and status='leased' and lease_until>now()`,
    [job.id,job.lease_token,Math.min(120,10*job.attempts),code])
  }else if(job.lane==='delivery'&&retryAfter!==null&&job.attempts<5){
   await db.query(`update ${TABLE} set status='pending',available_at=now()+($3*interval '1 second'),
    lease_until=null,error_code='PROVIDER_RATE_LIMIT',updated_at=now()
    where id=$1 and lease_token=$2 and status='leased'`,
    [job.id,job.lease_token,Math.min(120,Math.max(1,retryAfter))])
  }else{
   await setJobState(db,job,job.lane==='delivery'&&!definite?'unknown':'dead',code)
   if(job.lane==='video'){
    const thread=(await db.query(`select consent_at,stopped_at,locale from ${CHATS} where id=$1`,
      [job.thread_id])).rows[0]
    if(thread?.consent_at&&!thread.stopped_at)
     await enqueue(db,config,{threadId:job.thread_id,lane:'delivery',source:'video-failed:'+job.id,
       payload:{type:'text',text:aiCopy(thread.locale,'videoUnavailable')}})
   }
  }
 })
}
export async function getAiDelivery(config,job){
 return aiTx(config,async db=>{
  const t=(await db.query(`select * from ${CHATS} where id=$1`,
    [job.thread_id])).rows[0]
  if(!t||t.stopped_at||!t.chat_ciphertext||
    (!t.consent_at&&!job.payload.onboarding))return null
  const id=openSealed(t.chat_ciphertext,chatContext(job.thread_id),config)?.chatId
  if(!/^[1-9]\d{3,19}$/.test(String(id||'')))return null
  // A previously verified CRM chat alone never authorizes sending a video,
  // personalised assessment or its results.
  if((job.payload.videoBound||job.payload.type==='video')&&
   !(await verifyAiVideoBoundAccount(db,config,t,String(id))))return null
  if(job.payload.type==='video'){
   let expected
   try{expected=aiPersonalVideoMasterKey(t.account_id,job.payload.videoJobId)}
   catch{return null}
   if(job.payload.accountId!==t.account_id||job.payload.key!==expected)return null
   // A linked chat alone is not permission to send a private video.
   // Require its ready personal master and UNIQUE claimed dispatch receipt.
   const allowed=(await db.query(
    'select app_private.ai_video_delivery_allowed($1,$2) as allowed',
    [job.id,job.payload.videoJobId])).rows[0]?.allowed
   if(allowed!==true)return null
  }
  return String(id)
 })
}
export async function videoEffectDeliveryAccepted(config,job){
 if(job.payload?.type!=='video'||!job.payload.videoBound)return {status:'not_video'}
 return aiTx(config,async db=>{
  const t=(await db.query(`select * from ${CHATS} where id=$1 for update`,
   [job.thread_id])).rows[0]
  if(!t?.consent_at||t.stopped_at||!t.chat_ciphertext)return {status:'suppressed'}
  const chat=openSealed(t.chat_ciphertext,chatContext(t.id),config)
  if(!chat?.chatId||!(await verifyAiVideoBoundAccount(db,config,t,chat.chatId))||
    chat?.effect?.jobId!==job.payload.videoJobId)return {status:'suppressed'}
  const next=markVideoEffectDelivered(chat.effect)
  if(!next.changed)return {status:'duplicate'}
  await db.query(`update ${CHATS} set chat_ciphertext=$2,updated_at=now()
    where id=$1 and stopped_at is null`,
    [t.id,seal({...chat,effect:next.state},chatContext(t.id),config)])
  const video=(await db.query(`select payload_ciphertext from ${TABLE} where id=$1
    and thread_id=$2 and lane='video' and status='done'`,
    [job.payload.videoJobId,t.id])).rows[0]
  if(video?.payload_ciphertext){
    const plan=openSealed(video.payload_ciphertext,jobContext(job.payload.videoJobId),config)
    if(plan?.triggerJobId)await enqueue(db,config,{threadId:t.id,lane:'delivery',
      source:'video-stage:'+job.payload.videoJobId+':delivered',
      payload:{type:'progress',stage:'delivered',triggerJobId:plan.triggerJobId,
       videoJobId:job.payload.videoJobId,videoBound:true,locale:t.locale}})
  }
  await enqueue(db,config,{threadId:t.id,lane:'delivery',
    source:'effect-reaction:'+job.payload.videoJobId,
    payload:{type:'text',text:next.text,keyboard:'reaction',buttons:next.buttons,videoBound:true}})
  return {status:'queued'}
 })
}
export async function queueAiVideoProgress(config,job,stage){
 if(!['sources_verified','composing','uploading'].includes(stage))return false
 return aiTx(config,async db=>{
  const valid=(await db.query(`select id from ${TABLE}
    where id=$1 and lane='video' and lease_token=$2 and status='leased'
    and lease_until>now()`,[job.id,job.lease_token])).rowCount===1
  if(!valid)return false
  const thread=(await db.query(`select * from ${CHATS} where id=$1`,
    [job.thread_id])).rows[0]
  const chat=thread?.chat_ciphertext?
    openSealed(thread.chat_ciphertext,chatContext(thread.id),config):null
  if(!thread?.consent_at||thread.stopped_at||!chat?.chatId||
   !(await verifyAiVideoBoundAccount(db,config,thread,chat.chatId))||
   thread.account_id!==job.payload.accountId||
   thread.video_chat_hash!==job.payload.clientChatHash)return false
  await enqueue(db,config,{threadId:thread.id,lane:'delivery',
    source:'video-stage:'+job.id+':'+stage,
    payload:{type:'progress',stage,triggerJobId:job.payload.triggerJobId,
     videoJobId:job.id,videoBound:true,locale:thread.locale}})
  return true
 })
}
export async function getAiVideoProgressMessage(config,job){
 if(job.payload?.type!=='progress'||!job.payload?.videoBound||
   !/^[0-9a-f-]{36}$/i.test(job.payload.triggerJobId||''))return null
 return aiTx(config,async db=>{
  const dedupe=operationHash({scope:'hh-ai-job-v1',
    source:'video-progress:'+job.payload.triggerJobId,lane:'delivery'},config)
  const row=(await db.query(`select provider_message_id from ${TABLE}
    where dedupe_hash=$1 and thread_id=$2 and status='done'`,
   [dedupe,job.thread_id])).rows[0]
  return /^[1-9]\d{0,15}$/.test(String(row?.provider_message_id||''))?
    String(row.provider_message_id):null
 })
}
export async function renewAiVideoLease(config,job){
 return aiTx(config,async db=>(await db.query(`update ${TABLE}
  set lease_until=now()+interval '5 minutes',updated_at=now()
  where id=$1 and lane='video' and status='leased' and lease_token=$2
    and lease_until>now() returning id`,
  [job.id,job.lease_token])).rowCount===1)
}
export async function finalizeAiDelivery(config,job,{status,providerMessageId=null}={}){
 if(!['accepted','rejected','unknown','suppressed'].includes(status))throw Error('AI_DELIVERY_INVALID')
 return aiTx(config,async db=>{
  const saved=await setJobState(db,job,
   status==='accepted'?'done':status==='suppressed'?'suppressed':status==='rejected'?'dead':'unknown',
   status==='accepted'?null:status==='unknown'?'PROVIDER_UNKNOWN':'PROVIDER_REJECTED',providerMessageId)
  if(!saved)return false
  if(job.payload?.type==='video'){
   // Telegram HTTP accepted != watched, timeout != rejected: both retain
   // a durable unique terminal record and are NEVER automatically retried.
   const recorded=(await db.query(
    'select app_private.ai_video_finish_dispatch($1,$2,$3,$4) as recorded',
    [job.id,job.payload.videoJobId,status,providerMessageId])).rows[0]?.recorded
   if(recorded!==true)throw Error('AI_VIDEO_DISPATCH_RECEIPT_CONFLICT')
  }
  return true
 })
}
export async function aiQueueMetrics(config){
 return aiTx(config,async db=>{
  const rows=(await db.query(`select lane,status,count(*)::int n from ${TABLE}
    where created_at>now()-interval '30 days' group by lane,status order by lane,status`)).rows
  return {lanes:rows.map(x=>({lane:x.lane,status:x.status,count:x.n}))}
 })
}
export async function pruneAiQueue(config){
 return aiTx(config,async db=>{
  // Explicit finite retention; STOP already wipes payloads immediately.
  const rows=await db.query(`delete from ${CHATS}
    where (consent_at is null and created_at<now()-interval '24 hours')
       or (consent_at is not null and updated_at<now()-interval '30 days') returning id`)
  return {expiredThreads:rows.rowCount}
 })
}