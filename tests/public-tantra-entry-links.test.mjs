import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
import * as presets from '../lib/inner-growth/course-presets.js';
import * as energywork from '../data/academy/energywork-ai-schema.js';

const require = createRequire(import.meta.url);
const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const empty = () => null;
const denied = () => assert.fail('No private requests, enrollment, browser navigation or effects in this fixture');
const anchor = ({ prefetch, ...props }) => React.createElement('a', props);
const styles = new Proxy({}, { get: (_target, key) => String(key) });

// Render the real page components, stubbing unrelated child UI and framework
// hooks so these checks need neither a server nor external data or requests.
function loadComponent(path, imports) {
  const compiled = ts.transpileModule(read(path), {
    fileName: path,
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const exports = {};
  runInNewContext(compiled, {
    exports, fetch: denied, XMLHttpRequest: denied, WebSocket: denied,
    require(name) {
      if (name === 'react/jsx-runtime') return require(name);
      if (Object.hasOwn(imports, name)) return imports[name];
      throw new Error('Unexpected dependency in ' + path + ': ' + name);
    },
  });
  return exports;
}

const publicArtwork = loadComponent('lib/public-card-artwork.ts', { '@/data/public-card-artwork-urls.json': JSON.parse(read('data/public-card-artwork-urls.json')) });
const shared = {
  react: React,
  '@/lib/public-card-artwork': publicArtwork,
  'next/link': anchor,
  'next/image': empty,
  'lucide-react': { Archive: empty, BookOpen: empty, BookOpenCheck: empty, CalendarDays: empty, LockKeyhole: empty, MapPin: empty, Search: empty, ArrowUpRight: empty, FileText: empty, ClipboardCheck: empty, GraduationCap: empty, ChevronRight: empty, BriefcaseBusiness: empty, Flower2: empty, Sparkles: empty, ArrowRight: empty, ChevronLeft: empty, ChevronDown: empty, ShieldCheck: empty, Target: empty },
  '@/components/static-portrait': { StaticPortrait: empty },
  '@/components/public-site-header': { PublicSiteHeader: empty },
};
shared['@/components/discovery-section-tabs']=loadComponent('components/discovery-section-tabs.tsx',{'next/link':anchor,'./discovery-section-tabs.module.css':{}});
const freePaths = loadComponent('components/home-free-paths.tsx', {
  ...shared,
  '@/components/acquisition-event-link': { AcquisitionEventLink: anchor },
  './home-free-paths.module.css': {},
}).HomeFreePaths;
shared['@/components/home-free-paths'] = { HomeFreePaths: freePaths };
// Current Home children are evaluated unchanged; only inactive external-operation
// boundaries are denied. The anonymous context contains no account or report.
shared['@/components/home-section-carousel'] = loadComponent('components/home-section-carousel.tsx', {
  ...shared, react: React, './services-conversion-hero.module.css': styles,
});
shared['@/components/home-more-disclosure'] = loadComponent('components/home-more-disclosure.tsx', {
  ...shared, react: React, './home-more-disclosure.module.css': styles,
  'next/dynamic': (_loader, options) => { assert.equal(options.ssr, false); return denied; },
});
shared['@/components/home-featured-workspace'] = loadComponent('components/home-featured-workspace.tsx', {
  ...shared, react: React, './home-featured-workspace.module.css': styles,
  '@/components/home-personal-space': { useHomePersonalSpace: () => null },
});
shared['@/components/personal-testimonials'] = { PersonalTestimonials: empty };

const home = loadComponent('components/holistic-house-home.tsx', {
  ...shared,
  '@/components/acquisition-event-link': { AcquisitionEventLink: anchor },
  '@/components/homepage-contact-cta': { HomepageContactCta: empty },
  '@/components/services-solutions': { ServicesSolutions: empty },
  '@/components/homepage-topic-journeys': { HomepageTopicJourneys: empty },
  '@/components/home-free-tests-banner': { HomeFreeTestsBanner: empty },
  '@/components/personal-testimonials': { PersonalTestimonials: empty },
  '@/components/site-navigation': { SiteNavigation: empty },
  '@/components/sitewide-antistress-banner': { TestSelectionCourseBanner: empty },
  '@/data/local-acquisition': { LOCAL_ACQUISITION: Object.fromEntries(['en', 'ru'].map((locale) => [locale, {
    hero: { eyebrow: 'Holistic House', servicesLabel: 'Services' },
    selfCheck: { href: `/${locale}/tests` },
    practitioner: { href: `/${locale}/about` },
  }])) },
}).HolisticHouseHome;
const spanishHome = loadComponent('app/es/page.tsx', {
  ...shared,
  '@/components/acquisition-event-link': { AcquisitionEventLink: anchor },
  '@/components/site-video-player': { SiteVideoPlayer: ({ video }) => React.createElement('span', { 'data-video-id': video.youtubeId }) },
  '@/components/public-consultation-cta': { PublicConsultationCta: empty },
  '@/lib/spanish-metadata': { spanishMetadata: empty },
}).default;
// Render the real interactive Academy hero, including its localized links and
// initial unfiltered program choices. React hooks work in server rendering.
const courseCards = loadComponent('components/academy-course-card-list.tsx', {
  ...shared, react: React, './academy-course-card-list.module.css': styles,
});
const myCourses = loadComponent('components/academy-my-courses.tsx', {
  ...shared, react: React, '@/lib/app/client-fetch': { appFetch: denied },
  '@/lib/inner-growth/course-presets': presets, '@/data/academy/energywork-ai-schema': energywork,
  './academy-my-courses.module.css': styles,
});
const academyCatalog = loadComponent('data/academy/catalog.ts', Object.fromEntries([
  'sources', 'media', 'psimaster-sources', 'psimaster-media', 'psimaster-supplemental-media',
  'psimaster-translations', 'legacy-translations', 'tantra-reiki-full',
].map(name => ['./' + name + '.generated.json', JSON.parse(read('data/academy/' + name + '.generated.json'))])));
const academyDiscovery = loadComponent('components/academy-discovery.tsx', {
  ...shared,
  react: React,
  'lucide-react': { ...shared['lucide-react'], ChevronDown: empty, Search: empty },
  '@/components/academy-course-card-list': courseCards,
  '@/components/academy-my-courses': myCourses,
  './academy-discovery.module.css': {},
}).AcademyDiscovery;
const academy = loadComponent('components/academy-hub.tsx', {
  ...shared,
  '@/components/academy-discovery': { AcademyDiscovery: academyDiscovery },
  '@/components/academy-video-courses': { AcademyVideoCourses: empty },
  '@/components/academy-course-capture': { AcademyCourseCapture: empty },
  '@/components/academy-free-course-banner': { AcademyFreeCourseBanner: empty },
  '@/data/academy/catalog': academyCatalog,
  '@/lib/academy/reiki-free-course': loadComponent('lib/academy/reiki-free-course.ts', {}),
  '@/data/public-events': loadComponent('data/public-events.ts', {}),
  '@/data/academy/psimaster-media.generated.json': JSON.parse(read('data/academy/psimaster-media.generated.json')),

}).AcademyHub;

const links = html => [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)].map(([, attrs, content]) => ({
  href: attrs.match(/\bhref="([^"]+)"/)?.[1],
  label: attrs.match(/\baria-label="([^"]+)"/)?.[1],
  text: content.replace(/<[^>]+>/g, ''), attrs,
}));
const renderLinks = (component, props) => links(renderToStaticMarkup(React.createElement(component, props)));
const courseLabels = { en: /Tantra Reiki.*Level 1/, ru: /Тантра Рейки.*1.*ступен/, es: /Tantra Reiki.*Nivel 1/ };
function assertLearningPath(homeHtml, academyHtml, locale) {
  // Current Home intentionally has no direct Tantra card. Public discovery now
  // proceeds via the Academy, not a fabricated preserved one-click shortcut.
  const homeLinks = links(homeHtml), destination = `/${locale}/academy`;
  const academyEntry = homeLinks.filter(link => /data-home-offer-primary="academy"/.test(link.attrs));
  assert.equal(academyEntry.length, 1, 'One actual Home Academy entry');
  assert.equal(academyEntry[0].href, destination, 'Home Academy destination remains exactly localized');
  const tantraPath = `/${locale}/academy/reiki/tantra-reiki/free-initiation`;
  const card = academyHtml.match(/<article[^>]*data-academy-course-card="academy-free-tantra-introduction"[^>]*>([\s\S]*?)<\/article>/)?.[1];
  assert.ok(card, 'The actual Academy Tantra card remains present');
  const landing = links(card).filter(link => link.href === tantraPath);
  assert.equal(landing.length, 2, 'Actual Tantra card retains public photo and detail links');
  assert.match(landing.find(link => link.label)?.label || '', courseLabels[locale], 'Public Tantra entry has its localized accessible name');
  assert.ok(links(card).some(link => link.href === '/en/academy/principles-of-energywork/learn'), 'Separate free-course destination is preserved, not followed or enrolled');
  assert.ok(homeLinks.some(link => link.href === `/${locale}/services/free-situation-review`), 'Free written-review option stays reachable');
}
for (const locale of ['en', 'ru', 'es']) {
  test(`${locale} current Home links through the actual Academy to the public Tantra introduction`, () => {
    const homeHtml = renderToStaticMarkup(React.createElement(locale === 'es' ? spanishHome : home, { locale }));
    const academyHtml = renderToStaticMarkup(React.createElement(academy, { locale, view: 'programs' }));
    assertLearningPath(homeHtml, academyHtml, locale);
    for (const [name, before, after] of [
      ['missing Home Academy entry', 'data-home-offer-primary="academy"', 'data-retired-offer="academy"'],
      ['wrong Home Academy destination', `href="/${locale}/academy"`, 'href="/wrong"'],
    ]) {
      assert.ok(homeHtml.includes(before), name + ' mutation anchor');
      assert.throws(() => assertLearningPath(homeHtml.replaceAll(before, after), academyHtml, locale), /Home Academy/, name);
    }
    for (const [name, before, after] of [
      ['missing Tantra card', 'data-academy-course-card="academy-free-tantra-introduction"', 'data-retired-card="tantra"'],
      ['wrong Tantra destination', `href="/${locale}/academy/reiki/tantra-reiki/free-initiation"`, 'href="/wrong"'],
    ]) {
      assert.ok(academyHtml.includes(before), name + ' mutation anchor');
      assert.throws(() => assertLearningPath(homeHtml, academyHtml.replaceAll(before, after), locale), /Tantra/, name);
    }
  });
  test(`${locale} Academy retains the independent full Tantra programme and video archive`, () => {
    const cards = renderLinks(academy, { locale, view: 'programs' });
    assert.ok(cards.some(link => link.href === `/${locale}/academy/reiki/tantra-reiki`));
    assert.ok(renderLinks(academy, { locale, view: 'videos' }).some(link => link.href === `/${locale}/academy`));
  });
}

for (const locale of ['en', 'ru', 'es']) {
  test(`${locale} inline course CTA preserves its quick-entry route and discloses any English fallback`, () => {
    const banner = loadComponent('components/sitewide-antistress-banner.tsx', {
      ...shared,
      'next/navigation': { usePathname: () => `/${locale}/academy` },
      './sitewide-antistress-banner.module.css': {},
    }).TestSelectionCourseBanner;
    const pageLinks = renderLinks(banner, { locale });
    const target = locale === 'es' ? 'en' : locale;
    const cta = pageLinks.find((link) => link.href === `/${target}/app/course?program=stress&amp;entry=quick`);
    assert.ok(cta);
    assert.equal(cta.text, { en: 'Start the free course', ru: 'Пройти курс бесплатно', es: 'Empezar el curso en inglés' }[locale]);
    assert.ok(pageLinks.some((link) => link.href === `/${locale}/courses/antistress`));
  });
}

for (const locale of ['en', 'ru', 'es']) {
  test(`${locale} retains the approved screenshot banner with free-review links on both sides`, () => {
    const banner = loadComponent('components/sitewide-antistress-banner.tsx', {
      ...shared,
      'next/navigation': { usePathname: () => `/${locale}/academy` },
      './sitewide-antistress-banner.module.css': {},
    }).SitewideAntistressBanner;
    const pageLinks = renderLinks(banner, { initialLocale: locale });
    assert.deepEqual(pageLinks.map((link) => link.href), [
      `/${locale}/services/free-situation-review`,
      `/${locale}/services/free-situation-review`,
    ]);
    assert.match(pageLinks[1].text, {
      en: /Get free review/,
      ru: /Получить разбор/,
      es: /Solicitar gratis/,
    }[locale]);
  });
}


test('Home retains server-provided intro content and consultation CTA after contextual link addition', () => {
  for (const locale of ['en', 'ru']) {
    const html = renderToStaticMarkup(React.createElement(home, { locale, introVideoContent: React.createElement('section', { 'data-streamed-intro': 'preserved' }, 'Original intro') }));
    assert.match(html, /data-streamed-intro="preserved"/);
    assert.ok(links(html).some((link) => link.href === `/${locale}/services#consultation`));
  }
  assert.ok(renderLinks(spanishHome, {}).some((link) => link.href === '/es/services#consultation'));
});

test('Spanish Home keeps its current public sections, not retired learning/video cards', () => {
  const html = renderToStaticMarkup(React.createElement(spanishHome));
  assert.match(html, /data-home-section-carousel/);
  assert.match(html, /data-home-topic-filters/);
  assert.match(html, /data-home-featured-workspace/);
  for (const path of ['/es/academy', '/es/books', '/es/client/tests', '/es/about']) {
    assert.ok(links(html).some(link => link.href === path), path);
  }
  assert.match(html, /Andrey Litvinov/);
});
for (const locale of ['en', 'ru', 'es']) {
  test(`${locale} current carousel keeps personal-session-first entry and separate free paths without navigation`, () => {
    assert.deepEqual(renderLinks(freePaths, { locale }).map(link => link.href), [`/${locale}/services/free-situation-review`, `/${locale}/wu-xing`, `/${locale}/client/tests`], 'Independent three-path component preserves its current free destinations');
    const html = renderToStaticMarkup(React.createElement(locale === 'es' ? spanishHome : home, { locale }));
    const first = links(html).filter(link => /data-home-slide-action="services"/.test(link.attrs));
    assert.equal(first.length, 1);
    assert.equal(first[0].href, `/${locale}/services#consultation`);
    assert.match(first[0].text, /€50/);
    assert.ok(links(html).some(link => link.href === `/${locale}/client/tests`));
    assert.ok(links(html).some(link => link.href === `/${locale}/services/free-situation-review`));
    assert.doesNotMatch(html, /data-home-reports-cta|data-home-development-cta|data-home-personal-support-cta/, 'Anonymous context never fabricates private account links');
  });
}

test('the public Tantra destination still mounts its real landing and explicit-consent request boundary', () => {
  const route = read('app/[locale]/academy/[[...slug]]/page.tsx');
  assert.match(route, /if \(key === "reiki\/tantra-reiki\/free-initiation"\) return <TantraFreeInitiation locale=\{locale\} \/>/);
  const landing = read('components/tantra-free-initiation.tsx');
  assert.match(landing, /<TantraInitiationForm locale=\{locale\} \/>/);
  const chooser = read('components/contact-channel-chooser.tsx');
  assert.match(chooser, /const \[consent, setConsent\] = useState\(false\)/);
  assert.match(chooser, /contactConsent: consent/);
  assert.match(chooser, /type="checkbox"[^>]*required/);
  assert.match(chooser, /\|\| !consent/);
});
