/** Privacy-first Telegram audio metadata and FFmpeg argument policy.
 * Signed webhook + account link + versioned video consent are checked
 * elsewhere. Media is not downloaded until explicit /hhvideo_confirm.
 */
export const VIDEO_AUDIO_MAX_BYTES=3000000
export const VIDEO_AUDIO_MAX_SECONDS=60
const FILE_ID=/^[A-Za-z0-9_-]{5,512}$/
const ACCEPTED=new Set(['audio/ogg','audio/mpeg','audio/mp4','audio/wav'])
const ALIASES={'audio/opus':'audio/ogg','audio/x-m4a':'audio/mp4','audio/x-wav':'audio/wav'}
const EXT={'audio/ogg':/\.(?:oga|ogg|opus)$/i,'audio/mpeg':/\.mp3$/i,
 'audio/mp4':/\.(?:m4a|mp4)$/i,'audio/wav':/\.wav$/i}
export function telegramVideoAudioMeta(message){
 const v=message?.voice||message?.audio
 if(!v||message?.voice&&message?.audio)return null
 const raw=message.voice?'audio/ogg':String(v.mime_type||'').toLowerCase()
 const mime=ALIASES[raw]||raw,bytes=v.file_size,seconds=v.duration
 if(!ACCEPTED.has(mime)||!FILE_ID.test(String(v.file_id||''))||
  !Number.isSafeInteger(bytes)||bytes<100||bytes>VIDEO_AUDIO_MAX_BYTES||
  !Number.isSafeInteger(seconds)||seconds<1||seconds>VIDEO_AUDIO_MAX_SECONDS)return null
 return {fileId:v.file_id,bytes,seconds,mime,kind:message.voice?'voice':'audio',
  forwarded:Boolean(message.forward_origin||message.forward_from||
   message.forward_date||message.is_automatic_forward)}
}
export function validTelegramVideoAudioMeta(meta){
 if(!meta||!['voice','audio'].includes(meta.kind)||
  typeof meta.forwarded!=='boolean')return false
 const message=meta.kind==='voice'
  ?{voice:{file_id:meta.fileId,file_size:meta.bytes,duration:meta.seconds}}
  :{audio:{file_id:meta.fileId,file_size:meta.bytes,duration:meta.seconds,mime_type:meta.mime}}
 const parsed=telegramVideoAudioMeta(message)
 return Boolean(parsed&&parsed.mime===meta.mime&&parsed.kind===meta.kind)
}
export function videoAudioDurationTier(seconds){
 if(!Number.isFinite(seconds)||seconds<0.5||seconds>60)return null
 // Leave room for Telegram's rounded integer duration and encoder padding.
 for(const tier of [10,15,20,30,60])if(seconds<tier-0.15)return tier
 return seconds<=60?60:null
}
export function safeTelegramVideoAudioPath(path,mime){
 if(typeof path!=='string'||path.length>190||!ACCEPTED.has(mime)||
   /[?#\\:\s]/.test(path)||path.includes('..')||path.includes('//')||
   !/^(?:voice|music|audio|documents)\/[A-Za-z0-9_./-]+$/.test(path))
  return false
 return EXT[mime].test(path)
}
export function telegramVideoAudioMagic(bytes,mime){
 if(!(bytes instanceof Uint8Array)||bytes.length<12||!ACCEPTED.has(mime))return false
 const eq=(at,word)=>[...word].every((c,i)=>bytes[at+i]===c.charCodeAt(0))
 if(mime==='audio/ogg'){
  if(!eq(0,'OggS'))return false
  const word='OpusHead'
  for(let i=0;i<Math.min(4000,bytes.length-word.length);i++)if(eq(i,word))return true
  return false
 }
 if(mime==='audio/mpeg')return eq(0,'ID3')||
  (bytes[0]===255&&(bytes[1]&224)===224)
 if(mime==='audio/mp4')return eq(4,'ftyp')
 return eq(0,'RIFF')&&eq(8,'WAVE')
}
/** No shell, user-provided options or text-derived input paths. */
export function compileTelegramAiMuxArgs({sources,audioPath=null,durationSeconds,output}={}){
 if(!Array.isArray(sources)||sources.length!==4||
  sources.some(x=>typeof x!=='string'||!x)||typeof output!=='string'||!output||
  ![10,15,20,30,60].includes(durationSeconds)||
  (audioPath!==null&&(typeof audioPath!=='string'||!audioPath)))
  throw Error('AI_VIDEO_MUX_INVALID')
 const shot=durationSeconds/4
 const inputs=sources.flatMap(path=>['-stream_loop','-1','-i',path])
 if(audioPath)inputs.push('-i',audioPath)
 const filters=sources.map((_,i)=>'['+i+':v]fps=18,scale=360:640:force_original_aspect_ratio=decrease,pad=360:640:(ow-iw)/2:(oh-ih)/2,setsar=1,trim=duration='+shot+',setpts=PTS-STARTPTS[v'+i+']')
 filters.push('[v0][v1][v2][v3]concat=n=4:v=1:a=0[video]')
 return ['-hide_banner','-nostdin','-loglevel','error','-y','-threads','2',
  ...inputs,'-filter_complex',filters.join(';'),'-map','[video]',
  ...(audioPath?['-map','4:a:0','-c:a','aac','-b:a','96k',
    '-af','aresample=48000,apad']:['-an']),
  '-c:v','libx264','-preset','veryfast','-crf','30','-pix_fmt','yuv420p',
  '-t',String(durationSeconds),'-movflags','+faststart',output]
}
