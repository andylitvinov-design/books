// Real mobile guest acceptance for the published human-specialist view.
// Reuses the EXISTING manually invoked Coaching browser runner; no new
// workflow, remote service, private auth or real CRM message is involved.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'
import { runMobileBrowserCases } from './ci-mobile-browser-batch.mjs'

const require = createRequire(import.meta.url)
const origin = process.env.HH_PUBLIC_QA_ORIGIN || 'http://127.0.0.1:3100'
if(!/^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/.test(origin))
  throw new Error('Human specialist browser QA must use an isolated local server')

export async function verifyHumanSpecialistMobile() {
  const { chromium, webkit } = require(process.env.HH_PLAYWRIGHT_PACKAGE || 'playwright')
  const output = 'artifacts/coaching-mobile/human-specialist'
  await mkdir(output,{recursive:true})
  const evidence = []
  async function verify(browserType,browser,locale,width) {
    const ctx = await browser.newContext({
      viewport:{width,height:844},deviceScaleFactor:1,hasTouch:true,isMobile:true,reducedMotion:'reduce',
    })
    const page = await ctx.newPage()
    const label = [browserType.name(),locale,width].join(':')
    const pageErrors = []
    let posted = 0
    page.on('pageerror',error=>pageErrors.push(error.message))
    try {
      // Refuse any real private client communication; simulate a signed-out
      // response and test the explicit messenger handoff without opening it.
      await page.route('**/api/app/direct-messages*',route=>{
        if(route.request().method() !== 'GET')posted++
        return route.fulfill({status:401,contentType:'application/json',
          body:JSON.stringify({error:'SIGN_IN_REQUIRED'})})
      })
      // Intentionally block remote thumbnails so local portrait recovery is
      // verified instead of relying on YouTube/third-party network access.
      await page.route('https://i.ytimg.com/**',route=>route.abort())
      await page.route('https://www.youtube-nocookie.com/**',route=>route.abort())
      await page.route('https://app.heygen.com/**',route=>route.abort())
      await page.route('https://player.vimeo.com/**',route=>route.abort())
      const response=await page.goto(origin+'/'+locale+'/my-coach/real/andy-litvinov',
        {waitUntil:'domcontentloaded',timeout:60000})
      assert.equal(response?.status(),200,label+': real specialist public route')
      const root=page.locator('[data-my-coach-human-dialogue]')
      await root.waitFor({state:'visible',timeout:30000})
      const video=root.locator('[data-human-video-stage]')
      const frame=await video.boundingBox()
      assert.ok(frame&&frame.width>260&&Math.abs(frame.width/frame.height-16/9)<0.05,
        label+': 16:9 video geometry '+JSON.stringify(frame))
      const reel=root.locator('[data-human-video-reel]')
      const thumbnails=reel.locator('[data-human-video-thumb]')
      assert.ok(await thumbnails.count()>=2,label+': actual published video thumbnails')
      const rail=await reel.evaluate(element=>({
        width:element.clientWidth,scrollWidth:element.scrollWidth,
        overflow:getComputedStyle(element).overflowX,
      }))
      assert.ok(rail.scrollWidth>rail.width+30 && rail.overflow==='auto',
        label+': swipeable video reel '+JSON.stringify(rail))
      const originalLabel=await video.locator('button[aria-label]').first().getAttribute('aria-label')
      await thumbnails.nth(1).tap()
      assert.equal(await thumbnails.nth(1).getAttribute('aria-pressed'),'true',
        label+': second video selected')
      assert.notEqual(await video.locator('button[aria-label]').first().getAttribute('aria-label'),
        originalLabel,label+': main video changes with selected clip')
      // The remote poster is blocked above; only the already published local
      // practitioner photo is allowed to recover the main image.
      await page.waitForFunction(()=>Array.from(document.querySelectorAll('[data-human-video-stage] img'))
        .some(img=>img.getAttribute('src')?.endsWith('/andy-about.png')&&
          img.complete&&img.naturalWidth>0),null,{timeout:12000})
      if(width===390) {
        await video.locator('button[aria-label]').first().tap()
        const player=video.locator('iframe,video').first()
        await player.waitFor({state:'attached',timeout:10000})
        assert.match(await player.getAttribute('src')||'',
          /^https:\/\/(?:www\.youtube-nocookie\.com|app\.heygen\.com|player\.vimeo\.com)\/|^https:\/\/[^/]+\/storage\/v1\/object\/public\/hh-practitioner-presentations\//,
          label+': only approved real published video')
        await thumbnails.first().tap()
        assert.equal(await video.locator('iframe,video').count(),0,
          label+': selecting a new thumbnail tears down the old player')
      }
      const question=root.locator('#hh-human-specialist-question')
      await question.waitFor({state:'visible'})
      await root.locator('a[href*="/app/messages?to=andy-litvinov"]').waitFor({state:'visible'})
      await question.fill('Synthetic browser QA question — do not send')
      await root.locator('button[type="submit"]').tap()
      await root.locator('[data-human-specialist-channels]').waitFor({state:'visible'})
      assert.equal(posted,0,label+': guest attempt never posts to CRM')
      const cta=root.locator('[data-human-specialist-book]')
      assert.equal(await cta.getAttribute('href'),'/' + locale + '/services/imagery-therapy',
        label+': genuine consultation CTA')
      assert.equal(await root.locator('a[href="/'+locale+'/my-coach#all-coaches"]').count(),1,
        label+': return to the coach directory')
      const layout=await page.evaluate(()=>({
        viewport:document.documentElement.clientWidth,
        width:document.documentElement.scrollWidth,
      }))
      assert.ok(layout.width<=layout.viewport+2,label+': no document overflow '+JSON.stringify(layout))
      const brand=await root.locator('header a').first().boundingBox()
      const change=await root.locator('header a').nth(1).boundingBox()
      assert.ok(brand&&change&&brand.x+brand.width<=change.x+2,
        label+': brand and change-specialist action do not overlap')
      assert.deepEqual(pageErrors,[],label+': no uncaught React error')
      if(width===390||width===320&&locale==='ru')
        await page.screenshot({path:output+'/'+browserType.name()+'-'+locale+'-'+width+'.png'})
      evidence.push({browser:browserType.name(),locale,width,videos:await thumbnails.count(),
        posterRecovered:true,guestSafe:true,geometry:'16:9',result:'pass'})
      console.log('HUMAN_SPECIALIST_PASS '+label)
    } finally {await ctx.close()}
  }
  await runMobileBrowserCases([
    {browserType:webkit,cases:[['ru',320],['ru',390],['ru',430],['en',390],['es',390]]},
    {browserType:chromium,cases:[['en',390],['ru',390],['es',390]]},
  ],verify)
  await writeFile(output+'/acceptance.json',JSON.stringify(evidence,null,2))
  console.log('Human specialist mobile QA passed: '+evidence.length+' checks')
}
