import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { openHomeConversation, createReviewFaultGuard, verifyCurrentReviewFault } from '../scripts/helpers/home-conversation-current-verifier.mjs';
const origin = 'http://127.0.0.1:3187';
const reference = 'HH-AABBCCDDEEFF';
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

function guideFixture(fault = '') {
  let open = fault === 'preopened';
  const guide = { key: 'guide' }, summary = { key: 'summary', click: async () => { if (fault !== 'no-toggle') open = true; } };
  const disclosure = { key: 'disclosure', evaluate: async fn => fn({ open }), locator: selector => { assert.equal(selector, ':scope > summary'); return summary; } };
  const page = { locator: selector => selector.startsWith('details') ? disclosure : guide };
  const expect = node => ({
    toHaveCount: async n => assert.equal(node === guide ? Number(open || fault === 'eager-guide') : fault === 'missing-summary' && node === summary ? 0 : 1, n),
    toBeVisible: async () => { if (node === guide) assert.ok(open && fault !== 'hidden-guide'); },
    toHaveAttribute: async (name, expected) => { if (name === 'open') { assert.equal(open, true); assert.equal(expected, ''); } else { assert.equal(name, 'data-guide-phase'); assert.equal(fault === 'wrong-phase' ? 'conversation' : 'ready', expected); } },
  });
  return { page, expect };
}
test('actual opener uses the native summary after proving deferred absence', async () => { const f = guideFixture(); await openHomeConversation(f.page, f.expect); });
for (const fault of ['preopened', 'eager-guide', 'missing-summary', 'no-toggle', 'hidden-guide', 'wrong-phase']) test('actual opener rejects ' + fault, async () => {
  const f = guideFixture(fault); await assert.rejects(openHomeConversation(f.page, f.expect), { code: 'ERR_ASSERTION' });
});

function reviewFixture(locale, kind, fault = '') {
  const state = { url: '', open: false, consent: fault === 'implicit-consent', phone: '', saved: false, alert: '', submits: 0, unroute: false, gestures: [], posts: 0, trace: [] };
  const sandbox = { window: {} }; let handler;
  const contextListeners = new Map(), pageListeners = new Map();
  const delay = () => new Promise(resolve => setTimeout(resolve, 10));
  const provider = async () => handler({ request: () => ({ url: () => urls()[1], method: () => 'GET' }), abort: () => {} });
  const draft = () => 'Please send the neutral public review instructions. Enquiry: ' + reference;
  const urls = () => ['https://wa.me/14376066502', 'https://t.me/AndyTherapist'].map((base, i) => (fault === 'credential-leak' ? base.replace('https://', 'https://private@') : base) + '?text=' + encodeURIComponent(draft() + (fault === 'contact-leak' ? '+14165550123' : fault === 'different-drafts' && i ? 'different' : '')) + (fault === 'fragment-leak' ? '#private' : ''));
  const payload = () => ({ operationId: '12345678-1234-1234-1234-' + (fault === 'retry-new-operation' && state.submits > 1 ? '000000000002' : '000000000001'),
    serviceTitle: locale === 'en' ? 'Free personal express review' : 'Бесплатная личная экспресс-диагностика',
    description: 'Express review focus: ' + (locale === 'en' ? 'Situation' : 'Ситуация'), sourcePath: '/' + locale + '/services/free-situation-review', locale,
    contact: { displayName: '', email: '', phone: '+14165550123' }, contactConsent: true, website: '' });
  const post = async (late = false) => {
    state.posts++;
    let response;
    await handler({ request: () => ({ url: () => origin + '/api/service-enquiries', method: () => 'POST', postDataJSON: payload }), fulfill: async value => { if (late) await delay(); if (fault === 'late-route-error' && late) throw new Error('SYNTHETIC_ROUTE_FAILURE'); response = value; state.trace.push('fulfilled'); }, abort: () => {} });
    return response;
  };
  const submit = async channel => {
    if (!state.consent && fault !== 'save-before-consent') { state.alert = 'Consent required'; if (fault === 'early-provider-consent') await provider(); return; }
    state.submits++;
    const popup = sandbox.window.open('about:blank', '_blank');
    const response = await post();
    if (response.status === 503) {
      state.alert = 'Failed save';
      if (fault === 'early-provider-failed-save') await provider();
      if (fault === 'false-success') state.saved = true;
      if (fault === 'failed-save-navigates') popup.location.replace(urls()[0]);
      if (fault !== 'failed-popup-left-open') popup.close();
      return;
    }
    state.saved = true; state.alert = '';
    if (fault === 'handoff-not-exercised') { popup.close(); state.alert = 'Unrelated stale alert'; return; }
    if (fault === 'handoff-without-synthetic-exception') sandbox.window.__homeReviewFaultProbe.failures = { push() {} };
    try { popup.location.replace(urls()[channel === 'telegram' ? 1 : 0]); } catch { popup.close(); state.alert = 'Saved, handoff failed'; if (fault === 'receipt-retracted') state.saved = false; }
    if (fault === 'duplicate-save') await post();
  };
  const selectors = {
    'main[data-free-entry-landing="situation"]': 'main', '[data-personal-express-enquiry]': 'enquiry',
    'button[data-express-reveal]': 'reveal', '[data-express-inline-disclosure]': 'disclosure',
    '[data-contact-channel-chooser][data-reiki-phone-enquiry]': 'chooser', 'form': 'form',
    '[data-phone-country-input] input[type="tel"]': 'phone', '[data-phone-country-input] select': 'country',
    'input[type="checkbox"]': 'consent', 'label:has(input[type="checkbox"])': 'label',
    'button[data-contact-channel-submit="whatsapp"]': 'submit-wa', 'button[data-contact-channel-submit="telegram"]': 'submit-tg',
    'a[data-contact-channel]': 'channels', 'a[data-contact-channel="whatsapp"]': 'link-wa', 'a[data-contact-channel="telegram"]': 'link-tg',
  };
  const count = key => key === 'status' ? Number(state.saved) : key === 'channels' ? state.saved ? 2 : 0 : key === 'form' ? Number(!state.saved) : 1;
  const locate = selector => { assert.ok(Object.hasOwn(selectors, selector), 'Known real entry selector ' + selector); return loc(selectors[selector]); };
  const loc = key => ({ key, locator: locate, getByRole: role => { assert.ok(['alert', 'status'].includes(role)); return loc(role); },
    click: async options => {
      if (options?.trial) return;
      state.gestures.push(key);
      if (key === 'reveal') { if (fault !== 'reveal-noop') state.open = true; return; }
      if (key === 'label') { if (fault !== 'ignored-consent') state.consent = true; return; }
      if (key.startsWith('submit-')) { assert.equal(state.open, true); await submit(key === 'submit-wa' ? 'whatsapp' : 'telegram'); return; }
      assert.equal(key, 'link-tg');
      if (fault !== 'fallback-no-request') await provider();
      if (fault === 'duplicate-fallback-request') await provider();
      if (fault === 'fallback-resaves') await post();
      if (fault === 'fallback-retracts') state.saved = false;
      if (fault === 'unexpected-write') await handler({ request: () => ({ url: () => origin + '/api/unexpected', method: () => 'POST' }), abort: () => {} });
      if (fault === 'fallback-navigates-parent') state.url = 'https://t.me/AndyTherapist';
    },
    fill: async value => { assert.equal(key, 'phone'); state.phone = value; },
    selectOption: async value => { assert.equal(key, 'country'); assert.equal(value, 'CA'); },
    getAttribute: async name => { assert.equal(name, 'href'); return urls()[key === 'link-wa' ? 0 : 1]; },
    boundingBox: async () => ({ x: 0, width: 130, height: fault === 'small-fallback' ? 20 : 44 }),
    screenshot: async () => {},
  });
  const children = [];
  const context = {
    pages: () => [page, ...children].filter(child => !child.isClosed()),
    on: (event, fn) => contextListeners.set(event, fn), off: event => contextListeners.delete(event),
    route: async (pattern, fn) => { assert.equal(pattern, '**/*'); handler = fn; state.trace.push('guard-installed'); },
    unroute: async (pattern, fn) => {
      assert.equal(fn, handler); state.unrouteAttempted = true; assert.equal(state.closed, true, 'Never remove fence while owned page remains alive');
      if (fault === 'unroute-duplicate') await post();
      if (fault === 'unroute-delayed-duplicate') queueMicrotask(() => void post(true));
      if (fault === 'unroute-error') throw new Error('SYNTHETIC_UNROUTE_FAILURE');
      state.unroute = true; state.trace.push('guard-removed');
    },
  };
  const page = { context: () => context,
    on: (event, fn) => pageListeners.set(event, fn), off: event => pageListeners.delete(event),
    goto: async url => { assert.equal(state.trace[0], 'guard-installed'); state.url = url; },
    evaluate: async (fn, arg) => { const result = runInNewContext('(' + fn.toString() + ')(arg)', { ...sandbox, arg }); return result === undefined ? undefined : JSON.parse(JSON.stringify(result)); },
    isClosed: () => Boolean(state.closed),
    close: async () => {
      state.trace.push('closing');
      if (fault === 'close-duplicate') await post();
      if (fault === 'close-delayed-duplicate') queueMicrotask(() => void post(true));
      if (fault === 'late-route-error') queueMicrotask(() => void handler({ request: () => ({ url: () => origin + '/api/service-enquiries', method: () => 'POST', postDataJSON: () => { throw new Error('SYNTHETIC_LATE_ROUTE_ERROR'); } }), abort: async () => { await delay(); } }));
      if (fault === 'close-provider') await provider();
      if (fault === 'close-unexpected-write') await handler({ request: () => ({ url: () => origin + '/api/unexpected', method: () => 'POST' }), abort: () => {} });
      if (fault === 'late-page-error') { await delay(); pageListeners.get('pageerror')(new Error('SYNTHETIC_LATE_PAGE_ERROR')); }
      if (fault === 'close-failure') throw new Error('SYNTHETIC_CLOSE_FAILURE');
      if (fault === 'close-child-duplicate' || fault === 'close-child-positive') {
        let closed = false;
        const child = { on() {}, off() {}, isClosed: () => closed, close: async () => { if (fault === 'close-child-duplicate') await post(); closed = true; } };
        children.push(child); contextListeners.get('page')(child);
      }
      state.closed = true; state.trace.push('closed');
      if (fault === 'close-failure-after-closed') throw new Error('SYNTHETIC_CLOSE_FAILURE');
    },
    locator: locate, viewportSize: () => ({ width: locale === 'en' ? 390 : 430 }),
  };
  const expect = node => ({
    toHaveCount: async expected => assert.equal(count(node.key), expected),
    toHaveAttribute: async (key, expected) => { if (key === 'lang') assert.equal(locale, expected); else { assert.equal(key, 'aria-expanded'); assert.equal(String(state.open), expected); } },
    toBeVisible: async () => { if (node.key === 'alert') assert.ok(state.alert); else if (node.key === 'disclosure') assert.equal(state.open, true); else if (node.key.startsWith('link-')) assert.equal(state.saved, true); },
    toBeChecked: async () => assert.equal(state.consent, true),
    not: { toBeChecked: async () => assert.equal(state.consent, false) },
    toContainText: async expected => { assert.equal(node.key, 'status'); assert.equal(state.saved, true); assert.equal(expected, reference); },
    toHaveURL: async expected => { assert.equal(node, page); assert.equal(state.url, expected); },
  });
  expect.poll = callback => ({ toBe: async value => assert.equal(await callback(), value), toBeGreaterThan: async value => assert.ok(await callback() > value) });
  return { page, expect, state };
}
for (const [locale, kind] of [['en', 'retry'], ['ru', 'handoff-failure']]) test('actual current-review helper completes ' + locale + '/' + kind + ' using inert network and real helper gestures', async () => {
  const f = reviewFixture(locale, kind);
  const result = await verifyCurrentReviewFault(f.page, f.expect, { origin, locale, kind });
  assert.equal(result.receiptRetained, true); assert.equal(f.state.unroute, true); assert.equal(f.state.closed, true);
  assert.ok(f.state.gestures.includes('label')); assert.equal(f.state.gestures.at(-1), 'link-tg');
  const probe = await f.page.evaluate(() => window.__homeReviewFaultProbe);
  assert.equal(probe.attempts.length, 1);
  assert.equal(probe.failures?.length, kind === 'handoff-failure' ? 1 : 0);
  assert.equal(result.syntheticWrites, f.state.posts, 'Return only the final drained actual count');
});
for (const [kind, fault] of [
  ['retry', 'implicit-consent'], ['retry', 'ignored-consent'], ['retry', 'save-before-consent'], ['retry', 'false-success'],
  ['retry', 'failed-save-navigates'], ['retry', 'failed-popup-left-open'], ['retry', 'retry-new-operation'],
  ['retry', 'duplicate-save'], ['handoff-failure', 'receipt-retracted'], ['handoff-failure', 'fallback-resaves'], ['handoff-failure', 'fallback-retracts'], ['retry', 'unexpected-write'],
  ['retry', 'contact-leak'], ['retry', 'credential-leak'], ['retry', 'fragment-leak'], ['retry', 'different-drafts'], ['retry', 'small-fallback'], ['retry', 'fallback-navigates-parent'], ['retry', 'reveal-noop'],
  ['retry', 'close-duplicate'], ['retry', 'close-delayed-duplicate'], ['retry', 'unroute-duplicate'], ['retry', 'unroute-delayed-duplicate'],
  ['retry', 'close-child-duplicate'], ['retry', 'close-unexpected-write'], ['retry', 'close-provider'], ['retry', 'late-page-error'], ['retry', 'late-route-error'],
  ['retry', 'early-provider-consent'], ['retry', 'early-provider-failed-save'], ['retry', 'fallback-no-request'], ['retry', 'duplicate-fallback-request'],
  ['handoff-failure', 'handoff-not-exercised'], ['handoff-failure', 'handoff-without-synthetic-exception'],
]) test('actual current-review helper rejects ' + fault + ' and removes its route guard', async () => {
  const locale = kind === 'retry' ? 'en' : 'ru', f = reviewFixture(locale, kind, fault);
  await assert.rejects(verifyCurrentReviewFault(f.page, f.expect, { origin, locale, kind }), { code: 'ERR_ASSERTION' });
  assert.equal(f.state.unroute, true);
});

for (const fault of ['close-failure', 'close-failure-after-closed', 'unroute-error']) test('cleanup failure is never reported as success: ' + fault, async () => {
  const f = reviewFixture('en', 'retry', fault);
  await assert.rejects(verifyCurrentReviewFault(f.page, f.expect, { origin, locale: 'en', kind: 'retry' }), /SYNTHETIC_(CLOSE|UNROUTE)_FAILURE/);
  assert.equal(f.state.unroute, fault === 'close-failure-after-closed');
  if (fault === 'close-failure') assert.equal(Boolean(f.state.unrouteAttempted), false);
});

test('cleanup errors cannot mask the original scenario failure and an unclosed page keeps its fence', async () => {
  const f = reviewFixture('en', 'retry', 'implicit-consent');
  const primary = new Error('ORIGINAL_SCENARIO_FAILURE');
  f.page.locator = () => { throw primary; };
  f.page.close = async () => { throw new Error('SYNTHETIC_CLOSE_FAILURE'); };
  let caught;
  try { await verifyCurrentReviewFault(f.page, f.expect, { origin, locale: 'en', kind: 'retry' }); } catch (error) { caught = error; }
  assert.equal(caught, primary);
  assert.ok(caught.cleanupErrors.some(error => /SYNTHETIC_CLOSE_FAILURE/.test(error.message)));
  assert.equal(f.state.unroute, false);
});

test('a child created during closure is closed under the same fence without false failure', async () => {
  const f = reviewFixture('ru', 'handoff-failure', 'close-child-positive');
  await verifyCurrentReviewFault(f.page, f.expect, { origin, locale: 'ru', kind: 'handoff-failure' });
  assert.equal(f.page.context().pages().length, 0);
  assert.equal(f.state.unroute, true);
});

test('drain waits for delayed aborts and catches nested late handler failures without forwarding', async () => {
  const guard = createReviewFaultGuard(origin, 'en', 'retry');
  const events = [];
  const badRoute = { request: () => ({ url: () => origin + '/api/service-enquiries', method: () => 'POST', postDataJSON: () => { throw new Error('SYNTHETIC_INVALID_JSON'); } }),
    abort: async () => { await new Promise(resolve => setTimeout(resolve, 10)); events.push('bad-aborted'); },
    continue: () => assert.fail('Never forward invalid payload'), fulfill: () => assert.fail('Never fulfill invalid payload') };
  void guard.route({ request: () => ({ url: () => 'https://wa.me/14376066502', method: () => 'GET' }),
    abort: async () => { await new Promise(resolve => setTimeout(resolve, 10)); void guard.route(badRoute); events.push('provider-aborted'); },
    continue: () => assert.fail('Never forward provider') });
  await guard.drain();
  assert.deepEqual(events, ['provider-aborted', 'bad-aborted']);
  assert.equal(guard.routeErrors.length, 1);
  assert.match(guard.routeErrors[0].message, /SYNTHETIC_INVALID_JSON/);
  assert.equal(guard.unexpectedProviderAttempts.length, 1);
});

test('drain also waits for a legitimate delayed local read without a false positive', async () => {
  const guard = createReviewFaultGuard(origin, 'en', 'retry');
  let continued = false;
  void guard.route({ request: () => ({ url: () => origin + '/local.js', method: () => 'GET' }),
    continue: async () => { await new Promise(resolve => setTimeout(resolve, 10)); continued = true; } });
  await guard.drain();
  assert.equal(continued, true);
  assert.deepEqual(guard.routeErrors, []);
});

test('fault guard rejects nonisolated origin and blocks unexpected writes/provider delivery', async () => {
  for (const bad of ['https://holistichouse.vercel.app', 'http://example.test', origin + '/']) assert.throws(() => createReviewFaultGuard(bad, 'en', 'retry'));
  const guard = createReviewFaultGuard(origin, 'en', 'retry');
  for (const [url, method] of [[origin + '/api/unexpected', 'POST'], ['https://wa.me/14376066502?text=neutral', 'GET']]) {
    const actions = [];
    await guard.route({ request: () => ({ url: () => url, method: () => method }), abort: reason => actions.push(reason), continue: () => assert.fail('Never deliver') });
    assert.deepEqual(actions, ['blockedbyclient']);
  }
  assert.equal(guard.unexpectedWrites.length, 1); assert.equal(guard.providerAttempts.length, 1);
});

test('original browser scenario inventory and unaffected safeguards remain mandatory', () => {
  const script = read('tests/home-conversation-browser.mjs');
  assert.equal((script.match(/const guide = await openHomeConversation\(page, expect\);/g) || []).length, 3);
  for (const marker of ['[320, 375, 390, 430]', 'scenarios.slice(0, 3)', 'for (const sample of failureCases)',
    'width === 390 && scenario.locale === "en" && scenario.text === scenarios[0].text',
    'width === 430 && scenario.locale === "ru" && scenario.text === scenarios[1].text',
    'item.route).length, 36', 'item.viewportDocked).length, 3', 'item.voiceMock).length, 3', 'item.recovered).length, 5',
    "[['en', 'retry'], ['ru', 'handoff-failure']]", 'Private question must not leak', 'At most three contextual choices',
    'I want to kill myself', 'permission', 'start-hang', 'stop-hang', 'natural-final', 'unsupported',
    'detached-layer-recovery', 'Spoken question must never leak', 'No more than two specific offers',
    "['temple', '/' + locale + '/holistic-support']",
  ]) assert.ok(script.includes(marker), marker);
  assert.doesNotMatch(script, /test\.skip|test\.only|test\.todo/);
});
