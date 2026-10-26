import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { existingAboutIntroVideo, builtInSiteVideoRecords } from '../lib/site-videos/defaults.js';
import { toPublishedSiteVideo, videoKey } from '../lib/site-videos/model.js';
const component = readFileSync(new URL('../components/psychic-alchemy-intro-video.tsx', import.meta.url), 'utf8');
const page = readFileSync(new URL('../app/[locale]/about/page.tsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../components/psychic-alchemy-intro-video.module.css', import.meta.url), 'utf8');
test('intro uses the archived approved final and a stable embed, not expiring media', () => {
  assert.equal(existingAboutIntroVideo.heygenId, 'fd5fcead9b067f9a0649862675a38771');
  assert.match(component, /https:\/\/app\.heygen\.com\/embeds\//);
  assert.doesNotMatch(component, /Expires=|Signature=|drive\.google\.com|\.mp4\?/);
});
test('player is opt-in, has no autoplay, and is responsive', () => {
  assert.match(component, /useState\(false\)/);
  assert.match(component, /onClick=\{\(\) => setActive\(true\)\}/);
  assert.match(component, /loading="lazy"/);
  assert.doesNotMatch(component, /autoPlay|autoplay[=:;]/);
  assert.match(css, /aspect-ratio: 16 \/ 9/);
  assert.match(css, /max-width: 767px/);
});
test('full methods and CTA remain in transcript, with an AI disclosure', () => {
  for (const text of ['homeopathy with systemic constellations and hypnotherapy', 'patterns in emotions and relationships', 'read the testimonials and leave a request', 'finding new resources and solutions']) assert.ok(existingAboutIntroVideo.transcript.includes(text));
  assert.ok(component.includes('AI-assisted video'));
});
test('EN and RU About intros retain their managed locale bindings', () => {
  assert.deepEqual(builtInSiteVideoRecords().map(record => record.key).sort(), ['about-intro:en', 'about-intro:es', 'about-intro:ru', 'home-intro:en', 'home-intro:ru', 'homeopathy-intro:en', 'homeopathy-intro:ru', 'method-constellations:en', 'method-hypnotherapy:en', 'services-intro:en', 'services-intro:ru']);
  assert.match(page, /videoKey\("about-intro", typedLocale\)/);
  assert.match(page, /typedLocale === "en" && aboutIntro.heygenId === existingAboutIntroVideo.heygenId/);
  assert.match(page, /<PsychicAlchemyIntroVideo video=\{aboutIntro\}/);
  for (const text of ['current.intro.map', 'current.sections.map', 'PersonalConsultationForm locale', 'about-client-cabinet', 'personal-consultation-title']) assert.ok(page.includes(text), text);
});

const testimonials = readFileSync(new URL('../components/personal-testimonials.tsx', import.meta.url), 'utf8');
const nodes = value => value == null || typeof value !== 'object' ? []
  : Array.isArray(value) ? value.flatMap(nodes) : [value, ...nodes(value.props?.children)];
const plain = value => JSON.parse(JSON.stringify(value));
const textOf = value => value == null ? '' : Array.isArray(value) ? value.map(textOf).join(' ')
  : typeof value === 'object' ? textOf(value.props?.children) : String(value);
const hasClass = (node, name) => String(node.props?.className ?? '').split(/\s+/).includes(name);
const forbidden = name => () => { throw new Error('Forbidden About fixture side effect: ' + name); };
const englishReviewIds = ['Dk0LBmOivQo', 'aUJde6A-9p0', 'fE6sD1zr1Js', 'itjo2_z2NGk', '4NrryHcEF1A', 'hYwRNMxIMjc'];
const russianReviewIds = ['MIVLm1GUTtM', 'ttQxUHopaUM', 'VABgpmn4ZYA', 'muOnIHllI7E'];

// Compile the actual route and actual PersonalTestimonials together. Only
// public rendering dependencies are admitted. Forms, header, media playback,
// storage, auth and biography inputs are named inert/synthetic boundaries;
// no Next runtime, provider, database, environment or credential is imported.
async function renderAbout(locale, { pageSource = page, testimonialSource = testimonials, hiddenIntro = false, replacementIntro } = {}) {
  const reads = [];
  const biography = Object.fromEntries(['en', 'ru'].map(language => [language, {
    photoAlt: language + ' synthetic portrait', eyebrow: language + ' synthetic eyebrow',
    intro: [language + ' biography intro one', language + ' biography intro two'],
    sections: [{ heading: language + ' biography heading', items: [language + ' biography item'], paragraphs: [language + ' biography paragraph'] }],
    explore: { heading: language + ' explore', links: [{ href: '/' + language + '/synthetic-explore', label: language + ' explore link' }] },
    cabinet: { heading: language + ' cabinet', body: language + ' cabinet body', prompt: language + ' cabinet prompt', href: '/' + language + '/synthetic-cabinet-entry', action: language + ' cabinet action' },
  }]));
  const jsx = (type, props = {}) => typeof type === 'function' ? type(props) : { type, props };
  const inert = type => props => jsx(type, props);
  const context = vm.createContext({
    URL, Set, Map, fetch: forbidden('fetch'), WebSocket: forbidden('WebSocket'),
    process: undefined, window: undefined, setTimeout: forbidden('timer'),
  });
  const modules = {
    'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'fragment' },
    'next/link': { __esModule: true, default: inert('a') },
    'next/navigation': { notFound: forbidden('notFound') },
    'lucide-react': { ArrowRight: () => null, Quote: () => null },
    '@/components/static-portrait': { StaticPortrait: inert('inert-portrait') },
    '@/components/public-site-header': { PublicSiteHeader: inert('inert-public-header') },
    '@/components/personal-consultation-form': { PersonalConsultationForm: inert('inert-consultation-form') },
    '@/components/page-video': { PageVideo: inert('inert-page-video') },
    '@/components/psychic-alchemy-intro-video': { PsychicAlchemyIntroVideo: inert('inert-psychic-intro') },
    '@/components/site-video-player': { SiteVideoPlayer: inert('inert-public-player') },
    '@/components/home-testimonial-more': { HomeTestimonialMore: inert('inert-home-testimonial-more') },
    './personal-testimonials.module.css': { __esModule: true, default: new Proxy({}, { get: (_, key) => String(key) }) },
    '@/lib/site-videos/defaults': { existingAboutIntroVideo },
    '@/lib/site-videos/model': { videoKey },
    '@/lib/site-videos/public': { getPublishedSiteVideo: async key => {
      reads.push(key);
      if (hiddenIntro) return undefined;
      return replacementIntro ?? toPublishedSiteVideo(builtInSiteVideoRecords().find(record => record.key === key));
    } },
    '@/data/about-biography': { aboutBiography: biography },
    '@/data/remedies': { isSupportedLocale: value => ['en', 'ru'].includes(value), getHomeopathyLocaleParams: () => [{ locale: 'en' }, { locale: 'ru' }] },
    '@/data/site-metadata': { metadataBaseFor: () => new URL('https://synthetic-about.invalid') },
  };
  function compile(source, path) {
    const exports = {};
    const code = ts.transpileModule(source, { fileName: path, compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true,
    } }).outputText;
    const execute = vm.runInContext(`(function(exports, require) { ${code}\n})`, context, { filename: path });
    execute(exports, name => {
      assert.ok(Object.hasOwn(modules, name), 'Unapproved About fixture dependency: ' + name);
      return modules[name];
    });
    return exports;
  }
  const actualTestimonials = compile(testimonialSource, 'components/personal-testimonials.tsx');
  modules['@/components/personal-testimonials'] = { ...actualTestimonials, PersonalTestimonials(props) {
    // Observe the real route invocation, then delegate without altering props
    // or substituting markup. Missing locale is a precise binding failure,
    // not an incidental TypeError from the component's locale-indexed data.
    assert.equal(props.locale, locale, 'Testimonials receive the route locale');
    return actualTestimonials.PersonalTestimonials(props);
  } };
  const route = compile(pageSource, 'app/[locale]/about/page.tsx');
  return { tree: await route.default({ params: Promise.resolve({ locale }) }), reads, biography: biography[locale] };
}

async function assertAboutComposition(locale, options = {}) {
  const { tree, reads, biography } = await renderAbout(locale, options);
  const all = nodes(tree);
  assert.deepEqual(reads, ['about-intro:' + locale], 'Read only the managed locale intro');
  assert.equal(tree.type, 'main');
  assert.equal(tree.props.lang, locale, 'About document locale');
  const section = all.filter(node => node.props?.['data-personal-testimonials'] === 'about');
  assert.equal(section.length, 1, 'One actual About testimonial section, not a stub or another variant');
  assert.equal(section[0].props.lang, locale, 'Testimonials receive the route locale');
  assert.equal(section[0].props.id, 'about-testimonials');
  assert.equal(section[0].props['aria-labelledby'], 'testimonials-title', 'About accessible title binding');
  const reviewNodes = nodes(section[0]);
  assert.equal(reviewNodes.filter(node => node.type === 'h2' && node.props.id === 'testimonials-title').length, 1, 'Rendered About testimonial heading');
  const expectedIds = locale === 'ru' ? [...russianReviewIds, ...englishReviewIds] : [...englishReviewIds, ...russianReviewIds];
  const cards = reviewNodes.filter(node => node.props?.['data-testimonial-video-id']);
  assert.deepEqual(cards.map(node => node.props['data-testimonial-video-id']), expectedIds, 'Exact authored, matching-poster About review identities and locale-first order');
  for (const [index, card] of cards.entries()) {
    const players = nodes(card).filter(node => node.type === 'inert-public-player');
    assert.equal(players.length, 1, 'Each review has exactly one player');
    const props = players[0].props;
    assert.equal(props.video.youtubeId, expectedIds[index], 'Review card and player source IDs agree');
    assert.equal(props.video.language, englishReviewIds.includes(expectedIds[index]) ? 'en' : 'ru', 'Original published audio language');
    assert.equal(props.locale, locale, 'Review player UI follows the route locale');
    assert.equal(props.compact, true);
    assert.equal(props.minimal, true, 'Preserve the authored About minimal player');
    assert.equal(props.internalOnly, true, 'Preserve the authored About internal-only boundary');
    assert.equal(props.fallbackPoster, '/images/holistic-house/testimonial-posters/' + expectedIds[index] + '.webp', 'Poster must match the actual review source');
  }
  const introduction = all.find(node => hasClass(node, 'about-introduction'));
  assert.ok(introduction, 'Biography introduction remains');
  for (const value of biography.intro) assert.ok(textOf(introduction).includes(value), 'Every biography introduction paragraph remains');
  const article = all.find(node => hasClass(node, 'about-biography'));
  assert.ok(article, 'Biography sections remain');
  for (const item of biography.sections) for (const value of [item.heading, ...item.items, ...item.paragraphs]) assert.ok(textOf(article).includes(value), 'Every biography section/item/paragraph remains');
  const forms = all.filter(node => node.type === 'inert-consultation-form');
  assert.equal(forms.length, 1, 'One consultation form boundary');
  assert.equal(forms[0].props.locale, locale);
  assert.equal(forms[0].props.onSiteContact, true);
  assert.equal(all.filter(node => node.type === 'h2' && node.props.id === 'personal-consultation-title').length, 1, 'Consultation heading remains');
  const cabinet = all.find(node => hasClass(node, 'about-client-cabinet'));
  assert.ok(cabinet, 'Client cabinet remains');
  assert.ok(nodes(cabinet).some(node => node.type === 'a' && node.props.href === '/' + locale + '/client'), 'Locale-bound cabinet login remains');
  assert.ok(nodes(cabinet).some(node => node.type === 'a' && node.props.href === biography.cabinet.href), 'Biography cabinet entry remains');
  const managed = all.filter(node => node.type === 'inert-psychic-intro' || node.props?.['data-video-slot'] === 'about-intro');
  if (options.hiddenIntro) assert.equal(managed.length, 0, 'Missing publication stays hidden');
  else {
    assert.equal(managed.length, 1, 'Exactly one managed About intro');
    const expected = options.replacementIntro ?? toPublishedSiteVideo(builtInSiteVideoRecords().find(record => record.key === 'about-intro:' + locale));
    if (locale === 'en' && expected.heygenId === existingAboutIntroVideo.heygenId) {
      assert.equal(managed[0].type, 'inert-psychic-intro', 'Only the approved English intro uses the specialized renderer');
      assert.deepEqual(plain(managed[0].props.video), expected);
    } else {
      assert.equal(managed[0].props['data-video-locale'], locale);
      const player = nodes(managed[0]).filter(node => node.type === 'inert-public-player');
      assert.equal(player.length, 1);
      assert.deepEqual(plain(player[0].props.video), expected, 'Managed replacement reaches the public player unchanged');
      assert.equal(player[0].props.locale, locale);
      assert.equal(player[0].props.internalOnly, true);
    }
  }
}

for (const locale of ['en', 'ru']) {
  test(locale + ' real About route composes the actual testimonial variant and preserves all original page sections', () => assertAboutComposition(locale));
  test(locale + ' unpublished managed intro stays hidden without removing other About sections', () => assertAboutComposition(locale, { hiddenIntro: true }));
}
test('English managed replacement selects the generic public player rather than the archived specialized intro', () => assertAboutComposition('en', {
  replacementIntro: { youtubeId: 'OkLEN8Zb-sY', title: 'Synthetic reviewed replacement', language: 'en' },
}));

function changed(source, before, after) {
  assert.equal(source.split(before).length - 1, 1, 'Counterfactual targets exactly one authored expression: ' + before);
  return source.replace(before, after);
}
for (const [name, target, before, after, reason] of [
  ['missing testimonial composition', 'pageSource', '<PersonalTestimonials locale={typedLocale} variant="about" />', '', /One actual About testimonial section/],
  ['wrong testimonial variant', 'pageSource', '<PersonalTestimonials locale={typedLocale} variant="about" />', '<PersonalTestimonials locale={typedLocale} variant="home" />', /One actual About testimonial section/],
  ['missing testimonial variant', 'pageSource', '<PersonalTestimonials locale={typedLocale} variant="about" />', '<PersonalTestimonials locale={typedLocale} />', /One actual About testimonial section/],
  ['wrong testimonial locale', 'pageSource', '<PersonalTestimonials locale={typedLocale} variant="about" />', '<PersonalTestimonials locale="en" variant="about" />', /Testimonials receive the route locale/],
  ['missing testimonial locale', 'pageSource', '<PersonalTestimonials locale={typedLocale} variant="about" />', '<PersonalTestimonials variant="about" />', /Testimonials receive the route locale/],
  ['missing rendered testimonial list', 'testimonialSource', '{renderVideoCards(visibleVideos, isFullArchive)}', '{null}', /Exact authored/],
  ['wrong accessible title', 'testimonialSource', 'isAbout ? "testimonials-title"', 'isAbout ? "wrong-testimonials-title"', /About accessible title binding/],
  ['wrong public player identity', 'testimonialSource', 'video={{ youtubeId: item.id,', 'video={{ youtubeId: "OkLEN8Zb-sY",', /card and player source IDs agree/],
  ['changed original audio language', 'testimonialSource', 'language: item.language, title: item.title', 'language: "es", title: item.title', /Original published audio language/],
  ['external-only policy drift', 'testimonialSource', 'internalOnly={isAbout}', 'internalOnly={false}', /internal-only boundary/],
  ['missing biography introduction', 'pageSource', '{current.intro.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}', '{null}', /Every biography introduction paragraph/],
  ['missing consultation form', 'pageSource', '<PersonalConsultationForm locale={typedLocale} onSiteContact />', '', /One consultation form boundary/],
  ['wrong cabinet locale', 'pageSource', 'href={"/" + typedLocale + "/client"}', 'href="/wrong/client"', /Locale-bound cabinet login/],
  ['wrong managed intro slot', 'pageSource', 'videoKey("about-intro", typedLocale)', 'videoKey("home-intro", typedLocale)', /Read only the managed locale intro/],
]) test('About counterfactual rejects ' + name, async () => {
  const input = changed(target === 'pageSource' ? page : testimonials, before, after);
  await assert.rejects(assertAboutComposition('ru', { [target]: input }), error => error.code === 'ERR_ASSERTION' && reason.test(error.message));
});
