import {chromium,webkit,expect} from '@playwright/test'
import assert from 'node:assert/strict'
import {mkdir,writeFile,readFile} from 'node:fs/promises'
import {createHmac} from 'node:crypto'
import {MONITORING_CATALOG} from '../data/assessments/catalog.js'
import {adminClient,assertIsolated,A} from '../tests/helpers/app-db-setup.mjs'
assertIsolated()
const origin=process.env.HH_TEST_APP_ORIGIN||'http://127.0.0.1:3100'
if(!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin))throw new Error('Only isolated loopback browser verification is permitted')
const output='artifacts/app-r1'
await mkdir(output,{recursive:true})
const engine=process.env.HH_TEST_BROWSER==='webkit'?webkit:chromium
const browser=await engine.launch(process.env.HH_TEST_BROWSER_EXECUTABLE?{executablePath:process.env.HH_TEST_BROWSER_EXECUTABLE}:{}),context=await browser.newContext({viewport:{width:390,height:844}}),errors=[]
let page=await context.newPage()
const capturePageError=error=>{if(error.message.includes('/api/app/bootstrap due to access control checks.')||error.message.includes('/api/app/course due to access control checks.')||/\/api\/app\/results\/[^ ]+ due to access control checks\.$/.test(error.message)||error.message.includes('/__nextjs_original-stack-frames due to access control checks.'))return;errors.push(error.message);console.log('SYNTHETIC_PAGE_ERROR',new URL(page.url()).pathname,error.message)}
page.on('pageerror',capturePageError)
const checks=[]
function passed(name){checks.push(name);console.log('PASS '+name)}
/**
 * Playwright/WebKit cannot screenshot a full page taller than 32767 device pixels.
 * Clinical test catalogs and complete Reports may naturally exceed that height.
 * Keep the underlying route/assertions intact; use a viewport-sized evidence
 * image only when a full-page artifact would exceed the browser pixel limit.
 */
async function screenshotEvidence(target, options) {
  if (options.fullPage !== true) return target.screenshot(options)
  const tooTall = await target.evaluate(() => {
    const px = Math.max(document.documentElement?.scrollHeight || 0, document.body?.scrollHeight || 0)
    return px * Math.max(1, window.devicePixelRatio || 1) >= 30000
  }).catch(() => true)
  if (tooTall) console.log('SYNTHETIC_SCREENSHOT_VIEWPORT_FALLBACK', options.path)
  return target.screenshot({ ...options, fullPage: !tooTall })
}

async function api(path,body,ctx=context){
 let error
 for(let attempt=0;attempt<3;attempt++){
  try{
   const response=await ctx.request.fetch(origin+'/api/app/'+path,{method:body?'POST':'GET',headers:body?{Origin:origin,'Content-Type':'application/json'}:{},data:body})
   return{status:response.status(),data:await response.json(),headers:response.headers()}
  }catch(e){
   error=e
   if(attempt<2)await new Promise(resolve=>setTimeout(resolve,300*(attempt+1)))
  }
 }
 throw error
}
async function ready(){
 const mobile=await page.evaluate(()=>window.innerWidth<=760)
 const nav=page.locator(mobile?'.hh-mobile-app-nav':'.hh-nav')
 for(let attempt=0;attempt<3;attempt++){
  try {
   await expect(nav).toBeVisible({timeout:attempt===0?30000:20000})
   await page.waitForLoadState('networkidle')
   return
  } catch(error) {
   if(attempt===2)throw error
   // The isolated actor can hit its genuine sliding quota during hundreds of
   // synthetic test answers. Only retry a signed-in app error, never weaken the
   // production limit or accidentally sign in another account.
   const retryShown=await page.getByRole('button',{name:/Try again|Повторить|Retry/}).isVisible().catch(()=>false)
   if(!retryShown)throw error
   const probe=await api('bootstrap').catch(()=>({status:0}))
   if(probe.status!==429&&probe.status!==200)throw error
   console.log('SYNTHETIC_APP_READ_COOLDOWN',attempt+1,probe.status)
   if(probe.status===429)await page.waitForTimeout(25000)
   await page.reload({waitUntil:'domcontentloaded'})
  }
 }
}
async function chooseVisibleTest(testPage,name){
 const customizer=testPage.getByRole('button',{name:/Choose my own tests and filters/})
 if(!(await customizer.count())){
  const toggle=testPage.getByRole('button',{name:'Choose or change tests',exact:true})
  if(await toggle.count())await toggle.click()
 }
 await expect(customizer).toBeVisible({timeout:15000})
 if((await customizer.getAttribute('aria-expanded'))!=='true')await customizer.click()
 const card=()=>testPage.locator('article').filter({has:testPage.getByRole('heading',{name,exact:true})})
  .filter({has:testPage.getByRole('checkbox',{name,exact:true})}).first()
 if(!(await card().isVisible().catch(()=>false))){
  const more=testPage.getByRole('button',{name:/^Show all matching tests/}).first()
  if(await more.count())await more.click()
 }
 if(!(await card().isVisible().catch(()=>false))){
  const all=testPage.getByRole('button',{name:'Full database',exact:true})
  if(await all.count())await all.click()
  const more=testPage.getByRole('button',{name:/^Show all matching tests/}).first()
  if(await more.count())await more.click()
 }
 await expect(card()).toBeVisible({timeout:15000})
 await card().getByRole('checkbox',{name,exact:true}).check()
}
async function enterTest(name='Current State Check',mode='Guided'){
 await page.goto(origin+'/en/app/tests');await ready()
 if(await page.locator('[data-saved-test]').count()){
  await expect(page.locator('#my-tests-list')).toBeVisible()
  assert.equal(await page.getByRole('button',{name:/^Start testing/}).count(),0)
  await screenshotEvidence(page,{path:output+'/my-tests-choose-test.png',fullPage:false})
 }
 const candidate=()=>page.locator('article').filter({
   has:page.getByRole('heading',{name,exact:true}),
 }).filter({has:page.getByRole('button',{name:/^(Start test|Continue test|Retake test)/})}).first()
 if(!(await candidate().count())){
  const filters=page.getByRole('button',{name:/Open test filters|Review test filters/})
  if(await filters.count() && !(await page.locator('#my-test-explorer').isVisible().catch(()=>false))) await filters.click()
  await chooseVisibleTest(page,name)
  await page.getByRole('button',{name:'Start free monitoring',exact:true}).first().click()
  await expect(page.locator('[data-pending-selection]')).toHaveCount(0)
  await expect(page.locator('#my-tests-list')).toBeVisible()
 }
 await expect(candidate()).toBeVisible({timeout:15000})
 await candidate().getByRole('button',{name:/^(Start test|Continue test|Retake test)/}).click()
 await expect(page).toHaveURL(/\/runs\//)
 await expect(page.locator('.hh-runner')).toBeVisible()
 // My Tests opens the first question immediately; the optional guided mode stays inside the runner.
 await expect(page.locator('.hh-test-mode-picker')).toHaveCount(0)
 // A saved draft may already be on its final optional-context screen.
 await expect(page.locator('.hh-runner-question, .hh-runner-complete, .hh-quick-form').first()).toBeVisible()
 if(mode==='Guided'){
  await page.locator('.hh-test-mode-toggle').getByRole('button',{name:/Guided/}).click()
  await expect(page.locator('.hh-runner-question, .hh-runner-complete').first()).toBeVisible()
 }else await expect(page.locator('.hh-quick-form')).toBeVisible()
}
async function savedClick(button){
 // Keep this long synthetic journey below the unchanged account request quota.
 // Faster CI machines otherwise exhaust it during Mini-IPIP and the next draft.
 await page.waitForTimeout(750)
 const [response]=await Promise.all([page.waitForResponse(r=>new URL(r.url()).pathname.endsWith('/save')&&r.request().method()==='POST'),button.click()])
 assert.equal(response.status(),200,'Server must acknowledge each save')
 await expect(page.getByRole('status')).toHaveText('Saved securely')
}
async function answerCurrent(value){await savedClick(page.locator('.hh-scale').getByRole('button',{name:String(value),exact:true}));await savedClick(page.getByRole('button',{name:'Next',exact:true}))}
async function saveAndExit(){
 await page.getByRole('button',{name:'Save and exit'}).click()
 // Do not cancel the in-flight save with a scripted page.goto. Wait for the app's own navigation.
 await expect(page).toHaveURL(/\/tests$/)
 await ready()
}
async function openCompletedPlanResult(){
 // A completed battery returns to the overview; a retake may navigate to its result directly.
 await expect(page).toHaveURL(/\/(?:tests\?plan=|results\/)/,{timeout:15000})
 if(/\/results\//.test(page.url()))return
 await expect(page.locator('#my-tests-list')).toBeVisible()
 const resultLink=page.getByRole('link',{name:'View result'}).first()
 await expect(resultLink).toHaveAttribute('href',/\/results\//)
 // WebKit can hydrate a newly completed test overview more slowly in CI.
 // Wait for route readiness before exercising client-side navigation.
 await page.waitForLoadState('networkidle')
 await resultLink.click()
 await expect(page).toHaveURL(/\/results\//,{timeout:20000})
}
async function assertPublicViewportFits(target,label){
 const width=await target.evaluate(()=>window.innerWidth)
 const scroll=await target.evaluate(()=>document.documentElement.scrollWidth)
 if(scroll>width+1){
  // Report offending public DOM nodes without hiding overflow or muting the
  // original strict assertion. This runs only in isolated synthetic CI.
  const offenders=await target.evaluate(()=>{
   const viewport=window.innerWidth
   const roots=[document.documentElement,document.body]
   const all=[...roots,...document.querySelectorAll('body *')]
   const metrics=all.map(node=>{
    const box=node.getBoundingClientRect()
    const style=getComputedStyle(node)
    return {
     tag:node.tagName.toLowerCase(),
     className:typeof node.className==='string'?node.className.slice(0,100):'',
     left:Math.round(box.left),right:Math.round(box.right),
     width:Math.round(box.width),client:node.clientWidth,scroll:node.scrollWidth,
     overflow:style.overflowX,position:style.position,
     label:(node.getAttribute('aria-label')||node.textContent||'').trim().slice(0,58),
    }
   })
   const byExcess=metrics.filter(m=>m.scroll>m.client+1||m.right>viewport+1||m.left< -1)
    .sort((a,b)=>(b.scroll-b.client)-(a.scroll-a.client)||b.right-a.right).slice(0,18)
   const byRight=metrics.filter(m=>m.width>0).sort((a,b)=>b.right-a.right).slice(0,10)
   return {document:{width:viewport,htmlScroll:document.documentElement.scrollWidth,bodyScroll:document.body.scrollWidth},byExcess,byRight}
  })
  console.error('PUBLIC_OVERFLOW_GEOMETRY',label,JSON.stringify(offenders))
 }
 assert.ok(scroll<=width+1,`Public overflow: ${label} (${scroll} > ${width})`)
}
async function verifyPublicServiceConversionJourneys(){
 const publicContext=await browser.newContext({viewport:{width:390,height:844}})
 const publicErrors=[]
 const services=[
  ['dao-health-profile','dao',{en:'Free Wu Xing Resource Profile',ru:'Бесплатный профиль ресурсов У-Син'}],
  ['alchemy-of-soul','alchemy',{en:'Alchemy of the Soul',ru:'Алхимия души'}],
  ['hypnotherapy-course','hypnotherapy',{en:'Guided Imagery Hypnotherapy',ru:'Курс гипнотерапии'}],
 ]
 for(const locale of ['en','ru']){
  for(const [slug,kind,names] of services){
   const servicePage=await publicContext.newPage()
   servicePage.on('pageerror',error=>publicErrors.push(error.message))
   for(const width of [320,360,390,1280]){
    await servicePage.setViewportSize({width,height:844})
    await servicePage.goto(origin+'/'+locale+'/services/'+slug,{waitUntil:'networkidle'})
    await expect(servicePage.locator('main[data-core-service-detail="'+kind+'"] h1')).toBeVisible({timeout:30000})
    await assertPublicViewportFits(servicePage,locale+'/'+slug+'/'+width)
    if(kind==='alchemy'){
     const guideHeading=servicePage.locator('#distance-homeopathy-guide h1')
     await expect(guideHeading).toBeVisible()
     const headingSize=await guideHeading.evaluate(node=>({
      scroll:node.scrollWidth,client:node.clientWidth,font:getComputedStyle(node).fontSize,
     }))
     assert.ok(headingSize.scroll<=headingSize.client+1,
      'Distance-homeopathy heading must wrap inside its '+width+'px '+locale+' article: '+JSON.stringify(headingSize))
     // The article itself stays on the Alchemy page, but there is no
     // navigation link to inject into client reports or service copy.
     await expect(servicePage.locator('a[href="#distance-homeopathy-guide"]')).toHaveCount(0)
    }
    if(width===390||width===1280)await servicePage.screenshot({path:output+'/service-'+locale+'-'+slug+'-'+width+'.png',fullPage:false})
    if(width!==390)continue
    const capture=servicePage.locator('[data-sitewide-capture="core-service"][data-core-service-capture="'+kind+'"]')
    await capture.scrollIntoViewIfNeeded()
    await expect(capture).toBeVisible({timeout:30000})
    const cta=capture.locator('a[data-contact-channel="whatsapp"]')
    await expect(cta).toBeVisible()
    const href=await cta.getAttribute('href')
    const message=decodeURIComponent(new URL(href).searchParams.get('text')||'')
    assert.ok(message.includes(names[locale]),'Hydrated footer CTA must retain '+names[locale])
    const alternative=capture.locator('details')
    assert.equal(await alternative.evaluate(element=>element.open),false,'Free review alternative starts collapsed')
    await alternative.locator('summary').click()
    await expect(alternative.locator('a[href="/'+locale+'/services/free-situation-review"]')).toBeVisible()
   }
   await servicePage.close()
  }
 }
 for(const locale of ['en','ru']){
  const publicPage=await publicContext.newPage()
  publicPage.on('pageerror',error=>publicErrors.push(error.message))
  const copy=locale==='ru'
   ? {ready:'Ответы готовы к копированию. Пока ничего не отправлено.',copied:'Скопировано',fallback:'Выделите и скопируйте текст ниже'}
   : {ready:'Your answers are ready to copy. Nothing has been sent.',copied:'Copied',fallback:'Select and copy the text below'}
  for(const width of [320,360,390,1280]){
   await publicPage.setViewportSize({width,height:844})
   await publicPage.goto(origin+'/'+locale+'/services/free-situation-review',{waitUntil:'networkidle'})
   const intake=publicPage.locator('[data-free-drawing-intake]')
   await expect(intake).toBeVisible({timeout:30000})
   await assertPublicViewportFits(publicPage,locale+'/free-review/'+width)
   if(width===390||width===1280)await publicPage.screenshot({path:output+'/free-review-'+locale+'-'+width+'.png',fullPage:false})
  }
  await publicPage.setViewportSize({width:390,height:844})
  await publicPage.goto(origin+'/'+locale+'/services/free-situation-review',{waitUntil:'networkidle'})
  await publicPage.evaluate(()=>{
   document.documentElement.dataset.analyticsConsent='granted'
   window.__publicAcquisition=[]
   window.addEventListener('holistic-house:acquisition',event=>window.__publicAcquisition.push(event.detail))
  })
  await publicPage.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async value=>{window.__syntheticClipboard=value}}}))
  const intake=publicPage.locator('[data-free-drawing-intake]')
  const uniqueProblem='Synthetic public form value — '+locale
  const uniqueGoal='Synthetic public goal value — '+locale
  await intake.locator('textarea').nth(0).fill(uniqueProblem)
  await intake.locator('textarea').nth(1).fill(uniqueGoal)
  await intake.locator('form button[type="submit"]').click()
  const ready=intake.locator('[role="region"]')
  await expect(ready).toBeVisible()
  await expect(ready.getByRole('heading')).toHaveText(copy.ready)
  assert.equal(await ready.getAttribute('aria-live'),'polite')
  await expect(ready).toBeFocused({timeout:15000})
  await ready.screenshot({path:output+'/free-review-'+locale+'-ready-region-390.png'})
  const whatsapp=ready.locator('a[data-contact-channel="whatsapp"]')
  const whatsappHref=await whatsapp.getAttribute('href')
  const whatsappText=new URL(whatsappHref||'').searchParams.get('text')||''
  const decodedPageUrl=decodeURIComponent(publicPage.url())
  for(const marker of [uniqueProblem,uniqueGoal]){
   assert.ok(!whatsappText.includes(marker),'Answers never enter decoded WhatsApp text')
   assert.ok(!decodedPageUrl.includes(marker),'Answers never enter decoded page URL')
  }
  await ready.getByRole('button').click()
  await expect(ready.locator('p[aria-live="polite"]')).toContainText(copy.copied)
  await publicPage.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw new Error('synthetic clipboard denial')}}}))
  await ready.getByRole('button').click()
  await expect(ready.locator('p[aria-live="polite"]')).toContainText(copy.fallback)
  await publicPage.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async value=>{window.__syntheticClipboardRecovery=value}}}))
  await ready.getByRole('button').click()
  await expect(ready.locator('p[aria-live="polite"]')).toContainText(copy.copied)
  const events=await publicPage.evaluate(()=>window.__publicAcquisition)
  // The temporary SDK safety hold also suppresses the public event emitter,
  // including when this fixture forces a stale granted dataset. Restore the
  // positive analytics contract only with the fully verified transport repair.
  assert.deepEqual(events,[], 'Temporary analytics hold must emit no acquisition events')
  assert.ok(!JSON.stringify(events).includes(uniqueProblem),'Analytics event metadata never contains answers')
  assert.ok(!JSON.stringify(events).includes(uniqueGoal),'Analytics event metadata never contains answers')
  await publicPage.screenshot({path:output+'/free-review-'+locale+'-prepared-390.png',fullPage:false})
  await publicPage.close()
 }
 assert.deepEqual(publicErrors,[])
 await publicContext.close()
 passed('public EN/RU service conversion journeys: mobile/desktop layout, hydrated same-service footer, disclosure, private free-review handoff and screenshots')
}

try {
 await verifyPublicServiceConversionJourneys()
 // Public test picker must work anonymously before OAuth.
 const guestPickerContext=await browser.newContext({viewport:{width:390,height:844}})
 const guestPickerPage=await guestPickerContext.newPage()
 await guestPickerPage.goto(origin+'/en/client')
 const picker=guestPickerPage.locator('[data-prelogin-test-picker]')
 await expect(picker).toBeVisible({timeout:30000})
 await expect(picker.getByRole('heading',{name:'Choose your tests',exact:true})).toBeVisible()
 await expect(picker.getByRole('heading',{name:'Recommended for you',exact:true})).toBeVisible()
 const conditionalProblems=picker.locator('[data-topic-problem-filter]')
 await expect(conditionalProblems).toBeVisible()
 await expect(conditionalProblems.getByText('Choose a topic above to see relevant concerns.')).toBeVisible()
 const rankedCards=picker.locator('[data-test-match]')
 await expect(rankedCards).toHaveCount(5)
 const typeFilters=picker.locator('[data-test-kind-filter]')
 const optional=picker.locator('details').first()
 assert.equal(await optional.evaluate(el=>el.open),false,'Detailed selection starts collapsed')
 await expect(typeFilters).toBeHidden()
 await optional.locator('summary').click()
 await expect(typeFilters).toBeVisible()
 const typeChoices=typeFilters.locator('input[data-test-kind-checkbox]')
 await expect(typeChoices).toHaveCount(3)
 await expect(typeChoices.locator('xpath=..').first()).toBeVisible()
 assert.deepEqual(await typeChoices.evaluateAll(nodes=>nodes.map(node=>node.value)),['professional','monitoring','hobby'])
 assert.equal(await picker.locator('[data-test-kind-badge]').count(),5,'Every displayed test needs a visible category icon and label')
 const selectedSummary=picker.locator('[data-public-selected-tests] [data-selected-test-key]')
 await expect(selectedSummary).toHaveCount(3)
 const defaultKeys=await selectedSummary.evaluateAll(nodes=>nodes.map(node=>node.dataset.selectedTestKey))
 assert.ok(defaultKeys.every(key=>MONITORING_CATALOG.some(entry=>entry.key===key&&entry.startable&&entry.rightsStatus==='cleared'&&entry.starterEligible!==false)))
 for(const card of await rankedCards.all()){
  const key=await card.getAttribute('data-test-match')
  await expect(card.locator('input[type="checkbox"]')).toBeChecked({checked:defaultKeys.includes(key)})
 }
 const initialPercents=await rankedCards.evaluateAll(nodes=>nodes.map(node=>Number(node.dataset.relevance)))
 assert.ok(initialPercents.every(value=>Number.isInteger(value)&&value>=0&&value<=99))
 assert.deepEqual(initialPercents,[...initialPercents].sort((a,b)=>b-a),'fit percentages must be descending')
 await typeChoices.nth(0).check()
 await expect(rankedCards).toHaveCount(5)
 assert.ok((await picker.locator('[data-test-kind-badge]').evaluateAll(nodes=>nodes.map(node=>node.dataset.testKindBadge))).every(kind=>kind==='professional'),
  'Professional checkbox must restrict recommendations to documented professional tests')
 await typeChoices.nth(2).check()
 assert.ok((await picker.locator('[data-test-kind-badge]').evaluateAll(nodes=>nodes.map(node=>node.dataset.testKindBadge))).every(kind=>['professional','hobby'].includes(kind)),
  'Multiple kind checkboxes combine with OR')
 await typeChoices.nth(0).uncheck()
 assert.ok((await picker.locator('[data-test-kind-badge]').evaluateAll(nodes=>nodes.map(node=>node.dataset.testKindBadge))).every(kind=>kind==='hobby'),
  'Unchecking professional must keep only hobby tests')
 await typeChoices.nth(2).uncheck()
 await optional.locator('summary').click()
 await expect(typeFilters).toBeHidden()
 await expect(rankedCards).toHaveCount(5)
 await picker.getByRole('button',{name:/Show 5 more tests/}).click()
 await expect(rankedCards).toHaveCount(10)
 await picker.getByRole('button',{name:/Show 5 more tests/}).click()
 await expect(rankedCards).toHaveCount(15)
 await expect(rankedCards.locator('input[type="checkbox"]:checked')).toHaveCount(3)
 await rankedCards.nth(3).locator('input[type="checkbox"]').check()
 await expect(rankedCards.locator('input[type="checkbox"]:checked')).toHaveCount(4)
 await picker.getByRole('button',{name:'Use suggested set'}).click()
 await expect(rankedCards.locator('input[type="checkbox"]:checked')).toHaveCount(3)
 assert.equal(await optional.evaluate(el=>el.open),false,'Depth selection must be folded after changing test kinds')
 const stress=picker.getByRole('button',{name:'Stress',exact:true})
 await stress.click()
 await expect(stress).toHaveAttribute('aria-pressed','true')
 const workConcern=conditionalProblems.getByRole('button',{name:'Workload feels overwhelming'})
 await expect(workConcern).toBeVisible()
 await expect(conditionalProblems.getByRole('button',{name:'Feeling lonely'})).toHaveCount(0)
 await expect(rankedCards).toHaveCount(5)
 const beforeProblem=await rankedCards.evaluateAll(nodes=>nodes.map(node=>Number(node.dataset.relevance)))
 await workConcern.click()
 await expect(workConcern).toHaveAttribute('aria-pressed','true')
 await expect(rankedCards.first()).toBeVisible()
 const afterProblem=await rankedCards.evaluateAll(nodes=>nodes.map(node=>Number(node.dataset.relevance)))
 assert.ok(afterProblem.length>0&&afterProblem.length<=beforeProblem.length)
 assert.notDeepEqual(afterProblem,beforeProblem,'choosing a concern updates questionnaire relevance')
 await conditionalProblems.getByRole('button',{name:/Clear problems/}).click()
 await expect(workConcern).toHaveAttribute('aria-pressed','false')
 await expect(rankedCards).toHaveCount(5)
 await expect(rankedCards.locator('input[type="checkbox"]:checked')).toHaveCount(3)
 await expect(picker.getByRole('heading',{name:'Recommended for you',exact:true})).toBeVisible()
 await optional.locator('summary').click()
 await picker.getByRole('button',{name:/Quick check-in/}).click()
 await expect(picker.getByRole('button',{name:/Quick check-in/})).toHaveAttribute('aria-pressed','true')
 await optional.locator('summary').click()
 const handoffKeys=await selectedSummary.evaluateAll(nodes=>nodes.map(node=>node.dataset.selectedTestKey))
 await picker.getByRole('button',{name:'Browse full database'}).click()
 await expect(guestPickerPage.getByRole('heading',{name:'Find the tests that fit you'})).toBeVisible()
 const fullTypeFilters=guestPickerPage.locator('[data-test-kind-filter]').first()
 await expect(fullTypeFilters).toBeHidden()
 await guestPickerPage.getByRole('button',{name:/Choose my own tests and filters/}).click()
 await guestPickerPage.getByRole('button',{name:/Test type/}).click()
 await expect(fullTypeFilters).toBeVisible()
 await expect(fullTypeFilters.locator('input[data-test-kind-checkbox]')).toHaveCount(3)
 await fullTypeFilters.locator('input[value="monitoring"]').check()
 await expect(guestPickerPage.locator('article [data-test-kind-badge]').first()).toBeVisible()
 await fullTypeFilters.locator('input[value="monitoring"]').uncheck()
 const handoffTitles=await guestPickerPage.locator('article input[type="checkbox"]:checked').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('aria-label')))
 assert.deepEqual(handoffTitles.sort(),handoffKeys.map(key=>MONITORING_CATALOG.find(entry=>entry.key===key).title.en).sort(),'full catalog must preserve every actual selected test')
 await guestPickerPage.getByRole('button',{name:/Back to easy selection/}).click()
 await expect(picker).toBeVisible()
 assert.match(guestPickerPage.url(),/\/en\/client$/)
 await guestPickerPage.goto(origin+'/ru/client')
 const ruPicker=guestPickerPage.locator('[data-prelogin-test-picker]')
 await expect(ruPicker.getByRole('heading',{name:'Подберите свои тесты'})).toBeVisible()
 await expect(ruPicker.locator('[data-test-kind-filter]')).toBeHidden()
 await expect(ruPicker.locator('[data-test-kind-filter] input[data-test-kind-checkbox]')).toHaveCount(3)
 await ruPicker.locator('details').first().locator('summary').click()
 await expect(ruPicker.locator('[data-test-kind-filter]')).toBeVisible()
 for (const width of [320,375,390,430]) {
  await guestPickerPage.setViewportSize({width,height:844})
  assert.ok(await guestPickerPage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),
    'RU client selector must fit '+width+'px without horizontal document scrolling')
 }
 await guestPickerPage.setViewportSize({width:390,height:844})
 await ruPicker.getByRole('button',{name:'Стресс',exact:true}).click()
 await expect(ruPicker.getByRole('button',{name:'Перегрузка на работе'})).toBeVisible()
 await guestPickerContext.close()
 passed('pre-login test picker, optional filters, recommendations and full database')

 // Public course-information preview is intentionally available before Google
 // login and before voluntary personal course-data consent. No private scores
 // or account session are needed to read all fourteen genuine day names.
 for (const [language, title] of [
   ['en','What happens during the 14 days?'],
   ['ru','Что вас ждёт за 14 дней?'],
 ]) {
   await page.goto(origin+'/'+language+'/app/course')
   const overview=page.locator('[data-course-before-signup="guest"]')
   await expect(overview).toBeVisible({timeout:20000})
   await expect(overview.getByRole('heading',{name:title,exact:true})).toBeVisible()
   await expect(overview.locator('[data-course-phase]')).toHaveCount(4)
   const detailed=overview.locator('[data-course-14-day-list]')
   await detailed.locator('summary').click()
   await expect(detailed.locator('[data-course-day]')).toHaveCount(14)
   for (const width of [320,390]) {
     await page.setViewportSize({width,height:844})
     assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),
       language+' public course preview must fit the mobile viewport')
   }
   await screenshotEvidence(page,{path:output+'/course-public-'+language+'.png',fullPage:false})
 }
 await page.setViewportSize({width:390,height:844})
 passed('anonymous EN/RU course preview shows four phases and all 14 real days without account access')

 const response=await page.goto(origin+'/en/app');assert.match(response.headers()['cache-control'],/no-store/);assert.match(response.headers()['x-robots-tag'],/noindex/);assert.equal(response.headers()['referrer-policy'],'no-referrer')
 await page.getByRole('button',{name:'Continue with Google'}).click();await expect(page.getByRole('heading',{name:'Create my private space'})).toBeVisible({timeout:60000})
 await page.getByLabel('I am 18 or older.').check();await page.getByLabel('I agree to private processing',{exact:false}).check();assert.equal(await page.getByLabel('I agree to optional marketing',{exact:false}).count(),0)
 await page.getByRole('button',{name:'Create my private space'}).click();await ready();await expect(page.getByRole('heading',{name:'Choose your tests',exact:true})).toBeVisible();
 await expect(page.locator('[data-my-tests-dashboard]')).toBeVisible();
 await expect(page.getByRole('button',{name:/^Choose tests/}).first()).toBeInViewport();await expect(page.getByRole('button',{name:/Open test filters/})).toBeVisible();
 await expect(page.getByRole('button',{name:'Get recommendations'})).toBeVisible();
 await expect(page.getByRole('button',{name:'Download report'})).toBeVisible();
 await expect(page.locator('.hh-nav')).toBeHidden();
 await expect(page.getByRole('navigation',{name:'Quick navigation'}).getByRole('link',{name:'Profile'})).toBeVisible();
 await screenshotEvidence(page,{path:output+'/my-tests-first-screen.png',fullPage:false});await page.goto(origin+'/en/app/portrait');await ready();await expect(page.getByRole('heading',{name:'Your profile',exact:true})).toBeVisible();await expect(page.locator('[data-personal-portrait-summary]')).toBeVisible();await expect(page.locator('[data-profile-head]')).toBeVisible();await expect(page.locator('[data-profile-head] img[src*="holistic-house-test-brain-concept"]')).toBeVisible();await page.locator('[data-profile-deep-dive] > summary').click();await expect(page.getByRole('heading',{name:'Professional test scales',exact:true})).toBeVisible();await expect(page.getByRole('heading',{name:'Selected tests still to complete',exact:true})).toBeVisible();await page.locator('[data-profile-extra-tools] > summary').click();await expect(page.getByRole('heading',{name:'Check your current state',exact:true})).toBeVisible();await expect(page.getByText('Profile',{exact:true}).first()).toBeVisible();await expect(page.getByRole('link',{name:/Take a free state analysis and get recommendations/})).toBeVisible();passed('supported SDK PKCE callback opens the action-first Cabinet dashboard')
 const profileOfferCases=[
   ['psychology','alchemy-of-soul','Alchemy of the Soul'],
   ['homeopathy','psychohomeopathy','homeopathy'],
   ['wu_xing','dao-health-profile','Wu Xing'],
   ['hypnotherapy','hypnotherapy-course','Hypnotherapy'],
 ]
 async function verifyProfileServiceOffers(target, locale='en') {
   // Legacy cabinets are SSR-first: do not race a tap against React hydration.
   await expect(target.locator('[data-profile-domains][data-profile-interactive="true"]')).toBeVisible({timeout:20000})
   for (const [area, slug, service] of profileOfferCases) {
     await target.locator('#hh-domain-tab-'+area).click()
     const support=target.locator('.hh-domain-support')
     if (await support.getAttribute('open') === null) await support.locator('summary').click()
     const promo=target.locator('[data-profile-service-cta="'+area+'"]')
     await expect(promo).toBeVisible()
     const order=promo.locator('a[data-contact-channel="whatsapp"]')
     await expect(order).toBeVisible()
     const href=await order.getAttribute('href')
     const url=new URL(href)
     assert.equal(url.origin,'https://wa.me')
     assert.equal(url.pathname,'/14376066502')
     assert.ok(url.searchParams.get('text')?.includes(service))
     assert.ok(!url.searchParams.get('text')?.includes('/client/'))
     await expect(promo.locator('a[href="/'+locale+'/services/'+slug+'"]')).toBeVisible()
     assert.equal(await target.locator('[data-profile-service-cta]').count(),1)
   }
   await target.locator('#hh-domain-tab-psychology').click()
 }
 await verifyProfileServiceOffers(page)
 passed('every Google Cabinet profile has one working service-specific WhatsApp enquiry and matching landing link')
 await page.goto(origin+'/en/app/monitoring');await ready();await expect(page.getByRole('heading',{name:'Psi-Monitoring',exact:true})).toBeVisible();await expect(page.getByRole('heading',{name:'My Monitoring',exact:true})).toBeVisible();await expect(page.getByText('Not completed',{exact:true}).first()).toBeVisible();await screenshotEvidence(page,{path:output+'/psi-monitoring-initial.png',fullPage:false});passed('Psi-Monitoring opens as a first-class signed-in monitoring workspace')
 await page.getByRole('button',{name:'Happy',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();await expect.poll(async()=>((await api('bootstrap')).data.moodCheckins||[]).length).toBe(1);await page.getByRole('button',{name:'Not now',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);passed('signed-in mood tap persists even when the user chooses Not now')
 const practitionerDb=await adminClient();try{await practitionerDb.query('update app.practitioners set trusted_auth_user_id=$1 where active',[A])}finally{await practitionerDb.end()}
 // A public Master account must not be allowed to open the owner's global client database.
 await page.goto(origin+'/en/app/portrait');await ready();
 await expect(page.getByRole('heading',{name:'Practitioner tools',exact:true})).toHaveCount(0);
 await expect(page.getByRole('link',{name:'Master',exact:true})).toBeVisible();
 await page.getByRole('link',{name:'Master',exact:true}).click();
 await expect(page).toHaveURL(/\/en\/app\/practice$/);
 await expect(page.getByRole('heading',{name:'Practitioner tools',exact:true})).toHaveCount(0);
 await expect(page.locator('.hh-practice-dashboard')).toBeVisible({timeout:25000});
 await expect(page.getByRole('button',{name:'Create report',exact:true})).toHaveCount(0);
 await expect(page.locator('.hh-practice-more-tools')).toHaveCount(0);
 await screenshotEvidence(page,{path:output+'/master-compact-practice-mobile.png',fullPage:false});
 const practitionerOpen=await api('practitioner/open',{destination:'clients'});
 assert.equal(practitionerOpen.status,404);assert.equal(practitionerOpen.data.error,'NOT_FOUND');
 passed('public Master can open own practice but cannot access owner client database')
 await page.goto(origin+'/en/app');await ready()
 await page.goto(origin+'/en/app/reports');await ready();await expect(page.getByRole('heading',{name:'No reports from Andy have been saved yet.'})).toBeVisible();passed('Reports is a first-class empty Cabinet layer')
  await page.goto(origin+'/en/app/analysis');await ready()
  await expect(page).toHaveURL(/\/en\/app\/portrait#personal-reports/)
  await expect(page.locator('[data-personal-portrait-summary]')).toBeVisible()
  await expect(page.locator('[data-profile-report-archive]')).toBeVisible()
  await expect(page.locator('[data-personal-reports]')).toBeVisible()
  await expect(page.locator('[data-analysis-offer]')).toHaveCount(0)
  await expect(page.getByText('No saved reports yet')).toBeVisible()
  const primaryNav=page.getByRole('navigation',{name:'Quick navigation'})
  await expect(primaryNav.locator('a')).toHaveCount(5)
  await expect(primaryNav.getByRole('link',{name:'Analysis'})).toHaveCount(0)
  await expect(primaryNav.getByRole('link',{name:'Profile'})).toHaveAttribute('aria-current','page')
  for(const width of [320,390,768,1280]){
    await page.setViewportSize({width,height:900})
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Profile must not overflow viewport at '+width+'px')
    await screenshotEvidence(page,{path:output+'/integrated-profile-en-'+width+'.png',fullPage:true})
  }
  await page.setViewportSize({width:390,height:844})
  passed('legacy Analysis route opens the secure integrated Profile archive with five responsive destinations')
 const cookies=await context.cookies();assert.ok(cookies.some(c=>c.name.startsWith('hh-app-auth')&&c.httpOnly));assert.ok(!(await page.evaluate(()=>document.cookie)).includes('hh-app-auth'));passed('app tokens remain HttpOnly')
 await enterTest();assert.equal(await page.locator('.hh-scale [aria-pressed=true]').count(),0)
 await screenshotEvidence(page,{path:output+'/current-state-runner.png',fullPage:true})
 await answerCurrent(7);await saveAndExit()
 await page.reload();await ready();await enterTest();await expect(page.getByRole('heading',{name:'How much energy and inner support do you feel right now?'})).toBeVisible();passed('saved answers and progress resume after reload')
 for(const v of[3,6,8,5])await answerCurrent(v)
 await page.getByText('Add optional context',{exact:true}).click();await page.getByLabel('Anything else you want to note?').fill('Synthetic private context, not a real person.');await page.getByLabel('What changed or seems to trigger this?').fill('Synthetic trigger.');await page.getByLabel('What would you like to change?').fill('Synthetic desired change.')
 await saveAndExit();await enterTest();await page.getByText('Add optional context',{exact:true}).click();await expect(page.getByLabel('Anything else you want to note?')).toHaveValue('Synthetic private context, not a real person.');await expect(page.getByLabel('What changed or seems to trigger this?')).toHaveValue('Synthetic trigger.');await expect(page.getByLabel('What would you like to change?')).toHaveValue('Synthetic desired change.');passed('Save and exit flushes versioned optional context without touching scores')
 await page.getByRole('button',{name:'Save results and get recommendations'}).click();await openCompletedPlanResult();await expect(page.getByRole('heading',{name:'Context at this check-in'})).toBeVisible();await expect(page.getByText('Synthetic trigger.',{exact:true})).toBeVisible();const first=(await api('bootstrap')).data.results[0];assert.equal(first.dimensions.length,5);passed('first result, owner-only optional context and snapshot persist in actual PostgreSQL')
 await page.goto(origin+'/en/app');await ready()
 await expect(page.getByRole('button',{name:'Download report'})).toBeEnabled()
 const pdfDownloadPromise=page.waitForEvent('download',{timeout:60000})
 await page.getByRole('button',{name:'Download report'}).click()
 const pdfDownload=await pdfDownloadPromise
 assert.match(pdfDownload.suggestedFilename(),/\.pdf$/)
 const pdfBytes=await readFile(await pdfDownload.path())
 assert.ok(pdfBytes.length>12000,'personal report must contain rendered text pages')
 assert.equal(pdfBytes.subarray(0,8).toString(),'%PDF-1.4')
 assert.ok(pdfBytes.toString('latin1').includes('/Type /Pages'))
 passed('real printable PDF downloads with all latest personal results and scale data')
 await page.goto(origin+'/en/app/portrait');await ready();
  await expect(page.locator('[data-profile-head]')).toBeVisible();
  await expect(page.locator('[data-personal-portrait-summary]')).toBeVisible();
  await page.locator('[data-profile-deep-dive] > summary').click();
  await expect(page.locator('[data-measured-scale]')).toHaveCount(0);await expect(page.getByText(/No professional test results yet/)).toBeVisible();
  await expect(page.getByRole('heading',{name:'Professional test scales',exact:true})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Selected tests still to complete',exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Download report'})).toBeEnabled();
  await expect(page.getByRole('link',{name:/Get personal recommendations from a specialist/})).toBeVisible();
  await page.getByRole('link',{name:/Retake completed tests/}).click();
  await expect(page).toHaveURL(/\/en\/app\/tests\?filter=completed/);
  await expect(page.locator('#my-tests-list')).toBeVisible();
  await page.goto(origin+'/en/app/portrait');await ready();await page.locator('[data-profile-deep-dive] > summary').click();await page.locator('[data-profile-extra-tools] > summary').click();
  await expect(page.getByRole('heading',{name:'Add your baseline profile',exact:true})).toBeVisible();await expect(page.getByRole('link',{name:/Results portfolio/})).toBeVisible()
 for(const width of[320,360,390,430,768,1280]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await screenshotEvidence(page,{path:`${output}/portrait-en-${width}.png`,fullPage:true})}
 assert.equal(await page.locator('.mobile-bottom-navigation').count(),0);passed('action-first profile dashboard and responsive no-overflow screenshots 320–1280')
 await page.goto(origin+'/en/app/portfolio');await ready();
  await expect(page.getByRole('heading',{name:'My results',exact:true})).toBeVisible()
 await expect(page.locator('[data-testid="completed-test-insights"]')).toBeVisible()
  const insightsSummary=page.locator('[data-testid="insights-summary"]')
  await expect(insightsSummary.locator('dd')).toHaveText(['1','1','5'])
  const insightsFilters=page.locator('[data-testid="insights-filters"]')
  assert.equal(await insightsFilters.getAttribute('open'),null,'filters start collapsed')
  await insightsFilters.locator('summary').click()
  await expect(insightsFilters.locator('[data-testid="insights-category-filters"]')).toBeVisible()
  const moodFilter=insightsFilters.getByRole('button',{name:/Mood/})
  await moodFilter.click()
  await expect(moodFilter).toHaveAttribute('aria-pressed','true')
  await expect(page.locator('.hh-insights-test-card')).toHaveCount(1)
  await expect(insightsSummary.locator('dd')).toHaveText(['1','1','5'])
  await insightsFilters.getByRole('button',{name:'Reset filters',exact:true}).click()
  await expect(moodFilter).toHaveAttribute('aria-pressed','false')
  await insightsFilters.locator('summary').click()
  assert.equal(await insightsFilters.getAttribute('open'),null,'filters close without changing all-time counts')
  await expect(insightsSummary.locator('dd')).toHaveText(['1','1','5'])
 await expect(page.locator('.hh-insights-test-card')).toHaveCount(1)
 await expect(page.getByRole('link',{name:/Open analysis & recommendations/}).first()).toBeVisible()
 await page.locator('.hh-insights-advanced > summary').click()
 await expect(page.locator('.hh-metric')).toHaveCount(5)
 await page.locator('.hh-metric').first().click()
 await expect(page.locator('.hh-detail')).toBeVisible()
 await screenshotEvidence(page,{path:output+'/insights-completed-tests-en.png',fullPage:false})
 passed('completed tests lead Insights; detailed measurements remain available in optional advanced view')
 await page.setViewportSize({width:390,height:844});await enterTest();for(const v of[4,6,3,5,2])await answerCurrent(v);await page.getByRole('button',{name:'Save results and get recommendations'}).click();await openCompletedPlanResult()
 let data=(await api('bootstrap')).data;assert.equal(data.results.length,2);assert.equal(data.results[0].id,first.id);assert.equal(new Set(data.snapshot.dimensions.map(d=>d.key)).size,5);passed('second run keeps original baseline and unique profile axes')
 // Use an isolated context so the real service worker cannot bypass route
 // interception. The main journey keeps its worker and private-cache checks.
 const recoveryContext=await browser.newContext({storageState:await context.storageState(),serviceWorkers:'block',viewport:{width:390,height:844}})
 const recoveryPage=await recoveryContext.newPage()
 recoveryPage.on('pageerror',capturePageError)
 try {
  for (const body of ['{"account":', '{"error":"SERVICE_UNAVAILABLE"}', '{"account":null}']) {
   let intercepted=0
   await recoveryPage.route('**/api/app/bootstrap', route => {
    intercepted++
    return route.fulfill({status:200,contentType:'application/json',body})
   })
   await recoveryPage.goto(origin+'/en/app/history')
   const retry=recoveryPage.getByRole('button',{name:'Try again',exact:true})
   await expect(retry).toBeVisible({timeout:15000})
   assert.ok(intercepted>0,'invalid bootstrap response must actually reach the client')
   await expect(recoveryPage.locator('main [role="alert"]')).toBeVisible()
   await expect(recoveryPage.locator('.hh-account-menu')).toHaveCount(0)
   await recoveryPage.unroute('**/api/app/bootstrap')
   await retry.click()
   await expect(recoveryPage.locator('.hh-mobile-app-nav')).toBeVisible({timeout:15000})
   await expect(recoveryPage.locator('.hh-change')).toContainText('7 → 4')
   assert.deepEqual(errors,[])
  }
 } finally { await recoveryContext.close() }
 passed('invalid HTTP 200 bootstrap bodies show retry and recover without uncaught browser errors')
 await page.goto(origin+'/en/app/history');await ready();await expect(page.locator('.hh-change')).toContainText('7 → 4');await screenshotEvidence(page,{path:output+'/history-en.png',fullPage:true});passed('history compares real results and exact point differences')
 await page.goto(origin+'/en/app/monitoring/hh-current-state');await ready();await expect(page.getByRole('heading',{name:'Current State Check',exact:true})).toBeVisible();await expect(page.getByRole('heading',{name:'Measurement history',exact:true})).toBeVisible();await expect(page.getByRole('heading',{name:'Compare measurements',exact:true})).toBeVisible();await screenshotEvidence(page,{path:output+'/psi-monitoring-trend.png',fullPage:true});passed('Psi-Monitoring trend view compares compatible repeated measurements')
 await enterTest('Personality Baseline');await expect(page.getByText('In general, not only today',{exact:false})).toBeVisible()
 await screenshotEvidence(page,{path:output+'/personality-runner.png',fullPage:true})
 for(let i=0;i<20;i++){await savedClick(page.locator('.hh-scale').getByRole('button',{name:'3 Neither Inaccurate nor Accurate'}));if(i<19)await savedClick(page.getByRole('button',{name:'Next',exact:true}))}
 await page.getByRole('button',{name:'Save results and get recommendations'}).click();await openCompletedPlanResult();data=(await api('bootstrap')).data;const trait=data.results.find(r=>r.definitionKey==='mini-ipip-20');assert.deepEqual(trait.dimensions.map(d=>d.value),[12,12,12,12,12]);assert.equal(data.snapshot.dimensions.length,10);passed('Mini-IPIP scoring is preserved alongside completed plan summaries')
 await enterTest('Weekly Psychic Health','Quick')
 await expect(page.getByText('Over the past 7 days',{exact:false})).toBeVisible()
 await expect(page.locator('.hh-quick-question')).toHaveCount(8)
 await expect(page.getByRole('heading',{name:'Overall, how emotionally okay have you felt during the past 7 days?',exact:true})).toBeVisible()
 await savedClick(page.locator('.hh-quick-question').first().locator('.hh-scale button').first())
 await expect(page.getByText('1 / 8 answered',{exact:true})).toBeVisible()
 await expect(page.locator('.hh-quick-question')).toHaveCount(8)
 await expect(page.locator('.hh-quick-question').first().locator('.hh-scale button').first()).toHaveAttribute('aria-pressed','true')
 await screenshotEvidence(page,{path:output+'/quick-all-questions-mobile.png',fullPage:true})
 passed('Quick mode displays one scrollable form with auto-saved answers and no per-question navigation')
 await page.getByRole('button',{name:'Save and exit'}).click()
 await expect(page).toHaveURL(/\/tests$/)
 await ready()
 // My Tests now renders the selected list immediately without a separate Start testing gate.
 await expect(page.locator('#my-tests-list')).toBeVisible()
 const weeklyResumeRow=page.locator('#my-tests-list article').filter({has:page.getByRole('heading',{name:'Weekly Psychic Health',exact:true})})
 await expect(weeklyResumeRow).toBeVisible()
 await weeklyResumeRow.getByRole('button',{name:'Continue test'}).click()
 await expect(page).toHaveURL(/\/runs\//)
 // A long synthetic test battery can temporarily exhaust its own per-minute
 // account read budget. Retry only this browser step after quota recovery;
 // never increase or bypass production request limits.
 const resumedQuestions=page.locator('.hh-quick-question')
 for(let attempt=0;attempt<4;attempt++){
  try {
   await expect(resumedQuestions).toHaveCount(8,{timeout:7000})
   break
  } catch(error) {
   if(attempt===3)throw error
   console.log('SYNTHETIC_QUICK_RESUME_COOLDOWN',attempt+1)
   await page.waitForTimeout(24000)
   await page.reload({waitUntil:'domcontentloaded'})
  }
 }
 await expect(page.getByText('1 / 8 answered',{exact:true})).toBeVisible()
 await expect(page.locator('.hh-quick-question').first().locator('.hh-scale button').first()).toHaveAttribute('aria-pressed','true')
 await page.locator('.hh-test-mode-toggle').getByRole('button',{name:/Guided/}).click()
 await expect(page.locator('.hh-runner-question')).toBeVisible()
 await expect(page.getByText('Question 2 / 8',{exact:true})).toBeVisible()
 await screenshotEvidence(page,{path:output+'/guided-single-question-mobile.png',fullPage:false})
 await page.getByRole('button',{name:'Save and exit'}).click()
 await expect(page).toHaveURL(/\/tests$/)
 await ready()
 await page.goto(origin+'/en/app/portrait')
 await ready()
 await page.locator('[data-profile-deep-dive] > summary').click()
 await page.locator('[data-profile-extra-tools] > summary').click()
 await expect(page.getByRole('heading',{name:'Finish: Weekly Psychic Health',exact:true})).toBeVisible()
 await expect(page.getByRole('link',{name:'Continue test',exact:true})).toBeVisible()
 passed('Quick draft resumes with its saved answers and can switch to one-question Guided mode')
 await page.goto(origin+'/ru/app/portrait');await ready();await expect(page.getByRole('heading',{name:'Мой профиль',exact:true})).toBeVisible();await screenshotEvidence(page,{path:output+'/portrait-ru.png',fullPage:true});passed('Russian app chrome preserves English instrument provenance')
 await page.goto(origin+'/en/app/consultations');await ready();await page.getByRole('button',{name:'Request a consultation',exact:true}).first().click();await page.getByLabel('How should Andy contact you?').fill('synthetic@example.invalid');await page.getByLabel('Your message (optional)').fill('A synthetic request for CI only.')
 await screenshotEvidence(page,{path:output+'/consultation-request.png',fullPage:true})
 await page.getByRole('button',{name:'Send request',exact:true}).click();await expect(page.getByText('Received',{exact:true})).toBeVisible();data=(await api('bootstrap')).data;assert.equal(data.requests.length,1);assert.equal(data.requests[0].sharedExcerpt,null);passed('real consultation request without implicit profile sharing')
 const admin=await browser.newContext();await admin.addCookies([{name:'prescriptions_admin',value:createHmac('sha256',process.env.PRESCRIPTIONS_ADMIN_TOKEN).update('prescriptions-admin-v1').digest('base64url'),url:origin+'/admin',httpOnly:true,sameSite:'Strict'}]);const adminPage=await admin.newPage();await adminPage.goto(origin+'/admin/app-requests');await expect(adminPage.getByText('synthetic@example.invalid',{exact:true})).toBeVisible();await adminPage.getByRole('button',{name:'Contacted',exact:true}).click();await expect(adminPage.locator('.hh-badge')).toHaveText('Contacted');await screenshotEvidence(adminPage,{path:output+'/practitioner-inbox.png',fullPage:true});passed('existing practitioner authorization and real request status inbox')
  // Separate tab: avoid racing a pending redirect from the preceding inbox mutation on WebKit.
  // Synthetic end-to-end Master → client → resource → recipient link. No real records.
  const handoffPage = await admin.newPage()
  await handoffPage.goto(origin+'/admin/clients')
  await expect(handoffPage.getByRole('heading',{name:'Client database',exact:true})).toBeVisible()
  await handoffPage.locator('.master-client-create > summary').click()
  await handoffPage.locator('.master-client-create input[name="fullName"]').fill('Synthetic Handoff Client')
  await handoffPage.locator('.master-client-create input[name="email"]').fill('synthetic-recipient@example.invalid')
  await handoffPage.locator('.master-client-create-form button[type="submit"]').click()
  // Client creation must open the consultation editor, not the client's Cabinet.
  // After checking the approved workflow, follow the explicit client-history link
  // to finish the separate private-materials handoff acceptance scenario.
  await expect(handoffPage).toHaveURL(/\/admin\/consultations\/new\?clientId=[a-f0-9-]{36}&created=1$/,{timeout:20000})
  const createdClientId = new URL(handoffPage.url()).searchParams.get('clientId')
  assert.match(createdClientId, /^[a-f0-9-]{36}$/)
  await expect(handoffPage.getByRole('heading',{name:'New consultation',exact:true})).toBeVisible()
  await expect(handoffPage.locator('.consultation-client-created-label')).toContainText('CLIENT SAVED')
  await expect(handoffPage.locator('.consultation-client-selected-row')).toContainText('Synthetic Handoff Client')
  await expect(handoffPage.locator('.consultation-client-created-identity strong')).toHaveText('Synthetic Handoff Client')
  await expect(handoffPage.locator('.consultation-form input[name="clientId"]')).toHaveValue(createdClientId)
  await expect(handoffPage.locator('#consultation-items-heading')).toHaveText('Recommendations')
  await handoffPage.setViewportSize({width:390,height:844})
  await screenshotEvidence(handoffPage,{path:output+'/practitioner-new-consultation-handoff-mobile.png',fullPage:false})
  passed('new client opens its preselected practitioner recommendation editor')
  const ownerHistoryLink=handoffPage.locator('.consultation-client-created-history-link')
  await expect(ownerHistoryLink).toHaveAttribute('href', '/admin/clients/' + createdClientId)
  await ownerHistoryLink.click()
  await expect(handoffPage).toHaveURL(/\/admin\/clients\/[a-f0-9-]{36}$/,{timeout:20000})
  await expect(handoffPage.getByRole('heading',{name:'Synthetic Handoff Client',exact:true})).toBeVisible()
  const ownerClientId=new URL(handoffPage.url()).pathname.split('/').at(-1)
  assert.equal(ownerClientId, createdClientId)
  await expect(handoffPage.locator('.client-detail-action-primary')).toHaveAttribute('href','/admin/consultations/new?clientId='+ownerClientId)
  await expect(handoffPage.locator('.client-detail-private-access')).not.toHaveAttribute('open','')
  assert.equal(await handoffPage.evaluate(() => document.documentElement.scrollWidth > window.innerWidth),false,'owner client workspace mobile horizontal overflow')
  await screenshotEvidence(handoffPage,{path:output+'/practitioner-client-workspace-mobile.png',fullPage:true})
  await handoffPage.setViewportSize({width:1280,height:720})
   // Owner's Create report path selects a real private client record; it never
   // creates or publishes a report before explicit Save/Share in the editor.
   const reportPickerPage=await admin.newPage();
   await reportPickerPage.goto(origin+'/admin/reports/new');
   await expect(reportPickerPage.getByRole('heading',{name:'Create client report',exact:true})).toBeVisible();
   const syntheticReportChoice=reportPickerPage.getByRole('link',{name:/Synthetic Handoff Client/});
   await expect(syntheticReportChoice).toBeVisible();
   await expect(syntheticReportChoice).toHaveAttribute('href','/admin/consultations/new?clientId='+ownerClientId);
   await syntheticReportChoice.click();
   await expect(reportPickerPage).toHaveURL(origin+'/admin/consultations/new?clientId='+ownerClientId);
   await expect(reportPickerPage.locator('.consultation-form input[name="clientId"]')).toHaveValue(ownerClientId);
   await expect(reportPickerPage.locator('.consultation-client-selected-row')).toContainText('Synthetic Handoff Client');
   await expect(reportPickerPage.locator('textarea[name="analysis"]')).toBeVisible();
   await expect(reportPickerPage.locator('textarea[name="additionalNotes"]')).toBeVisible();
   await expect(reportPickerPage.locator('select[name="kind"]')).toHaveCount(0);
   await reportPickerPage.close();
   passed('owner-only Create report opens new consultation with selected client and no automatic sharing');
  await handoffPage.locator('.client-detail-materials > details > summary').click()
  await handoffPage.locator('.client-detail-material-form input[name="title"]').fill('Reiki study guide')
  await handoffPage.locator('.client-detail-material-form input[name="url"]').fill('https://holistichouse.vercel.app/en/academy/reiki')
  await handoffPage.locator('.client-detail-material-form button[type="submit"]').click()
  await expect(handoffPage.getByRole('link',{name:/Reiki study guide/})).toBeVisible()
  await expect(handoffPage.getByRole('button',{name:'Copy material link'})).toBeVisible()
  // Stub only the OS clipboard; the real client-link and authorization API remain live.
  await handoffPage.evaluate(() => Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: async value => { window.__syntheticCopiedLink = value } },
  }))
  await handoffPage.getByRole('button',{name:'Copy material link'}).click()
  await expect(handoffPage.locator('.master-material-copy [role="status"]')).toContainText('Link copied')
  assert.equal(await handoffPage.evaluate(() => window.__syntheticCopiedLink), 'https://holistichouse.vercel.app/en/academy/reiki')
  const clientLink=await handoffPage.evaluate(async () => {
    const id=location.pathname.split('/').at(-1)
    const response=await fetch('/admin/api/clients/'+id+'/access',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:'{}'})
    if (!response.ok) throw new Error('Synthetic cabinet link unavailable: '+response.status)
    const {selector,secret}=await response.json()
    return location.origin+'/en/client/'+selector+'#'+secret
  })
  await handoffPage.locator('.client-detail-private-access > summary').click()
  await expect(handoffPage.locator('.client-detail-private-access')).toHaveAttribute('open', '')
  await expect(handoffPage.locator('.consultation-cabinet-primary')).toBeVisible()
  await handoffPage.locator('.consultation-cabinet-primary').click()
  await expect(handoffPage.locator('.consultation-cabinet-status')).toContainText('Link copied')
  assert.equal(await handoffPage.evaluate(() => window.__syntheticCopiedLink), clientLink)
  const clientContext=await browser.newContext({viewport:{width:390,height:844}})
  const clientPage=await clientContext.newPage()
  await clientPage.goto(clientLink)
  await expect(clientPage.getByRole('heading',{name:'Study materials from Andy'})).toBeVisible({timeout:20000})
  await expect(clientPage.getByRole('link',{name:/Reiki study guide/})).toHaveAttribute('href','https://holistichouse.vercel.app/en/academy/reiki')
  await clientPage.getByRole('link',{name:'My profile (Reports)'}).click()
  await expect(clientPage.getByRole('heading',{name:'My profile',exact:true})).toBeVisible()
  await verifyProfileServiceOffers(clientPage)
  await screenshotEvidence(clientPage,{path:output+'/private-client-profile-cta.png',fullPage:false})
  passed('all four legacy private-client profile CTAs open a precise, privacy-safe order request')

  await expect(clientPage.getByRole('link',{name:'Personal analysis'})).toHaveCount(0)
  await expect(clientPage.locator('[data-profile-report-archive]')).toBeVisible()
  const formerAnalysisUrl=new URL(clientLink)
  formerAnalysisUrl.searchParams.set('view','analysis')
  await clientPage.goto(formerAnalysisUrl.toString())
  await expect(clientPage.getByRole('heading',{name:'My profile',exact:true})).toBeVisible()
  await expect(clientPage.locator('[data-personal-reports]')).toBeVisible()
  await expect(clientPage.getByText('No saved reports yet')).toBeVisible()
  await expect(clientPage.locator('[data-analysis-offer]')).toHaveCount(0)
  await screenshotEvidence(clientPage,{path:output+'/private-client-integrated-profile.png',fullPage:true})
  await clientPage.getByRole('link',{name:'My materials'}).click()
  await expect(clientPage.getByRole('heading',{name:'Study materials from Andy'})).toBeVisible()
  await screenshotEvidence(clientPage,{path:output+'/master-client-material-handoff.png',fullPage:true})
  await clientContext.close()
  passed('Master creates synthetic client, attaches study link and recipient opens private cabinet')
 await page.goto(origin+'/en/app/consultations');await ready();await page.getByRole('button',{name:'Cancel request'}).click();await expect(page.locator('.hh-badge')).toHaveText('Cancelled');passed('user cancels contacted request')
 const other=await browser.newContext()
 await other.addCookies([{name:'hh_test_actor',value:'b',url:origin}])
 const otherPage=await other.newPage()
 await otherPage.goto(origin+'/en/app')
 await otherPage.getByRole('button',{name:'Continue with Google'}).click()
 await expect(otherPage.getByRole('heading',{name:'Create my private space'})).toBeVisible()
 // These old readiness signals are already true before consent is submitted.
 // Prove the 403 gate here; never retry it until it happens to become a 404.
 await expect(otherPage.locator('.hh-nav')).toBeVisible()
 await expect(otherPage).toHaveURL(/\/en\/app$/,{timeout:15000})
 const beforeConsent=await api('results/'+first.id,null,other)
 assert.equal(beforeConsent.status,403)
 assert.equal(beforeConsent.data.error,'CONSENT_REQUIRED')
 passed('browser B is denied before consent despite visible nav and app URL')
 await otherPage.getByLabel('I am 18 or older.').check()
 await otherPage.getByLabel('I agree to private processing',{exact:false}).check()
 assert.equal(await otherPage.getByLabel('I agree to optional marketing',{exact:false}).count(),0)
 const [onboardingResponse]=await Promise.all([
  otherPage.waitForResponse(response=>new URL(response.url()).pathname==='/api/app/onboarding'&&response.request().method()==='POST'),
  otherPage.getByRole('button',{name:'Create my private space'}).click(),
 ])
 assert.equal(onboardingResponse.status(),200)
 assert.equal((await onboardingResponse.json()).onboardingState,'active')
 await expect(otherPage.locator('[data-my-tests-dashboard]')).toBeVisible({timeout:15000})
 const otherBootstrap=await api('bootstrap',null,other)
 assert.equal(otherBootstrap.status,200)
 assert.equal(otherBootstrap.data.account.onboardingState,'active')
 assert.equal((await api('results/'+first.id,null,other)).status,404)
 assert.equal(otherBootstrap.data.results.length,0)
 passed('browser A/B cross-user result denial after committed consent')
 // The public Start free monitoring button must transfer the exact selection into an existing Google account.
 // Open a fresh tab in the same authenticated cookie context: the onboarding page
 // can still have a queued router.replace('/en/app') after its nav becomes visible.
 // Reusing it races Playwright's navigation against that pending redirect in WebKit.
 const selectionPage = await other.newPage()
 const selectionWrites=[]
 selectionPage.on('response',response=>{ if(new URL(response.url()).pathname==='/api/app/test-plans'&&response.request().method()==='POST') selectionWrites.push(response.status()) })
 await selectionPage.goto(origin+'/en/client/tests')
 await expect(selectionPage.getByRole('heading',{name:'Start with a simple check-in'})).toBeVisible()
  await expect(selectionPage.getByRole('button',{name:'Start free monitoring',exact:true}).first()).toBeEnabled()
 await chooseVisibleTest(selectionPage,'Personality Baseline')
 const selectionGuided=selectionPage.locator('#hh-test-customizer')
 if(!(await selectionGuided.isVisible()))await selectionPage.getByRole('button',{name:/Choose my own tests and filters/}).click()
 await selectionGuided.getByRole('button',{name:/Topics that matter/}).click()
 await selectionGuided.getByRole('button',{name:'Anxiety & worry',exact:true}).click()
 await expect(selectionGuided.getByRole('button',{name:'Anxiety & worry',exact:true})).toHaveAttribute('aria-pressed','true')
 await selectionPage.getByRole('button',{name:'Start free monitoring',exact:true}).first().click()
 await expect(selectionPage).toHaveURL(/\/en\/app\/tests\?plan=/,{timeout:15000})
 await expect(selectionPage.locator('#my-tests-list')).toBeVisible()
 await expect(selectionPage.getByRole('heading',{name:'Personality Baseline',exact:true})).toBeVisible()
 const selectedPlan=(await api('bootstrap',null,other)).data.activeTestPlan
 assert.equal(selectedPlan.definitionIds.length,1)
 assert.deepEqual(selectedPlan.selectionPreferences.focus,['anxiety'])
 await selectionPage.getByText('My interests & additional recommendations',{exact:true}).click()
 await expect(selectionPage.getByRole('region',{name:'My saved test priorities'})).toContainText('Anxiety & worry')
 assert.equal(new URL(selectionPage.url()).searchParams.get('plan'),selectedPlan.id)
 assert.deepEqual(selectionWrites,[201],'single selected battery creates exactly one plan, even with React StrictMode')
 await selectionPage.close()
 passed('public Start free monitoring preserves the selected test in authenticated personal Cabinet')
 // Re-selecting the same assessment should reuse the existing battery, not
 // leave the OAuth handoff query pending or create a second plan.
 const repeatSelectionPage=await other.newPage()
 await repeatSelectionPage.goto(origin+'/en/client/tests')
 await expect(repeatSelectionPage.getByRole('heading',{name:'Start with a simple check-in'})).toBeVisible()
 await chooseVisibleTest(repeatSelectionPage,'Personality Baseline')
 await repeatSelectionPage.getByRole('button',{name:'Start free monitoring',exact:true}).first().click()
 await expect(repeatSelectionPage).toHaveURL(/\/en\/app\/tests\?plan=/,{timeout:15000})
 assert.equal(new URL(repeatSelectionPage.url()).searchParams.get('plan'),selectedPlan.id)
 assert.equal((await api('bootstrap',null,other)).data.activeTestPlan.id,selectedPlan.id)
 await repeatSelectionPage.close()
 passed('choosing a matching existing set reuses the same saved plan and clears pending handoff')
 const blocked=await context.request.post(origin+'/api/app/requests',{headers:{Origin:'https://other.invalid'},data:{}});assert.equal(blocked.status(),403);passed('cross-origin mutations rejected')
 const storage=await page.evaluate(async()=>({local:Object.keys(localStorage),session:Object.keys(sessionStorage),caches:await Promise.all((await caches.keys()).map(async k=>(await(await caches.open(k)).keys()).map(r=>new URL(r.url).pathname)))}));assert.ok(!JSON.stringify(storage).match(/hh-app-auth|profile:first|\/api\/app|\/en\/app|\/ru\/app/));passed('no private browser storage or service-worker response cache')
 const exported=await api('export');assert.equal(exported.status,200);assert.ok(exported.data.runs.every(r=>r.accountId===first.accountId));assert.equal(exported.data.results.length,3);passed('own complete data export')
 // Remember the active owner selection before the separate Google sign-in flow.
 // It must still be present after the public selector adds another test.
 const savedBeforeSignout=(await api('bootstrap')).data.activeTestPlan
 assert.ok(savedBeforeSignout?.definitionIds?.length>0,'synthetic owner has a saved battery')
 await page.goto(origin+'/en/app/settings');await ready();await page.getByRole('button',{name:'Sign out on all devices'}).click();await expect(page.getByRole('button',{name:'Continue with Google'})).toBeVisible();await expect(page).toHaveURL(origin+'/en/app');await page.waitForLoadState('networkidle');assert.equal((await api('bootstrap')).status,401);passed('logout invalidates real test session and clears UI')
 // A fresh tab in the same cookie jar avoids racing Next's logout refresh.
 await page.close();page=await context.newPage();page.on('pageerror',capturePageError)

 await page.goto(origin+'/en/client')
 await expect(page.getByRole('heading',{name:'Choose your tests',exact:true})).toBeVisible()
 await expect(page.getByRole('heading',{name:'Recommended for you',exact:true})).toBeVisible()
 await page.getByRole('button',{name:'Browse full database'}).click()
 await expect(page.getByRole('heading',{name:'Start with a simple check-in'})).toBeVisible()
 // Mobile UX guard: the existing photographic head is no longer hidden behind
 // an advanced-filter or visualization disclosure on first visit.
 const headCard=page.locator('aside[class*="heroPortrait"]').first()
 await headCard.scrollIntoViewIfNeeded(); await expect(headCard).toBeVisible()
 const photo=headCard.locator('img[src*="holistic-house-test-brain-concept"]').first()
 await expect(photo).toBeVisible()
 await expect.poll(async()=>photo.evaluate(img=>img.naturalWidth),{timeout:25000}).toBeGreaterThan(0)
 const headBox=await headCard.boundingBox()
 assert.ok(headBox&&headBox.width>100, 'full catalog still has its portrait')
 // First-visit catalog and search must be visible without opening additional filters.
 const catalog=page.locator('#hh-test-list')
 await expect(catalog).toBeVisible()
 await expect(page.locator('article[class*="row"]').first()).toBeVisible()
 await expect(page.locator('#hh-test-customizer')).toBeHidden()
 await expect(page.getByRole('searchbox',{name:'Search the database'})).toBeVisible()
 const secondaryBanner=page.locator('[data-client-assessment-invite]').first()
 await expect(secondaryBanner).toBeVisible()
 const [catalogBox,bannerBox]=await Promise.all([catalog.boundingBox(),secondaryBanner.boundingBox()])
 assert.ok(catalogBox&&bannerBox&&catalogBox.y<bannerBox.y,
   'secondary consultation should follow test discovery, not displace it')
 await secondaryBanner.getByRole('button',{name:'Wellbeing & energy'}).click()
 await expect(secondaryBanner.getByRole('link',{name:/Start free drawing assessment/})).toHaveAttribute('href',/topic=wellbeing/)
 passed('Client invitation selects an enquiry topic without private answers')
 passed('first visit: full test catalog and search visible; advanced criteria collapsed')
 const customize=page.getByRole('button',{name:/Choose my own tests and filters/})
 await customize.click()
 const guided=page.locator('#hh-test-customizer')
 await expect(guided).toBeVisible()
 await expect(guided.getByText('Step 1 of 2')).toBeVisible()
 await guided.getByRole('button',{name:/Time & depth/}).click()
 await expect(guided.getByText('Step 2 of 2')).toBeVisible()
 await expect(guided.getByRole('button',{name:'All filter topics'})).toBeVisible()
 const advancedCount=guided.locator('[class*="guidedMatches"] strong')
 await guided.getByRole('button',{name:'Up to 5 min'}).click()
 await expect(guided.getByRole('button',{name:'Up to 5 min'})).toHaveAttribute('aria-pressed','true')
 await expect(page.getByRole('button',{name:'Under 5 min'})).toHaveAttribute('aria-pressed','true')
 const countBefore=await advancedCount.innerText()
 await guided.getByRole('button',{name:'All filter topics'}).click()
 await expect(guided.getByRole('button',{name:/Topics that matter/})).toBeVisible()
 await guided.getByRole('button',{name:/Topics that matter/}).click()
 await expect(guided.getByRole('button',{name:'Stress & overload'})).toBeVisible()
 await guided.getByRole('button',{name:'Stress & overload'}).click()
 await expect.poll(async()=>advancedCount.innerText()).not.toBe(countBefore)
 await guided.getByRole('button',{name:/Show matching tests/}).click()
 await expect(guided).toBeHidden()
 await expect(catalog).toBeVisible()
 const quickReset=page.getByRole('button',{name:/Clear all ×/})
 if(await quickReset.count())await quickReset.click()
 passed('mobile guided filter: choose category → options → keep live counts → show matching catalog')
 const quickAnxiety=page.getByRole('button',{name:'Quick filter: Anxiety & worry'})
 await expect(quickAnxiety).toHaveAttribute('aria-pressed','false')
 const resultCount=page.locator('[class*="quickFiltersHeader"] [role="status"] b')
 const before=await resultCount.innerText()
 await quickAnxiety.click()
 await expect(quickAnxiety).toHaveAttribute('aria-pressed','true')
 await expect.poll(async()=>resultCount.innerText()).not.toBe(before)
 assert.ok((await headCard.locator('svg[class*="focusRays"] line').count())>0, 'selected topic has illustrated focus rays')
 await screenshotEvidence(page,{path:output+'/client-mobile-filters-portrait.png',fullPage:false})
 await quickAnxiety.click()
 await expect(quickAnxiety).toHaveAttribute('aria-pressed','false')
 passed('390px mobile: head asset loads, instant chips reduce test count and highlight real coverage axes')
 await expect(page.getByRole('heading',{name:'Enter your personal cabinet'})).toBeVisible()
 await expect(page.getByRole('button',{name:'Enter personal cabinet with Google'})).toBeVisible()
 await expect(page.getByRole('heading',{name:'Start with a simple check-in'})).toBeVisible()
 assert.equal(await page.locator('.cabinet-legacy-entry').getAttribute('open'),null)
 passed('Cabinet entry has a prominent Google sign-in and one integrated battery builder')

 await chooseVisibleTest(page,'Monthly Life Profile')
 await page.getByRole('button',{name:'Start free monitoring',exact:true}).first().click()
 // The public selector must ADD selected tests to the existing Google account,
 // never discard earlier tests or display a replacement confirmation.
 await expect(page).toHaveURL(/\/en\/app\/tests\?plan=/,{timeout:30000})
 const reopenedPlan=(await api('bootstrap')).data.activeTestPlan
 assert.equal(reopenedPlan.id,savedBeforeSignout.id,'same original plan remains active')
 assert.equal(new URL(page.url()).searchParams.get('plan'),reopenedPlan.id,'saved plan URL identifies the original account plan')
 assert.ok(savedBeforeSignout.definitionIds.every(id=>reopenedPlan.definitionIds.includes(id)),
   'every earlier saved test remains in the account')
 assert.ok(reopenedPlan.definitionIds.length>savedBeforeSignout.definitionIds.length,
   'the newly selected public test is added to My Tests')
 assert.deepEqual(reopenedPlan.completedRunIds,savedBeforeSignout.completedRunIds,
   'adding tests must not discard completed progress')
 await expect(page.locator('[data-pending-selection]')).toHaveCount(0)
 await expect(page.locator('#my-tests-list')).toBeVisible()
 await expect(page.getByRole('heading',{name:'Monthly Life Profile',exact:true})).toBeVisible()
 passed('public test selection adds new tests without replacing the previous account battery')
 // The account shows the entire saved selection immediately, with a direct
 // remove control per row. Removing does not remove previous saved results.
 const beforeRemove=(await api('bootstrap')).data
 const activeBeforeRemove=beforeRemove.activeTestPlan
 assert.ok(activeBeforeRemove?.definitionIds.length>0)
 const removeButton=page.locator('[data-remove-selected-test]').first()
 await expect(removeButton).toBeVisible()
 await expect(page.locator('#my-tests-list')).toBeVisible()
 await removeButton.click()
 await expect.poll(async()=>((await api('bootstrap')).data.activeTestPlan?.definitionIds.length || 0),{timeout:15000})
  .toBe(activeBeforeRemove.definitionIds.length-1)
 const afterRemove=(await api('bootstrap')).data
 assert.equal(afterRemove.results.length,beforeRemove.results.length,'removing a test must not delete results')
 assert.equal(afterRemove.runs.length,beforeRemove.runs.length,'removing a test must not delete drafts')
 await expect(page.getByText('Removed from selection.',{exact:false})).toBeVisible({timeout:15000})
 passed('first-screen test removal updates current plan while preserving private results and drafts')
 assert.deepEqual(errors,[]);passed('no uncaught browser errors')
 await writeFile(output+'/verification.json',JSON.stringify({commit:process.env.GITHUB_SHA,checks,realPostgreSQL:true,auth:'ISOLATED_PROVIDER_PROTOCOL_DOUBLE_NOT_GOOGLE',production:'UNCHANGED'},null,2))
 await other.close();await admin.close()
} catch(error){await screenshotEvidence(page,{path:output+'/failure-synthetic-only.png',fullPage:true}).catch(()=>{});await writeFile(output+'/verification.json',JSON.stringify({commit:process.env.GITHUB_SHA,checks,failure:error.message,auth:'ISOLATED_PROVIDER_PROTOCOL_DOUBLE_NOT_GOOGLE'},null,2));throw error}
finally{await browser.close()}


