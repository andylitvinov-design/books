import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import vm from 'node:vm'
import ts from 'typescript'
import { publicJourneyRequestDecision, publicJourneyRequestDiagnostic, installPublicJourneyFence } from '../scripts/helpers/public-journey-verifier.mjs'
const origin = 'http://127.0.0.1:3100'
const asset = '/academy/reiki-yggdrasil/source/advanced-runes.png'
const option = { reviewedAdvancedRunesImage: true }
const read = path => readFileSync(new URL('../' + path, import.meta.url))
const source = path => read(path).toString('utf8')
const info = (extra = {}) => ({ url: origin + asset, method: 'GET', body: '', navigation: false, resourceType: 'image',
  hasAuthHeaders: false, hasPrefetchHeaders: false, prefetch: false,
  prefetchSignals: { purposePrefetch: false, nextRouterPrefetch: false, rsc: false }, ...extra })
const decide = (request, fixtures = option, sensitive = []) => publicJourneyRequestDecision(request, origin, sensitive, fixtures)
const compile = (path, modules, sourceOverride = source(path), globals = {}) => {
  const result = ts.transpileModule(sourceOverride, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX }, reportDiagnostics: true })
  assert.deepEqual(result.diagnostics.filter(item => item.category === ts.DiagnosticCategory.Error), [])
  const exports = {}
  vm.runInNewContext(result.outputText, { exports, URL, ...globals, require: name => { assert.ok(Object.hasOwn(modules, name), 'inert import: ' + name); return modules[name] } }, { timeout: 1000 })
  return exports
}

test('exact pinned public PNG is rendered by authored public topic source, not a dynamic/client asset', () => {
  const bytes = read('public' + asset)
  assert.equal(createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex'), '8f9beaa9f18110308b0344a433a56c8fabb0b862')
  assert.equal(bytes.length, 100523)
  assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a')
  assert.deepEqual([bytes.readUInt32BE(16), bytes.readUInt32BE(20)], [348, 341])
  const jsx = (type, props = {}) => typeof type === 'function' ? type(props) : { type, props }
  const render = (locale, sourceOverride = source('components/holistic-support-topic-filter.tsx')) => {
    const effects = [], listeners = new Map()
    const window = {
      addEventListener(name, listener) { assert.equal(name, 'hh-support-order-open'); assert.equal(listeners.has(name), false); listeners.set(name, listener) },
      removeEventListener(name, listener) { assert.equal(listeners.get(name), listener); listeners.delete(name) },
    }
    const component = compile('components/holistic-support-topic-filter.tsx', {
      'react/jsx-runtime': { jsx, jsxs: jsx }, react: {
        useState: initial => [typeof initial === 'function' ? initial() : initial, () => assert.fail('no events')],
        useEffect: effect => effects.push(effect),
      },
      'next/image': { default: 'img' }, 'next/link': { default: 'a' },
      'lucide-react': { ArrowRight: 'ArrowRight', BriefcaseBusiness: 'BriefcaseBusiness', Heart: 'Heart', HeartPulse: 'HeartPulse' },
      './holistic-support-topic-filter.module.css': { default: {} },
      './holistic-inline-support-order': { HolisticInlineSupportOrder() {
        assert.fail('Unopened inline order is outside public poster provenance')
      } },
    }, sourceOverride, { window })
    const tree = component.HolisticSupportTopicFilter({ locale })
    assert.equal(effects.length, 2, 'Commit both actual coordination and default scroll effects')
    const cleanup = effects[0]()
    assert.equal(typeof cleanup, 'function'); assert.equal(listeners.size, 1)
    listeners.get('hh-support-order-open')({ detail: { source: 'topics' } })
    assert.equal(effects[1](), undefined)
    cleanup(); assert.equal(listeners.size, 0)
    return tree
  }
  for (const locale of ['en', 'ru', 'es']) {
    const images = []
    const visit = node => { if (Array.isArray(node)) return node.forEach(visit); if (!node || typeof node !== 'object') return;
      if (node.type === 'img') images.push(node.props.src); visit(node.props?.children) }
    visit(render(locale))
    assert.equal(images.length, 3)
    assert.equal(images[1], asset)
  }
  const topicSource = source('components/holistic-support-topic-filter.tsx')
  const closedOrder = 'useState<SupportRequestKind | null>(null)'
  assert.equal(topicSource.split(closedOrder).length - 1, 1)
  assert.throws(() => render('en', topicSource.replace(closedOrder, "useState<SupportRequestKind | null>('talisman')")),
    /Unopened inline order is outside public poster provenance/)
  const guard = 'if (!orderKind) return;'
  assert.equal(topicSource.split(guard).length - 1, 1)
  assert.throws(() => render('en', topicSource.replace(guard, '')), /document is not defined/)
  assert.match(source('components/ideas-discovery.module.css'), /background-image:url\("\/academy\/reiki-yggdrasil\/source\/advanced-runes\.png"\)/)
})

test('sole reviewed Business caller opts in explicitly; defaults and truthy lookalikes stay closed', () => {
  const ast = ts.createSourceFile('caller.mjs', source('scripts/verify-business-quiz-mobile.mjs'), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS)
  const calls = []
  const visit = node => { if (ts.isCallExpression(node) && node.expression.getText() === 'installPublicJourneyFence') calls.push(node); ts.forEachChild(node, visit) }
  visit(ast)
  assert.equal(calls.length, 1)
  assert.deepEqual(calls[0].arguments.map(arg => arg.getText()), ['context', 'origin', '[]', '{reviewedAdvancedRunesImage:true}'])
  assert.equal(decide(info()), 'allow')
  for (const fixtures of [{}, { anonymousTalismans: true }, { reviewedAdvancedRunesImage: false }, { reviewedAdvancedRunesImage: 'true' }, { reviewedAdvancedRunesImage: 1 }])
    assert.equal(decide(info(), fixtures), 'unplanned-route')
})

test('method, resource, body, navigation, auth, prefetch and missing evidence cannot broaden the exact grant', () => {
  const requests = [
    ...['HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'get'].map(method => info({ method })),
    ...['fetch', 'xhr', 'document', 'media', 'other', undefined].map(resourceType => info({ resourceType })),
    info({ body: 'PRIVATE_BODY' }), info({ body: undefined }), info({ navigation: true }), info({ navigation: undefined }),
    info({ hasAuthHeaders: true }), info({ hasAuthHeaders: undefined }), info({ hasAuthHeaders: 0 }),
    info({ hasPrefetchHeaders: true }), info({ hasPrefetchHeaders: undefined }), info({ prefetch: true }), info({ prefetch: undefined }),
    info({ prefetchSignals: undefined }),
    ...['purposePrefetch', 'nextRouterPrefetch', 'rsc'].map(key => info({ prefetchSignals: { ...info().prefetchSignals, [key]: true } })),
  ]
  for (const key of ['body', 'navigation', 'hasAuthHeaders', 'hasPrefetchHeaders']) { const missing = info(); delete missing[key]; requests.push(missing) }
  for (const request of requests) assert.notEqual(decide(request), 'allow')
})

test('only exact raw same-origin literal admits: normalized, encoded, query, fragment and neighboring paths stay closed', () => {
  const urls = [
    origin + asset + '?', origin + asset + '#', origin + asset + '?x=PRIVATE_QUERY', origin + asset + '#PRIVATE_FRAGMENT',
    origin + '/academy/reiki-yggdrasil/source/./advanced-runes.png', origin + '/academy/reiki-yggdrasil/source/%2e/advanced-runes.png',
    origin + '/academy/reiki-yggdrasil/source/x/../advanced-runes.png', origin + asset.replace('advanced', '%61dvanced'),
    origin + asset.replace('advanced', 'advancéd'), origin + asset.replace('advanced', '%2561dvanced'),
    origin + asset.replaceAll('/', '\\'), ' ' + origin + asset, origin + asset + '\n', origin + '/\tacademy/reiki-yggdrasil/source/advanced-runes.png',
    'http://@127.0.0.1:3100' + asset, 'http://PRIVATE_USER:PRIVATE_PASSWORD@127.0.0.1:3100' + asset,
    'http://127.0.0.1:03100' + asset, 'http://localhost:3100' + asset, 'https://foreign.invalid' + asset,
    origin + asset + '/', origin + asset + '/private', origin + asset.replace('advanced-runes', 'program-overview'),
    origin + asset.replace('.png', '.jpg'), origin + '/media/PRIVATE_SERIES/PRIVATE_IMAGE.png', origin + '/api/PRIVATE_ENDPOINT',
  ]
  for (const url of urls) assert.notEqual(decide(info({ url })), 'allow')
})

test('decoded synthetic sensitive path/query/body markers retain private-first precedence and no new logging', () => {
  assert.equal(decide(info(), option, ['advanced-runes']), 'private-text')
  for (const request of [info({ url: origin + asset + '?note=%50RIVATE_INPUT' }), info({ url: origin + '/%2550RIVATE_INPUT' }), info({ body: 'PRIVATE_INPUT' })]) {
    const decision = decide(request, option, ['PRIVATE_INPUT'])
    assert.equal(decision, 'private-text')
    const diagnostic = publicJourneyRequestDiagnostic(request, decision, origin)
    assert.equal(diagnostic.path, '[redacted]')
    assert.equal(diagnostic.imagePathShape, 'redacted')
    assert.equal(diagnostic.imagePathDepth, 'redacted')
    assert.doesNotMatch(JSON.stringify(diagnostic), /PRIVATE|note=|%|\.png/)
    assert.ok(!Object.hasOwn(diagnostic, 'hasAuthHeaders') && !Object.hasOwn(diagnostic, 'hasPrefetchHeaders'))
  }
})

async function replay({ fixtures = option, fullHeaders = {}, fullHeadersMode = 'present', request = info(), sensitive = [] } = {}) {
  let callback, completeReads = 0
  const actions = []
  const fence = await installPublicJourneyFence({ route: async (_, fn) => { callback = fn } }, origin, sensitive, fixtures)
  const object = { url: () => request.url, method: () => request.method, postData: () => request.body,
    isNavigationRequest: () => request.navigation, resourceType: () => request.resourceType, headers: () => ({}) }
  if (fullHeadersMode !== 'missing') object.allHeaders = async () => { completeReads++; if (fullHeadersMode === 'throws') throw Error('PRIVATE_HEADER_ERROR'); return fullHeadersMode === 'undefined' ? undefined : fullHeaders }
  await callback({ request: () => object, continue: async () => actions.push('continue'),
    abort: async value => actions.push('abort:' + value), fulfill: async () => assert.fail('no response fabrication') })
  return { actions, summary: fence.summary(), completeReads, assertNoSideEffects: fence.assertNoSideEffects }
}

test('complete header evidence is mandatory and case-insensitive, including cookie/consent and empty-present auth', async () => {
  const clean = await replay({ fullHeaders: { accept: 'image/*', 'user-agent': 'SYNTHETIC' } })
  assert.deepEqual(clean.actions, ['continue']); assert.equal(clean.completeReads, 1)
  assert.deepEqual(clean.summary, { violations: [], blockedExternalResources: 0, anonymousTalismanReads: 0, requestDiagnostics: [] })
  clean.assertNoSideEffects('verified public PNG only')
  for (const name of ['authorization', 'Authorization', 'AUTHORIZATION', 'Proxy-Authorization', 'COOKIE', 'cookie',
    'Purpose', 'SEC-Purpose', 'Next-Router-Prefetch', 'RSC']) for (const value of ['', 'PRIVATE_AUTH_OR_CONSENT']) {
    const result = await replay({ fullHeaders: { [name]: value } })
    assert.deepEqual(result.actions, ['abort:blockedbyclient'])
    assert.deepEqual(result.summary.violations, ['unplanned-route'])
    assert.doesNotMatch(JSON.stringify(result.summary), /PRIVATE|AUTHORIZATION|Authorization|COOKIE|Proxy|Purpose|Sec-/)
    assert.throws(() => result.assertNoSideEffects('credential or prefetch stays fatal'))
  }
  for (const settings of [{ fullHeadersMode: 'missing' }, { fullHeadersMode: 'throws' }, { fullHeadersMode: 'undefined' }, { fullHeaders: null }, { fullHeaders: false }, { fullHeaders: [] }, { fullHeaders: 'PRIVATE_HEADERS' }]) {
    assert.deepEqual((await replay(settings)).actions, ['abort:blockedbyclient'])
  }
})

test('default/other requests never inspect full headers; no API/media/external expansion and private stays fatal', async () => {
  for (const settings of [{ fixtures: {} }, { request: info({ url: origin + '/api/PRIVATE_ENDPOINT' }) },
    { request: info({ url: origin + '/media/PRIVATE_SERIES/PRIVATE_IMAGE.png' }) },
    { request: info({ url: 'https://foreign.invalid' + asset }) }]) {
    const result = await replay({ ...settings, fullHeadersMode: 'throws' })
    assert.equal(result.completeReads, 0)
    assert.deepEqual(result.actions, ['abort:blockedbyclient'])
  }
  const privateResult = await replay({ sensitive: ['advanced-runes'] })
  assert.deepEqual(privateResult.actions, ['abort:blockedbyclient'])
  assert.deepEqual(privateResult.summary.violations, ['private-text'])
})

test('public asset cannot reach admin refresh or canonical-host migration in pinned source', async () => {
  const auth = compile('lib/app/admin-auth-refresh.js', { '@supabase/ssr': { createServerClient: () => assert.fail('provider forbidden') } })
  const result = await auth.refreshAdminAuth({ url: origin + asset, cookies: { getAll: () => assert.fail('no cookie/client read') } },
    { environment: new Proxy({}, { get: () => assert.fail('no provider configuration read') }), createClient: () => assert.fail('provider forbidden') })
  assert.equal(result.length, 0)
  const canonical = compile('lib/canonical-redirect.js', { '../data/site-metadata.js': { canonicalSiteUrl: 'https://canonical.invalid' } })
  assert.equal(canonical.canonicalRedirectTarget(origin + asset, 'GET'), undefined)
  assert.equal(canonical.privateMigrationBridge(origin + asset, 'SYNTHETIC'), undefined)
})
