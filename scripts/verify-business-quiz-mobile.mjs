// Current Business discovery and its explicit free/paid service paths.
// Real browsers, isolated production server, no lead submission or external handoff.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir } from 'node:fs/promises'
import { assertDirectionTestState, directionTestContract } from './helpers/direction-focus-verifier.mjs'
const require=createRequire(import.meta.url)
const {chromium,webkit}=require(process.env.HH_PLAYWRIGHT_PACKAGE||'playwright')
const origin=process.env.HH_PUBLIC_QA_ORIGIN||'http://127.0.0.1:3100'
if(!/^http:\/\/(?:localhost|127\.0\.0\.1):\d+$/.test(origin))
  throw new Error('Business browser QA only on isolated loopback server')
const dir='artifacts/business-quiz-mobile'
await mkdir(dir,{recursive:true})
const ids=['decisions','productivity','work-stress','money-beliefs']
async function verify(browserType,locale,width){
  const browser=await browserType.launch()
  const page=await browser.newPage({viewport:{width,height:844},deviceScaleFactor:1,hasTouch:true,reducedMotion:'reduce'})
  const errors=[]
  page.on('pageerror',error=>errors.push(error.message))
  const label=browserType.name()+'-'+locale+'-'+width
  const noOverflow=async()=>assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),label+': no horizontal overflow')
  const touch=async locator=>{const box=await locator.boundingBox();assert.ok(box&&box.width>=44&&box.height>=44,label+': 44px action')}
  try{
    assert.equal((await page.goto(origin+'/'+locale+'/explore/business',{waitUntil:'networkidle',timeout:60000}))?.status(),200)
    const root=page.locator('[data-direction-offers="business"]')
    await root.waitFor({state:'visible'})
    assert.equal(await root.count(),1,label+': one current business journey')
    const contract=directionTestContract(locale,'business',ids)
    const initial=await assertDirectionTestState(page,contract)
    const filters=root.locator('[data-direction-filter]')
    assert.deepEqual(await filters.evaluateAll(nodes=>nodes.map(node=>node.getAttribute('data-direction-filter'))),['all',...ids])
    for(const id of ids){
      await touch(root.locator('[data-direction-filter="'+id+'"]'))
      await root.locator('[data-direction-filter="'+id+'"]').click()
      await assertDirectionTestState(page,contract,{topicId:id})
    }
    await root.locator('[data-direction-filter="all"]').click()
    assert.deepEqual(await assertDirectionTestState(page,contract),initial,label+': reset restores exact free tests')
    const more=root.locator('[data-direction-show-more="test"]')
    await more.click();await assertDirectionTestState(page,contract,{expanded:true})
    await more.click();assert.deepEqual(await assertDirectionTestState(page,contract),initial)
    await noOverflow()

    // The retired quiz is not restored: verify the real dedicated business
    // landing and its existing consent-gated form, including both fixed prices.
    const session=root.locator('[data-offer-id="primary-session"] [data-offer-action="session"]')
    assert.equal(await session.count(),1,label+': unique primary business session')
    assert.equal(await session.getAttribute('href'),'/'+locale+'/services/business-consulting')
    for(const action of await root.locator('[data-offer-action="test"], [data-offer-action="session"]').all()){
      await action.scrollIntoViewIfNeeded()
      const box=await action.boundingBox()
      assert.ok(box&&box.x>=-1&&box.x+box.width<=width+1,label+': current direction action stays in viewport')
      await action.click({trial:true,timeout:8000})
    }
    await session.click()
    await page.waitForURL('**/'+locale+'/services/business-consulting',{timeout:30000})
    const landing=page.locator('[data-business-consulting]')
    await landing.waitFor({state:'visible'})
    await page.waitForLoadState('networkidle')
    assert.equal(await landing.locator('#business-hero-title').count(),1)
    assert.ok(await landing.locator('img[alt="Andrey Litvinov"]').first().evaluate(img=>img.complete&&img.naturalWidth>50),label+': authentic portrait')
    const offers=landing.locator('[data-business-service-cards] [data-business-offer]')
    assert.deepEqual(await offers.evaluateAll(nodes=>nodes.map(node=>node.getAttribute('data-business-offer'))),['free','express','full'])
    const free=landing.locator('[data-business-format="free"]')
    assert.equal(await free.getAttribute('href'),'/'+locale+'/services/free-situation-review?topic=business')
    await touch(free)
    const form=landing.locator('[data-business-website-enquiry]')
    for(const [kind,price,minutes] of [['express','50','30'],['full','100','60']]){
      const offer=landing.locator('[data-business-offer="'+kind+'"]')
      const text=await offer.innerText()
      assert.ok(text.includes(price)&&text.includes('€')&&text.includes(minutes),label+': approved '+kind+' price and duration')
      const direct=offer.locator('[data-business-direct-option="'+kind+'"]')
      assert.equal(await direct.getAttribute('href'),'#business-direct-request')
      await touch(direct)
      await direct.click();await form.waitFor({state:'visible'})
      assert.equal(await form.locator('[data-business-field="format"]').inputValue(),kind)
      const consent=form.locator('input[type="checkbox"][required]')
      assert.equal(await consent.count(),1)
      assert.equal(await consent.isChecked(),false,label+': consent is never preset')
      assert.equal(await form.locator('button[type="submit"]').isDisabled(),true,label+': no request without consent')
    }
    await noOverflow()
    if(browserType===webkit&&locale==='en'&&width===390)await page.screenshot({path:dir+'/business-current-paths.png',fullPage:false})
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
console.log('Business current discovery and consented service paths:',done.join(', '))
