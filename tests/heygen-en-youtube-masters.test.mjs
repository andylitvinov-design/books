import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {
  ENGLISH_YOUTUBE_MASTERS,ENGLISH_HEYGEN_INTRO_ID,approvedEnglishRawMaster,
  verifiedEnglishIntroYoutubeId,
} from '../lib/youtube/english-master-catalog.mjs'
import {resolveHeygenCaptionedUrl} from '../lib/youtube/heygen-en-upload.mjs'

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const expectedIds=[
 '8d998c778af3b563aa63233aa4fb4a06',
 'ed202847a43a96b918308aa972177b34',
 '48105a2f2228e7cb3a67391e97acaf8b',
 '34df311e461509433b45929908a9097a',
 '8c1634ce904434a91931429b6a7eefe1',
 '7c6b243f048b9c0581ae29619a4a89fc',
 'fd5fcead9b067f9a0649862675a38771'
]
const signed=id=>'https://files2.heygen.ai/aws_pacific/avatar_tmp/aabb/'+id+'.mp4?Expires=123&Signature=test'

test('only seven verified final EN masters, not superseded tests, get batch admission',()=>{
 assert.deepEqual(ENGLISH_YOUTUBE_MASTERS.map(x=>x.videoId),expectedIds)
 assert.equal(new Set(expectedIds).size,7)
 assert.equal(ENGLISH_HEYGEN_INTRO_ID,expectedIds[0])
 for(const m of ENGLISH_YOUTUBE_MASTERS){
   assert.ok(m.title.length>=8&&m.title.length<=100)
   assert.ok(m.description.length>16&&m.description.length<3000)
   assert.ok(m.durationSeconds>=20&&m.durationSeconds<120)
 }
 assert.equal(approvedEnglishRawMaster(expectedIds[0]),false)
 for(const id of expectedIds.slice(1))assert.equal(approvedEnglishRawMaster(id),true)
 assert.equal(approvedEnglishRawMaster('67dba8e5c58745b6bd7ad39b03b5118e'),false)
 assert.equal(approvedEnglishRawMaster('f'.repeat(32)),false)
})
test('only approved final EN ID can use original MP4 when no captioned version exists',async()=>{
 const allow=expectedIds[1],raw=signed(allow)
 const fetcher=async()=>new Response(JSON.stringify({
   data:{status:'completed',video_url:raw}
 }),{status:200,headers:{'content-type':'application/json'}})
 assert.equal(await resolveHeygenCaptionedUrl(allow,{apiKey:'test-api-key-12345',fetcher}),raw)
 await assert.rejects(resolveHeygenCaptionedUrl(ENGLISH_HEYGEN_INTRO_ID,{
   apiKey:'test-api-key-12345',
   fetcher:async()=>new Response(JSON.stringify({
      data:{status:'completed',video_url:signed(ENGLISH_HEYGEN_INTRO_ID)}
   }),{status:200,headers:{'content-type':'application/json'}})
 }),/HEYGEN_CAPTIONED_MEDIA_UNAVAILABLE/)
 await assert.rejects(resolveHeygenCaptionedUrl('f'.repeat(32),{
   apiKey:'test-api-key-12345',fetcher,
 }),/HEYGEN_CAPTIONED_MEDIA_UNAVAILABLE/)
})
test('paired channel and permanent receipt both required to expose Unlisted EN intro',()=>{
 const channel={id:'UC'+'a'.repeat(22),handle:'@aatapro'}
 const receipt=JSON.stringify({videoId:'AbCdeF123_-',channelId:channel.id})
 assert.equal(verifiedEnglishIntroYoutubeId(receipt,channel),'AbCdeF123_-')
 assert.equal(verifiedEnglishIntroYoutubeId(receipt,{id:'UC'+'b'.repeat(22)}),null)
 assert.equal(verifiedEnglishIntroYoutubeId('garbage',channel),null)
 assert.equal(verifiedEnglishIntroYoutubeId(JSON.stringify({
   videoId:'not-a-YouTube-ID',channelId:channel.id}),channel),null)
})
test('protected all-masters admin action is user-triggered, sequential and never schedules cron',()=>{
 const source=read('components/heygen-en-youtube-catalog.jsx')
 const admin=read('app/admin/youtube-upload/page.js')
 const api=read('app/api/admin/heygen-youtube/route.js')
 assert.match(admin, /<HeygenEnYoutubeCatalog locale=\{locale\}/)
 assert.match(source, /data-heygen-en-catalog/)
 assert.match(source, /rightsConfirmed:true,privacyConfirmed:true/)
 assert.match(source, /if\(stopped.current\)break/)
 assert.match(source, /for\(const master of ENGLISH_YOUTUBE_MASTERS\)/)
 assert.match(source, /if\(isUploaded\(job\)\)/)
 assert.match(source, /connected&&configured&&rights&&unlisted/)
 assert.match(api,/ownerMaterialRequest\(request/)
 assert.match(api,/requireSameOrigin\(request,config\)/)
 assert.doesNotMatch(source,/setInterval\(|setTimeout\(.*publish/)
})
test('public profile switches to exact verified EN channel mirror without token or private data',()=>{
 const api=read('app/api/public/english-intro-video/route.js')
 const player=read('components/app/profile-presentation-player.jsx')
 const profile=read('components/app/profile-hub-tabs.jsx')
 assert.match(api,/verifiedEnglishIntroYoutubeId\(receipt,channels.en\)/)
 assert.match(api,/youtubeId\}/)
 assert.match(api,/max-age=0, s-maxage=60/)
 assert.doesNotMatch(api,/refreshToken|token_ciphertext|channelId\s*:/)
 assert.match(player,/fetch\('\/api\/public\/english-intro-video'/)
 assert.match(player, /youtubeReady/)
 assert.match(player, /<SiteVideoPlayer key=/)
 assert.match(profile, /<ProfilePresentationPlayer key=\{selected\}/)
})

test('all public English HeyGen masters require exact paired English-channel YouTube receipts',()=>{
 const endpoint=read('app/api/public/english-intro-video/route.js')
 const player=read('components/site-video-player.tsx')
 assert.ok(endpoint.includes("params.getAll('videoId')"))
 assert.ok(endpoint.includes("ENGLISH_YOUTUBE_MASTERS.some(master=>master.videoId===videoId)"))
 assert.ok(endpoint.includes("verifiedEnglishIntroYoutubeId(receipt,channels.en)"))
 assert.ok(!endpoint.includes('token_ciphertext'))
 assert.ok(!endpoint.includes('refreshToken'))
 assert.ok(player.includes('const englishYoutubeOnly = isHeygen && video.language === "en"'))
 assert.ok(player.includes('verifiedEnglishYoutubeId'))
 assert.ok(player.includes('resolveVerifiedEnglishYouTubeId(video.heygenId,controller.signal)'))
 assert.ok(player.includes('englishYoutubeOnly ? null : `https://app.heygen.com'))
 assert.ok(player.includes('data-english-video-source="youtube"'))
 assert.ok(!player.includes('className="site-video-ai-badge"'))
 assert.ok(player.includes('{isHeygen&&<p>{aiDisclosure}</p>}'))
});


test('EN method landings never render archival HeyGen and retain real receipt and i18n checks',()=>{
 const service=read('components/service-video-showcase.tsx')
 const player=read('components/site-video-player.tsx')
 const browser=read('scripts/verify-site-video-browser.mjs')
 assert.match(service,/video\.video\.heygenId && video\.video\.language !== "en"/)
 assert.match(player,/englishChecking:/)
 assert.match(player,/englishUnavailable:/)
 for (const locale of ['ru','es']) assert.ok(player.includes(locale==='ru'
   ? 'Проверяем подтверждённое английское видео' : 'Comprobando el vídeo inglés'))
 assert.match(browser,/LIVE English upload receipt missing/)
 assert.match(browser,/LOCAL_UI_FIXTURE_ONLY_NO_PROVIDER_PROOF/)
 assert.match(browser,/data-english-video-source="youtube"/)
 assert.match(browser,/a\[href\^="https:\/\/app\.heygen\.com"\]/)
 assert.match(browser,/url\.searchParams\.get\('videoId'\)===englishMasterId/)
 assert.match(browser,/if\(isolatedRoute\)await page\.unroute\(isolatedRoute\)/)
 assert.doesNotMatch(browser,/new RegExp\(\`.*app\.heygen\.com\/embeds/)
})
