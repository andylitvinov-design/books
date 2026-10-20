import { assertCabinetPortrait, openCabinetMyTests } from './helpers/cabinet-navigation-verifier.mjs'
import { readEveryAccountScale } from './helpers/account-scale-picker-verifier.mjs'
import { assertAccountScaleJumpLayout } from './helpers/scale-jump-layout-verifier.mjs'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import { buildAssessmentResultReport } from '../lib/assessments/result-report.js'
import { collectReportOverflowDiagnostics } from './helpers/report-overflow-diagnostics.mjs'
import { assertQuestionnaireMode, enterGuestQuestionnaireMode } from './helpers/direct-questionnaire-verifier.mjs'
import { guestFinishLabel, assertGuestScaleResult, assertAccountScaleReport } from './helpers/guest-scale-verifier.mjs'
// Synthetic loopback-only browser verification. No Google or production requests.
import { chromium, webkit, expect } from '@playwright/test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { createGuestVerifierPacer } from './helpers/guest-verifier-pacing.mjs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { assertIsolated } from '../tests/helpers/app-db-setup.mjs'
import { PERSONALITY_TYPE_DEFINITIONS, PERSONALITY_TYPE_CATALOG } from '../data/assessments/personality-types-original-2026.js'
const defs=PERSONALITY_TYPE_DEFINITIONS.filter(d=>d.instrumentLocale==='en')
const localized=(key,locale)=>PERSONALITY_TYPE_DEFINITIONS.find(d=>d.key===key&&d.instrumentLocale===locale)
assertIsolated()
const origin=process.env.HH_TEST_APP_ORIGIN || 'http://127.0.0.1:3100'
assert.match(origin,/^http:\/\/(127\.0\.0\.1|localhost):\d+$/)
const engine=process.env.HH_TEST_BROWSER==='webkit'?webkit:chromium
const browser=await engine.launch(process.env.HH_TEST_BROWSER_EXECUTABLE?{executablePath:process.env.HH_TEST_BROWSER_EXECUTABLE}:{})
const output='artifacts/app-r1/typology-'+engine.name()
await mkdir(output,{recursive:true})
const guestPacer=createGuestVerifierPacer()
let pacedGuestContext=null
const checks=[], errors=[]
const passed=name=>{checks.push(name);console.log('PASS '+name)}
function observePage(page,label){
 const location=()=>new URL(page.url()).pathname
 page.on('pageerror',error=>{
  errors.push(error.message)
  console.log('TYPOLOGY_PAGE_ERROR',JSON.stringify({label,path:location(),message:error.message,stack:error.stack,lastCheck:checks.at(-1)}))
 })
 page.on('console',message=>{
  if(['error','warning'].includes(message.type()))console.log('TYPOLOGY_CONSOLE',JSON.stringify({label,path:location(),type:message.type(),text:message.text().slice(0,1600)}))
 })
 page.on('requestfailed',request=>console.log('TYPOLOGY_REQUEST_FAILED',JSON.stringify({label,path:location(),request:new URL(request.url()).pathname,error:request.failure()?.errorText})))
 page.on('request',request=>{
  if(new URL(request.url()).pathname==='/__nextjs_original-stack-frames')console.log('TYPOLOGY_STACK_REQUEST',JSON.stringify({label,path:location(),frames:request.postDataJSON()?.frames}))
 })
}
async function navigate(page,url){
 // Let mounted account panels finish their reads before a hard navigation.
 // WebKit otherwise reports an interrupted same-origin fetch as an access-control error.
 // Keep the final zero-page-error assertion: do not suppress actual request failures.
 await page.waitForLoadState('networkidle')
 await page.goto(url)
 await page.waitForLoadState('networkidle')
}
async function api(context,path,body){
 if(context===pacedGuestContext)guestPacer.record('/api/app/'+path,body?'POST':'GET')
 const response=await context.request.fetch(origin+'/api/app/'+path,{method:body?'POST':'GET',headers:body?{Origin:origin,'Content-Type':'application/json'}:{},data:body})
 const value=await response.json();assert.ok(response.ok(),path+': '+JSON.stringify(value));return value
}
async function fill(page,d,mode,guest,locale){
 const quick=guest?'.cabinet-quick-question':'.hh-quick-question'
 for(let i=0;i<d.questions.length;i++){
  // Pace synthetic saves within unchanged production account/guest request limits.
  await page.waitForTimeout(mode==='guided'?750:400)
  const scope=mode==='quick'?page.locator(quick).nth(i):page.locator(guest?'.cabinet-guided-question':'.hh-runner-question')
  await expect(scope.getByRole('heading',{name:d.questions[i].text,exact:true})).toBeVisible()
  const buttons=scope.locator(guest?'.cabinet-answer-list button':'.hh-scale button')
  await expect(buttons).toHaveCount(5)
  const saved=page.waitForResponse(r=>r.url().includes('/runs/')&&r.url().endsWith('/save')&&r.request().method()==='POST')
  await buttons.nth(2).click()
  assert.ok((await saved).ok())
  if(mode==='guided'&&i<d.questions.length-1)await page.getByRole('button',{name:locale==='ru'?'Далее':'Next',exact:true}).click()
 }
 const finish=page.getByRole('button',{name:guest?guestFinishLabel(locale):locale==='ru'?'Сохранить результат и получить рекомендации':'Save results and get recommendations',exact:true})
 await expect(finish).toBeEnabled()
 await finish.click()
 if(guest){
  await expect(page.locator('[data-guest-scale-interpretation]')).toBeVisible({timeout:20000})
 }else{
 const report=page.locator('[data-personal-result-report]')
 await expect(report).toBeVisible({timeout:20000})
 await readEveryAccountScale(report,expect,d.scoring.dimensions.map(dimension=>dimension.key))
 await expect(report.locator('[data-assessment-methodology]')).toContainText(locale==='ru'?'Авторские вопросы Holistic House':'Original Holistic House self-reflection')
 const summary=report.locator('[data-personality-type-summary]')
 await expect(summary).toHaveCount(1)
 await expect(summary.locator(':scope > h3')).toHaveCount(1)
 await expect(summary).toBeVisible()
 await expect(summary).toContainText(d.key==='hh-socionics-32'
   ? locale==='ru'?'Однозначный социотип не определяется':'No single sociotype is supported'
   : locale==='ru'?'Несколько равных ведущих паттернов':'Several equally prominent patterns')
 await summary.scrollIntoViewIfNeeded()
 }
 // Passive evidence for the hosted WebKit RU Enneagram overflow. Capture before
 // the unchanged assertion; do not resize, scroll, hide content or retry it.
 if(!guest&&locale==='ru'&&d.key==='hh-enneagram-36'){
  try{
   const layout=await page.evaluate(collectReportOverflowDiagnostics)
   await writeFile(output+'/layout-account-hh-enneagram-36-ru.json',JSON.stringify({commit:process.env.GITHUB_SHA,scenario:{definitionKey:d.key,locale,mode,guest},...layout},null,2))
   console.log('TYPOLOGY_LAYOUT',JSON.stringify({viewport:layout.viewport,document:layout.document,body:layout.body,counts:layout.counts,escapingWithoutClippingAncestor:layout.escapingWithoutClippingAncestor.slice(0,6)}))
  }catch(error){console.log('TYPOLOGY_LAYOUT_DIAGNOSTIC_ERROR',error.message)}
 }
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1))
 await page.screenshot({path:output+'/'+(guest?'guest':'account')+'-'+d.key+'-'+locale+'.png',fullPage:false})
 if(!guest&&d.scoring.dimensions.length>6){
  const expected=buildAssessmentResultReport(scoreAssessment(d,Object.fromEntries(d.questions.map(question=>[question.id,3]))),locale)
  const layouts=await assertAccountScaleJumpLayout(page,expect,expected.sections,{screenshotPrefix:output+'/picker-'+d.key+'-'+locale})
  await writeFile(output+'/picker-layout-'+d.key+'-'+locale+'.json',JSON.stringify({commit:process.env.GITHUB_SHA,definitionKey:d.key,locale,layouts},null,2))
  console.log('TYPOLOGY_PICKER_LAYOUT',JSON.stringify({definitionKey:d.key,locale,layouts}))
 }
}
let page
try{
 const account=await browser.newContext({viewport:{width:390,height:844}})
 page=await account.newPage()
 observePage(page,'account')
 await navigate(page,origin+'/en/app')
 await page.getByRole('button',{name:'Open my Cabinet with Google',exact:true}).click()
 await expect(page.getByRole('heading',{name:'Create my private space',exact:true}).or(page.locator('[data-profile-domains]')).first()).toBeVisible({timeout:60000})
 // Works with a fresh isolated DB or after the main regression journey.
 if(await page.getByRole('heading',{name:'Create my private space',exact:true}).isVisible()){
  await page.getByLabel('I am 18 or older.').check()
  await page.getByLabel('I agree to private processing',{exact:false}).check()
  await page.getByRole('button',{name:'Create my private space',exact:true}).click()
 }
 await assertCabinetPortrait(page, expect, { origin })
 await openCabinetMyTests(page, expect, { origin })
 for(const [i,base] of defs.entries()){
  const locale=i%2?'ru':'en',mode=i%2?'guided':'quick',d=localized(base.key,locale)
  const run=await api(account,'runs',{definitionKey:d.key,definitionVersion:'v1',instrumentLocale:d.instrumentLocale,operationId:randomUUID()})
  await navigate(page,origin+'/'+locale+'/app/runs/'+run.id+'?mode='+mode)
  await assertQuestionnaireMode(page,expect,{mode,guest:false,definition:d})
  await fill(page,d,mode,false,locale)
  const data=await api(account,'bootstrap'),result=data.results.find(r=>r.runId===run.id)
  assert.ok(result);assert.equal(result.contentHash,d.contentHash)
  assert.deepEqual(result.dimensions.map(x=>x.value),Array(d.scoring.dimensions.length).fill(d.key==='hh-disc-style-20'?15:12))
  await assertAccountScaleReport(page,expect,result,locale)
  await page.waitForLoadState('networkidle')
  await page.reload()
  await expect(page.locator('[data-personal-result-report]')).toBeVisible()
  passed(d.key+' account '+locale+' '+mode+': save, original items, score, report and reload')
 }
 const d=defs[0]
 let repeat=await api(account,'runs',{definitionKey:d.key,definitionVersion:'v1',instrumentLocale:'en',operationId:randomUUID()})
 repeat=await api(account,'runs/'+repeat.id+'/save',{answers:Object.fromEntries(d.questions.map(q=>[q.id,3])),context:{},progress:32,expectedRevision:repeat.revision,operationId:randomUUID()})
 await api(account,'runs/'+repeat.id+'/submit',{expectedRevision:repeat.revision})
 const snapshot=await api(account,'bootstrap')
 assert.ok(snapshot.results.filter(r=>r.definitionKey===d.key).length>=2)
 const historyReads=[]
 const collectHistoryRead=request=>{if(request.url().endsWith('/api/app/shared-materials')&&request.method()==='GET')historyReads.push(request)}
 page.on('request',collectHistoryRead)
 const historyMaterials=page.waitForResponse(response=>response.url().endsWith('/api/app/shared-materials')&&response.request().method()==='GET')
 await navigate(page,origin+'/en/app/history')
 await expect(page.getByRole('heading',{name:d.title,exact:true}).first()).toBeVisible({timeout:20000})
 // History renders from bootstrap before the materials panel's passive effect
 // starts. Complete its real read (including StrictMode's second request)
 // before leaving this document; a visible result heading is not readiness.
 const materialsResponse=await historyMaterials
 assert.ok(materialsResponse.ok())
 assert.ok(Array.isArray((await materialsResponse.json()).materials))
 await materialsResponse.finished()
 // networkidle can already have fired before these passive-effect reads.
 // Join every request that actually started, including StrictMode's replay.
 await Promise.all(historyReads.map(async request=>{
  const response=await request.response()
  assert.ok(response?.ok())
  assert.ok(Array.isArray((await response.json()).materials))
  await response.finished()
 }))
 page.off('request',collectHistoryRead)
 console.log('TYPOLOGY_HISTORY_MATERIALS_READY',historyReads.length)
 for(const locale of ['en','ru']){
  await navigate(page,origin+'/'+locale+'/app/portfolio')
  for(const entry of PERSONALITY_TYPE_CATALOG)await expect(page.locator('.hh-insights-test-card').filter({hasText:entry.title[locale]}).first()).toBeVisible({timeout:20000})
  await page.screenshot({path:output+'/insights-'+locale+'.png',fullPage:false})
 }
 passed('all four original instruments appear in bilingual Insights; compatible repeat appears in history')
 // The existing client-only PDF pipeline includes the same bilingual interpretation model.
 for(const locale of ['en','ru']){
  await navigate(page,origin+'/'+locale+'/app')
  await assertCabinetPortrait(page, expect, { origin, locale })
  await openCabinetMyTests(page, expect, { origin, locale })
  const download=page.waitForEvent('download',{timeout:60000})
  await page.getByRole('button',{name:locale==='ru'?'Скачать отчёт':'Download report',exact:true}).click()
  const file=await download,bytes=await readFile(await file.path())
  assert.equal(bytes.subarray(0,8).toString(),'%PDF-1.4');assert.ok(bytes.length>12000)
  await file.saveAs(output+'/report-'+locale+'.pdf')
  passed(locale+' PDF download includes persisted original typology report model')
 }
 // One consented guest completes four instruments, retaining the same private
 // cookie while changing UI language and runner mode. Creating a new guest for
 // every instrument exhausts the unchanged 12/IP/hour limit after earlier suites.
 const guest=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'})
 await api(guest,'guest/session',{adult:true,necessary:true,uiLocale:'ru',timezone:'UTC'})
 pacedGuestContext=guest
 guest.on('request',request=>{
  const url=new URL(request.url())
  if(url.origin===origin&&url.pathname.startsWith('/api/app/guest/'))guestPacer.record(url.pathname,request.method())
 })
 guest.on('response',response=>{
  const url=new URL(response.url())
  if(url.origin===origin&&url.pathname.startsWith('/api/app/guest/')&&response.status()===429)
   console.log('TYPOLOGY_GUEST_RATE_LIMIT',JSON.stringify({endpoint:url.pathname.replace(/\/[0-9a-f]{8}-[0-9a-f-]{27,}(?=\/|$)/gi,'/:id'),status:response.status()}))
 })
 for(const [i,base] of defs.entries()){
  const locale=i%2?'en':'ru',mode=i%2?'quick':'guided',d=localized(base.key,locale)
  // Same guest, unchanged quotas: let the prior request window expire naturally.
  await guestPacer.beforeScenario(d.key)
  const plan=await api(guest,'guest/test-plans',{items:[{definitionKey:d.key,definitionVersion:'v1',instrumentLocale:d.instrumentLocale}],operationId:randomUUID()})
  page=await guest.newPage();observePage(page,'guest-'+locale+'-'+mode)
  await navigate(page,origin+'/'+locale+'/client?plan='+plan.id)
  await enterGuestQuestionnaireMode(page,expect,{mode,definition:d})
  await fill(page,d,mode,true,locale)
  const data=await api(guest,'guest/bootstrap'),result=data.results.find(r=>r.definitionKey===d.key)
  assert.deepEqual(result.dimensions.map(x=>x.value),Array(d.scoring.dimensions.length).fill(d.key==='hh-disc-style-20'?15:12))
  assert.equal(result.instrumentLocale,locale);assert.equal(result.contentHash,d.contentHash)
  await assertGuestScaleResult(page,expect,result,locale)
  passed(d.key+' guest '+locale+' '+mode+': private consented runner, exact scales and item-scoped optional analysis')
  await page.waitForLoadState('networkidle')
  await page.close()
  guestPacer.settled()
 }
 const guestResults=(await api(guest,'guest/bootstrap')).results
 assert.deepEqual(guestResults.map(result=>result.definitionKey).sort(),defs.map(d=>d.key).sort())
 await guest.close()
 assert.deepEqual(errors,[])
 await writeFile(output+'/verification.json',JSON.stringify({commit:process.env.GITHUB_SHA,browser:await browser.version(),checks,guestSessions:1,guestResults:guestResults.length,auth:'ISOLATED_PROVIDER_PROTOCOL_DOUBLE_NOT_GOOGLE',production:'UNCHANGED'},null,2))
} catch(error){
 await page?.screenshot({path:output+'/failure.png',fullPage:false}).catch(()=>{})
 await writeFile(output+'/verification.json',JSON.stringify({commit:process.env.GITHUB_SHA,checks,failure:error.message},null,2));throw error
} finally{await browser.close()}
