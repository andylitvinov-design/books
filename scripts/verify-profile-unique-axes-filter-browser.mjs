// Public, anonymous, same-route visual and interaction QA. Never uses private records.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'

const { chromium, webkit } = createRequire(import.meta.url)(
  process.env.HH_PLAYWRIGHT_PACKAGE || 'playwright')
const origin = process.env.HH_PROFILE_QA_ORIGIN || 'http://127.0.0.1:3119'
if (!/^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/.test(origin))
  throw Error('Profile QA only runs against a local anonymous website')
const out = 'artifacts/profile-unique-axes-filter'
await mkdir(out, { recursive: true })
const titles = {
  ru: ['Эмоции и стресс', 'Энергия и отдых', 'Телесные ощущения'],
  en: ['Emotions & stress', 'Energy & rest', 'Body sensations'],
  es: ['Emociones y estrés', 'Energía y descanso', 'Sensaciones corporales'],
}
const manifest = []

for (const browserType of [chromium, webkit]) {
  const browser = await browserType.launch({ headless: true })
  try {
    for (const locale of ['ru', 'en', 'es']) {
      for (const width of [320, 390, 430]) {
        const label = [browserType.name(), locale, width].join('-')
        const page = await browser.newPage({
          viewport: { width, height: 844 }, deviceScaleFactor: 1,
          isMobile: true, hasTouch: true, reducedMotion: 'reduce',
          serviceWorkers: 'block',
        })
        const errors = []
        page.on('pageerror', error => errors.push(error.message))
        try {
          const response = await page.goto(origin + '/' + locale + '/personality-profiles', {
            waitUntil: 'domcontentloaded', timeout: 90000,
          })
          assert.equal(response?.status(), 200, label + ' public route')
          const root = page.locator('[data-personality-profile-builder]')
          await root.waitFor({ state: 'visible' })
          await page.locator('[data-profile-begin]').click()
          await page.locator('[data-profile-focus="wellbeing"]').click()
          await page.locator('[data-profile-confirm-focus]').click()
          const scaleScreen = page.locator('[data-profile-scale-selection-step]')
          await scaleScreen.waitFor({ state: 'visible' })
          const headingTexts = await scaleScreen.locator('[data-profile-scale-area] strong').allTextContents()
          assert.deepEqual(headingTexts.map(x => x.trim()), titles[locale], label + ' unique actual area headings')
          assert.equal(new Set(headingTexts.map(x => x.toLocaleLowerCase(locale))).size, 3)
          if (width === 390) {
            await page.screenshot({ path: out + '/' + label + '-scales.png', fullPage: true })
          }
          for (const area of ['emotions', 'recovery', 'body'])
            await scaleScreen.locator('[data-profile-main-scale="' + area + '"]').click()
          await root.locator('[class*="actions"] button').last().click()
          const topics = page.locator('[data-profile-topics-step]')
          await topics.waitFor({ state: 'visible' })
          const topicChecks = topics.locator('input[type="checkbox"]')
          const count = await topicChecks.count()
          assert.ok(count >= 3, label + ': no real source topics')
          for (let i = 0; i < count; i++) await topicChecks.nth(i).check()
          await root.locator('[class*="actions"] button').last().click()
          const tests = page.locator('[data-profile-tests-step]')
          await tests.waitFor({ state: 'visible' })
          const main = tests.locator('[data-profile-recommended-tests] label[data-profile-recommendation]')
          const mainKeys = await main.evaluateAll(rows => rows.map(row => row.getAttribute('data-profile-recommendation')))
          assert.ok(mainKeys.length > 0 && mainKeys.length <= 3, label + ': initial recommendation')
          const selected = await tests.locator('input[type="checkbox"]:checked').count()
          assert.ok(selected > 0, label + ': default plan should be usable')
          const filter = tests.locator('[data-profile-additional-kind-filter]')
          await filter.waitFor({ state: 'visible' })
          assert.equal(await filter.locator('button').count(), 3, label + ': one compact 3-way filter')
          const positions = await tests.evaluate(node => {
            const first = node.querySelector('[data-profile-recommended-tests]')
            const filter = node.querySelector('[data-profile-additional-kind-filter]')
            const additional = node.querySelector('[data-profile-five-more-tests]')
            const buttons = [...filter.querySelectorAll('button')]
            return {
              first: first?.getBoundingClientRect().top,
              filter: filter.getBoundingClientRect().top,
              additional: additional?.getBoundingClientRect().top,
              buttonRects: buttons.map(button => {
                const r = button.getBoundingClientRect()
                return { x: r.x, right: r.right, h: r.height }
              }),
              documentWidth: document.documentElement.scrollWidth,
              viewport: document.documentElement.clientWidth,
            }
          })
          assert.ok(positions.first <= positions.filter, label + ': filter must follow the recommended three')
          if (positions.additional !== undefined)
            assert.ok(positions.filter <= positions.additional, label + ': filter before extra tests')
          assert.ok(positions.documentWidth <= positions.viewport + 3,
            label + ': horizontal overflow at ' + width + 'px ' + JSON.stringify(positions))
          assert.ok(positions.buttonRects.every(r =>
            r.h >= 43.5 && r.x >= -2 && r.right <= positions.viewport + 2),
          label + ': unclipped, >=44px touch targets ' + JSON.stringify(positions))
          for (const mode of ['pro', 'questionnaires', 'all']) {
            const choice = filter.locator('[data-profile-mode="' + mode + '"]')
            await choice.click()
            assert.equal(await choice.getAttribute('aria-pressed'), 'true', label + ' mode ' + mode)
            assert.deepEqual(await main.evaluateAll(rows =>
              rows.map(row => row.getAttribute('data-profile-recommendation'))), mainKeys,
            label + ': main recommendations must not change in mode ' + mode)
            assert.equal(await tests.locator('input[type="checkbox"]:checked').count(), selected,
              label + ': checked tests persist when filter changes to ' + mode)
          }
          if (width === 390) {
            await filter.scrollIntoViewIfNeeded()
            await page.screenshot({ path: out + '/' + label + '-tests.png', fullPage: true })
          }
          assert.deepEqual(errors, [], label + ': browser exceptions')
          manifest.push({ label, headings: headingTexts, recommended: mainKeys,
            selected, geometry: positions, methods: 'anonymous real browser clicks, no private data' })
        } catch (error) {
          await page.screenshot({ path: out + '/failure-' + label + '.png', fullPage: false }).catch(() => {})
          throw new Error(label + ': ' + error.message, { cause: error })
        } finally {
          await page.close()
        }
      }
    }
  } finally {
    await browser.close()
  }
}
await writeFile(out + '/manifest.json', JSON.stringify({
  route: '/{ru,en,es}/personality-profiles', auth: 'guest', checked: manifest,
}, null, 2) + '\n')
console.log('Profile unique axis / compact filter guest browser journeys: ' + manifest.length)
