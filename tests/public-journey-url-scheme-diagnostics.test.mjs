import assert from 'node:assert/strict'
import test from 'node:test'
import { publicJourneyRequestDiagnostic, publicJourneyRequestDecision, installPublicJourneyFence } from '../scripts/helpers/public-journey-verifier.mjs'
const origin = 'http://127.0.0.1:3100'
const info = url => ({ url, method: 'GET', body: '', navigation: false, resourceType: 'image', prefetch: false,
  prefetchSignals: { purposePrefetch: false, nextRouterPrefetch: false, rsc: false } })
const diagnostic = (url, decision = 'unplanned-route') => publicJourneyRequestDiagnostic(info(url), decision, origin)

test('URL schemes use a fixed vocabulary without protocol-specific payloads or arbitrary names', () => {
  for (const [url, scheme] of [
    [origin + '/PRIVATE_PATH', 'http'], ['https://foreign.invalid/PRIVATE_PATH', 'https'],
    ['blob:' + origin + '/PRIVATE_UUID', 'blob'], ['BLOB:' + origin + '/PRIVATE_UUID', 'blob'],
    ['data:image/png;base64,PRIVATE_BYTES', 'data'], ['file:///PRIVATE_FILE', 'other'],
    ['PRIVATE-SCHEME:PRIVATE_PAYLOAD', 'other'], ['about:PRIVATE_PAGE', 'other'], ['PRIVATE_INVALID', 'invalid-url'],
  ]) {
    const result = diagnostic(url)
    assert.equal(result.urlScheme, scheme)
    assert.doesNotMatch(JSON.stringify(result), /PRIVATE|foreign|127\.0\.0\.1|base64|file:|about:/)
  }
})

test('same-origin blob and doubled HTTP paths remain distinguishable but equally unplanned', () => {
  const blob = 'blob:' + origin + '/PRIVATE_UUID'
  const doubled = origin + '//PRIVATE_PATH'
  assert.equal(new URL(blob).origin, origin)
  assert.equal(new URL(blob).pathname.includes('//'), true)
  for (const [url, scheme] of [[blob, 'blob'], [doubled, 'http']]) {
    const decision = publicJourneyRequestDecision(info(url), origin)
    assert.equal(decision, 'unplanned-route')
    const result = diagnostic(url, decision)
    assert.equal(result.urlScheme, scheme)
    assert.equal(result.imagePathShape, 'empty-segment-path')
    assert.equal(result.category, 'other')
    assert.equal(result.sourceId, 'unclassified')
    assert.equal(result.path, '[redacted]')
  }
  // Empty-segment shape alone does not describe the suffix; the old category is independent.
  const image = diagnostic(origin + '//PRIVATE_PATH.webp')
  assert.equal(image.urlScheme, 'http')
  assert.equal(image.imagePathShape, 'empty-segment-path')
  assert.equal(image.category, 'static-asset')
})

test('scheme labels never give blobs/data/unknown protocols public-source identity or permissions', () => {
  for (const url of ['blob:' + origin + '/course-icon/192', 'blob:' + origin + '/images/PRIVATE_IMAGE.png',
    'blob:https://foreign.invalid/PRIVATE_UUID', 'blob:null/PRIVATE_UUID', 'data:image/png;base64,PRIVATE_BYTES',
    'PRIVATE-SCHEME://' + origin.slice(7) + '/PRIVATE_PATH']) {
    const result = diagnostic(url)
    assert.equal(result.sourceId, 'unclassified')
    assert.notEqual(publicJourneyRequestDecision(info(url), origin), 'allow')
    assert.doesNotMatch(JSON.stringify(result), /PRIVATE|foreign|base64|png|192/)
  }
})

test('known private markers in every URL scheme or body retain first precedence and redaction', () => {
  for (const url of [origin + '/PRIVATE_INPUT', 'blob:' + origin + '/%50RIVATE_INPUT',
    'data:text/plain,%2550RIVATE_INPUT', 'https://foreign.invalid/PRIVATE_INPUT', 'private-scheme:PRIVATE_INPUT', 'PRIVATE_INPUT']) {
    const request = info(url)
    const decision = publicJourneyRequestDecision(request, origin, ['PRIVATE_INPUT'])
    assert.equal(decision, 'private-text')
    const result = publicJourneyRequestDiagnostic(request, decision, origin)
    assert.equal(result.urlScheme, 'redacted')
    assert.equal(result.path, '[redacted]')
    assert.equal(result.imagePathShape, 'redacted')
    assert.equal(result.imagePathDepth, 'redacted')
    assert.doesNotMatch(JSON.stringify(result), /PRIVATE|foreign|private-scheme|%/)
  }
  const request = { ...info('blob:' + origin + '/PRIVATE_UUID'), body: 'PRIVATE_INPUT' }
  assert.equal(publicJourneyRequestDiagnostic(request, publicJourneyRequestDecision(request, origin, ['PRIVATE_INPUT']), origin).urlScheme, 'redacted')
})

test('credentials, fragments and query contents never leak through the scheme enum', () => {
  for (const url of ['http://PRIVATE_USER:PRIVATE_PASSWORD@127.0.0.1:3100/PRIVATE_PATH?PRIVATE_KEY=PRIVATE_VALUE#PRIVATE_FRAGMENT',
    'blob:' + origin + '/PRIVATE_UUID?PRIVATE_KEY=PRIVATE_VALUE#PRIVATE_FRAGMENT',
    'data:text/plain,PRIVATE_BYTES?PRIVATE_KEY=PRIVATE_VALUE#PRIVATE_FRAGMENT']) {
    const result = diagnostic(url)
    assert.ok(['http', 'blob', 'data'].includes(result.urlScheme))
    assert.doesNotMatch(JSON.stringify(result), /PRIVATE|127\.0\.0\.1|plain|BYTES|PASSWORD/)
  }
})

test('bounded scheme evidence preserves aborts, fatal unknowns, external separation and sample cap', async () => {
  let callback
  const actions = []
  const fence = await installPublicJourneyFence({ route: async (_, handler) => { callback = handler } }, origin, ['PRIVATE_INPUT'])
  const send = async url => callback({ request: () => ({ url: () => url, method: () => 'GET', postData: () => '',
    isNavigationRequest: () => false, resourceType: () => 'image', headers: () => ({}) }),
    continue: async () => assert.fail('scheme is not permission'), fulfill: async () => assert.fail('no fabricated data'),
    abort: async value => actions.push(value) })
  await send('blob:' + origin + '/PRIVATE_INPUT')
  for (let i = 0; i < 25; i++) await send('blob:' + origin + '/PRIVATE_UUID_' + i)
  await send('data:image/png;base64,PRIVATE_BYTES')
  await send('https://foreign.invalid/PRIVATE_IMAGE.png')
  const summary = fence.summary()
  assert.equal(actions.length, 28)
  assert.ok(actions.every(value => value === 'blockedbyclient'))
  assert.equal(summary.violations.length, 26)
  assert.equal(summary.blockedExternalResources, 2)
  assert.equal(summary.anonymousTalismanReads, 0)
  assert.equal(summary.requestDiagnostics.length, 20)
  assert.equal(summary.requestDiagnostics[0].urlScheme, 'redacted')
  assert.ok(summary.requestDiagnostics.slice(1).every(item => item.urlScheme === 'blob'))
  assert.doesNotMatch(JSON.stringify(summary), /PRIVATE|foreign|base64|127\.0\.0\.1/)
  assert.throws(() => fence.assertNoSideEffects('unknown remains fatal'), /no private-text, API, write or external navigation/)
})
