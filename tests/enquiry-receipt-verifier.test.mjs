import assert from 'node:assert/strict'
import test from 'node:test'
import { assertRegisteredEnquiryReceipt } from '../scripts/helpers/enquiry-receipt-verifier.mjs'

function fixture(locale = 'en', fault, selectedFormat = '') {
  let handler, removed = false, open = false, consent = false, email = '', checks = 0, sends = 0
  let url = 'https://example.test/' + locale + '/services/example', receipt
  const referenceCode = 'HH-ABCD1234EF56'
  const request = { operationId: '00000000-0000-4000-8000-000000000001', locale, sourcePath: '/' + locale + '/services/example', serviceTitle: 'Approved service', description: selectedFormat, contact: { displayName: '', email: 'enquiry-qa@example.test', phone: '' }, contactConsent: true, website: '' }
  const mutations = { locale: () => request.locale = 'xx', source: () => request.sourcePath = '/private', service: () => request.serviceTitle = 'Other', consent: () => request.contactConsent = false, private: () => request.description = 'PRIVATE_ANSWER', contact: () => request.contact.email = 'wrong@example.test', operation: () => request.operationId = '', extra: () => request.extra = true, lostFormat: () => request.description = '', duplicateFormat: () => request.description = selectedFormat + '\n\n' + selectedFormat }
  const earlyRequest = async () => { sends++; await handler({ request: () => ({ url: () => 'https://example.test/api/service-enquiries', method: () => 'POST', postDataJSON: () => request }), fulfill: async () => {} }) }
  const node = selector => ({ selector, locator: node, async fill(value) { assert.equal(selector, 'input[autocomplete="email"]'); email = value; if (fault === 'sendOnFill') await earlyRequest() }, async check() { assert.equal(selector, 'input[type="checkbox"]'); checks++; consent = true; if (fault === 'sendOnConsent') await earlyRequest() }, async click() {
    assert.ok(handler, 'Interception must precede every action')
    if (selector === 'button[data-contact-order]') { open = true; return }
    assert.equal(selector, 'button[type="submit"]'); assert.equal(consent, true); assert.equal(email, 'enquiry-qa@example.test'); sends++
    mutations[fault]?.()
    let response
    const route = { request: () => ({ url: () => fault === 'wrongOrigin' ? 'https://external.example/api/service-enquiries' : 'https://example.test/api/service-enquiries', method: () => fault === 'wrongMethod' ? 'GET' : 'POST', postDataJSON: () => request }), fulfill: async value => { response = JSON.parse(value.body) } }
    await handler(route)
    if (fault === 'duplicate') await handler(route)
    receipt = JSON.stringify({ referenceCode: fault === 'receipt' ? 'HH-000000000000' : response.referenceCode, createdAt: Date.now(), ...(fault === 'storedContact' ? { email } : {}) })
    if (fault !== 'noRedirect') url = 'https://example.test/' + locale + '/thank-you' + (fault === 'query' ? '?email=bad' : '')
  } })
  const page = { url: () => url, locator: node, route: async (_pattern, value) => { handler = value }, unroute: async (_pattern, value) => { assert.equal(handler, value); removed = true }, evaluate: async () => receipt }
  const expect = target => ({
    async toHaveCount(value) { assert.equal(value, target.selector === 'a[data-contact-channel]' ? 0 : 1) },
    async toBeVisible() { if (target.selector === 'form') assert.ok(open) },
    async toHaveAttribute(name, value) { assert.equal(name, 'aria-expanded'); assert.equal(value, String(open)) },
    async toBeDisabled() { assert.equal(consent, false) },
    async toBeEnabled() { assert.equal(consent, true) },
    async toHaveURL(value) { assert.equal(url, value) },
    async toHaveText(value) { assert.equal(value, fault === 'visibleReceipt' ? 'wrong' : referenceCode) },
    async toContainText(value) { assert.ok(value.length > 25); assert.notEqual(fault, 'noDisclaimer') },
  })
  return { run: () => assertRegisteredEnquiryReceipt({ locator: node }, expect, page, { locale, sourcePath: request.sourcePath, serviceTitle: 'Approved service', selectedFormat, privateMarkers: ['PRIVATE_ANSWER'] }), state: () => ({ removed, checks, sends }) }
}
for (const locale of ['en','ru','es']) test(locale + ' explicit synthetic save verifies normal receipt navigation', async () => { const f=fixture(locale); const result=await f.run(); assert.equal(result.referenceCode,'HH-ABCD1234EF56'); assert.deepEqual(f.state(),{removed:true,checks:1,sends:1}) })
for (const fault of ['locale','source','service','consent','private','contact','operation','extra','duplicate','receipt','storedContact','noRedirect','query','visibleReceipt','noDisclaimer','wrongOrigin','wrongMethod']) test('receipt proof rejects '+fault,async()=>{const f=fixture('en',fault);await assert.rejects(f.run());assert.deepEqual(f.state(),{removed:true,checks:1,sends:1})})

for (const fault of ['sendOnFill','sendOnConsent']) test('receipt proof rejects '+fault+' before explicit submit',async()=>{ const f=fixture('en',fault); await assert.rejects(f.run(), /No request before the explicit submit click/); assert.deepEqual(f.state(),{removed:true,checks:fault==='sendOnFill'?0:1,sends:1}) })
for (const locale of ['en','ru','es']) test(locale+' requires exact public format in submitted description',async()=>{const selectedFormat={en:'Express review · 30 min · €50',ru:'Экспресс · 30 минут · €50',es:'Revisión exprés · 30 minutos · €50'}[locale];const f=fixture(locale,undefined,selectedFormat);assert.equal((await f.run()).request.description,selectedFormat);for(const fault of ['lostFormat','duplicateFormat']){const bad=fixture(locale,fault,selectedFormat);await assert.rejects(bad.run());assert.equal(bad.state().removed,true)}})
