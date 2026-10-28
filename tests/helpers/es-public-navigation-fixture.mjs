// Source-rendered protocol fixture, not a browser/CSS/geometry measurement.
// The actual root provider subtree and provider effects are retained. No private
// request has a successful/fabricated response; every attempt fails the fixture.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import * as navigationModel from '../../lib/site-navigation-model.js';
export const readSource = path => readFileSync(new URL('../../' + path, import.meta.url), 'utf8');
export const treeNodes = tree => !tree || typeof tree !== 'object' ? [] : Array.isArray(tree) ? tree.flatMap(treeNodes) : [tree, ...treeNodes(tree.props.children)];
export const treeText = tree => tree == null || typeof tree === 'boolean' ? '' : typeof tree !== 'object' ? String(tree) : Array.isArray(tree) ? tree.map(treeText).join('') : treeText(tree.props.children);
const jsx = (type, props) => ({ type, props: props || {} });

export async function renderSpanishNavigation(path, overrides = {}) {
  const effects = [], cleanups = [], privateCalls = [], trace = [], contexts = new Map(), documentEvents = new Map(), windowEvents = new Map();
  const wrappers = new Map();
  let focused, currentUrl = 'https://holistichouse.vercel.app' + path;
  const state = { overflow: false, escapeDestination: null, wrongTabFocus: false, wrongEscapeFocus: false };
  class Element {
    constructor(node) { this.node = node; }
    get open() { return Boolean(this.node.props.open); }
    set open(value) { this.node.props.open = value; }
    contains(target) { return treeNodes(this.node).includes(target?.node); }
    querySelector(selector) { return wrappers.get(query([this.node], selector)[0]); }
    focus() { focused = this.node; }
    close() { this.open = false; }
    showModal() { assert.fail('The provider-backed My Space dialog is not exercised'); }
  }
  const events = target => ({
    addEventListener(name, listener) { const entries = target.get(name) || []; entries.push(listener); target.set(name, entries); },
    removeEventListener(name, listener) { target.set(name, (target.get(name) || []).filter(value => value !== listener)); },
  });
  const document = { ...events(documentEvents), activeElement: null };
  const window = { ...events(windowEvents) };
  const rejectPrivate = name => (...args) => { privateCalls.push({ name, path: args[0] }); throw new Error('Unexpected private operation: ' + name); };
  const common = {
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'next/link': { default: props => jsx('a', props) },
    'next/image': { default: props => jsx('img', props) },
    'next/navigation': { usePathname: () => path },
    'lucide-react': new Proxy({}, { get: () => () => null }),
    react: {
      useEffect: effect => effects.push(effect), useRef: initial => ({ current: initial }),
      useState: initial => [initial, () => {}], useCallback: callback => callback,
      createContext(value) { const context = { value }; context.Provider = { context }; return context; },
      useContext: context => contexts.has(context) ? contexts.get(context) : context.value,
    },
  };
  function load(file, imports, source = overrides[file] ?? readSource(file)) {
    const exports = {};
    runInNewContext(ts.transpileModule(source, { fileName: file, compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText, {
      exports, require(name) { assert.ok(Object.hasOwn(imports, name), 'Known dependency: ' + name); return imports[name]; },
      document, window, Node: Element, HTMLElement: Element, AbortController,
      BroadcastChannel: class { constructor(name) { assert.equal(name, 'hh-app-session'); } close() {} },
    });
    return exports;
  }
  const space = load('components/home-personal-space.tsx', {
    ...common, '@/lib/app/client-fetch': { appFetch: rejectPrivate('appFetch') },
    '@/lib/native/client': { isNativeHolisticHouse: rejectPrivate('native') },
    '@/lib/home-personal-space.mjs': { homeSpaceSummary: rejectPrivate('private summary') },
    './home-personal-space.module.css': { default: {} },
  });
  const { SiteNavigation } = load('components/site-navigation.tsx', {
    ...common, '@/components/commerce/cart-nav-link': { CartNavLink: () => null },
    '@/components/site-search': { SiteSearch: () => null },
    '@/lib/ui-locale': { localePath: () => assert.fail('Unexpected locale fallback'), saveUiLocale() {} },
    '@/lib/public-locales': { hasSpanishCounterpart: () => true, publicCounterpart: (_value, language) => language === 'en' ? '/' : '/' + language, savePublicLocale() {} },
    '@/lib/site-navigation-model': navigationModel,
    './compact-navigation-icons': { compactNavigationIcons: Object.fromEntries(navigationModel.compactNavigationIds.map(id => [id, () => null])) },
    './home-personal-space': space, './use-navigation-locale': { useNavigationLocale: () => 'es' },
  });
  // Extract only the actual JSX provider subtree, not RootLayout imports/CSS or
  // private/network boundaries. Verify that it unconditionally encloses children.
  const layout = ts.createSourceFile('layout.tsx', overrides['app/layout.tsx'] ?? readSource('app/layout.tsx'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const root = layout.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'RootLayout');
  const returned = root?.body?.statements.find(ts.isReturnStatement);
  const candidates = [];
  function visit(node) { if (ts.isJsxElement(node) && node.openingElement.tagName.getText(layout) === 'HomePersonalSpaceProvider') candidates.push(node); ts.forEachChild(node, visit); }
  assert.ok(returned?.expression, 'Actual RootLayout return is present'); visit(returned.expression);
  assert.equal(candidates.length, 1, 'One global root provider');
  const provider = candidates[0];
  assert.equal(provider.children.filter(node => ts.isJsxExpression(node) && node.expression?.getText(layout) === 'children').length, 1, 'The actual root provider encloses route children');
  for (let parent = provider.parent; parent && parent !== returned; parent = parent.parent) {
    assert.ok(!ts.isConditionalExpression(parent) && !ts.isBinaryExpression(parent), 'Provider cannot be conditional in the root return');
  }
  const { compose } = load('root-provider-fixture.tsx', { ...common, './space': space }, `import { HomePersonalSpaceProvider } from './space'; export function compose(children, lang) { return (${provider.getText(layout)}); }`);
  function resolve(node) {
    if (!node || typeof node !== 'object') return node;
    if (Array.isArray(node)) return node.map(resolve);
    if (typeof node.type === 'function') return resolve(node.type(node.props));
    if (node.type?.context) {
      const context = node.type.context, previous = contexts.get(context), existed = contexts.has(context);
      contexts.set(context, node.props.value); const children = resolve(node.props.children);
      if (existed) contexts.set(context, previous); else contexts.delete(context);
      return jsx('fixture-provider', { children });
    }
    const result = jsx(node.type, { ...node.props, children: resolve(node.props.children) });
    const element = new Element(result); wrappers.set(result, element);
    if (result.props.ref) result.props.ref.current = element;
    return result;
  }
  const tree = resolve(compose(jsx(SiteNavigation, { locale: 'es' }), 'es'));
  for (const effect of effects) { const cleanup = effect(); if (typeof cleanup === 'function') cleanups.push(cleanup); }
  for (const handler of windowEvents.get('pageshow') || []) handler({ persisted: false });
  await Promise.resolve(); await Promise.resolve();
  assert.deepEqual(privateCalls, [], 'Initial global provider mount and ordinary pageshow must not request private data');
  function matches(node, selector) {
    if (!node || typeof node !== 'object') return false;
    const exclusions = [...selector.matchAll(/:not\(([^)]+)\)/g)].map(match => match[1]);
    selector = selector.replace(/:not\([^)]+\)/g, '');
    if (exclusions.some(value => matches(node, value))) return false;
    const tag = selector.match(/^[a-z][a-z0-9-]*/)?.[0];
    if (tag && node.type !== tag) return false;
    for (const [, name] of selector.matchAll(/\.([a-z0-9-]+)/g)) if (!String(node.props.className || '').split(' ').includes(name)) return false;
    for (const [, key, value] of selector.matchAll(/\[([a-z0-9-]+)(?:="([^"]*)")?\]/g)) if (value === undefined ? !Object.hasOwn(node.props, key) : node.props[key] !== value) return false;
    assert.equal(selector.replace(/^[a-z][a-z0-9-]*/, '').replace(/\.[a-z0-9-]+/g, '').replace(/\[[a-z0-9-]+(?:="[^"]*")?\]/g, ''), '', 'Supported exact selector');
    return true;
  }
  function query(roots, selector) {
    const parts = selector.split(/\s+/); let selected = roots;
    for (let index = 0; index < parts.length; index++) {
      if (parts[index] === ':scope') continue;
      if (parts[index] === '>') { const child = parts[++index]; selected = selected.flatMap(node => [node.props.children].flat(Infinity)).filter(node => matches(node, child)); }
      else selected = selected.flatMap(treeNodes).filter(node => matches(node, parts[index]));
    }
    return [...new Set(selected)];
  }
  const menu = () => query([tree], 'details.site-main-menu')[0];
  const summary = () => query([menu()], 'summary')[0];
  const menuLinks = () => query([menu()], '.site-main-menu-panel a');
  function visible(node) {
    if (node.props.hidden) return false;
    const closed = treeNodes(tree).filter(item => item.type === 'details' && !item.props.open && treeNodes(item).includes(node));
    return closed.every(item => query([item], 'summary').some(value => treeNodes(value).includes(node)));
  }
  function locator(selected, label) {
    return {
      selected, label, locator: selector => locator(query(selected, selector), label + '/' + selector),
      first: () => locator(selected.slice(0, 1), label + ':first'), nth: index => locator(selected.slice(index, index + 1), label + ':' + index),
      all: async () => selected.map((node, index) => locator([node], label + ':' + index)),
      evaluateAll: async callback => callback(selected.map(node => ({ getAttribute: key => node.props[key] ?? null }))),
      async focus() { assert.equal(selected.length, 1); focused = selected[0]; trace.push(['focus', label]); },
      async press(key) {
        assert.equal(selected.length, 1); assert.equal(selected[0], summary());
        trace.push(['press', key]);
        if (key === 'Enter') menu().props.open = !menu().props.open;
        else if (key === 'Tab') { assert.equal(focused, summary()); assert.equal(menu().props.open, true); focused = state.wrongTabFocus ? summary() : menuLinks()[0]; }
        else assert.fail('Unexpected key: ' + key);
      },
      async click() {
        assert.equal(selected.length, 1); const node = selected[0]; assert.ok(visible(node)); trace.push(['click', label]);
        if (node === summary()) menu().props.open = !menu().props.open;
        else if (node.type === 'a') { node.props.onClick?.(); currentUrl = new URL(node.props.href, currentUrl).href; }
        else assert.fail('No dialog, OAuth, provider or form action is allowed');
      },
    };
  }
  const page = {
    url: () => currentUrl, locator: selector => locator(query([tree], selector), selector),
    evaluate: async callback => runInNewContext(`(${callback})()`, { document: { documentElement: { scrollWidth: state.overflow ? 1400 : 390 } }, innerWidth: 390 }),
    keyboard: { async press(key) {
      assert.equal(key, 'Escape'); trace.push(['keyboard', key]);
      for (const listener of documentEvents.get('keydown') || []) listener({ key, preventDefault() {} });
      if (state.wrongEscapeFocus) focused = menuLinks()[0];
      if (state.escapeDestination) currentUrl = state.escapeDestination;
    } },
  };
  const expect = actual => {
    const one = () => { assert.equal(actual.selected.length, 1, actual.label); return actual.selected[0]; };
    return {
      async toHaveCount(value) { assert.equal(actual.selected.length, value, actual.label); },
      async toHaveAttribute(key, value) { const received = one().props[key]; assert.equal(received == null ? received : String(received), value, actual.label + ':' + key); },
      async toHaveAccessibleName(value) { const node = one(); assert.equal(node.props['aria-label'] || treeText(node), value, actual.label); },
      async toHaveJSProperty(key, value) { assert.equal(wrappers.get(one())[key], value, actual.label + ':' + key); },
      async toBeVisible() { assert.ok(visible(one()), actual.label); },
      async toBeFocused() { assert.equal(one(), focused, actual.label); },
      async toHaveURL(value) { assert.equal(actual, page); assert.equal(currentUrl, value); },
    };
  };
  return { tree, page, expect, trace, privateCalls, state, query: selector => query([tree], selector), cleanup() { for (const cleanup of cleanups.reverse()) cleanup(); } };
}
