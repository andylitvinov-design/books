import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {GET} from '../app/api/session-video-thumbnail/[videoId]/route.js'

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const videoId='AbCdEfGhIj0'

test('poster request uses only the bounded first-party YouTube ID, not a user URL',async()=>{
  let calls=0,requested=''
  const original=globalThis.fetch
  const jpg=Uint8Array.from([255,216,255,224,...new Array(40).fill(70)])
  try{
    globalThis.fetch=async(url,opts)=>{
      calls++;requested=url
      assert.equal(opts.redirect,'error')
      assert.equal(opts.method,'GET')
      return new Response(jpg,{status:200,headers:{
        'Content-Type':'image/jpeg','Content-Length':String(jpg.length),
      }})
    }
    const result=await GET(new Request('https://holistichouse.vercel.app/api/session-video-thumbnail/'+videoId),
      {params:Promise.resolve({videoId})})
    assert.equal(result.status,200)
    assert.equal(result.headers.get('Content-Type'),'image/jpeg')
    assert.match(result.headers.get('Cache-Control'),/public/)
    assert.equal(result.headers.get('X-Content-Type-Options'),'nosniff')
    assert.equal(requested,'https://i.ytimg.com/vi/'+videoId+'/hqdefault.jpg')
    assert.equal(calls,1)
    const response=new Uint8Array(await result.arrayBuffer())
    assert.equal(response[0],0xff)
    assert.equal(response[1],0xd8)
  }finally {globalThis.fetch=original}
})

test('thumbnail route rejects arbitrary URLs/unsafe IDs before making network requests',async()=>{
  const original=globalThis.fetch
  let calls=0
  globalThis.fetch=()=>{calls++;throw Error('Should not fetch')}
  try{
    for(const videoId of [
      '../bad', 'aaa/bbbcccc','https://evil.example','too-long-image-id',
      '%2fsecret%2f','x'.repeat(100),'',
    ]){
      const result=await GET(new Request('https://holistichouse.vercel.app'),
        {params:Promise.resolve({videoId})})
      assert.equal(result.status,404,videoId)
    }
    assert.equal(calls,0)
  }finally{globalThis.fetch=original}
})

test('YouTube upstream HTML, failures and overlarge files never turn into a public image proxy',async()=>{
  const original=globalThis.fetch
  try{
    for(const response of [
      new Response('<h1>Not a picture</h1>',{status:200,headers:{'Content-Type':'text/html'}}),
      new Response(null,{status:404}),
      new Response(new Uint8Array(32),{status:200,headers:{'Content-Type':'image/jpeg'}}),
      new Response(null,{status:200,headers:{
        'Content-Type':'image/jpeg','Content-Length':'600000',
      }}),
    ]){
      globalThis.fetch=async()=>response
      const result=await GET(new Request('https://holistichouse.vercel.app'),
        {params:Promise.resolve({videoId})})
      assert.equal(result.status,404)
      assert.equal(result.headers.get('Cache-Control'),'no-store')
    }
  }finally{globalThis.fetch=original}
})

test('YouTube card shows its own frame before Play without early third-party iframe',()=>{
  const s=read('components/session-youtube-player.jsx')
  assert.match(s,/const \[started,setStarted\]=useState\(false\)/)
  assert.match(s,/className=\{styles\.youtubeLessonThumbnail\}/)
  assert.match(s,/\/api\/session-video-thumbnail\/'\+parsed\.id/)
  assert.match(s,/onError=\{\(\)=>setThumbnailFailed\(true\)\}/)
  assert.match(s,/started\?/)
  assert.match(s,/https:\/\/www\.youtube-nocookie\.com\/embed\//)
  assert.doesNotMatch(s,/https:\/\/i\.ytimg\.com|autoplay=1/)
})

test('a private-video still is captured locally from authorized first-party range playback',()=>{
  const poster=read('components/session-private-video-poster.jsx')
  const reader=read('components/client-session-page.jsx')
  const css=read('components/client-session.module.css')
  assert.match(poster,/IntersectionObserver/)
  assert.match(poster,/ctx\.drawImage\(probe,0,0,width,height\)/)
  assert.match(poster,/canvas\.toDataURL\('image\/jpeg',0\.76\)/)
  assert.match(poster,/probe\.currentTime=time/)
  assert.match(poster,/muted playsInline preload="none"/)
  assert.match(poster,/probe\.removeAttribute\('src'\)/)
  assert.doesNotMatch(poster,/youtube|Cloudflare|fetch\(|upload\(|transcript|api\/session-video-thumbnail/i)
  assert.match(reader,/SessionPrivateVideoPoster src=\{route\}/)
  assert.match(reader,/className=\{styles\.privateVideoPreview\}/)
  assert.match(reader,/className=\{styles\.privateVideoPreviewButton\}/)
  assert.match(css,/\.youtubeLessonThumbnail/)
  assert.match(css,/\.privateVideoStillFrame/)
})

test('the original signed report, PDF, access scopes, and video-first layout are unchanged',()=>{
  const reader=read('components/client-session-page.jsx')
  const middle=read('middleware.ts')
  assert.ok(reader.indexOf('id="session-video"')>reader.indexOf('className={styles.clientHeader}'))
  assert.ok(reader.indexOf('id="session-video"')<reader.indexOf('id="session-report"'))
  assert.match(reader,/className=\{styles\.fullReportContent\}>\{reportContent\}/)
  assert.equal((reader.match(/href=\{pdfPath\}/g)||[]).length,1)
  assert.match(reader,/mode==='guest'\?'\/api\/client-session-viewer\/'/)
  assert.match(reader,/mode==='saved'\?'\/api\/app\/saved-sessions\/'/)
  assert.match(middle,/img-src 'self' data:/)
  assert.match(middle,/frame-src https:\/\/www\.youtube-nocookie\.com/)
})
