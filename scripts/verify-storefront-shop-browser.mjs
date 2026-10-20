import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'

const require = createRequire(import.meta.url)
const { chromium, webkit } = require(process.env.HH_PLAYWRIGHT_PACKAGE || 'playwright')
const origin = process.env.HH_PUBLIC_QA_ORIGIN || 'http://127.0.0.1:3100'
if (!/^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/.test(origin))
  throw new Error('Shop browser QA requires an isolated loopback origin')

const folder = 'artifacts/storefront-shop'
await mkdir(folder, { recursive: true })
const checks = []
const scripts = []
const engines = { chromium, webkit }
const scenarios = [
  { locale: 'en', width: 320, engine: 'webkit' },
  { locale: 'ru', width: 390, engine: 'webkit' },
  { locale: 'es', width: 430, engine: 'webkit' },
  { locale: 'en', width: 1024, engine: 'chromium' },
]
const running = new Map()
try {
  for (const scenario of scenarios) {
    const { locale, width, engine } = scenario
    if (!running.has(engine)) running.set(engine, await engines[engine].launch())
    const browser = running.get(engine)
    const context = await browser.newContext({
      viewport: { width, height: 844 }, isMobile: width < 600,
      hasTouch: width < 600, serviceWorkers: 'block',
    })
    context.setDefaultTimeout(18000)
    const page = await context.newPage()
    const failures = []
    page.on('pageerror', error => failures.push(error.message))
    // Never send a synthetic browser test to a live PSP, CRM or external site.
    await context.route('**/*', async route => {
      const req = route.request()
      const url = new URL(req.url())
      if (url.origin !== origin || !['GET','HEAD'].includes(req.method())) return route.abort('blockedbyclient')
      return route.continue()
    })
    const location = origin + '/' + locale + '/shop'
    try {
      const response = await page.goto(location, { waitUntil: 'networkidle', timeout: 30000 })
      assert.equal(response?.status(), 200, locale + ': shop route HTTP')
      const shop = page.locator('[data-service-storefront]')
      await shop.waitFor({ state: 'visible' })
      assert.equal(await page.locator('[data-shop-product]').count(), 7)
      assert.equal(await page.locator('[data-shop-filter]').count(), 4)
      assert.equal(await page.locator('[data-shop-add]').count(), 2)
      assert.equal(await page.locator('[data-shop-checkout]').count(), 2)
      const reportOverflow = async () => page.evaluate(() => ({
        viewport: innerWidth, scrollWidth: document.documentElement.scrollWidth,
      }))
      const originalSize = await reportOverflow()
      assert.ok(originalSize.scrollWidth <= originalSize.viewport + 1,
        locale + '/' + width + ': horizontal overflow ' + JSON.stringify(originalSize))

      await page.locator('[data-shop-filter="program"]').click()
      assert.equal(await page.locator('[data-shop-product]').count(), 3)
      assert.equal(await page.locator('[data-shop-add]').count(), 0,
        'Unpriced programmes must never enter the paid cart')
      await page.locator('[data-shop-search]').fill('zzzz-unmatched-shop-phrase')
      assert.equal(await page.locator('[data-shop-product]').count(), 0)
      await page.locator('[data-shop-search]').fill('')
      await page.locator('[data-shop-filter="free"]').click()
      assert.equal(await page.locator('[data-shop-product]').count(), 2)
      assert.equal(await page.locator('[data-shop-add]').count(), 0,
        'Free resources must never charge money')
      await page.locator('[data-shop-filter="session"]').click()
      assert.equal(await page.locator('[data-shop-product]').count(), 2)

      const add = page.locator('[data-shop-add="express-consultation-30"]')
      const bounds = await add.boundingBox()
      assert.ok(bounds && bounds.height >= 40, 'Add button touch target too small')
      await add.click()
      await page.waitForFunction(() => {
        const node = document.querySelector('[data-shop-cart-summary]')
        return node && node.textContent && /50/.test(node.textContent) &&
          node.textContent.includes('1')
      })
      assert.equal(await page.evaluate(() =>
        JSON.parse(sessionStorage.getItem('hh-service-cart-v1') || '[]').join(',')),
        'express-consultation-30')
      const href = await page.locator('[data-shop-checkout="express-consultation-30"]').getAttribute('href')
      assert.ok(href && href.startsWith('/' + locale + '/cart?items='))
      await page.locator('[data-shop-checkout="express-consultation-30"]').click()
      await page.waitForURL('**/' + locale + '/cart?items=*')
      const cart = page.locator('[data-personal-service-cart]')
      await cart.waitFor({ state: 'visible' })
      await page.waitForFunction(() => {
        const element = document.querySelector('[data-personal-service-cart]')
        return element && /50/.test(element.textContent || '')
      })
      // No provider navigation: inspect only that the canonical payee/price are retained.
      const manual = page.locator('[data-cart-paypal-personal]')
      if (await manual.count()) {
        assert.equal(await manual.getAttribute('href'), 'https://paypal.me/psitrends/50EUR')
      }
      assert.equal(await page.locator('[data-cart-square-payment-link]').count(), 0,
        'Unapproved Square link must stay hidden')
      assert.equal(await page.locator('[data-cart-paypal-hosted]').count(), 0,
        'Unapproved PayPal hosted link must stay hidden')
      assert.equal(await page.locator('[data-cart-verified-paypal-checkout]').count(), 0,
        'Merchant Orders v2 must stay disabled without financial ledger')
      const cartSize = await reportOverflow()
      assert.ok(cartSize.scrollWidth <= cartSize.viewport + 1,
        locale + '/' + width + ': cart horizontal overflow ' + JSON.stringify(cartSize))
      assert.deepEqual(failures, [], 'Client JavaScript errors')
      if (width === 390 || width === 320) {
        await page.screenshot({ path: folder + '/cart-' + locale + '-' + width + '.png',
          fullPage: true, timeout: 12000 })
      }
      checks.push({ locale, width, engine, shop: 200, sessionCount: 2,
        programmeCount: 3, freeCount: 2, cart: 'EUR50', overflow: false })
    } catch (error) {
      await page.screenshot({ path: folder + '/failed-' + locale + '-' + width + '.png',
        fullPage: true, timeout: 6000 }).catch(() => {})
      scripts.push({ locale, width, engine, message: error.message, failures })
      throw error
    } finally {
      await context.close()
    }
  }
} finally {
  for (const browser of running.values()) await browser.close()
  await writeFile(folder + '/summary.json', JSON.stringify({ checks, errors: scripts }, null, 2) + '\n')
}
console.log('[storefront-shop] ' + checks.length + ' smoke scenarios passed')
