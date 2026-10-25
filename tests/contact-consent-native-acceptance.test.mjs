import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import vm from 'node:vm'
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
function harness({failAt,post=false,popup=false,pageError=false,latePopup=false,latePage=false,latePageError=false,latePost=false,lateRouteError=false,lateSocketError=false,latePageCloseError=false,createError=false,stuckTab=false,visible={inside:true,outlined:true},keyboard={sampled:false},readVisibility}={}) {
 const events=[],contexts=[]
 const browser={newContext:async options=>{
  if(createError)throw new Error(marker)
  assert.deepEqual(options,{serviceWorkers:'block',viewport:{width:390,height:844}})
  const id=contexts.length,state={checked:false,focus:'',routes:[],closed:false};contexts.push(state)
  const record=(name,...args)=>{
   events.push([id,name,...args])
   const occurrence=events.filter(event=>event[0]===id&&event[1]===name&&JSON.stringify(event.slice(2))===JSON.stringify(args)).length
   if(failAt===name||(typeof failAt==='function'&&failAt({id,name,args,occurrence})))throw new AggregateError([new Error(marker)],marker,{cause:new Error(marker)})
  }
  const loc=(name)=>({name,
   locator:selector=>loc(selector==='..'?'label-parent':selector==='span'?'label':selector.includes('email')?'email':selector.includes('checkbox')?'consent':selector.includes('submit')?'submit':selector.includes('data-contact-order')?'open':selector.includes('data-alchemy-format=')?'format':selector.includes('data-contact-channel]')?'links':'container'),
   click:async()=>{record('click',name);if(name==='label')state.checked=!state.checked},
   fill:async value=>{record('fill',name,value);state.focus='email'},
   evaluate:async fn=>{
    record('evaluate',name,String(fn).includes('getBoundingClientRect')?'visibility':'focus')
    if(String(fn).includes('getBoundingClientRect'))return readVisibility?readVisibility(fn):{visible,keyboard}
    return state.focus===name
   },
   scrollIntoViewIfNeeded:async()=>record('scroll',name),boundingBox:async()=>{record('bounds',name);return {x:40,y:400,width:19,height:19}}
  })
  const page={locator:()=>loc('pricing'),on:(name,fn)=>{state.pageError=fn;if(pageError&&name==='pageerror')fn(new Error('PRIVATE_MARKER'))},
   goto:async()=>{record('goto');assert.ok(state.routes.length);assert.ok(state.socket);assert.ok(state.init)},
   context:()=>context,evaluate:async fn=>{
    const str=String(fn)
    record('page-evaluate')
    if(str.includes('window.__consentPopupAttempts'))return popup?1:0
    if(str.includes('window.__alchemyFixture.opens'))return []
   },
   keyboard:{press:async key=>{record('key',key);if(key==='Tab'&&!stuckTab)state.focus='consent';if(key==='Shift+Tab')state.focus='previous';if(key==='Space')state.checked=!state.checked}},
   mouse:{move:async(x,y)=>record('move',x,y),down:async()=>record('down'),up:async()=>record('up')}
  }
  const context={route:async(_,fn)=>{record('route');state.routes.push(fn);if(post&&state.routes.length===1)await fn(route(origin+'/api/service-enquiries','POST','fetch'))},
    routeWebSocket:async(_,fn)=>{record('socket');state.socket=true;state.socketHandler=fn;let closed=false;await fn({close:()=>{closed=true}});assert.ok(closed)},
    addInitScript:async fn=>{record('init');assert.equal(fn,installConsentPopupGuard);state.init=true},
    exposeBinding:async(name,fn)=>{record('binding');state.binding=fn},on:(name,fn)=>{record('pages');state.pageHandler=fn},newPage:async()=>{record('newPage');state.pageHandler(page);return page},close:async()=>{record('close');if(latePopup)state.binding();if(latePage||latePageCloseError)state.pageHandler({close:async()=>{if(latePageCloseError)throw new Error(marker)}});if(latePost)await state.routes[0](route(origin+'/api/service-enquiries','POST','fetch'));if(lateRouteError)void state.routes[0]({request:()=>{throw new Error(marker)}});if(lateSocketError)void state.socketHandler({close:async()=>{throw new Error(marker)}});if(latePageError)state.pageError(new Error('PRIVATE_MARKER'));state.closed=true}}
  return context
 }}
 function expect(locator) {
  const check=(name,run)=>async(...values)=>{
   const state=contexts.at(-1),id=contexts.length-1,args=[locator.name,name]
   events.push([id,'assert',...args])
   const occurrence=events.filter(event=>event[0]===id&&event[1]==='assert'&&event[2]===locator.name&&event[3]===name).length
   if(typeof failAt==='function'&&failAt({id,name:'assert',args,occurrence}))throw new Error(marker)
   run(state,...values)
  }
  return {toBeFocused:check('focused',state=>assert.equal(state.focus,locator.name)),
   toBeVisible:check('visible',()=>{}),toBeChecked:check('checked',state=>assert.equal(state.checked,true)),
   toBeEnabled:check('enabled',state=>assert.equal(state.checked,true)),toBeDisabled:check('disabled',state=>assert.equal(state.checked,false)),
   toHaveCount:check('count',(_,n)=>assert.equal(n,0)),not:{toBeChecked:check('not-checked',state=>assert.equal(state.checked,false)),toBeFocused:check('not-focused',state=>assert.notEqual(state.focus,locator.name))}}
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
 assert.equal(error.message,'CONSENT_NATIVE_ACCEPTANCE_FAILED mode=startup phase=origin cleanup=none boundary=none');assert.ok(!error.stack.includes(marker));return true
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

const modes=['keyboard','label','canceled-pointer']
const completed=mode=>`CONSENT_NATIVE_ACCEPTANCE_COMPLETED mode=${mode} phase=complete cleanup=none boundary=none`
function captureDiagnostics(t) {
 const messages=[]
 t.mock.method(console,'info',(...args)=>messages.push(args))
 return messages
}
function assertPrivateDataExcluded(error,messages) {
 const output=String(error?.stack||'')+JSON.stringify(error)+JSON.stringify(messages)
 for(const privateValue of ['PRIVATE_MARKER','https://example.invalid','secret@example.invalid','alchemy-browser-fixture@example.invalid'])assert.ok(!output.includes(privateValue))
 if(error){assert.equal(error.cause,undefined);assert.equal(error.errors,undefined);assert.equal(error.constructor,Error)}
}
const event=(id,name,arg,occurrence=1)=>value=>value.id===id&&value.name===name&&(arg===undefined||value.args[0]===arg)&&value.occurrence===occurrence
const assertion=(id,locator,kind,occurrence=1)=>value=>value.id===id&&value.name==='assert'&&value.args[0]===locator&&value.args[1]===kind&&value.occurrence===occurrence
async function expectDiagnosticFailure(t,options,{mode='keyboard',phase,cleanup='none',boundary='none'}={}) {
 const messages=captureDiagnostics(t),h=harness(options)
 await assert.rejects(verifyContactConsentNativeAcceptance(h.source,h.expect,'en'),error=>{
  const keyboard=phase==='keyboard-visible'?` keyboard=${JSON.stringify({visibilityPassed:!options.failAt,sampled:false})}`:''
  assert.equal(error.message,`CONSENT_NATIVE_ACCEPTANCE_FAILED mode=${mode} phase=${phase} cleanup=${cleanup} boundary=${boundary}${keyboard}`)
  assertPrivateDataExcluded(error,messages)
  return true
 })
 assert.deepEqual(messages,modes.slice(0,modes.indexOf(mode)).map(mode=>[completed(mode)]))
 assert.ok(h.contexts.every((_,id)=>h.events.some(e=>e[0]===id&&e[1]==='close')))
 return h
}
test('emits one fixed completion per mode only after its context is closed',async t=>{
 const messages=captureDiagnostics(t),h=harness()
 t.mock.method(console,'info',message=>{
  assert.ok(h.contexts.at(-1).closed)
  messages.push([message])
 })
 await verifyContactConsentNativeAcceptance(h.source,h.expect,'en')
 assert.deepEqual(messages,modes.map(mode=>[completed(mode)]))
 assertPrivateDataExcluded(undefined,messages)
})
for(const [name,options,expected] of [
 ['context creation',{createError:true},{phase:'context'}],
 ...[['route','bootstrap-route'],['socket','bootstrap-socket'],['binding','bootstrap-binding'],['pages','bootstrap-pages'],['init','bootstrap-init'],['newPage','page'],['goto','navigation'],['fill','contact-fill']].map(([name,phase])=>[name,{failAt:name},{phase}]),
 ['format selection',{failAt:event(0,'click','format')},{phase:'format'}],
 ['chooser opening',{failAt:event(0,'click','open')},{phase:'open'}],
 ['initial unchecked',{failAt:assertion(0,'consent','not-checked')},{phase:'initial-state'}],
 ['natural email focus',{failAt:assertion(0,'email','focused')},{phase:'keyboard-focus'}],
 ['Tab key',{failAt:event(0,'key','Tab')},{phase:'keyboard-tab'}],
 ['Tab limit',{stuckTab:true},{phase:'keyboard-tab'}],
 ['visibility assertion',{failAt:assertion(0,'consent','visible')},{phase:'keyboard-visible'}],
 ['viewport containment',{visible:{inside:false,outlined:true}},{phase:'keyboard-visible'}],
 ['focus outline',{visible:{inside:true,outlined:false}},{phase:'keyboard-visible'}],
 ['private DOM-derived values',{visible:{inside:marker,outlined:marker}},{phase:'keyboard-visible'}],
 ['Space on',{failAt:event(0,'key','Space')},{phase:'keyboard-space-on'}],
 ['Space off',{failAt:event(0,'key','Space',2)},{phase:'keyboard-space-off'}],
 ['Shift Tab',{failAt:event(0,'key','Shift+Tab')},{phase:'keyboard-shift-tab'}],
 ['label on',{failAt:event(1,'click','label')},{mode:'label',phase:'label-on'}],
 ['label off',{failAt:event(1,'click','label',2)},{mode:'label',phase:'label-off'}],
 ['canceled geometry',{failAt:event(2,'scroll','consent')},{mode:'canceled-pointer',phase:'canceled-geometry'}],
 ['canceled pointer down',{failAt:event(2,'down')},{mode:'canceled-pointer',phase:'canceled-down'}],
 ['canceled drag',{failAt:event(2,'move',1)},{mode:'canceled-pointer',phase:'canceled-drag'}],
 ['canceled release',{failAt:event(2,'up')},{mode:'canceled-pointer',phase:'canceled-up'}],
 ['canceled unchecked',{failAt:assertion(2,'consent','not-checked',2)},{mode:'canceled-pointer',phase:'canceled-state'}],
 ['terminal disabled',{failAt:assertion(0,'submit','disabled',2)},{phase:'terminal-submit'}],
 ['terminal links',{failAt:assertion(0,'links','count')},{phase:'terminal-links'}],
 ['terminal popup',{popup:true},{phase:'terminal-popup'}],
 ['terminal route failure',{post:true},{phase:'terminal-boundary'}],
 ['terminal pageerror',{pageError:true},{phase:'terminal-page-errors'}],
 ['late pageerror',{latePageError:true},{phase:'late-page-errors'}],
 ['late write',{latePost:true},{phase:'late-boundary'}],
 ['late popup binding',{latePopup:true},{phase:'cleanup-terminal',boundary:'popup'}],
 ['late popup page',{latePage:true},{phase:'cleanup-terminal',boundary:'popup'}],
 ['late popup close rejection',{latePageCloseError:true},{phase:'cleanup-terminal',boundary:'popup-close'}],
 ['late route rejection',{lateRouteError:true},{phase:'cleanup-terminal',boundary:'async-route'}],
 ['late socket rejection',{lateSocketError:true},{phase:'cleanup-terminal',boundary:'socket-close'}],
 ['cleanup only',{failAt:'close'},{phase:'cleanup-close',cleanup:'cleanup-close'}],
 ['primary plus cleanup',{failAt:step=>event(0,'key','Tab')(step)||step.name==='close'},{phase:'keyboard-tab',cleanup:'cleanup-close'}],
 ['primary plus late popup',{failAt:event(0,'key','Tab'),latePopup:true},{phase:'keyboard-tab',boundary:'popup'}],
]) test('fixed diagnostic identifies '+name+' without private error data',async t=>{
 const h=await expectDiagnosticFailure(t,options,expected)
 if(name==='Tab limit')assert.equal(h.events.filter(e=>e[1]==='key'&&e[2]==='Tab').length,12)
})
test('invalid source and locale emit startup-only safe diagnostics',async t=>{
 const messages=captureDiagnostics(t)
 for(const [source,locale] of [[{url:()=>marker},'en'],[harness().source,marker],[{url:()=>{throw new AggregateError([new Error(marker)],marker)}},'en']]) {
  await assert.rejects(verifyContactConsentNativeAcceptance(source,()=>{},locale),error=>{
   assert.equal(error.message,'CONSENT_NATIVE_ACCEPTANCE_FAILED mode=startup phase=origin cleanup=none boundary=none')
   assertPrivateDataExcluded(error,messages);return true
  })
 }
 assert.deepEqual(messages,[])
})
test('cleanup-stop failure remains safe and still closes and drains',async()=>{
 const diagnostic={mode:'keyboard',phase:'context',failedPhase:null,cleanup:'none',boundary:'none'},calls=[]
 const gate=()=>{};gate.beginTeardown=()=>{calls.push('stop');throw new Error(marker)}
 const context={route:async()=>{},routeWebSocket:async()=>{},exposeBinding:async()=>{},on:()=>{},addInitScript:async()=>{},close:async()=>{calls.push('close')}}
 await assert.rejects(withConsentBootstrap(context,gate,async()=>{},diagnostic),error=>{
  assert.equal(error.message,'CONSENT_CLEANUP_FAILED');assertPrivateDataExcluded(error,[]);return true
 })
 assert.deepEqual(calls,['stop','close'])
 assert.equal(diagnostic.failedPhase,'cleanup-stop');assert.equal(diagnostic.cleanup,'cleanup-stop')
 assert.equal(diagnostic.phase,'cleanup-terminal')
})

test('throwing completion logger does not stop any successful native mode',async t=>{
 const messages=[],h=harness()
 t.mock.method(console,'info',message=>{messages.push([message]);throw new Error(marker)})
 await verifyContactConsentNativeAcceptance(h.source,h.expect,'en')
 assert.equal(h.contexts.length,3)
 assert.ok(h.contexts.every(context=>context.closed))
 assert.deepEqual(messages,modes.map(mode=>[completed(mode)]))
 assertPrivateDataExcluded(undefined,messages)
})
for(const [name,failAt,phase,cleanup] of [
 ['primary action',event(1,'click','label',2),'label-off','none'],
 ['bootstrap guard',event(1,'route'),'bootstrap-route','none'],
 ['cleanup',event(1,'close'),'cleanup-close','cleanup-close'],
])test('throwing completion logger preserves a later '+name+' failure',async t=>{
 const messages=[],h=harness({failAt})
 t.mock.method(console,'info',message=>{messages.push([message]);throw new Error(marker)})
 await assert.rejects(verifyContactConsentNativeAcceptance(h.source,h.expect,'en'),error=>{
  assert.equal(error.message,`CONSENT_NATIVE_ACCEPTANCE_FAILED mode=label phase=${phase} cleanup=${cleanup} boundary=none`)
  assertPrivateDataExcluded(error,messages)
  return true
 })
 assert.equal(h.contexts.length,2)
 assert.deepEqual(messages,[[completed('keyboard')]])
 assert.ok(h.contexts.every((_,id)=>h.events.some(event=>event[0]===id&&event[1]==='close')))
})

// Execute the actual browser callback without launching a browser. This proves
// diagnostic reads/redaction, not Chromium scrolling or accessibility acceptance.
function keyboardFixture({rect={left:41,top:655,right:60,bottom:674},outlineStyle='solid',outlineWidth='3px',outlineOffset='2px',focused=true,focusVisible=true,rootSmooth=true,diagnosticError=false,geometryError=false}={}) {
 const reads=[]
 const checkbox={getBoundingClientRect:()=>{reads.push('rect');if(geometryError)throw new Error(marker);return rect},matches:selector=>{reads.push('matches');assert.equal(selector,':focus-visible');if(diagnosticError)throw new Error(marker);return focusVisible}}
 for(const key of ['value','textContent','innerHTML','outerHTML','id','name','href'])Object.defineProperty(checkbox,key,{get(){assert.fail('private DOM read')}})
 for(const key of ['focus','click','check','scrollIntoView','dispatchEvent','setAttribute','addEventListener'])Object.defineProperty(checkbox,key,{get(){assert.fail('active DOM operation')}})
 const document={activeElement:focused?checkbox:{},documentElement:{}}
 const sandbox={node:checkbox,document,innerWidth:390,innerHeight:844,scrollX:0,scrollY:4534,
  getComputedStyle:node=>{reads.push(node===checkbox?'style':'root-style');assert.ok(node===checkbox||node===document.documentElement);return node===checkbox?{outlineStyle,outlineWidth,outlineOffset}:{scrollBehavior:rootSmooth?'smooth':'auto'}}}
 const evaluate=fn=>{
  const result=vm.runInNewContext(`(${fn.toString()})(node)`,sandbox)
  return {visible:{inside:result.visible.inside,outlined:result.visible.outlined},keyboard:result.keyboard}
 }
 return {evaluate,reads}
}
async function keyboardFailure(t,options) {
 const messages=captureDiagnostics(t),h=harness(options)
 let diagnostic
 await assert.rejects(verifyContactConsentNativeAcceptance(h.source,h.expect,'en'),error=>{
  assert.match(error.message,/^CONSENT_NATIVE_ACCEPTANCE_FAILED mode=keyboard phase=keyboard-visible cleanup=none boundary=none keyboard=/)
  assertPrivateDataExcluded(error,messages)
  diagnostic=JSON.parse(error.message.split(' keyboard=')[1])
  assert.ok(error.message.length<700)
  return true
 })
 assert.deepEqual(messages,[])
 assert.equal(h.events.filter(e=>e[1]==='evaluate'&&e[3]==='visibility').length,options.failAt?0:1)
 assert.deepEqual(h.events.filter(e=>e[1]==='key').map(e=>e[2]),['Tab'])
 assert.ok(h.contexts.every(c=>c.closed))
 const check=data=>{for(const value of Object.values(data)){if(Array.isArray(value))check(value);else assert.ok(typeof value==='boolean'||typeof value==='number'&&Number.isFinite(value)&&Math.abs(value)<=1000000)}}
 check(diagnostic)
 return diagnostic
}
const fullKeyboardSample={visibilityPassed:true,sampled:true,inside:true,outlined:true,focused:true,focusVisible:true,outlineStylePresent:true,rootSmooth:true,rect:[41,655,60,674],viewport:[390,844],scroll:[0,4534],outlineWidth:3,outlineOffset:2,numericComplete:true}
for(const [name,rect] of [
 ['above',{left:41,top:-1,right:60,bottom:18}],['below',{left:41,top:835,right:60,bottom:854}],
 ['left',{left:-1,top:655,right:18,bottom:674}],['right',{left:380,top:655,right:399,bottom:674}],
])test('actual keyboard diagnostic distinguishes viewport failure '+name,async t=>{
 const fixture=keyboardFixture({rect}),diagnostic=await keyboardFailure(t,{readVisibility:fixture.evaluate})
 assert.deepEqual(diagnostic,{...fullKeyboardSample,inside:false,rect:[rect.left,rect.top,rect.right,rect.bottom]})
 assert.deepEqual(fixture.reads,['rect','style','matches','root-style'])
})
for(const [name,options,expected] of [
 ['missing outline',{outlineStyle:'none'},{outlined:false,outlineStylePresent:false}],
 ['zero outline width',{outlineWidth:'0px'},{outlined:false,outlineWidth:0}],
 ['lost focus',{outlineStyle:'none',focused:false,focusVisible:false},{outlined:false,focused:false,focusVisible:false,outlineStylePresent:false}],
 ['focus-visible mismatch',{outlineStyle:'none',focusVisible:false},{outlined:false,focusVisible:false,outlineStylePresent:false}],
 ['non-smooth root',{outlineWidth:'0px',rootSmooth:false},{outlined:false,outlineWidth:0,rootSmooth:false}],
])test('actual keyboard diagnostic distinguishes '+name,async t=>{
 const fixture=keyboardFixture(options),diagnostic=await keyboardFailure(t,{readVisibility:fixture.evaluate})
 assert.deepEqual(diagnostic,{...fullKeyboardSample,...expected})
})
test('visibility assertion failure records no later DOM sample or retry',async t=>{
 const diagnostic=await keyboardFailure(t,{failAt:assertion(0,'consent','visible')})
 assert.deepEqual(diagnostic,{visibilityPassed:false,sampled:false})
})
test('core geometry read failure remains fatal and redacted',async t=>{
 const fixture=keyboardFixture({geometryError:true}),diagnostic=await keyboardFailure(t,{readVisibility:fixture.evaluate})
 assert.deepEqual(diagnostic,{visibilityPassed:true,sampled:false})
 assert.deepEqual(fixture.reads,['rect'])
})
test('optional diagnostic failure preserves an existing containment failure',async t=>{
 const fixture=keyboardFixture({rect:{left:41,top:835,right:60,bottom:854},diagnosticError:true})
 assert.deepEqual(await keyboardFailure(t,{readVisibility:fixture.evaluate}),{visibilityPassed:true,sampled:false})
})
test('optional diagnostic failure cannot fail otherwise valid native modes',async t=>{
 const messages=captureDiagnostics(t),fixture=keyboardFixture({diagnosticError:true}),h=harness({readVisibility:fixture.evaluate})
 await verifyContactConsentNativeAcceptance(h.source,h.expect,'en')
 assert.deepEqual(messages,modes.map(mode=>[completed(mode)]))
 assert.equal(h.contexts.length,3);assert.ok(h.contexts.every(c=>c.closed))
 assert.deepEqual(fixture.reads,['rect','style','matches'])
})
test('one actual valid callback adds no output, extra evaluation, or native actions',async t=>{
 const messages=captureDiagnostics(t),fixture=keyboardFixture(),h=harness({readVisibility:fixture.evaluate})
 await verifyContactConsentNativeAcceptance(h.source,h.expect,'en')
 assert.deepEqual(messages,modes.map(mode=>[completed(mode)]))
 assert.equal(h.events.filter(e=>e[1]==='evaluate'&&e[3]==='visibility').length,1)
 assert.deepEqual(h.events.filter(e=>e[1]==='key').map(e=>e[2]),['Tab','Space','Space','Shift+Tab'])
 assert.deepEqual(fixture.reads,['rect','style','matches','root-style'])
})
test('serializer copies only fixed typed fields and bounds malformed numbers',async t=>{
 const keyboard={sampled:true,inside:marker,outlined:marker,focused:marker,focusVisible:marker,outlineStylePresent:marker,rootSmooth:marker,
  rect:[Infinity,-Infinity,NaN,marker,123],viewport:[1e20,-1e20,456],scroll:[1.23456,-1.23456],outlineWidth:marker,outlineOffset:3.14159,
  textContent:marker,url:marker,cause:new Error(marker),toJSON:()=>{throw new Error(marker)}}
 const diagnostic=await keyboardFailure(t,{visible:{inside:false,outlined:true},keyboard})
 assert.deepEqual(diagnostic,{visibilityPassed:true,sampled:true,inside:false,outlined:false,focused:false,focusVisible:false,outlineStylePresent:false,rootSmooth:false,
  rect:[0,0,0,0],viewport:[1000000,-1000000],scroll:[1.23,-1.23],outlineWidth:0,outlineOffset:3.14,numericComplete:false})
})
test('an unavailable sample does not fabricate geometry or read extra fields',async t=>{
 const keyboard={sampled:false}
 Object.defineProperty(keyboard,'rect',{get(){throw new Error(marker)}})
 assert.deepEqual(await keyboardFailure(t,{visible:{inside:false,outlined:true},keyboard}),{visibilityPassed:true,sampled:false})
})
test('diagnostic quantization never weakens the original exact containment assertion',async t=>{
 const fixture=keyboardFixture({rect:{left:41,top:-0.0001,right:60,bottom:18.9999}})
 const diagnostic=await keyboardFailure(t,{readVisibility:fixture.evaluate})
 assert.equal(diagnostic.inside,false)
 assert.deepEqual(diagnostic.rect,[41,0,60,19])
})
test('source retains exact native geometry verdict without waits, retries or forcing',()=>{
 const source=readFileSync(new URL('../scripts/helpers/contact-consent-native-acceptance.mjs',import.meta.url),'utf8')
 const sample=source.slice(source.indexOf("checkpoint(diagnostic,'keyboard-visible')"),source.indexOf("checkpoint(diagnostic,'keyboard-space-on')"))
 assert.match(sample,/await expect\(consent\)\.toBeVisible\(\)/)
 assert.match(sample,/assert\.deepEqual\(visible,\{inside:true,outlined:true\}\)/)
 assert.match(sample,/inside:r\.top>=0&&r\.bottom<=innerHeight&&r\.left>=0&&r\.right<=innerWidth/)
 assert.match(sample,/outlined:style\.outlineStyle!=='none'&&parseFloat\(style\.outlineWidth\)>0/)
 assert.equal((sample.match(/await /g)||[]).length,2)
 assert.doesNotMatch(sample,/setTimeout|requestAnimationFrame|waitFor|\.poll\(|scrollIntoView|scrollTo\(|focus\(|force:|dispatchEvent|addEventListener|new Promise|console\./)
})
