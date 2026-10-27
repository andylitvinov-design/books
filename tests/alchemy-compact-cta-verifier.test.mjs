import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { openContactChannelChooser, openRegisteredCompactPhoneChooser, assertPreparedContactChannels } from '../scripts/helpers/contact-channel-verifier.mjs'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const reference = 'HH-ABCD1234EF56'
function fixture(locale = 'en', fault = '') {
  const state = { open: false, consent: false, phone: '', saved: false, requests: [], events: [], externalClicks: 0 }
  const sandbox = { window: { open: () => assert.fail('Real provider popup is forbidden') } }
  let routeHandler
  const data = () => ({ operationId: '12345678-1234-1234-1234-123456789abc',
    serviceTitle: locale === 'ru' ? 'Алхимия души / Психогомеопатия' : 'Alchemy of the Soul / Psycho-homeopathy',
    description: locale === 'ru' ? 'Формат: Экспресс · 30 минут · €50' : 'Format: Express review · 30 min · €50',
    sourcePath: '/' + locale + '/services/alchemy-of-soul', locale,
    contact: { phone: '+1' + state.phone, displayName: '', email: '' }, contactConsent: state.consent, website: '' })
  const draft = () => 'Alchemy of the Soul · 30 minutes · €50\n\nEnquiry: ' + reference + (fault === 'contact-leak' ? '\n4165550123' : '')
  const href = channel => (channel === 'whatsapp' ? 'https://wa.me/14376066502' : 'https://t.me/AndyTherapist') + '?text=' + encodeURIComponent(draft())
  const counts = selector => {
    if (selector.startsWith('[data-contact-channel-chooser]')) return 1
    if (selector === 'button[data-contact-order]') return 1
    if (selector === 'a[data-contact-channel]') return state.saved ? (fault === 'missing-channel' ? 1 : 2) : 0
    if (/^a\[data-contact-channel="(?:whatsapp|telegram)"\]$/.test(selector)) return state.saved ? 1 : 0
    if (selector === 'form') return state.saved ? 0 : 1
    if (selector === 'input[type="email"]') return 0
    if (['[data-phone-country-input] input[type="tel"]', 'input[type="checkbox"]', 'button[data-contact-channel-submit="whatsapp"]'].includes(selector)) return 1
    assert.fail('Unexpected selector: ' + selector)
  }
  function locator(selector) {
    counts(selector)
    return { selector, locator,
      getAttribute: async name => {
        if (selector === 'button[data-contact-order]' && name === 'aria-expanded') return String(state.open)
        const channel = selector.match(/^a\[data-contact-channel="(whatsapp|telegram)"\]$/)?.[1]
        assert.ok(channel, 'Only public prepared-link attributes may be read')
        const attrs = { href: href(channel), target: '_blank', rel: 'noopener noreferrer' }
        assert.ok(Object.hasOwn(attrs, name)); return attrs[name]
      },
      fill: async value => { assert.equal(selector, '[data-phone-country-input] input[type="tel"]'); assert.equal(value, '4165550123'); state.phone = value; state.events.push('phone') },
      check: async () => { assert.equal(selector, 'input[type="checkbox"]'); state.consent = true; state.events.push('consent') },
      click: async () => {
        if (selector.startsWith('a[')) { state.externalClicks++; assert.fail('Never click a provider link') }
        if (selector === 'button[data-contact-order]') { state.open = !state.open; state.events.push('open'); return }
        assert.equal(selector, 'button[data-contact-channel-submit="whatsapp"]')
        assert.equal(state.open, true); assert.equal(state.consent, true, 'No submission before consent'); assert.equal(state.phone, '4165550123')
        assert.equal(typeof routeHandler, 'function', 'Install synthetic POST route before submit')
        const popup = sandbox.window.open('about:blank', '_blank'); assert.ok(popup)
        const payload = data(); state.requests.push(payload); state.events.push('submit')
        const route = { request: () => ({ method: () => 'POST', postDataJSON: () => payload }),
          continue: () => assert.fail('Synthetic POST must never pass through'),
          fulfill: async response => { assert.equal(response.status, 201); assert.equal(response.contentType, 'application/json');
            const body = JSON.parse(response.body); assert.deepEqual(body, { saved: true, referenceCode: reference }); state.saved = true; state.events.push('receipt') } }
        await routeHandler(route)
        assert.equal(state.saved, true, 'Only fulfilled receipt reveals prepared links')
        popup.location.replace(href('whatsapp'))
      } }
  }
  const expect = actual => ({
    toHaveCount: async value => assert.equal(counts(actual.selector), value),
    toBeVisible: async () => { assert.equal(counts(actual.selector), 1); if (actual.selector === 'form' || actual.selector.startsWith('a[')) assert.equal(state.open, true) },
    toBeHidden: async () => assert.ok(!counts(actual.selector) || !state.open),
    toHaveAttribute: async (name, value) => { const found = await actual.getAttribute(name); if (value instanceof RegExp) assert.match(found, value); else assert.equal(found, value) },
  })
  const page = {
    route: async (pattern, handler) => { assert.equal(pattern, '**/api/service-enquiries'); routeHandler = handler; state.events.push('route') },
    evaluate: async fn => { state.events.push('popup-intercept'); return runInNewContext('(' + fn.toString() + ')()', sandbox, { timeout: 1000 }) },
  }
  return { state, expect, page, scope: { locator } }
}
async function runActualCoreCall(f) {
  const source = read('scripts/verify-app-r1.mjs')
  const start = source.indexOf('     const order=await ')
  const end = source.indexOf("     await expect(servicePage.locator('a[href=", start)
  assert.ok(start > 0 && end > start)
  const snippet = source.slice(start, end)
  return runInNewContext('(async () => {' + snippet + '\n})()', { assert,
    pricing: f.scope, expect: f.expect, servicePage: f.page,
    openContactChannelChooser, openRegisteredCompactPhoneChooser, assertPreparedContactChannels }, { timeout: 1000 })
}
for (const locale of ['en', 'ru']) test(locale + ' actual core Alchemy CTA uses registered compact helper with one synthetic consented receipt', async () => {
  const f = fixture(locale)
  await runActualCoreCall(f)
  assert.deepEqual(f.state.events, ['route', 'popup-intercept', 'open', 'phone', 'consent', 'submit', 'receipt'])
  assert.equal(f.state.requests.length, 1); assert.equal(f.state.requests[0].contactConsent, true)
  assert.equal(f.state.externalClicks, 0)
})
test('legacy direct-link helper rejects current zero-links-before-registration state without any submit', async () => {
  const f = fixture()
  await assert.rejects(openContactChannelChooser(f.scope, f.expect), { code: 'ERR_ASSERTION' })
  assert.deepEqual(f.state.requests, []); assert.deepEqual(f.state.events, [])
})
for (const fault of ['contact-leak', 'missing-channel']) test('registered helper retains strict privacy/channel rejection: ' + fault, async () => {
  const f = fixture('en', fault)
  await assert.rejects(openRegisteredCompactPhoneChooser(f.scope, f.expect, f.page), { code: 'ERR_ASSERTION' })
  assert.equal(f.state.externalClicks, 0)
})
test('exact current source keeps compact consent-first runtime and the registered helper import', () => {
  const core = read('scripts/verify-app-r1.mjs'), form = read('components/alchemy-soul-lead-form.tsx')
  const runtime = read('components/contact-channel-chooser.tsx')
  assert.match(core, /import \{ openContactChannelChooser, openRegisteredCompactPhoneChooser, assertPreparedContactChannels \} from '.\/helpers\/contact-channel-verifier.mjs'/)
  assert.equal((form.match(/compactPhone compactTrigger stayAfterSave/g) || []).length, 2)
  assert.match(form, /resetKey=\{selected\}/)
  assert.match(runtime, /if \(!consent\) \{[\s\S]*?return;/)
  assert.match(runtime, /if \(compactPhone\) \{\s+return \([\s\S]*?\{!saved \? \(/)
  assert.match(runtime, /data\.saved !== true/)
  assert.match(core, /prepared\.whatsappUrl\.searchParams\.get\('text'\)\.includes\('€50'\)/)
})
