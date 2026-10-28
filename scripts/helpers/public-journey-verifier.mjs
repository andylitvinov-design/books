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

// Reviewed source-authored RSC prefetches only, not destinations this journey
// may navigate to. Keep this explicit set separate from passive source labels.
const reviewedPublicPrefetchPaths = new Set([
  '/', '/es',
  ...['en', 'ru', 'es'].flatMap(locale => [
    '/' + locale + '/masters',
    '/' + locale + '/academy/reiki/yggdrasil/free-initiation',
  ]),
])
const reviewedAdvancedRunesPath = '/academy/reiki-yggdrasil/source/advanced-runes.png'
const reviewedRemoteSupportIntroPath = '/academy/reiki-yggdrasil/source/basic-program.jpg'
// WebKit-only caller opt-in for browser-local object images, not source identity.
// Raw origin/prefix/UUID checks reject forgiving URL-parser normalization.
function isBrowserLocalBlobImageCandidate(request, origin) {
  if (typeof origin !== 'string' || !/^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/.test(origin)) return false
  try { if (new URL(origin).origin !== origin) return false } catch { return false }
  const prefix = 'blob:' + origin + '/'
  return typeof request.url === 'string' && request.url.startsWith(prefix) && request.url.length === prefix.length + 36 &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(request.url.slice(prefix.length)) &&
    request.method === 'GET' && request.resourceType === 'image' && request.body === '' && request.navigation === false &&
    request.prefetch === false && request.prefetchSignals?.purposePrefetch === false &&
    request.prefetchSignals?.nextRouterPrefetch === false && request.prefetchSignals?.rsc === false
}
export function publicJourneyRequestDecision(request, origin, sensitive = [], fixtures = {}) {
  const { url, method, body = '', navigation = false, resourceType, prefetch, prefetchSignals,
    hasAuthHeaders, hasPrefetchHeaders } = request
  const contents = decoded(url) + '\n' + decoded(body)
  if (sensitive.some(value => value && contents.includes(value))) return 'private-text'
  let target
  try { target = new URL(url) } catch { return 'invalid-url' }
  if (!['GET', 'HEAD'].includes(method)) return 'write'
  if (target.origin !== origin) return navigation ? 'external-navigation' : 'external-resource'
  // Source-proven initial guest gallery read only. Never send this account-owned
  // endpoint to a backend, return successful contents, or intercept its writes.
  if (fixtures.anonymousTalismans === true && method === 'GET' && !navigation && !body &&
      target.pathname === '/api/holistic-support/talismans' && !target.search && !target.hash)
    return 'synthetic-anonymous-talismans'
  // Exact db382 isolated evidence: these GETs originate from the authored
  // wordmark/footer Links or root metadata. This is not an API/provider bypass.
  const plainLocalRead = method === 'GET' && navigation === false && body === '' &&
    !target.username && !target.password && !target.hash
  // One verified repository PNG, opted into only by the Business verifier.
  // Exact raw URL prevents query/fragment/encoding/normalization variants.
  if (fixtures.reviewedAdvancedRunesImage === true && plainLocalRead &&
      request.body === '' && request.navigation === false &&
      url === origin + reviewedAdvancedRunesPath && target.search === '' &&
      resourceType === 'image' && hasAuthHeaders === false && hasPrefetchHeaders === false && prefetch === false &&
      prefetchSignals?.purposePrefetch === false && prefetchSignals?.nextRouterPrefetch === false &&
      prefetchSignals?.rsc === false) return 'allow'
  // Exact repository JPEG declared by the remote-support intro stylesheet;
  // source-backed master fixture only, not an identity inferred from a count.
  if (fixtures.reviewedRemoteSupportIntroImage === true && plainLocalRead &&
      /^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/.test(origin) &&
      request.body === '' && request.navigation === false &&
      url === origin + reviewedRemoteSupportIntroPath && target.search === '' &&
      resourceType === 'image' && hasAuthHeaders === false && hasPrefetchHeaders === false && prefetch === false &&
      prefetchSignals?.purposePrefetch === false && prefetchSignals?.nextRouterPrefetch === false &&
      prefetchSignals?.rsc === false) return 'allow'
  // Blob loads use WebKit's local registry, not HTTP. Keep all unknown network
  // images/API/media closed and reject credential/prefetch evidence defensively.
  if (fixtures.browserLocalBlobImages === true && isBrowserLocalBlobImageCandidate(request, origin) &&
      hasAuthHeaders === false && hasPrefetchHeaders === false) return 'allow'
  if (plainLocalRead && target.pathname === '/holistic-house-app.webmanifest' &&
      target.search === '' && resourceType === 'other' && prefetch === false &&
      prefetchSignals?.purposePrefetch === false && prefetchSignals?.nextRouterPrefetch === false &&
      prefetchSignals?.rsc === false) return 'allow'
  if (plainLocalRead && reviewedPublicPrefetchPaths.has(target.pathname) &&
      resourceType === 'fetch' && prefetch === true && prefetchSignals?.purposePrefetch === false &&
      prefetchSignals?.nextRouterPrefetch === true && prefetchSignals?.rsc === true) {
    // Next15.5.21 writes a literal 16-char base64url SHA256 prefix, or a
    // legacy 1-5 lowercase base36 hash when crypto.subtle is unavailable.
    // Check RAW syntax: forgiving URLSearchParams decoding must not admit a
    // partially encoded private value followed by a malformed percent escape.
    if (/^\?_rsc=(?:[0-9a-z]{1,5}|[A-Za-z0-9_-]{16})$/.test(target.search)) return 'allow'
  }
  // Public route rendering may read its own static resources. API/auth/admin,
  // assessment runner and any unplanned destination remain closed, even on localhost.
  if (/^\/(?:_next\/|images\/|audio\/|fonts\/|favicon\.|icon\.|apple-icon\.|manifest\.)/.test(target.pathname)) return 'allow'
  if (/^\/(?:en|ru|es)\/(?:explore\/business|holistic-support|services\/(?:business-consulting|free-situation-review|remote-energy-support|free-consultation))\/?$/.test(target.pathname)) return 'allow'
  return 'unplanned-route'
}

const safeDiagnosticPaths = new Set([
  '/', '/en', '/ru', '/es', '/api/holistic-support/talismans',
  '/academy/reiki-yggdrasil/source/advanced-runes.png',
  '/academy/reiki-yggdrasil/source/program-overview.jpg',
])
// Passive source labels, NEVER request permissions. Exact public source literals:
// app/layout.tsx (metadata), PublicSiteHeader (wordmark), and the two footer
// Links in RemoteEnergySupportBooking. Unknown paths must stay unclassified.
const diagnosticSourcePaths = new Map([
  ['/', 'public-home-wordmark'], ['/es', 'public-home-wordmark'],
  ['/holistic-house-app.webmanifest', 'public-app-manifest'],
  ['/icons/holistic-house-teal.svg', 'public-app-icon-svg'],
  ['/holistic-house-icon/180', 'public-app-apple-icon'],
  ...['en', 'ru', 'es'].flatMap(locale => [
    ['/' + locale + '/masters', 'remote-support-masters-link'],
    ['/' + locale + '/academy/reiki/yggdrasil/free-initiation', 'remote-support-free-initiation-link'],
  ]),
])
// Exact public generated-icon route sizes, for diagnostics only. Their GETs
// remain unplanned and fatal; a label does not identify any prior request.
const diagnosticGeneratedIconPaths = new Map([
  ['/holistic-house-icon/192', 'public-app-icon-192'],
  ['/holistic-house-icon/512', 'public-app-icon-512'],
  ['/course-icon/192', 'public-course-icon-192'],
  ['/course-icon/512', 'public-course-icon-512'],
  ['/opora-course-icon/192', 'public-opora-course-icon-192'],
  ['/opora-course-icon/512', 'public-opora-course-icon-512'],
])
// EN/ES freeMeditationVideos selects the authored English Sun recording;
// AcademyCourseVideoPlaylist -> AcademyVideoPlayer emits this public poster.
const diagnosticSunPoster = 'https://i.ytimg.com/vi/HqfixazXqRY/hqdefault.jpg'
// Source-only alias: TelegramDiagnosticEntry mounts this exact read. It remains
// unplanned and aborted; this label neither identifies an old redacted request
// nor authorizes a backend/provider call.
const diagnosticTelegramAvailabilityPath = '/api/public/telegram-diagnostic'
const diagnosticJourneyPhases = new Set([
  'business-initial', 'business-paid', 'business-return', 'business-mentoring', 'business-free',
])
export function publicJourneyRequestDiagnostic(request, decision, origin) {
  let path = '', target
  try { target = new URL(request.url); path = target.pathname } catch {}
  // A blob URL can inherit loopback origin while its pathname contains http://.
  // Report only a fixed scheme enum; this is never permission or source identity.
  const urlScheme = !target ? 'invalid-url' :
    ({ 'http:': 'http', 'https:': 'https', 'blob:': 'blob', 'data:': 'data' })[target.protocol] || 'other'
  let sourceId = 'unclassified', routeShape = 'unclassified'
  let imagePathShape = 'unclassified', imagePathDepth = 'unclassified'
  if (target && !target.username && !target.password && !target.hash) {
    if (origin && target.origin === origin) {
      if (typeof request.url === 'string' && request.url.length <= 8192 &&
          /^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/.test(origin) &&
          request.url === origin + diagnosticTelegramAvailabilityPath &&
          request.method === 'GET' && request.resourceType === 'fetch' &&
          request.navigation === false && request.body === '' && request.prefetch === false &&
          request.prefetchSignals?.purposePrefetch === false &&
          request.prefetchSignals?.nextRouterPrefetch === false && request.prefetchSignals?.rsc === false)
        sourceId = 'public-telegram-diagnostic-availability'
      sourceId = diagnosticSourcePaths.get(path) || diagnosticGeneratedIconPaths.get(path) || sourceId
      if (request.url === origin + reviewedRemoteSupportIntroPath) sourceId = 'public-remote-support-intro-basic-program'
      // This dynamic route may proxy upstream. Recognize structure only: never
      // print its parameters, call it a safe source, or permit the request.
      if (/^\/media\/[^/]+\/[^/]+$/.test(path)) routeShape = 'media-two-segment-route'
      // Passive syntax only, not a source identity or request permission. Never
      // decode, print, hash or retain any unknown path segment or query value.
      if (request.resourceType === 'image') {
        if (/[^\x21-\x7e]|%/.test(path)) imagePathShape = 'nonliteral-path'
        else if (path.includes('//')) imagePathShape = 'empty-segment-path'
        else {
          imagePathDepth = path === '/' ? 'root' : /^\/[^/]+\/?$/.test(path) ? 'one' :
            /^\/[^/]+\/[^/]+\/?$/.test(path) ? 'two' : 'three-or-more'
          const leaf = path.slice(path.lastIndexOf('/') + 1)
          imagePathShape = path === '/' ? 'root' : path.endsWith('/') ? 'trailing-slash' :
            /\.(?:png|jpe?g|webp|avif|svg|ico|gif|bmp|tiff?|apng|heic|jxl)$/i.test(leaf) ? 'image-suffix' :
            leaf.includes('.') ? 'other-dot-suffix' : 'extensionless'
        }
      }
    }
    else if (target.href === diagnosticSunPoster) sourceId = 'public-english-sun-poster'
  }
  const queryKeys = target ? [...target.searchParams.keys()] : []
  const queryShape = !target ? 'invalid-url' : !target.search ? 'none' :
    queryKeys.length === 1 && queryKeys[0] === '_rsc' && target.searchParams.get('_rsc') ? 'single-rsc' : 'other'
  return { decision,
    method: ['GET','HEAD','POST','PUT','PATCH','DELETE','OPTIONS'].includes(request.method) ? request.method : 'OTHER',
    navigation: request.navigation === true,
    resourceType: ['document','stylesheet','image','media','font','script','xhr','fetch','other'].includes(request.resourceType) ? request.resourceType : 'other',
    prefetch: request.prefetch === true,
    urlScheme: decision === 'private-text' ? 'redacted' : urlScheme,
    category: path.startsWith('/api/') ? 'api' : /\.(?:png|jpe?g|webp|avif|svg|ico|woff2?|wav|mp3|css|js)$/i.test(path) ? 'static-asset' : /^\/(?:en|ru|es)(?:\/|$)/.test(path) ? 'localized-route' : 'other',
    path: decision === 'private-text' ? '[redacted]' : safeDiagnosticPaths.has(path) ? path : '[redacted]',
    sourceId: decision === 'private-text' ? 'redacted' : sourceId,
    routeShape: decision === 'private-text' ? 'redacted' : routeShape,
    imagePathShape: decision === 'private-text' ? 'redacted' : imagePathShape,
    imagePathDepth: decision === 'private-text' ? 'redacted' : imagePathDepth,
    queryShape: decision === 'private-text' ? 'redacted' : queryShape,
    prefetchSignals: {
      purposePrefetch: request.prefetchSignals?.purposePrefetch === true,
      nextRouterPrefetch: request.prefetchSignals?.nextRouterPrefetch === true,
      rsc: request.prefetchSignals?.rsc === true,
    },
  }
}
export async function installPublicJourneyFence(context, origin, sensitive = [], fixtures = {}) {
  const violations = []
  const blockedResources = []
  const requestDiagnostics = []
  let anonymousTalismanReads = 0
  let diagnosticPhase = 'unclassified'
  await context.route('**/*', async route => {
    const request = route.request()
    const headers = request.headers?.() || {}
    const info = { url: request.url(), method: request.method(), body: request.postData() || '',
      navigation: request.isNavigationRequest(), resourceType: request.resourceType?.(),
      prefetch: headers.purpose === 'prefetch' || headers['next-router-prefetch'] === '1',
      prefetchSignals: { purposePrefetch: headers.purpose === 'prefetch',
        nextRouterPrefetch: headers['next-router-prefetch'] === '1', rsc: headers.rsc === '1' } }
    if ((fixtures.reviewedAdvancedRunesImage === true && info.url === origin + reviewedAdvancedRunesPath) ||
        (fixtures.reviewedRemoteSupportIntroImage === true && info.url === origin + reviewedRemoteSupportIntroPath) ||
        (fixtures.browserLocalBlobImages === true && isBrowserLocalBlobImageCandidate(info, origin))) {
      // Inspect header names only for these exact opted-in candidates; fail closed
      // on missing data. Intercepted WebKit allHeaders() is provisional, not proof
      // of absent on-wire cookies. Blob safety rests on its local registry loader.
      info.hasAuthHeaders = true
      info.hasPrefetchHeaders = true
      try {
        const completeHeaders = await request.allHeaders?.()
        if (completeHeaders && typeof completeHeaders === 'object' && !Array.isArray(completeHeaders)) {
          const names = Object.keys(completeHeaders).map(name => name.toLowerCase())
          info.hasAuthHeaders = names.some(name => ['authorization', 'proxy-authorization', 'cookie'].includes(name))
          info.hasPrefetchHeaders = names.some(name => ['purpose', 'sec-purpose', 'next-router-prefetch', 'rsc'].includes(name))
        }
      } catch {}
    }
    const decision = publicJourneyRequestDecision(info, origin, sensitive, fixtures)
    if (decision === 'allow') return route.continue()
    if (decision === 'synthetic-anonymous-talismans') {
      anonymousTalismanReads++
      return route.fulfill({ status: 401, contentType: 'application/json', body: '{"error":"UNAUTHENTICATED"}' })
    }
    // Never save the URL/body: a failing implementation might contain private text.
    if (decision === 'external-resource') blockedResources.push(decision)
    else violations.push(decision)
    if (requestDiagnostics.length < 20) requestDiagnostics.push({ ...publicJourneyRequestDiagnostic(info, decision, origin), phase: diagnosticPhase })
    await route.abort('blockedbyclient')
  })
  return {
    setDiagnosticPhase(phase) { diagnosticPhase = diagnosticJourneyPhases.has(phase) ? phase : 'unclassified' },
    assertNoSideEffects(label) { assert.deepEqual(violations, [], label + ': no private-text, API, write or external navigation attempt; redacted request samples ' + JSON.stringify(requestDiagnostics)) },
    summary() { return { violations: [...violations], blockedExternalResources: blockedResources.length,
      anonymousTalismanReads, requestDiagnostics: [...requestDiagnostics] } },
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
