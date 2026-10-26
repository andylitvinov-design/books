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
  ownerAudioCombineKeyboard,
  audioMatchesMagic,
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
    // FOR UPDATE serializes parallel Telegram forwards and selection callbacks.
    const preference=(await db.query(
      "select pending_folder,pending_expires_at,last_update_id "+
      "from app_private.telegram_owner_audio_destination "+
      "where practitioner_id=$1 for update",[PRACTITIONER_ID])).rows[0]
    const requestedFolder=preference&&
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
      "(practitioner_id,telegram_update_id,telegram_file_unique_id,title,mime,bytes,duration_seconds,folder) "+
      "values($1,$2,$3,$4,$5,$6,$7,$8) on conflict do nothing "+
      "returning id,status,attempts,title,folder",
      [PRACTITIONER_ID,event.updateId,event.fileUniqueId,event.title,
        event.mime,event.bytes,event.duration,requestedFolder||'inbox'])
    if(added.rowCount){
      await clearPending()
      return {claimed:true,row:added.rows[0]}
    }
    const existing=(await db.query(
      "select id,status,attempts,title,folder,processing_started_at,telegram_update_id "+
      "from app_private.telegram_owner_audio where practitioner_id=$1 "+
      "and (telegram_file_unique_id=$2 or telegram_update_id=$3) limit 1",
      [PRACTITIONER_ID,event.fileUniqueId,event.updateId])).rows[0]
    if(!existing)return {claimed:false,reason:'conflict'}
    if(existing.status==='ready'){
      // A deliberate folder selection followed by forwarding a known file moves
      // its existing library entry without duplicating the object.
      if(requestedFolder&&Number(existing.telegram_update_id)!==event.updateId){
        const moved=(await db.query(
          "update app_private.telegram_owner_audio set folder=$2,updated_at=now() "+
          "where id=$1 and practitioner_id=$3 and status='ready' "+
          "returning id,title,folder",
          [existing.id,requestedFolder,PRACTITIONER_ID])).rows[0]
        await clearPending()
        return {claimed:false,reason:'ready_moved',row:moved}
      }
      return {claimed:false,reason:'ready',row:existing}
    }
    if(existing.status==='processing' &&
       Date.now()-new Date(existing.processing_started_at).getTime()<120000)
      return {claimed:false,reason:'busy',row:existing}
    // Telegram replays the same update or the owner re-forwards a failed file:
    // keep its original UUID and destination, never double-upload.
    const newForward=Number(existing.telegram_update_id)!==event.updateId
    if(existing.attempts>=NO_RETRIES&&!newForward)
      return {claimed:false,reason:'exhausted',row:existing}
    const resumed=await db.query(
      "update app_private.telegram_owner_audio set status='processing', "+
      "attempts=$2,telegram_update_id=$3,failure_code=null, "+
      "folder=coalesce($4,folder),processing_started_at=now(),updated_at=now() "+
      "where id=$1 and status in ('processing','failed') "+
      "returning id,status,attempts,title,folder",
      [existing.id,newForward?1:Math.min(NO_RETRIES,existing.attempts+1),
        event.updateId,newForward?requestedFolder:null])
    if(resumed.rowCount)await clearPending()
    return resumed.rowCount?{claimed:true,row:resumed.rows[0]}:
      {claimed:false,reason:'busy'}
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
      const moved=claimed.reason==='ready_moved'
      const combine=await appendAudioCombine(config,event,claimed.row.id).catch(()=>({state:'error'}))
      const receipt=combineImportReply(combine,claimed.row.id)
      await sendOwner(credentials,
        (moved?'📁 Уже существующая запись перемещена в «':'✅ Эта запись уже сохранена в «')+
        folderLabel(claimed.row.folder)+'».\n'+itemLink(claimed.row.id)+receipt.extra,
        receipt.keyboard,fetcher).catch(()=>{})
    }
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
    // Only confirmed private originals can be appended. A failed upload must
    // never appear as a valid clip in the merged result.
    const combine=await appendAudioCombine(config,event,row.id).catch(()=>({state:'error'}))
    const receipt=combineImportReply(combine,ready.id)
    await sendOwner(credentials,'✅ Аудио сохранено приватно в «Мои материалы → '+
      folderLabel(ready.folder)+'».\n'+itemLink(ready.id)+receipt.extra,
      receipt.keyboard,fetcher).catch(()=>{})
    return {handled:true}
  }catch(error){
    const code=/^OWNER_AUDIO_[A-Z_]+$/.test(error?.code||'')?error.code:'OWNER_AUDIO_IMPORT_FAILED'
    await markAudio(config,row.id,'failed',{code}).catch(()=>{})
    const retry=row.attempts<NO_RETRIES
    if(!retry)await sendOwner(credentials,'⚠️ Не удалось сохранить запись. Перешли её ещё раз или загрузи через «Мои материалы».',null,fetcher).catch(()=>{})
    return {handled:true,retry}
  }
}

const COMBINE_MINUTES=30
const COMBINE_WAIT_MS=130000
function combineItems(value){
  return Array.isArray(value)?value.filter(item=>
    item&&typeof item.id==='string'&&
    Number.isSafeInteger(item.updateId)&&item.updateId>=0):[]
}
async function startAudioCombine(config,event){
  return ownerTransaction(config,async db=>{
    const previous=(await db.query(
      "select batch_id,result_folder,status,items,expires_at,last_command_update_id,updated_at "+
      "from app_private.telegram_owner_audio_combine "+
      "where practitioner_id=$1 for update",[PRACTITIONER_ID])).rows[0]
    if(previous&&event.updateId<=Number(previous.last_command_update_id))
      return {state:'stale'}
    const live=previous&&new Date(previous.expires_at).getTime()>Date.now()
    if(live&&previous.status==='collecting')
      return {state:'active',batchId:previous.batch_id,
        folder:previous.result_folder,count:combineItems(previous.items).length}
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
      "expires_at=excluded.expires_at,result_audio_id=null,result_folder='inbox',updated_at=now()",
      [PRACTITIONER_ID,batchId,event.updateId])
    return {state:'started',batchId,folder:'inbox',count:0}
  })
}
async function selectAudioCombineFolder(config,event){
  return ownerTransaction(config,async db=>{
    const session=(await db.query(
      "select batch_id,status,result_folder,items,started_update_id,"+
      "last_command_update_id,expires_at,result_audio_id "+
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
      folder:event.folder,count:combineItems(session.items).length}
  })
}
async function appendAudioCombine(config,event,audioId){
  return ownerTransaction(config,async db=>{
    const session=(await db.query(
      "select batch_id,result_folder,status,started_update_id,last_command_update_id,items,expires_at,result_audio_id "+
      "from app_private.telegram_owner_audio_combine "+
      "where practitioner_id=$1 for update",[PRACTITIONER_ID])).rows[0]
    if(!session||session.status!=='collecting'||session.result_audio_id||
       event.updateId<=Number(session.started_update_id)||
       new Date(session.expires_at).getTime()<=Date.now())
      return {state:'inactive'}
    const meta={batchId:session.batch_id,folder:session.result_folder}
    const items=combineItems(session.items)
    if(event.mime!=='audio/ogg')return {...meta,state:'unsupported',count:items.length}
    if(items.some(part=>part.updateId===event.updateId))
      return {...meta,state:'added',count:items.length}
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
      "select batch_id,status,expires_at,last_command_update_id from "+
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
    return {state:'cancelled'}
  })
}
async function reserveAudioCombine(config,event){
  return ownerTransaction(config,async db=>{
    const session=(await db.query(
      "select batch_id,status,started_update_id,last_command_update_id,"+
      "items,expires_at,updated_at,result_audio_id,result_folder "+
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
      "set status='building',last_command_update_id=$2,updated_at=now() "+
      "where practitioner_id=$1",[PRACTITIONER_ID,event.updateId])
    return {state:'reserved',batchId:session.batch_id,resultId,
      folder:session.result_folder,parts:ordered}
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
    [{text:'📎 Отправить объединённый файл ещё раз',
      callback_data:'hh-audio:resend:'+id}],
    ...current.inline_keyboard,
  ]}
}
async function sendCombinedDocument(credentials,bytes,parts,folder,fetcher=fetch){
  const form=new FormData()
  form.set('chat_id',credentials.chat)
  form.set('document',new Blob([bytes],{type:'audio/ogg'}),'combined-voice.ogg')
  form.set('caption','🎧 Объединено '+parts+' голосовых · папка «'+folderLabel(folder)+'» · OGG/Opus')
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
  // Return ONLY the owner's currently completed combined draft.
  // A stale callback from an older batch can never access another file.
  const row=await ownerTransaction(config,async db=>(await db.query(
    "select session.batch_id,session.status,session.result_audio_id,"+
    "jsonb_array_length(session.items) as parts,"+
    "audio.mime,audio.bytes,audio.storage_path,audio.folder "+
    "from app_private.telegram_owner_audio_combine session "+
    "left join app_private.telegram_owner_audio audio "+
    "on audio.id=session.result_audio_id and audio.practitioner_id=session.practitioner_id "+
    "and audio.status='ready' "+
    "where session.practitioner_id=$1",
    [PRACTITIONER_ID])).rows[0])
  if(!row||row.status!=='ready'||!row.result_audio_id||
     (event.batchId&&row.batch_id!==event.batchId)){
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
    await sendCombinedDocument(credentials,bytes,row.parts,row.folder,fetcher)
    await sendOwner(credentials,
      '✅ Готовый аудиофайл повторно отправлен в этот чат Telegram. '+
      'Копия остаётся в папке «'+folderLabel(row.folder)+'».\\n'+itemLink(id),
      keyboard,fetcher).catch(()=>{})
  }catch{
    // Never claim sent if Telegram did not return a valid document receipt.
    // Retry is opt-in: a network timeout can occur after provider acceptance.
    await sendOwner(credentials,
      '⚠️ Готовый файл сохранён приватно, но Telegram не подтвердил отправку вложения. '+
      'Нажми «Отправить объединённый файл ещё раз», чтобы повторить без новой склейки.\\n'+
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
    const storage=await checkedAudioStorage(config)
    const bytes=await readAudioCombineParts(storage,batch.parts)
    const saved=await saveAudioCombine(config,batch,event,bytes,storage)
    // The private file is committed even if Telegram delivery fails.
    try{
      await sendCombinedDocument(credentials,bytes,batch.parts.length,saved.folder,fetcher)
      await sendOwner(credentials,'✅ Один файл из '+batch.parts.length+
        ' голосовых отправлен в Telegram и сохранён в папке «'+folderLabel(saved.folder)+'».'+
        '\n'+itemLink(saved.id)+'\nКнопками ниже можно изменить папку:',
        combinedDeliveryKeyboard(saved.id),fetcher).catch(()=>{})
    }catch{
      await sendOwner(credentials,
        '⚠️ Один объединённый файл сохранён, но Telegram не подтвердил отправку вложения. '+
        'Нажми «Отправить объединённый файл ещё раз», чтобы повторить без новой склейки.\\n'+
        itemLink(saved.id),combinedDeliveryKeyboard(saved.id),fetcher).catch(()=>{})
    }
    return {handled:true}
  }catch{
    await ownerTransaction(config,async db=>{
      await db.query(
        "update app_private.telegram_owner_audio_combine set status='collecting',updated_at=now() "+
        "where practitioner_id=$1 and batch_id=$2 and result_audio_id is null and status='building'",
        [PRACTITIONER_ID,batch.batchId])
    }).catch(()=>{})
    await sendOwner(credentials,'⚠️ Не удалось объединить аудио. Оригиналы сохранены. '+
      'Проверь, что все записи — голосовые OGG/Opus, затем повтори /done.',null,fetcher).catch(()=>{})
    return {handled:true}
  }
}

async function updateFolderFromBot(config,event,credentials,fetcher=fetch){
  const result=await ownerTransaction(config,async db=>{
    const row=(await db.query(
      "update app_private.telegram_owner_audio set folder=$3,updated_at=now() "+
      "where id=$1 and practitioner_id=$2 and status='ready' "+
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
  if(event.callbackId&&['combine','done','combine-folder','resend'].includes(event.action))
    await telegramRequest(credentials,'answerCallbackQuery',{
      callback_query_id:event.callbackId},fetcher).catch(()=>{})
  if(event.action==='combine'){
    const state=await startAudioCombine(config,event)
    const active=state.state==='started'||state.state==='active'
    const prompt=active?'🎧 Объединить аудио · '+state.count+'/8\n'+
      '1. Выбери ниже папку ДЛЯ ОБЪЕДИНЁННОГО ФАЙЛА. Сейчас: «'+folderLabel(state.folder)+'».\n'+
      '2. Перешли от 2 до 8 голосовых OGG/Opus в этот чат. Дождись ✅ после каждого.\n'+
      '3. Нажми «Готово · объединить». Dot пришлёт один аудиофайл сюда и сохранит в выбранной папке.\n'+
      'До 20 МБ суммарно, сессия 30 минут. Отмена — /cancel.'
      :state.state==='building'?'Предыдущий файл ещё объединяется.'
      :'Эта команда уже обработана.'
    await sendOwner(credentials,prompt,active
      ?ownerAudioCombineKeyboard(state.batchId,state.folder,state.count):null,
      fetcher).catch(()=>{})
    return {handled:true}
  }
  if(event.action==='combine-folder'){
    const result=await selectAudioCombineFolder(config,event)
    if(result.state==='selected'){
      await sendOwner(credentials,'📁 Папка для ОБЪЕДИНЁННОГО файла: «'+
        folderLabel(result.folder)+'».\nВ сборке '+result.count+'/8. '+
        (result.count>=2?'Нажми «Готово · объединить» или добавь ещё голосовые.':
          'Перешли несколько голосовых, потом нажми «Готово · объединить».'),
        ownerAudioCombineKeyboard(result.batchId,result.folder,result.count),fetcher).catch(()=>{})
    }else{
      await sendOwner(credentials,'Эта кнопка относится к завершённой или старой сборке. '+
        'Для новой отправь /combine.',null,fetcher).catch(()=>{})
    }
    return {handled:true}
  }
  if(event.action==='done')return finishAudioCombine(config,event,credentials,fetcher)
  if(event.action==='resend')return resendSavedCombined(config,event,credentials,fetcher)
  if(event.action==='cancel'){
    const state=await cancelAudioCombine(config,event)
    if(state.state==='inactive')return {handled:Boolean(event.callbackId)}
    if(event.callbackId)await telegramRequest(credentials,'answerCallbackQuery',{
      callback_query_id:event.callbackId},fetcher).catch(()=>{})
    await sendOwner(credentials,state.state==='cancelled'
      ?'Сборка отменена. Отдельные голосовые остались в приватных «Моих материалах».'
      :'Эта команда уже обработана.',null,fetcher).catch(()=>{})
    return {handled:true}
  }
  if(event.action==='reject'){
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
export async function getOwnerTelegramAudioPreview(config,id){
  if(typeof id!=='string'||
     !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id))
    failure('OWNER_AUDIO_INVALID_PREVIEW')
  const row=await ownerTransaction(config,async db=>(await db.query(
    "select id,mime from app_private.telegram_owner_audio "+
    "where id=$1 and practitioner_id=$2 and status='ready'",
    [id,PRACTITIONER_ID])).rows[0])
  if(!row)failure('OWNER_AUDIO_NOT_FOUND')
  const storage=await checkedAudioStorage(config)
  const ext=row.mime==='audio/ogg'?'ogg':row.mime==='audio/mpeg'?'mp3':
    row.mime==='audio/mp4'?'m4a':'wav'
  const {data,error}=await storage.createSignedUrl('telegram-inbox/'+row.id+'.'+ext,300)
  if(error||!data?.signedUrl)failure('OWNER_AUDIO_PREVIEW_UNAVAILABLE')
  const url=new URL(data.signedUrl,config.supabaseUrl)
  if(url.origin!==config.supabaseUrl||
     !url.pathname.startsWith('/storage/v1/object/sign/'+OWNER_AUDIO_BUCKET+'/')||
     !url.searchParams.has('token'))failure('OWNER_AUDIO_PREVIEW_UNAVAILABLE')
  return {previewUrl:url.toString(),previewExpiresSeconds:300}
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
