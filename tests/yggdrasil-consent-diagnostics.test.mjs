import test from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import {readFileSync} from 'node:fs'
import {isYggdrasilConsentDiagnosticCase, installYggdrasilConsentProbe, stopYggdrasilConsentProbe,
  withYggdrasilConsentDiagnostics} from '../scripts/helpers/yggdrasil-consent-diagnostics.mjs'

const meta = {live:false,engine:'webkit',locale:'ru',width:390,phase:'yggdrasil-personal',
  contactMethod:'email',optionalName:true,optionalNote:true}
const source = readFileSync(new URL('../scripts/verify-contact-channel-chooser-browser.mjs',import.meta.url),'utf8')
const helper = readFileSync(new URL('../scripts/helpers/yggdrasil-consent-diagnostics.mjs',import.meta.url),'utf8')
const plain = value => JSON.parse(JSON.stringify(value))

// Execute the actual serialized observer with a small DOM double. This is not
// a native-browser, CSS-layout, React or WebKit acceptance result.
function fixture() {
  const listeners = [], pending = [], observations = [], removals = [], styles = new Map()
  const refs = {selected:'personal',open:true,clock:0}
  const sized = (tagName, parentElement=null) => ({tagName,parentElement,isConnected:true,rootMember:true,chooserMember:true,
    getBoundingClientRect:()=>({x:20,y:200,width:19,height:19}), scrollLeft:0,scrollTop:0,
    clientWidth:390,clientHeight:844,scrollWidth:390,scrollHeight:6000,closest:()=>null})
  const html=sized('HTML'),body=sized('BODY',html),label=sized('LABEL',body),nav=sized('NAV')
  refs.checkbox=sized('INPUT',label); refs.checkbox.checked=false; refs.checkbox.disabled=false
  refs.submit={...sized('BUTTON'),disabled:true}
  refs.email=sized('INPUT'); refs.name=sized('INPUT'); refs.note=sized('TEXTAREA')
  refs.nameDetails={...sized('DETAILS'),open:true}; refs.noteDetails={...sized('DETAILS'),open:true}
  refs.name.closest=selector=>selector==='details'?refs.nameDetails:null
  refs.note.closest=selector=>selector==='details'?refs.noteDetails:null
  label.querySelector=selector=>selector==='input[type="checkbox"]'?refs.checkbox:null
  refs.checkbox.closest=selector=>selector==='label'?label:null
  const fields=()=>({'input[type="checkbox"]':refs.checkbox,'button[type="submit"]':refs.submit,
    'input[autocomplete="email"]':refs.email,'input[autocomplete="name"]':refs.name,'textarea':refs.note})
  refs.form={...sized('FORM'),querySelector:selector=>fields()[selector]??null,
    querySelectorAll:selector=>selector==='input[type="checkbox"]'?[refs.checkbox]:[]}
  refs.trigger={...sized('BUTTON'),getAttribute:name=>name==='aria-expanded'?String(refs.open):null}
  refs.chooser={...sized('DIV'),contains:node=>node?.chooserMember===true,
    querySelector:selector=>selector==='form'?refs.form:selector==='[data-contact-order]'?refs.trigger:
      selector==='form input[type="checkbox"]'?refs.checkbox:null}
  refs.root={...sized('SECTION'),contains:node=>node?.rootMember===true,
    querySelector:selector=>selector==='[data-contact-channel-chooser]'?refs.chooser:
      /^\[data-intent="(free|personal|pdf)"\]$/.test(selector)?{getAttribute:()=>String(selector.includes(`"${refs.selected}"`))}:null}
  const document={documentElement:html,body,activeElement:refs.note,
    querySelectorAll:selector=>selector==='[data-yggdrasil-form]'?[refs.root]:[],
    querySelector:selector=>selector==='.ia222-bottom-navigation'?nav:null,
    addEventListener:(type,listener,options)=>listeners.push({type,listener,...options}),
    removeEventListener:(type,listener,capture)=>removals.push({type,listener,capture})}
  refs.root.ownerDocument=document
  const window={location:{protocol:'http:',hostname:'127.0.0.1',port:'3100',pathname:'/ru/academy/reiki/yggdrasil/free-initiation'},
    scrollX:0,scrollY:0,innerWidth:390,innerHeight:844,
    visualViewport:{width:390,height:844,offsetLeft:0,offsetTop:0,scale:1}}
  const makeStyle=()=>({scrollMarginTop:'0px',scrollMarginRight:'0px',scrollMarginBottom:'170px',scrollMarginLeft:'0px',
    overflowX:'visible',overflowY:'visible',position:'static',scrollBehavior:'auto',scrollSnapType:'none',
    scrollPaddingTop:'0px',scrollPaddingBottom:'0px',paddingTop:'0px',paddingBottom:'84px',display:'grid',visibility:'visible',
    getPropertyValue:()=> '84px'})
  const sandbox={window,document,performance:{now:()=>refs.clock++},queueMicrotask:fn=>pending.push(fn),
    getComputedStyle:node=>{if(!styles.has(node))styles.set(node,makeStyle());return styles.get(node)},
    MutationObserver:class {constructor(callback){this.callback=callback;observations.push(this)}
      observe(root,options){this.root=root;this.options=options} disconnect(){this.disconnected=true}}}
  const evaluate=(fn,arg)=>vm.runInNewContext(`(${fn.toString()})(${JSON.stringify(arg)})`,sandbox)
  const install=(owner=1)=>evaluate(installYggdrasilConsentProbe,{owner})
  const finish=(owner=1)=>plain(evaluate(stopYggdrasilConsentProbe,{owner}))
  const emit=(type,target=refs.checkbox,afterCapture=()=>{},bubble=true)=>{
    const event={target,isTrusted:true,defaultPrevented:false,clientX:29,clientY:209}
    for(const entry of listeners.filter(x=>x.type===type&&x.capture))entry.listener(event)
    afterCapture(event)
    if(bubble)for(const entry of listeners.filter(x=>x.type===type&&!x.capture))entry.listener(event)
  }
  const drain=()=>{while(pending.length)pending.shift()()}
  return {refs,listeners,pending,observations,removals,styles,document,window,sandbox,html,body,label,nav,evaluate,install,finish,emit,drain}
}

test('only local WebKit RU390 personal metadata can install a diagnostic',async()=>{
  assert.equal(isYggdrasilConsentDiagnosticCase(meta),true)
  for(const alternate of [null,{}, {...meta,live:true},{...meta,engine:'chromium'},{...meta,locale:'en'},
    {...meta,width:320},{...meta,width:'390'},{...meta,phase:'yggdrasil-free'}]){
    const result={},calls=[]
    assert.equal(isYggdrasilConsentDiagnosticCase(alternate),false)
    assert.equal(await withYggdrasilConsentDiagnostics({evaluate:()=>assert.fail('Non-target evaluate')},alternate,
      ()=>{calls.push('run');return result},()=>assert.fail('Non-target collection')),result)
    assert.deepEqual(calls,['run'])
  }
})

test('browser scope independently rejects live, other paths, roots and intents',()=>{
  for(const mutate of [f=>f.window.location.protocol='https:',f=>f.window.location.hostname='example.test',
    f=>f.window.location.port='',f=>f.window.location.pathname='/ru/academy',f=>f.refs.selected='free',
    f=>f.document.querySelectorAll=()=>[],f=>f.document.querySelectorAll=()=>[f.refs.root,f.refs.root],
    f=>f.refs.root.isConnected=false]){
    const f=fixture();mutate(f);assert.equal(f.install(),false);assert.equal(f.listeners.length,0)
  }
})

test('normal native consent observation is passive and does not change any control',()=>{
  const f=fixture();assert.equal(f.install(),true)
  assert.equal(f.listeners.length,18);assert.ok(f.listeners.every(row=>row.passive===true))
  assert.deepEqual(Array.from(f.observations[0].options.attributeFilter),['disabled','checked','aria-expanded','aria-pressed','hidden','open'])
  f.refs.checkbox.checked=true;f.refs.submit.disabled=false;f.emit('click');f.emit('input');f.emit('change');f.drain()
  const data=f.finish()
  assert.equal(data.entries[0].state.checked,false);assert.equal(data.final.checked,true)
  assert.equal(data.final.submitDisabled,false);assert.equal(data.final.selected,'personal')
  assert.equal(data.entries[0].state.activeTarget,'note')
  assert.equal(data.final.optionalNameOpen,true);assert.equal(data.final.optionalNoteOpen,true)
  assert.equal(f.refs.checkbox.checked,true);assert.equal(data.outcome,'captured')
})

test('event phases distinguish restoration and stopped propagation, not their cause',()=>{
  const f=fixture();f.install();f.refs.checkbox.checked=true
  f.emit('click',f.refs.checkbox,event=>{event.defaultPrevented=true;f.refs.checkbox.checked=false},false);f.drain()
  const events=f.finish().entries.filter(row=>row.kind==='click')
  assert.deepEqual(events.map(row=>[row.phase,row.state.checked,row.prevented]),[['capture',true,false],['microtask',false,true]])
  assert.equal(new Set(events.map(row=>row.state.checkbox)).size,1)
})

test('checkbox identity changes within the same chooser/phase are observable',()=>{
  const f=fixture();f.install();const old=f.refs.checkbox
  f.emit('change',old,()=>{f.refs.checkbox={...old,checked:true}});f.drain()
  const events=f.finish().entries.filter(row=>row.kind==='change')
  assert.notEqual(events[0].state.checkbox,events[1].state.checkbox)
  assert.equal(events[0].state.chooser,events[1].state.chooser)
  assert.equal(events[1].state.checked,true)
})

test('missed target and focus/scroll geometry are observed without moving anything',()=>{
  const f=fixture();f.install();f.emit('pointerdown');f.document.activeElement=f.refs.checkbox
  f.emit('focusin');f.window.scrollY=200
  f.refs.checkbox.getBoundingClientRect=()=>({x:20,y:400,width:19,height:19})
  f.emit('scroll',f.document);f.emit('pointerup',{});f.emit('click',{});f.drain()
  const data=f.finish()
  assert.ok(data.entries.filter(row=>row.kind==='click').every(row=>row.target==='outside'&&row.state.checked===false))
  assert.deepEqual(data.final.rect,[20,400,19,19]);assert.deepEqual(data.final.scroll,[0,200])
  assert.equal(data.finalGeometry.available,true);assert.deepEqual(data.finalGeometry.clearance,[0,0,170,0])
})

test('transcript, scroll and geometry caps retain final state and dropped counters',()=>{
  const f=fixture();f.install();f.document.activeElement=f.refs.checkbox
  let parent=f.body
  for(let i=0;i<20;i++)parent={...f.label,parentElement:parent}
  f.refs.checkbox.parentElement=parent
  for(let i=0;i<20;i++)f.emit('scroll',f.document)
  for(let i=0;i<12;i++)f.emit('scrollend',f.document)
  for(let i=0;i<80;i++)f.emit('click')
  assert.ok(f.pending.length<=120,'Pending event microtasks are bounded too')
  f.refs.checkbox.checked=true
  const data=f.finish();f.drain()
  assert.equal(data.entries.length,120);assert.ok(data.dropped>0);assert.equal(data.droppedScroll,12)
  assert.equal(data.layouts.length,8);assert.ok(data.droppedLayouts>0);assert.equal(data.scrollEnds,12)
  assert.equal(data.finalGeometry.ancestors.length,12);assert.equal(data.finalGeometry.ancestorLimitReached,true)
  assert.equal(data.final.checked,true);assert.equal(f.removals.length,18);assert.equal(f.observations[0].disconnected,true)
  assert.equal(f.window.__yggdrasilConsentProbe,undefined)
})

test('root/path/intent scope loss makes pending and late callbacks inert',()=>{
  for(const [reason,mutate] of [['root',f=>f.refs.root.isConnected=false],['path',f=>f.window.location.pathname='/private-later'],
    ['intent',f=>f.refs.selected='free']]){
    const f=fixture();f.install();f.emit('click');const count=f.pending.length
    mutate(f);f.observations[0].callback();f.drain()
    // No state/geometry/category reads may occur after the scope has ended.
    f.refs.root.querySelector=()=>assert.fail('Late selector read')
    f.sandbox.getComputedStyle=()=>assert.fail('Late geometry read')
    f.emit('click',{});f.emit('scroll',f.document);f.emit('scrollend',f.document)
    const data=f.finish()
    assert.ok(count>0);assert.equal(data.scopeEnded,reason);assert.equal(data.final,null)
    assert.equal(data.entries.filter(row=>row.phase==='microtask').length,0)
    assert.equal(f.removals.length,18);assert.equal(f.observations[0].disconnected,true)
    assert.ok(!JSON.stringify(data).includes('/private-later'))
  }
})

test('duplicate and wrong-owner teardown cannot destroy another probe',()=>{
  const f=fixture();f.install(11);const original=f.window.__yggdrasilConsentProbe
  assert.equal(f.install(12),false);assert.equal(f.finish(12),null)
  assert.equal(f.window.__yggdrasilConsentProbe,original);assert.equal(f.removals.length,0)
  assert.equal(f.finish(11).outcome,'captured');assert.equal(f.window.__yggdrasilConsentProbe,undefined)
})

test('coalesced intent changes away and back cannot revive the original observation phase',()=>{
  const f=fixture();f.install();f.emit('click')
  const intentMutation={type:'attributes',attributeName:'aria-pressed',target:{matches:selector=>selector==='[data-intent]'}}
  f.observations[0].callback([intentMutation,intentMutation])
  f.refs.root.querySelector=()=>assert.fail('Later personal context read')
  f.drain();f.emit('click');const data=f.finish()
  assert.equal(data.scopeEnded,'intent');assert.equal(data.final,null);assert.equal(f.removals.length,18)
  assert.equal(data.entries.filter(row=>row.phase==='microtask').length,0)
})

test('partial installation and observation exceptions are redacted and clean up',()=>{
  const f=fixture(),add=f.document.addEventListener
  f.document.addEventListener=(...args)=>{add(...args);if(f.listeners.length===3)throw Error('PRIVATE_INSTALL')}
  assert.equal(f.install(),false);assert.equal(f.removals.length,3);assert.equal(f.window.__yggdrasilConsentProbe,undefined)
  const g=fixture();g.install();g.refs.checkbox.getBoundingClientRect=()=>{throw Error('PRIVATE_OBSERVER')}
  assert.doesNotThrow(()=>g.emit('pointerdown'));const data=g.finish()
  assert.equal(data.observationFailed,true);assert.equal(data.scopeEnded,'observation')
  assert.equal(g.removals.length,18);assert.ok(!JSON.stringify(data).includes('PRIVATE'))
  const h=fixture()
  h.sandbox.MutationObserver=class {constructor(){h.observations.push(this)}
    observe(){throw Error('PRIVATE_OBSERVE')} disconnect(){this.disconnected=true}}
  assert.equal(h.install(),false);assert.equal(h.removals.length,18)
  assert.equal(h.observations[0].disconnected,true);assert.equal(h.window.__yggdrasilConsentProbe,undefined)
})

test('cleanup tries every removal; failed removal leaves only inert callbacks',()=>{
  const f=fixture();f.install();const remove=f.document.removeEventListener
  f.document.removeEventListener=(...args)=>{remove(...args);throw Error('PRIVATE_REMOVE')}
  f.observations[0].disconnect=()=>{throw Error('PRIVATE_DISCONNECT')}
  f.emit('click');const data=f.finish();const before=JSON.stringify(data)
  f.refs.root.querySelector=()=>assert.fail('Read after failed cleanup');f.drain();f.emit('click')
  assert.equal(f.removals.length,18);assert.equal(data.cleanupFailures,19)
  assert.equal(JSON.stringify(data),before);assert.ok(!before.includes('PRIVATE'))
})

test('no field values, arbitrary DOM/text/style/URLs or errors are read/exported',()=>{
  const f=fixture(),secret='PRIVATE_VALUE_DO_NOT_READ'
  for(const node of [f.refs.checkbox,f.refs.email,f.refs.name,f.refs.note,f.refs.root,f.body,f.nav]){
    for(const property of ['value','textContent','innerHTML','outerHTML','className','id','name','href'])
      Object.defineProperty(node,property,{get(){throw Error(secret)}})
  }
  Object.defineProperty(f.window.location,'href',{get(){throw Error(secret)}})
  const style=f.sandbox.getComputedStyle(f.nav);style.display=secret;style.visibility=secret
  f.install();f.emit('pointerdown');f.drain();const data=f.finish(),text=JSON.stringify(data)
  assert.ok(!text.includes(secret));assert.ok(!text.includes('/ru/academy'));assert.equal(data.finalGeometry.nav.display,'other')
  assert.doesNotMatch(installYggdrasilConsentProbe.toString(),/\.value\b|textContent|innerHTML|outerHTML|\.href\b|\.className\b|localStorage|sessionStorage|console\./)
  assert.doesNotMatch(helper,/fetch\(|\.click\(|\.check\(|\.focus\(|\.scrollIntoView\(|\.dispatchEvent\(|\.preventDefault\(|\.stopPropagation\(|\.setAttribute\(|setTimeout|setInterval|requestAnimationFrame|Promise\.race/)
})

test('observer cannot write controls/layout, dispatch input, cancel events or schedule timers',()=>{
  const f=fixture(),attempts=[]
  const forbidden=name=>()=>{attempts.push(name);throw Error('SIDE_EFFECT')}
  for(const [node,properties] of [[f.refs.checkbox,['checked','disabled']],[f.refs.submit,['disabled']],
    [f.html,['scrollLeft','scrollTop']],[f.body,['scrollLeft','scrollTop']]]){
    for(const property of properties){const value=node[property];Object.defineProperty(node,property,{get:()=>value,set:forbidden(property)})}
    for(const method of ['click','focus','blur','scrollIntoView','setAttribute','dispatchEvent'])node[method]=forbidden(method)
  }
  for(const method of ['fetch','scrollTo','scrollBy','requestAnimationFrame','setTimeout','setInterval']){
    f.sandbox[method]=forbidden(method);f.window[method]=forbidden(method)
  }
  f.install();f.document.activeElement=f.refs.checkbox
  for(const type of ['pointerdown','focusin','scroll','pointerup','click','input','change','scrollend']){
    const event={target:type==='scrollend'?f.document:f.refs.checkbox,
      preventDefault:forbidden('preventDefault'),stopPropagation:forbidden('stopPropagation'),
      stopImmediatePropagation:forbidden('stopImmediatePropagation')}
    for(const entry of f.listeners.filter(row=>row.type===type))entry.listener(event)
  }
  f.drain();const data=f.finish()
  assert.deepEqual(attempts,[]);assert.equal(data.observationFailed,false)
  assert.equal(data.final.checked,false);assert.equal(data.final.submitDisabled,true)
})

test('microtask scheduling failure cannot escape an observational event callback',()=>{
  const f=fixture();f.install();f.sandbox.queueMicrotask=()=>{throw Error('PRIVATE_QUEUE')}
  assert.doesNotThrow(()=>f.emit('click'))
  const data=f.finish();assert.equal(data.observationFailed,true)
  assert.equal(data.scopeEnded,'observation');assert.equal(f.removals.length,18)
  assert.ok(!JSON.stringify(data).includes('PRIVATE_QUEUE'))
})

test('native success result and thrown error identities survive failed install/stop/collection',async()=>{
  for(const failing of ['none','install','stop','both','collect'])for(const nativeFailure of [false,true]){
    const native={},primary=Error('NATIVE_ERROR'),calls=[],records=[]
    const page={evaluate:async fn=>{
      const stage=fn===installYggdrasilConsentProbe?'install':'stop';calls.push(stage)
      if(failing===stage||failing==='both')throw Error('PRIVATE_DIAGNOSTIC')
      return stage==='install'?true:{schemaVersion:1,outcome:'captured'}
    }}
    const operation=()=>{calls.push('run');if(nativeFailure)throw primary;return native}
    const collect=data=>{calls.push('collect');records.push(data);if(failing==='collect')throw Error('PRIVATE_COLLECTION')}
    if(nativeFailure)await assert.rejects(withYggdrasilConsentDiagnostics(page,meta,operation,collect),error=>error===primary)
    else assert.equal(await withYggdrasilConsentDiagnostics(page,meta,operation,collect),native)
    assert.deepEqual(calls,['install','run','stop','collect']);assert.equal(records.length,1)
    assert.equal(records[0].actionOutcome,nativeFailure?'failure':'success')
    assert.ok(!JSON.stringify(records).includes('PRIVATE'));assert.ok(!JSON.stringify(records).includes('NATIVE_ERROR'))
  }
})

test('lost installation response still gets owner-matched disposal after native action',async()=>{
  const f=fixture(),records=[];let calls=0
  const page={evaluate:async(fn,arg)=>{const result=f.evaluate(fn,arg);if(++calls===1)throw Error('LOST_RESPONSE');return result}}
  const result={};assert.equal(await withYggdrasilConsentDiagnostics(page,meta,()=>result,row=>records.push(row)),result)
  assert.equal(f.window.__yggdrasilConsentProbe,undefined);assert.equal(f.removals.length,18)
  assert.equal(records[0].outcome,'captured')
})

test('failed stop evaluation leaves bounded scoped observation until existing context disposal',async()=>{
  const f=fixture(),records=[];let calls=0
  const page={evaluate:async(fn,arg)=>{if(++calls===2)throw Error('STOP_TRANSPORT');return f.evaluate(fn,arg)}}
  await withYggdrasilConsentDiagnostics(page,meta,()=>{},row=>records.push(row))
  assert.equal(records[0].outcome,'unavailable')
  assert.ok(f.window.__yggdrasilConsentProbe,'Do not claim transport failure removed a browser observer')
  f.refs.selected='free';f.observations[0].callback()
  const count=f.removals.length;f.refs.root.querySelector=()=>assert.fail('Later phase read');f.emit('click')
  assert.equal(count,18);assert.equal(f.window.__yggdrasilConsentProbe.stop().scopeEnded,'intent')
})

test('native runner metadata is allowlisted rather than serialized verbatim',async()=>{
  const records=[]
  await withYggdrasilConsentDiagnostics({evaluate:async()=>null},
    {...meta,contactMethod:'PRIVATE_METHOD',optionalName:'PRIVATE_NAME',optionalNote:'PRIVATE_NOTE',unexpected:'PRIVATE_URL'},
    ()=>{},row=>records.push(row))
  assert.equal(records[0].contactMethod,'other');assert.equal(records[0].optionalName,false)
  assert.equal(records[0].optionalNote,false);assert.ok(!JSON.stringify(records).includes('PRIVATE'))
})

test('actual submitSyntheticForm calls the unchanged native check once; failure never submits',async()=>{
  const functionSource=source.slice(source.indexOf('async function submitSyntheticForm('),source.indexOf('\nasync function verifyChooser('))
  for(const shouldFail of [true,false]){
    const calls=[],primary=Error('native check'),afterCheck=Error('stop at following submit'),diagnostics=[]
    const locator=selector=>({waitFor:async()=>calls.push(['wait',selector]),isDisabled:async()=>true,
      fill:async()=>calls.push(['fill',selector]),click:async()=>{calls.push(['click',selector]);if(selector==='button[type="submit"]')throw afterCheck},
      check:async(...args)=>{calls.push(['check',...args]);if(shouldFail)throw primary},filter(){return this},
      locator,first(){return this},nth(){return this}})
    const chooser={locator},page={evaluate:async()=>null}
    const run=vm.runInNewContext(`(${functionSource})`,{assert,withYggdrasilConsentDiagnostics,consentDiagnostics:diagnostics})
    const submissions=Array(6).fill(null)
    await assert.rejects(run(page,chooser,'ru',submissions,false,meta),error=>error===(shouldFail?primary:afterCheck))
    assert.deepEqual(calls.filter(row=>row[0]==='check'),[['check']],'No options, retry or alternate action')
    assert.equal(calls.filter(row=>row[0]==='click'&&row[1]==='button[type="submit"]').length,shouldFail?0:1)
    assert.equal(diagnostics.length,1);assert.equal(diagnostics[0].contactMethod,'email')
    assert.equal(diagnostics[0].optionalName,true);assert.equal(diagnostics[0].optionalNote,true)
  }
})

test('source wiring keeps the phase opt-in, artifact fields, assertions and cleanup',()=>{
  assert.equal((source.match(/phase:"yggdrasil-personal"/g)||[]).length,1)
  const personal=source.slice(source.indexOf('if (item.path.endsWith("/yggdrasil/free-initiation"))'),source.indexOf('\n          {\n            const daoResponse'))
  assert.match(personal,/await personal\.click\(\)/);assert.match(personal,/await button\.click\(\)/)
  assert.match(personal,/submitSyntheticForm\(page,chooser,locale,submissions,false,\s*\{live,engine:name,width,locale,phase:"yggdrasil-personal"\}\)/)
  assert.match(source,/assert\.equal\(await button\.isDisabled\(\),true,"Consent must not be pre-checked"\);\s*await withYggdrasilConsentDiagnostics/)
  assert.equal((source.match(/await form\.locator\('input\[type="checkbox"\]'\)\.check\(\);/g)||[]).length,1)
  assert.match(source,/\}, diagnostic => \{ if \(consentDiagnostics\.length < 1\) consentDiagnostics\.push\(diagnostic\); \}\);\s*const priorCount=submissions\.length;\s*await button\.click\(\);/)
  for(const unchanged of ['assert.equal(request.contactConsent,true)','Exactly one first-party registration submitted',
    'PRIVATE_QA_NOTE_NOT_FOR_MESSENGER','assert.equal(request.description,hasNote?',
    'fulfillSyntheticServiceEnquiry(route,origin,submissions,unexpectedRequests)',
    'closePublicQaContext(page,context,popups)','assert.deepEqual(guardFailures,[]',
    'origin,live,checkedAt:new Date().toISOString(),results,errors,failure:failure?.message||null'])assert.ok(source.includes(unchanged),unchanged)
  assert.match(source,/\.\.\.\(consentDiagnostics\.length \? \{consentDiagnostics\} : \{\}\)/)
  assert.doesNotMatch(source,/force\s*:|check\(\{|setChecked\(|dispatchEvent\(/)
})
