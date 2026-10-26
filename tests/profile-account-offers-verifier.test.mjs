import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const sources = {
  profile: read('components/app/profile-domains.jsx'),
  hub: read('app/[locale]/services/free-consultation/page.tsx'),
  offers: read('components/free-diagnosis-offers.tsx'),
  development: read('components/app/development-program.jsx'),
}
const denied = () => assert.fail('No report/store/transport/browser action in inert source fixture')
const jsx = (type, props = {}) => ({ type, props })
const nodes = tree => Array.isArray(tree) ? tree.flatMap(nodes) : tree && typeof tree === 'object' ? [tree, ...nodes(tree.props?.children)] : []
const plain = value => JSON.parse(JSON.stringify(value))
const style = { default: new Proxy({}, { get: (_, key) => String(key) }) }
const icons = new Proxy({}, { get: (_, name) => 'icon-' + String(name) })
function mutate(source, from, to) {
  assert.equal(source.split(from).length - 1, 1, 'one exact source mutation')
  return source.replace(from, to)
}
function compile(source, fileName, modules) {
  const parsed = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true)
  assert.equal(parsed.parseDiagnostics.length, 0, 'source syntax valid')
  const output = ts.transpileModule(source, { fileName: fileName.replace(/\.mjs$/, '.js'), compilerOptions: {
    jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
  } }).outputText
  const exports = {}
  runInNewContext(output, { exports, Intl, URL, console, fetch: denied, window: { location: { hash: '' } },
    require(name) { assert.ok(Object.hasOwn(modules, name), 'unapproved dependency: ' + name); return modules[name] },
  }, { timeout: 1000 })
  return exports
}
function hooks() {
  const slots = []; let index = 0, pending = []
  return { reset() { index = 0; pending = [] }, settle() { pending.forEach(fn => fn()) }, react: {
    useState(initial) { const i = index++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial; return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value }] },
    useRef(initial) { const i = index++; return slots[i] ||= { current: initial } },
    useEffect(fn) { index++; pending.push(fn) },
  } }
}
function renderProfile({ locale = 'en', source = sources.profile } = {}) {
  const h = hooks()
  const DevelopmentBoundary = 'development-program-boundary'
  const modules = {
    react: h.react, 'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'fragment' },
    'next/link': { default: 'a' }, 'next/dynamic': { default: () => DevelopmentBoundary }, 'lucide-react': icons,
    '@/lib/documents/recommendation': { recommendationItemType: denied },
    '@/lib/profile/profile-service-offers': { PROFILE_AREAS: ['psychology', 'homeopathy', 'wu_xing', 'hypnotherapy'], profileServiceOffer: denied },
    '@/lib/profile/report-summary': { availableSavedReports: list => { assert.equal(list.length, 0); return [] }, latestReceivedReport: list => { assert.equal(list.length, 0); return null } },
    './profile-domains.css': {}, './profile-refresh.css': {},
  }
  const { ProfileDomains } = compile(source, 'profile-domains.jsx', modules)
  const props = { locale, mode: 'account', accountId: 'synthetic-account-only', reportsContent: jsx('div', { 'data-inert-reports': true }) }
  h.reset(); ProfileDomains(props); h.settle(); h.reset()
  const tree = ProfileDomains(props)
  // Dynamic module is inert: no saved goals/store API. Its real JSX marker is
  // checked separately below; this is source linkage, never rendered CSS proof.
  const boundary = nodes(tree).find(node => node.type === DevelopmentBoundary)
  assert.ok(boundary); assert.equal(boundary.props.accountId, 'synthetic-account-only'); assert.equal(boundary.props.locale, locale)
  boundary.type = 'section'; boundary.props = { ...boundary.props, 'data-testid': 'reports-development-program' }
  return tree
}
async function renderHub({ locale = 'en', hubSource = sources.hub, offerSource = sources.offers } = {}) {
  const h = hooks()
  const { FreeDiagnosisOffers } = compile(offerSource, 'free-diagnosis-offers.tsx', {
    react: h.react, 'react/jsx-runtime': { jsx, jsxs: jsx }, 'next/image': { default: 'img' },
    'next/navigation': { usePathname: () => '/' + locale + '/services/free-consultation' }, 'lucide-react': icons,
    '@/components/contact-channel-chooser': { ContactChannelChooser: denied },
    '@/lib/whatsapp-enquiry': { whatsappEnquiryUrl: denied }, './free-diagnosis-offers.module.css': style,
  })
  const { default: Hub } = compile(hubSource, 'page.tsx', {
    'react/jsx-runtime': { jsx, jsxs: jsx }, 'next/link': { default: 'a' }, 'next/navigation': { notFound: denied }, 'lucide-react': icons,
    '@/components/public-site-header': { PublicSiteHeader: 'inert-public-header' }, '@/components/static-portrait': { StaticPortrait: 'inert-portrait' },
    '@/components/free-diagnosis-offers': { FreeDiagnosisOffers }, '@/components/personal-testimonials': { PersonalTestimonials: 'inert-testimonials' },
    '@/data/site-metadata': { metadataBaseFor: denied }, '@/lib/public-locales': { publicLocales: ['en', 'ru', 'es'] }, './free-consultation.module.css': style,
  })
  const tree = await Hub({ params: Promise.resolve({ locale }) })
  for (const node of nodes(tree)) if (node.type === FreeDiagnosisOffers) { h.reset(); const rendered = FreeDiagnosisOffers(node.props); node.type = rendered.type; node.props = rendered.props }
  return tree
}

for (const locale of ['en', 'ru']) test(locale + ' actual account JSX contains current offerings and no legacy service panels', () => {
  const all = nodes(renderProfile({ locale }))
  const root = all.find(node => node.props['data-profile-domains'] !== undefined)
  assert.equal(root.props['data-profile-mode'], 'account'); assert.equal(root.props['data-profile-interactive'], 'true')
  assert.equal(all.filter(node => /hh-domain-(more|tabs|support)/.test(node.props.className || '') || node.props['data-profile-service-cta']).length, 0)
  const offers = all.filter(node => node.props['data-consultation-kind'] === 'free-options')
  assert.equal(offers.length, 1); assert.equal(offers[0].type, 'a'); assert.equal(offers[0].props.href, '/' + locale + '/services/free-consultation')
  assert.equal(all.find(node => node.props['data-health-labs-link'] !== undefined).props.href, '/' + locale + '/app/labs')
  assert.match(sources.development, /return <section id="hh-development-program" className=\{styles.root\} data-testid="reports-development-program">/)
})
for (const locale of ['en', 'ru']) test(locale + ' real public hub expands actual three-option JSX without contact providers', async () => {
  const all = nodes(await renderHub({ locale }))
  assert.equal(all.filter(node => node.props['data-free-consultation-hub'] !== undefined).length, 1)
  assert.deepEqual(all.filter(node => node.type === 'article').map(node => node.props['data-diagnosis-offer']), ['situation-written-free', 'wu-xing-free', 'personal-session-30-eur50'])
  assert.deepEqual(all.filter(node => node.props['data-diagnosis-order']).map(node => node.props['data-diagnosis-order']), ['situation-written-free', 'wu-xing-free', 'personal-session-30-eur50'])
  assert.equal(all.find(node => node.props['data-diagnosis-order-form'] !== undefined).props['data-open'], 'false')
  assert.equal(all.filter(node => node.props.role === 'dialog').length, 0)
})

function matches(node, selector) {
  const tag = selector.match(/^[a-z][\w-]*/)?.[0]
  if (tag && node.type !== tag) return false
  for (const match of selector.matchAll(/\.([\w-]+)/g)) if (!(node.props.className || '').split(/\s+/).includes(match[1])) return false
  for (const match of selector.matchAll(/\[([\w-]+)(?:="([^"]*)")?\]/g)) {
    if (!Object.hasOwn(node.props, match[1])) return false
    if (match[2] !== undefined && String(node.props[match[1]]) !== match[2]) return false
  }
  return true
}
function locator(roots) {
  const unique = list => [...new Set(list)]
  return { roots,
    locator(selector) {
      const alternatives = selector.split(/,\s*/).flatMap(part => {
        let found = roots
        for (const fragment of part.split(/\s+/)) found = unique(found.flatMap(nodes).filter(node => matches(node, fragment)))
        return found
      })
      return locator(unique(alternatives))
    },
    getByRole(role) { return locator(roots.flatMap(nodes).filter(node => node.props.role === role)) },
    async getAttribute(name) { assert.equal(roots.length, 1); return roots[0].props[name] ?? null },
  }
}
function expectation(target) {
  return {
    async toHaveURL(url) { assert.equal(target.url, url) },
    async toHaveCount(count) { assert.equal(target.roots.length, count) },
    async toBeVisible() { assert.equal(target.roots.length, 1); assert.notEqual(target.roots[0].props.hidden, true); assert.notEqual(target.roots[0].props.style?.display, 'none') },
    async toHaveAttribute(name, value) { assert.equal(target.roots.length, 1); assert.equal(String(target.roots[0].props[name]), value) },
  }
}
async function exercise({ locale = 'en', profileSource, hubSource, offerSource, alterProfile = () => {}, alterHub = () => {}, origin = 'http://127.0.0.1:3100', cleanupFailure = false, navigationFailure = false } = {}) {
  const profile = renderProfile({ locale, source: profileSource })
  const hub = await renderHub({ locale, hubSource, offerSource })
  alterProfile(profile); alterHub(hub)
  const calls = []
  const browser = Object.freeze({ synthetic: true })
  const page = { ...locator([profile]), url: origin + '/' + locale + '/app/portrait' }
  const isolatedPage = { ...locator([hub]), url: '', async goto(url) { calls.push('goto'); this.url = url; if (navigationFailure) throw Error('primary-navigation-failure') } }
  const helper = read('scripts/helpers/profile-account-offers-verifier.mjs')
  const { verifyAccountProfileOffers } = compile(helper, 'profile-account-offers-verifier.mjs', {
    'node:assert/strict': { default: assert },
    './free-review-viewport-isolation.mjs': { async createFreeReviewViewportIsolation(actualBrowser, options) {
      assert.equal(actualBrowser, browser)
      assert.deepEqual(plain(options), { origin, locale, viewport: { width: 390, height: 844 }, mobile: false })
      calls.push('create')
      return { page: isolatedPage, async assertClean() { calls.push('clean') }, async close() { calls.push('close'); if (cleanupFailure) throw Error('cleanup-failure') } }
    } },
  })
  try { await verifyAccountProfileOffers(page, expectation, { origin, browser, locale }) }
  catch (error) { error.fixtureCalls = calls; throw error }
  assert.deepEqual(calls, ['create', 'goto', 'clean', 'close'])
  assert.equal(page.url, origin + '/' + locale + '/app/portrait', 'original signed-in page was never navigated')
}
for (const locale of ['en', 'ru']) test(locale + ' actual helper accepts actual account/hub JSX in separate inert context', () => exercise({ locale }))

const find = (tree, attribute) => nodes(tree).find(node => Object.hasOwn(node.props, attribute))
const failures = [
  ['missing account marker', tree => { delete find(tree, 'data-profile-mode').props['data-profile-mode'] }],
  ['unhydrated account', tree => { find(tree, 'data-profile-interactive').props['data-profile-interactive'] = 'false' }],
  ['hidden account', tree => { tree.props.hidden = true }],
  ['legacy panel reintroduced', tree => { tree.props.children.push(jsx('details', { className: 'hh-domain-more' })) }],
  ['missing archive', tree => { delete find(tree, 'data-profile-report-archive').props['data-profile-report-archive'] }],
  ['hidden consultation', tree => { find(tree, 'data-consultation-kind').props.hidden = true }],
  ['wrong consultation path', tree => { find(tree, 'data-consultation-kind').props.href = '/en/services/alchemy-of-soul' }],
  ['foreign consultation origin', tree => { find(tree, 'data-consultation-kind').props.href = 'https://example.invalid/en/services/free-consultation' }],
  ['private selector query', tree => { find(tree, 'data-consultation-kind').props.href += '?selector=synthetic' }],
  ['private secret fragment', tree => { find(tree, 'data-consultation-kind').props.href += '#synthetic-secret' }],
  ['wrong labs destination', tree => { find(tree, 'data-health-labs-link').props.href = '/en/app/tests' }],
  ['missing development boundary', tree => { delete nodes(tree).find(node => node.props['data-testid'] === 'reports-development-program').props['data-testid'] }],
]
for (const [name, alterProfile] of failures) test('rejects ' + name + ' before public context creation', async () => {
  await assert.rejects(exercise({ alterProfile }), error => { assert.deepEqual(error.fixtureCalls, []); return true })
})
const hubFailures = [
  ['missing hub', tree => { delete find(tree, 'data-free-consultation-hub').props['data-free-consultation-hub'] }],
  ['hidden options', tree => { find(tree, 'data-free-diagnosis-options').props.hidden = true }],
  ['compact options instead of full', tree => { find(tree, 'data-free-diagnosis-layout').props['data-free-diagnosis-layout'] = 'compact' }],
  ['wrong offer identity', tree => { find(tree, 'data-diagnosis-offer').props['data-diagnosis-offer'] = 'retired' }],
  ['wrong order association', tree => { find(tree, 'data-diagnosis-order').props['data-diagnosis-order'] = 'wrong' }],
  ['hidden order', tree => { find(tree, 'data-diagnosis-order').props.hidden = true }],
  ['open request form', tree => { find(tree, 'data-diagnosis-order-form').props['data-open'] = 'true' }],
  ['unexpected dialog', tree => { find(tree, 'data-diagnosis-order-form').props.role = 'dialog' }],
]
for (const [name, alterHub] of hubFailures) test('rejects ' + name + ' and closes isolated context', async () => {
  await assert.rejects(exercise({ alterHub }), error => { assert.deepEqual(error.fixtureCalls, ['create', 'goto', 'close']); return true })
})
test('rejects production origin before context creation', () => assert.rejects(exercise({ origin: 'https://holistichouse.vercel.app' }), error => { assert.deepEqual(error.fixtureCalls, []); return true }))
test('does not swallow cleanup failure', () => assert.rejects(exercise({ cleanupFailure: true }), /cleanup-failure/))
test('preserves primary failure over cleanup failure', () => assert.rejects(exercise({ navigationFailure: true, cleanupFailure: true }), /primary-navigation-failure/))
test('actual source wrong consultation mutation fails helper', () => exercise({ profileSource: mutate(sources.profile, "href={'/' + locale + '/services/free-consultation'}", "href={'/' + locale + '/services/retired'}") }).then(() => assert.fail('mutation accepted'), error => { assert.deepEqual(error.fixtureCalls, []) }))
test('actual source wrong hub marker mutation fails helper and cleans up', () => exercise({ hubSource: mutate(sources.hub, 'data-free-consultation-hub>', 'data-retired-hub>') }).then(() => assert.fail('mutation accepted'), error => { assert.deepEqual(error.fixtureCalls, ['create', 'goto', 'close']) }))
test('actual source missing offer mutation fails helper and cleans up', () => exercise({ offerSource: mutate(sources.offers, 'data-diagnosis-offer={offer.id}', 'data-retired-offer={offer.id}') }).then(() => assert.fail('mutation accepted'), error => { assert.deepEqual(error.fixtureCalls, ['create', 'goto', 'close']) }))

test('duplicate account scope fails before any public context', async () => {
  await assert.rejects(exercise({ alterProfile(tree) { tree.props.children.push(jsx('section', { 'data-profile-domains': true, 'data-profile-mode': 'account', 'data-profile-interactive': 'true' })) } }), error => { assert.deepEqual(error.fixtureCalls, []); return true })
})
test('duplicate current consultation fails before any public context', async () => {
  await assert.rejects(exercise({ alterProfile(tree) { const wrap = find(tree, 'data-profile-free-consultation'); wrap.props.children.push(jsx('a', { ...find(tree, 'data-consultation-kind').props })) } }), error => { assert.deepEqual(error.fixtureCalls, []); return true })
})
test('duplicate hub offer fails exact three-card count', async () => {
  await assert.rejects(exercise({ alterHub(tree) { const offer = find(tree, 'data-diagnosis-offer'); const container = nodes(tree).find(node => Array.isArray(node.props.children) && node.props.children.includes(offer)); container.props.children.push(jsx('article', { ...offer.props })) } }), error => { assert.deepEqual(error.fixtureCalls, ['create', 'goto', 'close']); return true })
})
test('actual App invokes awaited current account helper and retains separate legacy coverage', async () => {
  const app = read('scripts/verify-app-r1.mjs')
  const ast = ts.createSourceFile('verify-app-r1.mjs', app, ts.ScriptTarget.Latest, true)
  const calls = [], imports = []
  function visit(node) {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'verifyAccountProfileOffers') calls.push(node)
    if (ts.isImportDeclaration(node) && node.moduleSpecifier.text === './helpers/profile-account-offers-verifier.mjs') imports.push(node)
    ts.forEachChild(node, visit)
  }
  visit(ast)
  assert.equal(imports.length, 1); assert.equal(calls.length, 1)
  assert.equal(imports[0].getText(ast), "import { verifyAccountProfileOffers } from './helpers/profile-account-offers-verifier.mjs'")
  assert.ok(app.includes("passed('account Profile exposes current consultation options; isolated read-only href-follow verifies destination, not same-tab signed-in navigation')"))
  const legacyStart = app.indexOf(' const profileOfferCases=')
  const legacyEnd = app.indexOf(' await verifyAccountProfileOffers(page,expect,{origin,browser})', legacyStart)
  assert.ok(legacyStart > 0 && legacyEnd > legacyStart)
  assert.equal(createHash('sha256').update(app.slice(legacyStart, legacyEnd)).digest('hex'), '0a95f90acfa64aae90c0c8d1cda735385e7a54d1a7ab92f0855f7ded071d43f9', 'independent pinned legacy function/cases remain byte-identical')
  const call = calls[0]
  assert.ok(ts.isAwaitExpression(call.parent), 'current account verifier must be awaited')
  assert.equal(call.getText(ast), 'verifyAccountProfileOffers(page,expect,{origin,browser})')
  assert.ok(call.pos > app.indexOf("passed('supported SDK PKCE callback opens private reports"))
  assert.ok(call.end < app.indexOf("await page.goto(origin+'/en/app/monitoring')"))
  const argumentsSeen = []
  const page = {}, expect = {}, browser = {}, origin = 'http://127.0.0.1:3100'
  const invoke = new Function('verifyAccountProfileOffers', 'page', 'expect', 'origin', 'browser', 'return (async () => {' + call.parent.getText(ast) + '})()')
  await invoke(async (...args) => { argumentsSeen.push(args) }, page, expect, origin, browser)
  assert.deepEqual(argumentsSeen, [[page, expect, { origin, browser }]])
  assert.equal((app.match(/await verifyProfileServiceOffers\(clientPage,'en','legacy'\)/g) || []).length, 1)
  assert.equal((app.match(/await verifyProfileServiceOffers\(page\)/g) || []).length, 0)
  assert.match(app, /\['homeopathy','psychohomeopathy','homeopathy'\]/)
  assert.match(app, /assert\.equal\(url\.origin,'https:\/\/wa\.me'\)/)
  assert.match(app, /assert\.equal\(url\.pathname,'\/14376066502'\)/)
  assert.match(app, /assert\.ok\(!url\.searchParams\.get\('text'\)\?\.includes\('\/client\/'\)\)/)
})
