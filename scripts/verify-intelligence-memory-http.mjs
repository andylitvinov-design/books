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
import {B,SB,actor} from '../tests/helpers/app-db-setup.mjs'

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
  const browser=await require('playwright').chromium.launch({headless:true,...(process.env.HH_BROWSER_EXECUTABLE?{executablePath:process.env.HH_BROWSER_EXECUTABLE}:{})})
  try {
    const context=await browser.newContext({viewport:{width:390,height:844}})
    try {
      await context.addCookies(a.split('; ').map(item=>{const at=item.indexOf('=');return {name:item.slice(0,at),value:decodeURIComponent(item.slice(at+1)),url:origin}}))
      await context.route('https://www.youtube.com/**',route=>route.abort())
      const page=await context.newPage()
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
      await card.getByRole('button',{name:'Confirm save',exact:true}).click()
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
      await context.route('**/api/app/intelligence/feedback/status',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({managementAvailable:true,saveEnabled:false})}))
      const disabledPage=await context.newPage()
      await disabledPage.goto(origin+'/en/app/portfolio',{waitUntil:'networkidle',timeout:60000})
      await disabledPage.locator('#hh-portrait-tab-recommendations').click()
      const disabledCard=disabledPage.locator('[data-holistic-intelligence]')
      await disabledCard.getByRole('button',{name:'Manage saved feedback',exact:true}).waitFor()
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
  console.log(JSON.stringify({auth:'synthetic-loopback-provider',database:'isolated-postgresql',owners:2,consent:'passed',isolation:'passed',feedbackAdjustment:'passed',revocation:'passed',cache:'passed',cabinetMobile:'passed'}))
} finally {await closeDatabase();await new Promise(resolve=>provider.close(resolve))}
