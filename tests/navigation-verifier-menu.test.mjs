import { whatsappEnquiryUrl } from '../lib/whatsapp-enquiry.js';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import * as navigationModel from '../lib/site-navigation-model.js';
import * as acquisition from '../data/local-acquisition.js';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const ia = read('scripts/verify-ia-v2.mjs');
const release = read('scripts/verify-release-reaudit.mjs');
const directHelper = ia.slice(ia.indexOf('async function verifyDirectNavigation('), ia.indexOf('async function verifySiteMenu('));
const helper = ia.slice(ia.indexOf('async function verifySiteMenu('), ia.indexOf('async function verifyPublicHeaderMatrix('));
const origin = 'https://example.test';
const treeNodes = tree => !tree || typeof tree !== 'object' ? [] : Array.isArray(tree) ? tree.flatMap(treeNodes) : [tree, ...treeNodes(tree.props.children)];
const jsx = (type, props) => typeof type === 'function' ? type(props || {}) : { type, props: props || {} };
const link = props => jsx('a', props);
function loadComponent(path, modules) {
  const compiled = ts.transpileModule(read(path), { fileName: path, compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  runInNewContext(compiled, { exports, require: name => {
    assert.ok(Object.hasOwn(modules, name), 'Known component dependency: ' + name);
    return modules[name];
  } });
  return exports;
}
const common = {
  'react/jsx-runtime': { jsx, jsxs: jsx },
  'next/link': { default: link },
  'lucide-react': Object.fromEntries(['BookOpen', 'Menu', 'ClipboardCheck', 'GraduationCap', 'ArrowUpRight', 'ArrowRight', 'FileText', 'Flower2', 'PlayCircle', 'ChevronDown', 'Sparkles'].map(name => [name, () => null])),
};
let pathname = '/';
const { SiteNavigation } = loadComponent('components/site-navigation.tsx', {
  ...common,
  react: { useEffect() {}, useRef: () => ({ current: null }) },
  'next/navigation': { usePathname: () => pathname },
  '@/lib/ui-locale': { localePath: (path, locale) => '/' + locale + path, saveUiLocale() {} },
  '@/lib/public-locales': { hasSpanishCounterpart: () => true, publicCounterpart: (_path, locale) => locale === 'en' ? '/' : '/' + locale, savePublicLocale() {} },
  '@/lib/site-navigation-model': navigationModel,
  './compact-navigation-icons': { compactNavigationIcons: Object.fromEntries(navigationModel.compactNavigationIds.map(id => [id, () => null])) },
  './use-navigation-locale': { useNavigationLocale: locale => locale },
});
const { AcquisitionEventLink } = loadComponent('components/acquisition-event-link.tsx', { ...common, '@/data/local-acquisition': acquisition });
const { coreServiceOffers } = loadComponent('data/core-service-offers.ts', {});
const { ServicesSolutions } = loadComponent('components/services-solutions.tsx', {
  ...common,
  'next/image': { default: props => jsx('img', props) },
  '@/components/acquisition-event-link': { AcquisitionEventLink },
  '@/components/contact-channel-chooser': { ContactChannelChooser: () => jsx('button', {}) },
  '@/lib/whatsapp-enquiry': { whatsappEnquiryUrl },
  '@/data/core-service-offers': { coreServiceOffers },
  '@/data/service-video-library': { getServiceVideoWatchUrl: (id, locale) => '/' + locale + '/services/video/' + id },
  './services-solutions.module.css': { default: {} },
});
const { HolisticHouseHome } = loadComponent('components/holistic-house-home.tsx', {
  ...common, '@/data/local-acquisition': acquisition,
  '@/components/site-navigation': { SiteNavigation },
  '@/components/services-solutions': { ServicesSolutions },
  '@/components/acquisition-event-link': { AcquisitionEventLink },
  ...Object.fromEntries([
    ['static-portrait', 'StaticPortrait'], ['homepage-contact-cta', 'HomepageContactCta'],
    ['homepage-topic-journeys', 'HomepageTopicJourneys'],
    ['home-free-tests-banner', 'HomeFreeTestsBanner'], ['personal-testimonials', 'PersonalTestimonials'],
    ['site-video-player', 'SiteVideoPlayer'],
    ['sitewide-antistress-banner', 'TestSelectionCourseBanner'],
  ].map(([path, name]) => ['@/components/' + path, { [name]: () => null }])),
});

test('CSP history clicks the unique body About CTA despite the real header duplicate', () => {
  const tree = HolisticHouseHome({ locale: 'en' });
  const allAbout = treeNodes(tree).filter(node => node.type === 'a' && node.props.href === '/en/about');
  assert.equal(allAbout.length, 3, 'actual JSX reproduces the formerly ambiguous selector');
  const section = treeNodes(tree).filter(node => node.props.className === 'service-home-about');
  assert.equal(section.length, 1);
  const scoped = treeNodes(section).filter(node => node.type === 'a' && node.props.href === '/en/about');
  assert.equal(scoped.length, 1);
  assert.match(release, /const publicAbout = cspPage\.locator\('\.service-home-about a\[href="\/en\/about"\]'\);\s*await expect\(publicAbout\)\.toHaveCount\(1\);\s*await expect\(publicAbout\)\.toBeVisible\(\);\s*await publicAbout\.click\(\)/);
  assert.match(release, /Home to About must retain same-policy soft navigation/);
  assert.match(release, /assert\.deepEqual\(cspErrors, \[\]/);
});

const homeLabels = {
  en: ['Get a free written review', 'Take free self-checks', 'Ask about a session · from €50'],
  ru: ['Получить бесплатный разбор', 'Пройти бесплатные тесты', 'Запросить личную сессию · от €50'],
};
function assertHomeRoutes(tree, locale) {
  const nodes = treeNodes(tree);
  const actions = nodes.filter(node => node.type === 'a' && node.props['data-hero-cta']);
  assert.deepEqual(actions.map(node => [node.props['data-hero-cta'], node.props.href, node.props.children[0]]), [
    ['paid-sessions', '/' + locale + '/services#consultation', homeLabels[locale][2]],
    ['free-written-review', '/' + locale + '/services/free-situation-review', homeLabels[locale][0]],
    ['free-tests', '/' + locale + '/client/tests', homeLabels[locale][1]],
  ]);
  assert.deepEqual(actions.map(node => node.props.className), ['service-home-button service-home-button--primary', 'service-home-button service-home-button--secondary', 'service-home-selfcheck-link']);
  const freeStart = nodes.filter(node => node.props.id === 'free-start');
  assert.equal(freeStart.length, 1, 'Start free resolves to the actual photo service heading');
  const services = nodes.filter(node => node.props['data-core-service-offers'] === 'home');
  assert.equal(services.length, 1, 'Only the existing photographic services section is rendered');
  assertPhotoServices(services[0], locale);
  assert.ok(nodes.indexOf(actions[2]) < nodes.indexOf(services[0]));
}
function assertPhotoServices(section, locale) {
  const cards = treeNodes(section).filter(node => node.props['data-core-service-id']);
  const ids = ['situation', 'dao', 'alchemy', 'hypnotherapy'];
  const slugs = ['free-situation-review', 'dao-health-profile', 'alchemy-of-soul', 'hypnotherapy-course'];
  assert.deepEqual(cards.map(card => card.props['data-core-service-id']), ids, 'The original four photo service cards remain');
  cards.forEach((card, index) => {
    const nodes = treeNodes(card);
    const expectedHref = '/' + locale + '/services/' + slugs[index];
    const links = nodes.filter(node => node.type === 'a' && node.props.href === expectedHref);
    assert.equal(links.length, 3, 'Each photo card keeps linked photo, title and CTA: ' + ids[index]);
    const images = nodes.filter(node => node.type === 'img');
    assert.equal(images.length, 1, 'Each card retains its existing photograph: ' + ids[index]);
    assert.match(images[0].props.src, /^\/(?:images\/holistic-house|academy\/)/);
  });
}
for (const locale of ['en', 'ru']) {
  test(locale + ' homepage renders exact personal-session, free-review and self-check routes in owner-approved order', () => assertHomeRoutes(HolisticHouseHome({ locale }), locale));
}
for (const locale of ['en', 'ru']) {
  test(locale + ' existing photo cards keep both free services and two personal-work options', () => assertPhotoServices(ServicesSolutions({ locale, variant: 'home' }), locale));
}
for (const action of ['free-written-review', 'free-tests', 'paid-sessions']) {
  test('homepage route contract rejects wrong ' + action + ' destination', () => {
    const tree = HolisticHouseHome({ locale: 'en' });
    treeNodes(tree).find(node => node.props['data-hero-cta'] === action).props.href = '/wrong';
    assert.throws(() => assertHomeRoutes(tree, 'en'));
  });
}
for (const fault of ['wrong paid label', 'missing primary consultation class', 'missing free target', 'wrong Wu Xing route']) {
  test('homepage contract rejects ' + fault, () => {
    const tree = HolisticHouseHome({ locale: 'en' });
    const nodes = treeNodes(tree);
    if (fault === 'wrong paid label') nodes.find(node => node.props['data-hero-cta'] === 'paid-sessions').props.children[0] = 'Free call';
    if (fault === 'missing primary consultation class') nodes.find(node => node.props['data-hero-cta'] === 'paid-sessions').props.className = 'service-home-paid-link';
    if (fault === 'missing free target') nodes.find(node => node.props.id === 'free-start').props.id = 'missing';
    if (fault === 'wrong Wu Xing route') {
      const dao = nodes.find(node => node.props['data-core-service-id'] === 'dao');
      treeNodes(dao).find(node => node.type === 'a' && node.props.href === '/en/services/dao-health-profile').props.href = '/wrong';
    }
    assert.throws(() => assertHomeRoutes(tree, 'en'));
  });
}

test('header matrix preserves all widths and tests direct links against the actual CSS breakpoint', () => {
  assert.match(ia, /\[320, 360, 374, 375, 390, 430, 768, 1023, 1024, 1100, 1280\]/);
  assert.match(read('app/holistic-house-home.css'), /@media \(min-width: 768px\) and \(max-width: 1140px\)[\s\S]*?a:not\(\.site-cabinet-entry\) \{ display: none; \}/);
  assert.match(ia, /if \(width > 1140\)[\s\S]*?toBeVisible\(\)[\s\S]*?else \{[\s\S]*?\.site-navigation > a:not\(\.site-cabinet-entry\)[\s\S]*?toBeHidden\(\)/);
  assert.match(ia, /exact header destinations/);
  assert.match(ia, /await verifySiteMenu\(page, header, \{ locale, surface, label, expectedMenu, inViewport \}\)/);
  assert.match(ia, /assert\.deepEqual\(errors, \[\]\)/);
});


// The featured menu entry must describe the existing written, non-clinical
// service rather than an unspecified "Start free" action or a home anchor.
test('featured mobile menu action names and links to the actual free written review in all locales', () => {
  const savedPath = pathname;
  try {
    const cases = [
      ['en', 'Free situation review', 'Short questionnaire and drawing'],
      ['ru', 'Бесплатный разбор ситуации', 'Короткая анкета и рисунок'],
      ['es', 'Revisión gratuita de tu situación', 'Cuestionario y dibujo'],
    ];
    for (const [locale, title, detail] of cases) {
      pathname = locale === 'en' ? '/' : '/' + locale;
      const tree = SiteNavigation({ locale });
      const anchors = treeNodes(tree).filter(node => node.type === 'a');
      const expected = '/' + locale + '/services/free-situation-review';
      const direct = anchors.find(node => node.props.className === 'site-nav-free-entry');
      const featured = anchors.find(node => node.props['data-free-review-entry'] === 'menu');
      assert.equal(direct?.props.href, expected, locale + ': direct header entry');
      assert.equal(featured?.props.href, expected, locale + ': featured menu entry');
      assert.equal(featured?.props.className, 'site-main-menu-free');
      const titleNode = treeNodes(featured).find(node => node.props.className === 'site-main-menu-free__title');
      const detailNode = treeNodes(featured).find(node => node.props.className === 'site-main-menu-free__detail');
      assert.equal(titleNode?.props.children, title, locale + ': service title visible');
      assert.ok(detailNode?.props.children.includes(detail), locale + ': method and response visible');
      assert.equal(anchors.filter(node => node.props.href === expected).length, 2, locale + ': no duplicate menu destinations');
    }
  } finally {
    pathname = savedPath;
  }
});

test('the menu preserves tap targets and makes secondary navigation a compact two-column grid', () => {
  const styles = read('app/holistic-house-home.css');
  assert.match(styles, /\.site-navigation \.site-main-menu-more \{[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(styles, /\.site-navigation \.site-main-menu-more a \{[\s\S]*?min-height: 44px/);
  assert.match(styles, /max-height: min\(70dvh, calc\(100dvh - 220px\), 550px\)/);
  assert.match(styles, /\.site-main-menu-free__detail \{/);
});

async function menuScenario(locale, surface, fault) {
  const expectedMenu = ['/' + locale + '/services/free-situation-review', ...navigationModel.getCompactNavigation(locale).map(item => item.href), ...navigationModel.getSiteNavigation(locale).filter(item => ['library','relationships','courses','events'].includes(item.id)).map(item => item.href), '/' + locale + '/about'];
  pathname = surface === 'home' ? (locale === 'en' ? '/' : '/' + locale) : '/' + locale + '/' + surface;
  const tree = SiteNavigation({ locale });
  const menuTree = treeNodes(tree).find(node => node.type === 'details' && node.props.className === 'site-main-menu');
  const nodes = treeNodes(menuTree).filter(node => node.type === 'a');
  const actualHrefs = nodes.map(node => node.props.href);
  if (fault === 'wrong destination') actualHrefs[0] = '/wrong';
  if (fault === 'missing catalog destination') actualHrefs.splice(2, 1);
  if (fault === 'extra catalog destination') actualHrefs.push('/extra');
  const current = nodes.filter(node => node.props['aria-current'] === 'page');
  if (fault === 'missing active state') current.length = 0;
  if (fault === 'duplicate active state') current.push(nodes[0]);
  if (fault === 'wrong active surface') current[0] = nodes.find(node => node.props.href === '/' + locale + '/about');
  let open = false, focused, url = origin + '/' + locale + '/' + surface, clicked = false;
  const links = nodes.map((node, index) => ({ index, href: node.props.href }));
  const target = {
    count: fault === 'duplicate destination' ? 2 : 1,
    async click() { assert.ok(open); clicked = true; url = origin + this.href; if (fault !== 'route close') open = false; },
  };
  const trigger = {
    async focus() { focused = trigger; },
    async press(key) {
      if (key === 'Enter' && fault !== 'cannot open') open = !open;
      if (key === 'Tab') focused = fault === 'keyboard order' ? null : links[0];
    },
  };
  const menu = { count: fault === 'missing menu' ? 0 : 1, locator(selector) {
    if (selector === 'summary') return trigger;
    if (selector === 'a[aria-current="page"]') return { count: current.length, href: current[0]?.props.href };
    if (selector === '.site-main-menu-panel a') return {
      evaluateAll: async callback => callback(actualHrefs.map(href => ({ getAttribute: () => href }))),
      all: async () => links, first: () => links[0],
    };
    const match = selector.match(/^a\[href="([^"]+)"\]$/);
    assert.ok(match); target.href = match[1];
    assert.equal(nodes.filter(node => node.props.href === target.href).length, 1);
    return target;
  } };
  const header = { locator(selector) { assert.equal(selector, 'details.site-main-menu'); return menu; } };
  const page = { keyboard: { async press(key) {
    assert.equal(key, 'Escape');
    if (fault !== 'escape') open = false;
    focused = fault === 'focus return' ? null : trigger;
  } }, evaluate: async () => fault !== 'overflow' };
  const expect = actual => ({
    async toHaveCount(count) { assert.equal(actual.count, count); },
    async toHaveAttribute(name, value) { assert.equal(name, 'href'); assert.equal(actual.href, value); },
    async toHaveJSProperty(name, value) { assert.equal(actual, menu); assert.equal(name, 'open'); assert.equal(open, value); },
    async toBeFocused() { assert.equal(focused, actual); },
    async toHaveURL(expected) { assert.equal(actual, page); assert.equal(url, fault === 'wrong navigation' ? origin + '/wrong' : expected); },
  });
  const verify = new Function('assert', 'expect', 'origin', helper + ';return verifySiteMenu;')(assert, expect, origin);
  const bounded = [];
  await verify(page, header, { locale, surface, label: 'synthetic', expectedMenu, inViewport: async control => {
    assert.notEqual(fault, 'out of bounds'); bounded.push(control);
  } });
  assert.ok(clicked);
  assert.deepEqual(bounded, [trigger, ...links]);
}
for (const locale of ['en', 'ru', 'es']) {
  for (const surface of ['home', 'services', 'library']) test(`${locale}/${surface} verifier uses actual JSX menu destinations and navigates`, () => menuScenario(locale, surface));
}
for (const fault of ['wrong destination', 'missing catalog destination', 'extra catalog destination', 'missing active state', 'duplicate active state', 'wrong active surface', 'duplicate destination', 'missing menu', 'cannot open', 'keyboard order', 'escape', 'focus return', 'overflow', 'out of bounds', 'route close', 'wrong navigation']) {
  test('site-menu verifier rejects ' + fault, () => assert.rejects(menuScenario('en', 'home', fault)));
}

async function directScenario(locale, surface, fault) {
  pathname = surface === 'home' ? (locale === 'en' ? '/' : '/' + locale) : '/' + locale + '/' + surface;
  const tree = SiteNavigation({ locale });
  const direct = Array.from(tree.props.children).flat(Infinity).filter(node => node?.type === 'a');
  if (fault === 'wrong free review route') direct[0].props.href = '/wrong-free-route';
  if (fault === 'wrong services route') direct[1].props.href = '/wrong';
  if (fault === 'wrong About route') direct[2].props.href = '/wrong';
  if (fault === 'wrong cabinet route') direct[3].props.href = '/' + locale + '/library';
  if (fault === 'missing direct link') direct.splice(2, 1);
  if (fault === 'extra direct link') direct.push({ type: 'a', props: { href: '/' + locale + '/library' } });
  if (fault === 'missing data id') delete direct[1].props['data-nav-item'];
  if (fault === 'missing active state') delete direct[1].props['aria-current'];
  if (fault === 'duplicate active state') direct[2].props['aria-current'] = 'page';
  if (fault === 'wrong active surface') {
    delete direct[1].props['aria-current'];
    direct[2].props['aria-current'] = 'page';
  }
  if (fault === 'spurious library active state') direct[1].props['aria-current'] = 'page';
  const nav = { locator(selector) {
    const nodes = selector === ':scope > a' ? direct
      : selector === '[data-nav-item]' ? direct.filter(node => node.props['data-nav-item'])
      : selector === ':scope > a[aria-current="page"]' ? direct.filter(node => node.props['aria-current'] === 'page')
      : assert.fail('Unexpected direct selector: ' + selector);
    return { nodes, evaluateAll: async callback => callback(nodes.map(node => ({ getAttribute: name => node.props[name] ?? null }))) };
  } };
  const expect = actual => ({
    async toHaveCount(count) { assert.equal(actual.nodes.length, count); },
    async toHaveAttribute(name, value) { assert.equal(actual.nodes.length, 1); assert.equal(actual.nodes[0].props[name], value); },
  });
  const verify = new Function('assert', 'expect', directHelper + ';return verifyDirectNavigation;')(assert, expect);
  await verify(nav, { locale, surface, expected: navigationModel.getSiteNavigation(locale), label: 'synthetic' });
}
for (const locale of ['en', 'ru', 'es']) {
  for (const surface of ['home', 'services', 'library']) test(`${locale}/${surface} verifier checks actual direct JSX destinations and active state`, () => directScenario(locale, surface));
}
for (const fault of ['wrong free review route', 'wrong services route', 'wrong About route', 'wrong cabinet route', 'missing direct link', 'extra direct link', 'missing data id', 'missing active state', 'duplicate active state', 'wrong active surface', 'spurious library active state']) {
  test('direct header verifier rejects ' + fault, () => assert.rejects(directScenario('en', fault === 'spurious library active state' ? 'library' : 'services', fault)));
}

test('library audit checks the menu active link while preserving exact six-slot bottom navigation', () => {
  assert.match(ia, /verifyDirectNavigation\(nav, \{ locale, surface: 'library', expected, label:/);
  assert.match(ia, /const current = nav\.locator\('\.site-main-menu-panel a\[aria-current="page"\]'\);?\s*await expect\(current\)\.toHaveCount\(1\)/);
  assert.match(ia, /await expect\(current\)\.toHaveAttribute\('href', '\/' \+ locale \+ '\/books'\)/);
  assert.match(ia, /await expect\(nav\.locator\('\[data-nav-item\]'\)\)\.toHaveCount\(6\)/);
  assert.match(ia, /const cabinetEntry = header\.locator\('a\.site-cabinet-entry'\)/);
  assert.match(ia, /await expect\(nav\.locator\('\[aria-current="page"\]'\)\)\.toHaveCount\(1\)/);
});
