import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { renderSpanishNavigation, treeNodes, treeText } from './helpers/es-public-navigation-fixture.mjs'
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const source = read('scripts/verify-es-public-site.mjs')
const helper = source.slice(source.indexOf('async function assertSpanishHomeAlternates('), source.indexOf('// Exact approved public hero'))
assert.ok(helper.includes('toHaveCount(1)'))
const home = 'https://holistichouse.vercel.app'
const correct = { en: [home], ru: [home + '/ru'] }
function checkAlternates(values) {
  const page = { locator(selector) { const lang = selector.match(/hreflang="(.*?)"/)[1]; return values[lang] || [] } }
  const expect = actual => ({ async toHaveCount(count) { assert.equal(actual.length, count) }, async toHaveAttribute(name, expected) { assert.equal(name, 'href'); assert.equal(actual[0], expected) } })
  return new Function('expect', `${helper}; return assertSpanishHomeAlternates`)(expect)(page)
}
test('actual Spanish-home verifier requires unique exact canonical language destinations', async () => {
  await checkAlternates(correct)
  for (const bad of [
    { ...correct, en: [home + '/?lang=en'] },
    { ...correct, ru: [home + '/?lang=ru'] },
    { ...correct, en: [home + '/en'] },
    { ...correct, ru: [home] },
    { ...correct, en: [] },
    { ...correct, ru: [home + '/ru', home + '/ru'] },
    { ...correct, en: ['https://example.invalid'] },
  ]) await assert.rejects(checkAlternates(bad))
})
const start = source.indexOf("        await navigate('/');")
const end = source.indexOf('        if(!live)', start)
const fragment = source.slice(start, end)
assert.ok(start > 0 && end > start)
async function checkNavigation({ rootLocale = 'en', englishPath = '/' } = {}) {
  let url, locale
  const actions = []
  const page = { locator: selector => { assert.equal(selector, 'html'); return { kind: 'html' } } }
  const expect = actual => ({
    async toHaveURL(expected) { assert.equal(actual, page); assert.equal(url, expected) },
    async toHaveAttribute(name, expected) { assert.equal(actual.kind, 'html'); assert.equal(name, 'lang'); assert.equal(locale, expected) },
  })
  const navigate = async path => { actions.push(['navigate', path]); url = home + path; locale = rootLocale }
  const chooseLanguage = async lang => { actions.push(['choose', lang]); url = home + (lang === 'en' ? englishPath : '/' + lang); locale = lang }
  await new Function('page','expect','navigate','chooseLanguage','origin', `return (async()=>{${fragment}})()`)(page,expect,navigate,chooseLanguage,home)
  assert.deepEqual(actions, [['navigate','/'],['choose','es'],['choose','en'],['choose','es']])
}
test('actual navigation block preserves explicit ES/EN switching and rejects legacy or wrong-language home', async () => {
  await checkNavigation()
  await assert.rejects(checkNavigation({ rootLocale: 'es' }))
  await assert.rejects(checkNavigation({ englishPath: '/?lang=en' }))
  await assert.rejects(checkNavigation({ englishPath: '/ru' }))
})
test('canonical runtime contract and remaining privacy/language checks are retained', () => {
  assert.match(read('lib/public-locales.ts'), /return locale === 'en' \? '\/' : `\/\$\{locale\}`/)
  assert.match(read('middleware.ts'), /const pageLocale = pathname === '\/' \? 'en'/)
  assert.match(source, /cookie.name==='holistic_house_public_locale'\)\?\.value\)\.toBe\('es'\)/)
  assert.match(source, /Client-entry language counterparts must not load before selection/)
  assert.match(source, /unsupported Spanish private locale visibly renders 404 with noindex and no cabinet/)
  assert.match(source, /assert\.deepEqual\(errors,\[\]\)/)
})

// The native browser verifier remains authoritative for rendered visibility,
// keyboard behavior and geometry. These protocol fixtures run its actual helper
// over source-rendered navigation with the actual global provider composition.
const navigationSource = read('components/site-navigation.tsx')
const navigationStart = source.indexOf('async function assertSpanishNavigation(')
const navigationEnd = source.indexOf('async function assertSpanishCourseCatalog(', navigationStart)
assert.ok(navigationStart >= 0 && navigationEnd > navigationStart)
const navigationHelper = source.slice(navigationStart, navigationEnd)
const paths = ['/es','/es/library','/es/services','/es/academy','/es/books','/es/about','/es/courses','/es/academy/free-ai-courses','/es/homeopathy','/es/homeopathy/remedies','/es/client']
const expectedMenu = [
  '/es/services/free-situation-review','/en/app/portrait','/es/academy','/es',
  '/es/services/free-situation-review','/es/services/alchemy-of-soul','/es/pro','/es/holistic-support',
  '/es/shop','/es/cart','/es/install','/es/explore/energy','/es/explore/love',
  '/es/explore/business','/es/library','/es/events','/es/temple-insights','/es/services','/es/about',
]
const expectedPrimary = [
  ['profile','/en/app/portrait','Mi perfil'], ['courses','/es/academy','Cursos'], ['home','/es','Inicio'],
  ['analysis','/es/services/free-situation-review','Análisis gratis'], ['alchemy','/es/services/alchemy-of-soul','Alquimia del Alma'],
  ['pro','/es/pro','Pro'], ['temple','/es/holistic-support','Apoyo holístico'],
]
const actualHelper = fixture => new Function('assert','expect', navigationHelper + ';return assertSpanishNavigation')(assert, fixture.expect)
const one = (fixture, selector) => { const values = fixture.query(selector); assert.equal(values.length, 1, selector); return values[0] }
for (const path of paths) test('actual global provider and Spanish navigation preserve exact destinations: ' + path, async () => {
  const fixture = await renderSpanishNavigation(path)
  try {
    const nav = one(fixture, '.site-navigation')
    const direct = [nav.props.children].flat(Infinity).filter(node => node?.type === 'a' && !['shop','cart'].includes(node.props['data-nav-item']))
    assert.deepEqual(direct.map(node => node.props.href), ['/es/services/free-situation-review','/es/explore/energy','/es/explore/love','/es/explore/business','/es/about'])
    const cabinet = one(fixture, '.site-cabinet-entry')
    assert.equal(cabinet.type, 'button'); assert.equal(cabinet.props['aria-label'], 'Mi espacio')
    assert.equal(cabinet.props['aria-haspopup'], 'dialog'); assert.equal(cabinet.props['aria-controls'], 'home-personal-space-dialog')
    assert.equal(cabinet.props['aria-expanded'], false)
    const links = fixture.query('.site-main-menu-panel a')
    assert.deepEqual(links.map(node => node.props.href), expectedMenu)
    assert.ok(links.every(node => node.props.prefetch === false), 'No eager private/public link prefetch')
    assert.deepEqual(fixture.query('.site-main-menu-grid > a').map(node => [node.props['data-nav-item'],node.props.href,node.props['aria-label'] || treeText(node)]), expectedPrimary)
    await actualHelper(fixture)(fixture.page, path)
    assert.deepEqual(fixture.trace.filter(event => ['press','keyboard'].includes(event[0])), [['press','Enter'],['press','Tab'],['keyboard','Escape']])
    assert.deepEqual(fixture.privateCalls, [])
    assert.equal(fixture.page.url(), home + path)
  } finally { fixture.cleanup() }
})

const faults = {
  'missing cabinet': fixture => { one(fixture,'.site-cabinet-entry').props.className = 'missing' },
  'wrong cabinet name': fixture => { one(fixture,'.site-cabinet-entry').props['aria-label'] = 'My Space' },
  'wrong cabinet dialog': fixture => { one(fixture,'.site-cabinet-entry').props['aria-controls'] = 'unrelated' },
  'expanded cabinet': fixture => { one(fixture,'.site-cabinet-entry').props['aria-expanded'] = true },
  'hidden cabinet': fixture => { one(fixture,'.site-cabinet-entry').props.hidden = true },
  'wrong direct locale': fixture => { one(fixture,'.site-nav-about-entry').props.href = '/en/about' },
  'wrong menu locale': fixture => { one(fixture,'.site-main-menu-more [data-nav-item="library"]').props.href = '/en/library' },
  'wrong primary identity': fixture => { one(fixture,'.site-main-menu-grid [data-nav-item="courses"]').props['data-nav-item'] = 'academy' },
  'wrong private destination': fixture => { one(fixture,'.site-main-menu-grid [data-nav-item="profile"]').props.href = '/es/app/portrait' },
  'wrong primary accessible name': fixture => { one(fixture,'.site-main-menu-grid [data-nav-item="courses"]').props['aria-label'] = 'Academia' },
  'missing primary active': fixture => { delete one(fixture,'.site-main-menu-grid [data-nav-item="home"]').props['aria-current'] },
  'wrong primary active': fixture => { delete one(fixture,'.site-main-menu-grid [data-nav-item="home"]').props['aria-current']; one(fixture,'.site-main-menu-grid [data-nav-item="courses"]').props['aria-current'] = 'page' },
  'duplicate primary active': fixture => { one(fixture,'.site-main-menu-grid [data-nav-item="courses"]').props['aria-current'] = 'page' },
  'duplicate primary': fixture => { const grid = one(fixture,'.site-main-menu-grid'); grid.props.children.push({ ...grid.props.children[0] }) },
  'wrong need accessible name': fixture => { one(fixture,'.site-main-menu-more [data-nav-item="energy"]').props.children = 'Energía' },
  'hidden menu link': fixture => { one(fixture,'.site-main-menu-more [data-nav-item="library"]').props.hidden = true },
  'open menu at start': fixture => { one(fixture,'details.site-main-menu').props.open = true },
  'wrong trigger accessible name': fixture => { one(fixture,'.site-main-menu-trigger').props['aria-label'] = 'Menu' },
  'wrong Tab focus': fixture => { fixture.state.wrongTabFocus = true },
  'wrong Escape focus': fixture => { fixture.state.wrongEscapeFocus = true },
  'overflow': fixture => { fixture.state.overflow = true },
  'URL changes on Escape': fixture => { fixture.state.escapeDestination = home + '/es/about' },
}
const snapshot = fixture => JSON.stringify({ state: fixture.state, nodes: treeNodes(fixture.tree).map(node => ({type:node.type,href:node.props.href,nav:node.props['data-nav-item'],name:node.props['aria-label'],current:node.props['aria-current'],hidden:node.props.hidden,open:node.props.open,expanded:node.props['aria-expanded'],controls:node.props['aria-controls'],className:node.props.className,text:treeText(node)})) })
for (const [fault, mutate] of Object.entries(faults)) test('actual Spanish navigation rejects ' + fault, async () => {
  const fixture = await renderSpanishNavigation('/es')
  try {
    const before = snapshot(fixture); mutate(fixture); assert.notEqual(snapshot(fixture), before, 'Fault must actually alter source-rendered fixture')
    await assert.rejects(actualHelper(fixture)(fixture.page, '/es'), { code: 'ERR_ASSERTION' })
    assert.deepEqual(fixture.privateCalls, [])
  } finally { fixture.cleanup() }
})

test('actual global provider initial effects fail closed on eager private loading', async () => {
  const original = read('components/home-personal-space.tsx')
  const anchor = '  const value: Space = { status, summary, open, load, openPanel, closePanel };'
  assert.equal(original.split(anchor).length - 1, 1)
  await assert.rejects(renderSpanishNavigation('/es', { 'components/home-personal-space.tsx': original.replace(anchor, '  void load();\n' + anchor) }), { code: 'ERR_ASSERTION' })
})

test('root composition cannot be replaced by a standalone null-context navigation fixture', async () => {
  const original = read('app/layout.tsx')
  const provider = '<HomePersonalSpaceProvider locale={lang}>{children}</HomePersonalSpaceProvider>'
  assert.equal(original.split(provider).length - 1, 1)
  await assert.rejects(renderSpanishNavigation('/es/library', { 'app/layout.tsx': original.replace(provider, '{children}') }), { code: 'ERR_ASSERTION' })
})

const handoffStart = source.indexOf('        // My Space is a global dialog trigger.')
const handoffEnd = source.indexOf("        await expect(page).toHaveURL(origin+'/en/app/portrait');", handoffStart)
assert.ok(handoffStart > 0 && handoffEnd > handoffStart)
const handoff = source.slice(handoffStart, handoffEnd)
async function runHandoff(fixture) {
  await new Function('page','expect','click', 'return (async()=>{' + handoff + '})()')(fixture.page, fixture.expect, target => target.click())
}
test('Spanish private-entry handoff uses the real menu Profile gesture, not My Space or OAuth', async () => {
  const fixture = await renderSpanishNavigation('/es/client')
  try {
    await runHandoff(fixture)
    assert.equal(fixture.page.url(), home + '/en/app/portrait')
    assert.deepEqual(fixture.privateCalls, [])
    assert.equal(fixture.trace.filter(event => event[0] === 'click').length, 2)
    assert.equal(one(fixture,'details.site-main-menu').props.open, false, 'Actual Profile onClick closes the menu')
    assert.equal(one(fixture,'.site-cabinet-entry').props['aria-expanded'], false, 'Provider-backed dialog remains unexercised')
  } finally { fixture.cleanup() }
})
for (const fault of ['wrong private destination','wrong primary accessible name','hidden menu link']) test('menu private handoff rejects its own invalid profile: ' + fault, async () => {
  const fixture = await renderSpanishNavigation('/es/client')
  try {
    const profile = one(fixture,'.site-main-menu-grid [data-nav-item="profile"]')
    if (fault === 'wrong private destination') profile.props.href = '/es/app/portrait'
    else if (fault === 'wrong primary accessible name') profile.props['aria-label'] = 'Mi Casa'
    else profile.props.hidden = true
    await assert.rejects(runHandoff(fixture), { code: 'ERR_ASSERTION' })
  } finally { fixture.cleanup() }
})

test('Spanish browser verifier retains private denial, fatal errors, locale and unselected requests', () => {
  assert.match(source, /await assertSpanishNavigation\(page, path\)/)
  assert.match(source, /await assertUnsupportedSpanishPrivateLocale\(denialPage,response,target,expect\)/)
  assert.match(source, /assert\.deepEqual\(unselectedClientRequests,\[\]/)
  assert.match(source, /await context.close\(\)/)
  const start = source.indexOf("        page.on('request', request => {")
  const end = source.indexOf('        });', start) + '        });'.length
  assert.ok(start > 0 && end > start)
  const requests = []; let listener
  new Function('page','origin','watchingUnselectedClients','unselectedClientRequests',source.slice(start,end))({on(name,callback){assert.equal(name,'request');listener=callback}},home,true,requests)
  for (const path of ['/en/client','/ru/client/tests?_rsc=synthetic','/es/client','https://example.invalid/en/client']) listener({url:()=>path.startsWith('https')?path:home+path,resourceType:()=> 'document'})
  assert.deepEqual(requests,[{path:'/en/client',resourceType:'document'},{path:'/ru/client/tests',resourceType:'document'}])
})

test('Spanish Courses retains one exact active Courses tab without inventing an Academy slot', () => {
  assert.match(source, /getByRole\('heading', \{ level: 1, name: 'Cursos de IA gratuitos'/)
  assert.match(source, /await expect\(freeStart\)\.toHaveAttribute\('href', '\/es\/services\/free-situation-review'\)/)
  const catalog = source.slice(source.indexOf('async function assertSpanishCourseCatalog('),source.indexOf('// Production-parity HTTPS browser checks.'))
  assert.match(catalog, /bottom\.locator\('\[aria-current="page"\]'\)\)\.toHaveCount\(1\)/)
  assert.match(catalog, /courses\)\.toHaveAttribute\('aria-current', 'page'\)/)
  assert.match(catalog, /courses\)\.toHaveAttribute\('href', '\/es\/academy'\)/)
  assert.match(catalog, /courses\)\.toHaveAccessibleName\('Cursos'\)/)
  assert.doesNotMatch(navigationSource, /getCompactNavigation\(activeLocale\)\.filter\(item => item\.id === 'academy'\)/)
})
