import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import vm from 'node:vm'
import {freeReviewOrigin, freeReviewPath, freeReviewService, freeReviewMarkers, assertFreeReviewBody, syntheticFreeReviewReceipt, freeReviewRequestGate, assertFreeReviewLink, installFreeReviewProbe, freeReviewInitScript, withFreeReviewIsolation, freeReviewSocketBoundary, verifyFreeReviewJourney, FREE_REVIEW_CONTACT, FREE_REVIEW_REFERENCE} from '../scripts/helpers/free-review-journey-verifier.mjs'

const origin = 'http://127.0.0.1:3100'
const body = (locale='en', kind='compact', channel='whatsapp') => JSON.stringify({operationId:'27d6bba7-fede-49b3-90d8-c655b72202fd', serviceTitle:freeReviewService(locale, kind), description:kind === 'drawing' ? '' : 'Preferred reply channel: ' + (channel === 'whatsapp' ? 'WhatsApp' : 'Telegram'), sourcePath:freeReviewPath(locale), locale, contact:{displayName:'', email:FREE_REVIEW_CONTACT, phone:''}, contactConsent:true, website:''})
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
  assert.throws(() => assertFreeReviewBody(body('en','compact','telegram'),'en','compact','whatsapp'))
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
for (const alteration of [raw => raw+' ',raw => raw.replace('27d6bba7','17d6bba7'),raw => raw.replace('WhatsApp','Telegram')]) test('immutable retry rejects bytes, UUID and channel drift', async () => {
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
  assert.equal(sandbox.document.documentElement.dataset.analyticsConsent,'granted')
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

// A lifecycle-only mock reaches the real wrapper's successful terminal path.
// Component/DOM behavior remains covered separately; this is not browser proof.
function socketTerminalHarness(onClose=async()=>{}) {
  class Store{constructor(){this.values=new Map()}getItem(key){return this.values.get(key)??null}setItem(key,value){this.values.set(key,String(value))}}
  const sessionStorage=new Store(),sandbox={Storage:Store,sessionStorage,DOMException,navigator:{},document:{documentElement:{dataset:{}},addEventListener:()=>{}},window:{addEventListener:()=>{},location:{href:origin+freeReviewPath('en')}}}
  let httpHandler,socketHandler,initScript,clicks=0,closes=0
  const locator=selector=>({
    locator,getByRole:()=>locator('role'),scrollIntoViewIfNeeded:async()=>{},evaluate:async()=>false,
    check:async()=>{},uncheck:async()=>{},fill:async()=>{},
    getAttribute:async name=>name==='rel'?'noopener noreferrer':href('en','compact',selector.includes('telegram')?'telegram':'whatsapp'),
    click:async()=>{
      if(!selector.startsWith('button[data-compact-channel='))return
      clicks++;if(clicks<3)return
      const popup=sandbox.window.open('about:blank','_blank');popup.opener=null
      const r=route(request());r.fulfill=async response=>{
        if(response.status===503)popup.close()
        else {sessionStorage.setItem('hh-service-enquiry-receipt:v1',JSON.stringify({createdAt:123,referenceCode:FREE_REVIEW_REFERENCE}));popup.location.replace(href('en','compact','whatsapp'))}
      }
      await httpHandler(r)
    },
  })
  const page={url:()=>origin+freeReviewPath('en'),locator,on:()=>{},goto:async()=>{
    await httpHandler(route(request(origin+freeReviewPath('en'),'GET','document')))
    vm.runInNewContext(initScript.content,sandbox)
  },evaluate:async(fn,arg)=>structuredClone(vm.runInNewContext('('+fn.toString()+')',sandbox)(arg))}
  const context={routeWebSocket:async(_pattern,fn)=>{socketHandler=fn},route:async(_pattern,fn)=>{httpHandler=fn},addInitScript:async script=>{initScript=script},newPage:async()=>page,close:async()=>onClose(++closes,socketHandler)}
  const assertions=new Proxy({}, {get:(_target,key)=>key==='not'?assertions:async()=>{}})
  const expect=()=>assertions
  expect.poll=fn=>({toBe:async value=>assert.equal(await fn(),value),toEqual:async value=>assert.deepEqual(await fn(),value)})
  return {run:()=>verifyFreeReviewJourney(sourceFor(context),expect,'en'),get closes(){return closes}}
}
test('socket terminal lifecycle mock completes only after both closes',async t=>{
  const logs=[];t.mock.method(console,'log',(...args)=>logs.push(args))
  const fixture=socketTerminalHarness();await fixture.run()
  assert.equal(fixture.closes,2);assert.equal(JSON.parse(logs.at(-1)[1]).completed,true)
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
  for(const call of ["{kind:'compact'}","{kind:'compact',channel:'telegram',denyReceiptStorage:true}","{kind:'drawing'}","{kind:'drawing',denyReceiptStorage:true,output}"]) assert.ok(main.includes('verifyFreeReviewJourney(publicPage,expect,locale,'+call+')'))
  assert.match(main,/assertPublicViewportFits\(publicPage,locale\+'\/free-review\/'\+width\)/)
  assert.match(main,/width===390\|\|width===1280/)
  assert.doesNotMatch(main,/\[data-free-quick-request\]|openContactChannelChooser\(ready|openRegisteredContactChannelChooser\(ready/)
  assert.match(helper,/free-review-\$\{locale\}-ready-region-390\.png/);assert.match(helper,/free-review-\$\{locale\}-prepared-390\.png/)
  assert.match(helper,/await expect\(ready\)\.toBeFocused\(\)/)
  assert.match(helper,/Temporary analytics hold emits no acquisition event/)
  assert.match(helper,/await expect\(legacy\)\.toHaveAttribute\('href', `\/\$\{locale\}\/coaching\/intake`\)/)
  assert.match(landing,/data-optional-written-review/);assert.match(landing,/<FreeSituationReviewForm locale=\{locale\} \/>/)
  assert.match(drawing,/<ContactChannelChooser/);assert.doesNotMatch(drawing,/stayAfterSave|localStorage|sessionStorage|indexedDB|fetch\(|sendBeacon|FileReader/)
  assert.match(helper,/hypnotherapyRequestGate/);assert.match(helper,/alchemyRequestGate/);assert.match(helper,/withHypnotherapyIsolation/)
  assert.match(helper,/routeWebSocket\('\*\*\/\*', sockets.handler\)/)
  assert.doesNotMatch(helper,/route\.continue\(|route\.fallback\(|unroute\(|context\.request|force:true|waitForTimeout|timeout:/)
  const workflow=await read('.github/workflows/hh-app-r1.yml')
  assert.match(workflow,/node --test .*tests\/free-review-journey-verifier\.test\.mjs .*tests\/free-review-component-contract\.test\.mjs/)
  // This test reads text; never imports/executes the admin-initializing main script.
})
