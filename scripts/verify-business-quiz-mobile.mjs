// DIAGNOSTIC SUCCESSOR, NOT A GREEN FIX. Current Business direction contract.
// Retain free/paid alternatives, format selection, consent, 44px geometry and
// the selected-need review handoff. No forms or assessment runners are submitted.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir } from 'node:fs/promises'
import { createBusinessGeometryRecorder } from './helpers/business-geometry-diagnostics.mjs'
import { assertPublicJourneyRuntime, installPublicJourneyFence, assertBusinessContextHandoff,
  assertBusinessGenericSessionCard, assertBusinessOfferChoices, assertBusinessPaidFormatPrice }
  from './helpers/public-journey-verifier.mjs'
const require=createRequire(import.meta.url)
const origin=process.env.HH_PUBLIC_QA_ORIGIN||'http://127.0.0.1:3100'
assertPublicJourneyRuntime(origin)
const {chromium,webkit}=require(process.env.HH_PLAYWRIGHT_PACKAGE||'playwright')
const {expect}=require((process.env.HH_PLAYWRIGHT_PACKAGE||'playwright')+'/test')
const dir='artifacts/business-quiz-mobile'
await mkdir(dir,{recursive:true})
const topics=['decisions','productivity','work-stress','money-beliefs']
const reviewTitles={en:'Goals & money beliefs',ru:'Цели и установки о деньгах',es:'Metas y creencias sobre el dinero'}

function assertPublicTestHref(href,locale,topic,label){
  assert.ok(href?.startsWith('/'),label+': first-party test destination')
  const url=new URL(href,origin)
  assert.equal(url.origin,origin)
  if(url.pathname==='/'+(locale==='es'?'en':locale)+'/client'){
    assert.deepEqual([...url.searchParams.keys()],['startTests'],label+': only public test key')
    assert.match(url.searchParams.get('startTests')||'',/^[a-z0-9][a-z0-9-]{1,80}$/)
  }else{
    assert.equal(url.pathname,'/'+locale+'/client/tests')
    assert.deepEqual([...url.searchParams.keys()],['focus','journey','topics'])
    assert.equal(url.searchParams.get('journey'),'business')
    assert.equal(url.searchParams.get('topics'),topic)
  }
  // Inspect only: never start an assessment.
}

async function verify(browserType,locale,width){
  const browser=await browserType.launch()
  const context=await browser.newContext({
    viewport:{width,height:844},deviceScaleFactor:1,hasTouch:width<=430,reducedMotion:'reduce',
    serviceWorkers:'block',
  })
  const fence=await installPublicJourneyFence(context,origin,[],{reviewedAdvancedRunesImage:true})
  const page=await context.newPage()
  const errors=[]
  page.on('pageerror',err=>errors.push(err.message))
  const label=browserType.name()+'-'+locale+'-'+width
  const snap=browserType===webkit&&locale==='en'&&width===390
  const failures=[]
  const recordGeometry=createBusinessGeometryRecorder(browserType.name(),locale,width)
  // Collect independent diagnostic failures; final assertion never waives any.
  const contract=action=>{try{action()}catch(error){failures.push(error.message)}}
  const target=async(control,name,aboveBar=false)=>{
    const box=await control.boundingBox()
    contract(()=>assert.ok(box&&box.height>=44&&box.width>=44&&box.x>=-1&&box.x+box.width<=width+1,
      label+': '+name+' retains 44px target and horizontal fit: '+JSON.stringify(box)))
    if(aboveBar&&width<=430)contract(()=>assert.ok(box&&box.y+box.height<770,
      label+': '+name+' retains original above-bottom-bar requirement: '+JSON.stringify(box)))
    return box
  }
  const noOverflow=async(stage)=>{
    const size=await page.evaluate(()=>({viewport:innerWidth,content:document.documentElement.scrollWidth}))
    assert.ok(size.content<=size.viewport+1,label+': '+stage+' horizontal overflow')
  }
  const navigate=async(path)=>{
    const response=await page.goto(origin+'/'+locale+path,{waitUntil:'networkidle',timeout:60000})
    assert.equal(response?.status(),200,label+': route '+path)
  }
  const consentClosed=async(form)=>{
    assert.equal(await form.locator('input[type="checkbox"][required]').isChecked(),false,label+': navigation grants no consent')
    assert.equal(await form.locator('button[type="submit"]').isDisabled(),true,label+': consent gates submission')
    assert.equal(await form.locator('form').count(),1,label+': no success receipt on navigation')
  }
  try{
    fence.setDiagnosticPhase('business-initial')
    await navigate('/explore/business')
    const direction=page.locator('[data-direction-offers="business"]')
    await direction.waitFor({state:'visible'})
    const hero=direction.locator('[data-direction-hero]')
    assert.equal(await hero.locator('h1#hh-direction-heading').count(),1)
    assert.ok(await hero.locator('img').first().evaluate(img=>img.complete&&img.naturalWidth>50),label+': authentic photo')
    const panel=direction.locator('[data-direction-topic-finder]')
    const options=panel.locator('[data-direction-filter]')
    assert.deepEqual(await options.evaluateAll(nodes=>nodes.map(node=>node.getAttribute('data-direction-filter'))),
      ['all',...topics],label+': current four needs plus reset')
    const initialFailures=failures.length, needBoxes=[]
    for(const topic of topics)needBoxes.push(await target(panel.locator('[data-direction-filter="'+topic+'"]'),'topic '+topic))
    const last=await options.last().boundingBox()
    if(width<=430)contract(()=>assert.ok(last&&last.y+last.height<770,label+': all need choices above bottom bar'))
    await noOverflow('initial')
    // Observe only after every initial geometry assertion has already run.
    if(failures.length>initialFailures)await recordGeometry(page,'initial-needs',[...needBoxes,last])
    assert.equal(await direction.locator('[data-direction-dialogue]').count(),0,label+': no unsolicited dialogue')
    const extras=page.locator('[data-direction-extra-for="business"]')
    assert.equal(await extras.evaluate(node=>node.open),false,label+': alternatives initially collapsed')
    const goals=page.locator('[data-goal-support-theme="business"]')
    assert.deepEqual(await goals.locator('[data-goal-support-card]').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('data-goal-support-card'))),
      ['business-review','business-constellations','business-coaching'])
    const freeCta=goals.locator('[data-goal-support-action="business-review"]')
    assert.equal(await freeCta.getAttribute('href'),'/'+locale+'/services/free-situation-review?topic=business')
    assert.equal(await goals.locator('[data-goal-support-card="business-review"]').getAttribute('data-home-offer-free'),'true')
    const paidCta=direction.locator('[data-offer-id="primary-session"] [data-offer-action="session"]')
    for(const topic of topics){
      await panel.locator('[data-direction-filter="'+topic+'"]').click()
      assert.equal(await panel.locator('[data-direction-filter="'+topic+'"]').getAttribute('aria-pressed'),'true')
      assert.deepEqual(await direction.locator('[data-direction-section]').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('data-direction-section'))),
        ['test','course','session'],label+': every need retains three categories')
      const tests=direction.locator('[data-direction-section="test"] [data-offer-type="test"]')
      assert.equal(await tests.count(),2)
      assert.equal(await tests.first().getAttribute('data-offer-id'),topic)
      assertPublicTestHref(await tests.first().locator('[data-offer-action="test"]').getAttribute('href'),locale,topic,label)
      assert.equal(await freeCta.isVisible(),true,label+': free questionnaire remains available for '+topic)
      assert.equal(await paidCta.getAttribute('href'),'/'+locale+'/services/business-consulting?businessTopic='+topic)
      assert.equal(await paidCta.isVisible(),true,label+': paid consultation remains available for '+topic)
    }
    await panel.locator('[data-direction-filter="all"]').click()
    assert.equal(await direction.locator('[data-offer-type="test"]').first().getAttribute('data-offer-id'),'all-topics')
    for(const kind of ['test','course','session']){
      const group=direction.locator('[data-direction-section="'+kind+'"]')
      assert.equal(await group.locator('[data-offer-type]').count(),2,label+': initial '+kind+' offers')
      const more=group.locator('[data-direction-show-more]')
      assert.equal(await more.getAttribute('aria-expanded'),'false')
      await more.click()
      assert.equal(await more.getAttribute('aria-expanded'),'true')
      assert.equal(await group.locator('[data-offer-type]').count(),4,label+': expanded '+kind+' offers')
      assert.equal(await group.locator('[data-direction-all]').getAttribute('href'),
        '/'+locale+({test:'/client/tests?catalog=full',course:'/academy',session:'/services/catalog#service-listings'})[kind])
      if(kind==='session')for(const id of ['business-written-review','business-constellations','business-imagery'])
        assert.equal(await group.locator('[data-offer-id="'+id+'"]').count(),1,label+': existing alternative '+id)
      await more.click()
      assert.equal(await group.locator('[data-offer-type]').count(),2,label+': collapsed '+kind+' offers')
    }
    for(const intent of ['test','advice','course','session']){
      const chip=direction.locator('[data-direction-intent="'+intent+'"]')
      await target(chip,'intent '+intent)
      await chip.click()
      assert.equal(await chip.getAttribute('aria-pressed'),'true',label+': intent selected')
      assert.deepEqual(await direction.locator('[data-direction-section]').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('data-direction-section'))),[intent])
      if(intent==='advice')assert.equal(await direction.locator('[data-offer-action="advice"]').getAttribute('href'),'/'+locale+'/services/free-situation-review')
      // PR1688 keeps one mobile row: the active chip itself toggles off.
      // The auxiliary desktop reset is deliberately hidden below 780px.
      await chip.click()
      assert.equal(await chip.getAttribute('aria-pressed'),'false',label+': same intent toggles off')
      assert.deepEqual(await direction.locator('[data-direction-section]').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('data-direction-section'))),
        ['test','course','session'],label+': reset restores every original category')
      assert.equal(await panel.locator('[data-direction-filter="all"]').getAttribute('aria-pressed'),'true',label+': intent reset preserves topic state')
    }
    await extras.locator('summary').click()
    assert.equal(await extras.evaluate(node=>node.open),true)
    assert.equal(await extras.locator('[data-direction-extra="written-review"]').getAttribute('href'),'/'+locale+'/services/free-situation-review?topic=business')
    const mentoring=extras.locator('[data-direction-extra="mentoring"]')
    assert.equal(await mentoring.getAttribute('href'),'/'+locale+'/services/business-consulting?businessFormat=mentoring#business-direct-request')
    await target(mentoring,'mentoring alternative')
    // The original same-screen free/paid CTA requirement stays red if the new
    // multi-section layout no longer meets it; do not silently scroll each into compliance.
    await panel.locator('[data-direction-filter="money-beliefs"]').click()
    await panel.scrollIntoViewIfNeeded()
    const selectedFailures=failures.length
    const freeBox=await target(freeCta,'free review CTA',true)
    const paidBox=await target(paidCta,'paid consultation CTA',true)
    const paidNote=paidCta.locator('xpath=..').locator(':scope > span')
    assertBusinessGenericSessionCard({cta:(await paidCta.innerText()).trim(),note:(await paidNote.innerText()).trim(),
      ctaVisible:await paidCta.isVisible(),noteVisible:await paidNote.isVisible()},locale,label)
    // Both original same-screen assertions precede any diagnostic observation.
    if(failures.length>selectedFailures)await recordGeometry(page,'selected-needs',[freeBox,paidBox])
    if(snap)await page.screenshot({path:dir+'/01-current-direction-and-needs.png',fullPage:false})
    fence.setDiagnosticPhase('business-paid')
    await paidCta.click()
    await page.waitForURL(url=>url.pathname==='/'+locale+'/services/business-consulting')
    // A generic source CTA must reach all three real choices; never silently
    // reinterpret it as a promise of the retired automatic express selection.
    const offersHeading=page.locator('#business-offers-title')
    await offersHeading.waitFor({state:'visible'})
    const offerSnapshot=[]
    for(const card of await page.locator('[data-business-service-cards] [data-business-offer]').all()){
      const price=card.locator('h3').locator('xpath=preceding-sibling::*[1]').locator(':scope > span').last()
      // Only the offer's own disclosure follows its duration. Paid cards also
      // contain nested contact/privacy disclosures, which are not offer terms.
      const duration=card.locator(':scope > div > details').locator('xpath=preceding-sibling::*[1]')
      assert.equal(await duration.count(),1,label+': exactly one public offer duration')
      const direct=card.locator('[data-business-direct-option]')
      offerSnapshot.push({kind:await card.getAttribute('data-business-offer'),
        price:(await price.innerText()).trim(),time:(await duration.innerText()).trim(),
        directOption:await direct.getAttribute('data-business-direct-option'),directHref:await direct.getAttribute('href'),
        visible:await card.isVisible(),priceVisible:await price.isVisible(),
        timeVisible:await duration.isVisible(),directVisible:await direct.isVisible()})
    }
    assertBusinessOfferChoices({heading:(await offersHeading.innerText()).trim(),
      headingVisible:await offersHeading.isVisible(),offers:offerSnapshot},locale,label)
    const form=page.locator('[data-business-website-enquiry]')
    await form.waitFor({state:'visible'})
    await consentClosed(form)
    const note=form.locator('textarea')
    const personalAnswer=await note.inputValue()
    const reviewContext=form.locator('[data-business-review-context]')
    const reviewCount=await reviewContext.count()
    const transferredId=reviewCount===1?await reviewContext.getAttribute('data-business-review-context'):null
    const transferredTitle=reviewCount===1?await reviewContext.locator('span').innerText():null
    const transferredVisible=reviewCount===1&&await reviewContext.isVisible()
    for(const format of ['express','full']){
      const option=page.locator('[data-business-direct-option="'+format+'"]').first()
      const optionFailures=failures.length
      const optionBox=await target(option,format+' direct site form')
      if(failures.length>optionFailures)await recordGeometry(page,format+'-option',[optionBox])
      await option.click()
      assert.equal(await form.locator('[data-business-field="format"]').inputValue(),format,label+': approved format reaches form')
      assertBusinessPaidFormatPrice({format:await form.locator('[data-business-field="format"]').inputValue(),
        text:(await form.locator('[data-business-field="format"] option:checked').innerText()).trim()},format,locale,label)
      await consentClosed(form)
    }
    await noOverflow('paid destination')
    if(snap)await page.screenshot({path:dir+'/02-consent-closed-paid-form.png',fullPage:false})
    fence.setDiagnosticPhase('business-return')
    await navigate('/explore/business')
    await extras.locator('summary').click()
    fence.setDiagnosticPhase('business-mentoring')
    await mentoring.click()
    await page.waitForURL(url=>url.pathname==='/'+locale+'/services/business-consulting'&&url.searchParams.get('businessFormat')==='mentoring')
    await form.waitFor({state:'visible'})
    // The server-visible form starts as free; its mount effect restores the
    // allowlisted query choice. Wait on that exact observable state, not time.
    await expect(form.locator('[data-business-field="format"]')).toHaveValue('mentoring')
    assert.equal(await form.locator('[data-business-review-context]').count(),0,label+': fresh mentoring link cannot inherit an earlier topic')
    await consentClosed(form)
    fence.setDiagnosticPhase('business-return')
    await navigate('/explore/business')
    fence.setDiagnosticPhase('business-free')
    await freeCta.click()
    await page.waitForURL('**/'+locale+'/services/free-situation-review?topic=business',{timeout:30000})
    assert.equal(new URL(page.url()).pathname,'/'+locale+'/services/free-situation-review')
    await noOverflow('free destination')
    assert.deepEqual(errors,[],label+': no unhandled page errors')
    fence.assertNoSideEffects(label)
    contract(()=>assertBusinessContextHandoff({actualId:transferredId,expectedId:'money-beliefs',
      actualTitle:transferredTitle,expectedTitle:reviewTitles[locale],visible:transferredVisible,personalAnswer},label))
    assert.deepEqual(failures,[],label+': preserving diagnostic contracts, NOT a baseline waiver')
    return label
  }finally{await context.close();await browser.close()}
}
const done=[]
for(const locale of ['en','ru','es']){
  for(const width of [320,375,390,430])done.push(await verify(webkit,locale,width))
  done.push(await verify(chromium,locale,390))
}
console.log('Business direction preserving browser acceptance:',done.join(', '))
