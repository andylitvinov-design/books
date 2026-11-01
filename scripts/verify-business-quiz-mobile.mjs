// Real browser acceptance for the business photo hero and service alternatives.
// Runs against an isolated production-mode Next server; does not send a lead.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir } from 'node:fs/promises'
const require=createRequire(import.meta.url)
const {chromium,webkit}=require(process.env.HH_PLAYWRIGHT_PACKAGE||'playwright')
const origin=process.env.HH_PUBLIC_QA_ORIGIN||'http://127.0.0.1:3100'
if(!/^http:\/\/(?:localhost|127\.0\.0\.1):\d+$/.test(origin))
  throw new Error('Business browser QA only on isolated loopback server')
const dir='artifacts/business-quiz-mobile'
await mkdir(dir,{recursive:true})

async function verify(browserType,locale,width){
  const browser=await browserType.launch()
  const page=await browser.newPage({
    viewport:{width,height:844},deviceScaleFactor:1,hasTouch:width<=430,reducedMotion:'reduce',
  })
  const errors=[]
  page.on('pageerror',err=>errors.push(err.message))
  const label=browserType.name()+'-'+locale+'-'+width
  const snap=browserType===webkit&&locale==='en'&&width===390
  const measure=async()=>page.evaluate(()=>({
    viewport:window.innerWidth,content:document.documentElement.scrollWidth,
  }))
  try{
    const response=await page.goto(origin+'/'+locale+'/explore/business',{waitUntil:'networkidle',timeout:60000})
    assert.equal(response?.status(),200,label+': route')
    // CSS Modules hash class; assert via real img near the finder instead of class text.
    const finder=page.locator('[data-business-consultation-finder]')
    await finder.waitFor({state:'visible'})
    const image=page.locator('[data-topic-journey="business"] > section').first().locator('img').first()
    assert.ok(await image.evaluate(img=>img.complete&&img.naturalWidth>50),label+': authentic portrait')
    assert.equal(await page.locator('[data-topic-journey="business"] > section').first().locator('h1').count(),1)
    assert.equal(await finder.locator('[data-business-finder-step="need"]').count(),1)
    const options=page.locator('[data-business-need]')
    assert.equal(await options.count(),3,label+': three answers')
    assert.deepEqual(await options.evaluateAll(nodes=>nodes.map(node=>node.getAttribute('data-business-need'))),
      ['clarity','income','growth'])
    for(let i=0;i<3;i++){
      const box=await options.nth(i).boundingBox()
      assert.ok(box&&box.height>=44,label+': 44px option '+i)
    }
    const sizes=await measure()
    assert.ok(sizes.content<=sizes.viewport+1,label+': initial horizontal overflow')
    if(width<=430){
      const box=await options.last().boundingBox()
      assert.ok(box.y+box.height<770,label+': all three choices above bottom bar')
    }
    const filters=page.locator('[data-business-service-filter]')
    assert.equal(await filters.evaluate(node=>node.open),false,label+': filter initially collapsed')
    assert.equal(await page.locator('[data-business-service-card]').count(),3,label+': first three services')
    if(snap)await page.screenshot({path:dir+'/01-photo-and-three-choices.png',fullPage:false})

    // Every answer reveals BOTH paths: an actual free questionnaire and a consented personal session.
    await page.locator('[data-business-need="income"]').click()
    await page.locator('[data-business-finder-result]').waitFor({state:'visible'})
    assert.equal(await page.locator('[data-business-result-path]').count(),2,label+': two visible paths')
    const freeCta=page.locator('[data-business-finder-start="free-review"]')
    const cta=page.locator('[data-business-finder-start="website-form"]')
    assert.equal(await freeCta.getAttribute('href'),'/'+locale+'/services/free-situation-review?topic=business')
    assert.equal(await freeCta.getAttribute('data-business-finder-context'),null)
    assert.equal(await cta.getAttribute('href'),'#business-direct-request')
    assert.equal(await cta.getAttribute('data-business-direct-option'),'express')
    for(const [name,link] of [['free',freeCta],['paid',cta]]){
      const box=await link.boundingBox()
      assert.ok(box&&box.height>=44,label+': '+name+' 44px touch target')
      if(width<=430)assert.ok(box.y+box.height<770,label+': '+name+' CTA above fixed bottom navigation')
    }
    if(snap)await page.screenshot({path:dir+'/02-free-and-paid.png',fullPage:false})
    await cta.click()
    const form=page.locator('[data-business-website-enquiry]')
    await form.waitFor({state:'visible'})
    assert.equal(await form.locator('[data-business-field="format"]').inputValue(),'express')
    assert.ok((await form.locator('textarea').inputValue()).trim(),label+': selected need shown for review')
    await page.locator('[data-business-finder-result] summary').click()
    await page.locator('[data-business-format-choice="full"]').click()
    assert.equal(await cta.getAttribute('data-business-direct-option'),'full')
    assert.equal(await freeCta.getAttribute('href'),'/'+locale+'/services/free-situation-review?topic=business')
    await cta.click()
    assert.equal(await form.locator('[data-business-field="format"]').inputValue(),'full')
    await page.locator('[data-business-finder-reset]').click()
    assert.equal(await page.locator('[data-business-need]').count(),3)

    // The alternative finder is genuinely collapsed and does not require a quiz.
    await filters.locator('summary').click()
    assert.equal(await filters.evaluate(node=>node.open),true)
    await page.locator('[data-service-filter-topic="income"]').click()
    assert.equal(await page.locator('[data-business-service-card]').count(),2)
    await page.locator('[data-service-filter-topic="all"]').click()
    assert.equal(await page.locator('[data-business-service-card]').count(),3)
    const more=page.locator('[data-business-show-more]')
    await more.click()
    assert.equal(await page.locator('[data-business-service-card]').count(),6)
    assert.equal(await page.locator('[data-business-service-card="mentoring"]').count(),1)
    assert.equal(await page.locator('[data-business-service-card="constellations"]').count(),1)
    assert.equal(await page.locator('[data-business-service-card="imagery"]').count(),1)
    // Existing consent-gated CRM form receives a direct card's approved price.
    await page.locator('[data-business-service-card="full"] [data-business-direct-option="full"]').click()
    assert.equal(await form.locator('[data-business-field="format"]').inputValue(),'full')
    const after=await measure()
    assert.ok(after.content<=after.viewport+1,label+': after interactions no horizontal overflow')
    // Follow the real free link (no lead submission), not a simulated client-side redirect.
    await page.locator('[data-business-need="clarity"]').click()
    await page.locator('[data-business-finder-start="free-review"]').click()
    await page.waitForURL('**/'+locale+'/services/free-situation-review?topic=business',{timeout:30000})
    assert.equal(new URL(page.url()).pathname,'/'+locale+'/services/free-situation-review')
    assert.deepEqual(errors,[],label+': no unhandled page errors')
    return label
  }finally{await page.close();await browser.close()}
}
const done=[]
for(const locale of ['en','ru','es']){
  for(const width of [320,375,390,430])done.push(await verify(webkit,locale,width))
  done.push(await verify(chromium,locale,390))
}
console.log('Business photo and service browser acceptance:',done.join(', '))
