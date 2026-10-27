import { installReviewConsentProbe, closeReviewConsentProbe, sanitizeReviewConsentDiagnostic, withReviewConsentDiagnostics } from '../scripts/helpers/review-consent-diagnostics.mjs';
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
    if (!state.consent && fault === 'consent-alert-missing') return;
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
  ['retry', 'implicit-consent'], ['retry', 'consent-alert-missing'], ['retry', 'ignored-consent'], ['retry', 'save-before-consent'], ['retry', 'false-success'],
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

test('missing first no-consent alert still fails after exactly one click, with no writes/provider fallback', async () => {
  const f = reviewFixture('en', 'retry', 'consent-alert-missing');
  await assert.rejects(verifyCurrentReviewFault(f.page, f.expect, { origin, locale: 'en', kind: 'retry' }), { code: 'ERR_ASSERTION' });
  assert.equal(f.state.gestures.filter(value => value.startsWith('submit-')).length, 1);
  assert.equal(f.state.posts, 0);
  assert.ok(!f.state.gestures.includes('label') && !f.state.gestures.includes('link-tg'));
  assert.equal(f.state.unroute, true);
});

const observerOwner = '00000000-0000-4000-8000-000000000001';
const observerRegistryOwner = '00000000-0000-4000-8000-000000000002';
function consentObserverDom({ propAccessor = false, partialInstall = false } = {}) {
  const listeners = [], leases = new Map(); let getterReads = 0, handlerCalls = 0;
  const node = (x, y, width, height) => ({ isConnected: true, disabled: false, contains(other) { return other === this; }, getBoundingClientRect: () => ({ x, y, width, height }) });
  const phone = node(10, 500, 200, 45), consent = node(10, 560, 20, 20), button = node(10, 620, 160, 50), nav = node(0, 760, 390, 60);
  consent.checked = false; consent.required = true; phone.validity = { valueMissing: false };
  const handler = () => { handlerCalls++; throw Error('Observer must not invoke application handlers'); };
  for (const [element, name] of [[phone, 'onChange'], [consent, 'onChange'], [button, 'onClick']]) {
    Object.defineProperty(element, '__reactProps$fixture', propAccessor
      ? { get() { getterReads++; throw Error('Private property accessor'); } }
      : { value: { [name]: handler } });
    for (const key of ['value', 'textContent', 'innerHTML']) Object.defineProperty(element, key, { get() { getterReads++; throw Error('Private content read'); } });
  }
  const form = node(0, 450, 390, 260);
  form.contains = element => [form, phone, consent, button].includes(element);
  form.querySelector = selector => ({ 'button[data-contact-channel-submit="whatsapp"]': button, 'input[type="tel"]': phone, 'input[type="checkbox"]': consent })[selector] || null;
  form.querySelectorAll = selector => { assert.equal(selector, '[role="alert"]'); return []; };
  const win = { location: { pathname: '/en/services/free-situation-review' }, scrollY: 0, innerWidth: 390, innerHeight: 820,
    getComputedStyle: element => { assert.equal(element, nav); return { display: 'block', visibility: 'visible', pointerEvents: 'auto' }; },
    setTimeout: (fn, milliseconds) => { assert.equal(milliseconds, 45000); const id = leases.size + 1; leases.set(id, fn); return id; },
    clearTimeout: id => leases.delete(id),
  };
  const doc = { defaultView: win, readyState: 'complete', activeElement: phone,
    querySelector: selector => selector === '.mobile-bottom-navigation' ? nav : selector.startsWith('main[data-free-entry-landing') ? form : null,
    elementFromPoint: (_x, y) => y >= 760 ? nav : button,
    addEventListener: (type, fn, options) => { assert.equal(options.passive, true); listeners.push({ type, fn, capture: options.capture }); if (partialInstall && listeners.length === 3) throw Error('Synthetic partial installation'); },
    removeEventListener: (type, fn, capture) => { const index = listeners.findIndex(value => value.type === type && value.fn === fn && value.capture === capture); if (index >= 0) listeners.splice(index, 1); },
  };
  form.ownerDocument = doc;
  const close = options => runInNewContext('(' + closeReviewConsentProbe.toString() + ')(options)', { window: win, options: { owner: observerOwner, registryOwner: observerRegistryOwner, ...options } });
  const dispatch = (type, target = button, trusted = true) => {
    const event = { type, target, isTrusted: trusted, defaultPrevented: false, clientX: 30, clientY: target === nav ? 790 : 640 };
    for (const entry of [...listeners].filter(entry => entry.type === type)) entry.fn(event);
  };
  return { form, phone, consent, button, nav, win, doc, listeners, leases, close, dispatch, getterReads: () => getterReads, handlerCalls: () => handlerCalls };
}

test('passive consent observer reports bounded trusted click delivery, binding presence and geometry without private reads', () => {
  const f = consentObserverDom();
  assert.equal(installReviewConsentProbe(f.form, { token: 101, owner: observerOwner, registryOwner: observerRegistryOwner, locale: 'en', expiresAt: Date.now() + 1000 }), true);
  f.dispatch('input', f.phone); f.dispatch('pointerdown'); f.dispatch('click'); f.dispatch('click', f.nav);
  const raw = f.close({ token: 101, capture: true }), safe = sanitizeReviewConsentDiagnostic(raw, { locale: 'en', kind: 'retry', setup: 'completed', capture: 'completed', writes: 0, providerAttempts: 0, routeErrors: 0, pageErrors: 0 });
  assert.equal(safe.initial.currentRoute, true); assert.equal(safe.initial.consentChecked, false);
  assert.equal(safe.initial.buttonOnClickBound, true); assert.equal(safe.initial.phoneOnChangeBound, true);
  assert.equal(safe.records.filter(value => value.type === 'click' && value.target === 'button' && value.trusted).length, 2);
  assert.equal(safe.records.filter(value => value.target === 'navigation').length, 2);
  assert.equal(safe.counts[7][0], 2); assert.equal(safe.counts[7][1], 2);
  assert.equal(f.listeners.length, 0); assert.equal(f.leases.size, 0);
  assert.equal(f.getterReads(), 0); assert.equal(f.handlerCalls(), 0);
  assert.equal(f.doc.activeElement, f.phone); assert.equal(f.consent.checked, false);
});

test('observer never invokes React prop getters and does not mistake descriptors for executed hydration', () => {
  const f = consentObserverDom({ propAccessor: true });
  installReviewConsentProbe(f.form, { token: 102, owner: observerOwner, registryOwner: observerRegistryOwner, locale: 'en', expiresAt: Date.now() + 1000 });
  const safe = sanitizeReviewConsentDiagnostic(f.close({ token: 102, capture: true }));
  assert.equal(safe.current.buttonPropsPresent, false); assert.equal(safe.current.buttonOnClickBound, false);
  assert.equal(f.getterReads(), 0); assert.equal(f.handlerCalls(), 0);
});

test('observer caps events and remains passive when native event properties throw', () => {
  const f = consentObserverDom();
  installReviewConsentProbe(f.form, { token: 103, owner: observerOwner, registryOwner: observerRegistryOwner, locale: 'en', expiresAt: Date.now() + 1000 });
  for (let i = 0; i < 100; i++) f.dispatch('click');
  const throwing = { type: 'click', get target() { throw Error('Synthetic event observation failure'); } };
  assert.doesNotThrow(() => f.listeners.find(value => value.type === 'click').fn(throwing));
  const safe = sanitizeReviewConsentDiagnostic(f.close({ token: 103, capture: true }));
  assert.ok(safe.records.length <= 32); assert.ok(safe.dropped > 0); assert.ok(safe.observationErrors > 0);
});

for (const mode of ['expired', 'closed', 'partial-install', 'lease']) test('observer cleanup rejects/leaves no orphan for ' + mode, () => {
  const f = consentObserverDom({ partialInstall: mode === 'partial-install' });
  if (mode === 'closed') f.close({ token: 104 });
  const installed = installReviewConsentProbe(f.form, { token: 104, owner: observerOwner, registryOwner: observerRegistryOwner, locale: 'en', expiresAt: Date.now() + (mode === 'expired' ? -1 : 1000) });
  assert.equal(installed, mode === 'lease');
  if (mode === 'lease') [...f.leases.values()][0]();
  assert.equal(f.listeners.length, 0); assert.equal(f.leases.size, 0);
});

test('diagnostic serializer strips unknown/private fields, getters, toJSON, nonfinite geometry and oversized arrays', () => {
  let reads = 0;
  const raw = { current: { type: 'https://private.invalid/?phone=SECRET', phase: 'SECRET', target: 'SECRET', buttonRect: { x: Infinity, y: 2, width: 1e10, height: -Infinity }, phone: 'SECRET', toJSON() { throw Error('Do not call'); } }, records: Array(100).fill({ phone: 'SECRET', target: 'SECRET' }), counts: [[1e12, -2]], cookie: 'SECRET', toJSON() { throw Error('Do not call'); } };
  Object.defineProperty(raw, 'initial', { get() { reads++; throw Error('Do not read'); } });
  const serialized = JSON.stringify(sanitizeReviewConsentDiagnostic(raw, { locale: 'SECRET', kind: 'SECRET', writes: 1e12, providerAttempts: -1, pageErrors: Infinity, headers: 'SECRET' }));
  assert.doesNotMatch(serialized, /SECRET|private.invalid|"phone":|cookie|headers|Infinity/);
  const safe = JSON.parse(serialized);
  assert.equal(reads, 0); assert.equal(safe.records.length, 32); assert.equal(safe.writes, 1000000);
  assert.equal(safe.current.buttonRect.x, null); assert.equal(safe.current.buttonRect.width, 1000000);
});

for (const failure of ['setup', 'capture', 'sink', 'counters']) test('diagnostic ' + failure + ' failure preserves original exception and runs operation exactly once', async () => {
  const sentinel = new Error('ORIGINAL_VALIDATION_FAILURE'), f = consentObserverDom(); let operations = 0, cleanup = 0;
  const page = { evaluate: async (fn, arg) => { if (arg.capture && failure === 'capture') throw Error('capture'); cleanup++; return f.close(arg); } };
  const form = { evaluate: async (_fn, options) => { if (failure === 'setup') throw Error('setup'); return installReviewConsentProbe(f.form, options); } };
  await assert.rejects(withReviewConsentDiagnostics(page, form, { locale: 'en', kind: 'retry', counters: () => { if (failure === 'counters') throw Error('counters'); return {}; } }, async () => { operations++; throw sentinel; }, { log: () => { if (failure === 'sink') throw Error('sink'); } }), error => error === sentinel);
  assert.equal(operations, 1); assert.ok(cleanup > 0); assert.equal(f.listeners.length, 0);
});

test('late installation after setup timeout is tombstoned; successful action returns unchanged without logging', async () => {
  const f = consentObserverDom(); let resolveSetup, options, operations = 0, logs = 0;
  const form = { evaluate: (_fn, value) => { options = value; return new Promise(resolve => { resolveSetup = resolve; }); } };
  const page = { evaluate: async (_fn, value) => f.close(value) };
  const result = await withReviewConsentDiagnostics(page, form, { locale: 'en', kind: 'retry', counters: () => ({}) }, async () => { operations++; return 'UNCHANGED_RESULT'; }, { timeoutMs: 2, log: () => { logs++; } });
  assert.equal(result, 'UNCHANGED_RESULT'); assert.equal(operations, 1); assert.equal(logs, 0);
  resolveSetup(installReviewConsentProbe(f.form, { ...options, expiresAt: Date.now() + 1000 }));
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(f.listeners.length, 0);
});

test('actual fault helper observes the first consent-negative action only, without replacing its required alert or network gates', () => {
  const source = read('scripts/helpers/home-conversation-current-verifier.mjs');
  const start = source.indexOf('    await withReviewConsentDiagnostics(page, form, { locale, kind,');
  const end = source.indexOf('    await expect(consent).not.toBeChecked();', start);
  assert.ok(start > 0 && end > start);
  const observed = source.slice(start, end);
  assert.equal((observed.match(/await submit\.click\(\);/g) || []).length, 1);
  assert.match(observed, /await expect\(form\.getByRole\('alert'\)\)\.toBeVisible\(\);/);
  assert.match(observed, /await contact\.fill\('4165550123'\);/);
  assert.doesNotMatch(observed, /force:|waitForTimeout|\.catch\(|\.check\(|requestSubmit|dispatchEvent/);
  const remainder = source.slice(end);
  for (const marker of ['No write before explicit reply consent', 'No provider attempt before explicit reply consent', 'Failed save must not navigate or send', 'Unchanged retry reuses the same operation and payload', 'Exactly one deliberate fallback request is accounted for', 'Final drained write count must exclude duplicate saves during cleanup']) assert.ok(remainder.includes(marker), marker);
});

test('closing an older observer token cannot remove a later observer and unknown registry accessors are never invoked', () => {
  const f = consentObserverDom();
  assert.equal(installReviewConsentProbe(f.form, { token: 201, owner: observerOwner, registryOwner: observerRegistryOwner, locale: 'en', expiresAt: Date.now() + 1000 }), true);
  assert.equal(installReviewConsentProbe(f.form, { token: 202, owner: observerOwner, registryOwner: observerRegistryOwner, locale: 'en', expiresAt: Date.now() + 1000 }), true);
  assert.equal(f.listeners.length, 48);
  f.close({ token: 201 }); assert.equal(f.listeners.length, 24);
  assert.equal(installReviewConsentProbe(f.form, { token: 201, owner: observerOwner, registryOwner: observerRegistryOwner, locale: 'en', expiresAt: Date.now() + 1000 }), false);
  f.close({ token: 202 }); assert.equal(f.listeners.length, 0);
  const unknown = consentObserverDom(); let reads = 0;
  Object.defineProperty(unknown.win, '__hhReviewConsentRegistry', { get() { reads++; throw Error('Unknown getter'); } });
  assert.equal(installReviewConsentProbe(unknown.form, { token: 203, owner: observerOwner, registryOwner: observerRegistryOwner, locale: 'en', expiresAt: Date.now() + 1000 }), false);
  assert.equal(unknown.close({ token: 203, capture: true }), null);
  assert.equal(reads, 0); assert.equal(unknown.listeners.length, 0);
});

for (const callbacks of ['accessors', 'data-functions']) test('unknown data registry/probe is untouched even when installation is rejected: ' + callbacks, async () => {
  const f = consentObserverDom(); let reads = 0, calls = 0, operations = 0;
  const foreign = {};
  for (const key of ['read', 'dispose']) Object.defineProperty(foreign, key, callbacks === 'accessors'
    ? { get() { reads++; return () => { calls++; }; } }
    : { value: () => { calls++; } });
  // Deliberately resembles the former unbranded registry shape.
  const probes = new Map(), registry = { closedThrough: 0, probes };
  Object.defineProperty(f.win, '__hhReviewConsentRegistry', { value: registry, configurable: true });
  const primary = new Error('ORIGINAL_NO_CONSENT_ALERT_FAILURE');
  let options;
  const form = { evaluate: async (_fn, value) => { options = value; probes.set(value.token, foreign); return installReviewConsentProbe(f.form, value); } };
  const page = { evaluate: async (_fn, value) => f.close(value) };
  await assert.rejects(withReviewConsentDiagnostics(page, form, { locale: 'en', kind: 'retry', counters: () => ({ writes: 0 }) }, async () => { operations++; throw primary; }, { log: () => {} }), error => error === primary);
  assert.equal(operations, 1); assert.equal(reads, 0); assert.equal(calls, 0);
  assert.equal(probes.get(options.token), foreign); assert.equal(registry.closedThrough, 0); assert.equal(f.listeners.length, 0);
});

for (const callbacks of ['accessors', 'data-functions']) test('foreign entry inside branded registry is not read, invoked or evicted: ' + callbacks, () => {
  const f = consentObserverDom(); let reads = 0, calls = 0;
  const foreign = { owner: 'ffffffff-ffff-4fff-8fff-ffffffffffff' };
  for (const key of ['read', 'dispose']) Object.defineProperty(foreign, key, callbacks === 'accessors'
    ? { get() { reads++; return () => { calls++; }; } }
    : { value: () => { calls++; } });
  const probes = new Map([[301, foreign]]), registry = { schema: 'hh-review-consent-observer-v1', registryOwner: observerRegistryOwner, closedThrough: 0, probes };
  Object.defineProperty(f.win, '__hhReviewConsentRegistry', { value: registry, configurable: true });
  assert.equal(installReviewConsentProbe(f.form, { token: 301, owner: observerOwner, registryOwner: observerRegistryOwner, locale: 'en', expiresAt: Date.now() + 1000 }), false);
  assert.equal(f.close({ token: 301, owner: observerOwner, capture: true }), null);
  assert.equal(reads, 0); assert.equal(calls, 0); assert.equal(probes.get(301), foreign); assert.equal(registry.closedThrough, 0);
});

test('wrong invocation nonce cannot read or remove an active owned probe', () => {
  const f = consentObserverDom();
  assert.equal(installReviewConsentProbe(f.form, { token: 302, owner: observerOwner, registryOwner: observerRegistryOwner, locale: 'en', expiresAt: Date.now() + 1000 }), true);
  assert.equal(f.close({ token: 302, owner: 'ffffffff-ffff-4fff-8fff-ffffffffffff', capture: true }), null);
  assert.equal(f.listeners.length, 24);
  assert.ok(f.close({ token: 302, owner: observerOwner, capture: true }));
  assert.equal(f.listeners.length, 0);
});

test('matching public schema does not confer registry ownership', () => {
  const f = consentObserverDom(); let reads = 0;
  const registry = { schema: 'hh-review-consent-observer-v1', registryOwner: 'ffffffff-ffff-4fff-8fff-ffffffffffff', closedThrough: 0 };
  Object.defineProperty(registry, 'probes', { get() { reads++; throw Error('Foreign probes'); } });
  Object.defineProperty(f.win, '__hhReviewConsentRegistry', { value: registry });
  assert.equal(installReviewConsentProbe(f.form, { token: 303, owner: observerOwner, registryOwner: observerRegistryOwner, locale: 'en', expiresAt: Date.now() + 1000 }), false);
  assert.equal(f.close({ token: 303, capture: true }), null);
  assert.equal(reads, 0); assert.equal(registry.closedThrough, 0); assert.equal(f.listeners.length, 0);
});
