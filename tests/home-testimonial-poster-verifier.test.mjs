import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const component = read('components/personal-testimonials.tsx');
const verifier = read('scripts/verify-home-locale-switch.mjs');
const expectedCatalog = {
  en: ['Dk0LBmOivQo', 'aUJde6A-9p0', 'fE6sD1zr1Js', 'itjo2_z2NGk', '4NrryHcEF1A', 'hYwRNMxIMjc'],
  ru: ['m9RfDgK76PU', 'MIVLm1GUTtM', 'ttQxUHopaUM', 'VABgpmn4ZYA', 'muOnIHllI7E', '5oj0BIbLT4w'],
};

function sourceFixture(source = component) {
  const records = source.match(/const testimonialVideos = (\{[\s\S]*?\}) as const;/)?.[1];
  const expression = source.match(/const videos = (.*);/)?.[1];
  assert.ok(records && expression, 'Use the actual source catalogue and selection expression');
  const catalog = new Function('return ' + records)();
  const select = new Function('isHome', 'testimonialVideos', 'locale', 'return ' + expression);
  const selected = {};
  for (const locale of ['en', 'ru']) {
    assert.deepEqual(catalog[locale].map(item => item.id), expectedCatalog[locale], 'Preserve all six original sources per locale');
    assert.equal(new Set(catalog[locale].map(item => item.id)).size, 6);
    selected[locale] = { home: select(true, catalog, locale), services: select(false, catalog, locale) };
    assert.deepEqual(selected[locale].home.map(item => item.id), expectedCatalog[locale].slice(0, 4));
    assert.deepEqual(selected[locale].services.map(item => item.id), expectedCatalog[locale].slice(0, 4));
  }
  assert.match(source, /<blockquote[^>]*>“\{current\.storyQuote\}”<\/blockquote>/);
  assert.match(source, /<figcaption[^>]*>\{current\.storySource\}<\/figcaption>/);
  return selected;
}

const fixture = sourceFixture();
const helperStart = verifier.indexOf('async function verifyHomeTestimonialPosters(');
const helperEnd = verifier.indexOf('async function exercise(', helperStart);
assert.ok(helperStart > 0 && helperEnd > helperStart);
const helper = verifier.slice(helperStart, helperEnd);

async function posterScenario({
  ids = fixture.en.home.map(item => item.id), sections = 1, locale = 'en', posterUrl = 'relative',
  posterCount = ids.length, wrongPoster = false, wrongWatch = false,
  missingPoster = false, missingWatch = false, brokenImage = false, hiddenPoster = false,
  quoteCount = 1, hiddenQuote = false, playing = false,
} = {}) {
  const reviews = ids.map(id => {
    let scrolled = false;
    const expectedSrc = `/images/holistic-house/testimonial-posters/${id}.webp`;
    const renderedSrc = ({ relative: expectedSrc, absolute: 'http://127.0.0.1:3129' + expectedSrc, foreign: 'https://other.example' + expectedSrc, query: expectedSrc + '?changed=1', hash: expectedSrc + '#changed', wrongId: expectedSrc.replace(id, 'wrongsource'), empty: '' })[posterUrl];
    const poster = {
      count: Number(!missingPoster), visible: !hiddenPoster, src: wrongPoster ? '/images/other-person.webp' : renderedSrc,
      async getAttribute(name) { assert.equal(name, 'src'); return this.src; },
      async scrollIntoViewIfNeeded() { scrolled = true; },
      async evaluate(callback) { assert.equal(scrolled, true); return callback({ complete: !brokenImage, naturalWidth: brokenImage ? 0 : 480 }); },
    };
    const watch = { count: Number(!missingWatch), href: wrongWatch ? 'https://www.youtube.com/watch?v=wrongsource' : `https://www.youtube.com/watch?v=${id}` };
    return { id, count: 1, locator(selector) {
      if (selector === '.site-video-fallback-poster') return poster;
      if (selector === '.site-video-watch-link') return watch;
      if (selector === '.site-video-play') return { count: 1 };
      assert.equal(selector, 'iframe');
      return { count: Number(playing) };
    } };
  });
  const testimonials = { count: sections, lang: locale, locator(selector) {
    if (selector === '[data-testimonial-video-id]') return { count: ids.length, async evaluateAll(callback) { return callback(ids.map(id => ({ dataset: { testimonialVideoId: id } }))); } };
    if (selector === '.site-video-fallback-poster') return { count: posterCount };
    if (selector === 'blockquote') return { count: quoteCount, visible: !hiddenQuote };
    const id = selector.match(/^\[data-testimonial-video-id="([\w-]{11})"\]$/)?.[1];
    assert.ok(id);
    return reviews.find(review => review.id === id) || { count: 0 };
  } };
  const page = { url() { return 'http://127.0.0.1:3129/'; }, locator(selector) { assert.equal(selector, '[data-personal-testimonials="home"]'); return testimonials; } };
  const expect = actual => ({
    async toHaveCount(expected) { assert.equal(actual.count, expected); },
    async toHaveAttribute(name, expected) { assert.equal(actual[name], expected); },
    async toBeVisible() { assert.equal(actual.visible, true); },
  });
  expect.poll = callback => ({ async toBe(expected) { assert.equal(await callback(), expected); } });
  const verify = new Function('assert', 'expect', `${helper}; return verifyHomeTestimonialPosters;`)(assert, expect);
  const first = await verify(page);
  assert.equal(first, reviews[0], 'Keep the exact first source for the unchanged click-to-play assertions');
}

test('actual browser helper accepts exactly the four source-selected EN Home cards and matching archived frames', () => posterScenario());
test('actual browser helper accepts Next Image same-origin absolute URL serialization', () => posterScenario({ posterUrl: 'absolute' }));
for (const [name, options] of Object.entries({
  'foreign poster origin': { posterUrl: 'foreign' }, 'poster query': { posterUrl: 'query' },
  'poster hash': { posterUrl: 'hash' }, 'wrong poster ID': { posterUrl: 'wrongId' }, 'empty poster URL': { posterUrl: 'empty' },
  'zero cards': { ids: [] }, 'one card': { ids: fixture.en.home.slice(0, 1).map(item => item.id) },
  'three source cards on Home': { ids: fixture.en.home.slice(0, 3).map(item => item.id) },
  'six catalogue cards on Home': { ids: expectedCatalog.en },
  'duplicate source': { ids: ['Dk0LBmOivQo', 'Dk0LBmOivQo'] },
  'wrong second source': { ids: ['Dk0LBmOivQo', 'fE6sD1zr1Js'] },
  'wrong source order': { ids: ['aUJde6A-9p0', 'Dk0LBmOivQo'] },
  'Russian sources on the final English home': { ids: fixture.ru.home.map(item => item.id) },
  'missing section': { sections: 0 }, 'duplicate section': { sections: 2 },
  'wrong locale': { locale: 'ru' }, 'extra poster': { posterCount: 5 },
  'missing poster': { missingPoster: true }, 'hidden poster': { hiddenPoster: true }, 'unrelated poster source': { wrongPoster: true },
  'broken real image': { brokenImage: true }, 'missing watch source': { missingWatch: true },
  'wrong watch source': { wrongWatch: true }, 'missing story': { quoteCount: 0 },
  'hidden story': { hiddenQuote: true }, 'already playing video': { playing: true },
})) test(`poster contract rejects ${name}`, () => assert.rejects(posterScenario(options)));

test('source fixture retains six catalogue IDs per locale, four Services videos and the permissioned written story', () => {
  sourceFixture();
  for (const [before, after] of [
    ['id: "hYwRNMxIMjc"', 'id: "WRONGSOURCE"'],
    ['testimonialVideos[locale].slice(0, 4)', 'testimonialVideos[locale].slice(0, 6)'],
    ['const videos = isHome ? testimonialVideos[locale].slice(0, 4) : testimonialVideos[locale].slice(0, 4);',
      'const videos = isHome ? testimonialVideos[locale].slice(0, 3) : testimonialVideos[locale].slice(0, 4);'],
    ['{current.storyQuote}', '{current.title}'],
    ['{current.storySource}', '{current.title}'],
  ]) {
    assert.ok(component.includes(before));
    assert.throws(() => sourceFixture(component.replace(before, after)), before);
  }
});

function assertHomeFreeEntrySources(capture, source, inline) {
  for (const suffix of ['/client/tests', '/academy/principles-of-energywork/learn']) {
    assert.ok(capture.includes('`/${locale}' + suffix + '`'));
    assert.ok(source.includes("'" + suffix + "'"));
  }
  // Analysis opens the consent-gated inline action. Its separate review card
  // still owns the localized route journey, rather than the capture trigger.
  assert.match(capture, /\{selected === "analysis" \? \(\s*<ContactChannelChooser/);
  assert.match(capture, /compactPhone compactTrigger stayAfterSave/);
  assert.match(capture, /attributes=\{\{ "data-home-free-action": "analysis" \}\}/);
  assert.ok(source.includes("import { verifyHomeInlineAnalysis } from './helpers/home-inline-analysis-verifier.mjs'"));
  for (const required of [
    '({ trigger: cta } = await verifyHomeInlineAnalysis(page, expect, locale))',
    '({ review: cta } = await verifyHomeInlineAnalysis(page, expect, locale))',
    "await verifyHomeInlineAnalysis(page, expect, 'en')",
    "await page.route('**/api/service-enquiries**'",
    'assert.deepEqual(forbiddenEnquiries, [], "Opening analysis must never register a contact")',
    'assert.deepEqual(forbiddenEnquiries, [], "Entry choices and navigation never submit an enquiry")',
  ]) assert.ok(source.includes(required), required);
  for (const required of [
    "await expect(phone).toHaveValue('')", 'await expect(consent).not.toBeChecked()',
    "await expect(chooser.getByRole('status')).toHaveCount(0)",
    "await expect(chooser.locator('a[data-contact-channel]')).toHaveCount(0)",
    'await expect(page).toHaveURL(before)',
    "await expect(review).toHaveAttribute('href', '/' + locale + '/services/free-situation-review')",
  ]) assert.ok(inline.includes(required), required);
}

test('remaining free-entry targets still match actual homepage links and destination markup', () => {
  assertHomeFreeEntrySources(read('components/homepage-free-capture.tsx'), verifier, read('scripts/helpers/home-inline-analysis-verifier.mjs'));
  assert.match(read('app/[locale]/services/free-situation-review/page.tsx'), /<FreeEntryLanding locale=\{locale\} kind="situation" \/>/);
  assert.match(read('components/free-entry-landing.tsx'), /<h1 id="free-entry-title">\{t\.title\}<\/h1>/);
  assert.match(read('app/[locale]/services/dao-health-profile/page.tsx'), /<FreeEntryLanding locale=\{locale\} kind="dao" \/>/);
  const dao = read('components/free-entry-landing.tsx');
  assert.match(dao, /const t = copy\[locale\]\[kind\]/);
  assert.match(dao, /data-free-entry-landing=\{kind\}/);
  assert.match(dao, /<h1 id="free-entry-title">\{t\.title\}<\/h1>/);
  const cabinet = read('components/app/cabinet-landing.jsx');
  assert.match(cabinet, /useState\('catalog'\)/);
  assert.match(cabinet, /phase === 'catalog' && <div id="cabinet-tests"><PublicTestExplorer locale=\{locale\} embedded/);
  assert.match(cabinet, /guestFetch\('guest\/bootstrap'\)/);
  assert.match(read('components/app/public-test-explorer.jsx'), /simpleMode=\{embedded\}/);
  assert.match(read('components/app/test-explorer.jsx'), /<SimpleTestPicker/);
  assert.match(read('components/app/simple-test-picker.jsx'), /data-prelogin-test-picker/);
});

function assertPosterReconciliationGates(source = verifier) {
  for (const required of [
    "await perform('gate', () => gate);", 'await expect(next).toHaveCount(0)', 'frame.evaluate(element => element.isConnected)',
    'size.height >= 46 && size.font >= 14', 'const firstReview = await verifyHomeTestimonialPosters(page)',
    "await firstReview.locator('button.site-video-play').click()", 'youtube-nocookie\\.com\\/embed\\/Dk0LBmOivQo\\?',
    "await expect(firstReview.locator('.site-video-fallback-poster')).toHaveCount(0)",
    'await page.goBack()', 'await expect(page).toHaveURL(origin + homePath(locale))',
    'assert.deepEqual(unexpectedApiRequests, []', "request.method() === 'GET'", 'APP_UNAVAILABLE',
    'results.filter(result => result.firstClickRetained).length, widths.length * 4',
    'results.filter(result => result.freeJourney).length, widths.length * 12',
    'await exerciseFreeJourneys(page, engine, width)', 'assert.deepEqual(errors, [])',
  ]) assert.ok(source.includes(required), required);
  const widthArray = source.match(/const widths = (\[[\d,\s]+\]);/)?.[1];
  assert.ok(widthArray, 'Read the actual coverage matrix');
  const widths = JSON.parse(widthArray);
  assert.deepEqual(widths, [320, 375, 390, 430, 1365]);
  assert.match(source, /await Promise\.all\(\[\['chromium', chromium\], \['webkit', webkit\]\]\.map\(async \(\[name, type\]\) => \{\s*for \(const width of widths\) \{\s*try \{ await exercise\(name, type, width\)/);
  assert.ok(source.includes("for (const [from, to] of [['en', 'ru'], ['ru', 'en']])"));
  const journeys = source.slice(source.indexOf('async function exerciseFreeJourneys('), source.indexOf('async function verifyHomeTestimonialPosters('));
  assert.ok(journeys.includes("for (const locale of ['en', 'ru'])"));
  assert.deepEqual([...journeys.matchAll(/\['(selfTest|analysis|reiki)', '/g)].map(match => match[1]), ['selfTest', 'analysis', 'reiki']);
  const countChecks = source.match(/  assert\.equal\(results\.filter\(result => result\.(?:firstClickRetained|freeJourney)\)\.length, widths\.length \* \d+\);/g);
  assert.equal(countChecks?.length, 2);
  const checkCounts = new Function('assert', 'results', 'widths', countChecks.join('\n'));
  // Synthetic source coverage, not measured browser results: two engines and
  // five widths each require two retained switches and six locale journeys.
  const results = widths.flatMap(() => ['chromium', 'webkit'].flatMap(() => [
    ...['en-to-ru', 'ru-to-en'].map(() => ({ firstClickRetained: true })),
    ...['en', 'ru'].flatMap(() => ['selfTest', 'analysis', 'reiki'].map(freeJourney => ({ freeJourney }))),
  ]));
  assert.equal(results.filter(result => result.firstClickRetained).length, 20);
  assert.equal(results.filter(result => result.freeJourney).length, 60);
  checkCounts(assert, results, widths);
  for (const key of ['firstClickRetained', 'freeJourney']) {
    const omitted = results.findIndex(result => result[key]);
    assert.throws(() => checkCounts(assert, results.filter((_, index) => index !== omitted), widths), { code: 'ERR_ASSERTION' });
  }
  assert.doesNotMatch(source, /videoPosters\)\.toHaveCount\(6\)|test\.skip|test\.only|test\.todo/);
}
test('poster reconciliation preserves held-RSC, readability, first playback, Back, no-write and full journey gates', () => assertPosterReconciliationGates());

async function assertAppRouteNoWriteFence(source = verifier) {
  const owner = source.indexOf('async function exerciseFreeJourneys(');
  const begin = source.indexOf('  const unexpectedApiRequests = [];', owner);
  const end = source.indexOf("  for (const locale of ['en', 'ru'])", begin);
  const ownerEnd = source.indexOf('async function verifyHomeTestimonialPosters(', end);
  assert.ok(owner >= 0 && begin > owner && end > begin && ownerEnd > end);
  let handler;
  const origin = 'https://example.invalid';
  const page = { async route(pattern, callback) {
    assert.equal(pattern, origin + '/api/app/**', 'Keep the fence scoped to same-origin app endpoints');
    assert.equal(handler, undefined, 'Register exactly one app fence');
    handler = callback;
  } };
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  const unexpected = await new AsyncFunction('page', 'origin', source.slice(begin, end) + '\nreturn unexpectedApiRequests;')(page, origin);
  assert.equal(typeof handler, 'function');
  const expectedWrites = [];
  for (const [method, path, status, body] of [
    ['GET', '/api/app/guest/bootstrap', 200, { expiresAt: null, moodCheckins: [], results: [] }],
    ['GET', '/api/app/status', 401, { error: 'APP_UNAVAILABLE' }],
    ['POST', '/api/app/guest/bootstrap', 401, { error: 'APP_UNAVAILABLE' }],
    ['PUT', '/api/app/status', 401, { error: 'APP_UNAVAILABLE' }],
    ['DELETE', '/api/app/status', 401, { error: 'APP_UNAVAILABLE' }],
  ]) {
    const responses = [];
    await handler({
      request: () => ({ method: () => method, url: () => origin + path }),
      fulfill: async response => { responses.push(response); },
    });
    assert.equal(responses.length, 1);
    assert.equal(responses[0].status, status);
    assert.equal(responses[0].contentType, 'application/json');
    assert.deepEqual(JSON.parse(responses[0].body), body);
    if (method !== 'GET') expectedWrites.push({ method, path });
    assert.deepEqual(unexpected, expectedWrites, 'Every non-GET must be recorded, not hidden by the read-only status branch');
  }
  const gate = source.slice(end, ownerEnd).match(/  assert\.deepEqual\(unexpectedApiRequests, \[\], 'Entry navigation must not submit or request private app data'\);/);
  assert.ok(gate, 'Keep the actual terminal no-write assertion');
  const check = new Function('assert', 'unexpectedApiRequests', gate[0]);
  check(assert, []);
  assert.throws(() => check(assert, unexpected), { code: 'ERR_ASSERTION' });
}
test('actual app-route fence preserves exact read-only responses and records every synthetic write', () => assertAppRouteNoWriteFence());

async function assertHeldResponseOrdering(source) {
  const begin = source.indexOf("  await page.route('**/*', async route => {");
  const end = source.indexOf('\n  try {', begin);
  assert.ok(begin >= 0 && end > begin);
  let callback, release;
  const gate = new Promise(resolve => { release = resolve; });
  const events = [];
  const response = {};
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  await new AsyncFunction('page','transport','shouldHoldHomeRsc','delayedLocale','delayedRscGate','heldRequests','pause', source.slice(begin,end))(
    { route:async (_,handler) => {callback=handler;} },
    {handle:async (_,action) => action(async (operation, action) => {events.push(operation);return await action();})},
    () => true, 'en', gate, 0, async () => {});
  const pending = callback({request:()=>({}), fetch:async()=>response, fulfill:async value=>{assert.equal(value.response,response);events.push('fulfilled');}});
  try {
    await new Promise(resolve=>setImmediate(resolve));
    assert.deepEqual(events,['fetch','delay','gate'],'The real response must remain unfulfilled at the observation gate');
    release();await pending;
    assert.deepEqual(events,['fetch','delay','gate','fulfill','fulfilled']);
  } finally {release();await pending;}
}
test('supervised response is strictly held until the observation gate resolves',()=>assertHeldResponseOrdering(verifier));
for (const [name, replacement] of [
  ['unawaited gate', "perform('gate', () => gate);"],
  ['bypassed gate', "await perform('gate', () => Promise.resolve());"],
  ['removed gate', ''],
]) test('held-response contract rejects '+name,()=>assert.rejects(assertHeldResponseOrdering(verifier.replace("await perform('gate', () => gate);",replacement))));
