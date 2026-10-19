import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import * as model from '../lib/site-navigation-model.js';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const source = read('scripts/verify-ia-v2.mjs');
const helper = source.slice(source.indexOf('function expectedMobileNavigation('), source.indexOf('async function verifyDirectNavigation('));
const component = read('components/mobile-bottom-navigation.tsx');
const jsx = (type, props) => typeof type === 'function' ? type(props || {}) : { type, props: props || {} };
const nodes = tree => !tree || typeof tree !== 'object' ? [] : Array.isArray(tree) ? tree.flatMap(nodes) : [tree, ...nodes(tree.props.children)];
const text = tree => tree == null || typeof tree === 'boolean' ? '' : typeof tree !== 'object' ? String(tree) : Array.isArray(tree) ? tree.map(text).join('') : text(tree.props.children);
function render(locale, pathname) {
  const imports = {
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'next/link': { default: props => jsx('a', props) },
    'next/navigation': { usePathname: () => pathname },
    react: { useEffect() {}, useRef: () => ({ current: null }) },
    'lucide-react': new Proxy({}, { get: () => () => null }),
    '@/lib/site-navigation-model': model,
    './use-navigation-locale': { useNavigationLocale: () => locale },
  };
  const exports = {};
  runInNewContext(ts.transpileModule(component, { fileName: 'mobile-bottom-navigation.tsx', compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText, {
    exports, require(name) { assert.ok(Object.hasOwn(imports, name), name); return imports[name]; },
  });
  return exports.MobileBottomNavigation({ initialLocale: locale });
}
async function scenario(locale, surface, fault, visible = true) {
  const pathname = surface === 'home' ? locale === 'en' ? '/' : '/' + locale : '/' + locale + '/' + surface;
  const tree = render(locale, pathname);
  const anchors = nodes(tree).filter(node => node.type === 'a');
  assert.equal(anchors.length, 6);
  assert.ok(anchors.every(node => node.props.prefetch === false), 'No speculative tests or cabinet navigation');
  if (fault === 'old courses slot') { anchors[4].props['data-nav-item'] = 'courses'; anchors[4].props.href = '/' + locale + '/courses'; }
  if (fault === 'old cabinet slot') { anchors[5].props['data-nav-item'] = 'cabinet'; anchors[5].props.href = '/' + locale + '/client'; }
  if (fault === 'wrong events destination') anchors[4].props.href = '/' + locale + '/client';
  if (fault === 'wrong house destination') anchors[5].props.href = '/es/app';
  if (fault === 'wrong events label') anchors[4].props.children = 'My tests';
  if (fault === 'wrong house label') anchors[5].props.children = 'My House';
  if (fault === 'wrong accessible name') anchors[4].props['aria-label'] = 'Wrong';
  if (fault === 'missing link') anchors.pop();
  if (fault === 'extra link') anchors.push({ type: 'a', props: { href: '/extra', 'data-nav-item': 'extra' } });
  if (fault === 'wrong order') [anchors[4], anchors[5]] = [anchors[5], anchors[4]];
  if (fault === 'missing active') anchors.forEach(node => delete node.props['aria-current']);
  if (fault === 'duplicate active') anchors[0].props['aria-current'] = 'page';
  if (fault === 'wrong active') { anchors.forEach(node => delete node.props['aria-current']); anchors[5].props['aria-current'] = 'page'; }
  const collection = selected => ({ selected, nth: index => collection([selected[index]].filter(Boolean)),
    async evaluateAll(fn) { return fn(selected.map(node => ({ getAttribute: name => node.props[name] ?? null }))); } });
  const bottom = { async isVisible() { return visible; }, locator(selector) {
    if (selector === '[data-nav-item]') return collection(anchors);
    if (selector === '[aria-current="page"]') return collection(anchors.filter(node => node.props['aria-current'] === 'page'));
    const id = selector.match(/^\[data-nav-item="([^"]+)"\]$/)?.[1];
    assert.ok(id, selector); return collection(anchors.filter(node => node.props['data-nav-item'] === id));
  } };
  const expect = actual => ({
    async toHaveCount(count) { assert.equal(actual.selected.length, count); },
    async toHaveText(label) { assert.equal(actual.selected.length, 1); assert.equal(text(actual.selected[0]), label); },
    async toHaveAccessibleName(label) { assert.equal(visible, true, 'Hidden desktop navigation does not have an accessible name'); assert.equal(actual.selected.length, 1); assert.equal(actual.selected[0].props['aria-label'] ?? text(actual.selected[0]), label); },
    async toHaveAttribute(name, value) { assert.equal(actual.selected.length, 1); assert.equal(actual.selected[0].props[name], value); },
  });
  const verify = new Function('assert', 'expect', 'getCompactNavigation', helper + '; return assertPublicBottomNavigation;')(assert, expect, model.getCompactNavigation);
  await verify(bottom, { locale, surface: surface.startsWith('client') ? 'tests' : surface, label: pathname });
}
for (const locale of ['en', 'ru', 'es']) {
  for (const surface of ['home', 'library', 'services', 'academy', 'events', 'client', 'client/tests']) test(locale + '/' + surface + ' exact verifier accepts real JSX destinations, names and active state', () => scenario(locale, surface));
  for (const fault of ['old courses slot', 'old cabinet slot', 'wrong events destination', 'wrong house destination', 'wrong events label', 'wrong house label', 'wrong accessible name', 'missing link', 'extra link', 'wrong order', 'missing active', 'duplicate active', 'wrong active']) {
    test(locale + ' exact mobile verifier rejects ' + fault, () => assert.rejects(scenario(locale, 'client/tests', fault)));
  }
  test(locale + ' hidden desktop bottom bar retains exact labels without requiring hidden accessible names', () => scenario(locale, 'client/tests', undefined, false));
  test(locale + ' hidden desktop bottom bar rejects a stale label', () => assert.rejects(scenario(locale, 'client/tests', 'wrong events label', false)));
  for (const suffix of ['client/private-selector', 'client/tests/hidden', 'client/session']) test(locale + '/' + suffix + ' retains no public navigation', () => assert.equal(render(locale, '/' + locale + '/' + suffix), null));
}
for (const locale of ['en', 'ru']) test(locale + ' private account hides the public navigation', () => {
  for (const path of ['app', 'app/portrait', 'app/tests', 'app/course', 'prescriptions/private']) assert.equal(render(locale, '/' + locale + '/' + path), null);
});
test('real browser gates retain viewport, keyboard, privacy, error and unfiltered lifecycle checks', () => {
  assert.match(source, /for \(const suffix of \['client', 'client\/tests'\]\)/);
  assert.match(source, /for \(const width of \[320, 390, 768, 1280\]\)/);
  for (const engine of ['chromium', 'webkit']) assert.ok(source.includes("await verifyPublicDiscoveryNavigation(" + (engine === 'chromium' ? 'page' : 'sp') + ", '" + engine + "')"));
  assert.match(source, /await expect\(link\)\.toBeFocused\(\)/);
  assert.match(source, /box\.width >= 44 && box\.height >= 44/);
  assert.match(source, /if \(index < expected\.length - 1\) await link\.press\('Tab'\)/);
  assert.match(source, /await expect\(bottom\)\.toBeHidden\(\)/);
  assert.match(source, /response\.headers\(\)\['cache-control'\], \/no-store\//);
  assert.match(source, /response\.headers\(\)\['x-robots-tag'\], \/noindex\//);
  assert.match(source, /response\.headers\(\)\['referrer-policy'\], 'no-referrer'/);
  assert.match(source, /assert\.deepEqual\(errors, \[\]\)/);
  assert.doesNotMatch(source, /errors\.filter|errors\.splice|errors\.length\s*=/);
  assert.doesNotMatch(source, /mobileIds = \[[^\]]*'courses'/);
});
