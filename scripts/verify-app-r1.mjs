import { installRatingsRequestDiagnostics } from './helpers/ratings-request-diagnostics.mjs'
import { observeHistoryNavigation, collectHistoryNavigationEvidence } from './helpers/history-navigation-diagnostics.mjs'
import { boundedBestEffort, preserveBrowserFailure } from './helpers/browser-failure-evidence.mjs'
import { assertAlchemyPaymentsExpanded } from './helpers/alchemy-payment-disclosure-verifier.mjs'
import { assertAccountPickerDisclosure, openAccountTestPicker, exerciseAccountPickerDraftRetention, assertCompactAccountPicker } from './helpers/account-picker-disclosure-verifier.mjs'
import { assertPublicDiscoveryChrome, exercisePublicCollections, exercisePortraitRays } from './helpers/public-discovery-verifier.mjs'
import { assertCabinetPortrait, openCabinetMyTests, assertCabinetPrimaryNavigation, openCabinetHome, warmCabinetExitDocument } from './helpers/cabinet-navigation-verifier.mjs'
import { openContactChannelChooser, assertPreparedContactChannels } from './helpers/contact-channel-verifier.mjs'
import {chromium,webkit,expect} from '@playwright/test'
import assert from 'node:assert/strict'
import {mkdir,writeFile,readFile} from 'node:fs/promises'
import {createHmac} from 'node:crypto'
import {billingStatusRequestDiagnostic,installBillingStatusLifecycleDiagnostics} from './billing-status-browser-diagnostics.mjs'
import {installTestPlanNavigationDiagnostics} from './test-plan-navigation-diagnostics.mjs'
import {buildExplorerEntries} from '../lib/assessments/test-explorer.js'
import {testKindCardLabel,testKindShortLabel} from '../lib/assessments/test-kinds.js'
import {MONITORING_CATALOG} from '../data/assessments/catalog.js'
import {adminClient,assertIsolated,A} from '../tests/helpers/app-db-setup.mjs'
assertIsolated()
const origin=process.env.HH_TEST_APP_ORIGIN||'http://127.0.0.1:3100'
if(!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin))throw new Error('Only isolated loopback browser verification is permitted')
const output='artifacts/app-r1'
await mkdir(output,{recursive:true})
const engine=process.env.HH_TEST_BROWSER==='webkit'?webkit:chromium
const browser=await engine.launch(process.env.HH_TEST_BROWSER_EXECUTABLE?{executablePath:process.env.HH_TEST_BROWSER_EXECUTABLE}:{}),context=await browser.newContext({viewport:{width:390,height:844}}),errors=[]
// Synthetic-only diagnostics preserve the readiness assertion. Never log
// request headers, bodies, query strings, cookies, or auth handoff URLs.
const pendingRequests=new Map()
context.on('request',request=>{const url=new URL(request.url());if(url.origin===origin)pendingRequests.set(request,{path:url.pathname,type:request.resourceType()})})
context.on('response',response=>{const value=pendingRequests.get(response.request());if(value)value.status=response.status();const url=new URL(response.url());if(url.origin===origin&&url.pathname==='/api/app/billing/status')console.log('SYNTHETIC_BILLING_STATUS_DIAGNOSTIC',JSON.stringify({kind:'response-headers',at:Date.now(),path:url.pathname,status:response.status()}))})
context.on('requestfinished',request=>pendingRequests.delete(request))
context.on('requestfailed',request=>{
 const diagnostic=billingStatusRequestDiagnostic(origin,request)
 if(diagnostic)console.log('SYNTHETIC_BILLING_STATUS_DIAGNOSTIC',JSON.stringify(diagnostic))
 pendingRequests.delete(request)
})
await context.exposeBinding('__hhBillingStatusDiagnostic',(_source,event)=>{
 const kinds=['request-start','signal-abort','pagehide','beforeunload','visibilitychange']
 if(event&&kinds.includes(event.kind)&&event.path==='/api/app/billing/status'&&typeof event.at==='number'&&typeof event.pagePath==='string'&&/^\/[a-zA-Z0-9/_-]*$/.test(event.pagePath)&&['visible','hidden'].includes(event.visibility))
  console.log('SYNTHETIC_BILLING_STATUS_DIAGNOSTIC',JSON.stringify(event))
})
await context.addInitScript(installBillingStatusLifecycleDiagnostics)
await context.addInitScript(() => {
  window.addEventListener('popstate', () => console.log('HH_HOME_PROBE '+JSON.stringify({kind:'early-popstate',path:location.pathname,pendingPath:window.__hhCspHardDestination ? new URL(window.__hhCspHardDestination).pathname : null})), {capture:true,passive:true})
})
await installRatingsRequestDiagnostics(context,origin,event=>console.log('SYNTHETIC_RATINGS_DIAGNOSTIC',JSON.stringify(event)))
let page=await context.newPage()
const capturePageError=sourcePage=>error=>{if(error.message.includes('/api/app/bootstrap due to access control checks.')||error.message.includes('/api/app/course due to access control checks.')||/\/api\/app\/results\/[^ ]+ due to access control checks\.$/.test(error.message)||error.message.includes('/__nextjs_original-stack-frames due to access control checks.'))return;errors.push(error.message);let sourcePath='[unavailable]';try{sourcePath=new URL(sourcePage.url()).pathname}catch{};console.log('SYNTHETIC_PAGE_ERROR',sourcePath,error.message);if(error.message.includes('/api/app/billing/status due to access control checks.'))console.log('SYNTHETIC_BILLING_STATUS_PAGEERROR_AT',Date.now())}
page.on('pageerror',capturePageError(page))
const testPlanDiagnostics=await installTestPlanNavigationDiagnostics(page,origin,event=>console.log('SYNTHETIC_TEST_PLAN_NAVIGATION',JSON.stringify(event)))
const checks=[]
let historyDiagnosticStage=null, historyDiagnosticStartedAt=null, primaryFailure=false, historyNavigationDiagnostics=null
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
   console.log('SYNTHETIC_READINESS_PENDING_REQUESTS',JSON.stringify([...pendingRequests.values()]))
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
// The compact account suggestions may already include Monthly Life Profile.
// Exercise a genuinely new public selection, never infer novelty from a title.
function unsavedPublicTest(savedPlan){
 const saved=new Set(savedPlan.definitionIds)
 const eligibleKeys=['ipip-locus-of-control-internality-10','ipip-locus-of-control-powerful-others-10','ipip-locus-of-control-chance-10']
 const entry=buildExplorerEntries({locale:'en',audience:'public'}).find(row=>eligibleKeys.includes(row.key)&&row.selectable&&row.definition&&!saved.has(row.definition.id))
 assert.ok(entry,'the synthetic account must have a startable public test not already saved')
 assert.equal(saved.has(entry.definition.id),false,'public handoff begins with an absent exact definition')
 return entry
}
async function chooseVisibleTest(testPage,name){
 const customizer=testPage.locator('button[aria-controls="hh-test-customizer"]')
 if(!(await customizer.count()) && await testPage.locator('#my-tests-picker-toggle').count())
  await openAccountTestPicker(testPage,expect)
 // Account selection starts in the compact picker; use its real catalog transition.
 // Public callers already enter the full catalog and retain their exact-one checks.
 const browseFull=testPage.getByRole('button',{name:'Browse full database',exact:true})
 if(await browseFull.isVisible().catch(()=>false)){
  await browseFull.click()
  await expect(testPage.getByRole('button',{name:'Back to easy selection',exact:false})).toBeVisible()
 }
 await expect(customizer).toHaveCount(1)
 await expect(customizer).toBeVisible({timeout:15000})
 if((await customizer.getAttribute('aria-expanded'))!=='true')await customizer.click()
 await expect(customizer).toHaveAttribute('aria-expanded','true')
 // filter(has) evaluates from each article; do not embed an outer Locator root.
 const pageRoot=typeof testPage.page==='function'?testPage.page():testPage
 const card=()=>testPage.locator('article').filter({has:pageRoot.getByRole('heading',{name,exact:true})})
  .filter({has:pageRoot.getByRole('checkbox',{name,exact:true})})
 if(!(await card().isVisible().catch(()=>false))){
  const more=testPage.getByRole('button',{name:/^Show all matching tests \(\d+\)$/})
  if(await more.count()){await expect(more).toHaveCount(1);await more.click()}
 }
 if(!(await card().isVisible().catch(()=>false))){
  const all=testPage.getByRole('button',{name:'Full database',exact:true})
  if(await all.count())await all.click()
  const more=testPage.getByRole('button',{name:/^Show all matching tests \(\d+\)$/})
  if(await more.count()){await expect(more).toHaveCount(1);await more.click()}
 }
 await expect(card()).toHaveCount(1)
 await expect(card().getByRole('heading',{name,exact:true})).toHaveCount(1)
 await expect(card()).toBeVisible({timeout:15000})
 const choice=card().getByRole('checkbox',{name,exact:true})
 await expect(choice).toHaveCount(1)
 await choice.check()
 await expect(choice).toBeChecked()
}
// Exact approved public hero and its real topic-selection anchor, in each tested locale.
async function assertPublicPickerEntrance(target,locale){
 const copy=locale==='ru'
  ? {region:'Подберите свои тесты',hero:'Лучше поймите себя. Найдите следующий шаг.',action:'Тесты',first:'Что вы хотите исследовать?'}
  : locale==='es'
    ? {region:'Elige tus pruebas',hero:'Conócete mejor. Descubre tu próximo paso.',action:'Pruebas',first:'¿Qué te gustaría explorar?'}
  : {region:'Choose your tests',hero:'Understand yourself. Find your next step.',action:'Tests',first:'What would you like to explore?'}
 const picker=target.locator('[data-prelogin-test-picker]')
 await expect(picker).toHaveAttribute('aria-label',copy.region)
 await expect(picker.locator('[data-client-tests-hero]').getByRole('heading',{name:copy.hero,level:1,exact:true})).toBeVisible()
 const entrance=picker.locator('[data-client-tests-hero]').getByRole('navigation').getByRole('link',{name:copy.action,exact:true})
 await expect(entrance).toBeVisible()
 await expect(entrance).toHaveAttribute('href',`/${locale}/client/tests`)
 await expect(entrance).toHaveAttribute('aria-current','page')
 await expect(picker.getByRole('heading',{name:copy.first,level:2,exact:true})).toHaveAttribute('id','hh-simple-topic-title')
}
// Public routes start in the easy picker. Exercise the real catalog transition,
// then explicitly clear its carried suggestions for the exact-one-test checks.
async function chooseSinglePublicTest(target,name){
 await assertPublicPickerEntrance(target,'en')
 await target.getByRole('button',{name:'Browse full database',exact:true}).click()
 await expect(target.getByRole('heading',{name:'Start with a simple check-in',level:1,exact:true})).toBeVisible()
 await expect(target.getByRole('button',{name:'Start free monitoring',exact:true}).first()).toBeEnabled()
 const checked=target.locator('article input[type="checkbox"]:checked')
 const suggestedNames=await checked.evaluateAll(inputs=>inputs.map(input=>input.getAttribute('aria-label')))
 for(const [index,selectedName] of suggestedNames.entries()){
  const selected=target.getByRole('checkbox',{name:selectedName,exact:true,checked:true})
  await expect(selected).toHaveCount(1)
  await selected.click()
  await expect(selected).toHaveCount(0)
  await expect.poll(async()=> (await checked.evaluateAll(inputs=>inputs.map(input=>input.getAttribute('aria-label')))).sort())
   .toEqual(suggestedNames.slice(index+1).sort())
 }
 await expect(checked).toHaveCount(0)
 await chooseVisibleTest(target,name)
 await expect(checked).toHaveCount(1)
 await expect(checked).toHaveAttribute('aria-label',name)
}
async function chooseSinglePublicTestAfterCatalog(target,name){
 const checked=target.locator('article input[type="checkbox"]:checked')
 const names=await checked.evaluateAll(inputs=>inputs.map(input=>input.getAttribute('aria-label')))
 for(const [index,selectedName] of names.entries()){
  const selected=target.getByRole('checkbox',{name:selectedName,exact:true,checked:true})
  await expect(selected).toHaveCount(1)
  await selected.click()
  // Deselection may remove this card from the shortened public ranked list.
  await expect(selected).toHaveCount(0)
  await expect.poll(async()=> (await checked.evaluateAll(inputs=>inputs.map(input=>input.getAttribute('aria-label')))).sort())
   .toEqual(names.slice(index+1).sort())
 }
 await expect(checked).toHaveCount(0)
 await chooseVisibleTest(target,name)
 await expect(checked).toHaveCount(1)
 await expect(checked).toHaveAttribute('aria-label',name)
}
// Account writes must originate in the actual authenticated My Tests picker.
async function chooseSingleAccountTest(target,name,{beforeSelection=null}={}){
 await target.goto(origin+'/en/app/tests')
 await expect(target).toHaveURL(origin+'/en/app/tests')
 await expect(target.locator('[data-my-tests-dashboard]')).toBeVisible()
 const explorer=await openAccountTestPicker(target,expect)
 const browse=explorer.getByRole('button',{name:'Browse full database',exact:true})
 await expect(browse).toHaveCount(1)
 await browse.click()
 await expect(explorer.getByRole('button',{name:'Back to easy selection',exact:false})).toBeVisible()
 const checked=explorer.locator('article input[type="checkbox"]:checked')
 const names=await checked.evaluateAll(inputs=>inputs.map(input=>input.getAttribute('aria-label')))
 for(const [index,selectedName] of names.entries()){
  const selected=explorer.getByRole('checkbox',{name:selectedName,exact:true,checked:true})
  await expect(selected).toHaveCount(1)
  await selected.click()
  // Deselection can move this card outside the shortened ranked list.
  await expect(selected).toHaveCount(0)
  await expect.poll(async()=> (await checked.evaluateAll(inputs=>inputs.map(input=>input.getAttribute('aria-label')))).sort())
   .toEqual(names.slice(index+1).sort())
 }
 await expect(checked).toHaveCount(0)
 if(beforeSelection)await beforeSelection(explorer)
 await chooseVisibleTest(explorer,name)
 await expect(checked).toHaveCount(1)
 await expect(checked).toHaveAttribute('aria-label',name)
 return explorer
}
// A public launch, including one with Google cookies, must stay guest-only.
// Observe requests as well as durable state so even a rejected account write fails.
async function launchPublicGuestWithoutAccountWrite(target,ctx,expectedDefinition){
 const before=await api('bootstrap',null,ctx)
 const accountWrites=[]
 const observe=request=>{
  const path=new URL(request.url()).pathname
  if(path.startsWith('/api/app/')&&!path.startsWith('/api/app/guest/')&&request.method()!=='GET')accountWrites.push(path)
 }
 target.on('request',observe)
 try{
  await target.getByRole('button',{name:'Start free monitoring',exact:true}).first().click()
  const guest=target.locator('#cabinet-tests')
  await expect(guest).toBeVisible()
  // Public Start now opens Quick directly, with no consent or mode-selection page.
  // Require the actual selected questionnaire, not merely its surrounding section.
  await expect(guest.locator('.hh-test-mode-picker')).toHaveCount(0)
  await expect(guest.getByRole('heading',{name:'Before you start',exact:true})).toHaveCount(0)
  const quick=guest.locator('.cabinet-quick-form')
  await expect(quick).toBeVisible()
  await expect(target.locator('[data-sitewide-personal-review-banner]')).toBeHidden()
  await expect(target.locator('.ia222-bottom-navigation')).toBeHidden()
  await expect(quick.locator('.cabinet-quick-question')).toHaveCount(expectedDefinition.questions.length)
  await expect(quick.getByRole('heading',{level:3})).toHaveText(expectedDefinition.questions.map(question=>question.text))
  await expect(quick.locator('.cabinet-quick-question').first()).toBeVisible()
  const guestState=await api('guest/bootstrap',null,ctx)
  assert.equal(guestState.status,200)
  const guestRun=guestState.data.runs.find(run=>run.definitionId===expectedDefinition.id)
  assert.ok(guestRun,'the exact selected definition starts as a guest run')
  // Both dedicated and embedded single-test launches settle on the durable run URL.
  // Checking the transient startTests query races the direct launch in either engine.
  await expect(target).toHaveURL(url=>url.pathname==='/en/client'&&url.search==='?run='+guestRun.id&&url.hash==='')
  const after=await api('bootstrap',null,ctx)
  assert.equal(after.status,before.status,'public Start does not authenticate the account')
  if(before.status===200){
   assert.equal(after.data.account.id,before.data.account.id)
   for(const key of ['activeTestPlan','latestTestPlan','runs','results'])assert.deepEqual(after.data[key],before.data[key],'guest launch must leave account '+key+' untouched')
  }else assert.equal(before.status,401)
  assert.deepEqual(accountWrites,[],'public Start must not attempt any account mutation or Google sign-in')
 }finally{target.off('request',observe)}
}
// PR784 moved measured scales and profile tools into Insights, not out of the journey.
async function openInsightsProfileTools(target=page,locale='en'){
 const path='/'+locale+'/app/portfolio'
 const link=target.locator('nav a[href="'+path+'"]:visible').first()
 await expect(link).toHaveText(locale==='ru'?'Отчёты':'Reports')
 await expect(link).toHaveAttribute('href',path)
 await link.click()
 await expect(target).toHaveURL(origin+path)
 const portrait=target.locator('[data-testid="insights-psychological-portrait"]')
 await expect(portrait).toBeVisible()
 await expect(portrait).toHaveAttribute('open','')
 await expect(portrait.locator('img[src*="holistic-house-test-brain-concept"]')).toBeVisible()
 await exercisePortraitRays(portrait,expect,locale)
 const details=target.locator('[data-insights-detailed-scales]')
 await expect(details).not.toHaveAttribute('open','')
 await details.locator(':scope > summary').click()
 await expect(details).toHaveAttribute('open','')
 await expect(details.getByRole('heading',{name:locale==='ru'?'Мой профиль':'My profile',level:1,exact:true})).toBeVisible()
 await details.locator('[data-profile-deep-dive] > summary').click()
 await expect(details.getByRole('heading',{name:locale==='ru'?'Шкалы профессиональных тестов':'Professional test scales',exact:true})).toBeVisible()
 return details
}
async function enterTest(name='Current State Check',mode='Guided'){
 testPlanDiagnostics.marker('enter-test-begin')
 try {
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
  await openAccountTestPicker(page,expect)
  await chooseVisibleTest(page,name)
  testPlanDiagnostics.marker('before-selection-click')
  await page.getByRole('button',{name:'Start free monitoring',exact:true}).first().click()
  testPlanDiagnostics.marker('after-selection-click')
  await expect(page.locator('[data-pending-selection]')).toHaveCount(0)
  await expect(page.locator('#my-tests-list')).toBeVisible()
  testPlanDiagnostics.marker('saved-list-visible')
 }
 await expect(candidate()).toBeVisible({timeout:15000})
 testPlanDiagnostics.marker('before-start-click')
 await candidate().getByRole('button',{name:/^(Start test|Continue test|Retake test)/}).click()
 testPlanDiagnostics.marker('after-start-click')
 await expect(page).toHaveURL(/\/runs\//)
 testPlanDiagnostics.marker('run-url-observed')
 await expect(page.locator('.hh-runner')).toBeVisible()
 // My Tests opens the first question immediately; the optional guided mode stays inside the runner.
 await expect(page.locator('.hh-test-mode-picker')).toHaveCount(0)
 // A saved draft may already be on its final optional-context screen.
 await expect(page.locator('.hh-runner-question, .hh-runner-complete, .hh-quick-form').first()).toBeVisible()
 if(mode==='Guided'){
  await page.locator('.hh-test-mode-toggle').getByRole('button',{name:/Guided/}).click()
  await expect(page.locator('.hh-runner-question, .hh-runner-complete').first()).toBeVisible()
 }else await expect(page.locator('.hh-quick-form')).toBeVisible()
 } catch(error) {
  testPlanDiagnostics.marker('enter-test-failed')
  throw error
 } finally {
  testPlanDiagnostics.marker('enter-test-end')
 }
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
 if(scroll>width+1){
  // Failure-only evidence from this loopback public-service fixture. Never
  // inspect account state, field values, storage, or private routes here.
  const pathname=new URL(target.url()).pathname
  assert.match(pathname,/^\/(en|ru)\/services\/(dao-health-profile|alchemy-of-soul|hypnotherapy-course)$/)
  const diagnostic=await target.evaluate(()=>({
   viewport:innerWidth,document:document.documentElement.scrollWidth,
   nodes:Array.from(document.querySelectorAll('header,nav,main,section,article,h1,h2,h3,p,li,a,button,details,summary,figure')).flatMap(el=>{
    const rect=el.getBoundingClientRect(),style=getComputedStyle(el)
    if(!rect.width||!rect.height||style.display==='none'||style.visibility==='hidden')return[]
    const range=document.createRange();range.selectNodeContents(el)
    const textRect=range.getBoundingClientRect()
    if(rect.right<=innerWidth+1&&rect.left>=-1&&el.scrollWidth<=el.clientWidth+1&&textRect.right<=innerWidth+1)return[]
    return [{tag:el.tagName,className:el.className,text:(el.textContent||'').trim().slice(0,120),
     bounds:{left:rect.left,right:rect.right,width:rect.width},textRight:textRect.right,
     scrollWidth:el.scrollWidth,clientWidth:el.clientWidth,
     display:style.display,whiteSpace:style.whiteSpace,overflowWrap:style.overflowWrap,
     minWidth:style.minWidth,flexWrap:style.flexWrap,flexShrink:style.flexShrink,fontSize:style.fontSize}]
   }).slice(0,80),
  }))
  const stem='public-overflow-'+label.replace(/[^a-z0-9-]+/gi,'-')
  await writeFile(output+'/'+stem+'.json',JSON.stringify({pathname,label,...diagnostic},null,2))
  await screenshotEvidence(target,{path:output+'/'+stem+'.png',fullPage:true}).catch(error=>console.log('PUBLIC_OVERFLOW_SCREENSHOT_FAILED',error.message))
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
     const guide=servicePage.locator('details[data-alchemy-extended-guide]')
     await expect(guide.locator('summary')).toBeVisible()
     assert.equal(await guide.evaluate(node=>node.open),false,'Long guide stays collapsed')
     await expect(servicePage.locator('[data-alchemy-lead-form="single"]')).toHaveCount(1)
     await expect(servicePage.locator('[data-sitewide-capture="core-service"]')).toHaveCount(0)
     assert.equal(await servicePage.locator('details[data-alchemy-payment-disclosure]').evaluate(node=>node.open),false,
      'Default payment details are collapsed before geometry measurement')
     const measurements=await servicePage.locator('[data-alchemy-panel]').evaluateAll(nodes=>
      nodes.map(node=>({name:node.getAttribute('data-alchemy-panel'),height:Math.ceil(node.getBoundingClientRect().height),max:window.innerHeight-80})))
     assert.equal(measurements.length,8,'Eight clearly separated Alchemy panels')
     assert.deepEqual(measurements.filter(x=>x.height>x.max),[],
      'Every collapsed Alchemy section must fit one phone screen: '+JSON.stringify(measurements))
     await assertAlchemyPaymentsExpanded(servicePage,expect,width)
     if(width===390){
      await guide.locator('summary').click()
      const guideHeading=guide.locator('#distance-homeopathy-guide h1')
      await expect(guideHeading).toBeVisible()
      const headingSize=await guideHeading.evaluate(node=>({scroll:node.scrollWidth,client:node.clientWidth}))
      assert.ok(headingSize.scroll<=headingSize.client+1,'Expanded guide heading must wrap')
      await guide.locator('summary').click()
     }
     await expect(servicePage.locator('a[href="#distance-homeopathy-guide"]')).toHaveCount(0)
    }
    if(width===390||width===1280)await servicePage.screenshot({path:output+'/service-'+locale+'-'+slug+'-'+width+'.png',fullPage:false})
    if(width!==390)continue
    if(kind==='alchemy'){
     const form=servicePage.locator('[data-alchemy-lead-form="single"]')
     await form.scrollIntoViewIfNeeded()
     await expect(form.locator('select')).toHaveCount(2)
     await expect(form.locator('[data-contact-order]')).toBeVisible()
     await form.locator('select').first().selectOption('30')
     await form.locator('select').nth(1).selectOption('business')
     await expect(form.locator('select').first()).toHaveValue('30')
     await expect(servicePage.locator('[data-testimonial-video-id]')).toHaveCount(3)
     const stack=servicePage.locator('[data-alchemy-review-stack]')
     const boxes=await stack.locator('[data-testimonial-video-id]').evaluateAll(nodes=>
       nodes.map(node=>({top:node.getBoundingClientRect().top,bottom:node.getBoundingClientRect().bottom})))
     assert.equal(boxes.length,3,'All three source-backed videos are visible')
     assert.ok(boxes.every((rect,index)=>index===0||rect.top>=boxes[index-1].bottom),
       'Testimonial cards must stack vertically: '+JSON.stringify(boxes))
     assert.ok(await stack.evaluate(node=>node.scrollWidth<=node.clientWidth+1),
       'Vertical testimonial stack cannot overflow horizontally')
     const pricing=servicePage.locator('[data-alchemy-booking-formats]')
     await pricing.locator('[data-alchemy-format="30"]').click()
     await expect(pricing.locator('[data-alchemy-format="30"]')).toHaveAttribute('aria-pressed','true')
     const order=await openContactChannelChooser(pricing,expect)
     const prepared=await assertPreparedContactChannels(order,expect)
     assert.ok(prepared.whatsappUrl.searchParams.get('text').includes('€50'),
       'Selected 30-minute format must be carried into WhatsApp and Telegram')
     await expect(servicePage.locator('a[href="/'+locale+'/services/free-situation-review"]').first()).toBeVisible()
    }else{
     const capture=servicePage.locator('[data-sitewide-capture="core-service"][data-core-service-capture="'+kind+'"]')
     await capture.scrollIntoViewIfNeeded()
     await expect(capture).toBeVisible({timeout:30000})
     const chooser=await openContactChannelChooser(capture,expect)
     const {whatsappUrl}=await assertPreparedContactChannels(chooser,expect)
     const href=whatsappUrl.href
     const message=decodeURIComponent(new URL(href).searchParams.get('text')||'')
     assert.ok(message.includes(names[locale]),'Hydrated footer CTA must retain '+names[locale])
     const alternative=capture.locator('details')
     assert.equal(await alternative.evaluate(element=>element.open),false,'Free review alternative starts collapsed')
     await alternative.locator('summary').click()
     await expect(alternative.locator('a[href="/'+locale+'/services/free-situation-review"]')).toBeVisible()
    }
   }
   await servicePage.close()
  }
 }
 for(const locale of ['en','ru']){
  const publicPage=await publicContext.newPage()
  publicPage.on('pageerror',error=>publicErrors.push(error.message))
  const copy=locale==='ru'
   ? {ready:'Ответы готовы к копированию. Пока ничего не отправлено.',copyButton:'Скопировать ответы',copied:'Скопировано',fallback:'Выделите и скопируйте текст ниже'}
   : {ready:'Your answers are ready to copy. Nothing has been sent.',copyButton:'Copy answers',copied:'Copied',fallback:'Select and copy the text below'}
  for(const width of [320,360,390,1280]){
   await publicPage.setViewportSize({width,height:844})
   await publicPage.goto(origin+'/'+locale+'/services/free-situation-review',{waitUntil:'networkidle'})
   const quick=publicPage.locator('[data-free-quick-request]').first()
   await expect(quick).toBeVisible({timeout:30000})
   const intake=publicPage.locator('[data-free-drawing-intake]')
   await expect(intake).toBeHidden()
   const advanced=publicPage.locator('details').filter({has:intake})
   assert.equal(await advanced.evaluate(element=>element.open),false,'Detailed drawing form must start collapsed')
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
  const quick=publicPage.locator('[data-free-quick-request]').first()
  await expect(quick).toBeVisible()
  const intake=publicPage.locator('[data-free-drawing-intake]')
  const advanced=publicPage.locator('details').filter({has:intake})
  await expect(intake).toBeHidden()
  await advanced.locator(':scope > summary').click()
  await expect(intake).toBeVisible()
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
  const readyChooser=await openContactChannelChooser(ready,expect)
  const {whatsappUrl,telegramUrl}=await assertPreparedContactChannels(readyChooser,expect)
  const whatsappText=whatsappUrl.searchParams.get('text')||''
  const telegramText=telegramUrl.searchParams.get('text')||''
  const decodedPageUrl=decodeURIComponent(publicPage.url())
  for(const marker of [uniqueProblem,uniqueGoal]){
   assert.ok(!whatsappText.includes(marker),'Answers never enter decoded WhatsApp text')
   assert.ok(!telegramText.includes(marker),'Answers never enter decoded Telegram text')
   assert.ok(!decodedPageUrl.includes(marker),'Answers never enter decoded page URL')
  }
  await ready.getByRole('button',{name:copy.copyButton,exact:true}).click()
  await expect(ready.locator('p[aria-live="polite"]')).toContainText(copy.copied)
  await publicPage.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw new Error('synthetic clipboard denial')}}}))
  await ready.getByRole('button',{name:copy.copyButton,exact:true}).click()
  await expect(ready.locator('p[aria-live="polite"]')).toContainText(copy.fallback)
  await publicPage.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async value=>{window.__syntheticClipboardRecovery=value}}}))
  await ready.getByRole('button',{name:copy.copyButton,exact:true}).click()
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
 await assertPublicPickerEntrance(guestPickerPage,'en')
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
 // Bind visible type labels to registered entries, never infer source status from the DOM.
 const registeredPickerEntries=new Map(buildExplorerEntries({locale:'en',audience:'public'}).map(entry=>[entry.key,entry]))
 for(const card of await rankedCards.all()){
  const entry=registeredPickerEntries.get(await card.getAttribute('data-test-match'))
  assert.ok(entry,'Every displayed card must resolve to a registered explorer entry')
  const kindLabel=testKindShortLabel(entry,'en')
  const evidenceLabel=testKindCardLabel(entry,'en')
  assert.ok(kindLabel&&evidenceLabel,'Every displayed card must have a type and a source-faithful description')
  const category=card.locator('label [data-test-kind-badge]')
  await expect(category).toHaveCount(1)
  await expect(category).toBeVisible()
  await expect(category.locator('svg')).toHaveAttribute('aria-hidden','true')
  await expect(category.locator('svg')).toBeHidden()
  await expect(category.locator('span')).toBeVisible()
  await expect(category).toHaveAttribute('data-test-kind-badge',entry.testKind)
  await expect(category.locator('span')).toHaveText(`Type: ${kindLabel}`)
  await expect(category).toHaveAttribute('aria-label',`Type: ${kindLabel}. ${evidenceLabel}`)
 }
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
 const concernTopics=picker.getByRole('group',{name:'What would you like to explore?',exact:true})
 await expect(concernTopics).toHaveCount(1)
 const stress=concernTopics.getByRole('button',{name:'Stress',exact:true})
 await expect(stress).toHaveCount(1)
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
 const recommendationPriority=picker.getByRole('group',{name:'Which tests would you like to see first?',exact:true})
 await expect(recommendationPriority).toHaveCount(1)
 const shorterPriority=recommendationPriority.getByRole('button',{name:'Shorter tests. Prioritize shorter questionnaires',exact:true})
 await expect(shorterPriority).toHaveCount(1)
 await shorterPriority.click()
 await expect(shorterPriority).toHaveAttribute('aria-pressed','true')
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
 await assertPublicDiscoveryChrome(guestPickerPage,expect,'en')
 await exercisePublicCollections(guestPickerPage,expect,'en',{focus:['stress'],depth:'quick'})
 await guestPickerPage.goto(origin+'/ru/client')
 const ruPicker=guestPickerPage.locator('[data-prelogin-test-picker]')
 await assertPublicPickerEntrance(guestPickerPage,'ru')
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
 const ruConcernTopics=ruPicker.getByRole('group',{name:'Что вы хотите исследовать?',exact:true})
 await expect(ruConcernTopics).toHaveCount(1)
 const ruStress=ruConcernTopics.getByRole('button',{name:'Стресс',exact:true})
 await expect(ruStress).toHaveCount(1)
 await ruStress.click()
 await expect(ruStress).toHaveAttribute('aria-pressed','true')
 await expect(ruPicker.getByRole('button',{name:'Перегрузка на работе'})).toBeVisible()
 await assertPublicDiscoveryChrome(guestPickerPage,expect,'ru')
 await exercisePublicCollections(guestPickerPage,expect,'ru',{focus:['stress'],depth:'balanced'})
 await guestPickerPage.goto(origin+'/es/client/tests')
 await expect(guestPickerPage).toHaveURL(origin+'/es/client/tests')
 await expect(guestPickerPage.locator('main[lang="es"]')).toBeVisible()
 await expect(guestPickerPage.getByText('Algunas preguntas y resultados completos se presentan en su idioma original',{exact:false})).toBeVisible()
 await assertPublicPickerEntrance(guestPickerPage,'es')
 await assertPublicDiscoveryChrome(guestPickerPage,expect,'es')
 await exercisePublicCollections(guestPickerPage,expect,'es')
 await guestPickerContext.close()
 passed('pre-login test picker, optional filters, recommendations and full database')

 // The new public course presentation is a real mobile-first landing,
 // with seven expandable skills and all 14 days accessible before consent.
 for (const [language, title] of [
   ['en',/Stress Relief/],
   ['ru',/Антистресс/],
 ]) {
   await page.goto(origin+'/'+language+'/app/course?program=stress')
   const landing=page.locator('[data-opora-guest-landing]')
   await expect(landing).toBeVisible({timeout:20000})
   await expect(landing.getByRole('heading',{name:title,level:1})).toBeVisible()
   await expect(landing.locator('[data-antistress-start-tests]')).toBeVisible()
   const overview=landing.locator('[data-course-before-signup="guest"]')
   await expect(overview).toBeVisible()
   await expect(overview.locator('[data-course-phase]')).toHaveCount(7)
   await expect(overview.locator('[data-course-skill-accordion]')).toHaveCount(7)
   const firstStage=overview.locator('[data-course-skill-accordion]').first()
   await firstStage.locator('summary').click()
   await expect(firstStage).toHaveAttribute('open','')
   const detailed=overview.locator('[data-course-14-day-list]')
   await detailed.locator('summary').first().click()
   await expect(detailed.locator('[data-course-day]')).toHaveCount(14)
   for (const width of [320,390]) {
     await page.setViewportSize({width,height:844})
     assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),
       language+' redesigned OPORA landing must fit the mobile viewport')
   }
   await screenshotEvidence(page,{path:output+'/course-public-'+language+'.png',fullPage:false})
 }
 await page.setViewportSize({width:390,height:844})
 passed('anonymous EN/RU OPORA landing exposes seven skills and all 14 days without account access')

 const response=await page.goto(origin+'/en/app');assert.match(response.headers()['cache-control'],/no-store/);assert.match(response.headers()['x-robots-tag'],/noindex/);assert.equal(response.headers()['referrer-policy'],'no-referrer')
 await page.getByRole('button',{name:'Continue with Google'}).click();await expect(page.getByRole('heading',{name:'Create my private space'})).toBeVisible({timeout:60000})
 await page.getByLabel('I am 18 or older.').check();await page.getByLabel('I agree to private processing',{exact:false}).check();assert.equal(await page.getByLabel('I agree to optional marketing',{exact:false}).count(),0)
 await page.getByRole('button',{name:'Create my private space'}).click();await ready();
 await assertCabinetPortrait(page,expect,{origin});
 await expect(page.locator('[data-profile-report-archive]')).toBeVisible();
 await openCabinetMyTests(page,expect,{origin});
 await expect(page.getByRole('heading',{name:/^(My tests|Choose your tests)$/,exact:true})).toBeVisible();
 await expect(page.locator('[data-my-tests-dashboard]')).toBeVisible();
 const firstPicker=await assertAccountPickerDisclosure(page,expect,{expanded:false});
 await expect(firstPicker.toggle).toBeInViewport();
 await expect(page.getByRole('button',{name:'Get recommendations'})).toBeVisible();
 await expect(page.getByRole('button',{name:'Download report'})).toBeVisible();
 await expect(page.locator('.hh-nav')).toBeHidden();
 await expect(page.getByRole('navigation',{name:'Quick navigation'}).getByRole('link',{name:'Profile'})).toBeVisible();
 await screenshotEvidence(page,{path:output+'/my-tests-first-screen.png',fullPage:false});
 await assertCompactAccountPicker(await openAccountTestPicker(page,expect),expect);
 await firstPicker.toggle.click();
 await assertAccountPickerDisclosure(page,expect,{expanded:false});
 await openInsightsProfileTools();
 await expect(page.getByRole('heading',{name:'Selected tests still to complete',exact:true})).toBeVisible();
 await page.locator('[data-profile-extra-tools] > summary').click();
 await expect(page.getByRole('heading',{name:'Check your current state',exact:true})).toBeVisible();
 await expect(page.getByRole('link',{name:/Take a free state analysis and get recommendations/})).toBeVisible();
 await page.getByRole('navigation',{name:'Quick navigation'}).getByRole('link',{name:'Profile',exact:true}).click();
 await assertCabinetPortrait(page,expect,{origin});
 passed('supported SDK PKCE callback opens private reports, then real My tests and detailed Insights navigation')

 const profileOfferCases=[
   ['psychology','alchemy-of-soul','Alchemy of the Soul'],
   ['homeopathy','psychohomeopathy','homeopathy'],
   ['wu_xing','dao-health-profile','Wu Xing'],
   ['hypnotherapy','hypnotherapy-course','Hypnotherapy'],
 ]
 async function verifyProfileServiceOffers(target, locale='en', mode='account') {
   // Legacy cabinets are SSR-first: do not race a tap against React hydration.
   await expect(target.locator('[data-profile-domains][data-profile-interactive="true"]')).toBeVisible({timeout:20000})
   const areas=target.locator('.hh-domain-more')
   if(mode==='account'){
    await expect(areas).not.toHaveAttribute('open','')
    await areas.locator(':scope > summary').click()
   }
   await expect(areas).toHaveAttribute('open','')
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
 const practice=page.locator('.hh-master-header-link');
 await expect(practice).toHaveCount(1);
 await expect(practice).toHaveText('Practice');
 await expect(practice).toHaveAttribute('href','/en/app/practice');
 await expect(practice).toBeVisible();
 await practice.click();
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
  // Next development recompiles the first Home document and emits a full HMR
  // reload, cancelling WebKit's in-flight Home click. Compile it before setting
  // up the archive route; the actual single user click and URL checks stay intact.
  await warmCabinetExitDocument(context,origin)
  await page.waitForLoadState('networkidle')
  await page.goto(origin+'/en/app/analysis');await ready()
  await expect(page).toHaveURL(/\/en\/app\/portrait#personal-reports/)
  await expect(page.getByRole('heading',{name:'My profile & reports',level:1,exact:true})).toBeVisible()
  await expect(page.locator('[data-profile-report-archive]')).toBeVisible()
  await expect(page.locator('[data-personal-reports]')).toBeVisible()
  await expect(page.locator('[data-analysis-offer]')).toHaveCount(0)
  await expect(page.getByText('No reports yet',{exact:true})).toBeVisible()
  const primaryNav=page.getByRole('navigation',{name:'Quick navigation'})
  await expect(primaryNav.locator(':scope > a')).toHaveCount(6)
  await expect(primaryNav.getByRole('link',{name:'Analysis'})).toHaveCount(0)
  await expect(primaryNav.getByRole('link',{name:'Profile'})).toHaveAttribute('aria-current','page')
  for(const width of [320,390,768,1280]){
    await page.setViewportSize({width,height:900})
    await assertCabinetPrimaryNavigation(page,expect,{current:'portrait'})
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Profile must not overflow viewport at '+width+'px')
    await screenshotEvidence(page,{path:output+'/integrated-profile-en-'+width+'.png',fullPage:true})
  }
  await page.setViewportSize({width:390,height:844})
  // Observe this real click without changing navigation or reading private data.
  const homeEvents=[]
  const homeConsole=message=>{if(/^(HH_HOME_PROBE |\[Fast Refresh\]|\[HMR\])/.test(message.text()))homeEvents.push(message.text())}
  const homeRequest=request=>{if(request.isNavigationRequest())homeEvents.push(JSON.stringify({kind:'request',path:new URL(request.url()).pathname}))}
  const homeFailed=request=>{if(request.isNavigationRequest())homeEvents.push(JSON.stringify({kind:'failed',path:new URL(request.url()).pathname,error:request.failure()?.errorText}))}
  const homeResponse=response=>{if(response.request().isNavigationRequest()){const location=response.headers().location;homeEvents.push(JSON.stringify({kind:'response',path:new URL(response.url()).pathname,status:response.status(),redirectPath:location?new URL(location,response.url()).pathname:null}))}}
  const homeFrame=frame=>{if(frame===page.mainFrame())homeEvents.push(JSON.stringify({kind:'frame',path:new URL(frame.url()).pathname}))}
  page.on('console',homeConsole);page.on('request',homeRequest);page.on('framenavigated',homeFrame);page.on('requestfailed',homeFailed);page.on('response',homeResponse)
  await page.evaluate(()=>{
    const emit=(kind,event)=>console.log('HH_HOME_PROBE '+JSON.stringify({kind,path:location.pathname,
      target:event?.target?.closest?.('a')?.getAttribute('href')==='/'?'home':'other',
      prevented:Boolean(event?.defaultPrevented),width:innerWidth,height:innerHeight,scrollY}))
    for(const kind of ['pointerdown','pointerup','click'])document.addEventListener(kind,event=>emit(kind,event),{capture:true,passive:true,once:true})
    for(const kind of ['pagehide','popstate'])window.addEventListener(kind,event=>emit(kind,event),{capture:true,passive:true,once:true})
  })
  try { await openCabinetHome(page,expect,{origin}) }
  finally {console.log('SYNTHETIC_HOME_NAVIGATION',JSON.stringify(homeEvents));page.off('console',homeConsole);page.off('request',homeRequest);page.off('framenavigated',homeFrame);page.off('requestfailed',homeFailed);page.off('response',homeResponse)}
  await page.goto(origin+'/en/app/portrait');await ready()
  passed('legacy Analysis route opens the secure integrated Profile archive with five private destinations and mobile Home navigation')
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
 await assertCabinetPortrait(page,expect,{origin})
 await openCabinetMyTests(page,expect,{origin})
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
 await openInsightsProfileTools();
  await expect(page.locator('[data-measured-scale]')).toHaveCount(0);await expect(page.getByText(/No professional test results yet/)).toBeVisible();
  await expect(page.getByRole('heading',{name:'Professional test scales',exact:true})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Selected tests still to complete',exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Download report'})).toBeEnabled();
  await expect(page.getByRole('link',{name:/Get personal recommendations from a specialist/})).toBeVisible();
  await page.getByRole('link',{name:/Retake completed tests/}).click();
  await expect(page).toHaveURL(/\/en\/app\/tests\?filter=completed/);
  await expect(page.locator('#my-tests-list')).toBeVisible();
  await openInsightsProfileTools();await page.locator('[data-profile-extra-tools] > summary').click();
  await expect(page.getByRole('heading',{name:'Add your baseline profile',exact:true})).toBeVisible();await expect(page.getByRole('link',{name:/Results portfolio/})).toBeVisible()
 for(const width of[320,360,390,430,768,1280]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await screenshotEvidence(page,{path:`${output}/portrait-en-${width}.png`,fullPage:true})}
 assert.equal(await page.locator('.mobile-bottom-navigation').count(),0);passed('action-first profile dashboard and responsive no-overflow screenshots 320–1280')
 await page.goto(origin+'/en/app/portfolio');await ready();
  await expect(page.getByRole('heading',{name:'My results',exact:true})).toBeVisible()
 await expect(page.locator('[data-testid="completed-test-insights"]')).toBeVisible()

 // One row of 4 category buttons and full-circle scales: real iPhone rendering.
 const radarCard=page.locator('[data-testid="insights-psychological-portrait"]')
 const fourSectorButtons=radarCard.locator('button[data-portrait-sector]')
 await expect(fourSectorButtons).toHaveCount(4)
 await expect(radarCard.locator('[data-portrait-sector-all]')).toHaveCount(1)
 await expect(radarCard.locator('[data-portrait-sector-all]')).toHaveAttribute('aria-pressed','true')
 await expect(radarCard.locator('[data-summary-sector]')).toHaveCount(4)
 await radarCard.locator('button[data-portrait-sector="body"]').click()
 await expect(radarCard.locator('[class*="visualState"]')).toHaveCount(0)
 await expect(radarCard.locator('button[data-portrait-sector="body"]')).toHaveAttribute('aria-pressed','true')
 await expect(radarCard.locator('[data-radar-layout="full-circle"]')).toBeVisible()
 await expect(radarCard.locator('[data-detail-axis]')).toHaveCount(5)
 await expect(radarCard.locator('[data-contour-axis]')).toHaveCount(5)
 for(const width of [320,390,430]){
   await page.setViewportSize({width,height:900})
   const fit=await radarCard.evaluate(card=>{
     const svg=card.querySelector('[data-radar-layout="full-circle"]')
     const ring=svg?.querySelector('circle[class*="radarReference"]')
     const chart=svg?.getBoundingClientRect()
     const bounds=ring?.getBoundingClientRect()
     const buttons=[...card.querySelectorAll('button[data-portrait-sector]')]
     const tops=buttons.map(button=>button.getBoundingClientRect().top)
     const texts=[...svg.querySelectorAll('text[class*="radarInlineLabel"]')]
     const captionBounds=texts.map(text=>text.getBoundingClientRect())
     const labelsInside=chart && captionBounds.every(rect=>rect.left>=chart.left-2 && rect.right<=chart.right+2
       && rect.top>=chart.top-2 && rect.bottom<=chart.bottom+2)
     return {
       svg:chart?.width||0,ring:bounds?.width||0,
       overflow:document.documentElement.scrollWidth-innerWidth,
       fourInRow:tops.length===4 && Math.max(...tops)-Math.min(...tops)<2,
       labelsInside,
     }
   })
   assert.ok(fit.svg>0 && fit.ring/fit.svg>.78,'Full radar must fill 78% of viewport image at '+width)
   assert.ok(fit.overflow<=1,'Radar must not overflow '+width+'px')
   assert.ok(fit.fourInRow,'All four category buttons must share one row at '+width)
   assert.ok(fit.labelsInside,'Scale labels must stay inside the radar on '+width)
   await screenshotEvidence(page,{path:`${output}/portrait-four-tabs-en-${width}.png`,fullPage:false})
 }
 for(const [key,count] of [['body',5],['work',3],['relationships',4],['growth',5]]){
   const button=radarCard.locator('button[data-portrait-sector="'+key+'"]')
   await button.click()
   await expect(button).toHaveAttribute('aria-pressed','true')
   await expect(radarCard.locator('button[data-portrait-sector][aria-pressed="true"]')).toHaveCount(1)
   await expect(radarCard.locator('[data-detail-axis]')).toHaveCount(count)
   await expect(radarCard.locator('[data-contour-axis]')).toHaveCount(count)
   // The selected sector uses every quadrant of the 360° ring (if >=3 axes).
   const coverage=await radarCard.locator('[data-contour-axis]').evaluateAll(dots=>{
     const pts=dots.map(dot=>({x:Number(dot.getAttribute('cx'))-180,y:Number(dot.getAttribute('cy'))-182}))
     return {left:pts.some(p=>p.x< -20),right:pts.some(p=>p.x>20),
       top:pts.some(p=>p.y< -20),bottom:pts.some(p=>p.y>20)}
   })
   assert.ok(coverage.left&&coverage.right&&coverage.top&&coverage.bottom,'Category must span all directions: '+key)
 }
 await expect(radarCard.locator('[data-testid="portrait-quick-actions"]')).toBeVisible()
 passed('Reports portrait: four tabs in one iPhone row, no header, full-circle category detail, width 320/390/430')
 await page.setViewportSize({width:390,height:844})

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
 historyNavigationDiagnostics=observeHistoryNavigation(page,browser,{origin,log:(name,evidence)=>console.log(name,JSON.stringify(evidence))})
 historyNavigationDiagnostics.mark('recovery-start')
 const recoveryContext=await browser.newContext({storageState:await context.storageState(),serviceWorkers:'block',viewport:{width:390,height:844}})
 await installRatingsRequestDiagnostics(recoveryContext,origin,event=>console.log('SYNTHETIC_RECOVERY_RATINGS_DIAGNOSTIC',JSON.stringify(event)))
 const recoveryPage=await recoveryContext.newPage()
 recoveryPage.on('pageerror',capturePageError(recoveryPage))
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
 } finally {
  historyNavigationDiagnostics.mark('recovery-teardown-start')
  await recoveryContext.close()
  historyNavigationDiagnostics.mark('recovery-teardown-complete')
 }
 passed('invalid HTTP 200 bootstrap bodies show retry and recover without uncaught browser errors')
 // Technical-only markers isolate the existing history wait without changing it.
 historyDiagnosticStartedAt=performance.now()
 const historyDiagnostic=stage=>{historyDiagnosticStage=stage;historyNavigationDiagnostics.mark(stage);console.log('SYNTHETIC_HISTORY_STAGE',JSON.stringify({stage,elapsedMs:Math.max(0,Math.round(performance.now()-historyDiagnosticStartedAt))}))}
 historyDiagnostic('goto-start')
 await page.goto(origin+'/en/app/history')
 historyDiagnostic('goto-complete')
 historyDiagnostic('ready-start')
 await ready()
 historyDiagnostic('ready-complete')
 historyDiagnostic('assertion-start')
 await expect(page.locator('.hh-change')).toContainText('7 → 4')
 historyDiagnostic('assertion-complete')
 historyDiagnostic('screenshot-start')
 await screenshotEvidence(page,{path:output+'/history-en.png',fullPage:true})
 historyDiagnostic('screenshot-complete')
 passed('history compares real results and exact point differences')
 const historyNetworkEvidence=collectHistoryNavigationEvidence(historyNavigationDiagnostics)
 await boundedBestEffort(()=>writeFile(output+'/history-navigation.json',JSON.stringify(historyNetworkEvidence,null,2)))
 historyNavigationDiagnostics=null
 historyDiagnosticStage=null;historyDiagnosticStartedAt=null
 await page.goto(origin+'/en/app/monitoring/hh-current-state');await ready();await expect(page.getByRole('heading',{name:'Current State Check',exact:true})).toBeVisible();await expect(page.getByRole('heading',{name:'Measurement history',exact:true})).toBeVisible();await expect(page.getByRole('heading',{name:'Compare measurements',exact:true})).toBeVisible();await screenshotEvidence(page,{path:output+'/psi-monitoring-trend.png',fullPage:true});passed('Psi-Monitoring trend view compares compatible repeated measurements')
 await enterTest('Personality Baseline');await expect(page.getByText('In general, not only today',{exact:false})).toBeVisible()
 await screenshotEvidence(page,{path:output+'/personality-runner.png',fullPage:true})
 for(let i=0;i<20;i++){await savedClick(page.locator('.hh-scale').getByRole('button',{name:'3 Neither Inaccurate nor Accurate'}));if(i<19)await savedClick(page.getByRole('button',{name:'Next',exact:true}))}
 await page.getByRole('button',{name:'Save results and get recommendations'}).click();await openCompletedPlanResult();data=(await api('bootstrap')).data;const trait=data.results.find(r=>r.definitionKey==='mini-ipip-20');assert.deepEqual(trait.dimensions.map(d=>d.value),[12,12,12,12,12]);assert.equal(data.snapshot.dimensions.length,10);passed('Mini-IPIP scoring is preserved alongside completed plan summaries')
 await enterTest('Weekly Wellbeing Check-in','Quick')
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
 const weeklyResumeRow=page.locator('#my-tests-list article').filter({has:page.getByRole('heading',{name:'Weekly Wellbeing Check-in',exact:true})})
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
 await openInsightsProfileTools()
 await page.locator('[data-profile-extra-tools] > summary').click()
 await expect(page.getByRole('heading',{name:'Finish: Weekly Wellbeing Check-in',exact:true})).toBeVisible()
 await expect(page.getByRole('link',{name:'Continue test',exact:true})).toBeVisible()
 passed('Quick draft resumes with its saved answers and can switch to one-question Guided mode')
 await page.goto(origin+'/ru/app/portrait');await ready();await assertCabinetPortrait(page,expect,{origin,locale:'ru'});await screenshotEvidence(page,{path:output+'/portrait-ru.png',fullPage:true});passed('Russian app chrome preserves English instrument provenance')
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
  await expect(clientPage.getByRole('heading',{name:'My profile & reports',level:1,exact:true})).toBeVisible()
  await verifyProfileServiceOffers(clientPage,'en','legacy')
  await screenshotEvidence(clientPage,{path:output+'/private-client-profile-cta.png',fullPage:false})
  passed('all four legacy private-client profile CTAs open a precise, privacy-safe order request')

  await expect(clientPage.getByRole('link',{name:'Personal analysis'})).toHaveCount(0)
  await expect(clientPage.locator('[data-profile-report-archive]')).toBeVisible()
  const formerAnalysisUrl=new URL(clientLink)
  formerAnalysisUrl.searchParams.set('view','analysis')
  await clientPage.goto(formerAnalysisUrl.toString())
  await expect(clientPage.getByRole('heading',{name:'My profile & reports',level:1,exact:true})).toBeVisible()
  await expect(clientPage.locator('[data-personal-reports]')).toBeVisible()
  await expect(clientPage.getByText('No reports yet',{exact:true})).toBeVisible()
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
 await expect(otherPage).toHaveURL(/\/en\/app\/portrait$/,{timeout:30000})
 await expect(otherPage.getByRole('heading',{name:'Create my private space'})).toBeVisible({timeout:30000})
 // These old readiness signals are already true before consent is submitted.
 // Prove the 403 gate here; never retry it until it happens to become a 404.
 await expect(otherPage.locator('.hh-nav')).toBeVisible()
 await expect(otherPage).toHaveURL(/\/en\/app\/portrait$/,{timeout:15000})
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
 await assertCabinetPortrait(otherPage,expect,{origin})
 const otherBootstrap=await api('bootstrap',null,other)
 assert.equal(otherBootstrap.status,200)
 assert.equal(otherBootstrap.data.account.onboardingState,'active')
 assert.equal((await api('results/'+first.id,null,other)).status,404)
 assert.equal(otherBootstrap.data.results.length,0)
 passed('browser A/B cross-user result denial after committed consent')
 // Public Start remains a guest journey even with an authenticated Google cookie.
 // Open a fresh tab in the same authenticated cookie context: the onboarding page
 // can still have a queued router.replace('/en/app') after its nav becomes visible.
 // Reusing it races Playwright's navigation against that pending redirect in WebKit.
 const selectionPage = await other.newPage()
 const selectionWrites=[]
 selectionPage.on('response',response=>{ if(new URL(response.url()).pathname==='/api/app/test-plans'&&response.request().method()==='POST') selectionWrites.push(response.status()) })
 await selectionPage.goto(origin+'/en/client/tests')
 await chooseSinglePublicTest(selectionPage,'Personality Baseline')
 const personalityDefinition=buildExplorerEntries({locale:'en',audience:'guest'}).find(entry=>entry.key==='mini-ipip-20').definition
 await launchPublicGuestWithoutAccountWrite(selectionPage,other,personalityDefinition)
 passed('authenticated public launch starts the exact guest test without writing the account')
 const accountExplorer=await chooseSingleAccountTest(selectionPage,'Personality Baseline')
 const selectionGuided=accountExplorer.locator('#hh-test-customizer')
 if(!(await selectionGuided.isVisible()))await accountExplorer.getByRole('button',{name:/Choose my own tests and filters/}).click()
 await selectionGuided.getByRole('button',{name:/Topics that matter/}).click()
 await selectionGuided.getByRole('button',{name:'Anxiety & worry',exact:true}).click()
 await expect(selectionGuided.getByRole('button',{name:'Anxiety & worry',exact:true})).toHaveAttribute('aria-pressed','true')
 await exerciseAccountPickerDraftRetention(selectionPage,expect)
 await accountExplorer.getByRole('button',{name:'Start free monitoring',exact:true}).first().click()
 await expect(selectionPage).toHaveURL(/\/en\/app\/tests\?plan=/,{timeout:15000})
 await expect(selectionPage.locator('#my-tests-list')).toBeVisible()
 await expect(selectionPage.getByRole('heading',{name:'Personality Baseline',exact:true})).toBeVisible()
 const selectedPlan=(await api('bootstrap',null,other)).data.activeTestPlan
 assert.deepEqual(selectedPlan.definitionIds,[personalityDefinition.id],'account picker saves exactly the selected definition in order')
 assert.deepEqual(selectedPlan.selectionPreferences.focus,['anxiety'])
 await selectionPage.getByText('My interests & additional recommendations',{exact:true}).click()
 await expect(selectionPage.getByRole('region',{name:'My saved test priorities'})).toContainText('Anxiety & worry')
 assert.equal(new URL(selectionPage.url()).searchParams.get('plan'),selectedPlan.id)
 assert.deepEqual(selectionWrites,[201],'single selected battery creates exactly one plan, even with React StrictMode')
 await selectionPage.close()
 passed('My Tests picker preserves exact selection and priorities with one account write')
 // Re-selecting the same assessment should reuse the existing battery, not
 // leave the OAuth handoff query pending or create a second plan.
 const repeatSelectionPage=await other.newPage()
 const reuseWrites=[]
 repeatSelectionPage.on('response',response=>{if(new URL(response.url()).pathname==='/api/app/test-plans'&&response.request().method()==='POST')reuseWrites.push(response.status())})
 // Reuse restores the saved Anxiety priority, which excludes this unselected test.
 // Temporarily change that visible filter, then restore it before the only write.
 let repeatAnxiety
 const repeatExplorer=await chooseSingleAccountTest(repeatSelectionPage,'Personality Baseline',{
  beforeSelection:async explorer=>{
   const toggle=explorer.locator('button[aria-controls="hh-test-customizer"]')
   await expect(toggle).toHaveCount(1)
   if((await toggle.getAttribute('aria-expanded'))!=='true')await toggle.click()
   await expect(toggle).toHaveAttribute('aria-expanded','true')
   const guided=explorer.locator('#hh-test-customizer')
   const topics=guided.getByRole('button',{name:/^Topics that matter/})
   await expect(topics).toHaveCount(1)
   await topics.click()
   const group=guided.getByRole('group',{name:'Filter tests by your concerns',exact:true})
   await expect(group).toHaveCount(1)
   repeatAnxiety=group.getByRole('button',{name:'Anxiety & worry',exact:true})
   await expect(repeatAnxiety).toHaveCount(1)
   await expect(repeatAnxiety).toHaveAttribute('aria-pressed','true')
   await repeatAnxiety.click()
   await expect(repeatAnxiety).toHaveAttribute('aria-pressed','false')
  },
 })
 await repeatAnxiety.click()
 await expect(repeatAnxiety).toHaveAttribute('aria-pressed','true')
 await expect(repeatExplorer.getByRole('checkbox',{name:'Personality Baseline',exact:true,checked:true})).toHaveCount(1)
 assert.deepEqual(reuseWrites,[],'filter changes and exact selection do not write the account')
 const [reuseResponse]=await Promise.all([
  repeatSelectionPage.waitForResponse(response=>new URL(response.url()).pathname==='/api/app/test-plans'&&response.request().method()==='POST'),
  repeatExplorer.getByRole('button',{name:'Start free monitoring',exact:true}).first().click(),
 ])
 assert.equal(reuseResponse.status(),201)
 await expect(repeatSelectionPage).toHaveURL(/\/en\/app\/tests\?plan=/,{timeout:15000})
 assert.equal(new URL(repeatSelectionPage.url()).searchParams.get('plan'),selectedPlan.id)
 const reusedPlan=(await api('bootstrap',null,other)).data.activeTestPlan
 assert.equal(reusedPlan.id,selectedPlan.id)
 assert.deepEqual(reusedPlan.definitionIds,selectedPlan.definitionIds)
 assert.deepEqual(reusedPlan.completedRunIds,selectedPlan.completedRunIds)
 assert.deepEqual(reusedPlan.selectionPreferences,selectedPlan.selectionPreferences,
  'explicit repeat selection restores every saved preference before the idempotent write')
 assert.deepEqual(reuseWrites,[201],'reselecting the same set performs exactly one idempotent account save')
 await expect(repeatSelectionPage.locator('[data-pending-selection]')).toHaveCount(0)
 await repeatSelectionPage.close()
 passed('choosing a matching existing set reuses the same saved plan and clears pending handoff')
 const blocked=await context.request.post(origin+'/api/app/requests',{headers:{Origin:'https://other.invalid'},data:{}});assert.equal(blocked.status(),403);passed('cross-origin mutations rejected')
 const storage=await page.evaluate(async()=>({local:Object.keys(localStorage),session:Object.keys(sessionStorage),caches:await Promise.all((await caches.keys()).map(async k=>(await(await caches.open(k)).keys()).map(r=>new URL(r.url).pathname)))}));assert.ok(!JSON.stringify(storage).match(/hh-app-auth|profile:first|\/api\/app|\/en\/app|\/ru\/app/));passed('no private browser storage or service-worker response cache')
 const exported=await api('export');assert.equal(exported.status,200);assert.ok(exported.data.runs.every(r=>r.accountId===first.accountId));assert.equal(exported.data.results.length,3);passed('own complete data export')
 // Remember the active owner selection before the separate Google sign-in flow.
 // It must still be present after a guest launch and an explicit My Tests append.
 const savedBeforeSignout=(await api('bootstrap')).data.activeTestPlan
 assert.ok(savedBeforeSignout?.definitionIds?.length>0,'synthetic owner has a saved battery')
 const newPublicTest=unsavedPublicTest(savedBeforeSignout)
 const settingsResponse=await page.goto(origin+'/en/app/settings')
 assert.match(settingsResponse.headers()['cache-control']||'',/no-store/,'private settings navigation remains non-cacheable')
 await expect.poll(()=>page.evaluate(()=>Boolean(navigator.serviceWorker?.controller))).toBe(true)
 await ready();await page.getByRole('button',{name:'Sign out on all devices'}).click();await expect(page.getByRole('button',{name:'Continue with Google'})).toBeVisible();await expect(page).toHaveURL(origin+'/en/app/portrait');await page.waitForLoadState('networkidle');assert.equal((await api('bootstrap')).status,401);passed('logout invalidates real test session and clears UI')
 // A fresh tab in the same cookie jar avoids racing Next's logout refresh.
 await page.close();page=await context.newPage();page.on('pageerror',capturePageError(page))

 await page.goto(origin+'/en/client')
 await assertPublicPickerEntrance(page,'en')
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

 await chooseSinglePublicTestAfterCatalog(page,newPublicTest.title)
 await launchPublicGuestWithoutAccountWrite(page,context,newPublicTest.definition)
 // Sign in explicitly, then append through the actual account picker.
 await page.goto(origin+'/en/app')
 await page.getByRole('button',{name:'Continue with Google',exact:true}).click()
 await assertCabinetPortrait(page,expect,{origin})
 assert.deepEqual((await api('bootstrap')).data.activeTestPlan,savedBeforeSignout,'guest selection and Google sign-in leave the saved battery unchanged')
 const appendExplorer=await chooseSingleAccountTest(page,newPublicTest.title)
 await appendExplorer.getByRole('button',{name:'Start free monitoring',exact:true}).first().click()
 await expect(page).toHaveURL(/\/en\/app\/tests\?plan=/,{timeout:30000})
 const reopenedPlan=(await api('bootstrap')).data.activeTestPlan
 assert.equal(reopenedPlan.id,savedBeforeSignout.id,'same original plan remains active')
 assert.equal(new URL(page.url()).searchParams.get('plan'),reopenedPlan.id,'saved plan URL identifies the original account plan')
 assert.deepEqual(reopenedPlan.definitionIds,[...savedBeforeSignout.definitionIds,newPublicTest.definition.id],
   'My Tests appends the exact selected definition after every earlier test in its saved order')
 assert.ok(reopenedPlan.definitionIds.includes(newPublicTest.definition.id),'the exact newly selected public definition is saved')
 assert.ok(reopenedPlan.definitionIds.length>savedBeforeSignout.definitionIds.length,
   'the newly selected public test is added to My Tests')
 assert.deepEqual(reopenedPlan.completedRunIds,savedBeforeSignout.completedRunIds,
   'adding tests must not discard completed progress')
 await expect(page.locator('[data-pending-selection]')).toHaveCount(0)
 await expect(page.locator('#my-tests-list')).toBeVisible()
 await expect(page.getByRole('heading',{name:newPublicTest.title,exact:true})).toBeVisible()
 passed('explicit My Tests selection appends the exact test without replacing account history')
 // The account shows the entire saved selection immediately, with a direct
 // remove control per row. Removing does not remove previous saved results.
 const beforeRemove=(await api('bootstrap')).data
 const activeBeforeRemove=beforeRemove.activeTestPlan
 assert.ok(activeBeforeRemove?.definitionIds.length>0)
 const removeButton=page.locator('[data-remove-selected-test="'+newPublicTest.key+'"]')
 await expect(removeButton).toHaveCount(1)
 await expect(removeButton).toBeVisible()
 await expect(page.locator('#my-tests-list')).toBeVisible()
 await removeButton.click()
 await expect.poll(async()=>((await api('bootstrap')).data.activeTestPlan?.definitionIds.length || 0),{timeout:15000})
  .toBe(activeBeforeRemove.definitionIds.length-1)
 const afterRemove=(await api('bootstrap')).data
 assert.deepEqual(afterRemove.activeTestPlan.definitionIds,savedBeforeSignout.definitionIds,'removing the appended test restores the exact original ordered selection')
 assert.deepEqual(afterRemove.activeTestPlan.completedRunIds,activeBeforeRemove.completedRunIds,'removal preserves completed progress')
 assert.deepEqual(afterRemove.results,beforeRemove.results,'removal preserves exact saved results')
 assert.deepEqual(afterRemove.runs,beforeRemove.runs,'removal preserves exact saved runs and drafts')
 assert.equal(afterRemove.results.length,beforeRemove.results.length,'removing a test must not delete results')
 assert.equal(afterRemove.runs.length,beforeRemove.runs.length,'removing a test must not delete drafts')
 await expect(page.getByText('Removed from selection.',{exact:false})).toBeVisible({timeout:15000})
 passed('first-screen test removal updates current plan while preserving private results and drafts')
 assert.deepEqual(errors,[]);passed('no uncaught browser errors')
 await writeFile(output+'/verification.json',JSON.stringify({commit:process.env.GITHUB_SHA,checks,realPostgreSQL:true,auth:'ISOLATED_PROVIDER_PROTOCOL_DOUBLE_NOT_GOOGLE',production:'UNCHANGED'},null,2))
 await other.close();await admin.close()
 } catch(error){
 primaryFailure=true
 try {
 const historyNavigationEvidence=collectHistoryNavigationEvidence(historyNavigationDiagnostics,true)
 await preserveBrowserFailure({
  error, stage:historyDiagnosticStage,
  elapsedMs:historyDiagnosticStartedAt===null?null:performance.now()-historyDiagnosticStartedAt,
  log:(name,evidence)=>console.log(name,JSON.stringify(evidence)),
  write:failure=>writeFile(output+'/verification.json',JSON.stringify({commit:process.env.GITHUB_SHA,checks,failure,historyNavigationEvidence,auth:'ISOLATED_PROVIDER_PROTOCOL_DOUBLE_NOT_GOOGLE'},null,2)),
  screenshot:()=>screenshotEvidence(page,{path:output+'/failure-synthetic-only.png',fullPage:true}),
 }) } finally { throw error }
} finally {
 const outcome=await boundedBestEffort(()=>browser.close())
 console.log('SYNTHETIC_BROWSER_CLEANUP',JSON.stringify({outcome}))
 if(outcome!=='completed'&&!primaryFailure)throw new Error('Synthetic browser cleanup did not complete')
}
