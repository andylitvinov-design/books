import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {consentInitialGate,withConsentBootstrap,installConsentPopupGuard,verifyContactConsentNativeAcceptance} from '../scripts/helpers/contact-consent-native-acceptance.mjs'
const origin='http://127.0.0.1:3000', initial=origin+'/en/services/alchemy-of-soul'
function route(url=initial,method='GET',type='document',responseOptions={}) {
  const calls=[]
  return {calls,request:()=>({url:()=>url,method:()=>method,resourceType:()=>type}),
    fetch:async options=>{calls.push(['fetch',options]);return {url:()=>responseOptions.url||url,status:()=>responseOptions.status||200,dispose:async()=>calls.push(['dispose'])}},
    fulfill:async()=>calls.push(['fulfill']),abort:async()=>calls.push(['abort'])}
}
test('exact local initial GET document is fetched without following redirects',async()=>{
  const r=route(),failures=[];await consentInitialGate(origin,'en',failures,[])(r)
  assert.deepEqual(r.calls,[['fetch',{maxRedirects:0}],['fulfill'],['dispose']]);assert.deepEqual(failures,[])
})
for(const [name,url,method,type] of [
 ['POST',initial,'POST','document'],['API',origin+'/api/service-enquiries','POST','fetch'],
 ['API GET',origin+'/api/app/auth/contact-profile','GET','fetch'],['external','https://example.invalid/','GET','document'],
 ['other page',origin+'/en','GET','document'],['receipt document',origin+'/en/thank-you','GET','document'],['receipt RSC',origin+'/en/thank-you?_rsc=abc','GET','fetch'],['query',initial+'?x=1','GET','document'],
 ['fragment',initial+'#x','GET','document'],['wrong locale',origin+'/ru/services/alchemy-of-soul','GET','document'],
 ['fetch document',initial,'GET','fetch'],['external static','https://example.invalid/_next/static/a.js','GET','script'],
 ['arbitrary static',origin+'/anything.js','GET','script'],['socket-shaped',origin+'/_next/webpack-hmr','GET','websocket'],
]) test('initial gate blocks '+name,async()=>{
 const r=route(url,method,type);await consentInitialGate(origin,'en',[],[])(r);assert.deepEqual(r.calls,[['abort']])
})
for(const opts of [{status:302},{url:'https://example.invalid/'},{status:500}]) test('reject initial response '+JSON.stringify(opts),async()=>{
 const failures=[],r=route(initial,'GET','document',opts);await consentInitialGate(origin,'en',failures,[])(r)
 assert.equal(failures.length,1);assert.ok(!r.calls.some(x=>x[0]==='fulfill'));assert.ok(r.calls.some(x=>x[0]==='dispose'))
})
test('existing exact typed local static reads remain permitted',async()=>{
 const r=route(origin+'/_next/static/chunks/app.js?v=1700000000000','GET','script');await consentInitialGate(origin,'en',[],[])(r)
 assert.deepEqual(r.calls,[['fetch',{maxRedirects:0}],['fulfill'],['dispose']])
})
test('teardown blocks initial and static reads, never exempts writes',async()=>{
 const failures=[],gate=consentInitialGate(origin,'en',failures,[]);gate.beginTeardown()
 for(const r of [route(),route(origin+'/_next/static/a.js','GET','script')]){await gate(r);assert.deepEqual(r.calls,[['abort']])}
 const r=route(initial,'POST');await gate(r);assert.equal(failures.length,1)
})
test('popup spy is inert and counts attempts',()=>{
 const saved=globalThis.window;globalThis.window={__consentReportPopup:async()=>{},open:()=>assert.fail('real popup')}
 try {installConsentPopupGuard();assert.equal(window.open('https://example.invalid'),null);assert.equal(window.__consentPopupAttempts,1)}finally{globalThis.window=saved}
})
for(const failing of ['route','socket','init','run','close']) test('bootstrap closes and preserves '+failing+' failure',async()=>{
 const calls=[];const step=async name=>{calls.push(name);if(name===failing)throw new Error(name)}
 const context={route:()=>step('route'),routeWebSocket:()=>step('socket'),addInitScript:()=>step('init'),exposeBinding:async()=>{},on:()=>{},close:()=>step('close')}
 const gate=()=>{};gate.beginTeardown=()=>calls.push('draining')
 await assert.rejects(withConsentBootstrap(context,gate,()=>step('run')))
 assert.ok(calls.includes('draining'));assert.ok(calls.includes('close'))
 if(failing!=='run'&&failing!=='close')assert.ok(!calls.includes('run'))
})
test('bootstrap drains active reads before closing and retains asynchronous failures',async()=>{
 let tracked,release,closed=false;const pending=new Promise(resolve=>{release=resolve})
 const gate=async()=>{await pending;assert.equal(closed,false);throw new Error('late read')};gate.beginTeardown=()=>release()
 const context={route:async(_,fn)=>{tracked=fn},routeWebSocket:async()=>{},addInitScript:async()=>{},exposeBinding:async()=>{},on:()=>{},close:async()=>{closed=true}}
 await assert.rejects(withConsentBootstrap(context,gate,async()=>{void tracked({})}),/CONSENT_CLEANUP_FAILED/)
 assert.equal(closed,true)
})
function harness({failAt,post=false,popup=false,pageError=false,latePopup=false,latePage=false,latePageError=false}={}) {
 const events=[],contexts=[]
 const browser={newContext:async options=>{
  assert.deepEqual(options,{serviceWorkers:'block',viewport:{width:390,height:844}})
  const id=contexts.length,state={checked:false,focus:'',routes:[],closed:false};contexts.push(state)
  const record=(name,...args)=>{events.push([id,name,...args]);if(failAt===name)throw new Error(name)}
  const loc=(name)=>({name,
   locator:selector=>loc(selector==='..'?'label-parent':selector==='span'?'label':selector.includes('email')?'email':selector.includes('checkbox')?'consent':selector.includes('submit')?'submit':selector.includes('data-contact-order')?'open':selector.includes('data-alchemy-format=')?'format':selector.includes('data-contact-channel]')?'links':'container'),
   click:async()=>{record('click',name);if(name==='label')state.checked=!state.checked},
   fill:async value=>{record('fill',name,value);state.focus='email'},
   evaluate:async fn=>{
    if(String(fn).includes('getBoundingClientRect'))return {inside:true,outlined:true}
    return state.focus===name
   },
   scrollIntoViewIfNeeded:async()=>record('scroll',name),boundingBox:async()=>({x:40,y:400,width:19,height:19})
  })
  const page={locator:()=>loc('pricing'),on:(name,fn)=>{state.pageError=fn;if(pageError&&name==='pageerror')fn(new Error('PRIVATE_MARKER'))},
   goto:async()=>{record('goto');assert.ok(state.routes.length);assert.ok(state.socket);assert.ok(state.init)},
   context:()=>context,evaluate:async fn=>{
    const str=String(fn)
    if(str.includes('window.__consentPopupAttempts'))return popup?1:0
    if(str.includes('window.__alchemyFixture.opens'))return []
   },
   keyboard:{press:async key=>{record('key',key);if(key==='Tab')state.focus='consent';if(key==='Shift+Tab')state.focus='previous';if(key==='Space')state.checked=!state.checked}},
   mouse:{move:async(x,y)=>record('move',x,y),down:async()=>record('down'),up:async()=>record('up')}
  }
  const context={route:async(_,fn)=>{record('route');state.routes.push(fn);if(post&&state.routes.length===1)await fn(route(origin+'/api/service-enquiries','POST','fetch'))},
    routeWebSocket:async(_,fn)=>{record('socket');state.socket=true;let closed=false;await fn({close:()=>{closed=true}});assert.ok(closed)},
    addInitScript:async fn=>{record('init');assert.equal(fn,installConsentPopupGuard);state.init=true},
    exposeBinding:async(name,fn)=>{state.binding=fn},on:(name,fn)=>{state.pageHandler=fn},newPage:async()=>{record('newPage');state.pageHandler(page);return page},close:async()=>{record('close');if(latePopup)state.binding();if(latePage)state.pageHandler({close:async()=>{}});if(latePageError)state.pageError(new Error('PRIVATE_MARKER'));state.closed=true}}
  return context
 }}
 function expect(locator) {
  return {toBeFocused:async()=>assert.equal(contexts.at(-1).focus,locator.name),
   toBeVisible:async()=>{},toBeChecked:async()=>assert.equal(contexts.at(-1).checked,true),
   toBeEnabled:async()=>assert.equal(contexts.at(-1).checked,true),toBeDisabled:async()=>assert.equal(contexts.at(-1).checked,false),
   toHaveCount:async n=>assert.equal(n,0),not:{toBeChecked:async()=>assert.equal(contexts.at(-1).checked,false),toBeFocused:async()=>assert.notEqual(contexts.at(-1).focus,locator.name)}}
 }
 return {events,contexts,expect,source:{url:()=>initial,viewportSize:()=>({width:390,height:844}),context:()=>({browser:()=>browser})}}
}
test('executes three fresh guarded contexts with native keyboard, label and canceled drag only',async()=>{
 const h=harness();await verifyContactConsentNativeAcceptance(h.source,h.expect,'en')
 assert.equal(h.contexts.length,3);assert.ok(h.contexts.every(c=>c.closed&&c.routes.length===1))
 const actions=id=>h.events.filter(e=>e[0]===id).map(e=>e.slice(1))
 assert.deepEqual(actions(0).filter(e=>e[0]==='key'),[['key','Tab'],['key','Space'],['key','Space'],['key','Shift+Tab']])
 assert.deepEqual(actions(1).filter(e=>e[0]==='click'),[['click','format'],['click','open'],['click','label'],['click','label']])
 assert.deepEqual(actions(2).filter(e=>['move','down','up'].includes(e[0])),[['move',49.5,409.5],['down'],['move',1,1],['up']])
 assert.ok(!h.events.some(e=>e[1]==='click'&&['submit','consent'].includes(e[2])))
 for(let i=0;i<3;i++)assert.ok(actions(i).findIndex(e=>e[0]==='route')<actions(i).findIndex(e=>e[0]==='newPage'))
})
for(const failAt of ['newPage','goto','fill','key','down'])test('native scenario failure '+failAt+' closes every created context',async()=>{
 const h=harness({failAt});await assert.rejects(verifyContactConsentNativeAcceptance(h.source,h.expect,'en'),/CONSENT_NATIVE_ACCEPTANCE_FAILED/);assert.ok(h.contexts.every(c=>c.closed))
})
for(const options of [{post:true},{popup:true},{pageError:true}])test('native scenario rejects '+JSON.stringify(options),async()=>{
 const h=harness(options);await assert.rejects(verifyContactConsentNativeAcceptance(h.source,h.expect,'en'));assert.ok(h.contexts.every(c=>c.closed))
})
test('original pointer acceptance keeps exact native check and no new helper invocation',()=>{
 const original=readFileSync(new URL('../scripts/helpers/alchemy-enquiry-journey-verifier.mjs',import.meta.url),'utf8')
 assert.match(original,/assert.equal\(receipt.count,0\)\s+await consent.check\(\)\s+return \{contact,consent,submit\}/)
 assert.ok(!original.includes('verifyContactConsentNativeAcceptance'))
})
test('receipt path cannot hide an unexpected mutation',async()=>{
 const failures=[],r=route(origin+'/en/thank-you','POST','document');await consentInitialGate(origin,'en',failures,[])(r)
 assert.deepEqual(r.calls,[['abort']]);assert.equal(failures.length,1)
})

for(const options of [{latePopup:true},{latePage:true},{latePageError:true}])test('rejects attempt during terminal close '+JSON.stringify(options),async()=>{
 const h=harness(options);await assert.rejects(verifyContactConsentNativeAcceptance(h.source,h.expect,'en'),/CONSENT_NATIVE_ACCEPTANCE_FAILED/)
 assert.ok(h.contexts.every(c=>c.closed))
})
test('same consent-only gate rejects receipt during every phase and stops initial document after load',async()=>{
 const gate=consentInitialGate(origin,'en',[],[])
 for(const afterLoad of [false,true]) {
  if(afterLoad)gate.endInitialDocument()
  for(const [url,type] of [[origin+'/en/thank-you','document'],[origin+'/en/thank-you?_rsc=abc','fetch']]) {
   const r=route(url,'GET',type);await gate(r);assert.deepEqual(r.calls,[['abort']])
  }
 }
 const r=route();await gate(r);assert.deepEqual(r.calls,[['abort']])
})
const marker='PRIVATE_MARKER https://example.invalid/?contact=secret@example.invalid'
for(const kind of ['redirect','fetch','static'])test('route failures redact '+kind,async()=>{
 const failures=[],r=route(kind==='static'?origin+'/_next/static/a.js':initial,'GET',kind==='static'?'script':'document',{url:marker})
 if(kind==='fetch')r.fetch=async()=>{throw new Error(marker)}
 await consentInitialGate(origin,'en',failures,[])(r)
 assert.ok(failures.length);assert.ok(!JSON.stringify(failures).includes('PRIVATE_MARKER'))
 assert.ok(!JSON.stringify(failures).includes('example.invalid'))
})
for(const phase of ['route','socket','binding','init','run','close'])test('redacts '+phase+' exception without raw cause or aggregate',async()=>{
 const fail=name=>{if(name===phase)throw new Error(marker)}
 const context={route:async()=>fail('route'),routeWebSocket:async()=>fail('socket'),exposeBinding:async()=>fail('binding'),on:()=>{},addInitScript:async()=>fail('init'),close:async()=>fail('close')}
 const gate=()=>{};gate.beginTeardown=()=>{}
 await assert.rejects(withConsentBootstrap(context,gate,()=>fail('run')),error=>{
  assert.ok(!String(error.stack).includes(marker));assert.equal(error.cause,undefined);assert.equal(error.errors,undefined);assert.match(error.message,/^CONSENT_/);return true
 })
})
test('public entry redacts malformed source URL before context exists',async()=>{
 await assert.rejects(verifyContactConsentNativeAcceptance({url:()=>marker},()=>{},'en'),error=>{
 assert.equal(error.message,'CONSENT_NATIVE_ACCEPTANCE_FAILED');assert.ok(!error.stack.includes(marker));return true
 })
})

test('socket close callback and terminal error both redact asynchronous rejection',async()=>{
 let socketHandler
 const context={route:async()=>{},routeWebSocket:async(_,fn)=>{socketHandler=fn},exposeBinding:async()=>{},on:()=>{},addInitScript:async()=>{},close:async()=>{}}
 const gate=()=>{};gate.beginTeardown=()=>{}
 await assert.rejects(withConsentBootstrap(context,gate,async()=>{
  await assert.rejects(socketHandler({close:async()=>{throw new Error(marker)}}),error=>{
   assert.equal(error.message,'CONSENT_SOCKET_CLOSE_FAILED');assert.ok(!error.stack.includes(marker));assert.equal(error.cause,undefined);return true
  })
 }),/CONSENT_CLEANUP_FAILED/)
})
test('popup binding rejection does not create an unhandled browser rejection',async()=>{
 const saved=globalThis.window;let reports=0
 globalThis.window={__consentReportPopup:async()=>{reports++;throw new Error(marker)}}
 try {installConsentPopupGuard();assert.equal(window.open(),null);await Promise.resolve();assert.equal(reports,1);assert.equal(window.__consentPopupAttempts,1)}finally{globalThis.window=saved}
})
