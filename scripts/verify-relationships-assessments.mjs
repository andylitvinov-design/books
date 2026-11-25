import { advanceSavedGuidedQuestion } from './helpers/guided-progress-verifier.mjs'
import { openAccountTestPicker } from './helpers/account-picker-disclosure-verifier.mjs'
async function downloadAccountReport(page, locale) {
 const action=page.getByRole('button',{name:locale==='ru'?'Скачать отчёт':'Download report',exact:true})
 await expect(action).toHaveCount(1)
 await expect(action).toBeVisible()
 await expect(action).toBeEnabled()
 navigationMarker(page,'before-report-download')
 try{
  // Attach rejection handling to both operations immediately. A failed download
  // must reach the outer evidence catch instead of terminating Node unhandled.
  const [file]=await Promise.all([
   page.waitForEvent('download',{timeout:60000}),
   action.click(),
  ])
  navigationMarker(page,'report-download-received')
  return file
 }catch(error){
  navigationMarker(page,'report-download-failed')
  throw error
 }
}
async function publicTopicButton(picker, locale, title) {
 const group = picker.getByRole('group', { name: locale === 'ru' ? 'Что вы хотите исследовать?' : 'What would you like to explore?', exact: true })
 await expect(group).toHaveCount(1)
 const button = group.getByRole('button', { name: title, exact: true })
 await expect(button).toHaveCount(1)
 await expect(button).toBeVisible()
 return button
}
import { assertCabinetPortrait, openCabinetMyTests } from './helpers/cabinet-navigation-verifier.mjs'
import { readEveryAccountScale } from './helpers/account-scale-picker-verifier.mjs'
import { assertQuestionnaireMode, enterGuestQuestionnaireMode } from './helpers/direct-questionnaire-verifier.mjs'
import { guestFinishLabel, assertGuestScaleResult, assertAccountScaleReport } from './helpers/guest-scale-verifier.mjs'
import { createGuestVerifierPacer } from './helpers/guest-verifier-pacing.mjs'
// Synthetic loopback-only browser verification. No Google or production requests.
import { chromium, webkit, expect } from '@playwright/test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { MONITORING_CATALOG } from '../data/assessments/catalog.js'
import { TOPIC_JOURNEYS, journeyFocusForTopics, journeyProblemsForTopics } from '../lib/assessments/topic-journeys.js'
import { buildTopicTestSuggestions } from '../lib/assessments/topic-test-suggestions.js'
import { getAssessmentDefinition } from '../lib/assessments/definitions.js'
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
const guestPacer=createGuestVerifierPacer({log:event=>console.log('RELATIONSHIPS_GUEST_BUDGET',JSON.stringify(event))})
let pacedGuestContext=null
// Passive diagnostics only: preserve the strict page-error gate and navigation timing.
const navigationDiagnostics=[]
function diagnosticUrl(value){
 try{const url=new URL(value,origin);return ['http:','https:'].includes(url.protocol)?url.origin+url.pathname:'[redacted-url]'}catch{return '[invalid-url]'}
}
function recordDiagnostic(event){
 const safe={}
 const urlFields=new Set(['url','destination','pageUrl','startedPageUrl','blockedURI','sourceFile'])
 const fields=new Set(['type','time','page','probe','id','method','resourceType','isNavigationRequest','startedProbe','readyState','hydrated','persisted','status','lineNumber'])
 for(const [key,value]of Object.entries(event)){
  if(urlFields.has(key))safe[key]=diagnosticUrl(value)
  else if(fields.has(key))safe[key]=value
  else if(key==='failure')safe.failure=value?'request-failed':null
  else if(key==='effectiveDirective')safe.effectiveDirective=/^[a-z-]+$/.test(value)?value:'[redacted-directive]'
 }
 navigationDiagnostics.push(safe)
}
browser.on('disconnected',()=>recordDiagnostic({type:'browser-disconnected',time:Date.now()}))
const diagnosticPages=new WeakMap()
let diagnosticRequestId=0
function navigationMarker(page,type,destination){
 const info=diagnosticPages.get(page)
 recordDiagnostic({type,time:Date.now(),page:info?.label,probe:info?.probe,
  url:page?.url(),...(destination?{destination}:{})})
}
async function diagnosticPage(context,label){
 const page=await context.newPage(),info={label,probe:null},requests=new WeakMap()
 diagnosticPages.set(page,info)
 const prefix='HH_RELATIONSHIPS_LIFECYCLE '
 page.on('console',message=>{
  if(!message.text().startsWith(prefix)){
   if(message.type()==='error')recordDiagnostic({type:'console-error',time:Date.now(),page:label,probe:info.probe,url:page.url(),kind:'console-error'})
   return
  }
  try{
   const event=JSON.parse(message.text().slice(prefix.length))
   if(event.type==='init'||event.type==='pageshow')info.probe=event.probe
   recordDiagnostic({page:label,...event})
  }catch(error){recordDiagnostic({type:'diagnostic-parse-error',page:label,kind:'diagnostic-error'})}
 })
 page.on('crash',()=>navigationMarker(page,'renderer-crash'))
 page.on('close',()=>navigationMarker(page,'page-close'))
 page.on('pageerror',error=>{
  errors.push(error.message)
  recordDiagnostic({type:'pageerror',time:Date.now(),page:label,probe:info.probe,
   url:page.url(),kind:'diagnostic-error',kind:'page-error'})
 })
 page.on('request',request=>{
  const url=new URL(request.url())
  // Include static scripts/styles/fonts: a document can finish while hydration
  // or load is blocked by an asset. Observe only this isolated test origin.
  if(url.origin!==origin)return
  const entry={id:++diagnosticRequestId,url:request.url(),method:request.method(),
   resourceType:request.resourceType(),isNavigationRequest:request.isNavigationRequest(),
   startedPageUrl:page.url(),startedProbe:info.probe}
  requests.set(request,entry)
  recordDiagnostic({type:'request',time:Date.now(),page:label,...entry})
 })
 page.on('response',response=>{
  const entry=requests.get(response.request());if(!entry)return
  recordDiagnostic({type:'response',time:Date.now(),page:label,...entry,
   pageUrl:page.url(),probe:info.probe,status:response.status()})
 })
 for(const type of ['requestfinished','requestfailed'])page.on(type,request=>{
  const entry=requests.get(request);if(!entry)return
  recordDiagnostic({type,time:Date.now(),page:label,...entry,
   pageUrl:page.url(),probe:info.probe,failure:request.failure()?.errorText||null})
 })
 await page.addInitScript(({prefix})=>{
  const probe=Math.random().toString(36).slice(2)
  const record=(type,extra={})=>console.debug(prefix+JSON.stringify({type,time:Date.now(),probe,
   url:location.href,readyState:document.readyState,hydrated:Boolean(history.state?.__NA),...extra}))
  record('init')
  for(const type of ['DOMContentLoaded','load','pageshow','pagehide','popstate'])
   addEventListener(type,event=>record(type,{persisted:Boolean(event.persisted)}))
  addEventListener('securitypolicyviolation',event=>record('csp-violation',{effectiveDirective:event.effectiveDirective,blockedURI:event.blockedURI,sourceFile:event.sourceFile,lineNumber:event.lineNumber}))
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
 if(context===pacedGuestContext)guestPacer.record('/api/app/'+path,body?'POST':'GET')
 const response=await context.request.fetch(origin+'/api/app/'+path,{method:body?'POST':'GET',headers:body?{Origin:origin,'Content-Type':'application/json'}:{},data:body})
 const value=await response.json();assert.ok(response.ok(),path+': '+JSON.stringify(value));return value
}
// Save scenarios belong to the authenticated picker, even when public pages
// share its presentational component. Start from a clean, explicitly empty draft.
async function openAccountRelationshipPicker(target){
 await navigate(target,origin+'/en/app/tests')
 await expect(target).toHaveURL(origin+'/en/app/tests')
 const dashboard=target.locator('[data-my-tests-dashboard]')
 await expect(dashboard).toBeVisible()
 const explorer=await openAccountTestPicker(target,expect)
 const browse=explorer.getByRole('button',{name:'Browse full database',exact:true})
 await expect(browse).toHaveCount(1)
 await browse.click()
 const customizer=explorer.locator('#hh-test-customizer')
 if(!(await customizer.isVisible())){
  const customize=explorer.locator('button[aria-controls="hh-test-customizer"]')
  await expect(customize).toHaveCount(1)
  await customize.click()
 }
 const reset=customizer.getByRole('button',{name:'Reset filters',exact:true})
 await expect(reset).toHaveCount(1)
 await reset.click()
 const checked=explorer.locator('article input[type="checkbox"]:checked')
 const names=await checked.evaluateAll(inputs=>inputs.map(input=>input.getAttribute('aria-label')))
 for(const [index,name]of names.entries()){
  const choice=explorer.getByRole('checkbox',{name,exact:true,checked:true})
  await expect(choice).toHaveCount(1)
  await choice.click()
  await expect(choice).toHaveCount(0)
  await expect.poll(async()=>(await checked.evaluateAll(inputs=>inputs.map(input=>input.getAttribute('aria-label')))).sort())
   .toEqual(names.slice(index+1).sort())
 }
 await expect(checked).toHaveCount(0)
 const back=explorer.getByRole('button',{name:'← Back to easy selection',exact:true})
 await expect(back).toHaveCount(1)
 await back.click()
 const picker=explorer.locator('[data-prelogin-test-picker]')
 await expect(picker).toHaveCount(1)
 await expect(picker).toBeVisible()
 await expect(picker.locator('[data-public-selected-tests] [data-selected-test-key]')).toHaveCount(0)
 return picker
}
async function relationshipChoice(picker,key){
 const choice=picker.locator('[data-test-match="'+key+'"] input[type="checkbox"]')
 // Expand the actual five-at-a-time list. A missing/ambiguous expansion fails.
 for(let batch=0;await choice.count()===0&&batch<Math.ceil(MONITORING_CATALOG.length/5);batch++){
  const more=picker.getByRole('button',{name:/^Show \d+ more tests$/})
  await expect(more).toHaveCount(1)
  const list=picker.locator('#hh-public-recommended-tests')
  const before=Number(await list.getAttribute('data-visible-test-count'))
  const batchSize=Number((await more.innerText()).match(/Show (\d+) more tests/)[1])
  assert.ok(Number.isInteger(before)&&before>0)
  assert.ok(batchSize>=1&&batchSize<=5)
  console.log('RELATIONSHIP_PICKER_EXPANSION',JSON.stringify({key,batch,before,batchSize}))
  await more.click()
  await expect(list).toHaveAttribute('data-visible-test-count',String(before+batchSize))
 }
 await expect(choice).toHaveCount(1)
 await expect(choice).toBeVisible()
 return choice
}
async function saveAccountRelationshipSelection(target,ctx,picker,definitions,preferences){
 await expect(target).toHaveURL(origin+'/en/app/tests')
 await expect(target.locator('#my-test-explorer [data-prelogin-test-picker]')).toHaveCount(1)
 const selected=picker.locator('[data-public-selected-tests] [data-selected-test-key]')
 await expect(selected).toHaveCount(definitions.length)
 assert.deepEqual(await selected.evaluateAll(nodes=>nodes.map(node=>node.dataset.selectedTestKey)),definitions.map(d=>d.key))
 const before=await api(ctx,'bootstrap'),owner=before.account.id
 const prior=before.activeTestPlan||(before.latestTestPlan?.status==='completed'?before.latestTestPlan:null)
 const expectedIds=[...new Set([...(prior?.definitionIds||[]),...definitions.map(d=>d.id)])]
 const accountWrites=[]
 const observe=request=>{
  const path=new URL(request.url()).pathname
  if(path.startsWith('/api/app/')&&!path.startsWith('/api/app/guest/')&&request.method()!=='GET')accountWrites.push(path)
 }
 target.on('request',observe)
 try{
 const saving=target.waitForResponse(response=>new URL(response.url()).pathname==='/api/app/test-plans'&&response.request().method()==='POST')
 const save=picker.getByRole('button',{name:'Add selected tests Save these tests to My tests',exact:true})
 await expect(save).toHaveCount(1)
 await expect(save).toBeEnabled()
 await save.click()
 const response=await saving
 assert.ok(response.ok())
 assert.equal(response.request().headers()['x-hh-account-id'],owner)
 const submitted=response.request().postDataJSON()
 assert.equal(submitted.appendActive,true)
 assert.equal(submitted.replaceActive,false)
 assert.deepEqual(submitted.items,definitions.map(d=>({definitionKey:d.key,definitionVersion:d.version,instrumentLocale:d.instrumentLocale})))
 assert.deepEqual(submitted.selectionPreferences,preferences)
 const plan=await response.json()
 assert.ok(plan.id)
 if(prior)assert.equal(plan.id,prior.id)
 assert.deepEqual(plan.definitionIds,expectedIds,'save appends only the explicitly selected definitions in exact order')
 assert.deepEqual(plan.completedRunIds,prior?.completedRunIds||[])
 assert.deepEqual(plan.selectionPreferences,preferences)
 await response.finished()
 await expect(target).toHaveURL(origin+'/en/app/tests?plan='+encodeURIComponent(plan.id))
 await expect(target.locator('#my-tests-list')).toBeVisible()
 await target.waitForLoadState('networkidle')
 // Read back the saved plan; a same-page append need not remount its loader.
 assert.deepEqual(await api(ctx,'test-plans/'+plan.id),plan)
 const reloading=target.waitForResponse(response=>new URL(response.url()).pathname==='/api/app/test-plans/'+plan.id&&response.request().method()==='GET')
 navigationMarker(target,'before-reload')
 await target.reload()
 await expect(target.locator('#my-tests-list')).toBeVisible()
 const reloaded=await reloading
 assert.ok(reloaded.ok())
 assert.deepEqual(await reloaded.json(),plan)
 await reloaded.finished()
 const after=await api(ctx,'bootstrap')
 assert.equal(after.account.id,owner)
 assert.deepEqual(after.activeTestPlan||after.latestTestPlan,plan)
 for(const key of ['runs','results'])assert.deepEqual(after[key],before[key],'saving choices preserves existing '+key)
 assert.deepEqual(accountWrites,['/api/app/test-plans'],'one explicit account save makes exactly one account mutation')
 return plan
 }finally{target.off('request',observe)}
}
// A public deep-link Start remains a guest launch with authenticated cookies.
// Check attempted writes as well as durable account state, including rejected POSTs.
async function launchPublicRelationshipGuest(target,ctx,definition){
 const before=await api(ctx,'bootstrap'),accountWrites=[],guestPlanWrites=[]
 const observe=request=>{
  const path=new URL(request.url()).pathname
  if(path.startsWith('/api/app/')&&!path.startsWith('/api/app/guest/')&&request.method()!=='GET')accountWrites.push(path)
  if(path==='/api/app/guest/test-plans'&&request.method()!=='GET')guestPlanWrites.push(path)
 }
 target.on('request',observe)
 try{
  await navigate(target,origin+'/en/client/tests?test='+definition.key)
  await expect(target).toHaveURL(origin+'/en/client/tests?test='+definition.key)
  const picker=target.locator('[data-prelogin-test-picker]')
  await expect(picker).toHaveCount(1)
  await expect(picker).toBeVisible()
  const selected=picker.locator('[data-public-selected-tests] [data-selected-test-key]')
  await expect(selected).toHaveCount(1)
  await expect(selected).toHaveAttribute('data-selected-test-key',definition.key)
  const start=picker.getByRole('button',{name:'Start free monitoring No registration required to start',exact:true})
  await expect(start).toHaveCount(1)
  await start.click()
  const guest=target.locator('#cabinet-tests')
  await expect(guest).toBeVisible()
  // The current public Start renders the selected Quick questionnaire directly.
  await expect(guest.locator('.hh-test-mode-picker')).toHaveCount(0)
  await expect(guest.getByRole('heading',{name:'Before you start',exact:true})).toHaveCount(0)
  const quick=guest.locator('.cabinet-quick-form')
  await expect(quick).toBeVisible()
  await expect(quick.locator('.cabinet-quick-question')).toHaveCount(definition.questions.length)
  await expect(quick.getByRole('heading',{level:3})).toHaveText(definition.questions.map(question=>question.text))
  await expect(quick.getByRole('heading',{name:definition.questions[0].text,exact:true})).toBeVisible()
  await target.waitForLoadState('networkidle')
  const guestState=await api(ctx,'guest/bootstrap')
  // CabinetLanding sends one selected definition directly to begin/startRun;
  // only a multi-test battery creates a guest plan. This cookie context is fresh.
  assert.equal(guestState.activeTestPlan,null)
  assert.deepEqual(guestPlanWrites,[],'a single public test must not create a guest battery')
  assert.deepEqual(guestState.runs.map(run=>run.definitionId),[definition.id])
  const [run]=guestState.runs
  assert.equal(run.definitionKey,definition.key)
  assert.equal(run.definitionVersion,definition.version)
  assert.equal(run.instrumentLocale,definition.instrumentLocale)
  assert.equal(run.contentHash,definition.contentHash)
  assert.deepEqual(run.answers,{})
  assert.equal(run.progress,0)
  assert.equal(run.status,'draft')
  assert.deepEqual(guestState.results,[])
  await expect(target).toHaveURL(origin+'/en/client?run='+encodeURIComponent(run.id))
  const after=await api(ctx,'bootstrap')
  assert.equal(after.account.id,before.account.id)
  for(const key of ['activeTestPlan','latestTestPlan','runs','results'])assert.deepEqual(after[key],before[key],'public guest launch preserves account '+key)
  assert.deepEqual(accountWrites,[],'public Start must never attempt account writes or Google sign-in')
 }finally{target.off('request',observe)}
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
 await readEveryAccountScale(report,expect,d.scoring.dimensions.map(dimension=>dimension.key))
 const context=report.locator('[data-assessment-context]')
 await expect(context).toBeVisible()
 await expect(context).toContainText(locale==='ru'?'Экспериментальные авторские анкеты':'Original experimental Holistic House')
 await expect(context).toContainText(locale==='ru'?'без клинической валидации':'not clinically validated')
 await expect(context).toContainText(locale==='ru'?'согласие':'consent')
 await context.scrollIntoViewIfNeeded()
 }
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
   if(resources)await (await publicTopicButton(picker,locale,locale==='ru'?'Внутренняя опора':'Self-support')).click()
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
  await expect(page).toHaveURL(origin+'/'+locale+'/explore/relationships')
  const journey=page.locator('[data-topic-journey="relationships"]')
  await expect(journey.getByRole('heading',{name:locale==='ru'?'Отношения и близость':'Relationships & intimacy',level:1,exact:true})).toBeVisible()
  const choices=journey.locator('[data-topic-choice]')
  await expect(choices).toHaveCount(4)
  assert.deepEqual(await choices.evaluateAll(nodes=>nodes.map(n=>n.dataset.topicChoice)),['trust','boundaries','conflict','presence'])
  const actions=journey.locator('[data-topic-action]')
  await expect(actions).toHaveCount(5)
  assert.deepEqual(await actions.evaluateAll(nodes=>nodes.map(n=>n.dataset.topicAction)),['tests','browse','course','review','consultation'])
  // Owner #996 adds an optional public service action; it does not replace the free paths.
  const consultationAction=journey.locator('a[data-topic-action="consultation"]')
  await expect(consultationAction).toHaveCount(1)
  await expect(consultationAction).toBeVisible()
  await expect(consultationAction).toHaveAttribute('data-topic-service','relationships')
  await expect(consultationAction).toHaveAttribute('href','/'+locale+'/services/systemic-constellations')
  await expect(consultationAction.locator('strong')).toHaveText(locale==='ru'?'Обсудить тему лично с Андреем':'Discuss this topic with Andrey')
  await expect(consultationAction.locator('small')).toHaveText(locale==='ru'
   ?'Необязательная сессия независимо от баллов теста: €50 / 30 мин или €100 / 60 мин.'
   :'Optional personal session, independent of your test scores. €50 / 30 min or €100 / 60 min.')
  const testsAction=journey.locator('button[data-topic-action="tests"]')
  await expect(testsAction).toHaveAttribute('type','button')
  await expect(testsAction).toBeEnabled()
  await expect(journey.locator('[data-recommended-test]')).toHaveCount(2)
  const browseAction=journey.locator('[data-topic-action="browse"]')
  const testsFocus=async()=>new URL(await browseAction.getAttribute('href'),origin).searchParams.get('focus').split(',')
  assert.deepEqual(await testsFocus(),['relationships','intimacy'])
  const courseAction=journey.locator('[data-topic-action="course"]')
  await expect(browseAction).toHaveAttribute('href','/'+locale+'/client/tests?focus=relationships%2Cintimacy&journey=relationships&topics=&catalog=full')
  await expect(courseAction).toHaveAttribute('href','/'+locale+'/client/tests?focus=relationships%2Cintimacy&journey=relationships&topics=&mode=course')
  await expect(journey.locator('[data-topic-action="review"]')).toHaveAttribute('href','/'+locale+'/services/free-situation-review')
  const boundaries=journey.locator('[data-topic-choice="boundaries"]')
  await boundaries.focus();await boundaries.press('Space')
  await expect(boundaries).toHaveAttribute('aria-pressed','true')
  assert.deepEqual(await testsFocus(),['relationships','sexuality'])
  await boundaries.press('Space')
  await expect(boundaries).toHaveAttribute('aria-pressed','false')
  assert.deepEqual(await testsFocus(),['relationships','intimacy'])
  await boundaries.press('Space')
  await expect(boundaries).toHaveAttribute('aria-pressed','true')
  assert.deepEqual(await testsFocus(),['relationships','sexuality'])
  await expect(browseAction).toHaveAttribute('href','/'+locale+'/client/tests?focus=relationships%2Csexuality&journey=relationships&topics=boundaries&catalog=full')
  await expect(courseAction).toHaveAttribute('href','/'+locale+'/client/tests?focus=relationships%2Csexuality&journey=relationships&topics=boundaries&mode=course')
  await browseAction.click()
  await expect(page).toHaveURL(new RegExp('/'+locale+'/client/tests\\?focus='),{timeout:15000})
  assert.deepEqual(new URL(page.url()).searchParams.get('focus').split(','),['relationships','sexuality'])
  assert.equal(new URL(page.url()).searchParams.get('journey'),'relationships')
  assert.equal(new URL(page.url()).searchParams.get('topics'),'boundaries')
  assert.equal(new URL(page.url()).searchParams.has('mode'),false)
  assert.equal(new URL(page.url()).searchParams.get('catalog'),'full')
  // Server-rendered controls may be visible before route chunks hydrate.
  // Match the existing navigate/course-route readiness contract before clicking.
  await page.waitForLoadState('networkidle')
  const easySelection=page.getByRole('button',{name:locale==='ru'?'← Назад к простому подбору':'← Back to easy selection',exact:true})
  await expect(easySelection).toBeVisible()
  await expect(page.locator('article input[type="checkbox"]').first()).toBeVisible()
  await easySelection.click()
  const focusedPicker=page.locator('[data-prelogin-test-picker]')
  await expect(focusedPicker).toBeVisible()
  await expect(await publicTopicButton(focusedPicker,locale,locale==='ru'?'Отношения':'Relationships')).toHaveAttribute('aria-pressed','true')
  await expect(focusedPicker.getByRole('button',{name:locale==='ru'?'Убрать фильтр: Сексуальное благополучие и согласие':'Remove filter: Sexual wellbeing & consent',exact:true})).toBeVisible()
  await expect(focusedPicker.locator('[data-recommendation-mode]')).toHaveAttribute('data-recommendation-mode','tests')
  await expect(focusedPicker.locator('[data-test-start-mode]')).toHaveAttribute('data-test-start-mode','tests')
  await expect(focusedPicker.locator('[data-test-course-switch]')).toHaveCount(0)
  const assertBoundaryConcerns=async()=>{
   await expect(focusedPicker.locator('[data-problem-key="boundaries"]')).toHaveAttribute('aria-pressed','true')
   await expect(focusedPicker.locator('[data-problem-key="consent-pressure"]')).toHaveAttribute('aria-pressed','true')
  }
  await assertBoundaryConcerns()
  await navigate(page,origin+'/'+locale+'/relationships')
  await expect(journey).toBeVisible()
  await boundaries.click()
  await expect(boundaries).toHaveAttribute('aria-pressed','true')
  const courseDestination=origin+'/'+locale+'/client/tests?focus=relationships%2Csexuality&journey=relationships&topics=boundaries&mode=course'
  await expect(courseAction).toHaveAttribute('href',courseDestination.slice(origin.length))
  await courseAction.click()
  await expect(page).toHaveURL(courseDestination,{timeout:20000})
  // The mode is server-rendered; wait for route resources before interacting.
  await page.waitForLoadState('networkidle')
  await assertBoundaryConcerns()
  // The direct course URL selects the action; the owner removed the mode switch.
  await expect(focusedPicker.locator('[data-test-course-switch]')).toHaveCount(0)
  const directCourseAction=focusedPicker.locator('[data-test-start-mode]')
  await expect(directCourseAction).toHaveCount(1)
  await expect(directCourseAction).toHaveAttribute('data-test-start-mode','course')
  await expect(directCourseAction).toBeVisible()
  await expect(directCourseAction).toBeEnabled()
  await expect(directCourseAction).toContainText(locale==='ru'?'Начать персональный курс':'Start my personal course')
  await assertBoundaryConcerns()
  await navigate(page,origin+'/'+locale+'/relationships')
  await expect(journey).toBeVisible()
  for(const width of [320,360,390,430,768,1280]){
   await page.setViewportSize({width,height:844})
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),locale+' hub overflow at '+width)
   if(width<768)await expect(page.locator('.mobile-bottom-navigation a')).toHaveCount(6)
   await page.screenshot({path:output+'/hub-'+locale+'-'+width+'.png',fullPage:false})
  }
  await page.setViewportSize({width:390,height:844})
  // Keyboard activation also works when Next's development-only badge overlaps Home.
  const home=page.locator('.mobile-bottom-navigation [data-nav-item="home"]')
  const homePath=locale==='ru'?'/ru':'/'
  await expect(home).toHaveAttribute('href',homePath)
  await home.focus()
  await home.press('Enter')
  // Await the actual route commit; cold Next compilation can outlast the default assertion window.
  await expect(page).toHaveURL(origin+homePath,{timeout:20000})
  await page.waitForLoadState('networkidle')
  const spotlight=page.locator('[data-home-topic-journeys] [data-topic-id="relationships"]')
  await expect(spotlight).toBeVisible()
  await spotlight.locator('a[href="/'+locale+'/explore/relationships"]').click()
  await expect(page).toHaveURL(origin+'/'+locale+'/explore/relationships')
  await expect(journey).toBeVisible()
  passed(locale+' theme journey: legacy redirect, four reversible themes, four actions, full catalog and easy-picker handoff, six mobile slots, 320–1280px and home route')
  for(const entry of RELATIONSHIPS_INTIMACY_CATALOG){
   await navigate(page,origin+'/'+locale+'/client/tests?test='+entry.key)
   const picker=page.locator('[data-prelogin-test-picker]')
   await expect(picker).toBeVisible()
   // Wait for the URL-driven selection effect before leaving the easy picker.
   const pendingChoice=picker.locator('[data-public-selected-tests] [data-selected-test-key]')
   await expect(pendingChoice).toHaveCount(1)
   await expect(pendingChoice).toHaveAttribute('data-selected-test-key',entry.key)
   await picker.getByRole('button',{name:locale==='ru'?'Открыть всю базу тестов':'Browse full database',exact:true}).click()
   const chosen=page.locator('article').filter({has:page.locator('input[type="checkbox"]:checked')})
   await expect(chosen).toHaveCount(1)
   await expect(chosen).toContainText(entry.title[locale])
   assert.equal(new URL(page.url()).searchParams.get('test'),entry.key)
  }
  passed(locale+' all eight deep links select exactly their intended questionnaire')
 }
 // A real keyboard selection remains reversible without changing the chosen ID.
 // Keep the deselected row rendered so keyboard focus remains testable after sorting.
 const showAll=page.getByRole('button',{name:/^(Show all matching tests|Показать все подходящие тесты)/})
 if(await showAll.count())await showAll.click()
 const selected=page.locator('article input[type="checkbox"]:checked')
 const selectedName=await selected.getAttribute('aria-label')
 const selectedCheckbox=page.getByRole('checkbox',{name:selectedName,exact:true})
 await selectedCheckbox.focus()
 await page.keyboard.press('Space')
 await expect(page.locator('article input[type="checkbox"]:checked')).toHaveCount(0)
 await selectedCheckbox.focus()
 await page.keyboard.press('Space')
 await expect(page.locator('article input[type="checkbox"]:checked')).toHaveCount(1)
 await expect(page.locator('article input[type="checkbox"]:checked')).toHaveAttribute('aria-label',selectedName)
 navigationMarker(page,'before-public-context-close')
 await publicContext.close()
 const account=await browser.newContext({viewport:{width:390,height:844}})
 page=await diagnosticPage(account,'account')
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
 // Exercise the primary topic action through the existing isolated auth and plan API.
 // This is a button that saves its two recommendations, not the full-catalog link.
 const relationshipJourney=TOPIC_JOURNEYS.find(journey=>journey.id==='relationships')
 for(const locale of ['en','ru']){
  await navigate(page,origin+'/'+locale+'/explore/relationships')
  const journey=page.locator('[data-topic-journey="relationships"]')
  await journey.locator('[data-topic-choice="boundaries"]').click()
  const expected=buildTopicTestSuggestions(relationshipJourney,locale).boundaries
  assert.equal(expected.length,2)
  await expect(journey.locator('[data-recommended-test]')).toHaveCount(2)
  assert.deepEqual(await journey.locator('[data-recommended-test]').evaluateAll(nodes=>nodes.map(n=>n.dataset.recommendedTest)),expected.map(item=>item.key))
  const before=await api(account,'bootstrap'),owner=before.account.id
  const expectedIds=expected.map(item=>getAssessmentDefinition(item.definition.key,item.definition.version,item.definition.instrumentLocale).id)
  const saving=page.waitForResponse(r=>r.url().endsWith('/api/app/test-plans')&&r.request().method()==='POST')
  const loading=page.waitForResponse(r=>/\/api\/app\/test-plans\/[^/?]+$/.test(r.url())&&r.request().method()==='GET')
  await journey.locator('button[data-topic-action="tests"]').click()
  const response=await saving
  assert.ok(response.ok())
  assert.equal(response.request().headers()['x-hh-account-id'],owner)
  const submitted=response.request().postDataJSON()
  assert.equal(submitted.appendActive,true)
  assert.deepEqual(submitted.items,expected.map(item=>({definitionKey:item.definition.key,definitionVersion:item.definition.version,instrumentLocale:item.definition.instrumentLocale})))
  assert.deepEqual(submitted.selectionPreferences,{focus:journeyFocusForTopics(relationshipJourney,['boundaries']),problems:journeyProblemsForTopics(relationshipJourney,['boundaries'])})
  const plan=await response.json()
  assert.ok(plan.id)
  assert.ok(expectedIds.every(id=>plan.definitionIds.includes(id)))
  assert.ok((before.activeTestPlan?.definitionIds||[]).every(id=>plan.definitionIds.includes(id)))
  await expect(page).toHaveURL(origin+'/'+locale+'/app/tests?plan='+encodeURIComponent(plan.id),{timeout:20000})
  await expect(page.locator('#my-tests-list')).toBeVisible()
  const loaded=await loading
  assert.ok(loaded.ok());assert.equal((await loaded.json()).id,plan.id)
  await loaded.finished()
  const saved=await api(account,'bootstrap')
  assert.equal(saved.account.id,owner)
  assert.equal(saved.activeTestPlan.id,plan.id)
  assert.deepEqual(saved.activeTestPlan.definitionIds,plan.definitionIds)
  assert.deepEqual(saved.activeTestPlan.selectionPreferences.focus,submitted.selectionPreferences.focus)
  assert.deepEqual(saved.activeTestPlan.selectionPreferences.problems,submitted.selectionPreferences.problems)
  passed(locale+' suggested-tests button saves exactly the displayed definitions with owner-bound preferences and opens the saved private plan')
 }
 for(const [i,base] of defs.entries()){
  const locale=i%2?'ru':'en',mode=i%2?'guided':'quick',d=localized(base.key,locale)
  const run=await api(account,'runs',{definitionKey:d.key,definitionVersion:'v1',instrumentLocale:d.instrumentLocale,operationId:randomUUID()})
  await navigate(page,origin+'/'+locale+'/app/runs/'+run.id+'?mode='+mode)
  await assertQuestionnaireMode(page,expect,{mode,guest:false,definition:d})
  await fill(page,d,mode,false,locale)
  const data=await api(account,'bootstrap'),result=data.results.find(r=>r.runId===run.id)
  assert.ok(result);assert.equal(result.contentHash,d.contentHash)
  assert.deepEqual(result.dimensions.map(x=>x.value),[1.67,2])
  await assertAccountScaleReport(page,expect,result,locale)
  await page.waitForLoadState('networkidle')
  navigationMarker(page,'before-reload')
  await page.reload()
  await expect(page.locator('[data-personal-result-report]')).toBeVisible()
  passed(d.key+' account '+locale+' '+mode+': save, original items, score, report and reload')
 }
 const picker=await openAccountRelationshipPicker(page)
 await (await publicTopicButton(picker,'en','Relationships')).click()
 const voluntary=await relationshipChoice(picker,'hh-love-affection')
 await expect(voluntary).not.toBeChecked()
 await voluntary.check()
 const selectedAccountTest=picker.locator('[data-public-selected-tests] [data-selected-test-key]')
 await expect(selectedAccountTest).toHaveCount(1)
 await expect(selectedAccountTest).toHaveAttribute('data-selected-test-key','hh-love-affection')
 await (await publicTopicButton(picker,'en','Relationships')).click()
 await (await publicTopicButton(picker,'en','Self-support')).click()
 await expect(await publicTopicButton(picker,'en','Relationships')).toHaveAttribute('aria-pressed','false')
 await expect(await publicTopicButton(picker,'en','Self-support')).toHaveAttribute('aria-pressed','true')
 await expect(await relationshipChoice(picker,'hh-love-affection')).toBeChecked()
 await expect(selectedAccountTest).toHaveCount(1)
 await expect(selectedAccountTest).toHaveAttribute('data-selected-test-key','hh-love-affection')
 const selectionPreferences={focus:['resources'],problems:[],details:[],axes:[],areas:[],styles:[],kinds:[],lengths:[],depth:'balanced',maxMinutes:0,language:'any',tracking:'any',freeOnly:false}
 const voluntaryPlan=await saveAccountRelationshipSelection(page,account,picker,[localized('hh-love-affection','en')],selectionPreferences)
 assert.ok(voluntaryPlan.definitionIds.includes(localized('hh-love-affection','en').id))
 assert.ok(!voluntaryPlan.definitionIds.includes(localized('hh-sexual-self-kindness','en').id))
 passed('explicit relationship choice survives broader filters, exact owner-bound private plan saving and reload without adding other intimate forms')
 await launchPublicRelationshipGuest(page,account,localized('hh-love-affection','en'))
 passed('signed-in public deep link starts exactly the intended guest questionnaire with zero account writes and unchanged private plan')
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
  await assertCabinetPortrait(page, expect, { origin, locale })
  await openCabinetMyTests(page, expect, { origin, locale })
  const file=await downloadAccountReport(page,locale),bytes=await readFile(await file.path())
  assert.equal(bytes.subarray(0,8).toString(),'%PDF-1.4');assert.ok(bytes.length>12000)
  await file.saveAs(output+'/report-'+locale+'.pdf')
  passed(locale+' PDF download includes persisted experimental relationship report model')
 }
 // One consented guest owns all eight result journeys. Keep the earlier signed-in
 // public-launch isolation fixture separate, and retain the unchanged IP quota.
 // Only this claim-probe context blocks SWs so its synthetic 409 cannot reach auth.
 const guest=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'})
 await api(guest,'guest/session',{adult:true,necessary:true,uiLocale:'ru',timezone:'UTC'})
 pacedGuestContext=guest
 guest.on('request',request=>{
  const url=new URL(request.url())
  if(url.origin===origin&&url.pathname.startsWith('/api/app/guest/'))guestPacer.record(url.pathname,request.method())
 })
 const guestPlanIds=new Set(),guestRunIds=new Set(),guestResultIds=new Set(),guestJourneys=[]
 for(const [i,base] of defs.entries()){
  const locale=i%2?'en':'ru',mode=i%2?'quick':'guided',d=localized(base.key,locale)
  // Close each page, then allow the prior guest request window to expire naturally.
  await guestPacer.beforeScenario(d.key)
  if(i===0){
   const initial=await api(guest,'guest/bootstrap')
   assert.deepEqual(initial.runs,[]);assert.deepEqual(initial.results,[])
  }
  const plan=await api(guest,'guest/test-plans',{items:[{definitionKey:d.key,definitionVersion:'v1',instrumentLocale:d.instrumentLocale}],operationId:randomUUID()})
  assert.ok(!guestPlanIds.has(plan.id),'each journey creates a fresh plan')
  guestPlanIds.add(plan.id)
  assert.deepEqual(plan.definitionIds,[d.id]);assert.deepEqual(plan.completedRunIds,[])
  page=await diagnosticPage(guest,'guest-'+d.key+'-'+locale)
  await navigate(page,origin+'/'+locale+'/client?plan='+plan.id)
  await enterGuestQuestionnaireMode(page,expect,{mode,definition:d})
  const started=await api(guest,'guest/bootstrap')
  assert.equal(started.activeTestPlan?.id,plan.id)
  assert.equal(started.runs.length,1,'only this plan has an unfinished run')
  const [run]=started.runs
  assert.ok(!guestRunIds.has(run.id),'each journey starts a fresh run')
  guestRunIds.add(run.id)
  for(const [key,value] of Object.entries({definitionId:d.id,definitionKey:d.key,definitionVersion:d.version,instrumentLocale:locale,contentHash:d.contentHash}))assert.equal(run[key],value,key)
  assert.deepEqual(run.answers,{});assert.equal(run.progress,0);assert.equal(run.status,'draft')
  await fill(page,d,mode,true,locale)
  const data=await api(guest,'guest/bootstrap'),matching=data.results.filter(r=>r.runId===run.id)
  assert.equal(matching.length,1,'this exact fresh run persists one result')
  const [result]=matching
  assert.ok(!guestResultIds.has(result.id),'each journey retains a distinct result')
  guestResultIds.add(result.id)
  assert.equal(result.definitionId,d.id);assert.equal(result.definitionKey,d.key);assert.equal(result.definitionVersion,d.version)
  assert.deepEqual(result.dimensions.map(x=>x.value),[1.67,2])
  assert.equal(result.instrumentLocale,locale);assert.equal(result.contentHash,d.contentHash)
  await assertGuestScaleResult(page,expect,result,locale)
  const completed=await api(guest,'guest/test-plans/'+plan.id)
  assert.equal(completed.status,'completed');assert.deepEqual(completed.completedRunIds,[run.id])
  assert.deepEqual(completed.definitionIds,[d.id])
  guestJourneys.push({definitionKey:d.key,definitionVersion:d.version,instrumentLocale:locale,mode,planId:plan.id,runId:run.id,resultId:result.id})
  passed(d.key+' guest '+locale+' '+mode+': private consented runner, exact scales and item-scoped optional analysis')
  await page.waitForLoadState('networkidle')
  navigationMarker(page,'before-guest-page-close')
  await page.close()
  guestPacer.settled()
 }
 const guestResults=(await api(guest,'guest/bootstrap')).results
 assert.equal(guestPlanIds.size,defs.length);assert.equal(guestRunIds.size,defs.length);assert.equal(guestResultIds.size,defs.length)
 assert.equal(guestResults.length,defs.length)
 assert.ok(guestResults.every(result=>guestResultIds.has(result.id)))
 assert.deepEqual(guestResults.map(result=>result.definitionKey).sort(),defs.map(d=>d.key).sort())
 await guest.close()
 assert.deepEqual(errors,[])
 await writeFile(output+'/verification.json',JSON.stringify({commit:process.env.GITHUB_SHA,browser:await browser.version(),checks,guestSessions:2,guestPublicLaunchSessions:1,guestJourneySessions:1,guestResults:guestResults.length,guestJourneys,auth:'ISOLATED_PROVIDER_PROTOCOL_DOUBLE_NOT_GOOGLE',production:'UNCHANGED'},null,2))
} catch(error){
 await page?.screenshot({path:output+'/failure.png',fullPage:false}).catch(()=>{})
 await writeFile(output+'/verification.json',JSON.stringify({commit:process.env.GITHUB_SHA,checks,failure:error.message},null,2));throw error
} finally{
 navigationMarker(page,'before-final-browser-close')
 try{await browser.close()}finally{
  await writeFile(output+'/navigation-diagnostics.json',JSON.stringify({commit:process.env.GITHUB_SHA,events:navigationDiagnostics},null,2))
 }
}
