import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import * as navigationModel from '../lib/site-navigation-model.js';
import * as serviceCart from '../lib/commerce/cart.js';
import * as uiLocale from '../lib/ui-locale.js';
import { isSupportedLocale, getHomeopathyLocaleParams } from '../data/remedies.js';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const source = read('scripts/verify-es-public-site.mjs');
const helper = source.slice(source.indexOf('async function assertSpanishCourseCatalog('), source.indexOf('// Production-parity HTTPS browser checks.'));
const origin = 'https://127.0.0.1:3443';
const canonical = '/es/academy/free-ai-courses';
const jsx = (type, props) => typeof type === 'function' ? type(props || {}) : { type, props: props || {} };
const nodes = tree => !tree || typeof tree !== 'object' ? [] : Array.isArray(tree) ? tree.flatMap(nodes) : [tree, ...nodes(tree.props.children)];
const text = tree => tree == null || typeof tree === 'boolean' ? '' : typeof tree !== 'object' ? String(tree) : Array.isArray(tree) ? tree.map(text).join('') : text(tree.props.children);
const common = {
  'react/jsx-runtime': { jsx, jsxs: jsx },
  'next/link': { default: props => jsx('a', props) },
  'lucide-react': new Proxy({}, { get: () => () => null }),
  react: { useEffect() {}, useRef: () => ({ current: null }), useState: value => [value, () => assert.fail('No effect may run in a rendering fixture')] },
  './public-growth-courses.module.css': { default: new Proxy({}, { get: (_target, key) => String(key) }) },
};
function load(path, imports, transform = value => value) {
  const exports = {};
  runInNewContext(ts.transpileModule(transform(read(path)), { fileName: path, compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText, {
    exports, require(name) { assert.ok(Object.hasOwn(imports, name), name); return imports[name]; },
  });
  return exports;
}
// Use the real pure cart/catalog module, but never execute client effects or storage.
const { CartNavLink } = load('components/commerce/cart-nav-link.tsx', {
  ...common, '@/lib/commerce/cart': serviceCart,
  './cart-nav-link.module.css': { default: new Proxy({}, { get: (_target, key) => String(key) }) },
});
common['@/components/commerce/cart-nav-link'] = { CartNavLink };
common['./compact-navigation-icons'] = load('components/compact-navigation-icons.ts', common);
const discoveryTabs=load('components/discovery-section-tabs.tsx',{...common,'./discovery-section-tabs.module.css':{default:new Proxy({},{get:(_,key)=>String(key)})}});
common['@/components/discovery-section-tabs']=discoveryTabs;
const publicLocales = load('lib/public-locales.ts', {});
const { SiteNavigation } = load('components/site-navigation.tsx', {
  ...common, 'next/navigation': { usePathname: () => canonical },
  '@/lib/ui-locale': uiLocale, '@/lib/public-locales': publicLocales,
  '@/lib/site-navigation-model': navigationModel,
  './use-navigation-locale': { useNavigationLocale: locale => locale },
});
const { PublicSiteHeader } = load('components/public-site-header.tsx', {
  ...common, '@/components/site-navigation': { SiteNavigation },
  '@/components/mind-body-monitor-strip': { MindBodyMonitorStrip() { assert.fail('The catalog disables the assessment strip'); } },
});
const { PublicCourseCabinet } = load('components/public-course-cabinet.tsx', { ...common, '@/lib/app/client-fetch': { appFetch() { assert.fail('No private requests are allowed in this fixture'); } } });
const { PublicGrowthCourses } = load('components/public-growth-courses.tsx', {
  ...common,
  '@/components/public-site-header': { PublicSiteHeader },
  '@/components/public-course-cabinet': { PublicCourseCabinet },
  '@/components/app/course-14-day-overview': { default: props => { assert.equal(props.programId, 'stress'); return null; } },
});
const { MobileBottomNavigation } = load('components/mobile-bottom-navigation.tsx', {
  ...common, 'next/navigation': { usePathname: () => canonical },
  '@/lib/site-navigation-model': navigationModel, './use-navigation-locale': { useNavigationLocale: () => 'es' },
});
function matches(node, selector) {
  const tag = selector.match(/^[a-z][a-z0-9-]*/)?.[0];
  if (tag && node.type !== tag) return false;
  const id = selector.match(/#([a-z0-9-]+)/)?.[1];
  if (id && node.props.id !== id) return false;
  const cls = selector.match(/\.([a-z0-9-]+)/)?.[1];
  if (cls && !String(node.props.className || '').split(' ').includes(cls)) return false;
  for (const [, key, value] of selector.matchAll(/\[([a-z0-9-]+)(?:="([^"]*)")?\]/g)) {
    if (value === undefined ? !Object.hasOwn(node.props, key) : node.props[key] !== value) return false;
  }
  return true;
}
function query(tree, selector) {
  const parts = selector.split(/\s+/);
  let selection = Array.isArray(tree) ? tree : [tree];
  for (let index = 0; index < parts.length; index++) {
    if (parts[index] === '>') {
      const next = parts[++index];
      selection = selection.flatMap(node => [node.props.children].flat(Infinity)).filter(node => node && typeof node === 'object' && matches(node, next));
    } else selection = selection.flatMap(nodes).filter(node => matches(node, parts[index]));
  }
  return [...new Set(selection)];
}
// Model only visibility rules that affect these source-rendered controls. CSS
// selectors still include hidden nodes; role queries exclude closed disclosures
// and compact-width direct links, as the real browser does.
function visibleNodes(tree, width) {
  const visible = new Set();
  function visit(node, hidden = false, parent) {
    if (Array.isArray(node)) { for (const child of node) visit(child, hidden, parent); return; }
    if (!node || typeof node !== 'object') return;
    const classes = String(node.props.className || '').split(' ');
    const compactDirect = width <= 1140 && parent?.props.className === 'site-navigation'
      && node.type === 'a' && !classes.includes('site-library-entry');
    hidden ||= Boolean(node.props.hidden) || node.props['aria-hidden'] === 'true' || compactDirect;
    if (!hidden) visible.add(node);
    const children = [node.props.children].flat(Infinity);
    for (const child of children) visit(child, hidden || (node.type === 'details' && !node.props.open && child?.type !== 'summary'), node);
  }
  visit(tree);
  return visible;
}
async function scenario(fault, { width = 1365, verifier = helper } = {}) {
  const catalog = PublicGrowthCourses({ locale: 'es' });
  const bottom = MobileBottomNavigation({ initialLocale: 'es' });
  const metadata = jsx('link', { rel: 'canonical', href: 'https://holistichouse.vercel.app' + canonical });
  const tree = [catalog, bottom, metadata];
  const one = selector => { const selected = query(tree, selector); assert.equal(selected.length, 1, selector); return selected[0]; };
  if (fault === 'wrong canonical') metadata.props.href = 'https://holistichouse.vercel.app/es/courses';
  if (fault === 'duplicate canonical') tree.push({ ...metadata });
  if (fault === 'missing catalog') delete catalog.props['data-public-my-courses'];
  if (fault === 'duplicate catalog') tree.push({ ...catalog });
  if (fault === 'wrong language') catalog.props.lang = 'en';
  if (fault === 'wrong heading') one('h1').props.children = 'Mis cursos';
  const hero = one('section[aria-labelledby="courses-title"]');
  const heroStart = nodes(hero).find(node => node.type === 'a' && text(node) === 'Empezar gratis');
  const freeStart = one('.site-navigation > a.site-nav-free-entry');
  if (fault === 'wrong enrollment') heroStart.props.href = '/es/app/course?program=confidence';
  if (fault === 'missing hero') delete hero.props['aria-labelledby'];
  if (fault === 'duplicate hero') catalog.props.children.push({ ...hero });
  if (fault === 'missing hero action') heroStart.props.children = 'Start';
  if (fault === 'duplicate hero action') hero.props.children.push({ ...heroStart });
  if (fault === 'hidden hero action') heroStart.props.hidden = true;
  if (fault === 'wrong free-start destination') freeStart.props.href = '/en/app/course?program=stress';
  if (fault === 'wrong free-start label') freeStart.props.children = 'Start free';
  if (fault === 'wrong free-start accessible name') freeStart.props['aria-label'] = 'Start free';
  if (fault === 'missing free-start action') freeStart.props.className = 'missing';
  if (fault === 'duplicate free-start action') one('.site-navigation').props.children.push({ ...freeStart });
  if (fault === 'swapped free-start and enrollment') [freeStart.props.href, heroStart.props.href] = [heroStart.props.href, freeStart.props.href];
  if (fault === 'hidden heading') one('h1').props.hidden = true;
  if (fault === 'missing programme') delete one('[data-course-programme="stress"]').props['data-course-programme'];
  if (fault === 'extra programme') catalog.props.children.push(jsx('article', { 'data-course-programme': 'focus' }));
  if (fault === 'wrong stress label') one('[data-course-programme="stress"] h3').props.children = 'Confidence';
  if (fault === 'missing programme enrollment') one('[data-course-programme="stress"] a[href="/en/app/course?program=stress"]').props.href = '/en/app';
  if (fault === 'wrong detail route') nodes(catalog).find(node => node.type === 'a' && text(node) === 'Conocer Antiestrés').props.href = '/en/courses/antistress';
  if (fault === 'missing detail action') nodes(catalog).find(node => node.type === 'a' && text(node) === 'Conocer Antiestrés').props.children = 'Learn';
  if (fault === 'wrong methodology') nodes(catalog).find(node => node.type === 'a' && text(node) === 'Conocer el método OPORA').props.href = '/es/courses';
  if (fault === 'missing course cabinet') delete one('[data-course-cabinet]').props['data-course-cabinet'];
  if (fault === 'missing skill') one('[data-opora-stress-seven-skills] ol').props.children.pop();
  if (fault === 'missing daily plan') delete one('[data-opora-14-day-public-plan]').props['data-opora-14-day-public-plan'];
  if (fault === 'wrong active') one('[data-nav-item="academy"]').props['aria-current'] = undefined;
  if (fault === 'duplicate active') one('[data-nav-item="tests"]').props['aria-current'] = 'page';
  const visible = visibleNodes(tree, width);
  if (fault === 'wrong free-start visibility') {
    if (visible.has(freeStart)) visible.delete(freeStart);
    else visible.add(freeStart);
  }
  const locator = selected => ({ selected,
    locator: selector => locator(query(selected, selector)),
    getByRole(role, options) { return locator(selected.flatMap(nodes).filter(node =>
      visible.has(node) && (role === 'link' ? node.type === 'a' : node.type === 'h' + options.level) && (node.props['aria-label'] ?? text(node)) === options.name)); },
    async all() { return selected.map(node => locator([node])); },
  });
  const page = { ...locator(tree), viewportSize: () => ({ width, height: 900 }) };
  const expect = actual => ({
    async toHaveURL(url) { assert.equal(actual, page); assert.equal(url, origin + canonical); assert.notEqual(fault, 'legacy URL'); },
    async toHaveCount(count) { assert.equal(actual.selected.length, count); },
    async toHaveAttribute(name, value) { assert.equal(actual.selected.length, 1); assert.equal(actual.selected[0].props[name], value); },
    async toHaveAccessibleName(value) { assert.equal(actual.selected.length, 1); assert.equal(actual.selected[0].props['aria-label'] ?? text(actual.selected[0]), value); },
    async toBeHidden() { assert.equal(actual.selected.length, 1); assert.ok(!visible.has(actual.selected[0])); },
    async toHaveText(value) { assert.equal(actual.selected.length, 1); assert.equal(text(actual.selected[0]), value); },
    async toBeVisible() { assert.equal(actual.selected.length, 1); assert.ok(visible.has(actual.selected[0])); },
  });
  const response = { status: () => fault === 'redirect response' ? 308 : 200, url: () => origin + (fault === 'wrong response URL' ? '/es/courses' : canonical) };
  await new Function('assert', 'expect', 'origin', verifier + '; return assertSpanishCourseCatalog;')(assert, expect, origin)(page, response);
  const enrollment = nodes(catalog).filter(node => node.type === 'a' && node.props.href === '/en/app/course?program=stress');
  assert.ok(enrollment.length >= 4);
  assert.ok(enrollment.every(node => node.props.prefetch === false), 'The public catalog must not prefetch private enrollment');
  if (!fault) {
    const starts = nodes(catalog).filter(node => node.type === 'a' && text(node) === 'Empezar gratis');
    assert.equal(starts.length, 3, 'Real JSX includes the direct header, closed site menu and course hero actions');
    assert.equal(starts.filter(node => visible.has(node)).length, width > 1140 ? 2 : 1, 'Reproduce desktop collision and compact navigation visibility');
  }
}
for (const width of [390, 1365]) {
  test(width + 'px actual Spanish catalog and header JSX satisfy separately scoped free-start and enrollment contracts', () => scenario(undefined, { width }));
}
test('real header fixture exposes the old whole-catalog selector failure on desktop', async () => {
  const unscoped = helper.replace("const start = hero.getByRole(", "const start = catalog.getByRole(");
  assert.notEqual(unscoped, helper);
  await assert.rejects(scenario(undefined, { width: 1365, verifier: unscoped }));
  await scenario(undefined, { width: 390, verifier: unscoped });
});
test('desktop free-start verifier rejects a wrong accessible name', () => assert.rejects(scenario('wrong free-start accessible name')));
test('fixture compact-header breakpoint agrees with actual source CSS', () => {
  const css = read('app/holistic-house-home.css');
  assert.match(css, /@media \(max-width: 767px\)[\s\S]*?\.house-header--services \.site-navigation > a \{ display: none; \}/);
  assert.match(css, /@media \(min-width: 768px\) and \(max-width: 1140px\)[\s\S]*?> a:not\(\.site-library-entry\) \{ display: none; \}/);
});
for (const width of [390, 1365]) for (const fault of ['missing hero', 'duplicate hero', 'missing hero action', 'duplicate hero action', 'hidden hero action', 'wrong free-start destination', 'wrong free-start label', 'wrong free-start visibility', 'missing free-start action', 'duplicate free-start action', 'swapped free-start and enrollment', 'wrong canonical', 'duplicate canonical', 'missing catalog', 'duplicate catalog', 'wrong language', 'wrong heading', 'wrong enrollment', 'missing programme', 'extra programme', 'wrong stress label', 'missing programme enrollment', 'wrong detail route', 'missing detail action', 'wrong methodology', 'missing course cabinet', 'missing skill', 'missing daily plan', 'wrong active', 'duplicate active', 'legacy URL', 'hidden heading', 'redirect response', 'wrong response URL']) {
  test(width + 'px actual Spanish catalog verifier rejects ' + fault, () => assert.rejects(scenario(fault, { width })));
}
async function verifyLegacyRedirect(locale, transform) {
  const imports = { 'next/navigation': { permanentRedirect(path) { throw new Error('PERMANENT:' + path); }, notFound() { throw new Error('NOT_FOUND'); } },
    '@/data/remedies': { isSupportedLocale, getHomeopathyLocaleParams }, '@/data/site-metadata': { metadataBaseFor: () => new URL('https://holistichouse.vercel.app') },
    '@/lib/spanish-metadata': { spanishMetadata: () => ({}) } };
  const route = load(locale === 'es' ? 'app/es/courses/page.tsx' : 'app/[locale]/courses/page.tsx', imports, transform);
  await assert.rejects(async () => route.default({ params: Promise.resolve({ locale }) }), { message: 'PERMANENT:/' + locale + '/academy/free-ai-courses' });
}
for (const locale of ['en', 'ru', 'es']) {
  test(locale + ' legacy page executes its exact permanent canonical redirect', () => verifyLegacyRedirect(locale));
  test(locale + ' redirect verifier rejects an actual wrong-destination source mutation', () => assert.rejects(verifyLegacyRedirect(locale, value => value.replaceAll('/academy/free-ai-courses', '/academy/unrelated'))));
}
test('Spanish audit checks both redirect and direct canonical catalog without indexing the redirect', () => {
  const routes = source.match(/const routes = \[([^;]+)\];/)?.[1];
  assert.ok(routes.includes("'/es/courses'"));
  assert.ok(routes.includes("'/es/academy/free-ai-courses'"));
  assert.match(source, /await assertSpanishCourseCatalog\(page, response\)/);
  assert.match(source, /sitemapUrls\.includes\('https:\/\/holistichouse\.vercel\.app'\+path\)/);
  assert.match(source, /new URL\(href\)\.pathname === '\/es\/courses'/);
  assert.match(source, /assert\.deepEqual\(unselectedClientRequests,\[\]/);
  assert.match(source, /assert\.deepEqual\(errors,\[\]/);
  assert.match(read('app/[locale]/academy/[[...slug]]/page.tsx'), /if \(key === "free-ai-courses"\) return <PublicGrowthCourses locale=\{locale\} \/>/);
});

test('actual Spanish request observer blocks speculative EN/RU discovery roots and tests, but not explicit ES navigation', () => {
  const start = source.indexOf("        page.on('request', request => {");
  const end = source.indexOf('        // Do not abort', start);
  assert.ok(start >= 0 && end > start);
  const listeners = new Map();
  const page = { on: (name, listener) => listeners.set(name, listener) };
  const watcher = new Function('page', 'origin', 'URL', `let watchingUnselectedClients = true; const unselectedClientRequests = []; ${source.slice(start, end)}; return { records: unselectedClientRequests, selected() { watchingUnselectedClients = false; } };`)(page, origin, URL);
  const send = path => listeners.get('request')({ url: () => new URL(path, origin).href, resourceType: () => 'fetch' });
  for (const path of ['/es/client', '/es/client/tests', '/en/client/private-selector', '/ru/client/tests/nested', '/en/clientish', '/en/app', 'https://other.invalid/en/client/tests']) send(path);
  assert.deepEqual(watcher.records, []);
  const blocked = ['/en/client', '/ru/client/', '/en/client/tests', '/ru/client/tests/'];
  for (const path of blocked) send(path + '?_rsc=synthetic');
  assert.deepEqual(watcher.records, blocked.map(path => ({ path, resourceType: 'fetch' })));
  watcher.selected();
  for (const path of blocked) send(path);
  assert.equal(watcher.records.length, blocked.length, 'Explicit language selection stops only the unselected-request check');
});

test('actual sitemap assertions require the canonical origin and exact course URL, excluding the legacy redirect', () => {
  const routes = new Function(source.match(/const routes = \[[^;]+\];/)[0] + '; return routes;')();
  const start = source.indexOf('  const sitemapUrls =');
  const end = source.indexOf('  for(const slug of slugs)', start);
  assert.ok(start > 0 && end > start);
  const check = new Function('xml', 'routes', 'assert', 'URL', source.slice(start, end));
  const paths = routes.filter(path => !['/es/client', '/es/courses'].includes(path));
  const sitemap = rows => '<urlset>' + rows.map(href => '<url><loc>' + href + '</loc></url>').join('') + '</urlset>';
  const correct = paths.map(path => 'https://holistichouse.vercel.app' + path);
  assert.doesNotThrow(() => check(sitemap(correct), routes, assert, URL));
  for (const bad of [
    correct.map(href => href.replace('holistichouse.vercel.app', 'wrong.invalid')),
    correct.filter(href => !href.endsWith('/academy/free-ai-courses')),
    correct.map(href => href.endsWith('/academy/free-ai-courses') ? href + '/unrelated' : href),
    [...correct, 'https://holistichouse.vercel.app/es/courses'],
  ]) assert.throws(() => check(sitemap(bad), routes, assert, URL));
});

for (const [locale, label] of [['en', 'Cart'], ['ru', 'Корзина'], ['es', 'Carrito']]) {
  test(locale + ' real cart navigation renders localized empty state without client effects', () => {
    const cart = CartNavLink({ locale });
    assert.equal(cart.type, 'a');
    assert.equal(cart.props.href, '/' + locale + '/cart');
    assert.equal(cart.props['aria-label'], label + ' (0)');
    assert.equal(cart.props['data-nav-item'], 'cart');
    assert.equal(cart.props['data-cart-has-items'], 'false');
    assert.equal(text(cart), label);
  });
}
test('Spanish actual header includes one direct cart and its closed-menu counterpart', () => {
  const header = SiteNavigation({ locale: 'es' });
  const allCarts = query(header, 'a[data-nav-item="cart"]');
  assert.equal(allCarts.length, 2);
  assert.ok(allCarts.every(node => node.props.href === '/es/cart' && text(node) === 'Carrito'));
  const cart = query(header, '.site-navigation > a[data-nav-item="cart"]');
  assert.equal(cart.length, 1);
  assert.equal(cart[0].props.href, '/es/cart');
  assert.equal(cart[0].props['aria-label'], 'Carrito (0)');
});
test('catalog component loader still rejects an unknown import', () => {
  assert.throws(() => load('components/commerce/cart-nav-link.tsx', common,
    value => "import './unknown-synthetic-import';\n" + value), /unknown-synthetic-import/);
});
