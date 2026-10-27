import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,mkdtempSync,mkdirSync,writeFileSync,chmodSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {parseOwnerVideoUpdate,safeVideoParts,ownerVideoStartMessage,ownerVideoPreviewButtons,
  VIDEO_IMAGE_LIMIT,VIDEO_AUDIO_LIMIT,VIDEO_MAX_INPUT_BYTES,VIDEO_MAX_SECONDS,VIDEO_RU_CHANNEL_ID}
 from '../lib/practitioners/owner-telegram-video-model.mjs'
import {photoTimeline,videoRenderArguments,resolveOwnerVideoFfmpegPath} from '../lib/practitioners/owner-telegram-video-render.mjs'
import {ownerVideoOauthConfig,ownerVideoOauthConfigured,ownerVideoOauthStateMatches} from '../lib/practitioners/owner-telegram-video-oauth-config.mjs'
import {refreshYoutubeAccess,verifyYoutubeRuOwner,uploadUnlistedRu,verifyUploadedRu}
 from '../lib/practitioners/owner-telegram-video-youtube.mjs'
import {ownerVideoIdValid,ownerVideoMediaPath,ownerVideoByteRange}
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
const callback=(data)=>({update_id:1200,callback_query:{id:'callback-1234',data,from,
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
 assert.equal(parsed(callback('hh-video:publish:bad')),null)
 const spoof=callback('hh-video:done');spoof.callback_query.message.from.username='Attacker_bot'
 assert.equal(parsed(spoof),null)
 const unpaired=callback('hh-video:done');unpaired.callback_query.from.id=555
 assert.equal(parsed(unpaired),null)
 assert.match(ownerVideoStartMessage().text,/сборку|собрать/i)
 assert.match(ownerVideoStartMessage().text,/1–15 фотографий и 1–15/)
 assert.ok(ownerVideoStartMessage().reply_markup.inline_keyboard.flat().some(button=>button.callback_data==='hh-video:status'))
 assert.equal(ownerVideoPreviewButtons(fixed).inline_keyboard[0][0].callback_data,'hh-video:publish:'+fixed)
})
test('strict ordered safe source limits and anti-duplication',()=>{
 const items=[part('photo',0),part('audio',1)]
 assert.deepEqual(safeVideoParts(items),{images:1,audios:1,bytes:4600,seconds:3})
 assert.equal(VIDEO_IMAGE_LIMIT,15)
 assert.equal(VIDEO_AUDIO_LIMIT,15)
 assert.equal(safeVideoParts([...items,items[1]]),null)
 assert.equal(safeVideoParts([...Array.from({length:16},(_,i)=>part('photo',i)),part('audio',16)]),null)
 assert.equal(safeVideoParts([part('audio',0,{duration:121})]),null)
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
 assert.equal(VIDEO_MAX_INPUT_BYTES,20_000_000)
 assert.equal(VIDEO_MAX_SECONDS,120)
 assert.equal(safeVideoParts([...interleaved,part('photo',30)]),null)
 assert.equal(safeVideoParts([...interleaved,part('audio',30)]),null)
 assert.equal(safeVideoParts(interleaved.map((item,i)=>
   i===1?{...item,duration:100}:item)),null)
 assert.equal(safeVideoParts(interleaved.map(item=>
   item.kind==='photo'?{...item,bytes:1_400_000}:item)),null)
 assert.equal(safeVideoParts(interleaved.map(item=>
   item.kind==='photo'?{...item,bytes:1_250_000}:item))?.images,15)
 const mixed=[...interleaved].reverse()
 const plan=photoTimeline(mixed)
 assert.equal(plan.length,15)
 assert.deepEqual(plan.map(x=>x.startMs),Array.from({length:15},(_,i)=>i*2000))
 assert.ok(plan.every(x=>x.durationMs===2000))
 const args=videoRenderArguments(mixed,'/tmp/full-15-15.mp4')
 assert.equal(args.filter(x=>x==='-i').length,30)
 assert.ok(args.some(x=>x.includes('concat=n=15:v=1')))
 assert.ok(args.some(x=>x.includes('concat=n=15:v=0:a=1')))
 assert.ok(args.includes('libx264')&&args.includes('aac'))
})

test('FFmpeg command arguments use no shell and encode a single bounded 16:9 stream',()=>{
 const args=videoRenderArguments([part('photo',0),part('photo',1),part('audio',2)],'/tmp/output.mp4')
 assert.equal(args.at(-1),'/tmp/output.mp4')
 assert.ok(args.includes('libx264'))
 assert.ok(args.includes('aac'))
 assert.ok(args.some(v=>v.includes('concat=n=2:v=1')))
 assert.ok(args.some(v=>v.includes('scale=1920:1080')))
 assert.ok(!args.includes('-c:v copy'))
 assert.throws(()=>videoRenderArguments([part('photo',0)],'/tmp/output.mp4'),/INVALID_COMPOSITION/)
})
test('photo positions follow cumulative audio durations in mixed Telegram message order',()=>{
 const updates=[part('photo',0),part('audio',1,{duration:4}),part('photo',2),
   part('audio',3,{duration:3}),part('photo',4),part('audio',5,{duration:2})]
 const unordered=[updates[4],updates[5],updates[1],updates[3],updates[2],updates[0]]
 const plan=photoTimeline(unordered)
 assert.deepEqual(plan.map(x=>[x.part.updateId,x.startMs,x.durationMs]),[
   [100,0,4000],[102,4000,3000],[104,7000,2000]
 ])
 const args=videoRenderArguments(unordered,'/tmp/output.mp4')
 assert.deepEqual(args.filter((v,i)=>args[i-1]==='-t'),['4.000','3.000','2.000'])
 assert.equal(plan.reduce((sum,p)=>sum+p.durationMs,0),9000)
})
test('consecutive photos split the following audio segment without reordering',()=>{
 const plan=photoTimeline([part('photo',0),part('audio',1,{duration:3}),
   part('photo',2),part('photo',3),part('audio',4,{duration:4})])
 assert.deepEqual(plan.map(x=>[x.startMs,x.durationMs]),[
   [0,3000],[3000,2000],[5000,2000]
 ])
})
test('photos after the last audio stay visible as an outro, never a zero-length frame',()=>{
 const seq=[part('photo',0),part('audio',1,{duration:8}),part('photo',2)]
 assert.deepEqual(photoTimeline(seq).map(x=>[x.startMs,x.durationMs]),[
   [0,6500],[6500,1500]
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
 assert.match(service,/video_bytes=\$4,items='\[\]'::jsonb/)
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
 assert.deepEqual(OWNER_AI_COMMANDS.map(x=>x.command),['all','audio','video','materials','track'])
 assert.match(OWNER_AI_COMMANDS.find(x=>x.command==='video').description,/Видео из фото и аудио/)
 assert.match(OWNER_AI_COMMANDS.find(x=>x.command==='audio').description,/Аудио и видео/)
 const videoButton=ownerAudioHelpMessage().reply_markup.inline_keyboard.flat()
   .find(x=>x.url==='https://t.me/Andydotbot?start=video')
 assert.ok(videoButton)
 assert.match(videoButton.text,/Создать видео/)
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
 assert.deepEqual(menu('shared_practice',false,true),['audio','video','materials','track'])
 assert.deepEqual(menu('shared_practice',true,true),['all','audio','video','materials','track'])
 assert.deepEqual(menu('shared_practice',true,false),['all','audio','materials','track'])
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
