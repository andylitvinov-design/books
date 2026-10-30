// End-to-end local API + PostgreSQL isolation. Auth provider is synthetic;
// these unsigned test tokens must never be accepted by a real provider.
import http from 'node:http'
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {createHash} from 'node:crypto'
import {NextRequest,NextResponse} from 'next/server.js'
import {getAppConfig} from '../lib/app/config.js'
import {createRequestAuth} from '../lib/app/session.js'

const origin='http://127.0.0.1:3187', config=getAppConfig()
const db=new URL(config.databaseUrl)
if (!config.test || config.supabaseUrl!=='http://127.0.0.1:54329' ||
    !['127.0.0.1','localhost'].includes(db.hostname) || db.pathname!=='/hh_app_test' ||
    !config.origins.includes(origin)) throw new Error('ISOLATED_TEST_CONFIGURATION_REQUIRED')
const ids={a:['10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001'],
  b:['10000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002']}
const challenges=new Map()
const user=kind=>({id:ids[kind][0],aud:'authenticated',email:'synthetic@example.invalid',user_metadata:{}})
const token=kind=>{const [sub,session_id]=ids[kind];return 'synthetic.'+
  Buffer.from(JSON.stringify({sub,session_id,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')+'.signature'}
const server=http.createServer(async(req,res)=>{
  res.setHeader('content-type','application/json')
  if(req.url?.includes('/token')) {
    let body='';for await(const chunk of req)body+=chunk
    let parsed;try {parsed=JSON.parse(body)} catch {res.writeHead(400);res.end('{}');return}
    const kind=parsed.auth_code==='synthetic-code-a'?'a':parsed.auth_code==='synthetic-code-b'?'b':null
    const verifier=typeof parsed.code_verifier==='string'?parsed.code_verifier:''
    const challenge=createHash('sha256').update(verifier).digest('base64url')
    if(!kind||!verifier||challenge!==challenges.get(kind)){res.writeHead(400);res.end('{}');return}
    res.end(JSON.stringify({access_token:token(kind),refresh_token:'synthetic-refresh-'+kind,
      token_type:'bearer',expires_in:3600,user:user(kind)}));return
  }
  if(req.url?.endsWith('/user')) {
    let claims;try {claims=JSON.parse(Buffer.from((req.headers.authorization||'').split('.')[1],'base64url').toString())} catch { /* invalid token */ }
    const kind=Object.keys(ids).find(key=>claims?.sub===ids[key][0]&&claims?.session_id===ids[key][1])
    if(!kind){res.writeHead(401);res.end('{}');return}
    res.end(JSON.stringify(user(kind)));return
  }
  res.writeHead(404);res.end('{}')
})
await new Promise((resolve,reject)=>server.listen(54329,'127.0.0.1',resolve).once('error',reject))
try {
  const cookie=async kind=>{
    const request=(values=[])=>new NextRequest(origin+'/api/app/auth/callback',{
      headers:{cookie:values.map(c=>`${c.name}=${encodeURIComponent(c.value)}`).join('; ')}})
    const start=createRequestAuth(request(),config)
    const started=await start.client.auth.signInWithOAuth({provider:'google',options:{redirectTo:origin+'/api/app/auth/callback',skipBrowserRedirect:true}})
    assert.equal(started.error,null)
    challenges.set(kind,new URL(started.data.url).searchParams.get('code_challenge'))
    const invalid=await fetch(config.supabaseUrl+'/auth/v1/token?grant_type=pkce',{method:'POST',
      headers:{'content-type':'application/json'},body:JSON.stringify({auth_code:'synthetic-code-'+kind,code_verifier:'wrong-verifier'})})
    assert.equal(invalid.status,400)
    const verifier=start.apply(NextResponse.json({})).cookies.getAll()
    const exchange=createRequestAuth(request(verifier),config)
    const completed=await exchange.client.auth.exchangeCodeForSession('synthetic-code-'+kind)
    assert.equal(completed.error,null)
    return exchange.apply(NextResponse.json({})).cookies.getAll().map(c=>`${c.name}=${encodeURIComponent(c.value)}`).join('; ')
  }
  const a=await cookie('a'),b=await cookie('b')
  const body={requestId:'d4502108-a8b8-4d3b-813f-c255b452bde4',surface:'cabinet',
    intent:{language:'en',selectedTopics:['energy'],formats:['test']},
    preflight:{immediateDanger:'no',selfHarmThoughts:'no'},testHistory:'avoid_completed'}
  const call=async (cookies,payload=body,extra={})=>{
    const response=await fetch(origin+'/api/app/intelligence/plan',{method:'POST',
      headers:{origin,'content-type':'application/json',cookie:cookies,...extra},body:JSON.stringify(payload)})
    return {status:response.status,cacheControl:response.headers.get('cache-control'),body:await response.json()}
  }
  assert.equal((await call('')).status,401)
  assert.equal((await call(a,body,{origin:'https://hostile.example.invalid'})).status,403)
  assert.equal((await call(a,body,{'x-hh-account-id':ids.b[0]})).status,409)
  const urgent=await call(a,{...body,preflight:{immediateDanger:'no',selfHarmThoughts:'yes'}})
  assert.equal(urgent.body.status,'safety_handoff');assert.equal(urgent.body.primary,undefined)
  const first=await call(a), second=await call(b)
  assert.equal(first.status,200);assert.equal(second.status,200)
  assert.match(first.cacheControl,/no-store/)
  assert.equal(first.body.primary?.id,'test:hh-current-state')
  assert.equal(second.body.primary?.id,'test:hh-resource-pulse')
  const withoutConsent=await call(a,{...body,testHistory:undefined})
  assert.equal(withoutConsent.body.primary?.id,'test:hh-resource-pulse')
  const videoBody={...body,testHistory:undefined,videoHistory:'avoid_marked',symbolicInterest:'include',
    intent:{language:'en',audioLanguage:'en',selectedTopics:['energy'],formats:['video']}}
  const firstVideo=await call(a,videoBody),secondVideo=await call(b,videoBody)
  assert.equal(firstVideo.status,200);assert.equal(secondVideo.status,200)
  const offered=result=>[result.primary,...result.alternatives].filter(Boolean).map(item=>item.id)
  assert.equal(offered(firstVideo.body).includes('youtube:HqfixazXqRY'),false)
  assert.equal(offered(secondVideo.body).includes('youtube:HqfixazXqRY'),true)
  const combined=JSON.stringify([first.body,second.body])
  for(const [accountId,sessionId] of Object.values(ids)) {
    assert.equal(combined.includes(accountId),false);assert.equal(combined.includes(sessionId),false)
  }
  const tools=process.env.HH_INTELLIGENCE_BROWSER_TOOLS
  if(!tools) throw new Error('HH_INTELLIGENCE_BROWSER_TOOLS_REQUIRED')
  const {chromium}=createRequire(`${tools}/package.json`)('playwright')
  const browser=await chromium.launch({headless:true,...(process.env.HH_BROWSER_EXECUTABLE?{executablePath:process.env.HH_BROWSER_EXECUTABLE}:{})})
  try {
    // Exercise the real service worker with a fresh unauthenticated browser;
    // no route mocking or production account is involved.
    const guest=await browser.newContext({viewport:{width:390,height:844}})
    try {
      const page=await guest.newPage()
      await page.goto(origin+'/en/holistic-support',{waitUntil:'networkidle',timeout:60000})
      await page.evaluate(()=>navigator.serviceWorker.ready)
      await page.reload({waitUntil:'networkidle',timeout:60000})
      await page.waitForFunction(()=>Boolean(navigator.serviceWorker.controller))
      const privateCheck=await page.evaluate(async payload=>{
        const response=await fetch('/api/app/intelligence/plan',{method:'POST',
          headers:{'content-type':'application/json'},body:JSON.stringify(payload)})
        let cachedPrivate=0
        for(const name of await caches.keys()) for(const request of await (await caches.open(name)).keys())
          if(new URL(request.url).pathname.startsWith('/api/app')) cachedPrivate++
        return {status:response.status,cacheControl:response.headers.get('cache-control'),cachedPrivate}
      },body)
      assert.equal(privateCheck.status,401)
      assert.match(privateCheck.cacheControl,/no-store/)
      assert.equal(privateCheck.cachedPrivate,0)
    } finally {await guest.close()}
    for(const [cookies,title] of [[a,'Current State Check'],[b,'Resources & Inner Support']]) {
      const context=await browser.newContext({viewport:{width:390,height:844}})
      try {
        await context.addCookies(cookies.split('; ').map(item=>{
          const at=item.indexOf('=');return {name:item.slice(0,at),value:decodeURIComponent(item.slice(at+1)),url:origin}
        }))
        const page=await context.newPage()
        await page.goto(origin+'/en/app/portfolio',{waitUntil:'networkidle',timeout:60000})
        await page.locator('#hh-portrait-tab-recommendations').click()
        const card=page.locator('[data-holistic-intelligence]')
        await card.locator('select').selectOption('energy')
        await card.getByRole('button',{name:'Continue',exact:true}).click()
        await card.locator('select').selectOption('test')
        await card.getByRole('button',{name:'Continue',exact:true}).click()
        await card.getByRole('button',{name:'Use my test history',exact:true}).click()
        await card.getByRole('button',{name:'No',exact:true}).click()
        await card.getByRole('button',{name:'No',exact:true}).click()
        await card.getByRole('button',{name:'Skip',exact:true}).click()
        await card.getByText(title,{exact:true}).waitFor({state:'visible',timeout:30000})
        assert.equal(await card.getByRole('link').count(),0,'starting a test requires separate consent')
      } finally {await context.close()}
    }
  } finally {await browser.close()}
  console.log(JSON.stringify({auth:'synthetic-loopback-provider',database:'isolated-postgresql',owners:2,ownership:'passed',consent:'passed',cabinet:'passed',serviceWorkerPrivate:'passed'}))
} finally {await new Promise(resolve=>server.close(resolve))}
