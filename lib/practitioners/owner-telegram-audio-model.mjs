import {OWNER_AUDIO_COMBINE_MAX_PARTS} from './owner-telegram-audio-join.mjs'

// Pure policy for the existing, verified Holistic House owner Telegram bot.
// Telegram voice/audio is a private owner draft, never a client report or AI prompt.
export const OWNER_AUDIO_BUCKET = 'hh-practitioner-course-media'
export const OWNER_AUDIO_MAX_BYTES = 20_000_000
export const OWNER_AUDIO_DESTINATION_MINUTES = 30
export const OWNER_AUDIO_FOLDERS = Object.freeze([
  {id:'inbox', en:'Inbox', ru:'Входящие', es:'Entrada'},
  {id:'meditations', en:'Meditations', ru:'Медитации', es:'Meditaciones'},
  {id:'antistress', en:'Anti-stress', ru:'Антистресс', es:'Antiestrés'},
  {id:'reiki', en:'Reiki', ru:'Рейки', es:'Reiki'},
  {id:'egyptian', en:'Egyptian coaching', ru:'Египетский коучинг', es:'Coaching egipcio'},
  {id:'greek', en:'Greek coaching', ru:'Греческий коучинг', es:'Coaching griego'},
  {id:'other', en:'Other audio', ru:'Другие аудио', es:'Otros audios'},
])
const TYPES=Object.freeze({
  'audio/ogg':{mime:'audio/ogg',ext:'ogg'},
  'audio/opus':{mime:'audio/ogg',ext:'ogg'},
  'application/ogg':{mime:'audio/ogg',ext:'ogg'},
  'audio/mpeg':{mime:'audio/mpeg',ext:'mp3'},
  'audio/mp3':{mime:'audio/mpeg',ext:'mp3'},
  'audio/mp4':{mime:'audio/mp4',ext:'m4a'},
  'audio/x-m4a':{mime:'audio/mp4',ext:'m4a'},
  'audio/wav':{mime:'audio/wav',ext:'wav'},
  'audio/x-wav':{mime:'audio/wav',ext:'wav'},
})
const EXT=Object.freeze({ogg:'audio/ogg',oga:'audio/ogg',opus:'audio/ogg',
  mp3:'audio/mpeg',m4a:'audio/mp4',wav:'audio/wav'})
export function ownerAudioFolder(value){
  return OWNER_AUDIO_FOLDERS.some(folder=>folder.id===value)?value:null
}
export function ownerAudioType(mime,filename=''){
  const explicit=String(mime||'').split(';')[0].trim().toLowerCase()
  const named=String(filename||'').split('.').at(-1).toLowerCase()
  if(TYPES[explicit])return TYPES[explicit]
  if((!explicit||explicit==='application/octet-stream')&&EXT[named])
    return TYPES[EXT[named]]
  return null
}
export function safeOwnerAudioTitle(name, timestamp){
  const safe=String(name||'').replace(/[\/\\<>]/g,' ').replace(/[\x00-\x1f\x7f]/g,' ')
    .replace(/\s+/g,' ').trim().slice(0,110)
  if(safe)return safe
  const day=new Date(timestamp*1000).toISOString().slice(0,16).replace('T',' ')
  return 'Telegram · '+day
}
export function parseOwnerAudioMessage(update,now=Date.now()){
  const message=update?.message
  if(!Number.isSafeInteger(update?.update_id)||update.update_id<0||
     !message||message.chat?.type!=='private'||
     !Number.isSafeInteger(message.chat?.id)||message.chat.id<=0||
     message.from?.id!==message.chat.id||message.from?.is_bot===true||
     !Number.isSafeInteger(message.date)||
     Math.abs(now-message.date*1000)>10*60*1000)return null
  const audio=message.voice||message.audio||message.document
  if(!audio)return null
  // Documents containing pictures, archives etc. are not audio imports.
  const kind=message.voice?'voice':message.audio?'audio':'document'
  const type=ownerAudioType(audio.mime_type, audio.file_name)
    ||(kind==='voice'?OWNER_AUDIO_MAX_BYTES&&TYPES['audio/ogg']:null)
  if(!type&&kind==='document')return null
  const base={updateId:update.update_id,chatId:String(message.chat.id),
    userId:String(message.from.id),messageId:message.message_id,
    sentAt:message.date}
  if(!type)return {...base,action:'reject',reason:'format'}
  if(!Number.isSafeInteger(audio.file_size)||audio.file_size<128||
     audio.file_size>OWNER_AUDIO_MAX_BYTES)
    return {...base,action:'reject',reason:'size'}
  if(typeof audio.file_id!=='string'||audio.file_id.length>512||
     !/^[A-Za-z0-9_-]+$/.test(audio.file_id)||
     typeof audio.file_unique_id!=='string'||audio.file_unique_id.length>180||
     !/^[A-Za-z0-9_-]+$/.test(audio.file_unique_id))
    return {...base,action:'reject',reason:'format'}
  return {...base,action:'import',fileId:audio.file_id,
    fileUniqueId:audio.file_unique_id,bytes:audio.file_size,mime:type.mime,
    ext:type.ext,duration:Number.isSafeInteger(audio.duration)?Math.max(0,Math.min(86400,audio.duration)):0,
    title:safeOwnerAudioTitle(message.caption||audio.file_name||'',message.date)}
}

export const OWNER_VIDEO_START_URL='https://t.me/Andydotbot?start=video'
export const OWNER_AUDIO_MATERIALS_URL='https://holistichouse.vercel.app/admin/materials/telegram'
export function ownerAudioDestinationKeyboard(selectedFolder=null){
  const library=ownerAudioFolder(selectedFolder)
    ?OWNER_AUDIO_MATERIALS_URL+'?folder='+selectedFolder:OWNER_AUDIO_MATERIALS_URL
  const choose=(id,label)=>({text:label,callback_data:'hh-audio:to:'+id})
  return {inline_keyboard:[
    [{text:'🎬 Создать видео из фото и аудио',url:OWNER_VIDEO_START_URL}],
    [choose('meditations','🧘 Медитации'),choose('antistress','🌿 Антистресс')],
    [choose('reiki','✨ Рейки'),choose('egyptian','🏺 Египетский коучинг')],
    [choose('greek','🏛 Греческий коучинг'),choose('other','🎧 Другое')],
    [choose('inbox','📥 Входящие'),{text:'📁 Открыть папку на сайте',url:library}],
    [{text:'🎧 Объединить несколько голосовых',callback_data:'hh-audio:combine'}],
  ]}
}
// Batch-specific callbacks keep stale buttons from moving a newer batch.
const BATCH_ID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
export function ownerAudioCombineKeyboard(batchId,selectedFolder='inbox',count=0){
  if(!BATCH_ID_RE.test(batchId)||!ownerAudioFolder(selectedFolder))
    throw new Error('INVALID_OWNER_AUDIO_BATCH')
  const choose=(folder)=>{
    const label=OWNER_AUDIO_FOLDERS.find(item=>item.id===folder).ru
    return {text:(folder===selectedFolder?'✅ ':'📁 ')+label,
      callback_data:'hh-audio:bf:'+batchId+':'+folder}
  }
  return {inline_keyboard:[
    [choose('meditations'),choose('antistress')],
    [choose('reiki'),choose('egyptian')],
    [choose('greek'),choose('other')],
    [choose('inbox')],
    ...(count>=2?[[{text:'✅ Готово · объединить '+Math.min(count,OWNER_AUDIO_COMBINE_MAX_PARTS)+' аудио',
      callback_data:'hh-audio:done:'+batchId}]]:[]),
    [{text:'✖ Отменить сборку',callback_data:'hh-audio:cancel:'+batchId}],
    [{text:'📁 Открыть мою аудиотеку',url:OWNER_AUDIO_MATERIALS_URL}],
  ]}
}
export const OWNER_VIDEO_RU_URL='https://t.me/Andydotbot?start=video_ru'
export const OWNER_VIDEO_EN_URL='https://t.me/Andydotbot?start=video_en'
export function ownerAudioHelpMessage(){
 return {text:'🎬 Аудио и видео · Dot\n\n'+
   'Для ролика выбери YouTube прямо здесь. После выбора пришли фотографии '+
   'и аудио (до 15 каждого, всего 20 МБ и 120 секунд звука).\n'+
   'Бот соберёт MP4, пришлёт приватный просмотр и предложит отдельно '+
   'подтвердить публикацию. Ссылка YouTube придёт в этот чат.\n\n'+
   'Нужны обычные аудиофайлы в кабинете? Открой «Папки аудиотеки».',
   reply_markup:{inline_keyboard:[
     [{text:'🇷🇺 Видео → Русский YouTube',url:OWNER_VIDEO_RU_URL}],
     [{text:'🇬🇧 Video → English YouTube',url:OWNER_VIDEO_EN_URL}],
     [{text:'📁 Папки аудиотеки',callback_data:'hh-audio:folders'}],
     [{text:'🎧 Объединить несколько аудио',callback_data:'hh-audio:combine'}],
     [{text:'📂 Мои аудиозаписи',url:OWNER_AUDIO_MATERIALS_URL}]
   ]}}
}
// Existing audio-folder workflow is unchanged, but intentionally hidden from
// the first video-menu screen. It remains available via «Папки аудиотеки».
export function ownerAudioFoldersMessage(){
 return {
   text:'📁 Папки аудиотеки\n\n1. Выбери папку для следующего аудио.\n'+
     '2. Перешли голосовое или аудио сюда, в Dot.\n'+
     '3. Дождись ✅ «Сохранено в папке». Выбор действует 30 минут.\n\n'+
     'До 20 МБ на импорт. Для видео выбери YouTube через /audio.',
   reply_markup:ownerAudioDestinationKeyboard()
 }
}
export function ownerAudioDestinationSelectedMessage(folder){
  const label=OWNER_AUDIO_FOLDERS.find(item=>item.id===folder)?.ru
  if(!label)throw Error('INVALID_OWNER_AUDIO_FOLDER')
  return {
    text:'📁 Выбрана папка: «'+label+'».\n\n'+
      'Теперь перешли голосовое сообщение или аудиофайл сюда, в Dot. '+
      'Следующая запись будет сохранена в этой папке (в течение 30 минут). '+
      'После сохранения бот подтвердит файл и предложит сменить папку.\n\n'+
      'Если нужна другая папка — нажми кнопку ниже.',
    reply_markup:ownerAudioDestinationKeyboard(folder),
  }
}
export function ownerAudioMaterialsMessage(){
  return {
    text:'📁 Аудио и видео · Мои материалы · Holistic House\n\n'+
      'Твои аудиозаписи доступны в защищённом кабинете:\n'+OWNER_AUDIO_MATERIALS_URL+
      '\n\nНовая запись? Нажми /audio, затем перешли голосовое в этот чат.\nГотовый объединённый трек без подписи: /track.',
    reply_markup:{inline_keyboard:[
      [{text:'📂 Открыть аудиотеку',url:OWNER_AUDIO_MATERIALS_URL}],
      [{text:'🎙 Выбрать папку и добавить аудио',callback_data:'hh-audio:folders'}],
      [{text:'🎧 Объединить несколько аудио',callback_data:'hh-audio:combine'}],
      [{text:'🇷🇺 Видео → Русский YouTube',url:OWNER_VIDEO_RU_URL}],
     [{text:'🇬🇧 Video → English YouTube',url:OWNER_VIDEO_EN_URL}],
    ]},
  }
}
export function parseOwnerAudioCommand(update,now=Date.now()){
  const message=update?.message
  if(!Number.isSafeInteger(update?.update_id)||update.update_id<0||
     !message||message.chat?.type!=='private'||
     !Number.isSafeInteger(message.chat.id)||message.chat.id<=0||
     message.from?.id!==message.chat.id||message.from?.is_bot===true||
     !Number.isSafeInteger(message.date)||
     Math.abs(now-message.date*1000)>10*60*1000)return null
  const body=typeof message.text==='string'?message.text.trim():''
  const command=body.match(/^\/(audio|materials|combine|done|cancel|track)(?:@Andydotbot)?$/i)
  const fromLink=/^\/start(?:@Andydotbot)?\s+audio$/i.test(body)
  const combineLink=/^\/start(?:@Andydotbot)?\s+combine$/i.test(body)
  if(!command&&!fromLink&&!combineLink)return null
  return {updateId:update.update_id,chatId:String(message.chat.id),
    userId:String(message.from.id),
    action:combineLink?'combine':
      ['combine','done','cancel','materials','track'].includes(command?.[1]?.toLowerCase())
        ?command[1].toLowerCase():'help'}
}

export function parseOwnerAudioCallback(update){
  if(!Number.isSafeInteger(update?.update_id)||update.update_id<0)return null
  const query=update.callback_query, chat=query?.message?.chat,from=query?.from
  if(!query||chat?.type!=='private'||!Number.isSafeInteger(chat.id)||chat.id<=0||
     from?.id!==chat.id||from.is_bot===true||
     query.message?.from?.is_bot!==true||
     String(query.message?.from?.username||'').toLowerCase()!=='andydotbot'||
     typeof query.id!=='string'||query.id.length>128)return null
  if(['hh-audio:help','hh-audio:folders','hh-audio:materials','hh-audio:combine'].includes(query.data))
    return {action:query.data.slice('hh-audio:'.length),
      updateId:update.update_id,chatId:String(chat.id),userId:String(from.id),
      callbackId:query.id,
      // The clicked, bot-authored message can be edited in place even when an
      // older progress message is inaccessible or far above the current chat.
      messageId:Number.isSafeInteger(query.message?.message_id)&&
        query.message.message_id>0?query.message.message_id:null}
  // Previously released unscoped buttons must not finish/cancel a NEW batch.
  if(query.data==='hh-audio:done'||query.data==='hh-audio:cancel')
    return {action:'legacy-batch-button',updateId:update.update_id,
      chatId:String(chat.id),userId:String(from.id),callbackId:query.id}
  const batch=String(query.data||'').match(/^hh-audio:(bf|done|cancel|resend|voice):([0-9a-f-]{36})(?::([a-z]+))?$/)
  if(batch){
    if(!BATCH_ID_RE.test(batch[2])||
       (batch[1]==='bf'?!ownerAudioFolder(batch[3]):Boolean(batch[3])))
      return null
    return {action:batch[1]==='bf'?'combine-folder':batch[1],
      batchId:batch[2],folder:batch[1]==='bf'?batch[3]:null,
      updateId:update.update_id,chatId:String(chat.id),userId:String(from.id),
      callbackId:query.id}
  }
  const destination=String(query.data||'').match(/^hh-audio:to:([a-z]+)$/)
  if(destination){
    if(!ownerAudioFolder(destination[1]))return null
    return {action:'destination',updateId:update.update_id,chatId:String(chat.id),
      userId:String(from.id),callbackId:query.id,folder:destination[1]}
  }
  const match=String(query.data||'').match(/^hh-audio:([0-9a-f-]{36}):([a-z]+)$/)
  if(!match||!ownerAudioFolder(match[2])||
     !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(match[1]))return null
  return {action:'folder',updateId:update.update_id,chatId:String(chat.id),
    userId:String(from.id),callbackId:query.id,id:match[1],folder:match[2]}
}
export function audioMatchesMagic(bytes,mime){
  if(!(bytes instanceof Uint8Array)||bytes.byteLength<128)return false
  if(mime==='audio/ogg')return [79,103,103,83].every((v,i)=>bytes[i]===v)
  if(mime==='audio/wav')return [82,73,70,70].every((v,i)=>bytes[i]===v)&&
    [87,65,86,69].every((v,i)=>bytes[i+8]===v)
  if(mime==='audio/mp4')return [102,116,121,112].every((v,i)=>bytes[i+4]===v)
  if(mime==='audio/mpeg')return (bytes[0]===73&&bytes[1]===68&&bytes[2]===51)||
    (bytes[0]===255&&(bytes[1]&224)===224)
  return false
}
