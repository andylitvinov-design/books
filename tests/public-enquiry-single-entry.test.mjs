// Executes the actual quick-entry parents, chooser, submission helper and URL
// helper with deterministic hook scheduling. This is NOT mounted React, DOM,
// native form-validation, accessibility or browser/layout evidence. Every request
// is synthetic; no storage, database or messenger is contacted.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const compiled = new Map();
function compile(path) {
  if (!compiled.has(path)) compiled.set(path, ts.transpileModule(source(path), {
    fileName: path, compilerOptions: { module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText);
  return compiled.get(path);
}
const nodes = tree => !tree || typeof tree !== 'object' ? [] : Array.isArray(tree)
  ? tree.flatMap(nodes) : [tree, ...nodes(tree.props?.children)];
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
const receipt = () => ({ ok: true, status: 201, json: async () => ({ saved: true, referenceCode: 'HH-123456789ABC' }) });

function mount(kind, locale) {
  const path = '/' + locale + '/services/' + ({ situation: 'free-situation-review', dao: 'dao-health-profile', alchemy: 'alchemy-of-soul' })[kind];
  let current, dirty = false, tree, nextId = 0, uuid = 0;
  const instances = new Map(), calls = [], queue = [], writesAfterUnmount = [];
  const jsx = (type, props, key) => ({ type, props: props || {}, key });
  const hooks = {
    useState(initial) {
      const instance = current, index = instance.cursor++;
      if (!(index in instance.slots)) instance.slots[index] = typeof initial === 'function' ? initial() : initial;
      return [instance.slots[index], value => {
        if (!instance.alive) { writesAfterUnmount.push(index); return; }
        const next = typeof value === 'function' ? value(instance.slots[index]) : value;
        if (!Object.is(next, instance.slots[index])) { instance.slots[index] = next; dirty = true; }
      }];
    },
    useRef(initial) { const index = current.cursor++; return current.slots[index] ||= { current: initial }; },
    useId() { const index = current.cursor++; return current.slots[index] ||= 'synthetic-' + ++nextId; },
    useEffect(callback, deps) {
      const instance = current, index = instance.cursor++, old = instance.slots[index];
      if (!old || !deps || deps.some((value, i) => !Object.is(value, old.deps[i]))) {
        instance.effects.push(() => { old?.cleanup?.(); instance.slots[index] = { deps, cleanup: callback() }; });
      }
    },
  };
  const modules = {
    react: hooks, 'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'Fragment' },
    'next/navigation': { usePathname: () => path }, 'next/link': { default: 'Link' },
    'lucide-react': new Proxy({}, { get: (_, name) => String(name) }),
    '@/components/acquisition-event-link': { AcquisitionEventLink: 'AcquisitionEventLink' },
    '@/data/local-acquisition': { ACQUISITION_EVENTS: [] },
    '@/lib/organic-event-referrals': { readOrganicEventReferral: () => null, withOrganicEventReferral: url => url },
    '@/lib/paid-ad-referrals': { readPaidAdReferral: () => null, withPaidAdReferral: url => url },
    '@/lib/commerce/zen-transfer-inquiry': { buildZenTransferInquiry: () => { throw Error('Unrelated payment selector must not run'); } },
  };
  function load(filename) {
    const context = { exports: {}, URL, URLSearchParams, AbortController,
      require(name) { if (name.endsWith('.module.css')) return { default: new Proxy({}, { get: (_, key) => key }) };
        assert.ok(modules[name], 'Unexpected import: ' + name); return modules[name]; },
      window: { location: { search: '', pathname: path }, matchMedia: () => ({ matches: true }) },
      navigator: { clipboard: { writeText() { throw Error('Quick entry must not copy private text'); } } },
      crypto: { randomUUID: () => `00000000-0000-4000-8000-${String(++uuid).padStart(12, '0')}` },
      fetch: async (url, options) => { assert.equal(url, '/api/service-enquiries'); assert.ok(queue.length, 'Unexpected automatic request');
        calls.push({ url, ...options }); return queue.shift()(); },
    };
    vm.runInNewContext(compile(filename), context, { timeout: 1000 });
    return context.exports;
  }
  modules['@/lib/whatsapp-enquiry'] = load('lib/whatsapp-enquiry.js');
  modules['@/lib/practitioners/public-enquiry-submission'] = load('lib/practitioners/public-enquiry-submission.js');
  modules['@/components/contact-channel-chooser'] = load('components/contact-channel-chooser.tsx');
  const Component = kind === 'alchemy' ? load('components/alchemy-soul-lead-form.tsx').AlchemySoulLeadForm
    : load('components/free-resource-enquiry.tsx').FreeResourceEnquiry;
  const cleanup = instance => { instance.slots.forEach(slot => slot?.cleanup?.()); instance.alive = false; };
  function render() {
    dirty = false;
    const seen = new Set(), effects = [];
    function expand(element, position) {
      if (Array.isArray(element)) return element.map((item, index) => expand(item, position + '.' + index));
      if (!element || typeof element !== 'object') return element;
      if (typeof element.type === 'function') {
        const identity = position + ':' + (element.key ?? '');
        let instance = instances.get(identity);
        if (!instance || instance.type !== element.type) {
          if (instance) cleanup(instance);
          instance = { type: element.type, slots: [], alive: true };
          instances.set(identity, instance);
        }
        seen.add(identity); instance.cursor = 0; instance.effects = []; current = instance;
        const output = element.type(element.props);
        effects.push(...instance.effects);
        return expand(output, identity + '.render');
      }
      return { ...element, props: { ...element.props, children: expand(element.props.children, position + '.children') } };
    }
    tree = expand(jsx(Component, { locale, kind }), 'root');
    for (const [key, instance] of instances) if (!seen.has(key)) { cleanup(instance); instances.delete(key); }
    effects.forEach(effect => effect());
  }
  function flush() { for (let i = 0; dirty && i < 20; i++) render(); assert.equal(dirty, false, 'Hook updates settled'); }
  const h = {
    calls, queue, writesAfterUnmount, path, get tree() { return tree; },
    all: () => nodes(tree), find: predicate => nodes(tree).find(predicate),
    field: type => nodes(tree).find(node => node.type === 'input' && (node.props.type === type || node.props.autoComplete === type)),
    select(index, value) { nodes(tree).filter(node => node.type === 'select')[index].props.onChange({ target: { value: String(value) } }); flush(); },
    change(type, value) { const field = type === 'description' ? h.find(node => node.type === 'textarea') : h.field(type);
      assert.ok(field && !field.props.disabled); field.props.onChange({ target: { value, checked: value } }); flush(); },
    fill() { h.change('name', 'Synthetic Visitor'); h.change('email', 'visitor@example.test');
      h.change('description', 'Please explain the available next steps.'); h.change('checkbox', true); },
    toggle() { h.find(node => 'data-contact-order' in node.props).props.onClick(); flush(); },
    send() { return h.find(node => node.type === 'form').props.onSubmit({ preventDefault() {} }); },
    async settle() { for (let i = 0; i < 12; i++) { await Promise.resolve(); flush(); } },
    unmount() { instances.forEach(cleanup); instances.clear(); tree = null; },
  };
  render(); flush(); return h;
}
const messenger = h => h.all().filter(node => node.type === 'AcquisitionEventLink');
function singleEntry(h) {
  assert.equal(h.all().filter(node => node.type === 'input' && ['name', 'given-name'].includes(node.props.autoComplete)).length, 1, 'One name input only');
  assert.equal(h.all().filter(node => node.type === 'textarea').length, 1, 'One request input only');
  assert.equal(h.all().filter(node => node.type === 'form').length, 1, 'One explicit submission form');
  assert.equal(h.all().filter(node => node.type === 'input' && node.props.type === 'checkbox').length, 1, 'One explicit reply consent');
}
for (const locale of ['en', 'ru', 'es']) {
  for (const kind of ['situation', 'dao', 'alchemy']) {
    test(`${locale} ${kind}: single entry, all topic/format choices preserved through consented save and optional handoff`, async () => {
      const h = mount(kind, locale);
      singleEntry(h);
      assert.equal(h.field('name').props.value, '');
      assert.equal(h.find(node => node.type === 'textarea').props.value, '');
      assert.equal(h.field('checkbox').props.checked, false);
      assert.equal(messenger(h).length, 0);
      h.toggle(); h.toggle(); h.toggle(); singleEntry(h);
      const topicIndex = kind === 'alchemy' ? 1 : 0;
      const topics = nodes(h.all().filter(node => node.type === 'select')[topicIndex]).filter(node => node.type === 'option').map(node => ({ value: node.props.value, label: node.props.children }));
      const formats = kind === 'alchemy' ? nodes(h.all().find(node => node.type === 'select')).filter(node => node.type === 'option').map(node => ({ value: node.props.value, label: node.props.children })) : [null];
      for (const format of formats) for (const topic of topics) {
        if (format) h.select(0, format.value);
        h.select(topicIndex, topic.value);
        assert.equal(h.field('name').props.value, '');
        assert.equal(h.field('checkbox').props.checked, false);
        assert.equal(messenger(h).length, 0);
        const previousCalls = h.calls.length;
        h.fill(); h.change('checkbox', false); await h.send(); await h.settle();
        assert.equal(h.calls.length, previousCalls, 'No request without reply consent');
        h.change('checkbox', true); h.queue.push(receipt); await h.send(); await h.settle();
        assert.equal(h.calls.length, previousCalls + 1);
        const payload = JSON.parse(h.calls.at(-1).body);
        assert.deepEqual(Object.keys(payload).sort(), ['contact', 'contactConsent', 'description', 'locale', 'operationId', 'serviceTitle', 'sourcePath', 'website']);
        assert.equal(payload.contact.displayName, 'Synthetic Visitor');
        assert.equal(payload.contact.email, 'visitor@example.test');
        assert.equal(payload.contactConsent, true); assert.equal(payload.locale, locale); assert.equal(payload.sourcePath, h.path);
        assert.equal(payload.description, 'Please explain the available next steps.');
        const links = messenger(h); assert.equal(links.length, 2);
        const drafts = links.map(node => new URL(node.props.href).searchParams.get('text'));
        assert.equal(drafts[0], drafts[1], 'Both messengers preserve the same selection');
        for (const text of drafts) {
          assert.ok(text.includes(topic.label), 'Chosen topic survives');
          if (format) assert.ok(text.includes(format.label), 'Chosen format survives');
          assert.ok(text.includes(payload.serviceTitle)); assert.ok(text.includes(h.path));
          assert.ok(text.includes(payload.description)); assert.ok(text.includes('HH-123456789ABC'));
          assert.ok(!text.includes('Synthetic Visitor')); assert.ok(!text.includes('visitor@example.test'));
        }
        for (const link of links) { assert.equal(link.props.event, 'service_request_start'); assert.equal(link.props.target, '_blank'); }
        h.find(node => node.type === 'button' && node.props.className === 'again').props.onClick(); await h.settle();
      }
      h.unmount(); assert.equal(h.writesAfterUnmount.length, 0);
    });
  }
}
for (const kind of ['situation', 'alchemy']) for (const result of ['pending', 'unknown']) {
  test(`${kind}: changing selected ${kind === 'alchemy' ? 'format' : 'topic'} after ${result} abandons only the old in-memory scope`, async () => {
    const h = mount(kind, 'en'); h.fill();
    const wait = deferred();
    h.queue.push(result === 'pending' ? () => wait.promise : () => { throw Error('Synthetic uncertain network result'); });
    const previous = h.send(); await h.settle();
    assert.equal(h.calls.length, 1); const oldSignal = h.calls[0].signal;
    if (result === 'unknown') { await previous; assert.equal(h.field('name').props.disabled, true); }
    h.select(0, kind === 'alchemy' ? '30' : 1);
    assert.equal(oldSignal.aborted, true);
    assert.equal(h.field('name').props.value, ''); assert.equal(h.field('checkbox').props.checked, false);
    assert.equal(h.find(node => node.type === 'textarea').props.value, '');
    if (result === 'pending') { wait.resolve(receipt()); await previous; await h.settle(); }
    assert.equal(messenger(h).length, 0); assert.equal(h.calls.length, 1);
    assert.equal(h.writesAfterUnmount.length, 0);
    h.fill(); h.queue.push(receipt); await h.send(); await h.settle();
    assert.notEqual(JSON.parse(h.calls[0].body).operationId, JSON.parse(h.calls[1].body).operationId);
    assert.equal(messenger(h).length, 2); h.unmount();
  });
}
