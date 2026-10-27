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

// Execute the whole bounded Alchemy form/pricing branch, using semantic labels
// and inert controls. Never import browser/DB setup or invoke a provider.
function serviceControls(locale, fault = '', countryFirst = false) {
  const f = fixture(locale), changed = []
  const words = locale === 'ru' ? ['Формат', 'Тема', 'Код страны'] : ['Session format', 'Topic', 'Country calling code']
  const values = { format: '60', topic: 'relationships', country: 'CA' }
  const fields = [
    { id: 'format', name: fault === 'wrong-format-label' ? 'Other format' : words[0], direct: true, visible: fault !== 'hidden-format' },
    { id: 'topic', name: words[1], direct: true, visible: true },
    { id: 'country', name: words[2], direct: false, visible: false },
  ].filter(field => !((fault === 'missing-format' && field.id === 'format') || (fault === 'missing-country' && field.id === 'country')))
  if (fault === 'duplicate-topic') fields.push({ ...fields.find(field => field.id === 'topic') })
  if (fault === 'extra-service-option') fields.push({ id: 'extra', name: 'Unexpected option', direct: true, visible: true })
  if (countryFirst) fields.sort((a, b) => Number(b.id === 'country') - Number(a.id === 'country'))
  function selections(getFields, name) {
    return { selection: true, items: getFields, name,
      first: () => selections(() => getFields().slice(0, 1), name), nth: i => selections(() => getFields().slice(i, i + 1), name),
      selectOption: async value => {
        const found = getFields(); assert.equal(found.length, 1); const field = found[0]
        const options = field.id === 'format' ? ['60', ...(fault === 'missing-format-option' ? [] : ['30']), 'month']
          : field.id === 'topic' ? ['relationships', 'stress', ...(fault === 'missing-topic-option' ? [] : ['business']), 'direction', 'other'] : ['CA', 'US']
        assert.ok(options.includes(value), 'Alchemy ' + field.id + ' option ' + value)
        if (fault !== 'ignored-' + field.id + '-change') values[field.id] = value
        changed.push(field.id + ':' + value)
      } }
  }
  const control = (kind, attrs = {}) => ({ selection: true, name: kind, items: () => [{ id: kind, visible: true, attrs }] })
  const form = { scrollIntoViewIfNeeded: async () => {},
    getByRole: (role, options) => { assert.equal(role, 'combobox'); assert.equal(options.exact, true); return selections(() => fields.filter(field => field.name === options.name && field.visible), options.name) },
    // The service labels wrap their selects/options. Their accessible names
    // are exact, while raw label text also contains option text. Country has
    // an explicit aria-label and remains mounted inside the collapsed form.
    getByLabel: (name, options) => { assert.equal(name, words[2]); assert.equal(options.exact, true); return selections(() => fields.filter(field => field.name === name), name) },
    locator: selector => {
      if (selector === 'select') return selections(() => fields, 'all selects')
      if (selector === ':scope > label > select') return selections(() => fields.filter(field => field.direct), 'service options')
      if (selector === '[data-contact-order]') return control('request', { 'aria-expanded': 'false' })
      if (selector === '[data-phone-country-input] input[type="tel"]') return control('phone', fault === 'optional-phone' ? {} : { required: '' })
      if (selector === '[data-compact-phone-trigger="true"] input[type="checkbox"]') return control('consent', fault === 'optional-consent' ? {} : { required: '' })
      assert.fail('Unexpected service-form selector: ' + selector)
    } }
  let selectedPrice = '60'
  const priceButton = control('price', { 'aria-pressed': 'false' })
  priceButton.click = async () => { selectedPrice = '30'; priceButton.items = () => [{ id: 'price', visible: true, attrs: { 'aria-pressed': 'true' } }] }
  const pricing = { locator: selector => selector === '[data-alchemy-format="30"]' ? priceButton : f.scope.locator(selector) }
  const link = control('free-review'); link.first = () => link
  const page = { ...f.page, locator: selector => {
    if (selector === '[data-alchemy-lead-form="single"]') return form
    if (selector === '[data-alchemy-booking-formats]') return pricing
    assert.equal(selector, 'a[href="/' + locale + '/services/free-situation-review"]'); return link
  } }
  const expect = actual => actual.selection ? {
    toHaveCount: async count => assert.equal(actual.items().length, count, 'Alchemy ' + actual.name + ' count'),
    toBeVisible: async () => { assert.equal(actual.items().length, 1); assert.equal(actual.items()[0].visible, true) },
    toHaveValue: async value => { assert.equal(actual.items().length, 1); assert.equal(values[actual.items()[0].id], value, 'Alchemy ' + actual.name + ' value') },
    toHaveAttribute: async (name, value) => { assert.equal(actual.items().length, 1); assert.equal(actual.items()[0].attrs?.[name], value, 'Alchemy ' + actual.name + ' attribute ' + name) },
  } : f.expect(actual)
  return { f, page, expect, changed, values, selectedPrice: () => selectedPrice }
}
const alchemyStart = "    }else if(kind==='alchemy'){\n"
const alchemyEnd = '\n    }\n   }\n   await servicePage.close()'
const alchemyFirst = '     const form=servicePage.locator(\'[data-alchemy-lead-form="single"]\')'
const alchemyLast = '     await expect(servicePage.locator(\'a[href="/\'+locale+\'/services/free-situation-review"]\').first()).toBeVisible()'
function extractWholeAlchemyForm(script) {
  const start = script.indexOf(alchemyStart), end = script.indexOf(alchemyEnd)
  assert.ok(start >= 0 && end > start, 'Alchemy extraction requires ordered standalone branch boundaries')
  assert.equal(script.lastIndexOf(alchemyStart), start, 'Alchemy extraction requires one start boundary')
  assert.equal(script.lastIndexOf(alchemyEnd), end, 'Alchemy extraction requires one end boundary')
  const snippet = script.slice(start + alchemyStart.length, end)
  assert.ok(snippet.startsWith(alchemyFirst + '\n'), 'Alchemy extraction must start with the whole form')
  assert.ok(snippet.endsWith('\n' + alchemyLast), 'Alchemy extraction must include the final free-review assertion')
  return snippet
}
function runWholeAlchemyForm(h, locale) {
  // Extract synchronously, outside assert.rejects: a broken boundary must never
  // count as an expected semantic-control rejection.
  const snippet = extractWholeAlchemyForm(read('scripts/verify-app-r1.mjs'))
  return runInNewContext('(async () => {' + snippet + '\n})()', {
    assert, locale, servicePage: h.page, expect: h.expect,
    openContactChannelChooser, openRegisteredCompactPhoneChooser, assertPreparedContactChannels,
  }, { timeout: 1000 })
}
test('whole Alchemy extraction excludes adjacent DAO, hypnotherapy, and page lifecycle branches', () => {
  const snippet = extractWholeAlchemyForm(read('scripts/verify-app-r1.mjs'))
  assert.doesNotMatch(snippet, /assertDaoFreeEntryCapture|verifyHypnotherapyRequest|servicePage\.close/)
})
for (const [fault, mutate, message] of [
  ['missing start', source => source.replace(alchemyStart, ''), /ordered standalone branch boundaries/],
  ['missing end', source => source.replace(alchemyEnd, ''), /ordered standalone branch boundaries/],
  ['duplicate start', source => source + alchemyStart, /one start boundary/],
  ['duplicate end', source => source + alchemyEnd, /one end boundary/],
  ['end before start', source => alchemyEnd + source, /ordered standalone branch boundaries/],
  ['truncated form', source => source.replace(alchemyFirst + '\n', ''), /start with the whole form/],
  ['truncated final assertion', source => source.replace('\n' + alchemyLast, ''), /include the final free-review assertion/],
]) test('whole Alchemy extraction rejects ' + fault, () => {
  assert.throws(() => extractWholeAlchemyForm(mutate(read('scripts/verify-app-r1.mjs'))), { code: 'ERR_ASSERTION', message })
})
for (const locale of ['en', 'ru']) for (const countryFirst of [false, true]) {
  test(locale + ' complete Alchemy form branch distinguishes two options from phone country: countryFirst=' + countryFirst, async () => {
    const h = serviceControls(locale, '', countryFirst)
    await runWholeAlchemyForm(h, locale)
    assert.deepEqual(h.changed, ['format:30', 'topic:business'])
    assert.equal(h.values.country, 'CA', 'Service choices never alter the phone country')
    assert.equal(h.selectedPrice(), '30')
    assert.equal(h.f.state.requests.length, 1); assert.equal(h.f.state.requests[0].contactConsent, true)
    assert.equal(h.f.state.externalClicks, 0)
  })
}
for (const [fault, message] of [
  ['missing-format', /^Alchemy service options count/],
  ['duplicate-topic', /^Alchemy service options count/],
  ['wrong-format-label', /^Alchemy Session format count/],
  ['hidden-format', /^Alchemy Session format count/],
  ['missing-country', /^Alchemy Country calling code count/],
  ['extra-service-option', /^Alchemy service options count/],
  ['missing-format-option', /^Alchemy format option 30/],
  ['missing-topic-option', /^Alchemy topic option business/],
  ['optional-phone', /^Alchemy phone attribute required/],
  ['optional-consent', /^Alchemy consent attribute required/],
  ['ignored-format-change', /^Alchemy Session format value/],
  ['ignored-topic-change', /^Alchemy Topic value/],
]) {
  test('complete Alchemy branch rejects broken semantic controls: ' + fault, async () => {
    const h = serviceControls('en', fault)
    await assert.rejects(runWholeAlchemyForm(h, 'en'), { code: 'ERR_ASSERTION', message })
    assert.equal(h.f.state.requests.length, 0, 'Broken prerequisites never reach even the synthetic pricing request')
  })
}
test('source provides two labelled service choices and a separately required phone/country/consent form', () => {
  const form = read('components/alchemy-soul-lead-form.tsx'), phone = read('components/phone-country-input.tsx')
  const runtime = read('components/contact-channel-chooser.tsx')
  assert.match(form, /<label htmlFor=\{formId \+ "-format"\}>\{t\.format\}\s*<select id=\{formId \+ "-format"\}/)
  assert.match(form, /<label htmlFor=\{formId \+ "-topic"\}>\{t\.topics\}\s*<select id=\{formId \+ "-topic"\}/)
  assert.match(phone, /<select aria-label=\{words\.country\}/)
  for (const label of ['Country calling code', 'Код страны']) assert.ok(phone.includes(label))
  assert.match(phone, /required=\{required\}/)
  assert.match(runtime, /<PhoneCountryInput[\s\S]*?disabled=\{busy\} required/)
  assert.match(runtime, /<input type="checkbox" checked=\{consent\} required disabled=\{busy\}/)
  assert.match(runtime, /if \(!consent\) \{[\s\S]*?return;/)
})
