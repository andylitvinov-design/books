import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHomeRouteSupervisor } from '../scripts/home-route-supervisor.mjs';
import { assertHomeVerifierMatrix } from './helpers/home-verifier-matrix.mjs';

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

test('remaining free-entry targets still match actual homepage links and destination markup', () => {
  const capture = read('components/homepage-free-capture.tsx');
  for (const suffix of ['/client/tests', '/services/free-situation-review', '/academy/principles-of-energywork/learn']) {
    assert.ok(capture.includes('`/${locale}' + suffix + '`'));
    assert.ok(verifier.includes("'" + suffix + "'"));
  }
  assert.match(read('app/[locale]/services/free-situation-review/page.tsx'), /<FreeEntryLanding locale=\{locale\} kind="situation" \/>/);
  assert.match(read('components/free-entry-landing.tsx'), /<h1 id="free-entry-title">\{t\.title\}<\/h1>/);
  assert.match(read('app/[locale]/services/dao-health-profile/page.tsx'), /const kind = "dao" as const/);
  const dao = read('components/core-service-detail.tsx');
  assert.match(dao, /data-core-service-detail=\{kind\}/);
  assert.match(dao, /<h1>\{t\.title\}<\/h1>/);
  const cabinet = read('components/app/cabinet-landing.jsx');
  assert.match(cabinet, /useState\('catalog'\)/);
  assert.match(cabinet, /phase === 'catalog' && <div id="cabinet-tests"><PublicTestExplorer locale=\{locale\} embedded/);
  assert.match(cabinet, /guestFetch\('guest\/bootstrap'\)/);
  assert.match(read('components/app/public-test-explorer.jsx'), /simpleMode=\{embedded\}/);
  assert.match(read('components/app/test-explorer.jsx'), /<SimpleTestPicker/);
  assert.match(read('components/app/simple-test-picker.jsx'), /data-prelogin-test-picker/);
});

test('poster reconciliation preserves held-RSC, readability, first playback, Back, no-write and full journey gates', async () => {
  await assertHomeVerifierMatrix(verifier);
  for (const required of [
    "await perform('gate', () => gate);", 'await expect(next).toHaveCount(0)', 'frame.evaluate(element => element.isConnected)',
    'size.height >= 46 && size.font >= 14', 'const firstReview = await verifyHomeTestimonialPosters(page)',
    "await firstReview.locator('button.site-video-play').click()", 'youtube-nocookie\\.com\\/embed\\/Dk0LBmOivQo\\?',
    "await expect(firstReview.locator('.site-video-fallback-poster')).toHaveCount(0)",
    'await page.goBack()', 'await expect(page).toHaveURL(origin + homePath(locale))',
    'assert.deepEqual(unexpectedApiRequests, []', "request.method() === 'GET'", 'APP_UNAVAILABLE',
    'await exerciseFreeJourneys(page, engine, width)', 'assert.deepEqual(errors, [])',
  ]) assert.ok(verifier.includes(required), required);
  assert.doesNotMatch(verifier, /videoPosters\)\.toHaveCount\(6\)|test\.skip|test\.only|test\.todo/);
});

const homeOrigin = 'http://127.0.0.1:3129';
const catchAllPattern = '**/*';
const enquiryPattern = '**/api/service-enquiries**';
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

function routingSource(source) {
  const marker = source.indexOf('  // Hold the real RSC response.');
  const begin = source.indexOf('  await page.route(', marker);
  const end = source.indexOf('\n  try {', begin);
  assert.ok(marker >= 0 && begin > marker && end > begin, 'ROUTING_SOURCE_BOUNDARY');
  return source.slice(begin, end);
}
function createRouteRegistry({preferFirst = false} = {}) {
  const registrations = [];
  return {
    registrations,
    async route(pattern, handler) {
      // Only the two actual verifier patterns are supported. Do not silently
      // approximate an unfamiliar Playwright wildcard as a catch-all.
      assert.ok([catchAllPattern, enquiryPattern].includes(pattern), 'UNSUPPORTED_ROUTE_PATTERN');
      assert.equal(typeof handler, 'function');
      registrations.push({pattern, handler});
    },
    resolve(request) {
      assert.equal(typeof request.method, 'function', 'REQUEST_METHOD_REQUIRED');
      assert.equal(typeof request.url, 'function', 'REQUEST_URL_REQUIRED');
      assert.equal(typeof request.headers, 'function', 'REQUEST_HEADERS_REQUIRED');
      const url = request.url();
      assert.equal(typeof request.method(), 'string', 'REQUEST_METHOD_REQUIRED');
      const matches = registrations.filter(({pattern}) => pattern === catchAllPattern
        || /^.*\/api\/service-enquiries.*$/.test(url));
      assert.ok(matches.length, 'NO_MATCHING_ROUTE');
      return preferFirst ? matches[0] : matches.at(-1);
    },
  };
}
async function routeFixture(source, options) {
  const registry = createRouteRegistry(options), events = [], unexpectedEnquiryRequests = [], results = [];
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const actualTransport = createHomeRouteSupervisor({origin:homeOrigin, engine:'fixture', width:390});
  const transport = {handle: (route, action) => actualTransport.handle(route, perform =>
    action((operation, action) => { events.push(operation); return perform(operation, action); }))};
  const start = source.indexOf('function homePath('), end = source.indexOf('async function chooseHomeLocale(', start);
  assert.ok(start >= 0 && end > start);
  const shouldHoldHomeRsc = new Function('assert', 'origin', source.slice(start, end) + '; return shouldHoldHomeRsc;')(assert, homeOrigin);
  const heldCount = await new AsyncFunction('page','transport','shouldHoldHomeRsc','delayedLocale','delayedRscGate','heldRequests','pause','unexpectedEnquiryRequests','results','engine','width',
    routingSource(source) + '; return () => heldRequests;')(
    registry, transport, shouldHoldHomeRsc, 'en', gate, 0, async ms => assert.equal(ms,2000), unexpectedEnquiryRequests, results, 'fixture', 390);
  assert.deepEqual(registry.registrations.map(({pattern}) => pattern), [catchAllPattern,enquiryPattern], 'ROUTE_REGISTRATION_SHAPE');
  return {registry, events, unexpectedEnquiryRequests, results, release, heldCount, transport:actualTransport};
}
async function assertHeldResponseOrdering(source) {
  const f = await routeFixture(source);
  const response = {};
  const request = {method:()=> 'GET', url:()=>homeOrigin+'/?_rsc=fixture', headers:()=>({rsc:'1'})};
  const selected = f.registry.resolve(request);
  assert.equal(selected.pattern, catchAllPattern, 'RSC_ROUTE_SELECTION');
  const pending = selected.handler({request:()=>request, fetch:async()=>response,
    fulfill:async value=>{assert.equal(value.response,response);f.events.push('fulfilled');},
    continue:async()=>{throw new Error('RSC_MUST_NOT_CONTINUE');}, abort:async()=>{f.events.push('aborted');}});
  try {
    await new Promise(resolve=>setImmediate(resolve));
    assert.deepEqual(f.events,['fetch','delay','gate'],'HELD_RESPONSE_BEFORE_GATE');
    assert.equal(f.heldCount(),1);
    assert.deepEqual(f.unexpectedEnquiryRequests,[]);
    assert.deepEqual(f.results,[]);
    f.release();await pending;await f.transport.drain();f.transport.assertHealthy();
    assert.deepEqual(f.events,['fetch','delay','gate','fulfill','fulfilled']);
  } finally {f.release();await pending;await f.transport.drain();}
}
async function assertEnquiryGuard(source, method, {preferFirst = false, missingMethod = false} = {}) {
  const f = await routeFixture(source,{preferFirst});
  let payloadReads = 0;
  const request = {method:()=>method, url:()=>homeOrigin+'/api/service-enquiries?DO_NOT_RECORD', headers:()=>({}),
    postData:()=>{payloadReads++;throw new Error('PAYLOAD_READ_FORBIDDEN');},
    postDataJSON:()=>{payloadReads++;throw new Error('PAYLOAD_READ_FORBIDDEN');}};
  if (missingMethod) delete request.method;
  const selected = f.registry.resolve(request);
  assert.equal(selected.pattern,enquiryPattern,'ENQUIRY_ROUTE_PRIORITY');
  const calls = [], responses = [];
  await selected.handler({request:()=>request,
    fulfill:async response=>{calls.push('fulfill');responses.push(response);},
    continue:async()=>{calls.push('continue');},fetch:async()=>{calls.push('fetch');},
    abort:async reason=>{assert.equal(reason,'failed');calls.push('abort');}});
  await f.transport.drain();
  assert.deepEqual(calls,['fulfill','abort'],'ENQUIRY_MUST_BE_BLOCKED_AND_FATAL');
  assert.equal(responses[0]?.status,401,'ENQUIRY_RESPONSE_MUST_DENY');
  assert.deepEqual(JSON.parse(responses[0].body),{error:'SUBMISSION_FORBIDDEN'},'ENQUIRY_DENIAL_BODY_ONLY');
  assert.throws(()=>f.transport.assertHealthy(),/transport failed/,'ENQUIRY_ATTEMPT_MUST_REMAIN_FATAL');
  assert.equal(f.heldCount(),0);
  assert.equal(payloadReads,0);
  assert.deepEqual(f.unexpectedEnquiryRequests,[{method}]);
  assert.deepEqual(f.results,[{engine:'fixture',width:390,enquiryRequestBlocked:true,method}]);
  assert.doesNotMatch(JSON.stringify([f.results,f.unexpectedEnquiryRequests,f.transport.events,f.transport.failures]),/DO_NOT_RECORD|referenceCode|saved|phone|contact|https?:/);
}
function mutateOnce(source, before, after) {
  assert.equal(source.split(before).length-1,1,'MUTATION_TARGET_EXACTLY_ONCE');
  return source.replace(before,after);
}
function withoutEnquiryGuard(source) {
  const begin=source.indexOf("  await page.route('**/api/service-enquiries**', async route => {");
  const end=source.indexOf('\n  try {',begin);
  assert.ok(begin>=0&&end>begin,'ENQUIRY_GUARD_SOURCE_REQUIRED');
  return source.slice(0,begin)+source.slice(end);
}

test('supervised response is strictly held until the observation gate resolves',()=>assertHeldResponseOrdering(verifier));
for (const [name, replacement] of [
  ['unawaited gate', "perform('gate', () => gate);"],
  ['bypassed gate', "await perform('gate', () => Promise.resolve());"],
  ['removed gate', ''],
]) test('held-response contract rejects '+name,()=>assert.rejects(assertHeldResponseOrdering(verifier.replace("await perform('gate', () => gate);",replacement)),/HELD_RESPONSE_BEFORE_GATE/));
for(const method of ['GET','POST']) test('actual enquiry '+method+' is denied without payload/receipt/network and remains fatal',()=>assertEnquiryGuard(verifier,method));
test('last matching enquiry route wins its collision with catch-all',()=>assert.rejects(assertEnquiryGuard(verifier,'POST',{preferFirst:true}),/ENQUIRY_ROUTE_PRIORITY/));
test('missing request method fails fixture admission explicitly, not as a guard TypeError',()=>assert.rejects(assertEnquiryGuard(verifier,'POST',{missingMethod:true}),/REQUEST_METHOD_REQUIRED/));
test('removing the real enquiry guard is not silently accepted by the consumer',()=>assert.rejects((async()=>assertEnquiryGuard(withoutEnquiryGuard(verifier),'POST'))(),/ROUTE_REGISTRATION_SHAPE/));
test('moving the enquiry guard before catch-all is rejected as an actual source priority regression',()=>assert.rejects((async()=>{
  const registrations=routingSource(verifier);
  const guardStart=registrations.indexOf("  await page.route('**/api/service-enquiries**'");
  assert.ok(guardStart>0,'ENQUIRY_GUARD_SOURCE_REQUIRED');
  const reordered=registrations.slice(guardStart)+'\n'+registrations.slice(0,guardStart);
  return assertEnquiryGuard(mutateOnce(verifier,registrations,reordered),'POST');
})(),/ROUTE_REGISTRATION_SHAPE/));
test('misrouting the enquiry guard as another catch-all is rejected',()=>assert.rejects((async()=>assertEnquiryGuard(mutateOnce(verifier,"page.route('**/api/service-enquiries**'","page.route('**/*'"),'POST'))(),/ROUTE_REGISTRATION_SHAPE/));
test('unfamiliar route patterns fail closed rather than becoming wildcard matches',async()=>{
  const registry=createRouteRegistry();
  await assert.rejects(registry.route('**/api/other**',()=>{}),/UNSUPPORTED_ROUTE_PATTERN/);
  assert.deepEqual(registry.registrations,[]);
});
test('a matching enquiry guard without its fatal violation cannot pass',()=>assert.rejects((async()=>assertEnquiryGuard(mutateOnce(verifier,"throw new Error('Home capture inspection attempted an enquiry');",'/* mutation: fatal violation removed */'),'POST'))(),/ENQUIRY_MUST_BE_BLOCKED_AND_FATAL/));
test('a matching enquiry guard cannot substitute a successful response',()=>assert.rejects((async()=>assertEnquiryGuard(mutateOnce(verifier,"status: 401, contentType: 'application/json', body: '{\"error\":\"SUBMISSION_FORBIDDEN\"}'","status: 200, contentType: 'application/json', body: '{\"error\":\"SUBMISSION_FORBIDDEN\"}'"),'POST'))(),/ENQUIRY_RESPONSE_MUST_DENY/));
