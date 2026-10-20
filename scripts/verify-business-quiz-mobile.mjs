// Production-build browser acceptance for the public, editorial two-question
// Business finder. No lead creation, external messaging or provider charges.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir } from 'node:fs/promises'
const require = createRequire(import.meta.url)
const { chromium, webkit } = require(process.env.HH_PLAYWRIGHT_PACKAGE || 'playwright')
const origin = process.env.HH_PUBLIC_QA_ORIGIN || 'http://127.0.0.1:3100'
if (!/^http:\/\/(?:localhost|127\.0\.0\.1):\d+$/.test(origin)) {
  throw new Error('Business finder browser QA must use an isolated local server')
}
const dest = 'artifacts/business-quiz-mobile'
await mkdir(dest, {recursive:true})

async function verify(browserType, locale, width) {
  const browser = await browserType.launch()
  const page = await browser.newPage({
    viewport:{width,height:844},
    hasTouch:width<=430,
    deviceScaleFactor:1,
    reducedMotion:'reduce',
  })
  const errors=[]
  page.on('pageerror', err=>errors.push(err.message))
  const label = [browserType.name(), locale, width].join('-')
  try {
    const response = await page.goto(origin + '/' + locale + '/explore/business', {waitUntil:'networkidle',timeout:60000})
    assert.equal(response.status(),200,label+': public route')
    const hero=page.locator('[data-topic-journey="business"] > section').first()
    const finder=page.locator('[data-business-consultation-finder]')
    await finder.waitFor({state:'visible'})
    assert.equal(await hero.locator('h1').count(),1,label+': one page heading')
    assert.equal(await finder.locator('[data-business-finder-step="area"]').count(),1)
    assert.equal(await page.locator('[data-business-consultation-banner] a[href="#business-direct-request"]').count(),0,
      label+': no duplicate sales CTA in benefits')
    assert.equal(await page.locator('[data-business-consultation-banner]').count(),1)
    const [scrollWidth,innerWidth]=await page.evaluate(()=>[
      document.documentElement.scrollWidth, window.innerWidth,
    ])
    assert.ok(scrollWidth<=innerWidth+1,label+': no horizontal overflow at '+width)
    const options=page.locator('[data-business-area]')
    assert.equal(await options.count(),4,label+': four clear first choices')
    for(let i=0;i<4;i++) {
      const b=await options.nth(i).boundingBox()
      assert.ok(b && b.height>=44 && b.width>=105,label+': reachable 44px choice '+i)
    }
    if(width<=430){
      const bottom=await options.last().boundingBox()
      assert.ok(bottom.y+bottom.height<750,
        label+': fourth choice must be visible above bottom navigation without scrolling')
    }
    if(browserType===webkit && width===390 && locale==='en')
      await page.screenshot({path:dest+'/01-before-answers.png',fullPage:false})
    await page.locator('[data-business-area="money"]').click()
    await page.locator('[data-business-finder-step="issue"]').waitFor({state:'visible'})
    assert.equal(await finder.locator('[data-business-finder-step="area"]').count(),0)
    assert.equal(await page.locator('[data-business-issue]').count(),4)
    if(browserType===webkit && width===390 && locale==='en')
      await page.screenshot({path:dest+'/02-second-question.png',fullPage:false})
    await page.locator('[data-business-issue="income"]').click()
    await page.locator('[data-business-finder-result]').waitFor({state:'visible'})
    const call=page.locator('[data-business-finder-start="website-form"]')
    assert.equal(await call.getAttribute('href'),'#business-direct-request')
    assert.equal(await call.getAttribute('data-business-direct-option'),'express')
    assert.equal(await page.locator('[role="progressbar"]').first().getAttribute('aria-valuenow'),'2')
    const b=await call.boundingBox()
    assert.ok(b && b.height>=44,label+': CTA touch target')
    const finalWidth=await page.evaluate(()=>document.documentElement.scrollWidth)
    assert.ok(finalWidth<=width+1,label+': result no horizontal overflow')
    if(width<=430)assert.ok(b.y+b.height<750,label+': recommendation CTA visible in first screen')
    if(browserType===webkit && width===390 && locale==='en')
      await page.screenshot({path:dest+'/03-result-and-cta.png',fullPage:false})
    await call.click()
    const form=page.locator('[data-business-website-enquiry]')
    await form.waitFor({state:'visible'})
    assert.equal(await form.locator('[data-business-field="format"]').inputValue(),'express',label+': CRM form format')
    await page.locator('[data-business-finder-result] summary').first().click()
    await page.locator('[data-business-format-choice="free"]').click()
    assert.equal(await call.getAttribute('data-business-direct-option'),'free',label+': free override')
    await call.click()
    assert.equal(await form.locator('[data-business-field="format"]').inputValue(),'free',label+': free CRM handoff')
    assert.deepEqual(errors,[],label+': no uncaught browser errors')
    return label
  } finally {
    await page.close()
    await browser.close()
  }
}

const checks=[]
for(const locale of ['en','ru','es']) {
  for(const width of [320,375,390,430]) {
    checks.push(await verify(webkit,locale,width))
  }
  checks.push(await verify(chromium,locale,390))
}
console.log('Business quiz browser acceptance:', checks.join(', '))
