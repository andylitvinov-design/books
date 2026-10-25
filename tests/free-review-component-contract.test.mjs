import {expressFixture} from './helpers/personal-express-parent-fixture.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import {environment, mount, compileContactModule, readContactSource as read, turn, deferred,
  success, receipt, intakeModel} from './helpers/contact-component-fixture.mjs'

const CONTACT = 'free-review-component-fixture@example.invalid'
const REFERENCE = 'HH-F4E3D2C1B0A9'
const pathFor = locale => '/' + locale + '/services/free-situation-review'
const FOOTER_SERVICE = 'Free written Situation Review'
const copy = {
  en: {service: 'Free drawing-based situation review', reference: 'Enquiry'},
  ru: {service: 'Бесплатная диагностика ситуации по рисунку', reference: 'Заявка'},
}
const markers = locale => ['problem', 'goal', 'obstacle', 'tried'].map(name => 'SYNTHETIC_PRIVATE_' + name + '_' + locale)

// The public questionnaire was replaced by a private-entry link. Test neutral
// gift contact separately through its real parent; never fabricate old answer
// controls or restore their private text to a messenger callback.
async function preparedInvite(locale, env = environment(locale)) {
  env.navigate(pathFor(locale), '?topic=business&answer=' + markers(locale)[0] + '&email=' + CONTACT)
  const f = mount('client-assessment-invite', 'ClientAssessmentInvite', {locale}, env)
  const topics = f.nodes().filter(node => node.type === 'button' && 'aria-pressed' in node.props)
  assert.equal(topics.length, 4); assert.equal(topics[0].props['aria-pressed'], true)
  topics[2].props.onClick(); f.flush()
  assert.deepEqual(env.copies, []); assert.deepEqual(env.requests, []); assert.deepEqual(env.writes, [])
  return f
}

function assertNoPrivate(value, locale, extras = []) {
  const text = typeof value === 'string' ? value : JSON.stringify(value)
  for (const marker of [...markers(locale), CONTACT, ...extras]) assert.ok(!text.includes(marker), 'Private value escaped its intended boundary')
}

function assertPayload(raw, locale, serviceTitle, description = '') {
  const body = JSON.parse(raw)
  assert.match(body.operationId, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
  assert.deepEqual(body, {
    operationId: body.operationId, serviceTitle, description, sourcePath: pathFor(locale), locale,
    contact: {displayName: '', email: CONTACT, phone: ''}, contactConsent: true, website: '',
  })
  for (const marker of markers(locale)) assert.ok(!raw.includes(marker))
}

function assertReceipt(env, denied) {
  if (denied) { assert.deepEqual(env.writes, []); assert.equal(env.storage.size, 0); return }
  assert.equal(env.writes.length, 1); assert.equal(env.writes[0][0], receipt.RECEIPT_SESSION_KEY)
  const value = JSON.parse(env.writes[0][1])
  assert.deepEqual(Object.keys(value).sort(), ['createdAt', 'referenceCode'])
  assert.equal(value.referenceCode, REFERENCE); assert.ok(Number.isSafeInteger(value.createdAt))
  assert.deepEqual(receipt.parseEnquiryReceipt(value), value)
}

function assertLink(props, channel, locale, service) {
  const url = new URL(props.href)
  assert.equal(url.origin, channel === 'whatsapp' ? 'https://wa.me' : 'https://t.me')
  assert.equal(url.pathname, channel === 'whatsapp' ? '/14376066502' : '/AndyTherapist')
  assert.ok(!url.username && !url.password && !url.port && !url.hash)
  assert.deepEqual([...url.searchParams.keys()], ['text'])
  assert.equal(props.target, '_blank')
  assert.deepEqual(props.rel.split(/\s+/).sort(), ['noopener', 'noreferrer'])
  const text = url.searchParams.get('text')
  assert.ok(text.includes(service)); assert.ok(text.includes(REFERENCE))
  assert.ok(text.includes('https://holistichouse.vercel.app' + pathFor(locale)))
  assertNoPrivate(text, locale)
  assert.doesNotMatch(text, /operationId|contactConsent|\/api\/|\/app\/|\/auth\/|\/checkout\//)
  return text
}

for (const locale of ['en', 'ru']) {
  for (const denied of [false, true]) test(locale + ': neutral gift chooser exact payload and ' + (denied ? 'storage-denied fallback' : 'thank-you router intent'), async () => {
    const env = environment(locale, {denyReceiptStorage: denied}), parent = await preparedInvite(locale, env)
    const chooserProps = parent.find('chooser').props
    assertNoPrivate(chooserProps, locale)
    const f = mount('contact-channel-chooser', 'ContactChannelChooser', chooserProps, env)
    const consent = () => f.find('input', props => props.type === 'checkbox')
    const submit = () => f.find('button', props => props.type === 'submit')
    assert.equal(consent().props.checked, false); assert.equal(consent().props.required, true)
    f.change('input', props => props.type === 'email', CONTACT)
    assert.equal(submit().props.disabled, true)
    await f.submit() // Also tests runtime validation if native disabled handling is bypassed.
    assert.deepEqual(env.requests, []); assert.deepEqual(env.writes, [])
    f.change('input', props => props.type === 'checkbox', true)
    assert.equal(submit().props.disabled, false)
    await f.submit()
    assert.equal(env.requests.length, 1); assertPayload(env.requests[0], locale, copy[locale].service)
    assertReceipt(env, denied); assert.deepEqual(env.popups, []); assert.deepEqual(env.copies, [])
    if (denied) {
      assert.deepEqual(env.navigations, [])
      assert.equal(f.nodes().filter(node => node.type === 'form').length, 0)
      const links = f.nodes().filter(node => node.type === 'acquisition-link')
      assert.equal(links.length, 2)
      const texts = []
      for (const channel of ['whatsapp', 'telegram']) {
        const link = f.find('acquisition-link', props => props.attributes['data-contact-channel'] === channel)
        texts.push(assertLink(link.props, channel, locale, copy[locale].service))
        link.props.onClick(); await turn(parent)
      }
      assert.equal(texts[0], texts[1])
      assert.equal(texts[0], new URL(chooserProps.whatsappUrl).searchParams.get('text') + '\n\n' + copy[locale].reference + ': ' + REFERENCE)
      assert.deepEqual(env.copies, [], 'Neutral messenger callbacks must not copy private answers')
      // AcquisitionEventLink itself is a marker here: browser tests own its
      // native anchor default/analytics behavior. The real chooser callback ran.
    } else {
      assert.deepEqual(env.navigations, ['/' + locale + '/thank-you'])
      const thanks = mount('service-enquiry-thank-you', 'ServiceEnquiryThankYou', {locale, video: null}, env)
      assert.equal(thanks.find('strong').props.children, REFERENCE)
      assertNoPrivate(thanks.nodes(), locale)
      // Router is an intent recorder, so this test does not pretend it unmounted the chooser.
    }
  })

  for (const channel of ['whatsapp', 'telegram']) for (const denied of [false, true]) {
    test(locale + ': separate compact free-review ' + channel + ', receipt storage denied=' + denied, async () => {
      const env = environment(locale, {denyReceiptStorage: denied}), hold = deferred()
      const f = mount('compact-lead-capture', 'CompactLeadCapture', {
        locale, serviceTitle: FOOTER_SERVICE, id: 'request-free-review', title: 'Synthetic free review', lead: 'Synthetic only',
      }, env)
      const click = () => f.click('button', props => props['data-compact-channel'] === channel)
      assert.equal(f.find('input', props => props.type === 'checkbox').props.checked, false)
      f.change('input', props => props.name === 'contact', CONTACT)
      click(); await turn(f)
      assert.deepEqual(env.requests, []); assert.deepEqual(env.popups, [])
      f.change('input', props => props.type === 'checkbox', true)
      env.setRespond(() => hold.promise)
      const handler = f.find('button', props => props['data-compact-channel'] === channel).props.onClick
      handler(); handler(); f.flush()
      assert.equal(env.requests.length, 1, 'Same-tick double activation has one operation')
      assertPayload(env.requests[0], locale, FOOTER_SERVICE, 'Preferred reply channel: ' + (channel === 'whatsapp' ? 'WhatsApp' : 'Telegram'))
      assert.equal(env.popups.length, 1); assert.equal(env.popups[0].opener, null)
      assert.deepEqual(env.popups[0].destinations, []); assert.deepEqual(env.writes, [])
      assert.equal(f.find('input', props => props.name === 'contact').props.disabled, true)
      assert.equal(f.find('input', props => props.type === 'checkbox').props.disabled, true)
      hold.resolve(success()); await turn(f)
      assertReceipt(env, denied); assert.deepEqual(env.navigations, []); assert.deepEqual(env.copies, [])
      assert.equal(f.nodes().filter(node => node.type === 'form').length, 0)
      const links = f.nodes().filter(node => node.type === 'a' && node.props['data-compact-channel'])
      assert.equal(links.length, 2)
      const texts = links.map(link => assertLink(link.props, link.props['data-compact-channel'], locale, FOOTER_SERVICE))
      assert.equal(texts[0], texts[1])
      assert.deepEqual(env.popups[0].destinations, [f.find('a', props => props['data-compact-channel'] === channel).props.href])
      assert.equal(env.requests.length, 1)
    })
  }
}

for (const fault of ['network', 'json', 'http-error', 'saved-false', 'bad-reference', 'array-reference']) {
  test('neutral gift chooser rejects unconfirmed ' + fault + ' and retries the byte-identical private-free body', async () => {
    const env = environment('en'), parent = await preparedInvite('en', env)
    const f = mount('contact-channel-chooser', 'ContactChannelChooser', parent.find('chooser').props, env)
    f.change('input', props => props.type === 'email', CONTACT)
    f.change('input', props => props.type === 'checkbox', true)
    env.setRespond(async () => {
      if (fault === 'network') throw new Error('SYNTHETIC_TRANSPORT_UNKNOWN')
      return {ok: fault !== 'http-error', json: async () => {
        if (fault === 'json') throw new Error('SYNTHETIC_BAD_JSON')
        return {saved: fault !== 'saved-false', referenceCode: fault === 'bad-reference' ? 'INVALID' : fault === 'array-reference' ? [REFERENCE] : REFERENCE}
      }}
    })
    await f.submit()
    assert.equal(env.requests.length, 1); assertPayload(env.requests[0], 'en', copy.en.service)
    assert.deepEqual(env.writes, []); assert.deepEqual(env.navigations, []); assert.deepEqual(env.popups, [])
    assert.equal(f.find('input', props => props.type === 'email').props.disabled, true)
    assert.equal(f.find('input', props => props.type === 'checkbox').props.disabled, true)
    assert.equal(f.find('button', props => props.type === 'submit').props.disabled, false)
    assert.equal(f.nodes().filter(node => node.type === 'acquisition-link').length, 0)
    env.setRespond(success); await f.submit()
    assert.equal(env.requests.length, 2); assert.equal(env.requests[1], env.requests[0])
    assertReceipt(env, false); assert.deepEqual(env.navigations, ['/en/thank-you'])
  })
}

test('neutral gift deliberate contact note is submitted, but neither note nor private query markers enter a public draft', async () => {
  const env = environment('en', {denyReceiptStorage: true}), parent = await preparedInvite('en', env)
  const f = mount('contact-channel-chooser', 'ContactChannelChooser', parent.find('chooser').props, env)
  const note = 'SYNTHETIC_PRACTICAL_CONTACT_NOTE'
  f.change('input', props => props.type === 'email', CONTACT)
  f.change('input', props => props.type === 'checkbox', true)
  f.change('textarea', () => true, note)
  await f.submit(); assertPayload(env.requests[0], 'en', copy.en.service, note)
  for (const link of f.nodes().filter(node => node.type === 'acquisition-link')) assertNoPrivate(decodeURIComponent(link.props.href), 'en', [note])
})

test('missing receipt cannot make the actual thank-you component invent a confirmed request', () => {
  const env = environment('en')
  const thanks = mount('service-enquiry-thank-you', 'ServiceEnquiryThankYou', {locale: 'en', video: null}, env)
  assert.equal(thanks.nodes().filter(node => node.type === 'strong').length, 0)
  assert.equal(thanks.find('h1').props.children, 'Open this page after sending a request')
  assert.deepEqual(env.requests, []); assert.deepEqual(env.writes, []); assert.deepEqual(env.navigations, [])
})

test('actual situation landing executes one personal-express parent and optional private entry without duplicate footer', () => {
  for (const locale of ['en','ru','es']) {
    const f=expressFixture({locale})
    assert.equal(f.find('main').props['data-free-entry-landing'],'situation')
    assert.equal(f.find('section',p=>Object.hasOwn(p,'data-personal-express-enquiry')).props.lang,locale)
    assert.equal(f.find('private-intake-leaf').props.locale,locale)
    assert.equal(f.nodes().filter(node=>node.type==='independent-compact-capture').length,0)
    const details=f.find('details',props=>Object.hasOwn(props,'data-optional-written-review'))
    assert.equal(details.props.open,undefined)
    assert.deepEqual(f.env.requests,[]); assert.deepEqual(f.env.writes,[]);f.unmount()
  }
})

test('payload and public-link acceptance oracles reject changed consent, identity, route and private-data leaks', async () => {
  const env = environment('en', {denyReceiptStorage: true}), parent = await preparedInvite('en', env)
  const f = mount('contact-channel-chooser', 'ContactChannelChooser', parent.find('chooser').props, env)
  f.change('input', props => props.type === 'email', CONTACT)
  f.change('input', props => props.type === 'checkbox', true)
  await f.submit()
  const good = JSON.parse(env.requests[0])
  for (const changes of [
    {contactConsent: false}, {serviceTitle: FOOTER_SERVICE}, {sourcePath: '/en/services/other'},
    {locale: 'ru'}, {description: markers('en')[0]}, {questionnaire: markers('en')},
    {contact: {...good.contact, phone: '+14165550100'}}, {operationId: 'not-a-uuid'},
  ]) assert.throws(() => assertPayload(JSON.stringify({...good, ...changes}), 'en', copy.en.service))
  const goodLink = f.find('acquisition-link', props => props.attributes['data-contact-channel'] === 'whatsapp').props
  for (const changes of [
    {href: goodLink.href.replace('wa.me', 'untrusted.example.invalid')},
    {href: goodLink.href.replace('/14376066502', '/14376066503')},
    {href: goodLink.href + '&email=' + CONTACT}, {target: '_self'}, {rel: 'noopener'},
    {href: goodLink.href.replace(REFERENCE, 'HH-000000000000')},
  ]) assert.throws(() => assertLink({...goodLink, ...changes}, 'whatsapp', 'en', copy.en.service))
  const leaked = new URL(goodLink.href)
  leaked.searchParams.set('text', leaked.searchParams.get('text') + '\n' + markers('en')[2])
  assert.throws(() => assertLink({...goodLink, href: leaked.href}, 'whatsapp', 'en', copy.en.service))
})

test('compact free-review uncertain result locks the initial channel and retries its unchanged operation', async () => {
  const env = environment('en')
  const f = mount('compact-lead-capture', 'CompactLeadCapture', {
    locale: 'en', serviceTitle: FOOTER_SERVICE, title: 'Synthetic free review', lead: 'Synthetic only',
  }, env)
  f.change('input', props => props.name === 'contact', CONTACT)
  f.change('input', props => props.type === 'checkbox', true)
  env.setRespond(async () => ({ok: false, status: 503, json: async () => ({saved: false})}))
  f.click('button', props => props['data-compact-channel'] === 'telegram'); await turn(f)
  assert.equal(env.requests.length, 1)
  assertPayload(env.requests[0], 'en', FOOTER_SERVICE, 'Preferred reply channel: Telegram')
  assert.equal(env.popups[0].closed, true); assert.deepEqual(env.popups[0].destinations, [])
  assert.deepEqual(env.writes, []); assert.deepEqual(env.navigations, [])
  assert.equal(f.find('button', props => props['data-compact-channel'] === 'whatsapp').props.disabled, true)
  f.click('button', props => props['data-compact-channel'] === 'whatsapp'); await turn(f)
  assert.equal(env.requests.length, 1, 'Even direct invocation cannot change the unresolved channel')
  env.setRespond(success)
  f.click('button', props => props['data-compact-channel'] === 'telegram'); await turn(f)
  assert.equal(env.requests.length, 2); assert.equal(env.requests[0], env.requests[1])
  assertReceipt(env, false)
  assert.deepEqual(env.popups[1].destinations, [f.find('a', props => props['data-compact-channel'] === 'telegram').props.href])
})

test('neutral gift chooser duplicate pending submit and late unmount cannot fabricate a receipt', async () => {
  const env = environment('en'), parent = await preparedInvite('en', env), hold = deferred()
  const f = mount('contact-channel-chooser', 'ContactChannelChooser', parent.find('chooser').props, env)
  f.change('input', props => props.type === 'email', CONTACT)
  f.change('input', props => props.type === 'checkbox', true)
  env.setRespond(() => hold.promise)
  const handler = f.find('form').props.onSubmit
  const running = handler({preventDefault() {}}), duplicate = handler({preventDefault() {}})
  f.flush()
  assert.equal(env.requests.length, 1); assertPayload(env.requests[0], 'en', copy.en.service)
  assert.equal(f.find('button', props => props.type === 'submit').props.disabled, true)
  assert.equal(f.nodes().filter(node => node.type === 'acquisition-link').length, 0)
  assert.deepEqual(env.writes, []); assert.deepEqual(env.navigations, [])
  f.unmount(); hold.resolve(success()); await running; await duplicate; f.flush()
  assert.deepEqual(env.writes, []); assert.deepEqual(env.navigations, []); assert.deepEqual(env.popups, [])
})

const privateEntryCopy = {
  en: {title: 'Prepare your question privately', action: 'Open private coaching questionnaire', privacy: 'Do not send private answers, drawings or test results through WhatsApp, Telegram or email.', draft: 'Saving does not send it to a coach or create a booking.'},
  ru: {title: 'Подготовьте запрос приватно', action: 'Открыть приватную коучинг-анкету', privacy: 'Не отправляйте личные ответы, рисунки и результаты тестов через WhatsApp, Telegram или email.', draft: 'Сохранение не отправляет его коучу и не создаёт запись.'},
  es: {title: 'Prepara tu consulta en privado', action: 'Abrir formulario privado de coaching', privacy: 'No envíes respuestas privadas, dibujos ni resultados por WhatsApp, Telegram o correo.', draft: 'Guardar no lo envía al coach ni reserva una cita.'},
}
const nodeText = node => Array.isArray(node) ? node.map(nodeText).join('') : node && typeof node === 'object' ? nodeText(node.props?.children) : typeof node === 'string' ? node : ''
function assertPrivateEntry(f, locale, topic) {
  const section = f.find('section')
  assert.equal(section.props.lang, locale)
  const title = f.find('h2')
  assert.equal(title.props.id, section.props['aria-labelledby'])
  assert.equal(nodeText(title), privateEntryCopy[locale].title)
  const link = f.find('a')
  assert.equal(link.props.href, '/' + locale + '/coaching/intake?topic=' + topic)
  assert.equal(link.props.prefetch, false)
  assert.equal(nodeText(link), privateEntryCopy[locale].action)
  const text = nodeText(section)
  assert.ok(text.includes(privateEntryCopy[locale].privacy), 'Private answers must not be handed to messengers')
  assert.ok(text.includes(privateEntryCopy[locale].draft), 'Saving is not sending or booking')
  assert.equal(f.nodes().filter(node => ['form', 'textarea', 'input', 'chooser', 'acquisition-link', 'button'].includes(node.type)).length, 0,
    'Public entry collects no answers, offers no copy/share action and submits no enquiry')
  assertNoPrivate(JSON.stringify(f.nodes()), locale)
  for (const key of ['requests','writes','navigations','popups','copies','events']) assert.deepEqual(f.env[key], [], 'No ' + key + ' before navigation')
}
for (const locale of ['en','ru','es']) test(locale + ': actual private questionnaire entry renders approved public topic only, with no collection or transmission', () => {
  assert.deepEqual(intakeModel.COACHING_TOPICS.map(topic => topic.id), ['personal','wellbeing','relationships','career','business','goal','other'])
  for (const topic of ['personal','wellbeing','relationships','career','business','goal','other']) {
    const env = environment(locale, {search: '?topic=' + topic + '&answer=' + markers(locale)[0] + '&email=' + CONTACT})
    assertPrivateEntry(mount('free-drawing-intake', 'FreeDrawingIntake', {locale}, env), locale, topic)
  }
  for (const search of ['', '?topic=unknown', '?topic=' + encodeURIComponent(markers(locale)[0]), '?topic=//evil.example', '?email=' + CONTACT]) {
    assertPrivateEntry(mount('free-drawing-intake', 'FreeDrawingIntake', {locale}, environment(locale, {search})), locale, 'personal')
  }
})

test('private entry oracle rejects arbitrary query leakage, missing privacy copy and invented public answer collection', () => {
  const original = read('components/free-drawing-intake.tsx')
  for (const [before, after] of [
    ['"/coaching/intake?topic=" + topic', '"/coaching/intake?topic=" + topic + window.location.search'],
    [privateEntryCopy.en.privacy, 'Send private answers in your messenger.'],
    ['{t.lead}</p>', '{t.lead}</p><textarea name="private-answer" />'],
  ]) {
    assert.equal(original.split(before).length - 1, 1, 'Exact mutation target')
    const env = environment('en', {search: '?email=' + CONTACT})
    const changed = mount('free-drawing-intake', 'FreeDrawingIntake', {locale:'en'}, env, {sourceOverride: original.replace(before, after)})
    assert.throws(() => assertPrivateEntry(changed, 'en', 'personal'))
  }
})

test('contact fixture rejects unknown JavaScript/CSS imports and missing JSX exports, not permissive stubs', () => {
  const env = environment('en')
  for (const name of ['@/server/private', './unlisted.module.css']) {
    assert.throws(() => compileContactModule('import value from "' + name + '"; export const x=value;', {}, env), /Unexpected runtime dependency/)
  }
  const original = read('components/free-drawing-intake.tsx')
  assert.throws(() => mount('free-drawing-intake', 'FreeDrawingIntake', {locale:'en'}, env,
    {sourceOverride: original.replace('ArrowUpRight, FileText', 'MissingIcon, FileText').replace('<ArrowUpRight ', '<MissingIcon ')}), /Missing JSX export/)
})

test('neutral gift pending old selection or route cannot create receipt, navigate, or unlock a different enquiry', async () => {
  for (const changed of ['selection', 'route']) {
    const env = environment('en'), parent = await preparedInvite('en', env), hold = deferred()
    const locks = []
    const initial = {...parent.find('chooser').props, onSubmissionLockChange: (...args) => locks.push(args)}
    const f = mount('contact-channel-chooser', 'ContactChannelChooser', initial, env)
    f.change('input', props => props.type === 'email', CONTACT)
    f.change('input', props => props.type === 'checkbox', true)
    env.setRespond(() => hold.promise)
    const pending = f.find('form').props.onSubmit({preventDefault() {}}); f.flush()
    assert.equal(env.requests.length, 1); assert.equal(locks.filter(([locked]) => locked).length, 1)
    if (changed === 'route') env.navigate('/en/services/other')
    f.update(changed === 'selection' ? {resetKey: 'new-selection'} : {})
    hold.resolve(success()); await pending; f.flush()
    assert.deepEqual(env.writes, []); assert.deepEqual(env.navigations, [])
    assert.equal(f.nodes().filter(node => node.type === 'acquisition-link').length, 0)
    assert.equal(locks.filter(([locked]) => !locked).length, 0, 'Stale response must not release the active lock')
    await f.submit(); assert.equal(env.requests.length, 1, 'Changed context cannot create or retry an unresolved old operation')
    f.unmount()
    assert.equal(locks.filter(([locked]) => !locked).length, 1, 'Unmount releases only the instance owner')
    assert.equal(locks[0][1], locks.at(-1)[1])
  }
})
