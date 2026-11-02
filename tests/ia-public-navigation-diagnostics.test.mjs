import test from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { readFileSync } from 'node:fs'
import { publicDiagnosticUrl, observePublicNavigation, resizePublicViewport } from '../scripts/ia-public-navigation-diagnostics.mjs'
const origin = 'https://127.0.0.1:3444'
test('public diagnostics strip all query values and refuse private/external/credential URLs', () => {
  assert.deepEqual(publicDiagnosticUrl(origin + '/es/services/imagery-therapy?_rsc=secret&token=secret', origin), {path:'/es/services/imagery-therapy',rsc:true})
  for (const path of ['/admin/documents/private', '/en/client/private', '/api/client-access', '/en/app', '/es/services#secret']) assert.equal(publicDiagnosticUrl(origin + path, origin), null)
  for (const value of ['https://external.invalid/es/services', 'https://user:pass@127.0.0.1:3444/es/services', 'invalid']) assert.equal(publicDiagnosticUrl(value, origin), null)
})
test('observer records public chronology and CSP evidence without changing error collection', async () => {
  const page = new EventEmitter(), rows = [], errors = []
  let binding, init
  page.url = () => origin + '/es/services?secret=value'
  page.exposeBinding = async (_, fn) => {binding = fn}
  page.addInitScript = async fn => {init = fn}
  page.on('pageerror', e => errors.push(e.message))
  const diagnostic = await observePublicNavigation(page, {engine:'webkit',origin,record:e=>rows.push(e)})
  diagnostic.phase('webkit/es/services/390')
  const request = {url:()=>origin+'/es/services/psychohomeopathy?_rsc=secret',isNavigationRequest:()=>false,failure:()=>({errorText:'Load request cancelled'})}
  page.emit('request', request)
  page.emit('response', {url:request.url,request:()=>request,status:()=>200})
  page.emit('requestfailed', request)
  const error = new Error('secret URL due to access control checks')
  error.name = 'secret-bearing-custom-name'
  page.emit('pageerror',error)
  binding({}, {type:'pagehide',url:origin+'/es/services'})
  binding({}, {type:'securitypolicyviolation',url:origin+'/es/services',directive:'connect-src',blocked:'https://external.invalid/?secret'})
  binding({}, {type:'pagehide',url:origin+'/admin/documents/private'})
  assert.equal(rows.length,7)
  assert.equal(rows[4].accessControlMessage,true)
  assert.equal(rows[4].name,'OtherError')
  assert.equal(rows[6].directive,'connect-src')
  assert.doesNotMatch(JSON.stringify(rows), /secret|private|external\.invalid/)
  assert.equal(typeof init,'function')
  diagnostic.stop(); page.emit('pageerror',error)
  assert.equal(rows.length,7)
  assert.deepEqual(errors,[error.message,error.message])
})
test('IA verifier retains strict JavaScript error assertion and writes separate diagnostic evidence',()=>{
 const source=readFileSync(new URL('../scripts/verify-ia-v2.mjs',import.meta.url),'utf8')
 assert.match(source,/assert\.deepEqual\(errors, \[\]\)/)
 assert.match(source,/public-navigation-diagnostics\.json/)
 assert.match(source,/finally \{ diagnostic\.stop\(\) \}/)
 assert.doesNotMatch(source,/errors\.filter|errors\.splice/)
})

test('viewport settling waits for a delayed resize-triggered request rather than stale networkidle', async t => {
 const page=new EventEmitter(), request={}, events=[], frames=[]
 t.mock.timers.enable({apis:['setTimeout']})
 let settled=false, original=globalThis.requestAnimationFrame, signalFrames, pending
 const framesReady=new Promise(resolve=>{signalFrames=resolve})
 globalThis.requestAnimationFrame=callback=>{frames.push(callback);return frames.length}
 page.setViewportSize=async()=>{events.push('resize');page.emit('request',request)}
 page.evaluate=async callback=>{await callback();events.push('frames');signalFrames()}
 const errors=[];page.on('pageerror',e=>errors.push(e.message))
 try {
  pending=resizePublicViewport(page,{width:768,height:900},{quietMs:10,timeoutMs:1000}).then(()=>{settled=true;events.push('settled')})
  await Promise.resolve()
  assert.equal(frames.length,1)
  t.mock.timers.tick(80);frames.shift()()
  assert.equal(frames.length,1)
  t.mock.timers.tick(80);frames.shift()()
  await framesReady
  await Promise.resolve()
  t.mock.timers.tick(40);assert.equal(settled,false)
  assert.deepEqual(events,['resize','frames'])
  page.emit('pageerror',new Error('must remain visible'))
  page.emit('requestfinished',request)
  t.mock.timers.tick(10)
  await pending;assert.equal(settled,true);assert.deepEqual(errors,['must remain visible'])
  for(const event of ['request','requestfinished','requestfailed'])assert.equal(page.listenerCount(event),0)
 } finally {
  page.emit('requestfinished',request)
  t.mock.timers.tick(10)
  try {await pending} finally {if(original===undefined)delete globalThis.requestAnimationFrame;else globalThis.requestAnimationFrame=original}
 }
})
test('viewport settling rejects unfinished requests and removes its observers', async () => {
 const page=new EventEmitter();page.setViewportSize=async()=>page.emit('request',{});page.evaluate=async()=>{}
 await assert.rejects(resizePublicViewport(page,{width:768,height:900},{quietMs:1,timeoutMs:15}),/did not settle/)
 for(const event of ['request','requestfinished','requestfailed'])assert.equal(page.listenerCount(event),0)
 const source=readFileSync(new URL('../scripts/verify-ia-v2.mjs',import.meta.url),'utf8')
 assert.match(source,/await resizePublicViewport\(page, \{ width, height: 900 \}\)\s+assert.equal\(\(await go\(page, path\)\)/)
 assert.match(source,/assert\.deepEqual\(errors, \[\]\)/)
})

test('IA browser acceptance verifies the global My Space dialog on public pages', () => {
  const source = readFileSync(new URL('../scripts/verify-ia-v2.mjs', import.meta.url), 'utf8')
  assert.match(source, /Global My Space dialog is available across public routes/)
  assert.match(source, /cabinetEntry\.click\(\)/)
  assert.match(source, /home-personal-space-dialog/)
  assert.doesNotMatch(source, /all other public routes retain the direct Cabinet link/)
})

test('mobile menu keeps a 44px touch target at narrow widths', () => {
  const css = readFileSync(new URL('../app/holistic-house-home.css', import.meta.url), 'utf8')
  assert.doesNotMatch(css, /\.house-header--services \.site-main-menu-trigger\s*\{\s*width:\s*40px/)
  assert.match(css, /\.house-header--services \.site-main-menu-trigger\s*\{\s*width:\s*44px;\s*min-width:\s*44px/)
})

test('header keyboard acceptance visits visible shop and cart before language', () => {
  const source = readFileSync(new URL('../scripts/verify-ia-v2.mjs', import.meta.url), 'utf8')
  assert.match(source, /visibleHeaderLink/)
  assert.match(source, /data-nav-item="shop"/)
  assert.match(source, /data-nav-item="cart"/)
  assert.match(source, /expect\(visibleHeaderLink\)\.toBeFocused\(\)/)
})

test('IA acceptance scrolls each menu destination into view without omitting it', () => {
  const source = readFileSync(new URL('../scripts/verify-ia-v2.mjs', import.meta.url), 'utf8')
  assert.match(source, /for \(const link of await links\.all\(\)\)\s*\{\s*await link\.scrollIntoViewIfNeeded\(\)/)
  assert.match(source, /await inViewport\(link, label \+ '\/site-menu-link'\)/)
})

test('PR WebKit public navigation stays bounded while full manual/Chromium and private Safari coverage remain', () => {
  const source = readFileSync(new URL('../scripts/verify-ia-v2.mjs', import.meta.url), 'utf8')
  const browser = source.slice(source.indexOf('async function verifyPublicHeaderMatrix'), source.indexOf('async function verifyPublicDiscoveryNavigation'))
  assert.match(browser, /const fullHeaderWidths = \[320, 360, 374, 375, 390, 430, 768, 1023, 1024, 1100, 1280\]/)
  assert.match(browser, /const prWebkitHeaderWidths = \[320, 390, 768, 1280\]/)
  assert.match(browser, /engine === 'webkit' && process\.env\.GITHUB_EVENT_NAME === 'pull_request'/)
  assert.match(browser, /for \(const width of publicHeaderWidths\)/)
  assert.match(browser, /await expect\(header\)\.toBeVisible\(\)/)
  assert.doesNotMatch(browser, /waitForLoadState\('networkidle'\)/)
  assert.match(source, /await verifyPublicHeaderMatrix\(sp, 'webkit'\)/)
  assert.match(source, /await authenticateOwner\(safari\)/)
  assert.match(source, /await expect\(sp\.locator\('\.canonical-progress-item'\)\)\.toHaveCount\(2\)/)
})
