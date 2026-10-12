// Synthetic loopback-only browser verification. No Google or production requests.
import { chromium, webkit, expect } from '@playwright/test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { assertIsolated } from '../tests/helpers/app-db-setup.mjs'
import { BFAS_100_DEFINITIONS } from '../data/assessments/bfas-100-en-v1.js'
const d=BFAS_100_DEFINITIONS[0]
const defs=[d,d]
// Independent author numeric reverse key, shared across the ten nonoverlapping aspects.
const reverse=[1,21,41,71,16,36,56,76,2,32,52,62,82,17,37,67,77,87,97,13,23,33,53,83,93,8,48,68,78,14,24,34,54,64,29,49,79,99,15,45,55,85,50,60,80,90]
const high=Array.from({length:100},(_,i)=>reverse.includes(i+1)?1:5),low=high.map(v=>6-v)
assertIsolated()
const origin=process.env.HH_TEST_APP_ORIGIN || 'http://127.0.0.1:3100'
assert.match(origin,/^http:\/\/(127\.0\.0\.1|localhost):\d+$/)
const engine=process.env.HH_TEST_BROWSER==='webkit'?webkit:chromium
const browser=await engine.launch(process.env.HH_TEST_BROWSER_EXECUTABLE?{executablePath:process.env.HH_TEST_BROWSER_EXECUTABLE}:{})
const output='artifacts/app-r1/bfas100-'+engine.name()
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
async function fill(page,d,mode,guest,locale,values){
 const instructions=page.locator(guest?'.cabinet-test-note[lang="en"]':'.hh-runner-instructions[lang="en"]')
 await expect(instructions).toHaveText(d.instructions)
 const quick=guest?'.cabinet-quick-question':'.hh-quick-question'
 for(let i=0;i<d.questions.length;i++){
  // Guided mode saves both an answer and progress. Pace the synthetic clicks
  // below the unchanged account limit of 180 requests per minute.
  await page.waitForTimeout(750)
  const scope=mode==='quick'?page.locator(quick).nth(i):page.locator(guest?'.cabinet-guided-question':'.hh-runner-question')
  await expect(scope.getByRole('heading',{name:d.questions[i].text,exact:true})).toBeVisible()
  const buttons=scope.locator(guest?'.cabinet-answer-list button':'.hh-scale button')
  await expect(buttons).toHaveCount(5)
  if(i===0){
   await expect(buttons.nth(0)).toContainText('Strongly Disagree')
   await expect(buttons.nth(1).locator('span')).toHaveText('2')
   await expect(buttons.nth(2)).toContainText('Neither Agree Nor Disagree')
   await expect(buttons.nth(3).locator('span')).toHaveText('4')
   await expect(buttons.nth(4)).toContainText('Strongly Agree')
  }
  if(i===99)await expect(page.getByRole('button',{name:locale==='ru'?'Сохранить результат и получить рекомендации':'Save results and get recommendations',exact:true})).toHaveCount(0)
  const saved=page.waitForResponse(r=>r.url().includes('/runs/')&&r.url().endsWith('/save')&&r.request().method()==='POST')
  await buttons.nth(values[i]-1).click()
  assert.ok((await saved).ok())
  if(mode==='quick'&&!guest&&i===49){
   await page.waitForLoadState('networkidle');await page.reload();await page.waitForLoadState('networkidle')
   await expect(page.locator(quick).nth(49).locator('.hh-scale button').nth(values[49]-1)).toHaveAttribute('aria-pressed','true')
   passed('BFAS 50-answer account draft survives reload with original item positions')
  }
  if(mode==='guided'&&i<d.questions.length-1){
   const moved=page.waitForResponse(r=>r.url().includes('/runs/')&&r.url().endsWith('/save')&&r.request().method()==='POST')
   await page.getByRole('button',{name:locale==='ru'?'Далее':'Next',exact:true}).click()
   assert.ok((await moved).ok())
  }
 }
 const finish=page.getByRole('button',{name:locale==='ru'?'Сохранить результат и получить рекомендации':'Save results and get recommendations',exact:true})
 await expect(finish).toBeEnabled()
 await finish.click()
 const report=page.locator('[data-personal-result-report]')
 await expect(report).toBeVisible({timeout:20000})
 await expect(report.locator('article')).toHaveCount(15)
 await expect(report.locator('[data-assessment-gauge="neutral"]')).toHaveCount(15)
 for(const detail of await report.locator('details').all())await detail.locator('summary').click()
 await expect(report).toContainText(locale==='ru'?'Среднее ответов (1–5)':'Response mean (1–5)')
 await expect(report).toContainText(locale==='ru'?'английский оригинал':'English original')
 await expect(report).toContainText(locale==='ru'?'не лучший результат':'not a better result')
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
 await expect(page.getByRole('heading',{name:'Create my private space',exact:true}).or(page.locator('[data-my-tests-dashboard]')).first()).toBeVisible({timeout:60000})
 // Works with a fresh isolated DB or after the main regression journey.
 if(await page.getByRole('heading',{name:'Create my private space',exact:true}).isVisible()){
  await page.getByLabel('I am 18 or older.').check()
  await page.getByLabel('I agree to private processing',{exact:false}).check()
  await page.getByRole('button',{name:'Create my private space',exact:true}).click()
 }
 await expect(page.locator('[data-my-tests-dashboard]')).toBeVisible({timeout:30000})
 for(const [i,d] of defs.entries()){
  const locale=i?'ru':'en',mode=i?'guided':'quick'
  const run=await api(account,'runs',{definitionKey:d.key,definitionVersion:'v1',instrumentLocale:'en',operationId:randomUUID()})
  await navigate(page,origin+'/'+locale+'/app/runs/'+run.id+'?mode='+mode)
  if(mode==='guided')await page.locator('.hh-test-mode-grid button').nth(1).click()
  await fill(page,d,mode,false,locale,i?high:Array(100).fill(3))
  const data=await api(account,'bootstrap'),result=data.results.find(r=>r.runId===run.id)
  assert.ok(result);assert.equal(result.contentHash,d.contentHash)
  assert.deepEqual(result.dimensions.map(x=>x.value),Array(15).fill(i?5:3))
  await page.waitForLoadState('networkidle')
  await page.reload()
  await expect(page.locator('[data-personal-result-report]')).toBeVisible()
  passed(d.key+' account '+locale+' '+mode+': save, original instructions/items, score, report and reload')
 }
 // Both account runs are the same exact form and remain compatible in history.
 const snapshot=await api(account,'bootstrap')
 assert.ok(snapshot.results.filter(r=>r.definitionKey==='bfas-100').length>=2)
 await navigate(page,origin+'/en/app/history')
 await expect(page.getByRole('heading',{name:d.title,exact:true}).first()).toBeVisible({timeout:20000})
 await navigate(page,origin+'/ru/app/portfolio')
 await expect(page.locator('.hh-insights-test-card').filter({hasText:'BFAS-100'})).toHaveCount(1,{timeout:20000})
 passed('full BFAS appears once as an instrument in Insights and compatible history retains both attempts')
 // The existing client-only PDF pipeline includes the same bilingual interpretation model.
 for(const locale of ['en','ru']){
  await navigate(page,origin+'/'+locale+'/app')
  const download=page.waitForEvent('download',{timeout:60000})
  await page.getByRole('button',{name:locale==='ru'?'Скачать отчёт':'Download report',exact:true}).click()
  const file=await download,bytes=await readFile(await file.path())
  assert.equal(bytes.subarray(0,8).toString(),'%PDF-1.4');assert.ok(bytes.length>12000)
  await file.saveAs(output+'/report-'+locale+'.pdf')
  passed(locale+' PDF download includes persisted full BFAS report model')
 }
 for(const [i,d] of defs.entries()){
  const locale=i?'en':'ru',mode=i?'guided':'quick',guest=await browser.newContext({viewport:{width:390,height:844}})
  await api(guest,'guest/session',{adult:true,necessary:true,uiLocale:locale,timezone:'UTC'})
  const plan=await api(guest,'guest/test-plans',{items:[{definitionKey:d.key,definitionVersion:'v1',instrumentLocale:'en'}],operationId:randomUUID()})
  page=await guest.newPage();page.on('pageerror',e=>errors.push(e.message))
  await navigate(page,origin+'/'+locale+'/client?plan='+plan.id)
  const modeButton=page.locator('.hh-test-mode-grid button').nth(mode==='quick'?0:1)
  await expect(modeButton).toBeVisible({timeout:20000});await modeButton.click()
  await fill(page,d,mode,true,locale,i?Array(100).fill(1):low)
  const data=await api(guest,'guest/bootstrap'),result=data.results.find(r=>r.definitionKey===d.key)
  assert.deepEqual(result.dimensions.map(x=>x.value),i?[2.6,3.2,3,2.8,2.6,2.6,2.6,3,3.4,3.4,2.6,3,2.6,2.6,2.6]:Array(15).fill(1))
  assert.equal(result.instrumentLocale,'en');assert.equal(result.contentHash,d.contentHash)
  passed(d.key+' guest '+locale+' '+mode+': private consented runner and complete report')
  await guest.close()
 }
 assert.deepEqual(errors,[])
 await writeFile(output+'/verification.json',JSON.stringify({commit:process.env.GITHUB_SHA,browser:await browser.version(),checks,auth:'ISOLATED_PROVIDER_PROTOCOL_DOUBLE_NOT_GOOGLE',production:'UNCHANGED'},null,2))
} catch(error){
 await page?.screenshot({path:output+'/failure.png',fullPage:true}).catch(()=>{})
 await writeFile(output+'/verification.json',JSON.stringify({commit:process.env.GITHUB_SHA,checks,failure:error.message},null,2));throw error
} finally{await browser.close()}
