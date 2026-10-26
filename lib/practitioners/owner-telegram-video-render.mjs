// Deterministic, shell-free local FFmpeg slideshow builder. No external paid API.
import {spawn} from 'node:child_process'
import {mkdtemp,writeFile,readFile,rm,stat} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {safeVideoParts} from './owner-telegram-video-model.mjs'

const MAX_OUTPUT=50_000_000
const RENDER_TIMEOUT_MS=90000
function fileMagic(bytes,type){
 const b=bytes
 if(type==='image/jpeg')return b[0]===255&&b[1]===216&&b[2]===255
 if(type==='image/png')return b.slice(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
 if(type==='image/webp')return b.toString('ascii',0,4)==='RIFF'&&b.toString('ascii',8,12)==='WEBP'
 if(type==='audio/ogg')return b.toString('ascii',0,4)==='OggS'
 if(type==='audio/mpeg')return b.toString('ascii',0,3)==='ID3'||(b[0]===255&&(b[1]&224)===224)
 if(type==='audio/mp4')return b.toString('ascii',4,8)==='ftyp'
 if(type==='audio/wav')return b.toString('ascii',0,4)==='RIFF'&&b.toString('ascii',8,12)==='WAVE'
 return false
}
export function videoRenderArguments(parts,output){
 const totals=safeVideoParts(parts)
 if(!totals||!totals.images||!totals.audios||totals.seconds<1||totals.seconds>120)
   throw Error('VIDEO_INVALID_COMPOSITION')
 const photos=parts.filter(p=>p.kind==='photo')
 const audio=parts.filter(p=>p.kind==='audio')
 const seconds=(totals.seconds/photos.length).toFixed(3)
 const args=['-hide_banner','-nostdin','-loglevel','error','-y','-threads','2']
 for(const p of photos)args.push('-loop','1','-framerate','1','-t',seconds,'-i',p.localPath)
 for(const a of audio)args.push('-i',a.localPath)
 const filters=[]
 for(let i=0;i<photos.length;i++)
   filters.push('['+i+':v]scale=1920:1080:force_original_aspect_ratio=decrease,'+
     'pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,'+
     'format=yuv420p,fps=24,trim=duration='+seconds+',setpts=PTS-STARTPTS[v'+i+']')
 filters.push(photos.map((_,i)=>'[v'+i+']').join('')+
   'concat=n='+photos.length+':v=1:a=0[v]')
 for(let i=0;i<audio.length;i++)
   filters.push('['+(photos.length+i)+':a]aresample=48000,'+
     'aformat=sample_rates=48000:channel_layouts=stereo,'+
     'asetpts=PTS-STARTPTS[a'+i+']')
 if(audio.length>1)filters.push(audio.map((_,i)=>'[a'+i+']').join('')+
   'concat=n='+audio.length+':v=0:a=1[a]')
 args.push('-filter_complex',filters.join(';'),'-map','[v]','-map',
   audio.length===1?'[a0]':'[a]',
   '-c:v','libx264','-preset','ultrafast','-crf','27','-pix_fmt','yuv420p',
   '-r','24','-c:a','aac','-b:a','128k','-shortest','-movflags','+faststart',
   '-max_muxing_queue_size','256',output)
 return args
}
async function runFfmpeg(executable,args){
 if(!executable||typeof executable!=='string'||executable.length>1000)
   throw Error('VIDEO_RENDERER_UNAVAILABLE')
 await new Promise((resolve,reject)=>{
   const child=spawn(executable,args,{shell:false,stdio:['ignore','ignore','pipe'],env:{
     PATH:process.env.PATH||'/usr/bin:/bin',HOME:tmpdir(),TMPDIR:tmpdir()
   }})
   let done=false
   const fail=(error)=>{
     if(done)return
     done=true;clearTimeout(timeout)
     reject(error)
   }
   const timeout=setTimeout(()=>{
     child.kill('SIGKILL')
     fail(Error('VIDEO_RENDER_TIMEOUT'))
   },RENDER_TIMEOUT_MS)
   let stderrBytes=0
   child.stderr.on('data',chunk=>{stderrBytes+=chunk.length;if(stderrBytes>32768)child.kill('SIGKILL')})
   child.on('error',()=>fail(Error('VIDEO_RENDERER_UNAVAILABLE')))
   child.on('close',code=>{
     if(done)return
     done=true;clearTimeout(timeout)
     code===0&&stderrBytes<=32768?resolve():reject(Error('VIDEO_RENDER_FAILED'))
   })
 })
}
export async function renderOwnerTelegramVideo(parts,{executable,fetchPart}){
 if(typeof fetchPart!=='function')throw Error('VIDEO_FETCH_UNAVAILABLE')
 const ordered=[...parts].sort((a,b)=>a.updateId-b.updateId)
 const totals=safeVideoParts(ordered)
 if(!totals||totals.images<1||totals.audios<1)throw Error('VIDEO_INVALID_COMPOSITION')
 const dir=await mkdtemp(join(tmpdir(),'hh-telegram-slides-'))
 try{
   const files=[]
   for(let i=0;i<ordered.length;i++){
     const part=ordered[i]
     const bytes=Buffer.from(await fetchPart(part))
     if(bytes.length!==part.bytes||!fileMagic(bytes,part.mime))
       throw Error('VIDEO_INVALID_SOURCE')
     const localPath=join(dir,'source-'+i+'.'+part.ext)
     await writeFile(localPath,bytes,{mode:0o600})
     files.push({...part,localPath})
   }
   const target=join(dir,'result.mp4')
   await runFfmpeg(executable,videoRenderArguments(files,target))
   const result=await stat(target)
   if(result.size<1024||result.size>MAX_OUTPUT)throw Error('VIDEO_RENDER_SIZE')
   const mp4=await readFile(target)
   if(mp4.toString('ascii',4,8)!=='ftyp')throw Error('VIDEO_RENDER_NOT_MP4')
   return mp4
 }finally{
   await rm(dir,{recursive:true,force:true}).catch(()=>{})
 }
}
