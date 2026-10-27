import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import vm from 'node:vm'
import ts from 'typescript'
import { publicJourneyRequestDecision, publicJourneyRequestDiagnostic, installPublicJourneyFence } from '../scripts/helpers/public-journey-verifier.mjs'
const origin = 'http://127.0.0.1:3100'
const asset = '/academy/reiki-yggdrasil/source/basic-program.jpg'
const alias = 'public-remote-support-intro-basic-program'
const option = { reviewedRemoteSupportIntroImage: true }
const read = path => readFileSync(new URL('../' + path, import.meta.url))
const source = path => read(path).toString('utf8')
const info = (extra = {}) => ({ url: origin + asset, method: 'GET', body: '', navigation: false, resourceType: 'image',
  hasAuthHeaders: false, hasPrefetchHeaders: false, prefetch: false,
  prefetchSignals: { purposePrefetch: false, nextRouterPrefetch: false, rsc: false }, ...extra })
const decide = (request = info(), fixtures = option, sensitive = [], ownOrigin = origin) =>
  publicJourneyRequestDecision(request, ownOrigin, sensitive, fixtures)
const deny = () => assert.fail('No events, provider, repository or metadata operations')
const jsx = (type, props = {}) => typeof type === 'function' ? type(props) : { type, props }
const compile = (path, modules) => {
  const result = ts.transpileModule(source(path), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX }, reportDiagnostics: true })
  assert.deepEqual(result.diagnostics.filter(d => d.category === ts.DiagnosticCategory.Error), [])
  const exports = {}
  vm.runInNewContext(result.outputText, { exports, require: name => {
    assert.ok(Object.hasOwn(modules, name), 'Closed inert imports: ' + name); return modules[name]
  } }, { timeout: 1000 })
  return exports
}

test('verified public JPEG is the sole declared background of the rendered remote intro', async () => {
  const bytes = read('public' + asset)
  assert.equal(createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex'), '517f9dd756f8964c8bf116c7684ccb13ba394ff9')
  assert.equal(bytes.length, 103744)
  assert.equal(bytes.subarray(0, 3).toString('hex'), 'ffd8ff')
  const css = source('components/remote-energy-support-booking.module.css')
  assert.deepEqual([...css.matchAll(/url\(\s*(['"]?)([^)'"\s]+)\1\s*\)/g)].map(match => match[2]), [asset])
  assert.match(css, /\.intro\{[^}]*url\('\/academy\/reiki-yggdrasil\/source\/basic-program\.jpg'\)/)
  class SyntheticAppError extends Error { constructor(code, status) { super(code); this.status = status } }
  const config = compile('lib/app/config.js', { '../billing/config.js': { getBillingConfig: deny },
    '../billing/manual-config.js': { manualBillingConfig: deny }, '../assessments/contracts.js': { AppError: SyntheticAppError } })
  const env = { CI: 'true', NODE_ENV: 'production' }
  assert.throws(() => config.getAppConfig(env), error => error.message === 'APP_UNAVAILABLE' && error.status === 503)
  const bookingAst = ts.createSourceFile('booking.tsx', source('components/remote-energy-support-booking.tsx'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const stateNames = []
  const visitState = node => {
    if (ts.isVariableDeclaration(node) && ts.isArrayBindingPattern(node.name) && ts.isCallExpression(node.initializer) && node.initializer.expression.getText() === 'useState') stateNames.push(node.name.elements[0].name.getText())
    ts.forEachChild(node, visitState)
  }
  visitState(bookingAst)
  assert.equal(stateNames.filter(name => name === 'showResults').length, 1)
  const showResultsIndex = stateNames.indexOf('showResults')
  const common = { 'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'Fragment' }, 'next/link': { default: 'a' } }
  for (const locale of ['en', 'ru', 'es']) for (const showResults of [false, true]) {
    let hookIndex = 0, repositoryCalls = 0, reviewCalls = 0
    const booking = compile('components/remote-energy-support-booking.tsx', { ...common,
      'next/navigation': { useRouter: () => ({ push: deny }) },
      '@/lib/practitioners/taoist-talismans': compile('lib/practitioners/taoist-talismans.js', {}),
      react: { useEffect: () => {}, useMemo: fn => fn(), useState: initial => {
        const index = hookIndex++; return [index === showResultsIndex ? showResults : typeof initial === 'function' ? initial() : initial, deny]
      } },
      '@/lib/practitioners/remote-energy-support': { REMOTE_SUPPORT_DRAFT_KEY: 'SYNTHETIC_KEY', REMOTE_SUPPORT_DURATIONS: [10,20,30,60],
        stageRemoteSupportPrivateIntention: deny, takeRemoteSupportLandingIntention: deny },
      './remote-energy-support-booking.module.css': { default: new Proxy({}, { get: (_, name) => String(name) }) },
    })
    let configurationReads = 0
    const directory = compile('lib/practitioners/public-remote-support-masters.ts', {
      '@/lib/app/config': { getAppConfig: () => { configurationReads++; return config.getAppConfig(env) } },
      '@/lib/practitioners/repository': { createPractitionerRepository: () => { repositoryCalls++; deny() } },
      '@/lib/practitioners/reviews': { createServiceReviewRepository: () => { reviewCalls++; deny() } },
    })
    const page = compile('app/[locale]/services/remote-energy-support/page.tsx', { ...common,
      'next/navigation': { notFound: deny }, '@/components/public-site-header': { PublicSiteHeader: 'SharedHeaderNotExecuted' },
      '@/data/academy/catalog': { isPublicLocale: value => ['en','ru','es'].includes(value) },
      '@/data/site-metadata': { metadataBaseFor: deny },
      '@/lib/practitioners/public-remote-support-masters': directory,
      '@/components/remote-energy-support-booking': booking,
    })
    const rendered = await page.default({ params: Promise.resolve({ locale }), searchParams: Promise.resolve({}) })
    let images = 0, intros = 0, empty = 0
    const visit = node => { if (Array.isArray(node)) return node.forEach(visit); if (!node || typeof node !== 'object') return
      if (node.type === 'img') images++
      if (node.type === 'header' && node.props.className === 'intro') intros++
      if (node.props?.role === 'status') empty++
      visit(node.props?.children)
    }
    visit(rendered)
    assert.deepEqual([images, intros, empty, repositoryCalls, reviewCalls], [0, 1, 1, 0, 0])
    assert.equal(configurationReads, 1, 'Real extracted directory must reach unavailable config before repository access')
    assert.equal(hookIndex, stateNames.length, 'Named state mapping must cover the actual rendered booking component')
  }
})

test('only master opts into the exact declared asset; default and other fixture flags stay closed', () => {
  const text = source('scripts/verify-holistic-master-browser.mjs')
  const ast = ts.createSourceFile('master.mjs', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS)
  const calls = []
  const visit = node => { if (ts.isCallExpression(node) && node.expression.getText() === 'installPublicJourneyFence') calls.push(node); ts.forEachChild(node, visit) }
  visit(ast)
  assert.equal(calls.length, 1)
  assert.equal(calls[0].arguments[3].getText(), '{anonymousTalismans:true,browserLocalBlobImages:engine === webkit,reviewedRemoteSupportIntroImage:true}')
  assert.match(text, /assertPublicJourneyRuntime\(origin\)/)
  assert.match(text, /serviceWorkers:\s*"block"/)
  assert.equal((text.match(/await page\.reload\(/g) || []).length, 1)
  for (const other of ['scripts/verify-holistic-topics-browser.mjs', 'scripts/verify-business-quiz-mobile.mjs', 'scripts/verify-contact-channel-chooser-browser.mjs'])
    assert.doesNotMatch(source(other), /reviewedRemoteSupportIntroImage/)
  assert.equal(decide(), 'allow')
  for (const fixtures of [{}, { anonymousTalismans: true }, { reviewedAdvancedRunesImage: true }, { browserLocalBlobImages: true },
    ...[false, undefined, null, 0, 1, 'true', [], {}].map(reviewedRemoteSupportIntroImage => ({ reviewedRemoteSupportIntroImage }))])
    assert.equal(decide(info(), fixtures), 'unplanned-route')
})

test('method, resource, body, navigation, credential and prefetch evidence must be explicit', () => {
  const changes = [
    ...['HEAD','POST','PUT','PATCH','DELETE','OPTIONS','get',undefined].map(method => ({ method })),
    ...['fetch','xhr','document','media','other',undefined].map(resourceType => ({ resourceType })),
    ...['PRIVATE_BODY',undefined,null,0,false].map(body => ({ body })),
    ...[true,undefined,null,0].map(navigation => ({ navigation })),
    ...['hasAuthHeaders','hasPrefetchHeaders','prefetch'].flatMap(key => [true,undefined,null,0].map(value => ({ [key]: value }))),
    { prefetchSignals: undefined },
    ...['purposePrefetch','nextRouterPrefetch','rsc'].flatMap(key => [true,undefined,null,0].map(value =>
      ({ prefetchSignals: { ...info().prefetchSignals, [key]: value } }))),
  ]
  for (const change of changes) assert.notEqual(decide(info(change)), 'allow')
  for (const key of Object.keys(info())) { const request = info(); delete request[key]; assert.notEqual(decide(request), 'allow') }
})

test('exact own-origin raw path excludes every query, fragment, normalization and neighboring asset', () => {
  const urls = [origin + asset + '?', origin + asset + '#', origin + asset + '?q=PRIVATE_QUERY', origin + asset + '#PRIVATE_FRAGMENT',
    origin + asset + '/', origin + asset + '\n', ' ' + origin + asset, origin + asset.replace('basic', 'ba\tsic'),
    origin + asset.replace('/source/', '/source/./'), origin + asset.replace('/source/', '/source/%2e/'),
    origin + asset.replace('/source/', '/source/x/../'), origin + asset.replace('/source/', '//source/'),
    origin + asset.replace('basic', '%62asic'), origin + asset.replace('basic', 'BASIC'),
    origin + asset.replace('basic', 'ｂasic'), origin + asset.replaceAll('/', '\\'),
    origin.replace('127.0.0.1', '@127.0.0.1') + asset, origin.replace('127.0.0.1', 'user:pass@127.0.0.1') + asset,
    origin.replace(':3100', ':03100') + asset, origin.replace(':3100', ':3101') + asset,
    origin.replace('127.0.0.1', 'localhost') + asset, 'https://example.invalid' + asset,
    origin + asset.replace('basic-program', 'program-overview'), origin + asset.replace('basic-program.jpg', 'advanced-runes.png'),
    origin + '/api/unknown.jpg', origin + '/media/unknown/file.jpg', 'data:image/jpeg,PRIVATE_DATA',
  ]
  for (const url of urls) assert.notEqual(decide(info({ url })), 'allow')
  for (const ownOrigin of ['https://example.invalid','https://127.0.0.1:3100','http://localhost:03100','http://localhost:80','http://localhost:3100/'])
    assert.notEqual(decide(info({ url: ownOrigin + asset }), option, [], ownOrigin), 'allow')
  assert.equal(decide(info({ url: 'http://localhost:3100' + asset }), option, [], 'http://localhost:3100'), 'allow')
})

test('fixed alias identifies only exact raw public literal and never replaces private-first gates', () => {
  const diagnosis = publicJourneyRequestDiagnostic(info(), 'unplanned-route', origin)
  assert.equal(diagnosis.sourceId, alias)
  assert.equal(diagnosis.path, '[redacted]')
  assert.equal(decide(info(), {}), 'unplanned-route')
  for (const url of [origin + asset + '?', origin + asset + '#', origin + asset + '?x=PRIVATE_VALUE',
    origin + asset.replace('basic', '%62asic'), 'https://example.invalid' + asset]) {
    const diagnostic = publicJourneyRequestDiagnostic(info({ url }), 'unplanned-route', origin)
    assert.equal(diagnostic.sourceId, 'unclassified')
    assert.doesNotMatch(JSON.stringify(diagnostic), /PRIVATE|basic-program\.jpg|https?:\/\//)
  }
  for (const [request, sensitive] of [[info(), ['basic-program']], [info({ body: 'PRIVATE_BODY' }), ['PRIVATE_BODY']],
    [info({ body: '%2550RIVATE_BODY' }), ['PRIVATE_BODY']], [info({ url: origin + asset + '?q=%50RIVATE_QUERY' }), ['PRIVATE_QUERY']]]) {
    const decision = decide(request, option, sensitive)
    assert.equal(decision, 'private-text')
    const diagnostic = publicJourneyRequestDiagnostic(request, decision, origin)
    assert.equal(diagnostic.sourceId, 'redacted')
    assert.doesNotMatch(JSON.stringify(diagnostic), /PRIVATE|basic-program|https?:\/\//)
  }
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

test('exact image continues without overrides only with available credential-free header evidence', async () => {
  const result = await replay({ completeHeaders: { accept: 'image/*' } })
  assert.deepEqual(result.actions, [['continue', []]])
  assert.equal(result.headerReads, 1)
  assert.deepEqual(result.summary, { violations: [], blockedExternalResources: 0, anonymousTalismanReads: 0, requestDiagnostics: [] })
  result.fence.assertNoSideEffects('synthetic exact public asset')
  for (const settings of [{ missing: true }, { throws: true }, ...[undefined,null,[],'PRIVATE_HEADER',0].map(completeHeaders => ({ completeHeaders }))]) {
    const denied = await replay(settings)
    assert.deepEqual(denied.actions, [['abort', ['blockedbyclient']]])
    assert.deepEqual(denied.summary.violations, ['unplanned-route'])
    assert.equal(denied.summary.requestDiagnostics[0].sourceId, alias)
  }
})

test('auth, proxy-auth, consent/auth cookies and prefetch headers fail closed in every casing', async () => {
  for (const name of ['authorization','proxy-authorization','cookie','purpose','sec-purpose','next-router-prefetch','rsc'])
    for (const key of [name,name.toUpperCase(),name[0].toUpperCase()+name.slice(1)])
      for (const value of ['', 'PRIVATE_HEADER']) {
        const result = await replay({ completeHeaders: { [key]: value } })
        assert.deepEqual(result.actions, [['abort', ['blockedbyclient']]])
        assert.deepEqual(result.summary.violations, ['unplanned-route'])
        assert.equal(result.headerReads, 1)
        assert.throws(() => result.fence.assertNoSideEffects('synthetic denied header'))
        assert.doesNotMatch(JSON.stringify(result.summary), /PRIVATE_HEADER|basic-program\.jpg|https?:\/\//)
      }
})

test('defaults, URL variants, unknown images/APIs/media and private body remain fatal', async () => {
  for (const settings of [{ fixtures: {} }, { fixtures: { reviewedRemoteSupportIntroImage: false } },
    { requestInfo: info({ url: origin + asset + '?' }) }, { requestInfo: info({ url: origin + '/unknown/image.jpg' }) },
    { requestInfo: info({ url: origin + '/api/unknown' }) }, { requestInfo: info({ url: origin + '/media/unknown/image.jpg' }) }]) {
    const result = await replay(settings)
    assert.deepEqual(result.actions, [['abort', ['blockedbyclient']]])
    assert.equal(result.headerReads, 0)
    assert.throws(() => result.fence.assertNoSideEffects('synthetic unplanned route'))
  }
  const result = await replay({ requestInfo: info({ body: 'PRIVATE_BODY' }), sensitive: ['PRIVATE_BODY'] })
  assert.deepEqual(result.summary.violations, ['private-text'])
  assert.equal(result.summary.requestDiagnostics[0].sourceId, 'redacted')
  assert.deepEqual(result.actions, [['abort', ['blockedbyclient']]])
})
