/** Real pinned SSR/Auth SDK + Next cookies; isolated provider responses only. */
import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { NextRequest, NextResponse } from 'next/server.js'
import { createRequestAuth } from '../lib/app/session.js'
import { getAppConfig } from '../lib/app/config.js'

const origin = 'https://app.example.invalid'
const config = { supabaseUrl: 'https://provider.example.invalid', publishableKey: 'synthetic-key', test: false }
function request(cookies = []) {
  return new NextRequest(origin + '/api/app/auth/callback', {
    headers: { cookie: cookies.map(c => `${c.name}=${encodeURIComponent(c.value)}`).join('; ') },
  })
}
function commit(auth, browserCookies = []) {
  const response = auth.apply(NextResponse.redirect(origin + '/en/app', 303))
  const jar = new Map(browserCookies.map(c => [c.name, c]))
  for (const c of response.cookies.getAll()) {
    if (c.maxAge === 0) jar.delete(c.name)
    else jar.set(c.name, c)
    assert.equal(c.httpOnly, true)
    assert.equal(c.secure, true)
    assert.equal(c.sameSite, 'lax')
    assert.equal(c.path, '/')
  }
  return { response, cookies: [...jar.values()] }
}
async function start(cookies = []) {
  const auth = createRequestAuth(request(cookies), config)
  const { data, error } = await auth.client.auth.signInWithOAuth({ provider: 'google', options: {
    redirectTo: origin + '/api/app/auth/callback?locale=en', skipBrowserRedirect: true,
  } })
  assert.equal(error, null)
  return { ...commit(auth, cookies), data, challenge: new URL(data.url).searchParams.get('code_challenge') }
}
const user = { id: '10000000-0000-4000-8000-000000000001', aud: 'authenticated', email: 'synthetic@example.invalid', user_metadata: {} }
function provider(t, challenge, size = 0) {
  let calls = 0
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    if (new URL(url).pathname.endsWith('/logout')) return new Response(null, { status: 204 })
    if (new URL(url).pathname.endsWith('/user')) return Response.json(user)
    assert.equal(new URL(url).searchParams.get('grant_type'), 'pkce')
    const body = JSON.parse(options.body)
    calls++
    if (createHash('sha256').update(body.code_verifier || '').digest('base64url') !== challenge)
      return Response.json({ code: 'bad_code_verifier', message: 'Synthetic verifier mismatch' }, { status: 400 })
    const exp = Math.floor(Date.now()/1000) + 3600
    const claims = { sub: user.id, session_id: '20000000-0000-4000-8000-000000000001', exp }
    return Response.json({ access_token: 'synthetic.' + Buffer.from(JSON.stringify(claims)).toString('base64url') + '.signature', refresh_token: 'synthetic-refresh-' + 'x'.repeat(size), token_type: 'bearer', expires_in: 3600, user })
  })
  return () => calls
}
test('auth start persists fixed verifier, per-flow slot and index with secure server-only flags', async () => {
  const flow = await start()
  assert(flow.cookies.some(c => c.name === 'hh-app-auth-code-verifier'))
  assert(flow.cookies.some(c => c.name === 'hh-app-auth-flows-code-verifier'))
  assert(flow.cookies.some(c => /^hh-app-auth-flow-[a-zA-Z0-9_-]+-code-verifier$/.test(c.name)))
})
test('valid SDK PKCE exchange commits chunked session on 303 and supports verified reload and logout', async t => {
  const flow = await start()
  const calls = provider(t, flow.challenge, 5000)
  const auth = createRequestAuth(request(flow.cookies), config)
  const { error } = await auth.client.auth.exchangeCodeForSession('synthetic-code')
  assert.equal(error, null)
  assert.equal(calls(), 1)
  const saved = commit(auth, flow.cookies)
  assert.equal(saved.response.status, 303)
  assert(!saved.response.headers.get('location').includes('auth=failed'))
  assert(saved.cookies.some(c => c.name === 'hh-app-auth.0'))
  const reloaded = createRequestAuth(request(saved.cookies), config)
  assert.equal((await reloaded.verified()).id, user.id)
  await reloaded.client.auth.signOut({ scope: 'local' })
  const loggedOut = reloaded.clear(reloaded.apply(NextResponse.json({})))
  assert(loggedOut.cookies.getAll().filter(c => c.name.startsWith('hh-app-auth')).every(c => c.maxAge === 0))
})
test('missing or wrong verifier fails closed without a session', async t => {
  const first = await start(), second = await start()
  const calls = provider(t, first.challenge)
  const missing = createRequestAuth(request(), config)
  assert((await missing.client.auth.exchangeCodeForSession('synthetic-code')).error)
  assert.equal(calls(), 0)
  const wrong = createRequestAuth(request(second.cookies), config)
  assert((await wrong.client.auth.exchangeCodeForSession('synthetic-code')).error)
  assert.equal(calls(), 1)
  assert(!commit(wrong).cookies.some(c => /^hh-app-auth(\.\d+)?$/.test(c.name)))
})

// Execute the actual route, substituting only external DB/rate boundaries.
// Auth and cookie implementations remain the pinned production SDK and adapter.
let routeSource = await readFile(new URL('../app/api/app/[...path]/route.js', import.meta.url), 'utf8')
routeSource = routeSource
  .replace("from 'next/server'", "from 'next/server.js'")
  .replace(/import \{ getAppConfig, requireSameOrigin, requestOrigin \} from '@\/lib\/app\/config'/,
    `import { requireSameOrigin, requestOrigin } from '${new URL('../lib/app/config.js', import.meta.url)}'; const getAppConfig = () => (${JSON.stringify({...config, origins:[origin]})})`)
  .replace(/import \{ createAppRepository \} from '@\/lib\/app\/repository'/,
    'export const accountWrites = []; export let syntheticOnboardingState = "active"; export const setSyntheticOnboardingState = value => { syntheticOnboardingState = value }; const createAppRepository = () => ({ensureAccount: async actor => { accountWrites.push(actor.id); return { onboardingState: syntheticOnboardingState } }})')
  .replace(/import \{ consumeRate \} from '@\/lib\/app\/database'/, 'const consumeRate = async () => {}')
  .replace(/from '(@\/[^']+)'/g, (_, name) => { const file=name.slice(2); return `from '${new URL('../' + file + (/\.mjs$/.test(file)?'':'.js'),import.meta.url)}'` })
  .replace("from 'next/server.js'", `from '${new URL('../node_modules/next/server.js', import.meta.url)}'`)
const route = await import('data:text/javascript;base64,' + Buffer.from(routeSource).toString('base64'))
async function routeStart(cookies = [], intentId, continueTo = null, extra = {}) {
  const req = new NextRequest(origin + '/api/app/auth/start', { method:'POST', headers:{
    origin, 'content-type':'application/json', cookie:cookies.map(c=>`${c.name}=${encodeURIComponent(c.value)}`).join('; '),
  }, body:JSON.stringify({locale:'en', ...(intentId ? {intentId} : {}), ...(continueTo ? {continueTo} : {}), ...extra}) })
  const response = await route.POST(req, {params:Promise.resolve({path:['auth','start']})})
  assert.equal(response.status, 200)
  const {redirectUrl} = await response.json(), url = new URL(redirectUrl)
  const jar = new Map(cookies.map(c=>[c.name,c]))
  for(const c of response.cookies.getAll()) { if(c.maxAge===0) jar.delete(c.name); else jar.set(c.name,c) }
  return {cookies:[...jar.values()], callback:new URL(url.searchParams.get('redirect_to')), challenge:url.searchParams.get('code_challenge')}
}
test('Telegram OIDC uses the real OAuth PKCE start, stays off by default and does not weaken Google',async()=>{
  const original=process.env.HH_APP_TELEGRAM_OIDC_ENABLED
  async function call(body){
    const req=new NextRequest(origin+'/api/app/auth/start',{
      method:'POST',headers:{origin,'content-type':'application/json'},
      body:JSON.stringify({locale:'en',...body}),
    })
    const response=await route.POST(req,{params:Promise.resolve({path:['auth','start']})})
    return {status:response.status,data:await response.json(),cookies:response.cookies.getAll()}
  }
  try{
    delete process.env.HH_APP_TELEGRAM_OIDC_ENABLED
    const blocked=await call({provider:'telegram'})
    assert.equal(blocked.status,503)
    assert.equal(blocked.data.error,'TELEGRAM_LOGIN_UNAVAILABLE')
    const invalid=await call({provider:'not-a-provider'})
    assert.equal(invalid.status,400)
    assert.equal(invalid.data.error,'INVALID_AUTH_PROVIDER')
    const google=await call({provider:'google'})
    assert.equal(google.status,200)
    assert.equal(new URL(google.data.redirectUrl).searchParams.get('provider'),'google')
    process.env.HH_APP_TELEGRAM_OIDC_ENABLED='true'
    const telegram=await call({provider:'telegram'})
    assert.equal(telegram.status,200)
    const url=new URL(telegram.data.redirectUrl)
    assert.equal(url.searchParams.get('provider'),'custom:telegram')
    assert.equal(url.searchParams.get('code_challenge_method')?.toLowerCase(),'s256')
    assert(telegram.cookies.some(item=>item.httpOnly && item.name.startsWith('hh-app-auth')))
  }finally{
    if(original===undefined)delete process.env.HH_APP_TELEGRAM_OIDC_ENABLED
    else process.env.HH_APP_TELEGRAM_OIDC_ENABLED=original
  }
})

async function routeCallback(flow, cookies, options={}) {
  const url = new URL(flow.callback)
  if(options.cancelled) url.searchParams.set('error','access_denied')
  else url.searchParams.set('code','synthetic-code')
  const req = new NextRequest(url, {headers:{cookie:cookies.map(c=>`${c.name}=${encodeURIComponent(c.value)}`).join('; ')}})
  return route.GET(req,{params:Promise.resolve({path:['auth','callback']})})
}
test('real Google OAuth returns to the exact master chat after a mobile sign-in',async t=>{
  const flow=await routeStart([],null,'direct-messages',{locale:'ru',recipientSlug:'master-anna'})
  assert.equal(flow.callback.searchParams.get('continue'),'direct-messages')
  assert.equal(flow.callback.searchParams.get('recipientSlug'),'master-anna')
  provider(t,flow.challenge)
  const response=await routeCallback(flow,flow.cookies)
  assert.equal(response.status,303)
  assert.equal(response.headers.get('location'),origin+'/ru/app/messages?to=master-anna')
  assert(response.cookies.getAll().some(c=>/^hh-app-auth(\.\d+)?$/.test(c.name)&&c.value))
})

test('first-time account consent returns to the chosen practitioner, not a blocked inbox',async t=>{
  route.setSyntheticOnboardingState('pending')
  try{
    const flow=await routeStart([],null,'direct-messages',{locale:'ru',recipientSlug:'master-anna'})
    provider(t,flow.challenge)
    const response=await routeCallback(flow,flow.cookies)
    assert.equal(response.status,303)
    assert.equal(response.headers.get('location'),
      origin+'/ru/app/portrait?afterSignIn=messages&chatLocale=ru&to=master-anna')
  }finally{route.setSyntheticOnboardingState('active')}
})
test('Spanish new-user messenger consent uses existing English Cabinet, then Spanish chat',async t=>{
  route.setSyntheticOnboardingState('pending')
  try{
    const flow=await routeStart([],null,'direct-messages',{locale:'es',recipientSlug:'master-ana'})
    provider(t,flow.challenge)
    const response=await routeCallback(flow,flow.cookies)
    assert.equal(response.status,303)
    assert.equal(response.headers.get('location'),
      origin+'/en/app/portrait?afterSignIn=messages&chatLocale=es&to=master-ana')
  }finally{route.setSyntheticOnboardingState('active')}
})
test('native OAuth transfers public master slug only; PKCE is exchanged in-app',async()=>{
  const flow=await routeStart([],null,'direct-messages',{locale:'es',recipientSlug:'master-ana',native:true})
  const response=await routeCallback(flow,flow.cookies)
  assert.equal(response.status,303)
  const handoff=new URL(response.headers.get('location'))
  assert.equal(handoff.protocol,'holistichouse:')
  assert.equal(handoff.hostname,'auth')
  assert.equal(handoff.pathname,'/callback')
  assert.equal(handoff.searchParams.get('locale'),'es')
  assert.equal(handoff.searchParams.get('continue'),'direct-messages')
  assert.equal(handoff.searchParams.get('recipientSlug'),'master-ana')
  assert.equal(handoff.searchParams.get('code'),'synthetic-code')
})

test('master chat OAuth never accepts arbitrary redirect paths or invalid recipient slugs',async()=>{
  for(const body of [
    {locale:'en',continueTo:'direct-messages',recipientSlug:'../admin'},
    {locale:'ru',continueTo:'direct-messages',recipientSlug:'master?next=https://evil.example'},
    {locale:'en',continueTo:'direct-messages',recipientSlug:'a'},
    {locale:'es',continueTo:'direct-messages',recipientSlug:'A'.repeat(91)},
    {locale:'en',continueTo:'cabinet',recipientSlug:'master-1'},
    {locale:'ru',recipientSlug:'master-1'},
  ]){
    const req=new NextRequest(origin+'/api/app/auth/start',{method:'POST',headers:{
      origin,'content-type':'application/json',
    },body:JSON.stringify(body)})
    const response=await route.POST(req,{params:Promise.resolve({path:['auth','start']})})
    assert.equal(response.status,400,JSON.stringify(body))
  }
  const forged=new NextRequest(origin+'/api/app/auth/callback?locale=en&code=foo&continue=cabinet&recipientSlug=master-1')
  const denied=await route.GET(forged,{params:Promise.resolve({path:['auth','callback']})})
  assert.equal(denied.status,400)
})

test('overlapping route starts exchange the selected flow and return only to its exact Save intent', async t => {
  const intentA='30000000-0000-4000-8000-000000000001',intentB='30000000-0000-4000-8000-000000000002'
  const a=await routeStart([],intentA), b=await routeStart(a.cookies,intentB)
  provider(t,a.challenge)
  const response=await routeCallback(a,b.cookies)
  assert.equal(response.status,303)
  assert.equal(response.headers.get('location'),origin+'/en/app/continue?intent='+intentA+'&auto=1')
  assert(response.cookies.getAll().some(c=>/^hh-app-auth(\.\d+)?$/.test(c.name)&&c.value))
})
test('cancelled older callback does not clear the newer verifier or unrelated session cookies', async () => {
  const a=await routeStart(), b=await routeStart(a.cookies)
  const response=await routeCallback(a,b.cookies,{cancelled:true})
  assert.equal(response.status,303)
  assert.equal(response.headers.get('location'),origin+'/en/app?auth=cancelled')
  assert(!response.cookies.getAll().some(c=>c.maxAge===0&&b.cookies.some(old=>old.name===c.name)))
})
test('failed older exchange does not clear a newer flow',async t=>{
  const a=await routeStart(), b=await routeStart(a.cookies)
  provider(t,'wrong-synthetic-challenge')
  const response=await routeCallback(a,b.cookies)
  assert.equal(response.headers.get('location'),origin+'/en/app?auth=failed')
  const nextFlow=b.callback.searchParams.get('sb_flow_id')
  assert(nextFlow,'SDK must identify each callback flow')
  assert(!response.cookies.getAll().some(c=>c.name===`hh-app-auth-flow-${nextFlow}-code-verifier`&&c.maxAge===0))
})

test('Production rejects placeholder and privileged keys before offering a doomed Google exchange',()=>{
  const env={HH_APP_ENABLED:'true',VERCEL_ENV:'production',HH_APP_PRODUCTION_APPROVED:'true',HH_APP_SUPABASE_URL:config.supabaseUrl,HH_APP_DATABASE_URL:'postgres://hh_app_runtime:synthetic@db.example.invalid/app',HH_APP_ENCRYPTION_KEY:Buffer.alloc(32).toString('base64'),HH_APP_ALLOWED_ORIGINS:origin}
  for(const key of ['synthetic-placeholder-not-a-key', 'sb_secret_'+'a'.repeat(32)])
    assert.throws(()=>getAppConfig({...env,HH_APP_SUPABASE_PUBLISHABLE_KEY:key}), /APP_UNAVAILABLE/)
  const key='sb_publishable_'+'a'.repeat(32)
  assert.equal(getAppConfig({...env,HH_APP_SUPABASE_PUBLISHABLE_KEY:key}).publishableKey,key)
})

test('repeated starts replace stale fixed verifier chunks without dropping per-flow cookies',async()=>{
  const stale=[{name:'hh-app-auth-code-verifier.0',value:'stale-generation'},{name:'hh-app-auth-code-verifier.1',value:'stale-tail'}]
  const a=await start(stale), b=await start(a.cookies)
  assert(!b.cookies.some(c=>/^hh-app-auth-code-verifier\.\d+$/.test(c.name)))
  assert.equal(b.cookies.filter(c=>/^hh-app-auth-flow-[a-zA-Z0-9_-]+-code-verifier$/.test(c.name)).length,2)
  assert(b.cookies.some(c=>c.name==='hh-app-auth-flows-code-verifier'))
})
test('gateway API-key rejection cannot create an Account or commit a session',async t=>{
  const flow=await routeStart(), before=route.accountWrites.length
  t.mock.method(globalThis,'fetch',async()=>Response.json({message:'Invalid API key'},{status:401}))
  const response=await routeCallback(flow,flow.cookies)
  assert.equal(response.headers.get('location'),origin+'/en/app?auth=failed')
  assert.equal(route.accountWrites.length,before)
  assert(!response.cookies.getAll().some(c=>/^hh-app-auth(\.\d+)?$/.test(c.name)&&c.value))
})
test('explicit missing or malformed flow never falls back to another tab verifier',async t=>{
  const flow=await routeStart(), calls=provider(t,flow.challenge)
  for(const id of ['', 'invalid!', 'a'.repeat(32)]){
    const target={...flow,callback:new URL(flow.callback)}
    target.callback.searchParams.set('sb_flow_id',id)
    const response=await routeCallback(target,flow.cookies)
    assert.equal(response.headers.get('location'),origin+'/en/app?auth=failed')
  }
  assert.equal(calls(),0)
})

test('session cabinet one-tap OAuth accepts only allowlisted app destinations, never guest secrets', async t => {
 const cases = [
  ['cabinet','/en/app/portrait'],['my-practice','/en/practice'],['practice-preview','/en/practice'],['my-tests','/en/app/tests'],
  ['my-courses','/en/app/course'],['reports','/en/app/portrait#personal-reports']
 ]
 for (const [continuation,path] of cases) {
  const flow = await routeStart([],null,continuation)
  assert.equal(flow.callback.searchParams.get('continue'),continuation)
  const response = await routeCallback(flow,flow.cookies,{cancelled:true})
  const url=new URL(response.headers.get('location'))
  assert.equal(url.pathname+url.hash,path)
  assert.equal(url.searchParams.get('auth'),'cancelled')
  if (continuation === 'cabinet') assert.equal(url.searchParams.get('space'), 'today')
  if (continuation === 'reports') assert.equal(url.searchParams.get('space'), 'reports')
  assert(!url.href.includes('client/session/'))
 }
 const forbidden = new NextRequest(origin + '/api/app/auth/start',{
  method:'POST',headers:{origin,'content-type':'application/json'},
  body:JSON.stringify({locale:'en',continueTo:'https://outside.example.invalid/steal'})
 })
 const rejected=await route.POST(forbidden,{params:Promise.resolve({path:['auth','start']})})
 assert.equal(rejected.status,400)
})

// Run the Telegram OIDC identity-proof and multilingual-entry suite inside the
// existing mandatory App R1 PKCE job; never leave this security test orphaned.
await import('./app-telegram-oidc-login.test.mjs')

test('Commander owner login check always ends and exposes a retry action when auth provider is slow', async () => {
  const source = await readFile(new URL('../public/commander-connect.js', import.meta.url), 'utf8')
  const page = await readFile(new URL('../public/commander-connect.html', import.meta.url), 'utf8')
  assert.ok(page.includes('commander-connect.js?v=20261109-owner-timeout-v1'))
  assert.match(source, /fetchWithTimeout/)
  assert.match(source, /8000, 'Проверка сессии'/)
  assert.match(source, /10000, 'Проверка владельца'/)
  assert.match(source, /12000, 'Google-вход'/)
  assert.match(source, /showAction\(String\(error\.message \|\| error\) \+ ' Войдите повторно через Google\.'/)
  assert.match(source, /Повторить проверку/)
  assert.match(source, /button\.addEventListener\('click'/)
  assert.doesNotMatch(source, /addEventListener\('click', startGoogle, \{ once: true \}\)/)
})


test('Commander login document is rewritten through the nonce-aware page under strict-dynamic CSP', async () => {
  const middleware = await readFile(new URL('../middleware.ts', import.meta.url), 'utf8')
  const page = await readFile(new URL('../app/commander-connect/page.tsx', import.meta.url), 'utf8')
  const layout = await readFile(new URL('../app/layout.tsx', import.meta.url), 'utf8')
  assert.ok(middleware.includes("pathname === '/commander-connect.html'"))
  assert.ok(middleware.includes("NextResponse.rewrite(new URL('/commander-connect'"))
  assert.ok(middleware.includes("request: { headers: requestHeaders }"))
  assert.ok(middleware.includes("requestHeaders.set('x-standalone-commander', '1')"))
  assert.ok(layout.includes('standaloneCommander ? children'))
  assert.ok(page.includes("import Script from 'next/script'"))
  assert.ok(page.includes("const requestHeaders = await headers()"))
  assert.ok(page.includes("requestHeaders.get('x-nonce')"))
  assert.ok(page.includes("nonce={nonce}"))
  assert.ok(page.includes('/commander-connect.js?v=20261109-owner-csp-nonce-v2'))
})


test('Commander SSO handoff includes the existing Supabase refresh token only for the monitor session',async()=>{
 const route=await readFile(new URL('../app/api/app/commander/session/route.js',import.meta.url),'utf8')
 const connect=await readFile(new URL('../public/commander-connect.js',import.meta.url),'utf8')
 assert.match(route,/auth\.client\.auth\.getSession\(\)/)
 assert.match(route,/refreshToken/)
 assert.match(route,/privateStoreConfigured: true/)
 assert.match(connect,/typeof data\.refreshToken !== 'string'/)
 assert.match(connect,/refresh_token: data\.refreshToken/)
 assert.match(connect,/target\.hash = new URLSearchParams/)
 assert.doesNotMatch(connect,/localStorage\.setItem\([^,]*refresh/i)
})

test('Commander owner handoff accepts 12-character provider refresh tokens without bypassing verification', async () => {
  const handler = await readFile(new URL('../app/api/app/commander/session/route.js', import.meta.url), 'utf8')
  const client = await readFile(new URL('../public/commander-connect.js', import.meta.url), 'utf8')
  assert.match(handler, /refreshToken\.length < 12 \|\| refreshToken\.length > 4096/)
  assert.doesNotMatch(handler, /refreshToken\.length < 20/)
  assert.match(client, /data\.refreshToken\.length < 12 \|\| data\.refreshToken\.length > 4096/)
  assert.ok(handler.indexOf('const actor = await auth.verified()') < handler.indexOf('const refreshToken ='))
  assert.match(handler, /data\?\.owner !== true/)
  assert.match(handler, /data\?\.privateStoreConfigured !== true/)
  assert.match(client, /function recoverHandoff\(error\)/)
  assert.match(client, /error\?\.status === 401/)
  assert.match(client, /recoverHandoff\(error\)/)
  assert.match(client, /method: 'POST'/)
  assert.match(client, /credentials: 'same-origin'/)
  assert.match(client, /target\.hash = new URLSearchParams/)
})
