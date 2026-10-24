import assert from 'node:assert/strict'
import {ALCHEMY_CONTACT, alchemyOrigin, alchemyRequestGate, syntheticAlchemyReceipt} from './alchemy-enquiry-journey-verifier.mjs'


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
export async function withConsentBootstrap(context, gate, run) {
  const active=new Set(), errors=[]
  let primary=false,result,popupAttempts=0,pageCount=0
  const tracked=route=>{
    const pending=Promise.resolve().then(()=>gate(route));active.add(pending)
    pending.then(()=>active.delete(pending),()=>{errors.push('CONSENT_ASYNC_FAILED');active.delete(pending)})
    return pending
  }
  const drain=async()=>{while(active.size) await Promise.allSettled([...active])}
  try {
    await context.route('**/*',tracked)
    await context.routeWebSocket('**/*',socket=>{
      const pending=Promise.resolve().then(()=>socket.close()).catch(()=>{throw new Error('CONSENT_SOCKET_CLOSE_FAILED')});active.add(pending)
      pending.then(()=>active.delete(pending),()=>{errors.push('CONSENT_SOCKET_CLOSE_FAILED');active.delete(pending)})
      return pending
    })
    await context.exposeBinding('__consentReportPopup',()=>{popupAttempts++})
    context.on('page',page=>{
      pageCount++
      if(pageCount>1) {
        popupAttempts++
        const pending=Promise.resolve().then(()=>page.close());active.add(pending)
        pending.then(()=>active.delete(pending),()=>{errors.push('CONSENT_POPUP_CLOSE_FAILED');active.delete(pending)})
      }
    })
    await context.addInitScript(installConsentPopupGuard)
    result=await run(drain)
  } catch {primary=true}
  finally {
    for(const cleanup of [()=>gate.beginTeardown(),drain,()=>context.close(),drain]) {
      try {await cleanup()} catch {errors.push('CONSENT_CLEANUP_FAILED')}
    }
  }
  if(popupAttempts) throw new Error('CONSENT_POPUP_ATTEMPTED')
  if(primary) throw new Error('CONSENT_NATIVE_RUN_FAILED')
  if(errors.length) throw new Error('CONSENT_CLEANUP_FAILED')
  return result
}

// Additional isolated acceptance only. The existing pointer check() journey is
// unchanged and must pass independently; none of these scenarios pre-focus it.
async function verifyNative(sourcePage, expect, locale) {
  const origin = alchemyOrigin(sourcePage.url(), locale)
  for (const mode of ['keyboard', 'label', 'canceled-pointer']) {
    const context = await sourcePage.context().browser().newContext({serviceWorkers:'block',viewport:sourcePage.viewportSize()})
    const errors=[], failures=[], blocked=[]
    const initialGate=consentInitialGate(origin,locale,failures,blocked)
    await withConsentBootstrap(context,initialGate,async drainInitial=>{
      const page=await context.newPage()
      page.on('pageerror',()=>errors.push('CONSENT_PAGE_ERROR'))
      await page.goto(origin+`/${locale}/services/alchemy-of-soul`,{waitUntil:'networkidle'})
      initialGate.endInitialDocument()
      await drainInitial()
      const receipt=syntheticAlchemyReceipt(locale)
      {
        const pricing=page.locator('[data-alchemy-booking-formats]')
        await pricing.locator('[data-alchemy-format="30"]').click()
        const chooser=pricing.locator('[data-contact-channel-chooser]')
        await chooser.locator('[data-contact-order]').click()
        const contact=chooser.locator('input[type="email"]')
        const consent=chooser.locator('input[type="checkbox"]')
        const submit=chooser.locator('button[type="submit"]')
        await contact.fill(ALCHEMY_CONTACT)
        await expect(consent).not.toBeChecked()
        await expect(submit).toBeDisabled()
        if (mode==='keyboard') {
          // Start at naturally focused email, then use real sequential navigation.
          await expect(contact).toBeFocused()
          for (let i=0;i<12 && !await consent.evaluate(node=>node===document.activeElement);i++) await page.keyboard.press('Tab')
          await expect(consent).toBeFocused()
          await expect(consent).toBeVisible()
          const visible=await consent.evaluate(node=>{
            const r=node.getBoundingClientRect(),style=getComputedStyle(node)
            return {inside:r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth,
              outlined:style.outlineStyle!=='none'&&parseFloat(style.outlineWidth)>0}
          })
          assert.deepEqual(visible,{inside:true,outlined:true})
          await page.keyboard.press('Space')
          await expect(consent).toBeChecked()
          await expect(submit).toBeEnabled()
          await page.keyboard.press('Space')
          await expect(consent).not.toBeChecked()
          await page.keyboard.press('Shift+Tab')
          await expect(consent).not.toBeFocused()
        } else if (mode==='label') {
          const text=consent.locator('..').locator('span')
          await text.click()
          await expect(consent).toBeChecked()
          await expect(submit).toBeEnabled()
          await text.click()
          await expect(consent).not.toBeChecked()
        } else {
          // A real press followed by release outside the entire label must not
          // activate consent. No synthetic dispatchEvent, focus or checked setter.
          await consent.scrollIntoViewIfNeeded()
          const r=await consent.boundingBox()
          assert.ok(r)
          const labelRect=await consent.locator('..').boundingBox()
          assert.ok(labelRect)
          assert.ok(1<labelRect.x || 1>labelRect.x+labelRect.width || 1<labelRect.y || 1>labelRect.y+labelRect.height)
          await page.mouse.move(r.x+r.width/2,r.y+r.height/2)
          await page.mouse.down()
          await page.mouse.move(1,1)
          await page.mouse.up()
          await expect(consent).not.toBeChecked()
        }
        await expect(submit).toBeDisabled()
        await expect(chooser.locator('a[data-contact-channel]')).toHaveCount(0)
        assert.equal(receipt.count,0)
        assert.equal(await page.evaluate(()=>window.__consentPopupAttempts),0)
        assert.deepEqual(failures,[])
      }
      assert.deepEqual(errors,[])
      assert.deepEqual(failures,[])
    })
    assert.deepEqual(errors,[])
    assert.deepEqual(failures,[])
  }
}

export async function verifyContactConsentNativeAcceptance(sourcePage, expect, locale) {
  try { await verifyNative(sourcePage,expect,locale) }
  catch { throw new Error('CONSENT_NATIVE_ACCEPTANCE_FAILED') }
}
