// Actual chooser + actual submission scope with the same keyed hook scheduling
// as public-enquiry-component-lifecycle.test.mjs. The actual PhoneCountryInput,
// pure phone-country module and URL/referral helpers are loaded explicitly.
// Browser APIs/decorative children and hook scheduling remain synthetic.
// Not mounted React, browser/native validation, backend storage or delivery QA.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import * as enquiries from '../../lib/whatsapp-enquiry.js';
import * as organic from '../../lib/organic-event-referrals.js';
import * as paid from '../../lib/paid-ad-referrals.js';
import { assertPreparedContactChannels } from '../../scripts/helpers/contact-channel-verifier.mjs';
const read = path => readFileSync(new URL('../../' + path, import.meta.url), 'utf8');
const compile = (source, path) => ts.transpileModule(source, { fileName: path, compilerOptions: {
  jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
} }).outputText;
const same = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
const description = 'Synthetic request about available consultation times.';
export function savedSuffix(locale, referenceCode) {
  const label = { en: 'Enquiry', ru: 'Заявка', es: 'Solicitud' }[locale];
  return '\n\n' + label + ': ' + referenceCode;
}
export function mountSavedChooser(locale, fault, reducedMotion = false, locationOptions = {}) {
  let choice = 'session', instance, active, tree, dirty = true, disposed = false, serial = 0, uuid = 0, externalClicks = 0;
  const calls = [], attempts = [], queue = [], scrollCalls = [], channelClicks = [], stateAfterUnmount = [], mutations = [];
  const location = { pathname: '/' + locale + '/services/psychohomeopathy', search: '', ...locationOptions };
  Object.defineProperty(location, 'href', { get: () => 'http://127.0.0.1:3100' + location.pathname + location.search });
  location.assign = () => assert.fail('Provider navigation is forbidden');
  const hooks = {
    useState(initial) { const inst = active, index = inst.cursor++;
      inst.slots[index] ??= { value: typeof initial === 'function' ? initial() : initial };
      return [inst.slots[index].value, update => {
        if (!inst.alive) { stateAfterUnmount.push(update); return; }
        const value = typeof update === 'function' ? update(inst.slots[index].value) : update;
        if (!Object.is(value, inst.slots[index].value)) { inst.slots[index].value = value; dirty = true; }
      }];
    },
    useRef(initial) { return active.slots[active.cursor++] ??= { current: initial }; },
    useId() { return (active.slots[active.cursor++] ??= { value: 'synthetic-' + ++serial }).value; },
    useEffect(callback, deps) { const inst = active, index = inst.cursor++;
      if (!same(inst.slots[index]?.deps, deps)) inst.effects.push(() => {
        inst.slots[index]?.cleanup?.(); inst.slots[index] = { deps, cleanup: callback() };
      });
    },
  };
  const jsx = (type, props, key) => ({ type, props: props || {}, key });
  const modules = {
    react: hooks, 'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'Fragment' },
    'next/navigation': { usePathname: () => location.pathname },
    'lucide-react': Object.fromEntries(['ChevronDown', 'MessageCircle', 'Send', 'ShoppingBag'].map(name => [name, () => null])),
    '@/components/acquisition-event-link': { AcquisitionEventLink: ({ attributes, ...props }) => jsx('a', { ...props, ...attributes }) },
    '@/lib/whatsapp-enquiry': enquiries, '@/lib/organic-event-referrals': organic, '@/lib/paid-ad-referrals': paid,
    './contact-channel-chooser.module.css': { default: {} },
    './phone-country-input.module.css': { default: {} },
  };
  function mutate(source, before, after) { assert.ok(source.includes(before), fault + ' mutation reached actual source');
    mutations.push(fault); return source.replace(before, after); }
  function load(path) {
    let source = read(path);
    if (path.endsWith('contact-channel-chooser.tsx')) {
      if (fault === 'initially open') source = mutate(source, 'const [open, setOpen] = useState(false)', 'const [open, setOpen] = useState(true)');
      if (fault === 'blocked trigger') source = mutate(source, 'onClick={() => setOpen((value) => !value)}', 'onClick={() => {}}');
      if (fault === 'missing selection reset') source = mutate(source, 'key={JSON.stringify([pathname, props.whatsappUrl, props.locale])}', 'key="unchanging-scope"');
      if (fault === 'unrecognized dependency') source = mutate(source, '@/lib/paid-ad-referrals', '@/lib/not-allowlisted');
      if (fault === 'bypassed consent') source = mutate(source, '|| !consent) {', ') {');
      if (fault === 'immediate unsaved links') source = mutate(source, 'useState<SavedEnquiry | null>(null)',
        'useState<SavedEnquiry | null>({ saved: true, referenceCode: "HH-000000000001" })');
      if (fault === 'stale receipt on remount') source = mutate(source, 'useState<SavedEnquiry | null>(null)',
        'useState<SavedEnquiry | null>(window.location.pathname.endsWith("/stale-fixture") ? { saved: true, referenceCode: "HH-000000000001" } : null)');
    }
    if (path.endsWith('public-enquiry-submission.js') && fault === 'invalid receipt accepted')
      source = mutate(source, 'data?.saved === true', 'data?.saved !== undefined');
    const runtime = { exports: {}, URL, URLSearchParams, AbortController,
      window: { location, matchMedia: () => ({ matches: reducedMotion }) },
      crypto: { randomUUID: () => `00000000-0000-4000-8000-${String(++uuid).padStart(12, '0')}` },
      require(name) { assert.ok(Object.hasOwn(modules, name), 'Unrecognized dependency: ' + name); return modules[name]; },
      fetch: async (url, options) => {
        attempts.push({ url, ...options });
        assert.equal(url, '/api/service-enquiries'); assert.equal(options.method, 'POST');
        assert.equal(options.credentials, 'same-origin'); assert.ok(queue.length, 'No automatic or unplanned request');
        calls.push({ url, ...options }); return queue.shift()();
      },
    };
    runInNewContext(compile(source, path), runtime, { timeout: 1000 }); return runtime.exports;
  }
  modules['@/lib/practitioners/public-enquiry-submission'] = load('lib/practitioners/public-enquiry-submission.js');
  modules['@/lib/contact/phone-country'] = load('lib/contact/phone-country.js');
  modules['@/components/phone-country-input'] = load('components/phone-country-input.tsx');
  const { PhoneCountryInput } = modules['@/components/phone-country-input'];
  const component = load('components/contact-channel-chooser.tsx');
  function cleanupInstance(inst) { if (inst) { inst.slots.forEach(slot => slot?.cleanup?.()); inst.alive = false; } }
  function cleanup() { cleanupInstance(instance?.phone); cleanupInstance(instance); }
  // The real stateful phone child gets its own hook slots, exactly once per
  // synthetic render. Queries must never call it or append hooks to the form.
  function resolvePhone(node) {
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
  }
  function render() {
    assert.ok(!disposed); dirty = false;
    const wrapper = component.ContactChannelChooser({ locale,
      whatsappUrl: enquiries.whatsappEnquiryUrl({ locale, service: 'Consultation',
        request: choice === 'session' ? 'Personal session 60 minutes €100' : 'Questions 30 minutes €50',
        pagePath: '/' + locale + '/services/psychohomeopathy?private=never-share' }),
      attributes: { 'data-consultation-action': choice }, onChannelClick: channel => channelClicks.push(channel) });
    if (!instance || instance.key !== wrapper.key || instance.type !== wrapper.type) {
      cleanup(); instance = { type: wrapper.type, key: wrapper.key, slots: [], alive: true };
    }
    active = instance; instance.cursor = 0; instance.effects = [];
    instance.phoneSeen = false;
    tree = resolvePhone(wrapper.type(wrapper.props));
    if (!instance.phoneSeen) { cleanupInstance(instance.phone); instance.phone = null; }
    collect(false); instance.phone?.effects.forEach(effect => effect()); instance.effects.forEach(effect => effect());
  }
  function collect(applyFault = true) {
    const result = [];
    function visit(node, hidden = false) {
      if (!node || typeof node !== 'object') return;
      if (Array.isArray(node)) { node.forEach(child => visit(child, hidden)); return; }
      if (typeof node.type === 'function') { visit(node.type(node.props), hidden); return; }
      const invisible = hidden || Boolean(node.props.hidden);
      if (node.props.ref) node.props.ref.current = {
        scrollIntoView: options => scrollCalls.push({ ...options }),
        querySelector(selector) {
          assert.equal(selector, '[data-contact-channel="whatsapp"]');
          return result.some(n => n.type === 'a' && n.props['data-contact-channel'] === 'whatsapp')
            ? { scrollIntoView: options => scrollCalls.push({ ...options }) } : null;
        },
      };
      result.push({ ...node, props: { ...node.props }, hidden: invisible }); visit(node.props.children, invisible);
    }
    visit(tree);
    if (!applyFault) return result;
    const wa = result.find(node => node.props['data-contact-channel'] === 'whatsapp');
    const tg = result.find(node => node.props['data-contact-channel'] === 'telegram');
    // Channel faults affect only the actual post-receipt elements, never invent links.
    if (!wa || !tg) return result;
    if (fault === 'missing telegram') return result.filter(node => node !== tg);
    if (fault === 'duplicate channel') result.push({ ...wa });
    if (fault === 'wrong recipient') wa.props.href = wa.props.href.replace('14376066502', '10000000000');
    if (fault === 'wrong host') tg.props.href = tg.props.href.replace('https://t.me', 'https://evil.example');
    if (fault === 'extra query') wa.props.href += '&private=secret';
    if (fault === 'empty message') wa.props.href = 'https://wa.me/14376066502?text=';
    if (fault === 'changed telegram message') tg.props.href = 'https://t.me/AndyTherapist?text=other';
    if (fault === 'missing safety rel') wa.props.rel = 'noreferrer';
    if (fault === 'same tab') tg.props.target = '_self';
    if (fault === 'hidden after open') tg.hidden = true;
    return result;
  }
  function nodes() { for (let pass = 0; dirty; pass++) { assert.ok(pass < 20, 'Effects settle'); render(); } return collect(); }
  function locator(selector) {
    const match = selector.match(/^(a|button|form|input|textarea|select|details|summary)?(?:\[([\w-]+)(?:="([^"]+)")?\])?$/);
    assert.ok(match && (match[1] || match[2]), 'Explicitly supported selector: ' + selector);
    const selected = () => nodes().filter(node => (!match[1] || node.type === match[1]) && (!match[2] || Object.hasOwn(node.props, match[2])) && (match[3] === undefined || node.props[match[2]] === match[3]));
    return { locator, selected, async getAttribute(name) { const all = selected(); assert.equal(all.length, 1); return all[0].props[name] ?? null; },
      async click() { const all = selected(); assert.equal(all.length, 1);
        if (all[0].type === 'a') { externalClicks++; assert.fail('Never open a messenger link'); }
        all[0].props.onClick(); nodes();
      } };
  }
  const content = node => node == null ? '' : Array.isArray(node) ? node.map(content).join('') : typeof node === 'object' ? content(node.props?.children) : String(node);
  const expect = actual => ({
    async toHaveCount(count) { assert.equal(actual.selected().length, count); },
    async toContainText(expected) { const all = actual.selected(); assert.equal(all.length, 1); assert.ok(content(all[0]).includes(expected), 'Rendered status contains its exact saved reference'); },
    async toBeVisible() { assert.equal(actual.selected().length, 1); assert.equal(actual.selected()[0].hidden, false); },
    async toBeHidden() { assert.equal(actual.selected().length, 1); assert.equal(actual.selected()[0].hidden, true); },
    async toHaveAttribute(name, expected) { const value = await actual.getAttribute(name); const actualValue = value == null ? null : String(value);
      if (expected instanceof RegExp) assert.match(actualValue, expected); else assert.equal(actualValue, expected); },
  });
  const mounted = { locale, calls, attempts, get pathname() { return location.pathname; }, mutations, queue, scrollCalls, channelClicks, stateAfterUnmount,
    scope: { locator }, expect, nodes, referenceCode: null, savedReceipt: null,
    get scopeIdentity() { nodes(); return instance; },
    choose(value) { choice = value; dirty = true; }, navigate(pathname, search) { Object.assign(location, { pathname, search }); dirty = true; },
    externalClicks: () => externalClicks, field(type) { return nodes().find(n => n.type === 'input' && (n.props.autoComplete === type || n.props.type === type)); },
    async change(type, value) { const field = ['textarea', 'select'].includes(type) ? nodes().find(n => n.type === type) : mounted.field(type);
      assert.ok(field && !field.props.disabled); field.props.onChange({ target: { value, checked: value } }); await mounted.settle(); },
    async settle() { for (let i = 0; i < 12; i++) { await Promise.resolve(); if (!disposed) nodes(); } },
    post() { return nodes().find(n => n.type === 'form').props.onSubmit({ preventDefault() {} }); },
    unmount() { cleanup(); disposed = true; tree = null; assert.equal(stateAfterUnmount.length, 0); },
  };
  nodes(); return mounted;
}

export async function openSavedContactChooser(mounted, reply = 'saved', note = description) {
  const { scope, expect } = mounted, chooser = scope.locator('[data-contact-channel-chooser]');
  const trigger = chooser.locator('button[data-contact-order]');
  await expect(chooser).toHaveCount(1); await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  const hasForm = chooser.locator('form').selected().length === 1;
  await expect(chooser.locator('a[data-contact-channel]')).toHaveCount(hasForm ? 0 : 2);
  if (hasForm) {
    assert.equal(mounted.field('name').props.value, ''); assert.equal(mounted.field('checkbox').props.checked, false);
    assert.equal(mounted.field('email').props.value, '');
    assert.equal(mounted.field('tel'), undefined, 'Phone child is absent until selected');
    assert.equal(chooser.locator('select').selected().length, 0);
    const noteDisclosure = chooser.locator('details').selected().filter(node => node.props.children.some?.(child => child?.type === 'textarea'));
    assert.equal(noteDisclosure.length, 1);
    assert.equal(Boolean(noteDisclosure[0].props.open), false, 'Optional note starts collapsed');
    assert.equal(Boolean(chooser.locator('textarea').selected()[0].props.required), false);
  } else {
    assert.ok(mounted.calls.length > 0 && mounted.savedReceipt && mounted.referenceCode,
      'Formless reopening requires a prior confirmed synthetic receipt');
    assert.equal(mounted.savedReceipt.scope, mounted.scopeIdentity, 'Saved receipt belongs to this exact keyed form scope');
    assert.equal(mounted.savedReceipt.referenceCode, mounted.referenceCode);
    await expect(chooser.locator('[role="status"]')).toContainText(mounted.savedReceipt.referenceCode);
  }
  await trigger.click(); await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  if (hasForm) {
    const previous = mounted.calls.length, previousAttempts = mounted.attempts.length;
    for (const [type, value] of [['name', 'Synthetic Visitor'], ['email', 'visitor@example.test'], ['textarea', note]]) await mounted.change(type, value);
    assert.equal(mounted.nodes().find(n => n.type === 'button' && n.props.type === 'submit').props.disabled, true);
    await mounted.post(); await mounted.settle();
    assert.equal(mounted.attempts.length, previousAttempts, 'No request without explicit reply consent');
    assert.equal(mounted.calls.length, previous);
    await mounted.change('checkbox', true);
    let release; mounted.queue.push(() => new Promise(resolve => { release = resolve; }));
    const saving = mounted.post(); await mounted.settle();
    assert.equal(mounted.calls.length, previous + 1);
    await expect(chooser.locator('a[data-contact-channel]')).toHaveCount(0);
    await expect(chooser.locator('[role="status"]')).toHaveCount(0);
    assert.ok(mounted.nodes().filter(n => ['input', 'textarea', 'select'].includes(n.type)).every(n => n.props.disabled));
    const body = JSON.parse(mounted.calls.at(-1).body);
    assert.deepEqual(body, { serviceTitle: 'Consultation', description: note.trim(), sourcePath: mounted.pathname,
      locale: mounted.locale, contact: { displayName: 'Synthetic Visitor', email: 'visitor@example.test', phone: '' }, contactConsent: true, website: '', operationId: body.operationId });
    assert.match(body.operationId, /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i);
    mounted.referenceCode = 'HH-' + String(mounted.calls.length).padStart(12, '0');
    release({ status: reply === 'error' ? 503 : 201, ok: reply !== 'error', json: async () => ({ saved: reply !== 'not-saved', referenceCode: reply === 'bad-reference' ? 'invalid' : mounted.referenceCode }) });
    await saving; await mounted.settle();
    await expect(chooser.locator('form')).toHaveCount(0);
    await expect(chooser.locator('[role="status"]')).toHaveCount(1);
    await expect(chooser.locator('[role="status"]')).toContainText(mounted.referenceCode);
    if (reply === 'saved') mounted.savedReceipt = { scope: mounted.scopeIdentity, referenceCode: mounted.referenceCode };
  }
  const prepared = await assertPreparedContactChannels(chooser, expect);
  for (const url of [prepared.whatsappUrl, prepared.telegramUrl]) {
    const message = url.searchParams.get('text');
    assert.ok(message.endsWith(savedSuffix(mounted.locale, mounted.referenceCode)));
    for (const privateValue of [note.trim(), 'Synthetic Visitor', 'visitor@example.test'].filter(Boolean))
      assert.ok(!message.includes(privateValue), 'Private contact and optional note stay out of messenger drafts');
  }
  return chooser;
}
