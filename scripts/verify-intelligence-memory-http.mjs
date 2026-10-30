// Only synthetic users, loopback OAuth and an isolated local test database.
import http from 'node:http'
import assert from 'node:assert/strict'
import {createHash,randomUUID} from 'node:crypto'
import {createRequire} from 'node:module'
import {NextRequest,NextResponse} from 'next/server.js'
import {getAppConfig} from '../lib/app/config.js'
import {createRequestAuth} from '../lib/app/session.js'
import {createAppRepository} from '../lib/app/repository.js'
import {closeDatabase} from '../lib/app/database.js'
import {A,B,SB,actor,rawAs} from '../tests/helpers/app-db-setup.mjs'

const origin='http://127.0.0.1:3187', config=getAppConfig(), db=new URL(config.databaseUrl)
if(!config.test || !config.intelligenceMemoryEnabled || config.supabaseUrl!=='http://127.0.0.1:54329' ||
   !['127.0.0.1','localhost'].includes(db.hostname) || db.pathname!=='/hh_app_test' || !config.origins.includes(origin))
  throw new Error('ISOLATED_TEST_CONFIGURATION_REQUIRED')
const ids={a:['10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001'],
  b:['10000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002']}
// The preceding database regression deletes B to test cascade. Restore this
// synthetic app account only; the test helper has already created its auth user.
const repo=createAppRepository(config), bActor=actor(B,SB)
await repo.ensureAccount(bActor)
await repo.onboarding(bActor,{adult:true,necessary:true,marketing:false,displayName:'Synthetic',uiLocale:'en',timezone:'America/Toronto',goal:'explore'})
// The database regression created an owner-A course and left it paused.
await rawAs(actor(),'hh_app_backend',db=>db.query("update app_private.growth_courses set status='active' where account_id=$1",[A]))
const challenges=new Map()
const user=kind=>({id:ids[kind][0],aud:'authenticated',email:'synthetic@example.invalid',user_metadata:{}})
const token=kind=>{const [sub,session_id]=ids[kind];return 'synthetic.'+Buffer.from(JSON.stringify({sub,session_id,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')+'.signature'}
const provider=http.createServer(async(req,res)=>{
  res.setHeader('content-type','application/json')
  if(req.url?.includes('/token')){
    let body='';for await(const chunk of req)body+=chunk
    let parsed;try{parsed=JSON.parse(body)}catch{res.writeHead(400);res.end('{}');return}
    const kind=parsed.auth_code==='synthetic-code-a'?'a':parsed.auth_code==='synthetic-code-b'?'b':null
    const verifier=typeof parsed.code_verifier==='string'?parsed.code_verifier:''
    if(!kind||!verifier||createHash('sha256').update(verifier).digest('base64url')!==challenges.get(kind)){res.writeHead(400);res.end('{}');return}
    res.end(JSON.stringify({access_token:token(kind),refresh_token:'synthetic-refresh-'+kind,token_type:'bearer',expires_in:3600,user:user(kind)}));return
  }
  if(req.url?.endsWith('/user')){
    let claims;try{claims=JSON.parse(Buffer.from((req.headers.authorization||'').split('.')[1],'base64url').toString())}catch{/* reject */}
    const kind=Object.keys(ids).find(key=>claims?.sub===ids[key][0]&&claims?.session_id===ids[key][1])
    if(!kind){res.writeHead(401);res.end('{}');return}
    res.end(JSON.stringify(user(kind)));return
  }
  res.writeHead(404);res.end('{}')
})
await new Promise((resolve,reject)=>provider.listen(54329,'127.0.0.1',resolve).once('error',reject))
try {
  for(let attempt=0;attempt<60;attempt++){
    try {await fetch(origin+'/api/app/intelligence/feedback/export',{method:'POST',headers:{origin,'content-type':'application/json'},body:'{}'});break}
    catch {if(attempt===59)throw new Error('LOCAL_SITE_UNAVAILABLE');await new Promise(resolve=>setTimeout(resolve,1000))}
  }
  async function cookie(kind){
    const request=(values=[])=>new NextRequest(origin+'/api/app/auth/callback',{headers:{cookie:values.map(c=>`${c.name}=${encodeURIComponent(c.value)}`).join('; ')}})
    const start=createRequestAuth(request(),config)
    const started=await start.client.auth.signInWithOAuth({provider:'google',options:{redirectTo:origin+'/api/app/auth/callback',skipBrowserRedirect:true}})
    assert.equal(started.error,null);challenges.set(kind,new URL(started.data.url).searchParams.get('code_challenge'))
    const exchange=createRequestAuth(request(start.apply(NextResponse.json({})).cookies.getAll()),config)
    const completed=await exchange.client.auth.exchangeCodeForSession('synthetic-code-'+kind)
    assert.equal(completed.error,null)
    return exchange.apply(NextResponse.json({})).cookies.getAll().map(c=>`${c.name}=${encodeURIComponent(c.value)}`).join('; ')
  }
  const a=await cookie('a'), b=await cookie('b')
  async function call(action,cookies,body={},headers={}){
    const response=await fetch(`${origin}/api/app/intelligence/feedback/${action}`,{method:'POST',headers:{origin,'content-type':'application/json',cookie:cookies,...headers},body:JSON.stringify(body)})
    return {status:response.status,cache:response.headers.get('cache-control'),body:await response.json()}
  }
  const guest=await call('export','');assert.equal(guest.status,401);assert.match(guest.cache,/no-store/)
  assert.deepEqual((await call('status',a)).body,{managementAvailable:true,saveEnabled:true})
  assert.equal((await call('save',a,{}, {origin:'https://hostile.example.invalid'})).status,403)
  assert.equal((await call('export',a,{}, {'x-hh-account-id':ids.b[0]})).status,409)
  const before=await call('export',a), otherBefore=await call('export',b)
  assert.equal(before.status,200);assert.match(before.cache,/no-store/)
  assert.equal(otherBefore.status,200);assert.equal(otherBefore.body.records.length,0)
  const input={operationId:randomUUID(),consent:true,expectedRevision:before.body.revision,itemId:'youtube:HqfixazXqRY',feedback:'not_useful'}
  assert.equal((await call('save',a,{...input,consent:false})).status,400)
  assert.equal((await call('save',a,input)).status,200)
  assert.equal((await call('save',a,input)).status,200)
  assert.equal((await call('save',a,{...input,feedback:'useful'})).status,409)
  const planBody={requestId:randomUUID(),surface:'cabinet',intent:{language:'en',audioLanguage:'en',selectedTopics:['energy'],formats:['video']},
    symbolicInterest:'include',preflight:{immediateDanger:'no',selfHarmThoughts:'no'}}
  async function plan(cookies,body){
    const response=await fetch(`${origin}/api/app/intelligence/plan`,{method:'POST',headers:{origin,'content-type':'application/json',cookie:cookies},body:JSON.stringify(body)})
    assert.equal(response.status,200);return response.json()
  }
  const offered=result=>[result.primary,...result.alternatives].filter(Boolean).map(row=>row.id)
  const continueBody={requestId:randomUUID(),surface:'cabinet',intent:{language:'en',selectedTopics:['energy'],formats:['course']},courseSelection:'active_course',preflight:{immediateDanger:'no',selfHarmThoughts:'no'}}
  for (const [cookies,headers,status] of [['',{},401],[a,{'x-hh-account-id':ids.b[0]},409]]) {
    const denied=await fetch(`${origin}/api/app/intelligence/plan`,{method:'POST',headers:{origin,'content-type':'application/json',cookie:cookies,...headers},body:JSON.stringify(continueBody)})
    assert.equal(denied.status,status)
  }
  const ownCourse=await plan(a,continueBody), otherCourse=await plan(b,continueBody)
  assert.equal(ownCourse.primary?.href,'/en/app/course?view=courses')
  assert.equal(otherCourse.status,'no_match')
  assert.doesNotMatch(JSON.stringify(ownCourse),/accountId|courseId|concerns|results/)
  const unfiltered=await plan(a,planBody)
  assert.equal(offered(unfiltered).includes(input.itemId),true)
  const filtered=await plan(a,{...planBody,feedbackHistory:'avoid_not_useful'})
  const otherPlan=await plan(b,{...planBody,feedbackHistory:'avoid_not_useful'})
  assert.equal(offered(filtered).includes(input.itemId),false)
  assert.equal(offered(otherPlan).includes(input.itemId),true)
  assert.equal(JSON.stringify(filtered).includes(input.operationId),false)
  const edit={operationId:input.operationId,expectedRevision:before.body.revision,consent:true,feedback:'useful'}
  assert.equal((await call('edit',a,{...edit,consent:false})).status,400)
  assert.equal((await call('edit',b,{...edit,expectedRevision:otherBefore.body.revision})).status,404)
  const changed=await call('edit',a,edit);assert.equal(changed.status,200)
  assert.equal(offered(await plan(a,{...planBody,feedbackHistory:'avoid_not_useful'})).includes(input.itemId),true)
  assert.equal((await call('edit',a,edit)).status,409)
  const restored=await call('edit',a,{...edit,feedback:'not_useful',expectedRevision:changed.body.revision})
  assert.equal(restored.status,200)
  assert.equal((await call('export',a)).body.records.some(row=>row.operationId===input.operationId),true)
  assert.equal((await call('export',b)).body.records.length,0)
  assert.equal((await call('delete',b,{operationId:input.operationId,expectedRevision:otherBefore.body.revision})).body.deleted,false)
  assert.equal((await call('export',a)).body.records.some(row=>row.operationId===input.operationId),true)
  assert.equal((await call('delete',a,{all:true,expectedRevision:restored.body.revision})).body.deleted,true)
  assert.equal((await call('save',a,input)).status,409)
  assert.equal((await call('export',a)).body.records.length,0)
  const require=createRequire(`${process.env.HH_INTELLIGENCE_BROWSER_TOOLS}/package.json`)
  const browserName=process.env.HH_TEST_BROWSER||'chromium'
  if(!['chromium','webkit'].includes(browserName))throw new Error('UNSUPPORTED_BROWSER')
  const browser=await require('playwright')[browserName].launch({headless:true,...(process.env.HH_BROWSER_EXECUTABLE?{executablePath:process.env.HH_BROWSER_EXECUTABLE}:{})})
  try {
    // The disabled-capability case below intercepts a request; Playwright
    // cannot reliably intercept traffic controlled by a service worker.
    // Service-worker privacy is exercised by verify-intelligence-owner-route.
    const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'})
    try {
      await context.addCookies(a.split('; ').map(item=>{const at=item.indexOf('=');return {name:item.slice(0,at),value:decodeURIComponent(item.slice(at+1)),url:origin}}))
      await context.route('https://www.youtube.com/**',route=>route.abort())
      for (const [locale,width,topic,next,continueCourse,no,skip,start,setup] of [
        ['en',390,'energy','Continue','Continue my active course','No','Skip','Start','Finish setting up'],
        ['ru',320,'energy','Продолжить','Продолжить мой активный курс','Нет','Пропустить','Начать','Завершить настройку'],
      ]) {
        const coursePage=await context.newPage()
        await coursePage.setViewportSize({width,height:844})
        await coursePage.goto(`${origin}/${locale}/app/portfolio`,{waitUntil:'networkidle',timeout:60000})
        await coursePage.locator('#hh-portrait-tab-recommendations').click()
        const courseCard=coursePage.locator('[data-holistic-intelligence]')
        await courseCard.locator('select').selectOption(topic)
        await courseCard.getByRole('button',{name:next,exact:true}).click()
        await courseCard.locator('#hh-intelligence-format-cabinet').selectOption('course')
        await courseCard.getByRole('button',{name:next,exact:true}).click()
        await courseCard.getByRole('button',{name:continueCourse,exact:true}).click()
        await courseCard.getByRole('button',{name:no,exact:true}).click()
        await courseCard.getByRole('button',{name:no,exact:true}).click()
        await courseCard.getByRole('button',{name:skip,exact:true}).click()
        const link=courseCard.getByRole('link',{name:start,exact:true})
        await link.waitFor({state:'visible'})
        assert.equal(await link.getAttribute('href'),`/${locale}/app/course?view=courses`)
        assert.equal(await coursePage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true)
        const opened=coursePage.waitForEvent('popup');await link.click();const courses=await opened
        await courses.waitForURL(`**/${locale}/app/course?view=courses`)
        await courses.locator('[data-my-courses-dashboard]').waitFor({state:'visible',timeout:60000})
        await courses.locator('[data-started-course-card]').first().getByRole('button',{name:setup,exact:true}).click()
        await courses.locator('[data-my-courses-dashboard]').waitFor({state:'hidden',timeout:30000})
        await courses.locator('[data-my-course]').waitFor({state:'visible'})
        await courses.close();await coursePage.close()
      }
      const page=await context.newPage()
      let saveRequests=0, saveFailure=null, pageErrors=0
      page.on('request',request=>{if(request.url().endsWith('/api/app/intelligence/feedback/save'))saveRequests++})
      page.on('requestfailed',request=>{if(request.url().endsWith('/api/app/intelligence/feedback/save'))saveFailure=request.failure()?.errorText||'unknown'})
      page.on('pageerror',()=>{pageErrors++})
      await page.goto(origin+'/en/app/portfolio',{waitUntil:'networkidle',timeout:60000})
      await page.locator('#hh-portrait-tab-recommendations').click()
      const card=page.locator('[data-holistic-intelligence]')
      await card.getByRole('button',{name:'Manage saved feedback',exact:true}).waitFor()
      const use=card.getByRole('checkbox',{name:'Use saved “not useful” feedback for this request',exact:true})
      assert.equal(await use.isChecked(),false)
      await card.locator('select').selectOption('energy')
      await card.getByRole('button',{name:'Continue',exact:true}).click()
      await card.locator('#hh-intelligence-format-cabinet').selectOption('video')
      await card.getByRole('button',{name:'Continue',exact:true}).click()
      await card.getByRole('button',{name:'Include symbolic practices',exact:true}).click()
      await card.getByRole('button',{name:'Do not use my marks',exact:true}).click()
      await card.getByRole('button',{name:'No',exact:true}).click()
      await card.getByRole('button',{name:'No',exact:true}).click()
      await card.getByRole('button',{name:'Skip',exact:true}).click()
      const link=card.getByRole('link',{name:'Start',exact:true});await link.waitFor({state:'visible'})
      const popup=page.waitForEvent('popup');await link.click();await (await popup).close()
      await card.getByRole('button',{name:'No',exact:true}).click()
      assert.equal((await call('export',a)).body.records.length,0)
      await card.getByRole('button',{name:'Prepare to save feedback',exact:true}).click()
      await card.getByText('Only the item and your answer will be saved',{exact:false}).waitFor()
      assert.equal((await call('export',a)).body.records.length,0)
      const confirmButton=card.getByRole('button',{name:'Confirm save',exact:true})
      // WebKit can continue scrolling after an element first becomes visible.
      // Center it and wait until its actual hit target is stable before one
      // ordinary click; do not bypass actionability or retry the click.
      await confirmButton.evaluate(button=>button.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'}))
      await page.waitForFunction(button=>{
        const rect=button.getBoundingClientRect(), x=rect.left+rect.width/2, y=rect.top+rect.height/2
        const hit=document.elementFromPoint(x,y), previous=window.__hhStableRect
        const stable=previous&&Math.abs(previous.x-x)<0.5&&Math.abs(previous.y-y)<0.5
        window.__hhStableRect={x,y,count:stable?previous.count+1:0}
        return y>60&&y<innerHeight-60&&hit&&(hit===button||button.contains(hit))&&window.__hhStableRect.count>=6
      },await confirmButton.elementHandle())
      await confirmButton.evaluate(button=>{window.__hhSyntheticClicks=0;window.__hhConfirmNode=button;window.__hhClickTarget='none';button.addEventListener('click',()=>{window.__hhSyntheticClicks++},{once:true});document.addEventListener('click',event=>{const target=event.target instanceof Element?event.target:null;const label=target?.closest('button')?.textContent?.trim();window.__hhClickTarget={tag:target?.tagName||'unknown',button:['Confirm save','Cancel','Manage saved feedback','Another option'].includes(label)?label:(label?'other-button':'none'),x:Math.round(event.clientX),y:Math.round(event.clientY)}},{capture:true,once:true})})
      const saveResponse=page.waitForResponse(response=>response.url().endsWith('/api/app/intelligence/feedback/save')&&response.request().method()==='POST')
      await confirmButton.click()
      let savedResponse
      try {savedResponse=await saveResponse} catch(error) {
        console.log(JSON.stringify({browser:browserName,saveRequests,saveFailure,pageErrors,clickEvents:await page.evaluate(()=>window.__hhSyntheticClicks).catch(()=>null),clickTarget:await page.evaluate(()=>window.__hhClickTarget).catch(()=>null),confirmRect:await confirmButton.boundingBox().catch(()=>null),sameNode:await confirmButton.evaluate(button=>button===window.__hhConfirmNode).catch(()=>false),confirmEnabled:await confirmButton.isEnabled().catch(()=>false),alertVisible:await card.getByRole('alert').isVisible().catch(()=>false),prepareVisible:await card.getByRole('button',{name:'Prepare to save feedback',exact:true}).isVisible().catch(()=>false),confirmVisible:await confirmButton.isVisible().catch(()=>false)}))
        throw error
      }
      const savedBody=await savedResponse.json()
      assert.equal(savedResponse.status(),200,`feedback save returned ${savedResponse.status()} (${typeof savedBody?.error==='string'?savedBody.error:'no error code'})`)
      await card.getByText('Feedback saved.',{exact:true}).waitFor()
      await use.check()
      const nextRequest=page.waitForRequest(request=>request.url().endsWith('/api/app/intelligence/plan')&&request.method()==='POST')
      await card.getByRole('button',{name:'Another option',exact:true}).click()
      assert.equal(JSON.parse((await nextRequest).postData()).feedbackHistory,'avoid_not_useful')
      await card.getByRole('button',{name:'Manage saved feedback',exact:true}).click()
      await card.getByRole('button',{name:'Change to useful',exact:true}).click()
      await card.getByText('Confirm the change to this saved answer.',{exact:true}).waitFor()
      assert.equal((await call('export',a)).body.records[0].feedback,'not_useful')
      await card.getByRole('button',{name:'Confirm change',exact:true}).click()
      await card.getByRole('button',{name:'Change to not useful',exact:true}).waitFor()
      assert.equal((await call('export',a)).body.records[0].feedback,'useful')
      await card.getByRole('button',{name:'Change to not useful',exact:true}).click()
      await card.getByRole('button',{name:'Confirm change',exact:true}).click()
      await card.getByRole('button',{name:'Change to useful',exact:true}).waitFor()
      const download=page.waitForEvent('download')
      await card.getByRole('button',{name:'Download my feedback',exact:true}).click()
      const exported=await download
      assert.equal(exported.suggestedFilename(),'holistic-feedback.json')
      let bytes='';for await(const chunk of await exported.createReadStream())bytes+=chunk.toString()
      assert.equal(JSON.parse(bytes)[0].feedback,'not_useful')
      await card.getByRole('button',{name:'Delete all saved feedback',exact:true}).click()
      await card.getByText('No saved feedback.',{exact:true}).waitFor()
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true)
      let disabledIntercepted=0
      await context.route('**/api/app/intelligence/feedback/status',route=>{disabledIntercepted++;return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({managementAvailable:true,saveEnabled:false})})})
      const disabledPage=await context.newPage()
      await disabledPage.goto(origin+'/en/app/portfolio',{waitUntil:'networkidle',timeout:60000})
      await disabledPage.locator('#hh-portrait-tab-recommendations').click()
      const disabledCard=disabledPage.locator('[data-holistic-intelligence]')
      await disabledCard.getByRole('button',{name:'Manage saved feedback',exact:true}).waitFor()
      assert.ok(disabledIntercepted>0,'disabled capability response must reach the browser')
      assert.equal(await disabledCard.getByRole('checkbox',{name:'Use saved “not useful” feedback for this request',exact:true}).count(),0)
      await context.unroute('**/api/app/intelligence/feedback/status')
      const russian=await context.newPage();await russian.setViewportSize({width:320,height:844})
      await russian.goto(origin+'/ru/app/portfolio',{waitUntil:'networkidle',timeout:60000})
      await russian.locator('#hh-portrait-tab-recommendations').click()
      const russianCard=russian.locator('[data-holistic-intelligence]')
      await russianCard.getByRole('button',{name:'Управлять сохранёнными ответами',exact:true}).waitFor()
      assert.equal(await russianCard.getByRole('checkbox',{name:'Использовать сохранённые ответы «не полезно» для этого запроса',exact:true}).isChecked(),false)
      assert.equal(await russian.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true)
    } finally {await context.close().catch(()=>{})}
  } finally {await browser.close().catch(()=>{})}
  console.log(JSON.stringify({browser:browserName,auth:'synthetic-loopback-provider',database:'isolated-postgresql',owners:2,consent:'passed',isolation:'passed',feedbackAdjustment:'passed',revocation:'passed',cache:'passed',cabinetMobile:'passed'}))
} finally {await closeDatabase();await new Promise(resolve=>provider.close(resolve))}
