import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import { isolatedServiceVideoFixture } from '../scripts/helpers/public-service-methods-verifier.mjs';
import { mountPublicConversion } from './helpers/public-conversion-ui-harness.mjs';
import { assertSingleEntryEnquiryUi, exercisePublicEnquiryUi } from '../scripts/helpers/public-enquiry-ui-verifier.mjs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const source = read('scripts/verify-public-services-production.mjs');
const guard = source.slice(source.indexOf('const origin ='), source.indexOf('const require ='));
function accept(env) { runInNewContext(guard, { process: { env: { CI: 'true', ...env } }, isolatedServiceVideoFixture }); }

test('public-service origin and explicit fixture opt-in fail closed before Playwright or browser launch', () => {
  assert.ok(source.indexOf('const origin =') < source.indexOf('const require ='));
  assert.ok(source.indexOf('HH_PUBLIC_QA_ENQUIRY_FIXTURE !== "1"') < source.indexOf('chromium.launch'));
  for (const origin of ['https://holistichouse.vercel.app', 'https://127.0.0.1:3100', 'http://localhost.evil:3100', 'http://127.0.0.2:3100', 'http://localhost:3100/path', 'http://user@localhost:3100', 'http://localhost:3100?fixture=1']) {
    assert.throws(() => accept({ HH_PUBLIC_QA_ORIGIN: origin, HH_PUBLIC_QA_ENQUIRY_FIXTURE: '1' }), /isolated loopback/);
  }
  for (const flag of [undefined, '', 'true', '0', 'yes']) {
    assert.throws(() => accept({ HH_PUBLIC_QA_ORIGIN: 'http://127.0.0.1:3100', HH_PUBLIC_QA_ENQUIRY_FIXTURE: flag }), /HH_PUBLIC_QA_ENQUIRY_FIXTURE=1/);
  }
  for (const origin of ['http://127.0.0.1:3100', 'http://localhost:3100']) accept({ HH_PUBLIC_QA_ORIGIN: origin, HH_PUBLIC_QA_ENQUIRY_FIXTURE: '1' });
});

test('each former prepared-link call uses the save-gated explicit UI fixture, not production submission', () => {
  assert.doesNotMatch(source, /openContactChannelChooser|assertPreparedContactChannels/);
  for (const kind of ['service', '"business"', '"alchemy"', '"hypnotherapy"', 'kind', '"drawing"']) {
    assert.ok(source.includes(kind === 'kind' ? '{ locale, kind }' : 'kind: ' + kind), kind);
  }
  assert.match(source, /backendPersistenceVerified: false/);
  assert.match(source, /serviceWorkers: "block"/);
  assert.match(source, /backend persistence and messenger delivery NOT verified/);
  assert.match(source, /privateValues: \[markerA, markerB\]/);
  assert.doesNotMatch(source, /whatsappUrl[^\n]*\.click|telegramUrl[^\n]*\.click/);
});

test('only deliberate enquiry 503 console output is recorded as expected', () => {
  assert.match(source, /entry\.path === "\/api\/service-enquiries"/);
  assert.match(source, /entry\.origin === origin && entry\.hasSearch === false/);
  assert.match(source, /status of 503/);
  assert.match(source, /expected\.length <= 1/);
  assert.match(source, /diagnostics\.expectedFixtureErrors\.push/);
  assert.match(source, /diagnostics\.console\.filter\(\(entry\) => entry\.type === "error"\)/);
});

test('existing isolated CI command explicitly opts in, without changing its target or permissions', () => {
  const workflow = read('.github/workflows/hh-public-services-production.yml');
  // The executed-source contract harness imports dev TypeScript under this production job.
  assert.match(workflow, /^\s+- run: npm ci --include=dev --no-audit --no-fund$/m);
  assert.match(workflow, /^\s+NODE_ENV: production$/m);
  assert.match(workflow, /HH_PUBLIC_QA_ORIGIN: http:\/\/127\.0\.0\.1:3100/);
  assert.match(workflow, /HH_PUBLIC_QA_ENQUIRY_FIXTURE='1' node scripts\/verify-public-services-production\.mjs/);
  assert.match(workflow, /contents: read/);
  assert.doesNotMatch(workflow, /SUPABASE_.*(?:KEY|SECRET)|contents: write|id-token: write/);
});


test('expected-503 predicate rejects other origins, query variants, statuses and endpoints', () => {
  const predicate = source.match(/const expected = diagnostics\.console\.slice\(start\)\.filter\((entry => [\s\S]*?)\);/);
  assert.ok(predicate, 'Execute the actual narrowly scoped filter, not a test-side copy');
  const classify = runInNewContext('(' + predicate[1] + ')', { origin: 'http://127.0.0.1:3100' });
  const expected = { type: 'error', origin: 'http://127.0.0.1:3100', path: '/api/service-enquiries', hasSearch: false,
    text: 'Failed to load resource: the server responded with a status of 503 (Service Unavailable)' };
  assert.equal(classify(expected), true);
  for (const mutation of [
    { origin: 'https://holistichouse.vercel.app' }, { origin: 'http://localhost:3100' },
    { origin: '' }, { hasSearch: true }, { path: '/api/service-enquiries/' },
    { path: '/api/other' }, { type: 'warning' },
    { text: 'Failed to load resource: the server responded with a status of 500 (Server Error)' },
    { text: 'A different error mentioning status of 503' },
  ]) assert.equal(classify({ ...expected, ...mutation }), false);
});


test('CRM single-entry production checks do not resurrect duplicate optional fields', () => {
  assert.doesNotMatch(source, /freeLanding\.text\.(?:name|question)|Copy my details/);
  assert.match(read('scripts/helpers/dao-request-ui-verifier.mjs'), /assertSingleEntryEnquiryUi\(enquiry, expect\)/);
  assert.match(read('scripts/helpers/free-situation-ui-verifier.mjs'), /assertSingleEntryEnquiryUi\(enquiry, expect\)/);
  const helper = read('scripts/helpers/public-enquiry-ui-verifier.mjs');
  for (const field of ['contact, contactConsent: true, website:', 'details, name, consent, emailMethod, phoneMethod, google', "contactMode === 'email' ? [email] : [phone, country]", 'Object.values(contact)']) {
    assert.ok(helper.includes(field), field);
  }
});

// Execute the production branch against link fixtures extracted from the actual
// landing JSX. This is a source/selector contract, not a browser or CSS test.
const landingSource = read('components/free-entry-landing.tsx');
const testsBranch = source.match(/if \(kind === "tests"\) \{([\s\S]*?)\n        \} else \{/);
const heroBinding = source.match(/const hero = main\.locator\(([^\n]+)\);/);
assert.ok(testsBranch && heroBinding, 'Use the actual tests branch and hero binding');

function testsLandingFixture(locale, { landing = landingSource, hiddenHero = false, duplicateHero = false,
  visibleNavigation = false, fakeForm = false } = {}) {
  const heroMarkup = landing.match(/<section\b[^>]*aria-labelledby="free-entry-title"[^>]*>[\s\S]*?<\/section>/)?.[0];
  const captureMarkup = landing.match(/<section\b[^>]*id=\{captureId\}[^>]*>[\s\S]*?<\/section>/)?.[0];
  assert.ok(heroMarkup && captureMarkup, 'Actual hero and capture sections must exist');
  const hrefExpression = landing.match(/const testsHref = ([^\n]+);/)?.[1];
  assert.ok(hrefExpression, 'Actual localized explorer expression must exist');
  const href = runInNewContext(hrefExpression, { locale });
  const linksIn = (markup, visible) => [...markup.matchAll(/<Link\b[^>]*href=\{testsHref\}[^>]*>/g)]
    .map(() => ({ tag: 'a', attributes: { href }, visible }));
  const heroLinks = linksIn(heroMarkup, !hiddenHero);
  if (duplicateHero) heroLinks.push(...heroLinks.map(link => ({ ...link })));
  // Same-target navigation comes before the hero, as PublicSiteHeader does in
  // FreeEntryLanding. It remains a decoy even when its menu is opened.
  const navigation = { tag: 'a', attributes: { href, 'data-nav-item': 'tests' }, visible: visibleNavigation };
  const nodes = [
    { tag: 'nav', children: [navigation] },
    { tag: 'section', attributes: { 'aria-labelledby': 'free-entry-title' }, children: heroLinks },
    { tag: 'section', attributes: { id: 'start-free' }, children: linksIn(captureMarkup, true) },
    ...(fakeForm ? [{ tag: 'form', attributes: { 'data-free-resource-enquiry': 'tests' } }] : []),
  ];
  const descendants = entries => entries.flatMap(node => [node, ...descendants(node.children ?? [])]);
  function locator(entries) {
    return {
      entries,
      locator(selector) {
        const match = selector.match(/^(a|section)?\[([\w-]+)(?:="([^"]*)")?\]$/);
        assert.ok(match, 'Only the source contract selectors are supported: ' + selector);
        return locator(descendants(entries).filter(node => (!match[1] || node.tag === match[1])
          && Object.hasOwn(node.attributes ?? {}, match[2])
          && (match[3] === undefined || node.attributes[match[2]] === match[3])));
      },
      first() { return locator(entries.slice(0, 1)); },
      async count() { return entries.length; },
      async waitFor({ state, timeout }) {
        assert.equal(state, 'visible');
        assert.equal(timeout, 30000);
        assert.equal(entries.length, 1, 'CTA must resolve uniquely');
        assert.equal(entries[0].visible, true, 'Intended CTA must be visible');
      },
    };
  }
  return locator(nodes);
}

async function checkTestsStart(locale, options, branch = testsBranch[1]) {
  const main = testsLandingFixture(locale, options);
  const hero = main.locator(runInNewContext(heroBinding[1]));
  const visible = locator => locator.waitFor({ state: 'visible', timeout: 30000 });
  const expect = locator => ({ async toHaveCount(count) {
    assert.equal(await locator.count(), count, 'Exactly one intended hero CTA');
  } });
  return runInNewContext('(async () => {' + branch + '\n})()', { locale, main, hero, visible, expect, assert });
}

test('public tests route binds the real hero CTA instead of the shared hidden navigation', async () => {
  assert.match(read('app/[locale]/tests/page.tsx'), /<FreeEntryLanding locale=\{locale\} kind="tests" \/>/);
  assert.ok(landingSource.indexOf('<PublicSiteHeader ') < landingSource.indexOf('aria-labelledby="free-entry-title"'));
  assert.match(read('components/public-site-header.tsx'), /<SiteNavigation locale=\{locale\} \/>/);
  assert.match(read('components/site-navigation.tsx'), /<details className="site-main-menu" ref=\{siteMenuRef\}>/);
  assert.match(testsBranch[1], /hero\.locator/);
  assert.doesNotMatch(testsBranch[1], /:visible|\.first\(/);
  for (const locale of ['en', 'ru', 'es']) {
    await checkTestsStart(locale);
    await checkTestsStart(locale, { visibleNavigation: true });
    await assert.rejects(checkTestsStart(locale, {},
      `await visible(main.locator('a[href="/' + locale + '/client/tests"]').first());`), /Intended CTA must be visible/);
  }
});

for (const locale of ['en', 'ru', 'es']) {
  test(locale + ' rejects absent, hidden, duplicate and wrong-target hero CTAs despite same-target alternatives', async () => {
    const heroLink = /(<section\b[^>]*aria-labelledby="free-entry-title"[^>]*>[\s\S]*?)<Link\b[^>]*href=\{testsHref\}[^>]*>[\s\S]*?<\/Link>/;
    assert.match(landingSource, heroLink, 'Mutate the actual intended Link, not a test-side copy');
    const missing = landingSource.replace(heroLink, '$1');
    const wrongTarget = landingSource.replace(heroLink, '$1<Link href="/wrong-target">Wrong target</Link>');
    await assert.rejects(checkTestsStart(locale, { landing: missing, visibleNavigation: true }), /Exactly one intended hero CTA/);
    await assert.rejects(checkTestsStart(locale, { landing: wrongTarget, visibleNavigation: true }), /Exactly one intended hero CTA/);
    await assert.rejects(checkTestsStart(locale, { hiddenHero: true, visibleNavigation: true }), /Intended CTA must be visible/);
    await assert.rejects(checkTestsStart(locale, { duplicateHero: true }), /Exactly one intended hero CTA/);
    await assert.rejects(checkTestsStart(locale, { fakeForm: true }), /not a fake contact form/);
  });
}


// Execute this exact production block, not a separately rewritten Alchemy flow.
// The actual component and strict save helper run in the source harness; main
// denotes that fixture's root, not a claim of real browser/layout execution.
const alchemyLeadBlock = source.match(/const form = main\.locator\('\[data-alchemy-lead-form="single"\]'\);([\s\S]*?)\n            const reviewStack =/);
assert.ok(alchemyLeadBlock, 'Production Alchemy lead block must remain explicitly scoped');
const alchemyLeadSource = 'const form = main.locator(\'[data-alchemy-lead-form="single"]\');' + alchemyLeadBlock[1];
const runAlchemyLead = new Function('main', 'page', 'locale', 'expect', 'assertSingleEntryEnquiryUi', 'visible', 'runEnquiryFixture',
  'return (async () => {' + alchemyLeadSource + '\n})()');
async function checkAlchemyLead(mounted, locale, expect = mounted.expect) {
  return runAlchemyLead(mounted.page, mounted.page, locale, expect, assertSingleEntryEnquiryUi,
    locator => expect(locator).toBeVisible(), async (page, scope, options) => {
      assert.equal(mounted.fetchCount(), 0, 'Choosing public format/topic never auto-posts');
      return exercisePublicEnquiryUi(page, scope, expect, options);
    });
}
for (const locale of ['en', 'ru']) {
  test(locale + ' exact production Alchemy block distinguishes topic/format from the country selector and preserves the private save gate', async () => {
    const mounted = mountPublicConversion(locale, 'alchemy');
    const form = mounted.page.locator('[data-alchemy-lead-form="single"]');
    // Owner compact intake mounts no country child until phone is selected.
    // Topic/format remain selected by their exact independent role/name contract.
    await mounted.expect(form.locator('select')).toHaveCount(2);
    await mounted.expect(form.getByRole('combobox', { name: locale === 'ru' ? 'Код страны' : 'Country calling code', exact: true, includeHidden: true })).toHaveCount(0);
    assert.equal(mounted.fetchCount(), 0);
    await checkAlchemyLead(mounted, locale);
    assert.equal(mounted.fetchCount(), 4);
    assert.ok(mounted.requests.every(body => body.contactConsent === true && body.contact.displayName === 'Synthetic Visitor'));
    assert.equal(mounted.externalClicks(), 0);
    assert.equal(mounted.intercepted(), false);
    mounted.unmount(); assert.deepEqual(mounted.writesAfterUnmount, []);
  });

  const faults = [
    ['compact always-mounted phone', 'toHaveCount', 0],
    ['compact wrong initial method', 'toHaveCount', 0],
    ['compact ignored phone selection', 'toHaveAttribute', 0],
    ...['format', 'topic'].flatMap(field => [
      ...['missing', 'duplicate', 'hidden', 'wrong name', 'wrong role'].map(fault => ['alchemy ' + field + ' ' + fault, 'toHaveCount', 0]),
      ...['missing option', 'wrong option'].map(fault => ['alchemy ' + field + ' ' + fault, 'toHaveText', 0]),
      ['alchemy ' + field + ' wrong option value', 'toHaveCount', 0],
      ['alchemy ' + field + ' wrong default', 'toHaveValue', 0],
      ['alchemy ' + field + ' stuck selection', 'toHaveValue', 0],
    ]),
    ['missing country', 'toHaveCount', 0], ['duplicate country', 'toHaveCount', 0],
    ['wrong country name', 'toHaveCount', 0], ['wrong country option value', 'toHaveCount', 0], ['stuck country', 'toHaveValue', 0],
    ['stale alchemy lead format', null, 4, 'Prepared alchemy request must retain'],
    ['stale alchemy topic', null, 4, 'Prepared alchemy request must retain'],
    ['contact URL leak', null, 4, 'Contact and separately entered private details never enter messenger URLs'],
    ['private note URL leak', null, 4, 'Contact and separately entered private details never enter messenger URLs'],
  ];
  for (const [fault, matcher, requests, diagnostic] of faults) test(locale + ' exact production Alchemy block rejects ' + fault + ' at its intended guard', async () => {
    const nominal = mountPublicConversion(locale, 'alchemy');
    await checkAlchemyLead(nominal, locale);
    assert.equal(nominal.fetchCount(), 4); nominal.unmount();
    const mounted = mountPublicConversion(locale, 'alchemy', fault);
    mounted.page.locator('[data-alchemy-lead-form="single"]').selected();
    const mutationPath = fault.includes('country') ? 'components/phone-country-input.tsx'
      : (fault.startsWith('compact ') || fault.endsWith('URL leak')) ? 'components/contact-channel-chooser.tsx' : 'components/alchemy-soul-lead-form.tsx';
    assert.ok(mounted.mutationReceipts.some(receipt => receipt.fault === fault && receipt.path === mutationPath), 'Mutate the actual compiled dependency');
    let failedMatcher;
    const expect = actual => Object.fromEntries(Object.entries(mounted.expect(actual)).map(([name, method]) => [name,
      typeof method !== 'function' ? method : async (...args) => {
        try { return await method(...args); } catch (error) { failedMatcher = name; throw error; }
      }]));
    expect.poll = mounted.expect.poll;
    await assert.rejects(() => checkAlchemyLead(mounted, locale, expect), error => {
      assert.equal(error.code, 'ERR_ASSERTION');
      if (matcher) assert.equal(failedMatcher, matcher);
      else assert.ok(error.message.includes(diagnostic), error.message);
      return true;
    });
    assert.equal(mounted.fetchCount(), requests);
    assert.equal(mounted.externalClicks(), 0);
    assert.equal(mounted.intercepted(), false);
    mounted.unmount(); assert.deepEqual(mounted.writesAfterUnmount, []);
  });
}
