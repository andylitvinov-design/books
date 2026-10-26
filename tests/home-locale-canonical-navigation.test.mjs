import assert from 'node:assert/strict';
import test from 'node:test';
import { createHomeRouteSupervisor } from '../scripts/home-route-supervisor.mjs';
import { readFileSync } from 'node:fs';
import { assertHomeVerifierMatrix } from './helpers/home-verifier-matrix.mjs';
import { sourceModule, jsx, nodes, parse, descendants, ts, denied } from './helpers/current-source-render.mjs';
import * as videoModel from '../lib/site-videos/model.js';
import { existingHomeIntroVideoEn, existingHomeIntroVideoRu } from '../lib/site-videos/defaults.js';

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

const routeSource = extract("  await page.route('**/*', async route => {", '\n  // This test opens an empty disclosure only.');
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

// Execute the current public player with controlled hooks, not a fabricated
// provider URL. No DOM, third-party request, media readiness or native click claim.
const expectedHomeIds = { en: 'Y4K4piEwwA8', ru: 'AE8Pelpo424' };
function homePlayback(locale) {
  const values = [], refs = [], dependencies = [];
  let cursor = 0, refCursor = 0, effectCursor = 0, pending = [], dirty = false;
  const hooks = {
    useState(initial) { const i = cursor++; if (!(i in values)) values[i] = initial;
      return [values[i], value => { const next = typeof value === 'function' ? value(values[i]) : value;
        if (!Object.is(values[i], next)) { values[i] = next; dirty = true; } }]; },
    useRef(initial) { const i = refCursor++; return refs[i] ||= { current: initial }; },
    useId: () => 'synthetic-home-playback',
    useEffect(callback, deps) { const i = effectCursor++;
      if (!dependencies[i] || deps.some((value, j) => !Object.is(value, dependencies[i][j]))) {
        dependencies[i] = [...deps]; pending.push(callback);
      }
    },
  };
  const { SiteVideoPlayer } = sourceModule(read('components/site-video-player.tsx'), 'site-video-player.tsx', {
    'react/jsx-runtime': jsx, react: hooks,
    'lucide-react': { ChevronDown: 'icon', ExternalLink: 'icon', Film: 'icon', Play: 'icon' },
    'next/image': { default: 'img' }, '@/components/static-portrait': { StaticPortrait: 'portrait' },
    '@/lib/site-videos/model': videoModel, './site-video-minimal.module.css': { default: {} },
  }, { URLSearchParams, window: { setTimeout: denied, clearTimeout: denied } });
  const video = locale === 'en' ? existingHomeIntroVideoEn : existingHomeIntroVideoRu;
  const render = () => {
    for (let attempt = 0; attempt < 5; attempt++) {
      cursor = refCursor = effectCursor = 0; pending = []; dirty = false;
      const boundary = SiteVideoPlayer({ video, locale });
      assert.equal(typeof boundary?.type, 'function', 'Actual playable boundary');
      const tree = boundary.type(boundary.props);
      for (const effect of pending) effect();
      if (!dirty) return nodes(tree);
    }
    assert.fail('Player hooks did not settle');
  };
  const before = render();
  assert.equal(before.filter(node => node.type === 'iframe').length, 0, 'No eager iframe');
  const buttons = before.filter(node => node.type === 'button' && node.props.className === 'site-video-play');
  assert.equal(buttons.length, 1, 'Unique actual play button');
  assert.equal(buttons[0].props.disabled, false, 'Mounted play handler must be enabled');
  buttons[0].props.onClick();
  const after = render(), frames = after.filter(node => node.type === 'iframe');
  assert.equal(frames.length, 1, 'One real iframe after one play handler');
  assert.equal(after.filter(node => node.type === 'button' && node.props.className === 'site-video-play').length, 0);
  assert.equal(frames[0].props['data-video-playback'], 'youtube');
  const url = new URL(frames[0].props.src);
  assert.equal(url.origin, 'https://www.youtube-nocookie.com');
  assert.equal(url.pathname, '/embed/' + expectedHomeIds[locale], 'Independent approved mirror identity');
  assert.equal(url.searchParams.get('autoplay'), '1');
  assert.equal(url.searchParams.get('hl'), locale);
  assert.equal(url.searchParams.get('cc_lang_pref'), locale);
  return frames[0].props.src;
}

const switchSource = extract('      const countBefore = heldRequests;', '      await verifyFreeOffers(');
async function switchScenario(from, to, { noRsc = false, optimistic = false, discarded = false, wrongVideo = false, wrongDestination = false } = {}) {
  const state = { committed: false, played: false, url: origin + homePath(from) };
  const actualPlayback = homePlayback(to);
  const iframe = { kind: 'iframe', async elementHandle() { return { async evaluate() { return !discarded; } }; } };
  const next = { kind: 'next', locator(selector) {
    if (selector === 'iframe') return iframe;
    assert.equal(selector, 'button.site-video-play', 'ACTUAL_PLAY_BUTTON_SELECTOR');
    return { async click() { assert.equal(state.committed, true); assert.equal(state.played, false, 'TARGET_SINGLE_CLICK'); state.played = true; } };
  } };
  const main = { kind: 'main' };
  const page = { locator(selector) {
    if (selector === 'main.house-home') return main;
    assert.equal(selector, `[data-video-slot="home-intro"][data-video-locale="${to}"]`);
    return next;
  } };
  const expect = target => ({
    async toHaveAttribute(name, expected) {
      if (target === main) { assert.equal(name, 'lang'); assert.equal(optimistic ? to : from, expected, 'OLD_LOCALE_HELD'); assert.equal(state.committed, false); }
      else {
        assert.equal(target, iframe); assert.equal(name, 'src'); assert.equal(state.played, true);
        assert.ok(expected instanceof RegExp, 'Actual verifier requires a RegExp');
        const fixed = new RegExp('^https://www\\.youtube-nocookie\\.com/embed/' + expectedHomeIds[to] + '\\?');
        assert.equal(expected.source, fixed.source, 'EXACT_ANCHORED_MIRROR_PATTERN');
        assert.equal(expected.flags, '', 'No weakened regex flags');
        for (const invalid of ['https://app.heygen.com/embeds/old',
          'https://www.youtube-nocookie.com.evil/embed/' + expectedHomeIds[to] + '?',
          'https://www.youtube-nocookie.com/embed/' + expectedHomeIds[from] + '?',
          'https://www.youtube-nocookie.com/embed/' + expectedHomeIds[to] + '-suffix?'])
          assert.equal(expected.test(invalid), false, 'Reject wrong provider, host and identity');
        assert.match(wrongVideo ? 'https://www.youtube-nocookie.com/embed/wrong-video?' : actualPlayback,
          expected, 'TARGET_VIDEO_IDENTITY');
      }
    },
    async toHaveCount(expected) { await Promise.resolve(); assert.equal(target === next ? Number(state.committed || optimistic) : Number(state.played), expected); },
    async toHaveURL(expected) { assert.equal(target, page); assert.equal(state.url, expected, 'CANONICAL_DESTINATION'); },
  });
  expect.poll = callback => ({ async toBeGreaterThan(expected) { assert.ok(await callback() > expected, 'HELD_RSC_REQUIRED'); } });
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
    const expectedFailure = {
      noRsc: 'HELD_RSC_REQUIRED', optimistic: 'OLD_LOCALE_HELD', discarded: 'First-click YouTube iframe was discarded after navigation',
      wrongVideo: 'TARGET_VIDEO_IDENTITY', wrongDestination: 'CANONICAL_DESTINATION',
    }[name];
    test(`${from} to ${to} rejects ${name}`, () => assert.rejects(switchScenario(from, to, { [name]: true }),
      error => error.code === 'ERR_ASSERTION' && error.message.includes(expectedFailure)));
  }
}

const journeys = extract('async function exerciseFreeJourneys(', 'async function verifyHomeTestimonialPosters(');
async function journeyScenario({ wrongBack = false, wrongDestination = false, privateRequest = false } = {}) {
  let url, home, selected, routeHandler;
  const results = [], openedHomes = [], inPageCaptures = [];
  const suffixes = { selfTest: '/client/tests', reiki: '/academy/principles-of-energywork/learn' };
  const chooser = { locator(selector) {
    const option = selector.match(/^button\[data-home-free-option="([a-zA-Z]+)"\]$/);
    if (option) return { async click() { selected = option[1]; } };
    assert.notEqual(selected, 'analysis', 'Analysis must use the in-page capture, not an anchor');
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
  // Canonical-route bookkeeping only; actual Home/chooser source and disclosure
  // acceptance are executed separately in home-locale-free-capture.test.mjs.
  const verifyHomeAnalysisCapture = async (target, scope, locale) => {
    assert.equal(target, page); assert.equal(scope, chooser); assert.equal(selected, 'analysis');
    assert.equal(url, origin + homePath(locale)); inPageCaptures.push(locale);
  };
  await new Function('assert', 'expect', 'origin', 'homePath', 'results', 'verifyHomeAnalysisCapture', `${journeys}; return exerciseFreeJourneys;`)(assert, expect, origin, homePath, results, verifyHomeAnalysisCapture)(page, 'test', 390);
  assert.deepEqual(openedHomes, ['/', '/', '/', '/ru', '/ru', '/ru'].map(path => origin + path));
  assert.equal(results.filter(result => result.freeJourney && result.backReturned && !result.submitted).length, 4);
  assert.deepEqual(inPageCaptures, ['en', 'ru']);
  assert.equal(results.filter(result => result.freeJourney === 'analysis' && result.inPageCapture && result.stayedOnHome && !result.submitted).length, 2);
}
test('four direct entries return and two in-page captures stay on exact canonical EN/RU homes', () => journeyScenario());
for (const name of ['wrongBack', 'wrongDestination', 'privateRequest']) test(`free journeys reject ${name}`, () => assert.rejects(journeyScenario({ [name]: true })));

async function currentVisualContract() {
  const expectedModules = ['courses', 'personality', 'situation', 'coaching', 'alchemy', 'energy', 'master'];
  const expectedCards = ['reiki', 'opora', 'academy', 'profile', 'review', 'businessConstellations', 'constellations',
    'aiCoaching', 'therapist', 'alchemy', 'energy', 'pro', 'service', 'course'];
  const { HomeFeaturedWorkspace } = sourceModule(read('components/home-featured-workspace.tsx'), 'home-featured-workspace.tsx', {
    'react/jsx-runtime': jsx, react: { useState: value => [value, denied] },
    'next/image': { default: 'img' }, 'next/link': { default: 'a' },
    'lucide-react': { ArrowRight: 'icon', ChevronDown: 'icon', ShieldCheck: 'icon', Target: 'icon' },
    '@/components/home-personal-space': { useHomePersonalSpace: () => null },
    './home-featured-workspace.module.css': { default: {} },
  });
  const { PersonalTestimonials } = sourceModule(read('components/personal-testimonials.tsx'), 'personal-testimonials.tsx', {
    'react/jsx-runtime': jsx, 'next/link': { default: 'a' }, 'lucide-react': { ArrowRight: 'icon', Quote: 'icon' },
    '@/components/site-video-player': { SiteVideoPlayer: 'video-boundary' },
    '@/components/home-testimonial-more': { HomeTestimonialMore: 'closed-more-boundary' },
    './personal-testimonials.module.css': { default: {} },
  });
  const expectedPosters = ['Dk0LBmOivQo', 'aUJde6A-9p0', 'fE6sD1zr1Js', 'itjo2_z2NGk'];
  const testimonialNodes = nodes(PersonalTestimonials({ locale: 'en', variant: 'home' }));
  assert.deepEqual(testimonialNodes.filter(node => node.props['data-testimonial-video-id'])
    .map(node => node.props['data-testimonial-video-id']), expectedPosters, 'Four actual original Home cards');
  assert.deepEqual(testimonialNodes.filter(node => node.type === 'video-boundary')
    .map(node => node.props.video.youtubeId), expectedPosters, 'Same exact sources reach the player');
  assert.deepEqual(testimonialNodes.filter(node => node.type === 'video-boundary')
    .map(node => node.props.fallbackPoster), expectedPosters.map(id => '/images/holistic-house/testimonial-posters/' + id + '.webp'));
  const ast = parse(source, 'verify-home-locale-switch.mjs');
  const posterHelper = ast.statements.filter(node => ts.isFunctionDeclaration(node) && node.name?.text === 'verifyHomeTestimonialPosters');
  assert.equal(posterHelper.length, 1);
  const expectedIds = descendants(posterHelper[0]).filter(node => ts.isVariableDeclaration(node) && node.name.getText(ast) === 'expectedIds');
  assert.equal(expectedIds.length, 1);
  assert.ok(ts.isArrayLiteralExpression(expectedIds[0].initializer));
  assert.deepEqual(expectedIds[0].initializer.elements.map(node => { assert.ok(ts.isStringLiteral(node)); return node.text; }), expectedPosters);
  // The unchanged poster test executes this entire helper and its malformed,
  // missing/extra/wrong-source controls; retain the actual count gate here too.
  assert.match(posterHelper[0].getText(ast), /await expect\(videoPosters\)\.toHaveCount\(expectedIds\.length\)/);
  const measurementFragment = extract('    const measurements = await page.evaluate(', '    results.push({ engine, width, homeVisual:');
  const run = new AsyncFunction('assert', 'page', 'document', 'innerWidth', 'getComputedStyle', 'width',
    measurementFragment + '; return measurements;');
  for (const locale of ['en', 'ru']) {
    const rendered = nodes(HomeFeaturedWorkspace({ locale }));
    const modules = rendered.filter(node => node.props['data-home-module']);
    const cards = rendered.filter(node => node.props['data-home-offer-card']);
    assert.deepEqual(modules.map(node => node.props['data-home-module']), expectedModules, 'Seven actual ordered modules');
    assert.deepEqual(cards.map(node => node.props['data-home-offer-card']), expectedCards, 'Fourteen actual ordered cards');
    const check = async (cardCount = 14, moduleCount = 7) => {
      const contact = { getBoundingClientRect: () => ({ width: 400, height: 300 }),
        querySelectorAll: selector => { assert.equal(selector, '[data-choice-layout="home-free"] button'); return [1, 2, 3]; },
        querySelector: selector => { assert.equal(selector, '[data-consultation-capture="home-free"]'); return {}; } };
      const document = {
        documentElement: { scrollWidth: 390 },
        querySelectorAll(selector) {
          if (selector === '[data-home-featured-workspace] [data-home-module]') return Array.from({ length: moduleCount }, (_, i) => modules[i]);
          assert.equal(selector, '[data-home-featured-workspace] [data-home-offer-card]');
          return Array.from({ length: cardCount }, (_, i) => cards[i]);
        },
        querySelector(selector) {
          if (selector === '[data-home-contact-capture]') return contact;
          assert.ok(['[data-home-offer-card="review"]', '[data-home-offer-card="review"] img', '.service-home-about__image'].includes(selector));
          return { getBoundingClientRect: () => ({ width: 300, height: 200 }) };
        },
      };
      return run(assert, { evaluate: callback => callback() }, document, 390, () => ({ backgroundImage: 'linear-gradient(synthetic)' }), 390);
    };
    const nominal = await check(); assert.equal(nominal.cardCount, 14); assert.equal(nominal.moduleCount, 7);
    for (const count of [13, 15]) await assert.rejects(check(count), error => error.code === 'ERR_ASSERTION' && error.message.includes('all fourteen journey cards'));
    for (const count of [6, 8]) await assert.rejects(check(14, count), error => error.code === 'ERR_ASSERTION' && error.message.includes('all seven journey modules'));
  }
}

test('real-browser matrices, privacy, no-discard, visuals and errors stay mandatory', async () => {
  await assertHomeVerifierMatrix(source);
  await currentVisualContract();
  for (const text of [
    "[['en', 'ru'], ['ru', 'en']]", "await page.goto(origin + homePath(from)",
    "[['chromium', chromium], ['webkit', webkit]]",
    'assert.deepEqual(unexpectedApiRequests, []', 'assert.deepEqual(errors, [])',
    "frame.evaluate(element => element.isConnected)", "await expect(next).toHaveCount(0)",
    'measurements.overflow <= 2', 'measurements.contactChoices, 3',
    "firstReview.locator('iframe')",
    'const firstReview = await verifyHomeTestimonialPosters(page)',
    'await exerciseFreeJourneys(page, engine, width)',
  ]) assert.ok(source.includes(text), text);
  assert.match(source, /finally \{\s+delayedLocale = null;\s+releaseHeldRsc\(\)/);
  assert.doesNotMatch(source, /test\.skip|test\.todo|test\.only/);
});
