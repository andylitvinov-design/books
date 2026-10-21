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
    async toHaveCount(expected) { assert.equal(actual.count, expected, actual === menu ? 'Require one language menu' : 'Require one locale anchor'); },
    async toHaveAttribute(name, expected) { if(actual===menu){ assert.equal(name,'open'); assert.equal(opened,true); return; } assert.equal(actual, link); assert.equal(name, 'href'); assert.equal(href, expected, 'Require the exact canonical locale anchor href'); },
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
  })) test(`${locale} anchor selection rejects ${name}`, async () => {
    await chooseScenario(locale);
    const diagnostic = name.includes('menu') ? /Require one language menu/ : name.includes('anchor') ? /Require one locale anchor/ : name === 'blocked click' ? /blocked click/ : /Require the exact canonical locale anchor href/;
    await assert.rejects(chooseScenario(locale, input), diagnostic);
  });
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

const homeIntroSources = {
  en: { master: 'ed202847a43a96b918308aa972177b34', youtube: 'Y4K4piEwwA8' },
  ru: { master: '388a04b39ebf215ae656bcd22d0d0847', youtube: 'AE8Pelpo424' },
};
test('Home first-click fixtures retain the exact original-to-mirror identity per locale', () => {
  const defaults = read('lib/site-videos/defaults.js');
  const player = read('components/site-video-player.tsx');
  const mirrors = player.match(/export const existingYouTubeMirrors:[^=]+=(\s*\{[\s\S]*?\});/)?.[1];
  assert.ok(mirrors, 'Keep the actual approved mirror registry');
  const registry = new Function('return ' + mirrors)();
  for (const [locale, { master, youtube }] of Object.entries(homeIntroSources)) {
    const record = 'existingHomeIntroVideo' + (locale === 'en' ? 'En' : 'Ru');
    const start = defaults.indexOf('export const ' + record + ' = Object.freeze({');
    const end = defaults.indexOf('\n})', start);
    assert.ok(start >= 0 && end > start, 'Keep the actual Home source record');
    const original = new Function('return ' + defaults.slice(defaults.indexOf('{', start), end + 2))();
    assert.equal(original.heygenId, master, 'Preserve the per-locale Home master');
    assert.equal(original.language, locale, 'Preserve the Home master audio language');
    assert.ok(defaults.includes(`pageVideoRecord('home-intro', '${locale}', ${record},`), 'Bind the record to the Home intro slot');
    assert.equal(registry[master], youtube, 'Preserve only the exact approved Home mirror');
  }
});

const switchSource = extract('      const countBefore = heldRequests;', '      await verifyFreeOffers(');
async function switchScenario(from, to, { noRsc = false, optimistic = false, discarded = false, wrongVideo = false, wrongOrigin = false, oldEmbed = false, eagerIframe = false, wrongDestination = false } = {}) {
  const state = { committed: false, played: false, url: origin + homePath(from) };
  const iframe = { kind: 'iframe', async elementHandle() { return { async evaluate() { return !discarded; } }; } };
  const next = { kind: 'next', locator(selector) {
    if (selector === 'iframe') return iframe;
    assert.equal(selector, 'button.site-video-play', 'Use the scoped inline-play button');
    return { async click() { assert.equal(state.committed, true); state.played = true; } };
  } };
  const main = { kind: 'main' };
  const page = { locator(selector) {
    if (selector === 'main.house-home') return main;
    assert.equal(selector, `[data-video-slot="home-intro"][data-video-locale="${to}"]`);
    return next;
  } };
  const expect = target => ({
    async toHaveAttribute(name, expected) {
      if (target === main) { assert.equal(name, 'lang'); assert.equal(optimistic ? to : from, expected, 'Held RSC must retain the old locale'); assert.equal(state.committed, false); }
      else {
        assert.equal(target, iframe); assert.equal(name, 'src'); assert.equal(state.played, true);
        assert.ok(expected instanceof RegExp, 'Check the exact YouTube embed identity');
        const id = homeIntroSources[wrongVideo ? from : to].youtube;
        const embed = oldEmbed ? `https://app.heygen.com/embeds/${homeIntroSources[to].master}` : `https://${wrongOrigin ? 'other.example' : 'www.youtube-nocookie.com'}/embed/${id}?autoplay=1&playsinline=1&rel=0&hl=${to}&cc_lang_pref=${to}`;
        assert.match(embed, expected, 'First click must load the exact locale mirror');
      }
    },
    async toHaveCount(expected) { await Promise.resolve(); assert.equal(target === next ? Number(state.committed || optimistic) : Number(state.played || eagerIframe), expected, target === next ? 'Require the target player only after commit' : 'Intro iframe must wait for first click'); },
    async toHaveURL(expected) { assert.equal(target, page); assert.equal(state.url, expected, 'Playback must retain the canonical locale destination'); },
  });
  expect.poll = callback => ({ async toBeGreaterThan(expected) { assert.ok(await callback() > expected, 'The switch must observe a held RSC request'); } });
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
  for (const [name, diagnostic] of Object.entries({
    noRsc: /The switch must observe a held RSC request/,
    optimistic: /Held RSC must retain the old locale/,
    discarded: /First-click YouTube iframe was discarded after navigation/,
    wrongVideo: /First click must load the exact locale mirror/,
    wrongOrigin: /First click must load the exact locale mirror/,
    oldEmbed: /First click must load the exact locale mirror/,
    eagerIframe: /Intro iframe must wait for first click/,
    wrongDestination: /Playback must retain the canonical locale destination/,
  })) {
    test(`${from} to ${to} rejects ${name}`, async () => {
      await switchScenario(from, to);
      await assert.rejects(switchScenario(from, to, { [name]: true }), diagnostic);
    });
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
    async toHaveURL(expected) { assert.equal(target, page); assert.equal(url, expected, expected === home ? 'Free journey must return to its canonical Home' : 'Free journey must reach its exact destination'); },
    async toBeVisible() { assert.ok(target.selector); },
    async toHaveCount(count) { assert.equal(target.selector, '#cabinet-tests'); assert.equal(count, 1); },
  });
  await new Function('assert', 'expect', 'origin', 'homePath', 'results', `${journeys}; return exerciseFreeJourneys;`)(assert, expect, origin, homePath, results)(page, 'test', 390);
  assert.deepEqual(openedHomes, ['/', '/', '/', '/ru', '/ru', '/ru'].map(path => origin + path));
  assert.equal(results.filter(result => result.freeJourney && result.backReturned && !result.submitted).length, 6);
}
test('all six free journeys start and return to exact canonical EN/RU homes', () => journeyScenario());
for (const [name, diagnostic] of Object.entries({
  wrongBack: /Free journey must return to its canonical Home/,
  wrongDestination: /Free journey must reach its exact destination/,
  privateRequest: /Entry navigation must not submit or request private app data/,
})) test(`free journeys reject ${name}`, async () => {
  await journeyScenario();
  await assert.rejects(journeyScenario({ [name]: true }), diagnostic);
});

test('Home verifier counts bind to four exact visible originals and eight lazy disclosed sources', () => {
  const component = read('components/personal-testimonials.tsx');
  const disclosure = read('components/home-testimonial-more.tsx');
  const records = component.match(/const testimonialVideos = (\{[\s\S]*?\}) as const;/)?.[1];
  assert.ok(records, 'Read the actual testimonial source catalogue');
  const catalog = new Function('return ' + records)();
  const expected = {
    en: ['Dk0LBmOivQo', 'aUJde6A-9p0', 'fE6sD1zr1Js', 'itjo2_z2NGk', '4NrryHcEF1A', 'hYwRNMxIMjc'],
    ru: ['m9RfDgK76PU', 'MIVLm1GUTtM', 'ttQxUHopaUM', 'VABgpmn4ZYA', 'muOnIHllI7E', '5oj0BIbLT4w'],
  };
  const selection = name => {
    const expression = component.match(new RegExp('const ' + name + ' = ([^;]+);'))?.[1];
    assert.ok(expression, 'Read the actual ' + name + ' selection');
    return new Function('isHome', 'testimonialVideos', 'locale', 'return ' + expression);
  };
  for (const locale of ['en', 'ru', 'es']) {
    const primary = locale === 'ru' ? 'ru' : 'en';
    const other = primary === 'ru' ? 'en' : 'ru';
    assert.deepEqual(catalog[locale].map(item => item.id), expected[primary], 'Preserve the six exact originals per primary audio language');
    assert.ok(catalog[locale].every(item => item.language === primary), 'Preserve original audio-language labels');
    const visible = selection('videos')(true, catalog, locale);
    const remaining = selection('remainingHomeVideos')(true, catalog, locale);
    const secondary = selection('otherLanguageVideos')(true, catalog, locale);
    assert.deepEqual(visible.map(item => item.id), expected[primary].slice(0, 4), 'Home must show the first four exact originals');
    assert.deepEqual(remaining.map(item => item.id), expected[primary].slice(4), 'Disclosure must retain the two remaining primary-language originals');
    assert.deepEqual(secondary.map(item => item.id), expected[other], 'Disclosure must retain the six secondary-language originals');
    assert.equal(remaining.length + secondary.length, 8, 'Home must disclose eight remaining sources');
    assert.equal(new Set([...visible, ...remaining, ...secondary].map(item => item.id)).size, 12, 'Home must retain twelve unique original sources');
  }
  const expectedIds = source.match(/const expectedIds = (\[[^;]+\]);/)?.[1];
  assert.ok(expectedIds, 'Read the verifier exact visible source IDs');
  assert.deepEqual(new Function('return ' + expectedIds)(), expected.en.slice(0, 4), 'Verifier must inspect the final English Home four originals');
  for (const binding of [
    '{renderVideoCards(presentedVideos, variant === "all")}', '<HomeTestimonialMore',
    'remainingVideos={remainingHomeVideos.map', 'otherLanguageVideos={otherLanguageVideos.map',
  ]) assert.ok(component.includes(binding), 'Keep the Home source-to-render binding: ' + binding);
  for (const binding of [
    'useState(false)', '<details', '<summary>', 'data-home-testimonial-disclosure="true"',
    'onToggle={(event) => setExpanded(event.currentTarget.open)}', '{expanded ? (',
    'renderCards(remainingVideos)', 'renderCards(otherLanguageVideos, true)',
  ]) assert.ok(disclosure.includes(binding), 'Keep the accessible lazy disclosure binding: ' + binding);
});

test('real-browser matrices, privacy, no-discard, visuals and errors stay mandatory', () => {
  for (const text of [
    "[['en', 'ru'], ['ru', 'en']]", "await page.goto(origin + homePath(from)",
    "[['chromium', chromium], ['webkit', webkit]]", '[390, 1365]',
    'results.filter(result => result.firstClickRetained).length, 8',
    'results.filter(result => result.freeJourney).length, 24',
    'assert.deepEqual(unexpectedApiRequests, []', 'assert.deepEqual(errors, [])',
    "frame.evaluate(element => element.isConnected)", "await expect(next).toHaveCount(0)",
    'measurements.overflow <= 2', 'measurements.cardCount, 4', 'measurements.contactChoices, 3',
    'await expect(videoPosters).toHaveCount(expectedIds.length)', "firstReview.locator('iframe')",
    'await expect(cards).toHaveCount(expectedIds.length)',
    'assert.deepEqual(await cards.evaluateAll(items => items.map(item => item.dataset.testimonialVideoId)), expectedIds)',
    'const firstReview = await verifyHomeTestimonialPosters(page)',
    'await exerciseFreeJourneys(page, engine, width)',
  ]) assert.ok(source.includes(text), text);
  assert.match(source, /finally \{\s+delayedLocale = null;\s+releaseHeldRsc\(\)/);
  assert.doesNotMatch(source, /test\.skip|test\.todo|test\.only/);
});
