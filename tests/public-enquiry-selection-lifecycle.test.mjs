import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import vm from 'node:vm';
import { randomUUID } from 'node:crypto';
import ts from 'typescript';
import * as whatsapp from '../lib/whatsapp-enquiry.js';
import * as organic from '../lib/organic-event-referrals.js';
import * as paid from '../lib/paid-ad-referrals.js';
import * as input from '../lib/practitioners/public-service-enquiry-input.mjs';
import * as receipt from '../lib/practitioners/enquiry-receipt.mjs';
// Executes the actual TSX event handlers and effects with deterministic hooks.
// This is not DOM/browser/Next-router acceptance and never uses a real network.
const base = resolve(process.env.ENQUIRY_SOURCE_ROOT || '.');
const files = Object.fromEntries(await Promise.all(['contact-channel-chooser', 'alchemy-soul-lead-form', 'service-enquiry-thank-you'].map(async (name) => [name, await readFile(resolve(base, `components/${name}.tsx`), 'utf8')])));
const element = (type, props) => ({ type, props: props || {} });
const empty = () => null;
let nextMountId = 0;
function environment({ storageDenied = false } = {}) {
    const writes = [], navigations = [], requests = [], authRequests = [], profileRequests = [], redirects = [], storage = new Map();
    const window = { location: { search: '', pathname: '/en/services/alchemy-of-soul', href: 'https://fixture.invalid/en/services/alchemy-of-soul', assign: url => redirects.push(url) }, matchMedia: () => ({ matches: true }), sessionStorage: { getItem: k => storage.get(k) ?? null, removeItem: k => storage.delete(k), setItem: (k, v) => { if (storageDenied) throw Error('STORAGE_DENIED'); writes.push([k, v]); storage.set(k, v); } }, history: { state: null, replaceState() {} } };
    let respond = async () => ({ ok: true, json: async () => ({ saved: true, referenceCode: 'HH-ABCDEF123456' }) });
    let authRespond = async () => ({ ok: true, json: async () => ({ redirectUrl: 'https://auth.fixture.invalid/fictional' }) });
    let profileRespond = async () => ({ ok: false, json: async () => ({}) });
    return { window, writes, navigations, requests, authRequests, profileRequests, redirects, storage,
        setRespond: f => respond = f, setAuthRespond: f => authRespond = f, setProfileRespond: f => profileRespond = f,
        fetch: (url, options = {}) => {
            if (url === '/api/app/auth/contact-profile') { profileRequests.push(url); return profileRespond(); }
            if (url === '/api/app/auth/start') { authRequests.push(options.body); return authRespond(); }
            assert.equal(url, '/api/service-enquiries', 'no other network permitted');
            assert.equal(options.method, 'POST'); requests.push(options.body); return respond(url, options);
        }, router: { push: path => navigations.push(path) } };
}
function mount(name, exportName, initialProps, env = environment()) {
    const instanceId = ++nextMountId;
    let slots = [], index = 0, dirty = true, tree, props = initialProps, pending = [];
    const same = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
    const hooks = {
        useState(initial) { const i = index++; if (!slots[i])
            slots[i] = { value: typeof initial === 'function' ? initial() : initial }; return [slots[i].value, v => { const next = typeof v === 'function' ? v(slots[i].value) : v; if (!Object.is(next, slots[i].value)) {
                slots[i].value = next;
                dirty = true;
            } }]; },
        useCallback(callback, deps) { const i = index++; if (!slots[i] || !same(slots[i].deps, deps)) slots[i] = { value: callback, deps }; return slots[i].value; },
        useRef(initial) { const i = index++; if (!slots[i])
            slots[i] = { current: initial }; return slots[i]; },
        useId() { const i = index++; return `fixture-${instanceId}-${i}`; },
        useEffect(effect, deps) { const i = index++; if (!slots[i] || !same(slots[i].deps, deps)) {
            const prior = slots[i];
            slots[i] = { deps, cleanup: prior?.cleanup };
            pending.push(() => { slots[i].cleanup?.(); slots[i].cleanup = effect(); });
        } },
    };
    hooks.useLayoutEffect = hooks.useEffect;
    const imports = { react: hooks, 'react/jsx-runtime': { jsx: element, jsxs: element, Fragment: 'fragment' }, 'next/navigation': { usePathname: () => env.window.location.pathname, useRouter: () => env.router }, 'next/link': { default: 'a' }, 'next/image': { default: 'img' }, 'lucide-react': new Proxy({}, { get: () => empty }), '@/components/acquisition-event-link': { AcquisitionEventLink: 'a' }, '@/components/phone-country-input': { PhoneCountryInput: 'phone-input' }, '@/components/contact-channel-chooser': { ContactChannelChooser: 'chooser' }, '@/components/public-site-header': { PublicSiteHeader: empty }, '@/components/site-video-player': { SiteVideoPlayer: empty }, '@/data/local-acquisition': { ACQUISITION_EVENTS: [] }, '@/lib/whatsapp-enquiry': whatsapp, '@/lib/organic-event-referrals': organic, '@/lib/paid-ad-referrals': paid, '@/lib/commerce/zen-transfer-inquiry': { buildZenTransferInquiry: () => null }, '@/lib/practitioners/public-service-enquiry-input.mjs': input, '@/lib/practitioners/enquiry-receipt.mjs': receipt };
    const loaded = { exports: {} };
    const code = ts.transpileModule(files[name], { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    vm.runInNewContext(code, { exports: loaded.exports, module: loaded, require: p => { if (p.endsWith('.module.css'))
            return { default: {} }; assert.ok(p in imports, 'unapproved import ' + p); return imports[p]; }, window: env.window, fetch: env.fetch, URL, URLSearchParams, crypto: { randomUUID }, Date, console });
    const component = loaded.exports[exportName];
    function flush() { for (let count = 0; dirty; count++) {
        assert.ok(count < 30, 'render loop');
        dirty = false;
        index = 0;
        pending = [];
        tree = component(props);
        for (const f of pending)
            f();
    } }
    function nodes() { const out = []; function walk(v) { if (Array.isArray(v))
        return v.forEach(walk); if (!v || typeof v !== 'object' || !('type' in v))
        return; out.push(v); walk(v.props.children); } walk(tree); return out; }
    const api = { env, flush, nodes, find: (type, predicate = () => true) => { const n = nodes().find(n => n.type === type && predicate(n.props)); assert.ok(n, 'missing ' + type); return n; }, update: p => { props = { ...props, ...p }; dirty = true; flush(); }, unmount: () => { for (const s of slots)
            s?.cleanup?.(); }, change: (type, predicate, value) => { api.find(type, predicate).props.onChange({ target: { value, checked: value } }); flush(); }, click: (type, predicate) => { api.find(type, predicate).props.onClick(); flush(); }, submit: () => { const result = api.find('form').props.onSubmit({ preventDefault() { } }); flush(); return Promise.resolve(result).finally(flush); } };
    flush();
    return api;
}
function chooser(props = {}, env) { const url = whatsapp.whatsappEnquiryUrl({ locale: 'en', service: 'Fictional service · 30 min · €50', request: 'Fictional availability question', pagePath: '/en/services/alchemy-of-soul' }); return mount('contact-channel-chooser', 'ContactChannelChooser', { locale: 'en', whatsappUrl: url, ...props }, env); }
function fill(f) { f.change('input', p => p.type === 'email', 'fictional@example.test'); f.change('input', p => p.type === 'checkbox', true); f.change('textarea', () => true, 'FICTIONAL OPTIONAL COMMENT'); }
function deferred() { let resolve; const promise = new Promise(r => resolve = r); return { promise, resolve }; }
const success = () => ({ ok: true, json: async () => ({ saved: true, referenceCode: 'HH-ABCDEF123456' }) });
for (const locale of ['en', 'ru', 'es'])
    for (const kind of ['AlchemySoulLeadForm', 'AlchemySoulFormatSelector'])
        for (const format of ['30', '60'])
            test(`${locale} ${kind} ${format}: selected title, original note and strict receipt → actual thank-you component`, async () => {
                const parent = mount('alchemy-soul-lead-form', kind, { locale });
                if (kind === 'AlchemySoulLeadForm')
                    parent.change('select', () => true, format);
                else
                    parent.click('button', p => p['data-alchemy-format'] === format);
                const props = parent.find('chooser').props, env = environment();
                env.window.location.pathname = `/${locale}/services/alchemy-of-soul`;
                const child = chooser(props, env);
                fill(child);
                await child.submit();
                assert.equal(env.requests.length, 1);
                const sent = JSON.parse(env.requests[0]);
                const option = new URL(props.whatsappUrl).searchParams.get('text').split('\n').find(x => /^(Selected option|Выбранный вариант|Opción elegida):/.test(x)).split(': ').slice(1).join(': ');
                assert.ok(sent.serviceTitle.endsWith(option));
                assert.ok(sent.serviceTitle.length <= 160);
                assert.equal(sent.description, 'FICTIONAL OPTIONAL COMMENT');
                assert.equal(sent.contactConsent, true);
                assert.deepEqual(env.navigations, [`/${locale}/thank-you`]);
                const stored = JSON.parse(env.storage.get(receipt.RECEIPT_SESSION_KEY));
                assert.deepEqual(Object.keys(stored).sort(), ['createdAt', 'referenceCode']);
                const thanks = mount('service-enquiry-thank-you', 'ServiceEnquiryThankYou', { locale, video: null }, env);
                assert.equal(thanks.find('strong').props.children, 'HH-ABCDEF123456');
            });
test('invalid contact, no consent, malformed URL and invalid/honeypot fields never POST', async () => {
    for (const variant of ['empty', 'no-consent', 'email', 'url', 'name', 'note', 'website']) {
        const f = chooser(variant === 'url' ? { whatsappUrl: 'invalid' } : {});
        if (variant !== 'empty')
            fill(f);
        if (variant === 'no-consent')
            f.change('input', p => p.type === 'checkbox', false);
        if (variant === 'email')
            f.change('input', p => p.type === 'email', 'bad');
        if (variant === 'name')
            f.change('input', p => p.autoComplete === 'name', 'X');
        if (variant === 'note')
            f.change('textarea', () => true, 'x'.repeat(1401));
        if (variant === 'website')
            f.change('input', p => p.name === 'website', 'bot');
        await f.submit();
        assert.equal(f.env.requests.length, 0, variant);
        assert.equal(f.env.writes.length, 0, variant);
    }
});
test('same-tick duplicate submit is blocked, uncertain response freezes parent and retries identical body', async () => {
    const parent = mount('alchemy-soul-lead-form', 'AlchemySoulFormatSelector', { locale: 'en' });
    const f = chooser(parent.find('chooser').props), pending = deferred();
    fill(f);
    f.env.setRespond(() => pending.promise);
    const raw = f.find('form').props.onSubmit;
    const p = raw({ preventDefault() { } });
    const repeated = raw({ preventDefault() { } });
    f.flush();
    assert.equal(f.env.requests.length, 1);
    parent.flush();
    assert.ok(parent.find('button', p => p['data-alchemy-format'] === 'month').props.disabled);
    assert.ok(f.find('input', p => p.type === 'email').props.disabled);
    pending.resolve({ ok: false, json: async () => ({ error: 'UNKNOWN' }) });
    await p;
    await repeated;
    f.flush();
    assert.equal(f.env.writes.length, 0);
    assert.equal(f.env.navigations.length, 0);
    assert.ok(f.find('input', p => p.type === 'email').props.disabled);
    f.change('input', p => p.type === 'email', 'changed@example.test');
    f.change('textarea', () => true, 'CHANGED FICTIONAL NOTE');
    f.env.setRespond(success);
    await f.submit();
    assert.equal(f.env.requests.length, 2);
    assert.equal(f.env.requests[0], f.env.requests[1]);
    parent.flush();
    assert.equal(parent.find('button', p => p['data-alchemy-format'] === 'month').props.disabled, false);
});
test('context change suppresses stale success and blocks new UUID; original context retries exact payload', async () => {
    const f = chooser(), pending = deferred();
    fill(f);
    f.env.setRespond(() => pending.promise);
    const p = f.submit();
    const changed = whatsapp.whatsappEnquiryUrl({ locale: 'en', service: 'Changed service', request: 'Fictional request' });
    f.update({ whatsappUrl: changed });
    pending.resolve(success());
    await p;
    assert.equal(f.env.writes.length, 0);
    assert.equal(f.env.navigations.length, 0);
    await f.submit();
    assert.equal(f.env.requests.length, 1);
    const old = whatsapp.whatsappEnquiryUrl({ locale: 'en', service: 'Fictional service · 30 min · €50', request: 'Fictional availability question', pagePath: '/en/services/alchemy-of-soul' });
    f.update({ whatsappUrl: old });
    f.env.setRespond(success);
    await f.submit();
    assert.equal(f.env.requests.length, 2);
    assert.equal(f.env.requests[0], f.env.requests[1]);
    assert.deepEqual(f.env.navigations, ['/en/thank-you']);
});
test('unmount suppresses receipt and route after late success', async () => { const f = chooser(), pending = deferred(); fill(f); f.env.setRespond(() => pending.promise); const p = f.submit(); f.unmount(); pending.resolve(success()); await p; assert.equal(f.env.writes.length, 0); assert.equal(f.env.navigations.length, 0); });
test('storage-denied fallback retains format/reference and excludes note/contact from both messenger links', async () => {
    const f = chooser({}, environment({ storageDenied: true }));
    fill(f);
    await f.submit();
    assert.equal(f.env.navigations.length, 0);
    assert.equal(f.env.writes.length, 0);
    for (const channel of ['whatsapp', 'telegram']) {
        const n = f.find('a', p => p.attributes?.['data-contact-channel'] === channel), text = new URL(n.props.href).searchParams.get('text');
        assert.match(text, /30 min · €50/);
        assert.match(text, /HH-ABCDEF123456/);
        assert.doesNotMatch(text, /fictional@example|FICTIONAL OPTIONAL COMMENT/);
    }
});
test('failed or malformed save never creates receipt or navigation and retry stays same operation', async () => {
    for (const result of [{ ok: false, json: async () => ({}) }, { ok: true, json: async () => ({ saved: true, referenceCode: 'INVALID' }) }, { ok: true, json: async () => ({ saved: true, referenceCode: ['HH-ABCDEF123456'] }) }, { ok: true, json: async () => { throw Error('BAD_JSON'); } }]) {
        const f = chooser();
        fill(f);
        f.env.setRespond(async () => result);
        await f.submit();
        assert.equal(f.env.writes.length, 0);
        assert.equal(f.env.navigations.length, 0);
        assert.ok(f.find('input', p => p.type === 'email').props.disabled);
        f.env.setRespond(success);
        await f.submit();
        assert.equal(f.env.requests[0], f.env.requests[1]);
    }
});

test('phone channel validates before POST without carrying the hidden email', async () => {
    const f = chooser();
    f.click('button', p => p['aria-pressed'] === false);
    f.find('phone-input').props.onChange('bad');
    f.flush();
    f.change('input', p => p.type === 'checkbox', true);
    await f.submit();
    assert.equal(f.env.requests.length, 0);
    f.find('phone-input').props.onChange('+1 (416) 555-0123');
    f.flush();
    await f.submit();
    const sent = JSON.parse(f.env.requests[0]);
    assert.equal(sent.contact.phone, '+14165550123');
    assert.equal(sent.contact.email, '');
});

test('existing quick in-place flow retains public topic and only confirmed New enquiry clears snapshot', async () => {
    const f = chooser({ quick: true, stayAfterSave: true, publicTopic: 'Fictional public topic' });
    f.change('input', p => p.type === 'email', 'fictional@example.test');
    f.change('input', p => p.type === 'checkbox', true);
    await f.submit();
    assert.equal(f.env.navigations.length, 0);
    assert.equal(JSON.parse(f.env.requests[0]).description, 'Fictional public topic');
    f.click('button', p => p.children === 'New enquiry');
    f.change('input', p => p.type === 'email', 'second@example.test');
    assert.equal(f.find('input', p => p.type === 'checkbox').props.checked, false);
    await f.submit();
    assert.equal(f.env.requests.length, 1, 'New enquiry needs fresh explicit opt-in');
    f.change('input', p => p.type === 'checkbox', true);
    await f.submit();
    assert.equal(f.env.requests.length, 2);
    assert.notEqual(JSON.parse(f.env.requests[0]).operationId, JSON.parse(f.env.requests[1]).operationId);
    assert.equal(f.env.navigations.length, 0);
});

const google = f => f.find('button', p => p['aria-label'] === 'Continue with Google').props.onClick;
const profileSuccess = () => ({ok:true,json:async()=>({email:'google@example.test',displayName:'Fictional Google'})});
const tick = async f => { await new Promise(resolve => setImmediate(resolve)); f.flush(); };

test('child unmount releases its parent lock, never a newer child lock', async () => {
    const parent = mount('alchemy-soul-lead-form','AlchemySoulFormatSelector',{locale:'en'});
    const callback = parent.find('chooser').props.onSubmissionLockChange;
    const first = chooser({onSubmissionLockChange:callback}), pending = deferred();
    fill(first); first.env.setRespond(()=>pending.promise); const firstPromise = first.submit();
    parent.flush(); assert.equal(parent.find('button',p=>p['data-alchemy-format']==='30').props.disabled,true);
    first.unmount(); parent.flush(); assert.equal(parent.find('button',p=>p['data-alchemy-format']==='30').props.disabled,false);
    const second = chooser({onSubmissionLockChange:callback}), next = deferred();
    fill(second); second.env.setRespond(()=>next.promise); const secondPromise = second.submit();
    parent.flush(); first.unmount(); parent.flush();
    assert.equal(parent.find('button',p=>p['data-alchemy-format']==='30').props.disabled,true);
    pending.resolve(success()); await firstPromise; parent.flush();
    assert.equal(parent.find('button',p=>p['data-alchemy-format']==='30').props.disabled,true);
    next.resolve(success()); await secondPromise; parent.flush();
    assert.equal(parent.find('button',p=>p['data-alchemy-format']==='30').props.disabled,false);
});

for (const changed of ['context','unmount']) test(`stale auth-start after ${changed} cannot write marker or navigate`, async () => {
    const env = environment(), pending = deferred(); env.setAuthRespond(()=>pending.promise);
    const f = chooser({},env), start = google(f), running = start(); f.flush();
    const repeated = start(); assert.equal(env.authRequests.length,1);
    if (changed === 'context') f.update({resetKey:'changed-context'}); else f.unmount();
    pending.resolve({ok:true,json:async()=>({redirectUrl:'https://auth.fixture.invalid/fictional'})}); await running; await repeated; f.flush();
    assert.equal(env.redirects.length,0); assert.equal(env.writes.length,0); assert.equal(env.requests.length,0);
    if (changed === 'context') assert.equal(f.find('button',p=>p['aria-label']==='Continue with Google').props.disabled,false);
});

test('normal auth-start retains public-only marker and parent lock until navigation unmount', async () => {
    const parent=mount('alchemy-soul-lead-form','AlchemySoulLeadForm',{locale:'en'}), f=chooser(parent.find('chooser').props);
    await google(f)();f.flush();parent.flush();
    assert.equal(f.env.redirects.length,1);assert.equal(f.env.requests.length,0);
    const marker=JSON.parse(f.env.storage.get('hh-google-enquiry-return'));
    assert.deepEqual(Object.keys(marker).sort(),['panel','path','service']);
    assert.match(marker.service,/60 min · €100/);assert.equal(parent.find('select').props.disabled,true);
    f.unmount();parent.flush();assert.equal(parent.find('select').props.disabled,false);
});

test('auth-start denied storage set/remove and rejected redirect recover without stuck busy', async () => {
    for(const mode of ['set','remove']) {
        const env=environment({storageDenied:mode==='set'});
        env.window.sessionStorage.removeItem=()=>{throw Error('DENIED_REMOVE')};
        if(mode==='remove')env.window.location.assign=()=>{throw Error('DENIED_NAVIGATION')};
        const f=chooser({},env);await google(f)();f.flush();
        assert.equal(env.redirects.length,0);assert.equal(env.requests.length,0);
        assert.equal(f.find('button',p=>p['aria-label']==='Continue with Google').props.disabled,false);
    }
});

function prepareReturn(f) {
    const panel=f.find('button',p=>p['data-contact-order']!==undefined).props['aria-controls'];
    f.env.window.location.href='https://fixture.invalid/en/services/alchemy-of-soul?hh_enquiry=google';
    f.env.storage.set('hh-google-enquiry-return',JSON.stringify({path:'/en/services/alchemy-of-soul',service:'Fictional service · 30 min · €50',panel}));
    f.update({resetKey:'google-return'});
}

test('Google return marker denied get/remove stops safely before profile or navigation', async () => {
    for(const mode of ['getItem','removeItem']) {
        const f=chooser();f.env.window.sessionStorage[mode]=()=>{throw Error('STORAGE_DENIED')};
        prepareReturn(f);await tick(f);assert.equal(f.env.profileRequests.length,0);assert.equal(f.env.requests.length,0);assert.equal(f.env.redirects.length,0);
    }
});

for(const kind of ['quick','return'])test(`late ${kind} profile cannot change locked request or erase unknown-result error`,async()=>{
    const env=environment(),profile=deferred();env.setProfileRespond(()=>profile.promise);
    const f=chooser({quick:kind==='quick'},env);if(kind==='return')prepareReturn(f);
    if(kind==='quick'){f.change('input',p=>p.type==='email','fictional@example.test');f.change('input',p=>p.type==='checkbox',true);}else fill(f);
    env.setRespond(async()=>({ok:false,json:async()=>({error:'UNKNOWN'})}));await f.submit();
    const error=f.find('p',p=>p.role==='alert').props.children;
    profile.resolve(profileSuccess());await tick(f);
    assert.equal(f.find('input',p=>p.type==='email').props.value,'fictional@example.test');
    assert.equal(f.find('p',p=>p.role==='alert').props.children,error);
    assert.equal(JSON.parse(env.requests[0]).contact.displayName,'');
    env.setRespond(success);await f.submit();assert.equal(env.requests[0],env.requests[1]);
});

test('quick profile from prior context is cancelled; latest context alone can prefill',async()=>{
    const env=environment(),old=deferred(),fresh=deferred();let count=0;env.setProfileRespond(()=>++count===1?old.promise:fresh.promise);
    const f=chooser({quick:true},env);f.update({resetKey:'second-context'});
    old.resolve(profileSuccess());await tick(f);assert.equal(f.find('input',p=>p.type==='email').props.value,'');
    fresh.resolve({ok:true,json:async()=>({email:'latest@example.test',displayName:'Latest Fictional'})});await tick(f);
    assert.equal(f.find('input',p=>p.type==='email').props.value,'latest@example.test');assert.equal(env.requests.length,0);
});

test('referral changes cannot replace the frozen public handoff or request body', async () => {
    const env=environment(),pending=deferred();
    env.window.location.search='?utm_source=facebook&utm_medium=organic_event&utm_campaign=fictional-original';
    const f=chooser({stayAfterSave:true},env);fill(f);env.setRespond(()=>pending.promise);const running=f.submit();
    env.window.location.pathname='/en/services/free-situation-review';
    env.window.location.search='?utm_source=facebook&utm_medium=organic_event&utm_campaign=fictional-later';f.update({});
    env.window.location.pathname='/en/services/alchemy-of-soul';f.update({});
    pending.resolve(success());await running;
    const draft=new URL(f.find('a',p=>p.attributes?.['data-contact-channel']==='whatsapp').props.href).searchParams.get('text');
    assert.match(draft,/fictional-original/);assert.doesNotMatch(draft,/fictional-later|FICTIONAL OPTIONAL COMMENT|fictional@example/);
    assert.equal(env.requests.length,1);assert.equal(JSON.parse(env.requests[0]).description,'FICTIONAL OPTIONAL COMMENT');
});

// Reconciled with target d643ca98: quick and standard flows require fresh opt-in.
for (const locale of ['en', 'ru', 'es']) for (const quick of [false, true]) {
    test(`${locale} quick=${quick}: visible unchecked reply consent gates submission and resets with context`, async () => {
        const env = environment(); env.window.location.pathname = `/${locale}/services/alchemy-of-soul`;
        const f = chooser({ locale, quick }, env);
        const checkbox = () => f.find('input', p => p.type === 'checkbox');
        assert.equal(checkbox().props.checked, false); assert.equal(checkbox().props.required, true);
        f.change('input', p => p.type === 'email', 'fictional@example.test');
        assert.equal(f.find('button', p => p.type === 'submit').props.disabled, true);
        await f.submit(); assert.equal(env.requests.length, 0); assert.equal(env.writes.length, 0);
        f.change('input', p => p.type === 'checkbox', true);
        assert.equal(f.find('button', p => p.type === 'submit').props.disabled, false);
        f.update({ resetKey: 'fresh-context' });
        assert.equal(checkbox().props.checked, false);
        f.change('input', p => p.type === 'email', 'fictional@example.test');
        await f.submit(); assert.equal(env.requests.length, 0);
        f.change('input', p => p.type === 'checkbox', true); await f.submit();
        assert.equal(env.requests.length, 1); assert.equal(JSON.parse(env.requests[0]).contactConsent, true);
    });
}

test('quick Google prefill supplies contact but never supplies reply consent', async () => {
    const env = environment(); env.setProfileRespond(async () => profileSuccess());
    const f = chooser({ quick: true }, env); await tick(f);
    assert.equal(f.find('input', p => p.type === 'email').props.value, 'google@example.test');
    assert.equal(f.find('input', p => p.type === 'checkbox').props.checked, false);
    assert.equal(f.find('button', p => p.type === 'submit').props.disabled, true);
    await f.submit(); assert.equal(env.requests.length, 0);
    f.change('input', p => p.type === 'checkbox', true); await f.submit();
    assert.equal(env.requests.length, 1); assert.equal(JSON.parse(env.requests[0]).contactConsent, true);
});

test('quick uncertain result keeps explicit consent frozen for identical replay', async () => {
    const env = environment(); const f = chooser({ quick: true }, env);
    f.change('input', p => p.type === 'email', 'fictional@example.test');
    f.change('input', p => p.type === 'checkbox', true);
    env.setRespond(async () => ({ ok: false, json: async () => ({ error: 'UNKNOWN' }) }));
    await f.submit();
    assert.equal(f.find('input', p => p.type === 'checkbox').props.disabled, true);
    assert.equal(f.find('input', p => p.type === 'checkbox').props.checked, true);
    env.setRespond(success); await f.submit();
    assert.equal(env.requests.length, 2); assert.equal(env.requests[0], env.requests[1]);
    assert.equal(JSON.parse(env.requests[1]).contactConsent, true);
});
