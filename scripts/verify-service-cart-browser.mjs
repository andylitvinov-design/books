import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir } from 'node:fs/promises'
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.HH_PLAYWRIGHT_PACKAGE || 'playwright')
const origin = process.env.HH_PUBLIC_QA_ORIGIN || 'http://127.0.0.1:3100'
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin)) throw new Error('Service cart QA requires an isolated loopback server')
const output = 'artifacts/service-cart'
await mkdir(output, { recursive: true })
const browser = await chromium.launch()
const errors = []
try {
  for (const locale of ['en', 'ru', 'es']) for (const width of [360, 1024]) {
    const context = await browser.newContext({ viewport: { width, height: 844 } })
    const page = await context.newPage()
    page.on('pageerror', (error) => errors.push(error.message))
    let submitted = null
    await page.route('**/api/app/commerce/status', (route) => route.fulfill({ contentType: 'application/json', body: '{"available":true,"accountId":"11111111-1111-4111-8111-111111111111"}' }))
    await page.route('**/api/app/commerce/checkout', (route) => {
      assert.equal(route.request().headers()['x-hh-account-id'], '11111111-1111-4111-8111-111111111111')
      submitted = route.request().postDataJSON()
      return route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"SERVICE_CHECKOUT_UNAVAILABLE"}' })
    })
    const path = `/${locale}/services`
    await page.goto(origin + path)
    const cart = page.locator('[data-service-cart]')
    await cart.waitFor({ state: 'visible' })
    const cards = cart.locator('[data-service-product]')
    await cards.nth(0).getByRole('button').click()
    await cards.nth(1).getByRole('button').click()
    assert.equal(await cart.locator('aside li').count(), 2)
    assert.match(await cart.locator('aside').innerText(), /150/)
    await page.reload()
    await cart.locator('aside li').first().waitFor()
    assert.equal(await cart.locator('aside li').count(), 2)
    await cart.locator('aside li').first().getByRole('button').click()
    assert.equal(await cart.locator('aside li').count(), 1)
    await cart.locator('aside > button').click()
    await cart.getByRole('alert').waitFor()
    assert.deepEqual(Object.keys(submitted).sort(), ['items', 'locale', 'operationId'])
    assert.deepEqual(submitted.items, [{ serviceId: 'personal-session-60', quantity: 1 }])
    assert.equal(submitted.locale, locale)
    assert.equal(await cart.locator('aside li').count(), 1)
    const viewport = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }))
    assert.ok(viewport.scroll <= viewport.width + 1, `${locale}/${width} horizontal overflow`)
    const targets = await cart.locator('button').evaluateAll((buttons) => buttons.map((button) => ({ width: button.getBoundingClientRect().width, height: button.getBoundingClientRect().height })))
    assert.ok(targets.every((target) => target.width >= 44 && target.height >= 44))
    await page.keyboard.press('Tab')
    assert.ok(await page.evaluate(() => document.activeElement !== document.body))
    await cart.screenshot({ path: `${output}/${locale}-${width}-selected-error.png` })
    // A success-looking query never clears the cart without server proof.
    const orderId = '33333333-3333-4333-8333-333333333333'
    await page.route('**/api/app/commerce/orders/*', (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ order: { id: orderId, status: 'processing', items: [{ serviceId: 'personal-session-60' }] } }) }))
    await page.goto(`${origin}${path}?serviceOrder=${orderId}#service-cart`)
    await cart.locator('aside li').first().waitFor()
    assert.equal(await cart.locator('aside li').count(), 1)
    await page.unroute('**/api/app/commerce/orders/*')
    await page.route('**/api/app/commerce/orders/*', (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ order: { id: orderId, status: 'paid', items: [{ serviceId: 'personal-session-60' }] } }) }))
    await page.reload()
    await page.waitForFunction(() => document.querySelectorAll('[data-service-cart] aside li').length === 0)
    await context.close()
  }
  assert.deepEqual(errors, [])
  console.log('Service cart: RU/EN/ES, 360/1024px, add/remove/persistence, failure recovery, server-paid confirmation passed. No real checkout performed.')
} finally { await browser.close() }
