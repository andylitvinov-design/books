/** Consent- and lease-gated Telegram media download. Never invoked by a
 * webhook or before owner-bound /hhvideo_confirm. Only Telegram Bot API
 * getFile may provide a path; no URL comes from client/forward metadata.
 */
import 'server-only'
import {validTelegramVideoAudioMeta,safeTelegramVideoAudioPath,
 telegramVideoAudioMagic,VIDEO_AUDIO_MAX_BYTES} from '../crm/telegram-ai-audio.mjs'

const BOT=/^\d{6,16}:[A-Za-z0-9_-]{25,}$/
const unavailable=()=>Error('AI_VIDEO_AUDIO_UNAVAILABLE')
async function boundedBuffer(response,max){
 if(!response.ok||!response.body||
   Number(response.headers.get('content-length')||0)>max)throw unavailable()
 const reader=response.body.getReader(),chunks=[]
 let size=0
 try{
  for(;;){
   const {done,value}=await reader.read()
   if(done)break
   size+=value.byteLength
   if(size>max)throw unavailable()
   chunks.push(Buffer.from(value))
  }
 }catch(error){await reader.cancel().catch(()=>{});throw error}
 if(size<100)throw unavailable()
 return Buffer.concat(chunks,size)
}
export async function downloadTelegramAiAudio(meta,{token,fetcher=fetch}={}){
 if(!validTelegramVideoAudioMeta(meta)||!BOT.test(String(token||'')))
  throw unavailable()
 // Telegram authenticates its own file_id; the client's message never
 // provides an arbitrary URL, URL path, channel or storage key.
 const json=await fetcher('https://api.telegram.org/bot'+token+'/getFile',{
  method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({file_id:meta.fileId}),cache:'no-store',
  redirect:'error',signal:AbortSignal.timeout(10000)})
 if(!json.ok)throw unavailable()
 const result=await json.json(),file=result?.result
 if(result?.ok!==true||!safeTelegramVideoAudioPath(file?.file_path,meta.mime)||
   !Number.isSafeInteger(file?.file_size)||file.file_size!==meta.bytes||
   file.file_size>VIDEO_AUDIO_MAX_BYTES)throw unavailable()
 const response=await fetcher('https://api.telegram.org/file/bot'+token+'/'+file.file_path,{
  method:'GET',cache:'no-store',redirect:'error',
  signal:AbortSignal.timeout(15000)})
 const bytes=await boundedBuffer(response,VIDEO_AUDIO_MAX_BYTES)
 if(bytes.length!==meta.bytes||!telegramVideoAudioMagic(bytes,meta.mime))
  throw unavailable()
 const extension={'audio/ogg':'ogg','audio/mpeg':'mp3','audio/mp4':'m4a',
  'audio/wav':'wav'}[meta.mime]
 return {bytes,extension,seconds:meta.seconds}
}
