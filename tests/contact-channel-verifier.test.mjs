import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test, { afterEach } from 'node:test';
import ts from 'typescript';
import { openContactChannelChooser, assertPreparedContactChannels } from '../scripts/helpers/contact-channel-verifier.mjs';
import * as enquiries from '../lib/whatsapp-enquiry.js';
import { mountSavedChooser, openSavedContactChooser, savedSuffix } from './helpers/save-first-chooser-harness.mjs';
import * as publicLead from '../lib/public-lead-capture.js';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const jsx = (type, props) => typeof type === 'function' ? type(props || {}) : { type, props: props || {} };
const activeMounts = new Set();
function mountChooser(...args) {
  const mounted = mountSavedChooser(...args);
  activeMounts.add(mounted);
  return mounted;
}
afterEach(() => { for (const mounted of activeMounts) mounted.unmount(); activeMounts.clear(); });

for (const locale of ['en', 'ru', 'es']) test(locale + ' actual chooser exposes exactly two safe channels only after save and updates both prepared requests', async () => {
  const mounted = mountChooser(locale);
  const chooser = await openSavedContactChooser(mounted);
  const first = await assertPreparedContactChannels(chooser, mounted.expect);
  assert.match(first.whatsappUrl.searchParams.get('text'), /60 minutes €100/);
  assert.doesNotMatch(first.whatsappUrl.searchParams.get('text'), /private|never-share/);
  mounted.choose('questions');
  await openSavedContactChooser(mounted);
  const next = await assertPreparedContactChannels(chooser, mounted.expect);
  assert.match(next.whatsappUrl.searchParams.get('text'), /30 minutes €50/);
  assert.notEqual(next.whatsappUrl.href, first.whatsappUrl.href);
  for (const link of [next.whatsapp, next.telegram]) assert.equal(await link.getAttribute('data-consultation-action'), 'questions');
  mounted.choose('session');
  await openSavedContactChooser(mounted);
  assert.equal((await assertPreparedContactChannels(chooser, mounted.expect)).whatsappUrl.searchParams.get('text'), plainRequest(locale) + savedSuffix(locale, mounted.referenceCode));
  assert.equal(new Set(mounted.calls.map(call => JSON.parse(call.body).operationId)).size, 3, 'Each changed selection needs its own explicit synthetic save');
  assert.equal(mounted.externalClicks(), 0);
});
for (const fault of ['initially open', 'blocked trigger', 'missing telegram', 'duplicate channel', 'wrong recipient', 'wrong host', 'extra query', 'empty message', 'changed telegram message', 'missing safety rel', 'same tab', 'hidden after open']) {
  test('chooser acceptance rejects ' + fault, async () => {
    const mounted = mountChooser('en', fault);
    await assert.rejects(openSavedContactChooser(mounted));
    if (['initially open', 'blocked trigger'].includes(fault)) {
      assert.ok(mounted.mutations.includes(fault), 'Rejected the intended actual-component mutation');
      assert.equal(mounted.attempts.length, 0);
    } else {
      assert.equal(mounted.calls.length, 1, 'Channel fault was reached after an actual synthetic save');
      await mounted.expect(mounted.scope.locator('form')).toHaveCount(0);
      await mounted.expect(mounted.scope.locator('[role="status"]')).toHaveCount(1);
    }
    assert.equal(mounted.externalClicks(), 0);
  });
}

for (const reducedMotion of [false, true]) test('chooser effects reset only changed requests and respect reduced motion: ' + reducedMotion, async () => {
  const mounted = mountChooser('en', undefined, reducedMotion);
  await mounted.expect(mounted.scope.locator('button[data-contact-order]')).toHaveAttribute('aria-expanded', 'false');
  assert.deepEqual(mounted.scrollCalls, []);
  const chooser = await openSavedContactChooser(mounted);
  assert.deepEqual(mounted.scrollCalls, Array.from({ length: 2 }, () => ({ block: 'center', behavior: reducedMotion ? 'auto' : 'smooth' })), 'Opening and confirmed save each reposition the intended target');
  mounted.choose('session');
  await assertPreparedContactChannels(chooser, mounted.expect);
  assert.equal(mounted.scrollCalls.length, 2, 'Unchanged request must neither reset nor scroll again');
  mounted.choose('questions');
  await mounted.expect(mounted.scope.locator('button[data-contact-order]')).toHaveAttribute('aria-expanded', 'false');
  await mounted.expect(chooser.locator('a[data-contact-channel]')).toHaveCount(0);
  assert.equal(mounted.field('checkbox').props.checked, false, 'New selection cannot inherit consent');
  assert.equal(mounted.scrollCalls.length, 2, 'Reset must not scroll the hidden panel');
  await openSavedContactChooser(mounted);
  assert.equal(mounted.scrollCalls.length, 4, 'New opening and confirmed save each reposition the intended target');
  await chooser.locator('button[data-contact-order]').click();
  await openSavedContactChooser(mounted);
  assert.equal(mounted.scrollCalls.length, 5, 'Manual dismissal must remain reopenable');
  assert.equal(mounted.externalClicks(), 0);
});

test('chooser acceptance rejects stale-open selection when its keyed scope reset is missing', async () => {
  const mounted = mountChooser('en', 'missing selection reset');
  await openSavedContactChooser(mounted);
  mounted.choose('questions');
  await assert.rejects(openSavedContactChooser(mounted));
  assert.equal(mounted.externalClicks(), 0);
});

function plainRequest(locale, choice = 'session') {
  return new URL(enquiries.whatsappEnquiryUrl({ locale, service: 'Consultation', request: choice === 'session' ? 'Personal session 60 minutes €100' : 'Questions 30 minutes €50', pagePath: '/' + locale + '/services/psychohomeopathy?private=never-share' })).searchParams.get('text');
}

for (const [locale, label] of [['en', 'Event referral'], ['ru', 'Источник мероприятия'], ['es', 'Origen del evento']]) {
  test(locale + ' actual chooser keeps approved referral on both channels, resets selection and refreshes public route attribution', async () => {
    const mounted = mountChooser(locale, undefined, false, { search: '?utm_source=eventbrite&utm_medium=organic_event&utm_campaign=public_event_2026&utm_content=listing' });
    const chooser = await openSavedContactChooser(mounted);
    async function assertDraft(choice, suffix = '') {
      const channels = await assertPreparedContactChannels(chooser, mounted.expect);
      for (const url of [channels.whatsappUrl, channels.telegramUrl]) {
        assert.equal(url.searchParams.get('text'), plainRequest(locale, choice) + suffix + savedSuffix(locale, mounted.referenceCode));
        assert.doesNotMatch(url.searchParams.get('text'), /utm_|listing|private|never-share/);
      }
      for (const link of [channels.whatsapp, channels.telegram]) assert.equal(await link.getAttribute('data-consultation-action'), choice);
    }
    const firstSuffix = '\n\n' + label + ': Eventbrite · public_event_2026';
    await assertDraft('session', firstSuffix);
    mounted.choose('questions');
    await openSavedContactChooser(mounted);
    await assertDraft('questions', firstSuffix);
    mounted.navigate('/' + locale + '/services/free-situation-review', '?utm_source=meetup&utm_medium=organic_event&utm_campaign=next_public_event');
    await openSavedContactChooser(mounted);
    await assertDraft('questions', '\n\n' + label + ': Meetup · next_public_event');
    mounted.navigate('/' + locale + '/app/tests', '?utm_source=eventbrite&utm_medium=organic_event&utm_campaign=public_event_2026');
    await openSavedContactChooser(mounted);
    await assertDraft('questions');
    mounted.navigate('/' + locale + '/services/psychohomeopathy', '?utm_source=eventbrite&utm_medium=organic_event&utm_campaign=public_event_2026&email=must-not-share');
    await openSavedContactChooser(mounted);
    await assertDraft('questions');
    assert.equal(mounted.scrollCalls.length, 10, 'Each changed route creates a closed scope, then deliberate reopen and confirmed save reposition their targets');
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
    const chooser = await openSavedContactChooser(mounted);
    const channels = await assertPreparedContactChannels(chooser, mounted.expect);
    for (const url of [channels.whatsappUrl, channels.telegramUrl]) assert.equal(url.searchParams.get('text'), plainRequest('en') + savedSuffix('en', mounted.referenceCode), search);
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
  assertPublicCoreSaveGatedCaller(production, read('scripts/helpers/public-enquiry-ui-verifier.mjs'));
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
    '@/lib/public-card-artwork': loadPublicArtwork(),
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
  // Keep the unrelated appR1 caller and all its original source assertions unchanged.
  for (const [path, compact] of [['scripts/verify-app-r1.mjs', true]]) {
    const source = read(path);
    assertFreeReviewCallerContract(source, compact);
    for (const changed of [
      source.replace(/openContactChannelChooser\(ready,\s*expect\)/, 'ready'),
      source.replace('!telegramText.includes(marker)', 'true'),
      ...(compact ? [source.replace(/name:\s*copy\.copyButton,\s*exact:\s*true/g, '')] : []),
    ]) assert.throws(() => assertFreeReviewCallerContract(changed, compact), path);
  }
  assertPublicDrawingCallerContract(read('scripts/verify-public-services-production.mjs'), read('scripts/helpers/public-enquiry-ui-verifier.mjs'));
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

function assertPublicCoreSaveGatedCaller(source, helper) {
  assert.match(source, /import \{ assertSingleEntryEnquiryUi, exercisePublicEnquiryUi \} from '\.\/helpers\/public-enquiry-ui-verifier\.mjs'/);
  assert.match(source, /const prepared = await exercisePublicEnquiryUi\(page, scope, expect, options\)/);
  assert.match(source, /await runEnquiryFixture\(page, capture, \{ locale, kind: "hypnotherapy" \}\)/);
  assert.match(source, /HH_PUBLIC_QA_ENQUIRY_FIXTURE !== "1"/);
  assert.doesNotMatch(source, /openContactChannelChooser|assertPreparedContactChannels/);
  const receipt = helper.indexOf("await expect(chooser.locator('[role=\"status\"]')).toContainText(referenceCode)");
  const channels = helper.indexOf('const prepared = await assertPreparedContactChannels(chooser, expect)');
  assert.ok(receipt >= 0 && channels > receipt, 'Prepared channels are checked only after the synthetic saved receipt');
  assert.match(helper, /for \(const required of \[service\.title, \.\.\.requiredMessage, referenceCode\]\)/);
  assert.match(helper, /for \(const privateValue of \[\.\.\.Object\.values\(contact\)\.filter\(Boolean\), \.\.\.\(description \? \[description\] : \[\]\), \.\.\.privateValues\]\)/);
  assert.match(helper, /for \(const url of \[prepared\.whatsappUrl, prepared\.telegramUrl\]\)/);
  assert.match(helper, /assert\.ok\(!url\.searchParams\.get\('text'\)\.includes\(privateValue\)/);
  assert.match(helper, /assert\.ok\(!decodeURIComponent\(url\.href\)\.includes\(privateValue\)/);
  assert.match(helper, /assert\.ok\(message\.includes\(required\)/);
  assert.match(helper, /assert\.deepEqual\(request\.body, expectedBody\(requests\[0\]\.body\.operationId\),/);
}

test('public intake compatibility rejects unscoped or ungated core-service fixtures', () => {
  const source = read('scripts/verify-public-services-production.mjs');
  const helper = read('scripts/helpers/public-enquiry-ui-verifier.mjs');
  assertPublicCoreSaveGatedCaller(source, helper);
  for (const [before, after] of [
    ['await exercisePublicEnquiryUi(page, scope, expect, options)', 'await otherFixture(page, scope, expect, options)'],
    ['runEnquiryFixture(page, capture, { locale, kind: "hypnotherapy" })', 'runEnquiryFixture(page, main, { locale, kind: "hypnotherapy" })'],
    ['HH_PUBLIC_QA_ENQUIRY_FIXTURE !== "1"', 'false'],
  ]) {
    assert.ok(source.includes(before));
    assert.throws(() => assertPublicCoreSaveGatedCaller(source.replace(before, after), helper));
  }
  for (const [before, after] of [
    ["await expect(chooser.locator('[role=\"status\"]')).toContainText(referenceCode)", '/* no receipt gate */'],
    ['[service.title, ...requiredMessage, referenceCode]', '[...requiredMessage, referenceCode]'],
    ['...(description ? [description] : [])', '...[]'],
    ["!url.searchParams.get('text').includes(privateValue)", "url.searchParams.get('text').includes(privateValue)"],
    ['!decodeURIComponent(url.href).includes(privateValue)', 'decodeURIComponent(url.href).includes(privateValue)'],
    ['[prepared.whatsappUrl, prepared.telegramUrl]', '[prepared.whatsappUrl]'],
    ['assert.deepEqual(request.body, expectedBody(requests[0].body.operationId)', 'assert.deepEqual(request.body, request.body'],
  ]) {
    assert.ok(helper.includes(before));
    assert.throws(() => assertPublicCoreSaveGatedCaller(source, helper.replace(before, after)));
  }
});

function loadPublicArtwork(source = read('lib/public-card-artwork.ts')) {
  const modules = { '@/data/public-card-artwork-urls.json': JSON.parse(read('data/public-card-artwork-urls.json')) };
  const exports = {};
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  runInNewContext(compiled, { exports, require: name => {
    assert.ok(Object.hasOwn(modules, name), 'Unrecognized artwork dependency: ' + name);
    return modules[name];
  } });
  return exports;
}

test('save-first harness fails closed on unknown imports and uses real public artwork registry', () => {
  assert.throws(() => mountChooser('en', 'unrecognized dependency'), /Unrecognized dependency: @\/lib\/not-allowlisted/);
  const source = read('lib/public-card-artwork.ts');
  const artwork = loadPublicArtwork();
  const registry = JSON.parse(read('data/public-card-artwork-urls.json'));
  const [original, variants] = Object.entries(registry.images)[0];
  assert.ok(original && variants.feature);
  assert.equal(artwork.cardArtworkUrl(original, 'feature'), variants.feature);
  assert.equal(artwork.hasCardArtwork(original), true);
  assert.equal(artwork.cardArtworkUrl('/synthetic-unregistered.png'), '/synthetic-unregistered.png');
  assert.equal(artwork.hasCardArtwork('/synthetic-unregistered.png'), false);
  assert.throws(() => loadPublicArtwork(source.replace('@/data/public-card-artwork-urls.json', '@/data/unknown-registry.json')), /Unrecognized artwork dependency/);
});

test('save-first harness rejects the old immediate-link opener before consent or save', async () => {
  const mounted = mountChooser('en');
  await assert.rejects(openContactChannelChooser(mounted.scope, mounted.expect));
  assert.equal(mounted.calls.length, 0);
  await mounted.expect(mounted.scope.locator('a[data-contact-channel]')).toHaveCount(0);
});

for (const reply of ['error', 'not-saved', 'bad-reference']) test('save-first harness keeps channels absent for ' + reply, async () => {
  const mounted = mountChooser('en');
  await assert.rejects(openSavedContactChooser(mounted, reply));
  await mounted.expect(mounted.scope.locator('a[data-contact-channel]')).toHaveCount(0);
  await mounted.expect(mounted.scope.locator('[role="status"]')).toHaveCount(0);
  assert.equal(mounted.calls.length, 1);
  assert.equal(mounted.field('checkbox').props.disabled, true);
  assert.equal(mounted.externalClicks(), 0);
});

test('save-first harness detects actual consent and receipt-gate mutations', async () => {
  const consent = mountChooser('en', 'bypassed consent');
  assert.ok(consent.mutations.includes('bypassed consent'));
  await assert.rejects(openSavedContactChooser(consent), /No request without explicit reply consent/);
  const receipt = mountChooser('en', 'invalid receipt accepted');
  assert.ok(receipt.mutations.includes('invalid receipt accepted'));
  await openSavedContactChooser(receipt, 'not-saved');
  assert.throws(() => assert.equal(receipt.scope.locator('a[data-contact-channel]').selected().length, 0), 'Malformed saved:false receipt must be detected by the absent-channel contract');
});

test('save-first harness rejects a private optional note in both otherwise valid prepared drafts', async () => {
  const note = 'Synthetic private optional note with spaces.';
  const nominal = mountChooser('en');
  await openSavedContactChooser(nominal, 'saved', note);
  assert.equal(nominal.calls.length, 1);
  assert.equal(JSON.parse(nominal.calls[0].body).description, note);
  assert.equal(nominal.externalClicks(), 0);
  const mounted = mountChooser('en');
  const changedChannels = new Set();
  // Negative fixture only: inspect the real post-receipt anchors, but corrupt
  // their readback equally so channel equality cannot conceal a private note.
  const wrap = locator => ({ ...locator,
    locator: selector => wrap(locator.locator(selector)),
    async getAttribute(name) {
      const value = await locator.getAttribute(name);
      if (name !== 'href' || !value) return value;
      const url = new URL(value), text = url.searchParams.get('text');
      const suffix = savedSuffix('en', mounted.referenceCode);
      assert.ok(text.endsWith(suffix), 'Corrupt only an actual reference-bearing saved draft');
      url.searchParams.set('text', text.slice(0, -suffix.length) + '\n\n' + note + suffix);
      changedChannels.add(url.origin);
      return url.href;
    },
  });
  const originalLocator = mounted.scope.locator;
  mounted.scope.locator = selector => wrap(originalLocator(selector));
  await assert.rejects(openSavedContactChooser(mounted, 'saved', note), /Private contact and optional note stay out of messenger drafts/);
  assert.deepEqual([...changedChannels].sort(), ['https://t.me', 'https://wa.me']);
  assert.equal(mounted.calls.length, 1);
  assert.equal(JSON.parse(mounted.calls[0].body).description, note);
  assert.equal(mounted.externalClicks(), 0);
});


test('actual paid attribution dependency preserves only approved labels after explicit save', async () => {
  const valid = '?utm_source=facebook&utm_medium=paid_social&utm_campaign=hh_free_review_en_toronto_202610&utm_content=ad_a';
  for (const [pathname, search, suffix] of [
    ['/en/services/free-situation-review', valid + '&fbclid=private-click-id', '\n\nAd referral: Facebook · hh_free_review_en_toronto_202610 · ad_a'],
    ['/en/services/free-situation-review', valid + '&email=private-email', ''],
    ['/en/services/free-situation-review', valid + '&utm_source=instagram', ''],
    ['/en/app/tests', valid, ''],
  ]) {
    const mounted = mountChooser('en', undefined, false, { pathname, search });
    const chooser = await openSavedContactChooser(mounted);
    const channels = await assertPreparedContactChannels(chooser, mounted.expect);
    for (const url of [channels.whatsappUrl, channels.telegramUrl]) {
      assert.equal(url.searchParams.get('text'), plainRequest('en') + suffix + savedSuffix('en', mounted.referenceCode));
      assert.doesNotMatch(url.searchParams.get('text'), /private-email|private-click-id|fbclid|utm_/);
    }
    assert.equal(mounted.calls.length, 1);
    assert.deepEqual(mounted.channelClicks, []);
    assert.equal(mounted.externalClicks(), 0);
  }
});


function assertPublicDrawingCallerContract(source, helper) {
  assertPublicCoreSaveGatedCaller(source, helper);
  assert.match(source, /const detailedForm = main\.locator\('\[data-free-drawing-intake\]'\)/);
  assert.match(source, /getByRole\('button', \{ name: freeLanding\.text\.prepare, exact: true \}\)\.click\(\)/);
  assert.match(source, /const ready = detailedForm\.locator\('\[role="region"\]'\)/);
  assert.match(source, /const prepared = await runEnquiryFixture\(page, ready, \{ locale, kind: "drawing", privateValues: \[markerA, markerB\] \}\)/);
  for (const channel of ['whatsapp', 'telegram']) {
    assert.ok(source.includes('!prepared.' + channel + 'Url.searchParams.get("text")?.includes(marker)'), channel + ' must reject private answer markers');
  }
  assert.doesNotMatch(source, /ready\.getByRole\('button'\)\.click/);
  assert.match(helper, /await expect\(consent\)\.not\.toBeChecked\(\)/);
  assert.match(helper, /await consent\.uncheck\(\);\s*await expect\(submit\)\.toBeDisabled\(\)/);
  assert.match(helper, /assert\.equal\(requests\.length, 0, 'Contact details without explicit consent cannot submit'\)/);
  assert.match(helper, /for \(const privateValue of \[\.\.\.Object\.values\(contact\)\.filter\(Boolean\), \.\.\.\(description \? \[description\] : \[\]\), \.\.\.privateValues\]\)/);
  assert.match(helper, /assert\.ok\(!url\.searchParams\.get\('text'\)\.includes\(privateValue\)/);
  assert.match(helper, /assert\.ok\(!decodeURIComponent\(url\.href\)\.includes\(privateValue\)/);
  assert.match(helper, /assert\.ok\(!decodeURIComponent\(page\.url\(\)\)\.includes\(privateValue\)/);
  // Execute the real expected-payload expression with synthetic values: a regex
  // mentioning consent cannot hide added questionnaire fields or consent:false.
  const declaration = helper.match(/const expectedBody = operationId => \(\{[\s\S]*?\}\);/)?.[0];
  assert.ok(declaration, 'Inspect the exact allowlisted synthetic POST contract');
  const contact = { displayName: 'Synthetic Visitor', email: 'visitor@example.test', phone: '' };
  const body = new Function('service', 'description', 'current', 'locale', 'contact', declaration + '; return expectedBody("synthetic-operation");')(
    { title: 'Synthetic drawing request' }, 'Synthetic separate enquiry', { pathname: '/en/services/free-situation-review' }, 'en', contact);
  assert.deepEqual(body, { operationId: 'synthetic-operation', serviceTitle: 'Synthetic drawing request', description: 'Synthetic separate enquiry',
    sourcePath: '/en/services/free-situation-review', locale: 'en', contact, contactConsent: true, website: '' });
}

test('public drawing caller executes its exact scoped consented fixture with both private markers', async () => {
  const source = read('scripts/verify-public-services-production.mjs');
  const helper = read('scripts/helpers/public-enquiry-ui-verifier.mjs');
  assertPublicDrawingCallerContract(source, helper);
  const statement = source.match(/const prepared = await runEnquiryFixture\(page, ready, \{ locale, kind: "drawing", privateValues: \[markerA, markerB\] \}\);/)?.[0];
  assert.ok(statement);
  const execute = new Function('runEnquiryFixture', 'page', 'ready', 'locale', 'markerA', 'markerB', 'return (async () => { ' + statement + ' return prepared; })();');
  for (const locale of ['en', 'ru', 'es']) {
    const page = {}, ready = {}, prepared = {}, calls = [];
    const result = await execute(async (...args) => { calls.push(args); return prepared; }, page, ready, locale, 'Synthetic private problem', 'Synthetic private goal');
    assert.equal(result, prepared);
    assert.deepEqual(calls, [[page, ready, { locale, kind: 'drawing', privateValues: ['Synthetic private problem', 'Synthetic private goal'] }]]);
  }
});

test('public drawing caller rejects widened scope, lost private markers, consent or payload guards', () => {
  const source = read('scripts/verify-public-services-production.mjs');
  const helper = read('scripts/helpers/public-enquiry-ui-verifier.mjs');
  for (const [target, before, after] of [
    ['source', 'runEnquiryFixture(page, ready, { locale, kind: "drawing", privateValues: [markerA, markerB] })', 'runEnquiryFixture(page, main, { locale, kind: "drawing", privateValues: [markerA, markerB] })'],
    ['source', 'kind: "drawing", privateValues: [markerA, markerB]', 'kind: "drawing", privateValues: []'],
    ['source', '!prepared.telegramUrl.searchParams.get("text")?.includes(marker)', 'true'],
    ['source', 'name: freeLanding.text.prepare, exact: true', 'name: freeLanding.text.prepare, exact: false'],
    ['helper', 'await expect(consent).not.toBeChecked()', 'await expect(consent).toBeChecked()'],
    ['helper', 'await consent.uncheck();', '/* consent gate removed */'],
    ['helper', "!url.searchParams.get('text').includes(privateValue)", 'true'],
    ['helper', '!decodeURIComponent(url.href).includes(privateValue)', 'true'],
    ['helper', '...(description ? [description] : [])', '...[]'],
    ['helper', '!decodeURIComponent(page.url()).includes(privateValue)', 'true'],
    ['helper', 'contactConsent: true', 'contactConsent: false'],
    ['helper', "contact, contactConsent: true, website: ''", "contact, contactConsent: true, website: '', questionnaire: 'unexpected'"],
  ]) {
    const original = target === 'source' ? source : helper;
    assert.ok(original.includes(before), 'Intended mutation applies: ' + before);
    const changed = original.replace(before, after);
    assert.throws(() => assertPublicDrawingCallerContract(target === 'source' ? changed : source, target === 'helper' ? changed : helper), before);
  }
});


test('save-first opener rejects actual immediate unsaved links without a form before any request', async () => {
  const mounted = mountChooser('en', 'immediate unsaved links');
  assert.ok(mounted.mutations.includes('immediate unsaved links'));
  await mounted.expect(mounted.scope.locator('form')).toHaveCount(0);
  await mounted.expect(mounted.scope.locator('a[data-contact-channel]')).toHaveCount(2);
  await assert.rejects(openSavedContactChooser(mounted), /prior confirmed synthetic receipt/);
  assert.equal(mounted.attempts.length, 0);
  assert.equal(mounted.calls.length, 0);
  assert.equal(mounted.externalClicks(), 0);
});

test('save-first opener cannot reuse a prior synthetic receipt on a different keyed scope', async () => {
  const mounted = mountChooser('en', 'stale receipt on remount');
  assert.ok(mounted.mutations.includes('stale receipt on remount'));
  await openSavedContactChooser(mounted);
  assert.equal(mounted.calls.length, 1);
  const priorScope = mounted.scopeIdentity;
  mounted.navigate('/en/services/stale-fixture', '');
  await mounted.expect(mounted.scope.locator('form')).toHaveCount(0);
  await mounted.expect(mounted.scope.locator('[role="status"]')).toContainText(mounted.referenceCode);
  assert.notEqual(mounted.scopeIdentity, priorScope);
  await assert.rejects(openSavedContactChooser(mounted), /exact keyed form scope/);
  assert.equal(mounted.attempts.length, 1, 'No new request or inherited consent on the changed route');
  assert.equal(mounted.externalClicks(), 0);
});
