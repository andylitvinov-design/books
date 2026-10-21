// Executes the actual chooser, PhoneCountryInput, pure phone-country module and
// submission helper with deterministic hook scheduling and synthetic fetch results.
// It is NOT a mounted React, DOM, browser,
// native validity, screen-reader, or mobile-layout test. No real network, storage,
// client record, database, or messenger submission is used. The wrapper key and
// effect cleanup are honored by the harness; all mutations belong in review-only
// fixtures, not this test.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as enquiries from '../lib/whatsapp-enquiry.js';
import { normalizePublicServiceEnquiry } from '../lib/practitioners/public-service-enquiry-input.mjs';
const base = new URL('../', import.meta.url);
const compile = (path) => ts.transpileModule(readFileSync(new URL(path, base), 'utf8'), { fileName: path, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
const component = compile('components/contact-channel-chooser.tsx'), helper = compile('lib/practitioners/public-enquiry-submission.js');
const phoneComponent = compile('components/phone-country-input.tsx'), phoneCountry = compile('lib/contact/phone-country.js');
const all = tree => !tree || typeof tree !== 'object' ? [] : Array.isArray(tree) ? tree.flatMap(all) : [tree, ...all(tree.props?.children)];
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
const response = (status, data) => ({ status, ok: status >= 200 && status < 300, json: async () => data });
const referenceCode = 'HH-123456789ABC', saved = () => response(201, { saved: true, referenceCode });
function mount(locale = 'en', synthetic = {}) {
    let pathname = '/' + locale + '/services/synthetic', props = { locale, whatsappUrl: 'https://wa.me/14376066502?text=' + encodeURIComponent('Service: Synthetic service') };
    let instance = null, active, dirty = false, tree, serial = 0, uuid = 0, disposed = false;
    const calls = [], queue = [], stateAfterUnmount = [], authCalls = [], attempts = [], navigation = [], markerWrites = [];
    const authQueue = [...(synthetic.authQueue || [])];
    let returnMarker = synthetic.returnProfile ? JSON.stringify({ path: pathname, service: 'Synthetic service', panel: 'test-1' }) : null;
    const same = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
    const hooks = {
        useState(initial) { const inst = active, i = inst.cursor++; inst.slots[i] ??= { value: typeof initial === 'function' ? initial() : initial }; return [inst.slots[i].value, value => { if (!inst.alive) {
                stateAfterUnmount.push(value);
                return;
            } inst.slots[i].value = typeof value === 'function' ? value(inst.slots[i].value) : value; dirty = true; }]; },
        useRef(initial) { return active.slots[active.cursor++] ??= { current: initial }; },
        useId() { const i = active.cursor++; active.slots[i] ??= { value: 'test-' + (++serial) }; return active.slots[i].value; },
        useEffect(fn, deps) { const inst = active, i = inst.cursor++; if (!same(inst.slots[i]?.deps, deps))
            inst.effects.push(() => { inst.slots[i]?.cleanup?.(); inst.slots[i] = { deps, cleanup: fn() }; }); },
    };
    const jsx = (type, props, key) => ({ type, props, key });
    const modules = { react: hooks, 'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'Fragment' }, 'next/navigation': { usePathname: () => pathname },
        'lucide-react': new Proxy({}, { get: (_, p) => String(p) }), '@/components/acquisition-event-link': { AcquisitionEventLink: 'AcquisitionEventLink' },
        '@/data/local-acquisition': { ACQUISITION_EVENTS: [] }, '@/lib/whatsapp-enquiry': enquiries,
        '@/lib/organic-event-referrals': { readOrganicEventReferral: () => null, withOrganicEventReferral: u => u }, '@/lib/paid-ad-referrals': { readPaidAdReferral: () => null, withPaidAdReferral: u => u },
        './contact-channel-chooser.module.css': { default: new Proxy({}, { get: (_, p) => String(p) }) },
        './phone-country-input.module.css': { default: new Proxy({}, { get: (_, p) => String(p) }) } };
    const runtime = { exports: {}, require: name => { assert.ok(Object.hasOwn(modules, name), name); return modules[name]; }, URL, URLSearchParams, AbortController,
        window: {
            location: { search: '', pathname, href: 'http://127.0.0.1:3100' + pathname + (synthetic.returnProfile ? '?hh_enquiry=google' : ''),
                assign(url) { assert.equal(synthetic.auth, true, 'Provider navigation is forbidden'); assert.equal(url, 'https://synthetic-auth.invalid/continue'); navigation.push(url); } },
            sessionStorage: {
                getItem(key) { assert.equal(synthetic.auth, true); assert.equal(key, 'hh-google-enquiry-return'); return returnMarker; },
                removeItem(key) { assert.equal(synthetic.auth, true); assert.equal(key, 'hh-google-enquiry-return'); returnMarker = null; },
                setItem(key, value) { assert.equal(synthetic.auth, true); assert.equal(key, 'hh-google-enquiry-return'); const marker = JSON.parse(value);
                    assert.deepEqual(Object.keys(marker).sort(), ['panel', 'path', 'service']);
                    assert.match(marker.path, /^\/(en|ru|es)\/services\/synthetic$/); assert.equal(marker.service, 'Synthetic service'); assert.match(marker.panel, /^test-\d+$/);
                    markerWrites.push(marker); returnMarker = value; },
            },
            history: { state: null, replaceState(state, title, url) { assert.equal(synthetic.auth, true); assert.equal(state, null); assert.equal(title, ''); assert.equal(url, pathname); } },
            matchMedia: () => ({ matches: true }),
        },
        crypto: { randomUUID: () => `00000000-0000-4000-8000-${String(++uuid).padStart(12, '0')}` },
        fetch: async (url, options) => {
            attempts.push({ url, ...options });
            if (url === '/api/service-enquiries') {
                assert.equal(options.method, 'POST'); assert.equal(options.credentials, 'same-origin');
                assert.ok(queue.length, 'unexpected fetch'); calls.push({ url, ...options }); return queue.shift()();
            }
            assert.equal(synthetic.auth, true, 'Auth endpoints are forbidden outside explicit inert lifecycle fixtures');
            assert.ok(['/api/app/auth/start', '/api/app/auth/contact-profile'].includes(url), 'Unknown network destination');
            assert.equal(options.credentials, 'same-origin');
            if (url.endsWith('/contact-profile')) { assert.equal(options.method, 'GET'); assert.equal(options.cache, 'no-store'); assert.equal(options.body, undefined); }
            else { assert.equal(options.method, 'POST'); assert.equal(options.headers['Content-Type'], 'application/json');
                assert.deepEqual(JSON.parse(options.body), { locale: props.locale, continueTo: 'enquiry', returnPath: pathname }); }
            assert.ok(authQueue.length, 'No automatic or unplanned auth request');
            authCalls.push({ url, ...options }); return authQueue.shift()();
        } };
    const hr = { ...runtime, exports: {} };
    vm.runInNewContext(helper, hr);
    modules['@/lib/practitioners/public-enquiry-submission'] = hr.exports;
    const countryRuntime = { ...runtime, exports: {} };
    vm.runInNewContext(phoneCountry, countryRuntime);
    modules['@/lib/contact/phone-country'] = countryRuntime.exports;
    const phoneRuntime = { ...runtime, exports: {} };
    vm.runInNewContext(phoneComponent, phoneRuntime);
    modules['@/components/phone-country-input'] = phoneRuntime.exports;
    const { PhoneCountryInput } = phoneRuntime.exports;
    let mountedComponent = component;
    if (synthetic.mutate) {
        const original = readFileSync(new URL('components/contact-channel-chooser.tsx', base), 'utf8');
        const changed = synthetic.mutate(original); assert.notEqual(changed, original, 'Mutation reaches actual current chooser source');
        mountedComponent = ts.transpileModule(changed, { fileName: 'components/contact-channel-chooser.tsx', compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
    }
    vm.runInNewContext(mountedComponent, runtime);
    const cleanupInstance = inst => { if (inst) {
        inst.slots.forEach(s => s?.cleanup?.());
        inst.alive = false;
    } };
    const cleanup = () => { cleanupInstance(instance?.phone); cleanupInstance(instance); };
    // One real stateful child is evaluated once per synthetic render. Repeated
    // tree queries cannot create fresh phone state or append hooks to the form.
    const resolvePhone = node => {
        if (!node || typeof node !== 'object') return node;
        if (Array.isArray(node)) return node.map(resolvePhone);
        if (node.type === PhoneCountryInput) {
            assert.equal(instance.phoneSeen, false, 'One actual phone child per enquiry form');
            instance.phoneSeen = true;
            const phone = instance.phone ??= { slots: [], alive: true };
            phone.cursor = 0; phone.effects = []; active = phone;
            const resolved = PhoneCountryInput(node.props);
            active = instance;
            return resolvePhone(resolved);
        }
        return { ...node, props: { ...node.props, children: resolvePhone(node.props?.children) } };
    };
    const render = () => {
        assert.ok(!disposed);
        dirty = false;
        const wrapper = runtime.exports.ContactChannelChooser(props);
        if (!instance || instance.key !== wrapper.key || instance.type !== wrapper.type) {
            cleanup();
            instance = { type: wrapper.type, key: wrapper.key, slots: [], alive: true };
        }
        active = instance;
        instance.cursor = 0;
        instance.effects = [];
        instance.phoneSeen = false;
        tree = resolvePhone(wrapper.type(wrapper.props));
        if (!instance.phoneSeen) { cleanupInstance(instance.phone); instance.phone = null; }
        instance.phone?.effects.forEach(fn => fn());
        instance.effects.forEach(fn => fn());
    };
    const h = { calls, queue, stateAfterUnmount, authCalls, attempts, authQueue, navigation, markerWrites, get tree() { return tree; }, get props() { return props; }, get pathname() { return pathname; },
        nodes: () => all(tree), one: pred => all(tree).find(pred), field: type => all(tree).find(n => n.type === 'input' && (n.props.type === type || n.props.autoComplete === type)),
        form: () => all(tree).find(n => n.type === 'form'), status: () => all(tree).find(n => n.props?.role === 'status'), error: () => all(tree).find(n => n.props?.role === 'alert'),
        trigger: () => all(tree).find(n => 'data-contact-order' in (n.props || {})), submitButton: () => all(tree).find(n => n.type === 'button' && n.props.type === 'submit'),
        async settle() { for (let i = 0; i < 15; i++) {
            await Promise.resolve();
            if (dirty && !disposed)
                render();
        } },
        async change(type, value) { const n = ['textarea', 'select'].includes(type) ? all(tree).find(n => n.type === type) : h.field(type); assert.ok(n && !n.props.disabled, 'user field editable'); n.props.onChange({ target: { value, checked: value } }); await h.settle(); },
        google: () => all(tree).find(n => n.type === 'button' && n.props.className === 'googleButton'),
        async method(value) { const options = all(tree).filter(n => n.type === 'button' && 'aria-pressed' in n.props); const n = options[value === 'email' ? 0 : 1]; assert.ok(n && !n.props.disabled, 'contact method editable'); n.props.onClick(); await h.settle(); },
        async fill(note = 'Please tell me about the available times.') { await h.change('name', 'Synthetic Visitor'); await h.change('email', 'visitor@example.test'); await h.change('textarea', note); await h.change('checkbox', true); assert.equal(h.submitButton().props.disabled, false); },
        send() { return h.form().props.onSubmit({ preventDefault() { } }); },
        async toggle() { h.trigger().props.onClick(); await h.settle(); },
        rerender(next = {}, path = pathname) { props = { ...props, ...next }; pathname = path; runtime.window.location.pathname = path; runtime.window.location.href = 'http://127.0.0.1:3100' + path; render(); },
        unmount() { cleanup(); disposed = true; tree = null; },
        replayEffects() { const slots = instance.slots; for (const slot of slots)
            if (slot?.cleanup)
                slot.cleanup(); for (let i = 0; i < slots.length; i++)
            if (slots[i] && 'deps' in slots[i])
                slots[i] = undefined; render(); },
    };
    render();
    return h;
}
const locked = h => h.nodes().filter(n => ['input', 'textarea', 'select'].includes(n.type) || (n.type === 'button' && ('aria-pressed' in n.props || n.props.className === 'googleButton'))).every(n => n.props.disabled);
for (const locale of ['en', 'ru', 'es'])
    test(`${locale}: actual submit wiring preserves contact/consent and confirmed save/reset`, async () => { const h = mount(locale); await h.fill(); h.queue.push(saved); await h.send(); await h.settle(); assert.ok(h.status()); const p = JSON.parse(h.calls[0].body); assert.equal(p.locale, locale); assert.equal(p.sourcePath, h.pathname); assert.equal(p.contact.email, 'visitor@example.test'); assert.equal(p.contactConsent, true); assert.equal(h.calls[0].credentials, 'same-origin'); const wa = h.one(n => n.props?.attributes?.['data-contact-channel'] === 'whatsapp'); assert.ok(new URL(wa.props.href).searchParams.get('text').includes(referenceCode)); assert.ok(!new URL(wa.props.href).searchParams.get('text').includes(p.description), 'Optional note must not enter messenger drafts'); for (const channel of ['whatsapp', 'telegram']) { const link = h.one(n => n.props?.attributes?.['data-contact-channel'] === channel); const text = new URL(link.props.href).searchParams.get('text'); assert.ok(text.includes(referenceCode)); for (const value of [p.description, p.contact.displayName, p.contact.email].filter(Boolean)) assert.ok(!text.includes(value)); } h.one(n => n.props?.className === 'again').props.onClick(); await h.settle(); assert.equal(h.field('name').props.value, ''); assert.equal(h.field('checkbox').props.checked, false); await h.fill(); h.queue.push(saved); await h.send(); await h.settle(); assert.notEqual(JSON.parse(h.calls[1].body).operationId, p.operationId); h.unmount(); assert.equal(h.stateAfterUnmount.length, 0); });
test('double form handler invocation posts once before busy render; fields and consent lock', async () => { const h = mount(); await h.fill(); const d = deferred(); h.queue.push(() => d.promise); const one = h.send(), two = h.send(); await h.settle(); assert.equal(h.calls.length, 1); assert.ok(locked(h)); assert.equal(h.submitButton().props.disabled, true); await h.toggle(); await h.toggle(); assert.ok(locked(h)); d.resolve(saved()); await Promise.all([one, two]); await h.settle(); assert.ok(h.status()); h.unmount(); });
for (const failure of ['network', 'json', '500', 'reference'])
    test(`${failure} gives honest unknown and exact payload retry with frozen fields`, async () => { const h = mount(); await h.fill(); h.queue.push(failure === 'network' ? () => { throw Error('lost'); } : failure === 'json' ? () => ({ status: 201, ok: true, json: async () => { throw Error('truncated'); } }) : failure === '500' ? () => response(500, { error: 'INTERNAL_ERROR' }) : () => response(201, { saved: true, referenceCode: 'bad' })); await h.send(); await h.settle(); assert.ok(!h.status()); assert.match(h.error().props.children, /could not confirm/); assert.ok(locked(h)); assert.equal(h.submitButton().props.disabled, false); assert.ok(h.submitButton().props.children.includes('Retry this same request')); await h.toggle(); await h.toggle(); assert.ok(locked(h)); h.queue.push(saved); await h.send(); await h.settle(); assert.equal(h.calls[0].body, h.calls[1].body); assert.ok(h.status()); h.unmount(); });
test('definite rejection unlocks correction, new payload and operation ID', async () => { const h = mount(); await h.fill(); h.queue.push(() => response(400, { error: 'INVALID_SERVICE_ENQUIRY' })); await h.send(); await h.settle(); assert.match(h.error().props.children, /not accepted/); assert.ok(!locked(h)); await h.change('email', 'corrected@example.test'); h.queue.push(saved); await h.send(); await h.settle(); const a = JSON.parse(h.calls[0].body), b = JSON.parse(h.calls[1].body); assert.notEqual(a.operationId, b.operationId); assert.equal(b.contact.email, 'corrected@example.test'); assert.ok(h.status()); h.unmount(); });
test('unknown then 400 then 429 never falsely claims rejected or unlocks', async () => { const h = mount(); await h.fill(); h.queue.push(() => { throw Error('lost'); }, () => response(400, { error: 'INVALID_SERVICE_ENQUIRY' }), () => response(429, { error: 'RATE_LIMITED' }), saved); for (let i = 0; i < 3; i++) {
    await h.send();
    await h.settle();
    assert.match(h.error().props.children, /could not confirm/);
    assert.ok(locked(h));
} await h.send(); await h.settle(); assert.equal(new Set(h.calls.map(c => c.body)).size, 1); assert.ok(h.status()); h.unmount(); });
for (const change of ['route', 'service', 'locale', 'unmount'])
    for (const result of ['saved', 'unknown'])
        test(`${change}: ignores late ${result}, aborts old scope, preserves new form`, async () => { const h = mount(); await h.fill(); const d = deferred(); h.queue.push(() => d.promise); const old = h.send(); await h.settle(); const signal = h.calls[0].signal; if (change === 'route')
            h.rerender({}, '/en/services/different'); if (change === 'service')
            h.rerender({ whatsappUrl: 'https://wa.me/14376066502?text=Service%3A%20Other' }); if (change === 'locale')
            h.rerender({ locale: 'es' }); if (change === 'unmount')
            h.unmount(); assert.equal(signal.aborted, true); result === 'saved' ? d.resolve(saved()) : d.reject(Error('late error')); await old; await h.settle(); assert.ok(!h.status()); assert.ok(!h.error()); assert.equal(h.stateAfterUnmount.length, 0); if (change !== 'unmount') {
            assert.equal(h.field('name').props.value, '');
            assert.equal(h.field('checkbox').props.checked, false);
            assert.equal(h.form().props['aria-busy'], false);
            await h.fill();
            h.queue.push(saved);
            await h.send();
            await h.settle();
            assert.ok(h.status());
            assert.equal(h.calls.length, 2);
            assert.notEqual(h.calls[0].body, h.calls[1].body);
            h.unmount();
        } });
test('unmount during decode cannot write state', async () => { const h = mount(); await h.fill(); const d = deferred(); h.queue.push(() => ({ status: 201, ok: true, json: () => d.promise })); const promise = h.send(); await h.settle(); h.unmount(); d.resolve({ saved: true, referenceCode }); await promise; assert.equal(h.stateAfterUnmount.length, 0); assert.equal(h.calls[0].signal.aborted, true); });
test('effect cleanup replay creates usable live submission scope', async () => { const h = mount(); h.replayEffects(); await h.fill(); h.queue.push(saved); await h.send(); await h.settle(); assert.ok(h.status()); assert.equal(h.calls.length, 1); h.unmount(); });
test('front-end guards invalid contact and consent before sending', async () => { const h = mount(); await h.fill(); await h.change('checkbox', false); await h.send(); await h.settle(); assert.equal(h.calls.length, 0); assert.ok(h.error()); await h.change('checkbox', true); await h.method('phone'); await h.change('tel', '123'); await h.send(); await h.settle(); assert.equal(h.calls.length, 0); assert.ok(h.error()); h.unmount(); });

for (const locale of ['en', 'ru', 'es']) {
    test(`${locale}: actual optional note starts collapsed and an empty note reaches only the first-party payload`, async () => {
        const h = mount(locale), note = h.one(n => n.type === 'textarea'), details = h.one(n => n.type === 'details' && all(n).some(child => child.type === 'textarea'));
        assert.ok(details);
        assert.equal(Boolean(details.props.open), false, 'Disclosure is not initially open');
        assert.equal(Boolean(note.props.required), false);
        assert.equal(note.props.minLength, undefined);
        assert.equal(note.props.value, '');
        await h.fill('');
        assert.equal(h.calls.length, 0, 'Editing contact, note or consent never auto-posts');
        h.queue.push(saved); await h.send(); await h.settle();
        const payload = JSON.parse(h.calls[0].body);
        assert.equal(payload.description, '');
        const label = { en: 'Enquiry', ru: 'Заявка', es: 'Solicitud' }[locale];
        for (const channel of ['whatsapp', 'telegram']) {
            const link = h.one(n => n.props?.attributes?.['data-contact-channel'] === channel);
            assert.equal(new URL(link.props.href).searchParams.get('text'), 'Service: Synthetic service\n\n' + label + ': ' + referenceCode);
        }
        h.unmount();
    });
}

test('actual phone child preserves country state, normalizes input and freezes both controls on uncertain retry', async () => {
    const h = mount(), select = () => h.one(n => n.type === 'select');
    assert.equal(select(), undefined); await h.method('phone');
    assert.equal(select().props.value, 'CA');
    assert.equal(h.field('tel').props.autoComplete, 'tel-national');
    await h.change('name', 'Synthetic Visitor');
    await h.change('select', 'GB');
    await h.change('tel', '20 1234 5678');
    await h.change('textarea', 'Synthetic optional private note');
    await h.change('checkbox', true);
    for (let i = 0; i < 3; i++) h.nodes();
    assert.equal(select().props.value, 'GB', 'Tree reads retain the real phone child state');
    assert.equal(h.field('tel').props.value, '2012345678');
    assert.equal(h.calls.length, 0);
    h.queue.push(() => { throw Error('lost'); });
    await h.send(); await h.settle();
    const payload = JSON.parse(h.calls[0].body);
    assert.equal(payload.contact.phone, '+442012345678');
    assert.equal(payload.contact.email, '');
    assert.equal(payload.description, 'Synthetic optional private note');
    assert.ok(locked(h));
    assert.equal(select().props.disabled, true);
    await assert.rejects(h.change('select', 'ES'), /user field editable/);
    await assert.rejects(h.change('tel', '612345678'), /user field editable/);
    h.queue.push(saved); await h.send(); await h.settle();
    assert.equal(h.calls[0].body, h.calls[1].body);
    for (const channel of ['whatsapp', 'telegram']) {
        const text = new URL(h.one(n => n.props?.attributes?.['data-contact-channel'] === channel).props.href).searchParams.get('text');
        for (const value of [payload.contact.phone, payload.contact.displayName, payload.description]) assert.ok(!text.includes(value));
    }
    h.one(n => n.props?.className === 'again').props.onClick(); await h.settle();
    assert.equal(select(), undefined, 'New enquiry defaults to email with no phone child');
    await h.method('phone');
    assert.equal(select().props.value, 'CA', 'New enquiry remounts the removed phone child');
    assert.equal(h.field('tel').props.value, '');
    assert.equal(h.calls.length, 2);
    h.unmount(); assert.equal(h.stateAfterUnmount.length, 0);
});

test('actual phone child recognizes international paste and resets country on keyed route changes', async () => {
    const h = mount();
    await h.method('phone');
    await h.change('tel', '+34 612 345 678');
    assert.equal(h.one(n => n.type === 'select').props.value, 'ES');
    assert.equal(h.field('tel').props.value, '612345678');
    await h.change('name', 'Synthetic Visitor'); await h.change('checkbox', true);
    h.queue.push(saved); await h.send(); await h.settle();
    assert.equal(JSON.parse(h.calls[0].body).contact.phone, '+34612345678');
    h.rerender({}, '/en/services/different');
    assert.equal(h.field('tel'), undefined); await h.method('phone');
    assert.equal(h.one(n => n.type === 'select').props.value, 'CA');
    assert.equal(h.field('tel').props.value, '');
    assert.equal(h.field('checkbox').props.checked, false);
    assert.equal(h.calls.length, 1, 'Remount never auto-posts');
    h.unmount();
});

// Compare the exact trimmed transmitted name with the actual pure server input
// contract. This is not an API/DB/auth call and no client records are loaded.
for (const locale of ['en', 'ru', 'es']) for (const rawName of ['', '  ', 'X', ' X ', 'AB', ' A B ', 'A'.repeat(120), 'A'.repeat(121), 'A\u0001B', 'A\nB', '\tAB\n']) {
    test(`${locale}: optional name ${JSON.stringify(rawName)} agrees with the server input contract`, async () => {
        const h = mount(locale); await h.fill(''); await h.change('name', rawName);
        const body = { operationId: '00000000-0000-4000-8000-000000000001', serviceTitle: 'Synthetic service', description: '', sourcePath: h.pathname, locale,
            contact: { displayName: rawName.trim(), email: 'visitor@example.test', phone: '' }, contactConsent: true, website: '' };
        let serverAccepts = true;
        try { normalizePublicServiceEnquiry(body); } catch { serverAccepts = false; }
        assert.equal(h.calls.length, 0); h.queue.push(saved); await h.send(); await h.settle();
        assert.equal(h.calls.length, Number(serverAccepts), 'Direct actual handler agrees with the pure server validator on exactly transmitted values');
        if (serverAccepts) assert.deepEqual(JSON.parse(h.calls[0].body), body);
        else assert.ok(h.error());
        h.unmount(); assert.equal(h.stateAfterUnmount.length, 0);
    });
}
const syntheticProfile = () => response(200, { email: 'synthetic-google@example.test', displayName: 'Synthetic Google' });
const syntheticStart = () => response(200, { redirectUrl: 'https://synthetic-auth.invalid/continue' });
// Auth endpoints below exist only as exact, queued synthetic callbacks inside
// the VM. They never contact Google, Supabase, a session, or a browser.
test('inert Google start serializes only public identity and never submits or consents automatically', async () => {
    const d = deferred(), h = mount('en', { auth: true, authQueue: [() => d.promise] });
    const go = h.google().props.onClick(); await h.settle();
    assert.equal(h.authCalls.length, 1); assert.ok(locked(h)); assert.equal(h.calls.length, 0);
    assert.equal(h.field('checkbox').props.checked, false);
    d.resolve(syntheticStart()); await go; await h.settle();
    assert.deepEqual(h.navigation, ['https://synthetic-auth.invalid/continue']);
    assert.deepEqual(h.markerWrites, [{ path: '/en/services/synthetic', service: 'Synthetic service', panel: 'test-1' }]);
    assert.equal(h.calls.length, 0); assert.equal(h.field('checkbox').props.checked, false); h.unmount();
});
test('inert Google profile only prefills after the exact public return marker, without consent or a save', async () => {
    const h = mount('en', { auth: true, returnProfile: true, authQueue: [syntheticProfile] }); await h.settle();
    assert.equal(h.authCalls.length, 1); assert.equal(h.field('email').props.value, 'synthetic-google@example.test');
    assert.equal(h.field('name').props.value, 'Synthetic Google'); assert.equal(h.field('checkbox').props.checked, false);
    assert.equal(h.calls.length, 0); assert.deepEqual(h.navigation, []); assert.deepEqual(h.markerWrites, []);
    assert.equal(h.submitButton().props.disabled, true); h.unmount();
});
async function assertGoogleStartFrozen(mutate) {
    const h = mount('en', { auth: true, mutate }); await h.fill(); const oldGoogle = h.google().props.onClick;
    const d = deferred(); h.queue.push(() => d.promise); const sending = h.send(); await h.settle();
    await oldGoogle(); await h.settle(); assert.equal(h.attempts.length, 1, 'A pre-render Google callback cannot start auth while the scope is pending');
    assert.ok(locked(h)); await assert.rejects(h.method('phone'), /contact method editable/);
    d.reject(Error('unknown synthetic outcome')); await sending; await h.settle();
    await oldGoogle(); await h.settle(); assert.equal(h.attempts.length, 1, 'An unknown frozen payload cannot start auth');
    assert.ok(locked(h)); const body = h.calls[0].body; h.queue.push(saved); await h.send(); await h.settle();
    assert.equal(h.calls[1].body, body); assert.equal(h.authCalls.length, 0); h.unmount();
}
test('old Google callbacks cannot start auth during in-flight or unknown immutable retries', () => assertGoogleStartFrozen());
test('Google freeze control rejects removal of actual scope.pending guard after nominal passes', async () => {
    await assertGoogleStartFrozen();
    await assert.rejects(() => assertGoogleStartFrozen(source => source.replace('!scope || scope.pending || googleBusy', '!scope || googleBusy')),
        /A pre-render Google callback cannot start auth/);
});
async function assertProfileFrozen(outcome, mutate) {
    const profile = deferred(), h = mount('en', { auth: true, returnProfile: true, authQueue: [() => profile.promise], mutate });
    await h.method('phone'); await h.change('select', 'GB'); await h.change('tel', '7700900123');
    await h.change('name', 'Manual Visitor'); await h.change('textarea', 'Private manual note'); await h.change('checkbox', true);
    const d = deferred(); h.queue.push(() => d.promise); const sending = h.send(); await h.settle();
    const body = h.calls[0].body;
    if (outcome.startsWith('unknown')) { d.reject(Error('unknown')); await sending; await h.settle(); }
    const originalError = h.error()?.props.children;
    outcome.endsWith('error') ? profile.reject(Error('synthetic profile failure')) : profile.resolve(syntheticProfile());
    await h.settle(); assert.equal(h.field('email'), undefined, 'Late profile cannot change the selected phone method');
    assert.equal(h.field('name').props.value, 'Manual Visitor', 'Late profile cannot rewrite the retained private payload');
    assert.equal(h.one(n => n.type === 'select').props.value, 'GB'); assert.equal(h.field('tel').props.value, '7700900123');
    assert.equal(h.field('checkbox').props.checked, true); assert.equal(h.error()?.props.children, originalError, 'Late auth error cannot replace save status');
    assert.ok(locked(h)); assert.equal(h.calls.length, 1); assert.equal(h.authCalls.length, 1);
    if (!outcome.startsWith('unknown')) { d.reject(Error('unknown')); await sending; await h.settle(); }
    h.queue.push(saved); await h.send(); await h.settle(); assert.equal(h.calls[1].body, body); h.unmount();
}
for (const outcome of ['pending-success', 'pending-error', 'unknown-success', 'unknown-error']) {
    test('inert ' + outcome + ' profile callback cannot mutate frozen contact/method/country/consent/payload', () => assertProfileFrozen(outcome));
}
test('profile freeze control rejects removal of actual pending guard after nominal passes', async () => {
    await assertProfileFrozen('unknown-success');
    await assert.rejects(() => assertProfileFrozen('unknown-success', source => source.replace('if (!active || submission.current?.pending) return;', 'if (!active) return;')),
        /Late profile cannot change the selected phone method/);
});
function moveScope(h, change) {
    if (change === 'route') h.rerender({}, '/en/services/different');
    else if (change === 'service') h.rerender({ whatsappUrl: 'https://wa.me/14376066502?text=Service%3A%20Other' });
    else if (change === 'locale') h.rerender({ locale: 'es' });
    else h.unmount();
}
async function assertLateAuth(kind, change, result, mutate) {
    const d = deferred(), h = mount('en', { auth: true, returnProfile: kind === 'profile', authQueue: [() => d.promise], mutate });
    const pending = kind === 'start' ? h.google().props.onClick() : Promise.resolve(); await h.settle();
    assert.equal(h.authCalls.length, 1); moveScope(h, change);
    if (result === 'error') d.reject(Error('synthetic late auth failure'));
    else d.resolve(kind === 'start' ? syntheticStart() : syntheticProfile());
    await pending; await h.settle();
    assert.deepEqual(h.navigation, [], 'Stale auth callback cannot navigate');
    assert.deepEqual(h.markerWrites, [], 'Stale auth callback cannot save a return marker');
    assert.deepEqual(h.stateAfterUnmount, [], 'Stale auth callback cannot write into removed scope');
    assert.equal(h.calls.length, 0); assert.equal(h.authCalls.length, 1);
    if (change !== 'unmount') { assert.equal(h.field('name').props.value, ''); assert.equal(h.field('email').props.value, '');
        assert.equal(h.field('checkbox').props.checked, false); assert.equal(h.error(), undefined); h.unmount(); }
}
for (const kind of ['start', 'profile']) for (const change of ['route', 'service', 'locale', 'unmount']) for (const result of ['success', 'error']) {
    test(`inert Google ${kind} ignores late ${result} after ${change}`, () => assertLateAuth(kind, change, result));
}
test('stale Google start control rejects lost scope identity after nominal passes', async () => {
    await assertLateAuth('start', 'unmount', 'success');
    await assert.rejects(() => assertLateAuth('start', 'unmount', 'success', source => source.replaceAll('if (submission.current !== scope) return;', '/* stale scope guard removed */')),
        /Stale auth callback cannot navigate/);
});
test('stale Google profile control rejects lost effect liveness after nominal passes', async () => {
    await assertLateAuth('profile', 'unmount', 'success');
    await assert.rejects(() => assertLateAuth('profile', 'unmount', 'success', source => source.replace('if (!active || submission.current?.pending) return;', 'if (submission.current?.pending) return;')),
        /Stale auth callback cannot write into removed scope/);
});

test('profile error freeze control rejects lost pending guard after nominal passes', async () => {
    await assertProfileFrozen('unknown-error');
    await assert.rejects(() => assertProfileFrozen('unknown-error', source => source.replace('if (active && !submission.current?.pending) setError(c.googleError);', 'if (active) setError(c.googleError);')),
        /Late auth error cannot replace save status/);
});
test('inert auth closure rejects unknown actual imports and network destinations', async () => {
    assert.throws(() => mount('en', { mutate: source => source.replace('@/lib/paid-ad-referrals', '@/lib/unrecognized-auth-import') }), /unrecognized-auth-import/);
    const h = mount('en', { auth: true, authQueue: [syntheticStart],
        mutate: source => source.replace('fetch("/api/app/auth/start"', 'fetch("https://unrecognized.synthetic.invalid"') });
    await h.google().props.onClick(); await h.settle();
    assert.equal(h.attempts.length, 1); assert.equal(h.authCalls.length, 0, 'Unknown destination is rejected before a synthetic response');
    assert.equal(h.authQueue.length, 1); assert.deepEqual(h.navigation, []); assert.deepEqual(h.markerWrites, []); assert.equal(h.calls.length, 0); assert.ok(h.error()); h.unmount();
});

for (const unknownImport of ['constructor', '__proto__', 'toString']) {
    test('actual lifecycle import map rejects inherited key ' + unknownImport, () => {
        const nominal = mount(); nominal.unmount();
        assert.throws(() => mount('en', { mutate: source => source.replace('@/lib/paid-ad-referrals', unknownImport) }),
            { code: 'ERR_ASSERTION', message: unknownImport });
    });
}
