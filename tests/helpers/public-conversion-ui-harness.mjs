import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import * as enquiries from '../../lib/whatsapp-enquiry.js';
import * as organic from '../../lib/organic-event-referrals.js';
import * as paid from '../../lib/paid-ad-referrals.js';
import * as publicLead from '../../lib/public-lead-capture.js';
import * as zen from '../../lib/commerce/zen-transfer-inquiry.js';

const compiledSources = new Map();
const read = path => readFileSync(new URL('../../' + path, import.meta.url), 'utf8');
const children = node => [node?.props?.children].flat(Infinity).filter(value => value != null && value !== false);
const descendants = node => children(node).flatMap(child => typeof child === 'object' ? [child, ...descendants(child)] : []);
const textOf = node => typeof node === 'string' || typeof node === 'number' ? String(node) : children(node).map(textOf).join('');
const normalizeText = value => value.replace(/[\u200b\u00ad]/g, '').replace(/\s+/g, ' ').trim();
const labelable = node => ['button', 'meter', 'output', 'progress', 'select', 'textarea'].includes(node.type)
  || (node.type === 'input' && node.props.type !== 'hidden');
function associatedLabels(node, root) {
  if (!labelable(node)) return [];
  const all = [root, ...descendants(root)];
  return all.filter(label => label.type === 'label' && (label.props.htmlFor !== undefined
    ? all.find(target => target.props.id === label.props.htmlFor) === node
    : descendants(label).find(labelable) === node));
}
function labelledBy(node, root) {
  const ids = String(node.props['aria-labelledby'] || '').split(/\s+/).filter(Boolean);
  const all = [root, ...descendants(root)];
  const labels = [...new Set(ids.map(id => all.find(target => target.props.id === id)).filter(Boolean))];
  return labels.length ? labels : null;
}
function labelTexts(node, root) {
  const referenced = labelledBy(node, root);
  if (referenced) return referenced.map(textOf);
  const ariaLabel = node.props['aria-label'];
  if (typeof ariaLabel === 'string' && ariaLabel.trim()) return [ariaLabel];
  // Playwright 1.63 uses full label descendant text, including select options.
  return associatedLabels(node, root).map(textOf);
}
function textWithoutControl(node, control) {
  if (node === control) return '';
  return typeof node === 'string' || typeof node === 'number' ? String(node)
    : children(node).map(child => textWithoutControl(child, control)).join('');
}
function accessibleName(node, root) {
  const referenced = labelledBy(node, root);
  if (referenced) return referenced.map(label => textWithoutControl(label, node)).join(' ');
  if (node.props['aria-label']?.trim()) return node.props['aria-label'];
  const labels = associatedLabels(node, root);
  if (labels.length) return labels.map(label => textWithoutControl(label, node)).join(' ');
  // Native select names never fall back to their options' text.
  return node.type === 'select' ? node.props.title || '' : textOf(node);
}
function matchesText(actual, expected, exact = false) {
  if (expected instanceof RegExp) { expected.lastIndex = 0; return expected.test(actual); }
  const value = normalizeText(actual), wanted = normalizeText(expected);
  return exact ? value === wanted : value.toLowerCase().includes(wanted.toLowerCase());
}
function hiddenForRole(node) {
  for (let current = node; current; current = current.parent) {
    if (current.hidden || String(current.props['aria-hidden']) === 'true') return true;
  }
  return false;
}
const attr = (node, name) => {
  const value = node.props[{ maxlength: 'maxLength', minlength: 'minLength', readonly: 'readOnly', autocomplete: 'autoComplete' }[name] || name];
  if ((name.startsWith('aria-') || name.startsWith('data-')) && value != null) return String(value);
  return value == null || value === false ? null : value === true ? '' : String(value);
};
function matches(node, selector) {
  const tag = selector.match(/^[a-z0-9]+/i)?.[0];
  const id = selector.match(/^[^[\]]*#([\w-]+)/)?.[1];
  const attributes = [...selector.matchAll(/\[([\w-]+)(?:="([^"]*)")?\]/g)];
  assert.ok(tag || id || attributes.length, 'Supported selector: ' + selector);
  return (!tag || node.type === tag) && (!id || node.props.id === id)
    && attributes.every(([, name, value]) => value === undefined ? attr(node, name) !== null : attr(node, name) === value);
}

// Execute the actual current route components, including the actual chooser's
// hooks, effects, submit handler and URL construction. Only decorative children
// and browser APIs are replaced. No DB/provider modules or network are loaded.
export function mountPublicConversion(locale, kind = 'dao', fault = '', origin = 'http://127.0.0.1:3100') {
  const instances = new Map(), writesAfterUnmount = [], mutationReceipts = [];
  let currentInstance, mounted = true;
  const detailsOpen = new Map(), frames = [], copiedValues = [], events = [], requests = [];
  let dirty = true, effects = [], interception, fetchCount = 0, externalClicks = 0, focusedPath;
  const slug = { dao: 'dao-health-profile', situation: 'free-situation-review', alchemy: 'alchemy-of-soul', hypnotherapy: 'hypnotherapy-course', 'imagery-therapy': 'imagery-therapy', 'systemic-constellations': 'systemic-constellations', business: 'business-consulting', 'tantra-initiation': 'academy/reiki/tantra-reiki/free-initiation', 'yggdrasil-initiation': 'academy/reiki/yggdrasil/free-initiation', 'academy-tantra': 'academy', 'temple-initiation': 'academy/temple-studies' }[kind];
  assert.ok(slug);
  let pathname = '/' + locale + '/' + (slug.startsWith('academy') ? slug : 'services/' + slug);
  const browserGlobals = {
    URL, URLSearchParams, AbortController,
    crypto: { randomUUID: () => '01234567-89ab-4def-8123-456789abcdef' },
    window: {
      location: { pathname, search: '', hash: '' }, addEventListener() {}, removeEventListener() {}, matchMedia: () => ({ matches: true }),
      dispatchEvent: event => events.push(event.detail),
    },
    document: { documentElement: { dataset: { analyticsConsent: 'granted' } } },
    navigator: { clipboard: { writeText: async value => { copiedValues.push(value); } } },
    requestAnimationFrame: callback => frames.push(callback),
    CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init.detail; } },
  };
  const jsx = (type, props, key) => ({ type, props: props || {}, key });
  const react = {
    useId() {
      const index = currentInstance.cursor++;
      return 'synthetic-panel-' + currentInstance.id + '-' + index;
    },
    useState(initial) {
      const instance = currentInstance, index = instance.cursor++;
      if (!instance.slots[index]) instance.slots[index] = { value: typeof initial === 'function' ? initial() : initial };
      return [instance.slots[index].value, next => {
        if (!instance.alive) { writesAfterUnmount.push(instance.id); return; }
        const value = typeof next === 'function' ? next(instance.slots[index].value) : next;
        if (!Object.is(value, instance.slots[index].value)) { instance.slots[index].value = value; dirty = true; }
      }];
    },
    useRef(initial) {
      const index = currentInstance.cursor++;
      if (!currentInstance.slots[index]) currentInstance.slots[index] = { current: initial };
      return currentInstance.slots[index];
    },
    useCallback(callback, dependencies) {
      const index = currentInstance.cursor++, previous = currentInstance.slots[index];
      if (!previous || dependencies.some((value, i) => !Object.is(value, previous.dependencies[i]))) currentInstance.slots[index] = { callback, dependencies };
      return currentInstance.slots[index].callback;
    },
    useEffect(effect, dependencies) {
      const instance = currentInstance, index = instance.cursor++, previous = instance.slots[index];
      if (!previous || dependencies.some((value, i) => !Object.is(value, previous.dependencies[i]))) {
        effects.push(() => {
          previous?.cleanup?.();
          instance.slots[index] = { dependencies, cleanup: effect() };
        });
      }
    },
  };
  const modules = {
    'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'fragment' },
    react,
    'next/navigation': { usePathname: () => pathname },
    '@/lib/spanish-metadata': { spanishMetadata: (...args) => ({ syntheticMetadataArguments: args }) },
    'next/image': { default: () => null },
    'next/link': { default: props => jsx('a', props) },
    'lucide-react': new Proxy({}, { get: () => () => null }),
    '@/lib/whatsapp-enquiry': enquiries,
    '@/lib/organic-event-referrals': organic,
    '@/lib/paid-ad-referrals': paid,
    '@/lib/public-lead-capture': publicLead,
    '@/lib/commerce/zen-transfer-inquiry': zen,
    '@/lib/public-card-artwork': { cardArtworkUrl: () => '/synthetic-art.webp', hasCardArtwork: () => false },
    '@/components/acquisition-event-link': { AcquisitionEventLink: ({ attributes, ...props }) => jsx('a', { ...props, ...attributes }) },
    '@/components/public-site-header': { PublicSiteHeader: () => jsx('header', { 'data-test-public-header': true }) },
    '@/components/free-situation-review-form': { FreeSituationReviewForm: () => null },
    '@/components/service-video-showcase': { ServiceVideoShowcase: () => null },
    '@/components/personal-testimonials': { PersonalTestimonials: () => null },
    '@/components/business-website-enquiry': { BusinessWebsiteEnquiry: () => null },
  };
  function compile(path, transform = value => value) {
    const original = read(path);
    const source = transform(original);
    if (source !== original) mutationReceipts.push({ path, fault });
    const cacheKey = path + '\0' + source;
    if (!compiledSources.has(cacheKey)) compiledSources.set(cacheKey, ts.transpileModule(source, { fileName: path, compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
    } }).outputText);
    const output = compiledSources.get(cacheKey);
    const exports = {};
    runInNewContext(output, {
      exports, ...browserGlobals,
      async fetch(url, options) {
        // Count every attempted call, including denied calls before interception.
        fetchCount++;
        assert.equal(url, '/api/service-enquiries', 'No provider/external request is permitted');
        assert.ok(interception, 'No unmocked request may leave this fixture');
        assert.equal(interception.url(new URL(origin + url)), true, 'Browser interception must match the actual endpoint');
        assert.equal(options.credentials, 'same-origin');
        assert.equal(options.headers['Content-Type'], 'application/json');
        requests.push(JSON.parse(options.body));
        let response;
        await interception.handler({
          request: () => ({ url: () => origin + url, method: () => options.method, postDataJSON: () => JSON.parse(options.body) }),
          fulfill: async data => { response = data; },
        });
        assert.ok(response);
        return { status: response.status, ok: response.status >= 200 && response.status < 300, json: async () => JSON.parse(response.body) };
      },
      require(name) {
        if (name.endsWith('.module.css')) return { default: {} };
        assert.ok(Object.hasOwn(modules, name), 'Unexpected import: ' + name);
        return modules[name];
      },
    });
    return exports;
  }
  // This harness variant intentionally requires the exact CRM lifecycle module;
  // absence must fail rather than silently selecting the old inline submit path.
  assert.ok(read('components/contact-channel-chooser.tsx').includes('@/lib/practitioners/public-enquiry-submission'));
  modules['@/lib/practitioners/public-enquiry-submission'] = compile('lib/practitioners/public-enquiry-submission.js', source => {
    if (fault === 'wrong method') return source.replace("method: 'POST'", "method: 'PUT'");
    if (fault === 'accept failed save') return source.replace("response.ok && data?.saved === true && /^HH-[A-F0-9]{12}$/.test(data.referenceCode || '')", 'true');
    if (fault === 'accept invalid reference') return source.replace(" && /^HH-[A-F0-9]{12}$/.test(data.referenceCode || '')", '');
    if (fault === 'accept unsaved response') return source.replace(' && data?.saved === true', '');
    return source;
  });
  modules['@/lib/contact/phone-country'] = compile('lib/contact/phone-country.js');
  modules['@/components/phone-country-input'] = compile('components/phone-country-input.tsx', source => {
    if (fault === 'missing country') return source.replace(/  <select[\s\S]*?<\/select>/, '');
    if (fault === 'duplicate country') return source.replace(/  <select[\s\S]*?<\/select>/, '$&$&');
    if (fault === 'hidden country') return source.replace('<select aria-label=', '<select hidden aria-label=');
    if (fault === 'wrong country name') return source.replace('aria-label={words.country}', 'aria-label={words.country + " wrong"}');
    if (fault === 'wrong country option') return source.replace('item.names[locale]||item.names.en', '"Wrong country"');
    if (fault === 'missing country option') return source.replace('PHONE_COUNTRIES.map(', 'PHONE_COUNTRIES.slice(1).map(');
    if (fault === 'wrong country option value') return source.replace('value={item.iso}', 'value={item.iso === "GB" ? "ZZ" : item.iso}');
    if (fault === 'stuck country') return source.replace('setCountry(next);', 'setCountry("CA");');
    if (fault === 'country dial lost') return source.replace('composeCountryPhone(current.dial,event.target.value)', 'composeCountryPhone("+1",event.target.value)');
    if (fault === 'country editable while pending') return source.replace('<select aria-label={words.country} value={country} disabled={disabled}', '<select aria-label={words.country} value={country} disabled={false}');
    return source;
  });
  modules['@/components/contact-channel-chooser'] = compile('components/contact-channel-chooser.tsx', source => {
    if (fault === 'links while pending') return source.replace('setBusy(true);', 'setBusy(true); setSaved({saved:true,referenceCode:"HH-0123456789AB"});');
    if (fault === 'submit enabled while pending') return source.replace('disabled={busy || displayName.trim().length < 2 ||', 'disabled={displayName.trim().length < 2 ||');
    if (fault === 'details editable while pending') return source.replace('value={description} disabled={busy || uncertain}', 'value={description} disabled={false}');
    if (fault === 'hidden name') return source.replace('<input type="text" autoComplete="name"', '<input hidden type="text" autoComplete="name"');
    if (fault === 'hidden question') return source.replace('<textarea id={panelId', '<textarea hidden id={panelId');
    if (fault === 'prechecked consent') return source.replace('[consent, setConsent] = useState(false)', '[consent, setConsent] = useState(true)').replaceAll('setConsent(false)', 'setConsent(true)');
    if (fault === 'both contacts required') return source.replace('(!email.trim() && !phone.trim())', '(!email.trim() || !phone.trim())');
    if (fault === 'missing consent gate') return source.replaceAll(' || !consent', '');
    if (fault === 'invalid phone accepted') return source.replace('(cleanedPhone && !/^\\+[1-9][0-9]{7,14}$/.test(cleanedPhone)) || ', '');
    if (fault === 'missing contact payload') return source.replace('contact: { displayName: displayName.trim(), email: email.trim(), phone: cleanedPhone },', '');
    if (fault === 'consent payload false') return source.replace('contactConsent: consent,', 'contactConsent: false,');
    if (fault === 'contact URL leak') return source.replace('originalMessage + "\\n\\n" + c.reference', 'originalMessage + displayName + "\\n\\n" + c.reference');
    if (fault === 'private note URL leak') return source.replace('originalMessage + "\\n\\n" + c.reference', 'originalMessage + description + "\\n\\n" + c.reference');
    if (fault === 'missing note disclosure') return source.replace('<details className={styles.optionalNote}>', '<div className={styles.optionalNote}>').replace('</details>', '</div>');
    if (fault === 'duplicate note disclosure') return source.replace(/<details className=\{styles\.optionalNote\}>[\s\S]*?<\/details>/, '$&$&');
    if (fault === 'wrong note descendant') return source.replace(/(<details className=\{styles\.optionalNote\}>)([\s\S]*?)(<textarea[\s\S]*?\/>)([\s\S]*?)(<\/details>)/, '$3$1$2$4$5');
    if (fault === 'wrong note label') return source.replace('aria-label={c.description}', 'aria-label={c.description + " wrong"}');
    if (fault === 'required private note') return source.replace('<textarea id={panelId', '<textarea required id={panelId');
    if (fault === 'minimum private note') return source.replace('maxLength={1400} rows={2}', 'minLength={10} maxLength={1400} rows={2}');
    if (fault === 'expanded private note') return source.replace('<details className={styles.optionalNote}>', '<details open className={styles.optionalNote}>');
    if (fault === 'private note blocks contact only') return source.replace('disabled={busy || displayName.trim().length', 'disabled={busy || description.trim().length < 10 || displayName.trim().length');
    if (fault === 'wrong service title') return source.replace('serviceTitle, description:', 'serviceTitle: "Unrelated service", description:');
    if (fault === 'extra payload field') return source.replace('sourcePath: pathname, locale,', 'sourcePath: pathname, locale, privateAnswer: "unexpected answer",');
    if (fault === 'wrong source path') return source.replace('sourcePath: pathname, locale,', 'sourcePath: "/en/services/unrelated", locale,');
    if (fault === 'hidden save form') return source.replace('<form onSubmit={submit}', '<form hidden onSubmit={submit}');
    if (fault === 'blocked trigger') return source.replace('onClick={() => setOpen((value) => !value)}', 'onClick={() => {}}');
    if (fault === 'lose description') return source.replace('description: description.trim(),', 'description: "wrong description",');
    if (fault === 'wrong recipient') return source.replace('href={preparedWhatsApp}', 'href={preparedWhatsApp.replace("14376066502", "10000000000")}');
    if (fault === 'missing telegram') return source.replace('"data-contact-channel": "telegram"', '"data-contact-channel": "missing"');
    return source;
  });
  modules['@/components/free-resource-enquiry'] = compile('components/free-resource-enquiry.tsx', source => {
    const topicLabel = /<label>\{t\.topic\}[\s\S]*?<\/label>/;
    if (fault === 'nested topic label') return source.replace('<label>{t.topic}', '<label><span>{t.topic}</span>');
    if (fault === 'missing topic') return source.replace(/<select value=\{topic\}[\s\S]*?<\/select>/, '');
    if (fault === 'hidden topic') return source.replace('<select value={topic}', '<select hidden value={topic}');
    if (fault === 'duplicate topic') return source.replace(topicLabel, '$&$&');
    if (fault === 'wrong topic label') return source.replace('<label>{t.topic}', '<label>{t.topic} extra');
    if (fault === 'unassociated topic label') return source.replace(topicLabel, label => label.replace('<label>', '<div>').replace('</label>', '</div>'));
    if (fault === 'wrong topic role') return source.replace('<select value={topic}', '<select multiple value={topic}');
    if (fault === 'wrong topic option') return source.replace('value={index}>{item}</option>', 'value={index}>{index === 0 ? "Wrong option" : item}</option>');
    if (fault === 'missing topic option') return source.replace('offer.topics.map(', 'offer.topics.slice(1).map(');
    if (fault === 'stuck topic value') return source.replace('setTopic(Number(event.target.value))', 'setTopic(0)');
    if (fault === 'automatic mount post') return source.replace('import { useState }', 'import { useEffect, useState }')
      .replace('  const t = text[locale];', "  useEffect(() => { void fetch('/api/service-enquiries', { method: 'POST' }).catch(() => {}); }, []);\n  const t = text[locale];");
    if (fault === 'automatic topic post') return source.replace('setTopic(Number(event.target.value))', "(setTopic(Number(event.target.value)), void fetch('/api/service-enquiries', { method: 'POST' }).catch(() => {}))");
    if (fault === 'duplicate name entry') return source.replace('<div className={styles.fields}>', '<div className={styles.fields}><input type="text" maxLength={80} />');
    if (fault === 'duplicate description entry') return source.replace('<div className={styles.fields}>', '<div className={styles.fields}><textarea maxLength={350} />');
    if (fault === 'stale topic') return source.replace('topic: offer.topics[topic],', 'topic: offer.topics[0],');
    if (fault === 'missing qualification') return source.replace('request: offer.request,', 'request: "Unqualified free profile request",');
    return source;
  });
  if (fault === 'wrong service') mutationReceipts.push({ path: 'test-root-route-props', fault });
  if (fault === 'missing enquiry') mutationReceipts.push({ path: 'components/free-resource-enquiry.tsx', fault });
  if (fault === 'missing enquiry') modules['@/components/free-resource-enquiry'].FreeResourceEnquiry = function MissingEnquiry() { return null; };
  modules['@/lib/public-analytics'] = compile('lib/public-analytics.ts');
  modules['@/components/free-drawing-intake'] = compile('components/free-drawing-intake.tsx', source => {
    if (fault === 'missing drawing qualification') return source.replaceAll('The written report is a symbolic situation review, not a medical or mental-health diagnosis.', '');
    if (fault === 'missing required answer') return source.replace('textarea required rows={3}', 'textarea rows={3}');
    if (fault === 'broken prepare') return source.replace('setPrepared(true);', 'setPrepared(false);');
    if (fault === 'lost prepared answer') return source.replace('t.goalField + ": " + goal.trim(),', 't.goalField + ": omitted",');
    if (fault === 'drawing answer URL leak') return source.replace('topic: t.options[topic],', 'topic: t.options[topic], context: problem,');
    if (fault === 'automatic answer copy') return source.replace('setPrepared(true);', 'setPrepared(true); void copyAnswers();');
    return source;
  });
  modules['@/components/free-situation-review-form'] = compile('components/free-situation-review-form.tsx');
  if (fault === 'missing full intake') mutationReceipts.push({ path: 'components/free-situation-review-form.tsx', fault });
  if (fault === 'missing full intake') modules['@/components/free-situation-review-form'].FreeSituationReviewForm = function MissingIntake() { return null; };
  modules['@/components/consultation-choice-capture'] = compile('components/consultation-choice-capture.tsx', source => {
    if (fault === 'stale paid choice') return source.replace('request: t.serviceMessages[serviceChoice],', 'request: t.serviceMessages.session,').replace('option: t.serviceOptions[serviceChoice],', 'option: t.serviceOptions.session,');
    if (fault === 'broken free destination') return source.replaceAll('/services/free-situation-review', '/services/unrelated');
    return source;
  });
  modules['@/components/personal-consultation-form'] = compile('components/personal-consultation-form.tsx');
  modules['@/data/personal-service-pages'] = compile('data/personal-service-pages.ts');
  modules['@/data/business-consulting-copy'] = compile('data/business-consulting-copy.ts');
  const { TantraInitiationForm } = kind === 'tantra-initiation' ? compile('components/tantra-initiation-form.tsx') : {};
  const { YggdrasilInitiationForm } = kind === 'yggdrasil-initiation' ? compile('components/yggdrasil-initiation-form.tsx') : {};
  const { AcademyCourseCapture } = kind === 'academy-tantra' ? compile('components/academy-course-capture.tsx', source => fault === 'wrong academy service' ? source.replace('title: "Tantra Reiki"', 'title: "Unrelated course"') : source) : {};
  const { TempleInitiationChooser } = kind === 'temple-initiation' ? compile('components/temple-initiation-chooser.tsx') : {};
  const { PersonalServiceLanding } = compile('components/personal-service-landing.tsx');
  const { BusinessConsultingLanding } = compile('components/business-consulting-landing.tsx');
  modules['@/components/core-service-detail'] = compile('components/core-service-detail.tsx');
  const { SitewideLeadCapture } = compile('components/sitewide-lead-capture.tsx');
  const { AlchemySoulFormatSelector, AlchemySoulLeadForm } = compile('components/alchemy-soul-lead-form.tsx', source => {
    for (const field of ['format', 'topic']) {
      const prefix = 'alchemy ' + field + ' ';
      const label = field === 'format' ? /<label htmlFor=\{formId \+ "-format"\}>[\s\S]*?<\/label>/ : /<label htmlFor=\{formId \+ "-topic"\}>[\s\S]*?<\/label>/;
      const select = '<select id={formId + "-' + field + '"}';
      const copy = field === 'format' ? 't.format' : 't.topics';
      if (fault === prefix + 'missing') return source.replace(label, '');
      if (fault === prefix + 'duplicate') return source.replace(label, markup => markup + markup.replaceAll('"-' + field + '"', '"-' + field + '-duplicate"'));
      if (fault === prefix + 'hidden') return source.replace(select, select + ' hidden');
      if (fault === prefix + 'wrong name') return source.replace('>{' + copy + '}\n', '>{' + copy + ' + " wrong"}\n');
      if (fault === prefix + 'wrong role') return source.replace(select, select + ' role="listbox"');
      if (fault === prefix + 'stuck selection') return source.replace('set' + (field === 'format' ? 'Format' : 'Topic') + '(value.target.value as ' + (field === 'format' ? 'Format' : 'Topic') + ')',
        'set' + (field === 'format' ? 'Format' : 'Topic') + '("' + (field === 'format' ? '60' : 'relationships') + '")');
    }
    if (fault === 'alchemy format missing option') return source.replace('<option value="30">{t.formatNames["30"]}</option>', '');
    if (fault === 'alchemy format wrong option') return source.replace('<option value="30">{t.formatNames["30"]}</option>', '<option value="30">Wrong format</option>');
    if (fault === 'alchemy format wrong option value') return source.replace('<option value="30">', '<option value="31">');
    if (fault === 'alchemy topic missing option') return source.replace('["relationships", "stress", "business", "direction", "other"] as const', '["relationships", "stress", "direction", "other"] as const');
    if (fault === 'alchemy topic wrong option') return source.replace('{t.topicNames[key]}</option>', '{key === "business" ? "Wrong topic" : t.topicNames[key]}</option>');
    if (fault === 'alchemy topic wrong option value') return source.replace('<option value={key} key={key}>', '<option value={key === "business" ? "wrong" : key} key={key}>');
    if (fault === 'alchemy format wrong default') return source.replace('useState<Format>("60")', 'useState<Format>("30")');
    if (fault === 'alchemy topic wrong default') return source.replace('useState<Topic>("relationships")', 'useState<Topic>("business")');
    if (fault === 'stale alchemy lead format') return source.replace('option: t.formatNames[format],', 'option: t.formatNames["60"],');
    if (fault === 'stale alchemy format') return source.replace('option: t.formatNames[selected],', 'option: t.formatNames["60"],');
    if (fault === 'stale alchemy topic') return source.replace('topic: t.topicNames[topic],', 'topic: t.topicNames.relationships,');
    return source;
  });
  const { FreeEntryLanding } = compile('components/free-entry-landing.tsx', source => {
    if (fault === 'expanded full intake') return source.replace('<details className={styles.fullQuestionnaire}>', '<details open className={styles.fullQuestionnaire}>');
    if (fault === 'duplicate enquiry') return source.replace('<FreeResourceEnquiry locale={locale} kind={kind} />',
      '<><FreeResourceEnquiry locale={locale} kind={kind} /><FreeResourceEnquiry locale={locale} kind={kind} /></>');
    if (fault === 'wrong heading') return source.replace('Explore your inner resources through Wu Xing.', 'Unrelated service');
    if (fault === 'broken primary anchor') return source.replace('href={"#" + captureId}', 'href="#missing-request"');
    return source;
  });
  modules['@/components/free-entry-landing'] = { FreeEntryLanding };
  const SpanishDaoModule = locale === 'es' && kind === 'dao'
    ? compile('app/es/services/dao-health-profile/page.tsx') : null;
  const SpanishDaoRoute = SpanishDaoModule?.default;
  const rootElement = () => kind === 'alchemy' ? jsx('div', { children: [
    jsx(AlchemySoulFormatSelector, { locale }), jsx(AlchemySoulLeadForm, { locale }),
  ] }) : kind === 'hypnotherapy' ? jsx('div', { children: [
    jsx(modules['@/components/core-service-detail'].CoreServiceDetail, { locale, kind }),
    jsx(SitewideLeadCapture, {}),
  ] }) : kind === 'tantra-initiation' ? jsx(TantraInitiationForm, { locale })
    : kind === 'yggdrasil-initiation' ? jsx(YggdrasilInitiationForm, { locale })
    : kind === 'academy-tantra' ? jsx(AcademyCourseCapture, { locale })
    : kind === 'temple-initiation' ? jsx(TempleInitiationChooser, { locale })
    : kind === 'business' ? jsx(BusinessConsultingLanding, { locale })
    : ['imagery-therapy', 'systemic-constellations'].includes(kind) ? jsx(PersonalServiceLanding, { locale, service: kind })
    : SpanishDaoRoute ? jsx(SpanishDaoRoute, {})
    : jsx(FreeEntryLanding, { locale, kind: fault === 'wrong service' ? 'situation' : kind });
  const cleanup = instance => { instance.slots.forEach(slot => slot?.cleanup?.()); instance.alive = false; };
  let nextInstance = 0;
  function render() {
    if (!mounted) return null;
    let root;
    for (let pass = 0; ; pass++) {
      assert.ok(pass < 20, 'Render/effect cycles must settle');
      dirty = false; effects = [];
      const seen = new Set();
      function expand(element, position) {
        if (Array.isArray(element)) return element.map((child, index) => expand(child, position + '.' + index));
        if (!element || typeof element !== 'object') return element;
        if (typeof element.type === 'function') {
          const identity = position + ':' + (element.key ?? '');
          let instance = instances.get(identity);
          if (!instance || instance.type !== element.type) {
            if (instance) cleanup(instance);
            instance = { type: element.type, slots: [], alive: true, id: ++nextInstance };
            instances.set(identity, instance);
          }
          instance.cursor = 0; currentInstance = instance; seen.add(identity);
          return expand(element.type(element.props), identity + '.render');
        }
        return { ...element, hostIdentity: position + ':' + element.type + ':' + (element.key ?? ''),
          props: { ...element.props, children: expand(element.props.children, position + '.children') } };
      }
      root = expand(rootElement(), 'root');
      for (const [key, instance] of instances) if (!seen.has(key)) { cleanup(instance); instances.delete(key); }
      const liveNativeDetails = new Set();
      function commit(node, hidden = false, path = 'root', parent = null) {
        if (!node || typeof node !== 'object') return;
        node.path = path; node.parent = parent;
        node.hidden = hidden || Boolean(node.props.hidden);
        if (node.props.ref) {
          const element = target => ({
            scrollIntoView() {}, focus() { focusedPath = target.path; },
            querySelector(selector) {
              const found = descendants(target).find(child => matches(child, selector));
              return found ? element(found) : null;
            },
          });
          node.props.ref.current = element(node);
        }
        if (node.type === 'details') liveNativeDetails.add(node.hostIdentity);
        const open = detailsOpen.has(node.hostIdentity) ? detailsOpen.get(node.hostIdentity) : Boolean(node.props.open);
        node.open = open;
        children(node).forEach((child, index) => commit(child,
          node.hidden || (node.type === 'details' && !open && child?.type !== 'summary'),
          path + '/' + index, node));
      }
      commit(root);
      // Native disclosure state belongs to this mounted host identity, not its
      // screen position. Removed or keyed-remounted details start fresh.
      for (const key of detailsOpen.keys()) if (!liveNativeDetails.has(key)) detailsOpen.delete(key);
      effects.forEach(effect => effect());
      if (!dirty) { while (frames.length) frames.shift()(); return root; }
    }
  }
  function locator(resolve) {
    const selected = () => resolve(render());
    const one = () => { const nodes = selected(); assert.equal(nodes.length, 1); return nodes[0]; };
    return {
      selected, resolve,
      locator(selector) {
        return locator(root => resolve(root).flatMap(node => selector === ':scope > summary'
          ? children(node).filter(child => child?.type === 'summary')
          : descendants(node).filter(child => matches(child, selector))));
      },
      first() { return locator(root => resolve(root).slice(0, 1)); },
      nth(index) { return locator(root => resolve(root).slice(index, index + 1)); },
      filter({ has }) {
        // Playwright evaluates the complete inner selector relative to each
        // outer candidate, never by intersecting document-global matches.
        return locator(root => resolve(root).filter(node => {
          const inner = has.resolve(node);
          return descendants(node).some(child => inner.includes(child));
        }));
      },
      getByRole(role, { name, exact, level, includeHidden = false } = {}) {
        return locator(root => resolve(root).flatMap(descendants).filter(node =>
          (node.props.role === role || (role === 'link' && node.type === 'a') || (role === 'button' && node.type === 'button')
            || (node.type === 'select' && !node.props.role
              && role === (node.props.multiple || Number(node.props.size) > 1 ? 'listbox' : 'combobox'))
            || (role === 'heading' && /^h[1-6]$/.test(node.type) && (!level || node.type === 'h' + level)))
          && (includeHidden || !hiddenForRole(node))
          && (name === undefined || matchesText(accessibleName(node, root), name, exact))));
      },
      getByLabel(label, { exact = false } = {}) {
        return locator(root => resolve(root).flatMap(descendants).filter(node =>
          labelTexts(node, root).some(text => matchesText(text, label, exact))));
      },
      async getAttribute(name) { return attr(one(), name); },
      async innerText() { return textOf(one()); },
      async inputValue() { return String(one().props.value); },
      async evaluate(callback) { return callback({ open: one().open }); },
      async scrollIntoViewIfNeeded() { one(); },
      async fill(value) { const node = one(); assert.equal(node.hidden, false); assert.notEqual(node.props.disabled, true); node.props.onChange({ target: { value } }); render(); },
      async check() { const node = one(); assert.notEqual(node.props.disabled, true); node.props.onChange({ target: { checked: true } }); render(); },
      async uncheck() { const node = one(); assert.notEqual(node.props.disabled, true); node.props.onChange({ target: { checked: false } }); render(); },
      async selectOption(value) { const node = one(); assert.equal(node.hidden, false); assert.notEqual(node.props.disabled, true); assert.ok(descendants(node).some(option => option.type === 'option' && String(option.props.value) === String(value)), 'Selected option exists'); node.props.onChange({ target: { value } }); render(); },
      async click() {
        const node = one();
        assert.equal(node.hidden, false);
        assert.notEqual(node.props.disabled, true);
        if (node.type === 'a') { externalClicks++; assert.fail('Never open messenger links'); }
        if (node.type === 'summary') {
          assert.equal(node.parent.type, 'details');
          detailsOpen.set(node.parent.hostIdentity, !node.parent.open);
        } else if (node.props.type === 'submit') {
          let form = node.parent;
          while (form && form.type !== 'form') form = form.parent;
          assert.ok(form);
          await form.props.onSubmit({ preventDefault() {} });
        } else await node.props.onClick();
        // Event handlers may deliberately launch an async copy with `void`.
        // Flush that real promise work before the synchronous locator double.
        await new Promise(resolve => setImmediate(resolve));
        render();
      },
    };
  }
  const scope = locator(root => [root]);
  const page = {
    ...scope,
    locator(selector) { return locator(root => [root, ...descendants(root)].filter(node => matches(node, selector))); },
    url: () => origin + pathname,
    async evaluate(callback) { return runInNewContext('(' + callback.toString() + ')()', browserGlobals); },
    async route(url, handler) {
      assert.equal(url(new URL(origin + '/api/service-enquiries')), true);
      assert.equal(url(new URL(origin + '/api/service-enquiries?unexpected=1')), true);
      assert.equal(url(new URL(origin + '/api/service-enquiries/unexpected')), true);
      assert.equal(url(new URL(origin + '/api/unrelated')), false);
      assert.equal(url(new URL('https://holistichouse.vercel.app/api/service-enquiries')), false);
      assert.equal(interception, undefined);
      interception = { url, handler };
    },
    async unroute(url, handler) { assert.equal(interception.url, url); assert.equal(interception.handler, handler); interception = undefined; },
  };
  const expect = actual => ({
    async toHaveCount(count) { assert.equal(actual.selected().length, count); },
    async toBeVisible() { assert.equal(actual.selected().length, 1); assert.equal(actual.selected()[0].hidden, false); },
    async toBeHidden() { assert.equal(actual.selected().length, 1); assert.equal(actual.selected()[0].hidden, true); },
    async toBeFocused() { assert.equal(actual.selected().length, 1); assert.equal(actual.selected()[0].path, focusedPath); },
    async toHaveText(value) {
      const texts = actual.selected().map(textOf);
      if (Array.isArray(value)) assert.deepEqual(texts, value); else assert.deepEqual(texts, [value]);
    },
    async toContainText(value) { assert.equal(actual.selected().length, 1); assert.ok(textOf(actual.selected()[0]).includes(value), value); },
    async toHaveAttribute(name, value) {
      const actualValue = await actual.getAttribute(name);
      if (value instanceof RegExp) assert.match(actualValue, value); else assert.equal(actualValue, value);
    },
    async toHaveValue(value) { assert.equal(actual.selected().length, 1); assert.equal(String(actual.selected()[0].props.value), value); },
    async toBeDisabled() { assert.equal(actual.selected().length, 1); assert.equal(actual.selected()[0].props.disabled, true); },
    async toBeEnabled() { assert.equal(actual.selected().length, 1); assert.notEqual(actual.selected()[0].props.disabled, true); },
    async toBeChecked() { assert.equal(actual.selected().length, 1); assert.equal(actual.selected()[0].props.checked, true); },
    not: { async toBeChecked() { assert.equal(actual.selected().length, 1); assert.equal(actual.selected()[0].props.checked, false); } },
  });
  expect.poll = callback => ({ async toBe(value) { assert.equal(await callback(), value); } });
  return { page, expect, fetchCount: () => fetchCount, externalClicks: () => externalClicks, intercepted: () => Boolean(interception), copiedValues, events, requests, writesAfterUnmount, mutationReceipts, routeMetadata: SpanishDaoModule?.metadata,
    navigate(path) { pathname = path; browserGlobals.window.location.pathname = path; render(); },
    unmount() { mounted = false; instances.forEach(cleanup); instances.clear(); },
  };
}
