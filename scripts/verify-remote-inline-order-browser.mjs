// Loopback-only mobile order acceptance with mocked first-party catalogue and
// enquiry POST. No real CRM, chat notification, calendar or payment mutations.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { chromium, webkit } = require(process.env.HH_PLAYWRIGHT_PACKAGE || 'playwright')
const origin = process.env.HH_PUBLIC_QA_ORIGIN || 'http://127.0.0.1:3100'
if (!/^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/.test(origin))
  throw new Error('Remote order browser acceptance is loopback-only')

const syntheticMaster = {
  slug: 'andy',
  name: 'Andy',
  title: 'Practitioner',
  photo: '',
  serviceId: '10000000-0000-4000-8000-000000000003',
  methods: ['Reiki Yggdrasil'],
  bio: '',
  description: 'Personal online energy practice',
  languages: ['en', 'ru', 'es'],
  currency: 'EUR',
  priceOptions: [{duration:30,price:50},{duration:60,price:100}],
  reviewCount: 0,
  reviewAverage: 0,
}

async function run(engine, locale, width) {
  const browser = await engine.launch({headless:true})
  const label = engine.name() + ':' + locale + ':' + width
  const page = await browser.newPage({
    viewport:{width,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce',
  })
  const errors = []
  const received = []
  page.on('pageerror', err => errors.push(err.message))
  try {
    await page.route('**/api/public/remote-energy-support-masters?locale=*', route =>
      route.fulfill({status:200,contentType:'application/json',
        body:JSON.stringify({masters:[syntheticMaster]})}))
    await page.route('**/api/service-enquiries', route => {
      assert.equal(route.request().method(), 'POST', label + ' guest API only')
      const payload = route.request().postDataJSON()
      assert.equal(payload.locale, locale)
      assert.equal(payload.sourcePath, '/' + locale + '/holistic-support')
      assert.equal(payload.contactConsent, true)
      assert.equal(payload.contact.phone, '+14165550123')
      assert.ok(typeof payload.operationId === 'string' && payload.operationId.length >= 36)
      assert.ok(!Object.hasOwn(payload,'bookingSku'), label + ' no premature booking/payment')
      received.push(payload)
      return route.fulfill({status:201, contentType:'application/json',
        body:JSON.stringify({saved:true,referenceCode:'HH-0123456789AB'})})
    })

    const pageResponse = await page.goto(origin + '/' + locale + '/holistic-support',
      {waitUntil:'domcontentloaded',timeout:60000})
    assert.equal(pageResponse?.status(),200,label + ' page response')
    await page.locator('[data-holistic-order-trigger="expert"]').click()
    const support = page.locator('[data-remote-support-intent-first]')
    await support.waitFor({state:'visible',timeout:30000})
    const card = support.locator('[data-remote-support-specialist]').first()
    await card.waitFor({state:'visible',timeout:10000})
    await card.locator('button[aria-controls^="remote-request-"]').click()
    const contact = card.locator('[data-remote-order-contact]')
    await contact.waitFor({state:'visible'})
    const optionalTime = card.locator('[data-optional-session-time]')
    assert.equal(await optionalTime.evaluate(node=>node.open),false,
      label + ' date/time is collapsed')
    assert.equal(await optionalTime.locator('input[type="date"]').isVisible(),false)
    assert.equal(await optionalTime.locator('input[type="time"]').isVisible(),false)
    assert.equal(await optionalTime.locator('input[required]').count(),0)

    await contact.locator('input[id^="remote-contact-"]').fill('+14165550123')
    await contact.locator('input[type="checkbox"]').check()
    await contact.locator('button[type="submit"]').click()
    const confirmed = card.locator('[data-remote-order-confirmation]')
    await confirmed.waitFor({state:'visible',timeout:15000})
    assert.match(await confirmed.innerText(),/HH-0123456789AB/)
    assert.equal(received.length,1,label + ' one confirmed energy request')
    assert.match(received[0].description,/Preferred time: Not specified/)
    assert.match(received[0].description,/Reiki Yggdrasil/)
    assert.equal(new URL(page.url()).pathname,'/'+locale+'/holistic-support',
      label + ' no private cabinet navigation')

    await page.locator('[data-holistic-order-trigger="talisman"]').click()
    await support.locator('[data-support-request-kind="talisman"]').waitFor({state:'visible'})
    const talisman = support.locator('[data-remote-support-specialist]').first()
    await talisman.locator('button[aria-controls^="remote-request-"]').click()
    const talismanForm = talisman.locator('[data-remote-order-contact]')
    await talismanForm.waitFor({state:'visible'})
    await talismanForm.locator('input[id^="remote-contact-"]').fill('+14165550123')
    await talismanForm.locator('input[type="checkbox"]').check()
    await talismanForm.locator('button[type="submit"]').click()
    await talisman.locator('[data-remote-order-confirmation]').waitFor({state:'visible'})
    assert.equal(received.length,2,label + ' one talisman request and one energy request')
    assert.match(received[1].description,/Type: personal talisman/)
    assert.doesNotMatch(received[1].description,/Duration:/)
    assert.equal(new URL(page.url()).pathname,'/'+locale+'/holistic-support')
    assert.deepEqual(errors,[],label + ' no JavaScript client exception')
    const geometry = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      document: document.documentElement.scrollWidth,
    }))
    assert.ok(geometry.document <= geometry.viewport + 2,
      label + ' no horizontal overflow '+ JSON.stringify(geometry))
    console.log('PASS ' + label + ': energy + talisman guest inline receipts')
  } finally {
    await page.close()
    await browser.close()
  }
}
for (const locale of ['en','ru','es']) await run(webkit, locale, 390)
await run(chromium, 'en', 320)
