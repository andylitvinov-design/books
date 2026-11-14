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
      name, inside, open: true, focusCount: 0, dataset: {},
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
    pathname: "/en", activeLocale: "en",
    previousNavigation: { current: { pathname: "/en", locale: "en" } },
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
  context.pathname = '/en/services';
  navigationEffect(['pathname', 'activeLocale'], context);
  assert.ok(menus.every(menu => !menu.open));
  menus.forEach(menu => { menu.open = true; });
  context.activeLocale = 'ru';
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
  assert.equal((navigationSource.match(/onClick=\{\(\) => \{ if \(siteMenuRef\.current\) siteMenuRef\.current\.open = false; \}\}/g) ?? []).length, 9, 'All nine menu link groups close their disclosure, including Services, human specialists, Shop, Cart and Free App');
  assert.match(navigationSource, /data-nav-item="install"[\s\S]*?onClick=\{\(\) => \{ if \(siteMenuRef\.current\) siteMenuRef\.current\.open = false; \}\}/);
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
  assert.match(verifier, /check\('paid-imagery-consultation-messenger-only-handoff'/);
  assert.match(verifier, /data-consultation-action/);
  assert.match(verifier, /searchParams\.get\('topic'\)/);
  assert.match(verifier, /option\[value="30-min"\].*€50/);
  assert.match(verifier, /option\[value="60-min"\].*€100/);
  assert.match(verifier, /data-messenger-only-intake/);
  assert.match(verifier, /data-messenger-only-channel/);
  assert.match(verifier, /contactFieldsAbsent: true/);
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

test('release audit verifies messenger-only paid service capture without collecting typed personal data', () => {
  const verifier = read('scripts/verify-release-reaudit.mjs');
  const paid = verifier.slice(verifier.indexOf("check('paid-imagery-consultation-messenger-only-handoff'"), verifier.indexOf('if (width === 390)'));
  assert.match(paid, /data-service-visual-screen="final-capture"/);
  assert.match(paid, /data-messenger-only-intake/);
  assert.match(paid, /form, input, textarea/);
  assert.match(paid, /data-messenger-offer-format/);
  assert.match(paid, /option\[value="30-min"\].*€50/);
  assert.match(paid, /option\[value="60-min"\].*€100/);
  assert.match(paid, /data-messenger-only-channel/);
  assert.match(paid, /noopener/);
  assert.match(paid, /noreferrer/);
  assert.match(paid, /referrerpolicy/);
  assert.match(paid, /Only approved WhatsApp or Telegram destinations/);
  assert.match(paid, /services\/free-situation-review/);
  assert.match(paid, /messageSent: false/);
  assert.match(paid, /contactFieldsAbsent: true/);
  assert.doesNotMatch(paid, /data-compact-hydrated|contactConsent|enquiry-qa@/);
});

test('initial navigation effect and identical replay preserve preopened native menus', () => {
  const { menus, context, cleanup } = navigationHarness();
  navigationEffect(['pathname', 'activeLocale'], context);
  navigationEffect(['pathname', 'activeLocale'], context);
  assert.ok(menus.every(menu => menu.open));
  assert.ok(menus.every(menu => menu.focusCount === 0));
  cleanup();
});

test('release audit preserves all four browser lanes while isolating CI process load', () => {
  const verifier = read('scripts/verify-release-reaudit.mjs');
  const segment = verifier.match(/const browserLanes = \[([\s\S]*?)\];/)?.[1] || '';
  const lanes = [...segment.matchAll(/\['(chromium|webkit)',\s*(chromium|webkit),\s*(390|1365)\]/g)];
  assert.deepEqual(lanes.map(row => row[1] + '/' + row[3]),
    ['webkit/390', 'webkit/1365', 'chromium/390', 'chromium/1365']);
  assert.ok(lanes.every(row => row[1] === row[2]), 'Browser names must match launchers');
  assert.match(verifier, /for \(const \[engine, browserType, width\] of browserLanes\) \{/);
  assert.match(verifier, /await exercise\(engine, browserType, width\)/);
  assert.doesNotMatch(verifier, /Promise\.all\(\[exercise\(/);
  assert.match(verifier, /console\.info\('\[release-reaudit\] public route '/);
  for (const safety of ["check('public-page'", "check('csp-navigation-and-history'",
    "check('private-anonymous'", "check('api-video-csp-restrictive'"]) {
    assert.ok(verifier.includes(safety), 'Preserve release safety contract: ' + safety);
  }
});


test('release re-audit follows current My Space Today guest Profile and explicit CSP transitions', () => {
  const source = read('scripts/verify-release-reaudit.mjs');
  const navigation = read('lib/site-navigation-model.js');
  const route = read('app/[locale]/app/portrait/page.jsx');
  const workspace = read('components/app/app-workspace.jsx');
  const guest = read('components/app/cabinet-guest-overview.jsx');
  const hub = read('components/app/profile-hub-tabs.jsx');
  const builder = read('components/personality-profiles-builder.tsx');
  assert.ok(navigation.includes("profile: 'app/portrait'"), 'Profile dock keeps canonical route');
  assert.ok(route.includes("return <AppWorkspaceNavigator locale={locale} path={['portrait']} />"), 'My Space Today is the real entry');
  assert.ok(!route.includes('ProfileTestEntry') && !route.includes('hasPrivateIntent'), 'No obsolete test-first route');
  assert.ok(workspace.includes("state !== 'ready' && page === 'portrait'"), 'Signed-out visitors need a guest view');
  assert.ok(workspace.includes('<CabinetGuestOverview'), 'Approved My Space guest view remains');
  assert.ok(workspace.includes('<ProfileHubTabs locale={locale} active="today" />'), 'Today is the first tab');
  assert.ok(guest.includes('data-cabinet-guest-overview'));
  assert.ok(guest.includes("'/client/tests'"), 'Free tests remain reachable without sign-in');
  assert.ok(!guest.includes('appFetch('), 'Guest overview does not fetch private client data');
  assert.ok(hub.includes('publicEntry = false') && hub.includes('data-profile-hub-tabs'));
  assert.ok(builder.includes('data-profile-direct-tests'), 'Public builder still exposes tests');
  const start = source.indexOf('// The unified Profile dock now opens the PRIVATE Cabinet first.');
  const finish = source.indexOf('const discoveryBottom = cspPage.locator(');
  assert.ok(start > 0 && finish > start + 1000, 'Real CSP browser journey is preserved');
  const flow = source.slice(start, finish);
  for (const required of [
    "toHaveURL(origin + '/en/app/portrait')",
    "toHaveAttribute('data-csp-class', 'private')",
    "locator('[data-cabinet-guest-overview]')",
    "locator('a[href=\"/en/client/tests\"]')",
    "locator('[data-profile-hub-tabs] [data-profile-tab=\"today\"]')",
    "locator('[data-profile-tests-first], [data-my-tests-dashboard], [data-profile-results-archive]')).toHaveCount(0)",
    "locator('.mobile-bottom-navigation')).toHaveCount(0)",
    "cspPage.goto(origin + '/en/personality-profiles', { waitUntil: 'domcontentloaded' })",
    "toHaveURL(origin + '/en/personality-profiles')",
    "toHaveAttribute('data-csp-class', 'public-video')",
    "locator('[data-profile-direct-tests]').click()",
    "toHaveURL(origin + '/en/client/tests')",
  ]) assert.ok(flow.includes(required), 'Missing My Space/CSP regression: ' + required);
  assert.ok(source.includes("toHaveAttribute('href', '/en/app/portrait')"), 'Private test navigation returns to Profile');
  assert.ok(!source.includes('Public profile discovery must retain same-policy soft navigation'));
});

test('release audit refuses unbounded public animation frame stalls while retaining real browser coverage', () => {
  const verifier = read('scripts/verify-release-reaudit.mjs');
  const begin = verifier.indexOf('const settlePublicDocument = async stage =>');
  const end = verifier.indexOf('const routePassed = await check(', begin);
  assert.ok(begin > 0 && end > begin, 'Exact public document settling scope exists');
  const scope = verifier.slice(begin, end);
  for (const anchor of [
    'await Promise.race([',
    'requestAnimationFrame(() => requestAnimationFrame(resolve))',
    'frameTimer = setTimeout(() => reject(new Error',
    'two-frame wait exceeded 5000ms',
    'clearTimeout(frameTimer)',
    'pendingPublicRequests.size === 0',
    "checkpoints.push({ type: 'settled'",
  ]) assert.ok(scope.includes(anchor), 'Bounded WebKit settling preserves '+anchor);
});

test('Maya hub route remains fatal with bounded WebKit navigation and poster decode', () => {
  const verifier = read('scripts/verify-release-reaudit.mjs');
  const poster = read('scripts/public-poster-readiness.mjs');
  for (const anchor of [
    "['/books/maya-tradition', 'en']",
    "['/books/maya-tradition?lang=ru', 'ru']",
    'const routeTimer = setTimeout(',
    "'[release-reaudit] ROUTE_STALLED '",
    'process.exit(1)',
    "if (path === '/books/maya-tradition')",
    'publicPageState = await createPublicPage()',
    "console.info('[release-reaudit] strict poster decode count='",
    'await decodeReadyPoster(image, expect)',
    "fullPage: path !== '/books/maya-tradition', timeout: 15000",
    'clearTimeout(routeTimer)',
  ]) assert.ok(verifier.includes(anchor), 'Real route remains checked: ' + anchor);
  for (const anchor of [
    'await Promise.race([',
    'el.decode()',
    'Poster decode timed out after 7000ms',
    'clearTimeout(decodeDeadline)',
    "throw new Error('Poster identity/readiness changed during decode')",
  ]) assert.ok(poster.includes(anchor), 'Strict bounded poster decoding: ' + anchor);
});

test('language menu keyboard readiness is installed with native handlers and cleared on cleanup', () => {
  const { menus, listeners, cleanup } = navigationHarness();
  assert.equal(menus[0].dataset.hhKeyboardReady, 'true');
  assert.equal(listeners.has('keydown'),true);
  cleanup();
  assert.equal(menus[0].dataset.hhKeyboardReady,undefined);
  assert.equal(listeners.size,0);
});

test('client landing locale pages use independent real browser pages and retain fatal acceptance', () => {
  const verifier = read('scripts/verify-release-reaudit.mjs');
  const isolate = verifier.indexOf("if (['/en/client','/ru/client','/es/client'].includes(path))");
  const assertRoute = verifier.indexOf("const routePassed = await check('public-page'", isolate);
  assert.ok(isolate > 0 && assertRoute > isolate,
    'all three guest Client locales isolate the previous WebKit document before audit');
  const scope = verifier.slice(isolate, assertRoute);
  for (const assertion of ['await page.close()', 'publicPageState = await createPublicPage()',
    'page = publicPageState.page', 'errors = publicPageState.errors'])
    assert.ok(scope.includes(assertion), 'isolated route retains new document tracking: ' + assertion);
  for (const required of ['const routeTimer = setTimeout(',
    "process.exit(1)", "await settlePublicDocument('before-assertions')",
    "await settlePublicDocument('before-next-navigation')",
    'await decodeReadyPoster(image, expect)', "assert.equal(state.htmlLang, locale",
    "if (path === '/books/maya-tradition')"])
    assert.ok(verifier.includes(required), 'Do not skip original public/CSP/locale checks: ' + required);
});
test('release re-audit decodes every visible poster but recognises only approved CSS-hidden phone Services media',()=>{
  const verifier=read('scripts/verify-release-reaudit.mjs');
  const css=read('components/services-assist-mobile.module.css');
  assert.ok(verifier.includes("const compactMobileServices = width === 390 && /^\\/(en|ru|es)\\/services$/.test(path);"));
  for(const selector of ['[data-services-meet]', '[data-personal-testimonials="services"]', '#method-videos'])
    assert.ok(verifier.includes("'"+selector+"'"), 'Only reviewed mobile legacy region may be hidden: '+selector);
  assert.match(css,/\.assistPage :global\(\[data-services-meet\]\)/);
  assert.match(css,/\.assistPage :global\(#method-videos\)/);
  assert.match(css,/display:none!important/);
  assert.ok(verifier.includes('getComputedStyle(root).display === \'none\''));
  assert.ok(verifier.includes('el.getClientRects().length === 0'));
  assert.ok(verifier.includes("typeof proof.source === 'string' && proof.source.length > 0"));
  assert.ok(verifier.includes('explicitlyHiddenLegacyPosters > 0'));
  assert.ok(verifier.includes("const videoPanel = page.locator('[data-services-unified-panel=\"video\"]')"));
  assert.ok(verifier.includes("await expect(videoChoices).toBeHidden();"));
  assert.ok(verifier.includes("await videoTrigger.click();"));
  assert.ok(verifier.includes("await expect(videoTrigger).toHaveAttribute('aria-expanded', 'true')"));
  assert.ok(verifier.includes("videoChoices.locator('a[data-assist-video-scenario]')).toHaveCount(3)"));
  assert.ok(verifier.includes("await expect(createVideo).toHaveAttribute('href', '/' + locale + '/holistic-support/mandala')"));
  assert.ok(verifier.includes("await expect(videoChoices.locator('iframe')).toHaveCount(0)"));
  assert.ok(verifier.includes('await decodeReadyPoster(image, expect)'), 'Visible and other-route posters still require real decoding');
  assert.ok(verifier.includes('await expect(posters).toHaveCount(posterImages.length)'), 'Poster count must never be reduced');
  assert.ok(verifier.includes("assert.deepEqual(errors, [], 'No page errors after public poster decoding and scrolling')"));
});
