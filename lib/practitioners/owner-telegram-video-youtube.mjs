// Explicit owner-confirmed YouTube uploads to RU or EN, never a blind retry.
import {VIDEO_RU_CHANNEL_ID,VIDEO_EN_CHANNEL_HANDLE,videoTargetValid} from './owner-telegram-video-model.mjs'

const GOOGLE='https://www.googleapis.com'
const TOKEN='https://oauth2.googleapis.com/token'
const VID=/^[A-Za-z0-9_-]{11}$/
const CHANNEL=/^UC[A-Za-z0-9_-]{22}$/
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
// Google must independently confirm the actual channel owned by the signed-in
// account. RU is immutable; EN is also compared with the existing app-approved
// @aatapro handle (never silently upload to whichever account is open).
export async function verifyYoutubeTargetOwner(token,target='ru',fetcher=fetch){
 if(typeof token!=='string'||token.length<20)throw Error('VIDEO_YOUTUBE_RECONNECT_REQUIRED')
 if(!videoTargetValid(target))throw Error('VIDEO_YOUTUBE_WRONG_CHANNEL')
 const mine=await youtubeJson('channels?part=id&mine=true',token,fetcher)
 const channel=Array.isArray(mine.items)&&mine.items.length===1?mine.items[0]?.id:null
 if(!CHANNEL.test(channel||''))throw Error('VIDEO_YOUTUBE_WRONG_CHANNEL')
 if(target==='ru'){
   if(channel!==VIDEO_RU_CHANNEL_ID)throw Error('VIDEO_YOUTUBE_WRONG_CHANNEL')
   return channel
 }
 const handle=await youtubeJson('channels?part=id&forHandle='+
   encodeURIComponent(VIDEO_EN_CHANNEL_HANDLE),token,fetcher)
 if(!Array.isArray(handle.items)||handle.items.length!==1||
   handle.items[0]?.id!==channel)
   throw Error('VIDEO_YOUTUBE_WRONG_CHANNEL')
 return channel
}
export function verifyYoutubeRuOwner(token,fetcher=fetch){
 return verifyYoutubeTargetOwner(token,'ru',fetcher)
}
export async function verifyUploadedTarget(videoId,token,{
 target='ru',channelId=VIDEO_RU_CHANNEL_ID,fetcher=fetch
}={}){
 if(!VID.test(videoId))throw Error('VIDEO_YOUTUBE_INVALID_ID')
 if(!videoTargetValid(target)||!CHANNEL.test(channelId)||
   target==='ru'&&channelId!==VIDEO_RU_CHANNEL_ID)
   throw Error('VIDEO_YOUTUBE_WRONG_CHANNEL')
 const response=await youtubeJson('videos?part=snippet,status&id='+encodeURIComponent(videoId),token,fetcher)
 const result=response.items?.find(v=>v?.id===videoId)
 if(!result||result.snippet?.channelId!==channelId)
   throw Error('VIDEO_YOUTUBE_WRONG_CHANNEL')
 if(result.status?.privacyStatus!=='unlisted')throw Error('VIDEO_YOUTUBE_PRIVACY_HOLD')
 // A merely uploaded video is not processed. Preserve the saved ID and
 // reconcile through read-only requests; never repeat a media upload.
 if(result.status?.uploadStatus!=='processed')
   throw Error('VIDEO_YOUTUBE_UPLOAD_UNCONFIRMED')
 return {id:videoId,channelId,privacy:'unlisted',
   uploadStatus:'processed',title:String(result.snippet?.title||'').slice(0,100)}
}
export function verifyUploadedRu(videoId,token,fetcher=fetch){
 return verifyUploadedTarget(videoId,token,{
   target:'ru',channelId:VIDEO_RU_CHANNEL_ID,fetcher})
}
export async function uploadUnlistedTarget(mp4,token,{
 fetcher=fetch,onBeginUpload=async()=>{},onUploaded=async()=>{},
 target='ru',channelId=VIDEO_RU_CHANNEL_ID,
 title='Видео из Telegram · Holistic House'
}={}){
 if(!Buffer.isBuffer(mp4)||mp4.length<1024||mp4.length>50_000_000||
   mp4.toString('ascii',4,8)!=='ftyp')throw Error('VIDEO_YOUTUBE_INVALID_MEDIA')
 if(typeof title!=='string'||!title.trim()||title.length>100)
   throw Error('VIDEO_YOUTUBE_INVALID_TITLE')
 if(!videoTargetValid(target)||!CHANNEL.test(channelId)||
   target==='ru'&&channelId!==VIDEO_RU_CHANNEL_ID)
   throw Error('VIDEO_YOUTUBE_WRONG_CHANNEL')
 const owned=await verifyYoutubeTargetOwner(token,target,fetcher)
 if(owned!==channelId)throw Error('VIDEO_YOUTUBE_WRONG_CHANNEL')
 const init=await fetcher(GOOGLE+'/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status&notifySubscribers=false',{
   method:'POST',
   headers:{Authorization:'Bearer '+token,'content-type':'application/json; charset=UTF-8',
     'x-upload-content-type':'video/mp4','x-upload-content-length':String(mp4.length)},
   body:JSON.stringify({snippet:{title,description:
     'Авторские фотографии и аудио · Holistic House',categoryId:'22',
     defaultLanguage:target,defaultAudioLanguage:target},status:{
       privacyStatus:'unlisted',selfDeclaredMadeForKids:false}}),
   cache:'no-store',redirect:'error',signal:AbortSignal.timeout(15000)})
 if(!init.ok)throw Error('VIDEO_YOUTUBE_INIT_FAILED')
 const location=init.headers.get('location')
 let uri
 try{uri=new URL(location)}catch{throw Error('VIDEO_YOUTUBE_INIT_FAILED')}
 if(uri.protocol!=='https:'||!['www.googleapis.com','youtube.googleapis.com'].includes(uri.hostname)||
   !uri.pathname.startsWith('/upload/youtube/v3/videos')||uri.username||uri.password)
   throw Error('VIDEO_YOUTUBE_UPLOAD_ORIGIN')
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
 return verifyUploadedTarget(receipt.id,token,{target,channelId,fetcher})
}
export function uploadUnlistedRu(mp4,token,options={}){
 return uploadUnlistedTarget(mp4,token,{
   ...options,target:'ru',channelId:VIDEO_RU_CHANNEL_ID})
}
