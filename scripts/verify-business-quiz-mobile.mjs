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
  const submissions=[]
  page.on('pageerror',err=>errors.push(err.message))
  page.on('request',request=>{ if(request.method()==='POST' && new URL(request.url()).pathname==='/api/services/business-consulting') submissions.push(request.url()) })
  const label=browserType.name()+'-'+locale+'-'+width
  const snap=browserType===webkit&&locale==='en'&&width===390
  const measure=async()=>page.evaluate(()=>({
    viewport:window.innerWidth,content:document.documentElement.scrollWidth,
  }))
  try{
    const response=await page.goto(origin+'/'+locale+'/explore/business',{waitUntil:'networkidle',timeout:60000})
    assert.equal(response?.status(),200,label+': route')
    const hero=page.locator('[data-direction-offers="business"] [data-direction-hero]')
    const image=hero.locator('img').first()
    assert.ok(await image.evaluate(img=>img.complete&&img.naturalWidth>50),label+': authentic portrait')
    assert.equal(await hero.locator('h1').count(),1)
    const extras=page.locator('[data-business-existing-finder]')
    assert.equal(await extras.count(),1,label+': existing finder remains available')
    assert.equal(await extras.evaluate(node=>node.open),false,label+': finder starts collapsed')
    await extras.locator('summary').first().click()
    const finder=extras.locator('[data-business-consultation-finder]')
    await finder.waitFor({state:'visible'})
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
    assert.equal(await cta.getAttribute('href'),'/'+locale+'/services/business-consulting?businessFormat=express#business-direct-request')
    assert.equal(await cta.getAttribute('data-business-direct-option'),'express')
    for(const [name,link] of [['free',freeCta],['paid',cta]]){
      const box=await link.boundingBox()
      assert.ok(box&&box.height>=44,label+': '+name+' 44px touch target')
    }
    if(snap)await page.screenshot({path:dir+'/02-free-and-paid.png',fullPage:false})
    const returnToFinder=async()=>{
      await page.goBack({waitUntil:'domcontentloaded'})
      await extras.waitFor({state:'visible'})
      if (!(await extras.evaluate(node=>node.open))) await extras.locator('summary').first().click()
      await finder.waitFor({state:'visible'})
      await page.waitForFunction(() => {
        const control=document.querySelector('[data-business-need], [data-business-finder-reset]')
        return Boolean(control && Object.keys(control).some(key=>key.startsWith('__reactProps$')))
      },null,{timeout:30000})
      if (await page.locator('[data-business-finder-reset]').count()) await page.locator('[data-business-finder-reset]').click()
      await page.locator('[data-business-finder-step="need"]').waitFor({state:'visible'})
    }
    await cta.click()
    await page.waitForURL('**/'+locale+'/services/business-consulting?businessFormat=express#business-direct-request')
    const form=page.locator('[data-business-website-enquiry]')
    await form.waitFor({state:'visible'})
    await page.waitForFunction(() => document.querySelector('[data-business-field="format"]')?.value === 'express')
    assert.equal(await page.locator('[data-business-website-enquiry] [role="status"]').count(),0,label+': no automatic enquiry')
    await returnToFinder()
    await page.locator('[data-business-need="income"]').click()
    await page.locator('[data-business-finder-result] summary').click()
    await page.locator('[data-business-format-choice="full"]').click()
    await page.waitForFunction(() => document.querySelector('[data-business-finder-start="website-form"]')?.getAttribute('data-business-direct-option') === 'full')
    assert.equal(await cta.getAttribute('data-business-direct-option'),'full')
    assert.equal(await freeCta.getAttribute('href'),'/'+locale+'/services/free-situation-review?topic=business')
    await cta.click()
    await page.waitForURL('**/'+locale+'/services/business-consulting?businessFormat=full#business-direct-request')
    await page.waitForFunction(() => document.querySelector('[data-business-field="format"]')?.value === 'full')
    await returnToFinder()
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
    await page.waitForURL('**/'+locale+'/services/business-consulting?businessFormat=full#business-direct-request')
    await page.waitForFunction(() => document.querySelector('[data-business-field="format"]')?.value === 'full')
    await returnToFinder()
    const after=await measure()
    assert.ok(after.content<=after.viewport+1,label+': after interactions no horizontal overflow')
    // Follow the real free link (no lead submission), not a simulated client-side redirect.
    // A browser back navigation can expose server markup just before the
    // client handler is attached. Retry a real click only if no result appeared.
    const clarity=page.locator('[data-business-need="clarity"]')
    const freeResult=page.locator('[data-business-finder-start="free-review"]')
    for(let attempt=0;attempt<3;attempt++){
      await clarity.click()
      if(await freeResult.waitFor({state:'visible',timeout:1500}).then(()=>true,()=>false))break
      await page.waitForTimeout(500)
    }
    await freeResult.click()
    await page.waitForURL('**/'+locale+'/services/free-situation-review?topic=business',{timeout:30000})
    assert.equal(new URL(page.url()).pathname,'/'+locale+'/services/free-situation-review')
    assert.deepEqual(submissions,[],label+': no enquiry without explicit consent')
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
