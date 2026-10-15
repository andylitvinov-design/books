import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { installCheckoutResponseProbe } from './service-cart-response-probe.mjs'
import { mkdir, writeFile } from 'node:fs/promises'
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.HH_PLAYWRIGHT_PACKAGE || 'playwright')
const origin = process.env.HH_PUBLIC_QA_ORIGIN || 'http://127.0.0.1:3100'
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin)) throw new Error('Service cart QA requires an isolated loopback server')
const output = 'artifacts/service-cart'
const accountA = '11111111-1111-4111-8111-111111111111'
const accountB = '22222222-2222-4222-8222-222222222222'
const existingOrder = '33333333-3333-4333-8333-333333333333'
const repeatOrder = '44444444-4444-4444-8444-444444444444'
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const errors = [], externalNavigations = [], unexpectedCommerce = []
const order = (id, status, serviceId = 'personal-session-60') => ({ id, status, fulfillmentStatus: status === 'paid' ? 'awaiting_schedule' : 'awaiting_payment', items: [{ serviceId, quantity: 1, amountMinor: 10000, currency: 'EUR' }], currency: 'EUR', totalMinor: 10000 })
const deferred = () => { let resolve; const promise = new Promise((done) => { resolve = done }); return { promise, resolve } }
const bounded = async (promise, label, timeout = 15000) => {
  let timer
  try { return await Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`Timed out: ${label}`)), timeout) })]) }
  finally { clearTimeout(timer) }
}
const settle = (page) => bounded(page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))), 'two animation frames')
let stage = 'launch'
const mark = (value) => { stage = value; console.log(`[service-cart] ${value}`) }
async function captureFailure(h, error) {
  const diagnostic = { stage, message: error.message, url: h.page.url(), checkouts: h.state.checkouts,
    identities: h.state.identities, reads: h.state.reads, externalNavigations, unexpectedCommerce, errors }
  console.error('[service-cart] Failure', JSON.stringify(diagnostic))
  await writeFile(`${output}/failure.json`, JSON.stringify(diagnostic, null, 2) + '\n')
  await h.page.screenshot({ path: `${output}/failure.png`, fullPage: true, timeout: 5000 }).catch(() => {})
}
await mkdir(output, { recursive: true })
const browser = await chromium.launch()

async function harness(locale = 'en', width = 360) {
  // Fresh contexts and blocked service workers are required: no request may
  // bypass routing through a previously installed worker or another tab.
  const context = await browser.newContext({ viewport: { width, height: 844 }, serviceWorkers: 'block' })
  context.setDefaultTimeout(15000)
  context.setDefaultNavigationTimeout(30000)
  const state = { accountId: accountA, checkouts: [], identities: [], reads: [], orders: new Map(),
    checkout: async () => ({ status: 503, body: { error: 'SERVICE_CHECKOUT_UNAVAILABLE' } }) }
  await context.route('**/*', async (route) => {
    const request = route.request(), url = new URL(request.url())
    const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', headers: { 'Cache-Control': 'no-store' }, body: JSON.stringify(body) })
    // This covers popups and payment navigation as well as fetch. Even a broken
    // redirect guard cannot reach Stripe, WhatsApp or any other external host.
    if (url.origin !== origin) {
      if (request.isNavigationRequest()) externalNavigations.push(request.url())
      return route.abort('blockedbyclient')
    }
    const path = url.pathname, expected = request.headers()['x-hh-account-id']
    if (path === '/api/app/commerce/status') {
      state.identities.push({ expected, actual: state.accountId })
      if (!state.accountId) return json({ error: 'SIGN_IN_REQUIRED' }, 401)
      if (expected && expected !== state.accountId) return json({ error: 'ACCOUNT_CHANGED' }, 409)
      return json({ available: true, accountId: state.accountId })
    }
    if (path === '/api/app/commerce/checkout' && request.method() === 'POST') {
      const body = request.postDataJSON()
      state.checkouts.push({ body, expected, actual: state.accountId })
      if (!state.accountId) return json({ error: 'SIGN_IN_REQUIRED' }, 401)
      if (expected !== state.accountId) return json({ error: 'ACCOUNT_CHANGED' }, 409)
      const result = await state.checkout(body)
      return json(result.body, result.status ?? 200)
    }
    if (/^\/api\/app\/commerce\/orders\/[^/]+$/.test(path) && request.method() === 'GET') {
      const id = path.split('/').at(-1)
      state.reads.push({ id, expected, actual: state.accountId })
      if (!state.accountId) return json({ error: 'SIGN_IN_REQUIRED' }, 401)
      if (expected !== state.accountId) return json({ error: 'ACCOUNT_CHANGED' }, 409)
      const fixture = state.orders.get(id)
      if (!fixture) return json({ error: 'SERVICE_ORDER_NOT_FOUND' }, 404)
      return json({ order: await (typeof fixture === 'function' ? fixture() : fixture) })
    }
    if (path.startsWith('/api/app/commerce/')) {
      unexpectedCommerce.push(`${request.method()} ${path}`)
      return json({ error: 'UNMOCKED_COMMERCE_REQUEST' }, 501)
    }
    // No other API, form submission or server action can mutate even the local
    // fixture's backing services. Static pages/assets are the only passthrough.
    if (path.startsWith('/api/')) return json({ error: 'SYNTHETIC_SIGNED_OUT' }, 401)
    if (!['GET', 'HEAD'].includes(request.method())) return json({ error: 'SYNTHETIC_MUTATION_BLOCKED' }, 405)
    return route.continue()
  })
  const page = await context.newPage()
  page.on('pageerror', (error) => errors.push(error.message))
  const path = `/${locale}/services`
  mark(`${locale}/${width}: initial navigation`)
  await page.goto(origin + path)
  const cart = page.locator('[data-service-cart]'), cards = cart.locator('[data-service-product]')
  await cart.waitFor({ state: 'visible' })
  const pay = cart.locator('aside > button')
  const count = async (expected) => {
    await page.waitForFunction((value) => document.querySelectorAll('[data-service-cart] aside li').length === value, expected)
    assert.equal(await cart.locator('aside li').count(), expected)
  }
  const addSession = async () => {
    await cards.locator('button').nth(1).click()
    // Availability becomes true only after the initial authenticated A binding.
    // Wait for it before a test changes the simulated cookie account.
    await page.waitForFunction(() => { const button = document.querySelector('[data-service-cart] aside > button'); return button && !button.disabled })
  }
  return { context, page, cart, cards, pay, path, state, count, addSession }
}

try {
  for (const locale of ['en', 'ru', 'es']) for (const width of [360, 1024]) {
    const h = await harness(locale, width)
    try {
      const { page, cart, cards, pay, path, state } = h
      mark(`${locale}/${width}: selection, persistence and unavailable checkout`)
      await cards.nth(0).getByRole('button').click()
      await cards.nth(1).getByRole('button').click()
      await h.count(2)
      assert.match(await cart.locator('aside').innerText(), /150/)
      await page.reload(); await h.count(2)
      await cart.locator('aside li').first().getByRole('button').click(); await h.count(1)
      await pay.click(); await cart.getByRole('alert').waitFor()
      const first = state.checkouts.at(-1)
      assert.deepEqual(Object.keys(first.body).sort(), ['items', 'locale', 'operationId'])
      assert.deepEqual(first.body.items, [{ serviceId: 'personal-session-60', quantity: 1 }])
      assert.equal(first.body.locale, locale); assert.match(first.body.operationId, uuid)
      assert.equal(first.expected, accountA); await h.count(1)
      mark(`${locale}/${width}: strict layout and touch targets`)
      const viewport = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }))
      if (viewport.scroll > viewport.width + 1) {
        const diagnostic = await page.evaluate(() => {
          const cart = document.querySelector('[data-service-cart]')
          const bounds = (element) => {
            const rect = element.getBoundingClientRect(), style = getComputedStyle(element)
            return { tag: element.tagName.toLowerCase(), id: element.id,
              className: String(element.className?.baseVal ?? element.className ?? ''),
              scope: element.closest('[data-service-cart]') ? 'cart' : 'page',
              text: element.textContent?.trim().replace(/\s+/g, ' ').slice(0, 100),
              left: rect.left + scrollX, right: rect.right + scrollX, width: rect.width,
              clientWidth: element.clientWidth, scrollWidth: element.scrollWidth,
              display: style.display, minWidth: style.minWidth, maxWidth: style.maxWidth,
              whiteSpace: style.whiteSpace, overflowWrap: style.overflowWrap,
              overflowX: style.overflowX, grid: style.gridTemplateColumns, flexWrap: style.flexWrap }
          }
          const elements = Array.from(document.querySelectorAll('body *')).map(bounds)
          const outsideViewport = elements.filter((item) => item.width > 0 && (item.right > innerWidth + 1 || item.left < -1))
          const visibleOverflow = elements.filter((item) => item.width > 0 && item.overflowX === 'visible' && item.scrollWidth > item.clientWidth + 1)
          const result = { width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
            cart: bounds(cart), outsideViewport: outsideViewport.slice(0, 60), visibleOverflow: visibleOverflow.slice(0, 60),
            scrollWidthWithoutCart: null }
          // Diagnostic only: retain the original full-page assertion and restore
          // the cart immediately. This separates a baseline page/header issue
          // from cart content without clipping or accepting either overflow.
          const originalStyle = cart.getAttribute('style')
          try {
            cart.style.setProperty('display', 'none', 'important')
            result.scrollWidthWithoutCart = document.documentElement.scrollWidth
          } finally {
            if (originalStyle === null) cart.removeAttribute('style')
            else cart.setAttribute('style', originalStyle)
          }
          return result
        })
        console.error(`Overflow diagnostics ${locale}/${width}`, JSON.stringify(diagnostic))
        await writeFile(`${output}/${locale}-${width}-overflow.json`, JSON.stringify(diagnostic, null, 2) + '\n')
        await page.screenshot({ path: `${output}/${locale}-${width}-overflow.png`, fullPage: true })
      }
      assert.ok(viewport.scroll <= viewport.width + 1, `${locale}/${width} horizontal overflow (${viewport.scroll} > ${viewport.width})`)
      const targets = await cart.locator('button').evaluateAll((buttons) => buttons.map((button) => ({ width: button.getBoundingClientRect().width, height: button.getBoundingClientRect().height })))
      assert.ok(targets.every((target) => target.width >= 44 && target.height >= 44))
      await page.keyboard.press('Tab')
      assert.ok(await page.evaluate(() => document.activeElement !== document.body))
      await cart.screenshot({ path: `${output}/${locale}-${width}-selected-error.png` })

      // The durable server barrier must survive reload/new operation IDs. An
      // existing paid order neither silently buys again nor clears the choice.
      mark(`${locale}/${width}: durable repeat barrier`)
      state.checkout = async () => ({ body: { order: order(existingOrder, 'paid'), repeatPurchaseRequired: true, redirectUrl: null } })
      state.orders.set(existingOrder, order(existingOrder, 'paid'))
      await page.reload(); await h.count(1); await pay.click()
      const repeat = cart.getByRole('group')
      await repeat.waitFor(); await h.count(1)
      assert.equal(await pay.isDisabled(), true)
      assert.equal(state.checkouts.at(-1).body.repeatOrderId, undefined)
      const barrierOperation = state.checkouts.at(-1).body.operationId
      await page.reload(); await h.count(1); await pay.click(); await repeat.waitFor()
      assert.equal(state.checkouts.at(-1).body.repeatOrderId, undefined)
      assert.notEqual(state.checkouts.at(-1).body.operationId, barrierOperation)
      await cart.screenshot({ path: `${output}/${locale}-${width}-repeat-confirmation.png` })

      mark(`${locale}/${width}: explicit repeat purchase`)
      const beforeRepeat = state.checkouts.at(-1).body.operationId
      state.orders.set(repeatOrder, order(repeatOrder, 'processing'))
      state.checkout = async (body) => {
        assert.equal(body.repeatOrderId, existingOrder)
        assert.notEqual(body.operationId, beforeRepeat)
        assert.deepEqual(Object.keys(body).sort(), ['items', 'locale', 'operationId', 'repeatOrderId'])
        return { body: { order: order(repeatOrder, 'processing'), redirectUrl: null } }
      }
      // Only the explicit confirmation button adds the repeat reference.
      await repeat.getByRole('button').first().click()
      await repeat.waitFor({ state: 'hidden' }); await h.count(1)
      assert.equal(state.checkouts.at(-1).body.repeatOrderId, existingOrder)
      mark(`${locale}/${width}: verified paid return clears cart`)
      state.orders.set(repeatOrder, order(repeatOrder, 'paid'))
      await page.goto(`${origin}${path}?serviceOrder=${repeatOrder}#service-cart`)
      // Empty pre-hydration markup is not proof that the owned paid order has
      // cleared the persisted cart. Wait for its verified status first.
      await cart.getByRole('status').filter({ hasText: /Payment confirmed|Оплата подтверждена|Pago confirmado/ }).waitFor()
      await h.count(0)
      assert.ok(state.reads.every((read) => read.expected === accountA))
      mark(`${locale}/${width}: keep existing paid order`)
      // Keeping an existing paid order must not submit a second checkout.
      await h.addSession()
      state.checkout = async () => ({ body: { order: order(existingOrder, 'paid'), repeatPurchaseRequired: true, redirectUrl: null } })
      await pay.click(); await repeat.waitFor()
      const beforeKeep = state.checkouts.length
      await repeat.getByRole('button').nth(1).click(); await h.count(0)
      assert.equal(state.checkouts.length, beforeKeep)
    } catch (error) { await captureFailure(h, error); throw error } finally { await h.context.close() }
  }

  // A stale A page must not place an order as B, silently rebind, or pay after logout.
  for (const nextAccount of [accountB, null]) {
    const h = await harness()
    try {
      mark(`stale account: ${nextAccount ? 'switched' : 'signed out'}`)
      await h.addSession(); h.state.accountId = nextAccount
      await h.pay.click(); await h.cart.getByRole('alert').waitFor()
      assert.equal(h.state.checkouts.at(-1).expected, accountA)
      assert.equal(h.state.checkouts.at(-1).actual, nextAccount)
      assert.equal(await h.pay.isDisabled(), true); await h.count(1)
      assert.equal(await h.cart.getByRole('group').count(), 0)
    } catch (error) { await captureFailure(h, error); throw error } finally { await h.context.close() }
  }

  // An accepted A response arriving after cookie switch cannot redirect or show
  // A's order. The only Stripe URL in this test is synthetic and must not load.
  {
    const h = await harness(), delayed = deferred()
    try {
      mark('delayed checkout: account switch or unmount')
      await h.page.evaluate(installCheckoutResponseProbe)
      h.state.checkout = () => delayed.promise
      await h.addSession()
      const requested = h.page.waitForRequest((request) => request.url().endsWith('/commerce/checkout'))
      await h.pay.click(); await requested
      h.state.accountId = accountB
      delayed.resolve({ body: { order: order(existingOrder, 'open'), redirectUrl: 'https://checkout.stripe.com/c/pay/synthetic-never-navigate' } })
      await h.cart.getByRole('alert').waitFor(); assert.equal(await h.pay.isDisabled(), true)
      assert.equal(h.page.url(), origin + h.path)
      assert.ok(h.state.identities.some((read) => read.expected === accountA && read.actual === accountB))
      assert.equal(await h.cart.getByRole('status').count(), 0); await h.count(1)
    } catch (error) { await captureFailure(h, error); throw error } finally { delayed.resolve({ status: 503, body: { error: 'TEST_CLEANUP' } }); await h.context.close() }
  }

  // A private A order response cannot clear B's cart or appear after identity
  // changes while that response is in flight.
  {
    const h = await harness(), delayed = deferred()
    try {
      await h.addSession()
      mark('delayed private order: account switch')
      h.state.orders.set(existingOrder, () => delayed.promise)
      const requested = h.page.waitForRequest((request) => request.url().endsWith(`/commerce/orders/${existingOrder}`))
      await h.page.goto(`${origin}${h.path}?serviceOrder=${existingOrder}#service-cart`); await requested
      h.state.accountId = accountB; delayed.resolve(order(existingOrder, 'paid'))
      await h.cart.getByRole('alert').waitFor(); await h.count(1)
      assert.equal(await h.cart.getByRole('status').count(), 0)
      assert.equal(await h.pay.isDisabled(), true)
    } catch (error) { await captureFailure(h, error); throw error } finally { delayed.resolve(order(existingOrder, 'processing')); await h.context.close() }
  }

  // Client-side route unmount invalidates an outstanding checkout generation.
  {
    const h = await harness(), delayed = deferred()
    try {
      mark('delayed checkout: account switch or unmount')
      await h.page.evaluate(installCheckoutResponseProbe)
      h.state.checkout = () => delayed.promise
      await h.addSession()
      const requested = h.page.waitForRequest((request) => request.url().endsWith('/commerce/checkout'))
      await h.pay.click(); await requested
      mark('delayed checkout: SPA unmount')
      await h.cart.locator('a[href="/en/services/free-situation-review"]').click()
      await h.page.waitForURL(origin + '/en/services/free-situation-review')
      await h.cart.waitFor({ state: 'detached' })
      const identitiesBefore = h.state.identities.length, readsBefore = h.state.reads.length
      delayed.resolve({ body: { order: order(existingOrder, 'open'), redirectUrl: 'https://checkout.stripe.com/c/pay/synthetic-unmounted' } })
      mark('delayed checkout: response after SPA unmount')
      await h.page.waitForFunction(() => window.__serviceCartCheckoutProbe?.settled === 1)
      await settle(h.page)
      assert.deepEqual(await h.page.evaluate(() => window.__serviceCartCheckoutProbe), { received: 1, settled: 1, jsonReads: 0 })
      assert.equal(h.state.identities.length, identitiesBefore, 'stale checkout must not re-read identity')
      assert.equal(h.state.reads.length, readsBefore, 'stale checkout must not start order polling')
      assert.equal(h.page.url(), origin + '/en/services/free-situation-review')
    } catch (error) { await captureFailure(h, error); throw error } finally { delayed.resolve({ status: 503, body: { error: 'TEST_CLEANUP' } }); await h.context.close() }
  }

  assert.deepEqual(unexpectedCommerce, [], 'Every commerce request must have an explicit synthetic handler')
  assert.deepEqual(externalNavigations, [], 'A stale or unmounted response attempted external navigation')
  assert.deepEqual(errors, [])
  console.log('Service cart: RU/EN/ES at 360/1024px, selection/persistence, failure recovery, durable repeat barrier/explicit confirmation, owner binding, delayed account switch/unmount, and server-paid clearing passed. All API/payment traffic was synthetic; service workers and external navigation were blocked.')
} finally { await browser.close() }
