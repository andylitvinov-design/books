// Real UI + repository + PostgreSQL, synthetic loopback only. Never production.
import { chromium, webkit, expect } from '@playwright/test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { actor, adminClient, assertIsolated } from '../tests/helpers/app-db-setup.mjs'
import { getAppConfig } from '../lib/app/config.js'
import { createAppRepository } from '../lib/app/repository.js'
import { createTestRatingRepository } from '../lib/app/test-ratings.js'
import { closeDatabase } from '../lib/app/database.js'
import { getAssessmentDefinition } from '../lib/assessments/definitions.js'
import { ratingCopy } from '../lib/assessments/test-ratings.js'
assertIsolated()
const origin=process.env.HH_TEST_APP_ORIGIN||'http://127.0.0.1:3100'
assert.match(origin,/^http:\/\/(127\.0\.0\.1|localhost):\d+$/)
const engine=process.env.HH_TEST_BROWSER==='webkit'?webkit:chromium
const browser=await engine.launch(process.env.HH_TEST_BROWSER_EXECUTABLE?{executablePath:process.env.HH_TEST_BROWSER_EXECUTABLE}:{})
const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage()
const output='artifacts/app-r1/test-ratings-'+engine.name(),checks=[],errors=[],fixtureActors=[]
await mkdir(output,{recursive:true})
const config=getAppConfig(),repo=createAppRepository(config),ratings=createTestRatingRepository(config)
const cbi=getAssessmentDefinition('cbi-personal','v1','en'),secondTest=getAssessmentDefinition('phq-4','v1','en'),current=getAssessmentDefinition('hh-current-state','v2','en')
page.on('pageerror',error=>errors.push(error.message))
const passed=name=>{checks.push(name);console.log('PASS '+name)}
async function api(path,body,method){
 const r=await context.request.fetch(origin+'/api/app/'+path,{method:method||(body?'POST':'GET'),headers:body?{Origin:origin,'Content-Type':'application/json'}:{},data:body})
 const data=await r.json();assert.ok(r.ok(),path+': '+JSON.stringify(data));return data
}
async function completeViaAPI(def){
 const run=await api('runs',{definitionKey:def.key,definitionVersion:def.version,instrumentLocale:def.instrumentLocale,operationId:randomUUID()})
 const saved=await api('runs/'+run.id+'/save',{answers:Object.fromEntries(def.questions.map(q=>[q.id,2])),context:{},progress:def.questions.length,expectedRevision:run.revision,operationId:randomUUID()})
 return api('runs/'+run.id+'/submit',{expectedRevision:saved.revision})
}
async function navigate(url){await page.waitForLoadState('networkidle');await page.goto(url);await page.waitForLoadState('networkidle')}
try{
 await page.goto(origin+'/en/app')
 await page.getByRole('button',{name:'Continue with Google',exact:true}).click()
 await expect(page.getByRole('heading',{name:'Create my private space',exact:true}).or(page.locator('[data-my-tests-dashboard]')).first()).toBeVisible({timeout:60000})
 if(await page.getByRole('heading',{name:'Create my private space',exact:true}).isVisible()){
  await page.getByLabel('I am 18 or older.').check();await page.getByLabel('I agree to private processing',{exact:false}).check();await page.getByRole('button',{name:'Create my private space',exact:true}).click()
 }
 await expect(page.locator('[data-my-tests-dashboard]')).toBeVisible({timeout:30000})
 const result=await completeViaAPI(cbi)
 for(const locale of ['en','ru']){
  const c=ratingCopy(locale),url=origin+'/'+locale+'/app/results/'+result.id
  await navigate(url)
  const rating=page.locator('[data-test-rating]')
  await expect(rating).toBeVisible({timeout:30000});await expect(rating.getByRole('radio').first()).toBeEnabled()
  // Make each locale exercise a genuinely new save; no directly changed votes.
  let state=await api('results/'+result.id+'/rating')
  if(state.stars){await api('results/'+result.id+'/rating',{expectedRevision:state.revision},'DELETE');await navigate(url)}
  await rating.getByRole('radio').first().focus();await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowRight')
  await expect(rating.getByRole('radio').nth(2)).toBeChecked()
  assert.notEqual(await rating.getByRole('radio').nth(2).evaluate(el=>getComputedStyle(el.parentElement).outlineStyle),'none')
  await rating.getByRole('button',{name:c.save,exact:true}).click();await expect(rating.getByRole('status')).toContainText(c.saved)
  await page.waitForLoadState('networkidle');await page.reload();await expect(rating.getByRole('radio').nth(2)).toBeChecked()
  for(const width of [320,390,1280]){
   await page.setViewportSize({width,height:900});await rating.scrollIntoViewIfNeeded()
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1))
   const rect=await rating.getByRole('radio').first().boundingBox();assert.ok(rect.width>=44&&rect.height>=44,`Radio target at ${locale}/${width}: ${JSON.stringify(rect)}`)
   await page.screenshot({path:output+'/rating-'+locale+'-'+width+'.png',fullPage:false})
  }
  // Real stale-revision conflict across tabs, then explicit refresh and recovery.
  state=await api('results/'+result.id+'/rating');await api('results/'+result.id+'/rating',{uiLocale:'en',stars:5,expectedRevision:state.revision})
  await rating.getByRole('radio').nth(1).check();await rating.getByRole('button',{name:c.update,exact:true}).click()
  await expect(rating.getByRole('alert')).toContainText(c.conflict);await expect(rating.getByRole('radio').first()).toBeDisabled()
  await rating.getByRole('button',{name:c.reload,exact:true}).click();await expect(rating.getByRole('radio').nth(4)).toBeChecked();await expect(rating.getByRole('radio').first()).toBeEnabled()
  // An interrupted service response must keep the changed input and allow retry.
  await page.route('**/api/app/results/*/rating',async route=>route.request().method()==='POST'?route.fulfill({status:503,json:{error:'SERVICE_UNAVAILABLE'}}):route.continue())
  await rating.getByRole('radio').nth(3).check();await rating.getByRole('button',{name:c.update,exact:true}).click();await expect(rating.getByRole('alert')).toContainText(c.error)
  assert.equal((await api('results/'+result.id+'/rating')).stars,5)
  await page.unroute('**/api/app/results/*/rating')
  await rating.getByRole('button',{name:c.update,exact:true}).click();await expect(rating.getByRole('status')).toContainText(c.saved)
  await rating.getByRole('button',{name:c.remove,exact:true}).click();await expect(rating.getByRole('status')).toContainText(c.removed)
  assert.equal((await api('results/'+result.id+'/rating')).stars,null)
  passed(locale+': native keyboard/focus, 320/390/1280 layout, real save/reload/edit/conflict/retry/remove')
 }
 // A missing DB interpretation hides the feedback control, without fabricated advice.
 await page.route('**/api/app/results/'+result.id,async route=>{const response=await route.fetch();const body=await response.json();await route.fulfill({response,json:{...body,interpretations:{}}})})
 await navigate(origin+'/en/app/results/'+result.id);await expect(page.locator('[data-test-rating]')).toHaveCount(0)
 await page.unroute('**/api/app/results/'+result.id)
 passed('missing interpretation does not offer a vote')
 // A previously saved vote remains removable if the exact interpretation is retired.
 let managed=await api('results/'+result.id+'/rating')
 await api('results/'+result.id+'/rating',{uiLocale:'en',stars:3,expectedRevision:managed.revision})
 const contentAdmin=await adminClient()
 try {
  await contentAdmin.query("update app.assessment_interpretation_versions set status='retired' where assessment_version_id=$1 and ui_locale='en'",[cbi.id])
  await navigate(origin+'/en/app/results/'+result.id)
  const management=page.locator('[data-test-rating]')
  await expect(management).toContainText(ratingCopy('en').manageOnly)
  await expect(management.getByRole('radio')).toHaveCount(0)
  await management.getByRole('button',{name:ratingCopy('en').remove,exact:true}).click()
  await expect(management).toHaveCount(0)
  assert.equal((await api('results/'+result.id+'/rating')).stars,null)
 } finally {
  await contentAdmin.query("update app.assessment_interpretation_versions set status='published' where assessment_version_id=$1 and ui_locale='en'",[cbi.id]);await contentAdmin.end()
 }
 passed('retired interpretation keeps owner-only read/remove management and offers no new star input')
 // Five distinct synthetic accounts each complete the real two instruments.
 const admin=await adminClient()
 try{
  for(let index=0;index<5;index++){
   const person=actor(randomUUID(),randomUUID());fixtureActors.push(person)
   await admin.query('insert into auth.users(id,email) values($1,$2)',[person.id,'ratings-browser@example.invalid'])
   await admin.query('insert into auth.sessions(id,user_id) values($1,$2)',[person.claims.session_id,person.id])
   await repo.ensureAccount(person);await repo.onboarding(person,{adult:true,necessary:true,marketing:false,displayName:'Synthetic ratings',uiLocale:'en',timezone:'UTC',goal:'explore'})
   for(const def of [cbi,secondTest]){
    const run=await repo.startRun(person,{definitionKey:def.key,definitionVersion:def.version,instrumentLocale:def.instrumentLocale,operationId:randomUUID()})
    const saved=await repo.saveRun(person,run.id,{answers:Object.fromEntries(def.questions.map(q=>[q.id,2])),context:{},progress:def.questions.length,expectedRevision:run.revision,operationId:randomUUID()})
    const completed=await repo.submitRun(person,run.id,{expectedRevision:saved.revision})
    await ratings.save(person,completed.id,{uiLocale:'en',stars:def.id===cbi.id?5:4,expectedRevision:0})
   }
  }
 }finally{await admin.end()}
 const one=await completeViaAPI(current),existing=await api('results/'+one.id+'/rating')
 await api('results/'+one.id+'/rating',{uiLocale:'en',stars:5,expectedRevision:existing.revision})
 const publicSummary=await api('test-ratings');assert.equal(publicSummary.summaries[cbi.id].count,5);assert.equal(publicSummary.summaries[current.id].ranked,false)
 for(const locale of ['en','ru']){
  const c=ratingCopy(locale)
  await navigate(origin+'/'+locale+'/client')
  await page.getByLabel(c.sort,{exact:false}).selectOption('rating')
  await expect(page.locator('[data-test-match]').first()).toHaveAttribute('data-test-match','cbi-personal')
  const summary=page.locator('[data-test-match]').first().locator('..').locator('[data-test-rating-summary]')
  await expect(summary).toContainText('5');await expect(page.getByText(c.method,{exact:true})).toBeVisible()
  await page.getByRole('button',{name:c.chooseTop,exact:true}).click()
  await expect(page.locator('[data-test-match="cbi-personal"] input')).toBeChecked()
  await expect(page.locator('[data-test-match="phq-4"] input')).toBeChecked()
  await page.setViewportSize({width:320,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1))
  await page.screenshot({path:output+'/ranked-picker-'+locale+'-320.png',fullPage:false})
  await navigate(origin+'/'+locale+'/client/tests')
  await page.locator('select').filter({has:page.locator('option[value="rating"]')}).selectOption('rating')
  await expect(page.locator('article[data-test-key]').first()).toHaveAttribute('data-test-key','cbi-personal')
  passed(locale+': public simple/full highest-rated picker uses real five-account means/counts; one-vote 5-star test is below the ranked tier')
 }
 for(const locale of ['en','ru']){
  const guest=await browser.newContext({viewport:{width:390,height:844}}),guestPage=await guest.newPage(),c=ratingCopy(locale)
  guestPage.on('pageerror',error=>errors.push(error.message))
  async function guestApi(path,body){const response=await guest.request.post(origin+'/api/app/'+path,{headers:{Origin:origin},data:body});const data=await response.json();assert.ok(response.ok(),path+': '+JSON.stringify(data));return data}
  await guestApi('guest/session',{adult:true,necessary:true,uiLocale:locale,timezone:'UTC'})
  const plan=await guestApi('guest/test-plans',{items:[{definitionKey:cbi.key,definitionVersion:cbi.version,instrumentLocale:'en'}],operationId:randomUUID()})
  await guestPage.goto(origin+'/'+locale+'/client?plan='+plan.id)
  await guestPage.locator('.hh-test-mode-grid button').first().click()
  for(let index=0;index<cbi.questions.length;index++){
   const response=guestPage.waitForResponse(r=>r.url().includes('/guest/runs/')&&r.url().endsWith('/save')&&r.request().method()==='POST')
   await guestPage.locator('.cabinet-quick-question').nth(index).locator('.cabinet-answer-list button').nth(2).click();assert.ok((await response).ok())
  }
  await guestPage.getByRole('button',{name:locale==='ru'?'Сохранить результат и получить рекомендации':'Save results and get recommendations',exact:true}).click()
  const block=guestPage.locator('[data-test-rating]');await expect(block).toBeVisible({timeout:30000});await expect(block.getByRole('radio')).toHaveCount(0)
  await expect(block.getByRole('button',{name:c.guestAction,exact:true})).toBeEnabled();await expect(block).toContainText(c.guest)
  const denied=await guest.request.post(origin+'/api/app/results/'+result.id+'/rating',{headers:{Origin:origin},data:{uiLocale:'en',stars:5,expectedRevision:0}});assert.equal(denied.status(),401)
  await block.scrollIntoViewIfNeeded();await guestPage.screenshot({path:output+'/guest-'+locale+'.png',fullPage:false})
  await guestPage.waitForLoadState('networkidle')
  const intentResponse=guestPage.waitForResponse(r=>r.url().endsWith('/api/app/save-intents')&&r.request().method()==='POST')
  await block.getByRole('button',{name:c.guestAction,exact:true}).click();assert.ok((await intentResponse).ok())
  await expect(guestPage.getByRole('heading',{name:locale==='ru'?'Сохранить в личном кабинете':'Save to your Cabinet',exact:true})).toBeVisible({timeout:60000})
  await guestPage.getByRole('button',{name:locale==='ru'?'Сохранить':'Save',exact:true}).click()
  await expect(guestPage).toHaveURL(/\/app\/results\//,{timeout:30000})
  const claimed=guestPage.locator('[data-test-rating]');await expect(claimed.getByRole('radio').first()).toBeEnabled()
  const stars=locale==='ru'?2:4;await claimed.getByRole('radio').nth(stars-1).check()
  await claimed.getByRole('button',{name:new RegExp('^('+c.save+'|'+c.update+')$')}).click();await expect(claimed.getByRole('status')).toContainText(c.saved)
  await guestPage.waitForLoadState('networkidle');await guestPage.reload();await expect(claimed.getByRole('radio').nth(stars-1)).toBeChecked()
  assert.equal((await api('test-ratings')).summaries[cbi.id].count,6,'claiming another guest result must not add a second vote for the same account')
  await guestPage.waitForLoadState('networkidle');await guest.close()
  passed(locale+': guest report → explicit save/sign-in → claim confirmation → account rating persists, with one vote per account/test')
 }
 assert.deepEqual(errors,[])
 await writeFile(output+'/verification.json',JSON.stringify({commit:process.env.GITHUB_SHA,engine:engine.name(),checks,errors,fixture:'SYNTHETIC_LOOPBACK_ONLY'},null,2))
}catch(error){await page.screenshot({path:output+'/failure.png',fullPage:false}).catch(()=>{});await writeFile(output+'/verification.json',JSON.stringify({commit:process.env.GITHUB_SHA,checks,errors,failure:error.message},null,2));throw error}
finally{
 const admin=await adminClient()
 try{const ids=fixtureActors.map(a=>a.id);if(ids.length){await admin.query('delete from app.accounts where id=any($1::uuid[])',[ids]);await admin.query('delete from auth.users where id=any($1::uuid[])',[ids])}}finally{await admin.end()}
 await closeDatabase();await browser.close()
}
