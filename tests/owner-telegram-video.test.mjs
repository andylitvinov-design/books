import test from 'node:test'
// Run the new metadata contract suite inside the existing owner-video CI command.
import './owner-telegram-youtube-metadata.test.mjs'
import assert from 'node:assert/strict'
import {readFileSync,mkdtempSync,mkdirSync,writeFileSync,chmodSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {parseOwnerVideoUpdate,parseVideoCutSeconds,safeVideoParts,ownerVideoStartMessage,ownerVideoRenderingMessage,ownerVideoPreviewButtons,
  VIDEO_IMAGE_LIMIT,VIDEO_AUDIO_LIMIT,VIDEO_MAX_INPUT_BYTES,VIDEO_MAX_SECONDS,VIDEO_RU_CHANNEL_ID,
  ownerVideoLimitReason,ownerVideoConfirmationButtons}
 from '../lib/practitioners/owner-telegram-video-model.mjs'
import {photoTimeline,videoRenderArguments,trimOwnerTelegramVideo,resolveOwnerVideoFfmpegPath} from '../lib/practitioners/owner-telegram-video-render.mjs'
import {ownerVideoOauthConfig,ownerVideoOauthConfigured,ownerVideoOauthStateMatches} from '../lib/practitioners/owner-telegram-video-oauth-config.mjs'
import {refreshYoutubeAccess,verifyYoutubeRuOwner,uploadUnlistedRu,verifyUploadedRu,waitForUploadedRu}
 from '../lib/practitioners/owner-telegram-video-youtube.mjs'
import {ownerVideoIdValid,ownerVideoMediaPath,ownerVideoCutPath,ownerVideoCutId,ownerVideoByteRange}
 from '../lib/practitioners/owner-telegram-video-playback.mjs'
import {ownerAudioHelpMessage,ownerAudioMaterialsMessage} from '../lib/practitioners/owner-telegram-audio-model.mjs'
import {OWNER_AI_COMMANDS,ownerScopedTelegramCommands} from '../lib/practitioners/owner-ai-telegram.mjs'

const TIME=1793001600000
const BOT='holistichouse_bot'
const privateBase={type:'private',id:123456}
const from={id:123456,is_bot:false}
const media=(file,attr)=>({update_id:1001,message:{date:TIME/1000,chat:privateBase,
  from,message_id:42,[attr]:file}})
const photo={file_id:'PHOTO_PHOTO_555',file_unique_id:'UNIQUE_PHOTO_555',file_size:900}
const audio={file_id:'AUDIO_AUDIO_555',file_unique_id:'UNIQUE_AUDIO_555',file_size:2000,
  mime_type:'audio/mpeg',duration:4}
// Each Telegram update gets its own sender object: the rejected-user
// negative test must not mutate the owner identity for later regressions.
const callback=(data)=>({update_id:1200,callback_query:{id:'callback-1234',data,from:{...from},
  message:{chat:privateBase,from:{is_bot:true,username:BOT}}}})
const parsed=(update)=>parseOwnerVideoUpdate(update,{now:TIME,botUsername:BOT})
function part(kind,index,options={}){
 return {kind,fileId:'ASSET_PART_'+index,uniqueId:'UNIQUE_PART_'+index,
   mime:kind==='photo'?'image/jpeg':'audio/mpeg',ext:kind==='photo'?'jpg':'mp3',
   bytes:kind==='photo'?1600:3000,duration:kind==='photo'?0:3,
   updateId:index+100,messageId:index+100,localPath:'/tmp/part'+index+(kind==='photo'?'.jpg':'.mp3'),...options}
}
test('owner-only Telegram video deep link and explicit private preview resend command',()=>{
 const update={update_id:1302,message:{date:TIME/1000,chat:privateBase,from,
   message_id:56,text:'/start video'}}
 assert.equal(parsed(update)?.action,'start')
 assert.equal(parsed({...update,message:{...update.message,text:'/video_retry'}})?.action,'retry')
 assert.equal(parsed({...update,message:{...update.message,text:'/video_status'}})?.action,'status')
 assert.equal(parsed(callback('hh-video:retry'))?.action,'retry')
 assert.equal(parsed({...update,message:{...update.message,text:'/start@wrongbot video'}}),null)
 const group={...update,message:{...update.message,chat:{...privateBase,type:'group'}}}
 assert.equal(parsed(group),null)
})
test('Dot confirms video processing start in Toronto and exposes in-progress status',()=>{
 const totals={images:2,audios:3,seconds:108}
 const started=ownerVideoRenderingMessage(totals,'2026-10-27T19:36:14.000Z')
 assert.match(started,/Сборка видео началась в 15:36 \(Торонто\)/)
 assert.match(started,/2 фото.*3 аудио.*108 сек/)
 assert.match(started,/приватный MP4/)
 assert.match(started,/\/video_status/)
 assert.match(started,/YouTube ничего не загружаю/)
 assert.ok(started.includes('\n📷 '),'receipt must contain an actual newline')
 assert.match(ownerVideoRenderingMessage(totals,'2026-12-27T19:36:14.000Z'),/14:36 \(Торонто\)/)
 assert.doesNotMatch(ownerVideoRenderingMessage(totals,null),/Торонто/)
 const service=readFileSync(new URL('../lib/practitioners/owner-telegram-video-service.js',import.meta.url),'utf8')
 assert.match(service,/where practitioner_id=\$1 returning processing_started_at/)
 assert.match(service,/await ownerMessage\(owner,ownerVideoRenderingMessage\(batch.totals,batch.startedAt\)/)
 assert.match(service,/background:\(\)=>buildVideo\(config,batch,owner,fetcher\)/)
 assert.match(service,/rendering\?ownerVideoRenderingMessage\(rendering,row.processing_started_at\)/)
})

test('photo and voice/audio messages attach only in an explicit owner video session',()=>{
 assert.equal(parsed(media([photo],'photo')).action,'media')
 assert.equal(parsed(media([photo],'photo')).part.kind,'photo')
 assert.equal(parsed(media(audio,'audio')).part.kind,'audio')
 assert.equal(parsed(media({...audio,mime_type:'audio/ogg'},'voice')).part.mime,'audio/ogg')
 const doc=media({...photo,mime_type:'image/png',file_name:'a.png'},'document')
 assert.equal(parsed(doc).part.ext,'png')
 const group=media([photo],'photo');group.message.chat={...privateBase,type:'group'}
 assert.equal(parsed(group),null)
 const foreign=media(audio,'audio');foreign.message.from={id:9876,is_bot:false}
 assert.equal(parsed(foreign),null)
 const stale=media(audio,'audio');stale.message.date-=3000
 assert.equal(parsed(stale),null)
 assert.equal(parsed({update_id:1,message:{...media(audio,'audio').message,
  text:'/video',audio:undefined}}).action,'start')
})
test('callback provenance, exact bot and locked publication UUID',()=>{
 const fixed='b6e8526e-c251-4dd5-a9ca-2886c430f912'
 assert.equal(parsed(callback('hh-video:start')).action,'start')
 assert.equal(parsed(callback('hh-video:done')).action,'done')
 assert.equal(parsed(callback('hh-video:status')).action,'status')
 assert.equal(parsed(callback('hh-video:publish:'+fixed)).jobId,fixed)
 const manifestButton=ownerVideoConfirmationButtons(fixed,966890850,14).inline_keyboard[0][0]
 assert.match(manifestButton.text,/проверенный набор/)
 assert.ok(manifestButton.callback_data.length<=64)
 assert.deepEqual(
   (({action,jobId,itemsUpdateId,itemCount})=>({action,jobId,itemsUpdateId,itemCount}))(parsed(callback(manifestButton.callback_data))),
   {action:'confirm',jobId:fixed,itemsUpdateId:966890850,itemCount:14})
 // A late lower-ID Telegram update is accepted while the high-water ID stays
 // unchanged; a manifest with 14 sources must not authorize 15.
 assert.equal(parsed(callback(ownerVideoConfirmationButtons(fixed,966890850,15)
   .inline_keyboard[0][0].callback_data))?.itemCount,15)
 assert.ok(ownerVideoConfirmationButtons(fixed,Number.MAX_SAFE_INTEGER,30)
   .inline_keyboard[0][0].callback_data.length<=64)
 assert.throws(()=>ownerVideoConfirmationButtons(fixed,966890850,31),/INVALID_VIDEO_JOB/)
 assert.equal(parsed(callback('hh-video:c:'+fixed+':X')),null)
 assert.equal(parsed(callback('hh-video:publish:bad')),null)
 const spoof=callback('hh-video:done');spoof.callback_query.message.from.username='Attacker_bot'
 assert.equal(parsed(spoof),null)
 const unpaired=callback('hh-video:done');unpaired.callback_query.from.id=555
 assert.equal(parsed(unpaired),null)
 assert.equal(from.id,privateBase.id,'negative user fixture cannot mutate owner for subsequent tests')
 assert.match(ownerVideoStartMessage().text,/сборку|собрать/i)
 assert.match(ownerVideoStartMessage().text,/1–15 фотографий и 1–15/)
 assert.ok(ownerVideoStartMessage().reply_markup.inline_keyboard.flat().some(button=>button.callback_data==='hh-video:status'))
 assert.equal(ownerVideoPreviewButtons(fixed).inline_keyboard[1][0].callback_data,'hh-video:publish:'+fixed)
})
test('strict ordered safe source limits and anti-duplication',()=>{
 const items=[part('photo',0),part('audio',1)]
 assert.deepEqual(safeVideoParts(items),{images:1,audios:1,bytes:4600,seconds:3})
 assert.equal(VIDEO_IMAGE_LIMIT,15)
 assert.equal(VIDEO_AUDIO_LIMIT,15)
 assert.equal(safeVideoParts([...items,items[1]]),null)
 assert.equal(safeVideoParts([...Array.from({length:16},(_,i)=>part('photo',i)),part('audio',16)]),null)
 assert.equal(safeVideoParts([part('audio',0,{duration:1801})]),null)
 assert.equal(safeVideoParts([part('photo',0,{mime:'audio/mpeg'})]),null)
 assert.equal(safeVideoParts([part('photo',0,{bytes:6e6})]),null)
})

test('production database item constraint is widened to 30 without weakening RLS',()=>{
 const sql=readFileSync(new URL('../supabase/migrations/20261027174939_hh_owner_video_15_photo_15_audio_20261027.sql',import.meta.url),'utf8')
 assert.match(sql,/drop constraint telegram_owner_video_jobs_items_check/)
 assert.match(sql,/jsonb_array_length\(items\) <= 30/)
 assert.doesNotMatch(sql,/disable row level security|drop table|grant\s+.*\s+to\s+anon/i)
})

test('serverless bundled FFmpeg path falls back to executable in traced node_modules only',async()=>{
 const temp=mkdtempSync(join(tmpdir(),'hh-video-exec-'))
 try{
   const folder=join(temp,'node_modules','ffmpeg-static')
   mkdirSync(folder,{recursive:true})
   const executable=join(folder,'ffmpeg')
   writeFileSync(executable,'#!/bin/sh\\nexit 0\\n',{mode:0o755})
   assert.equal(await resolveOwnerVideoFfmpegPath('/invalid/chunks/ffmpeg',temp),executable)
   assert.equal(await resolveOwnerVideoFfmpegPath(executable,temp),executable)
   chmodSync(executable,0o644)
   await assert.rejects(()=>resolveOwnerVideoFfmpegPath('/invalid/chunks/ffmpeg',temp),/VIDEO_RENDERER_UNAVAILABLE/)
 }finally{rmSync(temp,{force:true,recursive:true})}
})

test('Vercel npm installation permits only the pinned ffmpeg binary downloader',()=>{
 const config=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'))
 assert.equal(config.dependencies['ffmpeg-static'],'5.3.0')
 assert.equal(config.allowScripts['ffmpeg-static@5.3.0'],true)
 assert.equal(Object.keys(config.allowScripts).length,1)
 assert.equal(config.allowScripts['ffmpeg-static'],undefined)
 assert.equal(config.allowScripts['unrs-resolver@1.11.1'],undefined)
 const next=readFileSync(new URL('../next.config.ts',import.meta.url),'utf8')
 assert.match(next,/\/api\/app\/notification-channels\/telegram\/webhook/)
 assert.match(next,/node_modules\/ffmpeg-static\/ffmpeg/)
})

test('15 photographs and 15 audio pieces are allowed and compose in their real mixed order',()=>{
 const interleaved=Array.from({length:15},(_,i)=>[
   part('photo',i*2),part('audio',i*2+1,{duration:2})
 ]).flat()
 const totals=safeVideoParts(interleaved)
 assert.deepEqual(totals,{images:15,audios:15,bytes:69000,seconds:30})
 assert.equal(VIDEO_MAX_INPUT_BYTES,90_000_000)
 assert.equal(VIDEO_MAX_SECONDS,1800)
 assert.equal(safeVideoParts([...interleaved,part('photo',30)]),null)
 assert.equal(safeVideoParts([...interleaved,part('audio',30)]),null)
 assert.equal(safeVideoParts(interleaved.map((item,i)=>
   i===1?{...item,duration:1800}:item)),null)
 assert.equal(safeVideoParts(interleaved.map(item=>
   item.kind==='photo'?{...item,bytes:5_000_000}:{...item,bytes:1_100_000})),null)
 assert.equal(safeVideoParts(interleaved.map(item=>
   item.kind==='photo'?{...item,bytes:1_250_000}:item))?.images,15)
 const mixed=[...interleaved].reverse()
 const plan=photoTimeline(mixed)
 assert.equal(plan.length,15)
 assert.deepEqual(plan.map(x=>x.startMs),[0,1000,...Array.from({length:13},(_,i)=>(i+1)*2000)])
 assert.deepEqual(plan.map(x=>x.durationMs),[1000,1000,...Array(12).fill(2000),4000])
 const args=videoRenderArguments(mixed,'/tmp/full-15-15.mp4')
 assert.equal(args.filter(x=>x==='-i').length,30)
 assert.ok(args.some(x=>x.includes('concat=n=15:v=1')))
 assert.ok(args.some(x=>x.includes('concat=n=15:v=0:a=1')))
 assert.ok(args.includes('libx264')&&args.includes('aac'))
})

test('full owner batch: 11 audio + 3 late photos exceeds old 120s cap, keeps all sources',()=>{
 const audios=Array.from({length:11},(_,i)=>part('audio',i,{
   duration:30,bytes:3_000_000
 }))
 const photos=Array.from({length:3},(_,i)=>part('photo',i+11,{
   bytes:500_000
 }))
 const files=[...audios,...photos]
 assert.deepEqual(safeVideoParts(files),{
   images:3,audios:11,bytes:34_500_000,seconds:330
 })
 const plan=photoTimeline([...files].reverse())
 assert.deepEqual(plan.map(p=>p.startMs),[0,270000,300000])
 assert.deepEqual(plan.map(p=>p.durationMs),[270000,30000,30000])
 const args=videoRenderArguments([...files].reverse(),'/tmp/full-owner-batch.mp4')
 assert.equal(args.filter(x=>x==='-i').length,14)
 assert.ok(args.some(x=>x.includes('concat=n=3:v=1')))
 assert.ok(args.some(x=>x.includes('concat=n=11:v=0:a=1')))
 assert.ok(args.includes('-shortest'))
 assert.deepEqual(args.filter((v,i)=>args[i-1]==='-t'),['270.000','30.000','54.000'])
 assert.ok(args.includes('-r')&&args.includes('2'))
 assert.equal(ownerVideoLimitReason(files,part('audio',20)), 'invalid')
 const maxImages=Array.from({length:15},(_,i)=>part('photo',i))
 assert.equal(ownerVideoLimitReason(maxImages,part('photo',16)),'photos')
 const maxAudio=Array.from({length:15},(_,i)=>part('audio',i))
 assert.equal(ownerVideoLimitReason(maxAudio,part('audio',16)),'audios')
 assert.equal(ownerVideoLimitReason(files,part('audio',20,{duration:1600})),'seconds')
 assert.equal(ownerVideoLimitReason(files,part('audio',20,{duration:30,bytes:57_000_000})),'bytes')
 const service=readFileSync(new URL('../lib/practitioners/owner-telegram-video-service.js',import.meta.url),'utf8')
 assert.match(service,/if\(event.action==='done'\)\{[\s\S]*await renderManifest\(config\)/)
 assert.match(service,/if\(event.action==='confirm'\)\{[\s\S]*await reserveRender\(config,event\)/)
 assert.match(service,/event.itemsUpdateId!==Number\(row.last_update_id\)/)
 assert.match(service,/event.itemCount!==row.items.length/)
 const webhook=readFileSync(new URL('../app/api/app/notification-channels/telegram/webhook/route.js',import.meta.url),'utf8')
 assert.match(webhook,/export const maxDuration=300/)
})
test('FFmpeg command arguments use no shell and encode a single bounded 16:9 stream',()=>{
 const args=videoRenderArguments([part('photo',0),part('photo',1),part('audio',2)],'/tmp/output.mp4')
 assert.equal(args.at(-1),'/tmp/output.mp4')
 assert.ok(args.includes('libx264'))
 assert.ok(args.includes('aac'))
 assert.ok(args.some(v=>v.includes('concat=n=2:v=1')))
 assert.ok(args.some(v=>v.includes('setsar=1,scale=1920:1080:force_original_aspect_ratio=decrease')))
 assert.ok(args.includes('-aspect:v')&&args.includes('16:9'))
 const service=readFileSync(new URL('../lib/practitioners/owner-telegram-video-service.js',import.meta.url),'utf8')
 assert.match(service,/form\.set\('width','1920'\)/)
 assert.match(service,/form\.set\('height','1080'\)/)
 assert.ok(!args.includes('-c:v copy'))
 assert.throws(()=>videoRenderArguments([part('photo',0)],'/tmp/output.mp4'),/INVALID_COMPOSITION/)
})
test('photo positions follow cumulative audio durations in mixed Telegram message order',()=>{
 const updates=[part('photo',0),part('audio',1,{duration:4}),part('photo',2),
   part('audio',3,{duration:3}),part('photo',4),part('audio',5,{duration:2})]
 const unordered=[updates[4],updates[5],updates[1],updates[3],updates[2],updates[0]]
 const plan=photoTimeline(unordered)
 assert.deepEqual(plan.map(x=>[x.part.updateId,x.startMs,x.durationMs]),[
   [100,0,2000],[102,2000,2000],[104,4000,5000]
 ])
 const args=videoRenderArguments(unordered,'/tmp/output.mp4')
 assert.deepEqual(args.filter((v,i)=>args[i-1]==='-t'),['2.000','2.000','13.000'])
 assert.equal(plan.reduce((sum,p)=>sum+p.durationMs,0),9000)
})
test('consecutive photos split the preceding audio segment without reordering',()=>{
 const plan=photoTimeline([part('photo',0),part('audio',1,{duration:3}),
   part('photo',2),part('photo',3),part('audio',4,{duration:4})])
 assert.deepEqual(plan.map(x=>[x.startMs,x.durationMs]),[
   [0,1000],[1000,1000],[2000,5000]
 ])
})
test('photos sent after audio cover their preceding audio, never append an outro',()=>{
 const seq=[part('photo',0),part('audio',1,{duration:8}),part('photo',2)]
 assert.deepEqual(photoTimeline(seq).map(x=>[x.startMs,x.durationMs]),[
   [0,4000],[4000,4000]
 ])
 const ending=[part('audio',0,{duration:2}),part('photo',1),part('photo',2)]
 assert.deepEqual(photoTimeline(ending).map(x=>[x.startMs,x.durationMs]),[
   [0,1000],[1000,1000]
 ])
 const short=[...Array.from({length:6},(_,i)=>part('photo',i)),
   part('audio',6,{duration:1})]
 const veryShort=photoTimeline(short)
 assert.equal(veryShort.reduce((sum,p)=>sum+p.durationMs,0),1000)
 assert.ok(veryShort.every(p=>p.durationMs>=160))
 assert.equal(veryShort[0].startMs,0)
 assert.throws(()=>photoTimeline([part('photo',0)]),/INVALID_COMPOSITION/)
})
test('optional Google OAuth is isolated from the standalone phone uploader',()=>{
 const unset={}
 const valid={HH_OWNER_VIDEO_GOOGLE_CLIENT_ID:'000000000000000000000000.apps.googleusercontent.com',
   HH_OWNER_VIDEO_GOOGLE_CLIENT_SECRET:'valid-local-test-only'}
 assert.equal(ownerVideoOauthConfigured(unset),false)
 assert.equal(ownerVideoOauthConfig(unset),null)
 assert.equal(ownerVideoOauthConfigured(valid),true)
 assert.equal(ownerVideoOauthConfig(valid).clientSecret,'valid-local-test-only')
 assert.equal(ownerVideoOauthConfigured({...valid,HH_OWNER_VIDEO_GOOGLE_CLIENT_ID:'bad'}),false)
 const page=readFileSync(new URL('../app/admin/youtube-upload/page.js',import.meta.url),'utf8')
 assert.doesNotMatch(page,/^import .*owner-telegram-video-service/m)
 assert.match(page,/if\(telegramVideoConfigured\)try\{[\s\S]*await Promise\.all/)
 const service=readFileSync(new URL('../lib/practitioners/owner-telegram-video-service.js',import.meta.url),'utf8')
 assert.match(service,/const oauthConfig=ownerVideoOauthConfig/)
})
test('Google callback accepts only owner-issued sealed PKCE state after cross-site redirect',()=>{
 const state='s'.repeat(43),verifier='v'.repeat(43)
 const valid={state,verifier,time:TIME}
 assert.equal(ownerVideoOauthStateMatches(valid,state,TIME),true)
 assert.equal(ownerVideoOauthStateMatches(valid,state,TIME+600000),true)
 assert.equal(ownerVideoOauthStateMatches(valid,state,TIME+600001),false)
 assert.equal(ownerVideoOauthStateMatches(valid,state,TIME-1),false)
 assert.equal(ownerVideoOauthStateMatches(valid,'x'.repeat(43),TIME),false)
 assert.equal(ownerVideoOauthStateMatches({...valid,verifier:'short'},state,TIME),false)
 assert.equal(ownerVideoOauthStateMatches({...valid,state:'short'},state,TIME),false)
 assert.equal(ownerVideoOauthStateMatches(null,state,TIME),false)
 const start=readFileSync(new URL('../app/api/admin/telegram-video/youtube/start/route.js',import.meta.url),'utf8')
 const cb=readFileSync(new URL('../app/api/admin/telegram-video/youtube/callback/route.js',import.meta.url),'utf8')
 assert.match(start,/if\(!await requireAdminRequest\(\)\)/)
 assert.match(start,/sameSite:'lax'/)
 assert.match(cb,/openSealed\(cookie,CONTEXT,config\)/)
 assert.match(cb,/ownerVideoOauthStateMatches\(sealed,state\)/)
 assert.match(cb,/verifyYoutubeRuOwner\(token.access_token\)/)
 assert.doesNotMatch(cb,/requireAdminRequest\(/)
 assert.match(cb,/maxAge:0/)
})
test('Google RU ownership and Unlisted are checked before and after upload',async()=>{
 const calls=[];let begin=0,uploaded=0
 const fetcher=async(url,opt={})=>{
  calls.push({url:String(url),method:opt.method||'GET'})
  if(String(url).includes('/channels?'))return Response.json({items:[{id:VIDEO_RU_CHANNEL_ID}]})
  if(opt.method==='PUT')return Response.json({id:'Yt123456abc'})
  if(String(url).includes('/upload/youtube/v3/videos?'))return new Response('',{
    status:200,headers:{location:'https://www.googleapis.com/upload/youtube/v3/videos?upload_id=abc'}})
  if(String(url).includes('/videos?'))return Response.json({items:[{
    id:'Yt123456abc',snippet:{channelId:VIDEO_RU_CHANNEL_ID,title:'Тест'},
    status:{privacyStatus:'unlisted',uploadStatus:'processed'}
  }]})
  throw Error('Unexpected URL')
 }
 const buf=Buffer.alloc(2048);buf.write('ftyp',4)
 const data=await uploadUnlistedRu(buf,'access'.repeat(8),{
  fetcher,onBeginUpload:()=>{begin++},onUploaded:()=>{uploaded++}
 })
 assert.equal(data.channelId,VIDEO_RU_CHANNEL_ID)
 assert.equal(data.privacy,'unlisted')
 assert.equal(data.uploadStatus,'processed')
 assert.equal(begin,1)
 assert.equal(uploaded,1)
 assert.equal(calls.filter(c=>c.method==='PUT').length,1)
 assert.equal(calls.filter(c=>c.url.includes('/channels?')).length,1)
 assert.equal(calls.filter(c=>c.url.includes('/videos?')&&!c.url.includes('/upload/')).length,1)
})
test('Google fails closed on wrong channel, missing authorization and wrong visibility',async()=>{
 const wrong=async()=>Response.json({items:[{id:'UCjWq6NHZTQkUr3bC3WbXXcc'}]})
 await assert.rejects(()=>verifyYoutubeRuOwner('token'.repeat(9),wrong),/WRONG_CHANNEL/)
 await assert.rejects(()=>refreshYoutubeAccess('long-enough-token',{clientId:'client',clientSecret:'secret'},
   async()=>new Response('permission denied',{status:403})),/RECONNECT_REQUIRED/)
 const privateVideo=async()=>Response.json({items:[{
  id:'Yt123456abc',snippet:{channelId:VIDEO_RU_CHANNEL_ID,title:'X'},
  status:{privacyStatus:'private'}}]})
 await assert.rejects(()=>verifyUploadedRu('Yt123456abc','token'.repeat(9),privateVideo),/PRIVACY_HOLD/)
})
test('YouTube readback requires complete processing, and reports confirmed status',async()=>{
 for(const uploadStatus of ['uploaded','failed','rejected','deleted',undefined,'unknown']){
  const fetcher=async()=>Response.json({items:[{
   id:'Yt123456abc',snippet:{channelId:VIDEO_RU_CHANNEL_ID},
   status:{privacyStatus:'unlisted',uploadStatus}
  }]})
  await assert.rejects(()=>verifyUploadedRu('Yt123456abc','token'.repeat(9),fetcher),
   /VIDEO_YOUTUBE_UPLOAD_UNCONFIRMED/)
 }
 const fetcher=async()=>Response.json({items:[{
  id:'Yt123456abc',snippet:{channelId:VIDEO_RU_CHANNEL_ID},
  status:{privacyStatus:'unlisted',uploadStatus:'processed'}
 }]})
 assert.deepEqual(await verifyUploadedRu('Yt123456abc','token'.repeat(9),fetcher),{
  id:'Yt123456abc',channelId:VIDEO_RU_CHANNEL_ID,privacy:'unlisted',
  uploadStatus:'processed',title:''
 })
})
test('failed YouTube processing preserves the uploaded ID without another media request',async()=>{
 let puts=0,inits=0;const saved=[]
 const fetcher=async(url,opt={})=>{
  if(String(url).includes('/channels?'))return Response.json({items:[{id:VIDEO_RU_CHANNEL_ID}]})
  if(opt.method==='POST'){
   inits++
   return new Response('',{headers:{location:'https://www.googleapis.com/upload/youtube/v3/videos?upload_id=abc'}})
  }
  if(opt.method==='PUT'){puts++;return Response.json({id:'Yt123456abc'})}
  return Response.json({items:[{id:'Yt123456abc',snippet:{channelId:VIDEO_RU_CHANNEL_ID},
   status:{privacyStatus:'unlisted',uploadStatus:'failed'}}]})
 }
 const mp4=Buffer.alloc(2048);mp4.write('ftyp',4)
 await assert.rejects(()=>uploadUnlistedRu(mp4,'token'.repeat(9),{
  fetcher,onUploaded:id=>saved.push(id)
 }),/VIDEO_YOUTUBE_UPLOAD_UNCONFIRMED/)
 assert.deepEqual(saved,['Yt123456abc'])
 assert.equal(puts,1)
 assert.equal(inits,1)
})
test('backend only webhook and forced RLS migration; no cross-bot or automatic YouTube upload',()=>{
 const migration=readFileSync(new URL('../supabase/migrations/20261026175000_hh_owner_telegram_photo_audio_video.sql',import.meta.url),'utf8')
 const crmWebhook=readFileSync(new URL('../app/api/app/crm/messenger/webhook/[provider]/route.js',import.meta.url),'utf8')
 assert.match(crmWebhook,/start\(\?:@/)
 const service=readFileSync(new URL('../lib/practitioners/owner-telegram-video-service.js',import.meta.url),'utf8')
 assert.match(migration,/force row level security/ig)
 assert.match(migration,/revoke all on app_private.telegram_owner_video_jobs from public, anon, authenticated, hh_app_inbox/)
 assert.match(migration,/public,file_size_limit,allowed_mime_types\)\nvalues\('hh-owner-video-drafts','hh-owner-video-drafts',false/)
 assert.match(crmWebhook,/verifyMessengerWebhook[\s\S]*receiveOwnerTelegramVideoWebhook[\s\S]*normalizeMessengerUpdates/)
 assert.match(crmWebhook,/channel:'crm'/)
 const dotWebhook=readFileSync(new URL('../app/api/app/notification-channels/telegram/webhook/route.js',import.meta.url),'utf8')
 assert.match(dotWebhook,/verifyClientTelegramSecret[\s\S]*receiveOwnerTelegramVideoWebhook[\s\S]*receiveOwnerTelegramAudioWebhook/)
 assert.match(dotWebhook,/channel:'practice'/)
 assert.match(dotWebhook,/if\(video.background\)after\(/)
 assert.match(crmWebhook,/ensureTelegramInlineWebhookUpdates/)
 const nextConfig=readFileSync(new URL('../next.config.ts',import.meta.url),'utf8')
 assert.match(nextConfig,/\/api\/app\/crm\/messenger\/webhook\/\*/)
 assert.match(nextConfig,/\/api\/app\/notification-channels\/telegram\/webhook/)
 assert.match(nextConfig,/ffmpeg-static\/ffmpeg/)
 assert.match(crmWebhook,/if\(video.background\)after\(/)
 assert.match(service,/event.chatId!==owner.chat\|\|event.userId!==owner.chat/)
 assert.match(service,/if\(env.VERCEL_ENV==='preview'\|\|env.HH_OWNER_VIDEO_ENABLED!=='true'\)/)
 assert.match(service,/!\['crm','practice'\].includes\(channel\)/)
 assert.match(service,/if\(channel==='crm'\)\{/)
 assert.match(service,/if\(event.action==='media'\|\|event.action==='reject'\)return \{handled:false\}/)
 assert.match(service,/https:\/\/t\.me\/Andydotbot\?start=audio/)
 assert.match(service,/channel==='practice'&&telegramClientBotMode\(env\)!=='shared_practice'/)
 assert.match(service,/if\(event.action==='publish'\)/)
 assert.match(service,/if\(event.action==='done'\)/)
 assert.doesNotMatch(service,/if\(result.state==='added'\)\{\s*await ownerMessage/)
 const doneHandler=service.split("if(event.action==='done'){")[1].split("if(event.action==='retry'){")[0]
 assert.match(doneHandler,/if\(batch.state==='reserved'\)\{[\s\S]*await ownerMessage\(owner/)
 assert.match(service,/ownerVideoConfirmationButtons\(manifest.jobId,manifest.lastUpdateId,manifest.itemCount\)/)
 assert.match(service,/event.itemsUpdateId!==Number\(row.last_update_id\)/)
 assert.match(service,/event.itemCount!==row.items.length/)
 assert.match(service,/ownerVideoConfirmationButtons\(manifest.jobId,manifest.lastUpdateId,manifest.itemCount\)/)
 assert.match(service,/if\(event.action==='confirm'\)/)
 assert.match(service,/if\(result.state==='limit'&&result.notify\)/)
 assert.doesNotMatch(doneHandler.split("if(event.action==='confirm')")[0],/background:\(\)=>buildVideo/)
 assert.match(doneHandler,/background:\(\)=>buildVideo\(config,batch,owner,fetcher\)/)
 assert.match(service,/async function markPreviewDelivery\(config,jobId,confirmed\)/)
 assert.match(service,/!Number.isSafeInteger\(result.result\?\.message_id\)/)
 assert.match(service,/markPreviewDelivery\(config,batch.jobId,false\)/)
 assert.match(service,/markPreviewDelivery\(config,jobId,true\)/)
 assert.match(service,/const ready=row\?\.state==='preview'/)
 assert.match(service,/Повторить доставку MP4/)
 assert.match(service,/https:\/\/holistichouse\.vercel\.app\/admin\/materials/)
 assert.match(service,/state='uncertain'/)
 assert.equal(readFileSync(new URL('../app/api/admin/telegram-video/youtube/start/route.js',import.meta.url),'utf8').includes("await requireAdminRequest()"),true)
})

test('final-only MP4 cabinet: protected media, Safari byte ranges, forced RLS',()=>{
 const id='b6e8526e-c251-4dd5-a9ca-2886c430f912'
 assert.equal(ownerVideoIdValid(id),true)
 assert.equal(ownerVideoIdValid('../bad'),false)
 assert.equal(ownerVideoMediaPath(id),'telegram-slides/'+id+'.mp4')
 assert.equal(ownerVideoMediaPath('bad'),null)
 assert.deepEqual(ownerVideoByteRange(null,5000),{status:200,start:0,end:4999})
 assert.deepEqual(ownerVideoByteRange('bytes=0-0',5000),{status:206,start:0,end:0})
 assert.deepEqual(ownerVideoByteRange('bytes=4096-',5000),{status:206,start:4096,end:4999})
 assert.deepEqual(ownerVideoByteRange('bytes=-128',5000),{status:206,start:4872,end:4999})
 assert.equal(ownerVideoByteRange('bytes=0-1,5-8',5000),null)
 assert.equal(ownerVideoByteRange('bytes=5000-',5000),null)
 assert.equal(ownerVideoByteRange(null,50000001),null)
 const migration=readFileSync(new URL('../supabase/migrations/20261027020000_hh_owner_video_final_only_cabinet.sql',import.meta.url),'utf8')
 assert.match(migration,/force row level security/i)
 assert.match(migration,/revoke all on app_private.telegram_owner_video_drafts from public, anon, authenticated, hh_app_inbox/)
 assert.match(migration,/current_setting\('hh.owner_video_manager',true\)='1'/)
 const service=readFileSync(new URL('../lib/practitioners/owner-telegram-video-service.js',import.meta.url),'utf8')
 assert.match(service,/video_bytes=\$4,source_seconds=\$5,trim_start_seconds=0,items='\[\]'::jsonb/)
 assert.match(service,/insert into app_private.telegram_owner_video_drafts/)
 assert.match(service,/listOwnerTelegramVideoDrafts/)
 assert.match(service,/getOwnerTelegramVideoDraftFile/)
 assert.match(service,/ownerVideoByteRange\(request.headers.get\('range'\)/)
 assert.doesNotMatch(service,/createSignedUrl|createSignedUrls|publicUrl|signedUrl/)
 const listing=readFileSync(new URL('../app/api/admin/telegram-video/drafts/route.js',import.meta.url),'utf8')
 const media=readFileSync(new URL('../app/api/admin/telegram-video/drafts/[id]/file/route.js',import.meta.url),'utf8')
 assert.match(listing,/ownerMaterialRequest\(/)
 assert.match(media,/ownerMaterialRequest\(/)
 assert.match(media,/serve as HEAD/)
 const client=readFileSync(new URL('../components/admin-telegram-videos.jsx',import.meta.url),'utf8')
 assert.match(client,/playsInline/)
 assert.match(client,/preload="metadata"/)
 assert.match(client,/credentials:'same-origin'/)
 assert.match(readFileSync(new URL('../app/admin/materials/page.js',import.meta.url),'utf8'),/<AdminTelegramVideos /)
})

test('Dot Audio and Video menu opens protected video in same verified owner chat',()=>{
 assert.deepEqual(OWNER_AI_COMMANDS.map(x=>x.command),['all','audio','combine','done','video','video_edit','materials','track'])
 assert.match(OWNER_AI_COMMANDS.find(x=>x.command==='video').description,/Видео из фото и аудио/)
 assert.match(OWNER_AI_COMMANDS.find(x=>x.command==='video_edit').description,/Название и описание/)
 assert.match(OWNER_AI_COMMANDS.find(x=>x.command==='audio').description,/Аудио и видео/)
 const videoButton=ownerAudioHelpMessage().reply_markup.inline_keyboard.flat()
   .find(x=>x.url==='https://t.me/Andydotbot?start=video')
 assert.ok(videoButton)
 assert.match(videoButton.text,/Создать видео/)
 assert.ok(ownerAudioHelpMessage().reply_markup.inline_keyboard.flat()
   .some(x=>x.url==='https://t.me/Andydotbot?start=combine'))
 assert.ok(ownerAudioMaterialsMessage().reply_markup.inline_keyboard.flat()
   .some(x=>x.url==='https://t.me/Andydotbot?start=video'))
 const dotOwner={id:privateBase.id,is_bot:false}
 const dotCommand={update_id:2007,message:{
   date:TIME/1000,chat:privateBase,from:dotOwner,message_id:47,text:'/video'}}
 assert.equal(parseOwnerVideoUpdate(dotCommand,{now:TIME,botUsername:'andydotbot'})?.action,'start')
 const dotLink={...dotCommand,message:{...dotCommand.message,text:'/start video'}}
 assert.equal(parseOwnerVideoUpdate(dotLink,{now:TIME,botUsername:'andydotbot'})?.action,'start')
 assert.match(ownerVideoStartMessage().text,/\/video_done/)
 const dotCallback={update_id:2008,callback_query:{id:'video-start',
   data:'hh-video:start',from:dotOwner,
   message:{chat:privateBase,from:{is_bot:true,username:'Andydotbot'}}}}
 assert.equal(parseOwnerVideoUpdate(dotCallback,{now:TIME,botUsername:'andydotbot'})?.action,'start')
 assert.equal(parseOwnerVideoUpdate(dotCallback,{now:TIME,botUsername:'holistichouse_bot'}),null)
 const service=readFileSync(new URL('../lib/practitioners/owner-telegram-video-service.js',import.meta.url),'utf8')
 assert.match(service,/ownerAudioCombineBusy\(config\)/)
 assert.match(service,/hh.owner_audio_manager/)
 assert.match(service,/expires_at>now\(\)/)
 assert.match(service,/channel==='practice'&&await ownerAudioCombineBusy/)
 const transport=readFileSync(new URL('../lib/app/client-telegram-transport.js',import.meta.url),'utf8')
 assert.match(transport,/saved\[i\]\?\.description===command.description/)
});

test('private /video command remains registered if Owner AI is disabled',()=>{
 const menu=(mode,ownerAiEnabled,ownerVideoEnabled)=>
   ownerScopedTelegramCommands({mode,ownerAiEnabled,ownerVideoEnabled}).map(item=>item.command)
 assert.deepEqual(menu('shared_practice',false,true),['audio','combine','done','video','video_edit','materials','track'])
 assert.deepEqual(menu('shared_practice',true,true),['all','audio','combine','done','video','video_edit','materials','track'])
 assert.deepEqual(menu('shared_practice',true,false),['all','audio','combine','done','materials','track'])
 assert.deepEqual(menu('shared_practice',false,false),[])
 assert.deepEqual(menu('dedicated',true,true),[])
 const source=readFileSync(new URL('../lib/app/client-telegram-transport.js',import.meta.url),'utf8')
 assert.match(source,/ownerMenu\(env\)/)
 assert.match(source,/commands:ownerCommands,scope:\{type:'chat',chat_id:chatNumber\}/)
 assert.match(source,/ownerCommands.every\(\(command,i\)=>/)
 assert.match(source,/!info.allowed_updates\?\.includes\('callback_query'\)/)
 const audioService=readFileSync(new URL('../lib/practitioners/owner-telegram-audio-service.js',import.meta.url),'utf8')
 assert.match(audioService,/env.HH_OWNER_AI_TG_ENABLED==='true'\|\|env.HH_OWNER_VIDEO_ENABLED==='true'/)
})

test('admin YouTube upload guide points owner video to the same Dot bot, not CRM',()=>{
 const page=readFileSync(new URL('../app/admin/youtube-upload/page.js',import.meta.url),'utf8')
 assert.match(page,/https:\/\/t\.me\/Andydotbot\?start=video/)
 assert.doesNotMatch(page,/t\.me\/holistichouse_bot\?start=video/)
})

test('Vercel installs pinned FFmpeg and ships its binary with the private Dot webhook',()=>{
 const pkg=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'))
 assert.equal(pkg.dependencies['ffmpeg-static'],'5.3.0')
 assert.equal(pkg.allowScripts?.['ffmpeg-static@5.3.0'],true)
 assert.match(pkg.scripts.prebuild,/node scripts\/ensure-owner-video-renderer\.mjs/)
 const nextConfig=readFileSync(new URL('../next.config.ts',import.meta.url),'utf8')
 assert.match(nextConfig,/serverExternalPackages:\s*\[["']ffmpeg-static["']\]/)
 assert.match(nextConfig,/notification-channels\/telegram\/webhook/)
 const workflow=readFileSync(new URL('../.github/workflows/hh-owner-telegram-video.yml',import.meta.url),'utf8')
 assert.match(workflow,/ensure-owner-video-renderer\.mjs --verify-trace/)
})

test('owner cut starts at exact numeric or clock second and old approval cannot authorize new version',()=>{
 const fixed='b6e8526e-c251-4dd5-a9ca-2886c430f912'
 const msg=text=>({update_id:1320,message:{date:TIME/1000,chat:privateBase,
   from,message_id:57,text}})
 assert.equal(parseVideoCutSeconds('75'),75)
 assert.equal(parseVideoCutSeconds('01:15'),75)
 assert.equal(parseVideoCutSeconds('0:45'),45)
 assert.equal(parseVideoCutSeconds('00:01:15'),75)
 assert.equal(parseVideoCutSeconds('0'),0)
 for(const bad of ['','-1','1.5','1;rm','1800','33:12','99:99','0x2f','2:2',' '])
   assert.equal(parseVideoCutSeconds(bad),null)
 assert.equal(parsed(msg('/video_cut 75'))?.trimStartSeconds,75)
 assert.equal(parsed(msg('/video_cut 01:15'))?.trimStartSeconds,75)
 assert.equal(parsed(msg('/video_cut@holistichouse_bot 0'))?.trimStartSeconds,0)
 assert.equal(parsed(msg('/video_cut@foreignbot 75')),null)
 assert.equal(parsed(msg('/video_cut -7'))?.trimStartSeconds,null)
 const original=ownerVideoPreviewButtons(fixed,0)
 const cut=ownerVideoPreviewButtons(fixed,75)
 assert.equal(original.inline_keyboard[0][0].callback_data,'hh-video:cut:'+fixed)
 assert.equal(original.inline_keyboard[1][0].callback_data,'hh-video:publish:'+fixed)
 assert.equal(cut.inline_keyboard[1][0].callback_data,'hh-video:publish:'+fixed+':23')
 assert.ok(cut.inline_keyboard.flat().every(b=>!b.callback_data||b.callback_data.length<=64))
 assert.equal(parsed(callback(cut.inline_keyboard[0][0].callback_data))?.action,'cut_help')
 assert.deepEqual(
   (({action,jobId,trimStartSeconds})=>({action,jobId,trimStartSeconds}))(
     parsed(callback(cut.inline_keyboard[1][0].callback_data))),
   {action:'publish',jobId:fixed,trimStartSeconds:75})
 assert.equal(parsed(callback(original.inline_keyboard[1][0].callback_data))?.trimStartSeconds,0)
 assert.equal(parsed(callback('hh-video:publish:'+fixed+':zzz')),null)
 assert.throws(()=>ownerVideoPreviewButtons(fixed,1800),/INVALID_VIDEO_JOB/)
 const source=readFileSync(new URL('../lib/practitioners/owner-telegram-video-service.js',import.meta.url),'utf8')
 assert.match(source,/event\.trimStartSeconds!==Number\(row\.trim_start_seconds\)/)
 assert.match(source,/row\.state!=='preview'/)
 assert.match(source,/state='trimming'/)
 assert.match(source,/background:\(\)=>cutVideo\(config,batch,owner,fetcher\)/)
 assert.match(source,/original\.storage_path!==ownerVideoMediaPath\(row\.job_id\)/)
 assert.match(source,/ownerVideoPreviewButtons\(batch\.jobId,batch\.state==='same'\?batch\.start:0\)/)
 assert.match(source,/trim_start_seconds=\$5/)
 assert.match(source,/VIDEO_TRIM_INTERRUPTED/)
 assert.match(source,/if\(event.updateId<=Number\(row.last_update_id\)\)return \{state:'stale'\}/)
 assert.match(source,/last_update_id=greatest\(last_update_id,\$3\)/)
 assert.match(source,/const restoring=row.state==='cancelled'/)
 assert.match(source,/state in \('preview','cancelled'\)/)
 assert.match(source,/form.set\('width','1920'\)/)
 assert.match(source,/form.set\('height','1080'\)/)
 assert.doesNotMatch(source,/onBeginUpload:[\s\S]*trimOwnerTelegramVideo\(/)
 const sql=readFileSync(new URL('../supabase/migrations/20261028003500_hh_owner_video_trim_before_youtube.sql',import.meta.url),'utf8')
 assert.match(sql,/add column if not exists source_seconds/)
 assert.match(sql,/add column if not exists trim_start_seconds/)
 assert.match(sql,/trimming/)
 assert.match(sql,/force row level security/i)
 assert.match(sql,/drop constraint if exists telegram_owner_video_jobs_storage_path_check/)
 assert.doesNotMatch(sql,/disable row level security|grant\s+.*\s+to\s+anon|drop table/i)
 // Render exists only as an owner-authenticated post-preview action; no
 // direct client route, token, unreviewed upload or bypass.
 assert.equal(typeof trimOwnerTelegramVideo,'function')
});


test('YouTube owner OAuth start restores an expired/missing admin browser session without leaking Google credentials', async () => {
  const [ts,vm,crypto]=await Promise.all([
    import('typescript'),import('node:vm'),import('node:crypto')
  ])
  const source=readFileSync(new URL('../app/api/admin/telegram-video/youtube/start/route.js',import.meta.url),'utf8')
  let authorized=false, configured=true, issued=0
  const modules={
    'next/server':{NextResponse:{redirect(location,options={}){
      const response={url:String(location),status:options.status??307,
        headers:options.headers,cookies:{set(name,value,opts){issued++;response.cookie={name,value,opts}}}}
      return response
    }}},
    'node:crypto':crypto,
    '@/lib/prescriptions/admin':{async requireAdminRequest(){return authorized}},
    '@/lib/app/config':{getAppConfig(){return {}}},
    '@/lib/app/crypto':{seal(){return 'sealed-with-private-server-key'}},
    '@/data/app-services':{PRACTITIONER_ID:'synthetic-owner-id'},
    '@/lib/practitioners/owner-telegram-video-service':{ownerVideoOauthConfigured(){return configured}},
  }
  const result=ts.default.transpileModule(source,{
    compilerOptions:{module:ts.default.ModuleKind.CommonJS,target:ts.default.ScriptTarget.ES2022}
  }).outputText
  const sandbox={exports:{},require(name){
    assert.ok(Object.hasOwn(modules,name),'Unexpected OAuth import: '+name)
    return modules[name]
  },URL,URLSearchParams,Response,process:{env:{HH_OWNER_VIDEO_GOOGLE_CLIENT_ID:'synthetic-public.apps.googleusercontent.com'}}}
  vm.default.runInNewContext(result,sandbox)

  const anonymous=await sandbox.exports.GET()
  assert.equal(anonymous.status,303)
  assert.equal(anonymous.url,'https://holistichouse.vercel.app/admin/login?destination=youtubeConnect')
  assert.equal(anonymous.headers['cache-control'],'no-store')
  assert.equal(issued,0,'no anonymous Google state cookie is issued')

  authorized=true
  configured=false
  const unavailable=await sandbox.exports.GET()
  assert.equal(unavailable.status,503,'missing Google configuration fails closed')
  assert.equal(issued,0)
  configured=true
  const connected=await sandbox.exports.GET()
  assert.equal(connected.status,307)
  const google=new URL(connected.url)
  assert.equal(google.origin,'https://accounts.google.com')
  assert.equal(google.searchParams.get('redirect_uri'),'https://holistichouse.vercel.app/api/admin/telegram-video/youtube/callback')
  assert.equal(google.searchParams.get('access_type'),'offline')
  assert.match(google.searchParams.get('scope'),/youtube\.upload/)
  assert.match(google.searchParams.get('scope'),/youtube\.readonly/)
  assert.equal(connected.cookie.name,'hh_tgvideo_oauth_state')
  assert.equal(connected.cookie.opts.httpOnly,true)
  assert.equal(connected.cookie.opts.sameSite,'lax')
  assert.equal(issued,1,'only an owner-verified request creates a sealed Google state')
})

test('YouTube owner auth recovery uses fixed destinations across admin, practitioner and Supabase Google callback', () => {
  const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
  const login=read('app/admin/login/page.js')
  const entry=read('components/practitioner-auto-entry.jsx')
  const access=read('lib/app/practitioner-access.js')
  const auth=read('app/api/app/[...path]/route.js')
  assert.match(login,/['"]youtubeConnect['"]\]\.includes\(params\?\.destination\)/)
  assert.match(login,/requireAdminRequest\(\)/)
  assert.match(entry,/youtubeConnect: '\/api\/admin\/telegram-video\/youtube\/start'/)
  assert.match(entry,/response\.redirectUrl !== ADMIN_DESTINATIONS\[safeDestination\]/)
  assert.match(access,/youtubeConnect: '\/api\/admin\/telegram-video\/youtube\/start'/)
  assert.equal(auth.split("'practitioner-youtubeConnect'").length-1,3,
    'OAuth start allowlist, callback allowlist and destination mapping are all pinned')
  assert.match(auth,/continueTo === 'practitioner-youtubeConnect'\s*\? \`\$\{origin\}\/admin\/login\?destination=youtubeConnect`/)
  assert.match(auth,/!practitionerEmailAllowed\(actor\) \|\| !await repo\.isPractitioner\(actor\)/)
  assert.match(auth,/issueTrustedAdminSession\(response/)
})

test('private MP4 cut selector binds both owner UUIDs and rejects path traversal',()=>{
 const job='b6e8526e-c251-4dd5-a9ca-2886c430f912'
 const cut='7798ea59-ef42-4dd4-a236-41ba9d697894'
 const path='telegram-slides/'+job+'-cut-'+cut+'.mp4'
 assert.equal(ownerVideoCutPath(job,cut),path)
 assert.equal(ownerVideoCutId(job,path),cut)
 assert.equal(ownerVideoCutPath(job,'../../path'),null)
 assert.equal(ownerVideoCutId(job,path+'.bak'),null)
 assert.equal(ownerVideoCutId('wrong',path),null)
 assert.equal(ownerVideoCutId(job,'https://example.com/video.mp4'),null)
 assert.deepEqual(ownerVideoByteRange('bytes=0-1',12617528),{status:206,start:0,end:1})
 assert.equal(ownerVideoByteRange('bytes=99999999-',12617528),null)
})
test('manual YouTube handoff reads current exact private cut, not an unsigned public URL',()=>{
 const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
 const service=read('lib/practitioners/owner-telegram-video-service.js')
 const playback=read('app/api/admin/telegram-video/drafts/[id]/file/route.js')
 const listing=read('app/api/admin/telegram-video/drafts/route.js')
 const ui=read('components/admin-telegram-videos.jsx')
 assert.match(playback,/ownerMaterialRequest\(request/)
 assert.match(listing,/ownerMaterialRequest\(request/)
 assert.match(service,/ownerVideoCutId\(job\.job_id,job\.storage_path\)/)
 assert.match(service,/row\?\.state!=='preview'\|\|row\.storage_path!==expected/)
 assert.match(service,/ownerVideoCutPath\(id,cutId\)/)
 assert.match(service,/download'\)==='1'/)
 assert.match(service,/Cache-Control':'private, no-store/)
 assert.match(ui,/data-owner-selected-cut/)
 assert.match(ui,/studio\.youtube\.com/)
 assert.doesNotMatch(ui,/metricool\.com\/api/)
})


test('owner Google OAuth RU grant upsert matches the deployed RU/EN composite target key',()=>{
 const service=readFileSync(new URL('../lib/practitioners/owner-telegram-video-service.js',import.meta.url),'utf8')
 const start=service.indexOf('export async function saveOwnerVideoYoutubeConsent(')
 const end=service.indexOf('export async function ownerVideoYoutubeConnected(',start)
 assert.ok(start>=0&&end>start)
 const oauth=service.slice(start,end)
 // Production has PRIMARY KEY (practitioner_id,target). An old single-column
 // ON CONFLICT silently makes owner-approved Google callback return failed.
 assert.ok(oauth.includes('(practitioner_id,target,channel_id,token_ciphertext)'))
 assert.ok(oauth.includes("values($1,'ru',$2,$3)"))
 assert.ok(oauth.includes('on conflict(practitioner_id,target) do update set'))
 assert.ok(oauth.includes("where practitioner_id=$1 and target='ru'"))
 assert.ok(oauth.includes('[PRACTITIONER_ID,channelId,encrypted]'))
 assert.ok(oauth.includes('channelId!==VIDEO_RU_CHANNEL_ID'))
 assert.ok(oauth.includes('seal({refreshToken,visibility:visibility===true},ENCRYPTION_CONTEXT,config)'))
 assert.ok(oauth.includes('openSealed(row.token_ciphertext,ENCRYPTION_CONTEXT,config)'))
 assert.ok(!oauth.includes('on conflict(practitioner_id) do update set'))
 // Never delete/re-pair the unrelated English consent when reconnecting RU.
 assert.ok(!oauth.includes('delete from app_private.telegram_owner_video_oauth'))
})


test('private MP4 playback streams byte slices without 4.5MB buffered response', async()=>{
 const service=readFileSync(new URL('../lib/practitioners/owner-telegram-video-service.js',import.meta.url),'utf8')
 const start=service.indexOf('export async function getOwnerTelegramVideoDraftFile')
 const end=service.indexOf('const oauthConfig=',start)
 const block=service.slice(start,end)
 assert.ok(start>0&&end>start)
 assert.ok(block.includes('return new Response(part.stream(),{status:range.status,headers})'))
 assert.ok(block.includes('const part=data.slice(range.start,range.end+1'))
 assert.ok(!block.includes('await data.arrayBuffer()'))
 assert.ok(block.includes("'Cache-Control':'private, no-store"))
 assert.ok(block.includes("if(request.method==='HEAD')"))
 const blob=new Blob([Buffer.alloc(5000000,97)],{type:'video/mp4'})
 const range=ownerVideoByteRange('bytes=4000000-4500000',blob.size)
 assert.equal(range.status,206)
 const response=new Response(blob.slice(range.start,range.end+1).stream(),{
   status:range.status,headers:{'Content-Type':'video/mp4','Content-Length':String(range.end-range.start+1)}
 })
 assert.equal(response.status,206)
 assert.equal((await response.arrayBuffer()).byteLength,500001)
})


test('YouTube asynchronous processing is polled by receipt ID without second POST or PUT',async()=>{
 let init=0,put=0,reads=0,sleeps=0
 const saved=[]
 const fetcher=async(url,opt={})=>{
   if(String(url).includes('/channels?'))return Response.json({
     items:[{id:VIDEO_RU_CHANNEL_ID}]
   })
   if(opt.method==='POST'){
     init++
     return new Response('',{status:200,headers:{
       location:'https://www.googleapis.com/upload/youtube/v3/videos?upload_id=once'
     }})
   }
   if(opt.method==='PUT'){put++;return Response.json({id:'Yt123456abc'})}
   reads++
   return Response.json({items:[{
     id:'Yt123456abc',snippet:{channelId:VIDEO_RU_CHANNEL_ID,title:'Verified'},
     status:{privacyStatus:'unlisted',uploadStatus:reads<3?'uploaded':'processed'}
   }]})
 }
 const media=Buffer.alloc(2048);media.write('ftyp',4)
 const result=await uploadUnlistedRu(media,'token'.repeat(9),{
   fetcher,onUploaded:id=>saved.push(id),
   processingDelays:[0,0],
   sleep:async()=>{sleeps++}
 })
 assert.equal(result.id,'Yt123456abc')
 assert.equal(result.uploadStatus,'processed')
 assert.equal(init,1)
 assert.equal(put,1)
 assert.equal(reads,3)
 assert.equal(sleeps,2)
 assert.deepEqual(saved,['Yt123456abc'])
})

test('YouTube readback polling fails closed on wrong channel and exhausted processing',async()=>{
 let reads=0
 const sameId=async()=>{reads++;return Response.json({items:[{
   id:'Yt123456abc',snippet:{channelId:VIDEO_RU_CHANNEL_ID},
   status:{privacyStatus:'unlisted',uploadStatus:'uploaded'}
 }]})}
 await assert.rejects(()=>waitForUploadedRu('Yt123456abc','token'.repeat(9),{
   fetcher:sameId,delays:[0,0],sleep:async()=>{}
 }),/VIDEO_YOUTUBE_UPLOAD_UNCONFIRMED/)
 assert.equal(reads,3)
 await assert.rejects(()=>waitForUploadedRu('Yt123456abc','token'.repeat(9),{
   fetcher:async()=>Response.json({items:[{
     id:'Yt123456abc',snippet:{channelId:'UCaaaaaaaaaaaaaaaaaaaaaa'},
     status:{privacyStatus:'unlisted',uploadStatus:'uploaded'}
   }]}),delays:[0,0],sleep:async()=>{throw Error('must-not-wait')}
 }),/VIDEO_YOUTUBE_WRONG_CHANNEL/)
 await assert.rejects(()=>waitForUploadedRu('Yt123456abc','token'.repeat(9),{
   fetcher:async()=>Response.json({items:[{
     id:'Yt123456abc',snippet:{channelId:VIDEO_RU_CHANNEL_ID},
     status:{privacyStatus:'private',uploadStatus:'uploaded'}
   }]}),delays:[0,0],sleep:async()=>{throw Error('must-not-wait')}
 }),/VIDEO_YOUTUBE_PRIVACY_HOLD/)
})

test('Dot status and existing cron reconcile only recorded IDs, never re-upload',()=>{
 const service=readFileSync(new URL('../lib/practitioners/owner-telegram-video-service.js',import.meta.url),'utf8')
 const cron=readFileSync(new URL('../app/api/internal/housekeeping/route.js',import.meta.url),'utf8')
 assert.match(service,/export async function reconcilePendingOwnerYoutubeVideo/)
 assert.match(service,/knownVideoId=videoId/)
 assert.match(service,/knownVideoId\s*\?'⏳ YouTube получил видео/)
 assert.match(service,/row\?\.state!=='uncertain'\|\|!row\.youtube_video_id/)
 assert.match(service,/if\(row\?\.state==='uncertain'&&row\.youtube_video_id\)/)
 assert.match(service,/background:\(\)=>verifyUncertain\(/)
 assert.match(service,/where practitioner_id=\$1 and youtube_video_id=\$2 and state='uncertain'/)
 assert.match(service,/callback_data:'hh-video:status'/)
 assert.doesNotMatch(service.slice(service.indexOf('async function verifyUncertain'),service.indexOf('export async function receiveOwnerTelegramVideoWebhook')),/uploadUnlistedRu|method:'PUT'|method:'POST'/)
 assert.match(cron,/runHousekeepingCron\(request/)
 assert.match(cron,/HH_OWNER_VIDEO_ENABLED==='true'/)
 assert.match(cron,/await reconcilePendingOwnerYoutubeVideo\(config\)/)
 assert.doesNotMatch(cron,/unconditional.*upload|uploadUnlistedRu/)
})
