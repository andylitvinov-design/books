import test from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { readFileSync } from 'node:fs'
import { publicDiagnosticUrl, observePublicNavigation } from '../scripts/ia-public-navigation-diagnostics.mjs'
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
