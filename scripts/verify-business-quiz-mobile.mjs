// Browser acceptance for the ACTUAL /explore/business direction journey.
// The old photo-quiz/finder is no longer mounted on this route. Verify the
// existing topic/intention chooser and links to the existing consented form,
// rather than forcing a second business finder or a duplicate CRM funnel.
// Only isolated loopback GET/navigation; no lead, messenger or payment POST.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir } from 'node:fs/promises'

const require = createRequire(import.meta.url)
const { chromium, webkit } = require(process.env.HH_PLAYWRIGHT_PACKAGE || 'playwright')
const origin = process.env.HH_PUBLIC_QA_ORIGIN || 'http://127.0.0.1:3100'
if (!/^http:\/\/(?:localhost|127\.0\.0\.1):\d+$/.test(origin)) {
  throw new Error('Business browser QA only on isolated loopback server')
}
const dir = 'artifacts/business-quiz-mobile'
await mkdir(dir, { recursive: true })

async function assertNoOverflow(page, label) {
  const bounds = await page.evaluate(() => ({
    viewport: window.innerWidth,
    content: document.documentElement.scrollWidth,
  }))
  assert.ok(bounds.content <= bounds.viewport + 1, label + ': horizontal overflow ' + JSON.stringify(bounds))
}

async function verify(browserType, locale, width) {
  const browser = await browserType.launch()
  const page = await browser.newPage({
    viewport: { width, height: 844 },
    deviceScaleFactor: 1, hasTouch: width <= 430, reducedMotion: 'reduce',
  })
  const label = browserType.name() + ':' + locale + ':' + width
  const pageErrors = []
  const forbiddenRequests = []
  page.on('pageerror', error => pageErrors.push(error.message))
  page.on('request', request => {
    if (request.method() === 'POST' &&
      /\/api\/(?:service-enquiries|payments|billing)\b/.test(new URL(request.url()).pathname)) {
      forbiddenRequests.push(request.method() + ' ' + new URL(request.url()).pathname)
    }
  })

  try {
    const response = await page.goto(origin + '/' + locale + '/explore/business', {
      waitUntil: 'networkidle', timeout: 60000,
    })
    assert.equal(response?.status(), 200, label + ': business route')

    const direction = page.locator('[data-direction-offers="business"]')
    await direction.waitFor({ state: 'visible', timeout: 30000 })
    assert.equal(await direction.locator('[data-direction-hero] h1').count(), 1,
      label + ': direction hero')
    assert.equal(await direction.locator('[data-direction-wish-form] input[type="search"]').count(), 1,
      label + ': one optional question input (not submitted)')
    assert.equal(await direction.locator('[data-direction-topic-finder]').count(), 1,
      label + ': existing topic selector')
    const focus = direction.locator('[data-direction-filter]')
    assert.equal(await focus.count(), 5, label + ': four business topics and all')
    assert.equal(await direction.locator('[data-direction-action-finder] [data-direction-intent]').count(),
      4, label + ': test, advice, course and consultation choices')
    assert.equal(await direction.locator('[data-direction-section]').count(), 3,
      label + ': default test, course and session groups')

    const session = direction.locator('[data-offer-id="primary-session"] [data-offer-action="session"]')
    assert.equal(await session.getAttribute('href'), '/' + locale + '/services/business-consulting',
      label + ': paid business CTA uses existing service, not a second form')
    assert.match(await direction.locator('[data-offer-id="primary-session"]').innerText(),
      /€50.*€100|€50|€100/, label + ': approved session-price context')

    const cards = page.locator('[data-goal-support-offers][data-goal-support-theme="business"]')
    await cards.waitFor({ state: 'visible' })
    assert.equal(await cards.locator('[data-goal-support-card]').count(), 3,
      label + ': free review, constellations and coaching')
    const free = cards.locator('[data-goal-support-action="business-review"]')
    const paid = cards.locator('[data-goal-support-action="business-coaching"]')
    assert.equal(await free.getAttribute('href'),
      '/' + locale + '/services/free-situation-review?topic=business')
    assert.equal(await paid.getAttribute('href'),
      '/' + locale + '/services/business-consulting#business-direct-request')
    for (const [kind, action] of [['free', free], ['paid', paid]]) {
      const box = await action.boundingBox()
      assert.ok(box && box.height >= 44, label + ': ' + kind + ' touch target >=44px')
    }
    await assertNoOverflow(page, label + ': initial')

    // Actual React interactions, with no synthetic submitted enquiry.
    await direction.locator('[data-direction-intent="session"]').click()
    await direction.locator('[data-direction-section="session"]').waitFor({ state: 'visible' })
    assert.equal(await direction.locator('[data-direction-section]').count(), 1,
      label + ': selecting consultation removes unrelated results')
    assert.equal(await direction.locator('[data-direction-intent="session"]').getAttribute('aria-pressed'),
      'true')
    await direction.locator('[data-direction-filter="decisions"]').click()
    assert.equal(await direction.locator('[data-direction-filter="decisions"]').getAttribute('aria-pressed'),
      'true', label + ': chosen business topic')
    assert.ok(await direction.locator('[data-direction-section="session"] [data-offer-action="session"]').count() >= 1)
    await direction.locator('[data-direction-intent="session"]').click()
    assert.equal(await direction.locator('[data-direction-section]').count(), 3,
      label + ': reselecting consultation restores all paths')

    const details = cards.locator('[data-goal-support-details="business-coaching"]')
    await details.click()
    assert.equal(await details.getAttribute('aria-expanded'), 'true')
    const description = cards.locator('#goal-support-info-business-coaching')
    await description.waitFor({ state: 'visible' })
    assert.match(await description.innerText(), /€50/)
    assert.match(await description.innerText(), /€100/)
    if (browserType === webkit && locale === 'en' && width === 390) {
      await page.screenshot({ path: dir + '/business-current-offers-webkit-390.png', fullPage: false })
    }

    // The free review and paid service both actually resolve, without a lead.
    if (width === 390) {
      const freePage = await page.request.get(origin + '/' + locale +
        '/services/free-situation-review?topic=business', { timeout: 30000 })
      assert.equal(freePage.status(), 200, label + ': free review target')
    }
    await paid.click()
    await page.waitForURL(url => url.pathname === '/' + locale + '/services/business-consulting',
      { timeout: 30000 })
    await page.locator('[data-business-website-enquiry]').waitFor({
      state: 'visible', timeout: 30000,
    })
    assert.equal(await page.locator('[data-business-offer="express"]').count(), 1,
      label + ': existing €50/30-min choice')
    assert.equal(await page.locator('[data-business-offer="full"]').count(), 1,
      label + ': existing €100/60-min choice')
    await assertNoOverflow(page, label + ': paid-service target')
    assert.deepEqual(forbiddenRequests, [], label + ': no lead or payment request sent')
    assert.deepEqual(pageErrors, [], label + ': no unhandled page errors')
    return label
  } finally {
    await page.close()
    await browser.close()
  }
}

const done = []
for (const locale of ['en', 'ru', 'es']) {
  for (const width of [320, 375, 390, 430]) done.push(await verify(webkit, locale, width))
  done.push(await verify(chromium, locale, 390))
}
console.log('Business direction → existing free/paid service browser acceptance:', done.join(', '))
