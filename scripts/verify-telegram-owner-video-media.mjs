// Real, small smoke test for FFmpeg-generated H.264/AAC media; no YouTube requests.
import {mkdtemp,readFile,rm,writeFile} from 'node:fs/promises'
import {spawnSync} from 'node:child_process'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {renderOwnerTelegramVideo} from '../lib/practitioners/owner-telegram-video-render.mjs'
const binary=process.env.HH_TEST_FFMPEG_PATH||(await import('ffmpeg-static')).default
if(!binary)throw Error('FFMPEG_STATIC_BINARY_NOT_INSTALLED')
const dir=await mkdtemp(join(tmpdir(),'hh-video-ci-'))
function run(args){
 const result=spawnSync(binary,['-hide_banner','-loglevel','error','-y',...args],{
  timeout:45000,encoding:'utf8',maxBuffer:256000})
 if(result.status!==0)throw Error('FFMPEG_SMOKE_FAILED '+String(result.stderr).slice(0,400))
}
try{
 const photos=[join(dir,'one.jpg'),join(dir,'two.jpg')]
 const sound=join(dir,'sound.mp3')
 run(['-f','lavfi','-i','color=c=blue:s=640x360:d=1','-frames:v','1','-update','1',photos[0]])
 run(['-f','lavfi','-i','color=c=yellow:s=640x360:d=1','-frames:v','1','-update','1',photos[1]])
 run(['-f','lavfi','-i','sine=frequency=550:duration=2',
  '-c:a','libmp3lame','-q:a','7',sound])
 const inputs=[...photos,sound]
 const source=await Promise.all(inputs.map(file=>readFile(file)))
 const parts=source.map((buffer,i)=>({
  kind:i===2?'audio':'photo',mime:i===2?'audio/mpeg':'image/jpeg',
  ext:i===2?'mp3':'jpg',fileId:'CI_MEDIA_'+i,uniqueId:'CI_UNIQUE_'+i,
  bytes:buffer.length,duration:i===2?2:0,updateId:100+i
 }))
 const mp4=await renderOwnerTelegramVideo(parts,{
  executable:binary,fetchPart:p=>source[p.updateId-100]})
 if(mp4.length<1024||mp4.toString('ascii',4,8)!=='ftyp')throw Error('INVALID_MP4')
 const target=join(dir,'output.mp4')
 await writeFile(target,mp4)
 const decoded=spawnSync(binary,['-hide_banner','-i',target,'-f','null','-'],{
  timeout:30000,encoding:'utf8',maxBuffer:128000})
 if(decoded.status!==0||!/Video: h264/.test(decoded.stderr)||
   !/Audio: aac/.test(decoded.stderr))throw Error('UNEXPECTED_VIDEO_OR_AUDIO_CODEC')
 console.log('MEDIA_SMOKE_PASSED H264/AAC 1920x1080 MP4 bytes='+mp4.length)
}finally{await rm(dir,{force:true,recursive:true})}
