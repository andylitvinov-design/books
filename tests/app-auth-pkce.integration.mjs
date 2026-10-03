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
    'export const accountWrites = []; const createAppRepository = () => ({ensureAccount: async actor => accountWrites.push(actor.id)})')
  .replace(/import \{ consumeRate \} from '@\/lib\/app\/database'/, 'const consumeRate = async () => {}')
  .replace(/from '(@\/[^']+)'/g, (_, name) => `from '${new URL('../' + name.slice(2) + '.js', import.meta.url)}'`)
  .replace("from 'next/server.js'", `from '${new URL('../node_modules/next/server.js', import.meta.url)}'`)
const route = await import('data:text/javascript;base64,' + Buffer.from(routeSource).toString('base64'))
async function routeStart(cookies = [], intentId) {
  const req = new NextRequest(origin + '/api/app/auth/start', { method:'POST', headers:{
    origin, 'content-type':'application/json', cookie:cookies.map(c=>`${c.name}=${encodeURIComponent(c.value)}`).join('; '),
  }, body:JSON.stringify({locale:'en', ...(intentId ? {intentId} : {})}) })
  const response = await route.POST(req, {params:Promise.resolve({path:['auth','start']})})
  assert.equal(response.status, 200)
  const {redirectUrl} = await response.json(), url = new URL(redirectUrl)
  const jar = new Map(cookies.map(c=>[c.name,c]))
  for(const c of response.cookies.getAll()) { if(c.maxAge===0) jar.delete(c.name); else jar.set(c.name,c) }
  return {cookies:[...jar.values()], callback:new URL(url.searchParams.get('redirect_to')), challenge:url.searchParams.get('code_challenge')}
}
async function routeCallback(flow, cookies, options={}) {
  const url = new URL(flow.callback)
  if(options.cancelled) url.searchParams.set('error','access_denied')
  else url.searchParams.set('code','synthetic-code')
  const req = new NextRequest(url, {headers:{cookie:cookies.map(c=>`${c.name}=${encodeURIComponent(c.value)}`).join('; ')}})
  return route.GET(req,{params:Promise.resolve({path:['auth','callback']})})
}
test('overlapping route starts exchange the selected flow and return only to its exact Save intent', async t => {
  const intentA='30000000-0000-4000-8000-000000000001',intentB='30000000-0000-4000-8000-000000000002'
  const a=await routeStart([],intentA), b=await routeStart(a.cookies,intentB)
  provider(t,a.challenge)
  const response=await routeCallback(a,b.cookies)
  assert.equal(response.status,303)
  assert.equal(response.headers.get('location'),origin+'/en/app/continue?intent='+intentA)
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
