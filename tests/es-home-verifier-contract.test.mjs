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

const navigationHelper = source.slice(source.indexOf('async function assertSpanishNavigation('), source.indexOf('// Production-parity HTTPS browser checks.'))
const navigationSource = read('components/site-navigation.tsx')
const treeNodes = tree => !tree || typeof tree !== 'object' ? [] : Array.isArray(tree) ? tree.flatMap(treeNodes) : [tree, ...treeNodes(tree.props.children)]
const jsx = (type, props) => typeof type === 'function' ? type(props || {}) : { type, props: props || {} }
const textOf = tree => tree == null ? '' : typeof tree !== 'object' ? String(tree) : Array.isArray(tree) ? tree.map(textOf).join('') : textOf(tree.props.children)
function renderNavigation(path, transform = value => value) {
  const modules = {
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'next/link': { default: props => jsx('a', props) },
    react: { useEffect() {}, useRef: () => ({ current: null }) },
    'next/navigation': { usePathname: () => path },
    'lucide-react': { BookOpen: () => null, Menu: () => null },
    '@/lib/ui-locale': { localePath: (value, locale) => '/' + locale + value, saveUiLocale() {} },
    '@/lib/public-locales': { hasSpanishCounterpart: () => true, publicCounterpart: (_value, locale) => locale === 'en' ? '/' : '/' + locale, savePublicLocale() {} },
    '@/lib/site-navigation-model': navigationModel,
    './use-navigation-locale': { useNavigationLocale: locale => locale },
  }
  const compiled = ts.transpileModule(transform(navigationSource), { fileName: 'site-navigation.tsx', compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const exports = {}
  runInNewContext(compiled, { exports, require(name) { assert.ok(Object.hasOwn(modules, name), 'Known navigation dependency: ' + name); return modules[name] } })
  return exports.SiteNavigation({ locale: 'es' })
}
async function checkSpanishNavigation(path = '/es', fault, transform) {
  const tree = renderNavigation(path, transform)
  const direct = Array.from(tree.props.children).flat(Infinity).filter(node => node?.type === 'a')
  const menuTree = treeNodes(tree).find(node => node.type === 'details' && node.props.className === 'site-main-menu')
  const menuNodes = treeNodes(menuTree).filter(node => node.type === 'a')
  const summary = treeNodes(menuTree).find(node => node.type === 'summary')
  if (fault === 'wrong direct destination') direct[0].props.href = '/es'
  if (fault === 'missing direct link') direct.splice(2, 1)
  if (fault === 'extra direct link') direct.push({ type: 'a', props: { href: '/es/library' } })
  if (fault === 'wrong library destination') direct[3].props.href = '/en/library'
  if (fault === 'wrong cabinet destination') menuNodes.find(node => node.props.href === '/en/app').props.href = '/es/client'
  if (fault === 'wrong menu destination') menuNodes[7].props.href = '/wrong'
  if (fault === 'missing menu destination') menuNodes.splice(2, 1)
  if (fault === 'extra menu destination') menuNodes.push({ type: 'a', props: { href: '/extra', children: 'Extra' } })
  if (fault === 'reordered menu destinations') [menuNodes[2], menuNodes[3]] = [menuNodes[3], menuNodes[2]]
  if (fault === 'wrong menu label') menuNodes[7].props.children = 'About'
  if (fault === 'wrong trigger label') summary.props['aria-label'] = 'Menu'
  let open = fault === 'initially open', focused, url = home + path
  const actions = []
  const links = menuNodes.map(node => ({ kind: 'link', node }))
  const collection = nodes => ({
    evaluateAll: async callback => callback(nodes.map(node => ({ getAttribute: name => node.props[name] ?? null }))),
    nth: index => links[index], first: () => links[0],
  })
  const trigger = { kind: 'trigger', node: summary,
    async focus() { actions.push('focus'); focused = trigger },
    async press(key) {
      actions.push(key)
      if (key === 'Enter' && fault !== 'cannot open') open = !open
      if (key === 'Tab') focused = fault === 'keyboard order' ? links[1] : links[0]
    },
  }
  const menu = { kind: 'menu', count: fault === 'missing menu' ? 0 : 1, locator(selector) {
    if (selector === 'summary') return trigger
    assert.equal(selector, '.site-main-menu-panel > a'); return collection(menuNodes)
  } }
  const navigation = { kind: 'navigation', count: 1, locator(selector) {
    if (selector === ':scope > a') return collection(direct)
    assert.equal(selector, 'details.site-main-menu'); return menu
  } }
  const page = {
    url: () => url,
    locator(selector) { assert.equal(selector, '.site-navigation'); return navigation },
    evaluate: async () => fault !== 'menu overflow',
    keyboard: { async press(key) {
      assert.equal(key, 'Escape'); actions.push(key)
      if (fault !== 'escape closure') open = false
      focused = fault === 'focus return' ? links[0] : trigger
      if (fault === 'unexpected navigation') url = home + '/en/app'
    } },
  }
  const expect = actual => ({
    async toHaveCount(count) { assert.equal(actual.count, count) },
    async toHaveJSProperty(name, value) { assert.equal(actual, menu); assert.equal(name, 'open'); assert.equal(open, value) },
    async toBeVisible() {
      assert.ok(actual, 'Control exists')
      if (actual.kind === 'link') { assert.equal(open, true); assert.notEqual(fault, 'hidden menu link') }
      else { assert.equal(actual, trigger); assert.notEqual(fault, 'hidden trigger') }
    },
    async toHaveAccessibleName(name) { assert.equal(actual.node.props['aria-label'] ?? textOf(actual.node), name) },
    async toBeFocused() { assert.equal(focused, actual) },
    async toHaveURL(expected) { assert.equal(actual, page); assert.equal(url, expected) },
  })
  await new Function('assert', 'expect', navigationHelper + '; return assertSpanishNavigation')(assert, expect)(page, path)
  assert.equal(open, false, 'Menu closes before route screenshots or subsequent language checks')
  assert.equal(focused, trigger)
  assert.deepEqual(actions, ['focus', 'Enter', 'Tab', 'Escape'])
  assert.equal(url, home + path, 'The menu audit must not navigate away from the current route')
}
for (const path of ['/es', '/es/library', '/es/services', '/es/academy', '/es/books', '/es/about', '/es/courses', '/es/homeopathy', '/es/homeopathy/remedies', '/es/client']) {
  test(path + ' actual JSX preserves four direct links and the exact labelled eleven-entry menu', () => checkSpanishNavigation(path))
}
for (const fault of ['wrong direct destination', 'missing direct link', 'extra direct link', 'wrong library destination', 'wrong cabinet destination', 'wrong menu destination', 'missing menu destination', 'extra menu destination', 'reordered menu destinations', 'wrong menu label', 'wrong trigger label', 'initially open', 'missing menu', 'cannot open', 'keyboard order', 'escape closure', 'focus return', 'unexpected navigation', 'menu overflow', 'hidden menu link', 'hidden trigger']) {
  test('Spanish navigation verifier rejects ' + fault, () => assert.rejects(checkSpanishNavigation('/es', fault)))
}
for (const [name, before, after] of [
  ['obsolete free-start anchor', '#free-start', '#start-here'],
  ['full catalog restored as direct links', ".filter(item => item.id === 'services')", ''],
  ['courses removed from full menu', 'menuItems.map(item => (', "menuItems.filter(item => item.id !== 'courses').map(item => ("],
]) {
  test('Spanish navigation verifier rejects actual source mutation: ' + name, () => {
    assert.ok(navigationSource.includes(before))
    return assert.rejects(checkSpanishNavigation('/es', undefined, value => value.replace(before, after)))
  })
}
test('navigation disclosure returns closed before screenshots and preserves the browser/privacy lifecycle', () => {
  assert.match(source, /await assertSpanishNavigation\(page, path\);/)
  assert.ok(source.indexOf('await assertSpanishNavigation(page, path);') < source.indexOf("if(path==='/es/client')"))
  assert.match(source, /four direct links plus eleven-entry Spanish menu, Enter\/Tab\/Escape and focus return/)
  assert.match(source, /for \(const width of \[390,1365\]\)/)
  assert.match(source, /\[\['chromium', chromium\], \['webkit', webkit\]\]/)
  assert.match(source, /await assertUnsupportedSpanishPrivateLocale\(denialPage,response,target,expect\)/)
  assert.match(source, /assert\.deepEqual\(unselectedClientRequests,\[\]/)
  assert.match(source, /await context\.close\(\)/)
  assert.match(source, /finally \{await browser\.close\(\);\}/)
  assert.match(source, /finally \{if\(proxy\)\{proxy\.closeAllConnections\(\);proxy\.close\(\);\} if\(app\)app\.kill\('SIGTERM'\);\}/)
})

test('Spanish account handoff opens the real menu and follows its unique visible My House link', async () => {
  const start = source.indexOf('        const accountMenu =');
  const end = source.indexOf("        await expect(page).toHaveURL(origin+'/en/app/portrait');", start);
  assert.ok(start > 0 && end > start);
  const handoff = source.slice(start, end);
  async function run(fault) {
    const tree = renderNavigation('/es/client');
    const menuTree = treeNodes(tree).find(node => node.type === 'details' && node.props.className === 'site-main-menu');
    const links = treeNodes(menuTree).filter(node => node.type === 'a' && textOf(node) === 'Gabinete');
    if (fault === 'wrong destination') links[0].props.href = '/es/client';
    if (fault === 'missing link') links.length = 0;
    if (fault === 'duplicate link') links.push(links[0]);
    let open = false, clicked = false;
    const account = { count: links.length };
    const menu = { count: 1, locator(selector) {
      assert.equal(selector, 'summary');
      return { async click() { open = fault !== 'cannot open'; } };
    }, getByRole(role, options) {
      assert.equal(role, 'link'); assert.deepEqual(options, { name: 'Gabinete', exact: true });
      return account;
    } };
    const trigger = { trigger: true };
    const page = { locator(selector) {
      if (selector === '.site-navigation details.site-main-menu') return menu;
      if (selector === '.site-main-menu-trigger') return trigger;
      assert.equal(selector, '.site-main-menu-panel > a[href="/en/app"]'); return account;
    } };
    const expect = actual => ({
      async toHaveCount(count) { assert.equal(actual.count, count); },
      async toHaveAccessibleName(name) { assert.equal(actual, account); assert.equal(name, 'Gabinete'); assert.equal(textOf(links[0]), name); },
      async toHaveJSProperty(name, value) { assert.equal(actual, menu); assert.equal(name, 'open'); assert.equal(open, value); },
      async toBeVisible() { assert.equal(actual, account); assert.equal(open, true); assert.notEqual(fault, 'hidden link'); },
      async toHaveAttribute(name, value) { assert.equal(actual, account); assert.equal(name, 'href'); assert.equal(links[0].props.href, value); },
    });
    const click = async target => { if (target === trigger) { open = fault !== 'cannot open'; return; } assert.equal(target, account); assert.equal(open, true); clicked = true; };
    await new Function('page', 'expect', 'click', `return (async()=>{${handoff}})()`)(page, expect, click);
    assert.equal(clicked, true);
  }
  await run();
  for (const fault of ['wrong destination', 'missing link', 'duplicate link', 'cannot open', 'hidden link']) await assert.rejects(run(fault), fault);
});
