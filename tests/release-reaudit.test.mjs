import assert from 'node:assert/strict';
import { readFileSync, constants as fsConstants } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { projectReleaseImageryBuildManifest, readReleaseImageryBuildDiagnostic } from '../scripts/helpers/release-imagery-build-diagnostic.mjs';
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
// Inspect exact menu link templates, then execute each real handler. A global
// handler count would accept a missing Shop handler if another link gained one.
function siteMenuLinkTemplates(componentSource) {
  const ast = ts.createSourceFile('site-navigation.tsx', componentSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const links = [];
  function attribute(opening, name) {
    return opening.attributes.properties.find(item => ts.isJsxAttribute(item) && item.name.getText(ast) === name);
  }
  function value(opening, name) {
    const initializer = attribute(opening, name)?.initializer;
    if (!initializer) return '';
    return ts.isStringLiteral(initializer) ? initializer.text : initializer.expression?.getText(ast) ?? '';
  }
  function visit(node, inMenu = false, group = '') {
    if (ts.isJsxElement(node)) {
      const opening = node.openingElement;
      const className = value(opening, 'className');
      inMenu ||= opening.tagName.getText(ast) === 'details' && className === 'site-main-menu';
      if (inMenu && ['site-main-menu-panel', 'site-main-menu-grid', 'site-main-menu-more'].includes(className)) group = className;
      if (inMenu && opening.tagName.getText(ast) === 'Link') {
        const handler = attribute(opening, 'onClick')?.initializer;
        links.push({ group, href: value(opening, 'href'), id: value(opening, 'data-nav-item'),
          handler: handler && ts.isJsxExpression(handler) ? handler.expression : undefined, ast });
      }
    }
    ts.forEachChild(node, child => visit(child, inMenu, group));
  }
  visit(ast);
  return links;
}
function assertSiteMenuLinksClose(componentSource) {
  const links = siteMenuLinkTemplates(componentSource);
  assert.deepEqual(links.map(({ group, href, id }) => [group, href, id]), [
    ['site-main-menu-panel', 'freeStartHref', ''],
    ['site-main-menu-grid', 'item.href', 'item.id'],
    ['site-main-menu-more', '"/" + activeLocale + "/shop"', 'shop'],
    ['site-main-menu-more', '`/${activeLocale}/cart`', 'cart'],
    ['site-main-menu-more', 'item.href', 'item.id'],
    ['site-main-menu-more', '`/${activeLocale}/about`', 'about'],
  ], 'exact menu templates include localized Shop immediately before cart');
  for (const { group, href, handler, ast } of links) {
    assert.ok(handler && ts.isArrowFunction(handler), `${group} ${href} has its own close handler`);
    const compiled = ts.transpileModule(`(${handler.getText(ast)})`, {
      compilerOptions: { target: ts.ScriptTarget.ES2022 },
    }).outputText;
    for (const initiallyOpen of [true, false]) {
      const context = { siteMenuRef: { current: { open: initiallyOpen } }, languageRef: { current: { open: true } } };
      runInNewContext(compiled, context)();
      assert.equal(context.siteMenuRef.current.open, false, `${group} ${href} closes its own menu`);
      assert.equal(context.languageRef.current.open, true, `${group} ${href} does not close the language menu`);
    }
    assert.doesNotThrow(() => runInNewContext(compiled, { siteMenuRef: { current: null } })(), `${group} ${href} tolerates an unmounted menu`);
  }
}
test('locale selection and every exact site-menu link, including Shop, close their own disclosures immediately', () => {
  assert.match(navigationSource, /function selectLocale\([^)]*\)\s*\{\s*if \(languageRef\.current\) languageRef\.current\.open = false/);
  assert.match(navigationSource, /onClick=\{\(\) => selectLocale\(next\)\}/);
  assertSiteMenuLinksClose(navigationSource);
});
test('menu-close contract rejects missing or inert handlers on each exact link template', () => {
  for (const link of siteMenuLinkTemplates(navigationSource)) {
    assert.ok(link.handler);
    const start = link.handler.getStart(link.ast), end = link.handler.getEnd();
    for (const replacement of ['undefined', '() => {}', '() => { if (siteMenuRef.current) siteMenuRef.current.open = true; }']) {
      assertSiteMenuLinksClose(navigationSource);
      const mutated = navigationSource.slice(0, start) + replacement + navigationSource.slice(end);
      const diagnostic = replacement === 'undefined' ? /has its own close handler/ : /closes its own menu/;
      assert.throws(() => assertSiteMenuLinksClose(mutated), { message: diagnostic }, `${link.group} ${link.href}: ${replacement}`);
    }
  }
});
test('Shop menu-close contract rejects the wrong disclosure and a missing null guard', () => {
  const link = siteMenuLinkTemplates(navigationSource).find(entry => entry.id === 'shop');
  assert.ok(link?.handler);
  const start = link.handler.getStart(link.ast), end = link.handler.getEnd();
  for (const [replacement, diagnostic] of [
    ['() => { if (languageRef.current) languageRef.current.open = false; }', /closes its own menu/],
    ['() => { siteMenuRef.current.open = false; }', /tolerates an unmounted menu/],
  ]) {
    assertSiteMenuLinksClose(navigationSource);
    const mutated = navigationSource.slice(0, start) + replacement + navigationSource.slice(end);
    assert.throws(() => assertSiteMenuLinksClose(mutated), { message: diagnostic });
  }
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
  assert.match(verifier, /import \{ assertReleasePaidMode, verifyReleasePaidEnquiry \} from '\.\/helpers\/release-paid-enquiry-verifier\.mjs'/);
  assert.match(verifier, /verifyReleasePaidEnquiry\(browser, \{ origin, label, locale, width \}, expect\)/);
  assert.match(verifier, /exercise\('chromium', chromium, 390\).*exercise\('chromium', chromium, 1365\).*exercise\('webkit', webkit, 390\).*exercise\('webkit', webkit, 1365\)/);
  const paid = verifier.match(/check\('paid-imagery-consultation-safe-handoff'[\s\S]*?verifyReleasePaidEnquiry[^;]+;/)?.[0];
  assert.ok(paid);
  assert.doesNotMatch(paid, /page\.goto|openContactChannelChooser|assertPreparedContactChannels|privateFieldsAbsent|bothChannelsVerified/);
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

test('release poster audit delegates the full original image set to the disclosure-aware strict verifier', () => {
  const verifier = read('scripts/verify-release-reaudit.mjs');
  const posters = read('scripts/helpers/release-services-poster-verifier.mjs');
  assert.match(verifier, /import \{ verifyReleasePosters \} from '\.\/helpers\/release-services-poster-verifier\.mjs';/);
  assert.equal(verifier.split('await verifyReleasePosters(page, { path, locale, origin }, expect);').length - 1, 1);
  assert.match(posters, /const images = await posters\.elementHandles\(\)/);
  assert.ok(posters.indexOf('const images = await posters.elementHandles()') < posters.indexOf('await summary.click()'));
  assert.match(posters, /await decodeReadyPoster\(image, expect\)/);
  assert.match(posters, /Opening the disclosure must not replace an original poster source/);
  assert.doesNotMatch(posters, /:visible|waitForTimeout|setAttribute|\.filter\(|route\(|fetch\(/);
});

const imageryEntry = '/[locale]/services/imagery-therapy/page';
const imageryFiles = [
  'static/chunks/webpack-0123456789abcdef.js',
  'static/chunks/main-app-0123456789abcdef.js',
  'static/chunks/123-0123456789abcdef.js',
  'static/chunks/4bd1b696-0123456789abcdef.js',
  'static/chunks/app/layout-0123456789abcdef.js',
  'static/chunks/app/[locale]/services/imagery-therapy/page-0123456789abcdef.js',
];
const imageryManifest = files => JSON.stringify({ pages: { [imageryEntry]: files } });
const nominalImageryManifest = imageryManifest(imageryFiles);
const nominalImageryProjection = { status: 'present', entrypoint: imageryEntry, files: imageryFiles };
function assertNominalImageryProjection() {
  assert.deepEqual(projectReleaseImageryBuildManifest(nominalImageryManifest), nominalImageryProjection);
}
function fakeImageryFs({ text = nominalImageryManifest, failAt, code = 'EACCES', directory = true,
  symlink = false, regular = true, size = Buffer.byteLength(text), afterSize = size,
  changed = false, readChunk = Infinity } = {}) {
  const bytes = Buffer.from(text);
  const calls = [];
  let offset = 0;
  let stats = 0;
  const call = name => {
    calls.push(name);
    if (name === failAt) throw Object.assign(new Error('SECRET_BUILD_ERROR_CANARY'), { code });
  };
  return { calls, fs: {
    lstatSync(path) {
      assert.equal(path, '.next'); call('lstat');
      return { isDirectory: () => directory, isSymbolicLink: () => symlink };
    },
    openSync(path, flags) {
      assert.equal(path, '.next/app-build-manifest.json');
      assert.equal(flags, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW | fsConstants.O_NONBLOCK);
      call('open'); return 17;
    },
    fstatSync(fd) {
      assert.equal(fd, 17); call('fstat'); stats += 1;
      return { isFile: () => regular, size: stats === 1 ? size : afterSize,
        mtimeMs: stats > 1 && changed ? 2 : 1, ino: 7, dev: 8 };
    },
    readSync(fd, buffer, start, length, position) {
      assert.equal(fd, 17); assert.equal(position, null); call('read');
      assert.ok(buffer.length <= 4 * 1024 * 1024 + 1);
      const count = Math.min(bytes.length - offset, length, readChunk);
      bytes.copy(buffer, start, offset, offset + count); offset += count;
      return count;
    },
    closeSync(fd) { assert.equal(fd, 17); call('close'); },
  } };
}

test('generated Imagery diagnostic projects one exact public entry and no other values', () => {
  assertNominalImageryProjection();
  const manifest = JSON.stringify({ pages: {
    '/SECRET_PRIVATE_ROUTE_CANARY/page': ['SECRET_PRIVATE_FILE_CANARY'],
    [imageryEntry]: imageryFiles,
  } });
  const output = projectReleaseImageryBuildManifest(manifest);
  assert.deepEqual(output, nominalImageryProjection);
  assert.doesNotMatch(JSON.stringify(output), /SECRET_/);
  assert.ok(Buffer.byteLength(JSON.stringify(output)) < 11000);
});

const invalidImageryShapes = [
  ['bad JSON', '{SECRET_JSON_CANARY', 'json'],
  ['null root', 'null', 'shape'],
  ['array root', '[]', 'shape'],
  ['missing pages', '{}', 'shape'],
  ['null pages', '{"pages":null}', 'shape'],
  ['array pages', '{"pages":[]}', 'shape'],
  ['unknown top field', JSON.stringify({ pages: { [imageryEntry]: imageryFiles }, secret: 'SECRET_FIELD_CANARY' }), 'shape'],
  ['non-array files', imageryManifest({ secret: 'SECRET_FILES_CANARY' }), 'files'],
  ['empty files', imageryManifest([]), 'files'],
  ['too many files', imageryManifest(Array.from({ length: 65 }, (_, i) => `static/chunks/${i}-0123456789abcdef.js`)), 'files'],
  ['duplicate files', imageryManifest([...imageryFiles, imageryFiles[0]]), 'duplicates'],
  ['oversize text', ' '.repeat(4 * 1024 * 1024 + 1), 'size'],
  ['non-text input', { secret: 'SECRET_OBJECT_CANARY' }, 'size'],
];
for (const [name, manifest, reason] of invalidImageryShapes) {
  test(`generated Imagery projection rejects ${name} without a partial file list`, () => {
    assertNominalImageryProjection();
    const output = projectReleaseImageryBuildManifest(manifest);
    assert.deepEqual(output, { status: 'invalid', reason });
    assert.equal(Object.hasOwn(output, 'files'), false);
    assert.doesNotMatch(JSON.stringify(output), /SECRET_|static\/chunks/);
  });
}

const unsafeImageryFiles = [
  null, 17, {}, ['SECRET_ARRAY_CANARY'],
  'SECRET_FILENAME_CANARY',
  'static/chunks/' + '1'.repeat(161) + '-0123456789abcdef.js',
  '/static/chunks/123-0123456789abcdef.js',
  'https://SECRET_HOST_CANARY/static/chunks/123-0123456789abcdef.js',
  '//SECRET_HOST_CANARY/static/chunks/123-0123456789abcdef.js',
  'static/chunks/../123-0123456789abcdef.js',
  'static/chunks/./123-0123456789abcdef.js',
  'static/chunks\\123-0123456789abcdef.js',
  'static/chunks/123-0123456789abcdef.js?SECRET_QUERY_CANARY=secret',
  'static/chunks/123-0123456789abcdef.js#SECRET_HASH_CANARY',
  'static/chunks/123-0123456789abcdef.js\n',
  'static/chunks/123-0123456789abcdef.js\r',
  'static/chunks/123-0123456789abcdef.js\u2028',
  'static/chunks/123-0123456789abcdef.js\u2029',
  'static/chunks/123-0123456789abcdef.js\0',
  'static/chunks/123-0123456789abcdef.js.map',
  'static/chunks/123-0123456789abcdef.css',
  'static/chunks/123-0123456789abcde.js',
  'static/chunks/123-0123456789abcdef0.js',
  'static/chunks/123-0123456789ABCDEF.js',
  'static/chunks/polyfills-0123456789abcdef.js',
  'static/chunks/app/[locale]/services/imagery-therapy/page-0123456789abcdef.js?x=SECRET_QUERY_CANARY',
  'static/chunks/app/%5Blocale%5D/services/imagery-therapy/page-0123456789abcdef.js',
  'static/chunks/app/%255Blocale%255D/services/imagery-therapy/page-0123456789abcdef.js',
  'static/chunks/app/[locale]/layout-0123456789abcdef.js',
  'static/chunks/app/[locale]/page-0123456789abcdef.js',
  'static/chunks/app/[locale]/services/page-0123456789abcdef.js',
  'static/chunks/app/[locale]/services/free-situation-review/page-0123456789abcdef.js',
  'static/chunks/app/[locale]/client/page-0123456789abcdef.js',
  'static/chunks/app/admin/page-0123456789abcdef.js',
];
for (const [index, unsafe] of unsafeImageryFiles.entries()) {
  test(`generated Imagery projection rejects unsafe filename case ${index + 1}`, () => {
    assertNominalImageryProjection();
    const output = projectReleaseImageryBuildManifest(imageryManifest([...imageryFiles, unsafe]));
    assert.deepEqual(output, { status: 'invalid', reason: 'filename' });
    assert.equal(Object.hasOwn(output, 'files'), false);
    assert.doesNotMatch(JSON.stringify(output), /SECRET_|static\/chunks/);
  });
}

test('generated Imagery diagnostic distinguishes a missing exact key without visiting sibling entries', () => {
  assertNominalImageryProjection();
  for (const key of ['/en/services/imagery-therapy/page', imageryEntry + '/', '/[locale]/services/imagery-therapy', '/SECRET_ROUTE_CANARY']) {
    assert.deepEqual(projectReleaseImageryBuildManifest(JSON.stringify({ pages: { [key]: ['SECRET_OTHER_CANARY'] } })),
      { status: 'absent', reason: 'entrypoint' });
  }
});

test('generated Imagery reader uses fixed paths, no-follow open, bounded reads and closes its descriptor', () => {
  const fixture = fakeImageryFs({ readChunk: 7 });
  assert.deepEqual(readReleaseImageryBuildDiagnostic(fixture.fs), nominalImageryProjection);
  assert.equal(fixture.calls[0], 'lstat');
  assert.equal(fixture.calls[1], 'open');
  assert.equal(fixture.calls.at(-1), 'close');
  assert.equal(fixture.calls.filter(call => call === 'close').length, 1);
});

const imageryReadFaults = [
  ['missing directory', { failAt: 'lstat', code: 'ENOENT' }, { status: 'absent', reason: 'manifest' }],
  ['missing manifest', { failAt: 'open', code: 'ENOENT' }, { status: 'absent', reason: 'manifest' }],
  ['directory is a symlink', { symlink: true }, { status: 'invalid', reason: 'file-type' }],
  ['directory is not a directory', { directory: false }, { status: 'invalid', reason: 'file-type' }],
  ['manifest is a symlink', { failAt: 'open', code: 'ELOOP' }, { status: 'unreadable' }],
  ['manifest is not regular', { regular: false }, { status: 'invalid', reason: 'file-type' }],
  ['manifest is empty', { text: '' }, { status: 'invalid', reason: 'size' }],
  ['file too large before read', { size: 4 * 1024 * 1024 + 1 }, { status: 'invalid', reason: 'size' }],
  ['file grows beyond byte limit', { text: ' '.repeat(4 * 1024 * 1024 + 2), size: 1 }, { status: 'invalid', reason: 'size' }],
  ['file shrinks during read', { size: Buffer.byteLength(nominalImageryManifest) + 1 }, { status: 'invalid', reason: 'changed' }],
  ['file metadata changes', { changed: true }, { status: 'invalid', reason: 'changed' }],
  ['file final size changes', { afterSize: 1 }, { status: 'invalid', reason: 'changed' }],
  ...['lstat', 'open', 'fstat', 'read', 'close'].map(failAt => [`${failAt} fails`, { failAt }, { status: 'unreadable' }]),
];
for (const [name, options, expected] of imageryReadFaults) {
  test(`generated Imagery reader safely records ${name}`, () => {
    assert.deepEqual(readReleaseImageryBuildDiagnostic(fakeImageryFs().fs), nominalImageryProjection);
    const fixture = fakeImageryFs(options);
    const output = readReleaseImageryBuildDiagnostic(fixture.fs);
    assert.deepEqual(output, expected);
    assert.doesNotMatch(JSON.stringify(output), /SECRET_|static\/chunks/);
    if (fixture.calls.includes('fstat')) assert.equal(fixture.calls.at(-1), 'close');
    if (options.symlink || options.directory === false) assert.deepEqual(fixture.calls, ['lstat']);
    if (options.regular === false || options.size > 4 * 1024 * 1024) assert.ok(!fixture.calls.includes('read'));
  });
}

function runImageryDiagnosticCaller(source, { label = 'local', rows = [{ name: 'synthetic-paid-boundary', ok: false }],
  diagnostic = nominalImageryProjection, observe = false } = {}) {
  const ast = ts.createSourceFile('verify-release-reaudit.mjs', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const variables = ast.statements.filter(ts.isVariableStatement).flatMap(statement => [...statement.declarationList.declarations]);
  const declaration = variables.filter(node => node.name.getText(ast) === 'buildAttribution');
  assert.equal(declaration.length, 1);
  const modeCheck = ast.statements.find(statement => ts.isExpressionStatement(statement)
    && ts.isCallExpression(statement.expression) && statement.expression.expression.getText(ast) === 'assertReleasePaidMode');
  assert.ok(modeCheck && modeCheck.end < declaration[0].pos, 'validate mode before diagnostic read');
  const counts = { reads: 0 };
  const buildAttribution = runInNewContext(declaration[0].initializer.getText(ast), {
    label, readReleaseImageryBuildDiagnostic: () => { counts.reads += 1; return diagnostic; },
  });
  const firstTail = ast.statements.find(statement => ts.isVariableStatement(statement)
    && statement.declarationList.declarations.some(node => node.name.getText(ast) === 'failed'));
  assert.ok(firstTail);
  const writes = [];
  const logs = [];
  let error;
  try {
    runInNewContext(source.slice(firstTail.getStart(ast)), {
      results: rows, origin: label === 'local' ? 'http://127.0.0.1:3123' : 'https://holistichouse.vercel.app',
      label, evidence: '/tmp/release-reaudit', buildAttribution,
      process: { env: { GITHUB_SHA: '0123456789abcdef0123456789abcdef01234567' }, argv: observe ? ['--observe'] : [] },
      writeFileSync: (path, content) => writes.push({ path, content: JSON.parse(content) }),
      console: { log: text => logs.push(JSON.parse(text)) }, assert,
    });
  } catch (caught) { error = caught; }
  return { counts, writes, logs, error };
}
function assertImageryCallerContract(source) {
  assert.equal(source.split("import { readReleaseImageryBuildDiagnostic } from './helpers/release-imagery-build-diagnostic.mjs';").length - 1, 1);
  for (const label of ['local', 'live']) {
    for (const diagnostic of [nominalImageryProjection, { status: 'absent', reason: 'manifest' }, { status: 'invalid', reason: 'filename' }, { status: 'unreadable' }]) {
      const result = runImageryDiagnosticCaller(source, { label, diagnostic });
      assert.equal(result.counts.reads, label === 'local' ? 1 : 0, 'local-only manifest read');
      assert.equal(result.writes.length, 1);
      assert.equal(result.writes[0].path, `/tmp/release-reaudit/${label}-results.json`);
      assert.equal(result.writes[0].content.total, 1);
      assert.equal(result.writes[0].content.failed, 1, 'original failed count');
      assert.deepEqual(result.writes[0].content.results, [{ name: 'synthetic-paid-boundary', ok: false }]);
      assert.equal(Object.hasOwn(result.writes[0].content, 'buildAttribution'), label === 'local', 'no live projection');
      if (label === 'local') assert.deepEqual(result.writes[0].content.buildAttribution, diagnostic);
      assert.equal(result.logs.length, 1);
      assert.equal(Object.hasOwn(result.logs[0], 'buildAttribution'), label === 'local', 'local-only console projection');
      if (label === 'local') assert.deepEqual(result.logs[0].buildAttribution, diagnostic, 'exact sanitized console projection');
      assert.deepEqual(result.logs, [{ label, total: 1, failed: 1, failures: [{ name: 'synthetic-paid-boundary', ok: false }],
        ...(label === 'local' ? { buildAttribution: diagnostic } : {}) }], 'original console failures remain intact');
      assert.match(result.error?.message ?? '', /Re-audit failed; inspect evidence/, 'original failure remains fatal');
    }
  }
}

test('actual Release caller keeps every original failure fatal with only local diagnostic augmentation', () => {
  const source = read('scripts/verify-release-reaudit.mjs');
  assertImageryCallerContract(source);
  const success = runImageryDiagnosticCaller(source, { rows: [{ name: 'synthetic-pass', ok: true }] });
  assert.equal(success.error, undefined);
  assert.equal(success.writes[0].content.failed, 0);
  const observe = runImageryDiagnosticCaller(source, { observe: true });
  assert.equal(observe.error, undefined);
  assert.equal(observe.writes[0].content.failed, 1);
});

const imageryCallerMutants = [
  ['live read', source => source.replace("label === 'local' ? readReleaseImageryBuildDiagnostic() : undefined", 'readReleaseImageryBuildDiagnostic()'), /local-only manifest read/],
  ['live field', source => source.replace("...(label === 'local' ? { buildAttribution } : {})", "...{ buildAttribution: buildAttribution ?? { status: 'unreadable' } }"), /no live projection/],
  ['missing field', source => source.replace(", ...(label === 'local' ? { buildAttribution } : {})", ''), /no live projection/],
  ['wrong output path', source => source.replace('`${evidence}/${label}-results.json`', '`${evidence}/${label}-replacement.json`'), /results\.json/],
  ['forged failed count', source => source.replace('failed: failed.length, results,', 'failed: 0, results,'), /original failed count/],
  ['removed fatal assertion', source => source.replace("if (!process.argv.includes('--observe')) assert.equal(failed.length, 0, 'Re-audit failed; inspect evidence');", ''), /original failure remains fatal/],
  ['missing console projection', source => source.replace('failures: failed, ...(label === \'local\' ? { buildAttribution } : {})', 'failures: failed'), /local-only console projection/],
  ['live console projection', source => source.replace('failures: failed, ...(label === \'local\' ? { buildAttribution } : {})', "failures: failed, buildAttribution: buildAttribution ?? { status: 'unreadable' }"), /local-only console projection/],
  ['forged console projection', source => source.replace('failures: failed, ...(label === \'local\' ? { buildAttribution } : {})', "failures: failed, ...(label === 'local' ? { buildAttribution: { status: 'present', files: [] } } : {})"), /exact sanitized console projection/],
  ['erased console failures', source => source.replace('failures: failed, ...(label === \'local\' ? { buildAttribution } : {})', 'failures: [], ...(label === \'local\' ? { buildAttribution } : {})'), /original console failures remain intact/],
];
for (const [name, mutate, message] of imageryCallerMutants) {
  test(`generated Imagery caller contract rejects ${name} after a nominal execution`, () => {
    const source = read('scripts/verify-release-reaudit.mjs');
    assertImageryCallerContract(source);
    const mutant = mutate(source);
    assert.notEqual(mutant, source);
    assert.throws(() => assertImageryCallerContract(mutant), message);
  });
}

test('generated Imagery diagnostic is source-bound to the public route and existing local artifact contract', () => {
  const route = read('app/[locale]/services/imagery-therapy/page.tsx');
  assert.match(route, /PersonalServiceLanding/);
  assert.match(route, /const service = "imagery-therapy" as const/);
  assert.match(route, /return <PersonalServiceLanding locale=\{locale as ServicePageLocale\} service=\{service\} \/>/);
  const lock = JSON.parse(read('package-lock.json'));
  assert.equal(lock.packages['node_modules/next'].version, '15.5.21');
  const workflow = read('.github/workflows/release-reaudit.yml');
  assert.match(workflow, /name: Build exact proposed release\s+run: npm run build/);
  assert.match(workflow, /node scripts\/verify-release-reaudit\.mjs\s+env:\s+REAUDIT_ORIGIN: http:\/\/127\.0\.0\.1:3123\s+REAUDIT_LABEL: local/);
  assert.match(workflow, /name: release-reaudit-evidence\s+path: \/tmp\/release-reaudit\/\s+retention-days: 7/);
  assert.match(workflow, /node --test[^\n]+tests\/release-reaudit\.test\.mjs/);
  const helper = read('scripts/helpers/release-imagery-build-diagnostic.mjs');
  assert.doesNotMatch(helper, /process\.env|process\.argv|fetch\(|request\.|writeFile|console\.|child_process|playwright|eval\(/);
  const paid = read('scripts/helpers/release-paid-enquiry-verifier.mjs');
  assert.doesNotMatch(paid, /readReleaseImageryBuildDiagnostic|projectReleaseImageryBuildManifest|buildAttribution|app-build-manifest/);
});

const imageryConsoleCanaries = [
  ['other page data', JSON.stringify({ pages: { [imageryEntry]: imageryFiles,
    '/SECRET_ROUTE_CANARY': ['SECRET_PRIVATE_FILENAME_CANARY?SECRET_QUERY_CANARY=value'] } }), nominalImageryProjection],
  ['unsafe target filename', imageryManifest([...imageryFiles, 'https://SECRET_HOST_CANARY/private?SECRET_QUERY_CANARY=value']), { status: 'invalid', reason: 'filename' }],
  ['malformed manifest', 'SECRET_PARSE_CANARY {', { status: 'invalid', reason: 'json' }],
  ['missing exact entry', JSON.stringify({ pages: { '/SECRET_ROUTE_CANARY': ['SECRET_FILE_CANARY'] } }), { status: 'absent', reason: 'entrypoint' }],
];
for (const [name, manifest, expected] of imageryConsoleCanaries) {
  test(`local console emits only the sanitized projection with ${name}`, () => {
    const source = read('scripts/verify-release-reaudit.mjs');
    assertImageryCallerContract(source);
    const diagnostic = projectReleaseImageryBuildManifest(manifest);
    assert.deepEqual(diagnostic, expected);
    for (const label of ['local', 'live']) {
      const result = runImageryDiagnosticCaller(source, { label, diagnostic });
      assert.equal(result.counts.reads, label === 'local' ? 1 : 0);
      assert.equal(result.logs.length, 1);
      assert.equal(Object.hasOwn(result.logs[0], 'buildAttribution'), label === 'local');
      if (label === 'local') assert.deepEqual(result.logs[0].buildAttribution, expected);
      assert.doesNotMatch(JSON.stringify(result.logs), /SECRET_|https:\/\/SECRET_/);
      assert.equal(result.logs[0].failed, 1);
      assert.deepEqual(result.logs[0].failures, [{ name: 'synthetic-paid-boundary', ok: false }]);
      assert.match(result.error?.message ?? '', /Re-audit failed; inspect evidence/);
    }
  });
}
