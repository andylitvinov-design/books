import assert from 'node:assert/strict'
import { withAlchemyConsentDiagnostics } from './alchemy-consent-diagnostics.mjs'
import {createCompactAlchemyRegistrationProfile,assertCompactAlchemyBody,installSyntheticContactPopup} from './contact-channel-verifier.mjs'

export const ALCHEMY_PHONE = '+14165550123'
export const ALCHEMY_NATIONAL_PHONE = '4165550123'
export const ALCHEMY_REFERENCE = 'HH-A1C4E0F12345'
export const ALCHEMY_RECEIPT_KEY = 'hh-service-enquiry-receipt:v1'
const portrait = '/images/holistic-house/portrait-static/andy-828-3dcbabded1e9.webp'
export const alchemyService = locale => locale === 'ru'
  ? 'Алхимия души / Психогомеопатия · Экспресс · 30 минут · €50'
  : 'Alchemy of the Soul / Psycho-homeopathy · Express review · 30 min · €50'

export function alchemyOrigin(raw, locale) {
  assert.ok(['en','ru'].includes(locale))
  const url = new URL(raw)
  assert.equal(url.protocol, 'http:')
  assert.ok(['127.0.0.1','localhost'].includes(url.hostname))
  assert.ok(url.port && !url.username && !url.password && !url.search && !url.hash)
  assert.equal(url.pathname, `/${locale}/services/alchemy-of-soul`)
  return url.origin
}

export function assertAlchemyBody(raw, locale) {
  const profile=createCompactAlchemyRegistrationProfile(`http://127.0.0.1:3000/${locale}/services/alchemy-of-soul`,{referenceCode:ALCHEMY_REFERENCE})
  assertCompactAlchemyBody(JSON.parse(raw),profile)
}

// Only Next's typed static namespace and the exact real receipt destination.
// No APIs, arbitrary same-origin pages, optimizers or external media are fetched.
export function permittedAlchemyRead(request, origin, locale) {
  const url = new URL(request.url())
  if (request.method() !== 'GET' || url.origin !== origin || url.username || url.password || url.hash) return false
  const type = request.resourceType()
  if (url.pathname === `/${locale}/thank-you`) {
    if (!['document','fetch'].includes(type)) return false
    if (url.search === '') return true
    return /^\?_rsc=[a-zA-Z0-9_-]{1,128}$/.test(url.search) && type === 'fetch'
  }
  // Next15 webpack config emits static/webpack/[fullhash].[runtime].hot-update.json
  // with xxhash64, hashDigestLength16. Both hosted engines requested this exact
  // webpack runtime form; aborting it causes module.hot.check to force a reload.
  // Only this static manifest GET/fetch is allowed, never arbitrary JSON or APIs.
  if (type === 'fetch' && !url.search && /^\/_next\/static\/webpack\/[a-f0-9]{16}\.webpack\.hot-update\.json$/.test(url.pathname)) return true
  if (url.pathname === portrait) return type === 'image' && !url.search
  // Next15 development getLayerAssets/renderCssResource append the request
  // timestamp via getAssetQueryString(ctx,true). This is not an arbitrary query
  // exemption: one decimal timestamp, only JS/CSS, with the same path/type gate.
  if (url.search && !(['script','stylesheet'].includes(type) && /^\?v=[1-9][0-9]{12}$/.test(url.search))) return false
  const extension = {script:'js',stylesheet:'css',font:'woff2?'}[type]
  return Boolean(extension && new RegExp('^/_next/static/(?:(?:[a-zA-Z0-9_-]+|%5[Bb]locale%5[Dd]|\\[locale\\])/)*[a-zA-Z0-9_.-]+\\.(?:'+extension+')$').test(url.pathname)
    && !url.pathname.includes('..'))
}

export function alchemyBoundarySummary(blockedReads, failures, count, completed) {
  return {completed,requestCount:count,failureCount:failures.length,blocked:blockedReads.map(read=>({
    // No query values, contact details, response body, headers or arbitrary URL.
    type:read.type,queryKind:read.queryKind || 'none',
    asset: /^\/_next\/static\/[a-zA-Z0-9_./%[\]()-]+$/.test(read.path) ? read.path : 'other',
  }))}
}

export function alchemyRequestGate(origin, locale, accept, failures, blockedReads, {initialDocument=false,allowReceipt=true}={}) {
  let draining = false, initialAllowed = initialDocument
  const gate = async route => {
    const request = route.request()
    try {
      if (request.url() === origin + '/api/service-enquiries' && request.method() === 'POST') return await accept(route)
      const initial = initialAllowed && request.method()==='GET' && request.resourceType()==='document' && request.url()===origin+`/${locale}/services/alchemy-of-soul`
      const receiptRead = new URL(request.url()).pathname===`/${locale}/thank-you`
      if (initial || ((!receiptRead || allowReceipt) && permittedAlchemyRead(request, origin, locale))) {
        // Teardown stops admitting reads, but never exempts API/write validation.
        // Already admitted reads still settle and retain every error.
        if (draining) return await route.abort()
        // continue() follows redirects outside a route guard. Fetch zero redirects,
        // verify the response and deliver the real response to the genuine router.
        const response = await route.fetch({maxRedirects:0})
        try {
          assert.equal(response.url(), request.url(), 'No rewritten or redirected read')
          assert.ok(response.status() >= 200 && response.status() < 300, 'Allowed local read must succeed without redirect')
          await route.fulfill({response})
        } finally { await response.dispose() }
        return
      }
      const url = new URL(request.url())
      // Speculative page/media reads are safely blocked, not evidence of a form
      // write failure. An API call or any unexpected mutation always fails CI.
      if (request.method() !== 'GET' || url.pathname.startsWith('/api/')) failures.push('Unexpected write/API blocked')
      else blockedReads.push({path:url.pathname,type:request.resourceType(),queryKind:!url.search?'none':/^\?v=[1-9][0-9]{12}$/.test(url.search)?'next-dev-version':'other'})
      await route.abort()
    } catch (error) {
      failures.push(error.message)
      await route.abort()
    }
  }
  gate.endInitialDocument = () => { initialAllowed = false }
  gate.beginTeardown = () => { draining = true }
  return gate
}

export function syntheticAlchemyReceipt(locale, {onSaved=async()=>{}}={}) {
  let firstBody, count = 0, pending = null, closed = false, armed = false
  return {
    arm(){ assert.equal(closed,false,'No request accepted after fixture closes'); assert.equal(armed,false); assert.equal(pending,null); assert.ok(count<2,'At most initial failure and explicit retry'); armed=true },
    get count(){ return count },
    get pending(){ return Boolean(pending) },
    async accept(route) {
      assert.equal(closed, false, 'No request accepted after fixture closes')
      assert.equal(armed,true,'Only an explicit consented channel action may submit')
      armed=false
      const raw = route.request().postData()
      assertAlchemyBody(raw, locale)
      if (firstBody !== undefined) assert.equal(raw, firstBody, 'Retry body and UUID must be byte-identical')
      else firstBody = raw
      assert.ok(count < 2, 'At most initial failure and explicit retry')
      count++
      if (count === 1) await route.fulfill({status:503,contentType:'application/json',body:'{"saved":false}'})
      else pending = route
    },
    async confirm() {
      assert.equal(closed, false, 'Stale fixture outcome is rejected')
      assert.ok(pending, 'A real intercepted retry is required')
      const route = pending
      await onSaved()
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({saved:true,referenceCode:ALCHEMY_REFERENCE})})
      pending = null
    },
    async close() {
      closed = true
      const route = pending; pending = null
      if (route) await route.abort()
    },
  }
}

// The context guard is installed before any page or navigation exists. Only an
// exact local public document/static read or the armed synthetic POST is admitted.
export async function withAlchemyIsolation(context, handler, receipt, denyStorage, run) {
  let primary, result, page, popupAttempts=0, pageCount=0
  const errors = [], active = new Set()
  const track = promise => {
    const pending=Promise.resolve(promise);active.add(pending)
    pending.then(()=>active.delete(pending),error=>{errors.push(error);active.delete(pending)})
    return pending
  }
  const tracked = route => track(Promise.resolve().then(()=>handler(route)))
  const drain=async()=>{while(active.size) await Promise.allSettled([...active])}
  try {
    await context.route('**/*',tracked)
    await context.routeWebSocket('**/*',socket=>track(Promise.resolve().then(()=>socket.close())))
    await context.exposeBinding('__alchemyUnexpectedPopup',()=>{popupAttempts++})
    context.on('page',opened=>{if(++pageCount>1){popupAttempts++;void track(opened.close())}})
    await context.addInitScript(({key,deny})=>{
      window.__alchemyFixture={open:window.open,setItem:Storage.prototype.setItem,opens:0}
      window.open=()=>{window.__alchemyFixture.opens++;void window.__alchemyUnexpectedPopup().catch(()=>{});return null}
      if(deny) Storage.prototype.setItem=function(k,v){
        if(this===sessionStorage&&k===key)throw new DOMException('Synthetic receipt-only storage denial','SecurityError')
        return window.__alchemyFixture.setItem.call(this,k,v)
      }
    },{key:ALCHEMY_RECEIPT_KEY,deny:denyStorage})
    page=await context.newPage()
    result=await run(page,drain)
  } catch(error){primary=error}
  finally {
    for(const cleanup of [()=>handler.beginTeardown?.(),()=>receipt.close(),drain,
      async()=>{if(page&&!page.isClosed())await page.evaluate(key=>{
        const fixture=window.__alchemyFixture
        if(fixture){window.open=fixture.open;Storage.prototype.setItem=fixture.setItem;delete window.__alchemyFixture}
        sessionStorage.removeItem(key)
      },ALCHEMY_RECEIPT_KEY)},
      // The context-owned guard must remain installed through context.close;
      // disposing the isolated context also disposes its route ownership.
      ()=>context.close(),drain]) {
      try{await cleanup()}catch(error){errors.push(error)}
    }
  }
  if(primary)throw primary
  assert.equal(popupAttempts,0,'No unowned popup may escape the isolated fixture')
  if(errors.length)throw new AggregateError(errors,'Alchemy fixture cleanup failed')
  return result
}

export async function verifyAlchemyEnquiryJourney(sourcePage, expect, locale, {denyReceiptStorage=false,channel='whatsapp'}={}) {
  assert.ok(['whatsapp','telegram'].includes(channel))
  const origin=alchemyOrigin(sourcePage.url(),locale)
  const profile=createCompactAlchemyRegistrationProfile(sourcePage.url(),{referenceCode:ALCHEMY_REFERENCE})
  const context=await sourcePage.context().browser().newContext({serviceWorkers:'block',viewport:sourcePage.viewportSize()})
  const failures=[],blockedReads=[],pageErrors=[]
  let popup,completed=false
  const receipt=syntheticAlchemyReceipt(locale,{onSaved:()=>popup.acknowledgeSaved()})
  const handler=alchemyRequestGate(origin,locale,route=>receipt.accept(route),failures,blockedReads,{initialDocument:true,allowReceipt:false})
  try {
    const result=await withAlchemyIsolation(context,handler,receipt,denyReceiptStorage,async(page,drain)=>{
      page.on('pageerror',error=>pageErrors.push(error.message))
      await page.goto(origin+profile.sourcePath,{waitUntil:'networkidle'})
      handler.endInitialDocument();await drain()
      popup=await installSyntheticContactPopup(page,{expectedDestination:profile[channel+'Url']})
      let primary
      try {return await verifyAlchemyInPage(page,expect,profile,{denyReceiptStorage,channel,receipt,popup,failures,blockedReads})}
      catch(error){primary=error;throw error}
      finally {try{await popup.restore()}catch(error){if(!primary)throw error}}
    })
    assert.equal(receipt.count,2);assert.deepEqual(failures,[]);assert.deepEqual(pageErrors,[])
    completed=true;return result
  } finally {
    console.log('SYNTHETIC_ALCHEMY_BOUNDARY',JSON.stringify({locale,denyReceiptStorage,
      ...alchemyBoundarySummary(blockedReads,failures,receipt.count,completed)}))
  }
}

async function verifyAlchemyInPage(page,expect,profile,{denyReceiptStorage,channel,receipt,popup,failures,blockedReads}) {
  const {locale}=profile, originalURL=page.url()
  const pricing=page.locator('[data-alchemy-booking-formats]')
  const chooser=pricing.locator('[data-contact-channel-chooser]')
  const noReceipt=async()=>{
    await expect(chooser.locator('a[data-contact-channel]')).toHaveCount(0)
    await expect(chooser.locator('[role="status"]')).toHaveCount(0)
    assert.equal(await page.evaluate(key=>sessionStorage.getItem(key),ALCHEMY_RECEIPT_KEY),null)
    await expect(page).toHaveURL(originalURL)
  }
  const {contact,country,consent,actions,submit}=await withAlchemyConsentDiagnostics(page,
    {locale,denyReceiptStorage,expectedPhone:ALCHEMY_NATIONAL_PHONE},async()=>{
    await pricing.locator('[data-alchemy-format="30"]').click()
    await expect(pricing.locator('[data-alchemy-format="30"]')).toHaveAttribute('aria-pressed','true')
    await chooser.locator('[data-contact-order]').click()
    const phone=chooser.locator('[data-phone-country-input]'),contact=phone.locator('input[type="tel"]'),country=phone.locator('select')
    const consent=chooser.locator('input[type="checkbox"]')
    const actions=['whatsapp','telegram'].map(value=>chooser.locator(`[data-contact-channel-submit="${value}"]`))
    const submit=chooser.locator(`[data-contact-channel-submit="${channel}"]`)
    await expect(chooser.locator('[data-contact-channel-submit]')).toHaveCount(2)
    await expect(consent).not.toBeChecked()
    for(const action of actions){await expect(action).toBeVisible();await expect(action).toBeEnabled()}
    await country.selectOption('CA');await contact.fill(ALCHEMY_NATIONAL_PHONE)
    // Both explicit actions reject missing native consent before popup or POST.
    for(const action of actions)await action.click()
    assert.equal(receipt.count,0);await popup.assertClean();assert.deepEqual((await popup.snapshot()).attempts,[])
    await noReceipt()
    assert.equal(receipt.count,0)
    await consent.check()
    return {contact,country,consent,actions,submit}
  })
  assert.equal(receipt.count,0);await noReceipt();assert.deepEqual((await popup.snapshot()).attempts,[])
  receipt.arm();await popup.arm();await submit.click()
  await expect.poll(()=>receipt.count).toBe(1)
  await expect(chooser.locator('[role="alert"]')).toBeVisible()
  for(const action of actions)await expect(action).toBeEnabled()
  await popup.assertAttempt({saved:false})
  await expect(contact).toBeDisabled();await expect(country).toBeDisabled();await expect(consent).toBeDisabled()
  for(const format of ['30','60','month'])await expect(pricing.locator(`[data-alchemy-format="${format}"]`)).toBeDisabled()
  await noReceipt()
  receipt.arm();await popup.arm();await submit.click()
  await expect.poll(()=>receipt.pending).toBe(true)
  for(const action of actions)await expect(action).toBeDisabled()
  await noReceipt();assert.deepEqual(failures,[])
  assert.deepEqual((await popup.snapshot()).attempts.at(-1).events,['reserved'],'No handoff before saved acknowledgment')
  await receipt.confirm()
  await expect(chooser.locator('[role="status"]')).toContainText(ALCHEMY_REFERENCE)
  await expect(page).toHaveURL(originalURL);await expect(chooser.locator('form')).toHaveCount(0)
  for(const value of ['whatsapp','telegram']) {
    const link=chooser.locator(`a[data-contact-channel="${value}"]`)
    await expect(link).toBeVisible();assert.equal(await link.getAttribute('href'),profile[value+'Url'])
    assert.ok(!decodeURIComponent(await link.getAttribute('href')).includes(ALCHEMY_PHONE))
  }
  await popup.assertAttempt({saved:true})
  const stored=await page.evaluate(key=>JSON.parse(sessionStorage.getItem(key)),ALCHEMY_RECEIPT_KEY)
  if(denyReceiptStorage)assert.equal(stored,null)
  else {assert.deepEqual(Object.keys(stored).sort(),['createdAt','referenceCode']);assert.equal(stored.referenceCode,ALCHEMY_REFERENCE);assert.ok(Number.isSafeInteger(stored.createdAt))}
  // Closing/reopening the allowed disclosure cannot recalculate the saved draft.
  await chooser.locator('[data-contact-order]').click();await chooser.locator('[data-contact-order]').click()
  for(const value of ['whatsapp','telegram'])assert.equal(await chooser.locator(`a[data-contact-channel="${value}"]`).getAttribute('href'),profile[value+'Url'])
  assert.equal(receipt.count,2);assert.deepEqual(failures,[])
  return {blockedReads}
}
