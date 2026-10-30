import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {cleanHeygenPublication,validHeygenMediaUrl,resolveHeygenCaptionedUrl,
  transferHeygenToEnglishYoutube,verifyHeygenYoutubeUpload,
  validatedYoutubeUploadLocation} from '../lib/youtube/heygen-en-upload.mjs'
import {verifyYoutubeEnOwner} from '../lib/practitioners/owner-telegram-video-youtube.mjs'

const ID='8d998c778af3b563aa63233aa4fb4a06'
const CHANNEL='UC'+ 'a'.repeat(22)
const VIDEO='AbCdeF123_-' // 11-character YouTube fixture
const URL='https://files2.heygen.ai/movio/video/'+ID+'/a1/caption.mp4?Expires=123&Signature=secret'
const TOKEN='token'.repeat(10)
const mp4=Buffer.alloc(2048)
mp4.writeUInt32BE(24,0)
mp4.write('ftyp',4)
function okJson(data,status=200,headers={}){
 return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json',...headers}})
}
test('accept only signed captioned HeyGen media for the exact video, never arbitrary hosts',()=>{
 assert.equal(validHeygenMediaUrl(URL,ID),true)
 assert.equal(validHeygenMediaUrl(URL, 'f'.repeat(32)),false)
 assert.equal(validHeygenMediaUrl(URL.replace('https:','http:'),ID),false)
 assert.equal(validHeygenMediaUrl(URL.replace('files2.heygen.ai','evil.tld'),ID),false)
 assert.equal(validHeygenMediaUrl(URL.replace('caption.mp4','script.json'),ID),false)
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
   description:'EN film',rightsConfirmed:true,privacyConfirmed:true,mediaUrl:URL}),
   {videoId:ID,title:'Personal video',description:'EN film',mediaUrl:URL})
})
test('completed HeyGen status must supply an actual captioned MP4; never substitute raw',async()=>{
 const fetcher=async()=>okJson({data:{status:'completed',video_url:URL}})
 await assert.rejects(resolveHeygenCaptionedUrl(ID,{apiKey:'test-api-key-12345',fetcher}),
   /HEYGEN_CAPTIONED_MEDIA_UNAVAILABLE/)
 const url=await resolveHeygenCaptionedUrl(ID,{
   apiKey:'test-api-key-12345',fetcher:async()=>okJson({
     data:{status:'completed',captioned_video_url:URL}})})
 assert.equal(url,URL)
 assert.equal(await resolveHeygenCaptionedUrl(ID,{mediaUrl:URL}),URL)
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
   if(url===URL&&options.method==='HEAD')return new Response(null,{
     headers:{'content-length':String(mp4.length),'content-type':'video/mp4'}})
   if(url===URL&&options.method==='GET')
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
   token:TOKEN,channelId:CHANNEL,mediaUrl:URL,fetcher,
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
   import.meta.url),'utf8')
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
