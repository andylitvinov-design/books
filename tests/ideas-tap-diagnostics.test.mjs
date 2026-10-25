import test from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import {readFile} from 'node:fs/promises'
import {installIdeasTapProbe, redactIdeasTapDiagnostic, ideasTapFailureState, withIdeasTapDiagnostics} from '../scripts/helpers/ideas-tap-diagnostics.mjs'

// Executes the actual injected callback without launching a browser/network.
// This verifies diagnostic semantics and isolation, not WebKit acceptance.
const secret = 'PRIVATE_QUESTION_URL_ERROR_ATTRIBUTE'
function fixture({failAdd = 0, failObserve = false} = {}) {
  const listeners = [], removed = [], observations = [], attempts = [], styles = new Map()
  let clock = 0, addCalls = 0
  const fail = name => () => { attempts.push(name); throw Error(secret) }
  const emitter = name => ({
    addEventListener(type, fn, options) {
      addCalls++; if (addCalls === failAdd) throw Error(secret)
      listeners.push({owner: this, name, type, fn, ...options})
    },
    removeEventListener(type, fn, capture) {
      removed.push({owner: this, type, fn, capture})
      const found = listeners.find(row => row.owner === this && row.type === type && row.fn === fn && row.capture === capture)
      if (found) found.removed = true
    },
  })
  const state = {value: '', expanded: 'false', hidden: true, disabled: false, scrollY: 0, y: 600, padding: '0px', navDisplay: 'none', hit: null}
  const node = (name, extra = {}) => {
    const result = {isConnected: true, child: null,
      contains(target) { return target === this || target === this.child },
      getBoundingClientRect() { return {x: 20, y: name === 'button' ? state.y : 400, width: 200, height: 44} },
      getAttribute(key) { assert.equal(key, 'aria-expanded'); return state.expanded },
      ...extra,
    }
    for (const key of ['textContent','innerHTML','outerHTML','id','name','href','className','dataset','attributes']) Object.defineProperty(result, key, {get: fail(key)})
    for (const key of ['focus','blur','click','scrollIntoView','scrollIntoViewIfNeeded','setAttribute','dispatchEvent','appendChild','remove']) result[key] = fail(key)
    result.style = {setProperty: fail('style.setProperty'), removeProperty: fail('style.removeProperty')}
    const style = {get paddingTop() {return '0px'}, get paddingBottom() {return state.padding}, get display() {return state.navDisplay}, visibility: 'visible',
      getPropertyValue(key) {assert.equal(key, '--ia222-bottom-height'); return state.padding}}
    styles.set(result, style)
    return result
  }
  const refs = {input: node('input'), button: node('button'), panel: node('panel'), nav: node('nav'), other: node('other'), outside: node('outside')}
  refs.button.child = node('icon')
  for (const [target, key, read] of [[refs.input,'value',()=>state.value],[refs.button,'disabled',()=>state.disabled],[refs.panel,'hidden',()=>state.hidden]])
    Object.defineProperty(target, key, {get: read, set: fail(key)})
  const selectorNodes = {'#ideas-question':refs.input,'[data-ideas-free-test]':refs.button,'[data-ideas-filtered-tests]':refs.panel}
  refs.root = node('root', {querySelector(selector) {assert.ok(Object.hasOwn(selectorNodes, selector)); return selectorNodes[selector]},
    contains(target) {return Object.values(selectorNodes).includes(target) || target === refs.other || target === refs.button.child}})
  refs.body = node('body'); refs.html = node('html', {clientWidth:320, clientHeight:844, scrollWidth:320, scrollHeight:2400})
  const document = {...emitter('document'), body:refs.body, documentElement:refs.html, activeElement: refs.input,
    querySelector(selector) {
      if (selector === '[data-ideas-discovery]') return refs.root
      if (selector === '.ia222-bottom-navigation') return refs.nav
      if (selector === '[data-ideas-discovery] #ideas-question') return refs.input
      if (selector === '[data-ideas-discovery] [data-ideas-free-test]') return refs.button
      throw Error(secret)
    }, elementFromPoint: () => state.hit ?? refs.button.child,
  }
  const viewport = {...emitter('viewport'), width:320,height:844,offsetLeft:0,offsetTop:0,scale:1}
  const location = {origin:'http://127.0.0.1:3100', pathname:'/en/books', search:'', hash:''}
  Object.defineProperty(location, 'href', {get: fail('location.href')})
  const window = {location, innerWidth:320,innerHeight:844,scrollX:0,get scrollY(){return state.scrollY},visualViewport:viewport}
  for (const name of ['scrollTo','scrollBy','requestAnimationFrame','setTimeout','setInterval','queueMicrotask','fetch','open']) window[name] = fail(name)
  const sandbox = {window,document,performance:{now:()=>clock++},getComputedStyle:target=>{assert.ok(styles.has(target));return styles.get(target)},
    MutationObserver: class {
      constructor(callback) {this.callback=callback;observations.push(this)}
      observe(root,options) {this.root=root;this.options=options;if(failObserve)throw Error(secret)}
      disconnect() {this.disconnected=true}
    }, ...Object.fromEntries(['requestAnimationFrame','setTimeout','setInterval','queueMicrotask','fetch'].map(name=>[name,fail(name)])),
  }
  const evaluate = (fn, arg) => vm.runInNewContext(`(${fn.toString()})(${JSON.stringify(arg)})`,sandbox)
  const install = (fn=installIdeasTapProbe) => evaluate(fn,{expectedOrigin:'http://127.0.0.1:3100',expectedPath:'/en/books'})
  const finish = () => JSON.parse(JSON.stringify(window.__ideasTapProbe.stop()))
  const emit = (type,target=refs.button,between=()=>{},bubble=true,extra={},owner=document) => {
    const event={target,relatedTarget:null,isTrusted:true,defaultPrevented:false,isPrimary:true,pointerType:'touch',clientX:30,clientY:610,
      preventDefault:fail('preventDefault'),stopPropagation:fail('stopPropagation'),stopImmediatePropagation:fail('stopImmediatePropagation'),...extra}
    for (const row of listeners.filter(row=>!row.removed&&row.owner===owner&&row.type===type&&row.capture))row.fn(event)
    between(event)
    if(bubble)for(const row of listeners.filter(row=>!row.removed&&row.owner===owner&&row.type===type&&!row.capture))row.fn(event)
    return event
  }
  return {state,refs,document,window,viewport,sandbox,styles,listeners,removed,observations,attempts,evaluate,install,finish,emit}
}

function assertPrivacy(data) {
  const text=JSON.stringify(data)
  for(const forbidden of [secret,'http://','/en/books'])assert.ok(!text.includes(forbidden),'No private strings or URL in diagnostic')
}
function assertPassive(f) {
  assert.ok(f.listeners.length>0)
  assert.ok(f.listeners.every(row=>row.passive===true),'Every listener must be passive')
  assert.deepEqual(f.attempts,[],'No action, scheduling, DOM mutation, or private DOM reads')
}

test('actual callback observes one normal native activation, input state and fixed phases without intervening',()=>{
  const f=fixture();assert.equal(f.install(),true);f.state.value=secret;f.emit('input',f.refs.input)
  f.emit('pointerdown');f.emit('touchstart',f.refs.button);f.emit('pointerup');f.emit('touchend',f.refs.button)
  f.emit('click',f.refs.button,()=>{f.state.expanded='true';f.state.hidden=false;f.document.activeElement=f.refs.button})
  f.observations[0].callback();const data=f.finish();assertPassive(f);assertPrivacy(data)
  const click=data.entries.filter(row=>row.kind==='click')
  assert.deepEqual(click.map(row=>[row.phase,row.state.expanded]),[['capture','false'],['bubble','true']])
  assert.equal(data.final.question,'nonempty');assert.equal(data.final.inputLength,secret.length)
  assert.equal(data.final.expanded,'true');assert.equal(data.final.panelHidden,false)
  assert.equal(f.state.value,secret);assert.equal(data.final.activeTarget,'button')
  assert.equal(data.entries.filter(row=>row.kind==='mutation').length,1)
  assert.deepEqual(Array.from(f.observations[0].options.attributeFilter),['aria-expanded','hidden'])
})

test('missed tap captures focus loss, moved target, outside hit and unchanged chooser',()=>{
  const f=fixture();f.install();f.state.value=secret;f.emit('pointerdown')
  f.document.activeElement=f.refs.body;f.state.padding='84px';f.state.navDisplay='grid';f.state.y=520;f.state.scrollY=80
  f.emit('focusout',f.refs.input,()=>{},true,{relatedTarget:f.refs.body});f.state.hit=f.refs.outside
  f.emit('scroll',f.document);f.emit('pointerup',f.refs.outside);f.emit('click',f.refs.outside)
  const data=f.finish();assertPassive(f);assertPrivacy(data)
  assert.equal(data.entries.find(row=>row.kind==='click').target,'outside');assert.equal(data.final.expanded,'false')
  assert.deepEqual(data.finalGeometry.button,[20,520,200,44]);assert.deepEqual(data.finalGeometry.bodyPadding,[0,84])
  assert.equal(data.finalGeometry.navDisplay,'grid');assert.equal(data.finalGeometry.hitAtButtonCenter,'outside')
  assert.deepEqual(data.finalGeometry.scroll,[0,80])
})

test('touch coordinates, cancellation and prevented native events remain observable, not rewritten',()=>{
  const f=fixture();f.install()
  const event=f.emit('touchend',f.refs.button.child,()=>{},true,{changedTouches:[{clientX:57,clientY:611}],pointerType:secret})
  f.emit('pointercancel');f.emit('touchcancel');f.emit('click',f.refs.button,e=>{e.defaultPrevented=true},false)
  const data=f.finish();assertPassive(f);assertPrivacy(data)
  assert.deepEqual(data.entries.find(row=>row.kind==='touchend').point,[57,611])
  assert.equal(data.entries.find(row=>row.kind==='touchend').target,'button')
  assert.equal(data.entries.find(row=>row.kind==='touchend').pointer,'other')
  assert.deepEqual(data.entries.filter(row=>row.kind==='click').map(row=>row.phase),['capture'])
  assert.equal(event.defaultPrevented,false);assert.equal(data.final.expanded,'false')
})

test('double dispatch and replaced button have distinct numeric identity/state evidence',()=>{
  const f=fixture();f.install()
  f.emit('click',f.refs.button,()=>{f.state.expanded='true'})
  f.emit('click',f.refs.button,()=>{f.state.expanded='false'})
  const old=f.refs.root.querySelector;let replaced=false
  const replacement={...f.refs.button};f.refs.root.querySelector=s=>s==='[data-ideas-free-test]'&&replaced?replacement:old(s)
  replaced=true;f.observations[0].callback();const data=f.finish()
  assert.deepEqual(data.entries.filter(row=>row.kind==='click').map(row=>row.state.expanded),['false','true','true','false'])
  assert.notEqual(data.entries[0].state.button,data.final.button);assert.equal(data.final.expanded,'false');assertPrivacy(data)
})

test('viewport events are categorized without reading EventTarget as a DOM Node',()=>{
  const f=fixture();f.install();f.viewport.height=500;f.viewport.offsetTop=34
  f.emit('resize',f.viewport,()=>{},false,{},f.viewport);f.emit('scroll',f.viewport,()=>{},false,{},f.viewport)
  const data=f.finish();assertPassive(f)
  assert.deepEqual(data.entries.filter(row=>row.kind.startsWith('viewport')).map(row=>[row.kind,row.target]),[['viewport-resize','document'],['viewport-scroll','document']])
  assert.deepEqual(data.finalGeometry.viewport,[320,844,320,500,0,34,1])
})

test('bounded events/scroll/layout retain final state and all listeners and observer are stopped',()=>{
  const f=fixture();f.install()
  for(let i=0;i<20;i++)f.emit('scroll',f.document)
  for(let i=0;i<100;i++)f.emit('pointerdown')
  f.state.expanded='true';const data=f.finish()
  assert.equal(data.entries.length,96);assert.equal(data.layouts.length,20);assert.ok(data.dropped>0);assert.ok(data.droppedLayouts>0)
  assert.equal(data.droppedScroll,12);assert.equal(data.entries.filter(row=>row.kind==='scroll').length,8)
  assert.equal(data.final.expanded,'true');assert.equal(f.removed.length,27);assert.ok(f.listeners.every(row=>row.removed))
  assert.equal(f.observations[0].disconnected,true);assert.equal(f.window.__ideasTapProbe,undefined)
  const before=JSON.stringify(data);f.observations[0].callback();f.emit('click');assert.equal(JSON.stringify(data),before)
})

test('hostile style values, URLs, attributes, error text, and nonfinite numbers never escape',()=>{
  const f=fixture();f.state.value=secret;f.state.expanded=secret;f.state.padding=secret;f.state.navDisplay=secret
  f.window.location.pathname='/'+secret;f.window.location.origin='https://'+secret;f.window.location.search='?'+secret;f.window.location.hash='#'+secret
  f.refs.button.getBoundingClientRect=()=>({x:Infinity,y:secret,width:NaN,height:-Infinity})
  f.install();f.emit('click',f.refs.outside);const data=f.finish();assertPrivacy(data);assertPassive(f)
  assert.equal(data.final.sameOrigin,false);assert.equal(data.final.samePath,false);assert.equal(data.final.queryAbsent,false);assert.equal(data.final.fragmentAbsent,false)
  assert.equal(data.final.expanded,'other');assert.deepEqual(data.finalGeometry.button,[null,null,null,null]);assert.equal(data.finalGeometry.bottomHeight,null)
  assert.equal(data.finalGeometry.navDisplay,'other')
})

test('read failures are unavailable observations and cannot throw during dispatch or cleanup',()=>{
  const f=fixture();f.install();f.sandbox.getComputedStyle=()=>{throw Error(secret)};f.refs.root.querySelector=()=>{throw Error(secret)}
  assert.doesNotThrow(()=>f.emit('pointerdown'));const data=f.finish();assertPrivacy(data)
  assert.deepEqual(data.final,{available:false});assert.deepEqual(data.finalGeometry,{available:false})
  assert.ok(f.listeners.every(row=>row.removed));assert.equal(f.observations[0].disconnected,true)
})

test('startup failures roll back partially registered listeners and observer without a global',()=>{
  for(const options of [{failAdd:6},{failObserve:true}]) {
    const f=fixture(options);assert.throws(f.install,/IDEAS_PROBE_INSTALL_FAILED/)
    assert.ok(f.listeners.every(row=>row.removed));assert.equal(f.observations[0].disconnected,true);assert.equal(f.window.__ideasTapProbe,undefined);assertPassive(f)
  }
})

test('missing root and duplicate startup do not overwrite an existing observer',()=>{
  const f=fixture();f.install();const installed=f.window.__ideasTapProbe,count=f.listeners.length
  assert.throws(f.install,/IDEAS_PROBE_ALREADY_INSTALLED/);assert.equal(f.window.__ideasTapProbe,installed);assert.equal(f.listeners.length,count);f.finish()
  const missing=fixture();missing.document.querySelector=()=>null;assert.throws(missing.install,/IDEAS_PROBE_ROOT_MISSING/);assert.equal(missing.listeners.length,0)
})

async function logged(run) {
  const logs=[],original=console.log;console.log=(...args)=>logs.push(args)
  try{return {value:await run(),logs}}finally{console.log=original}
}
const options={origin:'http://127.0.0.1:3100',locale:'en',width:320,browser:'webkit'}

test('wrapper executes once, logs sanitized success and cleans before returning the native result',async()=>{
  const f=fixture(),calls=[]
  const result=await logged(()=>withIdeasTapDiagnostics({evaluate:async(fn,arg)=>{calls.push('evaluate');return f.evaluate(fn,arg)}},options,async()=>{calls.push('native');return 17}))
  assert.equal(result.value,17);assert.deepEqual(calls,['evaluate','native','evaluate']);assert.equal(result.logs.length,1)
  assert.equal(result.logs[0][0],'SYNTHETIC_IDEAS_NATIVE_TAP');assert.equal(JSON.parse(result.logs[0][1]).outcome,'captured')
  assert.equal(f.window.__ideasTapProbe,undefined);assert.ok(f.listeners.every(row=>row.removed))
})

test('install failure cannot suppress/retry the native operation or stop an unowned probe',async()=>{
  const primary=Error('original native failure'),calls=[]
  const result=await logged(async()=>{
    await assert.rejects(withIdeasTapDiagnostics({evaluate:async()=>{calls.push('evaluate');throw Error(secret)}},options,async()=>{calls.push('native');throw primary}),error=>error===primary)
  })
  assert.deepEqual(calls,['evaluate','native','evaluate']);assert.equal(result.logs.length,1);assertPrivacy(result.logs)
  assert.equal(JSON.parse(result.logs[0][1]).outcome,'unavailable')
})


test('lost install response still cleans owned listeners; duplicate observer remains owned elsewhere',async()=>{
  const f=fixture();let calls=0
  await logged(()=>withIdeasTapDiagnostics({evaluate:async(fn,arg)=>{
    const result=f.evaluate(fn,arg);if(++calls===1)throw Error(secret);return result
  }},options,async()=>7))
  assert.equal(f.window.__ideasTapProbe,undefined);assert.ok(f.listeners.every(row=>row.removed))
  const duplicate=fixture();duplicate.install();const foreign=duplicate.window.__ideasTapProbe
  await logged(()=>withIdeasTapDiagnostics({evaluate:async(fn,arg)=>duplicate.evaluate(fn,arg)},options,async()=>8))
  assert.equal(duplicate.window.__ideasTapProbe,foreign);assert.ok(duplicate.listeners.every(row=>!row.removed));duplicate.finish()
})

test('cleanup failure preserves both native rejection identity and native success',async()=>{
  for(const reject of [false,true]) {
    const primary=Error('original native failure');let evaluations=0,runs=0
    const execute=()=>withIdeasTapDiagnostics({evaluate:async()=>{if(++evaluations===1)return true;throw Error(secret)}},options,async()=>{runs++;if(reject)throw primary;return 23})
    await logged(async()=>{if(reject)await assert.rejects(execute,error=>error===primary);else assert.equal(await execute(),23)})
    assert.equal(evaluations,2);assert.equal(runs,1)
  }
})

test('logging failure cannot mask the original rejection or change its result',async()=>{
  const original=console.log,primary=Error('native');console.log=()=>{throw Error(secret)}
  try {
    await assert.rejects(withIdeasTapDiagnostics({evaluate:async()=>false},options,async()=>{throw primary}),error=>error===primary)
    assert.equal(await withIdeasTapDiagnostics({evaluate:async()=>false},options,async()=>42),42)
  } finally {console.log=original}
})

test('Node redactor reconstructs fixed fields and strips malicious page globals/toJSON',()=>{
  const hostile={outcome:'captured',private:secret,entries:Array.from({length:110},()=>({kind:secret,phase:secret,target:secret,point:[secret,Infinity],ms:secret,private:secret,state:{available:true,inputLength:secret,expanded:secret,activeTarget:secret,toJSON:()=>secret}})),
    layouts:Array.from({length:25},()=>({row:secret,geometry:{available:true,button:[secret,NaN,Infinity,-Infinity],navDisplay:secret,toJSON:()=>secret}})),
    final:{available:true,question:secret},finalGeometry:{available:true,hitAtPoint:secret},toJSON:()=>secret}
  const data=redactIdeasTapDiagnostic(hostile);assertPrivacy(data);assert.equal(data.entries.length,96);assert.equal(data.layouts.length,20)
  assert.equal(data.entries[0].kind,'other');assert.equal(data.entries[0].state.inputLength,null)
  assert.deepEqual(data.entries[0].point,[null,null]);assert.equal(data.final.question,'other')
  assert.deepEqual(redactIdeasTapDiagnostic(new Proxy({},{get(){throw Error(secret)}})),{schemaVersion:1,outcome:'unavailable'})
})

test('failure summary records only navigation booleans, length and allowlisted aria state',async()=>{
  const f=fixture();f.state.value=secret;f.window.location.search='?'+secret
  const data=await ideasTapFailureState({evaluate:async(fn,arg)=>f.evaluate(fn,arg)},options)
  assertPrivacy(data);assert.equal(data.inputLength,secret.length);assert.equal(data.sameOrigin,true);assert.equal(data.samePath,true);assert.equal(data.queryAbsent,false);assert.equal(data.expanded,'false')
  assert.deepEqual(await ideasTapFailureState({evaluate:async()=>{throw Error(secret)}},options),{available:false})
})

function mutant(from,to) {
  const source=installIdeasTapProbe.toString();assert.ok(source.includes(from));return vm.runInNewContext('('+source.replace(from,to)+')')
}

test('executable negative controls detect nonpassive listeners and a diagnostic focus side effect',()=>{
  for(const changed of [mutant('passive: true','passive: false'),mutant("record('start', 'snapshot')","root.querySelector('#ideas-question').focus(); record('start', 'snapshot')")]) {
    const f=fixture();try{f.install(changed)}catch{};assert.throws(()=>assertPassive(f));f.window.__ideasTapProbe?.stop()
  }
})

test('executable negative controls detect private string export, unbounded events and missing teardown',()=>{
  const leak=fixture();leak.state.value=secret;leak.install(mutant("outcome: 'captured', entries", "outcome: 'captured', private: root.querySelector('#ideas-question').value, entries"));assert.throws(()=>assertPrivacy(leak.finish()))
  const unbounded=fixture();unbounded.install(mutant('entries.length >= 96','entries.length >= 9600'));for(let i=0;i<100;i++)unbounded.emit('click');assert.throws(()=>assert.ok(unbounded.finish().entries.length<=96))
  const cleanup=fixture();cleanup.install(mutant('target.removeEventListener(type, listener, capture)','void listener'));cleanup.finish();assert.throws(()=>assert.ok(cleanup.listeners.every(row=>row.removed)))
})

test('integration keeps the original fill-delay-single-native-tap and 12 second assertion sequence',async()=>{
  const source=await readFile(new URL('../scripts/verify-ideas-mobile-browser.mjs',import.meta.url),'utf8')
  const begin=source.indexOf('const filtered = await withIdeasTapDiagnostics('),end=source.indexOf('    assert.equal(await testAction.getAttribute("aria-expanded"), "true");',begin)
  assert.ok(begin>0&&end>begin);const section=source.slice(begin,end)
  assert.match(section,/async \(\) => \{\s*await hub\.locator\("#ideas-question"\)\.fill\(/)
  assert.match(section,/await page\.waitForTimeout\(120\);\s*await testAction\.tap\(\);\s*const filtered = hub\.locator\('\[data-ideas-filtered-tests\]:visible'\);\s*try \{\s*await filtered\.waitFor\(\{ state: "visible", timeout: 12000 \}\);/)
  assert.equal(section.split('await testAction.tap();').length-1,1)
  assert.equal(section.split('waitForTimeout').length-1,1)
  assert.doesNotMatch(section,/force\s*:|\.focus\(|\.blur\(|\.click\(|dispatchEvent|scrollIntoView|retry|catch \([^)]*\)|inputValue|page\.url\(|cause/)
  assert.match(section,/throw new Error\(label \+ ": free test chooser did not open; " \+ JSON\.stringify\(failure\)\)/)
  assert.equal(source.split('await page.screenshot(').length-1,2,'Existing screenshot count preserved')
  assert.match(source,/for \(const width of widths\) await verify\(webkit, locale, width\)/)
})

async function executeIntegratedAction({failWait=false,failTap=false,transform=value=>value}={}) {
  const source=await readFile(new URL('../scripts/verify-ideas-mobile-browser.mjs',import.meta.url),'utf8')
  const begin=source.indexOf('const filtered = await withIdeasTapDiagnostics('),end=source.indexOf('    assert.equal(await testAction.getAttribute("aria-expanded"), "true");',begin)
  const body=source.slice(begin,end).match(/async \(\) => (\{[\s\S]*?\n    \})\);/)[1]
  const calls=[],nativeError=Error(secret),filtered={waitFor:async value=>{calls.push(['waitFor',value]);if(failWait)throw nativeError}}
  const sandbox={locale:'en',origin:options.origin,label:'webkit:en:320',
    hub:{locator:selector=>selector==='#ideas-question'?{fill:async value=>calls.push(['fill',value])}:filtered},
    page:{waitForTimeout:async value=>calls.push(['delay',value])},
    testAction:{tap:async()=>{calls.push(['tap']);if(failTap)throw nativeError}},
    ideasTapFailureState:async()=>{calls.push(['failure-summary']);return {sameOrigin:true,inputLength:26,expanded:'false'}},
  }
  const run=vm.runInNewContext('(async () => '+transform(body)+')',sandbox)
  return {calls,nativeError,filtered,run}
}

test('actual integrated callback executes the unchanged action ordering and fails with a redacted summary',async()=>{
  const success=await executeIntegratedAction();assert.equal(await success.run(),success.filtered)
  assert.deepEqual(JSON.parse(JSON.stringify(success.calls)),[['fill','I feel anxious and stressed'],['delay',120],['tap'],['waitFor',{state:'visible',timeout:12000}]])
  const failed=await executeIntegratedAction({failWait:true})
  await assert.rejects(failed.run,error=>error.message.startsWith('webkit:en:320: free test chooser did not open; ')&&!error.message.includes(secret)&&!error.cause)
  assert.deepEqual(failed.calls.map(row=>row[0]),['fill','delay','tap','waitFor','failure-summary'])
  const tap=await executeIntegratedAction({failTap:true});await assert.rejects(tap.run,error=>error===tap.nativeError)
  assert.deepEqual(tap.calls.map(row=>row[0]),['fill','delay','tap'])
})

test('executable integration mutation control detects a second native tap',async()=>{
  const changed=await executeIntegratedAction({transform:body=>body.replace('await testAction.tap();','await testAction.tap(); await testAction.tap();')})
  await changed.run();assert.throws(()=>assert.deepEqual(changed.calls.map(row=>row[0]),['fill','delay','tap','waitFor']))
})
