/**
 * Canonical Next page + synthetic, account-scoped API acceptance.
 * This checks rendered UI and client persistence/retry wiring, not real OAuth,
 * hosted database writes, purchases, a physical iPhone, or a production release.
 * Reuses installed Playwright/browser binaries; never installs a browser.
 *
 * HH_GUIDE_QA_ORIGIN=http://127.0.0.1:4319 CHROMIUM_EXECUTABLE_PATH=/tmp/chromium
 *   node tests/daybook-guide.browser.mjs
 * Without an origin, starts the existing Next app locally on HH_GUIDE_QA_PORT.
 */
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {createRequire} from 'node:module'
import {once} from 'node:events'
import {existsSync} from 'node:fs'
import {mkdir,mkdtemp,writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {dirname,join,resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {randomUUID} from 'node:crypto'
import {journalWrite} from '../lib/app/daybook-journal-contract.mjs'
import {STAGES,stageTag,stageText} from '../lib/app/daybook-stages.mjs'
import {GUIDE_WEEKS,guideTag,guideText,parseGuideEntry,guideProgress} from '../lib/app/daybook-guide.mjs'
import {personalGoalWrite,preserveGoalVectorSelection} from '../lib/app/daybook-personal-goal-contract.mjs'
import {VECTOR_SELECTION_VERSION} from '../lib/app/daybook-vector-selection.mjs'

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),require=createRequire(import.meta.url)
const playwright=(()=>{
 for(const candidate of ['playwright',process.env.HH_GUIDE_PLAYWRIGHT_PACKAGE,process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES&&join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'playwright'),'/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'].filter(Boolean)){
  try{return require(candidate)}catch{}
 }
 throw Error('PLAYWRIGHT_NOT_AVAILABLE: use an existing runtime; this acceptance does not install dependencies.')
})()
const engine=process.env.HH_GUIDE_QA_ENGINE||'chromium'
assert.ok(['chromium','webkit'].includes(engine),'Unsupported browser engine')
const executable=engine==='chromium'?[process.env.CHROMIUM_EXECUTABLE_PATH,playwright.chromium.executablePath(),'/usr/lib/chromium/chromium','/tmp/chromium'].filter(Boolean).find(existsSync):undefined
assert.ok(engine==='chromium'?executable:existsSync(playwright.webkit.executablePath()),'BROWSER_NOT_AVAILABLE: use an already installed browser; no installation is performed.')
const port=Number(process.env.HH_GUIDE_QA_PORT||4319)
assert.ok(Number.isInteger(port)&&port>=1024&&port<=65535)
const origin=process.env.HH_GUIDE_QA_ORIGIN||'http://127.0.0.1:'+port
assert.ok(['localhost','127.0.0.1','[::1]'].includes(new URL(origin).hostname),'Synthetic fixture acceptance only runs against a local app.')
const screenshotDir=process.env.HH_GUIDE_QA_SCREENSHOT_DIR||await mkdtemp(join(tmpdir(),'daybook-guide-browser-'))
await mkdir(screenshotDir,{recursive:true})
const locales=(process.env.HH_GUIDE_QA_LOCALES||'ru,en,es').split(',')
assert.ok(locales.every(locale=>['ru','en','es'].includes(locale)))
const receipts=[]
const vectorCopy={
 en:{goals:'Goals',guide:'Coaching guide',new:'Create a new goal',next:'Next',review:'See my direction',save:'Save my goal',done:'Open my goals'},
 ru:{goals:'Цели',guide:'Коучинг-гид',new:'Создать новую цель',next:'Дальше',review:'Посмотреть мой вектор',save:'Сохранить мою цель',done:'К моим целям'},
 es:{goals:'Objetivos',guide:'Guía de coaching',new:'Crear una nueva meta',next:'Siguiente',review:'Ver mi dirección',save:'Guardar mi meta',done:'Abrir mis metas'},
}
let server,browser,serverLog='',activeErrors=[]

async function until(check,message,timeout=20000){
 const end=Date.now()+timeout
 while(Date.now()<end){if(await check())return;await new Promise(resolve=>setTimeout(resolve,100))}
 throw Error(message)
}
function entry(body){const value={...body,revision:body.revision+1,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};delete value.operationId;return value}

try{
 if(!process.env.HH_GUIDE_QA_ORIGIN){
  server=spawn(process.execPath,[join(root,'node_modules/next/dist/bin/next'),'dev','--hostname','127.0.0.1','--port',String(port)],{cwd:root,env:{...process.env,NEXT_TELEMETRY_DISABLED:'1'},stdio:['ignore','pipe','pipe']})
  const receive=chunk=>{serverLog=(serverLog+String(chunk)).slice(-20000)}
  server.stdout.on('data',receive);server.stderr.on('data',receive)
  await until(()=>serverLog.includes('Ready in')||server.exitCode!==null,'Next startup timed out',45000)
  assert.equal(server.exitCode,null,'Next server exited before acceptance')
 }
 browser=await playwright[engine].launch(engine==='chromium'?{headless:true,executablePath:executable,args:['--no-sandbox','--disable-dev-shm-usage'] }:{headless:true})
 for(const locale of locales){
  let owner=randomUUID(),loseCompleteReply=locale==='ru',revoked=false
  const goal1=randomUUID(),goal2=randomUUID(),records=new Map(),writes=[],operationReceipts=new Map(),errors=[],unexpectedWrites=[],dialogs=[]
  const goals=new Map([[goal1,{id:goal1,title:'Synthetic goal A',status:'active'}],[goal2,{id:goal2,title:'Synthetic goal B',status:'active'}]])
  const goalWrites=[],goalReads=[],goalReceipts=new Map(),journalReads=[]
  const legacyId=randomUUID(),legacyAnswer='SYNTHETIC_LEGACY_OUTCOME'
  records.set(legacyId,entry({id:legacyId,revision:0,kind:'note',text:stageText(STAGES[1],{criteria:legacyAnswer},true),tags:[stageTag('vision')],locale,timezone:'America/Toronto',localDay:'2026-11-23',goalId:goal1}))
  const deepTask=GUIDE_WEEKS[2].steps[2],deepId=randomUUID(),deepAnswers=Object.fromEntries(deepTask.fields.map(field=>[field.id,field.type==='rating'?'6':'SYNTHETIC_DEEP_LINK '+field.id]))
  records.set(deepId,entry({id:deepId,revision:0,kind:'note',text:guideText({weekId:'plan',level:1,stepId:deepTask.id,answers:deepAnswers,completed:false}),tags:[guideTag('plan',1,deepTask.id)],locale,timezone:'America/Toronto',localDay:'2026-11-23',goalId:goal1}))
  const context=await browser.newContext({viewport:{width:390,height:844},locale:locale==='ru'?'ru-RU':locale==='es'?'es-ES':'en-CA',reducedMotion:'reduce'})
  const page=await context.newPage()
  page.setDefaultTimeout(20000)
  activeErrors=errors
  page.on('pageerror',error=>errors.push(error.message))
  page.on('dialog',dialog=>{dialogs.push({type:dialog.type(),message:dialog.message()});return dialog.type()==='beforeunload'?dialog.accept():dialog.dismiss()})
  await page.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort())
  await page.route('**/api/app/**',async route=>{
   const request=route.request(),url=new URL(request.url()),path=url.pathname.slice('/api/app/'.length),method=request.method()
   const reply=(body,status=200)=>route.fulfill({status,contentType:'application/json',headers:{'cache-control':'no-store'},body:JSON.stringify(body)})
   if(revoked)return reply({error:'ACCOUNT_REQUIRED'},401)
   if(path==='bootstrap')return reply({account:{id:owner,onboardingState:'active'},results:[],runs:[],requests:[],consents:[],services:[]})
   if(request.headers()['x-hh-account-id']!==owner)return reply({error:'ACCOUNT_CHANGED'},409)
   if(path==='coaching-life-plan'&&method==='GET')return reply({plan:{id:randomUUID()},goals:[...goals.values()],actions:[],domains:[],contextPermissions:[]})
   if(path==='personal-goals'){
    if(method==='GET'){
     const id=url.searchParams.get('id');goalReads.push(id)
     return goals.has(id)?reply({goal:goals.get(id)}):reply({error:'NOT_FOUND'},404)
    }
    if(['POST','PATCH'].includes(method)){
     try{
      const input=personalGoalWrite(request.postDataJSON()),previous=goals.get(input.id),receipt=goalReceipts.get(input.operationId)
      goalWrites.push(input)
      if(receipt){assert.deepEqual(receipt.input,input);return reply({saved:true,replayed:true,goal:receipt.goal})}
      if((previous?.revision||0)!==input.revision)return reply({error:'GOAL_REVISION_CONFLICT'},409)
      const goal={...preserveGoalVectorSelection(input,previous),revision:input.revision+1};delete goal.operationId
      goals.set(input.id,goal);goalReceipts.set(input.operationId,{input,goal})
      return reply({saved:true,goal})
     }catch(error){return reply({error:error.code||'SYNTHETIC_REQUEST_INVALID'},error.status||400)}
    }
   }
   if(path==='daybook-journal'){
    if(method==='GET'){
     const id=url.searchParams.get('id')
     if(id){journalReads.push(id);return records.has(id)?reply({entry:records.get(id)}):reply({error:'NOT_FOUND'},404)}
     const all=[...records.values()].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)),limit=Number(url.searchParams.get('limit')||30)
     const before=url.searchParams.get('before'),start=before?all.findIndex(value=>value.id===before)+1:0,rows=all.slice(start,start+limit)
     return reply({entries:rows,nextCursor:all.length>start+limit?rows.at(-1).id:null})
    }
    if(['POST','PATCH'].includes(method)){
     try{
      const input=journalWrite(request.postDataJSON()),receipt=operationReceipts.get(input.operationId)
      writes.push(input)
      if(receipt){assert.deepEqual(receipt.input,input);return reply({saved:true,replayed:true,entry:receipt.entry})}
      if((records.get(input.id)?.revision||0)!==input.revision)return reply({error:'JOURNAL_REVISION_CONFLICT'},409)
      const saved=entry(input)
      records.set(input.id,saved);operationReceipts.set(input.operationId,{input,entry:saved})
      if(loseCompleteReply&&parseGuideEntry(saved)?.completed){loseCompleteReply=false;return reply({error:'SERVICE_UNAVAILABLE'},503)}
      return reply({saved:true,entry:saved})
     }catch(error){return reply({error:error.code||'SYNTHETIC_REQUEST_INVALID'},error.status||400)}
    }
   }
   if(method!=='GET')unexpectedWrites.push(path)
   return reply({error:'SYNTHETIC_ENDPOINT_NOT_CONFIGURED'},404)
  })
  const guide=page.locator('[data-daybook-guide]'),task=guide.locator('[data-guide-task]')
  const goalSelect=guide.locator('select').first()
  const week=n=>guide.locator('[data-guide-weeks] [data-guide-week="'+n+'"]')
  const level=n=>guide.locator('[data-guide-levels] [data-guide-level="'+n+'"]')
  const step=id=>guide.locator('[data-guide-steps] [data-guide-step="'+id+'"]')
  const action=kind=>guide.locator('[data-guide-action="'+kind+'"]')
  const mySpace=page.locator('main a[href="/'+locale+'/app/portrait"]').first()
  await page.goto(origin+'/'+locale+'/app/daybook',{waitUntil:'domcontentloaded',timeout:120000})
  await guide.waitFor({state:'visible'})
  // Exclude only Next's development toolbar, not any product control.
  await page.addStyleTag({content:'nextjs-portal { display:none !important; }'})
  await until(async()=>{assert.deepEqual(errors,[],`${locale}: runtime errors while loading goals`);return await goalSelect.locator('option').count()>=3},'Saved goals did not load')
  await goalSelect.selectOption(goal1)
  await step(GUIDE_WEEKS[0].steps[0].id).click()
  assert.equal(await week(1).getAttribute('aria-pressed'),'true')
  assert.equal(await guide.locator('[data-guide-weeks] button').count(),7)
  assert.equal(await guide.locator('[data-guide-levels] button').count(),4)
  assert.equal(await guide.locator('[data-guide-steps] button').count(),7)
  assert.equal(await page.locator('[data-daybook-inline-help]').isVisible(),true)
  assert.equal(await page.locator('[data-daybook-workspace-nav]').count(),0,'Course screens must not render the workspace tab strip')
  assert.equal(await page.locator('main > nav:visible').count(),0,'Course screens must not show secondary navigation')
  assert.equal(await action('complete').isDisabled(),true,'An empty step must not be completable')

  for(const width of [320,354,390,430,768,1024]){
   await page.setViewportSize({width,height:844})
   const geometry=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:document.documentElement.clientWidth}))
   assert.ok(geometry.scroll<=geometry.width+1,`${locale}/${width}: document overflow ${JSON.stringify(geometry)}`)
   for(const rail of ['weeks']){
    const boxes=await guide.locator('[data-guide-'+rail+'] button').evaluateAll(nodes=>nodes.map(node=>{const r=node.getBoundingClientRect();return {y:r.y,height:r.height,width:r.width}}))
    assert.ok(boxes.every(box=>Math.abs(box.y-boxes[0].y)<=1),`${locale}/${width}/${rail}: rail wraps`)
    assert.ok(boxes.every(box=>box.height>=44&&box.width>=44),`${locale}/${width}/${rail}: target smaller than 44 CSS pixels`)
   }
   const rows=await guide.locator('[data-guide-steps] > div > button').evaluateAll(nodes=>nodes.map(node=>{const r=node.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}}))
   assert.equal(rows.length,7);assert.ok(rows.every((row,index)=>row.height>=44&&row.width>=44&&(!index||row.y>rows[index-1].y)))
   assert.equal(await guide.locator('[data-guide-level="3"]').innerText().then(s=>s.includes('50 XP')),true)
   assert.equal(await guide.locator('[data-guide-level="2"]').innerText().then(s=>s.includes('20 XP')),true)
   assert.equal(await guide.locator('[data-guide-level="4"]').innerText().then(s=>s.includes('1000 XP')),true)
   const sizes=await task.locator('input,textarea,select').evaluateAll(nodes=>nodes.map(node=>parseFloat(getComputedStyle(node).fontSize)))
   assert.ok(sizes.every(size=>size>=16),`${locale}/${width}: input font smaller than 16px`)
   await guide.screenshot({path:join(screenshotDir,engine+'-'+locale+'-'+width+'.png')})
  }
  await page.setViewportSize({width:390,height:844})
  console.log(JSON.stringify({locale,checkpoint:'responsive-rails-passed'}))
  await week(7).click();assert.equal(await week(7).getAttribute('aria-pressed'),'true')
  await week(1).click()
  await level(1).focus();await page.keyboard.press('Enter')
  assert.equal(await level(1).getAttribute('aria-pressed'),'true')

  async function fillCurrent(weekIndex,prefix){
   for(const field of GUIDE_WEEKS[weekIndex].steps[0].fields){
    const control=task.getByLabel(field.label[locale],{exact:false})
    if(field.type==='rating')await control.selectOption('6')
    else await control.fill(prefix+' '+field.id)
   }
  }
  await fillCurrent(0,'SYNTHETIC_A')
  await action('save').click()
  await until(async()=>writes.length>0&&await action('save').count()>0&&!await action('save').isDisabled(),'Draft save did not settle')
  await until(()=>[...records.values()].some(value=>parseGuideEntry(value)?.week==='discover'),'Draft record was not written')
  assert.equal(guideProgress([...records.values()],goal1,'discover').completed,0,'Saving a draft does not complete the step')
  await action('complete').click()
  if(locale==='ru'){
   await action('retry').waitFor({state:'visible'})
   assert.equal(await week(2).isDisabled(),true,'Unknown save outcome must lock navigation until retry')
   assert.equal(await guide.locator('[data-guide-progress]').getAttribute('data-completed'),'0','No confirmed completion before acknowledgement/readback')
   const beforeUrl=page.url(),beforeDialogs=dialogs.length
   await mySpace.click()
   assert.equal(page.url(),beforeUrl,'Unknown save outcome must also block the outer My Space link')
   assert.equal(dialogs.length,beforeDialogs,'Pending save is blocked without offering to discard its unknown outcome')
   const first=writes.at(-1)
   await action('retry').click()
   await until(()=>writes.length>=3,'Retry was not sent')
   assert.deepEqual(writes.at(-1),first,'Unknown outcome retry must reuse the identical operation')
  }
  await until(async()=>await guide.locator('[data-guide-progress]').getAttribute('data-completed')==='1','Completed step did not appear after verified readback')
  assert.equal(guideProgress([...records.values()],goal1,'discover').completed,1)
  assert.equal([...records.values()].filter(value=>parseGuideEntry(value)?.week==='discover').length,1,'Retries must not duplicate a step')
  console.log(JSON.stringify({locale,checkpoint:'verified-save-and-completion-passed'}))
  const writesBeforeNavigation=writes.length
  for(const n of [2,3,4]){
   await level(n).click()
   assert.equal(await level(n).getAttribute('aria-pressed'),'true')
   assert.equal(await action('complete').count(),0,'Preparing paid support must not claim a completed session')
   assert.ok(await guide.locator('a[href]').count()>0,'Support level must expose a real route')
  }
  assert.equal(writes.length,writesBeforeNavigation,'Selecting a level must not create a purchase or completed task')
  await level(1).click()
  await week(2).click()
  assert.equal(await guide.locator('[data-guide-progress]').getAttribute('data-completed'),'0','Legacy stage completion must not fabricate seven new completed tasks')
  const legacyDetails=guide.locator('details').filter({hasText:legacyAnswer})
  assert.equal(await legacyDetails.count(),1,'Legacy reflection must remain available')
  await legacyDetails.locator('summary').click()
  assert.ok((await legacyDetails.innerText()).includes(legacyAnswer))
  await fillCurrent(1,'SYNTHETIC_UNSAVED')
  const firstText=GUIDE_WEEKS[1].steps[0].fields.find(field=>field.type!=='rating')
  if(firstText){
   await week(1).click();await week(2).click()
   assert.equal(await task.getByLabel(firstText.label[locale],{exact:false}).inputValue(),'SYNTHETIC_UNSAVED '+firstText.id,'Week change must retain an in-memory draft')
   await goalSelect.selectOption(goal2)
   assert.equal(await task.getByLabel(firstText.label[locale],{exact:false}).inputValue(),'','Goals must have isolated drafts')
   await goalSelect.selectOption(goal1)
   assert.equal(await task.getByLabel(firstText.label[locale],{exact:false}).inputValue(),'SYNTHETIC_UNSAVED '+firstText.id,'Returning to a goal restores its draft')
   const beforeUrl=page.url(),beforeDialogs=dialogs.length
   await mySpace.click()
   assert.equal(dialogs.length,beforeDialogs+1,'Leaving with a draft asks once, not in multiple overlapping guards')
   assert.equal(page.url(),beforeUrl,'Cancelling the leave prompt must keep the current page')
   assert.equal(await task.getByLabel(firstText.label[locale],{exact:false}).inputValue(),'SYNTHETIC_UNSAVED '+firstText.id,'Cancelling navigation must preserve the draft')
  }
  await week(1).click()
  console.log(JSON.stringify({locale,checkpoint:'legacy-and-draft-retention-passed'}))
  await goalSelect.selectOption(goal2)
  await fillCurrent(0,'SYNTHETIC_B')
  await action('save').click()
  await until(()=>[...records.values()].some(value=>value.goalId===goal2&&parseGuideEntry(value)),'Second goal did not save independently')
  await until(async()=>await action('save').count()>0&&!await action('save').isDisabled(),'Second goal save did not settle')
  await page.evaluate(()=>{const url=new URL(location.href);url.searchParams.set('tab','journal');window.history.pushState(null,'',url)})
  await page.locator('[data-daybook-workspace-nav]').waitFor({state:'visible'})
  const journalRecord=page.locator('main > article').filter({hasText:'SYNTHETIC_DEEP_LINK'})
  await journalRecord.waitFor({state:'visible'})
  assert.ok(!(await journalRecord.innerText()).includes('hh-guide-v1'),'Journal must show readable answers instead of internal JSON')
  const deepLink=journalRecord.getByRole('link',{name:{en:'Coaching guide',ru:'Коучинг-гид',es:'Guía de coaching'}[locale],exact:true})
  const deepUrl=new URL(await deepLink.getAttribute('href'),origin)
  assert.equal(deepUrl.searchParams.get('goal'),goal1)
  assert.equal(deepUrl.searchParams.get('stage'),'3')
  assert.equal(deepUrl.searchParams.get('level'),'1')
  assert.equal(deepUrl.searchParams.get('step'),'3')
  await deepLink.click()
  await guide.waitFor({state:'visible'})
  await until(async()=>await week(3).getAttribute('aria-pressed')==='true','Journal link did not restore the saved week')
  assert.equal(await level(1).getAttribute('aria-pressed'),'true')
  assert.equal(await step(deepTask.id).getAttribute('aria-pressed'),'true')
  assert.equal(await goalSelect.inputValue(),goal1)
  for(const field of deepTask.fields)assert.equal(await task.getByLabel(field.label[locale],{exact:false}).inputValue(),deepAnswers[field.id],'Journal link must restore the matching saved answer')
  await page.evaluate(()=>{const url=new URL(location.href);url.searchParams.set('tab','journal');window.history.pushState(null,'',url)})
  await page.locator('[data-daybook-workspace-nav]').waitFor({state:'visible'})
  await journalRecord.waitFor({state:'visible'})
  await deepLink.click()
  await guide.waitFor({state:'visible'})
  assert.equal(await week(3).getAttribute('aria-pressed'),'true','Repeated identical journal link must reopen the guide')
  assert.equal(await step(deepTask.id).getAttribute('aria-pressed'),'true')
  await week(1).click()
  await page.reload({waitUntil:'domcontentloaded'})
  await guide.waitFor({state:'visible'})
  await until(async()=>await goalSelect.locator('option').count()>=3,'Goals did not reload')
  await goalSelect.selectOption(goal1)
  await week(1).click();await level(1).click();await step(GUIDE_WEEKS[0].steps[0].id).click()
  const savedFirst=GUIDE_WEEKS[0].steps[0].fields.find(field=>field.type!=='rating')
  if(savedFirst)assert.equal(await task.getByLabel(savedFirst.label[locale],{exact:false}).inputValue(),'SYNTHETIC_A '+savedFirst.id,'Reload must restore confirmed saved answers')
  assert.equal(await guide.locator('[data-guide-progress]').getAttribute('data-completed'),'1')
  const clearTask=GUIDE_WEEKS[0].steps[1]
  await step(clearTask.id).click()
  for(const field of clearTask.fields){
   const control=task.getByLabel(field.label[locale],{exact:false})
   if(field.type==='rating')await control.selectOption('6')
   else await control.fill('SYNTHETIC_TO_CLEAR '+field.id)
  }
  await action('complete').click()
  await until(async()=>await guide.locator('[data-guide-progress]').getAttribute('data-completed')==='2','Second task completion did not settle')
  for(const field of clearTask.fields){
   const control=task.getByLabel(field.label[locale],{exact:false})
   if(field.type==='rating')await control.selectOption('')
   else await control.fill('')
  }
  assert.equal(await action('save').isDisabled(),false,'An existing answer must be clearable by saving an empty draft')
  await action('save').click()
  await until(async()=>await guide.locator('[data-guide-progress]').getAttribute('data-completed')==='1','Clearing answers must withdraw completion')
  const cleared=[...records.values()].find(value=>value.goalId===goal1&&parseGuideEntry(value)?.week==='discover'&&parseGuideEntry(value)?.step===clearTask.id)
  assert.deepEqual(parseGuideEntry(cleared).answers,{})
  assert.equal(parseGuideEntry(cleared).completed,false)
  await page.reload({waitUntil:'domcontentloaded'})
  await guide.waitFor({state:'visible'})
  await until(async()=>await goalSelect.locator('option').count()>=3,'Goals did not reload after clearing')
  await goalSelect.selectOption(goal1);await week(1).click();await step(clearTask.id).click()
  for(const field of clearTask.fields)assert.equal(await task.getByLabel(field.label[locale],{exact:false}).inputValue(),'','Cleared saved answers must stay blank after reload')
  assert.equal(await action('complete').isDisabled(),true)

  // Shared stage-zero/guide acceptance: this goal is created by the rendered
  // v2 questionnaire, not seeded into the guide fixture or injected into state.
  const vc=vectorCopy[locale],beforeVectorRecords=[...records.entries()],beforeVectorWrites=writes.length
  const nav=page.locator('main > nav'),wizard=page.locator('[data-daybook-vector-start]')
  await page.evaluate(()=>{const url=new URL(location.href);url.searchParams.set('tab','goals');window.history.pushState(null,'',url)})
  await page.locator('[data-daybook-workspace-nav]').waitFor({state:'visible'})
  await page.locator('#daybook-goals').getByRole('button',{name:vc.new,exact:true}).click()
  await wizard.waitFor({state:'visible'})
  await wizard.locator('input[type=radio][value=work]').check()
  await wizard.locator('input[type=radio][value=finance]').check()
  await wizard.locator('select').nth(0).selectOption('0')
  await wizard.locator('select').nth(1).selectOption('8')
  await wizard.getByRole('button',{name:vc.next,exact:true}).click()
  await wizard.locator('input[type=radio][value=anchor]').check()
  await wizard.locator('select').nth(0).selectOption('2')
  await wizard.locator('select').nth(1).selectOption('9')
  await wizard.getByRole('button',{name:vc.review,exact:true}).click()
  const vectorTitle='Synthetic '+locale+' stage-zero guide goal'
  await wizard.locator('textarea').nth(0).fill(vectorTitle)
  await wizard.locator('textarea').nth(1).fill('Synthetic reason for this guide goal')
  await wizard.getByRole('button',{name:vc.save,exact:true}).click()
  await wizard.getByRole('button',{name:vc.done,exact:true}).waitFor({state:'visible'})
  assert.equal(goalWrites.length,1,'Stage zero must create exactly one goal')
  const created=goals.get(goalWrites[0].id)
  assert.ok(created&&! [goal1,goal2].includes(created.id),'Stage zero must create a new goal UUID')
  assert.ok(goalReads.includes(created.id),'Stage-zero success must verify the persisted goal by ID')
  assert.equal(created.title,vectorTitle)
  assert.equal(created.vectorSelection.version,VECTOR_SELECTION_VERSION)
  assert.equal(created.vectorSelection.focusId,'finance')
  assert.deepEqual(created.vectorSelection.spheres,{work:{current:0,desired:8}})
  assert.deepEqual(created.vectorSelection.axes,{anchor:{current:2,desired:9}})
  await wizard.getByRole('button',{name:vc.done,exact:true}).click()
  await wizard.waitFor({state:'detached'})
  await nav.getByRole('button',{name:vc.guide,exact:true}).click()
  await guide.waitFor({state:'visible'})
  await until(async()=>await goalSelect.locator('option[value="'+created.id+'"]').count()===1,'New stage-zero goal did not refresh in the guide without a page reload')
  assert.equal(await goalSelect.locator('option[value="'+created.id+'"]').textContent(),vectorTitle)
  await goalSelect.selectOption(created.id)
  assert.equal(await goalSelect.inputValue(),created.id)
  await week(1).click();await level(1).click();await step(GUIDE_WEEKS[0].steps[0].id).click()
  assert.equal(await task.locator('textarea').first().inputValue(),'','A newly created goal must not inherit another goal’s guide answers')
  await fillCurrent(0,'SYNTHETIC_STAGE_ZERO_GUIDE')
  await action('save').click()
  await until(async()=>writes.length>beforeVectorWrites&&await action('save').count()>0&&!await action('save').isDisabled(),'Guide answer for the newly created goal did not settle')
  assert.equal(writes.length,beforeVectorWrites+1)
  assert.equal(writes.at(-1).goalId,created.id,'Guide must persist the actual stage-zero goal ID')
  const linked=records.get(writes.at(-1).id)
  assert.ok(journalReads.includes(linked.id),'Guide save must verify the linked entry by ID')
  assert.equal(linked.goalId,created.id)
  assert.equal(parseGuideEntry(linked).completed,false)
  for(const [id,value] of beforeVectorRecords)assert.deepEqual(records.get(id),value,'A new goal must not overwrite an existing goal’s answers')
  await page.reload({waitUntil:'domcontentloaded'})
  await guide.waitFor({state:'visible'})
  await until(async()=>await goalSelect.locator('option[value="'+created.id+'"]').count()===1,'New stage-zero goal did not survive reload')
  assert.equal(await goalSelect.inputValue(),created.id,'The guide route must restore the newly created goal after reload')
  for(const field of GUIDE_WEEKS[0].steps[0].fields)assert.equal(await task.getByLabel(field.label[locale],{exact:false}).inputValue(),field.type==='rating'?'6':'SYNTHETIC_STAGE_ZERO_GUIDE '+field.id,'Reload must restore answers for the goal created in stage zero')
  await page.addStyleTag({content:'nextjs-portal { display:none !important; }'})
  await guide.screenshot({path:join(screenshotDir,engine+'-'+locale+'-stage-zero-guide.png')})
  console.log(JSON.stringify({locale,checkpoint:'stage-zero-v2-to-guide-save-and-reload-passed'}))
  await step(GUIDE_WEEKS[0].steps[0].id).click()
  const privateText=await task.locator('textarea').first().inputValue()
  assert.ok(privateText)
  owner=randomUUID()
  await page.evaluate(()=>window.dispatchEvent(new Event('focus')))
  await guide.waitFor({state:'hidden'})
  assert.ok(!(await page.locator('body').innerText()).includes(privateText),'Account change must hide the previous account data')
  revoked=true
  await page.reload({waitUntil:'domcontentloaded'})
  assert.equal(await guide.count(),0,'Signed-out page must not mount a private guide')
  assert.deepEqual(unexpectedWrites,[],'No booking, payment or other provider write is authorized by this fixture')
  assert.deepEqual(errors,[],`${locale}: browser runtime errors`)
  receipts.push({locale,engine,widths:[320,354,390,430,768,1024],weeks:7,levels:4,steps:7,reload:true,goalIsolation:true,draftRetention:true,legacyPreserved:true,journalDeepLink:true,clearSavedAnswers:true,stageZeroV2ToGuide:{createdThroughUI:true,goalReadback:true,availableWithoutReload:true,selectedActualId:true,linkedAnswerReadback:true,reload:true,goalWrites:goalWrites.length},accountChangeWipe:true,retry:locale==='ru',writes:writes.length})
  console.log(JSON.stringify(receipts.at(-1)))
  await context.close()
 }
 const report={kind:'canonical-next-ui-synthetic-api',live:false,realOAuth:false,realDatabase:false,physicalDevice:false,engine,screenshots:screenshotDir,receipts}
 await writeFile(join(screenshotDir,'report.json'),JSON.stringify(report,null,2))
 console.log(JSON.stringify(report))
}catch(error){
 if(serverLog)console.error(serverLog)
 if(activeErrors.length)console.error(JSON.stringify({browserErrors:activeErrors}))
 throw error
}finally{
 await browser?.close()
 if(server){server.kill('SIGTERM');await Promise.race([once(server,'exit'),new Promise(resolve=>setTimeout(resolve,5000))]);if(server.exitCode===null)server.kill('SIGKILL')}
}
