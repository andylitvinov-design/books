import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const script = read('scripts/verify-public-services-production.mjs');
const start = script.indexOf('      // Canonical header:');
const end = script.indexOf('      await assertViewport', start);
assert.ok(start >= 0 && end > start);
const acceptance = script.slice(start, end);
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const verify = new AsyncFunction('page', 'expect', 'visible', 'assert', 'locale', 'width', 'getComputedStyle', acceptance);
const forbidden = name => () => { throw new Error('Forbidden header side effect: ' + name); };
const plain = value => JSON.parse(JSON.stringify(value));

function compile(source, filename, imports) {
  const exports = {};
  runInNewContext(ts.transpileModule(source, {
    fileName: filename, compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText, {
    exports,
    require(name) { assert.ok(Object.hasOwn(imports, name), 'Forbidden import: ' + name); return imports[name]; },
    fetch: forbidden('fetch'), WebSocket: forbidden('WebSocket'),
    setTimeout: forbidden('setTimeout'),
  }, { filename });
  return exports;
}
const hasClass = (node, cls) => String(node.props?.className || '').split(/\s+/).includes(cls);
const textOf = node => node == null ? '' : typeof node !== 'object' ? String(node) :
  Array.isArray(node) ? node.map(textOf).join('') : textOf(node.props?.children);
const walk = (node, parents = []) => node == null || typeof node !== 'object' ? [] :
  Array.isArray(node) ? node.flatMap(item => walk(item, parents)) :
    [{ ...node, parents }, ...walk(node.props?.children, [...parents, node])];

// Real provider, NavEntry, public header, SiteNavigation and navigation model.
// Effects and every private/network/auth implementation remain strictly inert.
function authoredHeader(locale, overrides = {}) {
  const source = path => overrides[path] ?? read(path);
  const contexts = [];
  const jsx = (type, props = {}) => ({ type, props });
  const React = {
    createContext(initial) { const context = { current: initial }; context.Provider = { context }; contexts.push(context); return context; },
    useContext: context => context.current,
    useState: initial => [typeof initial === 'function' ? initial() : initial, forbidden('state update during initial render')],
    useCallback: callback => callback,
    useEffect() {},
    useRef: current => ({ current }),
  };
  const icons = Object.fromEntries(['ArrowRight','BookOpen','BriefcaseBusiness','ChevronDown','ClipboardList','FileText',
    'GraduationCap','Heart','LockKeyhole','MessageCircle','Sparkles','Target','UserRound','Users','X',
    'Menu','Flame','FlaskConical','House','Landmark','HeartHandshake'].map(name => [name, () => null]));
  const jsxr = { jsx, jsxs: jsx };
  const link = { __esModule: true, default: props => jsx('a', props) };
  const pathname = '/' + locale + '/services';
  const panel = compile(source('components/home-personal-space.tsx'), 'home-personal-space.tsx', {
    'react/jsx-runtime': jsxr, react: React,
    'next/image': { __esModule: true, default: props => jsx('img', props) },
    'next/link': link, 'next/navigation': { usePathname: () => pathname }, 'lucide-react': icons,
    '@/lib/app/client-fetch': { appFetch: forbidden('private appFetch') },
    '@/lib/native/client': { isNativeHolisticHouse: forbidden('native auth') },
    '@/lib/home-personal-space.mjs': { homeSpaceSummary: forbidden('private summary') },
    './home-personal-space.module.css': { __esModule: true, default: new Proxy({}, { get: (_, key) => String(key) }) },
  });
  const model = compile(source('lib/site-navigation-model.js'), 'site-navigation-model.js', {});
  const navigationIcons = compile(source('components/compact-navigation-icons.ts'), 'compact-navigation-icons.ts', { 'lucide-react': icons });
  const nav = compile(source('components/site-navigation.tsx'), 'site-navigation.tsx', {
    'react/jsx-runtime': jsxr, react: React, 'next/link': link,
    'next/navigation': { usePathname: () => pathname }, 'lucide-react': icons,
    '@/components/commerce/cart-nav-link': { CartNavLink: () => null },
    '@/components/site-search': { SiteSearch: () => null }, './compact-navigation-icons': navigationIcons,
    '@/lib/ui-locale': { localePath: (_, next) => '/' + next + '/services', saveUiLocale: forbidden('locale persistence') },
    '@/lib/public-locales': { hasSpanishCounterpart: () => true, publicCounterpart: (_, next) => '/' + next + '/services', savePublicLocale: forbidden('locale persistence') },
    '@/lib/site-navigation-model': model,
    './use-navigation-locale': { useNavigationLocale: value => value }, './home-personal-space': panel,
  });
  const header = compile(source('components/public-site-header.tsx'), 'public-site-header.tsx', {
    'react/jsx-runtime': jsxr, 'next/link': link, '@/components/site-navigation': nav,
  });
  function render(node) {
    if (node == null || typeof node !== 'object') return node;
    if (Array.isArray(node)) return node.map(render);
    if (typeof node.type === 'function') return render(node.type(node.props));
    if (node.type?.context) {
      const context = node.type.context, previous = context.current;
      context.current = node.props.value;
      try { return render(node.props.children); } finally { context.current = previous; }
    }
    assert.equal(typeof node.type, 'string', 'Known element boundary');
    return { type: node.type, props: { ...node.props, children: render(node.props.children) } };
  }
  const tree = render(jsx(panel.HomePersonalSpaceProvider, { locale,
    children: jsx(header.PublicSiteHeader, { locale }) }));
  return { tree, panel, contexts, render, jsx };
}

function fixture(locale, width, overrides = {}) {
  const authored = authoredHeader(locale, overrides);
  const all = walk(authored.tree).map(node => ({ ...node, visible: true, enabled: node.props.disabled !== true,
    bounds: { x: 5, width: 90, height: 44 }, inert: Boolean(node.props.inert), pointerEvents: 'auto', tabIndex: node.props.tabIndex ?? (node.type === 'button' ? 0 : -1) }));
  let menuOpen = false, clicks = 0;
  const find = predicate => all.filter(node => !node.excluded && predicate(node));
  const attr = (node, name) => {
    if (name === 'open') return node.type === 'details' && hasClass(node, 'site-main-menu') ? (menuOpen ? '' : null)
      : node.props.open ? '' : null;
    const value = node.props[name === 'class' ? 'className' : name];
    return value === undefined || value === null ? null : String(value);
  };
  const dom = node => ({
    getAttribute: name => attr(node, name), textContent: textOf(node),
    open: node.type === 'details' && hasClass(node, 'site-main-menu') ? menuOpen : Boolean(node.props.open),
    tabIndex: node.tabIndex, closest: () => node.inert ? {} : null,
    pointerEvents: node.pointerEvents,
  });
  function select(selector) {
    if (selector === 'header.house-header--services') return find(node => node.type === 'header' && hasClass(node, 'house-header--services'));
    if (selector === '.site-cabinet-entry') return find(node => hasClass(node, 'site-cabinet-entry'));
    if (selector === 'a.site-cabinet-entry') return find(node => node.type === 'a' && hasClass(node, 'site-cabinet-entry'));
    if (selector === 'button.site-cabinet-entry[data-nav-item="cabinet"]') return find(node => node.type === 'button' && hasClass(node, 'site-cabinet-entry') && node.props['data-nav-item'] === 'cabinet');
    if (selector === 'dialog#home-personal-space-dialog') return find(node => node.type === 'dialog' && node.props.id === 'home-personal-space-dialog');
    if (selector === 'details.site-main-menu') return find(node => node.type === 'details' && hasClass(node, 'site-main-menu'));
    if (selector === 'summary.site-main-menu-trigger') return find(node => node.type === 'summary' && hasClass(node, 'site-main-menu-trigger'));
    for (const cls of ['site-main-menu-grid', 'site-main-menu-more']) {
      if (selector === '.' + cls + ' a[data-nav-item]') return find(node => node.type === 'a' && node.props['data-nav-item'] && node.parents.some(parent => hasClass(parent, cls)));
    }
    if (selector === '.site-main-menu-panel a[href="/' + locale + '/books"]') return [];
    assert.fail('Unexpected selector: ' + selector);
  }
  const within = (node, parent) => node === parent || node.parents.some(item => item.type === parent.type && item.props === parent.props);
  class Locator {
    constructor(matches) { this.matches = matches; }
    locator(selector) { return new Locator(select(selector).filter(node => this.matches.some(parent => within(node, parent)))); }
    nth(index) { return new Locator(this.matches.slice(index, index + 1)); }
    one() { assert.equal(this.matches.length, 1, 'Unique locator'); return this.matches[0]; }
    async evaluate(fn) { return fn(dom(this.one())); }
    async evaluateAll(fn) { return plain(fn(this.matches.map(dom))); }
    async getAttribute(name) { return attr(this.one(), name); }
    async boundingBox() { return this.one().bounds; }
    async click() {
      assert.ok(hasClass(this.one(), 'site-main-menu-trigger'), 'Only the existing site menu may be clicked');
      clicks += 1; menuOpen = !menuOpen;
    }
  }
  const page = { locator: selector => new Locator(select(selector)) };
  const visible = async locator => {
    const node = locator.one(); assert.equal(node.visible, true, 'Visible entry');
    if (node.parents.some(parent => hasClass(parent, 'site-main-menu-panel'))) assert.equal(menuOpen, true, 'Menu panel is open');
  };
  const expect = locator => ({
    toHaveCount: async count => assert.equal(locator.matches.length, count),
    toHaveAttribute: async (name, value) => assert.equal(attr(locator.one(), name), value),
    toHaveAccessibleName: async value => assert.equal(attr(locator.one(), 'aria-label') || textOf(locator.one()), value),
    toBeEnabled: async () => assert.equal(locator.one().enabled, true),
    toBeHidden: async () => assert.equal(locator.one().type === 'dialog' && !locator.one().props.open, true),
    not: { toHaveAttribute: async (name, value) => assert.notEqual(attr(locator.one(), name), value) },
  });
  return { authored, all,
    cabinet: () => find(node => hasClass(node, 'site-cabinet-entry'))[0],
    dialog: () => find(node => node.type === 'dialog')[0],
    trigger: () => find(node => hasClass(node, 'site-main-menu-trigger'))[0],
    primary: () => select('.site-main-menu-grid a[data-nav-item]'),
    more: () => select('.site-main-menu-more a[data-nav-item]'),
    async run() { await verify(page, expect, visible, assert, locale, width, node => ({ pointerEvents: node.pointerEvents })); assert.equal(menuOpen, false); assert.equal(clicks, 2, 'Exactly original menu open/close, no Cabinet/auth action'); },
  };
}

for (const locale of ['en', 'ru']) for (const width of [320, 360, 390, 1188]) {
  test(`actual provider-mounted My Space and authored menu pass ${locale}/${width}`, async () => { await fixture(locale, width).run(); });
}

for (const [name, mutate] of [
  ['missing My Space', f => { f.cabinet().excluded = true; }],
  ['duplicate My Space', f => { f.all.push({ ...f.cabinet() }); }],
  ['obsolete anchor instead of button', f => { f.cabinet().type = 'a'; }],
  ['wrong accessible name', f => { f.cabinet().props['aria-label'] = 'Wrong'; }],
  ['disabled entry', f => { f.cabinet().enabled = false; }],
  ['hidden entry', f => { f.cabinet().visible = false; }],
  ['wrong dialog relationship', f => { f.cabinet().props['aria-controls'] = 'missing-dialog'; }],
  ['wrong popup semantics', f => { f.cabinet().props['aria-haspopup'] = 'menu'; }],
  ['wrong expanded state', f => { f.cabinet().props['aria-expanded'] = true; }],
  ['missing mounted dialog', f => { f.dialog().excluded = true; }],
  ['already open private dialog', f => { f.dialog().props.open = true; }],
  ['inert entry', f => { f.cabinet().inert = true; }],
  ['pointer-disabled entry', f => { f.cabinet().pointerEvents = 'none'; }],
  ['keyboard-inaccessible entry', f => { f.cabinet().tabIndex = -1; }],
  ['overflowing My Space', f => { f.cabinet().bounds = { x: 300, width: 90, height: 44 }; }],
  ['hidden menu trigger', f => { f.trigger().visible = false; }],
  ['overflowing menu trigger', f => { f.trigger().bounds = { x: 300, width: 90, height: 44 }; }],
  ['missing public route', f => { f.primary()[0].excluded = true; }],
  ['wrong public route', f => { f.primary()[1].props.href = '/en/app'; }],
  ['wrong locale route', f => { f.primary()[2].props.href = '/ru/academy'; }],
  ['wrong localized menu label', f => { f.more().find(node => node.props['data-nav-item'] === 'library').props.children = 'Ideas'; }],
  ['hidden public menu link', f => { f.primary()[1].visible = false; }],
  ['overflowing public menu link', f => { f.more()[0].bounds = { x: -2, width: 90, height: 44 }; }],
]) test('actual acceptance rejects ' + name, async () => {
  const f = fixture('en', 320); mutate(f); await assert.rejects(f.run());
});

test('real NavEntry preserves synthetic provider action and controlled expanded state without private I/O', () => {
  for (const locale of ['en', 'ru', 'es']) {
    const authored = authoredHeader(locale);
    const context = authored.contexts[0];
    let opened = 0;
    const openPanel = () => { opened += 1; };
    for (const open of [false, true]) {
      context.current = { open, openPanel };
      const entry = authored.render(authored.jsx(authored.panel.HomePersonalSpaceNavEntry, { locale, href: '/unused' }));
      assert.equal(entry.type, 'button'); assert.equal(entry.props.onClick, openPanel);
      assert.equal(entry.props['aria-expanded'], open); entry.props.onClick();
    }
    assert.equal(opened, 2); context.current = null;
  }
});

test('real no-provider NavEntry still uses exact safe /app fallback with prefetch disabled', () => {
  for (const locale of ['en', 'ru', 'es']) {
    const authored = authoredHeader(locale);
    const href = '/' + (locale === 'es' ? 'en' : locale) + '/app';
    const entry = authored.render(authored.jsx(authored.panel.HomePersonalSpaceNavEntry, { locale, href }));
    assert.equal(entry.type, 'a'); assert.equal(entry.props.href, href); assert.equal(entry.props.prefetch, false);
    assert.equal(entry.props.onClick, undefined);
    assert.ok(textOf(entry).includes({ en: 'My Space', ru: 'Моё пространство', es: 'Mi espacio' }[locale]));
  }
});

test('actual application layout mounts the same provider around public children', () => {
  const ast = ts.createSourceFile('layout.tsx', read('app/layout.tsx'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const providers = [];
  const visit = node => { if (ts.isJsxElement(node) && node.openingElement.tagName.getText(ast) === 'HomePersonalSpaceProvider') providers.push(node); ts.forEachChild(node, visit); };
  visit(ast); assert.equal(providers.length, 1);
  assert.equal(providers[0].children.length, 1);
  assert.equal(providers[0].children[0].expression.getText(ast), 'children');
  assert.match(read('app/layout.tsx'), /import \{ HomePersonalSpaceProvider \} from "@\/components\/home-personal-space"/);
});

test('genuine runtime mutations are rejected by the actual acceptance or action/fallback checks', async () => {
  const navPath = 'components/site-navigation.tsx', panelPath = 'components/home-personal-space.tsx', modelPath = 'lib/site-navigation-model.js';
  const mutations = [
    [navPath, "<HomePersonalSpaceNavEntry locale={activeLocale}", "<HomePersonalSpaceNavEntry locale=\"ru\""],
    [panelPath, 'aria-controls="home-personal-space-dialog"', 'aria-controls="wrong-dialog"'],
    [panelPath, 'id="home-personal-space-dialog"', 'id="wrong-dialog"'],
    [modelPath, "'profile', 'alchemy'", "'alchemy', 'profile'"],
    [modelPath, "profile: 'personality-profiles'", "profile: 'app'"],
    [modelPath, "library: 'Library'", "library: 'Ideas'"],
  ];
  for (const [path, old, replacement] of mutations) {
    const source = read(path); const changed = source.replace(old, replacement); assert.notEqual(changed, source, old);
    await assert.rejects(fixture('en', 320, { [path]: changed }).run());
  }
  const noAction = authoredHeader('en', { [panelPath]: read(panelPath).replace('onClick={space.openPanel}', 'onClick={() => undefined}') });
  let calls = 0; const action = () => { calls += 1; }; noAction.contexts[0].current = { open: false, openPanel: action };
  const button = noAction.render(noAction.jsx(noAction.panel.HomePersonalSpaceNavEntry, { locale: 'en', href: '/en/app' }));
  button.props.onClick(); assert.equal(calls, 0); assert.notEqual(button.props.onClick, action);
  const noFallback = authoredHeader('en', { [panelPath]: read(panelPath).replace('if (!space) return <Link className="site-cabinet-entry" href={href}', 'if (!space) return <Link className="site-cabinet-entry" href="/wrong"') });
  const link = noFallback.render(noFallback.jsx(noFallback.panel.HomePersonalSpaceNavEntry, { locale: 'en', href: '/en/app' }));
  assert.notEqual(link.props.href, '/en/app');
});

test('header acceptance preserves the original two menu clicks and never triggers private/auth entry', () => {
  assert.equal((acceptance.match(/\.click\(\)/g) || []).length, 2);
  assert.doesNotMatch(acceptance, /cabinetEntry\.click|spaceDialog\.click|auth\/start|bootstrap|force:|trial:|\.focus\(|\.tap\(/);
  assert.ok(script.includes('await assertViewport(page, locale + "/services/" + width)'));
  assert.ok(script.includes('assert.deepEqual(diagnostics.pageErrors, []'));
});

// Execute real personal-journey statements against authored JSX, not a hand-made
// hero. This is NOT computed CSS/native visibility proof: only the observed mobile
// header rule and explicit hidden/style/closed-details states are modeled.
function personalFreeAcceptance(input = script) {
  const from = input.indexOf('  // Real hydrated, non-submitting conversion journey');
  const to = input.indexOf('  // Business Strategy & Founder Coaching', from);
  assert.ok(from >= 0 && to > from, 'Personal journey boundaries');
  const ast = ts.createSourceFile('personal.mjs', input.slice(from, to), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const declarations = [];
  const visit = node => {
    if (ts.isVariableStatement(node) && node.declarationList.declarations.some(item => item.name.getText(ast) === 'free')) declarations.push(node);
    ts.forEachChild(node, visit);
  };
  visit(ast); assert.equal(declarations.length, 1, 'One actual personal free CTA statement');
  const statement = declarations[0];
  const next = statement.parent.statements[statement.parent.statements.indexOf(statement) + 1];
  assert.equal(next?.getText(ast), 'await visible(free);', 'Original visible gate immediately follows selection');
  const whole = ts.createSourceFile('acceptance.mjs', input, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const helpers = [];
  const helperVisit = node => {
    if (ts.isVariableDeclaration(node) && node.name.getText(whole) === 'visible') helpers.push(node.initializer);
    ts.forEachChild(node, helperVisit);
  };
  helperVisit(whole); assert.equal(helpers.length, 1, 'One actual shared visible helper');
  return {
    verify: new AsyncFunction('main', 'locale', 'visible', statement.getText(ast) + '\n' + next.getText(ast)),
    visible: new Function('return (' + helpers[0].getText(whole) + ')')(),
  };
}

function personalHeroFixture(locale, service, landingSource = read('components/personal-service-landing.tsx')) {
  const authored = authoredHeader(locale);
  const data = compile(read('data/personal-service-pages.ts'), 'personal-service-pages.ts', {});
  const landing = compile(landingSource, 'personal-service-landing.tsx', {
    'react/jsx-runtime': { jsx: authored.jsx, jsxs: authored.jsx },
    'next/link': { __esModule: true, default: props => authored.jsx('a', props) },
    'next/image': { __esModule: true, default: props => authored.jsx('img', props) },
    'lucide-react': Object.fromEntries(['ArrowRight', 'CalendarCheck2', 'Check', 'Clock3', 'MessageCircle', 'ShieldCheck'].map(name => [name, () => null])),
    '@/components/personal-consultation-form': { PersonalConsultationForm: () => null },
    '@/components/service-video-showcase': { ServiceVideoShowcase: () => null },
    '@/components/public-site-header': { PublicSiteHeader: () => authored.tree },
    '@/data/personal-service-pages': data,
    './personal-service-landing.module.css': { __esModule: true, default: new Proxy({}, { get: (_, key) => String(key) }) },
  });
  const all = walk(authored.render(authored.jsx(landing.PersonalServiceLanding, { locale, service })));
  const main = all.filter(node => node.type === 'main' && node.props['data-personal-service'] === service);
  assert.equal(main.length, 1, 'Actual service main');
  const href = '/' + locale + '/services/free-situation-review';
  const headerFree = all.filter(node => node.type === 'a' && hasClass(node, 'site-nav-free-entry'));
  assert.equal(headerFree.length, 1); assert.equal(headerFree[0].props.href, href);
  const closingFree = all.filter(node => node.type === 'a' && hasClass(node, 'closingSecondary'));
  assert.equal(closingFree.length, 1); assert.equal(closingFree[0].props.href, href);
  // The native failure identified this source rule at390px. No arbitrary CSS
  // cascade/layout claim is made by this source-only fixture.
  assert.match(read('app/holistic-house-home.css'), /@media \(max-width: 767px\) \{[^}]*\}[\s\S]*?\.house-header--services \.site-navigation > a \{ display: none; \}/);
  const explicitHidden = node => node.props.hidden === true || node.props.style?.display === 'none' || node.props.style?.visibility === 'hidden';
  const isVisible = node => {
    if ([...node.parents, node].some(explicitHidden)) return false;
    if (node.type === 'a' && hasClass(node.parents.at(-1), 'site-navigation') && node.parents.some(parent => hasClass(parent, 'house-header--services'))) return false;
    return !node.parents.some((parent, index) => parent.type === 'details' && !parent.props.open && node.parents[index + 1]?.type !== 'summary' && node.type !== 'summary');
  };
  assert.equal(isVisible(headerFree[0]), false, 'Native-backed hidden header decoy');
  assert.equal(isVisible(closingFree[0]), true, 'Closing alternative remains available to expose fallback bugs');
  const waits = [];
  // Generic descendant/attribute matching, not an expected-selector-to-hero map.
  function select(selector, scope) {
    const parts = selector.split(/\s+/).map(part => {
      const parsed = part.match(/^([a-z]+)(?:\[([a-z-]+)="([^"]*)"\])?$/);
      assert.ok(parsed, 'Supported exact CSS selector grammar: ' + part);
      return node => node.type === parsed[1] && (!parsed[2] || node.props[parsed[2]] === parsed[3]);
    });
    return all.filter(node => node.parents.some(parent => parent.props === scope.props) && parts.at(-1)(node) && (() => {
      let cursor = node.parents.length - 1;
      for (let part = parts.length - 2; part >= 0; part--) {
        while (cursor >= 0 && !parts[part](node.parents[cursor])) cursor--;
        if (cursor < 0) return false;
        cursor--;
      }
      return true;
    })());
  }
  class PersonalLocator {
    constructor(matches) { this.matches = matches; }
    first() { return new PersonalLocator(this.matches.slice(0, 1)); }
    async waitFor(options) {
      assert.deepEqual(plain(options), { state: 'visible', timeout: 30000 }, 'Original native visible state/timeout');
      assert.equal(this.matches.length, 1, 'Exactly one intended hero CTA');
      assert.equal(isVisible(this.matches[0]), true, 'Selected CTA is not the hidden header or hidden authored hero');
      waits.push(this.matches[0]);
    }
  }
  return {
    all, headerFree: headerFree[0],
    async run(input = script) {
      waits.length = 0;
      const actual = personalFreeAcceptance(input);
      await actual.verify({ locator: selector => new PersonalLocator(select(selector, main[0])) }, locale, actual.visible);
      assert.equal(waits.length, 1, 'Actual visible wait executes exactly once');
      const selected = waits[0];
      assert.ok(hasClass(selected, 'secondary'), 'Authored hero CTA, never closing/header fallback');
      assert.equal(textOf(selected), data.servicePageShared[locale].free, 'Actual localized free-review copy');
      assert.ok(selected.parents.some(node => node.type === 'section' && node.props['aria-labelledby'] === 'personal-service-title'));
    },
  };
}

for (const locale of ['en', 'ru', 'es']) for (const service of ['imagery-therapy', 'systemic-constellations']) {
  test(`actual personal hero ignores hidden header and closing duplicates: ${locale}/${service}`, async () => {
    const f = personalHeroFixture(locale, service);
    assert.ok(f.all.indexOf(f.headerFree) < f.all.findIndex(node => hasClass(node, 'secondary')));
    await f.run();
  });
}

const authoredPersonalSource = read('components/personal-service-landing.tsx');
const heroFreeTag = '<Link className={styles.secondary} href={`/${locale}/services/free-situation-review`}>{ui.free}</Link>';
assert.equal(authoredPersonalSource.split(heroFreeTag).length, 2, 'Unique actual hero mutation anchor');
for (const [name, change] of [
  ['missing hero with other alternatives retained', source => source.replace(heroFreeTag, '')],
  ['duplicate hero', source => source.replace(heroFreeTag, heroFreeTag + heroFreeTag)],
  ['wrong hero destination', source => source.replace(heroFreeTag, heroFreeTag.replace('/services/free-situation-review', '/services/dao-health-profile'))],
  ['wrong hero locale', source => source.replace(heroFreeTag, heroFreeTag.replace('`/${locale}/services/free-situation-review`', '`/${locale === "en" ? "ru" : "en"}/services/free-situation-review`'))],
  ['hidden hero', source => source.replace(heroFreeTag, heroFreeTag.replace('<Link ', '<Link hidden '))],
  ['hidden hero parent', source => source.replace(heroFreeTag, '<div hidden>' + heroFreeTag + '</div>')],
  ['display-none hero', source => source.replace(heroFreeTag, heroFreeTag.replace('<Link ', '<Link style={{ display: "none" }} '))],
  ['wrong hero aria binding', source => source.replace('aria-labelledby="personal-service-title"', 'aria-labelledby="wrong-title"')],
  ['hero moved outside semantic section', source => source.replace(heroFreeTag, '').replace('<section className={styles.closing}>', '<section className={styles.closing}>' + heroFreeTag)],
]) for (const locale of ['en', 'ru', 'es']) {
  test(`actual personal acceptance rejects ${name}: ${locale}`, async () => {
    const changed = change(authoredPersonalSource); assert.notEqual(changed, authoredPersonalSource);
    await assert.rejects(personalHeroFixture(locale, 'imagery-therapy', changed).run(), { code: 'ERR_ASSERTION' });
  });
}

test('original broad first-match verifier genuinely fails on the hidden header decoy', async () => {
  const current = 'const free = main.locator(\'section[aria-labelledby="personal-service-title"] a[href="/\' + locale + \'/services/free-situation-review"]\');';
  const original = 'const free = main.locator(\'a[href="/\' + locale + \'/services/free-situation-review"]\').first();';
  assert.equal(script.split(current).length, 2);
  await assert.rejects(personalHeroFixture('en', 'imagery-therapy').run(script.replace(current, original)), /Selected CTA is not the hidden header/);
});

test('personal acceptance rejects bypassed visibility and changed native timeout/state', async () => {
  for (const [before, after] of [
    ['await visible(free);', 'await Promise.resolve(free);'],
    ['state: "visible", timeout: 30000', 'state: "attached", timeout: 30000'],
    ['state: "visible", timeout: 30000', 'state: "visible", timeout: 60000'],
  ]) {
    assert.ok(script.includes(before));
    const changed = script.replace(before, after); assert.notEqual(changed, script);
    await assert.rejects(personalHeroFixture('en', 'imagery-therapy').run(changed), { code: 'ERR_ASSERTION' });
  }
});
