import { observeReload } from './helpers/reload-diagnostics.mjs'
import { advanceSavedGuidedQuestion } from './helpers/guided-progress-verifier.mjs'
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
import { COMPASSION_DEFINITIONS as defs } from '../data/assessments/compassion-2026.js'
assertIsolated()
const origin=process.env.HH_TEST_APP_ORIGIN || 'http://127.0.0.1:3100'
assert.match(origin,/^http:\/\/(127\.0\.0\.1|localhost):\d+$/)
const engine=process.env.HH_TEST_BROWSER==='webkit'?webkit:chromium
const browser=await engine.launch(process.env.HH_TEST_BROWSER_EXECUTABLE?{executablePath:process.env.HH_TEST_BROWSER_EXECUTABLE}:{})
const output='artifacts/app-r1/compassion-'+engine.name()
await mkdir(output,{recursive:true})
const checks=[], errors=[]
const passed=name=>{checks.push(name);console.log('PASS '+name)}
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
async function fill(page,d,mode,guest,locale){
 const instructions=page.locator(guest?'.cabinet-test-note[lang="en"]':'.hh-runner-instructions[lang="en"]')
 await expect(instructions).toHaveText(d.instructions)
 const quick=guest?'.cabinet-quick-question':'.hh-quick-question'
 for(let i=0;i<d.questions.length;i++){
  const scope=mode==='quick'?page.locator(quick).nth(i):page.locator(guest?'.cabinet-guided-question':'.hh-runner-question')
  await expect(scope.getByRole('heading',{name:d.questions[i].text,exact:true})).toBeVisible()
  const buttons=scope.locator(guest?'.cabinet-answer-list button':'.hh-scale button')
  await expect(buttons).toHaveCount(5)
  const saved=page.waitForResponse(r=>r.url().includes('/runs/')&&r.url().endsWith('/save')&&r.request().method()==='POST')
  await buttons.nth(2).click()
  assert.ok((await saved).ok())
  if(mode==='guided'&&i<d.questions.length-1)await advanceSavedGuidedQuestion(page,expect,{locale,progress:i+1,guest})
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
 assert.ok(reportText.includes(locale==='ru'?'Среднее ответов (1–5)':'Response mean (1–5)'))
 assert.ok(reportText.includes(locale==='ru'?'английский оригинал':'English original'))
 if(d.key==='scs-sf')assert.ok(reportText.includes(locale==='ru'?'ненадёжности':'unreliable'))
 else assert.ok(reportText.includes(locale==='ru'?'МЕНЬШЕ безразличия':'LESS indifference'))
 }
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1))
 await page.screenshot({path:output+'/'+(guest?'guest':'account')+'-'+d.key+'-'+locale+'.png',fullPage:true})
}
let page
try{
 const account=await browser.newContext({viewport:{width:390,height:844}})
 page=await account.newPage()
 page.on('pageerror',e=>errors.push(e.message))
 await navigate(page,origin+'/en/app')
 await page.getByRole('button',{name:'Continue with Google',exact:true}).click()
 await expect(page.getByRole('heading',{name:'Create my private space',exact:true}).or(page.locator('[data-profile-domains]')).first()).toBeVisible({timeout:60000})
 // Works with a fresh isolated DB or after the main regression journey.
 if(await page.getByRole('heading',{name:'Create my private space',exact:true}).isVisible()){
  await page.getByLabel('I am 18 or older.').check()
  await page.getByLabel('I agree to private processing',{exact:false}).check()
  await page.getByRole('button',{name:'Create my private space',exact:true}).click()
 }
 await assertCabinetPortrait(page, expect, { origin })
 await openCabinetMyTests(page, expect, { origin })
 for(const [i,d] of defs.entries()){
  const locale=i?'ru':'en',mode=i?'guided':'quick'
  const run=await api(account,'runs',{definitionKey:d.key,definitionVersion:'v1',instrumentLocale:'en',operationId:randomUUID()})
  await navigate(page,origin+'/'+locale+'/app/runs/'+run.id+'?mode='+mode)
  await assertQuestionnaireMode(page,expect,{mode,guest:false,definition:d})
  await fill(page,d,mode,false,locale)
  const data=await api(account,'bootstrap'),result=data.results.find(r=>r.runId===run.id)
  assert.ok(result);assert.equal(result.contentHash,d.contentHash)
  assert.deepEqual(result.dimensions.map(x=>x.value),Array(i?5:1).fill(3))
  await assertAccountScaleReport(page,expect,result,locale)
  await page.waitForLoadState('networkidle')
  const reloadDiagnostics = observeReload(page, { origin })
  try {
    await page.reload()
    await expect(page.locator('[data-personal-result-report]')).toBeVisible()
  } finally {
    const evidence = reloadDiagnostics.stop()
    await writeFile(output + '/reload-' + i + '.json', JSON.stringify(evidence, null, 2)).catch(() => {})
  }
  passed(d.key+' account '+locale+' '+mode+': save, original instructions/items, score, report and reload')
 }
 // Repeat SCS-SF through the real API to exercise compatible history without another full UI battery.
 const d=defs[0]
 let repeat=await api(account,'runs',{definitionKey:d.key,definitionVersion:'v1',instrumentLocale:'en',operationId:randomUUID()})
 repeat=await api(account,'runs/'+repeat.id+'/save',{answers:Object.fromEntries(d.questions.map(q=>[q.id,3])),context:{},progress:12,expectedRevision:repeat.revision,operationId:randomUUID()})
 await api(account,'runs/'+repeat.id+'/submit',{expectedRevision:repeat.revision})
 const snapshot=await api(account,'bootstrap')
 assert.ok(snapshot.results.filter(r=>r.definitionKey==='scs-sf').length>=2)
 await navigate(page,origin+'/en/app/history')
 await expect(page.getByRole('heading',{name:d.title,exact:true}).first()).toBeVisible({timeout:20000})
 await navigate(page,origin+'/ru/app/portfolio')
 for(const def of defs)await expect(page.locator('.hh-insights-test-card').filter({hasText:def.key==='scs-sf'?'Самосострадание':'Сострадание к другим'}).first()).toBeVisible({timeout:20000})
 passed('both instruments appear in Insights; compatible repeated SCS-SF appears in history')
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
  passed(locale+' PDF download includes persisted compassion assessment report model')
 }
 for(const [i,d] of defs.entries()){
  const locale=i?'en':'ru',mode=i?'guided':'quick',guest=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'})
  await api(guest,'guest/session',{adult:true,necessary:true,uiLocale:locale,timezone:'UTC'})
  const plan=await api(guest,'guest/test-plans',{items:[{definitionKey:d.key,definitionVersion:'v1',instrumentLocale:'en'}],operationId:randomUUID()})
  page=await guest.newPage();page.on('pageerror',e=>errors.push(e.message))
  await navigate(page,origin+'/'+locale+'/client?plan='+plan.id)
  await enterGuestQuestionnaireMode(page,expect,{mode,definition:d})
  await fill(page,d,mode,true,locale)
  const data=await api(guest,'guest/bootstrap'),result=data.results.find(r=>r.definitionKey===d.key)
  assert.deepEqual(result.dimensions.map(x=>x.value),Array(i?5:1).fill(3))
  assert.equal(result.instrumentLocale,'en');assert.equal(result.contentHash,d.contentHash)
  await assertGuestScaleResult(page,expect,result,locale)
  passed(d.key+' guest '+locale+' '+mode+': private consented runner, exact scales and item-scoped optional analysis')
  await guest.close()
 }
 assert.deepEqual(errors,[])
 await writeFile(output+'/verification.json',JSON.stringify({commit:process.env.GITHUB_SHA,browser:await browser.version(),checks,auth:'ISOLATED_PROVIDER_PROTOCOL_DOUBLE_NOT_GOOGLE',production:'UNCHANGED'},null,2))
} catch(error){
 await page?.screenshot({path:output+'/failure.png',fullPage:true}).catch(()=>{})
 await writeFile(output+'/verification.json',JSON.stringify({commit:process.env.GITHUB_SHA,checks,failure:error.message},null,2));throw error
} finally{await browser.close()}
