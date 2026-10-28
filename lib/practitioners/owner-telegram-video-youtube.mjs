// Owner-consented YouTube RU upload. No blind retries on ambiguous media POST/PUT.
import {VIDEO_RU_CHANNEL_ID} from './owner-telegram-video-model.mjs'

const GOOGLE='https://www.googleapis.com'
const TOKEN='https://oauth2.googleapis.com/token'
const VID=/^[A-Za-z0-9_-]{11}$/
async function readJson(response){
 try{return await response.json()}catch{throw Error('VIDEO_YOUTUBE_BAD_RESPONSE')}
}
export async function refreshYoutubeAccess(refreshToken,{clientId,clientSecret},fetcher=fetch){
 if(typeof refreshToken!=='string'||refreshToken.length<10||refreshToken.length>4096||
   !clientId||!clientSecret)throw Error('VIDEO_YOUTUBE_NOT_CONNECTED')
 const body=new URLSearchParams({grant_type:'refresh_token',refresh_token:refreshToken,
   client_id:clientId,client_secret:clientSecret})
 const response=await fetcher(TOKEN,{method:'POST',headers:{'content-type':
   'application/x-www-form-urlencoded'},body,cache:'no-store',redirect:'error',
   signal:AbortSignal.timeout(12000)})
 if(!response.ok)throw Error('VIDEO_YOUTUBE_RECONNECT_REQUIRED')
 const result=await readJson(response)
 if(typeof result.access_token!=='string'||result.access_token.length<20||
   !Number.isInteger(result.expires_in)||result.expires_in<60)
   throw Error('VIDEO_YOUTUBE_RECONNECT_REQUIRED')
 return result.access_token
}
async function youtubeJson(path,token,fetcher){
 const response=await fetcher(GOOGLE+'/youtube/v3/'+path,{
   headers:{Authorization:'Bearer '+token},cache:'no-store',credentials:'omit',
   redirect:'error',signal:AbortSignal.timeout(12000)})
 if(!response.ok)throw Error('VIDEO_YOUTUBE_READBACK_FAILED')
 return readJson(response)
}
export async function verifyYoutubeRuOwner(token,fetcher=fetch){
 if(typeof token!=='string'||token.length<20)throw Error('VIDEO_YOUTUBE_RECONNECT_REQUIRED')
 const response=await youtubeJson('channels?part=id&mine=true',token,fetcher)
 if(!Array.isArray(response.items)||response.items.length!==1||
   response.items[0].id!==VIDEO_RU_CHANNEL_ID)
   throw Error('VIDEO_YOUTUBE_WRONG_CHANNEL')
 return VIDEO_RU_CHANNEL_ID
}
export async function verifyUploadedRu(videoId,token,fetcher=fetch){
 if(!VID.test(videoId))throw Error('VIDEO_YOUTUBE_INVALID_ID')
 const response=await youtubeJson('videos?part=snippet,status&id='+encodeURIComponent(videoId),token,fetcher)
 const result=response.items?.find(v=>v?.id===videoId)
 // YouTube can temporarily omit the newly uploaded ID while processing.
 // A missing readback is NOT evidence for retrying the media POST/PUT.
 if(!result)throw Error('VIDEO_YOUTUBE_READBACK_FAILED')
 if(result.snippet?.channelId!==VIDEO_RU_CHANNEL_ID)
   throw Error('VIDEO_YOUTUBE_WRONG_CHANNEL')
 if(result.status?.privacyStatus!=='unlisted')throw Error('VIDEO_YOUTUBE_PRIVACY_HOLD')
 // Channel and visibility alone do not mean Google accepted the media.
 // YouTube can still reject a video while status is merely `uploaded`.
 // Preserve the known ID for read-only reconciliation; never re-upload.
 if(result.status?.uploadStatus!=='processed'){
   const pending=Error('VIDEO_YOUTUBE_UPLOAD_UNCONFIRMED')
   // Only the genuine transient uploaded state may be polled. Failed/rejected,
   // deleted, a wrong channel, and a privacy hold must fail closed.
   pending.processing=result.status?.uploadStatus==='uploaded'
   throw pending
 }
 return {id:videoId,channelId:VIDEO_RU_CHANNEL_ID,privacy:'unlisted',
   uploadStatus:'processed',title:String(result.snippet?.title||'').slice(0,100)}
}
// Poll only the provider receipt's existing ID. Never create another upload
// session during processing, a transient network failure, or readback lag.
export async function waitForUploadedRu(videoId,token,{
 fetcher=fetch,
 sleep=milliseconds=>new Promise(resolve=>setTimeout(resolve,milliseconds)),
 delays=[5000,10000,15000,20000,30000]
}={}){
 if(!VID.test(videoId))throw Error('VIDEO_YOUTUBE_INVALID_ID')
 if(!Array.isArray(delays)||delays.length>5||
   delays.some(value=>!Number.isSafeInteger(value)||value<0||value>30000))
   throw Error('VIDEO_YOUTUBE_POLL_INVALID')
 for(let attempt=0;;attempt++){
   try{return await verifyUploadedRu(videoId,token,fetcher)}
   catch(error){
     const retryable=error?.processing===true||
       error?.message==='VIDEO_YOUTUBE_READBACK_FAILED'
     if(!retryable||attempt>=delays.length)
       throw error?.processing===true?Error('VIDEO_YOUTUBE_UPLOAD_UNCONFIRMED'):error
     await sleep(delays[attempt])
   }
 }
}

export async function uploadUnlistedRu(mp4,token,{
 fetcher=fetch,onBeginUpload=async()=>{},onUploaded=async()=>{},
 sleep,processingDelays,mediaMime='video/mp4',
 title='Видео из Telegram · Holistic House',description='Фотографии и авторское аудио · Holistic House'
}={}){
 if(!Buffer.isBuffer(mp4)||mp4.length<1024||mp4.length>50_000_000||
   !['video/mp4','video/quicktime','video/webm'].includes(mediaMime))
   throw Error('VIDEO_YOUTUBE_INVALID_MEDIA')
 const atom=mp4.toString('ascii',4,8)
 const magic=mediaMime==='video/webm'
   ?mp4.subarray(0,4).equals(Buffer.from([0x1a,0x45,0xdf,0xa3]))
   :mediaMime==='video/quicktime'
     ?['ftyp','moov','mdat','wide','free','skip'].includes(atom) &&
       mp4.readUInt32BE(0)>=8
     :atom==='ftyp'
 if(!magic)throw Error('VIDEO_YOUTUBE_INVALID_MEDIA')
 if(typeof title!=='string'||!title.trim()||title.length>100||
   typeof description!=='string'||description.length>5000||
   description.includes('\\0'))
   throw Error('VIDEO_YOUTUBE_INVALID_TITLE')
 await verifyYoutubeRuOwner(token,fetcher)
 const init=await fetcher(GOOGLE+'/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status&notifySubscribers=false',{
   method:'POST',
   headers:{Authorization:'Bearer '+token,'content-type':'application/json; charset=UTF-8',
     'x-upload-content-type':mediaMime,'x-upload-content-length':String(mp4.length)},
   body:JSON.stringify({snippet:{title,description,categoryId:'22',
     defaultLanguage:'ru',defaultAudioLanguage:'ru'},status:{
       privacyStatus:'unlisted',selfDeclaredMadeForKids:false}}),
   cache:'no-store',redirect:'error',signal:AbortSignal.timeout(15000)})
 if(!init.ok)throw Error('VIDEO_YOUTUBE_INIT_FAILED')
 const location=init.headers.get('location')
 let uri
 try{uri=new URL(location)}catch{throw Error('VIDEO_YOUTUBE_INIT_FAILED')}
 if(uri.protocol!=='https:'||!['www.googleapis.com','youtube.googleapis.com'].includes(uri.hostname)||
   !uri.pathname.startsWith('/upload/youtube/v3/videos')||uri.username||uri.password)
   throw Error('VIDEO_YOUTUBE_UPLOAD_ORIGIN')
 // Once upload begins, an opaque network timeout must NEVER trigger a second video creation.
 await onBeginUpload()
 const uploaded=await fetcher(uri.toString(),{
   method:'PUT',headers:{Authorization:'Bearer '+token,'Content-Type':mediaMime,
     'Content-Length':String(mp4.length),
     'Content-Range':'bytes 0-'+(mp4.length-1)+'/'+mp4.length},
   body:mp4,cache:'no-store',redirect:'error',signal:AbortSignal.timeout(70000)})
 if(!uploaded.ok)throw Error('VIDEO_YOUTUBE_UPLOAD_UNCERTAIN')
 const receipt=await readJson(uploaded)
 if(!VID.test(receipt?.id||''))throw Error('VIDEO_YOUTUBE_UPLOAD_UNCERTAIN')
 await onUploaded(receipt.id)
 return waitForUploadedRu(receipt.id,token,{fetcher,...(sleep?{sleep}:{}),...(processingDelays?{delays:processingDelays}:{})})
}
