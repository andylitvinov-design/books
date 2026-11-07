/** Licensed real-MP4 montage for the opt-in Telegram AI queue.
 * No third-party generation, user photos, arbitrary input URLs, or public uploads.
 * One bounded 20s / 4-scene 360x640 MP4, held only in a private bucket.
 */
import 'server-only'
import {verifyRenderedMp4Metadata} from '../crm/telegram-mp4-metadata.mjs'
import {aiPersonalVideoMasterKey} from '../crm/telegram-ai-master-key.mjs'
import {validTelegramVideoAudioMeta,videoAudioDurationTier,
 compileTelegramAiMuxArgs} from '../crm/telegram-ai-audio.mjs'
import {downloadTelegramAiAudio} from './telegram-ai-audio-download.js'
import {spawn} from 'node:child_process'
import {mkdtemp,readFile,writeFile,rm,stat} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import ffmpegStatic from 'ffmpeg-static'
import {createPrivateStorageClient} from '../clients/session-delivery-storage.js'
import {resolveOwnerVideoFfmpegPath} from '../practitioners/owner-telegram-video-render.mjs'
import {storySceneCandidates,verifyStoryShotSources} from '../mandala/dot-story-asset-runtime.mjs'
import {visualSignalsFromGoal} from '../mandala/video-executable-director.mjs'
import catalog from '../../data/video-catalog/scene-taxonomy.json' with {type:'json'}
import money from '../../public/videos/holistic-house/money-films-v1/manifest.json' with {type:'json'}
import film from '../../public/videos/holistic-house/film-collection-v2/manifest.json' with {type:'json'}
import stock from '../../data/video-catalog/free-stock-scenes.json' with {type:'json'}

const BUCKET='hh-client-private-media'
const BYTES_MAX=12_000_000
const LENGTH_SECONDS=20
const SAFE_ID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i
const normalize=s=>String(s||'').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)
function shotsForGoal(goal){
 const candidates=storySceneCandidates({catalog,moneyManifest:money,filmManifest:film,stockManifest:stock})
   .filter(x=>x.allowedAspects.includes('portrait'))
 const signals=visualSignalsFromGoal(goal).slice(0,3)
 const ranks=candidates.map((scene,index)=>{
  const tokens=new Set(normalize([scene.id,...scene.tags,...scene.motifs].join(' ')))
  const scores=signals.map((term,i)=>tokens.has(term)?100-i*15:0)
  return {scene,index,score:Math.max(0,...scores)}
 }).sort((a,b)=>b.score-a.score||a.index-b.index)
 const unique=new Set(),selected=[]
 for(const {scene} of ranks){
  const origin=scene.originMasterKeys?.join(';')||scene.id
  if(unique.has(origin))continue
  unique.add(origin);selected.push(scene)
  if(selected.length===4)break
 }
 if(selected.length!==4)throw Error('AI_VIDEO_NOT_ENOUGH_APPROVED_FOOTAGE')
 return {candidates,selected}
}
export function planTelegramAiVideo(goal){
 if(typeof goal!=='string'||goal.length<5||goal.length>600)throw Error('AI_VIDEO_GOAL_INVALID')
 const {selected}=shotsForGoal(goal)
 return {version:1,sceneIds:selected.map(scene=>scene.id),
    durationSeconds:LENGTH_SECONDS,aspect:'portrait'}
}
async function exec(exe,args){
 return new Promise((resolve,reject)=>{
  const child=spawn(exe,args,{shell:false,stdio:['ignore','ignore','pipe']})
  let finished=false,timer
  const done=error=>{
   if(finished)return
   finished=true;clearTimeout(timer)
   error?reject(error):resolve()
  }
  timer=setTimeout(()=>{child.kill('SIGKILL');done(Error('AI_VIDEO_RENDER_TIMEOUT'))},115000)
  child.stderr.on('data',()=>{})
  child.on('error',()=>done(Error('AI_VIDEO_RENDERER_UNAVAILABLE')))
  child.on('close',code=>done(code===0?null:Error('AI_VIDEO_RENDER_FAILED')))
 })
}
async function inspectRenderedMp4(executable,file,seconds=20,withAudio=false){
 return new Promise((resolve,reject)=>{
  const child=spawn(executable,['-hide_banner','-nostdin','-i',file],
    {shell:false,stdio:['ignore','ignore','pipe']})
  let stderr='',finished=false
  const done=ok=>{
   if(finished)return
   finished=true;clearTimeout(timeout)
   ok?resolve():reject(Error('AI_VIDEO_UNVERIFIED_CODEC_DURATION'))
  }
  const timeout=setTimeout(()=>{child.kill('SIGKILL');done(false)},12000)
  child.stderr.on('data',chunk=>{
   if(stderr.length<20000)stderr+=chunk.toString('utf8').slice(0,20000-stderr.length)
  })
  child.on('error',()=>done(false))
  child.on('close',()=>done(verifyRenderedMp4Metadata(stderr,seconds,withAudio)))
 })
}
// Probe actual decoded input before choosing output length. Telegram reports
// rounded seconds; if its claim would clip the voice, refuse instead.
async function probeOriginalAiAudio(executable,file,maxSeconds){
 return new Promise((resolve,reject)=>{
  const child=spawn(executable,['-hide_banner','-nostdin','-i',file],
   {shell:false,stdio:['ignore','ignore','pipe']})
  let stderr='',done=false
  const fail=()=>{if(done)return;done=true;clearTimeout(timer);
   reject(Error('AI_VIDEO_ORIGINAL_AUDIO_INVALID'))}
  const timer=setTimeout(()=>{child.kill('SIGKILL');fail()},12000)
  child.stderr.on('data',chunk=>{if(stderr.length<16000)
   stderr+=chunk.toString('utf8').slice(0,16000-stderr.length)})
  child.on('error',fail)
  child.on('close',()=>{
   if(done)return
   done=true;clearTimeout(timer)
   const match=stderr.match(/Duration:\s*(\d{2}):(\d{2}):(\d{2}(?:\.\d+)?)/)
   const seconds=match?Number(match[1])*3600+Number(match[2])*60+Number(match[3]):NaN
   if(!/Audio:\s*(?:opus|aac|mp3|pcm_s16le|pcm_s24le|pcm_f32le)\b/i.test(stderr)||
      !Number.isFinite(seconds)||seconds<0.5||seconds>60||
      seconds>maxSeconds-0.015)reject(Error('AI_VIDEO_ORIGINAL_AUDIO_LENGTH_INVALID'))
   else resolve(seconds)
  })
 })
}
async function alreadyUploaded(storage,key){
 const {data,error}=await storage.download(key)
 if(error||!data||data.size<1024||data.size>BYTES_MAX)return null
 const b=Buffer.from(await data.slice(0,12).arrayBuffer())
 return b.toString('ascii',4,8)==='ftyp'?{provider:'supabase',key,bytes:data.size}:null
}
export async function renderTelegramAiVideo(config,job,{onStage=async()=>true,env=process.env}={}){

 const goal=job.payload?.goal,audio=job.payload?.audio||null
 const seconds=audio?videoAudioDurationTier(audio.seconds):LENGTH_SECONDS
 if(typeof goal!=='string'||goal.length<5||goal.length>600||
   !SAFE_ID.test(job.id)||(audio&&!validTelegramVideoAudioMeta(audio))||
   !seconds||job.payload.durationSeconds!==seconds||
   job.payload.planVersion!==(audio?2:1))
  throw Error('AI_VIDEO_INPUT_INVALID')
 const storage=createPrivateStorageClient(config).storage.from(BUCKET)
 // The canonical, account-owned personal master is private and consent-gated.
 const key=aiPersonalVideoMasterKey(job.payload?.accountId,job.id)
 // A lease crash after upload can resume without rendering a second film.
 const existing=await alreadyUploaded(storage,key)
 if(existing)return existing
 const dir=await mkdtemp(join(tmpdir(),'hh-dot-story-ai-'))
 try{
  const executable=await resolveOwnerVideoFfmpegPath(ffmpegStatic)
  let audioFile=null
  if(audio){
   // Worker has already verified the leased video job, account-linked bot
   // and current versioned consent before this private network retrieval.
   const downloaded=await downloadTelegramAiAudio(audio,{
     token:env.HH_CRM_MSG_TELEGRAM_TOKEN})
   audioFile=join(dir,'original.'+downloaded.extension)
   await writeFile(audioFile,downloaded.bytes,{mode:0o600})
   await probeOriginalAiAudio(executable,audioFile,seconds)
  }
  const {candidates,selected}=shotsForGoal(goal)
  const planned=planTelegramAiVideo(goal)
  if(!Array.isArray(job.payload?.sceneIds)||
    job.payload.sceneIds.length!==4||job.payload.sceneIds.some((id,i)=>id!==planned.sceneIds[i]))
    throw Error('AI_VIDEO_UNAPPROVED_PLAN')
  const checked=await verifyStoryShotSources({
    scenes:candidates,sceneIds:selected.map(x=>x.id),tempDir:dir,executable,
    requireAspect:'portrait',
  })
  if(await onStage('sources_verified')!==true)throw Error('AI_VIDEO_LEASE_OR_CONSENT_REVOKED')
  const output=join(dir,'output.mp4')
  const sources=selected.map(x=>checked.verifiedFiles[x.id]?.absolutePath)
  if(sources.some(x=>typeof x!=='string'))throw Error('AI_VIDEO_SOURCE_MISSING')
  const args=compileTelegramAiMuxArgs({
   sources,audioPath:audioFile,durationSeconds:seconds,output})
  if(await onStage('composing')!==true)
   throw Error('AI_VIDEO_LEASE_OR_CONSENT_REVOKED')
  await exec(executable,args)
  // Validate the actual H.264 stream and its timing by decoding every frame.
  // ffmpeg runs without a shell or user-supplied flags; no ffprobe install.
  await exec(executable,['-hide_banner','-nostdin','-v','error','-xerror','-i',output,
    '-map','0:v:0',...(audio?['-map','0:a:0']:[]),'-f','null','-'])
  await inspectRenderedMp4(executable,output,seconds,Boolean(audio))
  const info=await stat(output)
  if(!info.isFile()||info.size<1024||info.size>BYTES_MAX)throw Error('AI_VIDEO_OUTPUT_LIMIT')
  const bytes=await readFile(output)
  if(bytes.toString('ascii',4,8)!=='ftyp')throw Error('AI_VIDEO_INVALID_MP4')
  if(await onStage('uploading')!==true)throw Error('AI_VIDEO_LEASE_OR_CONSENT_REVOKED')
  const {error}=await storage.upload(key,new Blob([bytes],{type:'video/mp4'}),{
   contentType:'video/mp4',cacheControl:'3600',upsert:false})
  if(error){
   const resumed=await alreadyUploaded(storage,key)
   if(resumed)return resumed
   throw Error('AI_VIDEO_PRIVATE_UPLOAD_FAILED')
  }
  return {provider:'supabase',key,bytes:bytes.length}
 }finally{
  await rm(dir,{recursive:true,force:true}).catch(()=>{})
 }
}