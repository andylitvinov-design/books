import assert from 'node:assert/strict'
import {ALCHEMY_NATIONAL_PHONE, alchemyOrigin, alchemyRequestGate, syntheticAlchemyReceipt} from './alchemy-enquiry-journey-verifier.mjs'


// Diagnostic output contains fixed vocabulary and bounded numbers/booleans only,
// never errors, URLs, locale, DOM text or contacts. Retain the first failed phase.
const diagnosticModes=['startup','keyboard','label','canceled-pointer']
const diagnosticPhases=[
  'none','origin','context','bootstrap-route','bootstrap-socket','bootstrap-binding',
  'bootstrap-pages','bootstrap-init','page','navigation','initial-drain','format',
  'open','contact-fill','initial-actions','initial-state','keyboard-focus','keyboard-tab',
  'keyboard-ready','keyboard-visible','keyboard-space-on','keyboard-space-off','keyboard-shift-tab',
  'label-on','label-off','canceled-geometry','canceled-down','canceled-drag',
  'canceled-up','canceled-state','terminal-submit','terminal-links','terminal-receipt',
  'terminal-popup','terminal-boundary','terminal-page-errors','late-page-errors',
  'late-boundary','cleanup-stop','cleanup-drain-before-close','cleanup-close',
  'cleanup-drain-after-close','cleanup-terminal','complete',
]
const diagnosticBoundaries=['none','popup','async-route','socket-close','popup-close']
function checkpoint(diagnostic,phase) { if(diagnostic) diagnostic.phase=phase }
function failed(diagnostic) { if(diagnostic) diagnostic.failedPhase ??= diagnostic.phase }
function keyboardDiagnostic(diagnostic) {
  const sample=diagnostic.keyboard
  const safe={visibilityPassed:diagnostic.visibilityPassed===true,sampled:sample?.sampled===true}
  if(!safe.sampled) return JSON.stringify(safe)
  let numericComplete=true
  const number=value=>{
    if(typeof value!=='number'||!Number.isFinite(value)) {numericComplete=false;return 0}
    if(Math.abs(value)>1000000) numericComplete=false
    return Math.round(Math.max(-1000000,Math.min(1000000,value))*100)/100
  }
  const vector=(value,length)=>Array.from({length},(_,i)=>number(Array.isArray(value)?value[i]:undefined))
  for(const key of ['inside','outlined','focused','focusVisible','outlineStylePresent','rootSmooth']) safe[key]=sample[key]===true
  safe.rect=vector(sample.rect,4)
  safe.viewport=vector(sample.viewport,2)
  safe.scroll=vector(sample.scroll,2)
  safe.outlineWidth=number(sample.outlineWidth)
  safe.outlineOffset=number(sample.outlineOffset)
  safe.numericComplete=numericComplete
  return JSON.stringify(safe)
}
function diagnosticFields(diagnostic) {
  const fixed=(value,values)=>values.includes(value)?value:'unknown'
  const phase=diagnostic.failedPhase ?? diagnostic.phase
  const keyboard=diagnostic.mode==='keyboard'&&phase==='keyboard-visible'?` keyboard=${keyboardDiagnostic(diagnostic)}`:''
  let tail='',readyHistory=''
  if(diagnostic.mode==='keyboard'&&phase==='keyboard-ready') {
    // Node-only formatting: never retrieve more page state after a failed start.
    try {tail+=` keyboardReady=${keyboardReadyDiagnostic(diagnostic.keyboardReady,diagnostic.keyboardReadyNodeDeadline)}`} catch {}
    readyHistory=' keyboardStart=unavailable'
    try {
      const start=keyboardStartDiagnostic(diagnostic.keyboardReadyHistory)
      if(start!==undefined)readyHistory=` keyboardStart=${start}`
    } catch { /* Missing or invalid history never replaces the original failure. */ }
  }
  try {if(diagnostic.keyboardTail!==undefined) tail=` keyboardTail=${keyboardTailDiagnostic(diagnostic.keyboardTail)}`} catch { /* A malformed optional tail cannot replace the original diagnostic. */ }
// BEGIN KEYBOARD START DIAGNOSTIC format
  try {
    const start=keyboardStartDiagnostic(diagnostic.keyboardTail?.keyboardStart)
    if(start!==undefined) tail+=` keyboardStart=${start}`
  } catch { /* Optional observation never replaces the first failed verdict. */ }
  return `mode=${fixed(diagnostic.mode,diagnosticModes)} phase=${fixed(phase,diagnosticPhases)} cleanup=${fixed(diagnostic.cleanup,diagnosticPhases)} boundary=${fixed(diagnostic.boundary,diagnosticBoundaries)}${keyboard}${tail}${readyHistory}`
// END KEYBOARD START DIAGNOSTIC format
}

// Failed-readiness transport contains fixed vocabulary and the last complete
// sample already used by the predicate. It is not a new read or an acceptance gate.
// Parse a bounded string, never coerce unknown objects or inspect Error messages.
export function keyboardReadyDiagnostic(raw,nodeDeadline=false) {
  if(nodeDeadline===true)return JSON.stringify({version:1,source:'node-deadline',reason:'DEADLINE',sampled:false})
  let data
  try {if(typeof raw==='string'&&raw.length<=4096)data=JSON.parse(raw)} catch {}
  if(data?.version!==1)data=null
  const source=data?.source==='browser'?'browser':'unknown'
  // v1 PHONE_OUTSIDE remains historical full-containment evidence. The current
  // phone prerequisite emits PHONE_NO_OVERLAP; `inside` keeps its old meaning.
  const reasons=['TARGET','FOCUS','DISABLED','HIDDEN','GEOMETRY','VIEWPORT','DEADLINE','PHONE_OUTSIDE','PHONE_NO_OVERLAP']
  const reason=source==='browser'&&reasons.includes(data?.reason)?data.reason:'unknown'
  const safe={version:1,source,reason,sampled:source==='browser'&&data?.sampled===true}
  if(!safe.sampled)return JSON.stringify(safe)
  let numericComplete=true
  const number=value=>{
    if(typeof value!=='number'||!Number.isFinite(value)){numericComplete=false;return 0}
    if(Math.abs(value)>1000000)numericComplete=false
    return Math.round(Math.max(-1000000,Math.min(1000000,value))*100)/100
  }
  const vector=(value,length)=>Array.from({length},(_,i)=>number(Array.isArray(value)?value[i]:undefined))
  const count=value=>Math.max(0,Math.trunc(number(value)))
  safe.frames=count(data.frames);safe.sampleFrame=count(data.sampleFrame)
  safe.stableFrames=Math.min(3,count(data.stableFrames));safe.inside=data.inside===true
  safe.phoneRect=vector(data.phoneRect,6);safe.consentRect=vector(data.consentRect,6)
  safe.viewport=vector(data.viewport,2);safe.scroll=vector(data.scroll,4)
  safe.visualViewportPresent=data.visualViewportPresent===true
  safe.visualViewport=safe.visualViewportPresent?vector(data.visualViewport,7):[]
  safe.numericComplete=numericComplete&&data.numericComplete!==false
  return JSON.stringify(safe)
}

function keyboardTailDiagnostic(tail) {
  const number=value=>typeof value==='number'&&Number.isFinite(value)
    ?Math.round(Math.max(-1000000,Math.min(1000000,value))*100)/100:0
  const vector=(value,length)=>Array.from({length},(_,i)=>number(Array.isArray(value)?value[i]:undefined))
  const sample=value=>({sampled:value?.sampled===true,ms:number(value?.ms),
    inside:value?.inside===true,focused:value?.focused===true,focusVisible:value?.focusVisible===true,
    rect:vector(value?.rect,4),viewport:vector(value?.viewport,2),scroll:vector(value?.scroll,2)})
  return JSON.stringify({finished:tail?.finished===true,timedOut:tail?.timedOut===true,
    scrollEndSupported:tail?.scrollEndSupported===true,
    scrollEvents:number(tail?.scrollEvents),scrollEnds:number(tail?.scrollEnds),
    samples:Array.isArray(tail?.samples)?tail.samples.slice(0,4).map(sample):[]})
}

// BEGIN KEYBOARD START DIAGNOSTIC observer
// A passive, bounded history only: installation can perturb timing. It neither
// establishes a start precondition nor changes the original acceptance verdict.
// No values, DOM text/identifiers, URLs or raw keys enter the observation.
export function installKeyboardStartObserver() {
  const installed=[],snapshotKey='__consentKeyboardStartSnapshot'
  let snapshotEnabled=false
  try {
    const records=[],start=performance.now()
    let bytes=0,discarded=0,readErrors=0,tabCount=0,lastTab='null'
    // A data-only mirror: no callback from page-controlled state is invoked.
    // Fail closed on collisions without executing accessors. This is not an
    // authenticity guarantee against hostile scripts substituting plain data.
    try {
      const descriptor=Object.getOwnPropertyDescriptor(window,snapshotKey)
      if(descriptor||snapshotKey in window) {
        if(!descriptor||descriptor.configurable)Object.defineProperty(window,snapshotKey,{value:undefined,writable:false,configurable:false})
        else if(Object.hasOwn(descriptor,'writable')&&descriptor.writable)Object.defineProperty(window,snapshotKey,{value:undefined,writable:false})
      }else {
        Object.defineProperty(window,snapshotKey,{value:undefined,writable:true,configurable:false})
        snapshotEnabled=true
      }
    } catch { /* Existing observation remains optional if snapshot setup fails. */ }
    const publishSnapshot=()=>{
      if(!snapshotEnabled)return
      try {
        const raw=`{"version":1,"discarded":${discarded},"readErrors":${readErrors},"tabCount":${tabCount},"events":[${records.join(',')}],"tab":${lastTab}}`
        Object.defineProperty(window,snapshotKey,{value:raw.length<=32768?raw:undefined})
      } catch {snapshotEnabled=false}
    }
    const count=value=>Math.min(1000000,value+1)
    const number=value=>typeof value==='number'&&Number.isFinite(value)
      ?Math.round(Math.max(-1000000,Math.min(1000000,value))*100)/100:0
    const sample=node=>{
      try {
        if(!node) throw 0
        const r=node.getBoundingClientRect(),raw=[r.left,r.top,r.right,r.bottom]
        const sampled=raw.every(value=>typeof value==='number'&&Number.isFinite(value))
        return {sampled,rect:raw.map(number),focused:node===document.activeElement,
          focusVisible:node.matches(':focus-visible')===true,
          inside:sampled&&r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth}
      } catch { return {sampled:false,rect:[0,0,0,0],focused:false,focusVisible:false,inside:false} }
    }
    const record=(kind,event)=>{
      try {
        const chooser=document.querySelector('[data-alchemy-booking-formats] [data-contact-channel-chooser]')
        if(!chooser) return
        const phone=chooser.querySelector('[data-phone-country-input] input[type="tel"]')
        const consent=chooser.querySelector('input[type="checkbox"]')
        if(!phone||!consent) return
        const viewport=window.visualViewport
        const target=event?.target
        const entry={kind,ms:number(performance.now()-start),
          target:target===phone?'phone':target===consent?'consent':target===document?'document':'other',
          prevented:event?.defaultPrevented===true,shift:kind==='tab'&&event?.shiftKey===true,
          phone:sample(phone),consent:sample(consent),
          scroll:[number(scrollX),number(scrollY)],viewport:[number(innerWidth),number(innerHeight)],
          visualViewportPresent:Boolean(viewport),
          visualViewport:viewport?[number(viewport.width),number(viewport.height),number(viewport.offsetLeft),number(viewport.offsetTop)]:[0,0,0,0],
          errorPresent:Boolean(chooser.querySelector('[role="alert"]'))}
        const encoded=JSON.stringify(entry)
        // ASCII-only fixed strings and bounded numbers make lengths byte counts.
        if(encoded.length>2048) {discarded=count(discarded);publishSnapshot();return}
        if(kind==='tab') {lastTab=encoded;tabCount=count(tabCount)}
        while(records.length>=64||bytes+encoded.length>24576) {
          bytes-=records.shift().length;discarded=count(discarded)
        }
        records.push(encoded);bytes+=encoded.length;publishSnapshot()
      } catch {readErrors=count(readErrors);publishSnapshot()}
    }
    const listeners=[
      ['focusin',event=>record('focusin',event)],
      ['focusout',event=>record('focusout',event)],
      ['input',event=>record('input',event)],
      ['keydown',event=>{try {if(event.key==='Tab') record('tab',event)} catch {readErrors=count(readErrors);publishSnapshot()}}],
      ['scroll',event=>record('scroll',event)],
      ['scrollend',event=>record('scrollend',event)],
    ]
    for(const [name,listener] of listeners) {
      document.addEventListener(name,listener,{capture:true,passive:true})
      installed.push([name,listener])
    }
    Object.defineProperty(window,'__consentKeyboardStartRead',{configurable:true,value:()=>{
      try {
        const result=`{"version":1,"discarded":${discarded},"readErrors":${readErrors},"tabCount":${tabCount},"events":[${records.join(',')}],"tab":${lastTab}}`
        return result.length<=32768?result:undefined
      } catch {return undefined}
    }})
    publishSnapshot()
  } catch {
    // A partial installation must not leave an apparently available snapshot.
    try {if(snapshotEnabled)Object.defineProperty(window,snapshotKey,{value:undefined,writable:false})} catch {}
    // Partial setup failure remains local and cannot become a pageerror.
    for(const [name,listener] of installed) {
      try {document.removeEventListener(name,listener,true)} catch {}
    }
  }
}

// Revalidate the browser's bounded string before it can enter a diagnostic.
// Never copy arbitrary fields or invoke object coercion/toJSON from page data.
export function keyboardStartDiagnostic(raw) {
  if(typeof raw!=='string'||raw.length>32768) return undefined
  const data=JSON.parse(raw)
  if(data?.version!==1) return undefined
  const number=value=>typeof value==='number'&&Number.isFinite(value)
    ?Math.round(Math.max(-1000000,Math.min(1000000,value))*100)/100:0
  const count=value=>Math.max(0,Math.trunc(number(value)))
  const vector=(value,length)=>Array.from({length},(_,i)=>number(Array.isArray(value)?value[i]:undefined))
  const node=value=>({sampled:value?.sampled===true,rect:vector(value?.rect,4),
    focused:value?.focused===true,focusVisible:value?.focusVisible===true,inside:value?.inside===true})
  const event=value=>{
    if(!['focusin','focusout','input','tab','scroll','scrollend'].includes(value?.kind)) return null
    return {kind:value.kind,ms:number(value.ms),
      target:['phone','consent','document','other'].includes(value.target)?value.target:'other',
      prevented:value.prevented===true,shift:value.kind==='tab'&&value.shift===true,
      phone:node(value.phone),consent:node(value.consent),scroll:vector(value.scroll,2),viewport:vector(value.viewport,2),
      visualViewportPresent:value.visualViewportPresent===true,visualViewport:vector(value.visualViewport,4),
      errorPresent:value.errorPresent===true}
  }
  const safe={version:1,discarded:count(data.discarded),readErrors:count(data.readErrors),tabCount:count(data.tabCount),
    events:Array.isArray(data.events)?data.events.slice(0,64).map(event).filter(Boolean):[],
    tab:data.tab?.kind==='tab'?event(data.tab):null}
  let result=JSON.stringify(safe)
  while(result.length>32768&&safe.events.length) {safe.events.shift();safe.discarded=Math.min(1000000,safe.discarded+1);result=JSON.stringify(safe)}
  return result.length<=32768?result:undefined
}

// Called ONLY after the original exact keyboard verdict has already failed.
// END KEYBOARD START DIAGNOSTIC observer
// Observe, never scroll/focus/check or retry. Fixed 500ms evidence window is not
// an acceptance timeout: even an in-view final sample cannot change failure.
export async function collectKeyboardFailureTail(node) {
  const start=performance.now(),samples=[]
  let scrollEvents=0,scrollEnds=0
  const onScroll=()=>{scrollEvents=Math.min(scrollEvents+1,1000)}
  const onScrollEnd=()=>{scrollEnds=Math.min(scrollEnds+1,1000)}
  const sample=()=>{
    try {
      const r=node.getBoundingClientRect()
      samples.push({sampled:true,ms:performance.now()-start,
        inside:r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth,
        focused:node===document.activeElement,focusVisible:node.matches(':focus-visible'),
        rect:[r.left,r.top,r.right,r.bottom],viewport:[innerWidth,innerHeight],scroll:[scrollX,scrollY]})
    } catch {samples.push({sampled:false,ms:performance.now()-start})}
  }
  const scrollEndSupported='onscrollend' in document
  try {
    document.addEventListener('scroll',onScroll,{capture:true,passive:true})
    document.addEventListener('scrollend',onScrollEnd,{capture:true,passive:true})
    sample()
    for(const delay of [100,150,250]) {
      await new Promise(resolve=>setTimeout(resolve,delay))
      sample()
    }
// BEGIN KEYBOARD START DIAGNOSTIC tail-read
    const result={finished:true,timedOut:false,scrollEndSupported,scrollEvents,scrollEnds,samples}
    // Reuse the existing post-verdict tail evaluation and its existing deadline;
    // no added evaluation, wait, retry, or delay before the original sample.
    try {
      const read=window.__consentKeyboardStartRead
      const raw=typeof read==='function'?read():undefined
      if(typeof raw==='string'&&raw.length<=32768) result.keyboardStart=raw
    } catch { /* Missing/failed observation leaves the original tail untouched. */ }
    return result
// END KEYBOARD START DIAGNOSTIC tail-read
  } finally {
    document.removeEventListener('scroll',onScroll,true)
    document.removeEventListener('scrollend',onScrollEnd,true)
  }
}

async function captureKeyboardFailureTail(diagnostic) {
  // Unsampled geometry/visibility failures have no matching original verdict
  // to compare; other modes/phases and successful keyboard runs are untouched.
  if(diagnostic?.mode!=='keyboard'||diagnostic.failedPhase!=='keyboard-visible'||
    diagnostic.keyboard?.sampled!==true||typeof diagnostic.readKeyboardTail!=='function') return
  let timer
  try {
    diagnostic.keyboardTail=await Promise.race([
      Promise.resolve().then(diagnostic.readKeyboardTail),
      new Promise(resolve=>{timer=setTimeout(()=>resolve({timedOut:true}),750)}),
    ])
  } catch { /* Optional failed-state reads never replace the original error. */ }
  finally {clearTimeout(timer)}
}

// Only the exact initial public document supplements the existing typed static
// allowlist. This wrapper is installed before any page/navigation exists.
export function consentInitialGate(origin, locale, failures, blocked) {
  const privateFailures=[], privateBlocked=[]
  const gate=alchemyRequestGate(origin,locale,async route=>{
    failures.push('CONSENT_POST_BLOCKED')
    await route.abort()
  },privateFailures,privateBlocked)
  let draining=false, initialAllowed=true
  const handler=async route=>{
    const request=route.request()
    if(initialAllowed && request.method()==='GET' && request.resourceType()==='document' && request.url()===origin+`/${locale}/services/alchemy-of-soul`) {
      if(draining) return route.abort()
      let response
      try {
        response=await route.fetch({maxRedirects:0})
        assert.equal(response.url(),request.url(),'No initial document redirect')
        assert.ok(response.status()>=200 && response.status()<300,'Initial document must succeed')
        await route.fulfill({response})
      } catch { failures.push('CONSENT_INITIAL_READ_FAILED'); await route.abort() }
      finally { if(response) await response.dispose() }
      return
    }
    // This consent-only probe never navigates to a receipt. Do not inherit
    // the full submission journey's thank-you document/RSC exception.
    if(request.method()==='GET' && new URL(request.url()).pathname===`/${locale}/thank-you`) return route.abort()
    const count=privateFailures.length
    await gate(route)
    if(privateFailures.length>count) failures.push('CONSENT_BOUNDARY_FAILED')
    privateFailures.length=0;privateBlocked.length=0
  }
  const safe=async route=>{try {await handler(route)} catch {failures.push('CONSENT_ROUTE_FAILED');throw new Error('CONSENT_ROUTE_FAILED')}}
  safe.endInitialDocument=()=>{initialAllowed=false}
  safe.beginTeardown=()=>{draining=true;gate.beginTeardown()}
  return safe
}

export function installConsentPopupGuard() {
  window.__consentPopupAttempts=0
  window.open=()=>{window.__consentPopupAttempts++; void window.__consentReportPopup().catch(()=>{}); return null}
}

// Harness starting-state experiment only, not a runtime keyboard correction.
// Spend the final fill's original 30s action budget on fill + pre-Tab readiness;
// never reset it, retry input, or alter the immediate native post-Tab verdict.
export const CONSENT_KEYBOARD_START_TIMEOUT_MS = 30_000
export const CONSENT_KEYBOARD_ABORT_TIMEOUT_MS = 5_000
const unsafeConsentFailures=new WeakSet()
const keyboardStartDeadlineFailures=new WeakSet()
export const unsafeConsentCleanup=error=>Boolean(error&&typeof error==='object'&&unsafeConsentFailures.has(error))
const keyboardStartClock={now:()=>performance.now(),set:(fn,ms)=>setTimeout(fn,ms),clear:timer=>clearTimeout(timer)}

// Serialized callback: public geometry/focus only. Three distinct, exactly
// unchanged frames establish a start state, not a guarantee about future frames.
// Checkbox geometry participates in stability, but its containment is NOT a gate.
export function naturalKeyboardStart(phone,{remainingMs}) {
  return new Promise(resolve=>{
    const start=performance.now()
    let frame=null,done=false,previous=null,previousTime=null,stable=0
    let failureReason='unknown',lastSample=null,frames=0,sampleFrame=0
    const fail=reason=>{failureReason=reason;throw Error('CONSENT_KEYBOARD_START_'+reason)}
    const finite=value=>typeof value==='number'&&Number.isFinite(value)&&Math.abs(value)<=10000000
    const finish=(error,value)=>{
      if(done)return
      done=true
      if(frame!==null){try{cancelAnimationFrame(frame)}catch{};frame=null}
      if(error){
        // Carry failure evidence in the result, not exception.message/stack.
        // The unchanged {ready:true} assertion still rejects this failed start.
        const evidence={version:1,source:'browser',reason:failureReason,sampled:lastSample!==null}
        if(lastSample){
          let numericComplete=true
          const number=value=>{
            if(typeof value!=='number'||!Number.isFinite(value)){numericComplete=false;return 0}
            if(Math.abs(value)>1000000)numericComplete=false
            return Math.round(Math.max(-1000000,Math.min(1000000,value))*100)/100
          }
          const values=lastSample.values.map(number)
          Object.assign(evidence,{frames,sampleFrame,stableFrames:Math.min(3,stable),inside:lastSample.inside===true,
            phoneRect:values.slice(0,6),consentRect:values.slice(6,12),viewport:values.slice(12,14),scroll:values.slice(14,18),
            visualViewportPresent:values.length===25,visualViewport:values.slice(18),numericComplete})
        }
        const result={ready:false,keyboardReady:JSON.stringify(evidence)}
        // Copy only the already-published passive snapshot before settling.
        // Never invoke a page reader, function, getter or inherited property.
        // No DOM read, new evaluation, wait or post-close recovery is added.
        try {
          const descriptor=Object.getOwnPropertyDescriptor(window,'__consentKeyboardStartSnapshot')
          if(descriptor&&Object.hasOwn(descriptor,'value')&&Object.hasOwn(descriptor,'writable')) {
            const {value:raw,writable,configurable}=descriptor
            if(writable===true&&configurable===false&&typeof raw==='string'&&raw.length<=32768) {
              // Revalidate in this realm before any string crosses the result.
              // This pure projection matches the independent Node sanitizer.
              const sanitizeHistory=raw=>{
                if(typeof raw!=='string'||raw.length>32768) return undefined
                const data=JSON.parse(raw)
                if(data?.version!==1) return undefined
                const number=value=>typeof value==='number'&&Number.isFinite(value)
                  ?Math.round(Math.max(-1000000,Math.min(1000000,value))*100)/100:0
                const count=value=>Math.max(0,Math.trunc(number(value)))
                const vector=(value,length)=>Array.from({length},(_,i)=>number(Array.isArray(value)?value[i]:undefined))
                const node=value=>({sampled:value?.sampled===true,rect:vector(value?.rect,4),
                  focused:value?.focused===true,focusVisible:value?.focusVisible===true,inside:value?.inside===true})
                const event=value=>{
                  if(!['focusin','focusout','input','tab','scroll','scrollend'].includes(value?.kind)) return null
                  return {kind:value.kind,ms:number(value.ms),
                    target:['phone','consent','document','other'].includes(value.target)?value.target:'other',
                    prevented:value.prevented===true,shift:value.kind==='tab'&&value.shift===true,
                    phone:node(value.phone),consent:node(value.consent),scroll:vector(value.scroll,2),viewport:vector(value.viewport,2),
                    visualViewportPresent:value.visualViewportPresent===true,visualViewport:vector(value.visualViewport,4),
                    errorPresent:value.errorPresent===true}
                }
                const safe={version:1,discarded:count(data.discarded),readErrors:count(data.readErrors),tabCount:count(data.tabCount),
                  events:Array.isArray(data.events)?data.events.slice(0,64).map(event).filter(Boolean):[],
                  tab:data.tab?.kind==='tab'?event(data.tab):null}
                let result=JSON.stringify(safe)
                while(result.length>32768&&safe.events.length) {safe.events.shift();safe.discarded=Math.min(1000000,safe.discarded+1);result=JSON.stringify(safe)}
                return result.length<=32768?result:undefined
              }
              const history=sanitizeHistory(raw)
              if(history!==undefined)result.keyboardStart=history
            }
          }
        } catch { /* Preserve the failed verdict if the observer is unavailable. */ }
        resolve(result)
      }else resolve(value)
    }
    const rect=node=>{
      const r=node.getBoundingClientRect(),values=['left','top','right','bottom','width','height'].map(key=>r[key])
      if(!values.every(finite)||r.width<=0||r.height<=0)fail('GEOMETRY')
      return values
    }
    const sample=()=>{
      if(!(phone instanceof HTMLInputElement)||!phone.isConnected||phone.type!=='tel')fail('TARGET')
      const chooser=phone.closest('[data-contact-channel-chooser]')
      const phones=chooser?.querySelectorAll('[data-phone-country-input] input[type="tel"]')
      const consents=chooser?.querySelectorAll('input[type="checkbox"]')
      if(phones?.length!==1||phones[0]!==phone||consents?.length!==1||!consents[0].isConnected)fail('TARGET')
      if(document.activeElement!==phone)fail('FOCUS')
      if(phone.disabled||phone.readOnly||phone.closest('[inert]'))fail('DISABLED')
      const style=getComputedStyle(phone)
      if(phone.hidden||!phone.getClientRects().length||style.display==='none'||style.visibility==='hidden'||style.visibility==='collapse')fail('HIDDEN')
      const phoneRect=rect(phone),consentRect=rect(consents[0])
      const viewport=[innerWidth,innerHeight],scroll=[scrollX,scrollY,document.scrollingElement?.scrollLeft,document.scrollingElement?.scrollTop]
      const visual=window.visualViewport?['offsetLeft','offsetTop','pageLeft','pageTop','width','height','scale'].map(key=>window.visualViewport[key]):[]
      if(![...viewport,...scroll,...visual].every(finite)||viewport.some(value=>value<=0)||(visual.length&&(visual[4]<=0||visual[5]<=0||visual[6]<=0)))fail('VIEWPORT')
      const [left,top,right,bottom]=phoneRect
      const inside=top>=0&&bottom<=innerHeight&&left>=0&&right<=innerWidth&&(!visual.length||(left>=visual[0]&&top>=visual[1]&&right<=visual[0]+visual[4]&&bottom<=visual[1]+visual[5]))
      // Keep full containment as diagnostic evidence, not a phone prerequisite.
      // Only positive overlap of the naturally focused phone with the common
      // layout/visual viewport is required; checkbox containment is post-Tab.
      const overlaps=Math.max(left,0,visual.length?visual[0]:0)<Math.min(right,innerWidth,visual.length?visual[0]+visual[4]:innerWidth)
        &&Math.max(top,0,visual.length?visual[1]:0)<Math.min(bottom,innerHeight,visual.length?visual[1]+visual[5]:innerHeight)
      return {inside,overlaps,values:[...phoneRect,...consentRect,...viewport,...scroll,...visual]}
    }
    const tick=time=>{
      frame=null
      if(done)return
      frames=Math.min(1000000,frames+1)
      try{
        if(!finite(start)||!finite(time)||!finite(remainingMs)||remainingMs<=0||remainingMs>30000||performance.now()-start>=remainingMs)fail('DEADLINE')
        const current=sample()
        lastSample=current;sampleFrame=frames
        const unchanged=previous&&current.values.length===previous.length&&current.values.every((value,index)=>value===previous[index])
        stable=unchanged&&previousTime!==null&&time>previousTime?stable+1:1
        previous=current.values;previousTime=time
        if(stable>=3){if(!current.overlaps)fail('PHONE_NO_OVERLAP');finish(null,{ready:true})}
        else frame=requestAnimationFrame(tick)
      }catch(error){finish(error)}
    }
    try{frame=requestAnimationFrame(tick)}catch(error){finish(error)}
  })
}

// Clock injection is an offline-test seam only; runtime cannot extend the budget.
// Locator.evaluate's timeout bounds attachment, not its asynchronous callback.
export function createKeyboardStartPreparation(clock=keyboardStartClock) {
  const start=clock.now(),deadline=start+CONSENT_KEYBOARD_START_TIMEOUT_MS
  if(!Number.isFinite(start))throw Error('CONSENT_KEYBOARD_START_CLOCK')
  const timeoutError=Error('CONSENT_KEYBOARD_START_DEADLINE'),pending=new Set()
  keyboardStartDeadlineFailures.add(timeoutError)
  let expired=false,stopped=false,timer
  const expiry=new Promise((_,reject)=>{timer=clock.set(()=>{expired=true;reject(timeoutError)},CONSENT_KEYBOARD_START_TIMEOUT_MS)})
  expiry.catch(()=>{})
  const remaining=()=>{
    const value=deadline-clock.now()
    if(expired||!Number.isFinite(value)||value<=0)throw timeoutError
    if(stopped)throw Error('CONSENT_KEYBOARD_START_STOPPED')
    return value
  }
  return {
    async run(operation){
      remaining()
      const task=Promise.resolve().then(()=>operation(remaining()))
      pending.add(task)
      task.then(()=>pending.delete(task),()=>pending.delete(task))
      const value=await Promise.race([task,expiry])
      remaining() // A late success cannot authorize Tab when the timer was delayed.
      return value
    },
    finish(){remaining();stopped=true;clock.clear(timer)},
    stop(){stopped=true;clock.clear(timer)},
    async drain(){while(pending.size)await Promise.allSettled([...pending])},
  }
}

// Safety-only abort budget, not extra readiness time. Close before draining a
// stranded evaluation/request; ordinary successful bootstrap teardown is intact.
export async function abortKeyboardStart({context,gate,drain,preparation,diagnostic},clock=keyboardStartClock) {
  let preparationStopFailed=false
  try{preparation.stop()}catch{preparationStopFailed=true}
  const deadline=clock.now()+CONSENT_KEYBOARD_ABORT_TIMEOUT_MS
  let timer,expired=false,phase='cleanup-stop',firstCleanupFailure=preparationStopFailed?'cleanup-stop':null
  const operation=Promise.resolve().then(async()=>{
    let stopFailed=preparationStopFailed
    try{gate.beginTeardown()}catch{stopFailed=true;firstCleanupFailure='cleanup-stop'}
    phase='cleanup-close'
    await context.close({reason:'CONSENT_KEYBOARD_START_ABORT'})
    phase='cleanup-drain-after-close'
    await Promise.all([preparation.drain(),drain()])
    if(stopFailed)throw Error('CONSENT_KEYBOARD_STOP_FAILED')
  })
  operation.catch(()=>{})
  try{
    await Promise.race([operation,new Promise((_,reject)=>{timer=clock.set(()=>{expired=true;reject(Error('CONSENT_KEYBOARD_ABORT_DEADLINE'))},CONSENT_KEYBOARD_ABORT_TIMEOUT_MS)})])
    if(expired||!Number.isFinite(deadline)||clock.now()>=deadline)throw Error('CONSENT_KEYBOARD_ABORT_DEADLINE')
    return true
  }catch{
    if(diagnostic){diagnostic.unsafeConsentCleanup=true;if(diagnostic.cleanup==='none')diagnostic.cleanup=firstCleanupFailure||phase}
    return false
  }finally{clock.clear(timer)}
}

// Retain the bootstrap guard through close, and drain its admitted reads first.
// The same consent-only guard remains installed for initial load and interactions.
// Popup counters live in Node and are checked after close and draining.
export async function withConsentBootstrap(context, gate, run, diagnostic) {
  const active=new Set(), errors=[]
  let primary=false,result,popupAttempts=0,pageCount=0
  const tracked=route=>{
    const pending=Promise.resolve().then(()=>gate(route));active.add(pending)
    pending.then(()=>active.delete(pending),()=>{errors.push('CONSENT_ASYNC_FAILED');active.delete(pending)})
    return pending
  }
  const drain=async()=>{while(active.size) await Promise.allSettled([...active])}
  try {
    checkpoint(diagnostic,'bootstrap-route')
    await context.route('**/*',tracked)
    checkpoint(diagnostic,'bootstrap-socket')
    await context.routeWebSocket('**/*',socket=>{
      const pending=Promise.resolve().then(()=>socket.close()).catch(()=>{throw new Error('CONSENT_SOCKET_CLOSE_FAILED')});active.add(pending)
      pending.then(()=>active.delete(pending),()=>{errors.push('CONSENT_SOCKET_CLOSE_FAILED');active.delete(pending)})
      return pending
    })
    checkpoint(diagnostic,'bootstrap-binding')
    await context.exposeBinding('__consentReportPopup',()=>{popupAttempts++})
    checkpoint(diagnostic,'bootstrap-pages')
    context.on('page',page=>{
      pageCount++
      if(pageCount>1) {
        popupAttempts++
        const pending=Promise.resolve().then(()=>page.close());active.add(pending)
        pending.then(()=>active.delete(pending),()=>{errors.push('CONSENT_POPUP_CLOSE_FAILED');active.delete(pending)})
      }
    })
    checkpoint(diagnostic,'bootstrap-init')
    await context.addInitScript(installConsentPopupGuard)
// BEGIN KEYBOARD START DIAGNOSTIC install
    if(diagnostic?.mode==='keyboard') {
      try {await context.addInitScript(installKeyboardStartObserver)} catch { /* Diagnostic installation is optional. */ }
    }
    result=await run(drain)
// END KEYBOARD START DIAGNOSTIC install
  } catch(error) {
    primary=true;failed(diagnostic)
    if(diagnostic?.mode==='keyboard'&&diagnostic.failedPhase==='keyboard-ready'&&diagnostic.keyboardReady===undefined) {
      // Only the actual private watchdog identity establishes a Node deadline.
      // Other exceptions stay unknown; do not inspect their message or stack.
      diagnostic.keyboardReadyNodeDeadline=Boolean(error&&typeof error==='object'&&keyboardStartDeadlineFailures.has(error))
    }
    await captureKeyboardFailureTail(diagnostic)
  }
  finally {
    if(diagnostic?.keyboardPreparation){
      const confirmed=await abortKeyboardStart({context,gate,drain,preparation:diagnostic.keyboardPreparation,diagnostic})
      diagnostic.keyboardPreparation=null
      if(!confirmed)errors.push('CONSENT_CLEANUP_FAILED')
    }else for(const [phase,cleanup] of [
      ['cleanup-stop',()=>gate.beginTeardown()],['cleanup-drain-before-close',drain],
      ['cleanup-close',()=>context.close()],['cleanup-drain-after-close',drain],
    ]) {
      checkpoint(diagnostic,phase)
      try {await cleanup()} catch {
        errors.push('CONSENT_CLEANUP_FAILED')
        if(diagnostic && diagnostic.cleanup==='none') diagnostic.cleanup=phase
        failed(diagnostic)
      }
    }
  }
  checkpoint(diagnostic,'cleanup-terminal')
  if(diagnostic) diagnostic.boundary=popupAttempts?(errors.includes('CONSENT_POPUP_CLOSE_FAILED')?'popup-close':'popup'):({
    CONSENT_ASYNC_FAILED:'async-route',CONSENT_SOCKET_CLOSE_FAILED:'socket-close',
    CONSENT_POPUP_CLOSE_FAILED:'popup-close',
  }[errors.find(code=>code!=='CONSENT_CLEANUP_FAILED')] || 'none')
  if(popupAttempts) {failed(diagnostic);throw new Error('CONSENT_POPUP_ATTEMPTED')}
  if(primary) throw new Error('CONSENT_NATIVE_RUN_FAILED')
  if(errors.length) {failed(diagnostic);throw new Error('CONSENT_CLEANUP_FAILED')}
  return result
}

// Additional isolated acceptance only. The existing pointer check() journey is
// unchanged and must pass independently; none of these scenarios pre-focus it.
async function verifyNative(sourcePage, expect, locale, diagnostic) {
  const origin = alchemyOrigin(sourcePage.url(), locale)
  for (const mode of ['keyboard', 'label', 'canceled-pointer']) {
    Object.assign(diagnostic,{mode,phase:'context',failedPhase:null,cleanup:'none',boundary:'none',visibilityPassed:false,keyboard:null,keyboardTail:undefined,readKeyboardTail:undefined,keyboardPreparation:null,unsafeConsentCleanup:false,keyboardReady:undefined,keyboardReadyNodeDeadline:false,keyboardReadyHistory:undefined})
    const context = await sourcePage.context().browser().newContext({serviceWorkers:'block',viewport:sourcePage.viewportSize()})
    const errors=[], failures=[], blocked=[]
    const initialGate=consentInitialGate(origin,locale,failures,blocked)
    await withConsentBootstrap(context,initialGate,async drainInitial=>{
      checkpoint(diagnostic,'page')
      const page=await context.newPage()
      page.on('pageerror',()=>errors.push('CONSENT_PAGE_ERROR'))
      checkpoint(diagnostic,'navigation')
      await page.goto(origin+`/${locale}/services/alchemy-of-soul`,{waitUntil:'networkidle'})
      checkpoint(diagnostic,'initial-drain')
      initialGate.endInitialDocument()
      await drainInitial()
      const receipt=syntheticAlchemyReceipt(locale)
      {
        const pricing=page.locator('[data-alchemy-booking-formats]')
        checkpoint(diagnostic,'format')
        await pricing.locator('[data-alchemy-format="30"]').click()
        const chooser=pricing.locator('[data-contact-channel-chooser]')
        checkpoint(diagnostic,'open')
        await chooser.locator('[data-contact-order]').click()
        const phone=chooser.locator('[data-phone-country-input]')
        const contact=phone.locator('input[type="tel"]')
        const consent=chooser.locator('input[type="checkbox"]')
        const actions=['whatsapp','telegram'].map(channel=>chooser.locator(`[data-contact-channel-submit="${channel}"]`))
        await expect(chooser.locator('[data-contact-channel-submit]')).toHaveCount(2)
        for(const action of actions) { await expect(action).toBeVisible(); await expect(action).toBeEnabled() }
        diagnostic.readKeyboardTail=()=>consent.evaluate(collectKeyboardFailureTail)
        checkpoint(diagnostic,'contact-fill')
        await phone.locator('select').selectOption('CA')
        await contact.fill(ALCHEMY_NATIONAL_PHONE)
        checkpoint(diagnostic,'initial-actions')
        for(const action of actions) await action.click()
        await expect(chooser.locator('a[data-contact-channel]')).toHaveCount(0)
        await expect(chooser.locator('[role="status"]')).toHaveCount(0)
        assert.deepEqual(failures,[])
        assert.equal(await page.evaluate(()=>window.__consentPopupAttempts),0)
        // Native fill restores the natural input focus after the rejection taps.
        const preparation=mode==='keyboard'?createKeyboardStartPreparation():null
        diagnostic.keyboardPreparation=preparation
        const preparing=operation=>preparation?preparation.run(operation):operation(undefined)
        await preparing(budget=>contact.fill(ALCHEMY_NATIONAL_PHONE,budget===undefined?undefined:{timeout:budget}))
        checkpoint(diagnostic,'initial-state')
        await preparing(()=>expect(consent).not.toBeChecked())
        for(const action of actions) await preparing(()=>expect(action).toBeEnabled())
        if (mode==='keyboard') {
          // Start at naturally focused phone, then use real sequential navigation.
          checkpoint(diagnostic,'keyboard-focus')
          await preparing(()=>expect(contact).toBeFocused())
          checkpoint(diagnostic,'keyboard-ready')
          const readiness=await preparing(budget=>contact.evaluate(naturalKeyboardStart,{remainingMs:budget},{timeout:budget}))
          if(readiness?.ready!==true) {
            try {diagnostic.keyboardReady=keyboardReadyDiagnostic(readiness?.keyboardReady)} catch {}
            try {
              const raw=readiness&&typeof readiness==='object'?Object.getOwnPropertyDescriptor(readiness,'keyboardStart')?.value:undefined
              diagnostic.keyboardReadyHistory=keyboardStartDiagnostic(raw)
            } catch { /* Bounded passive history is optional, never an acceptance gate. */ }
          }
          assert.deepEqual(readiness,{ready:true})
          preparation.finish()
          diagnostic.keyboardPreparation=null
          checkpoint(diagnostic,'keyboard-tab')
          for (let i=0;i<12 && !await consent.evaluate(node=>node===document.activeElement);i++) await page.keyboard.press('Tab')
          await expect(consent).toBeFocused()
          checkpoint(diagnostic,'keyboard-visible')
          await expect(consent).toBeVisible()
          diagnostic.visibilityPassed=true
          const {visible,keyboard}=await consent.evaluate(node=>{
            const r=node.getBoundingClientRect(),style=getComputedStyle(node)
            const sampledVisibility={inside:r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth,
              outlined:style.outlineStyle!=='none'&&parseFloat(style.outlineWidth)>0}
            // Capture the original assertion's sample, not a later geometry read.
            // Extra diagnostic reads cannot change its verdict or expose DOM text.
            let keyboardSnapshot={sampled:false}
            try {
              keyboardSnapshot={sampled:true,inside:sampledVisibility.inside,outlined:sampledVisibility.outlined,
                focused:node===document.activeElement,focusVisible:node.matches(':focus-visible'),
                rect:[r.left,r.top,r.right,r.bottom],viewport:[innerWidth,innerHeight],
                scroll:[scrollX,scrollY],outlineWidth:parseFloat(style.outlineWidth),
                outlineOffset:parseFloat(style.outlineOffset),outlineStylePresent:style.outlineStyle!=='none',
                rootSmooth:getComputedStyle(document.documentElement).scrollBehavior==='smooth'}
            } catch {}
            return {visible:sampledVisibility,keyboard:keyboardSnapshot}
          })
          diagnostic.keyboard=keyboard
          assert.deepEqual(visible,{inside:true,outlined:true})
          checkpoint(diagnostic,'keyboard-space-on')
          await page.keyboard.press('Space')
          await expect(consent).toBeChecked()
          for(const action of actions) await expect(action).toBeEnabled()
          checkpoint(diagnostic,'keyboard-space-off')
          await page.keyboard.press('Space')
          await expect(consent).not.toBeChecked()
          checkpoint(diagnostic,'keyboard-shift-tab')
          await page.keyboard.press('Shift+Tab')
          await expect(consent).not.toBeFocused()
        } else if (mode==='label') {
          checkpoint(diagnostic,'label-on')
          const text=consent.locator('..').locator('span')
          await text.click()
          await expect(consent).toBeChecked()
          for(const action of actions) await expect(action).toBeEnabled()
          checkpoint(diagnostic,'label-off')
          await text.click()
          await expect(consent).not.toBeChecked()
        } else {
          // A real press followed by release outside the entire label must not
          // activate consent. No synthetic dispatchEvent, focus or checked setter.
          checkpoint(diagnostic,'canceled-geometry')
          await consent.scrollIntoViewIfNeeded()
          const r=await consent.boundingBox()
          assert.ok(r)
          const labelRect=await consent.locator('..').boundingBox()
          assert.ok(labelRect)
          assert.ok(1<labelRect.x || 1>labelRect.x+labelRect.width || 1<labelRect.y || 1>labelRect.y+labelRect.height)
          checkpoint(diagnostic,'canceled-down')
          await page.mouse.move(r.x+r.width/2,r.y+r.height/2)
          await page.mouse.down()
          checkpoint(diagnostic,'canceled-drag')
          await page.mouse.move(1,1)
          checkpoint(diagnostic,'canceled-up')
          await page.mouse.up()
          checkpoint(diagnostic,'canceled-state')
          await expect(consent).not.toBeChecked()
        }
        checkpoint(diagnostic,'terminal-submit')
        for(const action of actions) { await expect(action).toBeEnabled(); await action.click() }
        checkpoint(diagnostic,'terminal-links')
        await expect(chooser.locator('a[data-contact-channel]')).toHaveCount(0)
        checkpoint(diagnostic,'terminal-receipt')
        assert.equal(receipt.count,0)
        await expect(chooser.locator('[role="status"]')).toHaveCount(0)
        assert.equal(await page.evaluate(()=>sessionStorage.getItem('hh-service-enquiry-receipt:v1')),null)
        checkpoint(diagnostic,'terminal-popup')
        assert.equal(await page.evaluate(()=>window.__consentPopupAttempts),0)
        checkpoint(diagnostic,'terminal-boundary')
        assert.deepEqual(failures,[])
      }
      checkpoint(diagnostic,'terminal-page-errors')
      assert.deepEqual(errors,[])
      checkpoint(diagnostic,'terminal-boundary')
      assert.deepEqual(failures,[])
    },diagnostic)
    checkpoint(diagnostic,'late-page-errors')
    assert.deepEqual(errors,[])
    checkpoint(diagnostic,'late-boundary')
    assert.deepEqual(failures,[])
    checkpoint(diagnostic,'complete')
    // Diagnostics must not turn a completed native mode into a failure.
    try {console.info(`CONSENT_NATIVE_ACCEPTANCE_COMPLETED ${diagnosticFields(diagnostic)}`)} catch {}
  }
}

export async function verifyContactConsentNativeAcceptance(sourcePage, expect, locale) {
  const diagnostic={mode:'startup',phase:'origin',failedPhase:null,cleanup:'none',boundary:'none'}
  try { await verifyNative(sourcePage,expect,locale,diagnostic) }
  catch {
    failed(diagnostic)
    const failure=new Error(`CONSENT_NATIVE_ACCEPTANCE_FAILED ${diagnosticFields(diagnostic)}`)
    if(diagnostic.unsafeConsentCleanup)unsafeConsentFailures.add(failure)
    throw failure
  }
}

