// Owner-only Telegram YouTube title/description contracts.
// No client data or provider media is read/changed by these helpers.
export const OWNER_YOUTUBE_TITLE_MAX=100
export const OWNER_YOUTUBE_DESCRIPTION_MAX=3000
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
const NONCE=/^[a-f0-9]{14}$/
export function ownerVideoMetadataValue(field,raw){
 if(!['title','description'].includes(field)||typeof raw!=='string')return null
 let value=raw.replace(/\r\n?/g,'\n').trim()
 if(field==='description'&&value==='-')value=''
 if(value.includes('<')||value.includes('>')||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value))
   return null
 if(field==='title'){
   if(!value||value.length>OWNER_YOUTUBE_TITLE_MAX||/[\r\n]/.test(value))return null
 }else if(value.length>OWNER_YOUTUBE_DESCRIPTION_MAX||
   Buffer.byteLength(value,'utf8')>4800)return null
 return value
}
export function ownerVideoMetadataEditButtons(jobId,nonce){
 if(!UUID.test(jobId)||!NONCE.test(nonce))throw Error('INVALID_METADATA_CONFIRMATION')
 const confirm='hh-video:ma:'+jobId+':'+nonce
 const cancel='hh-video:mx:'+jobId+':'+nonce
 if(confirm.length>64||cancel.length>64)throw Error('VIDEO_CALLBACK_OVERFLOW')
 return {inline_keyboard:[
   [{text:'✅ Подтвердить изменение этого видео',callback_data:confirm}],
   [{text:'✖ Не менять название/описание',callback_data:cancel}]
 ]}
}
export function ownerVideoMetadataMenuButtons(jobId){
 if(!UUID.test(jobId))throw Error('INVALID_VIDEO_JOB')
 return {inline_keyboard:[
   [{text:'✏️ Указать название',callback_data:'hh-video:mt:'+jobId}],
   [{text:'📝 Указать описание',callback_data:'hh-video:md:'+jobId}],
   [{text:'🌐 Доступ по ссылке / Для всех',callback_data:'hh-video:vis:'+jobId}]
 ]}
}

export function ownerVideoMetadataReplyPrompt(jobId,field){
 if(!UUID.test(jobId)||!['title','description'].includes(field))
   throw Error('INVALID_METADATA_REPLY')
 const title=field==='title'
 return {
   text:(title
     ?'✏️ Напиши название ролика (1–100 символов).'
     :'📝 Напиши описание ролика (до 3000 символов; можно с новой строки).')+
     '\nОтветь прямо на ЭТО сообщение, без команды. Для очистки описания напиши «-».\n'+
     (title?'Также можно: /video_title Название':'Также можно: /video_description Текст')+
     '\n[hh-video:'+field+':'+jobId+']',
   reply_markup:{force_reply:true,selective:true,
     input_field_placeholder:title?'Новое название ролика':'Новое описание ролика'}
 }
}
