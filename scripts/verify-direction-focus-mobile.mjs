// Smoke real hydrated Energy/Love/Business filters at 320–430px across EN/RU/ES.
// Read-only journey checks: never send forms, leads, external messages or payment.
// Runs exclusively against the isolated production build on the GitHub runner.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir } from 'node:fs/promises'
import { assertDirectionTestState, directionTestContract } from './helpers/direction-focus-verifier.mjs'

const require = createRequire(import.meta.url)
const { chromium } = require(process.env.HH_PLAYWRIGHT_PACKAGE || 'playwright')
const origin = process.env.HH_PUBLIC_QA_ORIGIN || 'http://127.0.0.1:3100'
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin)) {
  throw new Error('Direction browser verification must use an isolated loopback server')
}

const paths = {
  energy: ['fatigue', 'sleep', 'body', 'resources'],
  love: ['trust', 'boundaries', 'conflict', 'presence'],
  business: ['decisions', 'productivity', 'work-stress', 'money-beliefs'],
}
const widths = [320, 375, 430]
const output = 'artifacts/public-services-production'
await mkdir(output, { recursive: true })

const browser = await chromium.launch()
let checks = 0
try {
  for (const locale of ['en', 'ru', 'es']) {
    for (const [direction, ids] of Object.entries(paths)) {
      const context = await browser.newContext({
        viewport: { width: 375, height: 844 },
        hasTouch: true, isMobile: true,
      })
      try {
        const page = await context.newPage()
        const name = locale + '/' + direction
        const response = await page.goto(origin + '/' + locale + '/explore/' + direction, {
          waitUntil: 'networkidle', timeout: 60000,
        })
        assert.equal(response?.status(), 200, 'Public direction route: ' + name)
        const panel = page.locator('[data-direction-topic-finder]')
        await panel.waitFor({ state: 'visible' })
        assert.equal(await panel.locator('select').count(), 0, 'No native popup select: ' + name)
        const controls = panel.locator('button[data-direction-filter]')
        assert.equal(await controls.count(), 5, 'Four inline requests + reset: ' + name)
        const actualIds = await controls.evaluateAll(nodes => nodes.map(n => n.getAttribute('data-direction-filter')))
        assert.deepEqual(actualIds, ['all', ...ids], 'Current journey topics are all available: ' + name)

        for (const width of widths) {
          await page.setViewportSize({ width, height: 844 })
          const rects = await panel.evaluate(node => {
            const rect = node.getBoundingClientRect()
            const controls = [...node.querySelectorAll('button[data-direction-filter]')]
            return {
              height: rect.height,
              panelWidth: rect.width,
              clientWidth: node.clientWidth,
              scrollWidth: node.scrollWidth,
              buttons: controls.map(button => {
                const b = button.getBoundingClientRect()
                return { width: b.width, height: b.height, left: b.left, right: b.right, top: b.top, bottom: b.bottom }
              }),
              left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom,
            }
          })
          assert.ok(rects.height < 260 && rects.height < 844,
            'Filter fits a single phone screen: ' + name + ' ' + width + ' (' + rects.height + 'px)')
          assert.ok(rects.scrollWidth <= rects.clientWidth + 1,
            'No inner horizontal scrolling: ' + name + ' ' + width)
          assert.ok(rects.buttons.every(b => b.height >= 40 && b.left >= rects.left-1 &&
            b.right <= rects.right+1 && b.top >= rects.top-1 && b.bottom <= rects.bottom+1),
          'All five targets visible in the same panel: ' + name + ' ' + width)
          checks++
          if (locale === 'en' && width === 375) {
            await panel.screenshot({ path: output + '/direction-' + direction + '-focus-375.png', animations: 'disabled' })
          }
        }

        // Real hydration and clicks must preserve the current two-card guest
        // questionnaire contract, while inline controls remain the same height.
        const contract = directionTestContract(locale, direction, ids)
        const initialHrefs = await assertDirectionTestState(page, contract)
        const heightBefore = await panel.evaluate(node => node.getBoundingClientRect().height)
        await panel.locator('[data-direction-filter="' + ids[1] + '"]').click()
        await page.waitForFunction(id => document.querySelector(
          '[data-direction-filter="' + id + '"]')?.getAttribute('aria-pressed') === 'true', ids[1])
        await assertDirectionTestState(page, contract, { topicId: ids[1] })
        assert.ok(Math.abs((await panel.evaluate(node => node.getBoundingClientRect().height)) - heightBefore) < 1,
          'Selecting a request cannot shift the filter: ' + name)
        await panel.locator('[data-direction-filter="all"]').click()
        await page.waitForFunction(() => document.querySelector(
          '[data-direction-filter="all"]')?.getAttribute('aria-pressed') === 'true')
        assert.deepEqual(await assertDirectionTestState(page, contract), initialHrefs,
          'All topics restores the exact initial questionnaire links: ' + name)

        const more = page.locator('[data-direction-section="test"] button[data-direction-show-more="test"]')
        await more.click()
        await page.waitForFunction(() => document.querySelector(
          '[data-direction-show-more="test"]')?.getAttribute('aria-expanded') === 'true')
        await assertDirectionTestState(page, contract, { expanded: true })
        await more.click()
        await page.waitForFunction(() => document.querySelector(
          '[data-direction-show-more="test"]')?.getAttribute('aria-expanded') === 'false')
        assert.deepEqual(await assertDirectionTestState(page, contract), initialHrefs,
          'Collapsing restores exactly the original two cards: ' + name)
      } finally {
        await context.close()
      }
    }
  }
} finally {
  await browser.close()
}
console.log('Directional focus browser checks passed:', checks, 'mobile layouts, 9 hydrated topic/reset and 2→4→2 journeys')
