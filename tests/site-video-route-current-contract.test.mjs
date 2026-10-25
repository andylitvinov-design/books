import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import { SERVICE_VIDEO_DETAIL_CASES, expectedServiceVideoWatchUrl, matchesServiceVideoPlayback,
  safeServiceVideoIdentity, serviceVideoFailureContext, withServiceVideoFailureContext } from '../scripts/helpers/site-video-route-contract.mjs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const plain = value => JSON.parse(JSON.stringify(value));
const forbidden = name => () => { throw new Error('Forbidden source-fixture side effect: ' + name); };
const jsx = (type, props = {}) => typeof type === 'function' ? type(props) : { type, props };
const nodes = value => value == null || typeof value !== 'object' ? [] :
  Array.isArray(value) ? value.flatMap(nodes) : [value, ...nodes(value.props?.children)];
const hasClass = (node, cls) => String(node.props?.className || '').split(/\s+/).includes(cls);
function matches(node, selector) {
  if (!node?.props) return false;
  if (selector.startsWith('.')) return hasClass(node, selector.slice(1));
  const match = selector.match(/^(?:#([\w-]+))?\[([\w-]+)(?:="([^"]+)")?\]$/);
  if (match) return (!match[1] || node.props.id === match[1]) && Object.hasOwn(node.props, match[2]) &&
    (match[3] === undefined || node.props[match[2]] === match[3]);
  if (selector === 'details.site-video-transcript') return node.type === 'details' && hasClass(node, 'site-video-transcript');
  return node.type === selector;
}
const selected = (root, selector) => selector === ':scope > a[href]'
  ? [root?.props?.children].flat(Infinity).filter(node => node?.type === 'a' && Object.hasOwn(node.props, 'href'))
  : nodes(root).filter(node => matches(node, selector));
const style = { __esModule: true, default: new Proxy({}, { get: (_, key) => String(key) }) };
const element = tag => props => jsx(tag, props);

// All authored media/renderers share one VM realm so the real model's strict
// plain-object checks remain active. No repository, provider or auth is imported.
function authoredFixture(overrides = {}) {
  const context = vm.createContext({ URL, URLSearchParams, Set, Map,
    fetch: forbidden('fetch'), WebSocket: forbidden('WebSocket'),
    process: undefined, window: { setTimeout: () => 1, clearTimeout() {} },
  });
  const modules = {
    'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'fragment' },
    'next/image': { __esModule: true, default: element('img') },
    'next/link': { __esModule: true, default: element('a') },
    'next/navigation': { notFound: forbidden('notFound'), permanentRedirect(path) { throw { syntheticRedirect: path }; } },
    'lucide-react': Object.fromEntries(['ArrowLeft', 'ArrowRight', 'ArrowUpRight', 'CalendarCheck2', 'Check', 'CheckCircle2',
      'ChevronDown', 'Clock3', 'ExternalLink', 'Film', 'Heart', 'Layers3', 'MessageCircle', 'Play', 'PlayCircle',
      'ShieldCheck', 'Sparkles'].map(name => [name, () => null])),
    '@/components/static-portrait': { StaticPortrait: element('img') },
    '@/components/public-site-header': { PublicSiteHeader: element('synthetic-public-header') },
    '@/components/compact-lead-capture': { CompactLeadCapture: element('synthetic-capture-not-mounted') },
    '@/components/personal-express-enquiry': { PersonalExpressEnquiry: element('synthetic-enquiry-not-mounted') },
    '@/components/free-situation-review-form': { FreeSituationReviewForm: element('synthetic-form-not-mounted') },
    '@/components/personal-consultation-form': { PersonalConsultationForm: element('synthetic-form-not-mounted') },
    '@/components/contact-channel-chooser': { ContactChannelChooser: element('synthetic-contact-not-mounted') },
    '@/components/distance-homeopathy-guide': { DistanceHomeopathyGuide: element('synthetic-guide-not-mounted') },
    '@/components/alchemy-soul-lead-form': { AlchemySoulFormatSelector: element('synthetic-format'), AlchemySoulLeadForm: element('synthetic-form-not-mounted') },
    '@/components/personal-testimonials': { PersonalTestimonials: element('synthetic-testimonials'),
      testimonialVideos: { en: [], ru: [], es: [] }, locallyArchivedVideoPosterIds: new Set() },
    '@/lib/commerce/wise-payments': { wisePaymentsEnabled: () => false },
    '@/lib/commerce/paypal-personal': { personalPayPalEnabled: () => false },
    '@/lib/whatsapp-enquiry': { whatsappEnquiryUrl: () => 'https://synthetic-contact.invalid' },
    '@/lib/public-card-artwork': { cardArtworkUrl: value => value, hasCardArtwork: () => false },
    '@/data/remedies': { isSupportedLocale: locale => ['en', 'ru'].includes(locale) },
    '@/data/academy/catalog': { isPublicLocale: locale => ['en', 'ru', 'es'].includes(locale) },
    '@/data/site-metadata': { metadataBaseFor: () => new URL('https://synthetic-public.invalid') },
    '@/components/site-video-player': { SiteVideoPlayer: element('authored-site-video') },
  };
  for (const path of ['./service-video-showcase.module.css', './alchemy-soul-landing.module.css', './core-service-detail.module.css',
    './personal-service-landing.module.css', './free-entry-landing.module.css', './site-video-minimal.module.css',
    '@/components/alchemy-soul-landing.module.css']) modules[path] = style;
  function compile(path, extra = {}) {
    const exports = {};
    const source = overrides[path] ?? read(path);
    const code = ts.transpileModule(source, { fileName: path, compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true,
    } }).outputText;
    const run = vm.runInContext(`(function(exports, require) { ${code}\n})`, context, { filename: path });
    run(exports, name => {
      assert.ok(Object.hasOwn(extra, name) || Object.hasOwn(modules, name), 'Unapproved dependency: ' + name);
      return Object.hasOwn(extra, name) ? extra[name] : modules[name];
    });
    return exports;
  }
  modules['@/lib/site-videos/model'] = compile('lib/site-videos/model.js');
  modules['@/data/service-video-library'] = compile('data/service-video-library.ts');
  modules['@/data/personal-service-pages'] = compile('data/personal-service-pages.ts');
  for (const [path, key] of [
    ['components/service-video-showcase.tsx', '@/components/service-video-showcase'],
    ['components/alchemy-soul-landing.tsx', '@/components/alchemy-soul-landing'],
    ['components/core-service-detail.tsx', '@/components/core-service-detail'],
    ['components/personal-service-landing.tsx', '@/components/personal-service-landing'],
    ['components/free-entry-landing.tsx', '@/components/free-entry-landing'],
  ]) modules[key] = compile(path);

  async function route(path) {
    const [, locale, , slug] = path.split('/');
    assert.ok(['en', 'ru', 'es'].includes(locale));
    assert.ok(['alchemy-of-soul', 'hypnotherapy-course', 'psychohomeopathy', 'imagery-therapy', 'systemic-constellations', 'free-situation-review'].includes(slug));
    const page = compile(`app/[locale]/services/${slug}/page.tsx`);
    try { return { pathname: path, view: await page.default({ params: Promise.resolve({ locale }) }) }; }
    catch (error) {
      if (!error?.syntheticRedirect) throw error;
      assert.equal(slug, 'psychohomeopathy');
      assert.equal(error.syntheticRedirect, `/${locale}/services/alchemy-of-soul`);
      return route(error.syntheticRedirect);
    }
  }
  function player(props) {
    const values = [], refs = [], dependencies = [];
    let stateIndex = 0, refIndex = 0, effectIndex = 0, pending = [], dirty = false;
    const react = {
      useState(initial) { const i = stateIndex++; if (!(i in values)) values[i] = initial;
        return [values[i], value => { const next = typeof value === 'function' ? value(values[i]) : value;
          if (!Object.is(values[i], next)) { values[i] = next; dirty = true; } }]; },
      useRef(initial) { const i = refIndex++; return refs[i] ||= { current: initial }; },
      useId: () => 'synthetic-public-video-title',
      useEffect(callback, deps) { const i = effectIndex++; if (!dependencies[i] || deps.some((x, n) => !Object.is(x, dependencies[i][n]))) {
        dependencies[i] = [...deps]; pending.push(callback); } },
    };
    const { SiteVideoPlayer } = compile('components/site-video-player.tsx', { react });
    function render() {
      let view;
      for (let attempt = 0; attempt < 5; attempt++) {
        stateIndex = refIndex = effectIndex = 0; pending = []; dirty = false;
        view = SiteVideoPlayer(props); for (const effect of pending) effect();
        if (!dirty) return view;
      }
      throw new Error('Synthetic hooks did not settle');
    }
    let view = render(), playCount = 0;
    return { get view() { return view; }, play() {
      const button = selected(view, '.site-video-play'); assert.equal(button.length, 1); assert.equal(button[0].props.disabled, false);
      button[0].props.onClick(); playCount++; view = render();
    }, get playCount() { return playCount; } };
  }
  return { route, player, modules };
}

const expectedRows = [
  ['/en/services/alchemy-of-soul', 'en', 'en', 'heygen', '7c6b243f048b9c0581ae29619a4a89fc', false],
  ['/en/services/hypnotherapy-course', 'en', 'en', 'heygen', '8c1634ce904434a91931429b6a7eefe1', false],
  ['/ru/services/alchemy-of-soul', 'ru', 'ru', 'youtube', 'Cz6SxXJNZbw', false],
  ['/ru/services/hypnotherapy-course', 'ru', 'ru', 'youtube', 'eLsjFaKCBhI', false],
  ['/en/services/psychohomeopathy', 'en', 'en', 'heygen', '7c6b243f048b9c0581ae29619a4a89fc', false],
  ['/ru/services/psychohomeopathy', 'ru', 'ru', 'youtube', 'Cz6SxXJNZbw', false],
  ['/es/services/imagery-therapy', 'es', 'en', 'heygen', '8c1634ce904434a91931429b6a7eefe1', false],
  ['/en/services/systemic-constellations', 'en', 'en', 'youtube', 'sfVFOQNr2qk', false],
  ['/en/services/free-situation-review', 'en', 'en', 'youtube', 'sfVFOQNr2qk', true],
];
test('independent nine-route inventory preserves sequence, locales, exact identity and intentional internalOnly', () => {
  assert.deepEqual(SERVICE_VIDEO_DETAIL_CASES.map(x => [x.route, x.locale, x.audioLocale, x.provider, x.id, x.internalOnly]), expectedRows);
  assert.ok(Object.isFrozen(SERVICE_VIDEO_DETAIL_CASES));
  for (const detail of SERVICE_VIDEO_DETAIL_CASES) assert.ok(Object.isFrozen(detail));
});

const authored = authoredFixture();
for (const detail of SERVICE_VIDEO_DETAIL_CASES) test('real authored route/player matches independent contract: ' + detail.route, async () => {
  const { pathname, view } = await authored.route(detail.route);
  assert.equal(pathname, detail.canonicalRoute);
  const blocks = selected(view, detail.selector); assert.equal(blocks.length, 1, 'Unique actual authored placement');
  const playerNodes = nodes(blocks[0]).filter(node => node.type === 'authored-site-video'); assert.equal(playerNodes.length, 1);
  const props = playerNodes[0].props;
  assert.equal(props.locale, detail.locale); assert.equal(props.video.language, detail.audioLocale);
  assert.equal(Boolean(props.internalOnly), detail.internalOnly);
  const rendered = authored.player(props);
  assert.equal(selected(rendered.view, 'iframe').length, 0);
  const links = selected(rendered.view, '.site-video-watch-link');
  assert.equal(links.length, detail.internalOnly ? 0 : 1);
  const watch = detail.internalOnly ? selected(blocks[0], ':scope > a[href]') : links;
  assert.equal(watch.length, 1); assert.equal(watch[0].props.href, expectedServiceVideoWatchUrl(detail));
  assert.equal(watch[0].props.target, '_blank'); assert.equal(watch[0].props.rel, 'noopener noreferrer');
  rendered.play();
  const frames = selected(rendered.view, 'iframe'); assert.equal(frames.length, 1);
  assert.equal(matchesServiceVideoPlayback(frames[0].props.src, detail), true);
  assert.equal(frames[0].props['data-video-playback'], detail.provider);
  assert.equal(selected(rendered.view, '.site-video-play').length, 0); assert.equal(rendered.playCount, 1);
});

test('English imagery and hypnotherapy remain separate authored sources; ES imagery retains English audio', async () => {
  const imagery = await authored.route('/en/services/imagery-therapy');
  const props = nodes(imagery.view).find(node => node.type === 'authored-site-video').props;
  assert.equal(props.video.youtubeId, 'vqRmI79cecQ'); assert.equal(props.video.language, 'en');
  assert.notEqual(props.video.youtubeId, SERVICE_VIDEO_DETAIL_CASES[1].id);
  assert.equal(SERVICE_VIDEO_DETAIL_CASES[6].audioLocale, 'en');
});

test('strict playback predicate rejects wrong provider, ID, locale, audio, extra query and HeyGen suffix', () => {
  const youtube = SERVICE_VIDEO_DETAIL_CASES[3], heygen = SERVICE_VIDEO_DETAIL_CASES[0];
  const good = `https://www.youtube-nocookie.com/embed/${youtube.id}?autoplay=1&playsinline=1&rel=0&hl=ru&cc_lang_pref=ru`;
  assert.equal(matchesServiceVideoPlayback(good, youtube), true);
  for (const bad of [null, good.replace('youtube-nocookie.com', 'youtube.com'), good.replace(youtube.id, 'Cz6SxXJNZbw'),
    good.replace('hl=ru', 'hl=en'), good.replace('cc_lang_pref=ru', 'cc_lang_pref=en'), good + '&private=SECRET', good + '&hl=ru',
    good.replace('https:', 'http:'), good.replace('www.', 'secret@www.'), good + '#private']) assert.equal(matchesServiceVideoPlayback(bad, youtube), false);
  for (const bad of [`https://app.heygen.com/embeds/${heygen.id}extra`, `https://app.heygen.com/embeds/${heygen.id}?private=SECRET`,
    `https://app.heygen.com/share/${heygen.id}`, `https://www.youtube-nocookie.com/embed/${heygen.id}`]) assert.equal(matchesServiceVideoPlayback(bad, heygen), false);
});

function diagnosticPage({ source = 'https://www.youtube-nocookie.com/embed/eLsjFaKCBhI?private=SECRET', count = 1, fail = false } = {}) {
  const calls = [];
  return { calls, url() { calls.push('url'); return 'https://private.invalid/ru/services/hypnotherapy-course?secret=SECRET'; },
    locator(selector) { calls.push(selector); if (fail) throw new Error('PRIVATE ERROR SECRET');
      return { count: async () => count, locator(child) { calls.push(child); return {
        count: async () => child === '.site-video-play' ? 0 : 1,
        evaluateAll: async callback => callback([{ getAttribute: () => source }]),
      }; } }; },
  };
}

test('failure context is bounded and contains only enumerated public identities, not URL/query/text', async () => {
  const detail = SERVICE_VIDEO_DETAIL_CASES[3];
  for (const source of ['https://www.youtube-nocookie.com/embed/eLsjFaKCBhI?private=SECRET#hidden',
    'https://www.youtube-nocookie.com/embed/SECRET____1?private=SECRET', 'https://SECRET.invalid/private',
    'https://secret@app.heygen.com/embeds/7c6b243f048b9c0581ae29619a4a89fc']) {
    const receipt = await serviceVideoFailureContext(diagnosticPage({ source }), detail);
    assert.equal(receipt.route, detail.route); assert.equal(receipt.locale, 'ru'); assert.equal(receipt.player, detail.player);
    assert.deepEqual(receipt.expected, { provider: 'youtube', id: 'eLsjFaKCBhI' });
    assert.equal(receipt.iframeCount, 1); assert.equal(receipt.posterCount, 0);
    const serialized = JSON.stringify(receipt);
    assert.doesNotMatch(serialized, /SECRET|https?:|private|hidden|\/embed\//);
    assert.ok(receipt.observed.every(item => item === null || item.id === 'eLsjFaKCBhI'));
  }
  const ambiguous = diagnosticPage({ count: 2 });
  const receipt = await serviceVideoFailureContext(ambiguous, detail);
  assert.equal(receipt.blockCount, 2); assert.equal(receipt.observed, undefined);
  assert.ok(!ambiguous.calls.includes('iframe'), 'Never take first of ambiguous players');
  assert.equal(safeServiceVideoIdentity('https://private.invalid/secret'), null);
});

test('diagnostics are failure-only, preserve original failure identity, and never retry Play', async () => {
  const detail = SERVICE_VIDEO_DETAIL_CASES[0], original = new Error('original acceptance failure');
  for (const diagnosticFailure of [false, true]) for (const writerFailure of [false, true]) {
    let attempts = 0, writes = 0;
    await assert.rejects(withServiceVideoFailureContext({ page: diagnosticPage({ fail: diagnosticFailure }), detail,
      write(receipt) { writes++; assert.equal(receipt.route, detail.route); if (writerFailure) throw new Error('writer private error'); } },
    async () => { attempts++; throw original; }), error => error === original);
    assert.equal(attempts, 1); assert.equal(writes, 1);
  }
  const page = diagnosticPage(); let writes = 0;
  assert.equal(await withServiceVideoFailureContext({ page, detail, write() { writes++; } }, async () => 123), 123);
  assert.equal(writes, 0); assert.deepEqual(page.calls, []);
  await assert.rejects(withServiceVideoFailureContext({ page, detail: { ...detail, route: '/private/SECRET' }, write() {} }, async () => true), /Unknown public video case/);
});

const browserSource = read('scripts/verify-site-video-browser.mjs');
const detailStart = browserSource.indexOf('    for (const detail of SERVICE_VIDEO_DETAIL_CASES)') >= 0
  ? browserSource.indexOf('    for (const detail of SERVICE_VIDEO_DETAIL_CASES)') : browserSource.indexOf('    const detailRoutes = [');
const detailEnd = browserSource.indexOf('    // Wu Xing', detailStart);
assert.ok(detailStart >= 0 && detailEnd > detailStart);
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const runBrowserDetails = new AsyncFunction('page', 'navigate', 'expect', 'assert', 'SERVICE_VIDEO_DETAIL_CASES',
  'expectedServiceVideoWatchUrl', 'matchesServiceVideoPlayback', 'withServiceVideoFailureContext', 'writeFileSync', 'evidence',
  browserSource.slice(detailStart, detailEnd));

// Execute the actual consumer's nine-case loop against the actual rendered
// public placement and actual player hooks. These are semantic fixtures, not
// native visibility, geometry, provider playback or browser acceptance evidence.
async function consumerFixture(change = {}) {
  const visited = [], clicks = [], receipts = [];
  let routeView, mounted, current, transcriptOpen = false, played = false;
  const applies = () => !change.route || current === change.route;
  const attr = (node, name) => {
    if (applies() && node?.type === 'iframe' && name === 'src' && change.src) return change.src;
    if (applies() && node?.type === 'iframe' && name === 'data-video-playback' && change.playback) return change.playback;
    if (applies() && node?.type === 'a' && name === 'href' && change.watchHref) return change.watchHref;
    if (applies() && node?.type === 'a' && name === 'rel' && change.watchRel) return change.watchRel;
    return node?.props?.[name] ?? null;
  };
  function hydrated(value) {
    if (!value || typeof value !== 'object') return value;
    if (Array.isArray(value)) return value.map(hydrated);
    if (value.type === 'authored-site-video') return mounted.view;
    return { ...value, props: { ...value.props, children: hydrated(value.props?.children) } };
  }
  function locator(resolve, selector = 'root') {
    return {
      async count() {
        if (applies() && selector === 'iframe' && !played && change.eagerIframe) return 1;
        if (applies() && selector === '.site-video-player' && change.playerCount !== undefined) return change.playerCount;
        if (applies() && selector === '.site-video-watch-link' && change.internalWatchLeak) return 1;
        if (applies() && selector === ':scope > a[href]' && change.missingSource) return 0;
        if (applies() && selector === '.site-video-play' && played && change.posterRemains) return 1;
        return resolve().length;
      },
      locator(child) { return locator(() => resolve().flatMap(node => selected(node, child)), child); },
      first() { return locator(() => resolve().slice(0, 1), selector); },
      async getAttribute(name) { const found = resolve(); assert.equal(found.length, 1, selector); return attr(found[0], name); },
      async scrollIntoViewIfNeeded() { assert.equal(resolve().length, 1); },
      async evaluate(callback) { assert.equal(resolve().length, 1); return callback({ open: transcriptOpen }); },
      async evaluateAll(callback) { return callback(resolve().map(node => ({ getAttribute: name => attr(node, name) }))); },
      async click() {
        if (selector === 'summary') { transcriptOpen = true; clicks.push([current, 'transcript']); return; }
        assert.equal(selector, '.site-video-play'); assert.equal(resolve().length, 1);
        clicks.push([current, 'play']); mounted.play(); played = true;
      },
      get fixtureVisible() { return resolve().length === 1 && !(applies() && change.hidden); },
    };
  }
  const page = {
    url: () => 'https://synthetic-public.invalid' + routeView.pathname,
    locator(selector) { return locator(() => {
      const raw = selected(routeView.view, selector);
      return raw.map(hydrated);
    }, selector); },
  };
  async function navigate(route) {
    visited.push(route); current = route; transcriptOpen = played = false;
    routeView = await authored.route(route);
    const detail = SERVICE_VIDEO_DETAIL_CASES.find(item => item.route === route);
    const raw = selected(routeView.view, detail.selector); assert.equal(raw.length, 1);
    const player = nodes(raw[0]).filter(node => node.type === 'authored-site-video'); assert.equal(player.length, 1);
    mounted = authored.player(player[0].props);
  }
  const expect = item => ({
    async toHaveCount(count) { assert.equal(await item.count(), count); },
    async toBeVisible() { assert.equal(item.fixtureVisible, true); },
    async toHaveAttribute(name, value) { const actual = await item.getAttribute(name);
      if (value instanceof RegExp) assert.match(actual, value); else assert.equal(actual, value); },
  });
  expect.poll = (read, options) => { assert.deepEqual(options, { timeout: 10000 }); return {
    async toBe(value) { assert.equal(await read(), value, 'Independent playback identity must match'); },
  }; };
  let failure;
  try {
    await runBrowserDetails(page, navigate, expect, assert, SERVICE_VIDEO_DETAIL_CASES, expectedServiceVideoWatchUrl,
      matchesServiceVideoPlayback, withServiceVideoFailureContext, (path, value) => {
        assert.equal(path, '/synthetic-evidence/service-detail-failure.json'); receipts.push(JSON.parse(value));
      }, '/synthetic-evidence');
  } catch (error) { failure = error; }
  return { visited, clicks, receipts, failure };
}

test('actual nine-route browser assertion block accepts authored players with one real Play per route and no success diagnostics', async () => {
  const result = await consumerFixture();
  assert.equal(result.failure, undefined);
  assert.deepEqual(result.visited, expectedRows.map(row => row[0]));
  assert.deepEqual(result.clicks.filter(([, action]) => action === 'play').map(([route]) => route), expectedRows.map(row => row[0]));
  assert.deepEqual(result.receipts, []);
});

for (const [name, change] of [
  ['wrong provider', { src: 'https://www.youtube.com/embed/eLsjFaKCBhI?autoplay=1' }],
  ['wrong public ID', { src: 'https://www.youtube-nocookie.com/embed/Cz6SxXJNZbw?autoplay=1&playsinline=1&rel=0&hl=ru&cc_lang_pref=ru' }],
  ['wrong playback metadata', { playback: 'heygen' }],
  ['eager iframe', { eagerIframe: true }],
  ['duplicate player', { playerCount: 2 }],
  ['missing player', { playerCount: 0 }],
  ['unsafe watch URL', { watchHref: 'https://private.invalid/SECRET' }],
  ['unsafe watch relation', { watchRel: 'opener' }],
  ['poster remains', { posterRemains: true }],
]) test('actual browser consumer rejects ' + name + ' with bounded fatal context', async () => {
  const route = '/ru/services/hypnotherapy-course';
  const result = await consumerFixture({ route, ...change });
  assert.ok(result.failure); assert.equal(result.receipts.length, 1); assert.equal(result.receipts[0].route, route);
  assert.doesNotMatch(JSON.stringify(result.receipts), /SECRET|https?:|private/);
  assert.ok(result.clicks.filter(([path, action]) => path === route && action === 'play').length <= 1);
});
for (const [name, change] of [['in-player offsite link', { internalWatchLeak: true }], ['missing separate source link', { missingSource: true }]]) {
  test('actual browser consumer rejects internalOnly ' + name, async () => {
    const route = '/en/services/free-situation-review';
    const result = await consumerFixture({ route, ...change });
    assert.ok(result.failure); assert.equal(result.receipts.length, 1); assert.equal(result.receipts[0].route, route);
    assert.equal(result.clicks.filter(([path, action]) => path === route && action === 'play').length, 0);
  });
}

test('browser consumer keeps all original journeys and Play actions, fatal teardown and independent helper wiring', () => {
  assert.match(browserSource, /for \(const detail of SERVICE_VIDEO_DETAIL_CASES\)/);
  assert.match(browserSource, /matchesServiceVideoPlayback\(await block\.locator\('iframe'\)\.getAttribute\('src'\), detail\)/);
  const body = browserSource.slice(browserSource.indexOf('    for (const detail of SERVICE_VIDEO_DETAIL_CASES)'), browserSource.indexOf('    // Wu Xing'));
  assert.equal((body.match(/block\.locator\('\.site-video-play'\)\.click\(\)/g) || []).length, 1);
  assert.match(body, /iframe'\)\.count\(\), 0/);
  assert.match(body, /\.site-video-play'\)\.count\(\), 0/);
  assert.match(body, /toHaveAttribute\('data-video-playback', detail.provider\)/);
  assert.match(body, /expectedServiceVideoWatchUrl\(detail\)/);
  assert.doesNotMatch(body, /force:|pause\(|waitForTimeout|route\.fulfill|\.first\(|getAttribute\('src'\).*expected\s*=/);
  assert.match(browserSource, /if \(browser\) await browser.close\(\)/);
  assert.match(browserSource, /if \(app\) app.kill\('SIGTERM'\)/);
  assert.match(browserSource, /if \(server\) server.close\(\)/);
});
