import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import { openContactChannelChooser, assertPreparedContactChannels } from '../scripts/helpers/contact-channel-verifier.mjs';
import * as enquiries from '../lib/whatsapp-enquiry.js';
import * as referrals from '../lib/organic-event-referrals.js';
import * as publicLead from '../lib/public-lead-capture.js';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const jsx = (type, props) => typeof type === 'function' ? type(props || {}) : { type, props: props || {} };
function mountChooser(locale, fault, reducedMotion = false, locationOptions = {}) {
  let choice = 'session', externalClicks = 0, cursor = 0, dirty = true, pendingEffects = [];
  const hooks = [], scrollCalls = [], channelClicks = [];
  const location = { pathname: '/' + locale + '/services/psychohomeopathy', search: '', ...locationOptions };
  // Render/commit/effect cycles preserve hook slots and dependencies. A no-op
  // useEffect shim would silently miss the selected-request reset regression.
  const react = {
    useId: () => 'panel',
    useState(initial) {
      const index = cursor++;
      if (!hooks[index]) hooks[index] = { value: initial };
      return [hooks[index].value, update => {
        if (fault === 'blocked trigger' && typeof update === 'function') return;
        const value = typeof update === 'function' ? update(hooks[index].value) : update;
        if (!Object.is(value, hooks[index].value)) { hooks[index].value = value; dirty = true; }
      }];
    },
    useRef(initial) {
      const index = cursor++;
      if (!hooks[index]) hooks[index] = { current: initial };
      return hooks[index];
    },
    useEffect(effect, dependencies) {
      const index = cursor++, previous = hooks[index];
      const changed = !previous || dependencies.some((value, i) => !Object.is(value, previous[i]));
      hooks[index] = dependencies;
      const skipSelectionReset = fault === 'missing selection reset' && previous && typeof dependencies[0] === 'string' && dependencies[0].startsWith('https://wa.me/');
      if (changed && !skipSelectionReset) pendingEffects.push(effect);
    },
  };
  const modules = {
    'react/jsx-runtime': { jsx, jsxs: jsx },
    react,
    'next/navigation': { usePathname: () => location.pathname },
    'lucide-react': Object.fromEntries(['ChevronDown', 'MessageCircle', 'Send', 'ShoppingBag'].map(name => [name, () => null])),
    '@/components/acquisition-event-link': { AcquisitionEventLink: ({ attributes, ...props }) => jsx('a', { ...props, ...attributes }) },
    '@/lib/whatsapp-enquiry': enquiries,
    '@/lib/organic-event-referrals': referrals,
    './contact-channel-chooser.module.css': { default: {} },
  };
  const exports = {};
  const compiled = ts.transpileModule(read('components/contact-channel-chooser.tsx'), { fileName: 'chooser.tsx', compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  runInNewContext(compiled, { exports, URLSearchParams, window: { location, matchMedia: () => ({ matches: reducedMotion }) }, require: name => { assert.ok(Object.hasOwn(modules, name), name); return modules[name]; } });
  function nodes() {
    const message = choice === 'session' ? 'Personal session 60 minutes €100' : 'Questions 30 minutes €50';
    let result;
    for (let pass = 0; ; pass++) {
      assert.ok(pass < 10, 'Chooser effects must settle');
      cursor = 0; dirty = false; pendingEffects = []; result = [];
      const tree = exports.ContactChannelChooser({ locale, whatsappUrl: enquiries.whatsappEnquiryUrl({ locale, service: 'Consultation', request: message, pagePath: '/' + locale + '/services/psychohomeopathy?private=never-share' }), attributes: { 'data-consultation-action': choice }, onChannelClick: channel => channelClicks.push(channel) });
      function visit(node, hidden = false) {
        if (!node || typeof node !== 'object') return;
        if (Array.isArray(node)) { node.forEach(child => visit(child, hidden)); return; }
        const invisible = hidden || Boolean(node.props.hidden);
        if (node.props.ref) node.props.ref.current = { scrollIntoView: options => scrollCalls.push({ ...options }) };
        if (!(fault === 'missing telegram' && node.props['data-contact-channel'] === 'telegram')) result.push({ ...node, hidden: invisible });
        visit(node.props.children, invisible);
      }
      visit(tree);
      pendingEffects.forEach(effect => effect());
      if (!dirty) break;
    }
    if (fault === 'initially open') {
      result.forEach(node => { node.hidden = false; if (Object.hasOwn(node.props, 'data-contact-order')) node.props['aria-expanded'] = true; });
    }
    const wa = result.find(node => node.props['data-contact-channel'] === 'whatsapp');
    const tg = result.find(node => node.props['data-contact-channel'] === 'telegram');
    if (fault === 'duplicate channel') result.push({ ...wa });
    if (fault === 'wrong recipient') wa.props.href = wa.props.href.replace('14376066502', '10000000000');
    if (fault === 'wrong host') tg.props.href = tg.props.href.replace('https://t.me', 'https://evil.example');
    if (fault === 'extra query') wa.props.href += '&private=secret';
    if (fault === 'empty message') wa.props.href = 'https://wa.me/14376066502?text=';
    if (fault === 'changed telegram message') tg.props.href = 'https://t.me/AndyTherapist?text=other';
    if (fault === 'missing safety rel') wa.props.rel = 'noreferrer';
    if (fault === 'same tab') tg.props.target = '_self';
    if (fault === 'hidden after open' && hooks[0].value) tg.hidden = true;
    return result;
  }
  function locator(selector) {
    const match = selector.match(/^(a|button)?\[([\w-]+)(?:="([^"]+)")?\]$/);
    assert.ok(match, selector);
    const selected = () => nodes().filter(node => (!match[1] || node.type === match[1]) && Object.hasOwn(node.props, match[2]) && (match[3] === undefined || node.props[match[2]] === match[3]));
    return { locator, selected, async getAttribute(name) { const values = selected(); assert.equal(values.length, 1); return values[0].props[name] ?? null; }, async click() {
      const values = selected(); assert.equal(values.length, 1);
      if (values[0].type === 'a') { externalClicks++; assert.fail('Acceptance must not click external contact links'); }
      values[0].props.onClick();
    } };
  }
  const expect = actual => ({
    async toHaveCount(n) { assert.equal(actual.selected().length, n); },
    async toBeVisible() { assert.equal(actual.selected().length, 1); assert.equal(actual.selected()[0].hidden, false); },
    async toBeHidden() { assert.equal(actual.selected().length, 1); assert.equal(actual.selected()[0].hidden, true); },
    async toHaveAttribute(name, value) {
      const raw = await actual.getAttribute(name); const actualValue = raw == null ? null : String(raw);
      if (value instanceof RegExp) assert.match(actualValue, value); else assert.equal(actualValue, value);
    },
  });
  return { scope: { locator }, expect, choose: value => { choice = value; }, navigate: (pathname, search) => Object.assign(location, { pathname, search }), externalClicks: () => externalClicks, scrollCalls, channelClicks };
}

for (const locale of ['en', 'ru', 'es']) test(locale + ' actual chooser opens exactly two safe channels and updates both prepared requests', async () => {
  const mounted = mountChooser(locale);
  const chooser = await openContactChannelChooser(mounted.scope, mounted.expect);
  const first = await assertPreparedContactChannels(chooser, mounted.expect);
  assert.match(first.whatsappUrl.searchParams.get('text'), /60 minutes €100/);
  assert.doesNotMatch(first.whatsappUrl.searchParams.get('text'), /private|never-share/);
  mounted.choose('questions');
  await openContactChannelChooser(mounted.scope, mounted.expect);
  const next = await assertPreparedContactChannels(chooser, mounted.expect);
  assert.match(next.whatsappUrl.searchParams.get('text'), /30 minutes €50/);
  assert.notEqual(next.whatsappUrl.href, first.whatsappUrl.href);
  for (const link of [next.whatsapp, next.telegram]) assert.equal(await link.getAttribute('data-consultation-action'), 'questions');
  mounted.choose('session');
  await openContactChannelChooser(mounted.scope, mounted.expect);
  assert.equal((await assertPreparedContactChannels(chooser, mounted.expect)).whatsappUrl.href, first.whatsappUrl.href);
  assert.equal(mounted.externalClicks(), 0);
});
for (const fault of ['initially open', 'blocked trigger', 'missing telegram', 'duplicate channel', 'wrong recipient', 'wrong host', 'extra query', 'empty message', 'changed telegram message', 'missing safety rel', 'same tab', 'hidden after open']) {
  test('chooser acceptance rejects ' + fault, async () => {
    const mounted = mountChooser('en', fault);
    await assert.rejects(openContactChannelChooser(mounted.scope, mounted.expect));
    assert.equal(mounted.externalClicks(), 0);
  });
}

for (const reducedMotion of [false, true]) test('chooser effects reset only changed requests and respect reduced motion: ' + reducedMotion, async () => {
  const mounted = mountChooser('en', undefined, reducedMotion);
  await mounted.expect(mounted.scope.locator('button[data-contact-order]')).toHaveAttribute('aria-expanded', 'false');
  assert.deepEqual(mounted.scrollCalls, []);
  const chooser = await openContactChannelChooser(mounted.scope, mounted.expect);
  assert.deepEqual(mounted.scrollCalls, [{ block: 'center', behavior: reducedMotion ? 'auto' : 'smooth' }]);
  mounted.choose('session');
  await assertPreparedContactChannels(chooser, mounted.expect);
  assert.equal(mounted.scrollCalls.length, 1, 'Unchanged request must neither reset nor scroll again');
  mounted.choose('questions');
  await mounted.expect(mounted.scope.locator('button[data-contact-order]')).toHaveAttribute('aria-expanded', 'false');
  for (const channel of ['whatsapp', 'telegram']) await mounted.expect(chooser.locator('a[data-contact-channel="' + channel + '"]')).toBeHidden();
  assert.equal(mounted.scrollCalls.length, 1, 'Reset must not scroll the hidden panel');
  await openContactChannelChooser(mounted.scope, mounted.expect);
  assert.equal(mounted.scrollCalls.length, 2);
  await chooser.locator('button[data-contact-order]').click();
  await openContactChannelChooser(mounted.scope, mounted.expect);
  assert.equal(mounted.scrollCalls.length, 3, 'Manual dismissal must remain reopenable');
  assert.equal(mounted.externalClicks(), 0);
});

test('chooser acceptance rejects stale-open selection when its reset effect is missing', async () => {
  const mounted = mountChooser('en', 'missing selection reset');
  await openContactChannelChooser(mounted.scope, mounted.expect);
  mounted.choose('questions');
  await assert.rejects(openContactChannelChooser(mounted.scope, mounted.expect));
  assert.equal(mounted.externalClicks(), 0);
});

function plainRequest(locale, choice = 'session') {
  return new URL(enquiries.whatsappEnquiryUrl({ locale, service: 'Consultation', request: choice === 'session' ? 'Personal session 60 minutes €100' : 'Questions 30 minutes €50', pagePath: '/' + locale + '/services/psychohomeopathy?private=never-share' })).searchParams.get('text');
}

for (const [locale, label] of [['en', 'Event referral'], ['ru', 'Источник мероприятия'], ['es', 'Origen del evento']]) {
  test(locale + ' actual chooser keeps approved referral on both channels, resets selection and refreshes public route attribution', async () => {
    const mounted = mountChooser(locale, undefined, false, { search: '?utm_source=eventbrite&utm_medium=organic_event&utm_campaign=public_event_2026&utm_content=listing' });
    const chooser = await openContactChannelChooser(mounted.scope, mounted.expect);
    async function assertDraft(choice, suffix = '') {
      const channels = await assertPreparedContactChannels(chooser, mounted.expect);
      for (const url of [channels.whatsappUrl, channels.telegramUrl]) {
        assert.equal(url.searchParams.get('text'), plainRequest(locale, choice) + suffix);
        assert.doesNotMatch(url.searchParams.get('text'), /utm_|listing|private|never-share/);
      }
      for (const link of [channels.whatsapp, channels.telegram]) assert.equal(await link.getAttribute('data-consultation-action'), choice);
    }
    const firstSuffix = '\n\n' + label + ': Eventbrite · public_event_2026';
    await assertDraft('session', firstSuffix);
    mounted.choose('questions');
    await openContactChannelChooser(mounted.scope, mounted.expect);
    await assertDraft('questions', firstSuffix);
    mounted.navigate('/' + locale + '/services/free-situation-review', '?utm_source=meetup&utm_medium=organic_event&utm_campaign=next_public_event');
    await assertDraft('questions', '\n\n' + label + ': Meetup · next_public_event');
    mounted.navigate('/' + locale + '/app/tests', '?utm_source=eventbrite&utm_medium=organic_event&utm_campaign=public_event_2026');
    await assertDraft('questions');
    mounted.navigate('/' + locale + '/services/psychohomeopathy', '?utm_source=eventbrite&utm_medium=organic_event&utm_campaign=public_event_2026&email=must-not-share');
    await assertDraft('questions');
    assert.equal(mounted.scrollCalls.length, 2, 'Referral refresh must not reopen or scroll the unchanged request');
    assert.equal(mounted.externalClicks(), 0);
    assert.deepEqual(mounted.channelClicks, [], 'Preparing referrals must not invoke a contact action');
  });
}

test('actual chooser ignores invalid or personal referral parameters without changing either prepared request', async () => {
  const valid = '?utm_source=eventbrite&utm_medium=organic_event&utm_campaign=public_event_2026';
  for (const search of [
    valid.replace('eventbrite', 'unknown'),
    valid.replace('organic_event', 'paid'),
    valid + '&utm_source=meetup',
    valid + '&utm_content=listing&utm_content=other',
    valid + '&answer=must-not-share',
    valid + '&token=must-not-share',
    valid.replace('public_event_2026', 'private%20answer'),
  ]) {
    const mounted = mountChooser('en', undefined, false, { search });
    const chooser = await openContactChannelChooser(mounted.scope, mounted.expect);
    const channels = await assertPreparedContactChannels(chooser, mounted.expect);
    for (const url of [channels.whatsappUrl, channels.telegramUrl]) assert.equal(url.searchParams.get('text'), plainRequest('en'), search);
    assert.equal(mounted.externalClicks(), 0);
    assert.deepEqual(mounted.channelClicks, []);
  }
});

test('release retains explicit paid selection, free internal action, reset, privacy and separate footer Telegram checks', () => {
  const source = read('scripts/verify-release-reaudit.mjs');
  const paid = source.slice(source.indexOf("await check('paid-imagery-consultation-safe-handoff'"), source.indexOf("if (width === 390)"));
  assert.match(paid, /services\/imagery-therapy/);
  assert.match(paid, /openContactChannelChooser\(capture, expect\)/);
  assert.match(paid, /assertPreparedContactChannels\(chooser, expect\)/);
  assert.match(paid, /\[data-consultation-action\]'\)\)\.toHaveCount\(2\)/);
  assert.match(paid, /for \(const action of \[whatsapp, telegram\]\)/);
  assert.match(paid, /assertPaidUrl\('session', '60', '€100'\)/);
  assert.match(paid, /nth\(1\)\.click\(\);\s*chooser = await openContactChannelChooser\(capture, expect\);\s*const changedUrl = await assertPaidUrl\('questions', '30', '€50'\)/);
  assert.match(paid, /\[data-contact-channel-chooser\]'\)\)\.toHaveCount\(0\)/);
  assert.match(paid, /await expect\(action\)\.toHaveCount\(1\)/);
  assert.match(paid, /assert.equal\(freeUrl.href, origin \+ `\/\$\{locale\}\/services\/free-situation-review`\)/);
  assert.match(paid, /Reset must restore the exact paid request/);
  assert.match(paid, /telegram"\]:not\(\[data-consultation-action\]\)/);
  assert.match(paid, /No private intake fields/);
  assert.match(source, /assert\.deepEqual\(cspErrors, \[\]/);
});

test('both core-service scripts explicitly open the uniquely scoped chooser without changing unrelated direct handoffs', () => {
  const app = read('scripts/verify-app-r1.mjs');
  assert.match(app, /data-sitewide-capture="core-service"/);
  assert.match(app, /openContactChannelChooser\(capture,expect\)/);
  assert.match(app, /message.includes\(names\[locale\]\)/);
  assert.match(app, /openContactChannelChooser\(ready,expect\)/);
  assert.match(app, /const order=promo.locator\('a\[data-contact-channel="whatsapp"\]'\)/);
  const production = read('scripts/verify-public-services-production.mjs');
  assert.match(production, /main.locator\('section:has\(> details\)'\)/);
  assert.match(production, /assert.equal\(await capture.count\(\), 1/);
  assert.match(production, /openContactChannelChooser\(capture, expect\)/);
  assert.match(production, /Prepared request must retain the selected service/);
  assert.match(production, /alternative starts collapsed/);
  assert.match(production, /Only|isolated loopback server/);
  assert.match(production, /require\(\(process.env.HH_PLAYWRIGHT_PACKAGE \|\| "playwright"\) \+ "\/test"\)/);
  const loader = production.match(/const \{ expect \} = require\([^;]+;/)?.[0];
  assert.ok(loader, 'Execute the real override-aware assertion loader');
  for (const override of [undefined, '/tmp/isolated-tools/node_modules/playwright']) {
    const calls = [];
    const sentinel = () => {};
    const loaded = new Function('require', 'process', loader + '; return expect;')(path => {
      calls.push(path);
      return { expect: sentinel };
    }, { env: { HH_PLAYWRIGHT_PACKAGE: override } });
    assert.equal(loaded, sentinel);
    assert.deepEqual(calls, [(override || 'playwright') + '/test']);
  }
});

test('actual core JSX has one footer section with one chooser and the matching service draft', () => {
  const exports = {};
  let pathname;
  const modules = {
    'react/jsx-runtime': { jsx, jsxs: jsx },
    react: { useEffect: () => {}, useState: initial => [initial === null ? pathname : initial, () => {}] },
    'next/navigation': { usePathname: () => pathname },
    '@/lib/public-lead-capture': publicLead,
    '@/components/consultation-choice-capture': { ConsultationChoiceCapture: () => null },
    '@/components/acquisition-event-link': { AcquisitionEventLink: props => jsx('a', props) },
    'next/image': { default: () => null },
    'next/link': { default: props => jsx('a', props) },
    'lucide-react': Object.fromEntries(['ArrowLeft', 'ArrowRight', 'ArrowUpRight', 'Check', 'ShieldCheck'].map(name => [name, () => null])),
    '@/components/contact-channel-chooser': { ContactChannelChooser: props => jsx('contact-chooser', props) },
    '@/lib/whatsapp-enquiry': enquiries,
    '@/components/service-video-showcase': { ServiceVideoShowcase: () => null },
    './core-service-detail.module.css': { default: {} },
    './sitewide-lead-capture.module.css': { default: {} },
  };
  const compiled = ts.transpileModule(read('components/core-service-detail.tsx'), { fileName: 'core.tsx', compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  runInNewContext(compiled, { exports, require: name => { assert.ok(Object.hasOwn(modules, name), name); return modules[name]; } });
  modules['@/components/core-service-detail'] = exports;
  const sitewide = {};
  const compiledSitewide = ts.transpileModule(read('components/sitewide-lead-capture.tsx'), { fileName: 'sitewide.tsx', compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  runInNewContext(compiledSitewide, { exports: sitewide, require: name => { assert.ok(Object.hasOwn(modules, name), name); return modules[name]; } });
  const nodes = tree => !tree || typeof tree !== 'object' ? [] : Array.isArray(tree) ? tree.flatMap(nodes) : [tree, ...nodes(tree.props.children)];
  for (const locale of ['en', 'ru']) for (const kind of ['dao', 'alchemy', 'hypnotherapy']) {
    const tree = exports.CoreServiceDetail({ locale, kind });
    const footer = nodes(tree).filter(node => node.type === 'section' && [node.props.children].flat().some(child => child?.type === 'details'));
    assert.equal(footer.length, 1, 'section:has(> details) selects exactly the footer');
    const choosers = nodes(footer).filter(node => node.type === 'contact-chooser');
    assert.equal(choosers.length, 1, 'footer scope excludes the hero chooser');
    const title = nodes(tree).find(node => node.type === 'h1').props.children;
    const detail = exports.coreOfferDetailData(locale, kind);
    const slug = { dao: 'dao-health-profile', alchemy: 'alchemy-of-soul', hypnotherapy: 'hypnotherapy-course' }[kind];
    const expected = enquiries.whatsappEnquiryUrl({ locale, service: title, request: detail.actionMessage, option: detail.action, pagePath: '/' + locale + '/services/' + slug });
    assert.equal(choosers[0].props.whatsappUrl, expected, 'Core draft retains exact service, request, option and public page');
    for (const chooser of nodes(tree).filter(node => node.type === 'contact-chooser')) assert.equal(chooser.props.whatsappUrl, expected);
    pathname = '/' + locale + '/services/' + slug;
    const fallback = sitewide.SitewideLeadCapture();
    if (kind === 'alchemy') {
      assert.equal(fallback, null, 'Dedicated Alchemy form suppresses duplicate global capture');
      assert.match(read('components/alchemy-soul-lead-form.tsx'), /data-alchemy-lead-form="single"/);
      assert.match(read('components/alchemy-soul-lead-form.tsx'), /ContactChannelChooser/);
      continue;
    }
    assert.equal(fallback.props['data-core-service-capture'], kind);
    const fallbackChoosers = nodes(fallback).filter(node => node.type === 'contact-chooser');
    assert.equal(fallbackChoosers.length, 1);
    assert.equal(fallbackChoosers[0].props.whatsappUrl, expected, 'Hydrated sitewide draft must exactly match the named core service');
  }
});

function assertFreeReviewCallerContract(source, compact = false) {
  assert.match(source, compact ? /openContactChannelChooser\(ready,expect\)/ : /openContactChannelChooser\(ready, expect\)/);
  assert.match(source, compact ? /assertPreparedContactChannels\(readyChooser,expect\)/ : /assertPreparedContactChannels\(readyChooser, expect\)/);
  for (const channel of ['whatsapp', 'telegram']) assert.ok(source.includes('!' + channel + 'Text.includes(marker)'), channel + ' must reject private answer markers');
  assert.match(source, /decodedPageUrl\.includes\(marker\)/);
  assert.doesNotMatch(source, /ready\.getByRole\('button'\)\.click/);
  if (compact) {
    assert.match(source, /name:\s*copy\.copyButton,\s*exact:\s*true/);
    assert.match(source, /Analytics event metadata never contains answers/);
    assert.match(source, /Temporary analytics hold must emit no acquisition events/);
  }
}

test('free-review verifier callers open both channels, keep generic drafts and target only Copy answers', () => {
  for (const [path, compact] of [['scripts/verify-app-r1.mjs', true], ['scripts/verify-public-services-production.mjs', false]]) {
    const source = read(path);
    assertFreeReviewCallerContract(source, compact);
    for (const changed of [
      source.replace(/openContactChannelChooser\(ready,\s*expect\)/, 'ready'),
      source.replace('!telegramText.includes(marker)', 'true'),
      ...(compact ? [source.replace(/name:\s*copy\.copyButton,\s*exact:\s*true/g, '')] : []),
    ]) assert.throws(() => assertFreeReviewCallerContract(changed, compact), path);
  }
  const intake = read('components/free-drawing-intake.tsx');
  const draft = intake.slice(intake.indexOf('const whatsappUrl ='), intake.indexOf('function changeAnswer'));
  assert.match(draft, /request: t\.whatsappIntro/);
  assert.doesNotMatch(draft, /\b(?:answers|problem|goal|obstacle|tried)\b/);
  assert.doesNotMatch(intake, /fetch\(|localStorage|sessionStorage|sendBeacon|\/api\//);
  const temple = read('components/temple-initiation-chooser.tsx');
  assert.match(temple, /<ContactChannelChooser/);
  assert.doesNotMatch(temple, /<a[^>]*href=\{whatsappUrl\}/);
  assert.match(read('scripts/verify-contact-channel-chooser-browser.mjs'), /verifyChooser\(page,templeChooser/);
});
