import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {cleanHeygenPublication,validHeygenMediaUrl,resolveHeygenCaptionedUrl,
  transferHeygenToEnglishYoutube,verifyHeygenYoutubeUpload,
  validatedYoutubeUploadLocation} from '../lib/youtube/heygen-en-upload.mjs'
import {verifyYoutubeEnOwner,verifyYoutubeEnOwnerForPairing} from '../lib/practitioners/owner-telegram-video-youtube.mjs'
import {createMemoryYoutubeHistoryStore} from '../lib/youtube/upload-history-store.js'

const ID='8d998c778af3b563aa63233aa4fb4a06'
const CHANNEL='UC'+ 'a'.repeat(22)
const VIDEO='AbCdeF123_-' // 11-character YouTube fixture
const MEDIA_URL='https://files2.heygen.ai/movio/video/'+ID+'/a1/caption.mp4?Expires=123&Signature=secret'
const TOKEN='token'.repeat(10)
const mp4=Buffer.alloc(2048)
mp4.writeUInt32BE(24,0)
mp4.write('ftyp',4)
function okJson(data,status=200,headers={}){
 return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json',...headers}})
}
test('accept only signed captioned HeyGen media for the exact video, never arbitrary hosts',()=>{
 assert.equal(validHeygenMediaUrl(MEDIA_URL,ID),true)
 assert.equal(validHeygenMediaUrl(MEDIA_URL, 'f'.repeat(32)),false)
 assert.equal(validHeygenMediaUrl(MEDIA_URL.replace('https:','http:'),ID),false)
 assert.equal(validHeygenMediaUrl(MEDIA_URL.replace('files2.heygen.ai','evil.tld'),ID),false)
 assert.equal(validHeygenMediaUrl(MEDIA_URL.replace('caption.mp4','script.json'),ID),false)
 assert.equal(validatedYoutubeUploadLocation(
   'https://www.googleapis.com/upload/youtube/v3/videos?upload_id=one'),
   'https://www.googleapis.com/upload/youtube/v3/videos?upload_id=one')
 assert.equal(validatedYoutubeUploadLocation('https://evil.tld/upload/youtube/v3/videos'),null)
})
test('strict owner approval and YouTube metadata validation',()=>{
 assert.throws(()=>cleanHeygenPublication({videoId:ID,title:'hi',description:''}),
   /HEYGEN_APPROVAL_REQUIRED/)
 assert.throws(()=>cleanHeygenPublication({videoId:'bad',title:'hi',
   rightsConfirmed:true,privacyConfirmed:true}),/HEYGEN_INVALID_VIDEO_ID/)
 assert.throws(()=>cleanHeygenPublication({videoId:ID,title:'A'.repeat(101),
   rightsConfirmed:true,privacyConfirmed:true}),/HEYGEN_INVALID_TITLE/)
 assert.deepEqual(cleanHeygenPublication({videoId:ID,title:'  Personal video  ',
   description:'EN film',rightsConfirmed:true,privacyConfirmed:true,mediaUrl:MEDIA_URL}),
   {videoId:ID,title:'Personal video',description:'EN film',mediaUrl:MEDIA_URL})
})
test('completed HeyGen status must supply an actual captioned MP4; never substitute raw',async()=>{
 const fetcher=async()=>okJson({data:{status:'completed',video_url:MEDIA_URL}})
 await assert.rejects(resolveHeygenCaptionedUrl(ID,{apiKey:'test-api-key-12345',fetcher}),
   /HEYGEN_CAPTIONED_MEDIA_UNAVAILABLE/)
 const url=await resolveHeygenCaptionedUrl(ID,{
   apiKey:'test-api-key-12345',fetcher:async()=>okJson({
     data:{status:'completed',captioned_video_url:MEDIA_URL}})})
 assert.equal(url,MEDIA_URL)
 // Legacy v1 calls the burned-in captions video_url_caption. Never treat
 // caption_url (plain .srt) as media, and do not re-render the source.
 let calls=0
 const legacy=await resolveHeygenCaptionedUrl(ID,{
   apiKey:'test-api-key-12345',fetcher:async endpoint=>{
     calls++
     if(endpoint.includes('/v3/videos/'))return okJson({error:'legacy only'},404)
     return okJson({data:{status:'completed',video_url_caption:MEDIA_URL,
       caption_url:'https://files2.heygen.ai/subtitles.srt'}})
   }})
 assert.equal(legacy,MEDIA_URL)
 assert.equal(calls,2)
 assert.equal(await resolveHeygenCaptionedUrl(ID,{mediaUrl:MEDIA_URL}),MEDIA_URL)
})
test('English channel verifies both OAuth mine=true and current @aatapro handle',async()=>{
 let count=0
 const fetcher=async uri=>{
   count++
   assert.match(uri,/channels\?part=id&/)
   assert.match(uri,/mine=true|forHandle=%40aatapro/)
   return okJson({items:[{id:CHANNEL}]})
 }
 assert.equal(await verifyYoutubeEnOwner(TOKEN,CHANNEL,fetcher),CHANNEL)
 assert.equal(count,2)
 await assert.rejects(verifyYoutubeEnOwner(TOKEN,CHANNEL,async uri=>
   okJson({items:[{id:uri.includes('forHandle')?'UC'+'b'.repeat(22):CHANNEL}]})),
   /VIDEO_YOUTUBE_WRONG_CHANNEL/)
})
test('direct HeyGen captioned MP4 -> EN YouTube saves one ID, Unlisted only, no extra render',async()=>{
 const calls=[],providerId=VIDEO
 const fetcher=async(url,options={})=>{
   calls.push({url,method:options.method||'GET',headers:options.headers})
   if(url===MEDIA_URL&&options.method==='HEAD')return new Response(null,{
     headers:{'content-length':String(mp4.length),'content-type':'video/mp4'}})
   if(url===MEDIA_URL&&options.method==='GET')
     return new Response(mp4,{status:206,headers:{
       'content-length':String(mp4.length),
       'content-range':'bytes 0-'+(mp4.length-1)+'/'+mp4.length}})
   if(url.includes('uploadType=resumable')){
     assert.match(options.body,/"privacyStatus":"unlisted"/)
     assert.match(options.body,/"defaultLanguage":"en"/)
     assert.match(options.body,/"containsSyntheticMedia":true/)
     return okJson({},200,{location:'https://www.googleapis.com/upload/youtube/v3/videos?upload_id=abc'})
   }
   if(url.includes('upload_id=abc')){
     assert.equal(options.method,'PUT')
     assert.equal(options.headers['Content-Range'],'bytes 0-2047/2048')
     return okJson({id:providerId})
   }
   if(url.includes('/youtube/v3/videos?part=snippet,status')){
     return okJson({items:[{id:providerId,snippet:{channelId:CHANNEL},
       status:{privacyStatus:'unlisted',uploadStatus:'processed'}}]})
   }
   throw Error('UNEXPECTED_FETCH '+url)
 }
 let begin=0,videoId=null
 const result=await transferHeygenToEnglishYoutube({
   videoId:ID,title:'Holistic House - EN',description:'Narration by Tori',
   token:TOKEN,channelId:CHANNEL,mediaUrl:MEDIA_URL,fetcher,
   onUploadStart:async()=>{begin++},onVideoId:async id=>{videoId=id}})
 assert.equal(begin,1)
 assert.equal(videoId,VIDEO)
 assert.equal(result.id,VIDEO)
 assert.equal(result.privacyStatus,'unlisted')
 assert.equal(calls.filter(c=>c.url.includes('uploadType=resumable')).length,1)
 assert.equal(calls.filter(c=>c.method==='PUT').length,1)
})
test('wrong YouTube channel never passes readback',async()=>{
 await assert.rejects(verifyHeygenYoutubeUpload(VIDEO,TOKEN,CHANNEL,async()=>okJson({
   items:[{id:VIDEO,snippet:{channelId:'UC'+'b'.repeat(22)},
     status:{privacyStatus:'unlisted',uploadStatus:'processed'}}]})),
 /YOUTUBE_EN_WRONG_CHANNEL/)
})
test('server OAuth persists EN target independently and cannot reuse RU seal',()=>{
 const service=readFileSync(new URL('../lib/practitioners/owner-telegram-video-service.js',
   import.meta.url),'utf8')+'\n'+readFileSync(new URL('../lib/practitioners/owner-telegram-video-consent.js',import.meta.url),'utf8')
 const start=readFileSync(new URL('../app/api/admin/telegram-video/youtube/start/route.js',
   import.meta.url),'utf8')
 const callback=readFileSync(new URL('../app/api/admin/telegram-video/youtube/callback/route.js',
   import.meta.url),'utf8')
 const api=readFileSync(new URL('../app/api/admin/heygen-youtube/route.js',
   import.meta.url),'utf8')
 assert.match(service,/field:'telegram_video_oauth_en'/)
 assert.match(service,/values\(\$1,'en',\$2,\$3\)/)
 assert.match(service,/values\(\$1,'ru',\$2,\$3\)/)
 assert.match(service,/target==='ru'\?ENCRYPTION_CONTEXT:ENCRYPTION_CONTEXT_EN|ENCRYPTION_CONTEXT_EN/)
 assert.match(start,/searchParams.get\('target'\)/)
 assert.match(start,/visibility,target/)
 assert.match(callback,/verifyYoutubeEnOwner/)
 assert.match(callback,/target:'en'/)
 assert.match(api,/requireSameOrigin\(request,config\)/)
 assert.match(api,/after\(async\(\)=>/)
 assert.doesNotMatch(api,/METRICOOL|NEXT_PUBLIC_HEYGEN_API_KEY/)
})

test('first-time English OAuth can pair only the Google-owned @aatapro channel',async()=>{
 const good=async url=>{
   assert.match(url,/channels\?part=id&/)
   assert.match(url,/mine=true|forHandle=%40aatapro/)
   return okJson({items:[{id:CHANNEL}]})
 }
 assert.equal(await verifyYoutubeEnOwnerForPairing(TOKEN,good),CHANNEL)
 const store=createMemoryYoutubeHistoryStore()
 assert.equal((await store.channels()).en,null)
 assert.equal((await store.pairEnglish({id:CHANNEL,name:'AATA Pro',handle:'@aatapro'})).id,CHANNEL)
 assert.equal((await store.channels()).en.id,CHANNEL)
 await assert.rejects(store.pairEnglish({
   id:'UC'+'b'.repeat(22),name:'Other',handle:'@other'}),/channel_conflict/)
 const mismatch=async uri=>okJson({items:[{
   id:uri.includes('forHandle')?CHANNEL:'UC'+'b'.repeat(22)}]})
 await assert.rejects(verifyYoutubeEnOwnerForPairing(TOKEN,mismatch),
   /VIDEO_YOUTUBE_WRONG_CHANNEL/)
 const multiple=async uri=>okJson({items:uri.includes('forHandle')
   ?[{id:CHANNEL}]:[{id:CHANNEL},{id:'UC'+'b'.repeat(22)}]})
 await assert.rejects(verifyYoutubeEnOwnerForPairing(TOKEN,multiple),
   /VIDEO_YOUTUBE_WRONG_CHANNEL/)
 await assert.rejects(verifyYoutubeEnOwnerForPairing('short',good),
   /VIDEO_YOUTUBE_RECONNECT_REQUIRED/)
})
test('single Google connect never skips owner PKCE or English grant isolation',()=>{
 const callback=readFileSync(new URL('../app/api/admin/telegram-video/youtube/callback/route.js',import.meta.url),'utf8')
 const page=readFileSync(new URL('../app/admin/youtube-upload/page.js',import.meta.url),'utf8')
 const api=readFileSync(new URL('../app/api/admin/heygen-youtube/route.js',import.meta.url),'utf8')
 const state=callback.indexOf('ownerVideoOauthStateMatches(sealed,state)')
 const verified=callback.indexOf('verifyYoutubeEnOwnerForPairing(token.access_token)')
 const paired=callback.indexOf("history.pairEnglish({id:channel,name:'AATA Pro',handle:'@aatapro'})")
 const granted=callback.indexOf("saveOwnerVideoYoutubeConsent(config,token.refresh_token,channel,{visibility:editing,target:'en'})")
 assert.ok(state>0&&verified>state&&paired>verified&&granted>paired)
 assert.match(page,/href="\/api\/admin\/telegram-video\/youtube\/start\?target=en"/)
 assert.doesNotMatch(page,/telegramVideoConfigured&&initialChannels\.en&&<Link/)
 assert.match(api,/requireSameOrigin\(request,config\)/)
 assert.match(api,/rightsConfirmed/)
 assert.match(api,/privacyConfirmed/)
 assert.match(callback,/const channel=await verifyYoutubeRuOwner\(token.access_token\)/)
})

test('owner Google sign-in keeps English YouTube channel instead of returning to the default cabinet',()=>{
 const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
 const start=read('app/api/admin/telegram-video/youtube/start/route.js')
 const login=read('app/admin/login/page.js')
 const entry=read('components/practitioner-auto-entry.jsx')
 const destinations=read('lib/app/practitioner-access.js')
 const auth=read('app/api/app/[...path]/route.js')
 const callback=read('app/api/admin/telegram-video/youtube/callback/route.js')
 assert.ok(start.includes("target==='en'?'https://holistichouse.vercel.app/admin/login?destination=youtubeConnectEn'"))
 assert.ok(start.includes("'https://holistichouse.vercel.app/admin/login?destination=youtubeConnect'"))
 assert.ok(start.includes('if(!await requireAdminRequest())'))
 assert.ok(login.includes("'youtube','youtubeConnect','youtubeConnectEn'].includes(params?.destination)"))
 for(const text of [entry,destinations])
   assert.ok(text.includes("youtubeConnectEn: '/api/admin/telegram-video/youtube/start?target=en'"))
 assert.ok(entry.includes('if (response.redirectUrl !== ADMIN_DESTINATIONS[safeDestination])'))
 assert.ok(entry.includes('safeDestination'))
 assert.equal((auth.match(/'practitioner-youtubeConnectEn'/g)||[]).length,3)
 assert.ok(auth.includes("continueTo === 'practitioner-youtubeConnectEn'"))
 assert.ok(auth.includes('destination=youtubeConnectEn'))
 assert.ok(auth.includes('if (!practitionerEmailAllowed(actor) || !await repo.isPractitioner(actor))'))
 assert.ok(callback.includes('verifyYoutubeEnOwnerForPairing(token.access_token)'))
 assert.ok(callback.includes("saveOwnerVideoYoutubeConsent(config,token.refresh_token,channel,{visibility:editing,target:'en'})"))
 assert.ok(start.includes('if(!ownerVideoOauthConfigured())'))
})

// A direct mobile uploader URL must survive the Google owner-only login.
test('owner phone uploader login returns to uploader, not My Work',()=>{
 const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
 const page=read('app/admin/youtube-upload/page.js')
 const login=read('app/admin/login/page.js')
 const entry=read('components/practitioner-auto-entry.jsx')
 const access=read('lib/app/practitioner-access.js')
 const auth=read('app/api/app/[...path]/route.js')
 assert.ok(page.includes("if (!await requireAdminRequest()) redirect('/admin/login?destination=youtube')"))
 assert.ok(login.includes("'youtube','youtubeConnect','youtubeConnectEn'].includes(params?.destination)"))
 assert.ok(entry.includes("youtube: '/admin/youtube-upload'"))
 assert.ok(access.includes("youtube: '/admin/youtube-upload'"))
 assert.equal((auth.match(/'practitioner-youtube'/g)||[]).length,3)
 assert.ok(auth.includes("continueTo === 'practitioner-youtube'"))
 assert.ok(auth.includes("admin/login?destination=youtube"))
 assert.ok(auth.includes("if (!practitionerEmailAllowed(actor) || !await repo.isPractitioner(actor))"))
 assert.ok(auth.includes("issueTrustedAdminSession(response"))
 assert.ok(!login.includes('searchParams?.returnUrl'))
})
