// Owner-authorized acceptance only. Never publishes/hides videos or reads clients.
// PIN is RSA-OAEP sealed to an ephemeral runner key, never a workflow input.
import assert from 'node:assert/strict'
import { generateKeyPairSync, privateDecrypt, constants, createHash } from 'node:crypto'
import { mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { isDeepStrictEqual } from 'node:util'
const origin = 'https://holistichouse.vercel.app'
const branch = 'codex/site-video-live-acceptance'
const repo = 'andylitvinov-design/books'
const runId = process.env.GITHUB_RUN_ID
const work = '/tmp/holistic-video-acceptance'
const keyPath = '/tmp/holistic-video-acceptance-private.pem'
const approvedId = 'fd5fcead9b067f9a0649862675a38771'
assert.equal(process.env.CI, 'true', 'Use an isolated CI runner')
assert.equal(process.env.GITHUB_REPOSITORY, repo)
assert.equal(process.env.GITHUB_REF_NAME, branch)
mkdirSync(work, { recursive: true })
if (process.argv.includes('--prepare-key')) {
  const pair = generateKeyPairSync('rsa', { modulusLength: 3072 })
  writeFileSync(keyPath, pair.privateKey.export({type:'pkcs8',format:'pem'}), {mode:0o600})
  writeFileSync(`${work}/public-channel.json`, JSON.stringify({runId, commit:process.env.GITHUB_SHA, publicKey:pair.publicKey.export({type:'spki',format:'pem'})}))
  process.exit(0)
}
const {chromium, expect} = await import('/tmp/video-browser-tools/node_modules/@playwright/test/index.mjs')
const {SITE_VIDEO_SLOTS} = await import('../lib/site-videos/model.js')
const results = {date:new Date().toISOString(), runId, origin, checks:[], boundaries:['No new renders, uploads, public video publications or client-record changes.', 'Audio verification is decoded-stream evidence, not a subjective listening/pronunciation assessment.']}
const pause = ms => new Promise(resolve=>setTimeout(resolve,ms))
function persist(){writeFileSync(`${work}/results.json`,JSON.stringify(results,null,2))}
async function check(label,fn){
  try { const detail = await fn(); results.checks.push({label,ok:true,...detail}); console.log(`PASS: ${label}`) }
  catch(e){results.checks.push({label,ok:false,error:String(e.message).split('\n')[0].slice(0,220)});console.log(`FAIL: ${label}`)}
  persist()
}
let browser
async function open(page,path){ const r=await page.goto(origin+path,{waitUntil:'domcontentloaded',timeout:60000}); assert.equal(r?.status(),200,'Page did not return HTTP 200');await expect(page.locator('main').first()).toBeVisible() }
async function publicFingerprint(page){return createHash('sha256').update(await page.locator('main').first().innerText()).digest('hex')}
async function serverRecords(page){
  return page.evaluate(()=>{
    const stream=(window.__next_f||[]).filter(x=>x[0]===1).map(x=>x[1]).join('')
    for(const line of stream.split('\n')){
      try {const root=JSON.parse(line.slice(line.indexOf(':')+1));const stack=[root]
        while(stack.length){const item=stack.pop();if(!item||typeof item!=='object')continue
          if(Array.isArray(item.initialRecords))return item.initialRecords
          for(const value of Object.values(item))if(value&&typeof value==='object')stack.push(value)
        }
      }catch{/* Other Flight records include module references, not JSON. */}
    }
    return null
  })
}
async function receivePin(){
  const endpoint=`https://api.github.com/repos/${repo}/contents/.qa/sealed-${runId}.json?ref=${encodeURIComponent(branch)}`
  let envelope
  for(let i=0;i<90;i++){
    const r=await fetch(endpoint,{headers:{Authorization:`Bearer ${process.env.GITHUB_TOKEN}`,Accept:'application/vnd.github+json'},signal:AbortSignal.timeout(10000)})
    if(r.ok){const file=await r.json();envelope=JSON.parse(Buffer.from(file.content,'base64').toString());break}
    assert.equal(r.status,404,'Credential handoff read failed');await pause(5000)
  }
  assert.ok(envelope&&envelope.runId===runId,'No sealed credential for this runner')
  const plain=privateDecrypt({key:readFileSync(keyPath),padding:constants.RSA_PKCS1_OAEP_PADDING,oaepHash:'sha256'},Buffer.from(envelope.ciphertext,'base64'))
  rmSync(keyPath,{force:true})
  const data=JSON.parse(plain.toString());plain.fill(0)
  assert.ok(data.runId===runId && data.expiresAt>Date.now(),'Expired credential handoff')
  assert.ok(typeof data.pin==='string' && data.pin.length>0 && !/[\r\n]/.test(data.pin),'Invalid sealed credential')
  console.log(`::add-mask::${data.pin}`)
  return data.pin
}
async function playVideo(page,wrapper,label,complete=false){
  const iframe=wrapper.locator('iframe')
  assert.equal(await iframe.count(),0,'Player was loaded before click')
  await wrapper.locator('button').first().click()
  await expect(iframe).toHaveCount(1)
  const source=await iframe.getAttribute('src')
  const host=new URL(source).hostname
  assert.ok(['app.heygen.com','www.youtube-nocookie.com'].includes(host),'Unexpected player provider')
  let frame,video
  for(let i=0;i<45;i++){
    frame=await (await iframe.elementHandle())?.contentFrame()
    if(frame && await frame.locator('video').count()){video=frame.locator('video').first();break}
    await pause(1000)
  }
  if(!video){
    await wrapper.screenshot({path:`${work}/${label}-not-ready.png`})
    results.providerObservation={label,host,text:frame?(await frame.locator('body').innerText().catch(()=>'' )).slice(0,800):'No frame'}
    throw new Error('Provider did not expose a playable video within 45 seconds')
  }
  const initial=await video.evaluate(v=>({time:v.currentTime,paused:v.paused}))
  if(initial.paused){
    const play=frame.getByRole('button',{name:/^(play|play video|воспроизвести|смотреть)$/i}).first()
    if(await play.isVisible().catch(()=>false))await play.click()
    else await video.click({force:true})
  }
  await frame.waitForFunction(()=>{const v=document.querySelector('video');return v&&!v.paused&&v.currentTime>1&&v.videoWidth>0&&v.readyState>=2},{},{timeout:30000})
  const start=await video.evaluate(v=>({time:v.currentTime,audio:v.webkitAudioDecodedByteCount||0,muted:v.muted,volume:v.volume}))
  await pause(3000)
  const during=await video.evaluate(v=>({time:v.currentTime,audio:v.webkitAudioDecodedByteCount||0,muted:v.muted,volume:v.volume,width:v.videoWidth,height:v.videoHeight,duration:v.duration,error:v.error?.code||null,frames:v.getVideoPlaybackQuality?.().totalVideoFrames||0}))
  assert.ok(during.time>start.time+1 && !during.error,'Video timeline did not advance')
  await wrapper.screenshot({path:`${work}/${label}-playing.png`})
  let ended=false
  if(complete && during.duration<180){await frame.waitForFunction(()=>document.querySelector('video')?.ended,{},{timeout:150000});ended=true}
  return {provider:host,width:during.width,height:during.height,duration:during.duration,timelineAdvanced:true,decodedFrames:during.frames,audioDecoded:during.audio>0,audioBytesAdvanced:during.audio>start.audio,unmuted:!during.muted&&during.volume>0,ended}
}
try{
  browser=await chromium.launch({headless:true})
  const guest=await browser.newContext({viewport:{width:1365,height:1000},serviceWorkers:'block'})
  const page=await guest.newPage()
  await open(page,'/en/about')
  const originalPublic=await publicFingerprint(page)
  await check('Existing About intro streams through its end',async()=>playVideo(page,page.locator('#psychic-alchemy-video'),'about-intro',true))
  await open(page,'/en/about')
  const testimonialCount=await page.locator('.site-video-player').count()
  for(let i=0;i<testimonialCount;i++)await check(`Existing testimonial ${i+1} streams`,async()=>{await open(page,'/en/about');return playVideo(page,page.locator('.site-video-player').nth(i),`testimonial-${i+1}`)})
  await check('Mobile About intro streams',async()=>{await page.setViewportSize({width:390,height:844});await open(page,'/en/about');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'Horizontal overflow');return playVideo(page,page.locator('#psychic-alchemy-video'),'about-mobile')})
  await check('Production owner login, unchanged draft save and durable readback',async()=>{
    let pin=await receivePin()
    const admin=await browser.newContext({viewport:{width:1365,height:1000},serviceWorkers:'block'})
    try{
      // Prevent speculative prefetch of any unrelated practitioner/client page.
      await admin.route('**/*',route=>{const u=new URL(route.request().url());if(u.origin===origin && u.pathname.startsWith('/admin')&&!['/admin/login','/admin/videos'].includes(u.pathname))return route.fulfill({status:204,body:''});return route.continue()})
      const editor=await admin.newPage()
      await open(editor,'/admin/login')
      const hidden=await editor.locator('form input[type="hidden"]').evaluateAll(items=>Object.fromEntries(items.map(x=>[x.name,x.value])))
      assert.ok(Object.keys(hidden).some(x=>x.startsWith('$ACTION_ID_')),'Expected the normal login form')
      // Real login, one attempt only; do not follow /admin into client dashboard.
      const response=await admin.request.post(origin+'/admin/login',{multipart:{...hidden,accessCode:pin},headers:{Origin:origin,Referer:origin+'/admin/login'},maxRedirects:0,timeout:30000})
      pin=null
      assert.ok(response.status()===303&&response.headers().location==='/admin','The approved login credential was not accepted')
      await open(editor,'/admin/videos')
      await expect(editor.locator('.site-video-manager')).toBeVisible()
      const before=(await serverRecords(editor))?.find(r=>r.key==='about-intro:en')
      assert.ok(before&&before.published?.heygenId===approvedId,'Existing approved publication was not found; no write performed')
      await editor.locator('.prescription-admin-header button[lang="en"]').click()
      await expect(editor.locator('.site-video-manager')).toHaveAttribute('lang','en')
      await editor.locator('.site-video-placement-list button').filter({hasText:SITE_VIDEO_SLOTS.find(x=>x.id==='about-intro').label.en}).click()
      assert.equal(await editor.getByText('Video storage is currently unavailable.',{exact:false}).count(),0,'Production storage unavailable')
      const fields=()=>editor.locator('.site-video-editor input[name],.site-video-editor textarea[name],.site-video-editor select[name]').evaluateAll(nodes=>Object.fromEntries(nodes.filter(x=>x.name!=='reviewed').map(x=>[x.name,x.value])))
      const originalFields=await fields()
      assert.ok(originalFields.title && originalFields.youtubeUrl,'About draft is empty; no write performed')
      await editor.getByRole('button',{name:'Save draft',exact:true}).click()
      await expect(editor.locator('[aria-live="polite"]')).toContainText('Draft saved.',{timeout:15000})
      await editor.reload({waitUntil:'domcontentloaded'})
      const after=(await serverRecords(editor))?.find(r=>r.key==='about-intro:en')
      assert.ok(after&&after.revision===before.revision+1,'Persisted revision was not read back')
      assert.ok(isDeepStrictEqual(after.published,before.published),'Publication changed unexpectedly')
      if(await editor.locator('.site-video-manager').getAttribute('lang')!=='en')await editor.locator('.prescription-admin-header button[lang="en"]').click()
      await editor.locator('.site-video-placement-list button').filter({hasText:SITE_VIDEO_SLOTS.find(x=>x.id==='about-intro').label.en}).click()
      assert.ok(isDeepStrictEqual(await fields(),originalFields),'Draft fields did not round-trip')
      await page.setViewportSize({width:1365,height:1000})
      await open(page,'/en/about')
      assert.ok((await publicFingerprint(page))===originalPublic,'Public page content changed')
      return {loginAccepted:true,storageWritable:true,revisionBefore:before.revision,revisionAfter:after.revision,draftFieldsUnchanged:true,publishedSnapshotUnchanged:true,publicPageUnchanged:true}
    }finally{pin=null;await admin.clearCookies();await admin.close()}
  })
  await guest.close()
}finally{if(browser)await browser.close();rmSync(keyPath,{force:true});persist()}
if(results.checks.some(x=>!x.ok))process.exitCode=1
