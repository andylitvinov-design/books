import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { releasePaidPolicy, classifyPaidRequest, deniedPaidRequestMetadata, installPaidReadOnlyGuard, expectedPaidForm, readPaidForm, assertPaidFormSnapshot, verifyPaidEnquiryUi, verifyReleasePaidEnquiry } from '../scripts/helpers/release-paid-enquiry-verifier.mjs';
import { whatsappEnquiryUrl, telegramEnquiryUrlFromWhatsApp } from '../lib/whatsapp-enquiry.js';
import ts from 'typescript';
import { PHONE_COUNTRIES, phoneCountryFromValue, phoneNationalPart, composeCountryPhone } from '../lib/contact/phone-country.js';
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const source = read('components/consultation-choice-capture.tsx');
const chooserSource = read('components/contact-channel-chooser.tsx');
const phoneSource = read('components/phone-country-input.tsx');
const object = (text, name) => new Function('return ' + text.match(new RegExp('const ' + name + ' = (\\{[\\s\\S]*?\\}) as const;'))[1])();
const copy = object(source, 'copy');
const contactCopy = object(chooserSource, 'copy');
const base = { origin: 'http://127.0.0.1:3123', label: 'local', locale: 'en', width: 390 };
const live = { ...base, label: 'live', origin: 'https://holistichouse.vercel.app' };
const request = (policy, path = policy.path, method = 'GET', type = 'document', origin = policy.origin) => ({
  method: () => method, url: () => origin + path, resourceType: () => type, isNavigationRequest: () => type === 'document',
});

function network() {
  const events = [];
  const context = {
    async route(pattern, handler) { assert.equal(pattern, '**/*'); events.push('route'); this.handler = handler; },
    async routeWebSocket(pattern, handler) { assert.equal(pattern, '**/*'); events.push('socket guard'); this.socketHandler = handler; },
    async send(req, { status = 200, fail = false } = {}) {
      const activity = [];
      await this.handler({
        request: () => req,
        async abort(reason) { assert.equal(reason, 'blockedbyclient'); activity.push('abort'); },
        async fetch(options) { assert.deepEqual(options, { maxRedirects: 0, maxRetries: 0 }); activity.push('fetch'); if (fail) throw new Error('do not copy URL or payload'); return { status: () => status }; },
        async fulfill({ response }) { assert.equal(response.status(), status); activity.push('fulfill'); },
      });
      return activity;
    },
  };
  return { context, events };
}

for (const options of [base, live]) {
  test(options.label + ' permits only exact public/static GET classes', async () => {
    const policy = releasePaidPolicy(options), { context } = network();
    const guard = await installPaidReadOnlyGuard(context, policy);
    for (const [path, type] of [[policy.path, 'document'], ['/_next/static/chunks/app.js', 'script'], ['/_next/static/css/app.css', 'stylesheet'], ['/_next/static/media/font.woff2', 'font'], ['/images/holistic-house/service.webp', 'image']]) {
      assert.deepEqual(await context.send(request(policy, path, 'GET', type)), ['fetch', 'fulfill']);
    }
    assert.deepEqual(guard.assertClean(), { postAttempts: 0, blockedRequests: 0, allowedGets: 5 });
  });
}
const rejectedModes = [
  ['missing mode', { label: undefined }, /Unknown paid read-only/],
  ['unknown mode', { label: 'production' }, /Unknown paid read-only/],
  ['live origin with local mode', { origin: live.origin }, /mode\/origin mismatch/],
  ['local origin with live mode', { label: 'live' }, /mode\/origin mismatch/],
  ['production HTTP', { ...live, origin: 'http://holistichouse.vercel.app' }, /mode\/origin mismatch/],
  ['foreign host', { origin: 'https://example.invalid' }, /mode\/origin mismatch/],
  ['alternate loopback', { origin: 'http://localhost:3123' }, /mode\/origin mismatch/],
  ['wrong port', { origin: 'http://127.0.0.1:3000' }, /mode\/origin mismatch/],
  ['trailing path', { origin: base.origin + '/' }, /mode\/origin mismatch/],
  ['query', { origin: base.origin + '?private=redacted' }, /mode\/origin mismatch/],
  ['userinfo', { origin: 'http://name@127.0.0.1:3123' }, /mode\/origin mismatch/],
  ['locale', { locale: 'fr' }, /Unsupported paid audit locale/],
  ['width', { width: 1440 }, /Unsupported paid audit width/],
];
for (const [name, change, error] of rejectedModes) test('rejects ' + name + ' before creating any context', async () => {
  assert.equal(releasePaidPolicy(base).path, '/en/services/imagery-therapy');
  let operations = 0;
  await assert.rejects(verifyReleasePaidEnquiry({ newContext() { operations++; throw Error('unreachable'); } }, { ...base, ...change }, null), error);
  assert.equal(operations, 0);
});
const deniedRequests = [
  ...['POST', 'PUT', 'PATCH', 'DELETE'].map(method => [method, p => request(p, p.path, method), 'non-GET']),
  ['malformed URL', p => ({ ...request(p), url: () => 'not a URL' }), 'malformed URL'],
  ['backslash URL', p => ({ ...request(p), url: () => p.origin + '/_next/static/a\\b.js' }), 'noncanonical URL'],
  ['non-navigation document', p => ({ ...request(p), isNavigationRequest: () => false }), 'unallowlisted public resource'],
  ['HEAD', p => request(p, p.path, 'HEAD'), 'non-GET'],
  ['OPTIONS', p => request(p, p.path, 'OPTIONS'), 'non-GET'],
  ['private API', p => request(p, '/api/service-enquiries', 'GET', 'fetch'), 'unallowlisted public resource'],
  ['account API', p => request(p, '/api/auth/session', 'GET', 'fetch'), 'unallowlisted public resource'],
  ['private document', p => request(p, '/en/app/portrait'), 'unallowlisted public resource'],
  ['other locale document', p => request(p, '/ru/services/imagery-therapy'), 'unallowlisted public resource'],
  ['query prefetch', p => request(p, p.path + '?_rsc=redacted', 'GET', 'fetch'), 'noncanonical URL'],
  ['static query', p => request(p, '/_next/static/app.js?x=redacted', 'GET', 'script'), 'noncanonical URL'],
  ['fragment', p => request(p, p.path + '#private'), 'noncanonical URL'],
  ['foreign static', p => request(p, '/_next/static/app.js', 'GET', 'script', 'https://example.invalid'), 'external origin'],
  ['provider', p => request(p, '/123', 'GET', 'document', 'https://wa.me'), 'external origin'],
  ['protocol-relative hostname', p => request(p, p.path, 'GET', 'document', 'http://127.0.0.1.evil.invalid:3123'), 'external origin'],
  ['userinfo', p => request(p, p.path, 'GET', 'document', 'http://name@127.0.0.1:3123'), 'noncanonical URL'],
  ['encoded path', p => request(p, '/_next/static/%61.js', 'GET', 'script'), 'noncanonical URL'],
  ['dot traversal', p => request(p, '/_next/static/../app.js', 'GET', 'script'), 'noncanonical URL'],
  ['image proxy', p => request(p, '/_next/image', 'GET', 'image'), 'unallowlisted public resource'],
  ['document as fetch', p => request(p, p.path, 'GET', 'fetch'), 'unallowlisted public resource'],
  ['static as document', p => request(p, '/_next/static/app.js'), 'unallowlisted public resource'],
  ['unreviewed image root', p => request(p, '/images/private.webp', 'GET', 'image'), 'unallowlisted public resource'],
  ['unknown extension', p => request(p, '/_next/static/data.json', 'GET', 'fetch'), 'unallowlisted public resource'],
];
for (const [name, make, reason] of deniedRequests) test('aborts and fails ' + name + ' without fetch', async () => {
  const policy = releasePaidPolicy(base), { context } = network(), guard = await installPaidReadOnlyGuard(context, policy);
  assert.deepEqual(await context.send(request(policy)), ['fetch', 'fulfill']);
  assert.equal(classifyPaidRequest(policy, make(policy)), reason);
  assert.deepEqual(await context.send(make(policy)), ['abort']);
  assert.throws(() => guard.assertClean(), name === 'POST' ? /attempted a POST/ : /network boundary violated/);
});
for (const status of [301, 302, 303, 307, 308]) test('never follows redirect ' + status, async () => {
  const policy = releasePaidPolicy(base), { context } = network(), guard = await installPaidReadOnlyGuard(context, policy);
  assert.deepEqual(await context.send(request(policy)), ['fetch', 'fulfill']);
  assert.deepEqual(await context.send(request(policy), { status }), ['fetch', 'abort']);
  assert.throws(() => guard.assertClean(), /redirect/);
});
test('network failures are fatal and diagnostics exclude raw transport error', async () => {
  const policy = releasePaidPolicy(base), { context } = network(), guard = await installPaidReadOnlyGuard(context, policy);
  assert.deepEqual(await context.send(request(policy), { fail: true }), ['fetch', 'abort']);
  assert.throws(() => guard.assertClean(), error => /allowlisted GET failed/.test(error.message) && !/payload/.test(error.message));
});
test('WebSocket attempt is closed and fatal without server connection', async () => {
  const { context } = network(), guard = await installPaidReadOnlyGuard(context, releasePaidPolicy(base));
  let closed = 0;
  await context.socketHandler({ async close() { closed++; } });
  await guard.settle();
  assert.equal(closed, 1); assert.throws(() => guard.assertClean(), /WebSocket/);
});
test('missing WebSocket interception fails before page creation', async () => {
  const { context } = network(); delete context.routeWebSocket;
  await assert.rejects(installPaidReadOnlyGuard(context, releasePaidPolicy(base)), /requires pre-navigation WebSocket interception/);
});

for (const locale of ['en', 'ru', 'es']) test(locale + ' schema is bound to actual contact and phone source', () => {
  const expected = expectedPaidForm(locale), c = contactCopy[locale];
  assert.equal(expected.country, phoneCountryFromValue(''));
  assert.equal(expected.consent, c.consent); assert.equal(expected.privacy, c.privateNote);
  assert.equal(expected.description, c.description); assert.equal(expected.submit, c.submit);
  assert.equal(expected.controls[0].visibleLabel, c.name + ' *');
  assert.equal(expected.controls[1].visibleLabel, c.email); assert.equal(expected.controls[3].visibleLabel, c.phone);
  const captions = new Function('return ' + phoneSource.match(/const captions=(\{[\s\S]*?\});/)[1])()[locale];
  assert.equal(expected.controls[2].label, captions.country); assert.equal(expected.controls[3].label, captions.number);
  assert.deepEqual(expected.countries.map(c => c.value), PHONE_COUNTRIES.map(c => c.iso));
  assert.match(chooserSource, /<input type="text" autoComplete="name" required minLength=\{2\} maxLength=\{120\}/);
  assert.match(chooserSource, /<input type="email" autoComplete="email" maxLength=\{254\}/);
  assert.match(chooserSource, /<input type="checkbox" required checked=\{consent\}/);
  assert.match(chooserSource, /maxLength=\{1400\} rows=\{2\}/);
  assert.match(chooserSource, /const \[consent, setConsent\] = useState\(false\)/);
  assert.match(phoneSource, /type="tel" inputMode="tel" autoComplete="tel-national"/);
  assert.match(phoneSource, /required=\{required\} maxLength=\{24\}/);
});
// Execute the real initial JSX of both components without React effects,
// networking, or a browser. Only DOM-shaped traversal/property behavior is fake.
// Unlike the sequencing mock, this fixture is not built from expectedPaidForm.
function sourceForm(locale) {
  const React = { createElement(type, props, ...children) {
    const flat = children.flat(Infinity).filter(child => child !== null && child !== undefined && typeof child !== 'boolean');
    if (typeof type === 'function') return type({ ...props, children: flat });
    return { tagName: type.toUpperCase(), props: props || {}, children: flat };
  } };
  const hooks = { useId: () => 'source-form', useState: value => [typeof value === 'function' ? value() : value, () => {}], useEffect: () => {}, useRef: value => ({ current: value }) };
  const compile = (text, functionName, globals) => {
    const source = text.slice(text.indexOf('function ' + functionName));
    const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React } }).outputText;
    return new Function(...Object.keys(globals), code + '; return ' + functionName)(...Object.values(globals));
  };
  const captions = new Function('return ' + phoneSource.match(/const captions=(\{[\s\S]*?\});/)[1])();
  const phone = compile(phoneSource, 'PhoneCountryInput', { ...hooks, React, styles: {}, captions, PHONE_COUNTRIES, phoneCountryFromValue, phoneNationalPart, composeCountryPhone });
  const formComponent = compile(chooserSource, 'ContactChannelChooserForm', { ...hooks, React, copy: contactCopy, styles: {}, PhoneCountryInput: phone,
    ShoppingBag: () => null, ChevronDown: () => null, Send: () => null,
    withPaidAdReferral: value => value, withOrganicEventReferral: value => value,
  });
  const tree = formComponent({ locale, whatsappUrl: whatsappEnquiryUrl({ locale, service: 'Imagery therapy', request: 'Public enquiry' }), pathname: '/' + locale + '/services/imagery-therapy' });
  const all = [];
  const attribute = { autoComplete: 'autocomplete', minLength: 'minlength', maxLength: 'maxlength', tabIndex: 'tabindex', htmlFor: 'for' };
  const matches = (node, selector) => {
    if (selector.startsWith('[contenteditable]')) return node.getAttribute('contenteditable') !== null && node.getAttribute('contenteditable') !== 'false';
    const match = selector.match(/^([a-z]+)?(?:\[([a-z-]+)="([^"]+)"\])?$/);
    assert.ok(match, 'Explicit DOM fixture selector: ' + selector);
    return (!match[1] || node.tagName === match[1].toUpperCase()) && (!match[2] || node.getAttribute(match[2]) === match[3]);
  };
  function decorate(node, parent = null) {
    if (typeof node === 'string' || typeof node === 'number') return node;
    all.push(node); node.parent = parent;
    node.children = node.children.map(child => decorate(child, node));
    node.attrs = Object.fromEntries(Object.entries(node.props).filter(([name, value]) => !name.startsWith('on') && value !== undefined && value !== null && (typeof value !== 'boolean' || name.startsWith('aria-') || value)).map(([name, value]) => [attribute[name] || name, typeof value === 'boolean' && !name.startsWith('aria-') ? '' : String(value)]));
    node.getAttribute = name => node.attrs[name] ?? null;
    node.querySelectorAll = selector => {
      const result = [], selectors = selector.split(',').map(item => item.trim());
      const walk = entry => { for (const child of entry.children) if (typeof child === 'object') { if (selectors.some(s => matches(child, s))) result.push(child); walk(child); } };
      walk(node); return result;
    };
    node.querySelector = selector => node.querySelectorAll(selector)[0] || null;
    node.closest = selector => { let item = node; while (item && !matches(item, selector)) item = item.parent; return item; };
    Object.defineProperties(node, {
      textContent: { get: () => node.children.map(child => typeof child === 'object' ? child.textContent : child).join('') },
      required: { get: () => ['INPUT', 'SELECT', 'TEXTAREA'].includes(node.tagName) ? !!node.props.required : undefined },
      disabled: { get: () => !!node.props.disabled },
      value: { get: () => node.props.value ?? (node.tagName === 'INPUT' && node.props.type === 'checkbox' ? 'on' : '') },
      type: { get: () => node.props.type }, checked: { get: () => !!node.props.checked }, open: { get: () => !!node.props.open },
      options: { get: () => node.querySelectorAll('option') },
      labels: { get: () => all.filter(label => label.tagName === 'LABEL' && ((node.props.id && label.props.htmlFor === node.props.id) || node.closest('label') === label)) },
    });
    return node;
  }
  return decorate(tree).querySelector('form');
}
for (const locale of ['en', 'ru', 'es']) test(locale + ' actual source JSX passes the real DOM serializer', () => {
  assertPaidFormSnapshot(readPaidForm(sourceForm(locale)), locale);
});
for (const [name, mutate] of [
  ['missing email', form => { const email = form.querySelector('input[type="email"]'); email.parent.children = email.parent.children.filter(child => child !== email); }],
  ['extra file input', form => { const input = form.querySelector('input[type="email"]'); input.attrs.type = 'file'; form.children.push(input); }],
  ['wrong name type', form => { form.querySelector('input[type="text"]').attrs.type = 'password'; }],
  ['medical label', form => { const label = form.querySelector('input[type="text"]').closest('label'); label.children[0] = 'Diagnosis'; }],
  ['missing privacy note', form => { const small = form.querySelector('details').querySelector('small'); small.children = []; }],
  ['note becomes required', form => { form.querySelector('textarea').props.required = true; }],
]) test('real DOM extraction rejects ' + name, () => {
  assertPaidFormSnapshot(readPaidForm(sourceForm('en')), 'en');
  const form = sourceForm('en'); mutate(form);
  assert.throws(() => assertPaidFormSnapshot(readPaidForm(form), 'en'), /Exact blank contact-only enquiry schema/);
});

const schemaFaults = {
  'extra field': s => s.controls.push({ tag: 'INPUT', type: 'file' }),
  'same-count medical field': s => { s.controls[0].autocomplete = 'off'; s.controls[0].name = 'diagnosis'; },
  'medical relabel': s => { s.controls[0].visibleLabel = 'Medical diagnosis'; },
  'file upload replacing email': s => { s.controls[1].type = 'file'; },
  'private note mandatory': s => { s.controls[4].required = true; },
  'private note minimum': s => { s.controls[4].min = '20'; },
  'unbounded note': s => { s.controls[4].max = null; },
  'note outside disclosure': s => { s.noteContainsOnlyTextarea = false; },
  'note initially open': s => { s.noteClosed = false; },
  'prechecked consent': s => { s.controls[5].checked = true; },
  'marketing consent': s => { s.consent = 'Subscribe to advertising'; },
  'missing medical warning': s => { s.privacy = ''; },
  'filled contact': s => { s.controls[0].empty = false; },
  'enabled submit': s => { s.controls[7].disabled = false; },
  'busy form': s => { s.busy = 'true'; },
  'missing country': s => { s.countries.pop(); },
  'wrong default country': s => { s.country = 'US'; },
  'honeypot visible to assistive tech': s => { s.honeypotHidden = false; },
  'custom medical editor': s => { s.customControls = 1; },
};
for (const [name, mutate] of Object.entries(schemaFaults)) test('exact contact schema rejects ' + name, () => {
  assertPaidFormSnapshot(expectedPaidForm('en'), 'en');
  const snapshot = structuredClone(expectedPaidForm('en')); mutate(snapshot);
  assert.throws(() => assertPaidFormSnapshot(snapshot, 'en'), /Exact blank contact-only enquiry schema/);
});

function ui(options, fault) {
  const policy = releasePaidPolicy(options), calls = [];
  let choice = 0, open = false, note = false;
  const handles = [];
  let current = { connected: true };
  const controls = ['session', 'questions', 'free'];
  const loc = (kind, index) => ({
    kind,
    get count() {
      if (kind === 'choices') return 3;
      if (kind === 'all fields') return 7;
      if (kind === 'anchors') return fault === 'pre-save messenger' ? 1 : 0;
      if (kind === 'custom' || kind === 'summary children') return 0;
      if (kind === 'chooser') return choice === 2 ? 0 : 1;
      return 1;
    },
    get visible() { return kind !== 'form' || open; },
    async getAttribute(name) {
      if (kind === 'choice' && name === 'aria-pressed') return String(choice === index);
      if (kind === 'chooser' && name === 'data-open') return String(open);
      if (kind === 'trigger' && name === 'aria-expanded') return String(open);
      if (['choice', 'trigger'].includes(kind) && name === 'type') return fault === 'submit trigger' && kind === 'trigger' ? 'submit' : 'button';
      if (['choice', 'trigger'].includes(kind) && name === 'form') return fault === 'associated trigger' && kind === 'trigger' ? 'unexpected-form' : null;
      if (kind === 'free') return ({ 'data-consultation-action': 'free', href: '/' + policy.locale + '/services/free-situation-review', target: fault === 'external free target' ? '_blank' : null })[name] ?? null;
      return null;
    },
    async innerText() { return fault === 'wrong price' ? 'wrong' : copy[policy.locale].serviceOptions[controls[index]]; },
    nth(index) { assert.equal(kind, 'choices'); return loc('choice', index); },
    locator(selector) {
      const map = {
        capture: { '[role="group"] button': 'choices', '[data-contact-channel-chooser]': 'chooser', '[data-consultation-action]': 'free', form: 'form', 'input, textarea, select': 'all fields', '[contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="checkbox"], [role="combobox"]': 'custom' },
        chooser: { 'button[data-contact-order]': 'trigger', form: 'form', 'a, [data-contact-channel]': 'anchors' },
        form: { details: 'note', textarea: 'textarea' }, note: { ':scope > summary': 'summary' }, summary: { 'a, button, input, select, textarea': 'summary children' },
      };
      assert.ok(map[kind]?.[selector], 'Reviewed UI selector: ' + kind + ' / ' + selector);
      return loc(map[kind][selector]);
    },
    async evaluate(fn) {
      if (kind === 'form') {
        assert.equal(fn, readPaidForm); const snapshot = structuredClone(expectedPaidForm(policy.locale));
        snapshot.noteClosed = !note; if (fault === 'filled form') snapshot.controls[0].empty = false;
        return snapshot;
      }
      assert.ok(['choice', 'trigger'].includes(kind));
      return fn({ tagName: 'BUTTON', form: fault === 'ancestor form' ? {} : null });
    },
    async elementHandle() {
      assert.equal(kind, 'form'); const element = current;
      const handle = { disposed: false, async evaluate(fn) { return fn({ isConnected: element.connected }); }, async dispose() { this.disposed = true; } };
      handles.push(handle); return handle;
    },
    async click() {
      calls.push([kind, index]);
      if (kind === 'trigger') { open = !open; return; }
      if (kind === 'summary') { note = !note; return; }
      assert.equal(kind, 'choice', 'Never click submit, free link, or a messenger');
      if (choice !== index) {
        if (fault !== 'form not remounted') current.connected = false;
        current = { connected: true }; open = false; note = false; choice = index;
      }
    },
  });
  const page = { locator(selector) { assert.equal(selector, '[data-consultation-capture="service"]'); return loc('capture'); } };
  const expect = target => ({
    async toHaveCount(value) { assert.equal(target.count, value, target.kind + ' count'); },
    async toHaveAttribute(name, value) { assert.equal(await target.getAttribute(name), value, target.kind + ' attribute ' + name); },
    async toBeVisible() { assert.equal(target.visible, true, target.kind + ' visible'); },
    async toHaveURL(value) { assert.equal(target.url, value); },
  });
  expect.poll = callback => ({ async toBe(value) { assert.equal(await callback(), value, 'Old form must be detached'); } });
  return { page, expect, calls, handles, policy };
}
for (const engine of ['chromium', 'webkit']) for (const width of [390, 1365]) for (const locale of ['en', 'ru', 'es']) test(`${engine} ${width} ${locale}: no-submit contract sequencing (synthetic page, not browser proof)`, async () => {
  const mock = ui({ ...base, width, locale });
  const result = await verifyPaidEnquiryUi(mock.page, mock.policy, mock.expect);
  assert.deepEqual(mock.calls.filter(([kind]) => kind === 'choice').map(([, index]) => index), [1, 2, 0]);
  assert.ok(mock.handles.every(handle => handle.disposed));
  assert.equal(result.messageSent, false); assert.equal(result.postSaveRuntimeVerified, false); assert.equal(result.preparedMessageRuntimeVerified, false);
});
for (const [fault, error] of [
  ['pre-save messenger', /anchors count/], ['submit trigger', /trigger attribute type/], ['associated trigger', /No form-associated audit click/],
  ['ancestor form', /Only standalone non-submit buttons/], ['wrong price', /Selected paid duration and price/],
  ['filled form', /Exact blank contact-only/], ['form not remounted', /Old form must be detached/], ['external free target', /strictly equal/],
]) test('UI contract rejects ' + fault, async () => {
  const good = ui(base); await verifyPaidEnquiryUi(good.page, good.policy, good.expect);
  const bad = ui(base, fault); await assert.rejects(verifyPaidEnquiryUi(bad.page, bad.policy, bad.expect), error);
  if (['pre-save messenger', 'submit trigger', 'associated trigger', 'ancestor form', 'wrong price', 'filled form'].includes(fault)) assert.deepEqual(bad.calls, []);
});
for (const options of [base, live]) test(options.label + ' wrapper installs both guards before page/navigation and closes fresh context', async () => {
  const mock = ui(options), { context, events } = network();
  context.newPage = async () => {
    events.push('newPage');
    mock.page.goto = async href => { events.push('goto'); assert.equal(href, options.origin + mock.policy.path); mock.page.url = href; await context.send(request(mock.policy)); return { status: () => 200 }; };
    return mock.page;
  };
  context.close = async () => events.push('close');
  const browser = { async newContext(settings) { assert.deepEqual(settings, { viewport: { width: options.width, height: 900 }, reducedMotion: 'reduce', serviceWorkers: 'block' }); events.push('newContext'); return context; } };
  const result = await verifyReleasePaidEnquiry(browser, options, mock.expect);
  assert.deepEqual(events, ['newContext', 'route', 'socket guard', 'newPage', 'goto', 'close']);
  assert.equal(result.postAttempts, 0); assert.equal(result.blockedRequests, 0);
});
test('late forbidden teardown request cannot produce a green result', async () => {
  const mock = ui(base), { context } = network();
  context.newPage = async () => { mock.page.goto = async href => { mock.page.url = href; return { status: () => 200 }; }; return mock.page; };
  context.close = async () => { void context.send(request(mock.policy, '/api/service-enquiries', 'POST', 'fetch')); };
  await assert.rejects(verifyReleasePaidEnquiry({ newContext: async () => context }, base, mock.expect), /attempted a POST/);
});

// Execute the actual source expressions with actual pure URL builders. This
// fills the 100/50/reset draft gap without claiming post-save browser coverage.
const urlExpression = source.match(/const whatsappUrl = (whatsappEnquiryUrl\([\s\S]*?\));/)[1];
const ctaExpression = source.match(/const ctaHref = ([^;]+);/)[1];
const keyExpression = chooserSource.match(/key=\{(JSON\.stringify\(\[pathname, props\.whatsappUrl, props\.locale\]\))\}/)[1];
for (const locale of ['en', 'ru', 'es']) test(locale + ' actual 100/50/free/reset source preserves exact drafts and remount keys', () => {
  const build = new Function('whatsappEnquiryUrl', 'locale', 'service', 't', 'serviceChoice', 'const whatsappUrl = ' + urlExpression + '; const isService = true, isPaidRequest = serviceChoice !== "free", topic = "personal"; return { whatsappUrl, cta: ' + ctaExpression + ' };');
  const key = new Function('pathname', 'props', 'return ' + keyExpression);
  const session = build(whatsappEnquiryUrl, locale, 'Imagery therapy', copy[locale], 'session');
  const express = build(whatsappEnquiryUrl, locale, 'Imagery therapy', copy[locale], 'questions');
  for (const [draft, choice, duration, price] of [[session, 'session', '60', '€100'], [express, 'questions', '30', '€50']]) {
    const whatsapp = new URL(draft.whatsappUrl), telegram = new URL(telegramEnquiryUrlFromWhatsApp(draft.whatsappUrl));
    const text = whatsapp.searchParams.get('text');
    assert.ok(text.includes(duration) && text.includes(price));
    assert.ok(text.includes(copy[locale].serviceMessages[choice]) && text.includes(copy[locale].serviceOptions[choice]));
    assert.equal(telegram.searchParams.get('text'), text); assert.equal(draft.cta, draft.whatsappUrl);
  }
  assert.notEqual(session.whatsappUrl, express.whatsappUrl);
  const props = whatsappUrl => ({ whatsappUrl, locale });
  const path = '/' + locale + '/services/imagery-therapy';
  assert.notEqual(key(path, props(session.whatsappUrl)), key(path, props(express.whatsappUrl)));
  assert.equal(build(whatsappEnquiryUrl, locale, 'Imagery therapy', copy[locale], 'free').cta, '/' + locale + '/services/free-situation-review');
  const reset = build(whatsappEnquiryUrl, locale, 'Imagery therapy', copy[locale], 'session');
  assert.deepEqual(reset, session); assert.equal(key(path, props(reset.whatsappUrl)), key(path, props(session.whatsappUrl)));
});
test('Release caller retains matrix, explicit label, and no unsafe helper or runtime coverage claims', () => {
  const caller = read('scripts/verify-release-reaudit.mjs');
  const guardAt = caller.indexOf('assertReleasePaidMode({ origin, label })');
  const launchAt = caller.indexOf('await chromium.launch(');
  assert.ok(guardAt >= 0 && launchAt >= 0, 'Top-level mode validation and browser launcher must both exist');
  assert.ok(guardAt < launchAt, 'Mode validation must precede all browser/context work');
  assert.match(caller, /verifyReleasePaidEnquiry\(browser, \{ origin, label, locale, width \}, expect\)/);
  assert.match(caller, /for \(const locale of \['en', 'ru', 'es'\]\)/);
  assert.doesNotMatch(caller, /openRegisteredContactChannelChooser|bothChannelsVerified: true/);
  const helper = read('scripts/helpers/release-paid-enquiry-verifier.mjs');
  assert.doesNotMatch(helper, /\.fill\(|\.check\(|\.submit\(|connectToServer\(|storageState:|process\.env|route\.continue\(/);
  assert.match(helper, /postSaveRuntimeVerified: false, preparedMessageRuntimeVerified: false, messageSent: false/);
});

// These synthetic canaries model sensitive input. Neither values nor unknown
// key strings may reach a guard assertion; only the approved bounded metadata.
const DIAGNOSTIC_CANARY = 'SYNTHETIC_SECRET_MUST_NOT_APPEAR';
const metadataKeys = ['resourceType', 'sameOrigin', 'pathClass', 'knownQueryKeys', 'unknownQueryKeyCount', 'hasPercent', 'hasBackslash', 'hasHash', 'hasUserinfo'];
test('denied metadata reports only approved schema and never makes a query allowable', () => {
  const policy = releasePaidPolicy(base);
  const req = request(policy, '/_next/static/chunks/app/%5Blocale%5D/page.js?_rsc=' + DIAGNOSTIC_CANARY + '&v=' + DIAGNOSTIC_CANARY + '&dpl=' + DIAGNOSTIC_CANARY + '&' + DIAGNOSTIC_CANARY + '=hidden', 'GET', 'script');
  assert.equal(classifyPaidRequest(policy, req), 'noncanonical URL');
  const metadata = deniedPaidRequestMetadata(policy, req);
  assert.deepEqual(Object.keys(metadata), metadataKeys);
  assert.deepEqual(metadata, { resourceType: 'script', sameOrigin: true, pathClass: 'next-static', knownQueryKeys: ['_rsc', 'v', 'dpl'], unknownQueryKeyCount: 1, hasPercent: true, hasBackslash: false, hasHash: false, hasUserinfo: false });
  assert.doesNotMatch(JSON.stringify(metadata), new RegExp(DIAGNOSTIC_CANARY));
  assert.equal(classifyPaidRequest(policy, req), 'noncanonical URL', 'Metadata must not normalize or allow the request');
});
for (const [name, make, expected] of [
  ['audited page query', p => request(p, p.path + '?_rsc=' + DIAGNOSTIC_CANARY), { pathClass: 'exact-audited-page', sameOrigin: true, knownQueryKeys: ['_rsc'], unknownQueryKeyCount: 0 }],
  ['public image query', p => request(p, '/images/holistic-house/' + DIAGNOSTIC_CANARY + '.webp?url=' + DIAGNOSTIC_CANARY + '&w=640&q=75', 'GET', 'image'), { pathClass: 'image', sameOrigin: true, knownQueryKeys: [], unknownQueryKeyCount: 3 }],
  ['foreign host and private path', p => request(p, '/' + DIAGNOSTIC_CANARY + '?v=' + DIAGNOSTIC_CANARY, 'GET', 'fetch', 'https://' + DIAGNOSTIC_CANARY.toLowerCase() + '.invalid'), { pathClass: 'other', sameOrigin: false, knownQueryKeys: ['v'] }],
  ['userinfo and fragment', p => request(p, '/_next/static/a.js#' + DIAGNOSTIC_CANARY, 'GET', 'script', 'http://' + DIAGNOSTIC_CANARY + ':hidden@127.0.0.1:3123'), { sameOrigin: true, hasUserinfo: true, hasHash: true }],
  ['backslash', p => ({ ...request(p), url: () => p.origin + '/_next/static/' + DIAGNOSTIC_CANARY + '\\file.js' }), { hasBackslash: true }],
  ['malformed URL', p => ({ ...request(p), url: () => DIAGNOSTIC_CANARY }), { sameOrigin: false, pathClass: 'other' }],
  ['unknown resource type', p => ({ ...request(p, p.path + '?private=' + DIAGNOSTIC_CANARY), resourceType: () => DIAGNOSTIC_CANARY }), { resourceType: 'other', unknownQueryKeyCount: 1 }],
]) test('diagnostic redaction for ' + name + ' preserves abort and fatal failure', async () => {
  const policy = releasePaidPolicy(base), { context } = network();
  const guard = await installPaidReadOnlyGuard(context, policy);
  assert.deepEqual(await context.send(request(policy)), ['fetch', 'fulfill']);
  const req = make(policy), metadata = deniedPaidRequestMetadata(policy, req);
  for (const [key, value] of Object.entries(expected)) assert.deepEqual(metadata[key], value);
  assert.deepEqual(Object.keys(metadata), metadataKeys);
  assert.deepEqual(await context.send(req), ['abort']);
  assert.throws(() => guard.assertClean(), error => {
    assert.match(error.message, /Paid read-only network boundary violated/);
    assert.doesNotMatch(error.message, new RegExp(DIAGNOSTIC_CANARY, 'i'));
    assert.doesNotMatch(JSON.stringify(error.actual), new RegExp(DIAGNOSTIC_CANARY, 'i'));
    assert.doesNotMatch(error.message, /https?:\/\/|\/images\/|\/_next\//);
    return true;
  });
});
test('known key labels are finite, deduplicated and case-sensitive; unknown count is capped', () => {
  const policy = releasePaidPolicy(base);
  const query = ['v=one', 'v=two', 'DPL=unknown', ...Array.from({ length: 200 }, (_, i) => DIAGNOSTIC_CANARY + i + '=hidden')].join('&');
  const metadata = deniedPaidRequestMetadata(policy, request(policy, policy.path + '?' + query));
  assert.deepEqual(metadata.knownQueryKeys, ['v']); assert.equal(metadata.unknownQueryKeyCount, 100);
  assert.doesNotMatch(JSON.stringify(metadata), new RegExp(DIAGNOSTIC_CANARY));
});
test('duplicate blocked requests remain three attempts, never a distinct-URL claim', async () => {
  const policy = releasePaidPolicy(base), { context } = network();
  const guard = await installPaidReadOnlyGuard(context, policy);
  for (let i = 0; i < 3; i++) assert.deepEqual(await context.send(request(policy, policy.path + '?v=' + DIAGNOSTIC_CANARY)), ['abort']);
  assert.throws(() => guard.assertClean(), error => {
    assert.equal(error.actual.length, 3); assert.ok(error.actual.every(row => row.reason === 'noncanonical URL'));
    assert.doesNotMatch(JSON.stringify(error.actual), new RegExp(DIAGNOSTIC_CANARY)); return true;
  });
});

test('metadata exception retains the original denied reason and aborts before fetch', async () => {
  const policy = releasePaidPolicy(base), { context } = network();
  const guard = await installPaidReadOnlyGuard(context, policy);
  assert.deepEqual(await context.send(request(policy)), ['fetch', 'fulfill']);
  const req = { ...request(policy, policy.path + '?v=' + DIAGNOSTIC_CANARY), resourceType() { throw new Error(DIAGNOSTIC_CANARY); } };
  assert.equal(classifyPaidRequest(policy, req), 'noncanonical URL');
  assert.deepEqual(await context.send(req), ['abort']);
  assert.throws(() => guard.assertClean(), error => {
    assert.deepEqual(error.actual, ['noncanonical URL']);
    assert.doesNotMatch(error.message, new RegExp(DIAGNOSTIC_CANARY)); return true;
  });
});

// Source-bound public asset grammar. These are synthetic requests only: the
// network fixture records fetch/abort without contacting any resource.
// Next 15.5.21 source e26f6ffaa710fc62ca0c8640db0e43b6663edf32:
// image-loader.ts 90-101; get-img-props.ts 159-179, 227-251, 300-309;
// flight-client-entry-plugin.ts 373-382; webpack-config.ts 1303-1345;
// flight-manifest-plugin.ts 134-147; encode-uri-path.ts 1-6.
const imageryRouteFile = 'app/[locale]/services/imagery-therapy/page.tsx';
const imageryRouteSource = read(imageryRouteFile);
const landingSource = read('components/personal-service-landing.tsx');
const configSource = read('next.config.ts');
const portraitAsset = '/images/holistic-house/andy-about.png';
const configuredPortraitWidths = [32, 64, 96, 160, 256, 384, 640, 828, 1080, 1440, 1920, 2560];
const chunkPath = hash => '/_next/static/chunks/' + imageryRouteFile.replace(/\.tsx$/, '').split('/').map(encodeURIComponent).join('/') + '-' + hash + '.js';
const nominalChunk = chunkPath('0123456789abcdef');
const portraitPath = width => '/_next/image?url=' + encodeURIComponent(portraitAsset) + '&w=' + width + '&q=75';
const nominalPortrait = portraitPath(64);

test('public chunk and twelve portrait URLs remain bound to actual route, JSX and image config', () => {
  assert.match(imageryRouteSource, /const service = "imagery-therapy" as const;/);
  assert.match(imageryRouteSource, /return <PersonalServiceLanding locale=\{locale as ServicePageLocale\} service=\{service\} \/>;/);
  assert.match(imageryRouteSource, /return \[\{ locale: "en" \}, \{ locale: "ru" \}, \{ locale: "es" \}\];/);
  const ast = ts.createSourceFile('landing.tsx', landingSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const portraits = [];
  function visit(node) {
    if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(ast) === 'Image') {
      const attrs = node.attributes.properties;
      const src = attrs.find(a => ts.isJsxAttribute(a) && a.name.text === 'src')?.initializer;
      if (src && ts.isStringLiteral(src) && src.text === portraitAsset) portraits.push(attrs);
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  assert.equal(portraits.length, 1);
  assert.deepEqual(portraits[0].map(a => a.name.text), ['src', 'alt', 'width', 'height', 'sizes']);
  const values = Object.fromEntries(portraits[0].map(a => [a.name.text, ts.isStringLiteral(a.initializer) ? a.initializer.text : a.initializer.expression.getText(ast)]));
  assert.deepEqual(values, { src: portraitAsset, alt: '', width: '54', height: '54', sizes: '54px' });
  const configAst = ts.createSourceFile('next.config.ts', configSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  let config;
  const findConfig = node => { if (ts.isVariableDeclaration(node) && node.name.getText(configAst) === 'nextConfig') config = node.initializer; ts.forEachChild(node, findConfig); };
  findConfig(configAst); assert.ok(ts.isObjectLiteralExpression(config));
  const images = config.properties.find(p => p.name?.getText(configAst) === 'images').initializer;
  assert.ok(ts.isObjectLiteralExpression(images));
  const numericArray = name => {
    const value = images.properties.find(p => p.name?.getText(configAst) === name).initializer;
    assert.ok(ts.isArrayLiteralExpression(value));
    return value.elements.map(element => { assert.ok(ts.isNumericLiteral(element)); return Number(element.text); });
  };
  assert.deepEqual([...numericArray('deviceSizes'), ...numericArray('imageSizes')].sort((a, b) => a - b), configuredPortraitWidths);
  assert.deepEqual(numericArray('qualities'), [75]);
  for (const name of ['loader', 'loaderFile', 'path', 'unoptimized']) assert.equal(images.properties.some(p => p.name?.getText(configAst) === name), false);
  assert.match(landingSource, /unoptimized=\{personalServiceImages\[service\]\.endsWith\("\.webp"\)\}/);
  assert.match(read('data/personal-service-pages.ts'), /"imagery-therapy": "\/images\/holistic-house\/video-posters\/hypnotherapy-en-v1\.webp"/);
});

for (const mode of [base, live]) for (const locale of ['en', 'ru', 'es']) for (const width of [390, 1365]) {
  test(`${mode.label}/${locale}/${width} permits exact encoded public chunks without broad decoding`, async () => {
    const policy = releasePaidPolicy({ ...mode, locale, width }), { context } = network();
    const guard = await installPaidReadOnlyGuard(context, policy);
    for (const hash of ['0123456789abcdef', 'fedcba9876543210']) {
      const req = request(policy, chunkPath(hash), 'GET', 'script');
      assert.equal(classifyPaidRequest(policy, req), null);
      assert.deepEqual(await context.send(req), ['fetch', 'fulfill']);
    }
    assert.deepEqual(guard.assertClean(), { postAttempts: 0, blockedRequests: 0, allowedGets: 2 });
  });
  test(`${mode.label}/${locale}/${width} keeps the twelve portrait URLs local-only`, async () => {
    const policy = releasePaidPolicy({ ...mode, locale, width }), { context } = network();
    const guard = await installPaidReadOnlyGuard(context, policy);
    for (const imageWidth of configuredPortraitWidths) {
      assert.deepEqual(await context.send(request(policy, nominalChunk, 'GET', 'script')), ['fetch', 'fulfill']);
      const req = request(policy, portraitPath(imageWidth), 'GET', 'image');
      assert.equal(classifyPaidRequest(policy, req), mode.label === 'local' ? null : 'noncanonical URL');
      assert.deepEqual(await context.send(req), mode.label === 'local' ? ['fetch', 'fulfill'] : ['abort']);
    }
    if (mode.label === 'local') assert.deepEqual(guard.assertClean(), { postAttempts: 0, blockedRequests: 0, allowedGets: 24 });
    else assert.throws(() => guard.assertClean(), error => error.code === 'ERR_ASSERTION' && error.actual.length === 12 && error.actual.every(row => row.reason === 'noncanonical URL'));
  });
}

const chunkFaults = [
  ['private route', p => p.replace('services/imagery-therapy', 'client/records')],
  ['admin route', p => p.replace('services/imagery-therapy', 'admin/clients')],
  ['API route', p => p.replace('services/imagery-therapy', 'api/service-enquiries')],
  ['linked route', p => p.replace('imagery-therapy', 'free-situation-review')],
  ['sibling page', p => p.replace('/services/imagery-therapy', '')],
  ['invented layout', p => p.replace('/services/imagery-therapy/page-', '/layout-')],
  ['other variable', p => p.replace('locale', 'selector')],
  ['literal brackets', p => p.replace('%5Blocale%5D', '[locale]'), 'unallowlisted public resource'],
  ['lowercase brackets', p => p.replace('%5B', '%5b').replace('%5D', '%5d')],
  ['mixed brackets', p => p.replace('%5B', '%5b')],
  ['double encoding', p => p.replace('%5B', '%255B')],
  ['encoded slash', p => p.replace('/services/', '%2Fservices/')],
  ['encoded backslash', p => p.replace('/services/', '%5Cservices/')],
  ['encoded traversal', p => p.replace('/services/', '/%2e%2e/services/')],
  ['dot normalization', p => p.replace('/services/', '/other/../services/')],
  ['repeated slash', p => p.replace('/services/', '//services/')],
  ['backslash', p => p.replace('/services/', '\\services/')],
  ['short hash', p => p.replace('0123456789abcdef', '0123456789abcde')],
  ['long hash', p => p.replace('0123456789abcdef', '0123456789abcdef0')],
  ['nonhex hash', p => p.replace('0123456789abcdef', '0123456789abcdeg')],
  ['uppercase hash', p => p.replace('0123456789abcdef', '0123456789ABCDEF')],
  ['wrong extension', p => p.replace('.js', '.json')],
  ['extra suffix', p => p + '.js'],
  ...['?v=1', '?dpl=1', '?_rsc=1', '?', '#', '#fragment'].map(suffix => ['suffix ' + suffix, p => p + suffix]),
];
const imageFaults = [
  ['other asset', p => p.replace('andy-about.png', 'other.png')],
  ['private source', p => p.replace(encodeURIComponent(portraitAsset), '%2Fapi%2Fclient%2Fdocument')],
  ['external source', p => p.replace(encodeURIComponent(portraitAsset), 'https%3A%2F%2Fexample.invalid%2Fimage.png')],
  ['protocol-relative source', p => p.replace(encodeURIComponent(portraitAsset), '%2F%2Fexample.invalid%2Fimage.png')],
  ['nested optimizer', p => p.replace(encodeURIComponent(portraitAsset), '%2F_next%2Fimage%3Furl%3Dprivate')],
  ['missing source', p => p.replace('url=' + encodeURIComponent(portraitAsset) + '&', '')],
  ['missing width', p => p.replace('&w=64', '')],
  ['missing quality', p => p.replace('&q=75', '')],
  ['duplicate source', p => p + '&url=' + encodeURIComponent(portraitAsset)],
  ['duplicate width', p => p + '&w=64'],
  ['duplicate quality', p => p + '&q=75'],
  ['unknown key', p => p + '&extra=1'],
  ['empty key', p => p + '&=1'],
  ['empty source', p => p.replace(encodeURIComponent(portraitAsset), '')],
  ['reordered keys', p => p.replace('&w=64&q=75', '&q=75&w=64')],
  ['encoded key', p => p.replace('?url=', '?%75rl=')],
  ['uppercase key', p => p.replace('?url=', '?URL=')],
  ['double-encoded source', p => p.replaceAll('%2F', '%252F')],
  ['lowercase encoding', p => p.replaceAll('%2F', '%2f')],
  ['literal source slashes', p => p.replaceAll('%2F', '/')],
  ['over-encoded filename', p => p.replace('andy', '%61ndy')],
  ['source query', p => p.replace('.png', '.png%3Fprivate%3D1')],
  ['source fragment', p => p.replace('.png', '.png%23private')],
  ['source traversal', p => p.replace('andy-about.png', '..%2Fandy-about.png')],
  ['source backslash', p => p.replace('%2Fimages', '%5Cimages')],
  ['optimizer traversal', p => p.replace('/_next/image', '/_next/other/../image')],
  ['encoded optimizer path', p => p.replace('/_next/image', '/_next/%69mage')],
  ...['0', '1', '63', '128', '3840', '064', '+64', '64.0', '6.4e1', '%36%34'].map(w => ['invalid width ' + w, p => p.replace('w=64', 'w=' + w)]),
  ...['0', '74', '100', '075', '+75', '75.0', '%37%35'].map(q => ['invalid quality ' + q, p => p.replace('q=75', 'q=' + q)]),
  ...['&', '?', '#', '#fragment', '&v=1', '&dpl=1', '&_rsc=1'].map(suffix => ['suffix ' + suffix, p => p + suffix]),
];
for (const [kind, path, type, faults] of [['chunk', nominalChunk, 'script', chunkFaults], ['portrait', nominalPortrait, 'image', imageFaults]]) {
  for (const [name, mutate, reason = 'noncanonical URL'] of faults) test(`${kind} grammar rejects ${name} after nominal acceptance`, async () => {
    const policy = releasePaidPolicy(base), { context } = network(), guard = await installPaidReadOnlyGuard(context, policy);
    assert.deepEqual(await context.send(request(policy, path, 'GET', type)), ['fetch', 'fulfill']);
    const changed = mutate(path); assert.notEqual(changed, path);
    assert.equal(classifyPaidRequest(policy, request(policy, changed, 'GET', type)), reason);
    assert.deepEqual(await context.send(request(policy, changed, 'GET', type)), ['abort']);
    assert.throws(() => guard.assertClean(), /Paid read-only network boundary violated/);
  });
  for (const [name, modify, reason] of [
    ['POST', req => ({ ...req, method: () => 'POST' }), 'non-GET'],
    ['HEAD', req => ({ ...req, method: () => 'HEAD' }), 'non-GET'],
    ['fetch type', req => ({ ...req, resourceType: () => 'fetch' }), 'noncanonical URL'],
    ['document type', req => ({ ...req, resourceType: () => 'document' }), 'noncanonical URL'],
    ['navigation', req => ({ ...req, isNavigationRequest: () => true }), 'noncanonical URL'],
    ['foreign origin', req => ({ ...req, url: () => req.url().replace(base.origin, 'https://example.invalid') }), 'noncanonical URL'],
    ['wrong loopback port', req => ({ ...req, url: () => req.url().replace(':3123', ':3000') }), 'noncanonical URL'],
    ['alternate loopback hostname', req => ({ ...req, url: () => req.url().replace('127.0.0.1', 'localhost') }), 'noncanonical URL'],
    ['userinfo', req => ({ ...req, url: () => req.url().replace('http://', 'http://name@') }), 'noncanonical URL'],
  ]) test(`${kind} exception rejects ${name} before fetch`, async () => {
    const policy = releasePaidPolicy(base), { context } = network(), guard = await installPaidReadOnlyGuard(context, policy);
    assert.deepEqual(await context.send(request(policy, path, 'GET', type)), ['fetch', 'fulfill']);
    const changed = modify(request(policy, path, 'GET', type));
    assert.equal(classifyPaidRequest(policy, changed), reason);
    assert.deepEqual(await context.send(changed), ['abort']);
    assert.throws(() => guard.assertClean(), name === 'POST' ? /attempted a POST/ : /Paid read-only network boundary violated/);
  });
  for (const status of [301, 302, 303, 307, 308]) test(`${kind} exception still blocks redirect ${status}`, async () => {
    const policy = releasePaidPolicy(base), { context } = network(), guard = await installPaidReadOnlyGuard(context, policy);
    assert.deepEqual(await context.send(request(policy, path, 'GET', type)), ['fetch', 'fulfill']);
    assert.deepEqual(await context.send(request(policy, path, 'GET', type), { status }), ['fetch', 'abort']);
    assert.throws(() => guard.assertClean(), /redirect/);
  });
}
