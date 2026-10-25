import assert from 'node:assert/strict'
import {ALCHEMY_CONTACT, alchemyOrigin, alchemyRequestGate, syntheticAlchemyReceipt} from './alchemy-enquiry-journey-verifier.mjs'


// Diagnostic output contains fixed vocabulary and bounded numbers/booleans only,
// never errors, URLs, locale, DOM text or contacts. Retain the first failed phase.
const diagnosticModes=['startup','keyboard','label','canceled-pointer']
const diagnosticPhases=[
  'none','origin','context','bootstrap-route','bootstrap-socket','bootstrap-binding',
  'bootstrap-pages','bootstrap-init','page','navigation','initial-drain','format',
  'open','contact-fill','initial-state','keyboard-focus','keyboard-tab',
  'keyboard-visible','keyboard-space-on','keyboard-space-off','keyboard-shift-tab',
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
  let tail=''
  try {if(diagnostic.keyboardTail!==undefined) tail=` keyboardTail=${keyboardTailDiagnostic(diagnostic.keyboardTail)}`} catch { /* A malformed optional tail cannot replace the original diagnostic. */ }
  return `mode=${fixed(diagnostic.mode,diagnosticModes)} phase=${fixed(phase,diagnosticPhases)} cleanup=${fixed(diagnostic.cleanup,diagnosticPhases)} boundary=${fixed(diagnostic.boundary,diagnosticBoundaries)}${keyboard}${tail}`
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

// Called ONLY after the original exact keyboard verdict has already failed.
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
    return {finished:true,timedOut:false,scrollEndSupported,scrollEvents,scrollEnds,samples}
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
    result=await run(drain)
  } catch {
    primary=true;failed(diagnostic)
    await captureKeyboardFailureTail(diagnostic)
  }
  finally {
    for(const [phase,cleanup] of [
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
    Object.assign(diagnostic,{mode,phase:'context',failedPhase:null,cleanup:'none',boundary:'none',visibilityPassed:false,keyboard:null,keyboardTail:undefined,readKeyboardTail:undefined})
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
        const contact=chooser.locator('input[type="email"]')
        const consent=chooser.locator('input[type="checkbox"]')
        const submit=chooser.locator('button[type="submit"]')
        diagnostic.readKeyboardTail=()=>consent.evaluate(collectKeyboardFailureTail)
        checkpoint(diagnostic,'contact-fill')
        await contact.fill(ALCHEMY_CONTACT)
        checkpoint(diagnostic,'initial-state')
        await expect(consent).not.toBeChecked()
        await expect(submit).toBeDisabled()
        if (mode==='keyboard') {
          // Start at naturally focused email, then use real sequential navigation.
          checkpoint(diagnostic,'keyboard-focus')
          await expect(contact).toBeFocused()
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
          await expect(submit).toBeEnabled()
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
          await expect(submit).toBeEnabled()
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
        await expect(submit).toBeDisabled()
        checkpoint(diagnostic,'terminal-links')
        await expect(chooser.locator('a[data-contact-channel]')).toHaveCount(0)
        checkpoint(diagnostic,'terminal-receipt')
        assert.equal(receipt.count,0)
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
    throw new Error(`CONSENT_NATIVE_ACCEPTANCE_FAILED ${diagnosticFields(diagnostic)}`)
  }
}

