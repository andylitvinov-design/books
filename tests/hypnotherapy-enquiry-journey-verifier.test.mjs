import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {runInNewContext} from 'node:vm'
import {hypnotherapyOrigin, hypnotherapyService, assertHypnotherapyBody, permittedHypnotherapyRead, hypnotherapyRequestGate, syntheticHypnotherapyReceipt, installHypnotherapyPopupSpy, withHypnotherapyIsolation, assertHypnotherapyLink, HYPNOTHERAPY_CONTACT, HYPNOTHERAPY_REFERENCE, HYPNOTHERAPY_RECEIPT_KEY} from '../scripts/helpers/hypnotherapy-enquiry-journey-verifier.mjs'
const origin = 'http://127.0.0.1:3100'
const body = (locale='en', channel='whatsapp') => JSON.stringify({operationId:'27d6bba7-fede-49b3-90d8-c655b72202fd', serviceTitle:hypnotherapyService(locale), description:'Preferred reply channel: ' + (channel === 'whatsapp' ? 'WhatsApp' : 'Telegram'), sourcePath:`/${locale}/services/hypnotherapy-course`, locale, contact:{displayName:'', email:HYPNOTHERAPY_CONTACT, phone:''}, contactConsent:true, website:''})
const request = (url, method='GET', type='fetch', raw=body()) => ({url:() => url, method:() => method, resourceType:() => type, postData:() => raw, headers:() => ({'content-type':'application/json'})})
const route = req => { const log=[]; return {log, request:() => req, abort:async () => log.push('abort'), fulfill:async x => log.push(x), fetch:async options => {log.push(options); return {url:req.url, status:() => 200, dispose:async () => log.push('dispose')}}} }
for (const locale of ['en','ru']) for (const channel of ['whatsapp','telegram']) test(locale+' '+channel+' exact source/payload', () => {
  assert.equal(hypnotherapyOrigin(origin+`/${locale}/services/hypnotherapy-course`,locale), origin)
  assertHypnotherapyBody(body(locale,channel),locale,channel)
})
for (const bad of ['https://127.0.0.1:3100','http://holistichouse.vercel.app:3100','http://localhost','http://user@localhost:3100','http://127.0.0.2:3100']) test('reject nonisolated origin '+bad, () => assert.throws(() => hypnotherapyOrigin(bad+'/en/services/hypnotherapy-course','en')))
for (const suffix of ['?x=1','#request','/','/../contact']) test('reject source suffix '+suffix, () => assert.throws(() => hypnotherapyOrigin(origin+'/en/services/hypnotherapy-course'+suffix,'en')))
for (const [key,value] of [['operationId','invalid'],['contactConsent',false],['serviceTitle','Other service'],['sourcePath','/en/services/alchemy-of-soul'],['locale','ru'],['description','Preferred reply channel: Telegram'],['contact',{displayName:'',email:'other@example.invalid',phone:''}],['website','spam'],['unexpected','extra']]) test('reject invalid payload '+key, () => {
  const bad=JSON.parse(body()); bad[key]=value; assert.throws(() => assertHypnotherapyBody(JSON.stringify(bad),'en','whatsapp'))
})
for (const [path,type] of [
  ['/_next/static/chunks/abc.js','script'], ['/_next/static/css/a.css','stylesheet'], ['/_next/static/media/a.woff2','font'],
  ['/_next/static/chunks/app/%5Blocale%5D/layout.js?v=1792874902222','script'], ['/_next/static/css/app/[locale]/page.css?v=1792874902222','stylesheet'],
  ['/_next/static/webpack/2ba7c186341a9797.webpack.hot-update.json','fetch'], ['/images/holistic-house/portrait-static/andy-828-3dcbabded1e9.webp','image'],
]) test('allow bounded static read '+path, () => assert.equal(permittedHypnotherapyRead(request(origin+path,'GET',type),origin),true))
for (const [url,method,type] of [
  [origin+'/en/services/hypnotherapy-course','GET','document'],[origin+'/en/thank-you','GET','document'],[origin+'/en/thank-you?_rsc=x','GET','fetch'],
  [origin+'/api/service-enquiries','GET','fetch'],[origin+'/api/app/bootstrap','GET','fetch'],[origin+'/en/services','GET','fetch'],
  ['https://evil.invalid/_next/static/a.js','GET','script'],[origin+'/_next/static/a.js','POST','script'],[origin+'/_next/static/a.js','GET','fetch'],
  [origin+'/_next/static/a..js','GET','script'],[origin+'/_next/image?url=https://evil.invalid','GET','image'],
  [origin+'/_next/static/webpack/2ba7c186341a9797.webpack.hot-update.json?x=1','GET','fetch'],
  [origin+'/_next/static/webpack/2ba7c186341a9797.webpack.hot-update.json','GET','document'],
  [origin+'/_next/static/webpack/2ba7c186341a9797.other.hot-update.json','GET','fetch'],
  [origin+'/_next/static/a.woff2?v=1792874902222','GET','font'],[origin+'/_next/static/%2e%2e/a.js','GET','script'],
]) test('deny broadened read '+url+' '+method+' '+type, () => assert.equal(permittedHypnotherapyRead(request(url,method,type),origin),false))
for (const query of ['?x=1','?v=1792874902222&contact=private','?v=1792874902222&v=1792874902222','?v=abc','?v=0000000000000','?v=1','?v=-1792874902222','?v=1792874902222.0','?%76=1792874902222','?v=1792874902222#fragment']) test('deny unbounded static query '+query, () => assert.equal(permittedHypnotherapyRead(request(origin+'/_next/static/a.js'+query,'GET','script'),origin),false))
test('forward only zero-redirect verified local static response', async () => {
  const failures=[],blocked=[],r=route(request(origin+'/_next/static/a.js','GET','script'))
  await hypnotherapyRequestGate(origin,'en',() => assert.fail(),failures,blocked)(r)
  assert.deepEqual(r.log[0],{maxRedirects:0}); assert.equal(r.log[2],'dispose'); assert.deepEqual(failures,[])
})
for (const status of [301,302,307,308,404,500]) test('reject local read status '+status, async () => {
  const failures=[],r=route(request(origin+'/_next/static/a.js','GET','script'))
  r.fetch=async () => ({url:r.request().url,status:() => status,dispose:async () => r.log.push('dispose')})
  await hypnotherapyRequestGate(origin,'en',() => assert.fail(),failures,[])(r)
  assert.equal(failures.length,1); assert.deepEqual(r.log,['dispose','abort'])
})
test('block unexpected writes, APIs, documents and external messenger without forwarding', async () => {
  const failures=[],blocked=[]
  const gate=hypnotherapyRequestGate(origin,'en',() => assert.fail(),failures,blocked)
  for (const req of [request(origin+'/api/other'),request(origin+'/api/service-enquiries?x=1','POST'),request(origin+'/other','PUT'),request(origin+'/en/thank-you','GET','document'),request('https://wa.me/14376066502?text=private','GET','document')]) {
    const r=route(req); await gate(r); assert.deepEqual(r.log,['abort'])
  }
  assert.equal(failures.length,5); assert.deepEqual(blocked,[])
  const media=route(request('https://media.invalid/private-path?private=query','GET','image')); await gate(media)
  assert.deepEqual(media.log,['abort']); assert.deepEqual(blocked,[{type:'image',asset:'other'}])
})
test('reject rewritten allowed-read response', async () => {
  const failures=[],r=route(request(origin+'/_next/static/a.js','GET','script'))
  r.fetch=async () => ({url:() => 'https://evil.invalid',status:() => 200,dispose:async () => r.log.push('dispose')})
  await hypnotherapyRequestGate(origin,'en',() => assert.fail(),failures,[])(r)
  assert.equal(failures.length,1); assert.deepEqual(r.log,['dispose','abort'])
})
for (const locale of ['en','ru']) for (const channel of ['whatsapp','telegram']) test(locale+' '+channel+' 503 and exact retry are synthetic only', async () => {
  const receipt=syntheticHypnotherapyReceipt(locale,channel),failures=[]
  const gate=hypnotherapyRequestGate(origin,locale,r => receipt.accept(r),failures,[])
  const first=route(request(origin+'/api/service-enquiries','POST','fetch',body(locale,channel)))
  await gate(first); assert.equal(first.log[0].status,503)
  const second=route(request(origin+'/api/service-enquiries','POST','fetch',body(locale,channel)))
  await gate(second); assert.equal(receipt.pending,true); assert.deepEqual(second.log,[])
  await receipt.confirm(); assert.equal(second.log[0].status,200); assert.equal(receipt.pending,false)
  assert.equal(receipt.count,2); assert.deepEqual(failures,[])
  await assert.rejects(receipt.accept(second),/At most/)
})
test('mutation of bytes, UUID or retry channel is rejected', async () => {
  const receipt=syntheticHypnotherapyReceipt('en','whatsapp')
  await receipt.accept(route(request(origin+'/api/service-enquiries','POST')))
  for (const raw of [body()+' ',body().replace('27d6bba7','17d6bba7'),body('en','telegram')]) {
    await assert.rejects(receipt.accept(route(request(origin+'/api/service-enquiries','POST','fetch',raw))))
  }
  assert.equal(receipt.count,1)
})
test('cleanup closes operation before aborting held response', async () => {
  const receipt=syntheticHypnotherapyReceipt('en','whatsapp')
  await receipt.accept(route(request(origin+'/api/service-enquiries','POST')))
  const held=route(request(origin+'/api/service-enquiries','POST')); await receipt.accept(held)
  held.abort=async () => {await assert.rejects(receipt.confirm(),/Stale/);held.log.push('abort')}
  await receipt.close(); assert.deepEqual(held.log,['abort']); await assert.rejects(receipt.accept(held),/closes/)
})
for (const fault of ['route','run','abort','close']) test('partial failure cleanup '+fault, async () => {
  const calls=[]
  const context={route:async () => {calls.push('route');if (fault==='route') throw Error('primary')},close:async () => {calls.push('close');if (fault==='close') throw Error('close')}}
  await assert.rejects(withHypnotherapyIsolation(context,() => {},{close:async () => {calls.push('abort');if (fault==='abort') throw Error('abort')}},async () => {calls.push('run');if (fault==='run') throw Error('run')}))
  assert.ok(calls.includes('abort')); assert.ok(calls.includes('close'))
})
test('primary remains primary when cleanup also fails', async () => {
  const primary=Error('original')
  await assert.rejects(withHypnotherapyIsolation({route:async () => {throw primary},close:async () => {throw Error('cleanup')}},() => {},{close:async () => {throw Error('abort')}},async () => {}), error => error===primary)
})
test('close stays guarded and drains late read failure before returning', async () => {
  let handler,resolveRead,settled=false,closed=false
  const failures=[],pending=new Promise(resolve => {resolveRead=resolve}),r=route(request(origin+'/_next/static/a.js','GET','script'))
  r.fetch=async () => pending
  const context={route:async (_pattern,fn) => {handler=fn},close:async () => {closed=true;const write=route(request(origin+'/api/late','POST'));await handler(write);assert.deepEqual(write.log,['abort'])}}
  const task=withHypnotherapyIsolation(context,hypnotherapyRequestGate(origin,'en',() => assert.fail(),failures,[]),{close:async () => {}},async () => {void handler(r)}).then(() => {settled=true})
  await new Promise(resolve => setImmediate(resolve)); assert.equal(closed,true);assert.equal(settled,false)
  resolveRead({url:r.request().url,status:() => 500,dispose:async () => {}})
  await task;assert.equal(failures.length,2);assert.equal(r.log.at(-1),'abort')
})
test('popup spy never creates a real window and denies only receipt storage', () => {
  class Store {constructor(){this.values=new Map()}setItem(k,v){this.values.set(k,String(v))}getItem(k){return this.values.get(k)??null}}
  const sessionStorage=new Store(),localStorage=new Store(),sandbox={Storage:Store,sessionStorage,localStorage,DOMException,window:{open:() => assert.fail('real window')}}
  runInNewContext('('+installHypnotherapyPopupSpy.toString()+')('+JSON.stringify({receiptKey:HYPNOTHERAPY_RECEIPT_KEY,denyReceiptStorage:true})+')',sandbox)
  const popup=sandbox.window.open('about:blank','_blank'); popup.opener=null
  assert.equal(popup.closed,false); assert.equal(popup.destinations.length,0)
  popup.location.replace('https://wa.me/fixture'); assert.equal(popup.destinations.length,1)
  popup.close(); assert.equal(popup.closed,true)
  assert.equal(sandbox.window.open('https://evil.invalid','_blank'),null)
  assert.equal(sandbox.window.__hypnotherapyFixture.unexpected.length,1)
  assert.throws(() => sessionStorage.setItem(HYPNOTHERAPY_RECEIPT_KEY,'receipt'),/Synthetic/)
  sessionStorage.setItem('other','allowed');localStorage.setItem(HYPNOTHERAPY_RECEIPT_KEY,'allowed')
  assert.equal(sessionStorage.getItem('other'),'allowed');assert.equal(localStorage.getItem(HYPNOTHERAPY_RECEIPT_KEY),'allowed')
})
const link = (locale,channel) => 'https://'+(channel==='whatsapp'?'wa.me/14376066502':'t.me/AndyTherapist')+'?text='+encodeURIComponent(hypnotherapyService(locale)+' '+HYPNOTHERAPY_REFERENCE+' https://holistichouse.vercel.app/'+locale+'/services/hypnotherapy-course')
for (const locale of ['en','ru']) for (const channel of ['whatsapp','telegram']) test(locale+' '+channel+' confirmed link carries service/reference/public source only', () => {
  assertHypnotherapyLink(link(locale,channel),locale,channel)
  for (const bad of [link(locale,channel)+'&email=x',link(locale,channel)+encodeURIComponent(HYPNOTHERAPY_CONTACT),link(locale,channel).replace(HYPNOTHERAPY_REFERENCE,'HH-111111111111'),link(locale,channel).replace('https://','http://')]) assert.throws(() => assertHypnotherapyLink(bad,locale,channel))
})
test('integration preserves other journeys/media/locales/widths and uses actual free-footer scope', async () => {
  const source=await readFile(new URL('../scripts/verify-app-r1.mjs',import.meta.url),'utf8')
  assert.match(source,/for\(const locale of \['en','ru'\]\)/)
  assert.match(source,/for\(const width of \[320,360,390,1280\]\)/)
  assert.match(source,/verifyAlchemyEnquiryJourney\(servicePage,expect,locale\)/)
  assert.match(source,/verifyAlchemyEnquiryJourney\(servicePage,expect,locale,\{denyReceiptStorage:true\}\)/)
  assert.match(source,/verifyDaoLeadJourney\(servicePage,expect,locale\)/)
  assert.match(source,/verifyHypnotherapyEnquiryJourney\(servicePage,expect,locale\)/)
  assert.match(source,/verifyHypnotherapyEnquiryJourney\(servicePage,expect,locale,\{channel:'telegram',denyReceiptStorage:true\}\)/)
  assert.match(source,/main\[data-core-service-detail="hypnotherapy"\] > section:last-child > details/)
  assert.match(source,/Free review alternative starts collapsed/)
  assert.match(source,/All three source-backed videos are visible/)
  assert.match(source,/openContactChannelChooser\(ready,expect\)/)
  const helper=await readFile(new URL('../scripts/helpers/hypnotherapy-enquiry-journey-verifier.mjs',import.meta.url),'utf8')
  assert.match(helper,/newContext\(\{serviceWorkers:'block'/)
  assert.match(helper,/routeWebSocket\('\*\*\/\*', socket => socket.close\(\)\)/)
  assert.doesNotMatch(helper,/route\.continue\(|route\.fallback\(|unroute\(|context\.request/)
  assert.match(helper,/await expect\(other\).toBeDisabled\(\)/)
  assert.match(helper,/await expect\(contact\).toBeDisabled\(\)/)
  assert.match(helper,/await expect\(consent\).toBeDisabled\(\)/)
  assert.match(helper,/for \(const input of \[submit, other, contact, consent\]\) await expect\(input\).toBeDisabled\(\)/)
  const workflow=await readFile(new URL('../.github/workflows/hh-app-r1.yml',import.meta.url),'utf8')
  assert.match(workflow,/node --test .*tests\/hypnotherapy-enquiry-journey-verifier\.test\.mjs/)
})

// Executes the real browser verifier assertions against actual TSX events. A
// no-browser supplement only; hosted Chromium/WebKit remain required evidence.
import {runtimePage, expectRuntime} from './helpers/hypnotherapy-runtime-verifier-fixture.mjs'
import {verifyHypnotherapyInPage} from '../scripts/helpers/hypnotherapy-enquiry-journey-verifier.mjs'
for (const locale of ['en','ru']) for (const channel of ['whatsapp','telegram']) test(locale+' '+channel+' real component satisfies browser assertion sequence', async () => {
  const receipt=syntheticHypnotherapyReceipt(locale,channel), denyReceiptStorage=channel==='telegram'
  const page=runtimePage(locale,receipt,{denyReceiptStorage})
  try {await verifyHypnotherapyInPage(page,expectRuntime,locale,channel,receipt,[],{denyReceiptStorage})}
  finally {await receipt.close();page.unmount()}
})

import {verifyHypnotherapyEnquiryJourney} from '../scripts/helpers/hypnotherapy-enquiry-journey-verifier.mjs'
for (const fault of ['socket','newPage','goto','route','setup']) test('dedicated context setup failure '+fault+' closes safely', async () => {
  const calls=[],primary=Error('synthetic '+fault)
  const step=async name => {calls.push(name);if(name===fault)throw primary}
  const page={on:() => {},goto:() => step('goto'),evaluate:() => step('setup')}
  const context={routeWebSocket:() => step('socket'),newPage:async () => {await step('newPage');return page},route:() => step('route'),close:async () => {calls.push('close');throw Error('secondary cleanup')}}
  const source={url:() => origin+'/en/services/hypnotherapy-course',viewportSize:() => ({width:390,height:844}),context:() => ({browser:() => ({newContext:async options => {assert.deepEqual(options,{serviceWorkers:'block',viewport:{width:390,height:844}});return context}})})}
  await assert.rejects(verifyHypnotherapyEnquiryJourney(source,() => assert.fail('No interaction before setup'),'en'),error => error===primary)
  assert.equal(calls.at(-1),'close')
  if(calls.includes('route'))assert.ok(calls.indexOf('goto')<calls.indexOf('route'),'Initial public loading is outside the explicitly scoped interaction guard')
})
test('encoded or root API reads also fail closed; no hidden API exemption', async () => {
  const failures=[],gate=hypnotherapyRequestGate(origin,'en',() => assert.fail(),failures,[])
  for(const path of ['/api','/%61pi/app/bootstrap','/api%2fapp/bootstrap']){const r=route(request(origin+path));await gate(r);assert.deepEqual(r.log,['abort'])}
  assert.equal(failures.length,3)
})
test('synthetic write rejects unexpected content type and never forwards', async () => {
  const receipt=syntheticHypnotherapyReceipt('en','whatsapp'),failures=[]
  const req=request(origin+'/api/service-enquiries','POST');req.headers=() => ({'content-type':'text/plain'})
  const r=route(req);await hypnotherapyRequestGate(origin,'en',x => receipt.accept(x),failures,[])(r)
  assert.equal(receipt.count,0);assert.equal(failures.length,1);assert.deepEqual(r.log,['abort'])
})
