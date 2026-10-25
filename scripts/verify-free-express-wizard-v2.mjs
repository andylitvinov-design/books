// Synthetic, read-only/local-browser journey against a build with the v2 flag ON.
// All API writes are mocked in the browser; no real CRM leads, client photos,
// external messenger messages, account saves or bookings are created.
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
const { chromium, webkit } = await import(process.env.HH_PLAYWRIGHT_PACKAGE || 'playwright')
const origin = (process.env.HH_LIVE_ORIGIN || 'http://127.0.0.1:3101').replace(/\/$/, '')
const output = 'artifacts/free-express-wizard-v2'
mkdirSync(output, { recursive: true })
const results = []
const HH = 'HH-A1B2C3D4E5F6'

for (const [engine, driver] of [['chromium', chromium], ['webkit', webkit]]) {
  const browser = await driver.launch({ headless: true })
  try {
    for (const locale of ['en', 'ru', 'es']) {
      for (const [width, height] of [[320, 640], [390, 844], [430, 932]]) {
        const ctx = await browser.newContext({
          viewport: { width, height }, isMobile: true, hasTouch: true,
          reducedMotion: 'reduce', serviceWorkers: 'block',
        })
        const page = await ctx.newPage()
        const errors = []
        let submits = 0, details = 0, uploads = 0
        page.on('pageerror', error => errors.push(error.message))
        await page.route('**/api/service-enquiries', async route => {
          submits += 1
          const data = route.request().postDataJSON()
          assert.equal(data.contactConsent, true)
          assert.equal(data.sourcePath, '/' + locale + '/services/free-situation-review')
          assert.ok(data.description.includes('Initial question:'))
          await route.fulfill({ status: 201, contentType: 'application/json',
            body: JSON.stringify({ id: '9d891d6c-2b9a-410c-8fe2-850a0840169a', saved: true,
              referenceCode: HH, contactPending: false }) })
        })
        await page.route('**/api/free-express', async route => {
          if (route.request().method() === 'POST') {
            details += 1
            const input = route.request().postDataJSON()
            assert.equal(input.consent, true)
            assert.ok(['short','detailed'].includes(input.mode))
          }
          await route.fulfill({ status: 200, contentType: 'application/json',
            body: JSON.stringify({ saved: true, contextSaved: true, referenceCode: HH }) })
        })
        await page.route('**/api/free-express/media', async route => {
          if (route.request().method() === 'POST') uploads += 1
          await route.fulfill({ status: 200, contentType: 'application/json',
            body: JSON.stringify({ portrait: false, drawing: false }) })
        })
        try {
          const res = await page.goto(origin + '/' + locale + '/services/free-situation-review',
            { waitUntil: 'domcontentloaded', timeout: 60000 })
          assert.equal(res?.status(), 200)
          const reveal = page.locator('[data-express-reveal]')
          await reveal.click()
          const wizard = page.locator('[data-free-express-wizard]')
          await wizard.waitFor({ state: 'visible' })
          assert.equal(await page.locator('[role=dialog],[aria-modal=true]').count(), 0)
          assert.equal(await page.locator('[data-free-diagnostic-start]').count(), 0)
          assert.equal(await wizard.locator('[data-free-express-lead]').count(), 1)
          assert.equal(await wizard.locator('input[type=checkbox]:checked').count(), 0)
          const bodyWidth = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
          assert.ok(bodyWidth <= 2, 'No horizontal scroll: ' + bodyWidth)
          await page.screenshot({ path: output + '/' + engine + '-' + locale + '-' + width + '.png',
            animations: 'disabled' })

          // Exercise full no-provider path in both engines, RU/390.
          if (locale === 'ru' && width === 390) {
            const form = wizard.locator('[data-free-express-lead]')
            await form.locator('[data-phone-country-input] input[type=tel]').fill('4165551234')
            await form.locator('textarea').fill('Не могу определиться с важным решением по работе.')
            assert.equal(submits, 0, 'No lead before explicit consent')
            await form.locator('button[type=submit]').click()
            assert.equal(submits, 0, 'No lead if checkbox is unchecked')
            await form.locator('input[type=checkbox]').check()
            await form.locator('button[type=submit]').click()
            await wizard.locator('[data-free-express-receipt]').waitFor({ state: 'visible' })
            assert.equal(await wizard.locator('[data-free-express-receipt]').innerText().then(x => x.includes(HH)), true)
            assert.equal(submits, 1, 'Only one base CRM POST')
            const q = wizard.locator('[data-free-express-questions]')
            await q.locator('button[aria-pressed=false]').click()
            assert.ok(await q.locator('textarea').count() >= 20, 'Reuse all authored detailed prompts')
            await q.locator('button[aria-pressed=false]').click()
            assert.equal(await q.locator('textarea').count(), 3)
            await q.locator('textarea').nth(0).fill('Главная сложность в выборе.')
            await q.locator('textarea').nth(1).fill('Хочу определить следующий шаг.')
            await q.locator('input[type=checkbox]').check()
            await q.locator('button[type=submit]').click()
            await wizard.locator('[data-free-express-media=portrait]').waitFor({ state: 'visible' })
            assert.equal(details, 1)
            await wizard.locator('[data-free-express-media=portrait] button').last().click()
            await wizard.locator('[data-free-express-google]').waitFor({ state: 'visible' })
            await wizard.locator('[data-free-express-google] button').last().click()
            await wizard.locator('[data-free-express-media=drawing]').waitFor({ state: 'visible' })
            await wizard.locator('[data-free-express-media=drawing] button').last().click()
            await wizard.locator('[data-free-express-complete]').waitFor({ state: 'visible' })
            assert.equal(submits, 1, 'Skipping optional stages never creates a second lead')
            assert.equal(uploads, 0, 'No upload without explicit image choice+consent')
          }
          assert.deepEqual(errors, [], 'Browser page errors')
          results.push({ engine, locale, width, ok: true })
        } finally {
          await ctx.close()
        }
      }
    }
  } finally { await browser.close() }
}
writeFileSync(output + '/results.json', JSON.stringify({ origin, results }, null, 2))
console.log('Free Express v2 synthetic browser acceptance:', results.length, 'cases')
