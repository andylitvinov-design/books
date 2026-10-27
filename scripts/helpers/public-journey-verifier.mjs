import assert from 'node:assert/strict'

// Diagnostic verifier only: no CRM/auth/payment requests are part of these journeys.
// Match the existing no-application-secrets public-services CI job, not live Vercel.
export function assertPublicJourneyRuntime(origin, env = process.env) {
  assert.equal(env.CI, 'true', 'Public journey diagnostics require CI')
  assert.equal(env.NODE_ENV, 'production', 'Public journey diagnostics require the local production build')
  assert.ok(!env.VERCEL, 'Public journey diagnostics must never run inside Vercel')
  assert.match(origin, /^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/, 'Exact loopback origin required')
  const parsed = new URL(origin)
  assert.equal(parsed.origin, origin, 'No credentials, path, query, fragment or noncanonical port')
  return origin
}

function decoded(value) {
  let result = String(value || '')
  for (let i = 0; i < 3; i++) {
    try { const next = decodeURIComponent(result.replace(/\+/g, ' ')); if (next === result) break; result = next }
    catch { break }
  }
  return result
}

export function publicJourneyRequestDecision({ url, method, body = '', navigation = false }, origin, sensitive = []) {
  const contents = decoded(url) + '\n' + decoded(body)
  if (sensitive.some(value => value && contents.includes(value))) return 'private-text'
  let target
  try { target = new URL(url) } catch { return 'invalid-url' }
  if (!['GET', 'HEAD'].includes(method)) return 'write'
  if (target.origin !== origin) return navigation ? 'external-navigation' : 'external-resource'
  // Public route rendering may read its own static resources. API/auth/admin,
  // assessment runner and any unplanned destination remain closed, even on localhost.
  if (/^\/(?:_next\/|images\/|audio\/|fonts\/|favicon\.|icon\.|apple-icon\.|manifest\.)/.test(target.pathname)) return 'allow'
  if (/^\/(?:en|ru|es)\/(?:explore\/business|holistic-support|services\/(?:business-consulting|free-situation-review|remote-energy-support|free-consultation))\/?$/.test(target.pathname)) return 'allow'
  return 'unplanned-route'
}

export async function installPublicJourneyFence(context, origin, sensitive = []) {
  const violations = []
  const blockedResources = []
  await context.route('**/*', async route => {
    const request = route.request()
    const decision = publicJourneyRequestDecision({ url: request.url(), method: request.method(),
      body: request.postData() || '', navigation: request.isNavigationRequest() }, origin, sensitive)
    if (decision === 'allow') return route.continue()
    // Never save the URL/body: a failing implementation might contain private text.
    if (decision === 'external-resource') blockedResources.push(decision)
    else violations.push(decision)
    await route.abort('blockedbyclient')
  })
  return {
    assertNoSideEffects(label) { assert.deepEqual(violations, [], label + ': no private-text, API, write or external navigation attempt') },
    summary() { return { violations: [...violations], blockedExternalResources: blockedResources.length } },
  }
}

// Restore visible editorial context without inventing a personal answer.
// A missing/mismatched label or prefilled answer is a hard failure, not a waiver.
export function assertBusinessContextHandoff({ actualId, expectedId, actualTitle, expectedTitle, visible, personalAnswer }, label) {
  assert.match(expectedId, /^(decisions|productivity|work-stress|money-beliefs)$/)
  assert.equal(actualId, expectedId, label + ': selected editorial context id must be preserved')
  assert.equal(actualTitle, expectedTitle, label + ': selected editorial context must use the exact localized public title')
  assert.equal(visible, true, label + ': selected editorial context must be visible for review')
  assert.equal(personalAnswer, '', label + ': editorial context must not fabricate a personal answer')
}
export function assertHolisticContextHandoff(actual, expected, label) {
  assert.equal(actual, expected,
    label + ': UNRESOLVED CONTRACT: private same-tab goal must be preserved for the user\'s review')
}

// Exact public offer provenance: the direction CTA is generic, not an express
// booking promise. Both advertised paid options must survive at the destination.
// Keep these independent expectations pinned to the reviewed public source copy.
const businessSessionCopy = {
  en: { cta: 'Explore a session', note: '30 min €50 · 60 min €100', heading: 'Three simple ways to begin',
    freePrice: 'Free', times: ['Written review · no live call', '30-minute live session', '60-minute live session'],
    form: { express: '30 minutes · €50', full: '60 minutes · €100' } },
  ru: { cta: 'Выбрать сессию', note: '30 мин €50 · 60 мин €100', heading: 'Три способа начать',
    freePrice: 'Бесплатно', times: ['Письменный разбор · без созвона', '30 минут · личная сессия', '60 минут · личная сессия'],
    form: { express: '30 минут · €50', full: '60 минут · €100' } },
  es: { cta: 'Explorar una sesión', note: '30 min €50 · 60 min €100', heading: 'Tres formas sencillas de comenzar',
    freePrice: 'Gratis', times: ['Revisión escrita · sin llamada', '30 minutos · sesión individual', '60 minutos · sesión individual'],
    form: { express: '30 minutos · €50', full: '60 minutos · €100' } },
}
function businessCopy(locale) {
  assert.ok(Object.hasOwn(businessSessionCopy, locale), 'Reviewed Business offer locale required')
  return businessSessionCopy[locale]
}
export function assertBusinessGenericSessionCard({ cta, note, ctaVisible, noteVisible }, locale, label) {
  const expected = businessCopy(locale)
  assert.equal(cta, expected.cta, label + ': direction CTA must remain a generic session choice, not an unchosen paid format')
  assert.equal(note, expected.note, label + ': direction card must advertise both exact duration/price pairs')
  assert.equal(ctaVisible, true, label + ': generic choice must be visible')
  assert.equal(noteVisible, true, label + ': both advertised duration/price pairs must be visible')
}
export function assertBusinessOfferChoices({ heading, headingVisible, offers }, locale, label) {
  const expected = businessCopy(locale)
  assert.equal(heading, expected.heading, label + ': destination explicitly offers three starting points')
  assert.equal(headingVisible, true, label + ': three-choice destination heading must be visible')
  assert.deepEqual(offers, ['free', 'express', 'full'].map((kind, index) => ({
    kind, price: [expected.freePrice, '€50', '€100'][index], time: expected.times[index],
    directOption: kind, directHref: '#business-direct-request',
    visible: true, priceVisible: true, timeVisible: true, directVisible: true,
  })), label + ': free/30-minute €50/60-minute €100 destination choices must match the advertised offer')
}
export function assertBusinessPaidFormatPrice({ format, text }, expectedFormat, locale, label) {
  const expected = businessCopy(locale)
  assert.ok(['express', 'full'].includes(expectedFormat), 'An explicit reviewed paid choice is required')
  assert.equal(format, expectedFormat, label + ': only the explicitly selected paid format reaches the form')
  assert.equal(text, expected.form[expectedFormat], label + ': selected form duration and price must match the explicit offer')
}
