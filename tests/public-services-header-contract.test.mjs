import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const source = read('scripts/verify-public-services-production.mjs');
const start = source.indexOf('      // Canonical header:');
const end = source.indexOf('      await assertViewport', start);
assert.ok(start >= 0 && end > start);
const verify = new (Object.getPrototypeOf(async function () {}).constructor)('page', 'expect', 'visible', 'assert', 'locale', 'width', source.slice(start, end));
const nodes = node => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(nodes) : [node, ...nodes(node.props?.children)];
const text = node => node == null || typeof node === 'boolean' ? '' : typeof node !== 'object' ? String(node) : Array.isArray(node) ? node.map(text).join('') : text(node.props?.children);
const hasClass = (node, name) => node.props?.className?.split(' ').includes(name);
const jsx = (type, props) => typeof type === 'function' ? type(props) : ({ type, props });

function compile(input, dependencies = {}) {
  const exports = {};
  runInNewContext(ts.transpileModule(input, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022,
  } }).outputText, { exports, require(name) {
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
    if (name === 'next/link') return { default: 'a' };
    if (name === 'lucide-react') return { BookOpen: 'svg', Menu: 'svg' };
    assert.ok(Object.hasOwn(dependencies, name), 'Unexpected source dependency: ' + name);
    return dependencies[name];
  } });
  return exports;
}

// Execute the real model and both header components. Only framework hooks,
// decoration and the unrelated cart are inert; no browser or auth is loaded.
function renderHeader(locale, modelSource = read('lib/site-navigation-model.js')) {
  const navigation = compile(modelSource);
  const { SiteNavigation } = compile(read('components/site-navigation.tsx'), {
    react: { useEffect() {}, useRef: () => ({ current: null }) },
    'next/navigation': { usePathname: () => `/${locale}/services` },
    '@/components/commerce/cart-nav-link': { CartNavLink: () => null },
    './compact-navigation-icons': { compactNavigationIcons: Object.fromEntries(navigation.compactNavigationIds.map(id => [id, 'svg'])) },
    '@/lib/ui-locale': { localePath: () => assert.fail('Services has a public counterpart'), saveUiLocale() {} },
    '@/lib/public-locales': compile(read('lib/public-locales.ts')),
    '@/lib/site-navigation-model': navigation,
    './use-navigation-locale': { useNavigationLocale: () => locale },
  });
  return compile(read('components/public-site-header.tsx'), {
    '@/components/site-navigation': { SiteNavigation },
  }).PublicSiteHeader({ locale });
}

function fixture(locale, width, changes = {}, tree = renderHeader(locale)) {
  const calls = [];
  const all = nodes(tree);
  assert.equal(all.filter(node => node.type === 'header' && hasClass(node, 'house-header--services')).length, 1);
  const actualLibrary = all.filter(node => node.type === 'a' && hasClass(node, 'site-library-entry'));
  const actualMenu = all.filter(node => node.type === 'details' && hasClass(node, 'site-main-menu'));
  assert.equal(actualMenu.length, 1);
  let open = actualMenu[0].props.open === true;
  const menuNodes = nodes(actualMenu[0]);
  const actualPanel = menuNodes.filter(node => hasClass(node, 'site-main-menu-panel'));
  assert.equal(actualPanel.length, 1);
  const actualCabinet = nodes(actualPanel[0]).filter(node => node.type === 'a' && node.props.href === `/${locale}/app`);
  const actualTrigger = menuNodes.filter(node => node.type === 'summary' && hasClass(node, 'site-main-menu-trigger'));
  assert.equal(actualTrigger.length, 1);
  const library = { count: actualLibrary.length, visible: true, href: actualLibrary[0]?.props.href, bounds: { x: 5, width: 90 }, ...changes.library };
  const cabinet = { count: actualCabinet.length, visible: true, href: actualCabinet[0]?.props.href, text: text(actualCabinet[0]), bounds: { x: 5, width: 120 }, ...changes.cabinet };
  for (const item of [library, cabinet]) {
    item.getAttribute = async name => { assert.equal(name, 'href'); return item.href; };
    item.boundingBox = async () => item.bounds;
    item.click = async () => assert.fail('Header acceptance must not navigate or enter authentication');
  }
  const trigger = { visible: true, bounds: { x: 230, width: 70 }, ...changes.trigger };
  trigger.boundingBox = async () => trigger.bounds;
  trigger.click = async () => { open = !open; calls.push(open ? 'open menu' : 'close menu'); };
  const menu = { locator(selector) {
    if (selector === 'summary.site-main-menu-trigger') return trigger;
    assert.equal(selector, `.site-main-menu-panel a[href="/${locale}/app"]`);
    return cabinet;
  } };
  const header = { locator(selector) {
    if (selector === 'a.site-library-entry') return library;
    assert.equal(selector, 'details.site-main-menu'); return menu;
  } };
  const page = { locator(selector) { assert.equal(selector, 'header.house-header--services'); return header; } };
  const expect = item => ({
    toHaveCount: async n => assert.equal(item.count, n),
    toHaveText: async expected => assert.equal(item.text, expected),
    toHaveAttribute: async (name, value) => { assert.equal(name, 'open'); assert.equal(value, ''); assert.equal(open, true); },
    not: { toHaveAttribute: async () => assert.equal(open, false) },
  });
  const visible = async item => { assert.equal(item.visible, true); if (item === cabinet) assert.equal(open, true); };
  return async () => {
    await verify(page, expect, visible, assert, locale, width);
    assert.equal(open, false, 'Menu closes before remaining layout checks');
    assert.deepEqual(calls, ['open menu', 'close menu'], 'Public header proof never follows the authenticated app link');
  };
}

for (const locale of ['en', 'ru']) for (const width of [320, 360, 390, 1188]) {
  test(`canonical source header retains Library and reachable Cabinet ${locale}/${width}`, fixture(locale, width));
}
for (const [locale, label, href] of [['en', 'Cabinet', '/en/app'], ['ru', 'Кабинет', '/ru/app'], ['es', 'Gabinete', '/en/app']]) {
  test(`${locale} actual header keeps its exact Cabinet label and private-locale route`, () => {
    const entry = nodes(renderHeader(locale)).filter(node => node.type === 'a' && node.props['data-nav-item'] === 'house');
    assert.equal(entry.length, 1);
    assert.equal(text(entry[0]), label);
    assert.equal(entry[0].props['aria-label'], label);
    assert.equal(entry[0].props.href, href);
    assert.equal(entry[0].props.prefetch, false, 'Do not prefetch the authenticated app');
  });
}
for (const [name, changes] of [
  ['hidden menu trigger', { trigger: { visible: false } }],
  ['overflowing menu trigger', { trigger: { bounds: { x: 300, width: 70 } } }],
  ['missing Library', { library: { count: 0 } }],
  ['wrong Library locale', { library: { href: '/ru/library' } }],
  ['hidden Library', { library: { visible: false } }],
  ['overflowing Library', { library: { bounds: { x: 300, width: 90 } } }],
  ['missing Cabinet', { cabinet: { count: 0 } }],
  ['duplicate Cabinet', { cabinet: { count: 2 } }],
  ['hidden Cabinet', { cabinet: { visible: false } }],
  ['wrong Cabinet route', { cabinet: { href: '/en/client' } }],
  ['wrong Cabinet locale', { cabinet: { href: '/ru/app' } }],
  ['auth endpoint instead of Cabinet', { cabinet: { href: '/api/auth/signin' } }],
  ['external Cabinet route', { cabinet: { href: 'https://example.invalid/en/app' } }],
  ['wrong Cabinet label', { cabinet: { text: 'Library' } }],
  ['stale English Cabinet label', { cabinet: { text: 'My House' } }],
  ['overflowing Cabinet', { cabinet: { bounds: { x: -20, width: 90 } } }],
]) test(`header acceptance rejects ${name}`, async () => { await assert.rejects(fixture('en', 320, changes)); });

for (const [locale, current, stale] of [['en', 'Cabinet', 'My House'], ['ru', 'Кабинет', 'Мой дом']]) {
  test(`${locale} acceptance rejects the retired label in actual navigation source`, async () => {
    const model = read('lib/site-navigation-model.js');
    const mutated = model.replace(`house: '${current}'`, `house: '${stale}'`);
    assert.notEqual(mutated, model);
    await assert.rejects(fixture(locale, 320, {}, renderHeader(locale, mutated)));
  });
}
test('acceptance rejects an auth route in actual navigation source', async () => {
  const model = read('lib/site-navigation-model.js');
  const mutated = model.replace("`/${selected === 'es' ? 'en' : selected}/app`", "'/api/auth/signin'");
  assert.notEqual(mutated, model);
  await assert.rejects(fixture('en', 320, {}, renderHeader('en', mutated)));
});

test('retired cabinet shortcut is not used and unrelated strict assertions remain', () => {
  assert.ok(!source.includes('a.site-cabinet-entry'));
  assert.ok(source.includes('await assertViewport(page, locale + "/services/" + width)'));
  assert.ok(source.includes('assert.deepEqual(diagnostics.pageErrors, []'));
  assert.ok(source.includes('"Unexpected browser console errors"'));
});
