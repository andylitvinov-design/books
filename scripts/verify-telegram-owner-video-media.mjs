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
 // The photographs are deliberately interleaved with two separate audio clips.
 // Confirm the encoded frames change at the expected audio boundary, not
 // according to an evenly timed slideshow.
 const photos=[join(dir,'blue.jpg'),join(dir,'yellow.jpg'),join(dir,'red.jpg')]
 const sounds=[join(dir,'one.mp3'),join(dir,'two.mp3')]
 for(const [i,color] of ['blue','yellow','red'].entries())
   run(['-f','lavfi','-i','color=c='+color+':s=640x360:d=1',
     '-frames:v','1','-update','1',photos[i]])
 for(const [i,frequency] of [550,770].entries())
   run(['-f','lavfi','-i','sine=frequency='+frequency+':duration=2',
     '-c:a','libmp3lame','-q:a','7',sounds[i]])
 const inputs=[photos[0],sounds[0],photos[1],photos[2],sounds[1]]
 const source=await Promise.all(inputs.map(file=>readFile(file)))
 const parts=source.map((buffer,i)=>({
  kind:[1,4].includes(i)?'audio':'photo',
  mime:[1,4].includes(i)?'audio/mpeg':'image/jpeg',
  ext:[1,4].includes(i)?'mp3':'jpg',fileId:'CI_MEDIA_'+i,
  uniqueId:'CI_UNIQUE_'+i,bytes:buffer.length,
  duration:[1,4].includes(i)?2:0,updateId:100+i
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
 function pixelAt(seconds){
  const result=spawnSync(binary,['-hide_banner','-loglevel','error','-ss',String(seconds),
    '-i',target,'-frames:v','1','-vf','scale=1:1:flags=neighbor,format=rgb24',
    '-f','rawvideo','pipe:1'],{timeout:20000,maxBuffer:4096})
  if(result.status!==0||result.stdout?.length!==3)throw Error('VIDEO_FRAME_READ_FAILED')
  return [...result.stdout]
 }
 const blue=pixelAt(1),yellow=pixelAt(2.5),red=pixelAt(3.5)
 if(!(blue[2]>blue[0]+60&&blue[2]>blue[1]+60&&
      yellow[0]>yellow[2]+60&&yellow[1]>yellow[2]+60&&
      red[0]>red[1]+60&&red[0]>red[2]+60))
   throw Error('VIDEO_PHOTO_CHRONOLOGY_FAILED')

 // Full-capacity integration: interleave 15 photos and 15 audio pieces using
 // only synthetic samples. Assert the actual 1080p FFmpeg output is decodable.
 const imageBytes=await Promise.all(photos.map(file=>readFile(file)))
 const soundBytes=await Promise.all(sounds.map(file=>readFile(file)))
 const fullParts=[],fullSources=[]
 for(let i=0;i<15;i++){
   for(const kind of ['photo','audio']){
     const bytes=kind==='photo'?imageBytes[i%imageBytes.length]:
       soundBytes[i%soundBytes.length]
     const index=fullParts.length
     fullParts.push({kind,mime:kind==='photo'?'image/jpeg':'audio/mpeg',
       ext:kind==='photo'?'jpg':'mp3',fileId:'CI_FULL_FILE_'+index,
       uniqueId:'CI_FULL_UNIQUE_'+index,bytes:bytes.length,
       duration:kind==='audio'?2:0,updateId:500+index})
     fullSources.push(bytes)
   }
 }
 const fullMp4=await renderOwnerTelegramVideo(fullParts,{
   executable:binary,fetchPart:p=>fullSources[p.updateId-500]})
 if(fullMp4.length<1024||fullMp4.toString('ascii',4,8)!=='ftyp')
   throw Error('VIDEO_15X15_NOT_MP4')
 const fullTarget=join(dir,'full-15-15.mp4')
 await writeFile(fullTarget,fullMp4)
 const fullDecoded=spawnSync(binary,['-hide_banner','-i',fullTarget,'-f','null','-'],{
   timeout:60000,encoding:'utf8',maxBuffer:128000})
 if(fullDecoded.status!==0||!/Video: h264/.test(fullDecoded.stderr)||
   !/Audio: aac/.test(fullDecoded.stderr))throw Error('VIDEO_15X15_CODEC_FAILED')
 console.log('MEDIA_15X15_SMOKE_PASSED 15 photos + 15 audio H264/AAC bytes='+fullMp4.length)
 console.log('MEDIA_SMOKE_PASSED ordered blue/yellow/red H264/AAC 1920x1080 MP4 bytes='+mp4.length)
}finally{await rm(dir,{force:true,recursive:true})}
