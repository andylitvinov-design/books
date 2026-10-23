import { loadPublicNavigationSpace } from './helpers/public-navigation-space-fixture.mjs'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import * as serviceCart from '../lib/commerce/cart.js'
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
const jsx = (type, props) => type === undefined ? props.children : typeof type === 'function' ? type(props || {}) : { type, props: props || {} }
const textOf = tree => tree == null ? '' : typeof tree !== 'object' ? String(tree) : Array.isArray(tree) ? tree.map(textOf).join('') : textOf(tree.props.children)
let space;
function renderNavigation(path, transform = value => value, transformSpace = value => value) {
  space = { open: false, openPanel() { space.open = true } };
  const modules = {
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'next/link': { default: props => jsx('a', props) },
    react: { useEffect() {}, useRef: () => ({ current: null }), useState: () => [0, () => {}], createContext: () => ({}), useContext: () => space },
    'next/navigation': { usePathname: () => path },
    'lucide-react': Object.fromEntries(['ArrowRight', 'LayoutDashboard', 'Menu', 'Sparkles', 'ShoppingBasket','BookOpen','BriefcaseBusiness','ChevronDown','ClipboardList','FileText','LockKeyhole','Target','UserRound','X'].map(name => [name, () => null])),
    './compact-navigation-icons': { compactNavigationIcons: Object.fromEntries(navigationModel.compactNavigationIds.map(id => [id, () => null])) },
    '@/lib/commerce/cart': serviceCart,
    'next/image': { default: 'img' },
    '@/components/site-search': { SiteSearch: () => null },
    '@/lib/app/client-fetch': { appFetch() { throw Error('No auth request in navigation fixture') } },
    '@/lib/home-personal-space.mjs': { homeSpaceSummary() { throw Error('No account summary in navigation fixture') } },
    './home-personal-space.module.css': { default: {} },
    './cart-nav-link.module.css': { default: { navCart: 'cart-nav-link' } },
    '@/lib/ui-locale': { localePath: (value, locale) => '/' + locale + value, saveUiLocale() {} },
    '@/lib/public-locales': { hasSpanishCounterpart: () => true, publicCounterpart: (_value, locale) => locale === 'en' ? '/' : '/' + locale, savePublicLocale() {} },
    '@/lib/site-navigation-model': navigationModel,
    './use-navigation-locale': { useNavigationLocale: locale => locale },
  }
  const cartExports = {}
  const cart = ts.transpileModule(read('components/commerce/cart-nav-link.tsx'), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS } }).outputText
  runInNewContext(cart, { exports: cartExports, require(name) { assert.ok(Object.hasOwn(modules, name), name); return modules[name] } })
  modules['@/components/commerce/cart-nav-link'] = cartExports
  const spaceExports = loadPublicNavigationSpace(modules, { source: transformSpace(read('components/home-personal-space.tsx')) });
  modules['./home-personal-space'] = spaceExports;
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
  const cabinetNode = treeNodes(tree).find(node => node.props.className === 'site-cabinet-entry');
  if (fault === 'wrong dialog target') cabinetNode.props['aria-controls'] = 'wrong-dialog';
  if (fault === 'dialog initially open') cabinetNode.props['aria-expanded'] = true;
  const cabinet = { kind: 'cabinet', count: 1, node: cabinetNode };
  const summary = treeNodes(menuTree).find(node => node.type === 'summary')
  if (fault === 'wrong direct destination') direct[0].props.href = '/es'
  if (fault === 'missing direct link') direct.splice(2, 1)
  if (fault === 'extra direct link') direct.push({ type: 'a', props: { href: '/es/library' } })
  if (fault === 'wrong shop destination') direct.find(node => node.props['data-nav-item'] === 'shop').props.href = '/en/shop'
  if (fault === 'wrong cart destination') direct.find(node => node.props['data-nav-item'] === 'cart').props.href = '/en/cart'
  if (fault === 'wrong library destination') menuNodes.find(node => node.props.href === '/es/library').props.href = '/en/library'
  if (fault === 'wrong cabinet destination') cabinetNode.props.href = '/en/app'
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
    assert.equal(selector, '.site-main-menu-panel a'); return collection(menuNodes)
  } }
  const navigation = { kind: 'navigation', count: 1, locator(selector) {
    if (selector === ':scope > a') return collection(direct)
    if (selector === '.site-cabinet-entry') return cabinet;
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
    not: { async toHaveAttribute(name) { assert.equal(actual.node.props[name], undefined) } },
    async toHaveCount(count) { assert.equal(actual.count, count) },
    async toHaveAttribute(name, value) { assert.equal(String(actual.node.props[name]), value) },
    async toHaveJSProperty(name, value) { assert.equal(actual, menu); assert.equal(name, 'open'); assert.equal(open, value) },
    async toBeVisible() {
      assert.ok(actual, 'Control exists')
      if (actual.kind === 'link') { assert.equal(open, true); assert.notEqual(fault, 'hidden menu link') }
      else { assert.equal(actual, trigger); assert.notEqual(fault, 'hidden trigger') }
    },
    async toHaveAccessibleName(name) { assert.equal(actual.node.props['aria-label'] ?? (actual.node.props['data-free-review-entry'] ? treeNodes(actual.node).filter(node => node.props.className === 'site-main-menu-free__title' || node.props.className === 'site-main-menu-free__detail').map(textOf).join(' ') : textOf(actual.node)), name) },
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
  test(path + ' actual JSX preserves needs-based directions, sitewide My Space dialog and the exact labelled fourteen-entry menu', () => checkSpanishNavigation(path))
}
for (const fault of ['wrong direct destination', 'missing direct link', 'extra direct link', 'wrong library destination', 'wrong shop destination', 'wrong cart destination', 'wrong cabinet destination', 'wrong menu destination', 'missing menu destination', 'extra menu destination', 'reordered menu destinations', 'wrong menu label', 'wrong trigger label', 'initially open', 'missing menu', 'cannot open', 'keyboard order', 'escape closure', 'focus return', 'unexpected navigation', 'menu overflow', 'hidden menu link', 'hidden trigger', 'wrong dialog target', 'dialog initially open']) {
  test('Spanish navigation verifier rejects ' + fault, () => assert.rejects(checkSpanishNavigation(fault === 'wrong cabinet destination' ? '/es/client' : '/es', fault)))
}
for (const [name, before, after] of [
  ['obsolete free-start anchor', '/services/free-situation-review', '#free-start'],
  ['full catalog restored as direct links', ".filter(item => ['energy', 'love', 'business'].includes(item.id))", ''],
  ['courses removed from full menu', 'extraMenuItems.map(item => (', "extraMenuItems.filter(item => item.id !== 'courses').map(item => ("],
]) {
  test('Spanish navigation verifier rejects actual source mutation: ' + name, () => {
    assert.ok(navigationSource.includes(before))
    return assert.rejects(checkSpanishNavigation('/es', undefined, value => value.replace(before, after)))
  })
}
test('navigation disclosure returns closed before screenshots and preserves the browser/privacy lifecycle', () => {
  assert.match(source, /await assertSpanishNavigation\(page, path\);/)
  assert.ok(source.indexOf('await assertSpanishNavigation(page, path);') < source.indexOf("if(path==='/es/client')"))
  assert.match(source, /Energy\/Love\/Business, fourteen-entry menu and sitewide My Space guest dialog; Enter\/Tab\/Escape, explicit Google action and focus return/)
  assert.match(source, /for \(const width of \[390,1365\]\)/)
  assert.match(source, /\[\['chromium', chromium\], \['webkit', webkit\]\]/)
  assert.match(source, /await assertUnsupportedSpanishPrivateLocale\(denialPage,response,target,expect\)/)
  assert.match(source, /assert\.deepEqual\(unselectedClientRequests,\[\]/)
  assert.match(source, /await context\.close\(\)/)
  assert.match(source, /finally \{await browser\.close\(\);\}/)
  assert.match(source, /finally \{if\(proxy\)\{proxy\.closeAllConnections\(\);proxy\.close\(\);\} if\(app\)app\.kill\('SIGTERM'\);\}/)
})


function assertHomeDialog(transformSpace = value => value, path = '/es') {
 const tree=renderNavigation(path,value=>value,transformSpace);
 const button=treeNodes(tree).find(node=>node.props.className==='site-cabinet-entry');
 assert.equal(button.type,'button');assert.equal(button.props.type,'button');assert.equal(button.props.href,undefined);
 assert.equal(button.props.onClick,space.openPanel);assert.equal(space.open,false);
 button.props.onClick();assert.equal(space.open,true);
}
for (const path of ['/es', '/es/library', '/es/client', '/es/academy/free-ai-courses']) test(path + ' My Space uses its actual context handler without navigating or reading an account', () => assertHomeDialog(value => value, path));
for(const [name,before,after] of [
 ['disconnected dialog action','onClick={space.openPanel}','onClick={() => {}}'],
 ['Home replaced by account link','if (!space) return <Link','if (true) return <Link'],
]) test('actual Home component rejects '+name,()=>{
 assert.ok(read('components/home-personal-space.tsx').includes(before));
 assert.throws(()=>assertHomeDialog(value=>value.replace(before,after)));
});

const guestSpaceHelper = source.slice(source.indexOf('async function assertSpanishGuestSpace('), source.indexOf('async function assertSpanishCourseCatalog('));
async function verifyGuestSpace(fault) {
  const navigation = renderNavigation('/es/client');
  const triggerNode = treeNodes(navigation).find(node => node.props.className === 'site-cabinet-entry');
  const writes = [], privateRequests = [];
  let hook = 0;
  const states = ['guest', null, false, false, false];
  const exports = loadPublicNavigationSpace({
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'next/link': { default: props => jsx('a', props) },
    'next/image': { default: 'img' },
    'next/navigation': { usePathname: () => '/es/client' },
    react: {
      createContext: () => ({ Provider: props => props.children }), useContext: () => null,
      useState(initial) { const index = hook++; return [index < states.length ? states[index] : initial, value => writes.push({ index, value })]; },
      useRef: current => ({ current }), useCallback: callback => callback, useEffect() {},
    },
    'lucide-react': new Proxy({}, { get: () => () => null }),
    './home-personal-space.module.css': { default: {} },
    '@/lib/app/client-fetch': { appFetch(...args) { privateRequests.push(args); assert.fail('No private requests in guest source fixture'); } },
    '@/lib/home-personal-space.mjs': { homeSpaceSummary() { assert.fail('No account summaries in guest source fixture'); } },
  });
  const tree = exports.HomePersonalSpaceProvider({ locale: 'es', children: null });
  const actualDialog = treeNodes(tree).find(node => node.type === 'dialog');
  assert.equal(actualDialog.props.id, 'home-personal-space-dialog');
  function accessibleText(node) {
    if (Array.isArray(node)) return node.map(accessibleText).join('');
    if (!node || typeof node === 'boolean') return '';
    if (typeof node !== 'object') return String(node);
    if (node.props['aria-hidden']) return '';
    return accessibleText(node.props.children);
  }
  function name(node) {
    if (node.props['aria-label']) return node.props['aria-label'];
    const labelled = node.props['aria-labelledby'];
    return accessibleText(labelled ? treeNodes(tree).find(n => n.props.id === labelled) : node).trim();
  }
  const googleNode = treeNodes(actualDialog).find(n => n.type === 'button' && name(n) === 'Continuar con Google');
  const closeNode = treeNodes(actualDialog).find(n => n.type === 'button' && name(n) === 'Cerrar Mi espacio');
  assert.ok(googleNode && closeNode, 'Use actual localized guest controls');
  if (fault === 'wrong trigger label') triggerNode.props['aria-label'] = 'Wrong';
  if (fault === 'wrong dialog target') triggerNode.props['aria-controls'] = 'wrong-dialog';
  if (fault === 'disabled Google action') googleNode.props.disabled = true;
  if (fault === 'wrong free test route') treeNodes(actualDialog).find(n => n.type === 'a' && name(n) === 'Prueba gratuita').props.href = '/en/app/tests';
  if (fault === 'wrong Academy route') treeNodes(actualDialog).find(n => n.type === 'a' && name(n) === 'Explorar cursos').props.href = '/es/academy/free-ai-courses';
  if (fault === 'disconnected close handler') closeNode.props.onClick = () => {};
  const trigger = { kind: 'trigger', node: triggerNode, count: fault === 'duplicate trigger' ? 2 : 1 };
  let visible = false, focused, url = home + '/es/client';
  const listeners = new Map(), clicks = [];
  const collection = (kind, candidates) => ({ kind, count: candidates.length, node: candidates[0] });
  const dialog = { kind: 'dialog', node: actualDialog, count: 1,
    getByRole(role, options) {
      const tag = role === 'link' ? 'a' : role;
      let matches = treeNodes(actualDialog).filter(n => n.type === tag && name(n) === options.name);
      if (fault === 'missing Google action' && options.name === 'Continuar con Google') matches = [];
      return collection(role, matches);
    },
  };
  const page = {
    url: () => url,
    on(event, listener) { listeners.set(event, listener); },
    off(event, listener) { assert.equal(listeners.get(event), listener); listeners.delete(event); },
    locator(selector) { assert.equal(selector, '.site-navigation > button.site-cabinet-entry'); return trigger; },
    getByRole(role, options) { assert.equal(role, 'dialog'); assert.equal(options.exact, true); assert.equal(name(actualDialog), options.name); return dialog; },
  };
  const expect = actual => ({
    async toHaveCount(count) { assert.equal(actual.count, count); },
    async toHaveAccessibleName(value) { assert.equal(name(actual.node), value); },
    async toHaveAttribute(key, value) { assert.equal(actual.node.props[key], value); },
    async toBeVisible() {
      assert.equal(actual.count, 1);
      if (actual !== trigger) assert.equal(visible, true);
      if (actual.node === googleNode) assert.notEqual(fault, 'hidden Google action');
      if (actual === trigger) assert.notEqual(fault, 'hidden trigger');
    },
    async toBeEnabled() { assert.equal(Boolean(actual.node.props.disabled), false); },
    async toHaveURL(value) { assert.equal(actual, page); assert.equal(url, value); },
    async toBeFocused() { assert.equal(focused, actual); },
    not: { async toBeVisible() { assert.equal(actual, dialog); assert.equal(visible, false); } },
  });
  const click = async target => {
    assert.equal(target.count, 1);
    assert.ok(target.node === triggerNode || target.node === closeNode, 'Never invoke Google/auth in this acceptance flow');
    clicks.push(target.node === triggerNode ? 'open' : 'close');
    target.node.props.onClick();
    if (target.node === triggerNode) {
      visible = space.open;
      if (fault === 'unexpected navigation') url = home + '/en/app';
      if (fault === 'automatic Google request') listeners.get('request')({ url: () => home + '/api/app/auth/start' });
    } else {
      visible = !writes.some(write => write.index === 2 && write.value === false);
      focused = fault === 'missing focus return' ? undefined : trigger;
    }
  };
  await new Function('page', 'click', 'expect', 'assert', 'URL', guestSpaceHelper + '; return assertSpanishGuestSpace(page, click);')(page, click, expect, assert, URL);
  assert.deepEqual(clicks, ['open', 'close']);
  assert.equal(listeners.size, 0, 'The request observer is always removed');
  assert.deepEqual(privateRequests, []);
}

test('actual sitewide guest dialog opens and closes with an explicit unused Google action and no private requests', () => verifyGuestSpace());
for (const fault of ['wrong trigger label', 'wrong dialog target', 'duplicate trigger', 'hidden trigger', 'missing Google action', 'hidden Google action', 'disabled Google action', 'wrong free test route', 'wrong Academy route', 'disconnected close handler', 'missing focus return', 'unexpected navigation', 'automatic Google request']) {
  test('sitewide guest-dialog verifier rejects ' + fault, () => assert.rejects(verifyGuestSpace(fault)));
}
test('account guest route remains separate from the public dialog and no Google action is invoked by the audit', () => {
  const start = source.indexOf('        await assertSpanishGuestSpace(page, click);');
  const next = source.indexOf("        await navigate('/en/app');", start);
  assert.ok(start > 0 && next > start);
  assert.match(source.slice(next), /await assertCabinetGuestEntry\(page, expect\)/);
  assert.doesNotMatch(guestSpaceHelper, /click\(google\)/);
  assert.match(guestSpaceHelper, /page\.off\('request', recordAuthStart\)/);
});

test('the actual native detector is evaluated instead of a fabricated environment result', () => {
  assert.throws(() => loadPublicNavigationSpace({}, { nativeSource: read('lib/native/client.ts') + '\nthrow new Error("ACTUAL_NATIVE_DETECTOR");' }), /ACTUAL_NATIVE_DETECTOR/);
});
test('native SDK access remains outside the offline navigation loader', () => {
  assert.throws(() => loadPublicNavigationSpace({}, { nativeSource: 'import { Browser } from "@capacitor/browser"; Browser.open({url:"https://example.invalid"});' }), /Unexpected public navigation dependency: @capacitor\/browser/);
});
test('the native source module cannot obtain ambient network access', () => {
  assert.throws(() => loadPublicNavigationSpace({}, { nativeSource: 'fetch("https://example.invalid/private");' }), /fetch is not defined/);
});
test('new unlisted My Space imports remain fail-closed', () => {
  assert.throws(() => renderNavigation('/es', value => value, value => 'import { probe } from "@/lib/unlisted-space-probe"; probe();\n' + value), /Unexpected public navigation dependency: @\/lib\/unlisted-space-probe/);
});
