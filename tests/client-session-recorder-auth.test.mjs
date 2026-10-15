import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {getRecorderReadiness} from '../lib/clients/recording-readiness.js'

const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const response=(status,payload={})=>({status,ok:status>=200&&status<300,json:async()=>payload})

test('an older /admin login obtains /api/admin access once without repeating the camera prompt',async()=>{
  const calls=[]
  const results=[response(401,{error:'ADMIN_SIGN_IN_REQUIRED'}),response(200,{ready:true}),response(200,{ready:true,videoReady:false,videoLimitBytes:0})]
  const data=await getRecorderReadiness('client-a',{request:async(url,opts)=>{
    calls.push({url,opts})
    return results.shift()
  }})
  assert.equal(data.ready,true)
  assert.equal(data.videoReady,false,'audio does not depend on video storage')
  assert.deepEqual(calls.map(call=>call.url),[
    '/api/admin/clients/client-a/sessions/status',
    '/admin/api/recorder-auth',
    '/api/admin/clients/client-a/sessions/status',
  ])
  assert.equal(calls[1].opts.method,'POST')
  assert.ok(calls.every(call=>call.opts.credentials==='same-origin'))
})

test('expired owner session never grants access and never requests the microphone',async()=>{
  let calls=0
  await assert.rejects(getRecorderReadiness('client-a',{request:async()=>{
    calls++
    return response(401,{error:'ADMIN_SIGN_IN_REQUIRED'})
  }}),/ADMIN_SIGN_IN_REQUIRED/)
  assert.equal(calls,2,'try status then one same-origin owner bridge, not an infinite retry')
})

test('valid audio readiness does not require an external video provider',async()=>{
  const calls=[]
  const data=await getRecorderReadiness('client-a',{request:async(url)=>{
    calls.push(url)
    return response(200,{ready:true,videoReady:false,videoLimitBytes:0})
  }})
  assert.equal(data.ready,true)
  assert.deepEqual(calls,['/api/admin/clients/client-a/sessions/status'])
})

test('server-side audio storage errors do not try to regenerate owner auth',async()=>{
  const calls=[]
  await assert.rejects(getRecorderReadiness('client-a',{request:async(url)=>{
    calls.push(url)
    return response(503,{error:'MEDIA_STORAGE_UNAVAILABLE'})
  }}),/MEDIA_STORAGE_UNAVAILABLE/)
  assert.equal(calls.length,1)
})

test('practitioner cookies are scoped to both editor and upload API, never the whole public site',()=>{
  const session=source('lib/prescriptions/admin-session.js')
  const admin=source('lib/prescriptions/admin.js')
  assert.match(session,/path: '\/admin'/)
  assert.match(session,/path: '\/api\/admin'/)
  assert.match(session,/adminApiCookieName = 'prescriptions_admin_api'/)
  assert.match(session,/httpOnly: true/)
  assert.match(session,/sameSite: 'strict'/)
  assert.match(session,/response\.cookies\.set\(adminApiCookieName/)
  assert.match(admin,/jar\.set\(adminApiCookieName, signature, adminApiSessionOptions\)/)
  assert.match(admin,/jar\.set\(adminApiCookieName, '', \{ \.\.\.adminApiSessionOptions, maxAge: 0 \}\)/)
  assert.match(admin,/jar\.get\(adminApiCookieName\)/)
})

test('old-cookie upgrade refuses anonymous or cross-site callers',()=>{
  const route=source('app/admin/api/recorder-auth/route.js')
  assert.match(route,/requireAdminRequest\(\)/)
  assert.match(route,/issueTrustedAdminSession\(response\)/)
  assert.match(route,/fetchSite!=='same-origin'/)
  assert.match(route,/origin!==new URL\(request\.url\)\.origin/)
  assert.match(route,/status:401/)
  assert.match(route,/Cache-Control/)
})

test('iPhone editor preserves unsaved recordings while reauthorizing and keeps video gated',()=>{
  const component=source('components/session-audio-recorder.jsx')
  assert.match(component,/getRecorderReadiness\(clientId\)/)
  assert.match(component,/href="\/admin\/login" target="_blank"/)
  assert.match(component,/onClick=\{verifySignIn\}/)
  assert.match(component,/signInRequired\|\|Boolean\(readinessError\)/)
  assert.match(component,/videoStatus\?\.ready!==true/)
  assert.match(component,/jobRef\.current&&upload\(jobRef\.current\)/)
  assert.match(component,/navigator\.mediaDevices\.getUserMedia/)
})
