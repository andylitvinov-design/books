import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import * as navigationModel from '../lib/site-navigation-model.js'
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

// The full EN/RU/ES browser verifier remains authoritative for click and
// keyboard evidence. These fast tests validate its real source and JSX routing.
const navigationSource = read('components/site-navigation.tsx')
const treeNodes = tree => !tree || typeof tree !== 'object' ? [] : Array.isArray(tree) ? tree.flatMap(treeNodes) : [tree, ...treeNodes(tree.props.children)]
const jsx = (type, props) => typeof type === 'function' ? type(props || {}) : { type, props: props || {} }
function renderNavigation(path) {
  const locale = 'es'
  const modules = {
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'next/link': { default: props => jsx('a', props) },
    react: { useEffect() {}, useRef: () => ({ current: null }) },
    'next/navigation': { usePathname: () => path },
    'lucide-react': { Menu: () => null, Sparkles: () => null, LayoutDashboard: () => null, ArrowRight: () => null },
    '@/components/commerce/cart-nav-link': { CartNavLink: () => null },
    '@/components/site-search': { SiteSearch: () => null },
    '@/lib/ui-locale': { localePath: (value, language) => '/' + language + value, saveUiLocale() {} },
    '@/lib/public-locales': { hasSpanishCounterpart: () => true, publicCounterpart: (_value, language) => language === 'en' ? '/' : '/' + language, savePublicLocale() {} },
    '@/lib/site-navigation-model': navigationModel,
    './compact-navigation-icons': { compactNavigationIcons: Object.fromEntries(navigationModel.compactNavigationIds.map(id => [id, () => null])) },
    './home-personal-space': { HomePersonalSpaceNavEntry: () => jsx('button', { className:'site-cabinet-entry','data-nav-item':'cabinet', 'aria-label':'Mi espacio', 'aria-haspopup':'dialog','aria-controls':'home-personal-space-dialog' }) },
    './use-navigation-locale': { useNavigationLocale: () => locale },
  }
  const compiled = ts.transpileModule(navigationSource, {
    fileName: 'site-navigation.tsx',
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const exports = {}
  runInNewContext(compiled, { exports, require(name) { assert.ok(Object.hasOwn(modules, name), 'Known navigation dependency: ' + name); return modules[name] } })
  return exports.SiteNavigation({ locale })
}
test('Spanish direction links and legacy catalogs remain discoverable in actual navigation JSX', () => {
  const desired = ['/es/services/free-situation-review','/es/explore/energy','/es/explore/love','/es/explore/business','/es/about']
  const menuUrls = [
    '/es/services/free-situation-review','/es','/es/explore/energy','/es/explore/love','/es/explore/business',
    '/es/client/tests','/es/books','/es/shop','/es/cart','/es/library','/es/courses','/es/events',
    '/es/services','/es/academy','/es/about',
  ]
  for(const path of ['/es','/es/library','/es/services','/es/academy','/es/books','/es/about','/es/client']) {
    const tree = renderNavigation(path)
    const direct = Array.from(tree.props.children).flat(Infinity).filter(node =>
      node?.type === 'a' && node.props['data-nav-item'] !== 'shop')
    assert.deepEqual(direct.map(node=>node.props.href), path === '/es' ? desired : [...desired,'/en/app'])
    const cabinet = treeNodes(tree).filter(node => node.props.className === 'site-cabinet-entry')
    assert.equal(cabinet.length, 1, path + ': unique Cabinet or My Space control')
    assert.equal(cabinet[0].type, path === '/es' ? 'button' : 'a')
    const menu = treeNodes(tree).find(node => node.type === 'details' && node.props.className === 'site-main-menu')
    assert.ok(menu, path + ': menu available')
    const links = treeNodes(menu).filter(node=>node.type==='a')
    assert.deepEqual(links.map(node=>node.props.href),menuUrls,path + ': complete legacy catalogs')
  }
})
test('Spanish browser verifier matches actual My Space, public directions, accessible menu and private handoff', () => {
  assert.match(source, /async function assertSpanishNavigation\(page, path\)/)
  assert.match(source, /aria-haspopup','dialog'/)
  assert.match(source, /toHaveAccessibleName\('Mi espacio'\)/)
  assert.match(source, /'\/es\/explore\/energy', '\/es\/explore\/love'/)
  assert.match(source, /'\/es\/services', '\/es\/academy', '\/es\/about'/)
  assert.match(source, /await trigger.press\('Tab'\)/)
  assert.match(source, /await page.keyboard.press\('Escape'\)/)
  assert.match(source, /const accountLink = page.locator\('\.site-navigation a\.site-cabinet-entry\[href="\/en\/app"\]'\)/)
  assert.match(source, /await click\(accountLink\)/)
  assert.doesNotMatch(source, /four direct links plus eleven-entry Spanish menu/)
  assert.match(source, /await assertSpanishNavigation\(page, path\)/)
  assert.match(source, /await assertUnsupportedSpanishPrivateLocale\(denialPage,response,target,expect\)/)
  assert.match(source, /assert\.deepEqual\(unselectedClientRequests,\[\]/)
  assert.match(source, /await context.close\(\)/)
})
test('Spanish Academy remains available without inventing an Academy bottom-bar slot', () => {
  assert.match(source, /getByRole\('heading', \{ level: 1, name: 'Cursos de IA gratuitos'/)
  assert.match(source, /await expect\(freeStart\)\.toHaveAttribute\('href', '\/es\/services\/free-situation-review'\)/)
  assert.match(source, /mobile-bottom-navigation \[aria-current="page"\]'\)\)\.toHaveCount\(0\)/)
  assert.doesNotMatch(navigationSource, /getCompactNavigation\(activeLocale\)\.filter\(item => item\.id === 'academy'\)/)
})
