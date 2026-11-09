/** Independent message / montage / delivery consumers.
 * At-least-once rendering, at-most-once uncertain Telegram transmission.
 * Each call is bounded, and the DB holds cross-instance leases/concurrency.
 */
import 'server-only'
import {claimAiJob,processAiMessage,completeAiVideo,failAiJob,
 getAiDelivery,finalizeAiDelivery,aiQueueEnabled,videoEffectDeliveryAccepted,renewAiVideoLease,queueAiVideoProgress,getAiVideoProgressMessage,
 reserveAiVideoUpload,claimAiVideoOrphans,finishAiVideoOrphan} from './telegram-ai-queue.js'
import {videoEffectChoiceKeys} from '../crm/telegram-video-effect.mjs'
import {aiPersonalVideoMasterKey,aiCanonicalOrphanObjectKey} from '../crm/telegram-ai-master-key.mjs'
import {createPrivateStorageClient} from '../clients/session-delivery-storage.js'
import {aiVideoBotIdentityReady} from './telegram-ai-account-boundary.js'

const API='https://api.telegram.org/bot'
const BUCKET='hh-client-private-media'
const TEXT_LIMIT=4096
const RENDER_STAGES={
 ru:{sources_verified:'Ваше видео генерируется. ●●○○ — видеосцены проверены.',
      composing:'Ваше видео генерируется. ●●●○ — монтаж и кодирование MP4.',
      uploading:'Ваше видео генерируется. ●●●● — загружаем готовый MP4 в приватное хранилище.',
      delivered:'Видео принято Telegram. ●●●● — отправка завершена; просмотр ещё не подтверждён.'},
 en:{sources_verified:'Your video is being generated. ●●○○ — scenes verified.',
      composing:'Your video is being generated. ●●●○ — editing and encoding MP4.',
      uploading:'Your video is being generated. ●●●● — uploading the finished MP4 privately.',
      delivered:'Telegram accepted your video. ●●●● — viewing has not been confirmed.'},
 es:{sources_verified:'Se está generando tu vídeo. ●●○○ — escenas verificadas.',
      composing:'Se está generando tu vídeo. ●●●○ — edición y codificación MP4.',
      uploading:'Se está generando tu vídeo. ●●●● — carga privada del MP4 terminado.',
      delivered:'Telegram aceptó tu vídeo. ●●●● — la visualización no está confirmada.'}
};
function botToken(env){
 const value=env.HH_CRM_MSG_TELEGRAM_TOKEN
 return typeof value==='string'&&/^\d{6,16}:[A-Za-z0-9_-]{25,}$/.test(value)?value:null
}
async function providerCall(method,request,token){
 let response,payload
 try{
  response=await fetch(API+encodeURIComponent(token)+'/'+method,{
   ...request,redirect:'error',cache:'no-store',signal:AbortSignal.timeout(25000)})
  payload=await response.json()
 }catch{return {status:'unknown'}}
 if(response.status===429){
  const delay=Number(payload?.parameters?.retry_after)
  return {status:'rate_limited',retryAfter:Number.isInteger(delay)?Math.min(120,Math.max(1,delay)):5}
 }
 if(response.ok&&payload?.ok===true&&Number.isSafeInteger(payload?.result?.message_id))
  return {status:'accepted',id:String(payload.result.message_id)}
 // Gateway timeouts/5xx can mean Telegram accepted the message already.
 return {status:response.status>=400&&response.status<500?'rejected':'unknown'}
}
async function deliver(config,job,env){
 const chatId=await getAiDelivery(config,job)
 if(!chatId){await finalizeAiDelivery(config,job,{status:'suppressed'});return 'suppressed'}
 const token=botToken(env)
 if(!token){await failAiJob(config,job,{code:'BOT_NOT_CONFIGURED',definite:true});return 'dead'}
 const item=job.payload
 let outcome
 if(item.type==='text'){
  if(typeof item.text!=='string'||!item.text||item.text.length>TEXT_LIMIT)
   throw Error('AI_DELIVERY_TEXT_INVALID')
  // Real reply-keyboard buttons generate ordinary private text messages,
  // not replayable callbacks containing individual health scores or video IDs.
  let replyMarkup
  if(item.keyboard==='scores'){
   const keys=Array.from({length:11},(_,n)=>({text:String(n)}))
   replyMarkup={keyboard:[keys.slice(0,6),keys.slice(6)],resize_keyboard:true,
     one_time_keyboard:true,is_persistent:false}
  }else if(item.keyboard==='reaction'){
   const valid=['ru','en','es'].some(locale=>
     Array.isArray(item.buttons)&&item.buttons.join('|')===videoEffectChoiceKeys(locale).join('|'))
   if(!valid)throw Error('AI_FEEDBACK_BUTTONS_INVALID')
   replyMarkup={keyboard:[item.buttons.map(text=>({text}))],
    resize_keyboard:true,one_time_keyboard:true,is_persistent:false}
  }
  outcome=await providerCall('sendMessage',{
   method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify({chat_id:chatId,text:item.text,allow_paid_broadcast:false,
    link_preview_options:{is_disabled:true},
    ...(replyMarkup?{reply_markup:replyMarkup}:{})})},token)
 }else if(item.type==='progress'){
  const target=await getAiVideoProgressMessage(config,job)
  if(!target){
   await finalizeAiDelivery(config,job,{status:'suppressed'})
   return 'suppressed'
  }
  const copy=RENDER_STAGES[item.locale]?.[item.stage]
  if(!copy)throw Error('AI_VIDEO_PROGRESS_STAGE_INVALID')
  outcome=await providerCall('editMessageText',{
   method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify({chat_id:chatId,message_id:Number(target),text:copy,
    link_preview_options:{is_disabled:true}})},token)
 }else if(item.type==='video'){
  let expectedKey
  try{expectedKey=aiPersonalVideoMasterKey(item.accountId,item.videoJobId)}
  catch{throw Error('AI_DELIVERY_VIDEO_INVALID')}
  if(item.provider!=='supabase'||item.key!==expectedKey||
     !Number.isSafeInteger(item.bytes)||item.bytes>12_000_000||item.bytes<1024)
   throw Error('AI_DELIVERY_VIDEO_INVALID')
  const storage=createPrivateStorageClient(config).storage.from(BUCKET)
  const {data,error}=await storage.download(item.key)
  if(error||!data||data.size!==item.bytes)throw Error('AI_DELIVERY_PRIVATE_MEDIA_MISSING')
  const magic=Buffer.from(await data.slice(0,12).arrayBuffer())
  if(magic.toString('ascii',4,8)!=='ftyp')throw Error('AI_DELIVERY_INVALID_MP4')
  // Consent or /stop may change during the private media download.
  if(await getAiDelivery(config,job)!==chatId){
    await finalizeAiDelivery(config,job,{status:'suppressed'});return 'suppressed'
  }
  const form=new FormData()
  form.set('chat_id',chatId);form.set('supports_streaming','true')
  form.set('allow_paid_broadcast','false')
  form.set('caption','Holistic House · Your personal video')
  form.set('video',data,'holistic-house.mp4')
  outcome=await providerCall('sendVideo',{method:'POST',body:form},token)
  // The consented, account-owned master remains in the private client cabinet.
  // Telegram acceptance is not a reason to delete that saved personal video.
 }else throw Error('AI_DELIVERY_TYPE_INVALID')
 if(outcome.status==='rate_limited'){
  await failAiJob(config,job,{retryAfter:outcome.retryAfter,code:'PROVIDER_RATE_LIMIT'})
 }else{
  const finished=await finalizeAiDelivery(config,job,{status:outcome.status,
    providerMessageId:outcome.id||null})
  if(outcome.status==='accepted'&&finished===true&&item.type==='video'){
   // Provider accepted this MP4, not proof the recipient watched it.
   // Trigger the voluntary feedback only for this verified account/job.
   await videoEffectDeliveryAccepted(config,job)
  }
 }
 return outcome.status
}
export async function runTelegramAiQueues(config,{messages=2,videos=1,deliveries=3,env=process.env}={}){
 if(!aiQueueEnabled(env))return {status:'disabled'}
 // Defense in depth: even a future scheduled or manual worker caller cannot
 // start an FFmpeg render without separate budget approval and verified bot.
 const approvedVideos=env.HH_AI_TELEGRAM_RENDER_BUDGET_APPROVED==='true'&&
  aiVideoBotIdentityReady(env)?videos:0;
 const counts={message:0,video:0,delivery:0,dead:0,unknown:0}
 // A single slow render must not delay the chat/delivery lanes.
 async function consume(lane,n,work){
  for(let i=0;i<Math.min(5,Math.max(0,n));i++){
   const job=await claimAiJob(config,lane,{leaseSeconds:lane==='video'?295:75})
   if(!job)break
   try{
    await work(job)
    counts[lane]++
   }catch{
    counts.dead++
    // An uncertain Telegram send MUST NOT be retried just because HTTP failed.
    await failAiJob(config,job,{code:'AI_WORKER_FAILED',definite:lane==='delivery'}).catch(()=>{})
   }
  }
 }
 // Commit newly requested video jobs before claiming the video lane.
 await consume('message',messages,job=>processAiMessage(config,job))
 await Promise.all([
  consume('video',approvedVideos,async job=>{
    // Do not spend CPU or upload anything without a durable, consent-bound
    // object intent; a stale lease or revoked Telegram link fails closed.
    if(!await reserveAiVideoUpload(config,job))
      throw Error('AI_VIDEO_UPLOAD_INTENT_NOT_AUTHORIZED')
    const {renderTelegramAiVideo}=await import('./telegram-ai-video-render.js')
    let leaseAlive=true,renewing=false
    const heartbeat=setInterval(()=>{
      if(renewing||!leaseAlive)return
      renewing=true
      void renewAiVideoLease(config,job).then(ok=>{if(!ok)leaseAlive=false})
        .catch(()=>{leaseAlive=false}).finally(()=>{renewing=false})
    },20000)
    try{
      const result=await renderTelegramAiVideo(config,job,{
        onStage:stage=>queueAiVideoProgress(config,job,stage),env
      })
      if(!leaseAlive)return
      const saved=await completeAiVideo(config,job,result)
      if(['suppressed','stale'].includes(saved.status))
       await createPrivateStorageClient(config).storage.from(BUCKET).remove([result.key]).catch(()=>{})
    }finally{clearInterval(heartbeat)}
  }),
  consume('delivery',deliveries,job=>deliver(config,job,env)),
 ])
 // Newly finished renders enqueue fresh delivery jobs after the first drain.
 if((counts.message||counts.video||counts.delivery)&&deliveries>0){
  await new Promise(resolve=>setTimeout(resolve,1050))
  await consume('delivery',Math.min(2,deliveries),job=>deliver(config,job,env))
 }
 return {status:'processed',...counts}
}

/** Existing daily housekeeping only; delete abandoned temporary MP4 objects.
 * Never touches ordinary client or practitioner uploads.
 */
export async function pruneTelegramAiTemporaryVideos(config,{now=Date.now()}={}){
 if(!aiQueueEnabled())return {expired:0}
 const store=createPrivateStorageClient(config).storage.from(BUCKET)
 const {data,error}=await store.list('ai-generated',{limit:100,sortBy:{column:'created_at',order:'asc'}})
 if(error)throw Error('AI_VIDEO_RETENTION_LIST_FAILED')
 let expired=0
 for(const row of data||[]){
  const created=Date.parse(row.created_at||'')
  if(!/^[0-9a-f]{8}-[0-9a-f-]{27,}\.mp4$/i.test(row.name)||
     !Number.isFinite(created)||now-created<72*60*60*1000)continue
  const {error:removed}=await store.remove(['ai-generated/'+row.name])
  if(!removed)expired++
 }
 return {expired}
}
/** Bounded private cleanup on the already-authorized daily housekeeping.
 * Runs even when Telegram queues are disabled, so a rollback cannot strand
 * orphaned master uploads. No bucket listing and no new cron.
 */
export async function pruneTelegramAiOrphanUploads(config){
 const intents=await claimAiVideoOrphans(config,5)
 if(!intents.length)return {claimed:0,removed:0}
 const store=createPrivateStorageClient(config).storage.from(BUCKET)
 let removed=0
 for(const intent of intents){
  const key=aiCanonicalOrphanObjectKey(intent)
  if(!key)continue
  const {error}=await store.remove([key])
  if(error)continue
  if(await finishAiVideoOrphan(config,intent.video_job_id,intent.cleanup_token))
   removed++
 }
 return {claimed:intents.length,removed}
}
