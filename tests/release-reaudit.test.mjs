import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
const read = path => readFileSync(path, 'utf8');
// Execute the real effect callbacks, transpiling TypeScript without rewriting their logic.
const navigationSource = read('components/site-navigation.tsx');
const navigationAst = ts.createSourceFile('site-navigation.tsx', navigationSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const navigationEffects = [];
function collectNavigationEffects(node) {
  if (ts.isCallExpression(node) && node.expression.getText(navigationAst) === 'useEffect') {
    navigationEffects.push(node);
  }
  ts.forEachChild(node, collectNavigationEffects);
}
collectNavigationEffects(navigationAst);
function navigationEffect(dependencies, context) {
  const matches = navigationEffects.filter(node => {
    const deps = node.arguments[1];
    return deps && ts.isArrayLiteralExpression(deps)
      && deps.elements.map(entry => entry.getText(navigationAst)).join(',') === dependencies.join(',');
  });
  assert.equal(matches.length, 1, `exactly one effect for [${dependencies}]`);
  const callback = matches[0].arguments[0].getText(navigationAst);
  const compiled = ts.transpileModule(`(${callback})`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return runInNewContext(compiled, context)();
}
function navigationHarness() {
  class Node {}
  const menus = ['language', 'site'].map(name => {
    const inside = new Node();
    const menu = {
      name, inside, open: true, focusCount: 0,
      contains: target => target === inside || target === menu,
      querySelector: selector => {
        assert.equal(selector, 'summary');
        return { focus: () => { menu.focusCount += 1; } };
      },
    };
    return menu;
  });
  const listeners = new Map();
  const context = {
    Node,
    languageRef: { current: menus[0] }, siteMenuRef: { current: menus[1] },
    document: {
      addEventListener: (type, listener) => {
        assert.equal(listeners.has(type), false, `no duplicate ${type} listener`);
        listeners.set(type, listener);
      },
      removeEventListener: (type, listener) => {
        assert.equal(listeners.get(type), listener, `remove the registered ${type} listener`);
        listeners.delete(type);
      },
    },
  };
  const cleanup = navigationEffect([], context);
  assert.deepEqual([...listeners.keys()].sort(), ['focusin', 'keydown', 'pointerdown']);
  return { menus, context, listeners, cleanup, outside: new Node() };
}
test('both navigation disclosures dismiss outside pointer/focus, but retain the targeted menu', () => {
  for (const type of ['pointerdown', 'focusin']) {
    const { menus, listeners, outside, cleanup } = navigationHarness();
    for (const active of menus) {
      menus.forEach(menu => { menu.open = true; });
      listeners.get(type)({ target: active.inside });
      assert.equal(active.open, true, `${type} inside ${active.name} must keep it open`);
      assert.equal(menus.find(menu => menu !== active).open, false);
      listeners.get(type)({ target: outside });
      assert.ok(menus.every(menu => !menu.open), `${type} outside closes both menus`);
    }
    menus.forEach(menu => { menu.open = true; });
    listeners.get(type)({ target: null });
    assert.ok(menus.every(menu => menu.open), 'non-Node event targets are ignored');
    cleanup();
  }
});
test('Escape closes either disclosure and restores its summary focus; unrelated keys do nothing', () => {
  for (const index of [0, 1]) {
    const { menus, listeners, cleanup } = navigationHarness();
    menus.forEach((menu, i) => { menu.open = i === index; });
    let prevented = 0;
    const event = { key: 'Enter', preventDefault: () => { prevented += 1; } };
    listeners.get('keydown')(event);
    assert.equal(menus[index].open, true);
    assert.equal(prevented, 0);
    assert.ok(menus.every(menu => menu.focusCount === 0));
    event.key = 'Escape';
    listeners.get('keydown')(event);
    assert.ok(menus.every(menu => !menu.open));
    assert.equal(menus[index].focusCount, 1);
    assert.equal(menus[1 - index].focusCount, 0);
    assert.equal(prevented, 1);
    listeners.get('keydown')(event);
    assert.equal(prevented, 1, 'Escape without an open menu is not intercepted');
    assert.equal(menus[index].focusCount, 1, 'closed menus do not steal focus');
    cleanup();
  }
});
test('Escape closes both open disclosures and unmount removes every registered listener', () => {
  const { menus, listeners, cleanup } = navigationHarness();
  listeners.get('keydown')({ key: 'Escape', preventDefault() {} });
  assert.ok(menus.every(menu => !menu.open));
  assert.equal(menus.reduce((count, menu) => count + menu.focusCount, 0), 1);
  assert.equal(typeof cleanup, 'function');
  cleanup();
  assert.equal(listeners.size, 0);
});
test('route or active-locale changes close both disclosures without stealing focus', () => {
  const { menus, context, cleanup } = navigationHarness();
  navigationEffect(['pathname', 'activeLocale'], context);
  assert.ok(menus.every(menu => !menu.open));
  assert.ok(menus.every(menu => menu.focusCount === 0));
  context.languageRef.current = null;
  context.siteMenuRef.current = null;
  assert.doesNotThrow(() => navigationEffect(['pathname', 'activeLocale'], context));
  cleanup();
});
test('locale selection and site-menu links close their own disclosures immediately', () => {
  assert.match(navigationSource, /function selectLocale\([^)]*\)\s*\{\s*if \(languageRef\.current\) languageRef\.current\.open = false/);
  assert.match(navigationSource, /onClick=\{\(\) => selectLocale\(next\)\}/);
  assert.equal((navigationSource.match(/onClick=\{\(\) => \{ if \(siteMenuRef\.current\) siteMenuRef\.current\.open = false; \}\}/g) ?? []).length, 6, 'All six menu link groups close their disclosure, including Shop and Cart');
});
test('Maya hub changes its actual locale and reader destinations, not just the menu label', () => {
  const hub = read('app/books/maya-tradition/page.tsx');
  assert.match(hub, /localizedBookText\(volume, locale\)/);
  assert.ok(hub.includes('href={`/${locale}/books/${volume.id}`}'));
  assert.match(hub, /generateMetadata/);
  assert.match(read('components/site-navigation.tsx'), /pathname === "\/books\/maya-tradition"/);
});
test('Maya document language follows the actual unprefixed route contract', () => {
  const middleware = read('middleware.ts');
  assert.match(middleware, /pathname === '\/books\/maya-tradition'/);
  assert.match(middleware, /requestedLanguage === 'ru' \? 'ru' : 'en'/);
  assert.ok(middleware.includes("/^\\/books\\/[^/]+$/.test(pathname)"));
  assert.match(middleware, /requestedLanguage === 'en' \? 'en' : 'ru'/);
});
test('About keeps one consultation form and does not repeat the generic final CTA', () => {
  for (const path of ['app/[locale]/about/page.tsx', 'app/es/about/page.tsx']) {
    const source = read(path);
    assert.equal((source.match(/<PersonalConsultationForm\b/g) ?? []).length, 1, path);
    assert.doesNotMatch(source, /PublicConsultationCta/, path);
  }
});
test('optional translation never blanks the source and can be cancelled and retried', () => {
  const reader = read('components/translated-reader-content.jsx');
  assert.match(reader, /useState\(html\)/);
  assert.doesNotMatch(reader, /setContent\(''\)/);
  assert.match(reader, /controller\.abort\(\)/);
  assert.match(reader, /translations\.length !== texts\.length/);
  assert.match(reader, /clearTimeout\(timeout\)/);
  assert.match(reader, /Retry English translation/);
  assert.match(reader, /lang=\{translated \? 'en' : 'ru'\}/);
});
test('consultation never falls back to an accidental GET with private form fields', () => {
  const form = read('components/personal-consultation-form.tsx');
  const capture = read('components/consultation-choice-capture.tsx');
  assert.match(form, /ConsultationChoiceCapture/);
  assert.match(capture, /whatsappEnquiryUrl\(\{/);
  assert.match(capture, /request: t\.serviceMessages\[serviceChoice\]/);
  assert.match(capture, /Nothing is sent until you press Send/);
  assert.doesNotMatch(capture, /<form|<input|<textarea|FormData|sessionStorage|localStorage/);
});

// Exercise the real network-validation function without React, source rewriting or any external request.
const readerSource = read('components/translated-reader-content.jsx');
const batchSource = readerSource.slice(readerSource.indexOf('async function translateBatch('), readerSource.indexOf('export function TranslatedReaderContent'));
const { translateBatch } = await import('data:text/javascript,' + encodeURIComponent(batchSource + '\nexport { translateBatch };'));
test('translation rejects an incomplete response without losing positional correspondence', async t => {
  t.mock.method(globalThis, 'fetch', async () => ({ ok: true, json: async () => ({ translations: [] }) }));
  await assert.rejects(translateBatch(['source'], new AbortController().signal), /Invalid translation response/);
});
test('translation rejects non-text response entries', async t => {
  t.mock.method(globalThis, 'fetch', async () => ({ ok: true, json: async () => ({ translations: [null] }) }));
  await assert.rejects(translateBatch(['source'], new AbortController().signal), /Invalid translation response/);
});
test('translation preserves valid response order', async t => {
  t.mock.method(globalThis, 'fetch', async () => ({ ok: true, json: async () => ({ translations: ['First', 'Second'] }) }));
  assert.deepEqual(await translateBatch(['one', 'two'], new AbortController().signal), ['First', 'Second']);
});
test('unmount cancellation aborts the real in-flight translation request', async t => {
  let requestSignal;
  t.mock.method(globalThis, 'fetch', (_url, options) => new Promise((_, reject) => {
    requestSignal = options.signal;
    options.signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
  }));
  const controller = new AbortController();
  const pending = translateBatch(['source'], controller.signal);
  controller.abort();
  await assert.rejects(pending, /aborted/);
  assert.equal(requestSignal.aborted, true);
});
test('changing paid service choices derives a fresh WhatsApp URL; free choices open assessment', () => {
  const capture = read('components/consultation-choice-capture.tsx');
  assert.match(capture, /onClick=\{\(\) => setServiceChoice\(choice\)\}/);
  assert.match(capture, /onClick=\{\(\) => setTopic\(choice\)\}/);
  assert.match(capture, /t\.serviceMessages\[serviceChoice\]/);
  assert.match(capture, /t\.topicOptions\[choice\]/);
  assert.match(capture, /const whatsappUrl =/);
  assert.match(capture, /isPaidRequest \? whatsappUrl/);
  assert.match(capture, /services\/free-situation-review/);
  assert.doesNotMatch(capture, /preparedUrl|setPreparedUrl/);
});

test('long Maya readers wait for rendered content instead of global network idleness', () => {
  const verifier = read('scripts/verify-release-reaudit.mjs');
  const block = verifier.match(/check\('maya-reader-and-images'[\s\S]*?return \{ sourceVisible: true, \.\.\.language \};/)?.[0] ?? '';
  assert.match(block, /waitUntil: 'domcontentloaded'/);
  assert.match(block, /reader-article'\)\.waitFor/);
  assert.doesNotMatch(block, /waitUntil: 'networkidle'/);
});



test('release browser audit preserves separate free-topic and paid-service safety contracts', () => {
  const verifier = read('scripts/verify-release-reaudit.mjs');
  assert.match(verifier, /check\('consultation-safe-handoff'/);
  assert.match(verifier, /check\('paid-imagery-consultation-safe-handoff'/);
  assert.match(verifier, /data-consultation-action/);
  assert.match(verifier, /searchParams\.get\('topic'\)/);
  assert.match(verifier, /assertPaidUrl\('session', '60', '€100'\)/);
  assert.match(verifier, /assertPaidUrl\('questions', '30', '€50'\)/);
  assert.match(verifier, /Reset must restore the exact paid request/);
  assert.match(verifier, /check\('csp-navigation-and-history'/);
  assert.match(verifier, /privateIframeBlocked: true/);
  assert.match(verifier, /ignoreDefaultArgs: \['--disable-back-forward-cache'\]/);
  assert.match(verifier, /event\.persisted === true && event\.probe === originalProbe && event\.url/);
  assert.match(verifier, /check\('csp-bfcache-raw-cdp'/);
  assert.match(verifier, /Page\.navigateToHistoryEntry/);
  assert.match(verifier, /assert\.deepEqual\(exceptions, \[\]/);
  assert.match(verifier, /assert\.deepEqual\(cspErrors, \[\]/);
  assert.match(verifier, /decodedPlaybackClaimed: false/);
  assert.match(verifier, /check\('api-video-csp-restrictive'/);
});
