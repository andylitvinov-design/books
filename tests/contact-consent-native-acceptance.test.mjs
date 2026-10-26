import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import vm from 'node:vm'
import {createHash} from 'node:crypto'
import {consentInitialGate,withConsentBootstrap,installConsentPopupGuard,verifyContactConsentNativeAcceptance,collectKeyboardFailureTail} from '../scripts/helpers/contact-consent-native-acceptance.mjs'
// BEGIN KEYBOARD START DIAGNOSTIC TEST imports
import {installKeyboardStartObserver,keyboardStartDiagnostic,naturalKeyboardStart,createKeyboardStartPreparation,abortKeyboardStart,unsafeConsentCleanup,CONSENT_KEYBOARD_START_TIMEOUT_MS,CONSENT_KEYBOARD_ABORT_TIMEOUT_MS} from '../scripts/helpers/contact-consent-native-acceptance.mjs'
const origin='http://127.0.0.1:3000', initial=origin+'/en/services/alchemy-of-soul'
// END KEYBOARD START DIAGNOSTIC TEST imports
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
function harness({failAt,post=false,popup=false,pageError=false,latePopup=false,latePage=false,latePageError=false,latePost=false,lateRouteError=false,lateSocketError=false,latePageCloseError=false,createError=false,stuckTab=false,visible={inside:true,outlined:true},keyboard={sampled:false},readVisibility,readKeyboardTail,readKeyboardStart}={}) {
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
   locator:selector=>loc(selector==='..'?'label-parent':selector==='span'?'label':selector.includes('type="tel"')?'phone':selector==='select'?'country':selector.includes('checkbox')?'consent':selector==='[data-contact-channel-submit]'?'actions':selector.includes('data-contact-channel-submit="whatsapp"')?'whatsapp':selector.includes('data-contact-channel-submit="telegram"')?'telegram':selector.includes('role="status"')?'receipt':selector.includes('data-contact-order')?'open':selector.includes('data-alchemy-format=')?'format':selector.includes('data-contact-channel]')?'links':'container'),
   click:async()=>{record('click',name);if(name==='label')state.checked=!state.checked},
   selectOption:async value=>record('select',name,value),
   fill:async (value,options)=>{if(options!==undefined){assert.equal(id,0);assert.ok(options.timeout>0&&options.timeout<=30000);state.finalFillTimeout=options.timeout}record('fill',name,value);state.focus='phone'},
   evaluate:async (fn,args,options)=>{
    if(fn===naturalKeyboardStart){record('readiness',name);assert.ok(args.remainingMs>0&&args.remainingMs<=30000);assert.equal(options.timeout,args.remainingMs);return readKeyboardStart?readKeyboardStart(fn):{ready:true}}
    if(fn===collectKeyboardFailureTail){record('tail',name);return readKeyboardTail?.(fn)}
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
    if(str.includes('sessionStorage.getItem'))return null
    if(str.includes('window.__alchemyFixture.opens'))return []
   },
   keyboard:{press:async key=>{record('key',key);if(key==='Tab'&&!stuckTab)state.focus='consent';if(key==='Shift+Tab')state.focus='previous';if(key==='Space')state.checked=!state.checked}},
   mouse:{move:async(x,y)=>record('move',x,y),down:async()=>record('down'),up:async()=>record('up')}
  }
  const context={route:async(_,fn)=>{record('route');state.routes.push(fn);if(post&&state.routes.length===1)await fn(route(origin+'/api/service-enquiries','POST','fetch'))},
    routeWebSocket:async(_,fn)=>{record('socket');state.socket=true;state.socketHandler=fn;let closed=false;await fn({close:()=>{closed=true}});assert.ok(closed)},
// BEGIN KEYBOARD START DIAGNOSTIC TEST init-harness
    addInitScript:async fn=>{if(fn===installKeyboardStartObserver){record('observer-init');state.observer=fn;return}record('init');assert.equal(fn,installConsentPopupGuard);state.init=true},
// END KEYBOARD START DIAGNOSTIC TEST init-harness
    exposeBinding:async(name,fn)=>{record('binding');state.binding=fn},on:(name,fn)=>{record('pages');state.pageHandler=fn},newPage:async()=>{record('newPage');state.pageHandler(page);return page},close:async options=>{state.closeOptions=options;record('close');if(latePopup)state.binding();if(latePage||latePageCloseError)state.pageHandler({close:async()=>{if(latePageCloseError)throw new Error(marker)}});if(latePost)await state.routes[0](route(origin+'/api/service-enquiries','POST','fetch'));if(lateRouteError)void state.routes[0]({request:()=>{throw new Error(marker)}});if(lateSocketError)void state.socketHandler({close:async()=>{throw new Error(marker)}});if(latePageError)state.pageError(new Error('PRIVATE_MARKER'));state.closed=true}}
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
   toBeEnabled:check('enabled',()=>{}),toBeDisabled:check('disabled',state=>assert.equal(state.checked,false)),
   toHaveCount:check('count',(_,n)=>assert.equal(n,locator.name==='actions'?2:0)),not:{toBeChecked:check('not-checked',state=>assert.equal(state.checked,false)),toBeFocused:check('not-focused',state=>assert.notEqual(state.focus,locator.name))}}
 }
 return {events,contexts,expect,source:{url:()=>initial,viewportSize:()=>({width:390,height:844}),context:()=>({browser:()=>browser})}}
}
test('executes three fresh guarded contexts with native keyboard, label and canceled drag only',async()=>{
 const h=harness();await verifyContactConsentNativeAcceptance(h.source,h.expect,'en')
 assert.equal(h.contexts.length,3);assert.ok(h.contexts.every(c=>c.closed&&c.routes.length===1))
 const actions=id=>h.events.filter(e=>e[0]===id).map(e=>e.slice(1))
 assert.deepEqual(actions(0).filter(e=>e[0]==='key'),[['key','Tab'],['key','Space'],['key','Space'],['key','Shift+Tab']])
 assert.deepEqual(actions(1).filter(e=>e[0]==='click'),[['click','format'],['click','open'],['click','whatsapp'],['click','telegram'],['click','label'],['click','label'],['click','whatsapp'],['click','telegram']])
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
 assert.match(original,/assert.equal\(receipt.count,0\)\s+await consent.check\(\)\s+return \{contact,country,consent,actions,submit\}/)
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
 for(const privateValue of ['PRIVATE_MARKER','https://example.invalid','secret@example.invalid','alchemy-browser-fixture@example.invalid','+14165550123','4165550123'])assert.ok(!output.includes(privateValue))
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
 ['natural phone focus',{failAt:assertion(0,'phone','focused')},{phase:'keyboard-focus'}],
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
 ['terminal action',{failAt:event(0,'click','whatsapp',2)},{phase:'terminal-submit'}],
 ['terminal links',{failAt:assertion(0,'links','count',2)},{phase:'terminal-links'}],
 ['initial popup',{popup:true},{phase:'initial-actions'}],
 ['initial route failure',{post:true},{phase:'initial-actions'}],
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

function tailFixture({settles=true,readFails=false,listenFails=false}={}) {
 const calls=[],listeners=new Map();let now=0
 const checkbox={getBoundingClientRect:()=>{calls.push('rect');if(readFails)throw Error(marker);return {left:41,right:60,top:settles&&now>=250?655:1022.61,bottom:settles&&now>=250?674:1041.61}},matches:selector=>{assert.equal(selector,':focus-visible');return true}}
 for(const key of ['value','textContent','innerHTML','outerHTML','id','name','href','focus','click','check','scrollIntoView','dispatchEvent','setAttribute'])Object.defineProperty(checkbox,key,{get(){assert.fail('private read or active operation: '+key)}})
 const document={activeElement:checkbox,onscrollend:null,
  addEventListener:(name,callback,options)=>{calls.push(['listen',name,options]);if(listenFails&&name==='scrollend')throw Error(marker);listeners.set(name,callback)},
  removeEventListener:(name,callback,capture)=>{calls.push(['remove',name,capture]);if(listeners.get(name)===callback)listeners.delete(name)}}
 const sandbox={node:checkbox,document,innerWidth:390,innerHeight:844,scrollX:0,scrollY:4166,performance:{now:()=>now},
  setTimeout:(callback,delay)=>{calls.push(['timer',delay]);Promise.resolve().then(()=>{now+=delay;listeners.get('scroll')?.();if(now===250)listeners.get('scrollend')?.();callback()})}}
// BEGIN KEYBOARD START DIAGNOSTIC TEST tail-fixture
 return {calls,listeners,sandbox,read:async fn=>JSON.parse(JSON.stringify(await vm.runInNewContext(`(${fn.toString()})(node)`,sandbox)))}
// END KEYBOARD START DIAGNOSTIC TEST tail-fixture
}
async function captureTailFailure(t,{readKeyboardTail,latePopup=false,failAt}={}) {
 const messages=captureDiagnostics(t),fixture=keyboardFixture({rect:{left:41,top:1022.61,right:60,bottom:1041.61}})
 const h=harness({readVisibility:fixture.evaluate,readKeyboardTail,latePopup,failAt})
 let result
 await assert.rejects(verifyContactConsentNativeAcceptance(h.source,h.expect,'en'),error=>{
  assert.match(error.message,/^CONSENT_NATIVE_ACCEPTANCE_FAILED mode=keyboard phase=keyboard-visible /)
  const parts=error.message.split(' keyboard=')[1].split(' keyboardTail=')
  result={message:error.message,keyboard:JSON.parse(parts[0]),tail:parts[1]===undefined?undefined:JSON.parse(parts[1])}
  assertPrivateDataExcluded(error,messages);assert.ok(error.message.length<2200);return true
 })
 assert.deepEqual(messages,[])
 assert.equal(h.contexts.length,1)
 assert.ok(h.events.some(event=>event[1]==='close'))
 assert.deepEqual(h.events.filter(event=>event[1]==='key').map(event=>event[2]),['Tab'])
 assert.ok(!h.events.some(event=>['scroll','move','down','up'].includes(event[1])))
 assert.equal(h.events.filter(event=>event[1]==='tail').length,1)
 assert.equal(result.keyboard.inside,false)
 return {...result,h}
}
for(const settles of [false,true])test('post-failure passive tail distinguishes '+(settles?'settled in-view':'persistently offscreen')+' without accepting either',async t=>{
 const fixture=tailFixture({settles}),result=await captureTailFailure(t,{readKeyboardTail:fixture.read})
 assert.deepEqual(result.tail.samples.map(sample=>sample.inside),[false,false,settles,settles])
 assert.deepEqual(result.tail.samples.map(sample=>sample.ms),[0,100,250,500])
 assert.equal(result.tail.finished,true);assert.equal(result.tail.timedOut,false)
 assert.equal(result.tail.scrollEndSupported,true);assert.equal(result.tail.scrollEvents,3);assert.equal(result.tail.scrollEnds,1)
 assert.equal(fixture.listeners.size,0)
 assert.deepEqual(fixture.calls.filter(call=>Array.isArray(call)&&call[0]==='timer'),[['timer',100],['timer',150],['timer',250]])
 assert.ok(result.h.events.findIndex(event=>event[1]==='tail')<result.h.events.findIndex(event=>event[1]==='close'))
})
test('tail samples redact read errors and remove both passive listeners',async t=>{
 const fixture=tailFixture({readFails:true}),result=await captureTailFailure(t,{readKeyboardTail:fixture.read})
 assert.ok(result.tail.samples.every(sample=>!sample.sampled))
 assert.equal(fixture.listeners.size,0)
})
test('tail setup failure removes any installed listener and preserves original error',async t=>{
 const fixture=tailFixture({listenFails:true}),result=await captureTailFailure(t,{readKeyboardTail:fixture.read})
 assert.equal(result.tail,undefined);assert.equal(fixture.listeners.size,0)
})
test('rejected post-failure evaluation cannot replace original verdict or cleanup',async t=>{
 const result=await captureTailFailure(t,{readKeyboardTail:()=>{throw new AggregateError([Error(marker)],marker)}})
 assert.equal(result.tail,undefined)
})
test('unresponsive post-failure evaluation is bounded and still closes the context',async t=>{
 const result=await captureTailFailure(t,{readKeyboardTail:()=>new Promise(()=>{})})
 assert.deepEqual(result.tail,{finished:false,timedOut:true,scrollEndSupported:false,scrollEvents:0,scrollEnds:0,samples:[]})
})
test('late popup during post-failure observation still records the bootstrap boundary',async t=>{
 const fixture=tailFixture(),result=await captureTailFailure(t,{readKeyboardTail:fixture.read,latePopup:true})
 assert.match(result.message,/boundary=popup /);assert.equal(result.keyboard.inside,false)
})
test('cleanup failure after passive tail still reports the original failure phase',async t=>{
 const fixture=tailFixture(),result=await captureTailFailure(t,{readKeyboardTail:fixture.read,failAt:'close'})
 assert.match(result.message,/phase=keyboard-visible cleanup=cleanup-close /)
})
test('tail serializer allowlists only bounded numeric and boolean fields and four samples',async t=>{
 const sample={sampled:marker,ms:Infinity,inside:marker,focused:marker,focusVisible:marker,rect:[NaN,-Infinity,1e20,-1e20],viewport:[marker,390],scroll:[1.23456,-1.23456],textContent:marker,toJSON:()=>{throw Error(marker)}}
 const raw={finished:marker,timedOut:marker,scrollEndSupported:marker,scrollEvents:Infinity,scrollEnds:1e20,samples:Array(30).fill(sample),url:marker,toJSON:()=>{throw Error(marker)}}
 const result=await captureTailFailure(t,{readKeyboardTail:()=>raw})
 assert.deepEqual(result.tail,{finished:false,timedOut:false,scrollEndSupported:false,scrollEvents:0,scrollEnds:1000000,samples:Array(4).fill({sampled:false,ms:0,inside:false,focused:false,focusVisible:false,rect:[0,0,1000000,-1000000],viewport:[0,390],scroll:[1.23,-1.23]})})
})
test('successful native actions never invoke or wait for the passive failure tail',async t=>{
 const messages=captureDiagnostics(t),h=harness({readKeyboardTail:()=>assert.fail('tail on success')})
 await verifyContactConsentNativeAcceptance(h.source,h.expect,'en')
 assert.deepEqual(messages,modes.map(mode=>[completed(mode)]));assert.equal(h.events.filter(event=>event[1]==='tail').length,0)
})
test('throwing optional tail getters cannot replace or leak through the original failure',async t=>{
 const raw={};Object.defineProperty(raw,'finished',{get(){throw Error(marker)}})
 const result=await captureTailFailure(t,{readKeyboardTail:()=>raw});assert.equal(result.tail,undefined)
})

// BEGIN KEYBOARD START DIAGNOSTIC TEST cases
// These fixtures execute the actual installer, formatter and tail source. They
// prove bounded passive diagnostics, not browser timing/scroll accessibility.
function startObserverFixture({listenFails,defineFails=false,selectorFails=false}={}) {
 const listeners=new Map(),calls=[],privateReads=[],activeCalls=[]
 const state={now:0,present:true,phonePresent:true,error:false,rectError:false,
  phoneRect:{left:37,top:-65,right:353,bottom:-20},consentRect:{left:37,top:-12.78,right:55,bottom:5.22}}
 const trap=(object,keys,bucket)=>{for(const key of keys)Object.defineProperty(object,key,{configurable:true,get(){bucket.push(key);throw Error(marker)}})}
 const makeNode=kind=>{
  const node={getBoundingClientRect:()=>{calls.push(['rect',kind]);if(state.rectError)throw Error(marker);return state[kind+'Rect']},
   matches:selector=>{calls.push(['matches',selector]);assert.equal(selector,':focus-visible');return true}}
  trap(node,['value','textContent','innerText','innerHTML','outerHTML','id','name','href','src','dataset','attributes','getAttribute','toJSON'],privateReads)
  trap(node,['focus','blur','click','check','scrollIntoView','dispatchEvent','setAttribute'],activeCalls)
  return node
 }
 const phone=makeNode('phone'),consent=makeNode('consent')
 const chooser={querySelector:selector=>{
  calls.push(['chooser-query',selector])
  if(selector==='[data-phone-country-input] input[type="tel"]')return state.phonePresent?phone:null
  if(selector==='input[type="checkbox"]')return consent
  if(selector==='[role="alert"]')return state.error?{}:null
  assert.fail('Unowned selector')
 }}
 trap(chooser,['textContent','innerHTML','outerHTML','id','name','getAttribute'],privateReads)
 const document={activeElement:phone,
  querySelector:selector=>{calls.push(['document-query',selector]);if(selectorFails)throw Error(marker);assert.equal(selector,'[data-alchemy-booking-formats] [data-contact-channel-chooser]');return state.present?chooser:null},
  addEventListener:(name,fn,options)=>{calls.push(['listen',name,options]);if(name===listenFails)throw Error(marker);listeners.set(name,fn)},
  removeEventListener:(name,fn,capture)=>{calls.push(['remove',name,capture]);if(listeners.get(name)===fn)listeners.delete(name)}}
 trap(document,['URL','location','cookie','title','body','documentElement','textContent','getElementById'],privateReads)
 const window={visualViewport:{width:390,height:844,offsetLeft:0,offsetTop:0}}
 trap(window,['location','localStorage','sessionStorage'],privateReads)
 trap(window,['fetch','open','scrollTo','scrollBy','requestAnimationFrame','setTimeout'],activeCalls)
 if(defineFails)Object.preventExtensions(window)
 const sandbox={window,document,performance:{now:()=>state.now},scrollX:0,scrollY:9797,innerWidth:390,innerHeight:844}
 trap(sandbox,['fetch','console','setTimeout','requestAnimationFrame','MutationObserver'],activeCalls)
 vm.runInNewContext(`(${installKeyboardStartObserver.toString()})()`,sandbox)
 const dispatch=(name,options={},afterDefault)=>{
  const event={target:phone,defaultPrevented:false,shiftKey:false,...options}
  trap(event,['data','inputType','code','keyCode','keyIdentifier','which','textContent'],privateReads)
  trap(event,['preventDefault','stopPropagation','stopImmediatePropagation'],activeCalls)
  listeners.get(name)?.(event)
  afterDefault?.()
 }
 const raw=()=>window.__consentKeyboardStartRead?.()
 const read=()=>{const value=raw();return value===undefined?undefined:JSON.parse(value)}
 const noPrivateOrActive=()=>{assert.deepEqual(privateReads,[]);assert.deepEqual(activeCalls,[])}
 return {listeners,calls,privateReads,activeCalls,state,phone,consent,document,window,sandbox,dispatch,raw,read,noPrivateOrActive}
}
function assertStartSchema(result) {
 assert.deepEqual(Object.keys(result).sort(),['version','discarded','readErrors','tabCount','events','tab'].sort())
 assert.equal(result.version,1);assert.ok(result.events.length<=64)
 assert.ok(Buffer.byteLength(JSON.stringify(result))<=32768)
 const inspect=value=>{
  if(value===null)return
  if(Array.isArray(value)){for(const child of value)inspect(child);return}
  if(typeof value==='object'){for(const child of Object.values(value))inspect(child);return}
  if(typeof value==='string')assert.ok(['focusin','focusout','input','tab','scroll','scrollend','phone','consent','document','other'].includes(value))
  else assert.ok(typeof value==='boolean'||typeof value==='number'&&Number.isFinite(value)&&Math.abs(value)<=1000000)
 }
 inspect(result)
}
test('start observer installs only fixed passive capture listeners and reads no document on install',()=>{
 const f=startObserverFixture()
 assert.deepEqual([...f.listeners.keys()],['focusin','focusout','input','keydown','scroll','scrollend'])
 for(const call of f.calls){assert.equal(call[0],'listen');assert.equal(call[2].capture,true);assert.equal(call[2].passive,true)}
 assertStartSchema(f.read());assert.deepEqual(f.read().events,[]);assert.equal(f.read().tab,null)
 f.noPrivateOrActive()
})
test('actual Tab capture snapshots focused phone before default focus and scroll action',()=>{
 const f=startObserverFixture();f.state.error=true;f.state.now=25
 f.dispatch('focusin');f.dispatch('input');f.state.now=35
 f.dispatch('keydown',{key:'Tab'},()=>{f.document.activeElement=f.consent;f.sandbox.scrollY=9418;f.state.consentRect={left:37,top:366.22,right:55,bottom:384.22}})
 f.state.now=40;f.dispatch('focusout');f.dispatch('focusin',{target:f.consent});f.dispatch('scroll',{target:f.document});f.dispatch('scrollend',{target:f.document})
 const data=f.read();assertStartSchema(data)
 assert.deepEqual(data.events.map(event=>event.kind),['focusin','input','tab','focusout','focusin','scroll','scrollend'])
 assert.equal(data.tabCount,1);assert.equal(data.tab.ms,35);assert.equal(data.tab.phone.focused,true);assert.equal(data.tab.consent.focused,false)
 assert.deepEqual(data.tab.consent.rect,[37,-12.78,55,5.22]);assert.equal(data.tab.consent.inside,false)
 assert.deepEqual(data.tab.scroll,[0,9797]);assert.equal(data.tab.errorPresent,true)
 assert.equal(data.events[4].consent.focused,true);assert.deepEqual(data.events[4].scroll,[0,9418])
 assert.equal(data.events[4].target,'consent');assert.equal(data.events[5].target,'document')
 f.noPrivateOrActive()
})
test('input records error presence but never input data, values, text, raw keys or identifiers',()=>{
 const f=startObserverFixture();f.state.error=true
 f.dispatch('input');f.state.error=false;f.dispatch('input')
 for(const key of ['PRIVATE_MARKER','Enter',' ', 'https://example.invalid', '4165550123'])f.dispatch('keydown',{key})
 f.dispatch('keydown',{key:'Tab',shiftKey:true});f.dispatch('focusin',{target:{id:marker,name:marker}})
 const data=f.read();assertStartSchema(data)
 assert.deepEqual(data.events.map(event=>event.kind),['input','input','tab','focusin'])
 assert.deepEqual(data.events.slice(0,2).map(event=>event.errorPresent),[true,false]);assert.equal(data.tab.shift,true)
 assert.equal(data.events.at(-1).target,'other');assert.ok(!f.raw().includes('PRIVATE_MARKER'));assert.ok(!f.raw().includes('4165550123'))
 f.noPrivateOrActive()
})
test('actual history cap retains recent records and a dedicated last Tab after scroll flooding',()=>{
 const f=startObserverFixture();f.dispatch('keydown',{key:'Tab'});const tab=f.read().tab
 assert.ok(tab);assert.equal(tab.kind,'tab')
 for(let i=1;i<=400;i++){f.state.now=i;f.dispatch('scroll',{target:f.document})}
 const data=f.read();assertStartSchema(data)
 assert.ok(data.discarded>0);assert.ok(data.events.length>0);assert.ok(data.events.every(event=>event.kind==='scroll'))
 assert.equal(data.events.at(-1).ms,400);assert.deepEqual(data.tab,tab);assert.equal(data.tabCount,1)
 assert.ok(Buffer.byteLength(f.raw())<=32768);assert.ok(data.events.reduce((bytes,event)=>bytes+Buffer.byteLength(JSON.stringify(event)),0)<=24576)
 f.noPrivateOrActive()
})
test('actual numeric capture bounds and redacts malformed geometry and viewport values',()=>{
 const f=startObserverFixture();f.state.now=1e20;f.sandbox.scrollX=Infinity;f.sandbox.scrollY=-1e20;f.sandbox.innerWidth=NaN
 f.window.visualViewport={width:marker,height:1e20,offsetLeft:-Infinity,offsetTop:1.23456}
 f.state.phoneRect={left:NaN,top:marker,right:1e20,bottom:-Infinity}
 f.dispatch('input');const data=f.read();assertStartSchema(data);const event=data.events[0]
 assert.equal(event.phone.sampled,false);assert.deepEqual(event.phone.rect,[0,0,1000000,0]);assert.equal(event.phone.inside,false)
 assert.deepEqual(event.scroll,[0,-1000000]);assert.deepEqual(event.viewport,[0,844]);assert.deepEqual(event.visualViewport,[0,1000000,0,1.23]);assert.equal(event.ms,1000000)
 assert.ok(!f.raw().includes('PRIVATE_MARKER'));f.noPrivateOrActive()
})
test('observer converts focus-visible reads to strict booleans before any browser serialization',()=>{
 const f=startObserverFixture();f.phone.matches=()=>marker;f.dispatch('input');const data=f.read();assertStartSchema(data)
 assert.equal(data.events[0].phone.focusVisible,false);assert.ok(!f.raw().includes('PRIVATE_MARKER'));f.noPrivateOrActive()
})
test('absent chooser or phone and unrelated keyboard events add no fabricated record',()=>{
 const f=startObserverFixture();f.state.present=false;f.dispatch('input');f.state.present=true;f.state.phonePresent=false;f.dispatch('scroll')
 f.state.phonePresent=true;f.dispatch('keydown',{key:'Enter'});assert.deepEqual(f.read().events,[]);f.noPrivateOrActive()
})
for(const options of [{listenFails:'focusin'},{listenFails:'input'},{defineFails:true}])test('observer partial install failure is contained and removes listeners '+JSON.stringify(options),()=>{
 const f=startObserverFixture(options);assert.equal(f.listeners.size,0);assert.equal(f.raw(),undefined);f.noPrivateOrActive()
})
test('observer event and geometry failures remain bounded diagnostic failures only',()=>{
 const broken=startObserverFixture({selectorFails:true});broken.dispatch('input');assert.equal(broken.read().readErrors,1);assert.deepEqual(broken.read().events,[]);broken.noPrivateOrActive()
 const f=startObserverFixture();f.state.rectError=true;f.dispatch('focusin');assert.equal(f.read().events[0].phone.sampled,false);assert.equal(f.read().events[0].consent.sampled,false);f.noPrivateOrActive()
})
test('formatter revalidates actual observer output and never retains unknown fields or categories',()=>{
 const f=startObserverFixture();f.dispatch('keydown',{key:'Tab'});const raw=f.read()
 raw.private=marker;raw.events[0].value=marker;raw.events[0].target=marker;raw.events[0].phone.focused=marker;raw.events[0].phone.rect=[marker,null,1e20,-1e20]
 raw.events.push({kind:marker,textContent:marker});raw.discarded=-99;raw.readErrors=1e20
 const result=keyboardStartDiagnostic(JSON.stringify(raw)),data=JSON.parse(result);assertStartSchema(data)
 assert.equal(data.events.length,1);assert.equal(data.events[0].target,'other');assert.equal(data.events[0].phone.focused,false)
 assert.deepEqual(data.events[0].phone.rect,[0,0,1000000,-1000000]);assert.equal(data.discarded,0);assert.equal(data.readErrors,1000000)
 assert.ok(!result.includes('PRIVATE_MARKER'));assert.equal(keyboardStartDiagnostic('x'.repeat(32769)),undefined)
 assert.equal(keyboardStartDiagnostic({toJSON:()=>assert.fail('coercion')}),undefined);assert.equal(keyboardStartDiagnostic('{"version":2}'),undefined)
 f.noPrivateOrActive()
})
test('formatter independently enforces output record and byte caps on compact hostile input',()=>{
 const raw=JSON.stringify({version:1,events:Array.from({length:200},()=>({kind:'scroll'})),tab:{kind:'input',value:marker}})
 assert.ok(raw.length<32768);const data=JSON.parse(keyboardStartDiagnostic(raw));assertStartSchema(data)
 assert.ok(data.events.length<=64);assert.equal(data.tab,null)
})
test('formatter byte cap trims worst-case finite records while preserving dedicated Tab',()=>{
 const vector=length=>Array(length).fill(-999999.99),node={rect:vector(4)}
 const event={kind:'scrollend',ms:-999999.99,target:'document',phone:node,consent:node,scroll:vector(2),viewport:vector(2),visualViewport:vector(4)}
 const raw=JSON.stringify({version:1,events:Array(64).fill(event),tab:{...event,kind:'tab'}})
 assert.ok(raw.length<32768);const data=JSON.parse(keyboardStartDiagnostic(raw));assertStartSchema(data)
 assert.ok(data.discarded>0);assert.ok(data.events.length<64);assert.equal(data.tab.kind,'tab');assert.deepEqual(data.tab.phone.rect,vector(4))
})
test('keyboard observer init is before page and navigation, once, with all original interactions intact',async t=>{
 const messages=captureDiagnostics(t),h=harness();await verifyContactConsentNativeAcceptance(h.source,h.expect,'en')
 const observer=h.events.filter(event=>event[1]==='observer-init');assert.equal(observer.length,1);assert.equal(observer[0][0],0)
 assert.ok(h.events.indexOf(observer[0])<h.events.findIndex(event=>event[1]==='newPage'))
 assert.ok(h.events.indexOf(observer[0])<h.events.findIndex(event=>event[1]==='goto'))
 assert.deepEqual(h.events.filter(event=>event[0]===0&&['click','fill','select','key'].includes(event[1])).map(event=>event.slice(1)),[
  ['click','format'],['click','open'],['select','country','CA'],['fill','phone','4165550123'],['click','whatsapp'],['click','telegram'],['fill','phone','4165550123'],
  ['key','Tab'],['key','Space'],['key','Space'],['key','Shift+Tab'],['click','whatsapp'],['click','telegram'],
 ])
 assert.deepEqual(messages,modes.map(mode=>[completed(mode)]));assert.equal(h.events.filter(event=>event[1]==='tail').length,0)
})
test('observer init API rejection cannot turn native acceptance success into failure',async t=>{
 const messages=captureDiagnostics(t),h=harness({failAt:'observer-init'});await verifyContactConsentNativeAcceptance(h.source,h.expect,'en')
 assert.deepEqual(messages,modes.map(mode=>[completed(mode)]));assert.ok(h.contexts.every(context=>context.closed))
})
test('actual observer state piggybacks only after unchanged four tail samples with no new timer',async()=>{
 const f=startObserverFixture();f.dispatch('keydown',{key:'Tab'});const tail=tailFixture();let reads=0
 tail.sandbox.window={__consentKeyboardStartRead:()=>{reads++;assert.equal(tail.calls.filter(call=>call==='rect').length,4);return f.raw()}}
 const result=await tail.read(collectKeyboardFailureTail)
 assert.equal(reads,1);assert.deepEqual(result.samples.map(sample=>sample.ms),[0,100,250,500])
 assert.deepEqual(tail.calls.filter(call=>Array.isArray(call)&&call[0]==='timer'),[['timer',100],['timer',150],['timer',250]])
 assert.deepEqual(JSON.parse(result.keyboardStart),f.read());assert.equal(tail.listeners.size,0);f.noPrivateOrActive()
})
for(const kind of ['throw','oversize','non-string'])test('failed optional tail observer read preserves exact original tail '+kind,async()=>{
 const tail=tailFixture();tail.sandbox.window={__consentKeyboardStartRead:()=>{if(kind==='throw')throw Error(marker);return kind==='oversize'?'x'.repeat(32769):{textContent:marker}}}
 const result=await tail.read(collectKeyboardFailureTail)
 assert.equal(result.keyboardStart,undefined);assert.equal(result.finished,true);assert.equal(result.timedOut,false);assert.equal(result.samples.length,4);assert.equal(tail.listeners.size,0)
})
async function observerFailure(t,raw,{failAt,latePopup=false}={}) {
 const messages=captureDiagnostics(t),fixture=keyboardFixture({rect:{left:37,top:-12.78,right:55,bottom:5.22}}),tail=tailFixture()
 tail.sandbox.window={__consentKeyboardStartRead:()=>raw}
 const h=harness({readVisibility:fixture.evaluate,readKeyboardTail:tail.read,failAt,latePopup});let error
 await assert.rejects(verifyContactConsentNativeAcceptance(h.source,h.expect,'en'),value=>{error=value;return true})
 assert.match(error.message,/^CONSENT_NATIVE_ACCEPTANCE_FAILED mode=keyboard phase=keyboard-visible /)
 assertPrivateDataExcluded(error,messages);assert.deepEqual(messages,[]);assert.ok(h.contexts.every((_,id)=>h.events.some(event=>event[0]===id&&event[1]==='close')))
 const keyboard=JSON.parse(error.message.split(' keyboard=')[1].split(' keyboardTail=')[0]);assert.equal(keyboard.inside,false)
 assert.ok(h.events.findIndex(event=>event[1]==='evaluate'&&event[3]==='visibility')<h.events.findIndex(event=>event[1]==='tail'))
 assert.equal(h.events.filter(event=>event[1]==='tail').length,1);assert.deepEqual(h.events.filter(event=>event[1]==='key').map(event=>event[2]),['Tab'])
 return {error,h,tail}
}
test('complete actual helper emits bounded pre-Tab observation without accepting later visible tail',async t=>{
 const f=startObserverFixture();f.dispatch('input');f.dispatch('keydown',{key:'Tab'})
 const {error}=await observerFailure(t,f.raw());const data=JSON.parse(error.message.split(' keyboardStart=')[1]);assertStartSchema(data)
 assert.deepEqual(data,f.read());assert.ok(error.message.length<35000)
 const tail=JSON.parse(error.message.split(' keyboardTail=')[1].split(' keyboardStart=')[0]);assert.equal(tail.samples.at(-1).inside,true)
 f.noPrivateOrActive()
})
for(const raw of ['PRIVATE_MARKER','{"version":1,"events":[{"kind":"PRIVATE_MARKER","value":"PRIVATE_MARKER"}]}','{"version":2}'])test('malformed/untrusted observer data cannot replace or leak through original failure '+raw.length,async t=>{
 const {error}=await observerFailure(t,raw);assert.ok(!error.message.includes('PRIVATE_MARKER'))
})
test('observer diagnostics preserve original cleanup failure and late popup boundary',async t=>{
 const f=startObserverFixture();f.dispatch('keydown',{key:'Tab'})
 const cleanup=await observerFailure(t,f.raw(),{failAt:'close'});assert.match(cleanup.error.message,/cleanup=cleanup-close /)
 const popup=await observerFailure(t,f.raw(),{latePopup:true});assert.match(popup.error.message,/boundary=popup /)
})
test('actual new observer source has no active APIs, storage, scheduling, console or DOM-content reads',()=>{
 const source=installKeyboardStartObserver.toString()
 assert.doesNotMatch(source,/\.value\b|\.textContent\b|\.innerText\b|\.innerHTML\b|\.outerHTML\b|\.id\b|\.name\b|\.href\b|\.src\b|\.dataset\b|\.attributes\b|\.getAttribute\(|\.location\b|localStorage|sessionStorage|\.preventDefault\(|\.stopPropagation\(|\.focus\(|\.click\(|scrollIntoView|scrollTo\(|fetch\(|setTimeout\(|requestAnimationFrame\(|new Promise|console\./)
 assert.equal((source.match(/event\.key/g)||[]).length,1);assert.match(source,/if\(event\.key==='Tab'\) record\('tab',event\)/)
 assert.match(source,/capture:true,passive:true/)
})
// END KEYBOARD START DIAGNOSTIC TEST cases

// Native keyboard START experiment: VM/clock tests only, not browser acceptance.
const keyboardTurn=()=>new Promise(resolve=>setImmediate(resolve))
const keyboardDeferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return {promise,resolve,reject}}
function keyboardClock(){
 let now=0,next=0;const timers=new Map(),delays=[]
 return {now:()=>now,set(fn,ms){delays.push(ms);const id=++next;timers.set(id,{fn,due:now+ms});return id},clear:id=>timers.delete(id),
  advance(value,fire=true){now=value;if(fire)for(const [id,{fn,due}]of [...timers])if(due<=now){timers.delete(id);fn()}},timers,delays}
}
function naturalStartFixture(){
 let now=0,next=0,requests=0;const queue=new Map(),reads=[],effects=[]
 class HTMLInputElement{}
 const box=(left,top,width,height)=>({left,top,right:left+width,bottom:top+height,width,height})
 const state={phone:box(176,300,177,44),consent:box(37,361,18,18),focused:true,duplicate:false,hidden:false,disabled:false,throwSchedule:0,throwCancel:false}
 const consent={isConnected:true,getBoundingClientRect(){reads.push('consent');return state.consent}}
 const chooser={querySelectorAll(selector){if(selector==='[data-phone-country-input] input[type="tel"]')return state.duplicate?[phone,phone]:[phone];assert.equal(selector,'input[type="checkbox"]');return [consent]}}
 const phone=new HTMLInputElement();Object.assign(phone,{isConnected:true,type:'tel',readOnly:false,hidden:false,
  closest(selector){if(selector==='[data-contact-channel-chooser]')return chooser;assert.equal(selector,'[inert]');return null},
  getBoundingClientRect(){reads.push('phone');return state.phone},getClientRects:()=>state.hidden?[]:[state.phone]})
 Object.defineProperty(phone,'disabled',{get:()=>state.disabled})
 for(const node of [phone,consent]){
  for(const key of ['value','textContent','innerHTML','outerHTML','id','name','checked'])Object.defineProperty(node,key,{get(){assert.fail('private/outcome read '+key)}})
  for(const key of ['focus','click','check','scrollIntoView','dispatchEvent','setAttribute'])Object.defineProperty(node,key,{get(){effects.push(key);assert.fail('active API '+key)}})
 }
 const document={scrollingElement:{scrollLeft:0,scrollTop:0}};Object.defineProperty(document,'activeElement',{get:()=>state.focused?phone:null})
 const globals={phone,HTMLInputElement,document,innerWidth:390,innerHeight:844,scrollX:0,scrollY:0,
  window:{visualViewport:{offsetLeft:0,offsetTop:0,pageLeft:0,pageTop:0,width:390,height:844,scale:1}},
  getComputedStyle:()=>({display:'block',visibility:'visible'}),performance:{now:()=>now},
  requestAnimationFrame(fn){requests++;if(requests===state.throwSchedule)throw Error('PRIVATE_MARKER');const id=++next;queue.set(id,fn);return id},
  cancelAnimationFrame(id){queue.delete(id);if(state.throwCancel)throw Error('PRIVATE_MARKER')}}
 return {state,phone,consent,document,globals,queue,reads,effects,
  run(remainingMs=100){globals.args={remainingMs};const result=vm.runInNewContext('('+naturalKeyboardStart.toString()+')(phone,args)',globals);result.catch(()=>{});return result},
  frame(time){now=time;const callbacks=[...queue.values()];queue.clear();for(const fn of callbacks)fn(time)}}
}
test('natural start requires three distinct stable frames; checkbox may remain outside',async()=>{
 const f=naturalStartFixture();f.state.consent.top=900;f.state.consent.bottom=918
 const p=f.run();let done=false;p.then(()=>done=true)
 f.frame(10);await keyboardTurn();assert.equal(done,false)
 f.frame(10);f.frame(20);await keyboardTurn();assert.equal(done,false)
 f.frame(30);assert.deepEqual(JSON.parse(JSON.stringify(await p)),{ready:true});assert.equal(f.queue.size,0);assert.deepEqual(f.effects,[])
})
test('ongoing setup scroll and unrounded subpixel layout motion reset readiness',async()=>{
 const f=naturalStartFixture(),p=f.run();f.frame(10)
 f.state.phone.top+=0.0001;f.state.phone.bottom+=0.0001;f.frame(20);f.frame(30)
 let done=false;p.then(()=>done=true);await keyboardTurn();assert.equal(done,false)
 f.frame(40);await p;assert.equal(f.queue.size,0)
})
for(const [name,mutate]of [
 ['window scroll',(f,t)=>f.globals.scrollY=t],['document scroll',(f,t)=>f.document.scrollingElement.scrollTop=t],
 ['visual viewport',(f,t)=>f.globals.window.visualViewport.pageTop=t],['checkbox geometry',(f,t)=>{f.state.consent.top=t;f.state.consent.bottom=t+18}],
])test('persistent '+name+' exhausts one readiness budget',async()=>{
 const f=naturalStartFixture(),p=f.run(60);for(const time of [10,20,30,40,50,60]){mutate(f,time);f.frame(time)}
 await assert.rejects(p,/DEADLINE/);assert.equal(f.queue.size,0);assert.deepEqual(f.effects,[])
})
for(const [name,mutate,reason]of [
 ['lost focus',f=>f.state.focused=false,'FOCUS'],['detached phone',f=>f.phone.isConnected=false,'TARGET'],
 ['duplicate phone',f=>f.state.duplicate=true,'TARGET'],['detached checkbox',f=>f.consent.isConnected=false,'TARGET'],
 ['disabled phone',f=>f.state.disabled=true,'DISABLED'],['hidden phone',f=>f.state.hidden=true,'HIDDEN'],
 ['nonfinite geometry',f=>f.state.phone.top=NaN,'GEOMETRY'],['nonfinite scroll',f=>f.globals.scrollY=NaN,'VIEWPORT'],
 ['nonfinite visual viewport',f=>f.globals.window.visualViewport.scale=Infinity,'VIEWPORT'],
 ['stable outside phone',f=>{f.state.phone.top=-1;f.state.phone.bottom=43},'PHONE_OUTSIDE'],
 ['outside visual viewport',f=>f.globals.window.visualViewport.height=300,'PHONE_OUTSIDE'],
])test('natural start fails closed: '+name,async()=>{
 const f=naturalStartFixture();mutate(f);const p=f.run();f.frame(10);f.frame(20);f.frame(30)
 await assert.rejects(p,new RegExp(reason));assert.equal(f.queue.size,0);assert.deepEqual(f.effects,[])
})
test('last readiness frame rechecks focus instead of accepting an earlier sample',async()=>{
 const f=naturalStartFixture(),p=f.run();f.frame(10);f.frame(20);f.state.focused=false;f.frame(30);await assert.rejects(p,/FOCUS/);assert.equal(f.queue.size,0)
})
test('partial animation-frame scheduling failures reject without active operations',async()=>{
 for(const count of [1,2]){const f=naturalStartFixture();f.state.throwSchedule=count;const p=f.run();f.frame(10);await assert.rejects(p,/PRIVATE_MARKER/);assert.equal(f.queue.size,0);assert.deepEqual(f.effects,[])}
})
test('exact readiness deadline is failure even with otherwise stable geometry',async()=>{
 const f=naturalStartFixture(),p=f.run(30);f.frame(10);f.frame(20);f.frame(30);await assert.rejects(p,/DEADLINE/)
})
test('one original 30s setup budget decreases across fill, checks and readiness without resets',async()=>{
 const clock=keyboardClock(),preparation=createKeyboardStartPreparation(clock),budgets=[]
 assert.equal(CONSENT_KEYBOARD_START_TIMEOUT_MS,30000)
 await preparation.run(budget=>{budgets.push(budget);clock.advance(100)})
 await preparation.run(budget=>{budgets.push(budget);clock.advance(200)})
 await preparation.run(budget=>{budgets.push(budget);clock.advance(300);return {ready:true}})
 preparation.finish();assert.deepEqual(budgets,[30000,29900,29800]);assert.deepEqual(clock.delays,[30000]);assert.equal(clock.timers.size,0)
 await assert.rejects(preparation.run(()=>assert.fail('new operation after finish')),/STOPPED/)
})
test('exhausted budget before fill or exact-deadline readiness success cannot admit input',async()=>{
 for(const phase of ['before-fill','exact-ready','late-ready']){
  const clock=keyboardClock(),preparation=createKeyboardStartPreparation(clock);let calls=0
  if(phase==='before-fill')clock.advance(30000,false)
  await assert.rejects(preparation.run(()=>{calls++;clock.advance(phase==='late-ready'?30001:30000,false);return {ready:true}}),/DEADLINE/)
  preparation.stop();assert.equal(calls,phase==='before-fill'?0:1);assert.equal(clock.timers.size,0)
 }
})
test('hung evaluation and starved RAF expire under Node watchdog and drain only after close',async()=>{
 const clock=keyboardClock(),preparation=createKeyboardStartPreparation(clock),f=naturalStartFixture(),closed=keyboardDeferred()
 const p=preparation.run(()=>Promise.race([f.run(30000),closed.promise]));p.catch(()=>{});await keyboardTurn()
 assert.equal(f.queue.size,1);clock.advance(30000);await assert.rejects(p,/DEADLINE/)
 const order=[],diagnostic={cleanup:'none'}
 const confirmed=await abortKeyboardStart({preparation,diagnostic,gate:{beginTeardown(){order.push('stop')}},
  context:{async close(){order.push('close');f.queue.clear();closed.reject(Error('context-closed'))}},drain:async()=>order.push('drain')},clock)
 assert.equal(confirmed,true);assert.deepEqual(order,['stop','close','drain']);assert.equal(clock.timers.size,0);assert.deepEqual(clock.delays,[30000,5000])
})
test('pending fill receives no repeated operation and is drained by abort close',async()=>{
 const clock=keyboardClock(),preparation=createKeyboardStartPreparation(clock),fill=keyboardDeferred();let fills=0
 const p=preparation.run(()=>{fills++;return fill.promise});p.catch(()=>{});await keyboardTurn();clock.advance(30000);await assert.rejects(p,/DEADLINE/)
 assert.equal(await abortKeyboardStart({preparation,diagnostic:{cleanup:'none'},gate:{beginTeardown(){}},context:{async close(){fill.reject(Error('closed'))}},drain:async()=>{}},clock),true)
 assert.equal(fills,1);assert.equal(clock.timers.size,0)
})
for(const mode of ['close-reject','close-hang','tracked-drain-hang','setup-drain-hang','stop-fails','preparation-stop-fails','late-close'])test('abort barrier truthfully marks unconfirmed cleanup: '+mode,async()=>{
 const clock=keyboardClock(),wait=keyboardDeferred(),diagnostic={cleanup:'none'},order=[];wait.promise.catch(()=>{})
 const preparation={stop(){order.push('prep-stop');if(mode==='preparation-stop-fails')throw Error('PRIVATE_MARKER')},drain:()=>{order.push('prep-drain');return mode==='setup-drain-hang'?wait.promise:Promise.resolve()}}
 const gate={beginTeardown(){order.push('stop');if(mode==='stop-fails')throw Error('PRIVATE_MARKER')}}
 const context={close(){order.push('close');if(mode==='close-reject')return Promise.reject(Error('PRIVATE_MARKER'));if(mode==='close-hang'||mode==='late-close')return wait.promise;return Promise.resolve()}}
 const drain=()=>{order.push('tracked-drain');return mode==='tracked-drain-hang'?wait.promise:Promise.resolve()}
 const p=abortKeyboardStart({context,gate,drain,preparation,diagnostic},clock);await keyboardTurn()
 if(mode.endsWith('hang'))clock.advance(5000)
 if(mode==='late-close'){clock.advance(5000,false);wait.resolve()}
 assert.equal(await p,false);assert.equal(diagnostic.unsafeConsentCleanup,true);assert.notEqual(diagnostic.cleanup,'none');if(mode==='stop-fails'||mode==='preparation-stop-fails')assert.equal(diagnostic.cleanup,'cleanup-stop')
 assert.equal(order.filter(x=>x==='close').length,1);assert.ok(order.indexOf('stop')<order.indexOf('close'))
 assert.equal(clock.timers.size,0);assert.deepEqual(clock.delays,[CONSENT_KEYBOARD_ABORT_TIMEOUT_MS]);wait.reject(Error('LATE_PRIVATE_MARKER'));await keyboardTurn()
})
test('abort closes before draining outstanding tracked protocol and preserves confirmed result',async()=>{
 const clock=keyboardClock(),protocol=keyboardDeferred(),order=[]
 const p=abortKeyboardStart({preparation:{stop(){},drain:async()=>order.push('setup-drain')},diagnostic:{cleanup:'none'},gate:{beginTeardown(){order.push('stop')}},
  context:{async close(){order.push('close');protocol.resolve()}},drain:async()=>{order.push('tracked-drain');await protocol.promise}},clock)
 assert.equal(await p,true);assert.deepEqual(order,['stop','close','setup-drain','tracked-drain']);assert.equal(clock.timers.size,0)
})
test('readiness failure in actual verifier issues zero Tabs and stops later modes',async t=>{
 const messages=captureDiagnostics(t),h=harness({readKeyboardStart:()=>{throw Error(marker)}})
 await assert.rejects(verifyContactConsentNativeAcceptance(h.source,h.expect,'en'),error=>{
  assert.equal(error.message,'CONSENT_NATIVE_ACCEPTANCE_FAILED mode=keyboard phase=keyboard-ready cleanup=none boundary=none')
  assert.equal(unsafeConsentCleanup(error),false);assertPrivateDataExcluded(error,messages);return true
 })
 assert.equal(h.contexts.length,1);assert.ok(h.contexts[0].closed);assert.deepEqual(h.contexts[0].closeOptions,{reason:'CONSENT_KEYBOARD_START_ABORT'})
 assert.equal(h.events.some(e=>e[1]==='key'||e[1]==='tail'||e[1]==='down'),false);assert.deepEqual(messages,[])
})
test('failed abort marker survives sanitized wrapper without leaking original Error',async t=>{
 const messages=captureDiagnostics(t),h=harness({readKeyboardStart:()=>{throw Error(marker)},failAt:'close'})
 await assert.rejects(verifyContactConsentNativeAcceptance(h.source,h.expect,'en'),error=>{
  assert.equal(error.message,'CONSENT_NATIVE_ACCEPTANCE_FAILED mode=keyboard phase=keyboard-ready cleanup=cleanup-close boundary=none')
  assert.equal(unsafeConsentCleanup(error),true);assert.deepEqual(Object.keys(error),[]);assertPrivateDataExcluded(error,messages);return true
 })
 assert.equal(h.contexts.length,1);assert.equal(h.events.filter(e=>e[1]==='close').length,1);assert.equal(h.events.some(e=>e[1]==='key'),false)
})
test('normal native modes only add readiness before first Tab and preserve fill budget isolation',async()=>{
 const h=harness();await verifyContactConsentNativeAcceptance(h.source,h.expect,'en')
 const ready=h.events.findIndex(e=>e[1]==='readiness'),tab=h.events.findIndex(e=>e[1]==='key')
 assert.ok(ready>=0&&ready<tab);assert.equal(h.events.filter(e=>e[1]==='readiness').length,1)
 assert.ok(h.contexts[0].finalFillTimeout>0);assert.equal(h.contexts[1].finalFillTimeout,undefined);assert.equal(h.contexts[2].finalFillTimeout,undefined)
 assert.equal(h.contexts.every(c=>c.closeOptions===undefined),true)
})

test('original max12 Tab loop and immediate post-Tab region are byte-locked',()=>{
 const source=readFileSync(new URL('../scripts/helpers/contact-consent-native-acceptance.mjs',import.meta.url),'utf8')
 const region=source.slice(source.indexOf("          checkpoint(diagnostic,'keyboard-tab')"),source.indexOf("          checkpoint(diagnostic,'keyboard-space-on')"))
 assert.equal(createHash('sha256').update(region).digest('hex'),'71860259fd92905b5fa50f155e3d9b9596ddbaaeb64bac0c472874ebc4ace7ae')
 const callback=naturalKeyboardStart.toString()
 assert.doesNotMatch(callback,/scrollIntoView|scrollTo\(|scrollBy\(|\.focus\(|\.click\(|\.check\(|dispatchEvent|\.style\s*=|waitForTimeout|setTimeout|setInterval|textContent|\.value\b|\.checked\b/)
})

test('actual verifier bounds starved readiness and undrained evaluation, never sending Tab', {timeout:2000}, async t=>{
 t.mock.timers.enable({apis:['setTimeout']})
 const messages=captureDiagnostics(t),pending=keyboardDeferred(),h=harness({readKeyboardStart:()=>pending.promise})
 const running=verifyContactConsentNativeAcceptance(h.source,h.expect,'en');running.catch(()=>{})
 await keyboardTurn();assert.equal(h.events.filter(e=>e[1]==='readiness').length,1)
 t.mock.timers.tick(30000);await keyboardTurn()
 assert.equal(h.events.filter(e=>e[1]==='close').length,1)
 t.mock.timers.tick(5000)
 await assert.rejects(running,error=>{
  assert.equal(error.message,'CONSENT_NATIVE_ACCEPTANCE_FAILED mode=keyboard phase=keyboard-ready cleanup=cleanup-drain-after-close boundary=none')
  assert.equal(unsafeConsentCleanup(error),true);assertPrivateDataExcluded(error,messages);return true
 })
 assert.equal(h.events.some(e=>e[1]==='key'||e[1]==='tail'),false);assert.equal(h.contexts.length,1);assert.deepEqual(messages,[])
 pending.reject(Error('LATE_PRIVATE_MARKER'));await keyboardTurn()
})

test('actual verifier deadline plus confirmed close drains readiness and remains zero-Tab', {timeout:2000}, async t=>{
 t.mock.timers.enable({apis:['setTimeout']})
 const messages=captureDiagnostics(t),pending=keyboardDeferred(),h=harness({readKeyboardStart:()=>pending.promise})
 const running=verifyContactConsentNativeAcceptance(h.source,h.expect,'en');running.catch(()=>{})
 await keyboardTurn();t.mock.timers.tick(30000);await keyboardTurn()
 assert.equal(h.events.filter(e=>e[1]==='close').length,1)
 pending.reject(Error('CONTEXT_TERMINATED'))
 await assert.rejects(running,error=>{
  assert.equal(error.message,'CONSENT_NATIVE_ACCEPTANCE_FAILED mode=keyboard phase=keyboard-ready cleanup=none boundary=none')
  assert.equal(unsafeConsentCleanup(error),false);return true
 })
 assert.equal(h.events.some(e=>e[1]==='key'),false);assert.equal(h.contexts.length,1);assert.deepEqual(messages,[])
})
