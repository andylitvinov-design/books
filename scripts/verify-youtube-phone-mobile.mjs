// Isolated local browser QA: only synthetic practitioner credentials, no Google
// access, no YouTube uploads, no production writes, and no remote cookies.
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {mkdirSync} from 'node:fs'
import {chromium, webkit, expect} from '@playwright/test'

const origin = 'http://127.0.0.1:3157'
const evidence = '/tmp/youtube-phone-mobile-evidence'
const PIN = 'isolated-youtube-mobile-qa-only'
mkdirSync(evidence, {recursive:true})
let app
const browsers = []
const wait = ms => new Promise(resolve => setTimeout(resolve,ms))
async function boot() {
  app = spawn(process.execPath,['node_modules/next/dist/bin/next','start','-p','3157','-H','127.0.0.1'],{
    env:{
      ...process.env,
      NEXT_TELEMETRY_DISABLED:'1',
      PRESCRIPTIONS_ADMIN_PIN:PIN,
      PRESCRIPTIONS_ADMIN_TOKEN:'',
      // No production Redis/YouTube credentials in this test.
      PRESCRIPTIONS_KV_REST_API_URL:'',
      PRESCRIPTIONS_KV_REST_API_TOKEN:'',
      HH_YOUTUBE_UPLOAD_OAUTH_CLIENT_ID:'',
      HH_YOUTUBE_PHONE_UPLOAD_ENABLED:'false',
    },
    stdio:['ignore','pipe','pipe'],
  })
  let output = ''
  for(const stream of [app.stdout,app.stderr]) {
    stream.on('data',value => {output=(output+value.toString()).slice(-5000)})
  }
  for(let attempt=0;attempt<90;attempt++) {
    try {
      const response=await fetch(origin+'/admin/login')
      if(response.ok)return
    }catch{}
    if(app.exitCode!==null)throw new Error('Next server exited: '+output)
    await wait(1000)
  }
  throw new Error('Local app did not start: '+output)
}

async function verify(browserType,engine,width,height){
  const browser=await browserType.launch({headless:true})
  browsers.push(browser)
  const context=await browser.newContext({
    viewport:{width,height},isMobile:width<=430,hasTouch:width<=430,
    deviceScaleFactor:width<=430?3:1,serviceWorkers:'block',
    reducedMotion:'reduce',
  })
  const page=await context.newPage()
  const errors=[]
  let uploaderNavigations = 0
  page.on('framenavigated',frame => {
    if (frame === page.mainFrame() && /^\/admin\/youtube-upload\/?$/.test(new URL(frame.url()).pathname)) {
      uploaderNavigations += 1
    }
  })
  page.on('pageerror',err=>errors.push(err.message))
  await page.goto(origin+'/admin/login',{waitUntil:'domcontentloaded'})
  await page.locator('input[name="accessCode"]').fill(PIN)
  await page.getByRole('button',{name:/continue|продолжить/i}).click()
  await expect(page).toHaveURL(/\/admin(?:\/)?$/,{timeout:15000})
  // Next.js/admin shell can keep passive connections open. DOM readiness plus
  // explicit visible landmarks is the reliable mobile/WebKit acceptance gate.
  const response=await page.goto(origin+'/admin/youtube-upload',{waitUntil:'domcontentloaded',timeout:30000})
  assert.equal(response.status(),200)
  const root=page.locator('[data-youtube-upload-page]')
  await expect(root).toBeVisible({timeout:15000})
  // Previously this route's CSP class was incorrectly classified as 'private'
  // by client navigation while middleware sent 'youtube-uploader'. That caused
  // recursive location.replace() and an unscrollable, jittering iPhone sheet.
  // A legitimate first cross-policy navigation may replace one document
  // (login -> admin -> OAuth-scoped route). What must never happen is a cycle.
  await wait(850)
  const settledNavigationCount = uploaderNavigations
  await wait(850)
  assert.ok(settledNavigationCount >= 1 && settledNavigationCount <= 2,
    engine+' '+width+' unexpected uploader navigation sequence: '+settledNavigationCount)
  assert.equal(uploaderNavigations,settledNavigationCount,
    engine+' '+width+' uploader keeps replacing itself after hydration')
  assert.equal(await page.evaluate(() => document.body.dataset.cspClass),'youtube-uploader',
    engine+' '+width+' document CSP class mismatch')
  console.log('Mobile QA: stable admin page in '+engine+' '+width+'px, navigation count '+uploaderNavigations)
  await expect(page.getByRole('heading',{name:'Phone → YouTube'})).toBeVisible()
  await expect(page.locator('input[type="file"]')).toHaveCount(1)

  const initial=await page.evaluate(()=>{
    const root=document.querySelector('[data-youtube-upload-page]')
    const hero=document.querySelector('h1')
    const uploader=document.querySelector('section[aria-label="Holistic House YouTube uploader"]')
    return {
      htmlWidth:document.documentElement.scrollWidth,
      viewportWidth:window.innerWidth,
      heroFont:parseFloat(getComputedStyle(hero).fontSize),
      scrollOverflow:getComputedStyle(root).overflowY,
      uploaderTop:uploader.getBoundingClientRect().top,
      documentHeight:document.documentElement.scrollHeight,
    }
  })
  assert.ok(initial.htmlWidth<=initial.viewportWidth+2,engine+' '+width+' horizontal overflow '+JSON.stringify(initial))
  if(width<=430){
    assert.ok(initial.heroFont<=31,engine+' '+width+' giant global heading '+JSON.stringify(initial))
    assert.ok(initial.uploaderTop<=310,engine+' '+width+' uploader still buried by navigation '+JSON.stringify(initial))
    assert.equal(initial.scrollOverflow,'visible',engine+' '+width+' uploader creates nested scrollport')
    await expect(page.locator('nav[aria-label="Cabinet links"], nav[aria-label="Разделы кабинета"]')).toBeVisible()
  }
  // Native disclosures: no sticky layer or scroll event handler. Expand enough
  // content to reproduce the user's "can't get below the first screen" report.
  const advanced=page.locator('details').filter({has:page.locator('summary').filter({hasText:/Video settings|Параметры видео/})}).first()
  const history=page.locator('details').filter({has:page.locator('summary').filter({hasText:/Uploaded video links|История загруженных видео/})}).first()
  const safety=page.locator('details').filter({has:page.locator('summary').filter({hasText:/Privacy and upload guidelines|Конфиденциальность/})}).first()
  await advanced.locator('summary').click()
  await history.locator('summary').click()
  await safety.locator('summary').click()
  for (const disclosure of [advanced,history,safety]) await expect(disclosure).toHaveAttribute('open','')
  const expanded=await page.evaluate(()=>({
    docHeight:document.documentElement.scrollHeight,
    viewportHeight:window.innerHeight,
    details:document.querySelectorAll('details[open]').length,
  }))
  assert.ok(expanded.docHeight>expanded.viewportHeight+140,engine+' '+width+' not enough content to test scroll')
  await page.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight))
  await wait(170)
  const bottom=await page.evaluate(()=>{
    const end=document.querySelector('details[class*="safetyDisclosure"]')
    const rect=end.getBoundingClientRect()
    const root=document.scrollingElement
    return {
      scrollY:window.scrollY,rootScrollTop:root.scrollTop,
      scrollHeight:root.scrollHeight,innerHeight:innerHeight,
      bottomOnscreen:rect.bottom,docWidth:document.documentElement.scrollWidth,
    }
  })
  assert.ok(bottom.rootScrollTop>100,engine+' '+width+' cannot scroll down '+JSON.stringify(bottom))
  assert.ok(bottom.docWidth<=width+2,engine+' '+width+' overflow after disclosure')
  assert.ok(bottom.bottomOnscreen<height-45,engine+' '+width+' final safety block obscured by bottom toolbar '+JSON.stringify(bottom))
  await page.screenshot({path:`${evidence}/${engine}-${width}-bottom.png`,fullPage:true})
  await page.evaluate(()=>window.scrollTo(0,0))
  await wait(150)
  await page.screenshot({path:`${evidence}/${engine}-${width}-top.png`})
  assert.deepEqual(errors,[],engine+' '+width+' page JavaScript errors')
  await context.close()
  console.log('PASS '+engine+' '+width+'x'+height+': compact hero, normal page scroll, native disclosures, bottom safe space')
}
try{
  await boot()
  for (const [browserType,engine] of [[chromium,'chromium'],[webkit,'webkit']]){
    for(const [width,height] of [[320,620],[390,720],[430,932],[1365,900]]) {
      await verify(browserType,engine,width,height)
    }
  }
  console.log('PASS 8 actual browser mobile/desktop page journeys')
}catch(err){console.error(err);process.exitCode=1}
finally{
  for(const browser of browsers)await browser.close().catch(()=>{})
  if(app){app.kill('SIGTERM')}
}
