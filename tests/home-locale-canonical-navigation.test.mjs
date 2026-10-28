import assert from 'node:assert/strict';
import test from 'node:test';
import { createHomeRouteSupervisor } from '../scripts/home-route-supervisor.mjs';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const source = read('scripts/verify-home-locale-switch.mjs');
const origin = 'https://example.test';
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
function extract(start, end) {
  const first = source.indexOf(start);
  const last = source.indexOf(end, first);
  assert.ok(first >= 0 && last > first, `Missing verifier fragment: ${start}`);
  return source.slice(first, last);
}
const helpers = extract('function homePath(', 'async function installEntryDiagnostics(');
const { homePath, shouldHoldHomeRsc } = new Function('assert', 'origin', `${helpers}; return { homePath, shouldHoldHomeRsc };`)(assert, origin);
const request = (path, headers = { rsc: '1' }, base = origin) => ({ url: () => base + path, headers: () => headers });

test('verifier home paths agree with the canonical public routes and root middleware', () => {
  assert.equal(homePath('en'), '/');
  assert.equal(homePath('ru'), '/ru');
  for (const locale of [null, undefined, '', 'es', 'EN']) assert.throws(() => homePath(locale));
  assert.match(read('lib/public-locales.ts'), /locale === 'en' \? '\/' : `\/\$\{locale\}`/);
  assert.match(read('middleware.ts'), /const pageLocale = pathname === '\/' \? 'en'/);
  assert.doesNotMatch(source, /\?lang=|site-language-switch button\[lang=/);
});

for (const locale of ['en', 'ru']) test(`RSC matcher holds only the active canonical ${locale} homepage`, () => {
  assert.equal(shouldHoldHomeRsc(request(homePath(locale) + '?_rsc=flight'), locale), true);
  assert.equal(shouldHoldHomeRsc(request(homePath(locale)), locale), true);
  for (const inactive of [null, undefined, '', 'es']) {
    assert.equal(shouldHoldHomeRsc(request(homePath(locale)), inactive), false, `inactive ${inactive}`);
  }
  for (const wrong of [
    request(locale === 'en' ? '/ru?_rsc=x' : '/?_rsc=x'),
    request('/en?_rsc=x'), request('/ru/?_rsc=x'), request('/es?_rsc=x'),
    request('/en/client?_rsc=x'), request('/api/app/guest/bootstrap'),
    request(homePath(locale) + '?lang=' + locale), request(homePath(locale) + '?lang='),
    request(homePath(locale), {}), request(homePath(locale), { rsc: '0' }),
    request(homePath(locale), { rsc: '1' }, 'https://other.test'),
  ]) assert.equal(shouldHoldHomeRsc(wrong, locale), false, wrong.url());
});

async function chooseScenario(locale, { menus = 1, links = 1, href = homePath(locale), blocked = false } = {}) {
  let opened = false, clicked = false;
  const link = { count: links, async click() { assert.ok(opened); if (blocked) throw new Error('blocked click'); clicked = true; } };
  const menu = { count: menus, async evaluate(fn) { return fn({open:opened}); }, locator(selector) {
    if (selector === '.site-language-menu-trigger') return { async click() { opened = true; } };
    assert.equal(selector, `a[lang="${locale}"]`);
    return link;
  } };
  const page = { locator(selector) { assert.equal(selector, '.site-language-menu'); return menu; } };
  const expect = actual => ({
    async toHaveCount(expected) { assert.equal(actual.count, expected); },
    async toHaveAttribute(name, expected) { if(actual===menu){ assert.equal(name,'open'); assert.equal(opened,true); return; } assert.equal(actual, link); assert.equal(name, 'href'); assert.equal(href, expected); },
  });
  const choose = new Function('assert', 'origin', 'expect', `${helpers}; return chooseHomeLocale;`)(assert, origin, expect);
  await choose(page, locale);
  assert.equal(clicked, true);
}
for (const locale of ['en', 'ru']) {
  test(`locale switch clicks the unique canonical ${locale} anchor`, () => chooseScenario(locale));
  for (const [name, input] of Object.entries({
    'missing menu': { menus: 0 }, 'duplicate menu': { menus: 2 },
    'missing anchor': { links: 0 }, 'duplicate anchor': { links: 2 },
    'legacy query href': { href: '/?lang=' + locale }, 'wrong locale href': { href: '/es' },
    'blocked click': { blocked: true },
  })) test(`${locale} anchor selection rejects ${name}`, () => assert.rejects(chooseScenario(locale, input)));
}

const routeSource = extract("  await page.route('**/*', async route => {", '\n  try {');
test('the actual RSC handler fetches the real response and cannot fulfill before the observation gate', async () => {
  let handler, release;
  const gate = new Promise(resolve => { release = resolve; });
  const events = [];
  const realResponse = { upstream: true };
  const page = { async route(pattern, callback) { assert.equal(pattern, '**/*'); handler = callback; } };
  const readCount = await new AsyncFunction('page', 'shouldHoldHomeRsc', 'pause', 'delayedLocale', 'delayedRscGate', 'heldRequests', 'transport', `${routeSource}; return () => heldRequests;`)(page, shouldHoldHomeRsc, async ms => { assert.equal(ms, 2000); events.push('delay'); }, 'ru', gate, 0, createHomeRouteSupervisor({origin,engine:'test',width:390}));
  const pending = handler({ request: () => request('/ru?_rsc=x'), async fetch() { events.push('fetch'); return realResponse; }, async fulfill({ response }) { assert.equal(response, realResponse); events.push('fulfill'); }, async continue() { throw new Error('must hold RSC'); } });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(readCount(), 1);
  assert.deepEqual(events, ['fetch', 'delay']);
  release();
  await pending;
  assert.deepEqual(events, ['fetch', 'delay', 'fulfill']);
});
for (const locale of [null, 'en', 'ru']) test(`unrelated RSC requests continue without fetching while active locale is ${locale}`, async () => {
  let handler;
  const page = { async route(_, callback) { handler = callback; } };
  const readCount = await new AsyncFunction('page', 'shouldHoldHomeRsc', 'pause', 'delayedLocale', 'delayedRscGate', 'heldRequests', 'transport', `${routeSource}; return () => heldRequests;`)(page, shouldHoldHomeRsc, () => { throw new Error('unexpected delay'); }, locale, Promise.resolve(), 0, createHomeRouteSupervisor({origin,engine:'test',width:390}));
  for (const path of locale === null ? ['/', '/ru'] : ['/api/app/bootstrap', '/en/client', '/?lang=ru']) {
    let continued = false;
    await handler({ request: () => request(path), async fetch() { throw new Error('unexpected fetch'); }, async continue() { continued = true; } });
    assert.equal(continued, true);
  }
  assert.equal(readCount(), 0);
});

const switchSource = extract('      const countBefore = heldRequests;', '      await verifyFreeOffers(');
async function switchScenario(from, to, { noRsc = false, optimistic = false, discarded = false, wrongVideo = false, wrongDestination = false } = {}) {
  const state = { committed: false, played: false, url: origin + homePath(from) };
  const iframe = { kind: 'iframe', async elementHandle() { return { async evaluate() { return !discarded; } }; } };
  const next = { kind: 'next', locator(selector) {
    if (selector === 'iframe') return iframe;
    assert.equal(selector, 'button.site-video-play');
    return { async click() { assert.equal(state.committed, true); state.played = true; } };
  } };
  const main = { kind: 'main' };
  const page = { locator(selector) {
    if (selector === 'main.house-home') return main;
    assert.equal(selector, `[data-personal-testimonials="home"] [data-testimonial-video-id="${to === "en" ? "Dk0LBmOivQo" : "MIVLm1GUTtM"}"]`);
    return next;
  } };
  const expect = target => ({
    async toHaveAttribute(name, expected) {
      if (target === main) { assert.equal(name, 'lang'); assert.equal(optimistic ? to : from, expected); assert.equal(state.committed, false); }
      else { assert.equal(target, iframe); assert.equal(name, 'src'); assert.equal(state.played, true); assert.ok(expected instanceof RegExp);
        assert.equal(expected.test(wrongVideo ? 'wrong-video' : `https://www.youtube-nocookie.com/embed/${to === 'en' ? 'Dk0LBmOivQo' : 'MIVLm1GUTtM'}?autoplay=1`), true); }
    },
    async toHaveCount(expected) { await Promise.resolve(); assert.equal(target === next ? Number(state.committed || optimistic) : Number(state.played), expected); },
    async toHaveURL(expected) { assert.equal(target, page); assert.equal(state.url, expected); },
  });
  expect.poll = callback => ({ async toBeGreaterThan(expected) { assert.ok(await callback() > expected); } });
  const run = new AsyncFunction('assert', 'expect', 'page', 'homePath', 'origin', 'from', 'to', 'state', 'noRsc', 'wrongDestination', 'transport', `
    let heldRequests = 0, delayedLocale = null, delayedRscGate, releaseHeldRsc, phase;
    const results = [], engine = 'test', width = 390;
    const pause = async ms => assert.equal(ms, 2200);
    async function chooseHomeLocale(_, locale) {
      assert.equal(delayedLocale, locale);
      if (!noRsc) heldRequests++;
      delayedRscGate.then(() => { state.committed = true; state.url = origin + (wrongDestination ? '/?lang=' + locale : homePath(locale)); });
    }
    ${switchSource}
    assert.equal(delayedLocale, null);
    assert.equal(results.length, 1);
    assert.equal(results[0].heldRsc, true);
    assert.equal(results[0].firstClickRetained, true);
  `);
  await run(assert, expect, page, homePath, origin, from, to, state, noRsc, wrongDestination, createHomeRouteSupervisor({origin,engine:'test',width:390}));
}
for (const [from, to] of [['en', 'ru'], ['ru', 'en']]) {
  test(`${from} to ${to} proves held old locale, first-click identity and retained iframe`, () => switchScenario(from, to));
  for (const name of ['noRsc', 'optimistic', 'discarded', 'wrongVideo', 'wrongDestination']) {
    test(`${from} to ${to} rejects ${name}`, () => assert.rejects(switchScenario(from, to, { [name]: true })));
  }
}

const journeys = extract('async function exerciseFreeJourneys(', 'async function verifyHomeTestimonialPosters(');
async function journeyScenario({ wrongBack = false, wrongDestination = false, privateRequest = false } = {}) {
  let url, home, selected, routeHandler;
  const results = [], openedHomes = [];
  const suffixes = { selfTest: '/client/tests', analysis: '/services/free-situation-review', reiki: '/academy/principles-of-energywork/learn' };
  const chooser = { locator(selector) {
    const option = selector.match(/^button\[data-home-free-option="([a-zA-Z]+)"\]$/);
    if (option) return { async click() { selected = option[1]; } };
    assert.equal(selector, `a[data-home-free-action="${selected}"]`);
    return { async evaluate() { return { url }; }, async click() {
      const locale = home.endsWith('/ru') ? 'ru' : 'en';
      url = origin + '/' + locale + (wrongDestination ? '/wrong' : suffixes[selected]);
      if (privateRequest || selected === 'selfTest') await routeHandler({
        request: () => ({ method: () => privateRequest ? 'POST' : 'GET', url: () => origin + (privateRequest ? '/api/app/test-plans' : '/api/app/guest/bootstrap') }),
        async fulfill(response) { assert.equal(response.status, privateRequest ? 401 : 200); },
      });
    } };
  } };
  const page = {
    async route(pattern, handler) { assert.equal(pattern, origin + '/api/app/**'); routeHandler = handler; },
    async goto(target, options) { assert.equal(options.waitUntil, 'domcontentloaded'); home = url = target; openedHomes.push(target); },
    async waitForLoadState(state) { assert.equal(state, 'networkidle'); },
    async waitForResponse(predicate) { const response = { request: () => ({ method: () => 'GET' }), url: () => origin + '/api/app/guest/bootstrap', status: () => 200, json: async () => ({ expiresAt: null, moodCheckins: [], results: [] }) }; assert.ok(predicate(response)); return response; },
    locator(selector) { return selector === '[data-home-free-capture]' ? chooser : { selector }; },
    async goBack() { url = wrongBack ? origin + '/?lang=' + (home.endsWith('/ru') ? 'ru' : 'en') : home; },
  };
  const expect = target => ({
    async toHaveURL(expected) { assert.equal(target, page); assert.equal(url, expected); },
    async toBeVisible() { assert.ok(target.selector); },
    async toHaveCount(count) { assert.equal(target.selector, '#cabinet-tests'); assert.equal(count, 1); },
  });
  const verifyHomeInlineAnalysis = async (_page, _expect, locale) => {
    assert.equal(_page, page); assert.equal(_expect, expect);
    assert.equal(locale, home.endsWith('/ru') ? 'ru' : 'en');
    selected = 'analysis';
    return { review: chooser.locator('a[data-home-free-action="analysis"]') };
  };
  await new Function('assert', 'expect', 'origin', 'homePath', 'results', 'verifyHomeInlineAnalysis', `${journeys}; return exerciseFreeJourneys;`)(assert, expect, origin, homePath, results, verifyHomeInlineAnalysis)(page, 'test', 390);
  assert.deepEqual(openedHomes, ['/', '/', '/', '/ru', '/ru', '/ru'].map(path => origin + path));
  assert.equal(results.filter(result => result.freeJourney && result.backReturned && !result.submitted).length, 6);
}
test('all six free journeys start and return to exact canonical EN/RU homes', () => journeyScenario());
for (const name of ['wrongBack', 'wrongDestination', 'privateRequest']) test(`free journeys reject ${name}`, () => assert.rejects(journeyScenario({ [name]: true })));

test('real-browser matrices, privacy, no-discard, visuals and errors stay mandatory', () => {
  for (const text of [
    "[['en', 'ru'], ['ru', 'en']]", "await page.goto(origin + homePath(from)",
    "[['chromium', chromium], ['webkit', webkit]]", '[320, 375, 390, 430, 1365]',
    'results.filter(result => result.firstClickRetained).length, widths.length * 4',
    'results.filter(result => result.freeJourney).length, widths.length * 12',
    'assert.deepEqual(unexpectedApiRequests, []', 'assert.deepEqual(errors, [])',
    "frame.evaluate(element => element.isConnected)", "await expect(next).toHaveCount(0)",
    'measurements.overflow <= 2', 'measurements.cardCount, 14', 'measurements.contactChoices, 3',
    "await expect(videoPosters).toHaveCount(expectedIds.length)", "firstReview.locator('iframe')",
    'const firstReview = await verifyHomeTestimonialPosters(page)',
    'await exerciseFreeJourneys(page, engine, width)',
  ]) assert.ok(source.includes(text), text);
  assert.match(source, /finally \{\s+delayedLocale = null;\s+releaseHeldRsc\(\)/);
  assert.doesNotMatch(source, /test\.skip|test\.todo|test\.only/);
});

const visualBoundary = extract('    // Both retained first-click proofs', '    // Owner-approved homepage:');
const posterHelper = extract('async function verifyHomeTestimonialPosters(', 'async function exercise(');
const finalPosterPlay = extract('    // Poster click must load the exact YouTube original', "\n    phase = 'journeys';");
const visualIds = ['Dk0LBmOivQo', 'aUJde6A-9p0', 'fE6sD1zr1Js', 'itjo2_z2NGk'];

async function visualScenario(options = {}) {
  const state = { playing: true, url: origin + '/', fresh: false, drained: false, gotos: 0, events: [] };
  options.observe?.(state);
  const ids = options.wrongFreshId ? [visualIds[0], 'WRONGSOURCE', ...visualIds.slice(2)] : visualIds;
  const sourceUrl = id => `https://www.youtube-nocookie.com/embed/${id}?autoplay=1`;
  const reviews = ids.map((id, index) => {
    const poster = {
      get count() { return Number(!(index === 0 && state.playing) && !(options.missingPoster && index === 1)); },
      visible: true,
      async getAttribute(name) { assert.equal(name, 'src'); return `/images/holistic-house/testimonial-posters/${options.wrongPoster && index === 1 ? 'WRONGSOURCE' : id}.webp`; },
      async scrollIntoViewIfNeeded() {},
      async evaluate(callback) { return callback({ complete: !options.brokenPoster, naturalWidth: options.brokenPoster ? 0 : 480 }); },
    };
    const iframe = {
      get count() { return Number(index === 0 && state.playing && !options.frameLost); },
      get src() { return sourceUrl(options.wrongFrameId ? 'WRONGSOURCE' : id); },
    };
    return { id, count: 1, locator(selector) {
      if (selector === '.site-video-fallback-poster') return poster;
      if (selector === 'iframe') return iframe;
      if (selector === '.site-video-play' || selector === 'button.site-video-play') return {
        get count() { return Number(!(index === 0 && state.playing)); },
        async click() { assert.equal(state.fresh, true); assert.equal(state.playing, false); state.playing = true; state.events.push('poster-click'); },
      };
      assert.equal(selector, '.site-video-watch-link'); return { count: 1, href: `https://www.youtube.com/watch?v=${id}` };
    } };
  });
  const testimonials = { count: 1, lang: 'en', locator(selector) {
    if (selector === '[data-testimonial-video-id]') return { count: ids.length, async evaluateAll(callback) { return callback(ids.map(id => ({ dataset: { testimonialVideoId: id } }))); } };
    if (selector === '.site-video-fallback-poster') return { get count() { return reviews.reduce((sum, review) => sum + review.locator(selector).count, 0); } };
    if (selector === 'blockquote') return { count: 1, visible: true }; // Content is not read by this technical fixture.
    const id = selector.match(/^\[data-testimonial-video-id="([\w-]{11})"\]$/)?.[1]; assert.ok(id);
    return reviews.find(review => review.id === id) || { count: 0 };
  } };
  const page = {
    url: () => state.url,
    locator(selector) {
      if (selector === 'main.house-home') return { lang: options.wrongFreshLocale ? 'ru' : 'en' };
      if (selector === '[data-personal-testimonials="home"]') return testimonials;
      assert.equal(selector, '[data-personal-testimonials="home"] [data-testimonial-video-id="Dk0LBmOivQo"]'); return reviews[0];
    },
    async goto(url, config) {
      assert.equal(state.drained, true, 'Never reload before the held response and route drain complete');
      assert.equal(config.waitUntil, 'domcontentloaded'); assert.equal(url, origin + '/');
      state.gotos++; assert.equal(state.gotos, 1, 'One explicit fresh document, never a retry');
      if (options.navigationFailure) throw new Error('SYNTHETIC_NAVIGATION_FAILURE');
      state.url = options.wrongFreshUrl ? origin + '/ru' : url; state.fresh = true;
      if (!options.freshStillPlaying) state.playing = false;
      state.events.push('fresh-document');
    },
  };
  const expect = target => ({
    async toHaveCount(value) { assert.equal(target.count, value); },
    async toHaveAttribute(name, value) { if ('count' in target) assert.equal(target.count, 1); if (value instanceof RegExp) assert.match(target[name], value); else assert.equal(target[name], value); },
    async toHaveURL(value) { assert.equal(target, page); assert.equal(state.url, value); },
    async toBeVisible() { assert.equal(target.visible, true); },
  });
  expect.poll = callback => ({ async toBe(value) { assert.equal(await callback(), value); } });
  const results = options.proofs ?? [
    { engine: 'test', width: 390, from: 'en', to: 'ru', heldRsc: true, firstClickRetained: true },
    { engine: 'test', width: 390, from: 'ru', to: 'en', heldRsc: true, firstClickRetained: true },
  ];
  const transport = {
    async drain() { state.drained = true; state.events.push('drain'); },
    assertHealthy() { if (options.transportFailure) throw new Error('SYNTHETIC_TRANSPORT_FAILURE'); },
  };
  if (!options.skipBoundary) await new AsyncFunction('assert', 'expect', 'page', 'origin', 'homePath', 'results', 'engine', 'width', 'delayedLocale', 'delayedRscGate', 'transport', visualBoundary)(
    assert, expect, page, origin, homePath, results, 'test', 390, options.activeHold ? 'en' : null, options.gate ?? Promise.resolve(), transport);
  const verify = new Function('assert', 'expect', `${posterHelper}; return verifyHomeTestimonialPosters;`)(assert, expect);
  const firstReview = await verify(page);
  await new AsyncFunction('firstReview', 'expect', finalPosterPlay)(firstReview, expect);
  assert.equal(state.gotos, 1);
  assert.deepEqual(state.events, ['drain', 'fresh-document', 'poster-click']);
  return state;
}

test('fresh visual document preserves strict four-poster verification and exact native first playback', () => visualScenario());
test('the old retained-player precondition fails strict four-poster verification', () => assert.rejects(visualScenario({ skipBoundary: true }), { code: 'ERR_ASSERTION' }));
for (const [name, options] of Object.entries({
  'reload before both recorded proofs': { proofs: [{ engine: 'test', width: 390, from: 'en', to: 'ru', firstClickRetained: true }] },
  'recorded proofs in the wrong order': { proofs: [{ engine: 'test', width: 390, from: 'ru', to: 'en', firstClickRetained: true }, { engine: 'test', width: 390, from: 'en', to: 'ru', firstClickRetained: true }] },
  'missing held-RSC receipt': { proofs: [{ engine: 'test', width: 390, from: 'en', to: 'ru', firstClickRetained: true, heldRsc: true }, { engine: 'test', width: 390, from: 'ru', to: 'en', firstClickRetained: true, heldRsc: false }] },
  'unreleased locale hold': { activeHold: true }, 'lost retained frame': { frameLost: true },
  'wrong retained video ID': { wrongFrameId: true }, 'fresh document still playing': { freshStillPlaying: true },
  'missing local poster': { missingPoster: true }, 'wrong local poster': { wrongPoster: true },
  'broken local poster': { brokenPoster: true }, 'wrong fresh card ID': { wrongFreshId: true },
  'wrong fresh document locale': { wrongFreshLocale: true }, 'wrong fresh document URL': { wrongFreshUrl: true },
})) test('fresh visual boundary rejects ' + name, async () => {
  let state;
  await assert.rejects(visualScenario({ ...options, observe: value => { state = value; } }), { code: 'ERR_ASSERTION' });
  const beforeReload = ['reload before both recorded proofs', 'recorded proofs in the wrong order', 'missing held-RSC receipt', 'unreleased locale hold', 'lost retained frame', 'wrong retained video ID'].includes(name);
  assert.equal(state.gotos, beforeReload ? 0 : 1, 'Retention faults must fail before any visual reset');
});
test('transport failure prevents the fresh document instead of retrying', () => assert.rejects(visualScenario({ transportFailure: true }), /SYNTHETIC_TRANSPORT_FAILURE/));
test('a failed fresh navigation is not retried or credited as a visual pass', async () => {
  let state;
  await assert.rejects(visualScenario({ navigationFailure: true, observe: value => { state = value; } }), /SYNTHETIC_NAVIGATION_FAILURE/);
  assert.equal(state.gotos, 1); assert.equal(state.fresh, false);
  assert.deepEqual(state.events, ['drain']);
});
test('fresh navigation cannot outrun the last held response gate', async () => {
  let release, state; const gate = new Promise(resolve => { release = resolve; });
  const pending = visualScenario({ gate, observe: value => { state = value; } });
  const observed = pending.then(value => ({ value }), error => ({ error }));
  let orderingError;
  try {
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(state.gotos, 0); assert.equal(state.drained, false);
  } catch (error) { orderingError = error; } finally { release(); }
  const outcome = await observed;
  if (orderingError) throw orderingError;
  if (outcome.error) throw outcome.error;
});

const matrixAssertions = extract('  assert.equal(results.filter(result => result.firstClickRetained)', "  console.log('PASS:");
function visualMatrix(firstClickCount, journeyCount) {
  const results = [...Array.from({ length: firstClickCount }, () => ({ firstClickRetained: true })), ...Array.from({ length: journeyCount }, () => ({ freeJourney: 'fixture' }))];
  new Function('assert', 'results', 'widths', matrixAssertions)(assert, results, [320, 375, 390, 430, 1365]);
}
test('visual isolation retains all20 first-click proofs and60 free journeys', () => visualMatrix(20, 60));
for (const [clicks, journeys] of [[19, 60], [21, 60], [20, 59], [20, 61]]) test(`visual isolation rejects incomplete/duplicate evidence ${clicks}/${journeys}`, () => assert.throws(() => visualMatrix(clicks, journeys)));
