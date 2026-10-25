import 'server-only'
import {createClient} from '@supabase/supabase-js'
import {transaction} from '../app/database.js'
import {PRACTITIONER_ID} from '../../data/app-services.js'
import {telegramClientBotMode} from '../app/client-telegram-policy.js'
import {verifyClientBot,ownerAiMenuReady,registerClientTelegramWebhook} from '../app/client-telegram-transport.js'
import {ownerBotCredentials} from './telegram-hub.mjs'
import {resolvedOwnerTelegramEnv} from './telegram-owner-pairing.js'
import {
  OWNER_AUDIO_BUCKET,OWNER_AUDIO_MAX_BYTES,OWNER_AUDIO_FOLDERS,
  ownerAudioFolder,parseOwnerAudioMessage,parseOwnerAudioCommand,parseOwnerAudioCallback,
  ownerAudioHelpMessage,ownerAudioMaterialsMessage,audioMatchesMagic,
} from './owner-telegram-audio-model.mjs'

const TELEGRAM='https://api.telegram.org/bot'
const NO_RETRIES=3
function failure(code){
  const error=new Error(code)
  error.code=code
  throw error
}
function storageClient(config){
  if(!/^https:\/\/[a-z0-9]{20}\.supabase\.co$/.test(config.supabaseUrl||'')||
     !config.secretKey)failure('OWNER_AUDIO_STORAGE_NOT_CONFIGURED')
  return createClient(config.supabaseUrl,config.secretKey,{
    auth:{persistSession:false,autoRefreshToken:false},
    global:{headers:{'x-client-info':'hh-telegram-owner-audio/1'},
      fetch:(input,init)=>{
        const url=new URL(typeof input==='string'?input:input.url||String(input))
        if(url.origin!==config.supabaseUrl)failure('OWNER_AUDIO_STORAGE_ORIGIN')
        const headers=new Headers(init?.headers)
        if(config.secretKey.startsWith('sb_secret_')&&
           headers.get('authorization')==='Bearer '+config.secretKey)
          headers.delete('authorization')
        return fetch(input,{...init,headers,redirect:'error'})
      }},
  })
}
async function checkedAudioStorage(config){
  const client=storageClient(config)
  const {data,error}=await client.storage.getBucket(OWNER_AUDIO_BUCKET)
  if(error||data?.public!==false||Number(data.file_size_limit)<OWNER_AUDIO_MAX_BYTES||
     !Array.isArray(data.allowed_mime_types)||
     ['audio/ogg','audio/mpeg','audio/mp4','audio/wav']
       .some(mime=>!data.allowed_mime_types.includes(mime)))
    failure('OWNER_AUDIO_STORAGE_UNAVAILABLE')
  return client.storage.from(OWNER_AUDIO_BUCKET)
}
async function ownerTransaction(config,fn){
  return transaction(config,null,async db=>{
    await db.query("select set_config('hh.owner_audio_manager','1',true)")
    return fn(db)
  },{server:true})
}
async function claimAudio(config,event){
  return ownerTransaction(config,async db=>{
    const added=await db.query(
      "insert into app_private.telegram_owner_audio "+
      "(practitioner_id,telegram_update_id,telegram_file_unique_id,title,mime,bytes,duration_seconds) "+
      "values($1,$2,$3,$4,$5,$6,$7) on conflict do nothing "+
      "returning id,status,attempts,title,folder",
      [PRACTITIONER_ID,event.updateId,event.fileUniqueId,event.title,event.mime,event.bytes,event.duration])
    if(added.rowCount)return {claimed:true,row:added.rows[0]}
    const existing=(await db.query(
      "select id,status,attempts,title,folder,processing_started_at,telegram_update_id "+
      "from app_private.telegram_owner_audio where practitioner_id=$1 "+
      "and (telegram_file_unique_id=$2 or telegram_update_id=$3) limit 1",
      [PRACTITIONER_ID,event.fileUniqueId,event.updateId])).rows[0]
    if(!existing)return {claimed:false,reason:'conflict'}
    if(existing.status==='ready')return {claimed:false,reason:'ready',row:existing}
    if(existing.status==='processing' &&
       Date.now()-new Date(existing.processing_started_at).getTime()<120000)
      return {claimed:false,reason:'busy',row:existing}
    // Telegram retries the same update, or the owner re-forwards a failed
    // recording. The file is never duplicated: the stored UUID is reused.
    const newForward=Number(existing.telegram_update_id)!==event.updateId
    if(existing.attempts>=NO_RETRIES&&!newForward)
      return {claimed:false,reason:'exhausted',row:existing}
    const resumed=await db.query(
      "update app_private.telegram_owner_audio set status='processing', "+
      "attempts=$2,telegram_update_id=$3,failure_code=null, "+
      "processing_started_at=now(),updated_at=now() "+
      "where id=$1 and status in ('processing','failed') "+
      "returning id,status,attempts,title,folder",
      [existing.id,newForward?1:Math.min(NO_RETRIES,existing.attempts+1),event.updateId])
    return resumed.rowCount?{claimed:true,row:resumed.rows[0]}:{claimed:false,reason:'busy'}
  })
}
async function markAudio(config,id,status,fields={}){
  return ownerTransaction(config,async db=>{
    if(status==='ready'){
      const response=await db.query(
        "update app_private.telegram_owner_audio "+
        "set status='ready',storage_path=$2,completed_at=now(),failure_code=null,updated_at=now() "+
        "where id=$1 and status='processing' returning id,title,folder",
        [id,fields.path])
      if(response.rowCount!==1)failure('OWNER_AUDIO_DB_WRITE')
      return response.rows[0]
    }
    await db.query(
      "update app_private.telegram_owner_audio "+
      "set status='failed',failure_code=$2,updated_at=now() "+
      "where id=$1 and status='processing'",
      [id,String(fields.code||'OWNER_AUDIO_IMPORT_FAILED').slice(0,80)])
    return null
  })
}
async function telegramRequest(credentials,method,payload,fetcher=fetch){
  const response=await fetcher(TELEGRAM+encodeURIComponent(credentials.token)+'/'+method,{
    method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify(payload),cache:'no-store',redirect:'error',
    signal:AbortSignal.timeout(11000)})
  if(!response.ok)failure('OWNER_AUDIO_TELEGRAM_UNAVAILABLE')
  const data=await response.json().catch(()=>null)
  if(data?.ok!==true)failure('OWNER_AUDIO_TELEGRAM_UNAVAILABLE')
  return data.result
}
async function sendOwner(credentials,text,replyMarkup,fetcher=fetch){
  const response=await telegramRequest(credentials,'sendMessage',{
    chat_id:credentials.chat,text,disable_web_page_preview:true,
    ...(replyMarkup?{reply_markup:replyMarkup}:{})
  },fetcher)
  if(!Number.isSafeInteger(response?.message_id)||
     String(response.chat?.id)!==credentials.chat)failure('OWNER_AUDIO_TELEGRAM_DESTINATION')
}
function folderLabel(folder){
  return OWNER_AUDIO_FOLDERS.find(item=>item.id===folder)?.ru||'Входящие'
}
function itemLink(id){
  return 'https://holistichouse.vercel.app/admin/materials/telegram?item='+encodeURIComponent(id)
}
function chooseFolderButtons(id){
  const button=folder=>({text:folderLabel(folder),callback_data:'hh-audio:'+id+':'+folder})
  return {inline_keyboard:[
    [button('meditations'),button('antistress')],
    [button('reiki'),button('egyptian')],
    [button('greek'),button('other')],
    [{text:'📁 Мои материалы · открыть',url:itemLink(id)}],
    [{text:'🎙 Переслать ещё аудио · инструкция',callback_data:'hh-audio:help'}],
  ]}
}
async function telegramAudioBytes(credentials,event,fetcher=fetch){
  const info=await telegramRequest(credentials,'getFile',{file_id:event.fileId},fetcher)
  if(!info||!Number.isSafeInteger(info.file_size)||info.file_size!==event.bytes||
     info.file_size>OWNER_AUDIO_MAX_BYTES||
     typeof info.file_path!=='string'||!/^[A-Za-z0-9_./-]{1,240}$/.test(info.file_path)||
     info.file_path.split('/').some(part=>part==='.'||part==='..'||!part))
    failure('OWNER_AUDIO_TELEGRAM_FILE_INVALID')
  const path=info.file_path.split('/').map(encodeURIComponent).join('/')
  const response=await fetcher('https://api.telegram.org/file/bot'+
    encodeURIComponent(credentials.token)+'/'+path,{
      method:'GET',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(25000)})
  if(!response.ok||Number(response.headers.get('content-length')||0)>OWNER_AUDIO_MAX_BYTES)
    failure('OWNER_AUDIO_DOWNLOAD_FAILED')
  const bytes=new Uint8Array(await response.arrayBuffer())
  if(bytes.length!==event.bytes||!audioMatchesMagic(bytes,event.mime))
    failure('OWNER_AUDIO_BAD_AUDIO_FILE')
  return bytes
}
async function importAudio(config,event,credentials,fetcher=fetch){
  const claimed=await claimAudio(config,event)
  if(!claimed.claimed){
    if(claimed.reason==='busy')return {handled:true,retry:true}
    if(claimed.reason==='ready')
      await sendOwner(credentials,'✅ Эта запись уже есть во «Входящих» или выбранной папке.\n'+itemLink(claimed.row.id),chooseFolderButtons(claimed.row.id),fetcher).catch(()=>{})
    if(claimed.reason==='exhausted')
      await sendOwner(credentials,'Не удалось сохранить аудио. Перешлите сообщение ещё раз, чтобы повторить попытку.',null,fetcher).catch(()=>{})
    return {handled:true}
  }
  const row=claimed.row, path='telegram-inbox/'+row.id+'.'+event.ext
  try{
    const bytes=await telegramAudioBytes(credentials,event,fetcher)
    const storage=await checkedAudioStorage(config)
    // A retry after a successful Storage upload but failed DB receipt must
    // verify the existing object instead of overwriting it or creating a copy.
    const {data:existing,error:infoError}=await storage.info(path)
    if(!infoError){
      if(Number(existing?.size)!==bytes.length)failure('OWNER_AUDIO_STORAGE_CONFLICT')
    }else if(String(infoError.statusCode||infoError.status||'')==='404'||
             /not found/i.test(String(infoError.message||''))){
      const {error}=await storage.upload(path,new Blob([bytes],{type:event.mime}),{
        contentType:event.mime,cacheControl:'3600',upsert:false})
      if(error)failure('OWNER_AUDIO_STORAGE_UPLOAD_FAILED')
    }else failure('OWNER_AUDIO_STORAGE_UNAVAILABLE')
    const ready=await markAudio(config,row.id,'ready',{path})
    // Receiving audio never exposes it publicly or places it on a learner slide.
    await sendOwner(credentials,'✅ Аудио сохранено приватно в «Мои материалы → Входящие».\n'+
      'Укажи папку кнопкой ниже или позже на сайте:\n'+
      itemLink(ready.id),chooseFolderButtons(ready.id),fetcher).catch(()=>{})
    return {handled:true}
  }catch(error){
    const code=/^OWNER_AUDIO_[A-Z_]+$/.test(error?.code||'')?error.code:'OWNER_AUDIO_IMPORT_FAILED'
    await markAudio(config,row.id,'failed',{code}).catch(()=>{})
    const retry=row.attempts<NO_RETRIES
    if(!retry)await sendOwner(credentials,'⚠️ Не удалось сохранить запись. Перешли её ещё раз или загрузи через «Мои материалы».',null,fetcher).catch(()=>{})
    return {handled:true,retry}
  }
}
async function updateFolderFromBot(config,event,credentials,fetcher=fetch){
  const result=await ownerTransaction(config,async db=>{
    const row=(await db.query(
      "update app_private.telegram_owner_audio set folder=$3,updated_at=now() "+
      "where id=$1 and practitioner_id=$2 and status='ready' "+
      "returning id,folder",
      [event.id,PRACTITIONER_ID,event.folder])).rows[0]
    return row
  })
  await telegramRequest(credentials,'answerCallbackQuery',{
    callback_query_id:event.callbackId,
    text:result?'📁 Перемещено: '+folderLabel(result.folder):'Запись не найдена',
    show_alert:false},fetcher).catch(()=>{})
  return {handled:true}
}
export async function receiveOwnerTelegramAudioWebhook(config,update,{
  env=process.env,fetcher=fetch,now=Date.now()
}={}){
  // This handler is composed INSIDE the already secret-verified shared webhook.
  if(env.VERCEL_ENV==='preview'||telegramClientBotMode(env)!=='shared_practice')
    return {handled:false}
  const event=parseOwnerAudioMessage(update,now)||
    parseOwnerAudioCommand(update,now)||parseOwnerAudioCallback(update)
  if(!event)return {handled:false}
  const effective=await resolvedOwnerTelegramEnv(config,env)
  const credentials=ownerBotCredentials(effective)
  if(!credentials||event.chatId!==credentials.chat||event.userId!==credentials.chat)
    return {handled:false}
  if(event.action==='help'||event.action==='materials'){
    if(event.callbackId){
      await telegramRequest(credentials,'answerCallbackQuery',{
        callback_query_id:event.callbackId},fetcher).catch(()=>{})
    }else if(env.HH_OWNER_AI_TG_ENABLED==='true'){
      // First /audio refreshes the private owner's BotFather menu in place.
      // The same guarded registration refuses to replace any foreign webhook.
      // Failure must not prevent manual forwarding and saved-file instructions.
      let ready=false
      try{
        await verifyClientBot(env,{requireWebhook:true})
        ready=await ownerAiMenuReady(config,env)
      }catch{/* Owner can always type /audio manually. */}
      if(!ready)await registerClientTelegramWebhook(env,{config}).catch(()=>{})
    }
    const guide=event.action==='help'?ownerAudioHelpMessage():ownerAudioMaterialsMessage()
    await sendOwner(credentials,guide.text,guide.reply_markup,fetcher)
    return {handled:true}
  }
  if(event.action==='reject'){
    await sendOwner(credentials,event.reason==='size'
      ?'Аудио не импортировано: Telegram-бот скачивает файлы до 20 МБ. Для длинной записи используй загрузку на сайте.'
      :'Аудио не импортировано: нужен голосовой файл OGG, MP3, M4A или WAV.',null,fetcher).catch(()=>{})
    return {handled:true}
  }
  if(event.action==='folder')return updateFolderFromBot(config,event,credentials,fetcher)
  return importAudio(config,event,credentials,fetcher)
}
export async function listOwnerTelegramAudio(config){
  const files=await ownerTransaction(config,async db=>(await db.query(
    "select id,title,folder,mime,bytes,duration_seconds,received_at "+
    "from app_private.telegram_owner_audio "+
    "where practitioner_id=$1 and status='ready' "+
    "order by received_at desc limit 60",
    [PRACTITIONER_ID])).rows)
  if(!files.length)return {files:[]}
  const storage=await checkedAudioStorage(config)
  const items=await Promise.all(files.map(async row=>{
    const ext=row.mime==='audio/ogg'?'ogg':row.mime==='audio/mpeg'?'mp3':
      row.mime==='audio/mp4'?'m4a':'wav'
    const path='telegram-inbox/'+row.id+'.'+ext
    const {data,error}=await storage.createSignedUrl(path,300)
    if(error||!data?.signedUrl)return {...row,previewUrl:null}
    const url=new URL(data.signedUrl,config.supabaseUrl)
    if(url.origin!==config.supabaseUrl||
       !url.pathname.startsWith('/storage/v1/object/sign/'+OWNER_AUDIO_BUCKET+'/')||
       !url.searchParams.has('token'))return {...row,previewUrl:null}
    return {...row,previewUrl:url.toString()}
  }))
  return {files:items,previewExpiresSeconds:300,truncated:files.length===60}
}
export async function editOwnerTelegramAudio(config,{id,title,folder}={}){
  if(typeof id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id)||
     typeof title!=='string'||title.trim().length<1||title.trim().length>120||
     /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(title)||!ownerAudioFolder(folder))
    failure('OWNER_AUDIO_INVALID_EDIT')
  const row=await ownerTransaction(config,async db=>(await db.query(
    "update app_private.telegram_owner_audio set title=$3,folder=$4,updated_at=now() "+
    "where id=$1 and practitioner_id=$2 and status='ready' "+
    "returning id,title,folder",
    [id,PRACTITIONER_ID,title.trim(),folder])).rows[0])
  if(!row)failure('OWNER_AUDIO_NOT_FOUND')
  return row
}
