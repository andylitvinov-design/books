import 'server-only'
import {randomUUID} from 'node:crypto'
import {createClient} from '@supabase/supabase-js'
import {transaction} from '../app/database.js'
import {joinOggOpus,OWNER_AUDIO_COMBINE_MAX_PARTS,
  OWNER_AUDIO_COMBINE_MAX_BYTES} from './owner-telegram-audio-join.mjs'
import {PRACTITIONER_ID} from '../../data/app-services.js'
import {telegramClientBotMode} from '../app/client-telegram-policy.js'
import {verifyClientBot,ownerAiMenuReady,registerClientTelegramWebhook} from '../app/client-telegram-transport.js'
import {ownerBotCredentials} from './telegram-hub.mjs'
import {resolvedOwnerTelegramEnv} from './telegram-owner-pairing.js'
import {
  OWNER_AUDIO_BUCKET,OWNER_AUDIO_MAX_BYTES,OWNER_AUDIO_FOLDERS,OWNER_AUDIO_DESTINATION_MINUTES,
  ownerAudioFolder,parseOwnerAudioMessage,parseOwnerAudioCommand,parseOwnerAudioCallback,
  ownerAudioHelpMessage,ownerAudioMaterialsMessage,ownerAudioDestinationSelectedMessage,
  ownerAudioCombineKeyboard,OWNER_AUDIO_MATERIALS_URL,
  audioMatchesMagic,
} from './owner-telegram-audio-model.mjs'
import {ownerAudioIdValid,ownerAudioMediaPath,ownerAudioByteRange} from './owner-telegram-audio-playback.mjs'

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
// Selecting a folder is one-use and expires. A Telegram update received BEFORE
// the selection never steals the target of a later recording (retry safe).
async function setNextAudioDestination(config,event){
  return ownerTransaction(config,async db=>{
    const result=await db.query(
      "insert into app_private.telegram_owner_audio_destination "+
      "(practitioner_id,pending_folder,pending_expires_at,last_update_id) "+
      "values($1,$2,now()+($4*interval '1 minute'),$3) "+
      "on conflict(practitioner_id) do update set "+
      "pending_folder=excluded.pending_folder, "+
      "pending_expires_at=excluded.pending_expires_at, "+
      "last_update_id=excluded.last_update_id,changed_at=now() "+
      "where app_private.telegram_owner_audio_destination.last_update_id<excluded.last_update_id "+
      "returning pending_folder",
      [PRACTITIONER_ID,event.folder,event.updateId,OWNER_AUDIO_DESTINATION_MINUTES])
    if(result.rowCount)return {applied:true,folder:result.rows[0].pending_folder}
    const current=(await db.query(
      "select pending_folder from app_private.telegram_owner_audio_destination "+
      "where practitioner_id=$1",[PRACTITIONER_ID])).rows[0]
    return {applied:false,folder:current?.pending_folder||null}
  })
}
async function claimAudio(config,event){
  return ownerTransaction(config,async db=>{
    // Lock the session before claiming any upload so /cancel and /done cannot
    // accidentally turn a temporary part into a permanent material.
    const session=(await db.query(
      "select batch_id,status,items,started_update_id,last_command_update_id,expires_at,prompt_message_id,result_folder "+
      "from app_private.telegram_owner_audio_combine "+
      "where practitioner_id=$1 for update",[PRACTITIONER_ID])).rows[0]
    const ignoredCancelled=session?.status==='cancelled'&&
      event.updateId>Number(session.started_update_id)&&
      event.updateId<=Number(session.last_command_update_id)
    if(ignoredCancelled)return {claimed:false,reason:'batch_cancelled'}
    // Telegram may retry a part after /done has already committed its final
    // document. Older updates must not become independent library recordings.
    const ignoredFinished=session?.status==='ready'&&
      event.updateId>Number(session.started_update_id)&&
      event.updateId<=Number(session.last_command_update_id)
    if(ignoredFinished)return {claimed:false,reason:'batch_finished'}
    if(session?.status==='building'&&event.updateId>Number(session.started_update_id))
      return {claimed:false,reason:'batch_building'}
    if(session?.status==='collecting'&&
       event.updateId>Number(session.started_update_id)&&
       new Date(session.expires_at).getTime()<=Date.now())
      return {claimed:false,reason:'batch_expired'}
    const active=session?.status==='collecting'&&
      event.updateId>Number(session.started_update_id)&&
      new Date(session.expires_at).getTime()>Date.now()
    const batch=active?{batchId:session.batch_id,folder:session.result_folder,
      promptMessageId:session.prompt_message_id,
      count:combineItems(session.items).length}:null
    if(active){
      const items=combineItems(session.items)
      if(event.mime!=='audio/ogg')return {claimed:false,reason:'batch_unsupported',batch}
      if(items.length>=OWNER_AUDIO_COMBINE_MAX_PARTS)
        return {claimed:false,reason:'batch_full',batch}
      if(items.reduce((sum,item)=>sum+Number(item.bytes||0),0)+event.bytes>
         OWNER_AUDIO_COMBINE_MAX_BYTES)
        return {claimed:false,reason:'batch_too_large',batch}
    }
    const preference=(await db.query(
      "select pending_folder,pending_expires_at,last_update_id "+
      "from app_private.telegram_owner_audio_destination "+
      "where practitioner_id=$1 for update",[PRACTITIONER_ID])).rows[0]
    const requestedFolder=!active&&preference&&
      ownerAudioFolder(preference.pending_folder)&&
      Number(preference.last_update_id)<event.updateId&&
      new Date(preference.pending_expires_at).getTime()>Date.now()
        ?preference.pending_folder:null
    const clearPending=async()=>{
      if(!requestedFolder)return
      await db.query(
        "update app_private.telegram_owner_audio_destination "+
        "set pending_folder=null,pending_expires_at=null,changed_at=now() "+
        "where practitioner_id=$1 and last_update_id=$2",
        [PRACTITIONER_ID,preference.last_update_id])
    }
    const added=await db.query(
      "insert into app_private.telegram_owner_audio "+
      "(practitioner_id,telegram_update_id,telegram_file_unique_id,title,mime,bytes,duration_seconds,folder,combine_batch_id) "+
      "values($1,$2,$3,$4,$5,$6,$7,$8,$9) on conflict do nothing "+
      "returning id,status,attempts,title,folder,combine_batch_id",
      [PRACTITIONER_ID,event.updateId,event.fileUniqueId,event.title,
        event.mime,event.bytes,event.duration,requestedFolder||'inbox',batch?.batchId||null])
    if(added.rowCount){
      await clearPending()
      return {claimed:true,row:added.rows[0],batch}
    }
    const existing=(await db.query(
      "select id,status,attempts,title,folder,combine_batch_id,processing_started_at,telegram_update_id "+
      "from app_private.telegram_owner_audio where practitioner_id=$1 "+
      "and (telegram_file_unique_id=$2 or telegram_update_id=$3) limit 1",
      [PRACTITIONER_ID,event.fileUniqueId,event.updateId])).rows[0]
    if(!existing)return {claimed:false,reason:'conflict',batch}
    if(active&&existing.combine_batch_id&&existing.combine_batch_id!==batch.batchId)
      return {claimed:false,reason:'batch_unsupported',batch}
    if(existing.status==='ready'){
      // A reused library entry is never moved by a batch and never deleted.
      if(requestedFolder&&Number(existing.telegram_update_id)!==event.updateId){
        const moved=(await db.query(
          "update app_private.telegram_owner_audio set folder=$2,updated_at=now() "+
          "where id=$1 and practitioner_id=$3 and status='ready' and combine_batch_id is null "+
          "returning id,title,folder",
          [existing.id,requestedFolder,PRACTITIONER_ID])).rows[0]
        await clearPending()
        if(moved)return {claimed:false,reason:'ready_moved',row:moved,batch}
      }
      return {claimed:false,reason:'ready',row:existing,batch}
    }
    if(existing.status==='processing' &&
       Date.now()-new Date(existing.processing_started_at).getTime()<120000)
      return {claimed:false,reason:'busy',row:existing,batch}
    const newForward=Number(existing.telegram_update_id)!==event.updateId
    if(existing.attempts>=NO_RETRIES&&!newForward)
      return {claimed:false,reason:'exhausted',row:existing,batch}
    const resumed=await db.query(
      "update app_private.telegram_owner_audio set status='processing', "+
      "attempts=$2,telegram_update_id=$3,failure_code=null, "+
      "folder=coalesce($4,folder),combine_batch_id=coalesce($5,combine_batch_id),"+
      "processing_started_at=now(),updated_at=now() "+
      "where id=$1 and status in ('processing','failed') "+
      "returning id,status,attempts,title,folder,combine_batch_id",
      [existing.id,newForward?1:Math.min(NO_RETRIES,existing.attempts+1),
        event.updateId,newForward?requestedFolder:null,batch?.batchId||null])
    if(resumed.rowCount)await clearPending()
    return resumed.rowCount?{claimed:true,row:resumed.rows[0],batch}:
      {claimed:false,reason:'busy',batch}
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
  const data=await response.json().catch(()=>null)
  // Telegram returns 400 if the status is already identical. That is a
  // successful visible state, not a reason to send a duplicate chat message.
  if(!response.ok){
    if(method==='editMessageText'&&response.status===400&&data?.error_code===400&&
       /message is not modified/i.test(String(data.description||'')))
      return {message_id:payload.message_id}
    failure('OWNER_AUDIO_TELEGRAM_UNAVAILABLE')
  }
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
  return response.message_id
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
    [button('inbox')],
    [{text:'📁 Мои материалы · открыть',url:itemLink(id)}],
    [{text:'🎙 Выбрать папку для следующего аудио',callback_data:'hh-audio:help'}],
  ]}
}
function combineImportReply(combine,id){
  if(combine?.batchId&&ownerAudioFolder(combine.folder)){
    const count=Math.max(0,Math.min(OWNER_AUDIO_COMBINE_MAX_PARTS,Number(combine.count)||0))
    const summary='\n🎧 Сборка: '+count+'/'+OWNER_AUDIO_COMBINE_MAX_PARTS+' · итоговая папка «'+
      folderLabel(combine.folder)+'».'
    const note=combine.state==='added'
      ?count>=2?'\nНажми «Готово · объединить» или перешли ещё аудио.':
        '\nПерешли ещё минимум одно голосовое.'
      :combine.state==='unsupported'
      ?'\n⚠️ Этот оригинал сохранён, но только OGG/Opus можно добавить в сборку.'
      :combine.state==='too_large'
      ?'\n⚠️ Этот оригинал не добавлен: лимит сборки 20 МБ.'
      :combine.state==='full'
      ?'\n⚠️ Максимум '+OWNER_AUDIO_COMBINE_MAX_PARTS+' фрагментов. Нажми «Готово · объединить».':''
    return {extra:summary+note,
      keyboard:ownerAudioCombineKeyboard(combine.batchId,combine.folder,count)}
  }
  return {extra:combine?.state==='error'
    ?'\n⚠️ Проверка сборки недоступна, оригинал сохранён. Проверь /combine.':'',
    keyboard:chooseFolderButtons(id)}
}

// A collecting batch owns one editable Telegram status message. Incoming clips
// update that one message; they never create individual saved-file receipts.
function audioCombinePrompt(state){
  const count=Math.max(0,Math.min(OWNER_AUDIO_COMBINE_MAX_PARTS,Number(state.count)||0))
  return (count?'🎧 Аудио принято · ':'🎧 Сборка начата · ')+count+'/'+OWNER_AUDIO_COMBINE_MAX_PARTS+'\n'+
    'Итоговая папка: «'+folderLabel(state.folder)+'».\n'+
    'Перешли от 2 до '+OWNER_AUDIO_COMBINE_MAX_PARTS+' голосовых OGG/Opus (до 20 МБ).\n'+
    (count>=2?'Закончил? Нажми «Готово · объединить» или /done.':
      'Когда добавишь минимум два — появится кнопка «Готово».')+
    '\nЧасти не появятся отдельно в кабинете. Отмена — /cancel.'+
    (state.notice?'\n⚠️ '+state.notice:'')
}
async function editAudioCombinePrompt(credentials,state,fetcher=fetch){
  if(!state?.batchId||!Number.isSafeInteger(Number(state.promptMessageId))||
     Number(state.promptMessageId)<=0)return false
  try{
    await telegramRequest(credentials,'editMessageText',{
      chat_id:credentials.chat,message_id:Number(state.promptMessageId),
      text:audioCombinePrompt(state),
      reply_markup:ownerAudioCombineKeyboard(state.batchId,state.folder,state.count),
      disable_web_page_preview:true},fetcher)
    return true
  }catch{return false}
}
async function rememberAudioCombinePrompt(config,batchId,messageId,updateId){
  if(!Number.isSafeInteger(messageId)||messageId<=0||
     !Number.isSafeInteger(updateId)||updateId<0)return false
  return ownerTransaction(config,async db=>{
    // The update that opened the message still owns this batch. A delayed
    // response to a stale callback cannot replace a newer progress message.
    const saved=await db.query(
      "update app_private.telegram_owner_audio_combine "+
      "set prompt_message_id=$2 where practitioner_id=$1 and batch_id=$3 "+
      "and status='collecting' and last_command_update_id=$4 "+
      "returning prompt_message_id",
      [PRACTITIONER_ID,messageId,batchId,updateId])
    return saved.rowCount===1
  })
}
async function showAudioCombinePrompt(config,credentials,event,state,fetcher=fetch){
  const tested=new Set()
  // First change the exact button the owner tapped. Editing an earlier
  // offscreen message without touching the tapped one looks like a dead button.
  for(const rawId of [event.callbackId?event.messageId:null,state.promptMessageId]){
    const id=Number(rawId)
    if(!Number.isSafeInteger(id)||id<=0||tested.has(id))continue
    tested.add(id)
    if(!await editAudioCombinePrompt(credentials,{...state,promptMessageId:id},fetcher))
      continue
    if(id!==Number(state.promptMessageId)){
      const saved=await rememberAudioCombinePrompt(config,state.batchId,id,event.updateId)
        .catch(()=>false)
      if(saved&&Number.isSafeInteger(Number(state.promptMessageId))&&
         Number(state.promptMessageId)>0)
        await telegramRequest(credentials,'editMessageReplyMarkup',{
          chat_id:credentials.chat,message_id:Number(state.promptMessageId),
          reply_markup:{inline_keyboard:[]}},fetcher).catch(()=>{})
    }
    return true
  }
  // If neither old nor clicked message can be edited, post ONE new status and
  // remember its ID. The DB command-update guard suppresses webhook replays.
  const messageId=await sendOwner(credentials,audioCombinePrompt(state),
    ownerAudioCombineKeyboard(state.batchId,state.folder,state.count),
    fetcher).catch(()=>null)
  if(!messageId)return false
  return rememberAudioCombinePrompt(config,state.batchId,messageId,event.updateId)
    .catch(()=>false)
}
async function updateAudioCombineProgress(credentials,combine,fetcher=fetch){
  if(combine?.batchId&&['added','repeated','full','too_large','unsupported'].includes(combine.state))
    await editAudioCombinePrompt(credentials,{
      ...combine,
      ...(combine.state==='repeated'
        ?{notice:'Эта запись уже добавлена; повтор не засчитывается.'}:{}),
    },fetcher)
}
async function deleteTemporaryAudioParts(config,batchId,storage){
  // Reused normal library originals have combine_batch_id NULL and are NEVER
  // deleted, even when their bytes participated in a merged output.
  const rows=await ownerTransaction(config,async db=>(await db.query(
    "select id,storage_path from app_private.telegram_owner_audio "+
    "where practitioner_id=$1 and combine_batch_id=$2 "+
    "and (status<>'processing' or processing_started_at<now()-interval '3 minutes')",
    [PRACTITIONER_ID,batchId])).rows)
  const paths=rows.map(row=>row.storage_path).filter(Boolean)
  if(paths.length){
    const {error}=await storage.remove([...new Set(paths)])
    if(error)failure('OWNER_AUDIO_BATCH_TEMP_CLEANUP')
  }
  if(!rows.length)return
  // The backend role intentionally has no DELETE privilege. Discard
  // original audio objects, then retire their rows through existing owner-only
  // UPDATE permission so they can never be listed or played as materials.
  // A deliberate new forward of the same Telegram file may import it again.
  await ownerTransaction(config,async db=>db.query(
    "update app_private.telegram_owner_audio "+
    "set status='failed',storage_path=null,completed_at=null,combine_batch_id=null, "+
    "failure_code='OWNER_AUDIO_TEMP_CLEANED',updated_at=now() "+
    "where practitioner_id=$1 and combine_batch_id=$2 and id=any($3::uuid[]) "+
    "and (status<>'processing' or processing_started_at<now()-interval '3 minutes')",
    [PRACTITIONER_ID,batchId,rows.map(row=>row.id)]))
}
// Replaced/cancelled/expired batches must not leave their staged objects in
// private Storage. A valid collecting/rendering batch is never purged.
async function cleanupInactiveAudioBatch(config,batchId,storage){
  const session=await ownerTransaction(config,async db=>(await db.query(
    "select batch_id,status,expires_at from app_private.telegram_owner_audio_combine "+
    "where practitioner_id=$1",[PRACTITIONER_ID])).rows[0])
  if(session?.batch_id===batchId&&['collecting','building'].includes(session.status)&&
     new Date(session.expires_at).getTime()>Date.now())return false
  await deleteTemporaryAudioParts(config,batchId,storage)
  return true
}

async function telegramAudioBytes(credentials,event,fetcher=fetch){
  const info=await telegramRequest(credentials,'getFile',{file_id:event.fileId},fetcher)
  // Telegram File.file_size is optional. The original message supplies the
  // bounded expected byte count, verified against the streamed actual payload.
  if(!info||(info.file_size!==undefined&&
       (!Number.isSafeInteger(info.file_size)||info.file_size!==event.bytes))||
     typeof info.file_path!=='string'||!/^[A-Za-z0-9_./-]{1,240}$/.test(info.file_path)||
     info.file_path.split('/').some(part=>part==='.'||part==='..'||!part))
    failure('OWNER_AUDIO_TELEGRAM_FILE_INVALID')
  const path=info.file_path.split('/').map(encodeURIComponent).join('/')
  const response=await fetcher('https://api.telegram.org/file/bot'+
    encodeURIComponent(credentials.token)+'/'+path,{
      method:'GET',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(25000)})
  const claimedLength=Number(response.headers.get('content-length')||0)
  if(!response.ok||(claimedLength&&claimedLength!==event.bytes))
    failure('OWNER_AUDIO_DOWNLOAD_FAILED')
  // Never allow a provider response to allocate arbitrary memory even if its
  // Content-Length header is absent, wrong or intentionally omitted.
  const reader=response.body?.getReader()
  if(!reader)failure('OWNER_AUDIO_DOWNLOAD_FAILED')
  const bytes=new Uint8Array(event.bytes)
  let received=0
  try{
    while(true){
      const {done,value}=await reader.read()
      if(done)break
      if(!(value instanceof Uint8Array)||received+value.byteLength>event.bytes){
        await reader.cancel().catch(()=>{})
        failure('OWNER_AUDIO_DOWNLOAD_FAILED')
      }
      bytes.set(value,received)
      received+=value.byteLength
    }
  }finally{
    reader.releaseLock()
  }
  if(received!==event.bytes||!audioMatchesMagic(bytes,event.mime))
    failure('OWNER_AUDIO_BAD_AUDIO_FILE')
  return bytes
}
async function importAudio(config,event,credentials,fetcher=fetch){
  const claimed=await claimAudio(config,event)
  if(!claimed.claimed){
    if(claimed.reason==='busy')return {handled:true,retry:true}
    if(claimed.reason==='ready'||claimed.reason==='ready_moved'){
      if(claimed.batch){
        const combine=await appendAudioCombine(config,{...event,batchId:claimed.batch.batchId},claimed.row.id).catch(()=>({state:'error'}))
        await updateAudioCombineProgress(credentials,combine,fetcher)
        return {handled:true}
      }
      const moved=claimed.reason==='ready_moved'
      const receipt=combineImportReply(null,claimed.row.id)
      await sendOwner(credentials,
        (moved?'📁 Уже существующая запись перемещена в «':'✅ Эта запись уже сохранена в «')+
        folderLabel(claimed.row.folder)+'».\n'+itemLink(claimed.row.id)+receipt.extra,
        receipt.keyboard,fetcher).catch(()=>{})
    }
    if(claimed.reason==='batch_full'||claimed.reason==='batch_too_large'||
       claimed.reason==='batch_unsupported'){
      // A rejected temporary part is never downloaded or saved into Materials.
      await editAudioCombinePrompt(credentials,{
        ...claimed.batch,
        notice:claimed.reason==='batch_unsupported'?'Для сборки нужен OGG/Opus. Файл не сохранён.':
          claimed.reason==='batch_full'?'Лимит 12 файлов. Нажми «Готово».':
          'Превышен суммарный лимит 20 МБ. Файл не сохранён.',
      },fetcher)
    }
    if(claimed.reason==='exhausted'&&!claimed.batch)
      await sendOwner(credentials,'Не удалось сохранить аудио. Перешли сообщение ещё раз, чтобы повторить попытку.',null,fetcher).catch(()=>{})
    return {handled:true}
  }
  const row=claimed.row, path='telegram-inbox/'+row.id+'.'+event.ext
  try{
    const bytes=await telegramAudioBytes(credentials,event,fetcher)
    const storage=await checkedAudioStorage(config)
    // Never overwrite an old private blob on retry.
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
    if(claimed.batch){
      // No per-file save acknowledgments or original materials during combine.
      const combine=await appendAudioCombine(config,
        {...event,batchId:claimed.batch.batchId},row.id).catch(()=>({state:'error'}))
      await updateAudioCombineProgress(credentials,combine,fetcher)
      if(combine.state==='inactive')
        await cleanupInactiveAudioBatch(config,claimed.batch.batchId,storage).catch(()=>{})
      return {handled:true}
    }
    const receipt=combineImportReply(null,ready.id)
    await sendOwner(credentials,'✅ Аудио сохранено приватно в «Мои материалы → '+
      folderLabel(ready.folder)+'».\n'+itemLink(ready.id)+receipt.extra,
      receipt.keyboard,fetcher).catch(()=>{})
    return {handled:true}
  }catch(error){
    const code=/^OWNER_AUDIO_[A-Z_]+$/.test(error?.code||'')?error.code:'OWNER_AUDIO_IMPORT_FAILED'
    await markAudio(config,row.id,'failed',{code}).catch(()=>{})
    if(claimed.batch){
      const storage=await checkedAudioStorage(config).catch(()=>null)
      if(storage)await cleanupInactiveAudioBatch(config,claimed.batch.batchId,storage).catch(()=>{})
    }
    const retry=row.attempts<NO_RETRIES
    if(!retry){
      if(claimed.batch)await editAudioCombinePrompt(credentials,{
        ...claimed.batch,notice:'Не удалось обработать одну часть. Перешли её ещё раз.',
      },fetcher)
      else await sendOwner(credentials,'⚠️ Не удалось обработать аудио. Перешли его ещё раз.',null,fetcher).catch(()=>{})
    }
    return {handled:true,retry}
  }
}

const COMBINE_MINUTES=30
const COMBINE_WAIT_MS=130000
function combineItems(value){
  if(!Array.isArray(value))return []
  const seen=new Set()
  return value.filter(item=>{
    if(!item||typeof item.id!=='string'||
       !Number.isSafeInteger(item.updateId)||item.updateId<0||
       seen.has(item.id))return false
    seen.add(item.id)
    return true
  })
}
async function startAudioCombine(config,event){
  return ownerTransaction(config,async db=>{
    const previous=(await db.query(
      "select batch_id,result_folder,status,items,expires_at,last_command_update_id,updated_at,prompt_message_id "+
      "from app_private.telegram_owner_audio_combine "+
      "where practitioner_id=$1 for update",[PRACTITIONER_ID])).rows[0]
    if(previous&&event.updateId<=Number(previous.last_command_update_id))
      return {state:'stale'}
    const live=previous&&new Date(previous.expires_at).getTime()>Date.now()
    if(live&&previous.status==='collecting'){
      // Claim this combine action to make button retries idempotent while
      // retaining the existing 9/12 fragments, folder and recovery TTL.
      await db.query(
        "update app_private.telegram_owner_audio_combine "+
        "set last_command_update_id=$2,updated_at=now(),"+
        "expires_at=greatest(expires_at,now()+interval '30 minutes') "+
        "where practitioner_id=$1 and batch_id=$3",
        [PRACTITIONER_ID,event.updateId,previous.batch_id])
      return {state:'active',batchId:previous.batch_id,
        folder:previous.result_folder,count:combineItems(previous.items).length,
        promptMessageId:previous.prompt_message_id}
    }
    if(previous?.status==='building'&&
       Date.now()-new Date(previous.updated_at).getTime()<COMBINE_WAIT_MS)
      return {state:'building'}
    const batchId=randomUUID()
    await db.query(
      "insert into app_private.telegram_owner_audio_combine "+
      "(practitioner_id,batch_id,status,started_update_id,last_command_update_id,items,expires_at,result_audio_id,result_folder) "+
      "values($1,$2,'collecting',$3,$3,'[]'::jsonb,now()+interval '30 minutes',null,'inbox') "+
      "on conflict(practitioner_id) do update set batch_id=excluded.batch_id,"+
      "status='collecting',started_update_id=excluded.started_update_id,"+
      "last_command_update_id=excluded.last_command_update_id,items='[]'::jsonb,"+
      "expires_at=excluded.expires_at,result_audio_id=null,result_folder='inbox',prompt_message_id=null,updated_at=now()",
      [PRACTITIONER_ID,batchId,event.updateId])
    return {state:'started',batchId,folder:'inbox',count:0,
      obsoleteBatchId:previous?.status==='building'?null:previous?.batch_id||null}
  })
}
async function activeAudioCombine(config,event){
  return ownerTransaction(config,async db=>{
    const row=(await db.query(
      "select batch_id,result_folder,prompt_message_id,started_update_id,items,expires_at "+
      "from app_private.telegram_owner_audio_combine "+
      "where practitioner_id=$1 and status='collecting'",
      [PRACTITIONER_ID])).rows[0]
    if(!row||event.updateId<=Number(row.started_update_id)||
       new Date(row.expires_at).getTime()<=Date.now())return null
    return {batchId:row.batch_id,folder:row.result_folder,
      promptMessageId:row.prompt_message_id,count:combineItems(row.items).length}
  })
}
async function selectAudioCombineFolder(config,event){
  return ownerTransaction(config,async db=>{
    const session=(await db.query(
      "select batch_id,status,result_folder,items,started_update_id,"+
      "last_command_update_id,expires_at,result_audio_id,prompt_message_id "+
      "from app_private.telegram_owner_audio_combine "+
      "where practitioner_id=$1 for update",[PRACTITIONER_ID])).rows[0]
    if(!session||session.batch_id!==event.batchId||
       event.updateId<=Number(session.last_command_update_id)||
       event.updateId<=Number(session.started_update_id))
      return {state:'stale'}
    if(session.status!=='collecting'||session.result_audio_id||
       new Date(session.expires_at).getTime()<=Date.now())
      return {state:'inactive'}
    await db.query(
      "update app_private.telegram_owner_audio_combine "+
      "set result_folder=$2,last_command_update_id=$3,updated_at=now() "+
      "where practitioner_id=$1 and batch_id=$4",
      [PRACTITIONER_ID,event.folder,event.updateId,event.batchId])
    return {state:'selected',batchId:event.batchId,
      folder:event.folder,count:combineItems(session.items).length,
      promptMessageId:session.prompt_message_id}
  })
}
async function appendAudioCombine(config,event,audioId){
  return ownerTransaction(config,async db=>{
    const session=(await db.query(
      "select batch_id,result_folder,status,started_update_id,last_command_update_id,items,expires_at,result_audio_id,prompt_message_id "+
      "from app_private.telegram_owner_audio_combine "+
      "where practitioner_id=$1 for update",[PRACTITIONER_ID])).rows[0]
    if(!session||session.status!=='collecting'||session.result_audio_id||
       (event.batchId&&session.batch_id!==event.batchId)||
       event.updateId<=Number(session.started_update_id)||
       new Date(session.expires_at).getTime()<=Date.now())
      return {state:'inactive'}
    const meta={batchId:session.batch_id,folder:session.result_folder,
      promptMessageId:session.prompt_message_id}
    const items=combineItems(session.items)
    if(event.mime!=='audio/ogg')return {...meta,state:'unsupported',count:items.length}
    if(items.some(part=>part.updateId===event.updateId||part.id===audioId))
      return {...meta,state:'repeated',count:items.length}
    if(items.length>=OWNER_AUDIO_COMBINE_MAX_PARTS)
      return {...meta,state:'full',count:items.length}
    if(items.reduce((sum,item)=>sum+Number(item.bytes||0),0)+event.bytes>
       OWNER_AUDIO_COMBINE_MAX_BYTES)
      return {...meta,state:'too_large',count:items.length}
    items.push({id:audioId,updateId:event.updateId,bytes:event.bytes})
    await db.query(
      "update app_private.telegram_owner_audio_combine "+
      "set items=$2::jsonb,expires_at=now()+($3*interval '1 minute'),updated_at=now() "+
      "where practitioner_id=$1",
      [PRACTITIONER_ID,JSON.stringify(items),COMBINE_MINUTES])
    return {...meta,state:'added',count:items.length}
  })
}
async function cancelAudioCombine(config,event){
  return ownerTransaction(config,async db=>{
    const session=(await db.query(
      "select batch_id,status,expires_at,last_command_update_id,prompt_message_id from "+
      "app_private.telegram_owner_audio_combine "+
      "where practitioner_id=$1 for update",[PRACTITIONER_ID])).rows[0]
    if(event.batchId&&session?.batch_id!==event.batchId)return {state:'stale'}
    if(!session||session.status!=='collecting'||
       new Date(session.expires_at).getTime()<=Date.now())return {state:'inactive'}
    if(event.updateId<=Number(session.last_command_update_id))return {state:'stale'}
    await db.query(
      "update app_private.telegram_owner_audio_combine "+
      "set status='cancelled',last_command_update_id=$2,updated_at=now() "+
      "where practitioner_id=$1",[PRACTITIONER_ID,event.updateId])
    return {state:'cancelled',batchId:session.batch_id,
      promptMessageId:session.prompt_message_id}
  })
}
async function reserveAudioCombine(config,event){
  return ownerTransaction(config,async db=>{
    const session=(await db.query(
      "select batch_id,status,started_update_id,last_command_update_id,"+
      "items,expires_at,updated_at,result_audio_id,result_folder,prompt_message_id "+
      "from app_private.telegram_owner_audio_combine "+
      "where practitioner_id=$1 for update",[PRACTITIONER_ID])).rows[0]
    if(!session)return {state:'missing'}
    if(event.batchId&&session.batch_id!==event.batchId)return {state:'stale'}
    if(session.status==='ready')return {state:'ready',id:session.result_audio_id}
    if(session.status==='building'){
      if(Date.now()-new Date(session.updated_at).getTime()<COMBINE_WAIT_MS)
        return {state:'building'}
      // A lost Vercel invocation may be resumed by a NEW owner /done.
      if(event.updateId<=Number(session.last_command_update_id))
        return {state:'building'}
    }else if(session.status!=='collecting')return {state:'missing'}
    if(new Date(session.expires_at).getTime()<=Date.now())
      return {state:'expired'}
    if(event.updateId<=Number(session.started_update_id)||
       event.updateId<=Number(session.last_command_update_id))
      return {state:'stale'}
    const items=combineItems(session.items)
    const unfinished=(await db.query(
      "select count(*)::int as count from app_private.telegram_owner_audio a "+
      "where a.practitioner_id=$1 and a.combine_batch_id=$2 and a.telegram_update_id<$3 "+
      "and (a.status<>'ready' or not exists (select 1 from jsonb_array_elements($4::jsonb) part "+
      "where part->>'id'=a.id::text))",
      [PRACTITIONER_ID,session.batch_id,event.updateId,JSON.stringify(items)])).rows[0]
    if(Number(unfinished?.count)>0)return {state:'pending'}
    if(items.length<2)return {state:'few',count:items.length}
    if(items.length>OWNER_AUDIO_COMBINE_MAX_PARTS)return {state:'too_many'}
    const ids=[...new Set(items.map(item=>item.id))]
    const rows=(await db.query(
      "select id,status,mime,bytes,storage_path,duration_seconds,folder "+
      "from app_private.telegram_owner_audio "+
      "where practitioner_id=$1 and id=any($2::uuid[])",
      [PRACTITIONER_ID,ids])).rows
    const byId=new Map(rows.map(row=>[row.id,row]))
    const ordered=items.sort((a,b)=>a.updateId-b.updateId).map(item=>byId.get(item.id))
    if(ordered.some(row=>!row||row.status!=='ready'||!row.storage_path))
      return {state:'pending'}
    if(ordered.some(row=>row.mime!=='audio/ogg'))return {state:'unsupported'}
    if(ordered.reduce((size,row)=>size+Number(row.bytes),0)>OWNER_AUDIO_COMBINE_MAX_BYTES)
      return {state:'too_large'}
    // Keep the foreign key NULL until the new audio row is committed.
    // The stable batch UUID is the deterministic result ID on every retry.
    const resultId=session.batch_id
    await db.query(
      "update app_private.telegram_owner_audio_combine "+
      "set status='building',items=$3::jsonb,last_command_update_id=$2,updated_at=now() "+
      "where practitioner_id=$1",[PRACTITIONER_ID,event.updateId,JSON.stringify(items)])
    return {state:'reserved',batchId:session.batch_id,resultId,
      folder:session.result_folder,promptMessageId:session.prompt_message_id,parts:ordered}
  })
}
async function readAudioCombineParts(storage,parts){
  const clips=[]
  for(const part of parts){
    const {data,error}=await storage.download(part.storage_path)
    if(error||!data||data.size!==Number(part.bytes))
      failure('OWNER_AUDIO_COMBINE_STORAGE_READ')
    const bytes=new Uint8Array(await data.arrayBuffer())
    if(bytes.length!==Number(part.bytes)||!audioMatchesMagic(bytes,'audio/ogg'))
      failure('OWNER_AUDIO_COMBINE_BAD_SOURCE')
    clips.push(bytes)
  }
  return joinOggOpus(clips)
}
async function saveAudioCombine(config,batch,event,bytes,storage){
  const path='telegram-inbox/'+batch.resultId+'.ogg'
  const {data:existing,error:infoError}=await storage.info(path)
  if(!infoError){
    if(Number(existing?.size)!==bytes.length)failure('OWNER_AUDIO_STORAGE_CONFLICT')
  }else if(String(infoError.statusCode||infoError.status||'')==='404'||
           /not found/i.test(String(infoError.message||''))){
    const {error}=await storage.upload(path,new Blob([bytes],{type:'audio/ogg'}),{
      contentType:'audio/ogg',upsert:false,cacheControl:'3600'})
    if(error)failure('OWNER_AUDIO_STORAGE_UPLOAD_FAILED')
  }else failure('OWNER_AUDIO_STORAGE_UNAVAILABLE')
  return ownerTransaction(config,async db=>{
    const check=(await db.query(
      "select batch_id,status,result_audio_id from "+
      "app_private.telegram_owner_audio_combine "+
      "where practitioner_id=$1 for update",[PRACTITIONER_ID])).rows[0]
    if(check?.status!=='building'||check.batch_id!==batch.batchId||
       check.result_audio_id!==null)
      failure('OWNER_AUDIO_COMBINE_SESSION_CHANGED')
    const duration=Math.min(86400,batch.parts.reduce((n,p)=>n+Number(p.duration_seconds||0),0))
    const title='Объединённая запись · '+new Date().toISOString().slice(0,16).replace('T',' ')
    const stored=(await db.query(
      "insert into app_private.telegram_owner_audio "+
      "(id,practitioner_id,telegram_update_id,telegram_file_unique_id,title,folder,"+
      "mime,bytes,duration_seconds,storage_path,status,completed_at) "+
      "values($1,$2,$3,$4,$5,$6,'audio/ogg',$7,$8,$9,'ready',now()) "+
      "on conflict(telegram_file_unique_id) do nothing returning id,folder",
      [batch.resultId,PRACTITIONER_ID,event.updateId,
       'combine_'+batch.batchId.replace(/-/g,''),title,batch.folder,
       bytes.length,duration,path])).rows[0]
    if(!stored)failure('OWNER_AUDIO_COMBINE_DUPLICATE')
    await db.query(
      "update app_private.telegram_owner_audio_combine "+
      "set status='ready',result_audio_id=$2,updated_at=now() where practitioner_id=$1",
      [PRACTITIONER_ID,batch.resultId])
    return stored
  })
}
// The success acknowledgment is about Telegram accepting an actual binary
// attachment. A private My Materials link alone does not count as delivery.
function combinedDeliveryKeyboard(id){
  const current=chooseFolderButtons(id)
  return {inline_keyboard:[
    [{text:'▶️ Голосовое без подписи · переслать',callback_data:'hh-audio:voice:'+id}],
    [{text:'📎 Отправить объединённый файл ещё раз',
      callback_data:'hh-audio:resend:'+id}],
    ...current.inline_keyboard,
  ]}
}
// OGG/Opus is already the native Telegram voice format. Send a second,
// caption-free voice note rather than an MP3 conversion or another document.
// The returned provider message MUST contain voice media for the owner chat.
async function sendCombinedVoice(credentials,bytes,fetcher=fetch){
  if(!(bytes instanceof Uint8Array)||bytes.length<128||
     bytes.length>OWNER_AUDIO_COMBINE_MAX_BYTES||
     !audioMatchesMagic(bytes,'audio/ogg'))
    failure('OWNER_AUDIO_COMBINE_VOICE_INVALID')
  const form=new FormData()
  form.set('chat_id',credentials.chat)
  form.set('voice',new Blob([bytes],{type:'audio/ogg'}),'combined-voice.ogg')
  // No caption, keyboard, reply-to or protected link: clean forwardable media.
  const response=await fetcher(TELEGRAM+encodeURIComponent(credentials.token)+'/sendVoice',{
    method:'POST',body:form,cache:'no-store',redirect:'error',
    signal:AbortSignal.timeout(25000)})
  if(!response.ok)failure('OWNER_AUDIO_COMBINE_VOICE_SEND')
  const body=await response.json().catch(()=>null)
  const result=body?.result,voice=result?.voice
  if(body?.ok!==true||!Number.isSafeInteger(result?.message_id)||
     String(result?.chat?.id)!==credentials.chat||
     typeof voice?.file_id!=='string'||!voice.file_id||
     (voice.file_size!==undefined&&voice.file_size!==bytes.length))
    failure('OWNER_AUDIO_COMBINE_VOICE_SEND')
  return {messageId:result.message_id}
}
async function sendCombinedDocument(credentials,bytes,parts,folder,fetcher=fetch,resultId=null){
  const form=new FormData()
  form.set('chat_id',credentials.chat)
  form.set('document',new Blob([bytes],{type:'audio/ogg'}),'combined-voice.ogg')
  form.set('caption','✅ Готово: '+parts+' аудио объединены. Сохранено в «'+folderLabel(folder)+'» · OGG/Opus')
  form.set('reply_markup',JSON.stringify({inline_keyboard:[
    ...(resultId&&ownerAudioIdValid(resultId)?[[{text:'▶️ Голосовое для пересылки',
      callback_data:'hh-audio:voice:'+resultId}]]:[]),
    [{text:'📁 Мои материалы',url:OWNER_AUDIO_MATERIALS_URL}],
  ]}))
  const response=await fetcher(TELEGRAM+encodeURIComponent(credentials.token)+'/sendDocument',{
    method:'POST',body:form,cache:'no-store',redirect:'error',
    signal:AbortSignal.timeout(25000)})
  if(!response.ok)failure('OWNER_AUDIO_COMBINE_TELEGRAM_SEND')
  const body=await response.json().catch(()=>null)
  const document=body?.result?.document
  if(body?.ok!==true||!Number.isSafeInteger(body.result?.message_id)||
     String(body.result?.chat?.id)!==credentials.chat||
     typeof document?.file_id!=='string'||!document.file_id||
     (document.file_size!==undefined&&document.file_size!==bytes.length))
    failure('OWNER_AUDIO_COMBINE_TELEGRAM_SEND')
  return {messageId:body.result.message_id}
}
async function resendSavedCombined(config,event,credentials,fetcher=fetch){
  const voiceOnly=event.action==='track'||event.action==='voice'
  // Claim each explicit Telegram update ID before sending any bytes.
  // A provider webhook retry of the same /done must NEVER produce a duplicate
  // document. A new /done or owner click is a fresh, deliberate resend.
  const row=await ownerTransaction(config,async db=>{
    const session=(await db.query(
      "select batch_id,status,result_audio_id,last_command_update_id,"+
      "jsonb_array_length(items) as parts "+
      "from app_private.telegram_owner_audio_combine "+
      "where practitioner_id=$1 for update",
      [PRACTITIONER_ID])).rows[0]
    if(!session||session.status!=='ready'||!session.result_audio_id||
       (event.batchId&&session.batch_id!==event.batchId))
      return {state:'stale'}
    if(event.updateId<=Number(session.last_command_update_id))
      return {state:'duplicate'}
    const claim=await db.query(
      "update app_private.telegram_owner_audio_combine "+
      "set last_command_update_id=$2,updated_at=now() "+
      "where practitioner_id=$1 and status='ready' and last_command_update_id<$2 "+
      "returning result_audio_id",
      [PRACTITIONER_ID,event.updateId])
    if(claim.rowCount!==1)return {state:'duplicate'}
    const audio=(await db.query(
      "select mime,bytes,storage_path,folder "+
      "from app_private.telegram_owner_audio "+
      "where id=$1 and practitioner_id=$2 and status='ready' and combine_batch_id is null",
      [session.result_audio_id,PRACTITIONER_ID])).rows[0]
    return {...session,...audio}
  })
  if(row?.state==='duplicate')return {handled:true}
  if(!row||row.state==='stale'){
    await sendOwner(credentials,
      'Эта сборка ещё не завершена или кнопка устарела. Отправь /combine для новой сборки.',
      null,fetcher).catch(()=>{})
    return {handled:true}
  }
  const id=row.result_audio_id
  const keyboard=combinedDeliveryKeyboard(id)
  try{
    if(row.mime!=='audio/ogg'||!Number.isSafeInteger(Number(row.bytes))||
       Number(row.bytes)<128||Number(row.bytes)>OWNER_AUDIO_COMBINE_MAX_BYTES||
       !Number.isSafeInteger(row.parts)||row.parts<2||
       row.parts>OWNER_AUDIO_COMBINE_MAX_PARTS||
       row.storage_path!=='telegram-inbox/'+id+'.ogg')
      failure('OWNER_AUDIO_COMBINE_SAVED_FILE_INVALID')
    const storage=await checkedAudioStorage(config)
    const {data,error}=await storage.download(row.storage_path)
    if(error||!data||data.size!==Number(row.bytes))
      failure('OWNER_AUDIO_COMBINE_STORAGE_READ')
    const bytes=new Uint8Array(await data.arrayBuffer())
    if(bytes.length!==Number(row.bytes)||!audioMatchesMagic(bytes,'audio/ogg'))
      failure('OWNER_AUDIO_COMBINE_BAD_SOURCE')
    if(voiceOnly){
      // /track and an owner-scoped button deliver ONLY the shareable voice.
      await sendCombinedVoice(credentials,bytes,fetcher)
    }else{
      await sendCombinedDocument(credentials,bytes,row.parts,row.folder,fetcher,id)
      await deleteTemporaryAudioParts(config,row.batch_id,storage).catch(()=>{})
      // An optional voice failure cannot erase a confirmed document delivery.
      try{await sendCombinedVoice(credentials,bytes,fetcher)}
      catch{
        await sendOwner(credentials,
          '⚠️ Документ отправлен, но Telegram не подтвердил отдельное голосовое. '+
          'Нажми «▶️ Голосовое без подписи» или отправь /track.',
          keyboard,fetcher).catch(()=>{})
      }
    }
  }catch{
    // No blind retry: a timeout might follow actual provider acceptance.
    await sendOwner(credentials,voiceOnly
      ?'⚠️ Telegram не подтвердил отправку голосового. '+
       'Нажми «▶️ Голосовое без подписи» или повтори /track.'
      :'⚠️ Готовый файл сохранён приватно, но Telegram не подтвердил отправку вложения. '+
       'Нажми «Отправить объединённый файл ещё раз», чтобы повторить без новой склейки.\n'+
       itemLink(id),keyboard,fetcher).catch(()=>{})
  }
  return {handled:true}
}
async function finishAudioCombine(config,event,credentials,fetcher=fetch){
  const batch=await reserveAudioCombine(config,event)
  if(batch.state==='ready')return resendSavedCombined(config,event,credentials,fetcher)
  if(batch.state!=='reserved'){
    const messages={
      missing:'Сейчас нет сборки. Начни командой /combine.',
      expired:'Сборка истекла через 30 минут. Начни новую: /combine.',
      few:'Нужно минимум два голосовых. Отправь ещё запись и повтори /done.',
      too_many:'Для одной сборки допускается не больше '+OWNER_AUDIO_COMBINE_MAX_PARTS+' записей.',
      pending:'Некоторые записи ещё сохраняются или завершились ошибкой. Дождись ✅ для каждой, затем повтори /done.',
      unsupported:'Склейка поддерживает голосовые OGG/Opus. MP3/M4A пока сохраняются отдельно.',
      too_large:'Суммарный размер больше 20 МБ. Создай две сборки меньшего размера.',
      building:'Сборка ещё обрабатывается. Не отправляй её повторно сразу.',
      stale:'Этот запрос уже обработан.',
    }
    await sendOwner(credentials,messages[batch.state]||
      'Не удалось начать сборку. Повтори /done.',null,fetcher).catch(()=>{})
    return {handled:true}
  }
  try{
    // Edit the first chat message instead of creating another status message.
    if(batch.promptMessageId)await telegramRequest(credentials,'editMessageText',{
      chat_id:credentials.chat,message_id:Number(batch.promptMessageId),
      text:'⏳ '+batch.parts.length+' аудио принято. Объединяю в один файл…',
      reply_markup:{inline_keyboard:[]}},fetcher).catch(()=>{})
    const storage=await checkedAudioStorage(config)
    const bytes=await readAudioCombineParts(storage,batch.parts)
    const saved=await saveAudioCombine(config,batch,event,bytes,storage)
    // Do not delete input bytes until Telegram accepted the merged attachment;
    // on failed delivery, originals remain hidden and recoverable.
    try{
      await sendCombinedDocument(credentials,bytes,batch.parts.length,saved.folder,fetcher,saved.id)
      // Only new batch-tagged parts; never reused standalone library recordings.
      await deleteTemporaryAudioParts(config,batch.batchId,storage).catch(()=>{})
      if(batch.promptMessageId)await telegramRequest(credentials,'editMessageText',{
        chat_id:credentials.chat,message_id:Number(batch.promptMessageId),
        text:'✅ '+batch.parts.length+' аудио объединены. Готовый файл отправлен ниже.',
        reply_markup:{inline_keyboard:[]}},fetcher).catch(()=>{})
      // Separate clean Telegram waveform, without report text or caption.
      try{await sendCombinedVoice(credentials,bytes,fetcher)}
      catch{
        await sendOwner(credentials,
          '⚠️ Документ отправлен, но голосовое без подписи не подтверждено Telegram. '+
          'Нажми «▶️ Голосовое без подписи» или отправь /track.',
          combinedDeliveryKeyboard(saved.id),fetcher).catch(()=>{})
      }
    }catch{
      await sendOwner(credentials,
        '⚠️ Один объединённый файл сохранён, но Telegram не подтвердил отправку вложения. '+
        'Нажми «Отправить объединённый файл ещё раз», чтобы повторить без новой склейки.\n'+
        itemLink(saved.id),combinedDeliveryKeyboard(saved.id),fetcher).catch(()=>{})
    }
    return {handled:true}
  }catch(error){
    // Do not log audio contents, titles, personal details or credentials.
    const raw=error?.code||error?.message
    const allowed=new Set([
      'OWNER_AUDIO_COMBINE_INVALID_OPUS',
      'OWNER_AUDIO_COMBINE_STORAGE_READ',
      'OWNER_AUDIO_COMBINE_BAD_SOURCE',
      'OWNER_AUDIO_STORAGE_UNAVAILABLE',
      'OWNER_AUDIO_STORAGE_UPLOAD_FAILED',
      'OWNER_AUDIO_STORAGE_CONFLICT',
      'OWNER_AUDIO_COMBINE_SESSION_CHANGED',
      'OWNER_AUDIO_COMBINE_DUPLICATE',
    ])
    const reason=allowed.has(raw)?raw:'OWNER_AUDIO_COMBINE_UNKNOWN'
    const stage=/^[a-z_]{2,32}$/.test(error?.stage||'')?error.stage:'unspecified'
    console.error('HH_OWNER_AUDIO_COMBINE_FAILED',reason,stage)
    await ownerTransaction(config,async db=>{
      await db.query(
        "update app_private.telegram_owner_audio_combine set status='collecting',updated_at=now() "+
        "where practitioner_id=$1 and batch_id=$2 and result_audio_id is null and status='building'",
        [PRACTITIONER_ID,batch.batchId])
    }).catch(()=>{})
    await sendOwner(credentials,'⚠️ Не удалось объединить аудио. Исходники сохранены приватно. '+
      'Код: '+reason+(stage==='unspecified'?'':' / '+stage)+'. Повтори /done после устранения ошибки.',
      null,fetcher).catch(()=>{})
    return {handled:true}
  }
}

async function updateFolderFromBot(config,event,credentials,fetcher=fetch){
  const result=await ownerTransaction(config,async db=>{
    const row=(await db.query(
      "update app_private.telegram_owner_audio set folder=$3,updated_at=now() "+
      "where id=$1 and practitioner_id=$2 and status='ready' and combine_batch_id is null "+
      "returning id,folder",
      [event.id,PRACTITIONER_ID,event.folder])).rows[0]
    if(row)await db.query(
      "update app_private.telegram_owner_audio_combine "+
      "set result_folder=$2,updated_at=now() "+
      "where practitioner_id=$3 and result_audio_id=$1 and status='ready'",
      [event.id,event.folder,PRACTITIONER_ID])
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
  if(event.action==='legacy-batch-button'){
    await telegramRequest(credentials,'answerCallbackQuery',{
      callback_query_id:event.callbackId,
      text:'Эта кнопка от старой сборки. Для текущей нажми новую «Готово» или отправь /done.',
      show_alert:true},fetcher).catch(()=>{})
    return {handled:true}
  }
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
  if(event.callbackId&&['done','combine-folder','resend','voice'].includes(event.action))
    await telegramRequest(credentials,'answerCallbackQuery',{
      callback_query_id:event.callbackId},fetcher).catch(()=>{})
  if(event.action==='combine'){
    const state=await startAudioCombine(config,event)
    if(state.obsoleteBatchId){
      const storage=await checkedAudioStorage(config).catch(()=>null)
      if(storage)await cleanupInactiveAudioBatch(config,state.obsoleteBatchId,storage).catch(()=>{})
    }
    const active=state.state==='started'||state.state==='active'
    const shown=active
      ?await showAudioCombinePrompt(config,credentials,event,state,fetcher):false
    if(event.callbackId){
      // Acknowledge the action *after* the visible editor, so stale callbacks
      // and Telegram edit failures are never silently swallowed.
      const notice=active
        ?shown?'🎧 Сборка открыта: '+state.count+'/'+OWNER_AUDIO_COMBINE_MAX_PARTS+
          '. Готово · объединить — под списком папок.'
          :'Не удалось открыть сборку. Отправь /combine или /done.'
        :state.state==='building'?'Сборка ещё обрабатывается.'
        :'Кнопка уже обработана. Для сборки отправь /combine.'
      await telegramRequest(credentials,'answerCallbackQuery',{
        callback_query_id:event.callbackId,text:notice,
        show_alert:!shown},fetcher).catch(()=>{})
    }else if(!active&&state.state==='building'){
      await sendOwner(credentials,'Сборка обрабатывается. Готовый файл придёт сюда.',null,fetcher).catch(()=>{})
    }else if(active&&!shown){
      await sendOwner(credentials,'⚠️ Не удалось показать сборку. Повтори /combine.',
        null,fetcher).catch(()=>{})
    }
    return {handled:true}
  }
  if(event.action==='combine-folder'){
    const result=await selectAudioCombineFolder(config,event)
    if(result.state==='selected'){
      await editAudioCombinePrompt(credentials,result,fetcher)
    }else if(event.callbackId){
      await telegramRequest(credentials,'answerCallbackQuery',{
        callback_query_id:event.callbackId,text:'Это кнопка старой сборки.',
        show_alert:false},fetcher).catch(()=>{})
    }
    return {handled:true}
  }
  if(event.action==='done')return finishAudioCombine(config,event,credentials,fetcher)
  if(['resend','track','voice'].includes(event.action))
    return resendSavedCombined(config,event,credentials,fetcher)
  if(event.action==='cancel'){
    const state=await cancelAudioCombine(config,event)
    if(state.state==='inactive')return {handled:Boolean(event.callbackId)}
    if(event.callbackId)await telegramRequest(credentials,'answerCallbackQuery',{
      callback_query_id:event.callbackId},fetcher).catch(()=>{})
    if(state.state==='cancelled'){
      if(state.promptMessageId)await telegramRequest(credentials,'editMessageText',{
        chat_id:credentials.chat,message_id:Number(state.promptMessageId),
        text:'✖ Сборка отменена. Временные части удаляются.',
        reply_markup:{inline_keyboard:[]}},fetcher).catch(()=>{})
      const storage=await checkedAudioStorage(config).catch(()=>null)
      if(storage)await deleteTemporaryAudioParts(config,state.batchId,storage).catch(()=>{})
    }
    return {handled:true}
  }
  if(event.action==='reject'){
    const active=await activeAudioCombine(config,event)
    if(active){
      await editAudioCombinePrompt(credentials,{...active,
        notice:event.reason==='size'?'Лимит 20 МБ. Файл не принят.':
          'Этот тип файла не поддерживается для сборки OGG/Opus.',
      },fetcher)
      return {handled:true}
    }
    await sendOwner(credentials,event.reason==='size'
      ?'Аудио не импортировано: Telegram-бот скачивает файлы до 20 МБ. Для длинной записи используй загрузку на сайте.'
      :'Аудио не импортировано: нужен голосовой файл OGG, MP3, M4A или WAV.',null,fetcher).catch(()=>{})
    return {handled:true}
  }
  if(event.action==='destination'){
    const result=await setNextAudioDestination(config,event)
    if(event.callbackId)await telegramRequest(credentials,'answerCallbackQuery',{
      callback_query_id:event.callbackId,
      text:result.applied?'📁 Папка выбрана':'Этот выбор уже обработан',
      show_alert:false},fetcher).catch(()=>{})
    if(result.applied) {
      const prompt=ownerAudioDestinationSelectedMessage(result.folder)
      await sendOwner(credentials,prompt.text,prompt.reply_markup,fetcher).catch(()=>{})
    }
    return {handled:true}
  }
  if(event.action==='folder')return updateFolderFromBot(config,event,credentials,fetcher)
  return importAudio(config,event,credentials,fetcher)
}
// Every renewed link is generated only after the same owner-admin request gate;
// the browser never receives a storage key or a permanently public object URL.
const ownerAudioPrivateUrl=id=>'/api/admin/materials/telegram/file/'+id

// Same-origin proxy: each HEAD/GET/Range rechecks the real owner session.
// This avoids five-minute Storage tokens on iPhone and never exposes an API key.
export async function getOwnerTelegramAudioFile(config,id,request){
  if(!ownerAudioIdValid(id))failure('OWNER_AUDIO_NOT_FOUND')
  const row=await ownerTransaction(config,async db=>(await db.query(
    "select id,mime,bytes,storage_path from app_private.telegram_owner_audio "+
    "where id=$1 and practitioner_id=$2 and status='ready' and combine_batch_id is null",
    [id,PRACTITIONER_ID])).rows[0])
  if(!row)failure('OWNER_AUDIO_NOT_FOUND')
  const expectedPath=ownerAudioMediaPath(row.id,row.mime)
  if(!expectedPath||row.storage_path!==expectedPath||
     !Number.isSafeInteger(row.bytes)||row.bytes<128||row.bytes>OWNER_AUDIO_MAX_BYTES)
    failure('OWNER_AUDIO_STORAGE_UNAVAILABLE')
  const range=ownerAudioByteRange(request.headers.get('range'),row.bytes)
  const headers={
    'Cache-Control':'private, no-store, max-age=0, must-revalidate',
    'Content-Type':row.mime,
    'Accept-Ranges':'bytes',
    'X-Content-Type-Options':'nosniff',
    'Cross-Origin-Resource-Policy':'same-origin',
    'Referrer-Policy':'no-referrer',
    'X-Robots-Tag':'noindex, nofollow, noarchive',
  }
  if(!range)return new Response(null,{status:416,headers:{
    ...headers,'Content-Range':'bytes */'+row.bytes,'Content-Length':'0'
  }})
  headers['Content-Length']=String(range.end-range.start+1)
  if(range.status===206)
    headers['Content-Range']='bytes '+range.start+'-'+range.end+'/'+row.bytes
  if(request.method==='HEAD')return new Response(null,{status:range.status,headers})
  // Original Telegram objects are limited to <=20 MB. Download through the
  // server-side secret client, verify exact stored length, then serve a range.
  const storage=await checkedAudioStorage(config)
  const {data,error}=await storage.download(expectedPath)
  if(error||!data||data.size!==row.bytes)failure('OWNER_AUDIO_STORAGE_UNAVAILABLE')
  const bytes=await data.arrayBuffer()
  if(bytes.byteLength!==row.bytes)failure('OWNER_AUDIO_STORAGE_UNAVAILABLE')
  return new Response(new Uint8Array(bytes,range.start,range.end-range.start+1),{
    status:range.status,headers
  })
}

// Old preview callers remain supported but get an authenticated, non-expiring
// same-origin media URL instead of a time-limited direct Storage URL.
export async function getOwnerTelegramAudioPreview(config,id){
  if(!ownerAudioIdValid(id))failure('OWNER_AUDIO_INVALID_PREVIEW')
  const row=await ownerTransaction(config,async db=>(await db.query(
    "select id from app_private.telegram_owner_audio "+
    "where id=$1 and practitioner_id=$2 and status='ready' and combine_batch_id is null",
    [id,PRACTITIONER_ID])).rows[0])
  if(!row)failure('OWNER_AUDIO_NOT_FOUND')
  return {previewUrl:ownerAudioPrivateUrl(row.id)}
}
export async function listOwnerTelegramAudio(config){
  const files=await ownerTransaction(config,async db=>(await db.query(
    "select id,title,folder,mime,bytes,duration_seconds,received_at "+
    "from app_private.telegram_owner_audio "+
    "where practitioner_id=$1 and status='ready' and combine_batch_id is null "+
    "order by received_at desc limit 60",
    [PRACTITIONER_ID])).rows)
  // No 60x Storage signing calls: metadata and owner-only URL are immediate.
  return {files:files.map(row=>({...row,previewUrl:ownerAudioPrivateUrl(row.id)})),
    truncated:files.length===60}
}
export async function editOwnerTelegramAudio(config,{id,title,folder}={}){
  if(typeof id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id)||
     typeof title!=='string'||title.trim().length<1||title.trim().length>120||
     /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(title)||!ownerAudioFolder(folder))
    failure('OWNER_AUDIO_INVALID_EDIT')
  const row=await ownerTransaction(config,async db=>(await db.query(
    "update app_private.telegram_owner_audio set title=$3,folder=$4,updated_at=now() "+
    "where id=$1 and practitioner_id=$2 and status='ready' and combine_batch_id is null "+
    "returning id,title,folder",
    [id,PRACTITIONER_ID,title.trim(),folder])).rows[0])
  if(!row)failure('OWNER_AUDIO_NOT_FOUND')
  return row
}
