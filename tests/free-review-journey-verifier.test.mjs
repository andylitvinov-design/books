import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import vm from 'node:vm'
import {compileContactModule} from './helpers/contact-component-fixture.mjs'
import {classifyFreeReviewStartupMessage, createFreeReviewStartupDiagnostics} from '../scripts/helpers/free-review-startup-diagnostics.mjs'
import {freeReviewOrigin, freeReviewPath, freeReviewService, freeReviewPublicTopic, freeReviewMarkers, assertFreeReviewBody, syntheticFreeReviewReceipt, freeReviewRequestGate, assertFreeReviewLink, installFreeReviewProbe, freeReviewInitScript, prepareFreeReviewStaleConsent, withFreeReviewIsolation, freeReviewSocketBoundary, verifyFreeReviewJourney, assertFreeReviewPrivateEntrySnapshot, FREE_REVIEW_CONTACT, FREE_REVIEW_PHONE, FREE_REVIEW_REFERENCE} from '../scripts/helpers/free-review-journey-verifier.mjs'

const origin = 'http://127.0.0.1:3100'
const body = (locale='en', kind='compact', channel='whatsapp') => JSON.stringify({operationId:'27d6bba7-fede-49b3-90d8-c655b72202fd', serviceTitle:freeReviewService(locale, kind), description:kind === 'drawing' ? '' : freeReviewPublicTopic(locale), sourcePath:freeReviewPath(locale), locale, contact:kind==='compact'?{displayName:'',email:'',phone:FREE_REVIEW_PHONE}:{displayName:'', email:FREE_REVIEW_CONTACT, phone:''}, contactConsent:true, website:''})
const request = (url=origin+'/api/service-enquiries', method='POST', type='fetch', raw=body()) => ({url:() => url, method:() => method, resourceType:() => type, postData:() => raw, headers:() => ({'content-type':'application/json'})})
const route = req => {
  const log = []
  return {log, request:() => req, abort:async () => log.push('abort'), fulfill:async response => log.push(response),
    continue:() => assert.fail('No continuation'), fallback:() => assert.fail('No fallback'),
    fetch:async options => {log.push(options); return {url:req.url, status:() => 200, dispose:async () => log.push('dispose')}}}
}

for (const locale of ['en', 'ru']) for (const kind of ['compact', 'drawing']) test(`${locale} ${kind} exact public request contract`, () => {
  assert.equal(freeReviewOrigin(origin+freeReviewPath(locale), locale), origin)
  for (const channel of kind === 'compact' ? ['whatsapp', 'telegram'] : [undefined]) assertFreeReviewBody(body(locale,kind,channel),locale,kind,channel)
})
for (const bad of ['https://127.0.0.1:3100','http://holistichouse.vercel.app:3100','http://localhost','http://user@localhost:3100','http://127.0.0.2:3100']) test('reject nonisolated origin '+bad, () => assert.throws(() => freeReviewOrigin(bad+freeReviewPath('en'),'en')))
for (const suffix of ['?topic=business','#request-free-review','/','/../coaching/intake']) test('reject source suffix '+suffix, () => assert.throws(() => freeReviewOrigin(origin+freeReviewPath('en')+suffix,'en')))
for (const locale of ['es', '', undefined]) test('reject unapproved locale '+locale, () => assert.throws(() => freeReviewOrigin(origin+freeReviewPath(locale),locale)))
for (const kind of ['compact','drawing']) for (const [key,value] of [
  ['operationId','invalid'],['contactConsent',false],['serviceTitle','Different offering'],['sourcePath','/en/coaching/intake'],['locale','ru'],
  ['description','Synthetic free review en problem marker'],['contact',{displayName:'',email:'other@example.invalid',phone:''}],['website','spam'],['answers',['private']],
]) test(`${kind} reject payload mutation ${key}`, () => {
  const raw=JSON.parse(body('en',kind));raw[key]=value
  assert.throws(() => assertFreeReviewBody(JSON.stringify(raw),'en',kind,kind==='compact'?'whatsapp':undefined))
})
test('reject cross-funnel and cross-channel payloads', () => {
  assert.equal(body('en','compact','telegram'),body('en','compact','whatsapp'),'Current chooser channels share one immutable CRM body')
  assert.throws(() => assertFreeReviewBody(body('en','drawing'),'en','compact','whatsapp'))
  assert.throws(() => assertFreeReviewBody(body(),'en','drawing'))
  assert.throws(() => assertFreeReviewBody(body(),'en','unknown','whatsapp'))
  assert.throws(() => assertFreeReviewBody(body('en','drawing'),'en','drawing','whatsapp'))
})
for (const locale of ['en','ru']) for (const kind of ['compact','drawing']) test(`${locale} ${kind} synthetic 503, byte-identical retry and held acknowledgement`, async () => {
  const receipt=syntheticFreeReviewReceipt(locale,kind,kind==='compact'?'whatsapp':undefined),failures=[]
  const gate=freeReviewRequestGate(origin,locale,kind,receipt,failures,[])
  const first=route(request(undefined,undefined,undefined,body(locale,kind)))
  await gate(first);assert.equal(receipt.count,1);assert.equal(first.log[0].status,503);assert.equal(receipt.confirmed,false)
  const retry=route(request(undefined,undefined,undefined,body(locale,kind)))
  await gate(retry);assert.equal(receipt.pending,true);assert.deepEqual(retry.log,[]);assert.equal(receipt.confirmed,false)
  await receipt.confirm();assert.equal(receipt.confirmed,true);assert.equal(receipt.pending,false)
  assert.deepEqual(JSON.parse(retry.log[0].body),{saved:true,referenceCode:FREE_REVIEW_REFERENCE});assert.equal(receipt.count,2)
  const duplicate=route(request(undefined,undefined,undefined,body(locale,kind)))
  await gate(duplicate);assert.deepEqual(duplicate.log,['abort']);assert.equal(receipt.count,2);assert.equal(failures.length,1)
  await receipt.close()
})
for (const alteration of [raw => raw+' ',raw => raw.replace('27d6bba7','17d6bba7'),raw => raw.replace('Express review focus: Situation','Different selected public topic')]) test('immutable retry rejects bytes, UUID and public topic drift', async () => {
  const receipt=syntheticFreeReviewReceipt('en','compact','whatsapp')
  await receipt.accept(route(request()))
  await assert.rejects(receipt.accept(route(request(undefined,undefined,undefined,alteration(body())))))
  assert.equal(receipt.count,1);await receipt.close()
})
test('closed receipt rejects late requests and acknowledgement', async () => {
  const receipt=syntheticFreeReviewReceipt('en','drawing')
  await receipt.accept(route(request(undefined,undefined,undefined,body('en','drawing'))))
  const pending=route(request(undefined,undefined,undefined,body('en','drawing')));await receipt.accept(pending)
  await receipt.close();assert.deepEqual(pending.log,['abort'])
  await assert.rejects(receipt.confirm(),/stale/);await assert.rejects(receipt.accept(pending),/close/)
})
for (const kind of ['compact','drawing']) test(`${kind} blocks wrong endpoints, encoded APIs, methods, navigation and external destinations`, async () => {
  const failures=[],blocked=[],receipt=syntheticFreeReviewReceipt('en',kind,kind==='compact'?'whatsapp':undefined)
  const gate=freeReviewRequestGate(origin,'en',kind,receipt,failures,blocked)
  const rejected=[
    request(origin+'/api'),request(origin+'/%61pi/app/bootstrap','GET'),request(origin+'/api%2fapp/bootstrap','GET'),
    request(origin+'/api/service-enquiries?x=1'),request(origin+'/api/service-enquiries','GET'),request(origin+'/api/other'),
    request(origin+'/other','PUT'),request(origin+'/en/coaching/intake','GET','document'),request(origin+'/en/thank-you','GET','document'),
    request('https://wa.me/14376066502?text=synthetic','GET','document'),request('https://evil.invalid/api/service-enquiries'),
  ]
  for (const req of rejected) {const r=route(req);await gate(r);assert.deepEqual(r.log,['abort'])}
  assert.equal(failures.length,rejected.length);assert.equal(receipt.count,0)
  const media=route(request('https://media.invalid/synthetic?private=value','GET','image'));await gate(media);assert.deepEqual(media.log,['abort'])
  assert.equal(failures.length,rejected.length);assert.equal(blocked.length,1);await receipt.close()
})
for (const kind of ['compact','drawing']) for (const [path,type] of [
  ['/_next/static/chunks/a.js','script'],['/_next/static/css/a.css?v=1792874902222','stylesheet'],
  ['/_next/static/media/a.woff2','font'],['/_next/static/webpack/2ba7c186341a9797.webpack.hot-update.json','fetch'],
  ['/images/holistic-house/portrait-static/andy-828-3dcbabded1e9.webp','image'],
]) test(`${kind} reuses bounded zero-redirect read ${path}`, async () => {
  const failures=[],r=route(request(origin+path,'GET',type))
  await freeReviewRequestGate(origin,'en',kind,{confirmed:false,accept:() => assert.fail()},failures,[])(r)
  assert.deepEqual(r.log[0],{maxRedirects:0});assert.equal(r.log.at(-1),'dispose');assert.deepEqual(failures,[])
})
for (const kind of ['compact','drawing']) for (const bad of ['?x=1','?v=1','?v=1792874902222&secret=x','?v=1792874902222&v=1792874902222','#fragment']) test(`${kind} rejects broadened static query ${bad}`, async () => {
  const r=route(request(origin+'/_next/static/a.js'+bad,'GET','script'))
  await freeReviewRequestGate(origin,'en',kind,{confirmed:false,accept:() => assert.fail()},[],[])(r)
  assert.deepEqual(r.log,['abort'])
})
for (const kind of ['compact','drawing']) for (const status of [301,302,307,308,404,500]) test(`${kind} read status ${status} is terminal`, async () => {
  const failures=[],r=route(request(origin+'/_next/static/a.js','GET','script'))
  r.fetch=async () => ({url:r.request().url,status:() => status,dispose:async () => r.log.push('dispose')})
  await freeReviewRequestGate(origin,'en',kind,{confirmed:false,accept:() => assert.fail()},failures,[])(r)
  assert.deepEqual(r.log,['dispose','abort']);assert.equal(failures.length,1)
})
test('receipt page is real but allowed only for confirmed drawing flow', async () => {
  for (const kind of ['compact','drawing']) for (const confirmed of [false,true]) {
    const failures=[],r=route(request(origin+'/en/thank-you?_rsc=abc','GET','fetch'))
    await freeReviewRequestGate(origin,'en',kind,{confirmed,accept:() => assert.fail()},failures,[])(r)
    if(kind==='drawing'&&confirmed){assert.deepEqual(r.log[0],{maxRedirects:0});assert.deepEqual(failures,[])}
    else {assert.deepEqual(r.log,['abort']);assert.equal(failures.length,1)}
  }
})
test('receipt query and rewritten local read remain rejected', async () => {
  const receipt={confirmed:true,accept:() => assert.fail()}
  for(const query of ['?contact=synthetic','?_rsc=abc&x=1','?_rsc=abc&_rsc=def']) {
    const r=route(request(origin+'/en/thank-you'+query,'GET','fetch'))
    await freeReviewRequestGate(origin,'en','drawing',receipt,[],[])(r);assert.deepEqual(r.log,['abort'])
  }
  const failures=[],r=route(request(origin+'/_next/static/a.js','GET','script'))
  r.fetch=async () => ({url:() => 'https://evil.invalid',status:() => 200,dispose:async () => {}})
  await freeReviewRequestGate(origin,'en','drawing',receipt,failures,[])(r);assert.deepEqual(r.log,['abort']);assert.equal(failures.length,1)
})
test('wrong content type is never acknowledged or forwarded', async () => {
  const receipt=syntheticFreeReviewReceipt('en','compact','whatsapp'),failures=[],req=request();req.headers=() => ({'content-type':'text/plain'})
  const r=route(req);await freeReviewRequestGate(origin,'en','compact',receipt,failures,[])(r)
  assert.deepEqual(r.log,['abort']);assert.equal(receipt.count,0);assert.equal(failures.length,1)
})
for(const kind of ['compact','drawing']) test(kind+' delegated validation diagnostics never retain a rejected private value',async()=>{
  const marker='SYNTHETIC_PRIVATE_DIAGNOSTIC_MARKER',bad=JSON.parse(body('en',kind));bad.description=marker
  const receipt=syntheticFreeReviewReceipt('en',kind,kind==='compact'?'whatsapp':undefined),failures=[]
  const r=route(request(undefined,undefined,undefined,JSON.stringify(bad)))
  await freeReviewRequestGate(origin,'en',kind,receipt,failures,[])(r)
  assert.deepEqual(r.log,['abort']);assert.equal(receipt.count,0)
  assert.deepEqual(failures,['Free-review delegated boundary failed'])
  assert.ok(!JSON.stringify(failures).includes(marker))
})
for(const locale of ['en','ru']) for(const kind of ['compact','drawing']) test(`${locale} ${kind} exact initial document is one-shot and never acknowledges startup writes`,async()=>{
  const failures=[],receipt=syntheticFreeReviewReceipt(locale,kind,kind==='compact'?'whatsapp':undefined)
  const gate=freeReviewRequestGate(origin,locale,kind,receipt,failures,[],{bootstrap:true})
  assert.throws(()=>gate.beginInteraction())
  const write=route(request(undefined,undefined,undefined,body(locale,kind)));await gate(write)
  assert.deepEqual(write.log,['abort']);assert.equal(receipt.count,0)
  const initial=route(request(origin+freeReviewPath(locale),'GET','document'));await gate(initial)
  assert.deepEqual(initial.log[0],{maxRedirects:0});assert.equal(gate.initialDocumentLoaded,true)
  const reload=route(request(origin+freeReviewPath(locale),'GET','document'));await gate(reload);assert.deepEqual(reload.log,['abort'])
  const before=route(request(undefined,undefined,undefined,body(locale,kind)));await gate(before);assert.equal(receipt.count,0)
  gate.beginInteraction()
  const allowed=route(request(undefined,undefined,undefined,body(locale,kind)));await gate(allowed)
  assert.equal(allowed.log[0].status,503);assert.equal(receipt.count,1);assert.equal(failures.length,3)
})
for(const suffix of ['?x=1','?topic=business','#request-free-review','/','/../coaching/intake']) test('bootstrap rejects initial document drift '+suffix,async()=>{
  const failures=[],gate=freeReviewRequestGate(origin,'en','drawing',{confirmed:false,accept:()=>assert.fail()},failures,[],{bootstrap:true})
  const r=route(request(origin+freeReviewPath('en')+suffix,'GET','document'));await gate(r)
  assert.deepEqual(r.log,['abort']);assert.equal(gate.initialDocumentLoaded,false);assert.equal(failures.length,1)
})
for(const status of [301,302,307,308,404,500]) test('bootstrap rejects initial document status '+status+' without retry allowance',async()=>{
  const failures=[],gate=freeReviewRequestGate(origin,'en','compact',{confirmed:false,accept:()=>assert.fail()},failures,[],{bootstrap:true})
  const r=route(request(origin+freeReviewPath('en'),'GET','document'))
  r.fetch=async options=>{assert.deepEqual(options,{maxRedirects:0});return{url:r.request().url,status:()=>status,dispose:async()=>r.log.push('dispose')}}
  await gate(r);assert.deepEqual(r.log,['dispose','abort']);assert.equal(gate.initialDocumentLoaded,false)
  const retry=route(request(origin+freeReviewPath('en'),'GET','document'));await gate(retry);assert.deepEqual(retry.log,['abort'])
  assert.equal(failures.length,2)
})
test('bootstrap rewritten response and external startup transport are never forwarded',async()=>{
  const failures=[],blocked=[],gate=freeReviewRequestGate(origin,'en','drawing',{confirmed:false,accept:()=>assert.fail()},failures,blocked,{bootstrap:true})
  const r=route(request(origin+freeReviewPath('en'),'GET','document'))
  r.fetch=async()=>({url:()=> 'https://evil.invalid',status:()=>200,dispose:async()=>{}})
  await gate(r);assert.deepEqual(r.log,['abort']);assert.equal(gate.initialDocumentLoaded,false)
  for(const req of [request(origin+'/api/app/bootstrap','GET'),request('https://evil.invalid/private','GET','document'),request('https://evil.invalid/api','POST')]){
    const denied=route(req);await gate(denied);assert.deepEqual(denied.log,['abort'])
  }
  const media=route(request('https://media.invalid/private?answer=marker','GET','image'));await gate(media);assert.deepEqual(media.log,['abort'])
  assert.equal(failures.length,4);assert.equal(blocked.length,1)
})
test('ordered startup init keeps real popup closed and preserves receipt and scalar observations across documents',()=>{
  class Store{constructor(){this.map=new Map()}getItem(key){return this.map.get(key)??null}setItem(key,value){this.map.set(key,String(value))}}
  const sessionStorage=new Store(),key='hh-service-enquiry-receipt:v1',saved=JSON.stringify({referenceCode:FREE_REVIEW_REFERENCE,createdAt:123})
  sessionStorage.setItem(key,saved)
  const load=deny=>{
    const listeners={},sandbox={Storage:Store,sessionStorage,DOMException,document:{documentElement:{dataset:{}},addEventListener:()=>{}},navigator:{},window:{open:()=>assert.fail('real popup'),addEventListener:(name,fn)=>{listeners[name]=fn}}}
    vm.runInNewContext(freeReviewInitScript(deny).content,sandbox)
    return {sandbox,listeners}
  }
  const first=load(false)
  const popup=first.sandbox.window.open('about:blank','_blank');assert.equal(popup.closed,false)
  assert.equal(first.sandbox.window.open('https://evil.invalid','_blank'),null)
  first.listeners['holistic-house:acquisition']({detail:{event:'unexpected',private:'not persisted'}})
  assert.equal(sessionStorage.getItem('hh-synthetic-free-review-popups:v1'),'2')
  assert.equal(sessionStorage.getItem('hh-synthetic-free-review-events:v1'),'1')
  assert.ok(!JSON.stringify([...sessionStorage.map]).includes('not persisted'))
  const second=load(true)
  assert.equal(sessionStorage.getItem(key),saved,'A new document must not clear confirmed receipt')
  assert.equal(sessionStorage.getItem('hh-synthetic-free-review-popups:v1'),'2')
  assert.equal(sessionStorage.getItem('hh-synthetic-free-review-events:v1'),'1')
  assert.throws(()=>sessionStorage.setItem(key,'changed'),/denial/)
  assert.equal(second.sandbox.window.open('https://evil.invalid','_blank'),null)
  assert.equal(sessionStorage.getItem('hh-synthetic-free-review-popups:v1'),'3')
})

const href=(locale,kind,channel) => 'https://'+(channel==='whatsapp'?'wa.me/14376066502':'t.me/AndyTherapist')+'?text='+encodeURIComponent(freeReviewService(locale,kind)+' '+FREE_REVIEW_REFERENCE+' https://holistichouse.vercel.app'+freeReviewPath(locale))
for (const locale of ['en','ru']) for (const kind of ['compact','drawing']) for (const channel of ['whatsapp','telegram']) test(`${locale} ${kind} ${channel} strict redacted draft`, () => {
  const good=href(locale,kind,channel)
  assertFreeReviewLink(good,locale,kind,channel)
  for (const bad of [good+'&email=x',good.replace('https://','http://'),good.replace(FREE_REVIEW_REFERENCE,'HH-111111111111'),good.replace('wa.me','wa.me.evil'),good+'#private'].filter(x=>x!==good)) assert.throws(() => assertFreeReviewLink(bad,locale,kind,channel))
  for (const marker of [FREE_REVIEW_CONTACT,...freeReviewMarkers(locale),'operationId','/api/app/private']) assert.throws(() => assertFreeReviewLink(good+encodeURIComponent(marker),locale,kind,channel))
})
test('clipboard probe records content only on deliberate success and recovers after denial', async () => {
  const listeners={},values=new Map(),sandbox={document:{documentElement:{dataset:{}},addEventListener:()=>{}},window:{addEventListener:(name,fn) => {listeners[name]=fn},open:()=>null},navigator:{},sessionStorage:{getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)},DOMException}
  vm.runInNewContext('('+installFreeReviewProbe.toString()+')()',sandbox)
  assert.equal(sandbox.document.documentElement.dataset.analyticsConsent,undefined,'Probe must not forge a prehydration consent marker')
  const {window,navigator}=sandbox
  assert.equal(window.__freeReviewClipboard.values.length,0)
  await navigator.clipboard.writeText('synthetic answers');assert.equal(window.__freeReviewClipboard.values[0],'synthetic answers')
  window.__freeReviewClipboard.denied=true;await assert.rejects(navigator.clipboard.writeText('not copied'),/Synthetic/)
  assert.equal(window.__freeReviewClipboard.values.length,1)
  window.__freeReviewClipboard.denied=false;await navigator.clipboard.writeText('recovered');assert.equal(window.__freeReviewClipboard.values[1],'recovered')
  listeners['holistic-house:acquisition']({detail:{event:'unexpected'}});assert.equal(window.__freeReviewEvents.length,1,'Probe observes real events; it does not suppress them')
})
for (const fault of ['socket','route','init','newPage','goto']) test('setup failure closes disposable context: '+fault, async () => {
  const calls=[],primary=Error('synthetic '+fault)
  const step=async name => {calls.push(name);if(name===fault)throw primary}
  const page={on:() => {},goto:() => step('goto')}
  const context={routeWebSocket:() => step('socket'),route:() => step('route'),addInitScript:script=>{assert.ok(script.content.includes('installHypnotherapyPopupSpy'));return step('init')},newPage:async () => {await step('newPage');return page},close:async () => {calls.push('close')}}
  const source={url:() => origin+freeReviewPath('en'),viewportSize:() => ({width:390,height:844}),context:() => ({browser:() => ({newContext:async options => {assert.deepEqual(options,{serviceWorkers:'block',viewport:{width:390,height:844}});return context}})})}
  await assert.rejects(verifyFreeReviewJourney(source,() => assert.fail('No unguarded interaction'),'en'),error=>error===primary)
  assert.equal(calls.at(-1),'close')
  if(calls.includes('newPage'))assert.ok(calls.indexOf('route')<calls.indexOf('init')&&calls.indexOf('init')<calls.indexOf('newPage'))
  if(calls.includes('goto'))assert.ok(calls.indexOf('newPage')<calls.indexOf('goto'))
})
const turn = () => new Promise(resolve=>setImmediate(resolve))
const sourceFor = context => ({url:()=>origin+freeReviewPath('en'),viewportSize:()=>({width:390,height:844}),context:()=>({browser:()=>({newContext:async()=>context})})})
for(const mode of ['sync','async']) test('socket '+mode+' close failure returns no raw rejection or private diagnostics',async()=>{
  const failures=[],boundary=freeReviewSocketBoundary(failures),marker='SYNTHETIC_PRIVATE_SOCKET_MARKER'
  const close=mode==='sync'?()=>{throw Error(marker)}:async()=>{throw Error(marker)}
  await boundary.handler({close});await boundary.drain()
  assert.deepEqual(failures,['Free-review socket close failed'])
  assert.ok(!JSON.stringify(failures).includes(marker))
})
for(const reject of [false,true]) test('socket callbacks drain before and after context close: reject='+reject,async()=>{
  const failures=[],calls=[],boundary=freeReviewSocketBoundary(failures)
  let firstResolve,lastResolve,lastReject,settled=false
  void boundary.handler({close:()=>{calls.push('before');return new Promise(resolve=>{firstResolve=resolve})}})
  const task=boundary.closeContext({close:async()=>{
    calls.push('context')
    void boundary.handler({close:()=>{calls.push('after');return new Promise((resolve,reject)=>{lastResolve=resolve;lastReject=reject})}})
  }}).then(()=>{settled=true})
  await turn();assert.deepEqual(calls,['before']);assert.equal(settled,false)
  firstResolve();await turn();assert.deepEqual(calls,['before','context','after']);assert.equal(settled,false)
  if(reject)lastReject(Error('SYNTHETIC_PRIVATE_SOCKET_MARKER'));else lastResolve()
  await task;assert.equal(settled,true);assert.equal(failures.length,reject?1:0)
})
test('concurrent socket drain includes a callback admitted by a settling callback',async()=>{
  const failures=[],boundary=freeReviewSocketBoundary(failures)
  let release,settled=false
  void boundary.handler({close:async()=>{void boundary.handler({close:()=>new Promise(resolve=>{release=resolve})})}})
  const task=boundary.drain().then(()=>{settled=true})
  await turn();assert.equal(settled,false);release();await task;assert.deepEqual(failures,[])
})
test('context close rejection still drains its admitted sockets and exposes only a fixed error',async()=>{
  const failures=[],boundary=freeReviewSocketBoundary(failures),marker='SYNTHETIC_PRIVATE_SOCKET_MARKER'
  let release,settled=false
  const task=boundary.closeContext({close:async()=>{
    void boundary.handler({close:()=>new Promise(resolve=>{release=resolve})});throw Error(marker)
  }}).catch(error=>{settled=true;assert.equal(error.message,'Free-review context close failed');assert.equal(error.cause,undefined)})
  await turn();assert.equal(settled,false);release();await task;assert.equal(settled,true)
})
for(const fault of ['socket','route','init','newPage','goto']) test('setup '+fault+' failure retains precedence and drains late rejected sockets',async t=>{
  const primary=Error('Synthetic setup failure'),marker='SYNTHETIC_PRIVATE_SOCKET_MARKER',logs=[]
  t.mock.method(console,'log',(...args)=>logs.push(args))
  let socketHandler,rejectSocket,started=false,settled=false
  const step=async name=>{if(name===fault)throw primary}
  const context={routeWebSocket:async(_pattern,fn)=>{socketHandler=fn;await step('socket')},route:()=>step('route'),addInitScript:()=>step('init'),newPage:async()=>{await step('newPage');return{on:()=>{},goto:()=>step('goto')}},close:async()=>{
    if(!started){started=true;void socketHandler({close:()=>new Promise((_resolve,reject)=>{rejectSocket=reject})})}
  }}
  const task=verifyFreeReviewJourney(sourceFor(context),()=>assert.fail('No interaction'),'en').catch(error=>{settled=true;assert.equal(error,primary)})
  await turn();assert.equal(started,true);assert.equal(settled,false)
  rejectSocket(Error(marker));await task;assert.equal(settled,true)
  const summary=JSON.parse(logs.at(-1)[1]);assert.equal(summary.completed,false);assert.equal(summary.failureCount,1)
  assert.ok(!JSON.stringify(logs).includes(marker))
})

// Actual consent/public-analytics source runs against synthetic hooks, not a
// hand-written denied marker. This establishes effect ordering, not hydration.
const actualConsentSource = await readFile(new URL('../components/analytics-consent.tsx',import.meta.url),'utf8')
const actualPublicAnalyticsSource = await readFile(new URL('../lib/public-analytics.ts',import.meta.url),'utf8')
function realConsentEffect(sandbox, source=actualConsentSource) {
  const effects=[]
  if (!Object.hasOwn(sandbox.document,'cookie')) Object.defineProperty(sandbox.document,'cookie',{get:()=>'',set:()=>assert.fail('Fixture never grants a consent cookie')})
  const env={document:sandbox.document,window:sandbox.window,navigator:sandbox.navigator,frames:[],fetch:()=>assert.fail('No consent fixture request')}
  const analytics=compileContactModule(actualPublicAnalyticsSource,{},env)
  const consent=compileContactModule(source,{
    react:{useEffect:effect=>effects.push(effect),useState:()=>assert.fail('No privacy preference interaction')},
    'react/jsx-runtime':{jsx:()=>assert.fail('Consent renders null'),jsxs:()=>assert.fail('Consent renders null')},
    'next/navigation':{usePathname:()=>'/en/services/free-situation-review'},
    '@/lib/public-analytics':analytics,
  },env)
  assert.equal(consent.AnalyticsConsent(),null);assert.equal(effects.length,1)
  return ()=>effects[0]()
}

// A lifecycle-only mock reaches the real wrapper's successful terminal path.
// Component/DOM behavior remains covered separately; this is not browser proof.
function socketTerminalHarness(onClose=async()=>{}, onInteraction=()=>{}, completeConsentEffect=true) {
  class Store{constructor(){this.values=new Map()}getItem(key){return this.values.get(key)??null}setItem(key,value){this.values.set(key,String(value))}}
  const sessionStorage=new Store(),sandbox={Storage:Store,sessionStorage,DOMException,navigator:{},document:{documentElement:{dataset:{}},addEventListener:()=>{}},window:{addEventListener:()=>{},location:{href:origin+freeReviewPath('en')}}}
  let httpHandler,socketHandler,initScript,clicks=0,closes=0,interactionObserved=false
  const listeners=new Map(),retained={}
  const observeInteraction=()=>{if(!interactionObserved){interactionObserved=true;onInteraction((kind,value)=>listeners.get(kind)?.(value),retained,sandbox)}}
  const locator=selector=>(observeInteraction(),{
    locator,getByRole:()=>locator('role'),scrollIntoViewIfNeeded:async()=>{},evaluate:async()=>false,
    check:async()=>{},uncheck:async()=>{},fill:async()=>{},selectOption:async()=>{},
    getAttribute:async name=>name==='rel'?'noopener noreferrer':href('en','compact',selector.includes('telegram')?'telegram':'whatsapp'),
    click:async()=>{
      if(!selector.startsWith('button[data-contact-channel-submit='))return
      clicks++;if(clicks<4)return
      const popup=sandbox.window.open('about:blank','_blank');popup.opener=null
      const r=route(request());r.fulfill=async response=>{
        if(response.status===503)popup.close()
        else {sessionStorage.setItem('hh-service-enquiry-receipt:v1',JSON.stringify({createdAt:123,referenceCode:FREE_REVIEW_REFERENCE}));popup.location.replace(href('en','compact','whatsapp'))}
      }
      await httpHandler(r)
    },
  })
  const page={url:()=>origin+freeReviewPath('en'),locator,on:(kind,fn)=>{listeners.set(kind,fn);retained[kind]=fn},off:(kind,fn)=>{assert.equal(listeners.get(kind),fn);listeners.delete(kind)},goto:async()=>{
    await httpHandler(route(request(origin+freeReviewPath('en'),'GET','document')))
    vm.runInNewContext(initScript.content,sandbox)
    assert.equal(sandbox.document.documentElement.dataset.analyticsConsent,undefined)
    if(completeConsentEffect)realConsentEffect(sandbox)()
  },evaluate:async(fn,arg)=>structuredClone(vm.runInNewContext('('+fn.toString()+')',sandbox)(arg))}
  const context={routeWebSocket:async(_pattern,fn)=>{socketHandler=fn},route:async(_pattern,fn)=>{httpHandler=fn},addInitScript:async script=>{initScript=script},newPage:async()=>page,close:async()=>onClose(++closes,socketHandler)}
  const assertions=new Proxy({}, {get:(_target,key)=>key==='not'?assertions:async()=>{}})
  const expect=()=>assertions
  expect.poll=fn=>({toBe:async value=>assert.equal(await fn(),value),toEqual:async value=>assert.deepEqual(await fn(),value),not:{toBe:async value=>assert.notEqual(await fn(),value)}})
  return {run:()=>verifyFreeReviewJourney(sourceFor(context),expect,'en'),get closes(){return closes}}
}
test('socket terminal lifecycle mock completes only after both closes',async t=>{
  const logs=[];t.mock.method(console,'log',(...args)=>logs.push(args))
  const fixture=socketTerminalHarness();await fixture.run()
  assert.equal(fixture.closes,2);assert.equal(JSON.parse(logs.at(-1)[1]).completed,true)
  assert.deepEqual(JSON.parse(logs.at(-1)[1]),{locale:'en',kind:'compact',channel:'whatsapp',denyReceiptStorage:false,completed:true,requestCount:2,failureCount:0,pageErrorCount:0,blocked:[]},'Successful summary is unchanged')
})
for(const closeAt of [1,2]) for(const reject of [false,true]) test(`socket admitted during close ${closeAt} is drained before terminal result: reject=${reject}`,async t=>{
  const logs=[];t.mock.method(console,'log',(...args)=>logs.push(args))
  let resolveSocket,rejectSocket,settled=false,result
  const fixture=socketTerminalHarness(async(count,handler)=>{
    if(count===closeAt)void handler({close:()=>new Promise((resolve,reject)=>{resolveSocket=resolve;rejectSocket=reject})})
  })
  const task=fixture.run().then(()=>{settled=true},error=>{settled=true;result=error})
  await turn();assert.equal(settled,false);assert.equal(logs.length,0)
  if(reject)rejectSocket(Error('SYNTHETIC_PRIVATE_SOCKET_MARKER'));else resolveSocket()
  await task;assert.equal(fixture.closes,2);assert.equal(Boolean(result),reject)
  const summary=JSON.parse(logs.at(-1)[1]);assert.equal(summary.completed,!reject);assert.equal(summary.failureCount,reject?1:0)
  assert.ok(!String(result?.stack).includes('SYNTHETIC_PRIVATE_SOCKET_MARKER'));assert.ok(!JSON.stringify(logs).includes('SYNTHETIC_PRIVATE_SOCKET_MARKER'))
})
for(const closeAt of [1,2]) test('context close '+closeAt+' failure still drains socket and rejects success privately',async t=>{
  const logs=[];t.mock.method(console,'log',(...args)=>logs.push(args))
  let rejectSocket,settled=false,result
  const fixture=socketTerminalHarness(async(count,handler)=>{
    if(count===closeAt){void handler({close:()=>new Promise((_resolve,reject)=>{rejectSocket=reject})});throw Error('SYNTHETIC_PRIVATE_CONTEXT_MARKER')}
  })
  const task=fixture.run().catch(error=>{settled=true;result=error})
  await turn();assert.equal(settled,false)
  rejectSocket(Error('SYNTHETIC_PRIVATE_SOCKET_MARKER'));await task
  assert.equal(fixture.closes,2);assert.ok(result)
  const summary=JSON.parse(logs.at(-1)[1]);assert.equal(summary.completed,false);assert.equal(summary.failureCount,1)
  const errors=error=>[error.message,...(error.errors||[]).flatMap(errors)].join(' ')
  assert.ok(!errors(result).includes('SYNTHETIC_PRIVATE'));assert.ok(!JSON.stringify(logs).includes('SYNTHETIC_PRIVATE'))
})
test('strict reused teardown drains admitted failure before close and retains late API failures', async () => {
  let handler, resolveRead, settled=false, closed=false
  const failures=[],read=new Promise(resolve=>{resolveRead=resolve}),r=route(request(origin+'/_next/static/a.js','GET','script'))
  r.fetch=async () => read
  const context={route:async (_pattern,fn)=>{handler=fn},close:async()=>{closed=true;const late=route(request(origin+'/api/late'));await handler(late);assert.deepEqual(late.log,['abort'])}}
  const receipt={confirmed:false,accept:()=>assert.fail(),close:async()=>{}}
  const task=withFreeReviewIsolation(context,freeReviewRequestGate(origin,'en','drawing',receipt,failures,[]),receipt,async()=>{void handler(r)}).then(()=>{settled=true})
  await new Promise(resolve=>setImmediate(resolve));assert.equal(closed,false);assert.equal(settled,false)
  resolveRead({url:r.request().url,status:()=>500,dispose:async()=>{}})
  await task;assert.equal(closed,true);assert.equal(failures.length,2);assert.equal(r.log.at(-1),'abort')
})
for (const fault of ['route','run','receipt','begin','close']) test('every cleanup attempted after '+fault+' failure', async () => {
  const calls=[],primary=Error(fault),hit=async name=>{calls.push(name);if(name===fault)throw primary}
  const context={route:()=>hit('route'),close:()=>hit('close')},handler=async()=>{}
  handler.beginTeardown=()=>{calls.push('begin');if(fault==='begin')throw primary}
  await assert.rejects(withFreeReviewIsolation(context,handler,{close:()=>hit('receipt')},()=>hit('run')))
  for(const name of ['receipt','begin','close'])assert.ok(calls.includes(name),'cleanup '+name+' still attempted')
})
test('original failure wins when every close stage also fails', async () => {
  const primary=Error('original'),calls=[],handler=async()=>{}
  handler.beginTeardown=()=>{calls.push('begin');throw Error('begin')}
  const context={route:async()=>{},close:async()=>{calls.push('close');throw Error('close')}}
  await assert.rejects(withFreeReviewIsolation(context,handler,{close:async()=>{calls.push('receipt');throw Error('receipt')}},async()=>{throw primary}),error=>error===primary)
  assert.deepEqual(calls,['receipt','begin','close'])
})
for(const kind of ['compact','drawing']) test(kind+' teardown rejects new reads without forwarding and retains late write failure', async()=>{
  const receipt=syntheticFreeReviewReceipt('en',kind,kind==='compact'?'whatsapp':undefined),failures=[]
  const gate=freeReviewRequestGate(origin,'en',kind,receipt,failures,[])
  gate.beginTeardown();await receipt.close()
  const read=route(request(origin+'/_next/static/a.js','GET','script'));await gate(read);assert.deepEqual(read.log,['abort'])
  const write=route(request(undefined,undefined,undefined,body('en',kind)));await gate(write);assert.deepEqual(write.log,['abort'])
  assert.equal(receipt.count,0);assert.equal(failures.length,1)
})

test('integration keeps four widths, original evidence and separate real routes', async () => {
  const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8')
  const main=await read('scripts/verify-app-r1.mjs'),helper=await read('scripts/helpers/free-review-journey-verifier.mjs'),landing=await read('components/free-entry-landing.tsx'),drawing=await read('components/free-drawing-intake.tsx')
  assert.match(main,/for\(const width of \[320,360,390,1280\]\)/)
  assert.match(main,/for\(const locale of \['en','ru'\]\)/)
  for(const call of ["{kind:'compact'}","{kind:'compact',channel:'telegram',denyReceiptStorage:true}","{kind:'private-entry'}","{kind:'private-entry',denyReceiptStorage:true,output}"]) assert.ok(main.includes('verifyFreeReviewJourney(publicPage,expect,locale,'+call+')'))
  assert.match(main,/assertPublicViewportFits\(publicPage,locale\+'\/free-review\/'\+width\)/)
  assert.match(main,/width===390\|\|width===1280/)
  assert.doesNotMatch(main,/\[data-free-quick-request\]|openContactChannelChooser\(ready|openRegisteredContactChannelChooser\(ready/)
  assert.match(helper,/free-review-\$\{locale\}-private-entry-390\.png/)
  assert.match(helper,/await expect\(link\)\.toBeFocused\(\)/)
  assert.doesNotMatch(helper,/verifyFreeReviewDrawingInPage|areas\.nth|answersForm|ready\.getByRole/)
  assert.match(helper,/Temporary analytics hold emits no acquisition event/)
  assert.match(helper,/await expect\(legacy\)\.toHaveAttribute\('href', `\/\$\{locale\}\/coaching\/intake`\)/)
  assert.match(landing,/data-optional-written-review/);assert.match(landing,/<FreeSituationReviewForm locale=\{locale\} \/>/)
  assert.match(drawing,/coachingIntakeEntryTopic/);assert.doesNotMatch(drawing,/<ContactChannelChooser|<form|<textarea|navigator\.clipboard/);assert.doesNotMatch(drawing,/stayAfterSave|localStorage|sessionStorage|indexedDB|fetch\(|sendBeacon|FileReader/)
  assert.match(helper,/hypnotherapyRequestGate/);assert.match(helper,/alchemyRequestGate/);assert.match(helper,/withHypnotherapyIsolation/)
  assert.match(helper,/routeWebSocket\('\*\*\/\*', sockets.handler\)/)
  assert.doesNotMatch(helper,/route\.continue\(|route\.fallback\(|unroute\(|context\.request|force:true|waitForTimeout|timeout:/)
  const workflow=await read('.github/workflows/hh-app-r1.yml')
  assert.match(workflow,/node --test .*tests\/free-review-journey-verifier\.test\.mjs .*tests\/free-review-component-contract\.test\.mjs/)
  // This test reads text; never imports/executes the admin-initializing main script.
})

// Current private-entry browser mode is read-only even after interaction starts.
// Legacy `drawing` below remains a pure neutral-receipt boundary fixture only;
// it is no longer accepted by the current browser journey wrapper.
for (const locale of ['en','ru']) test(locale + ' private entry blocks every submission and protected navigation before/after opening', async () => {
  let accepted = 0;
  const failures = [], blocked = [], receipt = {confirmed:false, accept:async () => {accepted++}};
  const gate = freeReviewRequestGate(origin,locale,'private-entry',receipt,failures,blocked,{bootstrap:true});
  const startup = route(request()); await gate(startup); assert.deepEqual(startup.log,['abort']);
  const initial = route(request(origin + freeReviewPath(locale),'GET','document')); await gate(initial);
  assert.equal(gate.initialDocumentLoaded,true); gate.beginInteraction();
  for (const req of [
    request(), request(origin+'/api/service-enquiries?x=1'), request(origin+'/api/app/bootstrap','GET'),
    request(origin+'/%61pi/private','GET'), request(origin+'/api%2fprivate','GET'),
    request(origin+'/'+locale+'/coaching/intake?topic=personal','GET','document'),
    request(origin+'/'+locale+'/thank-you','GET','document'), request(origin+'/'+locale+'/thank-you?_rsc=abc','GET','fetch'),
    request(origin+'/other','PUT'), request('https://evil.invalid/','GET','document'),
  ]) {
    const r = route(req); await gate(r); assert.deepEqual(r.log,['abort']);
  }
  assert.equal(accepted,0,'Private entry cannot reach even the synthetic write adapter');
  assert.equal(failures.length,11);
  const asset=route(request(origin+'/_next/static/chunks/a.js','GET','script')); await gate(asset);
  assert.deepEqual(asset.log[0],{maxRedirects:0}); assert.equal(asset.log.at(-1),'dispose');
  gate.beginTeardown(); const late=route(request()); await gate(late); assert.deepEqual(late.log,['abort']);
  assert.equal(accepted,0); assert.equal(failures.length,12);
});

test('private-entry branch remains fail-closed even with a fabricated receipt confirmation', async () => {
  let accepted=0;
  for (const path of ['/en/thank-you','/en/thank-you?_rsc=abc']) {
    const r=route(request(origin+path,'GET',path.includes('?')?'fetch':'document'));
    await freeReviewRequestGate(origin,'en','private-entry',{confirmed:true,accept:async()=>{accepted++}},[],[])(r);
    assert.deepEqual(r.log,['abort']);
  }
  const r=route(request());
  await freeReviewRequestGate(origin,'en','private-entry',{confirmed:true,accept:async()=>{accepted++}},[],[])(r);
  assert.deepEqual(r.log,['abort']); assert.equal(accepted,0);
});

test('retired drawing browser branch is rejected before any browser is constructed', async () => {
  const source={url:()=>origin+freeReviewPath('en'),context:()=>assert.fail('Retired branch must fail before context creation')};
  await assert.rejects(verifyFreeReviewJourney(source,()=>assert.fail(),'en',{kind:'drawing'}));
});

for (const locale of ['en','ru']) test(locale + ' browser private-entry oracle accepts only the actual rendered current component', async () => {
  const {mount,environment} = await import('./helpers/contact-component-fixture.mjs');
  const text = node => Array.isArray(node) ? node.map(text).join('') : node && typeof node === 'object' ? text(node.props?.children) : typeof node === 'string' ? node : '';
  for (const topic of ['personal','wellbeing','relationships','career','business','goal','other']) {
    const f=mount('free-drawing-intake','FreeDrawingIntake',{locale},environment(locale,{search:'?topic='+topic}));
    const section=f.find('section'),heading=f.find('h2'),links=f.nodes().filter(node=>node.type==='a');
    const snapshot={lang:section.props.lang,labelledBy:section.props['aria-labelledby'],titleId:heading.props.id,heading:text(heading),hrefs:links.map(link=>link.props.href),linkNames:links.map(text),controls:f.nodes().filter(node=>['form','input','textarea','button','chooser','acquisition-link'].includes(node.type)).length,text:text(section)};
    assertFreeReviewPrivateEntrySnapshot(snapshot,locale,topic);
    for (const changes of [
      {lang:locale==='en'?'ru':'en'}, {labelledBy:'not-the-heading'}, {titleId:''},
      {hrefs:['https://evil.invalid/intake']}, {hrefs:['/'+locale+'/coaching/intake?topic='+topic+'&answer=private']},
      {hrefs:['/'+(locale==='en'?'ru':'en')+'/coaching/intake?topic='+topic]}, {hrefs:[...snapshot.hrefs,...snapshot.hrefs]},
      {linkNames:['Send my answers in WhatsApp']}, {controls:1}, {text:'Share your answers'},
      {text:snapshot.text+FREE_REVIEW_CONTACT}, {text:snapshot.text+freeReviewMarkers(locale)[0]},
    ]) assert.throws(()=>assertFreeReviewPrivateEntrySnapshot({...snapshot,...changes},locale,topic));
  }
});

for (const locale of ['en','ru']) test(locale + ' browser compact receipt contract matches actual current parent, chooser and phone input',async () => {
  const {expressFixture,turn}=await import('./helpers/personal-express-parent-fixture.mjs')
  const f=expressFixture({locale});assert.equal(f.find('input',p=>p.type==='tel').hidden,true)
  f.reveal();f.select('energy');f.select('situation');assert.equal(f.find('input',p=>p.type==='checkbox').props.checked,false)
  assert.equal(f.find('div',p=>Object.hasOwn(p,'data-express-inline-disclosure')).props.role,'region')
  f.phone(FREE_REVIEW_CONTACT);f.consent();f.send();await turn(f);assert.deepEqual(f.env.requests,[]);assert.deepEqual(f.env.popups,[])
  f.phone('4165550123');f.send();await turn(f);assert.equal(f.env.requests.length,1)
  for(const channel of ['whatsapp','telegram'])assertFreeReviewBody(f.env.requests[0],locale,'compact',channel)
  const sent=JSON.parse(f.env.requests[0]);assert.equal(sent.description,freeReviewPublicTopic(locale))
  assert.throws(()=>assertFreeReviewBody(JSON.stringify({...sent,description:'Preferred reply channel: WhatsApp'}),locale,'compact','whatsapp'))
  assert.equal(f.links().length,2);assert.equal(f.env.navigations.length,0);f.unmount()
});

function assertCurrentFreeReviewAdapter(source) {
  const start=source.indexOf('export async function verifyFreeReviewCompactInPage('),end=source.indexOf('// A snapshot of the actual rendered public entry',start)
  assert.ok(start>=0&&end>start);const compact=source.slice(start,end)
  for(const text of ["capture.locator('[data-reiki-phone-enquiry] form')","form.locator('input[type=\"tel\"]')","form.locator('[data-phone-country-input] select')","await country.selectOption('CA')",'button[data-contact-channel-submit=',"[country, contact, consent]","await expect(other).toBeEnabled()","[submit, other, country, contact, consent]","await expect(contact).toHaveValue(FREE_REVIEW_NATIONAL_PHONE)","await expect(capture.locator('[role=\"status\"]')).toBeVisible()","'compact', 'data-contact-channel'","await receipt.confirm()","await assertReceiptStorage(page, denyReceiptStorage)","await assertPrivateState(page, locale)"])assert.ok(compact.includes(text),'Actual compact browser contract: '+text)
  assert.doesNotMatch(compact,/data-compact-lead-form|data-compact-channel|name="contact"|data-lead-saved|toHaveValue\(FREE_REVIEW_PHONE\)/)
  assert.match(source,/button\[data-express-reveal\]/)
  assert.match(compact,/await reveal\.click\(\); await expect\(capture\)\.toBeHidden\(\)/)
  assert.match(compact,/await expect\(form\)\.toHaveCount\(1\)/)
  assert.match(compact,/assert\.equal\(receipt\.pending,true,'Folding does not cancel the pending operation'\)/)
  assert.match(source,/input\[name="express-review-focus"\]\[value="situation"\]/)
  assert.match(source,/kind === 'drawing' \? '' : freeReviewPublicTopic\(locale\)/)
}
test('free-review browser adapter binds current real compact controls and retains native/receipt lock semantics',async()=>{
 const source=await readFile(new URL('../scripts/helpers/free-review-journey-verifier.mjs',import.meta.url),'utf8');assertCurrentFreeReviewAdapter(source)
 for(const [before,after] of [["[data-reiki-phone-enquiry] form","[data-compact-lead-form]"],["await expect(other).toBeEnabled()","await expect(other).toBeDisabled()"],["[country, contact, consent]","[contact, consent]"],["await expect(capture.locator('[role=\"status\"]')).toBeVisible()",''],["kind === 'drawing' ? '' : freeReviewPublicTopic(locale)","kind === 'drawing' ? '' : 'Preferred reply channel: WhatsApp'"],["await expect(form).toHaveCount(1)","await expect(form).toHaveCount(0)"],["assert.equal(receipt.pending,true,","assert.equal(receipt.pending,false,"]]){assert.ok(source.includes(before));assert.throws(()=>assertCurrentFreeReviewAdapter(source.replaceAll(before,after)),error=>error?.code==='ERR_ASSERTION')}
})

for(const locale of ['en','ru'])test(locale+' actual inline fold after unknown result preserves exact explicit-retry body and UUID',async()=>{
 const {expressFixture,turn,unknown,success}=await import('./helpers/personal-express-parent-fixture.mjs');const f=expressFixture({locale});f.reveal();f.phone('4165550123');f.consent();f.env.setRespond(unknown);f.send();await turn(f);
 const raw=f.env.requests[0];assertFreeReviewBody(raw,locale,'compact','whatsapp');assert.equal(f.env.writes.length,0);
 f.reveal();assert.equal(f.find('input',p=>p.type==='tel').hidden,true);assert.equal(f.find('input',p=>p.type==='tel').props.value,'4165550123');assert.equal(f.find('input',p=>p.type==='checkbox').props.checked,true);assert.equal(f.env.requests.length,1);
 f.reveal();f.env.setRespond(success);f.send('telegram');await turn(f);assert.equal(f.env.requests.length,2);assert.equal(f.env.requests[1],raw);assert.equal(f.env.writes.length,1);assert.equal(f.links().length,2);f.unmount();
});

// Execute the actual denied-request gate; diagnostics never admit a request.
const fatalBoundaryMessage = 'Unexpected API, write or navigation blocked'
function diagnosticRequest(url, method='GET', type='document', {navigation=true, subframe=false}={}) {
  const req=request(url,method,type),main={},frame=subframe?{}:main
  frame.page=()=>({mainFrame:()=>main});frame.url=()=>assert.fail('No frame URL observation')
  req.frame=()=>frame;req.isNavigationRequest=()=>navigation
  req.headers=()=>assert.fail('No diagnostic headers');req.postData=()=>assert.fail('No diagnostic body')
  return req
}
const fatalCases=[
  ['API read',origin+'/api/app/bootstrap','GET','fetch','api',true,false,false],
  ['encoded API',origin+'/%61pi%2fapp/bootstrap','GET','xhr','api',true,false,false],
  ['non-GET',origin+'/other','HEAD','other','other',true,false,false],
  ['premature receipt',origin+'/en/thank-you?_rsc=synthetic','GET','fetch','receipt',true,false,false],
  ['repeated service document',origin+freeReviewPath('en'),'GET','document','free-review',true,true,false],
  ['foreign document','https://outside.invalid/private-synthetic?secret=synthetic','GET','document','other',false,true,false],
  ['subframe document',origin+'/frame-synthetic','GET','document','other',true,true,true],
  ['static document',origin+'/_next/static/a.js','GET','document','next-static',true,true,false],
  ['development document',origin+'/_next/development','GET','document','next-internal',true,true,false],
]
for(const [name,url,method,type,pathnameCategory,sameOrigin,navigation,subframe] of fatalCases) test('first fatal diagnostic classifies '+name+' without changing policy',async()=>{
  const failures=[],blocked=[],receipt=syntheticFreeReviewReceipt('en','compact','whatsapp')
  const gate=freeReviewRequestGate(origin,'en','compact',receipt,failures,blocked,{bootstrap:true})
  await gate(route(request(origin+freeReviewPath('en'),'GET','document')))
  assert.equal(gate.initialDocumentLoaded,true);assert.equal(gate.firstFatalRequest,null)
  const denied=route(diagnosticRequest(url,method,type,{navigation,subframe}));await gate(denied)
  assert.deepEqual(denied.log,['abort']);assert.deepEqual(failures,[fatalBoundaryMessage]);assert.deepEqual(blocked,[]);assert.equal(receipt.count,0)
  assert.deepEqual(gate.firstFatalRequest,{method,resource:type,endpointCategory:'unclassified',pathnameCategory,sameOrigin,navigation,mainFrame:!subframe,subframe,beforeInteraction:true})
  assert.equal(Object.isFrozen(gate.firstFatalRequest),true)
})
test('fatal diagnostic is first-only and distinguishes an armed interaction',async()=>{
  const failures=[],receipt=syntheticFreeReviewReceipt('en','compact','whatsapp'),gate=freeReviewRequestGate(origin,'en','compact',receipt,failures,[],{bootstrap:true})
  await gate(route(request(origin+freeReviewPath('en'),'GET','document')));gate.beginInteraction()
  const first=route(diagnosticRequest(origin+'/api/first','GET','fetch',{navigation:false}));await gate(first)
  const snapshot=gate.firstFatalRequest;assert.equal(snapshot.beforeInteraction,false)
  for(let i=0;i<20;i++) { const denied=route(diagnosticRequest('https://outside.invalid/other-'+i));await gate(denied);assert.deepEqual(denied.log,['abort']) }
  assert.strictEqual(gate.firstFatalRequest,snapshot);assert.equal(failures.length,21);assert.ok(failures.every(value=>value===fatalBoundaryMessage));assert.equal(receipt.count,0)
})
test('new diagnostic getters may throw without altering the original rejection',async()=>{
  const marker='PRIVATE_DIAGNOSTIC_THROW_MARKER',failures=[],gate=freeReviewRequestGate(origin,'en','compact',{confirmed:false,accept:()=>assert.fail()},failures,[],{bootstrap:true})
  const req=diagnosticRequest(origin+'/other','PUT','fetch');let methodReads=0
  req.method=()=>{if(++methodReads===1)return 'PUT';throw Error(marker)}
  for(const field of ['resourceType','frame','isNavigationRequest'])req[field]=()=>{throw Error(marker)}
  const denied=route(req);await gate(denied)
  assert.deepEqual(denied.log,['abort']);assert.deepEqual(failures,[fatalBoundaryMessage])
  assert.deepEqual(gate.firstFatalRequest,{method:null,resource:null,endpointCategory:'unclassified',pathnameCategory:'other',sameOrigin:true,navigation:null,mainFrame:null,subframe:null,beforeInteraction:true})
  assert.ok(!JSON.stringify([failures,gate.firstFatalRequest]).includes(marker))
})
test('unknown enums and poison URL components never become diagnostic values',async()=>{
  const marker='PRIVATE_DIAGNOSTIC_POISON',failures=[],gate=freeReviewRequestGate(origin,'en','compact',{confirmed:false,accept:()=>assert.fail()},failures,[],{bootstrap:true})
  const req=diagnosticRequest('https://'+marker+':'+marker+'@outside.invalid/'+marker+'?'+marker+'='+marker+'#'+marker,marker,marker)
  req.isNavigationRequest=()=>marker;req.frame=()=>{throw Error(marker)}
  const denied=route(req);await gate(denied)
  assert.deepEqual(denied.log,['abort']);assert.deepEqual(failures,[fatalBoundaryMessage])
  assert.deepEqual(gate.firstFatalRequest,{method:null,resource:null,endpointCategory:'unclassified',pathnameCategory:'other',sameOrigin:false,navigation:null,mainFrame:null,subframe:null,beforeInteraction:true})
  assert.doesNotMatch(JSON.stringify([failures,gate.firstFatalRequest]),/PRIVATE_DIAGNOSTIC_POISON|https?:|outside|\?|#|@/)
})
test('malformed encoded paths retain original catch failure rather than a fabricated fatal descriptor',async()=>{
  const failures=[],gate=freeReviewRequestGate(origin,'en','compact',{confirmed:false,accept:()=>assert.fail()},failures,[],{bootstrap:true})
  const denied=route(diagnosticRequest(origin+'/%malformed'));await gate(denied)
  assert.deepEqual(denied.log,['abort']);assert.deepEqual(failures,['Free-review request boundary failed']);assert.equal(gate.firstFatalRequest,null)
})
for(const [name,url,method,type,,sameOrigin,navigation,subframe] of fatalCases.slice(0,7)) test('startup wrapper '+name+' rejects before interaction and emits only after cleanup',async t=>{
  const logs=[],calls=[];t.mock.method(console,'log',(...args)=>{calls.push('log');logs.push(args)})
  let httpHandler,releaseClose,closeCount=0,settled=false,result
  const closed=new Promise(resolve=>{releaseClose=resolve})
  const page={on:()=>{},goto:async()=>{
    await httpHandler(route(request(origin+freeReviewPath('en'),'GET','document')))
    const denied=route(diagnosticRequest(url,method,type,{navigation,subframe}));await httpHandler(denied);assert.deepEqual(denied.log,['abort'])
  },evaluate:()=>assert.fail('No startup interaction or popup evaluation'),locator:()=>assert.fail('No component interaction')}
  const context={routeWebSocket:async()=>{},route:async(_pattern,handler)=>{httpHandler=handler},addInitScript:async()=>{},newPage:async()=>page,
    close:async()=>{calls.push('close');if(++closeCount===1)await closed}}
  const task=verifyFreeReviewJourney(sourceFor(context),()=>assert.fail('No interaction'),'en').catch(error=>{result=error;settled=true})
  await turn();assert.equal(settled,false);assert.equal(logs.length,0);assert.equal(closeCount,1)
  releaseClose();await task
  assert.equal(result?.code,'ERR_ASSERTION');assert.deepEqual(result.actual,[fatalBoundaryMessage]);assert.deepEqual(result.expected,[])
  assert.equal(closeCount,2);assert.deepEqual(calls,['close','close','log']);assert.equal(logs.length,1);assert.equal(logs[0][0],'SYNTHETIC_FREE_REVIEW_BOUNDARY')
  const summary=JSON.parse(logs[0][1]);assert.equal(summary.completed,false);assert.equal(summary.requestCount,0);assert.equal(summary.failureCount,1);assert.equal(summary.pageErrorCount,0);assert.deepEqual(summary.blocked,[])
  assert.deepEqual(summary.firstFatalRequest,{method,resource:type,endpointCategory:'unclassified',pathnameCategory:fatalCases.find(row=>row[0]===name)[4],sameOrigin,navigation,mainFrame:!subframe,subframe,beforeInteraction:true})
  assert.doesNotMatch(JSON.stringify(summary),/https?:|outside|private-synthetic|secret|bootstrap|_rsc/)
})


// Only source-pinned endpoint identity is classified; this never excuses its
// triggering error and never changes the denied request's failure or abort.
const devStackLookupPath = '/__nextjs_original-stack-frames'
const devStackLookupCases = [
  ['exact endpoint', origin + devStackLookupPath, 'POST', 'fetch', 'dev-stack-lookup'],
  ...[
    ['trailing slash', devStackLookupPath + '/'],
    ['extra suffix', devStackLookupPath + '-extra'],
    ['extra prefix', '/prefix' + devStackLookupPath],
    ['case drift', '/__NEXTJS_original-stack-frames'],
    ['encoded leading underscore', '/%5f_nextjs_original-stack-frames'],
    ['encoded internal hyphen', '/__nextjs_original%2dstack-frames'],
    ['encoded trailing slash', devStackLookupPath + '%2f'],
    ['double leading slash', '/' + devStackLookupPath],
    ['query', devStackLookupPath + '?PRIVATE_ENDPOINT_MARKER=1'],
    ['empty query', devStackLookupPath + '?'],
    ['fragment', devStackLookupPath + '#PRIVATE_ENDPOINT_MARKER'],
    ['empty fragment', devStackLookupPath + '#'],
  ].map(([name, path]) => [name, origin + path, 'POST', 'fetch', 'unclassified']),
  ['foreign hostname', 'http://localhost:3100' + devStackLookupPath, 'POST', 'fetch', 'unclassified'],
  ['foreign port', 'http://127.0.0.1:3101' + devStackLookupPath, 'POST', 'fetch', 'unclassified'],
  ['foreign scheme', 'https://127.0.0.1:3100' + devStackLookupPath, 'POST', 'fetch', 'unclassified'],
  ['credentials', 'http://PRIVATE_ENDPOINT_MARKER:PRIVATE_ENDPOINT_MARKER@127.0.0.1:3100' + devStackLookupPath, 'POST', 'fetch', 'unclassified'],
  ['wrong method', origin + devStackLookupPath, 'HEAD', 'fetch', 'unclassified'],
  ['lowercase method', origin + devStackLookupPath, 'post', 'fetch', 'unclassified'],
  ['wrong resource', origin + devStackLookupPath, 'POST', 'xhr', 'unclassified'],
  ['unknown resource', origin + devStackLookupPath, 'POST', 'PRIVATE_ENDPOINT_MARKER', 'unclassified'],
]
for (const [name, url, method, resource, endpointCategory] of devStackLookupCases) test('denied endpoint enum ' + name + ' stays observation-only', async () => {
  const failures = [], blocked = [], receipt = syntheticFreeReviewReceipt('en', 'compact', 'whatsapp')
  const gate = freeReviewRequestGate(origin, 'en', 'compact', receipt, failures, blocked, {bootstrap:true})
  const denied = route(diagnosticRequest(url, method, resource, {navigation:false}))
  await gate(denied)
  assert.deepEqual(denied.log, ['abort'])
  assert.deepEqual(failures, [fatalBoundaryMessage]); assert.deepEqual(blocked, []); assert.equal(receipt.count, 0)
  assert.deepEqual(gate.firstFatalRequest, {
    method:method === 'post' ? null : method,
    resource:resource === 'PRIVATE_ENDPOINT_MARKER' ? null : resource,
    endpointCategory, pathnameCategory:'other', sameOrigin:new URL(url).origin === origin,
    navigation:false, mainFrame:true, subframe:false, beforeInteraction:true,
  })
  assert.equal(Object.isFrozen(gate.firstFatalRequest), true)
  assert.doesNotMatch(JSON.stringify([failures, gate.firstFatalRequest]), /PRIVATE_ENDPOINT_MARKER|https?:|__nextjs|[?#@]/)
})
test('denied endpoint enum does not reclassify a nonfatal GET read into a fatal write', async () => {
  const failures = [], blocked = [], receipt = syntheticFreeReviewReceipt('en', 'compact', 'whatsapp')
  const gate = freeReviewRequestGate(origin, 'en', 'compact', receipt, failures, blocked, {bootstrap:true})
  const denied = route(diagnosticRequest(origin + devStackLookupPath, 'GET', 'fetch', {navigation:false}))
  await gate(denied)
  assert.deepEqual(denied.log, ['abort']); assert.deepEqual(failures, []); assert.equal(blocked.length, 1)
  assert.equal(gate.firstFatalRequest, null); assert.equal(receipt.count, 0)
})
test('denied endpoint enum failed observation defaults to unclassified without swallowing the failure', async () => {
  const failures = [], receipt = syntheticFreeReviewReceipt('en', 'compact', 'whatsapp')
  const gate = freeReviewRequestGate(origin, 'en', 'compact', receipt, failures, [], {bootstrap:true})
  const req = diagnosticRequest(origin + devStackLookupPath, 'POST', 'fetch', {navigation:false})
  req.resourceType = () => { throw Error('PRIVATE_ENDPOINT_MARKER') }
  const denied = route(req); await gate(denied)
  assert.deepEqual(denied.log, ['abort']); assert.deepEqual(failures, [fatalBoundaryMessage]); assert.equal(receipt.count, 0)
  assert.deepEqual(gate.firstFatalRequest, {method:'POST',resource:null,endpointCategory:'unclassified',pathnameCategory:'other',sameOrigin:true,navigation:false,mainFrame:true,subframe:false,beforeInteraction:true})
})
for (const [name, url, endpointCategory] of [
  ['exact lookup', origin + devStackLookupPath, 'dev-stack-lookup'],
  ['unknown write', origin + '/unclassified-startup-write?PRIVATE_ENDPOINT_MARKER=1', 'unclassified'],
]) test('startup emitted endpoint enum ' + name + ' preserves blocking result after cleanup', async t => {
  const logs = [], calls = []; t.mock.method(console, 'log', (...args) => {calls.push('log'); logs.push(args)})
  let httpHandler
  const page = {on:()=>{},goto:async()=>{
    await httpHandler(route(request(origin + freeReviewPath('en'), 'GET', 'document')))
    const denied = route(diagnosticRequest(url, 'POST', 'fetch', {navigation:false}))
    await httpHandler(denied); assert.deepEqual(denied.log, ['abort'])
  },evaluate:()=>assert.fail('No startup interaction'),locator:()=>assert.fail('No component interaction')}
  const context = {routeWebSocket:async()=>{},route:async(_pattern, handler)=>{httpHandler=handler},addInitScript:async()=>{},newPage:async()=>page,close:async()=>{calls.push('close')}}
  await assert.rejects(verifyFreeReviewJourney(sourceFor(context), () => assert.fail('No interaction'), 'en'), error => {
    assert.equal(error.code, 'ERR_ASSERTION'); assert.deepEqual(error.actual, [fatalBoundaryMessage]); assert.deepEqual(error.expected, []); return true
  })
  assert.deepEqual(calls, ['close','close','log']); assert.equal(logs.length, 1); assert.equal(logs[0][0], 'SYNTHETIC_FREE_REVIEW_BOUNDARY')
  const summary = JSON.parse(logs[0][1])
  assert.deepEqual(summary, {locale:'en',kind:'compact',channel:'whatsapp',denyReceiptStorage:false,completed:false,requestCount:0,failureCount:1,pageErrorCount:0,blocked:[],
    startupDiagnostics:{consoleListener:'attached',cutoff:'boundary',eventCount:0,readFailureCount:0,overflow:false,omittedCallbackCount:0,events:[]},
    firstFatalRequest:{method:'POST',resource:'fetch',endpointCategory,pathnameCategory:'other',sameOrigin:true,navigation:false,mainFrame:true,subframe:false,beforeInteraction:true}})
  assert.doesNotMatch(logs[0][1], /PRIVATE_ENDPOINT_MARKER|https?:|__nextjs|unclassified-startup-write|[?#@]/)
})

// Synthetic strings only: no browser, user console, stack or record is read.
const triggerMarker = 'SYNTHETIC_TRIGGER_PRIVATE_MARKER https://fixture.invalid/?input=secret'
const triggerFamilies = [
  ['hydration-html-mismatch', "Hydration failed because the server rendered HTML didn't match the client. As a result this tree will be regenerated on the client."],
  ['hydration-text-mismatch', "Hydration failed because the server rendered text didn't match the client. As a result this tree will be regenerated on the client."],
  ['hydration-attribute-mismatch', "A tree hydrated but some attributes of the server rendered HTML didn't match the client properties. This won't be patched up."],
  ['dom-invalid-child', 'In HTML, %s cannot be a child of <%s>.%s\nThis will cause a hydration error.%s'],
  ['dom-invalid-descendant', 'In HTML, %s cannot be a descendant of <%s>.\nThis will cause a hydration error.%s'],
  ['dom-text-child', 'In HTML, text nodes cannot be a child of <%s>.\nThis will cause a hydration error.%s'],
  ['dom-whitespace-child', "In HTML, whitespace text nodes cannot be a child of <%s>. Make sure you don't have any extra whitespace between tags on each line of your source code.\nThis will cause a hydration error.%s"],
  ['hydration-boundary-recovery-message', 'There was an error while hydrating but React was able to recover by instead client rendering from the nearest Suspense boundary.'],
  ['hydration-root-recovery-message', 'There was an error while hydrating but React was able to recover by instead client rendering the entire root.'],
]
for (const [family, literal] of triggerFamilies) for (const prefix of ['', 'Error: ']) test('startup message exact family ' + family + ' prefix=' + Boolean(prefix), () => {
  assert.equal(classifyFreeReviewStartupMessage(prefix + literal + '\n' + triggerMarker), family)
  for (const changed of ['unrelated ' + literal, literal.toUpperCase(), literal.replace(/\.$|%s$/, '')]) {
    assert.equal(classifyFreeReviewStartupMessage(changed), 'unclassified')
  }
})
for (const [family, message] of [
  ['dom-invalid-child', 'In HTML, <div> cannot be a child of <p>.\nThis will cause a hydration error.'],
  ['dom-invalid-descendant', 'In HTML, <button> cannot be a descendant of <button>.\nThis will cause a hydration error.'],
  ['dom-text-child', 'In HTML, text nodes cannot be a child of <tr>.\nThis will cause a hydration error.'],
  ['dom-whitespace-child', "In HTML, whitespace text nodes cannot be a child of <table>. Make sure you don't have any extra whitespace between tags on each line of your source code.\nThis will cause a hydration error."],
]) test('startup message exact interpolated family ' + family, () => {
  assert.equal(classifyFreeReviewStartupMessage(message + '\n' + triggerMarker), family)
  assert.equal(classifyFreeReviewStartupMessage(message.replace('hydration error.', 'different error.')), 'unclassified')
})
for (const [name, value] of [
  ['undefined', undefined], ['null', null], ['number', 1], ['boolean', true], ['array', []], ['symbol', Symbol('synthetic')],
  ['object', {toString:()=>assert.fail('No object coercion')}], ['empty', ''], ['generic hydration', 'A hydration warning happened'],
  ['unrelated prefix', triggerMarker + triggerFamilies[0][1]], ['unknown React error', 'An error occurred in the <Synthetic> component.'],
  ['companion nesting warning', '<p> cannot contain a nested <div>.\nSee this log for the ancestor stack trace.'],
  ['oversize tag', 'In HTML, <'+'a'.repeat(33)+'> cannot be a child of <p>.\nThis will cause a hydration error.'],
  ['attribute-bearing tag', 'In HTML, <div id="synthetic"> cannot be a child of <p>.\nThis will cause a hydration error.'],
  ['bounded suffix only', 'x'.repeat(513)+triggerFamilies[0][1]],
]) test('startup message unknown/malformed ' + name, () => assert.equal(classifyFreeReviewStartupMessage(value), 'unclassified'))
const triggerConsole = (text, type='error') => ({type:()=>type, text:()=>text,
  args:()=>assert.fail('No console args'),location:()=>assert.fail('No console location'),jsonValue:()=>assert.fail('No remote serialization')})
const diagnosticSnapshot = (events=[], extra={}) => ({consoleListener:'unavailable',cutoff:'cleanup',eventCount:events.length,readFailureCount:0,overflow:false,omittedCallbackCount:0,
  events:events.map(([source,family], index)=>({order:index+1,source,family})),...extra})
test('startup observer keeps only closed enums and host callback order, not raw payloads', () => {
  const diagnostic=createFreeReviewStartupDiagnostics(()=>true)
  diagnostic.observeConsole(triggerConsole(triggerFamilies[0][1]+'\n'+triggerMarker))
  diagnostic.observeConsole(triggerConsole(triggerMarker,'warning'))
  diagnostic.observePageError({message:triggerFamilies[1][1]+'\n'+triggerMarker,get stack(){assert.fail('No error stack')},get cause(){assert.fail('No error cause')}})
  diagnostic.freeze('cleanup')
  assert.deepEqual(diagnostic.snapshot(),diagnosticSnapshot([['console-error','hydration-html-mismatch'],['console-warning','unclassified'],['pageerror','hydration-text-mismatch']]))
  assert.doesNotMatch(JSON.stringify(diagnostic.snapshot()),/SYNTHETIC_TRIGGER_PRIVATE_MARKER|https?:|input|secret|rendered|stack|cause/)
  assert.ok(Object.isFrozen(diagnostic.snapshot()));assert.ok(Object.isFrozen(diagnostic.snapshot().events));assert.ok(diagnostic.snapshot().events.every(Object.isFrozen))
  assert.throws(()=>{diagnostic.snapshot().events[0].family=triggerMarker})
})
for (const type of ['log','info','debug','warn','trace','assert',undefined,triggerMarker]) test('startup observer ignores unapproved console type ' + String(type), () => {
  const diagnostic=createFreeReviewStartupDiagnostics(()=>true)
  diagnostic.observeConsole({type:()=>type,text:()=>assert.fail('Ignored type must not read text')})
  diagnostic.freeze('cleanup');assert.deepEqual(diagnostic.snapshot(),diagnosticSnapshot())
})
for (const mode of ['type-method','type-property','text-method','text-property','pageerror-message','pageerror-null']) test('startup observer raw getter exception stays nonblocking '+mode, () => {
  const diagnostic=createFreeReviewStartupDiagnostics(()=>true),poison=()=>{throw Error(triggerMarker)}
  if(mode==='type-method') diagnostic.observeConsole({type:poison})
  if(mode==='type-property') diagnostic.observeConsole({get type(){return poison()}})
  if(mode==='text-method') diagnostic.observeConsole({type:()=> 'error',text:poison})
  if(mode==='text-property') diagnostic.observeConsole({type:()=> 'error',get text(){return poison()}})
  if(mode==='pageerror-message') diagnostic.observePageError({get message(){return poison()}})
  if(mode==='pageerror-null') diagnostic.observePageError(null)
  diagnostic.freeze('cleanup')
  const source=mode.startsWith('type')?'console-unavailable':mode.startsWith('text')?'console-error':'pageerror'
  assert.deepEqual(diagnostic.snapshot(),diagnosticSnapshot([[source,'unclassified']],{readFailureCount:1}))
  assert.ok(!JSON.stringify(diagnostic.snapshot()).includes(triggerMarker))
})
test('startup observer malformed scalar does not coerce or claim a read failure', () => {
  const diagnostic=createFreeReviewStartupDiagnostics(()=>true)
  diagnostic.observeConsole(triggerConsole({toString:()=>assert.fail('No coercion')}))
  diagnostic.observePageError({message:Symbol('synthetic')})
  diagnostic.freeze('cleanup');assert.deepEqual(diagnostic.snapshot(),diagnosticSnapshot([['console-error','unclassified'],['pageerror','unclassified']]))
})
test('startup observer bounds events and counts and stops raw reads on overflow', () => {
  const diagnostic=createFreeReviewStartupDiagnostics(()=>true)
  for(let i=0;i<8;i++)diagnostic.observeConsole(triggerConsole(triggerMarker))
  let saturatedReads=0
  const poison=new Proxy({}, {get:()=>{saturatedReads++;throw Error(triggerMarker)}})
  for(let i=0;i<1000;i++){diagnostic.observeConsole(poison);diagnostic.observePageError(poison)}
  diagnostic.freeze('cleanup');assert.equal(saturatedReads,0,'No getters after counter saturation')
  assert.deepEqual(diagnostic.snapshot(),diagnosticSnapshot(Array.from({length:8},()=>['console-error','unclassified']),{eventCount:8,overflow:true,omittedCallbackCount:255}))
})
for (const reason of ['boundary','interaction','cleanup','unknown']) test('startup observer first freeze wins and stops getters '+reason, () => {
  let before=true
  const diagnostic=createFreeReviewStartupDiagnostics(()=>before)
  diagnostic.observeConsole(triggerConsole(triggerFamilies[2][1]))
  if(reason==='boundary')before=false;else diagnostic.freeze(reason)
  let reads=0
  const poison=new Proxy({}, {get:()=>{reads++;throw Error(triggerMarker)}})
  diagnostic.observeConsole(poison);diagnostic.observePageError(poison)
  before=true;diagnostic.freeze('cleanup');diagnostic.observeConsole(triggerConsole(triggerMarker));assert.equal(reads,0)
  assert.deepEqual(diagnostic.snapshot(),diagnosticSnapshot([['console-error','hydration-attribute-mismatch']],{cutoff:reason==='unknown'?'unavailable':reason}))
})
test('startup observer boundary read exception is unavailable and never reads event', () => {
  const diagnostic=createFreeReviewStartupDiagnostics(()=>{throw Error(triggerMarker)})
  let reads=0
  diagnostic.observeConsole(new Proxy({}, {get:()=>{reads++;throw Error(triggerMarker)}}));assert.equal(reads,0)
  diagnostic.freeze('cleanup');assert.deepEqual(diagnostic.snapshot(),diagnosticSnapshot([],{cutoff:'unavailable'}))
})
for(const fault of ['none','on','off'])test('startup observer listener teardown is idempotent, including partial attachment '+fault,()=>{
  const calls=[],diagnostic=createFreeReviewStartupDiagnostics(()=>true)
  let listener
  const page={on:(name,fn)=>{calls.push('on:'+name);listener=fn;if(fault==='on')throw Error(triggerMarker)},off:(name,fn)=>{calls.push('off:'+name);assert.equal(fn,listener);if(fault==='off')throw Error(triggerMarker)}}
  diagnostic.attachConsole(page);diagnostic.attachConsole(page)
  listener(triggerConsole(triggerFamilies[0][1]))
  diagnostic.freeze('cleanup');diagnostic.detachConsole();diagnostic.detachConsole()
  listener(new Proxy({}, {get:()=>assert.fail('Stale callback must not read event')}))
  assert.deepEqual(calls,['on:console','off:console'])
  assert.deepEqual(diagnostic.snapshot(),diagnosticSnapshot([['console-error','hydration-html-mismatch']],{consoleListener:fault==='on'?'unavailable':'attached'}))
})

// The real wrapper emits this additive data only from its existing summary,
// after both original closes. These lifecycle mocks are not browser evidence.
async function triggerJourneyFixture(t,{before=()=>{},after=()=>{},close=()=>{},consoleFault=false,gotoFault=false}={}) {
  const logs=[],calls=[],listeners=new Map(),retained={},primary=Error(triggerMarker)
  t.mock.method(console,'log',(...args)=>{calls.push('log');logs.push(args)})
  let httpHandler,closes=0
  const emit=(kind,value)=>listeners.get(kind)?.(value)
  const page={on:(kind,fn)=>{calls.push('on:'+kind);listeners.set(kind,fn);retained[kind]=fn;if(kind==='console'&&consoleFault)throw Error(triggerMarker)},
    off:(kind,fn)=>{calls.push('off:'+kind);assert.equal(listeners.get(kind),fn);listeners.delete(kind)},goto:async()=>{
      calls.push('goto');assert.ok(listeners.has('pageerror'));assert.ok(listeners.has('console'))
      await httpHandler(route(request(origin+freeReviewPath('en'),'GET','document')))
      before(emit)
      if(gotoFault)throw primary
      const denied=route(diagnosticRequest(origin+devStackLookupPath,'POST','fetch',{navigation:false}))
      await httpHandler(denied);assert.deepEqual(denied.log,['abort'])
      after(emit)
    },evaluate:()=>assert.fail('No new browser read or unsafe interaction'),locator:()=>assert.fail('No unsafe interaction')}
  const context={routeWebSocket:async()=>{},route:async(_pattern,fn)=>{httpHandler=fn},addInitScript:async()=>{},newPage:async()=>page,
    close:async()=>{calls.push('close');close(emit,++closes)}}
  let result
  try{await verifyFreeReviewJourney(sourceFor(context),()=>assert.fail('Unsafe caller must not proceed'),'en')}catch(error){result=error}
  assert.ok(result,'Observer never turns an underlying failure into success')
  if(gotoFault)assert.equal(result,primary)
  else{assert.equal(result.code,'ERR_ASSERTION');assert.deepEqual(result.actual,[fatalBoundaryMessage]);assert.deepEqual(result.expected,[])}
  assert.equal(closes,2);assert.equal(logs.length,1);assert.equal(logs[0][0],'SYNTHETIC_FREE_REVIEW_BOUNDARY')
  assert.ok(calls.indexOf('off:console')<calls.indexOf('close'));assert.ok(calls.indexOf('off:pageerror')>calls.lastIndexOf('close'));assert.equal(calls.at(-1),'log')
  assert.equal(listeners.size,0)
  const summary=JSON.parse(logs[0][1]);assert.equal(summary.completed,false);assert.equal(summary.requestCount,0);assert.equal(summary.failureCount,gotoFault?0:1)
  assert.ok(!JSON.stringify(logs).includes(triggerMarker));assert.doesNotMatch(JSON.stringify(logs),/fixture\.invalid|input=secret/)
  return {summary,calls,retained}
}
for(const [family,literal] of [...triggerFamilies,['unclassified',triggerMarker]])test('startup emitted recognized family '+family+' does not excuse denied lookup',async t=>{
  const {summary}=await triggerJourneyFixture(t,{before:emit=>emit('console',triggerConsole(literal+'\n'+triggerMarker))})
  assert.deepEqual(summary.startupDiagnostics,diagnosticSnapshot([['console-error',family]],{consoleListener:'attached',cutoff:'boundary'}))
  assert.equal(summary.firstFatalRequest.endpointCategory,'dev-stack-lookup');assert.equal(summary.pageErrorCount,0)
})
test('startup emitted snapshot excludes post-fatal and cleanup getters while original pageerror count is retained',async t=>{
  let reads=0
  const poison=new Proxy({}, {get:()=>{reads++;throw Error(triggerMarker)}})
  const {summary,retained}=await triggerJourneyFixture(t,{before:emit=>{emit('console',triggerConsole(triggerFamilies[2][1]));emit('pageerror',{message:triggerFamilies[1][1]})},
    after:emit=>{emit('console',poison);emit('pageerror',poison)},close:emit=>{emit('console',poison);emit('pageerror',poison)}})
  assert.deepEqual(summary.startupDiagnostics,diagnosticSnapshot([['console-error','hydration-attribute-mismatch'],['pageerror','hydration-text-mismatch']],{consoleListener:'attached',cutoff:'boundary'}))
  assert.equal(summary.pageErrorCount,4,'Initial, post-fatal and both cleanup page errors retain the original count')
  retained.console(poison);retained.pageerror(poison);assert.equal(reads,0)
})
test('startup emitted getter failure remains unknown without replacing original blocker',async t=>{
  const {summary}=await triggerJourneyFixture(t,{before:emit=>emit('console',{type:()=> 'error',text:()=>{throw Error(triggerMarker)}})})
  assert.deepEqual(summary.startupDiagnostics,diagnosticSnapshot([['console-error','unclassified']],{consoleListener:'attached',cutoff:'boundary',readFailureCount:1}))
})
test('startup emitted partial console registration is detached and preserves the original caller failure',async t=>{
  const {summary}=await triggerJourneyFixture(t,{consoleFault:true,gotoFault:true,before:emit=>emit('console',triggerConsole(triggerMarker))})
  assert.deepEqual(summary.startupDiagnostics,diagnosticSnapshot([['console-error','unclassified']],{cutoff:'cleanup'}))
  assert.equal(summary.firstFatalRequest,undefined)
})
test('startup observer source owns no browser evaluation, additional request, console suppression or success assertion',async()=>{
  const helper=await readFile(new URL('../scripts/helpers/free-review-startup-diagnostics.mjs',import.meta.url),'utf8')
  for(const pattern of [/\.evaluate\s*\(/,/\.args\s*\(/,/\.jsonValue\s*\(/,/\.location\s*\(/,/\.stack\b/,/fetch\s*\(/,/setTimeout\s*\(/,/console\.(?:log|error|warn)\s*\(/,/\bawait\b/])assert.doesNotMatch(helper,pattern)
  const wrapper=await readFile(new URL('../scripts/helpers/free-review-journey-verifier.mjs',import.meta.url),'utf8')
  assert.ok(wrapper.indexOf('startupDiagnostics.attachConsole(page)')<wrapper.indexOf('await page.goto(origin + freeReviewPath(locale)'))
  assert.ok(wrapper.includes("startupDiagnostics.freeze('interaction')"))
  assert.ok(wrapper.indexOf("startupDiagnostics.freeze('interaction')")<wrapper.indexOf('      handler.beginInteraction()'))
  assert.ok(wrapper.includes("pageErrorListener = error => { pageErrors.push('Page error'); startupDiagnostics.observePageError(error) }"))
  assert.ok(wrapper.includes("...(primary ? {startupDiagnostics:startupDiagnostics.snapshot()} : {})"))
})

for(const getter of ['boundary','type','text','message'])test('startup observer recursive '+getter+' callback is bounded without fake slots',()=>{
  let diagnostic,reads=0
  const nested=()=>{reads++;diagnostic.observeConsole(triggerConsole(triggerMarker));diagnostic.observePageError({message:triggerMarker})}
  diagnostic=createFreeReviewStartupDiagnostics(()=>{if(getter==='boundary')nested();return true})
  if(getter==='message')diagnostic.observePageError({get message(){nested();return triggerFamilies[0][1]}})
  else diagnostic.observeConsole({type:()=>{if(getter==='type')nested();return 'error'},text:()=>{if(getter==='text')nested();return triggerFamilies[0][1]}})
  diagnostic.freeze('cleanup')
  assert.deepEqual(diagnostic.snapshot(),diagnosticSnapshot([[getter==='message'?'pageerror':'console-error','hydration-html-mismatch']]))
  assert.equal(reads,getter==='boundary'?3:1,'Nested observers never recursively invoke the predicate or raw getters')
})
for(const getter of ['boundary','type','text','message'])for(const mode of ['failure','freeze'])test('startup observer '+getter+' crosses '+mode+' before commit',()=>{
  let before=true,diagnostic,rawReads=0
  const cross=()=>{if(mode==='failure')before=false;else diagnostic.freeze('cleanup')}
  diagnostic=createFreeReviewStartupDiagnostics(()=>{if(getter==='boundary')cross();return before})
  if(getter==='message')diagnostic.observePageError({get message(){rawReads++;cross();return triggerFamilies[0][1]}})
  else diagnostic.observeConsole({type:()=>{if(getter==='type')cross();return 'error'},text:()=>{rawReads++;if(getter==='text')cross();return triggerFamilies[0][1]}})
  diagnostic.freeze('cleanup')
  assert.equal(rawReads,['text','message'].includes(getter)?1:0)
  assert.deepEqual(diagnostic.snapshot(),diagnosticSnapshot([],{cutoff:mode==='failure'?'boundary':'cleanup'}))
})
test('startup observer eighth-slot reentrancy cannot overflow or reverse order',()=>{
  const diagnostic=createFreeReviewStartupDiagnostics(()=>true)
  for(let i=0;i<7;i++)diagnostic.observeConsole(triggerConsole(triggerMarker))
  diagnostic.observeConsole({type:()=> 'warning',text:()=>{diagnostic.observePageError({get message(){assert.fail('No nested raw read')}});return triggerFamilies[2][1]}})
  let reads=0
  const poison=new Proxy({}, {get:()=>{reads++;throw Error(triggerMarker)}})
  diagnostic.observeConsole(poison);diagnostic.observePageError(poison)
  diagnostic.freeze('cleanup');assert.equal(reads,0)
  assert.deepEqual(diagnostic.snapshot(),diagnosticSnapshot([...Array.from({length:7},()=>['console-error','unclassified']),['console-warning','hydration-attribute-mismatch']],{overflow:true,omittedCallbackCount:2}))
})
for(const before of [undefined,null,'yes',1,Promise.resolve(true)])test('startup observer nonboolean boundary result never reads an event '+String(before),()=>{
  const diagnostic=createFreeReviewStartupDiagnostics(()=>before)
  let reads=0
  diagnostic.observeConsole(new Proxy({}, {get:()=>{reads++;throw Error(triggerMarker)}}))
  assert.equal(reads,0);assert.deepEqual(diagnostic.snapshot(),diagnosticSnapshot([],{cutoff:'unavailable'}))
})


test('startup wrapper freezes before real interaction even when later cleanup fails',async t=>{
  const logs=[];t.mock.method(console,'log',(...args)=>logs.push(args))
  let interaction=false,reads=0
  const fixture=socketTerminalHarness(async count=>{if(count===1)throw Error(triggerMarker)},(emit,retained)=>{
    interaction=true
    const poison=new Proxy({}, {get:()=>{reads++;throw Error(triggerMarker)}})
    emit('console',poison);retained.console(poison)
    emit('pageerror',poison);retained.pageerror(poison)
  })
  await assert.rejects(fixture.run());assert.equal(interaction,true);assert.equal(reads,0)
  assert.equal(fixture.closes,2);assert.equal(logs.length,1)
  const summary=JSON.parse(logs[0][1]);assert.equal(summary.completed,false);assert.equal(summary.requestCount,2)
  assert.deepEqual(summary.startupDiagnostics,diagnosticSnapshot([],{consoleListener:'attached',cutoff:'interaction'}))
  assert.equal(summary.pageErrorCount,2,'Original pageerror counting continues after diagnostic freeze')
  assert.equal(summary.firstFatalRequest,undefined);assert.ok(!JSON.stringify(logs).includes(triggerMarker))
})

function staleConsentFixture({marker,afterPending=()=>{},beforeGrant=()=>{},evaluateResult}={}) {
  const calls=[],failures=[],events=[],domListeners=new Map(),sandbox={
    document:{documentElement:{dataset:{}},addEventListener:(name,fn)=>domListeners.set(name,fn)},navigator:{},
    window:{open:()=>null,addEventListener:(name,fn)=>{if(name==='holistic-house:acquisition')events.push(fn)},gtag:()=>assert.fail('No provider authority')},
    sessionStorage:{getItem:()=>null,setItem:()=>{}},DOMException,
  }
  vm.runInNewContext('('+installFreeReviewProbe.toString()+')()',sandbox)
  if(marker!==undefined)sandbox.document.documentElement.dataset.analyticsConsent=marker
  const effect=realConsentEffect(sandbox)
  const page={evaluate:async fn=>{
    const grant=fn.toString().includes("root.dataset.analyticsConsent = 'granted'")
    calls.push(grant?'grant':'marker')
    if(grant)beforeGrant(sandbox,failures)
    if(evaluateResult!==undefined&&!grant)return evaluateResult
    return vm.runInNewContext('('+fn.toString()+')()',sandbox)
  }}
  // A finite synthetic analogue of the pinned runner's default 5s expect.poll
  // deadline. No real timer/browser/network is executed by this fixture.
  let pollStarts=0
  const expect={poll:(fn,...options)=>{
    pollStarts++
    assert.deepEqual(options,[],'No extended/custom timeout or intervals')
    return {not:{toBe:async value=>{
      for(let i=0;i<3;i++){
        const actual=await fn();calls.push('poll:'+actual)
        if(actual!==value)return
        await afterPending(i,{sandbox,failures,effect,calls})
      }
      throw new Error('Synthetic existing expectation deadline exceeded')
    }}}
  }}
  return {sandbox,page,expect,failures,effect,calls,domListeners,events,get pollStarts(){return pollStarts},run:()=>prepareFreeReviewStaleConsent(page,expect,failures)}
}

test('stale grant follows delayed actual consent effect and precedes audited work without init mutation',async()=>{
  const f=staleConsentFixture({afterPending:(i,{effect,calls})=>{if(i===1){calls.push('actual-effect');effect()}}})
  assert.equal(f.sandbox.document.documentElement.dataset.analyticsConsent,undefined)
  assert.equal(f.domListeners.has('DOMContentLoaded'),false)
  await f.run();f.calls.push('audited-interaction')
  assert.deepEqual(f.calls,['marker','poll:pending','marker','poll:pending','actual-effect','marker','poll:effect-observed','grant','audited-interaction'])
  assert.equal(f.sandbox.document.documentElement.dataset.analyticsConsent,'granted')
  assert.equal(f.events.length,1,'The original pre-navigation event observer remains installed')
  f.events[0]({detail:{event:'unexpected'}});assert.equal(f.sandbox.window.__freeReviewEvents.length,1,'Observation is never event suppression')
})

test('stale grant accepts an already completed real effect without an extra timing heuristic',async()=>{
  const f=staleConsentFixture();f.effect();assert.equal(f.sandbox.document.documentElement.dataset.analyticsConsent,'denied')
  await f.run();assert.deepEqual(f.calls,['marker','poll:effect-observed','grant'])
  assert.equal(f.sandbox.document.documentElement.dataset.analyticsConsent,'granted')
})

for(const marker of [undefined,'granted','unexpected',null])test('missing/wrong consent-effect marker fails explicitly and never grants '+String(marker),async()=>{
  const f=staleConsentFixture({marker})
  await assert.rejects(f.run(),/existing expectation deadline exceeded/)
  assert.equal(f.pollStarts,1,'Only one readiness budget')
  assert.equal(f.calls.filter(value=>value==='marker').length,3);assert.equal(f.calls.includes('grant'),false)
  assert.equal(f.sandbox.document.documentElement.dataset.analyticsConsent,marker)
})

for(const value of [undefined,null,false,'denied','true',1,{},[]])test('nonboolean observation cannot bypass actual consent-effect setup '+String(value),async()=>{
  const f=staleConsentFixture({evaluateResult:value})
  await assert.rejects(f.run(),/existing expectation deadline exceeded/)
  assert.equal(f.calls.includes('grant'),false)
})

test('existing fatal failure precedes marker reads and stale grant',async()=>{
  const f=staleConsentFixture();f.failures.push(fatalBoundaryMessage)
  await assert.rejects(f.run(),error=>{assert.deepEqual(error.actual,[fatalBoundaryMessage]);return true})
  assert.deepEqual(f.calls,[])
})

test('fatal failure while waiting stops polling and remains the original boundary assertion',async()=>{
  const f=staleConsentFixture({afterPending:(_i,{failures})=>failures.push(fatalBoundaryMessage)})
  await assert.rejects(f.run(),error=>{assert.deepEqual(error.actual,[fatalBoundaryMessage]);assert.deepEqual(error.expected,[]);return true})
  assert.deepEqual(f.calls,['marker','poll:pending','poll:blocked']);assert.equal(f.calls.includes('grant'),false)
})

test('marker changed after observation is rejected atomically without a stale grant',async()=>{
  const f=staleConsentFixture({beforeGrant:sandbox=>{sandbox.document.documentElement.dataset.analyticsConsent='changed'}});f.effect()
  await assert.rejects(f.run(),/unchanged real consent-effect marker/)
  assert.equal(f.sandbox.document.documentElement.dataset.analyticsConsent,'changed')
})

test('fatal failure during grant remains blocking before interaction',async()=>{
  const f=staleConsentFixture({beforeGrant:(_sandbox,failures)=>failures.push(fatalBoundaryMessage)});f.effect()
  await assert.rejects(f.run(),error=>{assert.deepEqual(error.actual,[fatalBoundaryMessage]);return true})
})

test('forged matcher success cannot bypass the effect observation',async()=>{
  const f=staleConsentFixture();f.expect.poll=()=>({not:{toBe:async()=>{}}})
  await assert.rejects(f.run(),/Real consent effect must precede/);assert.deepEqual(f.calls,[])
})

function assertConsentMarkerProvenance(layout,probe,consent=actualConsentSource,analytics=actualPublicAnalyticsSource) {
  assert.match(layout,/<html lang=\{lang\}>/)
  assert.doesNotMatch(layout,/data-analytics-consent|analyticsConsent/)
  assert.match(layout,/<AnalyticsConsent\s*\/>/)
  assert.doesNotMatch(probe,/analyticsConsent|data-analytics-consent|DOMContentLoaded/)
  assert.match(analytics,/export const PUBLIC_ANALYTICS_AVAILABLE = false;/)
  assert.match(consent,/document\.documentElement\.dataset\.analyticsConsent = PUBLIC_ANALYTICS_AVAILABLE \? value : "denied"/)
  assert.match(consent,/useEffect\(\(\) => \{\s*applyConsent\(isPublicAnalyticsPath\(pathname\) \? savedConsent\(\) : "denied"\);\s*\}, \[pathname\]\)/)
}

test('pinned SSR/effect provenance rejects forged parser-time fixture or SSR markers',async()=>{
  const layout=await readFile(new URL('../app/layout.tsx',import.meta.url),'utf8'),probe=installFreeReviewProbe.toString()
  assertConsentMarkerProvenance(layout,probe)
  for(const forged of ['denied','granted']) {
    assert.throws(()=>assertConsentMarkerProvenance(layout.replace('<html lang={lang}>','<html lang={lang} data-analytics-consent="'+forged+'">'),probe))
    assert.throws(()=>assertConsentMarkerProvenance(layout,probe+';document.documentElement.dataset.analyticsConsent="'+forged+'"'))
    assert.throws(()=>assertConsentMarkerProvenance(layout,probe+';document.addEventListener("DOMContentLoaded",()=>{})'))
  }
  assert.throws(()=>assertConsentMarkerProvenance(layout.replace('<AnalyticsConsent />',''),probe))
  assert.throws(()=>assertConsentMarkerProvenance(layout,probe,actualConsentSource.replace('  useEffect(() => {\n    applyConsent','  (() => {\n    applyConsent')))
})

test('actual consent effect, not render or init, owns the initial denied marker',()=>{
  const f=staleConsentFixture();assert.equal(f.sandbox.document.documentElement.dataset.analyticsConsent,undefined)
  f.effect();assert.equal(f.sandbox.document.documentElement.dataset.analyticsConsent,'denied')
  assert.equal(f.sandbox.window.__freeReviewEvents.length,0)
})

test('fixture retains stale-granted end assertion and places handshake before all branches',async()=>{
  const source=await readFile(new URL('../scripts/helpers/free-review-journey-verifier.mjs',import.meta.url),'utf8')
  const wrapper=source.slice(source.indexOf('export async function verifyFreeReviewJourney('))
  const marker=wrapper.indexOf('await prepareFreeReviewStaleConsent(page, expect, failures)')
  assert.ok(marker>=0);assert.ok(marker<wrapper.indexOf("startupDiagnostics.freeze('interaction')"));assert.ok(marker<wrapper.indexOf('handler.beginInteraction()'));assert.ok(marker<wrapper.indexOf("if (kind === 'compact')"))
  assert.match(source,/assert\.equal\(state\.staleConsentGranted, true/)
  assert.match(source,/even with stale granted dataset/)
  assert.equal((prepareFreeReviewStaleConsent.toString().match(/expect\.poll\(/g)||[]).length,1)
  assert.doesNotMatch(prepareFreeReviewStaleConsent.toString(),/\.cookie|dispatchEvent|gtag|fetch\(|waitForTimeout|setTimeout|timeout\s*:/)
})

test('actual wrapper never begins audited interactions when the real effect is missing',async t=>{
  const logs=[];t.mock.method(console,'log',(...args)=>logs.push(args))
  let interacted=false
  const fixture=socketTerminalHarness(async()=>{},()=>{interacted=true},false)
  await assert.rejects(fixture.run());assert.equal(interacted,false);assert.equal(fixture.closes,2)
  assert.equal(logs.length,1)
  const summary=JSON.parse(logs[0][1]);assert.equal(summary.completed,false);assert.equal(summary.requestCount,0);assert.equal(summary.failureCount,0)
  assert.equal(summary.startupDiagnostics.cutoff,'cleanup')
})

test('failed stale grant write cannot silently pass the adversarial setup',async()=>{
  const f=staleConsentFixture();f.effect()
  Object.defineProperty(f.sandbox.document.documentElement.dataset,'analyticsConsent',{get:()=> 'denied',set:()=>{},configurable:true})
  await assert.rejects(f.run(),/unchanged real consent-effect marker/)
})


test('actual wrapper rejects loss of the stale-granted adversary before completion',async t=>{
  const logs=[];t.mock.method(console,'log',(...args)=>logs.push(args))
  const fixture=socketTerminalHarness(async()=>{},(_emit,_retained,sandbox)=>{sandbox.document.documentElement.dataset.analyticsConsent='denied'})
  await assert.rejects(fixture.run(),/stale-granted adversary remains active/)
  assert.equal(fixture.closes,2);assert.equal(JSON.parse(logs[0][1]).completed,false)
})

const actualGaSource=await readFile(new URL('../components/ga4-analytics.tsx',import.meta.url),'utf8')
function assertActualStartupAnalyticsHold(publicSource) {
  const f=staleConsentFixture(),effects=[]
  f.sandbox.document.documentElement.dataset.analyticsConsent='granted'
  f.sandbox.window.location={hostname:'holistichouse.vercel.app',origin:'https://holistichouse.vercel.app'}
  f.sandbox.window.dispatchEvent=event=>{for(const listener of f.events)listener(event)}
  f.sandbox.document.createElement=()=>assert.fail('No provider tag construction')
  f.sandbox.document.head={appendChild:()=>assert.fail('No provider tag insertion')}
  const env={document:f.sandbox.document,window:f.sandbox.window,navigator:f.sandbox.navigator,frames:[],fetch:()=>assert.fail('No provider request')}
  const analytics=compileContactModule(publicSource,{},env)
  // Synthetic lexical process binding only; no real environment/config is read.
  const ga=compileContactModule("const process={env:{NEXT_PUBLIC_GA_MEASUREMENT_ID:'G-SYNTHETIC'}};\n"+actualGaSource,{
    react:{useEffect:fn=>effects.push(fn),useRef:value=>({current:value})},
    'next/navigation':{usePathname:()=>'/en/services/free-situation-review'},
    '@/lib/public-analytics':analytics,
  },env)
  assert.equal(ga.Ga4Analytics({nonce:'SYNTHETIC_NONCE'}),null)
  assert.equal(effects.length,1);effects[0]()
  analytics.emitPublicAnalyticsEvent('free_questionnaire_started')
  assert.equal(f.sandbox.window.__freeReviewEvents.length,0)
}
test('actual startup analytics hold remains off under stale grant without a prehydration DOM mutation',()=>{
  assertActualStartupAnalyticsHold(actualPublicAnalyticsSource)
  assert.throws(()=>assertActualStartupAnalyticsHold(actualPublicAnalyticsSource.replace('PUBLIC_ANALYTICS_AVAILABLE = false','PUBLIC_ANALYTICS_AVAILABLE = true')))
})

test('actual acquisition link negative control proves the unchanged observer detects local events',async()=>{
  const f=staleConsentFixture();f.effect();await f.run()
  f.sandbox.window.dispatchEvent=event=>{for(const listener of f.events)listener(event)}
  const source=await readFile(new URL('../components/acquisition-event-link.tsx',import.meta.url),'utf8')
  const env={document:f.sandbox.document,window:f.sandbox.window,navigator:f.sandbox.navigator,frames:[],fetch:()=>assert.fail('No external request')}
  const link=compileContactModule(source,{'next/link':{default:'a'},'react/jsx-runtime':{jsx:(type,props)=>({type,props})}},env)
  const element=link.AcquisitionEventLink({event:'contact_click',href:'#synthetic',children:'Synthetic'})
  element.props.onClick()
  assert.equal(f.sandbox.window.__freeReviewEvents.length,1)
  assert.equal(f.sandbox.window.__freeReviewEvents[0].event,'contact_click')
})

for(const fatal of [false,true])test('poll rejection retains '+(fatal?'fatal boundary':'original operation')+' precedence without granting',async()=>{
  const f=staleConsentFixture(),primary=Error('Synthetic readiness failure')
  f.expect.poll=()=>({not:{toBe:async()=>{if(fatal)f.failures.push(fatalBoundaryMessage);throw primary}}})
  await assert.rejects(f.run(),error=>{if(fatal){assert.deepEqual(error.actual,[fatalBoundaryMessage]);assert.deepEqual(error.expected,[])}else assert.equal(error,primary);return true})
  assert.deepEqual(f.calls,[]);assert.equal(f.sandbox.document.documentElement.dataset.analyticsConsent,undefined)
})
for(const fatal of [false,true])test('setter round-trip rejection retains '+(fatal?'fatal boundary':'original operation')+' precedence',async()=>{
  const f=staleConsentFixture(),primary=Error('Synthetic setter round-trip failure'),evaluate=f.page.evaluate
  f.effect()
  f.page.evaluate=async fn=>{if(fn.toString().includes("root.dataset.analyticsConsent = 'granted'")){if(fatal)f.failures.push(fatalBoundaryMessage);throw primary}return evaluate(fn)}
  await assert.rejects(f.run(),error=>{if(fatal){assert.deepEqual(error.actual,[fatalBoundaryMessage]);assert.deepEqual(error.expected,[])}else assert.equal(error,primary);return true})
  assert.equal(f.sandbox.document.documentElement.dataset.analyticsConsent,'denied')
})
test('fatal arriving at the last polling delay takes precedence over readiness deadline rejection',async()=>{
  const f=staleConsentFixture(),deadline=Error('Synthetic existing expectation deadline exceeded')
  f.expect.poll=fn=>({not:{toBe:async()=>{assert.equal(await fn(),'pending');f.failures.push(fatalBoundaryMessage);throw deadline}}})
  await assert.rejects(f.run(),error=>{assert.deepEqual(error.actual,[fatalBoundaryMessage]);assert.deepEqual(error.expected,[]);return true})
  assert.deepEqual(f.calls,['marker']);assert.equal(f.sandbox.document.documentElement.dataset.analyticsConsent,undefined)
})
