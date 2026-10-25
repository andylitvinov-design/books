import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import { assertPreparedContactChannels } from '../scripts/helpers/contact-channel-verifier.mjs';
import * as enquiries from '../lib/whatsapp-enquiry.js';
import {environment, mount, turn, deferred, success, CONTACT_REFERENCE, compileContactModule} from './helpers/contact-component-fixture.mjs';
import * as publicLead from '../lib/public-lead-capture.js';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const jsx = (type, props) => typeof type === 'function' ? type(props || {}) : { type, props: props || {} };
function mountChooser(locale, fault, reducedMotion = false, locationOptions = {}) {
  let choice = 'session', externalClicks = 0;
  const channelClicks = [];
  const env = environment(locale, {pathname: '/' + locale + '/services/psychohomeopathy', reducedMotion, ...locationOptions});
  const draft = () => enquiries.whatsappEnquiryUrl({locale, service: 'Consultation',
    request: choice === 'session' ? 'Personal session 60 minutes €100' : 'Questions 30 minutes €50',
    pagePath: '/' + locale + '/services/psychohomeopathy?private=never-share'});
  const original = read('components/contact-channel-chooser.tsx');
  const resetTarget = '    setOpen(false);';
  if (fault === 'missing selection reset') assert.equal(original.split(resetTarget).length - 1, 1);
  const f = mount('contact-channel-chooser', 'ContactChannelChooser', {
    locale, whatsappUrl: draft(), stayAfterSave: true,
    attributes: {'data-consultation-action': choice}, onChannelClick: channel => channelClicks.push(channel),
  }, env, {sourceOverride: fault === 'missing selection reset' ? original.replace(resetTarget, '    /* Synthetic missing reset */') : original});
  function nodes() {
    const result = f.nodes().map(node => node.type === 'acquisition-link'
      ? {...node, type: 'a', props: {...node.props, ...node.props.attributes}} : {...node, props: {...node.props}});
    if (fault === 'initially open') result.forEach(node => {node.hidden = false; if (Object.hasOwn(node.props, 'data-contact-order')) node.props['aria-expanded'] = true});
    const wa = result.find(node => node.props['data-contact-channel'] === 'whatsapp');
    const tg = result.find(node => node.props['data-contact-channel'] === 'telegram');
    if (wa && tg) {
      if (fault === 'missing telegram') result.splice(result.indexOf(tg), 1);
      if (fault === 'duplicate channel') result.push({...wa});
      if (fault === 'wrong recipient') wa.props.href = wa.props.href.replace('14376066502', '10000000000');
      if (fault === 'wrong host') tg.props.href = tg.props.href.replace('https://t.me', 'https://evil.example');
      if (fault === 'extra query') wa.props.href += '&private=secret';
      if (fault === 'empty message') wa.props.href = 'https://wa.me/14376066502?text=';
      if (fault === 'changed telegram message') tg.props.href = 'https://t.me/AndyTherapist?text=other';
      if (fault === 'missing safety rel') wa.props.rel = 'noreferrer';
      if (fault === 'same tab') tg.props.target = '_self';
      if (fault === 'hidden after open') tg.hidden = true;
    }
    return result;
  }
  function locator(selector) {
    const match = selector.match(/^(a|button)?\[([\w-]+)(?:="([^"]+)")?\]$/);
    assert.ok(match, selector);
    const selected = () => nodes().filter(node => (!match[1] || node.type === match[1]) && Object.hasOwn(node.props, match[2]) && (match[3] === undefined || node.props[match[2]] === match[3]));
    return {locator, selected, async getAttribute(name) {const values = selected(); assert.equal(values.length, 1); return values[0].props[name] ?? null}, async click() {
      const values = selected(); assert.equal(values.length, 1);
      if (values[0].type === 'a') {externalClicks++; assert.fail('Acceptance must not click external contact links')}
      if (fault !== 'blocked trigger') values[0].props.onClick();
      f.flush();
    }};
  }
  const expect = actual => ({
    async toHaveCount(n) {assert.equal(actual.selected().length, n)},
    async toBeVisible() {assert.equal(actual.selected().length, 1); assert.equal(actual.selected()[0].hidden, false)},
    async toBeHidden() {assert.ok(actual.selected().length === 0 || actual.selected().every(node => node.hidden))},
    async toHaveAttribute(name, value) {
      const raw = await actual.getAttribute(name), actualValue = raw == null ? null : String(raw);
      if (value instanceof RegExp) assert.match(actualValue, value); else assert.equal(actualValue, value);
    },
  });
  return {scope: {locator}, expect, env, f,
    choose(value) {choice = value; f.update({whatsappUrl: draft(), attributes: {'data-consultation-action': choice}})},
    navigate(pathname, search) {env.navigate(pathname, search); f.update()},
    async register() {
      const before = env.requests.length;
      assert.equal(f.find('form').hidden, false, 'Open the actual form before interacting');
      f.change('input', props => props.type === 'email', 'contact-contract@example.invalid');
      assert.equal(f.find('button', props => props.type === 'submit').props.disabled, true);
      await f.submit(); assert.equal(env.requests.length, before, 'Even direct submit without consent is blocked');
      assert.equal(f.nodes().filter(node => node.type === 'acquisition-link').length, 0);
      f.change('input', props => props.type === 'checkbox', true);
      await f.submit(); assert.equal(env.requests.length, before + 1);
      const body = JSON.parse(env.requests.at(-1));
      assert.equal(body.contactConsent, true); assert.equal(body.sourcePath, env.window.location.pathname);
      assert.deepEqual(body.contact, {displayName:'',email:'contact-contract@example.invalid',phone:''});
      assert.equal(body.description, ''); assert.equal(body.serviceTitle, 'Consultation');
      assert.equal(env.navigations.length, 0, 'Explicit stayAfterSave retains the acknowledged receipt');
    },
    externalClicks: () => externalClicks, scrollCalls: env.scrollCalls, channelClicks};
}
async function openCurrentChooser(mounted) {
  const {scope, expect, env, f} = mounted, chooser = scope.locator('[data-contact-channel-chooser]');
  await expect(chooser).toHaveCount(1);
  const trigger = chooser.locator('button[data-contact-order]');
  await expect(trigger).toBeVisible();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(chooser.locator('a[data-contact-channel]')).toHaveCount(0);
  const before = env.requests.length;
  await trigger.click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect(chooser.locator('a[data-contact-channel]')).toHaveCount(0);
  assert.equal(env.requests.length, before, 'Opening is not registration or a messenger handoff');
  await mounted.register();
  assert.ok(f.nodes().some(node => node.props.role === 'status' && JSON.stringify(node.props.children).includes(CONTACT_REFERENCE)), 'Only the acknowledged reference is displayed');
  const channels = await assertPreparedContactChannels(chooser, expect);
  for (const url of [channels.whatsappUrl, channels.telegramUrl]) {
    assert.ok(url.searchParams.get('text').endsWith(referenceSuffix(f.find('div', props => Object.hasOwn(props, 'data-contact-channel-chooser')).props.lang || JSON.parse(env.requests.at(-1)).locale)));
    assert.doesNotMatch(url.searchParams.get('text'), /contact-contract@example\.invalid|private|never-share/);
  }
  assert.deepEqual(env.popups, []); assert.deepEqual(mounted.channelClicks, []);
  return chooser;
}
const referenceSuffix = locale => '\n\n' + ({en:'Enquiry',ru:'Заявка',es:'Solicitud'}[locale]) + ': ' + CONTACT_REFERENCE;

for (const locale of ['en', 'ru', 'es']) test(locale + ' actual chooser consents and registers before exposing exactly two safe channels and updates both prepared requests', async () => {
  const mounted = mountChooser(locale);
  const chooser = await openCurrentChooser(mounted);
  const first = await assertPreparedContactChannels(chooser, mounted.expect);
  assert.match(first.whatsappUrl.searchParams.get('text'), /60 minutes €100/);
  assert.doesNotMatch(first.whatsappUrl.searchParams.get('text'), /private|never-share/);
  mounted.choose('questions');
  await openCurrentChooser(mounted);
  const next = await assertPreparedContactChannels(chooser, mounted.expect);
  assert.match(next.whatsappUrl.searchParams.get('text'), /30 minutes €50/);
  assert.notEqual(next.whatsappUrl.href, first.whatsappUrl.href);
  for (const link of [next.whatsapp, next.telegram]) assert.equal(await link.getAttribute('data-consultation-action'), 'questions');
  mounted.choose('session');
  await openCurrentChooser(mounted);
  assert.equal((await assertPreparedContactChannels(chooser, mounted.expect)).whatsappUrl.href, first.whatsappUrl.href);
  assert.equal(mounted.externalClicks(), 0);
});
for (const fault of ['initially open', 'blocked trigger', 'missing telegram', 'duplicate channel', 'wrong recipient', 'wrong host', 'extra query', 'empty message', 'changed telegram message', 'missing safety rel', 'same tab', 'hidden after open']) {
  test('chooser acceptance rejects ' + fault, async () => {
    const mounted = mountChooser('en', fault);
    await assert.rejects(openCurrentChooser(mounted));
    assert.equal(mounted.externalClicks(), 0);
  });
}

for (const reducedMotion of [false, true]) test('chooser effects reset only changed requests and respect reduced motion: ' + reducedMotion, async () => {
  const mounted = mountChooser('en', undefined, reducedMotion);
  await mounted.expect(mounted.scope.locator('button[data-contact-order]')).toHaveAttribute('aria-expanded', 'false');
  assert.deepEqual(mounted.scrollCalls, []);
  const chooser = await openCurrentChooser(mounted);
  const behavior = reducedMotion ? 'auto' : 'smooth';
  assert.deepEqual(mounted.scrollCalls, [{block:'center',behavior,target:'panel'}, {block:'center',behavior,target:'saved-whatsapp'}]);
  mounted.choose('session');
  await assertPreparedContactChannels(chooser, mounted.expect);
  assert.equal(mounted.scrollCalls.length, 2, 'Unchanged request must neither reset nor scroll again');
  mounted.choose('questions');
  await mounted.expect(mounted.scope.locator('button[data-contact-order]')).toHaveAttribute('aria-expanded', 'false');
  await mounted.expect(chooser.locator('a[data-contact-channel]')).toHaveCount(0);
  assert.equal(mounted.scrollCalls.length, 2, 'Reset must not scroll the hidden panel');
  await openCurrentChooser(mounted);
  assert.equal(mounted.scrollCalls.length, 4, 'New request scrolls open form and acknowledged receipt');
  const count = mounted.env.requests.length;
  await chooser.locator('button[data-contact-order]').click();
  await mounted.expect(chooser.locator('button[data-contact-order]')).toHaveAttribute('aria-expanded', 'false');
  await chooser.locator('button[data-contact-order]').click();
  await assertPreparedContactChannels(chooser, mounted.expect);
  assert.equal(mounted.scrollCalls.length, 5, 'Manual receipt dismissal remains reopenable');
  assert.equal(mounted.env.requests.length, count, 'Reopening a receipt does not register again');
  assert.equal(mounted.externalClicks(), 0);
});

test('chooser acceptance rejects stale-open selection when its reset effect is missing', async () => {
  const mounted = mountChooser('en', 'missing selection reset');
  await openCurrentChooser(mounted);
  mounted.choose('questions');
  await assert.rejects(openCurrentChooser(mounted));
  assert.equal(mounted.externalClicks(), 0);
});

function plainRequest(locale, choice = 'session') {
  return new URL(enquiries.whatsappEnquiryUrl({ locale, service: 'Consultation', request: choice === 'session' ? 'Personal session 60 minutes €100' : 'Questions 30 minutes €50', pagePath: '/' + locale + '/services/psychohomeopathy?private=never-share' })).searchParams.get('text');
}

for (const [locale, label] of [['en', 'Event referral'], ['ru', 'Источник мероприятия'], ['es', 'Origen del evento']]) {
  test(locale + ' actual chooser keeps approved referral on both channels, resets selection and refreshes public route attribution', async () => {
    const mounted = mountChooser(locale, undefined, false, { search: '?utm_source=eventbrite&utm_medium=organic_event&utm_campaign=public_event_2026&utm_content=listing' });
    const chooser = await openCurrentChooser(mounted);
    async function assertDraft(choice, suffix = '') {
      const channels = await assertPreparedContactChannels(chooser, mounted.expect);
      for (const url of [channels.whatsappUrl, channels.telegramUrl]) {
        assert.equal(url.searchParams.get('text'), plainRequest(locale, choice) + suffix + referenceSuffix(locale));
        assert.doesNotMatch(url.searchParams.get('text'), /utm_|listing|private|never-share/);
      }
      for (const link of [channels.whatsapp, channels.telegram]) assert.equal(await link.getAttribute('data-consultation-action'), choice);
    }
    const firstSuffix = '\n\n' + label + ': Eventbrite · public_event_2026';
    await assertDraft('session', firstSuffix);
    mounted.choose('questions');
    await openCurrentChooser(mounted);
    await assertDraft('questions', firstSuffix);
    mounted.navigate('/' + locale + '/services/free-situation-review', '?utm_source=meetup&utm_medium=organic_event&utm_campaign=next_public_event');
    await openCurrentChooser(mounted);
    await assertDraft('questions', '\n\n' + label + ': Meetup · next_public_event');
    mounted.navigate('/' + locale + '/app/tests', '?utm_source=eventbrite&utm_medium=organic_event&utm_campaign=public_event_2026');
    await mounted.expect(chooser.locator('a[data-contact-channel]')).toHaveCount(0);
    const before = mounted.env.requests.length;
    await chooser.locator('button[data-contact-order]').click();
    mounted.f.change('input', props => props.type === 'email', 'contact-contract@example.invalid');
    mounted.f.change('input', props => props.type === 'checkbox', true);
    await mounted.f.submit();
    assert.equal(mounted.env.requests.length, before, 'Private routes cannot register a public enquiry');
    mounted.navigate('/' + locale + '/services/psychohomeopathy', '?utm_source=eventbrite&utm_medium=organic_event&utm_campaign=public_event_2026&email=must-not-share');
    await openCurrentChooser(mounted);
    await assertDraft('questions');
    assert.equal(mounted.scrollCalls.length, 9, 'Every changed public route needs a fresh open and acknowledged receipt; private rejection never scrolls a receipt');
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
    const chooser = await openCurrentChooser(mounted);
    const channels = await assertPreparedContactChannels(chooser, mounted.expect);
    for (const url of [channels.whatsappUrl, channels.telegramUrl]) assert.equal(url.searchParams.get('text'), plainRequest('en') + referenceSuffix('en'), search);
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

test('core-service callers preserve isolated current compact and registered chooser paths', () => {
  const app = read('scripts/verify-app-r1.mjs');
  assert.match(app, /data-sitewide-capture="core-service"/);
  assert.match(app, /verifyHypnotherapyEnquiryJourney\(servicePage,expect,locale\)/);
  assert.match(app, /verifyHypnotherapyEnquiryJourney\(servicePage,expect,locale,\{channel:'telegram',denyReceiptStorage:true\}\)/);
  assert.match(app, /verifyAlchemyEnquiryJourney\(servicePage,expect,locale\)/);
  assert.match(app, /verifyDaoLeadJourney\(servicePage,expect,locale\)/);
  assert.match(app, /No duplicate|Dedicated|current sitewide footer uses CompactLeadCapture/);
  const production = read('scripts/verify-public-services-production.mjs');
  assert.match(production, /main.locator\('section:has\(> details\)'\)/);
  assert.match(production, /assert.equal\(await capture.count\(\), 1/);
  assert.match(production, /openRegisteredContactChannelChooser\(capture, expect, page\)/);
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
  const artwork = compileContactModule(read('lib/public-card-artwork.ts'), {'@/data/public-card-artwork-urls.json': {default: JSON.parse(read('data/public-card-artwork-urls.json'))}}, environment('en'));
  let pathname;
  const modules = {
    'react/jsx-runtime': { jsx, jsxs: jsx },
    react: { useEffect: () => {}, useState: initial => [initial === null ? pathname : initial, () => {}] },
    'next/navigation': { usePathname: () => pathname },
    '@/lib/public-lead-capture': publicLead,
    '@/lib/public-card-artwork': artwork,
    '@/components/compact-lead-capture': {CompactLeadCapture: props => jsx('compact-capture', props)},
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
    if (kind === 'dao') {
      assert.equal(fallback, null, 'Dedicated DAO landing suppresses duplicate global capture');
      assert.equal(publicLead.classifyPublicLead(pathname), null);
      continue;
    }
    if (kind === 'alchemy') {
      assert.equal(fallback, null, 'Dedicated Alchemy form suppresses duplicate global capture');
      assert.match(read('components/alchemy-soul-lead-form.tsx'), /data-alchemy-lead-form="single"/);
      assert.match(read('components/alchemy-soul-lead-form.tsx'), /ContactChannelChooser/);
      continue;
    }
    assert.equal(fallback.props['data-core-service-capture'], kind);
    const fallbackCaptures = nodes(fallback).filter(node => node.type === 'compact-capture');
    assert.equal(fallbackCaptures.length, 1);
    assert.equal(fallbackCaptures[0].props.serviceTitle, detail.title, 'Hydrated compact footer must retain the named core service');
    assert.equal(fallbackCaptures[0].props.locale, locale);
    assert.equal(nodes(fallback).filter(node => node.type === 'contact-chooser').length, 0, 'No duplicate obsolete footer chooser');
  }
});

function assertFreeReviewCallerContract(source, delegated = false) {
  if (delegated) {
    assert.match(source, /verifyFreeReviewJourney\(publicPage,expect,locale,\{kind:'private-entry'\}\)/);
    assert.match(source, /verifyFreeReviewJourney\(publicPage,expect,locale,\{kind:'private-entry',denyReceiptStorage:true,output\}\)/);
    assert.match(source, /verifyFreeReviewJourney\(publicPage,expect,locale,\{kind:'compact',channel:'telegram',denyReceiptStorage:true\}\)/);
    assert.doesNotMatch(source, /kind:'drawing'|openContactChannelChooser\(ready/);
  } else {
    assert.ok(source.includes(`a[href="/' + locale + '/coaching/intake?topic=personal"]`));
    assert.match(source, /preview\.locator\("form,textarea"\)\.count\(\), 0/);
    assert.match(source, /The private answers are entered only in the protected questionnaire/);
  }
}

test('free-review callers use current private entry without answers or copied messenger content', () => {
  for (const [path, delegated] of [['scripts/verify-app-r1.mjs', true], ['scripts/verify-public-services-production.mjs', false]]) {
    const source = read(path);
    assertFreeReviewCallerContract(source, delegated);
    const changes = delegated ? [
      source.replace("kind:'private-entry'", "kind:'drawing'"),
      source.replace("kind:'compact',channel:'telegram',denyReceiptStorage:true", "kind:'compact',channel:'telegram'"),
    ] : [source.replace('/coaching/intake?topic=personal', '/coaching/intake?answer=private'),
      source.replace('preview.locator("form,textarea").count(), 0', 'preview.locator("form,textarea").count(), 1')];
    for (const changed of changes) { assert.notEqual(changed, source); assert.throws(() => assertFreeReviewCallerContract(changed, delegated), path); }
  }
  const intake = read('components/free-drawing-intake.tsx');
  assert.match(intake, /coachingIntakeEntryTopic\(window\.location\.search\)/);
  assert.match(intake, /\/coaching\/intake\?topic=/);
  assert.doesNotMatch(intake, /<form|<textarea|<ContactChannelChooser|navigator\.clipboard|fetch\(|localStorage|sessionStorage|sendBeacon|\/api\//);
  const temple = read('components/temple-initiation-chooser.tsx');
  assert.match(temple, /<ContactChannelChooser/);
  assert.doesNotMatch(temple, /<a[^>]*href=\{whatsappUrl\}/);
  assert.match(read('scripts/verify-contact-channel-chooser-browser.mjs'), /verifyChooser\(page,templeChooser/);
});

for (const locale of ['en','ru','es']) for (const channel of ['whatsapp','telegram']) for (const denied of [false,true]) {
  test(locale + ': actual compact-phone ' + channel + ' requires consent and acknowledged receipt; storage denied=' + denied, async () => {
    const env = environment(locale, {denyReceiptStorage:denied}), hold = deferred(), callbacks = [];
    const whatsappUrl = enquiries.whatsappEnquiryUrl({locale, service:'Synthetic neutral consultation', request:'Please explain the next step.', pagePath:'/' + locale + '/services/free-situation-review'});
    const f = mount('contact-channel-chooser','ContactChannelChooser',{locale,whatsappUrl,compactPhone:true,onChannelClick:value => callbacks.push(value)},env);
    assert.equal(f.nodes().filter(node => node.type === 'input' && node.props.type === 'email').length,0);
    assert.equal(f.nodes().filter(node => node.type === 'acquisition-link').length,0);
    assert.equal(f.find('input',props => props.type === 'checkbox').props.checked,false);
    assert.equal(f.find('input',props => props.type === 'tel').props.required,true);
    // Execute the actual nested phone-country input handlers, not a marker.
    f.change('select',() => true,'GB');
    f.change('input',props => props.type === 'tel','20 7946 0958');
    const button = () => f.find('button',props => props['data-contact-channel-submit'] === channel);
    button().props.onClick(); await turn(f);
    assert.deepEqual(env.requests,[]); assert.deepEqual(env.popups,[]);
    assert.equal(f.nodes().filter(node => node.type === 'acquisition-link').length,0);
    f.change('input',props => props.type === 'checkbox',true);
    env.setRespond(() => hold.promise);
    const handler = button().props.onClick; handler(); handler(); f.flush();
    assert.equal(env.requests.length,1,'Same-tick activation creates only one operation');
    const body = JSON.parse(env.requests[0]);
    assert.deepEqual(body.contact,{displayName:'',email:'',phone:'+442079460958'});
    assert.equal(body.contactConsent,true); assert.equal(body.serviceTitle,'Synthetic neutral consultation');
    assert.equal(body.sourcePath,'/' + locale + '/services/free-situation-review');
    assert.equal(body.description,''); assert.equal(body.website,'');
    assert.equal(env.popups.length,1); assert.equal(env.popups[0].opener,null);
    assert.deepEqual(env.popups[0].destinations,[]); assert.deepEqual(env.writes,[]);
    assert.equal(f.nodes().filter(node => node.type === 'acquisition-link').length,0);
    for (const node of f.nodes().filter(node => ['select','input','button'].includes(node.type))) assert.equal(node.props.disabled,true);
    hold.resolve(success()); await turn(f);
    assert.equal(f.nodes().filter(node => node.type === 'form').length,0);
    const links = f.nodes().filter(node => node.type === 'acquisition-link');
    assert.equal(links.length,2);
    for (const link of links) {
      const kind = link.props.attributes['data-contact-channel'], url = new URL(link.props.href);
      assert.equal(url.origin,kind === 'whatsapp' ? 'https://wa.me' : 'https://t.me');
      assert.equal(url.pathname,kind === 'whatsapp' ? '/14376066502' : '/AndyTherapist');
      assert.deepEqual([...url.searchParams.keys()],['text']);
      assert.equal(link.props.target,'_blank'); assert.equal(link.props.rel,'noopener noreferrer');
      assert.equal(url.searchParams.get('text'),new URL(whatsappUrl).searchParams.get('text') + referenceSuffix(locale));
      assert.doesNotMatch(decodeURIComponent(link.props.href), /442079460958|contactConsent|operationId/);
    }
    assert.deepEqual(env.popups[0].destinations,[links.find(link => link.props.attributes['data-contact-channel'] === channel).props.href]);
    assert.deepEqual(callbacks,[channel]); assert.deepEqual(env.navigations,[]);
    assert.equal(env.writes.length,denied ? 0 : 1);
    if (!denied) assert.deepEqual(Object.keys(JSON.parse(env.writes[0][1])).sort(),['createdAt','referenceCode']);
    assert.deepEqual(env.events,[]);
  });
}
for (const fault of ['network','json','http-error','saved-false','bad-reference','array-reference']) test('compact-phone rejects unconfirmed ' + fault + ' and retries the exact operation',async () => {
  const env = environment('en');
  const whatsappUrl = enquiries.whatsappEnquiryUrl({locale:'en',service:'Synthetic neutral consultation',request:'Please explain the next step.',pagePath:'/en/services/free-situation-review'});
  const f = mount('contact-channel-chooser','ContactChannelChooser',{locale:'en',whatsappUrl,compactPhone:true},env);
  f.change('input',props => props.type === 'tel','+14165550123');
  f.change('input',props => props.type === 'checkbox',true);
  env.setRespond(async () => {
    if (fault === 'network') throw Error('SYNTHETIC_UNKNOWN');
    return {ok:fault !== 'http-error',json:async () => {
      if (fault === 'json') throw Error('SYNTHETIC_JSON');
      return {saved:fault !== 'saved-false',referenceCode:fault === 'bad-reference' ? 'INVALID' : fault === 'array-reference' ? [CONTACT_REFERENCE] : CONTACT_REFERENCE};
    }};
  });
  f.click('button',props => props['data-contact-channel-submit'] === 'telegram'); await turn(f);
  assert.equal(env.requests.length,1); assert.deepEqual(env.writes,[]); assert.deepEqual(env.navigations,[]);
  assert.equal(env.popups[0].closed,true); assert.deepEqual(env.popups[0].destinations,[]);
  assert.equal(f.nodes().filter(node => node.type === 'acquisition-link').length,0);
  assert.equal(f.find('input',props => props.type === 'tel').props.disabled,true);
  assert.equal(f.find('input',props => props.type === 'checkbox').props.disabled,true);
  env.setRespond(success);
  f.click('button',props => props['data-contact-channel-submit'] === 'telegram'); await turn(f);
  assert.equal(env.requests.length,2); assert.equal(env.requests[1],env.requests[0]);
  assert.equal(env.writes.length,1); assert.equal(env.popups[1].destinations.length,1);
});
