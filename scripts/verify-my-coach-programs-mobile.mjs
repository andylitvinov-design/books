// Optional browser acceptance using the existing installed browser and isolated dev server.
// No paid preview, provider, real OAuth or additional scheduled CI.
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {mkdir} from 'node:fs/promises'
const require=createRequire(import.meta.url)
const {chromium,webkit}=require(process.env.HH_PLAYWRIGHT_PACKAGE||'playwright')
const origin=process.env.HH_PUBLIC_QA_ORIGIN||'http://127.0.0.1:3100'
if(!/^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/.test(origin))throw Error('Use isolated local server')
const out='artifacts/coaching-mobile/program-comparison'
await mkdir(out,{recursive:true})
for(const engine of [chromium,webkit]){
 const browser=await engine.launch()
 try{
  for(const [lang,width] of [['en',320],['en',390],['ru',390],['es',430]]){
   const ctx=await browser.newContext({viewport:{width,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,reducedMotion:'reduce'})
   try{
    const page=await ctx.newPage()
    await page.goto(origin+'/'+lang+'/my-coach',{waitUntil:'domcontentloaded'})
    await page.locator('[data-my-coach-program-details]').click()
    await page.waitForURL('**/'+lang+'/my-coach/programs')
    const cards=page.locator('[data-coach-comparison-program]')
    assert.equal(await cards.count(),4)
    assert.equal(await cards.first().getAttribute('open'),'')
    assert.equal(await cards.first().locator('ol li').count(),3)
    assert.equal(await page.locator('[data-hh-unified-dock] [data-unified-dock-item="coach"]').getAttribute('aria-current'),'page')
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1))
    await page.screenshot({path:out+'/'+engine.name()+'-'+lang+'-'+width+'.png',fullPage:true})
    for(const id of ['business','love','health']){
     const card=page.locator('[data-coach-comparison-program="'+id+'"]')
     assert.equal(await card.getAttribute('open'),null)
     await card.locator('summary').click()
     assert.equal(await card.getAttribute('open'),'')
     assert.equal(await card.locator('ol li').count(),8)
     await card.locator('summary').click()
     assert.equal(await card.getAttribute('open'),null)
    }
    assert.equal(await cards.first().locator('[data-clarity-start]').getAttribute('href'),'/'+lang+'/app/daybook?program=clarity')
    // Protected real launch is checked with a synthetic signed-in account,
    // while intercepting the destination to avoid real account writes.
    await page.route('**/api/app/bootstrap?view=portrait',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({account:{onboardingState:'active'}})}))
    await page.route('**/'+lang+'/app/daybook?program=clarity',route=>route.fulfill({status:200,contentType:'text/html',body:'<p>synthetic destination</p>'}))
    await cards.first().locator('[data-clarity-start]').click()
    await page.waitForURL('**/'+lang+'/app/daybook?program=clarity')
   }finally{await ctx.close()}
  }
 }finally{await browser.close()}
}
