// Mirrors two ALREADY COMPLETED owner-approved HeyGen Video 1 clips.
// Third approved/no-speech edited master is committed as a first-party MP4.
// No API generation, runtime request, new provider, scheduled job or credits.
import {createRequire} from 'node:module'
import {spawnSync} from 'node:child_process'
import {access,mkdir,readFile,writeFile,rename,rm} from 'node:fs/promises'
import {constants} from 'node:fs'
import {dirname,join,resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {samirMotionFilename} from '../lib/coaching/samir-motion.mjs'

const production=process.env.VERCEL_ENV==='production'||process.env.HH_COACH_NATURAL_BUILD==='1'
if(!production){
  console.log('HH_SAMIR_MOTION_SKIP_NON_PROD')
}else{
  const account='29b72be65e0e493f9570e7a40a904b91'
  const prefix='https://resource2.heygen.ai/videos/'+account+'/'+account+'/'
  // HeyGen video records: b984e6733fa94bcf9b13713cd1a88676,
  // 344cf059da0149dda3e9d68f65d4e185, both verified 8s @ 1080x1350.
  const takes=Object.freeze({
    idle:'01a206c9-cc1c-7733-8158-c08af5cce48d',
    listening:'01a206d5-2bdc-738d-b0b9-37361376582e',
  })
  const names=Object.keys(takes)
  const require=createRequire(import.meta.url)
  const ffmpeg=join(dirname(require.resolve('ffmpeg-static')),
    process.platform==='win32'?'ffmpeg.exe':'ffmpeg')
  await access(ffmpeg,constants.X_OK)
  const root=resolve(fileURLToPath(new URL('../public/images/holistic-house/my-coach-motion/',import.meta.url)))
  await mkdir(root,{recursive:true})
  const valid=bytes=>bytes?.length>10000&&bytes.length<4500000&&
    bytes.toString('ascii',4,8)==='ftyp'&&
    bytes.includes(Buffer.from('moov'))&&bytes.includes(Buffer.from('avc1'))&&
    !bytes.includes(Buffer.from('soun'))
  async function prepare(take,id){
    const filename=samirMotionFilename(take)
    if(!filename||take==='encourage')throw Error('Invalid Samir source take')
    const file=resolve(root,filename)
    const input=file+'.source.mp4',output=file+'.new.mp4'
    try{
      try{if(valid(await readFile(file)))return true}catch{}
      const url=new URL(prefix+id+'.mp4')
      if(url.protocol!=='https:'||url.hostname!=='resource2.heygen.ai')
        throw Error('Source host is not allowlisted')
      const response=await fetch(url,{redirect:'error',
        headers:{Accept:'video/mp4', 'User-Agent':'HolisticHouseSamirFirstPartyVideo/1.0'},
        signal:AbortSignal.timeout(25000)})
      if(!response.ok)throw Error('Source HTTP '+response.status)
      const mime=response.headers.get('content-type')||''
      if(mime&&!/(?:video\/mp4|application\/octet-stream)/i.test(mime))throw Error('Unexpected media MIME')
      if(Number(response.headers.get('content-length')||0)>14000000)throw Error('Source too large')
      let count=0;const chunks=[]
      for await(const chunk of response.body){
        count+=chunk.byteLength
        if(count>14000000)throw Error('Source byte budget exceeded')
        chunks.push(Buffer.from(chunk))
      }
      const source=Buffer.concat(chunks)
      if(source.toString('ascii',4,8)!=='ftyp')throw Error('Not MP4')
      await writeFile(input,source)
      const flags=['-hide_banner','-loglevel','error','-y','-i',input,'-t','8',
        '-vf','fps=24,scale=768:960:flags=lanczos','-an',
        '-c:v','libx264','-preset','veryfast','-crf','29',
        '-pix_fmt','yuv420p','-profile:v','main','-level','3.1',
        '-movflags','+faststart',output]
      const job=spawnSync(ffmpeg,flags,{encoding:'utf8',timeout:55000,maxBuffer:131072})
      if(job.error||job.status!==0)throw Error('FFmpeg failed: '+String(job.stderr||job.error?.message).slice(0,120))
      if(!valid(await readFile(output)))throw Error('Output H264/audio/size validation failed')
      await rename(output,file)
      return true
    }catch(error){
      console.warn('HH_SAMIR_MOTION_FALLBACK '+take+' '+error.message)
      return false
    }finally{
      await rm(input,{force:true}).catch(()=>{})
      await rm(output,{force:true}).catch(()=>{})
    }
  }
  // The encouraging master has already been safely edited and stored
  // locally in this repo; never fetch the untrimmed, mouth-moving version.
  const encourage=await readFile(resolve(root,samirMotionFilename('encourage')))
  if(!valid(encourage))throw Error('Approved silent Samir encouragement MP4 missing or invalid')
  const results=[]
  for(const take of names)results.push(await prepare(take,takes[take]))
  console.log('HH_SAMIR_MOTION '+results.filter(Boolean).length+'/2 owner-approved HeyGen originals mirrored; encourage=first-party edited master')
}

// Always produce a versioned opening still from the actual approved video.
// Production uses the first frame of the same idle MP4 that plays first.
// The committed approved encouraging master is the offline/non-production
// fallback; never show the legacy GIF poster while the MP4 buffers.
const posterRoot=resolve(fileURLToPath(new URL('../public/images/holistic-house/my-coach-motion/',import.meta.url)))
const posterRequire=createRequire(import.meta.url)
const posterFfmpeg=join(dirname(posterRequire.resolve('ffmpeg-static')),process.platform==='win32'?'ffmpeg.exe':'ffmpeg')
const openingPoster=resolve(posterRoot,'genie-natural-opening-v2.webp')
const temporaryPoster=openingPoster+'.tmp.webp'
const temporaryFrame=openingPoster+'.tmp.png'
const approvedOpeningSources=[samirMotionFilename('idle'),samirMotionFilename('encourage')]
let openingReady=false
try{
  for(const name of approvedOpeningSources){
    const input=resolve(posterRoot,name)
    try{await access(input,constants.R_OK)}catch{continue}
    // ffmpeg-static builds differ in their WebP encoder availability, especially
    // on macOS. Decode the approved frame to PNG, then encode with installed sharp.
    const frame=spawnSync(posterFfmpeg,['-hide_banner','-loglevel','error','-y','-i',input,'-frames:v','1','-c:v','png','-threads','1',temporaryFrame],{encoding:'utf8',timeout:15000,maxBuffer:131072})
    if(frame.error||frame.status!==0){console.warn('HH_SAMIR_FRAME_DECODE_FAILED '+name+' '+String(frame.stderr||frame.error?.message||'').slice(0,160));continue}
    const {default:sharp}=await import('sharp')
    await sharp(temporaryFrame).webp({quality:90}).toFile(temporaryPoster)
    const bytes=await readFile(temporaryPoster)
    if(bytes.length<1000||bytes.toString('ascii',0,4)!=='RIFF'||bytes.toString('ascii',8,12)!=='WEBP')continue
    await rename(temporaryPoster,openingPoster)
    console.log('HH_SAMIR_OPENING_POSTER '+name)
    openingReady=true
    break
  }
  if(!openingReady)throw Error('No approved Samir MP4 opening frame available')
}finally{
  await rm(temporaryPoster,{force:true}).catch(()=>{})
  await rm(temporaryFrame,{force:true}).catch(()=>{})
}
