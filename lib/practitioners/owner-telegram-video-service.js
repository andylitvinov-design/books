import 'server-only'
import {randomUUID} from 'node:crypto'
import {createClient} from '@supabase/supabase-js'
import {transaction} from '../app/database.js'
import {seal,openSealed} from '../app/crypto.js'
import {PRACTITIONER_ID} from '../../data/app-services.js'
import {AppError} from '../assessments/contracts.js'
import {ownerVideoIdValid,ownerVideoMediaPath,ownerVideoCutPath,ownerVideoCutId,ownerVideoByteRange,VIDEO_DRAFT_MAX_BYTES} from './owner-telegram-video-playback.mjs'
import {telegramClientBotMode,telegramClientBotUsername} from '../app/client-telegram-policy.js'
import {resolvedOwnerTelegramEnv} from './telegram-owner-pairing.js'
import {parseOwnerVideoUpdate,ownerVideoStartMessage,ownerVideoRenderingMessage,ownerVideoPreviewButtons,
  safeVideoParts,ownerVideoLimitReason,ownerVideoConfirmationButtons,VIDEO_SESSION_MINUTES,VIDEO_RU_CHANNEL_ID,
  VIDEO_IMAGE_LIMIT,VIDEO_AUDIO_LIMIT,VIDEO_MAX_INPUT_BYTES,VIDEO_MAX_SECONDS} from './owner-telegram-video-model.mjs'
import {renderOwnerTelegramVideo,trimOwnerTelegramVideo,resolveOwnerVideoFfmpegPath} from './owner-telegram-video-render.mjs'
import {ownerVideoOauthConfig} from './owner-telegram-video-oauth-config.mjs'
export {ownerVideoOauthConfigured} from './owner-telegram-video-oauth-config.mjs'

const TELEGRAM='https://api.telegram.org/bot'
const BUCKET='hh-owner-video-drafts'
const ENCRYPTION_CONTEXT={accountId:PRACTITIONER_ID,recordId:PRACTITIONER_ID,field:'telegram_video_oauth'}
function fail(code){throw Error(code)}
async function dbVideo(config,fn){
 return transaction(config,null,async db=>{
   await db.query("select set_config('hh.owner_video_manager','1',true)")
   return fn(db)
 },{server:true})
}
async function activeOwner(config,env,channel='practice'){
 if(env.VERCEL_ENV==='preview'||env.HH_OWNER_VIDEO_ENABLED!=='true')return null
 const mode=telegramClientBotMode(env)
 const effective=await resolvedOwnerTelegramEnv(config,env)
 // Verified Telegram user ID from practice pairing, never a CRM pilot guest.
 const chat=String(effective.HH_PRACTICE_TG_CHAT_ID||'')
 const token=channel==='crm'
   ?env.HH_CRM_MSG_TELEGRAM_ENABLED==='true'?env.HH_CRM_MSG_TELEGRAM_TOKEN:null
   :channel==='practice'&&mode==='shared_practice'?env.HH_PRACTICE_TG_BOT_TOKEN:null
 const username=channel==='crm'?String(env.HH_CRM_MSG_TELEGRAM_USERNAME||'').replace(/^@/,''):
   telegramClientBotUsername(env)
 if(!/^[1-9]\d{3,19}$/.test(chat)||!/^\d{6,16}:[A-Za-z0-9_-]{25,}$/.test(token||'')||
   !username)return null
 return {chat,token,username}
}
async function telegramCall(owner,method,payload,fetcher=fetch){
 const response=await fetcher(TELEGRAM+encodeURIComponent(owner.token)+'/'+method,{
   method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload),
   cache:'no-store',redirect:'error',signal:AbortSignal.timeout(12000)})
 if(!response.ok)fail('VIDEO_TELEGRAM_UNAVAILABLE')
 const data=await response.json().catch(()=>null)
 if(data?.ok!==true)fail('VIDEO_TELEGRAM_UNAVAILABLE')
 return data.result
}
async function ownerMessage(owner,text,buttons=null,fetcher=fetch){
 const result=await telegramCall(owner,'sendMessage',{
   chat_id:owner.chat,text,disable_web_page_preview:true,
   ...(buttons?{reply_markup:buttons}:{})
 },fetcher)
 if(String(result?.chat?.id)!==owner.chat||!Number.isSafeInteger(result.message_id))
   fail('VIDEO_TELEGRAM_WRONG_DESTINATION')
}
async function answerCallback(owner,id,text,fetcher=fetch){
 if(id)await telegramCall(owner,'answerCallbackQuery',{callback_query_id:id,
   text:String(text||'').slice(0,180),show_alert:false},fetcher).catch(()=>{})
}
async function ownerAudioCombineBusy(config){
 // Preserve a still-active multi-part Dot audio collection. Video must not
 // intercept subsequent audio until /done or /cancel finishes the audio job.
 return transaction(config,null,async db=>{
   await db.query("select set_config('hh.owner_audio_manager','1',true)")
   const {rows}=await db.query(
     "select exists(select 1 from app_private.telegram_owner_audio_combine "+
     "where practitioner_id=$1 and status in ('collecting','building') "+
     "and expires_at>now()) as active",[PRACTITIONER_ID])
   return rows[0]?.active===true
 },{server:true})
}
async function startJob(config,event){
 return dbVideo(config,async db=>{
   const found=(await db.query(
     'select state,last_update_id,items,expires_at from app_private.telegram_owner_video_jobs '+
     'where practitioner_id=$1 for update',[PRACTITIONER_ID])).rows[0]
   if(found&&event.updateId<=Number(found.last_update_id))return {state:'stale'}
   if(['rendering','trimming','publishing','uncertain'].includes(found?.state))
     return {state:'busy'}
   if(found?.state==='collecting'&&new Date(found.expires_at).getTime()>Date.now())
     return {state:'active',counts:safeVideoParts(found.items)}
   const id=randomUUID()
   await db.query(
     'insert into app_private.telegram_owner_video_jobs '+
     '(practitioner_id,job_id,started_update_id,last_update_id,state,items,expires_at,storage_path,video_bytes,youtube_video_id,error_code) '+
     "values($1,$2,$3,$3,'collecting','[]'::jsonb,now()+($4*interval '1 minute'),null,null,null,null) "+
     "on conflict(practitioner_id) do update set job_id=excluded.job_id,state='collecting',"+
     'started_update_id=excluded.started_update_id,last_update_id=excluded.last_update_id,'+
     "items='[]'::jsonb,expires_at=excluded.expires_at,storage_path=null,video_bytes=null,"+
     'youtube_video_id=null,error_code=null,source_seconds=0,trim_start_seconds=0,processing_started_at=null,updated_at=now()',
     [PRACTITIONER_ID,id,event.updateId,VIDEO_SESSION_MINUTES])
   return {state:'started',id}
 })
}
async function appendMedia(config,event){
 return dbVideo(config,async db=>{
   const row=(await db.query(
     'select state,items,started_update_id,last_update_id,expires_at,error_code '+
     'from app_private.telegram_owner_video_jobs where practitioner_id=$1 for update',
     [PRACTITIONER_ID])).rows[0]
   if(!row||row.state!=='collecting'||new Date(row.expires_at).getTime()<=Date.now())
     return {state:'inactive'}
   if(event.updateId<=Number(row.started_update_id))return {state:'stale'}
   const items=Array.isArray(row.items)?row.items:[]
   if(items.some(p=>p.updateId===event.updateId))return {state:'stale'}
   const present=new Set(items.map(p=>p.uniqueId))
   if(present.has(event.part.uniqueId))return {state:'duplicate',totals:safeVideoParts(items)}
   const next=[...items,event.part]
   const totals=safeVideoParts(next)
   if(!totals){
     const reason=ownerVideoLimitReason(items,event.part)
     const code='VIDEO_LIMIT_'+reason.toUpperCase()
     if(row.error_code===code)return {state:'limit',totals:safeVideoParts(items),reason,notify:false}
     await db.query(
       "update app_private.telegram_owner_video_jobs set error_code=$2,updated_at=now() "+
       'where practitioner_id=$1',[PRACTITIONER_ID,code])
     return {state:'limit',totals:safeVideoParts(items),reason,notify:true}
   }
   await db.query(
     "update app_private.telegram_owner_video_jobs set items=$2::jsonb,"+
     "last_update_id=greatest(last_update_id,$3),expires_at=now()+($4*interval '1 minute'),updated_at=now(),error_code=null "+
     'where practitioner_id=$1',
     [PRACTITIONER_ID,JSON.stringify(next),event.updateId,VIDEO_SESSION_MINUTES])
   return {state:'added',totals}
 })
}
// The first Assemble tap shows a verified manifest. Rendering requires the
// owner's second tap containing the exact job ID and last accepted media update.
// A late photo/audio invalidates the old manifest instead of being cut out.
async function renderManifest(config){
 return dbVideo(config,async db=>{
   const row=(await db.query(
     'select job_id,state,items,last_update_id,expires_at '+
     'from app_private.telegram_owner_video_jobs where practitioner_id=$1',
     [PRACTITIONER_ID])).rows[0]
   if(!row)return {state:'missing'}
   if(!['collecting','failed'].includes(row.state))return {state:row.state}
   if(new Date(row.expires_at).getTime()<=Date.now())return {state:'expired'}
   const totals=safeVideoParts(row.items)
   if(!totals?.images||!totals?.audios)return {state:'few',totals}
   return {state:'ready',totals,jobId:row.job_id,
     lastUpdateId:Number(row.last_update_id),itemCount:row.items.length}
 })
}
function manifestText(totals){
 return '📋 Проверь ПОЛНЫЙ набор перед сборкой:\n'+
   '📷 Фото: '+totals.images+'/'+VIDEO_IMAGE_LIMIT+
   '\n🎙 Аудио: '+totals.audios+'/'+VIDEO_AUDIO_LIMIT+
   '\n🎧 Весь звук: '+Math.floor(totals.seconds/60)+' мин '+(totals.seconds%60)+' сек'+
   '\n📦 Файлы: '+(totals.bytes/1_000_000).toFixed(1)+' МБ.'+
   '\n\nЕсли ты отправил больше файлов — НЕ подтверждай! Подожди их загрузки, нажми /video_status или снова /video_done.'+
   '\nЕсли числа верны — нажми «Собрать весь проверенный набор».'
}
async function reserveRender(config,event){
 return dbVideo(config,async db=>{
   const row=(await db.query(
     'select job_id,state,items,started_update_id,last_update_id,expires_at,updated_at '+
     'from app_private.telegram_owner_video_jobs where practitioner_id=$1 for update',
     [PRACTITIONER_ID])).rows[0]
   if(!row||row.job_id!==event.jobId)return {state:'missing'}
   if(row.state==='preview'||row.state==='uploaded')return {state:row.state,jobId:row.job_id}
   if(row.state==='rendering'&&Date.now()-new Date(row.updated_at).getTime()<130000)
     return {state:'busy'}
   if(!['collecting','failed','rendering'].includes(row.state))return {state:'inactive'}
   if(event.updateId<=Number(row.started_update_id))return {state:'stale'}
   // Telegram may deliver older update IDs after newer ones; high-water ID
   // can stay unchanged even as the accepted media count grows.
   if(event.itemsUpdateId!==Number(row.last_update_id)||
      event.itemCount!==row.items.length)return {state:'changed'}
   if(new Date(row.expires_at).getTime()<=Date.now())return {state:'expired'}
   const parts=Array.isArray(row.items)?[...row.items].sort((a,b)=>a.updateId-b.updateId):[]
   const totals=safeVideoParts(parts)
   if(!totals?.images||!totals?.audios)return {state:'few',totals}
   const reserved=await db.query(
     "update app_private.telegram_owner_video_jobs set state='rendering',"+
     'last_update_id=$2,processing_started_at=now(),updated_at=now(),error_code=null,title=$3 '+
     'where practitioner_id=$1 returning processing_started_at',
     [PRACTITIONER_ID,event.updateId,
       'Видео · '+totals.images+' фото · '+totals.audios+' аудио · '+totals.seconds+' сек'])
   return {state:'reserved',jobId:row.job_id,parts,totals,
     startedAt:reserved.rows[0]?.processing_started_at}
 })
}
async function storageClient(config){
 if(!/^https:\/\/[a-z0-9]{20}\.supabase\.co$/.test(config.supabaseUrl||'')||
   !config.secretKey)fail('VIDEO_STORAGE_UNAVAILABLE')
 const client=createClient(config.supabaseUrl,config.secretKey,{
   auth:{persistSession:false,autoRefreshToken:false},
   global:{fetch:(input,init)=>{
     const url=new URL(typeof input==='string'?input:input.url||String(input))
     if(url.origin!==config.supabaseUrl)fail('VIDEO_STORAGE_ORIGIN')
     const headers=new Headers(init?.headers)
     if(config.secretKey.startsWith('sb_secret_')&&
       headers.get('authorization')==='Bearer '+config.secretKey)
       headers.delete('authorization')
     return fetch(input,{...init,headers,redirect:'error'})
   }}
 })
 const {data,error}=await client.storage.getBucket(BUCKET)
 if(error||data?.public!==false||Number(data.file_size_limit)<50_000_000||
   !data.allowed_mime_types?.includes('video/mp4'))fail('VIDEO_STORAGE_UNAVAILABLE')
 return client.storage.from(BUCKET)
}
async function videoPartBytes(owner,part,fetcher=fetch){
 const info=await telegramCall(owner,'getFile',{file_id:part.fileId},fetcher)
 if((info.file_size!==undefined&&Number(info.file_size)!==part.bytes)||
   typeof info?.file_path!=='string'||!/^[-_a-zA-Z0-9./]{1,240}$/.test(info.file_path)||
   info.file_path.split('/').some(p=>!p||p==='..'||p==='.'))
   fail('VIDEO_TELEGRAM_FILE_INVALID')
 const path=info.file_path.split('/').map(encodeURIComponent).join('/')
 const response=await fetcher('https://api.telegram.org/file/bot'+
   encodeURIComponent(owner.token)+'/'+path,{
     method:'GET',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(25000)})
 if(!response.ok||Number(response.headers.get('content-length')||part.bytes)!==part.bytes)
   fail('VIDEO_TELEGRAM_DOWNLOAD_FAILED')
 const reader=response.body?.getReader()
 if(!reader)fail('VIDEO_TELEGRAM_DOWNLOAD_FAILED')
 const bytes=Buffer.alloc(part.bytes);let offset=0
 try{
   while(true){
     const {done,value}=await reader.read()
     if(done)break
     if(!(value instanceof Uint8Array)||offset+value.length>part.bytes){
       await reader.cancel().catch(()=>{});fail('VIDEO_TELEGRAM_DOWNLOAD_FAILED')
     }
     bytes.set(value,offset);offset+=value.length
   }
 }finally{reader.releaseLock()}
 if(offset!==part.bytes)fail('VIDEO_TELEGRAM_DOWNLOAD_FAILED')
 return bytes
}
async function sendOwnerPreview(owner,bytes,jobId,fetcher=fetch,manifest='',trimStartSeconds=0){
 const form=new FormData()
 form.set('chat_id',owner.chat)
 form.set('video',new Blob([bytes],{type:'video/mp4'}),'holistic-house-slideshow.mp4')
 form.set('supports_streaming','true')
 // Preserve true landscape dimensions even if first source photo is portrait.
 form.set('width','1920')
 form.set('height','1080')
 form.set('caption','🎬 Черновик · только для тебя. '+
   (trimStartSeconds?'✂️ Начинается с '+trimStartSeconds+'-й секунды оригинала. ':'')+
   manifest+'\nПроверь весь звук и фотографии. Пока НЕ загружено на YouTube.')
 form.set('reply_markup',JSON.stringify(ownerVideoPreviewButtons(jobId,trimStartSeconds)))
 const response=await fetcher(TELEGRAM+encodeURIComponent(owner.token)+'/sendVideo',{
   method:'POST',body:form,cache:'no-store',redirect:'error',signal:AbortSignal.timeout(30000)})
 const result=await response.json().catch(()=>null)
 if(!response.ok||result?.ok!==true||String(result.result?.chat?.id)!==owner.chat||
   !Number.isSafeInteger(result.result?.message_id))
   fail('VIDEO_TELEGRAM_PREVIEW_UNCONFIRMED')
}
// The finished private MP4 and its delivery are distinct states.
// Reuse an existing private error_code; no migration or new access is needed.
async function markPreviewDelivery(config,jobId,confirmed){
 await dbVideo(config,async db=>{
   await db.query(
     "update app_private.telegram_owner_video_jobs set error_code=$3,updated_at=now() "+
     "where practitioner_id=$1 and job_id=$2 and state='preview'",
     [PRACTITIONER_ID,jobId,confirmed?null:'VIDEO_TELEGRAM_PREVIEW_UNCONFIRMED'])
 })
}
// A new explicit owner command resends only the saved private preview.
// Never render again or upload to YouTube while retrying Telegram delivery.
async function retrySavedPreview(config,owner,fetcher){
 let jobId=null
 try{
   const row=await dbVideo(config,async db=>(await db.query(
     'select job_id,storage_path,video_bytes,trim_start_seconds from app_private.telegram_owner_video_jobs '+
     "where practitioner_id=$1 and state='preview'",
     [PRACTITIONER_ID])).rows[0])
   if(!row?.storage_path||!row.video_bytes)fail('VIDEO_PREVIEW_NOT_READY')
   jobId=row.job_id
   const storage=await storageClient(config)
   const {data,error}=await storage.download(row.storage_path)
   if(error||!data||data.size!==Number(row.video_bytes))
     fail('VIDEO_STORAGE_READ_FAILED')
   const bytes=Buffer.from(await data.arrayBuffer())
   if(bytes.length!==Number(row.video_bytes))fail('VIDEO_STORAGE_READ_FAILED')
   await sendOwnerPreview(owner,bytes,jobId,fetcher,'',Number(row.trim_start_seconds))
   await markPreviewDelivery(config,jobId,true).catch(()=>{})
 }catch{
   if(jobId)await markPreviewDelivery(config,jobId,false).catch(()=>{})
   await ownerMessage(owner,'⚠️ Telegram не подтвердил повторную доставку MP4. '+
     'Видео сохранено приватно: https://holistichouse.vercel.app/admin/materials . '+
     'YouTube не затронут. Попробуй /video_retry позже.',
     null,fetcher).catch(()=>{})
 }
}
async function finishRendered(config,batch,mp4,owner,fetcher){
 const path='telegram-slides/'+batch.jobId+'.mp4'
 const storage=await storageClient(config)
 const {data:existing,error:infoError}=await storage.info(path)
 if(!infoError){
   if(Number(existing?.size)!==mp4.length)fail('VIDEO_STORAGE_CONFLICT')
 }else if(String(infoError.statusCode||infoError.status||'')==='404'||
   /not found/i.test(String(infoError.message||''))){
   const {error}=await storage.upload(path,new Blob([mp4],{type:'video/mp4'}),{
     contentType:'video/mp4',upsert:false,cacheControl:'3600'})
   if(error)fail('VIDEO_STORAGE_UPLOAD_FAILED')
 }else fail('VIDEO_STORAGE_UNAVAILABLE')
 await dbVideo(config,async db=>{
   const result=await db.query(
     "update app_private.telegram_owner_video_jobs set state='preview',storage_path=$3,"+
     "video_bytes=$4,source_seconds=$5,trim_start_seconds=0,items='[]'::jsonb,error_code=null,updated_at=now() "+
     "where practitioner_id=$1 and job_id=$2 and state='rendering' returning job_id,title",
     [PRACTITIONER_ID,batch.jobId,path,mp4.length,batch.totals.seconds])
   if(result.rowCount!==1)fail('VIDEO_SESSION_CHANGED')
   // Persist only the final MP4. Clear Telegram input file IDs from the
   // active session; they must not become standalone cabinet materials.
   const saved=await db.query(
     'insert into app_private.telegram_owner_video_drafts '+
     '(id,practitioner_id,title,storage_path,video_bytes) values($1,$2,$3,$4,$5) '+
     'on conflict(id) do update set title=excluded.title '+
     'where app_private.telegram_owner_video_drafts.practitioner_id=excluded.practitioner_id '+
     'and app_private.telegram_owner_video_drafts.storage_path=excluded.storage_path '+
     'and app_private.telegram_owner_video_drafts.video_bytes=excluded.video_bytes returning id',
     [batch.jobId,PRACTITIONER_ID,result.rows[0].title,path,mp4.length])
   if(saved.rowCount!==1)fail('VIDEO_STORAGE_CONFLICT')
 })
 try{
   await sendOwnerPreview(owner,mp4,batch.jobId,fetcher,
     '📷 '+batch.totals.images+' фото · 🎙 '+batch.totals.audios+
     ' аудио · 🎧 '+batch.totals.seconds+' сек.')
   await markPreviewDelivery(config,batch.jobId,true).catch(()=>{})
 }catch{
   await markPreviewDelivery(config,batch.jobId,false).catch(()=>{})
   await ownerMessage(owner,'✅ MP4 сохранён приватно, но Telegram не подтвердил доставку. '+
     'Открой https://holistichouse.vercel.app/admin/materials или нажми «Повторить MP4». '+
     'YouTube не затронут.',
     {inline_keyboard:[[{text:'🔁 Повторить MP4',callback_data:'hh-video:retry'}]]},fetcher).catch(()=>{})
 }
}
async function buildVideo(config,batch,owner,fetcher){
 try{
   const {default:ffmpegPath}=await import('ffmpeg-static')
   const executable=await resolveOwnerVideoFfmpegPath(ffmpegPath)
   const mp4=await renderOwnerTelegramVideo(batch.parts,{
     executable,
     fetchPart:part=>videoPartBytes(owner,part,fetcher)
   })
   await finishRendered(config,batch,mp4,owner,fetcher)
 }catch(error){
   const code=/^VIDEO_[A-Z_]+$/.test(error?.message||'')?error.message:'VIDEO_RENDER_FAILED'
   await dbVideo(config,async db=>{
     await db.query("update app_private.telegram_owner_video_jobs set state='failed',"+
       'error_code=$3,updated_at=now() where practitioner_id=$1 and job_id=$2 and state=\'rendering\'',
       [PRACTITIONER_ID,batch.jobId,code])
   }).catch(()=>{})
   const guidance=code==='VIDEO_RENDERER_UNAVAILABLE'
     ?'⚠️ Сборка не завершилась из-за серверного видеорендерера. '+
       'С твоими фото и аудио всё в порядке — они остались в Telegram. '+
       'Не пересылай их повторно: после исправления сервера нажми «Собрать видео» ещё раз.'
     :'⚠️ Сборка не завершилась. Фото и аудио сохранены в Telegram. '+
       'Попробуй «Собрать видео» ещё раз. Если ошибка повторяется, проверь статус в кабинете.'
   await ownerMessage(owner,guidance,null,fetcher).catch(()=>{})
 }
}


const videoDraftUrl=id=>'/api/admin/telegram-video/drafts/'+id+'/file'

// Owner-only metadata. The currently selected cut is an immutable MP4 in private
// Storage, separate from the original drafts list; do not accidentally hand off
// the original when the owner approved a trimmed preview.
export async function listOwnerTelegramVideoDrafts(config){
 const {rows,job}=await dbVideo(config,async db=>{
   const rows=(await db.query(
     'select id,title,video_bytes,created_at from app_private.telegram_owner_video_drafts '+
     'where practitioner_id=$1 order by created_at desc limit 30',[PRACTITIONER_ID])).rows
   const job=(await db.query(
     'select job_id,state,title,storage_path,video_bytes,trim_start_seconds,updated_at '+
     'from app_private.telegram_owner_video_jobs where practitioner_id=$1',
     [PRACTITIONER_ID])).rows[0]
   return {rows,job}
 })
 const cutId=job?.state==='preview'&&Number(job.trim_start_seconds)>0
   ?ownerVideoCutId(job.job_id,job.storage_path):null
 const bytes=Number(job?.video_bytes)
 const selected=cutId&&Number.isSafeInteger(bytes)&&bytes>=1024&&
   bytes<=VIDEO_DRAFT_MAX_BYTES?{
     id:job.job_id,title:job.title,bytes,
     trimStartSeconds:Number(job.trim_start_seconds),
     createdAt:job.updated_at,
     previewUrl:videoDraftUrl(job.job_id)+'?cut='+cutId,
   }:null
 return {files:rows.map(row=>({id:row.id,title:row.title,bytes:Number(row.video_bytes),
   createdAt:row.created_at,previewUrl:videoDraftUrl(row.id)})),selected}
}

// GET/HEAD/Range always require owner admin auth at the route wrapper.
// The optional cut selector is an immutable UUID, not a storage path or a
// public signed URL. A cut is readable only while it is the exact selected
// current preview version; a later cut makes stale links return 404.
export async function getOwnerTelegramVideoDraftFile(config,id,request){
 if(!ownerVideoIdValid(id))throw new AppError('VIDEO_DRAFT_NOT_FOUND',404)
 const url=new URL(request.url)
 let path,bytes,trimStartSeconds=0
 if(url.searchParams.has('cut')){
   const cutId=url.searchParams.get('cut')
   const expected=ownerVideoCutPath(id,cutId)
   if(!expected)throw new AppError('VIDEO_DRAFT_NOT_FOUND',404)
   const row=await dbVideo(config,async db=>(await db.query(
     'select state,storage_path,video_bytes,trim_start_seconds '+
     'from app_private.telegram_owner_video_jobs where job_id=$1 and practitioner_id=$2',
     [id,PRACTITIONER_ID])).rows[0])
   if(row?.state!=='preview'||row.storage_path!==expected||
     !Number.isSafeInteger(Number(row.trim_start_seconds))||
     Number(row.trim_start_seconds)<1)
     throw new AppError('VIDEO_DRAFT_NOT_FOUND',404)
   path=expected
   bytes=Number(row.video_bytes)
   trimStartSeconds=Number(row.trim_start_seconds)
 }else{
   const row=await dbVideo(config,async db=>(await db.query(
     'select storage_path,video_bytes from app_private.telegram_owner_video_drafts '+
     'where id=$1 and practitioner_id=$2',[id,PRACTITIONER_ID])).rows[0])
   if(!row)throw new AppError('VIDEO_DRAFT_NOT_FOUND',404)
   path=ownerVideoMediaPath(id)
   if(row.storage_path!==path)throw new AppError('VIDEO_DRAFT_NOT_FOUND',404)
   bytes=Number(row.video_bytes)
 }
 if(!path||!Number.isSafeInteger(bytes)||bytes<1024||
   bytes>VIDEO_DRAFT_MAX_BYTES)throw new AppError('VIDEO_DRAFT_NOT_FOUND',404)
 const range=ownerVideoByteRange(request.headers.get('range'),bytes)
 const downloading=url.searchParams.get('download')==='1'
 const filename=trimStartSeconds
   ?'holistic-house-cut-'+trimStartSeconds+'s.mp4':'holistic-house-video.mp4'
 const headers={'Cache-Control':'private, no-store, max-age=0, must-revalidate',
   'Content-Type':'video/mp4',
   'Content-Disposition':(downloading?'attachment':'inline')+'; filename="'+filename+'"',
   'Accept-Ranges':'bytes','X-Content-Type-Options':'nosniff',
   'Cross-Origin-Resource-Policy':'same-origin','Referrer-Policy':'no-referrer',
   'X-Robots-Tag':'noindex, nofollow, noarchive'}
 if(!range)return new Response(null,{status:416,headers:{
   ...headers,'Content-Range':'bytes */'+bytes,'Content-Length':'0'}})
 headers['Content-Length']=String(range.end-range.start+1)
 if(range.status===206)
   headers['Content-Range']='bytes '+range.start+'-'+range.end+'/'+bytes
 if(request.method==='HEAD')return new Response(null,{status:range.status,headers})
 const storage=await storageClient(config)
 const {data,error}=await storage.download(path)
 if(error||!data||data.size!==bytes)fail('VIDEO_STORAGE_UNAVAILABLE')
 // Vercel limits buffered function responses to 4.5 MB. Stream the
 // owner-verified private Blob slice instead of sending a 12–50 MB Uint8Array.
 // No signed/public Storage URL or credential is exposed to the browser.
 const part=data.slice(range.start,range.end+1,'video/mp4')
 if(part.size!==range.end-range.start+1)fail('VIDEO_STORAGE_UNAVAILABLE')
 return new Response(part.stream(),{status:range.status,headers})
}

const oauthConfig=ownerVideoOauthConfig
export async function saveOwnerVideoYoutubeConsent(config,refreshToken,channelId){
 if(channelId!==VIDEO_RU_CHANNEL_ID||typeof refreshToken!=='string'||
   refreshToken.length<10||refreshToken.length>4096)fail('VIDEO_YOUTUBE_WRONG_CHANNEL')
 const encrypted=seal({refreshToken},ENCRYPTION_CONTEXT,config)
 await dbVideo(config,async db=>{
   await db.query(
     'insert into app_private.telegram_owner_video_oauth '+
     " (practitioner_id,target,channel_id,token_ciphertext) values($1,'ru',$2,$3) "+
     'on conflict(practitioner_id,target) do update set '+
     'channel_id=excluded.channel_id,token_ciphertext=excluded.token_ciphertext,updated_at=now()',
     [PRACTITIONER_ID,channelId,encrypted])
 })
}
async function ownerVideoRefresh(config){
 const row=await dbVideo(config,async db=>(await db.query(
   'select channel_id,token_ciphertext from app_private.telegram_owner_video_oauth '+
   "where practitioner_id=$1 and target='ru'",[PRACTITIONER_ID])).rows[0])
 if(row?.channel_id!==VIDEO_RU_CHANNEL_ID)return null
 const unlocked=openSealed(row.token_ciphertext,ENCRYPTION_CONTEXT,config)
 return typeof unlocked?.refreshToken==='string'?unlocked.refreshToken:null
}
export async function ownerVideoYoutubeConnected(config,env=process.env){
 if(!oauthConfig(env))return false
 try{return Boolean(await ownerVideoRefresh(config))}catch{return false}
}

function cutHelpText(){
 return '✂️ Посмотри приватный черновик и выбери секунду, с которой оставить видео.\n'+
   'Например: /video_cut 75 (начнётся с 1:15) или /video_cut 01:15.\n'+
   'Чтобы вернуть оригинал: /video_cut 0.\n'+
   'После обрезки бот пришлёт НОВЫЙ приватный MP4. Проверь его и только после этого нажми публикацию на YouTube.\n'+
   'Никакой автоматической загрузки нет.'
}
async function reserveCut(config,event){
 return dbVideo(config,async db=>{
   const row=(await db.query(
     'select job_id,state,title,storage_path,video_bytes,source_seconds,trim_start_seconds,last_update_id,updated_at '+
     'from app_private.telegram_owner_video_jobs where practitioner_id=$1 for update',
     [PRACTITIONER_ID])).rows[0]
   if(!row||event.jobId&&event.jobId!==row.job_id)return {state:'missing'}
   // Telegram can retry/deliver older text updates after a newer cut/reset.
   // Only the latest owner command may change the selected preview version.
   if(event.updateId<=Number(row.last_update_id))return {state:'stale'}
   // Vercel background jobs have a hard 300s ceiling. Allow recovery only
   // after that ceiling plus a safety margin; a live cut cannot race recovery.
   if(row.state==='trimming'&&Date.now()-new Date(row.updated_at).getTime()>360000){
     await db.query(
       "update app_private.telegram_owner_video_jobs set state='preview',"+
       "error_code='VIDEO_TRIM_INTERRUPTED',updated_at=now() "+
       "where practitioner_id=$1 and job_id=$2 and state='trimming'",
       [PRACTITIONER_ID,row.job_id])
     row.state='preview'
   }
   // A previous "Не публиковать" canceled publication, not the MP4.
   // Only a NEW explicit /video_cut instruction may reopen the draft.
   const restoring=row.state==='cancelled'&&Boolean(row.storage_path)&&
     Boolean(row.video_bytes)
   if(row.state!=='preview'&&!restoring)return {state:row.state}
   const original=(await db.query(
     'select storage_path,video_bytes from app_private.telegram_owner_video_drafts '+
     'where id=$1 and practitioner_id=$2',
     [row.job_id,PRACTITIONER_ID])).rows[0]
   if(!original||original.storage_path!==ownerVideoMediaPath(row.job_id)||
     !Number.isSafeInteger(Number(original.video_bytes)))
     return {state:'missing'}
   const duration=Number(row.source_seconds)||
     Number(String(row.title||'').match(/· (\d{1,4}) сек$/)?.[1]||0)
   const start=event.trimStartSeconds
   if(!Number.isSafeInteger(start)||start<0||start>=VIDEO_MAX_SECONDS)
     return {state:'range',duration}
   if(start===0){
     await db.query(
       "update app_private.telegram_owner_video_jobs set storage_path=$3,video_bytes=$4,"+
       "trim_start_seconds=0,state='preview',error_code=null,"+
       "last_update_id=greatest(last_update_id,$5),updated_at=now() "+
       "where practitioner_id=$1 and job_id=$2 and state in ('preview','cancelled')",
       [PRACTITIONER_ID,row.job_id,original.storage_path,Number(original.video_bytes),event.updateId])
     return {state:'reset',jobId:row.job_id,oldPath:row.storage_path}
   }
   if(duration<=start+1)return {state:'range',duration}
   if(row.state==='preview'&&start===Number(row.trim_start_seconds)&&
     row.storage_path!==original.storage_path){
     await db.query(
       'update app_private.telegram_owner_video_jobs '+
       'set last_update_id=greatest(last_update_id,$3),updated_at=now() '+
       "where practitioner_id=$1 and job_id=$2 and state='preview'",
       [PRACTITIONER_ID,row.job_id,event.updateId])
     return {state:'same',jobId:row.job_id,start}
   }
   await db.query(
     "update app_private.telegram_owner_video_jobs set state='trimming',"+
     "processing_started_at=now(),error_code=null,"+
     "last_update_id=greatest(last_update_id,$3),updated_at=now() "+
     "where practitioner_id=$1 and job_id=$2 and state in ('preview','cancelled')",
     [PRACTITIONER_ID,row.job_id,event.updateId])
   return {state:'reserved',jobId:row.job_id,start,
     originalPath:original.storage_path,originalBytes:Number(original.video_bytes),
     oldPath:row.storage_path,oldStart:Number(row.trim_start_seconds)}
 })
}
async function cutVideo(config,batch,owner,fetcher){
 let nextPath=null
 try{
   const storage=await storageClient(config)
   const {data,error}=await storage.download(batch.originalPath)
   if(error||!data||data.size!==batch.originalBytes)fail('VIDEO_STORAGE_READ_FAILED')
   const original=Buffer.from(await data.arrayBuffer())
   if(original.length!==batch.originalBytes)fail('VIDEO_STORAGE_READ_FAILED')
   const {default:ffmpegPath}=await import('ffmpeg-static')
   const executable=await resolveOwnerVideoFfmpegPath(ffmpegPath)
   const trimmed=await trimOwnerTelegramVideo(original,{startSeconds:batch.start,executable})
   // Unique path avoids old Telegram previews being silently overwritten.
   // The canonical original remains available in owner-only /admin/materials.
   nextPath='telegram-slides/'+batch.jobId+'-cut-'+randomUUID()+'.mp4'
   const {error:uploadError}=await storage.upload(nextPath,
     new Blob([trimmed],{type:'video/mp4'}),{
       contentType:'video/mp4',upsert:false,cacheControl:'3600'})
   if(uploadError)fail('VIDEO_STORAGE_UPLOAD_FAILED')
   const updated=await dbVideo(config,async db=>db.query(
     "update app_private.telegram_owner_video_jobs set state='preview',"+
     "storage_path=$3,video_bytes=$4,trim_start_seconds=$5,error_code=null,updated_at=now() "+
     "where practitioner_id=$1 and job_id=$2 and state='trimming'",
     [PRACTITIONER_ID,batch.jobId,nextPath,trimmed.length,batch.start]))
   if(updated.rowCount!==1)fail('VIDEO_SESSION_CHANGED')
   if(batch.oldPath!==batch.originalPath&&batch.oldPath!==nextPath&&
     /^telegram-slides\/[0-9a-f-]{36}-cut-[0-9a-f-]{36}\.mp4$/.test(batch.oldPath))
     await storage.remove([batch.oldPath]).catch(()=>{})
   try{
     await sendOwnerPreview(owner,trimmed,batch.jobId,fetcher,
       '✂️ Начало удалено: '+batch.start+' сек.',batch.start)
     await markPreviewDelivery(config,batch.jobId,true).catch(()=>{})
   }catch{
     await markPreviewDelivery(config,batch.jobId,false).catch(()=>{})
     await ownerMessage(owner,'✅ Обрезанный MP4 сохранён приватно, но Telegram не подтвердил доставку. '+
       'Нажми /video_retry; YouTube не затронут.',null,fetcher).catch(()=>{})
   }
 }catch(error){
   const code=/^VIDEO_[A-Z_]+$/.test(error?.message||'')?error.message:'VIDEO_TRIM_FAILED'
   await dbVideo(config,async db=>db.query(
     "update app_private.telegram_owner_video_jobs set state='preview',error_code=$3,updated_at=now() "+
     "where practitioner_id=$1 and job_id=$2 and state='trimming'",
     [PRACTITIONER_ID,batch.jobId,code])).catch(()=>{})
   // A failed DB acknowledgement can follow a committed reference update.
   // A missing/failed readback cannot prove this uniquely named cut is unused.
   // Retain it on failure; reconciliation, not this catch, must prove orphanhood.
   await ownerMessage(owner,'⚠️ Не удалось подтвердить результат обрезки. '+
     'Текущий приватный черновик мог обновиться. '+
     'Проверь /video_status и просмотри актуальный черновик перед повторной обрезкой или подтверждением публикации.',null,fetcher).catch(()=>{})
 }
}

async function reservePublish(config,event){
 return dbVideo(config,async db=>{
   const row=(await db.query(
     'select job_id,state,storage_path,video_bytes,youtube_video_id,trim_start_seconds '+
     'from app_private.telegram_owner_video_jobs where practitioner_id=$1 for update',
     [PRACTITIONER_ID])).rows[0]
   if(!row||row.job_id!==event.jobId)return {state:'missing'}
   if(row.state==='uploaded')return {state:'uploaded',videoId:row.youtube_video_id}
   if(row.state==='uncertain')return {state:'uncertain',videoId:row.youtube_video_id}
   if(row.state!=='preview'||!row.storage_path||!row.video_bytes)
     return {state:'inactive'}
   // Old Telegram buttons never approve a newly trimmed version (or vice versa).
   if(event.trimStartSeconds!==Number(row.trim_start_seconds))
     return {state:'changed',trimStartSeconds:Number(row.trim_start_seconds)}
   await db.query(
     "update app_private.telegram_owner_video_jobs set state='publishing',"+
     'updated_at=now(),processing_started_at=now() where practitioner_id=$1 and job_id=$2',
     [PRACTITIONER_ID,event.jobId])
   return {state:'reserved',jobId:row.job_id,path:row.storage_path,bytes:Number(row.video_bytes),trimStartSeconds:Number(row.trim_start_seconds)}
 })
}
async function updatePublish(config,jobId,state,{videoId=null,code=null}={}){
 await dbVideo(config,async db=>{
   const updated=await db.query(
     'update app_private.telegram_owner_video_jobs set state=$3,'+
     'youtube_video_id=coalesce($4,youtube_video_id),error_code=$5,updated_at=now() '+
     'where practitioner_id=$1 and job_id=$2 and state in (\'publishing\',\'uncertain\')',
     [PRACTITIONER_ID,jobId,state,videoId,code])
   if(updated.rowCount!==1)fail('VIDEO_SESSION_CHANGED')
 })
}
async function publishVideo(config,batch,owner,fetcher){
 let begun=false
 try{
   const secret=await ownerVideoRefresh(config)
   const google=oauthConfig()
   if(!secret||!google)fail('VIDEO_YOUTUBE_NOT_CONNECTED')
   const storage=await storageClient(config)
   const {data,error}=await storage.download(batch.path)
   if(error||!data||data.size!==batch.bytes)fail('VIDEO_STORAGE_READ_FAILED')
   const mp4=Buffer.from(await data.arrayBuffer())
   if(mp4.length!==batch.bytes)fail('VIDEO_STORAGE_READ_FAILED')
   const {refreshYoutubeAccess,uploadUnlistedRu}=
     await import('./owner-telegram-video-youtube.mjs')
   const token=await refreshYoutubeAccess(secret,google,fetcher)
   const title='Видео из Telegram · '+new Date().toISOString().slice(0,10)
   const result=await uploadUnlistedRu(mp4,token,{
     fetcher,title,
     onBeginUpload:async()=>{
       begun=true
       await updatePublish(config,batch.jobId,'uncertain',{code:'UPLOAD_IN_PROGRESS'})
     },
     onUploaded:async videoId=>{
       await updatePublish(config,batch.jobId,'uncertain',{videoId,code:'READBACK_PENDING'})
     }
   })
   await updatePublish(config,batch.jobId,'uploaded',{videoId:result.id})
   // Reuse owner-only persistent phone uploader history; its failure never
   // triggers another YouTube upload.
   try{
     const {getYoutubeHistoryStore}=await import('../youtube/upload-history-store.js')
     await getYoutubeHistoryStore()?.save({
       target:'ru',channelId:VIDEO_RU_CHANNEL_ID,videoId:result.id,
       title:result.title||title,requestedVisibility:'unlisted',privacyStatus:'unlisted'
     })
   }catch{/* DB contains authoritative provider readback. */}
   await ownerMessage(owner,'✅ Загружено на русский YouTube (@shamanic_academy) '+
     'и обработано с доступом «По ссылке» (Unlisted):\nhttps://www.youtube.com/watch?v='+result.id+
     '\n\nПроверь воспроизведение в YouTube Studio.',null,fetcher)
 }catch(error){
   const code=/^VIDEO_[A-Z_]+$/.test(error?.message||'')?error.message:'VIDEO_YOUTUBE_FAILED'
   if(!begun)await updatePublish(config,batch.jobId,'preview',{code}).catch(()=>{})
   await ownerMessage(owner,begun
     ?'⚠️ YouTube не подтвердил конечный статус. Повторная отправка заблокирована, чтобы не создать дубликат. '+
       'Проверь YouTube Studio: https://studio.youtube.com/ . После проверки можно повторить только чтение статуса.'
     :'⚠️ YouTube не подключён или не подтвердил русский канал. MP4 остался приватным. '+
       'Подключи канал через https://holistichouse.vercel.app/admin/youtube-upload и повтори публикацию.',
     null,fetcher).catch(()=>{})
 }
}
async function verifyUncertain(config,id,owner,fetcher){
 try{
   const refresh=await ownerVideoRefresh(config),google=oauthConfig()
   if(!refresh||!google)fail('VIDEO_YOUTUBE_NOT_CONNECTED')
   const {refreshYoutubeAccess,verifyUploadedRu}=
     await import('./owner-telegram-video-youtube.mjs')
   const token=await refreshYoutubeAccess(refresh,google,fetcher)
   const data=await verifyUploadedRu(id,token,fetcher)
   const job=await dbVideo(config,async db=>(await db.query(
     "update app_private.telegram_owner_video_jobs set state='uploaded',error_code=null,"+
     "updated_at=now() where practitioner_id=$1 and youtube_video_id=$2 and state='uncertain' returning job_id",
     [PRACTITIONER_ID,id])).rows[0])
   if(job)await ownerMessage(owner,'✅ Проверено: русский YouTube / Unlisted / обработано.\n'+
     'https://www.youtube.com/watch?v='+data.id,null,fetcher)
 }catch{
   await ownerMessage(owner,'⚠️ Проверка YouTube пока не завершена. '+
     'Проверь статус вручную в https://studio.youtube.com/ . Видео повторно НЕ отправлялось.',null,fetcher).catch(()=>{})
 }
}
export async function receiveOwnerTelegramVideoWebhook(config,update,{
 env=process.env,fetcher=fetch,now=Date.now(),channel='practice'
}={}){
 // Each caller verifies its own Telegram webhook secret before reaching here.
 // Owner videos are created only in the shared-practice Dot bot. Legacy
 // owner commands on the signed CRM bot get a link to Dot, not another job.
 // Never expose this on dedicated customer bots or arbitrary webhooks.
 if(!['crm','practice'].includes(channel)||
   (channel==='practice'&&telegramClientBotMode(env)!=='shared_practice'))return {handled:false}
 // Fast-path other bot commands and ordinary customer text with no database reads.
 if(env.VERCEL_ENV==='preview'||env.HH_OWNER_VIDEO_ENABLED!=='true')return {handled:false}
 const username=channel==='crm'?String(env.HH_CRM_MSG_TELEGRAM_USERNAME||'').replace(/^@/,''):
   telegramClientBotUsername(env)
 const event=parseOwnerVideoUpdate(update,{now,botUsername:username})
 if(!event)return {handled:false}
 const owner=await activeOwner(config,env,channel)
 if(!owner||event.chatId!==owner.chat||event.userId!==owner.chat)return {handled:false}
 if(channel==='crm'){
   // Two independently signed bots must never append into the same private
   // video job. CRM stays for enquiries; Dot is the one owner media workspace.
   if(event.action==='media'||event.action==='reject')return {handled:false}
   if(event.callbackId)await answerCallback(owner,event.callbackId,'Видео теперь в Dot',fetcher)
   await ownerMessage(owner,'🎬 Создание видео перенесено в твой бот Dot. '+
     'Открой https://t.me/Andydotbot?start=audio → «Аудио и видео» → «Создать видео». '+
     'Это защищает от смешивания файлов двух ботов. Ничего не опубликовано.',
     null,fetcher).catch(()=>{})
   return {handled:true}
 }
 if(event.callbackId)await answerCallback(owner,event.callbackId,'Принято',fetcher)
 if(event.action==='start'){
   if(channel==='practice'&&await ownerAudioCombineBusy(config)){
     await ownerMessage(owner,'🎧 Сейчас открыта сборка нескольких аудио. '+
       'Сначала заверши её кнопкой «Готово · объединить» (/done) '+
       'или отмени через /cancel. Затем нажми /video. '+
       'Файлы текущей аудиосборки не изменены.',null,fetcher)
     return {handled:true}
   }
   const result=await startJob(config,event)
   const intro=ownerVideoStartMessage()
   await ownerMessage(owner,result.state==='started'?intro.text:
     result.state==='active'?'🎬 Сборка уже открыта. Добавляй фотографии и аудио; затем нажми «Собрать видео».':
     result.state==='busy'?'🎬 Предыдущий видеоролик ещё обрабатывается.':'Уже обработано.',
     result.state==='started'||result.state==='active'?intro.reply_markup:null,fetcher)
   return {handled:true}
 }
 if(event.action==='status'){
   const row=await dbVideo(config,async db=>(await db.query(
     'select job_id,state,items,expires_at,error_code,video_bytes,title,processing_started_at,trim_start_seconds from app_private.telegram_owner_video_jobs '+
     'where practitioner_id=$1',[PRACTITIONER_ID])).rows[0])
   const collecting=row?.state==='collecting'&&new Date(row.expires_at).getTime()>Date.now()
   const totals=collecting?safeVideoParts(row.items):null
   const rendering=row?.state==='rendering'?safeVideoParts(row.items):null
   const ready=row?.state==='preview'
   const cancelledDraft=row?.state==='cancelled'&&Boolean(row.video_bytes)
   const readyButtons={inline_keyboard:[
     [{text:'🔁 Повторить доставку MP4',callback_data:'hh-video:retry'}],
     ...((ready||cancelledDraft)?[[{text:'✂️ Обрезать начало',callback_data:'hh-video:cut:'+row.job_id}]]:[]),
     [{text:'📁 Мои приватные видео',url:'https://holistichouse.vercel.app/admin/materials'}]]}
   await ownerMessage(owner,totals
     ?'📷 Фото: '+totals.images+'/'+VIDEO_IMAGE_LIMIT+
       '\n🎙 Аудио: '+totals.audios+'/'+VIDEO_AUDIO_LIMIT+
       '\n🎧 Звук: '+totals.seconds+'/'+VIDEO_MAX_SECONDS+' сек'+
       '\n📦 Исходники: '+(totals.bytes/1_000_000).toFixed(1)+'/'+(VIDEO_MAX_INPUT_BYTES/1_000_000)+' МБ'+
       '\nФайлы можно чередовать. Нажми «Собрать видео», когда готово.'
     :ready
       ?(row.error_code==='VIDEO_TELEGRAM_PREVIEW_UNCONFIRMED'
         ?'⚠️ MP4 готов, но Telegram не подтвердил его доставку.'
         :'✅ MP4 уже собран и сохранён приватно.')+
         '\n'+String(row.title||'Видео').slice(0,100)+
         '\nРазмер: '+(Number(row.video_bytes)/1_000_000).toFixed(1)+' МБ.'+
         (row.trim_start_seconds?'\n✂️ Начало: с '+row.trim_start_seconds+'-й секунды.':'')+
         '\nНажми «Повторить доставку MP4» либо открой видео в кабинете. YouTube не затронут.'
       :cancelledDraft?'✖ Публикация отменена, но оригинальный MP4 сохранён приватно. '+
         'Для возврата черновика: /video_cut 0; для обрезки: /video_cut 75. '+
         'YouTube не затронут.'
       :row?.state==='trimming'?'✂️ Обрезаю начало и готовлю новый приватный MP4. YouTube не затронут. Проверка: /video_status.'
       :row?.state==='rendering'?(rendering?ownerVideoRenderingMessage(rendering,row.processing_started_at)
         :'⏳ Собираю MP4. Повторно нажимать не нужно. После сборки видео придёт сюда.')
       :row?.state==='failed'?'⚠️ Предыдущая сборка не завершилась. Файлы сохранены для /video_done; либо начни новую: /video.'
       :'Активной видеосборки нет. Отправь /video, чтобы начать.',
     totals?ownerVideoStartMessage().reply_markup:(ready||cancelledDraft)?readyButtons:null,fetcher).catch(()=>{})
   return {handled:true}
 }
 if(event.action==='media'||event.action==='reject'){
   if(event.action==='reject'){
     const active=await dbVideo(config,async db=>(await db.query(
       "select state from app_private.telegram_owner_video_jobs where practitioner_id=$1",
       [PRACTITIONER_ID])).rows[0])
     if(active?.state!=='collecting')return {handled:false}
     await ownerMessage(owner,'⚠️ Файл не подходит: JPEG/PNG/WebP или OGG/MP3/M4A/WAV, '+
       'до 5 МБ за фото и 15 МБ за аудио, продолжительность каждой записи до 30 минут.',null,fetcher)
     return {handled:true}
   }
   const result=await appendMedia(config,event)
   if(result.state==='inactive')return {handled:false}
   // Silence per-file receipts: Telegram uploads are accepted in the
   // locked session, but the owner needs only the original instructions
   // and the final assembled MP4. Report limit/errors, not every file.
   if(result.state==='limit'&&result.notify){
     const reasons={
       photos:'достигнут лимит 15 фото',audios:'достигнут лимит 15 аудио',
       bytes:'общий размер больше 90 МБ',seconds:'общая длительность больше 30 минут',
       invalid:'неподходящий формат или данные файла'
     }
     const totals=result.totals
     await ownerMessage(owner,'⚠️ Этот файл НЕ добавлен в будущий MP4: '+
       (reasons[result.reason]||reasons.invalid)+'.\n'+
       (totals?'Сейчас принято 📷 '+totals.images+'/'+VIDEO_IMAGE_LIMIT+
         ', 🎙 '+totals.audios+'/'+VIDEO_AUDIO_LIMIT+
         ', звук '+totals.seconds+' сек, размер '+(totals.bytes/1_000_000).toFixed(1)+' МБ.\n':'')+
       'Остальные файлы остаются в текущем наборе. Проверь /video_status.',
       null,fetcher).catch(()=>{})
   }
   return {handled:true}
 }
 if(event.action==='done'){
   const manifest=await renderManifest(config)
   if(manifest.state==='ready'){
     await ownerMessage(owner,manifestText(manifest.totals),
       ownerVideoConfirmationButtons(manifest.jobId,manifest.lastUpdateId,manifest.itemCount),fetcher).catch(()=>{})
     return {handled:true}
   }
   const notes={
     missing:'Новая сборка: /video',
     few:'Для полного видео нужен минимум 1 фото и 1 аудио. Проверь /video_status.',
     busy:'Сборка уже выполняется, проверь /video_status.',
     expired:'Сборка истекла. Начни заново: /video',
     preview:'Приватный MP4 уже сохранён. Повторная доставка: /video_retry.',
     uploaded:'Видео уже загружено на YouTube; дубликат не создаю.',
     trimming:'✂️ Сейчас готовится обрезанный черновик. Проверь /video_status.'
   }
   await ownerMessage(owner,notes[manifest.state]||'Проверь /video_status.',
     null,fetcher).catch(()=>{})
   return {handled:true}
 }
 if(event.action==='confirm'){
   const batch=await reserveRender(config,event)
   if(batch.state==='changed'){
     const fresh=await renderManifest(config)
     await ownerMessage(owner,fresh.state==='ready'
       ?'⚠️ Пока ты подтверждал, пришли дополнительные файлы. Старый набор неактуален.\n'+
         manifestText(fresh.totals)
       :'⚠️ Набор изменился. Проверь /video_status.',
       fresh.state==='ready'
         ?ownerVideoConfirmationButtons(fresh.jobId,fresh.lastUpdateId,fresh.itemCount):null,fetcher).catch(()=>{})
     return {handled:true}
   }
   if(batch.state==='reserved'){
     // Only the owner's explicit confirmation of this precise item version
     // starts FFmpeg. Never render an unreviewed partial set.
     await ownerMessage(owner,ownerVideoRenderingMessage(batch.totals,batch.startedAt),
       null,fetcher).catch(()=>{})
     return {handled:true,background:()=>buildVideo(config,batch,owner,fetcher)}
   }
   const notes={
     missing:'Это подтверждение от другой сборки. Проверь /video_status.',
     few:'Нужно минимум 1 фото и 1 аудио.',
     busy:'Сборка уже в работе.',
     expired:'Сборка истекла. Начни заново: /video',
     preview:'MP4 уже сохранён. Повторная отправка: /video_retry.',
     uploaded:'Видео уже загружено; дубликат не создаю.',
     stale:'Старая команда. Проверь /video_status.'
   }
   await ownerMessage(owner,notes[batch.state]||'Проверь /video_status.',
     null,fetcher).catch(()=>{})
   return {handled:true}
 }

 if(event.action==='cut_help'){
   const draft=await dbVideo(config,async db=>(await db.query(
     'select job_id,state from app_private.telegram_owner_video_jobs where practitioner_id=$1',
     [PRACTITIONER_ID])).rows[0])
   await ownerMessage(owner,draft?.job_id===event.jobId&&
     ['preview','cancelled'].includes(draft.state)
     ?cutHelpText():'Это кнопка старого черновика. Открой актуальное видео: /video_status.',
     null,fetcher).catch(()=>{})
   return {handled:true}
 }
 if(event.action==='cut'){
   if(event.trimStartSeconds===null){
     await ownerMessage(owner,cutHelpText(),null,fetcher).catch(()=>{})
     return {handled:true}
   }
   const batch=await reserveCut(config,event)
   if(batch.state==='reserved'){
     await ownerMessage(owner,'✂️ Обрезаю оригинал с '+batch.start+
       '-й секунды. Пришлю новый приватный MP4 для проверки. '+
       'На YouTube пока ничего не загружается.',null,fetcher).catch(()=>{})
     return {handled:true,background:()=>cutVideo(config,batch,owner,fetcher)}
   }
   if(batch.state==='reset'||batch.state==='same'){
     if(batch.state==='reset'&&batch.oldPath&&
       /^telegram-slides\/[0-9a-f-]{36}-cut-[0-9a-f-]{36}\.mp4$/.test(batch.oldPath)){
       const storage=await storageClient(config).catch(()=>null)
       if(storage)await storage.remove([batch.oldPath]).catch(()=>{})
     }
     await ownerMessage(owner,batch.state==='reset'
       ?'✅ Вернул исходное видео без обрезки. Полный черновик остался в чате; /video_retry пришлёт его ещё раз.'
       :'✅ Этот вариант уже готов. Пересмотреть: /video_retry.',
       ownerVideoPreviewButtons(batch.jobId,batch.state==='same'?batch.start:0),fetcher).catch(()=>{})
     return {handled:true}
   }
   await ownerMessage(owner,batch.state==='range'
     ?'⚠️ Выбери секунду до конца ролика (звук примерно '+batch.duration+
       ' сек). Пример: /video_cut 75.'
     :batch.state==='trimming'?'✂️ Обрезка уже идёт. Проверка: /video_status.'
     :batch.state==='stale'?'⚠️ Это старая команда. Последняя версия сохранена: /video_status.'
     :batch.state==='uploaded'||batch.state==='uncertain'||batch.state==='publishing'
       ?'Видео уже отправляется или загружено. Изменить публикацию нельзя.'
     :'Для обрезки нужен готовый приватный черновик. Проверка: /video_status.',
     null,fetcher).catch(()=>{})
   return {handled:true}
 }

 if(event.action==='retry'){
   await retrySavedPreview(config,owner,fetcher)
   return {handled:true}
 }
 if(event.action==='cancel'){
   const changed=await dbVideo(config,async db=>(await db.query(
     "update app_private.telegram_owner_video_jobs set state='cancelled',updated_at=now() "+
     "where practitioner_id=$1 and state in ('collecting','preview') returning job_id",
     [PRACTITIONER_ID])).rows[0])
   await ownerMessage(owner,changed?'✖ Сборка отменена. На YouTube ничего не отправлено.':
     'Уже обрабатывается или опубликовано; отмена невозможна.',null,fetcher).catch(()=>{})
   return {handled:true}
 }
 if(event.action==='publish'){
   if(!oauthConfig(env)||!await ownerVideoYoutubeConnected(config,env)){
     await ownerMessage(owner,'🔐 Для отправки на русский YouTube нужна однократная '+
       'авторизация Google. Подключи здесь: '+
       'https://holistichouse.vercel.app/admin/youtube-upload . '+
       'Черновик пока сохранён приватно и не опубликован.',null,fetcher).catch(()=>{})
     return {handled:true}
   }
   const batch=await reservePublish(config,event)
   if(batch.state==='reserved'){
     await ownerMessage(owner,'⏫ Подтверждение принято. Загружаю только на '+
       '@shamanic_academy с доступом «По ссылке».',null,fetcher).catch(()=>{})
     return {handled:true,background:()=>publishVideo(config,batch,owner,fetcher)}
   }
   if(batch.state==='uncertain'&&batch.videoId)
     return {handled:true,background:()=>verifyUncertain(config,batch.videoId,owner,fetcher)}
   await ownerMessage(owner,batch.state==='uploaded'
     ?'Видео уже загружено: https://www.youtube.com/watch?v='+batch.videoId
     :batch.state==='uncertain'?'⚠️ Исход предыдущей загрузки неизвестен. '+
       'Проверь https://studio.youtube.com/ , повторная загрузка заблокирована.'
     :batch.state==='changed'?'⚠️ Эта кнопка относится к предыдущей версии видео. '+
       'Открой актуальный обрезанный черновик через /video_retry и подтверждай только его.'
     :'Нет готового черновика для публикации.',null,fetcher).catch(()=>{})
   return {handled:true}
 }
 return {handled:false}
}
