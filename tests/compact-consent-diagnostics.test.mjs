import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { installCompactConsentProbe, observeCompactConsentCheck } from '../scripts/helpers/compact-consent-diagnostics.mjs'

// EventTarget-shaped observer fixture only; this is not a native browser pass.
function fixture() {
  const listeners = [], removed = [], reads = [], mutations = []
  const box = {left:10.12345, top:720.56789, right:32.12345, bottom:742.56789, width:22, height:22}
  const node = name => ({name, isConnected:true, getBoundingClientRect() {reads.push(name); return {...box}}, contains(target) {return target === this}})
  const consent = {...node('consent'), checked:false, disabled:false, required:true}
  const phone = node('phone'), label = node('label'), nav = node('navigation'), other = node('other')
  label.contains = target => [label, consent].includes(target)
  consent.closest = selector => {assert.equal(selector, 'label'); return label}
  for (const element of [consent, phone, label, nav, other]) {
    for (const key of ['textContent','innerHTML','value','href','className','id'])
      Object.defineProperty(element, key, {get() {assert.fail('Private/raw property read: ' + key)}})
    for (const method of ['focus','click','scrollIntoView','dispatchEvent','setAttribute'])
      element[method] = () => {mutations.push(method); assert.fail('Observer must not mutate: ' + method)}
  }
  let currentConsent = consent, hit = consent
  const form = {...node('form'), contains:target => [form, consent, phone, label].includes(target),
    querySelector(selector) {
      if (selector === 'input[type="checkbox"]') return currentConsent
      assert.equal(selector, 'input[type="tel"]'); return phone
    }}
  const doc = {
    activeElement:phone, documentElement:{scrollHeight:10000.44444},
    defaultView:{scrollY:9000.44444,innerHeight:844,innerWidth:390,
      getComputedStyle(element) {assert.equal(element,nav); return {display:'grid',visibility:'visible',pointerEvents:'auto'}}},
    querySelector(selector) {assert.equal(selector,'.mobile-bottom-navigation'); return nav},
    elementFromPoint(x,y) {assert.ok(Number.isFinite(x) && Number.isFinite(y)); return hit},
    addEventListener(type,listener,options) {assert.equal(options.passive,true); listeners.push({type,listener,capture:options.capture})},
    removeEventListener(type,listener,capture) {const index=listeners.findIndex(item=>item.type===type&&item.listener===listener&&item.capture===capture); assert.ok(index>=0); removed.push(listeners.splice(index,1)[0])},
  }
  form.ownerDocument = doc
  return {form,doc,consent,phone,label,nav,other,listeners,removed,mutations,
    hit(value) {hit=value}, replaceConsent(value) {currentConsent=value},
    fire(type, {target=consent,trusted=true,defaultPrevented=false,x=20.12345,y=730.56789}={}) {
      const event = {type,target,isTrusted:trusted,defaultPrevented,clientX:x,clientY:y,
        preventDefault() {assert.fail('Never prevent native events')}, stopPropagation() {assert.fail('Never stop native events')}}
      for (const item of [...listeners].filter(item=>item.type===type)) item.listener(event)
    },
  }
}

test('passive observer records actual supplied event phases and state, not text/contact/application values', () => {
  const f = fixture(), probe = installCompactConsentProbe(f.form)
  assert.equal(f.listeners.length,18)
  assert.equal(probe.read().initial.checked,false)
  f.fire('pointerdown'); f.fire('mousedown')
  f.doc.activeElement = f.consent
  f.fire('focusout',{target:f.phone}); f.fire('focusin')
  // The fixture drives state; the observer is forbidden to do so.
  f.consent.checked = true
  f.fire('pointerup'); f.fire('mouseup'); f.fire('click')
  f.fire('input'); f.fire('change')
  const output = probe.read()
  assert.equal(output.current.checked,true)
  assert.equal(output.current.activeConsent,true)
  assert.equal(output.current.activePhone,false)
  assert.deepEqual(output.counts,Array.from({length:9},()=>({capture:1,bubble:1,trusted:1})))
  assert.deepEqual(output.events.map(event=>event.kind),[1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9])
  assert.deepEqual(output.events[0].point,{x:20.1,y:730.6})
  assert.deepEqual(output.events[0].consent,{left:10.1,top:720.6,right:32.1,bottom:742.6,width:22,height:22})
  assert.deepEqual(f.mutations,[])
  assert.doesNotMatch(JSON.stringify(output),/private|example|https|name|value|text|className|href/i)
  probe.dispose(); assert.equal(f.listeners.length,0); assert.equal(f.removed.length,18)
})

test('observer distinguishes remount, overlay interception and prevented synthetic event without asserting success', () => {
  const f = fixture(), probe = installCompactConsentProbe(f.form)
  f.consent.isConnected=false; f.replaceConsent({...f.consent}); f.hit(f.nav)
  f.fire('click',{target:f.nav,trusted:false,defaultPrevented:true})
  const output=probe.read(), event=output.events[0]
  assert.equal(output.current.sameConsent,false); assert.equal(output.current.consentConnected,false)
  assert.equal(output.current.checked,false)
  assert.equal(event.targetNavigation,true); assert.equal(event.hitNavigation,true)
  assert.equal(event.targetConsent,false); assert.equal(event.hitConsent,false)
  assert.equal(event.defaultPrevented,true); assert.equal(event.trusted,false)
  assert.deepEqual(output.counts[6],{capture:1,bubble:1,trusted:0})
  probe.dispose()
})

test('serialization stays finite, rounded and capped under repeated events and geometry errors', () => {
  const f=fixture(), probe=installCompactConsentProbe(f.form)
  f.doc.defaultView.scrollY=Infinity
  f.doc.defaultView.innerWidth=1e20
  for(let i=0;i<100;i++) f.fire('click',{x:NaN,y:Infinity})
  let output=probe.read()
  assert.equal(output.events.length,48); assert.equal(output.dropped,152)
  assert.equal(output.current.scrollY,null); assert.equal(output.current.viewportWidth,10000000)
  assert.equal(output.events[0].point,null)
  const serialized=JSON.stringify(output)
  assert.ok(serialized.length<65000, 'One bounded JSON record, never raw DOM/event objects')
  assert.equal(JSON.parse(serialized).events.length,48)
  probe.dispose()
  const broken=fixture(), observed=installCompactConsentProbe(broken.form)
  broken.consent.getBoundingClientRect=()=>{throw Error('synthetic geometry failure')}
  assert.doesNotThrow(()=>broken.fire('click'))
  broken.consent.getBoundingClientRect=()=>({})
  assert.equal(observed.read().errors,2)
  observed.dispose()
})

function handles({read=()=>({events:[],checked:false}),evaluateDispose=()=>{},dispose=()=>{}}={}) {
  const calls=[]
  const handle={async evaluate(fn) {calls.push(fn.toString()); return fn({read,dispose:evaluateDispose})},async dispose() {calls.push('handle.dispose'); return dispose()}}
  return {handle,calls,form:{async evaluateHandle(fn) {assert.equal(fn,installCompactConsentProbe); calls.push('install'); return handle}}}
}

test('wrapper runs the native check exactly once and logs bounded evidence only on its original failure',async()=>{
  const f=handles(), failure=Error('original check failed'), logs=[]
  let count=0
  await assert.rejects(observeCompactConsentCheck(f.form,async()=>{count++;throw failure},{log:(...args)=>logs.push(args)}),error=>error===failure)
  assert.equal(count,1); assert.equal(logs.length,1)
  assert.equal(logs[0][0],'COMPACT_PHONE_CONSENT_FAILURE')
  assert.deepEqual(JSON.parse(logs[0][1]),{installOutcome:'completed',readOutcome:'completed',evidence:{events:[],checked:false}})
  assert.equal(f.calls.at(-1),'handle.dispose')
})

test('success does not emit a failure or manufacture another action',async()=>{
  const f=handles(), logs=[];let count=0
  assert.equal(await observeCompactConsentCheck(f.form,async()=>{count++;return 42},{log:(...args)=>logs.push(args)}),42)
  assert.equal(count,1);assert.deepEqual(logs,[]);assert.equal(f.calls.at(-1),'handle.dispose')
})

test('diagnostic install/read/cleanup/log failures cannot replace the original check exception',async()=>{
  const failure=Error('preserved native failure')
  for(const fault of ['install','read','cleanup','log']) {
    const f=handles({read:()=>{if(fault==='read')throw Error('read');return{}},evaluateDispose:()=>{if(fault==='cleanup')throw Error('cleanup')}})
    if(fault==='install')f.form.evaluateHandle=async()=>{throw Error('install')}
    let count=0
    await assert.rejects(observeCompactConsentCheck(f.form,async()=>{count++;throw failure},{log:()=>{if(fault==='log')throw Error('sink')}}),error=>error===failure)
    assert.equal(count,1)
    if(fault!=='install')assert.equal(f.calls.at(-1),'handle.dispose')
  }
})

test('hung evidence is bounded and a late installation disposes its observer without retrying the action',async()=>{
  const failure=Error('native check'), logs=[]
  let resolve, disposed=0, native=0
  const f=handles({evaluateDispose:()=>disposed++})
  f.form.evaluateHandle=()=>new Promise(done=>{resolve=done})
  await assert.rejects(observeCompactConsentCheck(f.form,async()=>{native++;throw failure},{timeoutMs:10,log:(...args)=>logs.push(args)}),error=>error===failure)
  assert.deepEqual(JSON.parse(logs[0][1]),{installOutcome:'timed_out',readOutcome:'not_installed',evidence:null})
  resolve(f.handle);await new Promise(done=>setImmediate(done))
  assert.equal(disposed,1);assert.equal(native,1)
  const hung=handles({read:()=>new Promise(()=>{})}), hungLogs=[]
  await assert.rejects(observeCompactConsentCheck(hung.form,async()=>{throw failure},{timeoutMs:10,log:(...args)=>hungLogs.push(args)}),error=>error===failure)
  assert.equal(JSON.parse(hungLogs[0][1]).readOutcome,'timed_out')
  assert.equal(hung.calls.at(-1),'handle.dispose')
})

test('source-pinned caller keeps the original native check and real request order alongside receipt flow',()=>{
  const source=readFileSync(new URL('../scripts/helpers/contact-channel-verifier.mjs',import.meta.url),'utf8')
  assert.match(source,/import \{ observeCompactConsentCheck \} from '\.\/compact-consent-diagnostics\.mjs'/)
  const compact=source.slice(source.indexOf('export async function openRegisteredCompactPhoneChooser('))
  assert.equal(compact.match(/observeCompactConsentCheck\(/g)?.length,1)
  assert.match(compact,/await form\.locator\('\[data-phone-country-input\] input\[type="tel"\]'\)\.fill\('4165550123'\);\s+await observeCompactConsentCheck\(form, \(\) => form\.locator\('input\[type="checkbox"\]'\)\.check\(\)\);\s+await form\.locator\('button\[data-contact-channel-submit="whatsapp"\]'\)\.click\(\);/)
  assert.equal(compact.match(/\.check\(/g)?.length,1)
  assert.doesNotMatch(compact,/force\s*:|waitForTimeout|dispatchEvent|setChecked|\.checked\s*=/)
  assert.match(source,/export async function registerContactChannelRequest\(/)
})
