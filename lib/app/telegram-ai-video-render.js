/** Licensed real-MP4 montage for the opt-in Telegram AI queue.
 * No third-party generation, user photos, arbitrary input URLs, or public uploads.
 * One bounded 20s / 4-scene 360x640 MP4, held only in a private bucket.
 */
import 'server-only'
import {verifyRenderedMp4Metadata} from '../crm/telegram-mp4-metadata.mjs'
import {spawn} from 'node:child_process'
import {mkdtemp,readFile,rm,stat} from 'node:fs/promises'
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
async function inspectRenderedMp4(executable,file){
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
  child.on('close',()=>done(verifyRenderedMp4Metadata(stderr)))
 })
}
async function alreadyUploaded(storage,key){
 const {data,error}=await storage.download(key)
 if(error||!data||data.size<1024||data.size>BYTES_MAX)return null
 const b=Buffer.from(await data.slice(0,12).arrayBuffer())
 return b.toString('ascii',4,8)==='ftyp'?{provider:'supabase',key,bytes:data.size}:null
}
export async function renderTelegramAiVideo(config,job,{onStage=async()=>{}}={}){

 const goal=job.payload?.goal
 if(typeof goal!=='string'||goal.length<5||goal.length>600||
   !SAFE_ID.test(job.id)||job.payload.durationSeconds!==LENGTH_SECONDS)
  throw Error('AI_VIDEO_INPUT_INVALID')
 const storage=createPrivateStorageClient(config).storage.from(BUCKET)
 const key='ai-generated/'+job.id+'.mp4'
 // A lease crash after upload can resume without rendering a second film.
 const existing=await alreadyUploaded(storage,key)
 if(existing)return existing
 const dir=await mkdtemp(join(tmpdir(),'hh-dot-story-ai-'))
 try{
  const executable=await resolveOwnerVideoFfmpegPath(ffmpegStatic)
  const {candidates,selected}=shotsForGoal(goal)
  const planned=planTelegramAiVideo(goal)
  if(job.payload?.planVersion!==1||!Array.isArray(job.payload?.sceneIds)||
    job.payload.sceneIds.length!==4||job.payload.sceneIds.some((id,i)=>id!==planned.sceneIds[i]))
    throw Error('AI_VIDEO_UNAPPROVED_PLAN')
  const checked=await verifyStoryShotSources({
    scenes:candidates,sceneIds:selected.map(x=>x.id),tempDir:dir,executable,
    requireAspect:'portrait',
  })
  await onStage('sources_verified')
  const output=join(dir,'output.mp4')
  const sources=selected.map(x=>checked.verifiedFiles[x.id]?.absolutePath)
  if(sources.some(x=>typeof x!=='string'))throw Error('AI_VIDEO_SOURCE_MISSING')
  const filters=sources.map((_,i)=>`[${i}:v]fps=18,scale=360:640:force_original_aspect_ratio=decrease,pad=360:640:(ow-iw)/2:(oh-ih)/2,setsar=1,trim=duration=5,setpts=PTS-STARTPTS[v${i}]`)
  filters.push('[v0][v1][v2][v3]concat=n=4:v=1:a=0[video]')
  const args=['-hide_banner','-nostdin','-loglevel','error','-y','-threads','2',
   ...sources.flatMap(path=>['-stream_loop','-1','-i',path]),
   '-filter_complex',filters.join(';'),'-map','[video]',
   '-c:v','libx264','-preset','veryfast','-crf','30','-pix_fmt','yuv420p',
   '-t','20','-movflags','+faststart','-an',output]
  await onStage('composing')
  await exec(executable,args)
  // Validate the actual H.264 stream and its timing by decoding every frame.
  // ffmpeg runs without a shell or user-supplied flags; no ffprobe install.
  await exec(executable,['-hide_banner','-nostdin','-v','error','-xerror','-i',output,
    '-map','0:v:0','-f','null','-'])
  await inspectRenderedMp4(executable,output)
  const info=await stat(output)
  if(!info.isFile()||info.size<1024||info.size>BYTES_MAX)throw Error('AI_VIDEO_OUTPUT_LIMIT')
  const bytes=await readFile(output)
  if(bytes.toString('ascii',4,8)!=='ftyp')throw Error('AI_VIDEO_INVALID_MP4')
  await onStage('uploading')
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