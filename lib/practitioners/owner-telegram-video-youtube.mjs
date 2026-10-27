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
 if(!result||result.snippet?.channelId!==VIDEO_RU_CHANNEL_ID)
   throw Error('VIDEO_YOUTUBE_WRONG_CHANNEL')
 if(result.status?.privacyStatus!=='unlisted')throw Error('VIDEO_YOUTUBE_PRIVACY_HOLD')
 // Channel and visibility alone do not mean Google accepted the media.
 // YouTube can still reject a video while status is merely `uploaded`.
 // Preserve the known ID for read-only reconciliation; never re-upload.
 if(result.status?.uploadStatus!=='processed')
   throw Error('VIDEO_YOUTUBE_UPLOAD_UNCONFIRMED')
 return {id:videoId,channelId:VIDEO_RU_CHANNEL_ID,privacy:'unlisted',
   uploadStatus:'processed',title:String(result.snippet?.title||'').slice(0,100)}
}
export async function uploadUnlistedRu(mp4,token,{
 fetcher=fetch,onBeginUpload=async()=>{},onUploaded=async()=>{},
 title='Видео из Telegram · Holistic House'
}={}){
 if(!Buffer.isBuffer(mp4)||mp4.length<1024||mp4.length>50_000_000||
   mp4.toString('ascii',4,8)!=='ftyp')throw Error('VIDEO_YOUTUBE_INVALID_MEDIA')
 if(typeof title!=='string'||!title.trim()||title.length>100)
   throw Error('VIDEO_YOUTUBE_INVALID_TITLE')
 await verifyYoutubeRuOwner(token,fetcher)
 const init=await fetcher(GOOGLE+'/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status&notifySubscribers=false',{
   method:'POST',
   headers:{Authorization:'Bearer '+token,'content-type':'application/json; charset=UTF-8',
     'x-upload-content-type':'video/mp4','x-upload-content-length':String(mp4.length)},
   body:JSON.stringify({snippet:{title,description:
     'Фотографии и авторское аудио · Holistic House',categoryId:'22',
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
   method:'PUT',headers:{Authorization:'Bearer '+token,'Content-Type':'video/mp4',
     'Content-Length':String(mp4.length),
     'Content-Range':'bytes 0-'+(mp4.length-1)+'/'+mp4.length},
   body:mp4,cache:'no-store',redirect:'error',signal:AbortSignal.timeout(70000)})
 if(!uploaded.ok)throw Error('VIDEO_YOUTUBE_UPLOAD_UNCERTAIN')
 const receipt=await readJson(uploaded)
 if(!VID.test(receipt?.id||''))throw Error('VIDEO_YOUTUBE_UPLOAD_UNCERTAIN')
 await onUploaded(receipt.id)
 return verifyUploadedRu(receipt.id,token,fetcher)
}
