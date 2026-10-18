import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import { CSP_PREHYDRATION_SCRIPT } from '../lib/csp-prehydration.js';

const source = readFileSync(new URL('../components/csp-navigation-boundary.tsx', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { fileName: 'csp-navigation-boundary.tsx', compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
function fixture({ key = 'home-entry', path = '/', navigationAvailable = true, cspClass = 'public-video' } = {}) {
  const listeners = new Map(), navigationListeners = new Map(), documentListeners = new Map();
  const replacements = [], assignments = [], effects = [];
  let url = new URL(path, 'https://example.test');
  const location = { get href() { return url.href; }, get pathname() { return url.pathname; }, get origin() { return url.origin; }, replace(value) { replacements.push(value); }, assign(value) { assignments.push(value); } };
  const history = Object.freeze({ state: Object.freeze({ __NA: true, __PRIVATE_NEXTJS_INTERNALS_TREE: Object.freeze(['original-next-tree']) }), pushState() {}, replaceState() {} });
  const nativePush = history.pushState, nativeReplace = history.replaceState, nativeState = history.state;
  const window = {
    location, history,
    addEventListener(type, fn) { const group = listeners.get(type) ?? []; group.push(fn); listeners.set(type, group); },
    removeEventListener(type, fn) { listeners.set(type, (listeners.get(type) ?? []).filter(handler => handler !== fn)); },
  };
  if (navigationAvailable) window.navigation = { currentEntry: { key }, addEventListener(type, fn) { const group = navigationListeners.get(type) ?? []; group.push(fn); navigationListeners.set(type, group); } };
  const document = { body: { dataset: { cspClass } }, visibilityState: 'visible', addEventListener(type, fn) { documentListeners.set(type, fn); }, removeEventListener(type) { documentListeners.delete(type); } };
  class Element { closest() { return this; } }
  runInNewContext(CSP_PREHYDRATION_SCRIPT, { window, document });
  const ownsCurrentEntry = window.__hhOwnsHistoryEntry;
  const modules = { react: { useEffect(fn) { effects.push(fn); }, useRef(value) { return { current: value }; } }, 'next/navigation': { usePathname: () => path }, '@/lib/native/client': { isNativePsiAlchemy: () => false } };
  const exports = {};
  runInNewContext(compiled, { exports, window, document, URL, Element, require(name) { assert.ok(Object.hasOwn(modules, name), name); return modules[name]; } });
  exports.CspNavigationBoundary();
  let cleanups = effects.map(effect => effect());
  function emit(type, extras = {}) {
    const event = { type, stopped: false, stopImmediatePropagation() { this.stopped = true; }, ...extras };
    for (const fn of listeners.get(type) ?? []) { fn(event); if (event.stopped) break; }
    return event;
  }
  function changeEntry(nextKey, nextPath, navigationType) {
    url = new URL(nextPath, url);
    if (window.navigation) {
      window.navigation.currentEntry = { key: nextKey };
      for (const fn of navigationListeners.get('currententrychange') ?? []) fn({ navigationType });
    }
  }
  return { window, replacements, assignments, ownsCurrentEntry, changeEntry, emit,
    remountEffects() { for (const cleanup of cleanups) cleanup?.(); cleanups = effects.map(effect => effect()); },
    pop(nextKey, nextPath) { changeEntry(nextKey, nextPath, 'traverse'); return emit('popstate'); },
    click(nextPath) {
      const anchor = new Element(); anchor.href = new URL(nextPath, url).href; anchor.hasAttribute = () => false;
      const event = { button: 0, target: anchor, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } };
      documentListeners.get('click')(event); return event;
    },
    assertNextUnchanged() { assert.equal(history.pushState, nativePush); assert.equal(history.replaceState, nativeReplace); assert.equal(history.state, nativeState); },
  };
}

test('Back/Forward to a foreign same-policy entry reloads before the Next history listener', () => {
  const f = fixture(); let routerRestores = 0;
  f.window.addEventListener('popstate', () => routerRestores++);
  assert.equal(f.pop('about-from-previous-document', '/en/about').stopped, true);
  assert.equal(f.ownsCurrentEntry(), false, 'A traverse must not be recorded as locally created history');
  assert.deepEqual(f.replacements, ['https://example.test/en/about']);
  assert.equal(routerRestores, 0, 'No old About tree may initiate route chunk loading');
  f.assertNextUnchanged();
});

test('native same-document Back/Forward and repeated visits remain soft', () => {
  const f = fixture(); let routerRestores = 0;
  f.window.addEventListener('popstate', () => routerRestores++);
  f.changeEntry('about', '/en/about', 'push');
  f.changeEntry('about', '/en/about', 'replace');
  for (let n = 0; n < 3; n++) {
    assert.equal(f.pop('home-entry', '/').stopped, false);
    assert.equal(f.pop('about', '/en/about').stopped, false);
  }
  assert.equal(routerRestores, 6);
  assert.deepEqual(f.replacements, []);
  f.assertNextUnchanged();
});

test('a newly loaded document owns its arrival entry but not the previous document entries', () => {
  const f = fixture({ key: 'about', path: '/en/about' });
  assert.equal(f.pop('about', '/en/about').stopped, false, 'No reload loop on the arrival entry');
  assert.equal(f.pop('home-from-older-document', '/').stopped, true);
  assert.deepEqual(f.replacements, ['https://example.test/']);
});

test('same-document hash entries retain soft traversal and ordinary same-policy clicks remain untouched', () => {
  const f = fixture();
  f.changeEntry('hash-entry', '/#free-start', 'push');
  assert.equal(f.pop('home-entry', '/').stopped, false);
  assert.equal(f.pop('hash-entry', '/#free-start').stopped, false);
  assert.equal(f.click('/en/services').defaultPrevented, false);
  assert.deepEqual(f.replacements, []);
  assert.deepEqual(f.assignments, []);
  f.assertNextUnchanged();
});

test('bfcache restoration retains locally owned entries and interrupted-router recovery', () => {
  const f = fixture();
  f.changeEntry('about', '/en/about', 'push');
  f.emit('pageshow', { persisted: true });
  assert.equal(f.pop('home-entry', '/').stopped, false);
  assert.deepEqual(f.replacements, []);
  f.pop('foreign-about', '/en/about');
  f.changeEntry('home-entry', '/', 'traverse');
  f.emit('pageshow', { persisted: true });
  assert.deepEqual(f.replacements, ['https://example.test/en/about', 'https://example.test/'], 'Restoring an interrupted router still replaces it as before');
});

test('cross-policy history still reloads even when the entry is known', () => {
  const f = fixture();
  f.changeEntry('private', '/en/client/tests', 'push');
  assert.equal(f.pop('private', '/en/client/tests').stopped, true);
  assert.deepEqual(f.replacements, ['https://example.test/en/client/tests']);
});

test('engines without native entry keys keep existing CSP-class behavior without state or API mutation', () => {
  for (const options of [{ navigationAvailable: false }, { key: undefined }]) {
    const f = fixture(options);
    if (f.window.navigation) f.window.navigation.currentEntry = null;
    assert.equal(f.ownsCurrentEntry(), true);
    assert.equal(f.emit('popstate').stopped, false);
    assert.equal(f.pop('private', '/en/client/tests').stopped, true);
    f.assertNextUnchanged();
  }
});

test('effect remount retains document provenance after the prehydration guard is disposed', () => {
  const f = fixture();
  assert.equal(f.window.__cspPreHydration, undefined);
  f.changeEntry('about', '/en/about', 'push');
  f.remountEffects();
  assert.equal(f.pop('home-entry', '/').stopped, false);
  assert.equal(f.pop('foreign-about', '/en/about').stopped, true);
  assert.deepEqual(f.replacements, ['https://example.test/en/about']);
  f.assertNextUnchanged();
});


test('persisted pageshow blocks a foreign tree before Next restores it, without a prior interruption', () => {
  const f = fixture(); let routerRestores = 0;
  f.window.addEventListener('pageshow', event => { if (event.persisted) routerRestores++; });
  // BFCache reactivation updates currentEntry before pageshow; do not emit a
  // preceding popstate or mark this document's router as interrupted.
  f.changeEntry('foreign-about', '/en/about', 'traverse');
  assert.equal(f.ownsCurrentEntry(), false);
  assert.equal(f.emit('pageshow', { persisted: true }).stopped, true);
  assert.equal(routerRestores, 0);
  assert.deepEqual(f.replacements, ['https://example.test/en/about']);
  f.assertNextUnchanged();
});

test('persisted pageshow allows Next to restore an owned same-policy BFCache entry', () => {
  const f = fixture(); let routerRestores = 0;
  f.window.addEventListener('pageshow', event => { if (event.persisted) routerRestores++; });
  f.changeEntry('about', '/en/about', 'push');
  f.changeEntry('home-entry', '/', 'traverse');
  assert.equal(f.emit('pageshow', { persisted: true }).stopped, false);
  assert.equal(routerRestores, 1);
  assert.deepEqual(f.replacements, []);
  f.assertNextUnchanged();
});

test('non-persisted pageshow does not trigger foreign-entry recovery', () => {
  const f = fixture();
  f.changeEntry('foreign-about', '/en/about', 'traverse');
  assert.equal(f.emit('pageshow', { persisted: false }).stopped, false);
  assert.deepEqual(f.replacements, []);
});
