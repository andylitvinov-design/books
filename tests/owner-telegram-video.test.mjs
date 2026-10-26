import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {parseOwnerVideoUpdate,safeVideoParts,ownerVideoStartMessage,ownerVideoPreviewButtons,
  VIDEO_IMAGE_LIMIT,VIDEO_AUDIO_LIMIT,VIDEO_RU_CHANNEL_ID}
 from '../lib/practitioners/owner-telegram-video-model.mjs'
import {videoRenderArguments} from '../lib/practitioners/owner-telegram-video-render.mjs'
import {refreshYoutubeAccess,verifyYoutubeRuOwner,uploadUnlistedRu,verifyUploadedRu}
 from '../lib/practitioners/owner-telegram-video-youtube.mjs'

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
 assert.equal(parsed(callback('hh-video:publish:'+fixed)).jobId,fixed)
 assert.equal(parsed(callback('hh-video:publish:bad')),null)
 const spoof=callback('hh-video:done');spoof.callback_query.message.from.username='Attacker_bot'
 assert.equal(parsed(spoof),null)
 const unpaired=callback('hh-video:done');unpaired.callback_query.from.id=555
 assert.equal(parsed(unpaired),null)
 assert.match(ownerVideoStartMessage().text,/сборку|собрать/i)
 assert.equal(ownerVideoPreviewButtons(fixed).inline_keyboard[0][0].callback_data,'hh-video:publish:'+fixed)
})
test('strict ordered safe source limits and anti-duplication',()=>{
 const items=[part('photo',0),part('audio',1)]
 assert.deepEqual(safeVideoParts(items),{images:1,audios:1,bytes:4600,seconds:3})
 assert.equal(VIDEO_IMAGE_LIMIT,6)
 assert.equal(VIDEO_AUDIO_LIMIT,4)
 assert.equal(safeVideoParts([...items,items[1]]),null)
 assert.equal(safeVideoParts([...Array.from({length:7},(_,i)=>part('photo',i)),part('audio',7)]),null)
 assert.equal(safeVideoParts([part('audio',0,{duration:121})]),null)
 assert.equal(safeVideoParts([part('photo',0,{mime:'audio/mpeg'})]),null)
 assert.equal(safeVideoParts([part('photo',0,{bytes:6e6})]),null)
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
test('YouTube readback rejects failed, rejected, deleted and unconfirmed uploads',async()=>{
 for(const uploadStatus of ['failed','rejected','deleted',undefined,'unknown']){
  const fetcher=async()=>Response.json({items:[{
   id:'Yt123456abc',snippet:{channelId:VIDEO_RU_CHANNEL_ID},
   status:{privacyStatus:'unlisted',uploadStatus}
  }]})
  await assert.rejects(()=>verifyUploadedRu('Yt123456abc','token'.repeat(9),fetcher),
   /VIDEO_YOUTUBE_UPLOAD_UNCONFIRMED/)
 }
 for(const uploadStatus of ['uploaded','processed']){
  const fetcher=async()=>Response.json({items:[{
   id:'Yt123456abc',snippet:{channelId:VIDEO_RU_CHANNEL_ID},
   status:{privacyStatus:'unlisted',uploadStatus}
  }]})
  assert.equal((await verifyUploadedRu('Yt123456abc','token'.repeat(9),fetcher)).id,'Yt123456abc')
 }
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
 assert.match(crmWebhook,/ensureTelegramInlineWebhookUpdates/)
 const nextConfig=readFileSync(new URL('../next.config.ts',import.meta.url),'utf8')
 assert.match(nextConfig,/\/api\/app\/crm\/messenger\/webhook\/\*/)
 assert.match(crmWebhook,/if\(video.background\)after\(/)
 assert.match(service,/event.chatId!==owner.chat\|\|event.userId!==owner.chat/)
 assert.match(service,/if\(env.VERCEL_ENV==='preview'\|\|env.HH_OWNER_VIDEO_ENABLED!=='true'\)/)
 assert.match(service,/if\(channel!=='crm'\)return \{handled:false\}/)
 assert.match(service,/if\(event.action==='publish'\)/)
 assert.match(service,/if\(event.action==='done'\)/)
 assert.match(service,/state='uncertain'/)
 assert.equal(readFileSync(new URL('../app/api/admin/telegram-video/youtube/start/route.js',import.meta.url),'utf8').includes("await requireAdminRequest()"),true)
})
