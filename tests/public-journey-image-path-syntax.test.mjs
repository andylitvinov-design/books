import assert from 'node:assert/strict'
import test from 'node:test'
import { publicJourneyRequestDiagnostic, publicJourneyRequestDecision, installPublicJourneyFence } from '../scripts/helpers/public-journey-verifier.mjs'

const origin = 'http://127.0.0.1:3100'
const request = url => ({ url, method: 'GET', body: '', navigation: false, resourceType: 'image',
  prefetch: false, prefetchSignals: { purposePrefetch: false, nextRouterPrefetch: false, rsc: false } })
const diagnostic = (url, decision = 'unplanned-route') => publicJourneyRequestDiagnostic(request(url), decision, origin)
const syntax = result => [result.imagePathShape, result.imagePathDepth]
const fixtures = [
  ['/', 'root', 'root'],
  ['/PRIVATE_ONE', 'extensionless', 'one'],
  ['/PRIVATE_ONE/PRIVATE_TWO', 'extensionless', 'two'],
  ['/PRIVATE_ONE/PRIVATE_TWO/PRIVATE_THREE', 'extensionless', 'three-or-more'],
  ['/PRIVATE_ONE/PRIVATE_TWO/PRIVATE_THREE/PRIVATE_FOUR', 'extensionless', 'three-or-more'],
  ['/PRIVATE_ONE/', 'trailing-slash', 'one'],
  ['/PRIVATE_ONE/PRIVATE_TWO/', 'trailing-slash', 'two'],
  ['/PRIVATE_ONE/PRIVATE_TWO/PRIVATE_THREE/', 'trailing-slash', 'three-or-more'],
  ['/PRIVATE_ONE.gif', 'image-suffix', 'one'],
  ['/PRIVATE_ONE/PRIVATE_TWO.TIFF', 'image-suffix', 'two'],
  ['/PRIVATE_ONE/PRIVATE_TWO/PRIVATE_THREE.webp', 'image-suffix', 'three-or-more'],
  ['/PRIVATE_ONE/PRIVATE_TWO.PRIVATE_SUFFIX', 'other-dot-suffix', 'two'],
  ['/PRIVATE_ONE.dot/PRIVATE_TWO', 'extensionless', 'two'],
  ['/PRIVATE_ONE//PRIVATE_TWO', 'empty-segment-path', 'unclassified'],
]

test('image syntax uses finite shape/depth buckets, not any unknown literal or source identity', () => {
  for (const [path, shape, depth] of fixtures) {
    const result = diagnostic(origin + path)
    assert.deepEqual(syntax(result), [shape, depth])
    assert.doesNotMatch(JSON.stringify(result), /PRIVATE/)
    if (path !== '/') {
      assert.equal(result.path, '[redacted]')
      assert.equal(result.sourceId, 'unclassified')
      assert.equal(publicJourneyRequestDecision(request(origin + path), origin), 'unplanned-route')
    }
  }
})

test('encoded, non-ASCII and malformed escapes are never decoded, identified or permitted', () => {
  for (const path of ['/PRIVATE_%20ONE', '/PRIVATE_%2fONE', '/PRIVATE_%25ONE', '/PRIVATE_%ZZ', '/Приватное/名字.png', '/PRIVATE_é.png', '/PRIVATE_%2550ATH.png']) {
    const result = diagnostic(origin + path)
    assert.deepEqual(syntax(result), ['nonliteral-path', 'unclassified'])
    assert.equal(result.path, '[redacted]')
    assert.equal(result.sourceId, 'unclassified')
    assert.equal(publicJourneyRequestDecision(request(origin + path), origin), 'unplanned-route')
    assert.doesNotMatch(JSON.stringify(result), /PRIVATE|Приват|名字|é|%|png/)
  }
})

test('trusted origin, credentials, fragments and image type gate the new syntax only', () => {
  for (const url of ['https://foreign.invalid/PRIVATE_ONE/PRIVATE_TWO', 'http://PRIVATE_USER:PRIVATE_PASSWORD@127.0.0.1:3100/PRIVATE_ONE', origin + '/PRIVATE_ONE#PRIVATE_FRAGMENT', 'not a url']) {
    const result = diagnostic(url)
    assert.deepEqual(syntax(result), ['unclassified', 'unclassified'])
    assert.ok(['http', 'https', 'invalid-url'].includes(result.urlScheme))
    assert.doesNotMatch(JSON.stringify({ ...result, urlScheme: undefined }), /PRIVATE|foreign|127|http/)
  }
  assert.deepEqual(syntax(publicJourneyRequestDiagnostic(request(origin + '/PRIVATE_ONE'), 'unplanned-route')), ['unclassified', 'unclassified'])
  for (const resourceType of ['fetch', 'xhr', 'document', 'media', 'other', undefined]) {
    const result = publicJourneyRequestDiagnostic({ ...request(origin + '/api/PRIVATE_ONE'), resourceType }, 'unplanned-route', origin)
    assert.deepEqual(syntax(result), ['unclassified', 'unclassified'])
    assert.equal(publicJourneyRequestDecision({ ...request(origin + '/api/PRIVATE_ONE'), resourceType }, origin), 'unplanned-route')
  }
})

test('private synthetic path/query/body contents keep precedence and redact every new field', () => {
  for (const [url, body] of [[origin + '/PRIVATE_INPUT', ''], [origin + '/%50RIVATE_INPUT', ''], [origin + '/%2550RIVATE_INPUT', ''], [origin + '/unknown?key=PRIVATE_INPUT', ''], [origin + '/unknown', 'PRIVATE_INPUT'], [origin + '/Приватное', '']]) {
    const info = { ...request(url), body }
    const decision = publicJourneyRequestDecision(info, origin, ['PRIVATE_INPUT', 'Приватное'])
    assert.equal(decision, 'private-text')
    const result = publicJourneyRequestDiagnostic(info, decision, origin)
    assert.deepEqual(syntax(result), ['redacted', 'redacted'])
    assert.equal(result.path, '[redacted]')
    assert.equal(result.sourceId, 'redacted')
    assert.equal(result.routeShape, 'redacted')
    assert.equal(result.queryShape, 'redacted')
    assert.doesNotMatch(JSON.stringify(result), /PRIVATE|Приват|unknown|key=|%/)
  }
})

test('query values never enter syntax buckets and exact source labels remain independent', () => {
  for (const suffix of ['', '?PRIVATE_KEY=PRIVATE_VALUE', '?_rsc=PRIVATE_VALUE', '?PRIVATE_KEY=PRIVATE_VALUE&PRIVATE_KEY=PRIVATE_OTHER']) {
    const result = diagnostic(origin + '/PRIVATE_ONE/PRIVATE_TWO.gif' + suffix)
    assert.deepEqual(syntax(result), ['image-suffix', 'two'])
    assert.equal(result.sourceId, 'unclassified')
    assert.doesNotMatch(JSON.stringify(result), /PRIVATE|gif|\?/)
  }
  const icon = diagnostic(origin + '/course-icon/192')
  assert.deepEqual(syntax(icon), ['extensionless', 'two'])
  assert.equal(icon.sourceId, 'public-course-icon-192')
  assert.equal(publicJourneyRequestDecision(request(origin + '/course-icon/192'), origin), 'unplanned-route')
  const media = diagnostic(origin + '/media/PRIVATE_ONE/PRIVATE_TWO.png')
  assert.deepEqual(syntax(media), ['image-suffix', 'three-or-more'])
  assert.equal(media.routeShape, 'media-two-segment-route')
  assert.equal(media.sourceId, 'unclassified')
  assert.equal(publicJourneyRequestDecision(request(origin + '/media/PRIVATE_ONE/PRIVATE_TWO.png'), origin), 'unplanned-route')
})

test('syntax collection preserves fatal unknowns, external separation, private redaction and 20-sample bound', async () => {
  let callback
  const actions = []
  const fence = await installPublicJourneyFence({ route: async (_, fn) => { callback = fn } }, origin, ['PRIVATE_INPUT'])
  const send = async url => callback({ request: () => ({ url: () => url, method: () => 'GET', postData: () => '',
    isNavigationRequest: () => false, resourceType: () => 'image', headers: () => ({}) }),
    continue: async () => assert.fail('syntax is never permission'), fulfill: async () => assert.fail('no fabricated data'),
    abort: async value => actions.push(value) })
  await send(origin + '/%50RIVATE_INPUT')
  for (let i = 0; i < 25; i++) await send(origin + '/PRIVATE_' + i)
  await send('https://foreign.invalid/PRIVATE_IMAGE.gif')
  const summary = fence.summary()
  assert.equal(actions.length, 27)
  assert.ok(actions.every(value => value === 'blockedbyclient'))
  assert.equal(summary.violations.length, 26)
  assert.equal(summary.blockedExternalResources, 1)
  assert.equal(summary.anonymousTalismanReads, 0)
  assert.equal(summary.requestDiagnostics.length, 20)
  assert.deepEqual(syntax(summary.requestDiagnostics[0]), ['redacted', 'redacted'])
  assert.ok(summary.requestDiagnostics.slice(1).every(item => item.imagePathShape === 'extensionless' && item.imagePathDepth === 'one'))
  assert.doesNotMatch(JSON.stringify(summary), /PRIVATE|foreign|gif|%/)
  assert.throws(() => fence.assertNoSideEffects('unknown stays fatal'), /no private-text, API, write or external navigation/)
})
