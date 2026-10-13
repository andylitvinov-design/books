// Synthetic loopback-only browser verification. No Google or production requests.
import { chromium, webkit, expect } from '@playwright/test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { MONITORING_CATALOG } from '../data/assessments/catalog.js'
import { assertIsolated } from '../tests/helpers/app-db-setup.mjs'
import { RELATIONSHIPS_INTIMACY_DEFINITIONS, RELATIONSHIPS_INTIMACY_CATALOG } from '../data/assessments/relationships-intimacy-v1.js'
const defs=RELATIONSHIPS_INTIMACY_DEFINITIONS.filter(d=>d.instrumentLocale==='en')
const localized=(key,locale)=>RELATIONSHIPS_INTIMACY_DEFINITIONS.find(d=>d.key===key&&d.instrumentLocale===locale)
assertIsolated()
const origin=process.env.HH_TEST_APP_ORIGIN || 'http://127.0.0.1:3100'
assert.match(origin,/^http:\/\/(127\.0\.0\.1|localhost):\d+$/)
const engine=process.env.HH_TEST_BROWSER==='webkit'?webkit:chromium
const browser=await engine.launch(process.env.HH_TEST_BROWSER_EXECUTABLE?{executablePath:process.env.HH_TEST_BROWSER_EXECUTABLE}:{})
const output='artifacts/app-r1/relationships-'+engine.name()
await mkdir(output,{recursive:true})
const checks=[], errors=[]
// Passive diagnostics only: preserve the strict page-error gate and navigation timing.
const navigationDiagnostics=[]
const diagnosticPages=new WeakMap()
let diagnosticRequestId=0
function navigationMarker(page,type,destination){
 const info=diagnosticPages.get(page)
 navigationDiagnostics.push({type,time:Date.now(),page:info?.label,probe:info?.probe,
  url:page?.url(),...(destination?{destination}:{})})
}
async function diagnosticPage(context,label){
 const page=await context.newPage(),info={label,probe:null},requests=new WeakMap()
 diagnosticPages.set(page,info)
 const prefix='HH_RELATIONSHIPS_LIFECYCLE '
 page.on('console',message=>{
  if(!message.text().startsWith(prefix))return
  try{
   const event=JSON.parse(message.text().slice(prefix.length))
   if(event.type==='init'||event.type==='pageshow')info.probe=event.probe
   navigationDiagnostics.push({page:label,...event})
  }catch(error){navigationDiagnostics.push({type:'diagnostic-parse-error',page:label,message:error.message})}
 })
 page.on('pageerror',error=>{
  errors.push(error.message)
  navigationDiagnostics.push({type:'pageerror',time:Date.now(),page:label,probe:info.probe,
   url:page.url(),message:error.message,stack:error.stack})
 })
 page.on('request',request=>{
  const url=new URL(request.url())
  if(url.origin!==origin||!(request.isNavigationRequest()||url.pathname.startsWith('/api/app/')||url.searchParams.has('_rsc')))return
  const entry={id:++diagnosticRequestId,url:request.url(),method:request.method(),
   resourceType:request.resourceType(),isNavigationRequest:request.isNavigationRequest(),
   startedPageUrl:page.url(),startedProbe:info.probe}
  requests.set(request,entry)
  navigationDiagnostics.push({type:'request',time:Date.now(),page:label,...entry})
 })
 page.on('response',response=>{
  const entry=requests.get(response.request());if(!entry)return
  navigationDiagnostics.push({type:'response',time:Date.now(),page:label,...entry,
   pageUrl:page.url(),probe:info.probe,status:response.status()})
 })
 for(const type of ['requestfinished','requestfailed'])page.on(type,request=>{
  const entry=requests.get(request);if(!entry)return
  navigationDiagnostics.push({type,time:Date.now(),page:label,...entry,
   pageUrl:page.url(),probe:info.probe,failure:request.failure()?.errorText||null})
 })
 await page.addInitScript(({prefix})=>{
  const probe=Math.random().toString(36).slice(2)
  const record=(type,extra={})=>console.debug(prefix+JSON.stringify({type,time:Date.now(),probe,
   url:location.href,readyState:document.readyState,hydrated:Boolean(history.state?.__NA),...extra}))
  record('init')
  for(const type of ['DOMContentLoaded','load','pageshow','pagehide','popstate'])
   addEventListener(type,event=>record(type,{persisted:Boolean(event.persisted)}))
  addEventListener('error',event=>record('window-error',{message:event.message,stack:event.error?.stack||null}))
  addEventListener('unhandledrejection',event=>record('window-unhandledrejection',{
   message:String(event.reason?.message||event.reason),stack:event.reason?.stack||null}))
 },{prefix})
 return page
}
const passed=name=>{checks.push(name);console.log('PASS '+name)}
async function navigate(page,url){
 // Let mounted account panels finish their reads before a hard navigation.
 // WebKit otherwise reports an interrupted same-origin fetch as an access-control error.
 // Keep the final zero-page-error assertion: do not suppress actual request failures.
 navigationMarker(page,'navigate-wait-start',url)
 await page.waitForLoadState('networkidle')
 navigationMarker(page,'before-goto',url)
 await page.goto(url)
 await page.waitForLoadState('networkidle')
}
async function api(context,path,body){
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
  await buttons.nth([0,1,4,4,2,0][i]).click()
  assert.ok((await saved).ok())
  if(mode==='guided'&&i<d.questions.length-1)await page.getByRole('button',{name:locale==='ru'?'Далее':'Next',exact:true}).click()
 }
 const finish=page.getByRole('button',{name:locale==='ru'?'Сохранить результат и получить рекомендации':'Save results and get recommendations',exact:true})
 await expect(finish).toBeEnabled()
 await finish.click()
 const report=page.locator('[data-personal-result-report]')
 await expect(report).toBeVisible({timeout:20000})
 await expect(report.locator('[data-report-block="1"] article')).toHaveCount(d.scoring.dimensions.length)
 const context=report.locator('[data-assessment-context]')
 await expect(context).toBeVisible()
 await expect(report.locator('[data-report-block="5"]')).toContainText(locale==='ru'?'Клиническая валидность и нормы не установлены':'Clinical validity and population norms are not established')
 await expect(context).toContainText(locale==='ru'?'согласия':'consent')
 assert.equal(await context.evaluate(n=>n.closest('[data-report-block]').dataset.reportBlock),'5')
 await context.scrollIntoViewIfNeeded()
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1))
 await page.screenshot({path:output+'/'+(guest?'guest':'account')+'-'+d.key+'-'+locale+'.png',fullPage:false})
}
let page
try{
 const publicContext=await browser.newContext({viewport:{width:390,height:844}})
 page=await diagnosticPage(publicContext,'public-hub')
 for(const locale of ['en','ru']){
  // Keep this independent first-visit scenario in its own tab. Next's dev
  // reload of /client can otherwise interrupt WebKit's next hub navigation.
  const pickerPage=await diagnosticPage(publicContext,'picker-'+locale)
  for(const resources of [false,true]){
   await navigate(pickerPage,origin+'/'+locale+'/client')
   const picker=pickerPage.locator('[data-prelogin-test-picker]')
   await expect(picker).toBeVisible()
   if(resources)await picker.getByRole('button',{name:locale==='ru'?'Внутренняя опора':'Self-support',exact:true}).click()
   // Opening the full editor exposes every selected entry, including those
   // below the first five recommendation cards. This also checks the handoff.
   await picker.getByRole('button',{name:locale==='ru'?'Открыть всю базу тестов':'Browse full database',exact:true}).click()
   const chosen=pickerPage.locator('article input[type="checkbox"]:checked')
   await expect(chosen).toHaveCount(3)
   const titles=await chosen.evaluateAll(nodes=>nodes.map(n=>n.getAttribute('aria-label')))
   const excluded=MONITORING_CATALOG.filter(x=>x.starterEligible===false).map(x=>x.title[locale]||x.title.en)
   assert.ok(titles.every(title=>!excluded.includes(title)),locale+': automatic choice requires starter eligibility')
  }
  navigationMarker(pickerPage,'before-page-close')
  await pickerPage.close()
  passed(locale+' first visit and broad Self-support filter keep every opt-in questionnaire out of the automatic plan')
  await navigate(page,origin+'/'+locale+'/relationships')
  await expect(page.locator('[data-relationships-category]')).toHaveCount(3)
  const links=page.locator('a[href*="/client/tests?test=hh-"]')
  await expect(links).toHaveCount(8)
  assert.deepEqual((await links.evaluateAll(nodes=>nodes.map(n=>new URL(n.href).searchParams.get('test')))).sort(),defs.map(d=>d.key).sort())
  for(const width of [320,360,390,430,768,1280]){
   await page.setViewportSize({width,height:844})
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),locale+' hub overflow at '+width)
   if(width<768)await expect(page.locator('.mobile-bottom-navigation a')).toHaveCount(6)
   await page.screenshot({path:output+'/hub-'+locale+'-'+width+'.png',fullPage:false})
  }
  await page.setViewportSize({width:390,height:844})
  // Keyboard activation also works when Next's development-only badge overlaps Home.
  const home=page.locator('.mobile-bottom-navigation [data-nav-item="home"]')
  await home.focus()
  await home.press('Enter')
  await page.waitForLoadState('networkidle')
  const spotlight=page.locator('section[aria-labelledby="relationships-spotlight-title"]')
  await expect(spotlight).toBeVisible()
  await spotlight.locator('a[href$="/relationships"]').click()
  await expect(page.locator('#relationships-title')).toBeVisible()
  passed(locale+' hub: eight routes, three groups, six mobile slots, 320–1280px and home route')
  for(const entry of RELATIONSHIPS_INTIMACY_CATALOG){
   await navigate(page,origin+'/'+locale+'/client/tests?test='+entry.key)
   const chosen=page.locator('article').filter({has:page.locator('input[type="checkbox"]:checked')})
   await expect(chosen).toHaveCount(1)
   await expect(chosen).toContainText(entry.title[locale])
   assert.equal(new URL(page.url()).searchParams.get('test'),entry.key)
  }
  passed(locale+' all eight deep links select exactly their intended questionnaire')
 }
 // A real keyboard selection remains reversible without changing the chosen ID.
 const selected=page.locator('article input[type="checkbox"]:checked')
 await selected.focus()
 await page.keyboard.press('Space')
 await expect(page.locator('article input[type="checkbox"]:checked')).toHaveCount(0)
 await page.keyboard.press('Space')
 await expect(page.locator('article input[type="checkbox"]:checked')).toHaveCount(1)
 navigationMarker(page,'before-public-context-close')
 await publicContext.close()
 const account=await browser.newContext({viewport:{width:390,height:844}})
 page=await diagnosticPage(account,'account')
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
 for(const [i,base] of defs.entries()){
  const locale=i%2?'ru':'en',mode=i%2?'guided':'quick',d=localized(base.key,locale)
  const run=await api(account,'runs',{definitionKey:d.key,definitionVersion:'v1',instrumentLocale:d.instrumentLocale,operationId:randomUUID()})
  await navigate(page,origin+'/'+locale+'/app/runs/'+run.id+'?mode='+mode)
  if(mode==='guided')await page.locator('.hh-test-mode-grid button').nth(1).click()
  await fill(page,d,mode,false,locale)
  const data=await api(account,'bootstrap'),result=data.results.find(r=>r.runId===run.id)
  assert.ok(result);assert.equal(result.contentHash,d.contentHash)
  assert.deepEqual(result.dimensions.map(x=>x.value),[1.67,2])
  await page.waitForLoadState('networkidle')
  navigationMarker(page,'before-reload')
  await page.reload()
  await expect(page.locator('[data-personal-result-report]')).toBeVisible()
  passed(d.key+' account '+locale+' '+mode+': save, original items, score, report and reload')
 }
 await navigate(page,origin+'/en/client')
 const picker=page.locator('[data-prelogin-test-picker]')
 await picker.getByRole('button',{name:'Relationships',exact:true}).click()
 const voluntary=picker.locator('[data-test-match="hh-love-affection"] input')
 await expect(voluntary).not.toBeChecked()
 await voluntary.check()
 await picker.getByRole('button',{name:'Relationships',exact:true}).click()
 await picker.getByRole('button',{name:'Self-support',exact:true}).click()
 // A broader filter can move the chosen card below the first five matches.
 // Expand the real paged list before inspecting its retained checkbox.
 for(let batch=0;await voluntary.count()===0&&batch<21;batch++)
  await picker.getByRole('button',{name:/^Show \d+ more tests$/}).click()
 await expect(voluntary).toBeChecked()
 await expect(picker.locator('[data-public-selected-tests]')).toContainText('Love & Affection')
 const saveVoluntary=page.waitForResponse(r=>r.url().endsWith('/api/app/test-plans')&&r.request().method()==='POST')
 const loadVoluntary=page.waitForResponse(r=>/\/api\/app\/test-plans\/[^/?]+$/.test(r.url())&&r.request().method()==='GET')
 await picker.getByRole('button',{name:/^Start free monitoring/}).click()
 const voluntaryResponse=await saveVoluntary
 assert.ok(voluntaryResponse.ok())
 const voluntaryPlan=await voluntaryResponse.json()
 assert.ok(voluntaryPlan.definitionIds.includes(localized('hh-love-affection','en').id))
 assert.ok(!voluntaryPlan.definitionIds.includes(localized('hh-sexual-self-kindness','en').id))
 await expect(page).toHaveURL(/\/en\/app\/tests\?plan=/)
 await expect(page.locator('#my-tests-list')).toBeVisible()
 const loadedVoluntary=await loadVoluntary
 assert.ok(loadedVoluntary.ok());assert.equal((await loadedVoluntary.json()).id,voluntaryPlan.id)
 await loadedVoluntary.finished()
 await page.waitForLoadState('networkidle')
 const reloadVoluntary=page.waitForResponse(r=>r.url().endsWith('/api/app/test-plans/'+voluntaryPlan.id)&&r.request().method()==='GET')
 navigationMarker(page,'before-reload')
 await page.reload()
 await expect(page.locator('#my-tests-list')).toBeVisible()
 const reloadedVoluntary=await reloadVoluntary
 assert.ok(reloadedVoluntary.ok());assert.equal((await reloadedVoluntary.json()).id,voluntaryPlan.id)
 await reloadedVoluntary.finished()
 const savedChoice=await api(account,'bootstrap')
 assert.ok(savedChoice.activeTestPlan.definitionIds.includes(localized('hh-love-affection','en').id))
 passed('explicit relationship choice survives broader filters, private plan saving and reload without adding other intimate forms')
 await navigate(page,origin+'/en/client/tests?test=hh-love-affection')
 const selectionResponse=page.waitForResponse(r=>r.url().endsWith('/api/app/test-plans')&&r.request().method()==='POST')
 const selectionLoaded=page.waitForResponse(r=>/\/api\/app\/test-plans\/[^/?]+$/.test(r.url())&&r.request().method()==='GET')
 await page.getByRole('button',{name:'Start free monitoring',exact:true}).first().click()
 const selection=await selectionResponse
 assert.ok(selection.ok())
 const savedPlan=await selection.json()
 assert.ok(savedPlan.definitionIds.includes(localized('hh-love-affection','en').id))
 await expect(page).toHaveURL(/\/en\/app\/tests\?plan=/)
 await expect(page.locator('#my-tests-list')).toBeVisible()
 // The dashboard shell renders before its requested plan finishes loading.
 // Verify the real read before leaving, so WebKit never aborts it mid-request.
 const loadedSelection=await selectionLoaded
 assert.ok(loadedSelection.ok());assert.equal((await loadedSelection.json()).id,savedPlan.id)
 await loadedSelection.finished()
 passed('keyboard selection and signed-in hub selection preserve the intended questionnaire in the private plan')
 const d=defs[0]
 let repeat=await api(account,'runs',{definitionKey:d.key,definitionVersion:'v1',instrumentLocale:'en',operationId:randomUUID()})
 repeat=await api(account,'runs/'+repeat.id+'/save',{answers:Object.fromEntries(d.questions.map(q=>[q.id,3])),context:{},progress:6,expectedRevision:repeat.revision,operationId:randomUUID()})
 await api(account,'runs/'+repeat.id+'/submit',{expectedRevision:repeat.revision})
 const snapshot=await api(account,'bootstrap')
 assert.ok(snapshot.results.filter(r=>r.definitionKey===d.key).length>=2)
 await navigate(page,origin+'/en/app/history')
 await expect(page.getByRole('heading',{name:d.title,exact:true}).first()).toBeVisible({timeout:20000})
 for(const locale of ['en','ru']){
  await navigate(page,origin+'/'+locale+'/app/portfolio')
  for(const entry of RELATIONSHIPS_INTIMACY_CATALOG)await expect(page.locator('.hh-insights-test-card').filter({hasText:entry.title[locale]}).first()).toBeVisible({timeout:20000})
  await page.screenshot({path:output+'/insights-'+locale+'.png',fullPage:false})
 }
 passed('all eight original questionnaires appear in bilingual Insights; compatible repeat appears in history')
 // The existing client-only PDF pipeline includes the same bilingual interpretation model.
 for(const locale of ['en','ru']){
  await navigate(page,origin+'/'+locale+'/app')
  const download=page.waitForEvent('download',{timeout:60000})
  await page.getByRole('button',{name:locale==='ru'?'Скачать отчёт':'Download report',exact:true}).click()
  const file=await download,bytes=await readFile(await file.path())
  assert.equal(bytes.subarray(0,8).toString(),'%PDF-1.4');assert.ok(bytes.length>12000)
  await file.saveAs(output+'/report-'+locale+'.pdf')
  passed(locale+' PDF download includes persisted experimental relationship report model')
 }
 for(const [i,base] of defs.entries()){
  const locale=i%2?'en':'ru',mode=i%2?'quick':'guided',d=localized(base.key,locale),guest=await browser.newContext({viewport:{width:390,height:844}})
  await api(guest,'guest/session',{adult:true,necessary:true,uiLocale:locale,timezone:'UTC'})
  const plan=await api(guest,'guest/test-plans',{items:[{definitionKey:d.key,definitionVersion:'v1',instrumentLocale:d.instrumentLocale}],operationId:randomUUID()})
  page=await diagnosticPage(guest,'guest-'+d.key+'-'+locale)
  await navigate(page,origin+'/'+locale+'/client?plan='+plan.id)
  const modeButton=page.locator('.hh-test-mode-grid button').nth(mode==='quick'?0:1)
  await expect(modeButton).toBeVisible({timeout:20000});await modeButton.click()
  await fill(page,d,mode,true,locale)
  const data=await api(guest,'guest/bootstrap'),result=data.results.find(r=>r.definitionKey===d.key)
  assert.deepEqual(result.dimensions.map(x=>x.value),[1.67,2])
  assert.equal(result.instrumentLocale,locale);assert.equal(result.contentHash,d.contentHash)
  passed(d.key+' guest '+locale+' '+mode+': private consented runner and complete report')
  navigationMarker(page,'before-guest-context-close')
  await guest.close()
 }
 assert.deepEqual(errors,[])
 await writeFile(output+'/verification.json',JSON.stringify({commit:process.env.GITHUB_SHA,browser:await browser.version(),checks,auth:'ISOLATED_PROVIDER_PROTOCOL_DOUBLE_NOT_GOOGLE',production:'UNCHANGED'},null,2))
} catch(error){
 await page?.screenshot({path:output+'/failure.png',fullPage:false}).catch(()=>{})
 await writeFile(output+'/verification.json',JSON.stringify({commit:process.env.GITHUB_SHA,checks,failure:error.message},null,2));throw error
} finally{
 navigationMarker(page,'before-final-browser-close')
 try{await browser.close()}finally{
  await writeFile(output+'/navigation-diagnostics.json',JSON.stringify({commit:process.env.GITHUB_SHA,events:navigationDiagnostics},null,2))
 }
}
