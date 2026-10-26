import { whatsappEnquiryUrl } from '../lib/whatsapp-enquiry.js';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import * as navigationModel from '../lib/site-navigation-model.js';
import * as cart from '../lib/commerce/cart.js';
import * as homeSpace from '../lib/home-personal-space.mjs';
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
  runInNewContext(compiled, { exports, fetch: denied, XMLHttpRequest: denied, WebSocket: denied, require: name => {
    assert.ok(Object.hasOwn(modules, name), 'Known component dependency: ' + name);
    return modules[name];
  } });
  return exports;
}
const denied = () => assert.fail('No navigation, storage, account or transport in this fixture');
const publicSpace = Object.freeze({ status: 'idle', summary: null, open: false, openPanel: denied });
const hooks = { createContext: value => ({ value }), useContext: () => publicSpace, useCallback: fn => fn, useId: () => 'synthetic-search-id', useEffect() {}, useRef: value => ({ current: value }), useState: value => [value, denied] };
const common = {
  react: hooks,
  'react/jsx-runtime': { jsx, jsxs: jsx },
  'next/link': { default: link },
  'lucide-react': Object.fromEntries(['Archive', 'BookOpenCheck', 'BriefcaseBusiness', 'CalendarDays', 'ClipboardList', 'Flame', 'FlaskConical', 'Heart', 'HeartHandshake', 'House', 'Landmark', 'LockKeyhole', 'MessageCircle', 'Search', 'ShoppingBasket', 'UserRound', 'Users', 'X', 'BookOpen', 'Menu', 'ClipboardCheck', 'GraduationCap', 'ArrowUpRight', 'ArrowRight', 'FileText', 'Flower2', 'PlayCircle', 'ChevronDown', 'ChevronLeft', 'ChevronRight', 'ShieldCheck', 'Target', 'Sparkles'].map(name => [name, () => null])),
};
let pathname = '/';
const css = { default: new Proxy({}, { get: (_target, key) => String(key) }) };
const personalSpace = loadComponent('components/home-personal-space.tsx', {
  ...common, 'next/image': { default: props => jsx('img', props) },
  'next/navigation': { usePathname: () => pathname },
  '@/lib/app/client-fetch': { appFetch: denied }, '@/lib/native/client': { isNativeHolisticHouse: denied },
  '@/lib/home-personal-space.mjs': homeSpace, './home-personal-space.module.css': css,
});
const cartNav = loadComponent('components/commerce/cart-nav-link.tsx', { ...common,
  '@/lib/commerce/cart': cart, './cart-nav-link.module.css': css,
});
const siteSearch = loadComponent('components/site-search.tsx', { ...common,
  'next/navigation': { useRouter: () => ({ push: denied }) }, './site-search.module.css': css,
});
const compactIcons = loadComponent('components/compact-navigation-icons.ts', common);
const { SiteNavigation } = loadComponent('components/site-navigation.tsx', {
  ...common,
  react: hooks,
  'next/navigation': { usePathname: () => pathname },
  '@/lib/ui-locale': { localePath: (path, locale) => '/' + locale + path, saveUiLocale() {} },
  '@/lib/public-locales': { hasSpanishCounterpart: () => true, publicCounterpart: (_path, locale) => locale === 'en' ? '/' : '/' + locale, savePublicLocale() {} },
  '@/lib/site-navigation-model': navigationModel,
  '@/components/commerce/cart-nav-link': cartNav,
  '@/components/site-search': siteSearch,
  './compact-navigation-icons': compactIcons,
  './use-navigation-locale': { useNavigationLocale: locale => locale },
  './home-personal-space': personalSpace,

});
const { AcquisitionEventLink } = loadComponent('components/acquisition-event-link.tsx', { ...common, '@/data/local-acquisition': acquisition });
const { coreServiceOffers } = loadComponent('data/core-service-offers.ts', {});
const { ServicesSolutions } = loadComponent('components/services-solutions.tsx', {
  ...common,
  'next/image': { default: props => jsx('img', props) },
  '@/components/acquisition-event-link': { AcquisitionEventLink },
  '@/components/contact-channel-chooser': { ContactChannelChooser: () => jsx('button', {}) },
  '@/components/static-portrait': { StaticPortrait: () => jsx('img', {src:'/images/holistic-house/andy-about.png'}) },
  '@/lib/whatsapp-enquiry': { whatsappEnquiryUrl },
  '@/data/core-service-offers': { coreServiceOffers },
  '@/data/service-video-library': { getServiceVideoWatchUrl: (id, locale) => '/' + locale + '/services/video/' + id },
  './services-solutions.module.css': { default: {} },
});
const homeChildren = {
  '@/components/home-section-carousel': loadComponent('components/home-section-carousel.tsx', {
    ...common, 'next/image': { default: props => jsx('img', props) },
    '@/components/static-portrait': { StaticPortrait: props => jsx('img', props) },
    './services-conversion-hero.module.css': { default: {} },
  }),
  '@/components/home-more-disclosure': loadComponent('components/home-more-disclosure.tsx', {
    ...common, './home-more-disclosure.module.css': { default: {} },
    'next/dynamic': { default: (_loader, options) => { assert.equal(options.ssr, false); return denied; } },
  }),
  '@/components/home-featured-workspace': loadComponent('components/home-featured-workspace.tsx', {
    ...common, 'next/image': { default: props => jsx('img', props) },
    './home-featured-workspace.module.css': { default: {} },
    '@/components/home-personal-space': { useHomePersonalSpace: () => null },
  }),
};
const { HolisticHouseHome } = loadComponent('components/holistic-house-home.tsx', {
  ...common, ...homeChildren, '@/data/local-acquisition': acquisition,
  '@/components/site-navigation': { SiteNavigation },
  '@/components/home-personal-space': { HomePersonalSpaceProvider: ({children}) => children, HomePersonalSpaceCard: () => null },
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

function assertHomeRoutes(tree, locale) {
  const nodes = treeNodes(tree);
  const carousel = nodes.filter(node => node.props['data-home-section-carousel'] !== undefined);
  assert.equal(carousel.length, 1, 'One real current Home carousel');
  const actions = treeNodes(carousel).filter(node => node.type === 'a' && node.props['data-home-slide-action']);
  assert.equal(actions.length, 1, 'One current first-screen service action');
  assert.equal(actions[0].props.href, '/' + locale + '/services#consultation', 'Exact current consultation destination');
  assert.equal(actions[0].props['data-home-first-screen-cta'], 'paid', 'First current action is explicitly paid');
  assert.match(actions[0].props.children[0], /€50/, 'Current consultation is not misrepresented as free');
  const sectionLinks = treeNodes(carousel).filter(node => node.props['data-home-nav-section']);
  assert.deepEqual(sectionLinks.map(node => node.props.href), ['explore/energy', 'explore/love', 'explore/business', 'client/tests', 'books', 'app'].map(path => '/' + locale + '/' + path), 'All six actual section destinations');
  const topics = nodes.filter(node => node.props['data-home-topic-filter']);
  assert.deepEqual(topics.map(node => node.props.href), ['explore/energy', 'explore/love', 'explore/business', 'temple-support', 'services', 'academy'].map(path => '/' + locale + '/' + path), 'Current topic and catalogue links');
  for (const [id,path] of [['academy','academy'],['review','services/free-situation-review'],['reiki','academy/principles-of-energywork/learn'],['opora','courses/antistress']]) {
    const links = nodes.filter(node => node.props['data-home-offer-primary'] === id);
    assert.equal(links.length, 1, 'Actual public offer ' + id);
    assert.equal(links[0].props.href, '/' + locale + '/' + path, 'Exact current offer ' + id);
    assert.equal(links[0].props.prefetch, false, 'No speculative offer navigation');
  }
  assert.equal(nodes.filter(node => node.props['data-home-reports-cta']).length, 0, 'Anonymous public context does not expose reports');
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
  test(locale + ' homepage renders current consultation carousel and exact public learning/review routes', () => assertHomeRoutes(HolisticHouseHome({ locale }), locale));
}
for (const locale of ['en', 'ru']) {
  test(locale + ' existing photo cards keep both free services and two personal-work options', () => assertPhotoServices(ServicesSolutions({ locale, variant: 'home' }), locale));
}
for (const fault of ['missing carousel', 'wrong consultation destination', 'free consultation claim', 'missing paid indication', 'wrong tests route', 'missing Academy entry', 'wrong Academy route', 'wrong review route']) {
  test('current Home route contract rejects ' + fault, () => {
    const tree = HolisticHouseHome({ locale: 'en' }), nodes = treeNodes(tree);
    if (fault === 'missing carousel') delete nodes.find(node => node.props['data-home-section-carousel'] !== undefined).props['data-home-section-carousel'];
    if (fault === 'wrong consultation destination') nodes.find(node => node.props['data-home-slide-action']).props.href = '/wrong';
    if (fault === 'free consultation claim') nodes.find(node => node.props['data-home-slide-action']).props.children[0] = 'Free session';
    if (fault === 'missing paid indication') delete nodes.find(node => node.props['data-home-slide-action']).props['data-home-first-screen-cta'];
    if (fault === 'wrong tests route') nodes.find(node => node.props['data-home-nav-section'] === 'tests').props.href = '/wrong';
    if (fault === 'missing Academy entry') delete nodes.find(node => node.props['data-home-offer-primary'] === 'academy').props['data-home-offer-primary'];
    if (fault === 'wrong Academy route') nodes.find(node => node.props['data-home-offer-primary'] === 'academy').props.href = '/wrong';
    if (fault === 'wrong review route') nodes.find(node => node.props['data-home-offer-primary'] === 'review').props.href = '/wrong';
    assert.throws(() => assertHomeRoutes(tree, 'en'), error => error.code === 'ERR_ASSERTION');
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
      assert.equal(anchors.filter(node => node.props.href === expected).length, 3, locale + ': header, featured CTA and analysis tab reuse one approved service');
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
  const expectedMenu = ['/' + locale + '/services/free-situation-review', ...navigationModel.getCompactNavigation(locale).map(item => item.href), '/' + locale + '/shop', '/' + locale + '/cart', ...navigationModel.getSiteNavigation(locale).filter(item => ['energy','love','business','library','events'].includes(item.id)).map(item => item.href), '/' + locale + '/temple-insights', '/' + locale + '/services', '/' + locale + '/about'];
  pathname = surface === 'home' ? (locale === 'en' ? '/' : '/' + locale) : ['energy','love','business'].includes(surface) ? '/' + locale + '/explore/' + (surface) : '/' + locale + '/' + surface;
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
  const verify = new Function('assert', 'expect', 'origin', 'getSiteNavigation', helper + ';return verifySiteMenu;')(assert, expect, origin, navigationModel.getSiteNavigation);
  const bounded = [];
  await verify(page, header, { locale, surface, label: 'synthetic', expectedMenu, inViewport: async control => {
    assert.notEqual(fault, 'out of bounds'); bounded.push(control);
  } });
  assert.ok(clicked);
  assert.deepEqual(bounded, [trigger, ...links]);
}
for (const locale of ['en', 'ru', 'es']) {
  for (const surface of ['home', 'energy', 'love', 'business', 'library', 'academy']) test(`${locale}/${surface} verifier uses actual JSX menu destinations and navigates`, () => menuScenario(locale, surface));
}
for (const fault of ['wrong destination', 'missing catalog destination', 'extra catalog destination', 'missing active state', 'duplicate active state', 'wrong active surface', 'duplicate destination', 'missing menu', 'cannot open', 'keyboard order', 'escape', 'focus return', 'overflow', 'out of bounds', 'route close', 'wrong navigation']) {
  test('site-menu verifier rejects ' + fault, () => assert.rejects(menuScenario('en', 'home', fault)));
}

async function directScenario(locale, surface, fault, verifier = directHelper) {
  pathname = surface === 'home' ? (locale === 'en' ? '/' : '/' + locale) : ['energy','love','business'].includes(surface) ? '/' + locale + '/explore/' + (surface) : '/' + locale + '/' + surface;
  const tree = SiteNavigation({ locale });
  const direct = Array.from(tree.props.children).flat(Infinity).filter(node => node?.type === 'a');
  const controls = Array.from(tree.props.children).flat(Infinity).filter(node => node?.type === 'a' || node?.type === 'button');
  const cabinet = controls.find(node => node.props.className === 'site-cabinet-entry');
  assert.ok(cabinet, 'Real globally provided dialog control');
  if (fault === 'wrong free review route') direct[0].props.href = '/wrong-free-route';
  if (fault === 'wrong energy route') direct[1].props.href = '/wrong';
  if (fault === 'wrong About route') direct[4].props.href = '/wrong';
  if (fault === 'wrong cabinet kind') { cabinet.type = 'a'; cabinet.props.href = '/' + locale + '/app'; }
  if (fault === 'missing dialog') controls.splice(controls.indexOf(cabinet), 1);
  if (fault === 'duplicate dialog') controls.push({...cabinet});
  if (fault === 'wrong dialog target') cabinet.props['aria-controls'] = 'wrong-dialog';
  if (fault === 'wrong dialog type') cabinet.props['aria-haspopup'] = 'menu';
  if (fault === 'wrong dialog state') cabinet.props['aria-expanded'] = true;
  if (fault === 'wrong dialog label') cabinet.props['aria-label'] = 'Private dashboard';
  if (fault === 'missing top-level item') controls.splice(controls.indexOf(direct[1]), 1);
  if (fault === 'duplicate top-level item') controls.push({...direct[1]});
  if (fault === 'missing direct link') direct.splice(4, 1);
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
      : selector === ':scope > [data-nav-item]' ? controls.filter(node => node.props['data-nav-item'])
      : selector === '[data-nav-item]' ? treeNodes(tree).filter(node => node.props['data-nav-item'])
      : selector === ':scope > .site-cabinet-entry' ? controls.filter(node => node.props.className === 'site-cabinet-entry')
      : selector === ':scope > a[aria-current="page"]' ? direct.filter(node => node.props['aria-current'] === 'page')
      : assert.fail('Unexpected direct selector: ' + selector);
    return { nodes, evaluateAll: async callback => callback(nodes.map(node => ({ getAttribute: name => node.props[name] ?? null }))) };
  } };
  const expect = actual => ({
    async toHaveCount(count) { assert.equal(actual.nodes.length, count); },
    async toHaveAttribute(name, value) { assert.equal(actual.nodes.length, 1); assert.equal(String(actual.nodes[0].props[name]), value); },
    async toHaveJSProperty(name, value) { assert.equal(actual.nodes.length, 1); assert.equal(name, 'tagName'); assert.equal(actual.nodes[0].type.toUpperCase(), value); },
  });
  const verify = new Function('assert', 'expect', verifier + ';return verifyDirectNavigation;')(assert, expect);
  await verify(nav, { locale, surface, expected: navigationModel.getSiteNavigation(locale), label: 'synthetic' });
}
for (const locale of ['en', 'ru', 'es']) {
  for (const surface of ['home', 'energy', 'love', 'business', 'library']) test(`${locale}/${surface} verifier checks actual direct JSX destinations and active state`, () => directScenario(locale, surface));
}
for (const fault of ['wrong free review route', 'wrong energy route', 'wrong About route', 'wrong cabinet kind', 'missing dialog', 'duplicate dialog', 'wrong dialog target', 'wrong dialog type', 'wrong dialog state', 'wrong dialog label', 'missing top-level item', 'duplicate top-level item', 'missing direct link', 'extra direct link', 'missing data id', 'missing active state', 'duplicate active state', 'wrong active surface', 'spurious library active state']) {
  test('direct header verifier rejects ' + fault, () => assert.rejects(directScenario('en', fault === 'spurious library active state' ? 'library' : 'energy', fault)));
}

test('library audit checks the menu active link while preserving exact seven-slot bottom navigation', () => {
  assert.match(ia, /verifyDirectNavigation\(nav, \{ locale, surface: 'library', expected, label:/);
  assert.match(ia, /const current = nav\.locator\('\.site-main-menu-panel a\[aria-current="page"\]'\);?\s*await expect\(current\)\.toHaveCount\(1\)/);
  assert.match(ia, /await expect\(current\)\.toHaveAttribute\('href', '\/' \+ locale \+ '\/books'\)/);
  assert.match(ia, /await expect\(nav\.locator\('\[data-nav-item\]'\)\)\.toHaveCount\(7\)/);
  assert.match(ia, /const cabinetEntry = header\.locator\('\.site-cabinet-entry'\)/);
  assert.match(ia, /await expect\(nav\.locator\('\[aria-current="page"\]'\)\)\.toHaveCount\(0\)/);
});


test('direct verifier scopes top-level identities instead of silently hiding actual menu descendants', async () => {
  await directScenario('en', 'energy');
  assert.ok(directHelper.includes("nav.locator(':scope > [data-nav-item]')"));
  const descendantSelector = directHelper.replace("nav.locator(':scope > [data-nav-item]')", "nav.locator('[data-nav-item]')");
  await assert.rejects(directScenario('en', 'energy', undefined, descendantSelector), /exact header destinations/);
});

// Pure source-tree keyboard model: no browser focus, account load or dialog
// opening. The finite focus order is derived from actual top-level JSX children.
async function cabinetMatrixScenario(locale, width, fault) {
  pathname = '/' + locale + '/explore/energy';
  const tree = SiteNavigation({ locale });
  const top = Array.from(tree.props.children).flat(Infinity).filter(node => node && typeof node === 'object');
  const cabinet = top.find(node => node.props.className === 'site-cabinet-entry');
  const shop = top.find(node => node.props['data-nav-item'] === 'shop');
  const cart = top.find(node => node.props['data-nav-item'] === 'cart');
  const language = treeNodes(tree).find(node => node.type === 'summary' && node.props.className === 'site-language-menu-trigger');
  const labelClass = width <= 1023 ? 'site-cabinet-entry__compact' : 'site-cabinet-entry__full';
  const label = treeNodes(cabinet).find(node => node.props.className === labelClass);
  if (fault === 'wrong label') label.props.children = 'Cabinet';
  if (fault === 'hidden label') label.props.hidden = true;
  if (fault === 'missing label') label.props.className = 'retired-label';
  if (fault === 'wrong shop route') shop.props.href = '/wrong';
  if (fault === 'wrong cart route') cart.props.href = '/wrong';
  if (fault === 'missing shop') top.splice(top.indexOf(shop), 1);
  if (fault === 'duplicate cart') top.splice(top.indexOf(cart), 0, { ...cart });
  if (fault === 'hidden shop') shop.props.hidden = true;
  if (fault === 'hidden cart') cart.props.hidden = true;
  if (fault === 'extra focusable before language') top.splice(top.indexOf(cart) + 1, 0, jsx('button', { type: 'button' }));
  const visible = node => !node.props.hidden && (node === shop || node === cart ? width > 1140 :
    node.props.className === 'site-cabinet-entry__compact' ? width <= 1023 :
    node.props.className === 'site-cabinet-entry__full' ? width > 1023 : true);
  const focusOrder = top.flatMap(node => ['a', 'button'].includes(node.type) ? (visible(node) ? [node] : []) :
    node.props.className === 'site-language-switch' ? [language] : []).filter(node => node === cabinet || top.indexOf(node) > top.indexOf(cabinet) || node === language);
  let focused;
  const presses = [];
  const locator = selected => ({ selected,
    locator: selector => locator(selected.flatMap(treeNodes).filter(node => node.props.className === selector.slice(1))),
    async focus() { assert.equal(selected.length, 1); assert.equal(selected[0], cabinet, 'Only the initial control is focused directly'); focused = cabinet; },
    async press(key) { assert.equal(key, 'Tab'); assert.equal(selected.length, 1); assert.equal(focused, selected[0]); presses.push(selected[0]); focused = focusOrder[focusOrder.indexOf(focused) + 1]; },
  });
  const header = { locator(selector) {
    const id = selector.match(/^\.site-navigation > a\[data-nav-item="(shop|cart)"\]$/)?.[1];
    assert.ok(id, 'Exact desktop top-level focus target');
    return locator(top.filter(node => node.type === 'a' && node.props['data-nav-item'] === id));
  } };
  const expect = value => ({
    async toHaveCount(count) { assert.equal(value.selected.length, count, 'Exact matrix control count'); },
    async toHaveAttribute(name, expected) { assert.equal(value.selected.length, 1); assert.equal(String(value.selected[0].props[name]), expected, 'Exact matrix attribute ' + name); },
    async toHaveAccessibleName(expected) { assert.equal(value.selected.length, 1); assert.equal(value.selected[0].props['aria-label'], expected); },
    async toHaveText(expected) { assert.equal(value.selected.length, 1); assert.equal(value.selected[0].props.children, expected, 'Exact current visible label'); },
    async toBeVisible() { assert.equal(value.selected.length, 1); assert.ok(visible(value.selected[0]), 'Expected control remains visible'); },
    async toBeFocused() { assert.equal(value.selected.length, 1); assert.equal(focused, value.selected[0], 'Exact natural Tab focus order'); },
  });
  const source = ia.slice(ia.indexOf('async function verifyPublicCabinetControl('), ia.indexOf('async function verifyPublicHeaderMatrix('));
  const check = new Function('expect', source + '; return { verifyPublicCabinetControl, focusPublicLanguageMenu };')(expect);
  await check.verifyPublicCabinetControl(locator([cabinet]), { locale, width });
  await check.focusPublicLanguageMenu(header, locator([cabinet]), locator([language]), { locale, width });
  assert.deepEqual(presses, width > 1140 ? [cabinet, shop, cart] : [cabinet], 'Exactly two additional natural desktop Tabs, no skipped controls');
}
for (const locale of ['en', 'ru', 'es']) for (const width of [320, 767, 768, 1023, 1024, 1140, 1141, 1280]) {
  test(`${locale}/${width} current My Space label and exact natural language-menu focus path`, () => cabinetMatrixScenario(locale, width));
}
for (const fault of ['wrong label', 'hidden label', 'missing label', 'wrong shop route', 'wrong cart route', 'missing shop', 'duplicate cart', 'hidden shop', 'hidden cart', 'extra focusable before language']) {
  test('public header matrix rejects ' + fault, () => assert.rejects(cabinetMatrixScenario('ru', 1280, fault), error => error.code === 'ERR_ASSERTION'));
}
test('compact header matrix rejects an extra focusable control instead of skipping it', () => assert.rejects(cabinetMatrixScenario('es', 390, 'extra focusable before language'), /Exact natural Tab focus order/));
test('label and keyboard models use the actual existing CSS breakpoints', () => {
  const css = read('app/holistic-house-home.css');
  assert.match(css, /@media \(max-width: 1023px\)\s*\{\s*\.site-navigation \.site-cabinet-entry__full \{ display: none; \}\s*\.site-navigation \.site-cabinet-entry__compact \{ display: inline; \}/);
  assert.match(css, /@media \(min-width: 768px\) and \(max-width: 1140px\)[\s\S]*?a:not\(\.site-cabinet-entry\) \{ display: none; \}/);
});
