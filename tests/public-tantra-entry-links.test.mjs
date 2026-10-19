import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const empty = () => null;
const anchor = ({ href, children }) => React.createElement('a', { href }, children);

// Render the real page components, stubbing unrelated child UI and framework
// hooks so these checks need neither a server nor external data or requests.
function loadComponent(path, imports) {
  const compiled = ts.transpileModule(read(path), {
    fileName: path,
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const exports = {};
  runInNewContext(compiled, {
    exports,
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
  '@/lib/public-card-artwork': publicArtwork,
  '@/lib/academy/reiki-free-course': loadComponent('lib/academy/reiki-free-course.ts', {}),
  'next/link': anchor,
  'next/image': empty,
  'lucide-react': { ArrowUpRight: empty, FileText: empty, ClipboardCheck: empty, GraduationCap: empty, ChevronRight: empty, BriefcaseBusiness: empty, Flower2: empty, Sparkles: empty, ArrowRight: empty },
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
const catalogue = { CatalogShowcase: ({ items }) => items.map((item) => React.createElement('a', { key: item.id, href: item.href }, item.title)) };
const academyDiscovery = loadComponent('components/academy-discovery.tsx', {
  ...shared,
  react: React,
  'lucide-react': { ...shared['lucide-react'], ChevronDown: empty, Search: empty },
  '@/components/catalog-showcase': catalogue,
  './academy-discovery.module.css': {},
}).AcademyDiscovery;
const academy = loadComponent('components/academy-hub.tsx', {
  ...shared,
  '@/components/academy-discovery': { AcademyDiscovery: academyDiscovery },
  '@/components/academy-video-courses': { AcademyVideoCourses: empty },
  '@/components/catalog-showcase': catalogue,
  '@/components/academy-course-capture': { AcademyCourseCapture: empty },
  '@/components/academy-free-course-banner': { AcademyFreeCourseBanner: empty },
  '@/data/academy/catalog': { academyCopy: Object.fromEntries(['en', 'ru', 'es'].map((locale) => [locale, {
    title: 'Academy', programs: 'Programs', videos: 'Videos', lead: 'Explore learning', allPrograms: 'All programs',
  }])) },
}).AcademyHub;

const links = (html) => [...html.matchAll(/<a href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)].map(([, href, content]) => ({ href, text: content.replace(/<[^>]+>/g, '') }));
const renderLinks = (component, props) => links(renderToStaticMarkup(React.createElement(component, props)));
const labels = { en: /Tantra Reiki.*free Level 1 initiation/, ru: /Тантра Рейки.*бесплатная инициация 1-й ступени/, es: /Tantra Reiki.*iniciación gratuita de Nivel 1/ };

for (const locale of ['en', 'ru', 'es']) {
  test(`${locale} Home renders a direct localized Tantra entry and preserves its written-review link`, () => {
    const pageLinks = renderLinks(locale === 'es' ? spanishHome : home, { locale });
    const tantra = pageLinks.filter((link) => link.href === `/${locale}/academy/reiki/tantra-reiki/free-initiation`);
    assert.equal(tantra.length, 1);
    assert.match(tantra[0].text, labels[locale]);
    assert.ok(pageLinks.some((link) => link.href === `/${locale}/services/free-situation-review`));
    assert.ok(pageLinks.some((link) => link.href === (locale === 'es' ? '/es/books' : `/${locale}/library`)));
  });

  test(`${locale} Academy renders a direct localized Tantra entry without replacing the full program`, () => {
    for (const view of ['programs', 'videos']) {
      const pageLinks = renderLinks(academy, { locale, view });
      const tantra = pageLinks.filter((link) => link.href === `/${locale}/academy/reiki/tantra-reiki/free-initiation`);
      assert.equal(tantra.length, 1, view);
      assert.match(tantra[0].text, labels[locale]);
      if (view === 'programs') assert.ok(pageLinks.some((link) => link.href === `/${locale}/academy/reiki/tantra-reiki`));
    }
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

test('Spanish Tantra link belongs to the new learning card and preserves current public sections', () => {
  const html = renderToStaticMarkup(React.createElement(spanishHome));
  const learning = html.match(/<article class="service-home-start-card service-home-start-card--learning">([\s\S]*?)<\/article>/)?.[1];
  assert.ok(learning);
  for (const path of ['/es/academy', '/es/library', '/es/academy/reiki/tantra-reiki/free-initiation']) {
    assert.ok(links(learning).some((link) => link.href === path), path);
  }
  assert.equal(links(html).filter((link) => link.href === '/es/academy/reiki/tantra-reiki/free-initiation').length, 1);
  assert.ok(links(html).some((link) => link.href === '/es/client/tests'));
  assert.ok(links(html).some((link) => link.href === '/es/about#testimonials-title'));
  assert.match(html, /Andrey Litvinov/);
  assert.match(html, /data-video-id="m9RfDgK76PU"/);
  assert.match(html, /data-video-id="5oj0BIbLT4w"/);
});

for (const locale of ['en', 'ru', 'es']) {
  test(`${locale} preserves the three free paths and owner-approved personal-session-first hero while keeping Tantra in learning`, () => {
    const options = renderLinks(freePaths, { locale });
    assert.deepEqual(options.map((link) => link.href), [
      `/${locale}/services/free-situation-review`, `/${locale}/wu-xing`, `/${locale}/client/tests`,
    ]);
    const html = renderToStaticMarkup(React.createElement(locale === 'es' ? spanishHome : home, { locale }));
    const hero = html.match(/<section class="service-home-hero"[\s\S]*?<\/section>/)?.[0];
    assert.ok(hero);
    assert.deepEqual(links(hero).map((link) => link.href), [
      `/${locale}/services#consultation`, `/${locale}/services/free-situation-review`, `/${locale}/client/tests`,
    ]);
    const learning = html.match(/<article class="service-home-start-card service-home-start-card--learning">([\s\S]*?)<\/article>/)?.[1];
    assert.ok(learning);
    assert.equal(links(learning).filter((link) => link.href === `/${locale}/academy/reiki/tantra-reiki/free-initiation`).length, 1);
  });
}
