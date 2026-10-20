// Executes the actual component and submission helper with deterministic React-hook
// scheduling and synthetic fetch results. It is NOT a mounted React, DOM, browser,
// native validity, screen-reader, or mobile-layout test. No real network, storage,
// client record, database, or messenger submission is used. The wrapper key and
// effect cleanup are honored by the harness; all mutations belong in review-only
// fixtures, not this test.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const base = new URL('../', import.meta.url);
const compile = (path) => ts.transpileModule(readFileSync(new URL(path, base), 'utf8'), { fileName: path, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
const component = compile('components/contact-channel-chooser.tsx'), helper = compile('lib/practitioners/public-enquiry-submission.js');
const all = tree => !tree || typeof tree !== 'object' ? [] : Array.isArray(tree) ? tree.flatMap(all) : [tree, ...all(tree.props?.children)];
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
const response = (status, data) => ({ status, ok: status >= 200 && status < 300, json: async () => data });
const referenceCode = 'HH-123456789ABC', saved = () => response(201, { saved: true, referenceCode });
function mount(locale = 'en') {
    let pathname = '/' + locale + '/services/synthetic', props = { locale, whatsappUrl: 'https://wa.me/15555550123?text=' + encodeURIComponent('Service: Synthetic service') };
    let instance = null, active, dirty = false, tree, serial = 0, uuid = 0, disposed = false;
    const calls = [], queue = [], stateAfterUnmount = [];
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
        '@/data/local-acquisition': { ACQUISITION_EVENTS: [] }, '@/lib/whatsapp-enquiry': { telegramEnquiryUrlFromWhatsApp: u => 'https://t.me/synthetic?text=' + new URL(u).searchParams.get('text') },
        '@/lib/organic-event-referrals': { readOrganicEventReferral: () => null, withOrganicEventReferral: u => u }, '@/lib/paid-ad-referrals': { readPaidAdReferral: () => null, withPaidAdReferral: u => u },
        './contact-channel-chooser.module.css': { default: new Proxy({}, { get: (_, p) => String(p) }) } };
    const runtime = { exports: {}, require: name => { assert.ok(modules[name], name); return modules[name]; }, URL, URLSearchParams, AbortController,
        window: { location: { search: '', pathname }, matchMedia: () => ({ matches: true }) },
        crypto: { randomUUID: () => `00000000-0000-4000-8000-${String(++uuid).padStart(12, '0')}` },
        fetch: async (url, options) => { assert.equal(url, '/api/service-enquiries'); assert.ok(queue.length, 'unexpected fetch'); calls.push({ url, ...options }); return queue.shift()(); } };
    const hr = { ...runtime, exports: {} };
    vm.runInNewContext(helper, hr);
    modules['@/lib/practitioners/public-enquiry-submission'] = hr.exports;
    vm.runInNewContext(component, runtime);
    const cleanup = () => { if (instance) {
        instance.slots.forEach(s => s?.cleanup?.());
        instance.alive = false;
    } };
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
        tree = wrapper.type(wrapper.props);
        instance.effects.forEach(fn => fn());
    };
    const h = { calls, queue, stateAfterUnmount, get tree() { return tree; }, get props() { return props; }, get pathname() { return pathname; },
        nodes: () => all(tree), one: pred => all(tree).find(pred), field: type => all(tree).find(n => n.type === 'input' && (n.props.type === type || n.props.autoComplete === type)),
        form: () => all(tree).find(n => n.type === 'form'), status: () => all(tree).find(n => n.props?.role === 'status'), error: () => all(tree).find(n => n.props?.role === 'alert'),
        trigger: () => all(tree).find(n => 'data-contact-order' in (n.props || {})), submitButton: () => all(tree).find(n => n.type === 'button' && n.props.type === 'submit'),
        async settle() { for (let i = 0; i < 15; i++) {
            await Promise.resolve();
            if (dirty && !disposed)
                render();
        } },
        async change(type, value) { const n = type === 'textarea' ? all(tree).find(n => n.type === 'textarea') : h.field(type); assert.ok(!n.props.disabled, 'user field editable'); n.props.onChange({ target: { value, checked: value } }); await h.settle(); },
        async fill() { await h.change('name', 'Synthetic Visitor'); await h.change('email', 'visitor@example.test'); await h.change('textarea', 'Please tell me about the available times.'); await h.change('checkbox', true); assert.equal(h.submitButton().props.disabled, false); },
        send() { return h.form().props.onSubmit({ preventDefault() { } }); },
        async toggle() { h.trigger().props.onClick(); await h.settle(); },
        rerender(next = {}, path = pathname) { props = { ...props, ...next }; pathname = path; runtime.window.location.pathname = path; render(); },
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
const locked = h => h.nodes().filter(n => n.type === 'input' || n.type === 'textarea').every(n => n.props.disabled);
for (const locale of ['en', 'ru', 'es'])
    test(`${locale}: actual submit wiring preserves contact/consent and confirmed save/reset`, async () => { const h = mount(locale); await h.fill(); h.queue.push(saved); await h.send(); await h.settle(); assert.ok(h.status()); const p = JSON.parse(h.calls[0].body); assert.equal(p.locale, locale); assert.equal(p.sourcePath, h.pathname); assert.equal(p.contact.email, 'visitor@example.test'); assert.equal(p.contactConsent, true); assert.equal(h.calls[0].credentials, 'same-origin'); const wa = h.one(n => n.props?.attributes?.['data-contact-channel'] === 'whatsapp'); assert.ok(new URL(wa.props.href).searchParams.get('text').includes(referenceCode)); assert.ok(new URL(wa.props.href).searchParams.get('text').includes(p.description)); h.one(n => n.props?.className === 'again').props.onClick(); await h.settle(); assert.equal(h.field('name').props.value, ''); assert.equal(h.field('checkbox').props.checked, false); await h.fill(); h.queue.push(saved); await h.send(); await h.settle(); assert.notEqual(JSON.parse(h.calls[1].body).operationId, p.operationId); h.unmount(); assert.equal(h.stateAfterUnmount.length, 0); });
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
            h.rerender({ whatsappUrl: 'https://wa.me/15555550123?text=Service%3A%20Other' }); if (change === 'locale')
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
test('front-end guards invalid contact and consent before sending', async () => { const h = mount(); await h.fill(); await h.change('checkbox', false); await h.send(); await h.settle(); assert.equal(h.calls.length, 0); assert.ok(h.error()); await h.change('checkbox', true); await h.change('tel', 'not a phone'); await h.send(); await h.settle(); assert.equal(h.calls.length, 0); assert.ok(h.error()); h.unmount(); });
