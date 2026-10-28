import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {parseOwnerVideoUpdate,ownerVideoVisibilityMenuButtons,
 ownerVideoVisibilityConfirmButtons,VIDEO_RU_CHANNEL_ID}
 from '../lib/practitioners/owner-telegram-video-model.mjs'
import {ownerRuYoutubeVisibility,ownerRuStatusUpdateBody,
 changeOwnerRuYoutubeVisibility}
 from '../lib/practitioners/owner-telegram-video-visibility.mjs'

const UUID='b6e8526e-c251-4dd5-a9ca-2886c430f912'
const ID='Yt123456abc'
const TOKEN='visibility-test-access-token-do-not-log'
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
function bot(data){
 return {update_id:1200,callback_query:{id:'visibility-owner-callback',
   data,from:{id:123456,is_bot:false},
   message:{chat:{type:'private',id:123456},from:{is_bot:true,username:'Andydotbot'}}}}
}
const parse=data=>parseOwnerVideoUpdate(bot(data),{botUsername:'Andydotbot'})
const item=(privacy='unlisted')=>({
 id:ID,snippet:{channelId:VIDEO_RU_CHANNEL_ID,title:'Test video'},
 status:{privacyStatus:privacy,uploadStatus:'processed',
   license:'youtube',embeddable:true,publicStatsViewable:false,
   selfDeclaredMadeForKids:false,containsSyntheticMedia:true}
})
test('Telegram button payloads bind job UUID and require a second confirmation',()=>{
 const menu=ownerVideoVisibilityMenuButtons(UUID,'unlisted')
 const choice=menu.inline_keyboard[0][0]
 assert.match(choice.text,/Для всех/)
 assert.equal(parse(choice.callback_data)?.action,'visibility_choice')
 assert.equal(parse(choice.callback_data)?.jobId,UUID)
 assert.equal(parse(choice.callback_data)?.target,'public')
 const confirmation=ownerVideoVisibilityConfirmButtons(UUID,'public')
 const confirm=confirmation.inline_keyboard[0][0]
 assert.match(confirm.text,/ОТКРЫТЬ ДЛЯ ВСЕХ/)
 assert.equal(parse(confirm.callback_data)?.action,'visibility_apply')
 assert.equal(parse(confirm.callback_data)?.jobId,UUID)
 assert.equal(parse(confirm.callback_data)?.target,'public')
 assert.equal(confirmation.inline_keyboard[1][0].callback_data,'hh-video:status')
 const hide=ownerVideoVisibilityMenuButtons(UUID,'public')
 assert.equal(parse(hide.inline_keyboard[0][0].callback_data)?.target,'unlisted')
 assert.equal(parse(ownerVideoVisibilityConfirmButtons(UUID,'unlisted').inline_keyboard[0][0].callback_data)?.target,'unlisted')
 assert.equal(parse('hh-video:vis:'+UUID)?.action,'visibility_menu')
 assert.equal(parse('hh-video:v:'+UUID+':x'),null)
 assert.equal(parse('hh-video:vc:garbage:p'),null)
 for(const values of [menu,confirmation,hide])
   for(const button of values.inline_keyboard.flat())
     if(button.callback_data)assert.ok(button.callback_data.length<=64)
 const update={update_id:1201,message:{date:Date.now()/1000|0,
   chat:{type:'private',id:123456},from:{id:123456,is_bot:false},
   message_id:99,text:'/video_visibility'}}
 assert.equal(parseOwnerVideoUpdate(update,{botUsername:'Andydotbot'})?.action,'visibility_menu')
 assert.equal(parseOwnerVideoUpdate({...update,message:{...update.message,
   chat:{type:'group',id:123456}}},{botUsername:'Andydotbot'}),null)
 assert.throws(()=>ownerVideoVisibilityConfirmButtons(UUID,'private'),/INVALID_VIDEO_JOB/)
})

test('existing ID change from Unlisted to Public reads provider, writes status only, verifies readback',async()=>{
 let visibility='unlisted'
 const calls=[]
 const fetcher=async(url,opt={})=>{
   calls.push({url:String(url),method:opt.method||'GET',body:opt.body?JSON.parse(opt.body):null})
   if(opt.method==='PUT'){
     visibility=JSON.parse(opt.body).status.privacyStatus
     return Response.json({id:ID,status:{privacyStatus:visibility}})
   }
   return Response.json({items:[item(visibility)]})
 }
 const result=await changeOwnerRuYoutubeVisibility(ID,TOKEN,'public',fetcher)
 assert.deepEqual(result,{id:ID,channelId:VIDEO_RU_CHANNEL_ID,privacyStatus:'public',changed:true})
 const puts=calls.filter(c=>c.method==='PUT')
 assert.equal(puts.length,1)
 assert.ok(puts[0].url.endsWith('/youtube/v3/videos?part=status'))
 assert.deepEqual(puts[0].body,{
   id:ID,status:{privacyStatus:'public',license:'youtube',embeddable:true,
     publicStatsViewable:false,selfDeclaredMadeForKids:false,
     containsSyntheticMedia:true}
 })
 assert.equal(calls.length,3)
 assert.equal(calls.filter(c=>c.method==='POST').length,0)
 await changeOwnerRuYoutubeVisibility(ID,TOKEN,'public',fetcher)
 assert.equal(calls.filter(c=>c.method==='PUT').length,1,
   'repeating an already-confirmed visibility choice must not write again')
 const back=await changeOwnerRuYoutubeVisibility(ID,TOKEN,'unlisted',fetcher)
 assert.equal(back.privacyStatus,'unlisted')
 assert.equal(calls.filter(c=>c.method==='PUT').length,2)
})

test('not processed, private video, wrong channel and scheduled release fail without provider mutation',async()=>{
 const scenarios=[
   {...item(),snippet:{channelId:'UCwrongwrongwrongwrongwrong1'}},
   {...item(),status:{privacyStatus:'uploaded',uploadStatus:'processed'}},
   {...item(),status:{privacyStatus:'unlisted',uploadStatus:'failed'}},
   {...item('private')},
   {...item(),status:{...item().status,publishAt:'2026-10-29T00:00:00Z'}}
 ]
 for(const video of scenarios){
   let writes=0
   const fetcher=async(_,opt={})=>{
     if(opt.method==='PUT')writes++
     return Response.json({items:[video]})
   }
   await assert.rejects(
     ()=>changeOwnerRuYoutubeVisibility(ID,TOKEN,'public',fetcher),
     /VIDEO_YOUTUBE/)
   assert.equal(writes,0)
 }
})

test('provider timeout yields uncertain status and never retries mutation',async()=>{
 let puts=0
 const fetcher=async(_,opt={})=>{
   if(opt.method==='PUT'){puts++;throw Error('simulated timeout')}
   return Response.json({items:[item()]})
 }
 await assert.rejects(
   ()=>changeOwnerRuYoutubeVisibility(ID,TOKEN,'public',fetcher),
   /VIDEO_YOUTUBE_VISIBILITY_UNCONFIRMED/)
 assert.equal(puts,1)
})

test('server OAuth edit upgrade is separate and fails closed without exact Google scope',()=>{
 const start=source('app/api/admin/telegram-video/youtube/start/route.js')
 const callback=source('app/api/admin/telegram-video/youtube/callback/route.js')
 const service=source('lib/practitioners/owner-telegram-video-service.js')
 const ui=source('app/admin/youtube-upload/page.js')
 assert.match(start,/searchParams.get\('visibility'\)==='1'/)
 assert.match(start,/youtube.force-ssl/)
 assert.match(callback,/sealed.visibility===true/)
 assert.match(callback,/granted.has\('https:\/\/www.googleapis.com\/auth\/youtube.force-ssl'\)/)
 assert.match(callback,/saveOwnerVideoYoutubeConsent\(config,token.refresh_token,channel,\{visibility:editing\}\)/)
 assert.match(service,/seal\(\{refreshToken,visibility:visibility===true\},ENCRYPTION_CONTEXT,config\)/)
 assert.match(service,/ownerRuYoutubeVisibilityAccessToken/)
 assert.match(service,/grant\?\.visibility!==true/)
 assert.match(ui,/visibility=1/)
 assert.match(ui,/telegramVisibilityConnected/)
})

test('only Dot owner current uploaded job can be changed, never arbitrary video or master uploads',()=>{
 const service=source('lib/practitioners/owner-telegram-video-service.js')
 assert.match(service,/async function selectedDotYoutubeVideo/)
 assert.match(service,/row\?\.state==='uploaded'&&row.youtube_video_id/)
 assert.match(service,/\(!jobId\|\|row.job_id===jobId\)/)
 assert.match(service,/if\(event.action==='visibility_choice'\)/)
 assert.match(service,/ownerVideoVisibilityConfirmButtons\(row.job_id,event.target\)/)
 assert.match(service,/if\(!await ownerVideoVisibilityConnected\(config,env\)\)/)
 assert.match(service,/changeOwnerRuYoutubeVisibility\(row.youtube_video_id,token,target,fetcher\)/)
 const block=service.slice(service.indexOf('async function applyDotVisibility'),
   service.indexOf('export async function receiveOwnerTelegramVideoWebhook'))
 assert.doesNotMatch(block,/uploadUnlistedRu|method:'PUT'|method:'POST'/)
 const yt=source('lib/practitioners/owner-telegram-video-visibility.mjs')
 assert.doesNotMatch(yt,/uploadType=resumable|videos.insert|videoStorage/)
})
