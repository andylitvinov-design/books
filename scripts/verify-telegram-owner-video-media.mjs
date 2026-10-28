// Real, small smoke test for FFmpeg-generated H.264/AAC media; no YouTube requests.
import {mkdtemp,readFile,rm,writeFile} from 'node:fs/promises'
import {spawnSync} from 'node:child_process'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {renderOwnerTelegramVideo,trimOwnerTelegramVideo,resolveOwnerVideoFfmpegPath} from '../lib/practitioners/owner-telegram-video-render.mjs'
const binary=process.env.HH_TEST_FFMPEG_PATH||(await import('ffmpeg-static')).default
if(!binary)throw Error('FFMPEG_STATIC_BINARY_NOT_INSTALLED')
const executable=await resolveOwnerVideoFfmpegPath('/vercel/bundled/chunks/ffmpeg')
if(!executable)throw Error('FFMPEG_PACKAGED_BINARY_UNRESOLVED')
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
  executable,fetchPart:p=>source[p.updateId-100]})
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

 // Owner-approved cut: re-encode from second 2, preserve the original,
 // retain H.264/AAC, and verify the new beginning is not the original intro.
 const cutBytes=await trimOwnerTelegramVideo(mp4,{startSeconds:2,executable})
 const cutFile=join(dir,'cut-from-2s.mp4')
 await writeFile(cutFile,cutBytes)
 const cutInfo=spawnSync(binary,['-hide_banner','-i',cutFile,'-f','null','-'],{
   timeout:30000,encoding:'utf8',maxBuffer:128000})
 const cutDuration=cutInfo.stderr.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/)
 const seconds=cutDuration?
   Number(cutDuration[1])*3600+Number(cutDuration[2])*60+Number(cutDuration[3]):0
 if(cutInfo.status!==0||!/Video: h264/.test(cutInfo.stderr)||
   !/Audio: aac/.test(cutInfo.stderr)||seconds<1.5||seconds>3.5)
   throw Error('VIDEO_CUT_CODEC_OR_DURATION_FAILED')
 const firstCut=spawnSync(binary,['-hide_banner','-loglevel','error',
   '-ss','0.5','-i',cutFile,'-frames:v','1',
   '-vf','scale=1:1:flags=neighbor,format=rgb24',
   '-f','rawvideo','pipe:1'],{timeout:20000,maxBuffer:4096})
 const firstColor=[...firstCut.stdout||[]]
 if(firstCut.status!==0||firstColor.length!==3||
   firstColor[0]<=firstColor[2]+60||firstColor[1]<=firstColor[2]+60)
   throw Error('VIDEO_CUT_STILL_SHOWS_REMOVED_INTRO')
 if(!mp4.equals(await readFile(target)))throw Error('VIDEO_CUT_MUTATED_ORIGINAL')
 let rejects=false
 try{await trimOwnerTelegramVideo(mp4,{startSeconds:0,executable})}
 catch(error){rejects=error.message==='VIDEO_TRIM_INVALID_SECONDS'}
 if(!rejects)throw Error('VIDEO_CUT_ZERO_WAS_NOT_REJECTED')
 console.log('MEDIA_CUT_SMOKE_PASSED start_second=2 cut_duration='+seconds)
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
   executable,fetchPart:p=>fullSources[p.updateId-500]})
 if(fullMp4.length<1024||fullMp4.toString('ascii',4,8)!=='ftyp')
   throw Error('VIDEO_15X15_NOT_MP4')
 const fullTarget=join(dir,'full-15-15.mp4')
 await writeFile(fullTarget,fullMp4)
 const fullDecoded=spawnSync(binary,['-hide_banner','-i',fullTarget,'-f','null','-'],{
   timeout:60000,encoding:'utf8',maxBuffer:128000})
 if(fullDecoded.status!==0||!/Video: h264/.test(fullDecoded.stderr)||
   !/Audio: aac/.test(fullDecoded.stderr))throw Error('VIDEO_15X15_CODEC_FAILED')
 // Regression for actual owner incident: 11 successive audio tracks and
 // only then 3 photographs. Combined duration exceeds the removed 120s cap.
 // Use synthetic files only; no Telegram or private owner material.
 const longAudio=join(dir,'long-12-seconds.mp3')
 run(['-f','lavfi','-i','sine=frequency=432:duration=12',
   '-c:a','libmp3lame','-q:a','7',longAudio])
 const longSound=await readFile(longAudio)
 const ownerInputs=[],ownerSources=[]
 for(let i=0;i<11;i++){
   ownerInputs.push({kind:'audio',mime:'audio/mpeg',ext:'mp3',
     fileId:'CI_OWNER_AUDIO_'+i,uniqueId:'CI_OWNER_AUDIO_UNIQUE_'+i,
     bytes:longSound.length,duration:12,updateId:700+i})
   ownerSources.push(longSound)
 }
 for(let i=0;i<3;i++){
   const bytes=imageBytes[i]
   ownerInputs.push({kind:'photo',mime:'image/jpeg',ext:'jpg',
     fileId:'CI_OWNER_PHOTO_'+i,uniqueId:'CI_OWNER_PHOTO_UNIQUE_'+i,
     bytes:bytes.length,duration:0,updateId:711+i})
   ownerSources.push(bytes)
 }
 const ownerMp4=await renderOwnerTelegramVideo(ownerInputs.reverse(),{
   executable,fetchPart:p=>ownerSources[p.updateId-700]})
 if(ownerMp4.length<1024||ownerMp4.toString('ascii',4,8)!=='ftyp')
   throw Error('VIDEO_11_AUDIO_3_PHOTO_NOT_MP4')
 const ownerTarget=join(dir,'owner-11-audio-3-photo.mp4')
 await writeFile(ownerTarget,ownerMp4)
 const ownerDecoded=spawnSync(binary,['-hide_banner','-i',ownerTarget,'-f','null','-'],{
   timeout:120000,encoding:'utf8',maxBuffer:128000})
 // Container duration can include up to the 24s final-still safety pad;
 // the decoded audio check below, not the MP4 end time, detects truncation.
 const containerMatch=ownerDecoded.stderr.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/)
 const containerSeconds=containerMatch
   ?Number(containerMatch[1])*3600+Number(containerMatch[2])*60+Number(containerMatch[3]):0
 if(ownerDecoded.status!==0||!/Video: h264/.test(ownerDecoded.stderr)||
   !/Audio: aac/.test(ownerDecoded.stderr)||containerSeconds<131||containerSeconds>160)
   throw Error('VIDEO_11_AUDIO_3_PHOTO_NOT_FULL_MP4 duration='+
     containerSeconds+' decoderStatus='+ownerDecoded.status+
     ' H264='+/Video: h264/.test(ownerDecoded.stderr)+
     ' AAC='+/Audio: aac/.test(ownerDecoded.stderr)+
     ' decoderTail='+String(ownerDecoded.stderr).slice(-400))
 // Decode *only* the concatenated soundtrack: the final-video duration
 // can be a little longer than the actual audio because of -shortest muxing.
 const audible=spawnSync(binary,['-hide_banner','-i',ownerTarget,
   '-map','0:a:0','-f','null','-'],{
     timeout:120000,encoding:'utf8',maxBuffer:128000})
 const timestamps=[...audible.stderr.matchAll(/time=\s*(\d+):(\d+):(\d+(?:\.\d+)?)/g)]
 const last=timestamps.at(-1)
 const audioSeconds=last?Number(last[1])*3600+Number(last[2])*60+Number(last[3]):0
 if(audible.status!==0||audioSeconds<131.5||audioSeconds>132.5)
   throw Error('VIDEO_11_AUDIO_3_PHOTO_SOUND_TRUNCATED')
 // The three images were sent after the audio, but must all appear over
 // the whole 132-second timeline rather than only at its end.
 function ownerPixelAt(seconds){
   const result=spawnSync(binary,['-hide_banner','-loglevel','error','-ss',String(seconds),
     '-i',ownerTarget,'-frames:v','1',
     '-vf','scale=1:1:flags=neighbor,format=rgb24','-f','rawvideo','pipe:1'],
     {timeout:20000,maxBuffer:4096})
   if(result.status!==0||result.stdout?.length!==3)throw Error('VIDEO_OWNER_FRAME_READ_FAILED')
   return [...result.stdout]
 }
 const first=ownerPixelAt(10),middle=ownerPixelAt(60),lastFrame=ownerPixelAt(100)
 if(!(first[2]>first[0]+60&&first[2]>first[1]+60&&
     middle[0]>middle[2]+60&&middle[1]>middle[2]+60&&
     lastFrame[0]>lastFrame[1]+60&&lastFrame[0]>lastFrame[2]+60))
   throw Error('VIDEO_OWNER_LATE_PHOTOS_NOT_SPREAD')
 console.log('MEDIA_11_AUDIO_3_PHOTO_FULL_SMOKE_PASSED audio_seconds='+audioSeconds+
   ' container_seconds='+containerSeconds+' MP4 bytes='+ownerMp4.length)
 console.log('MEDIA_15X15_SMOKE_PASSED 15 photos + 15 audio H264/AAC bytes='+fullMp4.length)
 console.log('MEDIA_SMOKE_PASSED ordered blue/yellow/red H264/AAC 1920x1080 MP4 bytes='+mp4.length)
}finally{await rm(dir,{force:true,recursive:true})}
