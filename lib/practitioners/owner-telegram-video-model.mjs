// Owner-only Telegram photo+voice slideshow. Never route client media to this handler.
export const VIDEO_IMAGE_LIMIT=15
export const VIDEO_AUDIO_LIMIT=15
export const VIDEO_MAX_INPUT_BYTES=20_000_000
export const VIDEO_MAX_SECONDS=120
export const VIDEO_SESSION_MINUTES=30
export const VIDEO_RU_CHANNEL_ID='UCjWq6NHZTQkUr3bC3WbXXcw'
const FILE_ID=/^[A-Za-z0-9_-]{5,512}$/
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
const MIME={
  'image/jpeg':'jpg','image/png':'png','image/webp':'webp',
  'audio/ogg':'ogg','audio/opus':'ogg','audio/mpeg':'mp3',
  'audio/mp4':'m4a','audio/x-m4a':'m4a','audio/wav':'wav','audio/x-wav':'wav'
}
const IMAGE_EXT={jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp'}
const AUDIO_EXT={ogg:'audio/ogg',oga:'audio/ogg',opus:'audio/ogg',mp3:'audio/mpeg',m4a:'audio/mp4',wav:'audio/wav'}
function privateEvent(update,now){
 const message=update?.callback_query?.message||update?.message
 const from=update?.callback_query?.from||message?.from
 const chat=message?.chat
 if(!Number.isSafeInteger(update?.update_id)||update.update_id<0||
    !Number.isSafeInteger(chat?.id)||chat.id<=0||chat.type!=='private'||
    !Number.isSafeInteger(from?.id)||from.id!==chat.id||from.is_bot===true)return null
 if(!update.callback_query&&(!Number.isSafeInteger(message?.date)||
    Math.abs(now-message.date*1000)>600000))return null
 return {updateId:update.update_id,chatId:String(chat.id),userId:String(from.id),
   callbackId:update.callback_query?.id||null,message}
}
function media(message){
 let file,kind,mime
 if(Array.isArray(message.photo)&&message.photo.length){
   file=[...message.photo].filter(f=>Number.isSafeInteger(f?.file_size)&&f.file_size>=128&&f.file_size<=5_000_000)
     .sort((a,b)=>b.file_size-a.file_size)[0]
   kind='photo';mime='image/jpeg'
 }else if(message.voice||message.audio){
   file=message.voice||message.audio
   kind='audio';mime=message.voice?'audio/ogg':String(file.mime_type||'').toLowerCase()
 }else if(message.document){
   file=message.document
   const filename=String(file.file_name||'').split('.').at(-1).toLowerCase()
   const explicit=String(file.mime_type||'').toLowerCase()
   mime=explicit==='application/octet-stream'?(IMAGE_EXT[filename]||AUDIO_EXT[filename]):explicit
   kind=mime?.startsWith('image/')?'photo':'audio'
 }else return null
 const ext=MIME[mime]
 if(!ext||(kind==='photo'&&!mime.startsWith('image/'))||
   (kind==='audio'&&!mime.startsWith('audio/')))return {action:'reject',reason:'format'}
 if(!file||!Number.isSafeInteger(file.file_size)||file.file_size<128||
   file.file_size>(kind==='photo'?5_000_000:15_000_000)||
   !Number.isSafeInteger(message.message_id)||message.message_id<=0)
   return {action:'reject',reason:'size'}
 if(!FILE_ID.test(file.file_id||'')||!FILE_ID.test(file.file_unique_id||''))return {action:'reject',reason:'format'}
 const duration=kind==='audio'?Number(file.duration):0
 if(kind==='audio'&&(!Number.isInteger(duration)||duration<1||duration>VIDEO_MAX_SECONDS))
   return {action:'reject',reason:'duration'}
 return {action:'media',part:{kind,fileId:file.file_id,uniqueId:file.file_unique_id,
   mime:mime==='audio/opus'?'audio/ogg':mime==='audio/x-m4a'?'audio/mp4':
     mime==='audio/x-wav'?'audio/wav':mime,
   ext,bytes:file.file_size,duration,updateId:0,messageId:message.message_id}}
}
export function parseOwnerVideoUpdate(update,{now=Date.now(),botUsername}={}){
 const base=privateEvent(update,now)
 if(!base||!botUsername||!/^[A-Za-z][A-Za-z0-9_]{3,31}$/.test(botUsername))return null
 if(base.callbackId){
   const q=update.callback_query
   if(typeof q.id!=='string'||q.id.length>128||q.message?.from?.is_bot!==true||
     String(q.message.from.username||'').toLowerCase()!==botUsername.toLowerCase())return null
   const action=({'hh-video:start':'start','hh-video:done':'done',
     'hh-video:cancel':'cancel','hh-video:retry':'retry','hh-video:status':'status'})[q.data]
   if(action)return {...base,action}
   const id=String(q.data||'').match(/^hh-video:publish:([0-9a-f-]{36})$/)
   return id&&UUID.test(id[1])?{...base,action:'publish',jobId:id[1]}:null
 }
 const text=String(base.message.text||'').trim()
 const deepStart=text.match(/^\/start(?:@([A-Za-z0-9_]+))?\s+video$/i)
 if(deepStart&&(!deepStart[1]||deepStart[1].toLowerCase()===botUsername.toLowerCase()))
   return {...base,action:'start'}
 const match=text.match(/^\/(video|video_done|video_retry|video_cancel|video_status)(?:@([A-Za-z0-9_]+))?$/i)
 if(match){
   if(match[2]&&match[2].toLowerCase()!==botUsername.toLowerCase())return null
   return {...base,action:({'video':'start','video_done':'done','video_retry':'retry','video_cancel':'cancel','video_status':'status'})[match[1].toLowerCase()]}
 }
 const found=media(base.message)
 if(!found)return null
 if(found.part)found.part.updateId=base.updateId
 return {...base,...found}
}
export function safeVideoParts(items){
 if(!Array.isArray(items)||items.length>VIDEO_IMAGE_LIMIT+VIDEO_AUDIO_LIMIT)return null
 const seen=new Set();let images=0,audios=0,bytes=0,seconds=0
 for(const p of items){
   if(!p||!['photo','audio'].includes(p.kind)||!FILE_ID.test(p.fileId||'')||
     !FILE_ID.test(p.uniqueId||'')||seen.has(p.updateId)||
     !Number.isSafeInteger(p.updateId)||p.updateId<0||
     !Number.isSafeInteger(p.bytes)||p.bytes<128||
     p.bytes>(p.kind==='photo'?5_000_000:15_000_000)||
     !MIME[p.mime]||!['jpg','png','webp','ogg','mp3','m4a','wav'].includes(p.ext)||
     !Number.isInteger(p.duration)||p.duration<0||p.duration>VIDEO_MAX_SECONDS)return null
   if(p.kind==='photo'&&!p.mime.startsWith('image/'))return null
   if(p.kind==='audio'&&(!p.mime.startsWith('audio/')||p.duration===0))return null
   seen.add(p.updateId);bytes+=p.bytes;seconds+=p.duration
   if(p.kind==='photo')images++;else audios++
 }
 return images<=VIDEO_IMAGE_LIMIT&&audios<=VIDEO_AUDIO_LIMIT&&
   bytes<=VIDEO_MAX_INPUT_BYTES&&seconds<=VIDEO_MAX_SECONDS
   ?{images,audios,bytes,seconds}:null
}
export function ownerVideoStartMessage(){
 return {text:'🎬 Видео из аудио и фотографий\n\n1. Отправляй фотографии и аудио в том порядке, в каком они должны идти в видео — можно чередовать.\n2. Принимаю 1–15 фотографий и 1–15 голосовых / аудиофайлов.\n3. Нажми «Собрать видео»: бот соединит звук по порядку, покажет фотографии на соответствующих участках и пришлёт MP4 сюда. Если кнопка не отвечает, отправь /video_done.\n4. Загрузка на русский YouTube «По ссылке» (Unlisted) — только по отдельной кнопке после просмотра.\n\nСуммарно до 20 МБ исходников и 2 минут звука на весь ролик (для всех аудио вместе). Сборка действует 30 минут. Не отправляй личные записи клиентов.',
  reply_markup:{inline_keyboard:[[{
    text:'🎬 Собрать видео',callback_data:'hh-video:done'},
    {text:'✖ Отмена',callback_data:'hh-video:cancel'}],
    [{text:'📷🎙 Проверить набор',callback_data:'hh-video:status'}]]}}
}
export function ownerVideoPreviewButtons(id){
 if(!UUID.test(id))throw Error('INVALID_VIDEO_JOB')
 return {inline_keyboard:[
   [{text:'▶️ На русский YouTube · по ссылке',callback_data:'hh-video:publish:'+id}],
   [{text:'✖ Не публиковать',callback_data:'hh-video:cancel'}]
 ]}
}
