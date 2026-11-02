// Private owner-approved HeyGen -> @aatapro uploader. No re-render, no
// client videos, no arbitrary URL fetch, no automatic retry after provider PUT.
const VIDEO_ID=/^[a-f0-9]{32}$/i
const YOUTUBE_ID=/^[A-Za-z0-9_-]{11}$/
const CHANNEL_ID=/^UC[A-Za-z0-9_-]{22}$/
const MIME='video/mp4'
const CHUNK=8*1024*1024
const MAX_BYTES=256*1024*1024
const API='https://www.googleapis.com'
const HEYGEN_API='https://api.heygen.com/v1/video_status.get'
const HEYGEN_V3='https://api.heygen.com/v3/videos/'
const SOURCE_HOSTS=new Set(['files2.heygen.ai','files.heygen.ai','resource2.heygen.ai'])
const fail=code=>{throw Error(code)}

export function validHeygenVideoId(value){return typeof value==='string'&&VIDEO_ID.test(value)}
export function validHeygenMediaUrl(value,videoId){
 if(!validHeygenVideoId(videoId)||typeof value!=='string'||value.length>3200)return false
 try{
   const url=new URL(value)
   return url.protocol==='https:'&&!url.username&&!url.password&&!url.port&&
     !url.hash&&SOURCE_HOSTS.has(url.hostname)&&
     url.pathname.toLowerCase().includes(videoId.toLowerCase())&&
     /\.mp4$/i.test(url.pathname)
 }catch{return false}
}
export function validatedYoutubeUploadLocation(value){
 try{
   const url=new URL(value)
   return url.protocol==='https:'&&!url.username&&!url.password&&
     !url.port&&['www.googleapis.com','youtube.googleapis.com'].includes(url.hostname)&&
     url.pathname.startsWith('/upload/youtube/v3/videos')?url.toString():null
 }catch{return null}
}
export function cleanHeygenPublication(input){
 if(!validHeygenVideoId(input?.videoId))fail('HEYGEN_INVALID_VIDEO_ID')
 const title=typeof input.title==='string'?input.title.trim():''
 const description=typeof input.description==='string'?input.description:''
 if(!title||title.length>100||/[\r\n\0]/.test(title))fail('HEYGEN_INVALID_TITLE')
 if(description.length>3000||description.includes('\0'))fail('HEYGEN_INVALID_DESCRIPTION')
 if(input.rightsConfirmed!==true||input.privacyConfirmed!==true)
   fail('HEYGEN_APPROVAL_REQUIRED')
 if(input.mediaUrl!=null&&!validHeygenMediaUrl(input.mediaUrl,input.videoId))
   fail('HEYGEN_INVALID_MEDIA_URL')
 return {videoId:input.videoId.toLowerCase(),title,description,
   mediaUrl:input.mediaUrl||null}
}
export async function resolveHeygenCaptionedUrl(videoId,{mediaUrl=null,apiKey,fetcher=fetch}={}){
 if(!validHeygenVideoId(videoId))fail('HEYGEN_INVALID_VIDEO_ID')
 if(mediaUrl){
   if(!validHeygenMediaUrl(mediaUrl,videoId))fail('HEYGEN_INVALID_MEDIA_URL')
   return mediaUrl
 }
 if(typeof apiKey!=='string'||apiKey.length<10)fail('HEYGEN_API_KEY_MISSING')
 // Prefer the current v3 API; legacy v1 returns video_url_caption rather
 // than captioned_video_url. Legacy caption_url is a subtitles SRT, NOT an MP4.
 const endpoints=[HEYGEN_V3+videoId,HEYGEN_API+'?video_id='+videoId]
 let missingCaption=false
 let completed=false
 for(const endpoint of endpoints){
   const res=await fetcher(endpoint,{
     headers:{'x-api-key':apiKey},redirect:'error',cache:'no-store',
     signal:AbortSignal.timeout(12000)})
   if(!res.ok)continue
   const json=await res.json().catch(()=>null)
   const data=json?.data??json
   if(data?.status==='completed'){
     completed=true
     const media=data?.captioned_video_url??data?.captionedVideoUrl??
       data?.video_url_caption
     if(validHeygenMediaUrl(media,videoId))return media
     missingCaption=true
   }
 }
 if(missingCaption)fail('HEYGEN_CAPTIONED_MEDIA_UNAVAILABLE')
 if(!completed)fail('HEYGEN_STATUS_UNAVAILABLE')
 fail('HEYGEN_CAPTIONED_MEDIA_UNAVAILABLE')
}
async function sourceSize(url,fetcher){
 const options={redirect:'error',cache:'no-store',signal:AbortSignal.timeout(20000)}
 let response=await fetcher(url,{method:'HEAD',...options})
 if(response.ok){
   const size=Number(response.headers.get('content-length'))
   if(Number.isSafeInteger(size)&&size>=1024&&size<=MAX_BYTES)return size
   if(size>MAX_BYTES)fail('HEYGEN_VIDEO_TOO_LARGE')
 }
 // Some signed URLs prohibit HEAD; a one-byte range also supplies length.
 response=await fetcher(url,{method:'GET',headers:{Range:'bytes=0-0'},...options})
 if(response.status!==206)fail('HEYGEN_SOURCE_RANGE_UNSUPPORTED')
 const range=/^bytes 0-0\/(\d+)$/.exec(response.headers.get('content-range')||'')
 await response.body?.cancel()
 const size=range?Number(range[1]):NaN
 if(!Number.isSafeInteger(size)||size<1024||size>MAX_BYTES)
   fail('HEYGEN_SOURCE_SIZE_INVALID')
 return size
}
async function sourceChunk(url,start,end,size,fetcher){
 const response=await fetcher(url,{method:'GET',headers:{Range:'bytes='+start+'-'+end},
   cache:'no-store',redirect:'error',signal:AbortSignal.timeout(70000)})
 if(response.status!==206||response.headers.get('content-range')!==
   'bytes '+start+'-'+end+'/'+size)
   fail('HEYGEN_SOURCE_RANGE_MISMATCH')
 const declared=Number(response.headers.get('content-length'))
 if(Number.isFinite(declared)&&declared>0&&declared!==end-start+1)
   fail('HEYGEN_SOURCE_RANGE_MISMATCH')
 const bytes=Buffer.from(await response.arrayBuffer())
 if(bytes.length!==end-start+1||bytes.length>CHUNK)fail('HEYGEN_SOURCE_BYTES_MISMATCH')
 if(start===0&&(bytes.length<12||bytes.toString('ascii',4,8)!=='ftyp'))
   fail('HEYGEN_SOURCE_NOT_MP4')
 return bytes
}
async function youtubeReadback(videoId,token,channelId,fetcher){
 const response=await fetcher(API+'/youtube/v3/videos?part=snippet,status&id='+videoId,{
   headers:{Authorization:'Bearer '+token},cache:'no-store',redirect:'error',
   signal:AbortSignal.timeout(12000)})
 if(!response.ok)fail('YOUTUBE_EN_READBACK_PENDING')
 const data=await response.json().catch(()=>null)
 const item=data?.items?.find(v=>v?.id===videoId)
 if(!item)fail('YOUTUBE_EN_READBACK_PENDING')
 if(item.snippet?.channelId!==channelId)fail('YOUTUBE_EN_WRONG_CHANNEL')
 if(item.status?.privacyStatus!=='unlisted')fail('YOUTUBE_EN_PRIVACY_HOLD')
 if(item.status?.uploadStatus==='processed')return {id:videoId,
   channelId,privacyStatus:'unlisted',uploadStatus:'processed'}
 if(item.status?.uploadStatus==='uploaded')fail('YOUTUBE_EN_PROCESSING')
 fail('YOUTUBE_EN_PROCESSING_FAILED')
}
export async function verifyHeygenYoutubeUpload(videoId,token,channelId,fetcher=fetch){
 if(!YOUTUBE_ID.test(videoId)||!CHANNEL_ID.test(channelId)||!token)
   fail('YOUTUBE_EN_INVALID_READBACK')
 return youtubeReadback(videoId,token,channelId,fetcher)
}
export async function transferHeygenToEnglishYoutube({
 videoId,title,description,token,channelId,apiKey=null,mediaUrl=null,
 fetcher=fetch,onUploadStart=async()=>{},onVideoId=async()=>{},
 onProgress=async()=>{},sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms))
}={}){
 if(!validHeygenVideoId(videoId)||!CHANNEL_ID.test(channelId)||
   typeof token!=='string'||token.length<20)fail('YOUTUBE_EN_NOT_CONNECTED')
 const request=cleanHeygenPublication({videoId,title,description,
   rightsConfirmed:true,privacyConfirmed:true,mediaUrl})
 const source=await resolveHeygenCaptionedUrl(videoId,{mediaUrl:request.mediaUrl,apiKey,fetcher})
 const size=await sourceSize(source,fetcher)
 // Preflight content before any YouTube mutation.
 const firstEnd=Math.min(CHUNK,size)-1
 const first=await sourceChunk(source,0,firstEnd,size,fetcher)
 await onUploadStart()
 const init=await fetcher(API+'/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status&notifySubscribers=false',{
   method:'POST',headers:{Authorization:'Bearer '+token,
     'content-type':'application/json; charset=UTF-8',
     'x-upload-content-type':MIME,'x-upload-content-length':String(size)},
   body:JSON.stringify({
     snippet:{title:request.title,description:request.description,categoryId:'22',
       defaultLanguage:'en',defaultAudioLanguage:'en'},
     status:{privacyStatus:'unlisted',selfDeclaredMadeForKids:false,
       containsSyntheticMedia:true}
   }),cache:'no-store',redirect:'error',signal:AbortSignal.timeout(15000)})
 if(!init.ok)fail('YOUTUBE_EN_INIT_UNCONFIRMED')
 const session=validatedYoutubeUploadLocation(init.headers.get('location'))
 if(!session)fail('YOUTUBE_EN_SESSION_UNTRUSTED')
 let uploadedId=null
 for(let start=0;start<size;start+=CHUNK){
   const end=Math.min(size-1,start+CHUNK-1)
   const bytes=start===0?first:await sourceChunk(source,start,end,size,fetcher)
   let response
   try{response=await fetcher(session,{
     method:'PUT',headers:{Authorization:'Bearer '+token,'Content-Type':MIME,
       'Content-Length':String(bytes.length),
       'Content-Range':'bytes '+start+'-'+end+'/'+size},
     body:bytes,cache:'no-store',redirect:'error',signal:AbortSignal.timeout(90000)
   })}catch{fail('YOUTUBE_EN_UPLOAD_UNCERTAIN')}
   if(response.status===308){
     if(end===size-1||response.headers.get('range')!=='bytes=0-'+end)
       fail('YOUTUBE_EN_UPLOAD_UNCERTAIN')
     await onProgress(end+1,size)
     continue
   }
   if(!response.ok||end!==size-1)fail('YOUTUBE_EN_UPLOAD_UNCERTAIN')
   const receipt=await response.json().catch(()=>null)
   if(!YOUTUBE_ID.test(receipt?.id||''))fail('YOUTUBE_EN_UPLOAD_UNCERTAIN')
   uploadedId=receipt.id
   await onVideoId(uploadedId)
   break
 }
 if(!uploadedId)fail('YOUTUBE_EN_UPLOAD_UNCERTAIN')
 // Never repeat media POST or PUT when YouTube is still processing.
 for(const pause of [0,5000,10000,15000,20000]){
   if(pause)await sleep(pause)
   try{return await verifyHeygenYoutubeUpload(uploadedId,token,channelId,fetcher)}
   catch(e){
     if(!['YOUTUBE_EN_PROCESSING','YOUTUBE_EN_READBACK_PENDING'].includes(e.message))
       throw e
     if(pause===20000)throw e
   }
 }
 fail('YOUTUBE_EN_READBACK_PENDING')
}
