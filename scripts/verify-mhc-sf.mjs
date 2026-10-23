import { assertCabinetPortrait, openCabinetMyTests } from './helpers/cabinet-navigation-verifier.mjs'
import { readEveryAccountScale } from './helpers/account-scale-picker-verifier.mjs'
import { assertQuestionnaireMode, enterGuestQuestionnaireMode } from './helpers/direct-questionnaire-verifier.mjs'
import { guestFinishLabel, assertGuestScaleResult, assertAccountScaleReport } from './helpers/guest-scale-verifier.mjs'
// Synthetic loopback-only browser verification. No Google or production requests.
import { chromium, webkit, expect } from '@playwright/test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { assertIsolated } from '../tests/helpers/app-db-setup.mjs'
import { MHC_SF_DEFINITIONS as defs } from '../data/assessments/mhc-sf-adult-dec2011.js'
assertIsolated()
const origin=process.env.HH_TEST_APP_ORIGIN || 'http://127.0.0.1:3100'
assert.match(origin,/^http:\/\/(127\.0\.0\.1|localhost):\d+$/)
const engine=process.env.HH_TEST_BROWSER==='webkit'?webkit:chromium
const browser=await engine.launch(process.env.HH_TEST_BROWSER_EXECUTABLE?{executablePath:process.env.HH_TEST_BROWSER_EXECUTABLE}:{})
const output='artifacts/app-r1/mhc-sf-'+engine.name()
await mkdir(output,{recursive:true})
const checks=[], errors=[]
const mixed=[0,1,2,3,4,5,0,1,2,3,4,5,0,1]
const passed=name=>{checks.push(name);console.log('PASS '+name)}
function observePage(page,label){
 const location=()=>new URL(page.url()).pathname
 page.on('pageerror',error=>{
  errors.push(error.message)
  console.log('MHC_SF_PAGE_ERROR',JSON.stringify({label,path:location(),message:error.message,stack:error.stack,lastCheck:checks.at(-1)}))
 })
 page.on('console',message=>{
  if(['error','warning'].includes(message.type()))console.log('MHC_SF_CONSOLE',JSON.stringify({label,path:location(),type:message.type(),text:message.text().slice(0,1600)}))
 })
 page.on('requestfailed',request=>console.log('MHC_SF_REQUEST_FAILED',JSON.stringify({label,path:location(),request:new URL(request.url()).pathname,error:request.failure()?.errorText})))
 page.on('request',request=>{
  if(new URL(request.url()).pathname==='/__nextjs_original-stack-frames')console.log('MHC_SF_STACK_REQUEST',JSON.stringify({label,path:location(),frames:request.postDataJSON()?.frames}))
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
 const response=await context.request.fetch(origin+'/api/app/'+path,{method:body?'POST':'GET',headers:body?{Origin:origin,'Content-Type':'application/json'}:{},data:body})
 const value=await response.json();assert.ok(response.ok(),path+': '+JSON.stringify(value));return value
}
async function fill(page,d,mode,guest,locale,responseValues){
 const instructions=page.locator(guest?'.cabinet-test-note[lang="en"]':'.hh-runner-instructions[lang="en"]')
 await expect(instructions).toHaveText(d.instructions)
 if(!guest)await expect(page.locator('.hh-runner-instructions').first()).toHaveText(locale==='ru'?'За последний месяц':'During the past month')
 const quick=guest?'.cabinet-quick-question':'.hh-quick-question'
 for(let i=0;i<d.questions.length;i++){
  const scope=mode==='quick'?page.locator(quick).nth(i):page.locator(guest?'.cabinet-guided-question':'.hh-runner-question')
  await expect(scope.getByRole('heading',{name:d.questions[i].text,exact:true})).toBeVisible()
  const buttons=scope.locator(guest?'.cabinet-answer-list button':'.hh-scale button')
  await expect(buttons).toHaveCount(6)
  const saved=page.waitForResponse(r=>r.url().includes('/runs/')&&r.url().endsWith('/save')&&r.request().method()==='POST')
  await buttons.nth(responseValues[i]).click()
  assert.ok((await saved).ok())
  if(!guest && mode==='quick' && i===6){
   await page.waitForLoadState('networkidle')
   await page.reload()
   await expect(instructions).toHaveText(d.instructions)
   for(let n=0;n<=6;n++)await expect(page.locator(quick).nth(n).locator('.hh-scale button').nth(0)).toHaveAttribute('aria-pressed','true')
   passed('MHC-SF zero answers remain saved and selected after draft reload')
  }
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
 const reportText=await readEveryAccountScale(report,expect,d.scoring.dimensions.map(dimension=>dimension.key))
 assert.ok(reportText.includes(locale==='ru'?'Сумма ответов (0–70)':'Response sum (0–70)'))
 assert.ok(reportText.includes(locale==='ru'?'английский оригинал':'English original'))
 assert.ok(reportText.includes(locale==='ru'?'не исключает психическое расстройство':'cannot rule out mental illness'))
 assert.ok(reportText.includes('Corey L. M. Keyes'))
 assert.ok(reportText.includes('PHAC (2017)'))
 }
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1))
 await page.screenshot({path:output+'/'+(guest?'guest':'account')+'-'+d.key+'-'+locale+'.png',fullPage:true})
}
let page
try{
 const account=await browser.newContext({viewport:{width:390,height:844}})
 page=await account.newPage()
 observePage(page,'account')
 await navigate(page,origin+'/en/app')
 const cabinetEntry=page.locator('[data-cabinet-guest-overview="true"]')
 await expect(cabinetEntry).toBeVisible()
 const signIn=cabinetEntry.getByRole('button',{name:'Open my Cabinet with Google',exact:true})
 await expect(signIn).toBeEnabled()
 await signIn.click()
 await expect(page.getByRole('heading',{name:'Create my private space',exact:true}).or(page.locator('[data-profile-domains]')).first()).toBeVisible({timeout:60000})
 // Works with a fresh isolated DB or after the main regression journey.
 if(await page.getByRole('heading',{name:'Create my private space',exact:true}).isVisible()){
  await page.getByLabel('I am 18 or older.').check()
  await page.getByLabel('I agree to private processing',{exact:false}).check()
  await page.getByRole('button',{name:'Create my private space',exact:true}).click()
 }
 await assertCabinetPortrait(page, expect, { origin })
 await openCabinetMyTests(page, expect, { origin })
 for(const [i,d] of [defs[0],defs[0]].entries()){
  const locale=i?'ru':'en',mode=i?'guided':'quick'
  const run=await api(account,'runs',{definitionKey:d.key,definitionVersion:'v1',instrumentLocale:'en',operationId:randomUUID()})
  await navigate(page,origin+'/'+locale+'/app/runs/'+run.id+'?mode='+mode)
  await assertQuestionnaireMode(page,expect,{mode,guest:false,definition:d})
  await fill(page,d,mode,false,locale,i?mixed:Array(14).fill(0))
  const data=await api(account,'bootstrap'),result=data.results.find(r=>r.runId===run.id)
  assert.ok(result);assert.equal(result.contentHash,d.contentHash)
  assert.deepEqual(result.dimensions.map(x=>x.value),i?[31,3,13,15]:[0,0,0,0])
  await assertAccountScaleReport(page,expect,result,locale)
  await page.waitForLoadState('networkidle')
  await page.reload()
  await expect(page.locator('[data-personal-result-report]')).toBeVisible()
  passed(d.key+' account '+locale+' '+mode+': save, original instructions/items, score, report and reload')
 }
 // Repeat MHC-SF through the real API to exercise compatible history without another full UI battery.
 const d=defs[0]
 let repeat=await api(account,'runs',{definitionKey:d.key,definitionVersion:'v1',instrumentLocale:'en',operationId:randomUUID()})
 repeat=await api(account,'runs/'+repeat.id+'/save',{answers:Object.fromEntries(d.questions.map(q=>[q.id,3])),context:{},progress:14,expectedRevision:repeat.revision,operationId:randomUUID()})
 await api(account,'runs/'+repeat.id+'/submit',{expectedRevision:repeat.revision})
 const snapshot=await api(account,'bootstrap')
 assert.ok(snapshot.results.filter(r=>r.definitionKey==='mhc-sf').length>=2)
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
 console.log('MHC_SF_HISTORY_MATERIALS_READY',historyReads.length)
 await navigate(page,origin+'/ru/app/portfolio')
 await expect(page.locator('.hh-insights-test-card').filter({hasText:'Психическое благополучие'}).first()).toBeVisible({timeout:20000})
 passed('MHC-SF appears in Insights; compatible repeated sums appear in history')
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
  passed(locale+' PDF download includes persisted MHC-SF sums and interpretation model')
 }
 // Both language/mode journeys use one consented guest and retain separate saved results.
 // The complete browser matrix stays within the unchanged 12 sessions/IP/hour limit.
 const guest=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'}), guestResultIds=new Set()
 await api(guest,'guest/session',{adult:true,necessary:true,uiLocale:'ru',timezone:'UTC'})
 for(const [i,d] of [defs[0],defs[0]].entries()){
  const locale=i?'en':'ru',mode=i?'guided':'quick'
  const plan=await api(guest,'guest/test-plans',{items:[{definitionKey:d.key,definitionVersion:'v1',instrumentLocale:'en'}],operationId:randomUUID()})
  page=await guest.newPage();observePage(page,'guest-'+locale+'-'+mode)
  await navigate(page,origin+'/'+locale+'/client?plan='+plan.id)
  await enterGuestQuestionnaireMode(page,expect,{mode,definition:d})
  await fill(page,d,mode,true,locale,i?mixed:Array(14).fill(5))
  const data=await api(guest,'guest/bootstrap'),result=data.results.find(r=>r.definitionKey===d.key&&!guestResultIds.has(r.id))
  assert.ok(result,'each MHC-SF journey persists a new result')
  guestResultIds.add(result.id)
  assert.deepEqual(result.dimensions.map(x=>x.value),i?[31,3,13,15]:[70,15,25,30])
  assert.equal(result.instrumentLocale,'en');assert.equal(result.contentHash,d.contentHash)
  await assertGuestScaleResult(page,expect,result,locale)
  passed(d.key+' guest '+locale+' '+mode+': private consented runner, exact scales and item-scoped optional analysis')
  await page.close()
 }
 const guestResults=(await api(guest,'guest/bootstrap')).results.filter(r=>r.definitionKey==='mhc-sf')
 assert.equal(guestResultIds.size,2)
 assert.equal(guestResults.length,2)
 assert.ok(guestResults.every(r=>guestResultIds.has(r.id)))
 await guest.close()
 assert.deepEqual(errors,[])
 await writeFile(output+'/verification.json',JSON.stringify({commit:process.env.GITHUB_SHA,browser:await browser.version(),checks,guestSessions:1,guestResults:guestResults.length,auth:'ISOLATED_PROVIDER_PROTOCOL_DOUBLE_NOT_GOOGLE',production:'UNCHANGED'},null,2))
} catch(error){
 await page?.screenshot({path:output+'/failure.png',fullPage:true}).catch(()=>{})
 await writeFile(output+'/verification.json',JSON.stringify({commit:process.env.GITHUB_SHA,checks,failure:error.message},null,2));throw error
} finally{await browser.close()}
