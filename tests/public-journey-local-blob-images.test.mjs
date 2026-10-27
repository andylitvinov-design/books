import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { publicJourneyRequestDecision, publicJourneyRequestDiagnostic, installPublicJourneyFence } from '../scripts/helpers/public-journey-verifier.mjs'

const origin = 'http://127.0.0.1:3100'
const uuid = '12345678-1234-4abc-8abc-123456789abc'
const objectUrl = 'blob:' + origin + '/' + uuid
const option = { browserLocalBlobImages: true }
const info = (extra = {}) => ({ url: objectUrl, method: 'GET', body: '', navigation: false, resourceType: 'image',
  prefetch: false, prefetchSignals: { purposePrefetch: false, nextRouterPrefetch: false, rsc: false },
  hasAuthHeaders: false, hasPrefetchHeaders: false, ...extra })
const decide = (request = info(), fixtures = option, sensitive = [], ownOrigin = origin) =>
  publicJourneyRequestDecision(request, ownOrigin, sensitive, fixtures)
const source = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('only the two guarded anonymous callers opt in, by exact WebKit engine identity', () => {
  for (const name of ['master', 'topics']) {
    const text = source('scripts/verify-holistic-' + name + '-browser.mjs')
    const ast = ts.createSourceFile(name + '.mjs', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS)
    const calls = []
    const visit = node => { if (ts.isCallExpression(node) && node.expression.getText() === 'installPublicJourneyFence') calls.push(node); ts.forEachChild(node, visit) }
    visit(ast)
    assert.equal(calls.length, 1)
    const fixture = calls[0].arguments[3]
    assert.equal(fixture.getText(), name === 'master' ?
      '{anonymousTalismans:true,browserLocalBlobImages:engine === webkit,reviewedRemoteSupportIntroImage:true}' :
      '{anonymousTalismans:true,browserLocalBlobImages:engine === webkit}')
    const properties = fixture.properties
    assert.equal(properties.length, name === 'master' ? 3 : 2)
    const expression = properties[1].initializer.getText()
    assert.equal(expression, 'engine === webkit')
    const webkit = {}, chromium = {}
    assert.equal(vm.runInNewContext(expression, { engine: webkit, webkit }, { timeout: 100 }), true)
    for (const engine of [chromium, undefined, null, 'webkit', { name: () => 'webkit' }])
      assert.equal(vm.runInNewContext(expression, { engine, webkit }, { timeout: 100 }), false)
    assert.match(text, /assertPublicJourneyRuntime\(origin\)/)
    assert.match(text, /serviceWorkers:\s*"block"/)
    assert.match(text, /browser\.new(?:Context|Page)\(/)
    assert.doesNotMatch(text, /storageState\s*:|addCookies\s*\(|setInputFiles\s*\(/)
    assert.match(text, name === 'master' ? /synthetic anonymous gallery exposes no private image or upload form/ :
      /no private gallery contents or upload operations in guest QA/)
  }
  assert.doesNotMatch(source('scripts/verify-business-quiz-mobile.mjs'), /browserLocalBlobImages/)
  assert.doesNotMatch(source('scripts/verify-contact-channel-chooser-browser.mjs'), /browserLocalBlobImages/)
})

test('explicit opt-in admits only canonical local UUIDv4 image reads; defaults and truthy flags stay closed', () => {
  for (const ownOrigin of [origin, 'http://localhost:3100', 'http://127.0.0.1:4200'])
    assert.equal(decide(info({ url: 'blob:' + ownOrigin + '/' + uuid }), option, [], ownOrigin), 'allow')
  for (const variant of ['8', '9', 'a', 'b'])
    assert.equal(decide(info({ url: objectUrl.replace('-8abc-', '-' + variant + 'abc-') })), 'allow')
  for (const fixtures of [{}, { anonymousTalismans: true }, { reviewedAdvancedRunesImage: true },
    ...[false, undefined, null, 0, 1, 'true', [], {}].map(browserLocalBlobImages => ({ browserLocalBlobImages }))])
    assert.equal(decide(info(), fixtures), 'unplanned-route')
})

test('request evidence must be explicit GET image with no body/navigation/credentials/prefetch', () => {
  const changes = [
    ...['HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'get', undefined].map(method => ({ method })),
    ...['fetch', 'xhr', 'document', 'media', 'other', 'script', undefined].map(resourceType => ({ resourceType })),
    ...['PRIVATE_BODY', undefined, null, false, 0].map(body => ({ body })),
    ...[true, undefined, null, 0].map(navigation => ({ navigation })),
    ...['hasAuthHeaders', 'hasPrefetchHeaders', 'prefetch'].flatMap(key => [true, undefined, null, 0].map(value => ({ [key]: value }))),
    { prefetchSignals: undefined },
    ...['purposePrefetch', 'nextRouterPrefetch', 'rsc'].flatMap(key => [true, undefined, null, 0].map(value =>
      ({ prefetchSignals: { ...info().prefetchSignals, [key]: value } }))),
  ]
  for (const change of changes) assert.notEqual(decide(info(change)), 'allow')
  for (const key of Object.keys(info())) { const request = info(); delete request[key]; assert.notEqual(decide(request), 'allow') }
})

test('raw object URL and origin cannot normalize, encode or smuggle a different destination', () => {
  const urls = [
    objectUrl + '?', objectUrl + '#', objectUrl + '?q=PRIVATE_QUERY', objectUrl + '#PRIVATE_FRAGMENT',
    objectUrl + '/', objectUrl + '/x', objectUrl + '\n', objectUrl + '\r', objectUrl + '\u2028',
    ' ' + objectUrl, '\t' + objectUrl, objectUrl.replace('12345678', '1234\t5678'),
    objectUrl.toUpperCase(), objectUrl.replace('blob:', 'Blob:'), objectUrl.replace('8abc', '8ABC'),
    objectUrl.replace('4abc', '3abc'), objectUrl.replace('8abc', 'cabc'), objectUrl.replaceAll('-', ''),
    objectUrl.replace(uuid, '00000000-0000-0000-0000-000000000000'),
    objectUrl.replace('12345678', '%311234567'), objectUrl.replace('12345678', '１２３４５６７８'),
    objectUrl.replace('/' + uuid, '//'+uuid), objectUrl.replace('/' + uuid, '/./'+uuid),
    objectUrl.replace('/' + uuid, '/x/../'+uuid), objectUrl.replace('/' + uuid, '/%2e/'+uuid),
    objectUrl.replace('/' + uuid, '\\'+uuid), objectUrl.replace('127.0.0.1', '@127.0.0.1'),
    objectUrl.replace('127.0.0.1', 'user:pass@127.0.0.1'), objectUrl.replace(':3100', ':03100'),
    objectUrl.replace(':3100', ':3101'), objectUrl.replace('127.0.0.1', 'localhost'),
    objectUrl.replace('127.0.0.1', '127.0.0.2'), objectUrl.replace('http:', 'https:'),
    'blob:null/' + uuid, 'blob:blobinternal:///' + uuid, 'blob:' + objectUrl,
    'blob:https://example.invalid/' + uuid, 'data:image/svg+xml,PRIVATE_DATA',
  ]
  for (const url of urls) assert.notEqual(decide(info({ url })), 'allow')
  for (const ownOrigin of ['http://127.0.0.1:03100', 'http://localhost:80', 'http://localhost:65536',
    'http://localhost:3100/', 'http://localhost:3100?', 'http://localhost:3100#', 'http://localhost:3100\n',
    'https://localhost:3100', 'http://example.invalid:3100', 'http://127.0.0.2:3100'])
    assert.notEqual(decide(info({ url: 'blob:' + ownOrigin + '/' + uuid }), option, [], ownOrigin), 'allow')
})

test('private markers precede local-image permission and diagnostics never emit URL tokens or payloads', () => {
  for (const request of [info(), info({ body: 'PRIVATE_BODY' }), info({ url: objectUrl + '?q=%50RIVATE_QUERY' })]) {
    const sensitive = [uuid, 'PRIVATE_BODY', 'PRIVATE_QUERY']
    const decision = decide(request, option, sensitive)
    assert.equal(decision, 'private-text')
    const diagnostic = publicJourneyRequestDiagnostic(request, decision, origin)
    assert.equal(diagnostic.urlScheme, 'redacted')
    assert.equal(diagnostic.sourceId, 'redacted')
    assert.doesNotMatch(JSON.stringify(diagnostic), /12345678|PRIVATE|127\.0|localhost|https?:\/\//)
  }
  const diagnostic = publicJourneyRequestDiagnostic(info(), 'allow', origin)
  assert.equal(diagnostic.urlScheme, 'blob')
  assert.equal(diagnostic.sourceId, 'unclassified')
  assert.equal(diagnostic.path, '[redacted]')
  assert.doesNotMatch(JSON.stringify(diagnostic), /12345678|127\.0|localhost|https?:\/\//)
})

async function replay(settings = {}) {
  const { requestInfo = info(), fixtures = option, headers = {}, sensitive = [], missing = false, throws = false } = settings
  const completeHeaders = Object.hasOwn(settings, 'completeHeaders') ? settings.completeHeaders : {}
  let callback, headerReads = 0
  const actions = []
  const fence = await installPublicJourneyFence({ route: async (_, fn) => { callback = fn } }, origin, sensitive, fixtures)
  const request = { url: () => requestInfo.url, method: () => requestInfo.method, postData: () => requestInfo.body,
    isNavigationRequest: () => requestInfo.navigation, resourceType: () => requestInfo.resourceType,
    headers: () => headers, allHeaders: async () => { headerReads++; if (throws) throw new Error('PRIVATE_HEADER'); return completeHeaders } }
  if (missing) delete request.allHeaders
  await callback({ request: () => request, continue: (...args) => actions.push(['continue', args]),
    abort: (...args) => actions.push(['abort', args]), fulfill: (...args) => actions.push(['fulfill', args]) })
  return { actions, headerReads, summary: fence.summary(), fence }
}

test('local continuation has no overrides, body/content read or header forwarding', async () => {
  const result = await replay({ completeHeaders: { accept: 'image/*', 'User-Agent': 'SYNTHETIC_AGENT' } })
  assert.deepEqual(result.actions, [['continue', []]])
  assert.equal(result.headerReads, 1)
  assert.deepEqual(result.summary, { violations: [], blockedExternalResources: 0, anonymousTalismanReads: 0, requestDiagnostics: [] })
  result.fence.assertNoSideEffects('synthetic local image')
})

test('credential and prefetch header presence fails closed, including case and empty values', async () => {
  for (const name of ['authorization', 'proxy-authorization', 'cookie', 'purpose', 'sec-purpose', 'next-router-prefetch', 'rsc'])
    for (const key of [name, name.toUpperCase(), name[0].toUpperCase() + name.slice(1)])
      for (const value of ['', 'PRIVATE_HEADER']) {
        const result = await replay({ completeHeaders: { [key]: value } })
        assert.deepEqual(result.actions, [['abort', ['blockedbyclient']]])
        assert.deepEqual(result.summary.violations, ['unplanned-route'])
        assert.equal(result.headerReads, 1)
        assert.throws(() => result.fence.assertNoSideEffects('synthetic negative'))
        assert.doesNotMatch(JSON.stringify(result.summary), /PRIVATE|12345678|127\.0|https?:\/\//)
      }
  for (const setting of [{ missing: true }, { throws: true }, ...[undefined, null, [], 'PRIVATE_HEADER', 0].map(completeHeaders => ({ completeHeaders }))]) {
    const result = await replay(setting)
    assert.deepEqual(result.actions, [['abort', ['blockedbyclient']]])
  }
})

test('header collection stays inside canonical opted-in image candidates and private abort stays fatal', async () => {
  for (const setting of [
    { fixtures: {} }, { fixtures: { browserLocalBlobImages: false } },
    { requestInfo: info({ url: objectUrl + '?' }) }, { requestInfo: info({ method: 'HEAD' }) },
    { requestInfo: info({ body: 'PRIVATE_BODY' }) }, { requestInfo: info({ navigation: true }) },
    { requestInfo: info({ resourceType: 'media' }) }, { headers: { purpose: 'prefetch' } },
    { requestInfo: info({ url: origin + '/unknown.png' }) },
  ]) {
    const result = await replay(setting)
    assert.equal(result.headerReads, 0)
    assert.deepEqual(result.actions, [['abort', ['blockedbyclient']]])
  }
  const result = await replay({ sensitive: [uuid] })
  assert.deepEqual(result.actions, [['abort', ['blockedbyclient']]])
  assert.deepEqual(result.summary.violations, ['private-text'])
  assert.doesNotMatch(JSON.stringify(result.summary), /12345678|127\.0|https?:\/\//)
})

test('unknown HTTP images, API/media and other schemes remain blocked with the new option', async () => {
  const urls = [origin + '/academy/reiki-yggdrasil/source/basic-program.jpg',
    origin + '/academy/reiki-yggdrasil/source/program-overview.jpg', origin + '/api/unknown',
    origin + '/media/unknown/file.png', origin + '/unknown.png',
    'data:image/png,PRIVATE_DATA', 'blob:https://example.invalid/' + uuid]
  for (const url of urls) {
    assert.equal(decide(info({ url })), decide(info({ url }), {}))
    assert.notEqual(decide(info({ url })), 'allow')
    const result = await replay({ requestInfo: info({ url }) })
    assert.deepEqual(result.actions, [['abort', ['blockedbyclient']]])
    assert.equal(result.headerReads, 0)
  }
  const advanced = info({ url: origin + '/academy/reiki-yggdrasil/source/advanced-runes.png' })
  assert.equal(decide(advanced), 'unplanned-route')
  assert.equal(decide(advanced, { reviewedAdvancedRunesImage: true }), 'allow')
  assert.equal(decide(advanced, { ...option, reviewedAdvancedRunesImage: true }), 'allow')
})
