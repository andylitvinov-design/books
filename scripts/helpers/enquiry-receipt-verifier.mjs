import assert from 'node:assert/strict'
import { RECEIPT_SESSION_KEY, parseEnquiryReceipt } from '../../lib/practitioners/enquiry-receipt.mjs'

// Normal public flow: explicit consent, intercepted synthetic save, then the
// owner-designed receipt navigation. Never suppress the router or open a chat.
export async function assertRegisteredEnquiryReceipt(scope, expect, page, {
  locale, sourcePath, serviceTitle, selectedFormat = '', privateMarkers = [],
}) {
  assert.ok(['en', 'ru', 'es'].includes(locale))
  assert.ok(typeof serviceTitle === 'string' && serviceTitle.trim(), 'Exact expected service title is required')
  const start = new URL(page.url())
  assert.equal(start.pathname, sourcePath)
  const referenceCode = 'HH-ABCD1234EF56'
  const submissions = []
  let explicitSubmit = false
  const pattern = '**/api/service-enquiries'
  const handler = async route => {
    assert.equal(explicitSubmit, true, 'No request before the explicit submit click')
    assert.equal(route.request().url(), start.origin + '/api/service-enquiries', 'Only the same-origin enquiry endpoint is accepted')
    assert.equal(route.request().method(), 'POST', 'Only the explicit enquiry POST is intercepted')
    submissions.push(route.request().postDataJSON())
    await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ saved: true, referenceCode }) })
  }
  await page.route(pattern, handler)
  try {
    const chooser = scope.locator('[data-contact-channel-chooser]')
    await expect(chooser).toHaveCount(1)
    const trigger = chooser.locator('button[data-contact-order]')
    await expect(trigger).toBeVisible()
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await expect(chooser.locator('a[data-contact-channel]')).toHaveCount(0)
    await trigger.click()
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')
    const form = chooser.locator('form')
    await expect(form).toBeVisible()
    const submit = form.locator('button[type="submit"]')
    await expect(submit).toBeDisabled()
    await form.locator('input[autocomplete="email"]').fill('enquiry-qa@example.test')
    await expect(submit).toBeDisabled()
    assert.equal(submissions.length, 0, 'Filling contact must not submit an enquiry')
    await form.locator('input[type="checkbox"]').check()
    assert.equal(submissions.length, 0, 'Checking consent must not submit an enquiry')
    await expect(submit).toBeEnabled()
    explicitSubmit = true
    await submit.click()
    await expect(page).toHaveURL(start.origin + '/' + locale + '/thank-you')
    assert.equal(submissions.length, 1, 'Exactly one explicitly consented synthetic save')
    const request = submissions[0]
    assert.deepEqual(Object.keys(request).sort(), ['contact','contactConsent','description','locale','operationId','serviceTitle','sourcePath','website'])
    assert.match(request.operationId, /^[a-f0-9-]{36}$/i)
    assert.equal(request.locale, locale)
    assert.equal(request.sourcePath, sourcePath)
    assert.equal(request.serviceTitle, serviceTitle)
    assert.equal(request.description, selectedFormat, 'The exact selected public format reaches the saved enquiry once')
    assert.deepEqual(request.contact, { displayName: '', email: 'enquiry-qa@example.test', phone: '' })
    assert.equal(request.contactConsent, true)
    assert.equal(request.website, '')
    for (const marker of privateMarkers) assert.ok(!JSON.stringify(request).includes(marker), 'Private answers stay out of the registration request')
    const raw = await page.evaluate(key => sessionStorage.getItem(key), RECEIPT_SESSION_KEY)
    const receipt = parseEnquiryReceipt(raw)
    assert.equal(receipt?.referenceCode, referenceCode)
    assert.deepEqual(Object.keys(JSON.parse(raw)).sort(), ['createdAt', 'referenceCode'])
    const thankYou = page.locator('[data-service-thank-you]')
    await expect(thankYou).toBeVisible()
    await expect(thankYou.locator('strong')).toHaveText(referenceCode)
    await expect(thankYou).toContainText({
      en: 'Submitting a request does not reserve a session or charge your card.',
      ru: 'Отправка заявки не означает, что встреча забронирована или деньги списаны.',
      es: 'Enviar una solicitud no reserva una sesión ni realiza un cobro.',
    }[locale])
    await expect(thankYou.locator('a[href="/' + locale + '/services"]')).toBeVisible()
    assert.equal(new URL(page.url()).search, '')
    assert.equal(new URL(page.url()).hash, '')
    return { request, referenceCode }
  } finally {
    await page.unroute(pattern, handler)
  }
}
