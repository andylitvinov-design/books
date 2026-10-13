// All credentials and records belong to the loopback-only synthetic CI double.
import { chromium, webkit, expect } from '@playwright/test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { assertIsolated } from '../tests/helpers/app-db-setup.mjs'
import { getAssessmentDefinition } from '../lib/assessments/definitions.js'
assertIsolated()
const origin = process.env.HH_TEST_APP_ORIGIN || 'http://127.0.0.1:3100'
assert.match(origin, /^http:\/\/(127\.0\.0\.1|localhost):\d+$/)
const engine = process.env.HH_TEST_BROWSER === 'webkit' ? webkit : chromium
const browser = await engine.launch(process.env.HH_TEST_BROWSER_EXECUTABLE ? {executablePath: process.env.HH_TEST_BROWSER_EXECUTABLE} : {})
const output = 'artifacts/app-r1/result-explanations-' + engine.name()
await mkdir(output, {recursive: true})
const checks = [], errors = [], requests = []
const passed = name => {checks.push(name); console.log('PASS ' + name)}
// A cached report appears before its authorised refresh completes. Await the
// exact refresh body instead of navigating away or suppressing WebKit errors.
async function resultNavigation(page, path, action) {
  const id = new URL(path, origin).pathname.split('/').at(-1)
  const refreshed = page.waitForResponse(r => new URL(r.url()).pathname === '/api/app/results/' + id && r.request().method() === 'GET')
  await action()
  const response = await refreshed
  assert.ok(response.ok(), 'result refresh ' + response.status())
  assert.equal(await response.finished(), null)
  assert.equal((await response.json()).id, id)
  await expect(page.locator('[data-personal-result-report]')).toBeVisible({timeout:30000})
  await page.waitForLoadState('networkidle')
}
async function navigate(page, path) {
  await page.waitForLoadState('networkidle')
  if (/^\/(en|ru)\/app\/results\//.test(path)) await resultNavigation(page, path, () => page.goto(origin + path))
  else { await page.goto(origin + path); await page.waitForLoadState('networkidle') }
}
async function assertCompact(page, locale) {
  const report = page.locator('[data-personal-result-report]')
  await expect(report).toBeVisible()
  assert.deepEqual(await report.locator(':scope > [data-report-block]').evaluateAll(nodes => nodes.map(n => n.dataset.reportBlock)), ['1','2','3','4','5'])
  for (const n of [1,2,3,4,5]) await expect(report.locator('[data-report-block="'+n+'"]')).toBeVisible()
  await expect(report.locator('[data-support-recommendation]')).toHaveCount(1)
  await expect(report.locator('[data-report-block="5"] h3')).toContainText(locale==='ru'?'Об этом тесте':'About this test')
  await expect(report.locator('[data-report-course-banner]')).toBeVisible()
  assert.equal(await report.locator('[data-explanation-origin]').evaluate(n=>n.closest('[data-report-block]').dataset.reportBlock),'5')
  assert.doesNotMatch(await report.innerText(),/Two steps for this week|Origin & evidence|middle part of the scale/)
  return report
}
async function createResult(context,key,values) {
  const d=getAssessmentDefinition(key,'v1','en')
  let run=await api(context,'runs',{definitionKey:key,definitionVersion:'v1',instrumentLocale:'en',operationId:randomUUID()})
  run=await api(context,'runs/'+run.id+'/save',{answers:Object.fromEntries(d.questions.map((q,i)=>[q.id,values(i,q)])),context:{},progress:d.questions.length,expectedRevision:run.revision,operationId:randomUUID()})
  await api(context,'runs/'+run.id+'/submit',{expectedRevision:run.revision})
  return (await api(context,'bootstrap')).results.find(r=>r.runId===run.id)
}
async function api(context, path, body) {
  const response = await context.request.fetch(origin + '/api/app/' + path, {
    method: body ? 'POST' : 'GET', headers: body ? {Origin: origin, 'Content-Type': 'application/json'} : {}, data: body,
  })
  const value = await response.json()
  assert.ok(response.ok(), path + ': ' + JSON.stringify(value))
  return value
}
let page
try {
  const account = await browser.newContext({viewport: {width: 390, height: 844}})
  page = await account.newPage()
  page.on('pageerror', error => errors.push({message:error.message,path:new URL(page.url()).pathname,at:Date.now()}))
  for(const event of ['request','requestfinished','requestfailed'])page.on(event,r=>{if(/^\/api\/app\/results\/[^/]+$/.test(new URL(r.url()).pathname))requests.push({event,path:new URL(r.url()).pathname,error:r.failure()?.errorText||null,at:Date.now()})})
  await navigate(page, '/en/app')
  await page.getByRole('button', {name: 'Continue with Google', exact: true}).click()
  await expect(page.getByRole('heading', {name: 'Create my private space', exact: true}).or(page.locator('[data-my-tests-dashboard]')).first()).toBeVisible({timeout: 60000})
  if (await page.getByRole('heading', {name: 'Create my private space', exact: true}).isVisible()) {
    await page.getByLabel('I am 18 or older.').check()
    await page.getByLabel('I agree to private processing', {exact: false}).check()
    await page.getByRole('button', {name: 'Create my private space', exact: true}).click()
  }
  await expect(page.locator('[data-my-tests-dashboard]')).toBeVisible({timeout: 30000})
  // Complete a standalone CBI through the same quick runner used by clients.
  const definition = getAssessmentDefinition('cbi-personal', 'v1', 'en')
  const run = await api(account, 'runs', {definitionKey: definition.key, definitionVersion: 'v1', instrumentLocale: 'en', operationId: randomUUID()})
  await navigate(page, '/en/app/runs/' + run.id + '?mode=quick')
  for (let index = 0; index < definition.questions.length; index++) {
    const scope = page.locator('.hh-quick-question').nth(index)
    await expect(scope.getByRole('heading', {name: definition.questions[index].text, exact: true})).toBeVisible()
    const saved = page.waitForResponse(response => response.url().includes('/runs/') && response.url().endsWith('/save') && response.request().method() === 'POST')
    await scope.locator('.hh-scale button').nth(index<2?3:2).click()
    assert.ok((await saved).ok())
  }
  await page.getByRole('button', {name: 'Save results and get recommendations', exact: true}).click()
  const report = page.locator('[data-personal-result-report]')
  await expect(report).toBeVisible({timeout: 30000})
  await assertCompact(page,'en')
  await expect(report.locator('[data-report-block="1"]')).toContainText('58.33')
  await expect(report.locator('[data-scale-construct]')).toContainText('physical and psychological exhaustion')
  await expect(report.locator('[data-assessment-gauge]')).toHaveAttribute('data-assessment-gauge','neutral')
  await expect(report.locator('[data-explanation-source]')).toHaveAttribute('href','https://nfa.dk/media/a4wheblj/cbi-scales.pdf#page=1')
  passed('CBI after-test: five visible blocks, concrete score anchors, one support suggestion, neutral gauge, course and sources at the end')
  await page.waitForLoadState('networkidle')
  const data = await api(account, 'bootstrap')
  const result = data.results.find(item => item.runId === run.id)
  assert.ok(result)
  assert.equal(result.dimensions[0].value, 58.33)
  const phq=await createResult(account,'phq-9',i=>i<6?2:0)
  const erq=await createResult(account,'erq',i=>i%2?6:3)
  await createResult(account,'erq',()=>4)
  const kindness=await createResult(account,'hh-sexual-self-kindness',i=>i<3?1:3)
  await createResult(account,'hh-sexual-self-kindness',i=>i<3?2:4)
  for (const locale of ['en', 'ru']) {
    for (const width of [320, 390, 1280]) {
      await page.setViewportSize({width, height: 844})
      await navigate(page, '/' + locale + '/app/results/' + result.id)
      await expect(report).toBeVisible({timeout: 30000})
      await assertCompact(page,locale)
      await expect(report.locator('[data-score-reading]')).toContainText(locale === 'ru' ? '58,33' : '58.33')
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), locale + ' report overflow at ' + width)
      await page.screenshot({path: output + '/cbi-' + locale + '-' + width + '.png', fullPage: true})
      await report.locator('[data-technical-report-details] summary').click()
      await expect(report.locator('[data-response-anchors]')).toBeVisible()
      await expect(report.locator('[data-score-calculation]')).toContainText(locale==='ru'?'58,33':'58.33')
      await navigate(page, '/' + locale + '/app/portfolio')
      const explanation = page.locator('[data-insights-explanation="cbi-personal"]')
      await expect(explanation).toContainText(locale === 'ru' ? 'физическую и психологическую истощённость' : 'physical and psychological exhaustion')
      await expect(explanation).toContainText(locale === 'ru' ? 'Что может поддержать' : 'Something you could try')
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), locale + ' Insights overflow at ' + width)
      if (width === 390) await page.screenshot({path: output + '/insights-' + locale + '.png', fullPage: true})
      await resultNavigation(page,'/'+locale+'/app/results/'+result.id,()=>explanation.locator('..').locator('.hh-insights-test-link').click())
      await assertCompact(page,locale)
    }
    await page.setViewportSize({width:390,height:844})
    for(const [key,r]of [['phq-9',phq],['erq',erq],['hh-sexual-self-kindness',kindness]]){await navigate(page,'/'+locale+'/app/results/'+r.id);await assertCompact(page,locale);await page.screenshot({path:output+'/'+key+'-'+locale+'-390.png',fullPage:true})}
    await navigate(page,'/'+locale+'/app/portfolio')
    const erqCard=page.locator('[data-insights-scales="erq"]')
    await expect(erqCard.locator('[data-scale-counter]')).toContainText(locale==='ru'?'1 из 2':'1 of 2')
    const first=await erqCard.locator('[data-selected-scale]').getAttribute('data-selected-scale'),meaning=await erqCard.locator('[data-insights-explanation]').innerText()
    await erqCard.getByRole('button',{name:locale==='ru'?'Следующая шкала':'Next scale',exact:true}).focus();await page.keyboard.press('Enter')
    await expect(erqCard.locator('[data-scale-counter]')).toContainText(locale==='ru'?'2 из 2':'2 of 2')
    assert.notEqual(await erqCard.locator('[data-selected-scale]').getAttribute('data-selected-scale'),first)
    assert.notEqual(await erqCard.locator('[data-insights-explanation]').innerText(),meaning)
    await expect(erqCard.locator('[data-gauge-trend]')).toHaveAttribute('data-gauge-trend','changed')
    await page.screenshot({path:output+'/insights-'+locale+'.png',fullPage:true})
    await erqCard.getByRole('button',{name:locale==='ru'?'Предыдущая шкала':'Previous scale',exact:true}).click()
    await expect(erqCard.locator('[data-selected-scale]')).toHaveAttribute('data-selected-scale',first)
    const kindnessCard=page.locator('[data-insights-scales="hh-sexual-self-kindness"]')
    await expect(kindnessCard.locator('[data-selected-scale]')).toHaveAttribute('data-selected-scale','resources.sexual_self_kindness.kindness')
    await expect(kindnessCard.locator('[data-scale-counter]')).toContainText(locale==='ru'?'1 из 2':'1 of 2')
    const kindnessText=await kindnessCard.locator('[data-insights-explanation]').innerText()
    await kindnessCard.getByRole('button',{name:locale==='ru'?'Следующая шкала':'Next scale',exact:true}).focus();await page.keyboard.press('Space')
    await expect(kindnessCard.locator('[data-selected-scale]')).toHaveAttribute('data-selected-scale','resources.sexual_self_kindness.choice')
    assert.notEqual(await kindnessCard.locator('[data-insights-explanation]').innerText(),kindnessText)
    await expect(kindnessCard.locator('[data-gauge-trend]')).toHaveAttribute('data-gauge-trend','changed')
    await page.screenshot({path:output+'/self-kindness-insights-'+locale+'.png',fullPage:true})
    passed(locale+': compact reports at 320/390/1280, PHQ/ERQ examples, accessible two-scale Insights navigation and neutral trend')
  }
  await navigate(page,'/en/app/results/'+result.id)
  const posts=[];page.on('request',r=>{if(new URL(r.url()).pathname==='/api/app/course'&&r.method()==='POST')posts.push(r.url())})
  await page.locator('[data-report-course-banner]').getByRole('link',{name:'Learn more about the course'}).click()
  await expect(page).toHaveURL(origin+'/en/app/course?support=energy_agency#about-course')
  await expect(page.locator('[data-course-information]')).toBeVisible()
  await expect(page.locator('[data-requested-support-topic="energy_agency"]')).toBeVisible()
  await page.getByRole('button',{name:'Start course for free',exact:true}).first().click();await expect(page.getByRole('button',{name:'Agree & start',exact:true})).toBeDisabled();await page.getByRole('button',{name:'Not now',exact:true}).click()
  await expect(page.locator('[data-requested-support-topic="energy_agency"]')).toContainText('You choose tests and directions in the course steps.')
  await expect(page.getByRole('button',{name:'Choose this direction',exact:true})).toHaveCount(0)
  await page.getByRole('button',{name:'Start course for free',exact:true}).first().click();await expect(page.getByRole('button',{name:'Agree & start',exact:true})).toBeDisabled();await page.getByRole('button',{name:'Not now',exact:true}).click()
  assert.deepEqual(posts,[])
  passed('CBI handoff uses only existing energy topic; learn-more and canonical R3 choices preserve course opt-in')
  const guestContext=await browser.newContext({viewport:{width:390,height:844}}),guestPage=await guestContext.newPage()
  guestPage.on('pageerror',e=>errors.push({message:e.message,path:new URL(guestPage.url()).pathname,at:Date.now()}))
  await navigate(guestPage,'/en/app/course?support=energy_agency')
  await expect(guestPage.getByText('The free course uses prepared practices.',{exact:false})).toBeVisible()
  await guestPage.getByRole('button',{name:'Continue with Google',exact:true}).click()
  await expect(guestPage).toHaveURL(origin+'/en/app/course?support=energy_agency',{timeout:60000})
  await expect(guestPage.getByRole('heading',{name:'Create my private space',exact:true}).or(guestPage.locator('[data-requested-support-topic="energy_agency"]')).first()).toBeVisible({timeout:30000})
  if(await guestPage.getByRole('heading',{name:'Create my private space',exact:true}).isVisible()){
    await guestPage.getByLabel('I am 18 or older.').check();await guestPage.getByLabel('I agree to private processing',{exact:false}).check();await guestPage.getByRole('button',{name:'Create my private space',exact:true}).click()
  }
  await expect(guestPage.locator('[data-requested-support-topic="energy_agency"]')).toBeVisible({timeout:30000})
  assert.equal(await guestPage.evaluate(()=>sessionStorage.getItem('hh-pending-course-goal')),null)
  await guestPage.getByRole('button',{name:'Start course for free',exact:true}).first().click();await expect(guestPage.getByRole('button',{name:'Agree & start',exact:true})).toBeDisabled();await guestPage.getByRole('button',{name:'Not now',exact:true}).click()
  await guestContext.close()
  passed('signed-out course handoff clearly requires an account, retains only the public topic through login and leaves consent unchecked')
  // A real refresh failure must be surfaced, never discarded as navigation noise.
  await page.route('**/api/app/results/'+result.id,r=>r.fulfill({status:503,contentType:'application/json',body:'{"error":"SERVICE_UNAVAILABLE"}'}))
  await page.goto(origin+'/en/app/results/'+result.id)
  await expect(page.getByRole('alert')).toBeVisible({timeout:30000})
  await page.unroute('**/api/app/results/'+result.id)
  await navigate(page,'/en/app/results/'+result.id);await assertCompact(page,'en')
  passed('a real result-refresh failure remains visible and a successful retry recovers')
  assert.deepEqual(errors, [])
  await writeFile(output + '/verification.json', JSON.stringify({commit: process.env.GITHUB_SHA, checks, requests, browser: await browser.version(), records: 'SYNTHETIC_ONLY', auth: 'ISOLATED_PROTOCOL_DOUBLE_NOT_GOOGLE'}, null, 2))
} catch (error) {
  await page?.screenshot({path: output + '/failure.png', fullPage: true}).catch(() => {})
  await writeFile(output + '/verification.json', JSON.stringify({commit: process.env.GITHUB_SHA, checks, requests, errors, failure: error.message}, null, 2))
  throw error
} finally { await browser.close() }
