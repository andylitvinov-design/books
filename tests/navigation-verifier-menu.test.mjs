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
  'lucide-react': Object.fromEntries(['Download', 'Smartphone', 'BookOpen', 'Menu', 'ClipboardCheck', 'GraduationCap', 'ArrowUpRight', 'ArrowRight', 'FileText', 'Flower2', 'PlayCircle', 'ChevronDown', 'Sparkles', 'ChevronLeft', 'ChevronRight', 'ShieldCheck', 'Target', 'BriefcaseBusiness', 'ClipboardList', 'Heart', 'LockKeyhole', 'MessageCircle', 'UserRound', 'Users', 'X'].map(name => [name, () => null])),
};
let pathname = '/';
const rootLayout = read('app/layout.tsx');
assert.match(rootLayout, /<HomePersonalSpaceProvider locale=\{lang\}>\{children\}<\/HomePersonalSpaceProvider>/, 'RootLayout provides My Space on every public surface');
let personalSpace = { open: false, openPanel() {} };
const { HomePersonalSpaceNavEntry } = loadComponent('components/home-personal-space.tsx', {
  ...common,
  'next/image': { default: props => jsx('img', props) },
  'next/navigation': { usePathname: () => pathname },
  react: { createContext: value => ({ value }), useContext: () => personalSpace, useCallback: fn => fn, useEffect() {}, useRef: value => ({ current: value }), useState: value => [value, () => {}] },
  '@/lib/app/client-fetch': { appFetch() { throw new Error('No account request in navigation render'); } },
  '@/lib/native/client': { isNativeHolisticHouse: () => false },
  '@/lib/home-personal-space.mjs': { homeSpaceSummary() { throw new Error('No private summary in navigation render'); } },
  './home-personal-space.module.css': { default: {} },
});
const { SiteNavigation } = loadComponent('components/site-navigation.tsx', {
  ...common,
  react: { useEffect() {}, useRef: () => ({ current: null }) },
  'next/navigation': { usePathname: () => pathname },
  '@/lib/ui-locale': { localePath: (path, locale) => '/' + locale + path, saveUiLocale() {} },
  '@/lib/public-locales': { hasSpanishCounterpart: () => true, publicCounterpart: (_path, locale) => locale === 'en' ? '/' : '/' + locale, savePublicLocale() {} },
  '@/lib/site-navigation-model': navigationModel,
  '@/components/commerce/cart-nav-link': { CartNavLink: () => null },
  '@/components/site-search': { SiteSearch: () => null },
  './compact-navigation-icons': { compactNavigationIcons: Object.fromEntries(navigationModel.compactNavigationIds.map(id => [id, () => null])) },
  './use-navigation-locale': { useNavigationLocale: locale => locale },
  './home-personal-space': { HomePersonalSpaceNavEntry },
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
// Render the actual composed homepage sections; no-effect hooks model their
// initial render without dropping the routes the contracts inspect.
const initialHooks = { useEffect() {}, useRef: value => ({ current: value }), useState: value => [typeof value === 'function' ? value() : value, () => {}] };
const { HomeSectionCarousel } = loadComponent('components/home-section-carousel.tsx', {
  ...common, react: initialHooks,
  'next/image': { default: props => jsx('img', props) },
  '@/components/static-portrait': { StaticPortrait: props => jsx('img', props) },
  './services-conversion-hero.module.css': { default: {} },
});
const { HomeMoreDisclosure } = loadComponent('components/home-more-disclosure.tsx', {
  ...common, react: initialHooks, 'next/dynamic': { default: () => () => null },
  './home-more-disclosure.module.css': { default: {} },
});
let expandedHomeOffer = null;
const workspaceHooks = { ...initialHooks, useState: initial => [expandedHomeOffer ?? initial, next => { expandedHomeOffer = typeof next === 'function' ? next(expandedHomeOffer) : next; }] };
const { HomeFeaturedWorkspace } = loadComponent('components/home-featured-workspace.tsx', {
  ...common, react: workspaceHooks,
  'next/image': { default: props => jsx('img', props) },
  '@/components/home-personal-space': { useHomePersonalSpace: () => null },
  './home-featured-workspace.module.css': { default: {} },
});
const { FreeMobileAppBanner } = loadComponent('components/free-mobile-app-banner.tsx', {
  ...common, './free-mobile-app-banner.module.css': { default: {} },
});
const { HolisticHouseHome } = loadComponent('components/holistic-house-home.tsx', {
  ...common, '@/data/local-acquisition': acquisition,
  '@/components/free-mobile-app-banner': { FreeMobileAppBanner },
  '@/components/home-section-carousel': { HomeSectionCarousel },
  '@/components/home-more-disclosure': { HomeMoreDisclosure },
  '@/components/home-featured-workspace': { HomeFeaturedWorkspace },
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

// Owner's Oct24 seven-stage/Details-action revision supersedes the old hero
// trio and repeated home photo grid. Keep the original routes and paid/free
// distinctions; ServicesSolutions still has its own unchanged photo-card test.
const homeStages = ['courses', 'personality', 'situation', 'coaching', 'alchemy', 'energy', 'master'];
const homeOffers = {
  courses: ['reiki', 'opora', 'academy'], personality: ['profile'],
  situation: ['review', 'businessConstellations', 'constellations'],
  coaching: ['aiCoaching', 'therapist'], alchemy: ['alchemy'], energy: ['energy'], master: ['pro', 'service', 'course'],
};
function assertHomeRoutes(tree, locale) {
  const nodes = treeNodes(tree);
  const workspaces = nodes.filter(node => node.props['data-home-featured-workspace'] === true);
  assert.equal(workspaces.length, 1, 'one seven-stage workspace');
  assert.equal(nodes.filter(node => node.props['data-core-service-offers'] !== undefined).length, 0, 'superseded service grids must not duplicate the seven-stage homepage');
  assert.equal(nodes.filter(node => node.props['data-hero-cta'] !== undefined).length, 0, 'superseded hero CTA trio must not duplicate the approved homepage actions');
  const workspace = workspaces[0];
  assert.equal(workspace.props['data-home-journey-count'], 7);
  const modules = treeNodes(workspace).filter(node => node.props['data-home-module']);
  assert.deepEqual(modules.map(node => node.props['data-home-module']), homeStages, 'owner-approved seven stages in order');
  const steps = treeNodes(workspace).filter(node => node.type === 'a' && node.props.href?.startsWith('#home-immersion-'));
  assert.deepEqual(steps.map(node => node.props.href), homeStages.map(id => '#home-immersion-' + id));
  for (const [index, module] of modules.entries()) {
    assert.equal(module.props.id, 'home-immersion-' + homeStages[index], 'each step resolves to its real section');
    assert.deepEqual(treeNodes(module).filter(node => node.props['data-home-offer-card']).map(node => node.props['data-home-offer-card']), homeOffers[homeStages[index]], 'each stage retains its requested offers');
  }
  const account = '/' + (locale === 'es' ? 'en' : locale) + '/app';
  const routes = {
    reiki: '/' + locale + '/academy/principles-of-energywork/learn', opora: '/' + locale + '/courses/antistress', academy: '/' + locale + '/academy',
    profile: '/' + locale + '/personality-profiles', review: '/' + locale + '/services/free-situation-review',
    businessConstellations: '/' + locale + '/services/business-consulting', constellations: '/' + locale + '/services/systemic-constellations',
    aiCoaching: '/' + locale + '/coaching', therapist: '/' + locale + '/services#consultation',
    alchemy: '/' + locale + '/services/alchemy-of-soul', energy: '/' + locale + '/services/remote-energy-support',
    pro: '/' + locale + '/pro', service: account + '/practice?panel=services', course: account + '/practice?panel=materials&materialTab=courses',
  };
  const free = new Set(['reiki', 'opora', 'profile', 'review', 'aiCoaching']);
  for (const card of treeNodes(workspace).filter(node => node.props['data-home-offer-card'])) {
    const id = card.props['data-home-offer-card'], children = treeNodes(card);
    assert.equal(card.props['data-home-offer-free'], free.has(id) ? 'true' : undefined, id + ': only genuinely free offers are marked free');
    const actions = children.filter(node => node.props['data-home-offer-primary'] === id);
    assert.equal(actions.length, 1, id + ': one primary action');
    assert.equal(actions[0].type, 'a'); assert.equal(actions[0].props.href, routes[id], id + ': intended destination');
    assert.ok(actions[0].props['aria-label']?.trim(), id + ': accessible action name');
    if (free.has(id)) assert.match(actions[0].props['aria-label'], /free|бесплат|gratis/i, id + ': free action is labeled accurately');
    else assert.doesNotMatch(actions[0].props['aria-label'], /free|бесплат|gratis/i, id + ': paid or mixed-price offer is not labeled free');
    assert.equal(actions[0].props.onClick, undefined, id + ': primary link does not invoke an automatic booking or provider action');
    const buttons = children.filter(node => node.props['data-home-offer-details'] === id);
    assert.equal(buttons.length, 1); assert.equal(buttons[0].type, 'button'); assert.equal(buttons[0].props.type, 'button');
    assert.equal(buttons[0].props['aria-label'], {en:'Details',ru:'Детали',es:'Detalles'}[locale]);
    assert.equal(buttons[0].props['aria-expanded'], false); assert.equal(typeof buttons[0].props.onClick, 'function');
    const panels = children.filter(node => node.props.id === buttons[0].props['aria-controls']);
    assert.equal(panels.length, 1, id + ': Details controls its actual panel'); assert.equal(panels[0].props.hidden, true);
    const full = treeNodes(panels[0]).filter(node => node.type === 'a');
    assert.equal(full.length, 1); assert.equal(full[0].props.href, routes[id], id + ': Details and primary action agree');
    const images = children.filter(node => node.type === 'img'); assert.equal(images.length, 1, id + ': photographic offer retained');
    assert.match(images[0].props.src, /^\/(?:images\/holistic-house|academy\/)/);
    if (id === 'therapist') {
      assert.match(actions[0].props['aria-label'], /(?:€50|50 €)/, 'paid session retains its €50 starting price');
      const details = treeNodes(panels[0]).filter(node => node.type === 'p').map(node => node.props.children).join(' ');
      assert.match(details, /€50[^.]*30/); assert.match(details, /€100[^.]*60/);
    }
  }
  const paid = nodes.filter(node => node.props['data-home-first-screen-cta'] === 'paid');
  assert.equal(paid.length, 1); assert.equal(paid[0].type, 'a'); assert.equal(paid[0].props.href, '/' + locale + '/services#consultation');
  assert.match(paid[0].props.children[0], /€50/, 'first-screen paid request is not relabeled free');
  assert.doesNotMatch(paid[0].props.children[0], /free|бесплат/i);
  const tests = nodes.filter(node => node.props['data-home-nav-section'] === 'tests');
  assert.equal(tests.length, 1); assert.equal(tests[0].type, 'a'); assert.equal(tests[0].props.href, '/' + locale + '/client/tests');
  assert.equal(tests[0].props.children, {en:'Tests',ru:'Тесты'}[locale]);
  const filters = nodes.filter(node => node.props['data-home-topic-filter']);
  assert.deepEqual(filters.map(node => node.props['data-home-topic-filter']), ['energy','love','business','temple','services','courses'], 'lower repeated offers are compact topic/catalogue filters');
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
  test(locale + ' homepage preserves the owner-approved seven stages, actionable offers and free/paid routes', () => assertHomeRoutes(HolisticHouseHome({ locale }), locale));
}
for (const locale of ['en', 'ru']) {
  test(locale + ' existing photo cards keep both free services and two personal-work options', () => assertPhotoServices(ServicesSolutions({ locale, variant: 'home' }), locale));
}
for (const locale of ['en', 'ru']) {
  test(locale + ': composed homepage rejects the real superseded lower ServicesSolutions grid', () => {
    const tree = HolisticHouseHome({ locale });
    assertHomeRoutes(tree, locale);
    const grid = ServicesSolutions({ locale, variant: 'home' });
    assertPhotoServices(grid, locale); // Actual retained component, not a marker-only fake.
    const children = Array.from(tree.props.children);
    const index = children.findIndex(node => node?.props['data-home-featured-workspace'] === true);
    assert.ok(index >= 0);
    children.splice(index + 1, 0, grid);
    tree.props.children = children;
    assert.throws(() => assertHomeRoutes(tree, locale), { code: 'ERR_ASSERTION', message: /superseded service grids/ });
  });
  test(locale + ': composed homepage rejects the superseded hero CTA trio', () => {
    const tree = HolisticHouseHome({ locale });
    assertHomeRoutes(tree, locale);
    const oldActions = [
      ['paid-sessions', '/' + locale + '/services#consultation'],
      ['free-written-review', '/' + locale + '/services/free-situation-review'],
      ['free-tests', '/' + locale + '/client/tests'],
    ].map(([id, href]) => link({ 'data-hero-cta': id, href, children: id }));
    tree.props.children = [...Array.from(tree.props.children), jsx('section', { children: oldActions })];
    assert.throws(() => assertHomeRoutes(tree, locale), { code: 'ERR_ASSERTION', message: /superseded hero CTA trio/ });
  });
}

for (const [action, selector] of [
  ['free-written-review', node => node.props['data-home-offer-primary'] === 'review'],
  ['free-tests', node => node.props['data-home-nav-section'] === 'tests'],
  ['paid-sessions', node => node.props['data-home-first-screen-cta'] === 'paid'],
]) test('homepage route contract rejects wrong ' + action + ' destination', () => {
  const tree = HolisticHouseHome({ locale: 'en' });
  assertHomeRoutes(tree, 'en');
  treeNodes(tree).find(selector).props.href = '/wrong';
  assert.throws(() => assertHomeRoutes(tree, 'en'), { code: 'ERR_ASSERTION' });
});
for (const fault of ['wrong paid price', 'missing first-screen paid action', 'missing seventh stage', 'wrong business constellation route', 'paid session marked free', 'missing Details action', 'wrong Details destination', 'missing stage anchor']) {
  test('homepage contract rejects ' + fault, () => {
    const tree = HolisticHouseHome({ locale: 'en' });
    assertHomeRoutes(tree, 'en');
    const nodes = treeNodes(tree);
    if (fault === 'wrong paid price') nodes.find(node => node.props['data-home-first-screen-cta'] === 'paid').props.children[0] = 'Free call';
    if (fault === 'missing first-screen paid action') delete nodes.find(node => node.props['data-home-first-screen-cta'] === 'paid').props['data-home-first-screen-cta'];
    if (fault === 'missing seventh stage') delete nodes.find(node => node.props['data-home-module'] === 'master').props['data-home-module'];
    if (fault === 'wrong business constellation route') nodes.find(node => node.props['data-home-offer-primary'] === 'businessConstellations').props.href = '/wrong';
    if (fault === 'paid session marked free') nodes.find(node => node.props['data-home-offer-card'] === 'therapist').props['data-home-offer-free'] = 'true';
    if (fault === 'missing Details action') delete nodes.find(node => node.props['data-home-offer-details'] === 'review').props['data-home-offer-details'];
    if (fault === 'wrong Details destination') treeNodes(nodes.find(node => node.props.id === 'home-offer-info-review')).find(node => node.type === 'a').props.href = '/wrong';
    if (fault === 'missing stage anchor') nodes.find(node => node.props.id === 'home-immersion-situation').props.id = 'missing';
    assert.throws(() => assertHomeRoutes(tree, 'en'), { code: 'ERR_ASSERTION' });
  });
}

for (const locale of ['en', 'ru']) test(locale + ': real Details actions open, switch and close without changing the primary routes', () => {
  try {
    expandedHomeOffer = null;
    assertHomeRoutes(HolisticHouseHome({ locale }), locale);
    let nodes = treeNodes(HomeFeaturedWorkspace({ locale }));
    const read = id => ({ button: nodes.find(node => node.props['data-home-offer-details'] === id), panel: nodes.find(node => node.props.id === 'home-offer-info-' + id) });
    read('review').button.props.onClick();
    nodes = treeNodes(HomeFeaturedWorkspace({ locale }));
    assert.equal(read('review').button.props['aria-expanded'], true); assert.equal(read('review').panel.props.hidden, false);
    assert.equal(read('review').button.props['aria-label'], {en:'Hide details',ru:'Скрыть детали'}[locale]);
    assert.equal(nodes.find(node => node.props['data-home-offer-primary'] === 'review').props.href, '/' + locale + '/services/free-situation-review');
    read('therapist').button.props.onClick();
    nodes = treeNodes(HomeFeaturedWorkspace({ locale }));
    assert.equal(read('review').button.props['aria-expanded'], false); assert.equal(read('review').panel.props.hidden, true);
    assert.equal(read('therapist').button.props['aria-expanded'], true); assert.equal(read('therapist').panel.props.hidden, false);
    read('therapist').button.props.onClick();
    nodes = treeNodes(HomeFeaturedWorkspace({ locale }));
    assert.equal(read('therapist').button.props['aria-expanded'], false); assert.equal(read('therapist').panel.props.hidden, true);
    assertHomeRoutes(HolisticHouseHome({ locale }), locale);
  } finally { expandedHomeOffer = null; }
});

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
  const expectedMenu = ['/' + locale + '/services/free-situation-review', ...navigationModel.getCompactNavigation(locale).map(item => item.href), '/' + locale + '/shop', '/' + locale + '/cart', '/' + locale + '/install', ...navigationModel.getSiteNavigation(locale).filter(item => ['energy','love','business','library','events'].includes(item.id)).map(item => item.href), '/' + locale + '/temple-insights', '/' + locale + '/services', '/' + locale + '/about'];
  pathname = surface === 'home' ? (locale === 'en' ? '/' : '/' + locale) : ['energy','love','business'].includes(surface) ? '/' + locale + '/explore/' + (surface) : '/' + locale + '/' + surface;
  const tree = SiteNavigation({ locale });
  const menuTree = treeNodes(tree).find(node => node.type === 'details' && node.props.className === 'site-main-menu');
  const nodes = treeNodes(menuTree).filter(node => node.type === 'a');
  const actualHrefs = nodes.map(node => node.props.href);
  if (fault === 'wrong destination') actualHrefs[0] = '/wrong';
  if (fault === 'missing catalog destination') actualHrefs.splice(2, 1);
  if (fault === 'extra catalog destination') actualHrefs.push('/extra');
  const installIndex = actualHrefs.indexOf('/' + locale + '/install');
  if (fault === 'missing install') actualHrefs.splice(installIndex, 1);
  if (fault === 'wrong install') actualHrefs[installIndex] = '/' + locale + '/wrong-install';
  if (fault === 'cross-locale install') actualHrefs[installIndex] = '/' + (locale === 'en' ? 'ru' : 'en') + '/install';
  if (fault === 'duplicate install') actualHrefs.splice(installIndex, 0, actualHrefs[installIndex]);
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
  test('site-menu verifier rejects ' + fault, async () => {
    await menuScenario('en', 'home');
    await assert.rejects(menuScenario('en', 'home', fault), { code: 'ERR_ASSERTION' });
  });
}

async function directScenario(locale, surface, fault) {
  pathname = surface === 'home' ? (locale === 'en' ? '/' : '/' + locale) : ['energy','love','business'].includes(surface) ? '/' + locale + '/explore/' + (surface) : '/' + locale + '/' + surface;
  const tree = SiteNavigation({ locale });
  const direct = Array.from(tree.props.children).flat(Infinity).filter(node => node?.type === 'a');
  const controls = Array.from(tree.props.children).flat(Infinity).filter(node => node?.type === 'a' || node?.type === 'button');
  if (fault === 'wrong free review route') direct[0].props.href = '/wrong-free-route';
  if (fault === 'wrong energy route') direct[1].props.href = '/wrong';
  if (fault === 'wrong About route') direct[4].props.href = '/wrong';
  if (fault === 'wrong cabinet route') controls.find(node => node.props['data-nav-item'] === 'cabinet').props.href = '/' + locale + '/library';
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
      : selector === '[data-nav-item]' ? controls.filter(node => node.props['data-nav-item'])
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
  for (const surface of ['home', 'energy', 'love', 'business', 'library']) test(`${locale}/${surface} verifier checks actual direct JSX destinations and active state`, () => directScenario(locale, surface));
}
for (const fault of ['wrong free review route', 'wrong energy route', 'wrong About route', 'wrong cabinet route', 'missing direct link', 'extra direct link', 'missing data id', 'missing active state', 'duplicate active state', 'wrong active surface', 'spurious library active state']) {
  test('direct header verifier rejects ' + fault, async () => {
    const surface = fault === 'spurious library active state' ? 'library' : 'energy';
    await directScenario('en', surface);
    await assert.rejects(directScenario('en', surface, fault), { code: 'ERR_ASSERTION' });
  });
}

test('library audit checks the menu active link while preserving exact seven-slot bottom navigation', () => {
  assert.match(ia, /verifyDirectNavigation\(nav, \{ locale, surface: 'library', expected, label:/);
  assert.match(ia, /const current = nav\.locator\('\.site-main-menu-panel a\[aria-current="page"\]'\);?\s*await expect\(current\)\.toHaveCount\(1\)/);
  assert.match(ia, /await expect\(current\)\.toHaveAttribute\('href', '\/' \+ locale \+ '\/library'\)/);
  assert.match(ia, /await expect\(nav\.locator\('\[data-nav-item\]'\)\)\.toHaveCount\(7\)/);
  assert.match(ia, /const cabinetEntry = header\.locator\('\.site-cabinet-entry'\)/);
  assert.match(ia, /await expect\(nav\.locator\('\[aria-current="page"\]'\)\)\.toHaveCount\(0\)/);
});

test('the actual My Space entry preserves its provider-free Cabinet fallback', () => {
  const previous = personalSpace;
  try {
    for (const locale of ['en', 'ru', 'es']) {
      const href = '/' + (locale === 'es' ? 'en' : locale) + '/app';
      personalSpace = previous;
      const trigger = HomePersonalSpaceNavEntry({ locale, href });
      assert.equal(trigger.type, 'button');
      assert.equal(trigger.props['aria-controls'], 'home-personal-space-dialog');
      assert.equal(trigger.props.href, undefined);
      personalSpace = null;
      const fallback = HomePersonalSpaceNavEntry({ locale, href });
      assert.equal(fallback.type, 'a');
      assert.equal(fallback.props.href, href);
    }
  } finally { personalSpace = previous; }
});

// This tests verifier semantics against real entry JSX, not CSS visibility.
// Native responsive visibility remains a hosted-browser acceptance assertion.
async function mySpaceMatrixScenario(locale, width, fault) {
  const tree = HomePersonalSpaceNavEntry({ locale, href: '/' + (locale === 'es' ? 'en' : locale) + '/app' });
  const selectedClass = width <= 1023 ? 'site-cabinet-entry__compact' : 'site-cabinet-entry__full';
  const selected = treeNodes(tree).find(node => node.props.className === selectedClass);
  assert.ok(selected, 'real entry supplies its responsive label');
  if (fault === 'missing dialog semantics') delete tree.props['aria-haspopup'];
  if (fault === 'wrong dialog target') tree.props['aria-controls'] = 'wrong-dialog';
  if (fault === 'wrong initial expanded state') tree.props['aria-expanded'] = true;
  if (fault === 'wrong accessible name') tree.props['aria-label'] = 'Cabinet';
  if (fault === 'wrong localized label') selected.props.children = 'Cabinet';
  if (fault === 'missing responsive label') selected.props.className = 'wrong-label';
  const cabinetEntry = { node: tree, locator(selector) {
    const node = treeNodes(tree).find(item => '.' + item.props.className === selector);
    assert.ok(node, 'selected label exists in real JSX'); return { node, visible: selector === '.' + selectedClass };
  } };
  const expect = item => ({
    toHaveAttribute: async (name, value) => assert.equal(String(item.node.props[name]), value),
    toHaveAccessibleName: async value => assert.equal(item.node.props['aria-label'], value),
    toBeVisible: async () => assert.equal(item.visible, true),
    toHaveText: async value => assert.equal(item.node.props.children, value),
  });
  const start = ia.indexOf('        // RootLayout provides the same consent-safe My Space dialog');
  const end = ia.indexOf('        if (width <= 767)', start);
  assert.ok(start >= 0 && end > start, 'extract the actual all-public-surfaces My Space assertions');
  const verify = new (Object.getPrototypeOf(async function () {}).constructor)('expect', 'cabinetEntry', 'locale', 'width', ia.slice(start, end));
  await verify(expect, cabinetEntry, locale, width);
}
for (const locale of ['en', 'ru', 'es']) for (const width of [390, 1280]) {
  test(`My Space matrix checks the real ${locale}/${width} dialog entry`, () => mySpaceMatrixScenario(locale, width));
}
for (const fault of ['missing dialog semantics', 'wrong dialog target', 'wrong initial expanded state', 'wrong accessible name', 'wrong localized label', 'missing responsive label']) {
  test('My Space matrix rejects ' + fault, async () => {
    await mySpaceMatrixScenario('ru', 390);
    await assert.rejects(mySpaceMatrixScenario('ru', 390, fault), { code: 'ERR_ASSERTION' });
  });
}

for (const [locale, label] of [['en', 'Install for free'], ['ru', 'Установить бесплатно'], ['es', 'Instalar gratis']]) {
  test(locale + ' actual free-app banner keeps its explicit localized install route', () => {
    const tree = FreeMobileAppBanner({ locale });
    assert.equal(tree.type, 'aside');
    assert.equal(Object.hasOwn(tree.props, 'data-hh-free-app-banner'), true);
    const links = treeNodes(tree).filter(node => node.type === 'a');
    assert.equal(links.length, 1);
    assert.equal(links[0].props.href, '/' + locale + '/install');
    assert.equal(links[0].props.prefetch, false);
    assert.equal(Object.hasOwn(links[0].props, 'data-hh-free-app-link'), true);
    assert.ok(treeNodes(tree).some(node => node.type === 'h2'));
    assert.ok(JSON.stringify(links[0]).includes(label));
  });
}
for (const locale of ['en', 'ru']) test(locale + ' actual Home renders one real install banner, not a noop boundary', () => {
  const tree = HolisticHouseHome({ locale });
  const banners = treeNodes(tree).filter(node => Object.hasOwn(node.props || {}, 'data-hh-free-app-banner'));
  assert.equal(banners.length, 1);
  assert.equal(treeNodes(banners[0]).filter(node => node.type === 'a' && node.props.href === '/' + locale + '/install').length, 1);
});

for (const locale of ['en', 'ru', 'es']) for (const fault of ['missing install', 'wrong install', 'cross-locale install', 'duplicate install']) test(locale + ' menu rejects ' + fault, async () => {
  await menuScenario(locale, 'home');
  await assert.rejects(menuScenario(locale, 'home', fault), { code: 'ERR_ASSERTION' });
});

// Evaluate only the authored pure expectedMenu expression, never the browser matrix.
function nativeExpectedMenu(locale, transform = value => value) {
  const matrixStart = ia.indexOf('async function verifyPublicHeaderMatrix(');
  assert.ok(matrixStart >= 0, 'actual native matrix must exist');
  const matches = [...ia.slice(matrixStart).matchAll(/^        const expectedMenu = (.+)$/gm)];
  assert.equal(matches.length, 1, 'exactly one native matrix menu expression');
  const expression = transform(matches[0][1]);
  return new Function('locale', 'getCompactNavigation', 'expected', 'return (' + expression + ');')(
    locale, navigationModel.getCompactNavigation, navigationModel.getSiteNavigation(locale));
}
function assertNativeMenuParity(locale, transform) {
  const independent = [
    '/' + locale + '/services/free-situation-review',
    ...navigationModel.getCompactNavigation(locale).map(item => item.href),
    '/' + locale + '/shop', '/' + locale + '/cart', '/' + locale + '/install',
    ...navigationModel.getSiteNavigation(locale).filter(item => ['energy','love','business','library','events'].includes(item.id)).map(item => item.href),
    '/' + locale + '/temple-insights', '/' + locale + '/services', '/' + locale + '/about',
  ];
  const native = nativeExpectedMenu(locale, transform);
  assert.deepEqual(native, independent, 'native matrix expression preserves independently specified exact order');
  pathname = locale === 'en' ? '/' : '/' + locale;
  const rendered = SiteNavigation({ locale });
  const menu = treeNodes(rendered).find(node => node.type === 'details' && node.props.className === 'site-main-menu');
  assert.deepEqual(native, treeNodes(menu).filter(node => node.type === 'a').map(node => node.props.href), 'native matrix expression matches actual pinned menu JSX');
}
const installTerm = "'/' + locale + '/install', ";
const nativeMenuMutants = {
  omitted: value => value.replace(installTerm, ''),
  wrong: value => value.replace(installTerm, "'/' + locale + '/wrong-install', "),
  duplicate: value => value.replace(installTerm, installTerm + installTerm),
  'cross-locale': value => value.replace(installTerm, "'/' + (locale === 'en' ? 'ru' : 'en') + '/install', "),
};
for (const locale of ['en', 'ru', 'es']) {
  test(locale + ' native matrix expectedMenu matches independent order and real JSX', () => assertNativeMenuParity(locale));
  for (const [fault, mutate] of Object.entries(nativeMenuMutants)) test(locale + ' native matrix expectedMenu rejects ' + fault + ' install', () => {
    assertNativeMenuParity(locale);
    assert.throws(() => assertNativeMenuParity(locale, expression => {
      const mutated = mutate(expression);
      assert.notEqual(mutated, expression, 'native expression mutation must apply');
      return mutated;
    }), error => error.code === 'ERR_ASSERTION' && error.message.includes('native matrix expression preserves independently specified exact order'));
  });
}
