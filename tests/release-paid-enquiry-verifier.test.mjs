import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { releasePaidPolicy, classifyPaidRequest, deniedPaidRequestMetadata, deniedPaidFetchMetadata, installPaidReadOnlyGuard, expectedPaidForm, readPaidForm, assertPaidFormSnapshot, verifyPaidEnquiryUi, verifyReleasePaidEnquiry } from '../scripts/helpers/release-paid-enquiry-verifier.mjs';
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
    assert.deepEqual(guard.assertClean(), { postAttempts: 0, blockedRequests: 0, allowedGets: 5, intentionallySuppressedPrefetches: 0 });
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

for (const locale of ['en', 'ru', 'es']) for (const method of ['email', 'phone']) test(locale + '/' + method + ' schema is bound to actual contact and phone source', () => {
  const expected = expectedPaidForm(locale, method), c = contactCopy[locale];
  assert.equal(expected.country, method === 'phone' ? phoneCountryFromValue('') : null);
  assert.equal(expected.consent, c.consent); assert.equal(expected.privacy, c.privateNote);
  assert.equal(expected.description, c.description); assert.equal(expected.submit, c.submit);
  assert.equal(expected.nameDescription, c.nameOptional); assert.equal(expected.replyVia, c.replyVia);
  assert.equal(expected.controls[0].label, c.google);
  assert.deepEqual(expected.controls.slice(1, 3).map(item => [item.buttonName, item.pressed]), [[c.email, String(method === 'email')], [c.phone, String(method === 'phone')]]);
  const name = expected.controls.find(item => item.autocomplete === 'name');
  assert.equal(name.visibleLabel, c.name); assert.equal(name.required, false);
  const captions = new Function('return ' + phoneSource.match(/const captions=(\{[\s\S]*?\});/)[1])()[locale];
  if (method === 'phone') {
    assert.equal(expected.controls[3].label, captions.country); assert.equal(expected.controls[4].label, captions.number);
    assert.equal(expected.controls[4].visibleLabel, c.phone); assert.equal(expected.controls[4].required, true);
    assert.deepEqual(expected.countries.map(item => item.value), PHONE_COUNTRIES.map(item => item.iso));
  } else {
    assert.equal(expected.controls[3].visibleLabel, c.email); assert.equal(expected.controls[3].required, true);
    assert.deepEqual(expected.countries, []);
  }
  assert.match(chooserSource, /<input type="text" autoComplete="name" minLength=\{2\} maxLength=\{120\}/);
  assert.match(chooserSource, /<input type="email" autoComplete="email" maxLength=\{254\} required/);
  assert.match(chooserSource, /<PhoneCountryInput id=\{panelId \+ "-phone"\} locale=\{locale\} required/);
  assert.match(chooserSource, /<input type="checkbox" required checked=\{consent\}/);
  assert.match(chooserSource, /maxLength=\{1400\} rows=\{2\}/);
  assert.match(chooserSource, /const \[consent, setConsent\] = useState\(false\)/);
  assert.match(phoneSource, /type="tel" inputMode="tel" autoComplete="tel-national"/);
  assert.match(phoneSource, /required=\{required\} maxLength=\{24\}/);
});
// Execute the actual JSX and only its inert contact-method handlers. No effects,
// browser, auth, submission, storage or network. The model is NOT expectedPaidForm.
function sourceForms(locale, actualSource = chooserSource) {
  const React = { createElement(type, props, ...children) {
    const flat = children.flat(Infinity).filter(child => child !== null && child !== undefined && typeof child !== 'boolean');
    if (typeof type === 'function') return type({ ...props, children: flat });
    return { tagName: type.toUpperCase(), props: props || {}, children: flat };
  } };
  const idleHooks = { useId: () => 'source-form', useState: value => [typeof value === 'function' ? value() : value, () => {}], useEffect: () => {}, useRef: value => ({ current: value }) };
  const state = []; let cursor = 0;
  const hooks = { ...idleHooks, useState(initial) {
    const index = cursor++;
    if (!(index in state)) state[index] = typeof initial === 'function' ? initial() : initial;
    return [state[index], value => { state[index] = typeof value === 'function' ? value(state[index]) : value; }];
  } };
  const compile = (text, functionName, globals) => {
    const start = text.indexOf('function ' + functionName); assert.ok(start >= 0, 'Actual component function');
    const code = ts.transpileModule(text.slice(start), { compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React } }).outputText;
    return new Function(...Object.keys(globals), code + '; return ' + functionName)(...Object.values(globals));
  };
  const forbidden = () => { throw Error('No auth, submit, storage or network in source-form fixture'); };
  const captions = new Function('return ' + phoneSource.match(/const captions=(\{[\s\S]*?\});/)[1])();
  const phone = compile(phoneSource, 'PhoneCountryInput', { ...idleHooks, React, styles: {}, captions, PHONE_COUNTRIES, phoneCountryFromValue, phoneNationalPart, composeCountryPhone });
  const formComponent = compile(actualSource, 'ContactChannelChooserForm', { ...hooks, React, copy: contactCopy, styles: {}, PhoneCountryInput: phone,
    ShoppingBag: () => null, ChevronDown: () => null, Send: () => null,
    withPaidAdReferral: value => value, withOrganicEventReferral: value => value,
    fetch: forbidden, window: new Proxy({}, { get: forbidden }), createPublicEnquirySubmissionScope: forbidden,
  });
  const attribute = { autoComplete: 'autocomplete', minLength: 'minlength', maxLength: 'maxlength', tabIndex: 'tabindex', htmlFor: 'for' };
  const matches = (node, selector) => {
    if (selector.startsWith('[contenteditable]')) return node.getAttribute('contenteditable') !== null && node.getAttribute('contenteditable') !== 'false';
    const match = selector.match(/^([a-z]+)?(?:\[([a-z-]+)="([^"]+)"\])?$/);
    assert.ok(match, 'Explicit DOM fixture selector: ' + selector);
    return (!match[1] || node.tagName === match[1].toUpperCase()) && (!match[2] || node.getAttribute(match[2]) === match[3]);
  };
  function render() {
    cursor = 0;
    const tree = formComponent({ locale, whatsappUrl: whatsappEnquiryUrl({ locale, service: 'Imagery therapy', request: 'Public enquiry' }), pathname: '/' + locale + '/services/imagery-therapy' });
    const all = [];
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
  let form = render();
  return { get form() { return form; }, choose(method) {
    assert.ok(['email', 'phone'].includes(method));
    const buttons = form.querySelector('[role="group"]').querySelectorAll('button');
    assert.equal(buttons.length, 2);
    const button = buttons[method === 'email' ? 0 : 1];
    assert.equal(button.props.type, 'button'); assert.equal(button.textContent.trim(), contactCopy[locale][method]);
    button.props.onClick(); form = render(); return form;
  } };
}
const sourceForm = (locale, method = 'email') => { const forms = sourceForms(locale); return method === 'email' ? forms.form : forms.choose(method); };
for (const locale of ['en', 'ru', 'es']) test(locale + ' actual email → phone → email JSX passes the real DOM serializer without Google or submission', () => {
  const forms = sourceForms(locale);
  assertPaidFormSnapshot(readPaidForm(forms.form), locale);
  assertPaidFormSnapshot(readPaidForm(forms.choose('phone')), locale, 'phone');
  assertPaidFormSnapshot(readPaidForm(forms.choose('email')), locale);
});
for (const [name, method, mutate] of [
  ['missing email', 'email', form => { const email = form.querySelector('input[type="email"]'); email.parent.children = email.parent.children.filter(child => child !== email); }],
  ['extra file input', 'email', form => { const input = form.querySelector('input[type="email"]'); input.attrs.type = 'file'; form.children.push(input); }],
  ['email not required', 'email', form => { form.querySelector('input[type="email"]').props.required = false; }],
  ['phone not required', 'phone', form => { form.querySelector('input[type="tel"]').props.required = false; }],
  ['missing country', 'phone', form => { const country = form.querySelector('select'); country.parent.children = country.parent.children.filter(child => child !== country); }],
  ['both contact methods mounted', 'phone', form => { form.children.push(sourceForm('en').querySelector('input[type="email"]')); }],
  ['name becomes required', 'email', form => { form.querySelector('input[autocomplete="name"]').props.required = true; }],
  ['wrong name type', 'email', form => { form.querySelector('input[autocomplete="name"]').attrs.type = 'password'; }],
  ['medical label', 'email', form => { const label = form.querySelector('input[autocomplete="name"]').closest('label'); label.children[0] = 'Diagnosis'; }],
  ['missing privacy note', 'email', form => { form.querySelector('textarea').closest('details').querySelector('small').children = []; }],
  ['note becomes required', 'email', form => { form.querySelector('textarea').props.required = true; }],
  ['name initially open', 'email', form => { form.querySelector('input[autocomplete="name"]').closest('details').props.open = true; }],
  ['note initially open', 'email', form => { form.querySelector('textarea').closest('details').props.open = true; }],
  ['prechecked consent', 'phone', form => { form.querySelector('input[type="checkbox"]').props.checked = true; }],
  ['Google becomes submit', 'email', form => { form.querySelector('button').attrs.type = 'submit'; }],
  ['Google becomes mandatory', 'email', form => { form.querySelector('input[type="email"]').props.disabled = true; }],
  ['method button becomes submit', 'email', form => { form.querySelector('[role="group"]').querySelector('button').attrs.type = 'submit'; }],
  ['wrong selected method', 'phone', form => { form.querySelector('[role="group"]').querySelector('button').attrs['aria-pressed'] = 'true'; }],
  ['extra method group', 'email', form => { form.children.push(form.querySelector('[role="group"]')); }],
]) test('real DOM extraction rejects ' + name, () => {
  assertPaidFormSnapshot(readPaidForm(sourceForm('en', method)), 'en', method);
  const form = sourceForm('en', method); mutate(form);
  assert.throws(() => assertPaidFormSnapshot(readPaidForm(form), 'en', method), /Exact blank contact-only enquiry schema/);
});
test('actual method handler mutation is detected, rather than forcing a synthetic hook value', () => {
  const changed = chooserSource.replace('setMethod("phone"); setError("");', 'setMethod("email"); setError("");');
  assert.notEqual(changed, chooserSource);
  const nominal = sourceForms('en'); assertPaidFormSnapshot(readPaidForm(nominal.choose('phone')), 'en', 'phone');
  const mutant = sourceForms('en', changed); assertPaidFormSnapshot(readPaidForm(mutant.form), 'en');
  assert.throws(() => assertPaidFormSnapshot(readPaidForm(mutant.choose('phone')), 'en', 'phone'), /Exact blank contact-only/);
});

const field = (s, selector) => s.controls.find(selector);
const schemaFaults = {
  'extra field': s => s.controls.push({ tag: 'INPUT', type: 'file' }),
  'same-count medical field': s => { field(s, c => c.autocomplete === 'name').name = 'diagnosis'; },
  'medical relabel': s => { field(s, c => c.autocomplete === 'name').visibleLabel = 'Medical diagnosis'; },
  'file upload replacing contact': s => { field(s, c => ['email', 'tel'].includes(c.type)).type = 'file'; },
  'private name mandatory': s => { field(s, c => c.autocomplete === 'name').required = true; },
  'private note mandatory': s => { field(s, c => c.tag === 'TEXTAREA').required = true; },
  'private note minimum': s => { field(s, c => c.tag === 'TEXTAREA').min = '20'; },
  'unbounded note': s => { field(s, c => c.tag === 'TEXTAREA').max = null; },
  'name outside disclosure': s => { s.nameContainsOnlyName = false; },
  'note outside disclosure': s => { s.noteContainsOnlyTextarea = false; },
  'name initially open': s => { s.nameClosed = false; },
  'note initially open': s => { s.noteClosed = false; },
  'prechecked consent': s => { field(s, c => c.type === 'checkbox').checked = true; },
  'marketing consent': s => { s.consent = 'Subscribe to advertising'; },
  'missing medical warning': s => { s.privacy = ''; },
  'filled contact': s => { field(s, c => ['email', 'tel'].includes(c.type)).empty = false; },
  'enabled submit': s => { field(s, c => c.type === 'submit').disabled = false; },
  'busy form': s => { s.busy = 'true'; },
  'wrong default country': s => { s.country = 'US'; },
  'honeypot visible to assistive tech': s => { s.honeypotHidden = false; },
  'custom medical editor': s => { s.customControls = 1; },
  'extra optional detail': s => { s.optionalDetails++; },
  'missing optional Google': s => { s.controls.shift(); },
  'Google consent implied': s => { field(s, c => c.type === 'checkbox').required = false; },
  'wrong method caption': s => { s.controls[2].buttonName = 'Continue with Google'; },
  'both alternatives selected': s => { s.controls[1].pressed = s.controls[2].pressed = 'true'; },
};
for (const method of ['email', 'phone']) for (const [name, mutate] of Object.entries(schemaFaults)) test(method + ' exact contact schema rejects ' + name, () => {
  assertPaidFormSnapshot(expectedPaidForm('en', method), 'en', method);
  const snapshot = structuredClone(expectedPaidForm('en', method)); mutate(snapshot);
  assert.throws(() => assertPaidFormSnapshot(snapshot, 'en', method), /Exact blank contact-only enquiry schema/);
});
test('phone schema rejects missing country and email cannot silently include phone countries', () => {
  for (const method of ['email', 'phone']) {
    const nominal = expectedPaidForm('en', method); assertPaidFormSnapshot(nominal, 'en', method);
    const changed = structuredClone(nominal);
    if (method === 'phone') changed.countries.pop(); else changed.countries = expectedPaidForm('en', 'phone').countries;
    assert.throws(() => assertPaidFormSnapshot(changed, 'en', method), /Exact blank contact-only/);
  }
  assert.throws(() => expectedPaidForm('en', 'google'), /Unsupported paid contact method/);
});

function ui(options, fault) {
  const policy = releasePaidPolicy(options), calls = [];
  let choice = 0, open = false, note = false, name = false, method = 'email';
  const handles = [];
  let current = { connected: true };
  const controls = ['session', 'questions', 'free'];
  const loc = (kind, index) => ({
    kind,
    get count() {
      if (kind === 'choices') return fault === 'wrong price group' ? 0 : 3;
      if (kind === 'ambiguous choices') return 5; // Price + compact method buttons; never flatten both groups.
      if (kind === 'methods') return fault === 'extra method button' ? 3 : 2;
      if (kind === 'details') return 2;
      if (kind === 'all fields') return method === 'email' ? 5 : 6;
      if (kind === 'anchors') return fault === 'pre-save messenger' ? 1 : 0;
      if (kind === 'custom' || kind === 'summary children') return 0;
      if (kind === 'chooser') return choice === 2 ? 0 : 1;
      return 1;
    },
    get visible() { return kind === 'form' ? open : kind === 'textarea' ? note : kind === 'name field' ? name : true; },
    async getAttribute(attr) {
      if (kind === 'choice' && attr === 'aria-pressed') return String(choice === index);
      if (kind === 'method' && attr === 'aria-pressed') return String(method === (index === 0 ? 'email' : 'phone'));
      if (kind === 'chooser' && attr === 'data-open') return String(open);
      if (kind === 'trigger' && attr === 'aria-expanded') return String(open);
      if (['choice', 'trigger', 'method'].includes(kind) && attr === 'type') return (fault === 'submit trigger' && kind === 'trigger') || (fault === 'submit method' && kind === 'method') ? 'submit' : 'button';
      if (['choice', 'trigger', 'method'].includes(kind) && attr === 'form') return (fault === 'associated trigger' && kind === 'trigger') || (fault === 'associated method' && kind === 'method') ? 'unexpected-form' : null;
      if (kind === 'method' && attr === 'aria-label' && fault === 'Google substituted') return contactCopy[policy.locale].google;
      if (kind === 'free') return ({ 'data-consultation-action': 'free', href: '/' + policy.locale + '/services/free-situation-review', target: fault === 'external free target' ? '_blank' : null })[attr] ?? null;
      return null;
    },
    async innerText() {
      if (kind === 'method') return fault === 'wrong method caption' ? 'Google' : contactCopy[policy.locale][index === 0 ? 'email' : 'phone'];
      return fault === 'wrong price' ? 'wrong' : copy[policy.locale].serviceOptions[controls[index]];
    },
    nth(index) { assert.ok(['choices', 'methods'].includes(kind)); return loc(kind === 'choices' ? 'choice' : 'method', index); },
    locator(selector) {
      const map = {
        capture: { '[data-choice-layout="service"][role="group"] > button': 'choices', '[role="group"] button': 'ambiguous choices', '[data-contact-channel-chooser]': 'chooser', '[data-consultation-action]': 'free', form: 'form', 'input, textarea, select': 'all fields', '[contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="checkbox"], [role="combobox"]': 'custom' },
        chooser: { 'button[data-contact-order]': 'trigger', form: 'form', 'a, [data-contact-channel]': 'anchors' },
        form: { details: 'details', 'details:has(input[autocomplete="name"])': 'name', 'details:has(textarea)': 'note', 'input[autocomplete="name"]': 'name field', textarea: 'textarea', '[role="group"] > button': 'methods' },
        note: { ':scope > summary': 'note summary' }, name: { ':scope > summary': 'name summary' },
        'note summary': { 'a, button, input, select, textarea': 'summary children' }, 'name summary': { 'a, button, input, select, textarea': 'summary children' },
      };
      assert.ok(map[kind]?.[selector], 'Reviewed UI selector: ' + kind + ' / ' + selector);
      return loc(map[kind][selector]);
    },
    async evaluate(fn) {
      if (kind === 'form') {
        assert.equal(fn, readPaidForm); const snapshot = structuredClone(expectedPaidForm(policy.locale, method));
        snapshot.noteClosed = !note; snapshot.nameClosed = !name;
        if (fault === 'filled form') field(snapshot, c => ['email', 'tel'].includes(c.type)).empty = false;
        if (fault === 'consent after switch' && method === 'phone') field(snapshot, c => c.type === 'checkbox').checked = true;
        return snapshot;
      }
      assert.ok(['choice', 'trigger', 'method'].includes(kind));
      if (kind === 'method') {
        const form = {}, parentElement = { getAttribute: attr => attr === 'role' ? 'group' : null, parentElement: fault === 'foreign method form' ? {} : form };
        return fn({ tagName: 'BUTTON', disabled: fault === 'disabled method', form, parentElement });
      }
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
      if (kind === 'note summary') { note = !note; return; }
      if (kind === 'name summary') { name = !name; return; }
      if (kind === 'method') { if (fault !== 'method not switched') method = index === 0 ? 'email' : 'phone'; return; }
      assert.equal(kind, 'choice', 'Never click Google, submit, free link, or a messenger');
      if (choice !== index) {
        if (fault !== 'form not remounted') current.connected = false;
        current = { connected: true }; open = false; note = false; name = false; method = 'email'; choice = index;
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
  assert.deepEqual(mock.calls.filter(([kind]) => kind === 'method').map(([, index]) => index), [1, 0, 1, 0, 1, 0, 1, 0]);
  assert.ok(mock.calls.every(([kind]) => ['trigger', 'choice', 'name summary', 'note summary', 'method'].includes(kind)));
  assert.ok(mock.handles.every(handle => handle.disposed));
  assert.equal(result.messageSent, false); assert.equal(result.postSaveRuntimeVerified, false); assert.equal(result.preparedMessageRuntimeVerified, false);
});
for (const [fault, error] of [
  ['pre-save messenger', /anchors count/], ['submit trigger', /trigger attribute type/], ['associated trigger', /No form-associated audit click/],
  ['ancestor form', /Only standalone non-submit buttons/], ['wrong price', /Selected paid duration and price/],
  ['filled form', /Exact blank contact-only/], ['form not remounted', /Old form must be detached/], ['external free target', /strictly equal/],
  ['wrong price group', /choices count/], ['extra method button', /methods count/], ['submit method', /method attribute type/],
  ['associated method', /No substituted contact-method action/], ['Google substituted', /No substituted contact-method action/],
  ['foreign method form', /Only direct contact-method buttons/], ['disabled method', /Only direct contact-method buttons/],
  ['wrong method caption', /Exact inert contact alternative/], ['method not switched', /all fields count/], ['consent after switch', /Exact blank contact-only/],
]) test('UI contract rejects ' + fault, async () => {
  const good = ui(base); await verifyPaidEnquiryUi(good.page, good.policy, good.expect);
  const bad = ui(base, fault); await assert.rejects(verifyPaidEnquiryUi(bad.page, bad.policy, bad.expect), error);
  if (['pre-save messenger', 'submit trigger', 'associated trigger', 'ancestor form', 'wrong price', 'filled form', 'wrong price group'].includes(fault)) assert.deepEqual(bad.calls, []);
  if (['extra method button', 'submit method', 'associated method', 'Google substituted', 'foreign method form', 'disabled method', 'wrong method caption'].includes(fault)) assert.equal(bad.calls.some(([kind]) => kind === 'method'), false, 'Reject before the unsafe method click');
});
test('source-bound price group stays separate from compact-method and decoy group buttons', async () => {
  assert.match(source, /data-choice-layout=\{isService \? "service" : "topic"\} role="group"/);
  assert.match(chooserSource, /role="group" aria-label=\{c.replyVia\}/);
  const helper = read('scripts/helpers/release-paid-enquiry-verifier.mjs');
  const start = helper.indexOf('export async function verifyPaidEnquiryUi('), end = helper.indexOf('export async function verifyReleasePaidEnquiry(');
  const body = helper.slice(start, end).replace('export async function', 'async function');
  const changed = body.replace('[data-choice-layout="service"][role="group"] > button', '[role="group"] button');
  assert.notEqual(changed, body);
  const make = text => new Function('assert', 'readPaidForm', 'assertPaidFormSnapshot', 'formCopy', text + '; return verifyPaidEnquiryUi;')(assert, readPaidForm, assertPaidFormSnapshot, contactCopy);
  const good = ui(base); await make(body)(good.page, good.policy, good.expect);
  const bad = ui(base); await assert.rejects(make(changed)(bad.page, bad.policy, bad.expect), /ambiguous choices count/); assert.deepEqual(bad.calls, []);
});

for (const mode of [base, live]) for (const [name, path, method, origin, reason] of [
  ['Google start', '/api/app/auth/start', 'POST', null, 'non-GET'],
  ['authenticated contact profile', '/api/app/auth/contact-profile', 'GET', null, 'unallowlisted public resource'],
  ['Google provider', '/o/oauth2/v2/auth', 'GET', 'https://accounts.google.com', 'external origin'],
]) test(mode.label + ' optional Google never expands the no-submit boundary: ' + name, async () => {
  const policy = releasePaidPolicy(mode), { context } = network(), guard = await installPaidReadOnlyGuard(context, policy);
  assert.deepEqual(await context.send(request(policy)), ['fetch', 'fulfill']);
  const req = request(policy, path, method, 'fetch', origin || policy.origin);
  assert.equal(classifyPaidRequest(policy, req), reason);
  assert.deepEqual(await context.send(req), ['abort']);
  assert.throws(() => guard.assertClean(), method === 'POST' ? /attempted a POST/ : /network boundary violated/);
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
  assert.equal(result.postAttempts, 0); assert.equal(result.blockedRequests, 0); assert.equal(result.intentionallySuppressedPrefetches, 0);
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
const fetchDiagnosticKeys = ['publicFetchDestination', 'nextRouterPrefetch', 'rscQueryKeyCount'];
const fetchFields = row => Object.fromEntries(fetchDiagnosticKeys.filter(key => Object.hasOwn(row, key)).map(key => [key, row[key]]));
const unknownFetch = count => ({ publicFetchDestination: 'unknown', nextRouterPrefetch: 'unavailable', rscQueryKeyCount: count });
function diagnosticFetch(policy, path = '/' + policy.locale + '/services', suffix = '?_rsc=' + DIAGNOSTIC_CANARY, marker = '1') {
  const calls = { named: [], forbidden: 0 };
  const forbidden = () => { calls.forbidden++; throw new Error(DIAGNOSTIC_CANARY); };
  return { calls, req: { ...request(policy, path + suffix, 'GET', 'fetch'),
    async headerValue(name) { calls.named.push(name); return marker; },
    headers: forbidden, allHeaders: forbidden, postData: forbidden } };
}
async function observeDeniedFetch(policy, req) {
  const { context } = network(), guard = await installPaidReadOnlyGuard(context, policy);
  assert.deepEqual(await context.send(request(policy)), ['fetch', 'fulfill']);
  const reason = classifyPaidRequest(policy, req); assert.notEqual(reason, null);
  assert.deepEqual(await context.send(req), ['abort']);
  let diagnostic;
  assert.throws(() => guard.assertClean(), error => {
    assert.match(error.message, /Paid read-only network boundary violated/);
    assert.equal(error.actual.length, 1); diagnostic = error.actual[0]; assert.equal(diagnostic.reason, reason);
    assert.deepEqual(Object.keys(diagnostic), ['reason', ...metadataKeys, ...(req.resourceType() === 'fetch' ? fetchDiagnosticKeys : [])]);
    assert.doesNotMatch(error.message + JSON.stringify(error.actual), new RegExp(DIAGNOSTIC_CANARY, 'i'));
    assert.doesNotMatch(error.message, /https?:\/\/|\/_next\/|\/api\/|\/client\//);
    return true;
  });
  return diagnostic;
}
async function observeSuppressedFetch(policy, req) {
  const { context } = network(), guard = await installPaidReadOnlyGuard(context, policy);
  assert.deepEqual(await context.send(request(policy)), ['fetch', 'fulfill']);
  assert.equal(classifyPaidRequest(policy, req), 'noncanonical URL', 'Classifier must still deny the URL');
  assert.deepEqual(await context.send(req), ['abort'], 'Suppression must never fetch or fulfill a speculative request');
  await guard.settle();
  assert.deepEqual(guard.assertClean(), { postAttempts: 0, blockedRequests: 0, allowedGets: 1, intentionallySuppressedPrefetches: 1 });
}
async function nominalFetchDiagnostic(policy) {
  const { req, calls } = diagnosticFetch(policy);
  await observeSuppressedFetch(policy, req);
  assert.deepEqual(calls, { named: ['next-router-prefetch'], forbidden: 0 });
}
function directLinkProps(text) {
  const ast = ts.createSourceFile('public.tsx', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX), links = [];
  function visit(node) {
    if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && node.tagName.getText(ast) === 'Link') {
      const attrs = node.attributes.properties;
      links.push({ href: attrs.find(a => ts.isJsxAttribute(a) && a.name.text === 'href')?.initializer?.getText(ast),
        prefetch: attrs.find(a => ts.isJsxAttribute(a) && a.name.text === 'prefetch')?.initializer?.getText(ast) });
    }
    ts.forEachChild(node, visit);
  }
  visit(ast); return links;
}
for (const [file, hrefs] of [
  ['components/personal-service-landing.tsx', ['{`/${locale}/services`}', '{`/${locale}/services/free-situation-review`}', '{`/${locale}/services/free-situation-review`}']],
  ['components/public-site-header.tsx', ['{locale === "es" ? "/es" : "/"}']],
  ['components/commerce/cart-nav-link.tsx', ['{`/${locale}/cart`}']],
]) test('finite fetch destinations bind to actual public Link source: ' + file, () => {
  const text = read(file), expected = hrefs.map(href => ({ href, prefetch: undefined }));
  assert.deepEqual(directLinkProps(text), expected);
  assert.notDeepEqual(directLinkProps(text.replace('href=', 'prefetch={false} href=')), expected);
  assert.notDeepEqual(directLinkProps(text.replaceAll('<Link', '<a').replaceAll('</Link>', '</a>')), expected);
});

for (const mode of [base, live]) for (const locale of ['en', 'ru', 'es']) for (const destination of ['home', 'services', 'free-review', 'cart']) {
  test(`${mode.label}/${locale} finite ${destination} fetch is aborted without upstream permission`, async () => {
    const policy = releasePaidPolicy({ ...mode, locale }); await nominalFetchDiagnostic(policy);
    const path = destination === 'home' ? locale === 'es' ? '/es' : '/' : '/' + locale + '/' + (destination === 'free-review' ? 'services/free-situation-review' : destination);
    const { req, calls } = diagnosticFetch(policy, path);
    await observeSuppressedFetch(policy, req);
    const projected = await deniedPaidFetchMetadata(policy, diagnosticFetch(policy, path).req);
    assert.deepEqual(projected, { publicFetchDestination: destination, nextRouterPrefetch: 'one', rscQueryKeyCount: 1 });
    assert.deepEqual(calls, { named: ['next-router-prefetch'], forbidden: 0 });
    assert.equal(classifyPaidRequest(policy, req), 'noncanonical URL');
  });
}
const fetchPathFaults = [
  ['private', p => '/en/client/records'], ['API', p => '/api/service-enquiries'], ['admin', p => '/admin/clients'],
  ['unknown public', p => '/en/unknown'], ['cross-locale Services', p => '/ru/services'],
  ['cross-locale free review', p => '/ru/services/free-situation-review'], ['cross-locale cart', p => '/ru/cart'],
  ['unlinked Russian Home', p => '/ru'], ['unlinked English Home', p => '/en'],
  ['cart prefix', p => '/en/cart/extra'], ['cart lookalike', p => '/en/cartoon'],
  ['wrong case', p => p.replace('services', 'Services')], ['trailing slash', p => p + '/'],
  ['encoded path', p => p.replace('services', '%73ervices')], ['dot normalization', p => '/en/x/../services'],
  ['backslash', p => '/en\\services'], ['double slash', p => '/en//services'], ['secret path', p => '/' + DIAGNOSTIC_CANARY],
];
for (const mode of [base, live]) for (const [name, mutate] of fetchPathFaults) test(`${mode.label} unknown ${name} fetch does not read headers after nominal`, async () => {
  const policy = releasePaidPolicy(mode); await nominalFetchDiagnostic(policy);
  const { req, calls } = diagnosticFetch(policy, mutate('/en/services'));
  req.headerValue = () => { calls.named.push('FORBIDDEN'); throw new Error(DIAGNOSTIC_CANARY); };
  const row = await observeDeniedFetch(policy, req);
  assert.deepEqual(fetchFields(row), unknownFetch(1)); assert.deepEqual(calls, { named: [], forbidden: 0 });
});
const fetchSuffixFaults = [
  ['unknown key', '?_rsc=' + DIAGNOSTIC_CANARY + '&private=' + DIAGNOSTIC_CANARY, 1],
  ['known non-RSC key', '?_rsc=x&v=' + DIAGNOSTIC_CANARY, 1],
  ['case key', '?_RSC=' + DIAGNOSTIC_CANARY, 0], ['encoded key', '?%5Frsc=' + DIAGNOSTIC_CANARY, 1],
  ['no key', '', 0], ['bare query', '?', 0], ['fragment', '?_rsc=x#' + DIAGNOSTIC_CANARY, 1],
  ['bare fragment', '?_rsc=x#', 1], ['percent value', '?_rsc=%41', 1], ['backslash value', '?_rsc=\\hidden', 1],
];
for (const [name, suffix, count] of fetchSuffixFaults) test('unsafe fetch query shape ' + name + ' remains unknown/fatal after nominal', async () => {
  const policy = releasePaidPolicy(base); await nominalFetchDiagnostic(policy);
  const { req, calls } = diagnosticFetch(policy, '/en/services', suffix);
  const row = await observeDeniedFetch(policy, req); assert.deepEqual(fetchFields(row), unknownFetch(count));
  assert.deepEqual(calls, { named: [], forbidden: 0 });
});
for (const destination of ['services', 'cart']) for (const [name, marker, expected] of [['absent', null, 'absent'], ['one', '1', 'one'], ['other', DIAGNOSTIC_CANARY, 'other'], ['unsupported', undefined, 'unavailable'], ['number', 1, 'unavailable']]) {
  test(destination + ' named prefetch marker projects only enum ' + name + ' and still aborts', async () => {
    const policy = releasePaidPolicy(base); await nominalFetchDiagnostic(policy);
    const { req, calls } = diagnosticFetch(policy, '/en/' + destination, '?_rsc=' + DIAGNOSTIC_CANARY, marker);
    if (name === 'unsupported') req.headerValue = async key => { calls.named.push(key); return undefined; };
    if (expected === 'one') await observeSuppressedFetch(policy, req);
    else {
      const row = await observeDeniedFetch(policy, req);
      assert.deepEqual(fetchFields(row), { publicFetchDestination: destination, nextRouterPrefetch: expected, rscQueryKeyCount: 1 });
    }
    assert.deepEqual(calls, { named: ['next-router-prefetch'], forbidden: 0 });
  });
}
test('duplicate RSC keys are counted with a cap without exposing values or authorization', async () => {
  const policy = releasePaidPolicy(base); await nominalFetchDiagnostic(policy);
  for (const count of [2, 101]) {
    const { req } = diagnosticFetch(policy, '/en/services', '?' + Array.from({ length: count }, () => '_rsc=' + DIAGNOSTIC_CANARY).join('&'));
    const row = await observeDeniedFetch(policy, req);
    assert.deepEqual(fetchFields(row), { publicFetchDestination: 'services', nextRouterPrefetch: 'one', rscQueryKeyCount: Math.min(100, count) });
  }
});
for (const [name, modify, expected = unknownFetch(1)] of [
  ['HEAD', req => ({ ...req, method: () => 'HEAD' })],
  ['navigation', req => ({ ...req, isNavigationRequest: () => true })],
  ['missing navigation value', req => ({ ...req, isNavigationRequest: () => undefined })],
  ['missing navigation method', req => { const next = { ...req }; delete next.isNavigationRequest; return next; }],
  ['throwing navigation method', req => ({ ...req, isNavigationRequest: () => { throw new Error(DIAGNOSTIC_CANARY); } })],
  ['external', req => ({ ...req, url: () => req.url().replace(base.origin, 'https://example.invalid') })],
  ['userinfo', req => ({ ...req, url: () => req.url().replace('://', '://' + DIAGNOSTIC_CANARY + '@') })],
  ['wrong type', req => ({ ...req, resourceType: () => 'script' }), {}],
  ['malformed URL', req => ({ ...req, url: () => DIAGNOSTIC_CANARY }), unknownFetch(0)],
]) test('ineligible fetch metadata ' + name + ' never reads named or bulk headers', async () => {
  const policy = releasePaidPolicy(base); await nominalFetchDiagnostic(policy);
  const { req, calls } = diagnosticFetch(policy); const row = await observeDeniedFetch(policy, modify(req));
  assert.deepEqual(fetchFields(row), expected); assert.deepEqual(calls, { named: [], forbidden: 0 });
});

test('POST fetch remains aborted and fails the original POST assertion without header reads', async () => {
  const policy = releasePaidPolicy(base); await nominalFetchDiagnostic(policy);
  const { req, calls } = diagnosticFetch(policy); req.method = () => 'POST';
  assert.deepEqual(await deniedPaidFetchMetadata(policy, req), unknownFetch(1));
  const { context } = network(), guard = await installPaidReadOnlyGuard(context, policy);
  assert.deepEqual(await context.send(request(policy)), ['fetch', 'fulfill']);
  assert.deepEqual(await context.send(req), ['abort']);
  assert.throws(() => guard.assertClean(), /Paid read-only audit attempted a POST/);
  assert.deepEqual(calls, { named: [], forbidden: 0 });
});

for (const destination of ['services', 'cart']) for (const fault of ['missing', 'throwing', 'rejected', 'hanging', 'late rejection']) test(destination + ' bounded named-header ' + fault + ' preserves abort/fatal and cleans timer', async t => {
  const policy = releasePaidPolicy(base); await nominalFetchDiagnostic(policy);
  const { req } = diagnosticFetch(policy, '/en/' + destination); let lateReject;
  if (fault === 'missing') delete req.headerValue;
  else if (fault === 'throwing') req.headerValue = () => { throw new Error(DIAGNOSTIC_CANARY); };
  else if (fault === 'rejected') req.headerValue = () => Promise.reject(new Error(DIAGNOSTIC_CANARY));
  else req.headerValue = () => new Promise((resolve, reject) => { lateReject = reject; });
  const originalSet = globalThis.setTimeout, originalClear = globalThis.clearTimeout;
  const pending = new Set(); let scheduled = 0, cleared = 0;
  t.mock.method(globalThis, 'setTimeout', (fn, ms, ...args) => {
    assert.equal(ms, 250); scheduled++;
    const timer = originalSet(() => { pending.delete(timer); fn(...args); }, ms); pending.add(timer); return timer;
  });
  t.mock.method(globalThis, 'clearTimeout', timer => { cleared++; pending.delete(timer); return originalClear(timer); });
  const unhandled = []; const onUnhandled = error => unhandled.push(error); process.on('unhandledRejection', onUnhandled);
  try {
    const row = await observeDeniedFetch(policy, req);
    assert.deepEqual(fetchFields(row), { publicFetchDestination: destination, nextRouterPrefetch: 'unavailable', rscQueryKeyCount: 1 });
    if (fault === 'late rejection') { lateReject(new Error(DIAGNOSTIC_CANARY)); await new Promise(resolve => setImmediate(resolve)); }
    assert.equal(scheduled, 1); assert.equal(cleared, 1); assert.equal(pending.size, 0); assert.deepEqual(unhandled, []);
  } finally { process.removeListener('unhandledRejection', onUnhandled); t.mock.restoreAll(); }
});

test('successful named-header suppression clears timer and performs no upstream fetch', async t => {
  const policy = releasePaidPolicy(base); await nominalFetchDiagnostic(policy); const { req } = diagnosticFetch(policy);
  const originalSet = globalThis.setTimeout, originalClear = globalThis.clearTimeout; const pending = new Set(); let scheduled = 0, cleared = 0;
  t.mock.method(globalThis, 'setTimeout', (fn, ms) => { assert.equal(ms, 250); scheduled++; const timer = originalSet(fn, ms); pending.add(timer); return timer; });
  t.mock.method(globalThis, 'clearTimeout', timer => { cleared++; pending.delete(timer); return originalClear(timer); });
  try { await observeSuppressedFetch(policy, req); assert.equal(scheduled, 1); assert.equal(cleared, 1); assert.equal(pending.size, 0); }
  finally { t.mock.restoreAll(); }
});

for (const mode of [base, live]) test(mode.label + ' suppression counts attempts separately from successful GETs', async () => {
  const policy = releasePaidPolicy(mode); await nominalFetchDiagnostic(policy);
  const { context } = network(), guard = await installPaidReadOnlyGuard(context, policy);
  assert.deepEqual(await context.send(request(policy)), ['fetch', 'fulfill']);
  const { req, calls } = diagnosticFetch(policy);
  for (let i = 1; i <= 3; i++) {
    assert.deepEqual(await context.send(req), ['abort']);
    assert.deepEqual(guard.assertClean(), { postAttempts: 0, blockedRequests: 0, allowedGets: 1, intentionallySuppressedPrefetches: i });
  }
  assert.deepEqual(calls, { named: Array(3).fill('next-router-prefetch'), forbidden: 0 });
  assert.deepEqual(await context.send(request(policy, '/_next/static/chunks/app.js', 'GET', 'script')), ['fetch', 'fulfill']);
  assert.deepEqual(guard.assertClean(), { postAttempts: 0, blockedRequests: 0, allowedGets: 2, intentionallySuppressedPrefetches: 3 });
});

for (const suffix of ['?_rsc', '?_rsc=', '?_rsc=x&', '?&_rsc=x', '?_rsc=x&&', '?_rsc=x&=', '?_rsc=x&_rsc=']) {
  test('ambiguous single-field query stays fatal after nominal: ' + suffix, async () => {
    const policy = releasePaidPolicy(base); await nominalFetchDiagnostic(policy);
    const { req } = diagnosticFetch(policy, '/en/services', suffix);
    const row = await observeDeniedFetch(policy, req);
    assert.equal(row.reason, 'noncanonical URL');
  });
}

const cartQueryFaults = [
  ['bare key', '?_rsc'], ['empty value', '?_rsc='], ['bare query', '?'], ['missing query', ''],
  ['trailing delimiter', '?_rsc=x&'], ['leading delimiter', '?&_rsc=x'], ['empty extra fields', '?_rsc=x&&'],
  ['empty extra key', '?_rsc=x&='], ['duplicate key', '?_rsc=x&_rsc=y'], ['duplicate empty key', '?_rsc=x&_rsc='],
  ['unknown key', '?_rsc=x&private=' + DIAGNOSTIC_CANARY], ['known other key', '?_rsc=x&v=1'],
  ['case key', '?_RSC=x'], ['encoded key', '?%5Frsc=x'], ['percent value', '?_rsc=%41'],
  ['backslash value', '?_rsc=\\hidden'], ['fragment', '?_rsc=x#' + DIAGNOSTIC_CANARY], ['bare fragment', '?_rsc=x#'],
];
for (const mode of [base, live]) for (const [name, suffix] of cartQueryFaults) test(`${mode.label} cart ${name} remains fatal without reading a header after nominal`, async () => {
  const policy = releasePaidPolicy(mode);
  await observeSuppressedFetch(policy, diagnosticFetch(policy, '/en/cart').req);
  const { req, calls } = diagnosticFetch(policy, '/en/cart', suffix);
  req.headerValue = () => { calls.named.push('FORBIDDEN'); throw new Error(DIAGNOSTIC_CANARY); };
  await observeDeniedFetch(policy, req);
  assert.deepEqual(calls, { named: [], forbidden: 0 });
});
const cartRequestFaults = [
  ['cart state subpath', req => ({ ...req, url: () => base.origin + '/en/cart/state?_rsc=x' })],
  ['cross locale', req => ({ ...req, url: () => base.origin + '/ru/cart?_rsc=x' })],
  ['cart lookalike', req => ({ ...req, url: () => base.origin + '/en/cartoon?_rsc=x' })],
  ['private route', req => ({ ...req, url: () => base.origin + '/en/client/records?_rsc=x' })],
  ['cart API', req => ({ ...req, url: () => base.origin + '/api/cart?_rsc=x' })],
  ['HEAD', req => ({ ...req, method: () => 'HEAD' })],
  ['fetch navigation', req => ({ ...req, isNavigationRequest: () => true })],
  ['unknown navigation', req => ({ ...req, isNavigationRequest: () => undefined })],
  ['document', req => ({ ...req, resourceType: () => 'document', isNavigationRequest: () => true })],
  ['wrong resource', req => ({ ...req, resourceType: () => 'script' })],
  ['external', req => ({ ...req, url: () => 'https://example.invalid/en/cart?_rsc=x' })],
  ['userinfo', req => ({ ...req, url: () => 'http://' + DIAGNOSTIC_CANARY + '@127.0.0.1:3123/en/cart?_rsc=x' })],
];
for (const [name, mutate] of cartRequestFaults) test('cart ' + name + ' remains fatal without named or bulk header access after nominal', async () => {
  const policy = releasePaidPolicy(base);
  await observeSuppressedFetch(policy, diagnosticFetch(policy, '/en/cart').req);
  const { req, calls } = diagnosticFetch(policy, '/en/cart');
  await observeDeniedFetch(policy, mutate(req));
  assert.deepEqual(calls, { named: [], forbidden: 0 });
});
test('cart POST remains fatal without reading the prefetch marker after nominal', async () => {
  const policy = releasePaidPolicy(base);
  await observeSuppressedFetch(policy, diagnosticFetch(policy, '/en/cart').req);
  const { req, calls } = diagnosticFetch(policy, '/en/cart'); req.method = () => 'POST';
  const { context } = network(), guard = await installPaidReadOnlyGuard(context, policy);
  assert.deepEqual(await context.send(req), ['abort']);
  assert.throws(() => guard.assertClean(), /Paid read-only audit attempted a POST/);
  assert.deepEqual(calls, { named: [], forbidden: 0 });
});
test('cart URL reread failure cannot suppress the original denial after nominal', async () => {
  const policy = releasePaidPolicy(base);
  await observeSuppressedFetch(policy, diagnosticFetch(policy, '/en/cart').req);
  const { req, calls } = diagnosticFetch(policy, '/en/cart'); const raw = req.url(); let failed = false;
  req.url = () => { if (failed) throw new Error(DIAGNOSTIC_CANARY); return raw; };
  req.headerValue = async name => { calls.named.push(name); failed = true; return '1'; };
  const row = await observeDeniedFetch(policy, req);
  assert.equal(row.reason, 'noncanonical URL');
  assert.equal(row.nextRouterPrefetch, 'one');
  assert.deepEqual(calls, { named: ['next-router-prefetch'], forbidden: 0 });
});

const afterSuppressionFaults = [
  ['cart without speculative marker', p => diagnosticFetch(p, '/en/cart', '?_rsc=x', null).req],
  ['private', p => diagnosticFetch(p, '/en/client/records').req],
  ['required normal RSC navigation without AUTO marker', p => diagnosticFetch(p, '/en/services', '?_rsc=x', null).req],
  ['document navigation', p => request(p, '/en/services?_rsc=x', 'GET', 'document')],
  ['fetch navigation', p => ({ ...diagnosticFetch(p).req, isNavigationRequest: () => true })],
  ['POST action', p => ({ ...diagnosticFetch(p).req, method: () => 'POST' })],
  ['HEAD', p => ({ ...diagnosticFetch(p).req, method: () => 'HEAD' })],
  ['duplicate key', p => diagnosticFetch(p, '/en/services', '?_rsc=x&_rsc=y').req],
  ['other marker', p => diagnosticFetch(p, '/en/services', '?_rsc=x', DIAGNOSTIC_CANARY).req],
  ['external', p => ({ ...diagnosticFetch(p).req, url: () => 'https://example.invalid/en/services?_rsc=x' })],
];
for (const mode of [base, live]) for (const suppressed of ['services', 'cart']) for (const [name, make] of afterSuppressionFaults) test(`${mode.label} ${suppressed} suppression cannot hide later ${name}`, async () => {
  const policy = releasePaidPolicy(mode); await nominalFetchDiagnostic(policy);
  const { context } = network(), guard = await installPaidReadOnlyGuard(context, policy);
  assert.deepEqual(await context.send(request(policy)), ['fetch', 'fulfill']);
  assert.deepEqual(await context.send(diagnosticFetch(policy, '/en/' + suppressed).req), ['abort']);
  assert.deepEqual(guard.assertClean(), { postAttempts: 0, blockedRequests: 0, allowedGets: 1, intentionallySuppressedPrefetches: 1 });
  const req = make(policy); assert.deepEqual(await context.send(req), ['abort']);
  assert.throws(() => guard.assertClean(), error => {
    assert.match(error.message, name === 'POST action' ? /attempted a POST/ : /network boundary violated/);
    if (name !== 'POST action') { assert.equal(error.actual.length, 1); assert.equal(error.actual[0].reason, classifyPaidRequest(policy, req)); }
    assert.doesNotMatch(error.message + JSON.stringify(error.actual), new RegExp(DIAGNOSTIC_CANARY));
    return true;
  });
});

test('original non-GET denial cannot be suppressed by later eligible metadata', async () => {
  const policy = releasePaidPolicy(base); await nominalFetchDiagnostic(policy);
  const { context } = network(), guard = await installPaidReadOnlyGuard(context, policy);
  assert.deepEqual(await context.send(request(policy)), ['fetch', 'fulfill']);
  const { req } = diagnosticFetch(policy); let reads = 0;
  req.method = () => ++reads === 2 ? 'HEAD' : 'GET';
  assert.deepEqual(await context.send(req), ['abort']);
  assert.throws(() => guard.assertClean(), error => {
    assert.match(error.message, /network boundary violated/); assert.equal(error.actual.length, 1);
    assert.equal(error.actual[0].reason, 'non-GET');
    assert.deepEqual(fetchFields(error.actual[0]), { publicFetchDestination: 'services', nextRouterPrefetch: 'one', rscQueryKeyCount: 1 });
    return true;
  });
});

async function wrapperWithSuppressedPrefetch(mode, fault, destination = 'services') {
  const mock = ui(mode, fault), { context } = network(); let closed = false;
  context.newPage = async () => {
    mock.page.goto = async href => {
      mock.page.url = href;
      assert.deepEqual(await context.send(request(mock.policy)), ['fetch', 'fulfill']);
      assert.deepEqual(await context.send(diagnosticFetch(mock.policy, '/en/' + destination).req), ['abort']);
      return { status: () => 200 };
    };
    return mock.page;
  };
  context.close = async () => { closed = true; };
  try {
    const result = await verifyReleasePaidEnquiry({ newContext: async () => context }, mode, mock.expect);
    assert.deepEqual(mock.calls.filter(([kind]) => kind === 'choice').map(([, index]) => index), [1, 2, 0]);
    assert.equal(result.intentionallySuppressedPrefetches, 1); assert.equal(result.allowedGets, 1);
    assert.equal(result.postAttempts, 0); assert.equal(result.blockedRequests, 0);
    assert.equal(result.messageSent, false); assert.equal(result.postSaveRuntimeVerified, false);
    return result;
  } finally { assert.equal(closed, true); }
}
for (const mode of [base, live]) for (const destination of ['services', 'cart']) test(mode.label + ' full no-submit UI contract retains separate ' + destination + ' suppression count', async () => {
  await wrapperWithSuppressedPrefetch(mode, undefined, destination);
});
for (const [fault, error] of [
  ['pre-save messenger', /anchors count/], ['submit trigger', /trigger attribute type/], ['associated trigger', /No form-associated audit click/],
  ['ancestor form', /Only standalone non-submit buttons/], ['wrong price', /Selected paid duration and price/],
  ['filled form', /Exact blank contact-only/], ['form not remounted', /Old form must be detached/], ['external free target', /strictly equal/],
]) test('suppressed prefetch cannot hide required UI failure: ' + fault, async () => {
  await wrapperWithSuppressedPrefetch(base);
  await assert.rejects(wrapperWithSuppressedPrefetch(base, fault), error);
});
const metadataKeys = ['resourceType', 'sameOrigin', 'pathClass', 'knownQueryKeys', 'unknownQueryKeyCount', 'hasPercent', 'hasBackslash', 'hasHash', 'hasUserinfo', 'publicScriptRoute', 'publicScriptBrackets'];
test('denied metadata reports only approved schema and never makes a query allowable', () => {
  const policy = releasePaidPolicy(base);
  const req = request(policy, '/_next/static/chunks/app/%5Blocale%5D/page.js?_rsc=' + DIAGNOSTIC_CANARY + '&v=' + DIAGNOSTIC_CANARY + '&dpl=' + DIAGNOSTIC_CANARY + '&' + DIAGNOSTIC_CANARY + '=hidden', 'GET', 'script');
  assert.equal(classifyPaidRequest(policy, req), 'noncanonical URL');
  const metadata = deniedPaidRequestMetadata(policy, req);
  assert.deepEqual(Object.keys(metadata), metadataKeys);
  assert.deepEqual(metadata, { resourceType: 'script', sameOrigin: true, pathClass: 'next-static', knownQueryKeys: ['_rsc', 'v', 'dpl'], unknownQueryKeyCount: 1, hasPercent: true, hasBackslash: false, hasHash: false, hasUserinfo: false, publicScriptRoute: 'unknown', publicScriptBrackets: 'unknown' });
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

// This is an explicit reviewed permission addition, not a diagnostic inference.
// Derive the synthetic filename from the actual Russian-only Home page file.
const homeRouteFile = 'app/[locale]/page.tsx';
const homeChunkPath = hash => '/_next/static/chunks/' + homeRouteFile.replace(/\.tsx$/, '').split('/').map(encodeURIComponent).join('/') + '-' + hash + '.js';
const nominalHomeChunk = homeChunkPath('0123456789abcdef');
function assertHomePageBinding(text) {
  assert.match(text, /export function generateStaticParams\(\) \{ return \[\{ locale: "ru" \}\]; \}/, 'Home static params are Russian-only');
  assert.match(text, /export default async function RussianHomePage\(/, 'Exact physical dynamic Home page');
  assert.match(text, /if \(\(await params\)\.locale !== "ru"\) notFound\(\);/, 'Home rejects unsupported locale');
  assert.match(text, /<HolisticHouseHome\s+locale="ru"/, 'Home renderer and locale');
}
test('Home exception stays bound to the actual Russian-only physical page', () => {
  const text = read(homeRouteFile); assertHomePageBinding(text);
  for (const [from, to, reason] of [
    ['return [{ locale: "ru" }]', 'return [{ locale: "en" }]', /Home static params/],
    ['function RussianHomePage(', 'function OtherPage(', /Exact physical/],
    ['if ((await params).locale !== "ru") notFound();', '', /Home rejects/],
    ['<HolisticHouseHome', '<OtherHome', /Home renderer/],
  ]) {
    assertHomePageBinding(text);
    assert.throws(() => assertHomePageBinding(text.replace(from, to)), reason);
  }
  assertHomePageBinding(text);
  assert.throws(() => assertHomePageBinding(''), /Home static params/);
});

for (const mode of [base, live]) for (const locale of ['en', 'ru', 'es']) for (const width of [390, 1365]) {
  test(`${mode.label}/${locale}/${width} permits only canonical source-bound Home script via actual guard`, async () => {
    const policy = releasePaidPolicy({ ...mode, locale, width }), { context } = network();
    const guard = await installPaidReadOnlyGuard(context, policy);
    for (const hash of ['0123456789abcdef', 'fedcba9876543210']) {
      const req = { ...request(policy, homeChunkPath(hash), 'GET', 'script'),
        headers() { throw new Error(DIAGNOSTIC_CANARY); }, postData() { throw new Error(DIAGNOSTIC_CANARY); } };
      assert.equal(classifyPaidRequest(policy, req), null);
      assert.deepEqual(await context.send(req), ['fetch', 'fulfill']);
    }
    assert.deepEqual(guard.assertClean(), { postAttempts: 0, blockedRequests: 0, allowedGets: 2, intentionallySuppressedPrefetches: 0 });
  });
}
const homeChunkFaults = [
  ['encoded Services index', p => p.replace('/page-', '/services/page-')],
  ['encoded free review', p => p.replace('/page-', '/services/free-situation-review/page-')],
  ['encoded private route', p => p.replace('/page-', '/client/records/page-')],
  ['encoded admin route', p => p.replace('/page-', '/admin/clients/page-')],
  ['unknown encoded route', p => p.replace('/page-', '/other/page-')],
  ['secret route', p => p.replace('/page-', '/' + DIAGNOSTIC_CANARY + '/page-')],
  ['unproved layout', p => p.replace('/page-', '/layout-')],
  ['lowercase encoding', p => p.replace('%5Blocale%5D', '%5blocale%5d')],
  ['mixed encoding', p => p.replace('%5D', '%5d')],
  ['literal brackets', p => p.replace('%5Blocale%5D', '[locale]'), 'unallowlisted public resource'],
  ['double encoding', p => p.replaceAll('%5', '%255')],
  ['encoded letter', p => p.replace('locale', '%6Cocale')],
  ['different dynamic parameter', p => p.replace('locale', 'language')],
  ['catch-all parameter', p => p.replace('locale', '...locale')],
  ['encoded slash', p => p.replace('/page-', '%2Fpage-')],
  ['literal traversal', p => p.replace('/page-', '/extra/../page-')],
  ['encoded traversal', p => p.replace('/page-', '/%2e%2e/page-')],
  ['backslash', p => p.replace('/page-', '\\page-')],
  ['wrong static root', p => p.replace('/_next/static/', '/other/static/')],
  ['double slash', p => p.replace('/chunks/', '/chunks//')],
  ['short hash', p => p.replace('0123456789abcdef', '0123456789abcde')],
  ['long hash', p => p.replace('0123456789abcdef', '0123456789abcdef0')],
  ['uppercase hash', p => p.replace('abcdef', 'ABCDEF')],
  ['nonhex hash', p => p.replace('abcdef', 'ghijkl')],
  ['empty hash', p => p.replace('0123456789abcdef', '')],
  ['secret hash', p => p.replace('0123456789abcdef', DIAGNOSTIC_CANARY)],
  ['dotted filename', p => p.replace('page-', 'page.')],
  ['wrong extension', p => p.replace('.js', '.css')],
  ['source map', p => p + '.map'],
  ['trailing segment', p => p + '/extra'],
  ['trailing newline', p => p + '\n'],
  ['trailing carriage return', p => p + '\r'],
  ['trailing tab', p => p + '\t'],
  ['trailing space', p => p + ' '],
  ['bare query', p => p + '?'],
  ['version query', p => p + '?v=' + DIAGNOSTIC_CANARY],
  ['deployment query', p => p + '?dpl=' + DIAGNOSTIC_CANARY],
  ['prefetch query', p => p + '?_rsc=' + DIAGNOSTIC_CANARY],
  ['unknown query', p => p + '?' + DIAGNOSTIC_CANARY + '=hidden'],
  ['bare fragment', p => p + '#'],
  ['secret fragment', p => p + '#' + DIAGNOSTIC_CANARY],
];
for (const mode of [base, live]) for (const [name, mutate, reason = 'noncanonical URL'] of homeChunkFaults) {
  test(`${mode.label} Home exception rejects ${name} after actual guard nominal`, async () => {
    const policy = releasePaidPolicy(mode), { context } = network(), guard = await installPaidReadOnlyGuard(context, policy);
    assert.deepEqual(await context.send(request(policy, nominalHomeChunk, 'GET', 'script')), ['fetch', 'fulfill']);
    const req = request(policy, mutate(nominalHomeChunk), 'GET', 'script');
    assert.equal(classifyPaidRequest(policy, req), reason);
    assert.deepEqual(await context.send(req), ['abort']);
    assert.throws(() => guard.assertClean(), error => {
      assert.match(error.message, /Paid read-only network boundary violated/);
      assert.equal(error.actual.length, 1); assert.equal(error.actual[0].reason, reason);
      assert.doesNotMatch(error.message + JSON.stringify(error.actual), new RegExp(DIAGNOSTIC_CANARY, 'i'));
      assert.doesNotMatch(error.message, /https?:\/\/|\/_next\/|client\/|admin\//);
      return true;
    });
  });
}
const homeRequestFaults = [
  ['POST', req => ({ ...req, method: () => 'POST' }), 'non-GET'],
  ['HEAD', req => ({ ...req, method: () => 'HEAD' }), 'non-GET'],
  ['fetch resource', req => ({ ...req, resourceType: () => 'fetch' })],
  ['document resource', req => ({ ...req, resourceType: () => 'document' })],
  ['image resource', req => ({ ...req, resourceType: () => 'image' })],
  ['script navigation', req => ({ ...req, isNavigationRequest: () => true })],
  ['missing navigation value', req => ({ ...req, isNavigationRequest: () => undefined })],
  ['null navigation value', req => ({ ...req, isNavigationRequest: () => null })],
  ['zero navigation value', req => ({ ...req, isNavigationRequest: () => 0 })],
  ['foreign host', req => ({ ...req, url: () => req.url().replace(/https?:\/\/[^/]+/, 'https://example.invalid') })],
  ['wrong scheme', req => ({ ...req, url: () => req.url().replace(/^https?/, 'ftp') })],
  ['userinfo', req => ({ ...req, url: () => req.url().replace('://', '://' + DIAGNOSTIC_CANARY + ':hidden@') })],
  ['extra port', req => ({ ...req, url: () => req.url().replace('/_next/', ':3000/_next/') }), 'malformed URL'],
  ['malformed URL', req => ({ ...req, url: () => DIAGNOSTIC_CANARY }), 'malformed URL'],
];
for (const mode of [base, live]) for (const [name, mutate, declaredReason = 'noncanonical URL'] of homeRequestFaults) {
  test(`${mode.label} Home exception rejects ${name} request after nominal`, async () => {
    const policy = releasePaidPolicy(mode), { context } = network(), guard = await installPaidReadOnlyGuard(context, policy);
    const nominal = request(policy, nominalHomeChunk, 'GET', 'script');
    assert.deepEqual(await context.send(nominal), ['fetch', 'fulfill']);
    const req = mutate(nominal);
    const reason = name === 'extra port' && mode.label === 'live' ? 'noncanonical URL' : declaredReason;
    assert.equal(classifyPaidRequest(policy, req), reason);
    assert.deepEqual(await context.send(req), ['abort']);
    assert.throws(() => guard.assertClean(), error => {
      assert.match(error.message, name === 'POST' ? /attempted a POST/ : /network boundary violated/);
      if (name !== 'POST') { assert.equal(error.actual.length, 1); assert.equal(error.actual[0].reason, reason); }
      assert.doesNotMatch(error.message + JSON.stringify(error.actual), new RegExp(DIAGNOSTIC_CANARY, 'i'));
      return true;
    });
  });
}

test('Home permission does not bypass redirect failure after nominal', async () => {
  const policy = releasePaidPolicy(base), { context } = network(), guard = await installPaidReadOnlyGuard(context, policy);
  const req = request(policy, nominalHomeChunk, 'GET', 'script');
  assert.deepEqual(await context.send(req), ['fetch', 'fulfill']);
  assert.deepEqual(await context.send(req, { status: 302 }), ['fetch', 'abort']);
  assert.throws(() => guard.assertClean(), error => error.actual.length === 1 && error.actual[0] === 'redirect');
});

for (const mode of [base, live]) for (const method of ['isNavigationRequest', 'resourceType']) for (const fault of ['missing', 'throwing']) {
  test(`${mode.label} Home ${fault} ${method} retains original guard abort/fatal after nominal`, async () => {
    const policy = releasePaidPolicy(mode), { context } = network(), guard = await installPaidReadOnlyGuard(context, policy);
    const req = request(policy, nominalHomeChunk, 'GET', 'script');
    assert.deepEqual(await context.send(req), ['fetch', 'fulfill']);
    const broken = { ...req };
    if (fault === 'missing') delete broken[method];
    else broken[method] = () => { throw new Error(DIAGNOSTIC_CANARY); };
    assert.deepEqual(await context.send(broken), ['abort']);
    assert.equal(classifyPaidRequest(policy, broken), 'noncanonical URL');
    assert.throws(() => guard.assertClean(), error => {
      assert.match(error.message, /Paid read-only network boundary violated/);
      assert.deepEqual(error.actual, ['noncanonical URL']);
      assert.doesNotMatch(error.message, new RegExp(DIAGNOSTIC_CANARY));
      return true;
    });
  });
}

test('Home permission does not bypass failed GET after nominal', async () => {
  const policy = releasePaidPolicy(base), { context } = network(), guard = await installPaidReadOnlyGuard(context, policy);
  const req = request(policy, nominalHomeChunk, 'GET', 'script');
  assert.deepEqual(await context.send(req), ['fetch', 'fulfill']);
  assert.deepEqual(await context.send(req, { fail: true }), ['fetch', 'abort']);
  assert.throws(() => guard.assertClean(), error => error.actual.length === 1 && error.actual[0] === 'allowlisted GET failed');
});

// Only these current physical page files may receive a public diagnostic label.
// This is not evidence that a request came from prefetch or from this build.
const publicScriptSources = [
  ['app/page.tsx', 'home', 'HomePage', 'locale="en"'],
  ['app/[locale]/page.tsx', 'home', 'RussianHomePage', 'if ((await params).locale !== "ru") notFound();'],
  ['app/es/page.tsx', 'home', 'SpanishHomePage', 'lang="es"'],
  ['app/[locale]/services/page.tsx', 'services', 'ServicesPage', '<ServicesConversionHero locale={locale as Locale} />'],
  ['app/es/services/page.tsx', 'services', 'SpanishServicesPage', '<ServicesConversionHero locale="es" />'],
  ['app/[locale]/services/free-situation-review/page.tsx', 'free-review', 'FreeSituationReviewPage', 'return <FreeEntryLanding locale={locale} kind="situation" />;'],
  ['app/[locale]/services/imagery-therapy/page.tsx', 'imagery', 'ServicePage', 'return <PersonalServiceLanding locale={locale as ServicePageLocale} service={service} />;'],
];
function assertPublicScriptSource(text, name, marker) {
  const ast = ts.createSourceFile('public-page.tsx', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const exports = ast.statements.filter(node => ts.isFunctionDeclaration(node)
    && node.modifiers?.some(m => m.kind === ts.SyntaxKind.DefaultKeyword));
  assert.equal(exports.length, 1, 'One physical public default page');
  assert.equal(exports[0].name?.text, name, 'Exact public page identity');
  assert.ok(text.includes(marker), 'Exact public page content marker');
}
const scriptShapes = publicScriptSources.flatMap(([file, route]) => {
  const physical = file.replace(/\.tsx$/, '');
  const spellings = physical.includes('[locale]')
    ? [['encoded-uppercase', '%5Blocale%5D'], ['encoded-lowercase', '%5blocale%5d'], ['literal', '[locale]']]
    : [['none', null]];
  return spellings.map(([brackets, segment]) => ({ route, brackets,
    path: '/_next/static/chunks/' + (segment ? physical.replace('[locale]', segment) : physical) + '-0123456789abcdef.js' }));
});
const publicFields = metadata => ({ publicScriptRoute: metadata.publicScriptRoute, publicScriptBrackets: metadata.publicScriptBrackets });
const unknownScript = { publicScriptRoute: 'unknown', publicScriptBrackets: 'unknown' };
const nominalPublicScript = scriptShapes.find(item => item.route === 'free-review' && item.brackets === 'encoded-uppercase');
function assertNominalPublicScript(policy) {
  const req = request(policy, nominalPublicScript.path, 'GET', 'script');
  assert.equal(classifyPaidRequest(policy, req), 'noncanonical URL');
  assert.deepEqual(publicFields(deniedPaidRequestMetadata(policy, req)), { publicScriptRoute: 'free-review', publicScriptBrackets: 'encoded-uppercase' });
  return req;
}

for (const [file, , name, marker] of publicScriptSources) test('diagnostic physical page binding: ' + file, () => {
  const text = read(file);
  assertPublicScriptSource(text, name, marker);
  assert.throws(() => assertPublicScriptSource(text.replace('function ' + name + '(', 'function MissingPage('), name, marker), /Exact public page identity/);
  assert.throws(() => assertPublicScriptSource(text.replaceAll(marker, ''), name, marker), /Exact public page content marker/);
  assert.throws(() => assertPublicScriptSource('', name, marker), /One physical public default page/);
});

test('reviewed classifier and explicit prefetch-suppression guard retain exact execution blocks', () => {
  const text = read('scripts/helpers/release-paid-enquiry-verifier.mjs');
  const ast = ts.createSourceFile('guard.mjs', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const expected = {
    classifyPaidRequest: '0860c17a2cd0213fda1c23fe63c88e0521f0c6320755e9c439703776df73a439',
    installPaidReadOnlyGuard: '71e533cfb3687ad5d67706c3eb596b94592af1596734c5b466bc066a0cf242b6',
  };
  for (const [name, digest] of Object.entries(expected)) {
    const declarations = ast.statements.filter(node => ts.isFunctionDeclaration(node) && node.name?.text === name);
    assert.equal(declarations.length, 1);
    const block = declarations[0].getText(ast);
    const hash = value => createHash('sha256').update(value).digest('hex');
    assert.equal(hash(block), digest, 'Exact reviewed classifier / explicit source-linked prefetch suppression block: ' + name);
    assert.notEqual(hash(block.replace(name, 'Mutated')), digest, 'Byte-identity control is active');
  }
});

for (const mode of [base, live]) for (const shape of scriptShapes) test(`${mode.label} finite ${shape.route}/${shape.brackets}/${shape.path.includes('/es/') ? 'es' : 'physical'} diagnostic preserves decision`, async () => {
  const policy = releasePaidPolicy(mode), req = request(policy, shape.path, 'GET', 'script');
  const expectedReason = shape.brackets === 'none' || (['home', 'imagery'].includes(shape.route) && shape.brackets === 'encoded-uppercase')
    ? null : shape.brackets === 'literal' ? 'unallowlisted public resource' : 'noncanonical URL';
  assert.equal(classifyPaidRequest(policy, req), expectedReason);
  assert.deepEqual(publicFields(deniedPaidRequestMetadata(policy, req)), { publicScriptRoute: shape.route, publicScriptBrackets: shape.brackets });
  assert.equal(classifyPaidRequest(policy, req), expectedReason, 'Diagnostics do not affect permission');
  const { context } = network(), guard = await installPaidReadOnlyGuard(context, policy);
  assert.deepEqual(await context.send(request(policy)), ['fetch', 'fulfill']);
  assert.deepEqual(await context.send(req), expectedReason ? ['abort'] : ['fetch', 'fulfill']);
  if (!expectedReason) assert.deepEqual(guard.assertClean(), { postAttempts: 0, blockedRequests: 0, allowedGets: 2, intentionallySuppressedPrefetches: 0 });
  else assert.throws(() => guard.assertClean(), error => {
    assert.match(error.message, /Paid read-only network boundary violated/);
    assert.deepEqual(error.actual, [{ reason: expectedReason, ...deniedPaidRequestMetadata(policy, req) }]);
    assert.doesNotMatch(error.message, /https?:\/\/|\/_next\/|0123456789abcdef/);
    return true;
  });
});

const scriptShapeFaults = [
  ['unknown public route', p => p.replace('free-situation-review', 'other-service')],
  ['private route', p => p.replace('services/free-situation-review', 'client/records')],
  ['admin route', p => p.replace('services/free-situation-review', 'admin/clients')],
  ['secret segment', p => p.replace('free-situation-review', DIAGNOSTIC_CANARY)],
  ['unproved locale layout', p => p.replace('services/free-situation-review/page', 'layout')],
  ['unproved static Spanish sibling', p => p.replace('%5Blocale%5D', 'es'), null],
  ['unproved static English sibling', p => p.replace('%5Blocale%5D', 'en'), null],
  ['different parameter name', p => p.replace('locale', 'language')],
  ['catch-all parameter', p => p.replace('locale', '...locale')],
  ['mixed bracket case', p => p.replace('%5D', '%5d')],
  ['double encoded brackets', p => p.replaceAll('%5', '%255')],
  ['encoded separator', p => p.replace('/services/', '%2Fservices/')],
  ['encoded letter', p => p.replace('services', '%73ervices')],
  ['literal dot traversal', p => p.replace('/services/', '/extra/../services/')],
  ['encoded dot traversal', p => p.replace('/services/', '/%2e%2e/services/')],
  ['backslash', p => p.replace('/services/', '\\services/')],
  ['wrong static prefix', p => p.replace('/_next/static/', '/private/static/')],
  ['double slash', p => p.replace('/chunks/', '/chunks//')],
  ['short hash', p => p.replace('0123456789abcdef', '0123456789abcde')],
  ['long hash', p => p.replace('0123456789abcdef', '0123456789abcdef0')],
  ['uppercase hash', p => p.replace('abcdef', 'ABCDEF')],
  ['nonhex hash', p => p.replace('abcdef', 'ghijkl')],
  ['empty hash', p => p.replace('0123456789abcdef', '')],
  ['secret hash', p => p.replace('0123456789abcdef', DIAGNOSTIC_CANARY)],
  ['dotted chunk basename', p => p.replace('page-', 'page.')],
  ['source map', p => p + '.map'],
  ['CSS', p => p.replace('.js', '.css')],
  ['trailing path', p => p + '/extra'],
  ['trailing newline', p => p + '\n'],
  ['leading whitespace', p => ' ' + p, 'malformed URL'],
  ['bare query', p => p + '?'],
  ['known query', p => p + '?v=' + DIAGNOSTIC_CANARY],
  ['unknown secret query', p => p + '?' + DIAGNOSTIC_CANARY + '=' + DIAGNOSTIC_CANARY],
  ['bare hash', p => p + '#'],
  ['secret fragment', p => p + '#' + DIAGNOSTIC_CANARY],
];
for (const mode of [base, live]) for (const [name, mutate, expectedReason = 'noncanonical URL'] of scriptShapeFaults) test(`${mode.label} unknown script metadata for ${name} after nominal`, async () => {
  const policy = releasePaidPolicy(mode); assertNominalPublicScript(policy);
  const req = request(policy, mutate(nominalPublicScript.path), 'GET', 'script');
  const reason = classifyPaidRequest(policy, req); assert.equal(reason, expectedReason);
  const metadata = deniedPaidRequestMetadata(policy, req);
  assert.deepEqual(publicFields(metadata), unknownScript);
  assert.deepEqual(Object.keys(metadata), metadataKeys);
  assert.equal(classifyPaidRequest(policy, req), reason);
  const { context } = network(), guard = await installPaidReadOnlyGuard(context, policy);
  assert.deepEqual(await context.send(request(policy)), ['fetch', 'fulfill']);
  // Unknown diagnostics do not revoke the original generic ASCII static rule.
  assert.deepEqual(await context.send(req), reason ? ['abort'] : ['fetch', 'fulfill']);
  if (!reason) assert.deepEqual(guard.assertClean(), { postAttempts: 0, blockedRequests: 0, allowedGets: 2, intentionallySuppressedPrefetches: 0 });
  else assert.throws(() => guard.assertClean(), error => {
    assert.match(error.message, /Paid read-only network boundary violated/);
    assert.equal(error.actual[0].reason, reason);
    assert.deepEqual(publicFields(error.actual[0]), unknownScript);
    assert.doesNotMatch(error.message + JSON.stringify(error.actual), new RegExp(DIAGNOSTIC_CANARY, 'i'));
    assert.doesNotMatch(error.message, /https?:\/\/|\/_next\/|client\/|admin\//);
    return true;
  });
});

const scriptRequestFaults = [
  ['non-GET', req => ({ ...req, method: () => 'POST' })],
  ['wrong type', req => ({ ...req, resourceType: () => 'fetch' })],
  ['unknown type', req => ({ ...req, resourceType: () => DIAGNOSTIC_CANARY })],
  ['navigation', req => ({ ...req, isNavigationRequest: () => true })],
  ['missing navigation value', req => ({ ...req, isNavigationRequest: () => undefined })],
  ['external origin', req => ({ ...req, url: () => req.url().replace(/https?:\/\/[^/]+/, 'https://example.invalid') })],
  ['wrong scheme', req => ({ ...req, url: () => req.url().replace(/^https?/, 'ftp') })],
  ['userinfo', req => ({ ...req, url: () => req.url().replace('://', '://' + DIAGNOSTIC_CANARY + ':hidden@') })],
  ['malformed URL', req => ({ ...req, url: () => DIAGNOSTIC_CANARY })],
];
for (const mode of [base, live]) for (const [name, mutate] of scriptRequestFaults) test(`${mode.label} ineligible script metadata for ${name} after nominal`, async () => {
  const policy = releasePaidPolicy(mode), nominal = assertNominalPublicScript(policy), req = mutate(nominal);
  const reason = classifyPaidRequest(policy, req); assert.notEqual(reason, null);
  assert.deepEqual(publicFields(deniedPaidRequestMetadata(policy, req)), unknownScript);
  const { context } = network(), guard = await installPaidReadOnlyGuard(context, policy);
  assert.deepEqual(await context.send(request(policy)), ['fetch', 'fulfill']);
  assert.deepEqual(await context.send(req), ['abort']);
  assert.throws(() => guard.assertClean(), error => {
    assert.match(error.message, name === 'non-GET' ? /attempted a POST/ : /network boundary violated/);
    assert.doesNotMatch(error.message + JSON.stringify(error.actual), new RegExp(DIAGNOSTIC_CANARY, 'i'));
    return true;
  });
});

for (const broken of ['missing', 'throwing']) test('script diagnostic ' + broken + ' navigation metadata retains original fatal denial', async () => {
  const policy = releasePaidPolicy(base), nominal = assertNominalPublicScript(policy);
  const req = { ...nominal };
  if (broken === 'missing') delete req.isNavigationRequest;
  else req.isNavigationRequest = () => { throw new Error(DIAGNOSTIC_CANARY); };
  assert.equal(classifyPaidRequest(policy, req), 'noncanonical URL');
  const { context } = network(), guard = await installPaidReadOnlyGuard(context, policy);
  assert.deepEqual(await context.send(request(policy)), ['fetch', 'fulfill']);
  assert.deepEqual(await context.send(req), ['abort']);
  assert.throws(() => guard.assertClean(), error => {
    assert.match(error.message, /Paid read-only network boundary violated/);
    assert.deepEqual(error.actual, ['noncanonical URL']);
    assert.doesNotMatch(error.message, new RegExp(DIAGNOSTIC_CANARY));
    return true;
  });
});

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
    assert.deepEqual(guard.assertClean(), { postAttempts: 0, blockedRequests: 0, allowedGets: 2, intentionallySuppressedPrefetches: 0 });
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
    if (mode.label === 'local') assert.deepEqual(guard.assertClean(), { postAttempts: 0, blockedRequests: 0, allowedGets: 24, intentionallySuppressedPrefetches: 0 });
    else assert.throws(() => guard.assertClean(), error => error.code === 'ERR_ASSERTION' && error.actual.length === 12 && error.actual.every(row => row.reason === 'noncanonical URL'));
  });
}

const chunkFaults = [
  ['private route', p => p.replace('services/imagery-therapy', 'client/records')],
  ['admin route', p => p.replace('services/imagery-therapy', 'admin/clients')],
  ['API route', p => p.replace('services/imagery-therapy', 'api/service-enquiries')],
  ['linked route', p => p.replace('imagery-therapy', 'free-situation-review')],
  ['approved Home sibling', p => p.replace('/services/imagery-therapy', ''), null],
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
  for (const [name, mutate, reason = 'noncanonical URL'] of faults) test(`${kind} grammar ${reason === null ? 'permits reviewed' : 'rejects'} ${name} after nominal acceptance`, async () => {
    const policy = releasePaidPolicy(base), { context } = network(), guard = await installPaidReadOnlyGuard(context, policy);
    assert.deepEqual(await context.send(request(policy, path, 'GET', type)), ['fetch', 'fulfill']);
    const changed = mutate(path); assert.notEqual(changed, path);
    assert.equal(classifyPaidRequest(policy, request(policy, changed, 'GET', type)), reason);
    if (reason === null) {
      assert.equal(kind, 'chunk'); assert.equal(changed, nominalHomeChunk, 'Only newly approved Home moved from denial to acceptance');
      assert.deepEqual(await context.send(request(policy, changed, 'GET', type)), ['fetch', 'fulfill']);
      assert.deepEqual(guard.assertClean(), { postAttempts: 0, blockedRequests: 0, allowedGets: 2, intentionallySuppressedPrefetches: 0 });
    } else {
      assert.deepEqual(await context.send(request(policy, changed, 'GET', type)), ['abort']);
      assert.throws(() => guard.assertClean(), /Paid read-only network boundary violated/);
    }
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
