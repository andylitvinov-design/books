// Deterministic, shell-free local FFmpeg slideshow builder. No external paid API.
import {spawn} from 'node:child_process'
import {mkdtemp,writeFile,readFile,rm,stat,access} from 'node:fs/promises'
import {constants as fsConstants} from 'node:fs'
import {tmpdir} from 'node:os'
import {join,isAbsolute} from 'node:path'
import {safeVideoParts,VIDEO_MAX_SECONDS} from './owner-telegram-video-model.mjs'

const MAX_OUTPUT=50_000_000
const RENDER_TIMEOUT_MS=240000

// Webpack can give ffmpeg-static a path relative to its bundled JS chunk, while
// Vercel's Next outputFileTracingIncludes copies the executable to node_modules.
// Prefer the package path when it is executable; otherwise use only known
// server-controlled locations. Never download or execute arbitrary input.
export async function resolveOwnerVideoFfmpegPath(packagePath,root=process.cwd()){
 const candidates=[
   packagePath,
   join(root,'node_modules/ffmpeg-static/ffmpeg'),
   join(root,'.next/server/node_modules/ffmpeg-static/ffmpeg'),
   '/var/task/node_modules/ffmpeg-static/ffmpeg',
 ]
 const seen=new Set()
 for(const path of candidates){
   if(typeof path!=='string'||!isAbsolute(path)||seen.has(path))continue
   seen.add(path)
   try{
     if(!(await stat(path)).isFile())continue
     await access(path,fsConstants.X_OK)
     return path
   }catch{/* A misplaced or missing executable must never be spawned. */}
 }
 throw Error('VIDEO_RENDERER_UNAVAILABLE')
}
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
// Photos follow their related audio when sent to Dot, but the final video
// shows each photo over the PRECEDING audio, not after it. Backfill a batch
// of late photos onto the last equally many preceding audio segments in order.
// A first image also covers earlier audio so the soundtrack never plays black.
export function photoTimeline(parts){
 const ordered=[...parts].sort((a,b)=>a.updateId-b.updateId)
 const totals=safeVideoParts(ordered)
 if(!totals||!totals.images||!totals.audios||totals.seconds<1)
   throw Error('VIDEO_INVALID_COMPOSITION')
 const photos=[],audios=[]
 let elapsedMs=0
 for(let i=0;i<ordered.length;){
   if(ordered[i].kind==='audio'){
     const durationMs=ordered[i].duration*1000
     audios.push({startMs:elapsedMs,endMs:elapsedMs+durationMs})
     elapsedMs+=durationMs
     i++
     continue
   }
   const group=[]
   while(i<ordered.length&&ordered[i].kind==='photo')group.push(ordered[i++])
   for(let j=0;j<group.length;j++){
     const preceding=audios[Math.max(0,audios.length-group.length+j)]||null
     photos.push({
       part:group[j],
       atMs:Math.max(photos.at(-1)?.atMs||0,preceding?.startMs||0),
       relatedEndMs:preceding?.endMs||null,
     })
   }
 }
 const totalMs=totals.seconds*1000
 if(photos[0].atMs>0)photos[0].atMs=0
 const timeline=[]
 for(let i=0;i<photos.length;){
   let next=i+1
   while(next<photos.length&&photos[next].atMs===photos[i].atMs)next++
   const atMs=photos[i].atMs
   const intervalEnd=next<photos.length?photos[next].atMs:totalMs
   const count=next-i
   // Multiple photos for the same audio share its interval. The last photo
   // continues across any later audio without a new photo; no blank frame.
   const relatedEnd=Math.max(...photos.slice(i,next).map(p=>
     p.relatedEndMs||audios[0].endMs))
   const splitEnd=Math.min(intervalEnd,Math.max(atMs+count,relatedEnd))
   for(let j=0;j<count;j++){
     const startMs=atMs+Math.round((splitEnd-atMs)*j/count)
     const endMs=j===count-1?intervalEnd
       :atMs+Math.round((splitEnd-atMs)*(j+1)/count)
     if(endMs<=startMs)throw Error('VIDEO_INVALID_COMPOSITION')
     timeline.push({part:photos[i+j].part,startMs,durationMs:endMs-startMs})
   }
   i=next
 }
 return timeline
}
export function videoRenderArguments(parts,output){
 const totals=safeVideoParts(parts)
 if(!totals||!totals.images||!totals.audios||totals.seconds<1||totals.seconds>VIDEO_MAX_SECONDS)
   throw Error('VIDEO_INVALID_COMPOSITION')
 const ordered=[...parts].sort((a,b)=>a.updateId-b.updateId)
 const photos=photoTimeline(ordered)
 const audio=ordered.filter(p=>p.kind==='audio')
 const args=['-hide_banner','-nostdin','-loglevel','error','-y','-threads','2']
 // Telegram rounds individual voice durations. To preserve their real endings,
 // extend the FINAL image both at its INPUT and its FILTER duration; extending
 // the filter alone cannot add frames after FFmpeg has already closed the input.
 const audioTailSafetySeconds=Math.min(60,2*audio.length+2)
 for(let i=0;i<photos.length;i++){
   const {part,durationMs}=photos[i]
   const coverMs=durationMs+(i===photos.length-1?audioTailSafetySeconds*1000:0)
   args.push('-loop','1','-framerate','1','-t',(coverMs/1000).toFixed(3),
     '-i',part.localPath)
 }
 for(const a of audio)args.push('-i',a.localPath)
 const filters=[]
 for(let i=0;i<photos.length;i++)
   filters.push('['+i+':v]setsar=1,scale=1920:1080:force_original_aspect_ratio=decrease,'+
     'pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,'+
     'format=yuv420p,fps=2,trim=duration='+
     (photos[i].durationMs/1000+(i===photos.length-1?audioTailSafetySeconds:0)).toFixed(3)+
     ',setpts=PTS-STARTPTS[v'+i+']')
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
   '-r','2','-aspect:v','16:9','-c:a','aac','-b:a','128k','-shortest','-movflags','+faststart',
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
     if(code===0&&stderrBytes<=32768)resolve()
     else reject(Error('VIDEO_RENDER_FAILED'))
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
