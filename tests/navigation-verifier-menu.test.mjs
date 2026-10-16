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
  'lucide-react': { CircleUserRound: () => null, Menu: () => null, ClipboardCheck: () => null, GraduationCap: () => null },
};
const { SiteNavigation } = loadComponent('components/site-navigation.tsx', {
  ...common,
  react: { useEffect() {}, useRef: () => ({ current: null }) },
  'next/navigation': { usePathname: () => '/' },
  '@/lib/ui-locale': { localePath: (path, locale) => '/' + locale + path, saveUiLocale() {} },
  '@/lib/public-locales': { hasSpanishCounterpart: () => true, publicCounterpart: (_path, locale) => locale === 'en' ? '/' : '/' + locale, savePublicLocale() {} },
  '@/lib/site-navigation-model': navigationModel,
  './use-navigation-locale': { useNavigationLocale: locale => locale },
});
const { AcquisitionEventLink } = loadComponent('components/acquisition-event-link.tsx', { ...common, '@/data/local-acquisition': acquisition });
const { HolisticHouseHome } = loadComponent('components/holistic-house-home.tsx', {
  ...common, '@/data/local-acquisition': acquisition,
  '@/components/site-navigation': { SiteNavigation },
  '@/components/acquisition-event-link': { AcquisitionEventLink },
  ...Object.fromEntries([
    ['static-portrait', 'StaticPortrait'], ['homepage-contact-cta', 'HomepageContactCta'],
    ['services-solutions', 'ServicesSolutions'], ['homepage-topic-journeys', 'HomepageTopicJourneys'],
    ['home-free-tests-banner', 'HomeFreeTestsBanner'], ['personal-testimonials', 'PersonalTestimonials'],
    ['site-video-player', 'SiteVideoPlayer'],
  ].map(([path, name]) => ['@/components/' + path, { [name]: () => null }])),
});

test('CSP history clicks the unique body About CTA despite the real header duplicate', () => {
  const tree = HolisticHouseHome({ locale: 'en' });
  const allAbout = treeNodes(tree).filter(node => node.type === 'a' && node.props.href === '/en/about');
  assert.equal(allAbout.length, 2, 'actual JSX reproduces the formerly ambiguous selector');
  const section = treeNodes(tree).filter(node => node.props.className === 'service-home-about');
  assert.equal(section.length, 1);
  const scoped = treeNodes(section).filter(node => node.type === 'a' && node.props.href === '/en/about');
  assert.equal(scoped.length, 1);
  assert.match(release, /const publicAbout = cspPage\.locator\('\.service-home-about a\[href="\/en\/about"\]'\);\s*await expect\(publicAbout\)\.toHaveCount\(1\);\s*await expect\(publicAbout\)\.toBeVisible\(\);\s*await publicAbout\.click\(\)/);
  assert.match(release, /Home to About must retain same-policy soft navigation/);
  assert.match(release, /assert\.deepEqual\(cspErrors, \[\]/);
});

test('header matrix preserves all widths and tests direct links against the actual CSS breakpoint', () => {
  assert.match(ia, /\[320, 360, 374, 375, 390, 430, 768, 1023, 1024, 1100, 1280\]/);
  assert.match(read('app/holistic-house-home.css'), /@media \(min-width: 768px\) and \(max-width: 1140px\)[\s\S]*?a:not\(\.site-cabinet-entry\) \{ display: none; \}/);
  assert.match(ia, /if \(width > 1140\)[\s\S]*?toBeVisible\(\)[\s\S]*?else \{[\s\S]*?\[data-nav-item\]:not\(\.site-cabinet-entry\)[\s\S]*?toBeHidden\(\)/);
  assert.match(ia, /exact header destinations/);
  assert.match(ia, /await verifySiteMenu\(page, header, \{ locale, surface, label, expectedHeader, inViewport \}\)/);
  assert.match(ia, /assert\.deepEqual\(errors, \[\]\)/);
});

async function menuScenario(locale, surface, fault) {
  const expectedHeader = navigationModel.getSiteNavigation(locale).map(item => ({ ...item, href: item.id === 'cabinet' ? '/' + (locale === 'es' ? 'en' : locale) + '/app' : item.href }));
  const tree = SiteNavigation({ locale });
  const menuTree = treeNodes(tree).find(node => node.type === 'details' && node.props.className === 'site-main-menu');
  const nodes = treeNodes(menuTree).filter(node => node.type === 'a');
  const actualHrefs = nodes.map(node => node.props.href);
  if (fault === 'wrong destination') actualHrefs[0] = '/wrong';
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
    if (selector === '.site-main-menu-panel > a') return {
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
    async toHaveJSProperty(name, value) { assert.equal(actual, menu); assert.equal(name, 'open'); assert.equal(open, value); },
    async toBeFocused() { assert.equal(focused, actual); },
    async toHaveURL(expected) { assert.equal(actual, page); assert.equal(url, fault === 'wrong navigation' ? origin + '/wrong' : expected); },
  });
  const verify = new Function('assert', 'expect', 'origin', helper + ';return verifySiteMenu;')(assert, expect, origin);
  const bounded = [];
  await verify(page, header, { locale, surface, label: 'synthetic', expectedHeader, inViewport: async control => {
    assert.notEqual(fault, 'out of bounds'); bounded.push(control);
  } });
  assert.ok(clicked);
  assert.deepEqual(bounded, [trigger, ...links]);
}
for (const locale of ['en', 'ru', 'es']) {
  for (const surface of ['home', 'services', 'library']) test(`${locale}/${surface} verifier uses actual JSX menu destinations and navigates`, () => menuScenario(locale, surface));
}
for (const fault of ['wrong destination', 'duplicate destination', 'missing menu', 'cannot open', 'keyboard order', 'escape', 'focus return', 'overflow', 'out of bounds', 'route close', 'wrong navigation']) {
  test('site-menu verifier rejects ' + fault, () => assert.rejects(menuScenario('en', 'home', fault)));
}
