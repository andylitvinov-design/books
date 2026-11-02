// Isolated production-mode browser QA; questions never become leads and no form is submitted.
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
const questionByLocale={
  en:'How can I make my income more stable?',
  ru:'Как мне сделать доход более стабильным?',
  es:'¿Cómo puedo tener ingresos más estables?',
}

async function verify(browserType,locale,width){
  const browser=await browserType.launch()
  const page=await browser.newPage({viewport:{width,height:844},deviceScaleFactor:1,
    hasTouch:width<=430,reducedMotion:'reduce'})
  const errors=[],outbound=[]
  page.on('pageerror',err=>errors.push(err.message))
  page.on('request',request=>outbound.push([request.url(),request.postData()||'']))
  const label=browserType.name()+'-'+locale+'-'+width
  const snap=browserType===webkit&&locale==='en'&&width===390
  const measure=()=>page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth}))
  try{
    const response=await page.goto(origin+'/'+locale+'/explore/business',{waitUntil:'networkidle',timeout:60000})
    assert.equal(response?.status(),200,label+': route')
    const hero=page.locator('[data-topic-journey="business"] > section').first()
    const finder=page.locator('[data-business-consultation-finder]')
    await finder.waitFor({state:'visible'})
    const image=hero.locator('img').first()
    assert.ok(await image.evaluate(img=>img.complete&&img.naturalWidth>50),label+': portrait')
    assert.equal(await hero.locator('h1').count(),1)
    assert.equal(await finder.locator('[data-business-finder-step="question"]').count(),1)
    assert.equal(await page.locator('[data-business-need]').count(),0,label+': no old choice tiles')
    const editor=finder.locator('[data-business-question-input]')
    const submit=finder.locator('[data-business-question-submit]')
    assert.equal(await editor.getAttribute('maxlength'),'400')
    for(const [name,target] of [['question',editor],['action',submit]]){
      const box=await target.boundingBox()
      assert.ok(box&&box.height>=44,label+': '+name+' touch target')
    }
    const before=await measure()
    assert.ok(before.scrollWidth<=before.width+1,label+': initial overflow')
    if(width<=430){
      const box=await submit.boundingBox()
      assert.ok(box&&box.y+box.height<770,label+': question CTA fits first phone screen')
    }
    const filters=page.locator('[data-business-service-filter]')
    assert.equal(await filters.count(),1,label+': below-hero topic filter')
    assert.equal(await page.locator('[data-service-filter-topic]').count(),9,label+': eight themes plus All')
    assert.equal(await page.locator('[data-business-service-card]').count(),3,label+': three starting services')
    if(snap)await page.screenshot({path:dir+'/01-question-and-hero.png',fullPage:false})

    await submit.click()
    assert.equal(await page.locator('[data-business-finder-result]').count(),0,label+': no result without a question')
    assert.equal(await finder.locator('[role="alert"]').count(),1,label+': clear validation')
    const question=questionByLocale[locale]
    await editor.fill(question)
    await submit.click()
    await page.locator('[data-business-finder-result]').waitFor({state:'visible'})
    assert.equal(await page.locator('[data-business-result-path]').count(),2,label+': free and paid options')
    assert.equal(await page.locator('[data-business-quick-idea]').count(),1,label+': immediate real idea')
    assert.equal(await page.locator('[data-service-filter-topic="money"]').getAttribute('aria-pressed'),'true',
      label+': question identifies topic in below-hero filter')
    const free=page.locator('[data-business-finder-start="free-review"]')
    const paid=page.locator('[data-business-finder-start="website-form"]')
    assert.equal(await free.getAttribute('href'),'/'+locale+'/services/free-situation-review?topic=business')
    assert.equal(await free.getAttribute('data-business-finder-context'),null)
    assert.equal(await paid.getAttribute('href'),'#business-direct-request')
    assert.equal(await paid.getAttribute('data-business-direct-option'),'express')
    assert.ok(!(await paid.getAttribute('data-business-finder-context')).includes(question))
    for(const link of [free,paid]){
      await link.scrollIntoViewIfNeeded()
      const box=await link.boundingBox()
      assert.ok(box&&box.height>=44,label+': result CTA touch target')
    }
    if(snap)await page.screenshot({path:dir+'/02-idea-and-two-paths.png',fullPage:false})
    await paid.click()
    const form=page.locator('[data-business-website-enquiry]')
    await form.waitFor({state:'visible'})
    assert.equal(await form.locator('[data-business-field="format"]').inputValue(),'express')
    assert.ok(!(await form.locator('textarea').inputValue()).includes(question),
      label+': private text not copied to enquiry')
    await page.locator('[data-business-finder-result] summary').click()
    await page.locator('[data-business-format-choice="full"]').click()
    assert.equal(await paid.getAttribute('data-business-direct-option'),'full')
    await paid.click()
    assert.equal(await form.locator('[data-business-field="format"]').inputValue(),'full')

    await page.locator('[data-business-finder-reset]').click()
    assert.equal(await finder.locator('[data-business-finder-step="question"]').count(),1)
    assert.equal(await editor.inputValue(),question,label+': question remains editable in memory')

    // Category filter is present without opening a second questionnaire.
    await page.locator('[data-service-filter-topic="clients"]').click()
    assert.equal(await page.locator('[data-business-follow-up]').count(),1)
    assert.equal(await page.locator('[data-business-clarification]').count(),3)
    await page.locator('[data-business-clarification="reach"]').click()
    assert.equal(await page.locator('[data-business-clarification-idea]').count(),1)
    assert.equal(await page.locator('[data-business-service-card]').count(),3)
    await page.locator('[data-service-filter-topic="all"]').click()
    assert.equal(await page.locator('[data-business-follow-up]').count(),0)
    await page.locator('[data-business-show-more]').click()
    assert.equal(await page.locator('[data-business-service-card]').count(),6)
    for(const kind of ['mentoring','constellations','imagery'])
      assert.equal(await page.locator('[data-business-service-card="'+kind+'"]').count(),1)
    await page.locator('[data-business-service-card="full"] [data-business-direct-option="full"]').click()
    assert.equal(await form.locator('[data-business-field="format"]').inputValue(),'full')
    const after=await measure()
    assert.ok(after.scrollWidth<=after.width+1,label+': no overflow after interactions')
    assert.ok(outbound.every(([url,body])=>!url.includes(encodeURIComponent(question))&&!body.includes(question)),
      label+': visitor question never sent in requests')
    // Real route handoff without submitting a visitor lead.
    await editor.fill(question)
    await submit.click()
    await free.click()
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
console.log('Business question and clarification browser acceptance:',done.join(', '))
