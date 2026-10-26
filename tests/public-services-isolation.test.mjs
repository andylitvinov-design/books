import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { ALCHEMY_PANEL_IDS, assertAlchemyPanelOrder } from '../scripts/helpers/alchemy-panel-contract.mjs';
import { createPublicServicesPageManager, permittedPublicServicesRead } from '../scripts/helpers/public-services-isolation.mjs';
import { createReadOnlyPublicViewportIsolation } from '../scripts/helpers/public-viewport-isolation.mjs';
import { createSyntheticContactRegistrationGate, createCompactAlchemyRegistrationProfile } from '../scripts/helpers/contact-channel-verifier.mjs';
import { fixture, route, request, origin } from './helpers/public-services-isolation-fixture.mjs';

const documents = ['en', 'ru', 'es'].flatMap(locale => [
  '/services', '/services/catalog', '/services/imagery-therapy', '/services/systemic-constellations',
  '/services/business-consulting', '/services/alchemy-of-soul', '/tests', '/services/dao-health-profile',
  ...(['en', 'ru'].includes(locale) ? ['/services/hypnotherapy-course'] : []),
].map(path => '/' + locale + path));
for (const path of documents) test('general profile retains visited document ' + path, async () => {
  const f = fixture(), manager = createPublicServicesPageManager(f.browser, {origin});
  await manager.createPage(390);
  const r = route(origin + path);
  assert.equal(permittedPublicServicesRead(r.request(), origin), true);
  await f.contexts[0].routes[0](r);
  assert.deepEqual(r.calls, ['fetch', 'fulfill', 'dispose']);
  await manager.close(); assert.equal(f.contexts[0].closed, true);
});

const assets = [
  ['/_next/static/chunks/app/[locale]/services/page-abc.js', 'script'],
  ['/_next/static/chunks/app/%5Blocale%5D/services/page-abc.js', 'script'],
  ['/_next/static/css/abc.css', 'stylesheet'], ['/_next/static/media/abc.woff2', 'font'],
  ['/images/holistic-house/portrait-static/andy-384-37fe593841e3.webp', 'image'],
  ['/_next/image?url=%2Fimages%2Fholistic-house%2Fandy-about.png&w=828&q=75', 'image'],
];
for (const [path, type] of assets) test('general profile retains typed local asset ' + type + ' ' + path, async () => {
  for (const method of ['GET', 'HEAD']) {
    const f = fixture(), manager = createPublicServicesPageManager(f.browser, {origin});
    await manager.createPage(390); const r = route(origin + path, method, type);
    await f.contexts[0].routes[0](r); assert.deepEqual(r.calls, ['fetch', 'fulfill', 'dispose']);
    await manager.close();
  }
});

const denied = [
  ['/api/service-enquiries', 'POST', 'fetch', true], ['/api/service-enquiries', 'GET', 'fetch', true],
  ['/api/holistic-support/talismans', 'GET', 'fetch', true], ['/api', 'GET', 'document', true],
  ['/%61pi/service-enquiries', 'GET', 'fetch', true], ['/api%2fservice-enquiries', 'GET', 'fetch', true],
  ['/en/services', 'PATCH', 'fetch', true], ['/en/services?', 'GET', 'document'],
  ['/en/services?private=DO_NOT_LOG', 'GET', 'document'], ['/en/services', 'GET', 'fetch'],
  ['/en/services?_rsc=abc', 'GET', 'fetch'], ['/en/services/free-situation-review', 'GET', 'document'],
  ['/en/services/free-consultation', 'GET', 'document'], ['/es/services/hypnotherapy-course', 'GET', 'document'],
  ['/en/holistic-support', 'GET', 'document'], ['/en/app', 'GET', 'document'], ['/en/client/tests', 'GET', 'document'],
  ['https://wa.me/14376066502', 'GET', 'document'], ['https://provider.invalid/images/DO_NOT_LOG.webp', 'GET', 'image'],
  ['/_next/image?url=https%3A%2F%2Fprovider.invalid%2Fx.png&w=828&q=75', 'GET', 'image'],
  ['/_next/image?url=%2Fimages%2Fhero.webp&w=828&q=75&q=80', 'GET', 'image'],
  ['/_next/image?url=%2Fapi%2Fprivate.png&w=828&q=75', 'GET', 'image'],
  ['/_next/static/chunks/abc.js?DO_NOT_LOG', 'GET', 'script'], ['/_next/static/abc.json', 'GET', 'fetch'],
  ['/images/private.json', 'GET', 'image'], ['/images/hero.webp', 'GET', 'script'],
  ['/audio/holistic-house-soft-melody-gentle-waves-96s.wav', 'GET', 'media'],
  ['http://name:DO_NOT_LOG@127.0.0.1:3100/en/services', 'GET', 'document'],
];
for (const [target, method, type, fatal] of denied) test('general boundary blocks unapproved request ' + denied.findIndex(row => row[0] === target && row[1] === method), async () => {
  const f = fixture(), manager = createPublicServicesPageManager(f.browser, {origin});
  await manager.createPage(390);
  const r = route(target.startsWith('http') ? target : origin + target, method, type);
  assert.equal(permittedPublicServicesRead(r.request(), origin), false);
  await f.contexts[0].routes[0](r); assert.deepEqual(r.calls, ['abort']);
  if (fatal) await assert.rejects(manager.close(), /UNEXPECTED_API_OR_WRITE/); else await manager.close();
  assert.equal(f.contexts[0].closed, true);
  assert.doesNotMatch(JSON.stringify(manager.summary()), /DO_NOT_LOG|https?:|provider/);
});

test('every page receives its boundaries before creation and old context closes before next', async () => {
  const f = fixture(), manager = createPublicServicesPageManager(f.browser, {origin});
  for (const width of [320, 360, 390, 1188]) {
    const page = await manager.createPage(width);
    const current = f.contexts.at(-1);
    assert.equal(current.options.viewport.width, width);
    assert.ok(f.contexts.slice(0, -1).every(context => context.closed));
    await page.close();
  }
  await manager.close(); assert.ok(f.contexts.every(context => context.closed));
  assert.equal(manager.summary().length, 4);
  await assert.rejects(manager.createPage(390), /manager is closed/);
  const before = f.events.length; await manager.close(); assert.equal(f.events.length, before);
});
test('unclosed previous scenario is rejected and remains owned for final cleanup', async () => {
  const f = fixture(), manager = createPublicServicesPageManager(f.browser, {origin});
  await manager.createPage(390);
  await assert.rejects(manager.createPage(320), /must close its page/);
  assert.equal(f.contexts.length, 1); await manager.close(); assert.equal(f.contexts[0].closed, true);
});
test('manager close during pending context setup drains and closes that context', async () => {
  let release, started;
  const waiting = new Promise(resolve => { release = resolve; });
  const began = new Promise(resolve => { started = resolve; });
  const f = fixture({beforeRoute: async () => { started(); await waiting; }});
  const manager = createPublicServicesPageManager(f.browser, {origin});
  const creating = manager.createPage(390); await began;
  await assert.rejects(manager.createPage(320), /must be sequential/);
  let settled = false; const closing = manager.close().then(() => { settled = true; });
  await new Promise(resolve => setImmediate(resolve)); assert.equal(settled, false);
  release(); await creating; await closing;
  assert.equal(f.contexts.length, 1); assert.equal(f.contexts[0].closed, true);
});
test('invalid origin or viewport cannot create any browser context', async () => {
  const f = fixture();
  assert.throws(() => createPublicServicesPageManager(f.browser, {origin: 'https://public.example.invalid'}));
  const manager = createPublicServicesPageManager(f.browser, {origin});
  await assert.rejects(manager.createPage(1024), /viewports/); assert.equal(f.contexts.length, 0); await manager.close();
});
for (const options of [{status: 302}, {responseUrl: 'https://provider.invalid/DO_NOT_LOG'}, {fetchFailure: true}, {disposeFailure: true}]) {
  test('redirect/response failure remains fatal and never continues ' + JSON.stringify(options), async () => {
    const f = fixture(), manager = createPublicServicesPageManager(f.browser, {origin});
    await manager.createPage(390); const r = route(origin + '/en/services', 'GET', 'document', options);
    await f.contexts[0].routes[0](r);
    await assert.rejects(manager.assertClean(), /ROUTE_HANDLER_FAILED/);
    await assert.rejects(manager.close(), /ROUTE_HANDLER_FAILED/);
    assert.equal(f.contexts[0].closed, true); assert.ok(!r.calls.includes('continue'));
    if (!options.fetchFailure) assert.ok(r.calls.includes('dispose'));
  });
}
for (const method of ['GET', 'POST']) test('late API ' + method + ' during context teardown is blocked and fatal', async () => {
  const late = route(origin + '/api/service-enquiries', method, 'fetch');
  const f = fixture({lateRequest: late}), manager = createPublicServicesPageManager(f.browser, {origin});
  await manager.createPage(390); await assert.rejects(manager.close(), /UNEXPECTED_API_OR_WRITE/);
  assert.deepEqual(late.calls, ['abort']); assert.equal(f.contexts[0].closed, true);
});
test('pending approved read drains before context closure', async () => {
  let release; const pending = new Promise(resolve => { release = resolve; });
  const f = fixture(), manager = createPublicServicesPageManager(f.browser, {origin});
  await manager.createPage(390);
  const r = route(origin + '/en/services', 'GET', 'document', {beforeFetch: () => pending});
  const handling = f.contexts[0].routes[0](r);
  let settled = false; const closing = manager.close().then(() => { settled = true; });
  let repeatedSettled = false; const repeated = manager.close().then(() => { repeatedSettled = true; });
  await new Promise(resolve => setImmediate(resolve)); assert.equal(settled, false);
  assert.equal(repeatedSettled, false, 'Repeated close must await the same pending drain');
  release(); await handling; await closing; await repeated; assert.equal(f.contexts[0].closed, true);
  assert.equal(f.events.filter(event => event.endsWith(':context-close')).length, 1);
});
test('real popup attempts survive navigation and unexpected popup close is drained', async () => {
  const f = fixture({latePopup: true}), manager = createPublicServicesPageManager(f.browser, {origin});
  const page = await manager.createPage(390);
  assert.equal(page.window.open('https://provider.invalid/DO_NOT_LOG'), null);
  page.window.__hhPublicViewportPopupAttempts = 0;
  await assert.rejects(manager.close(), /UNEXPECTED_POPUP/);
  assert.ok(f.contexts[0].pages.every(page => page.closed));
  assert.equal(manager.summary()[0].popupAttempts, 1);
});
test('websocket attempt closes without transport and close failure remains fatal', async () => {
  const f = fixture(), manager = createPublicServicesPageManager(f.browser, {origin});
  await manager.createPage(390);
  await f.contexts[0].sockets[0]({ async close() { throw Error('DO_NOT_LOG_SOCKET'); } });
  await assert.rejects(manager.close(), /UNEXPECTED_WEBSOCKET/);
  assert.ok(manager.summary()[0].reasons.includes('WEBSOCKET_CLOSE_FAILED'));
});

const compactBody = profile => ({operationId: '12345678-1234-4123-8123-123456789abc', serviceTitle: profile.serviceTitle,
  description: profile.description, sourcePath: profile.sourcePath, locale: profile.locale,
  contact: profile.contact, contactConsent: true, website: ''});
for (const locale of ['en', 'ru', 'es']) test('exact armed compact fixture composes with fallback guard without API transport ' + locale, async () => {
  const f = fixture(), manager = createPublicServicesPageManager(f.browser, {origin}); await manager.createPage(390);
  const endpoint = origin + '/' + locale + '/services/alchemy-of-soul';
  const profile = createCompactAlchemyRegistrationProfile(endpoint), gate = createSyntheticContactRegistrationGate(endpoint, {profile});
  const asset = route(origin + '/images/hero.webp', 'GET', 'image', {fallback: f.contexts[0].routes[0]});
  await gate.handle(asset); assert.deepEqual(asset.calls, ['fallback', 'fetch', 'fulfill', 'dispose']);
  gate.beginInteraction();
  const submit = route(origin + '/api/service-enquiries', 'POST', 'fetch', {body: compactBody(profile)});
  await gate.handle(submit); assert.deepEqual(submit.calls, ['fulfill']);
  assert.equal(submit.responses[0].status, 201); assert.equal(gate.submissions.length, 1); gate.assertClean();
  gate.beginTeardown(); await gate.drain(); await manager.close();
});
for (const variant of ['early', 'duplicate', 'wrong-body', 'foreign', 'query', 'teardown']) test('compact fixture rejects ' + variant + ' with zero transport', async () => {
  const profile = createCompactAlchemyRegistrationProfile(origin + '/en/services/alchemy-of-soul');
  const gate = createSyntheticContactRegistrationGate(origin + profile.sourcePath, {profile});
  if (variant !== 'early') gate.beginInteraction();
  if (variant === 'duplicate') await gate.handle(route(origin + '/api/service-enquiries', 'POST', 'fetch', {body: compactBody(profile)}));
  if (variant === 'teardown') gate.beginTeardown();
  const body = compactBody(profile); if (variant === 'wrong-body') body.contact = {...body.contact, phone: '+14165559999'};
  const target = (variant === 'foreign' ? 'https://provider.invalid' : origin) + '/api/service-enquiries' + (variant === 'query' ? '?' : '');
  const r = route(target, 'POST', 'fetch', {body}); await gate.handle(r); assert.deepEqual(r.calls, ['abort']);
  assert.throws(() => gate.assertClean()); gate.beginTeardown(); await gate.drain();
});
test('unrelated API read through armed fixture fallback hits the context guard, never transport', async () => {
  const f = fixture(), manager = createPublicServicesPageManager(f.browser, {origin}); await manager.createPage(390);
  const gate = createSyntheticContactRegistrationGate(origin + '/en/services/alchemy-of-soul'); gate.beginInteraction();
  const r = route(origin + '/api/holistic-support/talismans', 'GET', 'fetch', {fallback: f.contexts[0].routes[0]});
  await gate.handle(r); assert.deepEqual(r.calls, ['fallback', 'abort']);
  gate.beginTeardown(); await gate.drain(); await assert.rejects(manager.close(), /UNEXPECTED_API_OR_WRITE/);
});

const script = readFileSync(new URL('../scripts/verify-public-services-production.mjs', import.meta.url), 'utf8');
function integration(scenario, options = {}) {
  const f = fixture(options), writes = [];
  const source = script.split('\n').filter(line => !line.startsWith('import ') &&
    !line.startsWith('const require =') && !line.startsWith('const { chromium }') && !line.startsWith('const { expect }')).join('\n');
  const start = source.indexOf('  // Spanish Alchemy'), end = source.indexOf('  diagnostics.devIssueOverlay = false;');
  assert.ok(start > 0 && end > start);
  const code = source.slice(0, start) + scenario + '\n' + source.slice(end);
  return {f, writes, run: () => runInNewContext('(async () => {\n' + code + '\n})()', {
    process: {env: {}}, chromium: {launch: async () => f.browser}, assert, createPublicServicesPageManager,
    mkdir: async () => {}, writeFile: async (path, data) => { writes.push(JSON.parse(data)); if (options.writeFailure) throw Error('WRITE_FAILURE'); },
    console: {log() {}}, URL,
  })};
}
function assertReviewsOnlyHeightPolicy(source) {
  const expected = ['featured-video', 'hero', 'situations', 'method', 'report', 'video', 'reviews', 'formats', 'faq', 'request'];
  assert.deepEqual(ALCHEMY_PANEL_IDS, expected, 'Exact canonical ten-panel order');
  assertAlchemyPanelOrder(expected.map(name => ({name})));
  for (let index = 0; index < expected.length; index++) {
    assert.throws(() => assertAlchemyPanelOrder(expected.filter((_, i) => i !== index).map(name => ({name}))), assert.AssertionError);
  }
  assert.throws(() => assertAlchemyPanelOrder([...expected].reverse().map(name => ({name}))), assert.AssertionError);
  const ast = ts.createSourceFile('actual-public-runner.mjs', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  assert.equal(ast.parseDiagnostics.length, 0);
  const filters = [], checks = [], measurements = [], orders = [], counts = [];
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'panelHeights') measurements.push(node.initializer);
    if (ts.isCallExpression(node)) {
      const name = node.expression.getText(ast);
      if (name === 'panelHeights.filter') filters.push(node);
      if (name === 'panelHeights.some') checks.push(node);
      if (name === 'assertAlchemyPanelOrder') orders.push(node);
      if (name === 'assert.equal' && node.arguments[0]?.getText(ast) === 'panelHeights.length') counts.push(node);
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  assert.equal(measurements.length, 2, 'Both actual measurement scopes retained');
  for (const measurement of measurements) {
    assert.match(measurement.getText(ast), /^await main\.locator\("\[data-alchemy-panel\]"\)\.evaluateAll/);
    assert.match(measurement.getText(ast), /\(nodes\) =>\s*nodes\.map\(/, 'Every measured panel retained, no prefilter');
  }
  assert.equal(orders.length, 1); assert.equal(orders[0].arguments[0].getText(ast), 'panelHeights');
  assert.equal(counts.length, 1); assert.equal(counts[0].arguments[1].getText(ast), '10');
  assert.equal(filters.length, 2, 'Both geometry verdicts retained');
  assert.equal(checks.length, 2, 'Both diagnostic predicates retained');
  for (const call of [...filters, ...checks]) {
    assert.equal(call.arguments.length, 1); const predicate = call.arguments[0];
    assert.ok(ts.isArrowFunction(predicate));
    const test = runInNewContext('(' + predicate.getText(ast) + ')', {}, {timeout: 1000});
    for (const name of [...expected, 'unknown', 'Reviews', 'reviews-extra']) {
      for (const height of [99, 100, 101]) {
        assert.equal(test({name, height, max: 100}), name !== 'reviews' && height > 100,
          'Only the exact reviews panel is exempt: ' + name + '/' + height);
      }
    }
  }
}
test('actual runner exempts only reviews and bounds every other measured panel', () => {
  assertReviewsOnlyHeightPolicy(script);
  for (const [before, after] of [
    ['p.name !== "reviews" && p.height > p.max', 'false'],
    ['p.name !== "reviews" && p.height > p.max', 'p.name !== "reviews" && p.name !== "hero" && p.height > p.max'],
    ['nodes.map(node =>', 'nodes.filter(node => node.getAttribute("data-alchemy-panel") !== "hero").map(node =>'],
    ['assertAlchemyPanelOrder(panelHeights);', ''],
  ]) {
    const changed = script.replace(before, after); assert.notEqual(changed, script);
    assert.throws(() => assertReviewsOnlyHeightPolicy(changed), assert.AssertionError);
  }
});
test('actual runner setup and finalizer close isolated contexts without changing scenario bodies', async () => {
  const i = integration('const a = await createPage(320); await a.close(); const b = await createPage(390); await b.close();');
  await i.run(); assert.ok(i.f.contexts.every(context => context.closed));
  assert.equal(i.writes[0].network.length, 2); assert.equal(i.f.events.at(-1), 'browser-close');
  assert.doesNotMatch(script, /browser\.newContext|context\.newPage|route\.continue/);
  assert.match(script, /diagnosisIsolation\?\.page \|\| await createPage\(width\)/);
  assert.match(script, /const hub = page;/);
  assertReviewsOnlyHeightPolicy(script);
  for (const invariant of ['scrollWidth <= width + 1', 'max: window.innerHeight - 80', 
    'openRegisteredCompactPhoneChooser(pricing, expect, page)', 'openRegisteredContactChannelChooser(target, expect, page)',
    'assert.deepEqual(diagnostics.pageErrors, []', 'diagnostics.console.filter((entry) => entry.type === "error")']) assert.ok(script.includes(invariant), invariant);
});
test('actual runner preserves UI failure while still attempting context, diagnostics and browser cleanup', async () => {
  const i = integration('await createPage(390); throw Error("PRIMARY_UI_FAILURE");', {closeFailure: true, writeFailure: true});
  await assert.rejects(i.run(), /PRIMARY_UI_FAILURE/); assert.equal(i.writes.length, 1);
  assert.equal(i.f.contexts[0].closed, true); assert.equal(i.f.events.at(-1), 'browser-close');
});
test('actual runner diagnostics write failure does not skip browser closure', async () => {
  const i = integration('await createPage(390);', {writeFailure: true});
  await assert.rejects(i.run(), /WRITE_FAILURE/); assert.equal(i.f.events.at(-1), 'browser-close');
});
test('actual runner context setup failure closes context and preserves setup failure', async () => {
  const i = integration('await createPage(390);', {failSetup: true, closeFailure: true});
  await assert.rejects(i.run(), /SETUP_FAILURE/); assert.equal(i.f.contexts[0].closed, true);
  assert.equal(i.f.events.at(-1), 'browser-close');
});
for (const event of ['console', 'pageerror']) test('actual general diagnostics still fail genuine ' + event + ' errors', async () => {
  const emit = event === 'console'
    ? 'page.handlers.get("console")({type:()=>"error",text:()=>"GENUINE_ERROR",location:()=>({url:""})});'
    : 'page.handlers.get("pageerror")(Error("GENUINE_ERROR"));';
  const i = integration('const page = await createPage(390);' + emit);
  await assert.rejects(i.run(), /Unexpected browser/); assert.equal(i.f.contexts[0].closed, true);
});
test('general blocked-resource console error is not broadly exempted', async () => {
  const i = integration('const page = await createPage(390); page.handlers.get("console")({type:()=>"error",text:()=>"Failed to load resource: net::ERR_BLOCKED_BY_CLIENT",location:()=>({url:""})});');
  await assert.rejects(i.run(), /Unexpected browser console errors/);
  assert.equal(i.writes[0].expectedBoundaryConsoleBlocks, 0);
});
test('actual runner retains late teardown API violation as failure', async () => {
  const r = route(origin + '/api/service-enquiries', 'POST', 'fetch');
  const i = integration('await createPage(390);', {lateRequest: r});
  await assert.rejects(i.run(), /UNEXPECTED_API_OR_WRITE/); assert.deepEqual(r.calls, ['abort']);
  assert.equal(i.f.events.at(-1), 'browser-close');
});
function lateDiagnosticScenario(phase, event, primaryFailure = false) {
  const message = event === 'console'
    ? '{type:()=>"error",text:()=>"LATE_GENUINE_ERROR",location:()=>({url:"http://127.0.0.1:3100/_next/static/late.js",lineNumber:0,columnNumber:0})}'
    : 'Error("LATE_GENUINE_ERROR")';
  return 'const page = await createPage(390); const target = ' + (phase === 'context' ? 'page.context()' : 'browser') +
    '; const close = target.close.bind(target); target.close = async () => { await close(); page.handlers.get(' + JSON.stringify(event) +
    ')(' + message + '); };' + (primaryFailure ? 'throw Error("PRIMARY_UI_FAILURE");' : '');
}
for (const phase of ['context', 'browser']) for (const event of ['console', 'pageerror']) {
  test('actual runner rejects genuine ' + event + ' arriving during ' + phase + ' closure and writes final evidence', async () => {
    const i = integration(lateDiagnosticScenario(phase, event));
    await assert.rejects(i.run(), /Unexpected browser/);
    assert.ok(i.f.contexts.every(context => context.closed));
    assert.equal(i.f.events.filter(event => event === 'browser-close').length, 1);
    assert.equal(i.writes.length, 1);
    if (event === 'console') assert.equal(i.writes[0].console[0].text, 'LATE_GENUINE_ERROR');
    else assert.deepEqual(i.writes[0].pageErrors, ['LATE_GENUINE_ERROR']);
  });
  test('late ' + phase + ' ' + event + ' and artifact failure cannot replace original UI failure', async () => {
    const i = integration(lateDiagnosticScenario(phase, event, true), {writeFailure: true});
    await assert.rejects(i.run(), /PRIMARY_UI_FAILURE/);
    assert.ok(i.f.contexts.every(context => context.closed));
    assert.equal(i.f.events.filter(event => event === 'browser-close').length, 1);
    assert.equal(i.writes.length, 1);
  });
}
test('post-cleanup diagnostic verdict precedes artifact-write failure without skipping write', async () => {
  const i = integration(lateDiagnosticScenario('browser', 'console'), {writeFailure: true});
  await assert.rejects(i.run(), /Unexpected browser console errors/);
  assert.equal(i.writes.length, 1); assert.equal(i.writes[0].console[0].text, 'LATE_GENUINE_ERROR');
  assert.equal(i.f.events.at(-1), 'browser-close');
});
test('browser-close failure still attempts final diagnostic artifact and preserves the cleanup error', async () => {
  const i = integration('await createPage(390); const close = browser.close.bind(browser); browser.close = async () => { await close(); throw Error("BROWSER_CLOSE_FAILURE"); };', {writeFailure: true});
  await assert.rejects(i.run(), /BROWSER_CLOSE_FAILURE/);
  assert.equal(i.writes.length, 1); assert.equal(i.f.events.at(-1), 'browser-close');
});
test('mutation controls detect transport-profile relaxation and manager context-cleanup omission', async () => {
  const source = readFileSync(new URL('../scripts/helpers/public-services-isolation.mjs', import.meta.url), 'utf8');
  const compile = value => runInNewContext(value.replace(/^import .*\n/gm, '').replaceAll('export function', 'function') +
    '\n({createPublicServicesPageManager, permittedPublicServicesRead})', {assert, URL, createReadOnlyPublicViewportIsolation});
  for (const [target, replacement, url, type] of [
    ['url.origin !== origin || ', '', 'https://provider.invalid/images/hero.webp', 'image'],
    ['type === \'document\' && !url.search', 'type === \'document\'', origin + '/en/services?private=DO_NOT_LOG', 'document'],
    ["imagePath(url.searchParams.get('url'))", 'true', origin + '/_next/image?url=https%3A%2F%2Fprovider.invalid%2Fx.webp&w=828&q=75', 'image'],
  ]) {
    assert.equal(source.split(target).length - 1, 1);
    const changed = compile(source.replace(target, replacement));
    assert.equal(changed.permittedPublicServicesRead(request(url, 'GET', type), origin), true, 'Existing negative must detect this mutation');
    assert.equal(permittedPublicServicesRead(request(url, 'GET', type), origin), false);
  }
  const target = 'await previous.close();'; assert.equal(source.split(target).length - 1, 1);
  const changed = compile(source.replace(target, 'await previous.assertClean();'));
  const f = fixture(), manager = changed.createPublicServicesPageManager(f.browser, {origin}); await manager.createPage(390); await manager.close();
  assert.equal(f.contexts[0].closed, false, 'The ordinary cleanup test detects the omitted close');
});
