/**
 * Actual Next/component browser acceptance with an explicit synthetic API fixture.
 * This verifies UI wiring, not real OAuth, hosted storage or production persistence.
 * Run: node tests/daybook-vector.browser.mjs
 * Uses installed Playwright + Chromium; installs no dependency and calls no provider.
 */
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {createRequire} from 'node:module'
import {once} from 'node:events'
import {mkdir,mkdtemp,writeFile} from 'node:fs/promises'
import {existsSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {dirname,join,resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {randomUUID} from 'node:crypto'
import {VECTOR_SPHERES,VECTOR_AXES} from '../lib/app/daybook-vector-selection.mjs'
import {personalGoalWrite,preserveGoalVectorSelection} from '../lib/app/daybook-personal-goal-contract.mjs'

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),require=createRequire(import.meta.url)
const playwright=(()=>{
 for(const path of ['playwright',process.env.HH_VECTOR_PLAYWRIGHT_PACKAGE,process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES&&join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'playwright'),'/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'].filter(Boolean)){
  try{return require(path)}catch{}
 }
 throw Error('Install/use an existing Playwright runtime before running this browser acceptance.')
})()
const executable=[process.env.CHROMIUM_EXECUTABLE_PATH,playwright.chromium.executablePath(),'/usr/lib/chromium/chromium'].filter(Boolean).find(path=>existsSync(path))
assert.ok(executable,'CHROMIUM_NOT_AVAILABLE: use an already installed Playwright browser or CHROMIUM_EXECUTABLE_PATH; this script does not install browsers.')
const port=Number(process.env.HH_VECTOR_QA_PORT||4317)
assert.ok(Number.isInteger(port)&&port>=1024&&port<=65535)
const origin='http://127.0.0.1:'+port
const screenshotDir=process.env.HH_VECTOR_QA_SCREENSHOT_DIR||await mkdtemp(join(tmpdir(),'daybook-vector-browser-'))
await mkdir(screenshotDir,{recursive:true})
const copy={
 en:{next:'Next',review:'Choose my vector',save:'Save my goal',retry:'Retry saving',done:'Open my goals',edit:'Edit',confirm:'I confirm these details and the selected stage.',editSave:'Save goal'},
 ru:{next:'Дальше',review:'Выбрать вектор',save:'Сохранить мою цель',retry:'Повторить сохранение',done:'К моим целям',edit:'Изменить',confirm:'Я подтверждаю эти данные и выбранный этап.',editSave:'Сохранить цель'},
 es:{next:'Siguiente',review:'Elegir mi vector',save:'Guardar mi meta',retry:'Reintentar guardado',done:'Abrir mis metas',edit:'Editar',confirm:'Confirmo estos detalles y la etapa seleccionada.',editSave:'Guardar objetivo'},
}
const server=spawn(process.execPath,[join(root,'node_modules/next/dist/bin/next'),'dev','--hostname','127.0.0.1','--port',String(port)],{cwd:root,env:{...process.env,NEXT_TELEMETRY_DISABLED:'1'},stdio:['ignore','pipe','pipe']})
let serverLog='',browser
const receive=chunk=>{serverLog=(serverLog+String(chunk)).slice(-30000)}
server.stdout.on('data',receive);server.stderr.on('data',receive)
const receipts=[]
try{
 await new Promise((resolve,reject)=>{
  const deadline=setTimeout(()=>reject(Error('Next startup timed out')),45000)
  const check=chunk=>{if(/Ready in/.test(String(chunk))){clearTimeout(deadline);resolve()}}
  server.stdout.on('data',check)
  server.once('exit',code=>{clearTimeout(deadline);reject(Error('Next exited '+code))})
 })
 browser=await playwright.chromium.launch({headless:true,executablePath:executable,args:['--no-sandbox','--disable-dev-shm-usage']})
 for(const locale of ['ru','en','es']){
  const c=copy[locale],owner=randomUUID(),records=new Map(),writes=[],receiptsByOperation=new Map(),errors=[]
  let loseFirstReply=locale==='ru',revoked=false
  const context=await browser.newContext({viewport:{width:390,height:844},locale:locale==='ru'?'ru-RU':locale==='es'?'es-ES':'en-CA'})
  const page=await context.newPage()
  page.setDefaultTimeout(20000)
  page.on('pageerror',error=>errors.push(error.message))
  await page.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort())
  await page.route('**/api/app/**',async route=>{
   const request=route.request(),url=new URL(request.url()),path=url.pathname.slice('/api/app/'.length),method=request.method()
   const reply=(body,status=200)=>route.fulfill({status,contentType:'application/json',headers:{'cache-control':'no-store'},body:JSON.stringify(body)})
   if(revoked)return reply({error:'ACCOUNT_REQUIRED'},401)
   if(path==='bootstrap')return reply({account:{id:owner,onboardingState:'active'},results:[],runs:[],requests:[],consents:[],services:[]})
   if(path==='daybook-journal')return reply({entries:[],nextCursor:null})
   if(path==='coaching-life-plan')return reply({plan:{id:randomUUID()},goals:[...records.values()].map(goal=>({...goal,actions:[]})),actions:[],domains:[],contextPermissions:[]})
   if(path==='personal-goals'){
    if(request.headers()['x-hh-account-id']!==owner)return reply({error:'ACCOUNT_CHANGED'},409)
    if(method==='GET')return records.has(url.searchParams.get('id'))?reply({goal:records.get(url.searchParams.get('id'))}):reply({error:'NOT_FOUND'},404)
    if(['POST','PATCH'].includes(method)){
     try{
      const input=personalGoalWrite(request.postDataJSON()),previous=records.get(input.id),priorReceipt=receiptsByOperation.get(input.operationId)
      writes.push(input)
      if(priorReceipt){assert.deepEqual(priorReceipt,input);return reply({saved:true,replayed:true,goal:previous})}
      if((previous?.revision||0)!==input.revision)return reply({error:'GOAL_REVISION_CONFLICT'},409)
      const goal={...preserveGoalVectorSelection(input,previous),revision:input.revision+1};delete goal.operationId
      records.set(input.id,goal);receiptsByOperation.set(input.operationId,input)
      if(loseFirstReply){loseFirstReply=false;return reply({error:'SERVICE_UNAVAILABLE'},503)}
      return reply({saved:true,goal})
     }catch(error){return reply({error:error.code||'INVALID_FIXTURE_REQUEST'},error.status||400)}
    }
   }
   return reply({error:'SYNTHETIC_ENDPOINT_NOT_CONFIGURED'},404)
  })
  await page.goto(origin+'/'+locale+'/app/daybook?start=vector',{waitUntil:'domcontentloaded',timeout:120000})
  const wizard=page.locator('[data-daybook-vector-start]')
  await wizard.waitFor({state:'visible'})
  async function mobile(state){
   for(const width of [320,390,430]){
    await page.setViewportSize({width,height:844})
    const geometry=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:document.documentElement.clientWidth}))
    assert.ok(geometry.scroll<=geometry.width+1,`${locale}/${state}/${width}: document overflow ${JSON.stringify(geometry)}`)
    const controls=await wizard.locator('select,button').evaluateAll(nodes=>nodes.filter(node=>node.getBoundingClientRect().height>0).map(node=>({height:node.getBoundingClientRect().height,size:parseFloat(getComputedStyle(node).fontSize)})))
    assert.ok(controls.every(control=>control.height>=44&&control.size>=16),`${locale}/${state}/${width}: readable touch controls`)
    await wizard.screenshot({path:join(screenshotDir,locale+'-'+state+'-'+width+'.png')})
   }
   await page.setViewportSize({width:390,height:844})
  }
  await mobile('sphere')
  for(const [track,items] of [['spheres',VECTOR_SPHERES],['axes',VECTOR_AXES]]){
   for(let index=0;index<items.length;index++){
    await wizard.getByRole('heading',{name:items[index].name[locale],exact:true}).waitFor()
    assert.equal(await wizard.getByRole('button',{name:track==='axes'&&index===7?c.review:c.next,exact:true}).isDisabled(),true)
    await wizard.locator('select').nth(0).selectOption('0')
    await wizard.locator('select').nth(1).selectOption('8')
    await wizard.getByRole('button',{name:track==='axes'&&index===7?c.review:c.next,exact:true}).click()
   }
  }
  await wizard.locator('input[type=radio][value=work]').check()
  await wizard.locator('input[type=radio][value=freedom]').check()
  assert.equal(await wizard.getByRole('button',{name:c.save,exact:true}).isDisabled(),true)
  const title='Synthetic '+locale+' goal from stage zero'
  await wizard.locator('textarea').nth(0).fill(title)
  await wizard.locator('textarea').nth(1).fill('Synthetic personal reason')
  await mobile('vector')
  await wizard.getByRole('button',{name:c.save,exact:true}).click()
  if(locale==='ru'){
   await wizard.getByRole('button',{name:c.retry,exact:true}).waitFor()
   assert.equal(records.size,1);assert.equal(await wizard.locator('textarea').nth(0).isDisabled(),true)
   await wizard.getByRole('button',{name:c.retry,exact:true}).click()
   assert.deepEqual(writes[0],writes[1])
  }
  await wizard.getByRole('button',{name:c.done,exact:true}).waitFor()
  assert.equal(records.size,1)
  const saved=[...records.values()][0]
  assert.equal(saved.vectorSelection.spheres.body.current,0);assert.equal(Object.keys(saved.vectorSelection.axes).length,8)
  await wizard.getByRole('button',{name:c.done,exact:true}).click()
  await page.waitForURL(origin+'/'+locale+'/app/daybook?tab=goals')
  await wizard.waitFor({state:'detached'})
  await page.reload({waitUntil:'domcontentloaded'})
  const card=page.locator('#daybook-goals article').filter({has:page.getByRole('heading',{name:title,exact:true})})
  await card.waitFor();assert.equal(await wizard.count(),0)
  await card.getByRole('button',{name:c.edit,exact:true}).click()
  await page.locator('[data-vector-origin]').waitFor()
  const editor=page.locator('#daybook-goals form'),editedTitle=title+' refined'
  await editor.locator('textarea').nth(0).fill(editedTitle)
  await editor.getByRole('checkbox',{name:c.confirm,exact:true}).check()
  await editor.getByRole('button',{name:c.editSave,exact:true}).click()
  await page.getByRole('heading',{name:editedTitle,exact:true}).waitFor()
  assert.deepEqual(records.get(saved.id).vectorSelection,saved.vectorSelection)
  await page.reload({waitUntil:'domcontentloaded'})
  await page.getByRole('heading',{name:editedTitle,exact:true}).waitFor()
  assert.equal(records.size,1);assert.equal(await wizard.count(),0)
  revoked=true
  await page.evaluate(()=>window.dispatchEvent(new Event('focus')))
  await page.getByRole('heading',{name:editedTitle,exact:true}).waitFor({state:'detached'})
  assert.equal(await page.locator('[data-vector-origin]').count(),0)
  assert.deepEqual(errors,[],`${locale}: runtime errors`)
  receipts.push({locale,widths:[320,390,430],completeQuestions:12,goals:records.size,roundTrip:true,originPreserved:true,revocationWipe:true,retry:locale==='ru'?'verified':'not simulated'})
  console.log(JSON.stringify(receipts.at(-1)))
  await context.close()
 }
 const report={kind:'actual-next-ui-synthetic-api',live:false,realOAuth:false,realDatabase:false,screenshots:screenshotDir,receipts}
 await writeFile(join(screenshotDir,'report.json'),JSON.stringify(report,null,2))
 console.log(JSON.stringify(report))
}catch(error){
 console.error(serverLog);throw error
}finally{
 await browser?.close()
 server.kill('SIGTERM')
 await Promise.race([once(server,'exit'),new Promise(resolve=>setTimeout(resolve,5000))])
 if(server.exitCode===null)server.kill('SIGKILL')
}
