import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

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


// Exercise the actual route and shared landing without loading Next, React or enquiry code.
const daoRoutePath = 'app/[locale]/services/dao-health-profile/page.tsx';
const daoRouteSource = read(daoRoutePath);
const freeEntrySource = read('components/free-entry-landing.tsx');
const daoTitles = {
  en: 'Explore your inner resources through Wu Xing.',
  ru: 'Исследуйте свои внутренние ресурсы через У-Син.',
  es: 'Explora tus recursos interiores con Wu Xing.',
};

function loadDaoSource(source, fileName, modules) {
  const compiled = ts.transpileModule(source, { fileName, reportDiagnostics: true,
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } });
  assert.equal((compiled.diagnostics ?? []).filter(item => item.category === ts.DiagnosticCategory.Error).length, 0,
    'DAO source must transpile before its route contract is exercised');
  const exports = {};
  runInNewContext(compiled.outputText, { exports, require(name) {
    assert.ok(Object.hasOwn(modules, name), 'DAO source must only use audited synthetic imports: ' + name);
    return modules[name];
  } }, { filename: fileName, timeout: 1000 });
  return exports;
}

function daoNodes(tree) {
  if (!tree || typeof tree !== 'object') return [];
  if (Array.isArray(tree)) return [...tree].flatMap(daoNodes);
  return [tree, ...daoNodes(tree.props?.children)];
}

async function assertDaoLandingContract(routeSource = daoRouteSource, landingSource = freeEntrySource) {
  const jsx = (type, props) => ({ type, props: props ?? {} });
  const sentinel = name => Object.assign(() => assert.fail('Do not execute real child modules: ' + name), { fixtureName: name });
  const Link = sentinel('Link');
  const Enquiry = sentinel('FreeResourceEnquiry');
  const SituationForm = sentinel('FreeSituationReviewForm');
  const Header = sentinel('PublicSiteHeader');
  const landing = loadDaoSource(landingSource, 'free-entry-landing.tsx', {
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'next/image': { default: sentinel('Image') },
    'next/link': { default: Link },
    'lucide-react': Object.fromEntries(['ArrowLeft', 'ArrowRight', 'CheckCircle2', 'ShieldCheck', 'Sparkles'].map(name => [name, sentinel(name)])),
    '@/components/public-site-header': { PublicSiteHeader: Header },
    '@/components/free-resource-enquiry': { FreeResourceEnquiry: Enquiry },
    '@/components/free-situation-review-form': { FreeSituationReviewForm: SituationForm },
    '@/components/service-video-showcase': { ServiceVideoShowcase: sentinel('ServiceVideoShowcase') },
    '@/components/personal-testimonials': { PersonalTestimonials: sentinel('PersonalTestimonials') },
    './free-entry-landing.module.css': { default: new Proxy({}, { get: (_, name) => String(name) }) },
  });
  assert.equal(typeof landing.FreeEntryLanding, 'function', 'Use the actual exported shared FreeEntryLanding');
  const invalidLocale = new Error('synthetic DAO notFound');
  const route = loadDaoSource(routeSource, daoRoutePath, {
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'next/navigation': { notFound() { throw invalidLocale; } },
    '@/components/free-entry-landing': landing,
    '@/data/academy/catalog': { isPublicLocale: locale => Object.hasOwn(daoTitles, locale) },
    '@/data/site-metadata': { metadataBaseFor: () => new URL('https://synthetic.example') },
  });
  assert.equal(typeof route.default, 'function', 'DAO page must keep its default route export');
  assert.equal(typeof route.generateMetadata, 'function', 'DAO page must keep localized route metadata');
  for (const locale of Object.keys(daoTitles)) {
    const page = await route.default({ params: Promise.resolve({ locale }) });
    assert.equal(page?.type, landing.FreeEntryLanding, 'DAO route must render its imported real FreeEntryLanding');
    assert.equal(page.props.kind, 'dao', 'DAO route must pass the exact DAO kind');
    assert.equal(page.props.locale, locale, 'DAO route must forward the requested locale');
    const metadata = await route.generateMetadata({ params: Promise.resolve({ locale }) });
    assert.equal(metadata.alternates?.canonical, '/' + locale + '/services/dao-health-profile', 'DAO route must keep its exact canonical destination');
    assert.equal(metadata.openGraph?.url, '/' + locale + '/services/dao-health-profile', 'DAO route must keep its exact share destination');
    for (const language of Object.keys(daoTitles)) {
      assert.equal(metadata.alternates?.languages?.[language], '/' + language + '/services/dao-health-profile', 'DAO route must keep every localized alternate');
    }
    assert.equal(metadata.alternates?.languages?.['x-default'], '/en/services/dao-health-profile', 'DAO route must keep its English default alternate');
    const tree = page.type(page.props);
    const elements = daoNodes(tree);
    assert.equal(tree.type, 'main', 'DAO shared landing must render the real main landmark');
    assert.equal(tree.props.lang, locale, 'DAO shared landing must preserve the route locale');
    assert.equal(tree.props['data-free-entry-landing'], 'dao', 'DAO shared landing must expose its actual kind');
    const headings = elements.filter(node => node.type === 'h1');
    assert.equal(headings.length, 1, 'DAO shared landing must expose one real primary heading');
    assert.equal(headings[0].props.id, 'free-entry-title', 'DAO shared landing must retain its destination heading marker');
    assert.equal(headings[0].props.children, daoTitles[locale], 'DAO heading must select the requested locale and DAO copy');
    const headers = elements.filter(node => node.type === Header);
    assert.equal(headers.length, 1, 'DAO landing must retain its public header');
    assert.equal(headers[0].props.locale, locale, 'DAO header must preserve the route locale');
    const capture = elements.filter(node => node.type === 'section' && node.props.id === 'request-free-wu-xing');
    assert.equal(capture.length, 1, 'DAO landing must retain its real Wu Xing capture section');
    assert.equal(capture[0].props['aria-labelledby'], 'free-capture-title', 'DAO capture must retain its accessible heading binding');
    assert.equal(elements.filter(node => node.type === 'a' && node.props.href === '#request-free-wu-xing').length, 1,
      'DAO primary action must target its own capture section');
    const enquiries = daoNodes(capture[0]).filter(node => node.type === Enquiry);
    assert.equal(enquiries.length, 1, 'DAO capture must render the real enquiry import once');
    assert.equal(enquiries[0].props.kind, 'dao', 'DAO enquiry must retain the exact DAO kind');
    assert.equal(enquiries[0].props.locale, locale, 'DAO enquiry must retain the requested locale');
    assert.equal(elements.filter(node => node.type === SituationForm).length, 0, 'DAO must not render the situation-only questionnaire');
    const modelLinks = elements.filter(node => node.type === Link && node.props.href === '/' + locale + '/wu-xing');
    assert.equal(modelLinks.length, 1, 'DAO model link must preserve its localized destination');
    assert.equal(modelLinks[0].props.prefetch, false, 'DAO model link must preserve explicit no-prefetch navigation');
  }
  await assert.rejects(route.default({ params: Promise.resolve({ locale: 'not-a-public-locale' }) }),
    error => error === invalidLocale, 'DAO route must reject an unsupported locale before rendering');
}

const daoSourceMutations = [
  ['wrong canonical route', 'route', 'canonical: "/" + locale + "/services/dao-health-profile"', 'canonical: "/" + locale + "/services/free-situation-review"', 'DAO route must keep its exact canonical destination'],
  ['wrong route kind', 'route', 'kind="dao"', 'kind="situation"', 'DAO route must pass the exact DAO kind'],
  ['wrong route locale', 'route', '<FreeEntryLanding locale={locale}', '<FreeEntryLanding locale="en"', 'DAO route must forward the requested locale'],
  ['unbound route import', 'route', 'from "@/components/free-entry-landing"', 'from "@/components/core-service-detail"', 'DAO source must only use audited synthetic imports'],
  ['unrendered imported component', 'route', 'return <FreeEntryLanding locale={locale} kind="dao" />;', 'const unused = <FreeEntryLanding locale={locale} kind="dao" />; return <main />;', 'DAO route must render its imported real FreeEntryLanding'],
  ['missing default route export', 'route', 'export default async function WuXingProfilePage', 'export async function WuXingProfilePage', 'DAO page must keep its default route export'],
  ['missing locale rejection', 'route', 'if (!isPublicLocale(locale)) notFound();', '', 'DAO route must reject an unsupported locale before rendering'],
  ['wrong shared kind marker', 'landing', 'data-free-entry-landing={kind}', 'data-free-entry-landing="situation"', 'DAO shared landing must expose its actual kind'],
  ['wrong shared language', 'landing', 'lang={locale}', 'lang="en"', 'DAO shared landing must preserve the route locale'],
  ['wrong shared copy selection', 'landing', 'const t = copy[locale][kind];', 'const t = copy[locale].situation;', 'DAO heading must select the requested locale and DAO copy'],
  ['missing destination heading', 'landing', 'id="free-entry-title"', 'id="unrelated-title"', 'DAO shared landing must retain its destination heading marker'],
  ['wrong capture section', 'landing', 'id={captureId}', 'id="request-free-review"', 'DAO landing must retain its real Wu Xing capture section'],
  ['wrong capture action', 'landing', 'href={"#" + captureId}', 'href="#request-free-review"', 'DAO primary action must target its own capture section'],
  ['wrong enquiry kind', 'landing', '<FreeResourceEnquiry locale={locale} kind={kind}', '<FreeResourceEnquiry locale={locale} kind="situation"', 'DAO enquiry must retain the exact DAO kind'],
  ['wrong enquiry locale', 'landing', '<FreeResourceEnquiry locale={locale} kind={kind}', '<FreeResourceEnquiry locale="en" kind={kind}', 'DAO enquiry must retain the requested locale'],
  ['wrong model destination', 'landing', 'kind === "dao" ? "/" + locale + "/wu-xing"', 'kind === "dao" ? "/" + locale + "/about"', 'DAO model link must preserve its localized destination'],
  ['eager model prefetch', 'landing', '<Link href={detailHref} prefetch={false}', '<Link href={detailHref} prefetch={true}', 'DAO model link must preserve explicit no-prefetch navigation'],
];
for (const [name, target, before, after, diagnostic] of daoSourceMutations) {
  test('DAO source contract rejects ' + name, async () => {
    await assertDaoLandingContract();
    const source = target === 'route' ? daoRouteSource : freeEntrySource;
    assert.ok(source.includes(before), 'Require the exact source mutation anchor: ' + name);
    const changed = source.replace(before, after);
    await assert.rejects(assertDaoLandingContract(target === 'route' ? changed : daoRouteSource,
      target === 'landing' ? changed : freeEntrySource), error => error?.code === 'ERR_ASSERTION' && error.message.includes(diagnostic));
  });
}

test('remaining free-entry targets still match actual homepage links and destination markup', async () => {
  const capture = read('components/homepage-free-capture.tsx');
  for (const suffix of ['/client/tests', '/services/free-situation-review', '/academy/principles-of-energywork/learn']) {
    assert.ok(capture.includes('`/${locale}' + suffix + '`'));
    assert.ok(verifier.includes("'" + suffix + "'"));
  }
  assert.match(read('app/[locale]/services/free-situation-review/page.tsx'), /<FreeEntryLanding locale=\{locale\} kind="situation" \/>/);
  assert.match(read('components/free-entry-landing.tsx'), /<h1 id="free-entry-title">\{t\.title\}<\/h1>/);
  await assertDaoLandingContract();
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

test('poster reconciliation preserves held-RSC, readability, first playback, Back, no-write and full journey gates', () => {
  for (const required of [
    "await perform('gate', () => gate);", 'await expect(next).toHaveCount(0)', 'frame.evaluate(element => element.isConnected)',
    'size.height >= 46 && size.font >= 14', 'const firstReview = await verifyHomeTestimonialPosters(page)',
    "await firstReview.locator('button.site-video-play').click()", 'youtube-nocookie\\.com\\/embed\\/Dk0LBmOivQo\\?',
    "await expect(firstReview.locator('.site-video-fallback-poster')).toHaveCount(0)",
    'await page.goBack()', 'await expect(page).toHaveURL(origin + homePath(locale))',
    'assert.deepEqual(unexpectedApiRequests, []', "request.method() === 'GET'", 'APP_UNAVAILABLE',
    'results.filter(result => result.firstClickRetained).length, 8', 'results.filter(result => result.freeJourney).length, 24',
    'await exerciseFreeJourneys(page, engine, width)', 'assert.deepEqual(errors, [])',
  ]) assert.ok(verifier.includes(required), required);
  assert.doesNotMatch(verifier, /videoPosters\)\.toHaveCount\(6\)|test\.skip|test\.only|test\.todo/);
});

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
