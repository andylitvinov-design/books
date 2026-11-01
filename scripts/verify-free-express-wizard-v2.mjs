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
        let submits = 0, details = 0, uploads = 0, claims = 0
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
          if (route.request().method() === 'POST') {
            uploads += 1
            assert.match(route.request().headers()['content-type'] || '', /multipart\/form-data/)
          }
          await route.fulfill({ status: 200, contentType: 'application/json',
            body: JSON.stringify(route.request().method() === 'POST'
              ? { uploaded: true } : { portrait: false, drawing: false }) })
        })
        await page.route('**/api/free-express/claim', async route => {
          if (route.request().method() === 'POST') {
            claims += 1
            const data = route.request().postDataJSON()
            assert.equal(data.consent, true)
            assert.equal(data.referenceCode, HH)
          }
          await route.fulfill({ status: 200, contentType: 'application/json',
            body: JSON.stringify({ saved: true, referenceCode: HH }) })
        })
        try {
          const res = await page.goto(origin + '/' + locale + '/services/free-situation-review',
            { waitUntil: 'domcontentloaded', timeout: 60000 })
          assert.equal(res?.status(), 200)
          const reveal = page.locator('[data-express-reveal]')
          await reveal.click()
          const wizard = page.locator('[data-free-express-wizard]')
          await wizard.waitFor({ state: 'visible' })
          const energyCase = engine === 'chromium' && locale === 'es' && width === 320
          if (energyCase) await page.locator('[data-express-focus=energy] input[type=radio]').check()
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
            await form.locator('label:not([data-enquiry-attribution-choice]) input[type=checkbox]').check()
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
          // Exercise the entire consented, no-provider journey at *every*
          // locale/viewport/engine pair, not merely screenshot the opening card.
          // RU/390 above also checks switching into the full 20-question path.
          if (!(locale === 'ru' && width === 390)) {
            const lead = wizard.locator('[data-free-express-lead]')
            await lead.locator('[data-phone-country-input] input[type=tel]').fill('4165551234')
            await lead.locator('textarea').fill('Synthetic personal question for private review.')
            await lead.locator('button[type=submit]').click()
            assert.equal(submits, 0, 'Initial CRM lead must require affirmative consent')
            await lead.locator('label:not([data-enquiry-attribution-choice]) input[type=checkbox]').check()
            const optional=lead.locator('[data-enquiry-attribution-choice] input[type=checkbox]')
            if(await optional.count())assert.equal(await optional.isChecked(),false,
              'Reply consent cannot opt into source attribution')
            await lead.locator('button[type=submit]').click()
            await wizard.locator('[data-free-express-receipt]').waitFor({ state: 'visible' })
            assert.equal(submits, 1, 'Exactly one consented CRM lead')
            assert.ok((await wizard.locator('[data-free-express-receipt]').innerText()).includes(HH))
            const questionnaire = wizard.locator('[data-free-express-questions]')
            await questionnaire.waitFor({ state: 'visible' })
            assert.equal(await questionnaire.locator('textarea').count(), 3)
            await questionnaire.locator('textarea').nth(0).fill('Synthetic challenge in my life.')
            await questionnaire.locator('textarea').nth(1).fill('I would like clarity and a next step.')
            await questionnaire.locator('button[type=submit]').click()
            assert.equal(details, 0, 'Additional sensitive answers need separate consent')
            await questionnaire.locator('input[type=checkbox]').check()
            await questionnaire.locator('button[type=submit]').click()
            await wizard.locator('[data-free-express-media=portrait]').waitFor({ state: 'visible' })
            assert.equal(details, 1, 'Only one encrypted detail update')
            const mediaCase = engine === 'webkit' && locale === 'en' && width === 430
            const sampleImage = mediaCase ? Buffer.from((await page.evaluate(() => {
              const canvas = document.createElement('canvas')
              canvas.width = 240; canvas.height = 150
              const ctx = canvas.getContext('2d')
              ctx.fillStyle = '#edddca'; ctx.fillRect(0, 0, 240, 150)
              ctx.fillStyle = '#854457'; ctx.fillRect(50, 30, 70, 65)
              ctx.font = '20px Arial'; ctx.fillText('ME', 135, 70)
              return canvas.toDataURL('image/png').split(',')[1]
            })), 'base64') : null
            if (mediaCase) {
              const portrait = wizard.locator('[data-free-express-media=portrait]')
              await portrait.locator('input[type=file]').last().setInputFiles({
                name:'synthetic-portrait.png', mimeType:'image/png', buffer:sampleImage,
              })
              assert.equal(uploads, 0, 'Choosing a file does not upload without separate consent')
              await portrait.locator('input[type=checkbox]').check()
              await portrait.getByRole('button',{name:'Upload privately'}).click()
            } else await wizard.locator('[data-free-express-media=portrait] button').last().click()
            await wizard.locator('[data-free-express-google]').waitFor({ state: 'visible' })
            assert.equal(await wizard.locator('[data-free-express-google] input[type=checkbox]:checked').count(), 0)
            if (mediaCase) {
              const save = wizard.locator('[data-free-express-google]')
              await save.locator('input[type=checkbox]').check()
              await save.getByRole('button',{name:'Sign in / Save to my account'}).click()
            } else await wizard.locator('[data-free-express-google] button').last().click()
            if (!energyCase) {
              await wizard.locator('[data-free-express-media=drawing]').waitFor({ state: 'visible' })
              if (mediaCase) {
                const drawing = wizard.locator('[data-free-express-media=drawing]')
                await drawing.locator('input[type=file]').last().setInputFiles({
                  name:'synthetic-drawing.png', mimeType:'image/png', buffer:sampleImage,
                })
                await drawing.locator('input[type=checkbox]').check()
                await drawing.getByRole('button',{name:'Upload privately'}).click()
              } else await wizard.locator('[data-free-express-media=drawing] button').last().click()
            } else assert.equal(await wizard.locator('[data-free-express-media=drawing]').count(),0,
              'Energy review correctly skips the drawing screen')
            await wizard.locator('[data-free-express-complete]').waitFor({ state: 'visible' })
            assert.equal(await wizard.locator('[aria-current=step]').count(), 1)
            if (energyCase) {
              assert.match(await wizard.locator('p[role=status]').first().innerText(), /5 de 5/)
            }
            assert.equal(submits, 1, 'Optional stages never duplicate a CRM lead')
            assert.equal(uploads, mediaCase ? 2 : 0, 'Private image uploads occur only on explicit consent')
            assert.equal(claims, mediaCase ? 1 : 0, 'Google claim is separate, never an extra CRM lead')
          }
          const finalOverflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
          assert.ok(finalOverflow <= 2, 'Completed journey must not overflow narrow phones: ' + finalOverflow)
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
